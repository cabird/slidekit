// =============================================================================
// Renderer — DOM rendering from resolved scene graphs
// =============================================================================

import { resetIdCounter } from './id.js';
import { state } from './state.js';
import { filterStyle, _baselineCSS, detectMisplacedCssProps } from './style.js';
import { resolveAnchor } from './anchor.js';
import { getConfig } from './config.js';
import { applyStyleToDOM } from './dom-helpers.js';
import { lintSlide, lintDeck } from './lint.js';
import type { ConnectorResolved } from './types.js';
import { enableKeyboardToggle } from './debug.js';
import { clearMeasureCache } from './measure.js';
import type { SlideElement, SlideDefinition, LayoutResult, TextRunStyle, TextRun, TextParagraph, TextBoxResolved } from './types.js';

// Layout function injected by slidekit.js to avoid circular imports.
let _layoutFn: ((slide: SlideDefinition) => Promise<LayoutResult>) | undefined;
export function _setLayoutFn(fn: (slide: SlideDefinition) => Promise<LayoutResult>): void { _layoutFn = fn; }

// =============================================================================
// Text Run Extraction Helpers
// =============================================================================

/**
 * HTML tags that establish paragraph boundaries in the text extraction
 * model. These are semantic block/paragraph elements — NOT every element
 * with a block-like CSS `display` value. A `display:flex` wrapper used
 * for layout does not create a paragraph break; a `<p>` or `<div>` does.
 */
const PARAGRAPH_TAGS = new Set([
  'p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'li', 'blockquote', 'pre', 'section', 'article',
  'header', 'footer', 'main', 'nav', 'aside',
  'figcaption', 'details', 'summary', 'dt', 'dd',
  'address', 'hgroup',
]);

/** Non-text elements to skip during text extraction. */
const SKIP_TAGS = new Set([
  'img', 'svg', 'canvas', 'video', 'audio', 'iframe', 'object', 'embed',
  'style', 'script', 'noscript',
]);

/** Cached computed style accessor to avoid redundant getComputedStyle calls. */
function makeCsCache(): (el: Element) => CSSStyleDeclaration {
  const cache = new WeakMap<Element, CSSStyleDeclaration>();
  return (el: Element) => {
    let cs = cache.get(el);
    if (!cs) {
      cs = getComputedStyle(el);
      cache.set(el, cs);
    }
    return cs;
  };
}

/** Extract the computed text style from an element's cached computed style. */
function extractRunStyle(_el: Element, cs: CSSStyleDeclaration): TextRunStyle {
  const fontSize = parseFloat(cs.fontSize) || 0;
  // lineHeight: resolve "normal" to an estimated px value (~1.2× font size)
  let lineHeight = parseFloat(cs.lineHeight);
  if (isNaN(lineHeight)) lineHeight = fontSize * 1.2;
  return {
    fontFamily: cs.fontFamily,
    fontSize,
    fontWeight: isNaN(Number(cs.fontWeight)) ? cs.fontWeight : Number(cs.fontWeight),
    fontStyle: cs.fontStyle || 'normal',
    color: cs.color || '',
    letterSpacing: parseFloat(cs.letterSpacing) || 0,
    lineHeight,
    // Preserve the full text-decoration-line value (e.g. "underline line-through")
    textDecoration: cs.textDecorationLine || cs.textDecoration || 'none',
    textTransform: cs.textTransform || 'none',
    opacity: parseFloat(cs.opacity) || 1,
    backgroundColor: cs.backgroundColor || 'rgba(0, 0, 0, 0)',
  };
}

/** Compare two run styles for equality (determines run merging). */
function stylesMatch(a: TextRunStyle, b: TextRunStyle): boolean {
  return a.fontFamily === b.fontFamily
    && a.fontSize === b.fontSize
    && a.fontWeight === b.fontWeight
    && a.fontStyle === b.fontStyle
    && a.color === b.color
    && a.letterSpacing === b.letterSpacing
    && a.textDecoration === b.textDecoration
    && a.textTransform === b.textTransform
    && a.opacity === b.opacity
    && a.backgroundColor === b.backgroundColor;
  // lineHeight is per-paragraph, not a run-merge criterion
}

/** Intermediate representation of a run being built during tree walking. */
interface RunBuilder {
  style: TextRunStyle;
  textNodes: Text[];
  text: string;
  isLineBreak: boolean;
}

/**
 * Get slide-level rects for a single text node via Range.getClientRects().
 * Uses the container's known resolved bounds as a reference frame to
 * convert viewport coordinates to slide-level CSS px, automatically
 * handling any transforms (e.g., Reveal.js scaling).
 */
function textNodeRects(
  node: Text,
  containerDomRect: DOMRect,
  resolved: { x: number; y: number; w: number; h: number },
  scaleX: number,
  scaleY: number,
): Array<{ x: number; y: number; w: number; h: number }> {
  const range = document.createRange();
  range.selectNodeContents(node);
  const result: Array<{ x: number; y: number; w: number; h: number }> = [];
  for (const cr of range.getClientRects()) {
    if (cr.width <= 0 && cr.height <= 0) continue;
    result.push({
      x: resolved.x + (cr.left - containerDomRect.left) * scaleX,
      y: resolved.y + (cr.top - containerDomRect.top) * scaleY,
      w: cr.width * scaleX,
      h: cr.height * scaleY,
    });
  }
  return result;
}

// =============================================================================
// Image Metadata Helpers
// =============================================================================

type ParsedPos = { fraction: number } | { px: number };

function parsePosSingle(s: string): ParsedPos {
  const t = s.trim().toLowerCase();
  if (t === 'left' || t === 'top') return { fraction: 0 };
  if (t === 'center') return { fraction: 0.5 };
  if (t === 'right' || t === 'bottom') return { fraction: 1 };
  if (t.endsWith('%')) return { fraction: parseFloat(t) / 100 };
  return { px: parseFloat(t) || 0 };
}

function applyPos(pos: ParsedPos, slack: number): number {
  return 'fraction' in pos ? pos.fraction * slack : pos.px;
}

function posToFraction(pos: ParsedPos, slack: number): number {
  if ('fraction' in pos) return pos.fraction;
  if (Math.abs(slack) < 0.001) return 0.5;
  return Math.max(0, Math.min(1, pos.px / slack));
}

/**
 * Compute resolved image metadata for an `<img>` element within a container.
 * Handles cover, contain, none, scale-down, and fill object-fit modes.
 */
function computeImageResolved(
  img: HTMLImageElement,
  resolved: { x: number; y: number; w: number; h: number },
): import('./types.js').ImageResolved | null {
  const nw = img.naturalWidth;
  const nh = img.naturalHeight;
  const cw = resolved.w;
  const ch = resolved.h;
  if (!nw || !nh || cw <= 0 || ch <= 0) return null;

  const computed = getComputedStyle(img);
  let objectFit = computed.objectFit || 'fill';

  const opStr = computed.objectPosition || '50% 50%';
  const opParts = opStr.trim().split(/\s+/);
  const posX = opParts.length >= 1 ? parsePosSingle(opParts[0]) : { fraction: 0.5 } as ParsedPos;
  const posY = opParts.length >= 2 ? parsePosSingle(opParts[1]) : { fraction: 0.5 } as ParsedPos;

  if (objectFit === 'scale-down') {
    objectFit = (nw <= cw && nh <= ch) ? 'none' : 'contain';
  }

  let sourceRect: { x: number; y: number; w: number; h: number };
  let destRect: { x: number; y: number; w: number; h: number };
  let slackX = 0, slackY = 0;

  if (objectFit === 'cover') {
    const scale = Math.max(cw / nw, ch / nh);
    const objW = nw * scale, objH = nh * scale;
    slackX = cw - objW; slackY = ch - objH;
    const offX = applyPos(posX, slackX), offY = applyPos(posY, slackY);
    let sx = -offX / scale, sy = -offY / scale;
    let sw = cw / scale, sh = ch / scale;
    sx = Math.max(0, Math.min(nw - sw, sx));
    sy = Math.max(0, Math.min(nh - sh, sy));
    sw = Math.min(sw, nw - sx); sh = Math.min(sh, nh - sy);
    sourceRect = { x: sx, y: sy, w: sw, h: sh };
    destRect = { x: 0, y: 0, w: cw, h: ch };
  } else if (objectFit === 'contain') {
    const scale = Math.min(cw / nw, ch / nh);
    const objW = nw * scale, objH = nh * scale;
    slackX = cw - objW; slackY = ch - objH;
    const offX = applyPos(posX, slackX), offY = applyPos(posY, slackY);
    sourceRect = { x: 0, y: 0, w: nw, h: nh };
    destRect = { x: offX, y: offY, w: objW, h: objH };
  } else if (objectFit === 'none') {
    slackX = cw - nw; slackY = ch - nh;
    const offX = applyPos(posX, slackX), offY = applyPos(posY, slackY);
    const visX = Math.max(0, -offX), visY = Math.max(0, -offY);
    const visW = Math.min(nw - visX, cw - Math.max(0, offX));
    const visH = Math.min(nh - visY, ch - Math.max(0, offY));
    if (visW <= 0 || visH <= 0) return null;
    sourceRect = { x: visX, y: visY, w: visW, h: visH };
    destRect = { x: Math.max(0, offX), y: Math.max(0, offY), w: visW, h: visH };
  } else {
    sourceRect = { x: 0, y: 0, w: nw, h: nh };
    destRect = { x: 0, y: 0, w: cw, h: ch };
  }

  return {
    src: img.getAttribute('src') || img.src,
    naturalWidth: nw, naturalHeight: nh,
    objectFit,
    objectPosition: [posToFraction(posX, slackX), posToFraction(posY, slackY)],
    sourceRect, destRect,
  };
}

/**
 * Extract structured text content from a rendered DOM element.
 *
 * Walks the DOM tree, splits content into paragraphs at semantic block
 * boundaries (p, div, h1–h6, li, etc.), groups inline text nodes into
 * style-uniform runs, and captures per-line-fragment bounding rects via
 * Range.getClientRects().
 *
 * Rects are computed **per text node** and concatenated for the merged
 * run, avoiding the over-capture problem that occurs when a single Range
 * spans non-adjacent text nodes separated by inline elements.
 *
 * `<br>` elements emit a run with `text: "\n"` and empty rects to
 * preserve forced line breaks (maps to `<a:br/>` in PPTX).
 */
function extractTextBox(
  container: HTMLElement,
  resolved: { x: number; y: number; w: number; h: number },
): TextBoxResolved | null {
  const containerRect = container.getBoundingClientRect();
  if (containerRect.width <= 0 || containerRect.height <= 0) return null;

  const scaleX = resolved.w / containerRect.width;
  const scaleY = resolved.h / containerRect.height;
  const getCs = makeCsCache();

  const paragraphs: TextParagraph[] = [];
  let currentRuns: RunBuilder[] = [];
  let currentRun: RunBuilder | null = null;
  // Track the block element that established the current paragraph, so
  // we can capture textAlign from it when flushing.
  let currentBlockElement: HTMLElement | null = null;

  const flushParagraph = () => {
    if (currentRuns.length === 0) return;
    // Finalize runs: compute rects from accumulated text nodes
    const runs: TextRun[] = [];
    for (const rb of currentRuns) {
      if (rb.isLineBreak) {
        runs.push({ text: '\n', style: rb.style, rects: [] });
        continue;
      }
      if (rb.textNodes.length === 0) continue;
      // Compute rects per text node to avoid over-capture across
      // non-adjacent nodes separated by inline elements.
      const rects: Array<{ x: number; y: number; w: number; h: number }> = [];
      for (const tn of rb.textNodes) {
        rects.push(...textNodeRects(tn, containerRect, resolved, scaleX, scaleY));
      }
      // Skip purely whitespace runs with no visible rects
      if (rects.length === 0 && rb.text.trim().length === 0) continue;
      runs.push({ text: rb.text, style: rb.style, rects });
    }
    if (runs.length > 0) {
      // Capture textAlign from the block element that owns this paragraph,
      // falling back to the container's alignment.
      const alignSource = currentBlockElement || container;
      const textAlign = getCs(alignSource).textAlign || 'start';
      paragraphs.push({ runs, textAlign });
    }
    currentRuns = [];
    currentRun = null;
  };

  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      if (text.length === 0) return;
      const parent = node.parentElement;
      if (!parent) return;
      // Skip hidden elements
      const parentCs = getCs(parent);
      if (parentCs.display === 'none' || parentCs.visibility === 'hidden') return;

      const style = extractRunStyle(parent, parentCs);
      if (currentRun && !currentRun.isLineBreak && stylesMatch(currentRun.style, style)) {
        // Extend current run
        currentRun.textNodes.push(node as Text);
        currentRun.text += text;
      } else {
        // Start new run
        currentRun = { style, textNodes: [node as Text], text, isLineBreak: false };
        currentRuns.push(currentRun);
      }
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    // Skip hidden and non-text elements entirely
    const elCs = getCs(el);
    if (elCs.display === 'none' || elCs.visibility === 'hidden') return;
    if (SKIP_TAGS.has(tag)) return;

    if (tag === 'br') {
      // Emit a line break marker in the current paragraph.
      const parent = el.parentElement;
      const style = parent ? extractRunStyle(parent, getCs(parent)) : extractRunStyle(el, elCs);
      currentRun = { style, textNodes: [], text: '\n', isLineBreak: true };
      currentRuns.push(currentRun);
      currentRun = null; // force new run after <br>
      return;
    }

    if (PARAGRAPH_TAGS.has(tag)) {
      // Semantic paragraph boundary → flush current paragraph, start new one
      flushParagraph();
      currentBlockElement = el;
      for (const child of el.childNodes) {
        walk(child);
      }
      flushParagraph();
      currentBlockElement = null;
    } else {
      // Inline / layout wrapper — recurse without paragraph break
      for (const child of el.childNodes) {
        walk(child);
      }
    }
  };

  // Walk the container's children (not the container itself — it's the
  // SlideKit el() div, not part of the authored content).
  for (const child of container.childNodes) {
    walk(child);
  }
  flushParagraph();

  if (paragraphs.length === 0) return null;
  return { paragraphs };
}

/**
 * Layer ordering for z-index computation.
 * Elements in earlier layers render behind elements in later layers.
 */
const LAYER_ORDER = { bg: 0, content: 1, overlay: 2 } as const;

/**
 * Compute z-index values for a flat array of elements.
 *
 * Sort by: layer (bg < content < overlay), then by explicit `z` value
 * (missing z treated as 0), then by declaration order as tiebreaker.
 * Returns a Map of element id -> z-index.
 *
 * @param {Array} elements - Flat array of SlideKit elements
 * @returns {Map<string, number>} Map of element id to z-index value
 */
export function computeZOrder(elements: SlideElement[]): Map<string, number> {
  // Build an array of { element, originalIndex } for stable sort
  const indexed = elements.map((el: SlideElement, i: number) => ({ el, idx: i }));

  // Sort: layer first, then explicit z (missing = 0), then declaration order
  indexed.sort((a: { el: SlideElement; idx: number }, b: { el: SlideElement; idx: number }) => {
    const layerKeyA = (a.el.props.layer || "content") as keyof typeof LAYER_ORDER;
    const layerKeyB = (b.el.props.layer || "content") as keyof typeof LAYER_ORDER;
    const layerA = LAYER_ORDER[layerKeyA] ?? LAYER_ORDER.content;
    const layerB = LAYER_ORDER[layerKeyB] ?? LAYER_ORDER.content;
    if (layerA !== layerB) return layerA - layerB;

    // Within same layer: sort by z value (missing z treated as 0)
    const zA = (a.el.props as Record<string, any>).z ?? 0;
    const zB = (b.el.props as Record<string, any>).z ?? 0;
    if (zA !== zB) return zA - zB;

    // Same z (or both default) — use declaration order as tiebreaker
    return a.idx - b.idx;
  });

  const zMap = new Map();
  indexed.forEach((item: { el: SlideElement; idx: number }, sortedIdx: number) => {
    zMap.set(item.el.id, sortedIdx + 1);
  });
  return zMap;
}

export { applyStyleToDOM } from './dom-helpers.js';

/**
 * Set slide background on a <section> element using Reveal.js data-background-* attributes.
 *
 * @param {HTMLElement} section - The <section> element
 * @param {string} background - Background value (color, gradient, or image path/URL)
 */
export function applySlideBackground(section: HTMLElement, background: string): void {
  if (!background) return;

  const trimmed = background.trim();

  if (trimmed.startsWith("#") || /^(rgb|hsl)a?\(/.test(trimmed)) {
    section.setAttribute("data-background-color", trimmed);
  } else if (trimmed.startsWith("linear-gradient") || trimmed.startsWith("radial-gradient")) {
    section.setAttribute("data-background-gradient", trimmed);
  } else {
    // Treat as image URL/path
    section.setAttribute("data-background-image", trimmed);
  }
}

/**
 * Build an SVG element for a connector between two points.
 *
 * @param {object} from - { x, y, dx, dy } start point
 * @param {object} to - { x, y, dx, dy } end point
 * @param {object} connProps - Connector properties from the element
 * @returns {HTMLElement} An absolutely positioned div containing the SVG
 */
/**
 * Build an absolutely-positioned div containing the SVG for a connector.
 *
 * This consumes the fully resolved `ConnectorResolved` as its single source
 * of truth: endpoints, control points, waypoints, style, and pre-placed
 * label geometry all come from the scene graph. No authored-prop fallbacks.
 */
function buildConnectorSVG(conn: ConnectorResolved, elementMarkerId: string): HTMLElement {
  const { from, to, style, path, label } = conn;
  const connType = style.type;
  const thickness = style.thickness;
  const color = style.color;
  const dash = style.dash;
  const arrow = style.arrow;

  // Dynamic padding: enough room for arrowhead markers + stroke width
  const markerSize = 8; // matches marker markerWidth/markerHeight
  const padding = Math.max(20, markerSize + thickness * 2);
  let minX = Math.min(from.x, to.x) - padding;
  let minY = Math.min(from.y, to.y) - padding;
  let maxX = Math.max(from.x, to.x) + padding;
  let maxY = Math.max(from.y, to.y) + padding;

  // Elbow/orthogonal: waypoints are pre-routed by finalize.
  const elbowWaypoints = path.waypoints ?? null;
  if (elbowWaypoints) {
    for (const wp of elbowWaypoints) {
      if (wp.x < minX) minX = wp.x;
      if (wp.y < minY) minY = wp.y;
      if (wp.x > maxX) maxX = wp.x;
      if (wp.y > maxY) maxY = wp.y;
    }
  }

  // Curved: control points are pre-computed by finalize.
  if (connType === "curved" && path.cx1 !== undefined) {
    minX = Math.min(minX, path.cx1!, path.cx2!);
    minY = Math.min(minY, path.cy1!, path.cy2!);
    maxX = Math.max(maxX, path.cx1!, path.cx2!);
    maxY = Math.max(maxY, path.cy1!, path.cy2!);
  }

  const svgW = maxX - minX;
  const svgH = maxY - minY;

  // Local coordinates within the SVG
  const lx1 = from.x - minX;
  const ly1 = from.y - minY;
  const lx2 = to.x - minX;
  const ly2 = to.y - minY;

  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("width", String(svgW));
  svg.setAttribute("height", String(svgH));
  svg.setAttribute("viewBox", `0 0 ${svgW} ${svgH}`);
  svg.style.overflow = "visible";

  // Arrowhead trim: move path endpoints inward so the stroke ends at the
  // arrowhead midpoint (refX=5) rather than extending through to the tip.
  // The marker tip extends past the shortened endpoint to the original anchor.
  // trim = (viewBoxWidth - refX) / viewBoxWidth * markerWidth * strokeWidth
  const arrowRefX = 5;
  const arrowTrim = (10 - arrowRefX) / 10 * markerSize * thickness;

  // Create marker definitions for arrow heads
  const defs = document.createElementNS(ns, "defs");
  const markerId = `sk-arrow-${elementMarkerId}`;

  if (arrow !== "none") {
    const marker = document.createElementNS(ns, "marker");
    marker.setAttribute("id", markerId);
    marker.setAttribute("viewBox", "0 0 10 10");
    marker.setAttribute("refX", String(arrowRefX));
    marker.setAttribute("refY", "5");
    marker.setAttribute("markerWidth", String(markerSize));
    marker.setAttribute("markerHeight", String(markerSize));
    marker.setAttribute("orient", "auto-start-reverse");

    const polygon = document.createElementNS(ns, "polygon");
    polygon.setAttribute("points", "0,0 10,5 0,10");
    polygon.setAttribute("fill", color);
    marker.appendChild(polygon);
    defs.appendChild(marker);
  }

  svg.appendChild(defs);

  // Helper: move endpoint backward along the last segment by `amount` pixels
  const trimEnd = (pts: {x:number,y:number}[], amount: number): {x:number,y:number}[] => {
    if (pts.length < 2 || amount <= 0) return pts;
    const result = pts.map(p => ({...p}));
    const last = result[result.length - 1];
    const prev = result[result.length - 2];
    const dx = last.x - prev.x;
    const dy = last.y - prev.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > amount * 2) {
      last.x -= (dx / len) * amount;
      last.y -= (dy / len) * amount;
    }
    return result;
  };
  const trimStart = (pts: {x:number,y:number}[], amount: number): {x:number,y:number}[] => {
    if (pts.length < 2 || amount <= 0) return pts;
    const result = pts.map(p => ({...p}));
    const first = result[0];
    const next = result[1];
    const dx = next.x - first.x;
    const dy = next.y - first.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > amount * 2) {
      first.x += (dx / len) * amount;
      first.y += (dy / len) * amount;
    }
    return result;
  };

  const hasEndArrow = arrow === "end" || arrow === "both";
  const hasStartArrow = arrow === "start" || arrow === "both";

  // Draw the connector path
  let pathEl;
  if (connType === "straight") {
    // Trim straight line endpoints for arrowheads
    let pts = [{x: lx1, y: ly1}, {x: lx2, y: ly2}];
    if (hasEndArrow) pts = trimEnd(pts, arrowTrim);
    if (hasStartArrow) pts = trimStart(pts, arrowTrim);
    pathEl = document.createElementNS(ns, "line");
    pathEl.setAttribute("x1", String(pts[0].x));
    pathEl.setAttribute("y1", String(pts[0].y));
    pathEl.setAttribute("x2", String(pts[1].x));
    pathEl.setAttribute("y2", String(pts[1].y));
  } else {
    pathEl = document.createElementNS(ns, "path");
    let d;
    if (connType === "curved") {
      // Use pre-computed control points from the scene graph (slide-level)
      // and convert to SVG-local coordinates.
      const cx1 = (path.cx1 ?? from.x) - minX;
      const cy1 = (path.cy1 ?? from.y) - minY;
      const cx2 = (path.cx2 ?? to.x) - minX;
      const cy2 = (path.cy2 ?? to.y) - minY;
      let startPt = {x: lx1, y: ly1};
      let endPt = {x: lx2, y: ly2};
      // Trim curved path endpoints along the tangent into each control point.
      if (hasStartArrow) {
        const trimmed = trimStart([startPt, {x: cx1, y: cy1}], arrowTrim);
        startPt = trimmed[0];
      }
      if (hasEndArrow) {
        const trimmed = trimEnd([{x: cx2, y: cy2}, endPt], arrowTrim);
        endPt = trimmed[trimmed.length - 1];
      }
      d = `M ${startPt.x} ${startPt.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${endPt.x} ${endPt.y}`;
    } else if (connType === "elbow" || connType === "orthogonal") {
      // Waypoints are pre-routed by finalize (slide-level). Convert to
      // SVG-local coordinates.
      const waypoints = elbowWaypoints!;
      let localWaypoints = waypoints.map(p => ({
        x: p.x - minX,
        y: p.y - minY
      }));
      // Trim endpoints for arrowheads
      if (hasEndArrow) localWaypoints = trimEnd(localWaypoints, arrowTrim);
      if (hasStartArrow) localWaypoints = trimStart(localWaypoints, arrowTrim);
      if (localWaypoints.length >= 2) {
        const cornerRadius = path.cornerRadius ?? 0;
        if (cornerRadius > 0 && localWaypoints.length >= 3) {
          d = buildRoundedElbowPath(localWaypoints, cornerRadius);
        } else {
          d = `M ${localWaypoints[0].x} ${localWaypoints[0].y}`;
          for (let i = 1; i < localWaypoints.length; i++) {
            d += ` L ${localWaypoints[i].x} ${localWaypoints[i].y}`;
          }
        }
      } else {
        d = `M ${lx1} ${ly1} L ${lx2} ${ly2}`;
      }
    }
    pathEl.setAttribute("d", d as string);
    pathEl.setAttribute("fill", "none");
  }

  pathEl.setAttribute("stroke", color);
  pathEl.setAttribute("stroke-width", String(thickness));

  if (dash) {
    pathEl.setAttribute("stroke-dasharray", dash);
  }

  // Apply arrow markers
  if (arrow === "end" || arrow === "both") {
    pathEl.setAttribute("marker-end", `url(#${markerId})`);
  }
  if (arrow === "start" || arrow === "both") {
    pathEl.setAttribute("marker-start", `url(#${markerId})`);
  }

  svg.appendChild(pathEl);

  // Optional label — placement and style are pre-resolved by finalize.
  if (label) {
    // Convert slide-level anchor to SVG-local coordinates.
    const anchorX = label.x - minX;
    const anchorY = label.y - minY;
    const { angle, text, style: ls } = label;

    // Approximate background sizing so the stroke doesn't cross the label.
    const fontSize = typeof ls.fontSize === 'number' ? ls.fontSize : 14;
    const approxCharWidth = fontSize * 0.6;
    const textWidth = text.length * approxCharWidth + 8;
    const textHeight = fontSize + 6;
    const bgRect = document.createElementNS(ns, "rect");
    bgRect.setAttribute("x", String(anchorX - textWidth / 2));
    bgRect.setAttribute("y", String(anchorY - textHeight + 2));
    bgRect.setAttribute("width", String(textWidth));
    bgRect.setAttribute("height", String(textHeight));
    bgRect.setAttribute("fill", "#0a0a1a");
    bgRect.setAttribute("rx", "3");
    if (angle !== 0) {
      bgRect.setAttribute("transform", `rotate(${angle} ${anchorX} ${anchorY})`);
    }
    svg.appendChild(bgRect);

    const textNode = document.createElementNS(ns, "text");
    textNode.setAttribute("x", String(anchorX));
    textNode.setAttribute("y", String(anchorY));
    textNode.setAttribute("text-anchor", "middle");
    textNode.setAttribute("font-family", `"${ls.fontFamily}", sans-serif`);
    textNode.setAttribute("font-size", String(ls.fontSize));
    textNode.setAttribute("font-weight", String(ls.fontWeight));
    textNode.setAttribute("fill", ls.color);
    if (angle !== 0) {
      textNode.setAttribute("transform", `rotate(${angle} ${anchorX} ${anchorY})`);
    }
    textNode.textContent = text;
    svg.appendChild(textNode);
  }

  // Wrap in a positioned div
  const wrapper = document.createElement("div");
  wrapper.style.position = "absolute";
  wrapper.style.left = `${minX}px`;
  wrapper.style.top = `${minY}px`;
  wrapper.style.width = `${svgW}px`;
  wrapper.style.height = `${svgH}px`;
  wrapper.style.pointerEvents = "none";
  wrapper.appendChild(svg);

  return wrapper;
}

/**
 * Build an SVG path string for an elbow polyline with rounded corners.
 * Each interior vertex gets a circular arc tangent to both adjacent segments.
 * The arc radius is computed from the actual angle between segments so that
 * the fillet is correct for any turn angle, not just 90°.
 */
function buildRoundedElbowPath(points: {x: number, y: number}[], radius: number): string {
  if (points.length < 2) return '';
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  let d = `M ${points[0].x} ${points[0].y}`;

  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];

    // Compute segment lengths
    const len1 = Math.sqrt((curr.x - prev.x) ** 2 + (curr.y - prev.y) ** 2);
    const len2 = Math.sqrt((next.x - curr.x) ** 2 + (next.y - curr.y) ** 2);

    if (len1 < 0.5 || len2 < 0.5) {
      d += ` L ${curr.x} ${curr.y}`;
      continue;
    }

    // Unit vectors for incoming and outgoing segments
    const ux1 = (curr.x - prev.x) / len1;
    const uy1 = (curr.y - prev.y) / len1;
    const ux2 = (next.x - curr.x) / len2;
    const uy2 = (next.y - curr.y) / len2;

    // Cross product and dot product of direction vectors
    const cross = ux1 * uy2 - uy1 * ux2;
    const dot = ux1 * ux2 + uy1 * uy2;
    const absCross = Math.abs(cross);

    // Skip arc for near-collinear segments (straight through or hairpin)
    if (absCross < 0.01) {
      d += ` L ${curr.x} ${curr.y}`;
      continue;
    }

    // Compute the tangent of half the opening angle between -u1 and u2.
    // Opening angle β = acos(-dot), so cos(β) = -dot, sin(β) = |cross|.
    // tan(β/2) = sin(β) / (1 + cos(β)) = |cross| / (1 - dot)
    const tanHalf = absCross / (1 - dot);

    // For the desired fillet radius R, the trim distance along each
    // segment is: trim = R / tan(β/2)
    let trim = radius / tanHalf;

    // Clamp trim to half the shortest adjacent segment
    const maxTrim = Math.min(len1 / 2, len2 / 2);
    if (trim > maxTrim) {
      trim = maxTrim;
    }

    // Compute the actual SVG arc radius from the (possibly clamped) trim
    const arcRadius = trim * tanHalf;

    if (trim < 1 || arcRadius < 1) {
      d += ` L ${curr.x} ${curr.y}`;
      continue;
    }

    // Trim points: where the arc starts and ends (tangent to both segments)
    const enterX = curr.x - ux1 * trim;
    const enterY = curr.y - uy1 * trim;
    const exitX = curr.x + ux2 * trim;
    const exitY = curr.y + uy2 * trim;

    // Sweep direction from cross product sign
    const sweep = cross > 0 ? 1 : 0;

    d += ` L ${enterX} ${enterY}`;
    d += ` A ${arcRadius} ${arcRadius} 0 0 ${sweep} ${exitX} ${exitY}`;
  }

  // Final segment to last point
  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;

  return d;
}

/**
 * Render a single SlideKit element using resolved bounds from the scene graph.
 *
 * @param {object} element - SlideKit element
 * @param {number} zIndex - Computed z-index for this element
 * @param {object} sceneElements - The resolved scene graph elements map
 * @param {number} [offsetX=0] - Offset to subtract from resolved x (for stack children)
 * @param {number} [offsetY=0] - Offset to subtract from resolved y (for stack children)
 * @returns {HTMLElement} The rendered DOM element
 */
export function renderElementFromScene(element: SlideElement, zIndex: number, sceneElements: Record<string, any>, offsetX: number = 0, offsetY: number = 0): HTMLElement {
  const { type } = element;
  let { props } = element;
  const resolved = sceneElements[element.id]?.resolved;

  // Use resolved bounds from the scene graph if available, otherwise fall back
  let left, top, w, h;
  if (resolved) {
    left = resolved.x - offsetX;
    top = resolved.y - offsetY;
    w = resolved.w;
    h = resolved.h;
  } else {
    // Fallback for elements not in scene graph — use props directly.
    // getEffectiveDimensions is async (for el() measurement) but render
    // is synchronous, so we use raw props here. Elements should always
    // be resolved by layout() before reaching render.
    w = props.w || 0;
    h = props.h || 0;
    const anchor = props.anchor || "tl";
    const anchorResult = resolveAnchor((props.x ?? 0) as number, (props.y ?? 0) as number, w as number, h as number, anchor);
    left = anchorResult.left;
    top = anchorResult.top;
  }

  // Auto-promote misplaced CSS props into style before filtering
  const { cssProps, warnings: cssWarnings } = detectMisplacedCssProps(props as Record<string, unknown>);
  if (Object.keys(cssProps).length > 0) {
    const promotedStyle = { ...cssProps, ...((props.style as Record<string, unknown>) || {}) };
    props = { ...props, style: promotedStyle };
    for (const warn of cssWarnings) {
      console.warn(`[SlideKit] Element "${element.id}": ${warn.message}`);
    }
  }

  // Build the merged CSS from convenience props + user style
  const { filtered: mergedStyle, warnings: styleWarnings } = filterStyle(props.style || {}, type);

  // Surface blocked-property warnings via console and scene graph
  const allWarnings = [...cssWarnings, ...styleWarnings];
  if (allWarnings.length > 0) {
    for (const warn of styleWarnings) {
      console.warn(`[SlideKit] Element "${element.id}": style.${warn.property} is blocked. ${warn.suggestion}`);
    }
    // Attach to scene graph so getLayout() / inspection can see them
    const sceneEntry = sceneElements[element.id];
    if (sceneEntry) {
      sceneEntry.styleWarnings = allWarnings;
    }
  }

  // Create the element div
  const div = document.createElement("div");
  div.setAttribute("data-sk-id", element.id);

  // Store z-order on scene graph for exporters
  if (sceneElements[element.id]) {
    sceneElements[element.id].zOrder = zIndex;
  }

  // Base layout CSS (library-controlled)
  div.style.position = "absolute";
  div.style.left = `${left}px`;
  div.style.top = `${top}px`;
  div.style.width = `${w}px`;
  div.style.height = `${h}px`;
  div.style.boxSizing = "border-box";
  div.style.zIndex = String(zIndex);

  // Opacity
  if (props.opacity !== undefined && props.opacity !== 1) {
    div.style.opacity = String(props.opacity);
  }

  // M8.4: Transform — combine rotate and flip into a single CSS transform
  {
    const transformParts: string[] = [];
    if (props.rotate !== undefined && props.rotate !== 0) {
      transformParts.push(`rotate(${props.rotate}deg)`);
    }
    if (props.flipH) {
      transformParts.push('scaleX(-1)');
    }
    if (props.flipV) {
      transformParts.push('scaleY(-1)');
    }
    if (transformParts.length > 0) {
      div.style.transform = transformParts.join(' ');
    }
  }

  // Apply className
  if (props.className) {
    div.className = props.className;
  }

  // Apply merged styling CSS
  applyStyleToDOM(div, mergedStyle);

  // M4.2: Apply layout flags from overflow policies
  const layoutFlags = sceneElements[element.id]?._layoutFlags;
  if (layoutFlags?.clip) {
    div.style.overflow = "hidden";
  }

  // Type-specific rendering
  switch (type) {
    case "el": {
      // v2: Render arbitrary HTML content via innerHTML
      div.setAttribute("data-sk-type", "el");
      // Vertical alignment via flexbox when vAlign is set and element has explicit height
      const vAlign = props.vAlign;
      if (vAlign && vAlign !== 'top' && props.h != null) {
        div.style.display = 'flex';
        div.style.flexDirection = 'column';
        div.style.justifyContent = vAlign === 'center' ? 'center' : vAlign === 'bottom' ? 'flex-end' : 'flex-start';
      }
      div.innerHTML = element.content || "";
      break;
    }

    case "group": {
      const children = element.children || [];
      const childZMap = computeZOrder(children);
      for (const child of children) {
        const childZ = childZMap.get(child.id) || 0;
        const childEl = renderElementFromScene(child, childZ, sceneElements);
        div.appendChild(childEl);
      }
      break;
    }

    case "vstack":
    case "hstack": {
      // Stack containers render their children as absolutely-positioned elements.
      // Children have absolute (slide-level) coordinates in the scene graph,
      // but since they are nested in the stack div, we need to offset them
      // relative to the stack's position. We pass the stack's position as
      // offset parameters to avoid O(N*M) shallow copies of the scene map.
      div.style.overflow = "visible";
      const stackChildElems = element.children || [];
      // Use computeZOrder for consistent z-ordering (same as groups)
      const childZMap = computeZOrder(stackChildElems);
      for (const child of stackChildElems) {
        const childResolved = sceneElements[child.id]?.resolved;
        if (childResolved) {
          const childZ = childZMap.get(child.id) || 0;
          // Pass the stack's position as offsets so children render at
          // stack-relative coordinates without copying the scene map
          const childEl = renderElementFromScene(
            child, childZ, sceneElements,
            left + offsetX, top + offsetY
          );
          div.appendChild(childEl);
        }
      }
      break;
    }

    case "connector": {
      // Connector elements are rendered as SVG overlays.
      // The scene graph contains resolved endpoint coordinates.
      const connectorData = sceneElements[element.id]?.connector;
      if (connectorData) {
        const svgWrapper = buildConnectorSVG(connectorData, element.id);
        svgWrapper.setAttribute("data-sk-id", element.id);
        svgWrapper.style.zIndex = String(zIndex);
        if (connectorData.style.opacity !== 1) {
          svgWrapper.style.opacity = String(connectorData.style.opacity);
        }
        return svgWrapper;
      }
      break;
    }

    default:
      break;
  }

  return div;
}

/**
 * Render an array of slide definitions into DOM elements.
 *
 * Now uses the layout solve pipeline (M3.3):
 * 1. Calls layout() to get the resolved scene graph
 * 2. Uses resolved positions from the scene graph when creating DOM elements
 * 3. Persists the scene model on window.sk
 * 4. Returns the layout result
 *
 * @param {Array} slides - Array of slide definitions
 * @param {object} [options={}] - Render options
 * @param {HTMLElement} [options.container] - Target container element
 * @returns {Promise<{ sections: Array<HTMLElement>, layouts: Array<object> }>}
 */
export async function render(slides: SlideDefinition[], options: Record<string, any> = {}) {
  // Reset ID counter at start of render for deterministic IDs
  resetIdCounter();

  const container = options.container ||
    document.querySelector(".reveal .slides");

  if (!container) {
    throw new Error(
      "render() requires a container element. Provide options.container or " +
      "ensure a .reveal .slides element exists in the DOM."
    );
  }

  const sections: HTMLElement[] = [];
  const layouts: LayoutResult[] = [];

  // Inject baseline CSS for el() elements once per render
  if (!container.querySelector("style[data-sk-baseline]")) {
    const baselineStyle = document.createElement("style");
    baselineStyle.setAttribute("data-sk-baseline", "");
    baselineStyle.textContent = _baselineCSS('[data-sk-type="el"]');
    container.appendChild(baselineStyle);
  }

  // Read config once outside the loop to avoid repeated deep-copy overhead
  const cfg = getConfig();
  const slideW = cfg?.slide?.w ?? 1920;
  const slideH = cfg?.slide?.h ?? 1080;

  for (const slide of slides) {
    // Run layout solve for this slide
    const layoutResult = await _layoutFn!(slide);
    layouts.push(layoutResult);

    // Create the <section> for this slide
    const section = document.createElement("section");

    // Set slide ID if provided
    if (slide.id) {
      section.id = slide.id;
    }

    // Apply slide background
    if (slide.background) {
      applySlideBackground(section, slide.background);
    }

    // Create the slidekit-layer container
    const layer = document.createElement("div");
    layer.className = "slidekit-layer";
    layer.style.position = "relative";
    layer.style.width = `${slideW}px`;
    layer.style.height = `${slideH}px`;

    // Render elements using resolved positions from scene graph
    const elements = slide.elements || [];
    const zMap = computeZOrder(elements);

    for (const element of elements) {
      const zIndex = zMap.get(element.id) || 0;
      const domEl = renderElementFromScene(element, zIndex, layoutResult.elements);
      layer.appendChild(domEl);
    }

    section.appendChild(layer);

    // Speaker notes
    if (slide.notes) {
      const aside = document.createElement("aside");
      aside.className = "notes";
      aside.textContent = slide.notes;
      section.appendChild(aside);
    }

    // Append section to container
    container.appendChild(section);
    sections.push(section);
  }

  // =========================================================================
  // =========================================================================
  // Post-render Phase: Text run extraction
  // =========================================================================
  // Extract structured text content from the browser's rendered DOM so
  // exporters get paragraphs → runs → rects without parsing HTML.
  for (let i = 0; i < layouts.length; i++) {
    const layoutResult = layouts[i];
    const sceneElements = layoutResult.elements;
    const section = sections[i];

    for (const [id, entry] of Object.entries(sceneElements)) {
      if (entry.type !== "el") continue;
      const dom = section.querySelector(`[data-sk-id="${id}"]`) as HTMLElement | null;
      if (!dom) continue;
      // Skip elements with no text content at all
      const textContent = dom.textContent;
      if (!textContent || textContent.trim().length === 0) continue;

      const textBox = extractTextBox(dom, entry.resolved);
      if (textBox && textBox.paragraphs.length > 0) {
        entry.text = textBox;
      }
    }
  }

  // Post-render Phase: DOM overflow detection (P0.2)
  // =========================================================================
  // After all slides are rendered to DOM, check every `el`-type element for
  // cases where the browser's rendered content overflows its allocated box.
  // This catches divergences between off-screen measure() and actual browser
  // layout (font metric differences, line wrapping variations, etc.).
  for (let i = 0; i < layouts.length; i++) {
    const layoutResult = layouts[i];
    const sceneElements = layoutResult.elements;
    const section = sections[i];

    for (const [id, entry] of Object.entries(sceneElements)) {
      // Only check el-type elements (text elements). Groups, stacks,
      // connectors don't have meaningful overflow concerns.
      if (entry.type !== "el") continue;

      const dom = section.querySelector(`[data-sk-id="${id}"]`);
      if (!dom) continue;

      // Use 1px tolerance to avoid sub-pixel false positives
      if (dom.scrollHeight > dom.clientHeight + 1) {
        layoutResult.warnings.push({
          type: "dom_overflow_y",
          elementId: id,
          clientHeight: dom.clientHeight,
          scrollHeight: dom.scrollHeight,
          overflow: dom.scrollHeight - dom.clientHeight,
        });
      }

      if (dom.scrollWidth > dom.clientWidth + 1) {
        layoutResult.warnings.push({
          type: "dom_overflow_x",
          elementId: id,
          clientWidth: dom.clientWidth,
          scrollWidth: dom.scrollWidth,
          overflow: dom.scrollWidth - dom.clientWidth,
        });
      }
    }
  }

  // =========================================================================
  // Post-render Phase: Image metadata enrichment
  // =========================================================================
  // For each element containing an <img>, capture natural dimensions, the
  // effective object-fit/object-position, and pre-compute sourceRect (crop
  // in image-pixel coordinates) and destRect (placement within the container).
  // This gives exporters everything they need for drawImage() without having
  // to reverse-engineer CSS object-fit geometry themselves.
  for (let i = 0; i < layouts.length; i++) {
    const layoutResult = layouts[i];
    const sceneElements = layoutResult.elements;
    const section = sections[i];

    for (const [id, entry] of Object.entries(sceneElements)) {
      if (entry.type !== "el") continue;
      const dom = section.querySelector(`[data-sk-id="${id}"]`);
      if (!dom) continue;
      const img = dom.querySelector("img") as HTMLImageElement | null;
      if (!img || !img.naturalWidth || !img.naturalHeight) continue;
      const imgResolved = computeImageResolved(img, entry.resolved);
      if (imgResolved) entry.image = imgResolved;
    }
  }

  // Persist scene model on window.sk (M3.3 — Phase 2 requirement)
  if (typeof window !== "undefined") {
    const skObj: Record<string, unknown> = {
      layouts,
      slides: slides.map((s: SlideDefinition, i: number) => ({
        id: s.id || `slide-${i}`,
        layout: layouts[i],
      })),
      // M8.1: Expose config for debug overlay to read safe zone info
      _config: state.config ? JSON.parse(JSON.stringify(state.config)) : null,
      // Persist original definitions for inspector editing (live references, not cloned)
      _definitions: slides,
      // Expose rerenderSlide for debug bundle (separate bundle can't access _layoutFn)
      _rerenderSlide: rerenderSlide,
    };
    (skObj as any).lint = (slideId: string) => {
      const slideIdx = (skObj.slides as any[]).findIndex((s: any) => s.id === slideId);
      if (slideIdx === -1) throw new Error(`Slide not found: ${slideId}`);
      const slide = (skObj.slides as any[])[slideIdx];
      const slideEl = document.querySelectorAll('.reveal .slides > section')[slideIdx] || null;
      return lintSlide(slide, slideEl as HTMLElement | null);
    };
    (skObj as any).lintDeck = () => {
      const sectionEls = document.querySelectorAll('.reveal .slides > section') as NodeListOf<HTMLElement>;
      return lintDeck(skObj as any, sectionEls);
    };
    (window as unknown as Record<string, unknown>).sk = skObj;
    enableKeyboardToggle();

    // Watch for late font loads that happen after render. When a web font swaps
    // in after layout, text reflows but element positions are stale. Detect this
    // and automatically re-layout all slides.
    if (typeof document !== 'undefined' && document.fonts) {
      let fontWatcherAttached = false;
      const reLayoutOnFontSwap = () => {
        if (fontWatcherAttached) return;  // only trigger once
        fontWatcherAttached = true;
        // Debounce: wait for font loading to settle, then re-layout
        setTimeout(async () => {
          const sk = (window as any).sk;
          if (!sk?._definitions || !sk._rerenderSlide) return;
          // Clear measure cache — old measurements used wrong font metrics
          clearMeasureCache();
          // Re-layout each slide
          for (let i = 0; i < sk._definitions.length; i++) {
            try {
              await sk._rerenderSlide(i, sk._definitions[i]);
            } catch (_) { /* slide may not exist in DOM */ }
          }
        }, 100);
      };
      // Listen for font loads that happen after render
      document.fonts.addEventListener('loadingdone', reLayoutOnFontSwap);
      // Auto-remove after 10 seconds (fonts should be loaded by then)
      setTimeout(() => {
        document.fonts.removeEventListener('loadingdone', reLayoutOnFontSwap);
      }, 10000);
    }
  }

  return { sections, layouts };
}

/**
 * Re-layout and re-render a single slide in place.
 * Used by the inspector editor for live preview of property changes.
 *
 * @param slideIndex - 0-based index of the slide to re-render
 * @param slideDefinition - The (possibly mutated) slide definition
 * @returns The new LayoutResult for the slide
 */
export async function rerenderSlide(
  slideIndex: number,
  slideDefinition: SlideDefinition,
): Promise<LayoutResult> {
  if (!_layoutFn) throw new Error('Layout function not injected');

  // 1. Run layout
  const layoutResult = await _layoutFn(slideDefinition);

  // 2. Find existing layer (works with both .reveal .slides and custom containers)
  const allLayers = document.querySelectorAll('.slidekit-layer');
  const oldLayer = allLayers[slideIndex];
  if (!oldLayer?.parentElement) throw new Error(`Slide ${slideIndex} not found`);

  // 3. Create new layer
  const slideW = state.config?.slide?.w ?? 1920;
  const slideH = state.config?.slide?.h ?? 1080;
  const layer = document.createElement("div");
  layer.className = "slidekit-layer";
  layer.style.position = "relative";
  layer.style.width = `${slideW}px`;
  layer.style.height = `${slideH}px`;

  const zMap = computeZOrder(slideDefinition.elements);
  for (const element of slideDefinition.elements) {
    const zIndex = zMap.get(element.id) || 0;
    layer.appendChild(renderElementFromScene(element, zIndex, layoutResult.elements));
  }

  // 4. Swap in DOM
  oldLayer.replaceWith(layer);

  // 5. Post-render enrichment: text runs, image metadata, overflow detection
  // Reveal.js hides inactive slides with display:none, which makes
  // getBoundingClientRect() return zeros. Temporarily force the section
  // visible so we can measure text rects and image metadata.
  const section = layer.parentElement!;
  const wasHidden = getComputedStyle(section).display === 'none';
  if (wasHidden) {
    section.style.setProperty('display', 'block', 'important');
    section.style.visibility = 'hidden'; // keep invisible to user
    section.style.position = 'absolute';
    section.style.left = '-9999px';
  }
  const sceneElements = layoutResult.elements;
  for (const [id, entry] of Object.entries(sceneElements)) {
    if (entry.type !== "el") continue;
    const dom = section.querySelector(`[data-sk-id="${id}"]`) as HTMLElement | null;
    if (!dom) continue;

    // Text extraction
    const textContent = dom.textContent;
    if (textContent && textContent.trim().length > 0) {
      const textBox = extractTextBox(dom, entry.resolved);
      if (textBox && textBox.paragraphs.length > 0) {
        entry.text = textBox;
      }
    }

    // Image metadata
    const img = dom.querySelector("img") as HTMLImageElement | null;
    if (img && img.naturalWidth && img.naturalHeight) {
      const imgResolved = computeImageResolved(img, entry.resolved);
      if (imgResolved) entry.image = imgResolved;
    }

    // Overflow detection
    if (dom.scrollHeight > dom.clientHeight + 1) {
      layoutResult.warnings.push({
        type: "dom_overflow_y",
        elementId: id,
        clientHeight: dom.clientHeight,
        scrollHeight: dom.scrollHeight,
        overflow: dom.scrollHeight - dom.clientHeight,
      });
    }
    if (dom.scrollWidth > dom.clientWidth + 1) {
      layoutResult.warnings.push({
        type: "dom_overflow_x",
        elementId: id,
        clientWidth: dom.clientWidth,
        scrollWidth: dom.scrollWidth,
        overflow: dom.scrollWidth - dom.clientWidth,
      });
    }
  }

  // Restore original visibility
  if (wasHidden) {
    section.style.display = '';
    section.style.visibility = '';
    section.style.position = '';
    section.style.left = '';
  }

  // 6. Update window.sk
  const sk = (window as any).sk;
  if (sk) {
    sk.layouts[slideIndex] = layoutResult;
    if (sk.slides?.[slideIndex]) sk.slides[slideIndex].layout = layoutResult;
  }

  return layoutResult;
}

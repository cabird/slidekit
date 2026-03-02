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
import { routeConnector } from './connectorRouting.js';
import type { SlideElement, SlideDefinition, LayoutResult } from './types.js';

// Layout function injected by slidekit.js to avoid circular imports.
let _layoutFn: ((slide: SlideDefinition) => Promise<LayoutResult>) | undefined;
export function _setLayoutFn(fn: (slide: SlideDefinition) => Promise<LayoutResult>): void { _layoutFn = fn; }

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
function buildConnectorSVG(
  from: {x: number, y: number, dx: number, dy: number},
  to: {x: number, y: number, dx: number, dy: number},
  connProps: Record<string, any>
): HTMLElement {
  // Dynamic padding: enough room for arrowhead markers + stroke width
  const thickness = connProps.thickness ?? 2;
  const markerSize = 8; // matches marker markerWidth/markerHeight
  const padding = Math.max(20, markerSize + thickness * 2);
  const connType = connProps.connectorType || "straight";
  let minX = Math.min(from.x, to.x) - padding;
  let minY = Math.min(from.y, to.y) - padding;
  let maxX = Math.max(from.x, to.x) + padding;
  let maxY = Math.max(from.y, to.y) + padding;

  // Use cached waypoints from layout if available, otherwise compute
  let elbowWaypoints: {x: number, y: number}[] | null = null;
  if (connType === "elbow" || connType === "orthogonal") {
    if (connProps._cachedWaypoints) {
      elbowWaypoints = connProps._cachedWaypoints;
    } else {
      const cornerRadius = (connProps.cornerRadius as number) ?? 0;
      const stubLength = Math.max(40, markerSize * thickness + cornerRadius + 15);
      const route = routeConnector({ from, to, orthogonal: connType === "orthogonal", stubLength });
      elbowWaypoints = route.waypoints;
    }
    for (const wp of elbowWaypoints!) {
      if (wp.x < minX) minX = wp.x;
      if (wp.y < minY) minY = wp.y;
      if (wp.x > maxX) maxX = wp.x;
      if (wp.y > maxY) maxY = wp.y;
    }
  }

  // Clamp control point offset for curved connectors
  let cpOffset = 0;
  if (connType === "curved") {
    const dist = Math.sqrt((to.x - from.x) ** 2 + (to.y - from.y) ** 2);
    cpOffset = Math.min(200, Math.max(40, dist * 0.4));
    const cx1 = from.x + from.dx * cpOffset;
    const cy1 = from.y + from.dy * cpOffset;
    const cx2 = to.x + to.dx * cpOffset;
    const cy2 = to.y + to.dy * cpOffset;
    minX = Math.min(minX, cx1, cx2);
    minY = Math.min(minY, cy1, cy2);
    maxX = Math.max(maxX, cx1, cx2);
    maxY = Math.max(maxY, cy1, cy2);
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

  const color = connProps.color || "#ffffff";
  const dash = connProps.dash;
  const arrow = connProps.arrow || "end";

  // Arrowhead trim: move path endpoints inward so the stroke ends at the
  // arrowhead midpoint (refX=5) rather than extending through to the tip.
  // The marker tip extends past the shortened endpoint to the original anchor.
  // trim = (viewBoxWidth - refX) / viewBoxWidth * markerWidth * strokeWidth
  const arrowRefX = 5;
  const arrowTrim = (10 - arrowRefX) / 10 * markerSize * thickness;

  // Create marker definitions for arrow heads
  // Use element ID for deterministic marker IDs (avoid Math.random)
  const defs = document.createElementNS(ns, "defs");
  const markerId = `sk-arrow-${connProps._markerId || 'default'}`;

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
    const dx = first.x - next.x;
    const dy = first.y - next.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > amount * 2) {
      first.x -= (dx / len) * amount;
      first.y -= (dy / len) * amount;
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
      // Trim curved path endpoints
      let startPt = {x: lx1, y: ly1};
      let endPt = {x: lx2, y: ly2};
      if (hasStartArrow) {
        const trimmed = trimStart([startPt, {x: lx1 + from.dx * cpOffset, y: ly1 + from.dy * cpOffset}], arrowTrim);
        startPt = trimmed[0];
      }
      if (hasEndArrow) {
        const trimmed = trimEnd([{x: lx2 + to.dx * cpOffset, y: ly2 + to.dy * cpOffset}, endPt], arrowTrim);
        endPt = trimmed[trimmed.length - 1];
      }
      const cx1 = lx1 + from.dx * cpOffset;
      const cy1 = ly1 + from.dy * cpOffset;
      const cx2 = lx2 + to.dx * cpOffset;
      const cy2 = ly2 + to.dy * cpOffset;
      d = `M ${startPt.x} ${startPt.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${endPt.x} ${endPt.y}`;
    } else if (connType === "elbow" || connType === "orthogonal") {
      // Use orthogonal routing with direction-aware waypoints
      const waypoints = elbowWaypoints!;
      // Convert waypoints to SVG-local coordinates
      let localWaypoints = waypoints.map(p => ({
        x: p.x - minX,
        y: p.y - minY
      }));
      // Trim endpoints for arrowheads
      if (hasEndArrow) localWaypoints = trimEnd(localWaypoints, arrowTrim);
      if (hasStartArrow) localWaypoints = trimStart(localWaypoints, arrowTrim);
      if (localWaypoints.length >= 2) {
        const cornerRadius = connProps.cornerRadius ?? 0;
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

  // Optional label — placed along the actual path
  if (connProps.label) {
    const labelStyle = connProps.labelStyle || {};
    const labelSize = labelStyle.size ?? labelStyle.fontSize ?? 14;
    const labelColor = labelStyle.color ?? "#999999";
    const labelFont = labelStyle.font || labelStyle.fontFamily || "Inter";
    const labelWeight = labelStyle.weight ?? labelStyle.fontWeight ?? 400;
    const labelPosition = connProps.labelPosition ?? 0.5;
    const labelOffsetX = connProps.labelOffset?.x ?? 0;
    const labelOffsetY = connProps.labelOffset?.y ?? -8;

    // Compute label position along the actual path
    let midLX: number, midLY: number;
    let segAngle = 0; // rotation angle for the label
    if ((connType === "elbow" || connType === "orthogonal") && elbowWaypoints && elbowWaypoints.length >= 2) {
      const localWaypoints = elbowWaypoints.map(p => ({ x: p.x - minX, y: p.y - minY }));
      const pt = pointAlongPolyline(localWaypoints, labelPosition);
      midLX = pt.x;
      midLY = pt.y;
      // Find which segment the label falls on and compute angle
      const segInfo = segmentAtFraction(localWaypoints, labelPosition);
      if (segInfo) {
        const dx = segInfo.p2.x - segInfo.p1.x;
        const dy = segInfo.p2.y - segInfo.p1.y;
        if (Math.abs(dx) < 0.5 && Math.abs(dy) > 0.5) {
          segAngle = -90; // vertical segment: rotate label
        }
      }
    } else {
      midLX = lx1 + (lx2 - lx1) * labelPosition;
      midLY = ly1 + (ly2 - ly1) * labelPosition;
      // For straight/curved, check if mostly vertical
      if (Math.abs(lx2 - lx1) < Math.abs(ly2 - ly1) * 0.3) {
        segAngle = -90;
      }
    }

    // Add a background rect behind the label so the line doesn't cross it
    // First measure approximate text width
    const approxCharWidth = (typeof labelSize === 'number' ? labelSize : 14) * 0.6;
    const textWidth = connProps.label.length * approxCharWidth + 8;
    const textHeight = (typeof labelSize === 'number' ? labelSize : 14) + 6;
    const bgRect = document.createElementNS(ns, "rect");
    const bgX = midLX + labelOffsetX - textWidth / 2;
    const bgY = midLY + labelOffsetY - textHeight + 2;
    bgRect.setAttribute("x", String(bgX));
    bgRect.setAttribute("y", String(bgY));
    bgRect.setAttribute("width", String(textWidth));
    bgRect.setAttribute("height", String(textHeight));
    bgRect.setAttribute("fill", connProps._bgColor || "#0a0a1a");
    bgRect.setAttribute("rx", "3");
    if (segAngle !== 0) {
      bgRect.setAttribute("transform",
        `rotate(${segAngle} ${midLX + labelOffsetX} ${midLY + labelOffsetY})`);
    }
    svg.appendChild(bgRect);

    const textNode = document.createElementNS(ns, "text");
    textNode.setAttribute("x", String(midLX + labelOffsetX));
    textNode.setAttribute("y", String(midLY + labelOffsetY));
    textNode.setAttribute("text-anchor", "middle");
    textNode.setAttribute("font-family", `"${labelFont}", sans-serif`);
    textNode.setAttribute("font-size", String(labelSize));
    textNode.setAttribute("font-weight", String(labelWeight));
    textNode.setAttribute("fill", labelColor);
    if (segAngle !== 0) {
      textNode.setAttribute("transform",
        `rotate(${segAngle} ${midLX + labelOffsetX} ${midLY + labelOffsetY})`);
    }
    textNode.textContent = connProps.label;
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
 * Find a point at a given fraction (0–1) along a polyline's total length.
 */
function pointAlongPolyline(points: {x: number, y: number}[], t: number): {x: number, y: number} {
  if (points.length < 2) return points[0] || { x: 0, y: 0 };

  // Compute total length
  const segLengths: number[] = [];
  let totalLength = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const dx = points[i + 1].x - points[i].x;
    const dy = points[i + 1].y - points[i].y;
    const len = Math.sqrt(dx * dx + dy * dy);
    segLengths.push(len);
    totalLength += len;
  }

  if (totalLength === 0) return points[0];

  const targetLength = t * totalLength;
  let accumulated = 0;
  for (let i = 0; i < segLengths.length; i++) {
    if (accumulated + segLengths[i] >= targetLength) {
      const segFraction = segLengths[i] > 0 ? (targetLength - accumulated) / segLengths[i] : 0;
      return {
        x: points[i].x + (points[i + 1].x - points[i].x) * segFraction,
        y: points[i].y + (points[i + 1].y - points[i].y) * segFraction,
      };
    }
    accumulated += segLengths[i];
  }

  return points[points.length - 1];
}

/**
 * Return the segment endpoints at a given fraction along a polyline.
 */
function segmentAtFraction(
  points: {x: number, y: number}[],
  t: number
): { p1: {x: number, y: number}, p2: {x: number, y: number} } | null {
  if (points.length < 2) return null;
  const segLengths: number[] = [];
  let totalLength = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const dx = points[i + 1].x - points[i].x;
    const dy = points[i + 1].y - points[i].y;
    segLengths.push(Math.sqrt(dx * dx + dy * dy));
    totalLength += segLengths[i];
  }
  if (totalLength === 0) return null;
  const targetLength = t * totalLength;
  let accumulated = 0;
  for (let i = 0; i < segLengths.length; i++) {
    if (accumulated + segLengths[i] >= targetLength) {
      return { p1: points[i], p2: points[i + 1] };
    }
    accumulated += segLengths[i];
  }
  return { p1: points[points.length - 2], p2: points[points.length - 1] };
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

  // M8.4: Rotate — apply via CSS transform (dedicated prop, not user style)
  if (props.rotate !== undefined && props.rotate !== 0) {
    div.style.transform = `rotate(${props.rotate}deg)`;
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
      // Vertical alignment via flexbox when valign is set and element has explicit height
      const valign = props.valign;
      if (valign && valign !== 'top' && props.h != null) {
        div.style.display = 'flex';
        div.style.flexDirection = 'column';
        div.style.justifyContent = valign === 'center' ? 'center' : valign === 'bottom' ? 'flex-end' : 'flex-start';
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
      const connectorData = sceneElements[element.id]?._connectorResolved;
      if (connectorData) {
        const svgWrapper = buildConnectorSVG(
          connectorData.from,
          connectorData.to,
          {
            ...props,
            _markerId: element.id,
            _cachedWaypoints: connectorData.waypoints,
          }
        );
        // Return the SVG wrapper directly instead of the div
        svgWrapper.setAttribute("data-sk-id", element.id);
        svgWrapper.style.zIndex = String(zIndex);
        if (props.opacity !== undefined && props.opacity !== 1) {
          svgWrapper.style.opacity = String(props.opacity);
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
  }

  return { sections, layouts };
}

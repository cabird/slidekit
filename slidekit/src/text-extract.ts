// =============================================================================
// Text Run Extraction — DOM-based structured text content extraction
// =============================================================================
// Walks the browser's rendered DOM tree, splits content into paragraphs at
// semantic block boundaries, groups inline text nodes into style-uniform runs,
// and captures per-line-fragment bounding rects via Range.getClientRects().

import type { TextRunStyle, TextRun, TextParagraph, TextBoxResolved } from './types.js';

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
function extractRunStyle(cs: CSSStyleDeclaration): TextRunStyle {
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
export function extractTextBox(
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
  let currentBlockElement: HTMLElement | null = null;

  const flushParagraph = () => {
    if (currentRuns.length === 0) return;
    const runs: TextRun[] = [];
    for (const rb of currentRuns) {
      if (rb.isLineBreak) {
        runs.push({ text: '\n', style: rb.style, rects: [] });
        continue;
      }
      if (rb.textNodes.length === 0) continue;
      const rects: Array<{ x: number; y: number; w: number; h: number }> = [];
      for (const tn of rb.textNodes) {
        rects.push(...textNodeRects(tn, containerRect, resolved, scaleX, scaleY));
      }
      if (rects.length === 0 && rb.text.trim().length === 0) continue;
      runs.push({ text: rb.text, style: rb.style, rects });
    }
    if (runs.length > 0) {
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
      const parentCs = getCs(parent);
      if (parentCs.display === 'none' || parentCs.visibility === 'hidden') return;

      const style = extractRunStyle(parentCs);
      if (currentRun && !currentRun.isLineBreak && stylesMatch(currentRun.style, style)) {
        currentRun.textNodes.push(node as Text);
        currentRun.text += text;
      } else {
        currentRun = { style, textNodes: [node as Text], text, isLineBreak: false };
        currentRuns.push(currentRun);
      }
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    const elCs = getCs(el);
    if (elCs.display === 'none' || elCs.visibility === 'hidden') return;
    if (SKIP_TAGS.has(tag)) return;

    if (tag === 'br') {
      const parent = el.parentElement;
      const style = parent ? extractRunStyle(getCs(parent)) : extractRunStyle(elCs);
      currentRun = { style, textNodes: [], text: '\n', isLineBreak: true };
      currentRuns.push(currentRun);
      currentRun = null;
      return;
    }

    if (PARAGRAPH_TAGS.has(tag)) {
      flushParagraph();
      currentBlockElement = el;
      for (const child of el.childNodes) {
        walk(child);
      }
      flushParagraph();
      currentBlockElement = null;
    } else {
      for (const child of el.childNodes) {
        walk(child);
      }
    }
  };

  for (const child of container.childNodes) {
    walk(child);
  }
  flushParagraph();

  if (paragraphs.length === 0) return null;
  return { paragraphs };
}

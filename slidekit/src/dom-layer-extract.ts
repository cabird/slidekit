// =============================================================================
// DOM Visual Layer Extraction — post-render box-model enrichment
// =============================================================================
// Walks the rendered DOM tree inside each element and captures visual
// container properties (background, border, border-radius, shadow, etc.)
// so exporters can reproduce the visual appearance without parsing CSS.

import type { DOMVisualLayer, Rect } from './types.js';

/** Tags to skip during visual layer extraction. */
const SKIP_TAGS = new Set([
  'script', 'style', 'noscript', 'svg', 'canvas', 'video',
  'audio', 'iframe', 'img', 'object', 'embed',
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

/**
 * Check whether a background color string represents a fully transparent value.
 * Handles various computed formats: "transparent", "rgba(R, G, B, 0)",
 * "rgba(R G B / 0)", etc. Parses the alpha component rather than
 * string-matching specific formats.
 */
function isTransparent(bg: string): boolean {
  if (!bg || bg === 'transparent') return true;
  // Match rgba with comma syntax: rgba(R, G, B, A)
  const rgbaComma = bg.match(/^rgba\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*,\s*([\d.]+)\s*\)$/);
  if (rgbaComma) return parseFloat(rgbaComma[1]) === 0;
  // Match rgba with slash syntax: rgba(R G B / A) or rgb(R G B / A)
  const rgbaSlash = bg.match(/\/\s*([\d.]+)(%?)\s*\)$/);
  if (rgbaSlash) {
    const val = parseFloat(rgbaSlash[1]);
    return rgbaSlash[2] === '%' ? val === 0 : val === 0;
  }
  // rgb() without alpha is opaque
  if (bg.startsWith('rgb(')) return false;
  return false;
}

/**
 * Compute the effective opacity of an element by multiplying its own
 * opacity with each ancestor's opacity up to (but not including) the
 * container element.
 */
function computeEffectiveOpacity(
  el: Element,
  container: HTMLElement,
  getCs: (el: Element) => CSSStyleDeclaration,
): { ownOpacity: number; effectiveOpacity: number } {
  const rawOwn = parseFloat(getCs(el).opacity);
  const ownOpacity = Number.isNaN(rawOwn) ? 1 : rawOwn;
  let effective = ownOpacity;
  let ancestor = el.parentElement;
  while (ancestor && ancestor !== container) {
    const rawAnc = parseFloat(getCs(ancestor).opacity);
    effective *= Number.isNaN(rawAnc) ? 1 : rawAnc;
    ancestor = ancestor.parentElement;
  }
  return { ownOpacity, effectiveOpacity: effective };
}

/**
 * Extract visual container layers from a rendered DOM element's descendants.
 *
 * Each layer represents a DOM element with visible box styling (background,
 * border, border-radius, shadow, etc.). Layers are ordered in DOM/paint order.
 *
 * @param container - The SlideKit wrapper element (data-sk-id div)
 * @param resolved - The element's resolved bounds in slide-level CSS px
 * @returns Array of visual layers, or null if none found
 */
export function extractDOMLayers(
  container: HTMLElement,
  resolved: Rect,
): DOMVisualLayer[] | null {
  const containerRect = container.getBoundingClientRect();
  if (containerRect.width <= 0 || containerRect.height <= 0) return null;

  const scaleX = resolved.w / containerRect.width;
  const scaleY = resolved.h / containerRect.height;
  const getCs = makeCsCache();

  const layers: DOMVisualLayer[] = [];

  function walk(el: Element): void {
    const tag = el.tagName.toLowerCase();
    if (SKIP_TAGS.has(tag)) return;

    const cs = getCs(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return;

    // Check for visual box footprint
    const backgroundColor = cs.backgroundColor;
    const backgroundImage = cs.backgroundImage;
    const hasBg = !isTransparent(backgroundColor);
    const hasBgImage = !!backgroundImage && backgroundImage !== 'none';

    // Border per-side
    const borderTopWidth = parseFloat(cs.borderTopWidth) || 0;
    const borderRightWidth = parseFloat(cs.borderRightWidth) || 0;
    const borderBottomWidth = parseFloat(cs.borderBottomWidth) || 0;
    const borderLeftWidth = parseFloat(cs.borderLeftWidth) || 0;
    const borderTopStyle = cs.borderTopStyle;
    const borderRightStyle = cs.borderRightStyle;
    const borderBottomStyle = cs.borderBottomStyle;
    const borderLeftStyle = cs.borderLeftStyle;

    const hasTopBorder = borderTopWidth > 0 && borderTopStyle !== 'none';
    const hasRightBorder = borderRightWidth > 0 && borderRightStyle !== 'none';
    const hasBottomBorder = borderBottomWidth > 0 && borderBottomStyle !== 'none';
    const hasLeftBorder = borderLeftWidth > 0 && borderLeftStyle !== 'none';
    const hasBorder = hasTopBorder || hasRightBorder || hasBottomBorder || hasLeftBorder;

    // Border radius per-corner
    const topLeft = parseFloat(cs.borderTopLeftRadius) || 0;
    const topRight = parseFloat(cs.borderTopRightRadius) || 0;
    const bottomRight = parseFloat(cs.borderBottomRightRadius) || 0;
    const bottomLeft = parseFloat(cs.borderBottomLeftRadius) || 0;
    const hasRadius = topLeft > 0 || topRight > 0 || bottomRight > 0 || bottomLeft > 0;

    // Box shadow
    const boxShadow = cs.boxShadow;
    const hasBoxShadow = !!boxShadow && boxShadow !== 'none';

    // Backdrop filter
    const backdropFilter = cs.backdropFilter;
    const hasBackdropFilter = !!backdropFilter && backdropFilter !== 'none';

    // Emit layer if any visual footprint. Radius alone (without bg or border)
    // contributes no visible pixels, so only include it when paired with
    // another visual property.
    const hasVisualFootprint = hasBg || hasBgImage || hasBorder || hasBoxShadow || hasBackdropFilter
      || (hasRadius && (hasBg || hasBgImage || hasBorder));
    if (hasVisualFootprint) {
      const rect = (el as HTMLElement).getBoundingClientRect();
      // Skip zero-size elements (styled but no actual box)
      if (rect.width <= 0 && rect.height <= 0) {
        // Still recurse into children
        for (let i = 0; i < el.children.length; i++) walk(el.children[i]);
        return;
      }
      const slideRect = {
        x: resolved.x + (rect.left - containerRect.left) * scaleX,
        y: resolved.y + (rect.top - containerRect.top) * scaleY,
        w: rect.width * scaleX,
        h: rect.height * scaleY,
      };

      const { ownOpacity, effectiveOpacity } = computeEffectiveOpacity(el, container, getCs);

      const layer: DOMVisualLayer = {
        tag,
        rect: slideRect,
        backgroundColor,
        opacity: effectiveOpacity,
        ownOpacity,
        padding: {
          top: parseFloat(cs.paddingTop) || 0,
          right: parseFloat(cs.paddingRight) || 0,
          bottom: parseFloat(cs.paddingBottom) || 0,
          left: parseFloat(cs.paddingLeft) || 0,
        },
      };

      if (hasBorder) {
        layer.border = {
          top: { width: borderTopWidth, style: borderTopStyle, color: cs.borderTopColor },
          right: { width: borderRightWidth, style: borderRightStyle, color: cs.borderRightColor },
          bottom: { width: borderBottomWidth, style: borderBottomStyle, color: cs.borderBottomColor },
          left: { width: borderLeftWidth, style: borderLeftStyle, color: cs.borderLeftColor },
        };
      }

      if (hasRadius) {
        layer.borderRadius = { topLeft, topRight, bottomRight, bottomLeft };
      }

      if (hasBgImage) {
        layer.backgroundImage = backgroundImage;
      }

      if (hasBoxShadow) {
        layer.boxShadow = boxShadow;
      }

      if (hasBackdropFilter) {
        layer.backdropFilter = backdropFilter;
      }

      layers.push(layer);
    }

    // Recurse into children
    for (let i = 0; i < el.children.length; i++) {
      walk(el.children[i]);
    }
  }

  // Walk descendants of the container, not the container itself
  for (let i = 0; i < container.children.length; i++) {
    walk(container.children[i]);
  }

  return layers.length > 0 ? layers : null;
}

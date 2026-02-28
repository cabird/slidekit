// @ts-check
// =============================================================================
// Core Element Model (M1.1)
// =============================================================================

import { nextId } from './id.js';
import { resolveSpacing } from './spacing.js';

/**
 * Default values for common element properties.
 * Note: style is null here; applyDefaults creates a fresh {} for each element
 * to avoid shared-reference mutation bugs.
 */
export const COMMON_DEFAULTS = {
  x: 0,
  y: 0,
  anchor: "tl",
  layer: "content",
  opacity: 1,
  style: null,  // sentinel — applyDefaults creates fresh {} per element
  className: "",
};

/**
 * Apply default values to props — only fills in keys not already present.
 * The `id` key is excluded from the result (it lives on the element, not in props).
 * The `style` default is always a fresh {} to prevent cross-element mutation.
 */
export function applyDefaults(props, extraDefaults = {}) {
  const merged = { ...COMMON_DEFAULTS, ...extraDefaults };
  const result = {};
  for (const key of Object.keys(merged)) {
    if (key === "id") continue; // id is stored at the element level, not in props
    if (key === "style") {
      // Always produce a fresh object to avoid shared-reference bugs
      result[key] = props[key] !== undefined ? props[key] : {};
    } else {
      result[key] = props[key] !== undefined ? props[key] : merged[key];
    }
  }
  // Copy all remaining user props that are not in defaults (skip id)
  for (const key of Object.keys(props)) {
    if (key === "id") continue;
    if (result[key] === undefined) {
      result[key] = props[key];
    }
  }
  return result;
}

/**
 * Create a positioned HTML element on the canvas.
 *
 * @param {string} html - HTML string rendered via innerHTML
 * @param {object} props - Layout props: x, y, w, h, id, anchor, layer, rotate, opacity, style, className, overflow
 * @returns {{ id: string, type: string, content: string, props: object }}
 */
export function el(html, props = {}) {
  const { id: customId, ...rest } = props;
  const id = customId || nextId();
  const resolved = applyDefaults(rest, {
    overflow: "visible",
  });
  return { id, type: "el", content: html, props: resolved };
}

/**
 * Create a group element containing child elements.
 *
 * @param {Array} children - Array of SlideKit elements
 * @param {object} props - Positioning and styling properties
 * @returns {{ id: string, type: string, children: Array, props: object }}
 */
export function group(children, props = {}) {
  const { id: customId, ...rest } = props;
  const id = customId || nextId();
  const resolved = applyDefaults(rest, {
    scale: 1,
    clip: false,
  });
  // bounds: 'hug' is passed through via applyDefaults and consumed during layout
  return { id, type: "group", children, props: resolved };
}

// =============================================================================
// Stack Primitives (M5.2, M5.3)
// =============================================================================

/**
 * Create a vertical stack element. Children are laid out top-to-bottom
 * with a configurable gap and horizontal alignment.
 *
 * During layout solve, the stack computes absolute positions for each child
 * based on the stack's origin and the children's measured sizes.
 *
 * @param {Array} items - Array of SlideKit elements (children)
 * @param {Object} [props={}] - Positioning and layout properties
 * @returns {{ id: string, type: string, children: Array, props: object }}
 */
export function vstack(items, props = {}) {
  const { id: customId, ...rest } = props;
  const id = customId || nextId();
  const resolved = applyDefaults(rest, {
    gap: 0,
    align: "left",
  });
  return { id, type: "vstack", children: items, props: resolved };
}

/**
 * Create a horizontal stack element. Children are laid out left-to-right
 * with a configurable gap and vertical alignment.
 *
 * During layout solve, the stack computes absolute positions for each child
 * based on the stack's origin and the children's measured sizes.
 *
 * @param {Array} items - Array of SlideKit elements (children)
 * @param {Object} [props={}] - Positioning and layout properties
 * @returns {{ id: string, type: string, children: Array, props: object }}
 */
export function hstack(items, props = {}) {
  const { id: customId, ...rest } = props;
  const id = customId || nextId();
  const resolved = applyDefaults(rest, {
    gap: 0,
    align: "top",
  });
  return { id, type: "hstack", children: items, props: resolved };
}

/**
 * Arrange items in a grid pattern using vstack/hstack.
 *
 * Each row is an hstack with align:'stretch' so cards in the same row share
 * equal height.  Rows are stacked vertically with the same gap.
 *
 * @param {Array} items - Array of SlideKit elements
 * @param {Object} [opts={}] - Grid options
 * @returns {{ id: string, type: string, children: Array, props: object }}
 */
export function cardGrid(items, { id, cols = 2, gap = 0, x = 0, y = 0, w, anchor, layer, style } = {}) {
  const safeCols = Math.max(1, Math.floor(cols || 2));
  const resolvedGap = resolveSpacing(typeof gap === 'string' || typeof gap === 'number' ? gap : 0);

  // Split items into rows
  const rows = [];
  for (let i = 0; i < items.length; i += safeCols) {
    rows.push(items.slice(i, i + safeCols));
  }

  // Each row is an hstack with align: 'stretch'
  const rowStacks = rows.map((rowItems, idx) =>
    hstack(rowItems, { id: id ? `${id}-row-${idx}` : undefined, gap: resolvedGap, align: 'stretch' })
  );

  // Stack rows vertically
  return vstack(rowStacks, {
    id, x, y, w, gap: resolvedGap,
    anchor, layer, style,
  });
}

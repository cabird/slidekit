// =============================================================================
// Core Element Model (M1.1)
// =============================================================================

import { nextId } from './id.js';
import { resolveSpacing } from './spacing.js';
import type {
  SlideElement,
  ElElement,
  GroupElement,
  VStackElement,
  HStackElement,
  ElementProps,
} from './types.js';

/**
 * Props with an optional user-specified `id` field.
 * Factory functions extract `id` and pass the rest to applyDefaults.
 */
export interface InputProps extends ElementProps {
  id?: string;
}

/** Grid-specific options for cardGrid(). */
export interface CardGridOptions extends InputProps {
  /** Number of columns. */
  cols?: number;
}

/**
 * Default values for common element properties.
 * Note: style is null here; applyDefaults creates a fresh {} for each element
 * to avoid shared-reference mutation bugs.
 */
export const COMMON_DEFAULTS: Record<string, unknown> = {
  x: 0,
  y: 0,
  anchor: "tl",
  layer: "content",
  opacity: 1,
  style: null,  // sentinel — applyDefaults creates fresh {} per element
  className: "",
  valign: "top",
};

/**
 * Apply default values to props — only fills in keys not already present.
 * The `id` key is excluded from the result (it lives on the element, not in props).
 * The `style` default is always a fresh {} to prevent cross-element mutation.
 */
export function applyDefaults(
  props: Record<string, unknown>,
  extraDefaults: Record<string, unknown> = {},
): ElementProps {
  const merged: Record<string, unknown> = { ...COMMON_DEFAULTS, ...extraDefaults };
  const result: Record<string, unknown> = {};
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
  return result as ElementProps;
}

/**
 * Create a positioned HTML element on the canvas.
 *
 * @param html - HTML string rendered via innerHTML
 * @param props - Layout props: x, y, w, h, id, anchor, layer, rotate, opacity, style, className, overflow
 * @returns An ElElement node
 */
export function el(html: string, props: InputProps = {}): ElElement {
  const { id: customId, ...rest } = props;
  const id = customId || nextId();
  const resolved = applyDefaults(rest as Record<string, unknown>, {
    overflow: "visible",
  });
  return { id, type: "el", content: html, props: resolved, _layoutFlags: {} };
}

/**
 * Create a group element containing child elements.
 *
 * @param children - Array of SlideKit elements
 * @param props - Positioning and styling properties
 * @returns A GroupElement node
 */
export function group(children: SlideElement[], props: InputProps = {}): GroupElement {
  const { id: customId, ...rest } = props;
  const id = customId || nextId();
  const resolved = applyDefaults(rest as Record<string, unknown>, {
    scale: 1,
    clip: false,
  });
  // bounds: 'hug' is passed through via applyDefaults and consumed during layout
  return { id, type: "group", children, props: resolved, _layoutFlags: {} };
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
 * @param items - Array of SlideKit elements (children)
 * @param props - Positioning and layout properties
 * @returns A VStackElement node
 */
export function vstack(items: SlideElement[], props: InputProps = {}): VStackElement {
  const { id: customId, ...rest } = props;
  const id = customId || nextId();
  const resolved = applyDefaults(rest as Record<string, unknown>, {
    gap: 0,
    align: "left",
  });
  return { id, type: "vstack", children: items, props: resolved, _layoutFlags: {} };
}

/**
 * Create a horizontal stack element. Children are laid out left-to-right
 * with a configurable gap and vertical alignment.
 *
 * During layout solve, the stack computes absolute positions for each child
 * based on the stack's origin and the children's measured sizes.
 *
 * @param items - Array of SlideKit elements (children)
 * @param props - Positioning and layout properties
 * @returns An HStackElement node
 */
export function hstack(items: SlideElement[], props: InputProps = {}): HStackElement {
  const { id: customId, ...rest } = props;
  const id = customId || nextId();
  const resolved = applyDefaults(rest as Record<string, unknown>, {
    gap: 0,
    align: "top",
  });
  return { id, type: "hstack", children: items, props: resolved, _layoutFlags: {} };
}

/**
 * Arrange items in a grid pattern using vstack/hstack.
 *
 * Each row is an hstack with align:'stretch' so cards in the same row share
 * equal height.  Rows are stacked vertically with the same gap.
 *
 * @param items - Array of SlideKit elements
 * @param opts - Grid options
 * @returns A VStackElement node containing row HStacks
 */
export function cardGrid(
  items: SlideElement[],
  { id, cols = 2, gap = 0, x = 0, y = 0, w, anchor, layer, style }: CardGridOptions = {},
): VStackElement {
  const safeCols = Math.max(1, Math.floor(cols || 2));
  const resolvedGap = resolveSpacing(typeof gap === 'string' || typeof gap === 'number' ? gap : 0);

  // Split items into rows
  const rows: SlideElement[][] = [];
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

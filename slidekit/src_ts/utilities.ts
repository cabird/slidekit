// SlideKit — Utility functions: grid, snap, resolvePercentage, repeat, rotatedAABB
// Extracted from slidekit.js

import { state } from './state.js';
import { resolveSpacing } from './spacing.js';
import { group } from './elements.js';
import type { SlideElement, Rect, GroupElement } from './types.js';

function deepClone<T>(obj: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(obj);
  }
  return JSON.parse(JSON.stringify(obj));
}

// =============================================================================
// Grid System (M8.2)
// =============================================================================

/** Grid configuration options. */
interface GridConfig {
  cols?: number;
  gutter?: number;
  margin?: { left?: number; right?: number };
}

/** The grid object returned by grid(). */
interface Grid {
  cols: number;
  gutter: number;
  colWidth: number;
  marginLeft: number;
  marginRight: number;
  totalWidth: number;
  col(n: number): number;
  spanW(from: number, to: number): number;
}

/**
 * Create a grid system for consistent alignment across slides.
 *
 * @param config - Grid configuration
 * @returns A grid object with col() and spanW() helpers
 */
export function grid(config: GridConfig = {}): Grid {
  const cols = config.cols || 12;
  const gutter = config.gutter ?? 30;

  // Use provided margins or fall back to safe zone or defaults
  let marginLeft: number;
  let marginRight: number;
  if (config.margin) {
    marginLeft = config.margin.left ?? 120;
    marginRight = config.margin.right ?? 120;
  } else if (state.safeRectCache) {
    marginLeft = (state.safeRectCache as Rect).x;
    marginRight = ((state as any).config?.slide?.w ?? 1920) - ((state.safeRectCache as Rect).x + (state.safeRectCache as Rect).w);
  } else {
    marginLeft = 120;
    marginRight = 120;
  }

  const totalWidth = ((state as any).config?.slide?.w ?? 1920) - marginLeft - marginRight;
  const totalGutters = (cols - 1) * gutter;
  const colWidth = (totalWidth - totalGutters) / cols;

  if (colWidth <= 0) {
    throw new Error(
      `grid(): computed column width is ${colWidth.toFixed(1)}px (non-positive). ` +
      `Check cols (${cols}), gutter (${gutter}), and margins (${marginLeft}+${marginRight}).`
    );
  }

  return {
    cols,
    gutter,
    colWidth,
    marginLeft,
    marginRight,
    totalWidth,

    /**
     * Get the x position of column n's left edge (1-indexed).
     *
     * @param n - Column number (1-based)
     * @returns X position in pixels
     */
    col(n: number): number {
      if (n < 1 || n > cols) {
        throw new Error(`grid.col(${n}): column must be between 1 and ${cols}`);
      }
      return marginLeft + (n - 1) * (colWidth + gutter);
    },

    /**
     * Get the width spanning columns from..to (inclusive, 1-indexed).
     * Includes gutters between the columns.
     *
     * @param from - Start column (1-based, inclusive)
     * @param to - End column (1-based, inclusive)
     * @returns Width in pixels
     */
    spanW(from: number, to: number): number {
      if (from < 1 || to > cols || from > to) {
        throw new Error(`grid.spanW(${from}, ${to}): invalid range for ${cols}-column grid`);
      }
      const numCols = to - from + 1;
      return numCols * colWidth + (numCols - 1) * gutter;
    },
  };
}

/**
 * Snap a value to the nearest multiple of gridSize.
 *
 * @param value - The value to snap
 * @param gridSize - The grid size to snap to
 * @returns The snapped value
 */
export function snap(value: number, gridSize: number): number {
  if (gridSize <= 0) return value;
  return Math.round(value / gridSize) * gridSize;
}

// =============================================================================
// Percentage Sugar (M8.3)
// =============================================================================

/**
 * Resolve a percentage string to a pixel value.
 *
 * - "10%" -> 0.10 * slideWidth (for x/w) or slideHeight (for y/h)
 * - "safe:10%" -> safeRect().x + 0.10 * safeRect().w (for x/w) or y/h equivalents
 *
 * Always slide-relative. Never parent-relative. For parent-relative, use "fill".
 *
 * @param value - The value to resolve (may be string percentage or number)
 * @param axis - "x", "y", "w", or "h"
 * @returns Resolved pixel value, or the original value if not a percentage string
 */
export function resolvePercentage(value: unknown, axis: "x" | "y" | "w" | "h"): unknown {
  if (typeof value !== "string") return value;

  const slideW = (state as any).config?.slide?.w ?? 1920;
  const slideH = (state as any).config?.slide?.h ?? 1080;
  const sr: Rect = (state.safeRectCache as Rect) || { x: 120, y: 90, w: 1680, h: 900 };

  // Check for safe-zone-relative: "safe:N%"
  const safeMatch = value.match(/^safe:\s*([0-9.]+)%$/);
  if (safeMatch) {
    const pct = parseFloat(safeMatch[1]) / 100;
    if (Number.isNaN(pct)) return value; // guard against invalid parse
    if (axis === "x") return sr.x + pct * sr.w;
    if (axis === "y") return sr.y + pct * sr.h;
    if (axis === "w") return pct * sr.w;
    if (axis === "h") return pct * sr.h;
    return value; // unknown axis, return as-is
  }

  // Check for slide-relative: "N%"
  const pctMatch = value.match(/^([0-9.]+)%$/);
  if (pctMatch) {
    const pct = parseFloat(pctMatch[1]) / 100;
    if (Number.isNaN(pct)) return value; // guard against invalid parse
    if (axis === "x" || axis === "w") return pct * slideW;
    if (axis === "y" || axis === "h") return pct * slideH;
    return value;
  }

  // Not a percentage string
  return value;
}

// =============================================================================
// Repeat / Duplicate (M8.5)
// =============================================================================

function _reIdChildren(el: SlideElement, suffix: string): void {
  if (!('children' in el) || !el.children) return;
  for (const child of el.children) {
    if (child.id) {
      (child as any).id = `${child.id}${suffix}`;
    }
    _reIdChildren(child, suffix);
  }
}

/** Repeat configuration. */
interface RepeatConfig {
  count?: number;
  cols?: number;
  gapX?: number | string;
  gapY?: number | string;
  startX?: number;
  startY?: number;
}

/**
 * Create copies of an element laid out in a grid pattern.
 *
 * @param element - A SlideKit element to duplicate
 * @param config - Repeat configuration
 * @returns A group containing all copies
 */
export function repeat(element: SlideElement, config: RepeatConfig = {}): GroupElement {
  const count = config.count || 1;
  const cols = config.cols ?? count; // default: single row
  const gapX = resolveSpacing(config.gapX ?? 0);
  const gapY = resolveSpacing(config.gapY ?? 0);
  const startX = config.startX ?? 0;
  const startY = config.startY ?? 0;

  const baseId = element.id || "repeat";
  const elemW = (element.props?.w as number) || 0;
  const elemH = (element.props?.h as number) || 0;

  const children: SlideElement[] = [];
  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);

    const x = startX + col * (elemW + gapX);
    const y = startY + row * (elemH + gapY);

    // Deep clone the element and recursively re-ID all nested children
    const copy = deepClone(element);
    const suffix = `-${i + 1}`;
    (copy as any).id = `${baseId}${suffix}`;
    _reIdChildren(copy, suffix);
    (copy as any).props.x = x;
    (copy as any).props.y = y;

    children.push(copy);
  }

  // Compute group bounds
  const rows = Math.ceil(count / cols);
  const groupW = cols * elemW + (cols - 1) * gapX;
  const groupH = rows * elemH + (rows - 1) * gapY;

  return group(children, {
    x: 0,
    y: 0,
    w: groupW,
    h: groupH,
  });
}

// =============================================================================
// Rotate — AABB computation (M8.4)
// =============================================================================

/**
 * Compute the Axis-Aligned Bounding Box (AABB) of a rectangle rotated by theta degrees.
 *
 * For a rect (w, h) rotated by theta:
 *   AABB width  = |w * cos(theta)| + |h * sin(theta)|
 *   AABB height = |w * sin(theta)| + |h * cos(theta)|
 *
 * @param w - Original width
 * @param h - Original height
 * @param degrees - Rotation angle in degrees
 * @returns AABB dimensions { w, h }
 */
export function rotatedAABB(w: number, h: number, degrees: number): { w: number; h: number } {
  const rad = (degrees * Math.PI) / 180;
  const cosA = Math.abs(Math.cos(rad));
  const sinA = Math.abs(Math.sin(rad));
  return {
    w: w * cosA + h * sinA,
    h: w * sinA + h * cosA,
  };
}

// =============================================================================
// Anchor Resolution (M1.2)
// =============================================================================

import type { AnchorPoint } from './types.js';

/**
 * Resolve an anchor point to CSS left/top values.
 *
 * Given the user-specified (x, y) coordinate, the element's dimensions (w, h),
 * and an anchor point string, compute the CSS { left, top } values for the
 * element's top-left corner.
 *
 * Anchor grid:
 *   tl ---- tc ---- tr
 *   |                |
 *   cl      cc      cr
 *   |                |
 *   bl ---- bc ---- br
 *
 * @param x - User-specified x coordinate
 * @param y - User-specified y coordinate
 * @param w - Element width
 * @param h - Element height
 * @param anchor - Anchor point string (tl, tc, tr, cl, cc, cr, bl, bc, br)
 * @returns { left, top }
 */
export const VALID_ANCHORS: ReadonlySet<string> = new Set(["tl", "tc", "tr", "cl", "cc", "cr", "bl", "bc", "br"] as const);

export function resolveAnchor(
  x: number,
  y: number,
  w: number,
  h: number,
  anchor: AnchorPoint,
): { left: number; top: number } {
  if (typeof anchor !== "string" || !VALID_ANCHORS.has(anchor)) {
    throw new Error(
      `Invalid anchor "${anchor}". Must be one of: ${Array.from(VALID_ANCHORS).join(", ")}`
    );
  }

  // Horizontal offset based on anchor column
  let left: number;
  const col = anchor[1]; // second character: l, c, r
  if (col === "l") {
    left = x;
  } else if (col === "c") {
    left = x - w / 2;
  } else if (col === "r") {
    left = x - w;
  } else {
    throw new Error(`Invalid anchor column "${col}" in anchor "${anchor}"`);
  }

  // Vertical offset based on anchor row
  let top: number;
  const row = anchor[0]; // first character: t, c, b
  if (row === "t") {
    top = y;
  } else if (row === "c") {
    top = y - h / 2;
  } else if (row === "b") {
    top = y - h;
  } else {
    throw new Error(`Invalid anchor row "${row}" in anchor "${anchor}"`);
  }

  return { left, top };
}

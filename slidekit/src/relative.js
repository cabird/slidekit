// @ts-check
// =============================================================================
// Relative Positioning Helpers (M3.2)
// =============================================================================

import { resolveSpacing } from './spacing.js';

/**
 * Position Y below a referenced element with an optional gap.
 * Returns a deferred value marker resolved during layout solve.
 *
 * @param {string} refId - ID of the element to position relative to
 * @param {object} [opts={}] - Options
 * @param {number|string} [opts.gap=0] - Gap below the reference element (px number or spacing token)
 * @returns {{ _rel: "below", ref: string, gap: number }}
 */
export function below(refId, opts = {}) {
  return { _rel: "below", ref: refId, gap: resolveSpacing(opts.gap ?? 0) };
}

/**
 * Position Y above a referenced element with an optional gap.
 *
 * @param {string} refId - ID of the element to position relative to
 * @param {object} [opts={}] - Options
 * @param {number|string} [opts.gap=0] - Gap above the reference element (px number or spacing token)
 * @returns {{ _rel: "above", ref: string, gap: number }}
 */
export function above(refId, opts = {}) {
  return { _rel: "above", ref: refId, gap: resolveSpacing(opts.gap ?? 0) };
}

/**
 * Position X to the right of a referenced element with an optional gap.
 *
 * @param {string} refId - ID of the element to position relative to
 * @param {object} [opts={}] - Options
 * @param {number|string} [opts.gap=0] - Gap to the right of the reference element (px number or spacing token)
 * @returns {{ _rel: "rightOf", ref: string, gap: number }}
 */
export function rightOf(refId, opts = {}) {
  return { _rel: "rightOf", ref: refId, gap: resolveSpacing(opts.gap ?? 0) };
}

/**
 * Position X to the left of a referenced element with an optional gap.
 *
 * @param {string} refId - ID of the element to position relative to
 * @param {object} [opts={}] - Options
 * @param {number|string} [opts.gap=0] - Gap to the left of the reference element (px number or spacing token)
 * @returns {{ _rel: "leftOf", ref: string, gap: number }}
 */
export function leftOf(refId, opts = {}) {
  return { _rel: "leftOf", ref: refId, gap: resolveSpacing(opts.gap ?? 0) };
}

/**
 * Center vertically with a referenced element (align vertical midpoints).
 *
 * @param {string} refId - ID of the element to center with
 * @returns {{ _rel: "centerV", ref: string }}
 */
export function centerVWith(refId) {
  return { _rel: "centerV", ref: refId };
}

/**
 * Center horizontally with a referenced element (align horizontal midpoints).
 *
 * @param {string} refId - ID of the element to center with
 * @returns {{ _rel: "centerH", ref: string }}
 */
export function centerHWith(refId) {
  return { _rel: "centerH", ref: refId };
}

/**
 * Align top edge with a referenced element.
 *
 * @param {string} refId - ID of the element to align with
 * @returns {{ _rel: "alignTop", ref: string }}
 */
export function alignTopWith(refId) {
  return { _rel: "alignTop", ref: refId };
}

/**
 * Align bottom edge with a referenced element (y = ref.bottom - own height).
 *
 * @param {string} refId - ID of the element to align with
 * @returns {{ _rel: "alignBottom", ref: string }}
 */
export function alignBottomWith(refId) {
  return { _rel: "alignBottom", ref: refId };
}

/**
 * Align left edge with a referenced element.
 *
 * @param {string} refId - ID of the element to align with
 * @returns {{ _rel: "alignLeft", ref: string }}
 */
export function alignLeftWith(refId) {
  return { _rel: "alignLeft", ref: refId };
}

/**
 * Align right edge with a referenced element (x = ref.right - own width).
 *
 * @param {string} refId - ID of the element to align with
 * @returns {{ _rel: "alignRight", ref: string }}
 */
export function alignRightWith(refId) {
  return { _rel: "alignRight", ref: refId };
}

/**
 * Center within a rectangle (e.g., safeRect()).
 *
 * @param {{ x: number, y: number, w: number, h: number }} rectParam - Rectangle to center within
 * @returns {{ x: object, y: object }}
 */
export function centerIn(rectParam) {
  const marker = { _rel: "centerIn", rect: rectParam };
  return { x: marker, y: marker };
}

/**
 * Position Y between two vertical references with configurable bias.
 *
 * @param {string} topRef - ID of the element above (uses its bottom edge)
 * @param {number|string} bottomYOrRef - Absolute Y number or ID of element below (uses its top edge)
 * @param {object} [opts={}] - Options
 * @param {number} [opts.bias=0.35] - 0.0 = flush with top, 1.0 = flush with bottom, 0.35 = biased toward top
 * @returns {{ _rel: "between", ref: string, ref2: number|string, bias: number }}
 */
export function placeBetween(topRef, bottomYOrRef, { bias = 0.35 } = {}) {
  const numBias = typeof bias === "number" && Number.isFinite(bias) ? bias : 0.35;
  const clampedBias = Math.max(0, Math.min(1, numBias));
  return { _rel: "between", ref: topRef, ref2: bottomYOrRef, bias: clampedBias };
}

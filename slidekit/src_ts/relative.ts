// =============================================================================
// Relative Positioning Helpers (M3.2)
// =============================================================================

import { resolveSpacing } from './spacing.js';
import type { RelMarker, Rect } from './types.js';

/** Options for relative positioning functions that accept a gap. */
interface RelGapOpts {
  gap?: number | string;
}

/**
 * Position Y below a referenced element with an optional gap.
 * Returns a deferred value marker resolved during layout solve.
 *
 * @param refId - ID of the element to position relative to
 * @param opts - Options
 * @returns A RelMarker with _rel: "below"
 */
export function below(refId: string, opts: RelGapOpts = {}): RelMarker {
  return { _rel: "below", ref: refId, gap: resolveSpacing(opts.gap ?? 0) };
}

/**
 * Position Y above a referenced element with an optional gap.
 *
 * @param refId - ID of the element to position relative to
 * @param opts - Options
 * @returns A RelMarker with _rel: "above"
 */
export function above(refId: string, opts: RelGapOpts = {}): RelMarker {
  return { _rel: "above", ref: refId, gap: resolveSpacing(opts.gap ?? 0) };
}

/**
 * Position X to the right of a referenced element with an optional gap.
 *
 * @param refId - ID of the element to position relative to
 * @param opts - Options
 * @returns A RelMarker with _rel: "rightOf"
 */
export function rightOf(refId: string, opts: RelGapOpts = {}): RelMarker {
  return { _rel: "rightOf", ref: refId, gap: resolveSpacing(opts.gap ?? 0) };
}

/**
 * Position X to the left of a referenced element with an optional gap.
 *
 * @param refId - ID of the element to position relative to
 * @param opts - Options
 * @returns A RelMarker with _rel: "leftOf"
 */
export function leftOf(refId: string, opts: RelGapOpts = {}): RelMarker {
  return { _rel: "leftOf", ref: refId, gap: resolveSpacing(opts.gap ?? 0) };
}

/**
 * Center vertically with a referenced element (align vertical midpoints).
 *
 * @param refId - ID of the element to center with
 * @returns A RelMarker with _rel: "centerV"
 */
export function centerVWith(refId: string): RelMarker {
  return { _rel: "centerV", ref: refId };
}

/**
 * Center horizontally with a referenced element (align horizontal midpoints).
 *
 * @param refId - ID of the element to center with
 * @returns A RelMarker with _rel: "centerH"
 */
export function centerHWith(refId: string): RelMarker {
  return { _rel: "centerH", ref: refId };
}

/**
 * Align top edge with a referenced element.
 *
 * @param refId - ID of the element to align with
 * @returns A RelMarker with _rel: "alignTop"
 */
export function alignTopWith(refId: string): RelMarker {
  return { _rel: "alignTop", ref: refId };
}

/**
 * Align bottom edge with a referenced element (y = ref.bottom - own height).
 *
 * @param refId - ID of the element to align with
 * @returns A RelMarker with _rel: "alignBottom"
 */
export function alignBottomWith(refId: string): RelMarker {
  return { _rel: "alignBottom", ref: refId };
}

/**
 * Align left edge with a referenced element.
 *
 * @param refId - ID of the element to align with
 * @returns A RelMarker with _rel: "alignLeft"
 */
export function alignLeftWith(refId: string): RelMarker {
  return { _rel: "alignLeft", ref: refId };
}

/**
 * Align right edge with a referenced element (x = ref.right - own width).
 *
 * @param refId - ID of the element to align with
 * @returns A RelMarker with _rel: "alignRight"
 */
export function alignRightWith(refId: string): RelMarker {
  return { _rel: "alignRight", ref: refId };
}

/**
 * Center within a rectangle (e.g., safeRect()).
 *
 * @param rectParam - Rectangle to center within
 * @returns Object with x and y RelMarkers
 */
export function centerIn(rectParam: Rect): { x: RelMarker; y: RelMarker } {
  const marker: RelMarker = { _rel: "centerIn", rect: rectParam };
  return { x: marker, y: marker };
}

/**
 * Position Y between two vertical references with configurable bias.
 *
 * @param topRef - ID of the element above (uses its bottom edge)
 * @param bottomYOrRef - Absolute Y number or ID of element below (uses its top edge)
 * @param opts - Options
 * @returns A RelMarker with _rel: "between"
 */
export function placeBetween(
  topRef: string,
  bottomYOrRef: number | string,
  { bias = 0.35 }: { bias?: number } = {},
): RelMarker {
  const numBias = typeof bias === "number" && Number.isFinite(bias) ? bias : 0.35;
  const clampedBias = Math.max(0, Math.min(1, numBias));
  return { _rel: "between", ref: topRef, ref2: bottomYOrRef, bias: clampedBias };
}

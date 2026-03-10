// =============================================================================
// Relative Positioning Helpers (M3.2)
// =============================================================================

import { resolveSpacing } from './spacing.js';
import type { RelMarker, Rect } from './types.js';

/** Options for relative positioning functions that accept a gap. */
interface RelGapOpts {
  gap?: number | string;
}

/** Accepted second argument: either an options object or a bare gap value. */
type GapArg = RelGapOpts | number | string;

/** Normalize a bare gap value (string or number) into a RelGapOpts object. */
function normalizeGapArg(arg: GapArg): RelGapOpts {
  if (typeof arg === 'string' || typeof arg === 'number') {
    return { gap: arg };
  }
  return arg;
}

/**
 * Position Y below a referenced element with an optional gap.
 * Returns a deferred value marker resolved during layout solve.
 *
 * @param refId - ID of the element to position relative to
 * @param opts - Options object or bare gap value (spacing token or px number)
 * @returns A RelMarker with _rel: "below"
 */
export function below(refId: string, opts: GapArg = {}): RelMarker {
  const o = normalizeGapArg(opts);
  return { _rel: "below", ref: refId, gap: resolveSpacing(o.gap ?? 0) };
}

/**
 * Position Y above a referenced element with an optional gap.
 *
 * @param refId - ID of the element to position relative to
 * @param opts - Options object or bare gap value (spacing token or px number)
 * @returns A RelMarker with _rel: "above"
 */
export function above(refId: string, opts: GapArg = {}): RelMarker {
  const o = normalizeGapArg(opts);
  return { _rel: "above", ref: refId, gap: resolveSpacing(o.gap ?? 0) };
}

/**
 * Position X to the right of a referenced element with an optional gap.
 *
 * @param refId - ID of the element to position relative to
 * @param opts - Options object or bare gap value (spacing token or px number)
 * @returns A RelMarker with _rel: "rightOf"
 */
export function rightOf(refId: string, opts: GapArg = {}): RelMarker {
  const o = normalizeGapArg(opts);
  return { _rel: "rightOf", ref: refId, gap: resolveSpacing(o.gap ?? 0) };
}

/**
 * Position X to the left of a referenced element with an optional gap.
 *
 * @param refId - ID of the element to position relative to
 * @param opts - Options object or bare gap value (spacing token or px number)
 * @returns A RelMarker with _rel: "leftOf"
 */
export function leftOf(refId: string, opts: GapArg = {}): RelMarker {
  const o = normalizeGapArg(opts);
  return { _rel: "leftOf", ref: refId, gap: resolveSpacing(o.gap ?? 0) };
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
 * @deprecated Use `between(refA, refB, { axis: 'y' })` instead.
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

/**
 * Position between two references on a specified axis.
 *
 * On the X axis: centers in the horizontal gap between refA's right edge
 * and refB's left edge. On the Y axis: centers in the vertical gap between
 * refA's bottom edge and refB's top edge.
 *
 * @param refA - ID of the first reference element (or raw px number)
 * @param refB - ID of the second reference element (or raw px number)
 * @param opts - Options: axis ('x' | 'y') is required, bias (0–1, default 0.5)
 * @returns A RelMarker with _rel: "between"
 */
export function between(
  refA: string | number,
  refB: string | number,
  { axis, bias = 0.5 }: { axis: 'x' | 'y'; bias?: number },
): RelMarker {
  const numBias = typeof bias === "number" && Number.isFinite(bias) ? bias : 0.5;
  const clampedBias = Math.max(0, Math.min(1, numBias));
  // Normalize: ref must be a string (element ID), ref2 can be string or number.
  // If refA is a number, swap so the number goes in ref2.
  let ref: string;
  let ref2: string | number;
  if (typeof refA === 'number' && typeof refB === 'number') {
    // Both numbers — use refA as a fake "ref" via ref2 pattern isn't possible.
    // Treat as raw coordinate range: store in ref2 with a synthetic ref.
    // Actually, this doesn't fit the RelMarker model. At least one must be an element ID.
    throw new Error('between() requires at least one element ID reference');
  } else if (typeof refA === 'number') {
    // Swap so the element ID is ref and the number is ref2, then invert bias
    ref = refB as string;
    ref2 = refA;
    return { _rel: "between", ref, ref2, bias: 1 - clampedBias, axis };
  } else {
    ref = refA;
    ref2 = refB;
  }
  return { _rel: "between", ref, ref2, bias: clampedBias, axis };
}

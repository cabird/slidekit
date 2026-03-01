// Overflow policy checking — extracted from layout.js (Phase 2.5)
// Checks if content overflows elements with explicit height and applies overflow policies.

import { measure } from '../measure.js';
import { mustGet } from '../assertions.js';
import type { SlideElement, Rect, AuthoredSpec } from '../types.js';

/**
 * Check overflow policies for elements with explicit height.
 *
 * For el() elements with an explicit `h` and a non-"visible" overflow policy,
 * measures content height and produces warnings, errors, or clip flags.
 *
 * @param {string[]} sortedOrder - Element IDs in layout order
 * @param {Map} flatMap - Map of element ID → element object
 * @param {Map} authoredSpecs - Map of element ID → original authored spec
 * @param {Map} resolvedBounds - Map of element ID → resolved bounds { w, h, ... }
 * @param {Array} warnings - Array to push warning objects into
 * @param {Array} errors - Array to push error objects into
 */
export async function checkOverflowPolicies(
  sortedOrder: string[],
  flatMap: Map<string, SlideElement>,
  authoredSpecs: Map<string, AuthoredSpec>,
  resolvedBounds: Map<string, Rect>,
  warnings: Array<Record<string, unknown>>,
  errors: Array<Record<string, unknown>>,
): Promise<void> {
  for (const id of sortedOrder) {
    const el = mustGet(flatMap, id, `flatMap missing element in overflow check: ${id}`);
    if (el.type !== "el") continue;

    const authoredH = mustGet(authoredSpecs, id, `authoredSpecs missing element in overflow check: ${id}`).props.h;
    if (authoredH === undefined || authoredH === null) continue;

    const bounds = mustGet(resolvedBounds, id, `resolvedBounds missing element in overflow check: ${id}`);
    const overflow = el.props.overflow || "visible";
    if (overflow === "visible") continue;

    // Measure content to check for overflow
    const html = el.content || "";
    if (!html) continue;

    const metrics = await measure(html, { ...el.props, w: bounds.w });
    const overflows = metrics.h > bounds.h;
    if (!overflows) continue;

    switch (overflow) {
      case "warn":
        warnings.push({
          type: "content_overflow",
          elementId: id,
          overflow: "warn",
          contentHeight: metrics.h,
          boxHeight: bounds.h,
          message: `Content in "${id}" overflows its box (content: ${metrics.h}px, box: ${bounds.h}px)`,
        });
        break;

      case "clip":
        el._layoutFlags.clip = true;
        break;

      case "error":
        errors.push({
          type: "content_overflow",
          elementId: id,
          overflow: "error",
          contentHeight: metrics.h,
          boxHeight: bounds.h,
          message: `Content in "${id}" overflows its box (content: ${metrics.h}px, box: ${bounds.h}px)`,
        });
        break;
    }
  }

}

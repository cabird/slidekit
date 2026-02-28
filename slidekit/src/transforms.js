// =============================================================================
// Alignment, Distribution & Size Matching Transforms (M6)
// =============================================================================

import { state } from './state.js';

/**
 * Transform ID counter — auto-generates unique IDs for transforms.
 * Reset when the layout pipeline runs so transforms are deterministic.
 */
export function nextTransformId() {
  state.transformIdCounter += 1;
  return `transform-${state.transformIdCounter}`;
}

/**
 * Align all specified elements' left edges.
 * If `to` is provided, all left edges are set to that value.
 * Otherwise, all are set to the minimum left edge among them.
 *
 * @param {string[]} ids - Array of element IDs to align
 * @param {object} [options={}]
 * @param {number} [options.to] - Explicit anchor value for alignment
 * @returns {{ _transform: string, _transformId: string, ids: string[], options: object }}
 */
export function alignLeft(ids, options = {}) {
  return { _transform: "alignLeft", _transformId: nextTransformId(), ids, options };
}

/**
 * Align all specified elements' right edges.
 * If `to` is provided, all right edges are set to that value.
 * Otherwise, all are set to the maximum right edge among them.
 *
 * @param {string[]} ids - Array of element IDs to align
 * @param {object} [options={}]
 * @param {number} [options.to] - Explicit anchor value for alignment
 * @returns {{ _transform: string, _transformId: string, ids: string[], options: object }}
 */
export function alignRight(ids, options = {}) {
  return { _transform: "alignRight", _transformId: nextTransformId(), ids, options };
}

/**
 * Align all specified elements' top edges.
 * If `to` is provided, all top edges are set to that value.
 * Otherwise, all are set to the minimum top edge among them.
 *
 * @param {string[]} ids - Array of element IDs to align
 * @param {object} [options={}]
 * @param {number} [options.to] - Explicit anchor value for alignment
 * @returns {{ _transform: string, _transformId: string, ids: string[], options: object }}
 */
export function alignTop(ids, options = {}) {
  return { _transform: "alignTop", _transformId: nextTransformId(), ids, options };
}

/**
 * Align all specified elements' bottom edges.
 * If `to` is provided, all bottom edges are set to that value.
 * Otherwise, all are set to the maximum bottom edge among them.
 *
 * @param {string[]} ids - Array of element IDs to align
 * @param {object} [options={}]
 * @param {number} [options.to] - Explicit anchor value for alignment
 * @returns {{ _transform: string, _transformId: string, ids: string[], options: object }}
 */
export function alignBottom(ids, options = {}) {
  return { _transform: "alignBottom", _transformId: nextTransformId(), ids, options };
}

/**
 * Align all specified elements' horizontal centers.
 * If `to` is provided, all horizontal centers are set to that value.
 * Otherwise, all are set to the average horizontal center among them.
 *
 * @param {string[]} ids - Array of element IDs to align
 * @param {object} [options={}]
 * @param {number} [options.to] - Explicit anchor value for alignment
 * @returns {{ _transform: string, _transformId: string, ids: string[], options: object }}
 */
export function alignCenterH(ids, options = {}) {
  return { _transform: "alignCenterH", _transformId: nextTransformId(), ids, options };
}

/**
 * Align all specified elements' vertical centers.
 * If `to` is provided, all vertical centers are set to that value.
 * Otherwise, all are set to the average vertical center among them.
 *
 * @param {string[]} ids - Array of element IDs to align
 * @param {object} [options={}]
 * @param {number} [options.to] - Explicit anchor value for alignment
 * @returns {{ _transform: string, _transformId: string, ids: string[], options: object }}
 */
export function alignCenterV(ids, options = {}) {
  return { _transform: "alignCenterV", _transformId: nextTransformId(), ids, options };
}

/**
 * Distribute elements horizontally with equal spacing.
 *
 * @param {string[]} ids - Array of element IDs to distribute
 * @param {object} [options={}]
 * @param {number} [options.startX] - Start X position (default: leftmost element's left edge)
 * @param {number} [options.endX] - End X position (default: rightmost element's right edge)
 * @param {string} [options.mode="equal-gap"] - Distribution mode: "equal-gap" or "equal-center"
 * @returns {{ _transform: string, _transformId: string, ids: string[], options: object }}
 */
export function distributeH(ids, options = {}) {
  return { _transform: "distributeH", _transformId: nextTransformId(), ids, options: { mode: "equal-gap", ...options } };
}

/**
 * Distribute elements vertically with equal spacing.
 *
 * @param {string[]} ids - Array of element IDs to distribute
 * @param {object} [options={}]
 * @param {number} [options.startY] - Start Y position (default: topmost element's top edge)
 * @param {number} [options.endY] - End Y position (default: bottommost element's bottom edge)
 * @param {string} [options.mode="equal-gap"] - Distribution mode: "equal-gap" or "equal-center"
 * @returns {{ _transform: string, _transformId: string, ids: string[], options: object }}
 */
export function distributeV(ids, options = {}) {
  return { _transform: "distributeV", _transformId: nextTransformId(), ids, options: { mode: "equal-gap", ...options } };
}

/**
 * Match the width of all specified elements to the widest.
 *
 * @param {string[]} ids - Array of element IDs
 * @returns {{ _transform: string, _transformId: string, ids: string[], options: object }}
 */
export function matchWidth(ids) {
  return { _transform: "matchWidth", _transformId: nextTransformId(), ids, options: {} };
}

/**
 * Match the height of all specified elements to the tallest.
 *
 * @param {string[]} ids - Array of element IDs
 * @returns {{ _transform: string, _transformId: string, ids: string[], options: object }}
 */
export function matchHeight(ids) {
  return { _transform: "matchHeight", _transformId: nextTransformId(), ids, options: {} };
}

/**
 * Match both width and height of all specified elements to the largest.
 *
 * @param {string[]} ids - Array of element IDs
 * @returns {{ _transform: string, _transformId: string, ids: string[], options: object }}
 */
export function matchSize(ids) {
  return { _transform: "matchSize", _transformId: nextTransformId(), ids, options: {} };
}

/**
 * Fit a group of elements into a bounding rectangle, preserving aspect ratio.
 *
 * 1. Computes the bounding box of all specified elements
 * 2. Computes a uniform scale factor to fit into `rect` (preserving aspect ratio)
 * 3. Scales and translates all elements to fit within `rect`
 *
 * @param {string[]} ids - Array of element IDs
 * @param {{ x: number, y: number, w: number, h: number }} rectParam - Target rectangle
 * @returns {{ _transform: string, _transformId: string, ids: string[], options: object }}
 */
export function fitToRect(ids, rectParam) {
  return { _transform: "fitToRect", _transformId: nextTransformId(), ids, options: { rect: rectParam } };
}

/**
 * Apply a single transform to the resolved bounds map.
 * Modifies resolvedBounds in place.
 * Returns an array of warning objects (empty if none).
 *
 * @param {object} transform - A transform marker object
 * @param {Map<string, {x,y,w,h}>} resolvedBounds - Mutable bounds map
 * @param {Map<string, object>} flatMap - Element map for existence checking
 * @returns {Array} warnings
 */
export function applyTransform(transform, resolvedBounds, flatMap) {
  const transformWarnings = [];
  const type = transform._transform;
  const ids = transform.ids || [];
  const opts = transform.options || {};

  // Filter to valid IDs, warn about missing ones
  const validIds = [];
  for (const id of ids) {
    if (!resolvedBounds.has(id)) {
      transformWarnings.push({
        type: "transform_unknown_element",
        transform: type,
        transformId: transform._transformId,
        elementId: id,
        message: `Transform "${type}": element "${id}" not found in resolved layout — skipping`,
      });
    } else {
      validIds.push(id);
    }
  }

  if (validIds.length === 0) return transformWarnings;

  switch (type) {
    case "alignLeft": {
      const target = opts.to !== undefined
        ? opts.to
        : Math.min(...validIds.map(id => resolvedBounds.get(id).x));
      for (const id of validIds) {
        resolvedBounds.get(id).x = target;
      }
      break;
    }

    case "alignRight": {
      const target = opts.to !== undefined
        ? opts.to
        : Math.max(...validIds.map(id => {
            const b = resolvedBounds.get(id);
            return b.x + b.w;
          }));
      for (const id of validIds) {
        const b = resolvedBounds.get(id);
        b.x = target - b.w;
      }
      break;
    }

    case "alignTop": {
      const target = opts.to !== undefined
        ? opts.to
        : Math.min(...validIds.map(id => resolvedBounds.get(id).y));
      for (const id of validIds) {
        resolvedBounds.get(id).y = target;
      }
      break;
    }

    case "alignBottom": {
      const target = opts.to !== undefined
        ? opts.to
        : Math.max(...validIds.map(id => {
            const b = resolvedBounds.get(id);
            return b.y + b.h;
          }));
      for (const id of validIds) {
        const b = resolvedBounds.get(id);
        b.y = target - b.h;
      }
      break;
    }

    case "alignCenterH": {
      const target = opts.to !== undefined
        ? opts.to
        : validIds.reduce((sum, id) => {
            const b = resolvedBounds.get(id);
            return sum + (b.x + b.w / 2);
          }, 0) / validIds.length;
      for (const id of validIds) {
        const b = resolvedBounds.get(id);
        b.x = target - b.w / 2;
      }
      break;
    }

    case "alignCenterV": {
      const target = opts.to !== undefined
        ? opts.to
        : validIds.reduce((sum, id) => {
            const b = resolvedBounds.get(id);
            return sum + (b.y + b.h / 2);
          }, 0) / validIds.length;
      for (const id of validIds) {
        const b = resolvedBounds.get(id);
        b.y = target - b.h / 2;
      }
      break;
    }

    case "distributeH": {
      if (validIds.length < 2) break; // Need at least 2 elements to distribute

      // Sort elements by their current x position (left edge)
      const sorted = [...validIds].sort((a, b) =>
        resolvedBounds.get(a).x - resolvedBounds.get(b).x
      );

      const mode = opts.mode || "equal-gap";

      // Determine startX and endX — defaults depend on mode
      const firstBounds = resolvedBounds.get(sorted[0]);
      const lastBounds = resolvedBounds.get(sorted[sorted.length - 1]);

      if (mode === "equal-gap") {
        const startX = opts.startX !== undefined ? opts.startX : firstBounds.x;
        const endX = opts.endX !== undefined ? opts.endX : lastBounds.x + lastBounds.w;
        // total gap = (endX - startX) - sum(widths), divide by (n-1)
        const totalWidth = sorted.reduce((sum, id) => sum + resolvedBounds.get(id).w, 0);
        const totalGap = (endX - startX) - totalWidth;
        const gapBetween = totalGap / (sorted.length - 1);

        let curX = startX;
        for (const id of sorted) {
          const b = resolvedBounds.get(id);
          b.x = curX;
          curX += b.w + gapBetween;
        }
      } else if (mode === "equal-center") {
        // For equal-center, default start/end are element centers (not edges)
        const startX = opts.startX !== undefined
          ? opts.startX
          : firstBounds.x + firstBounds.w / 2;
        const endX = opts.endX !== undefined
          ? opts.endX
          : lastBounds.x + lastBounds.w / 2;
        // center spacing = (endX - startX) / (n-1)
        // Place each element's center at startX + i * spacing
        const spacing = (endX - startX) / (sorted.length - 1);
        for (let i = 0; i < sorted.length; i++) {
          const b = resolvedBounds.get(sorted[i]);
          b.x = startX + i * spacing - b.w / 2;
        }
      }
      break;
    }

    case "distributeV": {
      if (validIds.length < 2) break;

      // Sort elements by their current y position (top edge)
      const sorted = [...validIds].sort((a, b) =>
        resolvedBounds.get(a).y - resolvedBounds.get(b).y
      );

      const mode = opts.mode || "equal-gap";

      const firstBounds = resolvedBounds.get(sorted[0]);
      const lastBounds = resolvedBounds.get(sorted[sorted.length - 1]);

      if (mode === "equal-gap") {
        const startY = opts.startY !== undefined ? opts.startY : firstBounds.y;
        const endY = opts.endY !== undefined ? opts.endY : lastBounds.y + lastBounds.h;
        const totalHeight = sorted.reduce((sum, id) => sum + resolvedBounds.get(id).h, 0);
        const totalGap = (endY - startY) - totalHeight;
        const gapBetween = totalGap / (sorted.length - 1);

        let curY = startY;
        for (const id of sorted) {
          const b = resolvedBounds.get(id);
          b.y = curY;
          curY += b.h + gapBetween;
        }
      } else if (mode === "equal-center") {
        // For equal-center, default start/end are element centers (not edges)
        const startY = opts.startY !== undefined
          ? opts.startY
          : firstBounds.y + firstBounds.h / 2;
        const endY = opts.endY !== undefined
          ? opts.endY
          : lastBounds.y + lastBounds.h / 2;
        const spacing = (endY - startY) / (sorted.length - 1);
        for (let i = 0; i < sorted.length; i++) {
          const b = resolvedBounds.get(sorted[i]);
          b.y = startY + i * spacing - b.h / 2;
        }
      }
      break;
    }

    case "matchWidth": {
      const maxW = Math.max(...validIds.map(id => resolvedBounds.get(id).w));
      for (const id of validIds) {
        resolvedBounds.get(id).w = maxW;
      }
      break;
    }

    case "matchHeight": {
      const maxH = Math.max(...validIds.map(id => resolvedBounds.get(id).h));
      for (const id of validIds) {
        resolvedBounds.get(id).h = maxH;
      }
      break;
    }

    case "matchSize": {
      const maxW = Math.max(...validIds.map(id => resolvedBounds.get(id).w));
      const maxH = Math.max(...validIds.map(id => resolvedBounds.get(id).h));
      for (const id of validIds) {
        const b = resolvedBounds.get(id);
        b.w = maxW;
        b.h = maxH;
      }
      break;
    }

    case "fitToRect": {
      const targetRect = opts.rect;
      if (!targetRect || targetRect.w <= 0 || targetRect.h <= 0) {
        transformWarnings.push({
          type: "transform_invalid_rect",
          transform: type,
          transformId: transform._transformId,
          message: `fitToRect: invalid target rect`,
        });
        break;
      }

      // 1. Compute bounding box of all specified elements
      let minX = Infinity, minY = Infinity;
      let maxX = -Infinity, maxY = -Infinity;
      for (const id of validIds) {
        const b = resolvedBounds.get(id);
        minX = Math.min(minX, b.x);
        minY = Math.min(minY, b.y);
        maxX = Math.max(maxX, b.x + b.w);
        maxY = Math.max(maxY, b.y + b.h);
      }
      const bbW = maxX - minX;
      const bbH = maxY - minY;

      if (bbW <= 0 || bbH <= 0) break;

      // 2. Compute scale factor (preserve aspect ratio — use the smaller scale)
      const scaleX = targetRect.w / bbW;
      const scaleY = targetRect.h / bbH;
      const scale = Math.min(scaleX, scaleY);

      // 3. Compute the offset to center the scaled bounding box within the target rect
      const scaledW = bbW * scale;
      const scaledH = bbH * scale;
      const offsetX = targetRect.x + (targetRect.w - scaledW) / 2;
      const offsetY = targetRect.y + (targetRect.h - scaledH) / 2;

      // 4. Apply scale and translate to all elements
      for (const id of validIds) {
        const b = resolvedBounds.get(id);
        b.x = offsetX + (b.x - minX) * scale;
        b.y = offsetY + (b.y - minY) * scale;
        b.w = b.w * scale;
        b.h = b.h * scale;
      }
      break;
    }

    default:
      transformWarnings.push({
        type: "unknown_transform",
        transform: type,
        transformId: transform._transformId,
        message: `Unknown transform type: "${type}"`,
      });
      break;
  }

  return transformWarnings;
}

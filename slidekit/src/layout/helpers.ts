// Pure helper functions extracted from layout.js
// This is a leaf module — only imports types from the parent module.

import type { RelMarker, Rect, SlideElement, FlattenResult, Provenance } from "../types.js";

/**
 * Check if a value is a relative positioning marker object.
 * Acts as a TypeScript type guard, narrowing to `RelMarker`.
 */
export function isRelMarker(value: unknown): value is RelMarker {
  return value !== null && typeof value === "object" && typeof (value as Record<string, unknown>)._rel === "string";
}

/**
 * Deep clone an object (for preserving authored specs).
 * Uses structuredClone if available, otherwise JSON round-trip.
 *
 * @param {*} obj
 * @returns {*}
 */
export function deepClone<T>(obj: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(obj);
  }
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Flatten all elements from a slide definition into a flat map by ID.
 * Recursively traverses groups and stacks to extract children.
 * Returns { flatMap, groupParent, stackParent, stackChildren, groupChildren, panelInternals }
 *
 * @param {Array} elements - Slide elements array
 * @returns {{
 *   flatMap: Map<string, object>,
 *   groupParent: Map<string, string>,
 *   stackParent: Map<string, string>,
 *   stackChildren: Map<string, string[]>,
 *   groupChildren: Map<string, string[]>,
 *   panelInternals: Set<string>
 * }}
 */
export function flattenElements(elements: SlideElement[]): FlattenResult {
  const flatMap = new Map<string, SlideElement>();
  const groupParent = new Map<string, string>();
  const stackParent = new Map<string, string>();   // childId -> stackId
  const stackChildren = new Map<string, string[]>(); // stackId -> [childId, ...]
  const groupChildren = new Map<string, string[]>(); // groupId -> [childId, ...]
  const panelInternals = new Set<string>(); // IDs of synthetic panel elements (bgRect, childStack)
  const idCounts = new Map<string, number>(); // id -> occurrence count

  function walk(els: SlideElement[], parentGroupId: string | null): void {
    for (const el of els) {
      idCounts.set(el.id, (idCounts.get(el.id) || 0) + 1);
      flatMap.set(el.id, el);
      if (parentGroupId) {
        groupParent.set(el.id, parentGroupId);
      }
      if (el.type === "group" && el.children) {
        const childIds = el.children.map((c: SlideElement) => c.id);
        groupChildren.set(el.id, childIds);
        // If this group is a panel compound, mark bgRect and childStack as internal
        if (el._compound === "panel" && el.children.length >= 2) {
          panelInternals.add(el.children[0].id); // bgRect
          panelInternals.add(el.children[1].id); // childStack
        }
        // If this group is a figure compound, mark bg and img as internal
        if (el._compound === "figure" && el.children.length >= 2) {
          panelInternals.add(el.children[0].id); // bgRect
          panelInternals.add(el.children[1].id); // img
        }
        walk(el.children, el.id);
      }
      if ((el.type === "vstack" || el.type === "hstack") && el.children) {
        const childIds = [];
        for (const child of el.children) {
          flatMap.set(child.id, child);
          stackParent.set(child.id, el.id);
          childIds.push(child.id);
          // Recursively walk into nested stacks and groups using the same
          // walk function — avoids redundant flattenElements([child]) call.
          // Preserve parentGroupId so nested stacks inside groups retain
          // their group ancestry chain.
          if ((child.type === "vstack" || child.type === "hstack") && child.children) {
            walk([child], parentGroupId);
          } else if (child.type === "group" && child.children) {
            // Record group children and panel internals before recursing,
            // since walk(child.children, ...) doesn't re-process the group node itself.
            const gcIds = child.children.map((c: SlideElement) => c.id);
            groupChildren.set(child.id, gcIds);
            if (child._compound === "panel" && child.children.length >= 2) {
              panelInternals.add(child.children[0].id);
              panelInternals.add(child.children[1].id);
            }
            if (child._compound === "figure" && child.children.length >= 2) {
              panelInternals.add(child.children[0].id);
              panelInternals.add(child.children[1].id);
            }
            walk(child.children, child.id);
          }
        }
        stackChildren.set(el.id, childIds);
      }
    }
  }

  walk(elements, null);

  // Build duplicate IDs map (only IDs that appear more than once)
  const duplicateIds = new Map<string, number>();
  for (const [id, count] of idCounts) {
    if (count > 1) duplicateIds.set(id, count);
  }

  return { flatMap, groupParent, stackParent, stackChildren, groupChildren, panelInternals, duplicateIds };
}

/**
 * Extract the ref ID from a _rel marker (for dependency graph building).
 *
 * @param {object} marker - A _rel marker object
 * @returns {string|null} The referenced element ID, or null if none
 */
export function getRelRef(marker: unknown): string | null {
  if (!isRelMarker(marker)) return null;
  // centerIn references a rect, not an element
  if (marker._rel === "centerIn") return null;
  return marker.ref || null;
}

/**
 * Resolve a single _rel marker to an absolute coordinate value.
 *
 * @param {object} marker - The _rel marker
 * @param {string} axis - "x" or "y"
 * @param {object} refBounds - The referenced element's resolved bounds { x, y, w, h }
 * @param {number} ownW - The current element's width
 * @param {number} ownH - The current element's height
 * @returns {number} The resolved absolute coordinate
 */
export function resolveRelMarker(marker: RelMarker, axis: "x" | "y", refBounds: Rect, ownW: number, ownH: number): number {
  const rel = marker._rel;
  const gap = marker.gap ?? 0;

  switch (rel) {
    case "below":
      // Y = ref's bottom edge + gap
      return refBounds.y + refBounds.h + gap;

    case "above":
      // Y = ref's top edge - own height - gap
      return refBounds.y - ownH - gap;

    case "rightOf":
      // X = ref's right edge + gap
      return refBounds.x + refBounds.w + gap;

    case "leftOf":
      // X = ref's left edge - own width - gap
      return refBounds.x - ownW - gap;

    case "centerV":
      // Center vertically with ref: align midpoints
      return refBounds.y + refBounds.h / 2 - ownH / 2;

    case "centerH":
      // Center horizontally with ref: align midpoints
      return refBounds.x + refBounds.w / 2 - ownW / 2;

    case "alignTop":
      // Y = ref's top edge
      return refBounds.y;

    case "alignBottom":
      // Y = ref's bottom edge - own height
      return refBounds.y + refBounds.h - ownH;

    case "alignLeft":
      // X = ref's left edge
      return refBounds.x;

    case "alignRight":
      // X = ref's right edge - own width
      return refBounds.x + refBounds.w - ownW;

    case "centerIn": {
      // Center within a rectangle
      const r = marker.rect!;
      if (axis === "x") {
        return r.x + r.w / 2 - ownW / 2;
      } else {
        return r.y + r.h / 2 - ownH / 2;
      }
    }

    default:
      throw new Error(`Unknown _rel type: "${rel}"`);
  }
}

/** Anchor pairs [sourceAnchor, targetAnchor] for each constraint type. */
const _CONSTRAINT_ANCHORS: Record<string, [string, string]> = {
  below:       ["bc", "tc"],
  above:       ["tc", "bc"],
  rightOf:     ["cr", "cl"],
  leftOf:      ["cl", "cr"],
  centerV:     ["cc", "cc"],
  centerH:     ["cc", "cc"],
  alignTop:    ["tc", "tc"],
  alignBottom: ["bc", "bc"],
  alignLeft:   ["cl", "cl"],
  alignRight:  ["cr", "cr"],
  centerIn:    ["cc", "cc"],
  between:     ["bc", "cc"],
};

/**
 * Determine provenance source for a resolved value.
 *
 * @param {*} authoredValue - The original authored value for this property
 * @param {string} prop - Property name (x, y, w, h)
 * @param {object} element - The element
 * @param {boolean} wasMeasured - Whether this dimension was measured
 * @returns {object} Provenance metadata
 */
export function buildProvenance(authoredValue: unknown, prop: string, element: SlideElement, wasMeasured: boolean): Provenance {
  if (isRelMarker(authoredValue)) {
    const prov: Provenance = { source: "constraint", type: authoredValue._rel };
    if (authoredValue.ref) prov.ref = authoredValue.ref;
    if (authoredValue.ref2 !== undefined) prov.ref2 = authoredValue.ref2;
    if (authoredValue.gap !== undefined) prov.gap = authoredValue.gap;
    if (authoredValue.bias !== undefined) prov.bias = authoredValue.bias;
    if (authoredValue.rect) prov.rect = authoredValue.rect;

    // Record anchor points for debug relationship arrows
    const anchors = _CONSTRAINT_ANCHORS[authoredValue._rel];
    if (anchors) {
      prov.sourceAnchor = anchors[0];
      prov.targetAnchor = anchors[1];
    }

    return prov;
  }
  if (wasMeasured && (prop === "w" || prop === "h")) {
    return {
      source: "measured",
      measuredAt: {
        w: element.props?.w ?? null,
        className: element.props?.className || "",
      },
    };
  }
  return { source: "authored", value: authoredValue };
}

/**
 * Compute AABB (Axis-Aligned Bounding Box) intersection between two rectangles.
 * Returns null if no intersection, or the intersection rectangle if they overlap.
 *
 * @param {{ x: number, y: number, w: number, h: number }} a
 * @param {{ x: number, y: number, w: number, h: number }} b
 * @returns {{ x: number, y: number, w: number, h: number }|null}
 */
export function computeAABBIntersection(a: Rect, b: Rect): Rect | null {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.w, b.x + b.w);
  const y2 = Math.min(a.y + a.h, b.y + b.h);

  const w = x2 - x1;
  const h = y2 - y1;

  if (w > 0 && h > 0) {
    return { x: x1, y: y1, w, h };
  }
  return null;
}

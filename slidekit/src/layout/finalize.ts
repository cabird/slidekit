// Phase 4: Finalize — extracted from layout.js
// Handles: provenance, scene graph, connector endpoints, collision detection,
// presentation validations, and final warnings.

import { state } from '../state.js';
import { getAnchorPoint } from '../compounds.js';
import { rotatedAABB } from '../utilities.js';
import { resolveSpacing } from '../spacing.js';
import { buildProvenance, computeAABBIntersection } from './helpers.js';
import { mustGet } from '../assertions.js';
import { isPanelElement } from '../types.js';
import { routeConnector } from '../connectorRouting.js';
import type { SlideElement, Rect, Point, AnchorPointResult, ResolvedSize, TransformMarker, AuthoredSpec, LayoutResult, SceneElement, Provenance, ElementType, ConnectorType, ArrowType, ConnectorResolvedPath, ConnectorResolvedLabel } from '../types.js';

/**
 * Resolve a CSS color string to a concrete value if possible. Handles
 * `var(--name)` (and `var(--name, fallback)`) by looking up the custom
 * property on `document.documentElement`. Any other input (hex, rgb, named
 * color) is returned unchanged. Safe to call in non-browser environments.
 */
function resolveCssColor(input: string): string {
  if (!input) return input;
  const trimmed = input.trim();
  if (!trimmed.startsWith('var(')) return trimmed;
  if (typeof document === 'undefined') return trimmed;
  // Parse var(--name) or var(--name, fallback)
  const inner = trimmed.slice(4, -1); // strip "var(" and ")"
  const commaIdx = inner.indexOf(',');
  const name = (commaIdx === -1 ? inner : inner.slice(0, commaIdx)).trim();
  const fallback = commaIdx === -1 ? '' : inner.slice(commaIdx + 1).trim();
  try {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    if (value) return value;
  } catch {
    // ignore
  }
  return fallback || trimmed;
}

/**
 * Find a point at a given fraction (0–1) along a polyline's total arc length.
 * Used for resolving label placement along elbow/orthogonal connector routes.
 */
function pointAlongPolyline(points: Point[], t: number): Point {
  if (points.length < 2) return points[0] || { x: 0, y: 0 };
  const segLengths: number[] = [];
  let totalLength = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const dx = points[i + 1].x - points[i].x;
    const dy = points[i + 1].y - points[i].y;
    const len = Math.sqrt(dx * dx + dy * dy);
    segLengths.push(len);
    totalLength += len;
  }
  if (totalLength === 0) return points[0];
  const targetLength = t * totalLength;
  let accumulated = 0;
  for (let i = 0; i < segLengths.length; i++) {
    if (accumulated + segLengths[i] >= targetLength) {
      const segFraction = segLengths[i] > 0 ? (targetLength - accumulated) / segLengths[i] : 0;
      return {
        x: points[i].x + (points[i + 1].x - points[i].x) * segFraction,
        y: points[i].y + (points[i + 1].y - points[i].y) * segFraction,
      };
    }
    accumulated += segLengths[i];
  }
  return points[points.length - 1];
}

/** Return the endpoints of the segment that contains fraction `t`. */
function segmentAtFraction(points: Point[], t: number): { p1: Point; p2: Point } | null {
  if (points.length < 2) return null;
  const segLengths: number[] = [];
  let totalLength = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const dx = points[i + 1].x - points[i].x;
    const dy = points[i + 1].y - points[i].y;
    segLengths.push(Math.sqrt(dx * dx + dy * dy));
    totalLength += segLengths[i];
  }
  if (totalLength === 0) return null;
  const targetLength = t * totalLength;
  let accumulated = 0;
  for (let i = 0; i < segLengths.length; i++) {
    if (accumulated + segLengths[i] >= targetLength) {
      return { p1: points[i], p2: points[i + 1] };
    }
    accumulated += segLengths[i];
  }
  return { p1: points[points.length - 2], p2: points[points.length - 1] };
}

/**
 * Compute the exact axis-aligned bounding box of a cubic Bezier curve.
 * Cubic Beziers can extend beyond their control polygon, so bounding by
 * the hull of {P0, P1, P2, P3} is only an approximation. This finds all
 * real roots of `B'(t) = 0` in [0, 1] per axis and includes those extrema
 * alongside the endpoints.
 */
function cubicBezierBBox(
  p0: Point, p1: Point, p2: Point, p3: Point,
): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Math.min(p0.x, p3.x);
  let maxX = Math.max(p0.x, p3.x);
  let minY = Math.min(p0.y, p3.y);
  let maxY = Math.max(p0.y, p3.y);

  // Derivative of a cubic Bezier is quadratic:
  //   B'(t) = 3(1-t)^2 (P1-P0) + 6(1-t)t (P2-P1) + 3t^2 (P3-P2)
  // Expanding and grouping: a*t^2 + b*t + c = 0 with
  //   a = 3*(P3 - 3*P2 + 3*P1 - P0)
  //   b = 6*(P2 - 2*P1 + P0)
  //   c = 3*(P1 - P0)
  const extremaForAxis = (v0: number, v1: number, v2: number, v3: number): number[] => {
    const a = 3 * (v3 - 3 * v2 + 3 * v1 - v0);
    const b = 6 * (v2 - 2 * v1 + v0);
    const c = 3 * (v1 - v0);
    const ts: number[] = [];
    if (Math.abs(a) < 1e-9) {
      // Linear: b*t + c = 0
      if (Math.abs(b) > 1e-9) {
        const t = -c / b;
        if (t > 0 && t < 1) ts.push(t);
      }
      return ts;
    }
    const disc = b * b - 4 * a * c;
    if (disc < 0) return ts;
    const sq = Math.sqrt(disc);
    const t1 = (-b + sq) / (2 * a);
    const t2 = (-b - sq) / (2 * a);
    if (t1 > 0 && t1 < 1) ts.push(t1);
    if (t2 > 0 && t2 < 1) ts.push(t2);
    return ts;
  };
  const evalCubic = (v0: number, v1: number, v2: number, v3: number, t: number): number => {
    const mt = 1 - t;
    return mt * mt * mt * v0 + 3 * mt * mt * t * v1 + 3 * mt * t * t * v2 + t * t * t * v3;
  };

  for (const t of extremaForAxis(p0.x, p1.x, p2.x, p3.x)) {
    const x = evalCubic(p0.x, p1.x, p2.x, p3.x, t);
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
  }
  for (const t of extremaForAxis(p0.y, p1.y, p2.y, p3.y)) {
    const y = evalCubic(p0.y, p1.y, p2.y, p3.y, t);
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY };
}

/** Context passed from earlier layout phases into finalize. */
interface FinalizeContext {
  sortedOrder: string[];
  flatMap: Map<string, SlideElement>;
  authoredSpecs: Map<string, AuthoredSpec>;
  resolvedBounds: Map<string, Rect>;
  resolvedSizes: Map<string, ResolvedSize>;
  stackParent: Map<string, string>;
  stackChildren: Map<string, string[]>;
  groupParent: Map<string, string>;
  groupChildren: Map<string, string[]>;
  panelInternals: Set<string>;
  preTransformBounds: Map<string, Rect>;
  resolvedTransforms: TransformMarker[];
  warnings: Array<Record<string, unknown>>;
  errors: Array<Record<string, unknown>>;
  collisionThreshold: number;
}

/**
 * Phase 4: Finalize the layout pipeline.
 *
 * Builds provenance metadata, scene graph, resolves connector endpoints,
 * runs collision detection, and performs presentation-specific validations.
 *
 * @param ctx - Context from earlier phases
 * @returns Final scene: { elements, rootIds, transforms, warnings, errors, collisions }
 */
export function finalize({
  sortedOrder,
  flatMap,
  authoredSpecs,
  resolvedBounds,
  resolvedSizes,
  stackParent,
  stackChildren,
  groupParent,
  groupChildren,
  panelInternals,
  preTransformBounds,
  resolvedTransforms,
  warnings,
  errors,
  collisionThreshold,
}: FinalizeContext): LayoutResult {
  // Build provenance metadata and scene graph
  const sceneElements: Record<string, SceneElement> = {};

  for (const id of sortedOrder) {
    const el = mustGet(flatMap, id, `flatMap missing element: ${id}`);
    const authored = mustGet(authoredSpecs, id, `authoredSpecs missing element: ${id}`);
    const bounds = mustGet(resolvedBounds, id, `resolvedBounds missing element: ${id}`);
    const sizes = mustGet(resolvedSizes, id, `resolvedSizes missing element: ${id}`);

    // Build provenance for each dimension
    // Stack children get provenance source: "stack"
    let provenance: { x: Provenance; y: Provenance; w: Provenance; h: Provenance };
    if (stackParent.has(id)) {
      const parentStackId = mustGet(stackParent, id, `stackParent missing child: ${id}`);
      provenance = {
        x: { source: "stack", stackId: parentStackId, sourceAnchor: "cc", targetAnchor: "cl" } as Provenance,
        y: { source: "stack", stackId: parentStackId, sourceAnchor: "cc", targetAnchor: "cl" } as Provenance,
        w: buildProvenance(authored.props.w, "w", el, sizes.wMeasured),
        h: buildProvenance(authored.props.h, "h", el, sizes.hMeasured),
      };
    } else {
      provenance = {
        x: buildProvenance(authored.props.x, "x", el, false),
        y: buildProvenance(authored.props.y, "y", el, false),
        w: buildProvenance(authored.props.w, "w", el, sizes.wMeasured),
        h: buildProvenance(authored.props.h, "h", el, sizes.hMeasured),
      };
    }

    // M6: Override provenance per-axis for elements affected by transforms.
    // Only mark axes where the value actually changed.
    const preBounds = preTransformBounds.get(id);
    if (preBounds) {
      if (bounds.x !== preBounds.x) {
        provenance.x = { source: "transform", original: provenance.x } as Provenance;
      }
      if (bounds.y !== preBounds.y) {
        provenance.y = { source: "transform", original: provenance.y } as Provenance;
      }
      if (bounds.w !== preBounds.w) {
        provenance.w = { source: "transform", original: provenance.w } as Provenance;
      }
      if (bounds.h !== preBounds.h) {
        provenance.h = { source: "transform", original: provenance.h } as Provenance;
      }
    }

    // Determine parentId: group parent takes precedence, then stack parent.
    // Use ?? (nullish coalescing) to avoid dropping falsy-but-valid IDs.
    const parentId = (groupParent.get(id) ?? stackParent.get(id)) ?? null;

    // Determine children array (ordered)
    let children: string[] = [];
    if (el.type === "group" && groupChildren.has(id)) {
      children = mustGet(groupChildren, id, `groupChildren missing group: ${id}`);
    } else if ((el.type === "vstack" || el.type === "hstack") && stackChildren.has(id)) {
      children = mustGet(stackChildren, id, `stackChildren missing stack: ${id}`);
    }

    // Compute localResolved (position relative to parent)
    let localResolved;
    if (!parentId) {
      // Root element: local = absolute
      localResolved = { ...bounds };
    } else if (groupParent.has(id)) {
      // Group child: resolved is already group-relative
      localResolved = { ...bounds };
    } else {
      // Stack child: resolved is absolute; subtract stack's position
      const stackBounds = resolvedBounds.get(parentId);
      if (stackBounds) {
        localResolved = {
          x: bounds.x - stackBounds.x,
          y: bounds.y - stackBounds.y,
          w: bounds.w,
          h: bounds.h,
        };
      } else {
        localResolved = { ...bounds };
      }
    }

    sceneElements[id] = {
      id,
      type: el.type,
      authored: authored,
      resolved: { ...bounds },
      localResolved,
      parentId,
      children,
      _internal: panelInternals.has(id),
      provenance,
    };

    // Export panel child positions in scene model
    if ('_compound' in el && el._compound === 'panel' && 'children' in el && el.children) {
      sceneElements[id].panelChildren = el.children.map((child: SlideElement) => {
        const childBounds = resolvedBounds.get(child.id);
        return {
          id: child.id,
          type: child.type as ElementType,
          ...(childBounds || {})
        };
      });
    }

    // Store layout flags for rendering
    if (el._layoutFlags) {
      sceneElements[id]._layoutFlags = { ...el._layoutFlags };
    }
  }

  // Build rootIds: top-level elements with no parent
  const rootIds = [];
  for (const id of sortedOrder) {
    if (sceneElements[id] && sceneElements[id].parentId === null) {
      rootIds.push(id);
    }
  }

  // =========================================================================
  // Resolve Connector Endpoints (M7.2)
  // =========================================================================
  // After all positions are resolved, compute connection points for connectors.

  // Helper: compute absolute (slide-level) bounds for an element by walking
  // up the group/stack parent ancestry chain.
  function absoluteBoundsOf(id: string): Rect | null {
    const bounds = resolvedBounds.get(id);
    if (!bounds) return null;
    let offsetX = 0, offsetY = 0;
    let current = id;
    while (true) {
      const gp = groupParent.get(current);
      if (gp) {
        const gpBounds = resolvedBounds.get(gp);
        if (gpBounds) {
          offsetX += gpBounds.x;
          offsetY += gpBounds.y;
        }
        current = gp;
        continue;
      }
      const sp = stackParent.get(current);
      if (sp) {
        current = sp;
        continue;
      }
      break;
    }
    return { x: bounds.x + offsetX, y: bounds.y + offsetY, w: bounds.w, h: bounds.h };
  }

  // Collect obstacle rects (all non-connector, non-bg-layer elements)
  const obstacleRects: Array<{ id: string; rect: Rect }> = [];
  for (const id of sortedOrder) {
    const el = mustGet(flatMap, id, `flatMap missing element: ${id}`);
    if (el.type === "connector") continue;
    // Skip stacks (their children are the real elements)
    if (el.type === "vstack" || el.type === "hstack") continue;
    // Skip internal panel parts
    if (panelInternals.has(id)) continue;
    // Skip background layer elements (full-bleed backgrounds shouldn't block routing)
    if (el.props.layer === "bg") continue;
    const bounds = resolvedBounds.get(id);
    if (!bounds || bounds.w <= 0 || bounds.h <= 0) continue;
    obstacleRects.push({ id, rect: bounds });
  }

  // First pass: resolve anchor points for all connectors and collect
  // port spreading groups (connectors sharing the same element+edge).
  interface ConnectorInfo {
    id: string;
    el: SlideElement;
    fromId: string;
    toId: string;
    fromAnchor: string;
    toAnchor: string;
    fromPt: AnchorPointResult;
    toPt: AnchorPointResult;
    fromBounds: Rect;
    toBounds: Rect;
  }
  const connectorInfos: ConnectorInfo[] = [];

  // Grouping key: elementId + edge (t/b/l/r derived from anchor)
  function anchorEdge(anchor: string): string {
    const row = anchor[0]; // t, c, b
    const col = anchor[1]; // l, c, r
    if (row === 't') return 'top';
    if (row === 'b') return 'bottom';
    if (col === 'l') return 'left';
    if (col === 'r') return 'right';
    return 'center'; // cc — no edge spreading
  }

  // Port group: connectors sharing the same (direction, elementId, edge).
  // We use a string map key for O(1) lookup, but the key is treated as
  // opaque — we never split it. The structured fields are stored on the
  // group itself so lookups are parse-free and robust to any character
  // (including ':') appearing in element IDs.
  type PortDirection = 'from' | 'to';
  type PortEdge = 'top' | 'bottom' | 'left' | 'right';
  interface PortGroup {
    direction: PortDirection;
    elementId: string;
    edge: PortEdge;
    entries: Array<{ idx: number; targetPt: Point; portOrder: number }>;
  }
  // Key uses a NUL separator so ordinary printable IDs cannot collide.
  const portGroupKey = (direction: PortDirection, elementId: string, edge: PortEdge): string =>
    `${direction}\x00${elementId}\x00${edge}`;
  const portGroups = new Map<string, PortGroup>();

  for (const id of sortedOrder) {
    const el = mustGet(flatMap, id, `flatMap missing element: ${id}`);
    if (el.type !== "connector") continue;

    const fromId = el.props.fromId;
    const toId = el.props.toId;
    if (fromId === toId) {
      warnings.push({
        type: "connector_self_reference",
        elementId: id,
        message: `Connector "${id}": fromId and toId are the same element ("${fromId}")`,
      });
      continue;
    }

    const fromBounds = absoluteBoundsOf(fromId);
    const toBounds = absoluteBoundsOf(toId);

    if (!fromBounds || !toBounds) {
      warnings.push({
        type: "connector_missing_endpoint",
        elementId: id,
        message: `Connector "${id}": could not resolve endpoints (from: "${fromId}", to: "${toId}")`,
      });
      continue;
    }

    const fromAnchor = el.props.fromAnchor || "cr";
    const toAnchor = el.props.toAnchor || "cl";

    const fromPt = getAnchorPoint(fromBounds, fromAnchor);
    const toPt = getAnchorPoint(toBounds, toAnchor);

    // For center anchors, compute direction toward the other endpoint
    if (fromPt.dx === 0 && fromPt.dy === 0) {
      const tdx = toPt.x - fromPt.x;
      const tdy = toPt.y - fromPt.y;
      if (Math.abs(tdx) >= Math.abs(tdy)) {
        fromPt.dx = tdx >= 0 ? 1 : -1;
      } else {
        fromPt.dy = tdy >= 0 ? 1 : -1;
      }
    }
    if (toPt.dx === 0 && toPt.dy === 0) {
      const tdx = fromPt.x - toPt.x;
      const tdy = fromPt.y - toPt.y;
      if (Math.abs(tdx) >= Math.abs(tdy)) {
        toPt.dx = tdx >= 0 ? 1 : -1;
      } else {
        toPt.dy = tdy >= 0 ? 1 : -1;
      }
    }

    const idx = connectorInfos.length;
    connectorInfos.push({ id, el, fromId, toId, fromAnchor, toAnchor, fromPt, toPt, fromBounds, toBounds });

    // Register in port groups for spreading
    const fromEdge = anchorEdge(fromAnchor);
    if (fromEdge !== 'center') {
      const edge = fromEdge as PortEdge;
      const key = portGroupKey('from', fromId, edge);
      let group = portGroups.get(key);
      if (!group) {
        group = { direction: 'from', elementId: fromId, edge, entries: [] };
        portGroups.set(key, group);
      }
      group.entries.push({
        idx,
        targetPt: { x: toPt.x, y: toPt.y },
        portOrder: (el.props.fromPortOrder as number) ?? 0,
      });
    }

    const toEdge = anchorEdge(toAnchor);
    if (toEdge !== 'center') {
      const edge = toEdge as PortEdge;
      const key = portGroupKey('to', toId, edge);
      let group = portGroups.get(key);
      if (!group) {
        group = { direction: 'to', elementId: toId, edge, entries: [] };
        portGroups.set(key, group);
      }
      group.entries.push({
        idx,
        targetPt: { x: fromPt.x, y: fromPt.y },
        portOrder: (el.props.toPortOrder as number) ?? 0,
      });
    }
  }

  // Apply port spreading: when multiple connectors share an edge, distribute
  // them along it. Sort by portOrder, then by target projection to avoid crossings.
  const DEFAULT_PORT_SPACING = 14; // px between spread ports
  const DEFAULT_EDGE_MARGIN = 8;   // px margin from edge corners

  for (const group of portGroups.values()) {
    const { direction, elementId, edge, entries } = group;
    const isHorizontalEdge = edge === 'top' || edge === 'bottom';

    // For single-connector groups, only apply if there's an explicit offset
    if (entries.length <= 1) {
      if (entries.length === 1) {
        const info = connectorInfos[entries[0].idx];
        const explicitOffset = direction === 'from'
          ? (info.el.props.fromPortOffset as number | undefined)
          : (info.el.props.toPortOffset as number | undefined);
        if (explicitOffset !== undefined) {
          if (direction === 'from') {
            if (isHorizontalEdge) info.fromPt.x += explicitOffset;
            else info.fromPt.y += explicitOffset;
          } else {
            if (isHorizontalEdge) info.toPt.x += explicitOffset;
            else info.toPt.y += explicitOffset;
          }
        }
      }
      continue;
    }

    const bounds = resolvedBounds.get(elementId);
    if (!bounds) continue;

    // Per-element port spreading overrides
    const targetEl = flatMap.get(elementId);
    const PORT_SPACING = (targetEl?.props.portSpacing as number) ?? DEFAULT_PORT_SPACING;
    const EDGE_MARGIN = (targetEl?.props.edgeMargin as number) ?? DEFAULT_EDGE_MARGIN;

    // Sort by (portOrder, target projection along edge tangent)
    entries.sort((a, b) => {
      if (a.portOrder !== b.portOrder) return a.portOrder - b.portOrder;
      // Sort by target projection to avoid crossings
      return isHorizontalEdge
        ? a.targetPt.x - b.targetPt.x
        : a.targetPt.y - b.targetPt.y;
    });

    // Compute available edge span and spacing
    const edgeLength = isHorizontalEdge ? bounds.w : bounds.h;
    const usable = edgeLength - 2 * EDGE_MARGIN;
    const totalSpread = (entries.length - 1) * PORT_SPACING;
    const spacing = totalSpread > usable
      ? usable / (entries.length - 1)
      : PORT_SPACING;

    const startOffset = -((entries.length - 1) * spacing / 2);

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const info = connectorInfos[entry.idx];
      const offset = startOffset + i * spacing;

      // Check for explicit pixel offset override
      const explicitOffset = direction === 'from'
        ? (info.el.props.fromPortOffset as number | undefined)
        : (info.el.props.toPortOffset as number | undefined);

      const appliedOffset = explicitOffset ?? offset;

      // Apply offset to the anchor point along the edge tangent
      if (direction === 'from') {
        if (isHorizontalEdge) {
          info.fromPt.x += appliedOffset;
        } else {
          info.fromPt.y += appliedOffset;
        }
      } else {
        if (isHorizontalEdge) {
          info.toPt.x += appliedOffset;
        } else {
          info.toPt.y += appliedOffset;
        }
      }
    }
  }

  // Second pass: route connectors with obstacles and cache waypoints
  for (const info of connectorInfos) {
    const { id, el, fromId, toId, fromAnchor, toAnchor, fromPt, toPt } = info;

    // Build obstacle list excluding the connector's own from/to elements
    // Only include obstacles that are within a reasonable bounding region
    // of the connector's path (expanded by a margin). Far-away elements
    // on the slide shouldn't affect routing.
    const margin = (el.props.obstacleMargin as number) ?? 200;
    const pathMinX = Math.min(fromPt.x, toPt.x) - margin;
    const pathMaxX = Math.max(fromPt.x, toPt.x) + margin;
    const pathMinY = Math.min(fromPt.y, toPt.y) - margin;
    const pathMaxY = Math.max(fromPt.y, toPt.y) + margin;

    const obstacles: Rect[] = [];
    for (const obs of obstacleRects) {
      if (obs.id === fromId || obs.id === toId) continue;
      // Skip obstacles completely outside the connector's region
      const r = obs.rect;
      if (r.x + r.w < pathMinX || r.x > pathMaxX) continue;
      if (r.y + r.h < pathMinY || r.y > pathMaxY) continue;
      obstacles.push(r);
    }

    // Route with obstacles for elbow and orthogonal connectors
    const connType = el.props.connectorType || 'straight';
    let waypoints: Point[] | undefined;
    if (connType === 'elbow' || connType === 'orthogonal') {
      // Stub length must clear the arrowhead so the path straightens out
      // before entering the marker. Marker is 8×8 in viewBox 0-10 and
      // scales with strokeWidth (SVG default markerUnits="strokeWidth").
      // Also account for cornerRadius which trims into the stub.
      const thickness = (el.props.thickness as number) ?? 2;
      const cornerRadius = (el.props.cornerRadius as number) ?? 0;
      const stubLength = Math.max(40, 8 * thickness + cornerRadius + 15);
      const route = routeConnector({
        from: fromPt, to: toPt, obstacles,
        orthogonal: connType === 'orthogonal',
        stubLength,
      });
      waypoints = route.waypoints;
    }

    // Compute connector bounds
    let connMinX = Math.min(fromPt.x, toPt.x);
    let connMinY = Math.min(fromPt.y, toPt.y);
    let connMaxX = Math.max(fromPt.x, toPt.x);
    let connMaxY = Math.max(fromPt.y, toPt.y);

    if (waypoints) {
      for (const wp of waypoints) {
        if (wp.x < connMinX) connMinX = wp.x;
        if (wp.y < connMinY) connMinY = wp.y;
        if (wp.x > connMaxX) connMaxX = wp.x;
        if (wp.y > connMaxY) connMaxY = wp.y;
      }
    }

    // For curved connectors, compute control points and the *exact* cubic
    // Bezier bounding box. Cubic Beziers can extend beyond the convex hull
    // of their control points, so bounding by {P0,P1,P2,P3} alone is only
    // approximate. See `cubicBezierBBox` for the extrema solver.
    let cx1: number | undefined, cy1: number | undefined, cx2: number | undefined, cy2: number | undefined;
    if (connType === 'curved') {
      const dist = Math.sqrt((toPt.x - fromPt.x) ** 2 + (toPt.y - fromPt.y) ** 2);
      const cpOff = Math.min(200, Math.max(40, dist * 0.4));
      cx1 = fromPt.x + fromPt.dx * cpOff;
      cy1 = fromPt.y + fromPt.dy * cpOff;
      cx2 = toPt.x + toPt.dx * cpOff;
      cy2 = toPt.y + toPt.dy * cpOff;
      const bbox = cubicBezierBBox(
        { x: fromPt.x, y: fromPt.y },
        { x: cx1, y: cy1 },
        { x: cx2, y: cy2 },
        { x: toPt.x, y: toPt.y },
      );
      connMinX = Math.min(connMinX, bbox.minX);
      connMinY = Math.min(connMinY, bbox.minY);
      connMaxX = Math.max(connMaxX, bbox.maxX);
      connMaxY = Math.max(connMaxY, bbox.maxY);
    }

    resolvedBounds.set(id, {
      x: connMinX,
      y: connMinY,
      w: connMaxX - connMinX,
      h: connMaxY - connMinY,
    });

    // Store resolved connector data in the scene element
    if (sceneElements[id]) {
      const connBounds = {
        x: connMinX,
        y: connMinY,
        w: connMaxX - connMinX,
        h: connMaxY - connMinY,
      };
      sceneElements[id].resolved = { ...connBounds };
      sceneElements[id].localResolved = { ...connBounds };
      // Build resolved style with defaults matching the renderer.
      const rawColor = (el.props.color as string | undefined) ?? '#ffffff';
      const resolvedColor = resolveCssColor(rawColor);
      const thicknessResolved = (el.props.thickness as number | undefined) ?? 2;
      const arrowResolved = ((el.props.arrow as string | undefined) ?? 'end') as ArrowType;
      const dashResolved = (el.props.dash as string | null | undefined) ?? null;
      const opacityResolved = (el.props.opacity as number | undefined) ?? 1;

      const resolvedPath: ConnectorResolvedPath = {
        x1: fromPt.x,
        y1: fromPt.y,
        x2: toPt.x,
        y2: toPt.y,
      };
      if (connType === 'curved') {
        resolvedPath.cx1 = cx1;
        resolvedPath.cy1 = cy1;
        resolvedPath.cx2 = cx2;
        resolvedPath.cy2 = cy2;
      }
      if (waypoints) {
        resolvedPath.waypoints = waypoints;
      }
      if (connType === 'elbow' || connType === 'orthogonal') {
        const cornerRadius = el.props.cornerRadius as number | undefined;
        if (cornerRadius !== undefined && cornerRadius > 0) {
          resolvedPath.cornerRadius = cornerRadius;
        }
      }

      // Resolve label placement (if authored). This mirrors the logic that
      // previously lived in the renderer, so the scene graph carries a
      // single source of truth for both render and export paths.
      let resolvedLabel: ConnectorResolvedLabel | undefined;
      const labelText = el.props.label as string | null | undefined;
      if (labelText) {
        const labelStyle = (el.props.labelStyle as Record<string, unknown> | undefined) ?? {};
        const fontSize = (labelStyle.size as number | undefined) ?? (labelStyle.fontSize as number | undefined) ?? 14;
        const fontColor = (labelStyle.color as string | undefined) ?? '#999999';
        const fontFamily = (labelStyle.font as string | undefined) ?? (labelStyle.fontFamily as string | undefined) ?? 'Inter';
        const fontWeight = (labelStyle.weight as number | string | undefined) ?? (labelStyle.fontWeight as number | string | undefined) ?? 400;
        const labelPosition = (el.props.labelPosition as number | undefined) ?? 0.5;
        const labelOffset = (el.props.labelOffset as { x?: number; y?: number } | undefined) ?? {};
        const labelOffsetX = labelOffset.x ?? 0;
        const labelOffsetY = labelOffset.y ?? -8;

        // Compute the point along the path at `labelPosition` and the local
        // segment angle. For elbow/orthogonal we walk the waypoint polyline;
        // for straight/curved we linearly interpolate between endpoints
        // (matching the previous renderer behavior — the curved midpoint is
        // approximate but visually consistent with what was shipped).
        let midX: number, midY: number;
        let angle = 0;
        if (waypoints && waypoints.length >= 2) {
          const pt = pointAlongPolyline(waypoints, labelPosition);
          midX = pt.x;
          midY = pt.y;
          const seg = segmentAtFraction(waypoints, labelPosition);
          if (seg) {
            const sdx = seg.p2.x - seg.p1.x;
            const sdy = seg.p2.y - seg.p1.y;
            if (Math.abs(sdx) < 0.5 && Math.abs(sdy) > 0.5) {
              angle = -90;
            }
          }
        } else {
          midX = fromPt.x + (toPt.x - fromPt.x) * labelPosition;
          midY = fromPt.y + (toPt.y - fromPt.y) * labelPosition;
          if (Math.abs(toPt.x - fromPt.x) < Math.abs(toPt.y - fromPt.y) * 0.3) {
            angle = -90;
          }
        }

        resolvedLabel = {
          text: labelText,
          x: midX + labelOffsetX,
          y: midY + labelOffsetY,
          angle,
          position: labelPosition,
          offsetX: labelOffsetX,
          offsetY: labelOffsetY,
          style: {
            fontFamily,
            fontSize,
            fontWeight,
            color: resolveCssColor(fontColor),
          },
        };
      }

      sceneElements[id].connector = {
        from: {
          elementId: fromId,
          anchor: fromAnchor,
          x: fromPt.x,
          y: fromPt.y,
          dx: fromPt.dx,
          dy: fromPt.dy,
        },
        to: {
          elementId: toId,
          anchor: toAnchor,
          x: toPt.x,
          y: toPt.y,
          dx: toPt.dx,
          dy: toPt.dy,
        },
        style: {
          type: connType as ConnectorType,
          color: resolvedColor,
          thickness: thicknessResolved,
          arrow: arrowResolved,
          dash: dashResolved,
          opacity: opacityResolved,
        },
        path: resolvedPath,
        ...(resolvedLabel ? { label: resolvedLabel } : {}),
      };
    }
  }

  // =========================================================================
  // Collision Detection (M5.1)
  // =========================================================================

  const collisions = [];

  // (absoluteBoundsOf is defined earlier in the connector resolution section
  // and is reused here for collision detection.)

  // Helper: check if `ancestorId` is an ancestor of `id` by walking the
  // stack-parent / group-parent chains.  Used to skip ancestor-descendant
  // pairs in collision detection.
  function isAncestorOf(ancestorId: string, id: string): boolean {
    let current = id;
    while (true) {
      const gp = groupParent.get(current);
      if (gp) {
        if (gp === ancestorId) return true;
        current = gp;
        continue;
      }
      const sp = stackParent.get(current);
      if (sp) {
        if (sp === ancestorId) return true;
        current = sp;
        continue;
      }
      return false;
    }
  }

  // Collect elements for collision detection, grouped by layer.
  // Stack children appear as individual elements.
  // Skip: group children (positioned relative to group), stacks themselves
  // (their children are the real elements).
  const layerElements: Record<string, string[]> = { bg: [], content: [], overlay: [] };
  for (const id of sortedOrder) {
    const el = mustGet(flatMap, id, `flatMap missing element in collision detection: ${id}`);
    // Skip group children (they use group-relative coordinates)
    if (groupParent.has(id)) continue;
    // Skip stack containers (their children represent the real space)
    if (el.type === "vstack" || el.type === "hstack") continue;

    // Skip zero-sized elements (they can never produce meaningful collisions)
    const elBounds = resolvedBounds.get(id);
    if (!elBounds || elBounds.w <= 0 || elBounds.h <= 0) continue;

    const layer = el.props.layer || "content";
    if (!layerElements[layer]) layerElements[layer] = [];
    layerElements[layer].push(id);
  }

  // Check collisions within each layer: O(n^2/2)
  // M8.4: For rotated elements, use the AABB of the rotated rectangle.
  for (const layer of Object.keys(layerElements)) {
    const ids = layerElements[layer];
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const idA = ids[i];
        const idB = ids[j];

        // Skip if one is an ancestor of the other (group/stack containment).
        // Walks the full ancestry chain, not just direct parents, so that
        // e.g. a panel group is not flagged against its deeply-nested children.
        if (isAncestorOf(idA, idB) || isAncestorOf(idB, idA)) continue;

        // Use absolute bounds so elements inside groups are compared
        // correctly (their resolvedBounds may be group-relative).
        let boundsA = absoluteBoundsOf(idA);
        let boundsB = absoluteBoundsOf(idB);
        if (!boundsA || !boundsB) continue;

        // Apply AABB expansion for rotated elements
        const elA = flatMap.get(idA);
        const elB = flatMap.get(idB);
        if (elA?.props?.rotate) {
          const aabb = rotatedAABB(boundsA.w, boundsA.h, elA.props.rotate as number);
          const cx = boundsA.x + boundsA.w / 2;
          const cy = boundsA.y + boundsA.h / 2;
          boundsA = { x: cx - aabb.w / 2, y: cy - aabb.h / 2, w: aabb.w, h: aabb.h };
        }
        if (elB?.props?.rotate) {
          const aabb = rotatedAABB(boundsB.w, boundsB.h, elB.props.rotate as number);
          const cx = boundsB.x + boundsB.w / 2;
          const cy = boundsB.y + boundsB.h / 2;
          boundsB = { x: cx - aabb.w / 2, y: cy - aabb.h / 2, w: aabb.w, h: aabb.h };
        }

        const overlapRect = computeAABBIntersection(boundsA, boundsB);
        if (overlapRect) {
          const overlapArea = overlapRect.w * overlapRect.h;
          if (overlapArea > collisionThreshold) {
            collisions.push({
              elementA: idA,
              elementB: idB,
              overlapRect,
              overlapArea,
            });
          }
        }
      }
    }
  }

  // =========================================================================
  // Presentation-Specific Validations (M4.3)
  // =========================================================================

  const cfg = state.config;
  const slideW = cfg?.slide?.w ?? 1920;
  const slideH = cfg?.slide?.h ?? 1080;
  const isStrict = cfg?.strict === true;

  // Safe zone check
  const sr = state.safeRectCache;
  if (sr) {
    for (const id of sortedOrder) {
      const el = mustGet(flatMap, id, `flatMap missing element in safe-zone check: ${id}`);
      // Skip bg-layer elements (full-bleed backgrounds are expected to exceed safe zone)
      if (el.props.layer === "bg") continue;
      // Skip group children (they are positioned relative to the group)
      if (groupParent.has(id)) continue;
      // Skip stack children (they inherit the stack's positioning context)
      if (stackParent.has(id)) continue;
      // Skip stack containers — validate their children individually instead
      if (el.type === "vstack" || el.type === "hstack") continue;

      const bounds = mustGet(resolvedBounds, id, `resolvedBounds missing element in safe-zone check: ${id}`);
      const outsideSafe = bounds.x < sr.x ||
        bounds.y < sr.y ||
        bounds.x + bounds.w > sr.x + sr.w ||
        bounds.y + bounds.h > sr.y + sr.h;

      if (outsideSafe) {
        const suggestion = `. If intentional, set layer: 'bg' to silence this check.`;
        if (isStrict) {
          errors.push({
            type: "outside_safe_zone",
            elementId: id,
            resolved: { ...bounds },
            safeRect: { ...sr },
            message: `Element "${id}" extends outside the safe zone` + suggestion,
          });
        } else {
          warnings.push({
            type: "outside_safe_zone",
            elementId: id,
            resolved: { ...bounds },
            safeRect: { ...sr },
            message: `Element "${id}" extends outside the safe zone` + suggestion,
          });
        }
      }
    }
  }

  // Slide bounds check
  for (const id of sortedOrder) {
    const el = mustGet(flatMap, id, `flatMap missing element in slide-bounds check: ${id}`);
    // Skip group children
    if (groupParent.has(id)) continue;
    // Skip stack children and stack containers for this check
    if (stackParent.has(id)) continue;
    if (el.type === "vstack" || el.type === "hstack") continue;

    const bounds = mustGet(resolvedBounds, id, `resolvedBounds missing element in slide-bounds check: ${id}`);
    const outsideSlide = bounds.x < 0 ||
      bounds.y < 0 ||
      bounds.x + bounds.w > slideW ||
      bounds.y + bounds.h > slideH;

    if (outsideSlide) {
      if (isStrict) {
        errors.push({
          type: "outside_slide",
          elementId: id,
          resolved: { ...bounds },
          slideRect: { x: 0, y: 0, w: slideW, h: slideH },
          message: `Element "${id}" extends outside the slide bounds (${slideW}x${slideH})`,
        });
      } else {
        warnings.push({
          type: "outside_slide",
          elementId: id,
          resolved: { ...bounds },
          slideRect: { x: 0, y: 0, w: slideW, h: slideH },
          message: `Element "${id}" extends outside the slide bounds (${slideW}x${slideH})`,
        });
      }
    }
  }

  // Content area usage check
  if (sr) {
    let contentMinX = Infinity, contentMinY = Infinity;
    let contentMaxX = -Infinity, contentMaxY = -Infinity;
    let hasContentElements = false;

    for (const id of sortedOrder) {
      const el = mustGet(flatMap, id, `flatMap missing element in content-area check: ${id}`);
      // Only check content-layer elements, skip group children
      if (el.props.layer !== "content") continue;
      if (groupParent.has(id)) continue;
      // Skip stack containers — count their children instead
      if (el.type === "vstack" || el.type === "hstack") continue;

      const bounds = mustGet(resolvedBounds, id, `resolvedBounds missing element in content-area check: ${id}`);
      hasContentElements = true;
      contentMinX = Math.min(contentMinX, bounds.x);
      contentMinY = Math.min(contentMinY, bounds.y);
      contentMaxX = Math.max(contentMaxX, bounds.x + bounds.w);
      contentMaxY = Math.max(contentMaxY, bounds.y + bounds.h);
    }

    if (hasContentElements) {
      const contentW = contentMaxX - contentMinX;
      const contentH = contentMaxY - contentMinY;
      const contentArea = contentW * contentH;
      const safeArea = sr.w * sr.h;
      const usageRatio = contentArea / safeArea;

      if (usageRatio < 0.40) {
        warnings.push({
          type: "content_clustered",
          usageRatio,
          contentBounds: { x: contentMinX, y: contentMinY, w: contentW, h: contentH },
          message: `Content uses only ${(usageRatio * 100).toFixed(1)}% of the safe zone — content may be too clustered`,
        });
      } else if (usageRatio > 0.95) {
        warnings.push({
          type: "content_no_breathing_room",
          usageRatio,
          contentBounds: { x: contentMinX, y: contentMinY, w: contentW, h: contentH },
          message: `Content uses ${(usageRatio * 100).toFixed(1)}% of the safe zone — no breathing room`,
        });
      }
    }
  }

  // Panel overflow warnings (P2.4)
  for (const [id, el] of flatMap) {
    if (!isPanelElement(el)) continue;
    const config = el._panelConfig;
    if (!config || config.panelH == null) continue; // skip auto-height panels

    const childStack = (el.children || [])[1];
    if (!childStack) continue;

    // Compute actual content height from the vstack's children sizes + gaps,
    // rather than using stackSizes.h which may be an explicit value (e.g. when
    // vAlign passes h through to the inner vstack for main-axis alignment).
    const vstackChildIds = stackChildren.get(childStack.id) || [];
    let naturalContentH = 0;
    const vstackGap = resolveSpacing((childStack.props?.gap ?? 0) as number | string);
    for (let i = 0; i < vstackChildIds.length; i++) {
      const cs = resolvedSizes.get(vstackChildIds[i]);
      if (cs) {
        naturalContentH += cs.h;
        if (i > 0) naturalContentH += vstackGap;
      }
    }

    const contentH = naturalContentH + 2 * config.padding;
    const authoredH = config.panelH;
    if (contentH > authoredH) {
      warnings.push({
        type: "panel_overflow",
        elementId: id,
        contentHeight: contentH,
        authoredHeight: authoredH,
        overflow: contentH - authoredH,
        message: `Panel '${id}' content (${contentH}px) exceeds authored height (${authoredH}px) by ${contentH - authoredH}px. Remove explicit h to let panel size to content.`,
      });
    }
  }

  // Alignment consistency heuristics (P3.3)

  // 1. Ragged-bottom detection on hstacks
  for (const [id, el] of flatMap) {
    if (el.type !== "hstack") continue;
    const align = el.props.align || "top";
    if (align === "stretch") continue; // already equal-height
    const childIds = stackChildren.get(id) || [];
    if (childIds.length < 2) continue;

    const childHeights = [];
    for (const cid of childIds) {
      const bounds = resolvedBounds.get(cid);
      if (bounds) childHeights.push(bounds.h);
    }
    if (childHeights.length < 2) continue;
    const maxH = Math.max(...childHeights);
    const minH = Math.min(...childHeights);
    if (maxH - minH > 5) {
      warnings.push({
        type: "ragged_bottom",
        elementId: id,
        childHeights,
        maxHeight: maxH,
        message: `hstack '${id}' has children with unequal heights (${minH}-${maxH}px). Consider align: 'stretch' for equal-height cards.`,
      });
    }
  }

  // 2. Off-center assembly detection
  for (const [id, el] of flatMap) {
    if (el.type !== "group") continue;
    if (el.props.bounds === "hug") continue; // hug handles centering correctly
    if (el._compound) continue; // skip panels, figures, etc.
    const anchor = el.props.anchor;
    if (!anchor || typeof anchor !== "string" || !anchor.includes("c")) continue;
    // anchor column must be center (second character is 'c')
    if (anchor[1] !== "c") continue;

    const childIds = groupChildren.get(id) || [];
    if (childIds.length === 0) continue;

    const authoredW = el.props.w as number | undefined;
    if (authoredW === undefined || authoredW === null) continue;

    // Compute actual children bounding box width from resolvedBounds
    // (group children's resolvedBounds are already group-relative)
    let contentMinX = Infinity, contentMaxX = -Infinity;
    let validChildren = 0;
    for (const cid of childIds) {
      const cb = resolvedBounds.get(cid);
      if (!cb) continue;
      contentMinX = Math.min(contentMinX, cb.x);
      contentMaxX = Math.max(contentMaxX, cb.x + cb.w);
      validChildren++;
    }
    if (validChildren === 0) continue;
    const contentW = contentMaxX - contentMinX;

    if (Math.abs(authoredW - contentW) > 20) {
      warnings.push({
        type: "off_center_assembly",
        elementId: id,
        authoredW,
        contentW,
        message: `Group '${id}' has authored w=${authoredW} but content spans ${contentW}px. Consider bounds: 'hug' for accurate centering.`,
      });
    }
  }

  return {
    elements: sceneElements,
    rootIds,
    transforms: resolvedTransforms,
    warnings,
    errors,
    collisions,
  };
}

// Phase 4: Finalize — extracted from layout.js
// Handles: provenance, scene graph, connector endpoints, collision detection,
// presentation validations, and final warnings.

import { state } from '../state.js';
import { getAnchorPoint } from '../compounds.js';
import { rotatedAABB } from '../utilities.js';
import { buildProvenance, computeAABBIntersection } from './helpers.js';
import { mustGet } from '../assertions.js';
import { isPanelElement } from '../types.js';
import { routeConnector } from '../connectorRouting.js';
import type { SlideElement, Rect, Point, AnchorPointResult, ResolvedSize, TransformMarker, AuthoredSpec, LayoutResult, SceneElement, Provenance, ElementType } from '../types.js';

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
        x: { source: "stack", stackId: parentStackId } as Provenance,
        y: { source: "stack", stackId: parentStackId } as Provenance,
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

  // Port group: connectors sharing the same (elementId, edge, direction)
  // direction = 'from' or 'to'
  const portGroups = new Map<string, Array<{ idx: number; targetPt: Point; portOrder: number }>>();

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

    const fromBounds = resolvedBounds.get(fromId);
    const toBounds = resolvedBounds.get(toId);

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
      const key = `from:${fromId}:${fromEdge}`;
      if (!portGroups.has(key)) portGroups.set(key, []);
      portGroups.get(key)!.push({
        idx,
        targetPt: { x: toPt.x, y: toPt.y },
        portOrder: (el.props.fromPortOrder as number) ?? 0,
      });
    }

    const toEdge = anchorEdge(toAnchor);
    if (toEdge !== 'center') {
      const key = `to:${toId}:${toEdge}`;
      if (!portGroups.has(key)) portGroups.set(key, []);
      portGroups.get(key)!.push({
        idx,
        targetPt: { x: fromPt.x, y: fromPt.y },
        portOrder: (el.props.toPortOrder as number) ?? 0,
      });
    }
  }

  // Apply port spreading: when multiple connectors share an edge, distribute
  // them along it. Sort by portOrder, then by target projection to avoid crossings.
  const PORT_SPACING = 14; // px between spread ports
  const EDGE_MARGIN = 8;   // px margin from edge corners

  for (const [key, group] of portGroups) {
    // For single-connector groups, only apply if there's an explicit offset
    if (group.length <= 1) {
      if (group.length === 1) {
        const parts = key.split(':');
        const direction = parts[0];
        const info = connectorInfos[group[0].idx];
        const explicitOffset = direction === 'from'
          ? (info.el.props.fromPortOffset as number | undefined)
          : (info.el.props.toPortOffset as number | undefined);
        if (explicitOffset !== undefined) {
          const edge = parts[2];
          const isHorizontalEdge = edge === 'top' || edge === 'bottom';
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

    const parts = key.split(':');
    const direction = parts[0]; // 'from' or 'to'
    const elementId = parts[1];
    const edge = parts[2];

    const bounds = resolvedBounds.get(elementId);
    if (!bounds) continue;

    // Sort by (portOrder, target projection along edge tangent)
    const isHorizontalEdge = edge === 'top' || edge === 'bottom';
    group.sort((a, b) => {
      if (a.portOrder !== b.portOrder) return a.portOrder - b.portOrder;
      // Sort by target projection to avoid crossings
      return isHorizontalEdge
        ? a.targetPt.x - b.targetPt.x
        : a.targetPt.y - b.targetPt.y;
    });

    // Compute available edge span and spacing
    const edgeLength = isHorizontalEdge ? bounds.w : bounds.h;
    const usable = edgeLength - 2 * EDGE_MARGIN;
    const totalSpread = (group.length - 1) * PORT_SPACING;
    const spacing = totalSpread > usable
      ? usable / (group.length - 1)
      : PORT_SPACING;

    const startOffset = -((group.length - 1) * spacing / 2);

    for (let i = 0; i < group.length; i++) {
      const entry = group[i];
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
    const margin = 200;
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
      const route = routeConnector({
        from: fromPt, to: toPt, obstacles,
        orthogonal: connType === 'orthogonal',
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

    // For curved connectors, account for control point bounds
    if (connType === 'curved') {
      const dist = Math.sqrt((toPt.x - fromPt.x) ** 2 + (toPt.y - fromPt.y) ** 2);
      const cpOff = Math.min(200, Math.max(40, dist * 0.4));
      const cx1 = fromPt.x + fromPt.dx * cpOff;
      const cy1 = fromPt.y + fromPt.dy * cpOff;
      const cx2 = toPt.x + toPt.dx * cpOff;
      const cy2 = toPt.y + toPt.dy * cpOff;
      connMinX = Math.min(connMinX, cx1, cx2);
      connMinY = Math.min(connMinY, cy1, cy2);
      connMaxX = Math.max(connMaxX, cx1, cx2);
      connMaxY = Math.max(connMaxY, cy1, cy2);
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
      sceneElements[id]._connectorResolved = {
        from: fromPt,
        to: toPt,
        fromId,
        toId,
        fromAnchor,
        toAnchor,
        waypoints,
      };
    }
  }

  // =========================================================================
  // Collision Detection (M5.1)
  // =========================================================================

  const collisions = [];

  // Helper: compute absolute (slide-level) bounds for an element by walking
  // up the group/stack parent ancestry chain.  Stack children have coords set
  // by their parent stack; if that stack lives inside a group, the coords are
  // group-relative and need the group's offset added.
  function absoluteBounds(id: string) {
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
        // Stack children's coords already include the stack's position,
        // but the stack itself might be inside a group — keep walking.
        current = sp;
        continue;
      }
      break;
    }
    return { x: bounds.x + offsetX, y: bounds.y + offsetY, w: bounds.w, h: bounds.h };
  }

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
        let boundsA = absoluteBounds(idA);
        let boundsB = absoluteBounds(idB);
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
    const stackSizes = resolvedSizes.get(childStack.id);
    if (!stackSizes) continue;

    const contentH = stackSizes.h + 2 * config.padding;
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

// Phase 4: Finalize — extracted from layout.js
// Handles: provenance, scene graph, connector endpoints, collision detection,
// presentation validations, and final warnings.

import { state } from '../state.js';
import { getAnchorPoint } from '../compounds.js';
import { rotatedAABB } from '../utilities.js';
import { buildProvenance, computeAABBIntersection } from './helpers.js';
import { mustGet } from '../assertions.js';
import type { SlideElement, Rect, ResolvedSize, TransformMarker } from '../types.js';

/** Context passed from earlier layout phases into finalize. */
interface FinalizeContext {
  sortedOrder: string[];
  flatMap: Map<string, SlideElement>;
  authoredSpecs: Map<string, Record<string, any>>;
  resolvedBounds: Map<string, Rect>;
  resolvedSizes: Map<string, ResolvedSize>;
  stackParent: Map<string, string>;
  stackChildren: Map<string, string[]>;
  groupParent: Map<string, string>;
  groupChildren: Map<string, string[]>;
  panelInternals: Set<string>;
  preTransformBounds: Map<string, Rect>;
  resolvedTransforms: unknown[];
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
}: FinalizeContext) {
  // Build provenance metadata and scene graph
  const sceneElements: Record<string, any> = {};

  for (const id of sortedOrder) {
    const el = mustGet(flatMap, id, `flatMap missing element: ${id}`);
    const authored = mustGet(authoredSpecs, id, `authoredSpecs missing element: ${id}`);
    const bounds = mustGet(resolvedBounds, id, `resolvedBounds missing element: ${id}`);
    const sizes = mustGet(resolvedSizes, id, `resolvedSizes missing element: ${id}`);

    // Build provenance for each dimension
    // Stack children get provenance source: "stack"
    let provenance;
    if (stackParent.has(id)) {
      const parentStackId = mustGet(stackParent, id, `stackParent missing child: ${id}`);
      provenance = {
        x: { source: "stack", stackId: parentStackId },
        y: { source: "stack", stackId: parentStackId },
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
        provenance.x = { source: "transform", original: provenance.x };
      }
      if (bounds.y !== preBounds.y) {
        provenance.y = { source: "transform", original: provenance.y };
      }
      if (bounds.w !== preBounds.w) {
        provenance.w = { source: "transform", original: provenance.w };
      }
      if (bounds.h !== preBounds.h) {
        provenance.h = { source: "transform", original: provenance.h };
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
    if ((el as any)._compound === 'panel' && (el as any).children) {
      sceneElements[id].panelChildren = (el as any).children.map((child: any) => {
        const bounds = resolvedBounds.get(child.id);
        return {
          id: child.id,
          type: child.type,
          ...(bounds || {})
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

  for (const id of sortedOrder) {
    const el = mustGet(flatMap, id, `flatMap missing element: ${id}`);
    if (el.type !== "connector") continue;

    const fromId = el.props.fromId;
    const toId = el.props.toId;
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

    // Compute the bounding box for the connector line so resolvedBounds is meaningful
    const connMinX = Math.min(fromPt.x, toPt.x);
    const connMinY = Math.min(fromPt.y, toPt.y);
    const connMaxX = Math.max(fromPt.x, toPt.x);
    const connMaxY = Math.max(fromPt.y, toPt.y);
    resolvedBounds.set(id, {
      x: connMinX,
      y: connMinY,
      w: connMaxX - connMinX,
      h: connMaxY - connMinY,
    });

    // Store resolved connector data in the scene element and update resolved bounds
    if (sceneElements[id]) {
      const connBounds = {
        x: connMinX,
        y: connMinY,
        w: connMaxX - connMinX,
        h: connMaxY - connMinY,
      };
      sceneElements[id].resolved = { ...connBounds };
      // Connectors are root elements, so localResolved === resolved
      sceneElements[id].localResolved = { ...connBounds };
      sceneElements[id]._connectorResolved = {
        from: fromPt,
        to: toPt,
        fromId,
        toId,
        fromAnchor,
        toAnchor,
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

  const cfg: any = state.config || { slide: { w: 1920, h: 1080 }, minFontSize: 24, strict: false };
  const slideW = cfg.slide?.w ?? 1920;
  const slideH = cfg.slide?.h ?? 1080;
  const isStrict = cfg.strict === true;
  const minFontSizeThreshold = cfg.minFontSize ?? 24;

  // Safe zone check
  const sr = state.safeRectCache as Rect | null;
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
    const elAny = el as any;
    if (elAny._compound !== "panel") continue;
    const config = elAny._panelConfig;
    if (!config || config.panelH == null) continue; // skip auto-height panels

    const childStack = (elAny.children || [])[1];
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

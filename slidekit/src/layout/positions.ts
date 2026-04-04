// Phase 2: Position resolution via topological sort
// Extracted from layout.js

import { isRelMarker, getRelRef, resolveRelMarker } from './helpers.js';
import { resolveSpacing } from '../spacing.js';
import { resolveAnchor } from '../anchor.js';
import { measure } from '../measure.js';
import { mustGet } from '../assertions.js';
import { state } from '../state.js';

/**
 * Resolve element positions via unified topological sort.
 *
 * Builds a dependency graph from _rel markers, performs Kahn's algorithm
 * topological sort, then resolves x/y positions in dependency order.
 * Stack children are positioned by their parent stack's layout algorithm.
 *
 * @param {Map} flatMap - Flat map of element ID -> element
 * @param {Map} stackParent - Map of childId -> stackId
 * @param {Map} stackChildren - Map of stackId -> [childIds]
 * @param {Map} resolvedSizes - Map of id -> { w, h, wMeasured, hMeasured }
 * @param {Map} authoredSpecs - Map of id -> authored element spec
 * @param {Array} warnings - Warnings array (mutated)
 * @param {Array} errors - Errors array (mutated)
 * @returns {Promise<{resolvedBounds: Map, sortedOrder: string[]}|null>}
 *   Returns null if errors prevent position resolution.
 */
import { isPanelElement } from '../types.js';
import type { SlideElement, Rect, ResolvedSize, RelMarker, AuthoredSpec } from '../types.js';

/** Result of Phase 2: position resolution. */
export interface PositionResult {
  resolvedBounds: Map<string, Rect>;
  sortedOrder: string[];
}

export async function resolvePositions(
  flatMap: Map<string, SlideElement>,
  stackParent: Map<string, string>,
  stackChildren: Map<string, string[]>,
  resolvedSizes: Map<string, ResolvedSize>,
  authoredSpecs: Map<string, AuthoredSpec>,
  warnings: Array<Record<string, unknown>>,
  errors: Array<Record<string, unknown>>,
): Promise<PositionResult | null> {
  const initialErrorCount = errors.length;

  // Build dependency graph
  // For each element, find what elements it depends on (via _rel markers on x and y)
  // Stack children depend on their parent stack (not on _rel markers — their position
  // is computed by the stack layout algorithm after the stack is positioned).
  const deps = new Map<string, Set<string>>(); // id -> Set<refId>
  for (const [id, el] of flatMap) {
    const depSet = new Set<string>();

    // Stack children depend on their parent stack
    if (stackParent.has(id)) {
      const parentStackId = mustGet(stackParent, id, `stackParent missing child: ${id}`);
      depSet.add(parentStackId);
      // Warn if stack children have _rel markers on x/y — these are ignored
      // because stack layout determines children's positions.
      if (isRelMarker(el.props.x) || isRelMarker(el.props.y)) {
        warnings.push({
          type: "ignored_rel_on_stack_child",
          elementId: id,
          stackId: parentStackId,
          message: `Element "${id}" is a child of stack "${parentStackId}", so its relative positioning markers on x/y are ignored. Use gap/align on the stack instead.`,
        });
      }
    } else {
      // Only process _rel markers for non-stack-children
      const xRef = getRelRef(el.props.x);
      const yRef = getRelRef(el.props.y);
      if (xRef) {
        if (!flatMap.has(xRef)) {
          errors.push({
            type: "unknown_ref",
            elementId: id,
            property: "x",
            ref: xRef,
            message: `Element "${id}": x references unknown element "${xRef}"`,
          });
        } else {
          depSet.add(xRef);
        }
      }
      if (yRef) {
        if (!flatMap.has(yRef)) {
          errors.push({
            type: "unknown_ref",
            elementId: id,
            property: "y",
            ref: yRef,
            message: `Element "${id}": y references unknown element "${yRef}"`,
          });
        } else {
          depSet.add(yRef);
        }
      }

      // Dimension constraints (matchWidth/matchHeight) — add dependency on referenced element
      for (const prop of ["w", "h"]) {
        const marker = el.props[prop];
        if (isRelMarker(marker) && (marker._rel === "matchWidth" || marker._rel === "matchHeight")) {
          const dimRef = marker.ref;
          if (dimRef) {
            if (!flatMap.has(dimRef)) {
              errors.push({
                type: "unknown_ref",
                elementId: id,
                property: prop,
                ref: dimRef,
                message: `Element "${id}": ${prop} references unknown element "${dimRef}"`,
              });
            } else {
              depSet.add(dimRef);
            }
          }
        }
      }

      // P2.2: "between" markers have a second ref (ref2) that may also be a dependency
      for (const prop of ["x", "y"]) {
        const marker = el.props[prop];
        if (isRelMarker(marker) && marker.ref2 !== undefined && typeof marker.ref2 === "string") {
          if (!flatMap.has(marker.ref2)) {
            errors.push({
              type: "unknown_ref",
              elementId: id,
              property: prop,
              ref: marker.ref2,
              message: `Element "${id}": ${prop} references unknown element "${marker.ref2}" (ref2)`,
            });
          } else {
            depSet.add(marker.ref2);
          }
        }
      }

      // M7.2: Connector elements depend on their fromId and toId
      if (el.type === "connector") {
        const fId = el.props.fromId;
        const tId = el.props.toId;
        if (fId) {
          if (!flatMap.has(fId)) {
            errors.push({
              type: "unknown_ref",
              elementId: id,
              property: "fromId",
              ref: fId,
              message: `Connector "${id}": fromId references unknown element "${fId}"`,
            });
          } else {
            depSet.add(fId);
          }
        }
        if (tId) {
          if (!flatMap.has(tId)) {
            errors.push({
              type: "unknown_ref",
              elementId: id,
              property: "toId",
              ref: tId,
              message: `Connector "${id}": toId references unknown element "${tId}"`,
            });
          } else {
            depSet.add(tId);
          }
        }
      }
    }
    deps.set(id, depSet);
  }

  if (errors.length > initialErrorCount) {
    return null;
  }

  // Kahn's algorithm (BFS-based topological sort)
  // Compute in-degree for each node
  const inDegree = new Map<string, number>();
  for (const [id] of flatMap) {
    inDegree.set(id, 0);
  }
  for (const [id, depSet] of deps) {
    // id depends on each ref in depSet, so the edge is ref -> id
    // in-degree of id increases for each dependency
    inDegree.set(id, depSet.size);
  }

  // Queue starts with nodes that have in-degree 0
  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) {
      queue.push(id);
    }
  }

  // Build reverse adjacency: for each node, who depends on it
  const reverseDeps = new Map<string, string[]>();
  for (const [id] of flatMap) {
    reverseDeps.set(id, []);
  }
  for (const [id, depSet] of deps) {
    for (const ref of depSet) {
      mustGet(reverseDeps, ref, `reverseDeps missing element: ${ref}`).push(id);
    }
  }

  const sortedOrder: string[] = [];
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    sortedOrder.push(nodeId);
    // For each node that depends on this one, decrement its in-degree
    for (const dependent of mustGet(reverseDeps, nodeId, `reverseDeps missing node: ${nodeId}`)) {
      const newDeg = mustGet(inDegree, dependent, `inDegree missing element: ${dependent}`) - 1;
      inDegree.set(dependent, newDeg);
      if (newDeg === 0) {
        queue.push(dependent);
      }
    }
  }

  // Cycle detection: if sortedOrder doesn't include all elements, there's a cycle
  if (sortedOrder.length < flatMap.size) {
    const sortedSet = new Set(sortedOrder);
    const inCycle = [];
    for (const [id] of flatMap) {
      if (!sortedSet.has(id)) {
        inCycle.push(id);
      }
    }
    errors.push({
      type: "dependency_cycle",
      elementIds: inCycle,
      message: `Circular dependency detected among elements: ${inCycle.join(", ")}`,
    });
    return null;
  }

  // Resolve matchMaxWidth / matchMaxHeight groups.
  // Collect elements by group name, find the max measured size, apply to all members.
  const maxWidthGroups = new Map<string, string[]>();   // group -> [elementIds]
  const maxHeightGroups = new Map<string, string[]>();
  for (const [id, el] of flatMap) {
    if (isRelMarker(el.props.w) && (el.props.w as RelMarker)._rel === 'matchMaxWidth') {
      const group = (el.props.w as RelMarker).group!;
      if (!maxWidthGroups.has(group)) maxWidthGroups.set(group, []);
      maxWidthGroups.get(group)!.push(id);
    }
    if (isRelMarker(el.props.h) && (el.props.h as RelMarker)._rel === 'matchMaxHeight') {
      const group = (el.props.h as RelMarker).group!;
      if (!maxHeightGroups.has(group)) maxHeightGroups.set(group, []);
      maxHeightGroups.get(group)!.push(id);
    }
  }
  for (const [, ids] of maxWidthGroups) {
    let maxW = 0;
    for (const id of ids) {
      const s = resolvedSizes.get(id);
      if (s && s.w > maxW) maxW = s.w;
    }
    for (const id of ids) {
      const s = resolvedSizes.get(id);
      if (s) s.w = maxW;
    }
    // Re-measure heights for elements whose width changed and have auto-height.
    // Text may wrap differently at the new (potentially narrower) width.
    for (const id of ids) {
      const el = flatMap.get(id);
      const s = resolvedSizes.get(id);
      if (!el || !s || !s.hMeasured) continue;
      if (el.type !== 'el') continue;
      const html = (el as { content?: string }).content || '';
      if (!html) continue;
      const remeasured = await measure(html, {
        w: maxW,
        style: el.props.style as Record<string, unknown> | undefined,
        className: el.props.className,
      });
      s.h = remeasured.h;
    }
  }
  for (const [, ids] of maxHeightGroups) {
    let maxH = 0;
    for (const id of ids) {
      const s = resolvedSizes.get(id);
      if (s && s.h > maxH) maxH = s.h;
    }
    for (const id of ids) {
      const s = resolvedSizes.get(id);
      if (s) s.h = maxH;
    }
  }

  // Resolve positions in topological order
  // resolvedBounds: id -> { x, y, w, h } (top-left corner + dimensions)
  const resolvedBounds = new Map<string, Rect>();

  for (const id of sortedOrder) {
    const el = mustGet(flatMap, id, `flatMap missing element: ${id}`);
    const sizes = mustGet(resolvedSizes, id, `resolvedSizes missing element: ${id}`);

    // Resolve dimension constraints (matchWidth/matchHeight) before using w/h.
    // By topological order, the referenced element's bounds are already resolved.
    if (isRelMarker(el.props.w) && (el.props.w as RelMarker)._rel === 'matchWidth') {
      const marker = el.props.w as RelMarker;
      const refId = marker.ref!;
      const refSizes = mustGet(resolvedSizes, refId, `resolvedSizes missing ref for matchWidth: ${refId}`);
      sizes.w = refSizes.w;
    }
    if (isRelMarker(el.props.h) && (el.props.h as RelMarker)._rel === 'matchHeight') {
      const marker = el.props.h as RelMarker;
      const refId = marker.ref!;
      const refSizes = mustGet(resolvedSizes, refId, `resolvedSizes missing ref for matchHeight: ${refId}`);
      sizes.h = refSizes.h;
    }

    const w = sizes.w;
    const h = sizes.h;

    // Stack children get their position from the stack layout algorithm,
    // not from their own x/y props. Skip them here — they are resolved
    // when we process their parent stack. However, if this child is
    // itself a stack (nested stack), we still need to let it position
    // its own children below, so we only skip the x/y resolution.
    let finalX: number, finalY: number;

    if (stackParent.has(id)) {
      if (resolvedBounds.has(id)) {
        // Already positioned by parent stack — use those coords
        const existingBounds = mustGet(resolvedBounds, id, `resolvedBounds missing stack child: ${id}`);
        finalX = existingBounds.x;
        finalY = existingBounds.y;
      } else {
        // Parent hasn't positioned us yet (shouldn't happen with topo sort).
        // Fallback: position at (0, 0)
        finalX = 0;
        finalY = 0;
        resolvedBounds.set(id, { x: 0, y: 0, w, h });
      }
      // If this is NOT a stack itself, we're done — skip to next element.
      // If it IS a stack, fall through to position its own children.
      if (el.type !== "vstack" && el.type !== "hstack") {
        continue;
      }
    } else {
      // Resolve x
      const xIsRel = isRelMarker(el.props.x);
      let x: number;
      if (xIsRel) {
        const marker = el.props.x as RelMarker;
        if (marker._rel === "centerIn") {
          const r = marker.rect!;
          x = r.x + r.w / 2 - w / 2;
        } else if (marker._rel === "between") {
          // P2.2: placeBetween / between on x-axis (left/right references)
          if (marker.axis && marker.axis !== 'x') {
            warnings.push({ type: 'between_axis_mismatch', elementId: id, axis: 'x', declaredAxis: marker.axis, message: `between() declared axis "${marker.axis}" but assigned to x` });
          }
          const leftBounds = mustGet(resolvedBounds, marker.ref, `resolvedBounds missing ref for between-x: ${marker.ref}`);
          const leftEdge = leftBounds.x + leftBounds.w;
          const rightEdge = typeof marker.ref2 === "string"
            ? mustGet(resolvedBounds, marker.ref2, `resolvedBounds missing ref2 for between-x: ${marker.ref2}`).x
            : marker.ref2;
          if (typeof rightEdge !== 'number' || !Number.isFinite(rightEdge)) {
            warnings.push({ type: 'between_invalid_ref', elementId: id, axis: 'x', message: `Invalid ref2 value for between constraint` });
            x = leftEdge + resolveSpacing("xs");
            resolvedBounds.set(id, { x, y: (el.props.y ?? 0) as number, w, h });
            continue;
          }
          const availableGapX = rightEdge - leftEdge;
          const availableSlack = availableGapX - w;
          if (availableSlack < 0) {
            const ref2Label = typeof marker.ref2 === "string" ? `"${marker.ref2}"` : marker.ref2;
            warnings.push({
              type: "between_no_fit",
              elementId: id,
              ref1: marker.ref,
              ref2: marker.ref2,
              message: `Element "${id}" (w=${w}) does not fit between "${marker.ref}" and ${ref2Label} (available: ${availableGapX}px). Using minimum gap fallback.`,
              suggestion: `Increase horizontal space between "${marker.ref}" and ${ref2Label} to at least ${w + 2 * resolveSpacing('xs')}px, or reduce element width.`,
            });
            x = leftEdge + resolveSpacing("xs");
          } else {
            x = leftEdge + availableSlack * (marker.bias ?? 0.5);
          }
        } else if (marker._rel === "centerHSlide") {
          const slideW = state.config?.slide?.w ?? 1920;
          x = slideW / 2 - w / 2;
        } else {
          const refId = marker.ref;
          const refBounds = mustGet(resolvedBounds, refId, `resolvedBounds missing ref for x: ${refId}`);
          x = resolveRelMarker(marker, "x", refBounds, w, h);
        }
      } else {
        x = (el.props.x ?? 0) as number;
      }

      // Resolve y
      const yIsRel = isRelMarker(el.props.y);
      let y: number;
      if (yIsRel) {
        const marker = el.props.y as RelMarker;
        if (marker._rel === "centerIn") {
          const r = marker.rect!;
          y = r.y + r.h / 2 - h / 2;
        } else if (marker._rel === "centerVSlide") {
          const slideH = state.config?.slide?.h ?? 1080;
          y = slideH / 2 - h / 2;
        } else if (marker._rel === "between") {
          // P2.2: placeBetween / between — position between two vertical references
          if (marker.axis && marker.axis !== 'y') {
            warnings.push({ type: 'between_axis_mismatch', elementId: id, axis: 'y', declaredAxis: marker.axis, message: `between() declared axis "${marker.axis}" but assigned to y` });
          }
          const topBounds = mustGet(resolvedBounds, marker.ref, `resolvedBounds missing ref for between-y: ${marker.ref}`);
          const topEdge = topBounds.y + topBounds.h;
          const bottomEdge = typeof marker.ref2 === "string"
            ? mustGet(resolvedBounds, marker.ref2, `resolvedBounds missing ref2 for between-y: ${marker.ref2}`).y
            : marker.ref2;
          if (typeof bottomEdge !== 'number' || !Number.isFinite(bottomEdge)) {
            warnings.push({ type: 'between_invalid_ref', elementId: id, axis: 'y', message: `Invalid ref2 value for between constraint` });
            y = topEdge + resolveSpacing("xs");
            resolvedBounds.set(id, { x: (el.props.x ?? 0) as number, y, w, h });
            continue;
          }
          const availableGapY = bottomEdge - topEdge;
          const availableSlack = availableGapY - h;
          if (availableSlack < 0) {
            const ref2Label = typeof marker.ref2 === "string" ? `"${marker.ref2}"` : marker.ref2;
            warnings.push({
              type: "between_no_fit",
              elementId: id,
              ref1: marker.ref,
              ref2: marker.ref2,
              message: `Element "${id}" (h=${h}) does not fit between "${marker.ref}" and ${ref2Label} (available: ${availableGapY}px). Using minimum gap fallback.`,
              suggestion: `Increase vertical space between "${marker.ref}" and ${ref2Label} to at least ${h + 2 * resolveSpacing('xs')}px, or reduce element height.`,
            });
            y = topEdge + resolveSpacing("xs");
          } else {
            y = topEdge + availableSlack * (marker.bias ?? 0.5);
          }
        } else {
          const refId = marker.ref;
          const refBounds = mustGet(resolvedBounds, refId, `resolvedBounds missing ref for y: ${refId}`);
          y = resolveRelMarker(marker, "y", refBounds, w, h);
        }
      } else {
        y = (el.props.y ?? 0) as number;
      }

      // Apply anchor resolution ONLY to authored (non-_rel) coordinates.
      // By this point, percentages have been resolved to numbers in Phase 1.
      const anchor = el.props.anchor || "tl";
      const { left: anchoredX, top: anchoredY } = resolveAnchor(x as number, y as number, w, h, anchor);
      finalX = xIsRel ? x : anchoredX;
      finalY = yIsRel ? y : anchoredY;

      resolvedBounds.set(id, { x: finalX, y: finalY, w, h });
    }

    // If this is a stack, position all children now
    if (el.type === "vstack" || el.type === "hstack") {
      const childIds = stackChildren.get(id) || [];
      const gap = resolveSpacing(el.props.gap ?? 0);
      const stackX = finalX;
      const stackY = finalY;

      if (el.type === "vstack") {
        const align = el.props.align || "left";
        let curY = stackY;

        if (align === "stretch") {
          // All children get the same width — the max measured width
          // (or the stack's own authored w if present)
          const maxW = childIds.length > 0
            ? Math.max(...childIds.map(cid => mustGet(resolvedSizes, cid, `resolvedSizes missing stack child: ${cid}`).w))
            : 0;
          const stackAuthW = authoredSpecs.get(id)?.props?.w;
          const stretchW = (stackAuthW !== undefined && stackAuthW !== null) ? w : maxW;

          for (let i = 0; i < childIds.length; i++) {
            const cid = childIds[i];
            const cs = mustGet(resolvedSizes, cid, `resolvedSizes missing vstack child: ${cid}`);
            // Warn if child had explicit w that differs
            const authoredW = mustGet(authoredSpecs, cid, `authoredSpecs missing vstack child: ${cid}`).props.w;
            if (authoredW !== undefined && authoredW !== null && authoredW !== stretchW) {
              warnings.push({
                type: "stretch_override",
                elementId: cid,
                property: "w",
                authored: authoredW,
                stretched: stretchW,
                message: `Child '${cid}' has authored w=${authoredW} but stretch requires w=${stretchW}.`,
              });
            }
            // Re-measure auto-height el() children when width changes
            const childEl = mustGet(flatMap, cid, `flatMap missing vstack child: ${cid}`);
            const childAuth = authoredSpecs.get(cid)?.props || {};
            let childH = cs.h;
            if (childEl?.type === "el" && stretchW !== cs.w &&
                (childAuth.h === undefined || childAuth.h === null)) {
              const metrics = await measure(childEl.content || "", { ...childEl.props, w: stretchW });
              childH = metrics.h;
              cs.h = childH;
            }
            resolvedBounds.set(cid, { x: stackX, y: curY, w: stretchW, h: childH });
            curY += childH + gap;
          }
        } else {
          for (let i = 0; i < childIds.length; i++) {
            const cid = childIds[i];
            const cs = mustGet(resolvedSizes, cid, `resolvedSizes missing vstack child: ${cid}`);
            let childX;
            if (align === "center") {
              childX = stackX + (w - cs.w) / 2;
            } else if (align === "right") {
              childX = stackX + w - cs.w;
            } else {
              // "left" (default)
              childX = stackX;
            }
            resolvedBounds.set(cid, { x: childX, y: curY, w: cs.w, h: cs.h });
            curY += cs.h + gap;
          }
        }

        // Main-axis alignment (vAlign): shift all children vertically within the stack's height
        const vAlign = el.props.vAlign;
        if (vAlign && vAlign !== "top" && childIds.length > 0) {
          // Compute total content height: curY has advanced past the last child + one trailing gap
          const totalContentH = curY - stackY - (childIds.length > 0 ? gap : 0);
          // Only apply if the stack has an authored height larger than content
          const stackAuthH = authoredSpecs.get(id)?.props?.h;
          if (stackAuthH !== undefined && stackAuthH !== null && h > totalContentH) {
            const slack = h - totalContentH;
            const offsetY = vAlign === "center" ? slack / 2 : slack; // 'bottom'
            for (const cid of childIds) {
              const bounds = mustGet(resolvedBounds, cid, `resolvedBounds missing vstack child for vAlign: ${cid}`);
              resolvedBounds.set(cid, { x: bounds.x, y: bounds.y + offsetY, w: bounds.w, h: bounds.h });
            }
          }
        }
      } else {
        // hstack
        const align = el.props.align || "top";
        let curX = stackX;

        if (align === "stretch") {
          // All children get the same height — the max measured height
          // (or the stack's own authored h if present)
          const maxH = childIds.length > 0
            ? Math.max(...childIds.map(cid => mustGet(resolvedSizes, cid, `resolvedSizes missing hstack child: ${cid}`).h))
            : 0;
          const stackAuthH = authoredSpecs.get(id)?.props?.h;
          const stretchH = (stackAuthH !== undefined && stackAuthH !== null) ? h : maxH;

          for (let i = 0; i < childIds.length; i++) {
            const cid = childIds[i];
            const cs = mustGet(resolvedSizes, cid, `resolvedSizes missing hstack child: ${cid}`);
            // Warn if child had explicit h that differs
            const authoredH = mustGet(authoredSpecs, cid, `authoredSpecs missing hstack child: ${cid}`).props.h;
            if (authoredH !== undefined && authoredH !== null && authoredH !== stretchH) {
              warnings.push({
                type: "stretch_override",
                elementId: cid,
                property: "h",
                authored: authoredH,
                stretched: stretchH,
                message: `Child '${cid}' has authored h=${authoredH} but stretch requires h=${stretchH}.`,
              });
            }
            resolvedBounds.set(cid, { x: curX, y: stackY, w: cs.w, h: stretchH });
            // Propagate stretch height into panel compound internals
            const childEl = mustGet(flatMap, cid, `flatMap missing hstack child: ${cid}`);
            if (isPanelElement(childEl) && childEl.children && childEl.children.length >= 2) {
              const config = childEl._panelConfig;
              const panelPadding = config?.padding ?? 0;
              const bgRect = childEl.children[0];
              const bgSizes = resolvedSizes.get(bgRect.id);
              if (bgSizes) {
                bgSizes.h = stretchH;
              }
              const bgBounds = resolvedBounds.get(bgRect.id);
              if (bgBounds) {
                bgBounds.h = stretchH;
              }
              // Also update innerVstack height so vAlign works correctly.
              // Update resolvedSizes (which feeds into later bound resolution)
              // and resolvedBounds if already set.
              const innerVstack = childEl.children[1];
              const newVstackH = Math.max(0, stretchH - 2 * panelPadding);
              const vstackSizes = resolvedSizes.get(innerVstack.id);
              if (vstackSizes) {
                vstackSizes.h = newVstackH;
              }
              const vstackBounds = resolvedBounds.get(innerVstack.id);
              if (vstackBounds) {
                vstackBounds.h = newVstackH;
              }
            }
            curX += cs.w + gap;
          }
        } else {
          for (let i = 0; i < childIds.length; i++) {
            const cid = childIds[i];
            const cs = mustGet(resolvedSizes, cid, `resolvedSizes missing hstack child: ${cid}`);
            let childY;
            if (align === "middle") {
              childY = stackY + (h - cs.h) / 2;
            } else if (align === "bottom") {
              childY = stackY + h - cs.h;
            } else {
              // "top" (default)
              childY = stackY;
            }
            resolvedBounds.set(cid, { x: curX, y: childY, w: cs.w, h: cs.h });
            curX += cs.w + gap;
          }
        }

        // Main-axis alignment (hAlign): shift all children horizontally within the stack's width
        const hAlign = el.props.hAlign;
        if (hAlign && hAlign !== "left" && childIds.length > 0) {
          // Compute total content width: curX has advanced past the last child + one trailing gap
          const totalContentW = curX - stackX - (childIds.length > 0 ? gap : 0);
          // Only apply if the stack has an authored width larger than content
          const stackAuthW = authoredSpecs.get(id)?.props?.w;
          if (stackAuthW !== undefined && stackAuthW !== null && w > totalContentW) {
            const slack = w - totalContentW;
            const offsetX = hAlign === "center" ? slack / 2 : slack; // 'right'
            for (const cid of childIds) {
              const bounds = mustGet(resolvedBounds, cid, `resolvedBounds missing hstack child for hAlign: ${cid}`);
              resolvedBounds.set(cid, { x: bounds.x + offsetX, y: bounds.y, w: bounds.w, h: bounds.h });
            }
          }
        }
      }
    }
  }

  return { resolvedBounds, sortedOrder };
}

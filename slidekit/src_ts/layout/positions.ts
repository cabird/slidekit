// Phase 2: Position resolution via topological sort
// Extracted from layout.js

import { isRelMarker, getRelRef, resolveRelMarker } from './helpers.js';
import { resolveSpacing } from '../spacing.js';
import { resolveAnchor } from '../anchor.js';
import { measure } from '../measure.js';

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
export async function resolvePositions(flatMap, stackParent, stackChildren, resolvedSizes, authoredSpecs, warnings, errors) {
  const initialErrorCount = errors.length;

  // Build dependency graph
  // For each element, find what elements it depends on (via _rel markers on x and y)
  // Stack children depend on their parent stack (not on _rel markers — their position
  // is computed by the stack layout algorithm after the stack is positioned).
  const deps = new Map(); // id -> Set<refId>
  for (const [id, el] of flatMap) {
    const depSet = new Set();

    // Stack children depend on their parent stack
    if (stackParent.has(id)) {
      depSet.add(stackParent.get(id));
      // Warn if stack children have _rel markers on x/y — these are ignored
      // because stack layout determines children's positions.
      if (isRelMarker(el.props.x) || isRelMarker(el.props.y)) {
        warnings.push({
          type: "ignored_rel_on_stack_child",
          elementId: id,
          stackId: stackParent.get(id),
          message: `Element "${id}" is a child of stack "${stackParent.get(id)}", so its relative positioning markers on x/y are ignored. Use gap/align on the stack instead.`,
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
  const inDegree = new Map();
  for (const [id] of flatMap) {
    inDegree.set(id, 0);
  }
  for (const [id, depSet] of deps) {
    // id depends on each ref in depSet, so the edge is ref -> id
    // in-degree of id increases for each dependency
    inDegree.set(id, depSet.size);
  }

  // Queue starts with nodes that have in-degree 0
  const queue = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) {
      queue.push(id);
    }
  }

  // Build reverse adjacency: for each node, who depends on it
  const reverseDeps = new Map();
  for (const [id] of flatMap) {
    reverseDeps.set(id, []);
  }
  for (const [id, depSet] of deps) {
    for (const ref of depSet) {
      reverseDeps.get(ref).push(id);
    }
  }

  const sortedOrder = [];
  while (queue.length > 0) {
    const nodeId = queue.shift();
    sortedOrder.push(nodeId);
    // For each node that depends on this one, decrement its in-degree
    for (const dependent of reverseDeps.get(nodeId)) {
      const newDeg = inDegree.get(dependent) - 1;
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

  // Resolve positions in topological order
  // resolvedBounds: id -> { x, y, w, h } (top-left corner + dimensions)
  const resolvedBounds = new Map();

  for (const id of sortedOrder) {
    const el = flatMap.get(id);
    const sizes = resolvedSizes.get(id);
    const w = sizes.w;
    const h = sizes.h;

    // Stack children get their position from the stack layout algorithm,
    // not from their own x/y props. Skip them here — they are resolved
    // when we process their parent stack. However, if this child is
    // itself a stack (nested stack), we still need to let it position
    // its own children below, so we only skip the x/y resolution.
    let finalX, finalY;

    if (stackParent.has(id)) {
      if (resolvedBounds.has(id)) {
        // Already positioned by parent stack — use those coords
        finalX = resolvedBounds.get(id).x;
        finalY = resolvedBounds.get(id).y;
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
      let x;
      if (xIsRel) {
        const marker = el.props.x;
        if (marker._rel === "centerIn") {
          const r = marker.rect;
          x = r.x + r.w / 2 - w / 2;
        } else if (marker._rel === "between") {
          // P2.2: placeBetween on x-axis (left/right references)
          const leftBounds = resolvedBounds.get(marker.ref);
          const leftEdge = leftBounds.x + leftBounds.w;
          const rightEdge = typeof marker.ref2 === "string"
            ? resolvedBounds.get(marker.ref2).x
            : marker.ref2;
          const availableSlack = rightEdge - leftEdge - w;
          if (availableSlack < 0) {
            warnings.push({
              type: "between_no_fit",
              elementId: id,
              ref1: marker.ref,
              ref2: marker.ref2,
              message: `Element "${id}": does not fit between "${marker.ref}" and ${typeof marker.ref2 === "string" ? `"${marker.ref2}"` : marker.ref2}; using minimum gap fallback.`,
            });
            x = leftEdge + resolveSpacing("xs");
          } else {
            x = leftEdge + availableSlack * marker.bias;
          }
        } else {
          const refId = marker.ref;
          const refBounds = resolvedBounds.get(refId);
          x = resolveRelMarker(marker, "x", refBounds, w, h);
        }
      } else {
        x = el.props.x ?? 0;
      }

      // Resolve y
      const yIsRel = isRelMarker(el.props.y);
      let y;
      if (yIsRel) {
        const marker = el.props.y;
        if (marker._rel === "centerIn") {
          const r = marker.rect;
          y = r.y + r.h / 2 - h / 2;
        } else if (marker._rel === "between") {
          // P2.2: placeBetween — position between two vertical references
          const topBounds = resolvedBounds.get(marker.ref);
          const topEdge = topBounds.y + topBounds.h;
          const bottomEdge = typeof marker.ref2 === "string"
            ? resolvedBounds.get(marker.ref2).y
            : marker.ref2;
          const availableSlack = bottomEdge - topEdge - h;
          if (availableSlack < 0) {
            warnings.push({
              type: "between_no_fit",
              elementId: id,
              ref1: marker.ref,
              ref2: marker.ref2,
              message: `Element "${id}": does not fit between "${marker.ref}" and ${typeof marker.ref2 === "string" ? `"${marker.ref2}"` : marker.ref2}; using minimum gap fallback.`,
            });
            y = topEdge + resolveSpacing("xs");
          } else {
            y = topEdge + availableSlack * marker.bias;
          }
        } else {
          const refId = marker.ref;
          const refBounds = resolvedBounds.get(refId);
          y = resolveRelMarker(marker, "y", refBounds, w, h);
        }
      } else {
        y = el.props.y ?? 0;
      }

      // Apply anchor resolution ONLY to authored (non-_rel) coordinates.
      const anchor = el.props.anchor || "tl";
      const { left: anchoredX, top: anchoredY } = resolveAnchor(x, y, w, h, anchor);
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
            ? Math.max(...childIds.map(cid => resolvedSizes.get(cid).w))
            : 0;
          const stackAuthW = authoredSpecs.get(id)?.props?.w;
          const stretchW = (stackAuthW !== undefined && stackAuthW !== null) ? w : maxW;

          for (let i = 0; i < childIds.length; i++) {
            const cid = childIds[i];
            const cs = resolvedSizes.get(cid);
            // Warn if child had explicit w that differs
            const authoredW = authoredSpecs.get(cid).props.w;
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
            const childEl = flatMap.get(cid);
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
            const cs = resolvedSizes.get(cid);
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
      } else {
        // hstack
        const align = el.props.align || "top";
        let curX = stackX;

        if (align === "stretch") {
          // All children get the same height — the max measured height
          // (or the stack's own authored h if present)
          const maxH = childIds.length > 0
            ? Math.max(...childIds.map(cid => resolvedSizes.get(cid).h))
            : 0;
          const stackAuthH = authoredSpecs.get(id)?.props?.h;
          const stretchH = (stackAuthH !== undefined && stackAuthH !== null) ? h : maxH;

          for (let i = 0; i < childIds.length; i++) {
            const cid = childIds[i];
            const cs = resolvedSizes.get(cid);
            // Warn if child had explicit h that differs
            const authoredH = authoredSpecs.get(cid).props.h;
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
            const childEl = flatMap.get(cid);
            if (childEl && childEl._compound === 'panel' && childEl.children && childEl.children.length >= 1) {
              const bgRect = childEl.children[0];
              const bgSizes = resolvedSizes.get(bgRect.id);
              if (bgSizes) {
                bgSizes.h = stretchH;
              }
              const bgBounds = resolvedBounds.get(bgRect.id);
              if (bgBounds) {
                bgBounds.h = stretchH;
              }
            }
            curX += cs.w + gap;
          }
        } else {
          for (let i = 0; i < childIds.length; i++) {
            const cid = childIds[i];
            const cs = resolvedSizes.get(cid);
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
      }
    }
  }

  return { resolvedBounds, sortedOrder };
}

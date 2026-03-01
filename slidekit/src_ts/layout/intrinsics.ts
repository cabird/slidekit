// Phase 1: Intrinsic Size Resolution — extracted from layout.js
// Handles measuring elements, resolving percentages, stack sizes, panel auto-height, and hug bounds.

import { resolveSpacing } from '../spacing.js';
import { measure } from '../measure.js';
import { resolvePercentage } from '../utilities.js';
import { isRelMarker, deepClone } from './helpers.js';

/**
 * Compute the effective width and height for an element.
 *
 * For el() elements without an explicit `h`, calls measure() to
 * determine the height from rendered HTML content.
 *
 * @param {object} element - SlideKit element
 * @returns {Promise<{ w: number, h: number, _autoHeight: boolean }>}
 */
export async function getEffectiveDimensions(element) {
  const { props, type } = element;

  // Auto-height for el() elements
  if (type === "el" && (props.h === undefined || props.h === null)) {
    const html = element.content || "";
    if (!html && (!props.style || Object.keys(props.style).length === 0)) {
      return { w: props.w || 0, h: 0, _autoHeight: true };
    }
    const metrics = await measure(html, props);
    return { w: props.w || metrics.w, h: metrics.h, _autoHeight: true };
  }

  return { w: props.w || 0, h: props.h || 0, _autoHeight: false };
}

/**
 * Resolve intrinsic sizes for all elements in the flat map.
 *
 * This is Phase 1 of the layout pipeline:
 * - Stores authored specs (deep clones before modification)
 * - Resolves percentage sugar on x, y, w, h
 * - Validates _rel markers on w/h
 * - Measures non-stack elements via getEffectiveDimensions()
 * - Computes stack sizes bottom-up from children + gaps
 * - Handles panel auto-height (M7.3)
 * - Computes group hug bounds
 *
 * @param {Map} flatMap - id -> element map
 * @param {Map} stackChildren - stackId -> [childIds]
 * @param {Map} groupChildren - groupId -> [childIds]
 * @param {Array} errors - error accumulator (mutated)
 * @param {Array} warnings - warning accumulator (mutated)
 * @returns {Promise<{ authoredSpecs: Map, resolvedSizes: Map, hasErrors: boolean }>}
 */
export async function resolveIntrinsicSizes(flatMap, stackChildren, groupChildren, errors, warnings) {
  // Store authored specs (deep clone before any modification)
  const authoredSpecs = new Map();
  for (const [id, el] of flatMap) {
    authoredSpecs.set(id, {
      type: el.type,
      content: el.content,
      src: el.src,
      props: deepClone(el.props),
      children: el.children ? el.children.map(c => c.id) : undefined,
    });
  }

  // M8.3: Resolve percentage sugar on x, y, w, h before validation
  for (const [id, el] of flatMap) {
    if (typeof el.props.x === "string" && !isRelMarker(el.props.x)) {
      el.props.x = resolvePercentage(el.props.x, "x");
    }
    if (typeof el.props.y === "string" && !isRelMarker(el.props.y)) {
      el.props.y = resolvePercentage(el.props.y, "y");
    }
    if (typeof el.props.w === "string" && el.props.w !== "fill") {
      el.props.w = resolvePercentage(el.props.w, "w");
    }
    if (typeof el.props.h === "string" && el.props.h !== "fill") {
      el.props.h = resolvePercentage(el.props.h, "h");
    }
  }

  // Validate: _rel markers must only be on x and y, not w or h
  for (const [id, el] of flatMap) {
    if (isRelMarker(el.props.w)) {
      errors.push({
        type: "invalid_rel_on_dimension",
        elementId: id,
        property: "w",
        message: `Element "${id}": _rel marker on "w" is invalid. Deferred values are only valid on x and y.`,
      });
    }
    if (isRelMarker(el.props.h)) {
      errors.push({
        type: "invalid_rel_on_dimension",
        elementId: id,
        property: "h",
        message: `Element "${id}": _rel marker on "h" is invalid. Deferred values are only valid on x and y.`,
      });
    }
  }

  const resolvedSizes = new Map();

  // If there are errors from validation, return early
  if (errors.length > 0) {
    return { authoredSpecs, resolvedSizes, hasErrors: true };
  }

  // Resolve intrinsic sizes for all non-stack elements first
  for (const [id, el] of flatMap) {
    if (el.type === "vstack" || el.type === "hstack") continue; // handled below
    const dims = await getEffectiveDimensions(el);
    resolvedSizes.set(id, {
      w: dims.w,
      h: dims.h,
      wMeasured: el.type === "el" && (el.props.w === undefined || el.props.w === null),
      hMeasured: dims._autoHeight,
    });
  }

  // Compute stack sizes from children + gaps
  // Must handle nested stacks bottom-up. We do a simple iterative approach:
  // repeatedly process stacks whose children all have known sizes.
  const pendingStacks = new Set();
  for (const [id, el] of flatMap) {
    if (el.type === "vstack" || el.type === "hstack") {
      pendingStacks.add(id);
    }
  }

  let progress = true;
  while (pendingStacks.size > 0 && progress) {
    progress = false;
    for (const stackId of pendingStacks) {
      const el = flatMap.get(stackId);
      const childIds = stackChildren.get(stackId) || [];
      const gap = resolveSpacing(el.props.gap ?? 0);
      const stackW = el.props.w ?? 0;

      // Check all children have resolved sizes.
      // For panel compounds, also ensure the inner vstack has resolved so that
      // the panel's auto-height is available before the containing stack resolves.
      let allChildrenSized = true;
      for (const cid of childIds) {
        if (!resolvedSizes.has(cid)) {
          allChildrenSized = false;
          break;
        }
        const childEl = flatMap.get(cid);
        if (childEl && childEl._compound === "panel") {
          const config = childEl._panelConfig;
          if (!config) continue;
          const panelChildren = childEl.children || [];
          const childStack = panelChildren[1]; // [bgRect, vstack]
          if (childStack && !resolvedSizes.has(childStack.id)) {
            // Inner vstack hasn't resolved yet — can't compute panel auto-height
            allChildrenSized = false;
            break;
          }
          // Update panel group size from inner vstack (auto-height/width)
          if (childStack && resolvedSizes.has(childStack.id)) {
            const stackSizes = resolvedSizes.get(childStack.id);
            const autoH = config.panelH ?? (stackSizes.h + 2 * config.padding);
            const panelSizes = resolvedSizes.get(cid);
            panelSizes.h = autoH;
            if (config.panelW != null) panelSizes.w = config.panelW;
            // Also update bgRect height
            const bgRect = panelChildren[0];
            if (bgRect && resolvedSizes.has(bgRect.id)) {
              resolvedSizes.get(bgRect.id).h = autoH;
            }
          }
        }
      }
      if (!allChildrenSized) continue;

      if (el.type === "vstack") {
        // For vstack children without explicit w, default to stack's w
        for (const cid of childIds) {
          const child = flatMap.get(cid);
          if ((child.props.w === undefined || child.props.w === null) && stackW > 0) {
            // Update child's resolved size width to use stack width
            const childSize = resolvedSizes.get(cid);
            if (child.type === "el") {
              // Re-measure el() with the stack width constraint
              const html = child.content || "";
              if (html || (child.props.style && Object.keys(child.props.style).length > 0)) {
                const metrics = await measure(html, { ...child.props, w: stackW });
                childSize.w = stackW;
                childSize.h = metrics.h;
                childSize.hMeasured = true;
              } else {
                childSize.w = stackW;
              }
            } else {
              childSize.w = stackW;
            }
          }
        }

        // vstack total: width = max child width (or stack w), height = sum heights + gaps
        let totalH = 0;
        let maxW = 0;
        for (let i = 0; i < childIds.length; i++) {
          const cs = resolvedSizes.get(childIds[i]);
          totalH += cs.h;
          if (i > 0) totalH += gap;
          maxW = Math.max(maxW, cs.w);
        }
        const finalW = stackW || maxW;
        const finalH = (el.props.h !== undefined && el.props.h !== null) ? el.props.h : totalH;

        resolvedSizes.set(stackId, {
          w: finalW,
          h: finalH,
          wMeasured: false,
          hMeasured: el.props.h === undefined || el.props.h === null,
        });
      } else {
        // hstack
        const stackH = el.props.h ?? 0;

        // For hstack children without explicit h, default to stack's h (if provided)
        // hstack children can have their own w; if not provided, they stay as measured
        let totalW = 0;
        let maxH = 0;
        for (let i = 0; i < childIds.length; i++) {
          const cs = resolvedSizes.get(childIds[i]);
          totalW += cs.w;
          if (i > 0) totalW += gap;
          maxH = Math.max(maxH, cs.h);
        }
        const finalW = (el.props.w !== undefined && el.props.w !== null) ? el.props.w : totalW;
        const finalH = stackH || maxH;

        resolvedSizes.set(stackId, {
          w: finalW,
          h: finalH,
          wMeasured: el.props.w === undefined || el.props.w === null,
          hMeasured: el.props.h === undefined || el.props.h === null,
        });
      }

      pendingStacks.delete(stackId);
      progress = true;
    }
  }

  // If any stacks couldn't resolve (circular nesting), error out
  if (pendingStacks.size > 0) {
    errors.push({
      type: "unresolvable_stack_sizes",
      elementIds: Array.from(pendingStacks),
      message: `Could not resolve sizes for stacks: ${Array.from(pendingStacks).join(", ")}`,
    });
    return { authoredSpecs, resolvedSizes, hasErrors: true };
  }

  // Panel auto-height (M7.3)
  // For panel compounds: set the background rect height from the vstack height + 2*padding.
  // Also set the group's height so it participates correctly in other layouts.
  for (const [id, el] of flatMap) {
    if (el._compound !== "panel") continue;
    const config = el._panelConfig;
    if (!config) continue;

    const panelChildren = el.children || [];
    // Panel children: [bgRect, childStack]
    const bgRect = panelChildren[0];
    const childStack = panelChildren[1];
    if (!bgRect || !childStack) continue;

    const stackSizes = resolvedSizes.get(childStack.id);
    if (!stackSizes) continue;

    const autoH = config.panelH ?? (stackSizes.h + 2 * config.padding);

    // Update bg rect height
    if (resolvedSizes.has(bgRect.id)) {
      resolvedSizes.get(bgRect.id).h = autoH;
    }

    // Update group (panel) width and height
    if (resolvedSizes.has(id)) {
      const groupSizes = resolvedSizes.get(id);
      groupSizes.h = autoH;
      if (config.panelW) groupSizes.w = config.panelW;
    } else {
      resolvedSizes.set(id, {
        w: config.panelW || 0,
        h: autoH,
        wMeasured: false,
        hMeasured: config.panelH === undefined || config.panelH === null,
      });
    }
  }

  // bounds: 'hug' — compute group w/h from children bounding box
  for (const [id, el] of flatMap) {
    if (el.type !== "group" || el.props.bounds !== "hug") continue;
    // Skip compound groups (panel, figure) — they manage their own sizing
    if (el._compound) continue;
    const childIds = groupChildren.get(id);
    if (!childIds || childIds.length === 0) continue;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let validChildren = 0;
    for (const cid of childIds) {
      const child = flatMap.get(cid);
      const cs = resolvedSizes.get(cid);
      if (!cs) continue;
      const cx = child.props.x ?? 0;
      const cy = child.props.y ?? 0;
      // Skip children with _rel markers (unresolved at this phase)
      if (!Number.isFinite(cx) || !Number.isFinite(cy)) continue;
      minX = Math.min(minX, cx);
      minY = Math.min(minY, cy);
      maxX = Math.max(maxX, cx + cs.w);
      maxY = Math.max(maxY, cy + cs.h);
      validChildren++;
    }
    if (validChildren === 0) continue;
    const hugW = maxX - minX;
    const hugH = maxY - minY;

    if (resolvedSizes.has(id)) {
      const gs = resolvedSizes.get(id);
      gs.w = hugW;
      gs.h = hugH;
    } else {
      resolvedSizes.set(id, { w: hugW, h: hugH, wMeasured: false, hMeasured: false });
    }
  }

  return { authoredSpecs, resolvedSizes, hasErrors: false };
}

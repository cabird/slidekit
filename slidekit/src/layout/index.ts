// Layout Solve Pipeline — orchestrator
// Calls Phase 1 (intrinsics), Phase 2 (positions), Phase 2.5 (overflow),
// Phase 3 (transforms), and Phase 4 (finalize).

import { state } from '../state.js';
import { nextTransformId, applyTransform } from '../transforms.js';

import { deepClone, flattenElements } from './helpers.js';
import { checkOverflowPolicies } from './overflow.js';
import { resolveIntrinsicSizes } from './intrinsics.js';
import { resolvePositions } from './positions.js';
import { finalize } from './finalize.js';
import { isPanelElement } from '../types.js';
import type { SlideDefinition, LayoutResult, TransformMarker, Rect } from '../types.js';

/** Options for the layout pipeline. */
interface LayoutOptions {
  collisionThreshold?: number;
}

/**
 * Layout solve pipeline — 4-phase resolution.
 *
 * Phase 1: Resolve intrinsic sizes (measure text, compute stack dimensions)
 * Phase 2: Resolve positions via unified topological sort (stacks as nodes)
 * Phase 3: Apply transforms (placeholder for M6)
 * Phase 4: Finalize (collision detection, provenance, validation, scene graph)
 *
 * @param slideDefinition - A slide definition { elements, transforms, ... }
 * @param options - Layout options
 * @returns Scene graph: { elements, transforms, warnings, errors, collisions }
 */
export async function layout(slideDefinition: SlideDefinition, options: LayoutOptions = {}): Promise<LayoutResult> {
  const errors: Array<Record<string, unknown>> = [];
  const warnings: Array<Record<string, unknown>> = [];
  const elements = slideDefinition.elements || [];
  const transforms = slideDefinition.transforms || [];
  const collisionThreshold = options.collisionThreshold ?? 0;

  // Flatten elements to a map for easy lookup
  const { flatMap, groupParent, stackParent, stackChildren, groupChildren, panelInternals, duplicateIds } = flattenElements(elements);

  // Detect accidentally spread RelMarker objects (e.g. ...below() instead of y: below())
  for (const [id, el] of flatMap) {
    if (typeof el.props._rel === "string") {
      console.warn(
        `SlideKit warning: Element "${id}" has "_rel" as a top-level prop — this usually means a positioning function (below(), rightOf(), alignTopWith(), etc.) was spread (...below()) instead of assigned to x or y. Use y: below(...) or x: rightOf(...) instead.`
      );
    }
  }

  // Report duplicate IDs as errors — they silently clobber resolved positions
  for (const [id, count] of duplicateIds) {
    errors.push({
      type: 'duplicate-id',
      id,
      count,
      message: `Duplicate id '${id}': ${count} elements share this id. Each element must have a unique id.`,
    });
  }

  // =========================================================================
  // Phase 1: Resolve Intrinsic Sizes
  // =========================================================================

  const { authoredSpecs, resolvedSizes, hasErrors } = await resolveIntrinsicSizes(flatMap, stackChildren, groupChildren, errors, warnings);

  // If there are errors from Phase 1, return early
  if (hasErrors) {
    return {
      elements: {},
      transforms: deepClone(transforms),
      warnings,
      errors,
      collisions: [],
    };
  }

  // =========================================================================
  // Phase 2: Resolve Positions via Unified Topological Sort
  // =========================================================================

  const phase2Result = await resolvePositions(flatMap, stackParent, stackChildren, resolvedSizes, authoredSpecs, warnings, errors);

  if (!phase2Result) {
    return {
      elements: {},
      transforms: deepClone(transforms),
      warnings,
      errors,
      collisions: [],
    };
  }

  const { resolvedBounds, sortedOrder } = phase2Result;

  // =========================================================================
  // Phase 2.5: Overflow Policies
  // =========================================================================
  await checkOverflowPolicies(sortedOrder, flatMap, authoredSpecs, resolvedBounds, warnings, errors);

  // =========================================================================
  // Phase 3: Apply Transforms (M6)
  // =========================================================================
  // Process each transform in order, modifying resolved positions/sizes.
  // After applying a transform, update provenance to source: "transform".
  // Reset the transform ID counter for deterministic IDs.
  state.transformIdCounter = 0;

  // Re-assign transform IDs deterministically for this layout call
  const resolvedTransforms: TransformMarker[] = [];
  for (const t of transforms) {
    // Pass through null/invalid entries as-is — they'll be caught by validation below
    if (!t || typeof t !== "object") {
      resolvedTransforms.push(t as TransformMarker);
      continue;
    }
    // If the transform already has a _transformId, preserve it;
    // otherwise it will already have one from the factory function.
    const transformCopy = deepClone(t);
    if (!transformCopy._transformId) {
      transformCopy._transformId = nextTransformId();
    }
    resolvedTransforms.push(transformCopy);
  }

  // Capture bounds before any transforms for per-axis provenance comparison
  const preTransformBounds = new Map<string, Rect>();
  for (const [id, b] of resolvedBounds) {
    preTransformBounds.set(id, { x: b.x, y: b.y, w: b.w, h: b.h });
  }

  for (const t of resolvedTransforms) {
    // Validate transform object shape
    if (!t || typeof t._transform !== "string") {
      warnings.push({
        type: "invalid_transform_object",
        transform: t,
        message: "Invalid object in transforms array. Each transform must be created by a SlideKit transform function.",
      });
      continue;
    }

    const transformWarnings = applyTransform(t, resolvedBounds, flatMap);
    for (const w of transformWarnings) {
      warnings.push(w);
    }
  }

  // =========================================================================
  // Phase 3.5: Sync Panel Internals After Transforms
  // =========================================================================
  // When transforms (e.g. matchHeight) change a panel's resolved bounds,
  // propagate those changes into the panel's internal structure:
  // bgRect (background) and innerVstack (content container).
  for (const [id, el] of flatMap) {
    if (!isPanelElement(el)) continue;
    const config = el._panelConfig;
    if (!config) continue;

    const preBounds = preTransformBounds.get(id);
    const postBounds = resolvedBounds.get(id);
    if (!preBounds || !postBounds) continue;

    // Check if any dimension changed
    const hChanged = postBounds.h !== preBounds.h;
    const wChanged = postBounds.w !== preBounds.w;
    if (!hChanged && !wChanged) continue;

    const { padding } = config;
    const children = el.children || [];
    if (children.length < 2) continue;

    const bgRect = children[0];
    const innerVstack = children[1];

    // Sync bgRect to match panel bounds
    const bgBounds = resolvedBounds.get(bgRect.id);
    if (bgBounds) {
      bgBounds.x = postBounds.x;
      bgBounds.y = postBounds.y;
      bgBounds.w = postBounds.w;
      bgBounds.h = postBounds.h;
    }
    const bgSizes = resolvedSizes.get(bgRect.id);
    if (bgSizes) {
      bgSizes.w = postBounds.w;
      bgSizes.h = postBounds.h;
    }

    // Sync innerVstack container dimensions
    const vstackBounds = resolvedBounds.get(innerVstack.id);
    if (vstackBounds) {
      const newContentW = Math.max(0, postBounds.w - 2 * padding);
      const newContentH = Math.max(0, postBounds.h - 2 * padding);

      vstackBounds.x = postBounds.x + padding;
      vstackBounds.w = newContentW;

      // For vAlign: recompute y position of the vstack's children
      const vAlign = innerVstack.props?.vAlign;
      const vstackChildIds = stackChildren.get(innerVstack.id) || [];
      // Compute intrinsic content height from children
      const vstackGap = innerVstack.props?.gap as number || 0;
      let intrinsicH = 0;
      for (let ci = 0; ci < vstackChildIds.length; ci++) {
        const cBounds = resolvedBounds.get(vstackChildIds[ci]);
        if (cBounds) {
          intrinsicH += cBounds.h;
          if (ci > 0) intrinsicH += vstackGap;
        }
      }

      if (vAlign && vAlign !== 'top' && newContentH > intrinsicH) {
        // Undo the old vAlign offset and apply new one
        const oldContentH = Math.max(0, preBounds.h - 2 * padding);
        const oldSlack = Math.max(0, oldContentH - intrinsicH);
        const oldOffsetY = vAlign === 'center' ? oldSlack / 2 : oldSlack;
        const newSlack = newContentH - intrinsicH;
        const newOffsetY = vAlign === 'center' ? newSlack / 2 : newSlack;
        const deltaY = newOffsetY - oldOffsetY;

        for (const cid of vstackChildIds) {
          const cBounds = resolvedBounds.get(cid);
          if (cBounds) {
            cBounds.y += deltaY;
          }
        }
        vstackBounds.y = postBounds.y + padding;
        vstackBounds.h = newContentH;
      } else {
        // vAlign top or content exceeds available height: keep y, update h
        vstackBounds.y = postBounds.y + padding;
        vstackBounds.h = newContentH;
      }
    }

    // Warn if width changed — text wrapping may be invalidated
    if (wChanged) {
      warnings.push({
        type: 'transform_panel_width_changed',
        elementId: id,
        oldWidth: preBounds.w,
        newWidth: postBounds.w,
        message: `Panel "${id}" width changed by transform (${preBounds.w} → ${postBounds.w}). Text wrapping may be inaccurate — re-measurement cannot run after transforms.`,
      });
    }
  }

  // =========================================================================
  // Phase 4: Finalize
  // =========================================================================

  // Merge font warnings from initialization (clear after consuming to prevent
  // phantom re-reporting across multiple layout() calls within the same init)
  if (state.fontWarnings && state.fontWarnings.length > 0) {
    warnings.push(...state.fontWarnings);
    state.fontWarnings = [];
  }

  return finalize({
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
  });
}

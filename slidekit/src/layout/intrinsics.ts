// Phase 1: Intrinsic Size Resolution — extracted from layout.js
// Handles measuring elements, resolving percentages, stack sizes, panel auto-height, and hug bounds.
//
// Widths-first pipeline:
//   Step A: Authored specs + percentages + validation
//   Step B: Resolve intrinsic widths only (no heights yet)
//   Step C: Resolve width constraints (matchMaxWidth, matchWidthOf)
//   Step D: Measure auto-heights at finalized widths
//   Step E: Resolve height constraints (matchMaxHeight, matchHeightOf)

import { resolveSpacing } from '../spacing.js';
import { measure } from '../measure.js';
import { resolvePercentage } from '../utilities.js';
import { isRelMarker, deepClone } from './helpers.js';
import { mustGet } from '../assertions.js';
import { isPanelElement } from '../types.js';
import type { SlideElement, ResolvedSize, PositionValue, AuthoredSpec, RelMarker } from '../types.js';

/**
 * Compute the effective width for an element (Step B — widths only).
 *
 * For el() elements without explicit w, or with matchMaxWidth, calls
 * measure() with shrinkWrap to get natural width.
 *
 * Returns { w, wMeasured, hMeasured } — height is deferred to Step D.
 */
async function getEffectiveWidth(element: SlideElement): Promise<{ w: number; wMeasured: boolean; hMeasured: boolean }> {
  const { props, type } = element;

  const wRel = isRelMarker(props.w) ? (props.w as RelMarker)._rel : null;
  const hRel = isRelMarker(props.h) ? (props.h as RelMarker)._rel : null;
  const wIsDeferred = wRel === 'matchWidth';  // matchWidthOf — resolved in Step C
  const wIsMatchMax = wRel === 'matchMaxWidth';
  const hIsDeferred = hRel === 'matchHeight';
  const hIsMatchMax = hRel === 'matchMaxHeight';

  // Determine if this element will need auto-height measurement in Step D
  const needsAutoHeight = (props.h === undefined || props.h === null || hIsMatchMax) && !hIsDeferred;

  // Width resolution
  if (wIsDeferred) {
    // matchWidthOf: placeholder 0, resolved in Step C
    return { w: 0, wMeasured: false, hMeasured: needsAutoHeight };
  }

  if (wIsMatchMax) {
    // matchMaxWidth: measure with shrinkWrap to get natural width
    if (type === 'el') {
      const html = element.content || '';
      if (!html && (!props.style || Object.keys(props.style).length === 0)) {
        return { w: 0, wMeasured: true, hMeasured: needsAutoHeight };
      }
      const metrics = await measure(html, {
        style: props.style as Record<string, unknown> | undefined,
        className: props.className,
        shrinkWrap: true,
      });
      return { w: metrics.w, wMeasured: true, hMeasured: needsAutoHeight };
    }
    return { w: 0, wMeasured: true, hMeasured: needsAutoHeight };
  }

  if (typeof props.w === 'number') {
    return { w: props.w, wMeasured: false, hMeasured: needsAutoHeight };
  }

  // No explicit w — measure natural width for el(), else 0
  if (type === 'el') {
    const html = element.content || '';
    if (!html && (!props.style || Object.keys(props.style).length === 0)) {
      return { w: 0, wMeasured: true, hMeasured: needsAutoHeight };
    }
    const metrics = await measure(html, {
      style: props.style as Record<string, unknown> | undefined,
      className: props.className,
      shrinkWrap: true,
    });
    return { w: metrics.w, wMeasured: true, hMeasured: needsAutoHeight };
  }

  return { w: (props.w as number) || 0, wMeasured: false, hMeasured: needsAutoHeight };
}

/**
 * Compute the effective width and height for an element.
 *
 * For el() elements without an explicit `h`, calls measure() to
 * determine the height from rendered HTML content.
 *
 * @param {object} element - SlideKit element
 * @returns {Promise<{ w: number, h: number, _autoHeight: boolean }>}
 */
export async function getEffectiveDimensions(element: SlideElement): Promise<{ w: number; h: number; _autoHeight: boolean }> {
  const { props, type } = element;

  // Dimension constraints: matchWidth/matchHeight are deferred (use 0 placeholder).
  // matchMaxWidth/matchMaxHeight still measure normally — the max is applied later.
  const wRel = isRelMarker(props.w) ? (props.w as RelMarker)._rel : null;
  const hRel = isRelMarker(props.h) ? (props.h as RelMarker)._rel : null;
  const wIsDeferred = wRel === 'matchWidth';  // matchMax measures normally
  const hIsDeferred = hRel === 'matchHeight';
  const wIsMatchMax = wRel === 'matchMaxWidth';
  const hIsMatchMax = hRel === 'matchMaxHeight';
  const effectiveW = wIsDeferred ? 0 : (wIsMatchMax ? 0 : (props.w as number) || 0);
  const effectiveH = hIsDeferred ? 0 : (hIsMatchMax ? 0 : (props.h as number) || 0);

  // Auto-measure for el() elements when h or w needs measurement.
  // matchMax elements need their natural measured size so the group max can be computed.
  const needsAutoHeight = props.h === undefined || props.h === null || hIsMatchMax;
  const needsAutoWidth = wIsMatchMax;
  if (type === "el" && !hIsDeferred && (needsAutoHeight || needsAutoWidth)) {
    const html = element.content || "";
    const measureW = (wIsDeferred || wIsMatchMax) ? undefined : (props.w as number | undefined);
    if (!html && (!props.style || Object.keys(props.style).length === 0)) {
      return { w: effectiveW, h: 0, _autoHeight: needsAutoHeight };
    }
    const metrics = await measure(html, { w: measureW, style: props.style as Record<string, unknown> | undefined, className: props.className, shrinkWrap: needsAutoWidth });
    const resolvedW = needsAutoWidth ? metrics.w : (effectiveW || metrics.w);
    const resolvedH = needsAutoHeight ? metrics.h : effectiveH;
    return { w: resolvedW, h: resolvedH, _autoHeight: needsAutoHeight };
  }

  return { w: effectiveW, h: effectiveH, _autoHeight: false };
}

/**
 * Resolve intrinsic sizes for all elements in the flat map.
 *
 * This is Phase 1 of the layout pipeline, using a widths-first approach:
 *   Step A: Stores authored specs, resolves percentages, validates markers
 *   Step B: Resolve intrinsic widths only (no heights)
 *   Step C: Resolve width constraints (matchMaxWidth groups, matchWidthOf chains)
 *   Step D: Measure auto-heights at finalized widths
 *   Step E: Resolve height constraints (matchMaxHeight groups, matchHeightOf chains)
 *
 * @param {Map} flatMap - id -> element map
 * @param {Map} stackChildren - stackId -> [childIds]
 * @param {Map} groupChildren - groupId -> [childIds]
 * @param {Array} errors - error accumulator (mutated)
 * @param {Array} warnings - warning accumulator (mutated)
 * @returns {Promise<{ authoredSpecs: Map, resolvedSizes: Map, hasErrors: boolean }>}
 */
/** Result of Phase 1: intrinsic size resolution. */
export interface IntrinsicSizeResult {
  authoredSpecs: Map<string, AuthoredSpec>;
  resolvedSizes: Map<string, ResolvedSize>;
  hasErrors: boolean;
}

export async function resolveIntrinsicSizes(
  flatMap: Map<string, SlideElement>,
  stackChildren: Map<string, string[]>,
  groupChildren: Map<string, string[]>,
  errors: Array<Record<string, unknown>>,
  _warnings: Array<Record<string, unknown>>,
): Promise<IntrinsicSizeResult> {
  // =========================================================================
  // Step A: Authored specs + percentages + validation
  // =========================================================================

  // Store authored specs (deep clone before any modification)
  const authoredSpecs = new Map<string, AuthoredSpec>();
  for (const [id, el] of flatMap) {
    const spec: AuthoredSpec = {
      type: el.type,
      props: deepClone(el.props),
    };
    if (el.type === "el") {
      spec.content = el.content;
    }
    if ('children' in el && el.children) {
      spec.children = el.children.map((c: SlideElement) => c.id);
    }
    authoredSpecs.set(id, spec);
  }

  // M8.3: Resolve percentage sugar on x, y, w, h before validation
  for (const [_id, el] of flatMap) {
    if (typeof el.props.x === "string" && !isRelMarker(el.props.x)) {
      el.props.x = resolvePercentage(el.props.x, "x") as PositionValue;
    }
    if (typeof el.props.y === "string" && !isRelMarker(el.props.y)) {
      el.props.y = resolvePercentage(el.props.y, "y") as PositionValue;
    }
    if (typeof el.props.w === "string" && el.props.w !== "fill") {
      el.props.w = resolvePercentage(el.props.w, "w");
    }
    if (typeof el.props.h === "string" && el.props.h !== "fill") {
      el.props.h = resolvePercentage(el.props.h, "h");
    }
  }

  // Validate: _rel markers must only be on x and y, not w or h
  // Exception: dimension constraints (matchWidth, matchHeight, matchMaxWidth, matchMaxHeight)
  const VALID_W_RELS = new Set(['matchWidth', 'matchMaxWidth']);
  const VALID_H_RELS = new Set(['matchHeight', 'matchMaxHeight']);
  for (const [id, el] of flatMap) {
    if (isRelMarker(el.props.w) && !VALID_W_RELS.has((el.props.w as { _rel: string })._rel)) {
      errors.push({
        type: "invalid_rel_on_dimension",
        elementId: id,
        property: "w",
        message: `Element "${id}": _rel marker on "w" is invalid. Only matchWidthOf() or matchMaxWidth() are valid on w.`,
      });
    }
    if (isRelMarker(el.props.h) && !VALID_H_RELS.has((el.props.h as { _rel: string })._rel)) {
      errors.push({
        type: "invalid_rel_on_dimension",
        elementId: id,
        property: "h",
        message: `Element "${id}": _rel marker on "h" is invalid. Only matchHeightOf() or matchMaxHeight() are valid on h.`,
      });
    }
  }

  const resolvedSizes = new Map<string, ResolvedSize>();

  // If there are errors from validation, return early
  if (errors.length > 0) {
    return { authoredSpecs, resolvedSizes, hasErrors: true };
  }

  // =========================================================================
  // Step B: Resolve intrinsic widths only (no heights yet)
  // =========================================================================

  // Resolve widths for all non-stack elements
  for (const [id, el] of flatMap) {
    if (el.type === "vstack" || el.type === "hstack") continue; // handled below
    const widthInfo = await getEffectiveWidth(el);
    resolvedSizes.set(id, {
      w: widthInfo.w,
      h: 0,  // placeholder — resolved in Step D
      wMeasured: widthInfo.wMeasured,
      hMeasured: widthInfo.hMeasured,
    });
  }

  // Compute stack widths bottom-up (no heights yet)
  const pendingStacks = new Set<string>();
  for (const [id, el] of flatMap) {
    if (el.type === "vstack" || el.type === "hstack") {
      pendingStacks.add(id);
    }
  }

  let progress = true;
  while (pendingStacks.size > 0 && progress) {
    progress = false;
    for (const stackId of pendingStacks) {
      const el = mustGet(flatMap, stackId, `flatMap missing stack: ${stackId}`);
      const childIds = stackChildren.get(stackId) || [];
      const stackW = (el.props.w ?? 0) as number;

      // Check all children have resolved sizes (widths at this point)
      let allChildrenSized = true;
      for (const cid of childIds) {
        if (!resolvedSizes.has(cid)) {
          allChildrenSized = false;
          break;
        }
        // For panel compounds, also ensure the inner vstack has resolved
        const childEl = mustGet(flatMap, cid, `flatMap missing stack child: ${cid}`);
        if (isPanelElement(childEl)) {
          const config = childEl._panelConfig;
          if (!config) continue;
          const panelChildren = childEl.children || [];
          const childStack = panelChildren[1]; // [bgRect, vstack]
          if (childStack && !resolvedSizes.has(childStack.id)) {
            allChildrenSized = false;
            break;
          }
          // Update panel group width from config if specified
          if (childStack && resolvedSizes.has(childStack.id)) {
            const panelSizes = mustGet(resolvedSizes, cid, `resolvedSizes missing panel: ${cid}`);
            if (config.panelW != null) panelSizes.w = config.panelW;
          }
        }
      }
      if (!allChildrenSized) continue;

      if (el.type === "vstack") {
        // Width inheritance: vstack children without explicit w get stack's width
        for (const cid of childIds) {
          const child = mustGet(flatMap, cid, `flatMap missing vstack child: ${cid}`);
          if ((child.props.w === undefined || child.props.w === null) && stackW > 0) {
            const childSize = mustGet(resolvedSizes, cid, `resolvedSizes missing vstack child: ${cid}`);
            childSize.w = stackW;
            // hMeasured is already flagged — actual height measurement happens in Step D
          }
        }

        // vstack width = max child width (or stack w)
        let maxW = 0;
        for (const cid of childIds) {
          const cs = mustGet(resolvedSizes, cid, `resolvedSizes missing vstack child: ${cid}`);
          maxW = Math.max(maxW, cs.w);
        }
        const finalW = stackW || maxW;

        resolvedSizes.set(stackId, {
          w: finalW,
          h: 0,  // placeholder — resolved in Step D
          wMeasured: false,
          hMeasured: el.props.h === undefined || el.props.h === null,
        });
      } else {
        // hstack width = sum child widths + gaps, or authored w
        const gap = resolveSpacing(el.props.gap as string | number ?? 0);
        let totalW = 0;
        for (let i = 0; i < childIds.length; i++) {
          const cs = mustGet(resolvedSizes, childIds[i], `resolvedSizes missing hstack child: ${childIds[i]}`);
          totalW += cs.w;
          if (i > 0) totalW += gap;
        }
        const finalW = (el.props.w !== undefined && el.props.w !== null) ? (el.props.w as number) : totalW;

        resolvedSizes.set(stackId, {
          w: finalW,
          h: 0,  // placeholder — resolved in Step D
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

  // =========================================================================
  // Step C: Resolve width constraints (matchMaxWidth, matchWidthOf)
  // =========================================================================

  // matchMaxWidth groups: find max width, apply to all members
  const maxWidthGroups = new Map<string, string[]>();
  for (const [id, el] of flatMap) {
    if (isRelMarker(el.props.w) && (el.props.w as RelMarker)._rel === 'matchMaxWidth') {
      const group = (el.props.w as RelMarker).group!;
      if (!maxWidthGroups.has(group)) maxWidthGroups.set(group, []);
      maxWidthGroups.get(group)!.push(id);
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
  }

  // matchWidthOf: copy referenced element's width
  // Build a width-only dependency graph and topo sort for chains (A→B→C)
  const matchWidthElements = new Map<string, string>(); // id -> refId
  for (const [id, el] of flatMap) {
    if (isRelMarker(el.props.w) && (el.props.w as RelMarker)._rel === 'matchWidth') {
      const refId = (el.props.w as RelMarker).ref!;
      if (!flatMap.has(refId)) {
        errors.push({
          type: "unknown_ref",
          elementId: id,
          property: "w",
          ref: refId,
          message: `Element "${id}": w references unknown element "${refId}"`,
        });
        continue;
      }
      matchWidthElements.set(id, refId);
    }
  }
  if (errors.length > 0) {
    return { authoredSpecs, resolvedSizes, hasErrors: true };
  }
  if (matchWidthElements.size > 0) {
    // Topo sort the matchWidthOf chain
    const widthDeps = new Map<string, Set<string>>();
    const allWidthIds = new Set<string>();
    for (const [id, refId] of matchWidthElements) {
      allWidthIds.add(id);
      allWidthIds.add(refId);
      if (!widthDeps.has(id)) widthDeps.set(id, new Set());
      widthDeps.get(id)!.add(refId);
    }
    // Elements without matchWidthOf deps
    for (const id of allWidthIds) {
      if (!widthDeps.has(id)) widthDeps.set(id, new Set());
    }
    // Simple topo sort
    const widthOrder: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();
    function visitWidth(id: string): boolean {
      if (visited.has(id)) return true;
      if (visiting.has(id)) {
        errors.push({
          type: "circular_dependency",
          elementId: id,
          property: "w",
          message: `Element "${id}": circular matchWidthOf dependency detected`,
        });
        return false;
      }
      visiting.add(id);
      for (const dep of widthDeps.get(id) || []) {
        if (!visitWidth(dep)) return false;
      }
      visiting.delete(id);
      visited.add(id);
      widthOrder.push(id);
      return true;
    }
    for (const id of allWidthIds) {
      visitWidth(id);
    }
    // Apply in topo order
    for (const id of widthOrder) {
      const refId = matchWidthElements.get(id);
      if (!refId) continue;
      const refSizes = resolvedSizes.get(refId);
      const sizes = resolvedSizes.get(id);
      if (refSizes && sizes) {
        sizes.w = refSizes.w;
      }
    }
  }

  // =========================================================================
  // Step D: Measure auto-heights at finalized widths
  // =========================================================================

  // Measure heights for non-stack elements with hMeasured=true
  for (const [id, el] of flatMap) {
    if (el.type === "vstack" || el.type === "hstack") continue;
    const sizes = resolvedSizes.get(id);
    if (!sizes) continue;

    if (sizes.hMeasured && el.type === 'el') {
      const html = el.content || '';
      if (!html && (!el.props.style || Object.keys(el.props.style).length === 0)) {
        sizes.h = 0;
        continue;
      }
      const metrics = await measure(html, {
        w: sizes.w ?? undefined,
        style: el.props.style as Record<string, unknown> | undefined,
        className: el.props.className,
      });
      sizes.h = metrics.h;
    } else if (!sizes.hMeasured) {
      // Explicit height — resolve it now
      const hRel = isRelMarker(el.props.h) ? (el.props.h as RelMarker)._rel : null;
      const hIsDeferred = hRel === 'matchHeight';
      const hIsMatchMax = hRel === 'matchMaxHeight';
      if (hIsDeferred) {
        sizes.h = 0; // resolved in Step E
      } else if (hIsMatchMax) {
        sizes.h = 0; // resolved in Step E
      } else {
        sizes.h = (el.props.h as number) || 0;
      }
    }
  }

  // Recompute stack heights bottom-up
  const pendingStacksH = new Set<string>();
  for (const [id, el] of flatMap) {
    if (el.type === "vstack" || el.type === "hstack") {
      pendingStacksH.add(id);
    }
  }

  progress = true;
  while (pendingStacksH.size > 0 && progress) {
    progress = false;
    for (const stackId of pendingStacksH) {
      const el = mustGet(flatMap, stackId, `flatMap missing stack: ${stackId}`);
      const childIds = stackChildren.get(stackId) || [];
      const gap = resolveSpacing(el.props.gap as string | number ?? 0);

      // Check all children have non-zero heights (or are genuinely empty)
      let allChildrenReady = true;
      for (const cid of childIds) {
        if (!resolvedSizes.has(cid)) {
          allChildrenReady = false;
          break;
        }
        const childEl = mustGet(flatMap, cid, `flatMap missing stack child: ${cid}`);
        if (isPanelElement(childEl)) {
          const config = childEl._panelConfig;
          if (!config) continue;
          const panelChildren = childEl.children || [];
          const childStack = panelChildren[1];
          if (childStack && !resolvedSizes.has(childStack.id)) {
            allChildrenReady = false;
            break;
          }
          // If the inner vstack is resolved but the stack itself hasn't computed
          // its height yet, we need to wait
          if (childStack && (childEl.children![1].type === 'vstack' || childEl.children![1].type === 'hstack')) {
            if (pendingStacksH.has(childStack.id)) {
              allChildrenReady = false;
              break;
            }
          }
          // Update panel auto-height from inner vstack
          if (childStack && resolvedSizes.has(childStack.id)) {
            const stackSizes = resolvedSizes.get(childStack.id)!;
            const autoH = config.panelH ?? (stackSizes.h + 2 * config.padding);
            const panelSizes = mustGet(resolvedSizes, cid, `resolvedSizes missing panel: ${cid}`);
            panelSizes.h = autoH;
            if (config.panelW != null) panelSizes.w = config.panelW;
            // Also update bgRect height
            const bgRect = panelChildren[0];
            if (bgRect && resolvedSizes.has(bgRect.id)) {
              resolvedSizes.get(bgRect.id)!.h = autoH;
            }
          }
        }
      }
      if (!allChildrenReady) continue;

      const stackSizes = mustGet(resolvedSizes, stackId, `resolvedSizes missing stack: ${stackId}`);

      if (el.type === "vstack") {
        // vstack height = sum children heights + gaps
        let totalH = 0;
        let maxW = 0;
        for (let i = 0; i < childIds.length; i++) {
          const cs = mustGet(resolvedSizes, childIds[i], `resolvedSizes missing vstack child: ${childIds[i]}`);
          totalH += cs.h;
          if (i > 0) totalH += gap;
          maxW = Math.max(maxW, cs.w);
        }
        const finalH = (el.props.h !== undefined && el.props.h !== null) ? (el.props.h as number) : totalH;
        stackSizes.h = finalH;
        // Also update width if it was derived from children
        const stackW = (el.props.w ?? 0) as number;
        if (!stackW && maxW > stackSizes.w) {
          stackSizes.w = maxW;
        }
      } else {
        // hstack height = max child height, or authored h
        const stackH = (el.props.h as number) ?? 0;
        let maxH = 0;
        for (const cid of childIds) {
          const cs = mustGet(resolvedSizes, cid, `resolvedSizes missing hstack child: ${cid}`);
          maxH = Math.max(maxH, cs.h);
        }
        stackSizes.h = stackH || maxH;
      }

      pendingStacksH.delete(stackId);
      progress = true;
    }
  }

  // Panel auto-height (M7.3)
  for (const [id, el] of flatMap) {
    if (!isPanelElement(el)) continue;
    const config = el._panelConfig;
    if (!config) continue;

    const panelChildren = el.children || [];
    const bgRect = panelChildren[0];
    const childStack = panelChildren[1];
    if (!bgRect || !childStack) continue;

    const stackSizes = resolvedSizes.get(childStack.id);
    if (!stackSizes) continue;

    const autoH = config.panelH ?? (stackSizes.h + 2 * config.padding);

    // Update bg rect height
    if (resolvedSizes.has(bgRect.id)) {
      resolvedSizes.get(bgRect.id)!.h = autoH;
    }

    // Update group (panel) width and height
    if (resolvedSizes.has(id)) {
      const groupSizes = resolvedSizes.get(id)!;
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
      const child = mustGet(flatMap, cid, `flatMap missing group child: ${cid}`);
      const cs = resolvedSizes.get(cid);
      if (!cs) continue;
      const cx = (child.props.x ?? 0) as number;
      const cy = (child.props.y ?? 0) as number;
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
      const gs = resolvedSizes.get(id)!;
      gs.w = hugW;
      gs.h = hugH;
    } else {
      resolvedSizes.set(id, { w: hugW, h: hugH, wMeasured: false, hMeasured: false });
    }
  }

  // =========================================================================
  // Step E: Resolve height constraints (matchMaxHeight, matchHeightOf)
  // =========================================================================

  // matchMaxHeight groups: find max height, apply to all members
  const maxHeightGroups = new Map<string, string[]>();
  for (const [id, el] of flatMap) {
    if (isRelMarker(el.props.h) && (el.props.h as RelMarker)._rel === 'matchMaxHeight') {
      const group = (el.props.h as RelMarker).group!;
      if (!maxHeightGroups.has(group)) maxHeightGroups.set(group, []);
      maxHeightGroups.get(group)!.push(id);
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

  // matchHeightOf: copy referenced element's height
  const matchHeightElements = new Map<string, string>(); // id -> refId
  for (const [id, el] of flatMap) {
    if (isRelMarker(el.props.h) && (el.props.h as RelMarker)._rel === 'matchHeight') {
      const refId = (el.props.h as RelMarker).ref!;
      if (!flatMap.has(refId)) {
        errors.push({
          type: "unknown_ref",
          elementId: id,
          property: "h",
          ref: refId,
          message: `Element "${id}": h references unknown element "${refId}"`,
        });
        continue;
      }
      matchHeightElements.set(id, refId);
    }
  }
  if (errors.length > 0) {
    return { authoredSpecs, resolvedSizes, hasErrors: true };
  }
  if (matchHeightElements.size > 0) {
    // Topo sort the matchHeightOf chain
    const heightDeps = new Map<string, Set<string>>();
    const allHeightIds = new Set<string>();
    for (const [id, refId] of matchHeightElements) {
      allHeightIds.add(id);
      allHeightIds.add(refId);
      if (!heightDeps.has(id)) heightDeps.set(id, new Set());
      heightDeps.get(id)!.add(refId);
    }
    for (const id of allHeightIds) {
      if (!heightDeps.has(id)) heightDeps.set(id, new Set());
    }
    const heightOrder: string[] = [];
    const visitedH = new Set<string>();
    const visitingH = new Set<string>();
    function visitHeight(id: string): boolean {
      if (visitedH.has(id)) return true;
      if (visitingH.has(id)) {
        errors.push({
          type: "circular_dependency",
          elementId: id,
          property: "h",
          message: `Element "${id}": circular matchHeightOf dependency detected`,
        });
        return false;
      }
      visitingH.add(id);
      for (const dep of heightDeps.get(id) || []) {
        if (!visitHeight(dep)) return false;
      }
      visitingH.delete(id);
      visitedH.add(id);
      heightOrder.push(id);
      return true;
    }
    for (const id of allHeightIds) {
      visitHeight(id);
    }
    for (const id of heightOrder) {
      const refId = matchHeightElements.get(id);
      if (!refId) continue;
      const refSizes = resolvedSizes.get(refId);
      const sizes = resolvedSizes.get(id);
      if (refSizes && sizes) {
        sizes.h = refSizes.h;
      }
    }
  }

  return { authoredSpecs, resolvedSizes, hasErrors: false };
}

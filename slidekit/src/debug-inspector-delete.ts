// Debug Inspector Delete — Delete element with cascade handling
//
// Handles:
//  - Breaking incoming constraints (other elements referencing the deleted one)
//  - Removing connectors that reference the deleted element
//  - Recursive deletion of compound children (panels, figures)
//  - Undo/redo via CompoundUndoEntry with mixed UndoEntry + ElementUndoEntry

import { debugController } from './debug-state.js';
import type { UndoEntry, ElementUndoEntry, CompoundUndoEntry } from './debug-state.js';
import { applyElementAction } from './debug-inspector-edit.js';
import { updateDiffDirtyIndicator } from './debug-inspector-diff.js';
import { clearConstraintSelection } from './debug-inspector-constraint.js';
import { flattenElements } from './layout/helpers.js';
import type { SlideDefinition, SlideElement, LayoutResult } from './types.js';

// =============================================================================
// deleteElement
// =============================================================================

/**
 * Delete an element from the slide definition with full cascade handling.
 *
 * 1. Collect the deletion set (element + descendants for compounds)
 * 2. Break incoming constraints from surviving elements
 * 3. Remove connectors referencing the deletion set
 * 4. Remove the element from its parent
 * 5. Push a CompoundUndoEntry covering all changes
 */
export async function deleteElement(
  elementId: string,
  slideIndex: number,
): Promise<void> {
  const sk = (window as any).sk;
  if (!sk?._definitions?.[slideIndex] || !sk?.layouts?.[slideIndex]) return;

  const definition: SlideDefinition = sk._definitions[slideIndex];
  const layoutResult: LayoutResult = sk.layouts[slideIndex];
  const sceneElements = layoutResult.elements;

  const {
    flatMap, groupParent, stackParent,
    groupChildren, stackChildren, panelInternals,
  } = flattenElements(definition.elements);

  // Guard: don't delete internal/synthetic elements (panel bgRect, childStack, etc.)
  if (panelInternals.has(elementId)) return;

  // Guard: element must exist
  const element = flatMap.get(elementId);
  if (!element) return;

  // Compute element location up-front BEFORE any mutations, so we never
  // partially mutate and then fail to find the element for removal.
  const parentId = groupParent.get(elementId) ?? stackParent.get(elementId) ?? null;
  const parentChildren = parentId
    ? (flatMap.get(parentId) as any)?.children as SlideElement[] | undefined
    : definition.elements;
  const elementIndex = parentChildren?.findIndex(c => c.id === elementId) ?? -1;
  if (elementIndex === -1) return;

  // -------------------------------------------------------------------------
  // 1. Build deletion set (element + all descendants for groups/compounds)
  // -------------------------------------------------------------------------
  const deletionSet = new Set<string>();
  const collectDescendants = (id: string) => {
    deletionSet.add(id);
    const gKids = groupChildren.get(id);
    if (gKids) for (const kid of gKids) collectDescendants(kid);
    const sKids = stackChildren.get(id);
    if (sKids) for (const kid of sKids) collectDescendants(kid);
  };
  collectDescendants(elementId);

  // -------------------------------------------------------------------------
  // 2. Find incoming constraints from surviving elements
  // -------------------------------------------------------------------------
  const constraintBreaks: UndoEntry[] = [];

  for (const [id, sceneEl] of Object.entries(sceneElements)) {
    if (deletionSet.has(id)) continue;
    if (!sceneEl?.resolved) continue;
    for (const axis of ['x', 'y'] as const) {
      const p = sceneEl.provenance?.[axis];
      if (!p || p.source !== 'constraint') continue;

      const refHit = p.ref && deletionSet.has(p.ref);
      const ref2Hit = typeof p.ref2 === 'string' && deletionSet.has(p.ref2);

      if (refHit || ref2Hit) {
        // Break this constraint — set to resolved absolute position
        const defEl = flatMap.get(id);
        if (!defEl) continue;

        const props = defEl.props as Record<string, unknown>;
        const oldValue = JSON.parse(JSON.stringify(props[axis]));
        const resolvedPos = sceneEl.resolved[axis];
        if (typeof resolvedPos !== 'number') continue;

        props[axis] = resolvedPos;
        constraintBreaks.push({
          elementId: id,
          propKey: axis,
          oldValue,
          newValue: resolvedPos,
          slideIndex,
        });
      }
    }
  }

  // -------------------------------------------------------------------------
  // 3. Find referencing connectors
  // -------------------------------------------------------------------------
  const connectorRemovals: ElementUndoEntry[] = [];

  for (const [id, el] of flatMap) {
    if (deletionSet.has(id)) continue;
    if (el.type !== 'connector') continue;

    const props = el.props as Record<string, unknown>;
    if (deletionSet.has(props.fromId as string) || deletionSet.has(props.toId as string)) {
      // Find this connector's position in its parent
      const connParentId = groupParent.get(id) ?? stackParent.get(id) ?? null;
      const connParentChildren = connParentId
        ? (flatMap.get(connParentId) as any)?.children as SlideElement[] | undefined
        : definition.elements;
      const connIndex = connParentChildren?.findIndex(c => c.id === id) ?? -1;
      if (connIndex === -1) continue;

      connectorRemovals.push({
        action: 'remove',
        element: JSON.parse(JSON.stringify(el)),
        parentId: connParentId,
        index: connIndex,
        slideIndex,
      });
    }
  }

  // -------------------------------------------------------------------------
  // 4. Clear selection state BEFORE mutations
  // -------------------------------------------------------------------------
  const s = debugController.state;
  s.selectedElementId = null;
  s.selectedConstraint = null;
  s.editingPropKey = null;
  s.editInputElement = null;
  clearConstraintSelection();

  // -------------------------------------------------------------------------
  // 5. Remove connectors from definition (reverse order to preserve indices)
  // -------------------------------------------------------------------------
  // Sort by index descending within same parent to avoid index shifts
  connectorRemovals.sort((a, b) => {
    if (a.parentId === b.parentId) return b.index - a.index;
    return 0;
  });
  for (const entry of connectorRemovals) {
    applyElementAction(entry);
  }

  // -------------------------------------------------------------------------
  // 6. Remove the element itself
  // -------------------------------------------------------------------------
  // parentId and elementIndex were computed up-front before any mutations.
  // applyElementAction removes by ID, so index shifts from connector
  // removals don't affect correctness. The stored index is used for undo
  // reinsertion at the original position.
  const elementRemoval: ElementUndoEntry = {
    action: 'remove',
    element: JSON.parse(JSON.stringify(element)),
    parentId,
    index: elementIndex,
    slideIndex,
  };
  applyElementAction(elementRemoval);

  // -------------------------------------------------------------------------
  // 7. Build CompoundUndoEntry
  // -------------------------------------------------------------------------
  const compound: CompoundUndoEntry = {
    compound: true,
    entries: [
      ...constraintBreaks,
      ...connectorRemovals,
      elementRemoval,
    ],
  };
  s.undoStack.push(compound);
  s.redoStack.length = 0;

  // -------------------------------------------------------------------------
  // 8. Re-layout + refresh UI
  // -------------------------------------------------------------------------
  const rerender = sk._rerenderSlide as (i: number, d: SlideDefinition) => Promise<LayoutResult>;
  if (rerender) {
    await rerender(slideIndex, definition);
  }

  if (s.debugOverlay) {
    debugController.callbacks.renderDebugOverlay?.({ slideIndex, showInspector: false });
  }

  // Show empty inspector state
  const body = s.inspectorPanel?.querySelector('[data-sk-inspector-body]') as HTMLElement | null;
  if (body) {
    body.innerHTML = '<div style="padding:24px 16px;color:#888;text-align:center;font-style:italic;">No element selected</div>';
  }

  updateDiffDirtyIndicator();
}

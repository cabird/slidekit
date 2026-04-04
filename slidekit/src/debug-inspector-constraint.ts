// Debug Inspector — Constraint detail panel, break, type change, highlight
//
// Renders a constraint detail panel when a constraint arrow is clicked.
// Supports breaking (deleting) constraints and changing their type.

import { debugController } from './debug-state.js';
import type { CompoundUndoEntry } from './debug-state.js';
import { createSection } from './debug-inspector.js';
import { escapeHtml, badge } from './debug-inspector-styles.js';
import { updateDiffDirtyIndicator } from './debug-inspector-diff.js';
import { flattenElements } from './layout/helpers.js';
import type { SlideDefinition, SlideElement, RelMarker, LayoutResult } from './types.js';

// =============================================================================
// Axis ↔ type mapping
// =============================================================================

export const Y_AXIS_TYPES = ['below', 'above', 'centerV', 'alignTop', 'alignBottom', 'centerVSlide'] as const;
export const X_AXIS_TYPES = ['rightOf', 'leftOf', 'centerH', 'alignLeft', 'alignRight', 'centerHSlide'] as const;
export const W_AXIS_TYPES = ['matchWidth', 'matchMaxWidth'] as const;
export const H_AXIS_TYPES = ['matchHeight', 'matchMaxHeight'] as const;

/** Types that have an editable gap parameter. */
export const DIRECTIONAL_TYPES = new Set(['below', 'above', 'rightOf', 'leftOf']);

/** Types that don't reference another element. */
export const REFLESS_TYPES = new Set(['centerHSlide', 'centerVSlide', 'matchMaxWidth', 'matchMaxHeight']);

export function typesForAxis(axis: 'x' | 'y'): readonly string[] {
  return axis === 'y' ? Y_AXIS_TYPES : X_AXIS_TYPES;
}

export function axisForType(type: string): 'x' | 'y' | null {
  if ((Y_AXIS_TYPES as readonly string[]).includes(type)) return 'y';
  if ((X_AXIS_TYPES as readonly string[]).includes(type)) return 'x';
  return null;
}

/** Return the dimension axis for a dimension constraint type, or null. */
export function dimensionAxisForType(type: string): 'w' | 'h' | null {
  if ((W_AXIS_TYPES as readonly string[]).includes(type)) return 'w';
  if ((H_AXIS_TYPES as readonly string[]).includes(type)) return 'h';
  return null;
}

// =============================================================================
// Helpers
// =============================================================================

function findElement(definition: SlideDefinition, elementId: string): SlideElement | undefined {
  const { flatMap } = flattenElements(definition.elements);
  return flatMap.get(elementId);
}

// =============================================================================
// Constraint highlight
// =============================================================================

/** Highlight the selected constraint arrow in the SVG overlay. */
export function updateConstraintHighlight(
  elementId: string,
  axis: 'x' | 'y',
  _slideIndex: number,
): void {
  const s = debugController.state;
  if (!s.debugOverlay) return;

  // Remove existing constraint highlight
  const existing = s.debugOverlay.querySelectorAll('[data-sk-debug="rel-highlight"]');
  existing.forEach(el => el.remove());

  // Find matching arrow line
  const svgEl = s.debugOverlay.querySelector('[data-sk-debug="relationships"]');
  if (!svgEl) return;

  const arrows = svgEl.querySelectorAll('[data-sk-debug="rel-arrow"]');
  let targetLine: SVGLineElement | null = null;
  for (const arrow of arrows) {
    if (
      arrow.getAttribute('data-sk-debug-to') === elementId &&
      arrow.getAttribute('data-sk-debug-axis') === axis
    ) {
      targetLine = arrow as SVGLineElement;
      break;
    }
  }
  if (!targetLine) return;

  // Insert a glow line behind the target arrow
  const NS = 'http://www.w3.org/2000/svg';
  const glow = document.createElementNS(NS, 'line');
  glow.setAttribute('x1', targetLine.getAttribute('x1')!);
  glow.setAttribute('y1', targetLine.getAttribute('y1')!);
  glow.setAttribute('x2', targetLine.getAttribute('x2')!);
  glow.setAttribute('y2', targetLine.getAttribute('y2')!);
  glow.setAttribute('stroke', 'rgba(74, 158, 255, 0.5)');
  glow.setAttribute('stroke-width', '5');
  glow.setAttribute('pointer-events', 'none');
  glow.setAttribute('data-sk-debug', 'rel-highlight');
  targetLine.parentNode!.insertBefore(glow, targetLine);
}

/** Remove constraint highlight from the overlay. */
function removeConstraintHighlight(): void {
  const s = debugController.state;
  if (!s.debugOverlay) return;
  const existing = s.debugOverlay.querySelectorAll('[data-sk-debug="rel-highlight"]');
  existing.forEach(el => el.remove());
}

// =============================================================================
// Clear selection
// =============================================================================

/** Deselect the current constraint and remove its highlight. */
export function clearConstraintSelection(): void {
  const s = debugController.state;
  s.selectedConstraint = null;
  removeConstraintHighlight();
}

// =============================================================================
// Break constraint
// =============================================================================

export async function breakConstraint(
  elementId: string,
  axis: 'x' | 'y',
  slideIndex: number,
): Promise<void> {
  const sk = (window as any).sk;
  if (!sk?._definitions?.[slideIndex] || !sk?.layouts?.[slideIndex]) return;

  const layoutResult: LayoutResult = sk.layouts[slideIndex];
  const sceneEl = layoutResult.elements[elementId];
  if (!sceneEl?.resolved) return;

  const definition: SlideDefinition = sk._definitions[slideIndex];
  const element = findElement(definition, elementId);
  if (!element) return;

  const props = element.props as Record<string, unknown>;
  const oldValue = props[axis];

  // Use the resolved position so the element stays in place
  const resolvedPos = axis === 'x' ? sceneEl.resolved.x : sceneEl.resolved.y;

  // Mutate and re-render
  props[axis] = resolvedPos;

  const rerender = sk._rerenderSlide as (i: number, d: SlideDefinition) => Promise<LayoutResult>;
  if (!rerender) return;
  await rerender(slideIndex, definition);

  // Push undo entry
  const s = debugController.state;
  s.undoStack.push({ elementId, propKey: axis, oldValue, newValue: resolvedPos, slideIndex });
  s.redoStack.length = 0;
  updateDiffDirtyIndicator();

  // Refresh overlay
  debugController.callbacks.renderDebugOverlay?.({ slideIndex, showInspector: false });

  // Clear constraint selection, select the element instead
  clearConstraintSelection();
  s.selectedElementId = elementId;
  debugController.callbacks.renderElementDetail?.(elementId, slideIndex);
}

// =============================================================================
// Change constraint type
// =============================================================================

export async function changeConstraintType(
  elementId: string,
  currentAxis: 'x' | 'y',
  newType: string,
  slideIndex: number,
): Promise<void> {
  const sk = (window as any).sk;
  if (!sk?._definitions?.[slideIndex] || !sk?.layouts?.[slideIndex]) return;

  const layoutResult: LayoutResult = sk.layouts[slideIndex];
  const sceneEl = layoutResult.elements[elementId];
  if (!sceneEl?.resolved) return;

  const definition: SlideDefinition = sk._definitions[slideIndex];
  const element = findElement(definition, elementId);
  if (!element) return;

  const props = element.props as Record<string, unknown>;
  const newAxis = axisForType(newType);
  if (!newAxis) return;

  const s = debugController.state;

  if (newAxis === currentAxis) {
    // Same-axis change — just update the RelMarker
    const marker = props[currentAxis] as RelMarker;
    if (!marker || typeof marker !== 'object' || !('_rel' in marker)) return;

    const oldValue = JSON.parse(JSON.stringify(marker));
    marker._rel = newType as RelMarker['_rel'];

    // Add/remove gap
    if (DIRECTIONAL_TYPES.has(newType)) {
      if (marker.gap === undefined) marker.gap = 0;
    } else {
      delete marker.gap;
    }

    // Clear/keep ref
    if (REFLESS_TYPES.has(newType)) {
      delete marker.ref;
    }

    // Re-render
    const rerender = sk._rerenderSlide as (i: number, d: SlideDefinition) => Promise<LayoutResult>;
    if (!rerender) return;
    await rerender(slideIndex, definition);

    // Single undo entry
    const newValue = JSON.parse(JSON.stringify(marker));
    s.undoStack.push({ elementId, propKey: currentAxis, oldValue, newValue, slideIndex });
    s.redoStack.length = 0;
  } else {
    // Cross-axis change — move the constraint to the other axis
    const oldMarker = props[currentAxis] as RelMarker;
    if (!oldMarker || typeof oldMarker !== 'object' || !('_rel' in oldMarker)) return;

    // Save old values
    const oldAxisOldValue = JSON.parse(JSON.stringify(oldMarker));
    const newAxisOldValue = props[newAxis];

    // Resolved position on old axis — element stays in place
    const resolvedOld = currentAxis === 'x' ? sceneEl.resolved.x : sceneEl.resolved.y;

    // Build new RelMarker on the new axis
    const newMarker: Record<string, unknown> = {
      _rel: newType,
    };
    if (!REFLESS_TYPES.has(newType)) {
      newMarker.ref = oldMarker.ref;
    }
    if (DIRECTIONAL_TYPES.has(newType)) {
      newMarker.gap = oldMarker.gap ?? 0;
    }

    // Mutate
    props[currentAxis] = resolvedOld;
    props[newAxis] = newMarker;

    // Re-render
    const rerender = sk._rerenderSlide as (i: number, d: SlideDefinition) => Promise<LayoutResult>;
    if (!rerender) return;
    await rerender(slideIndex, definition);

    // Compound undo entry (both axis changes)
    const compound: CompoundUndoEntry = {
      compound: true,
      entries: [
        { elementId, propKey: currentAxis, oldValue: oldAxisOldValue, newValue: resolvedOld, slideIndex },
        { elementId, propKey: newAxis, oldValue: newAxisOldValue, newValue: JSON.parse(JSON.stringify(newMarker)), slideIndex },
      ],
    };
    s.undoStack.push(compound);
    s.redoStack.length = 0;
  }

  updateDiffDirtyIndicator();

  // Refresh overlay
  debugController.callbacks.renderDebugOverlay?.({ slideIndex, showInspector: false });

  // Update selection to new axis and re-render constraint panel
  s.selectedConstraint = { elementId, axis: newAxis };
  renderConstraintDetail(elementId, newAxis, slideIndex);
  updateConstraintHighlight(elementId, newAxis, slideIndex);
}

// =============================================================================
// Add constraint (inverse of break)
// =============================================================================

/** Add a constraint to an element that currently has an absolute position. */
export async function addConstraint(
  elementId: string,
  axis: 'x' | 'y',
  constraintType: string,
  refId: string,
  gap: number,
  slideIndex: number,
): Promise<void> {
  const sk = (window as any).sk;
  if (!sk?._definitions?.[slideIndex]) return;

  const definition: SlideDefinition = sk._definitions[slideIndex];
  const element = findElement(definition, elementId);
  if (!element) return;

  const props = element.props as Record<string, unknown>;

  // Resolve the correct property key — dimension constraint types (matchWidth,
  // matchHeight) target w/h, not the x/y axis passed by pick mode.
  const dimAxis = dimensionAxisForType(constraintType);
  const propKey: string = dimAxis ?? axis;
  const oldValue = props[propKey];

  // Build the RelMarker
  const newMarker: Record<string, unknown> = {
    _rel: constraintType,
  };
  if (!REFLESS_TYPES.has(constraintType)) {
    newMarker.ref = refId;
  }
  if (DIRECTIONAL_TYPES.has(constraintType)) {
    newMarker.gap = Math.round(gap);
  }

  // Mutate and re-render
  props[propKey] = newMarker;

  const rerender = sk._rerenderSlide as (i: number, d: SlideDefinition) => Promise<LayoutResult>;
  if (!rerender) return;
  await rerender(slideIndex, definition);

  // Push undo entry
  const s = debugController.state;
  s.undoStack.push({
    elementId,
    propKey,
    oldValue,
    newValue: JSON.parse(JSON.stringify(newMarker)),
    slideIndex,
  });
  s.redoStack.length = 0;
  updateDiffDirtyIndicator();

  // Refresh overlay
  debugController.callbacks.renderDebugOverlay?.({ slideIndex, showInspector: false });

  // For dimension constraints, select the element; for position constraints, select the constraint
  if (dimAxis) {
    s.selectedElementId = elementId;
    debugController.callbacks.renderElementDetail?.(elementId, slideIndex);
  } else {
    s.selectedElementId = null;
    s.selectedConstraint = { elementId, axis };
    renderConstraintDetail(elementId, axis, slideIndex);
    updateConstraintHighlight(elementId, axis, slideIndex);
  }
}

// =============================================================================
// Add group constraint (matchMaxWidth / matchMaxHeight)
// =============================================================================

/** Add a group-based dimension constraint (matchMaxWidth or matchMaxHeight). */
export async function addGroupConstraint(
  elementId: string,
  axis: 'w' | 'h',
  constraintType: string,
  groupName: string,
  slideIndex: number,
): Promise<void> {
  const sk = (window as any).sk;
  if (!sk?._definitions?.[slideIndex]) return;

  const definition: SlideDefinition = sk._definitions[slideIndex];
  const element = findElement(definition, elementId);
  if (!element) return;

  const props = element.props as Record<string, unknown>;
  const oldValue = props[axis];

  // Build the RelMarker with group
  const newMarker: Record<string, unknown> = {
    _rel: constraintType,
    group: groupName,
  };

  // Mutate and re-render
  props[axis] = newMarker;

  const rerender = sk._rerenderSlide as (i: number, d: SlideDefinition) => Promise<LayoutResult>;
  if (!rerender) return;
  await rerender(slideIndex, definition);

  // Push undo entry
  const s = debugController.state;
  s.undoStack.push({
    elementId,
    propKey: axis,
    oldValue,
    newValue: JSON.parse(JSON.stringify(newMarker)),
    slideIndex,
  });
  s.redoStack.length = 0;
  updateDiffDirtyIndicator();

  // Refresh overlay
  debugController.callbacks.renderDebugOverlay?.({ slideIndex, showInspector: false });

  // Select the element and refresh detail
  s.selectedElementId = elementId;
  debugController.callbacks.renderElementDetail?.(elementId, slideIndex);
}

// =============================================================================
// Add refless constraint (centerHSlide / centerVSlide)
// =============================================================================

/** Add a refless constraint (centerHSlide or centerVSlide). */
export async function addReflessConstraint(
  elementId: string,
  axis: 'x' | 'y',
  constraintType: string,
  slideIndex: number,
): Promise<void> {
  const sk = (window as any).sk;
  if (!sk?._definitions?.[slideIndex]) return;

  const definition: SlideDefinition = sk._definitions[slideIndex];
  const element = findElement(definition, elementId);
  if (!element) return;

  const props = element.props as Record<string, unknown>;
  const oldValue = props[axis];

  // Build the RelMarker (no ref, no gap)
  const newMarker: Record<string, unknown> = {
    _rel: constraintType,
  };

  // Mutate and re-render
  props[axis] = newMarker;

  const rerender = sk._rerenderSlide as (i: number, d: SlideDefinition) => Promise<LayoutResult>;
  if (!rerender) return;
  await rerender(slideIndex, definition);

  // Push undo entry
  const s = debugController.state;
  s.undoStack.push({
    elementId,
    propKey: axis,
    oldValue,
    newValue: JSON.parse(JSON.stringify(newMarker)),
    slideIndex,
  });
  s.redoStack.length = 0;
  updateDiffDirtyIndicator();

  // Refresh overlay
  debugController.callbacks.renderDebugOverlay?.({ slideIndex, showInspector: false });

  // Select the element and refresh detail
  s.selectedElementId = elementId;
  debugController.callbacks.renderElementDetail?.(elementId, slideIndex);
}

// =============================================================================
// Constraint detail panel
// =============================================================================

/** Render the constraint detail view in the inspector panel. */
export function renderConstraintDetail(
  elementId: string,
  axis: 'x' | 'y',
  slideIndex: number,
): void {
  const s = debugController.state;
  const body = s.inspectorPanel?.querySelector('[data-sk-inspector-body]');
  if (!body) return;
  body.innerHTML = '';

  const sk = typeof window !== 'undefined' ? window.sk : null;
  if (!sk?.layouts?.[slideIndex]) return;

  const layoutResult = sk.layouts[slideIndex];
  const sceneEl = layoutResult.elements[elementId];
  if (!sceneEl) return;

  // Get the RelMarker from the authored definition
  const def = (sk as any)._definitions?.[slideIndex];
  const element = def ? findElement(def, elementId) : undefined;
  const props = element?.props as Record<string, unknown> | undefined;
  const marker = props?.[axis];

  if (!marker || typeof marker !== 'object' || !('_rel' in (marker as Record<string, unknown>))) {
    // No constraint on this axis — shouldn't happen, but handle gracefully
    body.innerHTML = '<div style="padding:24px 16px;color:#888;text-align:center;font-style:italic;">No constraint found</div>';
    return;
  }

  const relMarker = marker as RelMarker;
  const constraintType = relMarker._rel;
  const refId = relMarker.ref ?? '(none)';

  // Section 1: Identity
  const identityDiv = document.createElement('div');
  identityDiv.innerHTML = `
    <div style="margin-bottom:6px;"><strong style="color:#1a1a2e;font-size:14px;">Constraint</strong>${badge(constraintType, '#ff8c32')}</div>
    <div style="margin-bottom:2px;">Element: <span style="color:#1a1a2e;">${escapeHtml(elementId)}</span></div>
    <div style="margin-bottom:2px;">Reference: <span style="color:#1a1a2e;">${escapeHtml(refId)}</span></div>
    <div style="margin-bottom:2px;">Axis: <span style="color:#1a1a2e;">${axis}</span></div>
  `;
  body.appendChild(createSection('Identity', identityDiv));

  // Section 2: Properties — type dropdown + gap
  const propsDiv = document.createElement('div');

  // Type dropdown row
  const typeRow = document.createElement('div');
  typeRow.style.padding = '2px 0';

  const typeLabel = document.createElement('span');
  typeLabel.textContent = 'type: ';
  typeLabel.style.color = '#999';
  typeRow.appendChild(typeLabel);

  // Show current type as editable text
  const typeValue = document.createElement('span');
  typeValue.textContent = constraintType;
  typeValue.style.color = '#1a1a2e';
  typeValue.style.textDecoration = 'underline';
  typeValue.style.textDecorationStyle = 'dashed';
  typeValue.style.textUnderlineOffset = '2px';
  typeValue.style.cursor = 'pointer';
  typeValue.addEventListener('mouseenter', () => { typeValue.style.background = '#e8f0fe'; });
  typeValue.addEventListener('mouseleave', () => { typeValue.style.background = ''; });
  typeValue.addEventListener('click', (e) => {
    e.stopPropagation();
    showTypeDropdown(elementId, axis, constraintType, typeRow, slideIndex);
  });
  typeRow.appendChild(typeValue);
  propsDiv.appendChild(typeRow);

  // Gap row (only for directional types)
  if (DIRECTIONAL_TYPES.has(constraintType) && relMarker.gap !== undefined) {
    const gapRow = document.createElement('div');
    gapRow.style.padding = '2px 0';
    gapRow.textContent = `gap: ${relMarker.gap}`;
    gapRow.style.color = '#1a1a2e';
    gapRow.style.textDecoration = 'underline';
    gapRow.style.textDecorationStyle = 'dashed';
    gapRow.style.textUnderlineOffset = '2px';
    gapRow.style.cursor = 'pointer';
    gapRow.addEventListener('mouseenter', () => { gapRow.style.background = '#e8f0fe'; });
    gapRow.addEventListener('mouseleave', () => { gapRow.style.background = ''; });
    gapRow.addEventListener('click', (e) => {
      e.stopPropagation();
      // Import the gap edit function from the edit module
      import('./debug-inspector-edit.js').then(mod => {
        mod.startGapTokenEdit(elementId, `${axis}.gap`, relMarker.gap!, gapRow, slideIndex);
      });
    });
    propsDiv.appendChild(gapRow);
  }

  body.appendChild(createSection('Properties', propsDiv));

  // Section 3: Actions
  const actionsDiv = document.createElement('div');
  const breakBtn = document.createElement('button');
  breakBtn.textContent = 'Unlock';
  breakBtn.style.cssText = `
    padding: 6px 12px; font-size: 12px; cursor: pointer;
    font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
    background: #fff; color: #ea4335; border: 1px solid #ea4335;
    border-radius: 4px; font-weight: 600;
  `;
  breakBtn.addEventListener('mouseenter', () => {
    breakBtn.style.background = '#ea4335';
    breakBtn.style.color = '#fff';
  });
  breakBtn.addEventListener('mouseleave', () => {
    breakBtn.style.background = '#fff';
    breakBtn.style.color = '#ea4335';
  });
  breakBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    breakConstraint(elementId, axis, slideIndex);
  });
  actionsDiv.appendChild(breakBtn);
  body.appendChild(createSection('Actions', actionsDiv));
}

// =============================================================================
// Type dropdown
// =============================================================================

function showTypeDropdown(
  elementId: string,
  currentAxis: 'x' | 'y',
  currentType: string,
  typeRow: HTMLElement,
  slideIndex: number,
): void {
  // Build dropdown with same-axis types first, then cross-axis
  const sameAxisTypes = typesForAxis(currentAxis);
  const otherAxis: 'x' | 'y' = currentAxis === 'x' ? 'y' : 'x';
  const crossAxisTypes = typesForAxis(otherAxis);

  const select = document.createElement('select');
  select.style.cssText = `
    padding: 2px 4px; font-size: 12px;
    font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
    border: 1px solid #4a9eff; border-radius: 3px;
    background: #fff; color: #1a1a2e; outline: none;
    box-shadow: 0 0 3px rgba(74, 158, 255, 0.3);
    cursor: pointer;
  `;

  // Same-axis group
  const sameGroup = document.createElement('optgroup');
  sameGroup.label = `${currentAxis}-axis`;
  for (const type of sameAxisTypes) {
    const opt = document.createElement('option');
    opt.value = type;
    opt.textContent = type;
    if (type === currentType) opt.selected = true;
    sameGroup.appendChild(opt);
  }
  select.appendChild(sameGroup);

  // Cross-axis group
  const crossGroup = document.createElement('optgroup');
  crossGroup.label = `${otherAxis}-axis`;
  for (const type of crossAxisTypes) {
    const opt = document.createElement('option');
    opt.value = type;
    opt.textContent = type;
    crossGroup.appendChild(opt);
  }
  select.appendChild(crossGroup);

  // Replace type row content
  typeRow.textContent = '';
  const label = document.createElement('span');
  label.textContent = 'type: ';
  label.style.color = '#999';
  typeRow.appendChild(label);
  typeRow.appendChild(select);

  select.focus();

  let committed = false;
  select.addEventListener('change', () => {
    committed = true;
    const newType = select.value;
    if (newType !== currentType) {
      changeConstraintType(elementId, currentAxis, newType, slideIndex);
    } else {
      renderConstraintDetail(elementId, currentAxis, slideIndex);
    }
  });

  select.addEventListener('blur', () => {
    if (committed) return;  // change handler already fired
    renderConstraintDetail(elementId, currentAxis, slideIndex);
    updateConstraintHighlight(elementId, currentAxis, slideIndex);
  });

  select.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      renderConstraintDetail(elementId, currentAxis, slideIndex);
      updateConstraintHighlight(elementId, currentAxis, slideIndex);
    }
  });
}

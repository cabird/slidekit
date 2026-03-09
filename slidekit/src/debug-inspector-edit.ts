// Debug Inspector Edit — Inline number editing with live preview + undo/redo
//
// Phase 1: numeric props only (x, y, w, h, opacity, rotate, gap, scale).
// Edit loop: mutate SlideElement.props → layout() → re-render DOM → refresh overlay.
//
// Uses debugController.callbacks for renderElementDetail and renderDebugOverlay
// to avoid circular imports with debug.ts and debug-inspector.ts.

import { debugController } from './debug-state.js';
import { flattenElements } from './layout/helpers.js';
import type { SlideDefinition, SlideElement, LayoutResult } from './types.js';

// =============================================================================
// Editable props config
// =============================================================================

interface PropConfig {
  step: number;
  min: number;
  max: number;
}

const EDITABLE_PROPS: Record<string, PropConfig> = {
  x:       { step: 1,    min: 0,     max: 1920 },
  y:       { step: 1,    min: 0,     max: 1080 },
  w:       { step: 1,    min: 0,     max: 1920 },
  h:       { step: 1,    min: 0,     max: 1080 },
  opacity: { step: 0.05, min: 0,     max: 1    },
  rotate:  { step: 1,    min: -360,  max: 360  },
  gap:     { step: 1,    min: 0,     max: 1080 },
  scale:   { step: 0.05, min: 0.01,  max: 10   },
};

/** Check if a property key is editable in Phase 1. */
export function isEditableProp(key: string, value: unknown): boolean {
  return key in EDITABLE_PROPS && typeof value === 'number';
}

// =============================================================================
// Core edit helpers
// =============================================================================

/** Find the SlideElement by ID in the persisted definitions. */
function findElement(definition: SlideDefinition, elementId: string): SlideElement | undefined {
  const { flatMap } = flattenElements(definition.elements);
  return flatMap.get(elementId);
}

/** Call renderElementDetail via late-bound callback (avoids circular import). */
function refreshInspectorDetail(elementId: string, slideIndex: number): void {
  debugController.callbacks.renderElementDetail?.(elementId, slideIndex);
}

/**
 * Restore a prop row's text after editing, without rebuilding the entire panel.
 * This avoids detaching DOM elements that may have pending click events.
 */
function restorePropRowText(propKey: string, value: unknown): void {
  const s = debugController.state;
  const input = s.editInputElement;
  if (!input) return;

  const propDiv = input.parentElement;
  if (!propDiv) return;

  // Restore the original text + dashed-underline style
  propDiv.textContent = `${propKey}: ${value ?? ''}`;
  propDiv.style.textDecoration = 'underline';
  propDiv.style.textDecorationStyle = 'dashed';
  propDiv.style.textUnderlineOffset = '2px';
}

/**
 * Apply an edit: mutate the element prop, re-layout, re-render, refresh UI.
 * This is the core edit→layout→render loop.
 */
export async function applyEdit(
  elementId: string,
  propKey: string,
  newValue: number,
  slideIndex: number,
): Promise<void> {
  const sk = (window as any).sk;
  if (!sk?._definitions?.[slideIndex]) return;

  const definition: SlideDefinition = sk._definitions[slideIndex];
  const element = findElement(definition, elementId);
  if (!element) return;

  // Mutate the live definition
  (element.props as Record<string, unknown>)[propKey] = newValue;

  // Re-layout + re-render (call through window.sk to use the main bundle's copy
  // which has _layoutFn injected — the debug bundle is separate)
  const rerender = sk._rerenderSlide as (i: number, d: SlideDefinition) => Promise<LayoutResult>;
  if (!rerender) return;
  await rerender(slideIndex, definition);

  // Refresh debug overlay (re-reads from updated window.sk)
  const s = debugController.state;
  if (s.debugOverlay) {
    debugController.callbacks.renderDebugOverlay?.({ slideIndex, showInspector: false });
  }

  // Refresh inspector detail (skip during live editing — the input is still
  // active and rebuilding the panel would trigger a spurious blur→commit)
  if (s.inspectorPanel && s.selectedElementId === elementId && s.editingPropKey === null) {
    refreshInspectorDetail(elementId, slideIndex);
  }
}

// =============================================================================
// Inline input lifecycle
// =============================================================================

/**
 * Start editing a numeric property. Creates an inline <input> replacing the
 * property text in the inspector panel.
 */
export function startEdit(
  elementId: string,
  propKey: string,
  currentValue: number,
  propDiv: HTMLElement,
  slideIndex: number,
): void {
  const s = debugController.state;

  // Cancel any existing edit first
  if (s.editingPropKey !== null) {
    cancelEdit();
  }

  const config = EDITABLE_PROPS[propKey];
  if (!config) return;

  // Read the live value from the definition — the click handler's captured
  // value may be stale if a previous edit didn't rebuild the panel.
  const sk = (window as any).sk;
  const def = sk?._definitions?.[slideIndex];
  if (def) {
    const el = findElement(def, elementId);
    if (el) {
      const live = (el.props as Record<string, unknown>)[propKey];
      if (typeof live === 'number') currentValue = live;
    }
  }

  const originalValue = currentValue;

  // Create input
  const input = document.createElement('input');
  input.type = 'number';
  input.value = String(currentValue);
  input.step = String(config.step);
  input.min = String(config.min);
  input.max = String(config.max);
  input.style.cssText = `
    width: 80px; padding: 2px 4px; font-size: 12px;
    font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
    border: 1px solid #4a9eff; border-radius: 3px;
    background: #fff; color: #1a1a2e; outline: none;
    box-shadow: 0 0 3px rgba(74, 158, 255, 0.3);
  `;

  // Replace prop text with input
  propDiv.textContent = '';
  const label = document.createElement('span');
  label.textContent = `${propKey}: `;
  label.style.color = '#999';
  propDiv.appendChild(label);
  propDiv.appendChild(input);
  propDiv.style.textDecoration = 'none';

  // Store editing state
  s.editingPropKey = propKey;
  s.editInputElement = input;

  // Focus and select
  input.focus();
  input.select();

  // Live preview on input
  const onInput = () => {
    const val = parseFloat(input.value);
    if (!isNaN(val)) {
      applyEdit(elementId, propKey, val, slideIndex);
    }
  };
  input.addEventListener('input', onInput);

  // Keyboard handling
  const onKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = parseFloat(input.value);
      if (!isNaN(val)) {
        commitEdit(elementId, propKey, originalValue, val, slideIndex);
      } else {
        cancelEditRestore(elementId, propKey, originalValue, slideIndex);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEditRestore(elementId, propKey, originalValue, slideIndex);
    }
  };
  input.addEventListener('keydown', onKeydown);

  // Commit on blur
  const onBlur = () => {
    // Check if we're still editing this prop (might have been cancelled)
    if (s.editingPropKey !== propKey) return;
    const val = parseFloat(input.value);
    if (!isNaN(val) && val !== originalValue) {
      commitEdit(elementId, propKey, originalValue, val, slideIndex);
    } else {
      cancelEditRestore(elementId, propKey, originalValue, slideIndex);
    }
  };
  input.addEventListener('blur', onBlur);
}

/**
 * Commit an edit: push to undo stack, clear redo, clean up input.
 *
 * Restores the prop row text inline rather than rebuilding the whole panel.
 * This is critical because blur fires before click in browsers — if we
 * rebuilt the panel here, a pending click on another prop would land on a
 * detached DOM element and the new edit input would be invisible.
 */
export function commitEdit(
  elementId: string,
  propKey: string,
  oldValue: unknown,
  newValue: unknown,
  slideIndex: number,
): void {
  const s = debugController.state;

  // Only push if value actually changed
  if (oldValue !== newValue) {
    s.undoStack.push({ elementId, propKey, oldValue, newValue, slideIndex });
    s.redoStack.length = 0;
  }

  // Clear editing state BEFORE restoring text — restorePropRowText removes
  // the input from DOM which fires blur, and the blur handler must see
  // editingPropKey as null to bail out (otherwise it would double-commit).
  s.editingPropKey = null;
  restorePropRowText(propKey, newValue);
  s.editInputElement = null;
}

/**
 * Cancel an edit and restore the original value.
 */
async function cancelEditRestore(
  elementId: string,
  propKey: string,
  originalValue: number,
  slideIndex: number,
): Promise<void> {
  const s = debugController.state;

  // Clear state before DOM changes (restorePropRowText triggers blur)
  s.editingPropKey = null;
  restorePropRowText(propKey, originalValue);
  s.editInputElement = null;

  // Restore original value in the definition and re-render
  await applyEdit(elementId, propKey, originalValue, slideIndex);
}

/**
 * Cancel the current edit without knowing the original value.
 * Restores the prop row text inline (reads current value from the input).
 */
export function cancelEdit(): void {
  const s = debugController.state;
  const input = s.editInputElement;
  const propKey = s.editingPropKey;

  // Clear state before DOM changes (restorePropRowText triggers blur)
  s.editingPropKey = null;

  if (input && propKey) {
    restorePropRowText(propKey, input.value);
  }

  s.editInputElement = null;
}

// =============================================================================
// Undo / Redo
// =============================================================================

/** Undo the last edit. */
export async function undo(): Promise<void> {
  const s = debugController.state;
  const entry = s.undoStack.pop();
  if (!entry) return;

  s.redoStack.push(entry);
  await applyEdit(entry.elementId, entry.propKey, entry.oldValue as number, entry.slideIndex);
  refreshInspectorDetail(entry.elementId, entry.slideIndex);
}

/** Redo the last undone edit. */
export async function redo(): Promise<void> {
  const s = debugController.state;
  const entry = s.redoStack.pop();
  if (!entry) return;

  s.undoStack.push(entry);
  await applyEdit(entry.elementId, entry.propKey, entry.newValue as number, entry.slideIndex);
  refreshInspectorDetail(entry.elementId, entry.slideIndex);
}

// =============================================================================
// Locked property tooltip
// =============================================================================

/** Show a tooltip explaining why a property is locked. */
export function showLockedTooltip(
  propKey: string,
  propDiv: HTMLElement,
  sceneElement: Record<string, any>,
): void {
  // Remove any existing tooltip
  const existing = document.querySelector('[data-sk-locked-tooltip]');
  if (existing) existing.remove();

  const prov = sceneElement.provenance?.[propKey];
  if (!prov) return;

  let explanation = `Controlled by ${prov.source}`;
  if (prov.source === 'constraint' && prov.type) {
    explanation += `: ${prov.type}`;
    if (prov.ref) explanation += `(${prov.ref}`;
    if (prov.gap !== undefined) explanation += `, gap=${prov.gap}`;
    if (prov.ref) explanation += `)`;
  } else if (prov.source === 'stack' && prov.stackId) {
    explanation += `: stack=${prov.stackId}`;
  } else if (prov.source === 'transform') {
    explanation += ' (layout transform)';
  }

  const tooltip = document.createElement('div');
  tooltip.setAttribute('data-sk-locked-tooltip', 'true');
  tooltip.textContent = explanation;
  tooltip.style.cssText = `
    position: absolute; padding: 6px 10px; font-size: 11px;
    background: #333; color: #eee; border-radius: 4px;
    z-index: 100001; white-space: nowrap; pointer-events: none;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  `;

  // Position near the prop div
  const rect = propDiv.getBoundingClientRect();
  tooltip.style.left = `${rect.left}px`;
  tooltip.style.top = `${rect.bottom + 4}px`;

  document.body.appendChild(tooltip);

  // Auto-remove after 2 seconds
  setTimeout(() => {
    if (tooltip.parentNode) tooltip.remove();
  }, 2000);
}

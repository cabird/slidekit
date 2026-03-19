// Debug Inspector Edit — Inline editing with live preview + undo/redo
//
// Supports:
//  - Flat numeric props (x, y, w, h, opacity, rotate, scale) via number input
//  - String enum props (align, vAlign, layer, etc.) via dropdown
//  - Gap editing: spacing token dropdown + custom number fallback
//    - Stack gap (element.props.gap) stores token string or number
//    - Constraint gap (x.gap / y.gap on RelMarker) stores number
//
// Edit loop: mutate SlideElement.props → layout() → re-render DOM → refresh overlay.
//
// Uses debugController.callbacks for renderElementDetail and renderDebugOverlay
// to avoid circular imports with debug.ts and debug-inspector.ts.

import { debugController } from './debug-state.js';
import type { UndoEntry, ElementUndoEntry } from './debug-state.js';
import { updateDiffDirtyIndicator } from './debug-inspector-diff.js';
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
  scale:        { step: 0.05, min: 0.01,  max: 10   },
  thickness:    { step: 1,    min: 1,     max: 20   },
  cornerRadius: { step: 1,    min: 0,     max: 200  },
};

/** Config for constraint gap editing (x.gap / y.gap). */
const GAP_EDIT_CONFIG: PropConfig = { step: 1, min: 0, max: 500 };

/** Constraint types that have an editable gap parameter. */
const GAP_CONSTRAINT_TYPES = new Set(['below', 'above', 'rightOf', 'leftOf']);

/** Check if a property key is editable as a number input. */
export function isEditableProp(key: string, value: unknown): boolean {
  return key in EDITABLE_PROPS && key !== 'gap' && typeof value === 'number';
}

/** Check if a constraint type supports gap editing. */
export function isEditableGap(constraintType: string): boolean {
  return GAP_CONSTRAINT_TYPES.has(constraintType);
}

// =============================================================================
// Enum props config
// =============================================================================

/** Default spacing tokens (used as fallback when window.sk._config is unavailable). */
const DEFAULT_SPACING_TOKENS: Record<string, number> = {
  xs: 8, sm: 16, md: 24, lg: 32, xl: 48, section: 80,
};

/** Get the active spacing token map from window.sk._config or defaults. */
function getSpacingTokens(): Array<{ token: string; px: number }> {
  const sk = (window as any).sk;
  const scale: Record<string, number> = sk?._config?.spacing || DEFAULT_SPACING_TOKENS;
  return Object.entries(scale).map(([token, px]) => ({ token, px }));
}

/**
 * Get the valid string options for an enum property.
 * Returns null if the property is not a string-enum prop.
 * `elementType` is needed because `align` has different values for vstack vs hstack.
 */
export function getEnumOptions(propKey: string, elementType: string): string[] | null {
  switch (propKey) {
    case 'align':
      if (elementType === 'vstack') return ['left', 'center', 'right', 'stretch'];
      if (elementType === 'hstack') return ['top', 'middle', 'bottom', 'stretch'];
      return null;
    case 'vAlign':  return ['top', 'center', 'bottom'];
    case 'hAlign':  return ['left', 'center', 'right'];
    case 'overflow': return ['visible', 'warn', 'clip', 'error'];
    case 'layer':   return ['bg', 'content', 'overlay'];
    case 'connectorType': return ['straight', 'curved', 'elbow', 'orthogonal'];
    case 'arrow':   return ['none', 'end', 'start', 'both'];
    default:        return null;
  }
}

/** Check if propKey is a gap property that should use the token dropdown. */
export function isGapProp(key: string): boolean {
  return key === 'gap';
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

/** Monotonically increasing token to discard stale applyEdit results. */
let _applySeq = 0;

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

  // Constraint gap rows use "gap=N" format; regular props use "key: N"
  if (propKey.endsWith('.gap')) {
    propDiv.textContent = `gap=${value ?? ''}`;
  } else {
    propDiv.textContent = `${propKey}: ${value ?? ''}`;
  }
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
  newValue: number | string | Record<string, unknown>,
  slideIndex: number,
): Promise<void> {
  const sk = (window as any).sk;
  if (!sk?._definitions?.[slideIndex]) return;

  const definition: SlideDefinition = sk._definitions[slideIndex];
  const element = findElement(definition, elementId);
  if (!element) return;

  // Mutate the live definition — handle nested gap paths (e.g. "x.gap")
  // and special _content key for HTML content editing
  if (propKey === '_content') {
    (element as unknown as Record<string, unknown>).content = newValue;
  } else if (propKey.endsWith('.gap')) {
    const axis = propKey.split('.')[0];
    const marker = (element.props as Record<string, unknown>)[axis];
    if (marker && typeof marker === 'object' && '_rel' in (marker as Record<string, unknown>)) {
      (marker as Record<string, unknown>).gap = newValue;
    }
  } else {
    (element.props as Record<string, unknown>)[propKey] = newValue;
  }

  // Re-layout + re-render (call through window.sk to use the main bundle's copy
  // which has _layoutFn injected — the debug bundle is separate)
  const rerender = sk._rerenderSlide as (i: number, d: SlideDefinition) => Promise<LayoutResult>;
  if (!rerender) return;

  // Sequence token: if a newer applyEdit starts before this one finishes
  // the await, skip the UI refresh (the newer call will handle it).
  const seq = ++_applySeq;
  await rerender(slideIndex, definition);
  if (seq !== _applySeq) return;

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

  // Already editing this prop (click bubbled from child) — do nothing
  if (s.editingPropKey === propKey) return;

  // Cancel any existing edit first
  if (s.editingPropKey !== null) {
    cancelEdit();
  }

  // Look up config — constraint gap paths use GAP_EDIT_CONFIG
  const config = propKey.endsWith('.gap') ? GAP_EDIT_CONFIG : EDITABLE_PROPS[propKey];
  if (!config) return;

  // Read the live value from the definition — the click handler's captured
  // value may be stale if a previous edit didn't rebuild the panel.
  const sk = (window as any).sk;
  const def = sk?._definitions?.[slideIndex];
  if (def) {
    const foundEl = findElement(def, elementId);
    if (foundEl) {
      let live: unknown;
      if (propKey.endsWith('.gap')) {
        const axis = propKey.split('.')[0];
        const marker = (foundEl.props as Record<string, unknown>)[axis];
        if (marker && typeof marker === 'object') {
          live = (marker as Record<string, unknown>).gap;
        }
      } else {
        live = (foundEl.props as Record<string, unknown>)[propKey];
      }
      if (typeof live === 'number') {
        currentValue = live;
      } else if (propKey === 'gap' && typeof live === 'string') {
        // Gap stored as token string — resolve to px for number input
        const match = getSpacingTokens().find(t => t.token === live);
        if (match) currentValue = match.px;
      }
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
  label.textContent = propKey.endsWith('.gap') ? 'gap=' : `${propKey}: `;
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

  updateDiffDirtyIndicator();

  // Deferred panel refresh: updates Resolved Bounds, Provenance, etc.
  // Runs after the current event turn so it won't interfere with
  // pending click events (blur fires before click in browsers).
  queueMicrotask(() => {
    if (s.editingPropKey === null && s.selectedElementId === elementId && s.inspectorPanel) {
      refreshInspectorDetail(elementId, slideIndex);
    }
  });
}

/**
 * Cancel an edit and restore the original value.
 */
async function cancelEditRestore(
  elementId: string,
  propKey: string,
  originalValue: number | string,
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
// Element insert/remove for undo/redo
// =============================================================================

/**
 * Apply an element insert or remove action.
 * Used by undo/redo when entries contain `action` (ElementUndoEntry).
 */
export function applyElementAction(entry: ElementUndoEntry): void {
  const sk = (window as any).sk;
  const definition: SlideDefinition | undefined = sk?._definitions?.[entry.slideIndex];
  if (!definition) return;

  // Find the parent container's children array
  let children: SlideElement[];
  if (entry.parentId === null) {
    children = definition.elements;
  } else {
    const { flatMap } = flattenElements(definition.elements);
    const parent = flatMap.get(entry.parentId);
    if (!parent || !('children' in parent)) return;
    children = (parent as any).children;
  }

  if (entry.action === 'insert') {
    // Deep copy to avoid shared references
    const copy = JSON.parse(JSON.stringify(entry.element));
    children.splice(entry.index, 0, copy);
  } else {
    // Remove — find by ID in case indices shifted
    const idx = children.findIndex(c => c.id === entry.element.id);
    if (idx !== -1) children.splice(idx, 1);
  }

  // Invalidate in-flight applyEdit calls
  ++_applySeq;
}

/**
 * Replay a single undo/redo entry in the given direction.
 * Dispatches to applyElementAction for element entries, applyEdit for prop entries.
 */
async function replayEntry(
  entry: UndoEntry | ElementUndoEntry,
  direction: 'undo' | 'redo',
): Promise<void> {
  if ('action' in entry) {
    // ElementUndoEntry — swap action for undo direction
    const effective: ElementUndoEntry = direction === 'undo'
      ? { ...entry, action: entry.action === 'insert' ? 'remove' : 'insert' }
      : entry;
    applyElementAction(effective);
  } else {
    // UndoEntry — property edit
    const value = direction === 'undo' ? entry.oldValue : entry.newValue;
    await applyEdit(entry.elementId, entry.propKey, value as number | string | Record<string, unknown>, entry.slideIndex);
  }
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
  updateDiffDirtyIndicator();

  if ('compound' in entry) {
    // Replay child entries in reverse order
    for (let i = entry.entries.length - 1; i >= 0; i--) {
      await replayEntry(entry.entries[i], 'undo');
    }
    // Rerender once after all mutations
    await _rerenderCurrentSlide(entry.entries[0]?.slideIndex);
  } else {
    await replayEntry(entry, 'undo');
  }
}

/** Redo the last undone edit. */
export async function redo(): Promise<void> {
  const s = debugController.state;
  const entry = s.redoStack.pop();
  if (!entry) return;

  s.undoStack.push(entry);
  updateDiffDirtyIndicator();

  if ('compound' in entry) {
    // Replay child entries in forward order
    for (const child of entry.entries) {
      await replayEntry(child, 'redo');
    }
    // Rerender once after all mutations
    await _rerenderCurrentSlide(entry.entries[0]?.slideIndex);
  } else {
    await replayEntry(entry, 'redo');
  }
}

/** Rerender + refresh overlay after compound undo/redo with element actions. */
async function _rerenderCurrentSlide(slideIndex?: number): Promise<void> {
  if (slideIndex === undefined) return;
  const sk = (window as any).sk;
  const definition = sk?._definitions?.[slideIndex];
  if (!definition) return;
  const rerender = sk._rerenderSlide as ((i: number, d: SlideDefinition) => Promise<LayoutResult>) | undefined;
  if (!rerender) return;
  await rerender(slideIndex, definition);
  const s = debugController.state;
  if (s.debugOverlay) {
    debugController.callbacks.renderDebugOverlay?.({ slideIndex, showInspector: false });
  }
  // Refresh inspector if an element is selected
  if (s.selectedElementId && s.inspectorPanel) {
    debugController.callbacks.renderElementDetail?.(s.selectedElementId, slideIndex);
  }
}

// =============================================================================
// Enum dropdown editing
// =============================================================================

/** Shared select element style. */
const SELECT_STYLE = `
  padding: 2px 4px; font-size: 12px;
  font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
  border: 1px solid #4a9eff; border-radius: 3px;
  background: #fff; color: #1a1a2e; outline: none;
  box-shadow: 0 0 3px rgba(74, 158, 255, 0.3);
  cursor: pointer;
`;

/**
 * Start editing a string-enum property. Creates an inline <select> dropdown
 * replacing the property text in the inspector panel.
 */
export function startEnumEdit(
  elementId: string,
  propKey: string,
  currentValue: string,
  options: string[],
  propDiv: HTMLElement,
  slideIndex: number,
): void {
  const s = debugController.state;
  if (s.editingPropKey === propKey) return;
  if (s.editingPropKey !== null) cancelEdit();

  // Read live value from definition
  const sk = (window as any).sk;
  const def = sk?._definitions?.[slideIndex];
  if (def) {
    const foundEl = findElement(def, elementId);
    if (foundEl) {
      const live = (foundEl.props as Record<string, unknown>)[propKey];
      if (typeof live === 'string') currentValue = live;
    }
  }

  const originalValue = currentValue;

  // Create select
  const select = document.createElement('select');
  select.style.cssText = SELECT_STYLE;
  for (const opt of options) {
    const option = document.createElement('option');
    option.value = opt;
    option.textContent = opt;
    if (opt === currentValue) option.selected = true;
    select.appendChild(option);
  }

  // Replace prop text with select
  propDiv.textContent = '';
  const label = document.createElement('span');
  label.textContent = `${propKey}: `;
  label.style.color = '#999';
  propDiv.appendChild(label);
  propDiv.appendChild(select);
  propDiv.style.textDecoration = 'none';

  // Store editing state
  s.editingPropKey = propKey;
  s.editInputElement = select;

  select.focus();

  // Commit immediately on selection change
  select.addEventListener('change', () => {
    const newVal = select.value;
    applyEdit(elementId, propKey, newVal, slideIndex);
    commitEdit(elementId, propKey, originalValue, newVal, slideIndex);
  });

  // Escape → cancel
  select.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      cancelEditRestore(elementId, propKey, originalValue, slideIndex);
    }
  });

  // Blur → cancel (user clicked away without selecting)
  select.addEventListener('blur', () => {
    if (s.editingPropKey !== propKey) return;
    cancelEditRestore(elementId, propKey, originalValue, slideIndex);
  });
}

// =============================================================================
// Anchor grid picker (anchor, fromAnchor, toAnchor)
// =============================================================================

/** The 9 anchor values in row-major order. */
const ANCHOR_GRID: string[][] = [
  ['tl', 'tc', 'tr'],
  ['cl', 'cc', 'cr'],
  ['bl', 'bc', 'br'],
];

/** Check if a property key is an anchor prop that uses the grid picker. */
export function isAnchorProp(key: string): boolean {
  return key === 'anchor' || key === 'fromAnchor' || key === 'toAnchor';
}

/**
 * Start editing an anchor property with a 3×3 visual grid picker.
 * Each cell is a clickable dot representing an anchor position on a rectangle.
 */
export function startAnchorEdit(
  elementId: string,
  propKey: string,
  currentValue: string,
  propDiv: HTMLElement,
  slideIndex: number,
): void {
  const s = debugController.state;
  if (s.editingPropKey === propKey) return;
  if (s.editingPropKey !== null) cancelEdit();

  // Read live value from definition
  const sk = (window as any).sk;
  const def = sk?._definitions?.[slideIndex];
  if (def) {
    const foundEl = findElement(def, elementId);
    if (foundEl) {
      const live = (foundEl.props as Record<string, unknown>)[propKey];
      if (typeof live === 'string') currentValue = live;
    }
  }

  const originalValue = currentValue;

  // Build the grid container
  const grid = document.createElement('div');
  grid.style.cssText = `
    display: inline-grid; grid-template-columns: repeat(3, 1fr);
    width: 54px; height: 54px; border: 1px solid #ccc; border-radius: 4px;
    background: #fff; box-shadow: 0 0 3px rgba(74, 158, 255, 0.3);
    vertical-align: middle; margin-left: 4px;
  `;

  for (const row of ANCHOR_GRID) {
    for (const anchor of row) {
      const cell = document.createElement('div');
      cell.style.cssText = `
        display: flex; align-items: center; justify-content: center;
        cursor: pointer;
      `;
      cell.setAttribute('data-sk-anchor', anchor);

      const dot = document.createElement('div');
      const isSelected = anchor === currentValue;
      dot.style.cssText = `
        width: ${isSelected ? 10 : 6}px; height: ${isSelected ? 10 : 6}px;
        border-radius: 50%;
        background: ${isSelected ? '#4a9eff' : '#bbb'};
        transition: all 0.1s;
      `;

      cell.appendChild(dot);

      cell.addEventListener('mouseenter', () => {
        if (anchor !== currentValue) {
          dot.style.width = '8px';
          dot.style.height = '8px';
          dot.style.background = '#7ab8ff';
        }
      });
      cell.addEventListener('mouseleave', () => {
        if (anchor !== currentValue) {
          dot.style.width = '6px';
          dot.style.height = '6px';
          dot.style.background = '#bbb';
        }
      });

      cell.addEventListener('click', (e) => {
        e.stopPropagation();
        if (anchor === originalValue) {
          // Same value — just close
          s.editingPropKey = null;
          s.editInputElement = null;
          propDiv.textContent = `${propKey}: ${originalValue}`;
          propDiv.style.textDecoration = 'underline';
          propDiv.style.textDecorationStyle = 'dashed';
          propDiv.style.textUnderlineOffset = '2px';
        } else {
          applyEdit(elementId, propKey, anchor, slideIndex);
          commitEdit(elementId, propKey, originalValue, anchor, slideIndex);
        }
      });

      grid.appendChild(cell);
    }
  }

  // Replace prop text with label + grid
  propDiv.textContent = '';
  const label = document.createElement('span');
  label.textContent = `${propKey}: `;
  label.style.color = '#999';
  propDiv.appendChild(label);
  propDiv.appendChild(grid);
  propDiv.style.textDecoration = 'none';

  // Store editing state (use the grid as the "input element" for cleanup)
  s.editingPropKey = propKey;
  s.editInputElement = grid as unknown as HTMLInputElement;

  // Close on Escape (listen on the propDiv since the grid isn't focusable)
  const onKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      document.removeEventListener('keydown', onKeydown, true);
      s.editingPropKey = null;
      s.editInputElement = null;
      propDiv.textContent = `${propKey}: ${originalValue}`;
      propDiv.style.textDecoration = 'underline';
      propDiv.style.textDecorationStyle = 'dashed';
      propDiv.style.textUnderlineOffset = '2px';
    }
  };
  document.addEventListener('keydown', onKeydown, true);

  // Close when clicking outside the prop row
  const onDocClick = (e: MouseEvent) => {
    if (s.editingPropKey !== propKey) {
      document.removeEventListener('click', onDocClick, true);
      document.removeEventListener('keydown', onKeydown, true);
      return;
    }
    if (!propDiv.contains(e.target as Node)) {
      document.removeEventListener('click', onDocClick, true);
      document.removeEventListener('keydown', onKeydown, true);
      s.editingPropKey = null;
      s.editInputElement = null;
      propDiv.textContent = `${propKey}: ${originalValue}`;
      propDiv.style.textDecoration = 'underline';
      propDiv.style.textDecorationStyle = 'dashed';
      propDiv.style.textUnderlineOffset = '2px';
    }
  };
  // Defer attachment so the current click event doesn't immediately close it
  requestAnimationFrame(() => {
    document.addEventListener('click', onDocClick, true);
  });
}

// =============================================================================
// Element ID dropdown editing (fromId / toId)
// =============================================================================

/** Check if a property key is an element-ID reference (fromId / toId). */
export function isElementIdProp(key: string): boolean {
  return key === 'fromId' || key === 'toId';
}

/**
 * Start editing an element-ID property. Creates an inline <select> dropdown
 * listing all non-connector element IDs from the current slide.
 */
export function startElementIdEdit(
  elementId: string,
  propKey: string,
  currentValue: string,
  propDiv: HTMLElement,
  slideIndex: number,
): void {
  const s = debugController.state;
  if (s.editingPropKey === propKey) return;
  if (s.editingPropKey !== null) cancelEdit();

  // Read live value from definition
  const sk = (window as any).sk;
  const def = sk?._definitions?.[slideIndex];
  if (def) {
    const foundEl = findElement(def, elementId);
    if (foundEl) {
      const live = (foundEl.props as Record<string, unknown>)[propKey];
      if (typeof live === 'string') currentValue = live;
    }
  }

  const originalValue = currentValue;

  // Collect non-connector element IDs from the layout
  const layoutResult = sk?.layouts?.[slideIndex];
  const options: string[] = [];
  if (layoutResult?.elements) {
    for (const [id, el] of Object.entries(layoutResult.elements)) {
      const sceneEl = el as Record<string, unknown>;
      if (sceneEl.type === 'connector') continue;
      if (id === elementId) continue;
      options.push(id);
    }
    options.sort();
  }

  // Create select
  const select = document.createElement('select');
  select.style.cssText = SELECT_STYLE;
  for (const opt of options) {
    const option = document.createElement('option');
    option.value = opt;
    option.textContent = opt;
    if (opt === currentValue) option.selected = true;
    select.appendChild(option);
  }

  // Replace prop text with select
  propDiv.textContent = '';
  const label = document.createElement('span');
  label.textContent = `${propKey}: `;
  label.style.color = '#999';
  propDiv.appendChild(label);
  propDiv.appendChild(select);
  propDiv.style.textDecoration = 'none';

  // Store editing state
  s.editingPropKey = propKey;
  s.editInputElement = select;

  select.focus();

  // Commit immediately on selection change
  select.addEventListener('change', () => {
    const newVal = select.value;
    applyEdit(elementId, propKey, newVal, slideIndex);
    commitEdit(elementId, propKey, originalValue, newVal, slideIndex);
  });

  // Escape → cancel
  select.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      cancelEditRestore(elementId, propKey, originalValue, slideIndex);
    }
  });

  // Blur → cancel (user clicked away without selecting)
  select.addEventListener('blur', () => {
    if (s.editingPropKey !== propKey) return;
    cancelEditRestore(elementId, propKey, originalValue, slideIndex);
  });
}

// =============================================================================
// Gap token dropdown editing
// =============================================================================

/**
 * Start editing a gap property with a spacing token dropdown.
 * Works for both stack gap (stores token string) and constraint gap (stores number).
 *
 * @param propKey - "gap" for stack gap, "x.gap"/"y.gap" for constraint gap
 */
export function startGapTokenEdit(
  elementId: string,
  propKey: string,
  currentValue: number | string,
  propDiv: HTMLElement,
  slideIndex: number,
): void {
  const s = debugController.state;
  if (s.editingPropKey === propKey) return;
  if (s.editingPropKey !== null) cancelEdit();

  const isConstraintGap = propKey.endsWith('.gap');
  const tokens = getSpacingTokens();

  // Read live value from definition
  const sk = (window as any).sk;
  const def = sk?._definitions?.[slideIndex];
  if (def) {
    const foundEl = findElement(def, elementId);
    if (foundEl) {
      let live: unknown;
      if (isConstraintGap) {
        const axis = propKey.split('.')[0];
        const marker = (foundEl.props as Record<string, unknown>)[axis];
        if (marker && typeof marker === 'object') {
          live = (marker as Record<string, unknown>).gap;
        }
      } else {
        live = (foundEl.props as Record<string, unknown>)[propKey];
      }
      if (live !== undefined) currentValue = live as number | string;
    }
  }

  const originalValue = currentValue;

  // Resolve current value to find matching token
  let currentPx: number;
  let matchingToken: string | null = null;
  if (typeof currentValue === 'string') {
    const match = tokens.find(t => t.token === currentValue);
    currentPx = match?.px ?? 0;
    matchingToken = match ? currentValue : null;
  } else {
    currentPx = currentValue;
    const match = tokens.find(t => t.px === currentValue);
    matchingToken = match?.token ?? null;
  }

  // Create select
  const select = document.createElement('select');
  select.style.cssText = SELECT_STYLE;

  // If current value doesn't match a token, show it as a placeholder
  if (!matchingToken) {
    const placeholder = document.createElement('option');
    placeholder.value = '__current__';
    placeholder.textContent = `${currentPx} (custom)`;
    placeholder.selected = true;
    select.appendChild(placeholder);
  }

  // Token options
  for (const { token, px } of tokens) {
    const option = document.createElement('option');
    option.value = token;
    option.textContent = `${token} (${px})`;
    if (matchingToken === token) option.selected = true;
    select.appendChild(option);
  }

  // Custom option
  const customOpt = document.createElement('option');
  customOpt.value = '__custom__';
  customOpt.textContent = 'Custom\u2026';
  select.appendChild(customOpt);

  // Replace prop text with select
  propDiv.textContent = '';
  const label = document.createElement('span');
  label.textContent = isConstraintGap ? 'gap=' : `${propKey}: `;
  label.style.color = '#999';
  propDiv.appendChild(label);
  propDiv.appendChild(select);
  propDiv.style.textDecoration = 'none';

  // Store editing state
  s.editingPropKey = propKey;
  s.editInputElement = select;

  select.focus();

  // Handle selection
  select.addEventListener('change', () => {
    const val = select.value;

    // "Custom..." → switch to number input
    if (val === '__custom__') {
      s.editingPropKey = null;
      s.editInputElement = null;
      startEdit(elementId, propKey, currentPx, propDiv, slideIndex);
      return;
    }

    // Re-selecting current custom value → no-op, close dropdown
    if (val === '__current__') {
      s.editingPropKey = null;
      restorePropRowText(propKey, currentValue);
      s.editInputElement = null;
      return;
    }

    // Token selected — determine what value to store
    const tokenPx = tokens.find(t => t.token === val)?.px ?? 0;
    const newVal: number | string = isConstraintGap ? tokenPx : val;
    applyEdit(elementId, propKey, newVal, slideIndex);
    commitEdit(elementId, propKey, originalValue, newVal, slideIndex);
  });

  // Escape → cancel
  select.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      cancelEditRestore(elementId, propKey, originalValue, slideIndex);
    }
  });

  // Blur → cancel
  select.addEventListener('blur', () => {
    if (s.editingPropKey !== propKey) return;
    cancelEditRestore(elementId, propKey, originalValue, slideIndex);
  });
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

// Debug State — Centralized mutable state for the debug overlay & inspector
//
// Follows the same "single exported state object" pattern as state.ts.
// Adds subscribe/notify for future reactive UI (editing, undo/redo).

import type { DebugOverlayOptions } from './debug.js';
import type { SceneElement, SlideElement } from './types.js';

/** A single property edit for undo/redo. */
export interface UndoEntry {
  elementId: string;
  propKey: string;
  oldValue: unknown;
  newValue: unknown;
  slideIndex: number;
}

/** An element insert/remove operation for undo/redo. */
export interface ElementUndoEntry {
  action: 'insert' | 'remove';
  element: SlideElement;      // deep copy
  parentId: string | null;    // null = root level, string = group/stack ID
  index: number;              // position in parent's children array
  slideIndex: number;
}

/** A group of edits that should be undone/redone together. */
export interface CompoundUndoEntry {
  compound: true;
  entries: Array<UndoEntry | ElementUndoEntry>;
}

/** Mutable state for the debug overlay and inspector panel. */
export interface DebugState {
  // Overlay
  debugOverlay: HTMLDivElement | null;
  keyboardListenerAttached: boolean;
  lastToggleOptions: DebugOverlayOptions;
  debugMode: number;   // 0 = off, 1-3 = overlay modes

  // Inspector
  inspectorPanel: HTMLDivElement | null;
  selectedElementId: string | null;
  selectedConstraint: { elementId: string; axis: 'x' | 'y' } | null;
  clickHandlerAttached: boolean;
  currentSlideIndex: number;

  // Viewport / resize
  panelWidth: number;
  resizeState: { active: boolean; startX: number; startWidth: number } | null;
  revealContainer: HTMLElement | null;
  wasEmbedded: boolean;

  // Editing
  editingPropKey: string | null;
  editInputElement: HTMLInputElement | HTMLSelectElement | null;

  // Undo / redo
  undoStack: Array<UndoEntry | CompoundUndoEntry>;
  redoStack: Array<UndoEntry | CompoundUndoEntry>;

  // Drag / resize
  dragInProgress: boolean;

  // Pick-reference mode (for adding constraints)
  pickMode: {
    elementId: string;
    axis: 'x' | 'y';
    constraintType: string;
    slideIndex: number;
  } | null;

  // Diff baseline
  baselineSceneGraphs: Record<number, Record<string, SceneElement>>;
}

export type DebugStateListener = () => void;

/** Callbacks injected by debug modules to avoid circular imports. */
export interface DebugCallbacks {
  renderElementDetail?: (elementId: string, slideIndex: number) => void;
  renderDebugOverlay?: (options: Record<string, unknown>) => void;
  refreshOverlayOnly?: (slideIndex: number) => void;
  renderConstraintDetail?: (elementId: string, axis: 'x' | 'y', slideIndex: number) => void;
}

export interface DebugController {
  /** Direct access to mutable state. */
  state: DebugState;
  /** Register a listener called on notify(). Returns unsubscribe function. */
  subscribe(listener: DebugStateListener): () => void;
  /** Trigger all subscribers. */
  notify(): void;
  /** Reset state to initial values. */
  reset(): void;
  /** Late-bound callbacks to avoid circular imports between debug modules. */
  callbacks: DebugCallbacks;
}

function initialState(): DebugState {
  return {
    debugOverlay: null,
    keyboardListenerAttached: false,
    lastToggleOptions: {},
    debugMode: 0,

    inspectorPanel: null,
    selectedElementId: null,
    selectedConstraint: null,
    clickHandlerAttached: false,
    currentSlideIndex: 0,

    panelWidth: 380,
    resizeState: null,
    revealContainer: null,
    wasEmbedded: false,

    editingPropKey: null,
    editInputElement: null,
    undoStack: [],
    redoStack: [],
    dragInProgress: false,
    pickMode: null,
    baselineSceneGraphs: {},
  };
}

export function createDebugState(): DebugController {
  const listeners = new Set<DebugStateListener>();
  const s = initialState();

  return {
    state: s,
    callbacks: {},

    subscribe(listener: DebugStateListener): () => void {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },

    notify(): void {
      for (const fn of listeners) fn();
    },

    reset(): void {
      Object.assign(s, initialState());
    },
  };
}

/** Module-level singleton used by all debug modules. */
export const debugController = createDebugState();

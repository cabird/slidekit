// Debug State — Centralized mutable state for the debug overlay & inspector
//
// Follows the same "single exported state object" pattern as state.ts.
// Adds subscribe/notify for future reactive UI (editing, undo/redo).

import type { DebugOverlayOptions } from './debug.js';

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
  clickHandlerAttached: boolean;
  currentSlideIndex: number;

  // Viewport / resize
  panelWidth: number;
  resizeState: { active: boolean; startX: number; startWidth: number } | null;
  revealContainer: HTMLElement | null;
  wasEmbedded: boolean;

  // Editing
  editingPropKey: string | null;
  editInputElement: HTMLInputElement | null;

  // Undo / redo
  undoStack: Array<{ elementId: string; propKey: string; oldValue: unknown; newValue: unknown; slideIndex: number }>;
  redoStack: Array<{ elementId: string; propKey: string; oldValue: unknown; newValue: unknown; slideIndex: number }>;
}

export type DebugStateListener = () => void;

/** Callbacks injected by debug modules to avoid circular imports. */
export interface DebugCallbacks {
  renderElementDetail?: (elementId: string, slideIndex: number) => void;
  renderDebugOverlay?: (options: Record<string, unknown>) => void;
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

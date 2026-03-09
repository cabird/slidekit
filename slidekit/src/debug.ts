// SlideKit Debug Overlay — Entry point / public API
//
// Reads from window.sk scene model data to render debug visualizations.
// Implementation split across debug-* modules; this file re-exports the public surface.

import type { Collision, SceneElement, LayoutResult } from './types.js';
import { debugController } from './debug-state.js';
import { type SkGlobal, buildOverlayContent } from './debug-overlay.js';
import {
  createInspectorPanel, removeInspectorPanel,
  renderElementDetail, updateSelectionHighlight,
  attachClickHandler, detachClickHandler,
} from './debug-inspector.js';
import { resetViewport } from './debug-inspector-viewport.js';
import { undo, redo, isEditableGap, getEnumOptions, isGapProp } from './debug-inspector-edit.js';
export { undo, redo, isEditableGap, getEnumOptions, isGapProp };

// Register late-bound callbacks to break circular imports.
// debug-inspector-edit.ts needs renderDebugOverlay and renderElementDetail
// but cannot import them directly without creating a cycle.
debugController.callbacks.renderElementDetail = (elementId: string, slideIndex: number) => {
  renderElementDetail(elementId, slideIndex);
};
debugController.callbacks.renderDebugOverlay = (options: Record<string, unknown>) => {
  refreshOverlayOnly((options.slideIndex as number) ?? 0);
};

// =============================================================================
// Types
// =============================================================================

/** Options controlling which debug features are rendered. */
export interface DebugOverlayOptions {
  /** Show element bounding boxes. Default: true. */
  showBoxes?: boolean;
  /** Show safe zone boundary. Default: true. */
  showSafeZone?: boolean;
  /** Show element ID labels. Default: true. */
  showIds?: boolean;
  /** Show anchor points as dots. Default: true. */
  showAnchors?: boolean;
  /** Highlight collision areas. Default: true. */
  showCollisions?: boolean;
  /** Show constraint/stack relationship arrows. Default: true. */
  showRelationships?: boolean;
  /** Show the inspector panel sidebar. Default: true. */
  showInspector?: boolean;
  /** Which slide to overlay (0-based). Default: 0. */
  slideIndex?: number;
}

declare global {
  interface Window {
    sk?: SkGlobal | null;
  }
}

// =============================================================================
// Debug Mode Presets
// =============================================================================

/** The option presets for each debug mode (1-3). */
const _DEBUG_MODE_OPTIONS: DebugOverlayOptions[] = [
  {}, // placeholder for mode 0 (off)
  { showBoxes: true, showIds: true, showAnchors: true, showSafeZone: true, showCollisions: true, showRelationships: false },
  { showBoxes: true, showIds: true, showAnchors: true, showSafeZone: true, showCollisions: true, showRelationships: true },
  { showBoxes: false, showIds: false, showAnchors: false, showSafeZone: false, showCollisions: false, showRelationships: true },
];

/** Get the current debug mode (0-3). Useful for testing. */
export function getDebugMode(): number {
  return debugController.state.debugMode;
}

// =============================================================================
// Keyboard Toggle
// =============================================================================

/** Internal keydown handler for Ctrl+Shift+D toggle + undo/redo. */
function _handleDebugKeydown(event: KeyboardEvent): void {
  const target = event.target as HTMLElement;
  const s = debugController.state;

  // Intercept Ctrl+Z / Ctrl+Shift+Z on the inspector edit input so our
  // undo/redo fires instead of the browser's native input undo.
  if (target === s.editInputElement) {
    if (event.ctrlKey && event.shiftKey && (event.key === "z" || event.key === "Z")) {
      event.preventDefault();
      event.stopPropagation();
      redo();
      return;
    }
    if (event.ctrlKey && (event.key === "z" || event.key === "Z")) {
      event.preventDefault();
      event.stopPropagation();
      undo();
      return;
    }
    // Let all other keys pass through to the input normally
    return;
  }

  // Skip if the user is typing in an input field (non-inspector inputs)
  if (target) {
    const tagName = target.tagName;
    if (tagName === "INPUT" || tagName === "TEXTAREA" || target.isContentEditable) {
      return;
    }
  }

  if (event.ctrlKey && event.shiftKey && (event.key === "d" || event.key === "D")) {
    event.preventDefault();
    event.stopPropagation();
    cycleDebugMode(s.lastToggleOptions);
    return;
  }

  // Undo/redo when inspector is visible
  if (s.inspectorPanel) {
    if (event.ctrlKey && event.shiftKey && (event.key === "z" || event.key === "Z")) {
      event.preventDefault();
      event.stopPropagation();
      redo();
    } else if (event.ctrlKey && (event.key === "z" || event.key === "Z")) {
      event.preventDefault();
      event.stopPropagation();
      undo();
    }
  }
}

/**
 * Cycle through debug overlay modes:
 * off → boxes+labels → +relationships → relationships only → off
 */
export function cycleDebugMode(baseOptions: DebugOverlayOptions = {}): number {
  const s = debugController.state;
  s.debugMode = (s.debugMode + 1) % 4;

  if (s.debugMode === 0) {
    removeDebugOverlay();
  } else {
    const modeOpts = _DEBUG_MODE_OPTIONS[s.debugMode];
    renderDebugOverlay({ ...baseOptions, ...modeOpts });
  }

  return s.debugMode;
}

/**
 * Enable keyboard toggle for the debug overlay (Ctrl+Shift+D).
 * Cycles through: off → boxes+labels → +relationships → relationships only → off.
 * Idempotent — only attaches the listener once.
 */
export function enableKeyboardToggle(options: DebugOverlayOptions = {}): void {
  const s = debugController.state;
  s.lastToggleOptions = options;
  if (s.keyboardListenerAttached) return;
  document.addEventListener("keydown", _handleDebugKeydown, true);
  s.keyboardListenerAttached = true;
}

/** Disable keyboard toggle and remove the listener. */
export function disableKeyboardToggle(): void {
  const s = debugController.state;
  if (!s.keyboardListenerAttached) return;
  document.removeEventListener("keydown", _handleDebugKeydown, true);
  s.keyboardListenerAttached = false;
  s.debugMode = 0;
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Render a debug overlay on top of the slidekit-layer.
 *
 * The overlay reads from `window.sk` to get scene model data.
 * It can be toggled on/off without re-rendering the slide.
 */
export function renderDebugOverlay(options: DebugOverlayOptions = {}): HTMLDivElement | null {
  const slideIndex = options.slideIndex ?? 0;

  // Remove any existing overlay
  removeDebugOverlay();

  // Get scene model from window.sk
  const sk: SkGlobal | null | undefined = typeof window !== "undefined" ? window.sk : null;
  if (!sk || !sk.layouts || !sk.layouts[slideIndex]) {
    console.warn("SlideKit debug overlay: no scene model found. Call render() first.");
    return null;
  }

  const layoutResult: LayoutResult = sk.layouts[slideIndex];
  const sceneElements: Record<string, SceneElement> = layoutResult.elements || {};
  const collisions: Collision[] = layoutResult.collisions || [];

  // Find the slidekit-layer to overlay on
  const slidekitLayers = document.querySelectorAll(".slidekit-layer");
  const targetLayer = slidekitLayers[slideIndex];
  if (!targetLayer) {
    console.warn("SlideKit debug overlay: no slidekit-layer found at index", slideIndex);
    return null;
  }

  // Read slide dimensions from config, fall back to 1920x1080
  const slideW: number = sk._config?.slide?.w ?? 1920;
  const slideH: number = sk._config?.slide?.h ?? 1080;

  // Create the overlay div
  const overlay = document.createElement("div");
  overlay.className = "slidekit-debug-overlay";
  overlay.setAttribute("data-sk-role", "debug-overlay");
  overlay.style.position = "absolute";
  overlay.style.left = "0";
  overlay.style.top = "0";
  overlay.style.width = `${slideW}px`;
  overlay.style.height = `${slideH}px`;
  overlay.style.pointerEvents = "none";
  overlay.style.zIndex = "9999";

  // Build overlay content (boxes, labels, anchors, collisions, relationships)
  buildOverlayContent(overlay, sceneElements, collisions, sk, slideW, slideH, options);

  // Append overlay to the slidekit-layer
  targetLayer.appendChild(overlay);
  debugController.state.debugOverlay = overlay;

  // Inspector panel
  const showInspector = options.showInspector !== false;
  if (showInspector) {
    const s = debugController.state;
    s.currentSlideIndex = slideIndex;
    createInspectorPanel();
    attachClickHandler();

    // Re-render previously selected element if any
    if (s.selectedElementId && sceneElements[s.selectedElementId]) {
      renderElementDetail(s.selectedElementId, slideIndex);
      updateSelectionHighlight(s.selectedElementId, slideIndex);
    }
  }

  return overlay;
}

/**
 * Refresh just the overlay element on the current slide layer.
 * Does NOT remove/recreate the inspector panel — used during live editing.
 */
export function refreshOverlayOnly(slideIndex: number): void {
  const s = debugController.state;

  // Remove existing overlay div (if still in DOM)
  if (s.debugOverlay && s.debugOverlay.parentNode) {
    s.debugOverlay.parentNode.removeChild(s.debugOverlay);
  }
  s.debugOverlay = null;

  const sk: SkGlobal | null | undefined = typeof window !== "undefined" ? window.sk : null;
  if (!sk?.layouts?.[slideIndex]) return;

  const layoutResult: LayoutResult = sk.layouts[slideIndex];
  const sceneElements: Record<string, SceneElement> = layoutResult.elements || {};
  const collisions: Collision[] = layoutResult.collisions || [];

  const slidekitLayers = document.querySelectorAll(".slidekit-layer");
  const targetLayer = slidekitLayers[slideIndex];
  if (!targetLayer) return;

  const slideW: number = sk._config?.slide?.w ?? 1920;
  const slideH: number = sk._config?.slide?.h ?? 1080;

  const overlay = document.createElement("div");
  overlay.className = "slidekit-debug-overlay";
  overlay.setAttribute("data-sk-role", "debug-overlay");
  overlay.style.position = "absolute";
  overlay.style.left = "0";
  overlay.style.top = "0";
  overlay.style.width = `${slideW}px`;
  overlay.style.height = `${slideH}px`;
  overlay.style.pointerEvents = "none";
  overlay.style.zIndex = "9999";

  buildOverlayContent(overlay, sceneElements, collisions, sk, slideW, slideH, s.lastToggleOptions);
  targetLayer.appendChild(overlay);
  s.debugOverlay = overlay;

  // Re-highlight selected element if any
  if (s.selectedElementId) {
    updateSelectionHighlight(s.selectedElementId, slideIndex);
  }
}

/** Remove the current debug overlay (toggle off). */
export function removeDebugOverlay(): void {
  const s = debugController.state;
  if (s.debugOverlay && s.debugOverlay.parentNode) {
    s.debugOverlay.parentNode.removeChild(s.debugOverlay);
  }
  s.debugOverlay = null;
  removeInspectorPanel();
  detachClickHandler();
}

/** Check if a debug overlay is currently visible. */
export function isDebugOverlayVisible(): boolean {
  const s = debugController.state;
  return s.debugOverlay !== null && s.debugOverlay.parentNode !== null;
}

/** Toggle the debug overlay on/off. */
export function toggleDebugOverlay(options: DebugOverlayOptions = {}): boolean {
  if (isDebugOverlayVisible()) {
    removeDebugOverlay();
    return false;
  } else {
    renderDebugOverlay(options);
    return true;
  }
}

/**
 * Reset all debug state. Useful for testing.
 */
export function _resetDebugForTests(): void {
  removeDebugOverlay();
  removeInspectorPanel();
  detachClickHandler();
  debugController.reset();
  resetViewport();
}

// =============================================================================
// Namespace Export
// =============================================================================

const SlideKitDebug = {
  renderDebugOverlay,
  removeDebugOverlay,
  isDebugOverlayVisible,
  toggleDebugOverlay,
  cycleDebugMode,
  getDebugMode,
  enableKeyboardToggle,
  disableKeyboardToggle,
  _resetDebugForTests,
};

export default SlideKitDebug;

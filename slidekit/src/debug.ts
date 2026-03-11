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
import { attachDragHandlers, detachDragHandlers, refreshDragState, renderResizeHandles } from './debug-inspector-drag.js';
import { renderConstraintDetail, updateConstraintHighlight, clearConstraintSelection } from './debug-inspector-constraint.js';
import { exitPickMode } from './debug-inspector-pick.js';
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
debugController.callbacks.refreshOverlayOnly = (slideIndex: number) => {
  refreshOverlayOnly(slideIndex);
};
debugController.callbacks.renderConstraintDetail = (elementId: string, axis: 'x' | 'y', slideIndex: number) => {
  renderConstraintDetail(elementId, axis, slideIndex);
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
// Reveal.js Integration
// =============================================================================

/** Get the current horizontal slide index from Reveal.js, or 0 if unavailable. */
function _getCurrentSlideIndex(): number {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Reveal = (window as any).Reveal;
  if (Reveal && typeof Reveal.getIndices === 'function') {
    return Reveal.getIndices().h ?? 0;
  }
  return 0;
}

/** Reveal.js slidechanged handler — re-renders overlay on the new slide. */
function _onSlideChanged(): void {
  const s = debugController.state;
  if (s.debugMode === 0) return;

  const newIndex = _getCurrentSlideIndex();
  if (newIndex === s.currentSlideIndex) return;

  // Clear selection and pick mode when changing slides
  s.selectedElementId = null;
  s.selectedConstraint = null;
  if (s.pickMode) exitPickMode();

  // Re-render overlay on the new slide with the current mode options
  const modeOpts = _DEBUG_MODE_OPTIONS[s.debugMode];
  renderDebugOverlay({ ...s.lastToggleOptions, ...modeOpts, slideIndex: newIndex });
}

/** Start listening for Reveal.js slide changes. */
function _attachSlideChangeListener(): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Reveal = (window as any).Reveal;
  if (Reveal && typeof Reveal.on === 'function') {
    Reveal.on('slidechanged', _onSlideChanged);
  }
}

/** Stop listening for Reveal.js slide changes. */
function _detachSlideChangeListener(): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Reveal = (window as any).Reveal;
  if (Reveal && typeof Reveal.off === 'function') {
    Reveal.off('slidechanged', _onSlideChanged);
  }
}

// =============================================================================
// Connector Pointer-Events
// =============================================================================

/**
 * Enable pointer-events on connector SVG wrappers so they can be clicked
 * in the inspector. Connectors normally have pointer-events:none so clicks
 * pass through to elements underneath during normal slide interaction.
 *
 * Also enforces a minimum 8×8 hit area so thin/zero-dimension connectors
 * (e.g. perfectly horizontal or vertical lines) are still clickable.
 */
const _CONNECTOR_MIN_HIT = 8;

function _enableConnectorPointerEvents(layer: Element): void {
  const wrappers = layer.querySelectorAll('[data-sk-id]');
  for (const el of wrappers) {
    const htmlEl = el as HTMLElement;
    if (htmlEl.style.pointerEvents === 'none' && htmlEl.querySelector('svg')) {
      htmlEl.style.pointerEvents = 'auto';
      htmlEl.setAttribute('data-sk-debug-pe-override', 'true');

      // Enforce minimum clickable dimensions
      const w = htmlEl.offsetWidth;
      const h = htmlEl.offsetHeight;
      if (w < _CONNECTOR_MIN_HIT) {
        const expand = _CONNECTOR_MIN_HIT - w;
        htmlEl.setAttribute('data-sk-debug-orig-left', htmlEl.style.left);
        htmlEl.setAttribute('data-sk-debug-orig-width', htmlEl.style.width);
        htmlEl.style.left = `${parseFloat(htmlEl.style.left) - expand / 2}px`;
        htmlEl.style.width = `${_CONNECTOR_MIN_HIT}px`;
      }
      if (h < _CONNECTOR_MIN_HIT) {
        const expand = _CONNECTOR_MIN_HIT - h;
        htmlEl.setAttribute('data-sk-debug-orig-top', htmlEl.style.top);
        htmlEl.setAttribute('data-sk-debug-orig-height', htmlEl.style.height);
        htmlEl.style.top = `${parseFloat(htmlEl.style.top) - expand / 2}px`;
        htmlEl.style.height = `${_CONNECTOR_MIN_HIT}px`;
      }
    }
  }
}

/** Restore pointer-events and original dimensions on connector wrappers. */
function _restoreConnectorPointerEvents(layer: Element): void {
  const overridden = layer.querySelectorAll('[data-sk-debug-pe-override]');
  for (const el of overridden) {
    const htmlEl = el as HTMLElement;
    htmlEl.style.pointerEvents = 'none';

    // Restore original dimensions if they were expanded
    const origLeft = el.getAttribute('data-sk-debug-orig-left');
    const origWidth = el.getAttribute('data-sk-debug-orig-width');
    const origTop = el.getAttribute('data-sk-debug-orig-top');
    const origHeight = el.getAttribute('data-sk-debug-orig-height');
    if (origLeft !== null) { htmlEl.style.left = origLeft; el.removeAttribute('data-sk-debug-orig-left'); }
    if (origWidth !== null) { htmlEl.style.width = origWidth; el.removeAttribute('data-sk-debug-orig-width'); }
    if (origTop !== null) { htmlEl.style.top = origTop; el.removeAttribute('data-sk-debug-orig-top'); }
    if (origHeight !== null) { htmlEl.style.height = origHeight; el.removeAttribute('data-sk-debug-orig-height'); }

    el.removeAttribute('data-sk-debug-pe-override');
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
    _detachSlideChangeListener();
  } else {
    const slideIndex = baseOptions.slideIndex ?? _getCurrentSlideIndex();
    const modeOpts = _DEBUG_MODE_OPTIONS[s.debugMode];
    renderDebugOverlay({ ...baseOptions, ...modeOpts, slideIndex });
    _attachSlideChangeListener();
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

  // Capture baseline scene graph snapshot (once per slide)
  const s_baseline = debugController.state;
  if (!s_baseline.baselineSceneGraphs[slideIndex]) {
    s_baseline.baselineSceneGraphs[slideIndex] = JSON.parse(JSON.stringify(sceneElements));
  }

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

  // Enable clicking on connector SVG wrappers
  _enableConnectorPointerEvents(targetLayer);

  // Inspector panel
  const showInspector = options.showInspector !== false;
  if (showInspector) {
    const s = debugController.state;
    s.currentSlideIndex = slideIndex;
    createInspectorPanel();
    attachClickHandler();
    attachDragHandlers();

    // Re-render previously selected element if any
    if (s.selectedElementId && sceneElements[s.selectedElementId]) {
      renderElementDetail(s.selectedElementId, slideIndex);
      updateSelectionHighlight(s.selectedElementId, slideIndex);
      renderResizeHandles(s.selectedElementId, slideIndex);
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

  // Enable clicking on connector SVG wrappers
  _enableConnectorPointerEvents(targetLayer);

  // Re-highlight selected element and re-attach drag handlers
  // (rerenderSlide replaces the .slidekit-layer DOM, so listeners must be re-attached)
  if (s.selectedElementId) {
    updateSelectionHighlight(s.selectedElementId, slideIndex);
  }
  if (s.selectedConstraint) {
    updateConstraintHighlight(s.selectedConstraint.elementId, s.selectedConstraint.axis, slideIndex);
  }
  refreshDragState(slideIndex);
}

/** Remove the current debug overlay (toggle off). */
export function removeDebugOverlay(): void {
  const s = debugController.state;
  _detachSlideChangeListener();
  if (s.pickMode) exitPickMode();
  clearConstraintSelection();
  if (s.debugOverlay && s.debugOverlay.parentNode) {
    // Restore pointer-events on connector wrappers before removing overlay
    _restoreConnectorPointerEvents(s.debugOverlay.parentNode as Element);
    s.debugOverlay.parentNode.removeChild(s.debugOverlay);
  }
  s.debugOverlay = null;
  removeInspectorPanel();
  detachClickHandler();
  detachDragHandlers();
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
    const slideIndex = options.slideIndex ?? _getCurrentSlideIndex();
    renderDebugOverlay({ ...options, slideIndex });
    _attachSlideChangeListener();
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

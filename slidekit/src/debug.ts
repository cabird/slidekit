// SlideKit Debug Overlay — Separate module to keep the core lean
// Reads from window.sk scene model data to render debug visualizations.

import type { Rect, Collision, SceneElement, SlideKitConfig, LayoutResult } from './types.js';

// =============================================================================
// Types
// =============================================================================

/** Color-mapped element type keys used in the debug overlay. */
type DebugElementType =
  | "text" | "image" | "rect" | "rule"
  | "group" | "vstack" | "hstack"
  | "connector" | "panel";

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
  /** Which slide to overlay (0-based). Default: 0. */
  slideIndex?: number;
}

/** Shape of window.sk as read by the debug overlay. */
interface SkGlobal {
  layouts?: LayoutResult[];
  _config?: Partial<SlideKitConfig>;
}

declare global {
  interface Window {
    sk?: SkGlobal | null;
  }
}

// =============================================================================
// Color maps
// =============================================================================

const TYPE_COLORS: Record<DebugElementType, string> = {
  text:      "rgba(66, 133, 244, 0.3)",   // blue
  image:     "rgba(52, 168, 83, 0.3)",     // green
  rect:      "rgba(251, 188, 4, 0.3)",     // orange
  rule:      "rgba(234, 67, 53, 0.3)",     // red
  group:     "rgba(124, 92, 191, 0.3)",    // purple
  vstack:    "rgba(124, 92, 191, 0.3)",    // purple
  hstack:    "rgba(124, 92, 191, 0.3)",    // purple
  connector: "rgba(0, 188, 212, 0.3)",     // teal
  panel:     "rgba(124, 92, 191, 0.3)",    // purple
};

const TYPE_BORDER_COLORS: Record<DebugElementType, string> = {
  text:      "rgba(66, 133, 244, 0.8)",
  image:     "rgba(52, 168, 83, 0.8)",
  rect:      "rgba(251, 188, 4, 0.8)",
  rule:      "rgba(234, 67, 53, 0.8)",
  group:     "rgba(124, 92, 191, 0.8)",
  vstack:    "rgba(124, 92, 191, 0.8)",
  hstack:    "rgba(124, 92, 191, 0.8)",
  connector: "rgba(0, 188, 212, 0.8)",
  panel:     "rgba(124, 92, 191, 0.8)",
};

// =============================================================================
// Module state
// =============================================================================

let _debugOverlay: HTMLDivElement | null = null;

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
  const showBoxes = options.showBoxes !== false;
  const showSafeZone = options.showSafeZone !== false;
  const showIds = options.showIds !== false;
  const showAnchors = options.showAnchors !== false;
  const showCollisions = options.showCollisions !== false;
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

  // Show safe zone boundary
  if (showSafeZone) {
    const safeZoneEl = _createSafeZoneOverlay(sk);
    if (safeZoneEl) {
      overlay.appendChild(safeZoneEl);
    }
  }

  // Show element bounding boxes
  if (showBoxes) {
    for (const [id, sceneEl] of Object.entries(sceneElements)) {
      const resolved: Rect | undefined = sceneEl.resolved;
      if (!resolved) continue;

      const boxEl = document.createElement("div");
      boxEl.setAttribute("data-sk-debug", "box");
      boxEl.setAttribute("data-sk-debug-id", id);
      boxEl.style.position = "absolute";
      boxEl.style.left = `${resolved.x}px`;
      boxEl.style.top = `${resolved.y}px`;
      boxEl.style.width = `${resolved.w}px`;
      boxEl.style.height = `${resolved.h}px`;
      boxEl.style.background = TYPE_COLORS[sceneEl.type as DebugElementType] || "rgba(128, 128, 128, 0.3)";
      boxEl.style.border = `1px solid ${TYPE_BORDER_COLORS[sceneEl.type as DebugElementType] || "rgba(128, 128, 128, 0.8)"}`;
      boxEl.style.boxSizing = "border-box";
      boxEl.style.pointerEvents = "none";

      overlay.appendChild(boxEl);
    }
  }

  // Show element IDs
  if (showIds) {
    for (const [id, sceneEl] of Object.entries(sceneElements)) {
      const resolved: Rect | undefined = sceneEl.resolved;
      if (!resolved) continue;

      const anchor: string = (sceneEl.authored?.props?.anchor as string) || "tl";
      const anchorPos = _getAnchorPosition(resolved, anchor);

      const labelEl = document.createElement("div");
      labelEl.setAttribute("data-sk-debug", "id-label");
      labelEl.setAttribute("data-sk-debug-id", id);
      labelEl.style.position = "absolute";
      labelEl.style.left = `${anchorPos.x}px`;
      labelEl.style.top = `${anchorPos.y}px`;
      labelEl.style.transform = "translate(-50%, -100%)";
      labelEl.style.background = "rgba(0, 0, 0, 0.8)";
      labelEl.style.color = "#fff";
      labelEl.style.fontSize = "10px";
      labelEl.style.fontFamily = "monospace";
      labelEl.style.padding = "1px 4px";
      labelEl.style.borderRadius = "2px";
      labelEl.style.whiteSpace = "nowrap";
      labelEl.style.pointerEvents = "none";
      labelEl.textContent = id;

      overlay.appendChild(labelEl);
    }
  }

  // Show anchor points as dots
  if (showAnchors) {
    for (const [id, sceneEl] of Object.entries(sceneElements)) {
      const resolved: Rect | undefined = sceneEl.resolved;
      if (!resolved) continue;

      const anchor: string = (sceneEl.authored?.props?.anchor as string) || "tl";
      const anchorPos = _getAnchorPosition(resolved, anchor);

      const dotEl = document.createElement("div");
      dotEl.setAttribute("data-sk-debug", "anchor");
      dotEl.setAttribute("data-sk-debug-id", id);
      dotEl.style.position = "absolute";
      dotEl.style.left = `${anchorPos.x - 4}px`;
      dotEl.style.top = `${anchorPos.y - 4}px`;
      dotEl.style.width = "8px";
      dotEl.style.height = "8px";
      dotEl.style.borderRadius = "50%";
      dotEl.style.background = "rgba(255, 0, 0, 0.9)";
      dotEl.style.border = "1px solid white";
      dotEl.style.pointerEvents = "none";

      overlay.appendChild(dotEl);
    }
  }

  // Show collision areas
  if (showCollisions && collisions.length > 0) {
    for (const collision of collisions) {
      const rect: Rect | undefined = collision.overlapRect;
      if (!rect) continue;

      const collisionEl = document.createElement("div");
      collisionEl.setAttribute("data-sk-debug", "collision");
      collisionEl.setAttribute("data-sk-debug-a", collision.elementA);
      collisionEl.setAttribute("data-sk-debug-b", collision.elementB);
      collisionEl.style.position = "absolute";
      collisionEl.style.left = `${rect.x}px`;
      collisionEl.style.top = `${rect.y}px`;
      collisionEl.style.width = `${rect.w}px`;
      collisionEl.style.height = `${rect.h}px`;
      collisionEl.style.background = "rgba(255, 0, 0, 0.3)";
      collisionEl.style.border = "2px solid rgba(255, 0, 0, 0.8)";
      collisionEl.style.boxSizing = "border-box";
      collisionEl.style.pointerEvents = "none";

      overlay.appendChild(collisionEl);
    }
  }

  // Append overlay to the slidekit-layer
  targetLayer.appendChild(overlay);
  _debugOverlay = overlay;

  return overlay;
}

/** Remove the current debug overlay (toggle off). */
export function removeDebugOverlay(): void {
  if (_debugOverlay && _debugOverlay.parentNode) {
    _debugOverlay.parentNode.removeChild(_debugOverlay);
  }
  _debugOverlay = null;
}

/** Check if a debug overlay is currently visible. */
export function isDebugOverlayVisible(): boolean {
  return _debugOverlay !== null && _debugOverlay.parentNode !== null;
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

// =============================================================================
// Internal helpers
// =============================================================================

/** Create the safe zone boundary overlay element. */
function _createSafeZoneOverlay(sk: SkGlobal): HTMLDivElement | null {
  let safeX = 120, safeY = 90, safeW = 1680, safeH = 900;

  try {
    if (sk._config) {
      const cfg = sk._config;
      const sz = cfg.safeZone || { left: 120, right: 120, top: 90, bottom: 90 };
      const sl = cfg.slide || { w: 1920, h: 1080 };
      safeX = sz.left;
      safeY = sz.top;
      safeW = sl.w - sz.left - sz.right;
      safeH = sl.h - sz.top - sz.bottom;
    }
  } catch (_e) {
    // Use defaults
  }

  const el = document.createElement("div");
  el.setAttribute("data-sk-debug", "safe-zone");
  el.style.position = "absolute";
  el.style.left = `${safeX}px`;
  el.style.top = `${safeY}px`;
  el.style.width = `${safeW}px`;
  el.style.height = `${safeH}px`;
  el.style.border = "2px dashed rgba(255, 255, 0, 0.6)";
  el.style.boxSizing = "border-box";
  el.style.pointerEvents = "none";

  return el;
}

/** Compute the pixel position of an anchor point on a resolved bounds rect. */
function _getAnchorPosition(bounds: Rect, anchor: string): { x: number; y: number } {
  const row = (anchor && anchor[0]) || "t";
  const col = (anchor && anchor[1]) || "l";

  let px: number, py: number;

  if (col === "l") px = bounds.x;
  else if (col === "c") px = bounds.x + bounds.w / 2;
  else px = bounds.x + bounds.w; // "r"

  if (row === "t") py = bounds.y;
  else if (row === "c") py = bounds.y + bounds.h / 2;
  else py = bounds.y + bounds.h; // "b"

  return { x: px, y: py };
}

// =============================================================================
// Namespace Export
// =============================================================================

const SlideKitDebug = {
  renderDebugOverlay,
  removeDebugOverlay,
  isDebugOverlayVisible,
  toggleDebugOverlay,
};

export default SlideKitDebug;

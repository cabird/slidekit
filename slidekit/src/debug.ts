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
  /** Show constraint/stack relationship arrows. Default: true. */
  showRelationships?: boolean;
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
let _keyboardListenerAttached = false;
let _lastToggleOptions: DebugOverlayOptions = {};

/**
 * Current debug mode for keyboard cycling.
 * 0 = off, 1 = boxes+labels, 2 = boxes+labels+relationships, 3 = relationships only
 */
let _debugMode = 0;

/** The option presets for each debug mode (1-3). */
const _DEBUG_MODE_OPTIONS: DebugOverlayOptions[] = [
  {}, // placeholder for mode 0 (off)
  { showBoxes: true, showIds: true, showAnchors: true, showSafeZone: true, showCollisions: true, showRelationships: false },
  { showBoxes: true, showIds: true, showAnchors: true, showSafeZone: true, showCollisions: true, showRelationships: true },
  { showBoxes: false, showIds: false, showAnchors: false, showSafeZone: false, showCollisions: false, showRelationships: true },
];

/** Get the current debug mode (0-3). Useful for testing. */
export function getDebugMode(): number {
  return _debugMode;
}

// =============================================================================
// Keyboard Toggle
// =============================================================================

/** Internal keydown handler for Ctrl+Shift+D toggle. */
function _handleDebugKeydown(event: KeyboardEvent): void {
  // Skip if the user is typing in an input field
  const target = event.target as HTMLElement;
  if (target) {
    const tagName = target.tagName;
    if (tagName === "INPUT" || tagName === "TEXTAREA" || target.isContentEditable) {
      return;
    }
  }

  if (event.ctrlKey && event.shiftKey && (event.key === "d" || event.key === "D")) {
    event.preventDefault();
    event.stopPropagation();
    cycleDebugMode(_lastToggleOptions);
  }
}

/**
 * Cycle through debug overlay modes:
 * off → boxes+labels → +relationships → relationships only → off
 */
export function cycleDebugMode(baseOptions: DebugOverlayOptions = {}): number {
  _debugMode = (_debugMode + 1) % 4;

  if (_debugMode === 0) {
    removeDebugOverlay();
  } else {
    const modeOpts = _DEBUG_MODE_OPTIONS[_debugMode];
    renderDebugOverlay({ ...baseOptions, ...modeOpts });
  }

  return _debugMode;
}

/**
 * Enable keyboard toggle for the debug overlay (Ctrl+Shift+D).
 * Cycles through: off → boxes+labels → +relationships → relationships only → off.
 * Idempotent — only attaches the listener once.
 */
export function enableKeyboardToggle(options: DebugOverlayOptions = {}): void {
  _lastToggleOptions = options;
  if (_keyboardListenerAttached) return;
  document.addEventListener("keydown", _handleDebugKeydown, true);
  _keyboardListenerAttached = true;
}

/** Disable keyboard toggle and remove the listener. */
export function disableKeyboardToggle(): void {
  if (!_keyboardListenerAttached) return;
  document.removeEventListener("keydown", _handleDebugKeydown, true);
  _keyboardListenerAttached = false;
  _debugMode = 0;
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

  // Show relationship arrows
  const showRelationships = options.showRelationships !== false;
  if (showRelationships) {
    const relSvg = _buildRelationshipSVG(sceneElements, slideW, slideH);
    if (relSvg) {
      overlay.appendChild(relSvg);
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
// Relationship Arrows
// =============================================================================

/** A relationship edge between two elements for debug visualization. */
interface RelEdge {
  fromId: string;
  toId: string;
  type: string;       // constraint type or "stack"
  sourceAnchor: string;
  targetAnchor: string;
  gap?: number;
  isStack: boolean;
}

/** Extract relationship edges from scene elements' provenance data. */
function _extractRelationshipEdges(sceneElements: Record<string, SceneElement>): RelEdge[] {
  const edges: RelEdge[] = [];
  const seenKeys = new Set<string>();

  for (const [id, sceneEl] of Object.entries(sceneElements)) {
    const prov = sceneEl.provenance;
    if (!prov) continue;

    for (const axis of ["x", "y"] as const) {
      let p = prov[axis];
      if (!p) continue;

      // Unwrap transform wrapper to get the original constraint provenance
      if (p.source === "transform" && p.original && typeof p.original === "object" && "source" in p.original) {
        p = p.original as import('./types.js').Provenance;
      }

      if (p.source === "constraint" && p.ref && p.sourceAnchor && p.targetAnchor) {
        // Skip centerIn — it references a rect, not an element
        if (p.type === "centerIn") continue;

        const key = `${p.ref}->${id}:${p.type}:${axis}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          edges.push({
            fromId: p.ref,
            toId: id,
            type: p.type || "constraint",
            sourceAnchor: p.sourceAnchor,
            targetAnchor: p.targetAnchor,
            gap: p.gap,
            isStack: false,
          });
        }
      } else if (p.source === "stack" && p.stackId && p.sourceAnchor && p.targetAnchor) {
        // Deduplicate stack edges (appear on both x and y for same pair)
        const key = `${p.stackId}->${id}:stack`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          edges.push({
            fromId: p.stackId,
            toId: id,
            type: "stack",
            sourceAnchor: p.sourceAnchor,
            targetAnchor: p.targetAnchor,
            isStack: true,
          });
        }
      }
    }
  }

  return edges;
}

/** Build an SVG element showing relationship arrows between elements. */
function _buildRelationshipSVG(
  sceneElements: Record<string, SceneElement>,
  slideW: number,
  slideH: number,
): SVGSVGElement | null {
  const edges = _extractRelationshipEdges(sceneElements);
  if (edges.length === 0) return null;

  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("width", String(slideW));
  svg.setAttribute("height", String(slideH));
  svg.setAttribute("data-sk-debug", "relationships");
  svg.style.position = "absolute";
  svg.style.left = "0";
  svg.style.top = "0";
  svg.style.pointerEvents = "none";
  svg.style.overflow = "visible";

  // Defs: arrowhead markers
  const defs = document.createElementNS(NS, "defs");

  const constraintMarker = document.createElementNS(NS, "marker");
  constraintMarker.setAttribute("id", "sk-debug-arrow-constraint");
  constraintMarker.setAttribute("viewBox", "0 0 10 7");
  constraintMarker.setAttribute("refX", "10");
  constraintMarker.setAttribute("refY", "3.5");
  constraintMarker.setAttribute("markerWidth", "8");
  constraintMarker.setAttribute("markerHeight", "6");
  constraintMarker.setAttribute("orient", "auto-start-reverse");
  const cPath = document.createElementNS(NS, "path");
  cPath.setAttribute("d", "M 0 0 L 10 3.5 L 0 7 z");
  cPath.setAttribute("fill", "rgba(255, 140, 50, 0.85)");
  constraintMarker.appendChild(cPath);
  defs.appendChild(constraintMarker);

  const stackMarker = document.createElementNS(NS, "marker");
  stackMarker.setAttribute("id", "sk-debug-arrow-stack");
  stackMarker.setAttribute("viewBox", "0 0 10 7");
  stackMarker.setAttribute("refX", "10");
  stackMarker.setAttribute("refY", "3.5");
  stackMarker.setAttribute("markerWidth", "8");
  stackMarker.setAttribute("markerHeight", "6");
  stackMarker.setAttribute("orient", "auto-start-reverse");
  const sPath = document.createElementNS(NS, "path");
  sPath.setAttribute("d", "M 0 0 L 10 3.5 L 0 7 z");
  sPath.setAttribute("fill", "rgba(160, 120, 255, 0.7)");
  stackMarker.appendChild(sPath);
  defs.appendChild(stackMarker);

  svg.appendChild(defs);

  for (const edge of edges) {
    const fromEl = sceneElements[edge.fromId];
    const toEl = sceneElements[edge.toId];
    if (!fromEl?.resolved || !toEl?.resolved) continue;

    const fromPt = _getAnchorPosition(fromEl.resolved, edge.sourceAnchor);
    const toPt = _getAnchorPosition(toEl.resolved, edge.targetAnchor);

    const color = edge.isStack ? "rgba(160, 120, 255, 0.7)" : "rgba(255, 140, 50, 0.85)";
    const markerId = edge.isStack ? "sk-debug-arrow-stack" : "sk-debug-arrow-constraint";

    // Line
    const line = document.createElementNS(NS, "line");
    line.setAttribute("x1", String(fromPt.x));
    line.setAttribute("y1", String(fromPt.y));
    line.setAttribute("x2", String(toPt.x));
    line.setAttribute("y2", String(toPt.y));
    line.setAttribute("stroke", color);
    line.setAttribute("stroke-width", "1.5");
    line.setAttribute("marker-end", `url(#${markerId})`);
    line.setAttribute("data-sk-debug", "rel-arrow");
    line.setAttribute("data-sk-debug-from", edge.fromId);
    line.setAttribute("data-sk-debug-to", edge.toId);
    if (edge.isStack) {
      line.setAttribute("stroke-dasharray", "6 3");
    }
    svg.appendChild(line);

    // Label at midpoint
    const midX = (fromPt.x + toPt.x) / 2;
    const midY = (fromPt.y + toPt.y) / 2;
    const labelText = edge.gap !== undefined ? `${edge.type} ${edge.gap}px` : edge.type;

    // Background rect for label
    const bgRect = document.createElementNS(NS, "rect");
    const textWidth = labelText.length * 6 + 6;
    bgRect.setAttribute("x", String(midX - textWidth / 2));
    bgRect.setAttribute("y", String(midY - 7));
    bgRect.setAttribute("width", String(textWidth));
    bgRect.setAttribute("height", "14");
    bgRect.setAttribute("rx", "2");
    bgRect.setAttribute("fill", "rgba(0, 0, 0, 0.75)");
    svg.appendChild(bgRect);

    const text = document.createElementNS(NS, "text");
    text.setAttribute("x", String(midX));
    text.setAttribute("y", String(midY + 3));
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("fill", color);
    text.setAttribute("font-size", "10");
    text.setAttribute("font-family", "monospace");
    text.setAttribute("data-sk-debug", "rel-label");
    text.textContent = labelText;
    svg.appendChild(text);
  }

  return svg;
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
};

export default SlideKitDebug;

// SlideKit Debug Overlay — Separate module to keep the core lean
// Reads from window.sk scene model data to render debug visualizations.

/**
 * Color mapping for element types in debug overlay.
 */
const TYPE_COLORS = {
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

const TYPE_BORDER_COLORS = {
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

/**
 * Track the current debug overlay element so it can be toggled.
 */
let _debugOverlay = null;

/**
 * Render a debug overlay on top of the slidekit-layer.
 *
 * Options:
 *   showBoxes:      Draw semi-transparent colored rectangles for each element's resolved bounds
 *   showSafeZone:   Draw a dashed border at the safe zone boundary
 *   showIds:        Render element IDs as small labels at each element's anchor point
 *   showAnchors:    Render a small dot at each element's anchor point
 *   showCollisions: Highlight collision areas in semi-transparent red
 *
 * The overlay reads from `window.sk` to get scene model data.
 * It can be toggled on/off without re-rendering the slide.
 *
 * @param {object} [options={}] - Debug overlay options
 * @param {boolean} [options.showBoxes=true] - Show element bounding boxes
 * @param {boolean} [options.showSafeZone=true] - Show safe zone boundary
 * @param {boolean} [options.showIds=true] - Show element ID labels
 * @param {boolean} [options.showAnchors=true] - Show anchor points as dots
 * @param {boolean} [options.showCollisions=true] - Highlight collision areas
 * @param {number} [options.slideIndex=0] - Which slide to overlay (0-based)
 * @returns {HTMLElement} The overlay element
 */
export function renderDebugOverlay(options = {}) {
  const showBoxes = options.showBoxes !== false;
  const showSafeZone = options.showSafeZone !== false;
  const showIds = options.showIds !== false;
  const showAnchors = options.showAnchors !== false;
  const showCollisions = options.showCollisions !== false;
  const slideIndex = options.slideIndex ?? 0;

  // Remove any existing overlay
  removeDebugOverlay();

  // Get scene model from window.sk
  const sk = typeof window !== "undefined" ? window.sk : null;
  if (!sk || !sk.layouts || !sk.layouts[slideIndex]) {
    console.warn("SlideKit debug overlay: no scene model found. Call render() first.");
    return null;
  }

  const layoutResult = sk.layouts[slideIndex];
  const sceneElements = layoutResult.elements || {};
  const collisions = layoutResult.collisions || [];

  // Find the slidekit-layer to overlay on
  const slidekitLayers = document.querySelectorAll(".slidekit-layer");
  const targetLayer = slidekitLayers[slideIndex];
  if (!targetLayer) {
    console.warn("SlideKit debug overlay: no slidekit-layer found at index", slideIndex);
    return null;
  }

  // Read slide dimensions from config, fall back to 1920x1080
  const slideW = sk._config?.slide?.w ?? 1920;
  const slideH = sk._config?.slide?.h ?? 1080;

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
    const safeZoneEl = _createSafeZoneOverlay();
    if (safeZoneEl) {
      overlay.appendChild(safeZoneEl);
    }
  }

  // Show element bounding boxes
  if (showBoxes) {
    for (const [id, sceneEl] of Object.entries(sceneElements)) {
      const resolved = sceneEl.resolved;
      if (!resolved) continue;

      const boxEl = document.createElement("div");
      boxEl.setAttribute("data-sk-debug", "box");
      boxEl.setAttribute("data-sk-debug-id", id);
      boxEl.style.position = "absolute";
      boxEl.style.left = `${resolved.x}px`;
      boxEl.style.top = `${resolved.y}px`;
      boxEl.style.width = `${resolved.w}px`;
      boxEl.style.height = `${resolved.h}px`;
      boxEl.style.background = TYPE_COLORS[sceneEl.type] || "rgba(128, 128, 128, 0.3)";
      boxEl.style.border = `1px solid ${TYPE_BORDER_COLORS[sceneEl.type] || "rgba(128, 128, 128, 0.8)"}`;
      boxEl.style.boxSizing = "border-box";
      boxEl.style.pointerEvents = "none";

      overlay.appendChild(boxEl);
    }
  }

  // Show element IDs
  if (showIds) {
    for (const [id, sceneEl] of Object.entries(sceneElements)) {
      const resolved = sceneEl.resolved;
      if (!resolved) continue;

      // Get the authored anchor to place the label at the anchor point
      const anchor = sceneEl.authored?.props?.anchor || "tl";
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
      const resolved = sceneEl.resolved;
      if (!resolved) continue;

      const anchor = sceneEl.authored?.props?.anchor || "tl";
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
      const rect = collision.overlapRect;
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

/**
 * Remove the current debug overlay (toggle off).
 */
export function removeDebugOverlay() {
  if (_debugOverlay && _debugOverlay.parentNode) {
    _debugOverlay.parentNode.removeChild(_debugOverlay);
  }
  _debugOverlay = null;
}

/**
 * Check if a debug overlay is currently visible.
 *
 * @returns {boolean}
 */
export function isDebugOverlayVisible() {
  return _debugOverlay !== null && _debugOverlay.parentNode !== null;
}

/**
 * Toggle the debug overlay on/off.
 *
 * @param {object} [options={}] - Debug overlay options (used when turning on)
 * @returns {boolean} Whether the overlay is now visible
 */
export function toggleDebugOverlay(options = {}) {
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

/**
 * Create the safe zone boundary overlay element.
 *
 * @returns {HTMLElement|null}
 */
function _createSafeZoneOverlay() {
  // Try to read safe zone from window.sk or use defaults
  let safeX = 120, safeY = 90, safeW = 1680, safeH = 900;

  try {
    // Try to import safeRect from slidekit - if not available, use defaults
    if (typeof window !== "undefined" && window.sk && window.sk._config) {
      const cfg = window.sk._config;
      const sz = cfg.safeZone || { left: 120, right: 120, top: 90, bottom: 90 };
      const sl = cfg.slide || { w: 1920, h: 1080 };
      safeX = sz.left;
      safeY = sz.top;
      safeW = sl.w - sz.left - sz.right;
      safeH = sl.h - sz.top - sz.bottom;
    }
  } catch (e) {
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

/**
 * Compute the pixel position of an anchor point on a resolved bounds rect.
 *
 * @param {{ x: number, y: number, w: number, h: number }} bounds
 * @param {string} anchor - tl, tc, tr, cl, cc, cr, bl, bc, br
 * @returns {{ x: number, y: number }}
 */
function _getAnchorPosition(bounds, anchor) {
  const row = (anchor && anchor[0]) || "t";
  const col = (anchor && anchor[1]) || "l";

  let px, py;

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

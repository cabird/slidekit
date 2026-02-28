// SlideKit — Measurement utilities (container management, HTML measurement)

import {
  _measureContainer, set_measureContainer,
  _measureCache, set_measureCache,
} from './state.js';

import { _baselineCSS } from './style.js';
import { filterStyle } from './style.js';
import { applyStyleToDOM } from './dom-helpers.js';

// =============================================================================
// Measurement Container (M2.2, M2.3)
// =============================================================================

/**
 * Ensure the off-screen measurement container exists in the DOM.
 * Creates it if it doesn't exist yet.
 *
 * The container is a hidden div positioned off-screen, styled identically
 * to the slidekit-layer base settings so measurements match rendering.
 */
export function _ensureMeasureContainer() {
  if (_measureContainer && _measureContainer.parentNode) return;

  if (typeof document === "undefined" || !document.body) {
    throw new Error(
      "SlideKit.measure requires a DOM with document.body available."
    );
  }

  set_measureContainer(document.createElement("div"));
  _measureContainer.style.position = "absolute";
  _measureContainer.style.left = "-9999px";
  _measureContainer.style.top = "-9999px";
  _measureContainer.style.visibility = "hidden";
  // Prevent scrolling or interaction
  _measureContainer.style.overflow = "hidden";
  _measureContainer.style.pointerEvents = "none";
  // No max dimensions — let content determine size
  _measureContainer.setAttribute("data-sk-role", "measure-container");

  // Baseline CSS for measurement — identical to render-time baseline
  const baselineStyle = document.createElement("style");
  baselineStyle.textContent = _baselineCSS("[data-sk-measure]");
  _measureContainer.appendChild(baselineStyle);

  document.body.appendChild(_measureContainer);
}

/**
 * Clear the measurement cache. Useful when fonts are loaded or for testing.
 */
export function clearMeasureCache() {
  _measureCache.clear();
}

// =============================================================================
// measure() — HTML Content Measurement
// =============================================================================

/**
 * Build a cache key for measure() results.
 * Uses sorted style keys for deterministic output.
 */
function _elMeasureCacheKey(html, props) {
  const styleKey = props.style
    ? JSON.stringify(props.style, Object.keys(props.style).sort())
    : null;
  return JSON.stringify(["el", html, props.w ?? null, styleKey, props.className || ""]);
}

/**
 * Measure how HTML content will render when placed on the canvas.
 *
 * Renders the HTML in an off-screen measurement div with the same container
 * constraints and styling that render will apply, waits for any images to load,
 * then reads offsetWidth / scrollHeight.
 *
 * @param {string} html - HTML content string
 * @param {object} props - Container properties (w, style, className)
 * @returns {Promise<{ w: number, h: number }>}
 */
export async function measure(html, props = {}) {
  // Check cache first
  const cacheKey = _elMeasureCacheKey(html, props);
  if (_measureCache.has(cacheKey)) {
    return _measureCache.get(cacheKey);
  }

  _ensureMeasureContainer();

  const div = document.createElement("div");
  div.style.boxSizing = "border-box";
  if (props.w != null) div.style.width = `${props.w}px`;

  // Container styling (same as render will apply)
  if (props.className) div.className = props.className;
  if (props.style) {
    const { filtered } = filterStyle(props.style, "el");
    applyStyleToDOM(div, filtered);
  }

  // Content — data-sk-measure triggers CSS reset (margin:0 on children)
  div.setAttribute("data-sk-measure", "");
  div.innerHTML = html;

  // Append to DOM (required for images to start loading and layout to compute)
  _measureContainer.appendChild(div);

  // Wait for all images to load (with timeout to prevent hanging)
  const imgs = div.querySelectorAll("img");
  if (imgs.length > 0) {
    const IMAGE_TIMEOUT_MS = 3000;
    await Promise.all([...imgs].map(img => {
      if (img.complete) return Promise.resolve();
      return new Promise(resolve => {
        const timer = setTimeout(resolve, IMAGE_TIMEOUT_MS);
        const done = () => { clearTimeout(timer); resolve(); };
        img.addEventListener("load", done, { once: true });
        img.addEventListener("error", done, { once: true });
      });
    }));
  }

  // Read dimensions
  const result = { w: div.offsetWidth, h: div.scrollHeight };
  _measureContainer.removeChild(div);

  // Cache result
  _measureCache.set(cacheKey, result);

  return result;
}

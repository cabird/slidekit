// SlideKit — Coordinate-Based Slide Layout Library
// ES Module — all exports are named

import {
  _idCounter, set_idCounter,
  _config, set_config,
  _safeRectCache, set_safeRectCache,
  _loadedFonts, set_loadedFonts,
  _measureContainer, set_measureContainer,
  _measureCache, set_measureCache,
  _fontWarnings, set_fontWarnings,
  _injectedFontLinks, set_injectedFontLinks,
  _transformIdCounter, set_transformIdCounter,
} from './src/state.js';

// =============================================================================
// ID Generation (M1.1)
// =============================================================================

/**
 * Reset the auto-ID counter. Called at the start of each layout()/render() call
 * to ensure deterministic IDs for the same slide definition.
 */
export function resetIdCounter() {
  set_idCounter(0);
}

/**
 * Generate the next auto ID: sk-1, sk-2, ...
 */
function nextId() {
  set_idCounter(_idCounter + 1);
  return `sk-${_idCounter}`;
}

// =============================================================================
// Core Element Model (M1.1)
// =============================================================================

/**
 * Default values for common element properties.
 * Note: style is null here; applyDefaults creates a fresh {} for each element
 * to avoid shared-reference mutation bugs.
 */
const COMMON_DEFAULTS = {
  x: 0,
  y: 0,
  anchor: "tl",
  layer: "content",
  opacity: 1,
  style: null,  // sentinel — applyDefaults creates fresh {} per element
  className: "",
};

/**
 * Apply default values to props — only fills in keys not already present.
 * The `id` key is excluded from the result (it lives on the element, not in props).
 * The `style` default is always a fresh {} to prevent cross-element mutation.
 */
function applyDefaults(props, extraDefaults = {}) {
  const merged = { ...COMMON_DEFAULTS, ...extraDefaults };
  const result = {};
  for (const key of Object.keys(merged)) {
    if (key === "id") continue; // id is stored at the element level, not in props
    if (key === "style") {
      // Always produce a fresh object to avoid shared-reference bugs
      result[key] = props[key] !== undefined ? props[key] : {};
    } else {
      result[key] = props[key] !== undefined ? props[key] : merged[key];
    }
  }
  // Copy all remaining user props that are not in defaults (skip id)
  for (const key of Object.keys(props)) {
    if (key === "id") continue;
    if (result[key] === undefined) {
      result[key] = props[key];
    }
  }
  return result;
}

/**
 * Create a positioned HTML element on the canvas.
 *
 * @param {string} html - HTML string rendered via innerHTML
 * @param {object} props - Layout props: x, y, w, h, id, anchor, layer, rotate, opacity, style, className, overflow
 * @returns {{ id: string, type: string, content: string, props: object }}
 */
export function el(html, props = {}) {
  const { id: customId, ...rest } = props;
  const id = customId || nextId();
  const resolved = applyDefaults(rest, {
    overflow: "visible",
  });
  return { id, type: "el", content: html, props: resolved };
}

/**
 * Create a group element containing child elements.
 *
 * @param {Array} children - Array of SlideKit elements
 * @param {object} props - Positioning and styling properties
 * @returns {{ id: string, type: string, children: Array, props: object }}
 */
export function group(children, props = {}) {
  const { id: customId, ...rest } = props;
  const id = customId || nextId();
  const resolved = applyDefaults(rest, {
    scale: 1,
    clip: false,
  });
  // bounds: 'hug' is passed through via applyDefaults and consumed during layout
  return { id, type: "group", children, props: resolved };
}

// =============================================================================
// Stack Primitives (M5.2, M5.3)
// =============================================================================

/**
 * Create a vertical stack element. Children are laid out top-to-bottom
 * with a configurable gap and horizontal alignment.
 *
 * During layout solve, the stack computes absolute positions for each child
 * based on the stack's origin and the children's measured sizes.
 *
 * @param {Array} items - Array of SlideKit elements (children)
 * @param {object} props - Positioning and layout properties
 * @param {number|string} [props.gap=0] - Gap between children (px number or spacing token)
 * @param {string} [props.align="left"] - Horizontal alignment: "left", "center", "right", "stretch"
 * @returns {{ id: string, type: string, children: Array, props: object }}
 */
export function vstack(items, props = {}) {
  const { id: customId, ...rest } = props;
  const id = customId || nextId();
  const resolved = applyDefaults(rest, {
    gap: 0,
    align: "left",
  });
  return { id, type: "vstack", children: items, props: resolved };
}

/**
 * Create a horizontal stack element. Children are laid out left-to-right
 * with a configurable gap and vertical alignment.
 *
 * During layout solve, the stack computes absolute positions for each child
 * based on the stack's origin and the children's measured sizes.
 *
 * @param {Array} items - Array of SlideKit elements (children)
 * @param {object} props - Positioning and layout properties
 * @param {number|string} [props.gap=0] - Gap between children (px number or spacing token)
 * @param {string} [props.align="top"] - Vertical alignment: "top", "middle", "bottom", "stretch"
 * @returns {{ id: string, type: string, children: Array, props: object }}
 */
export function hstack(items, props = {}) {
  const { id: customId, ...rest } = props;
  const id = customId || nextId();
  const resolved = applyDefaults(rest, {
    gap: 0,
    align: "top",
  });
  return { id, type: "hstack", children: items, props: resolved };
}

/**
 * Arrange items in a grid pattern using vstack/hstack.
 *
 * Each row is an hstack with align:'stretch' so cards in the same row share
 * equal height.  Rows are stacked vertically with the same gap.
 *
 * @param {Array} items - Array of SlideKit elements
 * @param {object} opts
 * @param {string}  [opts.id]        - Optional ID for the outer vstack
 * @param {number}  [opts.cols=2]    - Columns per row
 * @param {number|string} [opts.gap=0] - Gap between items (px or spacing token)
 * @param {number}  [opts.x=0]       - X position
 * @param {number}  [opts.y=0]       - Y position
 * @param {number}  [opts.w]         - Width
 * @param {string}  [opts.anchor]    - Anchor point
 * @param {string}  [opts.layer]     - Layer name
 * @param {object}  [opts.style]     - Style overrides
 * @returns {{ id: string, type: string, children: Array, props: object }}
 */
export function cardGrid(items, { id, cols = 2, gap = 0, x = 0, y = 0, w, anchor, layer, style } = {}) {
  const safeCols = Math.max(1, Math.floor(cols || 2));
  const resolvedGap = resolveSpacing(typeof gap === 'string' || typeof gap === 'number' ? gap : 0);

  // Split items into rows
  const rows = [];
  for (let i = 0; i < items.length; i += safeCols) {
    rows.push(items.slice(i, i + safeCols));
  }

  // Each row is an hstack with align: 'stretch'
  const rowStacks = rows.map((rowItems, idx) =>
    hstack(rowItems, { id: id ? `${id}-row-${idx}` : undefined, gap: resolvedGap, align: 'stretch' })
  );

  // Stack rows vertically
  return vstack(rowStacks, {
    id, x, y, w, gap: resolvedGap,
    anchor, layer, style,
  });
}

// =============================================================================
// Anchor Resolution (M1.2) — extracted to src/anchor.js
// =============================================================================

export { VALID_ANCHORS, resolveAnchor } from './src/anchor.js';
import { resolveAnchor } from './src/anchor.js';

export { filterStyle, resolveShadow, getShadowPresets } from './src/style.js';
import { filterStyle, _baselineCSS, SHADOWS, resolveShadow, getShadowPresets } from './src/style.js';

// =============================================================================
// Init Function & Configuration (M1.5)
// =============================================================================

// Configuration and font/measurement state are imported from ./src/state.js

/**
 * Default spacing scale — named tokens to pixel values.
 * Users can extend or override via init({ spacing: { ... } }).
 */
const DEFAULT_SPACING = {
  xs: 8,
  sm: 16,
  md: 24,
  lg: 32,
  xl: 48,
  section: 80,
};

/**
 * Default configuration values.
 */
const DEFAULT_CONFIG = {
  slide: { w: 1920, h: 1080 },
  safeZone: { left: 120, right: 120, top: 90, bottom: 90 },
  strict: false,
  minFontSize: 24,
  fonts: [],
  spacing: { ...DEFAULT_SPACING },
};

/**
 * Initialize SlideKit with configuration.
 *
 * @param {object} config - Configuration object
 * @param {object} [config.slide] - Slide dimensions { w, h } (default 1920x1080)
 * @param {object} [config.safeZone] - Safe zone margins { left, right, top, bottom }
 * @param {boolean} [config.strict] - Validation mode (strict vs lenient)
 * @param {number} [config.minFontSize] - Minimum font size for projection warnings
 * @param {Array} [config.fonts] - Fonts to preload: [{ family, weights, source }]
 * @param {object} [config.spacing] - Custom spacing tokens merged with defaults (xs/sm/md/lg/xl/section)
 * @returns {Promise<object>} Resolves with the config when ready
 */
export async function init(config = {}) {
  set_config({
    slide: { ...DEFAULT_CONFIG.slide, ...(config.slide || {}) },
    safeZone: { ...DEFAULT_CONFIG.safeZone, ...(config.safeZone || {}) },
    strict: config.strict !== undefined ? config.strict : DEFAULT_CONFIG.strict,
    minFontSize: config.minFontSize !== undefined ? config.minFontSize : DEFAULT_CONFIG.minFontSize,
    fonts: config.fonts || DEFAULT_CONFIG.fonts,
    spacing: { ...DEFAULT_SPACING, ...(config.spacing || {}) },
  });

  // Compute and cache the safe rectangle
  const sz = _config.safeZone;
  const sl = _config.slide;
  const safeW = sl.w - sz.left - sz.right;
  const safeH = sl.h - sz.top - sz.bottom;
  if (safeW <= 0 || safeH <= 0) {
    throw new Error(
      `Invalid safeZone configuration: computed safe rect is ${safeW}x${safeH}. ` +
      `Check slide dimensions (${sl.w}x${sl.h}) and safeZone margins.`
    );
  }
  set_safeRectCache({
    x: sz.left,
    y: sz.top,
    w: safeW,
    h: safeH,
  });

  // Reset font state
  set_loadedFonts(new Set());
  set_fontWarnings([]);
  set_measureCache(new Map());

  // M2.1: Font Preloading
  if (_config.fonts.length > 0) {
    await _loadFonts(_config.fonts);
  }

  return _config;
}

/**
 * Load fonts specified in the config.
 *
 * For Google Fonts: dynamically inject <link> elements.
 * For each font/weight combo: call document.fonts.load().
 * Wait for document.fonts.ready.
 * Timeout: 5s per font — emit warning and fall back on failure.
 *
 * @param {Array} fonts - Array of { family, weights, source }
 */
async function _loadFonts(fonts) {
  const FONT_TIMEOUT_MS = 5000;
  const testString = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  // Step 1: Inject Google Font <link> elements for fonts with source: "google"
  for (const fontDef of fonts) {
    if (fontDef.source === "google") {
      _injectGoogleFontLink(fontDef);
    }
  }

  // Step 2: For each font/weight combination, try to load it with a timeout
  const loadPromises = [];
  for (const fontDef of fonts) {
    const family = fontDef.family;
    const weights = fontDef.weights || [400];

    for (const weight of weights) {
      const fontString = `${weight} 16px "${family}"`;
      const key = `${family}:${weight}`;

      const loadPromise = _loadSingleFont(fontString, key, testString, FONT_TIMEOUT_MS);
      loadPromises.push(loadPromise);
    }
  }

  // Wait for all font load attempts to complete (they won't reject — failures are warnings)
  await Promise.all(loadPromises);

  // Step 3: Also wait for document.fonts.ready for any other fonts
  try {
    await document.fonts.ready;
  } catch (e) {
    // document.fonts.ready failing is non-fatal
  }
}

/**
 * Attempt to load a single font with a timeout.
 *
 * @param {string} fontString - CSS font shorthand, e.g. "700 16px \"Space Grotesk\""
 * @param {string} key - Font tracking key, e.g. "Space Grotesk:700"
 * @param {string} testString - String to use for font loading test
 * @param {number} timeoutMs - Timeout in milliseconds
 */
async function _loadSingleFont(fontString, key, testString, timeoutMs) {
  try {
    const loadResult = await Promise.race([
      document.fonts.load(fontString, testString),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), timeoutMs)
      ),
    ]);

    // If we got a result (array of FontFace), check if it's non-empty
    if (Array.isArray(loadResult) && loadResult.length > 0) {
      _loadedFonts.add(key);
    } else {
      // Font load returned empty — the font may not exist or hasn't been registered
      // Still add it if document.fonts.check passes
      if (document.fonts.check(fontString, testString)) {
        _loadedFonts.add(key);
      } else {
        _fontWarnings.push({
          type: "font_load_failed",
          font: key,
          message: `Font "${key}" could not be loaded. Falling back to system font.`,
        });
      }
    }
  } catch (err) {
    // Timeout or other error
    _fontWarnings.push({
      type: "font_load_timeout",
      font: key,
      message: `Font "${key}" failed to load within timeout. Falling back to system font.`,
    });
  }
}

/**
 * Inject a Google Fonts <link> element into the document head.
 *
 * @param {{ family: string, weights: number[] }} fontDef
 */
function _injectGoogleFontLink(fontDef) {
  const family = fontDef.family.replace(/ /g, "+");
  const weights = (fontDef.weights || [400]).join(";");
  const href = `https://fonts.googleapis.com/css2?family=${family}:wght@${weights}&display=swap`;

  // Check if this link already exists to avoid duplicates
  const existing = document.querySelector(`link[href="${href}"]`);
  if (existing) return;

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
  _injectedFontLinks.add(link);
}

/**
 * Check if a specific font+weight is loaded.
 *
 * @param {string} family - Font family name
 * @param {number} weight - Font weight
 * @returns {boolean}
 */
export function isFontLoaded(family, weight = 400) {
  return _loadedFonts.has(`${family}:${weight}`);
}

/**
 * Get font loading warnings from the most recent init() call.
 *
 * @returns {Array} Array of warning objects
 */
export function getFontWarnings() {
  return [..._fontWarnings];
}

/**
 * Get the current safe rectangle.
 *
 * @returns {{ x: number, y: number, w: number, h: number }}
 */
export function safeRect() {
  if (!_safeRectCache) {
    throw new Error("SlideKit.init() must be called before safeRect()");
  }
  return { ..._safeRectCache };
}

/**
 * Split a rectangle into two sub-rectangles (left and right).
 *
 * Useful for the common split-layout pattern (e.g. text on left, image on
 * right). The `gap` parameter accepts a raw pixel number or a spacing token
 * string (e.g. 'xl').
 *
 * @param {{ x: number, y: number, w: number, h: number }} rect
 * @param {{ ratio?: number, gap?: number|string }} [options]
 * @returns {{ left: { x: number, y: number, w: number, h: number }, right: { x: number, y: number, w: number, h: number } }}
 */
export function splitRect(rect, { ratio = 0.5, gap = 0 } = {}) {
  const gapPx = resolveSpacing(gap);
  const leftW = Math.round((rect.w - gapPx) * ratio);
  const rightW = rect.w - gapPx - leftW;
  return {
    left:  { x: rect.x, y: rect.y, w: leftW, h: rect.h },
    right: { x: rect.x + leftW + gapPx, y: rect.y, w: rightW, h: rect.h },
  };
}

/**
 * Get the current configuration. Returns null if init() hasn't been called.
 *
 * @returns {object|null}
 */
export function getConfig() {
  if (!_config) return null;
  // Deep copy to prevent external mutation of internal state
  return JSON.parse(JSON.stringify(_config));
}

// =============================================================================
// Spacing Tokens (P1.1)
// =============================================================================

/**
 * Resolve a spacing value — either a named token (string) or a raw pixel
 * number — to a concrete pixel number.
 *
 * - Numbers pass through unchanged (including 0).
 * - Strings are looked up in the active spacing scale (_config.spacing),
 *   falling back to DEFAULT_SPACING if init() hasn't been called yet.
 * - Unknown token names throw with a list of available tokens.
 * - undefined/null pass through (callers handle their own defaults).
 *
 * @param {number|string|undefined|null} value
 * @returns {number|undefined|null}
 */
function resolveSpacing(value) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const scale = _config?.spacing || DEFAULT_SPACING;
    if (Object.prototype.hasOwnProperty.call(scale, value)) return scale[value];
    const available = Object.keys(scale).join(', ');
    throw new Error(`Unknown spacing token "${value}". Available tokens: ${available}`);
  }
  return value; // pass through undefined/null
}

/**
 * Public API for resolving a spacing token to a pixel number.
 * Useful for user-land calculations that need to stay in sync with the
 * configured spacing scale.
 *
 * @param {number|string} token - A spacing token name or a pixel number
 * @returns {number}
 */
export function getSpacing(token) {
  return resolveSpacing(token);
}

/**
 * Reset all internal state. For testing only — allows tests to verify
 * pre-init behavior and ensures test isolation.
 */
export function _resetForTests() {
  set_config(null);
  set_safeRectCache(null);
  set_idCounter(0);
  set_transformIdCounter(0);
  set_loadedFonts(new Set());
  set_fontWarnings([]);
  set_measureCache(new Map());
  // Remove measurement container from DOM if it exists
  if (_measureContainer && _measureContainer.parentNode) {
    _measureContainer.parentNode.removeChild(_measureContainer);
  }
  set_measureContainer(null);
  // Remove injected Google Font link elements
  for (const link of _injectedFontLinks) {
    if (link.parentNode) link.parentNode.removeChild(link);
  }
  set_injectedFontLinks(new Set());
}

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
function _ensureMeasureContainer() {
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

// =============================================================================
// Basic Renderer (M1.4)
// =============================================================================

/**
 * Layer ordering for z-index computation.
 * Elements in earlier layers render behind elements in later layers.
 */
const LAYER_ORDER = { bg: 0, content: 1, overlay: 2 };

/**
 * Compute z-index values for a flat array of elements.
 *
 * Sort by: layer (bg < content < overlay), then by explicit `z` value
 * (missing z treated as 0), then by declaration order as tiebreaker.
 * Returns a Map of element id -> z-index.
 *
 * @param {Array} elements - Flat array of SlideKit elements
 * @returns {Map<string, number>} Map of element id to z-index value
 */
function computeZOrder(elements) {
  // Build an array of { element, originalIndex } for stable sort
  const indexed = elements.map((el, i) => ({ el, idx: i }));

  // Sort: layer first, then explicit z (missing = 0), then declaration order
  indexed.sort((a, b) => {
    const layerA = LAYER_ORDER[a.el.props.layer] ?? LAYER_ORDER.content;
    const layerB = LAYER_ORDER[b.el.props.layer] ?? LAYER_ORDER.content;
    if (layerA !== layerB) return layerA - layerB;

    // Within same layer: sort by z value (missing z treated as 0)
    const zA = a.el.props.z ?? 0;
    const zB = b.el.props.z ?? 0;
    if (zA !== zB) return zA - zB;

    // Same z (or both default) — use declaration order as tiebreaker
    return a.idx - b.idx;
  });

  const zMap = new Map();
  indexed.forEach((item, sortedIdx) => {
    zMap.set(item.el.id, sortedIdx + 1);
  });
  return zMap;
}

/**
 * Compute the effective width and height for an element.
 *
 * For el() elements without an explicit `h`, calls measure() to
 * determine the height from rendered HTML content.
 *
 * @param {object} element - SlideKit element
 * @returns {Promise<{ w: number, h: number, _autoHeight: boolean }>}
 */
async function getEffectiveDimensions(element) {
  const { props, type } = element;

  // Auto-height for el() elements
  if (type === "el" && (props.h === undefined || props.h === null)) {
    const html = element.content || "";
    if (!html && (!props.style || Object.keys(props.style).length === 0)) {
      return { w: props.w || 0, h: 0, _autoHeight: true };
    }
    const metrics = await measure(html, props);
    return { w: props.w || metrics.w, h: metrics.h, _autoHeight: true };
  }

  return { w: props.w || 0, h: props.h || 0, _autoHeight: false };
}

/**
 * Apply merged style object to a DOM element's inline style.
 *
 * @param {HTMLElement} domEl - The DOM element to style
 * @param {object} styleObj - CSS properties in camelCase form
 */
function applyStyleToDOM(domEl, styleObj) {
  for (const [key, value] of Object.entries(styleObj)) {
    if (key.startsWith("--")) {
      // CSS custom properties need setProperty
      domEl.style.setProperty(key, value);
    } else {
      domEl.style[key] = value;
    }
  }
}

// Old renderElement function removed — replaced by renderElementFromScene in M3.3 section below.

/**
 * Set slide background on a <section> element using Reveal.js data-background-* attributes.
 *
 * @param {HTMLElement} section - The <section> element
 * @param {string} background - Background value (color, gradient, or image path/URL)
 */
function applySlideBackground(section, background) {
  if (!background) return;

  const trimmed = background.trim();

  if (trimmed.startsWith("#") || /^(rgb|hsl)a?\(/.test(trimmed)) {
    section.setAttribute("data-background-color", trimmed);
  } else if (trimmed.startsWith("linear-gradient") || trimmed.startsWith("radial-gradient")) {
    section.setAttribute("data-background-gradient", trimmed);
  } else {
    // Treat as image URL/path
    section.setAttribute("data-background-image", trimmed);
  }
}

// Old render function removed — replaced by layout-solve-aware render in M3.3 section below.

// =============================================================================
// Relative Positioning Helpers (M3.2)
// =============================================================================

/**
 * Position Y below a referenced element with an optional gap.
 * Returns a deferred value marker resolved during layout solve.
 *
 * @param {string} refId - ID of the element to position relative to
 * @param {object} [opts={}] - Options
 * @param {number|string} [opts.gap=0] - Gap below the reference element (px number or spacing token)
 * @returns {{ _rel: "below", ref: string, gap: number }}
 */
export function below(refId, opts = {}) {
  return { _rel: "below", ref: refId, gap: resolveSpacing(opts.gap ?? 0) };
}

/**
 * Position Y above a referenced element with an optional gap.
 *
 * @param {string} refId - ID of the element to position relative to
 * @param {object} [opts={}] - Options
 * @param {number|string} [opts.gap=0] - Gap above the reference element (px number or spacing token)
 * @returns {{ _rel: "above", ref: string, gap: number }}
 */
export function above(refId, opts = {}) {
  return { _rel: "above", ref: refId, gap: resolveSpacing(opts.gap ?? 0) };
}

/**
 * Position X to the right of a referenced element with an optional gap.
 *
 * @param {string} refId - ID of the element to position relative to
 * @param {object} [opts={}] - Options
 * @param {number|string} [opts.gap=0] - Gap to the right of the reference element (px number or spacing token)
 * @returns {{ _rel: "rightOf", ref: string, gap: number }}
 */
export function rightOf(refId, opts = {}) {
  return { _rel: "rightOf", ref: refId, gap: resolveSpacing(opts.gap ?? 0) };
}

/**
 * Position X to the left of a referenced element with an optional gap.
 *
 * @param {string} refId - ID of the element to position relative to
 * @param {object} [opts={}] - Options
 * @param {number|string} [opts.gap=0] - Gap to the left of the reference element (px number or spacing token)
 * @returns {{ _rel: "leftOf", ref: string, gap: number }}
 */
export function leftOf(refId, opts = {}) {
  return { _rel: "leftOf", ref: refId, gap: resolveSpacing(opts.gap ?? 0) };
}

/**
 * Center vertically with a referenced element (align vertical midpoints).
 *
 * @param {string} refId - ID of the element to center with
 * @returns {{ _rel: "centerV", ref: string }}
 */
export function centerVWith(refId) {
  return { _rel: "centerV", ref: refId };
}

/**
 * Center horizontally with a referenced element (align horizontal midpoints).
 *
 * @param {string} refId - ID of the element to center with
 * @returns {{ _rel: "centerH", ref: string }}
 */
export function centerHWith(refId) {
  return { _rel: "centerH", ref: refId };
}

/**
 * Align top edge with a referenced element.
 *
 * @param {string} refId - ID of the element to align with
 * @returns {{ _rel: "alignTop", ref: string }}
 */
export function alignTopWith(refId) {
  return { _rel: "alignTop", ref: refId };
}

/**
 * Align bottom edge with a referenced element (y = ref.bottom - own height).
 *
 * @param {string} refId - ID of the element to align with
 * @returns {{ _rel: "alignBottom", ref: string }}
 */
export function alignBottomWith(refId) {
  return { _rel: "alignBottom", ref: refId };
}

/**
 * Align left edge with a referenced element.
 *
 * @param {string} refId - ID of the element to align with
 * @returns {{ _rel: "alignLeft", ref: string }}
 */
export function alignLeftWith(refId) {
  return { _rel: "alignLeft", ref: refId };
}

/**
 * Align right edge with a referenced element (x = ref.right - own width).
 *
 * @param {string} refId - ID of the element to align with
 * @returns {{ _rel: "alignRight", ref: string }}
 */
export function alignRightWith(refId) {
  return { _rel: "alignRight", ref: refId };
}

/**
 * Center within a rectangle (e.g., safeRect()).
 *
 * @param {{ x: number, y: number, w: number, h: number }} rectParam - Rectangle to center within
 * @returns {{ x: { _rel: "centerIn", rect: object }, y: { _rel: "centerIn", rect: object } }}
 */
export function centerIn(rectParam) {
  const marker = { _rel: "centerIn", rect: rectParam };
  return { x: marker, y: marker };
}

/**
 * Position Y between two vertical references with configurable bias.
 *
 * @param {string} topRef - ID of the element above (uses its bottom edge)
 * @param {number|string} bottomYOrRef - Absolute Y number or ID of element below (uses its top edge)
 * @param {object} [opts={}] - Options
 * @param {number} [opts.bias=0.35] - 0.0 = flush with top, 1.0 = flush with bottom, 0.35 = biased toward top
 * @returns {{ _rel: "between", ref: string, ref2: number|string, bias: number }}
 */
export function placeBetween(topRef, bottomYOrRef, { bias = 0.35 } = {}) {
  const numBias = typeof bias === "number" && Number.isFinite(bias) ? bias : 0.35;
  const clampedBias = Math.max(0, Math.min(1, numBias));
  return { _rel: "between", ref: topRef, ref2: bottomYOrRef, bias: clampedBias };
}

// =============================================================================
// Alignment, Distribution & Size Matching Transforms (M6)
// =============================================================================

/**
 * Transform ID counter — auto-generates unique IDs for transforms.
 * Reset when the layout pipeline runs so transforms are deterministic.
 */
// Transform ID counter is imported from ./src/state.js

function nextTransformId() {
  set_transformIdCounter(_transformIdCounter + 1);
  return `transform-${_transformIdCounter}`;
}

/**
 * Align all specified elements' left edges.
 * If `to` is provided, all left edges are set to that value.
 * Otherwise, all are set to the minimum left edge among them.
 *
 * @param {string[]} ids - Array of element IDs to align
 * @param {object} [options={}]
 * @param {number} [options.to] - Explicit anchor value for alignment
 * @returns {{ _transform: string, _transformId: string, ids: string[], options: object }}
 */
export function alignLeft(ids, options = {}) {
  return { _transform: "alignLeft", _transformId: nextTransformId(), ids, options };
}

/**
 * Align all specified elements' right edges.
 * If `to` is provided, all right edges are set to that value.
 * Otherwise, all are set to the maximum right edge among them.
 *
 * @param {string[]} ids - Array of element IDs to align
 * @param {object} [options={}]
 * @param {number} [options.to] - Explicit anchor value for alignment
 * @returns {{ _transform: string, _transformId: string, ids: string[], options: object }}
 */
export function alignRight(ids, options = {}) {
  return { _transform: "alignRight", _transformId: nextTransformId(), ids, options };
}

/**
 * Align all specified elements' top edges.
 * If `to` is provided, all top edges are set to that value.
 * Otherwise, all are set to the minimum top edge among them.
 *
 * @param {string[]} ids - Array of element IDs to align
 * @param {object} [options={}]
 * @param {number} [options.to] - Explicit anchor value for alignment
 * @returns {{ _transform: string, _transformId: string, ids: string[], options: object }}
 */
export function alignTop(ids, options = {}) {
  return { _transform: "alignTop", _transformId: nextTransformId(), ids, options };
}

/**
 * Align all specified elements' bottom edges.
 * If `to` is provided, all bottom edges are set to that value.
 * Otherwise, all are set to the maximum bottom edge among them.
 *
 * @param {string[]} ids - Array of element IDs to align
 * @param {object} [options={}]
 * @param {number} [options.to] - Explicit anchor value for alignment
 * @returns {{ _transform: string, _transformId: string, ids: string[], options: object }}
 */
export function alignBottom(ids, options = {}) {
  return { _transform: "alignBottom", _transformId: nextTransformId(), ids, options };
}

/**
 * Align all specified elements' horizontal centers.
 * If `to` is provided, all horizontal centers are set to that value.
 * Otherwise, all are set to the average horizontal center among them.
 *
 * @param {string[]} ids - Array of element IDs to align
 * @param {object} [options={}]
 * @param {number} [options.to] - Explicit anchor value for alignment
 * @returns {{ _transform: string, _transformId: string, ids: string[], options: object }}
 */
export function alignCenterH(ids, options = {}) {
  return { _transform: "alignCenterH", _transformId: nextTransformId(), ids, options };
}

/**
 * Align all specified elements' vertical centers.
 * If `to` is provided, all vertical centers are set to that value.
 * Otherwise, all are set to the average vertical center among them.
 *
 * @param {string[]} ids - Array of element IDs to align
 * @param {object} [options={}]
 * @param {number} [options.to] - Explicit anchor value for alignment
 * @returns {{ _transform: string, _transformId: string, ids: string[], options: object }}
 */
export function alignCenterV(ids, options = {}) {
  return { _transform: "alignCenterV", _transformId: nextTransformId(), ids, options };
}

/**
 * Distribute elements horizontally with equal spacing.
 *
 * @param {string[]} ids - Array of element IDs to distribute
 * @param {object} [options={}]
 * @param {number} [options.startX] - Start X position (default: leftmost element's left edge)
 * @param {number} [options.endX] - End X position (default: rightmost element's right edge)
 * @param {string} [options.mode="equal-gap"] - Distribution mode: "equal-gap" or "equal-center"
 * @returns {{ _transform: string, _transformId: string, ids: string[], options: object }}
 */
export function distributeH(ids, options = {}) {
  return { _transform: "distributeH", _transformId: nextTransformId(), ids, options: { mode: "equal-gap", ...options } };
}

/**
 * Distribute elements vertically with equal spacing.
 *
 * @param {string[]} ids - Array of element IDs to distribute
 * @param {object} [options={}]
 * @param {number} [options.startY] - Start Y position (default: topmost element's top edge)
 * @param {number} [options.endY] - End Y position (default: bottommost element's bottom edge)
 * @param {string} [options.mode="equal-gap"] - Distribution mode: "equal-gap" or "equal-center"
 * @returns {{ _transform: string, _transformId: string, ids: string[], options: object }}
 */
export function distributeV(ids, options = {}) {
  return { _transform: "distributeV", _transformId: nextTransformId(), ids, options: { mode: "equal-gap", ...options } };
}

/**
 * Match the width of all specified elements to the widest.
 *
 * @param {string[]} ids - Array of element IDs
 * @returns {{ _transform: string, _transformId: string, ids: string[], options: object }}
 */
export function matchWidth(ids) {
  return { _transform: "matchWidth", _transformId: nextTransformId(), ids, options: {} };
}

/**
 * Match the height of all specified elements to the tallest.
 *
 * @param {string[]} ids - Array of element IDs
 * @returns {{ _transform: string, _transformId: string, ids: string[], options: object }}
 */
export function matchHeight(ids) {
  return { _transform: "matchHeight", _transformId: nextTransformId(), ids, options: {} };
}

/**
 * Match both width and height of all specified elements to the largest.
 *
 * @param {string[]} ids - Array of element IDs
 * @returns {{ _transform: string, _transformId: string, ids: string[], options: object }}
 */
export function matchSize(ids) {
  return { _transform: "matchSize", _transformId: nextTransformId(), ids, options: {} };
}

/**
 * Fit a group of elements into a bounding rectangle, preserving aspect ratio.
 *
 * 1. Computes the bounding box of all specified elements
 * 2. Computes a uniform scale factor to fit into `rect` (preserving aspect ratio)
 * 3. Scales and translates all elements to fit within `rect`
 *
 * @param {string[]} ids - Array of element IDs
 * @param {{ x: number, y: number, w: number, h: number }} rectParam - Target rectangle
 * @returns {{ _transform: string, _transformId: string, ids: string[], options: object }}
 */
export function fitToRect(ids, rectParam) {
  return { _transform: "fitToRect", _transformId: nextTransformId(), ids, options: { rect: rectParam } };
}

/**
 * Apply a single transform to the resolved bounds map.
 * Modifies resolvedBounds in place.
 * Returns an array of warning objects (empty if none).
 *
 * @param {object} transform - A transform marker object
 * @param {Map<string, {x,y,w,h}>} resolvedBounds - Mutable bounds map
 * @param {Map<string, object>} flatMap - Element map for existence checking
 * @returns {Array} warnings
 */
function applyTransform(transform, resolvedBounds, flatMap) {
  const transformWarnings = [];
  const type = transform._transform;
  const ids = transform.ids || [];
  const opts = transform.options || {};

  // Filter to valid IDs, warn about missing ones
  const validIds = [];
  for (const id of ids) {
    if (!resolvedBounds.has(id)) {
      transformWarnings.push({
        type: "transform_unknown_element",
        transform: type,
        transformId: transform._transformId,
        elementId: id,
        message: `Transform "${type}": element "${id}" not found in resolved layout — skipping`,
      });
    } else {
      validIds.push(id);
    }
  }

  if (validIds.length === 0) return transformWarnings;

  switch (type) {
    case "alignLeft": {
      const target = opts.to !== undefined
        ? opts.to
        : Math.min(...validIds.map(id => resolvedBounds.get(id).x));
      for (const id of validIds) {
        resolvedBounds.get(id).x = target;
      }
      break;
    }

    case "alignRight": {
      const target = opts.to !== undefined
        ? opts.to
        : Math.max(...validIds.map(id => {
            const b = resolvedBounds.get(id);
            return b.x + b.w;
          }));
      for (const id of validIds) {
        const b = resolvedBounds.get(id);
        b.x = target - b.w;
      }
      break;
    }

    case "alignTop": {
      const target = opts.to !== undefined
        ? opts.to
        : Math.min(...validIds.map(id => resolvedBounds.get(id).y));
      for (const id of validIds) {
        resolvedBounds.get(id).y = target;
      }
      break;
    }

    case "alignBottom": {
      const target = opts.to !== undefined
        ? opts.to
        : Math.max(...validIds.map(id => {
            const b = resolvedBounds.get(id);
            return b.y + b.h;
          }));
      for (const id of validIds) {
        const b = resolvedBounds.get(id);
        b.y = target - b.h;
      }
      break;
    }

    case "alignCenterH": {
      const target = opts.to !== undefined
        ? opts.to
        : validIds.reduce((sum, id) => {
            const b = resolvedBounds.get(id);
            return sum + (b.x + b.w / 2);
          }, 0) / validIds.length;
      for (const id of validIds) {
        const b = resolvedBounds.get(id);
        b.x = target - b.w / 2;
      }
      break;
    }

    case "alignCenterV": {
      const target = opts.to !== undefined
        ? opts.to
        : validIds.reduce((sum, id) => {
            const b = resolvedBounds.get(id);
            return sum + (b.y + b.h / 2);
          }, 0) / validIds.length;
      for (const id of validIds) {
        const b = resolvedBounds.get(id);
        b.y = target - b.h / 2;
      }
      break;
    }

    case "distributeH": {
      if (validIds.length < 2) break; // Need at least 2 elements to distribute

      // Sort elements by their current x position (left edge)
      const sorted = [...validIds].sort((a, b) =>
        resolvedBounds.get(a).x - resolvedBounds.get(b).x
      );

      const mode = opts.mode || "equal-gap";

      // Determine startX and endX — defaults depend on mode
      const firstBounds = resolvedBounds.get(sorted[0]);
      const lastBounds = resolvedBounds.get(sorted[sorted.length - 1]);

      if (mode === "equal-gap") {
        const startX = opts.startX !== undefined ? opts.startX : firstBounds.x;
        const endX = opts.endX !== undefined ? opts.endX : lastBounds.x + lastBounds.w;
        // total gap = (endX - startX) - sum(widths), divide by (n-1)
        const totalWidth = sorted.reduce((sum, id) => sum + resolvedBounds.get(id).w, 0);
        const totalGap = (endX - startX) - totalWidth;
        const gapBetween = totalGap / (sorted.length - 1);

        let curX = startX;
        for (const id of sorted) {
          const b = resolvedBounds.get(id);
          b.x = curX;
          curX += b.w + gapBetween;
        }
      } else if (mode === "equal-center") {
        // For equal-center, default start/end are element centers (not edges)
        const startX = opts.startX !== undefined
          ? opts.startX
          : firstBounds.x + firstBounds.w / 2;
        const endX = opts.endX !== undefined
          ? opts.endX
          : lastBounds.x + lastBounds.w / 2;
        // center spacing = (endX - startX) / (n-1)
        // Place each element's center at startX + i * spacing
        const spacing = (endX - startX) / (sorted.length - 1);
        for (let i = 0; i < sorted.length; i++) {
          const b = resolvedBounds.get(sorted[i]);
          b.x = startX + i * spacing - b.w / 2;
        }
      }
      break;
    }

    case "distributeV": {
      if (validIds.length < 2) break;

      // Sort elements by their current y position (top edge)
      const sorted = [...validIds].sort((a, b) =>
        resolvedBounds.get(a).y - resolvedBounds.get(b).y
      );

      const mode = opts.mode || "equal-gap";

      const firstBounds = resolvedBounds.get(sorted[0]);
      const lastBounds = resolvedBounds.get(sorted[sorted.length - 1]);

      if (mode === "equal-gap") {
        const startY = opts.startY !== undefined ? opts.startY : firstBounds.y;
        const endY = opts.endY !== undefined ? opts.endY : lastBounds.y + lastBounds.h;
        const totalHeight = sorted.reduce((sum, id) => sum + resolvedBounds.get(id).h, 0);
        const totalGap = (endY - startY) - totalHeight;
        const gapBetween = totalGap / (sorted.length - 1);

        let curY = startY;
        for (const id of sorted) {
          const b = resolvedBounds.get(id);
          b.y = curY;
          curY += b.h + gapBetween;
        }
      } else if (mode === "equal-center") {
        // For equal-center, default start/end are element centers (not edges)
        const startY = opts.startY !== undefined
          ? opts.startY
          : firstBounds.y + firstBounds.h / 2;
        const endY = opts.endY !== undefined
          ? opts.endY
          : lastBounds.y + lastBounds.h / 2;
        const spacing = (endY - startY) / (sorted.length - 1);
        for (let i = 0; i < sorted.length; i++) {
          const b = resolvedBounds.get(sorted[i]);
          b.y = startY + i * spacing - b.h / 2;
        }
      }
      break;
    }

    case "matchWidth": {
      const maxW = Math.max(...validIds.map(id => resolvedBounds.get(id).w));
      for (const id of validIds) {
        resolvedBounds.get(id).w = maxW;
      }
      break;
    }

    case "matchHeight": {
      const maxH = Math.max(...validIds.map(id => resolvedBounds.get(id).h));
      for (const id of validIds) {
        resolvedBounds.get(id).h = maxH;
      }
      break;
    }

    case "matchSize": {
      const maxW = Math.max(...validIds.map(id => resolvedBounds.get(id).w));
      const maxH = Math.max(...validIds.map(id => resolvedBounds.get(id).h));
      for (const id of validIds) {
        const b = resolvedBounds.get(id);
        b.w = maxW;
        b.h = maxH;
      }
      break;
    }

    case "fitToRect": {
      const targetRect = opts.rect;
      if (!targetRect || targetRect.w <= 0 || targetRect.h <= 0) {
        transformWarnings.push({
          type: "transform_invalid_rect",
          transform: type,
          transformId: transform._transformId,
          message: `fitToRect: invalid target rect`,
        });
        break;
      }

      // 1. Compute bounding box of all specified elements
      let minX = Infinity, minY = Infinity;
      let maxX = -Infinity, maxY = -Infinity;
      for (const id of validIds) {
        const b = resolvedBounds.get(id);
        minX = Math.min(minX, b.x);
        minY = Math.min(minY, b.y);
        maxX = Math.max(maxX, b.x + b.w);
        maxY = Math.max(maxY, b.y + b.h);
      }
      const bbW = maxX - minX;
      const bbH = maxY - minY;

      if (bbW <= 0 || bbH <= 0) break;

      // 2. Compute scale factor (preserve aspect ratio — use the smaller scale)
      const scaleX = targetRect.w / bbW;
      const scaleY = targetRect.h / bbH;
      const scale = Math.min(scaleX, scaleY);

      // 3. Compute the offset to center the scaled bounding box within the target rect
      const scaledW = bbW * scale;
      const scaledH = bbH * scale;
      const offsetX = targetRect.x + (targetRect.w - scaledW) / 2;
      const offsetY = targetRect.y + (targetRect.h - scaledH) / 2;

      // 4. Apply scale and translate to all elements
      for (const id of validIds) {
        const b = resolvedBounds.get(id);
        b.x = offsetX + (b.x - minX) * scale;
        b.y = offsetY + (b.y - minY) * scale;
        b.w = b.w * scale;
        b.h = b.h * scale;
      }
      break;
    }

    default:
      transformWarnings.push({
        type: "unknown_transform",
        transform: type,
        transformId: transform._transformId,
        message: `Unknown transform type: "${type}"`,
      });
      break;
  }

  return transformWarnings;
}

// =============================================================================
// Layout Solve Pipeline (M3.1)
// =============================================================================

/**
 * Check if a value is a deferred _rel marker.
 *
 * @param {*} value
 * @returns {boolean}
 */
function isRelMarker(value) {
  return value !== null && typeof value === "object" && typeof value._rel === "string";
}

/**
 * Deep clone an object (for preserving authored specs).
 * Uses structuredClone if available, otherwise JSON round-trip.
 *
 * @param {*} obj
 * @returns {*}
 */
function deepClone(obj) {
  if (typeof structuredClone === "function") {
    return structuredClone(obj);
  }
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Flatten all elements from a slide definition into a flat map by ID.
 * Recursively traverses groups and stacks to extract children.
 * Returns { flatMap, groupParent, stackParent, stackChildren, groupChildren, panelInternals }
 *
 * @param {Array} elements - Slide elements array
 * @returns {{
 *   flatMap: Map<string, object>,
 *   groupParent: Map<string, string>,
 *   stackParent: Map<string, string>,
 *   stackChildren: Map<string, string[]>,
 *   groupChildren: Map<string, string[]>,
 *   panelInternals: Set<string>
 * }}
 */
function flattenElements(elements) {
  const flatMap = new Map();
  const groupParent = new Map();
  const stackParent = new Map();   // childId -> stackId
  const stackChildren = new Map(); // stackId -> [childId, ...]
  const groupChildren = new Map(); // groupId -> [childId, ...]
  const panelInternals = new Set(); // IDs of synthetic panel elements (bgRect, childStack)

  function walk(els, parentGroupId) {
    for (const el of els) {
      flatMap.set(el.id, el);
      if (parentGroupId) {
        groupParent.set(el.id, parentGroupId);
      }
      if (el.type === "group" && el.children) {
        const childIds = el.children.map(c => c.id);
        groupChildren.set(el.id, childIds);
        // If this group is a panel compound, mark bgRect and childStack as internal
        if (el._compound === "panel" && el.children.length >= 2) {
          panelInternals.add(el.children[0].id); // bgRect
          panelInternals.add(el.children[1].id); // childStack
        }
        walk(el.children, el.id);
      }
      if ((el.type === "vstack" || el.type === "hstack") && el.children) {
        const childIds = [];
        for (const child of el.children) {
          flatMap.set(child.id, child);
          stackParent.set(child.id, el.id);
          childIds.push(child.id);
          // Recursively walk into nested stacks and groups using the same
          // walk function — avoids redundant flattenElements([child]) call.
          // Preserve parentGroupId so nested stacks inside groups retain
          // their group ancestry chain.
          if ((child.type === "vstack" || child.type === "hstack") && child.children) {
            walk([child], parentGroupId);
          } else if (child.type === "group" && child.children) {
            // Record group children and panel internals before recursing,
            // since walk(child.children, ...) doesn't re-process the group node itself.
            const gcIds = child.children.map(c => c.id);
            groupChildren.set(child.id, gcIds);
            if (child._compound === "panel" && child.children.length >= 2) {
              panelInternals.add(child.children[0].id);
              panelInternals.add(child.children[1].id);
            }
            walk(child.children, child.id);
          }
        }
        stackChildren.set(el.id, childIds);
      }
    }
  }

  walk(elements, null);
  return { flatMap, groupParent, stackParent, stackChildren, groupChildren, panelInternals };
}

/**
 * Extract the ref ID from a _rel marker (for dependency graph building).
 *
 * @param {object} marker - A _rel marker object
 * @returns {string|null} The referenced element ID, or null if none
 */
function getRelRef(marker) {
  if (!isRelMarker(marker)) return null;
  // centerIn references a rect, not an element
  if (marker._rel === "centerIn") return null;
  return marker.ref || null;
}

/**
 * Resolve a single _rel marker to an absolute coordinate value.
 *
 * @param {object} marker - The _rel marker
 * @param {string} axis - "x" or "y"
 * @param {object} refBounds - The referenced element's resolved bounds { x, y, w, h }
 * @param {number} ownW - The current element's width
 * @param {number} ownH - The current element's height
 * @returns {number} The resolved absolute coordinate
 */
function resolveRelMarker(marker, axis, refBounds, ownW, ownH) {
  const rel = marker._rel;
  const gap = marker.gap ?? 0;

  switch (rel) {
    case "below":
      // Y = ref's bottom edge + gap
      return refBounds.y + refBounds.h + gap;

    case "above":
      // Y = ref's top edge - own height - gap
      return refBounds.y - ownH - gap;

    case "rightOf":
      // X = ref's right edge + gap
      return refBounds.x + refBounds.w + gap;

    case "leftOf":
      // X = ref's left edge - own width - gap
      return refBounds.x - ownW - gap;

    case "centerV":
      // Center vertically with ref: align midpoints
      return refBounds.y + refBounds.h / 2 - ownH / 2;

    case "centerH":
      // Center horizontally with ref: align midpoints
      return refBounds.x + refBounds.w / 2 - ownW / 2;

    case "alignTop":
      // Y = ref's top edge
      return refBounds.y;

    case "alignBottom":
      // Y = ref's bottom edge - own height
      return refBounds.y + refBounds.h - ownH;

    case "alignLeft":
      // X = ref's left edge
      return refBounds.x;

    case "alignRight":
      // X = ref's right edge - own width
      return refBounds.x + refBounds.w - ownW;

    case "centerIn": {
      // Center within a rectangle
      const r = marker.rect;
      if (axis === "x") {
        return r.x + r.w / 2 - ownW / 2;
      } else {
        return r.y + r.h / 2 - ownH / 2;
      }
    }

    default:
      throw new Error(`Unknown _rel type: "${rel}"`);
  }
}

/**
 * Determine provenance source for a resolved value.
 *
 * @param {*} authoredValue - The original authored value for this property
 * @param {string} prop - Property name (x, y, w, h)
 * @param {object} element - The element
 * @param {boolean} wasMeasured - Whether this dimension was measured
 * @returns {object} Provenance metadata
 */
function buildProvenance(authoredValue, prop, element, wasMeasured) {
  if (isRelMarker(authoredValue)) {
    const prov = { source: "constraint", type: authoredValue._rel };
    if (authoredValue.ref) prov.ref = authoredValue.ref;
    if (authoredValue.ref2 !== undefined) prov.ref2 = authoredValue.ref2;
    if (authoredValue.gap !== undefined) prov.gap = authoredValue.gap;
    if (authoredValue.bias !== undefined) prov.bias = authoredValue.bias;
    if (authoredValue.rect) prov.rect = authoredValue.rect;
    return prov;
  }
  if (wasMeasured && (prop === "w" || prop === "h")) {
    return {
      source: "measured",
      measuredAt: {
        w: element.props?.w ?? null,
        className: element.props?.className || "",
      },
    };
  }
  return { source: "authored", value: authoredValue };
}

/**
 * Compute AABB (Axis-Aligned Bounding Box) intersection between two rectangles.
 * Returns null if no intersection, or the intersection rectangle if they overlap.
 *
 * @param {{ x: number, y: number, w: number, h: number }} a
 * @param {{ x: number, y: number, w: number, h: number }} b
 * @returns {{ x: number, y: number, w: number, h: number }|null}
 */
function computeAABBIntersection(a, b) {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.w, b.x + b.w);
  const y2 = Math.min(a.y + a.h, b.y + b.h);

  const w = x2 - x1;
  const h = y2 - y1;

  if (w > 0 && h > 0) {
    return { x: x1, y: y1, w, h };
  }
  return null;
}

/**
 * Layout solve pipeline — 4-phase resolution.
 *
 * Phase 1: Resolve intrinsic sizes (measure text, compute stack dimensions)
 * Phase 2: Resolve positions via unified topological sort (stacks as nodes)
 * Phase 3: Apply transforms (placeholder for M6)
 * Phase 4: Finalize (collision detection, provenance, validation, scene graph)
 *
 * @param {object} slideDefinition - A slide definition { elements, transforms, ... }
 * @param {object} [options={}] - Layout options
 * @param {number} [options.collisionThreshold=0] - Minimum overlap area to report
 * @returns {Promise<object>} Scene graph: { elements, transforms, warnings, errors, collisions }
 */
export async function layout(slideDefinition, options = {}) {
  const errors = [];
  const warnings = [];
  const elements = slideDefinition.elements || [];
  const transforms = slideDefinition.transforms || [];
  const collisionThreshold = options.collisionThreshold ?? 0;

  // Flatten elements to a map for easy lookup
  const { flatMap, groupParent, stackParent, stackChildren, groupChildren, panelInternals } = flattenElements(elements);

  // =========================================================================
  // Phase 1: Resolve Intrinsic Sizes
  // =========================================================================

  // Store authored specs (deep clone before any modification)
  const authoredSpecs = new Map();
  for (const [id, el] of flatMap) {
    authoredSpecs.set(id, {
      type: el.type,
      content: el.content,
      src: el.src,
      props: deepClone(el.props),
      children: el.children ? el.children.map(c => c.id) : undefined,
    });
  }

  // M8.3: Resolve percentage sugar on x, y, w, h before validation
  for (const [id, el] of flatMap) {
    if (typeof el.props.x === "string" && !isRelMarker(el.props.x)) {
      el.props.x = resolvePercentage(el.props.x, "x");
    }
    if (typeof el.props.y === "string" && !isRelMarker(el.props.y)) {
      el.props.y = resolvePercentage(el.props.y, "y");
    }
    if (typeof el.props.w === "string" && el.props.w !== "fill") {
      el.props.w = resolvePercentage(el.props.w, "w");
    }
    if (typeof el.props.h === "string" && el.props.h !== "fill") {
      el.props.h = resolvePercentage(el.props.h, "h");
    }
  }

  // Validate: _rel markers must only be on x and y, not w or h
  for (const [id, el] of flatMap) {
    if (isRelMarker(el.props.w)) {
      errors.push({
        type: "invalid_rel_on_dimension",
        elementId: id,
        property: "w",
        message: `Element "${id}": _rel marker on "w" is invalid. Deferred values are only valid on x and y.`,
      });
    }
    if (isRelMarker(el.props.h)) {
      errors.push({
        type: "invalid_rel_on_dimension",
        elementId: id,
        property: "h",
        message: `Element "${id}": _rel marker on "h" is invalid. Deferred values are only valid on x and y.`,
      });
    }
  }

  // If there are errors from validation, return early
  if (errors.length > 0) {
    return {
      elements: {},
      transforms: deepClone(transforms),
      warnings,
      errors,
      collisions: [],
    };
  }

  // Resolve intrinsic sizes for all non-stack elements first
  // Map of id -> { w, h, wMeasured, hMeasured }
  const resolvedSizes = new Map();

  for (const [id, el] of flatMap) {
    if (el.type === "vstack" || el.type === "hstack") continue; // handled below
    const dims = await getEffectiveDimensions(el);
    resolvedSizes.set(id, {
      w: dims.w,
      h: dims.h,
      wMeasured: el.type === "el" && (el.props.w === undefined || el.props.w === null),
      hMeasured: dims._autoHeight,
    });
  }

  // Phase 1 (cont): Compute stack sizes from children + gaps
  // Must handle nested stacks bottom-up. We do a simple iterative approach:
  // repeatedly process stacks whose children all have known sizes.
  const pendingStacks = new Set();
  for (const [id, el] of flatMap) {
    if (el.type === "vstack" || el.type === "hstack") {
      pendingStacks.add(id);
    }
  }

  let progress = true;
  while (pendingStacks.size > 0 && progress) {
    progress = false;
    for (const stackId of pendingStacks) {
      const el = flatMap.get(stackId);
      const childIds = stackChildren.get(stackId) || [];
      const gap = resolveSpacing(el.props.gap ?? 0);
      const stackW = el.props.w ?? 0;

      // Check all children have resolved sizes.
      // For panel compounds, also ensure the inner vstack has resolved so that
      // the panel's auto-height is available before the containing stack resolves.
      let allChildrenSized = true;
      for (const cid of childIds) {
        if (!resolvedSizes.has(cid)) {
          allChildrenSized = false;
          break;
        }
        const childEl = flatMap.get(cid);
        if (childEl && childEl._compound === "panel") {
          const config = childEl._panelConfig;
          if (!config) continue;
          const panelChildren = childEl.children || [];
          const childStack = panelChildren[1]; // [bgRect, vstack]
          if (childStack && !resolvedSizes.has(childStack.id)) {
            // Inner vstack hasn't resolved yet — can't compute panel auto-height
            allChildrenSized = false;
            break;
          }
          // Update panel group size from inner vstack (auto-height/width)
          if (childStack && resolvedSizes.has(childStack.id)) {
            const stackSizes = resolvedSizes.get(childStack.id);
            const autoH = config.panelH ?? (stackSizes.h + 2 * config.padding);
            const panelSizes = resolvedSizes.get(cid);
            panelSizes.h = autoH;
            if (config.panelW != null) panelSizes.w = config.panelW;
            // Also update bgRect height
            const bgRect = panelChildren[0];
            if (bgRect && resolvedSizes.has(bgRect.id)) {
              resolvedSizes.get(bgRect.id).h = autoH;
            }
          }
        }
      }
      if (!allChildrenSized) continue;

      if (el.type === "vstack") {
        // For vstack children without explicit w, default to stack's w
        for (const cid of childIds) {
          const child = flatMap.get(cid);
          if ((child.props.w === undefined || child.props.w === null) && stackW > 0) {
            // Update child's resolved size width to use stack width
            const childSize = resolvedSizes.get(cid);
            if (child.type === "el") {
              // Re-measure el() with the stack width constraint
              const html = child.content || "";
              if (html || (child.props.style && Object.keys(child.props.style).length > 0)) {
                const metrics = await measure(html, { ...child.props, w: stackW });
                childSize.w = stackW;
                childSize.h = metrics.h;
                childSize.hMeasured = true;
              } else {
                childSize.w = stackW;
              }
            } else {
              childSize.w = stackW;
            }
          }
        }

        // vstack total: width = max child width (or stack w), height = sum heights + gaps
        let totalH = 0;
        let maxW = 0;
        for (let i = 0; i < childIds.length; i++) {
          const cs = resolvedSizes.get(childIds[i]);
          totalH += cs.h;
          if (i > 0) totalH += gap;
          maxW = Math.max(maxW, cs.w);
        }
        const finalW = stackW || maxW;
        const finalH = (el.props.h !== undefined && el.props.h !== null) ? el.props.h : totalH;

        resolvedSizes.set(stackId, {
          w: finalW,
          h: finalH,
          wMeasured: false,
          hMeasured: el.props.h === undefined || el.props.h === null,
        });
      } else {
        // hstack
        const stackH = el.props.h ?? 0;

        // For hstack children without explicit h, default to stack's h (if provided)
        // hstack children can have their own w; if not provided, they stay as measured
        let totalW = 0;
        let maxH = 0;
        for (let i = 0; i < childIds.length; i++) {
          const cs = resolvedSizes.get(childIds[i]);
          totalW += cs.w;
          if (i > 0) totalW += gap;
          maxH = Math.max(maxH, cs.h);
        }
        const finalW = (el.props.w !== undefined && el.props.w !== null) ? el.props.w : totalW;
        const finalH = stackH || maxH;

        resolvedSizes.set(stackId, {
          w: finalW,
          h: finalH,
          wMeasured: el.props.w === undefined || el.props.w === null,
          hMeasured: el.props.h === undefined || el.props.h === null,
        });
      }

      pendingStacks.delete(stackId);
      progress = true;
    }
  }

  // If any stacks couldn't resolve (circular nesting), error out
  if (pendingStacks.size > 0) {
    errors.push({
      type: "unresolvable_stack_sizes",
      elementIds: Array.from(pendingStacks),
      message: `Could not resolve sizes for stacks: ${Array.from(pendingStacks).join(", ")}`,
    });
    return {
      elements: {},
      transforms: deepClone(transforms),
      warnings,
      errors,
      collisions: [],
    };
  }

  // Phase 1 (cont): Panel auto-height (M7.3)
  // For panel compounds: set the background rect height from the vstack height + 2*padding.
  // Also set the group's height so it participates correctly in other layouts.
  for (const [id, el] of flatMap) {
    if (el._compound !== "panel") continue;
    const config = el._panelConfig;
    if (!config) continue;

    const panelChildren = el.children || [];
    // Panel children: [bgRect, childStack]
    const bgRect = panelChildren[0];
    const childStack = panelChildren[1];
    if (!bgRect || !childStack) continue;

    const stackSizes = resolvedSizes.get(childStack.id);
    if (!stackSizes) continue;

    const autoH = config.panelH ?? (stackSizes.h + 2 * config.padding);

    // Update bg rect height
    if (resolvedSizes.has(bgRect.id)) {
      resolvedSizes.get(bgRect.id).h = autoH;
    }

    // Update group (panel) width and height
    if (resolvedSizes.has(id)) {
      const groupSizes = resolvedSizes.get(id);
      groupSizes.h = autoH;
      if (config.panelW) groupSizes.w = config.panelW;
    } else {
      resolvedSizes.set(id, {
        w: config.panelW || 0,
        h: autoH,
        wMeasured: false,
        hMeasured: config.panelH === undefined || config.panelH === null,
      });
    }
  }

  // Phase 1 (cont): bounds: 'hug' — compute group w/h from children bounding box
  for (const [id, el] of flatMap) {
    if (el.type !== "group" || el.props.bounds !== "hug") continue;
    // Skip compound groups (panel, figure) — they manage their own sizing
    if (el._compound) continue;
    const childIds = groupChildren.get(id);
    if (!childIds || childIds.length === 0) continue;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let validChildren = 0;
    for (const cid of childIds) {
      const child = flatMap.get(cid);
      const cs = resolvedSizes.get(cid);
      if (!cs) continue;
      const cx = child.props.x ?? 0;
      const cy = child.props.y ?? 0;
      // Skip children with _rel markers (unresolved at this phase)
      if (!Number.isFinite(cx) || !Number.isFinite(cy)) continue;
      minX = Math.min(minX, cx);
      minY = Math.min(minY, cy);
      maxX = Math.max(maxX, cx + cs.w);
      maxY = Math.max(maxY, cy + cs.h);
      validChildren++;
    }
    if (validChildren === 0) continue;
    const hugW = maxX - minX;
    const hugH = maxY - minY;

    if (resolvedSizes.has(id)) {
      const gs = resolvedSizes.get(id);
      gs.w = hugW;
      gs.h = hugH;
    } else {
      resolvedSizes.set(id, { w: hugW, h: hugH, wMeasured: false, hMeasured: false });
    }
  }

  // =========================================================================
  // Phase 2: Resolve Positions via Unified Topological Sort
  // =========================================================================

  // Build dependency graph
  // For each element, find what elements it depends on (via _rel markers on x and y)
  // Stack children depend on their parent stack (not on _rel markers — their position
  // is computed by the stack layout algorithm after the stack is positioned).
  const deps = new Map(); // id -> Set<refId>
  for (const [id, el] of flatMap) {
    const depSet = new Set();

    // Stack children depend on their parent stack
    if (stackParent.has(id)) {
      depSet.add(stackParent.get(id));
      // Warn if stack children have _rel markers on x/y — these are ignored
      // because stack layout determines children's positions.
      if (isRelMarker(el.props.x) || isRelMarker(el.props.y)) {
        warnings.push({
          type: "ignored_rel_on_stack_child",
          elementId: id,
          stackId: stackParent.get(id),
          message: `Element "${id}" is a child of stack "${stackParent.get(id)}", so its relative positioning markers on x/y are ignored. Use gap/align on the stack instead.`,
        });
      }
    } else {
      // Only process _rel markers for non-stack-children
      const xRef = getRelRef(el.props.x);
      const yRef = getRelRef(el.props.y);
      if (xRef) {
        if (!flatMap.has(xRef)) {
          errors.push({
            type: "unknown_ref",
            elementId: id,
            property: "x",
            ref: xRef,
            message: `Element "${id}": x references unknown element "${xRef}"`,
          });
        } else {
          depSet.add(xRef);
        }
      }
      if (yRef) {
        if (!flatMap.has(yRef)) {
          errors.push({
            type: "unknown_ref",
            elementId: id,
            property: "y",
            ref: yRef,
            message: `Element "${id}": y references unknown element "${yRef}"`,
          });
        } else {
          depSet.add(yRef);
        }
      }

      // P2.2: "between" markers have a second ref (ref2) that may also be a dependency
      for (const prop of ["x", "y"]) {
        const marker = el.props[prop];
        if (isRelMarker(marker) && marker.ref2 !== undefined && typeof marker.ref2 === "string") {
          if (!flatMap.has(marker.ref2)) {
            errors.push({
              type: "unknown_ref",
              elementId: id,
              property: prop,
              ref: marker.ref2,
              message: `Element "${id}": ${prop} references unknown element "${marker.ref2}" (ref2)`,
            });
          } else {
            depSet.add(marker.ref2);
          }
        }
      }

      // M7.2: Connector elements depend on their fromId and toId
      if (el.type === "connector") {
        const fId = el.props.fromId;
        const tId = el.props.toId;
        if (fId) {
          if (!flatMap.has(fId)) {
            errors.push({
              type: "unknown_ref",
              elementId: id,
              property: "fromId",
              ref: fId,
              message: `Connector "${id}": fromId references unknown element "${fId}"`,
            });
          } else {
            depSet.add(fId);
          }
        }
        if (tId) {
          if (!flatMap.has(tId)) {
            errors.push({
              type: "unknown_ref",
              elementId: id,
              property: "toId",
              ref: tId,
              message: `Connector "${id}": toId references unknown element "${tId}"`,
            });
          } else {
            depSet.add(tId);
          }
        }
      }
    }
    deps.set(id, depSet);
  }

  if (errors.length > 0) {
    return {
      elements: {},
      transforms: deepClone(transforms),
      warnings,
      errors,
      collisions: [],
    };
  }

  // Kahn's algorithm (BFS-based topological sort)
  // Compute in-degree for each node
  const inDegree = new Map();
  for (const [id] of flatMap) {
    inDegree.set(id, 0);
  }
  for (const [id, depSet] of deps) {
    // id depends on each ref in depSet, so the edge is ref -> id
    // in-degree of id increases for each dependency
    inDegree.set(id, depSet.size);
  }

  // Queue starts with nodes that have in-degree 0
  const queue = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) {
      queue.push(id);
    }
  }

  // Build reverse adjacency: for each node, who depends on it
  const reverseDeps = new Map();
  for (const [id] of flatMap) {
    reverseDeps.set(id, []);
  }
  for (const [id, depSet] of deps) {
    for (const ref of depSet) {
      reverseDeps.get(ref).push(id);
    }
  }

  const sortedOrder = [];
  while (queue.length > 0) {
    const nodeId = queue.shift();
    sortedOrder.push(nodeId);
    // For each node that depends on this one, decrement its in-degree
    for (const dependent of reverseDeps.get(nodeId)) {
      const newDeg = inDegree.get(dependent) - 1;
      inDegree.set(dependent, newDeg);
      if (newDeg === 0) {
        queue.push(dependent);
      }
    }
  }

  // Cycle detection: if sortedOrder doesn't include all elements, there's a cycle
  if (sortedOrder.length < flatMap.size) {
    const sortedSet = new Set(sortedOrder);
    const inCycle = [];
    for (const [id] of flatMap) {
      if (!sortedSet.has(id)) {
        inCycle.push(id);
      }
    }
    errors.push({
      type: "dependency_cycle",
      elementIds: inCycle,
      message: `Circular dependency detected among elements: ${inCycle.join(", ")}`,
    });
    return {
      elements: {},
      transforms: deepClone(transforms),
      warnings,
      errors,
      collisions: [],
    };
  }

  // Resolve positions in topological order
  // resolvedBounds: id -> { x, y, w, h } (top-left corner + dimensions)
  const resolvedBounds = new Map();

  for (const id of sortedOrder) {
    const el = flatMap.get(id);
    const sizes = resolvedSizes.get(id);
    const w = sizes.w;
    const h = sizes.h;

    // Stack children get their position from the stack layout algorithm,
    // not from their own x/y props. Skip them here — they are resolved
    // when we process their parent stack. However, if this child is
    // itself a stack (nested stack), we still need to let it position
    // its own children below, so we only skip the x/y resolution.
    let finalX, finalY;

    if (stackParent.has(id)) {
      if (resolvedBounds.has(id)) {
        // Already positioned by parent stack — use those coords
        finalX = resolvedBounds.get(id).x;
        finalY = resolvedBounds.get(id).y;
      } else {
        // Parent hasn't positioned us yet (shouldn't happen with topo sort).
        // Fallback: position at (0, 0)
        finalX = 0;
        finalY = 0;
        resolvedBounds.set(id, { x: 0, y: 0, w, h });
      }
      // If this is NOT a stack itself, we're done — skip to next element.
      // If it IS a stack, fall through to position its own children.
      if (el.type !== "vstack" && el.type !== "hstack") {
        continue;
      }
    } else {
      // Resolve x
      const xIsRel = isRelMarker(el.props.x);
      let x;
      if (xIsRel) {
        const marker = el.props.x;
        if (marker._rel === "centerIn") {
          const r = marker.rect;
          x = r.x + r.w / 2 - w / 2;
        } else if (marker._rel === "between") {
          // P2.2: placeBetween on x-axis (left/right references)
          const leftBounds = resolvedBounds.get(marker.ref);
          const leftEdge = leftBounds.x + leftBounds.w;
          const rightEdge = typeof marker.ref2 === "string"
            ? resolvedBounds.get(marker.ref2).x
            : marker.ref2;
          const availableSlack = rightEdge - leftEdge - w;
          if (availableSlack < 0) {
            warnings.push({
              type: "between_no_fit",
              elementId: id,
              ref1: marker.ref,
              ref2: marker.ref2,
              message: `Element "${id}": does not fit between "${marker.ref}" and ${typeof marker.ref2 === "string" ? `"${marker.ref2}"` : marker.ref2}; using minimum gap fallback.`,
            });
            x = leftEdge + resolveSpacing("xs");
          } else {
            x = leftEdge + availableSlack * marker.bias;
          }
        } else {
          const refId = marker.ref;
          const refBounds = resolvedBounds.get(refId);
          x = resolveRelMarker(marker, "x", refBounds, w, h);
        }
      } else {
        x = el.props.x ?? 0;
      }

      // Resolve y
      const yIsRel = isRelMarker(el.props.y);
      let y;
      if (yIsRel) {
        const marker = el.props.y;
        if (marker._rel === "centerIn") {
          const r = marker.rect;
          y = r.y + r.h / 2 - h / 2;
        } else if (marker._rel === "between") {
          // P2.2: placeBetween — position between two vertical references
          const topBounds = resolvedBounds.get(marker.ref);
          const topEdge = topBounds.y + topBounds.h;
          const bottomEdge = typeof marker.ref2 === "string"
            ? resolvedBounds.get(marker.ref2).y
            : marker.ref2;
          const availableSlack = bottomEdge - topEdge - h;
          if (availableSlack < 0) {
            warnings.push({
              type: "between_no_fit",
              elementId: id,
              ref1: marker.ref,
              ref2: marker.ref2,
              message: `Element "${id}": does not fit between "${marker.ref}" and ${typeof marker.ref2 === "string" ? `"${marker.ref2}"` : marker.ref2}; using minimum gap fallback.`,
            });
            y = topEdge + resolveSpacing("xs");
          } else {
            y = topEdge + availableSlack * marker.bias;
          }
        } else {
          const refId = marker.ref;
          const refBounds = resolvedBounds.get(refId);
          y = resolveRelMarker(marker, "y", refBounds, w, h);
        }
      } else {
        y = el.props.y ?? 0;
      }

      // Apply anchor resolution ONLY to authored (non-_rel) coordinates.
      const anchor = el.props.anchor || "tl";
      const { left: anchoredX, top: anchoredY } = resolveAnchor(x, y, w, h, anchor);
      finalX = xIsRel ? x : anchoredX;
      finalY = yIsRel ? y : anchoredY;

      resolvedBounds.set(id, { x: finalX, y: finalY, w, h });
    }

    // If this is a stack, position all children now
    if (el.type === "vstack" || el.type === "hstack") {
      const childIds = stackChildren.get(id) || [];
      const gap = resolveSpacing(el.props.gap ?? 0);
      const stackX = finalX;
      const stackY = finalY;

      if (el.type === "vstack") {
        const align = el.props.align || "left";
        let curY = stackY;

        if (align === "stretch") {
          // All children get the same width — the max measured width
          // (or the stack's own authored w if present)
          const maxW = childIds.length > 0
            ? Math.max(...childIds.map(cid => resolvedSizes.get(cid).w))
            : 0;
          const stackAuthW = authoredSpecs.get(id)?.props?.w;
          const stretchW = (stackAuthW !== undefined && stackAuthW !== null) ? w : maxW;

          for (let i = 0; i < childIds.length; i++) {
            const cid = childIds[i];
            const cs = resolvedSizes.get(cid);
            // Warn if child had explicit w that differs
            const authoredW = authoredSpecs.get(cid).props.w;
            if (authoredW !== undefined && authoredW !== null && authoredW !== stretchW) {
              warnings.push({
                type: "stretch_override",
                elementId: cid,
                property: "w",
                authored: authoredW,
                stretched: stretchW,
                message: `Child '${cid}' has authored w=${authoredW} but stretch requires w=${stretchW}.`,
              });
            }
            // Re-measure auto-height el() children when width changes
            const childEl = flatMap.get(cid);
            const childAuth = authoredSpecs.get(cid)?.props || {};
            let childH = cs.h;
            if (childEl?.type === "el" && stretchW !== cs.w &&
                (childAuth.h === undefined || childAuth.h === null)) {
              const metrics = await measure(childEl.content || "", { ...childEl.props, w: stretchW });
              childH = metrics.h;
              cs.h = childH;
            }
            resolvedBounds.set(cid, { x: stackX, y: curY, w: stretchW, h: childH });
            curY += childH + gap;
          }
        } else {
          for (let i = 0; i < childIds.length; i++) {
            const cid = childIds[i];
            const cs = resolvedSizes.get(cid);
            let childX;
            if (align === "center") {
              childX = stackX + (w - cs.w) / 2;
            } else if (align === "right") {
              childX = stackX + w - cs.w;
            } else {
              // "left" (default)
              childX = stackX;
            }
            resolvedBounds.set(cid, { x: childX, y: curY, w: cs.w, h: cs.h });
            curY += cs.h + gap;
          }
        }
      } else {
        // hstack
        const align = el.props.align || "top";
        let curX = stackX;

        if (align === "stretch") {
          // All children get the same height — the max measured height
          // (or the stack's own authored h if present)
          const maxH = childIds.length > 0
            ? Math.max(...childIds.map(cid => resolvedSizes.get(cid).h))
            : 0;
          const stackAuthH = authoredSpecs.get(id)?.props?.h;
          const stretchH = (stackAuthH !== undefined && stackAuthH !== null) ? h : maxH;

          for (let i = 0; i < childIds.length; i++) {
            const cid = childIds[i];
            const cs = resolvedSizes.get(cid);
            // Warn if child had explicit h that differs
            const authoredH = authoredSpecs.get(cid).props.h;
            if (authoredH !== undefined && authoredH !== null && authoredH !== stretchH) {
              warnings.push({
                type: "stretch_override",
                elementId: cid,
                property: "h",
                authored: authoredH,
                stretched: stretchH,
                message: `Child '${cid}' has authored h=${authoredH} but stretch requires h=${stretchH}.`,
              });
            }
            resolvedBounds.set(cid, { x: curX, y: stackY, w: cs.w, h: stretchH });
            curX += cs.w + gap;
          }
        } else {
          for (let i = 0; i < childIds.length; i++) {
            const cid = childIds[i];
            const cs = resolvedSizes.get(cid);
            let childY;
            if (align === "middle") {
              childY = stackY + (h - cs.h) / 2;
            } else if (align === "bottom") {
              childY = stackY + h - cs.h;
            } else {
              // "top" (default)
              childY = stackY;
            }
            resolvedBounds.set(cid, { x: curX, y: childY, w: cs.w, h: cs.h });
            curX += cs.w + gap;
          }
        }
      }
    }
  }

  // =========================================================================
  // Phase 2.5: Overflow Policies
  // =========================================================================
  // For el() elements with explicit h, check if content overflows.
  for (const id of sortedOrder) {
    const el = flatMap.get(id);
    if (el.type !== "el") continue;

    const authoredH = authoredSpecs.get(id).props.h;
    if (authoredH === undefined || authoredH === null) continue;

    const bounds = resolvedBounds.get(id);
    const overflow = el.props.overflow || "visible";
    if (overflow === "visible") continue;

    // Measure content to check for overflow
    const html = el.content || "";
    if (!html) continue;

    const metrics = await measure(html, { ...el.props, w: bounds.w });
    const overflows = metrics.h > bounds.h;
    if (!overflows) continue;

    switch (overflow) {
      case "warn":
        warnings.push({
          type: "content_overflow",
          elementId: id,
          overflow: "warn",
          contentHeight: metrics.h,
          boxHeight: bounds.h,
          message: `Content in "${id}" overflows its box (content: ${metrics.h}px, box: ${bounds.h}px)`,
        });
        break;

      case "clip":
        if (!el._layoutFlags) el._layoutFlags = {};
        el._layoutFlags.clip = true;
        break;

      case "error":
        errors.push({
          type: "content_overflow",
          elementId: id,
          overflow: "error",
          contentHeight: metrics.h,
          boxHeight: bounds.h,
          message: `Content in "${id}" overflows its box (content: ${metrics.h}px, box: ${bounds.h}px)`,
        });
        break;
    }
  }

  // =========================================================================
  // Phase 3: Apply Transforms (M6)
  // =========================================================================
  // Process each transform in order, modifying resolved positions/sizes.
  // After applying a transform, update provenance to source: "transform".
  // Reset the transform ID counter for deterministic IDs.
  set_transformIdCounter(0);

  // Re-assign transform IDs deterministically for this layout call
  const resolvedTransforms = [];
  for (const t of transforms) {
    // Pass through null/invalid entries as-is — they'll be caught by validation below
    if (!t || typeof t !== "object") {
      resolvedTransforms.push(t);
      continue;
    }
    // If the transform already has a _transformId, preserve it;
    // otherwise it will already have one from the factory function.
    const transformCopy = deepClone(t);
    if (!transformCopy._transformId) {
      transformCopy._transformId = nextTransformId();
    }
    resolvedTransforms.push(transformCopy);
  }

  // Capture bounds before any transforms for per-axis provenance comparison
  const preTransformBounds = new Map();
  for (const [id, b] of resolvedBounds) {
    preTransformBounds.set(id, { x: b.x, y: b.y, w: b.w, h: b.h });
  }

  for (const t of resolvedTransforms) {
    // Validate transform object shape
    if (!t || typeof t._transform !== "string") {
      warnings.push({
        type: "invalid_transform_object",
        transform: t,
        message: "Invalid object in transforms array. Each transform must be created by a SlideKit transform function.",
      });
      continue;
    }

    const transformWarnings = applyTransform(t, resolvedBounds, flatMap);
    for (const w of transformWarnings) {
      warnings.push(w);
    }
  }

  // =========================================================================
  // Phase 4: Finalize
  // =========================================================================

  // Build provenance metadata and scene graph
  const sceneElements = {};

  for (const id of sortedOrder) {
    const el = flatMap.get(id);
    const authored = authoredSpecs.get(id);
    const bounds = resolvedBounds.get(id);
    const sizes = resolvedSizes.get(id);

    // Build provenance for each dimension
    // Stack children get provenance source: "stack"
    let provenance;
    if (stackParent.has(id)) {
      const parentStackId = stackParent.get(id);
      provenance = {
        x: { source: "stack", stackId: parentStackId },
        y: { source: "stack", stackId: parentStackId },
        w: buildProvenance(authored.props.w, "w", el, sizes.wMeasured),
        h: buildProvenance(authored.props.h, "h", el, sizes.hMeasured),
      };
    } else {
      provenance = {
        x: buildProvenance(authored.props.x, "x", el, false),
        y: buildProvenance(authored.props.y, "y", el, false),
        w: buildProvenance(authored.props.w, "w", el, sizes.wMeasured),
        h: buildProvenance(authored.props.h, "h", el, sizes.hMeasured),
      };
    }

    // M6: Override provenance per-axis for elements affected by transforms.
    // Only mark axes where the value actually changed.
    const preBounds = preTransformBounds.get(id);
    if (preBounds) {
      if (bounds.x !== preBounds.x) {
        provenance.x = { source: "transform", original: provenance.x };
      }
      if (bounds.y !== preBounds.y) {
        provenance.y = { source: "transform", original: provenance.y };
      }
      if (bounds.w !== preBounds.w) {
        provenance.w = { source: "transform", original: provenance.w };
      }
      if (bounds.h !== preBounds.h) {
        provenance.h = { source: "transform", original: provenance.h };
      }
    }

    // Determine parentId: group parent takes precedence, then stack parent.
    // Use ?? (nullish coalescing) to avoid dropping falsy-but-valid IDs.
    const parentId = (groupParent.get(id) ?? stackParent.get(id)) ?? null;

    // Determine children array (ordered)
    let children = [];
    if (el.type === "group" && groupChildren.has(id)) {
      children = groupChildren.get(id);
    } else if ((el.type === "vstack" || el.type === "hstack") && stackChildren.has(id)) {
      children = stackChildren.get(id);
    }

    // Compute localResolved (position relative to parent)
    let localResolved;
    if (!parentId) {
      // Root element: local = absolute
      localResolved = { ...bounds };
    } else if (groupParent.has(id)) {
      // Group child: resolved is already group-relative
      localResolved = { ...bounds };
    } else {
      // Stack child: resolved is absolute; subtract stack's position
      const stackBounds = resolvedBounds.get(parentId);
      if (stackBounds) {
        localResolved = {
          x: bounds.x - stackBounds.x,
          y: bounds.y - stackBounds.y,
          w: bounds.w,
          h: bounds.h,
        };
      } else {
        localResolved = { ...bounds };
      }
    }

    sceneElements[id] = {
      id,
      type: el.type,
      authored: authored,
      resolved: { ...bounds },
      localResolved,
      parentId,
      children,
      _internal: panelInternals.has(id),
      provenance,
    };

    // Store layout flags for rendering
    if (el._layoutFlags) {
      sceneElements[id]._layoutFlags = { ...el._layoutFlags };
    }
  }

  // Build rootIds: top-level elements with no parent
  const rootIds = [];
  for (const id of sortedOrder) {
    if (sceneElements[id] && sceneElements[id].parentId === null) {
      rootIds.push(id);
    }
  }

  // =========================================================================
  // Phase 4 (cont): Resolve Connector Endpoints (M7.2)
  // =========================================================================
  // After all positions are resolved, compute connection points for connectors.

  for (const id of sortedOrder) {
    const el = flatMap.get(id);
    if (el.type !== "connector") continue;

    const fromId = el.props.fromId;
    const toId = el.props.toId;
    const fromBounds = resolvedBounds.get(fromId);
    const toBounds = resolvedBounds.get(toId);

    if (!fromBounds || !toBounds) {
      warnings.push({
        type: "connector_missing_endpoint",
        elementId: id,
        message: `Connector "${id}": could not resolve endpoints (from: "${fromId}", to: "${toId}")`,
      });
      continue;
    }

    const fromAnchor = el.props.fromAnchor || "cr";
    const toAnchor = el.props.toAnchor || "cl";

    const fromPt = getAnchorPoint(fromBounds, fromAnchor);
    const toPt = getAnchorPoint(toBounds, toAnchor);

    // Compute the bounding box for the connector line so resolvedBounds is meaningful
    const connMinX = Math.min(fromPt.x, toPt.x);
    const connMinY = Math.min(fromPt.y, toPt.y);
    const connMaxX = Math.max(fromPt.x, toPt.x);
    const connMaxY = Math.max(fromPt.y, toPt.y);
    resolvedBounds.set(id, {
      x: connMinX,
      y: connMinY,
      w: connMaxX - connMinX,
      h: connMaxY - connMinY,
    });

    // Store resolved connector data in the scene element and update resolved bounds
    if (sceneElements[id]) {
      const connBounds = {
        x: connMinX,
        y: connMinY,
        w: connMaxX - connMinX,
        h: connMaxY - connMinY,
      };
      sceneElements[id].resolved = { ...connBounds };
      // Connectors are root elements, so localResolved === resolved
      sceneElements[id].localResolved = { ...connBounds };
      sceneElements[id]._connectorResolved = {
        from: fromPt,
        to: toPt,
        fromId,
        toId,
        fromAnchor,
        toAnchor,
      };
    }
  }

  // =========================================================================
  // Phase 4 (cont): Collision Detection (M5.1)
  // =========================================================================

  const collisions = [];

  // Helper: compute absolute (slide-level) bounds for an element by walking
  // up the group/stack parent ancestry chain.  Stack children have coords set
  // by their parent stack; if that stack lives inside a group, the coords are
  // group-relative and need the group's offset added.
  function absoluteBounds(id) {
    const bounds = resolvedBounds.get(id);
    if (!bounds) return null;
    let offsetX = 0, offsetY = 0;
    let current = id;
    while (true) {
      const gp = groupParent.get(current);
      if (gp) {
        const gpBounds = resolvedBounds.get(gp);
        if (gpBounds) {
          offsetX += gpBounds.x;
          offsetY += gpBounds.y;
        }
        current = gp;
        continue;
      }
      const sp = stackParent.get(current);
      if (sp) {
        // Stack children's coords already include the stack's position,
        // but the stack itself might be inside a group — keep walking.
        current = sp;
        continue;
      }
      break;
    }
    return { x: bounds.x + offsetX, y: bounds.y + offsetY, w: bounds.w, h: bounds.h };
  }

  // Helper: check if `ancestorId` is an ancestor of `id` by walking the
  // stack-parent / group-parent chains.  Used to skip ancestor-descendant
  // pairs in collision detection.
  function isAncestorOf(ancestorId, id) {
    let current = id;
    while (true) {
      const gp = groupParent.get(current);
      if (gp) {
        if (gp === ancestorId) return true;
        current = gp;
        continue;
      }
      const sp = stackParent.get(current);
      if (sp) {
        if (sp === ancestorId) return true;
        current = sp;
        continue;
      }
      return false;
    }
  }

  // Collect elements for collision detection, grouped by layer.
  // Stack children appear as individual elements.
  // Skip: group children (positioned relative to group), stacks themselves
  // (their children are the real elements).
  const layerElements = { bg: [], content: [], overlay: [] };
  for (const id of sortedOrder) {
    const el = flatMap.get(id);
    // Skip group children (they use group-relative coordinates)
    if (groupParent.has(id)) continue;
    // Skip stack containers (their children represent the real space)
    if (el.type === "vstack" || el.type === "hstack") continue;

    // Skip zero-sized elements (they can never produce meaningful collisions)
    const elBounds = resolvedBounds.get(id);
    if (!elBounds || elBounds.w <= 0 || elBounds.h <= 0) continue;

    const layer = el.props.layer || "content";
    if (!layerElements[layer]) layerElements[layer] = [];
    layerElements[layer].push(id);
  }

  // Check collisions within each layer: O(n^2/2)
  // M8.4: For rotated elements, use the AABB of the rotated rectangle.
  for (const layer of Object.keys(layerElements)) {
    const ids = layerElements[layer];
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const idA = ids[i];
        const idB = ids[j];

        // Skip if one is an ancestor of the other (group/stack containment).
        // Walks the full ancestry chain, not just direct parents, so that
        // e.g. a panel group is not flagged against its deeply-nested children.
        if (isAncestorOf(idA, idB) || isAncestorOf(idB, idA)) continue;

        // Use absolute bounds so elements inside groups are compared
        // correctly (their resolvedBounds may be group-relative).
        let boundsA = absoluteBounds(idA);
        let boundsB = absoluteBounds(idB);
        if (!boundsA || !boundsB) continue;

        // Apply AABB expansion for rotated elements
        const elA = flatMap.get(idA);
        const elB = flatMap.get(idB);
        if (elA?.props?.rotate) {
          const aabb = rotatedAABB(boundsA.w, boundsA.h, elA.props.rotate);
          const cx = boundsA.x + boundsA.w / 2;
          const cy = boundsA.y + boundsA.h / 2;
          boundsA = { x: cx - aabb.w / 2, y: cy - aabb.h / 2, w: aabb.w, h: aabb.h };
        }
        if (elB?.props?.rotate) {
          const aabb = rotatedAABB(boundsB.w, boundsB.h, elB.props.rotate);
          const cx = boundsB.x + boundsB.w / 2;
          const cy = boundsB.y + boundsB.h / 2;
          boundsB = { x: cx - aabb.w / 2, y: cy - aabb.h / 2, w: aabb.w, h: aabb.h };
        }

        const overlapRect = computeAABBIntersection(boundsA, boundsB);
        if (overlapRect) {
          const overlapArea = overlapRect.w * overlapRect.h;
          if (overlapArea > collisionThreshold) {
            collisions.push({
              elementA: idA,
              elementB: idB,
              overlapRect,
              overlapArea,
            });
          }
        }
      }
    }
  }

  // =========================================================================
  // Phase 4 (cont): Presentation-Specific Validations (M4.3)
  // =========================================================================

  const cfg = _config || { slide: { w: 1920, h: 1080 }, minFontSize: 24, strict: false };
  const slideW = cfg.slide?.w ?? 1920;
  const slideH = cfg.slide?.h ?? 1080;
  const isStrict = cfg.strict === true;
  const minFontSizeThreshold = cfg.minFontSize ?? 24;

  // Safe zone check
  const sr = _safeRectCache;
  if (sr) {
    for (const id of sortedOrder) {
      const el = flatMap.get(id);
      // Skip bg-layer elements (full-bleed backgrounds are expected to exceed safe zone)
      if (el.props.layer === "bg") continue;
      // Skip group children (they are positioned relative to the group)
      if (groupParent.has(id)) continue;
      // Skip stack children (they inherit the stack's positioning context)
      if (stackParent.has(id)) continue;
      // Skip stack containers — validate their children individually instead
      if (el.type === "vstack" || el.type === "hstack") continue;

      const bounds = resolvedBounds.get(id);
      const outsideSafe = bounds.x < sr.x ||
        bounds.y < sr.y ||
        bounds.x + bounds.w > sr.x + sr.w ||
        bounds.y + bounds.h > sr.y + sr.h;

      if (outsideSafe) {
        const suggestion = `. If intentional, set layer: 'bg' to silence this check.`;
        if (isStrict) {
          errors.push({
            type: "outside_safe_zone",
            elementId: id,
            resolved: { ...bounds },
            safeRect: { ...sr },
            message: `Element "${id}" extends outside the safe zone` + suggestion,
          });
        } else {
          warnings.push({
            type: "outside_safe_zone",
            elementId: id,
            resolved: { ...bounds },
            safeRect: { ...sr },
            message: `Element "${id}" extends outside the safe zone` + suggestion,
          });
        }
      }
    }
  }

  // Slide bounds check
  for (const id of sortedOrder) {
    const el = flatMap.get(id);
    // Skip group children
    if (groupParent.has(id)) continue;
    // Skip stack children and stack containers for this check
    if (stackParent.has(id)) continue;
    if (el.type === "vstack" || el.type === "hstack") continue;

    const bounds = resolvedBounds.get(id);
    const outsideSlide = bounds.x < 0 ||
      bounds.y < 0 ||
      bounds.x + bounds.w > slideW ||
      bounds.y + bounds.h > slideH;

    if (outsideSlide) {
      if (isStrict) {
        errors.push({
          type: "outside_slide",
          elementId: id,
          resolved: { ...bounds },
          slideRect: { x: 0, y: 0, w: slideW, h: slideH },
          message: `Element "${id}" extends outside the slide bounds (${slideW}x${slideH})`,
        });
      } else {
        warnings.push({
          type: "outside_slide",
          elementId: id,
          resolved: { ...bounds },
          slideRect: { x: 0, y: 0, w: slideW, h: slideH },
          message: `Element "${id}" extends outside the slide bounds (${slideW}x${slideH})`,
        });
      }
    }
  }

  // Content area usage check
  if (sr) {
    let contentMinX = Infinity, contentMinY = Infinity;
    let contentMaxX = -Infinity, contentMaxY = -Infinity;
    let hasContentElements = false;

    for (const id of sortedOrder) {
      const el = flatMap.get(id);
      // Only check content-layer elements, skip group children
      if (el.props.layer !== "content") continue;
      if (groupParent.has(id)) continue;
      // Skip stack containers — count their children instead
      if (el.type === "vstack" || el.type === "hstack") continue;

      const bounds = resolvedBounds.get(id);
      hasContentElements = true;
      contentMinX = Math.min(contentMinX, bounds.x);
      contentMinY = Math.min(contentMinY, bounds.y);
      contentMaxX = Math.max(contentMaxX, bounds.x + bounds.w);
      contentMaxY = Math.max(contentMaxY, bounds.y + bounds.h);
    }

    if (hasContentElements) {
      const contentW = contentMaxX - contentMinX;
      const contentH = contentMaxY - contentMinY;
      const contentArea = contentW * contentH;
      const safeArea = sr.w * sr.h;
      const usageRatio = contentArea / safeArea;

      if (usageRatio < 0.40) {
        warnings.push({
          type: "content_clustered",
          usageRatio,
          contentBounds: { x: contentMinX, y: contentMinY, w: contentW, h: contentH },
          message: `Content uses only ${(usageRatio * 100).toFixed(1)}% of the safe zone — content may be too clustered`,
        });
      } else if (usageRatio > 0.95) {
        warnings.push({
          type: "content_no_breathing_room",
          usageRatio,
          contentBounds: { x: contentMinX, y: contentMinY, w: contentW, h: contentH },
          message: `Content uses ${(usageRatio * 100).toFixed(1)}% of the safe zone — no breathing room`,
        });
      }
    }
  }

  // Panel overflow warnings (P2.4)
  for (const [id, el] of flatMap) {
    if (el._compound !== "panel") continue;
    const config = el._panelConfig;
    if (!config || config.panelH == null) continue; // skip auto-height panels

    const childStack = (el.children || [])[1];
    if (!childStack) continue;
    const stackSizes = resolvedSizes.get(childStack.id);
    if (!stackSizes) continue;

    const contentH = stackSizes.h + 2 * config.padding;
    const authoredH = config.panelH;
    if (contentH > authoredH) {
      warnings.push({
        type: "panel_overflow",
        elementId: id,
        contentHeight: contentH,
        authoredHeight: authoredH,
        overflow: contentH - authoredH,
        message: `Panel '${id}' content (${contentH}px) exceeds authored height (${authoredH}px) by ${contentH - authoredH}px. Remove explicit h to let panel size to content.`,
      });
    }
  }

  // Alignment consistency heuristics (P3.3)

  // 1. Ragged-bottom detection on hstacks
  for (const [id, el] of flatMap) {
    if (el.type !== "hstack") continue;
    const align = el.props.align || "top";
    if (align === "stretch") continue; // already equal-height
    const childIds = stackChildren.get(id) || [];
    if (childIds.length < 2) continue;

    const childHeights = [];
    for (const cid of childIds) {
      const bounds = resolvedBounds.get(cid);
      if (bounds) childHeights.push(bounds.h);
    }
    if (childHeights.length < 2) continue;
    const maxH = Math.max(...childHeights);
    const minH = Math.min(...childHeights);
    if (maxH - minH > 5) {
      warnings.push({
        type: "ragged_bottom",
        elementId: id,
        childHeights,
        maxHeight: maxH,
        message: `hstack '${id}' has children with unequal heights (${minH}-${maxH}px). Consider align: 'stretch' for equal-height cards.`,
      });
    }
  }

  // 2. Off-center assembly detection
  for (const [id, el] of flatMap) {
    if (el.type !== "group") continue;
    if (el.props.bounds === "hug") continue; // hug handles centering correctly
    if (el._compound) continue; // skip panels, figures, etc.
    const anchor = el.props.anchor;
    if (!anchor || typeof anchor !== "string" || !anchor.includes("c")) continue;
    // anchor column must be center (second character is 'c')
    if (anchor[1] !== "c") continue;

    const childIds = groupChildren.get(id) || [];
    if (childIds.length === 0) continue;

    const authoredW = el.props.w;
    if (authoredW === undefined || authoredW === null) continue;

    // Compute actual children bounding box width from resolvedBounds
    // (group children's resolvedBounds are already group-relative)
    let contentMinX = Infinity, contentMaxX = -Infinity;
    let validChildren = 0;
    for (const cid of childIds) {
      const cb = resolvedBounds.get(cid);
      if (!cb) continue;
      contentMinX = Math.min(contentMinX, cb.x);
      contentMaxX = Math.max(contentMaxX, cb.x + cb.w);
      validChildren++;
    }
    if (validChildren === 0) continue;
    const contentW = contentMaxX - contentMinX;

    if (Math.abs(authoredW - contentW) > 20) {
      warnings.push({
        type: "off_center_assembly",
        elementId: id,
        authoredW,
        contentW,
        message: `Group '${id}' has authored w=${authoredW} but content spans ${contentW}px. Consider bounds: 'hug' for accurate centering.`,
      });
    }
  }

  return {
    elements: sceneElements,
    rootIds,
    transforms: resolvedTransforms,
    warnings,
    errors,
    collisions,
  };
}

// =============================================================================
// Updated Renderer — Uses Layout Solve (M3.3)
// =============================================================================

/**
 * Render a single SlideKit element using resolved bounds from the scene graph.
 *
 * @param {object} element - SlideKit element
 * @param {number} zIndex - Computed z-index for this element
 * @param {object} sceneElements - The resolved scene graph elements map
 * @param {number} [offsetX=0] - Offset to subtract from resolved x (for stack children)
 * @param {number} [offsetY=0] - Offset to subtract from resolved y (for stack children)
 * @returns {HTMLElement} The rendered DOM element
 */
function renderElementFromScene(element, zIndex, sceneElements, offsetX = 0, offsetY = 0) {
  const { type, props } = element;
  const resolved = sceneElements[element.id]?.resolved;

  // Use resolved bounds from the scene graph if available, otherwise fall back
  let left, top, w, h;
  if (resolved) {
    left = resolved.x - offsetX;
    top = resolved.y - offsetY;
    w = resolved.w;
    h = resolved.h;
  } else {
    // Fallback for elements not in scene graph — use props directly.
    // getEffectiveDimensions is async (for el() measurement) but render
    // is synchronous, so we use raw props here. Elements should always
    // be resolved by layout() before reaching render.
    w = props.w || 0;
    h = props.h || 0;
    const anchor = props.anchor || "tl";
    const anchorResult = resolveAnchor(props.x ?? 0, props.y ?? 0, w, h, anchor);
    left = anchorResult.left;
    top = anchorResult.top;
  }

  // Build the merged CSS from convenience props + user style
  const { filtered: mergedStyle, warnings: styleWarnings } = filterStyle(props.style || {}, type);

  // Surface blocked-property warnings via console and scene graph
  if (styleWarnings.length > 0) {
    for (const warn of styleWarnings) {
      console.warn(`[SlideKit] Element "${element.id}": style.${warn.property} is blocked. ${warn.suggestion}`);
    }
    // Attach to scene graph so getLayout() / inspection can see them
    const sceneEntry = sceneElements[element.id];
    if (sceneEntry) {
      sceneEntry.styleWarnings = styleWarnings;
    }
  }

  // Create the element div
  const div = document.createElement("div");
  div.setAttribute("data-sk-id", element.id);

  // Base layout CSS (library-controlled)
  div.style.position = "absolute";
  div.style.left = `${left}px`;
  div.style.top = `${top}px`;
  div.style.width = `${w}px`;
  div.style.height = `${h}px`;
  div.style.boxSizing = "border-box";
  div.style.zIndex = String(zIndex);

  // Opacity
  if (props.opacity !== undefined && props.opacity !== 1) {
    div.style.opacity = String(props.opacity);
  }

  // M8.4: Rotate — apply via CSS transform (dedicated prop, not user style)
  if (props.rotate !== undefined && props.rotate !== 0) {
    div.style.transform = `rotate(${props.rotate}deg)`;
  }

  // Apply className
  if (props.className) {
    div.className = props.className;
  }

  // Apply merged styling CSS
  applyStyleToDOM(div, mergedStyle);

  // M4.2: Apply layout flags from overflow policies
  const layoutFlags = sceneElements[element.id]?._layoutFlags;
  if (layoutFlags?.clip) {
    div.style.overflow = "hidden";
  }

  // Type-specific rendering
  switch (type) {
    case "el": {
      // v2: Render arbitrary HTML content via innerHTML
      div.setAttribute("data-sk-type", "el");
      div.innerHTML = element.content || "";
      break;
    }

    case "group": {
      const children = element.children || [];
      const childZMap = computeZOrder(children);
      for (const child of children) {
        const childZ = childZMap.get(child.id) || 0;
        const childEl = renderElementFromScene(child, childZ, sceneElements);
        div.appendChild(childEl);
      }
      break;
    }

    case "vstack":
    case "hstack": {
      // Stack containers render their children as absolutely-positioned elements.
      // Children have absolute (slide-level) coordinates in the scene graph,
      // but since they are nested in the stack div, we need to offset them
      // relative to the stack's position. We pass the stack's position as
      // offset parameters to avoid O(N*M) shallow copies of the scene map.
      div.style.overflow = "visible";
      const stackChildElems = element.children || [];
      // Use computeZOrder for consistent z-ordering (same as groups)
      const childZMap = computeZOrder(stackChildElems);
      for (const child of stackChildElems) {
        const childResolved = sceneElements[child.id]?.resolved;
        if (childResolved) {
          const childZ = childZMap.get(child.id) || 0;
          // Pass the stack's position as offsets so children render at
          // stack-relative coordinates without copying the scene map
          const childEl = renderElementFromScene(
            child, childZ, sceneElements,
            left + offsetX, top + offsetY
          );
          div.appendChild(childEl);
        }
      }
      break;
    }

    case "connector": {
      // Connector elements are rendered as SVG overlays.
      // The scene graph contains resolved endpoint coordinates.
      const connectorData = sceneElements[element.id]?._connectorResolved;
      if (connectorData) {
        const svgWrapper = buildConnectorSVG(
          connectorData.from,
          connectorData.to,
          { ...props, _markerId: element.id }
        );
        // Return the SVG wrapper directly instead of the div
        svgWrapper.setAttribute("data-sk-id", element.id);
        svgWrapper.style.zIndex = String(zIndex);
        if (props.opacity !== undefined && props.opacity !== 1) {
          svgWrapper.style.opacity = String(props.opacity);
        }
        return svgWrapper;
      }
      break;
    }

    default:
      break;
  }

  return div;
}

/**
 * Render an array of slide definitions into DOM elements.
 *
 * Now uses the layout solve pipeline (M3.3):
 * 1. Calls layout() to get the resolved scene graph
 * 2. Uses resolved positions from the scene graph when creating DOM elements
 * 3. Persists the scene model on window.sk
 * 4. Returns the layout result
 *
 * @param {Array} slides - Array of slide definitions
 * @param {object} [options={}] - Render options
 * @param {HTMLElement} [options.container] - Target container element
 * @returns {Promise<{ sections: Array<HTMLElement>, layouts: Array<object> }>}
 */
export async function render(slides, options = {}) {
  // Reset ID counter at start of render for deterministic IDs
  resetIdCounter();

  const container = options.container ||
    document.querySelector(".reveal .slides");

  if (!container) {
    throw new Error(
      "render() requires a container element. Provide options.container or " +
      "ensure a .reveal .slides element exists in the DOM."
    );
  }

  const sections = [];
  const layouts = [];

  // Inject baseline CSS for el() elements once per render
  if (!container.querySelector("style[data-sk-baseline]")) {
    const baselineStyle = document.createElement("style");
    baselineStyle.setAttribute("data-sk-baseline", "");
    baselineStyle.textContent = _baselineCSS('[data-sk-type="el"]');
    container.appendChild(baselineStyle);
  }

  // Read config once outside the loop to avoid repeated deep-copy overhead
  const cfg = getConfig();
  const slideW = cfg?.slide?.w ?? 1920;
  const slideH = cfg?.slide?.h ?? 1080;

  for (const slide of slides) {
    // Run layout solve for this slide
    const layoutResult = await layout(slide);
    layouts.push(layoutResult);

    // Create the <section> for this slide
    const section = document.createElement("section");

    // Set slide ID if provided
    if (slide.id) {
      section.id = slide.id;
    }

    // Apply slide background
    if (slide.background) {
      applySlideBackground(section, slide.background);
    }

    // Create the slidekit-layer container
    const layer = document.createElement("div");
    layer.className = "slidekit-layer";
    layer.style.position = "relative";
    layer.style.width = `${slideW}px`;
    layer.style.height = `${slideH}px`;

    // Render elements using resolved positions from scene graph
    const elements = slide.elements || [];
    const zMap = computeZOrder(elements);

    for (const element of elements) {
      const zIndex = zMap.get(element.id) || 0;
      const domEl = renderElementFromScene(element, zIndex, layoutResult.elements);
      layer.appendChild(domEl);
    }

    section.appendChild(layer);

    // Speaker notes
    if (slide.notes) {
      const aside = document.createElement("aside");
      aside.className = "notes";
      aside.textContent = slide.notes;
      section.appendChild(aside);
    }

    // Append section to container
    container.appendChild(section);
    sections.push(section);
  }

  // =========================================================================
  // Post-render Phase: DOM overflow detection (P0.2)
  // =========================================================================
  // After all slides are rendered to DOM, check every `el`-type element for
  // cases where the browser's rendered content overflows its allocated box.
  // This catches divergences between off-screen measure() and actual browser
  // layout (font metric differences, line wrapping variations, etc.).
  for (let i = 0; i < layouts.length; i++) {
    const layoutResult = layouts[i];
    const sceneElements = layoutResult.elements;
    const section = sections[i];

    for (const [id, entry] of Object.entries(sceneElements)) {
      // Only check el-type elements (text elements). Groups, stacks,
      // connectors don't have meaningful overflow concerns.
      if (entry.type !== "el") continue;

      const dom = section.querySelector(`[data-sk-id="${id}"]`);
      if (!dom) continue;

      // Use 1px tolerance to avoid sub-pixel false positives
      if (dom.scrollHeight > dom.clientHeight + 1) {
        layoutResult.warnings.push({
          type: "dom_overflow_y",
          elementId: id,
          clientHeight: dom.clientHeight,
          scrollHeight: dom.scrollHeight,
          overflow: dom.scrollHeight - dom.clientHeight,
        });
      }

      if (dom.scrollWidth > dom.clientWidth + 1) {
        layoutResult.warnings.push({
          type: "dom_overflow_x",
          elementId: id,
          clientWidth: dom.clientWidth,
          scrollWidth: dom.scrollWidth,
          overflow: dom.scrollWidth - dom.clientWidth,
        });
      }
    }
  }

  // Persist scene model on window.sk (M3.3 — Phase 2 requirement)
  if (typeof window !== "undefined") {
    window.sk = {
      layouts,
      slides: slides.map((s, i) => ({
        id: s.id || `slide-${i}`,
        layout: layouts[i],
      })),
      // M8.1: Expose config for debug overlay to read safe zone info
      _config: _config ? JSON.parse(JSON.stringify(_config)) : null,
    };
  }

  return { sections, layouts };
}

// =============================================================================
// Compound Primitives — connect, panel (M7)
// =============================================================================

/**
 * Create a connector element between two elements.
 *
 * Returns a special element type "connector" that gets resolved during
 * layout Phase 4 after all element positions are finalized.
 * The connector computes endpoints based on anchor points on the source
 * and target elements, then renders as SVG.
 *
 * @param {string} fromId - ID of the source element
 * @param {string} toId - ID of the target element
 * @param {object} [props={}] - Connector properties
 * @param {string} [props.type="straight"] - Line type: "straight", "curved", "elbow"
 * @param {string} [props.arrow="end"] - Arrow heads: "none", "start", "end", "both"
 * @param {string} [props.color="#ffffff"] - Line color
 * @param {number} [props.thickness=2] - Line thickness
 * @param {Array|null} [props.dash=null] - Dash array (e.g., [5, 5]) or null for solid
 * @param {string} [props.fromAnchor="cr"] - Anchor point on source element
 * @param {string} [props.toAnchor="cl"] - Anchor point on target element
 * @param {string} [props.label] - Optional label text
 * @param {object} [props.labelStyle] - Style for the label { size, color, font, weight }
 * @returns {{ id: string, type: string, props: object }}
 */
export function connect(fromId, toId, props = {}) {
  const { id: customId, ...rest } = props;
  const id = customId || nextId();

  const resolved = {
    connectorType: rest.type || "straight",
    arrow: rest.arrow ?? "end",
    color: rest.color || "#ffffff",
    thickness: rest.thickness ?? 2,
    dash: rest.dash || null,
    fromAnchor: rest.fromAnchor || "cr",
    toAnchor: rest.toAnchor || "cl",
    label: rest.label || null,
    labelStyle: rest.labelStyle || {},
    fromId,
    toId,
    // Common props
    x: 0,
    y: 0,
    layer: rest.layer || "content",
    opacity: rest.opacity ?? 1,
    style: rest.style || {},
    className: rest.className || "",
    anchor: "tl",
  };

  return { id, type: "connector", props: resolved };
}

/**
 * Compute pixel coordinates for an anchor point on an element's bounding box.
 *
 * @param {{ x: number, y: number, w: number, h: number }} bounds
 * @param {string} anchor - Anchor point (tl, tc, tr, cl, cc, cr, bl, bc, br)
 * @returns {{ x: number, y: number }}
 */
function getAnchorPoint(bounds, anchor) {
  const row = anchor[0]; // t, c, b
  const col = anchor[1]; // l, c, r

  let px, py;

  if (col === "l") px = bounds.x;
  else if (col === "c") px = bounds.x + bounds.w / 2;
  else px = bounds.x + bounds.w; // "r"

  if (row === "t") py = bounds.y;
  else if (row === "c") py = bounds.y + bounds.h / 2;
  else py = bounds.y + bounds.h; // "b"

  return { x: px, y: py };
}

/**
 * Build an SVG element for a connector between two points.
 *
 * @param {object} from - { x, y } start point
 * @param {object} to - { x, y } end point
 * @param {object} connProps - Connector properties from the element
 * @returns {HTMLElement} An absolutely positioned div containing the SVG
 */
function buildConnectorSVG(from, to, connProps) {
  // Dynamic padding: enough room for arrowhead markers + stroke width
  const thickness = connProps.thickness ?? 2;
  const markerSize = 8; // matches marker markerWidth/markerHeight
  const padding = Math.max(20, markerSize + thickness * 2);
  const minX = Math.min(from.x, to.x) - padding;
  const minY = Math.min(from.y, to.y) - padding;
  const maxX = Math.max(from.x, to.x) + padding;
  const maxY = Math.max(from.y, to.y) + padding;
  const svgW = maxX - minX;
  const svgH = maxY - minY;

  // Local coordinates within the SVG
  const lx1 = from.x - minX;
  const ly1 = from.y - minY;
  const lx2 = to.x - minX;
  const ly2 = to.y - minY;

  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("width", String(svgW));
  svg.setAttribute("height", String(svgH));
  svg.setAttribute("viewBox", `0 0 ${svgW} ${svgH}`);
  svg.style.overflow = "visible";

  const color = connProps.color || "#ffffff";
  // thickness already declared above for padding calculation
  const dash = connProps.dash;
  const arrow = connProps.arrow || "end";
  const connType = connProps.connectorType || "straight";

  // Create marker definitions for arrow heads
  // Use a unique marker ID per connector to prevent cross-connector collisions
  // (each SVG has its own defs, but IDs are document-global in some browsers)
  const defs = document.createElementNS(ns, "defs");
  const uniqueSuffix = connProps._markerId || Math.random().toString(36).slice(2, 10);
  const markerId = `sk-arrow-${uniqueSuffix}`;

  if (arrow !== "none") {
    const marker = document.createElementNS(ns, "marker");
    marker.setAttribute("id", markerId);
    marker.setAttribute("viewBox", "0 0 10 10");
    marker.setAttribute("refX", "10");
    marker.setAttribute("refY", "5");
    marker.setAttribute("markerWidth", "8");
    marker.setAttribute("markerHeight", "8");
    marker.setAttribute("orient", "auto-start-reverse");

    const polygon = document.createElementNS(ns, "polygon");
    polygon.setAttribute("points", "0,0 10,5 0,10");
    polygon.setAttribute("fill", color);
    marker.appendChild(polygon);
    defs.appendChild(marker);
  }

  svg.appendChild(defs);

  // Draw the connector path
  let pathEl;
  if (connType === "straight") {
    pathEl = document.createElementNS(ns, "line");
    pathEl.setAttribute("x1", String(lx1));
    pathEl.setAttribute("y1", String(ly1));
    pathEl.setAttribute("x2", String(lx2));
    pathEl.setAttribute("y2", String(ly2));
  } else {
    pathEl = document.createElementNS(ns, "path");
    let d;
    if (connType === "curved") {
      // Cubic bezier with control points that produce a natural curve.
      // The control points extend along the dominant axis of travel,
      // which works for both horizontal and vertical connections.
      const dx = lx2 - lx1;
      const dy = ly2 - ly1;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      const cpOffset = Math.max(absDx, absDy) * 0.4;
      let cx1, cy1, cx2, cy2;
      if (absDx >= absDy) {
        // Predominantly horizontal: extend control points horizontally
        cx1 = lx1 + cpOffset;
        cy1 = ly1;
        cx2 = lx2 - cpOffset;
        cy2 = ly2;
      } else {
        // Predominantly vertical: extend control points vertically
        cx1 = lx1;
        cy1 = ly1 + (dy > 0 ? cpOffset : -cpOffset);
        cx2 = lx2;
        cy2 = ly2 - (dy > 0 ? cpOffset : -cpOffset);
      }
      d = `M ${lx1} ${ly1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${lx2} ${ly2}`;
    } else if (connType === "elbow") {
      // Right-angle elbow: horizontal out -> vertical -> horizontal in
      const midX = (lx1 + lx2) / 2;
      d = `M ${lx1} ${ly1} L ${midX} ${ly1} L ${midX} ${ly2} L ${lx2} ${ly2}`;
    }
    pathEl.setAttribute("d", d);
    pathEl.setAttribute("fill", "none");
  }

  pathEl.setAttribute("stroke", color);
  pathEl.setAttribute("stroke-width", String(thickness));

  if (dash) {
    pathEl.setAttribute("stroke-dasharray", dash.join(","));
  }

  // Apply arrow markers
  if (arrow === "end" || arrow === "both") {
    pathEl.setAttribute("marker-end", `url(#${markerId})`);
  }
  if (arrow === "start" || arrow === "both") {
    pathEl.setAttribute("marker-start", `url(#${markerId})`);
  }

  svg.appendChild(pathEl);

  // Optional label at midpoint
  if (connProps.label) {
    const labelStyle = connProps.labelStyle || {};
    const labelSize = labelStyle.size ?? 14;
    const labelColor = labelStyle.color ?? "#999999";
    const labelFont = labelStyle.font || "Inter";
    const labelWeight = labelStyle.weight ?? 400;

    // Compute midpoint
    let midLX, midLY;
    if (connType === "elbow") {
      const midX = (lx1 + lx2) / 2;
      midLX = midX;
      midLY = (ly1 + ly2) / 2;
    } else {
      midLX = (lx1 + lx2) / 2;
      midLY = (ly1 + ly2) / 2;
    }

    const textNode = document.createElementNS(ns, "text");
    textNode.setAttribute("x", String(midLX));
    textNode.setAttribute("y", String(midLY - 8)); // offset above line
    textNode.setAttribute("text-anchor", "middle");
    textNode.setAttribute("font-family", `"${labelFont}", sans-serif`);
    textNode.setAttribute("font-size", String(labelSize));
    textNode.setAttribute("font-weight", String(labelWeight));
    textNode.setAttribute("fill", labelColor);
    textNode.textContent = connProps.label;
    svg.appendChild(textNode);
  }

  // Wrap in a positioned div
  const wrapper = document.createElement("div");
  wrapper.style.position = "absolute";
  wrapper.style.left = `${minX}px`;
  wrapper.style.top = `${minY}px`;
  wrapper.style.width = `${svgW}px`;
  wrapper.style.height = `${svgH}px`;
  wrapper.style.pointerEvents = "none";
  wrapper.appendChild(svg);

  return wrapper;
}

/**
 * Create a panel element — a visual container with background, padding, and
 * children laid out vertically inside.
 *
 * Under the hood, panel() creates a group containing a rect background +
 * a vstack of children, with padding applied as coordinate offsets.
 * Children with w: "fill" resolve to panel.w - 2 * padding.
 *
 * @param {Array} children - Array of SlideKit elements
 * @param {object} [props={}] - Panel properties
 * @param {number} [props.x=0] - X position
 * @param {number} [props.y=0] - Y position
 * @param {number} [props.w] - Width
 * @param {number} [props.h] - Height (auto-computed from children if not specified)
 * @param {number|string} [props.padding=24] - Internal padding (px number or spacing token)
 * @param {number|string} [props.gap=16] - Gap between children (px number or spacing token)
 * @returns {{ id: string, type: string, children: Array, props: object }}
 */
export function panel(children, props = {}) {
  const { id: customId, ...rest } = props;
  const id = customId || nextId();

  const padding = resolveSpacing(rest.padding ?? 24);
  const gap = resolveSpacing(rest.gap ?? 16);
  const panelW = rest.w;
  const panelH = rest.h;

  // Resolve "fill" width on children: fill = panelW - 2 * padding
  // Clamp to 0 to prevent negative widths when panel is narrower than 2*padding
  // NOTE: "fill" resolution happens at creation time. This works correctly as long
  // as panelW is a concrete number at panel() call time. If panelW is not known
  // until layout, wrap the panel creation after layout resolves the parent's width.
  const contentW = panelW != null ? Math.max(0, panelW - 2 * padding) : undefined;
  const resolvedChildren = children.map(child => {
    if (child.props && child.props.w === "fill" && contentW !== undefined) {
      // Clone the child with resolved width
      return { ...child, props: { ...child.props, w: contentW } };
    }
    return child;
  });

  // Build the vstack for the children
  const childStack = vstack(resolvedChildren, {
    x: padding,
    y: padding,
    w: contentW,
    gap,
  });

  // Build the background element
  const bgStyle = { ...(rest.style || {}) };
  if (rest.fill) bgStyle.background = rest.fill;
  if (rest.radius !== undefined) bgStyle.borderRadius = typeof rest.radius === "number" ? `${rest.radius}px` : rest.radius;
  if (rest.border !== undefined) bgStyle.border = rest.border;

  const bgRect = el("", {
    x: 0,
    y: 0,
    w: panelW || 0,
    style: bgStyle,
    className: rest.className || "",
  });

  // Create the group container
  // Pass w/h to the group so the layout pipeline knows the panel's intrinsic
  // size during Phase 1.  Without this, getEffectiveDimensions returns {w:0,h:0}
  // for the group, causing parent stacks to compute wrong totals.
  const groupProps = {
    id,
    x: rest.x ?? 0,
    y: rest.y ?? 0,
    layer: rest.layer || "content",
    opacity: rest.opacity ?? 1,
    anchor: rest.anchor || "tl",
  };
  if (panelW != null) groupProps.w = panelW;
  if (panelH != null) groupProps.h = panelH;
  const result = group([bgRect, childStack], groupProps);

  // Tag as a panel compound for layout pipeline integration
  result._compound = "panel";
  result._panelConfig = { padding, gap, panelW, panelH };

  return result;
}

// =============================================================================
// Figure Compound (P2.3)
// =============================================================================

/**
 * Create a figure element: background container + image + optional caption.
 *
 * Returns a group containing:
 *   1. Background rect (el with fill/radius)
 *   2. Image element (el with <img>, inset by containerPadding)
 *   3. Caption (optional el, positioned below the container)
 *
 * @param {object} opts - Figure configuration
 * @param {string} [opts.id] - Custom ID for the figure group
 * @param {string} opts.src - Image source URL
 * @param {number} [opts.x=0] - X position
 * @param {number} [opts.y=0] - Y position
 * @param {number} opts.w - Container width (required)
 * @param {number} opts.h - Container height (required for v1)
 * @param {string} [opts.anchor='tl'] - Anchor point
 * @param {string} [opts.layer='content'] - Layer name
 * @param {string} [opts.containerFill='transparent'] - Background fill color
 * @param {number} [opts.containerRadius=0] - Border radius in px
 * @param {number|string} [opts.containerPadding=0] - Padding (px or spacing token)
 * @param {string} [opts.caption] - Optional HTML caption string
 * @param {number|string} [opts.captionGap=0] - Gap between container and caption (px or spacing token)
 * @param {string} [opts.fit='contain'] - CSS object-fit for the image
 * @param {object} [opts.style={}] - Additional style for the group
 * @returns {{ id: string, type: string, children: Array, props: object }}
 */
export function figure(opts = {}) {
  const {
    id: customId, src, x = 0, y = 0, w, h,
    anchor = 'tl', layer = 'content',
    containerFill = 'transparent', containerRadius = 0,
    containerPadding = 0,
    caption, captionGap = 0,
    fit = 'contain',
    style = {},
  } = opts;

  const padPx = resolveSpacing(containerPadding);
  const gapPx = resolveSpacing(captionGap);

  const figId = customId || nextId();

  // Resolve border-radius: number -> "Npx", string -> pass through
  const radiusVal = typeof containerRadius === 'number'
    ? `${containerRadius}px`
    : containerRadius;

  // Background container rect
  const bgRect = el('', {
    id: `${figId}-bg`,
    x: 0, y: 0, w, h,
    style: { background: containerFill, borderRadius: radiusVal },
  });

  // Image element — clamp to 0 to prevent negative sizes when padding exceeds half
  const innerW = Math.max(0, w - 2 * padPx);
  const innerH = Math.max(0, h - 2 * padPx);
  const img = el(`<img src="${src}" style="object-fit: ${fit}; width: 100%; height: 100%; display: block;">`, {
    id: `${figId}-img`,
    x: padPx, y: padPx,
    w: innerW,
    h: innerH,
  });

  const children = [bgRect, img];

  // Optional caption
  if (caption) {
    const cap = el(caption, {
      id: `${figId}-caption`,
      x: 0, y: h + gapPx,
      w,
    });
    children.push(cap);
  }

  // Pass w and h to the group so the layout pipeline knows the figure's
  // intrinsic size during Phase 1 (same pattern as panel).
  const result = group(children, {
    id: figId,
    x, y, w, h,
    anchor,
    layer,
    style,
  });

  // Tag as a figure compound for layout pipeline integration
  result._compound = 'figure';
  result._figureConfig = { src, containerFill, containerRadius, containerPadding: padPx, captionGap: gapPx, fit };

  return result;
}

// =============================================================================
// Grid System (M8.2)
// =============================================================================

/**
 * Create a grid system for consistent alignment across slides.
 *
 * @param {object} config - Grid configuration
 * @param {number} config.cols - Number of columns
 * @param {number} [config.gutter=30] - Space between columns
 * @param {object} [config.margin] - Margins { left, right }. Defaults to safe zone margins.
 * @returns {{ col: function, spanW: function, colWidth: number, cols: number, gutter: number }}
 */
export function grid(config = {}) {
  const cols = config.cols || 12;
  const gutter = config.gutter ?? 30;

  // Use provided margins or fall back to safe zone or defaults
  let marginLeft, marginRight;
  if (config.margin) {
    marginLeft = config.margin.left ?? 120;
    marginRight = config.margin.right ?? 120;
  } else if (_safeRectCache) {
    marginLeft = _safeRectCache.x;
    marginRight = (_config?.slide?.w ?? 1920) - (_safeRectCache.x + _safeRectCache.w);
  } else {
    marginLeft = 120;
    marginRight = 120;
  }

  const totalWidth = (_config?.slide?.w ?? 1920) - marginLeft - marginRight;
  const totalGutters = (cols - 1) * gutter;
  const colWidth = (totalWidth - totalGutters) / cols;

  if (colWidth <= 0) {
    throw new Error(
      `grid(): computed column width is ${colWidth.toFixed(1)}px (non-positive). ` +
      `Check cols (${cols}), gutter (${gutter}), and margins (${marginLeft}+${marginRight}).`
    );
  }

  return {
    cols,
    gutter,
    colWidth,
    marginLeft,
    marginRight,
    totalWidth,

    /**
     * Get the x position of column n's left edge (1-indexed).
     *
     * @param {number} n - Column number (1-based)
     * @returns {number} X position in pixels
     */
    col(n) {
      if (n < 1 || n > cols) {
        throw new Error(`grid.col(${n}): column must be between 1 and ${cols}`);
      }
      return marginLeft + (n - 1) * (colWidth + gutter);
    },

    /**
     * Get the width spanning columns from..to (inclusive, 1-indexed).
     * Includes gutters between the columns.
     *
     * @param {number} from - Start column (1-based, inclusive)
     * @param {number} to - End column (1-based, inclusive)
     * @returns {number} Width in pixels
     */
    spanW(from, to) {
      if (from < 1 || to > cols || from > to) {
        throw new Error(`grid.spanW(${from}, ${to}): invalid range for ${cols}-column grid`);
      }
      const numCols = to - from + 1;
      return numCols * colWidth + (numCols - 1) * gutter;
    },
  };
}

/**
 * Snap a value to the nearest multiple of gridSize.
 *
 * @param {number} value - The value to snap
 * @param {number} gridSize - The grid size to snap to
 * @returns {number} The snapped value
 */
export function snap(value, gridSize) {
  if (gridSize <= 0) return value;
  return Math.round(value / gridSize) * gridSize;
}

// =============================================================================
// Percentage Sugar (M8.3)
// =============================================================================

/**
 * Resolve a percentage string to a pixel value.
 *
 * - "10%" -> 0.10 * slideWidth (for x/w) or slideHeight (for y/h)
 * - "safe:10%" -> safeRect().x + 0.10 * safeRect().w (for x/w) or y/h equivalents
 *
 * Always slide-relative. Never parent-relative. For parent-relative, use "fill".
 *
 * @param {*} value - The value to resolve (may be string percentage or number)
 * @param {string} axis - "x", "y", "w", or "h"
 * @returns {number|*} Resolved pixel value, or the original value if not a percentage string
 */
export function resolvePercentage(value, axis) {
  if (typeof value !== "string") return value;

  const slideW = _config?.slide?.w ?? 1920;
  const slideH = _config?.slide?.h ?? 1080;
  const sr = _safeRectCache || { x: 120, y: 90, w: 1680, h: 900 };

  // Check for safe-zone-relative: "safe:N%"
  const safeMatch = value.match(/^safe:\s*([0-9.]+)%$/);
  if (safeMatch) {
    const pct = parseFloat(safeMatch[1]) / 100;
    if (Number.isNaN(pct)) return value; // guard against invalid parse
    if (axis === "x") return sr.x + pct * sr.w;
    if (axis === "y") return sr.y + pct * sr.h;
    if (axis === "w") return pct * sr.w;
    if (axis === "h") return pct * sr.h;
    return value; // unknown axis, return as-is
  }

  // Check for slide-relative: "N%"
  const pctMatch = value.match(/^([0-9.]+)%$/);
  if (pctMatch) {
    const pct = parseFloat(pctMatch[1]) / 100;
    if (Number.isNaN(pct)) return value; // guard against invalid parse
    if (axis === "x" || axis === "w") return pct * slideW;
    if (axis === "y" || axis === "h") return pct * slideH;
    return value;
  }

  // Not a percentage string
  return value;
}

// =============================================================================
// Repeat / Duplicate (M8.5)
// =============================================================================

/**
 * Create copies of an element laid out in a grid pattern.
 *
 * @param {object} element - A SlideKit element to duplicate
 * @param {object} config - Repeat configuration
 * @param {number} config.count - Number of copies to create
 * @param {number} [config.cols] - Number of columns (default = count, single row)
 * @param {number} [config.gapX=0] - Horizontal gap between copies
 * @param {number} [config.gapY=0] - Vertical gap between copies
 * @param {number} [config.startX=0] - Starting X position
 * @param {number} [config.startY=0] - Starting Y position
 * @returns {{ id: string, type: string, children: Array, props: object }} A group containing all copies
 */
function _reIdChildren(el, suffix) {
  if (!el.children) return;
  for (const child of el.children) {
    if (child.id) {
      child.id = `${child.id}${suffix}`;
    }
    _reIdChildren(child, suffix);
  }
}

export function repeat(element, config = {}) {
  const count = config.count || 1;
  const cols = config.cols ?? count; // default: single row
  const gapX = resolveSpacing(config.gapX ?? 0);
  const gapY = resolveSpacing(config.gapY ?? 0);
  const startX = config.startX ?? 0;
  const startY = config.startY ?? 0;

  const baseId = element.id || "repeat";
  const elemW = element.props?.w || 0;
  const elemH = element.props?.h || 0;

  const children = [];
  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);

    const x = startX + col * (elemW + gapX);
    const y = startY + row * (elemH + gapY);

    // Deep clone the element and recursively re-ID all nested children
    const copy = deepClone(element);
    const suffix = `-${i + 1}`;
    copy.id = `${baseId}${suffix}`;
    _reIdChildren(copy, suffix);
    copy.props.x = x;
    copy.props.y = y;

    children.push(copy);
  }

  // Compute group bounds
  const rows = Math.ceil(count / cols);
  const groupW = cols * elemW + (cols - 1) * gapX;
  const groupH = rows * elemH + (rows - 1) * gapY;

  return group(children, {
    x: 0,
    y: 0,
    w: groupW,
    h: groupH,
  });
}

// =============================================================================
// Rotate — AABB computation (M8.4)
// =============================================================================

/**
 * Compute the Axis-Aligned Bounding Box (AABB) of a rectangle rotated by theta degrees.
 *
 * For a rect (w, h) rotated by theta:
 *   AABB width  = |w * cos(theta)| + |h * sin(theta)|
 *   AABB height = |w * sin(theta)| + |h * cos(theta)|
 *
 * @param {number} w - Original width
 * @param {number} h - Original height
 * @param {number} degrees - Rotation angle in degrees
 * @returns {{ w: number, h: number }} AABB dimensions
 */
export function rotatedAABB(w, h, degrees) {
  const rad = (degrees * Math.PI) / 180;
  const cosA = Math.abs(Math.cos(rad));
  const sinA = Math.abs(Math.sin(rad));
  return {
    w: w * cosA + h * sinA,
    h: w * sinA + h * cosA,
  };
}

// =============================================================================
// Namespace Export (for convenient SlideKit.* usage)
// =============================================================================

const SlideKit = {
  el,
  group,
  resolveAnchor,
  filterStyle,
  render,
  init,
  safeRect,
  getConfig,
  resetIdCounter,
  measure,
  clearMeasureCache,
  isFontLoaded,
  getFontWarnings,
  _resetForTests,
  // Layout solve and relative positioning
  layout,
  below,
  above,
  rightOf,
  leftOf,
  centerVWith,
  centerHWith,
  alignTopWith,
  alignBottomWith,
  alignLeftWith,
  alignRightWith,
  centerIn,
  // Stack primitives
  vstack,
  hstack,
  // Alignment, distribution, size matching transforms
  alignLeft,
  alignRight,
  alignTop,
  alignBottom,
  alignCenterH,
  alignCenterV,
  distributeH,
  distributeV,
  matchWidth,
  matchHeight,
  matchSize,
  fitToRect,
  // Compound primitives
  connect,
  panel,
  // Utilities
  grid,
  snap,
  repeat,
  resolvePercentage,
  resolveShadow,
  getShadowPresets,
  rotatedAABB,
};

export default SlideKit;

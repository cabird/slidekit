// SlideKit — Coordinate-Based Slide Layout Library
// ES Module — all exports are named

// =============================================================================
// ID Generation (M1.1)
// =============================================================================

let _idCounter = 0;

/**
 * Reset the auto-ID counter. Called at the start of each layout()/render() call
 * to ensure deterministic IDs for the same slide definition.
 */
export function resetIdCounter() {
  _idCounter = 0;
}

/**
 * Generate the next auto ID: sk-1, sk-2, ...
 */
function nextId() {
  _idCounter += 1;
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
 * Create a text element.
 *
 * @param {string} content - The text to display
 * @param {object} props - Positioning and styling properties
 * @returns {{ id: string, type: string, content: string, props: object }}
 */
export function text(content, props = {}) {
  const { id: customId, ...rest } = props;
  const id = customId || nextId();
  const resolved = applyDefaults(rest, {
    font: "Inter",
    size: 32,
    weight: 400,
    color: "#ffffff",
    lineHeight: 1.3,
    letterSpacing: "0",
    align: "left",
    overflow: "warn",
    fit: null,
    maxLines: null,
  });
  return { id, type: "text", content, props: resolved };
}

/**
 * Create an image element.
 *
 * @param {string} src - Image path or URL
 * @param {object} props - Positioning and styling properties
 * @returns {{ id: string, type: string, src: string, props: object }}
 */
export function image(src, props = {}) {
  const { id: customId, ...rest } = props;
  const id = customId || nextId();
  const resolved = applyDefaults(rest, {
    fit: "cover",
    position: "center",
  });
  return { id, type: "image", src, props: resolved };
}

/**
 * Create a rectangle element.
 *
 * @param {object} props - Positioning and styling properties
 * @returns {{ id: string, type: string, props: object }}
 */
export function rect(props = {}) {
  const { id: customId, ...rest } = props;
  const id = customId || nextId();
  const resolved = applyDefaults(rest, {
    fill: "transparent",
    radius: 0,
    border: "none",
    padding: 0,
  });
  return { id, type: "rect", props: resolved };
}

/**
 * Create a rule (horizontal/vertical line) element.
 *
 * @param {object} props - Positioning and styling properties
 * @returns {{ id: string, type: string, props: object }}
 */
export function rule(props = {}) {
  const { id: customId, ...rest } = props;
  const id = customId || nextId();
  const resolved = applyDefaults(rest, {
    direction: "horizontal",
    thickness: 2,
    color: "#ffffff",
  });
  return { id, type: "rule", props: resolved };
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
  return { id, type: "group", children, props: resolved };
}

// =============================================================================
// Anchor Resolution (M1.2)
// =============================================================================

/**
 * Resolve an anchor point to CSS left/top values.
 *
 * Given the user-specified (x, y) coordinate, the element's dimensions (w, h),
 * and an anchor point string, compute the CSS { left, top } values for the
 * element's top-left corner.
 *
 * Anchor grid:
 *   tl ---- tc ---- tr
 *   |                |
 *   cl      cc      cr
 *   |                |
 *   bl ---- bc ---- br
 *
 * @param {number} x - User-specified x coordinate
 * @param {number} y - User-specified y coordinate
 * @param {number} w - Element width
 * @param {number} h - Element height
 * @param {string} anchor - Anchor point string (tl, tc, tr, cl, cc, cr, bl, bc, br)
 * @returns {{ left: number, top: number }}
 */
const VALID_ANCHORS = new Set(["tl", "tc", "tr", "cl", "cc", "cr", "bl", "bc", "br"]);

export function resolveAnchor(x, y, w, h, anchor) {
  if (typeof anchor !== "string" || !VALID_ANCHORS.has(anchor)) {
    throw new Error(
      `Invalid anchor "${anchor}". Must be one of: ${Array.from(VALID_ANCHORS).join(", ")}`
    );
  }

  // Horizontal offset based on anchor column
  let left;
  const col = anchor[1]; // second character: l, c, r
  if (col === "l") {
    left = x;
  } else if (col === "c") {
    left = x - w / 2;
  } else if (col === "r") {
    left = x - w;
  } else {
    throw new Error(`Invalid anchor column "${col}" in anchor "${anchor}"`);
  }

  // Vertical offset based on anchor row
  let top;
  const row = anchor[0]; // first character: t, c, b
  if (row === "t") {
    top = y;
  } else if (row === "c") {
    top = y - h / 2;
  } else if (row === "b") {
    top = y - h;
  } else {
    throw new Error(`Invalid anchor row "${row}" in anchor "${anchor}"`);
  }

  return { left, top };
}

// =============================================================================
// CSS Property Filtering (M1.3)
// =============================================================================

/**
 * Convert a CSS property name from kebab-case to camelCase.
 * e.g., "background-color" -> "backgroundColor"
 *       "fontSize" -> "fontSize" (already camelCase, no change)
 *       "-webkit-transform" -> "WebkitTransform"
 *       "-ms-transform" -> "msTransform"
 *       "--custom-prop" -> "--custom-prop" (preserved as-is)
 */
function toCamelCase(name) {
  // Preserve CSS custom properties (variables) as-is
  if (name.startsWith("--")) return name;
  // If already camelCase or single word, return as-is
  if (!name.includes("-")) return name;

  // Handle vendor prefixes: -ms- uses lowercase, others use uppercase first letter
  let normalized = name;
  if (normalized.startsWith("-ms-")) {
    normalized = "ms-" + normalized.slice(4);
  } else if (normalized.startsWith("-webkit-")) {
    normalized = "Webkit-" + normalized.slice(8);
  } else if (normalized.startsWith("-moz-")) {
    normalized = "Moz-" + normalized.slice(5);
  } else if (normalized.startsWith("-o-")) {
    normalized = "O-" + normalized.slice(3);
  }

  return normalized.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Strip vendor prefix from a camelCase CSS property name.
 * e.g., "WebkitTransform" -> "transform"
 *       "msFlexDirection" -> "flexDirection"
 *       "MozTransition" -> "transition"
 *       "backgroundColor" -> "backgroundColor" (no change)
 */
function stripVendorPrefix(camelName) {
  // Match common vendor prefixes in camelCase form
  const prefixes = ["Webkit", "Moz", "ms", "O"];
  for (const prefix of prefixes) {
    if (camelName.startsWith(prefix) && camelName.length > prefix.length) {
      const rest = camelName.slice(prefix.length);
      // After stripping prefix, the next char should be uppercase (it was the start of the property)
      // Lowercase it to get the standard camelCase form
      if (rest[0] >= "A" && rest[0] <= "Z") {
        return rest[0].toLowerCase() + rest.slice(1);
      }
    }
  }
  return camelName; // no vendor prefix found
}

/**
 * Comprehensive set of blocked CSS property names (in camelCase).
 *
 * These properties are stripped from user-provided styles because they
 * conflict with SlideKit's absolute positioning system.
 */
const BLOCKED_PROPERTIES = new Set([
  // Layout position
  "position",
  "top", "left", "right", "bottom",
  "inset", "insetBlock", "insetBlockStart", "insetBlockEnd",
  "insetInline", "insetInlineStart", "insetInlineEnd",

  // Sizing
  "width", "height",
  "minWidth", "maxWidth", "minHeight", "maxHeight",
  "blockSize", "inlineSize",
  "minBlockSize", "maxBlockSize", "minInlineSize", "maxInlineSize",

  // Display / Flex
  "display",
  "flexDirection", "flexWrap", "flexFlow",
  "flexGrow", "flexShrink", "flexBasis", "flex",
  "alignItems", "alignContent", "alignSelf",
  "justifyContent", "justifyItems", "justifySelf",
  "order",
  "gap", "rowGap", "columnGap",

  // Grid
  "grid",
  "gridTemplate", "gridTemplateColumns", "gridTemplateRows", "gridTemplateAreas",
  "gridColumn", "gridColumnStart", "gridColumnEnd",
  "gridRow", "gridRowStart", "gridRowEnd",
  "gridArea",
  "gridAutoFlow", "gridAutoColumns", "gridAutoRows",

  // Float / clear
  "float", "clear",

  // Overflow (library manages)
  "overflow", "overflowX", "overflowY",
  "overflowBlock", "overflowInline",

  // Margin
  "margin", "marginTop", "marginRight", "marginBottom", "marginLeft",
  "marginBlock", "marginBlockStart", "marginBlockEnd",
  "marginInline", "marginInlineStart", "marginInlineEnd",

  // Transform (blocked entirely — use rotate prop)
  "transform",
]);

/**
 * Suggestion messages for common blocked properties.
 */
const BLOCKED_SUGGESTIONS = {
  display: "Use vstack() or hstack() for layout",
  position: "SlideKit uses absolute positioning; element placement is handled by x/y/anchor",
  top: "Use SlideKit's y property instead",
  left: "Use SlideKit's x property instead",
  right: "Use SlideKit's x and w properties instead",
  bottom: "Use SlideKit's y and h properties instead",
  width: "Use SlideKit's w property instead",
  height: "Use SlideKit's h property instead",
  margin: "Margins are not used in absolute layout; use x/y for spacing",
  flex: "Use vstack() or hstack() for layout",
  flexDirection: "Use vstack() or hstack() for layout",
  grid: "Use SlideKit's coordinate system for layout",
  float: "Use SlideKit's x/y positioning instead",
  overflow: "Use SlideKit's overflow property on text elements",
  transform: "Use the rotate prop for rotation; transform is blocked because the library owns element positioning",
};

/**
 * Map of convenience props to their CSS equivalents.
 * Some require value transformation (e.g., size -> fontSize with "px" suffix).
 */
const CONVENIENCE_MAP = {
  color:          { css: "color",         transform: (v) => v },
  font:           { css: "fontFamily",    transform: (v) => `"${v}", sans-serif` },
  size:           { css: "fontSize",      transform: (v) => typeof v === "number" ? `${v}px` : v },
  weight:         { css: "fontWeight",    transform: (v) => String(v) },
  lineHeight:     { css: "lineHeight",    transform: (v) => v },
  letterSpacing:  { css: "letterSpacing", transform: (v) => v },
  fill:           { css: "background",    transform: (v) => v },
  radius:         { css: "borderRadius",  transform: (v) => typeof v === "number" ? `${v}px` : v },
  border:         { css: "border",        transform: (v) => v },
  align:          { css: "textAlign",     transform: (v) => v },
};

/**
 * Filter a style object, removing blocked layout properties.
 *
 * Also merges convenience props from the element's props into the style,
 * with style winning on conflict (style is applied after convenience props).
 *
 * @param {object} style - The user-provided style object (may use kebab-case or camelCase)
 * @param {string} elementType - The element type (for future element-specific exceptions)
 * @param {object} [convenienceProps={}] - Convenience props from the element (color, font, size, etc.)
 * @returns {{ filtered: object, warnings: Array }}
 */
export function filterStyle(style = {}, elementType = "unknown", convenienceProps = {}) {
  const warnings = [];
  const filtered = {};

  // Step 1: Apply convenience props first
  for (const [propName, mapping] of Object.entries(CONVENIENCE_MAP)) {
    if (convenienceProps[propName] !== undefined) {
      filtered[mapping.css] = mapping.transform(convenienceProps[propName]);
    }
  }

  // Step 2: Apply user style, overwriting convenience props on conflict.
  // Normalize keys to camelCase and check against blocklist.
  for (const [rawKey, value] of Object.entries(style)) {
    const camelKey = toCamelCase(rawKey);

    // Check blocklist: also check unprefixed version for vendor-prefixed properties.
    // e.g., WebkitTransform -> transform, msFlexDirection -> flexDirection
    const unprefixedKey = stripVendorPrefix(camelKey);
    const blockedKey = BLOCKED_PROPERTIES.has(camelKey) ? camelKey
                     : BLOCKED_PROPERTIES.has(unprefixedKey) ? unprefixedKey
                     : null;

    if (blockedKey) {
      warnings.push({
        type: "blocked_css_property",
        property: camelKey,
        originalProperty: rawKey,
        value: value,
        suggestion: BLOCKED_SUGGESTIONS[blockedKey] || "This property conflicts with SlideKit's positioning system",
      });
      continue;
    }

    // Allowed — add to filtered output
    filtered[camelKey] = value;
  }

  return { filtered, warnings };
}

// =============================================================================
// Init Function & Configuration (M1.5)
// =============================================================================

/**
 * Internal configuration state.
 */
let _config = null;
let _safeRectCache = null;

// =============================================================================
// Font Loading & Text Measurement State (M2)
// =============================================================================

/**
 * Set of successfully loaded font descriptors: "family:weight"
 * e.g., "Inter:400", "Space Grotesk:700"
 */
let _loadedFonts = new Set();

/**
 * The off-screen measurement container element (created lazily or during init).
 */
let _measureContainer = null;

/**
 * Cache for measureText results.
 * Key: stringified tuple of (content, font, size, weight, lineHeight, letterSpacing, w)
 * Value: measurement result object
 */
let _measureCache = new Map();

/**
 * Font loading warnings accumulated during init().
 */
let _fontWarnings = [];

/**
 * Set of injected Google Font <link> elements for cleanup during testing.
 */
let _injectedFontLinks = new Set();

/**
 * Default configuration values.
 */
const DEFAULT_CONFIG = {
  slide: { w: 1920, h: 1080 },
  safeZone: { left: 120, right: 120, top: 90, bottom: 90 },
  strict: false,
  minFontSize: 24,
  fonts: [],
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
 * @returns {Promise<object>} Resolves with the config when ready
 */
export async function init(config = {}) {
  _config = {
    slide: { ...DEFAULT_CONFIG.slide, ...(config.slide || {}) },
    safeZone: { ...DEFAULT_CONFIG.safeZone, ...(config.safeZone || {}) },
    strict: config.strict !== undefined ? config.strict : DEFAULT_CONFIG.strict,
    minFontSize: config.minFontSize !== undefined ? config.minFontSize : DEFAULT_CONFIG.minFontSize,
    fonts: config.fonts || DEFAULT_CONFIG.fonts,
  };

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
  _safeRectCache = {
    x: sz.left,
    y: sz.top,
    w: safeW,
    h: safeH,
  };

  // Reset font state
  _loadedFonts = new Set();
  _fontWarnings = [];
  _measureCache = new Map();

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
 * Get the current configuration. Returns null if init() hasn't been called.
 *
 * @returns {object|null}
 */
export function getConfig() {
  if (!_config) return null;
  // Deep copy to prevent external mutation of internal state
  return JSON.parse(JSON.stringify(_config));
}

/**
 * Reset all internal state. For testing only — allows tests to verify
 * pre-init behavior and ensures test isolation.
 */
export function _resetForTests() {
  _config = null;
  _safeRectCache = null;
  _idCounter = 0;
  _loadedFonts = new Set();
  _fontWarnings = [];
  _measureCache = new Map();
  // Remove measurement container from DOM if it exists
  if (_measureContainer && _measureContainer.parentNode) {
    _measureContainer.parentNode.removeChild(_measureContainer);
  }
  _measureContainer = null;
  // Remove injected Google Font link elements
  for (const link of _injectedFontLinks) {
    if (link.parentNode) link.parentNode.removeChild(link);
  }
  _injectedFontLinks = new Set();
}

// =============================================================================
// Measurement Container & measureText (M2.2, M2.3)
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
      "SlideKit.measureText requires a DOM with document.body available."
    );
  }

  _measureContainer = document.createElement("div");
  _measureContainer.style.position = "absolute";
  _measureContainer.style.left = "-9999px";
  _measureContainer.style.top = "-9999px";
  _measureContainer.style.visibility = "hidden";
  // Prevent scrolling or interaction
  _measureContainer.style.overflow = "hidden";
  _measureContainer.style.pointerEvents = "none";
  // No max dimensions — let content determine size
  _measureContainer.setAttribute("data-sk-role", "measure-container");

  document.body.appendChild(_measureContainer);
}

/**
 * Build a cache key for measureText results.
 *
 * @param {string} content - Text content
 * @param {object} props - Measurement properties
 * @returns {string} Cache key
 */
function _measureCacheKey(content, props) {
  return JSON.stringify([
    content,
    props.font || "Inter",
    props.size || 32,
    props.weight || 400,
    props.lineHeight || 1.3,
    props.letterSpacing || "0",
    props.w ?? null,
  ]);
}

/**
 * Measure how text will render without placing it on the slide.
 *
 * Uses a hidden off-screen <div> with identical CSS to the rendering target.
 * Results are cached by (content, font, size, weight, lineHeight, letterSpacing, w).
 *
 * Implementation: <div> + scrollHeight (NOT <span> + getClientRects()).
 *
 * @param {string} content - The text to measure (supports \n for line breaks)
 * @param {object} props - Measurement properties
 * @param {string} [props.font="Inter"] - Font family
 * @param {number} [props.size=32] - Font size in pixels
 * @param {number} [props.weight=400] - Font weight
 * @param {number} [props.lineHeight=1.3] - Line height multiplier
 * @param {string} [props.letterSpacing="0"] - Letter spacing CSS value
 * @param {number} [props.w] - Constraining width (if provided, limits wrapping)
 * @returns {{ block: { w: number, h: number }, lineCount: number, fontSize: number }}
 */
export function measureText(content, props = {}) {
  const font = props.font || "Inter";
  const size = props.size || 32;
  const weight = props.weight || 400;
  const lineHeight = props.lineHeight || 1.3;
  const letterSpacing = props.letterSpacing || "0";
  const constrainW = props.w ?? null;

  // Check if the required font is loaded (warn if not, but don't block)
  const warnings = [];
  const fontKey = `${font}:${weight}`;
  if (_loadedFonts.size > 0 && !_loadedFonts.has(fontKey)) {
    // Only warn if fonts were configured — if no fonts were configured,
    // we're using system fonts and can't validate.
    if (_config && _config.fonts.length > 0) {
      warnings.push({
        type: "font_not_loaded",
        font: fontKey,
        message: `Font "${fontKey}" is not loaded. Measurement may be inaccurate.`,
      });
    }
  }

  // Check cache
  const cacheKey = _measureCacheKey(content, props);
  if (_measureCache.has(cacheKey)) {
    return _measureCache.get(cacheKey);
  }

  // Ensure measurement container exists
  _ensureMeasureContainer();

  // Create the measurement div
  const measureDiv = document.createElement("div");

  // Apply CSS properties matching the rendering target
  measureDiv.style.fontFamily = `"${font}", sans-serif`;
  measureDiv.style.fontSize = `${size}px`;
  measureDiv.style.fontWeight = String(weight);
  measureDiv.style.lineHeight = String(lineHeight);
  measureDiv.style.letterSpacing = letterSpacing;
  measureDiv.style.whiteSpace = "pre-wrap";
  measureDiv.style.wordBreak = "break-word";
  measureDiv.style.boxSizing = "border-box";
  measureDiv.style.padding = "0";
  measureDiv.style.margin = "0";
  measureDiv.style.border = "none";

  // If width is constrained, set it
  if (constrainW !== null) {
    measureDiv.style.width = `${constrainW}px`;
  } else {
    // Unconstrained — let it be as wide as it needs
    measureDiv.style.display = "inline-block";
    measureDiv.style.whiteSpace = "pre";
  }

  // Set content using textContent + br nodes (same approach as renderer for safety)
  const textContent = String(content ?? "");
  const parts = textContent.split("\n");
  parts.forEach((part, i) => {
    if (i > 0) measureDiv.appendChild(document.createElement("br"));
    measureDiv.appendChild(document.createTextNode(part));
  });

  // Append to measurement container, read dimensions, then remove
  _measureContainer.appendChild(measureDiv);

  const measuredHeight = measureDiv.scrollHeight;
  const measuredWidth = constrainW !== null ? constrainW : measureDiv.offsetWidth;

  // Compute line count from scrollHeight / computed lineHeight
  const computedLineHeight = size * lineHeight;
  const lineCount = computedLineHeight > 0
    ? Math.max(1, Math.ceil(measuredHeight / computedLineHeight))
    : 1;

  // Clean up
  _measureContainer.removeChild(measureDiv);

  const result = {
    block: { w: measuredWidth, h: measuredHeight },
    lineCount,
    fontSize: size,
  };

  // Include warnings if any were generated
  if (warnings.length > 0) {
    result.warnings = warnings;
  }

  // Cache the result
  _measureCache.set(cacheKey, result);

  return result;
}

/**
 * Clear the measureText cache. Useful when fonts are loaded or for testing.
 */
export function clearMeasureCache() {
  _measureCache.clear();
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
 * Extract convenience props from an element's props for use with filterStyle().
 * Only includes keys that exist in the CONVENIENCE_MAP.
 *
 * @param {object} props - Element props
 * @returns {object} Convenience props subset
 */
function extractConvenienceProps(props) {
  const result = {};
  for (const key of Object.keys(CONVENIENCE_MAP)) {
    if (props[key] !== undefined) {
      result[key] = props[key];
    }
  }
  return result;
}

/**
 * Compute the effective width and height for an element, including
 * type-specific logic for rules and auto-height for text elements (M2.4).
 *
 * For text elements without an explicit `h`, calls measureText() to
 * determine the height based on the text content and styling properties.
 *
 * @param {object} element - SlideKit element
 * @returns {{ w: number, h: number, _autoHeight: boolean }}
 */
function getEffectiveDimensions(element) {
  const { props, type } = element;
  if (type === "rule") {
    const dir = props.direction || "horizontal";
    const thickness = props.thickness || 2;
    if (dir === "horizontal") {
      return { w: props.w || 0, h: thickness, _autoHeight: false };
    } else {
      return { w: thickness, h: props.h || 0, _autoHeight: false };
    }
  }

  // M2.4: Auto-height for text elements
  if (type === "text" && (props.h === undefined || props.h === null)) {
    const contentStr = String(element.content ?? "");
    // If truly no content, return zero height
    if (!contentStr) {
      return { w: props.w || 0, h: 0, _autoHeight: true };
    }
    // Build measurement props — omit w if not provided or zero (unconstrained measurement)
    const measureProps = {
      font: props.font,
      size: props.size,
      weight: props.weight,
      lineHeight: props.lineHeight,
      letterSpacing: props.letterSpacing,
    };
    if (props.w && props.w > 0) {
      measureProps.w = props.w;
    }
    const metrics = measureText(contentStr, measureProps);
    return { w: metrics.block.w, h: metrics.block.h, _autoHeight: true };
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

/**
 * Render a single SlideKit element into a DOM node.
 *
 * @param {object} element - SlideKit element (text, image, rect, rule, or group)
 * @param {number} zIndex - Computed z-index for this element
 * @returns {HTMLElement} The rendered DOM element
 */
function renderElement(element, zIndex) {
  const { type, props } = element;
  const { w, h } = getEffectiveDimensions(element);

  // Compute position from anchor
  const anchor = props.anchor || "tl";
  const { left, top } = resolveAnchor(props.x || 0, props.y || 0, w, h, anchor);

  // Build the merged CSS from convenience props + user style
  const convenienceProps = extractConvenienceProps(props);
  const { filtered: mergedStyle } = filterStyle(props.style || {}, type, convenienceProps);

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

  // Apply className
  if (props.className) {
    div.className = props.className;
  }

  // Apply merged styling CSS
  applyStyleToDOM(div, mergedStyle);

  // Type-specific rendering
  switch (type) {
    case "text": {
      // Convert \n to <br> using DOM nodes (avoids innerHTML XSS risk)
      const content = String(element.content ?? "");
      const parts = content.split("\n");
      parts.forEach((part, i) => {
        if (i > 0) div.appendChild(document.createElement("br"));
        div.appendChild(document.createTextNode(part));
      });
      break;
    }

    case "image": {
      const img = document.createElement("img");
      img.src = element.src || "";
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.objectFit = props.fit || "cover";
      if (props.position) {
        img.style.objectPosition = props.position;
      }
      img.style.display = "block";
      div.appendChild(img);
      break;
    }

    case "rect": {
      // Rect is just a styled div — styling already applied via mergedStyle
      // No additional content needed
      break;
    }

    case "rule": {
      // Rule is a div with background-color for the line
      // The dimensions are already set (w/h computed by getEffectiveDimensions)
      // Set background-color from the rule's color prop
      div.style.backgroundColor = props.color || "#ffffff";
      break;
    }

    case "group": {
      // Group is a container div with children rendered recursively
      // Children's positions are relative to the group's position
      const children = element.children || [];

      // Compute z-order for children within the group
      const childZMap = computeZOrder(children);

      for (const child of children) {
        const childZ = childZMap.get(child.id) || 0;
        // Children's x/y are relative to the group origin. Since the group
        // div is position:absolute, children (also position:absolute) are
        // positioned relative to the group div's top-left corner.
        const childEl = renderElement(child, childZ);
        div.appendChild(childEl);
      }
      break;
    }

    default:
      // Unknown element type — render as empty div with data-sk-id
      break;
  }

  return div;
}

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

/**
 * Render an array of slide definitions into DOM elements.
 *
 * Creates <section> elements (Reveal.js slides) with <div class="slidekit-layer">
 * containers holding absolutely-positioned element divs.
 *
 * Does NOT initialize Reveal.js — the caller handles that.
 *
 * @param {Array} slides - Array of slide definitions, each with { id, elements, background, notes, transforms }
 * @param {object} [options={}] - Render options
 * @param {HTMLElement} [options.container] - Target container element (default: document.querySelector('.reveal .slides'))
 * @returns {Array<HTMLElement>} Array of created <section> elements
 */
export function render(slides, options = {}) {
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

  for (const slide of slides) {
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
    const cfg = getConfig();
    const slideW = cfg?.slide?.w ?? 1920;
    const slideH = cfg?.slide?.h ?? 1080;
    const layer = document.createElement("div");
    layer.className = "slidekit-layer";
    layer.style.position = "relative";
    layer.style.width = `${slideW}px`;
    layer.style.height = `${slideH}px`;

    // Render elements
    const elements = slide.elements || [];

    // Compute z-order for all elements in the slide
    const zMap = computeZOrder(elements);

    for (const element of elements) {
      const zIndex = zMap.get(element.id) || 0;
      const domEl = renderElement(element, zIndex);
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

  return sections;
}

// =============================================================================
// Stubs for Future Milestones
// =============================================================================

// layout() — M3: Layout solve pipeline
// Placeholder that will be implemented in Milestone 3.
// For now, not exported — will be added when ready.

// =============================================================================
// Namespace Export (for convenient SlideKit.* usage)
// =============================================================================

const SlideKit = {
  text,
  image,
  rect,
  rule,
  group,
  resolveAnchor,
  filterStyle,
  render,
  init,
  safeRect,
  getConfig,
  resetIdCounter,
  measureText,
  clearMeasureCache,
  isFontLoaded,
  getFontWarnings,
  _resetForTests,
};

export default SlideKit;

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
  font:           { css: "fontFamily",    transform: (v) => v },
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
 * @param {Array} [config.fonts] - Fonts to preload (font loading implemented in M2)
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

  // Font loading will be implemented in M2.
  // For now, resolve immediately.
  return _config;
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
}

// =============================================================================
// Stubs for Future Milestones
// =============================================================================

// layout() — M1.4 / M3: Layout solve pipeline
// Placeholder that will be implemented in Milestone 3.
// For now, not exported — will be added when ready.

// render() — M1.4 / M3: Render to DOM
// Placeholder that will be implemented in Milestone 1.4.
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
  init,
  safeRect,
  getConfig,
  resetIdCounter,
  _resetForTests,
};

export default SlideKit;

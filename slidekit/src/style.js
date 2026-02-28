// SlideKit — Style utilities (CSS filtering, baseline CSS, shadow presets)

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
 * Blocked CSS property names (in camelCase) for container div styles.
 *
 * These properties would break the container div's absolute positioning
 * or sizing if applied. All other CSS (fonts, padding, colors, etc.)
 * is allowed because measurement renders full HTML including all styles.
 */
const BLOCKED_PROPERTIES = new Set([
  // Layout position — library owns absolute positioning
  "position",
  "top", "left", "right", "bottom",
  "inset", "insetBlock", "insetBlockStart", "insetBlockEnd",
  "insetInline", "insetInlineStart", "insetInlineEnd",

  // Sizing — library owns via w/h props
  "width", "height",
  "minWidth", "maxWidth", "minHeight", "maxHeight",
  "blockSize", "inlineSize",
  "minBlockSize", "maxBlockSize", "minInlineSize", "maxInlineSize",

  // Display — library needs block
  "display",

  // Overflow — library manages via overflow prop
  "overflow", "overflowX", "overflowY",
  "overflowBlock", "overflowInline",

  // Margin — breaks absolute positioning
  "margin", "marginTop", "marginRight", "marginBottom", "marginLeft",
  "marginBlock", "marginBlockStart", "marginBlockEnd",
  "marginInline", "marginInlineStart", "marginInlineEnd",

  // Transform — library owns via rotate prop
  "transform", "translate", "rotate", "scale",

  // Containment — can suppress layout/paint
  "contain", "contentVisibility",
]);

/**
 * Suggestion messages for blocked properties.
 */
const BLOCKED_SUGGESTIONS = {
  position: "SlideKit uses absolute positioning; use x/y/anchor props",
  top: "Use the y prop instead",
  left: "Use the x prop instead",
  right: "Use x and w props instead",
  bottom: "Use y and h props instead",
  width: "Use the w prop instead",
  height: "Use the h prop instead",
  display: "The container display mode is managed by SlideKit",
  margin: "Margins break absolute positioning; use x/y for spacing",
  overflow: "Use SlideKit's overflow prop (e.g., overflow: 'clip')",
  transform: "Use the rotate prop for rotation; transform is blocked because the library owns positioning",
  translate: "Use x/y props for positioning",
  rotate: "Use the rotate prop instead (e.g., rotate: 45)",
  scale: "Scaling is not supported; use w/h to control size",
  contain: "contain can suppress layout/paint and conflict with measurement",
  contentVisibility: "contentVisibility can suppress rendering and conflict with measurement",
};

/**
 * Filter a container style object, removing blocked layout properties.
 *
 * Normalizes keys to camelCase and checks against the blocklist.
 *
 * @param {object} style - The user-provided style object (may use kebab-case or camelCase)
 * @param {string} elementType - The element type (for context in warnings)
 * @returns {{ filtered: object, warnings: Array }}
 */
export function filterStyle(style = {}, elementType = "unknown") {
  const warnings = [];
  const filtered = {};

  for (const [rawKey, value] of Object.entries(style)) {
    const camelKey = toCamelCase(rawKey);

    // Check blocklist: also check unprefixed version for vendor-prefixed properties.
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
// Baseline CSS — shared between measure() and render()
// =============================================================================

/**
 * SlideKit baseline CSS applied inside every el() container.
 *
 * This stylesheet establishes a predictable, deterministic styling context that:
 *  1. Neutralizes inherited styles from host frameworks (Reveal.js, etc.)
 *  2. Ensures measure() and render() produce identical results
 *  3. Provides sensible defaults for presentation content
 *
 * User inline styles always override the baseline (stylesheet < inline specificity).
 *
 * The selector prefix is parameterised so the same rules apply in both the
 * measurement container ([data-sk-measure]) and the render container
 * ([data-sk-type="el"]).
 */
export function _baselineCSS(prefix) {
  return `
/* Root boundary — neutralise inherited host-framework styles */
${prefix} {
  text-align: left;
  font-style: normal;
  font-weight: 400;
  font-stretch: normal;
  line-height: 1.2;
  letter-spacing: normal;
  text-transform: none;
  text-decoration: none;
  white-space: normal;
  word-break: normal;
  overflow-wrap: normal;
  hyphens: manual;
  box-sizing: border-box;
}
${prefix} *, ${prefix} *::before, ${prefix} *::after {
  box-sizing: inherit;
}
/* Direct children — margin/padding reset */
${prefix} > * {
  margin: 0;
  padding: 0;
  text-align: inherit;
  line-height: inherit;
}
/* Block elements — kill framework margins even when nested */
${prefix} p,
${prefix} h1, ${prefix} h2, ${prefix} h3,
${prefix} h4, ${prefix} h5, ${prefix} h6 {
  margin: 0;
  padding: 0;
  font: inherit;
  text-transform: none;
}
${prefix} ul, ${prefix} ol {
  margin: 0;
  padding: 0;
  list-style-position: outside;
}
${prefix} li {
  margin: 0;
  padding: 0;
}
/* Media — prevent framework responsive rules from changing measured size */
${prefix} img, ${prefix} svg, ${prefix} video, ${prefix} canvas {
  max-width: none;
  max-height: none;
}
${prefix} img, ${prefix} svg {
  vertical-align: baseline;
}
/* Pre/code — frameworks often restyle these heavily */
${prefix} pre, ${prefix} code {
  margin: 0;
  padding: 0;
  font-size: 1em;
  line-height: 1.2;
  white-space: pre;
}
/* Tables */
${prefix} table {
  border-collapse: collapse;
  border-spacing: 0;
}
`;
}

// =============================================================================
// Shadow Presets (M8.6)
// =============================================================================

/**
 * Named shadow presets mapped to CSS box-shadow values.
 */
export const SHADOWS = {
  sm:   "0 1px 3px rgba(0,0,0,0.2)",
  md:   "0 4px 12px rgba(0,0,0,0.3)",
  lg:   "0 8px 32px rgba(0,0,0,0.4)",
  xl:   "0 16px 48px rgba(0,0,0,0.5)",
  glow: "0 0 40px rgba(124,92,191,0.3)",
};

/**
 * Resolve a shadow value: if it's a named preset key, return the CSS value.
 * If it's already a CSS value (contains "px"), pass through.
 *
 * @param {string} value - Shadow preset name or CSS value
 * @returns {string} CSS box-shadow value
 */
export function resolveShadow(value) {
  if (!value) return "";
  if (SHADOWS[value]) return SHADOWS[value];
  return value; // pass through CSS values
}

/**
 * Get the shadow presets map (for testing/introspection).
 *
 * @returns {object} Copy of the shadow presets
 */
export function getShadowPresets() {
  return { ...SHADOWS };
}

// SlideKit — Style utilities (CSS filtering, baseline CSS, shadow presets)

import type { StyleFilterResult } from './types.js';

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
function toCamelCase(name: string): string {
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

  return normalized.replace(/-([a-z])/g, (_: string, letter: string) => letter.toUpperCase());
}

/**
 * Strip vendor prefix from a camelCase CSS property name.
 * e.g., "WebkitTransform" -> "transform"
 *       "msFlexDirection" -> "flexDirection"
 *       "MozTransition" -> "transition"
 *       "backgroundColor" -> "backgroundColor" (no change)
 */
function stripVendorPrefix(camelName: string): string {
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
const BLOCKED_PROPERTIES: ReadonlySet<string> = new Set([
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
] as const);

/**
 * Suggestion messages for blocked properties.
 */
const BLOCKED_SUGGESTIONS: Readonly<Record<string, string>> = {
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
} as const;

/**
 * Filter a container style object, removing blocked layout properties.
 *
 * Normalizes keys to camelCase and checks against the blocklist.
 *
 * @param style - The user-provided style object (may use kebab-case or camelCase)
 * @param elementType - The element type (for context in warnings)
 * @returns { filtered, warnings }
 */
export function filterStyle(
  style: Record<string, unknown> = {},
  _elementType: string = "unknown",
): StyleFilterResult {
  const warnings: Array<Record<string, unknown>> = [];
  const filtered: Record<string, unknown> = {};

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
 *
 * SPECIFICITY STRATEGY
 * --------------------
 * Reveal.js applies aggressive element styles via selectors like:
 *   .reveal img       (0,1,1) -- margin, max-width, max-height
 *   .reveal p         (0,1,1) -- margin, line-height
 *   .reveal h1        (0,1,1) -- margin, font-size, text-transform, etc.
 *   .reveal ul ul     (0,1,2) -- display, margin-left
 *   .reveal pre code  (0,1,2) -- padding, max-height
 *   .reveal table th  (0,1,2) -- font-weight, padding, border
 *   .reveal blockquote p:first-child  (0,2,2) -- display
 *   .reveal table tbody tr:last-child th  (0,2,4) -- border
 *
 * A single attribute selector [data-sk-type="el"] gives (0,1,0), which
 * ties or loses against these.  We TRIPLE the attribute selector to reach
 * (0,3,0).  Descendant rules like  PPP img  then score (0,3,1), beating
 * every Reveal selector without resorting to !important.
 */
export function _baselineCSS(prefix: string): string {
  const p = prefix.trim();
  if (p.includes(',')) {
    throw new Error(`_baselineCSS prefix must be a single selector, got: ${p}`);
  }
  const P = `${p}${p}${p}`;

  return `
/* ===================================================================
 * SlideKit Baseline CSS Reset
 * Tripled attribute selector -> specificity (0,3,0+), always beats
 * Reveal.js selectors (max ~0,2,4).  User inline styles still win
 * because inline specificity (1,0,0) > any selector.
 * =================================================================== */

/* --- Container boundary: establish a clean context --- */
${P} {
  text-align: left;
  font-style: normal;
  font-weight: 400;
  font-stretch: normal;
  line-height: 1.2;
  letter-spacing: normal;
  text-transform: none;
  text-decoration: none;
  text-shadow: none;
  white-space: normal;
  word-break: normal;
  word-wrap: normal;
  overflow-wrap: normal;
  hyphens: manual;
  box-sizing: border-box;
  color: inherit;
}
${P} *, ${P} *::before, ${P} *::after {
  box-sizing: inherit;
}

/* --- Direct children reset --- */
${P} > * {
  margin: 0;
  padding: 0;
  text-align: inherit;
  line-height: inherit;
}

/* --- Paragraphs ---
 * Counters: .reveal p { margin: 20px 0; line-height: 1.3 } */
${P} p {
  margin: 0;
  padding: 0;
  line-height: inherit;
}

/* --- Headings ---
 * Counters: .reveal h1-h6 { margin: 0 0 20px 0; font-weight: 600;
 *   text-transform: uppercase; text-shadow; color; font-size: 2.5em/etc;
 *   font-family; line-height: 1.2; letter-spacing } */
${P} h1, ${P} h2, ${P} h3,
${P} h4, ${P} h5, ${P} h6 {
  margin: 0;
  padding: 0;
  font: inherit;
  color: inherit;
  text-transform: none;
  text-shadow: none;
  letter-spacing: inherit;
  word-wrap: normal;
}

/* --- Lists ---
 * Counters: .reveal ol/ul/dl { display: inline-block; margin: 0 0 0 1em }
 *           .reveal ul ul   { display: block; margin-left: 40px }
 *           .reveal ul ul ul { list-style-type: circle } */
${P} ul, ${P} ol, ${P} dl {
  margin: 0;
  padding: 0;
  display: block;
  text-align: inherit;
  list-style-position: outside;
}
${P} li {
  margin: 0;
  padding: 0;
}

/* --- Definition lists ---
 * Counters: .reveal dt { font-weight: bold }
 *           .reveal dd { margin-left: 40px } */
${P} dt {
  font-weight: inherit;
}
${P} dd {
  margin: 0;
  padding: 0;
}

/* --- Media: prevent Reveal's responsive constraints ---
 * Counters: .reveal img/video/iframe { max-width: 95%; max-height: 95% }
 *           .reveal img { margin: 20px 0 }
 *           .reveal iframe { z-index: 1 } */
${P} img, ${P} svg, ${P} video,
${P} canvas, ${P} iframe {
  max-width: none;
  max-height: none;
  margin: 0;
}
${P} iframe {
  z-index: auto;
}
${P} img, ${P} svg {
  vertical-align: baseline;
}

/* --- Blockquote ---
 * Counters: .reveal blockquote { width: 70%; margin: 20px auto; padding: 5px;
 *   font-style: italic; background: rgba(...); box-shadow; position: relative }
 *           .reveal blockquote p:first/last-child { display: inline-block } */
${P} blockquote {
  margin: 0;
  padding: 0;
  width: auto;
  position: static;
  font-style: inherit;
  background: none;
  box-shadow: none;
}
${P} q {
  font-style: inherit;
}

/* --- Pre/Code ---
 * Counters: .reveal pre { width: 90%; margin: 20px auto; font-size: 0.55em;
 *   position: relative; box-shadow; line-height: 1.2em }
 *           .reveal code { font-family: monospace; text-transform: none }
 *           .reveal pre code { padding: 5px; max-height: 400px } */
${P} pre {
  margin: 0;
  padding: 0;
  width: auto;
  position: static;
  font-size: 1em;
  line-height: 1.2;
  white-space: pre;
  word-wrap: normal;
  box-shadow: none;
  text-align: inherit;
}
${P} code {
  margin: 0;
  padding: 0;
  font-size: 1em;
  line-height: inherit;
  text-transform: none;
  white-space: normal;
}
${P} pre code {
  display: block;
  padding: 0;
  overflow: visible;
  max-height: none;
  word-wrap: normal;
  white-space: pre;
}

/* --- Tables ---
 * Counters: .reveal table { margin: auto }
 *           .reveal table th/td { padding: 0.2em 0.5em; border-bottom: 1px solid }
 *           .reveal table th { font-weight: bold } */
${P} table {
  margin: 0;
  border-collapse: collapse;
  border-spacing: 0;
}
${P} th, ${P} td {
  padding: 0;
  border: none;
  text-align: inherit;
  font-weight: inherit;
}

/* --- Small ---
 * Counters: .reveal small { display: inline-block; font-size: 0.6em;
 *   line-height: 1.2em; vertical-align: top } */
${P} small {
  display: inline;
  font-size: inherit;
  line-height: inherit;
  vertical-align: baseline;
}

/* --- Links ---
 * Counters: .reveal a { color: var(--r-link-color); text-decoration: none;
 *   transition: color .15s; position: relative }
 *           .reveal a:hover { color: var(--r-link-color-hover) } */
${P} a, ${P} a:hover {
  color: inherit;
  text-decoration: inherit;
  background: none;
  text-shadow: none;
}
`;
}

// =============================================================================
// Shadow Presets (M8.6)
// =============================================================================

/** Named shadow preset key. */
export type ShadowPreset = keyof typeof SHADOWS;

/**
 * Named shadow presets mapped to CSS box-shadow values.
 */
export const SHADOWS = {
  sm:   "0 1px 3px rgba(0,0,0,0.2)",
  md:   "0 4px 12px rgba(0,0,0,0.3)",
  lg:   "0 8px 32px rgba(0,0,0,0.4)",
  xl:   "0 16px 48px rgba(0,0,0,0.5)",
  glow: "0 0 40px rgba(124,92,191,0.3)",
} as const;

/**
 * Resolve a shadow value: if it's a named preset key, return the CSS value.
 * If it's already a CSS value (contains "px"), pass through.
 *
 * @param value - Shadow preset name or CSS value
 * @returns CSS box-shadow value
 */
export function resolveShadow(value: string): string {
  if (!value) return "";
  if (value in SHADOWS) return SHADOWS[value as ShadowPreset];
  return value; // pass through CSS values
}

/**
 * Get the shadow presets map (for testing/introspection).
 *
 * @returns Copy of the shadow presets
 */
export function getShadowPresets(): Record<string, string> {
  return { ...SHADOWS };
}

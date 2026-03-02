// slidekit/src/state.ts
var state = {
  idCounter: 0,
  config: null,
  safeRectCache: null,
  loadedFonts: /* @__PURE__ */ new Set(),
  measureContainer: null,
  measureCache: /* @__PURE__ */ new Map(),
  fontWarnings: [],
  injectedFontLinks: /* @__PURE__ */ new Set(),
  transformIdCounter: 0
};

// slidekit/src/id.ts
function resetIdCounter() {
  state.idCounter = 0;
}
function nextId() {
  state.idCounter += 1;
  return `sk-${state.idCounter}`;
}

// slidekit/src/spacing.ts
var DEFAULT_SPACING = {
  xs: 8,
  sm: 16,
  md: 24,
  lg: 32,
  xl: 48,
  section: 80
};
function resolveSpacing(value) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const scale = state.config?.spacing || DEFAULT_SPACING;
    if (Object.prototype.hasOwnProperty.call(scale, value)) return scale[value];
    const available = Object.keys(scale).join(", ");
    throw new Error(`Unknown spacing token "${value}". Available tokens: ${available}`);
  }
  return value;
}
function getSpacing(token) {
  return resolveSpacing(token);
}

// slidekit/src/elements.ts
var COMMON_DEFAULTS = {
  x: 0,
  y: 0,
  anchor: "tl",
  layer: "content",
  opacity: 1,
  style: null,
  // sentinel — applyDefaults creates fresh {} per element
  className: "",
  valign: "top"
};
function applyDefaults(props, extraDefaults = {}) {
  const merged = { ...COMMON_DEFAULTS, ...extraDefaults };
  const result = {};
  for (const key of Object.keys(merged)) {
    if (key === "id") continue;
    if (key === "style") {
      result[key] = props[key] !== void 0 ? props[key] : {};
    } else {
      result[key] = props[key] !== void 0 ? props[key] : merged[key];
    }
  }
  for (const key of Object.keys(props)) {
    if (key === "id") continue;
    if (result[key] === void 0) {
      result[key] = props[key];
    }
  }
  return result;
}
function el(html, props = {}) {
  const { id: customId, ...rest } = props;
  const id = customId || nextId();
  const resolved = applyDefaults(rest, {
    overflow: "visible"
  });
  return { id, type: "el", content: html, props: resolved, _layoutFlags: {} };
}
function group(children, props = {}) {
  const { id: customId, ...rest } = props;
  const id = customId || nextId();
  const resolved = applyDefaults(rest, {
    scale: 1,
    clip: false
  });
  return { id, type: "group", children, props: resolved, _layoutFlags: {} };
}
function vstack(items, props = {}) {
  const { id: customId, ...rest } = props;
  const id = customId || nextId();
  const resolved = applyDefaults(rest, {
    gap: 0,
    align: "left"
  });
  return { id, type: "vstack", children: items, props: resolved, _layoutFlags: {} };
}
function hstack(items, props = {}) {
  const { id: customId, ...rest } = props;
  const id = customId || nextId();
  const resolved = applyDefaults(rest, {
    gap: 0,
    align: "top"
  });
  return { id, type: "hstack", children: items, props: resolved, _layoutFlags: {} };
}
function cardGrid(items, { id, cols = 2, gap = 0, x = 0, y = 0, w, anchor, layer, style } = {}) {
  const safeCols = Math.max(1, Math.floor(cols || 2));
  const resolvedGap = resolveSpacing(typeof gap === "string" || typeof gap === "number" ? gap : 0);
  const rows = [];
  for (let i = 0; i < items.length; i += safeCols) {
    rows.push(items.slice(i, i + safeCols));
  }
  const rowStacks = rows.map(
    (rowItems, idx) => hstack(rowItems, { id: id ? `${id}-row-${idx}` : void 0, gap: resolvedGap, align: "stretch" })
  );
  return vstack(rowStacks, {
    id,
    x,
    y,
    w,
    gap: resolvedGap,
    anchor,
    layer,
    style
  });
}

// slidekit/src/anchor.ts
var VALID_ANCHORS = /* @__PURE__ */ new Set(["tl", "tc", "tr", "cl", "cc", "cr", "bl", "bc", "br"]);
function resolveAnchor(x, y, w, h, anchor) {
  if (typeof anchor !== "string" || !VALID_ANCHORS.has(anchor)) {
    throw new Error(
      `Invalid anchor "${anchor}". Must be one of: ${Array.from(VALID_ANCHORS).join(", ")}`
    );
  }
  let left;
  const col = anchor[1];
  if (col === "l") {
    left = x;
  } else if (col === "c") {
    left = x - w / 2;
  } else if (col === "r") {
    left = x - w;
  } else {
    throw new Error(`Invalid anchor column "${col}" in anchor "${anchor}"`);
  }
  let top;
  const row = anchor[0];
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

// slidekit/src/style.ts
function toCamelCase(name) {
  if (name.startsWith("--")) return name;
  if (!name.includes("-")) return name;
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
function stripVendorPrefix(camelName) {
  const prefixes = ["Webkit", "Moz", "ms", "O"];
  for (const prefix of prefixes) {
    if (camelName.startsWith(prefix) && camelName.length > prefix.length) {
      const rest = camelName.slice(prefix.length);
      if (rest[0] >= "A" && rest[0] <= "Z") {
        return rest[0].toLowerCase() + rest.slice(1);
      }
    }
  }
  return camelName;
}
var CSS_LIKE_PROPS = /* @__PURE__ */ new Set([
  // Text
  "textAlign",
  "textDecoration",
  "textTransform",
  "textIndent",
  "textShadow",
  "letterSpacing",
  "wordSpacing",
  "whiteSpace",
  "wordBreak",
  "wordWrap",
  "textOverflow",
  // Font
  "fontSize",
  "fontFamily",
  "fontWeight",
  "fontStyle",
  "fontVariant",
  "lineHeight",
  // Color / Background
  "backgroundColor",
  "background",
  "backgroundImage",
  "backgroundSize",
  "backgroundPosition",
  "backgroundRepeat",
  // Border
  "border",
  "borderRadius",
  "borderWidth",
  "borderStyle",
  "borderColor",
  "borderTop",
  "borderBottom",
  "borderLeft",
  "borderRight",
  // Spacing (padding only — margin is blocked by filterStyle)
  "padding",
  "paddingTop",
  "paddingBottom",
  "paddingLeft",
  "paddingRight",
  // Other visual
  "boxShadow",
  "cursor",
  "visibility",
  "verticalAlign",
  "listStyle",
  "outline"
]);
var KNOWN_LAYOUT_PROPS = /* @__PURE__ */ new Set([
  // Position / size
  "x",
  "y",
  "w",
  "h",
  "maxW",
  "maxH",
  // Layout
  "anchor",
  "layer",
  "valign",
  "overflow",
  // Visual (SlideKit-owned)
  "style",
  "opacity",
  "rotate",
  "className",
  "shadow",
  "z",
  // Stack / group
  "gap",
  "align",
  "bounds",
  "scale",
  "clip",
  // Internal
  "_layoutFlags",
  "id",
  // Connector-specific
  "dash",
  "type",
  "arrow",
  "color",
  "thickness",
  "label",
  "labelStyle",
  "fromAnchor",
  "toAnchor",
  "fromId",
  "toId",
  "connectorType",
  // Content-bearing
  "text",
  "src",
  "alt"
]);
function detectMisplacedCssProps(props) {
  const cssProps = {};
  const warnings = [];
  const elementId = props.id || "(anonymous)";
  for (const key of Object.keys(props)) {
    if (KNOWN_LAYOUT_PROPS.has(key)) continue;
    if (!CSS_LIKE_PROPS.has(key)) continue;
    cssProps[key] = props[key];
    warnings.push({
      type: "misplaced_css_prop",
      elementId,
      property: key,
      value: props[key],
      message: `CSS property "${key}" should be inside style: { ${key}: ${JSON.stringify(props[key])} }. It was auto-promoted but please move it to style for clarity.`,
      suggestion: `Move "${key}" into the style object: style: { ${key}: ... }`
    });
  }
  return { cssProps, warnings };
}
var BLOCKED_PROPERTIES = /* @__PURE__ */ new Set([
  // Layout position — library owns absolute positioning
  "position",
  "top",
  "left",
  "right",
  "bottom",
  "inset",
  "insetBlock",
  "insetBlockStart",
  "insetBlockEnd",
  "insetInline",
  "insetInlineStart",
  "insetInlineEnd",
  // Sizing — library owns via w/h props
  "width",
  "height",
  "minWidth",
  "maxWidth",
  "minHeight",
  "maxHeight",
  "blockSize",
  "inlineSize",
  "minBlockSize",
  "maxBlockSize",
  "minInlineSize",
  "maxInlineSize",
  // Display — library needs block
  "display",
  // Overflow — library manages via overflow prop
  "overflow",
  "overflowX",
  "overflowY",
  "overflowBlock",
  "overflowInline",
  // Margin — breaks absolute positioning
  "margin",
  "marginTop",
  "marginRight",
  "marginBottom",
  "marginLeft",
  "marginBlock",
  "marginBlockStart",
  "marginBlockEnd",
  "marginInline",
  "marginInlineStart",
  "marginInlineEnd",
  // Transform — library owns via rotate prop
  "transform",
  "translate",
  "rotate",
  "scale",
  // Containment — can suppress layout/paint
  "contain",
  "contentVisibility"
]);
var BLOCKED_SUGGESTIONS = {
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
  contentVisibility: "contentVisibility can suppress rendering and conflict with measurement"
};
function filterStyle(style = {}, _elementType = "unknown") {
  const warnings = [];
  const filtered = {};
  for (const [rawKey, value] of Object.entries(style)) {
    const camelKey = toCamelCase(rawKey);
    const unprefixedKey = stripVendorPrefix(camelKey);
    const blockedKey = BLOCKED_PROPERTIES.has(camelKey) ? camelKey : BLOCKED_PROPERTIES.has(unprefixedKey) ? unprefixedKey : null;
    if (blockedKey) {
      warnings.push({
        type: "blocked_css_property",
        property: camelKey,
        originalProperty: rawKey,
        value,
        suggestion: BLOCKED_SUGGESTIONS[blockedKey] || "This property conflicts with SlideKit's positioning system"
      });
      continue;
    }
    filtered[camelKey] = value;
  }
  return { filtered, warnings };
}
function _baselineCSS(prefix) {
  const p = prefix.trim();
  if (p.includes(",")) {
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
  font-size: initial;
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
var SHADOWS = {
  sm: "0 1px 3px rgba(0,0,0,0.2)",
  md: "0 4px 12px rgba(0,0,0,0.3)",
  lg: "0 8px 32px rgba(0,0,0,0.4)",
  xl: "0 16px 48px rgba(0,0,0,0.5)",
  glow: "0 0 40px rgba(124,92,191,0.3)"
};
function resolveShadow(value) {
  if (!value) return "";
  if (value in SHADOWS) return SHADOWS[value];
  return value;
}
function getShadowPresets() {
  return { ...SHADOWS };
}

// slidekit/src/config.ts
var DEFAULT_CONFIG = {
  slide: { w: 1920, h: 1080 },
  safeZone: { left: 120, right: 120, top: 90, bottom: 90 },
  strict: false,
  minFontSize: 24,
  fonts: [],
  spacing: { ...DEFAULT_SPACING }
};
async function init(config = {}) {
  const resolved = {
    slide: { ...DEFAULT_CONFIG.slide, ...config.slide || {} },
    safeZone: { ...DEFAULT_CONFIG.safeZone, ...config.safeZone || {} },
    strict: config.strict !== void 0 ? config.strict : DEFAULT_CONFIG.strict,
    minFontSize: config.minFontSize !== void 0 ? config.minFontSize : DEFAULT_CONFIG.minFontSize,
    fonts: config.fonts || DEFAULT_CONFIG.fonts,
    spacing: { ...DEFAULT_SPACING, ...config.spacing || {} }
  };
  state.config = resolved;
  const sz = resolved.safeZone;
  const sl = resolved.slide;
  const safeW = sl.w - sz.left - sz.right;
  const safeH = sl.h - sz.top - sz.bottom;
  if (safeW <= 0 || safeH <= 0) {
    throw new Error(
      `Invalid safeZone configuration: computed safe rect is ${safeW}x${safeH}. Check slide dimensions (${sl.w}x${sl.h}) and safeZone margins.`
    );
  }
  state.safeRectCache = {
    x: sz.left,
    y: sz.top,
    w: safeW,
    h: safeH
  };
  state.loadedFonts = /* @__PURE__ */ new Set();
  state.fontWarnings = [];
  state.measureCache = /* @__PURE__ */ new Map();
  if (resolved.fonts.length > 0) {
    await _loadFonts(resolved.fonts);
  }
  return resolved;
}
async function _loadFonts(fonts) {
  const FONT_TIMEOUT_MS = 5e3;
  const testString = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (const fontDef of fonts) {
    if (fontDef.source === "google") {
      _injectGoogleFontLink(fontDef);
    }
  }
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
  await Promise.all(loadPromises);
  try {
    await document.fonts.ready;
  } catch (e) {
  }
}
async function _loadSingleFont(fontString, key, testString, timeoutMs) {
  try {
    const loadResult = await Promise.race([
      document.fonts.load(fontString, testString),
      new Promise(
        (_, reject) => setTimeout(() => reject(new Error("timeout")), timeoutMs)
      )
    ]);
    if (Array.isArray(loadResult) && loadResult.length > 0) {
      state.loadedFonts.add(key);
    } else {
      if (document.fonts.check(fontString, testString)) {
        state.loadedFonts.add(key);
      } else {
        state.fontWarnings.push({
          type: "font_load_failed",
          font: key,
          message: `Font "${key}" could not be loaded. Falling back to system font.`
        });
      }
    }
  } catch (err) {
    state.fontWarnings.push({
      type: "font_load_timeout",
      font: key,
      message: `Font "${key}" failed to load within timeout. Falling back to system font.`
    });
  }
}
function _injectGoogleFontLink(fontDef) {
  const family = fontDef.family.replace(/ /g, "+");
  const weights = (fontDef.weights || [400]).join(";");
  const href = `https://fonts.googleapis.com/css2?family=${family}:wght@${weights}&display=swap`;
  const existing = document.querySelector(`link[href="${href}"]`);
  if (existing) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
  state.injectedFontLinks.add(link);
}
function isFontLoaded(family, weight = 400) {
  return state.loadedFonts.has(`${family}:${weight}`);
}
function getFontWarnings() {
  return [...state.fontWarnings];
}
function safeRect() {
  if (!state.safeRectCache) {
    throw new Error("SlideKit.init() must be called before safeRect()");
  }
  return { ...state.safeRectCache };
}
function splitRect(rect, { ratio = 0.5, gap = 0 } = {}) {
  const gapPx = resolveSpacing(gap);
  const leftW = Math.round((rect.w - gapPx) * ratio);
  const rightW = rect.w - gapPx - leftW;
  return {
    left: { x: rect.x, y: rect.y, w: leftW, h: rect.h },
    right: { x: rect.x + leftW + gapPx, y: rect.y, w: rightW, h: rect.h }
  };
}
function getConfig() {
  if (!state.config) return null;
  return JSON.parse(JSON.stringify(state.config));
}
function _resetForTests() {
  state.config = null;
  state.safeRectCache = null;
  resetIdCounter();
  state.transformIdCounter = 0;
  state.loadedFonts = /* @__PURE__ */ new Set();
  state.fontWarnings = [];
  state.measureCache = /* @__PURE__ */ new Map();
  if (state.measureContainer && state.measureContainer.parentNode) {
    state.measureContainer.parentNode.removeChild(state.measureContainer);
  }
  state.measureContainer = null;
  for (const link of state.injectedFontLinks) {
    if (link.parentNode) link.parentNode.removeChild(link);
  }
  state.injectedFontLinks = /* @__PURE__ */ new Set();
}

// slidekit/src/dom-helpers.ts
function applyStyleToDOM(domEl, styleObj) {
  for (const [key, value] of Object.entries(styleObj)) {
    if (key.startsWith("--")) {
      domEl.style.setProperty(key, value);
    } else {
      domEl.style[key] = value;
    }
  }
}

// slidekit/src/measure.ts
function _ensureMeasureContainer() {
  if (state.measureContainer && state.measureContainer.parentNode) return;
  if (typeof document === "undefined" || !document.body) {
    throw new Error(
      "SlideKit.measure requires a DOM with document.body available."
    );
  }
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.top = "-9999px";
  container.style.visibility = "hidden";
  container.style.overflow = "hidden";
  container.style.pointerEvents = "none";
  container.setAttribute("data-sk-role", "measure-container");
  const baselineStyle = document.createElement("style");
  baselineStyle.textContent = _baselineCSS("[data-sk-measure]");
  container.appendChild(baselineStyle);
  document.body.appendChild(container);
  state.measureContainer = container;
}
function clearMeasureCache() {
  state.measureCache.clear();
}
function _elMeasureCacheKey(html, props) {
  const styleKey = props.style ? JSON.stringify(props.style, Object.keys(props.style).sort()) : null;
  return JSON.stringify(["el", html, props.w ?? null, styleKey, props.className || ""]);
}
async function measure(html, props = {}) {
  const cacheKey = _elMeasureCacheKey(html, props);
  if (state.measureCache.has(cacheKey)) {
    return state.measureCache.get(cacheKey);
  }
  _ensureMeasureContainer();
  const div = document.createElement("div");
  div.style.boxSizing = "border-box";
  if (props.w != null) div.style.width = `${props.w}px`;
  if (props.className) div.className = props.className;
  if (props.style) {
    const { filtered } = filterStyle(props.style, "el");
    applyStyleToDOM(div, filtered);
  }
  div.setAttribute("data-sk-measure", "");
  div.innerHTML = html;
  state.measureContainer.appendChild(div);
  const imgs = div.querySelectorAll("img");
  if (imgs.length > 0) {
    const IMAGE_TIMEOUT_MS = 3e3;
    await Promise.all([...imgs].map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise((resolve) => {
        const timer = setTimeout(resolve, IMAGE_TIMEOUT_MS);
        const done = () => {
          clearTimeout(timer);
          resolve();
        };
        img.addEventListener("load", done, { once: true });
        img.addEventListener("error", done, { once: true });
      });
    }));
  }
  const result = { w: div.offsetWidth, h: div.scrollHeight };
  state.measureContainer.removeChild(div);
  state.measureCache.set(cacheKey, result);
  return result;
}

// slidekit/src/relative.ts
function below(refId, opts = {}) {
  return { _rel: "below", ref: refId, gap: resolveSpacing(opts.gap ?? 0) };
}
function above(refId, opts = {}) {
  return { _rel: "above", ref: refId, gap: resolveSpacing(opts.gap ?? 0) };
}
function rightOf(refId, opts = {}) {
  return { _rel: "rightOf", ref: refId, gap: resolveSpacing(opts.gap ?? 0) };
}
function leftOf(refId, opts = {}) {
  return { _rel: "leftOf", ref: refId, gap: resolveSpacing(opts.gap ?? 0) };
}
function centerVWith(refId) {
  return { _rel: "centerV", ref: refId };
}
function centerHWith(refId) {
  return { _rel: "centerH", ref: refId };
}
function alignTopWith(refId) {
  return { _rel: "alignTop", ref: refId };
}
function alignBottomWith(refId) {
  return { _rel: "alignBottom", ref: refId };
}
function alignLeftWith(refId) {
  return { _rel: "alignLeft", ref: refId };
}
function alignRightWith(refId) {
  return { _rel: "alignRight", ref: refId };
}
function centerIn(rectParam) {
  const marker = { _rel: "centerIn", rect: rectParam };
  return { x: marker, y: marker };
}
function placeBetween(topRef, bottomYOrRef, { bias = 0.35 } = {}) {
  const numBias = typeof bias === "number" && Number.isFinite(bias) ? bias : 0.35;
  const clampedBias = Math.max(0, Math.min(1, numBias));
  return { _rel: "between", ref: topRef, ref2: bottomYOrRef, bias: clampedBias };
}

// slidekit/src/assertions.ts
function mustGet(map, key, msg) {
  const value = map.get(key);
  if (value === void 0) {
    throw new Error(msg ?? `Map missing expected key: ${String(key)}`);
  }
  return value;
}

// slidekit/src/transforms.ts
function nextTransformId() {
  state.transformIdCounter += 1;
  return `transform-${state.transformIdCounter}`;
}
function alignLeft(ids, options = {}) {
  return { _transform: "alignLeft", _transformId: nextTransformId(), ids, options };
}
function alignRight(ids, options = {}) {
  return { _transform: "alignRight", _transformId: nextTransformId(), ids, options };
}
function alignTop(ids, options = {}) {
  return { _transform: "alignTop", _transformId: nextTransformId(), ids, options };
}
function alignBottom(ids, options = {}) {
  return { _transform: "alignBottom", _transformId: nextTransformId(), ids, options };
}
function alignCenterH(ids, options = {}) {
  return { _transform: "alignCenterH", _transformId: nextTransformId(), ids, options };
}
function alignCenterV(ids, options = {}) {
  return { _transform: "alignCenterV", _transformId: nextTransformId(), ids, options };
}
function distributeH(ids, options = {}) {
  return { _transform: "distributeH", _transformId: nextTransformId(), ids, options: { mode: "equal-gap", ...options } };
}
function distributeV(ids, options = {}) {
  return { _transform: "distributeV", _transformId: nextTransformId(), ids, options: { mode: "equal-gap", ...options } };
}
function matchWidth(ids) {
  return { _transform: "matchWidth", _transformId: nextTransformId(), ids, options: {} };
}
function matchHeight(ids) {
  return { _transform: "matchHeight", _transformId: nextTransformId(), ids, options: {} };
}
function matchSize(ids) {
  return { _transform: "matchSize", _transformId: nextTransformId(), ids, options: {} };
}
function fitToRect(ids, rectParam) {
  return { _transform: "fitToRect", _transformId: nextTransformId(), ids, options: { rect: rectParam } };
}
function applyTransform(transform, resolvedBounds, _flatMap) {
  const transformWarnings = [];
  const type = transform._transform;
  const ids = transform.ids || [];
  const opts = transform.options || {};
  const validIds = [];
  for (const id of ids) {
    if (!resolvedBounds.has(id)) {
      transformWarnings.push({
        type: "transform_unknown_element",
        transform: type,
        transformId: transform._transformId,
        elementId: id,
        message: `Transform "${type}": element "${id}" not found in resolved layout \u2014 skipping`
      });
    } else {
      validIds.push(id);
    }
  }
  if (validIds.length === 0) return transformWarnings;
  switch (type) {
    case "alignLeft": {
      const target = opts.to !== void 0 ? opts.to : Math.min(...validIds.map((id) => mustGet(resolvedBounds, id, `resolvedBounds missing element: ${id}`).x));
      for (const id of validIds) {
        mustGet(resolvedBounds, id, `resolvedBounds missing element: ${id}`).x = target;
      }
      break;
    }
    case "alignRight": {
      const target = opts.to !== void 0 ? opts.to : Math.max(...validIds.map((id) => {
        const b = mustGet(resolvedBounds, id, `resolvedBounds missing element: ${id}`);
        return b.x + b.w;
      }));
      for (const id of validIds) {
        const b = mustGet(resolvedBounds, id, `resolvedBounds missing element: ${id}`);
        b.x = target - b.w;
      }
      break;
    }
    case "alignTop": {
      const target = opts.to !== void 0 ? opts.to : Math.min(...validIds.map((id) => mustGet(resolvedBounds, id, `resolvedBounds missing element: ${id}`).y));
      for (const id of validIds) {
        mustGet(resolvedBounds, id, `resolvedBounds missing element: ${id}`).y = target;
      }
      break;
    }
    case "alignBottom": {
      const target = opts.to !== void 0 ? opts.to : Math.max(...validIds.map((id) => {
        const b = mustGet(resolvedBounds, id, `resolvedBounds missing element: ${id}`);
        return b.y + b.h;
      }));
      for (const id of validIds) {
        const b = mustGet(resolvedBounds, id, `resolvedBounds missing element: ${id}`);
        b.y = target - b.h;
      }
      break;
    }
    case "alignCenterH": {
      const target = opts.to !== void 0 ? opts.to : validIds.reduce((sum, id) => {
        const b = mustGet(resolvedBounds, id, `resolvedBounds missing element: ${id}`);
        return sum + (b.x + b.w / 2);
      }, 0) / validIds.length;
      for (const id of validIds) {
        const b = mustGet(resolvedBounds, id, `resolvedBounds missing element: ${id}`);
        b.x = target - b.w / 2;
      }
      break;
    }
    case "alignCenterV": {
      const target = opts.to !== void 0 ? opts.to : validIds.reduce((sum, id) => {
        const b = mustGet(resolvedBounds, id, `resolvedBounds missing element: ${id}`);
        return sum + (b.y + b.h / 2);
      }, 0) / validIds.length;
      for (const id of validIds) {
        const b = mustGet(resolvedBounds, id, `resolvedBounds missing element: ${id}`);
        b.y = target - b.h / 2;
      }
      break;
    }
    case "distributeH": {
      if (validIds.length < 2) break;
      const sorted = [...validIds].sort(
        (a, b) => mustGet(resolvedBounds, a, `resolvedBounds missing element: ${a}`).x - mustGet(resolvedBounds, b, `resolvedBounds missing element: ${b}`).x
      );
      const mode = opts.mode || "equal-gap";
      const firstBounds = mustGet(resolvedBounds, sorted[0], `resolvedBounds missing element: ${sorted[0]}`);
      const lastBounds = mustGet(resolvedBounds, sorted[sorted.length - 1], `resolvedBounds missing element: ${sorted[sorted.length - 1]}`);
      if (mode === "equal-gap") {
        const startX = opts.startX !== void 0 ? opts.startX : firstBounds.x;
        const endX = opts.endX !== void 0 ? opts.endX : lastBounds.x + lastBounds.w;
        const totalWidth = sorted.reduce((sum, id) => sum + mustGet(resolvedBounds, id, `resolvedBounds missing element: ${id}`).w, 0);
        const totalGap = endX - startX - totalWidth;
        const gapBetween = totalGap / (sorted.length - 1);
        let curX = startX;
        for (const id of sorted) {
          const b = mustGet(resolvedBounds, id, `resolvedBounds missing element: ${id}`);
          b.x = curX;
          curX += b.w + gapBetween;
        }
      } else if (mode === "equal-center") {
        const startX = opts.startX !== void 0 ? opts.startX : firstBounds.x + firstBounds.w / 2;
        const endX = opts.endX !== void 0 ? opts.endX : lastBounds.x + lastBounds.w / 2;
        const spacing = (endX - startX) / (sorted.length - 1);
        for (let i = 0; i < sorted.length; i++) {
          const b = mustGet(resolvedBounds, sorted[i], `resolvedBounds missing element: ${sorted[i]}`);
          b.x = startX + i * spacing - b.w / 2;
        }
      }
      break;
    }
    case "distributeV": {
      if (validIds.length < 2) break;
      const sorted = [...validIds].sort(
        (a, b) => mustGet(resolvedBounds, a, `resolvedBounds missing element: ${a}`).y - mustGet(resolvedBounds, b, `resolvedBounds missing element: ${b}`).y
      );
      const mode = opts.mode || "equal-gap";
      const firstBounds = mustGet(resolvedBounds, sorted[0], `resolvedBounds missing element: ${sorted[0]}`);
      const lastBounds = mustGet(resolvedBounds, sorted[sorted.length - 1], `resolvedBounds missing element: ${sorted[sorted.length - 1]}`);
      if (mode === "equal-gap") {
        const startY = opts.startY !== void 0 ? opts.startY : firstBounds.y;
        const endY = opts.endY !== void 0 ? opts.endY : lastBounds.y + lastBounds.h;
        const totalHeight = sorted.reduce((sum, id) => sum + mustGet(resolvedBounds, id, `resolvedBounds missing element: ${id}`).h, 0);
        const totalGap = endY - startY - totalHeight;
        const gapBetween = totalGap / (sorted.length - 1);
        let curY = startY;
        for (const id of sorted) {
          const b = mustGet(resolvedBounds, id, `resolvedBounds missing element: ${id}`);
          b.y = curY;
          curY += b.h + gapBetween;
        }
      } else if (mode === "equal-center") {
        const startY = opts.startY !== void 0 ? opts.startY : firstBounds.y + firstBounds.h / 2;
        const endY = opts.endY !== void 0 ? opts.endY : lastBounds.y + lastBounds.h / 2;
        const spacing = (endY - startY) / (sorted.length - 1);
        for (let i = 0; i < sorted.length; i++) {
          const b = mustGet(resolvedBounds, sorted[i], `resolvedBounds missing element: ${sorted[i]}`);
          b.y = startY + i * spacing - b.h / 2;
        }
      }
      break;
    }
    case "matchWidth": {
      const maxW = Math.max(...validIds.map((id) => mustGet(resolvedBounds, id, `resolvedBounds missing element: ${id}`).w));
      for (const id of validIds) {
        mustGet(resolvedBounds, id, `resolvedBounds missing element: ${id}`).w = maxW;
      }
      break;
    }
    case "matchHeight": {
      const maxH = Math.max(...validIds.map((id) => mustGet(resolvedBounds, id, `resolvedBounds missing element: ${id}`).h));
      for (const id of validIds) {
        mustGet(resolvedBounds, id, `resolvedBounds missing element: ${id}`).h = maxH;
      }
      break;
    }
    case "matchSize": {
      const maxW = Math.max(...validIds.map((id) => mustGet(resolvedBounds, id, `resolvedBounds missing element: ${id}`).w));
      const maxH = Math.max(...validIds.map((id) => mustGet(resolvedBounds, id, `resolvedBounds missing element: ${id}`).h));
      for (const id of validIds) {
        const b = mustGet(resolvedBounds, id, `resolvedBounds missing element: ${id}`);
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
          message: `fitToRect: invalid target rect`
        });
        break;
      }
      let minX = Infinity, minY = Infinity;
      let maxX = -Infinity, maxY = -Infinity;
      for (const id of validIds) {
        const b = mustGet(resolvedBounds, id, `resolvedBounds missing element: ${id}`);
        minX = Math.min(minX, b.x);
        minY = Math.min(minY, b.y);
        maxX = Math.max(maxX, b.x + b.w);
        maxY = Math.max(maxY, b.y + b.h);
      }
      const bbW = maxX - minX;
      const bbH = maxY - minY;
      if (bbW <= 0 || bbH <= 0) break;
      const scaleX = targetRect.w / bbW;
      const scaleY = targetRect.h / bbH;
      const scale = Math.min(scaleX, scaleY);
      const scaledW = bbW * scale;
      const scaledH = bbH * scale;
      const offsetX = targetRect.x + (targetRect.w - scaledW) / 2;
      const offsetY = targetRect.y + (targetRect.h - scaledH) / 2;
      for (const id of validIds) {
        const b = mustGet(resolvedBounds, id, `resolvedBounds missing element: ${id}`);
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
        message: `Unknown transform type: "${type}"`
      });
      break;
  }
  return transformWarnings;
}

// slidekit/src/lint.ts
var THRESHOLDS = {
  minFontSize: 18,
  warnFontSize: 24,
  maxFontSize: 120,
  maxLineLength: 80,
  minLineHeightRatio: 1.15,
  minGap: 8,
  alignmentTolerance: 4,
  edgeCrowding: 8,
  contentAreaMin: 0.4,
  maxRootElements: 15,
  imageUpscaleMax: 1.1,
  aspectRatioTolerance: 0.01,
  contrastMin: 3,
  titlePositionDrift: 20,
  maxFontFamilies: 3,
  marginRatioMax: 0.25
};
var CANVAS = { x: 0, y: 0, w: 1920, h: 1080 };
var SAFE_ZONE = { x: 120, y: 90, w: 1680, h: 900 };
function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
function rectIntersection(a, b) {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.w, b.x + b.w);
  const y2 = Math.min(a.y + a.h, b.y + b.h);
  if (x2 <= x || y2 <= y) return null;
  return { x, y, w: x2 - x, h: y2 - y };
}
function isAncestor(elements, elementId, ancestorId) {
  const visited = /* @__PURE__ */ new Set();
  let current = elements[elementId];
  while (current && current.parentId) {
    if (visited.has(current.id)) return false;
    visited.add(current.id);
    if (current.parentId === ancestorId) return true;
    current = elements[current.parentId];
  }
  return false;
}
function localBoundsOf(el2) {
  const r = el2.localResolved;
  return r ? { x: r.x, y: r.y, w: r.w, h: r.h } : null;
}
function absoluteBoundsOf(el2, elements) {
  const r = el2.resolved;
  if (!r) return null;
  let absX = r.x;
  let absY = r.y;
  const visited = /* @__PURE__ */ new Set();
  let currentId = el2.parentId;
  while (currentId) {
    if (visited.has(currentId)) return null;
    visited.add(currentId);
    const parent = elements[currentId];
    if (!parent?.resolved) return null;
    const skipOffsetTypes = ["hstack", "vstack"];
    if (!skipOffsetTypes.includes(parent.type)) {
      absX += parent.resolved.x;
      absY += parent.resolved.y;
    }
    currentId = parent.parentId;
  }
  return { x: absX, y: absY, w: r.w, h: r.h };
}
function normLayer(el2) {
  const layer = el2?.authored?.props?.layer;
  return layer === "bg" || layer === "overlay" || layer === "content" ? layer : "content";
}
function isConnectorEndpointPair(a, b) {
  if (a.type === "connector") {
    const cr = a._connectorResolved;
    const props = a.authored?.props;
    const fromId = cr?.fromId ?? props?.fromId;
    const toId = cr?.toId ?? props?.toId;
    if (b.id === fromId || b.id === toId) return true;
  }
  if (b.type === "connector") {
    const cr = b._connectorResolved;
    const props = b.authored?.props;
    const fromId = cr?.fromId ?? props?.fromId;
    const toId = cr?.toId ?? props?.toId;
    if (a.id === fromId || a.id === toId) return true;
  }
  return false;
}
function ruleChildOverflow(elements) {
  const findings = [];
  for (const el2 of Object.values(elements)) {
    if (!el2.parentId || el2._internal) continue;
    const parent = elements[el2.parentId];
    if (!parent) continue;
    const parentBoundsMode = parent.authored?.props?.bounds;
    if (parentBoundsMode === "hug") continue;
    const cb = localBoundsOf(el2);
    const pr = parent.resolved;
    if (!cb || !pr) continue;
    const pb = { x: 0, y: 0, w: pr.w, h: pr.h };
    const edges = [
      { edge: "left", overshoot: pb.x - cb.x },
      { edge: "top", overshoot: pb.y - cb.y },
      { edge: "right", overshoot: cb.x + cb.w - (pb.x + pb.w) },
      { edge: "bottom", overshoot: cb.y + cb.h - (pb.y + pb.h) }
    ];
    for (const { edge, overshoot } of edges) {
      if (overshoot > 0.5) {
        const dim = edge === "left" || edge === "right" ? "width" : "height";
        const parentDim = dim === "width" ? pb.w : pb.h;
        findings.push({
          rule: "child-overflow",
          severity: "error",
          elementId: el2.id,
          message: `Child "${el2.id}" overflows parent "${el2.parentId}" on ${edge} by ${overshoot}px`,
          detail: { edge, overshoot, parentId: el2.parentId },
          bounds: cb,
          parentBounds: pb,
          suggestion: `Reduce child ${dim} or increase parent ${dim} to ${parentDim + overshoot}`
        });
      }
    }
  }
  return findings;
}
function ruleNonAncestorOverlap(elements) {
  const findings = [];
  const els = Object.values(elements).filter((e) => !e._internal);
  const absCache = /* @__PURE__ */ new Map();
  function cachedAbsBounds(e) {
    if (!absCache.has(e.id)) absCache.set(e.id, absoluteBoundsOf(e, elements));
    return absCache.get(e.id);
  }
  const withSize = els.filter((e) => {
    const b = cachedAbsBounds(e);
    return b && b.w > 0 && b.h > 0;
  });
  const seen = /* @__PURE__ */ new Set();
  for (let i = 0; i < withSize.length; i++) {
    for (let j = i + 1; j < withSize.length; j++) {
      const a = withSize[i];
      const b = withSize[j];
      const layerA = normLayer(a);
      const layerB = normLayer(b);
      if (layerA !== layerB) continue;
      if (isAncestor(elements, a.id, b.id) || isAncestor(elements, b.id, a.id)) continue;
      if (isConnectorEndpointPair(a, b)) continue;
      const ba = cachedAbsBounds(a);
      const bb = cachedAbsBounds(b);
      if (!rectsOverlap(ba, bb)) continue;
      const key = [a.id, b.id].sort().join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      const overlap = rectIntersection(ba, bb);
      const overlapArea = overlap ? overlap.w * overlap.h : 0;
      findings.push({
        rule: "non-ancestor-overlap",
        severity: "error",
        elementId: a.id,
        message: `"${a.id}" overlaps with "${b.id}" by ${overlapArea}px\xB2`,
        detail: { elementA: a.id, elementB: b.id, overlapArea, overlapRect: overlap },
        bounds: ba,
        parentBounds: null,
        suggestion: `Move ${a.id} to avoid ${overlapArea}px overlap with ${b.id}`
      });
    }
  }
  return findings;
}
function ruleCanvasOverflow(elements) {
  const findings = [];
  for (const el2 of Object.values(elements)) {
    if (el2._internal) continue;
    if (normLayer(el2) === "bg") continue;
    const b = absoluteBoundsOf(el2, elements);
    if (!b) continue;
    const edges = [
      { edge: "left", overshoot: CANVAS.x - b.x },
      { edge: "top", overshoot: CANVAS.y - b.y },
      { edge: "right", overshoot: b.x + b.w - (CANVAS.x + CANVAS.w) },
      { edge: "bottom", overshoot: b.y + b.h - (CANVAS.y + CANVAS.h) }
    ];
    for (const { edge, overshoot } of edges) {
      if (overshoot > 0.5) {
        findings.push({
          rule: "canvas-overflow",
          severity: "error",
          elementId: el2.id,
          message: `"${el2.id}" extends beyond canvas on ${edge} by ${overshoot}px`,
          detail: { edge, overshoot },
          bounds: b,
          parentBounds: null,
          suggestion: `Move element inward by ${overshoot}px`
        });
      }
    }
  }
  return findings;
}
function ruleSafeZoneViolation(elements) {
  const findings = [];
  for (const el2 of Object.values(elements)) {
    if (el2._internal) continue;
    if (el2.parentId != null) continue;
    if (normLayer(el2) === "bg" || normLayer(el2) === "overlay") continue;
    const b = absoluteBoundsOf(el2, elements);
    if (!b) continue;
    const edges = [
      { edge: "left", overshoot: SAFE_ZONE.x - b.x },
      { edge: "top", overshoot: SAFE_ZONE.y - b.y },
      { edge: "right", overshoot: b.x + b.w - (SAFE_ZONE.x + SAFE_ZONE.w) },
      { edge: "bottom", overshoot: b.y + b.h - (SAFE_ZONE.y + SAFE_ZONE.h) }
    ];
    for (const { edge, overshoot } of edges) {
      if (overshoot > 0.5) {
        findings.push({
          rule: "safe-zone-violation",
          severity: "warning",
          elementId: el2.id,
          message: `"${el2.id}" extends outside safe zone on ${edge} by ${overshoot}px`,
          detail: { edge, overshoot, safeRect: { ...SAFE_ZONE } },
          bounds: b,
          parentBounds: null,
          suggestion: `Move element ${overshoot}px inward from ${edge}`
        });
      }
    }
  }
  return findings;
}
function ruleZeroSize(elements) {
  const findings = [];
  for (const el2 of Object.values(elements)) {
    if (el2._internal) continue;
    if (el2.type === "connector") continue;
    const b = localBoundsOf(el2);
    if (!b) continue;
    if (b.w <= 0 || b.h <= 0) {
      findings.push({
        rule: "zero-size",
        severity: "error",
        elementId: el2.id,
        message: `"${el2.id}" has zero or negative size (${b.w}\xD7${b.h})`,
        detail: { w: b.w, h: b.h },
        bounds: b,
        parentBounds: null,
        suggestion: "Set explicit width/height for element"
      });
    }
  }
  return findings;
}
function siblingGroups(elements) {
  const groups = /* @__PURE__ */ new Map();
  for (const el2 of Object.values(elements)) {
    if (el2._internal) continue;
    if (normLayer(el2) === "bg") continue;
    const b = localBoundsOf(el2);
    if (!b || b.w <= 0 || b.h <= 0) continue;
    const key = el2.parentId ?? "__root__";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(el2);
  }
  return groups;
}
function rectGap(a, b) {
  const overlapX = a.x < b.x + b.w && a.x + a.w > b.x;
  const overlapY = a.y < b.y + b.h && a.y + a.h > b.y;
  const hGap = Math.max(0, Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w)));
  const vGap = Math.max(0, Math.max(b.y - (a.y + a.h), a.y - (b.y + b.h)));
  if (hGap > 0 && overlapY) return { gap: hGap, axis: "horizontal" };
  if (vGap > 0 && overlapX) return { gap: vGap, axis: "vertical" };
  return { gap: 0, axis: "none" };
}
function ruleGapTooSmall(elements) {
  const findings = [];
  for (const siblings of siblingGroups(elements).values()) {
    for (let i = 0; i < siblings.length; i++) {
      for (let j = i + 1; j < siblings.length; j++) {
        const a = siblings[i], b = siblings[j];
        const ba = localBoundsOf(a), bb = localBoundsOf(b);
        const { gap, axis } = rectGap(ba, bb);
        if (gap > 0 && gap < THRESHOLDS.minGap) {
          findings.push({
            rule: "gap-too-small",
            severity: "warning",
            elementId: a.id,
            message: `Gap between "${a.id}" and "${b.id}" is only ${gap}px`,
            detail: { elementA: a.id, elementB: b.id, gap, axis },
            suggestion: `Increase gap between elements to at least ${THRESHOLDS.minGap}px`
          });
        }
      }
    }
  }
  return findings;
}
function ruleNearMisalignment(elements) {
  const findings = [];
  const EXACT = 0.5;
  for (const siblings of siblingGroups(elements).values()) {
    for (let i = 0; i < siblings.length; i++) {
      for (let j = i + 1; j < siblings.length; j++) {
        const a = siblings[i], b = siblings[j];
        const ba = localBoundsOf(a), bb = localBoundsOf(b);
        const overlapX = ba.x < bb.x + bb.w && ba.x + ba.w > bb.x;
        const overlapY = ba.y < bb.y + bb.h && ba.y + ba.h > bb.y;
        const edges = [];
        if (overlapY) {
          edges.push(
            { type: "left", vA: ba.x, vB: bb.x },
            { type: "right", vA: ba.x + ba.w, vB: bb.x + bb.w },
            { type: "center-x", vA: ba.x + ba.w / 2, vB: bb.x + bb.w / 2 }
          );
        }
        if (overlapX) {
          edges.push(
            { type: "top", vA: ba.y, vB: bb.y },
            { type: "bottom", vA: ba.y + ba.h, vB: bb.y + bb.h },
            { type: "center-y", vA: ba.y + ba.h / 2, vB: bb.y + bb.h / 2 }
          );
        }
        let best = null;
        for (const { type, vA, vB } of edges) {
          const drift = Math.abs(vA - vB);
          if (drift > EXACT && drift <= THRESHOLDS.alignmentTolerance) {
            if (!best || drift < best.drift) {
              best = { edgeType: type, valueA: vA, valueB: vB, drift };
            }
          }
        }
        if (best) {
          findings.push({
            rule: "near-misalignment",
            severity: "info",
            elementId: a.id,
            message: `"${a.id}" and "${b.id}" are nearly aligned on ${best.edgeType} (drift: ${best.drift}px)`,
            detail: { elementA: a.id, elementB: b.id, ...best },
            suggestion: `Align ${best.edgeType} of ${a.id} with ${b.id} (drift: ${best.drift}px)`
          });
        }
      }
    }
  }
  return findings;
}
function ruleEdgeCrowding(elements) {
  const findings = [];
  const sz = SAFE_ZONE;
  for (const el2 of Object.values(elements)) {
    if (el2._internal) continue;
    if (el2.parentId != null) continue;
    if (normLayer(el2) === "bg" || normLayer(el2) === "overlay") continue;
    const b = localBoundsOf(el2);
    if (!b || b.w <= 0 || b.h <= 0) continue;
    const checks = [
      { edge: "left", distance: b.x - sz.x },
      { edge: "top", distance: b.y - sz.y },
      { edge: "right", distance: sz.x + sz.w - (b.x + b.w) },
      { edge: "bottom", distance: sz.y + sz.h - (b.y + b.h) }
    ];
    for (const { edge, distance } of checks) {
      if (distance > 0 && distance < THRESHOLDS.edgeCrowding) {
        findings.push({
          rule: "edge-crowding",
          severity: "info",
          elementId: el2.id,
          message: `"${el2.id}" is only ${distance}px from safe zone ${edge}`,
          detail: { edge, distance, needed: THRESHOLDS.edgeCrowding - distance, threshold: THRESHOLDS.edgeCrowding },
          suggestion: `Move element ${THRESHOLDS.edgeCrowding - distance}px away from safe zone ${edge}`
        });
      }
    }
  }
  return findings;
}
function ruleContentClustering(elements) {
  const findings = [];
  const roots = Object.values(elements).filter(
    (el2) => !el2._internal && el2.parentId == null && normLayer(el2) !== "bg"
  );
  const withBounds = roots.map((el2) => localBoundsOf(el2)).filter((b) => b != null && b.w > 0 && b.h > 0);
  if (withBounds.length === 0) return findings;
  let covered = 0;
  for (const b of withBounds) covered += b.w * b.h;
  const safeZoneArea = SAFE_ZONE.w * SAFE_ZONE.h;
  const usageRatio = covered / safeZoneArea;
  if (usageRatio < THRESHOLDS.contentAreaMin) {
    findings.push({
      rule: "content-clustering",
      severity: "warning",
      elementId: "slide",
      message: `Content uses only ${(usageRatio * 100).toFixed(0)}% of the safe zone`,
      detail: { usageRatio, covered, safeZoneArea },
      suggestion: `Content uses only ${(usageRatio * 100).toFixed(0)}% of the safe zone \u2014 consider using more of the available space`
    });
  }
  return findings;
}
function ruleLopsidedLayout(elements) {
  const findings = [];
  const roots = Object.values(elements).filter(
    (el2) => !el2._internal && el2.parentId == null && normLayer(el2) !== "bg"
  );
  const withBounds = roots.map((el2) => localBoundsOf(el2)).filter((b) => b != null && b.w > 0 && b.h > 0);
  if (withBounds.length === 0) return findings;
  let sumX = 0, sumY = 0, sumWeight = 0;
  for (const b of withBounds) {
    const weight = b.w * b.h;
    sumX += (b.x + b.w / 2) * weight;
    sumY += (b.y + b.h / 2) * weight;
    sumWeight += weight;
  }
  if (sumWeight === 0) return findings;
  const centroid = { x: sumX / sumWeight, y: sumY / sumWeight };
  const slideCenter = { x: 960, y: 540 };
  const drift = { x: centroid.x - slideCenter.x, y: centroid.y - slideCenter.y };
  if (Math.abs(drift.x) > 200 || Math.abs(drift.y) > 200) {
    const dirs = [];
    if (drift.y < -200) dirs.push("upward");
    if (drift.y > 200) dirs.push("downward");
    if (drift.x < -200) dirs.push("left");
    if (drift.x > 200) dirs.push("right");
    findings.push({
      rule: "lopsided-layout",
      severity: "info",
      elementId: "slide",
      message: `Content centroid is shifted ${dirs.join(" and ")} from slide center`,
      detail: { centroid, slideCenter, drift },
      suggestion: `Content is shifted ${dirs.join(" and ")} \u2014 consider recentering`
    });
  }
  return findings;
}
function ruleTooManyElements(elements) {
  const findings = [];
  const count = Object.values(elements).filter(
    (el2) => !el2._internal && el2.parentId == null && normLayer(el2) !== "bg"
  ).length;
  if (count > THRESHOLDS.maxRootElements) {
    findings.push({
      rule: "too-many-elements",
      severity: "info",
      elementId: "slide",
      message: `Slide has ${count} root elements (guideline: ${THRESHOLDS.maxRootElements})`,
      detail: { count, threshold: THRESHOLDS.maxRootElements },
      suggestion: `Consider simplifying slide \u2014 ${count} root elements exceeds guideline of ${THRESHOLDS.maxRootElements}`
    });
  }
  return findings;
}
function ruleContentUnderutilized(elements) {
  const findings = [];
  const roots = Object.values(elements).filter(
    (el2) => !el2._internal && el2.parentId == null && normLayer(el2) !== "bg"
  );
  const withBounds = roots.map((el2) => localBoundsOf(el2)).filter((b) => b != null && b.w > 0 && b.h > 0);
  if (withBounds.length === 0) return findings;
  const contentBounds = {
    x: Math.min(...withBounds.map((b) => b.x)),
    y: Math.min(...withBounds.map((b) => b.y)),
    w: 0,
    h: 0
  };
  contentBounds.w = Math.max(...withBounds.map((b) => b.x + b.w)) - contentBounds.x;
  contentBounds.h = Math.max(...withBounds.map((b) => b.y + b.h)) - contentBounds.y;
  const leftMargin = contentBounds.x - SAFE_ZONE.x;
  const rightMargin = SAFE_ZONE.x + SAFE_ZONE.w - (contentBounds.x + contentBounds.w);
  const topMargin = contentBounds.y - SAFE_ZONE.y;
  const bottomMargin = SAFE_ZONE.y + SAFE_ZONE.h - (contentBounds.y + contentBounds.h);
  const hThreshold = SAFE_ZONE.w * THRESHOLDS.marginRatioMax;
  const vThreshold = SAFE_ZONE.h * THRESHOLDS.marginRatioMax;
  const narrowH = leftMargin > hThreshold && rightMargin > hThreshold;
  const narrowV = topMargin > vThreshold && bottomMargin > vThreshold;
  if (!narrowH && !narrowV) return findings;
  const underutilized = narrowH && narrowV ? "both" : narrowH ? "horizontal" : "vertical";
  const margins = { left: leftMargin, right: rightMargin, top: topMargin, bottom: bottomMargin };
  let message, suggestion;
  if (underutilized === "both") {
    message = "Content is small \u2014 large margins on all sides";
    suggestion = "Enlarge content elements or reduce margins on all sides";
  } else if (underutilized === "horizontal") {
    message = "Content is narrow \u2014 consider using more horizontal space";
    suggestion = "Widen content elements or reduce horizontal margins";
  } else {
    message = "Content is short \u2014 consider using more vertical space";
    suggestion = "Increase content height or reduce vertical margins";
  }
  findings.push({
    rule: "content-underutilized",
    severity: "info",
    elementId: "slide",
    message,
    detail: { contentBounds, margins, underutilized, safeZone: SAFE_ZONE },
    suggestion
  });
  return findings;
}
function findSkTextElements(slideEl) {
  if (!slideEl) return [];
  return Array.from(slideEl.querySelectorAll('[data-sk-type="el"][data-sk-id]'));
}
function ruleTextOverflow(slideEl) {
  const findings = [];
  if (!slideEl) return findings;
  const els = slideEl.querySelectorAll('[data-sk-type="el"]');
  for (const el2 of els) {
    const overflowY = el2.scrollHeight > el2.clientHeight + 1;
    const overflowX = el2.scrollWidth > el2.clientWidth + 1;
    if (overflowY || overflowX) {
      findings.push({
        rule: "text-overflow",
        severity: "error",
        elementId: el2.getAttribute("data-sk-id"),
        message: `Element "${el2.getAttribute("data-sk-id")}" has content overflow`,
        detail: {
          scrollHeight: el2.scrollHeight,
          clientHeight: el2.clientHeight,
          scrollWidth: el2.scrollWidth,
          clientWidth: el2.clientWidth,
          overflowY,
          overflowX
        },
        suggestion: "Reduce content or increase element height/width"
      });
    }
  }
  return findings;
}
function ruleFontTooSmall(slideEl) {
  const findings = [];
  if (!slideEl) return findings;
  for (const el2 of findSkTextElements(slideEl)) {
    if (!el2.textContent || !el2.textContent.trim()) continue;
    const fontSize = parseFloat(getComputedStyle(el2).fontSize);
    if (fontSize < THRESHOLDS.minFontSize) {
      findings.push({
        rule: "font-too-small",
        severity: "warning",
        elementId: el2.getAttribute("data-sk-id"),
        message: `Font size ${fontSize}px is below minimum ${THRESHOLDS.minFontSize}px`,
        detail: { fontSize, threshold: THRESHOLDS.minFontSize },
        suggestion: `Increase font size to at least ${THRESHOLDS.minFontSize}px`
      });
    }
  }
  return findings;
}
function ruleFontTooLarge(slideEl) {
  const findings = [];
  if (!slideEl) return findings;
  for (const el2 of findSkTextElements(slideEl)) {
    if (!el2.textContent || !el2.textContent.trim()) continue;
    const fontSize = parseFloat(getComputedStyle(el2).fontSize);
    if (fontSize > THRESHOLDS.maxFontSize) {
      findings.push({
        rule: "font-too-large",
        severity: "info",
        elementId: el2.getAttribute("data-sk-id"),
        message: `Font size ${fontSize}px exceeds maximum ${THRESHOLDS.maxFontSize}px`,
        detail: { fontSize, threshold: THRESHOLDS.maxFontSize },
        suggestion: `Decrease font size to at most ${THRESHOLDS.maxFontSize}px`
      });
    }
  }
  return findings;
}
function ruleLineTooLong(slideEl) {
  const findings = [];
  if (!slideEl) return findings;
  for (const el2 of findSkTextElements(slideEl)) {
    if (!el2.textContent || !el2.textContent.trim()) continue;
    const fontSize = parseFloat(getComputedStyle(el2).fontSize);
    const elementWidth = el2.clientWidth;
    const estimatedCharsPerLine = elementWidth / (fontSize * 0.6);
    if (estimatedCharsPerLine > THRESHOLDS.maxLineLength) {
      findings.push({
        rule: "line-too-long",
        severity: "info",
        elementId: el2.getAttribute("data-sk-id"),
        message: `Estimated ${Math.round(estimatedCharsPerLine)} chars/line exceeds ${THRESHOLDS.maxLineLength}`,
        detail: { estimatedCharsPerLine: Math.round(estimatedCharsPerLine), threshold: THRESHOLDS.maxLineLength, elementWidth },
        suggestion: "Reduce element width or increase font size"
      });
    }
  }
  return findings;
}
function ruleLineHeightTight(slideEl) {
  const findings = [];
  if (!slideEl) return findings;
  for (const el2 of findSkTextElements(slideEl)) {
    if (!el2.textContent || !el2.textContent.trim()) continue;
    const style = getComputedStyle(el2);
    const lineHeight = style.lineHeight;
    if (lineHeight === "normal") continue;
    const fontSize = parseFloat(style.fontSize);
    const lhNum = parseFloat(lineHeight);
    const isPixels = lineHeight.endsWith("px");
    const lhPx = isPixels ? lhNum : lhNum * fontSize;
    const ratio = lhPx / fontSize;
    if (ratio < THRESHOLDS.minLineHeightRatio) {
      findings.push({
        rule: "line-height-tight",
        severity: "warning",
        elementId: el2.getAttribute("data-sk-id"),
        message: `Line-height ratio ${ratio.toFixed(2)} is below minimum ${THRESHOLDS.minLineHeightRatio}`,
        detail: { lineHeight, fontSize, ratio, threshold: THRESHOLDS.minLineHeightRatio },
        suggestion: `Increase line-height to at least ${(fontSize * THRESHOLDS.minLineHeightRatio).toFixed(0)}px`
      });
    }
  }
  return findings;
}
function parseColor(str) {
  if (!str || str === "transparent") return null;
  const m = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!m) return null;
  const a = m[4] !== void 0 ? parseFloat(m[4]) : 1;
  if (a < 0.1) return null;
  return { r: parseInt(m[1]) / 255, g: parseInt(m[2]) / 255, b: parseInt(m[3]) / 255 };
}
function relativeLuminance(c) {
  const sRGB = [c.r, c.g, c.b].map(
    (v) => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
}
function contrastRatio(c1, c2) {
  const l1 = relativeLuminance(c1);
  const l2 = relativeLuminance(c2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}
function ruleImageUpscaled(slideEl) {
  const findings = [];
  if (!slideEl) return findings;
  const imgs = slideEl.querySelectorAll("img");
  for (const img of imgs) {
    if (img.naturalWidth === 0) continue;
    const rw = img.clientWidth;
    const rh = img.clientHeight;
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    const scaleX = rw / nw;
    const scaleY = rh / nh;
    if (rw > nw * THRESHOLDS.imageUpscaleMax || rh > nh * THRESHOLDS.imageUpscaleMax) {
      const maxScale = Math.max(scaleX, scaleY);
      const pct = Math.round((maxScale - 1) * 100);
      const ancestor = img.closest("[data-sk-id]");
      findings.push({
        rule: "image-upscaled",
        severity: "warning",
        elementId: ancestor ? ancestor.getAttribute("data-sk-id") : null,
        message: `Image is upscaled ${pct}% beyond natural size`,
        detail: { renderedWidth: rw, renderedHeight: rh, naturalWidth: nw, naturalHeight: nh, scaleX, scaleY },
        suggestion: `Image is upscaled ${pct}% beyond natural size \u2014 use a higher resolution source`
      });
    }
  }
  return findings;
}
function ruleAspectRatioDistortion(slideEl) {
  const findings = [];
  if (!slideEl) return findings;
  const imgs = slideEl.querySelectorAll("img");
  for (const img of imgs) {
    if (img.naturalWidth === 0 || img.naturalHeight === 0) continue;
    const naturalRatio = img.naturalWidth / img.naturalHeight;
    const renderedRatio = img.clientWidth / img.clientHeight;
    const distortion = Math.abs(renderedRatio - naturalRatio) / naturalRatio;
    if (distortion > THRESHOLDS.aspectRatioTolerance) {
      const ancestor = img.closest("[data-sk-id]");
      findings.push({
        rule: "aspect-ratio-distortion",
        severity: "warning",
        elementId: ancestor ? ancestor.getAttribute("data-sk-id") : null,
        message: `Image aspect ratio distorted by ${(distortion * 100).toFixed(1)}%`,
        detail: { naturalRatio, renderedRatio, distortion },
        suggestion: "Image aspect ratio distorted \u2014 use object-fit: contain or adjust container"
      });
    }
  }
  return findings;
}
function ruleHeadingSizeInversion(slideEl) {
  const findings = [];
  if (!slideEl) return findings;
  const headings = slideEl.querySelectorAll("h1, h2, h3, h4, h5, h6");
  if (headings.length === 0) return findings;
  const levelSizes = /* @__PURE__ */ new Map();
  for (const h of headings) {
    const level = parseInt(h.tagName[1]);
    const fontSize = parseFloat(getComputedStyle(h).fontSize);
    if (!levelSizes.has(level) || fontSize > levelSizes.get(level)) {
      levelSizes.set(level, fontSize);
    }
  }
  const levels = Array.from(levelSizes.keys()).sort((a, b) => a - b);
  for (let i = 0; i < levels.length - 1; i++) {
    const higher = levels[i];
    const lower = levels[i + 1];
    const higherSize = levelSizes.get(higher);
    const lowerSize = levelSizes.get(lower);
    if (higherSize < lowerSize) {
      findings.push({
        rule: "heading-size-inversion",
        severity: "warning",
        elementId: null,
        message: `h${higher} (${higherSize}px) should be larger than h${lower} (${lowerSize}px)`,
        detail: { largerHeading: `h${higher}`, largerSize: higherSize, smallerHeading: `h${lower}`, smallerSize: lowerSize },
        suggestion: `h${higher} (${higherSize}px) should be larger than h${lower} (${lowerSize}px)`
      });
    }
  }
  return findings;
}
function ruleLowContrast(slideEl) {
  const findings = [];
  if (!slideEl) return findings;
  const els = slideEl.querySelectorAll("*");
  for (const el2 of els) {
    if (!el2.textContent || !el2.textContent.trim()) continue;
    if (el2.children.length > 0) {
      let hasDirectText = false;
      for (const node of el2.childNodes) {
        if (node.nodeType === 3 && node.textContent.trim()) {
          hasDirectText = true;
          break;
        }
      }
      if (!hasDirectText) continue;
    }
    const style = getComputedStyle(el2);
    const textColor = parseColor(style.color);
    if (!textColor) continue;
    let bgColor = null;
    let current = el2;
    while (current && current !== document.documentElement) {
      bgColor = parseColor(getComputedStyle(current).backgroundColor);
      if (bgColor) break;
      current = current.parentElement;
    }
    if (!bgColor) continue;
    const ratio = contrastRatio(textColor, bgColor);
    if (ratio < THRESHOLDS.contrastMin) {
      const ancestor = el2.closest("[data-sk-id]");
      findings.push({
        rule: "low-contrast",
        severity: "warning",
        elementId: ancestor ? ancestor.getAttribute("data-sk-id") : null,
        message: `Low contrast ratio ${ratio.toFixed(2)}:1 (minimum: ${THRESHOLDS.contrastMin}:1)`,
        detail: { textColor: style.color, bgColor: getComputedStyle(current).backgroundColor, contrastRatio: ratio, threshold: THRESHOLDS.contrastMin },
        suggestion: `Increase contrast between text and background (current: ${ratio.toFixed(2)}:1, minimum: ${THRESHOLDS.contrastMin}:1)`
      });
    }
  }
  return findings;
}
function ruleTitlePositionDrift(slides) {
  const findings = [];
  const positions = [];
  for (const slide of slides) {
    const elements = slide.layout?.elements;
    if (!elements) continue;
    for (const el2 of Object.values(elements)) {
      if (el2._internal) continue;
      if (!el2.id || !el2.id.toLowerCase().includes("title")) continue;
      const abs = absoluteBoundsOf(el2, elements);
      if (!abs) continue;
      positions.push({ slideId: slide.id, x: abs.x, y: abs.y });
    }
  }
  if (positions.length < 2) return findings;
  const xs = positions.map((p) => p.x);
  const ys = positions.map((p) => p.y);
  const driftX = Math.max(...xs) - Math.min(...xs);
  const driftY = Math.max(...ys) - Math.min(...ys);
  const maxDrift = Math.max(driftX, driftY);
  if (maxDrift > THRESHOLDS.titlePositionDrift) {
    findings.push({
      rule: "title-position-drift",
      severity: "info",
      elementId: null,
      message: `Title position varies by ${maxDrift}px across slides \u2014 standardize to consistent position`,
      detail: { positions, driftX, driftY },
      suggestion: `Title position varies by ${maxDrift}px across slides \u2014 standardize to consistent position`
    });
  }
  return findings;
}
function ruleFontCount(sections) {
  const findings = [];
  const families = /* @__PURE__ */ new Set();
  for (const section of sections) {
    if (!section) continue;
    const els = section.querySelectorAll('[data-sk-type="el"]');
    for (const el2 of els) {
      if (!el2.textContent || !el2.textContent.trim()) continue;
      const raw = getComputedStyle(el2).fontFamily;
      if (!raw) continue;
      const first = raw.split(",")[0].trim().toLowerCase().replace(/['"]/g, "");
      if (first) families.add(first);
    }
  }
  if (families.size > THRESHOLDS.maxFontFamilies) {
    findings.push({
      rule: "font-count",
      severity: "info",
      elementId: null,
      message: `Deck uses ${families.size} font families \u2014 consider limiting to ${THRESHOLDS.maxFontFamilies}`,
      detail: { families: Array.from(families), count: families.size, threshold: THRESHOLDS.maxFontFamilies },
      suggestion: `Deck uses ${families.size} font families \u2014 consider limiting to ${THRESHOLDS.maxFontFamilies}`
    });
  }
  return findings;
}
function ruleStyleDrift(sections, slides) {
  const findings = [];
  const bodyFontSizes = [];
  const headingFontSizes = [];
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    if (!section) continue;
    const slideId = slides[i]?.id ?? `slide-${i}`;
    const textEls = section.querySelectorAll('[data-sk-type="el"]');
    const sizeCounts = /* @__PURE__ */ new Map();
    for (const el2 of textEls) {
      if (!el2.textContent || !el2.textContent.trim()) continue;
      const size = Math.round(parseFloat(getComputedStyle(el2).fontSize));
      sizeCounts.set(size, (sizeCounts.get(size) || 0) + 1);
    }
    if (sizeCounts.size > 0) {
      let mostCommon = 0, bestCount = 0;
      for (const [size, count] of sizeCounts) {
        if (count > bestCount) {
          mostCommon = size;
          bestCount = count;
        }
      }
      bodyFontSizes.push({ slideId, size: mostCommon });
    }
    const headings = section.querySelectorAll("h1, h2, h3");
    const hSizeCounts = /* @__PURE__ */ new Map();
    for (const h of headings) {
      const size = Math.round(parseFloat(getComputedStyle(h).fontSize));
      hSizeCounts.set(size, (hSizeCounts.get(size) || 0) + 1);
    }
    if (hSizeCounts.size > 0) {
      let mostCommon = 0, bestCount = 0;
      for (const [size, count] of hSizeCounts) {
        if (count > bestCount) {
          mostCommon = size;
          bestCount = count;
        }
      }
      headingFontSizes.push({ slideId, size: mostCommon });
    }
  }
  if (bodyFontSizes.length >= 2) {
    const sizes = bodyFontSizes.map((e) => e.size);
    const min = Math.min(...sizes);
    const max = Math.max(...sizes);
    if (max - min > 4) {
      findings.push({
        rule: "style-drift",
        severity: "info",
        elementId: null,
        message: `Body text size varies from ${min}px to ${max}px across slides \u2014 standardize`,
        detail: { bodyFontSizes, headingFontSizes },
        suggestion: `Body text size varies from ${min}px to ${max}px across slides \u2014 standardize`
      });
    }
  }
  if (headingFontSizes.length >= 2) {
    const sizes = headingFontSizes.map((e) => e.size);
    const min = Math.min(...sizes);
    const max = Math.max(...sizes);
    if (max - min > 4) {
      findings.push({
        rule: "style-drift",
        severity: "info",
        elementId: null,
        message: `Heading size varies from ${min}px to ${max}px across slides \u2014 standardize`,
        detail: { bodyFontSizes, headingFontSizes },
        suggestion: `Heading size varies from ${min}px to ${max}px across slides \u2014 standardize`
      });
    }
  }
  return findings;
}
function ruleMisplacedCssProp(elements) {
  const findings = [];
  for (const el2 of Object.values(elements)) {
    if (el2._internal) continue;
    const props = el2.authored?.props;
    if (!props) continue;
    const id = el2.id;
    for (const key of Object.keys(props)) {
      if (key === "style") continue;
      if (CSS_LIKE_PROPS.has(key)) {
        findings.push({
          rule: "misplaced-css-prop",
          severity: "warning",
          elementId: id,
          message: `Element "${id}" has CSS property "${key}" at top level. Move it to style: { ${key}: ... }`,
          detail: { property: key },
          suggestion: `Move "${key}" into the style object: style: { ${key}: ... }`
        });
      }
    }
  }
  return findings;
}
function ruleTextAlignDirectionMismatch(elements) {
  const findings = [];
  for (const el2 of Object.values(elements)) {
    if (el2._internal) continue;
    const prov = el2.provenance;
    if (!prov?.x || prov.x.source !== "constraint" || prov.x.type !== "leftOf") continue;
    const props = el2.authored?.props;
    const style = props?.style ?? {};
    const textAlign = style.textAlign ?? "left";
    if (textAlign !== "right") {
      findings.push({
        rule: "textAlign-direction-mismatch",
        severity: "warning",
        elementId: el2.id,
        message: `Element "${el2.id}" uses leftOf() positioning but textAlign is '${textAlign}' (should be 'right' for visual alignment)`,
        detail: { textAlign, provenanceType: "leftOf" },
        suggestion: `Add style: { textAlign: 'right' } to align text near the reference element`
      });
    }
  }
  return findings;
}
function ruleEqualHeightPeers(elements) {
  const findings = [];
  for (const el2 of Object.values(elements)) {
    if (el2.type !== "hstack" || el2._internal) continue;
    const childIds = el2.children;
    if (!childIds || childIds.length < 2) continue;
    const heights = [];
    for (const cid of childIds) {
      const child = elements[cid];
      if (!child?.resolved) continue;
      heights.push({ id: cid, h: child.resolved.h });
    }
    if (heights.length < 2) continue;
    const sorted = heights.map((c) => c.h).sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    if (median === 0) continue;
    for (const child of heights) {
      const pct = Math.round(Math.abs(child.h - median) / median * 100);
      if (pct > 5) {
        findings.push({
          rule: "equal-height-peers",
          severity: "warning",
          elementId: child.id,
          message: `Element "${child.id}" height (${child.h}px) deviates ${pct}% from median (${median}px) in hstack "${el2.id}"`,
          detail: { childId: child.id, height: child.h, median, pct, stackId: el2.id },
          suggestion: `Use hstack({ align: 'stretch' }) to equalize heights, or set explicit heights`
        });
      }
    }
  }
  return findings;
}
function getFontSize(el2) {
  const props = el2.authored?.props;
  const style = props?.style;
  if (style?.fontSize) {
    const raw = style.fontSize;
    if (typeof raw === "number") return raw;
    if (typeof raw === "string") {
      const parsed = parseFloat(raw);
      if (!isNaN(parsed)) return parsed;
    }
  }
  return 24;
}
function isMultiLine(el2) {
  const b = localBoundsOf(el2);
  if (!b) return false;
  const fontSize = getFontSize(el2);
  return b.h > fontSize * 1.8;
}
function ruleMinVerticalGap(elements) {
  const findings = [];
  for (const siblings of siblingGroups(elements).values()) {
    const textEls = siblings.filter((el2) => el2.type === "el");
    if (textEls.length < 2) continue;
    const sorted = [...textEls].sort((a, b) => {
      const ba = localBoundsOf(a);
      const bb = localBoundsOf(b);
      return (ba?.y ?? 0) - (bb?.y ?? 0);
    });
    for (let i = 0; i < sorted.length - 1; i++) {
      const elA = sorted[i];
      const elB = sorted[i + 1];
      const bA = localBoundsOf(elA);
      const bB = localBoundsOf(elB);
      if (!bA || !bB) continue;
      const overlapX = bA.x < bB.x + bB.w && bA.x + bA.w > bB.x;
      if (!overlapX) continue;
      const gap = bB.y - (bA.y + bA.h);
      if (gap <= 0) continue;
      const fontSizeA = getFontSize(elA);
      const fontSizeB = getFontSize(elB);
      const smallerFont = Math.min(fontSizeA, fontSizeB);
      const multiplier = isMultiLine(elA) ? 2 : 1.5;
      const minGap = Math.round(smallerFont * multiplier);
      if (gap < minGap) {
        const aId = elA.id;
        const bId = elB.id;
        findings.push({
          rule: "min-vertical-gap",
          severity: "warning",
          elementId: elA.id,
          message: `Gap between "${aId}" and "${bId}" is ${gap}px (minimum recommended: ${minGap}px based on font sizes)`,
          detail: { elementA: aId, elementB: bId, gap, minGap, fontSizeA, fontSizeB, multiplier },
          bounds: bA,
          parentBounds: null,
          suggestion: `Increase gap to at least ${minGap}px`
        });
      }
    }
  }
  return findings;
}
function ruleHorizontalCenterConsistency(elements) {
  const findings = [];
  const SLIDE_CENTER = 960;
  const CENTER_TOLERANCE = 20;
  const WARN_DEVIATION = 50;
  const ERROR_DEVIATION = 100;
  const candidates = Object.values(elements).filter(
    (el2) => !el2._internal && el2.parentId == null && normLayer(el2) !== "bg" && normLayer(el2) !== "overlay" && el2.type !== "connector"
  );
  if (candidates.length < 2) return findings;
  const withBounds = candidates.map((el2) => ({
    el: el2,
    bounds: localBoundsOf(el2)
  })).filter((e) => e.bounds != null && e.bounds.w > 0);
  if (withBounds.length < 2) return findings;
  const centeredCount = withBounds.filter(({ bounds }) => {
    const centerX = bounds.x + bounds.w / 2;
    return Math.abs(centerX - SLIDE_CENTER) < CENTER_TOLERANCE;
  }).length;
  const centeredRatio = centeredCount / withBounds.length;
  if (centeredRatio <= 0.6) return findings;
  for (const { el: el2, bounds } of withBounds) {
    const centerX = Math.round(bounds.x + bounds.w / 2);
    const offset = Math.abs(centerX - SLIDE_CENTER);
    if (offset > WARN_DEVIATION) {
      const id = el2.id;
      findings.push({
        rule: "horizontal-center-consistency",
        severity: offset > ERROR_DEVIATION ? "error" : "warning",
        elementId: id,
        message: `Element "${id}" center (${centerX}) is ${offset}px from slide center (960) on a centered-layout slide`,
        detail: { elementId: id, centerX, offset, centeredRatio },
        bounds,
        parentBounds: null,
        suggestion: `Use anchor: 'tc' at x: 960, or wrap in a centered group`
      });
    }
  }
  return findings;
}
function ruleUnbalancedTrailingWhitespace(elements) {
  const findings = [];
  const SAFE_BOTTOM = 990;
  const SUGGESTION_RATIO = 3;
  const WARNING_RATIO = 5;
  const candidates = Object.values(elements).filter(
    (el2) => !el2._internal && el2.parentId == null && normLayer(el2) !== "bg" && normLayer(el2) !== "overlay" && el2.type !== "connector"
  );
  const withBounds = candidates.map((el2) => ({
    el: el2,
    bounds: localBoundsOf(el2)
  })).filter((e) => e.bounds != null && e.bounds.w > 0 && e.bounds.h > 0);
  withBounds.sort((a, b) => a.bounds.y - b.bounds.y);
  for (let i = 0; i < withBounds.length; i++) {
    const { el: el2, bounds } = withBounds[i];
    let aboveBounds = null;
    for (let j = i - 1; j >= 0; j--) {
      const candidate = withBounds[j].bounds;
      if (candidate.y + candidate.h <= bounds.y) {
        aboveBounds = candidate;
        break;
      }
    }
    if (!aboveBounds) continue;
    const gapAbove = bounds.y - (aboveBounds.y + aboveBounds.h);
    const spaceBelow = SAFE_BOTTOM - (bounds.y + bounds.h);
    if (spaceBelow <= 0 || gapAbove <= 0) continue;
    const ratio = spaceBelow / gapAbove;
    if (ratio > SUGGESTION_RATIO) {
      const id = el2.id;
      const optimalGap = Math.round((gapAbove + spaceBelow) * 0.35);
      findings.push({
        rule: "unbalanced-trailing-whitespace",
        severity: ratio > WARNING_RATIO ? "warning" : "info",
        elementId: id,
        message: `Element "${id}" has ${spaceBelow}px below vs ${gapAbove}px above (ratio: ${ratio.toFixed(1)}\xD7). Consider increasing gap for balance.`,
        detail: { elementId: id, gapAbove, spaceBelow, ratio, optimalGap },
        bounds,
        parentBounds: null,
        suggestion: `Increase gap above to ~${optimalGap}px for better vertical balance`
      });
    }
  }
  return findings;
}
function lintSlide(slideData, slideElement = null) {
  const elements = slideData.layout.elements;
  if (!elements || typeof elements !== "object") return [];
  const findings = [
    ...ruleChildOverflow(elements),
    ...ruleNonAncestorOverlap(elements),
    ...ruleCanvasOverflow(elements),
    ...ruleSafeZoneViolation(elements),
    ...ruleZeroSize(elements),
    // Spacing & alignment
    ...ruleGapTooSmall(elements),
    ...ruleNearMisalignment(elements),
    ...ruleEdgeCrowding(elements),
    // Content distribution
    ...ruleContentClustering(elements),
    ...ruleLopsidedLayout(elements),
    ...ruleTooManyElements(elements),
    ...ruleContentUnderutilized(elements),
    // Authoring quality
    ...ruleMisplacedCssProp(elements),
    ...ruleTextAlignDirectionMismatch(elements),
    ...ruleEqualHeightPeers(elements),
    // Layout quality
    ...ruleMinVerticalGap(elements),
    ...ruleHorizontalCenterConsistency(elements),
    ...ruleUnbalancedTrailingWhitespace(elements)
  ];
  if (slideElement) {
    findings.push(
      ...ruleTextOverflow(slideElement),
      ...ruleFontTooSmall(slideElement),
      ...ruleFontTooLarge(slideElement),
      ...ruleLineTooLong(slideElement),
      ...ruleLineHeightTight(slideElement),
      ...ruleImageUpscaled(slideElement),
      ...ruleAspectRatioDistortion(slideElement),
      ...ruleHeadingSizeInversion(slideElement),
      ...ruleLowContrast(slideElement)
    );
  }
  return findings;
}
function lintDeck(skData, sections = null) {
  const slides = skData?.slides;
  if (!Array.isArray(slides)) return [];
  const findings = [];
  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    const slideEl = sections ? sections[i] || null : null;
    const slideFindings = lintSlide(slide, slideEl);
    for (const f of slideFindings) {
      findings.push({ ...f, slideId: slide.id });
    }
  }
  findings.push(
    ...ruleTitlePositionDrift(slides)
  );
  if (sections) {
    findings.push(
      ...ruleFontCount(sections),
      ...ruleStyleDrift(sections, slides)
    );
  }
  return findings;
}

// slidekit/src/connectorRouting.ts
var DEFAULT_STUB_LENGTH = 30;
var DEFAULT_CLEARANCE = 15;
function routeConnector(options) {
  const {
    from,
    to,
    obstacles = [],
    stubLength = DEFAULT_STUB_LENGTH,
    clearance = DEFAULT_CLEARANCE
  } = options;
  const fromPt = { x: from.x, y: from.y };
  const toPt = { x: to.x, y: to.y };
  const fromStub = computeStubEnd(from, stubLength);
  const toStub = computeStubEnd(to, stubLength);
  const fromDir = normalizeDirection(from.dx, from.dy);
  const toDir = normalizeDirection(to.dx, to.dy);
  const fromSegments = buildStubSegments(fromPt, fromStub, from.dx, from.dy);
  const toSegments = buildStubSegments(toPt, toStub, to.dx, to.dy);
  const p1 = fromSegments[fromSegments.length - 1];
  const q1 = toSegments[toSegments.length - 1];
  const middle = findBestRoute(p1, fromDir, q1, toDir, obstacles, clearance);
  const toSegmentsReversed = [...toSegments].reverse();
  const waypoints = deduplicatePoints([
    fromPt,
    ...fromSegments,
    ...middle,
    ...toSegmentsReversed,
    toPt
  ]);
  return { waypoints };
}
function computeStubEnd(anchor, stubLength) {
  return {
    x: anchor.x + anchor.dx * stubLength,
    y: anchor.y + anchor.dy * stubLength
  };
}
function normalizeDirection(dx, dy) {
  if (dx !== 0 && dy !== 0) {
    return Math.abs(dx) >= Math.abs(dy) ? { dx: Math.sign(dx), dy: 0 } : { dx: 0, dy: Math.sign(dy) };
  }
  if (dx !== 0) return { dx: Math.sign(dx), dy: 0 };
  if (dy !== 0) return { dx: 0, dy: Math.sign(dy) };
  return { dx: 1, dy: 0 };
}
function buildStubSegments(origin, stubEnd, dx, dy) {
  const isDiagonal = dx !== 0 && dy !== 0;
  if (!isDiagonal) {
    return [stubEnd];
  }
  const midPoint = { x: stubEnd.x, y: origin.y };
  return [midPoint, stubEnd];
}
function segmentIntersectsRect(p1, p2, rect, clearance) {
  const left = rect.x - clearance;
  const right = rect.x + rect.w + clearance;
  const top = rect.y - clearance;
  const bottom = rect.y + rect.h + clearance;
  const minX = Math.min(p1.x, p2.x);
  const maxX = Math.max(p1.x, p2.x);
  const minY = Math.min(p1.y, p2.y);
  const maxY = Math.max(p1.y, p2.y);
  const isHorizontal = Math.abs(p1.y - p2.y) < 0.5;
  const isVertical = Math.abs(p1.x - p2.x) < 0.5;
  if (isHorizontal) {
    return p1.y > top && p1.y < bottom && maxX > left && minX < right;
  }
  if (isVertical) {
    return p1.x > left && p1.x < right && maxY > top && minY < bottom;
  }
  return maxX > left && minX < right && maxY > top && minY < bottom;
}
function polylineIntersectsObstacles(points, obstacles, clearance) {
  for (let i = 0; i < points.length - 1; i++) {
    for (const obs of obstacles) {
      if (segmentIntersectsRect(points[i], points[i + 1], obs, clearance)) {
        return true;
      }
    }
  }
  return false;
}
function findBestRoute(p1, d1, q1, d2, obstacles, clearance) {
  const candidates = [];
  const caseType = classifyCase(p1, d1, q1, d2);
  if (caseType === "backward" || caseType === "same-direction") {
    const uCandidates = computeAllChannelRoutes(p1, d1, q1, d2, obstacles, clearance);
    candidates.push(...uCandidates);
  } else {
    candidates.push([]);
    candidates.push([{ x: q1.x, y: p1.y }]);
    candidates.push([{ x: p1.x, y: q1.y }]);
    const midX = (p1.x + q1.x) / 2;
    const midY = (p1.y + q1.y) / 2;
    candidates.push([
      { x: midX, y: p1.y },
      { x: midX, y: q1.y }
    ]);
    candidates.push([
      { x: p1.x, y: midY },
      { x: q1.x, y: midY }
    ]);
  }
  let bestRoute = [];
  let bestDist = Infinity;
  for (const middle of candidates) {
    const full = [p1, ...middle, q1];
    const dist = manhattanLength(full);
    if (dist < bestDist) {
      if (!polylineIntersectsObstacles(full, obstacles, clearance)) {
        bestDist = dist;
        bestRoute = middle;
      }
    }
  }
  if (bestDist === Infinity) {
    const fallbackRoutes = computeAllChannelRoutes(p1, d1, q1, d2, obstacles, clearance);
    for (const route of fallbackRoutes) {
      const full = [p1, ...route, q1];
      const dist = manhattanLength(full);
      if (dist < bestDist && !polylineIntersectsObstacles(full, obstacles, clearance)) {
        bestDist = dist;
        bestRoute = route;
      }
    }
  }
  if (bestDist === Infinity) {
    bestRoute = routeAroundAll(p1, q1, obstacles, clearance);
  }
  return bestRoute;
}
function classifyCase(p1, d1, q1, d2) {
  const dot = d1.dx * d2.dx + d1.dy * d2.dy;
  const toTargetX = Math.sign(q1.x - p1.x);
  const toTargetY = Math.sign(q1.y - p1.y);
  let facingTarget;
  if (toTargetX === 0 && toTargetY === 0) {
    facingTarget = dot < 0;
  } else {
    facingTarget = toTargetX !== 0 && d1.dx === toTargetX || toTargetY !== 0 && d1.dy === toTargetY;
  }
  if (dot < 0 && facingTarget) {
    return "direct";
  }
  if (dot === 0) {
    return "perpendicular";
  }
  if (dot > 0) {
    return "same-direction";
  }
  return "backward";
}
function computeAllChannelRoutes(p1, d1, q1, _d2, obstacles, clearance) {
  let minX = Math.min(p1.x, q1.x);
  let minY = Math.min(p1.y, q1.y);
  let maxX = Math.max(p1.x, q1.x);
  let maxY = Math.max(p1.y, q1.y);
  for (const obs of obstacles) {
    minX = Math.min(minX, obs.x);
    minY = Math.min(minY, obs.y);
    maxX = Math.max(maxX, obs.x + obs.w);
    maxY = Math.max(maxY, obs.y + obs.h);
  }
  const routes = [];
  const spanX = maxX - minX;
  const spanY = maxY - minY;
  const offsetY = Math.max(60, spanY * 0.3, clearance);
  const offsetX = Math.max(60, spanX * 0.3, clearance);
  const topY = minY - offsetY;
  routes.push(buildChannelRoute(p1, q1, d1, "y", topY));
  const bottomY = maxY + offsetY;
  routes.push(buildChannelRoute(p1, q1, d1, "y", bottomY));
  const leftX = minX - offsetX;
  routes.push(buildChannelRoute(p1, q1, d1, "x", leftX));
  const rightX = maxX + offsetX;
  routes.push(buildChannelRoute(p1, q1, d1, "x", rightX));
  return routes;
}
function buildChannelRoute(p1, q1, _d1, channelAxis, channelValue) {
  if (channelAxis === "y") {
    return [
      { x: p1.x, y: channelValue },
      { x: q1.x, y: channelValue }
    ];
  }
  return [
    { x: channelValue, y: p1.y },
    { x: channelValue, y: q1.y }
  ];
}
function routeAroundAll(p1, q1, obstacles, clearance) {
  if (obstacles.length === 0) {
    return [{ x: q1.x, y: p1.y }];
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const obs of obstacles) {
    minX = Math.min(minX, obs.x);
    minY = Math.min(minY, obs.y);
    maxX = Math.max(maxX, obs.x + obs.w);
    maxY = Math.max(maxY, obs.y + obs.h);
  }
  minX -= clearance;
  minY -= clearance;
  maxX += clearance;
  maxY += clearance;
  const candidates = [
    // Top route
    [{ x: p1.x, y: minY }, { x: q1.x, y: minY }],
    // Bottom route
    [{ x: p1.x, y: maxY }, { x: q1.x, y: maxY }],
    // Left route
    [{ x: minX, y: p1.y }, { x: minX, y: q1.y }],
    // Right route
    [{ x: maxX, y: p1.y }, { x: maxX, y: q1.y }]
  ];
  let best = candidates[0];
  let bestDist = Infinity;
  for (const route of candidates) {
    const full = [p1, ...route, q1];
    const dist = manhattanLength(full);
    if (dist < bestDist) {
      bestDist = dist;
      best = route;
    }
  }
  return best;
}
function manhattanLength(points) {
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    total += Math.abs(points[i + 1].x - points[i].x) + Math.abs(points[i + 1].y - points[i].y);
  }
  return total;
}
function deduplicatePoints(points) {
  if (points.length === 0) return [];
  const result = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const prev = result[result.length - 1];
    if (Math.abs(points[i].x - prev.x) > 0.5 || Math.abs(points[i].y - prev.y) > 0.5) {
      result.push(points[i]);
    }
  }
  return result;
}

// slidekit/src/renderer.ts
var _layoutFn;
function _setLayoutFn(fn) {
  _layoutFn = fn;
}
var LAYER_ORDER = { bg: 0, content: 1, overlay: 2 };
function computeZOrder(elements) {
  const indexed = elements.map((el2, i) => ({ el: el2, idx: i }));
  indexed.sort((a, b) => {
    const layerKeyA = a.el.props.layer || "content";
    const layerKeyB = b.el.props.layer || "content";
    const layerA = LAYER_ORDER[layerKeyA] ?? LAYER_ORDER.content;
    const layerB = LAYER_ORDER[layerKeyB] ?? LAYER_ORDER.content;
    if (layerA !== layerB) return layerA - layerB;
    const zA = a.el.props.z ?? 0;
    const zB = b.el.props.z ?? 0;
    if (zA !== zB) return zA - zB;
    return a.idx - b.idx;
  });
  const zMap = /* @__PURE__ */ new Map();
  indexed.forEach((item, sortedIdx) => {
    zMap.set(item.el.id, sortedIdx + 1);
  });
  return zMap;
}
function applySlideBackground(section, background) {
  if (!background) return;
  const trimmed = background.trim();
  if (trimmed.startsWith("#") || /^(rgb|hsl)a?\(/.test(trimmed)) {
    section.setAttribute("data-background-color", trimmed);
  } else if (trimmed.startsWith("linear-gradient") || trimmed.startsWith("radial-gradient")) {
    section.setAttribute("data-background-gradient", trimmed);
  } else {
    section.setAttribute("data-background-image", trimmed);
  }
}
function buildConnectorSVG(from, to, connProps) {
  const thickness = connProps.thickness ?? 2;
  const markerSize = 8;
  const padding = Math.max(20, markerSize + thickness * 2);
  const connType = connProps.connectorType || "straight";
  let minX = Math.min(from.x, to.x) - padding;
  let minY = Math.min(from.y, to.y) - padding;
  let maxX = Math.max(from.x, to.x) + padding;
  let maxY = Math.max(from.y, to.y) + padding;
  let elbowWaypoints = null;
  if (connType === "elbow") {
    if (connProps._cachedWaypoints) {
      elbowWaypoints = connProps._cachedWaypoints;
    } else {
      const route = routeConnector({ from, to });
      elbowWaypoints = route.waypoints;
    }
    for (const wp of elbowWaypoints) {
      if (wp.x < minX) minX = wp.x;
      if (wp.y < minY) minY = wp.y;
      if (wp.x > maxX) maxX = wp.x;
      if (wp.y > maxY) maxY = wp.y;
    }
  }
  let cpOffset = 0;
  if (connType === "curved") {
    const dist = Math.sqrt((to.x - from.x) ** 2 + (to.y - from.y) ** 2);
    cpOffset = Math.min(200, Math.max(40, dist * 0.4));
    const cx1 = from.x + from.dx * cpOffset;
    const cy1 = from.y + from.dy * cpOffset;
    const cx2 = to.x + to.dx * cpOffset;
    const cy2 = to.y + to.dy * cpOffset;
    minX = Math.min(minX, cx1, cx2);
    minY = Math.min(minY, cy1, cy2);
    maxX = Math.max(maxX, cx1, cx2);
    maxY = Math.max(maxY, cy1, cy2);
  }
  const svgW = maxX - minX;
  const svgH = maxY - minY;
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
  const dash = connProps.dash;
  const arrow = connProps.arrow || "end";
  const defs = document.createElementNS(ns, "defs");
  const markerId = `sk-arrow-${connProps._markerId || "default"}`;
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
      const cx1 = lx1 + from.dx * cpOffset;
      const cy1 = ly1 + from.dy * cpOffset;
      const cx2 = lx2 + to.dx * cpOffset;
      const cy2 = ly2 + to.dy * cpOffset;
      d = `M ${lx1} ${ly1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${lx2} ${ly2}`;
    } else if (connType === "elbow") {
      const waypoints = elbowWaypoints;
      const localWaypoints = waypoints.map((p) => ({
        x: p.x - minX,
        y: p.y - minY
      }));
      if (localWaypoints.length >= 2) {
        const cornerRadius = connProps.cornerRadius ?? 0;
        if (cornerRadius > 0 && localWaypoints.length >= 3) {
          d = buildRoundedElbowPath(localWaypoints, cornerRadius);
        } else {
          d = `M ${localWaypoints[0].x} ${localWaypoints[0].y}`;
          for (let i = 1; i < localWaypoints.length; i++) {
            d += ` L ${localWaypoints[i].x} ${localWaypoints[i].y}`;
          }
        }
      } else {
        d = `M ${lx1} ${ly1} L ${lx2} ${ly2}`;
      }
    }
    pathEl.setAttribute("d", d);
    pathEl.setAttribute("fill", "none");
  }
  pathEl.setAttribute("stroke", color);
  pathEl.setAttribute("stroke-width", String(thickness));
  if (dash) {
    pathEl.setAttribute("stroke-dasharray", dash);
  }
  if (arrow === "end" || arrow === "both") {
    pathEl.setAttribute("marker-end", `url(#${markerId})`);
  }
  if (arrow === "start" || arrow === "both") {
    pathEl.setAttribute("marker-start", `url(#${markerId})`);
  }
  svg.appendChild(pathEl);
  if (connProps.label) {
    const labelStyle = connProps.labelStyle || {};
    const labelSize = labelStyle.size ?? labelStyle.fontSize ?? 14;
    const labelColor = labelStyle.color ?? "#999999";
    const labelFont = labelStyle.font || labelStyle.fontFamily || "Inter";
    const labelWeight = labelStyle.weight ?? labelStyle.fontWeight ?? 400;
    const labelPosition = connProps.labelPosition ?? 0.5;
    const labelOffsetX = connProps.labelOffset?.x ?? 0;
    const labelOffsetY = connProps.labelOffset?.y ?? -8;
    let midLX, midLY;
    if (connType === "elbow" && elbowWaypoints && elbowWaypoints.length >= 2) {
      const localWaypoints = elbowWaypoints.map((p) => ({ x: p.x - minX, y: p.y - minY }));
      const pt = pointAlongPolyline(localWaypoints, labelPosition);
      midLX = pt.x;
      midLY = pt.y;
    } else {
      midLX = lx1 + (lx2 - lx1) * labelPosition;
      midLY = ly1 + (ly2 - ly1) * labelPosition;
    }
    const textNode = document.createElementNS(ns, "text");
    textNode.setAttribute("x", String(midLX + labelOffsetX));
    textNode.setAttribute("y", String(midLY + labelOffsetY));
    textNode.setAttribute("text-anchor", "middle");
    textNode.setAttribute("font-family", `"${labelFont}", sans-serif`);
    textNode.setAttribute("font-size", String(labelSize));
    textNode.setAttribute("font-weight", String(labelWeight));
    textNode.setAttribute("fill", labelColor);
    textNode.textContent = connProps.label;
    svg.appendChild(textNode);
  }
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
function pointAlongPolyline(points, t) {
  if (points.length < 2) return points[0] || { x: 0, y: 0 };
  const segLengths = [];
  let totalLength = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const dx = points[i + 1].x - points[i].x;
    const dy = points[i + 1].y - points[i].y;
    const len = Math.sqrt(dx * dx + dy * dy);
    segLengths.push(len);
    totalLength += len;
  }
  if (totalLength === 0) return points[0];
  const targetLength = t * totalLength;
  let accumulated = 0;
  for (let i = 0; i < segLengths.length; i++) {
    if (accumulated + segLengths[i] >= targetLength) {
      const segFraction = segLengths[i] > 0 ? (targetLength - accumulated) / segLengths[i] : 0;
      return {
        x: points[i].x + (points[i + 1].x - points[i].x) * segFraction,
        y: points[i].y + (points[i + 1].y - points[i].y) * segFraction
      };
    }
    accumulated += segLengths[i];
  }
  return points[points.length - 1];
}
function buildRoundedElbowPath(points, radius) {
  if (points.length < 2) return "";
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];
    const len1 = Math.sqrt((curr.x - prev.x) ** 2 + (curr.y - prev.y) ** 2);
    const len2 = Math.sqrt((next.x - curr.x) ** 2 + (next.y - curr.y) ** 2);
    const rEff = Math.min(radius, len1 / 2, len2 / 2);
    if (rEff < 1) {
      d += ` L ${curr.x} ${curr.y}`;
      continue;
    }
    const ux1 = (curr.x - prev.x) / len1;
    const uy1 = (curr.y - prev.y) / len1;
    const ux2 = (next.x - curr.x) / len2;
    const uy2 = (next.y - curr.y) / len2;
    const enterX = curr.x - ux1 * rEff;
    const enterY = curr.y - uy1 * rEff;
    const exitX = curr.x + ux2 * rEff;
    const exitY = curr.y + uy2 * rEff;
    const cross = ux1 * uy2 - uy1 * ux2;
    const sweep = cross > 0 ? 1 : 0;
    d += ` L ${enterX} ${enterY}`;
    d += ` A ${rEff} ${rEff} 0 0 ${sweep} ${exitX} ${exitY}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}
function renderElementFromScene(element, zIndex, sceneElements, offsetX = 0, offsetY = 0) {
  const { type } = element;
  let { props } = element;
  const resolved = sceneElements[element.id]?.resolved;
  let left, top, w, h;
  if (resolved) {
    left = resolved.x - offsetX;
    top = resolved.y - offsetY;
    w = resolved.w;
    h = resolved.h;
  } else {
    w = props.w || 0;
    h = props.h || 0;
    const anchor = props.anchor || "tl";
    const anchorResult = resolveAnchor(props.x ?? 0, props.y ?? 0, w, h, anchor);
    left = anchorResult.left;
    top = anchorResult.top;
  }
  const { cssProps, warnings: cssWarnings } = detectMisplacedCssProps(props);
  if (Object.keys(cssProps).length > 0) {
    const promotedStyle = { ...cssProps, ...props.style || {} };
    props = { ...props, style: promotedStyle };
    for (const warn of cssWarnings) {
      console.warn(`[SlideKit] Element "${element.id}": ${warn.message}`);
    }
  }
  const { filtered: mergedStyle, warnings: styleWarnings } = filterStyle(props.style || {}, type);
  const allWarnings = [...cssWarnings, ...styleWarnings];
  if (allWarnings.length > 0) {
    for (const warn of styleWarnings) {
      console.warn(`[SlideKit] Element "${element.id}": style.${warn.property} is blocked. ${warn.suggestion}`);
    }
    const sceneEntry = sceneElements[element.id];
    if (sceneEntry) {
      sceneEntry.styleWarnings = allWarnings;
    }
  }
  const div = document.createElement("div");
  div.setAttribute("data-sk-id", element.id);
  div.style.position = "absolute";
  div.style.left = `${left}px`;
  div.style.top = `${top}px`;
  div.style.width = `${w}px`;
  div.style.height = `${h}px`;
  div.style.boxSizing = "border-box";
  div.style.zIndex = String(zIndex);
  if (props.opacity !== void 0 && props.opacity !== 1) {
    div.style.opacity = String(props.opacity);
  }
  if (props.rotate !== void 0 && props.rotate !== 0) {
    div.style.transform = `rotate(${props.rotate}deg)`;
  }
  if (props.className) {
    div.className = props.className;
  }
  applyStyleToDOM(div, mergedStyle);
  const layoutFlags = sceneElements[element.id]?._layoutFlags;
  if (layoutFlags?.clip) {
    div.style.overflow = "hidden";
  }
  switch (type) {
    case "el": {
      div.setAttribute("data-sk-type", "el");
      const valign = props.valign;
      if (valign && valign !== "top" && props.h != null) {
        div.style.display = "flex";
        div.style.flexDirection = "column";
        div.style.justifyContent = valign === "center" ? "center" : valign === "bottom" ? "flex-end" : "flex-start";
      }
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
      div.style.overflow = "visible";
      const stackChildElems = element.children || [];
      const childZMap = computeZOrder(stackChildElems);
      for (const child of stackChildElems) {
        const childResolved = sceneElements[child.id]?.resolved;
        if (childResolved) {
          const childZ = childZMap.get(child.id) || 0;
          const childEl = renderElementFromScene(
            child,
            childZ,
            sceneElements,
            left + offsetX,
            top + offsetY
          );
          div.appendChild(childEl);
        }
      }
      break;
    }
    case "connector": {
      const connectorData = sceneElements[element.id]?._connectorResolved;
      if (connectorData) {
        const svgWrapper = buildConnectorSVG(
          connectorData.from,
          connectorData.to,
          {
            ...props,
            _markerId: element.id,
            _cachedWaypoints: connectorData.waypoints
          }
        );
        svgWrapper.setAttribute("data-sk-id", element.id);
        svgWrapper.style.zIndex = String(zIndex);
        if (props.opacity !== void 0 && props.opacity !== 1) {
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
async function render(slides, options = {}) {
  resetIdCounter();
  const container = options.container || document.querySelector(".reveal .slides");
  if (!container) {
    throw new Error(
      "render() requires a container element. Provide options.container or ensure a .reveal .slides element exists in the DOM."
    );
  }
  const sections = [];
  const layouts = [];
  if (!container.querySelector("style[data-sk-baseline]")) {
    const baselineStyle = document.createElement("style");
    baselineStyle.setAttribute("data-sk-baseline", "");
    baselineStyle.textContent = _baselineCSS('[data-sk-type="el"]');
    container.appendChild(baselineStyle);
  }
  const cfg = getConfig();
  const slideW = cfg?.slide?.w ?? 1920;
  const slideH = cfg?.slide?.h ?? 1080;
  for (const slide of slides) {
    const layoutResult = await _layoutFn(slide);
    layouts.push(layoutResult);
    const section = document.createElement("section");
    if (slide.id) {
      section.id = slide.id;
    }
    if (slide.background) {
      applySlideBackground(section, slide.background);
    }
    const layer = document.createElement("div");
    layer.className = "slidekit-layer";
    layer.style.position = "relative";
    layer.style.width = `${slideW}px`;
    layer.style.height = `${slideH}px`;
    const elements = slide.elements || [];
    const zMap = computeZOrder(elements);
    for (const element of elements) {
      const zIndex = zMap.get(element.id) || 0;
      const domEl = renderElementFromScene(element, zIndex, layoutResult.elements);
      layer.appendChild(domEl);
    }
    section.appendChild(layer);
    if (slide.notes) {
      const aside = document.createElement("aside");
      aside.className = "notes";
      aside.textContent = slide.notes;
      section.appendChild(aside);
    }
    container.appendChild(section);
    sections.push(section);
  }
  for (let i = 0; i < layouts.length; i++) {
    const layoutResult = layouts[i];
    const sceneElements = layoutResult.elements;
    const section = sections[i];
    for (const [id, entry] of Object.entries(sceneElements)) {
      if (entry.type !== "el") continue;
      const dom = section.querySelector(`[data-sk-id="${id}"]`);
      if (!dom) continue;
      if (dom.scrollHeight > dom.clientHeight + 1) {
        layoutResult.warnings.push({
          type: "dom_overflow_y",
          elementId: id,
          clientHeight: dom.clientHeight,
          scrollHeight: dom.scrollHeight,
          overflow: dom.scrollHeight - dom.clientHeight
        });
      }
      if (dom.scrollWidth > dom.clientWidth + 1) {
        layoutResult.warnings.push({
          type: "dom_overflow_x",
          elementId: id,
          clientWidth: dom.clientWidth,
          scrollWidth: dom.scrollWidth,
          overflow: dom.scrollWidth - dom.clientWidth
        });
      }
    }
  }
  if (typeof window !== "undefined") {
    const skObj = {
      layouts,
      slides: slides.map((s, i) => ({
        id: s.id || `slide-${i}`,
        layout: layouts[i]
      })),
      // M8.1: Expose config for debug overlay to read safe zone info
      _config: state.config ? JSON.parse(JSON.stringify(state.config)) : null
    };
    skObj.lint = (slideId) => {
      const slideIdx = skObj.slides.findIndex((s) => s.id === slideId);
      if (slideIdx === -1) throw new Error(`Slide not found: ${slideId}`);
      const slide = skObj.slides[slideIdx];
      const slideEl = document.querySelectorAll(".reveal .slides > section")[slideIdx] || null;
      return lintSlide(slide, slideEl);
    };
    skObj.lintDeck = () => {
      const sectionEls = document.querySelectorAll(".reveal .slides > section");
      return lintDeck(skObj, sectionEls);
    };
    window.sk = skObj;
  }
  return { sections, layouts };
}

// slidekit/src/compounds.ts
function connect(fromId, toId, props = {}) {
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
    anchor: "tl"
  };
  return { id, type: "connector", props: resolved, _layoutFlags: {} };
}
function getAnchorPoint(bounds, anchor) {
  const row = anchor[0];
  const col = anchor[1];
  let px, py;
  let dx = 0, dy = 0;
  if (col === "l") {
    px = bounds.x;
    dx = -1;
  } else if (col === "c") {
    px = bounds.x + bounds.w / 2;
  } else {
    px = bounds.x + bounds.w;
    dx = 1;
  }
  if (row === "t") {
    py = bounds.y;
    dy = -1;
  } else if (row === "c") {
    py = bounds.y + bounds.h / 2;
  } else {
    py = bounds.y + bounds.h;
    dy = 1;
  }
  if (dx !== 0 && dy !== 0) {
    const len = Math.sqrt(dx * dx + dy * dy);
    dx /= len;
    dy /= len;
  }
  return { x: px, y: py, dx, dy };
}
function panel(children, props = {}) {
  const { id: customId, ...rest } = props;
  const id = customId || nextId();
  const padding = resolveSpacing(rest.padding ?? 24);
  const gap = resolveSpacing(rest.gap ?? 16);
  const panelW = rest.w;
  const panelH = rest.h;
  const contentW = panelW != null ? Math.max(0, panelW - 2 * padding) : void 0;
  const resolvedChildren = children.map((child) => {
    if (child.props && child.props.w === "fill" && contentW !== void 0) {
      return { ...child, props: { ...child.props, w: contentW } };
    }
    return child;
  });
  const childStack = vstack(resolvedChildren, {
    x: padding,
    y: padding,
    w: contentW,
    gap
  });
  const bgStyle = { ...rest.style || {} };
  if (rest.fill) bgStyle.background = rest.fill;
  if (rest.radius !== void 0) bgStyle.borderRadius = typeof rest.radius === "number" ? `${rest.radius}px` : rest.radius;
  if (rest.border !== void 0) bgStyle.border = rest.border;
  const bgRect = el("", {
    x: 0,
    y: 0,
    w: panelW || 0,
    style: bgStyle,
    className: rest.className || ""
  });
  const groupProps = {
    id,
    x: rest.x ?? 0,
    y: rest.y ?? 0,
    layer: rest.layer || "content",
    opacity: rest.opacity ?? 1,
    anchor: rest.anchor || "tl"
  };
  if (panelW != null) groupProps.w = panelW;
  if (panelH != null) groupProps.h = panelH;
  const panelConfig = { padding, gap, panelW, panelH };
  const groupBase = group([bgRect, childStack], groupProps);
  const result = {
    ...groupBase,
    _compound: "panel",
    _panelConfig: panelConfig
  };
  return result;
}
function figure(opts = {}) {
  const {
    id: customId,
    src = "",
    x = 0,
    y = 0,
    w = 0,
    h = 0,
    anchor = "tl",
    layer = "content",
    containerFill = "transparent",
    containerRadius = 0,
    containerPadding = 0,
    caption,
    captionGap = 0,
    fit = "contain",
    style = {}
  } = opts;
  const padPx = resolveSpacing(containerPadding);
  const gapPx = resolveSpacing(captionGap);
  const figId = customId || nextId();
  const radiusVal = typeof containerRadius === "number" ? `${containerRadius}px` : containerRadius;
  const bgRect = el("", {
    id: `${figId}-bg`,
    x: 0,
    y: 0,
    w,
    h,
    style: { background: containerFill, borderRadius: radiusVal }
  });
  const innerW = Math.max(0, w - 2 * padPx);
  const innerH = Math.max(0, h - 2 * padPx);
  const img = el(`<img src="${src}" style="object-fit: ${fit}; width: 100%; height: 100%; display: block;">`, {
    id: `${figId}-img`,
    x: padPx,
    y: padPx,
    w: innerW,
    h: innerH
  });
  const children = [bgRect, img];
  if (caption) {
    const cap = el(caption, {
      id: `${figId}-caption`,
      x: 0,
      y: h + gapPx,
      w
    });
    children.push(cap);
  }
  const figureConfig = {
    src,
    containerFill,
    containerRadius,
    containerPadding: padPx,
    captionGap: gapPx,
    fit
  };
  const groupBase = group(children, {
    id: figId,
    x,
    y,
    w,
    h,
    anchor,
    layer,
    style
  });
  const result = {
    ...groupBase,
    _compound: "figure",
    _figureConfig: figureConfig
  };
  return result;
}

// slidekit/src/utilities.ts
function deepClone(obj) {
  if (typeof structuredClone === "function") {
    return structuredClone(obj);
  }
  return JSON.parse(JSON.stringify(obj));
}
function grid(config = {}) {
  const cols = config.cols || 12;
  const gutter = config.gutter ?? 30;
  let marginLeft;
  let marginRight;
  if (config.margin) {
    marginLeft = config.margin.left ?? 120;
    marginRight = config.margin.right ?? 120;
  } else if (state.safeRectCache) {
    marginLeft = state.safeRectCache.x;
    marginRight = (state.config?.slide?.w ?? 1920) - (state.safeRectCache.x + state.safeRectCache.w);
  } else {
    marginLeft = 120;
    marginRight = 120;
  }
  const totalWidth = (state.config?.slide?.w ?? 1920) - marginLeft - marginRight;
  const totalGutters = (cols - 1) * gutter;
  const colWidth = (totalWidth - totalGutters) / cols;
  if (colWidth <= 0) {
    throw new Error(
      `grid(): computed column width is ${colWidth.toFixed(1)}px (non-positive). Check cols (${cols}), gutter (${gutter}), and margins (${marginLeft}+${marginRight}).`
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
     * @param n - Column number (1-based)
     * @returns X position in pixels
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
     * @param from - Start column (1-based, inclusive)
     * @param to - End column (1-based, inclusive)
     * @returns Width in pixels
     */
    spanW(from, to) {
      if (from < 1 || to > cols || from > to) {
        throw new Error(`grid.spanW(${from}, ${to}): invalid range for ${cols}-column grid`);
      }
      const numCols = to - from + 1;
      return numCols * colWidth + (numCols - 1) * gutter;
    }
  };
}
function snap(value, gridSize) {
  if (gridSize <= 0) return value;
  return Math.round(value / gridSize) * gridSize;
}
function resolvePercentage(value, axis) {
  if (typeof value !== "string") return value;
  const slideW = state.config?.slide?.w ?? 1920;
  const slideH = state.config?.slide?.h ?? 1080;
  const sr = state.safeRectCache || { x: 120, y: 90, w: 1680, h: 900 };
  const safeMatch = value.match(/^safe:\s*([0-9.]+)%$/);
  if (safeMatch) {
    const pct = parseFloat(safeMatch[1]) / 100;
    if (Number.isNaN(pct)) return value;
    if (axis === "x") return sr.x + pct * sr.w;
    if (axis === "y") return sr.y + pct * sr.h;
    if (axis === "w") return pct * sr.w;
    if (axis === "h") return pct * sr.h;
    return value;
  }
  const pctMatch = value.match(/^([0-9.]+)%$/);
  if (pctMatch) {
    const pct = parseFloat(pctMatch[1]) / 100;
    if (Number.isNaN(pct)) return value;
    if (axis === "x" || axis === "w") return pct * slideW;
    if (axis === "y" || axis === "h") return pct * slideH;
    return value;
  }
  return value;
}
function _reIdChildren(el2, suffix) {
  if (!("children" in el2) || !el2.children) return;
  for (const child of el2.children) {
    if (child.id) {
      child.id = `${child.id}${suffix}`;
    }
    _reIdChildren(child, suffix);
  }
}
function repeat(element, config = {}) {
  const count = config.count || 1;
  const cols = config.cols ?? count;
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
    const copy = deepClone(element);
    const suffix = `-${i + 1}`;
    copy.id = `${baseId}${suffix}`;
    _reIdChildren(copy, suffix);
    copy.props.x = x;
    copy.props.y = y;
    children.push(copy);
  }
  const rows = Math.ceil(count / cols);
  const groupW = cols * elemW + (cols - 1) * gapX;
  const groupH = rows * elemH + (rows - 1) * gapY;
  return group(children, {
    x: 0,
    y: 0,
    w: groupW,
    h: groupH
  });
}
function rotatedAABB(w, h, degrees) {
  const rad = degrees * Math.PI / 180;
  const cosA = Math.abs(Math.cos(rad));
  const sinA = Math.abs(Math.sin(rad));
  return {
    w: w * cosA + h * sinA,
    h: w * sinA + h * cosA
  };
}

// slidekit/src/layout/helpers.ts
function isRelMarker(value) {
  return value !== null && typeof value === "object" && typeof value._rel === "string";
}
function deepClone2(obj) {
  if (typeof structuredClone === "function") {
    return structuredClone(obj);
  }
  return JSON.parse(JSON.stringify(obj));
}
function flattenElements(elements) {
  const flatMap = /* @__PURE__ */ new Map();
  const groupParent = /* @__PURE__ */ new Map();
  const stackParent = /* @__PURE__ */ new Map();
  const stackChildren = /* @__PURE__ */ new Map();
  const groupChildren = /* @__PURE__ */ new Map();
  const panelInternals = /* @__PURE__ */ new Set();
  function walk(els, parentGroupId) {
    for (const el2 of els) {
      flatMap.set(el2.id, el2);
      if (parentGroupId) {
        groupParent.set(el2.id, parentGroupId);
      }
      if (el2.type === "group" && el2.children) {
        const childIds = el2.children.map((c) => c.id);
        groupChildren.set(el2.id, childIds);
        if (el2._compound === "panel" && el2.children.length >= 2) {
          panelInternals.add(el2.children[0].id);
          panelInternals.add(el2.children[1].id);
        }
        walk(el2.children, el2.id);
      }
      if ((el2.type === "vstack" || el2.type === "hstack") && el2.children) {
        const childIds = [];
        for (const child of el2.children) {
          flatMap.set(child.id, child);
          stackParent.set(child.id, el2.id);
          childIds.push(child.id);
          if ((child.type === "vstack" || child.type === "hstack") && child.children) {
            walk([child], parentGroupId);
          } else if (child.type === "group" && child.children) {
            const gcIds = child.children.map((c) => c.id);
            groupChildren.set(child.id, gcIds);
            if (child._compound === "panel" && child.children.length >= 2) {
              panelInternals.add(child.children[0].id);
              panelInternals.add(child.children[1].id);
            }
            walk(child.children, child.id);
          }
        }
        stackChildren.set(el2.id, childIds);
      }
    }
  }
  walk(elements, null);
  return { flatMap, groupParent, stackParent, stackChildren, groupChildren, panelInternals };
}
function getRelRef(marker) {
  if (!isRelMarker(marker)) return null;
  if (marker._rel === "centerIn") return null;
  return marker.ref || null;
}
function resolveRelMarker(marker, axis, refBounds, ownW, ownH) {
  const rel = marker._rel;
  const gap = marker.gap ?? 0;
  switch (rel) {
    case "below":
      return refBounds.y + refBounds.h + gap;
    case "above":
      return refBounds.y - ownH - gap;
    case "rightOf":
      return refBounds.x + refBounds.w + gap;
    case "leftOf":
      return refBounds.x - ownW - gap;
    case "centerV":
      return refBounds.y + refBounds.h / 2 - ownH / 2;
    case "centerH":
      return refBounds.x + refBounds.w / 2 - ownW / 2;
    case "alignTop":
      return refBounds.y;
    case "alignBottom":
      return refBounds.y + refBounds.h - ownH;
    case "alignLeft":
      return refBounds.x;
    case "alignRight":
      return refBounds.x + refBounds.w - ownW;
    case "centerIn": {
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
function buildProvenance(authoredValue, prop, element, wasMeasured) {
  if (isRelMarker(authoredValue)) {
    const prov = { source: "constraint", type: authoredValue._rel };
    if (authoredValue.ref) prov.ref = authoredValue.ref;
    if (authoredValue.ref2 !== void 0) prov.ref2 = authoredValue.ref2;
    if (authoredValue.gap !== void 0) prov.gap = authoredValue.gap;
    if (authoredValue.bias !== void 0) prov.bias = authoredValue.bias;
    if (authoredValue.rect) prov.rect = authoredValue.rect;
    return prov;
  }
  if (wasMeasured && (prop === "w" || prop === "h")) {
    return {
      source: "measured",
      measuredAt: {
        w: element.props?.w ?? null,
        className: element.props?.className || ""
      }
    };
  }
  return { source: "authored", value: authoredValue };
}
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

// slidekit/src/layout/overflow.ts
async function checkOverflowPolicies(sortedOrder, flatMap, authoredSpecs, resolvedBounds, warnings, errors) {
  for (const id of sortedOrder) {
    const el2 = mustGet(flatMap, id, `flatMap missing element in overflow check: ${id}`);
    if (el2.type !== "el") continue;
    const authoredH = mustGet(authoredSpecs, id, `authoredSpecs missing element in overflow check: ${id}`).props.h;
    if (authoredH === void 0 || authoredH === null) continue;
    const bounds = mustGet(resolvedBounds, id, `resolvedBounds missing element in overflow check: ${id}`);
    const overflow = el2.props.overflow || "visible";
    if (overflow === "visible") continue;
    const html = el2.content || "";
    if (!html) continue;
    const metrics = await measure(html, { ...el2.props, w: bounds.w });
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
          message: `Content in "${id}" overflows its box (content: ${metrics.h}px, box: ${bounds.h}px)`
        });
        break;
      case "clip":
        el2._layoutFlags.clip = true;
        break;
      case "error":
        errors.push({
          type: "content_overflow",
          elementId: id,
          overflow: "error",
          contentHeight: metrics.h,
          boxHeight: bounds.h,
          message: `Content in "${id}" overflows its box (content: ${metrics.h}px, box: ${bounds.h}px)`
        });
        break;
    }
  }
}

// slidekit/src/types.ts
function isPanelElement(el2) {
  return el2.type === "group" && "_compound" in el2 && el2._compound === "panel";
}

// slidekit/src/layout/intrinsics.ts
async function getEffectiveDimensions(element) {
  const { props, type } = element;
  if (type === "el" && (props.h === void 0 || props.h === null)) {
    const html = element.content || "";
    if (!html && (!props.style || Object.keys(props.style).length === 0)) {
      return { w: props.w || 0, h: 0, _autoHeight: true };
    }
    const metrics = await measure(html, { w: props.w, style: props.style, className: props.className });
    return { w: props.w || metrics.w, h: metrics.h, _autoHeight: true };
  }
  return { w: props.w || 0, h: props.h || 0, _autoHeight: false };
}
async function resolveIntrinsicSizes(flatMap, stackChildren, groupChildren, errors, _warnings) {
  const authoredSpecs = /* @__PURE__ */ new Map();
  for (const [id, el2] of flatMap) {
    const spec = {
      type: el2.type,
      props: deepClone2(el2.props)
    };
    if (el2.type === "el") {
      spec.content = el2.content;
    }
    if ("children" in el2 && el2.children) {
      spec.children = el2.children.map((c) => c.id);
    }
    authoredSpecs.set(id, spec);
  }
  for (const [_id, el2] of flatMap) {
    if (typeof el2.props.x === "string" && !isRelMarker(el2.props.x)) {
      el2.props.x = resolvePercentage(el2.props.x, "x");
    }
    if (typeof el2.props.y === "string" && !isRelMarker(el2.props.y)) {
      el2.props.y = resolvePercentage(el2.props.y, "y");
    }
    if (typeof el2.props.w === "string" && el2.props.w !== "fill") {
      el2.props.w = resolvePercentage(el2.props.w, "w");
    }
    if (typeof el2.props.h === "string" && el2.props.h !== "fill") {
      el2.props.h = resolvePercentage(el2.props.h, "h");
    }
  }
  for (const [id, el2] of flatMap) {
    if (isRelMarker(el2.props.w)) {
      errors.push({
        type: "invalid_rel_on_dimension",
        elementId: id,
        property: "w",
        message: `Element "${id}": _rel marker on "w" is invalid. Deferred values are only valid on x and y.`
      });
    }
    if (isRelMarker(el2.props.h)) {
      errors.push({
        type: "invalid_rel_on_dimension",
        elementId: id,
        property: "h",
        message: `Element "${id}": _rel marker on "h" is invalid. Deferred values are only valid on x and y.`
      });
    }
  }
  const resolvedSizes = /* @__PURE__ */ new Map();
  if (errors.length > 0) {
    return { authoredSpecs, resolvedSizes, hasErrors: true };
  }
  for (const [id, el2] of flatMap) {
    if (el2.type === "vstack" || el2.type === "hstack") continue;
    const dims = await getEffectiveDimensions(el2);
    resolvedSizes.set(id, {
      w: dims.w,
      h: dims.h,
      wMeasured: el2.type === "el" && (el2.props.w === void 0 || el2.props.w === null),
      hMeasured: dims._autoHeight
    });
  }
  const pendingStacks = /* @__PURE__ */ new Set();
  for (const [id, el2] of flatMap) {
    if (el2.type === "vstack" || el2.type === "hstack") {
      pendingStacks.add(id);
    }
  }
  let progress = true;
  while (pendingStacks.size > 0 && progress) {
    progress = false;
    for (const stackId of pendingStacks) {
      const el2 = mustGet(flatMap, stackId, `flatMap missing stack: ${stackId}`);
      const childIds = stackChildren.get(stackId) || [];
      const gap = resolveSpacing(el2.props.gap ?? 0);
      const stackW = el2.props.w ?? 0;
      let allChildrenSized = true;
      for (const cid of childIds) {
        if (!resolvedSizes.has(cid)) {
          allChildrenSized = false;
          break;
        }
        const childEl = mustGet(flatMap, cid, `flatMap missing stack child: ${cid}`);
        if (isPanelElement(childEl)) {
          const config = childEl._panelConfig;
          if (!config) continue;
          const panelChildren = childEl.children || [];
          const childStack = panelChildren[1];
          if (childStack && !resolvedSizes.has(childStack.id)) {
            allChildrenSized = false;
            break;
          }
          if (childStack && resolvedSizes.has(childStack.id)) {
            const stackSizes = resolvedSizes.get(childStack.id);
            const autoH = config.panelH ?? stackSizes.h + 2 * config.padding;
            const panelSizes = mustGet(resolvedSizes, cid, `resolvedSizes missing panel: ${cid}`);
            panelSizes.h = autoH;
            if (config.panelW != null) panelSizes.w = config.panelW;
            const bgRect = panelChildren[0];
            if (bgRect && resolvedSizes.has(bgRect.id)) {
              resolvedSizes.get(bgRect.id).h = autoH;
            }
          }
        }
      }
      if (!allChildrenSized) continue;
      if (el2.type === "vstack") {
        for (const cid of childIds) {
          const child = mustGet(flatMap, cid, `flatMap missing vstack child: ${cid}`);
          if ((child.props.w === void 0 || child.props.w === null) && stackW > 0) {
            const childSize = mustGet(resolvedSizes, cid, `resolvedSizes missing vstack child: ${cid}`);
            if (child.type === "el") {
              const html = child.content || "";
              if (html || child.props.style && Object.keys(child.props.style).length > 0) {
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
        let totalH = 0;
        let maxW = 0;
        for (let i = 0; i < childIds.length; i++) {
          const cs = mustGet(resolvedSizes, childIds[i], `resolvedSizes missing vstack child: ${childIds[i]}`);
          totalH += cs.h;
          if (i > 0) totalH += gap;
          maxW = Math.max(maxW, cs.w);
        }
        const finalW = stackW || maxW;
        const finalH = el2.props.h !== void 0 && el2.props.h !== null ? el2.props.h : totalH;
        resolvedSizes.set(stackId, {
          w: finalW,
          h: finalH,
          wMeasured: false,
          hMeasured: el2.props.h === void 0 || el2.props.h === null
        });
      } else {
        const stackH = el2.props.h ?? 0;
        let totalW = 0;
        let maxH = 0;
        for (let i = 0; i < childIds.length; i++) {
          const cs = mustGet(resolvedSizes, childIds[i], `resolvedSizes missing hstack child: ${childIds[i]}`);
          totalW += cs.w;
          if (i > 0) totalW += gap;
          maxH = Math.max(maxH, cs.h);
        }
        const finalW = el2.props.w !== void 0 && el2.props.w !== null ? el2.props.w : totalW;
        const finalH = stackH || maxH;
        resolvedSizes.set(stackId, {
          w: finalW,
          h: finalH,
          wMeasured: el2.props.w === void 0 || el2.props.w === null,
          hMeasured: el2.props.h === void 0 || el2.props.h === null
        });
      }
      pendingStacks.delete(stackId);
      progress = true;
    }
  }
  if (pendingStacks.size > 0) {
    errors.push({
      type: "unresolvable_stack_sizes",
      elementIds: Array.from(pendingStacks),
      message: `Could not resolve sizes for stacks: ${Array.from(pendingStacks).join(", ")}`
    });
    return { authoredSpecs, resolvedSizes, hasErrors: true };
  }
  for (const [id, el2] of flatMap) {
    if (!isPanelElement(el2)) continue;
    const config = el2._panelConfig;
    if (!config) continue;
    const panelChildren = el2.children || [];
    const bgRect = panelChildren[0];
    const childStack = panelChildren[1];
    if (!bgRect || !childStack) continue;
    const stackSizes = resolvedSizes.get(childStack.id);
    if (!stackSizes) continue;
    const autoH = config.panelH ?? stackSizes.h + 2 * config.padding;
    if (resolvedSizes.has(bgRect.id)) {
      resolvedSizes.get(bgRect.id).h = autoH;
    }
    if (resolvedSizes.has(id)) {
      const groupSizes = resolvedSizes.get(id);
      groupSizes.h = autoH;
      if (config.panelW) groupSizes.w = config.panelW;
    } else {
      resolvedSizes.set(id, {
        w: config.panelW || 0,
        h: autoH,
        wMeasured: false,
        hMeasured: config.panelH === void 0 || config.panelH === null
      });
    }
  }
  for (const [id, el2] of flatMap) {
    if (el2.type !== "group" || el2.props.bounds !== "hug") continue;
    if (el2._compound) continue;
    const childIds = groupChildren.get(id);
    if (!childIds || childIds.length === 0) continue;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let validChildren = 0;
    for (const cid of childIds) {
      const child = mustGet(flatMap, cid, `flatMap missing group child: ${cid}`);
      const cs = resolvedSizes.get(cid);
      if (!cs) continue;
      const cx = child.props.x ?? 0;
      const cy = child.props.y ?? 0;
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
  return { authoredSpecs, resolvedSizes, hasErrors: false };
}

// slidekit/src/layout/positions.ts
async function resolvePositions(flatMap, stackParent, stackChildren, resolvedSizes, authoredSpecs, warnings, errors) {
  const initialErrorCount = errors.length;
  const deps = /* @__PURE__ */ new Map();
  for (const [id, el2] of flatMap) {
    const depSet = /* @__PURE__ */ new Set();
    if (stackParent.has(id)) {
      const parentStackId = mustGet(stackParent, id, `stackParent missing child: ${id}`);
      depSet.add(parentStackId);
      if (isRelMarker(el2.props.x) || isRelMarker(el2.props.y)) {
        warnings.push({
          type: "ignored_rel_on_stack_child",
          elementId: id,
          stackId: parentStackId,
          message: `Element "${id}" is a child of stack "${parentStackId}", so its relative positioning markers on x/y are ignored. Use gap/align on the stack instead.`
        });
      }
    } else {
      const xRef = getRelRef(el2.props.x);
      const yRef = getRelRef(el2.props.y);
      if (xRef) {
        if (!flatMap.has(xRef)) {
          errors.push({
            type: "unknown_ref",
            elementId: id,
            property: "x",
            ref: xRef,
            message: `Element "${id}": x references unknown element "${xRef}"`
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
            message: `Element "${id}": y references unknown element "${yRef}"`
          });
        } else {
          depSet.add(yRef);
        }
      }
      for (const prop of ["x", "y"]) {
        const marker = el2.props[prop];
        if (isRelMarker(marker) && marker.ref2 !== void 0 && typeof marker.ref2 === "string") {
          if (!flatMap.has(marker.ref2)) {
            errors.push({
              type: "unknown_ref",
              elementId: id,
              property: prop,
              ref: marker.ref2,
              message: `Element "${id}": ${prop} references unknown element "${marker.ref2}" (ref2)`
            });
          } else {
            depSet.add(marker.ref2);
          }
        }
      }
      if (el2.type === "connector") {
        const fId = el2.props.fromId;
        const tId = el2.props.toId;
        if (fId) {
          if (!flatMap.has(fId)) {
            errors.push({
              type: "unknown_ref",
              elementId: id,
              property: "fromId",
              ref: fId,
              message: `Connector "${id}": fromId references unknown element "${fId}"`
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
              message: `Connector "${id}": toId references unknown element "${tId}"`
            });
          } else {
            depSet.add(tId);
          }
        }
      }
    }
    deps.set(id, depSet);
  }
  if (errors.length > initialErrorCount) {
    return null;
  }
  const inDegree = /* @__PURE__ */ new Map();
  for (const [id] of flatMap) {
    inDegree.set(id, 0);
  }
  for (const [id, depSet] of deps) {
    inDegree.set(id, depSet.size);
  }
  const queue = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) {
      queue.push(id);
    }
  }
  const reverseDeps = /* @__PURE__ */ new Map();
  for (const [id] of flatMap) {
    reverseDeps.set(id, []);
  }
  for (const [id, depSet] of deps) {
    for (const ref of depSet) {
      mustGet(reverseDeps, ref, `reverseDeps missing element: ${ref}`).push(id);
    }
  }
  const sortedOrder = [];
  while (queue.length > 0) {
    const nodeId = queue.shift();
    sortedOrder.push(nodeId);
    for (const dependent of mustGet(reverseDeps, nodeId, `reverseDeps missing node: ${nodeId}`)) {
      const newDeg = mustGet(inDegree, dependent, `inDegree missing element: ${dependent}`) - 1;
      inDegree.set(dependent, newDeg);
      if (newDeg === 0) {
        queue.push(dependent);
      }
    }
  }
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
      message: `Circular dependency detected among elements: ${inCycle.join(", ")}`
    });
    return null;
  }
  const resolvedBounds = /* @__PURE__ */ new Map();
  for (const id of sortedOrder) {
    const el2 = mustGet(flatMap, id, `flatMap missing element: ${id}`);
    const sizes = mustGet(resolvedSizes, id, `resolvedSizes missing element: ${id}`);
    const w = sizes.w;
    const h = sizes.h;
    let finalX, finalY;
    if (stackParent.has(id)) {
      if (resolvedBounds.has(id)) {
        const existingBounds = mustGet(resolvedBounds, id, `resolvedBounds missing stack child: ${id}`);
        finalX = existingBounds.x;
        finalY = existingBounds.y;
      } else {
        finalX = 0;
        finalY = 0;
        resolvedBounds.set(id, { x: 0, y: 0, w, h });
      }
      if (el2.type !== "vstack" && el2.type !== "hstack") {
        continue;
      }
    } else {
      const xIsRel = isRelMarker(el2.props.x);
      let x;
      if (xIsRel) {
        const marker = el2.props.x;
        if (marker._rel === "centerIn") {
          const r = marker.rect;
          x = r.x + r.w / 2 - w / 2;
        } else if (marker._rel === "between") {
          const leftBounds = mustGet(resolvedBounds, marker.ref, `resolvedBounds missing ref for between-x: ${marker.ref}`);
          const leftEdge = leftBounds.x + leftBounds.w;
          const rightEdge = typeof marker.ref2 === "string" ? mustGet(resolvedBounds, marker.ref2, `resolvedBounds missing ref2 for between-x: ${marker.ref2}`).x : marker.ref2;
          if (typeof rightEdge !== "number" || !Number.isFinite(rightEdge)) {
            warnings.push({ type: "between_invalid_ref", elementId: id, axis: "x", message: `Invalid ref2 value for between constraint` });
            x = leftEdge + resolveSpacing("xs");
            resolvedBounds.set(id, { x, y: el2.props.y ?? 0, w, h });
            continue;
          }
          const availableGapX = rightEdge - leftEdge;
          const availableSlack = availableGapX - w;
          if (availableSlack < 0) {
            const ref2Label = typeof marker.ref2 === "string" ? `"${marker.ref2}"` : marker.ref2;
            warnings.push({
              type: "between_no_fit",
              elementId: id,
              ref1: marker.ref,
              ref2: marker.ref2,
              message: `Element "${id}" (w=${w}) does not fit between "${marker.ref}" and ${ref2Label} (available: ${availableGapX}px). Using minimum gap fallback.`,
              suggestion: `Increase horizontal space between "${marker.ref}" and ${ref2Label} to at least ${w + 2 * resolveSpacing("xs")}px, or reduce element width.`
            });
            x = leftEdge + resolveSpacing("xs");
          } else {
            x = leftEdge + availableSlack * (marker.bias ?? 0.5);
          }
        } else {
          const refId = marker.ref;
          const refBounds = mustGet(resolvedBounds, refId, `resolvedBounds missing ref for x: ${refId}`);
          x = resolveRelMarker(marker, "x", refBounds, w, h);
        }
      } else {
        x = el2.props.x ?? 0;
      }
      const yIsRel = isRelMarker(el2.props.y);
      let y;
      if (yIsRel) {
        const marker = el2.props.y;
        if (marker._rel === "centerIn") {
          const r = marker.rect;
          y = r.y + r.h / 2 - h / 2;
        } else if (marker._rel === "between") {
          const topBounds = mustGet(resolvedBounds, marker.ref, `resolvedBounds missing ref for between-y: ${marker.ref}`);
          const topEdge = topBounds.y + topBounds.h;
          const bottomEdge = typeof marker.ref2 === "string" ? mustGet(resolvedBounds, marker.ref2, `resolvedBounds missing ref2 for between-y: ${marker.ref2}`).y : marker.ref2;
          if (typeof bottomEdge !== "number" || !Number.isFinite(bottomEdge)) {
            warnings.push({ type: "between_invalid_ref", elementId: id, axis: "y", message: `Invalid ref2 value for between constraint` });
            y = topEdge + resolveSpacing("xs");
            resolvedBounds.set(id, { x: el2.props.x ?? 0, y, w, h });
            continue;
          }
          const availableGapY = bottomEdge - topEdge;
          const availableSlack = availableGapY - h;
          if (availableSlack < 0) {
            const ref2Label = typeof marker.ref2 === "string" ? `"${marker.ref2}"` : marker.ref2;
            warnings.push({
              type: "between_no_fit",
              elementId: id,
              ref1: marker.ref,
              ref2: marker.ref2,
              message: `Element "${id}" (h=${h}) does not fit between "${marker.ref}" and ${ref2Label} (available: ${availableGapY}px). Using minimum gap fallback.`,
              suggestion: `Increase vertical space between "${marker.ref}" and ${ref2Label} to at least ${h + 2 * resolveSpacing("xs")}px, or reduce element height.`
            });
            y = topEdge + resolveSpacing("xs");
          } else {
            y = topEdge + availableSlack * (marker.bias ?? 0.5);
          }
        } else {
          const refId = marker.ref;
          const refBounds = mustGet(resolvedBounds, refId, `resolvedBounds missing ref for y: ${refId}`);
          y = resolveRelMarker(marker, "y", refBounds, w, h);
        }
      } else {
        y = el2.props.y ?? 0;
      }
      const anchor = el2.props.anchor || "tl";
      const { left: anchoredX, top: anchoredY } = resolveAnchor(x, y, w, h, anchor);
      finalX = xIsRel ? x : anchoredX;
      finalY = yIsRel ? y : anchoredY;
      resolvedBounds.set(id, { x: finalX, y: finalY, w, h });
    }
    if (el2.type === "vstack" || el2.type === "hstack") {
      const childIds = stackChildren.get(id) || [];
      const gap = resolveSpacing(el2.props.gap ?? 0);
      const stackX = finalX;
      const stackY = finalY;
      if (el2.type === "vstack") {
        const align = el2.props.align || "left";
        let curY = stackY;
        if (align === "stretch") {
          const maxW = childIds.length > 0 ? Math.max(...childIds.map((cid) => mustGet(resolvedSizes, cid, `resolvedSizes missing stack child: ${cid}`).w)) : 0;
          const stackAuthW = authoredSpecs.get(id)?.props?.w;
          const stretchW = stackAuthW !== void 0 && stackAuthW !== null ? w : maxW;
          for (let i = 0; i < childIds.length; i++) {
            const cid = childIds[i];
            const cs = mustGet(resolvedSizes, cid, `resolvedSizes missing vstack child: ${cid}`);
            const authoredW = mustGet(authoredSpecs, cid, `authoredSpecs missing vstack child: ${cid}`).props.w;
            if (authoredW !== void 0 && authoredW !== null && authoredW !== stretchW) {
              warnings.push({
                type: "stretch_override",
                elementId: cid,
                property: "w",
                authored: authoredW,
                stretched: stretchW,
                message: `Child '${cid}' has authored w=${authoredW} but stretch requires w=${stretchW}.`
              });
            }
            const childEl = mustGet(flatMap, cid, `flatMap missing vstack child: ${cid}`);
            const childAuth = authoredSpecs.get(cid)?.props || {};
            let childH = cs.h;
            if (childEl?.type === "el" && stretchW !== cs.w && (childAuth.h === void 0 || childAuth.h === null)) {
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
            const cs = mustGet(resolvedSizes, cid, `resolvedSizes missing vstack child: ${cid}`);
            let childX;
            if (align === "center") {
              childX = stackX + (w - cs.w) / 2;
            } else if (align === "right") {
              childX = stackX + w - cs.w;
            } else {
              childX = stackX;
            }
            resolvedBounds.set(cid, { x: childX, y: curY, w: cs.w, h: cs.h });
            curY += cs.h + gap;
          }
        }
      } else {
        const align = el2.props.align || "top";
        let curX = stackX;
        if (align === "stretch") {
          const maxH = childIds.length > 0 ? Math.max(...childIds.map((cid) => mustGet(resolvedSizes, cid, `resolvedSizes missing hstack child: ${cid}`).h)) : 0;
          const stackAuthH = authoredSpecs.get(id)?.props?.h;
          const stretchH = stackAuthH !== void 0 && stackAuthH !== null ? h : maxH;
          for (let i = 0; i < childIds.length; i++) {
            const cid = childIds[i];
            const cs = mustGet(resolvedSizes, cid, `resolvedSizes missing hstack child: ${cid}`);
            const authoredH = mustGet(authoredSpecs, cid, `authoredSpecs missing hstack child: ${cid}`).props.h;
            if (authoredH !== void 0 && authoredH !== null && authoredH !== stretchH) {
              warnings.push({
                type: "stretch_override",
                elementId: cid,
                property: "h",
                authored: authoredH,
                stretched: stretchH,
                message: `Child '${cid}' has authored h=${authoredH} but stretch requires h=${stretchH}.`
              });
            }
            resolvedBounds.set(cid, { x: curX, y: stackY, w: cs.w, h: stretchH });
            const childEl = mustGet(flatMap, cid, `flatMap missing hstack child: ${cid}`);
            if (isPanelElement(childEl) && childEl.children && childEl.children.length >= 1) {
              const bgRect = childEl.children[0];
              const bgSizes = resolvedSizes.get(bgRect.id);
              if (bgSizes) {
                bgSizes.h = stretchH;
              }
              const bgBounds = resolvedBounds.get(bgRect.id);
              if (bgBounds) {
                bgBounds.h = stretchH;
              }
            }
            curX += cs.w + gap;
          }
        } else {
          for (let i = 0; i < childIds.length; i++) {
            const cid = childIds[i];
            const cs = mustGet(resolvedSizes, cid, `resolvedSizes missing hstack child: ${cid}`);
            let childY;
            if (align === "middle") {
              childY = stackY + (h - cs.h) / 2;
            } else if (align === "bottom") {
              childY = stackY + h - cs.h;
            } else {
              childY = stackY;
            }
            resolvedBounds.set(cid, { x: curX, y: childY, w: cs.w, h: cs.h });
            curX += cs.w + gap;
          }
        }
      }
    }
  }
  return { resolvedBounds, sortedOrder };
}

// slidekit/src/layout/finalize.ts
function finalize({
  sortedOrder,
  flatMap,
  authoredSpecs,
  resolvedBounds,
  resolvedSizes,
  stackParent,
  stackChildren,
  groupParent,
  groupChildren,
  panelInternals,
  preTransformBounds,
  resolvedTransforms,
  warnings,
  errors,
  collisionThreshold
}) {
  const sceneElements = {};
  for (const id of sortedOrder) {
    const el2 = mustGet(flatMap, id, `flatMap missing element: ${id}`);
    const authored = mustGet(authoredSpecs, id, `authoredSpecs missing element: ${id}`);
    const bounds = mustGet(resolvedBounds, id, `resolvedBounds missing element: ${id}`);
    const sizes = mustGet(resolvedSizes, id, `resolvedSizes missing element: ${id}`);
    let provenance;
    if (stackParent.has(id)) {
      const parentStackId = mustGet(stackParent, id, `stackParent missing child: ${id}`);
      provenance = {
        x: { source: "stack", stackId: parentStackId },
        y: { source: "stack", stackId: parentStackId },
        w: buildProvenance(authored.props.w, "w", el2, sizes.wMeasured),
        h: buildProvenance(authored.props.h, "h", el2, sizes.hMeasured)
      };
    } else {
      provenance = {
        x: buildProvenance(authored.props.x, "x", el2, false),
        y: buildProvenance(authored.props.y, "y", el2, false),
        w: buildProvenance(authored.props.w, "w", el2, sizes.wMeasured),
        h: buildProvenance(authored.props.h, "h", el2, sizes.hMeasured)
      };
    }
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
    const parentId = groupParent.get(id) ?? stackParent.get(id) ?? null;
    let children = [];
    if (el2.type === "group" && groupChildren.has(id)) {
      children = mustGet(groupChildren, id, `groupChildren missing group: ${id}`);
    } else if ((el2.type === "vstack" || el2.type === "hstack") && stackChildren.has(id)) {
      children = mustGet(stackChildren, id, `stackChildren missing stack: ${id}`);
    }
    let localResolved;
    if (!parentId) {
      localResolved = { ...bounds };
    } else if (groupParent.has(id)) {
      localResolved = { ...bounds };
    } else {
      const stackBounds = resolvedBounds.get(parentId);
      if (stackBounds) {
        localResolved = {
          x: bounds.x - stackBounds.x,
          y: bounds.y - stackBounds.y,
          w: bounds.w,
          h: bounds.h
        };
      } else {
        localResolved = { ...bounds };
      }
    }
    sceneElements[id] = {
      id,
      type: el2.type,
      authored,
      resolved: { ...bounds },
      localResolved,
      parentId,
      children,
      _internal: panelInternals.has(id),
      provenance
    };
    if ("_compound" in el2 && el2._compound === "panel" && "children" in el2 && el2.children) {
      sceneElements[id].panelChildren = el2.children.map((child) => {
        const childBounds = resolvedBounds.get(child.id);
        return {
          id: child.id,
          type: child.type,
          ...childBounds || {}
        };
      });
    }
    if (el2._layoutFlags) {
      sceneElements[id]._layoutFlags = { ...el2._layoutFlags };
    }
  }
  const rootIds = [];
  for (const id of sortedOrder) {
    if (sceneElements[id] && sceneElements[id].parentId === null) {
      rootIds.push(id);
    }
  }
  const obstacleRects = [];
  for (const id of sortedOrder) {
    const el2 = mustGet(flatMap, id, `flatMap missing element: ${id}`);
    if (el2.type === "connector") continue;
    if (el2.type === "vstack" || el2.type === "hstack") continue;
    if (panelInternals.has(id)) continue;
    if (el2.props.layer === "bg") continue;
    const bounds = resolvedBounds.get(id);
    if (!bounds || bounds.w <= 0 || bounds.h <= 0) continue;
    obstacleRects.push({ id, rect: bounds });
  }
  const connectorInfos = [];
  function anchorEdge(anchor) {
    const row = anchor[0];
    const col = anchor[1];
    if (row === "t") return "top";
    if (row === "b") return "bottom";
    if (col === "l") return "left";
    if (col === "r") return "right";
    return "center";
  }
  const portGroups = /* @__PURE__ */ new Map();
  for (const id of sortedOrder) {
    const el2 = mustGet(flatMap, id, `flatMap missing element: ${id}`);
    if (el2.type !== "connector") continue;
    const fromId = el2.props.fromId;
    const toId = el2.props.toId;
    if (fromId === toId) {
      warnings.push({
        type: "connector_self_reference",
        elementId: id,
        message: `Connector "${id}": fromId and toId are the same element ("${fromId}")`
      });
      continue;
    }
    const fromBounds = resolvedBounds.get(fromId);
    const toBounds = resolvedBounds.get(toId);
    if (!fromBounds || !toBounds) {
      warnings.push({
        type: "connector_missing_endpoint",
        elementId: id,
        message: `Connector "${id}": could not resolve endpoints (from: "${fromId}", to: "${toId}")`
      });
      continue;
    }
    const fromAnchor = el2.props.fromAnchor || "cr";
    const toAnchor = el2.props.toAnchor || "cl";
    const fromPt = getAnchorPoint(fromBounds, fromAnchor);
    const toPt = getAnchorPoint(toBounds, toAnchor);
    if (fromPt.dx === 0 && fromPt.dy === 0) {
      const tdx = toPt.x - fromPt.x;
      const tdy = toPt.y - fromPt.y;
      if (Math.abs(tdx) >= Math.abs(tdy)) {
        fromPt.dx = tdx >= 0 ? 1 : -1;
      } else {
        fromPt.dy = tdy >= 0 ? 1 : -1;
      }
    }
    if (toPt.dx === 0 && toPt.dy === 0) {
      const tdx = fromPt.x - toPt.x;
      const tdy = fromPt.y - toPt.y;
      if (Math.abs(tdx) >= Math.abs(tdy)) {
        toPt.dx = tdx >= 0 ? 1 : -1;
      } else {
        toPt.dy = tdy >= 0 ? 1 : -1;
      }
    }
    const idx = connectorInfos.length;
    connectorInfos.push({ id, el: el2, fromId, toId, fromAnchor, toAnchor, fromPt, toPt, fromBounds, toBounds });
    const fromEdge = anchorEdge(fromAnchor);
    if (fromEdge !== "center") {
      const key = `from:${fromId}:${fromEdge}`;
      if (!portGroups.has(key)) portGroups.set(key, []);
      portGroups.get(key).push({
        idx,
        targetPt: { x: toPt.x, y: toPt.y },
        portOrder: el2.props.fromPortOrder ?? 0
      });
    }
    const toEdge = anchorEdge(toAnchor);
    if (toEdge !== "center") {
      const key = `to:${toId}:${toEdge}`;
      if (!portGroups.has(key)) portGroups.set(key, []);
      portGroups.get(key).push({
        idx,
        targetPt: { x: fromPt.x, y: fromPt.y },
        portOrder: el2.props.toPortOrder ?? 0
      });
    }
  }
  const PORT_SPACING = 14;
  const EDGE_MARGIN = 8;
  for (const [key, group2] of portGroups) {
    if (group2.length <= 1) {
      if (group2.length === 1) {
        const parts2 = key.split(":");
        const direction2 = parts2[0];
        const info = connectorInfos[group2[0].idx];
        const explicitOffset = direction2 === "from" ? info.el.props.fromPortOffset : info.el.props.toPortOffset;
        if (explicitOffset !== void 0) {
          const edge2 = parts2[2];
          const isHorizontalEdge2 = edge2 === "top" || edge2 === "bottom";
          if (direction2 === "from") {
            if (isHorizontalEdge2) info.fromPt.x += explicitOffset;
            else info.fromPt.y += explicitOffset;
          } else {
            if (isHorizontalEdge2) info.toPt.x += explicitOffset;
            else info.toPt.y += explicitOffset;
          }
        }
      }
      continue;
    }
    const parts = key.split(":");
    const direction = parts[0];
    const elementId = parts[1];
    const edge = parts[2];
    const bounds = resolvedBounds.get(elementId);
    if (!bounds) continue;
    const isHorizontalEdge = edge === "top" || edge === "bottom";
    group2.sort((a, b) => {
      if (a.portOrder !== b.portOrder) return a.portOrder - b.portOrder;
      return isHorizontalEdge ? a.targetPt.x - b.targetPt.x : a.targetPt.y - b.targetPt.y;
    });
    const edgeLength = isHorizontalEdge ? bounds.w : bounds.h;
    const usable = edgeLength - 2 * EDGE_MARGIN;
    const totalSpread = (group2.length - 1) * PORT_SPACING;
    const spacing = totalSpread > usable ? usable / (group2.length - 1) : PORT_SPACING;
    const startOffset = -((group2.length - 1) * spacing / 2);
    for (let i = 0; i < group2.length; i++) {
      const entry = group2[i];
      const info = connectorInfos[entry.idx];
      const offset = startOffset + i * spacing;
      const explicitOffset = direction === "from" ? info.el.props.fromPortOffset : info.el.props.toPortOffset;
      const appliedOffset = explicitOffset ?? offset;
      if (direction === "from") {
        if (isHorizontalEdge) {
          info.fromPt.x += appliedOffset;
        } else {
          info.fromPt.y += appliedOffset;
        }
      } else {
        if (isHorizontalEdge) {
          info.toPt.x += appliedOffset;
        } else {
          info.toPt.y += appliedOffset;
        }
      }
    }
  }
  for (const info of connectorInfos) {
    const { id, el: el2, fromId, toId, fromAnchor, toAnchor, fromPt, toPt } = info;
    const obstacles = [];
    for (const obs of obstacleRects) {
      if (obs.id === fromId || obs.id === toId) continue;
      obstacles.push(obs.rect);
    }
    const connType = el2.props.connectorType || "straight";
    let waypoints;
    if (connType === "elbow") {
      const route = routeConnector({ from: fromPt, to: toPt, obstacles });
      waypoints = route.waypoints;
    }
    let connMinX = Math.min(fromPt.x, toPt.x);
    let connMinY = Math.min(fromPt.y, toPt.y);
    let connMaxX = Math.max(fromPt.x, toPt.x);
    let connMaxY = Math.max(fromPt.y, toPt.y);
    if (waypoints) {
      for (const wp of waypoints) {
        if (wp.x < connMinX) connMinX = wp.x;
        if (wp.y < connMinY) connMinY = wp.y;
        if (wp.x > connMaxX) connMaxX = wp.x;
        if (wp.y > connMaxY) connMaxY = wp.y;
      }
    }
    if (connType === "curved") {
      const dist = Math.sqrt((toPt.x - fromPt.x) ** 2 + (toPt.y - fromPt.y) ** 2);
      const cpOff = Math.min(200, Math.max(40, dist * 0.4));
      const cx1 = fromPt.x + fromPt.dx * cpOff;
      const cy1 = fromPt.y + fromPt.dy * cpOff;
      const cx2 = toPt.x + toPt.dx * cpOff;
      const cy2 = toPt.y + toPt.dy * cpOff;
      connMinX = Math.min(connMinX, cx1, cx2);
      connMinY = Math.min(connMinY, cy1, cy2);
      connMaxX = Math.max(connMaxX, cx1, cx2);
      connMaxY = Math.max(connMaxY, cy1, cy2);
    }
    resolvedBounds.set(id, {
      x: connMinX,
      y: connMinY,
      w: connMaxX - connMinX,
      h: connMaxY - connMinY
    });
    if (sceneElements[id]) {
      const connBounds = {
        x: connMinX,
        y: connMinY,
        w: connMaxX - connMinX,
        h: connMaxY - connMinY
      };
      sceneElements[id].resolved = { ...connBounds };
      sceneElements[id].localResolved = { ...connBounds };
      sceneElements[id]._connectorResolved = {
        from: fromPt,
        to: toPt,
        fromId,
        toId,
        fromAnchor,
        toAnchor,
        waypoints
      };
    }
  }
  const collisions = [];
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
        current = sp;
        continue;
      }
      break;
    }
    return { x: bounds.x + offsetX, y: bounds.y + offsetY, w: bounds.w, h: bounds.h };
  }
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
  const layerElements = { bg: [], content: [], overlay: [] };
  for (const id of sortedOrder) {
    const el2 = mustGet(flatMap, id, `flatMap missing element in collision detection: ${id}`);
    if (groupParent.has(id)) continue;
    if (el2.type === "vstack" || el2.type === "hstack") continue;
    const elBounds = resolvedBounds.get(id);
    if (!elBounds || elBounds.w <= 0 || elBounds.h <= 0) continue;
    const layer = el2.props.layer || "content";
    if (!layerElements[layer]) layerElements[layer] = [];
    layerElements[layer].push(id);
  }
  for (const layer of Object.keys(layerElements)) {
    const ids = layerElements[layer];
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const idA = ids[i];
        const idB = ids[j];
        if (isAncestorOf(idA, idB) || isAncestorOf(idB, idA)) continue;
        let boundsA = absoluteBounds(idA);
        let boundsB = absoluteBounds(idB);
        if (!boundsA || !boundsB) continue;
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
              overlapArea
            });
          }
        }
      }
    }
  }
  const cfg = state.config;
  const slideW = cfg?.slide?.w ?? 1920;
  const slideH = cfg?.slide?.h ?? 1080;
  const isStrict = cfg?.strict === true;
  const sr = state.safeRectCache;
  if (sr) {
    for (const id of sortedOrder) {
      const el2 = mustGet(flatMap, id, `flatMap missing element in safe-zone check: ${id}`);
      if (el2.props.layer === "bg") continue;
      if (groupParent.has(id)) continue;
      if (stackParent.has(id)) continue;
      if (el2.type === "vstack" || el2.type === "hstack") continue;
      const bounds = mustGet(resolvedBounds, id, `resolvedBounds missing element in safe-zone check: ${id}`);
      const outsideSafe = bounds.x < sr.x || bounds.y < sr.y || bounds.x + bounds.w > sr.x + sr.w || bounds.y + bounds.h > sr.y + sr.h;
      if (outsideSafe) {
        const suggestion = `. If intentional, set layer: 'bg' to silence this check.`;
        if (isStrict) {
          errors.push({
            type: "outside_safe_zone",
            elementId: id,
            resolved: { ...bounds },
            safeRect: { ...sr },
            message: `Element "${id}" extends outside the safe zone` + suggestion
          });
        } else {
          warnings.push({
            type: "outside_safe_zone",
            elementId: id,
            resolved: { ...bounds },
            safeRect: { ...sr },
            message: `Element "${id}" extends outside the safe zone` + suggestion
          });
        }
      }
    }
  }
  for (const id of sortedOrder) {
    const el2 = mustGet(flatMap, id, `flatMap missing element in slide-bounds check: ${id}`);
    if (groupParent.has(id)) continue;
    if (stackParent.has(id)) continue;
    if (el2.type === "vstack" || el2.type === "hstack") continue;
    const bounds = mustGet(resolvedBounds, id, `resolvedBounds missing element in slide-bounds check: ${id}`);
    const outsideSlide = bounds.x < 0 || bounds.y < 0 || bounds.x + bounds.w > slideW || bounds.y + bounds.h > slideH;
    if (outsideSlide) {
      if (isStrict) {
        errors.push({
          type: "outside_slide",
          elementId: id,
          resolved: { ...bounds },
          slideRect: { x: 0, y: 0, w: slideW, h: slideH },
          message: `Element "${id}" extends outside the slide bounds (${slideW}x${slideH})`
        });
      } else {
        warnings.push({
          type: "outside_slide",
          elementId: id,
          resolved: { ...bounds },
          slideRect: { x: 0, y: 0, w: slideW, h: slideH },
          message: `Element "${id}" extends outside the slide bounds (${slideW}x${slideH})`
        });
      }
    }
  }
  if (sr) {
    let contentMinX = Infinity, contentMinY = Infinity;
    let contentMaxX = -Infinity, contentMaxY = -Infinity;
    let hasContentElements = false;
    for (const id of sortedOrder) {
      const el2 = mustGet(flatMap, id, `flatMap missing element in content-area check: ${id}`);
      if (el2.props.layer !== "content") continue;
      if (groupParent.has(id)) continue;
      if (el2.type === "vstack" || el2.type === "hstack") continue;
      const bounds = mustGet(resolvedBounds, id, `resolvedBounds missing element in content-area check: ${id}`);
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
      if (usageRatio < 0.4) {
        warnings.push({
          type: "content_clustered",
          usageRatio,
          contentBounds: { x: contentMinX, y: contentMinY, w: contentW, h: contentH },
          message: `Content uses only ${(usageRatio * 100).toFixed(1)}% of the safe zone \u2014 content may be too clustered`
        });
      } else if (usageRatio > 0.95) {
        warnings.push({
          type: "content_no_breathing_room",
          usageRatio,
          contentBounds: { x: contentMinX, y: contentMinY, w: contentW, h: contentH },
          message: `Content uses ${(usageRatio * 100).toFixed(1)}% of the safe zone \u2014 no breathing room`
        });
      }
    }
  }
  for (const [id, el2] of flatMap) {
    if (!isPanelElement(el2)) continue;
    const config = el2._panelConfig;
    if (!config || config.panelH == null) continue;
    const childStack = (el2.children || [])[1];
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
        message: `Panel '${id}' content (${contentH}px) exceeds authored height (${authoredH}px) by ${contentH - authoredH}px. Remove explicit h to let panel size to content.`
      });
    }
  }
  for (const [id, el2] of flatMap) {
    if (el2.type !== "hstack") continue;
    const align = el2.props.align || "top";
    if (align === "stretch") continue;
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
        message: `hstack '${id}' has children with unequal heights (${minH}-${maxH}px). Consider align: 'stretch' for equal-height cards.`
      });
    }
  }
  for (const [id, el2] of flatMap) {
    if (el2.type !== "group") continue;
    if (el2.props.bounds === "hug") continue;
    if (el2._compound) continue;
    const anchor = el2.props.anchor;
    if (!anchor || typeof anchor !== "string" || !anchor.includes("c")) continue;
    if (anchor[1] !== "c") continue;
    const childIds = groupChildren.get(id) || [];
    if (childIds.length === 0) continue;
    const authoredW = el2.props.w;
    if (authoredW === void 0 || authoredW === null) continue;
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
        message: `Group '${id}' has authored w=${authoredW} but content spans ${contentW}px. Consider bounds: 'hug' for accurate centering.`
      });
    }
  }
  return {
    elements: sceneElements,
    rootIds,
    transforms: resolvedTransforms,
    warnings,
    errors,
    collisions
  };
}

// slidekit/src/layout/index.ts
async function layout(slideDefinition, options = {}) {
  const errors = [];
  const warnings = [];
  const elements = slideDefinition.elements || [];
  const transforms = slideDefinition.transforms || [];
  const collisionThreshold = options.collisionThreshold ?? 0;
  const { flatMap, groupParent, stackParent, stackChildren, groupChildren, panelInternals } = flattenElements(elements);
  const { authoredSpecs, resolvedSizes, hasErrors } = await resolveIntrinsicSizes(flatMap, stackChildren, groupChildren, errors, warnings);
  if (hasErrors) {
    return {
      elements: {},
      transforms: deepClone2(transforms),
      warnings,
      errors,
      collisions: []
    };
  }
  const phase2Result = await resolvePositions(flatMap, stackParent, stackChildren, resolvedSizes, authoredSpecs, warnings, errors);
  if (!phase2Result) {
    return {
      elements: {},
      transforms: deepClone2(transforms),
      warnings,
      errors,
      collisions: []
    };
  }
  const { resolvedBounds, sortedOrder } = phase2Result;
  await checkOverflowPolicies(sortedOrder, flatMap, authoredSpecs, resolvedBounds, warnings, errors);
  state.transformIdCounter = 0;
  const resolvedTransforms = [];
  for (const t of transforms) {
    if (!t || typeof t !== "object") {
      resolvedTransforms.push(t);
      continue;
    }
    const transformCopy = deepClone2(t);
    if (!transformCopy._transformId) {
      transformCopy._transformId = nextTransformId();
    }
    resolvedTransforms.push(transformCopy);
  }
  const preTransformBounds = /* @__PURE__ */ new Map();
  for (const [id, b] of resolvedBounds) {
    preTransformBounds.set(id, { x: b.x, y: b.y, w: b.w, h: b.h });
  }
  for (const t of resolvedTransforms) {
    if (!t || typeof t._transform !== "string") {
      warnings.push({
        type: "invalid_transform_object",
        transform: t,
        message: "Invalid object in transforms array. Each transform must be created by a SlideKit transform function."
      });
      continue;
    }
    const transformWarnings = applyTransform(t, resolvedBounds, flatMap);
    for (const w of transformWarnings) {
      warnings.push(w);
    }
  }
  if (state.fontWarnings && state.fontWarnings.length > 0) {
    warnings.push(...state.fontWarnings);
    state.fontWarnings = [];
  }
  return finalize({
    sortedOrder,
    flatMap,
    authoredSpecs,
    resolvedBounds,
    resolvedSizes,
    stackParent,
    stackChildren,
    groupParent,
    groupChildren,
    panelInternals,
    preTransformBounds,
    resolvedTransforms,
    warnings,
    errors,
    collisionThreshold
  });
}

// slidekit/slidekit.ts
_setLayoutFn(layout);
var SlideKit = {
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
  figure,
  getAnchorPoint,
  routeConnector,
  // Utilities
  grid,
  snap,
  repeat,
  resolvePercentage,
  resolveShadow,
  getShadowPresets,
  rotatedAABB,
  lintSlide,
  lintDeck
};
var slidekit_default = SlideKit;
export {
  VALID_ANCHORS,
  _resetForTests,
  above,
  alignBottom,
  alignBottomWith,
  alignCenterH,
  alignCenterV,
  alignLeft,
  alignLeftWith,
  alignRight,
  alignRightWith,
  alignTop,
  alignTopWith,
  applySlideBackground,
  applyStyleToDOM,
  below,
  cardGrid,
  centerHWith,
  centerIn,
  centerVWith,
  clearMeasureCache,
  computeZOrder,
  connect,
  slidekit_default as default,
  distributeH,
  distributeV,
  el,
  figure,
  filterStyle,
  fitToRect,
  getAnchorPoint,
  getConfig,
  getEffectiveDimensions,
  getFontWarnings,
  getShadowPresets,
  getSpacing,
  grid,
  group,
  hstack,
  init,
  isFontLoaded,
  layout,
  leftOf,
  lintDeck,
  lintSlide,
  matchHeight,
  matchSize,
  matchWidth,
  measure,
  panel,
  placeBetween,
  render,
  renderElementFromScene,
  repeat,
  resetIdCounter,
  resolveAnchor,
  resolvePercentage,
  resolveShadow,
  rightOf,
  rotatedAABB,
  routeConnector,
  safeRect,
  snap,
  splitRect,
  vstack
};
//# sourceMappingURL=slidekit.bundle.js.map

// slidekit/dist/slidekit_ts.bundle.js
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
function resetIdCounter() {
  state.idCounter = 0;
}
function nextId() {
  state.idCounter += 1;
  return `sk-${state.idCounter}`;
}
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
function applyStyleToDOM(domEl, styleObj) {
  for (const [key, value] of Object.entries(styleObj)) {
    if (key.startsWith("--")) {
      domEl.style.setProperty(key, value);
    } else {
      domEl.style[key] = value;
    }
  }
}
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
function centerIn(rectParam) {
  const marker = { _rel: "centerIn", rect: rectParam };
  return { x: marker, y: marker };
}
function placeBetween(topRef, bottomYOrRef, { bias = 0.35 } = {}) {
  const numBias = typeof bias === "number" && Number.isFinite(bias) ? bias : 0.35;
  const clampedBias = Math.max(0, Math.min(1, numBias));
  return { _rel: "between", ref: topRef, ref2: bottomYOrRef, bias: clampedBias };
}
function mustGet(map, key, msg) {
  const value = map.get(key);
  if (value === void 0) {
    throw new Error(msg ?? `Map missing expected key: ${String(key)}`);
  }
  return value;
}
function nextTransformId() {
  state.transformIdCounter += 1;
  return `transform-${state.transformIdCounter}`;
}
function alignTop(ids, options = {}) {
  return { _transform: "alignTop", _transformId: nextTransformId(), ids, options };
}
function distributeH(ids, options = {}) {
  return { _transform: "distributeH", _transformId: nextTransformId(), ids, options: { mode: "equal-gap", ...options } };
}
function matchWidth(ids) {
  return { _transform: "matchWidth", _transformId: nextTransformId(), ids, options: {} };
}
function matchHeight(ids) {
  return { _transform: "matchHeight", _transformId: nextTransformId(), ids, options: {} };
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
function ruleChildOverflow(elements) {
  const findings = [];
  for (const el2 of Object.values(elements)) {
    if (!el2.parentId || el2._internal) continue;
    const parent = elements[el2.parentId];
    if (!parent) continue;
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
          detail: { edge, overshoot },
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
    if (normLayer(el2) === "bg") continue;
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
    if (normLayer(el2) === "bg") continue;
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
    ...ruleContentUnderutilized(elements)
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
  const caseType = classifyCase(p1, d1, q1, d2);
  if (caseType === "backward" || caseType === "same-direction") {
    const uRoutes = computeURoute(p1, d1, q1, d2, obstacles, clearance);
    candidates.push(uRoutes);
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
function computeURoute(p1, d1, q1, d2, obstacles, clearance) {
  const routes = computeAllChannelRoutes(p1, d1, q1, d2, obstacles, clearance);
  let best = [];
  let bestDist = Infinity;
  for (const route of routes) {
    const full = [p1, ...route, q1];
    const dist = manhattanLength(full);
    if (dist < bestDist && !polylineIntersectsObstacles(full, obstacles, clearance)) {
      bestDist = dist;
      best = route;
    }
  }
  if (bestDist === Infinity && routes.length > 0) {
    let fallbackDist = Infinity;
    for (const route of routes) {
      const full = [p1, ...route, q1];
      const dist = manhattanLength(full);
      if (dist < fallbackDist) {
        fallbackDist = dist;
        best = route;
      }
    }
  }
  return best;
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
  const topY = minY - clearance;
  routes.push(buildChannelRoute(p1, q1, d1, "y", topY));
  const bottomY = maxY + clearance;
  routes.push(buildChannelRoute(p1, q1, d1, "y", bottomY));
  const leftX = minX - clearance;
  routes.push(buildChannelRoute(p1, q1, d1, "x", leftX));
  const rightX = maxX + clearance;
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
    const route = routeConnector({ from, to });
    elbowWaypoints = route.waypoints;
    for (const wp of elbowWaypoints) {
      if (wp.x < minX) minX = wp.x;
      if (wp.y < minY) minY = wp.y;
      if (wp.x > maxX) maxX = wp.x;
      if (wp.y > maxY) maxY = wp.y;
    }
  }
  if (connType === "curved") {
    const dist = Math.sqrt((to.x - from.x) ** 2 + (to.y - from.y) ** 2);
    const cpOff = dist * 0.4;
    const cx1 = from.x + from.dx * cpOff;
    const cy1 = from.y + from.dy * cpOff;
    const cx2 = to.x + to.dx * cpOff;
    const cy2 = to.y + to.dy * cpOff;
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
      const dist = Math.sqrt((lx2 - lx1) ** 2 + (ly2 - ly1) ** 2);
      const cpOffset = dist * 0.4;
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
        d = `M ${localWaypoints[0].x} ${localWaypoints[0].y}`;
        for (let i = 1; i < localWaypoints.length; i++) {
          d += ` L ${localWaypoints[i].x} ${localWaypoints[i].y}`;
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
    const labelSize = labelStyle.size ?? 14;
    const labelColor = labelStyle.color ?? "#999999";
    const labelFont = labelStyle.font || "Inter";
    const labelWeight = labelStyle.weight ?? 400;
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
    textNode.setAttribute("y", String(midLY - 8));
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
  div.style.fontSize = "0";
  div.style.lineHeight = "0";
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
          { ...props, _markerId: element.id }
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
    caption: caption2,
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
  if (caption2) {
    const cap = el(caption2, {
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
function isPanelElement(el2) {
  return el2.type === "group" && "_compound" in el2 && el2._compound === "panel";
}
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
          const availableSlack = rightEdge - leftEdge - w;
          if (availableSlack < 0) {
            warnings.push({
              type: "between_no_fit",
              elementId: id,
              ref1: marker.ref,
              ref2: marker.ref2,
              message: `Element "${id}": does not fit between "${marker.ref}" and ${typeof marker.ref2 === "string" ? `"${marker.ref2}"` : marker.ref2}; using minimum gap fallback.`
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
          const availableSlack = bottomEdge - topEdge - h;
          if (availableSlack < 0) {
            warnings.push({
              type: "between_no_fit",
              elementId: id,
              ref1: marker.ref,
              ref2: marker.ref2,
              message: `Element "${id}": does not fit between "${marker.ref}" and ${typeof marker.ref2 === "string" ? `"${marker.ref2}"` : marker.ref2}; using minimum gap fallback.`
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
    const route = routeConnector({ from: fromPt, to: toPt });
    let connMinX = Infinity, connMinY = Infinity;
    let connMaxX = -Infinity, connMaxY = -Infinity;
    for (const wp of route.waypoints) {
      if (wp.x < connMinX) connMinX = wp.x;
      if (wp.y < connMinY) connMinY = wp.y;
      if (wp.x > connMaxX) connMaxX = wp.x;
      if (wp.y > connMaxY) connMaxY = wp.y;
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
        toAnchor
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
_setLayoutFn(layout);

// test_dir_2/slidekit_about_linted.ts
var C = {
  bg: "#0a0a1a",
  bgAlt: "#0f1029",
  accent1: "#00d4ff",
  // electric cyan
  accent2: "#7c5cbf",
  // violet
  accent3: "#ff6b9d",
  // coral
  accent4: "#00ff88",
  // mint green
  text: "#ffffff",
  textSec: "rgba(255,255,255,0.65)",
  textTer: "rgba(255,255,255,0.4)",
  glass: "rgba(255,255,255,0.04)",
  glassBorder: "rgba(255,255,255,0.08)",
  glassEmph: "rgba(255,255,255,0.07)",
  glassEmphBorder: "rgba(255,255,255,0.12)"
};
var FONT = "Inter";
var MONO = "'JetBrains Mono', monospace";
function mkEyebrow(text, id, color = C.accent1, extra = {}) {
  return el(
    `<p style="font-family:${FONT};font-size:20px;font-weight:600;color:${color};text-transform:uppercase;letter-spacing:3px;">${text}</p>`,
    { id, ...extra }
  );
}
function accentRule(id, extra = {}) {
  return el(
    `<div style="width:100%;height:100%;background:linear-gradient(90deg, ${C.accent1}, ${C.accent2});border-radius:2px;"></div>`,
    { id, w: 80, h: 3, ...extra }
  );
}
function badge(text, id) {
  return el(
    `<span style="font-family:${FONT};font-size:18px;font-weight:600;color:${C.accent1};border:1px solid rgba(0,212,255,0.3);padding:8px 24px;border-radius:6px;display:inline-block;letter-spacing:0.04em;">${text}</span>`,
    { id, w: 220, h: 50 }
  );
}
function slideTitle(text, id, extra = {}) {
  return el(
    `<h2 style="font-family:${FONT};font-size:56px;font-weight:700;color:${C.text};line-height:1.2;">${text}</h2>`,
    { id, h: 75, ...extra }
  );
}
function bodyText(text, id, extra = {}) {
  return el(
    `<p style="font-family:${FONT};font-size:26px;font-weight:400;color:${C.textSec};line-height:1.6;">${text}</p>`,
    { id, ...extra }
  );
}
function codeText(text, id, extra = {}) {
  return el(
    `<pre style="font-family:${MONO};font-size:22px;color:${C.accent4};line-height:1.5;margin:0;white-space:pre;">${text}</pre>`,
    { id, ...extra }
  );
}
function caption(text, id, extra = {}) {
  return el(
    `<p style="font-family:${FONT};font-size:18px;font-weight:400;color:${C.textTer};line-height:1.4;">${text}</p>`,
    { id, ...extra }
  );
}
async function run() {
  await init({
    slide: { w: 1920, h: 1080 },
    safeZone: { left: 120, right: 120, top: 90, bottom: 90 },
    minFontSize: 12,
    fonts: [
      { family: "Inter", weights: [300, 400, 600, 700, 800], source: "google" },
      { family: "JetBrains Mono", weights: [400, 600], source: "google" }
    ]
  });
  const safe = safeRect();
  const slides = [
    // ================================================================
    // SLIDE 1: TITLE — "What is SlideKit?"
    // ================================================================
    {
      id: "title",
      background: C.bg,
      notes: "SlideKit is a coordinate-based layout engine for presentations, designed so AI agents can author slides deterministically. This deck is itself built with SlideKit.",
      elements: [
        // Background radial glow (bg layer)
        el('<div style="width:100%;height:100%;background:radial-gradient(ellipse at 50% 45%, rgba(0,212,255,0.08) 0%, transparent 55%);"></div>', {
          id: "s1-glow",
          x: 0,
          y: 0,
          w: 1920,
          h: 1080,
          layer: "bg"
        }),
        // Eyebrow: INTRODUCING
        mkEyebrow("Introducing", "s1-eyebrow", C.accent1, {
          x: 960,
          y: 300,
          anchor: "bc",
          w: 400,
          style: { textAlign: "center" }
        }),
        // Hero title: SlideKit (96px)
        el(`<h1 style="font-family:${FONT};font-size:96px;font-weight:800;color:${C.text};line-height:1.0;text-align:center;">SlideKit</h1>`, {
          id: "s1-title",
          x: 960,
          y: below("s1-eyebrow", { gap: "md" }),
          w: 1e3,
          h: 120,
          anchor: "tc"
        }),
        // Accent rule below title
        accentRule("s1-rule", {
          x: 960 - 40,
          y: below("s1-title", { gap: "lg" })
        }),
        // Tagline
        el(`<p style="font-family:${FONT};font-size:30px;font-weight:400;color:${C.textSec};line-height:1.5;text-align:center;">Coordinate-based slide layout for the AI\xA0era</p>`, {
          id: "s1-tagline",
          x: 960,
          y: below("s1-rule", { gap: "md" }),
          w: 900,
          anchor: "tc"
        }),
        // Bottom badges row
        hstack([
          badge("Deterministic", "s1-badge1"),
          el(`<span style="font-family:${FONT};font-size:24px;color:${C.textTer};">\xB7</span>`, {
            id: "s1-dot1",
            w: 30,
            h: 50
          }),
          badge("Measurable", "s1-badge2"),
          el(`<span style="font-family:${FONT};font-size:24px;color:${C.textTer};">\xB7</span>`, {
            id: "s1-dot2",
            w: 30,
            h: 50
          }),
          badge("Validated", "s1-badge3")
        ], {
          id: "s1-badges",
          x: 960,
          y: 880,
          anchor: "bc",
          gap: 16,
          align: "middle"
        }),
        // Decorative rotated rectangle (bottom-right)
        el('<div style="width:100%;height:100%;background:linear-gradient(135deg, rgba(0,212,255,0.15), rgba(124,92,191,0.15));border-radius:4px;"></div>', {
          id: "s1-deco-rect",
          x: 1650,
          y: 850,
          w: 200,
          h: 8,
          rotate: 15,
          opacity: 0.12,
          layer: "bg"
        })
      ]
    },
    // ================================================================
    // SLIDE 2: THE PROBLEM — "CSS Wasn't Built for Slides"
    // ================================================================
    {
      id: "the-problem",
      background: C.bg,
      notes: "CSS layout was designed for reflowing documents. Slides are fixed canvases. When auto-layout decides wrong, you debug cascading interactions instead of designing.",
      elements: (() => {
        const { left, right } = splitRect(safe, { ratio: 0.5, gap: 60 });
        const leftElements = [
          // Left column: text content
          vstack([
            mkEyebrow("The Problem", "s2-eyebrow", C.accent3),
            slideTitle("CSS Wasn\u2019t Built for Slides", "s2-title"),
            accentRule("s2-rule"),
            bodyText(
              "CSS layout was designed for reflowing documents that adapt to variable screen sizes. Slides are the opposite\xA0\u2014 fixed canvases where every element has a deliberate position.",
              "s2-body1"
            ),
            bodyText(
              'When you use auto-layout for slides, the <strong style="color:#ffffff;">browser decides</strong> where things go. When it decides wrong, you debug cascading interactions and emergent reflow.',
              "s2-body2"
            )
          ], {
            id: "s2-left-stack",
            x: left.x,
            y: left.y,
            w: left.w,
            gap: "md",
            align: "left"
          })
        ];
        const chaosPanel = (label, idx) => panel([
          el(`<p style="font-family:${MONO};font-size:20px;color:${C.accent3};line-height:1.4;">${label}</p>`, {
            id: `s2-chaos-label${idx}`,
            w: "fill"
          })
        ], {
          id: `s2-chaos-panel${idx}`,
          w: right.w,
          padding: "sm",
          gap: 6,
          fill: "rgba(255,107,157,0.08)",
          radius: 12,
          border: "1px solid rgba(255,107,157,0.2)"
        });
        const panelGap = 80;
        const rightElements = [
          // Three chaos panels
          (() => {
            const p = chaosPanel("flex-grow: 1 ???", 1);
            p.props.x = right.x;
            p.props.y = right.y + 60;
            return p;
          })(),
          (() => {
            const p = chaosPanel("margin collapse ???", 2);
            p.props.x = right.x;
            p.props.y = right.y + 60 + panelGap + 50;
            return p;
          })(),
          (() => {
            const p = chaosPanel("min-width override ???", 3);
            p.props.x = right.x;
            p.props.y = right.y + 60 + (panelGap + 50) * 2;
            return p;
          })(),
          // Connectors between chaos panels (curved, both arrows — chaos!)
          connect("s2-chaos-panel1", "s2-chaos-panel2", {
            id: "s2-conn1",
            type: "curved",
            arrow: "both",
            color: C.accent3,
            thickness: 2,
            dash: [6, 4]
          }),
          connect("s2-chaos-panel2", "s2-chaos-panel3", {
            id: "s2-conn2",
            type: "curved",
            arrow: "both",
            color: C.accent3,
            thickness: 2,
            dash: [6, 4]
          }),
          connect("s2-chaos-panel1", "s2-chaos-panel3", {
            id: "s2-conn3",
            type: "curved",
            arrow: "both",
            color: "rgba(255,107,157,0.4)",
            thickness: 1,
            fromAnchor: "br",
            toAnchor: "tr"
          })
        ];
        return [...leftElements, ...rightElements];
      })()
    },
    // ================================================================
    // SLIDE 3: THE SOLUTION — "Just Say Where Things Go"
    // ================================================================
    {
      id: "the-solution",
      background: C.bgAlt,
      notes: "SlideKit uses explicit coordinates. You say where an element goes and it goes there. No surprises, no debugging layout engine quirks.",
      elements: (() => {
        const { left, right } = splitRect(safe, { ratio: 0.45, gap: 60 });
        return [
          // Left side: eyebrow + title + code block
          vstack([
            mkEyebrow("The Solution", "s3-eyebrow", C.accent1),
            slideTitle("Just Say Where Things Go", "s3-title"),
            accentRule("s3-rule"),
            // Code block panel
            panel([
              codeText(
                `el(<span style="color:${C.accent3};">'Hello World'</span>, {
  <span style="color:${C.accent1};">x</span>: 200, <span style="color:${C.accent1};">y</span>: 300,
  <span style="color:${C.accent1};">w</span>: 800, <span style="color:${C.accent1};">h</span>: 400
})`,
                "s3-code",
                { w: "fill" }
              )
            ], {
              id: "s3-code-panel",
              w: left.w,
              padding: "md",
              gap: 8,
              fill: "rgba(0,255,136,0.04)",
              radius: 12,
              border: `1px solid rgba(0,255,136,0.15)`
            })
          ], {
            id: "s3-left-stack",
            x: left.x,
            y: left.y,
            w: left.w,
            gap: "md",
            align: "left"
          }),
          // Right side: visual representation
          group([
            // Canvas outline
            el('<div style="width:100%;height:100%;border:1px solid rgba(255,255,255,0.15);border-radius:4px;"></div>', {
              id: "s3-canvas-outline",
              x: 0,
              y: 0,
              w: 560,
              h: 315
            }),
            // Placed element (proportionally mapped: 200/1920*560≈58, 300/1080*315≈87)
            el('<div style="width:100%;height:100%;background:rgba(0,80,120,0.6);border:1px solid rgba(0,212,255,0.4);border-radius:4px;display:flex;align-items:center;justify-content:center;"><span style="font-family:Inter;font-size:18px;color:#ffffff;">Hello World</span></div>', {
              id: "s3-placed-el",
              x: 58,
              y: 87,
              w: 233,
              h: 116
            }),
            // Coordinate labels
            el(`<span style="font-family:${MONO};font-size:14px;color:${C.accent1};line-height:1.4;">(200, 300)</span>`, {
              id: "s3-coord-tl",
              x: 58,
              y: 68,
              w: 150,
              h: 54
            }),
            el(`<span style="font-family:${MONO};font-size:14px;color:${C.accent1};line-height:1.4;">(1000, 700)</span>`, {
              id: "s3-coord-br",
              x: 233 + 58 - 10,
              y: 87 + 116 + 12,
              w: 150,
              h: 54
            })
          ], {
            id: "s3-canvas-group",
            x: right.x + right.w / 2,
            y: right.y + 80,
            w: 560,
            h: 340,
            bounds: "hug",
            anchor: "tc"
          }),
          // Caption below canvas
          caption(
            "\u201CYou say where. It goes there. No\xA0surprises.\u201D",
            "s3-caption",
            {
              x: centerHWith("s3-canvas-group"),
              y: below("s3-canvas-group", { gap: "lg" }),
              w: 500,
              anchor: "tc",
              style: { textAlign: "center", fontStyle: "italic" }
            }
          )
        ];
      })()
    },
    // ================================================================
    // SLIDE 4: WHY AI AGENTS LOVE IT — "LLMs Think in Coordinates"
    // ================================================================
    {
      id: "for-ai",
      background: C.bg,
      notes: "AI agents can reason about geometry. They cannot simulate browser layout engines. Coordinates are deterministic \u2014 same input always produces same output.",
      elements: (() => {
        const cardW = (safe.w - 80) / 2;
        return [
          // Title stack
          vstack([
            mkEyebrow("Designed for AI", "s4-eyebrow", C.accent1),
            slideTitle("LLMs Think in Coordinates", "s4-title")
          ], {
            id: "s4-title-stack",
            x: safe.x,
            y: safe.y,
            w: safe.w,
            gap: "sm",
            align: "left"
          }),
          // Two comparison cards
          hstack([
            // CSS card (bad)
            panel([
              el(`<p style="font-family:${FONT};font-size:24px;font-weight:700;color:${C.accent3};">\u274C CSS Approach</p>`, {
                id: "s4-css-heading",
                w: "fill"
              }),
              codeText(
                `display: flex;
gap: 1rem;
flex-wrap: wrap;
min-width: 200px;`,
                "s4-css-code",
                { w: "fill" }
              ),
              el(`<p style="font-family:${FONT};font-size:22px;color:${C.textSec};line-height:1.5;">\u2192 Where does it end up? \u{1F937}</p>`, {
                id: "s4-css-result",
                w: "fill"
              })
            ], {
              id: "s4-css-card",
              w: cardW,
              padding: "lg",
              gap: "md",
              fill: "rgba(255,107,157,0.06)",
              radius: 16,
              border: "1px solid rgba(255,107,157,0.2)"
            }),
            // SlideKit card (good)
            panel([
              el(`<p style="font-family:${FONT};font-size:24px;font-weight:700;color:${C.accent4};">\u2705 SlideKit Approach</p>`, {
                id: "s4-sk-heading",
                w: "fill"
              }),
              codeText(
                `x: 200, y: 300,
w: 800, h: 400`,
                "s4-sk-code",
                { w: "fill" }
              ),
              el(`<p style="font-family:${FONT};font-size:22px;color:${C.textSec};line-height:1.5;">\u2192 Exactly at (200,\xA0300). Always.</p>`, {
                id: "s4-sk-result",
                w: "fill"
              })
            ], {
              id: "s4-sk-card",
              w: cardW,
              padding: "lg",
              gap: "md",
              fill: "rgba(0,255,136,0.06)",
              radius: 16,
              border: "1px solid rgba(0,255,136,0.2)"
            })
          ], {
            id: "s4-cards",
            x: safe.x,
            y: below("s4-title-stack", { gap: "xl" }),
            w: safe.w,
            gap: "lg",
            align: "stretch"
          }),
          // Bottom quote
          el(`<p style="font-family:${FONT};font-size:24px;font-weight:400;color:${C.textTer};line-height:1.5;text-align:center;font-style:italic;">\u201CAI agents can reason about geometry. They cannot simulate browser layout engines.\u201D</p>`, {
            id: "s4-quote",
            x: safe.x,
            y: below("s4-cards", { gap: "xl" }),
            w: safe.w,
            anchor: "tl"
          })
        ];
      })()
    },
    // ================================================================
    // SLIDE 5: THE ANCHOR SYSTEM — "Nine Points of Control"
    // ================================================================
    {
      id: "anchor-system",
      background: C.bg,
      notes: "The anchor property controls which point of an element sits at (x, y). Nine anchor points give precise control: tl, tc, tr, cl, cc, cr, bl, bc, br.",
      elements: (() => {
        const anchors = [
          { key: "tl", col: 0, row: 0 },
          { key: "tc", col: 1, row: 0 },
          { key: "tr", col: 2, row: 0 },
          { key: "cl", col: 0, row: 1 },
          { key: "cc", col: 1, row: 1 },
          { key: "cr", col: 2, row: 1 },
          { key: "bl", col: 0, row: 2 },
          { key: "bc", col: 1, row: 2 },
          { key: "br", col: 2, row: 2 }
        ];
        const { left: leftR, right: rightR } = splitRect(safe, { ratio: 0.55, gap: 80 });
        const diagW = 420;
        const diagH = 260;
        const dotR = 10;
        const colSpacing = diagW / 2;
        const rowSpacing = diagH / 2;
        const diagPad = 40;
        const dotElements = [];
        const labelElements = [];
        for (const a of anchors) {
          const dx = a.col * colSpacing + diagPad;
          const dy = a.row * rowSpacing + diagPad;
          const dotId = `s5-dot-${a.key}`;
          const labelId = `s5-label-${a.key}`;
          dotElements.push(
            el(`<div style="width:${dotR * 2}px;height:${dotR * 2}px;border-radius:50%;background:${C.accent1};box-shadow:0 0 8px ${C.accent1};"></div>`, {
              id: dotId,
              x: dx - dotR,
              y: dy - dotR,
              w: dotR * 2,
              h: dotR * 2
            })
          );
          labelElements.push(
            el(`<span style="font-family:${MONO};font-size:16px;color:${C.text};">${a.key}</span>`, {
              id: labelId,
              x: dx + dotR + 10,
              y: dy - 8,
              w: 40,
              h: 20
            })
          );
        }
        const diagBg = el(
          '<div style="width:100%;height:100%;border:1px solid rgba(255,255,255,0.12);border-radius:8px;background:rgba(255,255,255,0.02);"></div>',
          {
            id: "s5-diag-bg",
            x: diagPad - 30,
            y: diagPad - 30,
            w: diagW + 60,
            h: diagH + 60
          }
        );
        const demoAnchors = ["tl", "cc", "br"];
        const demoW = 220;
        const demoH = 150;
        const blueW = 90;
        const blueH = 60;
        const demoGroups = [];
        const dotRelX = demoW / 2;
        const dotRelY = demoH / 2;
        for (let i = 0; i < demoAnchors.length; i++) {
          const ak = demoAnchors[i];
          const groupId = `s3-anchor-demo-${i}`;
          const container = el('<div style="width:100%;height:100%;border:1px solid rgba(255,255,255,0.12);border-radius:4px;background:rgba(255,255,255,0.05);"></div>', {
            id: `${groupId}-bg`,
            x: 0,
            y: 0,
            w: demoW,
            h: demoH
          });
          const dot = el(`<div style="width:12px;height:12px;border-radius:50%;background:${C.accent3};box-shadow:0 0 8px ${C.accent3};position:relative;z-index:2;"></div>`, {
            id: `${groupId}-dot`,
            x: dotRelX - 6,
            y: dotRelY - 6,
            w: 12,
            h: 12
          });
          const blueBox = el('<div style="width:100%;height:100%;background:rgba(0,212,255,0.2);border:1px solid rgba(0,212,255,0.5);border-radius:3px;"></div>', {
            id: `${groupId}-blue`,
            x: dotRelX,
            y: dotRelY,
            w: blueW,
            h: blueH,
            anchor: ak
          });
          const label = el(`<span style="font-family:${MONO};font-size:18px;color:${C.accent1};text-align:center;display:block;">anchor: '${ak}'</span>`, {
            id: `${groupId}-label`,
            x: 0,
            y: demoH + 12,
            w: demoW,
            h: 28
          });
          demoGroups.push(
            group([container, blueBox, dot, label], {
              id: groupId,
              x: 0,
              y: below("s5-demo-heading", { gap: "lg" }),
              w: demoW,
              h: demoH + 12 + 28
            })
          );
        }
        return [
          // Title area
          vstack([
            mkEyebrow("Positioning", "s5-eyebrow", C.accent1),
            slideTitle("The Anchor System", "s5-title"),
            bodyText("Nine points of control for precise element placement", "s5-subtitle")
          ], {
            id: "s5-title-stack",
            x: safe.x,
            y: safe.y,
            w: safe.w,
            gap: "sm",
            align: "left"
          }),
          // Anchor diagram group
          group([diagBg, ...dotElements, ...labelElements], {
            id: "s5-diagram",
            x: leftR.x + leftR.w / 2,
            y: below("s5-title-stack", { gap: "xl" }),
            w: diagW + 60 + diagPad,
            h: diagH + 60 + diagPad,
            bounds: "hug",
            anchor: "tc"
          }),
          // Caption below diagram
          caption(
            "Each anchor determines which point of the element sits at (x, y)",
            "s5-diagram-caption",
            {
              x: centerHWith("s5-diagram"),
              y: below("s5-diagram", { gap: "md" }),
              w: 500,
              anchor: "tc",
              style: { textAlign: "center" }
            }
          ),
          // Right side: three demo examples
          el(`<p style="font-family:${FONT};font-size:28px;font-weight:600;color:${C.text};">Same (x, y), different anchor:</p>`, {
            id: "s5-demo-heading",
            x: rightR.x,
            y: below("s5-title-stack", { gap: "xl" }),
            w: rightR.w,
            h: 40
          }),
          ...demoGroups
        ];
      })(),
      transforms: [
        alignTop(["s3-anchor-demo-0", "s3-anchor-demo-1", "s3-anchor-demo-2"]),
        distributeH(["s3-anchor-demo-0", "s3-anchor-demo-1", "s3-anchor-demo-2"], {
          startX: safe.x + safe.w * 0.55 + 80,
          endX: safe.x + safe.w
        })
      ]
    },
    // ================================================================
    // SLIDE 6: RELATIVE POSITIONING — "Elements That Know About Each Other"
    // ================================================================
    {
      id: "relative-positioning",
      background: C.bgAlt,
      notes: "SlideKit resolves relative positions through a dependency graph with topological sort.",
      elements: (() => {
        const boxW = 140;
        const boxH = 70;
        const mkBox = (label, id, color) => el(`<div style="width:100%;height:100%;background:rgba(${color},0.15);border:2px solid ${color};border-radius:8px;display:flex;align-items:center;justify-content:center;"><span style="font-family:${MONO};font-size:22px;font-weight:700;color:${color};">${label}</span></div>`, { id, w: boxW, h: boxH });
        const codeLabel = (text, id, color, extra = {}) => el(`<span style="font-family:${MONO};font-size:15px;color:${color};">${text}</span>`, { id, w: 340, h: 22, ...extra });
        const ciRect = { x: 1400, y: 740, w: 260, h: 140 };
        const ciPos = centerIn(ciRect);
        return [
          // Title
          vstack([
            mkEyebrow("Relative Positioning", "s6-eyebrow", C.accent1),
            slideTitle("Elements That Know About Each Other", "s6-title")
          ], {
            id: "s6-title-stack",
            x: safe.x,
            y: safe.y,
            w: safe.w,
            gap: "sm",
            align: "left"
          }),
          // Box A — fixed anchor
          (() => {
            const b = mkBox("A", "s6-boxA", C.accent1);
            b.props.x = 700;
            b.props.y = 480;
            return b;
          })(),
          // Box B — below A
          (() => {
            const b = mkBox("B", "s6-boxB", C.accent2);
            b.props.x = 700;
            b.props.y = below("s6-boxA", { gap: 150 });
            return b;
          })(),
          // Box C — right of A, aligned top with A
          (() => {
            const b = mkBox("C", "s6-boxC", C.accent3);
            b.props.x = rightOf("s6-boxA", { gap: 40 });
            b.props.y = alignTopWith("s6-boxA");
            return b;
          })(),
          // Box D — left of A, above A
          (() => {
            const b = mkBox("D", "s6-boxD", C.accent4);
            b.props.x = leftOf("s6-boxA", { gap: 40 });
            b.props.y = above("s6-boxA", { gap: 24 });
            return b;
          })(),
          // Box E — placed between A and B, offset right
          (() => {
            const b = mkBox("E", "s6-boxE", "rgba(255,255,255,0.6)");
            b.props.x = 700;
            b.props.y = placeBetween("s6-boxA", "s6-boxB");
            return b;
          })(),
          // Connectors
          connect("s6-boxA", "s6-boxB", {
            id: "s6-connAB",
            type: "elbow",
            fromAnchor: "cl",
            toAnchor: "cl",
            arrow: "end",
            color: C.accent2,
            thickness: 2
          }),
          connect("s6-boxA", "s6-boxC", {
            id: "s6-connAC",
            type: "straight",
            arrow: "end",
            color: C.accent3,
            thickness: 2
          }),
          // Code labels next to each box
          codeLabel("below('A', {gap:150})", "s6-labelB", C.accent2, {
            x: leftOf("s6-boxB", { gap: 16 }),
            y: alignTopWith("s6-boxB"),
            style: { textAlign: "right" }
          }),
          codeLabel("rightOf('A') + alignTopWith('A')", "s6-labelC", C.accent3, {
            x: rightOf("s6-boxC", { gap: 16 }),
            y: alignTopWith("s6-boxC")
          }),
          codeLabel("leftOf('A') + above('A')", "s6-labelD", C.accent4, {
            x: leftOf("s6-boxD", { gap: 16 }),
            y: alignTopWith("s6-boxD"),
            style: { textAlign: "right" }
          }),
          codeLabel("placeBetween('A', 'B')", "s6-labelE", C.textSec, {
            x: rightOf("s6-boxE", { gap: 16 }),
            y: alignTopWith("s6-boxE")
          }),
          // centerIn() demo — outlined rect with centered label
          el('<div style="width:100%;height:100%;border:2px dashed rgba(0,212,255,0.3);border-radius:8px;"></div>', {
            id: "s6-centerRect",
            x: ciRect.x,
            y: ciRect.y,
            w: ciRect.w,
            h: ciRect.h
          }),
          el(`<span style="font-family:${MONO};font-size:16px;color:${C.accent1};text-align:center;display:block;">centerIn(rect)</span>`, {
            id: "s6-centerLabel",
            x: ciPos.x,
            y: ciPos.y,
            w: 160,
            h: 24,
            anchor: "cc"
          }),
          // Caption for centerIn
          caption("Position a label dead-center inside any rect", "s6-centerCaption", {
            x: ciRect.x,
            y: ciRect.y + ciRect.h + 12,
            w: ciRect.w,
            h: 22,
            style: { textAlign: "center" }
          })
        ];
      })()
    },
    // ================================================================
    // SLIDE 7: STACK LAYOUTS — "Vertical & Horizontal Flow"
    // ================================================================
    {
      id: "stack-layouts",
      background: C.bg,
      notes: "Stacks resolve to absolute coordinates \u2014 they're syntactic sugar over the coordinate system, not CSS flexbox.",
      elements: (() => {
        const { left, right } = splitRect(safe, { ratio: 0.48, gap: 60 });
        const bar = (id, color, w, h) => el(`<div style="width:100%;height:100%;background:${color};border-radius:4px;"></div>`, { id, w, h });
        const sectionLabel = (text, id, color, extra = {}) => el(`<p style="font-family:${FONT};font-size:28px;font-weight:700;color:${color};">${text}</p>`, { id, w: 300, h: 36, ...extra });
        const modeLabel = (text, id) => el(`<span style="font-family:${MONO};font-size:14px;color:${C.textTer};">${text}</span>`, { id, w: 120, h: 20 });
        const vstackAligns = ["left", "center", "right", "stretch"];
        const vstackDemos = [];
        const vstackPanelIds = [];
        for (let i = 0; i < vstackAligns.length; i++) {
          const align = vstackAligns[i];
          const panelId = `s7-vs-panel-${align}`;
          vstackPanelIds.push(panelId);
          vstackDemos.push(
            panel([
              modeLabel(align, `s7-vs-lbl-${align}`),
              vstack([
                bar(`s7-vs-${align}-a`, C.accent1, 100, 16),
                bar(`s7-vs-${align}-b`, C.accent2, 60, 16),
                bar(`s7-vs-${align}-c`, C.accent3, 130, 16)
              ], {
                id: `s7-vs-${align}`,
                w: 160,
                gap: 8,
                align
              })
            ], {
              id: panelId,
              w: left.w,
              padding: "sm",
              gap: 8,
              fill: C.glass,
              radius: 12,
              border: `1px solid ${C.glassBorder}`
            })
          );
        }
        const hstackAligns = ["top", "middle", "bottom", "stretch"];
        const hstackDemos = [];
        for (let i = 0; i < hstackAligns.length; i++) {
          const align = hstackAligns[i];
          hstackDemos.push(
            panel([
              modeLabel(align, `s7-hs-lbl-${align}`),
              hstack([
                bar(`s7-hs-${align}-a`, C.accent1, 30, 50),
                bar(`s7-hs-${align}-b`, C.accent2, 30, 30),
                bar(`s7-hs-${align}-c`, C.accent3, 30, 70)
              ], {
                id: `s7-hs-${align}`,
                h: 80,
                gap: 8,
                align
              })
            ], {
              id: `s7-hs-panel-${align}`,
              w: right.w,
              padding: "sm",
              gap: 8,
              fill: C.glass,
              radius: 12,
              border: `1px solid ${C.glassBorder}`
            })
          );
        }
        return [
          // Title
          vstack([
            mkEyebrow("Stack Layouts", "s7-eyebrow", C.accent1),
            slideTitle("Vertical & Horizontal Flow", "s7-title")
          ], {
            id: "s7-title-stack",
            x: safe.x,
            y: safe.y,
            w: safe.w,
            gap: "sm",
            align: "left"
          }),
          // Left column: vstack demos
          sectionLabel("vstack", "s7-vs-heading", C.accent1, {
            x: left.x,
            y: below("s7-title-stack", { gap: "xl" })
          }),
          vstack(vstackDemos, {
            id: "s7-vs-demos",
            x: left.x,
            y: below("s7-vs-heading", { gap: "md" }),
            w: left.w,
            gap: "sm",
            align: "left"
          }),
          // Right column: hstack demos
          sectionLabel("hstack", "s7-hs-heading", C.accent2, {
            x: right.x,
            y: below("s7-title-stack", { gap: "xl" })
          }),
          vstack(hstackDemos, {
            id: "s7-hs-demos",
            x: right.x,
            y: below("s7-hs-heading", { gap: "md" }),
            w: right.w,
            gap: "sm",
            align: "left"
          })
        ];
      })(),
      transforms: [
        matchWidth(["s7-vs-panel-left", "s7-vs-panel-center", "s7-vs-panel-right", "s7-vs-panel-stretch"])
      ]
    },
    // ================================================================
    // SLIDE 8: TRANSFORMS — "PowerPoint-Style Precision"
    // ================================================================
    {
      id: "transforms",
      background: C.bg,
      notes: "Transforms run in Phase 3 of the layout pipeline, after positions are resolved.",
      elements: (() => {
        const colW = 200;
        const beforeY = 340;
        const afterY = 680;
        const makeRect = (id, color, x, y, w, h) => el(`<div style="width:100%;height:100%;background:${color};border-radius:6px;opacity:0.85;"></div>`, { id, x, y, w, h });
        const fitRect = { x: safe.x + safe.w - 400, y: 380, w: 340, h: 280 };
        return [
          // Title
          vstack([
            mkEyebrow("Transforms", "s8-eyebrow", C.accent1),
            slideTitle("PowerPoint-Style Precision", "s8-title")
          ], {
            id: "s8-title-stack",
            x: safe.x,
            y: safe.y,
            w: safe.w,
            gap: "sm",
            align: "left"
          }),
          // BEFORE label
          el(`<p style="font-family:${FONT};font-size:22px;font-weight:700;color:${C.accent3};text-transform:uppercase;letter-spacing:2px;">Before</p>`, {
            id: "s8-before-label",
            x: safe.x,
            y: beforeY - 40,
            w: 200,
            h: 30
          }),
          // Before: 3 misaligned rectangles
          makeRect("s8-before1", "rgba(0,212,255,0.25)", safe.x, beforeY, 180, 100),
          makeRect("s8-before2", "rgba(124,92,191,0.25)", safe.x + 220, beforeY + 30, 240, 70),
          makeRect("s8-before3", "rgba(255,107,157,0.25)", safe.x + 500, beforeY + 15, 160, 120),
          // AFTER label
          el(`<p style="font-family:${FONT};font-size:22px;font-weight:700;color:${C.accent4};text-transform:uppercase;letter-spacing:2px;">After</p>`, {
            id: "s8-after-label",
            x: safe.x,
            y: afterY - 40,
            w: 200,
            h: 30
          }),
          // After: 3 rectangles (transforms will align & distribute them)
          makeRect("s8-after1", "rgba(0,212,255,0.4)", safe.x, afterY, 180, 100),
          makeRect("s8-after2", "rgba(124,92,191,0.4)", safe.x + 220, afterY + 30, 240, 70),
          makeRect("s8-after3", "rgba(255,107,157,0.4)", safe.x + 500, afterY + 15, 160, 120),
          // Elbow connectors from before to after
          connect("s8-before1", "s8-after1", {
            id: "s8-conn1",
            type: "elbow",
            arrow: "end",
            color: C.textTer,
            thickness: 1,
            dash: [4, 4]
          }),
          connect("s8-before2", "s8-after2", {
            id: "s8-conn2",
            type: "elbow",
            arrow: "end",
            color: C.textTer,
            thickness: 1,
            dash: [4, 4]
          }),
          connect("s8-before3", "s8-after3", {
            id: "s8-conn3",
            type: "elbow",
            arrow: "end",
            color: C.textTer,
            thickness: 1,
            dash: [4, 4]
          }),
          // Transform code annotation
          el(`<pre style="font-family:${MONO};font-size:16px;color:${C.accent4};line-height:1.6;margin:0;">transforms: [
  alignTop([...]),
  distributeH([...]),
  matchHeight([...])
]</pre>`, {
            id: "s8-code-annotation",
            x: safe.x,
            y: afterY + 140,
            w: 340,
            h: 90
          }),
          // fitToRect demo
          el('<div style="width:100%;height:100%;border:2px dashed rgba(0,212,255,0.3);border-radius:8px;"></div>', {
            id: "s8-fit-outline",
            x: fitRect.x,
            y: fitRect.y,
            w: fitRect.w,
            h: fitRect.h
          }),
          el(`<p style="font-family:${FONT};font-size:20px;font-weight:600;color:${C.accent1};text-transform:uppercase;letter-spacing:2px;">fitToRect()</p>`, {
            id: "s8-fit-label",
            x: fitRect.x,
            y: fitRect.y - 36,
            w: 200,
            h: 28
          }),
          makeRect("s8-fit-a", "rgba(0,212,255,0.3)", fitRect.x + 20, fitRect.y + 20, 80, 60),
          makeRect("s8-fit-b", "rgba(124,92,191,0.3)", fitRect.x + 120, fitRect.y + 50, 100, 40),
          makeRect("s8-fit-c", "rgba(255,107,157,0.3)", fitRect.x + 240, fitRect.y + 30, 60, 80)
        ];
      })(),
      transforms: [
        alignTop(["s8-after1", "s8-after2", "s8-after3"]),
        distributeH(["s8-after1", "s8-after2", "s8-after3"], {
          startX: safe.x,
          endX: safe.x + safe.w * 0.55
        }),
        matchHeight(["s8-after1", "s8-after2", "s8-after3"]),
        fitToRect(["s8-fit-a", "s8-fit-b", "s8-fit-c"], {
          x: safe.x + safe.w - 400 + 20,
          y: 400,
          w: 300,
          h: 240
        })
      ]
    },
    // ================================================================
    // SLIDE 9: PANELS & CARD GRIDS — "Structured Content"
    // ================================================================
    {
      id: "panels-card-grids",
      background: C.bgAlt,
      notes: "cardGrid automatically equalizes heights per row for consistent visual rhythm.",
      elements: (() => {
        const spacing = getSpacing("lg");
        const shadow = resolveShadow("md");
        const cards = [
          { title: "Measurement", color: C.accent1, desc: "Every element has a resolved bounding box. Query positions, check overlaps, validate alignment." },
          { title: "Validation", color: C.accent2, desc: "Built-in warnings for overflow, overlap, tiny text, and missing fonts \u2014 before you render." },
          { title: "Layering", color: C.accent3, desc: "Explicit layer ordering: bg \u2192 default \u2192 fg \u2192 overlay. No z-index guessing games." },
          { title: "Speaker Notes", color: C.accent4, desc: "Attach notes to any slide. Rendered in presenter view, excluded from PDF export." },
          { title: "Debug Overlay", color: C.accent1, desc: "Toggle bounding-box outlines, safe-zone markers, and element IDs for rapid debugging." },
          { title: "Theming", color: C.accent2, desc: "Define design tokens once. Reference them everywhere. Change the palette in one place." }
        ];
        const cardElements = cards.map(
          (card, i) => panel([
            // Colored accent bar at top
            el(`<div style="width:100%;height:100%;background:${card.color};border-radius:3px;"></div>`, {
              id: `s9-card${i}-bar`,
              w: "fill",
              h: 4
            }),
            // Card title
            el(`<p style="font-family:${FONT};font-size:22px;font-weight:700;color:${C.text};">${card.title}</p>`, {
              id: `s9-card${i}-title`,
              w: "fill"
            }),
            // Thin divider
            el(`<div style="width:100%;height:1px;background:${C.glassBorder};"></div>`, {
              id: `s9-card${i}-divider`,
              w: "fill",
              h: 1
            }),
            // Description
            el(`<p style="font-family:${FONT};font-size:18px;color:${C.textSec};line-height:1.5;">${card.desc}</p>`, {
              id: `s9-card${i}-desc`,
              w: "fill"
            })
          ], {
            id: `s9-card${i}`,
            w: (safe.w - spacing * 2) / 3,
            padding: "lg",
            gap: "sm",
            fill: C.glassEmph,
            radius: 16,
            border: `1px solid ${C.glassEmphBorder}`,
            shadow
          })
        );
        return [
          // Title
          vstack([
            mkEyebrow("Structured Content", "s9-eyebrow", C.accent1),
            slideTitle("Panels & Card Grids", "s9-title")
          ], {
            id: "s9-title-stack",
            x: safe.x,
            y: safe.y,
            w: safe.w,
            gap: "sm",
            align: "left"
          }),
          // Card grid
          cardGrid(cardElements, {
            id: "s9-grid",
            cols: 3,
            gap: "lg",
            x: safe.x,
            y: below("s9-title-stack", { gap: "xl" }),
            w: safe.w
          })
        ];
      })()
    },
    // ================================================================
    // SLIDE 10: CONNECTORS — "Draw Relationships"
    // ================================================================
    {
      id: "connectors",
      background: C.bg,
      notes: "Connectors render as SVG paths. They resolve their endpoints from the scene graph after layout solve.",
      elements: (() => {
        const pipeBoxW = 220;
        const pipeBoxH = 80;
        const subBoxW = 160;
        const subBoxH = 56;
        const pipeBox = (label, id, color) => el(`<div style="width:100%;height:100%;background:rgba(${color});border:2px solid ${color};border-radius:12px;display:flex;align-items:center;justify-content:center;"><span style="font-family:${FONT};font-size:22px;font-weight:700;color:${C.text};">${label}</span></div>`, { id, w: pipeBoxW, h: pipeBoxH });
        const subBox = (label, id, borderColor) => el(`<div style="width:100%;height:100%;background:${C.glass};border:1px solid ${borderColor};border-radius:8px;display:flex;align-items:center;justify-content:center;"><span style="font-family:${FONT};font-size:18px;font-weight:600;color:${C.textSec};">${label}</span></div>`, { id, w: subBoxW, h: subBoxH });
        return [
          // Title
          vstack([
            mkEyebrow("Connectors", "s10-eyebrow", C.accent1),
            slideTitle("Draw Relationships", "s10-title")
          ], {
            id: "s10-title-stack",
            x: safe.x,
            y: safe.y,
            w: safe.w,
            gap: "sm",
            align: "left"
          }),
          // Pipeline: three main boxes in hstack
          hstack([
            pipeBox("Specify", "s10-specify", C.accent1),
            pipeBox("Layout Solve", "s10-layout", C.accent2),
            pipeBox("Render", "s10-render", C.accent3)
          ], {
            id: "s10-pipeline",
            x: safe.x + safe.w / 2,
            y: below("s10-title-stack", { gap: "xl" }),
            w: safe.w * 0.85,
            anchor: "tc",
            gap: 80,
            align: "middle"
          }),
          // Straight connector: Specify → Layout
          connect("s10-specify", "s10-layout", {
            id: "s10-conn-straight",
            type: "straight",
            arrow: "end",
            color: C.accent1,
            thickness: 2,
            label: "straight",
            labelStyle: { fontFamily: MONO, fontSize: "13px", color: C.textTer }
          }),
          // Curved connector: Layout → Render
          connect("s10-layout", "s10-render", {
            id: "s10-conn-curved",
            type: "curved",
            arrow: "end",
            color: C.accent2,
            thickness: 2,
            label: "curved",
            labelStyle: { fontFamily: MONO, fontSize: "13px", color: C.textTer }
          }),
          // Sub-boxes below Layout
          (() => {
            const b = subBox("Warnings", "s10-warnings", C.accent4);
            b.props.x = centerHWith("s10-layout");
            b.props.y = below("s10-pipeline", { gap: 100 });
            b.props.anchor = "tc";
            return b;
          })(),
          (() => {
            const b = subBox("Errors", "s10-errors", C.accent3);
            b.props.x = rightOf("s10-warnings", { gap: 40 });
            b.props.y = centerVWith("s10-warnings");
            return b;
          })(),
          // Elbow connector: Layout → Warnings (dashed)
          connect("s10-layout", "s10-warnings", {
            id: "s10-conn-warn",
            type: "elbow",
            arrow: "end",
            color: C.accent4,
            thickness: 2,
            dash: [6, 4],
            fromAnchor: "bc",
            toAnchor: "tc"
          }),
          // Elbow connector: Layout → Errors
          connect("s10-layout", "s10-errors", {
            id: "s10-conn-err",
            type: "elbow",
            arrow: "end",
            color: C.accent3,
            thickness: 2,
            fromAnchor: "bc",
            toAnchor: "tc",
            label: "elbow",
            labelStyle: { fontFamily: MONO, fontSize: "13px", color: C.textTer }
          }),
          // Connector type legend at bottom
          caption(
            "Three connector types: straight \xB7 curved \xB7 elbow  \u2014  with arrow, dash & label options",
            "s10-legend",
            {
              x: safe.x + safe.w / 2,
              y: below("s10-warnings", { gap: "xl" }),
              w: 700,
              h: 28,
              anchor: "tc",
              style: { textAlign: "center" }
            }
          )
        ];
      })()
    },
    // ================================================================
    // SLIDE 11: GRID, SNAP & REPEAT — "Consistent Alignment"
    // ================================================================
    {
      id: "grid-snap-repeat",
      background: C.bgAlt,
      notes: "The grid system provides consistent alignment. Snap rounds to pixel grid. Repeat clones elements.",
      elements: (() => {
        const g = grid({ cols: 12, gutter: 30 });
        return [
          // Title
          vstack([
            mkEyebrow("Utilities", "s11-eyebrow", C.accent1),
            slideTitle("Grid, Snap & Repeat", "s11-title")
          ], {
            id: "s11-title-stack",
            x: safe.x,
            y: safe.y,
            w: safe.w,
            gap: "sm",
            align: "left"
          }),
          // --- Section 1: grid() ---
          el(`<p style="font-family:${FONT};font-size:28px;font-weight:600;color:${C.text};">grid()</p>`, {
            id: "s11-grid-heading",
            x: safe.x,
            y: below("s11-title-stack", { gap: "lg" }),
            w: 200,
            h: 36
          }),
          // Grid demo: colored column bands
          group([
            // Full 12-column bar (background)
            el('<div style="width:100%;height:100%;background:rgba(255,255,255,0.04);border-radius:6px;"></div>', {
              id: "s11-grid-bg",
              x: 0,
              y: 0,
              w: safe.w,
              h: 50
            }),
            // Span 1-4 (cyan) — subtract marginLeft since children are relative to group
            el(`<div style="width:100%;height:100%;background:rgba(0,140,180,0.5);border:1px solid rgba(0,212,255,0.4);border-radius:4px;display:flex;align-items:center;justify-content:center;"><span style="font-family:${MONO};font-size:14px;color:#ffffff;">cols 1\u20134</span></div>`, {
              id: "s11-span1",
              x: g.col(1) - g.marginLeft,
              y: 4,
              w: g.spanW(1, 4),
              h: 42
            }),
            // Span 5-8 (violet)
            el(`<div style="width:100%;height:100%;background:rgba(124,92,191,0.2);border:1px solid rgba(124,92,191,0.4);border-radius:4px;display:flex;align-items:center;justify-content:center;"><span style="font-family:${MONO};font-size:14px;color:#ffffff;">cols 5\u20138</span></div>`, {
              id: "s11-span2",
              x: g.col(5) - g.marginLeft,
              y: 4,
              w: g.spanW(5, 8),
              h: 42
            }),
            // Span 9-12 (coral)
            el(`<div style="width:100%;height:100%;background:rgba(180,60,100,0.5);border:1px solid rgba(255,107,157,0.4);border-radius:4px;display:flex;align-items:center;justify-content:center;"><span style="font-family:${MONO};font-size:14px;color:#ffffff;">cols 9\u201312</span></div>`, {
              id: "s11-span3",
              x: g.col(9) - g.marginLeft,
              y: 4,
              w: g.spanW(9, 12),
              h: 42
            })
          ], {
            id: "s11-grid-demo",
            x: safe.x,
            y: below("s11-grid-heading", { gap: "sm" }),
            w: safe.w,
            h: 50
          }),
          // Code caption for grid
          caption(
            "grid({ cols: 12, gutter: 30 })  \u2192  g.col(1), g.spanW(1, 4)",
            "s11-grid-caption",
            {
              x: safe.x,
              y: below("s11-grid-demo", { gap: "sm" }),
              w: safe.w,
              h: 24
            }
          ),
          // --- Section 2: snap() ---
          el(`<p style="font-family:${FONT};font-size:28px;font-weight:600;color:${C.text};">snap()</p>`, {
            id: "s11-snap-heading",
            x: safe.x,
            y: below("s11-grid-caption", { gap: "lg" }),
            w: 200,
            h: 36
          }),
          hstack([
            // 157 → 160
            panel([
              el(`<p style="font-family:${MONO};font-size:22px;color:${C.textSec};text-align:center;"><span style="color:${C.accent3};">157</span> \u2192 <span style="color:${C.accent4};">160</span></p>`, {
                id: "s11-snap-val1",
                w: "fill"
              })
            ], {
              id: "s11-snap-panel1",
              w: 220,
              padding: "sm",
              fill: C.glass,
              radius: 12,
              border: `1px solid ${C.glassBorder}`
            }),
            // Arrow
            el(`<span style="font-family:${MONO};font-size:24px;color:${C.textTer};">snap(v, 10)</span>`, {
              id: "s11-snap-arrow",
              w: 200,
              h: 40
            }),
            // 243 → 240
            panel([
              el(`<p style="font-family:${MONO};font-size:22px;color:${C.textSec};text-align:center;"><span style="color:${C.accent3};">243</span> \u2192 <span style="color:${C.accent4};">240</span></p>`, {
                id: "s11-snap-val2",
                w: "fill"
              })
            ], {
              id: "s11-snap-panel2",
              w: 220,
              padding: "sm",
              fill: C.glass,
              radius: 12,
              border: `1px solid ${C.glassBorder}`
            })
          ], {
            id: "s11-snap-row",
            x: safe.x,
            y: below("s11-snap-heading", { gap: "sm" }),
            gap: "md",
            align: "middle"
          }),
          caption(
            "snap(157, 10) \u2192 160   |   snap(243, 10) \u2192 240",
            "s11-snap-caption",
            {
              x: safe.x,
              y: below("s11-snap-row", { gap: "sm" }),
              w: safe.w,
              h: 24
            }
          ),
          // --- Section 3: repeat() ---
          el(`<p style="font-family:${FONT};font-size:28px;font-weight:600;color:${C.text};">repeat()</p>`, {
            id: "s11-repeat-heading",
            x: safe.x,
            y: below("s11-snap-caption", { gap: "lg" }),
            w: 200,
            h: 36
          }),
          // 4×3 dot grid via repeat()
          (() => {
            const rg = repeat(
              el(`<div style="width:100%;height:100%;border-radius:50%;background:${C.accent1};opacity:0.6;"></div>`, {
                id: "s11-repeat-dot",
                w: 14,
                h: 14
              }),
              { count: 12, cols: 4, gapX: 28, gapY: 28 }
            );
            rg.id = "s11-dot-grid";
            rg.props.x = safe.x;
            rg.props.y = below("s11-repeat-heading", { gap: "sm" });
            return rg;
          })(),
          caption(
            "repeat(dot, { count: 12, cols: 4, gapX: 28, gapY: 28 })",
            "s11-repeat-caption",
            {
              x: safe.x,
              y: below("s11-dot-grid", { gap: "sm" }),
              w: safe.w,
              h: 24
            }
          )
        ];
      })()
    },
    // ================================================================
    // SLIDE 12: FIGURES — "Structured Visual Containers"
    // ================================================================
    {
      id: "figures",
      background: C.bg,
      notes: "Figures wrap images with structured containers, padding, and optional captions.",
      elements: (() => {
        const placeholderSvg = "data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 400 300%22%3E%3Crect fill=%22%2300d4ff%22 width=%22400%22 height=%22300%22 opacity=%220.3%22/%3E%3C/svg%3E";
        return [
          // Title
          vstack([
            mkEyebrow("Compound Elements", "s12-eyebrow", C.accent1),
            slideTitle("Figures", "s12-title"),
            bodyText("Structured visual containers with padding, radius & captions", "s12-subtitle")
          ], {
            id: "s12-title-stack",
            x: safe.x,
            y: safe.y,
            w: safe.w,
            gap: "sm",
            align: "left"
          }),
          // Three figures in hstack
          hstack([
            // Figure 1: basic with containerFill
            figure({
              id: "s12-fig1",
              src: placeholderSvg,
              w: 320,
              h: 240,
              containerFill: "rgba(0,212,255,0.08)"
            }),
            // Figure 2: with radius and padding
            figure({
              id: "s12-fig2",
              src: placeholderSvg,
              w: 320,
              h: 240,
              containerFill: "rgba(124,92,191,0.08)",
              containerRadius: 16,
              containerPadding: 16
            }),
            // Figure 3: with caption and captionGap
            figure({
              id: "s12-fig3",
              src: placeholderSvg,
              w: 320,
              h: 240,
              containerFill: "rgba(0,255,136,0.08)",
              containerRadius: 12,
              containerPadding: 12,
              caption: `<span style="font-family:${FONT};font-size:16px;color:${C.textSec};">Fig 3 \u2014 with caption</span>`,
              captionGap: 12
            })
          ], {
            id: "s12-figures-row",
            x: safe.x,
            y: below("s12-title-stack", { gap: "xl" }),
            w: safe.w,
            gap: "lg",
            align: "top"
          }),
          // Labels beneath each figure
          caption("containerFill", "s12-label1", {
            x: safe.x + 160,
            y: below("s12-figures-row", { gap: "sm" }),
            w: 320,
            h: 24,
            anchor: "tc",
            style: { textAlign: "center" }
          }),
          caption("containerRadius + Padding", "s12-label2", {
            x: safe.x + 160 + 320 + getSpacing("lg"),
            y: below("s12-figures-row", { gap: "sm" }),
            w: 320,
            h: 24,
            anchor: "tc",
            style: { textAlign: "center" }
          }),
          caption("caption + captionGap", "s12-label3", {
            x: safe.x + 160 + (320 + getSpacing("lg")) * 2,
            y: below("s12-figures-row", { gap: "sm" }),
            w: 320,
            h: 24,
            anchor: "tc",
            style: { textAlign: "center" }
          }),
          // Anatomy section: annotation lines
          group([
            // Container outline
            el('<div style="width:100%;height:100%;border:2px dashed rgba(0,212,255,0.3);border-radius:12px;"></div>', {
              id: "s12-anatomy-outline",
              x: 0,
              y: 0,
              w: 400,
              h: 260
            }),
            // Padding area
            el('<div style="width:100%;height:100%;border:1px dashed rgba(124,92,191,0.4);border-radius:8px;background:rgba(124,92,191,0.05);"></div>', {
              id: "s12-anatomy-padding",
              x: 16,
              y: 16,
              w: 368,
              h: 196
            }),
            // Image placeholder
            el(`<div style="width:100%;height:100%;background:rgba(0,120,160,0.5);border-radius:4px;display:flex;align-items:center;justify-content:center;"><span style="font-family:${MONO};font-size:14px;color:#ffffff;">image</span></div>`, {
              id: "s12-anatomy-image",
              x: 28,
              y: 28,
              w: 344,
              h: 172
            }),
            // Caption area
            el(`<div style="width:100%;height:100%;background:rgba(255,255,255,0.04);border-radius:4px;display:flex;align-items:center;justify-content:center;"><span style="font-family:${MONO};font-size:14px;color:${C.textTer};">caption</span></div>`, {
              id: "s12-anatomy-caption",
              x: 16,
              y: 228,
              w: 368,
              h: 24
            }),
            // Labels
            el(`<span style="font-family:${MONO};font-size:13px;color:${C.accent1};">containerFill</span>`, {
              id: "s12-anatomy-lbl1",
              x: 410,
              y: 4,
              w: 120,
              h: 18
            }),
            el(`<span style="font-family:${MONO};font-size:13px;color:${C.accent2};">containerPadding</span>`, {
              id: "s12-anatomy-lbl2",
              x: 410,
              y: 40,
              w: 140,
              h: 18
            }),
            el(`<span style="font-family:${MONO};font-size:13px;color:${C.textTer};">captionGap</span>`, {
              id: "s12-anatomy-lbl3",
              x: 410,
              y: 218,
              w: 100,
              h: 18
            })
          ], {
            id: "s12-anatomy",
            x: safe.x + safe.w - 600,
            y: below("s12-label1", { gap: "lg" }),
            w: 560,
            h: 270,
            bounds: "hug"
          })
        ];
      })()
    },
    // ================================================================
    // SLIDE 13: STYLING — "You Own the Pixels"
    // ================================================================
    {
      id: "styling",
      background: C.bg,
      notes: "SlideKit passes through all CSS except properties that conflict with the coordinate system.",
      elements: (() => {
        const cardW = (safe.w - getSpacing("lg")) / 2;
        return [
          // Title
          vstack([
            mkEyebrow("Visual Design", "s13-eyebrow", C.accent1),
            slideTitle("You Own the Pixels", "s13-title")
          ], {
            id: "s13-title-stack",
            x: safe.x,
            y: safe.y,
            w: safe.w,
            gap: "sm",
            align: "left"
          }),
          // 2×2 card grid
          cardGrid([
            // Card 1: Gradient backgrounds
            panel([
              el(`<p style="font-family:${FONT};font-size:22px;font-weight:600;color:${C.text};margin-bottom:12px;">Gradients</p>`, {
                id: "s13-grad-label",
                w: "fill"
              }),
              el('<div style="width:100%;height:100%;background:linear-gradient(135deg, #00d4ff 0%, #7c5cbf 50%, #ff6b9d 100%);border-radius:8px;"></div>', {
                id: "s13-grad-demo",
                w: "fill",
                h: 80
              }),
              el('<div style="width:100%;height:100%;background:linear-gradient(90deg, #0a0a1a, #00ff88, #0a0a1a);border-radius:8px;"></div>', {
                id: "s13-grad-demo2",
                w: "fill",
                h: 40
              })
            ], {
              id: "s13-card-grad",
              w: cardW,
              padding: "md",
              gap: "sm",
              fill: C.glass,
              radius: 16,
              border: `1px solid ${C.glassBorder}`
            }),
            // Card 2: Shadow presets
            panel([
              el(`<p style="font-family:${FONT};font-size:22px;font-weight:600;color:${C.text};margin-bottom:12px;">Shadow Presets</p>`, {
                id: "s13-shadow-label",
                w: "fill"
              }),
              hstack([
                el(`<div style="width:100%;height:100%;background:${C.glassEmph};border-radius:6px;box-shadow:${resolveShadow("sm")};display:flex;align-items:center;justify-content:center;"><span style="font-family:${MONO};font-size:12px;color:${C.textSec};">sm</span></div>`, {
                  id: "s13-sh-sm",
                  w: 56,
                  h: 56
                }),
                el(`<div style="width:100%;height:100%;background:${C.glassEmph};border-radius:6px;box-shadow:${resolveShadow("md")};display:flex;align-items:center;justify-content:center;"><span style="font-family:${MONO};font-size:12px;color:${C.textSec};">md</span></div>`, {
                  id: "s13-sh-md",
                  w: 56,
                  h: 56
                }),
                el(`<div style="width:100%;height:100%;background:${C.glassEmph};border-radius:6px;box-shadow:${resolveShadow("lg")};display:flex;align-items:center;justify-content:center;"><span style="font-family:${MONO};font-size:12px;color:${C.textSec};">lg</span></div>`, {
                  id: "s13-sh-lg",
                  w: 56,
                  h: 56
                }),
                el(`<div style="width:100%;height:100%;background:${C.glassEmph};border-radius:6px;box-shadow:${resolveShadow("xl")};display:flex;align-items:center;justify-content:center;"><span style="font-family:${MONO};font-size:12px;color:${C.textSec};">xl</span></div>`, {
                  id: "s13-sh-xl",
                  w: 56,
                  h: 56
                }),
                el(`<div style="width:100%;height:100%;background:${C.glassEmph};border-radius:6px;box-shadow:${resolveShadow("glow")};display:flex;align-items:center;justify-content:center;"><span style="font-family:${MONO};font-size:12px;color:${C.accent1};">glow</span></div>`, {
                  id: "s13-sh-glow",
                  w: 56,
                  h: 56
                })
              ], {
                id: "s13-shadow-row",
                w: "fill",
                gap: "sm",
                align: "middle"
              })
            ], {
              id: "s13-card-shadow",
              w: cardW,
              padding: "md",
              gap: "sm",
              fill: C.glass,
              radius: 16,
              border: `1px solid ${C.glassBorder}`
            }),
            // Card 3: Glass-morphism
            panel([
              el(`<p style="font-family:${FONT};font-size:22px;font-weight:600;color:${C.text};margin-bottom:12px;">Glass-morphism</p>`, {
                id: "s13-glass-label",
                w: "fill"
              }),
              // Layered glass panels
              el('<div style="width:100%;height:100%;background:rgba(0,212,255,0.15);border-radius:12px;border:1px solid rgba(0,212,255,0.2);"></div>', {
                id: "s13-glass-bg",
                w: "fill",
                h: 100
              }),
              // Use el instead of nested panel to avoid w:'fill' resolution bug in nested panels
              el(`<div style="width:100%;height:100%;background:${C.glassEmph};border-radius:10px;border:1px solid ${C.glassEmphBorder};display:flex;align-items:center;padding:0 16px;"><p style="font-family:${FONT};font-size:16px;color:${C.text};margin:0;">Glass panel overlay</p></div>`, {
                id: "s13-glass-overlay",
                w: "fill",
                h: 44
              })
            ], {
              id: "s13-card-glass",
              w: cardW,
              padding: "md",
              gap: "sm",
              fill: C.glass,
              radius: 16,
              border: `1px solid ${C.glassBorder}`
            }),
            // Card 4: Borders & overflow
            panel([
              el(`<p style="font-family:${FONT};font-size:22px;font-weight:600;color:${C.text};margin-bottom:12px;">Borders & Overflow</p>`, {
                id: "s13-border-label",
                w: "fill"
              }),
              el(`<div style="width:100%;height:100%;border:2px solid ${C.accent1};border-radius:8px;display:flex;align-items:center;justify-content:center;"><span style="font-family:${MONO};font-size:14px;color:${C.accent1};">solid border</span></div>`, {
                id: "s13-border-solid",
                w: "fill",
                h: 40
              }),
              el(`<div style="width:100%;height:100%;border:2px dashed ${C.accent2};border-radius:8px;display:flex;align-items:center;justify-content:center;"><span style="font-family:${MONO};font-size:14px;color:${C.accent2};">dashed border</span></div>`, {
                id: "s13-border-dashed",
                w: "fill",
                h: 40
              }),
              el(`<div style="width:100%;height:100%;background:rgba(180,60,100,0.5);border-radius:8px;overflow:hidden;position:relative;display:flex;align-items:center;"><div style="position:absolute;top:-10px;left:-10px;width:120%;height:120%;background:linear-gradient(45deg,rgba(255,107,157,0.3),transparent);"></div><span style="font-family:${MONO};font-size:14px;color:#ffffff;position:relative;padding:0 8px;text-shadow:0 1px 3px rgba(0,0,0,0.5);">overflow: clip</span></div>`, {
                id: "s13-border-clip",
                w: "fill",
                h: 40,
                overflow: "clip",
                className: "sk-overflow-demo"
              })
            ], {
              id: "s13-card-border",
              w: cardW,
              padding: "md",
              gap: "sm",
              fill: C.glass,
              radius: 16,
              border: `1px solid ${C.glassBorder}`
            })
          ], {
            id: "s13-card-grid",
            x: safe.x,
            y: below("s13-title-stack", { gap: "lg" }),
            w: safe.w,
            cols: 2,
            gap: "lg"
          })
        ];
      })()
    },
    // ================================================================
    // SLIDE 14: MEASUREMENT & VALIDATION — "Catch Problems Before You See Them"
    // ================================================================
    {
      id: "measurement-validation",
      background: C.bgAlt,
      notes: "measure() renders HTML off-screen and returns exact dimensions. Validation catches problems without visual inspection.",
      elements: (() => {
        const { left, right } = splitRect(safe, { ratio: 0.45, gap: 60 });
        return [
          // Title
          vstack([
            mkEyebrow("Quality", "s14-eyebrow", C.accent4),
            slideTitle("Catch Problems Early", "s14-title")
          ], {
            id: "s14-title-stack",
            x: safe.x,
            y: safe.y,
            w: safe.w,
            gap: "sm",
            align: "left"
          }),
          // Left: measure() workflow
          panel([
            el(`<p style="font-family:${FONT};font-size:24px;font-weight:600;color:${C.text};margin-bottom:8px;">measure()</p>`, {
              id: "s14-measure-heading",
              w: "fill"
            }),
            // Code showing measure call
            codeText(
              `const size = await measure(
  '&lt;h1&gt;Hello World&lt;/h1&gt;',
  { w: 800, fontSize: 56 }
);
// \u2192 { w: 482, h: 64 }`,
              "s14-measure-code",
              { w: "fill" }
            ),
            // Bounding box visualization
            group([
              el('<div style="width:100%;height:100%;border:2px dashed rgba(0,212,255,0.4);border-radius:4px;"></div>', {
                id: "s14-bbox-outer",
                x: 0,
                y: 0,
                w: 300,
                h: 60
              }),
              el(`<div style="width:100%;height:100%;background:rgba(0,60,80,0.5);border-radius:3px;display:flex;align-items:center;justify-content:center;"><span style="font-family:${FONT};font-size:20px;font-weight:700;color:${C.text};">Hello World</span></div>`, {
                id: "s14-bbox-inner",
                x: 0,
                y: 0,
                w: 200,
                h: 52
              }),
              el(`<span style="font-family:${MONO};font-size:13px;color:${C.accent1};">{ w: 482, h: 64 }</span>`, {
                id: "s14-bbox-label",
                x: 210,
                y: 20,
                w: 140,
                h: 18
              })
            ], {
              id: "s14-bbox-group",
              x: 24,
              y: 0,
              w: 360,
              h: 60,
              bounds: "hug"
            })
          ], {
            id: "s14-measure-panel",
            x: left.x,
            y: below("s14-title-stack", { gap: "xl" }),
            w: left.w,
            padding: "lg",
            gap: "md",
            fill: "rgba(0,212,255,0.04)",
            radius: 16,
            border: `1px solid rgba(0,212,255,0.15)`
          }),
          // Right: validation output
          panel([
            el(`<p style="font-family:${FONT};font-size:24px;font-weight:600;color:${C.text};margin-bottom:8px;">Validation Output</p>`, {
              id: "s14-valid-heading",
              w: "fill"
            }),
            vstack([
              // Warning row
              panel([
                el(`<p style="font-family:${MONO};font-size:18px;color:#ffcc00;line-height:1.4;">\u26A0 Element "card-3" extends beyond safe zone (x: 1820 + w: 300 > 1800)</p>`, {
                  id: "s14-warn1-text",
                  w: "fill"
                })
              ], {
                id: "s14-warn1",
                w: "fill",
                padding: "sm",
                fill: "rgba(255,204,0,0.06)",
                radius: 8,
                border: "1px solid rgba(255,204,0,0.2)"
              }),
              // Error row
              panel([
                el(`<p style="font-family:${MONO};font-size:18px;color:${C.accent3};line-height:1.4;">\u2717 Element "title" missing required "w" property</p>`, {
                  id: "s14-err1-text",
                  w: "fill"
                })
              ], {
                id: "s14-err1",
                w: "fill",
                padding: "sm",
                fill: "rgba(255,107,157,0.06)",
                radius: 8,
                border: "1px solid rgba(255,107,157,0.2)"
              }),
              // Success row
              panel([
                el(`<p style="font-family:${MONO};font-size:18px;color:${C.accent4};line-height:1.4;">\u2713 14 elements validated \u2014 no overlaps detected</p>`, {
                  id: "s14-ok1-text",
                  w: "fill"
                })
              ], {
                id: "s14-ok1",
                w: "fill",
                padding: "sm",
                fill: "rgba(0,255,136,0.06)",
                radius: 8,
                border: "1px solid rgba(0,255,136,0.2)"
              })
            ], {
              id: "s14-valid-stack",
              w: "fill",
              gap: "sm",
              align: "left"
            })
          ], {
            id: "s14-valid-panel",
            x: right.x,
            y: below("s14-title-stack", { gap: "xl" }),
            w: right.w,
            padding: "lg",
            gap: "md",
            fill: C.glass,
            radius: 16,
            border: `1px solid ${C.glassBorder}`
          }),
          // Bottom: mini-slide with safeRect() visualization
          group([
            // Slide outline
            el('<div style="width:100%;height:100%;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.12);border-radius:4px;"></div>', {
              id: "s14-mini-slide",
              x: 0,
              y: 0,
              w: 400,
              h: 225
            }),
            // Safe zone (dashed)
            el('<div style="width:100%;height:100%;border:2px dashed rgba(0,255,136,0.3);border-radius:2px;"></div>', {
              id: "s14-mini-safe",
              x: 25,
              y: 19,
              w: 350,
              h: 187
            }),
            // Label
            el(`<span style="font-family:${MONO};font-size:13px;color:${C.accent4};background:${C.bgAlt};padding:0 4px;">safeRect()</span>`, {
              id: "s14-mini-label",
              x: 30,
              y: 12,
              w: 100,
              h: 16
            })
          ], {
            id: "s14-mini-group",
            x: placeBetween("s14-measure-panel", "s14-valid-panel"),
            y: below("s14-measure-panel", { gap: "lg" }),
            w: 400,
            h: 225,
            bounds: "hug",
            anchor: "tc"
          })
        ];
      })()
    },
    // ================================================================
    // SLIDE 15: FULL EXAMPLE — "Putting It All Together"
    // ================================================================
    {
      id: "full-example",
      background: C.bg,
      notes: "A complete SlideKit slide is a plain object with elements array. No magic \u2014 just coordinates.",
      elements: (() => {
        const { left, right } = splitRect(safe, { ratio: 0.55, gap: 60 });
        return [
          // Title
          vstack([
            mkEyebrow("Complete Example", "s15-eyebrow", C.accent1),
            slideTitle("Putting It All Together", "s15-title")
          ], {
            id: "s15-title-stack",
            x: safe.x,
            y: safe.y,
            w: safe.w,
            gap: "sm",
            align: "left"
          }),
          // Left: code editor panel
          panel([
            // Line numbers + code
            codeText(
              `<span style="color:${C.textTer}"> 1</span>  {
<span style="color:${C.textTer}"> 2</span>    <span style="color:${C.accent1};">id</span>: <span style="color:${C.accent3};">'my-slide'</span>,
<span style="color:${C.textTer}"> 3</span>    <span style="color:${C.accent1};">background</span>: <span style="color:${C.accent3};">'#0a0a1a'</span>,
<span style="color:${C.textTer}"> 4</span>    <span style="color:${C.accent1};">elements</span>: [
<span style="color:${C.textTer}"> 5</span>      el(<span style="color:${C.accent3};">'&lt;h1&gt;Title&lt;/h1&gt;'</span>, {
<span style="color:${C.textTer}"> 6</span>        <span style="color:${C.accent1};">x</span>: 960, <span style="color:${C.accent1};">y</span>: 200,
<span style="color:${C.textTer}"> 7</span>        <span style="color:${C.accent1};">w</span>: 800, <span style="color:${C.accent1};">anchor</span>: <span style="color:${C.accent3};">'tc'</span>
<span style="color:${C.textTer}"> 8</span>      }),
<span style="color:${C.textTer}"> 9</span>      hstack([card1, card2, card3], {
<span style="color:${C.textTer}">10</span>        <span style="color:${C.accent1};">x</span>: 120, <span style="color:${C.accent1};">y</span>: 400,
<span style="color:${C.textTer}">11</span>        <span style="color:${C.accent1};">gap</span>: <span style="color:${C.accent3};">'lg'</span>
<span style="color:${C.textTer}">12</span>      }),
<span style="color:${C.textTer}">13</span>    ]
<span style="color:${C.textTer}">14</span>  }`,
              "s15-code",
              { w: "fill" }
            )
          ], {
            id: "s15-code-panel",
            x: left.x,
            y: below("s15-title-stack", { gap: "xl" }),
            w: left.w,
            padding: "lg",
            gap: 0,
            fill: "rgba(0,255,136,0.03)",
            radius: 16,
            border: `1px solid rgba(0,255,136,0.12)`
          }),
          // Right: mini rendered slide
          group([
            // Slide frame
            el(`<div style="width:100%;height:100%;background:${C.bg};border:1px solid rgba(255,255,255,0.15);border-radius:6px;"></div>`, {
              id: "s15-mini-bg",
              x: 0,
              y: 0,
              w: 480,
              h: 270
            }),
            // Mini title
            el(`<p style="font-family:${FONT};font-size:22px;font-weight:700;color:${C.text};text-align:center;">Title</p>`, {
              id: "s15-mini-title",
              x: 90,
              y: 40,
              w: 300,
              h: 30
            }),
            // Mini subtitle
            el(`<p style="font-family:${FONT};font-size:14px;color:${C.textSec};text-align:center;">Subtitle text here</p>`, {
              id: "s15-mini-subtitle",
              x: 90,
              y: 78,
              w: 300,
              h: 20
            }),
            // Three mini cards
            el(`<div style="width:100%;height:100%;background:rgba(0,212,255,0.1);border:1px solid rgba(0,212,255,0.3);border-radius:4px;"></div>`, {
              id: "s15-mini-card1",
              x: 30,
              y: 110,
              w: 130,
              h: 100
            }),
            el(`<div style="width:100%;height:100%;background:rgba(124,92,191,0.1);border:1px solid rgba(124,92,191,0.3);border-radius:4px;"></div>`, {
              id: "s15-mini-card2",
              x: 175,
              y: 110,
              w: 130,
              h: 100
            }),
            el(`<div style="width:100%;height:100%;background:rgba(0,255,136,0.1);border:1px solid rgba(0,255,136,0.3);border-radius:4px;"></div>`, {
              id: "s15-mini-card3",
              x: 320,
              y: 110,
              w: 130,
              h: 100
            }),
            // Mini footer
            el(`<p style="font-family:${MONO};font-size:11px;color:${C.textTer};text-align:center;">Footer</p>`, {
              id: "s15-mini-footer",
              x: 140,
              y: 240,
              w: 200,
              h: 16
            })
          ], {
            id: "s15-mini-slide",
            x: right.x + right.w / 2,
            y: below("s15-title-stack", { gap: "xl" }),
            w: 480,
            h: 270,
            bounds: "hug",
            anchor: "tc",
            scale: 0.85
          }),
          // Connect annotation lines from code to rendered elements
          connect("s15-code-panel", "s15-mini-slide", {
            id: "s15-connect1",
            type: "straight",
            arrow: "end",
            color: C.accent1,
            thickness: 1,
            dash: [6, 4],
            fromAnchor: "cr",
            toAnchor: "cl"
          }),
          // Caption
          caption(
            "A complete slide is a plain object \u2014 no magic, just coordinates.",
            "s15-caption",
            {
              x: centerHWith("s15-code-panel"),
              y: below("s15-code-panel", { gap: "md" }),
              w: left.w,
              anchor: "tc",
              style: { textAlign: "center", fontStyle: "italic" }
            }
          )
        ];
      })()
    },
    // ================================================================
    // SLIDE 16: CLOSING — "Start Building"
    // ================================================================
    {
      id: "closing",
      background: C.bg,
      notes: "Thank you for exploring SlideKit. Every slide in this presentation was built with the library it describes.",
      elements: [
        // Radial gradient overlay on bg layer
        el('<div style="width:100%;height:100%;background:radial-gradient(ellipse at 50% 40%, rgba(0,212,255,0.1) 0%, rgba(124,92,191,0.05) 40%, transparent 70%);"></div>', {
          id: "s16-glow",
          x: 0,
          y: 0,
          w: 1920,
          h: 1080,
          layer: "bg"
        }),
        // Large centered title
        el(`<h1 style="font-family:${FONT};font-size:80px;font-weight:800;color:${C.text};text-align:center;line-height:1.1;">Start Building</h1>`, {
          id: "s16-title",
          x: 960,
          y: 300,
          w: 1e3,
          anchor: "tc",
          style: { textAlign: "center" }
        }),
        // Accent rule
        accentRule("s16-rule", {
          x: 960 - 40,
          y: below("s16-title", { gap: "md" })
        }),
        // Subtitle
        el(`<p style="font-family:${FONT};font-size:28px;font-weight:400;color:${C.textSec};text-align:center;line-height:1.5;">Every slide in this presentation was built with the library it describes.</p>`, {
          id: "s16-subtitle",
          x: 960,
          y: below("s16-rule", { gap: "md" }),
          w: 900,
          anchor: "tc"
        }),
        // Three value cards in hstack
        hstack([
          panel([
            el(`<p style="font-family:${FONT};font-size:36px;text-align:center;">\u{1F3AF}</p>`, {
              id: "s16-icon1",
              w: "fill"
            }),
            el(`<p style="font-family:${FONT};font-size:22px;font-weight:600;color:${C.text};text-align:center;">Deterministic</p>`, {
              id: "s16-val1-title",
              w: "fill"
            }),
            el(`<p style="font-family:${FONT};font-size:16px;color:${C.textSec};text-align:center;line-height:1.5;">Same input, same output. Every\xA0time.</p>`, {
              id: "s16-val1-desc",
              w: "fill"
            })
          ], {
            id: "s16-card1",
            w: 280,
            padding: "lg",
            gap: "sm",
            fill: C.glass,
            radius: 16,
            border: `1px solid ${C.glassBorder}`
          }),
          panel([
            el(`<p style="font-family:${FONT};font-size:36px;text-align:center;">\u{1F4D0}</p>`, {
              id: "s16-icon2",
              w: "fill"
            }),
            el(`<p style="font-family:${FONT};font-size:22px;font-weight:600;color:${C.text};text-align:center;">Measurable</p>`, {
              id: "s16-val2-title",
              w: "fill"
            }),
            el(`<p style="font-family:${FONT};font-size:16px;color:${C.textSec};text-align:center;line-height:1.5;">Know exact sizes before rendering.</p>`, {
              id: "s16-val2-desc",
              w: "fill"
            })
          ], {
            id: "s16-card2",
            w: 280,
            padding: "lg",
            gap: "sm",
            fill: C.glass,
            radius: 16,
            border: `1px solid ${C.glassBorder}`
          }),
          panel([
            el(`<p style="font-family:${FONT};font-size:36px;text-align:center;">\u2705</p>`, {
              id: "s16-icon3",
              w: "fill"
            }),
            el(`<p style="font-family:${FONT};font-size:22px;font-weight:600;color:${C.text};text-align:center;">Validated</p>`, {
              id: "s16-val3-title",
              w: "fill"
            }),
            el(`<p style="font-family:${FONT};font-size:16px;color:${C.textSec};text-align:center;line-height:1.5;">Catch errors before you see\xA0them.</p>`, {
              id: "s16-val3-desc",
              w: "fill"
            })
          ], {
            id: "s16-card3",
            w: 280,
            padding: "lg",
            gap: "sm",
            fill: C.glass,
            radius: 16,
            border: `1px solid ${C.glassBorder}`
          })
        ], {
          id: "s16-cards",
          x: 960,
          y: below("s16-subtitle", { gap: "xl" }),
          anchor: "tc",
          gap: "lg",
          align: "stretch"
        }),
        // Footer
        el(`<p style="font-family:${FONT};font-size:18px;color:${C.textTer};text-align:center;">github.com/anthropics/slidekit</p>`, {
          id: "s16-footer",
          x: 960,
          y: 960,
          w: 400,
          anchor: "bc"
        }),
        // Corner brackets (overlay layer)
        // Top-left bracket
        group([
          el(`<div style="width:100%;height:100%;background:${C.accent1};"></div>`, {
            id: "s16-br-tl-h",
            x: 0,
            y: 0,
            w: 40,
            h: 2
          }),
          el(`<div style="width:100%;height:100%;background:${C.accent1};"></div>`, {
            id: "s16-br-tl-v",
            x: 0,
            y: 0,
            w: 2,
            h: 40
          })
        ], {
          id: "s16-bracket-tl",
          x: 40,
          y: 40,
          w: 40,
          h: 40,
          bounds: "hug",
          layer: "overlay",
          opacity: 0.3
        }),
        // Top-right bracket
        group([
          el(`<div style="width:100%;height:100%;background:${C.accent1};"></div>`, {
            id: "s16-br-tr-h",
            x: 0,
            y: 0,
            w: 40,
            h: 2
          }),
          el(`<div style="width:100%;height:100%;background:${C.accent1};"></div>`, {
            id: "s16-br-tr-v",
            x: 38,
            y: 0,
            w: 2,
            h: 40
          })
        ], {
          id: "s16-bracket-tr",
          x: 1840,
          y: 40,
          w: 40,
          h: 40,
          bounds: "hug",
          layer: "overlay",
          opacity: 0.3
        }),
        // Bottom-left bracket
        group([
          el(`<div style="width:100%;height:100%;background:${C.accent2};"></div>`, {
            id: "s16-br-bl-h",
            x: 0,
            y: 38,
            w: 40,
            h: 2
          }),
          el(`<div style="width:100%;height:100%;background:${C.accent2};"></div>`, {
            id: "s16-br-bl-v",
            x: 0,
            y: 0,
            w: 2,
            h: 40
          })
        ], {
          id: "s16-bracket-bl",
          x: 40,
          y: 1e3,
          w: 40,
          h: 40,
          bounds: "hug",
          layer: "overlay",
          opacity: 0.3
        }),
        // Bottom-right bracket
        group([
          el(`<div style="width:100%;height:100%;background:${C.accent2};"></div>`, {
            id: "s16-br-br-h",
            x: 0,
            y: 38,
            w: 40,
            h: 2
          }),
          el(`<div style="width:100%;height:100%;background:${C.accent2};"></div>`, {
            id: "s16-br-br-v",
            x: 38,
            y: 0,
            w: 2,
            h: 40
          })
        ], {
          id: "s16-bracket-br",
          x: 1840,
          y: 1e3,
          w: 40,
          h: 40,
          bounds: "hug",
          layer: "overlay",
          opacity: 0.3
        })
      ]
    }
  ];
  return await render(slides);
}
export {
  run
};
//# sourceMappingURL=slidekit_about_linted_bundle.js.map

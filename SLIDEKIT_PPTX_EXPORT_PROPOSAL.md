# SlideKit → PowerPoint Export: Technical Proposal

## Summary

Export a rendered SlideKit presentation to `.pptx` by walking the live DOM. After `render()`, every element exists in the browser with fully resolved computed styles — fonts, colors, gradients, shadows, borders — all calculated by the browser's CSS engine. The exporter inspects this rendered DOM (via `getComputedStyle()`, `TreeWalker`, `getBoundingClientRect()`), extracts visual properties, and emits equivalent PPTX constructs using PptxGenJS. No HTML parsing, no CSS interpretation — the browser already did that work.

---

## Core Insight: Let the Browser Be Your CSS Engine

SlideKit v2's `el(html, props)` accepts arbitrary HTML content rendered via `innerHTML`. The content can include rich text with mixed fonts/sizes/colors, images, nested divs, lists — anything the browser can render.

Rather than trying to parse HTML source or interpret CSS rules, the exporter **reads what the browser computed**:

```js
const domEl = document.querySelector('[data-sk-id="my-title"]');
const style = getComputedStyle(domEl);

// Every CSS property is fully resolved:
style.backgroundColor  // → "rgb(51, 51, 51)"        (not "#333" or "var(--bg)")
style.backgroundImage  // → "linear-gradient(135deg, rgb(59, 130, 246), rgb(167, 139, 250))"
style.fontFamily       // → '"Inter", sans-serif'     (resolved, not inherited)
style.fontSize         // → "24px"                    (resolved, not "1.5em")
style.boxShadow        // → "rgba(0, 0, 0, 0.3) 0px 4px 12px 0px"
style.borderRadius     // → "12px"                    (resolved, not "0.75rem")
```

No cascade, no specificity, no inheritance to worry about — `getComputedStyle()` returns the final answer. CSS classes, inline styles, inherited values, custom properties — all resolved to concrete values.

---

## Data Sources

The exporter reads from two sources after `render()` completes:

### 1. Scene Graph (`window.sk`)

Provides layout geometry:

```
window.sk.layouts[i].elements  → Map of id → { type, authored, resolved, provenance }
```

| Field | What it provides |
|---|---|
| `resolved.x, .y, .w, .h` | Final bounding box in pixels (top-left origin) |
| `authored.type` | Element type: `el`, `group`, `vstack`, `hstack`, `connector` |
| `authored.content` | HTML string (for `el` elements) |
| `_connectorResolved` | Connector endpoints `{ from: {x,y}, to: {x,y} }` |

### 2. Live DOM

Provides visual properties. Every SlideKit element has a `data-sk-id` attribute:

```js
const domEl = document.querySelector(`[data-sk-id="${id}"]`);
const style = getComputedStyle(domEl);
```

This gives us every resolved CSS property — fonts, colors, backgrounds, borders, shadows, opacity, transforms — without needing to parse the source HTML or CSS.

### Why Both Sources?

The scene graph has **accurate layout geometry** (positions resolved through the topo-sort, anchors, relative positioning, transforms). The DOM has **accurate visual styling** (the browser's CSS engine resolved everything). Using both gives us the complete picture.

---

## Library Choice: PptxGenJS

[PptxGenJS](https://github.com/gitbrent/PptxGenJS) is a client-side JavaScript library that generates `.pptx` files directly in the browser (also works in Node). It's the most mature option in the JS ecosystem.

**Why it fits:**
- Runs in the browser alongside SlideKit — no server round-trip
- API takes absolute positions in inches, which maps directly from SlideKit's pixel coordinates
- Supports text boxes, shapes, images, lines, connectors, and grouping
- Supports gradients, shadows, borders, rounded corners natively
- Generates valid OOXML that opens in PowerPoint, Google Slides, and LibreOffice

**Coordinate conversion:**

PowerPoint uses inches. SlideKit uses pixels on a 1920×1080 canvas:

```
PPTX slide dimensions: 13.333" × 7.5" (widescreen 16:9)
Scale factor: 13.333 / 1920 = 0.006944 inches/pixel
```

So: `pptxX = skX * (13.333 / 1920)`, `pptxY = skY * (7.5 / 1080)`

Both axes use the same scale factor (0.006944), so aspect ratio is preserved.

---

## DOM Walking Strategy

### Element Classification

Every `el()` in the DOM needs to be classified for PPTX export. The exporter inspects the rendered DOM to determine what each element actually is:

```js
function classifyElement(domEl, sceneEntry) {
  const style = getComputedStyle(domEl);
  const children = domEl.childNodes;
  const imgs = domEl.querySelectorAll('img');
  const textContent = domEl.textContent?.trim();

  // 1. Single image — PPTX picture
  if (imgs.length === 1 && !textContent) return 'image';

  // 2. No visible content, has background — PPTX shape
  if (!textContent && !imgs.length) return 'shape';

  // 3. Has text content — PPTX text box (with runs)
  if (textContent) return 'textbox';

  // 4. Complex mixed content — decompose or rasterize
  return 'complex';
}
```

Most real-world slides fall into the first three categories. The `complex` fallback handles edge cases by rasterizing the element to a PNG and embedding it as an image.

### Text Run Extraction

This is where DOM walking shines. For a text box element, walk its text nodes and group consecutive characters with identical computed styles into "runs":

```js
function extractTextRuns(domEl) {
  const runs = [];
  const walker = document.createTreeWalker(domEl, NodeFilter.SHOW_TEXT);

  while (walker.nextNode()) {
    const textNode = walker.currentNode;
    const parent = textNode.parentElement;
    const style = getComputedStyle(parent);
    const text = textNode.textContent;
    if (!text.trim() && !text.includes('\n')) continue;

    runs.push({
      text,
      fontFamily: style.fontFamily,           // → '"Inter", sans-serif'
      fontSize: parseFloat(style.fontSize),    // → 24 (px)
      fontWeight: style.fontWeight,            // → "700"
      fontStyle: style.fontStyle,              // → "italic" or "normal"
      color: style.color,                      // → "rgb(255, 255, 255)"
      textDecoration: style.textDecorationLine,// → "underline" or "none"
      textTransform: style.textTransform,      // → "uppercase" or "none"
      letterSpacing: style.letterSpacing,      // → "0.05em" (resolved to px)
      lineHeight: style.lineHeight,            // → "31.2px" (resolved)
      // Gradient text detection:
      backgroundClip: style.webkitBackgroundClip || style.backgroundClip,
      backgroundImage: style.backgroundImage,
    });
  }

  // Merge adjacent runs with identical styles
  return mergeAdjacentRuns(runs);
}
```

This handles **arbitrary rich text** automatically — `<b>`, `<em>`, `<span style="color:red">`, nested `<div>`s with different fonts — because we're reading what the browser computed, not parsing HTML.

---

## Element-by-Element Mapping

### Text Boxes (el with text content)

DOM inspection → PptxGenJS `slide.addText(runs, options)`

| Computed style | PPTX equivalent | Notes |
|---|---|---|
| `style.fontFamily` | `fontFace` | Extract first font name from the resolved list |
| `style.fontSize` | `fontSize` | Convert px → pt: `pt = px * 0.75` |
| `style.fontWeight` | `bold` | `>= 600` → `bold: true`. PPTX only has bold on/off. |
| `style.fontStyle` | `italic` | `"italic"` → `italic: true` |
| `style.color` | `color` | Parse `rgb(r,g,b)` → hex string |
| `style.textAlign` | `align` | Direct mapping |
| `style.lineHeight` | `lineSpacingMultiple` | Parse resolved px value ÷ fontSize |
| `style.letterSpacing` | `charSpacing` | Parse resolved px → pt |
| `style.textDecorationLine` | `underline` / `strike` | Map decoration types |
| `style.textTransform` | Transform text content | Apply uppercase/lowercase to the actual string |

**Rich text runs:** Each run in the `extractTextRuns()` output becomes a PptxGenJS text run object with its own formatting. This means `<b>Bold</b> and <em>italic</em>` produces three runs with different `bold`/`italic` flags — and it works automatically because the browser resolved the styles.

**Paragraphs:** Block-level elements (`<p>`, `<div>`, `<h1>`, `<br>`) create paragraph breaks. Detect by checking if a text node's parent is a block element or if there's a `<br>` between runs.

**Font weight fidelity gap:** PowerPoint supports `bold` on/off, not CSS's 100–900 scale. Weights 300 (light), 500 (medium) lose distinction. This is inherent to PPTX.

**Text wrapping:** Set `autoFit: false` and `wrap: true` on the PPTX text box. Line breaks may differ slightly between browser and PowerPoint text engines — this is unavoidable.

### Gradient Text

DOM walking makes this **detectable and exportable**:

```js
const style = getComputedStyle(textParent);
if (style.webkitBackgroundClip === 'text' || style.backgroundClip === 'text') {
  // This is gradient text!
  const gradient = style.backgroundImage;
  // → "linear-gradient(135deg, rgb(59, 130, 246), rgb(167, 139, 250))"
  // Parse → PPTX gradient fill on the text run
}
```

PPTX supports gradient fills on text runs via `<a:gradFill>` inside `<a:rPr>`. Parse the computed `backgroundImage` gradient string → map to PPTX gradient stops. This was previously considered impossible with source-level HTML parsing.

---

### Shapes (el with no text content)

An `el()` with no visible text content but with styling (background, border, radius) is a shape.

DOM inspection → PptxGenJS `slide.addShape('roundRect' | 'rect', options)`

| Computed style | PPTX equivalent | Notes |
|---|---|---|
| `style.backgroundColor` | `fill.color` | Parse `rgb()` → hex. Handles `rgba()` → hex + transparency. |
| `style.backgroundImage` | `fill` (gradient) | Parse gradient string → PPTX gradient object |
| `style.borderRadius` | `rectRadius` | Parse px → inches. Use `'roundRect'` shape type. |
| `style.border*` | `border` | Parse resolved border-width, border-style, border-color |
| `style.boxShadow` | `shadow` | Parse resolved shadow → angle, distance, blur, color |
| `style.opacity` | `transparency` | `(1 - opacity) * 100` |
| scene `rotate` prop | `rotate` | Degrees, direct mapping |

**Border radius:** `getComputedStyle()` returns resolved per-corner values. PPTX `rectRadius` is uniform. Use the average or max. Per-corner radii are an OOXML limitation.

**Multiple backgrounds:** CSS allows stacking (`gradient1, gradient2`). PPTX shapes have a single fill. Use the first (topmost) gradient.

---

### Images (el containing `<img>`)

Detect via `domEl.querySelector('img')`.

DOM inspection → PptxGenJS `slide.addImage()`

| DOM property | PPTX equivalent | Notes |
|---|---|---|
| `img.src` | `data` (base64) or `path` | Fetch → blob → base64 for self-contained PPTX |
| `img.naturalWidth/Height` | Crop computation | Needed for object-fit simulation |
| `style.objectFit` | `sizing` | `"cover"` → crop, `"contain"` → fit |
| `style.objectPosition` | Crop offset | Adjusts crop rectangle center |
| `style.opacity` | `transparency` | Percentage |
| scene `rotate` prop | `rotate` | Degrees |
| `style.borderRadius` | Shape mask | Rounded corners → PPTX clipped shape |

**Image embedding:** For browser-side export, fetch each image via `fetch()` → `blob()` → base64, then embed as `data:image/...;base64,...`. This ensures the PPTX is self-contained.

**Object-fit simulation:**
- `cover` — compute crop rectangle from natural dimensions vs rendered dimensions. PptxGenJS supports `sizing: { type: 'crop', x, y, w, h }`.
- `contain` — scale to fit within frame. PptxGenJS `sizing: { type: 'contain' }`.

---

### Containers (group, vstack, hstack)

These are structural. Their children already have absolute positions in the scene graph. The exporter flattens the hierarchy — it walks all leaf elements and emits each at its resolved position.

**Z-ordering:** Emit elements in declaration order within layers (bg → content → overlay). PPTX stacks shapes in insertion order.

**Clipping groups:** If a group has `clip: true`, use PptxGenJS `addGroup()` which clips to the group bounds. For non-clipping groups, flatten.

---

### Connectors

Scene graph provides `_connectorResolved.from` and `_connectorResolved.to` as absolute `{x, y}` coordinates. The SVG in the DOM provides additional visual properties.

| Source | PPTX equivalent | Notes |
|---|---|---|
| `from, to` coordinates | `addShape('line', { x, y, x2, y2 })` | Coordinate conversion |
| SVG `stroke` | `line.color` | Read from the `<line>` or `<path>` element |
| SVG `stroke-width` | `line.width` | px → pt |
| SVG `stroke-dasharray` | `line.dashType` | Map to nearest PPTX preset |
| SVG `marker-end` | `endArrowType: 'arrow'` | Detect arrow markers |
| Connector label `<text>` | Separate text box | PPTX connectors don't support inline text |

**Connector types:**
- `straight` → Direct line
- `curved` → PPTX curved connector (different curve model than SVG bezier — approximate)
- `elbow` → PPTX elbow connector (native support)

---

## CSS-to-PPTX Property Mappings

### Gradient Mapping

`getComputedStyle()` returns the fully resolved gradient string:

```js
style.backgroundImage
// → "linear-gradient(135deg, rgb(59, 130, 246) 0%, rgb(167, 139, 250) 100%)"
```

All color values are resolved to `rgb()` — no hex, no named colors, no variables. Parse with a regex:

```js
function parseLinearGradient(computed) {
  // "linear-gradient(135deg, rgb(59, 130, 246) 0%, rgb(167, 139, 250) 100%)"
  const angleMatch = computed.match(/(\d+(?:\.\d+)?)deg/);
  const angle = angleMatch ? parseFloat(angleMatch[1]) : 0;

  const stopRegex = /rgb\((\d+),\s*(\d+),\s*(\d+)\)\s+(\d+(?:\.\d+)?)%/g;
  const stops = [];
  let match;
  while ((match = stopRegex.exec(computed))) {
    stops.push({
      position: parseFloat(match[4]),
      color: rgbToHex(match[1], match[2], match[3]),
    });
  }

  return { angle, stops };
}
```

Map to PptxGenJS:

```js
fill: {
  type: 'gradient',
  gradientType: 'linear',
  angle: parsedAngle,
  stops: parsedStops,
}
```

**Radial gradients:** `getComputedStyle()` resolves the focal point and color stops. PPTX radial gradients have limited focal point options (center, corners). Map to the nearest PPTX preset.

---

### Shadow Mapping

```js
style.boxShadow
// → "rgba(0, 0, 0, 0.3) 0px 8px 32px 0px"
//    color             offX offY blur spread
```

Fully resolved — all values in px, colors in `rgba()`. Parse and map:

```js
function parseShadow(computed) {
  // Parse: rgba(r,g,b,a) offsetX offsetY blur spread
  const match = computed.match(
    /rgba?\(([^)]+)\)\s+([-\d.]+)px\s+([-\d.]+)px\s+([-\d.]+)px(?:\s+([-\d.]+)px)?/
  );
  if (!match) return null;

  const [r, g, b, a] = match[1].split(',').map(s => parseFloat(s.trim()));
  const offsetX = parseFloat(match[2]);
  const offsetY = parseFloat(match[3]);
  const blur = parseFloat(match[4]);

  return {
    type: 'outer',
    angle: Math.atan2(offsetY, offsetX) * (180 / Math.PI),
    offset: Math.sqrt(offsetX**2 + offsetY**2) * 0.75,  // px → pt
    blur: blur * 0.75,
    color: rgbToHex(r, g, b),
    opacity: a ?? 1,
  };
}
```

Spread radius has no PPTX equivalent — silently dropped.

---

### Border Mapping

```js
style.borderTopWidth   // → "1px"
style.borderTopStyle   // → "solid"
style.borderTopColor   // → "rgba(255, 255, 255, 0.15)"
```

All four sides resolved independently. For uniform borders (most common), read one side:

```js
border: {
  type: style.borderTopStyle === 'dashed' ? 'dash' : 'solid',
  pt: parseFloat(style.borderTopWidth) * 0.75,
  color: parseRgba(style.borderTopColor).hex,
  transparency: parseRgba(style.borderTopColor).transparency,
}
```

---

### Color Mapping

`getComputedStyle()` always returns colors as `rgb(r, g, b)` or `rgba(r, g, b, a)` — never hex, never named colors, never HSL. This simplifies parsing enormously:

```js
function parseColor(computed) {
  const match = computed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!match) return { hex: '000000', transparency: 0 };

  const hex = [match[1], match[2], match[3]]
    .map(n => parseInt(n).toString(16).padStart(2, '0'))
    .join('');
  const alpha = match[4] !== undefined ? parseFloat(match[4]) : 1;

  return { hex, transparency: Math.round((1 - alpha) * 100) };
}
```

No need for a general CSS color parser. `getComputedStyle()` normalizes everything.

---

### Backdrop Filter (No PPTX Equivalent)

```js
style.backdropFilter  // → "blur(12px)"
```

Detectable via computed style, but PowerPoint has no equivalent. The glassmorphism effect cannot be reproduced.

**Approach:** Ignore `backdrop-filter`, keep the existing semi-transparent fill. The translucency is preserved; only the blur effect is lost. Document as a known limitation.

---

## Slide-Level Properties

### Slide Background

The slide `<section>` element has `data-background-*` attributes set by SlideKit:

```js
section.getAttribute('data-background-color')    // → "#0c0c14"
section.getAttribute('data-background-gradient')  // → "linear-gradient(...)"
section.getAttribute('data-background-image')     // → "path/to/image.jpg"
```

Map to PptxGenJS slide background accordingly.

### Speaker Notes

`slide.notes` string → PptxGenJS `slide.addNotes(text)`. Direct mapping.

### Slide Dimensions

```js
const pptx = new PptxGenJS();
pptx.defineLayout({ name: 'SLIDEKIT', width: 13.333, height: 7.5 });
pptx.layout = 'SLIDEKIT';
```

Matches 1920×1080 at standard widescreen 16:9.

---

## Architecture

### Converter Pipeline

```
After render() completes:
    ↓
1. For each slide <section>:
    ↓
2. Walk [data-sk-id] elements in z-order (layer → declaration order)
    ↓
3. For each element:
   a. Read resolved bounds from window.sk → convert to inches
   b. Classify: textbox | shape | image | connector | complex
   c. Read getComputedStyle() → extract visual properties
   d. For textboxes: TreeWalker → extract text runs with per-run styles
   e. For images: read <img> src, naturalWidth/Height, object-fit
   f. For shapes: read background, border, radius, shadow
   g. Map all computed CSS values → PptxGenJS options
    ↓
4. Emit PptxGenJS API calls
    ↓
5. pptx.writeFile() → .pptx download
```

### Rasterization Fallback

For elements that can't be cleanly decomposed (complex nested HTML, CSS effects with no PPTX equivalent), the exporter falls back to rasterization:

```js
async function rasterizeElement(domEl, bounds) {
  // Use html2canvas or a similar library to capture the element as a PNG
  const canvas = await html2canvas(domEl, {
    width: bounds.w,
    height: bounds.h,
    backgroundColor: null,  // transparent background
  });
  return canvas.toDataURL('image/png');
}
```

The rasterized PNG is embedded as a PPTX image at the element's exact position. It loses editability but preserves visual fidelity.

### Module Structure

```
slidekit/
  export-pptx.js       — Main exporter: DOM walking, classification, PptxGenJS emission
  export-pptx-parse.js  — Computed CSS value parsers (gradients, shadows, borders, colors)
```

`export-pptx.js` exports:

```js
export async function exportPptx(options = {}) {
  // Reads from window.sk + live DOM
  // Returns a Blob or triggers a download
}
```

Options:
- `filename` — output filename (default: `"slidekit-export.pptx"`)
- `slides` — array of slide indices to export (default: all)
- `embedImages` — whether to fetch and embed images as base64 (default: `true`)
- `rasterizeFallback` — whether to rasterize complex elements (default: `true`)

### Dependencies

- **PptxGenJS** — loaded via CDN or npm. ~300KB minified. No other dependencies.
- **html2canvas** (optional) — for rasterization fallback. ~40KB minified. Only needed if `rasterizeFallback: true`.

---

## Difficulty Assessment

With DOM walking, the difficulty profile changes dramatically compared to source-level HTML/CSS parsing:

| Aspect | Difficulty | Approach |
|---|---|---|
| Positioning / sizing | **Easy** | Scene graph `resolved.{x,y,w,h}` → inch conversion |
| Plain text | **Easy** | Single text run from `textContent` + `getComputedStyle()` |
| Rich text runs | **Easy** | `TreeWalker` over text nodes, `getComputedStyle()` per parent, merge by style |
| Gradient text | **Medium** | Detect `backgroundClip: "text"` + parse `backgroundImage` → PPTX text gradient fill |
| Shapes (backgrounds) | **Easy** | `backgroundColor` / `backgroundImage` → PPTX fill |
| Borders | **Easy** | `borderTopWidth/Style/Color` → PPTX border |
| Border radius | **Easy** | `borderRadius` → `rectRadius` (uniform approximation) |
| Images | **Easy** | Find `<img>`, read `src`, `naturalWidth/Height`, `objectFit` |
| Linear gradients | **Medium** | Parse resolved `backgroundImage` string → PPTX gradient stops |
| Radial gradients | **Medium** | Parse string, map focal point to nearest PPTX preset |
| Shadows | **Medium** | Parse resolved `boxShadow` → PPTX shadow (angle, distance, blur, color) |
| Connectors | **Medium** | Scene graph endpoints + SVG attributes → PPTX line/connector |
| Opacity / transparency | **Easy** | `style.opacity` → shape transparency; `rgba` → color transparency |
| `backdrop-filter` | **Hard** | No PPTX equivalent. Keep semi-transparent fill, lose blur. |
| Complex nested HTML | **Medium** | Rasterization fallback |
| CSS animations | **N/A** | Out of scope — PPTX has its own animation model |

**Estimated coverage:** ~90-95% of elements in a typical slide deck convert cleanly. The remaining 5-10% (primarily `backdrop-filter` effects) either approximate gracefully or fall back to rasterization.

---

## Fidelity Gaps

| Gap | Severity | Reason |
|---|---|---|
| Font weight granularity | Low | PPTX: bold/not-bold. CSS: 100–900. Weights 300, 500 lose distinction. |
| Text line breaks | Medium | Different text engines may wrap at different points. |
| `backdrop-filter: blur()` | Medium | No PPTX equivalent. Semi-transparent fill preserved, blur lost. |
| Radial gradient focal points | Low | PPTX radial gradients use preset positions, not arbitrary `at X% Y%`. |
| Multiple CSS backgrounds | Low | PPTX shapes have single fill. First gradient used. |
| Per-corner border radius | Low | PPTX has uniform `rectRadius` only. |
| `box-shadow` spread radius | Low | PPTX shadows don't have spread. |
| Multiple shadows | Low | PPTX supports one shadow per shape. |
| Curved connector geometry | Low | PPTX curved connectors differ from SVG beziers. |
| Font rendering | Low | Sub-pixel differences between browser and PPTX. |
| Font availability | Medium | PPTX references fonts by name; viewer needs them installed. |

None are showstoppers. Layout is exact because both systems use absolute positioning.

---

## Edge Cases

### Font Availability

PPTX references fonts by name. If the viewer's system doesn't have the font, PowerPoint substitutes. PptxGenJS doesn't embed fonts. Document which fonts are used.

### Large Image Files

Multiple high-resolution base64-embedded images can bloat the PPTX. Consider compressing images to rendered dimensions before embedding. Warn when total size exceeds 50MB.

### Element Overlap and Transparency

CSS `opacity: 0.5` affects the entire element (content + background) → PPTX shape-level `transparency: 50`. But `rgba(255,255,255,0.5)` as text color affects only the text → PPTX text color transparency. The computed style distinguishes these automatically since `getComputedStyle()` reports them on different properties.

### Z-Order Across Layers

SlideKit has `bg`, `content`, `overlay` layers. Emit all bg elements first, then content, then overlay, preserving declaration order within each layer.

### Rasterized Elements

Rasterized elements lose editability in PowerPoint — they become static images. The exporter should log which elements were rasterized so the user can decide whether to simplify the HTML for better PPTX compatibility.

---

## Testing Strategy

1. **Round-trip visual comparison:** Render in browser, export to PPTX, open in PowerPoint, screenshot both, compare. Validates gross correctness.

2. **Computed style parser tests:** Unit test each CSS parser (gradient, shadow, border, color) with known `getComputedStyle()` outputs.

3. **Text run extraction tests:** Create elements with mixed formatting, verify run extraction produces correct run boundaries and styles.

4. **Coordinate accuracy tests:** Export a slide with known element positions, extract from PPTX XML, verify inch values match within float tolerance.

5. **Coverage tests:** Run against the 17-slide ICSE test deck, check how many elements classify as textbox/shape/image vs. complex (rasterization fallback).

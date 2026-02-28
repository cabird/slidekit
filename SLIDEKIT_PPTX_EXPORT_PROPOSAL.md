# SlideKit → PowerPoint Export: Technical Proposal

## Summary

Export the resolved SlideKit scene graph to a `.pptx` file. After `render()`, `window.sk` contains every element's final position, size, type, content, and authored styles. A converter walks this data and emits equivalent PPTX constructs using PptxGenJS. The result is a PowerPoint file that reproduces the SlideKit layout with high fidelity — no browser, no Reveal.js, no Node server required at runtime.

---

## Data Source

The converter reads from `window.sk` after `render()` completes. For each slide:

```
window.sk.layouts[i].elements   → Map of id → { type, authored, resolved, provenance }
window.sk.slides[i].id          → Slide ID
```

Each element provides:

| Field | What it gives us |
|---|---|
| `resolved.x, .y, .w, .h` | Final bounding box in pixels (top-left origin, after anchor resolution) |
| `authored.type` | Element type: `text`, `rect`, `rule`, `image`, `group`, `vstack`, `hstack`, `connector` |
| `authored.content` | Text string (for text elements) |
| `authored.src` | Image URL/path (for image elements) |
| `authored.props` | All authored properties: font, size, weight, color, lineHeight, align, fill, radius, border, opacity, rotate, style, className, etc. |

For connector elements, the scene graph also stores `_connectorResolved` with `from: { x, y }` and `to: { x, y }` — the resolved endpoint coordinates.

**What's NOT in `window.sk` but may be needed:**

The `className` styles. When an element has `className: "glass-card"`, the scene graph stores the class name but not the resolved CSS. Two options:

1. **Resolve at export time** — call `getComputedStyle()` on the DOM element via `document.querySelector('[data-sk-id="element-id"]')` and extract the relevant visual properties.
2. **Require inline styles** — document that PPTX export only translates inline `style` properties and convenience props, not CSS classes. This is simpler and more predictable.

Recommendation: Option 2 for the initial implementation. CSS class resolution is fragile (depends on cascade, specificity, browser defaults) and introduces a DOM dependency. Elements that need PPTX-faithful rendering should use inline styles. Add class resolution as a later enhancement if needed.

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

PowerPoint uses inches. SlideKit uses pixels on a 1920×1080 canvas. Standard conversion:

```
PPTX slide dimensions: 13.333" × 7.5" (widescreen 16:9)
Scale factor: 13.333 / 1920 = 0.006944 inches/pixel
```

So: `pptxX = skX * (13.333 / 1920)`, `pptxY = skY * (7.5 / 1080)`

Both axes use the same scale factor (0.006944), so aspect ratio is preserved. This is exact — 1920 × 0.006944 = 13.333".

PptxGenJS accepts inches as numbers, or percentages as strings. We'll use inches.

---

## Element-by-Element Mapping

### Text Elements

SlideKit `text` → PptxGenJS `slide.addText()`

| SlideKit property | PPTX equivalent | Notes |
|---|---|---|
| `resolved.x, .y, .w, .h` | `x, y, w, h` (inches) | Direct coordinate conversion |
| `content` | Text content | Supports `\n` → multiple paragraphs |
| `props.font` | `fontFace` | Font name string |
| `props.size` | `fontSize` | PptxGenJS uses points. `size_pt = size_px * 0.75` (at 96 DPI) |
| `props.weight` | `bold: true` if ≥ 600 | PPTX doesn't have numeric weights — only bold/not-bold. This is a fidelity loss. |
| `props.color` | `color` | Hex string without `#` prefix. RGBA → hex + transparency percentage. |
| `props.align` | `align` | `"left"`, `"center"`, `"right"` map directly |
| `props.lineHeight` | `lineSpacingMultiple` | Direct mapping (1.3 → 1.3) |
| `props.letterSpacing` | `charSpacing` | PptxGenJS uses points. Parse CSS value. |
| `props.opacity` | Shape-level transparency | `transparency` percentage on the text box shape |
| `props.rotate` | `rotate` | Degrees, direct mapping |
| `style.textShadow` | `shadow` | See Shadow Mapping below |

**Font weight fidelity gap:** PowerPoint's text model supports `bold` (on/off), not CSS numeric weights (100–900). Weight 400 = normal, ≥ 600 = bold. Weights like 300 (light) or 500 (medium) lose their distinction. This is an inherent PPTX limitation. Document it as a known fidelity gap.

**Multi-line text:** SlideKit splits on `\n` and renders `<br>` elements. PptxGenJS's `addText()` accepts an array of text runs with per-paragraph formatting. Map each `\n`-delimited segment to a separate paragraph.

**Text vertical alignment:** SlideKit positions text at exact pixel coordinates. PptxGenJS text boxes have `valign` (top/middle/bottom). Since we're setting exact `y` from the resolved position, use `valign: "top"` always — the scene graph already computed the correct top-left position.

**Word wrapping:** SlideKit auto-measures text wrapping. In PPTX, set `autoFit: false` and `wrap: true` on the text box. The PPTX renderer will re-wrap the text, which *may* produce slightly different line breaks due to font metric differences between browser rendering and PowerPoint's text engine. This is an unavoidable fidelity gap — the same text at the same font size can break differently in two rendering engines.

---

### Rectangle Elements

SlideKit `rect` → PptxGenJS `slide.addShape('rect', ...)`

| SlideKit property | PPTX equivalent | Notes |
|---|---|---|
| `resolved.x, .y, .w, .h` | `x, y, w, h` | Coordinate conversion |
| `props.fill` or `style.background` | `fill` | See Gradient Mapping below |
| `props.radius` or `style.borderRadius` | `rectRadius` | In inches. Convert `px` value. |
| `props.border` or `style.border` | `border` | Parse CSS shorthand → `{ type, pt, color }` |
| `style.boxShadow` | `shadow` | See Shadow Mapping below |
| `props.opacity` | `transparency` | Percentage (0–100) |
| `props.rotate` | `rotate` | Degrees |

**Border radius:** CSS `borderRadius` can be per-corner (`10px 0 10px 0`). PPTX `rectRadius` is uniform (one value for all corners). If per-corner values differ, use the average or the max and document the fidelity gap. PptxGenJS does not support per-corner radii — this is an OOXML limitation that even PowerPoint's UI enforces.

---

### Rule Elements

SlideKit `rule` → PptxGenJS `slide.addShape('line', ...)`

| SlideKit property | PPTX equivalent | Notes |
|---|---|---|
| `resolved.x, .y` | `x, y` | Start point |
| `resolved.w` (horizontal) | Line end point | `x2 = x + w` |
| `resolved.h` (vertical) | Line end point | `y2 = y + h` |
| `props.color` | `line.color` | Hex color |
| `props.thickness` | `line.width` | In points (`px * 0.75`) |

For horizontal rules: `line` from `(x, y)` to `(x + w, y)`.
For vertical rules: `line` from `(x, y)` to `(x, y + h)`.

---

### Image Elements

SlideKit `image` → PptxGenJS `slide.addImage()`

| SlideKit property | PPTX equivalent | Notes |
|---|---|---|
| `resolved.x, .y, .w, .h` | `x, y, w, h` | Coordinate conversion |
| `src` | `path` or `data` | See Image Handling below |
| `props.fit` | Cropping | See below |
| `props.opacity` | `transparency` | Percentage |
| `props.rotate` | `rotate` | Degrees |

**Image handling complexity:**

1. **Local paths** (`hero.jpg`) — must be resolved to absolute URLs or base64. PptxGenJS accepts `data:` URIs (base64) or `path` (URLs). For browser-side export, fetch the image via `fetch()` → `blob()` → base64, then embed as `data:image/...;base64,...`. This ensures the PPTX is self-contained.

2. **External URLs** (`https://...`) — PptxGenJS can embed by URL, but the image must be accessible at generation time. Prefer fetching and embedding as base64 for reliability.

3. **`object-fit: cover`** — PPTX doesn't have CSS object-fit. To simulate `cover`, compute the crop rectangle: scale the image to fill the frame (maintaining aspect ratio), then crop the excess. PptxGenJS supports `sizing: { type: 'crop', x, y, w, h }`. This requires knowing the image's natural dimensions (via `Image()` element or stored metadata).

4. **`object-fit: contain`** — scale the image to fit within the frame without cropping. Center within the element bounds. PPTX `sizing: { type: 'contain' }` in PptxGenJS.

**Image resolution:** Since SlideKit targets 1920×1080 and PPTX renders at screen/print resolution, images should ideally be at least their rendered pixel dimensions. No conversion needed — PPTX embeds the full image and scales at render time.

---

### Group, VStack, HStack Elements

These are structural containers. Their children have already been resolved to absolute positions in the scene graph. The converter does NOT need to reconstruct the group/stack hierarchy — it just iterates all leaf elements in the flat scene graph and emits each one at its resolved position.

**Exception: z-ordering.** SlideKit renders elements in declaration order within layers (bg → content → overlay). The converter must emit elements in the same order to PptxGenJS, since PPTX stacks shapes in insertion order. Walk the original `slide.elements` array (which preserves declaration order), look up each element's resolved position, and emit in that order.

**Nested groups:** If a group has `clip: true`, the children should be masked to the group's bounds. PPTX doesn't have a direct "clip group" concept. Options:
- Ignore clipping (most groups don't use it)
- Use PPTX's built-in grouping (`slide.addGroup()` in PptxGenJS, which does clip)
- Post-process: any child element that extends beyond the group's bounds gets its position/size clamped

Recommendation: Use PptxGenJS `addGroup()` for groups with `clip: true`. For non-clipping groups, flatten.

---

### Connector Elements

SlideKit `connector` → PptxGenJS `slide.addShape('line', ...)` or `slide.addConnector()`

The scene graph stores `_connectorResolved.from` and `_connectorResolved.to` as absolute `{ x, y }` coordinates.

**Straight connectors:** Direct line from `from` to `to`. Map to `addShape('line', { x, y, x2, y2 })`.

**Curved connectors:** SlideKit renders these as SVG cubic beziers. PPTX doesn't have arbitrary bezier connectors. Options:
- Approximate as a straight line (loses curve)
- Use PPTX's built-in "curved connector" shape type, which supports one or two control points but uses a different curve model than CSS cubic beziers
- Render the SVG path as a freeform shape (`addShape('custGeom', ...)` with custom geometry) — most accurate but complex

Recommendation: Use PPTX curved connector for the initial implementation. The curve won't be pixel-identical but will be visually similar. Document the difference.

**Elbow connectors:** PPTX has native elbow connectors. Map the SlideKit elbow type to PPTX's elbow connector with the appropriate route.

**Arrowheads:** PptxGenJS supports `beginArrowType` and `endArrowType`. Map SlideKit's `arrow` property:
- `"end"` → `endArrowType: 'arrow'`
- `"start"` → `beginArrowType: 'arrow'`
- `"both"` → both
- `"none"` → neither

**Connector labels:** SlideKit renders labels as SVG `<text>` at the midpoint. PPTX connectors don't support inline labels. Emit the label as a separate text box positioned at the midpoint of the connector line.

**Dashed lines:** `props.dash` array (e.g., `[5, 5]`) → PptxGenJS `line.dashType`. Map common patterns:
- `[5, 5]` → `"dash"`
- `[2, 2]` → `"dot"`
- `[8, 4, 2, 4]` → `"dashDot"`
- Other → closest PptxGenJS preset or `"dash"` as fallback

---

### Bullet Lists

SlideKit `bullets()` produces a `vstack` of `group` elements (each group contains a bullet character text + item text). In the scene graph, these are already flattened to individual text elements at absolute positions.

**Two approaches:**

1. **Flatten** — emit each bullet character and item text as individual PPTX text boxes at their resolved positions. Visually accurate but produces many small shapes.

2. **Reconstruct** — detect the `_compound: "bullets"` tag on the parent element and rebuild as a single PPTX text box with PptxGenJS bullet formatting (`bullet: { type: 'bullet', char: '•' }`, with indent levels). Produces cleaner PPTX that's editable as a real bullet list.

Recommendation: Approach 2 when the `_compound` tag is present, with fallback to Approach 1. The `_bulletItems` metadata on the element stores the original item structure.

---

## CSS-to-PPTX Property Mappings

### Gradient Mapping

CSS gradients → PPTX gradient fills. This is the most complex translation.

**Linear gradients:**

```css
/* CSS */
background: linear-gradient(135deg, #1a1a3e 0%, #2a2a5e 100%);
```

```js
// PptxGenJS
fill: {
  type: 'gradient',
  gradientType: 'linear',
  angle: 135,  // PPTX uses same degree convention: 0=right, 90=down
  stops: [
    { position: 0, color: '1a1a3e' },
    { position: 100, color: '2a2a5e' },
  ]
}
```

**Parsing CSS linear-gradient:**

1. Extract angle: `135deg` → `135`. Keywords (`to right` → `90`, `to bottom` → `180`, etc.).
2. Extract color stops: parse `#hex position%` or `rgba(...) position%` pairs.
3. Handle unitless stops (CSS distributes evenly if positions are omitted).

**PPTX angle convention:** PPTX uses 0° = right, 90° = down, which matches CSS `linear-gradient` convention. No conversion needed.

**Radial gradients:**

```css
/* CSS */
background: radial-gradient(ellipse at 30% 40%, rgba(124,92,191,0.2) 0%, transparent 60%);
```

PptxGenJS supports `gradientType: 'path'` for radial-like fills. However, the PPTX model differs from CSS:
- PPTX radial gradients don't support arbitrary focal points (`at 30% 40%`) — they center on predefined positions (center, top-left, etc.)
- `transparent` as a stop color → PPTX doesn't have a "transparent" color. Use the slide background color with 100% transparency.

**Fidelity gap:** Radial gradients with off-center focal points will be approximate. Map the focal point to the nearest PPTX preset position. Document this.

**Multiple backgrounds:**

CSS allows stacking: `background: gradient1, gradient2`. PPTX shapes have a single fill. Options:
- Use only the first (topmost) gradient
- Stack multiple shapes at the same position, each with one gradient and appropriate transparency

Recommendation: Use only the first gradient for simplicity. Stacked gradient backgrounds are typically used for subtle decorative effects that won't significantly impact the presentation.

---

### Shadow Mapping

CSS `box-shadow` → PPTX shape shadow.

```css
/* CSS */
box-shadow: 0 8px 32px rgba(0,0,0,0.3);
/*          ↑ ↑   ↑    ↑               */
/*          x y  blur  color            */
```

```js
// PptxGenJS
shadow: {
  type: 'outer',
  angle: Math.atan2(y, x) * (180 / Math.PI),  // direction angle
  blur: blur * 0.75,  // px to pt
  offset: Math.sqrt(x*x + y*y) * 0.75,  // distance in pt
  color: '000000',
  opacity: 0.3,  // alpha channel
}
```

**Parsing CSS box-shadow:**

1. Split into `offsetX offsetY blurRadius spreadRadius color`
2. `spreadRadius` has no PPTX equivalent — ignore it (document as fidelity gap)
3. `offsetX/Y` → compute angle and distance
4. Parse color into hex + alpha
5. Convert px measurements to points

**Multiple shadows:** CSS allows comma-separated shadows. PPTX shapes have one shadow. Use the first shadow only.

**Inset shadows:** `box-shadow: inset ...` → PptxGenJS `type: 'inner'`.

**CSS text-shadow:** Similar mapping but applied via PptxGenJS text `shadow` option rather than shape-level shadow.

---

### Border Mapping

CSS `border` → PPTX shape border.

```css
/* CSS */
border: 1px solid rgba(255,255,255,0.15);
```

```js
// PptxGenJS
border: {
  type: 'solid',
  pt: 0.75,  // 1px * 0.75
  color: 'FFFFFF',
  transparency: 85,  // (1 - 0.15) * 100
}
```

**Parsing:** Split CSS shorthand into `width style color`. Map `style`:
- `solid` → `"solid"`
- `dashed` → `"dash"`
- `dotted` → `"dot"`
- `none` → omit border

---

### Color Mapping

SlideKit uses CSS color formats. PPTX uses 6-char hex + optional transparency percentage.

| CSS format | PPTX mapping |
|---|---|
| `#ffffff` | `'FFFFFF'`, transparency `0` |
| `#fff` | Expand to `'FFFFFF'` |
| `rgba(255,255,255,0.6)` | `'FFFFFF'`, transparency `40` (= `(1 - 0.6) * 100`) |
| `hsla(...)` | Convert to RGB first, then hex + transparency |
| `transparent` | `'000000'`, transparency `100` |

Need a CSS color parser. Many small libraries exist, or implement a focused parser for the formats SlideKit actually uses (`#hex`, `rgba()`, `hsla()`, named colors).

---

### Backdrop Filter (No Equivalent)

```css
backdrop-filter: blur(12px);
-webkit-backdrop-filter: blur(12px);
```

PowerPoint has no equivalent. The glassmorphism effect (frosted glass over background content) cannot be reproduced. Options:

1. **Ignore** — drop the property silently
2. **Approximate** — use a semi-transparent fill (which is what the element already has via its `background` property). The blur effect is lost but the translucency is preserved.
3. **Rasterize** — capture a screenshot of the area behind the element, apply a Gaussian blur, and embed as a background image. Complex, fragile, and overkill for most cases.

Recommendation: Option 2 (ignore `backdrop-filter`, keep the existing semi-transparent fill). Document as a known limitation.

---

## Slide-Level Properties

### Slide Background

SlideKit backgrounds are set via `slide.background`:

| SlideKit background | PPTX mapping |
|---|---|
| Solid color (`#0c0c14`) | `slide.background = { color: '0c0c14' }` |
| CSS gradient | `slide.background = { fill: { type: 'gradient', ... } }` |
| Image path | `slide.background = { path: '...' }` or base64 data |

### Speaker Notes

`slide.notes` string → PptxGenJS `slide.addNotes(text)`. Direct mapping.

### Slide Dimensions

Set once on the PptxGenJS `Presentation` object:

```js
const pptx = new PptxGenJS();
pptx.defineLayout({ name: 'SLIDEKIT', width: 13.333, height: 7.5 });
pptx.layout = 'SLIDEKIT';
```

This matches 1920×1080 at 144 DPI (PowerPoint's internal resolution) and produces standard 16:9 widescreen slides.

---

## Architecture

### Converter Pipeline

```
window.sk.layouts[i]
    ↓
1. Walk elements in declaration order (preserves z-order)
    ↓
2. For each element:
   a. Read resolved bounds → convert to inches
   b. Read authored props → map to PptxGenJS options
   c. Parse CSS values (gradients, shadows, borders, colors)
   d. Handle type-specific logic (text runs, image embedding, connectors)
    ↓
3. Emit PptxGenJS API calls
    ↓
4. pptx.writeFile() → .pptx download
```

### Module Structure

```
slidekit/
  export-pptx.js          — The converter module
  css-parser.js            — CSS gradient/shadow/border/color parsing utilities
```

`export-pptx.js` exports a single function:

```js
export async function exportPptx(options = {}) {
  // Reads from window.sk
  // Returns a Blob or triggers a download
}
```

Options:
- `filename` — output filename (default: `"slidekit-export.pptx"`)
- `slides` — array of slide indices to export (default: all)
- `embedImages` — whether to fetch and embed images as base64 (default: `true`)
- `resolveClassNames` — whether to call `getComputedStyle()` for className-styled elements (default: `false`)

### Dependencies

- **PptxGenJS** — loaded via CDN or npm. ~300KB minified. No other dependencies.
- **CSS parser** — custom, focused on the subset of CSS SlideKit actually produces. Not a general-purpose CSS parser.

---

## Fidelity Gaps Summary

Things that will not be pixel-identical between browser rendering and PPTX:

| Gap | Severity | Reason |
|---|---|---|
| Font weight granularity | Low | PPTX: bold/not-bold. CSS: 100–900 scale. Weights 300, 500 lose distinction. |
| Text line breaks | Medium | Different text engines may break lines at different points. Same font, same size, different wrapping. |
| `backdrop-filter: blur()` | Medium | No PPTX equivalent. Semi-transparent fill preserved, blur lost. |
| Radial gradient focal point | Low | PPTX radial gradients don't support arbitrary `at X% Y%` positions. |
| Multiple CSS backgrounds | Low | PPTX shapes have single fill. Only first gradient used. |
| Per-corner border radius | Low | PPTX has uniform `rectRadius` only. |
| CSS `box-shadow` spread | Low | PPTX shadows don't have spread radius. |
| Multiple shadows | Low | PPTX shapes support one shadow. First shadow used. |
| Curved connector geometry | Low | PPTX curved connectors use different curve model than SVG cubic beziers. |
| CSS animations | None at export | Animations are browser-only; PPTX has its own animation model (out of scope). |
| Font rendering | Low | Sub-pixel differences between browser and PPTX text engines. Affects kerning, hinting. |

None of these are showstoppers. The layout — which is the hard part — will be exact because SlideKit's absolute positioning maps directly to PPTX's absolute positioning model.

---

## Edge Cases and Gotchas

### Font Availability

The PPTX file references fonts by name. If the viewer's system doesn't have the font installed, PowerPoint substitutes. This is a standard PPTX problem, not specific to SlideKit.

Mitigation: PptxGenJS doesn't embed fonts (PPTX font embedding is complex and rarely done). Document which fonts the presentation uses. For Google Fonts, the viewer needs them installed or the presentation needs to be viewed on a system with them.

### Large Image Files

Embedding multiple high-resolution images as base64 can produce very large PPTX files. Consider:
- Compressing images before embedding (resize to rendered dimensions)
- Making image embedding optional
- Warning when total embedded image size exceeds a threshold (e.g., 50MB)

### Element Overlap and Transparency

SlideKit uses CSS `opacity` and RGBA colors for transparency. PPTX has shape-level `transparency` and fill-level `transparency`. These are different:
- CSS `opacity: 0.5` on a text element affects both the text AND its background → PPTX `transparency: 50` on the shape
- CSS `rgba(255,255,255,0.5)` as text color affects only the text color → PPTX text color with 50% transparency

The converter must distinguish between these two transparency models and map correctly.

### SVG Connector Rendering

SlideKit renders connectors as SVG elements in the DOM. The converter reads the resolved endpoints from the scene graph, not from the SVG. This means the converter doesn't need to parse SVG — it uses the same data the SVG was generated from.

### Empty or Decorative Elements

Background rects with only a gradient fill (no content) are common in SlideKit slides. These should be emitted as PPTX shapes with the gradient fill. Don't skip them — they're visually significant.

### Z-Order Across Layers

SlideKit has three layers: `bg`, `content`, `overlay`. All background-layer elements render below all content-layer elements, etc. The converter must emit elements in layer order (all bg first, then content, then overlay), preserving declaration order within each layer.

---

## Testing Strategy

1. **Round-trip comparison:** Render a SlideKit presentation in the browser, export to PPTX, open in PowerPoint, screenshot both, and compare visually. Not automated (different renderers will differ), but validates gross correctness.

2. **Property mapping unit tests:** For each CSS → PPTX mapping (gradients, shadows, borders, colors), test the parser with known inputs and verify the PPTX output structure.

3. **Coordinate accuracy tests:** Export a slide with elements at known positions, open the PPTX, extract element positions from the XML, and verify they match the expected inch values within floating-point tolerance.

4. **Edge case tests:** Empty slides, slides with only background elements, slides with 50+ elements, connectors with labels, nested groups, rotated elements.

---

## Open Questions

1. **Should the converter run in the browser or Node?** Browser is simpler (reads directly from `window.sk`, uses PptxGenJS's browser bundle). Node would require serializing the scene graph and passing it. Recommendation: browser-first, with Node support as a later option by accepting a serialized scene graph.

2. **Should we support PPTX → SlideKit import?** Out of scope for this proposal, but worth noting as a future direction. Parsing OOXML is significantly more complex than generating it.

3. **Should connector labels be separate text boxes or embedded in the connector?** PPTX connectors don't support inline text. Separate text boxes at the midpoint is the only option. But these text boxes won't move if someone drags the connector in PowerPoint — they'll need manual repositioning. Document this.

4. **How to handle `className`-only styling?** If a rect has `className: "glass-card"` and no inline `style`, the PPTX shape will have no fill/border/shadow. Either require inline styles for PPTX-targeted content, or add optional `getComputedStyle()` resolution at export time.

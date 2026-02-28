# SlideKit v2: Positioned HTML

## Philosophy

SlideKit becomes a **positioning engine for HTML**. You write standard HTML/CSS content. SlideKit places it on a 1920×1080 canvas at exact pixel coordinates and handles the spatial relationships between elements (relative positioning, collision detection, overflow).

LLMs know HTML. The less SlideKit-specific API surface, the better. Every element is a positioned `<div>` containing arbitrary HTML — a "floating div" on the canvas.

## The Problem with v1

SlideKit v1 has separate primitives (text, rect, image, rule) with a custom property system. To keep measurement and rendering in sync, it blocks ~103 CSS properties and requires SlideKit-specific "convenience props" like `size: 24` instead of `fontSize: '24px'`. This creates friction for both humans and AI agents who just want to write normal CSS.

The root cause: measurement and rendering used different style information. The fix isn't to make them share more information — it's to eliminate the distinction. Content is HTML. Measurement is "render HTML, read dimensions." Done.

## The New Model

### One element type: `el()`

```js
el(html, { x, y, w, h, ...layoutProps })
```

- `html` — an HTML string rendered via `innerHTML`. Can be anything the browser can render: text, images, SVG, tables, nested divs, empty string (for pure boxes).
- Layout props — the things SlideKit manages: position, size, identity, spatial relationships.

### Examples

```js
// Text — just HTML
el('<p style="font-size:48px; font-weight:700; color:white">Hello World</p>',
  { id: "title", x: 170, y: 200, w: 800 })

// Background box — empty content, styled container
el('', { x: 0, y: 0, w: 1920, h: 1080,
  style: { background: "linear-gradient(135deg, #1a1a2e, #16213e)" },
  layer: "background" })

// Image
el('<img src="photo.png" style="width:100%; height:100%; object-fit:cover">',
  { x: 100, y: 300, w: 600, h: 400 })

// Rich text — mixed styles in one element
el(`
  <span style="font-size:64px; font-weight:900; color:#00d4ff">860</span>
  <span style="font-size:24px; color:#ccc"> responses across </span>
  <span style="font-size:64px; font-weight:900; color:#00d4ff">20</span>
  <span style="font-size:24px; color:#ccc"> companies</span>
`, { id: "stats", x: 170, y: 400, w: 1580 })

// Bullet list — just an HTML list
el(`
  <ul style="font-size:24px; color:white; line-height:1.6; padding-left:40px">
    <li>First point with <strong>emphasis</strong></li>
    <li>Second point with <em>nuance</em></li>
    <li style="color:#888">De-emphasized third point</li>
  </ul>
`, { id: "bullets", x: 170, y: below("title", 40), w: 800 })

// Positioned relative to another element
el('<p style="font-size:20px; color:#888">Source: ICSE 2026 Survey</p>',
  { x: 170, y: below("bullets", 24), w: 800 })

// CSS classes work
el('<p class="slide-heading">Methodology</p>',
  { id: "heading", x: 170, y: 120, w: 800 })
```

### Layout props (what SlideKit manages)

| Prop | Type | Description |
|------|------|-------------|
| `id` | string | Element identity (for relative positioning references) |
| `x`, `y` | number or `below(id, gap)` / `rightOf(id, gap)` | Position on canvas |
| `w` | number | Width in pixels |
| `h` | number or omitted | Height in pixels. If omitted, auto-sized from content. |
| `anchor` | string | Which point (x,y) refers to: `"top-left"` (default), `"center-center"`, etc. |
| `layer` | string | `"background"`, `"content"` (default), or `"overlay"` |
| `rotate` | number | Rotation in degrees |
| `opacity` | number | 0–1 |
| `style` | object | CSS applied to the **container div** (background, border, borderRadius, boxShadow, etc.) |
| `className` | string | CSS class(es) applied to the container div |
| `overflow` | string | `"visible"` (default) or `"clip"` |

Everything else — fonts, colors, padding, layout within the element — lives in the HTML content or in CSS classes.

### Container style vs. content HTML

The `style` prop on `el()` applies to the outer positioned `<div>` — the container. This is for box-level styling:

```js
// Container gets the card styling; content is HTML inside it
el(`
  <h2 style="font-size:28px; margin:0 0 12px">Card Title</h2>
  <p style="font-size:18px; color:#ccc">Card description goes here</p>
`, {
  x: 100, y: 200, w: 400, h: 250,
  style: {
    background: "rgba(255,255,255,0.1)",
    borderRadius: "12px",
    padding: "24px",
    backdropFilter: "blur(10px)",
  }
})
```

## Measurement

### How it works

Measurement is: render the HTML in the off-screen measurement div, wait for any images to load, read `offsetWidth` / `scrollHeight`. The function is async because images load asynchronously.

```js
async function measure(html, props = {}) {
  const div = document.createElement("div");

  // Container constraints
  div.style.boxSizing = "border-box";
  if (props.w) div.style.width = `${props.w}px`;

  // Container styling (same as render will apply)
  if (props.className) div.className = props.className;
  if (props.style) applyStyleToDOM(div, filterStyle(props.style));

  // Content
  div.innerHTML = html;

  // Append to DOM (required for images to start loading and layout to compute)
  _measureContainer.appendChild(div);

  // Wait for all images to load
  const imgs = div.querySelectorAll("img");
  if (imgs.length > 0) {
    await Promise.all([...imgs].map(img =>
      img.complete ? Promise.resolve() :
        new Promise(resolve => {
          img.onload = resolve;
          img.onerror = resolve; // don't block on broken images
        })
    ));
  }

  // Read dimensions
  const result = { w: div.offsetWidth, h: div.scrollHeight };
  _measureContainer.removeChild(div);

  return result;
}
```

No convenience prop mapping. No line counting. No font-specific logic. Just "render HTML, wait for images, read dimensions."

### Async pipeline

Because `measure()` is async, `layout()` becomes async too. This is fine — `init()` is already async (it awaits `document.fonts.ready`). The call chain becomes:

```
init() → await layout() → await measure() → render()
```

Elements without images resolve immediately (no `<img>` tags = no await). The cache also skips the async path entirely on cache hits.

### Auto-height

When `h` is omitted, SlideKit measures the content to determine height:

```js
// Auto-height: SlideKit renders the HTML, reads the height
el('<p style="font-size:24px">This text will determine the element height</p>',
  { x: 100, y: 200, w: 600 })
  // → h is measured from rendered content
```

### Cache key

The cache key is the full input: `[html, w, containerStyle, className]`. Use sorted-key JSON.stringify for deterministic keys. Use `applyStyleToDOM()` (not `Object.assign`) for applying styles so CSS custom properties (`--*`) work via `setProperty`.

### Measurement node reuse

For performance, reuse a single measurement div rather than creating/destroying one per call. Between measurements, clear the div's `innerHTML`, `className`, and `style` attributes. The cache prevents redundant re-measurement of the same content.

### Measurement container placement

Mount the measurement container inside the slide's CSS context (a hidden `.slidekit-measure-layer` within the slide container) rather than directly on `<body>`. This ensures inherited CSS properties (font-smoothing, text-rendering, default font) match between measurement and rendering.

**Limitation**: CSS selectors that depend on DOM ancestry beyond the slide container won't match in the measurement div. Simple class selectors (`.heading { ... }`) work. Deeply nested contextual selectors may not.

## What Gets Removed

### Element factories: text(), rect(), image(), rule(), html(), bullets()

Deleted entirely. No thin wrappers, no deprecation period. Clean break.

### Convenience props and CONVENIENCE_MAP

No more `size: 24`, `font: "Inter"`, `weight: 700`, `fill: "#red"`, `align: "center"`. Write standard CSS in the HTML content or container style.

The full list removed: `color`, `font`, `size`, `weight`, `fontStyle`, `fontVariant`, `textTransform`, `lineHeight`, `letterSpacing`, `wordSpacing`, `fill`, `radius`, `border`, `align`, `shadow`.

### measureText() in its current form

Replaced by `measure()` — a simpler function that renders HTML and reads dimensions. No font prop extraction, no line counting, no convenience prop mapping.

### Line counting

The current `measureText()` computes `lineCount` from `scrollHeight / (fontSize * lineHeight)`. This is removed. Overflow detection uses DOM comparison (`scrollHeight > h`) instead of line math.

### ~90 BLOCKED_PROPERTIES entries

The massive blocklist shrinks to a small set of properties that would break the container div's positioning:

```
position, top, left, right, bottom, inset*    — library owns positioning
width, height, min/max-width/height           — library owns via w/h
display                                       — library needs block
transform, translate, rotate, scale           — library owns via rotate prop
margin*                                       — breaks absolute positioning
contain, contentVisibility                    — can suppress layout/paint
```

That's ~20–25 entries instead of 103.

Note: we do NOT block font properties, padding, line-height, white-space, or any other content-affecting CSS. These are all fine now because measurement renders the full HTML including all styles.

### BLOCKED_SUGGESTIONS

Shrinks to match the remaining ~15–20 blocked properties.

### filterStyleForMeasurement()

Not needed. There's only one filter — the container div's blocked-properties check — and it's the same for measurement and rendering. This avoids the "two filters = new split brain" problem.

## What Stays

- **Two-phase pipeline**: layout() computes positions/dimensions, then render() creates DOM. Cleanly separated.
- **Scene graph**: `window.scene` inspection before rendering still works. Scene elements now store the HTML content and resolved bounds.
- **Topo sort**: Kahn's algorithm resolves `below()`/`rightOf()` dependencies.
- **Relative positioning**: `below("id", gap)`, `rightOf("id", gap)`.
- **Collision detection**: Bounding box overlap detection (unchanged — it compares boxes, doesn't care what's inside).
- **Safe zone**: Configurable margin with warnings for elements near edges.
- **Layers**: background, content, overlay — rendered back-to-front.
- **Groups**: `group()` as a coordinate offset container for children.
- **Stacks**: `vstack()` / `hstack()` as layout helpers that resolve to absolute coordinates.
- **Debug overlay**: Bounding boxes, safe zone, element IDs.
- **filterStyle()**: Still filters the container div's `style` prop, but with a much smaller blocklist.
- **Anchor system**: `anchor: "center-center"` etc. still controls what (x,y) refers to.

## Design Constraints

### fitText and mixed-size content

`fitText()` works by binary-searching the container's `fontSize` until content fits within a bounding box. This means inner elements must use **relative units** (`em`, `%`) to scale with the root:

```js
// ✅ Works — relative units scale with root fontSize
el('<span style="font-size:2em">Big</span> and <span style="font-size:0.75em">small</span>',
  { x: 100, y: 200, w: 600, h: 200, fitText: true })

// ❌ Won't scale — absolute px sizes ignore root fontSize
el('<span style="font-size:48px">Big</span> and <span style="font-size:18px">small</span>',
  { x: 100, y: 200, w: 600, h: 200, fitText: true })
```

### Validation with mixed content

For minimum font size checks on elements containing mixed sizes, SlideKit walks child nodes via `querySelectorAll('*')` and checks each computed `fontSize`. The container's `getComputedStyle().fontSize` only reflects the root.

### Overflow detection

Overflow is detected by comparing `scrollHeight > h` after rendering in the measurement div. No line counting needed. The `overflow: "clip"` prop sets `overflow: hidden` on the container.

### CSS class selector scope

The measurement div is mounted inside the slide container's CSS context, so class-based styles resolve correctly for the slide's stylesheets. Selectors that depend on DOM structure outside the slide container may not match during measurement.

### Images

`measure()` waits for all `<img>` elements to load before reading dimensions, so auto-height works correctly with images. Broken images (`onerror`) don't block — measurement proceeds with the browser's broken-image placeholder size.

For best results, provide explicit `h` on the container when the image size is known — this skips the async wait entirely since measurement isn't needed:

```js
// Known size — no async wait needed, h is explicit
el('<img src="photo.png" style="width:100%; height:100%; object-fit:cover">',
  { x: 100, y: 200, w: 600, h: 400 })

// Auto-height — measure() waits for image to load, then reads height
el('<img src="photo.png" style="width:100%">',
  { x: 100, y: 200, w: 600 })
```

### Default HTML margins

Browsers apply default margins to elements like `<p>`, `<h1>`, `<ul>`. SlideKit applies a minimal CSS reset to the container div's content:

```css
.slidekit-el > * { margin: 0; }
```

This zeroes out top-level child margins so positioning is predictable. If you want margins between elements inside a single `el()`, add them explicitly via `style` or `margin` in your HTML.

### Container style vs. content style — rule of thumb

- **Container `style` prop**: box-level appearance — `background`, `borderRadius`, `padding`, `boxShadow`, `backdropFilter`, `border`. These affect the outer div that SlideKit positions.
- **HTML content**: everything visual inside — typography, colors, layout, spacing between inner elements.

When in doubt: if it's about the "card" or "box," put it in container `style`. If it's about the text or content inside, put it in the HTML.

### Width-omitted behavior

When both `w` and `h` are omitted, the element's container has no width constraint. Content will size to its natural/intrinsic width up to the canvas width (1920px). This is rarely useful — most elements should specify at least `w`.

### Font loading

Measurement requires fonts to be loaded. SlideKit's `init()` already waits for `document.fonts.ready`. If a CSS class references a font not yet loaded, measurement may use the fallback font. SlideKit warns when `getComputedStyle().fontFamily` doesn't match any loaded font face.

## v1 → v2 Cheat Sheet

Quick reference for rewriting v1 elements as `el()`:

| v1 | v2 |
|----|-----|
| `text("Hello", { size: 24, font: "Inter", style: { color: "white" } })` | `el('<p style="font-size:24px; font-family:Inter; color:white">Hello</p>', { ... })` |
| `rect({ fill: "#1a1a2e", radius: 12 })` | `el('', { style: { background: "#1a1a2e", borderRadius: "12px" } })` |
| `image("photo.png", { fit: "cover" })` | `el('<img src="photo.png" style="width:100%;height:100%;object-fit:cover">', { w: 600, h: 400 })` |
| `rule({ direction: "horizontal" })` | `el('', { w: 800, h: 2, style: { background: "white" } })` |
| `bullets(items, { size: 24 })` | `el('<ul style="font-size:24px"><li>...</li></ul>', { ... })` |
| `size: 24, weight: 700` | `style="font-size:24px; font-weight:700"` in HTML |
| `style: { color: "red" }` on element | `style="color:red"` in HTML, or `style: { color: "red" }` on container |

## Implementation Order

1. **Add `el()` factory** — new element type, accepts HTML content string
2. **Add `measure()` function** — render HTML in off-screen div, read dimensions (with node reuse and cache)
3. **Add CSS reset** — `.slidekit-el > * { margin: 0; }` for predictable positioning
4. **Update layout pipeline** — `getEffectiveDimensions()` calls `measure()` for el() elements
5. **Update render pipeline** — `renderElementFromScene()` renders el() via `innerHTML`
6. **Replace BLOCKED_PROPERTIES** — new small set (~20–25 entries): positioning, sizing, transform, margin, contain
7. **Update BLOCKED_SUGGESTIONS** — match new blocklist with helpful messages
8. **Mount measurement container in slide context** — move from `<body>` to hidden layer inside slide container
9. **Update overflow detection** — use `scrollHeight > h` instead of line counting
10. **Update fitText()** — binary search by setting root `fontSize`, checking `scrollHeight`
11. **Add validation** — walk child nodes for min font size checks
12. **Delete v1 factories** — remove text(), rect(), image(), rule(), html(), bullets() and all supporting code (CONVENIENCE_MAP, applyDefaults(), measureText(), etc.). Clean break, no wrappers.
13. **Update tests** — new tests for el(), delete v1-specific tests
14. **Update API.md and OVERVIEW.md** — document new model
15. **Rewrite test_dir_1/slides.js** — convert all 17 slides from v1 primitives to el()

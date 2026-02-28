# SlideKit

A coordinate-based slide layout library for AI agents and humans. SlideKit gives you direct control over where every element is placed on a 1920x1080 canvas, with text measurement, auto-fit sizing, collision detection, and structured validation -- eliminating the CSS layout debugging loops that plague AI-generated presentations.

## Quick Start

Copy this into an HTML file in your `slidekit/` directory (alongside `slidekit.js`) and serve it from a local web server. ES module imports require a server -- opening the file directly via `file://` will not work.

```bash
# Start a local server from the slidekit/ directory
python -m http.server 8000 --directory slidekit/
# Then open http://localhost:8000/your-file.html
```

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5/dist/reveal.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5/dist/theme/black.css">
</head>
<body>
  <div class="reveal"><div class="slides"></div></div>
  <script src="https://cdn.jsdelivr.net/npm/reveal.js@5/dist/reveal.js"></script>
  <script type="module">
    import { init, render, text, rect, rule, below } from './slidekit.js';

    await init();

    await render([{
      background: "#0c0c14",
      elements: [
        text("Hello, SlideKit", {
          id: "title", x: 960, y: 400, w: 1200,
          anchor: "tc", size: 72, weight: 700, color: "#fff", align: "center",
        }),
        rule({
          x: 900, y: below("title", { gap: 24 }), w: 120,
          color: "#7c5cbf", thickness: 3,
        }),
        text("Coordinate-based layout for presentations", {
          x: 960, y: below("title", { gap: 60 }), w: 800,
          anchor: "tc", size: 32, color: "rgba(255,255,255,0.6)", align: "center",
        }),
      ],
    }]);

    Reveal.initialize({ width: 1920, height: 1080, center: false });
  </script>
</body>
</html>
```

## Philosophy

### Why SlideKit Exists

CSS auto-layout (flexbox, grid) is the wrong abstraction for slides. Slides are fixed-dimension canvases where elements go at specific locations with explicit sizes. When AI agents use CSS for slide layout, they get trapped in debugging loops -- fighting reflow, specificity cascades, and emergent layout behaviors they cannot predict.

SlideKit separates concerns:

- **Coordinates for layout.** Every element is placed at exact pixel coordinates on a 1920x1080 canvas. No reflow, no surprises.
- **CSS for styling.** Colors, gradients, shadows, border-radius, animations -- all the visual properties CSS excels at -- pass through freely.
- **Structured feedback.** The library returns machine-readable warnings and errors about overlaps, out-of-bounds elements, and font size issues. No screenshots needed.

### The Two-Phase Pipeline

```
Specification  -->  Layout Solve  -->  Render
(agent writes)     (library runs)     (library renders)
```

1. **Specification:** Define slides as arrays of elements with coordinates.
2. **Layout Solve:** The library resolves relative positions, measures text, detects collisions, and validates the layout.
3. **Render:** Produces absolutely-positioned `<div>` elements inside Reveal.js slides.

The agent can inspect the layout result (warnings, errors, resolved positions) before or after rendering.

## API Reference

### Initialization

```js
import { init, safeRect, getConfig } from './slidekit.js';

await init({
  slide: { w: 1920, h: 1080 },           // Canvas dimensions (fixed)
  safeZone: { left: 120, right: 120, top: 90, bottom: 90 },  // Content margins
  strict: false,                           // Lenient (warnings) or strict (errors) validation
  minFontSize: 24,                         // Projection readability threshold
  fonts: [                                 // Fonts to preload
    { family: "Space Grotesk", weights: [400, 600, 700], source: "google" },
  ],
});

safeRect();  // { x: 120, y: 90, w: 1680, h: 900 }
```

### Element Primitives

All elements share common positioning properties:

| Property    | Type     | Default     | Description |
|-------------|----------|-------------|-------------|
| `id`        | string   | auto        | Unique identifier for referencing |
| `x`         | number   | 0           | X position in slide coordinates |
| `y`         | number   | 0           | Y position in slide coordinates |
| `w`         | number   | required    | Width in pixels |
| `h`         | number   | auto        | Height (auto-measured for text) |
| `anchor`    | string   | `"tl"`      | Which point (x,y) refers to (see Anchor System) |
| `layer`     | string   | `"content"` | Z-layer: `"bg"`, `"content"`, `"overlay"` |
| `opacity`   | number   | 1           | Element opacity (0-1) |
| `z`         | number   | 0           | Z-order within layer (higher = on top) |
| `rotate`    | number   | 0           | Rotation in degrees (applied via CSS transform) |
| `style`     | object   | `{}`        | CSS properties for visual styling |
| `className` | string   | `""`        | CSS class names (requires corresponding CSS) |

#### `text(content, props)`

```js
import { text } from './slidekit.js';

text("Title Text", {
  x: 170, y: 300, w: 800,
  font: "Space Grotesk", size: 64, weight: 700, color: "#fff",
  lineHeight: 1.1, letterSpacing: "0.02em", align: "left",
  overflow: "warn",   // "visible" | "warn" | "clip" | "ellipsis" | "shrink" | "error"
  maxLines: null,      // Limit line count
  style: { textShadow: "0 2px 20px rgba(0,0,0,0.5)" },
});
```

Text-specific properties: `font`, `size`, `weight`, `color`, `lineHeight`, `letterSpacing`, `align`, `overflow`, `maxLines`, `fit`.

If `h` is omitted, the height is auto-measured from the text content.

#### `image(src, props)`

```js
import { image } from './slidekit.js';

image("photo.jpg", {
  x: 0, y: 0, w: 1920, h: 1080,
  fit: "cover",       // "cover" | "contain" | "fill" | "none"
  position: "center", // CSS object-position
  layer: "bg",
});
```

#### `rect(props)`

```js
import { rect } from './slidekit.js';

rect({
  x: 100, y: 200, w: 500, h: 400,
  fill: "#1a1a2e",    // Background shorthand
  radius: 12,         // Border radius shorthand
  style: {
    background: "linear-gradient(135deg, #1a1a3e, #2a2a5e)",
    borderRadius: "16px",
    boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
    border: "1px solid rgba(255,255,255,0.1)",
    backdropFilter: "blur(12px)",
  },
});
```

#### `rule(props)`

```js
import { rule } from './slidekit.js';

// Horizontal rule
rule({ x: 170, y: 470, w: 120, color: "#7c5cbf", thickness: 3 });

// Vertical rule
rule({ x: 500, y: 100, h: 400, direction: "vertical", color: "#fff", thickness: 1 });
```

For horizontal rules, `w` is the length. For vertical rules, `h` is the length.

#### `group(children, props)`

```js
import { group } from './slidekit.js';

group([
  rect({ x: 0, y: 0, w: 400, h: 300, fill: "rgba(255,255,255,0.06)" }),
  text("Title", { x: 24, y: 24, w: 352, size: 28, weight: 600, color: "#fff" }),
], {
  x: 100, y: 200,  // Move entire group
  scale: 1,         // Scale factor
  clip: false,       // Clip children to group bounds
});
```

Children coordinates are relative to the group origin.

#### `vstack(items, props)`

```js
import { vstack } from './slidekit.js';

vstack([
  text("First", { w: 400, size: 28, color: "#fff" }),
  text("Second", { w: 400, size: 28, color: "#fff" }),
  text("Third", { w: 400, size: 28, color: "#fff" }),
], {
  id: "my-vstack",
  x: 170, y: 200,
  gap: 16,          // Pixels between children
  align: "left",    // "left" | "center" | "right" | "stretch"
});
```

Children are laid out top-to-bottom. Each child's position is computed during layout solve based on measured heights. Children do not need explicit `x`/`y` coordinates -- the stack assigns them.

#### `hstack(items, props)`

```js
import { hstack } from './slidekit.js';

hstack([
  rect({ w: 300, h: 200, fill: "#1a1a2e" }),
  rect({ w: 300, h: 200, fill: "#2a2a5e" }),
  rect({ w: 300, h: 200, fill: "#3a3a6e" }),
], {
  id: "my-hstack",
  x: 170, y: 200,
  gap: 24,         // Pixels between children
  align: "top",    // "top" | "middle" | "bottom" | "stretch"
});
```

Children are laid out left-to-right. The stack computes absolute positions from the stack origin and each child's measured width.

### Anchor System

The `anchor` property controls which point of the element `(x, y)` refers to:

```
tl ---- tc ---- tr
|                |
cl      cc      cr
|                |
bl ---- bc ---- br
```

- `"tl"` (default) -- top-left corner
- `"cc"` -- center of element (useful for centering on slide)
- `"tc"` -- top-center (useful for centered headings)
- All 9 combinations: `tl`, `tc`, `tr`, `cl`, `cc`, `cr`, `bl`, `bc`, `br`

```js
// Center a title on the slide
text("TITLE", { x: 960, y: 540, w: 1200, anchor: "cc", align: "center", ... });
```

### Relative Positioning

Position elements relative to other elements. References are resolved during layout solve.

```js
import { below, above, rightOf, leftOf, centerIn,
         centerVWith, centerHWith,
         alignTopWith, alignBottomWith,
         alignLeftWith, alignRightWith } from './slidekit.js';

// Y = bottom edge of "title" + 24px gap
text("Subtitle", { y: below("title", { gap: 24 }), ... });

// X = right edge of "sidebar" + 40px gap
text("Content", { x: rightOf("sidebar", { gap: 40 }), ... });

// Center within the safe zone rectangle
text("Centered", { ...centerIn(safeRect()), w: 800 });

// Align edges with another element
text("Aligned", { y: alignTopWith("reference"), ... });
```

Available helpers:

| Helper                    | Description |
|---------------------------|-------------|
| `below(id, {gap})`       | Y below reference's bottom edge |
| `above(id, {gap})`       | Y above reference's top edge |
| `rightOf(id, {gap})`     | X right of reference's right edge |
| `leftOf(id, {gap})`      | X left of reference's left edge |
| `centerVWith(id)`         | Center vertically with reference |
| `centerHWith(id)`         | Center horizontally with reference |
| `alignTopWith(id)`        | Align top edges |
| `alignBottomWith(id)`     | Align bottom edges |
| `alignLeftWith(id)`       | Align left edges |
| `alignRightWith(id)`      | Align right edges |
| `centerIn(rect)`          | Center within a rectangle |

### Layout Solve

```js
import { layout } from './slidekit.js';

const result = await layout({
  elements: [ ... ],
  transforms: [ ... ],
});

result.elements;    // { [id]: { id, type, authored, resolved: {x,y,w,h}, provenance } }
result.warnings;    // [{ type, elementId, message }]
result.errors;      // [{ type, elementId, message }]
result.collisions;  // [{ elementA, elementB, overlapRect, overlapArea }]
```

The 4-phase pipeline:
1. **Resolve sizes** -- measure text, compute stack dimensions
2. **Resolve positions** -- topological sort of dependency graph, resolve relative positions
3. **Apply transforms** -- alignment, distribution, size matching
4. **Finalize** -- collision detection, validation, provenance tracking

### Text Measurement

```js
import { measureText, fitText } from './slidekit.js';

// Measure text dimensions without placing it
const metrics = measureText("Hello World", {
  font: "Inter", size: 32, weight: 400,
  lineHeight: 1.3, letterSpacing: "0",
  w: 800,  // Constrain width for wrapping
});
// metrics.block: { w: 800, h: 42 }
// metrics.lineCount: 1
// metrics.fontSize: 32

// Auto-fit text to a box
const fit = fitText("Long title that might need shrinking", {
  w: 600, h: 100,
}, {
  font: "Inter", weight: 700,
  minSize: 24, maxSize: 72,
});
// fit.fontSize: 48 (largest size that fits)
// fit.metrics: { ... }
// fit.warnings: []
```

### Alignment and Distribution

PowerPoint/Keynote-style alignment and distribution operations. These are registered as post-solve transforms on the slide definition.

```js
import { alignLeft, alignRight, alignTop, alignBottom,
         alignCenterH, alignCenterV,
         distributeH, distributeV,
         matchWidth, matchHeight, matchSize,
         fitToRect } from './slidekit.js';

const slide = {
  elements: [ ... ],
  transforms: [
    // Align top edges of three cards
    alignTop(["card1", "card2", "card3"]),

    // Distribute horizontally across the safe zone
    distributeH(["card1", "card2", "card3"], {
      startX: 120, endX: 1800, mode: "equal-gap",
    }),

    // Make all cards the same width
    matchWidth(["card1", "card2", "card3"]),

    // Fit a diagram into a specific rectangle
    fitToRect(["node1", "node2", "edge1"], {
      x: 100, y: 200, w: 800, h: 600,
    }),
  ],
};
```

Distribution modes:
- `"equal-gap"` -- equal space between adjacent elements
- `"equal-center"` -- equal spacing between element centers

### Compound Primitives

Higher-level primitives for common slide patterns.

#### `bullets(items, props)`

```js
import { bullets } from './slidekit.js';

bullets([
  "First point",
  "Second point",
  { text: "Third point with sub-items", children: [
    "Sub-point A",
    "Sub-point B",
  ]},
], {
  x: 170, y: 250, w: 700,
  size: 28, color: "#fff",
  bulletChar: "\u2022",       // or "\u2014", "\u2192", etc.
  bulletColor: "#7c5cbf",
  bulletGap: 16,         // Gap between bullet character and text (default: 16)
  indent: 40,            // Indent per nesting level
  gap: 12,               // Vertical gap between items
});
```

#### `connect(fromId, toId, props)`

```js
import { connect } from './slidekit.js';

connect("box-a", "box-b", {
  type: "straight",    // "straight" | "curved" | "elbow"
  arrow: "end",        // "none" | "start" | "end" | "both"
  color: "#7c5cbf",
  thickness: 2,
  dash: null,          // [5, 5] for dashed
  fromAnchor: "cr",    // 9-point anchor on source
  toAnchor: "cl",      // 9-point anchor on target
  label: "flow",
  labelStyle: { size: 14, color: "#999" },
});
```

#### `panel(children, props)`

```js
import { panel } from './slidekit.js';

panel([
  text("Feature", { w: "fill", size: 24, weight: 600, color: "#fff" }),
  rule({ w: "fill", color: "rgba(255,255,255,0.2)", thickness: 1 }),
  text("Description text.", { w: "fill", size: 18, color: "rgba(255,255,255,0.7)" }),
], {
  x: 100, y: 200, w: 400,
  padding: 24,
  gap: 16,
  className: "glass-card",  // CSS class for visual styling
});
```

Children with `w: "fill"` expand to `panel.w - 2 * padding`. The panel auto-computes its height from children + padding.

### Grid and Snap

```js
import { grid, snap } from './slidekit.js';

const g = grid({ cols: 12, gutter: 30 });
g.col(1);        // X position of column 1
g.spanW(1, 4);   // Width spanning columns 1 through 4

snap(173, 10);   // 170 -- round to nearest 10px
```

### Percentage Sugar

```js
text("Title", {
  x: "10%",       // 192px (10% of 1920)
  y: "20%",       // 216px (20% of 1080)
  w: "80%",       // 1536px
});

text("Safe", {
  x: "safe:5%",   // 5% of safe zone width, offset from safe zone left
  y: "safe:10%",
  w: "safe:90%",
});
```

Percentages are always relative to slide dimensions (1920x1080). Use `"safe:N%"` for safe-zone-relative values. Use `"fill"` for parent-relative sizing (inside panels).

### Debug Overlay

```js
import { renderDebugOverlay, removeDebugOverlay } from './slidekit-debug.js';

renderDebugOverlay({
  showBoxes: true,       // Bounding boxes colored by element type
  showSafeZone: true,    // Dashed safe zone boundary
  showIds: true,         // Element ID labels
  showAnchors: true,     // Anchor point dots
  showCollisions: true,  // Red highlight on overlaps
  slideIndex: 0,         // Which slide to overlay
});

removeDebugOverlay();    // Toggle off
```

### Rendering

```js
import { render } from './slidekit.js';

const result = await render(slides, {
  container: document.querySelector('.reveal .slides'),
});
// result.sections: Array of <section> DOM elements
// result.layouts: Array of layout solve results

// Scene model persisted at window.sk
window.sk.layouts;   // All layout results
window.sk.slides;    // Slide metadata
```

### Shadow Presets

```js
rect({ x: 0, y: 0, w: 400, h: 300, shadow: "lg" });
```

| Preset   | CSS Value |
|----------|-----------|
| `"sm"`   | `0 1px 3px rgba(0,0,0,0.2)` |
| `"md"`   | `0 4px 12px rgba(0,0,0,0.3)` |
| `"lg"`   | `0 8px 32px rgba(0,0,0,0.4)` |
| `"xl"`   | `0 16px 48px rgba(0,0,0,0.5)` |
| `"glow"` | `0 0 40px rgba(124,92,191,0.3)` |

### Repeat / Duplicate

```js
import { repeat } from './slidekit.js';

const cards = repeat(
  rect({ w: 300, h: 200, className: "glass-card" }),
  { count: 6, cols: 3, gapX: 30, gapY: 30, startX: 170, startY: 200 }
);
// Creates a 3x2 grid of cards
```

## Integration with Reveal.js

SlideKit renders into Reveal.js `<section>` elements. Each slide gets a `<div class="slidekit-layer">` container where all elements are positioned absolutely.

```html
<section>
  <div class="slidekit-layer" style="position:relative; width:1920px; height:1080px;">
    <!-- SlideKit elements here -->
  </div>
</section>
```

**Slide definition properties:**

```js
{
  id: "slide-id",                    // Sets section id attribute
  background: "#0c0c14",            // Color, gradient, or image URL
  elements: [ ... ],                 // SlideKit elements
  transforms: [ ... ],              // Alignment/distribution transforms
  notes: "Speaker notes text",       // Rendered as <aside class="notes">
}
```

**Reveal.js initialization:**

```js
Reveal.initialize({
  width: 1920,
  height: 1080,
  center: false,    // Important: let SlideKit handle centering
  hash: true,
  slideNumber: true,
  transition: 'fade',
});
```

## Theme CSS Loading Guide

SlideKit elements can reference CSS classes via the `className` property. These classes must exist in a loaded stylesheet.

### How to Load Theme CSS

**Option 1: `<link>` tag (recommended)**

```html
<link rel="stylesheet" href="theme.css">
```

**Option 2: Inline `<style>` block**

```html
<style>
  .glass-card {
    background: rgba(255,255,255,0.06);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 12px;
  }
</style>
```

### The CSS-Only Rule

Theme CSS files should contain **only visual styling properties**:

- Backgrounds, gradients, colors
- Borders, border-radius, shadows
- Typography (font-family, font-style, text-decoration)
- Filters, backdrop-filter
- Animations, transitions
- CSS custom properties (variables)

Theme CSS files should **never** contain layout properties:

- No `position`, `display`, `float`
- No `width`, `height`, `min-width`, `max-width`
- No `margin`, `padding` (padding on rects is managed by `panel()`)
- No `flex`, `grid`, `align-items`, `justify-content`

SlideKit strips layout properties from inline styles with warnings. But class-based layout properties will apply silently and conflict with SlideKit's positioning -- avoid them.

### Using Classes on Elements

```js
// The className must match a CSS class in a loaded stylesheet
rect({ x: 100, y: 200, w: 400, h: 300, className: "glass-card" });

// Multiple classes
rect({ x: 100, y: 200, w: 400, h: 300, className: "glass-card glow-accent" });
```

## CSS Property Handling

SlideKit blocks layout-related CSS properties from inline styles to prevent conflicts with absolute positioning. Blocked properties generate structured warnings.

**Blocked:** `position`, `display`, `float`, `top`, `left`, `width`, `height`, `margin`, `flex-*`, `grid-*`, `transform`, `overflow`

**Allowed:** `background`, `border`, `borderRadius`, `boxShadow`, `textShadow`, `filter`, `backdropFilter`, `color`, `opacity`, `fontFamily`, `fontSize`, `fontWeight`, `letterSpacing`, `textAlign`, `textDecoration`, `textTransform`, `clipPath`, `cursor`, `animation`, `transition`, CSS custom properties (`--*`)

**Convenience property mapping:**

| Prop        | CSS Equivalent       |
|-------------|---------------------|
| `color`     | `color`             |
| `font`      | `fontFamily`        |
| `size`      | `fontSize` (+ "px") |
| `weight`    | `fontWeight`        |
| `fill`      | `background`        |
| `radius`    | `borderRadius`      |
| `border`    | `border`            |
| `align`     | `textAlign`         |
| `shadow`    | `boxShadow`         |

If both a convenience prop and `style` specify the same CSS property, `style` wins.

## Scene Model (`window.sk`)

After `render()`, the full scene model is available at `window.sk`:

```js
window.sk.layouts          // Array of layout results (one per slide)
window.sk.layouts[0].elements  // { [id]: { id, type, authored, resolved, provenance } }
window.sk.layouts[0].warnings  // Layout warnings
window.sk.layouts[0].collisions // Detected overlaps
window.sk._config          // Current configuration
```

Each element in the scene graph has:

- `authored` -- the original specification (with relative positioning markers preserved)
- `resolved` -- the final absolute position `{ x, y, w, h }`
- `provenance` -- what determined each value (`"authored"`, `"constraint"`, `"measured"`, `"transform"`, `"stack"`)

## Examples

- [`examples/basic.html`](examples/basic.html) -- Single slide with text, rect, rule, and relative positioning
- [`examples/full-deck.html`](examples/full-deck.html) -- 5-slide deck with panels, bullets, connectors, and theme CSS
- [`examples/theme.css`](examples/theme.css) -- Dark theme CSS (styling only, no layout)

## Running Tests

```bash
# Start a local server
python -m http.server 8000 --directory slidekit/

# Open test page
# http://localhost:8000/test/test.html

# Open examples
# http://localhost:8000/examples/basic.html
# http://localhost:8000/examples/full-deck.html
```

Tests run in-browser since SlideKit requires a DOM for text measurement and rendering.

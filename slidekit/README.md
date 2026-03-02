# SlideKit

A coordinate-based slide layout library for AI agents and humans. SlideKit gives you direct control over where every element is placed on a 1920x1080 canvas, with text measurement, auto-fit sizing, collision detection, and structured validation -- eliminating the CSS layout debugging loops that plague AI-generated presentations.

## Quick Start

Copy this into an HTML file in your `slidekit/` directory and serve it from a local web server. Run `npm run build` first to generate the bundle in `dist/`. ES module imports require a server -- opening the file directly via `file://` will not work.

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
    import { init, render, el, below } from './dist/slidekit.bundle.js';

    await init();

    await render([{
      background: "#0c0c14",
      elements: [
        el("Hello, SlideKit", {
          id: "title", x: 960, y: 400, w: 1200,
          anchor: "tc", size: 72, weight: 700, color: "#fff", align: "center",
        }),
        el("", {
          x: 900, y: below("title", { gap: 24 }), w: 120, h: 3,
          style: { background: "#7c5cbf" },
        }),
        el("Coordinate-based layout for presentations", {
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

See [API.md](API.md) for complete API documentation with parameters, types, and usage patterns.

### Initialization

```js
import { init, safeRect, getConfig } from './dist/slidekit.bundle.js';

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

### Core Elements

See [API.md](API.md) for complete API documentation with parameters, types, and usage patterns.

All elements share common positioning properties: `id`, `x`, `y`, `w`, `h`, `anchor`, `layer`, `opacity`, `z`, `rotate`, `style`, `className`.

#### `el(html, props)` — Universal Element

The single primitive for creating all elements — text, shapes, images, or any HTML content.

```js
import { el } from './dist/slidekit.bundle.js';

// Text element (height auto-measured from content)
el("Title Text", {
  x: 170, y: 300, w: 800,
  size: 64, weight: 700, color: "#fff",
});

// Empty rectangle (background shape)
el("", {
  x: 100, y: 200, w: 500, h: 400,
  style: { background: "linear-gradient(135deg, #1a1a3e, #2a2a5e)", borderRadius: "16px" },
});

// Horizontal rule
el("", { x: 170, y: 470, w: 120, h: 3, style: { background: "#7c5cbf" } });
```

Text-specific properties: `font`, `size`, `weight`, `color`, `lineHeight`, `letterSpacing`, `align`, `overflow`, `maxLines`, `fit`.

#### `group(children, props)` — Grouping Container

```js
import { group } from './dist/slidekit.bundle.js';

group([
  el("", { x: 0, y: 0, w: 400, h: 300, fill: "rgba(255,255,255,0.06)" }),
  el("Title", { x: 24, y: 24, w: 352, size: 28, weight: 600, color: "#fff" }),
], { x: 100, y: 200 });
```

Children coordinates are relative to the group origin.

#### `vstack(items, props)` — Vertical Stack

```js
import { vstack } from './dist/slidekit.bundle.js';

vstack([
  el("First", { w: 400, size: 28, color: "#fff" }),
  el("Second", { w: 400, size: 28, color: "#fff" }),
  el("Third", { w: 400, size: 28, color: "#fff" }),
], { id: "my-vstack", x: 170, y: 200, gap: 16, align: "left" });
```

Children are laid out top-to-bottom. Heights are auto-measured; children do not need explicit `x`/`y`.

#### `hstack(items, props)` — Horizontal Stack

```js
import { hstack } from './dist/slidekit.bundle.js';

hstack([
  el("", { w: 300, h: 200, fill: "#1a1a2e" }),
  el("", { w: 300, h: 200, fill: "#2a2a5e" }),
  el("", { w: 300, h: 200, fill: "#3a3a6e" }),
], { x: 170, y: 200, gap: 24, align: "top" });
```

Children are laid out left-to-right.

#### `cardGrid(items, opts)` — Grid Layout

```js
import { cardGrid } from './dist/slidekit.bundle.js';

cardGrid([
  el("Card 1", { w: 300, h: 200, size: 24, color: "#fff" }),
  el("Card 2", { w: 300, h: 200, size: 24, color: "#fff" }),
  el("Card 3", { w: 300, h: 200, size: 24, color: "#fff" }),
  el("Card 4", { w: 300, h: 200, size: 24, color: "#fff" }),
], { x: 170, y: 200, cols: 2, gap: 24 });
```

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
el("TITLE", { x: 960, y: 540, w: 1200, anchor: "cc", align: "center", size: 64, color: "#fff" });
```

### Relative Positioning

Position elements relative to other elements. References are resolved during layout solve.

```js
import { below, above, rightOf, leftOf, centerIn,
         centerVWith, centerHWith,
         alignTopWith, alignBottomWith,
         alignLeftWith, alignRightWith } from './dist/slidekit.bundle.js';

// Y = bottom edge of "title" + 24px gap
el("Subtitle", { y: below("title", { gap: 24 }), w: 800, size: 28, color: "#fff" });

// X = right edge of "sidebar" + 40px gap
el("Content", { x: rightOf("sidebar", { gap: 40 }), w: 600, size: 24, color: "#fff" });

// Center within the safe zone rectangle
el("Centered", { ...centerIn(safeRect()), w: 800, size: 32, color: "#fff" });

// Align edges with another element
el("Aligned", { y: alignTopWith("reference"), w: 400, size: 24, color: "#fff" });
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
import { layout } from './dist/slidekit.bundle.js';

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

### Measurement

```js
import { measure } from './dist/slidekit.bundle.js';

// Measure text dimensions without placing it
const dims = await measure("Hello World", {
  font: "Inter", size: 32, weight: 400,
  lineHeight: 1.3, w: 800,
});
// dims: { w: 800, h: 42 }
```

`measure()` is async and uses a DOM-based measurement container. Results are cached.

### Alignment and Distribution

PowerPoint/Keynote-style alignment and distribution operations. These are registered as post-solve transforms on the slide definition.

```js
import { alignLeft, alignRight, alignTop, alignBottom,
         alignCenterH, alignCenterV,
         distributeH, distributeV,
         matchWidth, matchHeight, matchSize,
         fitToRect } from './dist/slidekit.bundle.js';

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

### Compound Elements

Higher-level elements for common slide patterns.

#### `figure(opts)` — Image with Optional Caption

```js
import { figure } from './dist/slidekit.bundle.js';

figure({
  src: "photo.jpg", x: 0, y: 0, w: 1920, h: 1080,
  fit: "cover", layer: "bg",
  caption: "Photo credit", captionGap: 8,
});
```

#### `connect(fromId, toId, props)`

```js
import { connect } from './dist/slidekit.bundle.js';

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
import { panel } from './dist/slidekit.bundle.js';

panel([
  el("Feature", { w: "fill", size: 24, weight: 600, color: "#fff" }),
  el("", { w: "fill", h: 1, style: { background: "rgba(255,255,255,0.2)" } }),
  el("Description text.", { w: "fill", size: 18, color: "rgba(255,255,255,0.7)" }),
], {
  x: 100, y: 200, w: 400,
  padding: 24, gap: 16,
  className: "glass-card",
});
```

Children with `w: "fill"` expand to `panel.w - 2 * padding`. The panel auto-computes its height from children + padding.

### Grid and Snap

```js
import { grid, snap } from './dist/slidekit.bundle.js';

const g = grid({ cols: 12, gutter: 30 });
g.col(1);        // X position of column 1
g.spanW(1, 4);   // Width spanning columns 1 through 4

snap(173, 10);   // 170 -- round to nearest 10px
```

### Percentage Sugar

```js
el("Title", {
  x: "10%",       // 192px (10% of 1920)
  y: "20%",       // 216px (20% of 1080)
  w: "80%",       // 1536px
  size: 48, color: "#fff",
});

el("Safe", {
  x: "safe:5%",   // 5% of safe zone width, offset from safe zone left
  y: "safe:10%",
  w: "safe:90%",
  size: 32, color: "#fff",
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
import { render } from './dist/slidekit.bundle.js';

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
el("", { x: 0, y: 0, w: 400, h: 300, shadow: "lg" });
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
import { repeat } from './dist/slidekit.bundle.js';

const cards = repeat(
  el("", { w: 300, h: 200, className: "glass-card" }),
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
el("", { x: 100, y: 200, w: 400, h: 300, className: "glass-card" });

// Multiple classes
el("", { x: 100, y: 200, w: 400, h: 300, className: "glass-card glow-accent" });
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

- [`examples/basic.html`](examples/basic.html) -- Single slide with elements and relative positioning
- [`examples/full-deck.html`](examples/full-deck.html) -- 5-slide deck with panels, connectors, and theme CSS
- [`examples/theme.css`](examples/theme.css) -- Dark theme CSS (styling only, no layout)

## Project Architecture

SlideKit's source is organized as TypeScript modules under `slidekit/src/`. Users import from the bundle (`dist/slidekit.bundle.js`), which re-exports the public API from the barrel file (`slidekit.ts`) — the internal module structure is an implementation detail.

### Module Structure

```
slidekit/
├── slidekit.ts          # Barrel file — re-exports public API from src/
├── slidekit-debug.js    # Debug overlay (separate import)
├── dist/                # esbuild output (bundle + sourcemap)
└── src/                 # Internal modules
    ├── state.ts         # Centralized mutable state (single exported object)
    ├── config.ts        # init(), safeRect(), font loading
    ├── elements.ts      # el(), group(), vstack(), hstack(), cardGrid()
    ├── anchor.ts        # Anchor resolution (9-point system)
    ├── style.ts         # CSS property filtering, shadow presets
    ├── spacing.ts       # Spacing token scale (xs → section)
    ├── id.ts            # Auto-incrementing element IDs
    ├── relative.ts      # Relative positioning helpers (below, rightOf, etc.)
    ├── measure.ts       # DOM-based text measurement + caching
    ├── transforms.ts    # Alignment, distribution, size matching
    ├── renderer.ts      # DOM rendering into Reveal.js sections
    ├── compounds.ts     # connect(), panel(), figure()
    ├── utilities.ts     # grid(), snap(), repeat(), percentage resolution
    ├── dom-helpers.ts   # Shared DOM utilities
    ├── types.ts         # TypeScript type definitions
    ├── assertions.ts    # Runtime assertion helpers
    ├── connectorRouting.ts # Connector path routing (straight, elbow, curved)
    ├── lint.ts          # Slide and deck linting rules
    ├── layout.ts        # Re-export barrel for layout pipeline
    └── layout/          # Layout solve pipeline (6 sub-modules)
        ├── index.ts     # Pipeline orchestrator
        ├── helpers.ts   # Deep clone, element flattening
        ├── intrinsics.ts# Phase 1: resolve sizes (text measurement, stacks)
        ├── positions.ts # Phase 2: topological sort + position resolution
        ├── overflow.ts  # Phase 2.5: overflow policy checks
        └── finalize.ts  # Phase 4: collision detection, validation
```

All source files are TypeScript (`.ts`). Type definitions live in `src/types.ts`. The `tsconfig.json` at the repo root configures strict type checking so `tsc --noEmit` validates types across all modules without a compilation step.

### Import Convention

```js
// Users always import from the bundle (or the barrel in TS source):
import { init, render, el, below } from './dist/slidekit.bundle.js';

// Internal modules import from each other directly:
// (e.g., renderer.ts imports from state.ts, config.ts, etc.)
```

## Development

### Prerequisites

```bash
npm install   # Install esbuild, eslint, typescript, playwright
```

### NPM Scripts

| Script             | Command                | Description |
|--------------------|------------------------|-------------|
| `npm run build`    | esbuild (bundled)      | Bundle → `dist/slidekit.bundle.js` with sourcemap |
| `npm run typecheck`| `tsc --noEmit`         | TypeScript type checking across all `src/` files |
| `npm run lint`     | `eslint slidekit/src/` | Lint with `import/no-cycle` rule to prevent circular dependencies |

### Type Safety

SlideKit uses TypeScript source files (`.ts`). Type definitions live in `src/types.ts`. The `tsconfig.json` at the repo root configures strict type checking so `tsc --noEmit` validates types across all modules without a compilation step.

## Running Tests

```bash
# Run the full test suite (~1027 tests, Playwright-based browser runner)
node run-tests.js
```

Tests use Playwright to run in a real browser since SlideKit requires a DOM for text measurement and rendering. The test runner starts a local server automatically.

To run examples manually:

```bash
# Start a local server
python -m http.server 8000 --directory slidekit/

# Open examples
# http://localhost:8000/examples/basic.html
# http://localhost:8000/examples/full-deck.html
```

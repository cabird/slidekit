# SlideKit: A Coordinate-Based Slide Layout Library for AI Agents

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Design Philosophy](#design-philosophy)
3. [Architecture Overview](#architecture-overview)
4. [Core Primitives (Tier 1)](#core-primitives-tier-1)
5. [The CSS Styling Integration](#the-css-styling-integration)
6. [Text System](#text-system)
7. [Layout System](#layout-system)
8. [Inspection & Validation](#inspection--validation)
9. [Z-Order & Layering](#z-order--layering)
10. [Alignment & Distribution (Tier 2)](#alignment--distribution-tier-2)
11. [Compound Primitives (Tier 2)](#compound-primitives-tier-2)
12. [Tier 3 Features](#tier-3-features)
13. [Integration with Reveal.js](#integration-with-revealjs)
14. [Integration with the Presentation Maker Pipeline](#integration-with-the-presentation-maker-pipeline)
15. [Live Editing & Round-Trip (Phase 2)](#live-editing--round-trip-phase-2)
16. [Design Decisions Log](#design-decisions-log)

---

## Problem Statement

### What Goes Wrong Today

When AI agents build Reveal.js presentations using HTML + CSS, they repeatedly encounter the same failures:

1. **Text too small for projection.** The agent picks a font size that looks reasonable in a code editor but is unreadable at 50 feet. There's no feedback mechanism to catch this before export.

2. **Content goes off the edges of the slide.** A text block or image extends beyond the visible 1920×1080 area. The agent doesn't know this happened because it can't see the rendered output during authoring.

3. **Content clusters in the center.** The agent uses flexbox centering or conservative margins, producing slides where all content occupies the middle 30% of the canvas — wasting the full slide area.

4. **Elements overlap each other.** Two absolutely-positioned elements, or two flex children that the agent expected to stack, end up on top of each other. The agent can't detect this without visual inspection.

5. **Misalignment.** Three cards that should have aligned top edges are off by varying amounts because they're in different flex containers with different padding.

6. **Cascading breakage.** The agent fixes one slide's layout and inadvertently breaks another because a shared CSS class was modified, or because a parent container's sizing changed.

7. **Endless iteration loops.** The agent tries to fix a layout issue, exports to PDF, sees the problem persists (or a new one appeared), tries another CSS change, exports again, and repeats — sometimes for dozens of cycles without converging.

### Root Cause

The fundamental problem is that **CSS auto-layout is the wrong abstraction for slides.** CSS was designed for reflowing documents — web pages where content flows top-to-bottom, wraps at viewport edges, and adapts to variable screen sizes. Slides are the opposite: they are **fixed-dimension canvases** (1920×1080) where elements are placed at **specific locations** with **explicit sizes**.

When an agent uses flexbox or grid to lay out slide content, it's asking the browser's layout engine to *decide* where things go. When the engine decides wrong, the agent has to fight it — adding `!important`, overriding specificity, adjusting margins and padding — in a debugging loop that CSS was never designed to make easy.

Additionally, **LLMs are bad at simulating browser reflow engines.** They cannot mentally execute the cascade, compute specificity, resolve margin collapsing, or predict how flex-grow interacts with min-width. They *are* good at coordinate geometry — "put this at (170, 340) with width 800" is unambiguous and deterministic.

### What We Need

A library that:
- Gives the agent **direct control** over where every element is placed (absolute coordinates)
- Provides **measurement** so the agent can reason about sizes before placing things
- Provides **automatic safety checks** — out-of-bounds detection, overlap detection, minimum font size warnings
- Returns **structured feedback** about the resolved layout so the agent can self-correct
- Still allows the agent to use **CSS for what CSS is good at** — fonts, colors, gradients, shadows, border-radius, animations

---

## Design Philosophy

### Principle 1: Slides Are Canvases, Not Documents

A slide is a fixed 1920×1080 pixel canvas. Nothing reflows. Nothing scrolls. Every element has an explicit position and size. The library enforces this model — there is no auto-layout, no flexbox, no grid in the positioning system.

### Principle 2: CSS for Styling, Coordinates for Layout

CSS is excellent at specifying visual properties: gradients, shadows, border-radius, text effects, backdrop filters, animations. LLMs know CSS styling cold and can produce sophisticated visual effects.

CSS is terrible (for agents) at specifying layout: flexbox interactions, margin collapsing, specificity cascades, relative sizing.

SlideKit separates these concerns completely. The library owns all positioning (x, y, width, height). The agent owns all styling (colors, gradients, shadows, fonts) via a `style` property that accepts raw CSS.

### Principle 3: Deterministic and Measurable

Every operation in SlideKit produces a deterministic result. There are no emergent layout behaviors. If the agent places an element at (170, 340) with width 800, it will be at exactly (170, 340) with width 800. The agent can measure text before placing it, inspect the resolved layout after placing it, and detect problems (overlaps, overflows) programmatically.

### Principle 4: Fail Loudly, Not Silently

When something goes wrong — text overflows its box, an element is placed outside the slide bounds, a font isn't loaded, two elements overlap — the library reports it as a structured warning or error. The agent never has to guess whether a layout is correct. It can read the validation results and act on them.

### Principle 5: Leverage What Models Know

LLMs have extensive training data on CSS styling, color theory, typography, and visual design. SlideKit doesn't replace that knowledge — it channels it. The agent writes CSS for visual properties and uses SlideKit's coordinate system for placement. The result is better than either approach alone.

---

## Architecture Overview

### The Two-Phase Pipeline

SlideKit separates **specification** from **rendering** with an explicit layout solve step in between:

```
Specification  →  Layout Solve  →  Render
(agent writes)    (library runs)   (library renders)
```

**Phase 1: Specification.** The agent defines slides as arrays of element objects using SlideKit's primitives (`text()`, `image()`, `rect()`, etc.). Each element has explicit coordinates, sizes, styling, and optional constraints (anchors, overflow policies, relative positioning).

**Phase 2: Layout Solve.** The library resolves all elements: computes absolute positions for relatively-positioned elements, measures text to determine actual heights, applies auto-fit font sizing, checks for overlaps and out-of-bounds placements, and produces a **resolved layout** — a scene graph with every element's final bounding box.

**Phase 3: Render.** The library renders the resolved layout into the DOM as absolutely-positioned `<div>` elements inside a Reveal.js slide. Each element becomes a `<div>` with `position: absolute` and the agent's CSS styling merged in.

The critical feature is that the agent can inspect the resolved layout *before* or *after* rendering. The `layout()` function returns structured data including every element's final position, any warnings (font too small, content near edge), and any errors (element outside bounds, unresolvable overlap). This eliminates the "render → screenshot → guess what's wrong → try a fix" loop.

**Persistent Scene Model:** After `render()`, the scene model (constraint graph + resolved frames + provenance metadata) persists in memory and is accessible via `window.sk`. This is critical for Phase 2's live editing and round-trip capabilities (see [Live Editing & Round-Trip](#live-editing--round-trip-phase-2)), but is built into the architecture from the start. The DOM is a *render target* — the scene model, not the DOM, is the source of truth.

### Coordinate System

- **Canvas size:** 1920 × 1080 pixels (fixed, matches Reveal.js default)
- **Origin:** Top-left corner (0, 0)
- **X axis:** Left to right (0 → 1920)
- **Y axis:** Top to bottom (0 → 1080)
- **Units:** Pixels (integers preferred). Percentage sugar is available but always resolves to pixels internally.

### Reveal.js Integration

SlideKit renders into a **dedicated layer** inside each Reveal.js `<section>`:

```html
<section>
  <div class="slidekit-layer" style="position:relative; width:1920px; height:1080px;">
    <!-- All SlideKit elements render here as position:absolute divs -->
  </div>
</section>
```

This approach:
- Works with Reveal.js's built-in scaling (Reveal handles the transform to fit the viewport)
- Doesn't fight Reveal.js's own CSS
- Allows opt-in mixing with raw HTML (for embeds, iframes, speaker notes, code blocks) outside the SlideKit layer
- Keeps SlideKit's positioning deterministic within its own layer

---

## Core Primitives (Tier 1)

Every element in SlideKit is created via a primitive function that returns an element object with an auto-generated `id`. All primitives share a common set of positioning properties.

### Common Properties (All Elements)

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `id` | string | auto | Stable identifier for referencing this element |
| `x` | number | 0 | X position in slide coordinates |
| `y` | number | 0 | Y position in slide coordinates |
| `w` | number | required | Width |
| `h` | number | auto | Height (auto-measured for text) |
| `anchor` | string | `"tl"` | Which point of the element (x,y) refers to |
| `layer` | string | `"content"` | Z-layer: `"bg"`, `"content"`, or `"overlay"` |
| `opacity` | number | 1 | Element opacity (0–1) |
| `style` | object | `{}` | Raw CSS properties for visual styling (see [CSS Styling Integration](#the-css-styling-integration)) |
| `className` | string | `""` | CSS class names for reusable visual styles |

### Anchor System

The `anchor` property controls which point of the element's bounding box the `(x, y)` coordinate refers to. This eliminates the constant `x + w/2` arithmetic that agents get wrong.

```
tl ---- tc ---- tr
|                |
cl      cc      cr
|                |
bl ---- bc ---- br
```

- `"tl"` (top-left) — default. `(x, y)` is the top-left corner.
- `"cc"` (center-center) — `(x, y)` is the center of the element. Useful for centering on slide.
- `"br"` (bottom-right) — `(x, y)` is the bottom-right corner.
- All 9 combinations are valid: `tl`, `tc`, `tr`, `cl`, `cc`, `cr`, `bl`, `bc`, `br`.

Example — center a title on the slide:
```js
text("PRESENTATION TITLE", {
  x: 960, y: 540, w: 1200,
  anchor: "cc",  // (960, 540) is the center of this text block
  font: "Space Grotesk", size: 72, weight: 700, color: "#fff"
})
```

### `text(content, props)`

Places a text block at the specified coordinates.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `content` | string | required | The text to display. Supports `\n` for line breaks. |
| `font` | string | `"Inter"` | Font family name |
| `size` | number | 32 | Font size in pixels |
| `weight` | number | 400 | Font weight (100–900) |
| `color` | string | `"#ffffff"` | Text color |
| `lineHeight` | number | 1.3 | Line height multiplier |
| `letterSpacing` | string | `"0"` | Letter spacing (CSS value, e.g., `"0.05em"`) |
| `align` | string | `"left"` | Text alignment: `"left"`, `"center"`, `"right"` |
| `overflow` | string | `"warn"` | What happens when text exceeds its box (see [Text System](#text-system)) |
| `fit` | object | `null` | Auto-fit configuration (see [Text System](#text-system)) |
| `maxLines` | number | `null` | Maximum number of lines before truncation |

```js
text("The Dark Matter of\nSoftware Engineering", {
  x: 170, y: 300, w: 800,
  font: "Space Grotesk", size: 64, weight: 700, color: "#fff",
  lineHeight: 1.1,
  style: {
    textShadow: "0 2px 20px rgba(0,0,0,0.5)",
  }
})
```

**Height behavior:** If `h` is not specified, the text element's height is determined by measuring the rendered text (see `measureText()`). If `h` is specified, it defines the container height and the `overflow` policy applies.

### `image(src, props)`

Places an image at the specified coordinates.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `src` | string | required | Image path or URL |
| `fit` | string | `"cover"` | How the image fills its box: `"cover"`, `"contain"`, `"fill"`, `"none"` |
| `position` | string | `"center"` | CSS object-position when using cover/contain |

```js
image("assets/images/hero-bg.png", {
  x: 0, y: 0, w: 1920, h: 1080,
  fit: "cover",
  style: {
    opacity: "0.6",
    filter: "brightness(0.7)",
  }
})
```

### `rect(props)`

Places a rectangle/box at the specified coordinates. Commonly used for cards, panels, backgrounds, and decorative elements.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `fill` | string | `"transparent"` | Background color/gradient |
| `radius` | number/string | 0 | Border radius in px or CSS value |
| `border` | string | `"none"` | CSS border shorthand |
| `padding` | number/string | 0 | Internal padding (used by `panel()` in Tier 2) |

```js
rect({
  x: 100, y: 200, w: 500, h: 400,
  style: {
    background: "linear-gradient(135deg, rgba(26,26,46,0.9) 0%, rgba(22,33,62,0.9) 100%)",
    borderRadius: "16px",
    boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
    border: "1px solid rgba(255,255,255,0.1)",
    backdropFilter: "blur(12px)",
  }
})
```

### `rule(props)`

Places a horizontal or vertical line. Useful for dividers, accent lines, and separators.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `direction` | string | `"horizontal"` | `"horizontal"` or `"vertical"` |
| `thickness` | number | 2 | Line thickness in pixels |
| `color` | string | `"#ffffff"` | Line color |

```js
rule({
  x: 170, y: 470, w: 120,
  color: "#7c5cbf", thickness: 3
})
```

For horizontal rules, `w` is the length. For vertical rules, `h` is the length.

### `group(children, props)`

Groups multiple elements together with a shared coordinate origin. Moving the group moves all children. The group can also have scale applied.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `children` | array | required | Array of SlideKit elements |
| `scale` | number | 1 | Scale factor applied to all children |
| `clip` | boolean | false | Whether to clip children to group bounds |

Children's `(x, y)` coordinates are relative to the group's origin.

```js
// A card component that can be moved as a unit
group([
  rect({ x: 0, y: 0, w: 400, h: 300,
    style: { background: "rgba(255,255,255,0.06)", borderRadius: "12px" }
  }),
  text("Card Title", { x: 24, y: 24, w: 352, font: "Space Grotesk", size: 28, weight: 600, color: "#fff" }),
  text("Card body text goes here with more detail.", { x: 24, y: 70, w: 352, size: 18, color: "rgba(255,255,255,0.7)" }),
], {
  x: 100, y: 200  // Move the entire card by changing these two numbers
})
```

---

## The CSS Styling Integration

### The Core Idea

LLMs are excellent at CSS styling — they know gradient syntax, box-shadow stacking, backdrop-filter, clip-path, animations, and hundreds of visual properties. SlideKit doesn't reinvent this. Instead, it provides a `style` property on every element where the agent can pass any CSS properties for **visual styling**.

The library applies two layers of CSS to each rendered element:

1. **Layout CSS (library-controlled, non-overridable):**
   `position: absolute; left: Xpx; top: Ypx; width: Wpx; height: Hpx; box-sizing: border-box;`

2. **Styling CSS (agent-controlled, full creative freedom):**
   Everything in the `style` property is merged in, except blocked layout properties.

### Blocked Properties

The following CSS properties are **stripped from `style` with a warning** because they would conflict with SlideKit's positioning system:

- `position`, `display`, `float`, `clear`
- `top`, `left`, `right`, `bottom` (use SlideKit's x/y instead)
- `width`, `height`, `min-width`, `min-height`, `max-width`, `max-height` (use SlideKit's w/h instead)
- `margin`, `margin-*` (no margins in absolute layout)
- `flex`, `flex-*`, `align-items`, `align-self`, `justify-*`, `order`
- `grid`, `grid-*`
- `overflow` (handled by SlideKit's overflow policy, though `overflow` on rects for visual clipping is allowed)

If the agent includes a blocked property, the library logs a structured warning:
```json
{"type": "blocked_css_property", "property": "display", "value": "flex", "suggestion": "Use vstack() or hstack() for layout"}
```

### Allowed Properties (Everything Else)

All visual CSS properties pass through freely:

- **Backgrounds:** `background`, `backgroundImage`, `backgroundSize`, `backgroundPosition`, `backgroundBlendMode`
- **Borders:** `border`, `borderRadius`, `borderColor`, `borderStyle`, `borderWidth`, `outline`
- **Shadows:** `boxShadow`, `textShadow`
- **Filters:** `filter`, `backdropFilter`
- **Colors:** `color`, `opacity`
- **Typography:** `fontFamily`, `fontSize`, `fontWeight`, `fontStyle`, `letterSpacing`, `lineHeight`, `textAlign`, `textDecoration`, `textTransform`, `wordSpacing`, `whiteSpace`
- **Transforms (visual only):** `transformOrigin` (note: `transform` itself is blocked — use the dedicated `rotate` prop instead, since the library owns element positioning and `translate()` would conflict)
- **Transitions/Animations:** `transition`, `animation`, `animationName`, etc.
- **Clipping:** `clipPath`, `mask`, `maskImage`
- **Cursors/Pointers:** `cursor`, `pointerEvents`
- **Custom Properties:** `--any-variable: value`

### CSS Classes via `className`

For reusable visual themes, the agent can define CSS classes and reference them:

```js
// Agent defines a theme stylesheet (separate from SlideKit)
// .glass-card { background: rgba(255,255,255,0.06); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; }
// .accent-glow { box-shadow: 0 0 40px rgba(124,92,191,0.3); }

rect({
  x: 100, y: 200, w: 500, h: 400,
  className: "glass-card accent-glow",
})
```

This lets the agent leverage its CSS knowledge to build sophisticated visual systems, while SlideKit handles all positioning.

### Convenience Properties vs. `style`

Some properties appear as both convenience props and `style` options. The convenience props are sugar for the most common cases:

| Convenience Prop | Equivalent `style` |
|-----------------|-------------------|
| `color: "#fff"` | `style: { color: "#fff" }` |
| `font: "Inter"` | `style: { fontFamily: "Inter" }` |
| `size: 32` | `style: { fontSize: "32px" }` |
| `weight: 700` | `style: { fontWeight: "700" }` |
| `fill: "#1a1a2e"` | `style: { background: "#1a1a2e" }` |
| `radius: 12` | `style: { borderRadius: "12px" }` |
| `border: "1px solid #fff"` | `style: { border: "1px solid #fff" }` |

If both are specified, `style` takes precedence (it's applied after convenience props).

---

## Text System

Text is the most complex part of slide layout. Most agent failures involve text — wrong size, overflow, wrapping surprises, misaligned blocks. SlideKit makes text a first-class constrained object.

### `measureText(content, props)`

Measures how text will render **without placing it on the slide.** This is the foundation for intelligent layout — the agent can measure before committing.

**Input:**
```js
let metrics = measureText("The Augmentation\nSpectrum", {
  font: "Cormorant Garamond",
  size: 72,
  weight: 700,
  lineHeight: 1.1,
  letterSpacing: "0",
  w: 800,  // constrained width for wrapping
})
```

**Output:**
```js
{
  block: { w: 800, h: 172 },        // container dimensions used
  ink: { w: 756, h: 162 },          // actual rendered text bounds (tightest box around glyphs)
  lineCount: 2,                      // number of lines after wrapping
  lines: [                           // the actual line breaks
    "The Augmentation",
    "Spectrum"
  ],
  lastLineWidth: 312,               // width of the last line (useful for inline placement)
  fontSize: 72,                      // the font size used (important when fitText adjusts it)
}
```

**Implementation approach:** DOM-based measurement using an off-screen element with identical CSS properties to the rendering target. Must await `document.fonts.ready` before measuring. Results are cached by `(content, font, size, weight, lineHeight, letterSpacing, w)`.

**Why not Canvas `measureText`:** Canvas text measurement doesn't account for DOM line-height, word-wrapping algorithms, or CSS letter-spacing. It produces different results than the actual rendered output, causing the exact kind of measurement drift that leads to iteration loops.

### `fitText(content, box, options)`

Auto-sizes text to fit within a box. This is the **single highest-value feature** in the library — it eliminates the #1 agent iteration loop (guessing font sizes).

**Input:**
```js
let result = fitText("This is a title that might be long or short", {
  w: 800, h: 200,      // the box to fit within
}, {
  font: "Space Grotesk",
  weight: 700,
  minSize: 28,          // never go below this (projection readability)
  maxSize: 72,          // never go above this
  lineHeight: 1.1,
  step: 1,              // size decrement step (1px at a time)
})
```

**Output:**
```js
{
  fontSize: 56,                   // the size that fits
  metrics: { /* full measureText output at this size */ },
  warnings: [],                   // e.g., ["Font shrunk below 32px — may be hard to read at projection distance"]
}
```

**Algorithm:** Binary search from `maxSize` down to `minSize`, calling `measureText()` at each candidate size, until the text fits within the box dimensions. If even `minSize` doesn't fit, the behavior depends on the overflow policy.

**Presentation-aware warnings:** If `fitText` has to shrink below 32px (at 1080p), it emits a warning: this text may be too small for a projected presentation. The threshold is configurable.

### Overflow Policies

Every `text()` element has an `overflow` property that controls what happens when text exceeds its container:

| Policy | Behavior |
|--------|----------|
| `"visible"` | Text renders beyond the box. No clipping. (Useful during development.) |
| `"warn"` | Text renders beyond the box, but a warning is emitted in the layout result. **Default.** |
| `"clip"` | Text is clipped at the box boundary. |
| `"ellipsis"` | Text is truncated with `...` at the last line that fits. |
| `"shrink"` | Font size is automatically reduced (like `fitText`) to make text fit. Requires `fit.minSize`. |
| `"error"` | Text overflow causes a layout error. Useful in strict mode. |

Example:
```js
text("This might be a very long subtitle that could overflow", {
  x: 170, y: 500, w: 600, h: 80,
  size: 24, color: "#999",
  overflow: "ellipsis",
  maxLines: 2,
})
```

### Specified Box vs. Ink Bounds

SlideKit distinguishes between two bounding boxes for text:

- **Specified box:** The `(x, y, w, h)` the agent provided — this is the container.
- **Ink bounds:** The actual rendered extent of the glyphs — where pixels actually appear.

The `getLayout()` function returns both. This matters because the specified box may be larger than the ink bounds (padding/breathing room), or the ink bounds may exceed the specified box (overflow).

### Font Loading

SlideKit waits for fonts to load before measuring or rendering text. The initialization function accepts a list of fonts to preload:

```js
await SlideKit.init({
  fonts: [
    { family: "Space Grotesk", weights: [400, 600, 700] },
    { family: "Cormorant Garamond", weights: [400, 700] },
    { family: "JetBrains Mono", weights: [400] },
  ]
})
```

If `measureText()` or `fitText()` is called before fonts are loaded, the library emits an error. This prevents the most common source of measurement drift.

---

## Layout System

### Safe Zone

The safe zone defines the area where content should be placed. Content outside the safe zone risks being cut off by projector overscan, screen bezels, or simply being too close to the edge for comfortable viewing.

**Configuration:**
```js
SlideKit.init({
  slide: { w: 1920, h: 1080 },
  safeZone: { left: 120, right: 120, top: 90, bottom: 90 },
  // Resulting safe rect: { x: 120, y: 90, w: 1680, h: 900 }
})
```

**Helper functions:**
```js
safeRect()
// Returns: { x: 120, y: 90, w: 1680, h: 900 }

// Use it for positioning:
text("Title", {
  x: safeRect().x, y: safeRect().y, w: safeRect().w,
  ...
})
```

**Enforcement:**
- In **lenient mode** (default): Elements outside the safe zone trigger a warning in `getLayout()`.
- In **strict mode**: Elements outside the safe zone trigger an error.
- `clampToSafeZone(element)` — adjusts an element's position to fit within the safe zone (moves or shrinks as needed).

### Relative Positioning

Elements can be positioned relative to other elements. Relative positioning is **resolved during the layout solve phase** — the library computes the final absolute coordinates before rendering.

```js
let title = text("Main Title", { id: "title", x: 170, y: 200, w: 800, size: 64, weight: 700, color: "#fff" })

let subtitle = text("A subtitle below the title", {
  x: 170, w: 800, size: 28, color: "#999",
  y: below("title", { gap: 24 }),   // 24px below the title's bottom edge
})

let sidebar = text("Side note", {
  w: 300, size: 20, color: "#ccc",
  x: rightOf("title", { gap: 40 }),  // 40px to the right of the title
  y: 200,
})
```

**Available relative positioning helpers:**

| Helper | Description |
|--------|-------------|
| `below(refId, {gap})` | Y = ref's bottom edge + gap |
| `above(refId, {gap})` | Y = ref's top edge - own height - gap |
| `rightOf(refId, {gap})` | X = ref's right edge + gap |
| `leftOf(refId, {gap})` | X = ref's left edge - own width - gap |
| `centerVWith(refId)` | Center vertically with ref (align midpoints) |
| `centerHWith(refId)` | Center horizontally with ref |
| `alignTopWith(refId)` | Y = ref's top edge |
| `alignBottomWith(refId)` | Y = ref's bottom edge - own height |
| `alignLeftWith(refId)` | X = ref's left edge |
| `alignRightWith(refId)` | X = ref's right edge - own width |
| `centerIn(rect)` | Center within a rectangle (e.g., `centerIn(safeRect())`) |

**Resolution order:** The library builds a dependency graph from relative positioning references and resolves in topological order. Circular dependencies are detected and reported as errors.

### `vstack(items, props)` and `hstack(items, props)`

Stack primitives that resolve to absolute positions. These are safer and more concise than chaining `below()` calls for common patterns like bullet lists, card rows, or columnar layouts.

**`vstack` — vertical stack:**
```js
vstack([
  text("First item", { w: 600, size: 28, color: "#fff" }),
  text("Second item", { w: 600, size: 28, color: "#fff" }),
  text("Third item", { w: 600, size: 28, color: "#fff" }),
], {
  x: 170, y: 200, w: 600,
  gap: 20,                           // space between items
  align: "left",                     // "left", "center", "right"
})
```

The library computes: first item at (170, 200), measures its height, places second item at (170, 200 + firstHeight + 20), and so on. Each child's `x` is not specified by the child — it's determined by the stack's `x` and `align`.

**`hstack` — horizontal stack:**
```js
hstack([
  rect({ w: 300, h: 400, className: "glass-card" }),
  rect({ w: 300, h: 400, className: "glass-card" }),
  rect({ w: 300, h: 400, className: "glass-card" }),
], {
  x: 170, y: 200,
  gap: 30,
  align: "top",                      // "top", "middle", "bottom"
  distribute: "equal-gap",           // see Distribution section
})
```

**Key property:** `vstack` and `hstack` resolve to absolute coordinates during layout solve. They are not CSS flexbox — they are syntactic sugar over SlideKit's absolute positioning. The agent gets the convenience of "stack these things" without the unpredictability of flex layout.

Children within a stack can still have explicit `w` and `h`. For `vstack`, `w` can be omitted (defaults to the stack's `w`). For `hstack`, `h` can be omitted (defaults to the tallest child or the stack's `h`).

### Collision Detection

The library detects overlapping elements during layout solve using Axis-Aligned Bounding Box (AABB) intersection checks.

```js
let layout = SlideKit.layout(slideElements)

layout.collisions
// Returns: [
//   { elementA: "title", elementB: "subtitle", overlapRect: {x:170, y:290, w:800, h:12}, overlapArea: 9600 },
// ]
```

The agent can then adjust positions to resolve collisions. Small overlaps (< threshold) can be configured to be warnings rather than errors, since intentional overlapping (e.g., text over a background image) is valid.

---

## Inspection & Validation

### `getLayout()` — The Scene Graph

After layout solve, the library returns a complete scene graph — the resolved positions and metadata for every element on the slide.

```js
let slide = SlideKit.layout(elements, slideConfig)

slide.elements
// Returns: {
//   "title": {
//     id: "title",
//     type: "text",
//     specified: { x: 170, y: 200, w: 800, h: null, anchor: "tl" },
//     resolved: { x: 170, y: 200, w: 800, h: 158 },       // final absolute position
//     ink: { x: 170, y: 204, w: 756, h: 148 },             // actual rendered bounds
//     overflowsX: false,
//     overflowsY: false,
//     outsideSafeZone: false,
//     outsideSlide: false,
//   },
//   "subtitle": {
//     ...
//     resolved: { x: 170, y: 382, w: 800, h: 36 },         // resolved from below("title", {gap:24})
//   },
// }

slide.warnings
// Returns: [
//   { type: "font_small", elementId: "footnote", fontSize: 18, threshold: 24,
//     message: "Font size 18px may be too small for projection" },
//   { type: "near_edge", elementId: "sidebar", edge: "right", distance: 30,
//     message: "Element 'sidebar' is 30px from right edge (safe zone starts at 120px)" },
// ]

slide.errors
// Returns: [] (empty if no errors)

slide.collisions
// Returns: [...] (any overlapping elements)
```

This is what makes SlideKit agent-friendly. The agent doesn't have to screenshot and visually inspect — it can read structured data and make precise corrections: "element 'subtitle' overflows by 12px, increase container height or reduce font size by 2px."

### Debug Overlay

For human review and screenshot-based inspection, the library can render a debug overlay:

```js
SlideKit.renderDebugOverlay({
  showBoxes: true,        // draw bounding boxes around all elements
  showSafeZone: true,     // highlight the safe zone boundary
  showIds: true,          // label each element with its id
  showAnchors: true,      // show anchor points as dots
  showCollisions: true,   // highlight overlapping areas in red
})
```

This renders semi-transparent colored rectangles and labels over the slide. Useful when the agent takes a screenshot via Playwright for visual validation — the overlay makes it easy to see what's placed where.

### Validation Levels

SlideKit supports two validation modes:

**Lenient mode (default):**
- Out-of-bounds elements: warning
- Overlapping elements: warning
- Font below projection threshold: warning
- Missing font: fallback + warning
- Layout continues despite issues

**Strict mode:**
- Out-of-bounds elements: error (layout fails)
- Overlapping content elements: error
- Font below projection threshold: error
- Missing font: error
- Layout stops at first error

The agent can toggle between modes. Strict mode is useful for final validation ("is this slide production-ready?"). Lenient mode is useful during iterative development.

### Presentation-Specific Validations

Beyond generic layout validation, SlideKit checks for slide-specific problems:

| Check | Threshold | Severity |
|-------|-----------|----------|
| Font size below projection minimum | < 24px at 1080p | Warning |
| Font size below absolute minimum | < 18px at 1080p | Error (strict) |
| Text contrast too low | WCAG AA ratio | Warning |
| Too much text on one slide | > N words | Warning |
| Content area usage too low | < 40% of safe zone used | Warning (content might be too clustered) |
| Content area usage too high | > 95% of safe zone used | Warning (no breathing room) |

---

## Z-Order & Layering

### Named Layers

Every element belongs to one of three layers, rendered in this order (back to front):

1. **`"bg"` (background)** — Full-bleed images, gradient backgrounds, decorative shapes
2. **`"content"` (default)** — Text, cards, diagrams, the main content
3. **`"overlay"`** — Logos, page numbers, watermarks, debug overlays

Within each layer, elements render in **declaration order** (first declared = furthest back).

```js
// This image renders behind all content because it's in the "bg" layer
image("assets/hero-bg.png", { x: 0, y: 0, w: 1920, h: 1080, layer: "bg", fit: "cover" })

// These render in the "content" layer (default), in declaration order
rect({ x: 100, y: 200, w: 500, h: 400, className: "glass-card" })          // behind the text
text("Card Title", { x: 124, y: 224, w: 452, size: 28, color: "#fff" })     // in front of the rect
```

### Explicit Z-Index Override

For cases where declaration order isn't sufficient, elements accept a `z` property (integer). Higher values render in front. This is an escape hatch — named layers + declaration order should handle 95% of cases.

```js
rect({ x: 100, y: 200, w: 400, h: 300, z: 10 })  // explicitly in front
rect({ x: 150, y: 250, w: 400, h: 300, z: 5 })   // explicitly behind
```

### Group Stacking Context

A `group()` with `isolate: true` creates a stacking context — its children's z-ordering is scoped to the group and doesn't interact with elements outside the group.

---

## Alignment & Distribution (Tier 2)

These are inspired directly by PowerPoint/Keynote's alignment and distribution tools — the operations that human designers use constantly and that are missing from CSS-based agent workflows.

### Alignment Functions

All alignment functions operate on arrays of element IDs and modify their positions in-place (during layout solve).

```js
alignLeft(["card1", "card2", "card3"])           // align left edges to the leftmost element
alignRight(["card1", "card2", "card3"])          // align right edges to the rightmost element
alignTop(["card1", "card2", "card3"])            // align top edges to the topmost element
alignBottom(["card1", "card2", "card3"])         // align bottom edges to the bottommost element
alignCenterH(["card1", "card2", "card3"])        // align horizontal centers
alignCenterV(["card1", "card2", "card3"])        // align vertical centers
```

**Align to a reference (not just among items):**
```js
alignLeft(["card1", "card2", "card3"], { to: safeRect().x })      // align to safe zone left edge
alignCenterH(["card1", "card2"], { to: 960 })                     // center on slide midpoint
```

### Distribution Functions

Distribution spaces elements evenly within a range.

```js
distributeH(["card1", "card2", "card3"], {
  startX: safeRect().x,
  endX: safeRect().x + safeRect().w,
  mode: "equal-gap",
})
```

**Distribution modes:**

| Mode | Behavior |
|------|----------|
| `"equal-gap"` | Equal space between adjacent elements. Elements may have different widths. |
| `"equal-center"` | Equal spacing between element centers. Produces even visual rhythm regardless of element sizes. |

```js
distributeV(["item1", "item2", "item3", "item4"], {
  startY: 100,
  endY: 980,
  mode: "equal-gap",
})
```

### Size Matching

Make elements the same size as each other — critical for card grids and balanced layouts.

```js
matchWidth(["card1", "card2", "card3"])         // all cards get the width of the widest
matchHeight(["card1", "card2", "card3"])        // all cards get the height of the tallest
matchSize(["card1", "card2", "card3"])          // both width and height matched to the largest
```

### `fitToRect(elementIds, rect)`

Scale a group of elements to fit within a bounding rectangle, maintaining relative positions and proportions.

```js
fitToRect(["diagram-node1", "diagram-node2", "diagram-edge1"], {
  x: 100, y: 200, w: 800, h: 600
})
```

This is the equivalent of PowerPoint's "fit to page" — useful when the agent builds a diagram at arbitrary coordinates and then needs to place it within a specific area of the slide.

---

## Compound Primitives (Tier 2)

These are higher-level primitives that combine multiple base elements to handle common slide patterns that agents struggle with when building from scratch.

### `bullets(items, props)`

Creates a formatted bullet list. LLMs consistently struggle with typographic lists — indent levels, hanging punctuation, consistent spacing, bullet character styling. This primitive handles it correctly.

```js
bullets([
  "First point about the research findings",
  "Second point with supporting evidence",
  { text: "Third point with a sub-list", children: [
    "Sub-point A with detail",
    "Sub-point B with detail",
  ]},
  "Fourth concluding point",
], {
  x: 170, y: 250, w: 700,
  font: "Inter", size: 28, color: "#fff",
  bulletChar: "•",                    // or "—", "→", "■", numbers, etc.
  bulletColor: "#7c5cbf",            // accent color for bullets
  indent: 32,                         // indent per nesting level
  itemGap: 16,                        // space between items
  lineHeight: 1.4,
  style: {},                          // CSS applied to each bullet item
})
```

The `bullets()` primitive measures each item's text, computes layout, and renders as a series of absolutely-positioned text elements. No CSS list-style, no reliance on browser list rendering.

### `connect(fromId, toId, props)`

Draws a line or arrow between two elements. Essential for flowcharts, process diagrams, and relationship visualizations — extremely common in technical presentations.

```js
connect("box-a", "box-b", {
  type: "straight",                   // "straight", "elbow", "curved"
  arrow: "end",                       // "none", "start", "end", "both"
  color: "#7c5cbf",
  thickness: 2,
  dash: null,                         // null for solid, or [5, 5] for dashed
  fromAnchor: "cr",                   // connect from center-right of box-a
  toAnchor: "cl",                     // connect to center-left of box-b
  label: "transforms",                // optional label on the connector
  labelStyle: { size: 14, color: "#999" },
})
```

**Anchor points for connectors** use the same 9-point system as element anchors (tl, tc, tr, cl, cc, cr, bl, bc, br), specifying where on each element the connector attaches.

**Elbow connectors** route with right-angle bends (like PowerPoint's elbow connector). The library computes a simple route that avoids overlapping the source/target elements.

### `panel(children, props)`

A visual container with a background, padding, and child elements laid out inside it. This is the "card" pattern that appears constantly in presentations — a box with internal content.

```js
panel([
  text("Feature Name", { w: "fill", size: 24, weight: 600, color: "#fff" }),
  rule({ w: "fill", color: "rgba(255,255,255,0.2)", thickness: 1 }),
  text("Description of the feature with more detail about what it does.", {
    w: "fill", size: 18, color: "rgba(255,255,255,0.7)"
  }),
], {
  x: 100, y: 200, w: 400,
  padding: 24,
  gap: 16,                            // vstack-style gap between children
  style: {
    background: "rgba(255,255,255,0.06)",
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.1)",
  }
})
```

Children inside a panel use `w: "fill"` to fill the panel's width (minus padding). The panel auto-computes its `h` from the children + padding, or accepts an explicit `h`.

Under the hood, `panel()` is a `group()` containing a `rect()` background + a `vstack()` of children, with padding applied as coordinate offsets.

---

## Tier 3 Features

These features add polish and convenience but are not essential for the core workflow.

### Grid System & Snap

A configurable grid for consistent alignment across slides.

```js
let grid = SlideKit.grid({
  cols: 12,
  gutter: 30,
  margin: { left: 120, right: 120 },
  // Computes column positions: col(1) = 120, col(2) = 260, col(3) = 400, ...
})

// Use grid positions for placement:
text("Title", { x: grid.col(1), y: 200, w: grid.spanW(1, 8), ... })
// grid.col(n) returns the x position of column n
// grid.spanW(from, to) returns the width spanning columns from..to
```

**Snap to grid:**
```js
snap(value, gridSize)
// snap(173, 10) → 170 — snaps to nearest 10px
```

### Rotate

Rotation for images and shapes (not commonly needed for text, but useful for decorative elements).

```js
image("assets/arrow.png", {
  x: 500, y: 300, w: 200, h: 200,
  rotate: 45,  // degrees, clockwise
})
```

Rotation is applied via CSS `transform: rotate()` and does not affect the bounding box used for collision detection (the AABB of the rotated element is used).

### Percentage Sugar

While pixels are the canonical unit, percentages can be convenient for responsive-feeling layouts:

```js
text("Title", {
  x: "10%",      // resolves to 192px (10% of 1920)
  y: "20%",      // resolves to 216px (20% of 1080)
  w: "80%",      // resolves to 1536px
  ...
})
```

Percentage values are resolved to pixels during layout solve. The resolved layout always reports absolute pixel values.

**Safe-zone-relative percentages:**
```js
text("Title", {
  x: "safe:5%",   // 5% of safe zone width, offset from safe zone left edge
  y: "safe:10%",
  w: "safe:90%",
  ...
})
```

### Duplicate / Repeat

Create copies of elements with position offsets — useful for grids of similar items.

```js
let card = rect({ w: 300, h: 200, className: "glass-card" })

let cards = repeat(card, {
  count: 6,
  cols: 3,
  gapX: 30,
  gapY: 30,
  startX: 170,
  startY: 200,
})
// Creates a 3×2 grid of cards starting at (170, 200)
```

### Opacity & Shadows (Convenience)

While these are available via `style`, convenience props make them more discoverable:

```js
rect({
  x: 100, y: 200, w: 400, h: 300,
  opacity: 0.8,
  shadow: "lg",  // predefined: "sm", "md", "lg", "xl", "glow"
})
```

Predefined shadows map to:
| Name | CSS Value |
|------|-----------|
| `"sm"` | `0 1px 3px rgba(0,0,0,0.2)` |
| `"md"` | `0 4px 12px rgba(0,0,0,0.3)` |
| `"lg"` | `0 8px 32px rgba(0,0,0,0.4)` |
| `"xl"` | `0 16px 48px rgba(0,0,0,0.5)` |
| `"glow"` | `0 0 40px rgba(124,92,191,0.3)` |

---

## Integration with Reveal.js

### Initialization

```js
await SlideKit.init({
  // Slide dimensions (fixed)
  slide: { w: 1920, h: 1080 },

  // Safe zone margins
  safeZone: { left: 120, right: 120, top: 90, bottom: 90 },

  // Fonts to preload
  fonts: [
    { family: "Space Grotesk", weights: [400, 600, 700], source: "google" },
    { family: "JetBrains Mono", weights: [400], source: "google" },
  ],

  // Validation mode
  strict: false,

  // Projection warnings threshold
  minFontSize: 24,
})
```

### Defining Slides

```js
let slides = [
  // Slide 1: Title slide
  {
    id: "title",
    background: "#0c0c14",  // or a gradient, or an image path
    elements: [
      image("assets/title-bg.png", { x: 0, y: 0, w: 1920, h: 1080, layer: "bg", fit: "cover",
        style: { opacity: "0.4", filter: "brightness(0.6)" }
      }),
      text("AI WHERE IT MATTERS", {
        id: "title-text", x: 170, y: 380, w: 900,
        font: "Space Grotesk", size: 72, weight: 700, color: "#fff",
        style: { textShadow: "0 2px 40px rgba(0,0,0,0.5)" },
      }),
      text("Practical AI Integration for Software Teams", {
        x: 170, w: 700, size: 28, color: "rgba(255,255,255,0.7)",
        y: below("title-text", { gap: 24 }),
      }),
      rule({ x: 170, w: 80, color: "#7c5cbf", thickness: 3,
        y: below("title-text", { gap: 80 }),
      }),
      text("ICSE 2026  ·  Dr. Jane Smith", {
        x: 170, w: 500, size: 18, weight: 600, color: "rgba(255,255,255,0.5)",
        y: below("title-text", { gap: 100 }),
        style: { letterSpacing: "0.1em", textTransform: "uppercase" },
      }),
    ],
    notes: "Welcome everyone. Today we'll discuss how AI can be practically integrated into software engineering workflows.",
  },

  // Slide 2: Content slide with cards
  {
    id: "three-pillars",
    elements: [
      text("Three Pillars", { id: "heading", x: 170, y: 100, w: 800, size: 48, weight: 700, color: "#fff" }),
      rule({ x: 170, w: 80, color: "#7c5cbf", thickness: 3, y: below("heading", { gap: 16 }) }),

      hstack([
        panel([
          text("Discovery", { w: "fill", size: 24, weight: 600, color: "#fff" }),
          text("Finding patterns in large codebases", { w: "fill", size: 18, color: "rgba(255,255,255,0.7)" }),
        ], { w: 480, padding: 24, gap: 12, className: "glass-card" }),

        panel([
          text("Generation", { w: "fill", size: 24, weight: 600, color: "#fff" }),
          text("Producing code and documentation", { w: "fill", size: 18, color: "rgba(255,255,255,0.7)" }),
        ], { w: 480, padding: 24, gap: 12, className: "glass-card" }),

        panel([
          text("Validation", { w: "fill", size: 24, weight: 600, color: "#fff" }),
          text("Automated testing and review", { w: "fill", size: 18, color: "rgba(255,255,255,0.7)" }),
        ], { w: 480, padding: 24, gap: 12, className: "glass-card" }),
      ], {
        x: 170, y: below("heading", { gap: 60 }),
        gap: 30,
        align: "top",
      }),
    ],
  },
]
```

### Rendering

```js
// Layout solve (returns scene graph without rendering)
let layout = SlideKit.layout(slides[0])
console.log(layout.warnings)   // check for issues
console.log(layout.collisions) // check for overlaps

// Render to DOM
SlideKit.render(slides, {
  target: document.querySelector('.reveal .slides'),
  revealConfig: {
    hash: true,
    slideNumber: true,
    transition: 'fade',
    width: 1920,
    height: 1080,
    center: false,
  }
})
```

### Export Compatibility

SlideKit renders as standard HTML `<div>` elements with `position: absolute` and inline styles. This is fully compatible with:
- **Decktape** for PDF export
- **pdftoppm** for JPEG conversion
- **Playwright/Puppeteer** for screenshots
- Any browser-based rendering

No special export handling is needed — what you see in the browser is what you get in the PDF.

---

## Integration with the Presentation Maker Pipeline

### What Changes

SlideKit changes **Phases 3–6** of the existing Presentation Maker workflow:

| Phase | Before (HTML+CSS) | After (SlideKit) |
|-------|-------------------|-------------------|
| **Phase 3: Design Language** | Agent creates CSS theme file with classes, variables, layout helpers | Agent creates CSS theme file for **styling only** (colors, gradients, shadows, fonts) + SlideKit config (safe zone, grid, fonts) |
| **Phase 4: Detailed Outline** | Agent assigns "layout archetypes" (Hero, Split, etc.) | Agent assigns archetypes but now describes them as SlideKit patterns (full-bleed image + centered text, 60-40 hstack, etc.) |
| **Phase 5: Build Manifest** | Manifest describes slide structure in prose | Manifest can include SlideKit pseudo-code showing intended element placement |
| **Phase 6: Slide Assembly** | Agent writes raw HTML + CSS per slide, iterates on layout bugs | Agent writes SlideKit JS definitions. Calls `layout()` to validate. Fixes issues from structured warnings. Renders once correct. |

### What Doesn't Change

- **Phases 0–2** (setup, ingestion, story arc) — unchanged, no layout work yet
- **Phase 7** (review & iteration) — still human review, but iteration is faster because changes are coordinate tweaks not CSS debugging
- **Phase 8** (export) — unchanged, decktape still works
- **Image generation** — unchanged, still uses OpenAI API / generate_images.py
- **Visual QA loop** — still export to JPEG and review, but the `getLayout()` scene graph provides a faster pre-check before visual export

### The New Feedback Loop

```
Agent writes SlideKit definitions
    ↓
SlideKit.layout() returns warnings/errors
    ↓
Agent fixes issues (coordinate adjustments, font size changes)
    ↓
SlideKit.render() produces visible slides
    ↓
Agent screenshots via Playwright for visual check
    ↓
Agent reads getLayout() scene graph to verify intent vs. reality
    ↓
If issues found: adjust coordinates and re-render (fast, precise)
If clean: proceed to next slide
```

The key improvement: the agent gets **structured, machine-readable feedback** at the layout step, before ever needing to screenshot. Most issues are caught and fixed without visual inspection.

---

## Live Editing & Round-Trip (Phase 2)

SlideKit Phase 1 (Milestones 1–9) builds the one-way pipeline: specification → layout solve → render. Phase 2 adds the ability for an AI agent (or human) to **inspect rendered slides, make live adjustments, and serialize the result back** to a SlideKit specification. This enables a closed feedback loop where the agent generates a slide, views it in a real browser via Playwright MCP, makes targeted corrections, and exports the updated layout.

Phase 2 is built on top of Phase 1. The Phase 1 architecture is designed with Phase 2 in mind — the persistent scene model, provenance tracking, and `data-sk-id` attributes are all laid during Phase 1 specifically to make Phase 2 straightforward.

### The Three Capabilities

**1. Inspection API — Query the live scene from the browser console**

After `render()`, the scene model is accessible via a global `window.sk` object. The agent (via Playwright MCP or similar) can run JavaScript in the console to query the layout:

```js
sk.getNode("title")           // Full node: authored spec + resolved frame + provenance
sk.getFrame("title")          // Just the resolved bounding box: {x, y, w, h}
sk.hitTest(400, 300)          // "What element is at pixel (400, 300)?" → element ID
sk.overlaps("title")          // All elements overlapping with "title"
sk.isInSafeZone("title")     // Is this element fully within the safe zone?
sk.getComputedStyle("title")  // Actual rendered CSS (from DOM getComputedStyle)
sk.getConstraints("title")    // All constraints involving this element (incoming + outgoing)
sk.listElements()             // All element IDs with types and layers
sk.exportScene()              // Full scene graph as JSON
```

Inspection reads from two sources:
- **Geometry** from the scene model (authoritative — this is where resolved frames live)
- **Computed styles** from the DOM (via `getComputedStyle` — for questions about actual rendered colors, font sizes after CSS cascade, etc.)

**2. Live Mutation API — Make changes via the browser console**

The agent can modify the scene model through the console. All mutations go through the scene model (not the DOM directly). After mutation, the library re-solves and re-renders automatically so changes are immediately visible.

```js
// Style/property changes (no re-layout needed for most of these)
sk.setProp("title", "size", 64)          // Change font size
sk.setProp("title", "color", "#ff0")     // Change color
sk.setProp("card1", "fill", "#1a1a2e")   // Change background

// Position changes (triggers re-solve + re-render)
sk.nudge("title", {dx: 30, dy: 0})      // Shift title 30px right — dependents follow
sk.setFrame("title", {x: 200, y: 100})  // Set absolute position — dependents follow
sk.detach("title")                        // Break all constraints, become fully absolute

// Batch multiple changes (single re-solve at the end)
sk.batch(() => {
  sk.nudge("card1", {dx: -20})
  sk.setProp("card2", "size", 28)
  sk.setProp("card3", "fill", "#2a2a3e")
})
```

**3. Round-Trip Serialization — Export the updated spec**

After mutations, the agent exports the updated scene as a SlideKit specification:

```js
let spec = sk.export()
// Returns JSON representing the slide definition with:
// - Original constraints preserved where they weren't touched
// - Absolute overrides where elements were nudged/moved
// - Updated property values where setProp was called
```

The exported spec can replace the original slide code. On the next render, the slide will look exactly as it did after all the live edits.

### Edit Modes

When the agent moves an element that participates in constraints, the behavior depends on the edit mode:

**`nudge` (default):** Override the element's position with an absolute value, but **keep outgoing constraint references alive**. If subtitle has `y: below("title", {gap: 40})` and you nudge the title, the subtitle follows on re-solve — the `below()` relationship is preserved. On export, the title gets an absolute position override, the subtitle still has its `below("title")` constraint.

This is the right default for AI agents. When a model nudges a title 30px right, it almost certainly wants the subtitle to follow — that's the whole point of relative positioning.

**`detach`:** Convert the element to fully absolute positioning and **remove all constraints** involving it (both incoming and outgoing). Use this when the constraint solver keeps fighting your adjustments.

```js
sk.nudge("title", {dx: 30})           // Title moves, subtitle follows (nudge is default)
sk.setFrame("title", {x: 200, y: 100}) // Same — override position, dependents follow
sk.detach("title")                      // Title becomes absolute, subtitle loses its below() reference
```

### Constraint Tracking & Provenance

The scene model tracks **provenance** for each resolved value — what determined it:

```js
sk.getNode("subtitle")
// Returns:
// {
//   id: "subtitle",
//   type: "text",
//   authored: { x: 170, y: { _rel: "below", ref: "title", gap: 40 }, w: 800, ... },
//   resolved: { x: 170, y: 382, w: 800, h: 36 },
//   provenance: {
//     x: { source: "authored", value: 170 },
//     y: { source: "constraint", constraint: "below", ref: "title", gap: 40 },
//     w: { source: "authored", value: 800 },
//     h: { source: "measured", measuredAt: { font: "Inter", size: 28 } },
//   },
//   constraintState: "active",  // "active" | "overridden" | "detached"
// }
```

This provenance is what makes deterministic export possible. The library doesn't need to *infer* whether a constraint still holds — it *tracks* constraint state through mutations.

### Serialization Strategy

Export uses **explicit tracking, not inference**. This was validated by both GPT 5.2 and Gemini Pro:

- Mutations are modeled as graph edits (add override, remove constraint, change property)
- Export reads the current constraint graph with overrides applied
- No tolerance-based "does this constraint still approximately hold?" heuristics
- The export is deterministic: same mutations → same output, every time

Deferred to a later phase: optional constraint recovery heuristics (opt-in, confidence-scored) for when layouts are imported from external sources or created without SlideKit.

### What This Enables

The complete AI agent workflow becomes:

```
Agent writes SlideKit spec
    ↓
SlideKit.render() → visible slides in browser
    ↓
Agent inspects via Playwright MCP:
    sk.getFrame("title")  → check position
    sk.overlaps("card1")  → check for collisions
    screenshot for visual check
    ↓
Agent makes corrections:
    sk.nudge("title", {dx: 30})
    sk.setProp("subtitle", "size", 24)
    sk.batch(() => { ... multiple fixes ... })
    ↓
Agent exports updated spec:
    let newSpec = sk.export()
    ↓
New spec replaces original slide code
    ↓
Next render produces the corrected layout
```

The user can even watch the agent work in real-time as elements move and restyle in the browser.

---

## Design Decisions Log

This section records key design decisions and the reasoning behind them. These were validated through multi-model consensus (Gemini Pro 3.1 + GPT 5.2).

### Decision: Absolute positioning over CSS auto-layout
**Rationale:** LLMs cannot simulate browser reflow engines. They can do coordinate geometry. Absolute positioning eliminates emergent layout behaviors that cause iteration loops.

### Decision: Pixels as canonical unit (1920×1080), not percentages
**Rationale:** Both models agreed that LLMs work better with absolute integers on a fixed canvas. Percentages introduce floating-point ambiguity and context-switching. Percentage sugar is available but always resolves to pixels.

### Decision: CSS pass-through for styling with layout property blocklist
**Rationale:** LLMs have extensive CSS styling knowledge. Replacing it with a custom styling API would lose this capability. Instead, we let agents use CSS for what it's good at (visual styling) while blocking properties that would interfere with absolute positioning.

### Decision: DOM-based text measurement, not Canvas measureText
**Rationale:** Canvas `measureText` doesn't account for CSS line-height, word-wrapping, or letter-spacing. It produces different results than DOM rendering. DOM-based measurement (off-screen element with identical CSS) matches the actual rendered output exactly.

### Decision: fitText with binary search is Tier 1, not optional
**Rationale:** Both models identified this as the highest-value single feature. Agents fail at guessing font sizes for variable-length text. Auto-shrink with min/max bounds eliminates the most common iteration loop.

### Decision: Named layers (bg/content/overlay) over manual z-index
**Rationale:** Manual z-index management confuses agents (they assign arbitrary numbers that conflict). Named layers provide clear semantic grouping. Declaration order within layers handles 95% of cases. Explicit z-index override is available as an escape hatch.

### Decision: Two-phase pipeline (spec → layout solve → render) with introspection
**Rationale:** The agent needs to inspect resolved geometry before committing to render. This is what enables self-correction without visual inspection. GPT 5.2 specifically emphasized this as the architectural key to agent reliability.

### Decision: Safe zone with configurable margins
**Rationale:** Directly addresses "content off edges" and "content too close to edges" problems. Provides the agent with a concrete target rectangle. Enforcement via warnings (lenient) or errors (strict).

### Decision: Anchors on all elements (9-point system)
**Rationale:** Both models agreed this eliminates a major class of positioning errors. "Center this text at (960, 540)" is clearer than "place this text at (960 - w/2, 540 - h/2)". Agents frequently botch the arithmetic.

### Decision: vstack/hstack resolve to absolute positions (not CSS flex)
**Rationale:** Slides frequently use stacked layouts (bullet lists, card rows). Forcing agents to chain `below()` calls is verbose and error-prone. But CSS flexbox is what we're trying to avoid. The solution: stack primitives that compute absolute positions during layout solve.

### Decision: Allow opt-in HTML mixing via dedicated SlideKit layer
**Rationale:** GPT 5.2 argued (convincingly) that some content types (iframes, code blocks, embedded widgets, speaker notes) are better served by raw HTML. A dedicated `slidekit-layer` div keeps SlideKit's positioning deterministic while allowing HTML outside that layer.

### Decision: Structured machine-readable warnings/errors, not console.log
**Rationale:** The whole point is that agents can programmatically read validation results and act on them. Console output is for humans. JSON warnings/errors are for agents.

### Decision: Persistent scene model with provenance (for Phase 2)
**Rationale:** Phase 2 (live editing & round-trip) requires the constraint graph and resolved frames to survive after layout solve. Rather than retrofitting this, Phase 1 builds the scene model with provenance from the start. This adds minimal overhead (a few extra fields per element) but makes Phase 2 a natural extension rather than a rewrite.

### Decision: "Nudge" as default edit mode, not "Detach" (Phase 2)
**Rationale:** GPT 5.2 and Gemini Pro disagreed here. Gemini advocated "detach" (break constraints on any manual move, following Figma's precedent). GPT advocated "nudge" (override position but keep outgoing references so dependents follow). We chose "nudge" because SlideKit's primary user is an AI agent making programmatic console adjustments, not a human visually dragging elements. When an agent nudges title right, it wants subtitle to follow — that's why it used `below()`. The Figma precedent assumes visual drag-and-drop, which is a different interaction model.

### Decision: Explicit constraint tracking over tolerance-based inference (Phase 2)
**Rationale:** Both models agreed strongly. Tolerance-based inference ("is subtitle still ~40px below title?") is brittle, ambiguous (multiple constraints can explain the same geometry), and causes round-trip drift. Explicit tracking (mutations are graph edits, export reads the updated graph) is deterministic and predictable. Heuristic recovery is deferred as an opt-in feature for importing foreign layouts.

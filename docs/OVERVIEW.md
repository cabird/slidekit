# SlideKit Overview

> **Current as of:** `66ce7bc` (2026-03-02)

## What Is SlideKit?

SlideKit is a JavaScript library for building presentation slides using explicit coordinates on a fixed canvas, rather than CSS auto-layout. You tell it exactly where every element goes — position, size, and styling — and it handles rendering, validation, and feedback.

It targets Reveal.js as its rendering backend, but the core idea is rendering-engine-agnostic: you describe a slide as a list of positioned elements, and SlideKit turns that into visible output.

## Why Does It Exist?

CSS layout (flexbox, grid, flow) was designed for reflowing documents that adapt to variable screen sizes. Slides are the opposite — they're fixed-dimension canvases (1920x1080) where every element has a deliberate position. When you use CSS auto-layout for slides, you're asking the browser to *decide* where things go, and when it decides wrong, you end up debugging cascading interactions, specificity conflicts, and emergent reflow behaviors.

This is especially painful for AI agents. LLMs cannot mentally simulate browser layout engines — they can't predict how `flex-grow` interacts with `min-width`, or how margin collapsing affects a nested card. But they *can* do coordinate geometry. "Place this at (170, 340) with width 800" is unambiguous.

SlideKit eliminates the gap between intent and result. You say where things go, and that's where they go. No surprises.

## The Core Model

### Fixed Canvas, Absolute Coordinates

Every slide is a 1920x1080 pixel canvas. The origin is the top-left corner. You place elements by specifying `(x, y)` position, width, and height in pixels. There is no reflow, no scrolling, no responsive breakpoints.

### Separation of Layout and Content

SlideKit owns **layout** — position, size, and spatial relationships between elements. You own **content and styling** — arbitrary HTML and CSS for whatever you want to display. SlideKit handles WHERE things go; you handle WHAT things look like.

A small set of CSS properties are blocked from the style pass-through — only those that would conflict with SlideKit's coordinate system (`display`, `position`, `margin`, `transform`, `overflow`, sizing properties, containment, etc.). Everything else (colors, gradients, shadows, borders, fonts, animations, transitions) passes through untouched. See [API.md](API.md) for the full blocked-properties list.

SlideKit also injects a **baseline stylesheet** inside every `el()` container that neutralises inherited styles from the host framework (Reveal.js). This ensures `measure()` and `render()` always agree — the baseline is applied identically in both contexts. The defaults (e.g., `text-align: left`, `margin: 0`, `line-height: 1.2`) are predictable and documented. Override any baseline property with inline styles in your HTML content. See [API.md § Baseline CSS](API.md) for the full list.

### Pipeline

1. **Specification** — You define slides as arrays of element objects with positions, sizes, and styles.
2. **Layout Solve** — A 4-phase pipeline resolves sizes, positions, transforms, and validation (see Internal Architecture below for the phase breakdown).
3. **Render** — The library renders the resolved layout into the DOM as absolutely-positioned elements.

The key insight is that you can inspect the resolved layout *between* solve and render. You get structured, machine-readable data about every element's final position, plus warnings (text too small, element near edge) and errors (element off-slide, unresolvable overlap). This means you can catch and fix problems without visual inspection.

## Element Primitives

SlideKit provides two core primitives:

- **el** — A positioned HTML element. Accepts any HTML via innerHTML — text (`<p>`), images (`<img>`), shapes (empty element with background), rules (thin element with background), or anything else expressible in HTML/CSS. Overflow is `visible` by default or `clip`. SlideKit positions it; you style the content.
- **Group** — A container that gives its children a shared coordinate origin, so moving the group moves everything inside it.

Every element shares a common set of positioning properties: position, size, anchor point, layer, opacity, and a style object for visual CSS.

## Key Capabilities

### Anchor System

Every element has an anchor point that controls what `(x, y)` refers to. Instead of always meaning "top-left corner," you can set the anchor to center-center, bottom-right, or any of 9 points on the bounding box. This eliminates the constant `x - width/2` arithmetic that leads to positioning errors.

### Measurement

`measure(html, props)` renders your HTML in an off-screen DOM element, waits for any images to load, and returns `{ w, h }` — the actual dimensions the content will occupy. Because it renders the same HTML with the same styles that will appear on the slide, measurement is always accurate. The function is async (it needs the DOM).

SlideKit does not provide auto-fitting or line counting. If you need to find the largest font size that fits a box, you can implement that yourself on top of `measure()`.

### Relative Positioning

Elements can be positioned relative to other elements — "24px below the title," "40px to the right of the sidebar." The library resolves these into absolute coordinates during layout solve using a dependency graph. Circular dependencies are detected and reported.

### Stacking Layouts

Vertical and horizontal stack primitives let you say "stack these items with 20px gaps" without manually chaining relative position calls. They resolve to absolute coordinates — they're syntactic sugar over the coordinate system, not CSS flexbox.

**Prefer `vstack` for text columns.** When you have a sequence of text elements (eyebrow, headline, body, etc.), use a `vstack` instead of chaining `below()` calls. The vstack declares position and gap once, makes reordering trivial, and eliminates ID-reference boilerplate. Reserve `below()` for one-off positioning between unrelated elements. Stacks also support `align: 'stretch'` to make all children the same size along the cross axis — useful for equal-height card rows. Main-axis alignment (`vAlign` on vstack, `hAlign` on hstack) positions the content block within the stack's explicit dimension — for example, vertically centering a few lines of text in a fixed-height column.

### Safe Zone

A configurable margin that defines where content *should* be placed, accounting for projector overscan and edge readability. Elements outside the safe zone trigger warnings (or errors in strict mode). Helper functions give you the safe zone rectangle for easy positioning.

### Collision Detection

The library detects overlapping elements during layout solve and reports them as structured data — which elements overlap, by how much, and where. Intentional overlaps (like text over a background image) can be handled by layer separation.

### Layering

Elements belong to one of three named layers — background, content, and overlay — rendered back-to-front. Within each layer, declaration order determines stacking. This replaces manual z-index management with clear semantic grouping.

### Inspection and Validation

After layout solve, you get a hierarchical scene graph: every element's specified bounds, resolved bounds, local-resolved bounds (relative to parent), parent/children relationships, and safe zone compliance. The layout result includes `rootIds` for tree traversal. Warnings and errors are structured JSON, not console messages. Validation can run in lenient mode (warnings only) or strict mode (errors halt layout).

Presentation-specific checks include minimum font size for projection readability, text contrast, content density (too sparse or too crowded), word count per slide, and panel content overflow. After rendering, DOM overflow detection catches divergences between off-screen measurement and actual browser layout.

Background-layer elements (`layer: 'bg'`) are exempt from safe zone warnings — full-bleed backgrounds are expected to extend beyond the safe zone.

### Debug Overlay

A visual overlay that draws bounding boxes, safe zone boundaries, element IDs, anchor points, and collision highlights over the rendered slide. Useful for visual inspection and screenshots.

## Higher-Level Primitives

Beyond the core elements, SlideKit provides compound primitives for common slide patterns:

- **Connectors** that draw lines and arrows between elements, with straight, elbow, and curved routing. Essential for flowcharts and relationship diagrams.
- **Panels** — visual containers with a background, padding, and vertically stacked child elements. The "card" pattern that appears constantly in presentations. Panels emit overflow warnings when content exceeds an explicit height.
- **Figures** — image containers with a background rect, optional padding, and optional caption. A structured alternative to manual `el('<img ...>')` setups.
- **Card grids** — arrange panels in a multi-row grid with `align: 'stretch'` so cards in each row share equal height.

## Alignment and Distribution

PowerPoint-style alignment and distribution operations work on arrays of elements: align left edges, distribute horizontally with equal gaps, match widths to the widest element, fit a group of elements into a bounding rectangle. These are the spatial operations that human designers use constantly and that are difficult to replicate with CSS.

## Additional Features

- **Spacing tokens** — a semantic scale (`xs`, `sm`, `md`, `lg`, `xl`, `section`) for gaps and padding, customizable via `init()`. Use `getSpacing()` to resolve tokens in user-land code.
- **`splitRect()`** — splits a rectangle into left and right halves with a configurable ratio and gap. Common for split-layout slides (text + image).
- **`placeBetween()`** — positions an element vertically between two references with configurable bias.
- **`group({ bounds: 'hug' })`** — auto-computes group dimensions from its children's bounding box.
- **Grid system** with configurable columns and gutters for consistent cross-slide alignment.
- **Snap** to round positions to grid increments.
- **Percentage sugar** for positions and sizes, resolved to pixels during layout solve.
- **Rotation** for images and decorative shapes.
- **Repeat/duplicate** to create grids of similar elements with position offsets.

## Live Editing and Round-Trip

After rendering, the scene model persists in the browser and is queryable and mutable through a console API. You can inspect any element's resolved position, test for overlaps, nudge elements, change properties, and then export the updated layout back to a SlideKit specification. Constraints (like "subtitle is 24px below title") survive through edits — moving the title automatically moves the subtitle.

This enables a closed loop: generate a slide, view it in a browser, make targeted corrections programmatically, and export the corrected layout. The scene model tracks provenance for every resolved value, so export is deterministic — no tolerance-based inference about whether constraints still hold.

## Internal Architecture

### Module Structure

SlideKit is decomposed into 19 focused TypeScript modules under `src/`, plus a 6-module layout pipeline under `src/layout/`. The top-level `slidekit.ts` is a barrel file that re-exports the public API — users always import from the barrel, never from `src/` directly.

| Module | Responsibility |
|--------|---------------|
| `state.ts` | Single exported `state` object holding all mutable state (config, caches, counters) |
| `config.ts` | `init()`, `safeRect()`, font loading, configuration |
| `elements.ts` | Core element constructors: `el()`, `group()`, `vstack()`, `hstack()`, `cardGrid()` |
| `anchor.ts` | 9-point anchor resolution |
| `style.ts` | CSS property filtering (block layout props), shadow presets |
| `spacing.ts` | Semantic spacing scale (`xs` through `section`) |
| `id.ts` | Auto-incrementing element IDs |
| `relative.ts` | Relative positioning helpers (`below`, `rightOf`, `centerIn`, etc.) |
| `measure.ts` | DOM-based text measurement with caching |
| `transforms.ts` | Post-solve alignment, distribution, size matching |
| `renderer.ts` | DOM rendering into Reveal.js `<section>` elements |
| `compounds.ts` | Higher-level primitives: `connect()`, `panel()`, `figure()` |
| `utilities.ts` | `grid()`, `snap()`, `repeat()`, percentage resolution |
| `dom-helpers.ts` | Shared DOM utilities |
| `types.ts` | TypeScript type definitions |
| `assertions.ts` | Runtime assertion helpers (`assertDefined`, `mustGet`, `assertUnreachable`) |
| `connectorRouting.ts` | Connector path routing (straight, elbow, curved) |
| `lint.ts` | Slide and deck linting rules (`lintSlide()`, `lintDeck()`) |
| `layout.ts` | Re-export barrel forwarding `layout()` and `getEffectiveDimensions()` |

### Layout Pipeline Decomposition

The layout solve pipeline (`src/layout/`) is split into 6 sub-modules, orchestrated by `index.ts`:

```
index.ts (orchestrator)
  ├── helpers.ts      — deepClone(), flattenElements()
  ├── intrinsics.ts   — Phase 1: resolve intrinsic sizes (text measurement, stack dimensions)
  ├── positions.ts    — Phase 2: topological sort of dependency graph, resolve positions
  ├── overflow.ts     — Phase 2.5: overflow policy checks
  ├── (transforms)    — Phase 3: alignment/distribution transforms (delegates to ../transforms.ts)
  └── finalize.ts     — Phase 4: collision detection, validation, provenance tracking
```

The `src/layout.ts` file is a re-export barrel that forwards `layout()` from `layout/index.ts` and `getEffectiveDimensions()` from `layout/intrinsics.ts`.

### State Management

All mutable state is centralized in a single exported object in `state.ts`:

```ts
export const state: SlideKitState = {
  idCounter: 0,
  config: null,
  safeRectCache: null,
  loadedFonts: new Set(),
  measureContainer: null,
  measureCache: new Map(),
  fontWarnings: [],
  injectedFontLinks: new Set(),
  transformIdCounter: 0,
};
```

Modules import `state` and read/write its properties directly. This replaces scattered `let` variables with a single, inspectable object. There is no event system or reactivity — state is mutated imperatively during `init()`, `measure()`, and `layout()`.

### Dependency Rules

- **No circular imports.** ESLint's `import/no-cycle` rule (max depth 5) enforces this at lint time.
- **Fan-in to the barrel.** The barrel file (`slidekit.ts`) imports from all `src/` modules; `src/` modules import from each other but never from the barrel.
- **Renderer ↔ Layout decoupling.** The renderer needs the layout function, but importing it directly would create a cycle. Instead, the barrel file injects it via `_setLayoutFn(layout)` at initialization.
- **State is a leaf dependency.** `state.ts` imports nothing from the project — other modules depend on it, not the other way around.

### Type Safety

All source files are TypeScript (`.ts`). Type definitions are centralized in `src/types.ts`. The `tsconfig.json` at the repo root configures strict type checking so running `tsc --noEmit` validates types across all modules without a compilation step.

### Build Tooling

- **esbuild** bundles the barrel file into `dist/slidekit.bundle.js` (ESM format, ~162kb unminified).
- **`npm run build`** produces the bundle with sourcemap.
- **`npm run typecheck`** runs `tsc --noEmit` for type validation.
- **`npm run lint`** runs ESLint on `src/` to enforce no-cycle and import hygiene rules.
- **`node run-tests.js`** runs the test suite (~1027 tests) via a Playwright-based browser runner.

## What SlideKit Does Not Do

- **It is not a design tool.** It doesn't have a GUI, drag-and-drop, or visual editor. It's a programmatic library.
- **It does not generate content.** It doesn't write your slide text or choose your images. It positions and validates what you give it.
- **It does not own your styling.** Colors, gradients, shadows, fonts, animations — that's all your HTML and CSS. SlideKit only owns layout coordinates.
- **It does not handle slide transitions or presenter features.** That's Reveal.js's job. SlideKit renders content *within* slides.

## Next Steps

- **[API.md](API.md)** — Full API reference with every function signature, property table, defaults, and return shapes. Start here to write code.
- **[AI Authoring Guide](AI_AUTHORING_GUIDE.md)** — Workflow guide for AI agents — render→inspect→correct loop, pitfalls, and proven patterns.
- **[examples/](../slidekit/examples/)** — Runnable example files demonstrating common patterns (title slides, card rows, connectors, grids, and more). Open `examples/run.html?example=title-slide` in a browser to see any example rendered live.

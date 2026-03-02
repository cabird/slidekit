# SlideKit

> **Current as of:** `068e7d3` (2026-03-02)

A coordinate-based slide layout library for AI agents and humans. You place every element at explicit pixel coordinates on a fixed 1920×1080 canvas — no CSS flexbox, no reflow, no surprises. SlideKit handles text measurement, collision detection, layout validation, and structured linting so you can build polished presentations programmatically.

## Why SlideKit?

CSS auto-layout is the wrong abstraction for slides. Slides are fixed-dimension canvases, not reflowing documents. When AI agents use CSS for slide layout, they get trapped debugging reflow, specificity cascades, and emergent behaviors they can't predict.

SlideKit takes a different approach:

- **You say where things go, and that's where they go.** No layout engine surprises.
- **Text is measured in the real DOM** before positioning, so you know exactly how tall a paragraph is.
- **Overlap and boundary violations are detected automatically** — the linter catches problems a human would spot visually.
- **The scene model is fully inspectable** — every element's resolved position, bounds, and provenance are available at `window.sk` after rendering.

## Quick Start

```bash
npm install && npm run build
python -m http.server 8000     # ES modules require a server — file:// won't work
```

Create an HTML file:

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
    import { init, render, el, below, safeRect } from './slidekit/dist/slidekit.bundle.js';

    await init();

    const safe = safeRect(); // { x: 120, y: 90, w: 1680, h: 900 }

    await render([{
      background: "#0c0c14",
      elements: [
        el("Hello, SlideKit", {
          id: "title", x: 960, y: 400, w: 1200,
          anchor: "tc", size: 72, weight: 700, color: "#fff", align: "center",
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

> **Important:** `center: false` in `Reveal.initialize` is required — SlideKit handles all positioning.

## How It Works

SlideKit uses a multi-phase layout pipeline:

1. **Flatten** — element tree → flat map with parent/child relationships
2. **Intrinsics** — measure text in the DOM, resolve `bounds: 'hug'` containers
3. **Position** — resolve anchors, relative positions (`below()`, `leftOf()`), stacks, `placeBetween()`
4. **Finalize** — build scene graph, detect collisions, route connectors, compute z-order

After rendering, `window.sk.layouts[N]` exposes every element's resolved bounds, collisions, and warnings — enabling programmatic validation and AI-driven correction loops.

## Key Features

**Element creation**
- `el(html, props)` — place any HTML content at exact coordinates
- `group(children, props)` — group elements with relative child coordinates
- `vstack(items, props)` / `hstack(items, props)` — vertical and horizontal stacking
- `panel(children, props)` — styled container with background, padding, border radius
- `figure(opts)` — image with optional caption
- `connect(fromId, toId, props)` — connectors with straight, curved, or elbow routing

**Positioning**
- 9-point anchor system: `tl`, `tc`, `tr`, `cl`, `cc`, `cr`, `bl`, `bc`, `br`
- Relative helpers: `below()`, `rightOf()`, `leftOf()`, `above()`, `centerIn()`, `placeBetween()`, `alignWith()`
- `safeRect()` returns the content-safe area; `splitRect()` divides it for multi-column layouts

**Layout intelligence**
- Async DOM-based text measurement with caching
- Collision detection with ancestry-aware overlap reporting
- Structured warnings (safe zone violations, font sizing, overflow)
- 30+ lint rules via `window.sk.lint('slideId')` and `window.sk.lintDeck()`

**Visual polish**
- Shadow presets (`sm`, `md`, `lg`, `xl`, `glow`, `inset`)
- Spacing tokens (`xs`, `sm`, `md`, `lg`, `xl`, `xxl`) for consistent gaps
- Transforms and animations: `fadeIn()`, `appear()`, `highlight()`
- Debug overlay for visual inspection of bounding boxes and anchors

## Documentation

| Document | Purpose |
|----------|---------|
| [Overview](docs/OVERVIEW.md) | Design philosophy, architecture, pipeline, module structure |
| [API Reference](docs/API.md) | Full API — every function, parameter, type, and usage pattern |
| [AI Authoring Guide](docs/AI_AUTHORING_GUIDE.md) | Workflow guide — render→inspect→correct loop, pitfalls, best practices |
| [Live Editing](docs/LIVE-EDITING.md) | Browser-based live editing via MCP tools |

**For library developers:**

| Document | Purpose |
|----------|---------|
| [Architecture](docs/for_devs/ARCHITECTURE.md) | Internal architecture, layout pipeline algorithms, data structures |
| [Design Decisions](docs/for_devs/DESIGN_DECISIONS.md) | Key design decisions with rationale |
| [API V2 Design](docs/for_devs/DESIGN_API_V2.md) | API v2 feature design and implementation tracking |

## Examples

See the [`examples/`](examples/) directory:
- **slidekit-about** — a presentation about SlideKit itself, exercising most API features
- **stress-test** — 18-slide deck that exercises every layout primitive and edge case

## Development

```bash
npm install                    # Install dependencies
npm run build                  # Bundle → slidekit/dist/slidekit.bundle.js
npm run typecheck              # TypeScript type checking (tsc --noEmit)
npm run lint                   # ESLint
node run-tests.js              # Full test suite (~1027 tests, Playwright)
```

The source lives in `slidekit/src/` — 19 TypeScript modules plus a 6-module layout pipeline. The entry point is `slidekit/slidekit.ts`, bundled via esbuild.

## License

See repository root for license information.

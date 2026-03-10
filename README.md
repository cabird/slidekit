# SlideKit

> **Current as of:** `759adf7` (2026-03-10)

A coordinate-based slide layout library built on [Reveal.js](https://revealjs.com), designed for AI agents and humans. You place elements at explicit coordinates on a fixed 1920×1080 canvas, express relationships between them with constraints like `below()`, `alignTopWith()`, and `between()`, and connect them with routed connector lines — no CSS flexbox, no reflow, no surprises. SlideKit handles text measurement, collision detection, layout validation, and structured linting so you can build polished presentations programmatically.

## Why SlideKit?

CSS auto-layout is the wrong abstraction for slides. Slides are fixed-dimension canvases, not reflowing documents. When AI agents use CSS for slide layout, they get trapped debugging reflow, specificity cascades, and emergent behaviors they can't predict.

SlideKit takes a different approach — it uses Reveal.js as its rendering backend and adds a coordinate-based layout system with declarative constraints on top:

- **You say where things go, and that's where they go.** No layout engine surprises.
- **Constraints express relationships** — `below('title', {gap: 24})`, `between('header', 'footer', {axis: 'y'})`, `alignTopWith('sidebar')`. Elements stay connected as you edit.
- **Text is measured in the real DOM** before positioning, so you know exactly how tall a paragraph is.
- **Overlap and boundary violations are detected automatically** — the linter catches problems a human would spot visually.
- **The scene model is fully inspectable** — every element's resolved position, bounds, and provenance are available at `window.sk` after rendering.

## Quick Start

### Option 1 — Direct from GitHub (simplest)

You can reference the built bundle directly in your HTML without installing anything:

```html
<script type="module">
  import * as sk from 'https://cdn.jsdelivr.net/gh/cabird/slidekit@main/slidekit/dist/slidekit.bundle.js';
</script>
```

Or download it directly:
```
https://raw.githubusercontent.com/cabird/slidekit/main/slidekit/dist/slidekit.bundle.js
```

### Option 2 — Local development

```bash
git clone https://github.com/cabird/slidekit.git
cd slidekit
npm install
npm run build
```

Then serve locally (ES modules require a server — `file://` won't work):
```bash
python -m http.server 8000
```

### Example

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
    import {
      init, render, safeRect,
      el, vstack, connect,
      below, rightOf, alignTopWith, between,
    } from './slidekit/dist/slidekit.bundle.js';

    await init();
    const safe = safeRect(); // { x: 120, y: 90, w: 1680, h: 900 }

    await render([{
      background: "#0c0c14",
      elements: [
        // Title — arbitrary HTML with inline styles
        el('<h1 style="font:700 64px Inter;color:#fff;margin:0">Hello, SlideKit</h1>', {
          id: "title", x: safe.x, y: safe.y, w: 900,
        }),

        // Subtitle — positioned relative to the title
        el('<p style="font:400 28px Inter;color:rgba(255,255,255,0.5)">Constraints, connectors, and full HTML</p>', {
          id: "sub", x: safe.x, y: below("title", { gap: 16 }), w: 700,
        }),

        // Left column — a vertical stack of cards
        vstack([
          el('<div style="background:#1e293b;border-radius:8px;padding:24px"><p style="font:600 24px Inter;color:#60a5fa;margin:0">Step 1</p><p style="font:400 18px Inter;color:#94a3b8;margin:8px 0 0">Define elements</p></div>', { id: "s1", w: 400 }),
          el('<div style="background:#1e293b;border-radius:8px;padding:24px"><p style="font:600 24px Inter;color:#34d399;margin:0">Step 2</p><p style="font:400 18px Inter;color:#94a3b8;margin:8px 0 0">Add constraints</p></div>', { id: "s2", w: 400 }),
          el('<div style="background:#1e293b;border-radius:8px;padding:24px"><p style="font:600 24px Inter;color:#fbbf24;margin:0">Step 3</p><p style="font:400 18px Inter;color:#94a3b8;margin:8px 0 0">Render & inspect</p></div>', { id: "s3", w: 400 }),
        ], { id: "steps", x: safe.x, y: below("sub", { gap: 48 }), gap: 16 }),

        // Right column — aligned to the stack, connected with an arrow
        el('<div style="background:rgba(251,191,36,0.1);border:2px solid #fbbf24;border-radius:12px;padding:32px"><p style="font:700 28px Inter;color:#fbbf24;margin:0 0 12px">Result</p><p style="font:400 20px Inter;color:rgba(255,255,255,0.7);margin:0">Pixel-perfect slides with inspectable layout provenance.</p></div>', {
          id: "result",
          x: rightOf("steps", { gap: 80 }),
          y: between("s1", "s3", { axis: "y" }),
          w: 500, anchor: "cl",
        }),

        connect("steps", "result", {
          id: "arrow", arrow: "end", color: "#fbbf24", thickness: 2,
          fromAnchor: "cr", toAnchor: "cl",
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
3. **Position** — resolve anchors, relative positions (`below()`, `leftOf()`), stacks, `between()`
4. **Finalize** — build scene graph, detect collisions, route connectors, compute z-order

After rendering, `window.sk.layouts[N]` exposes every element's resolved bounds, collisions, and warnings — enabling programmatic validation and AI-driven correction loops.

## Key Features

**Element creation**
- `el(html, props)` — place any HTML content at exact coordinates
- `group(children, props)` — group elements with relative child coordinates
- `vstack(items, props)` / `hstack(items, props)` — vertical and horizontal stacking
- `panel(children, props)` — styled container with background, padding, border radius
- `figure(opts)` — image with optional caption
- `connect(fromId, toId, props)` — connectors with straight, curved, elbow, or orthogonal routing

**Positioning**
- 9-point anchor system: `tl`, `tc`, `tr`, `cl`, `cc`, `cr`, `bl`, `bc`, `br`
- Relative helpers: `below()`, `rightOf()`, `leftOf()`, `above()`, `centerIn()`, `between()`, `alignTopWith()`, `alignBottomWith()`, `alignLeftWith()`, `alignRightWith()`
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

## Documentation

| Document | Purpose |
|----------|---------|
| [Overview](docs/OVERVIEW.md) | Design philosophy, architecture, pipeline, module structure |
| [API Reference](docs/API.md) | Full API — every function, parameter, type, and usage pattern |
| [AI Authoring Guide](docs/AI_AUTHORING_GUIDE.md) | Workflow guide — render→inspect→correct loop, pitfalls, best practices |

**For library developers:**

| Document | Purpose |
|----------|---------|
| [Architecture](docs/for_devs/ARCHITECTURE.md) | Internal architecture, layout pipeline algorithms, data structures |
| [Design Decisions](docs/for_devs/DESIGN_DECISIONS.md) | Key design decisions with rationale |
| [API V2 Design](docs/for_devs/DESIGN_API_V2.md) | API v2 feature design and implementation tracking |

## Examples

See the [`examples/`](examples/) directory:
- **slidekit-about** — a presentation about SlideKit itself, exercising most API features ([view PDF](examples/slidekit-about/slidekit-about.pdf))
- **stress-test** — 18-slide deck that exercises every layout primitive and edge case

## Development

```bash
npm install                    # Install dependencies
npm run build                  # Bundle → slidekit/dist/slidekit.bundle.js
npm run typecheck              # TypeScript type checking (tsc --noEmit)
npm run lint                   # ESLint
node run-tests.js              # Full test suite (~981 tests, Playwright)
```

The source lives in `slidekit/src/` — 28 TypeScript modules plus a 6-module layout pipeline. The entry point is `slidekit/slidekit.ts`, bundled via esbuild.

## License

MIT — see [LICENSE](LICENSE) for details.

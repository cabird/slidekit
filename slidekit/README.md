# SlideKit

> **Current as of:** `068e7d3` (2026-03-02)

A coordinate-based slide layout library for AI agents and humans. You place every element at explicit pixel coordinates on a 1920×1080 canvas — no CSS flexbox, no reflow, no surprises. SlideKit handles text measurement, collision detection, and structured validation so you can build presentations programmatically without visual debugging loops.

**Mental model:** Fixed canvas → explicit coordinates → measure text → solve layout → render. Runs in the browser (DOM required); targets Reveal.js as its rendering backend.

## Why SlideKit?

CSS auto-layout is the wrong abstraction for slides. Slides are fixed-dimension canvases, not reflowing documents. When AI agents use CSS for slide layout, they get trapped debugging reflow, specificity cascades, and emergent behaviors they can't predict. SlideKit eliminates this: you say where things go, and that's where they go.

## Quick Start

Build the bundle, then serve from a local web server. ES module imports require a server — `file://` will not work.

```bash
npm install && npm run build
python -m http.server 8000 --directory slidekit/
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

> **Important:** `center: false` in Reveal.initialize is required — SlideKit handles all positioning.

## Key Features

- **Explicit coordinates** — place elements at exact `(x, y)` positions on a 1920×1080 canvas
- **Relative positioning** — `below()`, `rightOf()`, `alignTopWith()`, and more
- **9-point anchor system** — `tl`, `tc`, `tr`, `cl`, `cc`, `cr`, `bl`, `bc`, `br`
- **Text measurement** — async DOM-based measurement with caching
- **Layout containers** — `vstack`, `hstack`, `panel`, `cardGrid`
- **Compound elements** — connectors, figures, panels with auto-height
- **Collision detection** — structured overlap reports
- **Alignment & distribution** — PowerPoint-style `alignTop`, `distributeH`, `matchWidth`, `fitToRect`
- **Structured validation** — machine-readable warnings/errors (safe zone, font size, overlaps)
- **Debug overlay** — visual bounding boxes, anchor points, collision highlights
- **Scene model** — full layout introspection via `window.sk` after rendering

## Documentation

| Document | Purpose |
|----------|---------|
| [Overview](../docs/OVERVIEW.md) | Design philosophy, architecture, pipeline, module structure |
| [API Reference](../docs/API.md) | Full API — every function signature, property, type, and pattern |
| [AI Authoring Guide](../docs/AI_AUTHORING_GUIDE.md) | Workflow guide — render→inspect→correct loop, pitfalls, pro patterns |

## Examples

- [`examples/basic.html`](examples/basic.html) — Single slide with elements and relative positioning
- [`examples/full-deck.html`](examples/full-deck.html) — 5-slide deck with panels, connectors, and theme CSS

## Development

```bash
npm install                    # Install dependencies
npm run build                  # Bundle → dist/slidekit.bundle.js
npm run typecheck              # tsc --noEmit
npm run lint                   # ESLint with import/no-cycle
node run-tests.js              # Full test suite (~1027 tests, Playwright)
```

## License

See repository root for license information.

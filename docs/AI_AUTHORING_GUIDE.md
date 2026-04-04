# SlideKit AI Authoring Guide

Workflow guide for AI agents building SlideKit presentations. For the API, see [SLIDEKIT_API_QUICK_REFERENCE.md](SLIDEKIT_API_QUICK_REFERENCE.md). For concepts, see [OVERVIEW.md](OVERVIEW.md).

---

## 1. Mental Model

SlideKit is coordinate-based on a fixed 1920×1080 canvas over Reveal.js. You position everything with `x`/`y`/`w`/`h` and relative helpers. The DOM measures text — so you must **render first, inspect, then correct**.

---

## 2. Project Setup

### File Structure

```
slides.js               # Slide definitions (plain JavaScript)
presentation.html       # HTML viewer (Reveal.js + SlideKit bundle)
slidekit.bundle.js      # The SlideKit bundle (copy from dist/ or download)
```

No build step is needed. Write plain JavaScript, import from the bundle, and serve.

### Minimal Slide File (`slides.js`)

```javascript
import { init, render, safeRect, el, below } from './slidekit.bundle.js';

await init({ fonts: [{ family: 'Inter', weights: [400, 600, 700] }] });
const safe = safeRect();

const slides = [
  {
    id: 'title',
    background: '#0a0a1a',
    elements: [
      el('<h1 style="font:700 72px Inter;color:#fff">My Presentation</h1>', {
        id: 'title-text', x: 960, y: 400, w: 1200, anchor: 'tc',
      }),
      el('<p style="font:400 28px Inter;color:#aaa">A SlideKit deck</p>', {
        id: 'subtitle', x: 960, y: below('title-text', 24), w: 800, anchor: 'tc',
      }),
    ],
  },
];

await render(slides);
```

> **Always declare fonts in `init()`.** SlideKit measures text off-screen to determine element heights. If fonts aren't loaded yet, the browser uses fallback fonts with different metrics — elements end up too short and text overflows. Declaring fonts in `init()` guarantees they load before measurement. If you use multiple font families (e.g. a sans-serif for headings and a serif for body), list them all:
>
> ```js
> await init({ fonts: [
>   { family: 'IBM Plex Sans', weights: [400, 600, 700], source: 'google' },
>   { family: 'IBM Plex Serif', weights: [400], source: 'google' },
> ]});
> ```

Every element referenced by `below()`, `rightOf()`, transforms, or connectors **must have an `id`**.

### HTML Template (`presentation.html`)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>My Presentation</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5/dist/reveal.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5/dist/theme/black.css">
  <style>body { margin: 0; background: #0a0a1a; }</style>
</head>
<body>
  <div class="reveal"><div class="slides"></div></div>
  <script src="https://cdn.jsdelivr.net/npm/reveal.js@5/dist/reveal.js"></script>
  <script type="module">
    import './slides.js';
    Reveal.initialize({
      width: 1920, height: 1080, center: false,
      hash: true, slideNumber: true, transition: 'none',
      controls: false, progress: false, margin: 0,
    });
  </script>
</body>
</html>
```

### Serve

ES modules require a server — `file://` won't work:

```bash
python -m http.server 8000
# Open http://localhost:8000/presentation.html
```

---

## 3. The Render → Inspect → Correct Loop (with Playwright)

You cannot know exact dimensions until after the browser renders. Use Playwright (via MCP or direct API) to render, inspect, and iterate:

1. **Write** slide code with best-guess positions and sizes
2. **Render** — navigate Playwright to `http://localhost:8000/presentation.html`
3. **Screenshot** — take a screenshot to see the visual result
4. **Inspect** — run JavaScript in the browser to query the scene graph and lint:
   ```javascript
   // Per-slide lint
   const findings = window.sk.lint('slide-id');
   const issues = findings.filter(f => f.severity !== 'info');

   // Check a specific element's resolved bounds
   const bounds = window.sk.layouts[0].elements['my-element'].resolved;
   // → { x, y, w, h }

   // Deck-wide lint (after all slides are done)
   const deckFindings = window.sk.lintDeck();
   ```
5. **Fix** — edit `slides.js`, reload the page in Playwright, screenshot again
6. **Repeat** until zero actionable findings and the slide looks right

### `scripts/snapshot_deck.js`

A ready-made script that automates the full inspect loop via Playwright:

```bash
node scripts/snapshot_deck.js --dir ./my-deck --out ./snapshots
# Options: --port 8000, --slides 1,7,9
```

For each slide it captures a 1920×1080 screenshot, runs `sk.lint(slideId)`, and extracts the scene graph. Then runs `sk.lintDeck()` for cross-slide checks. Outputs:

```
snapshots/
  screenshots/slide_01.png, slide_02.png, ...
  lint/slide_01.json, slide_02.json, ..., deck.json
  scenes/slide_01.json, slide_02.json, ...
  summary.json
```

Feed the lint JSONs and screenshots back to the AI for targeted fixes.

### What Playwright gives you

- **Screenshots** — ground truth for visual verification (balance, readability, spacing)
- **`evaluate()`** — run `window.sk.lint()`, read `window.sk.layouts[N].elements`, check DOM overflow
- **Live iteration** — edit the JS file, reload, and see results immediately, no build step
- **Navigation** — use `Reveal.slide(h, v)` to jump to specific slides for inspection

### Inspecting a specific element

```javascript
// In Playwright evaluate():
const el = window.sk.layouts[0].elements['my-element'];
console.log('Resolved bounds:', el.resolved);   // { x, y, w, h }
console.log('Provenance:', el.provenance);       // where each dimension came from

const dom = document.querySelector('[data-sk-id="my-element"]');
if (dom) {
  console.log('Overflow?', dom.scrollHeight > dom.clientHeight);
}
```

---

## 4. Linting Workflow

```
1. Run window.sk.lint(slideId) after rendering each slide
2. Filter: findings.filter(f => f.severity !== 'info')
3. Skip: non-ancestor-overlap on connectors, safe-zone on overlay elements
4. Fix: text-overflow, canvas-overflow, low-contrast, gap-too-small (for text)
5. Run window.sk.lintDeck() once at the end for cross-slide consistency
6. Review title-position-drift / style-drift — don't over-normalize hero slides
```

### Rule Signal Rates

Always fix: `text-overflow` (~100%), `canvas-overflow` (~100%), `low-contrast` (~100%). Usually fix: `aspect-ratio-distortion` (~80%), `gap-too-small` (~40%, text only). Context-dependent: `content-clustering` (~30%, skip title/hero), `near-misalignment` (~25%). Mostly noise: `child-overflow` (~3%), `non-ancestor-overlap` (~1%, connectors/cross-layer), `safe-zone-violation` (overlay only), `title-position-drift`, `style-drift` (hero slides differ intentionally).

### Known Linter Limitations

1. Cannot resolve `hstack()`/`vstack()`/`cardGrid()`/`panel()` child positions → massive false-positive overlaps.
2. Connectors always overlap endpoints — always false positives.
3. Overlay layer not exempt from safe-zone.
4. Cannot parse inline HTML backgrounds for contrast (reports 1.00:1).
5. `empty-text` doesn't distinguish decorative shapes from empty text.

---

## 5. Sub-Agent Orchestration

For large decks, split work across sub-agents:

### Roles

**Orchestrator:** Holds presentation plan, dispatches tasks, reviews summaries, makes design decisions.

**Sub-agents:**
- `explore` — read API docs, source files
- `task` — write/edit slide code, fix lint findings
- `general-purpose` — screenshots via Playwright MCP, run linter in browser, investigate visual bugs

### Workflow

1. Plan all slides (content, layout approach)
2. Sub-agent writes slides 1–5
3. Sub-agent uses Playwright to render, screenshot, and lint — reports findings
4. Sub-agent fixes issues, reloads, re-screenshots
5. Repeat in batches of ~5 slides
6. `lintDeck()` for cross-slide consistency
7. Final screenshot set for visual review

### Rules

- Never read large files in the orchestrator — have sub-agents summarize
- Sub-agents report concisely: element IDs, numeric values, fixes applied
- One concern per sub-agent (don't combine write + lint + fix)

---

## 6. Generating PDFs with Decktape

```bash
npx decktape reveal --size 1920x1080 --pause 3000 --load-pause 5000 \
  http://127.0.0.1:8000/presentation.html output.pdf
```

`--size 1920x1080` matches canvas. `--pause 3000` gives async layout time (minimum 2000ms). `--load-pause 5000` waits for initial load. Generate PDF as final step after all validation passes.

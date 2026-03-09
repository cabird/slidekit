# SlideKit AI Authoring Guide

> **Current as of:** `66ce7bc` (2026-03-02)

Workflow guide for AI agents building SlideKit presentations. For API reference, see [API_COMPACT.md](API_COMPACT.md). For concepts, see [OVERVIEW.md](OVERVIEW.md).

---

## 1. Mental Model

SlideKit is coordinate-based on a fixed 1920×1080 canvas over Reveal.js. You position everything with `x`/`y`/`w`/`h` and relative helpers. The DOM measures text — so you must **render first, inspect, then correct**.

---

## 2. Project Setup

### File Structure

```
my_deck.ts              # Slide definitions
my_deck.html            # HTML viewer (Reveal.js + bundle)
my_deck_bundle.js       # Built output (esbuild)
```

### Minimal Deck

```typescript
import { render, safeRect, el, below } from '../slidekit/dist/slidekit_ts.bundle.js';
import type { SlideDefinition } from '../slidekit/src/types.js';

const safe = safeRect();

const slides: SlideDefinition[] = [
  {
    id: 'title',
    background: '#0a0a1a',
    elements: [
      el('<h1 style="color:#fff;font-size:72px;">My Presentation</h1>', {
        id: 'title-text', x: 960, y: 400, w: 1200, anchor: 'tc',
      }),
      el('<p style="color:#aaa;font-size:28px;">A SlideKit deck</p>', {
        id: 'subtitle', x: 960, y: below('title-text', { gap: 24 }), w: 800, anchor: 'tc',
      }),
    ],
  },
];

export async function run() { return await render(slides); }
```

Every element referenced by `below()`, `rightOf()`, transforms, or connectors **must have an `id`**.

### Build & Serve

```bash
npx esbuild my_deck.ts --bundle --format=esm --outfile=my_deck_bundle.js --sourcemap
python3 -m http.server 8765
```

### HTML Template

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
    import { run } from './my_deck_bundle.js';
    await run();
    Reveal.initialize({
      width: 1920, height: 1080, center: false,
      hash: true, slideNumber: true, transition: 'none',
      controls: false, progress: false, margin: 0,
    });
  </script>
</body>
</html>
```

Reveal.js JS must load via `<script>` tag before `Reveal.initialize()`. Cache bust after rebuilds: append `?v=<timestamp>` or hard-reload (Ctrl+Shift+R).

---

## 3. The Render → Inspect → Correct Loop

You cannot know exact dimensions until after the browser renders. Always follow this loop:

1. **Write** slide code with best-guess dimensions
2. **Build** (`npx esbuild ...`)
3. **Check** programmatically in browser:
   ```javascript
   // Per-slide lint
   const findings = window.sk.lint('slide-id');
   const issues = findings.filter(f => f.severity !== 'info');
   // Deck-wide lint (after all slides done)
   window.sk.lintDeck();
   ```
4. **Fix** — priority: errors (text-overflow, canvas-overflow) → warnings (gap-too-small, low-contrast) → info (skip most)
5. **Screenshot** for visual verification (balance, readability, spacing)
6. **Repeat** until zero actionable findings

---

## 4. Linting Workflow

```
1. Run window.sk.lint(slideId) during development (fast, per-slide)
2. Filter: findings.filter(f => f.severity !== 'info')
3. Skip: non-ancestor-overlap on connectors, safe-zone on overlay elements
4. Fix: text-overflow, canvas-overflow, low-contrast, gap-too-small (for text)
5. Run window.sk.lintDeck() once at end for cross-slide consistency
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

## 5. Debugging a Specific Element

```javascript
const slideIdx = window.sk.slides.findIndex(s => s.id === 'my-slide');
const resolved = window.sk.layouts[slideIdx].elements['my-element'].resolved;
console.log('Bounds:', resolved); // { x, y, w, h }

const domEl = document.querySelector('[data-sk-id="my-element"]');
if (domEl) {
  console.log('DOM:', domEl.clientWidth, domEl.clientHeight);
  console.log('Scroll:', domEl.scrollWidth, domEl.scrollHeight);
  console.log('Overflow?', domEl.scrollHeight > domEl.clientHeight);
}
```

Use Playwright screenshots as ground truth — headless Chromium and user browsers may differ slightly.

---

## 6. Sub-Agent Orchestration

### Roles

**Orchestrator:** Holds presentation plan, dispatches tasks, reviews summaries, makes design decisions.

**Sub-agents:**
- `explore` — read API docs, source files
- `task` — build with esbuild, write/edit code, fix lint findings
- `general-purpose` — screenshots via MCP, run linter in browser, investigate visual bugs

### Workflow

1. Plan all slides (content, layout approach)
2. Sub-agent writes slides 1–5, builds, serves
3. Sub-agent screenshots + lints, reports findings
4. Sub-agent fixes, rebuilds
5. Repeat in batches of ~5 slides
6. `lintDeck()` for cross-slide consistency
7. Final screenshot set for visual review

### Rules

- Never read large files in the orchestrator — have sub-agents summarize
- Sub-agents report concisely: element IDs, numeric values, fixes applied
- One concern per sub-agent (don't combine write + lint + fix)

---

## 7. Generating PDFs with Decktape

```bash
npx decktape reveal --size 1920x1080 --pause 3000 --load-pause 5000 \
  http://127.0.0.1:8765/path/to/index.html output.pdf
```

`--size 1920x1080` matches canvas. `--pause 3000` gives async layout time (minimum 2000ms). `--load-pause 5000` waits for initial load. Generate PDF as final step after all validation passes.

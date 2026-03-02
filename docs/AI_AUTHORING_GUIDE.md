# SlideKit: The Definitive AI Authoring Guide

> **Current as of:** `42ae636` (2026-03-02)

A comprehensive guide for AI agents creating presentations with SlideKit. Read this once before building any slides.

---

## 1. What Is SlideKit?

SlideKit is a coordinate-based presentation library that renders elements on a fixed **1920×1080 canvas**. It runs on top of Reveal.js. You position everything with explicit `x`/`y`/`w`/`h` coordinates and relative helpers (`below()`, `rightOf()`, etc.). The layout engine resolves all positions, and a renderer converts the scene graph to DOM elements.

**Key mental model:** You are a layout engine, not a CSS author. Every element has a known position and size. SlideKit doesn't reflow elements automatically, but the DOM still measures text — so you must render first, then inspect actual dimensions, then correct.

For the full conceptual overview, see [OVERVIEW.md](OVERVIEW.md). For every function signature, property, and type, see [API.md](API.md).

**The Safe Zone:** Content must stay within 120px left/right and 90px top/bottom. Use `safeRect()` to get `{ x: 120, y: 90, w: 1680, h: 900 }`. Background (`layer: 'bg'`) elements are exempt. Overlay elements are typically decorative but the linter currently flags them (see Section 4).

**Three rendering layers** (back to front): `bg` → `content` → `overlay`.

---

## 2. Project Setup & Build Process

### File Structure

```
your_presentation.ts        # Slide definitions (TypeScript)
your_presentation.html       # HTML viewer (loads Reveal.js + bundle)
your_presentation_bundle.js  # Built output (esbuild)
```

### Minimal "Hello Deck" Example

```typescript
// my_deck.ts
import {
  render, safeRect, el, below,
} from '../slidekit/dist/slidekit_ts.bundle.js';

import type { SlideDefinition } from '../slidekit/src/types.js';

const safe = safeRect(); // { x: 120, y: 90, w: 1680, h: 900 }

const slides: SlideDefinition[] = [
  {
    id: 'title',
    background: '#0a0a1a',
    notes: 'Opening slide',
    elements: [
      el('<h1 style="color:#fff;font-size:72px;">My Presentation</h1>', {
        id: 'title-text', x: 960, y: 400, w: 1200, anchor: 'tc',
      }),
      el('<p style="color:#aaa;font-size:28px;">A SlideKit deck</p>', {
        id: 'subtitle', x: 960, y: below('title-text', { gap: 24 }), w: 800, anchor: 'tc',
      }),
    ],
  },
  {
    id: 'content',
    background: '#0a0a1a',
    elements: [
      el('<h2 style="color:#fff;font-size:48px;">Key Point</h2>', {
        id: 'heading', x: safe.x, y: safe.y, w: safe.w, h: 70,
      }),
      el('<p style="color:#ccc;font-size:24px;">Details go here.</p>', {
        id: 'body', x: safe.x, y: below('heading', { gap: 24 }), w: 800,
      }),
    ],
  },
];

export async function run() {
  return await render(slides);
}
```

**Key points:**
- Slides are plain objects with `id`, `background`, `notes` (optional), `elements[]`, and optional `transforms[]`.
- `run()` calls `render(slides)` and is imported by the HTML file.
- Every element that will be referenced by `below()`, `rightOf()`, transforms, or connectors **must have an `id`**.

### Build Command

```bash
npx esbuild my_deck.ts --bundle --format=esm \
  --outfile=my_deck_bundle.js --sourcemap
```

### HTML Template

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
    console.log('SlideKit loaded. Scene model at window.sk');
  </script>
</body>
</html>
```

**Important:** Reveal.js JS **must** be loaded via a `<script>` tag before `Reveal.initialize()` is called. The `run()` function renders slides into `.reveal .slides`, then Reveal takes over navigation.

### Serving

```bash
python3 -m http.server 8765
# Open: http://127.0.0.1:8765/path/to/my_deck.html
```

### Cache Busting

After rebuilding, append `?v=<timestamp>` to the bundle script src, or hard-reload (Ctrl+Shift+R). Browsers aggressively cache JS bundles.

---

## 3. The Render → Inspect → Correct Workflow

**This is the most important section.** You cannot know exact rendered dimensions until after the browser renders. Always follow this loop:

### Step 1: Write Slide Code

Write slide code with best-guess dimensions. Overestimate text heights rather than underestimate.

### Step 2: Build & Render

```bash
npx esbuild ... && echo "Build OK"
```

Open the HTML in a browser (via MCP or serve locally).

### Step 3: Run Programmatic Checks

In the browser console (via MCP):

```javascript
// Check layout warnings for each slide
window.sk.layouts.forEach((layout, i) => {
  if (layout.warnings?.length) {
    console.log(`Slide ${i}:`, layout.warnings);
  }
});

// Per-slide linting (the API is window.sk.lint(), not lintSlide())
const findings = window.sk.lint('slide-id');
const issues = findings.filter(f => f.severity !== 'info');
console.log(`${issues.length} actionable findings`);

// Deck-wide linting (after all slides are done)
const deckFindings = window.sk.lintDeck();
```

### Step 4: Fix Violations

Priority order:
1. **Errors** (text-overflow, canvas-overflow, non-ancestor-overlap if real)
2. **Warnings** (gap-too-small, low-contrast)
3. **Info** (near-misalignment — usually fine to skip)

### Step 5: Visual Inspection

**After** programmatic checks pass, take a screenshot and inspect visually:
- Does the slide look balanced?
- Is text readable?
- Are margins and spacing consistent?

### Step 6: Rebuild & Repeat

Rebuild, re-render, re-check until zero actionable findings.

---

## 4. The Linter: What's Useful, What's Noise

### Signal-to-Noise Summary

The linter produces many findings. Based on extensive testing, here's what matters:

| Rule | Signal Rate | Action |
|------|-------------|--------|
| `text-overflow` | ~100% useful | Always fix — text is literally clipped |
| `canvas-overflow` | ~100% useful | Always fix — element extends beyond slide |
| `low-contrast` | ~100% useful | Always fix — accessibility issue |
| `gap-too-small` | ~40% useful | Fix for text; skip for decorative/diagram elements |
| `aspect-ratio-distortion` | ~80% useful | Fix unless intentional |
| `non-ancestor-overlap` | ~1% useful | **Overwhelmingly noise.** Most are connectors, cross-layer elements, or unresolved layout containers. Only fix if two sibling content elements genuinely collide. |
| `child-overflow` | ~3% useful | Mostly group coordinate confusion. Check only if visually wrong. |
| `content-clustering` | ~30% useful | Valid for content slides; skip for title/hero/section-break slides |
| `safe-zone-violation` | ~0% useful (overlay) | Background is already exempt; overlay elements are intentionally at edges. Only useful for content-layer elements. |
| `near-misalignment` | ~25% useful | Review but usually coincidental proximity |
| `title-position-drift` | Low | Hero slides intentionally differ from content slides |
| `style-drift` | Low | Same — hero vs content slides have different typography |

### Known Linter Limitations

1. **Cannot resolve layout abstractions.** `hstack()`, `vstack()`, `cardGrid()`, and `panel()` children may have unresolvable positions. The linter sees all children at the same computed coordinates, producing massive false-positive overlap counts. **Workaround:** Use explicit `x`/`y`/`w` positioning or accept the noise.

2. **Connectors are not exempt from overlap.** Every connector overlaps its endpoint elements by definition. These are always false positives.

3. **Overlay layer not exempt from safe-zone.** Corner brackets, decorative framing, and other overlay elements trigger safe-zone violations even though they're intentionally at edges.

4. **Cannot parse inline HTML backgrounds for contrast.** When you embed `<div style="background:rgba(...)">` in an `el()`, the linter can't determine the background color for contrast checking. It may report 1.00:1 ratio (comparing text against itself).

5. **No `empty-text` intelligence.** The rule doesn't distinguish decorative shapes (elements with `background` styling but no text) from genuinely empty text elements.

### Recommended Linting Workflow

```
1. Build and render all slides
2. Run window.sk.lint(slideId) on each slide during development (fast, focused)
3. Filter to errors + warnings only: findings.filter(f => f.severity !== 'info')
4. Skip: non-ancestor-overlap on connectors, safe-zone on overlay elements
5. Fix: text-overflow, canvas-overflow, low-contrast, gap-too-small (for text)
6. Run window.sk.lintDeck() once at the end for cross-slide consistency
7. Review title-position-drift and style-drift, but don't over-normalize hero slides
```

---

## 5. Known Pitfalls (Critical — Read Before Coding)

### Pitfall 1: `leftOf` Labels Appear Far from Their Reference

`leftOf` positions the element's **right edge** at the gap boundary. If the element has left-aligned text (default), the visible text starts far from the reference.

```typescript
// ❌ Text floats ~150px away from the box
el('label', { x: leftOf('box', { gap: 16 }), w: 340 });

// ✅ Text hugs the reference
el('label', { x: leftOf('box', { gap: 16 }), w: 340, style: { textAlign: 'right' } });
```

**Rule:** Match `textAlign` to the positioning direction:
| Position | Recommended `textAlign` |
|----------|------------------------|
| `rightOf` | `left` (default) |
| `leftOf` | `right` |

### Pitfall 2: CSS Properties Must Go Inside `style: {}`

Top-level CSS properties like `textAlign`, `overflow`, `whiteSpace` are **silently ignored**. They must be inside `style: {}`.

```typescript
// ❌ Silently ignored — textAlign is not a layout prop
el('text', { w: 340, textAlign: 'right' });

// ✅ Correct
el('text', { w: 340, style: { textAlign: 'right' } });
```

The library now auto-promotes misplaced CSS props with a warning, but don't rely on this — put them in `style: {}` explicitly.

### Pitfall 3: `placeBetween` Falls Back Silently When Element Doesn't Fit

If the element's size exceeds the gap between references, it falls back to `topEdge + xs` spacing and may overlap.

```typescript
// ❌ 70px element in a 24px gap → overlap
el('E', { y: placeBetween('A', 'B'), h: 70 });

// ✅ Ensure gap ≥ element size + padding
el('B', { y: below('A', { gap: 150 }) });
el('E', { y: placeBetween('A', 'B'), h: 70 }); // fits
```

Check for `between_no_fit` warnings in the layout result.

### Pitfall 4: `dash` on Connectors Must Be an SVG String

```typescript
// ❌ Silently produces solid line (comma-separated)
connect('a', 'b', { dash: '6,4' });

// ❌ Wrong type — dash expects a string, not an array
connect('a', 'b', { dash: [6, 4] });

// ✅ Correct — SVG stroke-dasharray string (space-separated)
connect('a', 'b', { dash: '6 4' });
```

### Pitfall 5: Transforms Only Move Explicitly-Passed Elements

`distributeH`, `alignTop`, etc. don't know about "children" or "related elements." If you distribute containers, their labels/dots stay behind.

```typescript
// ❌ Only containers move — dots and labels get orphaned
transforms: [distributeH(['container-1', 'container-2', 'container-3'])]

// ✅ Group related elements, then transform the groups
group([container1, dot1, label1], { id: 'group-1' }),
group([container2, dot2, label2], { id: 'group-2' }),
transforms: [distributeH(['group-1', 'group-2'])]
```

### Pitfall 6: Curved Connectors Degenerate to Straight Lines

When connector anchors produce collinear control points (e.g., `cr → cl` on horizontally-aligned boxes), the cubic Bézier curve becomes a straight line.

```typescript
// ❌ Looks straight — control points are collinear
connect('a', 'b', { type: 'curved', fromAnchor: 'cr', toAnchor: 'cl' });

// ✅ Use corner anchors for visible curves
connect('a', 'b', { type: 'curved', fromAnchor: 'tr', toAnchor: 'tl' });
```

### Pitfall 7: Reveal.js Font-Size Inheritance

Reveal.js sets `font-size: 42px` on ancestor elements. SlideKit's baseline CSS now resets this with `font-size: initial` on container divs. If you see inflated text sizes, check that you're using the latest library version.

### Pitfall 8: `hstack`/`cardGrid` Opaque to Linter

The linter cannot resolve child positions inside `hstack()`, `cardGrid()`, or nested `panel()` containers. This causes massive false-positive overlap counts.

**Lint-friendly alternatives:**
- Use explicit `x`/`y`/`w` on each panel instead of wrapping in `hstack()`
- Use `splitRect()` to compute column positions mathematically
- For quotes/cards with inner children, flatten to a single `el()` with inline HTML

```typescript
// ❌ Linter sees all children at same position → 16 overlap errors
hstack([panel([...]), panel([...]), panel([...])], { gap: 20 });

// ✅ Linter can resolve each panel's position
panel([...], { x: 120, y: 200, w: 520 }),
panel([...], { x: 700, y: 200, w: 520 }),
panel([...], { x: 1280, y: 200, w: 520 }),
```

### Pitfall 9: Glow Shadows Need Dark Backgrounds

Unlike regular shadows (visible on light backgrounds), glow effects are only visible on dark surfaces. Use a dark backdrop behind the glowing element.

### Pitfall 10: `anchor: 'tc'` on `figure()` Compounds Breaks Linter

The linter resolves group anchor positions for the parent but evaluates children at raw group-relative coordinates. For `figure()` compounds, use `anchor: 'tl'` (default) and manually compute centered x.

```typescript
// ❌ Linter sees children at (0,0) → false overflow/overlap
figure('fig', src, { x: 960, anchor: 'tc', w: 1020 });

// ✅ Manually center
figure('fig', src, { x: 960 - 1020/2, w: 1020 });
```

---

## 6. Field-Discovered Anti-Patterns

These anti-patterns were found by AI agents building real SlideKit presentations. Each was discovered through actual failures during the render → inspect → correct loop.

### Anti-Pattern 1: Elements Without Explicit Width → Invisible Content

A helper function created title elements with `{ id, h: 70 }` but no `w`. Every title across 18 slides rendered at `w: 0` — completely invisible.

```typescript
// ❌ Element has no width — collapsed to zero, invisible
el('<h2>Title</h2>', { id: 'title', h: 70 });

// ✅ Always set explicit width for text elements
el('<h2>Title</h2>', { id: 'title', w: 1680, h: 70 });
```

**Lesson:** Never rely on auto-sizing for elements that contain text. Always specify `w` explicitly, or use `w: 'fill'` inside a container that provides width.

### Anti-Pattern 2: Groups Without Dimensions Used as Layout Containers

A group at `{ x: 200, y: 200 }` without `w` or `h` contained a vstack → panels → hstacks. The group defaulted to 0×0, so the entire nested structure was invisible despite children having proper dimensions.

```typescript
// ❌ Group has no dimensions — children may be invisible
group([vstack([...])], { id: 'main', x: 200, y: 200 });

// ✅ Groups used as layout containers need explicit dimensions
group([vstack([...])], { id: 'main', x: safe.x, y: 190, w: safe.w, h: 600 });
```

**Lesson:** If a group serves as a layout container (not just a position anchor), give it explicit `w`/`h`.

### Anti-Pattern 3: Cross-Axis Misuse of Alignment Helpers

An agent used `alignTopWith()` (which returns a y-value) as an x-coordinate. All boxes collapsed to the wrong position.

```typescript
// ❌ alignTopWith returns Y — using it for X makes no sense
el('box', { x: alignTopWith('ref'), y: 200, w: 100, h: 100 });

// ✅ Match the helper to the axis
el('box', { x: alignLeftWith('ref'), y: alignTopWith('ref'), w: 100, h: 100 });
```

**Lesson:** `alignTopWith`/`alignBottomWith`/`centerVWith` → Y axis. `alignLeftWith`/`alignRightWith`/`centerHWith` → X axis. Never cross them.

### Anti-Pattern 4: Hiding Overflow Instead of Fixing Dimensions

When text overflows a container, agents reach for `overflow: 'hidden'`. This hides the symptom but the text is still clipped.

```typescript
// ❌ Hides the symptom — text is still truncated
el('Long text here', { w: 200, h: 20, style: { overflow: 'hidden' } });

// ✅ Fix the actual dimensions
el('Long text here', { w: 400, h: 40 });
```

**Lesson:** If content overflows, the dimensions are wrong. Fix `w`/`h` to fit the actual content.

### Anti-Pattern 5: Guessing Image Dimensions

Agents estimate image container sizes without rendering first. This produces letterboxing (`object-fit: contain` with wrong aspect ratio) or overflow.

```typescript
// ❌ Guessed dimensions — image will letterbox or overflow
figure('chart', src, { w: 800, h: 600 });

// ✅ Render first, read natural dimensions, then compute exact container size
// Step 1: render with a guess
// Step 2: const img = document.querySelector('[data-sk-id="chart"] img');
//         // or: document.querySelector('#chart img');
//         const ratio = img.naturalWidth / img.naturalHeight;
// Step 3: const containerH = containerW / ratio;
// Step 4: update figure with exact dimensions
```

**Lesson:** Always render first, read `naturalWidth`/`naturalHeight`, then compute exact container dimensions so `object-fit: contain` is a no-op.

### Anti-Pattern 6: `below()` Chains Accumulate Beyond Safe Zone

When chaining elements with `below()`, each gap adds to the total height. Agents forget to check that the last element in the chain stays within y ≤ 990 (safe zone bottom).

```typescript
// ❌ After 6 chained elements, the last one is at y=1050 — below safe zone
el('A', { y: 90 }),
el('B', { y: below('A', { gap: 24 }) }),
el('C', { y: below('B', { gap: 24 }) }),
// ... more chaining ...
el('F', { y: below('E', { gap: 24 }) }), // y = 1050, off-screen!

// ✅ Verify the chain fits — reduce gaps or element heights
// Total budget: 990 - 90 = 900px for all elements + gaps
```

**Lesson:** After building a vertical chain, mentally (or programmatically) verify the bottom of the last element is ≤ 990.

### Anti-Pattern 7: `w: 'fill'` Without Understanding Container Context

`w: 'fill'` inside panels and stacks computes differently than explicit pixel widths. It fills the remaining space in the parent, which depends on siblings and padding.

```typescript
// ❌ Assumes fill = parent width — but padding and siblings reduce it
el('text', { w: 'fill' }); // What is "fill" here? Depends on parent.

// ✅ Verify resolved width after rendering
// Don't assume fill equals parent.w — check window.sk.layouts[N].elements['id'].resolved.w
```

### Anti-Pattern 8: Unencoded Special Characters in Data URIs

SVG data URIs with unencoded `<`, `>`, `#` characters break rendering. Elements show raw HTML instead of images.

```typescript
// ❌ Special characters break the data URI
figure('fig', 'data:image/svg+xml,<svg>...</svg>', rect);

// ✅ Encode the SVG content
figure('fig', `data:image/svg+xml,${encodeURIComponent('<svg>...</svg>')}`, rect);
```

### Anti-Pattern 9: Using `parentId` to Fix Overlap Warnings Incorrectly

When two decorative `layer: 'bg'` elements overlap (e.g., a glow overlay on a background image), agents sometimes set `parentId` to suppress the overlap warning. This works but changes the semantic hierarchy — only do it when the parent-child relationship is actually correct.

```typescript
// ⚠️ Works but only correct when glow IS conceptually inside the bg image
el('', { id: 'glow', layer: 'bg', parentId: 's1-bg-img', ... });

// Better: Accept the overlap finding as a known false positive if the elements are independent
```

### Anti-Pattern 10: Caption Spacing Too Tight After Large Visuals

Agents use small gaps after charts/images. A 20px gap after a 600px-tall chart looks cramped — the caption appears to be part of the chart's own labeling.

```typescript
// ❌ Caption crowds the chart
el('Caption', { y: below('chart', { gap: 20 }), ... }); // 20px after a huge chart

// ✅ Use proportional spacing: max(30px, 1.5× caption font size)
el('Caption', { y: below('chart', { gap: 40 }), ... }); // Breathable
```

---

## 7. Field-Discovered Pro Patterns

These patterns were found to work well by AI agents building real presentations.

### Pro Pattern 1: `centerVWith` for Labels Next to Elements

When placing a label next to a box, use `centerVWith` (not `alignTopWith`) for proper vertical centering:

```typescript
// ❌ Top-aligned — label text sits at the top of a tall box
el('label', { x: rightOf('box', { gap: 16 }), y: alignTopWith('box') }); // label h:22, box h:70

// ✅ Center-aligned — label is vertically centered with the box
el('label', { x: rightOf('box', { gap: 16 }), y: centerVWith('box') });
```

**Note:** `centerVWith(refId)` positions ONE element relative to another. `alignCenterV(ids[])` is a TRANSFORM for aligning MULTIPLE elements to a common center. Don't confuse them.

### Pro Pattern 2: `hstack({ align: 'stretch' })` for Equal-Height Cards

The library supports `align: 'stretch'` which equalizes all children to the tallest child's height. This prevents the most common visual issue in card layouts (ragged bottom edges).

```typescript
hstack([panel(...), panel(...), panel(...)], { align: 'stretch', gap: 20 });
```

**Caveat:** May still produce linter false positives since the linter can't fully resolve hstack positions.

### Pro Pattern 3: `splitRect()` for Two-Column Layouts

```typescript
const safe = safeRect();
const { left, right } = splitRect(safe, 0.55, 40); // 55% left, 40px gap
// left = { x: 120, y: 90, w: 884, h: 900 }
// right = { x: 1044, y: 90, w: 756, h: 900 }
```

This gives you mathematically precise column rects. Use `left.x`, `left.w`, etc. for positioning.

### Pro Pattern 4: Explicit Multi-Column Positioning (Lint-Friendly)

When using 3+ columns, compute positions explicitly instead of using `hstack()`:

```typescript
const cols = 3, gap = 20;
const cardW = (safe.w - gap * (cols - 1)) / cols;
// Col 1: x = safe.x
// Col 2: x = safe.x + cardW + gap
// Col 3: x = safe.x + 2 * (cardW + gap)
```

This is the single most impactful pattern for reducing linter noise. Every multi-column slide that agents converted from `hstack()` to explicit positioning eliminated 10-16 false-positive overlap findings.

### Pro Pattern 5: Panel → Single `el()` Flattening

When `panel([child1, child2])` generates false-positive overlaps, flatten to a single `el()` with inline HTML. This was used successfully for quote blocks, stat cards, and info cards:

```typescript
// Before: 3 elements, linter can't resolve children → overlap errors
panel([
  el(quote, { id: 'q-text', w: 'fill' }),
  el(attr, { id: 'q-attr', w: 'fill' }),
], { id: 'quote', padding: 'sm', gap: 8, fill: '#1a1a2e' })

// After: 1 element, fully resolvable → zero overlap errors
el(`<div style="background:#1a1a2e;padding:16px;border-radius:8px;">
  <p style="margin:0;">${quote}</p>
  <p style="margin:10px 0 0 0;font-size:14px;">${attr}</p>
</div>`, { id: 'quote', x: 120, y: below('prev', { gap: 20 }), w: 800 })
```

### Pro Pattern 6: Spacing Scale Compliance (≥ 8px)

The linter flags gaps below 8px. Use the spacing scale:
- `xs` = 8px, `sm` = 16px, `md` = 24px, `lg` = 32px, `xl` = 48px

A gap of 6px between stat numbers and labels was flagged and improved readability when increased to 10px. The minimum is meaningful.

### Pro Pattern 7: Safe-Zone-Filling Cards

Agents initially made cards narrower than necessary (e.g., 500px each in a two-column layout on a 1680px safe zone). Widening cards to fill the safe zone width improved both readability and linter results (content-clustering warnings resolved).

```typescript
// ❌ Cards too narrow — wasted space, clustering warning
panel([...], { w: 500 }), panel([...], { w: 500 }); // 1000px of 1680px used

// ✅ Fill the safe zone
const cardW = (safe.w - gap) / 2; // 820px each
panel([...], { x: safe.x, w: cardW }), panel([...], { x: safe.x + cardW + gap, w: cardW });
```

### Pro Pattern 8: Rendering-First Image Workflow

1. First render with guessed dimensions
2. Read `img.naturalWidth` / `img.naturalHeight` from the DOM
3. Compute exact container: `containerH = containerW / (naturalW / naturalH)`
4. Update and re-render with exact dimensions
5. Verify `scrollHeight === clientHeight` (no overflow)

### Pro Pattern 9: Browser Screenshot as Ground Truth

Playwright and the user's browser can render differently. When working with an AI agent:
1. Agent generates screenshots via MCP
2. User reviews those screenshots (not their own browser)
3. Feedback is based on the same render the agent can inspect/fix

This prevents the "I can't reproduce your bug" problem.

### Pro Pattern 10: CSS Overrides Go in `_baselineCSS()`, Not Inline

All host-framework CSS resets (Reveal.js overrides) should go in `_baselineCSS()` in `style.ts`, not as inline styles on individual elements. This uses tripled attribute selectors for specificity (0,3,0) to beat Reveal.js rules.

```typescript
// ❌ Inline hack on every element — whack-a-mole
el('text', { style: { fontSize: '0', lineHeight: '0' } }); // on every container

// ✅ One centralized reset in _baselineCSS()
// font-size: initial; in the container CSS rule
```

### Pro Pattern 11: Contrast-Safe Colored Backgrounds

When placing text on semi-transparent colored backgrounds, start with opacity ≥ 0.25. Opacity 0.15 consistently failed contrast checks:

```typescript
// ❌ Low contrast — flagged at 2.54:1
el('🎯', { style: { background: 'rgba(16,185,129,0.15)' } });

// ✅ Adequate contrast
el('🎯', { style: { background: 'rgba(16,185,129,0.25)' } });
```

---

## 8. Sub-Agent Orchestration for Presentations

When building a presentation, use sub-agents extensively to preserve the orchestrator's context window.

### What the Orchestrator Does

- Holds the overall presentation plan (slide titles, content outlines)
- Dispatches tasks to sub-agents
- Reviews sub-agent results (summaries, not raw file contents)
- Makes design decisions and resolves conflicts

### What Sub-Agents Do

| Task | Sub-Agent Type |
|------|---------------|
| Read API docs, source files | `explore` |
| Write/edit slide code | `task` or `general-purpose` |
| Build with esbuild | `task` |
| Take browser screenshots | `general-purpose` (with MCP access) |
| Run linter in browser console | `general-purpose` (with MCP access) |
| Investigate visual bugs | `general-purpose` |
| Fix lint findings | `task` or `general-purpose` |

### Orchestration Workflow

```
1. Plan: Outline all slides (content, layout approach, elements per slide)
2. Build Phase 1: Sub-agent writes slides 1-5, builds, serves
3. Inspect Phase 1: Sub-agent takes screenshots + runs linter, reports findings
4. Fix Phase 1: Sub-agent fixes issues, rebuilds
5. Build Phase 2: Repeat for slides 6-10
6. ... continue in batches of ~5 slides
7. Deck Lint: Sub-agent runs lintDeck() for cross-slide consistency
8. Final Review: Sub-agent takes full screenshot set, reports visual issues
```

### Key Rules

- **Never read large files in the orchestrator.** Have sub-agents read and summarize.
- **Sub-agents should report findings concisely**: element IDs, numeric values, specific fixes applied.
- **One concern per sub-agent**: Don't ask a sub-agent to both write code AND lint AND fix. Break into separate tasks.

---

## 9. Visual Validation via MCP

### Taking Screenshots

Use Playwright MCP to take screenshots of each slide. Screenshots are the ground truth for visual issues.

### Programmatic Layout Inspection

```javascript
// Get resolved bounds for all elements on a slide
window.sk.layouts[slideIndex].elements
// Returns: { elementId: { resolved: { x, y, w, h }, ... } }

// Check for collisions
window.sk.layouts[slideIndex].collisions
// Returns: [{ elementA, elementB, overlapRect, overlapArea }]

// Check warnings
window.sk.layouts[slideIndex].warnings
```

### Debugging a Specific Element (Copy-Paste Recipe)

When the linter reports an issue on a specific element, use this to inspect it:

```javascript
// 1. Find the slide index by ID
const slideIdx = window.sk.slides.findIndex(s => s.id === 'my-slide');

// 2. Get the element's resolved bounds from the scene model
const resolved = window.sk.layouts[slideIdx].elements['my-element'].resolved;
console.log('Scene model bounds:', resolved); // { x, y, w, h }

// 3. Check the actual DOM element for overflow
const domEl = document.querySelector('[data-sk-id="my-element"]');
if (domEl) {
  console.log('DOM size:', domEl.clientWidth, domEl.clientHeight);
  console.log('Scroll size:', domEl.scrollWidth, domEl.scrollHeight);
  console.log('Overflow?', domEl.scrollHeight > domEl.clientHeight
                        || domEl.scrollWidth > domEl.clientWidth);
  console.log('Computed font-size:', getComputedStyle(domEl).fontSize);
}
```

This closes the loop between "linter says overflow" and "here's the actual measured overflow."

### Browser Rendering Consistency Note

Playwright (headless Chromium) and the user's browser may produce slightly different renders. Always work from Playwright screenshots when iterating with an AI agent — both parties must look at the same render.

---

## 10. Common Design Patterns

### Title Slide
- Large centered text (`anchor: 'tc'`, `fontSize: 72-96px`)
- Subtitle below with generous gap
- Decorative elements on `layer: 'bg'`
- Sparse by design — `content-clustering` warnings are expected and correct

### Content Slide (Two-Column)
```typescript
const { left, right } = splitRect(safe, 0.5, 40);
// Left column: text/bullets
el(content, { x: left.x, y: left.y, w: left.w });
// Right column: diagram/image
el(diagram, { x: right.x, y: right.y, w: right.w });
```

### Card Grid
```typescript
// Lint-friendly: explicit positions instead of cardGrid()
const cols = 3, gap = 20;
const cardW = (safe.w - gap * (cols - 1)) / cols;
cards.forEach((card, i) => {
  const col = i % cols;
  const row = Math.floor(i / cols);
  panel(card.children, {
    x: safe.x + col * (cardW + gap),
    y: titleBottom + row * (cardH + gap),
    w: cardW,
  });
});
```

### Connector Diagrams
```typescript
// Use corner anchors for curved connectors
connect('source', 'target', {
  type: 'curved',
  fromAnchor: 'tr',
  toAnchor: 'tl',
  stroke: '#00d4ff',
  strokeWidth: 2,
});
```

---

## 11. Quick Reference: What to Check

### Before Committing Any Slide

- [ ] `text-overflow`: Is all text visible? Check `scrollHeight > clientHeight`
- [ ] `canvas-overflow`: Are all elements within 1920×1080?
- [ ] Safe zone: Content-layer elements within 120-1800 (x), 90-990 (y)?
- [ ] No unintended overlaps between sibling content elements
- [ ] Gaps ≥ 8px between text elements
- [ ] Contrast ratio ≥ 4.5:1 for body text on backgrounds
- [ ] `textAlign` matches positioning direction (`leftOf` → `right`, `rightOf` → `left`)
- [ ] CSS properties in `style: {}`, not at top level
- [ ] Elements that move together are wrapped in `group()`
- [ ] `dash` on connectors is an array, not a string
- [ ] `placeBetween` elements actually fit in the gap

### Before Committing the Deck

- [ ] Run `lintDeck()` for cross-slide consistency
- [ ] Title positions consistent across content slides (hero slides may differ)
- [ ] Font count reasonable (≤ 4 font families)
- [ ] Heading sizes consistent within slide types

## 12. Generating PDFs with Decktape

Use [decktape](https://github.com/astefanutti/decktape) to export finished presentations to PDF. This is useful for sharing, archiving, and visual review.

### Setup

```bash
npm install -g decktape    # or use npx
```

### Usage

Start a local server (ES modules require one), then run decktape:

```bash
# Start server from repo root
python3 -m http.server 8765

# Generate PDF (in another terminal)
npx decktape reveal --size 1920x1080 --pause 3000 --load-pause 5000 \
  http://127.0.0.1:8765/examples/my-deck/index.html \
  examples/my-deck/my-deck.pdf
```

### Key Options

| Option | Value | Why |
|--------|-------|-----|
| `--size` | `1920x1080` | Match the SlideKit canvas dimensions |
| `--pause` | `3000` | Give each slide time to render (async layout + font loading) |
| `--load-pause` | `5000` | Wait for initial page load before starting export |
| Plugin | `reveal` | Use the Reveal.js-specific plugin for proper slide navigation |

> ✅ **Pattern:** Generate the PDF as the final step after all linting and visual validation passes. Place the PDF alongside the presentation's `index.html` in the same directory.

> ⚠️ **Anti-pattern:** Don't use `--pause` values below 2000ms — SlideKit's async text measurement and font loading need time. Slides may render incomplete with shorter pauses.

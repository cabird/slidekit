# SlideKit API v2 — Design Document

> **Current as of:** `cb951cf` (2026-03-02)

> Based on analysis of 13 visual issues found across a 17-slide replication deck,
> with input from GPT-5.2 and Gemini 3 Pro.

## Problem Statement

Replicating a 17-slide academic presentation exposed recurring visual issues:
unequal card heights (3 issues), tight/unbalanced spacing (3), content overflow
in panels (3), misalignment (2), and image containment/color problems (2).

Most of these stem from three root causes:

1. **Pixel-pushing** — gaps are hardcoded numbers with no design system rhythm
2. **Opaque compound elements** — the scene model can't see inside panels/groups
3. **Missing layout intent** — no way to express "equal height", "balanced spacing",
   or "split layout" directly; authors approximate with manual coordinates

This document proposes changes to the SlideKit API, scene model, and documentation
to widen the "pit of success" — making it hard to create these issues rather than
detecting them after the fact.

---

## Design Principles

1. **Prevention over detection.** Prefer API changes that make the bad state
   unrepresentable. Detection is the fallback for what can't be prevented.
2. **Explicit over magic.** No hidden heuristics (e.g., auto-computing gaps from
   font sizes). Use named tokens and explicit intent primitives.
3. **Composable, not monolithic.** New helpers return rects/positions that feed
   into existing primitives, rather than being all-in-one widgets.
4. **LLM-friendly.** An AI agent authoring slides should fall into correct patterns
   by default. Fewer decisions = fewer mistakes.

---

## Priority 0 — Ship First

### P0.1: `hstack({ align: 'stretch' })` ✅ IMPLEMENTED

**Prevents:** Issues 3, 5, 13 (23% of all issues)

Add `'stretch'` to the `align` enum on `hstack`. When active, after measuring
all children, set every child's `h` to `Math.max(...childHeights)`. Panel
backgrounds grow; content stays top-aligned within each child.

```js
// Before: cards have ragged bottom edges
hstack([panel(...), panel(...), panel(...)], { align: 'top' });

// After: all cards same height
hstack([panel(...), panel(...), panel(...)], { align: 'stretch' });
```

**Design decisions:**
- If a child has an explicit authored `h`, `stretch` overrides it and emits a
  warning: "Child 'card-3' has authored h=200 but stretch requires h=268."
- `vstack` gets the analogous `align: 'stretch'` for width equalization.

**Cost:** 1 new enum value per stack type. ~50 lines of implementation.

---

### P0.2: Post-Render DOM Overflow Detection ✅ IMPLEMENTED

**Detects:** Issues 4, 6, 8 (the browser-dependent issues)

After `render()` completes, query every element's DOM node:

```js
const dom = document.querySelector(`[data-sk-id="${id}"]`);
if (dom.scrollHeight > dom.clientHeight + 1) {
  warnings.push({
    type: 'dom_overflow_y',
    elementId: id,
    clientHeight: dom.clientHeight,
    scrollHeight: dom.scrollHeight,
    overflow: dom.scrollHeight - dom.clientHeight,
  });
}
```

This catches the cases where `measure()` (off-screen) and the actual browser
render diverge — font metric differences, line wrapping variations, etc.

**Design decisions:**
- Run automatically in dev/lint mode; skip in production for performance.
- Tolerance of 1px to avoid subpixel false positives.
- Report on the scene model as `warnings` with type `dom_overflow_y`/`dom_overflow_x`.

**Cost:** ~30 lines. Requires `data-sk-id` attributes on rendered DOM wrappers
(check if already present).

---

### P0.3: Layer-Aware Warning Severity ✅ IMPLEMENTED

Keep `strict: false` as the default. Strict mode makes safe zone violations
errors, which blocks intentional design choices like background bleeds, glow
effects (`s1-glow` at `y: -150`), and edge-to-edge images.

Instead, improve warning quality by making them **layer-aware**:

- **`bg` layer elements:** Safe zone violations are silenced (backgrounds are
  expected to extend to edges or beyond).
- **`content` layer elements:** Safe zone violations remain warnings with
  actionable suggestions: "s14-emoji-left is 80px outside safe zone left edge.
  If intentional, move to layer: 'bg'."
- **`overlay` layer elements:** Same as content — warn but don't block.

This gives both humans and LLM agents a signal to evaluate without stopping
work. The agent sees the warning, checks if the element is decorative (move
to bg layer) or content (fix position), and moves on.

**Rationale:** Intentional safe zone violations are common in real decks.
Warnings preserve workflow; errors create friction. The better path is smarter
warnings, not stricter enforcement.

---

## Priority 1 — Core Infrastructure

### P1.1: Semantic Spacing Tokens ✅ IMPLEMENTED

**Prevents:** Issues 1, 7, 12 (23% of all issues)

Add a spacing scale to `init()` configuration:

```js
await init({
  // ...existing config...
  spacing: {
    xs: 8,
    sm: 16,
    md: 24,
    lg: 32,
    xl: 48,
    section: 80,
  },
});
```

All gap-accepting APIs accept token strings in addition to pixel numbers:

```js
below('title', { gap: 'lg' })          // 32px
hstack([...], { gap: 'md' })           // 24px
panel([...], { padding: 'lg', gap: 'sm' })  // padding: 32, gap: 16
vstack([...], { gap: 'xl' })           // 48px
```

**Why not `gap: 'auto'`:** Both external reviewers strongly recommended against
auto-computing gaps from font sizes. "Auto is magic. Magic is hard to debug. If
a user changes a font size slightly and the gap jumps unexpectedly, they will
hate the library." Tokens are deterministic, consistent, and tunable globally.

**Design decisions:**
- Pixel values still accepted (backward compatible).
- Token resolution happens at the start of Phase 1 (simple string→number lookup).
- Invalid token names produce an error with available tokens listed.
- Default scale provided if user doesn't configure one.
- `getSpacing(token)` exported for use in manual calculations.

**Cost:** Token resolution layer (~40 lines) + updating all gap/padding/spacing
parameter handling to accept strings.

---

### P1.2: Hierarchical Scene Model ✅ IMPLEMENTED

**Enables detection of:** Issues 4, 6, 8 (overflow inside compounds)

Currently the scene model is a flat `{ [id]: SceneElement }` map. Elements
inside panels/groups/stacks have their absolute positions, but parent-child
relationships are lost.

**Proposed additions to SceneElement:**

```js
{
  id: 'card-1',
  type: 'group',           // or 'panel', 'vstack', 'hstack'
  resolved: { x: 100, y: 200, w: 340, h: 268 },  // absolute (global)
  localResolved: { x: 0, y: 0, w: 340, h: 268 },  // relative to parent
  parentId: 's16-cards',   // null for root elements
  children: ['s16-icon1', 's16-title1', 's16-desc1'],  // ordered
  // ...existing authored, provenance fields...
}
```

**Plus top-level additions:**

```js
{
  elements: { ... },       // existing flat map (kept for ergonomic lookups)
  rootIds: ['s16-eyebrow', 's16-headline', 's16-cards'],  // slide-level roots
  // ...existing collisions, warnings, errors...
}
```

**How much work:**

Both reviewers assessed this as **low-to-medium complexity** given that the
layout pipeline already tracks parent-child relationships internally during
phases 1-2. The main work is:

1. Recording `parentId` and `children[]` during layout resolution (~20 lines)
2. Ensuring `resolved` coordinates are always absolute (walking up the parent
   chain to accumulate offsets) — needed for cross-branch linting
3. Exporting `localResolved` alongside `resolved` for debugging

**Gotchas to watch:**

- **Transform propagation:** If a Phase 3 transform (e.g., `alignTop`) targets
  a group/panel, must propagate the position delta to all descendants. Define
  this explicitly: transforms on containers shift all children.
- **Panel internals:** `panel()` creates a group containing a background `el('')`
  and a `vstack`. These internal nodes must be exported too, or linting inside
  panels won't work. Mark them with a flag like `_internal: true` so linters
  can distinguish authored from synthetic elements.
- **Coordinate spaces:** Linters want global coordinates (for cross-branch
  collision checks). Layout engines work in local coordinates. Export both.

**What this enables:**
- Child-outside-parent-bounds detection
- Sibling overlap detection inside panels/stacks
- Content-height vs container-height mismatch warnings
- "Panel child sum + gaps + padding != panel height" checks

**Cost:** ~100-200 lines of changes across layout pipeline + finalize phase.
Estimated 1-3 days of implementation.

---

## Priority 2 — Layout Intent Primitives

### P2.1: `columns()` — Split Layout Helper ✅ IMPLEMENTED (as `splitRect()`)

**Prevents:** Manual column geometry calculation (10 of 17 slides used this pattern)

The most common slide layout is "left text column + right image/content column."
Currently this requires manual x/y/w arithmetic for every slide.

**Option A: `splitRect()` — Returns two rects (GPT-5.2's recommendation)**

```js
import { splitRect, safeRect, vstack, el } from './slidekit.js';

const { left, right } = splitRect(safeRect(), { ratio: 0.55, gap: 'xl' });

// Use rects with existing primitives
vstack([eyebrow, headline, body], { x: left.x, y: left.y, w: left.w, gap: 'md' });
el('<img ...>', { x: right.x, y: right.y, w: right.w, h: right.h });
```

**Option B: `columns()` — Declarative compound (Gemini 3 Pro's recommendation)**

```js
import { columns, vstack, el } from './slidekit.js';

columns([
  { width: '55%', content: vstack([eyebrow, headline, body], { gap: 'md' }) },
  { width: '45%', content: el('<img ...>') },
], { gap: 'xl' });
```

**Recommendation:** Start with **Option A (`splitRect`)**. It's composable —
returns data that feeds into existing primitives. Option B can be built on top
later if the pattern proves common enough to warrant it.

```js
function splitRect(rect, { ratio = 0.5, gap = 0 } = {}) {
  const gapPx = resolveSpacing(gap);
  const leftW = Math.round((rect.w - gapPx) * ratio);
  const rightW = rect.w - gapPx - leftW;
  return {
    left:  { x: rect.x, y: rect.y, w: leftW, h: rect.h },
    right: { x: rect.x + leftW + gapPx, y: rect.y, w: rightW, h: rect.h },
  };
}
```

**Cost:** ~15 lines. Very high value-to-cost ratio.

---

### P2.2: `placeBetween()` — Balanced Positioning ✅ IMPLEMENTED

**Prevents:** Issue 12 (caption hugs container, empty space below)

A positioning helper that places an element at an optical balance point between
two vertical references.

```js
import { placeBetween, safeRect } from './slidekit.js';

el('<p>Caption text</p>', {
  id: 's15-caption',
  x: 960,
  y: placeBetween('s15-fig-bg', safeRect().y + safeRect().h, { bias: 0.35 }),
  w: 1400,
  anchor: 'tc',
});
```

**How it works:**

```js
function placeBetween(topRef, bottomYOrRef, { bias = 0.35 } = {}) {
  // Returns a _rel marker resolved during Phase 2:
  // topEdge = resolved bottom of topRef
  // bottomEdge = bottomY (number) or resolved top of bottomRef
  // availableSlack = bottomEdge - topEdge - elementHeight
  // y = topEdge + availableSlack * bias
}
```

**Pros (why we chose this over alternatives):**

- **Explicit intent.** The author says "place between A and B with 35% bias."
  No magic formulas based on font sizes.
- **Generalizable.** Works for any vertical (or horizontal) balancing situation,
  not just caption-under-figure.
- **Debuggable.** Provenance records: `source: "between", topRef, bottomRef, bias`.
- **Non-local, but intentionally so.** The author is making a layout decision
  about global balance, which is inherently non-local.

**Cons / risks:**

- New primitive to learn. But the use case is clear and the mental model is
  simple: "put this between A and B, biased toward the top."
- If the available slack is negative (element doesn't fit), behavior must be
  defined: fall back to `topEdge + minGap` and emit a warning.
- Only needed for ~1-2 elements per deck. Low frequency, but high impact when
  needed.

**Why not the alternatives:**

| Alternative | Problem |
|---|---|
| `gap: 'balanced'` inside `below()` | Overloads `below()` with global awareness; makes it non-local and harder to reason about in dependency chains |
| Just use `spacing.xl` | Doesn't solve the problem generally — if content or safe zone changes, imbalance returns |
| `spacer({ grow: 1 })` in vstack | Requires restructuring the slide as a vstack column, which doesn't fit all layouts (e.g., centered diagrams) |

**Cost:** ~40 lines (new `_rel` type + resolver). Medium value — low frequency
but eliminates a class of "slide looks top-heavy" issues.

---

### P2.3: `figure()` — Image + Caption Compound ✅ IMPLEMENTED

**Prevents:** Issues 7, 10, 12 (partially)

Encapsulates the recurring pattern: background container + image + caption with
proper spacing.

```js
import { figure } from './slidekit.js';

figure({
  id: 's15-figure',
  src: 'assets/images/chart.png',
  x: 960, y: below('s15-headline', { gap: 'lg' }),
  w: 1100,
  anchor: 'tc',
  containerFill: '#f8f9fa',
  containerRadius: 10,
  containerPadding: 10,
  caption: `<p style="...">Caption text here</p>`,
  captionGap: 'lg',
});
```

**v1 scope (geometry only):**
- Background container with fill/radius/padding
- Image element with proper inset from container
- Caption positioned below container with configurable gap
- Auto-computes container height from image height + padding

**v2 scope (future — not in this round):**
- `containerFill: 'auto'` — samples image corner pixel to match background
- Export `naturalWidth`/`naturalHeight` for `<img>` elements in scene model
- Compute `object-fit: contain` content rect for containment linting

**Cost:** ~80 lines. Eliminates 3-element manual setup for every diagram slide.

---

### P2.4: Panel Default to Content-Driven Height ✅ IMPLEMENTED

**Prevents:** Issues 4, 6, 8 (content overflow in panels)

**Current behavior:** Panels auto-compute height from children when `h` is
omitted. When `h` is explicitly set, it's a hard constraint with no overflow
check.

**Proposed behavior:**
- `h` omitted (default): panel sizes to fit content. Same as today. This is
  the "hug" behavior — content-driven sizing during the layout phase.
- `h` explicitly set: hard constraint, but the scene model compares computed
  content height against authored height and emits a warning if content exceeds
  the container:
  ```
  warning: dom_overflow_y on 's7-card-identity'
    contentHeight: 104px, authoredHeight: 83px, overflow: 21px
    suggestion: remove explicit h to let panel size to content
  ```

**Why not post-render auto-grow (`overflow: 'grow'`):**

Both reviewers advised against this:
- Introduces multi-pass rendering with potential non-termination (cascading growth)
- Layout becomes non-deterministic — the authored spec no longer predicts output
- Performance cost of re-render for any slide that triggers growth
- If `measure()` is accurate (which it mostly is), content-driven sizing in the
  layout phase handles 95% of cases

The remaining 5% (browser rendering differences) is caught by P0.2's DOM
overflow detection, which warns but doesn't auto-mutate layout.

**If we later want auto-grow:** Make it opt-in and bounded:
`panel({ overflow: 'grow', maxGrow: 100, maxPasses: 1 })`.

**Cost:** ~20 lines (comparison logic in finalize phase).

---

### P2.5: `group({ bounds: 'hug' })` — Auto-Sizing Groups ✅ IMPLEMENTED

**Prevents:** Issue 9 (assembly not centered because group has no computed bounds)

Currently, groups don't compute their own bounding box from children. If you
position a group with `anchor: 'tc'` at `x: 960`, the anchor resolves against
the group's authored `w`/`h`, which may not match the actual extent of children.

**Proposed:** `bounds: 'hug'` computes group `w` and `h` from the bounding box
of all children after they're positioned.

```js
// Before: manually compute bar+emoji assembly width and position
el(emoji, { x: 200, ... });
el(bar, { x: 252, ... });
el(emoji, { x: 1324, ... });
// Assembly is off-center because x=200..1364 ≠ centered at 960

// After: group auto-sizes and centers
group([
  el(emoji, { x: 0, ... }),
  el(bar, { x: 52, ... }),
  el(emoji, { x: 1124, ... }),
], { x: 960, anchor: 'tc', bounds: 'hug' });
// Group width computed from children → anchor resolves correctly
```

**Cost:** ~30 lines (bounding box computation after children resolve).

---

## Priority 3 — Documentation & Ergonomics

### P3.1: `grid()` — Card Grid Helper ✅ IMPLEMENTED (as `cardGrid()`)

A convenience wrapper around `vstack([hstack(...), hstack(...)])` for laying
out items in a grid pattern. Different from the existing column-based `grid()`
system (which provides cross-slide alignment); this arranges actual children.

```js
import { cardGrid } from './slidekit.js';  // name TBD to avoid conflict

cardGrid([panel1, panel2, panel3, panel4], {
  id: 'my-grid',
  cols: 2,
  gap: 'md',
  x: 920, y: 220,
});
// Equivalent to:
// vstack([
//   hstack([panel1, panel2], { gap: 'md', align: 'stretch' }),
//   hstack([panel3, panel4], { gap: 'md', align: 'stretch' }),
// ], { gap: 'md', x: 920, y: 220 });
```

**Note:** `align: 'stretch'` is applied by default within each row, and row
heights are equalized across the grid.

**Cost:** ~30 lines. Sugar over existing primitives.

---

### P3.2: vstack-First Documentation Pattern ✅ IMPLEMENTED

**Not a code change — a documentation change.**

The replication deck uses chained `below()` calls for every text column:

```js
// Current pattern (10+ slides):
el(eyebrow, { x: 120, y: 310, w: 880 });
el(headline, { x: 120, y: below('s2-eyebrow', { gap: 'md' }), w: 880 });
el(subhead,  { x: 120, y: below('s2-headline', { gap: 'lg' }), w: 880 });
el(body,     { x: 120, y: below('s2-subhead', { gap: 'sm' }), w: 880 });
```

This requires repeating x/w on every element and threading IDs through `below()`
chains. If you reorder elements, you must update references.

**Recommended pattern (in docs and examples):**

```js
vstack([
  el(eyebrow, { w: 880 }),
  el(headline, { w: 880 }),
  el(subhead, { w: 880 }),
  el(body, { w: 880 }),
], { x: 120, y: 310, gap: 'md' });
```

Benefits:
- x and starting y declared once
- Gap is uniform and token-based (can use per-element gap overrides if needed)
- Reordering is drag-and-drop (no ID references to update)
- Width can be inherited from vstack: `vstack([...], { w: 880 })` + children
  use `w: 'fill'`

**This is a documentation/example change, not an API change.** The capability
already exists. We just need to promote it as the primary pattern for text
columns and stop using chained `below()` in examples.

---

## Scene Model Enhancements Summary

These additions to the scene model enable automated linting:

| Enhancement | What it enables | Priority |
|---|---|---|
| `parentId` + `children[]` on all elements | Linting inside panels/groups | P1 |
| `rootIds` on layout result | Traversal without scanning | P1 |
| `localResolved` alongside `resolved` | Debugging coordinate spaces | P1 |
| DOM overflow telemetry (`scrollHeight` vs `clientHeight`) | Catching browser rendering differences | P0 |
| Gap provenance (`gapAuthored`, `gapResolved`, `gapToken`) | Explaining spacing decisions | P2 |
| Ragged-bottom detection on hstacks | Suggesting `align: 'stretch'` | P2 |
| Alignment consistency heuristics | Catching off-center assemblies | P3 |

---

## Not Doing

### `chip()` / `flowRow()` primitives
These are styling concerns, not layout. A chip is just a styled `el()`. The
inline-HTML pattern works; the issue (#2, optical centering) is a CSS nuance
that a primitive can't reliably solve better than the author.

### `centerH()` helper
Low value. `anchor: 'tc', x: 960` is explicit and clear. If anything, `x: '50%'`
already works via `resolvePercentage()`.

### Gradient text helper
Pure CSS sugar, not a layout concern. Belongs in user-land theme helpers or
examples, not core SlideKit. Adding it would set a precedent for wrapping every
CSS pattern, expanding API surface without layout benefit.

### `gap: 'auto'` (font-size-based gap computation)
Both external reviewers strongly rejected this. "Magic numbers based on font
sizes are hard to debug and create unpredictable behavior when content changes."
Semantic spacing tokens solve the same problem deterministically.

---

## Implementation Roadmap

### Phase 1: Foundations (P0 + P1) ✅ COMPLETE
1. ✅ `hstack/vstack align: 'stretch'`
2. ✅ DOM overflow detection in render pipeline
3. ✅ Layer-aware warning severity
4. ✅ Spacing token system in `init()`
5. ✅ Hierarchical scene model export

### Phase 2: Layout Intent (P2) ✅ COMPLETE
6. ✅ `splitRect()` helper
7. ✅ `placeBetween()` positioning
8. ✅ `figure()` v1 (geometry only)
9. ✅ Panel overflow warnings
10. ✅ `group({ bounds: 'hug' })`

### Phase 3: Polish (P3) ✅ COMPLETE
11. ✅ `cardGrid()` helper
12. ✅ Update docs/examples to vstack-first pattern
13. ✅ Alignment consistency heuristics in scene model

### Phase 4: Future (not scoped)
- `figure()` v2: image intrinsic dimensions, color sampling
- `panel({ overflow: 'grow' })` opt-in with caps
- Per-element gap overrides in stacks
- `columns()` declarative compound (built on `splitRect`)

---

## Issues Addressed

| Issue | Description | Prevention | Detection |
|---|---|---|---|
| 1 | Subtitle too close to authors | Spacing tokens | Gap analysis |
| 2 | Flow labels not vertically centered | — (CSS concern) | Visual only |
| 3 | Stat cards unequal height | `align: 'stretch'` | Ragged-bottom check |
| 4 | Panel content overflow | Panel default hug + warning | DOM overflow |
| 5 | Cluster cards unequal height | `align: 'stretch'` | Ragged-bottom check |
| 6 | Panel internal text overlap | Panel default hug + warning | Hierarchical model + DOM overflow |
| 7 | Caption too close to chart | Spacing tokens / `figure()` | Gap analysis |
| 8 | Bullet list overflow risk | Panel default hug + warning | DOM overflow |
| 9 | Spectrum bar off-center | `group({ bounds: 'hug' })` | Alignment consistency |
| 10 | Chart spills past container | `figure()` | Image metadata (v2) |
| 11 | Chart/container color mismatch | `figure()` v2 | Pixel sampling (v2) |
| 12 | Caption unbalanced spacing | `placeBetween()` / tokens | Trailing whitespace check |
| 13 | Principle cards unequal height | `align: 'stretch'` | Ragged-bottom check |

**Coverage:** 11 of 13 issues prevented or detectable after Phase 2.
Issues 2 and 11 require visual/pixel analysis (Phase 4).

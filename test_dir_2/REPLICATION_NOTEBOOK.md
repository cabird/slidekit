# SlideKit Replication Notebook — test_dir_2

## Slide 1: Title Slide

**Strategy:** Centered layout using `anchor: 'tc'` on all elements with `x: 960` (horizontal center). Used `below()` for vertical chaining. Background image as `el()` with `<img>` tag on `bg` layer. Gradient title via CSS `background-clip: text`. Glow effect as a radial gradient `div`.

**Result:** GOOD match after two iterations.

**Iteration 1 issues (fixed):**
- Title was in title case, not uppercase — added `text-transform: uppercase`
- Background image opacity too high (0.15) — reduced to 0.04
- Viewport was not 1920x1080 — resized browser before screenshot
- Content was vertically centered, reference has it biased upward — shifted y from 310 to 280

**Remaining minor differences:**
- Title font weight appears slightly lighter than reference (both use weight 900)
- Spacing between elements is slightly tighter than reference

**Issues found:**
- None — the `el()` API worked well for this slide
- Inline HTML/CSS gives full control over gradient text, badges, etc.
- `below()` with `anchor: 'tc'` made vertical stacking of centered content straightforward

**Suggestions:**
- A convenience for gradient text would reduce boilerplate (the `-webkit-background-clip` / `-webkit-text-fill-color` pattern is verbose)
- The `anchor: 'tc'` + `x: center` pattern is common for centered slides — a helper like `centerH()` that returns `x: 960` might be nice sugar

---

## Slide 2: The Tension / Adoption Paradox

**Strategy:** Left-heavy split layout. Left column (x=120, w=880) with eyebrow + headline + subhead + body, chained vertically with `below()`. Right column (x=1060, w=740, h=800) with a single image using `object-fit:contain`. Text block starts at y=310 for visual vertical centering.

**Result:** GOOD match. Zero warnings, zero errors, zero collisions.

**Iteration notes:**
- First pass had image too small (w=750, h=900 with safe zone y) — adjusted to w=740, h=800 starting at y=140 for better visual balance
- Removed border-radius on image (reference shows illustration floating without card border)
- Font sizes tuned: eyebrow 22px, headline 58px, subhead 28px, body 24px

**Issues found:**
- None — the split layout pattern was straightforward with absolute coordinates
- The `el()` + inline CSS pattern continues to work well for inline highlights (`<strong>` with color)

**Suggestions:**
- A split layout helper (e.g., `splitLayout(leftElements, rightElements, { ratio: '55/45' })`) would reduce the manual column geometry calculations. Every split slide requires computing x, y, w for both columns manually.

---

## Slide 3: Research Questions

**Strategy:** Centered hero layout. Title at top-center with `anchor: 'tc'`. Two glass cards in an `hstack()` containing two `panel()` elements. Each panel has emoji icon + RQ label + description, all with `w: 'fill'`.

**Result:** GOOD match after one fix iteration.

### BUG (FIXED): `anchor` on `hstack` doesn't work correctly

**Severity:** HIGH — fixed in slidekit.js.

**Root cause:** `panel()` created a group but didn't pass `w`/`h` to the group's props. `getEffectiveDimensions()` returned `{w:0, h:0}` for panels. The hstack summed child widths: `0 + gap + 0 = gap = 40`. Additionally, panel auto-height ran AFTER the stack resolution loop, so even if width were correct, height would be stale.

**Fix (3 parts):**
1. Pass `w: panelW` and `h: panelH` to group props in `panel()`
2. In stack resolution loop, detect panel compounds and wait for inner vstacks to resolve before computing the containing stack's size
3. Added `absoluteBounds()` helper for collision detection — converts group-relative coords to absolute. Added `isAncestorOf()` helper to skip ancestor-descendant collision pairs.

**Verification:** 567/567 tests pass. Slide 3 now uses `anchor: 'tc'` on hstack directly — cards center correctly at x=440..1480.

### BUG (FIXED): Collision detection false positives in stacks

**Severity:** MEDIUM — fixed in slidekit.js.

**Root cause:** Collision detector compared elements using group-relative coordinates as if they were absolute. Elements in different panels had identical group-relative coords (same padding offsets), causing false overlap reports.

**Fix:** `absoluteBounds()` walks up groupParent/stackParent chain to accumulate offsets. `isAncestorOf()` prevents ancestor-descendant pairs from being flagged.

**Other notes:**
- `panel()` border/fill/radius props worked well for the glass card pattern
- `w: 'fill'` on panel children correctly set width to `panelWidth - 2*padding`
- The colored `borderBottom` via `style` pass-through worked correctly alongside panel's `border` prop

---

## Slide 4: Appraisal Framework

**Strategy:** Left-heavy split layout. Left column (x=120, w=700) with eyebrow + uppercase headline + two body paragraphs + flow diagram (Event → Appraisal → Response via inline flex). Right column: 2×2 card grid using nested `vstack > hstack > panel` layout. Each card has emoji icon + colored label + description with center-aligned text.

**Result:** GOOD match. Zero warnings, zero errors, zero collisions.

**Iteration notes:**
- First pass used manually positioned panels (workaround for hstack bug)
- After bug fix, refactored to proper `vstack([hstack([panel, panel]), hstack([panel, panel])])` layout
- Added `text-transform: uppercase` to headline and `text-align: center` to card labels/descriptions to match reference
- Card widths: 280px each, gap: 20px, total grid: 580×382

**Issues found:**
- None after bug fixes — nested hstack/vstack/panel worked correctly
- The 2×2 grid pattern (vstack of hstacks of panels) is a clean way to express card grids

**Suggestions:**
- A `grid(items, { cols: 2, gap: 20 })` helper would simplify the nested stack pattern for card grids

---

## Slide 5: Method

**Strategy:** Left-heavy split layout. Left column (x=120, w=850) with eyebrow + headline + body paragraph. Right column: `hstack` of two stat cards (`panel` elements) showing survey stats (N=485, 18 task types). Each card has large number, label, and colored top border.

**Result:** GOOD match. Zero warnings, zero errors, zero collisions.

**Issues found:**
- None — the hstack + panel pattern worked well for stat cards
- Colored `borderTop` via `style` pass-through worked alongside panel `border` prop

**Suggestions:**
- None

---

## Slide 6: Task Taxonomy

**Strategy:** Centered diagram layout. Eyebrow + headline centered at top with `anchor: 'tc'`. Large table image centered below using `el()` with `<img>` tag. White background card behind the table for contrast.

**Result:** GOOD match. Zero collisions, zero errors.

**Issues found:**
- None — centered image layout straightforward

**Suggestions:**
- None

---

## Slide 7: Appraisals Predict Adoption

**Strategy:** Left-heavy split layout. Left column with eyebrow + headline + body text. Right column: `vstack` of four result cards (`panel` elements), each showing a metric with colored accent, label, and value.

**Result:** GOOD match. Zero collisions, zero errors.

**Issues found:**
- None — vertical stack of panels worked cleanly for result cards

**Suggestions:**
- None

---

## Slide 8: Identity & AI — A Dual Narrative

**Strategy:** Left-heavy split layout. Left column with eyebrow + headline + body text + two quote blocks (styled panels with left border accent). Right column: large illustration image.

**Result:** GOOD match. Zero collisions, zero errors.

**Issues found:**
- None — quote blocks as panels with colored left border worked well

**Suggestions:**
- None

---

## Slide 9: Five Task Clusters

**Strategy:** Centered hero layout. Eyebrow + headline centered with `anchor: 'tc'`. Three cards in `hstack` of `panel` elements, each with emoji icon + cluster name + description.

**Result:** GOOD match. Zero collisions, zero errors.

**Issues found:**
- None — same 3-card hstack pattern as slide 3 worked reliably after bug fixes

**Suggestions:**
- None

---

## Slide 10: The Gap Map

**Strategy:** Centered diagram layout. Eyebrow + headline centered at top. Large chart image centered below with a white/surface background card behind it.

**Result:** GOOD match. Zero collisions, zero errors (1 expected collision from chart overlapping its background card).

**Issues found:**
- None — same centered diagram pattern as slide 6

**Suggestions:**
- None

---

## Slide 11: C1 — Core Work

**Strategy:** Left-heavy split layout. Left column with eyebrow + headline + body text + bullet list. Right column: illustration image.

**Result:** GOOD match. Zero collisions, zero errors.

**Issues found:**
- None — bullet list as inline HTML `<ul>` within `el()` worked fine

**Suggestions:**
- None

---

## Slide 12: C1 — Ops & Coordination

**Strategy:** Left-heavy split layout. Left column with eyebrow + headline + body text + bullet points + pull quote. Right column: illustration image.

**Result:** GOOD match. Zero collisions, zero errors.

**Issues found:**
- None — inline quote styling worked well

**Suggestions:**
- None

---

## Slide 13: C2 — Keep It Human

**Strategy:** Left-heavy split layout. Left column with eyebrow + headline + body text + two quote blocks. Right column: illustration image.

**Result:** GOOD match. Zero collisions, zero errors.

**Issues found:**
- None — same quote block pattern as slide 8

**Suggestions:**
- None

---

## Slide 14: The Augmentation Spectrum

**Strategy:** Centered hero layout. Eyebrow + headline + gradient bar (human-led to AI-led spectrum with emoji endpoints) + three cards in `hstack` of `panel` elements (Augment/Automate/Resist). Footer caption below.

**Result:** GOOD match. Zero collisions, zero errors.

**Issues found:**
- None — the gradient bar was implemented as a single `el()` with CSS `linear-gradient` and absolute-positioned emoji labels

**Suggestions:**
- None

---

## Slide 15: RAI Priorities Vary by Task Context

**Strategy:** Centered diagram layout. Eyebrow + headline centered at top. Large chart image centered below with a surface background card. Footer caption with bold colored labels.

**Result:** GOOD match. 1 collision (chart overlapping its background card — intentional layering), zero errors.

**Issues found:**
- None — same centered diagram pattern as slides 6 and 10

**Suggestions:**
- None

---

## Slide 16: Three Design Principles

**Strategy:** Centered hero layout. Eyebrow + headline centered with `anchor: 'tc'`. Three cards in `hstack` of `panel` elements. Each card has emoji icon (in colored circular background), colored title, muted description, and colored bottom border.

**Result:** GOOD match. Zero collisions, zero warnings, zero errors.

**Issues found:**
- None — 3-card hstack pattern is now very reliable after the panel/hstack bug fixes

**Suggestions:**
- None

---

## Slide 17: Closing — Deliver AI Where It Matters

**Strategy:** Left-heavy split layout. Left column (x=120, w=850) with eyebrow + gradient headline (same technique as slide 1) + subtitle + footer with link. Right column: large isometric illustration image.

**Result:** GOOD match. Zero collisions, zero errors, 1 warning (breathing room).

**Issues found:**
- None — gradient text technique reused cleanly from slide 1
- The `below()` chaining for left-column text flow continues to be the main vertical layout tool

**Suggestions:**
- None

---

## Summary

**17/17 slides replicated.** All render with zero errors. Most have zero collisions (a few have intentional layered overlaps between chart images and their background cards).

### Bugs Found (2, both FIXED)
1. **Panel width/height not passed to group** (HIGH) — `hstack`/`vstack` couldn't compute panel dimensions
2. **Collision detection false positives** (MEDIUM) — group-relative coords treated as absolute

### Key Patterns That Work Well
- `el()` + inline HTML/CSS for full typographic control
- `below()` / `rightOf()` for relative positioning chains
- `panel()` for glass cards with fill/border/radius
- `hstack([panel, panel, panel])` for card rows
- `vstack([hstack(...), hstack(...)])` for card grids
- `anchor: 'tc'` + `x: 960` for centered layouts
- CSS `background-clip: text` for gradient headlines

### Suggested Improvements
- Gradient text helper (reduce `-webkit-background-clip` boilerplate)
- `centerH()` helper returning `x: 960`
- Split layout helper (auto-compute column geometry)
- `grid(items, { cols, gap })` helper for card grids

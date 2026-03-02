# SlideKit Linter Logbook — Surprising Findings

> Generated while linting `slidekit_about_linted.ts` (16-slide presentation about SlideKit)
> Date: 2026-03-01

---

## 1. `non-ancestor-overlap` overwhelms everything (884 errors)

**What I investigated:** Ran `lintSlide()` on all 16 slides. The total error count was 1039 errors, but 884 of them (85%) were `non-ancestor-overlap`.

**What was surprising:** Almost none of these are real issues. The main causes:
- **Connectors** inherently overlap the boxes they connect — that's the whole point. Every `connect()` generates overlap errors with its endpoints.
- **Background-layer decorative elements** (radial gradient glows, full-bleed rects on `layer:'bg'`) overlap every content-layer element above them. These are intentional by design.
- **Group children** that are spatially near other groups' children get flagged as overlapping even though they're in separate visual contexts.

**What would be more helpful:**
- **Exempt connectors** from `non-ancestor-overlap` entirely. Connectors are *defined* by touching other elements.
- **Exempt cross-layer overlaps.** A `layer:'bg'` element overlapping a `layer:'content'` element is never a bug — that's what layers are for. Only flag overlaps within the same layer.
- **Consider adding an `intentionalOverlap` or `allowOverlap` property** on elements, so decorative overlays can be excluded without suppressing the rule globally.
- At minimum, the linter output should **group overlaps by category** (connector, cross-layer, same-layer-sibling) so the agent can quickly skip the irrelevant ones.

---

## 2. `empty-text` flags every decorative element (146 warnings)

**What I investigated:** 146 `empty-text` warnings across the deck.

**What was surprising:** These are all intentional. SlideKit's `el()` is used for:
- Accent rules (thin colored lines): `el('', { w: 80, h: 3, style: { background: '...' } })`
- Decorative rectangles (rotated shapes, colored bands)
- Background gradient overlays
- Divider lines in panels

None of these are "empty text" bugs — they're visual elements that happen to have no text content.

**What would be more helpful:**
- **Don't flag `el()` elements with explicit `background` or `backgroundColor` in their style as empty-text.** If the element has visual styling, it's clearly intentional.
- Alternatively, **only flag elements that appear to be text containers** (have `font-size` or text-related CSS, or are inside a vstack with text siblings) but are empty.
- A simple heuristic: if `h <= 8` or the element has `background`/`backgroundColor`/`backgroundImage` in its style, it's a rule/shape, not empty text.

---

## 3. `child-overflow` reports are confusing for groups and stacks (155 errors)

**What I investigated:** 155 `child-overflow` errors. All had `parentId: undefined` ("unknown" parent). Overshoots ranged from 40px to 1840px.

**What was surprising:**
- The `parentId` field is always `undefined`, making it impossible to know which parent is being violated without cross-referencing the scene graph.
- The overshoots are enormous (1000px+) because **group children use coordinates relative to the group origin**, but the linter seems to be comparing them against the group's declared bounds in canvas space. For example, a group at `x:960` with a child at `x:58` (group-relative) — the linter may think the child is at canvas `x:58`, which is 902px to the left of the group.
- `bounds: 'hug'` groups auto-compute their dimensions from children, yet still trigger child-overflow. This seems contradictory — if the group hugs its children, no child should overflow by definition.

**What would be more helpful:**
- **Always populate `parentId`** in the finding. Without it, the finding is nearly useless for automated fixing.
- **For `bounds: 'hug'` groups, suppress child-overflow entirely** — the group size is derived from children, so overflow is a contradiction.
- **Show both group-relative and canvas-absolute coordinates** in the finding, so the agent can tell if the child is positioned correctly in group space vs. canvas space.
- **Reconsider whether child-overflow applies to stack children.** Stacks (vstack/hstack) position their children automatically. If a stack child overflows the stack, that's a stack sizing issue, not a child positioning issue. The message should say "stack content exceeds stack bounds" not "child overflows parent."

---

## 4. `text-overflow` and Reveal.js font-size interaction

**What I investigated:** Coordinate label elements (`s3-coord-tl`, `s3-coord-br`) declared with `font-size:14px` and `h:28` were flagged as text-overflow. I checked the DOM.

**What was surprising:** `window.getComputedStyle(el).fontSize` returned `42px`, not `14px`. Reveal.js sets a base font-size of ~42px on its container, and the inline `font-size:14px` on a `<span>` was being overridden or not cascading as expected through the SlideKit baseline CSS.

This means:
- The element's `clientHeight` was 30px but `scrollHeight` was 50px — the text rendered at 42px needed ~50px of height.
- Setting `h:28` or even `h:30` was never going to work because the actual rendered font size was 3x the declared size.
- I had to set `h:54` to accommodate the 42px effective font size.

**What would be more helpful:**
- **The linter's `text-overflow` finding should include the computed font-size** in its detail object. This would immediately reveal the Reveal.js scaling issue: `{ declaredFontSize: '14px', computedFontSize: '42px', scrollHeight: 50, clientHeight: 30 }`.
- **SlideKit's documentation should warn** that font sizes in inline HTML may be affected by the host framework's base font-size. The baseline CSS reset should perhaps force `font-size: inherit` or apply more aggressive resets.
- **The `measure()` function presumably accounts for this**, so the suggestion should be: "Use `measure()` to determine actual dimensions instead of guessing heights for text elements."

---

## 5. `content-clustering` fires on intentionally sparse slides (8 warnings)

**What I investigated:** 8 slides flagged for content using less than 40% of the safe zone.

**What was surprising:** Title slides, closing slides, and connector/diagram slides are *intentionally* sparse. A title slide with "SlideKit" centered and a tagline below it is good design — it's not "under-utilizing the safe zone."

**What would be more helpful:**
- **Exempt slides with fewer than 4-5 content elements.** A slide with 2-3 elements is a hero/title slide by definition — sparsity is the point.
- **Consider slide archetypes:** title slides, section dividers, and closing slides are supposed to be sparse. Maybe a heuristic: if the largest text element is >60px font-size and there are ≤5 elements, it's a hero slide.
- Alternatively, **lower the severity to `info`** instead of `warning`. Sparsity is a design choice, not a problem.

---

## 6. `safe-zone-violation` doesn't understand decorative intent (8 warnings)

**What I investigated:** 8 warnings on the closing slide's corner bracket elements.

**What was surprising:** The corner brackets are intentionally placed at the slide edges (x:40, y:40) as decorative framing elements on `layer:'overlay'`. They're designed to be at the corners of the slide, not within the safe zone.

**What would be more helpful:**
- **Exempt `layer:'overlay'` elements** from safe-zone checks, just like `layer:'bg'` elements are already exempted. Overlay elements are typically decorative or UI chrome that belongs at the edges.
- Alternatively, **add an element-level `decorative: true` flag** that exempts from safe-zone and content-clustering rules.

---

## 7. `gap-too-small` is too strict for demo/diagram content (28 warnings before fix)

**What I investigated:** Stack layout demos (slide 7) with gap:6 between small colored rectangles.

**What was surprising:** The 8px minimum gap threshold is reasonable for text content but too strict for small visual demo elements. When showing how `vstack(align:'left')` works with 16px-tall colored rectangles, a 6px gap is visually appropriate and intentional. Forcing 8px gaps makes the demos look looser than intended.

**What would be more helpful:**
- **Scale the minimum gap threshold by element size.** For elements under 30px tall, a 4px gap might be fine. For body text (26px+), 8px is appropriate.
- Alternatively, **don't flag gap-too-small inside groups** that appear to be diagrams (many small, non-text elements).

---

## 8. Deck-level `title-position-drift` and `style-drift` don't account for slide types

**What I investigated:** Two deck-level info findings:
- Title position varies by 478px across slides
- Heading size varies from 56px to 96px

**What was surprising:** This is completely intentional. The hero title slide uses 96px at center (x:960), while regular slide titles use 56px at left (x:120). These are different slide archetypes with deliberately different typography.

**What would be more helpful:**
- **Cluster slides by archetype before checking drift.** If 14 slides have titles at x:120 and 2 slides have titles at x:960, report drift within each cluster, not across all slides.
- **Exclude obvious outliers.** A single hero slide with a 96px title shouldn't cause `style-drift` when all other 15 slides use 56px consistently.
- **Report which slides are the outliers.** "Title position varies by 478px" is useless without knowing which slides deviate. Include `outlierSlides: ['title', 'closing']` in the detail.

---

## 9. `near-misalignment` is mostly noise for anchor demos (11 info)

**What I investigated:** 11 near-misalignment info findings, mostly on the anchor system demo (slide 5).

**What was surprising:** The anchor demo intentionally places elements at specific anchor points (tl, tc, tr, etc.) — these elements are supposed to be at different positions. A 4px "drift" between an origin dot and an anchor-positioned element is the entire point of the demo: showing how anchors offset from the origin.

**What would be more helpful:**
- **Provide the alignment axis in the finding** (left, right, top, bottom, center-x, center-y) — currently it does, which is good.
- **Consider element relationships.** Two unrelated elements (a dot and a rectangle) being 4px from aligned is not a "near-misalignment" — it's coincidence. Only flag near-misalignment between elements that appear to be intentionally grouped (same parent, adjacent in source order, similar type).

---

## 10. Fallback Behaviors: Audit of Warning Coverage

The library has **20 distinct fallback behaviors** where the user's intent can't be fulfilled and something else happens instead. The coverage is poor:

- **0 out of 20** include a `suggestion` field in their warning
- **10 out of 20** emit no warning at all (completely silent)
- **1** uses `console.warn()` instead of a structured warning (invisible to programmatic consumers)
- Font warnings are stored in `state.fontWarnings` but never merged into the layout result's `warnings` array

### Fallbacks that are completely silent (no warning):

| # | Location | What happens | Recommended warning |
|---|----------|-------------|-------------------|
| 1 | `positions.ts` L243 | Stack child not positioned by parent → placed at (0,0) | Layout engine bug — should never happen silently |
| 2 | `renderer.ts` L303 | Element not in scene graph → raw props used | "Ensure all elements pass through layout() before render()" |
| 3 | `renderer.ts` L327 | Blocked CSS property → silently removed | Promote existing console.warn to structured warning |
| 4 | `renderer.ts` L43 | Unknown layer value → treated as "content" | "Unknown layer '${layer}'. Valid: 'bg', 'content', 'overlay'" |
| 5 | `elements.ts` L170 | cardGrid cols < 1 → clamped to 1 | "cols must be at least 1. Clamped from ${cols} to 1" |
| 6 | `compounds.ts` L159 | Panel contentW < 0 → clamped to 0 | "Panel width too small for padding. Increase w or decrease padding" |
| 7 | `compounds.ts` L289 | Figure inner dims < 0 → clamped to 0 | "Figure too small for containerPadding. Increase size or decrease padding" |
| 8 | `relative.ts` L142 | placeBetween bias out of range → clamped | "bias must be 0–1. Was ${bias}, using ${clamped}" |
| 9 | `transforms.ts` L287 | distributeH with < 2 elements → no-op | "distributeH requires at least 2 elements" |
| 10 | `transforms.ts` L334 | distributeV with < 2 elements → no-op | "distributeV requires at least 2 elements" |

### Fallbacks with warnings but no suggestions:

| # | Warning type | Recommended suggestion |
|---|-------------|----------------------|
| 1 | `ignored_rel_on_stack_child` | "Remove relative positioning, or move element outside the stack" |
| 2 | `between_no_fit` (x) | "Reduce element width, or increase space between references" |
| 3 | `between_no_fit` (y) | "Reduce element height, or increase space between references" |
| 4 | `stretch_override` (vstack) | "Remove explicit w to let stretch control it, or remove align:'stretch'" |
| 5 | `stretch_override` (hstack) | "Remove explicit h to let stretch control it, or remove align:'stretch'" |
| 6 | `invalid_transform_object` | "Use a SlideKit transform function like alignLeft(), distributeH()" |
| 7 | `connector_self_reference` | "fromId and toId must be different elements" |
| 8 | `connector_missing_endpoint` | "Ensure both endpoint elements exist on this slide" |

### Font warnings are orphaned:

Font load failures/timeouts are stored in `state.fontWarnings` but **never surfaced** in the layout result's `warnings` array. This means any agent inspecting `layout().warnings` will never see font problems. These should be merged into the layout warnings.

### The `placeBetween` bug in slide 6 — a case study:

This was the most instructive fallback. The slide code tried to place a 70px-tall box in a 24px gap. The library:
- ✅ Correctly detected the element doesn't fit
- ✅ Emitted a `between_no_fit` warning with the element ID and reference IDs
- ❌ Did NOT include a suggestion like "Increase gap between s6-boxA and s6-boxB to at least 70px (element height)"
- ❌ The fallback position (topEdge + xs) caused visible overlap with Box B, but no overlap warning was generated for this specific case

The warning message was: `Element "s6-boxE": does not fit between "s6-boxA" and "s6-boxB"; using minimum gap fallback.`

A better message with suggestion would be: `Element "s6-boxE" (h=70) does not fit between "s6-boxA" and "s6-boxB" (available gap: 24px). Falling back to xs spacing below "s6-boxA". Suggestion: increase the gap between "s6-boxA" and "s6-boxB" to at least 94px (element height + 24px padding), or reduce "s6-boxE" height to fit within 24px.`

---

## 11. What Already Works Well (for the library/linter author)

These are things the linter and library already do that made the linting workflow effective. Worth preserving and possibly emphasizing in docs.

### 11a. Structured JSON findings are excellent for AI agents

The finding shape `{ rule, severity, elementId, message, detail, suggestion, bounds }` is exactly what an AI agent needs. I could filter by rule, group by severity, and extract element IDs for targeted code fixes — all without parsing prose. This is dramatically better than console.log warnings.

### 11b. `elementId` in every finding is the single most useful field

Every finding includes the element ID, which maps directly to the source code (`s3-coord-tl` → `grep -n "s3-coord-tl" slides.ts`). This made the fix cycle fast: read finding → find element in code → adjust dimensions/style → rebuild. Without element IDs, I'd have been cross-referencing coordinates against source code, which is error-prone.

### 11c. `lintSlide()` vs `lintDeck()` separation works perfectly

Running `lintSlide()` per-slide during iterative fixes was fast and focused. Only running `lintDeck()` once at the end for cross-slide consistency was the right workflow. If these were merged into one call, every fix iteration would re-run cross-slide checks unnecessarily.

### 11d. `window.sk` scene model being browser-queryable is powerful

Being able to call `window.sk.lint('slide-id')` directly from DevTools MCP was the entire workflow. I didn't need to add any tooling, build a test harness, or write scripts. The lint function lives where the rendered presentation lives. This is the right architecture.

### 11e. Severity levels (error/warning/info) enabled correct prioritization

I fixed errors first (text-overflow, canvas-overflow), then warnings (gap-too-small, low-contrast), then reviewed info (near-misalignment) and decided most were fine. The three levels mapped cleanly to "must fix / should fix / consider fixing." This is the right granularity — don't add more levels.

### 11f. `bg` layer exemption from safe-zone already exists

Background-layer elements are already exempt from `safe-zone-violation`. This is correct and saved many false positives. The same logic should extend to `overlay` layer and to `non-ancestor-overlap` (cross-layer overlaps).

### 11g. `suggestion` field with specific fix values is actionable

Findings like `"Reduce content or increase element height/width"` are generic but still helpful. The best suggestions included specific values (e.g., overshoot amounts). When the `detail` object included `{ overshoot: 6, edge: 'bottom' }`, I could compute the exact fix: increase height by 6px. More findings should include this level of specificity.

### 11h. Rule IDs are semantic and stable

Rule IDs like `text-overflow`, `gap-too-small`, `non-ancestor-overlap` are self-documenting. I could filter findings by rule ID without reading documentation. These should stay as-is — don't rename them.

### 11i. The resolved bounds in the scene graph made debugging possible

When a lint finding said "text-overflow on s3-coord-tl", I could immediately check `window.sk.layouts[N].elements['s3-coord-tl'].resolved` to see the actual position and dimensions. Then I could compare against the DOM's `scrollHeight`/`clientHeight` to understand why. The scene graph is the single source of truth for spatial debugging.

### 11j. `detail` object with rule-specific structured data

The `detail` field having rule-specific data (`overshoot`, `edge`, `parentId`, `gap`, `contrastRatio`) is exactly right. This is machine-readable data that an AI agent can use to compute fixes programmatically. Every rule should populate `detail` with structured data, not just put information in the `message` string.

### 11k. Canvas dimensions and safe zone available via `window.sk._config`

Being able to read `window.sk._config` to get slide dimensions and safe zone margins meant I could verify whether an element was supposed to be inside or outside bounds. This context is essential for deciding whether a safe-zone-violation is intentional.

---

## Summary: Linter Signal-to-Noise Ratio

| Rule | Total Findings | Actually Useful | Noise | Primary Noise Source |
|------|---------------|----------------|-------|---------------------|
| non-ancestor-overlap | 884 | ~10? | ~874 | Connectors + cross-layer |
| empty-text | 146 | 0 | 146 | Decorative el() elements |
| child-overflow | 155 | ~5? | ~150 | Group/stack coordinate system |
| content-clustering | 8 | 2-3 | 5-6 | Title/hero slides |
| safe-zone-violation | 8 | 0 | 8 | Decorative overlay elements |
| text-overflow | 7 | 7 | 0 | ✅ All useful |
| canvas-overflow | 11 | 11 | 0 | ✅ All useful |
| gap-too-small | 28 | 12 | 16 | Diagram/demo elements |
| low-contrast | 7 | 7 | 0 | ✅ All useful |
| near-misalignment | 11 | 3 | 8 | Coincidental proximity |
| title-position-drift | 1 | 0 | 1 | Hero vs regular slides |
| style-drift | 1 | 0 | 1 | Hero vs regular slides |

**Overall: ~1269 total findings, ~55 actually useful (~4% signal rate).**

The three highest-value rules are `text-overflow`, `canvas-overflow`, and `low-contrast` — these are almost always real bugs. Everything else needs better filtering to be useful for automated fixing.

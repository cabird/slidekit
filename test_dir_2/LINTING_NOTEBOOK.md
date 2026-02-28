# Visual Linting Analysis Notebook

## Purpose

Catalog visual issues found in a SlideKit presentation, determine whether each can be detected programmatically or visually, derive general linting rules, and identify API improvements that would prevent the issues.

## Replicable Process

This process can be repeated for any SlideKit deck. An orchestrator agent coordinates the work; sub-agents do the analysis.

### Prerequisites
- A rendered SlideKit presentation served via HTTP
- Playwright (or headless browser) access to the presentation
- Access to the slide source code (slides.js)
- Access to the SlideKit API docs (API.md)
- Reference screenshots for each slide

### Step 1: Gather Scene Model Data

Navigate to the presentation in a browser. For each slide, extract the full scene model layout:

```js
// In browser console or via Playwright evaluate:
window.sk.layouts.map((layout, i) => ({
  slideIndex: i,
  slideId: window.sk.slides[i].id,
  elements: layout.elements,       // { id: { resolved: {x,y,w,h}, ... } }
  collisions: layout.collisions,   // [{ elementA, elementB, overlapRect, overlapArea }]
  warnings: layout.warnings,       // [{ type, message, ... }]
  errors: layout.errors,           // [{ type, message, ... }]
}))
```

Save this to a JSON file for analysis. Also take a screenshot of each slide.

### Step 2: Enumerate Known Issues

List each visual issue observed by a human reviewer. For each issue, record:
- **Slide**: which slide and elements are involved
- **Description**: what looks wrong
- **Category**: overlap, spacing, alignment, sizing, containment, consistency, color

### Step 3: Analyze Each Issue (sub-agents)

For each issue (or batch of issues on the same slide), a sub-agent:

1. **Reads the scene model data** for the relevant slide — bounding boxes, collisions, warnings
2. **Attempts programmatic detection** using the metadata:
   - Computes gaps between elements
   - Checks containment (child within parent bounds)
   - Compares dimensions of peer elements (equal height check)
   - Checks alignment (centering, top-alignment)
3. **Reads the screenshot** to confirm the issue visually
4. **Reads the slides.js code** that created the affected elements
5. **Reports back**:
   - Programmatic detection: yes/no, method used, specific numbers
   - Visual detection: yes/no, what was seen
   - General linting rule: a slide-agnostic rule with threshold/logic
   - Rule category and severity (error / warning / suggestion)
   - API improvement: would a different function/default have prevented this?

### Step 4: Record Findings

The orchestrator writes each finding to this notebook immediately after the sub-agent returns. Each entry follows the template in the "Issue Catalog" section.

### Step 5: Derive Linting Rules

After all issues are analyzed, consolidate the general rules into a rule catalog with:
- Rule ID (e.g., `spacing.min-vertical-gap`, `sizing.equal-height-peers`)
- Detection method (scene model / DOM / visual)
- Severity (error / warning / suggestion)
- Threshold or logic
- Auto-fixable? (yes / no / partially)

### Step 6: Identify API Improvements

Analyze the slides.js code holistically. For each issue, determine:
- Was the issue caused by a missing API feature?
- What function or default would have prevented it?
- Would the improvement make the bad state unrepresentable?

---

## Issue Inventory

The following issues were reported by a human reviewer after inspecting the rendered 17-slide deck.

| # | Slide | Category | Summary |
|---|-------|----------|---------|
| 1 | 1 (title) | spacing | Subtitle too close vertically to authors line |
| 2 | 4 (appraisal-framework) | alignment | Flow diagram labels not vertically centered in boxes |
| 3 | 5 (method) | sizing | Third stat card taller than peers — cards should be equal height |
| 4 | 7 (appraisals-predict) | overflow/overlap | Identity card coefficients wrap and overflow, overlapping card below |
| 5 | 9 (task-clusters) | sizing | Cards should be equal height but aren't |
| 6 | 9 (task-clusters) | overlap | C2 card: "AI largely resisted" overlaps with text above |
| 7 | 10 (gap-map) | spacing | Caption text too close to chart above |
| 8 | 11 (core-work) | overlap | "High value & demands" text overlaps with task list above |
| 9 | 14 (augmentation-spectrum) | alignment | Emoji icons + gradient bar not horizontally centered |
| 10 | 15 (rai-priorities) | containment | Chart image spills past bottom of background container |
| 11 | 15 (rai-priorities) | color | Chart background color doesn't match container color |
| 12 | 15 (rai-priorities) | spacing | Caption text should be farther below container |
| 13 | 16 (design-principles) | sizing | Cards should be equal height (augmentation card differs) |

---

## Issue Catalog

### Issue 1: Title slide — subtitle too close to authors

**Slide:** title (index 0) | **Category:** spacing | **Elements:** s1-subtitle, s1-authors

**Programmatic detection:** YES
- Method: Compute vertical gap = `authors.y - (subtitle.y + subtitle.h)` = `658 - (516+102)` = **40px**.
- The subtitle is 34px font, authors are 24px font. Minimum gap for multi-line text should be ~2.0x the smaller font size = 48px. The 40px gap fails this threshold.
- The gap was set by `below('s1-subtitle', { gap: 40 })` — adequate for a single-line subtitle, but the subtitle wraps to 2 lines, making the visual mass above denser and the gap feel insufficient.

**Visual detection:** YES
- The subtitle-to-authors gap is visually the tightest vertical spacing on the slide. The subtitle and authors appear grouped together rather than having breathing room.

**General linting rule:**
- **Rule ID:** `spacing.min-vertical-gap`
- **Rule:** Adjacent text elements must have a vertical gap >= 1.5x the smaller font size; if the upper element wraps to multiple lines, gap must be >= 2.0x.
- **Detection logic:** `gap = B.y - (A.y + A.h); minGap = (A.lineCount > 1) ? smallerFont * 2.0 : smallerFont * 1.5`
- **Threshold:** 1.5x smaller font (single-line) / 2.0x smaller font (multi-line)
- **Severity:** warning
- **Auto-fixable:** yes — increase `gap` parameter in `below()`

**API improvement:** `below()` could accept a `minGap: 'auto'` that computes typographically appropriate gap based on font sizes and line counts of both elements.

---

### Issue 2: Appraisal Framework — flow diagram labels not centered in boxes

**Slide:** appraisal-framework (index 3) | **Category:** alignment | **Elements:** s4-flow (internal HTML)

**Programmatic detection:** NO
- The scene model sees `s4-flow` as one opaque 600x40px bounding box. The three colored boxes ("Event", "Appraisal", "Response") are inline HTML with flexbox — sub-element geometry is invisible to the scene model.
- The vertical centering issue is a CSS rendering detail (baseline offset in padding-centered text), undetectable from bounding boxes.

**Visual detection:** YES
- Text labels sit slightly below vertical center in each box — a common artifact of padding-based centering where font baselines sit above the mathematical center. Subtle but noticeable.

**General linting rule:**
- **Rule ID:** `internal-layout.text-vertical-centering`
- **Rule:** Text within inline-HTML container boxes should appear optically centered; padding-based centering may need optical adjustment (`padding-top` slightly larger than `padding-bottom`).
- **Detection logic:** Cannot be detected from scene model. Requires either visual inspection or HTML analysis (parse inline CSS, check if `padding: 8px 16px` is symmetric and suggest optical offset like `9px 16px 7px 16px`).
- **Severity:** suggestion
- **Auto-fixable:** no — requires visual judgment or optical centering heuristic

**API improvement:** A `chip()` or `tag()` primitive that renders labeled boxes with proper optical vertical centering built in, avoiding raw inline HTML/CSS.

---

### Issue 3: Method — third stat card taller than peers

**Slide:** method (index 4) | **Category:** sizing | **Elements:** s5-stat1, s5-stat2, s5-stat3

**Programmatic detection:** YES
- Heights: stat1=209, stat2=205, stat3=**230**. Delta: 25px (12.2% deviation from median 209).
- Cards are in an `hstack` with `align: 'top'`, so stat3 extends 21-25px below the others.

**Visual detection:** YES
- The third card (3,981) is visibly taller — its bottom edge extends below the other two, creating a ragged appearance.

**General linting rule:**
- **Rule ID:** `sizing.equal-height-peers`
- **Rule:** Children of an `hstack` should have equal rendered heights; flag if any child deviates >5% from the median.
- **Detection logic:** `for each hstack: heights = children.map(c => c.h); if any |h - median| / median > 0.05: warn`
- **Threshold:** >5% height deviation from median
- **Severity:** warning
- **Auto-fixable:** partially — `hstack` could support `equalHeight: true` to force all children to max height

**API improvement:** `hstack({ align: 'stretch' })` — analogous to CSS flexbox `align-items: stretch`. This is the single highest-value API addition for card layouts.

---

### Issue 4: Appraisals Predict — identity card overflow/overlap

**Slide:** appraisals-predict (index 6) | **Category:** overflow/overlap | **Elements:** s7-card-identity, s7-card-accountability

**Programmatic detection:** PARTIALLY
- All four cards report h=83, gap between identity bottom and accountability top = 14px. Scene model shows no overflow.
- However, each card packs emoji + title + description + coefficient into 83px (47px content area after padding). The identity card's dual coefficient text (`↓ −.09  ↑ +.15` at 34px font) is longer than single-value coefficients in other cards — a heuristic could flag this as high-risk for overflow.

**Visual detection:** NOT CONFIRMED by sub-agent
- The sub-agent reported the cards appear to render correctly in the screenshot, with content contained. **Note:** This conflicts with the human reviewer's observation. The discrepancy may be due to: (a) rendering differences at different zoom levels, (b) the sub-agent examining a lower-resolution screenshot, or (c) the issue being intermittent (font metric differences across browsers/systems).

**General linting rule:**
- **Rule ID:** `overflow.content-exceeds-container`
- **Rule:** Flag when estimated minimum content height (from font sizes, line counts, padding) exceeds the measured container height.
- **Detection logic:** Estimate child heights from font sizes and line heights; compare sum + gaps + padding to container h.
- **Severity:** warning
- **Auto-fixable:** partially — expand card height, but cascades to siblings

**API improvement:** `panel({ minHeight: 'auto' })` to ensure panel grows to fit content. Scene model should export child positions within panels.

---

### Issue 5: Task Clusters — cards unequal height

**Slide:** task-clusters (index 8) | **Category:** sizing | **Elements:** s9-card-c1, s9-card-c2, s9-card-c3

**Programmatic detection:** YES
- Heights: c1=312, c2=**280**, c3=312. Delta: 32px (10.3% deviation). C2 is the outlier.
- C2 has fewer/shorter task items, making it naturally shorter.

**Visual detection:** YES
- C2 is visibly shorter — its bottom edge is higher than C1 and C3, creating an asymmetric appearance. The middle card looks "floating."

**General linting rule:**
- **Rule ID:** `sizing.equal-height-peers` (same as Issue 3)
- **Severity:** warning
- **Auto-fixable:** yes — set all to max(heights) via `equalHeight: true`

**API improvement:** Same as Issue 3 — `hstack({ align: 'stretch' })`.

---

### Issue 6: Task Clusters — C2 card internal overlap

**Slide:** task-clusters (index 8) | **Category:** overlap | **Elements:** s9-c2-desc, s9-c2-takeaway (inside panel)

**Programmatic detection:** NO
- Child element positions inside panels are not exported in the scene model at the top level. Group-relative coordinates exist internally but are not accessible to external linters.

**Visual detection:** NOT CONFIRMED by sub-agent
- The sub-agent reported all text lines in C2 appear properly spaced with no overlap. As with Issue 4, this conflicts with the human reviewer's observation.

**General linting rule:**
- **Rule ID:** `overflow.panel-child-overflow`
- **Rule:** The sum of measured child heights + gaps + padding inside a panel must not exceed the panel's height.
- **Detection logic:** Requires scene model to export panel child positions.
- **Severity:** error (if overflow confirmed)
- **Auto-fixable:** partially

**API improvement:** Scene model should export child element positions within panels and groups, enabling programmatic linting of internal layouts.

---

### Issue 7: Gap Map — caption too close to chart

**Slide:** gap-map (index 9) | **Category:** spacing | **Elements:** s10-chart, s10-caption

**Programmatic detection:** YES
- Gap = `caption.y - (chart.y + chart.h)` = `874 - (234+620)` = **20px**.
- Caption font ~28px. Minimum gap should be max(30px, 1.5 * fontSize) = 42px. The 20px gap is less than half the threshold.

**Visual detection:** YES
- The caption crowds against the chart's bottom edge. It looks like part of the chart's own labeling rather than a separate element. Stark contrast with the generous spacing elsewhere on the slide.

**General linting rule:**
- **Rule ID:** `spacing.element-gap-minimum`
- **Rule:** Gap between a large visual element (h > 200) and an adjacent text caption must be >= max(30px, 1.5x caption font size).
- **Detection logic:** `gap = B.y - (A.y + A.h); if A.h > 200 && gap < max(30, B.fontSize * 1.5): warn`
- **Threshold:** 30px absolute minimum, or 1.5x caption font size (whichever is larger)
- **Severity:** warning
- **Auto-fixable:** yes — increase `gap` in `below()`

**API improvement:** `below()` could have context-aware defaults — larger default gap when placing text below a large image. Or a `figure()` container with built-in image+caption spacing.

---

### Issue 8: Core Work — text overlap

**Slide:** core-work (index 10) | **Category:** overlap | **Elements:** s11-bullets, s11-caveat

**Programmatic detection:** MARGINALLY
- Gap = `608 - (454+130)` = **24px**. Matches the `below()` gap value.
- The bullet list has 3 items at 24px font with line-height 1.8. If any item wraps to 2 lines, height would jump from ~130px to ~173px, consuming the 24px gap and causing overlap.

**Visual detection:** NOT CONFIRMED by sub-agent
- The sub-agent reported all three bullets fit on single lines and the caveat line is clearly separated. This may vary by font rendering / browser.

**General linting rule:**
- **Rule ID:** `overflow.text-wrap-risk`
- **Rule:** Flag when a text element's estimated wrapped height (if longest line exceeds container width) would overflow into the gap before the next element.
- **Detection logic:** Estimate character count per line from font size and container width. If any line might wrap, compute new height and check against gap.
- **Severity:** warning
- **Auto-fixable:** partially — increase gap or widen container

**API improvement:** `below()` could accept `minGap` that guarantees minimum separation even if the preceding element renders taller than measured. Text measurement should use actual rendered height from DOM.

---

### Issue 9: Augmentation Spectrum — icons and bar not centered

**Slide:** augmentation-spectrum (index 13) | **Category:** alignment | **Elements:** s14-emoji-left, s14-bar, s14-emoji-right

**Programmatic detection:** YES
- Assembly spans x=200 to x=1364, width=1164. Assembly center = 782. Slide center = 960. **Offset: 178px left of center (9.3% of slide width).**
- Compare: cards below centered at exactly x=960. Headline centered at x=960. The bar assembly is the only non-centered group.

**Visual detection:** YES
- The bar is conspicuously shifted left. The right side of the slide has noticeably more empty space at the bar's y-position compared to the left. Clearly misaligned with the centered cards and headline.

**General linting rule:**
- **Rule ID:** `alignment.horizontal-center-consistency`
- **Rule:** On a centered-layout slide (where most elements use `anchor: 'tc'`), any element group whose center deviates >50px from slide center should be flagged.
- **Detection logic:** `assemblyCenterX = (leftmost.x + rightmost.x + rightmost.w) / 2; if |assemblyCenterX - 960| > 50: warn`
- **Threshold:** >50px offset = warning; >100px = error. (178px here = error)
- **Severity:** error
- **Auto-fixable:** yes — wrap in `hstack` with `anchor: 'tc'` at x=960

**API improvement:** Linting pass that detects when most elements on a slide use `anchor: 'tc'` but some use hardcoded x — flagging inconsistency. The fix is wrapping the bar assembly in an `hstack({ x: 960, anchor: 'tc' })`.

---

### Issue 10: RAI Priorities — chart spills past container bottom

**Slide:** rai-priorities (index 14) | **Category:** containment | **Elements:** s15-fig-bg, s15-chart

**Programmatic detection:** NO (false negative)
- Chart bounding box (bottom=804) is inside container (bottom=814). Scene model says it fits.
- But `object-fit: contain` repositions visual content within the CSS box based on the image's intrinsic aspect ratio. The actual chart bars/labels may extend to the bottom while whitespace sits at the top.

**Visual detection:** YES
- The chart's bottom content (x-axis labels) is flush with or clipped by the container's bottom edge. Top of the container has visible whitespace above the chart content. The `object-fit: contain` centering creates an uneven distribution.

**General linting rule:**
- **Rule ID:** `containment.image-content-within-parent`
- **Rule:** When an image uses `object-fit: contain`, verify that the *visual content* (not just the CSS box) remains within the parent with adequate padding.
- **Detection logic:** Requires knowing image intrinsic dimensions. Compute rendered content rect from `object-fit` behavior. Check if content bottom exceeds parent bottom minus padding.
- **Threshold:** Visual content must be >=5px inside parent on all sides.
- **Severity:** warning
- **Auto-fixable:** partially — reduce image h or add padding

**API improvement:** Scene model should export `naturalWidth`/`naturalHeight` for `<img>` elements, enabling linters to compute `object-fit` content rects. A `figure()` container could auto-compute safe sizing.

---

### Issue 11: RAI Priorities — chart background color mismatch

**Slide:** rai-priorities (index 14) | **Category:** color | **Elements:** s15-fig-bg, s15-chart

**Programmatic detection:** NO
- Scene model has no color information — only bounding boxes.
- Container uses `background: '#f8f9fa'` (CSS). Chart PNG has its own baked-in background color (likely white). No way to detect from geometry.

**Visual detection:** YES
- A visible rectangular boundary between the chart image (whiter) and the container (slightly gray `#f8f9fa`). Creates a "picture frame" effect that breaks the intended seamless integration.

**General linting rule:**
- **Rule ID:** `color.image-background-mismatch`
- **Rule:** When an image sits inside a colored container, the image's background color must match the container fill within a perceptual threshold.
- **Detection logic:** Requires pixel sampling — either via screenshot analysis or by decoding the image and sampling a corner pixel, then comparing to the container's computed background.
- **Threshold:** RGB channel difference <= 5 per channel (or CIE Delta-E 2000 <= 2.0)
- **Severity:** warning
- **Auto-fixable:** partially — can set container bg to match sampled image corner color

**API improvement:** A `figure()` helper that samples the image corner at load time and auto-matches the container background. Documentation should recommend transparent PNGs for charts on colored backgrounds.

---

### Issue 12: RAI Priorities — caption not low enough

**Slide:** rai-priorities (index 14) | **Category:** spacing/balance | **Elements:** s15-fig-bg, s15-caption

**Programmatic detection:** YES
- Gap above caption: `834 - 814` = **20px**. Space below caption to safe zone: `990 - 876` = **114px**.
- Ratio: 114/20 = 5.7x more space below than above. The caption hugs the container while vast empty space sits below.
- Optimal gap ≈ 47px (placing caption at optical 1/3 point of the 134px available range).

**Visual detection:** YES
- The caption is squeezed tightly under the container. Large empty dark expanse below. Slide feels top-heavy.

**General linting rule:**
- **Rule ID:** `spacing.unbalanced-trailing-whitespace`
- **Rule:** When an element has >3x more space below it (to safe zone) than above it (gap to sibling), suggest pushing it down for better vertical balance.
- **Detection logic:** `if spaceBelow / gapAbove > 3.0: suggest("increase gap for balance")`
- **Threshold:** Ratio > 3.0 = suggestion; ratio > 5.0 = warning
- **Severity:** suggestion (at 3x), warning (at 5x — here it's 5.7x)
- **Auto-fixable:** yes — compute balanced gap: `optimalGap = availableRange * 0.35`

**API improvement:** `below('ref', { gap: 'balanced' })` — auto-computes gap to place element at optical 1/3 point of remaining space to safe zone bottom.

---

### Issue 13: Design Principles — cards unequal height

**Slide:** design-principles (index 15) | **Category:** sizing | **Elements:** s16-card1, s16-card2, s16-card3

**Programmatic detection:** YES
- Heights: card1=239, card2=239, card3=**268**. Delta: 29px (12.1% deviation).
- Card 3's title "Augmentation, Not Automation" wraps to 2 lines, pushing content down and increasing height.

**Visual detection:** YES
- Cards 1 and 2 have aligned bottom edges. Card 3 is visibly taller. The asymmetry is prominent on a clean centered layout.

**General linting rule:**
- **Rule ID:** `sizing.equal-height-peers` (same as Issues 3 and 5)
- **Severity:** warning
- **Auto-fixable:** yes — `equalHeight: true` on hstack

**API improvement:** Same as Issues 3 and 5 — `hstack({ align: 'stretch' })`.

---

## Unconfirmed Issues

Issues 4, 6, and 8 were reported by the human reviewer but the sub-agents could NOT confirm them visually in the screenshots. Possible explanations:
- **Font rendering differences:** The human viewed the presentation in a different browser/zoom level where font metrics differ slightly, causing text to wrap or overflow differently.
- **Screenshot resolution:** Sub-agents examine PNG screenshots which may not capture subtle single-pixel overlaps.
- **Intermittent behavior:** Text measurement varies by font loading state, system font availability, or anti-aliasing.

**Recommendation:** These issues highlight the need for DOM-level linting (actual `scrollHeight > clientHeight` checks, `getBoundingClientRect()` measurements) in addition to scene-model linting. The scene model's text measurement may not match browser rendering exactly.

---

## Linting Rules Catalog

Consolidated rules derived from the 13 issues. These are general-purpose rules applicable to any SlideKit deck.

| Rule ID | Category | Detection | Severity | Auto-fix | Issues |
|---------|----------|-----------|----------|----------|--------|
| `spacing.min-vertical-gap` | Spacing | Scene model | warning | yes | 1 |
| `spacing.element-gap-minimum` | Spacing | Scene model | warning | yes | 7 |
| `spacing.unbalanced-trailing-whitespace` | Spacing | Scene model | suggestion/warning | yes | 12 |
| `sizing.equal-height-peers` | Sizing | Scene model | warning | partially | 3, 5, 13 |
| `alignment.horizontal-center-consistency` | Alignment | Scene model | error | yes | 9 |
| `internal-layout.text-vertical-centering` | Alignment | Visual only | suggestion | no | 2 |
| `overflow.content-exceeds-container` | Overflow | Scene model (heuristic) | warning | partially | 4 |
| `overflow.panel-child-overflow` | Overflow | Requires child export | error | partially | 6 |
| `overflow.text-wrap-risk` | Overflow | Scene model (heuristic) | warning | partially | 8 |
| `containment.image-content-within-parent` | Containment | Requires intrinsic dims | warning | partially | 10 |
| `color.image-background-mismatch` | Color | Pixel sampling | warning | partially | 11 |

### Detection Tiers

**Tier 1 — Scene model (fully detectable now):** 7 of 13 issues
- `spacing.min-vertical-gap`, `spacing.element-gap-minimum`, `spacing.unbalanced-trailing-whitespace`
- `sizing.equal-height-peers`
- `alignment.horizontal-center-consistency`

**Tier 2 — Scene model with enhancements (detectable after API changes):** 3 of 13 issues
- `overflow.panel-child-overflow` — needs child position export
- `containment.image-content-within-parent` — needs intrinsic image dimensions
- `overflow.content-exceeds-container` — needs content height estimation

**Tier 3 — Visual/DOM only (not detectable from geometry):** 3 of 13 issues
- `internal-layout.text-vertical-centering` — sub-element CSS issue
- `color.image-background-mismatch` — pixel color issue
- `overflow.text-wrap-risk` — font rendering dependent

---

## API Improvements (Ranked by Impact)

### Rank 1: `hstack({ align: 'stretch' })` — Equal-height children

**Prevents:** Issues 3, 5, 13 (23% of issues) | **Makes bad state unrepresentable:** YES

Add `'stretch'` to the `align` enum on `hstack`. When active, after measuring all children, set every child's `h` to `Math.max(...childHeights)`. Panel backgrounds grow; content stays top-aligned.

```js
// Before: cards have ragged bottom edges
hstack([panel(...), panel(...), panel(...)], { align: 'top' });

// After: all cards same height
hstack([panel(...), panel(...), panel(...)], { align: 'stretch' });
```

**Cost:** 1 new enum value. **Impact:** eliminates the most common visual issue across the entire deck.

### Rank 2: `below({ gap: 'auto' | 'balanced' })` — Smart spacing

**Prevents:** Issues 1, 7, 12 (23% of issues) | **Makes bad state unrepresentable:** No (pit of success)

- `gap: 'auto'` — computes typographically appropriate gap from font sizes and element types. Text-after-text: `max(24, 1.5 * min(fontSizes))`. Text-after-image: `max(30, 1.5 * selfFontSize)`.
- `gap: 'balanced'` — distributes element at optical 1/3 point of remaining space to safe zone.

```js
// Before: hardcoded gap that looks wrong when text wraps or image is large
y: below('s1-subtitle', { gap: 40 })

// After: automatically appropriate
y: below('s1-subtitle', { gap: 'auto' })
```

**Cost:** 2 new string modes. **Impact:** prevents all "gap too tight" and "gap unbalanced" issues.

### Rank 3: Scene model exports panel children

**Prevents:** Issues 4, 6, 8 (enables detection) | **Makes bad state unrepresentable:** No (prerequisite)

Export child element positions within panels/groups in the scene model output. Add `contentFits` boolean and `children` map to each panel element. Add post-render DOM overflow check (`scrollHeight > clientHeight`).

**Cost:** Data model change. **Impact:** enables programmatic detection of all internal overflow issues.

### Rank 4: `chip()` / `flowRow()` primitives

**Prevents:** Issues 2, 9 (15% of issues) | **Makes bad state unrepresentable:** YES for centering

`chip(label, props)` — optically-centered labeled box. `flowRow(items, props)` — horizontal sequence with separators. Replaces verbose inline HTML/CSS with a semantic primitive that handles optical centering.

**Cost:** 2 new functions. **Impact:** eliminates inline CSS centering bugs and reduces boilerplate.

### Rank 5: `panel({ overflow: 'grow' })` — Auto-expanding panels

**Prevents:** Issues 4, 6, 8 (with Rank 3) | **Makes bad state unrepresentable:** YES

After DOM render, if `scrollHeight > clientHeight` on any child, re-layout the panel with expanded height. Cascades to parent stacks.

**Cost:** 1 new enum value. **Impact:** panel content can never overflow.

### Rank 6: `figure()` compound primitive

**Prevents:** Issues 7, 10, 11, 12 (partially) | **Makes bad state unrepresentable:** Partially

Encapsulates image + optional background container + caption with automatic padding, color matching (`containerFill: 'auto'` samples image corner), and balanced caption gap.

**Cost:** 1 new function. **Impact:** eliminates the image-in-container pattern's many failure modes.

### Combined Impact

| Rank | Improvement | Cost | Issues Prevented |
|------|------------ |------|------------------|
| 1 | `align: 'stretch'` | 1 enum value | 3, 5, 13 |
| 2 | `gap: 'auto' \| 'balanced'` | 2 string modes | 1, 7, 12 |
| 3 | Scene model child export | Data model | 4, 6, 8 (detection) |
| 4 | `chip()` / `flowRow()` | 2 functions | 2, 9 |
| 5 | `panel({ overflow: 'grow' })` | 1 enum value | 4, 6, 8 (prevention) |
| 6 | `figure()` | 1 function | 7, 10, 11, 12 |

**Implementing ranks 1+2 alone would prevent 6 of 13 issues (46%) with minimal API surface.**
Implementing all 6 would address all 13 issues.


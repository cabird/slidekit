# SlideKit Replication Notebook

## Project
Recreating the "AI Where It Matters — ICSE 2026" presentation (17 slides) using SlideKit.

---

## Session Log

### Entry 1: Setup
- Copied original presentation to `test_dir_2/source/`
- Original uses Reveal.js with hand-written HTML/CSS (flexbox/grid layouts, custom theme)
- 17 slides total, mix of: hero centered, split left-heavy, diagram layouts
- Theme: dark bg (#111827), 4 accent colors, glass cards, Roboto/Inter fonts
- Starting HTTP server and taking reference screenshots
- All 17 reference screenshots captured successfully via Playwright MCP

### Entry 2: Slide 1 — Title Slide

**Strategy:** Use text primitives with centered anchors. Use `className: "grad"` for the gradient title effect. The overline badge is a rect + text combo. Skip the code waterfall animation for now (CSS keyframe animation is hard to replicate purely in SlideKit).

**First attempt result:**
- ✅ Overall layout looks very close to reference
- ✅ Gradient text on title works via className="grad"
- ✅ ICSE 2026 badge renders correctly
- ✅ Authors in green, affiliations in muted gray
- ✅ Subtitle positioning good
- ❌ Missing: Code waterfall animation background (the faint falling code columns)
- ❌ Missing: Glow effect (radial gradient) in top-right corner
- ⚠️ Title text is ALL CAPS in original (Reveal.js h1 CSS does text-transform) — SlideKit version shows mixed case since we control text directly

**What worked well:**
- `anchor: "tc"` + `x: 960` for centering is very intuitive
- `below()` for vertical chaining works perfectly
- `className` for CSS gradient text works seamlessly
- Overall very easy to get the basic structure right

**SlideKit feedback:**
- No built-in way to do animated backgrounds — this is expected, it's a CSS animation thing
- The `className` pass-through is essential for effects like gradient text

**Decision:** The title slide is close enough. The code waterfall is a nice-to-have animation detail. I'll note the ALL CAPS issue and move on.

### Entry 3: Slide 2 — The Adoption Paradox

**Strategy:** Split layout — text elements on left side (x ~60), image on right (x ~830). Use individual text primitives for heading, subheading, body text.

**First attempt result:**
- ✅ Overall layout matches well — text left, image right
- ✅ Image loads and displays correctly
- ✅ All text content present
- ⚠️ Image repositioned (moved up and right) to better match reference
- ❌ Missing inline text emphasis: original has "right" in blue and "less time on the work they value most" in bold white within paragraphs

**SlideKit limitation discovered: NO INLINE RICH TEXT**
- SlideKit's `text()` uses `textContent` internally, not `innerHTML`
- Cannot do inline bold, colored spans, or mixed formatting within a single text element
- To replicate this, you'd need to split into multiple adjacent text elements or overlay them — very tedious and fragile
- **This is a significant limitation for real presentations** where inline emphasis is common

**SlideKit feedback:**
- **Feature request: Rich text / inline spans.** Allow HTML content or a simple markup format in text elements (e.g., `**bold**` or `{color:#3B82F6}right{/color}`). This is one of the most common patterns in real slides.
- The coordinate-based positioning of text blocks works great for the overall layout

**Decision:** Accept the limitation. The slide reads well without the inline emphasis. Moving on.

### Entry 4: Slide 3 — Research Questions

**Strategy:** Two glass cards side by side, centered. Used rect + individual text elements for emoji, label, and description.

**Attempts:**
1. First try used `className: "glass accent-blue"` on rects — cards were invisible! The CSS classes weren't applying visually.
2. Switched to inline `fill` + `style` properties directly — cards now render correctly with background, border, border-radius, and colored bottom border.

**What worked:**
- Using `fill: "rgba(255,255,255,0.06)"` + inline style for borders works great
- `alignTopWith()` correctly aligns the second card to the first
- `anchor: "tr"` to position left card's right edge at center, then `x: 960 + 20` for right card works

**SlideKit feedback:**
- **className on rect doesn't seem to visually apply CSS background/border.** The className is added to the DOM element, but Reveal.js's CSS might be overriding or the element structure doesn't match expected selectors. Need to investigate further.
- **Workaround:** Use inline `fill` and `style` properties instead of CSS classes. This works but means you can't centralize card styling in a theme CSS file.
- **Feature request:** Would be nice to have a "card" or "glass card" convenience function.

**Decision:** Cards look good. Moving on to slide 4.

### Entry 5: Slide 4 — Cognitive Appraisal Framework

**Strategy:** Complex slide with text + flow diagram (Event→Appraisal→Response) on the left and a 2×2 card grid on the right. Used rect+text combos for each flow box with colored left borders, connected with arrow characters. Cards use the same glass pattern from slide 3.

**Comparison result:**
- ✅ Overall layout matches — text left, cards right
- ✅ Flow diagram boxes render with colored borders
- ✅ 2×2 card grid present
- ⚠️ Title casing: reference uses ALL CAPS "COGNITIVE APPRAISAL THEORY", SlideKit shows title case
- ⚠️ Spacing more compact in SlideKit vs. reference — less vertical breathing room
- ❌ Missing inline "AI" bold emphasis in body text (same rich text limitation as slide 2)
- ⚠️ Cards positioned higher/more compact than reference

**What worked:**
- `rightOf()` + `alignTopWith()` for relative positioning of flow diagram boxes
- Inline `style` for colored left borders on flow boxes
- Glass card pattern continues to work reliably
- Complex multi-element layouts are achievable with patient coordinate work

**SlideKit feedback:**
- Complex layouts with many elements (this slide has ~25+ elements) are tedious but feasible
- Would benefit from a `flowDiagram()` or `connect()` with arrow rendering
- The ALL CAPS issue keeps recurring — consider a `textTransform` property on text elements

**Decision:** Close enough. The main message comes through. Moving on to slide 5.

### Entry 6: Slide 5 — Methodology (A Large-Scale Mixed-Methods Study)

**Strategy:** Split layout — text + 3 stat cards on left, image on right. Each stat card is a rect + number text + label text + sub text. Numbers are large (90px) colored text.

**Attempts:**
1. First try: stat cards 240w, numbers 80px, text width 200 — "3,981" wrapped to two lines (width too narrow for large number).
2. Second try: cards 260w, numbers 90px, text width 230 — still wrapped.
3. Third try: reduced "3,981" size to 85px with width 280 — fits on one line! ✅

**What worked:**
- `rightOf()` + `alignTopWith()` for card grid alignment continues to be reliable
- Stat card pattern (rect + colored number + label + sub) is a recurring pattern — worth making into a helper
- `below()` chaining for elements within each card

**SlideKit feedback:**
- **Feature request: `fitText()` or auto-sizing for numbers.** The manual width/size tuning to prevent text wrapping is tedious. An auto-fit mode that adjusts font size to fit width would be extremely helpful for stat displays.
- **Feature request: `statCard()` compound primitive** — a common pattern is "big colored number + label + sub-label inside a glass card." This could be a single function call.

**Decision:** Looks very close to reference (~90% match per comparison). Moving on.

### Entry 7: Slide 6 — Task Taxonomy (Table)

**Strategy:** Centered slide with a table layout. No table primitive in SlideKit, so built it with text elements for category/task columns, plus `rule()` for row dividers. Used an IIFE `(() => { ... })()` in the elements array to use loops for the 5 rows.

**Result:**
- ✅ High-fidelity reproduction — evaluator said "Excellent Recreation"
- ✅ Table columns align correctly using fixed x positions
- ✅ All 5 category colors match
- ✅ Emoji icons preserved
- ✅ Divider lines between rows using `rule()`
- ✅ Text wrapping on longer rows (Development, Meta-work) matches reference
- ⚠️ Slightly more compact vertical spacing than reference

**What worked:**
- Using `rule()` for table dividers is clean and simple
- IIFE in elements array allows programmatic row generation — very useful for repetitive data
- `alignTopWith()` to align task text with category text in same row
- `below()` chaining from previous rule to next row

**SlideKit feedback:**
- **No table primitive** — this was expected. Building tables from text + rules works but is verbose.
- **Feature request: `table()` compound primitive** — common in presentations, would save significant code for data tables.
- The IIFE pattern for dynamic element generation is powerful — should be documented as a pattern.
- **`rule()` works great** — simple horizontal lines are a common need and this was perfect.

**Decision:** Excellent match. One of the best reproductions so far. Moving on.

### Entry 8: Slide 7 — Appraisals Predict AI Adoption

**Strategy:** Split layout — text left, 4 stacked glass cards on right. Each card has emoji + colored label + description on left half, beta coefficient on right half. Used IIFE with loop over card data array.

**Attempts:**
1. First try: cardH=80, cardW=620 — cards too compact and narrow per comparison.
2. Second try: cardH=95, cardW=620, larger text — still too narrow.
3. Third try: cardW=680, cardX=780 — better proportions.

**What worked:**
- IIFE with data array loop pattern continues to be effective for repetitive card layouts
- `anchor: "tr"` + `align: "right"` for right-aligned beta coefficients
- Colored left border via `borderLeft` in inline style
- The i===0 ternary for first card vs. subsequent cards with `below()` is a workable but verbose pattern

**SlideKit feedback:**
- **Feature request: `vstack()` with gap** — the first-card-vs-subsequent pattern is awkward. A `vstack()` with explicit gap would eliminate the i===0 ternary logic.
- **Observation:** Getting card proportions right requires several iterations of screenshot-compare cycles. Would be nice if SlideKit had a visual preview mode or hot-reload.
- **Inline rich text limitation** again: "significantly predict" should be bold in the body text but can't be done.

**Decision:** Close enough after 3 iterations. Cards are properly sized now. Moving on.

### Entry 9: Slide 8 — Identity: Protect & Augment

**Strategy:** Split layout — text + dual arrow indicators on left, image + 2 quote blocks on right. Dual arrows are two adjacent text elements (red down, green up). Quote blocks are rect + text combos with colored left borders.

**Attempts:**
1. First try: heading width 750px at size 52 — title wrapped to 2 lines.
2. Fixed: width 800px, size 50 — fits on one line.

**What worked:**
- Dual arrow indicators via two `text()` elements with `rightOf()` alignment
- Quote block pattern: rect with `borderLeft` + text for quote + attribution
- Image with `fit: "cover"` and `borderRadius` in style

**SlideKit limitations hit:**
- `style.fontStyle: "italic"` is BLOCKED by SlideKit — cannot make quote text italic
- **Feature request:** Add `fontStyle` to allowed inline styles. Italic text is essential for quotations.
- Inline rich text still missing — "guard" should be rose colored, "use AI more" should be green
- **Another blocked property:** SlideKit strips fontStyle with a warning

**Decision:** ~85% fidelity. Missing italic on quotes and inline color emphasis, but layout is solid. Moving on.

### Entry 10: Slide 9 — Three Task Clusters

**Strategy:** Hero centered layout with 3 glass cards in a row. Used IIFE with calculated card positions based on total width centering formula: `startX = (1920 - totalW) / 2`.

**Result:** ~95% match — evaluator said "essentially perfect with only minor spacing differences."

**What worked:**
- Centering formula for card row is clean and reusable
- Fixed y-offsets relative to heading for consistent vertical positioning within cards
- Glass card pattern with colored bottom borders continues to work well

**Decision:** Excellent. Moving on.

### Entry 11: Slide 10 — Quadrant Map

**Strategy:** Diagram centered layout — simple: section label, heading, large centered image, caption text below.

**Result:** ~90% match. Minor caption text wrapping difference.

**What worked:**
- `anchor: "tc"` for centering everything is the simplest pattern
- `image()` with `fit: "contain"` for paper figures
- Very fast to build — took minutes

**SlideKit feedback:**
- Simple diagram slides (heading + image + caption) are trivially easy in SlideKit
- This is where the coordinate model shines — no layout surprises

**Decision:** Great. Moving on.

### Entry 12: Slides 11-13 — Cluster Deep-Dive Slides

**Strategy:** All three follow the same split left-heavy pattern: section label + heading + content (bullets/quotes) on left, image on right. Built them in batch.

**Results:**
- Slide 11 (Core Work): ~87% — layout excellent, missing green colored bullet prefixes
- Slide 12 (Ops & Coordination): ~82% — layout good, missing green emphasis on key phrases
- Slide 13 (People & AI-Building): ~76% — layout good, missing bold/italic/colored inline text

**What worked:**
- `bullets()` compound primitive works well for bullet lists — clean and concise
- Quote block pattern (rect + text + attribution) is now a well-established recipe
- These split layout slides are very fast to build — the pattern is well-established after slides 2, 4, 5, 7, 8

**Recurring limitations:**
- **Inline rich text** continues to be the #1 gap. Every content slide has phrases that should be bold, colored, or both. SlideKit can only do single-style text blocks.
- **`fontStyle: "italic"`** is blocked by SlideKit's style validator
- **Bold inline words** (e.g., "relationships", "craftwork") can't be rendered differently from surrounding text

**SlideKit feedback:**
- The split layout pattern is so common that a `splitSlide()` helper would save a lot of code
- `bullets()` could accept rich text items (e.g., `{ prefix: "Workflow efficiency", prefixColor: "#10B981", text: " — automate boilerplate" }`)

**Decision:** All three are acceptable. The inline formatting gap is consistent and documented. Moving on to remaining slides.

### Entry 13: Slide 14 — Augmentation Spectrum

**Strategy:** Hero centered with gradient spectrum bar (emoji endpoints), 3 cards below, caption at bottom. Used a rect with `background: linear-gradient(...)` in style for the spectrum bar.

**Result:** 98% fidelity — "Excellent match." The gradient bar via `style.background` worked perfectly.

**What worked:**
- `style.background` with `linear-gradient` is allowed and renders correctly
- Card centering formula continues to be reliable
- `boxShadow` on the gradient bar works for glow effect

**Decision:** Nearly perfect. No changes needed.

### Entry 14: Slide 15 — RAI Priorities

**Strategy:** Same as slide 10 — diagram centered with paper figure image + caption. Trivially simple.

**Result:** 95% fidelity. Caption has inline color emphasis in reference (blue/green text) that can't be replicated.

**Decision:** Simple and effective. Moving on.

### Entry 15: Slide 16 — Design Principles

**Strategy:** Hero centered with 3 glass cards. Each card has an icon circle (rect with borderRadius 50%), emoji inside, colored title, and description.

**Result:** 92% fidelity. Third card heading wraps differently (3 lines vs 2). Icon circles render well.

**What worked:**
- `borderRadius: "50%"` on a square rect creates a circle — used for icon backgrounds
- Semi-transparent fill `${card.color}22` creates tinted circle backgrounds

**SlideKit feedback:**
- **Feature request: `circle()` primitive** — would be cleaner than `rect()` with borderRadius

**Decision:** Good. Minor text wrapping difference acceptable.

### Entry 16: Slide 17 — Closing

**Strategy:** Split layout with gradient title text (using className "grad"), subtitle, link, and large image on right.

**Result:** 93% fidelity. Gradient text works via className. Image positioned well.

**What worked:**
- `className: "grad"` continues to work for gradient text on titles — this is the second time we've used it
- Large `size: 90` text with line breaks via `\n` renders correctly
- `weight: 300` for light subtitle text

**Decision:** Great closing slide. Gradient text is the highlight feature.

---

## FINAL ASSESSMENT

### Overall Results
All 17 slides have been recreated. Estimated fidelity per slide:
- Slide 1 (Title): ~90%
- Slide 2 (Adoption Paradox): ~85%
- Slide 3 (Research Questions): ~90%
- Slide 4 (Appraisal Framework): ~85%
- Slide 5 (Methodology): ~90%
- Slide 6 (Task Taxonomy): ~95%
- Slide 7 (Appraisals Predict): ~85%
- Slide 8 (Identity Dual): ~85%
- Slide 9 (Three Clusters): ~95%
- Slide 10 (Quadrant Map): ~90%
- Slide 11 (Core Work): ~87%
- Slide 12 (Ops & Coordination): ~82%
- Slide 13 (People & AI-Building): ~76%
- Slide 14 (Augmentation Spectrum): ~98%
- Slide 15 (RAI Priorities): ~95%
- Slide 16 (Design Principles): ~92%
- Slide 17 (Closing): ~93%

**Average fidelity: ~89%**

### What SlideKit Does Well
1. **Coordinate-based positioning** — predictable, no layout surprises
2. **Relative positioning** — `below()`, `rightOf()`, `alignTopWith()` are intuitive and reliable
3. **Glass card pattern** — rect + text combos with inline styles work great
4. **CSS pass-through** — `className`, `style.background`, `style.borderRadius`, etc. are powerful
5. **Text measurement** — auto-height text elements chain well with `below()`
6. **Simple slides** — diagram/hero slides (heading + image + caption) take minutes
7. **Programmatic generation** — IIFE in elements array enables loops and data-driven slides
8. **`bullets()` primitive** — clean, concise, well-designed
9. **`rule()` primitive** — perfect for table dividers and separators

### Critical Limitations
1. **No inline rich text** — THE #1 gap. Every real presentation has inline bold, colored, or mixed-style text. SlideKit's `text()` uses `textContent`, so you cannot do `"This is <b>bold</b>"`. To replicate this, you'd need overlapping text elements — extremely tedious and fragile.
2. **`fontStyle` blocked** — Cannot make text italic. Essential for quotations.
3. **`className` on rect unreliable** — CSS backgrounds/borders from classes don't apply to rects. Must use inline `fill` and `style` instead, which prevents theme centralization.
4. **No table primitive** — Tables are common in data presentations. Building from text + rules works but is very verbose.
5. **Manual text width tuning** — No auto-fit for large numbers or long text. Getting "3,981" to fit on one line required 3 iterations.

### Feature Requests (Priority Order)
1. **Rich text / inline spans** — Allow HTML or markup in text elements
2. **`fontStyle: "italic"` in allowed styles** — Simple fix, high impact
3. **`fitText()` auto-sizing** — Adjust font size to fit width
4. **`table()` compound primitive** — Common need in data presentations
5. **`statCard()` compound primitive** — Big number + label + sub in a glass card
6. **`circle()` primitive** — Cleaner than rect with borderRadius 50%
7. **`textTransform` property** — For ALL CAPS without shouting in source
8. **Fix `className` on rects** — Should reliably apply CSS backgrounds/borders

### Workflow Observations
- The screenshot-compare-fix cycle is essential but slow. A live preview with hot-reload would make SlideKit 5x faster to use.
- The IIFE pattern for data-driven slides should be documented as a best practice.
- After establishing patterns (glass card, split layout, centered hero), subsequent slides become much faster.
- First slide took ~30 minutes. By slide 14, similar complexity slides took ~5 minutes.
- The coordinate model requires some spatial reasoning but avoids CSS layout debugging entirely.


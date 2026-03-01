# SlideKit Lint — Design Proposal

> **Status**: DRAFT — awaiting review before implementation

## Overview

SlideKit uses a two-phase approach to catching layout and design issues:

1. **Programmatic linting** — deterministic checks against the resolved scene graph. Fast, free, no ambiguity. Runs as `sk.lint()` in the browser console after `render()`.

2. **AI-guided review** — an AI agent connects to the browser via Playwright MCP, reads the scene graph data, and evaluates slides against design guidelines that require judgment. Not an API call — a human loads up Claude Code or Copilot, points it at this document and the browser, and lets it work.

Both phases produce the same kind of output: a list of issues with element IDs, descriptions, and severity. The fix cycle is the same: read issues → rewrite the SlideKit spec → re-render → re-check.

## Naming

| Option | Assessment |
|--------|-----------|
| **Linter** (GPT 5.2) | Rule-based, non-blocking guidance. Familiar to devs. Matches `npm run lint`. |
| **Auditor** (Gemini 3 Pro) | Qualitative review with severity levels, not binary pass/fail. |
| Validator | Too binary (pass/fail). |
| Inspector | Implies interactive UI tool. |
| Checker | Generic, undersells extensibility. |

**Recommendation**: `lint` — matches existing `npm run lint` convention. Module at `slidekit/src/lint.js`. API: `lintSlide(slideId)` and `lintDeck()`. Exposed on `window.sk.lint('slide-id')` for console use.

---

## Phase 1: Programmatic Linter

### Architecture

**Hybrid approach** (both models agree):
- **Scene model** (`window.sk`) for geometry, bounds, positions — fast, deterministic
- **DOM inspection** for rendered reality — font sizes, text overflow, image natural sizes, contrast

Each rule has a `source` tag: `scene`, `dom`, or `hybrid`.

### API

```js
// Per-slide
const findings = sk.lint('rai-priorities');

// All slides
const allFindings = sk.lintDeck();

// Finding shape:
{
  rule: 'child-overflow',
  severity: 'error',              // error | warning | info
  elementId: 's15-fig-img',
  message: 'Image extends 6px below its container',
  detail: { overshoot: 6, edge: 'bottom' },   // rule-specific structured data
  bounds: { x: 10, y: 10, w: 1000, h: 600 },
  parentBounds: { x: 0, y: 0, w: 1020, h: 610 },
  suggestion: 'Reduce image height or increase container height to 620'
}
```

### Configuration

```js
sk.lint({
  rules: {
    "font-too-small": { min: 24, severity: "error" },
    "collision": { threshold: 100, severity: "warning" },
    "outside-safe-zone": { severity: "error" },
    "alignment-drift": { tolerance: 3, severity: "warning" },
  },
  ignore: ["bg-image", "bg-glow"],  // element IDs to skip
})
```

Per-rule objects support:
- **Threshold overrides** — adjust numeric limits per rule (e.g., `min`, `threshold`, `tolerance`)
- **Severity overrides** — promote or demote any rule (e.g., make `outside-safe-zone` an error instead of warning)
- **`ignore`** — array of element IDs to exclude from all checks

### Severity Levels

| Level | Meaning | Example |
|-------|---------|---------|
| **error** | Objectively broken — content hidden, cropped, unreadable | Child overflows parent, text clipped, off-canvas |
| **warning** | Likely problematic — won't crash but looks bad | Font too small, image upscaled, tight gap |
| **info** | Design guidance — might be intentional | Near-misalignment, content clustering, hierarchy hint |

---

### Proposed Rules

#### A) Structural — Hard Rules (Scene Model)

| # | Rule ID | What it checks | Severity | Source |
|---|---------|---------------|----------|--------|
| 1 | `child-overflow` | Child element extends beyond parent bounds | error | scene |
| 2 | `sibling-overlap` | Non-layered sibling elements overlap | error | scene |
| 3 | `canvas-overflow` | Element extends beyond 1920×1080 | error | scene |
| 4 | `safe-zone-violation` | Content-layer element outside safe zone (120px inset) | warning | scene |
| 5 | `zero-size` | Element has 0 or negative width/height after layout | error | scene |
| 6 | `orphaned-element` | Element fully occluded by another element on the same layer | warning | scene |

**Note**: Rules 3–4 already exist in the layout engine's warning system. The lint API surfaces those plus adds the remaining rules.

#### B) Typography — Readability (DOM)

| # | Rule ID | What it checks | Severity | Source |
|---|---------|---------------|----------|--------|
| 7 | `text-overflow` | scrollHeight > clientHeight or scrollWidth > clientWidth | error | dom |
| 8 | `font-too-small` | Computed font-size below 18px (unreadable on projector) | warning | dom |
| 9 | `font-too-large` | Computed font-size above 120px (excessive) | info | dom |
| 10 | `line-too-long` | Text line exceeds ~80 characters | info | dom |
| 11 | `line-height-tight` | line-height / font-size ratio below 1.15 | warning | dom |
| 12 | `empty-text` | Text element with empty or whitespace-only content | warning | dom |

#### C) Spacing & Alignment (Scene Model)

| # | Rule ID | What it checks | Severity | Source |
|---|---------|---------------|----------|--------|
| 13 | `gap-too-small` | Adjacent elements closer than 8px but not touching | warning | scene |
| 14 | `near-misalignment` | Elements within 4px of being aligned but aren't | info | scene |
| 15 | `edge-crowding` | Element within 8px of safe zone boundary | info | scene |
| 16 | `collision` | Same-layer bounding box overlap exceeding area threshold | warning | scene |

#### D) Content Distribution — Heuristic (Scene Model)

| # | Rule ID | What it checks | Severity | Source |
|---|---------|---------------|----------|--------|
| 17 | `content-clustering` | All content uses less than 40% of safe zone area | warning | scene |
| 18 | `lopsided-layout` | Content centroid far from slide center | info | scene |
| 19 | `too-many-elements` | More than 15 root-level visual groups | info | scene |

#### E) Images (Hybrid — DOM + Scene)

| # | Rule ID | What it checks | Severity | Source |
|---|---------|---------------|----------|--------|
| 20 | `image-upscaled` | Rendered size exceeds natural dimensions by >10% | warning | hybrid |
| 21 | `aspect-ratio-distortion` | Rendered aspect ratio differs from natural by >1% | warning | hybrid |

#### F) Visual Hierarchy (DOM)

| # | Rule ID | What it checks | Severity | Source |
|---|---------|---------------|----------|--------|
| 22 | `heading-size-inversion` | h3 font-size > h2 font-size on same slide | warning | dom |
| 23 | `low-contrast` | Text/background contrast ratio below 3:1 | warning | dom |

#### G) Cross-Slide Consistency (`lintDeck()` only)

| # | Rule ID | What it checks | Severity | Source |
|---|---------|---------------|----------|--------|
| 24 | `title-position-drift` | Title x/y varies >20px across slides | info | scene |
| 25 | `font-count` | More than 3 font families across deck | info | dom |
| 26 | `style-drift` | Body or heading font size varies across slides | info | dom |

---

### What NOT to check (intentionally excluded)

- **Color palette consistency** — too subjective, varies by design intent
- **Animation/transition quality** — out of scope for static layout lint
- **Content quality** (grammar, spelling) — not a layout concern
- **Accessibility (ARIA, alt text)** — could add later, different concern

### Implementation Notes

- Run **on-demand only**, not in render loop (DOM queries cause reflow)
- Each rule is a function: `(sceneData, slideElement?) => Finding[]`
- Rules can be enabled/disabled via options
- `lintSlide()` calls scene-model rules first, then DOM rules
- `lintDeck()` runs all per-slide rules + cross-slide consistency rules
- Return format is JSON, optimized for AI agent consumption
- Exposed on `window.sk` so agents can call via Chrome DevTools MCP

### What the programmatic linter does NOT check

Anything requiring judgment about design intent, visual hierarchy, aesthetic balance, or whether the content communicates effectively. That's Phase 2.

---

## Phase 2: AI-Guided Review

### How it works

An AI agent (Claude Code, GitHub Copilot, or similar) connects to the browser where the presentation is rendered. The agent:

1. Reads these guidelines (this document)
2. Connects to the browser via Playwright MCP
3. For each slide, extracts the scene graph data from `window.sk`
4. Evaluates the slide against the guidelines below
5. Reports issues in a structured format

The agent does NOT need screenshots for most checks — the scene graph provides every element's position, size, type, content, layer, and style. Screenshots may supplement for visual-spatial judgments that are hard to reason about from coordinates alone.

### Scene Graph Data Model

The agent runs these in the browser console via Playwright:

```js
// Get the full scene model
JSON.stringify(window.sk)

// Get layout result for slide N (0-indexed)
JSON.stringify(window.sk.layouts[0])

// Get all element IDs and their resolved positions
Object.entries(window.sk.layouts[0].elements).map(([id, el]) => ({
  id, type: el.type, ...el.resolved
}))

// Get warnings and errors for slide N
window.sk.layouts[0].warnings
window.sk.layouts[0].errors
window.sk.layouts[0].collisions

// Get the config (safe zone, slide dimensions)
window.sk._config
```

Each element in the scene graph has:

```js
{
  id: "title",
  type: "text",           // text, rect, rule, image, group, vstack, hstack, connector
  authored: {
    content: "Slide Title",
    props: { x: 960, y: 340, w: 1200, anchor: "tc", size: 80, ... }
  },
  resolved: {
    x: 360,    // final top-left x (after anchor resolution)
    y: 340,    // final top-left y
    w: 1200,   // final width
    h: 88,     // final height
  },
  provenance: {
    x: { source: "authored", value: 960 },  // or "relative", "stack", "transform", "measured"
    y: { source: "authored", value: 340 },
    w: { source: "authored", value: 1200 },
    h: { source: "measured" },
  }
}
```

---

### AI Review Guidelines

When reviewing a slide, evaluate against these categories. Report issues with the element ID(s) involved, a clear description, and a suggested fix when possible.

#### 1. Visual Hierarchy

The most important content on each slide should be visually dominant. Check:

- **Title prominence** — The slide title (if present) should be the largest or most visually prominent text. If body text or labels compete with the title in size or weight, flag it.
- **Size progression** — Heading > subheading > body > caption. Font sizes should step down in a clear hierarchy, not jump erratically. A 72px title with a 64px subtitle is too close — they should be at least 30% apart.
- **Weight and color differentiation** — If multiple text elements have the same size and weight, the hierarchy is unclear. Important text should be brighter/bolder; supporting text should be dimmer/lighter.
- **Reading order** — Content should flow logically (typically top-to-bottom, left-to-right for LTR languages). A key point placed below a minor detail is out of order.

#### 2. Spacing and Breathing Room

Slides are not documents — they need generous whitespace. Check:

- **Content density** — If text and elements cover more than ~60% of the safe zone area, the slide is probably too dense. Slides with more than 6-8 distinct content elements (excluding background/decorative) should be scrutinized.
- **Consistent gaps** — Elements that serve similar roles (e.g., cards in a row, bullet items) should have equal spacing between them. Inconsistent gaps look like mistakes.
- **Edge proximity** — Content shouldn't crowd the safe zone edges. Elements right at the safe zone boundary feel cramped; 20-40px of breathing room inside the safe zone is better.
- **Element-to-element spacing** — Adjacent elements should have intentional gaps, not zero-pixel proximity. Two boxes touching without overlap looks like a positioning error, not a design choice.

#### 3. Alignment

Sloppy alignment is the most common slide design flaw. Check:

- **Left edge alignment** — Elements that start a section (headings, body text, bullet lists) should share the same left edge. A heading at x=120 with body text at x=125 is a 5px error.
- **Column consistency** — In multi-column layouts, each column's content should align internally. Cards in an hstack should have their internal text starting at the same relative position.
- **Center alignment** — Elements meant to be centered (titles, subtitles, centered text) should be precisely centered, not off by a few pixels. Check that `x + w/2` equals the slide center (960) for centered content.
- **Vertical rhythm** — Gaps between successive elements (heading → rule → body → bullets) should follow a consistent rhythm. If the heading-to-rule gap is 16px and the rule-to-body gap is 40px, that might be intentional emphasis, or it might be inconsistent.

#### 4. Typography

- **Font count** — A slide should use at most 2-3 font families. More than that creates visual noise.
- **Size count** — A slide should use at most 4-5 distinct font sizes. More suggests the hierarchy isn't well-planned.
- **Minimum readability** — For projected presentations, no text should be below 20px. Below 24px warrants a warning. This includes labels, captions, and footnotes.
- **Line length** — Text blocks wider than ~900px become hard to read. At 28-32px font size, aim for 50-75 characters per line (~700-900px at typical character widths). Full-width text (1680px) at body text sizes is too wide.
- **Line height** — Body text should have `lineHeight` of 1.3-1.5. Tight line height (1.0-1.1) is acceptable for large titles but not for body copy.

#### 5. Color and Contrast

- **Text readability** — Light text on a dark background (or vice versa) should have sufficient contrast. Very dim text (opacity below 0.3 or very low alpha) may be invisible on projection.
- **Accent consistency** — If a slide uses an accent color (for rules, highlights, bullet markers), it should be the same color throughout. Mixed accent colors within a slide look uncoordinated.
- **Background-to-foreground separation** — Background layer elements should be visually distinct from content layer elements. A background rect with similar styling to a content card creates confusion about what's interactive/important.

#### 6. Structural Patterns

- **Card uniformity** — Cards/panels in a row should have the same width, and their internal structure should be consistent (same padding, same text sizes, same element order). One card with 28px headings and another with 24px is a mismatch.
- **Rule usage** — Accent rules should be used consistently. If one section has a rule after its heading and another doesn't, flag the inconsistency (unless the slide only has one section).
- **Bullet list formatting** — All items in a bullet list should use the same font size, color, and indentation. Nested items should be clearly indented and visually subordinate.

#### 7. Slide-Level Checks

- **Word count** — A single slide should rarely exceed 50-60 words of body text (excluding titles). More than that suggests the content should be split across slides.
- **Element count** — More than 12-15 visible content elements on a single slide is usually too many.
- **Empty space purpose** — Large empty areas (>25% of the slide with no content) should be intentional (breathing room, dramatic emphasis) not accidental (forgot to fill the space).

---

### AI Review Output Format

The AI should report issues in this format:

```
Slide: [slide-id]
Issues:

1. [severity: warning] Visual Hierarchy — Elements "s2-card1-title" (28px) and "s2-heading" (52px) have appropriate hierarchy. However, "s2-card1-body" at 20px and "s2-card2-body" at 18px are inconsistent — card body text should use the same size.
   → Fix: Set all card body text to size: 20.

2. [severity: info] Spacing — Cards "s2-card1", "s2-card2", "s2-card3" have 30px gaps between them, which is consistent. No issue.

3. [severity: warning] Alignment — "heading" left edge is at x=120, but "bullet-list" left edge is at x=125. These should align.
   → Fix: Set bullet list x to 120 (safe.x).
```

Severities:
- **error** — Almost certainly a bug or serious design flaw
- **warning** — Likely unintentional, worth fixing
- **info** — Observation, possibly intentional, noting for completeness

The agent should focus on actionable issues. Don't flag things that are clearly intentional design choices (e.g., a large empty area on a title slide, or a background rect at x=0,y=0 being "outside the safe zone").

---

## Implementation Status

- **Phase 1 (Programmatic):** Not yet implemented. The validation warnings in `layout()` cover some of these checks (safe zone, collisions, font size), but a dedicated `sk.lint()` API with configurable rules doesn't exist yet. 26 rules defined across 7 categories.
- **Phase 2 (AI-Guided):** This document serves as the guidelines. An AI agent can use these guidelines today by connecting to the browser and reading `window.sk` — no SlideKit code changes required.

## Open Questions

1. Should findings include fix **suggestions** with specific values (e.g., "increase container height to 620px")?
2. Threshold values (min font 18px vs 24px, max line length 80 vs 85, etc.) — make configurable via profiles?
3. Should we support per-element rule suppression (e.g., `lint: { ignore: ['sibling-overlap'] }` in element props)?
4. Should `lintDeck()` be separate from `lintSlide()`, or should there be a single `lint()` that does both?
5. Priority order for implementation — start with structural rules (1-5) and text-overflow (7)?

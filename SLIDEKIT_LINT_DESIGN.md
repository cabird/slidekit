# SlideKit Lint System

## Overview

SlideKit uses a two-phase approach to catching layout and design issues:

1. **Programmatic linting** — deterministic checks against the resolved scene graph. Fast, free, no ambiguity. Runs as `sk.lint()` in the browser console after `render()`.

2. **AI-guided review** — an AI agent connects to the browser via Playwright MCP, reads the scene graph data, and evaluates slides against design guidelines that require judgment. Not an API call — a human loads up Claude Code or Copilot, points it at this document and the browser, and lets it work.

Both phases produce the same kind of output: a list of issues with element IDs, descriptions, and severity. The fix cycle is the same: read issues → rewrite the SlideKit spec → re-render → re-check.

---

## Phase 1: Programmatic Linter

### Interface

After `render()`, call from the browser console:

```js
let issues = sk.lint()
```

Returns an array of structured issue objects:

```js
[
  { rule: "font-too-small", severity: "error", element: "footnote",
    detail: { fontSize: 16, min: 24 },
    message: "Font size 16px on 'footnote' is below projection minimum (24px)" },

  { rule: "collision", severity: "warning", elements: ["card1", "card2"],
    detail: { overlapArea: 1200 },
    message: "Elements 'card1' and 'card2' overlap by 1200px²" },

  { rule: "outside-safe-zone", severity: "warning", element: "sidebar",
    detail: { edge: "right", overshoot: 30 },
    message: "Element 'sidebar' extends 30px beyond right safe zone boundary" },
]
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

### Programmatic Rules

These are mechanical checks with no ambiguity:

| Rule | What it checks | Default severity |
|---|---|---|
| `font-too-small` | Font size below `minFontSize` (default 24px for projection) | error |
| `collision` | Same-layer bounding box overlap exceeding threshold | warning |
| `outside-safe-zone` | Element extends beyond safe zone margins | warning |
| `outside-slide` | Element extends beyond 1920×1080 canvas | error |
| `text-overflow` | Text content exceeds its bounding box | warning |
| `alignment-drift` | Elements nearly aligned (within N pixels) but not exactly | warning |
| `orphaned-element` | Element fully occluded by another element on the same layer | warning |
| `empty-text` | Text element with empty or whitespace-only content | warning |

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

### Connecting to the scene graph

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

- **Phase 1 (Programmatic):** Not yet implemented. The validation warnings in `layout()` cover some of these checks (safe zone, collisions, font size), but a dedicated `sk.lint()` API with configurable rules doesn't exist yet.
- **Phase 2 (AI-Guided):** This document serves as the guidelines. An AI agent can use these guidelines today by connecting to the browser and reading `window.sk` — no SlideKit code changes required.

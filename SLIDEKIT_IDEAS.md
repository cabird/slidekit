# SlideKit Ideas & Future Improvements

This is a running list of ideas for SlideKit that aren't in the current design doc or implementation plan. They're captured here so they don't get lost.

---

## Slide Design Guidelines / Best Practices Guide

A reference document that AI models should read before creating slides with SlideKit. Would cover:

- **Typography rules** — minimum font sizes for projection (title ≥ 48px, body ≥ 28px, captions ≥ 20px), maximum words per slide, line length guidelines
- **Layout best practices** — how much whitespace to leave, safe zone usage, visual hierarchy (title → subtitle → body → footnote), rule of thirds
- **Common layout templates** — standard patterns (title slide, two-column, three-card, full-bleed image + text overlay, diagram + caption, bullet list) with SlideKit code examples for each
- **Color & contrast** — minimum contrast ratios for projected environments, dark vs light theme guidance
- **Content density** — when to split into two slides vs. fitting on one, maximum number of bullet points, when to use a diagram instead of text
- **Common mistakes** — the specific failure modes that motivated SlideKit (too much text, too small fonts, content clustered in center, etc.) and how to avoid them using SlideKit's features

This would function like a style guide that the model reads at the start of the presentation workflow, before writing any SlideKit code.

---

## Programmatic Linter (Between Phase 1 and Phase 2)

A linter that inspects the resolved scene graph and checks layout rules — without needing live editing or round-trip. This could slot between Phase 1 and Phase 2 because it only needs read access to the scene model (which Phase 1 already provides via `window.sk`).

### How it would work

After `render()`, the agent calls the linter from the console (via Playwright MCP):

```js
let issues = sk.lint()
// Returns:
// [
//   { rule: "font-too-small", severity: "error", element: "footnote", fontSize: 16, min: 20,
//     message: "Font size 16px on 'footnote' is below projection minimum (20px)" },
//   { rule: "collision", severity: "warning", elements: ["card1", "card2"], overlapArea: 1200,
//     message: "Elements 'card1' and 'card2' overlap by 1200px²" },
//   { rule: "outside-safe-zone", severity: "warning", element: "sidebar", edge: "right",
//     message: "Element 'sidebar' extends 30px beyond right safe zone boundary" },
// ]
```

### Lint rules

The linter checks rules that are already partially implemented as validation warnings in M4, but would be more comprehensive and configurable:

- **Font size minimums** — per-element-type thresholds (title, body, caption, footnote)
- **Bounding box collisions** — same-layer overlap detection
- **Safe zone violations** — elements outside or too close to safe zone
- **Slide bounds violations** — elements extending outside 1920×1080
- **Content density** — too much text, too many elements, content area usage
- **Alignment consistency** — elements that are *almost* aligned (off by 1-5px) likely should be exactly aligned
- **Font consistency** — too many different font sizes or families on one slide
- **Color contrast** — text over background with insufficient contrast (would need to sample background color at text position)
- **Orphaned elements** — elements that are fully occluded by other elements (z-order hiding)
- **Text overflow** — text that exceeds its container

### The workflow

Since this doesn't require live editing, the fix cycle would be:

1. Agent writes SlideKit spec → render
2. Agent calls `sk.lint()` from console → gets structured issues
3. Agent rewrites the SlideKit spec with fixes → re-render
4. Repeat until `sk.lint()` returns no issues (or only acceptable warnings)

This is faster than the current visual QA loop (export PDF → convert to JPEG → screenshot review) and doesn't require Phase 2's mutation API. The agent just reads the lint results and generates new code.

### Configuration

```js
sk.lint({
  rules: {
    "font-too-small": { min: 24, severity: "error" },
    "collision": { threshold: 100, severity: "warning" },  // ignore overlaps < 100px²
    "outside-safe-zone": { severity: "error" },
    "alignment-drift": { tolerance: 3, severity: "warning" },  // flag near-misses within 3px
  },
  ignore: ["bg-image"],  // element IDs to skip
})
```

---

## More Ideas (Add Here)

*(placeholder for future ideas)*

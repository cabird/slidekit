---
title: "Phase 5: Style Lock"
description: "Slide Writer in exemplar mode builds 2-3 representative sample slides for user approval before full deck assembly"
prereqs:
  - "Phase 4: Deck Blueprint"
---

**Driver**: Slide Writer agent (exemplar mode) + Orchestrator + user approval.
**User interaction**: Approve exemplar slides as the style reference for production.

### Steps

**Step 1 — Select exemplar slides.**
Choose 2-3 representative slides from the deck map that provide variety across the composition breakdown. Aim for diversity in content type — for example, one data-heavy or diagram-driven slide, one image-driven slide, and one text-focused slide. The exact selection depends on the deck's composition: pick slides that together exercise the most layout archetypes and visual treatments the deck will use. At least one hero moment slide should be included if the deck has any.

**Step 2 — Prepare exemplar inputs.**
For each selected slide, extract from `deck-plan.md`:

- The slide's creative spec section (the `[SLnnXX]` block — approximately 20-25 lines).
- The theme tokens `[MFTOKN]` (approximately 30 lines).

**Extract referenced cookbook recipes.** Collect all recipe IDs from the selected specs (e.g., if a spec says "Layout: Split (recipes: A3 + F3)"), then run:

```bash
python3 /tmp/extract_recipes.py --file /tmp/LAYOUT_COOKBOOK.md A3 F3
```

This outputs only the referenced recipes with full code. The Slide Writer receives these as layout pattern references.

These extracts, combined with the extracted recipes, the API quick reference (`/tmp/SLIDEKIT_API_QUICK_REFERENCE.md`), the AI authoring guide (`/tmp/AI_AUTHORING_GUIDE.md`), and the theme reference slides (`/tmp/theme_reference_slides.js`, if available — fetched in Phase 3), form the complete input for the Slide Writer. The Slide Writer does **not** receive the full deck-plan, the manifest, or any other slides' specs.

**Step 3 — Launch Slide Writer in exemplar mode.**
Read the agent instructions from `agents/slide_writer.md`. Launch the Slide Writer with:

- The extracted slide specs for the 2-3 selected slides.
- The theme tokens `[MFTOKN]`.
- The extracted cookbook recipes (from Step 2) for the layout patterns referenced in the specs.
- `/tmp/SLIDEKIT_API_QUICK_REFERENCE.md` — condensed API surface with signatures, property tables, and micro-recipes.
- `/tmp/AI_AUTHORING_GUIDE.md` — workflow, pitfalls, render-inspect-correct loop.
- The theme reference slides (`/tmp/theme_reference_slides.js`) — if the design language is based on an existing theme. This shows the theme author's idiomatic code patterns, helper functions, and template implementations.
- Mode indicator: exemplar (the agent writes all assigned slides into a single `slides_exemplar.js` file).

The agent produces `slides_exemplar.js` containing the 2-3 representative slides as complete, runnable SlideKit code.

**Step 4 — Prepare preview deck.**
Write a temporary `deck_config.js` that exports:

- `THEME` constants derived from the theme tokens `[MFTOKN]`.
- `IMAGES` manifest mapping image names to placeholder paths (use colored rectangles or a single sample image — full image generation is deferred to Phase 6).
- SlideKit API re-exports.

Write a temporary `slides.js` entry point that imports only `slides_exemplar.js`.

Per the deferred image generation strategy: generate only 1-2 sample images for the exemplar slides to demonstrate the AI image style. Use placeholder images (solid color blocks matching the palette, or a labeled "image placeholder" graphic) for the remaining image slots. This avoids paying for a full image set before the style is locked.

**Step 5 — Screenshot exemplar slides.**
Start the HTTP server if not already running (port 0 pattern). Navigate Playwright to `index.html`. Verify the exemplar slides load correctly (no console errors, `window.sk` exists). Take a screenshot of each exemplar slide.

**Step 6 — Present to user for approval.**
Show the screenshots to the user. Frame the ask clearly:

*"These 2-3 slides represent the visual style, code patterns, and layout approach for the entire deck. Once you approve, all remaining slides will be built to match this style. What do you think?"*

Highlight specific aspects worth evaluating:
- Typography: heading/body font pairing, size hierarchy.
- Color usage: palette application, contrast, semantic color use.
- Layout: spacing, alignment, visual hierarchy.
- Component usage: how SlideKit components are applied.
- Overall feel: does it match the approved design language?

**Step 7 — Iterate if needed.**
If the user requests changes:

- For **minor tweaks** (adjust a color, change font size, move an element): edit `slides_exemplar.js` directly — no agent re-launch needed. Re-screenshot and re-present.
- For **significant changes** (different layout approach, wrong tone, fundamental style issues): update the relevant slide specs in `deck-plan.md` to reflect the user's feedback. Optionally adjust theme tokens if the feedback affects global style. Re-launch the Slide Writer in exemplar mode with the updated inputs. Re-screenshot and re-present.

Repeat until the user approves.

**Step 8 — Lock the exemplar as style reference.**
Once approved, `slides_exemplar.js` becomes the authoritative style reference for Phase 6. All production Slide Writers will receive this file as their primary guide for code patterns, import conventions, variable naming, component usage, layout implementation, and visual treatment. The exemplar is more effective than a written style guide because the LLM can directly copy working code patterns.

**Step 9 — Git commit.**

```bash
git add -A
git commit -m "[phase 5/exemplar] lock-style: slides_exemplar.js — user approved"
```

**Step 10 — Update manifest.**
Set frontmatter: `phase: 6`, `status: in_progress`, `last_approval: "Style lock approved"`, `next_action: "Begin assembly — automated from here"`.

### Exit Criteria

- `slides_exemplar.js` contains 2-3 representative slides covering variety in content type and layout archetype.
- Exemplar slides render correctly in the browser (no console errors, correct layout).
- User has explicitly approved the exemplar as the style reference.
- Git commit recorded.
- Manifest updated: `phase: 6`, `next_action: "Begin assembly — automated from here"`.

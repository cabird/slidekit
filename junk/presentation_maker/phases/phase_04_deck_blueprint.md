---
title: "Phase 4: Deck Blueprint"
description: "Planner agent produces theme tokens, per-slide specs, and image plan using a two-pass strategy; orchestrator reviews and user approves"
prereqs:
  - "Phase 3: Design Language"
---

**Driver**: Planner agent + Orchestrator approval.
**User interaction**: Approve slide plan summary.

### Steps

**Step 1 — Prepare Planner inputs.**
Gather the inputs for the Planner's first pass:

- `presentation-manifest.md` — all sections: Content Summary [MFCONT], Story Arc [MFSARC], Design Language [MFDSGN].
- `/tmp/SLIDEKIT_DESIGN_REFERENCE.md` — code-free visual capabilities reference. Tells the Planner what SlideKit can and cannot do visually, so layout archetype choices are feasible.
- **Layout Cookbook Menu** — generate from the cookbook on demand:
  ```bash
  python3 /tmp/extract_recipes.py --file /tmp/LAYOUT_COOKBOOK.md --menu-md > /tmp/COOKBOOK_MENU.md
  ```
  This produces a code-free catalog of all 53 layout recipes with ID, name, intent, visual description, variations, and pairing notes. The Planner uses recipe IDs in spec outlines; the Slide Writer later receives only the referenced recipes with full code.
- Full theme description — if the approved design language is based on an existing theme (the `based_on_theme` field from Phase 3 is not "custom"), fetch the full theme description file for that theme. This gives the Planner detailed knowledge of available components, templates, and do's/don'ts for the chosen theme.

**Step 2 — Launch Planner: Pass 1 (Global Planning).**
Read the agent instructions from `agents/planner.md`. Launch the Planner with all inputs from Step 1. This pass always runs as a single agent invocation regardless of deck size.

Pass 1 reads the full manifest + SlideKit guide + theme description and produces:

#### Output A: Theme Tokens [MFTOKN]

A complete token table mapping every design decision to a concrete value. This is the Slide Writer's definitive reference:

| Token | Value | Usage |
|-------|-------|-------|
| color-primary | #1A365D | Headings, key accents |
| color-accent | #E94560 | CTAs, highlights, emphasis |
| color-bg | #FFFFFF | Slide backgrounds |
| color-surface | #F5F5F5 | Cards, panels, containers |
| color-text | #333333 | Body text |
| color-muted | #888888 | Captions, secondary info |
| font-heading | "Montserrat", sans-serif | All headings |
| font-body | "Open Sans", sans-serif | Body text, bullets |
| font-code | "Fira Code", monospace | Code blocks (if applicable) |
| spacing-section | 60px | Between major sections |
| shadow-card | 0 4px 12px rgba(0,0,0,0.08) | Card/panel shadows |
| radius-card | 8px | Card border radius |

Include: all colors (primary, accent, background, surface, text, muted, data-positive, data-negative), all fonts (heading, body, code), sizes (heading levels, body, caption, label), spacing (section, element, padding), effects (shadows, border radii, gradients).

#### Output B: Image Plan [MFIMGP]

A table of all images needed, with enough detail for image generation in Phase 6:

| Slide | Description | AI Prompt | Style Directive | Source | Status | Path |
|-------|-------------|-----------|-----------------|--------|--------|------|
| 01 | Opening hook visual | "Isometric city with..." | Isometric | generate | pending | hook_city.png |
| 04 | Architecture diagram | Adapt from source Fig. 3 | Flat Vector | adapt | pending | arch_diagram.png |
| 07 | Team photo | Reuse source slide 12 | -- | reuse | pending | team.jpg |

Each prompt must incorporate the AI image style approved in Phase 3. The **Source** column indicates provenance:

- `generate` — new AI-generated image, no source equivalent exists.
- `reuse` — carry forward an existing asset from the source material as-is.
- `adapt` — redraw or re-style an existing source asset to match the design language.

The Source column references the Content Analyst's source asset inventory from [MFCONT]. Status starts as `pending` for all entries.

#### Output C: Slides Status [MFSTAT]

Initialize the status tracking table with all slides set to `pending`:

| Slide | Title | Status | Writer | Iteration |
|-------|-------|--------|--------|-----------|
| 01 | Opening Hook | pending | -- | 0 |
| 02 | Context | pending | -- | 0 |

#### Output D: Brief Spec Outlines

For **each** slide in the deck map, write a brief spec outline of 3-5 lines. These are NOT full per-slide specs — they capture the strategic decisions while the full manifest context is available:

- Layout archetype for this slide, **with cookbook recipe IDs** (e.g., "Split: A3 + F3 variation"). The orchestrator will extract the full recipes by ID for the Slide Writer.
- Key content points (what text, data, or argument goes here).
- Image references (which image plan entries this slide uses).
- One-line composition note (mood, emphasis, pacing relative to neighbors).

Estimated total output for Pass 1: ~200-300 lines. This fits comfortably within context limits.

**Step 3 — Launch Planner: Pass 2 (Detailed Specs).**
Pass 2 expands the brief outlines into full per-slide creative specs. The orchestrator decides how to split based on slide count:

- **12 slides or fewer**: Single agent launch — write all specs at once.
- **13-20 slides**: Two batches (slides 1 to N/2, then N/2+1 to N).
- **More than 20 slides**: Batches of 8 slides each.

For each batch, provide the Planner with:

- Pass 1 output: theme tokens [MFTOKN] + all brief spec outlines (including recipe IDs).
- `/tmp/SLIDEKIT_DESIGN_REFERENCE.md` (layout feasibility reference).
- For batches after the first: include the previous batch's last completed spec for transition continuity and consistent style.

Pass 2 does NOT need the full manifest — all creative decisions are already baked into the tokens and outlines from Pass 1. This dramatically reduces context pressure.

Each batch writes full per-slide specs to `deck-plan.md`, one section per slide, ID'd as `[SL01XX]`, `[SL02XX]`, etc. Each spec includes:

- **Content**: Exact text — headlines, bullet points, callout quotes, data points. Use the source's actual language where possible; do not paraphrase unnecessarily.
- **Layout archetype**: Which archetype from the design language, and how it's adapted for this slide.
- **Typography**: Which fonts, sizes, weights, and colors for each text element. Reference token names.
- **Color usage**: Background treatment, panel colors, gradient directions. Reference semantic color tokens.
- **Composition notes**: Mood of this slide, pacing relative to neighbors, techniques (progressive reveal, contrast, visual metaphor).
- **Image references**: Which image plan entries this slide uses, placement, sizing, overlay treatment.
- **Speaker notes**: What the presenter should say (not just what's on the slide).
- **Build/animation notes**: Progressive reveals, transitions, entrance animations.
- **Status**: `pending`.

Target ~20-25 lines of structured data per slide. The SlideKit guide + exemplar (in later phases) provide implementation context that does not need repeating in every spec.

**Step 4 — Orchestrator review.**
Before showing anything to the user, review the complete plan for quality:

- **Pacing**: Does the layout sequence vary? Reject 5 Hero slides in a row or 5 text-focused slides in a row. Ensure visual rhythm.
- **Visual alignment**: Do visual choices match the approved AI image style and design language tokens?
- **Hero treatment**: Are hero moments (marked in [MFSARC]) getting appropriately dramatic layouts, full-bleed images, or elevated visual investment?
- **Completeness**: Does every slide have concrete content text, not placeholders like "TBD" or "insert content here"?
- **Token consistency**: Do slide specs reference tokens from the [MFTOKN] table? No orphan colors or fonts.
- **Image plan coverage**: Does every slide that needs visuals have an entry in [MFIMGP]? Are source attributions (generate/reuse/adapt) correct based on [MFCONT] asset inventory?

If issues are found, re-launch the Planner for the affected sections with specific feedback.

**Step 5 — Present summary to user.**
Do **not** show the user the full plan (it's too detailed and long). Instead, present a concise summary:

- Total slide count.
- Breakdown by layout archetype (e.g., "4 Hero, 6 Split, 3 Diagram Canvas, 2 Section Divider").
- Breakdown by visual source (e.g., "8 AI-generated images, 2 reused assets, 1 adapted diagram, 3 text-only").
- List of hero moment slides with their titles and planned treatment.
- Total images to generate (new) vs. reuse/adapt from source.
- Any notable creative choices worth highlighting (unusual layouts, bold visual decisions, pacing strategies).

**Step 6 — User approval.**
The user approves the plan or requests adjustments. If adjustments are needed:

- For minor tweaks: the orchestrator edits the deck-plan directly (no agent re-launch).
- For structural changes (reorder slides, change arc emphasis, add/remove slides): re-launch the Planner with updated manifest content and specific instructions.
- Iterate until the user approves.

This is the **last user checkpoint** before production begins. After approval, Phases 5-6 are automated (with user review only at the end in Phase 7).

**Step 7 — Git commit.**

```bash
git add -A
git commit -m "[phase 4/planner] plan: deck-plan — theme tokens + slide specs + image plan"
```

**Step 8 — Update manifest.**
Set frontmatter: `phase: 5`, `status: in_progress`, `last_approval: "Slide plan approved"`, `next_action: "Style lock — launch Slide Writer in exemplar mode"`. Update `slides_total` with the final slide count.

### Exit Criteria

- Theme Tokens [MFTOKN] complete with all design tokens in `deck-plan.md`.
- Every slide has a full creative spec in `deck-plan.md` with concrete content text (no placeholders).
- Image Plan [MFIMGP] complete with prompts, style directives, and source attribution for all images.
- Slides Status [MFSTAT] initialized with all slides as `pending`.
- Pacing and visual variety verified by orchestrator.
- User has approved the plan summary.
- Git commit recorded.
- Manifest updated to phase 5.

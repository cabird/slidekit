---
title: "Phase 3: Design Language"
description: "Design Director proposes 4 visual directions as structured token specs, orchestrator renders previews, user selects visual direction"
prereqs:
  - "Phase 2: Story & Structure"
---

**Driver**: Design Director agent + Orchestrator.
**User interaction**: View rendered previews, select visual direction, optionally mix elements.

### Steps

**Step 1 — Launch Design Director agent.**
Read the agent instructions from `agents/design_director.md`. Provide the agent with:

- `presentation-manifest.md` — specifically: Content Summary [MFCONT] (audience, tone, goal), Story Arc [MFSARC] (approved arc, deck map, composition breakdown, hero moments).
- `THEMES.md` — the theme catalog with synopses only (2-3 lines per theme). Do NOT provide full theme descriptions (400-700 lines each); the catalog synopses are sufficient for the agent to reference or adapt existing themes.
- `/tmp/SLIDEKIT_DESIGN_REFERENCE.md` — the code-free visual capabilities reference. This tells the Design Director what compositions SlideKit supports, canvas/safe zone constraints, typography limits, and what SlideKit cannot do -- so proposed directions are feasible.

The agent proposes exactly 4 visual directions as structured token specs.

**Step 2 — Validate structured output.**
Each of the 4 directions must be a structured spec in this format:

```yaml
direction:
  name: "Direction Name"
  mood: "One paragraph describing the emotional feel and aesthetic DNA"
  based_on_theme: "theme_slug"  # or "custom" if not adapting an existing theme
  modifications: "What changes from the base theme, if any"
  palette:
    primary: "#hex"
    accent: "#hex"
    background: "#hex"
    surface: "#hex"
    text: "#hex"
    muted: "#hex"
  typography:
    heading: "Google Font Name"
    body: "Google Font Name"
    code: "Google Font Name"  # if applicable
    scale: 1.0  # relative sizing factor
  image_style: "Detailed description of AI image style for consistent generation"
  layout_preferences:
    - "archetype-1"
    - "archetype-2"
    - "archetype-3"
  color_semantics:
    data_positive: "#hex"
    data_negative: "#hex"
    emphasis: "#hex"
    de_emphasis: "#hex"
  projector_notes: "Contrast ratios, minimum font sizes, projection safety notes"
  rationale: "Why this direction serves the content, audience, and arc"
```

Verify all 4 directions are complete and have valid hex codes, real Google Fonts, and substantive rationale. If any direction is incomplete, request the agent to revise.

**Step 3 — Render theme previews.**
Use the theme preview pipeline to produce visual screenshots of each direction:

1. Extract each direction's structured spec from the agent's output.
2. For each direction, generate a `theme_config_N.json` file by mapping the spec fields to the JSON config schema expected by `theme_preview.js`.
3. Run `theme_preview.js` with each config. This template renders 4-5 canonical sample slides:
   - **Title slide** — heading font, primary/accent colors, background treatment.
   - **Content + image slide** — body font, text/image layout, color hierarchy.
   - **Data/chart slide** — data colors, chart styling, number formatting.
   - **Section break** — accent usage, transition feel.
   - **Hero moment** — full-bleed image treatment, dramatic layout.
4. Screenshot each rendered preview via Playwright — producing `direction_1.png` through `direction_4.png`.

The theme preview pipeline keeps the Design Director code-free. Rendering is deterministic and owned by the orchestrator. The template uses actual SlideKit rendering, so previews are honest representations of what the final deck will look like.

**Step 4 — Present previews to user.**
Show the 4 rendered preview screenshots to the user alongside the direction names, mood descriptions, and rationale. The user may:

- Select one direction as-is.
- Mix elements from multiple directions (e.g., "colors from A, typography from C").
- Request modifications to a direction (e.g., "make the background warmer").

If the user wants a composite or modification:
1. Merge the relevant specs by overriding fields (e.g., take direction A's palette but direction C's typography). This is a mechanical operation on the structured data.
2. Re-render the merged spec using the same preview pipeline.
3. Present the new preview screenshot.
4. Iterate until the user approves.

No agent re-launch is needed for mixing or tweaking — the orchestrator modifies specs and re-renders directly. This allows fast iteration without burning agent invocations.

**Step 5 — AI image style confirmation.**
The approved direction includes an `image_style` field. Present it to the user for confirmation. The image style categories to reference:

- **Photographic**: Modern Corporate Photography, Cinematic & Dramatic.
- **Clean Technical**: Flat Vector, Isometric, Blueprint / Technical Drawing.
- **Creative**: Line Art, Whiteboard Sketch, Watercolor, 3D Clay Icons.
- **Abstract**: Gradient Shapes, Geometric Patterns.

Ensure the `image_style` description is detailed enough that image generation prompts can reference it consistently (e.g., *"Isometric 3D illustration, soft shadows, pastel color palette, white background"*).

**Step 6 — Validate layout archetypes.**
The approved direction includes `layout_preferences`. Verify that 4-6 reusable layout archetypes are established, each specifying general principles (proportions, text placement, visual weight distribution). Expand if the direction only listed a few. Common archetypes:

- **Hero**: Full-bleed background image with centered text overlay.
- **Split**: Left/right or top/bottom division — content on one side, visual on the other.
- **Diagram Canvas**: Large central area for diagrams or charts, minimal surrounding text.
- **Data Panel**: Structured grid for data, metrics, or comparisons.
- **Quote / Statement**: Large centered text with attribution, minimal visual noise.
- **Section Divider**: Bold title slide marking a new section of the presentation.

**Step 7 — Validate color semantics.**
Verify the approved direction's `color_semantics` maps colors to meanings. If the presentation involves data, metrics, comparisons, or status indicators, explicit color semantics prevent arbitrary color use and ensure visual consistency carries meaning. Example:

- Blue = infrastructure / platform concepts
- Green = success / growth metrics
- Orange = warnings / attention points
- Gray = context / background information

**Step 8 — Validate projector robustness.**
Verify the approved direction's `projector_notes` cover minimum requirements for readability on projectors:

- Minimum contrast ratio between text and background.
- Minimum font sizes for body text, headings, and labels.
- Minimum line weights for diagrams and charts.
- Avoidance of problematic color combinations (e.g., red on blue, low-saturation pairs).

**Step 9 — Fetch theme reference slides.**
If the approved direction is based on an existing theme (`based_on_theme` is not `"custom"`), fetch the theme's `slides.js` from the theme repository:

```bash
curl -sL "https://raw.githubusercontent.com/cabird/slide_themes/main/<theme_slug>/slides.js" \
  -o /tmp/theme_reference_slides.js
```

This file contains the theme author's working code: design tokens, helper functions, and complete implementations of each template slide type (title, content, data, section break, hero, etc.). It serves as a code-level reference for the Slide Writer in Phases 5-6 — showing idiomatic patterns for how slides in this theme are constructed. Store it in `/tmp/` alongside the other reference docs.

If the direction is `"custom"` (not based on any existing theme), skip this step — no theme reference slides exist.

**Step 10 — Record in manifest.**
Write the approved visual direction to the Design Language [MFDSGN] section of `presentation-manifest.md`. Record the complete structured spec: palette with hex codes, typography with font names, image style, layout archetypes, color semantics, and projector robustness rules. Also record which base theme it adapts (if any) — if it's based on an existing theme, the orchestrator will fetch the full theme description later for the Planner.

**Step 11 — Git commit.**

```bash
git add -A
git commit -m "[phase 3/orch] design: manifest — design language + visual direction"
```

**Step 12 — Update manifest.**
Set frontmatter: `phase: 4`, `status: in_progress`, `last_approval: "Design language approved"`, `next_action: "Launch Planner agent"`.

### Exit Criteria

- Exactly 4 visual directions proposed with complete structured token specs.
- Theme previews rendered and presented to user as screenshots.
- One direction selected (or composite approved) with full palette (hex codes) and typography (Google Fonts).
- AI image style confirmed and described in detail.
- 4-6 layout archetypes established.
- Color semantics documented.
- Projector robustness requirements specified.
- User has explicitly approved the design language.
- Git commit recorded.
- Manifest updated to phase 4.

**Note**: This phase produces design *specifications* as structured data, not code. The Design Director never writes CSS, HTML, or SlideKit code. The theme preview pipeline handles all rendering mechanically. The Planner (Phase 4) translates these specifications into concrete theme tokens and slide-level implementation guidance.

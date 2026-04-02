---
title: "Phase 2: Story & Structure"
description: "Narrative Designer proposes 3-5 story arcs, user selects one, deck map with hero moments and composition breakdown is built"
prereqs:
  - "Phase 1: Content Ingestion"
---

**Driver**: Narrative Designer agent + Orchestrator + optional PAL MCP.
**User interaction**: Select story arc, approve deck map.

### Prerequisite

Before starting this phase, the orchestrator (or the Narrative Designer agent) should read `appendix_design_guide.md` (Conceptual Design Guide) for principles on structuring arguments, building throughlines, progressive disclosure, and identifying hero moments.

### Steps

**Step 1 -- Launch Narrative Designer agent (arc proposals).**
Read the agent instructions from `agents/narrative_designer.md`. Provide the agent with the manifest path, specifically the Content Summary `[MFCONT]` section. The agent proposes **3-5 story arcs**, each with:

- A name and one-paragraph description.
- The narrative structure (e.g., Problem -> Solution -> Impact, Journey, Comparison, Build-Up).
- A throughline statement (the single thread connecting every slide).
- Concrete rationale: why this arc works for this content and this audience.
- Potential weaknesses or trade-offs.

The arcs must be meaningfully different from each other -- not just variations on the same structure. They should represent genuinely distinct ways to organize and present the material.

**Step 2 -- External review (optional).**
If the manifest frontmatter has `pal_mcp: true` (detected in Phase 0), submit the proposed arcs to an external model via PAL MCP for critique: *"Which arc is strongest for this audience and goal? What weaknesses do you see? Are there alternative structures worth considering?"* Incorporate feedback. If PAL is not available, skip this step — the orchestrator presents arcs directly to the user.

**Step 3 -- Present arcs to user.**
Show the 4 proposed arcs (with external feedback if available) to the user. The user may:
- Select one arc as-is.
- Modify an arc (combine elements, change emphasis).
- Propose an entirely different structure.

Iterate until the user approves a story arc.

**Step 4 -- Launch Narrative Designer agent (deck map).**
Re-launch the Narrative Designer agent with the approved arc recorded in the manifest. The agent builds the deck map -- a rough slide list based on the approved arc:

| Slide | Working Title | Purpose (verb phrase) | Content Type |
|-------|--------------|----------------------|--------------|
| 01 | Opening Hook | Grab attention with the core problem | image-driven |
| 02 | Context | Set the stage with background | text-focused |
| ... | ... | ... | ... |

Content type hints: `data-heavy`, `diagram-driven`, `image-driven`, `text-focused`, `code/demo`, `section-break`.

The agent also produces:

- **Hero moments**: 2-4 slide numbers with justification (the emotional or intellectual peaks of the presentation that receive extra visual investment -- full-bleed images, dramatic layouts, careful pacing).
- **Composition breakdown**: Percentages by content type (e.g., "40% diagram-driven, 30% image-driven, 15% text-focused, 10% code/demo, 5% section-break"). This guides design decisions in Phase 3 and helps the Planner allocate visual effort.
- **Throughline statement** (final version, refined from the arc proposal).

**Step 5 -- Present deck map and iterate.**
Show the complete deck map to the user. Iterate until approved. Pay attention to:
- Does the flow feel natural?
- Are transitions logical?
- Is the pacing varied (not all dense slides in a row)?
- Do hero moments land at the right points?

**Step 6 -- Record in manifest.**
Write the approved arc, throughline, deck map, composition summary, and hero moments to the Story Arc `[MFSARC]` section.

**Step 7 -- Git commit.**

```bash
git add -A
git commit -m "[phase 2/orch] arc: manifest -- story arc + deck map"
```

**Step 8 -- Update manifest.**
Set frontmatter: `phase: 3`, `status: in_progress`, `last_approval: "Story arc and deck map approved"`, `next_action: "Launch Design Director agent"`.

### Exit Criteria

- Story arc selected and recorded with rationale and throughline.
- Deck map complete with slide titles, purposes, and content type hints.
- Hero moments identified (2-4 slides) with justification.
- Composition breakdown calculated.
- User has explicitly approved both the arc and the deck map.
- Git commit recorded.
- Manifest updated: `phase: 3`, `next_action: "Launch Design Director agent"`.

---
title: "Presentation Manifest Format"
description: "Presentation manifest structure — YAML frontmatter, body sections, navigation protocol"
prereqs:
  - "Workflow Phases Overview"
---

The manifest is `presentation-manifest.md`, created in Phase 0 and updated continuously throughout the workflow. It serves three roles:

1. **Single source of truth** for all presentation decisions (content, design, structure).
2. **Resumable notebook** — a fresh agent reading the manifest + deck-plan must be able to continue the workflow without any conversation history.
3. **Status tracker** for the orchestrator to know what phase the project is in and what's next.

> The manifest owns **intent and decisions**. Execution details (theme tokens, slide specs, image plan, slides status) live in `deck-plan.md`. See Decision 2 in decisions.md.

### YAML Frontmatter

The manifest starts with YAML frontmatter that tracks workflow state:

```yaml
---
# WORKFLOW STATE
phase: 0
phase_name: Project Setup
status: in_progress
next_action: Scaffold project and init manifest
last_approval: null
open_questions: []
slides_total: 0
slides_complete: 0
slides_in_progress: 0
current_batch: []
---
```

The orchestrator reads and updates this frontmatter at every phase transition. Fields:

- **phase** / **phase_name**: Current workflow phase (0–7).
- **status**: `in_progress`, `awaiting_approval`, `blocked`, or `complete`.
- **next_action**: One-line description of what happens next.
- **last_approval**: What the user last approved (for audit trail).
- **open_questions**: List of unresolved questions for the user.
- **slides_total** / **slides_complete** / **slides_in_progress**: Slide-level progress counters.
- **current_batch**: List of slide IDs currently being worked on (Phase 6).

### Body Sections

Each section has a unique 6-character ID in square brackets for grep-based navigation. Agents locate their sections by grepping for the ID.

1. **Metadata [MFMETA]** — Title, subtitle, author, date, audience, tone, target slide count, talk duration.

2. **Content Summary [MFCONT]** — Populated in Phase 1. Contains: exhaustive key points extracted from source material, structured summary, source asset inventory (images, figures, charts with reuse assessments), all user answers to context questions (audience, goal, tone, length, existing assets), raw stats.

3. **Story Arc [MFSARC]** — Populated in Phase 2. Contains: selected narrative structure and rationale, throughline statement, deck map (slide list with titles and purposes), composition summary (percentage breakdown by content type), hero moments (2–4 emotional/intellectual peaks).

4. **Design Language [MFDSGN]** — Populated in Phase 3. Contains: structured design token specs (palette hex codes, typography with Google Fonts, AI image style directive, layout preferences, color semantics, projector robustness notes).

5. **Review Notes [MFREVW]** — Updated during Phase 7. Each entry records: date, reviewer feedback, slides affected, changes made.

> **Note:** Theme Tokens [MFTOKN], Image Plan [MFIMGP], Slides Status [MFSTAT], and Per-Slide Specs live in `deck-plan.md` (not in the manifest). See Decision 2 in decisions.md for rationale. The manifest owns intent and decisions; the deck plan owns execution details.

### Navigation Protocol

- **Orchestrator**: Reads YAML frontmatter + Slides Status [MFSTAT] to determine workflow state and progress.
- **Sub-agents**: Grep for their assigned section ID (e.g., `grep -n "MFDSGN" presentation-manifest.md`) to jump directly to relevant content.
- **Slide Writers**: Don't read the manifest directly. The orchestrator extracts their assigned spec from `deck-plan.md` and provides it as input.

### Cold-Start Test

Periodically ask: *"If I lost all conversation history and only had the manifest, could a fresh agent continue?"* If the answer is no, the manifest is missing critical information. Update it immediately. Every decision, every user preference, every design choice must be recorded in the manifest.

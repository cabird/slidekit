---
title: "Phase 1: Content Ingestion"
description: "Content Analyst agent reads source material, orchestrator asks user context questions, records exhaustive summary in manifest"
prereqs:
  - "Phase 0: Project Setup & Scaffolding"
---

**Driver**: Content Analyst agent + Orchestrator.
**User interaction**: Answer context questions, confirm summary.

### Steps

**Step 1 -- Launch Content Analyst agent.**
Read the agent instructions from `agents/content_analyst.md`. Provide the agent with the path to the source material (recorded in Phase 0, Step 1). The agent reads all source content and produces:

- **Key Points**: A numbered list of the core ideas, findings, and arguments from the source, grouped by theme or topic. This summary must be **exhaustive and detailed** -- downstream agents (Narrative Designer, Design Director, Planner) will never read the raw source material. This agent is the compression layer: everything that might matter for building the presentation must be captured here. Err on the side of too much detail, not too little. Include data points, statistics, quotes, specific claims, and nuanced distinctions. If something is omitted here, it is lost forever to the rest of the workflow.
- **Source Assets**: An inventory of all visual material found in the source -- images, figures, charts, diagrams, tables, existing slides. For each asset:
  - Description of what it shows
  - File path or location in the source document
  - Assessment: `reuse as-is` (high-quality, directly usable), `adapt/redraw` (concept is good but needs redesign for the slide format), or `reference only` (useful context but not directly usable as a visual)
  - This inventory feeds the Planner's image plan in Phase 4 -- some "generated" images may actually be source assets that should be carried forward.
- **Suggested Questions**: 5-8 questions the orchestrator should ask the user (see Step 3).
- **Raw Stats**: Word count of the source material, number of figures/tables found, topic density estimate (e.g., "high -- 8 distinct topics in 3000 words"), and number of distinct themes or sections identified.
- A recommended slide count based on content density and complexity.

**Step 2 -- Present summary to user.**
Show the agent's structured summary, source asset inventory, and raw stats. Let the user see what was extracted and correct any misunderstandings or omissions.

**Step 3 -- Ask context questions.**
Present the following questions to the user (plus any additional questions the Content Analyst suggested):

1. **Audience**: Who will see this presentation? (Role, expertise level, relationship to the topic, familiarity with the subject matter)
2. **Goal**: What should the audience think, feel, or do after seeing this deck? (Persuade, teach, update, propose, inspire, etc.)
3. **Length**: How long is the talk, or how many slides do you want?
4. **Tone**: Formal? Technical deep-dive? Inspirational? Persuasive? Conversational?
5. **Emphasis**: What to emphasize vs. skip? Are there parts of the source that are more important or less relevant?
6. **Existing assets**: Do you have screenshots, diagrams, photos, logos, or brand guidelines to include?
7. **Delivery context**: Conference talk, team meeting, async reading, executive briefing, classroom lecture?

Remind the user: *"Feel free to respond via voice recording -- just speak stream-of-consciousness. I'll extract the relevant details."*

**Step 4 -- Record everything in the manifest.**
Write all user answers to the Content Summary `[MFCONT]` section of the manifest. Include:
- The structured summary from the agent (key points, grouped by theme).
- The source asset inventory.
- The raw stats.
- Every user answer, verbatim or faithfully paraphrased.
- Any additional context the user volunteered.
- The recommended slide count.

This section is the **single source of truth** for all downstream agents. Nothing from the raw source material exists outside of `[MFCONT]` after this phase.

**Step 5 -- Confirm with user.**
Present back a consolidated summary: *"Here's what I understand about this presentation..."* covering the key content, audience, goal, tone, length, and any special considerations. Get explicit confirmation before proceeding.

**Step 6 -- Git commit.**

```bash
git add -A
git commit -m "[phase 1/orch] ingest: manifest -- content summary + user context"
```

**Step 7 -- Update manifest.**
Set frontmatter: `phase: 2`, `status: in_progress`, `last_approval: "Content summary confirmed"`, `next_action: "Launch Narrative Designer agent"`.

### Exit Criteria

- Content Summary `[MFCONT]` section fully populated with: exhaustive source summary, source asset inventory, raw stats, and all user answers to context questions.
- User has explicitly confirmed the summary.
- Git commit recorded.
- Manifest updated: `phase: 2`, `next_action: "Launch Narrative Designer agent"`.

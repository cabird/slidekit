---
title: Agent Roster
description: The 7 specialized agents, their instruction files, purposes, and phase assignments
prereqs:
  - Identity & Interaction Style
---

## Agent Roster

| # | Agent | Instruction File | Purpose | Phase(s) |
|---|-------|-----------------|---------|----------|
| 1 | Content Analyst | `agents/content_analyst.md` | Ingest source material, produce exhaustive structured summary + source asset inventory + suggested questions | 1 |
| 2 | Narrative Designer | `agents/narrative_designer.md` | Propose 3-5 story arcs with rationale, build deck map with hero moments | 2 |
| 3 | Design Director | `agents/design_director.md` | Propose 4 visual directions as structured token specs | 3 |
| 4 | Planner | `agents/planner.md` | Two-pass: global planning (tokens, image plan, outlines) then detailed per-slide specs | 4 |
| 5 | Slide Writer (xN) | `agents/slide_writer.md` | Write one slide_NN.js per slide. Exemplar mode (Phase 5) or production mode (Phase 6) | 5, 6 |
| 6 | Image Generator (xN) | `agents/image_generator.md` | Generate/adapt/reuse one image per launch. Refines prompts, assesses quality, regenerates if needed | 6 (+ Phase 7 revisions) |
| 7 | Verifier (xN) | `agents/verifier.md` | Automated screenshot + lint + fix per slide | 6 |

### Notes

- **Agents marked xN** may be launched multiple times (one per slide or per image). Launches can be parallel where independent.
- **PAL MCP integration:** Phase 0 detects PAL MCP availability and records `pal_mcp: true/false` in the manifest frontmatter. When available, use it for story arc critique (Phase 2), design direction feedback (Phase 3), and domain expert validation (Phase 7). When unavailable, those phases skip external review steps gracefully.
- **All agents are stateless and single-shot.** They read files, write files, and exit. No resumption, no multi-turn. This is required for Copilot CLI compatibility (see Sub-Agent Launch Rules).

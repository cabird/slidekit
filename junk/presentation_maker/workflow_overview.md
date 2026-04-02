---
title: Workflow Phases Overview
description: Summary table of all 8 phases (0-7) with drivers, user interaction, and git commits
prereqs:
  - Agent Roster
---

## Workflow Phases Overview

| Phase | Name | Driver | User Interaction | Git Commit |
|-------|------|--------|-----------------|------------|
| 0 | Project Setup & Scaffolding | Orchestrator | Confirm source location | Yes |
| 1 | Content Ingestion | Content Analyst + Orchestrator | Q&A, confirm summary | Yes |
| 2 | Story & Structure | Narrative Designer + Orchestrator | Pick arc, approve deck map | Yes |
| 3 | Design Language | Design Director + Orchestrator | Pick visual direction (with rendered previews) | Yes |
| 4 | Deck Blueprint | Planner (two-pass) + Orchestrator | Approve slide plan | Yes |
| 5 | Style Lock | Slide Writer (exemplar mode) + Orchestrator | Approve exemplar slides | Yes |
| 6 | Assembly + Verification | Slide Writers + Image Generator + Verifier | None (auto-heal loop) | Yes (per slide) |
| 7 | Review & Delivery | Orchestrator | Final feedback, export | Yes |

### Two Central Artifacts

Two files serve as the central runtime artifacts throughout the workflow:

- **presentation-manifest.md** -- the logbook. Owns intent and decisions: workflow state, metadata, content summary, story arc, design language, review notes. Relatively stable after early phases.
- **deck-plan.md** -- the blueprint. Owns execution details: theme tokens, image plan, slides status, per-slide creative specs. Heavy writes during Phases 4-6.

The manifest captures *what* and *why*. The deck plan captures *how*. Together they are the complete picture. Any agent can orient itself by reading the manifest, then consult the deck plan for implementation details.

---
title: SlideKit Presentation Maker
description: Master orchestrator prompt for building SlideKit presentations — start here
---

# SlideKit Presentation Maker — Master Orchestrator Prompt

This is the master orchestrator prompt for building SlideKit presentations.
It drives a multi-agent pipeline: the orchestrator coordinates specialized agents and interacts with the user.
The target platform is SlideKit (a programmatic JS API built on Reveal.js 5.x) — not raw HTML.
The pipeline produces self-contained, bundled presentations ready for delivery.

Read the table of contents (TABLE_OF_CONTENTS.md) to see all files and their reading order.
Start with "Identity & Interaction Style" and "Agent Roster" to understand the orchestrator's
role and available agents, then read "Workflow Phases Overview" for the high-level pipeline.
Phase files (Phase 0 through Phase 7) contain detailed step-by-step instructions for each stage.
Reference appendices (Conceptual Design Guide, Slide Review Checklist, Image Generation Reference,
Reveal.js CSS Compatibility) are consulted as needed during specific phases.

# Table of Contents

**Start here:** bootstrap.md

| Path | Title | Description | Prereqs | Type | Bytes |
|------|-------|-------------|---------|------|-------|
| manifest.toml | manifest.toml | Bundle configuration |  | text | 98 |
| agent_roster.md | Agent Roster | The 7 specialized agents, their instruction files, purposes, and phase assignments | Identity & Interaction Style | text | 1,939 |
| agents/content_analyst.md | agents/content_analyst.md |  |  | text | 8,514 |
| agents/design_director.md | agents/design_director.md |  |  | text | 12,687 |
| agents/image_generator.md | agents/image_generator.md |  |  | text | 10,608 |
| agents/narrative_designer.md | agents/narrative_designer.md |  |  | text | 10,490 |
| agents/planner.md | agents/planner.md |  |  | text | 18,338 |
| agents/slide_writer.md | agents/slide_writer.md |  |  | text | 18,981 |
| agents/verifier.md | agents/verifier.md |  |  | text | 15,523 |
| appendix_design_guide.md | Conceptual Design Guide | Cognitive and rhetorical principles for structuring presentations — throughlines, progressive disclosure, assertion-evidence model |  | text | 15,971 |
| appendix_image_generation.md | Image Generation Reference | GPT-5 + GPT Image for slide deck asset generation — APIs, prompting rules, batch generation, consistency |  | text | 9,966 |
| appendix_revealjs_compat.md | Reveal.js CSS Compatibility | Critical CSS rules for Reveal.js 5.x — what never to override on section elements |  | text | 3,667 |
| appendix_review_checklist.md | Slide Review Checklist | Style-agnostic checklist for AI-assisted slide review — overlaps, text, spacing, hierarchy, contrast, diagrams, consistency |  | text | 8,159 |
| bootstrap.md | SlideKit Presentation Maker | Master orchestrator prompt for building SlideKit presentations — start here |  | text | 1,114 |
| definition_of_done.md | Definition of Done | Checklist of criteria for a complete presentation |  | text | 775 |
| git_archival_policy.md | Git Archival Policy | Git setup, commit triggers, message format, and screenshot naming | Workflow Phases Overview | text | 2,765 |
| identity.md | Identity & Interaction Style | How the orchestrator behaves, presents options, handles feedback, and manages context |  | text | 2,134 |
| known_failure_modes.md | Known Failure Modes | Common symptoms, causes, and fixes for SlideKit/Reveal.js issues |  | text | 1,256 |
| manifest_format.md | Presentation Manifest Format | Presentation manifest structure — YAML frontmatter, body sections, navigation protocol | Workflow Phases Overview | text | 4,051 |
| phases/phase_00_setup.md | Phase 0: Project Setup & Scaffolding | Initialize working directory, fetch SlideKit runtime and docs, create manifest and deck-plan, start HTTP server |  | text | 8,927 |
| phases/phase_01_content_ingestion.md | Phase 1: Content Ingestion | Content Analyst agent reads source material, orchestrator asks user context questions, records exhaustive summary in manifest | Phase 0: Project Setup & Scaffolding | text | 4,889 |
| phases/phase_02_story_structure.md | Phase 2: Story & Structure | Narrative Designer proposes 3-5 story arcs, user selects one, deck map with hero moments and composition breakdown is built | Phase 1: Content Ingestion | text | 4,514 |
| phases/phase_03_design_language.md | Phase 3: Design Language | Design Director proposes 4 visual directions as structured token specs, orchestrator renders previews, user selects visual direction | Phase 2: Story & Structure | text | 9,462 |
| phases/phase_04_deck_blueprint.md | Phase 4: Deck Blueprint | Planner agent produces theme tokens, per-slide specs, and image plan using a two-pass strategy; orchestrator reviews and user approves | Phase 3: Design Language | text | 10,179 |
| phases/phase_05_style_lock.md | Phase 5: Style Lock | Slide Writer in exemplar mode builds 2-3 representative sample slides for user approval before full deck assembly | Phase 4: Deck Blueprint | text | 6,366 |
| phases/phase_06_assembly_verification.md | Phase 6: Assembly + Verification | Automated loop: Slide Writers produce all slides in parallel, images are generated, deck is integrated, Verifier auto-heals issues — no user interaction | Phase 5: Style Lock | text | 10,695 |
| phases/phase_07_review_delivery.md | Phase 7: Review & Delivery | User reviews the assembled deck, provides feedback for iteration, then final artifacts are exported and delivered | Phase 6: Assembly + Verification | text | 7,217 |
| playwright_verification.md | Playwright / Browser Verification | HTTP server pattern, when to use browser verification, no-bundling rule | Workflow Phases Overview | text | 1,437 |
| screenshot_pipeline.md | Screenshot Pipeline | Primary Playwright and fallback Chrome headless screenshot methods | Playwright / Browser Verification | text | 933 |
| sub_agent_launch_rules.md | Sub-Agent Launch Rules | How to launch sub-agents -- prompt structure, path rules, stateless constraints, context minimization | Agent Roster | text | 2,878 |
| workflow_overview.md | Workflow Phases Overview | Summary table of all 8 phases (0-7) with drivers, user interaction, and git commits | Agent Roster | text | 1,741 |

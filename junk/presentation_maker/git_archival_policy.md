---
title: "Git Archival Policy"
description: "Git setup, commit triggers, message format, and screenshot naming"
prereqs:
  - "Workflow Phases Overview"
---

Every presentation working directory is a git repository. This enables diff-based review of how slides evolve and provides full history for debugging layout issues.

### Setup

Run `git init` during Phase 0, immediately after creating the working directory. Configure a repo-local identity so commits are attributed consistently regardless of the host machine:

```bash
git init
git config user.name "SlideKit Orchestrator"
git config user.email "orchestrator@local"
```

### What to Commit

Commit **all** artifacts: slides, images, screenshots, logs, plans, bundles. This repo is archival, not for publishing. Nothing is too large or too trivial — commit everything so the full history of the deck is recoverable.

### When to Commit

Commit after each phase boundary. Phase 6 uses per-slide granularity:

| Phase | Trigger | Commit |
|-------|---------|--------|
| 0 | Scaffold complete | One commit |
| 1 | Content ingested, user Q&A recorded | One commit |
| 2 | Story arc approved | One commit |
| 3 | Design language approved | One commit |
| 4 | Deck blueprint completed | One commit |
| 5 | Exemplar slides approved (style lock) | One commit |
| 6 | Each slide_NN.js written | One commit per slide |
| 6 | Images generated | One commit |
| 6 | slides.js + deck_config.js assembled | One commit |
| 6 | Each verification pass | One commit per pass |
| 7 | After each review iteration cycle | One commit |
| 7 | Final bundle | One commit |

### Commit Message Format

```
[phase N/<agent-or-orch>] <verb>: <artifact> — <short description>
```

Use lowercase. The agent name matches the agent file (e.g., `slide-writer`, `verifier`, `planner`). Use `orch` for orchestrator-driven commits.

**Examples:**

```
[phase 0/orch] init: scaffold SlideKit deck repo
[phase 4/planner] plan: deck-plan — theme tokens + slide specs + image plan
[phase 6/slide-writer] slide 04: "Architecture" — initial implementation
[phase 6/verifier] fix slide 04 pass 1: overflow + contrast — update slide_04.js
```

### Mechanics

At each checkpoint:

1. `git add -A` to stage all changes.
2. `git commit -m "<message>"` using the format above.
3. If there are no changes (clean working tree), skip the commit — do not create empty commits.
4. If git fails for any reason, log the error and continue. **Never block deck generation on a git failure.**

### Screenshot Naming Convention

Verification screenshots follow this pattern:

```
screenshots/slide_03_pass_01.png
screenshots/slide_03_pass_02.png
screenshots/slide_11_pass_01.png
```

Format: `slide_<NN>_pass_<NN>.png` — zero-padded two-digit numbers.

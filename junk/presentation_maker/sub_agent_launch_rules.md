---
title: Sub-Agent Launch Rules
description: How to launch sub-agents -- prompt structure, path rules, stateless constraints, context minimization
prereqs:
  - Agent Roster
---

When launching any sub-agent, your prompt MUST include:

1. **"Read [path]/agents/<role>.md for your full instructions."** -- Always the first line.
2. **Actual absolute file paths** -- never use placeholders. Sub-agents have no memory of your conversation.
3. **The specific inputs** for that agent, extracted from the manifest or deck-plan (see Context Minimization below).
4. **The working directory path** -- so the agent knows where to write output.

Example prompt for launching a Slide Writer (production mode, Phase 6):
```
Read /absolute/path/to/agents/slide_writer.md for your full instructions.

Your inputs:
- Slide spec: [contents of SL05XX section extracted from deck-plan.md]
- Theme tokens: [contents of MFTOKN section extracted from deck-plan.md]
- SlideKit guide: /tmp/AI_AUTHORING_GUIDE.md
- Exemplar: /absolute/path/to/working_dir/slides_exemplar.js

Working directory: /absolute/path/to/working_dir/
Output: Write slide_05.js
```

### Key Rules

1. **Sub-agent prompts must use absolute paths.** Sub-agents cannot resolve relative paths from your context.
2. **Never ask a sub-agent to both write AND verify.** Separate concerns -- Slide Writers write, the Verifier verifies.
3. **Review sub-agent output** before proceeding -- spot-check that expected files exist and aren't empty.
4. **Update the manifest and deck-plan status** after each agent completes. Mark phase progress in the manifest frontmatter and per-slide status in deck-plan `[MFSTAT]`.
5. **Browser work must be sequential** -- parallel sub-agents sharing Playwright contaminate each other's screenshots.
6. **All sub-agents are stateless and single-shot.** They read files, write files, and exit. No resumption, no multi-turn. This is required for Copilot CLI compatibility.
7. **The orchestrator is the ONLY entity that talks to the user.** Sub-agents never see conversation history. They do heavy cognitive work (reading large inputs, proposing options); the orchestrator handles all user interaction and iteration.
8. **Context minimization.** Extract only the relevant sections for each agent. The Slide Writer gets ONLY its assigned spec + tokens, NOT the full deck-plan. The Verifier gets ONLY its assigned slide file + spec + tokens + lint rules. Never send an agent more context than its contract requires.
9. **If revision is needed:** Record user feedback in the manifest, then launch a fresh agent that reads the updated manifest cold. Do not try to "continue" or "resume" a previous agent.
10. **The manifest is the communication channel** between orchestrator and sub-agents. All decisions, feedback, and state flow through the files. Sub-agents read from them and write to them -- nothing else.

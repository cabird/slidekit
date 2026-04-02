---
title: "Phase 0: Project Setup & Scaffolding"
description: "Initialize working directory, fetch SlideKit runtime and docs, create manifest and deck-plan, start HTTP server"
---

**Driver**: Orchestrator (no sub-agents).
**User interaction**: Confirm source content location and working directory.

### Steps

**Step 1 -- Environment prerequisite checks.**
Before doing anything else, verify the system has what we need. Check each and report results to the user. **Fail early with clear messages** rather than discovering missing tools mid-workflow.

| Tool | Check | Required? | Used In |
|------|-------|-----------|---------|
| `git` | `git --version` | **Required** | All phases (archival) |
| `python3` | `python3 --version` | **Required** | HTTP server, build_bundle.py, PDF export |
| `curl` | `curl --version` | **Required** | Phase 0 (fetch SlideKit + docs) |
| Playwright | Check if Playwright MCP server is available, OR `npx playwright --version` | **Required** | Phases 5-7 (screenshots, verification, preview) |
| `OPENAI_API_KEY` | Check environment variable | **Recommended** | Phase 6 (image generation). Warn if missing, don't block. |
| `node` / `npx` | `node --version` | **Optional** | PDF export fallback (decktape). Warn if missing. |
| PAL MCP | Try calling any PAL MCP tool (e.g., `listmodels`). If it responds, PAL is available. | **Optional** | Phases 2, 3, 7 (external model review). Note availability, don't block. |

If any **required** tool is missing, stop and tell the user what needs to be installed before continuing. List all missing tools at once (don't fail one at a time).

If Playwright is not available as an MCP server, check if it can be run via CLI (`npx playwright`). If neither is available, warn the user that Phases 5-7 (style lock, verification, review) will not be able to take screenshots or verify slides automatically. The workflow can still proceed but quality assurance will be manual.

If PAL MCP is available, record `pal_mcp: true` in the manifest frontmatter and note which models are available (e.g., GPT-5.2, Gemini). Phases 2, 3, and 7 check this flag to decide whether to request external model reviews. If PAL is not available, set `pal_mcp: false` — those phases will skip external review steps gracefully and rely on the orchestrator's own judgment.

**Step 2 -- Confirm source content.**

Ask the user where the source material is. Accept any of:
- A file path (local markdown, PDF, text)
- One or more URLs
- Raw text pasted into the conversation

Record the answer. This is the input for Phase 1.

**Step 3 -- Create the working directory.**
Create the following layout:

```
<working_dir>/
├── agents/                    # Agent instruction files (unpacked from prompt)
├── screenshots/               # Verification screenshots (Phase 6)
├── presentation-manifest.md   # Created in Step 7
├── deck-plan.md               # Created in Step 8
├── index.html                 # SlideKit + Reveal.js viewer (Step 6)
├── slidekit.bundle.min.js     # Fetched in Step 4
├── deck_config.js             # Written in Phase 6
├── slides.js                  # Written in Phase 6
├── slide_01.js ... slide_NN.js  # Written in Phases 5-6
└── *.png                      # Generated images (flat, not in subdirectory)
```

The `agents/` directory is unpacked automatically from the prompt bundle. Sub-agents will read their instructions from this directory.

**Step 4 -- Fetch the SlideKit runtime.**

```bash
curl -sL "https://raw.githubusercontent.com/cabird/slidekit/main/slidekit/dist/slidekit.bundle.min.js" \
  -o <working_dir>/slidekit.bundle.min.js
```

Verify the file is non-empty after download. If the fetch fails, retry once. If it fails again, stop and tell the user.

**Step 5 -- Fetch SlideKit documentation and tools to /tmp/.**
Sub-agents will read these files for API reference and layout guidance. This step replaces the old Phase 1 (Documentation Distillation) -- instead of launching a Doc Distiller agent to process these docs at runtime, the reference files are pre-distilled documents that agents consume directly.

```bash
# Core authoring guide (workflow, pitfalls, anti-patterns) — for Slide Writer
curl -sL "https://raw.githubusercontent.com/cabird/slidekit/main/docs/AI_AUTHORING_GUIDE.md" \
  -o /tmp/AI_AUTHORING_GUIDE.md

# Compact API reference (optimized for AI consumption) — deep-dive fallback
curl -sL "https://raw.githubusercontent.com/cabird/slidekit/main/docs/API_COMPACT.md" \
  -o /tmp/API_COMPACT.md

# Design reference (capabilities, constraints, NO code) — for Design Director + Planner
curl -sL "https://raw.githubusercontent.com/cabird/slidekit/main/docs/SLIDEKIT_DESIGN_REFERENCE.md" \
  -o /tmp/SLIDEKIT_DESIGN_REFERENCE.md

# API quick reference (condensed signatures, property tables, micro-recipes) — for Slide Writer
curl -sL "https://raw.githubusercontent.com/cabird/slidekit/main/docs/SLIDEKIT_API_QUICK_REFERENCE.md" \
  -o /tmp/SLIDEKIT_API_QUICK_REFERENCE.md

# Layout cookbook + extraction script — for Planner (menu) and Slide Writer (recipes)
curl -sL "https://raw.githubusercontent.com/cabird/slidekit/main/docs/LAYOUT_COOKBOOK.md" \
  -o /tmp/LAYOUT_COOKBOOK.md
curl -sL "https://raw.githubusercontent.com/cabird/presentation_maker_prompt/main/extract_recipes.py" \
  -o /tmp/extract_recipes.py
```

These are fetched to `/tmp/` because they are reference material, not presentation artifacts.

**Document roles:**
| Document | Audience | Purpose |
|----------|----------|---------|
| `AI_AUTHORING_GUIDE.md` | Slide Writer | Workflow, pitfalls, render-inspect-correct loop |
| `SLIDEKIT_API_QUICK_REFERENCE.md` | Slide Writer | Condensed API surface, signatures, micro-recipes |
| `SLIDEKIT_DESIGN_REFERENCE.md` | Design Director, Planner | Visual capabilities and constraints (no code) |
| `LAYOUT_COOKBOOK.md` + `extract_recipes.py` | Planner (menu), Slide Writer (recipes) | Layout pattern catalog and extraction |

**Step 6 -- Create index.html.**
Write a SlideKit + Reveal.js viewer using ES module imports. This file loads `slidekit.bundle.min.js`, `deck_config.js`, and `slides.js`. It will be the local preview entry point served by the HTTP server.

**Step 7 -- Initialize presentation-manifest.md.**
Create the manifest with:
- YAML frontmatter: `phase: 0`, `status: in_progress`, all counters at zero.
- Empty body section headers with their IDs: `[MFMETA]`, `[MFCONT]`, `[MFSARC]`, `[MFDSGN]`, `[MFREVW]`.

Do NOT include deck-plan sections here. The deck-plan sections (`[MFTOKN]`, `[MFIMGP]`, `[MFSTAT]`, and per-slide specs) belong in `deck-plan.md`, which the Planner populates in Phase 4.

**Step 8 -- Initialize empty deck-plan.md.**
Create `deck-plan.md` with a minimal header and placeholder note:

```markdown
# Deck Plan

> This file will be populated by the Planner agent in Phase 4.
> It will contain: theme tokens [MFTOKN], image plan [MFIMGP],
> slides status [MFSTAT], and per-slide creative specs.
```

The Planner agent writes the full contents of this file. Creating it now ensures the file exists for any agent or tool that checks for it early.

**Step 9 -- Git init + first commit.**

```bash
cd <working_dir>
git init
git config user.name "SlideKit Orchestrator"
git config user.email "orchestrator@local"
git add -A
git commit -m "[phase 0/orch] init: scaffold SlideKit deck repo"
```

**Step 10 -- Start HTTP preview server.**
Start a local HTTP server on an ephemeral port (port 0 lets the OS pick an available port). The server runs in the background for the duration of the workflow.

```bash
cd <working_dir>
python3 -c "
import http.server, socketserver
handler = http.server.SimpleHTTPRequestHandler
with socketserver.TCPServer(('127.0.0.1', 0), handler) as httpd:
    print(httpd.server_address[1], flush=True)
    httpd.serve_forever()
" &
```

Capture the printed port number. Record it for later use by the Verifier agent. If the server fails to start, log the error but continue -- preview can be set up manually later.

### Exit Criteria

- All required tools verified (git, python3, curl, Playwright). Warnings issued for optional/recommended tools (including PAL MCP availability recorded as `pal_mcp: true/false` in manifest frontmatter).
- Working directory exists with all subdirectories.
- `slidekit.bundle.min.js` downloaded and non-empty.
- SlideKit docs present in `/tmp/` (AI_AUTHORING_GUIDE.md, API_COMPACT.md, SLIDEKIT_DESIGN_REFERENCE.md, SLIDEKIT_API_QUICK_REFERENCE.md, LAYOUT_COOKBOOK.md, extract_recipes.py).
- `index.html` created.
- `presentation-manifest.md` initialized with frontmatter and manifest section headers (`[MFMETA]`, `[MFCONT]`, `[MFSARC]`, `[MFDSGN]`, `[MFREVW]`).
- `deck-plan.md` created with placeholder content.
- Git repo initialized with first commit.
- HTTP server running (or failure logged).
- Manifest updated: `phase: 1`, `status: in_progress`, `next_action: "Launch Content Analyst agent"`.

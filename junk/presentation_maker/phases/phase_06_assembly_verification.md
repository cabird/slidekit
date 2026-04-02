---
title: "Phase 6: Assembly + Verification"
description: "Automated loop: Slide Writers produce all slides in parallel, images are generated, deck is integrated, Verifier auto-heals issues — no user interaction"
prereqs:
  - "Phase 5: Style Lock"
---

**Driver**: Orchestrator + Slide Writer agents + Image Generator agents + Verifier agents.
**User interaction**: None. This phase is fully automated. The user sees results only in Phase 7.

This phase is structured as a five-step pipeline with an auto-heal loop in Step 4. All steps are orchestrator-driven. Errors are resolved automatically — the orchestrator re-launches agents or applies fixes until every slide passes verification.

---

### Step 1 — Launch Slide Writers (parallel)

For each slide in the deck map, the orchestrator prepares a Slide Writer invocation:

**Input extraction** — for each slide, extract from `deck-plan.md`:
- The slide's creative spec section (`[SLnnXX]` block — approximately 20-25 lines).
- The theme tokens `[MFTOKN]` (approximately 30 lines).
- The recipe IDs referenced in the spec's Layout field (e.g., "recipes: A3 + F3").

**Extract cookbook recipes** — collect all unique recipe IDs across all slide specs, then run:

```bash
python3 /tmp/extract_recipes.py --file /tmp/LAYOUT_COOKBOOK.md A3 F3 B1 K3 ...
```

Each Slide Writer receives only the recipes referenced by its assigned spec.

Each Slide Writer receives:
- Its assigned slide spec (one slide only — NOT the full deck-plan).
- The theme tokens `[MFTOKN]`.
- The extracted cookbook recipes for the layout patterns referenced in its spec.
- `/tmp/SLIDEKIT_API_QUICK_REFERENCE.md` — condensed API surface with signatures, property tables, and micro-recipes.
- `/tmp/AI_AUTHORING_GUIDE.md` — workflow, pitfalls, render-inspect-correct loop.
- The theme reference slides (`/tmp/theme_reference_slides.js`) — if available. Shows the theme author's working code: tokens, helpers, and template slide implementations.
- The approved `slides_exemplar.js` from Phase 5 (style reference — the Slide Writer copies code patterns, imports, variable naming, component usage, and layout conventions from the exemplar).

Read the agent instructions from `agents/slide_writer.md`. Launch one Slide Writer per slide. Slide Writers are independent — they can run in parallel. Each produces a single `slide_NN.js` file (e.g., `slide_01.js`, `slide_02.js`, etc.).

**Important**: The Slide Writer sees ONLY its assigned spec (~20-25 lines), tokens (~30 lines), the guide, and the exemplar. It does NOT see the full deck-plan, the manifest, other slides' specs, or any raw source material. This is the context minimization principle in action — the Planner already baked all creative decisions into the spec.

As each Slide Writer completes, git commit:

```bash
git add slide_NN.js
git commit -m "[phase 6/slide-writer] slide NN: \"<slide title>\""
```

Update the slide's status in `[MFSTAT]` to `written`.

---

### Step 2 — Generate images (Image Generator agents)

Read the image plan `[MFIMGP]` from `deck-plan.md`. Read the agent instructions from `agents/image_generator.md`.

For each image slot in the plan, launch an Image Generator agent with:
- The image plan entry (description, prompt, style, source mode, target path).
- The style directive from manifest `[MFDSGN]`.
- The source asset file (if mode is `adapt` or `reuse`).

**Always launch ALL Image Generators in parallel** — API calls are independent and don't interfere.

The Image Generator handles three modes:

- **Source = "reuse"**: Copy the asset from its source location. Convert JPEG photos to PNG (lossless, better for slide compositing). Keep clean PNG diagrams as-is. Only one variant produced.
- **Source = "adapt"**: Examine the source figure, understand its content, generate **2-3 variant** images that convey the same information in the target art style with different visual approaches.
- **Source = "generate"**: Craft **2-3 refined prompt variations** from the description + style directive, call the OpenAI Images API for each, assess quality, regenerate any that are clearly bad.

**Format rules** the agent must follow:
- Photographs, illustrations, textures → PNG (lossless, supports transparency/overlays).
- Diagrams, charts, technical drawings, line art → PNG. Never JPEG (compression creates artifacts on hard edges and flat colors).
- Source assets being reused → inspect original; convert JPEG photos to PNG, keep clean PNG diagrams as-is.

Each agent produces **2-3 PNG variants** per slot (e.g., `images/hero_visual_v1.png`, `_v2.png`, `_v3.png`), giving the user real choices in Phase 7. Exception: `reuse` mode produces only one file.

As each completes:
- Update the image's status in `[MFIMGP]` from `pending` to `variants_ready` (or `flagged`).
- If generation fails (API error, content policy rejection): mark status as `failed`, generate a labeled placeholder image. Flag for manual review in Phase 7.

After all images are processed, git commit:

```bash
git add images/
git commit -m "[phase 6/image-gen] images: generated N slots (2-3 variants each)"
```

**Note**: The user selects their preferred variant per slot during Phase 7. The orchestrator updates `[MFIMGP]` with the chosen path and cleans up unused variants.

---

### Step 3 — Integration (deterministic, no agent needed)

The orchestrator writes two files. This is mechanical wiring — no LLM agent is involved.

**`deck_config.js`** — the deck's configuration module:
- `THEME` object: all constants from the theme tokens `[MFTOKN]` (colors, fonts, spacing, shadows, radii) as JavaScript exports.
- `IMAGES` manifest: a mapping from logical image names to file paths (e.g., `{ hero_visual: './images/hero_visual.png', ... }`). Derived from the completed image plan `[MFIMGP]`.
- SlideKit API re-exports: import from `slidekit.bundle.min.js` and re-export for slide modules to consume.

**`slides.js`** — the entry point:
- Import every `slide_NN.js` file in deck order.
- Export the ordered slide array for SlideKit initialization.

**Verify deck loads**: Start the HTTP server if not already running. Navigate Playwright to `index.html`. Check:
- `window.sk` exists (SlideKit initialized).
- No console errors.
- Slide count matches the expected total from `[MFSTAT]`.

If the load check fails, diagnose the issue (missing import, syntax error in a slide file, path mismatch) and fix directly. Common issues:
- Missing or misspelled import in `slides.js` — fix the import statement.
- Slide file has a syntax error — re-launch Slide Writer for that slide.
- Image path mismatch between `deck_config.js` and actual file — update the path.

Git commit:

```bash
git add deck_config.js slides.js
git commit -m "[phase 6/orch] integrate: deck_config.js + slides.js"
```

---

### Step 4 — Verification loop (auto-heal)

Launch Verifier agents to check each slide. Read the agent instructions from `agents/verifier.md`.

**Per-slide verification** — for each slide, provide the Verifier with:
- The `slide_NN.js` file.
- The slide's creative spec (`[SLnnXX]` from deck-plan).
- The theme tokens `[MFTOKN]`.
- The SlideKit guide lint rules section.

The Verifier takes a Playwright screenshot of the slide and checks for:
- **text-overflow** — content exceeds slide boundaries.
- **canvas-overflow** — elements positioned outside the visible slide area.
- **low-contrast** — text/background color pairs below WCAG threshold.
- **missing-image** — image referenced but file not found or not rendering.
- **layout-drift** — rendered layout does not match the archetype specified in the creative spec.
- **font-missing** — Google Font not loading (fallback font visible).
- **theme-inconsistency** — colors or fonts in the rendered slide do not match the token table.

**Handling results:**

- **Pass**: Mark the slide's status in `[MFSTAT]` as `complete`. No action needed.
- **Auto-fixed**: The Verifier applied fixes directly to `slide_NN.js`. Re-run the Verifier on the fixed file to confirm the fix resolved the issue without introducing new problems. Git commit:
  ```bash
  git add slide_NN.js
  git commit -m "[phase 6/verifier] fix slide NN: <issue summary>"
  ```
- **Needs-rewrite**: The issue is beyond auto-fix (e.g., too much content for the layout, fundamentally wrong structure, major layout-drift). Re-launch the Slide Writer for that slide with the Verifier's findings appended to the original spec as additional constraints. Then re-verify the rewritten slide. Git commit after rewrite:
  ```bash
  git add slide_NN.js
  git commit -m "[phase 6/slide-writer] rewrite slide NN: <verifier findings>"
  ```

**Parallelism**: Verifiers can run in parallel across different slides. However, they must coordinate Playwright access — only one Verifier should be taking screenshots at a time (serial screenshot queue, parallel analysis). If the runtime does not support parallel agent launches, run Verifiers sequentially.

**Loop termination**: Repeat verification until all slides have status `complete` in `[MFSTAT]`. Cap rewrite attempts at 3 per slide — if a slide fails after 3 rewrites, flag it for manual attention in Phase 7.

---

### Step 5 — Final integration check

After all individual slides pass verification, run a full-deck integration test:

1. Reload the page in Playwright. Verify `window.sk` exists and no console errors.
2. Navigate through every slide in sequence (first to last). Confirm:
   - Every slide renders (no blank slides, no JavaScript errors mid-deck).
   - Slide count matches the expected total.
   - Transitions between slides work.
3. Take a final screenshot of every slide. Store in `screenshots/final/slide_NN.png`. These screenshots are the artifacts presented to the user in Phase 7.
4. If any issues are found during the full navigation (e.g., a slide that passed individually but breaks in context), diagnose and fix. Re-verify the affected slide.

Git commit:

```bash
git add screenshots/final/
git commit -m "[phase 6/orch] verify: all slides pass — ready for review"
```

---

### Exit Criteria

- Every slide has a `slide_NN.js` file that renders correctly.
- All images generated (or placeholders created for failed generations, flagged for Phase 7).
- `deck_config.js` and `slides.js` written and working.
- Deck loads cleanly in Playwright: correct slide count, no console errors, `window.sk` exists.
- All slides pass Verifier checks (status `complete` in `[MFSTAT]`).
- Final screenshots captured for every slide.
- Git commits recorded at each stage.
- Manifest updated: `phase: 7`, `status: in_progress`, `next_action: "Present to user for review"`.

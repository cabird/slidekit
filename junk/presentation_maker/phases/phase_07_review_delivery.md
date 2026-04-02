---
title: "Phase 7: Review & Delivery"
description: "User reviews the assembled deck, provides feedback for iteration, then final artifacts are exported and delivered"
prereqs:
  - "Phase 6: Assembly + Verification"
---

**Driver**: Orchestrator + user.
**User interaction**: Review slides, provide feedback, approve final deck, receive deliverables.

This phase has two parts: **Part A** iterates on the deck with the user until approved, **Part B** exports and delivers the final artifacts.

---

## Part A — User Review

**Step 1 — Present the completed deck.**
Show the user the final screenshots from Phase 6 (stored in `screenshots/final/slide_NN.png`), or provide a live preview URL if the HTTP server is running. Present all slides in deck order.

Alongside the screenshots, provide a brief summary:
- Total slide count and estimated presentation duration.
- Key design decisions and trade-offs made during the workflow.
- Narrative arc reminder (the throughline and structure from Phase 3).
- Any flagged issues from Phase 6 (failed image generations, slides that hit the 3-rewrite cap).

**Step 2 — Collect feedback.**
Ask for slide-by-slide feedback. Prompt the user to evaluate:

- **Readability**: Can all text be read easily? Font sizes, contrast, line lengths.
- **Visual consistency**: Does the deck feel cohesive? Are colors, fonts, and spacing consistent?
- **Pacing**: Does the visual rhythm work? Are dense slides followed by breathing room?
- **Content accuracy**: Are the words, numbers, and claims correct?
- **Narrative flow**: Does the story build logically from slide to slide?
- **Specific changes**: Anything to add, remove, or rearrange.

Remind the user: *"You can give feedback on individual slides ('Slide 7 needs less text') or on the deck as a whole ('The middle section feels too dense'). I'll handle the implementation."*

**Step 3 — Apply changes and re-verify.**
For each piece of feedback:

- **Minor text/style edits** (fix a typo, adjust spacing, change a color): edit `slide_NN.js` directly. No agent re-launch needed.
- **Content restructuring** (rewrite a slide's content, change the layout): update the slide spec in `deck-plan.md` with the feedback, then re-launch the Slide Writer for that slide with the updated spec + exemplar + tokens. Run the Verifier on the rewritten slide.
- **Cross-slide changes** (rearrange slide order, add/remove slides): update the deck map in `[MFSARC]`, adjust specs in `deck-plan.md`, regenerate `slides.js` with the new import order, and rewrite/verify affected slides.
- **Image changes** (different image, different style): regenerate the image via the OpenAI Images API and update `deck_config.js`.

After applying changes, re-screenshot affected slides and re-present to the user.

Git commit per iteration:

```bash
git add -A
git commit -m "[phase 7/orch] revise: <slides changed> — <feedback summary>"
```

**Step 4 — Iterate until approved.**
Repeat Steps 2-3 until the user explicitly approves the deck. There is no iteration limit — the user decides when the deck is done.

**Step 5 — Optional: Domain expert validation.**
For technical content (research papers, engineering specs, financial data), if the manifest has `pal_mcp: true`, offer to validate accuracy by submitting slide content to an external model via PAL MCP for review of:

- Quote accuracy and context (are quotes used faithfully?).
- Technical claims and numbers (are statistics, measurements, or formulas correct?).
- Terminology correctness (are domain-specific terms used properly?).
- Logical consistency (do arguments hold together?).

Present any findings to the user and apply corrections if needed.

**Step 6 — Optional: Academic conventions.**
For conference or academic presentations, offer these additions:

- **Source citations**: Add participant/source IDs, reference numbers, or footnotes to slides that present specific data or claims.
- **QR code**: Generate a QR code linking to a preprint, paper, or supplementary material. Include a short URL fallback for accessibility. Place on the closing slide or a dedicated references slide.
- **Methodology slide**: If not already in the deck, offer to add a slide covering sample sizes, experimental approach, statistical methods, or data collection procedures.

Record the final approval in the manifest Review Notes `[MFREVW]` section.

---

## Part B — Delivery

**Step 7 — Build self-contained HTML bundle.**
Run `build_bundle.py` to produce `index.bundle.html`. This file is a fully self-contained presentation:

- All JavaScript inlined (SlideKit bundle, deck_config, slide modules).
- All images base64-encoded and inlined.
- All CSS inlined.
- Opens in any browser with no server required.

Verify the bundle works: open `index.bundle.html` in Playwright, confirm slide count matches and no console errors.

**Step 8 — Export PDF.**
Generate a PDF export of the presentation:

- **Primary method**: Use Playwright to print each slide. Navigate to each slide, capture as PDF page at the target resolution (default: 1920x1080 landscape).
- **Fallback method**: If Playwright PDF export has quality issues, use decktape:
  ```bash
  npx decktape reveal --size 1920x1080 http://localhost:<PORT> export/presentation.pdf
  ```

**Verify the PDF**:
- Page count matches slide count.
- Spot-check 3-4 slides for fidelity (text renders, images appear, layout matches screenshots).
- File size is reasonable (flag if over 50MB — may indicate uncompressed images).

**Step 9 — Deliver final artifacts.**
Present the deliverables to the user:

- **`index.bundle.html`** — Self-contained interactive presentation. Open in any browser. Supports keyboard navigation, touch gestures, and presenter mode.
- **`presentation.pdf`** — Static PDF export for sharing, printing, or uploading to conference systems.
- **`presentation-manifest.md`** — Complete documentation of all decisions made during the workflow (content summary, story arc, design language, review notes). Useful as a reference or for future revisions.

**Step 10 — Offer next steps.**
Suggest optional follow-up work:

- **Alternate aspect ratio**: Rebuild for 4:3 (conference projectors) or 9:16 (mobile/social).
- **Lightning talk cut**: Trim to 5-minute / 10-slide version by selecting the most impactful slides.
- **Speaker notes version**: Generate detailed speaker notes for each slide (talking points, timing cues, transition prompts).
- **Handout version**: Export a condensed version with slide thumbnails and notes for audience distribution.

**Step 11 — Final git commit.**

```bash
git add -A
git commit -m "[phase 7/orch] deliver: index.bundle.html + PDF"
```

Update manifest frontmatter: `phase: complete`, `status: delivered`, `last_approval: "Final presentation approved and delivered"`.

---

### Exit Criteria

- User has explicitly approved the final deck.
- `index.bundle.html` produced and verified (loads in browser, correct slide count).
- PDF exported and verified (correct page count, spot-check passed).
- All deliverables presented to the user.
- Review notes recorded in manifest `[MFREVW]`.
- Git commit recorded.
- Manifest updated: `phase: complete`, `status: delivered`.

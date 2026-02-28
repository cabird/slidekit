---
phase: 5
phase_name: Build Manifest
status: complete
next_action: Begin Phase 6 slide assembly
last_approval: "Detailed outline approved"
open_questions: []
api_key_location: api_keys file in project root (contains OPENAI_API_KEY)
---
# Presentation Manifest

## Source Material
- **Paper**: "AI Where It Matters: Where, Why, and How Developers Want AI Support in Daily Work"
- **Authors**: Rudrajit Choudhuri, Carmen Badea, Christian Bird, Jenna L. Butler, Robert DeLine, Brian Houck
- **Affiliations**: Oregon State University, Microsoft
- **Study**: Large-scale mixed-methods study of N=860 developers at Microsoft

## Key Paper Content
### Research Questions
- RQ1: How do developers' task appraisals shape their openness to and use of AI tools?
- RQ2: Which Responsible AI (RAI) design principles do developers prioritize?

### Theoretical Framework
- Cognitive appraisal theory applied to developer tasks
- Four appraisal drivers: Value, Identity, Accountability, Demands
- Hypotheses H1-H4 linking each driver to AI openness/usage

### Key Findings
1. **Task appraisals predict AI adoption**: Value, Accountability, and Demands increase openness/use; Identity shows dual effects (lower openness but higher usage)
2. **Three task clusters identified**:
   - C1 (Core Work): Coding, debugging, testing, code review, system design — high value/demands, strong AI appetite but identity constrains delegation
   - C2 (People & AI-Building): Mentoring, AI integration — strong identity, AI largely resisted
   - C3 (Ops & Coordination): DevOps, env setup, documentation, customer support — low identity, AI welcome for toil reduction
3. **Quadrant map** (Need vs. Use): Build / Improve / Sustain / De-prioritize zones
4. **RAI priorities vary by context**:
   - Systems-facing: Reliability & Safety (85%), Privacy & Security (77%)
   - Design/human-facing: Fairness and Inclusiveness elevated
   - Steerability rises with SE/AI experience
5. **Augmentation over automation**: Developers want AI as cognitive collaborator, not replacement

### Implications
- Favor augmentation over blunt automation
- Task-aware AI personas needed
- Ship human-gated control for Core Work
- Keep People work human-led
- Treat Ops as reliability/traceability problem first

## Presentation Context
- **Audience**: ICSE conference (academic SE/HCI researchers and practitioners)
- **Goal**: Understand where developers want AI and why; understand RAI priorities by task type
- **Length**: ~15 minutes, 15–20 slides
- **Tone**: Formal, restrained, confident — editorial sophistication
- **Existing assets**: Two paper figures extracted (quadrant map, RAI bar chart); will recreate tables as HTML/CSS; will generate photographic images later

## Extracted Figures
- `assets/quadrant-map.png` — Quadrant scatter plot: Openness to AI Support vs. Current AI Usage (z-scores), color-coded by cluster (Core Work, People & AI Building, Ops & Coordination)
- `assets/rai-chart.png` — Bar chart: RAI principle priorities (%) across 5 task categories (8 principles x 5 categories)

## Photography Assets
- `assets/title-bg.png` — Dark server room corridor, selective LED lighting, vanishing point perspective
- `assets/tension-bg.png` — Abstract brushed steel beams intersecting at angles, cool blue-gray tones
- `assets/inquiry-photo.png` — Chrome magnifying glass on dark slate surface, selective reflections
- `assets/framework-photo.png` — Bronze balance/justice scales against dark textured background
- `assets/survey-photo.png` — Charts/papers on desk with pen, desaturated dark workspace
- `assets/taxonomy-photo.png` — Grid of dark filing cabinet drawers with brass label holders
- `assets/identity-photo.png` — Hands typing on mechanical keyboard, dramatic dark side-lighting
- `assets/clusters-bg.png` — Dark concrete architectural beams/columns, geometric, monumental
- `assets/core-work-photo.png` — Dark profile silhouette at keyboard, monitor glow background
- `assets/ops-photo.png` — Close-up server rack cable management, dark metallic
- `assets/people-photo.png` — Two silhouettes facing each other in near-total darkness, edge-lit
- `assets/closing-bg.png` — Rooftop balcony overlooking misty gray cityscape, desaturated

## Design Language

### Direction: BLED Minimalist Editorial

A high-end editorial aesthetic adapted for academic presentation. Monochromatic dominance, oversized serif typography as architecture, dark cinematic photography, radical simplicity. Every element earns its place. No gradients, no shadows, no rounded corners, no decorative chrome.

### Color Palette
| Color | Hex | Usage |
|-------|-----|-------|
| Primary Black | #000000 | Dark slide backgrounds, primary text on white slides |
| Dark Gray | #1A1A1A | Lifted black for large background areas |
| Medium Gray | #808080 | Body text on white, secondary info, captions, credits |
| Light Gray | #E5E5E5 | Thin 1px horizontal rules, subtle separators |
| Pure White | #FFFFFF | Light slide backgrounds, text on dark slides |
| Teal Accent | #00C8B4 | Tiny typographic accents only — a single word, an asterisk, a thin bar. Never as background. Max area: 5% of any slide. |

### Color Rules
- Backgrounds restricted to #000000, #1A1A1A, #FFFFFF, or #F5F5F5. No other solid-color backgrounds.
- Text: black-on-white or white-on-dark. No colored text except teal accent on rare occasions.
- Charts use grayscale palette. One data series may use teal for emphasis.
- Photography provides all visual richness — not color fills.
- Never use warm colors (red, orange, yellow), saturated blues, or purples.

### Typography
- **Display / Headings**: Playfair Display (Regular, Bold) — high-contrast Didone serif. Fallback: Georgia.
- **Body / Captions**: Inter (Regular, Medium, SemiBold) — geometric sans-serif. Fallback: Arial.
- **Scale**:
  - Hero Display: 120–200pt, UPPERCASE, letter-spacing +50 to +100, line-height 0.85–0.95
  - Section Heading: 40–64pt serif bold, UPPERCASE, letter-spacing +20 to +40
  - Slide Title: 28–40pt serif bold, UPPERCASE, letter-spacing +10 to +20
  - Subtitle / Tagline: 14–20pt sans-serif medium, UPPERCASE, letter-spacing +80 to +150
  - Body Text: 10–14pt sans-serif regular, sentence case, normal tracking, line-height 1.5–1.7
  - Caption / Label: 7–10pt sans-serif semibold, UPPERCASE, letter-spacing +100 to +200
  - Footnote: 5–7pt sans-serif regular, medium gray

### Typography Rules
- UPPERCASE for labels, categories, short headings (5 words max). Never for full paragraphs.
- Wide letter-spacing signals hierarchy — smaller text gets wider tracking.
- Tight line-height for display text (0.85–0.95). Ascenders/descenders nearly touch.
- One serif, one sans-serif. Never a third typeface.
- Left-aligned for body. Display may be left or centered. Never justified. Never right-aligned except for small date/number labels.

### Photography Style
- **Subjects**: Architecture, technology (monitors, keyboards, server rooms), isolated figures in dramatic lighting, abstract material textures
- **Treatment**: Low-key lighting, desaturated almost to monochrome, cool color temperature, high contrast
- **Placement**: Full-bleed (zero margins, all edges) or split-half
- **Rules**: No borders, frames, shadows, or rounded corners on images. No stock-photo cliches. No warm/saturated images.

### Layout Archetypes
1. **Title Slide** (D1) — Full-bleed dark photo, oversized serif title (white), small uppercase sans subtitle with extreme tracking
2. **Big Typography / Section Divider** (D2) — One or two words in massively oversized serif fill 60–80% of slide. May bleed off edges. White or dark background.
3. **Content Slide — White Background** (D3) — Section label (small uppercase sans) + 1px rule + serif bold title + sans body text (50–65% width). Generous margins.
4. **Full-Bleed Dark Photography** (D4) — Photo covers 100%, inherently dark. Minimal text: small white sans label at most.
5. **Split Layout** (D5) — 50% dark photo | 50% white text content. Hard edge division, no gradient.
6. **Stats / Data Slide** (D6) — White bg, large serif bold numbers as focal elements, small uppercase sans labels beneath.
7. **Quote / Statement** (D8) — Serif italic/regular quote (28–48pt, 60% width, centered), small uppercase sans attribution below. Extreme vertical centering.

### Graphic Elements
- **Thin horizontal rules**: 1px, #E5E5E5 on white / #333333 on dark. Full-width or 40–60% left-aligned.
- **Triangle marker**: small (6–8pt) down-pointing triangle next to section labels. Sparingly (max 1 per slide).
- **Slide numbers**: Small sans (7–8pt), medium gray, bottom-right. Zero-padded ("01"). Omit on photo/title slides.
- **What is absent**: No icons, no bullet points (use spatial separation), no logos (except title/closing), no borders on content boxes, no gradient fills, no rounded rectangles, no emoji, no clip art, no illustrations, no shadows, no animated transitions.

### Spacing & Grid
- **Margins**: Left/Right 8–10% (154–192px), Top 8–12% (86–130px), Bottom 6–8% (65–86px). Full-bleed slides: 0px.
- **Body text width**: 55–65% of slide width (comfortable reading line lengths).
- **Headings**: up to 80% slide width.
- **Vertical rhythm**: Label→rule 8–12px, rule→title 16–24px, title→body 24–40px, between paragraphs 16–20px, body→supporting element 32–48px.

### Motion
- None. Static, confident presentation. No transitions, no animation.

## Story Arc
**Arc 1 (Gap Map) + Augmentation thesis**
Open with tension → appraisal framework → data → quadrant map → clusters (with augment/automate/resist spectrum) → RAI → implications → close

## Slides

### Slide 1: Title
- **Status**: pending
- **Key**: s01-title
- **Layout archetype**: D1 (Title Slide)
- **Communication intent**: Establish paper title, authors, conference context
- **Text on slide**: "AI WHERE IT MATTERS" in oversized Playfair Display (white, ~160pt) / subtitle "WHERE, WHY, AND HOW DEVELOPERS WANT AI SUPPORT" in small uppercase Inter with extreme letter-spacing (+120) / "ICSE 2026" and author line in caption-size sans, bottom-left, medium gray
- **Visual**: full-bleed dark photograph — `assets/title-bg.png` (dark server room corridor with vanishing point perspective, selective LED lighting)
- **Build notes**: Photo covers full slide. Title text left-aligned at ~⅓ mark from left. Subtitle below title with 24px gap. Author/conference credits anchored to bottom-left margin. The server corridor's vanishing point creates natural depth behind the title text.

### Slide 2: The Tension
- **Status**: pending
- **Key**: s02-tension
- **Layout archetype**: D2 (Big Typography over dark photo)
- **Communication intent**: AI tools are everywhere — but are they in the right places? The adoption paradox.
- **Text on slide**: "THE RIGHT WORK*" in massively oversized Playfair Display Bold (white, ~240pt) filling 70% of slide. Asterisk in teal (#00C8B4). Below in small white sans: "AI tools promise faster delivery — but are they optimizing the right tasks?"
- **Visual**: full-bleed dark photograph — `assets/tension-bg.png` (abstract brushed steel beams intersecting at angles, cool blue-gray tones). The geometric abstraction reinforces the structural/systemic tension.
- **Build notes**: Photo covers full slide with ~60% opacity dark overlay if needed for text legibility. Title text left-aligned, bleeds off right edge intentionally. Teal accent on the asterisk only (5% rule). Small body text at bottom-left, 55% width. The angular steel beams create visual tension that matches the conceptual tension.
- **Speaker notes**: Set up the core problem — AI adoption is widespread but not strategic. Cite the paradox from industry research.

### Slide 3: Research Questions
- **Status**: pending
- **Key**: s03-rqs
- **Layout archetype**: D5 (Split Layout)
- **Communication intent**: Frame the two research questions clearly
- **Text on slide**: Right half (white): Section label "RESEARCH QUESTIONS" (small uppercase Inter, medium gray) / 1px light gray rule / RQ1 in serif bold: "How do task appraisals shape openness to AI?" / 32px gap / RQ2 in serif bold: "Which RAI principles do developers prioritize?" / Each RQ followed by a one-line sans-serif elaboration in medium gray
- **Visual**: `assets/inquiry-photo.png` (chrome magnifying glass on dark slate surface — the act of inquiry made physical) fills left half
- **Build notes**: Hard 50/50 split. Photo left, content right. RQ numbers ("01" and "02") in large serif bold (48pt) to the left of each question. Generous vertical spacing between the two RQs. 10% internal padding on right half. The magnifying glass metaphor maps directly to "research questions."

### Slide 4: Appraisal Framework
- **Status**: pending
- **Key**: s04-framework
- **Layout archetype**: D5 (Split Layout)
- **Communication intent**: Introduce the 4 appraisal drivers and why they matter
- **Text on slide**: Right half (white): Section label "THEORETICAL FRAMEWORK" / 1px rule / Title "Cognitive Appraisal Theory" in serif bold / Below: four lines, each with a bold sans-serif label (VALUE, IDENTITY, ACCOUNTABILITY, DEMANDS) followed by a one-line description in regular sans. Separated by generous vertical space (32px between each).
- **Visual**: `assets/framework-photo.png` (bronze balance/justice scales against dark textured background — weighing and appraisal made tangible) fills left half
- **Build notes**: Hard 50/50 split. Photo left, content right. No cards, no icons, no colored borders. The four drivers are communicated through typography alone — bold uppercase label + regular description, separated by whitespace. 10% internal padding on right half. Each driver label has a subtle 1px rule beneath it spanning 40% of the right half width. The balance scales metaphor maps to "appraisal" — weighing factors that drive decisions.

### Slide 5: Method
- **Status**: pending
- **Key**: s05-method
- **Layout archetype**: D5 (Split Layout)
- **Communication intent**: Convey study scale and rigor
- **Text on slide**: Right half (white): Section label "METHODOLOGY" / 1px rule / Three large serif bold numbers stacked vertically: "860" / "20" / "3,981" — each with a small uppercase sans label to the right: "DEVELOPERS" / "SE TASKS" / "QUALITATIVE RESPONSES" / Below: a one-line sans note "Mixed-methods survey at Microsoft, 6 continents"
- **Visual**: `assets/survey-photo.png` (charts and papers on desk with pen, desaturated — the physical artifacts of research methodology) fills left half
- **Build notes**: Hard 50/50 split. Photo left, content right. Numbers in Playfair Display Bold, ~72pt, black. Labels in Inter SemiBold, ~9pt, uppercase, letter-spacing +150, medium gray. Numbers stacked vertically with 32px gap between each. 10% internal padding on right half. The desk-with-charts photo grounds the statistics in tangible research activity.

### Slide 6: Task Taxonomy
- **Status**: pending
- **Key**: s06-taxonomy
- **Layout archetype**: D5 (Split Layout)
- **Communication intent**: Show the 5 categories and 20 tasks surveyed
- **Text on slide**: Right half (white): Section label "TASK LANDSCAPE" / 1px rule / Title "20 SE Tasks" in serif bold / Below: five category groups, each with a bold uppercase sans label and 2–4 task names in regular sans, medium gray. Categories: DEVELOPMENT, DESIGN & PLANNING, QUALITY & RISK, INFRASTRUCTURE & OPS, META-WORK
- **Visual**: `assets/taxonomy-photo.png` (grid of dark filing cabinet drawers with brass label holders — classification and taxonomy made physical) fills left half
- **Build notes**: Hard 50/50 split. Photo left, content right. Categories stacked vertically, each with a bold uppercase sans label and task names below in regular sans, medium gray. Clean spatial separation — no table borders, no grid lines. Let whitespace define the groups. 10% internal padding on right half. The filing cabinet's grid of labeled drawers is a perfect visual metaphor for task categorization.

### Slide 7: Appraisals Predict AI Adoption
- **Status**: pending
- **Key**: s07-regression
- **Layout archetype**: D3 (Content Slide — White)
- **Communication intent**: All 4 hypotheses supported — task appraisals predict both openness and usage
- **Text on slide**: Section label "KEY FINDING" / 1px rule / Title "All Four Appraisals Predict AI Adoption" in serif bold / Below: four lines showing each driver with directional indicators — "Value +" / "Identity: dual (openness −, usage +)" / "Accountability +" / "Demands +" — each in sans-serif with the sign in bold. The "dual" note for Identity in teal accent.
- **Visual**: text-only (white background)
- **Build notes**: White background. Left-aligned, 60% text width. The regression results are presented typographically — no table, no cards. Each driver on its own line with bold directional indicator (+/−) in large serif (36pt). Driver name in bold uppercase sans (14pt) to the right. 32px vertical gap between drivers. The simplicity focuses attention on the key finding — all four hypotheses confirmed. This is a breathing moment between photo-heavy slides.

### Slide 8: The Identity Dual Pattern
- **Status**: pending
- **Key**: s08-identity
- **Layout archetype**: D5 (Split Layout)
- **Communication intent**: Identity is the most interesting finding. Developers protect craft ownership but use AI to augment their skills.
- **Text on slide**: Right half (white): Section label "THE IDENTITY PARADOX" / 1px rule / Large serif quote (32pt): "I do not want AI to handle writing code for me. That's the part I enjoy." / Attribution "— P110, Senior Developer" in small uppercase sans / Below, separated by 40px: a second smaller quote (22pt): "AI should enhance human engineers' learning, not replace tasks that allow them to become better." / "— P16"
- **Visual**: `assets/identity-photo.png` (hands typing on mechanical keyboard, dramatic dark side-lighting — the physical act of craft) fills left half
- **Build notes**: Hard 50/50 split. Photo left, content right. Quotes in Playfair Display, regular weight. 10% internal padding on right half. The close-up of hands on keyboard — the physical craft — juxtaposed with quotes about protecting that craft. The photo makes the abstract concept of "identity" tangible.
- **Speaker notes**: Identity shows a dual pattern: lower openness (beta=-.09) but higher usage (beta=.15). Developers protect their craft identity while pragmatically using AI. "Augment your craft, don't surrender it."

### Slide 9: Three Task Clusters
- **Status**: pending
- **Key**: s09-clusters
- **Layout archetype**: D4 (Full-Bleed Dark Photography, adapted for structured overlay)
- **Communication intent**: Introduce the three clusters with their appraisal signatures
- **Text on slide**: Three columns of white text over dark photo: Large serif bold label ("C1", "C2", "C3") / Uppercase sans-serif cluster name below ("CORE WORK", "PEOPLE & AI-BUILDING", "OPS & COORDINATION") / Below each: 2–3 lines of body text listing key tasks and AI stance in light gray
- **Visual**: full-bleed dark photograph — `assets/clusters-bg.png` (dark concrete architectural beams/columns looking upward — structural, geometric, monumental). The architectural solidity maps to the structural analysis of task clusters.
- **Build notes**: Photo covers full slide. Three even columns of white text spanning 80% of slide width, positioned in lower 60% of slide. 1px vertical rules separating columns (#333333). Each cluster header is large (64pt) white serif numeral. Cluster names in 12pt uppercase white sans with extreme tracking. Body text in 10pt sans, light gray (#CCCCCC). The dark concrete texture provides visual weight while the geometric columns of the photo echo the three-column layout.

### Slide 10: The Quadrant Map
- **Status**: pending
- **Key**: s10-quadrant
- **Layout archetype**: D3 (Content Slide — White)
- **Communication intent**: The centerpiece — show where tasks fall on Need vs. Use, revealing gaps
- **Text on slide**: Section label "NEED VS. USE" / 1px rule / Title "Where AI Support Is Needed vs. Used" in serif bold / Below: the figure
- **Visual**: chart — `assets/quadrant-map.png` (scatter plot of tasks by z-score openness vs usage, color-coded by cluster, four quadrant labels: Build, Improve, Sustain, De-prioritize)
- **Build notes**: White background. Figure presented at 60–70% slide width, left-aligned with the text column. The figure has a white background so it integrates naturally. Minimal labeling — let the figure breathe.

### Slide 11: Core Work
- **Status**: pending
- **Key**: s11-core-work
- **Layout archetype**: D5 (Split Layout)
- **Communication intent**: For core work, devs want AI as collaborator — boost efficiency, retain oversight.
- **Text on slide**: Right half (white): Section label "CORE WORK — C1" / 1px rule / Title "Augment, Don't Replace" in serif bold / Body (sans, 55% of half-width): "Workflow efficiency. Proactive quality. Cross-context awareness." / Separator / "But: retain oversight, decision control, preserve craft."
- **Visual**: `assets/core-work-photo.png` (dark profile silhouette of developer at keyboard, monitor glow in background — isolated focus, low-key cinematic) fills left half
- **Build notes**: Hard 50/50 split. Photo left, content right. 10% internal padding on right half. The solitary developer silhouette reinforces the "augment the craftsperson" message — individual expertise enhanced, not replaced.

### Slide 12: Ops & Coordination
- **Status**: pending
- **Key**: s12-ops
- **Layout archetype**: D5 (Split Layout)
- **Communication intent**: Reduce toil — but only with reliability, determinism, and human gates
- **Text on slide**: Right half (white): Section label "OPS & COORDINATION — C3" / 1px rule / Title "Automate the Toil" in serif bold / Body: "CI/CD pipelines. Environment setup. Documentation." / Separator / "Determinism, verifiability, human-gated." / Small quote: "Anything that touches prod stays behind human gates." — P165
- **Visual**: `assets/ops-photo.png` (close-up server rack cable management, dark metallic, shallow depth of field — industrial precision) fills left half
- **Build notes**: Hard 50/50 split. Photo left, content right. 10% internal padding on right half. The industrial precision of the server rack cables maps to the "reliability-first" message.

### Slide 13: People & AI-Building
- **Status**: pending
- **Key**: s13-people
- **Layout archetype**: D4 (Full-Bleed Dark Photography)
- **Communication intent**: Identity & relationships → AI resisted. Mentoring, craft, trust are irreducibly human.
- **Text on slide**: Small white sans-serif text, bottom-left: "PEOPLE & AI-BUILDING — C2" / Below: "Keep It Human" in medium serif (32pt, white)
- **Visual**: full-bleed dark photograph — `assets/people-photo.png` (two silhouettes facing each other in near-total darkness, edge-lit — human connection distilled to its essence)
- **Build notes**: Photo covers full slide. Minimal text — just the label and short title. The photograph carries the emotional weight. The two facing silhouettes are the most emotionally resonant image in the deck — let the audience absorb it. Speaker notes carry the analytical content.
- **Speaker notes**: People & AI-Building cluster shows the highest identity scores. Mentoring is about relationships, not information transfer. AI integration is craftwork. Developers quote: "Relationships are important" (P85), "Mentoring teaches the mentor as well" (P228). This cluster actively resists AI delegation.

### Slide 14: The Augmentation Spectrum
- **Status**: pending
- **Key**: s14-spectrum
- **Layout archetype**: D3 (Content Slide — White)
- **Communication intent**: Synthesis — where each cluster falls on the augment/automate/resist spectrum
- **Text on slide**: Section label "SYNTHESIS" / 1px rule / Title "The Augmentation Spectrum" in serif bold / Below: a horizontal thin 1px rule spanning 80% width representing the spectrum, with three labeled positions: left "AUGMENT", center "AUTOMATE", right "RESIST" / Below each position: the cluster name and its driving appraisal in body text
- **Visual**: text-only
- **Build notes**: White background. The spectrum is purely typographic — a thin horizontal rule with three position markers (small vertical tick marks). "AUGMENT" label in bold sans below left tick, with "Core Work — value + identity" in regular sans below. Same pattern for "AUTOMATE" (Ops — low identity + demands) and "RESIST" (People — high identity + relational). No arrows, no color coding — the horizontal position on the line communicates the gradient.

### Slide 15: RAI Priorities
- **Status**: pending
- **Key**: s15-rai
- **Layout archetype**: D3 (Content Slide — White)
- **Communication intent**: RAI priorities vary by task context — Reliability/Privacy for systems, Fairness/Inclusiveness for people work
- **Text on slide**: Section label "RESPONSIBLE AI" / 1px rule / Title "Priorities Vary by Context" in serif bold / Below: the figure / Small takeaway text: "Systems-facing tasks: Reliability & Safety (85%). People-facing tasks: Fairness & Inclusiveness elevated."
- **Visual**: chart — `assets/rai-chart.png` (grouped bar chart showing RAI principle selection rates across 5 task categories)
- **Build notes**: White background. Figure presented at 65% slide width, left-aligned. The figure has a white background so it integrates naturally. Takeaway text in body sans below the figure.

### Slide 16: Implications
- **Status**: pending
- **Key**: s16-implications
- **Layout archetype**: D3 (Content Slide — White)
- **Communication intent**: Three actionable design principles for tool builders
- **Text on slide**: Section label "IMPLICATIONS FOR TOOL BUILDERS" / 1px rule / Three numbered items in large serif: "01" Task-Aware Personas / "02" Human-Gated Control / "03" Augmentation, Not Automation / Each with a 2-line sans body description
- **Visual**: text-only
- **Build notes**: White background. Numbered list using large serif numerals (48pt, Playfair Display Bold) left-aligned, with the title on the same baseline in 24pt serif bold. Description text indented below in body sans, medium gray, 55% width. 40px vertical gap between items. The large numbers create visual rhythm and scannable hierarchy. No cards, no icons.

### Slide 17: Closing
- **Status**: pending
- **Key**: s17-closing
- **Layout archetype**: D1 (Title Slide, adapted)
- **Communication intent**: Memorable close — "Deliver AI where it matters"
- **Text on slide**: "DELIVER AI WHERE IT MATTERS" in oversized Playfair Display (white, ~140pt) / Below (32px gap): "Preserve agency. Foster expertise. Sustain meaningful work." in small uppercase Inter, extreme letter-spacing (+120), white / Bottom-left: author names and conference in caption sans, medium gray
- **Visual**: full-bleed dark photograph — `assets/closing-bg.png` (rooftop balcony overlooking misty gray cityscape — aspirational, expansive, cool fog softening the horizon)
- **Build notes**: Photo covers full slide. Title left-aligned at ⅓ mark. The bookend structure mirrors Slide 1 — dark photo + white serif title — creating narrative closure. The cityscape's expansiveness contrasts with Slide 1's corridor depth, broadening the perspective from "looking down a path" to "looking out at the world." The subtitle shifts from the paper's analytical tone to a call to action.

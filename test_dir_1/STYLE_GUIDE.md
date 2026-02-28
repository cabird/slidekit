# BLED — Minimalist Presentation Style Guide

> Derived from pixel-level analysis of all 27 slides in the "BLED" minimalist presentation template.
> This guide is prescriptive: follow it to reproduce the template's editorial aesthetic for any topic.

---

## A. Overall Aesthetic

**Design Philosophy:** High-end editorial / magazine design adapted for presentations. The template channels the visual language of luxury tech publications — think *Wallpaper\**, *Monocle*, or Apple keynote aesthetics. Every slide communicates restraint, sophistication, and confidence through generous negative space and bold typographic gestures.

**Core Principles:**

1. **Monochromatic dominance.** The entire deck operates in black, white, and gray. Color comes from photography, never from decorative fills or UI chrome.
2. **Typography as architecture.** Oversized serif letterforms function as structural design elements, not just readable text. Words bleed off edges, overlap images, and create visual landmarks.
3. **Photography carries emotion.** Dark, desaturated, futuristic imagery provides all the visual richness. The template never competes with its photos — it frames them.
4. **Radical simplicity.** No gradients, no drop shadows, no rounded corners, no emoji, no clip art, no icon libraries. Every element earns its place.
5. **Asymmetric tension.** Layouts favor dynamic off-center compositions over centered, symmetrical arrangements. Text blocks sit at ⅓ or ⅔ marks, not dead center.

**Mood Keywords:** Restrained, futuristic, editorial, monochromatic, architectural, cinematic, luxurious, confident.

---

## B. Color System

### Primary Palette

| Role | Hex | RGB | Usage |
|---|---|---|---|
| **Primary Black** | `#000000` | 0, 0, 0 | Backgrounds on dark slides, primary text on light slides, full-bleed photo overlays |
| **Pure White** | `#FFFFFF` | 255, 255, 255 | Backgrounds on content slides, text on dark slides, negative space |
| **Dark Gray** | `#1A1A1A` | 26, 26, 26 | Slightly lifted black for large background areas; avoids harsh pure-black on screens |
| **Medium Gray** | `#808080` | 128, 128, 128 | Body text on white backgrounds, secondary information, date/credit lines |
| **Light Gray** | `#E5E5E5` | 229, 229, 229 | Thin horizontal rules, subtle separators, background tint for alternating sections |

### Accent Color (Use Sparingly)

| Role | Hex | RGB | Usage |
|---|---|---|---|
| **Teal Accent** | `#00C8B4` | 0, 200, 180 | Small typographic accents only — a single word, an asterisk marker, a thin highlight bar. **Never as a background fill.** Maximum area: ≤ 5% of any slide. See slide 15 for correct usage. |

### Color Rules

- **Background fills** are restricted to `#000000`, `#1A1A1A`, `#FFFFFF`, or `#F5F5F5`. No other solid-color backgrounds.
- **Text colors** are black-on-white or white-on-dark. No colored text except the teal accent on rare occasions.
- **Charts and data visualizations** use the grayscale palette: black, dark gray, medium gray, light gray. One data series may use the teal accent for emphasis.
- **Photography** is the primary vehicle for visual interest — not color fills.
- **Never use** warm colors (red, orange, yellow), saturated blues, or purples anywhere in the deck.

---

## C. Typography System

### Font Pairing

| Role | Font Family | Style | Fallback |
|---|---|---|---|
| **Display / Headings** | High-contrast Didone serif (e.g., **Playfair Display**, **Didot**, **Noto Serif Display**, or **Cormorant Garamond**) | Regular & Bold | Georgia, Times New Roman |
| **Body / Captions** | Geometric or grotesque sans-serif (e.g., **Inter**, **Helvetica Neue**, **DM Sans**, or **Work Sans**) | Regular, Medium, SemiBold | Arial, Calibri |

### Type Scale

| Element | Font | Weight | Size (relative to slide width) | Case | Tracking | Line Height |
|---|---|---|---|---|---|---|
| **Hero Display** | Serif | Regular or Bold | 15–25% of slide width (≈ 120–200pt at 1920px) | UPPERCASE or Title Case | +50 to +100 (very wide) | 0.85–0.95 (tight) |
| **Decorative Bleed Text** | Serif | Bold | 20–35% of slide width (oversized, intentionally cropped) | UPPERCASE | +20 to +50 | 0.80 (extremely tight) |
| **Section Heading** | Serif | Bold | 5–8% of slide width (≈ 40–64pt) | UPPERCASE or Title Case | +20 to +40 | 1.1 |
| **Slide Title** | Serif | Bold | 3–5% of slide width (≈ 28–40pt) | UPPERCASE | +10 to +20 | 1.2 |
| **Subtitle / Tagline** | Sans-serif | Medium | 1.5–2.5% of slide width (≈ 14–20pt) | UPPERCASE | +80 to +150 (very wide) | 1.4 |
| **Body Text** | Sans-serif | Regular | 1–1.5% of slide width (≈ 10–14pt) | Sentence case | 0 (normal) | 1.5–1.7 |
| **Caption / Label** | Sans-serif | SemiBold | 0.7–1% of slide width (≈ 7–10pt) | UPPERCASE | +100 to +200 (extremely wide) | 1.3 |
| **Footnote / Credit** | Sans-serif | Regular | 0.5–0.7% of slide width (≈ 5–7pt) | Sentence case or UPPERCASE | +50 | 1.4 |

### Typography Rules

1. **Uppercase is structural.** Use UPPERCASE for labels, categories, navigation cues, and short headings (≤ 5 words). Never set full paragraphs in uppercase.
2. **Wide letter-spacing signals hierarchy.** The smaller the text, the wider the tracking. Captions and labels get the widest spacing (+100–200). Hero text gets moderate spacing (+50–100). Body text gets normal spacing.
3. **Tight line-height for display.** Large serif headings use line-heights of 0.85–0.95 so ascenders/descenders nearly touch adjacent lines. This creates visual density and editorial impact.
4. **One serif, one sans-serif.** Never introduce a third typeface. Monospace is acceptable only for code samples or technical data.
5. **Weight contrast, not size alone.** Differentiate hierarchy through weight changes (Regular → Bold) combined with size, not size alone.
6. **Text alignment:** Left-aligned for body text. Display text may be left-aligned or centered depending on layout. Never justified. Never right-aligned except for small date/number labels in data layouts.

---

## D. Layout Templates

All slides operate on a **1920 × 1080 px** canvas (16:9 aspect ratio). Below are the recurring layout archetypes, each referencing the specific slides that demonstrate it.

### D1. Title Slide (Slides 1, 27)

```
┌─────────────────────────────────────────────┐
│                                             │
│   [Full-bleed dark photograph]              │
│                                             │
│          PRESENTATION                       │
│            TITLE                            │
│                                             │
│     ▼ Subtitle in small uppercase sans      │
│                                             │
└─────────────────────────────────────────────┘
```

- Full-bleed dark photo covers entire slide
- Title in oversized serif, white, centered or left-⅓
- Subtitle in small uppercase sans-serif with extreme letter-spacing, positioned below title
- Small triangle marker (▼) may precede subtitle
- No logos, no borders, no background overlays — photo darkness provides contrast naturally

### D2. Section Divider / Big Typography (Slides 3, 10, 16, 26)

```
┌─────────────────────────────────────────────┐
│                                             │
│  INSPI                                      │
│  RATION                                     │
│                                             │
│         [optional small subtitle below]     │
│                                             │
└─────────────────────────────────────────────┘
```

- One or two words in massively oversized serif fill 60–80% of slide area
- Text may be cropped at edges (bleeds off top/bottom/sides intentionally)
- Background: pure white, dark photo, or `#1A1A1A`
- Text color: black on white, or white on dark
- Minimal or no additional content — the word IS the slide
- Use for section transitions, topic introductions, or dramatic emphasis

### D3. Content Slide — White Background (Slides 2, 5, 9, 12, 17, 20, 24, 25)

```
┌─────────────────────────────────────────────┐
│                                             │
│  SECTION LABEL          ▼                   │
│  ─────────────────────────                  │
│  Slide Title in Serif Bold                  │
│                                             │
│  Body text in sans-serif regular,           │
│  left-aligned, moderate width               │
│  (50-65% of slide width).                   │
│                                             │
│  [Optional: stats, images, or data]         │
│                                             │
│                          page number / note  │
└─────────────────────────────────────────────┘
```

- White (`#FFFFFF`) or near-white (`#F5F5F5`) background
- Section label in small uppercase sans-serif at top
- Thin horizontal rule (`#E5E5E5` or `#808080`, 1px) separating label from title
- Title in serif bold, left-aligned
- Body text in sans-serif, constrained to 50–65% of slide width for readability
- Generous left and top margins (≈ 8–12% of slide dimensions)
- Optional imagery, stats, or supporting elements on the right or below

### D4. Full-Bleed Dark Photography (Slides 7, 11, 14, 23)

```
┌─────────────────────────────────────────────┐
│                                             │
│   [Full-bleed dark/moody photograph]        │
│                                             │
│                                             │
│                                             │
│                     Small white text label   │
│                     or no text at all        │
│                                             │
└─────────────────────────────────────────────┘
```

- Photo covers 100% of slide, edge-to-edge, no margins
- Photo must be inherently dark (low-key lighting) — no overlays or scrims
- Minimal text: at most a small label, caption, or single phrase in white sans-serif
- Used for atmosphere, pacing, and visual breathing room between content-heavy slides

### D5. Split Layout — Image + Text (Slides 8, 19)

```
┌──────────────────────┬──────────────────────┐
│                      │                      │
│  [Dark photograph]   │  SECTION LABEL       │
│   50% width          │  ─────────────       │
│                      │  Title in Serif      │
│                      │                      │
│                      │  Body text in sans.  │
│                      │  Description here.   │
│                      │                      │
└──────────────────────┴──────────────────────┘
```

- Slide divided vertically: ~50% photo, ~50% text content
- Photo side: dark, moody, edge-to-edge on its half (no internal padding)
- Text side: white background, generous padding (8–10% from edges)
- The division is a hard edge — no gradient blending, no overlap
- Photo can be on left or right; text occupies the opposite side

### D6. Stats / Data Slide (Slides 5, 9, 20, 25)

```
┌─────────────────────────────────────────────┐
│                                             │
│  HIGHLIGHTING OUR WINS                      │
│  ─────────────────────                      │
│                                             │
│   40%        82%        2025                │
│   Label      Label      Label              │
│                                             │
│  [Optional small product image]             │
│                                             │
└─────────────────────────────────────────────┘
```

- White background
- Large serif numbers (bold, 60–100pt) as focal elements
- Small uppercase sans-serif labels beneath each number
- Numbers arranged horizontally with even spacing
- Thin rules may separate groups
- Optional small supporting image (product shot, chart, or icon)

### D7. Team / Grid Layout (Slides 4, 22)

```
┌─────────────────────────────────────────────┐
│                                             │
│  TEAM / PORTFOLIO                           │
│                                             │
│  ┌────┐  ┌────┐  ┌────┐                    │
│  │ ○  │  │ ○  │  │ ○  │   [circular or     │
│  │img │  │img │  │img │    rectangular]     │
│  └────┘  └────┘  └────┘                    │
│  Name     Name     Name                     │
│  Role     Role     Role                     │
│                                             │
└─────────────────────────────────────────────┘
```

- White background
- Images in a grid (2×2, 3×3, or horizontal row)
- Team photos: small circles (≈80–100px diameter)
- Portfolio/product images: rectangles, uniform size
- Names in uppercase sans-serif, centered below each image
- Roles/descriptions in smaller sans-serif, medium gray
- Even spacing between grid items

### D8. Quote / Statement Slide (Slide 21)

```
┌─────────────────────────────────────────────┐
│                                             │
│                                             │
│     "Statement text in large serif,         │
│      spanning 60% of the slide width."      │
│                                             │
│                  — Attribution Name          │
│                                             │
│                                             │
└─────────────────────────────────────────────┘
```

- White or near-black background
- Quote in serif italic or regular, 28–48pt, centered
- Attribution in small uppercase sans-serif below
- Extreme vertical centering with large margins above and below
- No quotation marks as graphic elements — let the text speak

### D9. Accent Detail Slide (Slide 15)

```
┌─────────────────────────────────────────────┐
│                                             │
│   [Dark photograph with device/tech]        │
│                                             │
│            ERA*                              │
│   [* in teal accent color]                  │
│                                             │
└─────────────────────────────────────────────┘
```

- Dark photographic background
- A single word or short phrase in white serif
- One character or small element uses the teal accent (`#00C8B4`) — an asterisk, a letter, or a thin bar
- Accent area is tiny (≤ 5% of slide) — a punctuation mark, not a background
- This is the ONLY correct way to introduce color beyond grayscale

---

## E. Photography & Image Style

### Subject Matter

| Category | Examples | Mood |
|---|---|---|
| **Architecture** | Modern interiors, concrete/glass structures, dramatic angles | Monumental, geometric, austere |
| **Technology** | Concept cars, smartphones, monitors, VR headsets, drones | Futuristic, sleek, aspirational |
| **People** | Single figures in dramatic lighting, silhouettes, space suits | Cinematic, isolated, contemplative |
| **Abstract/Detail** | Chrome reflections, material textures, close-up surfaces | Tactile, refined, mysterious |

### Photographic Treatment

1. **Low-key lighting.** Photos skew dark — shadows dominate, highlights are selective. Average luminance of photos should be 25–40% (dark, not pitch black).
2. **Desaturated color grading.** Colors are muted almost to monochrome. If a photo contains color, it should feel like a tinted black-and-white image, not a vibrant snapshot.
3. **Cool color temperature.** Photos lean cool (blue-gray shadows, silver highlights). Avoid warm tones (golden hour, amber, etc.).
4. **High contrast.** Strong separation between darks and lights. No flat, evenly-lit photos.
5. **Cinematic aspect ratios.** Photos feel wide and filmic even when cropped to 16:9. Avoid portrait-orientation or square-cropped images.
6. **No busy backgrounds.** Subjects are isolated against clean, dark, or blurred backgrounds. No cluttered scenes.
7. **Metallic and reflective surfaces preferred.** Chrome, glass, polished concrete, brushed aluminum — materials that catch light dramatically.

### Image Placement Rules

- **Full-bleed images** have zero margin — they touch all four edges of the slide.
- **Split-layout images** touch three edges (top, bottom, and one side) with the fourth edge being the content boundary.
- **Inline images** (in content slides) are rectangular, edge-aligned with the text block, and sized proportionally.
- **Team/avatar photos** are small circles with subtle grayscale treatment.
- **Never add borders, frames, drop shadows, or rounded corners to images.**
- **Never use stock-photo clichés:** no handshakes, no lightbulbs, no puzzle pieces, no sticky notes on glass walls.

---

## F. Graphic Elements

### Thin Horizontal Rules

- **Weight:** 1px (hairline)
- **Color:** `#E5E5E5` on white backgrounds; `#333333` on dark backgrounds
- **Width:** Either full slide width (minus margins) or ≈ 40–60% width aligned to the left margin
- **Usage:** Separate section labels from titles, divide content groups, mark the end of a text block
- **Never:** Use thick rules, vertical rules, or decorative dividers

### Triangle Marker (▼)

- **Glyph:** Unicode BLACK DOWN-POINTING TRIANGLE (U+25BC) or equivalent
- **Size:** ≈ 6–8pt
- **Color:** Same as adjacent text (black or white depending on background)
- **Usage:** Placed next to section labels or navigation cues; signals "current section" or "continue below"
- **Placement:** Inline with label text, separated by a thin space; or aligned below a heading
- **Frequency:** Sparingly — maximum 1 per slide

### Numbering and Pagination

- **Slide numbers:** Small sans-serif (7–8pt), medium gray, positioned in bottom-right corner or bottom-center
- **Format:** Simple numeral ("01", "02") — zero-padded, no "Slide X of Y"
- **Optional:** May be omitted entirely on full-bleed photo slides and title slides

### What Is Absent (by design)

These elements are **never** used in this template:

- ❌ Icons or icon sets
- ❌ Bullet points (use short paragraphs, numbered lists, or spatial separation instead)
- ❌ Logos (except on a dedicated logo slide, if needed)
- ❌ Borders or outlines on content boxes
- ❌ Gradient fills
- ❌ Rounded rectangles or pill shapes
- ❌ Decorative patterns or textures
- ❌ Emojis
- ❌ Clip art or illustrations
- ❌ Animated transitions (implied — the aesthetic is static and confident)
- ❌ Drop shadows on any element

---

## G. Spacing & Grid System

### Margins

| Edge | Margin (% of slide dimension) | Pixel value at 1920×1080 |
|---|---|---|
| **Left** | 8–10% of width | 154–192 px |
| **Right** | 8–10% of width | 154–192 px |
| **Top** | 8–12% of height | 86–130 px |
| **Bottom** | 6–8% of height | 65–86 px |

- Full-bleed photo slides ignore all margins (0 px on all sides).
- Content slides respect all four margins consistently.

### Content Width Constraints

- **Body text blocks** never span more than 55–65% of the slide width. This ensures comfortable reading line lengths (45–75 characters per line).
- **Headings** may span up to 80% of slide width.
- **Decorative/bleed text** intentionally exceeds 100% — cropped by slide edges.

### Vertical Rhythm

- **Section label to rule:** 8–12 px gap
- **Rule to title:** 16–24 px gap
- **Title to body text:** 24–40 px gap
- **Between body paragraphs:** 16–20 px gap
- **Body text to supporting element (image/chart):** 32–48 px gap
- **General principle:** Spacing between elements increases with hierarchy distance. Tightly related elements cluster; distinct sections breathe.

### Grid Structure

The template does not use a rigid 12-column grid. Instead, it follows an **editorial zone model:**

```
┌──────────────────────────────────────────────────┐
│ Margin                                     Margin│
│  ┌──────────────────────────────────────────┐    │
│  │  CONTENT ZONE (≈ 80–84% of slide width)  │    │
│  │                                          │    │
│  │  ┌─────────────────┐  ┌──────────────┐  │    │
│  │  │  PRIMARY TEXT    │  │  SECONDARY   │  │    │
│  │  │  (55–65%)        │  │  (25–35%)    │  │    │
│  │  └─────────────────┘  └──────────────┘  │    │
│  │                                          │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
└──────────────────────────────────────────────────┘
```

- **Primary text zone:** Left-aligned, 55–65% of content zone width. Contains headings and body text.
- **Secondary zone:** Right-aligned, 25–35% of content zone width. Contains supporting stats, small images, or supplementary text.
- **For split layouts:** The slide divides into two equal 50% zones at the slide midpoint. One zone is image, the other is text with internal margins.

### Alignment Principles

1. **Left edges align.** Section labels, titles, body text, and supporting elements share a common left margin.
2. **Baseline alignment.** When multiple text elements sit on the same horizontal band, their baselines align.
3. **Image edges align to text.** The right edge of an inline image aligns with the right boundary of the text block, or the image extends to the slide edge.
4. **Bottom anchoring.** Page numbers, credits, and footnotes anchor to the bottom margin.

---

## H. Anti-Patterns — What NOT to Do

The following slides in the original template break its own design language. They should be **excluded from any recreation** and serve as examples of what to avoid.

### ❌ Slides 6, 13, 18 — Solid Bright Background Fills

**What they do wrong:**

| Issue | Detail |
|---|---|
| **Background color** | Slides 6 and 18 use a saturated chartreuse/lime-green (`≈ #C8FF00`). Slide 13 uses a saturated turquoise/teal (`≈ #00D4AA`). These are jarring, neon-bright fills that clash with the monochromatic system. |
| **Text treatment** | Black body text and headings sit directly on these bright backgrounds. The combination creates visual vibration (especially chartreuse + black) that is uncomfortable and amateurish. |
| **Violation of color rules** | The rest of the deck restricts backgrounds to black, white, and near-neutrals. Introducing a neon fill destroys the visual coherence that 24 other slides carefully maintain. |
| **Contrast with photography** | When sequenced between dark, moody photo slides, these bright fills create a jarring "pop" that breaks the cinematic rhythm rather than enhancing it. |

**Why this matters:**

The template's strength is its restraint. A neon background fill is the visual equivalent of shouting in a quiet room — it gets attention, but at the cost of sophistication. The correct way to introduce the teal accent is shown in **Slide 15**: a single tinted character or tiny element, not a full-slide wash.

**Rules derived from this anti-pattern:**

1. **Never use a saturated color as a slide background.** Backgrounds are black, near-black, white, or near-white. Period.
2. **Never pair neon/saturated fills with black body text.** If accent color appears, it is used on individual characters, thin bars, or small markers — not as a readable text background.
3. **Accent color area ≤ 5% of any slide.** If you can't describe the accent as "a detail," it's too much.
4. **Maintain tonal continuity.** Every slide should feel like it belongs to the same deck. A solid chartreuse slide between two dark photography slides is a visual non sequitur.

### Additional Anti-Patterns to Avoid (General)

| Anti-Pattern | Why It Fails |
|---|---|
| Centering everything | Destroys the asymmetric tension that gives the template its editorial feel |
| Using bullet points | Creates visual clutter; use spatial separation or numbered lists instead |
| Adding decorative borders | Contradicts the "less is more" philosophy; let whitespace define boundaries |
| Using warm/saturated photography | Breaks the cool, desaturated, futuristic mood |
| Placing text on busy image areas | Text becomes unreadable; choose inherently dark or simple image regions |
| Using more than 2 fonts | Dilutes the deliberate serif/sans-serif contrast |
| Filling every slide with content | The template's power comes from what it leaves out; let slides breathe |
| Adding company logos to every slide | Reserve logos for title/closing slides only; they clutter the editorial aesthetic |

---

## Quick Reference Card

```
PALETTE:        #000000 / #1A1A1A / #808080 / #E5E5E5 / #FFFFFF
                Accent: #00C8B4 (≤ 5% area, never as background)

FONTS:          Display → Didone Serif (Playfair Display / Didot / Cormorant)
                Body    → Geometric Sans (Inter / Helvetica Neue / DM Sans)

HIERARCHY:      UPPERCASE WIDE-TRACKED LABEL
                ─────────────────────────
                Serif Bold Heading
                Sans-serif regular body text.

PHOTOS:         Dark, desaturated, cool-toned, high-contrast
                Subjects: architecture, tech, isolated figures
                Placement: full-bleed or split-half

SPACING:        Margins: 8–10% sides, 8–12% top, 6–8% bottom
                Body text width: 55–65% of slide
                Generous vertical gaps between hierarchy levels

GRAPHIC ELEM:   Thin 1px rules, ▼ triangle markers, zero-padded numbers
                NO: icons, bullets, borders, shadows, gradients, emojis

ANTI-PATTERNS:  NO saturated background fills (especially #C8FF00, #00D4AA)
                NO centered-everything layouts
                NO warm or busy photography
```

---

*This style guide was generated from analysis of the BLED Minimalist Presentation Template (27 slides). Slides 6, 13, and 18 are flagged as anti-patterns and excluded from the recommended design system.*

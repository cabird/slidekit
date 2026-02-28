# SlideKit Replication Guide — test_dir_2

## Goal

Recreate the 17-slide presentation found in `test_dir_2/source/` using SlideKit.
The original is a Reveal.js deck built with raw HTML/CSS. We are replicating it
using SlideKit's coordinate-based API to test the library's capabilities and
document strengths, weaknesses, bugs, and missing features.

## Architecture

The **orchestrator** (main agent) manages the overall flow. It delegates each
slide to a **sub-agent** that does the full cycle autonomously:

1. Read the reference image, source HTML section, source CSS
2. Read the current slides.js to understand the pattern/tokens already in use
3. Read the SlideKit API docs (API.md) for the functions it needs
4. Write the slide code (append to slides.js)
5. Return the code and a notebook entry

The orchestrator then:
- Verifies the code was appended correctly
- Opens/reloads the presentation in Playwright
- Takes a screenshot
- Sends screenshot + reference to a comparison sub-agent
- Checks scene model (warnings/errors/collisions) via browser console
- If fixes are needed, sends a fix sub-agent
- Appends the notebook entry to REPLICATION_NOTEBOOK.md

## Directory Layout

```
test_dir_2/
├── REPLICATION_GUIDE.md      ← This file
├── REPLICATION_NOTEBOOK.md   ← Running log of findings per slide
├── slides.js                 ← SlideKit slide code (accumulated)
├── presentation.html         ← Reveal.js harness
├── assets/                   ← Symlink to source/assets
├── reference/                ← Ground-truth screenshots (slide-01.png … slide-17.png)
├── screenshots/              ← Rendered screenshots for comparison
└── source/                   ← Original presentation to replicate
    ├── index.html            ← Original Reveal.js HTML
    ├── css/custom-theme.css  ← Original theme
    └── assets/images/        ← Image assets
```

## Key Files for Sub-Agents

Sub-agents need to read these files:

1. **`/home/cbird/side_projects/presentation_maker/slidekit/API.md`** — SlideKit API reference
2. **`/home/cbird/side_projects/presentation_maker/test_dir_2/source/index.html`** — source HTML (find the right `<section>` for the target slide)
3. **`/home/cbird/side_projects/presentation_maker/test_dir_2/source/css/custom-theme.css`** — source CSS theme
4. **`/home/cbird/side_projects/presentation_maker/test_dir_2/slides.js`** — current slides.js (read to understand existing patterns, design tokens, imports)
5. **`/home/cbird/side_projects/presentation_maker/test_dir_2/reference/slide-NN.png`** — reference image for the target slide

## Design Tokens (from custom-theme.css)

These are defined at the top of slides.js and should be reused:

```js
const C = {
  bg:       '#111827',
  text:     '#F9FAFB',
  muted:    '#9CA3AF',
  accent1:  '#3B82F6',  // blue
  accent2:  '#10B981',  // green
  accent3:  '#F43F5E',  // rose
  accent4:  '#A78BFA',  // purple
  surface:  'rgba(255,255,255,0.06)',
  border:   'rgba(255,255,255,0.1)',
};
const FONT_HEAD = "'Roboto', sans-serif";
const FONT_BODY = "'Inter', sans-serif";
```

## SlideKit API Quick Reference

- **`el(html, props)`** — the single element primitive. HTML string + positioning props.
- **`group(children, props)`** — container with shared coordinate origin
- **`panel(children, props)`** — visual card container (background + padding + vstack children)
- **`hstack(items, props)`** — horizontal stack. Props: `gap`, `align` ("top"|"middle"|"bottom")
- **`vstack(items, props)`** — vertical stack. Props: `gap`, `align` ("left"|"center"|"right")
- **`below(refId, {gap})`** — position Y below another element
- **`rightOf(refId, {gap})`** — position X to the right of another element
- **`centerIn(rect)`** — center in a rectangle. Use spread: `{...centerIn(rect), w: 400}`
- **Common props**: `id`, `x`, `y`, `w`, `h`, `anchor` (tl|tc|tr|cl|cc|cr|bl|bc|br), `layer` (bg|content|overlay), `opacity`, `style`, `className`
- **Canvas**: 1920×1080. Safe zone: `safeRect()` returns `{x:120, y:90, w:1680, h:900}`
- **Panel props**: `padding` (default 24), `gap` (default 16), `fill`, `radius`, `border`. Children with `w:"fill"` get `panelWidth - 2*padding`.
- **Images**: `el('<img src="path" style="width:100%;height:100%;object-fit:cover">', {x, y, w, h})`
- **All typography is via inline CSS** in the HTML string (font-family, font-size, font-weight, color, text-align, line-height, letter-spacing, text-transform, etc.)

## Slide Patterns

### Centered hero (slides 1, 3, 9, 14, 16)
All elements at `x: 960, anchor: 'tc'`, chained with `below()`.

### Left-heavy split (slides 2, 4, 5, 7, 8, 11, 12, 13, 17)
- Left column: x=120, w≈850–900. Eyebrow (h3) + headline (h2) + body text.
- Right column: image at x≈1050, w≈750, h≈900, object-fit:contain.
- Text vertically centered by starting around y=250–320.

### Diagram/full-width (slides 6, 10, 15)
Centered content with a large image/table.

## Notebook Entry Format

Each slide entry in REPLICATION_NOTEBOOK.md should include:
- **Slide N: Title**
- **Strategy**: approach taken
- **Result**: match quality (EXCELLENT/GOOD/FAIR/POOR)
- **Issues found**: bugs, workarounds, missing features, API friction
- **Suggestions**: concrete improvements

## Resuming After Context Reset

1. Read this guide
2. Read REPLICATION_NOTEBOOK.md to find the last completed slide
3. Read slides.js to see current state
4. Continue from the next slide using the sub-agent pattern above

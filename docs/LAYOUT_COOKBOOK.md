# SlideKit Layout Cookbook — Quick Reference

A concise, scannable reference of **47 slide composition patterns**. Use this to pick the right layout for any slide you need to build.

## SlideKit Essentials

| Concept | Value |
|---|---|
| Canvas | 1920 × 1080 |
| Safe zone | `safeRect()` → `{ x: 120, y: 90, w: 1680, h: 900 }` |
| Element basics | Every element needs explicit `id` and explicit `w` |
| HTML in el() | `el('<p style="font:700 48px Inter;color:#fff">Text</p>', { id, x, y, w })` |
| CSS | Goes in `style: {}` object, **not** top-level props (see Blocked CSS below) |
| Image paths | Single-quoted with `./` prefix: `'./photo.png'` |
| Spacing tokens | `'xs'`=8, `'sm'`=16, `'md'`=24, `'lg'`=32, `'xl'`=48 |
| Layers | `'bg'`, `'content'` (default), `'overlay'` |
| Shadow presets | `'sm'`, `'md'`, `'lg'`, `'xl'`, `'glow'` |
| Positioning helpers | `below()`, `rightOf()`, `centerVWith()`, `centerIn()` |
| Layout preference | Prefer `splitRect()` over `hstack()` for lint-friendly layouts |
| Height (`h`) | **Rarely needed.** Omit `h` on text elements — SlideKit measures from the DOM automatically. Only specify `h` on fixed-size containers (image frames, background rects, terminal blocks). |
| Main-axis alignment | `vAlign: 'center'` on vstack, `hAlign: 'center'` on hstack — centers content within explicit bounds |

> **Key principle:** Most elements should NOT specify `h`. Use `w` to constrain width, let auto-height handle the rest, and chain vertical positioning with `below()`. Reserve explicit `h` for images, background panels (`layer: 'bg'`), and fixed-size containers.

---

## Best Practices

Quick-reference rules organized by category. Scan these before building a slide.

### Element Sizing

- Don't use `h: left.h` / `h: right.h` from `splitRect()` on content containers (panels, vstacks, text). Those are the full column height. Omit `h` to let content auto-size. Only use `left.h`/`right.h` on background rects (`layer: 'bg'`) or images with `fit: 'cover'`.
- Don't calculate height mathematically (e.g., `fontSize * lineHeight * lines`) — browser font metrics, line breaking, and padding make this inaccurate. Let auto-height measure from the DOM.
- Groups need `w`/`h` or `bounds: 'hug'` to size correctly.

### Positioning

- Use `below()` / `rightOf()` chaining instead of manual y/x arithmetic.
- Prefer `vstack` over chained `below()` when building a text column (5+ sequential text elements).
- Use `centerVWith()` for labels placed next to taller elements (e.g., description text beside a large number).
- Match `textAlign` to positioning direction — use `textAlign: 'right'` with `leftOf()`, `textAlign: 'left'` with `rightOf()`.
- Don't use relative positioning helpers (`below`, `rightOf`, `centerVWith`) on stack children — the stack controls their position.
- Don't cross axes — a Y helper like `below()` sets Y, not X. Don't feed it where an X value is expected.

### Anchors

Anchor pins a point on the element to (x, y). Default: 'tl' (top-left).
Anchors are two characters: vertical (top/center/bottom) + horizontal (left/center/right).

'tl' 'tc' 'tr' — top edge, varying horizontal
'cl' 'cc' 'cr' — vertical center, varying horizontal
'bl' 'bc' 'br' — bottom edge, varying horizontal

The anchor point is pinned to (x, y). The rest of the element extends away from that point. Example: anchor:
'tr' means the element's top-right corner sits at (x, y), so the element extends left and down.

- safe.x, left.x, splitRect() outputs are left-edge values → use 'tl' (default) or no anchor
- 960 (canvas midpoint) is a center value → use 'tc', 'cc', or 'bc'
- Mismatch (left-edge x + center anchor) pushes the element off-screen

### Layout Containers

- For 3+ columns, compute positions explicitly with column math instead of `hstack()` or `cardGrid()`. Formula: `colW = Math.floor((safe.w - (cols-1) * gap) / cols)`.
- `align: 'stretch'` on stacks for equal-height (hstack) or equal-width (vstack) card layouts.

### Spacing

- Minimum gap: 8px (`'xs'`) between text elements.
- Use proportional spacing after large visuals — `gap: 'xl'` (48px) or larger between a hero image and the text below it.

### Layers

- Background rects and images should always have `layer: 'bg'`. Without it, they render on the content layer and can occlude text.

### Styling

- Don't use blocked CSS in `style: {}` — no `position`, `width`, `height`, `margin`, `display`, `overflow`, or `transform`. Use the corresponding SlideKit props (see Blocked CSS table below).
- Semi-transparent background fills need opacity >= 0.25 for sufficient text contrast (e.g., `rgba(10,10,26,0.75)` not `rgba(10,10,26,0.10)`).

### Compounds

- `panel()` supports `vAlign` for centering content vertically within an explicit `h`.
- Don't use `anchor: 'tc'` on `figure()` — it causes linter false positives. Use explicit `x`/`y` math to center figures.
- Connector curves need corner anchors to render correctly — use `tr` to `tl` or `br` to `bl`, not center-edge pairs like `cr` to `cl` (those produce straight lines, not curves).
- Connector `dash` is **space-separated** (`'6 4'`), not comma-separated (`'6,4'`).

---

## Blocked CSS Properties

SlideKit **blocks** certain CSS properties in `style: {}`. Using them will cause lint errors or silent failures. Use the corresponding SlideKit prop instead.

| ❌ Blocked CSS | ✅ Use This Prop | Example |
|---|---|---|
| `style: { height: '300px' }` | `h: 300` | `{ id: 'x', w: 400, h: 300 }` |
| `style: { width: '400px' }` | `w: 400` | `{ id: 'x', w: 400 }` |
| `style: { margin: '10px' }` | Use positioning (`x`, `y`, `gap`) | `{ x: safe.x + 10, y: safe.y + 10 }` |
| `style: { position: '...' }` | Implicit — all elements are absolute | Just set `x`, `y` |
| `style: { display: '...' }` | Use `vstack`, `hstack`, `group` | `vstack([...], { gap: 'sm' })` |
| `style: { overflow: '...' }` | Not supported; size elements correctly | Set `w` and `h` to contain content |
| `style: { transform: '...' }` | `rotate`, `flipH`, `flipV` props | `{ rotate: 15 }`, `{ flipH: true }` |

**Why this matters:** Sub-agents consistently use `style: { height: '...' }` despite documentation warnings. Always use SlideKit props for layout dimensions.

---

## Playwright / Browser Verification Notes

⚠️ **`file://` URLs are blocked by Playwright MCP.** Serve over HTTP instead.

Use port `0` so the OS picks a free port automatically (no conflicts, no retries, works on both Linux and
Windows):

```bash
cd /path/to/working_dir
python3 -c "
import http.server, socketserver
handler = http.server.SimpleHTTPRequestHandler
with socketserver.TCPServer(('127.0.0.1', 0), handler) as httpd:
 print(httpd.server_address[1], flush=True)
 httpd.serve_forever()
" &
```

---

## Accent-on-Accent Contrast Trap

A common and non-obvious failure: using your accent color for **both** text and background tint.

```
❌ FAILS CONTRAST (every time):
 Text: #00d4ff (accent blue)
 Fill: '#00d4ff22' (accent at 13% opacity on dark bg)
 Result: ~2.1:1 ratio — fails WCAG AA (needs 4.5:1)

❌ STILL FAILS — increasing opacity doesn't help:
 Fill: '#00d4ff44' (accent at 27% opacity)
 Result: ~1.8:1 ratio — even worse (bg gets lighter, text stays same)

✅ WORKS:
 Text: #ffffff (white)
 Fill: '#0a3040' (dark accent-derived bg)
 Result: ~13:1 ratio — excellent contrast
```

**Rule of thumb:** On any accent-tinted background, use **white text**. Reserve accent-colored text for untinted dark backgrounds only.

---

## Quick Reference Table

| # | ID | Pattern | Category | Key APIs |
|---|---|---|---|---|
| 1 | title | Title / Cover | Cover | `el`, `layer:'bg'`, `anchor:'cc'` |
| 2 | a1 | Equal Split (50/50) | A: Split | `splitRect(0.5)`, `panel`, `vstack` |
| 3 | a2 | Asymmetric Split (35/65) | A: Split | `splitRect(0.35)`, `panel`, `vstack` |
| 4 | a3 | Image Left, Text Right | A: Split | `splitRect(0.45)`, `figure`, `below` |
| 5 | a4 | Text Left, Image Right | A: Split | `splitRect(0.55)`, `figure`, `below` |
| 6 | a5 | Narrow Sidebar (20/80) | A: Split | `splitRect(0.20)`, `figure` |
| 7 | a6 | Split with Overlap | A: Split | `splitRect(0.50, gap:0)`, `panel`, `shadow`, `z` |
| 8 | b1 | Full-Bleed + Text Overlay | B: Hero | `el`, `layer:'bg'`, safe-zone text |
| 9 | b2 | Full-Bleed + Gradient Overlay | B: Hero | `layer:'bg'`, `layer:'overlay'`, gradient div |
| 10 | b3 | Letterboxed Cinematic | B: Hero | `layer:'bg'`, `layer:'overlay'`, bar masks |
| 11 | b4 | Dramatic Typography | B: Hero | `el`, `below`, accent line |
| 12 | b5 | Full-Bleed + Inset Card | B: Hero | `layer:'bg'`, `panel`, `centerIn`, `shadow:'lg'` |
| 13 | c1 | 2-Column Card Grid | C: Grid | `splitRect(0.5)`, `panel` |
| 14 | c2 | 3-Column Card Grid | C: Grid | manual col calc, `panel`, `.map()` |
| 15 | c3 | 4-Column Compact Grid | C: Grid | manual col calc, `panel`, `.map()` |
| 16 | c4 | Uneven Grid (1+2) | C: Grid | `splitRect(0.6)`, `panel`, stacked right |
| 17 | c5 | Icon Grid (4×2) | C: Grid | `figure`, `group`, grid math |
| 18 | d1 | Vertical Stack | D: Stacked | `vstack`, `el` |
| 19 | d2 | Stacked Dividers | D: Stacked | `below`, divider `el` |
| 20 | d3 | Vertical Timeline | D: Stacked | `connect`, trig positioning |
| 21 | d4 | Numbered List | D: Stacked | `below`, `rightOf`, `centerVWith` |
| 22 | e1 | Overlay Panel | E: Layered | `layer:'bg'`, `panel`, rgba fill |
| 23 | e2 | Cascading Stacked Cards | E: Layered | `panel`, offset x/y, `z`, `shadow` |
| 24 | e3 | Corner Brackets | E: Layered | `group`, `layer:'overlay'`, decorative divs |
| 25 | e4 | Floating Islands | E: Layered | `layer:'bg'`, scattered `panel`s, `shadow` |
| 26 | f1 | Centered Pull Quote | F: Typography | `el`, decorative glyph, `below` |
| 27 | f2 | Asymmetric Pull Quote | F: Typography | `splitRect(0.65)`, `centerVWith`, `vstack` |
| 28 | f3 | Big Stat | F: Typography | `el`, huge font, `below` |
| 29 | f4 | Multi-Stat Row | F: Typography | col calc, `group`, `below` |
| 30 | f5 | Title Hierarchy | F: Typography | `vstack`, font-size scale |
| 31 | g1 | Horizontal Bar Chart | G: Data | `el`, `rightOf`, proportional widths |
| 32 | g2 | Process Flow | G: Data | `panel`, `connect(type:'curved')`, `arrow` |
| 33 | g3 | Comparison Table | G: Data | `splitRect(0.5)`, row stacking, alt. bg |
| 34 | g4 | KPI Dashboard | G: Data | 2×2 grid calc, `panel`, `below` |
| 35 | h1 | 3-Image Gallery | H: Image | `figure`, col calc, `below` captions |
| 36 | h2 | Hero Image + Text | H: Image | `figure`, gradient bar, `below` |
| 37 | h3 | Image + Caption | H: Image | `figure`, `vstack` caption block |
| 38 | h4 | Before / After | H: Image | `splitRect(0.5)`, `figure`, divider |
| 39 | i1 | Centered Island | I: Whitespace | `centerIn`, `panel`, `shadow:'xl'` |
| 40 | i2 | Radial Hub-Spoke | I: Whitespace | trig layout, `connect`, `panel` |
| 41 | i3 | Magazine Editorial | I: Whitespace | `figure`, asymmetric manual layout |
| 42 | j1 | Section Divider | J: Utility | `layer:'bg'`, huge muted text, `below` |
| 43 | j2 | Agenda | J: Utility | `below`, dot leaders, `rightOf` |
| 44 | j3 | Closing | J: Utility | `figure(layer:'bg')`, overlay, `below` |
| 45 | j4 | Team Cards | J: Utility | col calc, `panel`, `figure`, `below` |
| 46 | k7 | Crop-to-Shape (clip-path) | K: Bonus | `el`, CSS `clip-path`, `object-fit` |
| 47 | k8 | Flip Horizontal / Vertical | K: Bonus | `el`, `flipH`, `flipV` |

---

## Cover Slide

### Title / Cover

**Intent:** Opening or closing slide with dramatic visual impact.

**Visual:** Full-bleed background image (opacity-dimmed) with large centered headline and subtitle.

**Key code:**
```javascript
el('<div style="width:1920px;height:1080px;background:url(\'./hero-bg.png\') center/cover;opacity:0.6">', {
 id: 'bg', x: 0, y: 0, w: 1920, h: 1080, layer: 'bg',
});
el('<p style="font:700 80px Inter;color:#fff;text-align:center">Title</p>', {
 id: 'heading', x: 960, y: 490, w: 1400, anchor: 'cc',
});
```

**Pairs well with:** J3 closing slide as bookend.

---

## A: Split Layouts

### A1: Equal Split (50/50)

**Intent:** Side-by-side comparison of two concepts.

**Visual:** Two equal-width panels spanning the safe zone with a gap between them.

**Key code:**
```javascript
const { left, right } = splitRect(safe, { ratio: 0.5, gap: 40 });
panel([...], { id: 'left-panel', x: left.x, y: below('title', 'lg'), w: left.w, padding: 'md', gap: 'sm', fill: C.surface, radius: 12 });
panel([...], { id: 'right-panel', x: right.x, y: below('title', 'lg'), w: right.w, ... });
```

**Variations:** Try ratios 0.4–0.6 for subtle asymmetry. Use panel child widths of `w - 48` (2 × padding) for inner content.

**Pairs well with:** `vstack` for text columns, `panel` for contained sections.

---

### A2: Asymmetric Split (35/65)

**Intent:** Narrow sidebar alongside wide main content area.

**Visual:** Left column contains navigation/ToC panel; right column has title + body paragraphs.

**Key code:**
```javascript
const { left, right } = splitRect(safe, { ratio: 0.35, gap: 40 });
panel([...nav items...], { id: 'sidebar', x: left.x, y: safe.y, w: left.w, padding: 'md', gap: 'xs', fill: C.surface, radius: 12 });
el('...title...', { id: 'main-title', x: right.x, y: safe.y, w: right.w });
el('...body...', { id: 'body', x: right.x, y: below('main-title', 'md'), w: right.w });
```

**Variations:** Ratios 0.25–0.40 for sidebar. Place sidebar on either side.

**Pairs well with:** `panel` for sidebar, chained `below()` for body paragraphs.

---

### A3: Image Left, Text Right

**Intent:** Visual evidence on left with explanatory text on right.

**Visual:** `figure()` fills the left column; right column has eyebrow → title → body → stat chain.

**Key code:**
```javascript
const { left, right } = splitRect(safe, { ratio: 0.45, gap: 40 });
figure({ id: 'photo', src: './image.png', x: left.x, y: safe.y, w: left.w, h: left.h, fit: 'cover', containerRadius: 12 });
el('...eyebrow...', { id: 'eyebrow', x: right.x, y: safe.y, w: right.w });
el('...title...', { id: 'title', x: right.x, y: below('eyebrow', 'sm'), w: right.w });
```

**Variations:** Ratio 0.40–0.50 depending on image importance. Add stat callout at bottom.

**Pairs well with:** `figure`, `below()` chains for text hierarchy.

---

### A4: Text Left, Image Right

**Intent:** Narrative-first layout where text leads and image supports.

**Visual:** Left column has title → body → inline stats; right column is a full-height `figure()`.

**Key code:**
```javascript
const { left, right } = splitRect(safe, { ratio: 0.55, gap: 40 });
el('...title...', { id: 'title', x: left.x, y: safe.y, w: left.w });
el('...body...', { id: 'body', x: left.x, y: below('title', 'md'), w: left.w });
el('...stat1-val...', { id: 'stat1-val', x: left.x, y: below('body', 'lg'), w: 200 });
el('...stat1-lbl...', { id: 'stat1-lbl', x: left.x, y: below('stat1-val', 4), w: 200 });
el('...stat2-val...', { id: 'stat2-val', x: rightOf('stat1-val', 40), y: below('body', 'lg'), w: 200 });
el('...stat2-lbl...', { id: 'stat2-lbl', x: rightOf('stat1-lbl', 40), y: below('stat2-val', 4), w: 200 });
figure({ id: 'photo', src: './image.png', x: right.x, y: safe.y, w: right.w, h: right.h, fit: 'cover', containerRadius: 12 });
```

**Pairs well with:** `rightOf()` for side-by-side stat columns, `below()` for vertical chains.

---

### A5: Narrow Sidebar (20/80)

**Intent:** Vertical accent strip (portrait image, author photo) with wide text area.

**Visual:** Thin 20% column with portrait `figure()`; 80% column has name → role → bio.

**Key code:**
```javascript
const { left, right } = splitRect(safe, { ratio: 0.20, gap: 'lg' });
figure({ id: 'portrait', src: './portrait.png', x: left.x, y: safe.y, w: left.w, h: left.h, fit: 'cover', containerRadius: 12 });
el('...name...', { id: 'name', x: right.x, y: safe.y, w: right.w });
```

**Variations:** 0.15–0.25 for sidebar width. Good for accent color strips too.

**Pairs well with:** `figure` for portraits, `below()` for text chain.

---

### A6: Split with Overlap

**Intent:** Bridging two concepts with a floating card that crosses the split boundary.

**Visual:** No-gap 50/50 split (panel bg left, image right) with a centered card overlapping both.

**Key code:**
```javascript
const { left, right } = splitRect(safe, { ratio: 0.50, gap: 0 });
const overlapW = 560;
const overlapX = safe.x + (safe.w - overlapW) / 2;
panel([], { id: 'left-bg', x: left.x, y: safe.y, w: left.w, h: left.h, fill: C.surface, radius: 0, layer: 'bg' });
figure({ id: 'right-img', ... });
panel([...], { id: 'overlap-card', x: overlapX, y: safe.y + safe.h / 2 - 100, w: overlapW,
 padding: 'lg', gap: 'sm', fill: '#0d1b3e', radius: 16, shadow: 'xl', border: '...', z: 10 });
```

**Key detail:** Use `z: 10` on the overlap card to ensure it renders above both halves. Use `gap: 0` in splitRect.

**Pairs well with:** `shadow: 'xl'` for depth, `border` for edge definition.

---

## B: Full-Bleed / Hero

### B1: Full-Bleed + Text Overlay

**Intent:** Dramatic hero moment with photo-driven storytelling.

**Visual:** Full-screen image on `bg` layer; large headline and subtitle in lower-left safe zone.

**Key code:**
```javascript
el('<img src="./hero.png" style="width:100%;height:100%;object-fit:cover;opacity:0.7">', {
 id: 'bg', x: 0, y: 0, w: 1920, h: 1080, layer: 'bg',
});
el('...headline...', { id: 'headline', x: safe.x, y: safe.y + safe.h - 280, w: 800 });
el('...subtitle...', { id: 'subtitle', x: safe.x, y: below('headline', 'sm'), w: 700 });
```

**Key detail:** Position text in lower-left for visual weight. Control image brightness via `opacity`.

---

### B2: Full-Bleed + Gradient Overlay

**Intent:** Background image remains visible while ensuring text readability.

**Visual:** Image on `bg` layer, gradient div on `overlay` layer fading from transparent to dark at bottom, text over it.

**Key code:**
```javascript
el('<img src="./photo.png" style="width:100%;height:100%;object-fit:cover">', {
 id: 'bg', x: 0, y: 0, w: 1920, h: 1080, layer: 'bg',
});
el('<div style="width:100%;height:100%;background:linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 40%, transparent 70%)"></div>', {
 id: 'gradient', x: 0, y: 0, w: 1920, h: 1080, layer: 'overlay',
});
el('...title...', { id: 'title', x: safe.x, y: safe.y + safe.h - 240, w: 1000 });
el('...body...', { id: 'body', x: safe.x, y: below('title', 'sm'), w: 900 });
```

**Key detail:** Gradient direction matters — `to top` keeps bottom text readable.

---

### B3: Letterboxed Cinematic

**Intent:** Cinematic framing for dramatic reveals or video-style stills.

**Visual:** Full image on `bg`; two solid black bars (top 160px, bottom 160px) on `overlay`; centered text in the visible strip.

**Key code:**
```javascript
const strip = { x: 0, y: 160, w: 1920, h: 760 };
el('<img ...>', { id: 'bg', x: 0, y: 0, w: 1920, h: 1080, layer: 'bg' });
el('<div style="width:100%;height:100%;background:#000"></div>', { id: 'bar-top', x: 0, y: 0, w: 1920, h: 160, layer: 'overlay' });
el('<div style="width:100%;height:100%;background:#000"></div>', { id: 'bar-bot', x: 0, y: 920, w: 1920, h: 160, layer: 'overlay' });
el('...title...', { id: 'title', x: 960, y: centerIn(strip).y, w: 1400, anchor: 'tc' });
el('...subtitle...', { id: 'subtitle', x: 960, y: below('title', 'sm'), w: 1400, anchor: 'tc' });
```

**Variations:** Adjust bar height (120–200px) for more/less cinematic ratio.

---

### B4: Dramatic Typography

**Intent:** Pure typographic impact — no images, just words.

**Visual:** Centered accent line → oversized headline (96px) → supporting text, all center-aligned.

**Key code:**
```javascript
el('', {
 id: 'accent', x: safe.x + (safe.w - 80) / 2, y: safe.y + 200, w: 80, h: 4,
 style: { background: '#00d4ff', borderRadius: '2px' }, layer: 'overlay',
});
el('<p style="font:700 96px Inter;...;text-align:center">Build for<br>tomorrow.</p>', {
 id: 'headline', x: 260, y: below('accent', 'lg'), w: 1400,
});
el('<p style="font:400 28px Inter;...;text-align:center">Supporting text here.</p>', {
 id: 'support', x: 360, y: below('headline', 40), w: 1200,
});
```

**Variations:** Font sizes 72–120px for headline. Use `<br>` for deliberate line breaks.

**Pairs well with:** Accent-colored decorative lines, centered layout.

---

### B5: Full-Bleed + Inset Card

**Intent:** Call-to-action or key takeaway floating over imagery.

**Visual:** Dimmed background image; centered floating panel with title, body, and CTA.

**Key code:**
```javascript
const cardW = 720;
const centered = centerIn(safe);
el('<img ...opacity:0.5">', { id: 'bg', x: 0, y: 0, w: 1920, h: 1080, layer: 'bg' });
panel([...], {
 id: 'card', x: centered.x, y: centered.y, w: cardW, anchor: 'cc',
 padding: 40, gap: 20, fill: 'rgba(10,10,26,0.92)', radius: 20,
 shadow: 'lg', border: '1px solid rgba(255,255,255,0.08)',
});
```

**Key detail:** Use `anchor: 'cc'` with `centerIn()` coords for perfect centering.

---

## C: Grid / Multi-Column

### C1: 2-Column Card Grid

**Intent:** Two feature cards side by side below a title.

**Visual:** Title at top; two equal panels in a content area below.

**Key code:**
```javascript
const contentY = safe.y + 70 + 32;
const contentRect = { x: safe.x, y: contentY, w: safe.w, h: safe.h - 70 - 32 };
const { left, right } = splitRect(contentRect, { ratio: 0.5, gap: 'lg' });
panel([...], { id: 'card1', x: left.x, y: left.y, w: left.w, padding: 'lg', gap: 'sm', fill: C.surface, radius: 16 });
panel([...], { id: 'card2', x: right.x, y: right.y, w: right.w, ... });
```

**Key detail:** Build a `contentRect` below the title, then `splitRect` it — cards get their y from the split, not from `below()`.

---

### C2: 3-Column Card Grid

**Intent:** Three equal feature/option cards in a row.

**Visual:** Title → three evenly spaced panels with icon, title, and description each.

**Key code:**
```javascript
const gap = 32;
const cardW = Math.floor((safe.w - 2 * gap) / 3);
const cardY = safe.y + 70 + 32;
const col1X = safe.x;
const col2X = safe.x + cardW + gap;
const col3X = safe.x + 2 * (cardW + gap);
const innerW = cardW - 64;
cards.map(c => panel([
 el('...icon...', { id: `icon-${c.suffix}`, w: innerW }),
 el('...title...', { id: `title-${c.suffix}`, w: innerW }),
 el('...desc...', { id: `desc-${c.suffix}`, w: innerW }),
], { id: `card-${c.suffix}`, x: c.x, y: cardY, w: cardW, padding: 32, gap: 12, fill: C.surface, radius: 16 }));
```

**Formula:** `cardW = Math.floor((safe.w - (cols-1) * gap) / cols)` — works for any column count. Inner content width = `cardW - 2*padding`.

---

### C3: 4-Column Compact Grid

**Intent:** Compact metric/feature cards in a 4-column row.

**Visual:** Four narrow panels with large number, label, and description.

**Key code:**
```javascript
const gap = 24;
const cardW = Math.floor((safe.w - 3 * gap) / 4);
const cardY = safe.y + 70 + 32;
const innerW = cardW - 48;
hstack(items.map((item, i) => {
 return panel([
 el('...number...', { id: `card${i}-num`, w: innerW }),
 el('...label...', { id: `card${i}-label`, w: innerW }),
 el('...desc...', { id: `card${i}-desc`, w: innerW }),
 ], { id: `card${i}`, w: cardW, padding: 24, gap: 10, fill: C.surface, radius: 12 });
}), { id: 'cards-row', x: safe.x, y: cardY, w: safe.w, gap: gap, align: 'stretch' });
```

**Key detail:** Use `hstack` with `align: 'stretch'` for equal-height cards. Panels inside the hstack omit `x`/`y` — the stack positions them.

---

### C4: Uneven Grid (1 Large + 2 Small)

**Intent:** Feature highlight card alongside two supporting detail cards.

**Visual:** 60% left column with one tall card (image + text); 40% right column with two stacked cards.

**Key code:**
```javascript
const { left, right } = splitRect(safe, { ratio: 0.6, gap: 'lg' });
const smallCardH = (safe.h - 32) / 2;
panel([figure(...), ...text...], { id: 'large', x: left.x, y: safe.y, w: left.w, padding: 'md', gap: 'sm', fill: C.surface, radius: 12 });
panel([...], { id: 'small1', x: right.x, y: safe.y, w: right.w, padding: 'md', gap: 12 });
panel([...], { id: 'small2', x: right.x, y: safe.y + smallCardH + 32, w: right.w, padding: 'md', gap: 12 });
```

**Key detail:** Compute `smallCardH = (safe.h - gap) / 2` for the right column. Use explicit y math for the second small card since the two cards must split available height evenly.

---

### C5: Icon Grid (4x2)

**Intent:** Grid of icon/label pairs for feature or capability overview.

**Visual:** 4 columns x 2 rows of icon + label cells using `group()`.

**Key code:**
```javascript
const cols = 4, rows = 2, iconSize = 80, cellGap = 24;
const cellW = (safe.w - (cols - 1) * cellGap) / cols;
const gridTop = safe.y + 100;
const rowH = iconSize + 60 + cellGap;
items.map((label, i) => {
 const col = i % cols, row = Math.floor(i / cols);
 const cellX = safe.x + col * (cellW + cellGap);
 const cellY = gridTop + row * rowH;
 return group([
 figure({ id: `icon${i}`, src: './icon.png', w: iconSize, h: iconSize, fit: 'cover', containerRadius: 12 }),
 el('...label...', { id: `label${i}`, y: below(`icon${i}`, 12), w: cellW }),
 ], { id: `cell${i}`, x: cellX, y: cellY, w: cellW, h: rowH });
});
```

**Pairs well with:** `group()` to bundle icon + label as a positioned unit.

---

## D: Stacked / Sequential

### D1: Vertical Stack

**Intent:** Simple top-to-bottom content flow — eyebrow, headline, body, divider, footer.

**Visual:** `vstack` auto-positions children vertically with consistent gap.

**Key code:**
```javascript
vstack([
 el('...eyebrow...', { id: 'eyebrow', w: safe.w }),
 el('...headline...', { id: 'headline', w: safe.w }),
 el('...body...', { id: 'body', w: safe.w }),
 el('', { id: 'divider', w: 120, h: 3,
 style: { background: accent, borderRadius: '2px' }, layer: 'overlay' }),
 el('...footer...', { id: 'footer', w: safe.w }),
], { id: 'stack', x: safe.x, y: safe.y + 80, w: safe.w, gap: 'md' });
```

**Key detail:** All children need `w` set. `vstack` handles `y` positioning automatically. Use an empty `el('')` with `h` and `style` for divider lines — avoid inline CSS `width`/`height`.

---

### D2: Stacked Sections with Dividers

**Intent:** Multiple content sections separated by horizontal lines.

**Visual:** Title, then repeating: divider, section title, description, all chained with `below()`.

**Key code:**
```javascript
sections.forEach((sec, i) => {
 const prevId = i === 0 ? 'title' : `desc${i - 1}`;
 elements.push(
 el(`<div style="width:${sectionW}px;height:1px;background:${borderColor}"></div>`, {
 id: `div${i}`, x: safe.x, y: below(prevId, 'lg'), w: sectionW }),
 el('...section title...', { id: `sec${i}`, x: safe.x, y: below(`div${i}`, 'md'), w: sectionW }),
 el('...description...', { id: `desc${i}`, x: safe.x, y: below(`sec${i}`, 10), w: sectionW }),
 );
});
```

**Key detail:** Chain references carefully: each divider references previous description, each title references its divider. Chain with `below()` using spacing tokens.

---

### D3: Vertical Timeline

**Intent:** Chronological milestones with alternating left/right entries.

**Visual:** Central vertical spine with dots at each milestone; entries alternate sides.

**Key code:**
```javascript
const centerX = safe.x + safe.w / 2;
const entryW = safe.w / 2 - 80;
entries.forEach((entry, i) => {
 const dotY = startY + i * 160;
 const isLeft = i % 2 === 0;
 const textX = isLeft ? centerX - entryW - 48 : centerX + 48;
 // dot at centerX, year label and description at textX
 // description: y: below(`year${i}`, 'xs')
 // style: { textAlign: isLeft ? 'right' : 'left' }
});
connect('dot0', 'dotN', { type: 'straight', fromAnchor: 'bc', toAnchor: 'tc', color: accent, thickness: 2 });
```

**Key detail:** Use `connect()` for the vertical spine between first and last dots. Alternate `textAlign` and `x` based on `i % 2`.

---

### D4: Numbered List with Large Numbers

**Intent:** Ordered items with bold number callouts and aligned descriptions.

**Visual:** Large numbers on left, description text vertically centered beside each number.

**Key code:**
```javascript
const numW = 120;
const textW = safe.w - numW - 32;
items.forEach((item, i) => {
 const prevRef = i === 0 ? 'title' : `text${i - 1}`;
 const yPos = below(prevRef, 'lg');
 elements.push(
 el(`<p style="font:700 64px ...">01</p>`, { id: `num${i}`, x: safe.x, y: yPos, w: numW }),
 el('...description...', { id: `text${i}`, x: safe.x + numW + 32, y: centerVWith(`num${i}`), w: textW }),
 );
});
```

**Key detail:** Use `centerVWith()` to vertically align description text with its large number. Store the `below()` result in a variable when the same Y is needed for the number element only.

---

## E: Layered Compositions

### E1: Overlay Panel (Glass Effect)

**Intent:** Atmospheric hero with floating translucent content card.

**Visual:** Full-bleed textured bg image; centered panel with rgba semi-transparent fill for frosted-glass effect.

**Key code:**
```javascript
el('<img src="./texture.png" style="width:100%;height:100%;object-fit:cover;opacity:0.5">', {
 id: 'bg', x: 0, y: 0, w: 1920, h: 1080, layer: 'bg',
});
const panelW = 800;
panel([...title, body...], {
 id: 'panel', x: (1920 - panelW) / 2, y: 280, w: panelW, padding: 40, gap: 'md',
 fill: 'rgba(10, 10, 26, 0.75)', radius: 16, border: '1px solid rgba(255,255,255,0.1)', shadow: 'lg',
});
```

**Key detail:** Use rgba fill (0.7–0.85 alpha) for glass effect. Add subtle border for edge definition.

---

### E2: Cascading Stacked Cards

**Intent:** Illustrate layered concepts with visual depth through overlapping cards.

**Visual:** Three cards with increasing x/y offsets and z-index, creating a staircase effect.

**Key code:**
```javascript
const baseX = safe.x + 300, baseY = safe.y + 100;
const offsetX = 60, offsetY = 50;
cards.map((card, i) => panel([...], {
 id: `card${i}`, x: baseX + i * offsetX, y: baseY + i * offsetY,
 w: 600, padding: 'lg', gap: 'sm', fill: card.shade, radius: 12,
 border: '1px solid ...', shadow: 'md', z: i + 1,
}));
```

**Key detail:** Use `z` prop for stacking order. Use progressively lighter fill shades for depth cue.

---

### E3: Decorative Corner Brackets

**Intent:** Premium framing effect around centered content.

**Visual:** L-shaped accent brackets at four corners on the overlay layer; centered headline and body inside.

**Key code:**
```javascript
function bracket(cornerId, x, y, bottomH, rightV) {
 return group([
 el('', { id: `${cornerId}-h`, w: 60, h: 3,
 y: bottomH ? 57 : 0, style: { background: accentColor },
 }),
 el('', { id: `${cornerId}-v`, w: 3, h: 60,
 x: rightV ? 57 : 0, y: 0, style: { background: accentColor },
 }),
 ], { id: cornerId, x, y, w: 60, h: 60, layer: 'overlay' });
}
bracket('tl', 160, 120, false, false);
bracket('tr', 1920 - 160 - 60, 120, false, true);
bracket('bl', 160, 1080 - 120 - 60, true, false);
bracket('br', 1920 - 160 - 60, 1080 - 120 - 60, true, true);
```

**Pairs well with:** Centered text content with extra inset margins.

---

### E4: Full-Bleed + Floating Islands

**Intent:** Scattered stat/metric cards floating over a hero image.

**Visual:** Dimmed bg image; 3 independently positioned panels showing different KPIs at different positions.

**Key code:**
```javascript
el('<img ... opacity:0.35">', { id: 'bg', x: 0, y: 0, w: 1920, h: 1080, layer: 'bg' });
panel([...title, stat, desc...], {
 id: 'island1', x: 140, y: 160, w: 420, padding: 'lg', gap: 'sm',
 fill: 'rgba(10,10,26,0.8)', radius: 12, shadow: 'lg', border: '...',
});
panel([...], { id: 'island2', x: 1360, y: 120, w: 420, ... });
panel([...], { id: 'island3', x: 700, y: 640, w: 460, ... });
```

**Key detail:** Place islands at intentionally asymmetric positions for visual interest. Use consistent rgba fill.

---

## F: Typography-Forward

### F1: Centered Pull Quote

**Intent:** Testimonial or key statement as the slide's sole focus.

**Visual:** Oversized decorative `"` glyph (low opacity, overlay layer) → centered italic quote → right-aligned attribution.

**Key code:**
```javascript
el('<p style="font:700 180px Inter;color:rgba(0,212,255,0.15);line-height:1">\u201C</p>', {
 id: 'deco', x: safe.x + safe.w / 2 - 100, y: safe.y + 40, w: 200, layer: 'overlay',
});
el('<p style="font:400 italic 36px Inter;...;text-align:center">Quote text...</p>', {
 id: 'quote', x: safe.x + 120, y: safe.y + 220, w: safe.w - 240,
});
el('<p style="font:600 22px ...;text-align:right">— Attribution</p>', {
 id: 'attr', x: safe.x + 120, y: below('quote', 'xl'), w: safe.w - 240,
});
```

**Pairs well with:** Decorative accent glyphs at very low opacity on the overlay layer.

---

### F2: Asymmetric Pull Quote

**Intent:** Editorial-style quote with separate attribution block.

**Visual:** 65/35 split — italic quote on left, vertical accent divider, name/role/company stack on right (vertically centered).

**Key code:**
```javascript
const { left, right } = splitRect(safe, { ratio: 0.65, gap: 40 });
el('...italic quote...', { id: 'quote', x: left.x, y: left.y + 80, w: left.w });
el('', {
 id: 'divider', x: right.x - 20, y: centerVWith('quote'), w: 4, h: 180,
 style: { background: '#00d4ff', borderRadius: '2px' },
});
vstack([...name, role, company...], {
 id: 'attr', x: right.x, y: centerVWith('quote'), w: right.w, gap: 'xs',
});
```

**Key detail:** Use `centerVWith()` on both the divider and attribution stack to align with quote.

---

### F3: Big Stat

**Intent:** Single massive statistic as the focal point for impact.

**Visual:** Huge accent-colored number (160px) centered, with label and context below.

**Key code:**
```javascript
el('<p style="font:700 160px Inter;color:#00d4ff;text-align:center;letter-spacing:-4px;line-height:1">4.2B</p>', {
 id: 'number', x: safe.x, y: safe.y + 160, w: safe.w,
});
el('<p style="font:700 36px ...;text-align:center;text-transform:uppercase">Events Processed Daily</p>', {
 id: 'label', x: safe.x, y: below('number', 'md'), w: safe.w,
});
el('<p style="font:400 24px ...;text-align:center">Context sentence about the metric</p>', {
 id: 'context', x: safe.x + 200, y: below('label', 'sm'), w: safe.w - 400,
});
```

**Variations:** Font sizes 120–200px for the number. Use `letter-spacing: -4px` for tight numerals. Add a context line for extra depth.

---

### F4: Multi-Stat Row (4 Statistics)

**Intent:** Dashboard-style row of 4 KPI columns.

**Visual:** Centered title → four evenly spaced columns each with value, unit, and label.

**Key code:**
```javascript
const cols = 4, colGap = 32;
const colW = (safe.w - (cols - 1) * colGap) / cols;
stats.map((stat, i) => {
 const colX = safe.x + i * (colW + colGap);
 return group([
 el(`<p style="font:700 72px ...;text-align:center">${stat.value}</p>`, { id: `val${i}`, w: colW }),
 el('...unit...', { id: `unit${i}`, y: below(`val${i}`, 'xs'), w: colW }),
 el('...label...', { id: `label${i}`, y: below(`unit${i}`, 'xs'), w: colW }),
 ], { id: `col${i}`, x: colX, y: statY, w: colW, bounds: 'hug' });
});
```

**Pairs well with:** `group()` with `bounds: 'hug'` for bundling stat columns with internal `below()` chains.

---

### F5: Title Hierarchy

**Intent:** Demonstrate/use typographic scale — eyebrow, title, subtitle, body.

**Visual:** `vstack` with progressively larger/smaller text establishing visual hierarchy.

**Key code:**
```javascript
vstack([
 el('...eyebrow (14px, uppercase, letter-spacing:4px)...', { id: 'eyebrow', w: safe.w }),
 el('...title (64px, bold, letter-spacing:-2px)...', { id: 'title', w: safe.w }),
 el('...subtitle (28px, light weight)...', { id: 'subtitle', w: safe.w }),
 el('...body (24px, regular, muted)...', { id: 'body', w: safe.w }),
], { id: 'stack', x: safe.x, y: safe.y + 120, w: safe.w, gap: 'md' });
```

**Key detail:** Establish hierarchy through font size, weight, color, and letter-spacing variation.

---

## G: Data / Process

### G1: Horizontal Bar Chart

**Intent:** Visualize proportional data as horizontal bars with labels and values.

**Visual:** Left-aligned labels → background bar → proportional colored bar → value text.

**Key code:**
```javascript
const chartX = safe.x + 200, barMaxW = safe.w - 400, barH = 44, barGap = 24;
bars.flatMap((bar, i) => {
 const rowY = startY + i * (barH + barGap);
 return [
 el('...label...', { id: `lbl${i}`, x: safe.x, y: rowY, w: 170 }),
 el('', { id: `barbg${i}`, x: chartX, y: rowY, w: barMaxW, h: barH,
 style: { background: surface, borderRadius: '6px' } }),
 el('', { id: `bar${i}`, x: chartX, y: rowY, w: Math.round(barMaxW * bar.pct), h: barH,
 style: { background: bar.color, borderRadius: '6px' } }),
 el('...value...', { id: `val${i}`, x: rightOf(`bar${i}`, 'sm'), y: rowY, w: 80 }),
 ];
});
```

**Key detail:** Use `rightOf()` to position the value label after the bar. Set `h` via props, not CSS.

---

### G2: Process Flow with Connectors

**Intent:** Horizontal step-by-step workflow with arrows between boxes.

**Visual:** 4 evenly spaced step panels connected by curved arrows.

**Key code:**
```javascript
const boxW = 280;
const totalGap = safe.w - steps.length * boxW;
const gap = totalGap / (steps.length - 1);
steps.map((step, i) => {
 const boxX = safe.x + i * (boxW + gap);
 return panel([...], { id: `box${i}`, x: boxX, y: boxY, w: boxW,
 padding: 24, gap: 12, fill: C.surface, radius: 12, border: `1px solid ${C.border}` });
});
// Connect adjacent boxes
steps.slice(0, -1).map((_, i) =>
 connect(`box${i}`, `box${i+1}`, { type: 'curved', fromAnchor: 'cr', toAnchor: 'cl', color: accent, thickness: 2, arrow: 'end' })
);
```

**Key detail:** Omit `h` on panel — let content auto-size. Use `connect()` with `fromAnchor: 'cr'` and `toAnchor: 'cl'` for horizontal flow. `arrow: 'end'` adds arrowheads.

---

### G3: Comparison Table

**Intent:** Side-by-side feature comparison (e.g., Free vs Pro tiers).

**Visual:** Two columns with header row and alternating-background data rows.

**Key code:**
```javascript
const { left: colL, right: colR } = splitRect(
 { x: safe.x, y: safe.y + 120, w: safe.w, h: safe.h - 120 }, { ratio: 0.5, gap: 4 }
);
const rowH = 56;
// Header
el('Free Tier', { id: 'hdrL', x: colL.x, y: colL.y, w: colL.w, style: { background: surfaceAlt } });
el('Pro Tier', { id: 'hdrR', x: colR.x, y: colL.y, w: colR.w, style: { background: '#0a3040' } });
// Data rows
rows.flatMap((row, i) => {
 const rowY = colL.y + rowH + i * rowH;
 const bgColor = i % 2 === 0 ? surface : 'transparent';
 return [
 el('...free value...', { id: `cellL${i}`, x: colL.x, y: rowY, w: colL.w, style: { background: bgColor } }),
 el('...pro value...', { id: `cellR${i}`, x: colR.x, y: rowY, w: colR.w, style: { background: bgColor } }),
 ];
});
```

**Key detail:** Use tiny `gap: 4` in splitRect for visual column separation. Alternate row backgrounds for readability.

---

### G4: KPI Dashboard (2x2 Grid)

**Intent:** Four metric cards in a 2x2 grid with values, labels, and trends.

**Visual:** Title → 2x2 grid of panels, each with emoji indicator, large value, label, and trend arrow.

**Key code:**
```javascript
const cols = 2, rows = 2, gap = 24;
const cardW = (safe.w - gap) / cols;
const cardH = (safe.h - 140 - gap) / rows;
metrics.map((m, i) => {
 const col = i % cols, row = Math.floor(i / cols);
 const cardX = safe.x + col * (cardW + gap);
 const cardY = gridY + row * (cardH + gap);
 return panel([
 ...icon,
 el('...value...', { id: `val${i}`, y: below(`icon${i}`, 'sm'), w: cardW - 64 }),
 el('...label...', { id: `lbl${i}`, y: below(`val${i}`, 'xs'), w: cardW - 64 }),
 el('...trend...', { id: `trend${i}`, y: below(`lbl${i}`, 12), w: cardW - 64 }),
 ], {
 id: `card${i}`, x: cardX, y: cardY, w: cardW, h: cardH,
 padding: 'lg', fill: surface, radius: 16, border: `1px solid ${C.border}`,
 });
});
```

**Key detail:** Use `h` on panel for uniform card height. Chain `below()` inside for internal layout.

---

## H: Image Showcase

### H1: 3-Image Gallery Row

**Intent:** Display three images side by side with captions.

**Visual:** Title → three equal-width `figure()`s with centered caption text below each.

**Key code:**
```javascript
const cols = 3, colGap = 24;
const colW = (safe.w - (cols - 1) * colGap) / cols;
images.flatMap((img, i) => {
 const colX = safe.x + i * (colW + colGap);
 return [
 figure({ id: `img${i}`, src: img.src, x: colX, y: imgY, w: colW, h: 480, fit: 'cover', containerRadius: 12 }),
 el('...caption...', { id: `cap${i}`, x: colX, y: below(`img${i}`, 'sm'), w: colW }),
 ];
});
```

**Pairs well with:** `below()` for caption placement relative to image.

---

### H2: Hero Image + Text at Bottom

**Intent:** Visual-first slide with text bar below the image.

**Visual:** Full-width `figure()` (0-780px), gradient fade bar, title and description below.

**Key code:**
```javascript
figure({ id: 'hero', src: './hero.png', x: 0, y: 0, w: 1920, h: 780, fit: 'cover', layer: 'bg' });
el('', { id: 'textbar', x: 0, y: 780, w: 1920, h: 300,
 style: { background: `linear-gradient(180deg, ${bg}00, ${bg} 30%)` }, layer: 'bg' });
el('...title...', { id: 'title', x: safe.x, y: 820, w: safe.w });
el('...desc...', { id: 'desc', x: safe.x, y: below('title', 'sm'), w: safe.w * 0.65 });
```

**Key detail:** Gradient bar creates smooth transition from image to text area. Use `${bg}00` for transparent start. Both hero and textbar need `layer: 'bg'`.

---

### H3: Image + Detailed Caption

**Intent:** Large image with multi-line explanatory caption below.

**Visual:** Full-width `figure()` taking 60% of safe height; `vstack` caption with title + body below.

**Key code:**
```javascript
figure({ id: 'photo', src: './image.png', x: safe.x, y: safe.y, w: safe.w, h: safe.h * 0.6, fit: 'cover', containerRadius: 16 });
vstack([
 el('...caption title...', { id: 'cap-title', w: safe.w * 0.8 }),
 el('...caption body...', { id: 'cap-body', w: safe.w * 0.8 }),
], { id: 'cap-stack', x: safe.x, y: below('photo', 'md'), w: safe.w, gap: 12 });
```

**Pairs well with:** `vstack` for multi-element captions.

---

### H4: Before / After

**Intent:** Side-by-side comparison of two states with labels.

**Visual:** 50/50 split with "Before" / "After" labels, full-height images, and a thin divider line.

**Key code:**
```javascript
const { left: colL, right: colR } = splitRect(safe, { ratio: 0.5, gap: 'md' });
el('Before', { id: 'lbl-before', x: colL.x, y: colL.y, w: colL.w }); // red accent
figure({ id: 'img-before', src: './before.png', x: colL.x, y: imgY, w: colL.w, h: imgH, fit: 'cover', containerRadius: 12 });
el('', { id: 'divider', x: safe.x + safe.w / 2 - 1, y: safe.y, w: 2, h: safe.h, style: { background: borderColor } });
el('After', { id: 'lbl-after', x: colR.x, y: colR.y, w: colR.w }); // green accent
figure({ id: 'img-after', src: './after.png', x: colR.x, y: imgY, w: colR.w, h: imgH, fit: 'cover', containerRadius: 12 });
```

**Key detail:** Place the divider element explicitly at the midpoint of the safe zone.

---

## I: Whitespace / Creative

### I1: Centered Island

**Intent:** Minimal content island in generous whitespace for emphasis.

**Visual:** Small panel (600px wide) perfectly centered on the full canvas; contains decorative line, quote, attribution.

**Key code:**
```javascript
const islandW = 600;
const pos = centerIn({ x: 0, y: 0, w: 1920, h: 1080 });
panel([
 el('', { id: 'deco-line', w: 48, h: 3, style: { background: accent, borderRadius: '2px' } }),
 el('...quote...', { id: 'quote', y: below('deco-line', 'md'), w: islandW - 80 }),
 el('...attribution...', { id: 'attr', y: below('quote', 20), w: islandW - 80 }),
], {
 id: 'panel', x: pos.x, y: pos.y, w: islandW,
 padding: 40, fill: surface, radius: 20,
 border: `1px solid ${border}`, shadow: 'xl',
});
```

**Key detail:** Center against full canvas `{x:0, y:0, w:1920, h:1080}` not safe zone, for true visual center. Omit `h` on the panel — let auto-height size it to content.

---

### I2: Radial Hub-Spoke

**Intent:** Ecosystem or platform overview with central hub and satellite nodes.

**Visual:** Central circular panel with radiating spoke panels arranged via trigonometry; dashed connectors.

**Key code:**
```javascript
const cx = 960, cy = 480, hubSize = 110, radius = 280, spokeW = 180, spokeH = 70;
const spokePositions = spokes.map((_, i) => {
 const angle = (i * 2 * Math.PI) / spokes.length - Math.PI / 2;
 return { x: cx + radius * Math.cos(angle) - spokeW / 2, y: cy + radius * Math.sin(angle) - spokeH / 2 };
});
// Hub: circular panel
panel([...], { id: 'hub', x: cx - hubSize / 2, y: cy - hubSize / 2, w: hubSize, h: hubSize,
 padding: 16, fill: accent + '22', radius: hubSize / 2, border: `2px solid ${accent}` });
// Spokes
spokes.map((s, i) => panel([...], { id: `spoke${i}`, x: spokePositions[i].x, y: spokePositions[i].y,
 w: spokeW, h: spokeH, padding: 16, fill: surface, radius: 12, border: `1px solid ${s.color}44` }));
// Connectors
spokes.map((s, i) => connect('hub', `spoke${i}`, { type: 'straight', color: s.color + '66', thickness: 2, arrow: 'end', dash: '8 6' }));
```

**Key detail:** Offset angle by `-Math.PI/2` so the first spoke is at the top. Use `hubSize/2` for `radius` to make circular panels. Connector `dash` is space-separated string, not array.

---

### I3: Magazine Editorial Spread

**Intent:** Creative, asymmetric editorial layout for storytelling.

**Visual:** 30% tall portrait image on left; pull quote + body text on right; small detail image in bottom-right corner.

**Key code:**
```javascript
const imgW = Math.round(safe.w * 0.3);
const rightX = safe.x + imgW + 48;
const rightW = safe.w - imgW - 48;
figure({ id: 'portrait', src: './portrait.png', x: safe.x, y: safe.y, w: imgW, h: safe.h, fit: 'cover', containerRadius: 16 });
el('...pull quote (italic)...', { id: 'pullquote', x: rightX, y: safe.y + 40, w: rightW });
el('...body text...', { id: 'body', x: rightX, y: below('pullquote', 40), w: rightW });
figure({ id: 'detail', src: './detail.png', x: rightX + rightW - 200, y: safe.y + safe.h - 200, w: 180, h: 180, fit: 'cover', containerRadius: 12 });
```

**Pairs well with:** Manual asymmetric positioning (no splitRect) for editorial feel.

---

## J: Utility

### J1: Section Divider

**Intent:** Visual break between major sections with bold numbering.

**Visual:** Huge semi-transparent section number on bg layer; centered title, accent line, and subtitle.

**Key code:**
```javascript
el('<p style="font:900 360px Inter;color:rgba(255,255,255,0.04);text-align:center;line-height:1">03</p>', {
 id: 'bignumber', x: 0, y: 280, w: 1920, layer: 'bg',
});
el('...section title...', { id: 'title', x: safe.x, y: centerIn(safe).y, w: safe.w });
el('', { id: 'accent-line', x: 960 - 60, y: below('title', 28), w: 120, h: 4,
 style: { background: accent, borderRadius: '2px' }, layer: 'overlay' });
el('...subtitle...', { id: 'sub', x: safe.x, y: below('accent-line', 28), w: safe.w });
```

**Key detail:** Use extremely low opacity (0.03-0.05) for the background number. Use `centerIn(safe).y` for the title so it's vertically centered. Accent line needs `layer: 'overlay'` to render above bg elements.

---

### J2: Agenda / Table of Contents

**Intent:** Structured agenda with numbered items, dot leaders, and times.

**Visual:** Rows of: number, title, dot leader, time -- all on the same baseline.

**Key code:**
```javascript
const numW = 60, titleW = 700;
const dotsW = safe.w - numW - titleW - 140;
items.flatMap((item, i) => {
 const rowY = startY + i * (rowH + 8);
 return [
 el(`...${item.num}...`, { id: `num${i}`, x: safe.x, y: rowY, w: numW }),
 el(`...${item.title}...`, { id: `item${i}`, x: safe.x + numW + 16, y: rowY, w: titleW }),
 el(`<p style="...;overflow:hidden;white-space:nowrap">${'· '.repeat(80)}</p>`, {
 id: `dots${i}`, x: safe.x + numW + titleW + 32, y: rowY, w: dotsW }),
 el(`...${item.time}...`, { id: `time${i}`, x: safe.x + safe.w - 120, y: rowY, w: 120 }),
 ];
});
```

**Key detail:** Dot leaders use `'· '.repeat(80)` with `overflow:hidden;white-space:nowrap` to auto-truncate. Use matching `line-height` equal to `rowH` on all four elements for baseline alignment.

---

### J3: Thank You / Closing

**Intent:** Elegant closing slide with background imagery and contact info.

**Visual:** Background figure + dark overlay on `bg` layer; large "Thank You" text, accent line, contact info.

**Key code:**
```javascript
figure({ id: 'bg', src: './hero.png', x: 0, y: 0, w: 1920, h: 1080, fit: 'cover', layer: 'bg' });
el('', { id: 'overlay', x: 0, y: 0, w: 1920, h: 1080,
 style: { background: 'rgba(10,10,26,0.75)' }, layer: 'bg' });
el('Thank You', { id: 'thanks', x: safe.x, y: centerIn(safe).y, w: safe.w });
el('', { id: 'line', x: 960 - 40, y: below('thanks', 'md'), w: 80, h: 3,
 style: { background: accent, borderRadius: '2px' }, layer: 'overlay' });
el('...contact info...', { id: 'contact', x: safe.x, y: below('line', 'md'), w: safe.w });
```

**Key detail:** Stack two elements on `layer: 'bg'` -- first the figure, then a semi-transparent overlay div. Use `centerIn(safe).y` for vertical centering. Accent line needs `layer: 'overlay'` to render above the bg overlay.

---

### J4: Team Profile Cards

**Intent:** Row of team member cards with avatar, name, role, and bio.

**Visual:** 3 equal-width panels, each with circular avatar figure, name, role, divider, bio.

**Key code:**
```javascript
const cols = 3, colGap = 32;
const colW = (safe.w - (cols - 1) * colGap) / cols;
const avatarSize = 80;
members.map((member, i) => {
 const cardX = safe.x + i * (colW + colGap);
 return panel([
 figure({ id: `avatar${i}`, src: './avatar.png',
 x: (colW - 64) / 2 - avatarSize / 2, y: 0, w: avatarSize, h: avatarSize,
 fit: 'cover', containerRadius: avatarSize / 2 }),
 el('...name...', { id: `name${i}`, y: below(`avatar${i}`, 20), w: colW - 64 }),
 el('...role...', { id: `role${i}`, y: below(`name${i}`, 'xs'), w: colW - 64 }),
 el('', { id: `div${i}`, y: below(`role${i}`, 'sm'), w: 40, h: 2, style: { background: border } }),
 el('...bio...', { id: `bio${i}`, y: below(`div${i}`, 'sm'), w: colW - 64 }),
 ], { id: `card${i}`, x: cardX, y: cardY, w: colW, h: cardH,
 padding: 32, fill: surface, radius: 16, border: `1px solid ${border}` });
});
```

**Key detail:** Use `containerRadius: avatarSize / 2` for circular avatars. Center the figure inside the panel with calculated `x`. The `64` in `colW - 64` accounts for panel padding (32px each side).

---

## Anti-Patterns

### ❌ Center-anchored figures

**Problem:** `figure()` does not support the `anchor` prop. Setting `anchor: 'cc'` on a figure will be silently ignored, causing the image to render at the wrong position.

**Fix:** Use explicit `x`, `y` math to center figures: `x: cx - w/2, y: cy - h/2`.

---

### ❌ Deeply nested panels

**Problem:** Panels inside panels accumulate padding and measurement drift. The linter may report elements slightly outside their parent bounds.

**Fix:** Keep panel nesting to one level. Use `group()` for logical grouping without extra padding/fill, or flatten into a single panel with more children.

---

### ❌ `hstack` inside `hstack`

**Problem:** Nested `hstack` creates unresolvable overlap conflicts because the inner hstack's width measurement depends on the outer's layout pass, which hasn't completed.

**Fix:** Prefer `splitRect()` for horizontal layouts. It calculates positions statically from a known rect, avoiding measurement cycles.

---

### ❌ `below()` chain off-by-one spacing

**Problem:** Long chains of `below(prev, N)` accumulate small spacing errors. If one element renders taller than expected (e.g., text wraps), all subsequent elements shift down.

**Fix:** Use consistent gap values. For critical layouts, consider `vstack` which handles spacing uniformly. Test with longest expected text content. Keep chains under 6 elements.

---

### ❌ `rotate` exceeding canvas bounds

**Problem:** Rotated elements may visually extend beyond the 1920×1080 canvas, triggering linter warnings about out-of-bounds content.

**Fix:** Use `rotatedAABB()` to compute the axis-aligned bounding box of the rotated element and verify it stays within bounds before rendering.

---

### ❌ Using `h: left.h` from `splitRect()` on content containers

**Problem:** When using `splitRect()`, the returned `left.h` and `right.h` represent the full available column height (typically 900px from `safeRect()`). Using this as `h` on panels, vstacks, or other content containers forces them to fill the entire column — even when the content only needs a fraction of that space. This pushes content apart and creates large empty gaps.

**Fix:** Omit `h` on content containers and let them auto-size to their children. Use `h: left.h` only on elements that genuinely need to fill the column: images with `fit: 'cover'`, or background rects on `layer: 'bg'`.

```javascript
const { left, right } = splitRect(safe, { ratio: 0.5, gap: 'xl' });
// ❌ Panel stretches to 900px — content floats in empty space
panel([...text children...], { x: left.x, y: left.y, w: left.w, h: left.h, fill: C.surface });
// ✅ Panel auto-sizes to content height
panel([...text children...], { x: left.x, y: left.y, w: left.w, fill: C.surface });
// ✅ Image fills column — h: right.h is correct here
figure({ id: 'right-img', src: './photo.png', x: right.x, y: right.y, w: right.w, h: right.h, fit: 'cover' });
// ✅ Background rect fills column — h: left.h is correct with layer: 'bg'
panel([], { id: 'left-bg', x: left.x, y: left.y, w: left.w, h: left.h, fill: C.surface, layer: 'bg' });
```

---

### ❌ Using `style.height` instead of `h` prop

**Problem:** Setting height via `style: { height: '300px' }` is a blocked CSS property in SlideKit. The linter will reject it.

**Fix:** Always use the `h` prop directly: `{ id: 'x', x: 0, y: 0, w: 400, h: 300 }`.

---

### ❌ `<img>` tag in `el()` causing false text-overflow lint

**Problem:** Using `<img>` inside `el()` triggers the text-overflow linter because the linter measures the img element's intrinsic dimensions as "text content" that overflows the element's declared `w`.

**Fix:** Use a `<div>` with CSS background instead:
```javascript
// ❌ Bad — triggers text-overflow lint
el('<img src="./photo.png" style="width:100%;height:100%;object-fit:cover">', { ... });
// ✅ Good — no lint issues
el('<div style="width:100%;height:100%;background:url(\'./photo.png\') center/cover">', { ... });
```
Note: When you *need* `<img>` (e.g., for the bg layer), ensure `h` is explicitly set to suppress the lint.

**Linter improvement opportunity:** The text-overflow rule should skip elements whose only child is an `<img>` tag (no actual text to overflow). The check could be: if the el's innerHTML matches `^<img\b` and contains no other text nodes, suppress the text-overflow finding.

---

### ❌ Accent text on accent-tinted backgrounds

**Problem:** Using accent-colored text (e.g., `color: #00d4ff`) on an accent-tinted background panel (e.g., `fill: '#00d4ff22'`) creates low contrast that fails WCAG AA readability checks. Increasing the background opacity makes it **worse** (the background gets lighter, reducing contrast further).

**Why it's non-obvious:** The accent color looks vibrant on a pure dark background (`#0a0a1a`), so it feels like it should work on a "slightly tinted" version. But the math works against you — the tint lightens the background toward the text color, collapsing the contrast ratio.

**Fix:** On dark accent-tinted backgrounds, always use white text (`#ffffff`). For the background itself, use a hand-picked dark accent-derived color (e.g., `#0a3040` for cyan accent) rather than transparency-based tinting. Reserve accent-colored text for untinted dark backgrounds only. See the detailed example in the "Accent-on-Accent Contrast Trap" section above.

---

### ❌ Group children all rendering at (0,0)

**Problem:** When creating decorative elements like corner brackets using `group()`, all children default to position (0,0) within the group. If you don't explicitly set `x`/`y` on each child, they all stack in the top-left corner — even if the group itself is positioned correctly.

**Example:** Four "corner brackets" that should form ┌ ┐ └ ┘ all render as ┌ because both bars start at (0,0).

**Fix:** Explicitly position children within the group using relative `x`/`y`:
```javascript
// ┘ bottom-right bracket
group([
 el('...horizontal bar...', { id: 'h', w: 60, y: 57 }), // bar at bottom
 el('...vertical bar...', { id: 'v', w: 3, x: 57, y: 0 }), // bar at right
], { id: 'br', x: cornerX, y: cornerY, w: 60, h: 60 });
```

---

### ❌ Odd-count radial layouts creating visual imbalance

**Problem:** Radial hub-spoke layouts with an odd number of spokes (e.g., 5) create asymmetric distributions where the bottom of the slide feels empty. With 5 nodes starting at -π/2, you get nodes at top, upper-right, lower-right, lower-left, upper-left — leaving the bottom center as a dead zone.

**Fix:** Use an even number of spokes (4, 6, 8) for visual symmetry. If you must use an odd number, shift the center point upward (`cy = 460` instead of `540`) to compensate for the visual weight imbalance, and add a subtitle below the diagram to fill the empty space.

---

## Bonus: Novel Patterns

These are advanced styling techniques that go beyond the core 45 patterns above.

---

### K1: Glassmorphic Card (Frosted Glass)

**Intent:** Semi-transparent card with blur effect, letting background elements show through.

**Visual:** A frosted-glass panel with subtle border and blurred backdrop, floating over gradient or image backgrounds.

**Key code:**
```javascript
panel([], {
 id: 'glass-card', x, y, w: 500, h: 300,
 fill: 'rgba(255,255,255,0.12)',
 radius: 16,
 style: {
 border: '1px solid rgba(255,255,255,0.25)',
 backdropFilter: 'blur(20px)',
 WebkitBackdropFilter: 'blur(20px)',
 }
});
```

**Variations:** Adjust opacity (0.08–0.18) and blur (10px–30px) for subtlety. Works best over colorful or gradient backgrounds.

---

### K2: Gradient Orb Background System

**Intent:** Soft, luminous background ambiance without using images.

**Visual:** Multiple blurred radial gradients positioned at various spots, creating a glowing, atmospheric depth effect.

**Key code:**
```javascript
el('<div style="width:100%;height:100%;border-radius:50%;background:radial-gradient(circle,#7c3aed,#4f46e5,transparent);filter:blur(60px);opacity:0.4">', {
 id: 'orb-1', x: 200, y: 100, w: 600, h: 600, layer: 'bg'
});
```

**Variations:** Use 2–4 orbs with different colors and positions. Lower opacity (0.2–0.4) keeps them atmospheric. Great as a replacement for solid-color backgrounds.

---

### K3: Full-Height Column Segmentation

**Intent:** Divide the slide into visually distinct zones, each with its own color and content.

**Visual:** 3+ full-height vertical columns, each with its own background color, creating a "3 mini-slides in one" effect.

**Key code:**
```javascript
const cols = 3;
const colW = Math.floor(safe.w / cols);
for (let i = 0; i < cols; i++) {
 el(`<div style="width:100%;height:100%;background:${colors[i]}">`, {
 id: `col-bg-${i}`, x: safe.x + i * colW, y: 0, w: colW, h: 1080, layer: 'bg'
 });
 // Content for each column at safe.x + i * colW, safe.y
}
```

**Variations:** Works well for roadmaps (past/present/future), category comparisons, or team sections. Add subtle gradient transitions between columns for a smoother look.

---

### K4: CSS Texture Overlay (Blueprint/Grid Pattern)

**Intent:** Add visual texture or thematic atmosphere without images.

**Visual:** Repeating CSS pattern (stripes, dots, grid) overlaid on the background to evoke technical drawings, graph paper, or fabric textures.

**Key code:**
```javascript
el('<div style="width:100%;height:100%;background:repeating-linear-gradient(90deg,transparent,transparent 119px,rgba(255,255,255,0.3) 119px,rgba(255,255,255,0.3) 120px)">', {
 id: 'grid-overlay', x: 0, y: 0, w: 1920, h: 1080, layer: 'bg'
});
```

**Variations:** Combine horizontal + vertical lines for a full grid. Use `repeating-radial-gradient` for dot patterns. Layer multiple patterns at different opacities for complexity.

---

### K5: Pill/Capsule Component Layout

**Intent:** Softer, more organic alternative to rectangular cards and panels.

**Visual:** Fully-rounded pill shapes used as containers, creating a flowing, modern aesthetic distinct from sharp-cornered cards.

**Key code:**
```javascript
panel([], {
 id: 'pill-item', x, y, w: 600, h: 60,
 fill: 'rgba(255,255,255,0.1)',
 radius: 9999, // Full pill shape
});
```

**Variations:** Combine small circle icons (radius: 9999, equal w/h) with pill-shaped text containers. Alternate left/right positioning for visual rhythm.

---

### K6: Decorative Accent Dots

**Intent:** Break up large whitespace with minimal geometric elements.

**Visual:** Small colored dots or circles positioned asymmetrically to add visual weight and balance without content.

**Key code:**
```javascript
el('<div style="width:100%;height:100%;border-radius:50%;background:#accent">', {
 id: 'dot-1', x: 1600, y: 200, w: 12, h: 12
});
el('<div style="width:100%;height:100%;border-radius:50%;background:#accent;opacity:0.5">', {
 id: 'dot-2', x: 1620, y: 230, w: 8, h: 8
});
```

**Variations:** Use 2–4 dots in a cluster. Vary sizes (8–16px) and opacities. Position near content edges to create visual anchoring.

---

### K7: Crop-to-Shape via CSS clip-path

**Intent:** Crop images to circles, rounded rectangles, diamonds, or arbitrary polygons — achieving PowerPoint-like "crop to shape" effects using pure CSS.

**Visual:** An image clipped to a non-rectangular shape, creating visual interest without editing the source file.

**Key detail:** Always pair `clip-path` with `object-fit: cover` and explicit `w`/`h` on the element. Without `object-fit: cover`, the image may letterbox inside the clipped shape. Without explicit dimensions, the clip region is unpredictable.

**Circular headshot:**
```javascript
el('<img src="./headshot.jpg" style="width:100%;height:100%;object-fit:cover;clip-path:circle(50%)">', {
  id: 'avatar', x: 100, y: 200, w: 200, h: 200,
});
```

**Rounded rectangle** (alternative to `containerRadius` on `figure()`):
```javascript
el('<img src="./card-bg.jpg" style="width:100%;height:100%;object-fit:cover;clip-path:inset(0 round 24px)">', {
  id: 'rounded-img', x: 400, y: 200, w: 600, h: 400,
});
```
> For simple rounded corners, `borderRadius` on the container or `containerRadius` on `figure()` is simpler. Use `clip-path: inset(0 round ...)` when you need different radii per corner (e.g., `inset(0 round 24px 24px 0 0)` for top-only rounding).

**Diamond:**
```javascript
el('<img src="./photo.jpg" style="width:100%;height:100%;object-fit:cover;clip-path:polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)">', {
  id: 'diamond', x: 800, y: 200, w: 300, h: 300,
});
```

**Custom polygon** (chevron/arrow shape):
```javascript
el('<img src="./banner.jpg" style="width:100%;height:100%;object-fit:cover;clip-path:polygon(0% 0%, 85% 0%, 100% 50%, 85% 100%, 0% 100%)">', {
  id: 'chevron', x: 100, y: 500, w: 400, h: 200,
});
```

**Variations:** Any shape is achievable via `polygon()`. Use an online clip-path generator to design complex shapes visually, then paste the value. Combine with `shadow` on a wrapper element for drop shadows on clipped shapes (shadows applied to the clipped element itself will be clipped away).

**Pairs well with:** J4 team cards (circular avatars), A5 narrow sidebar (portrait crops), I3 magazine editorial (creative framing).

---

### K8: Flip Horizontal / Vertical

**Intent:** Mirror elements horizontally or vertically using SlideKit's `flipH` and `flipV` props — useful for creating symmetrical designs, reversing directional icons, or decorative mirrored pairs.

**Visual:** An element rendered as its mirror image along the horizontal or vertical axis.

**Mirror an image horizontally:**
```javascript
el('<img src="./arrow-right.svg" style="width:100%;height:100%">', {
  id: 'arrow-left', x: 200, y: 300, w: 100, h: 50, flipH: true,
});
```

**Mirror vertically (reflection effect):**
```javascript
// Original element
el('<img src="./logo.png" style="width:100%;height:100%;object-fit:contain">', {
  id: 'logo', x: 860, y: 300, w: 200, h: 100,
});
// Reflected copy below with reduced opacity
el('<img src="./logo.png" style="width:100%;height:100%;object-fit:contain">', {
  id: 'logo-reflection', x: 860, y: 400, w: 200, h: 100, flipV: true, opacity: 0.2,
});
```

**Decorative mirrored pairs** (symmetrical design):
```javascript
// Original arrow pointing right
el('<img src="./arrow.svg" style="width:100%;height:100%">', {
  id: 'arrow-right', x: 1060, y: 500, w: 100, h: 50,
});
// Mirrored copy pointing left
el('<img src="./arrow.svg" style="width:100%;height:100%">', {
  id: 'arrow-left', x: 760, y: 500, w: 100, h: 50, flipH: true,
});
```

**Combine with rotation:**
```javascript
el('<img src="./decorative.svg" style="width:100%;height:100%">', {
  id: 'deco', x: 400, y: 300, w: 120, h: 120, rotate: 45, flipH: true,
});
```

**Key detail:** `flipH` applies `scaleX(-1)` and `flipV` applies `scaleY(-1)`. Both can be combined with `rotate` — transforms are applied in order: rotation first, then flip. These are SlideKit props, not CSS — do not use `style: { transform: 'scaleX(-1)' }` (transform is a blocked CSS property).

**Pairs well with:** Symmetrical layouts (E3 corner brackets, I2 radial hub-spoke), decorative accent elements (K6 dots), process flow diagrams (G2) where arrows need to point both directions.

---

### K9: Vertically Centering an Icon Next to a Pill/Card

**Intent:** Align an icon circle to the vertical center of an adjacent pill or card element whose height is determined by content flow.

**Problem:** When placing an icon circle next to a pill bar, manual math like `y: fy + (pillH - circSize) / 2` assumes the pill renders at exactly `pillH` pixels. But if the pill's height is determined by CSS content flow (text wrapping), the actual height may differ, causing the icon to be vertically misaligned.

**Fix:** Use `centerVWith(refId)` to anchor the icon's vertical center to the pill's actual rendered vertical center:

```javascript
// ❌ Manual math — breaks if pill text wraps
el(iconHtml, {
  id: `icon${i}`, x: col.x, y: fy + (pillH - circSize) / 2, w: circSize, h: circSize,
});

// ✅ API-based — always correct regardless of pill height
el(iconHtml, {
  id: `icon${i}`, x: col.x, y: centerVWith(`pill${i}`), w: circSize, h: circSize,
});
```

**General rule:** If you're computing placement relative to another element using manual arithmetic, first check if there's a positioning API (`centerVWith`, `centerHWith`, `alignTopWith`, `alignBottomWith`, `below`, `rightOf`, etc.) that handles it declaratively. The API accounts for actual rendered dimensions; manual math assumes fixed sizes.

**Pairs well with:** K5 pill/capsule layouts, D4 numbered lists (same vertical-centering principle), any layout with mixed-height siblings.

---

## API Wish List / Missing APIs

If you encounter a positioning pattern where no API helper exists, document it here so it can be considered for future SlideKit versions.

<!-- Add entries below as they are discovered -->

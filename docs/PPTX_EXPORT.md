# SlideKit → PowerPoint Export

Complete reference for exporting SlideKit presentations to PowerPoint via COM
automation. Intended as a skill reference for AI agents driving the export.

---

## Architecture

SlideKit's layout pipeline runs in the browser. Rather than reimplement it for
PPTX, we let the browser do the hard work and harvest the results:

```
Browser (Playwright)          SlideKit Scene Graph           PowerPoint (COM bridge)
  - Render slides               - Resolved positions           - ppt_bridge.py on Windows
  - Wait for fonts               - Text runs + rects            - HTTP API on port 9876
  - Screenshots for               - Image metadata              - /exec runs Python in
    verification                  - Connector geometry             COM context
                                  - Z-order                     - /screenshot for verify
```

**Why COM instead of python-pptx?**
- **Live iteration**: See changes instantly in the running PowerPoint window
- **Modify in-place**: Change any property of any shape without rebuilding
- **Visual verification**: Screenshot any slide and compare to source
- **Native features**: Font embedding, connectors, precise text rendering

## Setup

### 1. Start the Bridge

The bridge is at `tools/ppt-bridge/ppt_bridge.py`. It requires Windows Python
with `pywin32` and PowerPoint installed.

**From PowerShell (Windows-native):**
```powershell
python ppt_bridge.py                    # new blank deck
python ppt_bridge.py open deck.pptx    # open existing
# Bridge starts on http://localhost:9876
```

**From WSL2:**
```bash
# Must use Windows Python (has win32com)
/mnt/c/Python313/python.exe ppt_bridge.py
# Bridge binds to 0.0.0.0:9876
# Connect from WSL using Windows gateway IP:
WIN_IP=$(ip route show default | awk '{print $3}')
curl http://$WIN_IP:9876/status
```

### 2. Serve the Deck

```bash
python3 -m http.server 8321    # from the deck directory
```

### 3. Pull the Latest SlideKit Bundle

GitHub's raw CDN caches aggressively. Bypass with the API:
```bash
gh api repos/cabird/slidekit/contents/slidekit/dist/slidekit.bundle.min.js \
  --jq '.content' | base64 -d > slidekit.bundle.min.js
```

### 4. Install Fonts

Download TTFs and install to `%LOCALAPPDATA%\Microsoft\Windows\Fonts\`.
Register via PowerShell:
```powershell
Set-ItemProperty -Path "HKCU:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Fonts" `
  -Name "Font Name (TrueType)" -Value "<path>"
```

For proper CSS font-weight support (300, 400, 500, 600, 700), install
**static weight files** (e.g., `DMSans-Light.ttf`, `DMSans-SemiBold.ttf`).
Variable fonts register as one family and PowerPoint can't select intermediate
weights via COM.

---

## Coordinate Mapping

**The universal rule: multiply everything by 0.5.**

| Space | Dimensions | Unit |
|-------|-----------|------|
| SlideKit canvas | 1920 x 1080 | CSS px |
| PowerPoint slide | 960 x 540 | points |
| Scale factor | **0.5** | px → pt |

This applies to positions, sizes, **and font sizes**.

```python
S = 0.5
def pt(css_px): return css_px * S
# 76px CSS → 38pt PPTX
# 1920px width → 960pt width
```

For sub-pixel precision (adjacent elements sharing edges), compute edges
rather than dimensions independently:
```python
left  = round(left_px * S, 2)
right = round((left_px + width_px) * S, 2)
width = right - left    # derived from edges, not rounded independently
```

---

## Scene Graph API

After page load, wait ~3 seconds for font re-render + enrichment:

```javascript
while (!window.sk) await new Promise(r => setTimeout(r, 100));
await new Promise(r => setTimeout(r, 3000));
const layout = window.sk.slides[slideIndex].layout;
const elements = layout.elements;
const el = elements["element-id"];
```

### Core Properties (all elements)

```javascript
el.type;          // "el" | "connector" | "group" | "vstack" | "hstack"
el.resolved;      // { x, y, w, h } — absolute bounds in slide CSS px
el.zOrder;        // number (1-based) — visual stacking order within parent context
el.authored;      // { content, props } — original authored data
el.parentId;      // parent element ID, or null for root
el.children;      // child element IDs
```

### Image Data (`el.image`)

Present on `el`-type elements containing an `<img>` tag. Pre-computes
object-fit geometry so the exporter can call `drawImage()` directly.

```javascript
el.image = {
  src: "./photo.png",             // as authored in <img src="...">
  naturalWidth: 1536,              // source pixels — no file access needed
  naturalHeight: 1024,
  objectFit: "cover",              // "cover" | "contain" | "fill" | "none"
  objectPosition: [0.5, 0.5],     // alignment fractions [x, y]
  sourceRect: { x: 137, y: 0, w: 1260, h: 1024 },  // crop in source px
  destRect:   { x: 0, y: 0, w: 960, h: 780 },       // placement in container
};
```

**Using sourceRect for PPT crop** (see "Image Cover Crop" section below).

### Text Data (`el.text`)

Structured text content extracted from the browser's rendered DOM. No HTML
parsing needed — all styling comes from `getComputedStyle`, all positioning
from `Range.getClientRects()`.

```javascript
el.text = {
  paragraphs: [{
    textAlign: "left",           // from block element's computed style
    runs: [{
      text: "Bold text here",
      style: {
        fontFamily: '"DM Sans"',
        fontSize: 28,            // CSS px
        fontWeight: 700,
        fontStyle: "normal",
        color: "rgb(26, 26, 26)",
        letterSpacing: -0.56,    // CSS px
        lineHeight: 33.6,        // CSS px
        textDecoration: "none",
        textTransform: "none",
        opacity: 1,
        backgroundColor: "rgba(0, 0, 0, 0)",
      },
      rects: [                   // per-line fragments in slide CSS px
        { x: 100, y: 200, w: 600, h: 34 },
        { x: 100, y: 234, w: 450, h: 34 },  // wrapped to second line
      ],
    }],
  }],
};
```

**Key design:**
- One text box per SlideKit `el()` element
- Paragraphs from block-level boundaries (`<p>`, `<div>`, `<h1>`-`<h6>`, etc.)
- `<br>` emits a run with `text: "\n"` and empty rects → maps to `<a:br/>` in PPTX
- Multiple rects per run = wrapped text that belongs in the **same text box**
- Runs with identical style are pre-merged

### Connector Data (`el.connector`)

```javascript
el.connector = {
  from: { elementId: "box-a", anchor: "cr", x: 300, y: 150, dx: 1, dy: 0 },
  to:   { elementId: "box-b", anchor: "cl", x: 500, y: 150, dx: -1, dy: 0 },
  style: {
    type: "straight",    // "straight" | "curved" | "elbow" | "orthogonal"
    color: "#00d4ff",    // resolved CSS color
    thickness: 2,        // CSS px
    arrow: "end",        // "none" | "start" | "end" | "both"
    dash: null,          // SVG dash pattern or null for solid
    opacity: 1,
  },
  path: {
    x1: 300, y1: 150, x2: 500, y2: 150,         // endpoints
    // cx1, cy1, cx2, cy2 — Bezier CPs (curved only)
    // waypoints — polyline points (elbow/orthogonal only)
    // cornerRadius — rounded elbow radius
  },
  label: {               // only if authored
    text: "label text",
    x: 400, y: 142,     // slide-level, post-offset
    angle: 0,            // degrees
    style: { fontFamily, fontSize, fontWeight, color },
  },
};
```

---

## COM/PPT Rules (Hard-Won Knowledge)

### Font Weight

PowerPoint COM only has `Font.Bold` (True/False) — no weight spectrum. For
proper weight support, install **static TTF files** for each weight:

| CSS weight | Font.Name | Font.Bold |
|-----------|-----------|-----------|
| 300 | "DM Sans Light" | False |
| 400 | "DM Sans" | False |
| 500 | "DM Sans Medium" | False |
| 600 | "DM Sans SemiBold" | False |
| 700 | "DM Sans Bold" | True |

With only a variable font, weights 300/400/500 are indistinguishable.

### Line Spacing (CRITICAL)

- `LineRuleWithin` is `MsoTriState`, NOT an enum!
  - `-1` (msoTrue) = proportional mode — `SpaceWithin` is a multiplier
  - `0` (msoFalse) = points mode — `SpaceWithin` is exact points
- **PPT "single spacing" (1.0) ~ CSS line-height 1.2**
- Conversion: `SpaceWithin = css_line_height / 1.2`
- Must set **per-paragraph** — setting on `TextRange.ParagraphFormat` may not propagate
- Also set `SpaceBefore = 0` and `SpaceAfter = 0` per paragraph

```python
ppt_spacing = css_line_height / 1.2
for p in range(1, tr.Paragraphs().Count + 1):
    pf = tr.Paragraphs(p).ParagraphFormat
    pf.LineRuleWithin = -1  # msoTrue = proportional
    pf.SpaceWithin = ppt_spacing
    pf.SpaceBefore = 0
    pf.SpaceAfter = 0
```

### TextBox Height Bug (CRITICAL)

PowerPoint auto-shrinks textbox height to ~29.1pt after setting text content.
**Must set `tb.Width`, `tb.Height`, `tb.Left`, `tb.Top` AFTER all text/font
operations, not before.**

### Text Colors / Alpha

COM doesn't support alpha on `Font.Color.RGB`. Pre-blend against background:
```python
# rgba(255,255,255,0.55) over black → rgb(140,140,140)
blended = int(255 * alpha)
color = rgb(blended, blended, blended)
```

### Fill Transparency (WATCH THE INVERSION)

CSS `rgba(0,0,0,0.35)` means **35% opaque** = **65% transparent**.
PPT `Fill.Transparency` is the **opposite** of CSS alpha:
```python
transparency = 1.0 - css_alpha
# CSS alpha 0.35 → PPT Transparency 0.65
```

### Letter Spacing

- `Font.Spacing` on `TextFrame.TextRange.Font` does **NOT** work
- Must use `TextFrame2.TextRange.Font.Spacing` — value is float in points
- Conversion: `spacing_pt = spacing_em * font_size_pt`

### Line Breaks in TextBoxes

Use `chr(13)` (carriage return) not `\n` for paragraph breaks via `InsertAfter`.

### COM RGB Format

`r + g*256 + b*65536` — NOT standard hex.

```python
def rgb(r, g, b): return r + g * 256 + b * 65536
```

### Shape Operations — Modify, Don't Rebuild

**NEVER delete and rebuild slides.** Modify existing shapes in-place:
```python
sh.Left = 65; sh.Top = 190       # reposition
sh.Width = 550; sh.Height = 84   # resize
sh.TextFrame.TextRange.Text = "new text"
sh.TextFrame.TextRange.Font.Color.RGB = rgb(140,140,140)
```

### Connection Sites (for rectangles)

```
Site 1 = top center
Site 2 = left center
Site 3 = bottom center
Site 4 = right center
```

**NOT** the intuitive clockwise order. Anchor mapping:
- `tc` → site 1, `cl` → site 2, `bc` → site 3, `cr` → site 4

### Connecting to the Right Shape

Text labels (type=17) sit on top of rect shapes (type=1). Connect to the
**rect**, not the text label.

---

## Image Cover Crop — The Right Way

**Do NOT pre-crop with PIL/ImageMagick.** PowerPoint can do the crop natively,
avoiding all DPI metadata headaches.

### Using Scene Graph sourceRect

```python
# From el.image:
nat_w, nat_h = el_image['naturalWidth'], el_image['naturalHeight']
sx, sy, sw, sh = (el_image['sourceRect'][k] for k in ('x','y','w','h'))

# Insert at native PPT size (-1,-1 = let PPT determine from pixel dims + DPI)
shp = slide.Shapes.AddPicture(path, False, True, 0, 0, -1, -1)
imgW, imgH = shp.Width, shp.Height  # PPT's imported size in points

# Convert source-pixel crop to PPT imported-space crop
scale_x = imgW / nat_w
scale_y = imgH / nat_h
shp.PictureFormat.CropLeft   = sx * scale_x
shp.PictureFormat.CropRight  = (nat_w - sx - sw) * scale_x
shp.PictureFormat.CropTop    = sy * scale_y
shp.PictureFormat.CropBottom = (nat_h - sy - sh) * scale_y

# Force final geometry AFTER cropping (PPT adjusts Left/Width during crop)
shp.LockAspectRatio = 0  # msoFalse
box = el['resolved']
shp.Left = pt(box['x']); shp.Top = pt(box['y'])
shp.Width = pt(box['w']); shp.Height = pt(box['h'])
```

### Without sourceRect (manual cover math)

```python
shp = slide.Shapes.AddPicture(path, False, True, 0, 0, -1, -1)
imgW, imgH = shp.Width, shp.Height
scale = max(boxW / imgW, boxH / imgH)
overflowX = imgW - boxW / scale
overflowY = imgH - boxH / scale
shp.PictureFormat.CropLeft   = overflowX * 0.5   # 0.5 = object-position 50%
shp.PictureFormat.CropRight  = overflowX * 0.5
shp.PictureFormat.CropTop    = overflowY * 0.5
shp.PictureFormat.CropBottom = overflowY * 0.5
```

### Why pre-cropping fails

- PIL's JPEG writer corrupts JFIF headers (wrong byte offset for DPI)
- PPT reads DPI from JFIF to determine imported size → wrong crop coordinates
- Original PNG avoids all DPI issues — let PPT handle everything

### Crop coordinate space

Crop values are in the **imported image's native point space** (the dimensions
PPT assigns at import), NOT the final displayed shape size. Crop values stay
fixed when you resize afterward.

---

## Bridge API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/status` | GET | Slide count, dimensions, file path |
| `/slides` | GET | List all slides with shape counts |
| `/screenshot/N` | GET | PNG screenshot of slide N (2x resolution) |
| `/shapes/N` | GET | JSON array of all shapes with properties |
| `/exec` | POST | Execute Python code in COM context |
| `/save` | POST | Save the presentation (`{"path": "..."}` for SaveAs) |
| `/reset` | POST | Reinitialize namespace |
| `/undo` | POST | Undo last action |
| `/redo` | POST | Redo last undo |

### /exec Endpoint

Body: `{"code": "python code here"}`
Response: `{"output": "stdout", "result": <_result value>, "error": "traceback or null"}`

- `pres` = active Presentation object (pre-loaded)
- Set `_result = value` to return structured data
- Helper functions: `add_text`, `add_rect`, `add_image`, `add_bar`, `add_rule`,
  `add_label`, `add_line`, `add_node`, `new_slide`, `safe_slide`, `find_shape`,
  `delete_shape`, `set_bg`, `set_notes`, `add_slidenum`, `add_image_bg`

### Image Paths from WSL

Images must use UNC paths: `\\wsl.localhost\Ubuntu_orig\home\cbird\...`
Convert with `wslpath -w /linux/path`.

---

## Building Slides — Element Dispatch

For each slide, working via `POST /exec`:

1. `new_slide(bg_color)` — creates blank slide with background
2. Add elements in z-order (use `el.zOrder` — lower first)
3. Use scene graph `el.resolved` for exact positions: `pt(x)`, `pt(y)`, `pt(w)`, `pt(h)`
4. Extract text content from `el.text` (structured runs) or `el.authored.content` (HTML)

### Text Elements

```python
sl = safe_slide(n)
# From el.text.paragraphs[0].runs[0]:
add_text(sl, text, x, y, w, h,
         size=fontSize,              # CSS px — helper applies 0.5× scale
         color=rgb(r, g, b),
         bold=(fontWeight >= 700),
         weight=fontWeight,
         align=ppAlignLeft,          # from textAlign
         line_height=lineHeight/fontSize,  # CSS ratio
         spacing_em=letterSpacing/fontSize)
```

### Image Elements

```python
# Use scene graph el.image for source rect
add_image(sl, filename, x, y, w, h)
# Then apply crop using sourceRect (see Image Cover Crop section)
```

### Shape Elements (rects, backgrounds)

```python
add_rect(sl, x, y, w, h, fill_color, alpha=1.0)
```

### Connectors

**Straight, single-per-edge → native connector:**
```python
cn = sl.Shapes.AddConnector(1, pt(x1), pt(y1), pt(x2), pt(y2))  # 1=msoConnStraight
cn.Line.ForeColor.RGB = color
cn.Line.Weight = thickness * 0.5
# Arrowheads: EndArrowheadStyle = 2 (triangle), 1 (none)
```

**Curved → attach to shapes:**
```python
cn = sl.Shapes.AddConnector(3, 0, 0, 100, 100)  # 3=msoConnectorCurve
cn.ConnectorFormat.BeginConnect(shape_a, site)
cn.ConnectorFormat.EndConnect(shape_b, site)
cn.RerouteConnections()
```

---

## Verification Loop

After creating each slide:

1. Screenshot PPT: `GET /screenshot/N`
2. Screenshot browser: Playwright `page.screenshot()`
3. Have a **sub-agent** compare (don't look at images yourself — wastes context)
4. Build a **slide-specific checklist** of what to verify (don't rely on generic "do these look the same?")
5. Fix issues **in-place** — never delete and rebuild
6. Query shapes: `GET /shapes/N` to inspect properties
7. Bound to 3 correction attempts per slide

---

## Workflow Summary

```
Phase 1: Preparation
  1. Start ppt_bridge.py (launches PowerPoint)
  2. Serve HTML deck via http server
  3. Gather scene graph, screenshots, slides.js
  4. Install custom fonts (static weight files for proper weight support)

Phase 2: Build Slides (for each slide)
  1. Create blank slide with background color/image
  2. Add elements in z-order using scene graph positions
  3. Use el.text for text content, el.image for image metadata
  4. Set dimensions AFTER text operations (PPT auto-shrinks textboxes)

Phase 3: Verify and Iterate
  1. Screenshot PPT slide, compare to browser screenshot
  2. Sub-agent checks slide-specific checklist
  3. Fix issues in-place (modify shapes, don't rebuild)
  4. Save after each slide

Phase 4: Finalize
  1. Add speaker notes to all slides
  2. Save with embedded fonts
```

---

## Known Limitations

1. **Text reflow** — PowerPoint wraps differently than Chrome. Fixed-size textboxes
   prevent cascade but text may clip. Visual verification catches this.
2. **CSS effects without PPTX equivalents** — backdrop-filter, clip-path, blend modes,
   CSS filters. Agent notes these; user decides per-element.
3. **Connector routing** — Native PPT connectors route differently than SlideKit's
   obstacle-aware algorithm. Port spreading requires freeform shapes.
4. **Animations** — Reveal.js transitions/fragments not exported (static slides only).
5. **Variable font weight** — COM can't select intermediate weights. Use static files.
6. **Text alpha** — COM doesn't support `Font.Color` alpha. Pre-blend against background.

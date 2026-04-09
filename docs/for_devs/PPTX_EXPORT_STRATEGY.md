# SlideKit → PowerPoint Export Strategy

> Status: Design draft
> Last updated: 2026-03-03

## Overview

Export SlideKit presentations to editable PowerPoint (.pptx) files by using the
browser as the layout engine, harvesting resolved geometry and styles, and
recreating each slide in PowerPoint via COM automation. An AI agent drives the
process, using visual verification to ensure fidelity.

### Why This Approach

SlideKit's layout pipeline (text measurement, constraint resolution, collision
detection) runs in the browser. Rather than reimplement that pipeline for PPTX
generation, we **let the browser do the hard work** and harvest the results:

- **Resolved geometry** — exact pixel positions, sizes, and computed styles from
  the DOM
- **Authored intent** — constraints, relationships, and semantic properties from
  the SlideKit scene graph (`window.sk`)
- **Visual ground truth** — per-slide screenshots for verification

The agent then recreates each slide in PowerPoint, using both the resolved
geometry and authored properties to make informed decisions about how to best
represent each element.

## Target Environment

- **Platform:** Windows with PowerPoint installed
- **Automation:** COM automation (win32com / pywin32 from Python, or direct
  VBA/PowerShell)
- **Browser:** Playwright (Chromium) for rendering and DOM queries
- **Agent:** AI model with tool access to both Playwright and PowerPoint COM

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    AI Agent (orchestrator)               │
├─────────────┬──────────────────┬────────────────────────┤
│  Playwright │  SlideKit Scene  │  PowerPoint COM        │
│  (browser)  │  Graph (window.sk)│  (win32com)           │
├─────────────┼──────────────────┼────────────────────────┤
│ • Render    │ • Authored props │ • Create presentation  │
│   slides    │ • Constraints    │ • Add shapes/text/     │
│ • Query DOM │ • Element tree   │   images per slide     │
│ • Computed  │ • Font specs     │ • Apply formatting     │
│   styles    │ • Layer info     │ • Embed fonts          │
│ • Screenshot│ • Connector      │ • Save as .pptx        │
│   per slide │   definitions    │ • Screenshot for       │
│             │                  │   verification         │
└─────────────┴──────────────────┴────────────────────────┘
```

### Export Workflow

The export runs in **batch mode** — all slides are processed sequentially, with
verification screenshots saved to disk. The user reviews the results at the end.

```
Pre-flight:
  1. Ask user: visible or hidden PowerPoint?
  2. Detect all fonts, download missing Google Fonts, report to user
  3. Wait for user to install fonts if needed
  4. Create export output directory
  5. Launch PowerPoint, record PID, register cleanup handlers

For each slide:
  1. Navigate to slide in browser (Reveal.js slide index)
  2. Harvest data:
     a. Screenshot the rendered slide → save as slide-NN-source.png
     b. Query scene graph (window.sk) for all elements, authored props,
        constraints
     c. Query DOM for computed styles (font metrics, colors, effects)
     d. Read source code for text content, image paths
  3. Create PowerPoint slide:
     a. Classify each element (text, image, shape, connector, group)
     b. Dispatch to type-specific handler
     c. Apply positioning, sizing, formatting
  4. Verify (slide-specific checklist):
     a. Screenshot the PowerPoint slide → save as slide-NN-pptx-v1.png
     b. AI sub-agent compares using slide-specific checklist (not generic)
     c. If differences detected → correct, re-screenshot as v2/v3
     d. Save final version as slide-NN-pptx-accepted.png
  5. Save presentation after each slide

Post-export:
  1. Save final PPTX with embedded fonts
  2. Quit PowerPoint, clean up PID marker
  3. Present summary to user: slide count, any approximations, any
     unresolved mismatches, link to verification directory
```

## Coordinate Mapping

SlideKit uses a **1920 x 1080 pixel** canvas. PowerPoint uses EMUs (English
Metric Units) with standard 16:9 slides at **9,144,000 x 6,858,000 EMU**
(10" x 7.5" at 914,400 EMU/inch).

```
EMU_per_pixel = 9,144,000 / 1920 = 4,762.5 EMU/px

left_emu  = left_px  * 4762.5
top_emu   = top_px   * 4762.5
width_emu = width_px * 4762.5
height_emu= height_px* 4762.5
```

**Rounding strategy:** The 4762.5 factor is fractional, so EMU values must be
rounded to integers. To avoid cumulative edge drift, compute edges rather than
dimensions independently:

```
left  = round(left_px  * 4762.5)
right = round((left_px + width_px) * 4762.5)
width = right - left    // derived from edges, not rounded independently

top    = round(top_px   * 4762.5)
bottom = round((top_px + height_px) * 4762.5)
height = bottom - top
```

This ensures adjacent elements share exact edges without 1-EMU gaps.

## Element-Type Dispatch

Each SlideKit element is classified and handled by a type-specific strategy.
The agent has access to **both** the scene graph (authored properties) and
computed styles, and uses judgment to pick the best representation.

### Text Elements

**PowerPoint API:** `Shapes.AddTextbox(msoTextOrientationHorizontal, L, T, W, H)`

**Data sources:**
- Scene graph: font family, size, color, weight, text content, alignment
- Computed styles: actual rendered font metrics, line height, letter spacing
- Source code: raw HTML content with inline formatting

**Approach:**
1. Create textbox at exact resolved position and size
2. Set `TextFrame.WordWrap = msoTrue`
3. Set `TextFrame.AutoSize = ppAutoSizeNone` (fixed size, no auto-fit)
4. **Map text container geometry** (critical for avoiding systematic drift):
   - CSS `padding-*` → `TextFrame.MarginLeft`, `.MarginRight`, `.MarginTop`,
     `.MarginBottom`
   - CSS vertical alignment → `TextFrame.VerticalAnchor` (`msoAnchorTop`,
     `msoAnchorMiddle`, `msoAnchorBottom`)
   - Note: SlideKit renderer uses `box-sizing: border-box`, so the shape's
     total size includes padding. PowerPoint textbox margins are *inside* the
     shape boundary, which matches.
5. Walk the HTML content and decompose into PowerPoint text runs:
   - Each styled `<span>`, `<b>`, `<em>`, etc. becomes a separate
     `TextRange.Characters(start, length)` call
   - Apply per-run formatting: `Font.Name`, `.Size`, `.Bold`, `.Italic`,
     `.Color.RGB`, `.Underline`
   - Handle `<br>` and block tags as paragraph breaks
   - Handle `<ul>`/`<ol>` as `ParagraphFormat.Bullet` with `.IndentLevel`
6. Set paragraph-level formatting: alignment, line spacing, bullet style

**v1 scope for rich text:** Support inline `<span>` with style attributes,
`<b>`/`<i>`/`<u>`/`<em>`/`<strong>`, `<br>`, `<ul>`/`<ol>`/`<li>`. Defer full
CSS-in-HTML parsing (e.g. `<div>` nesting, CSS classes) to later phases.

**Risk: Text reflow.** PowerPoint's text engine may wrap differently than the
browser. Mitigation strategy with bounded correction:
1. Fixed-size textboxes prevent layout cascade
2. Map CSS `line-height` explicitly to PPT `ParagraphFormat.SpaceWithin`
   using line rule `ppLineRuleExact` for pixel-precise line spacing
3. If visual verification detects text overflow, adjust in fixed steps:
   prefer widening the textbox slightly before reducing font size (preserves
   typography), reduce font size in -0.25pt steps down to a floor of -1pt
   from original
4. After 3 correction attempts, report remaining text overflow to the user

### Image Elements

**PowerPoint API:** `Shapes.AddPicture(FileName, msoFalse, msoTrue, L, T, W, H)`

**Data sources:**
- Scene graph: source image path, dimensions, any CSS object-fit/position
- DOM: resolved image dimensions and clipping

**Approach:**
1. Resolve the source image path from the scene graph or `<img src="...">`
2. Add picture at exact position and size
3. If CSS `object-fit: cover` or clipping is applied, crop the image in
   PowerPoint using `PictureFormat.Crop*` properties
4. Apply rotation if present

**Risk: Minimal.** Images are the most straightforward element type.

### Shape Elements (rectangles, rounded rects, lines)

**PowerPoint API:** `Shapes.AddShape(msoShapeRectangle, L, T, W, H)`

**Data sources:**
- Scene graph: position, size, background color, border, border-radius
- Computed styles: exact color values, gradients, shadows

**Approach:**
1. Choose the appropriate `MsoAutoShapeType` based on properties:
   - No border-radius → `msoShapeRectangle`
   - With border-radius → `msoShapeRoundedRectangle` (set
     `Adjustments.Item(1)` for corner radius)
   - Circle/ellipse → `msoShapeOval`
2. Apply fill: `Shape.Fill.ForeColor.RGB`, transparency
3. Apply line: `Shape.Line.ForeColor.RGB`, `.Weight`, `.DashStyle`
4. Apply shadow if present: `Shape.Shadow` properties

**CSS gradients → PowerPoint gradients:** PowerPoint supports linear and radial
gradients via `Shape.Fill.TwoColorGradient` or `Shape.Fill.PresetGradient`.
The stop model differs from CSS, so the agent maps CSS gradient stops to
PowerPoint gradient stops as closely as possible.

### Connector Elements

SlideKit renders connectors as SVG polylines with obstacle-aware routing
(straight, elbow, curved, orthogonal paths). PowerPoint has two possible
representations, each with trade-offs:

#### Option A: Native PowerPoint Connectors

**API:** `Shapes.AddConnector(Type, BeginX, BeginY, EndX, EndY)` then
`.ConnectorFormat.BeginConnect` / `.EndConnect`

**Pros:**
- Connectors stay attached to shapes when shapes move
- Native PowerPoint behavior — users can edit naturally
- Supports straight, elbow types

**Cons:**
- No support for obstacle-aware routing or custom waypoints
- Limited to straight or single-elbow paths
- Routing may differ from SlideKit's computed path
- Connection sites are fixed at edge midpoints — cannot reproduce port
  spreading (multiple connectors fanned along one edge)

#### Option B: Freeform Shapes (BuildFreeform + ConvertToShape)

**API:** `Shapes.BuildFreeform(...)` → add line/curve segments → `.ConvertToShape`

**Pros:**
- Exact visual fidelity — reproduces the computed polyline precisely
- Supports any path geometry (orthogonal, curved, multi-segment)
- Rounded corners representable via line segments

**Cons:**
- Not a "connector" in PowerPoint's model — won't snap to shapes
- Users can't easily re-route by dragging
- More complex to generate

#### PowerPoint Connection Site Limitations

Standard PowerPoint shapes have a **fixed number of connection sites** (e.g. a
rectangle has exactly 4 — one at the midpoint of each edge). These sites cannot
be repositioned or added to. Multiple connectors can attach to the same site,
but they all originate from the same pixel, which means **SlideKit's port
spreading (fanning multiple connectors along an edge) cannot be replicated with
native connectors.**

#### Connector Strategy — Automatic Decision Tree

Rather than asking the user for every connector, the agent classifies each
connector and selects the best representation automatically, only prompting
when there is a genuine trade-off:

| Scenario | Representation | Rationale |
|---|---|---|
| Straight line, single connector per edge | **Native connector** (automatic) | Perfect fidelity, stays attached to shapes, editable. No reason to use freeform. |
| Multiple connectors from same edge (port spreading) | **Freeform shape** (automatic) | Native connectors cannot spread along an edge — all would converge at the edge midpoint. Freeform is the only option that preserves the visual. |
| Non-straight routing (elbow, orthogonal, curved) | **Ask the user** | Genuine trade-off between editability and fidelity. |

When the agent needs to ask (non-straight connectors), it explains the
trade-offs:

> "This presentation uses non-straight connectors (elbow/curved routing).
> How would you like them represented in PowerPoint?
>
> **Native connectors** — Stay attached to shapes, editable, but routing
> will differ from the original (PowerPoint uses its own routing algorithm).
> Best if you plan to edit the deck further.
>
> **Freeform shapes** — Exact visual match of the computed path, but
> connectors won't snap to shapes and can't be re-routed by dragging.
> Best if visual fidelity is the priority."

The user's choice applies to all non-straight connectors in the deck. Straight
single-per-edge connectors always use native, and port-spread connectors
always use freeform, regardless of the user's choice for non-straight ones.

**Arrowheads and line formatting:** Regardless of connector strategy,
arrowheads map to `Line.EndArrowheadStyle` / `Line.BeginArrowheadStyle` (for
native connectors) or equivalent line formatting applied post-`ConvertToShape`
(for freeform shapes). Line weight, color, and dash style map to `Line.Weight`,
`Line.ForeColor.RGB`, and `Line.DashStyle` respectively.

### Group Elements

**PowerPoint API:** Create child shapes, then `ShapeRange.Group()`

**Approach:**
1. Create all child elements at their absolute positions
2. Select them as a `ShapeRange`
3. Call `.Group()` to create a PowerPoint group
4. The group's internal coordinate system is handled by PowerPoint

**Note:** SlideKit groups use local coordinates. The agent resolves these to
absolute positions (already done by the layout pipeline) before creating
PowerPoint shapes.

### Stacks (vstack / hstack)

Stacks are resolved by the layout pipeline into positioned children. The agent
treats each child as an independent element at its resolved position. The stack
itself may optionally be represented as a group in PowerPoint.

## Slide Backgrounds

SlideKit's renderer supports per-slide backgrounds via `data-background-*`
attributes on Reveal.js sections. These must be mapped to PowerPoint slide
backgrounds:

| SlideKit Background | PowerPoint Mapping |
|---|---|
| `data-background-color` | `Slide.Background.Fill.ForeColor.RGB` |
| `data-background-gradient` | `Slide.Background.Fill.TwoColorGradient(...)` |
| `data-background-image` | `Slide.Background.Fill.UserPicture(imagePath)` |

For background images, PowerPoint's `UserPicture` fills the entire slide.
If the image needs specific positioning (CSS `background-size: cover` vs
`contain`), the agent may need to insert a full-slide image shape on the
background layer instead.

## CSS-to-PowerPoint Effect Mapping

| CSS Property | PowerPoint Equivalent | Fidelity |
|---|---|---|
| `padding-*` | `TextFrame.Margin{Left,Right,Top,Bottom}` | Exact |
| `vertical-align` | `TextFrame.VerticalAnchor` | Exact |
| `background-color` | `Shape.Fill.ForeColor.RGB` | Exact |
| `opacity` | `Shape.Fill.Transparency` | Exact |
| `border` | `Shape.Line.*` | Exact |
| `border-radius` | `Shape.Adjustments.Item(1)` on rounded rect | Close |
| `color` (text) | `Font.Color.RGB` | Exact |
| `font-family` | `Font.Name` | Exact (if font installed) |
| `font-size` | `Font.Size` | Exact |
| `font-weight: bold` | `Font.Bold` | Exact |
| `font-style: italic` | `Font.Italic` | Exact |
| `text-decoration: underline` | `Font.Underline` | Exact |
| `text-align` | `ParagraphFormat.Alignment` | Exact |
| `line-height` | `ParagraphFormat.SpaceWithin` | Close |
| `letter-spacing` | `Font.Spacing` | Close |
| `box-shadow` | `Shape.Shadow.*` | Approximate |
| `linear-gradient(...)` | `Fill.TwoColorGradient` | Approximate |
| `transform: rotate(Xdeg)` | `Shape.Rotation` | Exact |
| `flipH` / `flipV` props | `Shape.HorizontalFlip` / `Shape.VerticalFlip` | Exact |
| `backdrop-filter: blur()` | No equivalent | Not supported |
| `clip-path` (complex) | No equivalent | Not supported |
| `mix-blend-mode` | No equivalent | Not supported |
| `filter: blur/brightness/...` | No equivalent | Not supported |

**Philosophy on unsupported effects:** Get as close as possible with native
PowerPoint primitives. Do **not** rasterize by default — the whole point of
exporting to PPTX is editability. If an effect cannot be reproduced, the agent
notes it in a summary and the user can decide whether to accept the
approximation or request rasterization of specific elements.

Rasterization (screenshotting an element and inserting it as an image) is
available as a **user-requested fallback** for individual elements, not as an
automatic behavior.

## Font Handling

### Detection

1. Query the scene graph for all font families used across all slides
2. Query computed styles as a cross-check (catches inherited/fallback fonts)
3. Compile a deduplicated list of required fonts

### Availability Check

Query PowerPoint via COM to see which fonts are available on the system:

```python
# Pseudo-code via win32com
pptApp = win32com.client.Dispatch("PowerPoint.Application")
pres = pptApp.Presentations.Add()
# After adding content with all fonts:
for font in pres.Fonts:
    print(font.Name, "Embeddable:", font.Embeddable)
```

Alternatively, enumerate system fonts from the Windows font directory
(`C:\Windows\Fonts`) or the registry.

### Missing Font Workflow

If fonts are not installed:

1. **Download automatically.** For Google Fonts, the agent downloads the font
   files directly from Google Fonts (via the API or direct download URLs) and
   saves them to a local directory within the export output folder.

2. **Inform the user:**
   > "The following fonts were not installed on your system. I've downloaded
   > them from Google Fonts to `./export/fonts/`:
   > - Inter (used on 12 slides)
   > - Fira Code (used on 3 slides)
   >
   > These are Google Fonts, licensed under the SIL Open Font License /
   > Apache 2.0. They are freely distributable — there are no licensing
   > concerns with using or embedding them.
   >
   > To use them in the export, install the font files from that directory
   > (double-click each .ttf/.otf file and click Install), then re-run the
   > export."

3. **Do not substitute.** We want exact font matches, not "close enough"
   alternatives. If the font isn't available and can't be downloaded (not a
   Google Font, or download fails), stop and inform the user rather than
   silently substituting.

### Font Embedding

After the PPTX is created with all fonts available:

```python
pres.SaveAs(
    FileName=output_path,
    FileFormat=ppSaveAsPresentation,  # or ppSaveAsOpenXMLPresentation
    EmbedTrueTypeFonts=msoTrue
)
```

This embeds the TrueType fonts directly in the .pptx file, so it renders
correctly on any machine regardless of installed fonts.

**Embeddability check:** Before saving, verify each font allows embedding:

```python
for font in pres.Fonts:
    if not font.Embeddable:
        warn(f"Font '{font.Name}' cannot be embedded (license restriction)")
```

Most Google Fonts use OFL or Apache 2.0 licenses and are fully embeddable.

**Subset vs full embedding:** PowerPoint may embed only the character subset
used in the presentation (smaller file) or the full font (allows editing with
any character). The `EmbedTrueTypeFonts` flag enables embedding; PowerPoint
controls the subsetting behavior based on its own heuristics. If a font cannot
be embedded at all (license restriction), the export proceeds with a warning
rather than halting — the user is informed which fonts are not embedded and may
need manual installation on target machines.

## Z-Order and Layers

SlideKit uses three named layers: `background`, `content`, `overlay`. Within
each layer, elements have an implicit z-order based on declaration order.

**Mapping:** Create shapes in z-order sequence (background elements first,
then content, then overlay). PowerPoint assigns z-order based on creation
order. If needed, use `Shape.ZOrder(msoSendToBack)` or
`Shape.ZOrder(msoBringToFront)` to fine-tune.

## Visual Verification Loop

After creating each slide in PowerPoint, the agent verifies fidelity:

1. **Screenshot the PowerPoint slide** via COM:
   ```python
   slide.Export(temp_path, "PNG", 1920, 1080)
   ```

2. **Build a slide-specific verification checklist.** Generic "do these look
   the same?" prompts produce unreliable results — sub-agents tend to say
   things look great when they don't. Instead, the main agent constructs a
   **concrete, slide-specific list of things to check** based on its knowledge
   of what it just created. For example:

   > "Compare these two slide images. Check the following specific items:
   > 1. Title text 'AI-Driven Development' should be centered near the top,
   >    white text, approximately 48pt
   > 2. There should be 4 bullet points in the left column, dark gray text
   > 3. The bar chart image should be in the bottom-right quadrant, roughly
   >    400x300px
   > 4. Background should be a dark blue gradient from top-left to bottom-right
   > 5. The company logo should be in the bottom-left corner, ~80px wide
   > 6. Check that text colors match exactly — the title is #FFFFFF, body
   >    text is #333333
   > 7. Verify no text is clipped or overflowing its container
   >
   > Report any differences between the source (first image) and the
   > PowerPoint version (second image)."

   The main agent knows exactly what elements are on the slide, their expected
   positions, colors, sizes, and content — so it should enumerate them
   explicitly rather than relying on the sub-agent to discover what to look at.

3. **If differences are found,** the sub-agent describes them and the main
   agent makes targeted corrections (adjust text size, reposition element,
   fix color value, etc.), then re-verifies.

4. **If acceptable,** proceed to the next slide.

The verification loop is bounded — after 3 correction attempts per slide,
the agent reports remaining differences to the user for manual review.

**Mismatch classification:** The sub-agent classifies each difference so the
main agent applies the right correction strategy:

| Classification | Action |
|---|---|
| Text overflow/clipping | Adjust textbox size or font size (bounded steps) |
| Position drift | Re-check coordinate conversion, adjust placement |
| Color mismatch | Re-read computed color, fix RGB value |
| Missing asset | Re-check image path, re-insert |
| Unsupported effect | Mark as **non-actionable**, skip retries, report to user |
| Font substitution | Mark as **deck-level issue**, abort and report |

Non-actionable mismatches (caused by CSS effects with no PPTX equivalent) do
not consume retry attempts.

## Slide-Level Metadata

### Speaker Notes

SlideKit presentations may include speaker notes. These are added via:

```python
slide.NotesPage.Shapes.Placeholders(2).TextFrame.TextRange.Text = notes_text
```

### Headers and Footers

If the source presentation uses slide numbers or footer text:

```python
pres.HeadersFooters.SlideNumber.Visible = True
pres.HeadersFooters.Footer.Visible = True
pres.HeadersFooters.Footer.Text = "Footer text"
```

## Data Harvesting API

The agent uses these JavaScript calls in Playwright to extract slide data:

### Scene Graph (authored properties)

```javascript
// Get all elements for the current slide
const elements = window.sk.slides[slideIndex].elements;

// Each element has:
// - id, type (text, image, shape, connector, group, vstack, hstack)
// - x, y, w, h (resolved positions)
// - authored props (font, color, constraints, etc.)
// - children (for groups/stacks)
// - connector (present when type === "connector"; see below)
```

### Connectors

Connector elements carry a first-class `connector` field with everything an
exporter needs — logical references, resolved anchor geometry, resolved style
(with renderer defaults applied and CSS custom properties pre-resolved), and
drawable path data:

```javascript
const conn = window.sk.slides[slideIndex].elements[connectorId].connector;

// Logical references (what an exporter writes into the .pptx graph)
conn.from.elementId;  // source element id
conn.from.anchor;     // "cr" | "cl" | "tc" | "bc" | "tl" | "tr" | "bl" | "br" | "cc"
conn.to.elementId;
conn.to.anchor;

// Numeric anchor points in slide-level CSS px (post port-spreading),
// plus outward-pointing direction vectors used by the renderer.
conn.from.x; conn.from.y; conn.from.dx; conn.from.dy;
conn.to.x;   conn.to.y;   conn.to.dx;   conn.to.dy;

// Resolved style — effective visual style after defaults are applied.
// `opacity` mirrors the renderer's effective value (1 unless explicitly set),
// so exporters can trust it as the on-screen value without extra defaulting.
conn.style.type;      // "straight" | "curved" | "elbow" | "orthogonal"
conn.style.color;     // CSS var(--...) resolved to a concrete color when possible
conn.style.thickness; // CSS px
conn.style.arrow;     // "none" | "start" | "end" | "both"
conn.style.dash;      // SVG stroke-dasharray string, or null for solid
conn.style.opacity;   // [0, 1]

// Drawable path data in slide-level CSS px
conn.path.x1; conn.path.y1; conn.path.x2; conn.path.y2;
// Curved connectors only — cubic Bezier control points
conn.path.cx1; conn.path.cy1; conn.path.cx2; conn.path.cy2;
// Elbow / orthogonal connectors only — polyline waypoints (includes endpoints)
conn.path.waypoints;
// Elbow / orthogonal connectors only — rounded-corner radius, if authored.
// Exporters wanting visual parity should fillet each interior waypoint by
// this amount (CSS px).
conn.path.cornerRadius;

// Resolved label — only present when a label is authored. All coordinates
// are slide-level CSS px and already include the authored label offset,
// so the exporter can treat (label.x, label.y) as the final text anchor.
// The label should be rotated around that anchor by `angle` degrees.
if (conn.label) {
  conn.label.text;       // label string
  conn.label.x;          // text anchor x (slide-level, post-offset)
  conn.label.y;          // text anchor y (slide-level, post-offset)
  conn.label.angle;      // degrees, typically 0 or -90
  conn.label.style.fontFamily;
  conn.label.style.fontSize;
  conn.label.style.fontWeight;
  conn.label.style.color;  // CSS custom properties resolved best-effort
}
```

### Computed Styles

```javascript
// For a specific DOM element
const el = document.querySelector(`[data-sk-id="${elementId}"]`);
const styles = window.getComputedStyle(el);
// styles.fontFamily, styles.fontSize, styles.color, etc.
```

### Screenshot

```javascript
// Via Playwright
await page.screenshot({ path: 'slide-1.png' });
// Or element-level:
await element.screenshot({ path: 'element.png' });
```

## COM Automation Reliability

PowerPoint COM automation requires careful lifecycle management.

### Visibility

Before starting the export, **ask the user** what visibility mode they want:

> "Would you like to watch PowerPoint as it builds the slides, or run it in
> the background?
>
> **Visible** — You can watch each slide being constructed in real time.
> Useful for monitoring progress and catching issues early.
>
> **Hidden** — PowerPoint runs in the background. Faster, less distracting."

Set `Application.Visible` accordingly. Default suggestion: visible, since
users often want to watch the process.

### Process Tracking and Orphan Prevention

Orphan `POWERPNT.EXE` processes are a real risk if the agent crashes. To
safely identify and clean up our own instance without killing the user's
other PowerPoint windows:

1. **Record the PID at startup.** After `Dispatch("PowerPoint.Application")`,
   get the process ID via the Application's window handle:
   ```python
   import win32process, win32gui
   hwnd = pptApp.HWND  # PowerPoint exposes its HWND
   _, pid = win32process.GetWindowThreadProcessId(hwnd)
   # Save pid to a marker file: export_output/.pptx_export_pid
   ```

2. **Register cleanup handlers.** Use `atexit`, `signal.signal(SIGTERM)`,
   and `signal.signal(SIGINT)` to call `pptApp.Quit()` on any exit path.

3. **Write a PID marker file** to the export output directory
   (`export_output/.pptx_export_pid`) containing the PID and start timestamp.
   If a subsequent export run finds this file, it can check whether that PID
   is still a `POWERPNT.EXE` process and kill only that specific instance.

4. **On startup, check for stale markers.** If `.pptx_export_pid` exists:
   - Read the PID and timestamp
   - Check if a `POWERPNT.EXE` process with that PID is still running
   - If so, inform the user and offer to kill it:
     > "Found an orphan PowerPoint process (PID 12345) from a previous
     > export that may not have cleaned up. Kill it?"
   - Only kill the specific PID — never enumerate and kill all PowerPoint
     processes, since the user may have their own decks open.

5. **Clean up the marker file** after successful `pptApp.Quit()`.

### Error Handling

- COM calls can throw on unexpected dialog boxes (e.g. "font not found",
  "file already open"). Wrap COM interactions in try/except and ensure
  cleanup runs.
- **Save frequency:** Save the presentation after each slide is completed
  (not just at the end) to avoid losing work on crash.

## Export Output Directory Structure

All export artifacts go into a single, well-organized directory. The agent
creates this at the start of the export and names it based on the source
presentation:

```
export_output/
├── <deck-name>-pptx-export/
│   ├── <deck-name>.pptx                  # Final PowerPoint file
│   ├── fonts/                            # Downloaded fonts (if any)
│   │   ├── Inter-Regular.ttf
│   │   └── FiraCode-Regular.ttf
│   ├── .pptx_export_pid                  # Process marker (auto-cleaned)
│   └── verification/                     # All comparison screenshots
│       ├── slide-01-source.png           # Browser-rendered original
│       ├── slide-01-pptx-v1.png          # First PPTX attempt
│       ├── slide-01-pptx-v2.png          # After correction (if needed)
│       ├── slide-01-pptx-accepted.png    # Final accepted version
│       ├── slide-02-source.png
│       ├── slide-02-pptx-v1.png
│       ├── slide-02-pptx-accepted.png
│       ├── ...
│       └── slide-15-pptx-accepted.png
```

**Naming conventions:**
- Files are named so that related slides sort together in a file explorer:
  `slide-{NN}-{type}-{version}.png`
- `{NN}` is zero-padded slide number (01, 02, ... 15)
- `{type}` is `source` (browser original) or `pptx` (PowerPoint render)
- `{version}` is `v1`, `v2`, `v3` for correction iterations, or `accepted`
  for the final verified version
- This means in any file browser, you see: source → v1 → v2 → accepted,
  grouped by slide number

**Cleanup:** On a successful export, intermediate versions (v1, v2) can
optionally be kept for audit or deleted to save space. The `source` and
`accepted` images are always kept so the user can visually audit the export.

## Known Limitations

1. **Text reflow:** PowerPoint's text engine may wrap text differently than
   Chrome. Fixed-size textboxes prevent layout cascade but text may clip.
   Visual verification catches this.

2. **CSS effects without PPTX equivalents:** backdrop-filter, clip-path,
   blend modes, and CSS filters cannot be reproduced natively. The agent
   notes these and the user decides on a per-element basis.

3. **Connector routing:** If using native connectors (Option A), PowerPoint
   will route differently than SlideKit's obstacle-aware algorithm.

4. **Animations/transitions:** Reveal.js fragments and transitions do not
   have a direct mapping to PowerPoint animations. This is out of scope for
   v1 — slides are exported as static content.

5. **Embedded HTML/iframes:** If slides contain embedded web content, these
   cannot be represented in PowerPoint and will be flagged to the user.

## Implementation Phases

### Phase 1 (v1): Core Export
- Text, images, basic shapes (rectangles, rounded rects)
- Solid fills, borders, font formatting
- Coordinate mapping, z-order
- Connector auto-dispatch (straight → native, port-spread → freeform,
  non-straight → ask user)
- Groups and stacks
- Font detection, Google Fonts download, embedding
- Per-slide visual verification with slide-specific checklists
- Organized export output directory with verification screenshots
- COM process tracking and orphan prevention
- Blank slide master (no theme matching)
- Batch export: process all slides, present results at end
- User-facing summary report (what was exported, what was approximated,
  what couldn't be reproduced)

### Phase 2 (v2): Advanced Features
- **Slide masters:** The agent screenshots all exported slides, analyzes them
  to identify common layout patterns (title slides, content slides, section
  dividers, etc.), and generates PowerPoint slide masters that match. This is
  done by visual analysis of the slides — not by reading theme files — so it
  works regardless of how the SlideKit presentation was authored.
- Gradients, shadows, and advanced effect mapping
- Re-export workflow (incremental updates to existing PPTX)
- Tables (if used in SlideKit)
- Speaker notes

### Phase 3: Polish
- Comprehensive CSS effect coverage
- Animation/transition mapping (Reveal.js fragments → PowerPoint animations)
- Template-based export (populate PowerPoint placeholders instead of
  drawing everything as shapes)

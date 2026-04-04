# SlideKit Design Reference

Code-free reference for AI agents proposing visual directions and planning slide layouts.

---

## 1. What SlideKit Is (and Is Not)

SlideKit is a coordinate-based presentation library rendering on a fixed 1920x1080 canvas. Every element has explicit position and size in pixels. No CSS flexbox, no grid reflow, no responsive scaling.

**Great for:** Consistent visual systems, data-dense slides, diagrams, precise alignment, card grids.

**Not for:** Fluid layouts where unknown-length content should push elements down. Text does not auto-reflow or auto-shrink. Overflow is silent.

SlideKit owns layout (position, size, spatial relationships). You own styling (colors, gradients, shadows, fonts, borders). Runs on Reveal.js for slide navigation.

---

## 2. The Canvas and Safe Zone

**Canvas:** 1920 x 1080 pixels. Origin (0,0) at top-left.

**Safe zone:** 120px inset left/right, 90px inset top/bottom. Usable area: **1680 x 900** starting at **(120, 90)**.

```
+--------------------------------------------------+
|  90px                                            |
|  +--------------------------------------------+  |
|  |  Safe Zone: 1680 x 900                     |  |
|  |  x: 120-1800, y: 90-990                    |  |
|  +--------------------------------------------+  |
|  90px                                            |
+--------------------------------------------------+
  120px                                      120px
```

- All readable content must stay inside the safe zone
- Full-bleed imagery can extend beyond (use the bg layer, which is exempt from checks)

---

## 3. Layer Model

Three layers rendered back-to-front: **bg** (backgrounds, textures, gradient fills), **content** (95% of elements -- text, panels, cards, figures, connectors), **overlay** (callouts, corner brackets, watermarks, framing).

Within a layer, elements stack by declaration order (later = in front), overridable with explicit z-order. Keep overlay sparse -- clarify, not add content.

---

## 4. Typography and Readability Constraints

**Text height is auto-measured** from the DOM when height is omitted. Always prefer this for text elements.

**Minimum font sizes:** Headings 36px+ (recommend 48-96px). Body text 24px+ (recommend 24-32px). Captions/labels 18px+ (recommend 18-24px).

**Line length:** 1680px (safe zone width) works for headings but is too wide for body copy. Max ~1200px for paragraphs.

**Critical constraints:**
- **Text does not auto-shrink or auto-wrap to fit.** Overflow is silent.
- **Width is required on text elements.** Without it, text renders on a single unwrapped line.
- **Vertical chains must fit in 900px.** Each gap adds to total height; the last element must stay at y <= 990.

---

## 5. Spacing System

| Token | Pixels | Typical Use |
|-------|--------|-------------|
| **xs** | 8 | Tight gaps, inline spacing |
| **sm** | 16 | Between related items |
| **md** | 24 | Default gap in stacks, card padding |
| **lg** | 32 | Between sections within a slide |
| **xl** | 48 | Major section breaks |
| **section** | 80 | Between slide regions |

Custom tokens can be added (e.g., compact: 4). **The linter flags gaps below 8px.** Consistent spacing tokens across a deck are one of the biggest factors in professional-looking slides.

---

## 6. Composition Archetypes

| Archetype | Best For | Requires | Avoid When |
|-----------|----------|----------|------------|
| **Split (50/50, 60/40, 70/30)** | Text + image, comparisons, content + visual | Bounded text per column; 24-40px gap; crop-safe images for cover mode | Both columns have dense unpredictable text; narrow 70/30 column can only hold a label or image |
| **Full-Bleed / Hero** | Opening slides, section dividers, emotional impact | 1920x1080 crop-safe image; text contrast via overlay/shadow; image on bg layer | Critical detail at image edges; text readability varies across image |
| **Grid (2x2, 3x2, KPI Tiles)** | Feature comparisons, dashboards, team grids, icon arrays | Similar content length across cards; width = (1680 - gaps) / cols; title < 40 chars for 3-col | Content varies dramatically; more than 6 cards overcrowds |
| **Stacked / Sequential** | Standard content slides, agendas, sequential explanations | Explicit width per element; total height + gaps <= 900px | More than 6-7 vertical items; bullet lists > 5-6 items |
| **Panels (Cards)** | Grouped content, callouts, quote blocks, glass cards | Explicit width; auto-computed height (not fixed); children use "fill" width | Nesting > 2 levels; unpredictable content with fixed height |
| **Image** | Charts, photos, screenshots with captions | Explicit width + height; deliberate `object-fit` mode; 24-40px caption gap | Unknown image dimensions; cover mode with non-crop-safe subjects |
| **Connector Diagrams** | Process flows, architecture, org charts, timelines | Nodes with explicit coords and unique IDs; max ~8-10 nodes | More than 10-12 nodes; many crossing connectors |
| **Typography-Forward** | Quotes, big-number stats, thesis statements | Large fonts (48-96px); generous whitespace; short text (< 20 words) | Text exceeds two lines at intended size |
| **Layered Compositions** | Background shapes behind cards, decorative framing | Clear layer assignment; intentional overlap marked; contrast verified | More than 3-4 overlapping layers |

---

## 7. Image Handling

- **Fit modes:** "contain" (letterbox, full image visible), "cover" (crop-to-fill, edges lost), "fill" (stretch, distorts aspect ratio)
- **Clip-path support** for shaped image crops
- **Captions** positioned below or as overlay, with configurable gap
- **Explicit dimensions required** -- SlideKit does not auto-size containers from image file dimensions
- **Cover mode planning:** Expect edge cropping. Subject must be crop-safe. Communicate positioning expectations in design briefs.
- **Framed images:** Container fill color + padding creates a framed look, useful for screenshots on dark backgrounds

---

## 8. Connector and Diagram Capabilities

**Four connector types:**

| Type | Behavior | Best For |
|------|----------|----------|
| **Straight** | Direct line between anchors | Simple, unobstructed connections |
| **Curved** | Cubic bezier arc | Aesthetic flows, diagonal connections |
| **Elbow** | Right-angle orthogonal path | Flowcharts, org charts, structured diagrams |
| **Orthogonal** | Grid-aligned right-angle with routing | Complex diagrams needing obstacle avoidance |

**Anchor points:** 9 positions per element -- tl, tc, tr, cl, cc, cr, bl, bc, br. First character is row (t/c/b), second is column (l/c/r). Each has an implicit exit direction influencing routing.

**Key features:**
- **Arrows:** none, start, end, or both ends
- **Labels:** placed at any fraction along the path (0=start, 0.5=middle, 1=end)
- **Dash styles:** solid, evenly dashed, dash-dot, dotted
- **Corner radius:** rounded turns on elbow connectors
- **Port spreading:** multiple connectors on one edge auto-distribute to prevent overlap
- **Obstacle avoidance:** elbow/orthogonal connectors route around intervening elements

**Limitation:** Routing is automatic -- no manual waypoints. Curved connectors with center-edge anchors on horizontally-aligned elements appear straight; use corner anchors (tr/tl, br/bl) for visible curvature.

---

## 9. What SlideKit Cannot Do

- **No CSS flexbox/grid behavior** -- layout is coordinate-based, not flow-based
- **No responsive scaling** -- canvas is always 1920x1080
- **No automatic text reflow** -- overflow does not push elements down
- **No automatic equal-height cards** -- heights must be managed explicitly or via stretch alignment
- **No automatic text shrink-to-fit**
- **No animation or transitions within a slide** (Reveal.js handles inter-slide transitions)
- **No embedded video playback controls** (raw HTML video possible but unstyled)
- **No 3D transforms or perspective effects**
- **No SVG drawing primitives** beyond connectors -- use images for complex illustrations
- **No automatic font-size fitting** to containers

---

## 10. Planning Checklist

- [ ] **Text length bounded?** Character limits on titles/subtitles, bullet counts, body word counts
- [ ] **Safe zone respected?** Content within x: 120-1800, y: 90-990 (or intentional full-bleed on bg layer)
- [ ] **Spacing tokens consistent?** Named tokens (xs/sm/md/lg/xl/section) rather than arbitrary pixels
- [ ] **Image crop expectations noted?** Subject positioning for cover mode; letterbox direction for contain
- [ ] **Diagram complexity appropriate?** Max ~8-10 nodes per slide
- [ ] **Layout archetype identified?** Each slide mapped to an archetype with requirements satisfied
- [ ] **Contrast/readability verified?** Text on backgrounds at >= 4.5:1 ratio; semi-transparent fills at opacity >= 0.25
- [ ] **Vertical budget checked?** All elements + gaps in a chain fit within 900px
- [ ] **Text widths explicit?** Every text element has a width; max ~1200px for body copy
- [ ] **Image dimensions explicit?** Every image element has width and height; no auto-sizing from file dimensions

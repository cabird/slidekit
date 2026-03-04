# SlideKit API Reference

> **Current as of:** `66ce7bc` (2026-03-02)

> **Read [OVERVIEW.md](OVERVIEW.md) first** for conceptual understanding — what SlideKit is, why it exists, and how the three-phase pipeline (specification, layout solve, render) works.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Core Elements](#core-elements) — `el`, `group`
3. [Stack Layouts](#stack-layouts) — `vstack`, `hstack`, `cardGrid`
4. [Compound Elements](#compound-elements) — `panel`, `figure`, `connect`
5. [Positioning & Anchors](#positioning--anchors) — anchor system, relative helpers, `getAnchorPoint`
6. [Transforms](#transforms) — alignment, distribution, sizing
7. [Styling](#styling) — CSS pass-through, blocked props, shadow presets, CSS auto-promotion
8. [Spacing](#spacing) — token scale, `resolveSpacing`, `getSpacing`
9. [Connector Routing (Advanced)](#connector-routing-advanced) — routing modes, dash styles
10. [Rendering](#rendering) — `render`, slide definition, `window.sk`
11. [Layout & Validation](#layout--validation) — `layout`, scene graph, warnings, errors
12. [Measurement](#measurement) — `measure`, `clearMeasureCache`
13. [Linting](#linting) — `lintSlide`, `lintDeck`, `LintFinding`
14. [Configuration](#configuration) — `init`, `safeRect`, `splitRect`, `getConfig`
15. [Utilities](#utilities) — `grid`, `snap`, `resolvePercentage`, `repeat`, `rotatedAABB`
16. [Types Reference](#types-reference)

---

## Prerequisites

### Initialization

Before using any SlideKit function, call `init()` to configure the library:

```js
import { init, safeRect } from './slidekit.js';

await init({
  slide: { w: 1920, h: 1080 },
  safeZone: { left: 120, right: 120, top: 90, bottom: 90 },
  minFontSize: 24,
  fonts: [
    { family: 'Inter', weights: [400, 600, 700], source: 'google' },
  ],
});

const safe = safeRect(); // { x: 120, y: 90, w: 1680, h: 900 }
```

### Font Loading

Fonts specified in `init({ fonts })` are preloaded automatically. For Google Fonts, SlideKit injects `<link>` elements into the document head. Each font/weight combination has a 5-second timeout — if loading fails, a warning is emitted and the system font is used as fallback.

### Browser Environment

SlideKit requires a browser environment (DOM) for HTML measurement, font loading, and rendering. It targets Reveal.js as its rendering backend.

---

## Core Elements

### `el(html, props?)`

The single element primitive. Creates a positioned HTML element on the canvas.

```js
el('<p style="font:700 52px/1.1 Inter;color:#fff;text-align:center">Hello World</p>',
  { id: 'title', x: 960, y: 400, w: 800, anchor: 'tc' });
```

**Signature:** `el(html: string, props?: InputProps): ElElement`

**Returns:** `{ id, type: "el", content: html, props, _layoutFlags }`

| Property | Type | Default | Description |
|---|---|---|---|
| `id` | `string` | auto (`sk-N`) | Unique element identifier |
| `x` | `PositionValue` | `0` | X position (number, percentage string, or RelMarker) |
| `y` | `PositionValue` | `0` | Y position (number, percentage string, or RelMarker) |
| `w` | `SizeValue` | — | Width in pixels (or percentage string, or `"fill"` in panels). Auto-measured from content if omitted. |
| `h` | `SizeValue` | — | Height in pixels (or percentage string). Auto-measured from content if omitted. |
| `maxW` | `number` | — | Maximum width constraint |
| `maxH` | `number` | — | Maximum height constraint |
| `anchor` | `AnchorPoint` | `"tl"` | Anchor point — see [Anchor System](#anchor-system) |
| `layer` | `LayerName` | `"content"` | Render layer: `"bg"`, `"content"`, or `"overlay"` |
| `valign` | `VAlign` | `"top"` | Vertical alignment of content within the element's box: `"top"`, `"center"`, `"bottom"` |
| `opacity` | `number` | `1` | Element opacity (0–1) |
| `rotate` | `number` | — | Rotation in degrees |
| `overflow` | `OverflowPolicy` | `"visible"` | Overflow policy (see below) |
| `shadow` | `string` | — | Shadow preset name or CSS `box-shadow` value. Resolved via `resolveShadow()`. |
| `z` | `number` | — | Explicit z-order within the same layer (higher = in front) |
| `allowOverlap` | `boolean` | `false` | When `true`, the linter skips overlap checks involving this element |
| `style` | `object` | `{}` | CSS pass-through properties (applied to the container div) |
| `className` | `string` | `""` | CSS class name(s) |

**Overflow policies (`OverflowPolicy`):**

| Value | Behavior |
|---|---|
| `"visible"` | Renders fully, no warning (default) |
| `"warn"` | Emits a warning if content overflows |
| `"clip"` | Sets CSS `overflow: hidden` on the element |
| `"error"` | Produces an error if content overflows |

**How `el()` replaces the v1 primitives:**

- **Text:** `el('<p style="font:700 52px Inter;color:#fff">Title</p>', { x, y, w })`
- **Images:** `el('<img src="photo.jpg" style="width:100%;height:100%;object-fit:cover">', { x, y, w, h })`
- **Rectangles:** `el('', { x, y, w, h, style: { background: '#1a1a3e', borderRadius: '12px' } })`
- **Rules/dividers:** `el('', { x, y, w: 80, h: 3, style: { background: '#7c5cbf' } })`

> ⚠️ **Anti-pattern:** Don't put CSS properties like `fontSize` or `textAlign` at the element top level — put them inside `style: {}`. The library auto-promotes them with a warning, but the linter will flag it as `misplaced-css-prop`.
> ```js
> // ❌ el('text', { w: 340, textAlign: 'right' });
> // ✅ el('text', { w: 340, style: { textAlign: 'right' } });
> ```

> ⚠️ **Anti-pattern:** Omitting `w` on text elements does **not** collapse to zero — `measure()` computes the natural (unconstrained) width, so the text renders on a single long line without wrapping. This is fine for short labels but long text may overflow the slide. Always set `w` explicitly for paragraph text or use `w: 'fill'` inside a container to get proper line wrapping.

> ℹ️ **Note:** Use the element prop `overflow` (e.g., `{ overflow: 'clip' }`), not CSS `style: { overflow: 'hidden' }`. CSS overflow properties are blocked by `filterStyle()` — see [Blocked Properties](#blocked-properties).

> ✅ **Pattern:** Use `layer: 'bg'` for full-bleed backgrounds and `layer: 'overlay'` for decorative edge elements (corner brackets, framing). Both layers are exempt from safe-zone content rules.

---

### `group(children, props?)`

Creates a container that gives its children a shared coordinate origin. Moving the group moves everything inside it.

**Signature:** `group(children: SlideElement[], props?: InputProps): GroupElement`

**Returns:** `{ id, type: "group", children, props, _layoutFlags }`

| Property | Type | Default | Description |
|---|---|---|---|
| `scale` | `number` | `1` | Scale factor |
| `clip` | `boolean` | `false` | Whether to clip children to group bounds |
| `bounds` | `BoundsMode` | — | Set to `"hug"` to auto-compute w/h from children's bounding box |

Plus all [common properties](#common-properties).

#### `bounds: 'hug'`

When set, the group's width and height are automatically computed from the bounding box of its children during layout Phase 1. Children with unresolved `_rel` markers are skipped. Compound groups (panels, figures) are also skipped — they manage their own sizing.

> ✅ **Pattern:** Use `bounds: 'hug'` when the group is a logical container whose size should be derived from its content. The linter suppresses `child-overflow` for hug groups since their bounds are intrinsic.

> ⚠️ **Anti-pattern:** Don't create groups without dimensions *or* `bounds: 'hug'` when using them as layout containers — the group defaults to 0×0 and children may be invisible.
> ```js
> // ❌ group([vstack([...])], { id: 'main', x: 200, y: 200 });
> // ✅ group([vstack([...])], { id: 'main', x: 200, y: 200, w: 1400, h: 600 });
> ```

> ✅ **Pattern:** Children inside a group use group-relative coordinates (origin at group's top-left). When the group moves, all children move with it — no need to update individual positions.

---

### Common Properties

All element types share these properties via `COMMON_DEFAULTS`:

| Property | Type | Default | Description |
|---|---|---|---|
| `id` | `string` | auto (`sk-N`) | Unique identifier. Auto-generated if not provided. |
| `x` | `PositionValue` | `0` | X position on the 1920×1080 canvas |
| `y` | `PositionValue` | `0` | Y position (or a relative positioning marker) |
| `anchor` | `AnchorPoint` | `"tl"` | Which point of the element sits at (x, y) |
| `layer` | `LayerName` | `"content"` | Render layer: `"bg"`, `"content"`, `"overlay"` |
| `opacity` | `number` | `1` | Element opacity (0–1) |
| `valign` | `VAlign` | `"top"` | Vertical alignment of content within the element's box |
| `style` | `object` | `{}` | CSS pass-through properties (fresh object per element) |
| `className` | `string` | `""` | CSS class name(s) to apply |
| `shadow` | `string` | — | Shadow preset name or CSS `box-shadow` value |
| `z` | `number` | — | Explicit z-order within the same layer |
| `maxW` | `number` | — | Maximum width constraint |
| `maxH` | `number` | — | Maximum height constraint |
| `rotate` | `number` | — | Rotation in degrees |

---

## Stack Layouts

Stack primitives arrange children in a vertical or horizontal sequence. They resolve to absolute coordinates during layout — they're syntactic sugar over the coordinate system, not CSS flexbox.

> **Recommended pattern:** Use `vstack` as the primary building block for text columns. See [vstack-First Pattern](#vstack-first-pattern).

> ✅ **Pattern:** Use `vstack`/`hstack` for layout instead of manually computing `x`/`y` with `below()`/`rightOf()` chains. Stacks are cleaner, reorderable, and less fragile.

> ⚠️ **Anti-pattern:** Relative positioning (`below()`, `rightOf()`) on stack children is ignored — the stack controls child positions. A `ignored_rel_on_stack_child` warning is emitted. Remove the relative positioning or move the element outside the stack.

### `vstack(items, props?)`

Stacks items vertically (top to bottom) with configurable gap and alignment.

**Signature:** `vstack(items: SlideElement[], props?: InputProps): VStackElement`

**Returns:** `{ id, type: "vstack", children, props, _layoutFlags }`

| Property | Type | Default | Description |
|---|---|---|---|
| `gap` | `number \| string` | `0` | Vertical gap between items (px or [spacing token](#spacing)) |
| `align` | `HAlign` | `"left"` | Cross-axis (horizontal) alignment: `"left"`, `"center"`, `"right"`, `"stretch"` |
| `vAlign` | `VAlign` | `"top"` | Main-axis (vertical) alignment: `"top"`, `"center"`, `"bottom"`. Positions the content block within the stack's height. Requires explicit `h` on the vstack; ignored when height is auto-computed from children. |

Plus all [common properties](#common-properties). If the stack has `w` and a child lacks `w`, the child inherits the stack's width.

### `hstack(items, props?)`

Stacks items horizontally (left to right) with configurable gap and alignment.

**Signature:** `hstack(items: SlideElement[], props?: InputProps): HStackElement`

**Returns:** `{ id, type: "hstack", children, props, _layoutFlags }`

| Property | Type | Default | Description |
|---|---|---|---|
| `gap` | `number \| string` | `0` | Horizontal gap between items (px or [spacing token](#spacing)) |
| `align` | `HStackAlign` | `"top"` | Cross-axis (vertical) alignment: `"top"`, `"middle"`, `"bottom"`, `"stretch"` |
| `hAlign` | `string` | `"left"` | Main-axis (horizontal) alignment: `"left"`, `"center"`, `"right"`. Positions the content block within the stack's width. Requires explicit `w` on the hstack; ignored when width is auto-computed from children. |

Plus all [common properties](#common-properties).

#### Main-Axis Alignment (`vAlign` / `hAlign`)

The `align` property controls cross-axis alignment (perpendicular to the stacking direction). The `vAlign` and `hAlign` properties control main-axis alignment (along the stacking direction) — positioning the entire content block within the stack's explicit dimension.

```js
// Center content vertically in a 600px tall vstack
vstack([
  el('<p>Line 1</p>', { w: 400 }),
  el('<p>Line 2</p>', { w: 400 }),
], { h: 600, vAlign: 'center', gap: 16 });

// Right-align content horizontally in a 1000px wide hstack
hstack([
  el('A', { w: 100, h: 50 }),
  el('B', { w: 100, h: 50 }),
], { w: 1000, hAlign: 'right', gap: 20 });
```

> **Important:** `vAlign` requires an explicit `h` on the vstack (and `hAlign` requires an explicit `w` on the hstack). When the stack's size is auto-computed from children, there is no slack to shift content, so the property is a no-op.

> **Backward compatibility:** Both `vAlign` and `hAlign` default to their start positions (`'top'` and `'left'` respectively). Existing stacks without these properties are unaffected.

> **Combined usage:** `align` (cross-axis) and `vAlign`/`hAlign` (main-axis) are orthogonal and can be used together. For example, `vstack([...], { h: 600, w: 800, align: 'center', vAlign: 'center' })` centers children both horizontally and vertically.

#### `align: 'stretch'`

Makes all children the same size along the cross axis:

- **vstack with `align: 'stretch'`** — all children get the same **width** (widest child, or the stack's authored `w`). Auto-height `el()` children are re-measured at the new width so text reflows correctly.
- **hstack with `align: 'stretch'`** — all children get the same **height** (tallest child, or the stack's authored `h`).

If a child has an explicit size that differs from the stretch target, a `stretch_override` warning is emitted.

> ✅ **Pattern:** Use `hstack({ align: 'stretch' })` for equal-height card layouts — it equalizes all children to the tallest child's height, preventing ragged bottom edges.

### `cardGrid(items, opts?)`

Arranges items in a grid pattern using nested vstack/hstack. Each row is an `hstack` with `align: 'stretch'`. Returns the outer `vstack` (rows are `hstack`s).

**Signature:** `cardGrid(items: SlideElement[], opts?: CardGridOptions): VStackElement`

| Property | Type | Default | Description |
|---|---|---|---|
| `id` | `string` | auto | ID for the outer vstack |
| `cols` | `number` | `2` | Columns per row |
| `gap` | `number \| string` | `0` | Gap between items in both directions (px or spacing token) |
| `x` | `number` | `0` | X position |
| `y` | `number` | `0` | Y position |
| `w` | `number` | — | Width |
| `anchor` | `AnchorPoint` | — | Anchor point |
| `layer` | `LayerName` | — | Render layer |
| `style` | `object` | — | Style overrides |

Row hstacks are assigned IDs `{id}-row-0`, `{id}-row-1`, etc.

#### vstack-First Pattern

**Prefer `vstack` over chained `below()` for text columns:**

```js
// ❌ Chained below() — verbose, fragile
el(eyebrow, { id: 's2-eyebrow', x: 120, y: 310, w: 880 });
el(headline, { id: 's2-headline', x: 120, y: below('s2-eyebrow', { gap: 'md' }), w: 880 });

// ✅ vstack — cleaner, reorderable
vstack([
  el(eyebrow, { w: 880 }),
  el(headline, { w: 880 }),
], { id: 's2-text', x: 120, y: 310, gap: 'md' });
```

> ⚠️ **Anti-pattern:** The linter cannot resolve child positions inside `hstack()`/`cardGrid()`. For lint-friendly multi-column layouts, compute positions explicitly with `splitRect()` or manual arithmetic. See [Pro Pattern 4 in the Authoring Guide](AI_AUTHORING_GUIDE.md).
> ```js
> // ❌ Linter sees all children at same position → false overlap errors
> hstack([panel([...]), panel([...])], { gap: 20 });
> // ✅ Explicit positions — linter resolves each panel
> panel([...], { x: 120, y: 200, w: 520 });
> panel([...], { x: 700, y: 200, w: 520 });
> ```

---

## Compound Elements

### `panel(children, props?)`

Creates a visual container with a background, padding, and vertically stacked children. Internally creates a `group` containing a background `el('')` and a `vstack` of children.

**Signature:** `panel(children: SlideElement[], props?: PanelInputProps): PanelElement`

| Property | Type | Default | Description |
|---|---|---|---|
| `children` | `SlideElement[]` | — | Child elements |
| `padding` | `number \| string` | `24` | Internal padding (px or spacing token) |
| `gap` | `number \| string` | `16` | Vertical gap between children (px or spacing token) |
| `w` | `number` | — | Panel width |
| `h` | `number` | — | Panel height (auto-computed from children if omitted) |
| `fill` | `string` | — | Background color/gradient (maps to CSS `background`) |
| `radius` | `number \| string` | — | Border radius (number → px, string → pass through) |
| `border` | `string` | — | CSS border shorthand |
| `vAlign` | `VAlign` | `"top"` | Main-axis (vertical) alignment of panel content: `"top"`, `"center"`, `"bottom"`. Passed through to the internal vstack. Requires explicit `h` on the panel. |

Plus all [common properties](#common-properties).

> ℹ️ **Measurement note:** Panel content is measured at the full render width, not at the panel's own width. This can cause text wrapping differences in narrow panels — content may measure taller or shorter than it renders when the panel width differs significantly from the slide width. For best results, set explicit `w` on text children inside narrow panels.

> ℹ️ **Measurement note (continued):** Children with `w: "fill"` have their width set to `panelWidth - 2 * padding`.

> ✅ **Pattern:** Panel children inherit the panel's coordinate space — their `x`/`y` are relative to the panel's content area (after padding). You don't need to account for the panel's own position.

> ⚠️ **Anti-pattern:** Avoid `w: 'fill'` in nested panels — the inner panel's `fill` resolves before the outer panel sets its width, producing incorrect dimensions. Use explicit pixel widths for nested panels instead.

> ✅ **Pattern:** When `panel([child1, child2])` generates false-positive linter overlaps, flatten to a single `el()` with inline HTML:
> ```js
> // Instead of panel with children, use one el with inline layout
> el(`<div style="background:#1a1a2e;padding:16px;border-radius:8px;">
>   <p>${quote}</p><p style="margin-top:10px;">${attribution}</p>
> </div>`, { id: 'quote', x: 120, y: 200, w: 800 })
> ```

#### Panel Overflow Warnings

When a panel has an explicit `h` and its content exceeds that height, a `panel_overflow` warning is emitted. **Fix:** Remove the explicit `h` to let the panel auto-size, or increase `h`.

---

### `figure(opts?)`

Creates a figure element: a background container with an image and optional caption.

**Signature:** `figure(opts?: FigureInputProps): FigureElement`

**Returns:** A group containing `{id}-bg` (background rect), `{id}-img` (image element), and optionally `{id}-caption`.

| Property | Type | Default | Description |
|---|---|---|---|
| `id` | `string` | auto | Figure ID |
| `src` | `string` | `""` | Image source URL |
| `x` | `number` | `0` | X position |
| `y` | `number` | `0` | Y position |
| `w` | `number` | `0` | Container width |
| `h` | `number` | `0` | Container height |
| `anchor` | `AnchorPoint` | `"tl"` | Anchor point |
| `layer` | `LayerName` | `"content"` | Render layer |
| `containerFill` | `string` | `"transparent"` | Background fill color/gradient |
| `containerRadius` | `number \| string` | `0` | Border radius (number → px, string → pass through) |
| `containerPadding` | `number \| string` | `0` | Padding around the image (px or spacing token) |
| `caption` | `string` | — | Optional HTML caption string |
| `captionGap` | `number \| string` | `0` | Gap between container bottom and caption (px or spacing token) |
| `fit` | `string` | `"contain"` | CSS `object-fit` for the image |
| `style` | `object` | `{}` | Additional style for the group container |

> ⚠️ **Anti-pattern:** Don't guess image container dimensions — render first, read `img.naturalWidth`/`img.naturalHeight` from the DOM, then compute exact container size so `object-fit: contain` is a no-op.

> ⚠️ **Anti-pattern:** Avoid `anchor: 'tc'` on `figure()` compounds — the linter resolves children at raw group-relative coordinates and reports false overflow/overlap. Use `anchor: 'tl'` and manually compute centered x: `x: 960 - w/2`.

---

### `connect(fromId, toId, props?)`

Creates a connector line between two elements. Rendered as SVG with optional arrowheads and labels. Endpoints are resolved during layout Phase 4.

**Signature:** `connect(fromId: string, toId: string, props?: ConnectorInputProps): ConnectorElement`

**Returns:** `{ id, type: "connector", props, _layoutFlags }`

| Property | Type | Default | Description |
|---|---|---|---|
| `id` | `string` | auto (`sk-N`) | Unique connector identifier |
| `type` | `ConnectorType` | `"straight"` | `"straight"`, `"curved"`, or `"elbow"` |
| `arrow` | `ArrowType` | `"end"` | `"none"`, `"start"`, `"end"`, or `"both"` |
| `color` | `string` | `"#ffffff"` | Line color |
| `thickness` | `number` | `2` | Line thickness in pixels |
| `dash` | `string \| null` | `null` | SVG stroke-dasharray string (e.g., `"5 5"`, `"10 4 2 4"`) or `null` for solid |
| `fromAnchor` | `AnchorPoint` | `"cr"` | Anchor point on the source element |
| `toAnchor` | `AnchorPoint` | `"cl"` | Anchor point on the target element |
| `label` | `string \| null` | `null` | Text label at the midpoint |
| `labelStyle` | `object` | `{}` | `{ size, color, font, weight }` for the label |
| `layer` | `LayerName` | `"content"` | Render layer |
| `opacity` | `number` | `1` | Opacity |

**Connector types:**
- `"straight"` — direct line between anchor points
- `"curved"` — cubic bézier with 40% offset along the dominant axis
- `"elbow"` — right-angle orthogonal path via `routeConnector()`

> ✅ **Pattern:** For visible curves, use corner anchors (`tr`→`tl`, `br`→`bl`) instead of center-edge anchors (`cr`→`cl`). Center-edge anchors on horizontally-aligned elements produce collinear control points, making curves look like straight lines.
> ```js
> // ❌ Curve degenerates to straight line when boxes are horizontally aligned
> connect('a', 'b', { type: 'curved', fromAnchor: 'cr', toAnchor: 'cl' });
> // ✅ Corner anchors produce visible curves
> connect('a', 'b', { type: 'curved', fromAnchor: 'tr', toAnchor: 'tl' });
> ```

> ✅ **Pattern:** For elbow connectors routing backward (target is behind source), the library auto-selects U-route channels with proportional sizing (`Math.max(60, span * 0.3)`). No manual configuration needed.

**Common dash patterns:**
- `"5 5"` — evenly dashed
- `"10 4 2 4"` — dash-dot
- `"2 4"` — dotted

> ⚠️ **Anti-pattern:** The `dash` property expects an SVG `stroke-dasharray` string (e.g., `"5 5"`), not a comma-separated CSS string like `"6,4"`. Incorrect format silently produces a solid line.

---

## Positioning & Anchors

### Anchor System

Every element has an `anchor` property that controls what `(x, y)` refers to:

```
tl --- tc --- tr
|              |
cl     cc     cr
|              |
bl --- bc --- br
```

- **First character:** row — `t` (top), `c` (center), `b` (bottom)
- **Second character:** column — `l` (left), `c` (center), `r` (right)

**Valid anchors (`VALID_ANCHORS`):** `"tl"`, `"tc"`, `"tr"`, `"cl"`, `"cc"`, `"cr"`, `"bl"`, `"bc"`, `"br"`

> ✅ **Pattern:** Anchor + offset is the standard positioning approach. Use `anchor: 'tc'` with `x: 960` to center-align on the slide, or `anchor: 'tl'` with `x: safe.x` to left-align at the safe zone edge. This is more readable and maintainable than computing offsets from the element's width.

#### `resolveAnchor(x, y, w, h, anchor)`

Converts anchor-relative coordinates to CSS top-left position.

**Signature:** `resolveAnchor(x: number, y: number, w: number, h: number, anchor: AnchorPoint): { left: number, top: number }`

**Throws** if `anchor` is not a valid anchor string.

#### `getAnchorPoint(bounds, anchor)`

Computes pixel coordinates and direction vector for an anchor point on a bounding rectangle.

**Signature:** `getAnchorPoint(bounds: Rect, anchor: AnchorPoint | string): AnchorPointResult`

**Returns:** `{ x, y, dx, dy }` — the point coordinates and outward direction vector.

```js
const point = getAnchorPoint({ x: 100, y: 200, w: 400, h: 300 }, 'cr');
// { x: 500, y: 350, dx: 1, dy: 0 }
```

---

### Relative Positioning Helpers

Position elements relative to each other. These functions return deferred markers (`RelMarker` objects) resolved during layout via dependency graph with topological sort. Circular dependencies are detected and reported as errors.

```js
el('<p>Subtitle</p>', { y: below('title', { gap: 24 }), w: 800 });
el('', { x: rightOf('sidebar', { gap: 40 }), y: alignTopWith('sidebar'), w: 400 });
```

> Relative positioning markers are only valid on `x` and `y` properties. Using them on `w` or `h` produces an error.

#### Position Helpers

| Function | Signature | Returns | Resolves To |
|---|---|---|---|
| `below(refId, opts?)` | `(refId: string, opts?: { gap?: number \| string }) → RelMarker` | `{ _rel: "below", ref, gap }` | Y = ref's bottom edge + gap |
| `above(refId, opts?)` | `(refId: string, opts?: { gap?: number \| string }) → RelMarker` | `{ _rel: "above", ref, gap }` | Y = ref's top edge − element's height − gap |
| `rightOf(refId, opts?)` | `(refId: string, opts?: { gap?: number \| string }) → RelMarker` | `{ _rel: "rightOf", ref, gap }` | X = ref's right edge + gap |
| `leftOf(refId, opts?)` | `(refId: string, opts?: { gap?: number \| string }) → RelMarker` | `{ _rel: "leftOf", ref, gap }` | X = ref's left edge − element's width − gap |

#### Alignment Helpers

| Function | Signature | Returns | Resolves To |
|---|---|---|---|
| `centerVWith(refId)` | `(refId: string) → RelMarker` | `{ _rel: "centerV", ref }` | Y centers element vertically with ref |
| `centerHWith(refId)` | `(refId: string) → RelMarker` | `{ _rel: "centerH", ref }` | X centers element horizontally with ref |
| `alignTopWith(refId)` | `(refId: string) → RelMarker` | `{ _rel: "alignTop", ref }` | Y = ref's top edge |
| `alignBottomWith(refId)` | `(refId: string) → RelMarker` | `{ _rel: "alignBottom", ref }` | Y = ref's bottom edge − element's height |
| `alignLeftWith(refId)` | `(refId: string) → RelMarker` | `{ _rel: "alignLeft", ref }` | X = ref's left edge |
| `alignRightWith(refId)` | `(refId: string) → RelMarker` | `{ _rel: "alignRight", ref }` | X = ref's right edge − element's width |

**Axis rule:** `alignTopWith` / `alignBottomWith` / `centerVWith` → Y axis. `alignLeftWith` / `alignRightWith` / `centerHWith` → X axis.

> ⚠️ **Anti-pattern:** Don't cross axes — using `alignTopWith()` (which returns a Y value) as an X coordinate silently produces wrong positions. Match the helper to the axis:
> ```js
> // ❌ el('box', { x: alignTopWith('ref'), y: 200 });
> // ✅ el('box', { x: alignLeftWith('ref'), y: alignTopWith('ref') });
> ```

> ✅ **Pattern:** Use `centerVWith(refId)` to vertically center a label next to a taller element (not `alignTopWith`, which top-aligns and looks unbalanced when heights differ).

#### `placeBetween(topRef, bottomYOrRef, options?)`

Positions an element vertically between two references.

**Signature:** `placeBetween(topRef: string, bottomYOrRef: number | string, opts?: { bias?: number }): RelMarker`

| Param | Type | Default | Description |
|---|---|---|---|
| `topRef` | `string` | — | ID of the element above (uses its bottom edge) |
| `bottomYOrRef` | `string \| number` | — | ID of element below (uses its top edge), or a raw Y pixel value |
| `options.bias` | `number` | `0.35` | 0.0 = flush with top, 1.0 = flush with bottom, 0.35 = biased toward top |

> ⚠️ **Anti-pattern:** `placeBetween` falls back silently when the element doesn't fit. If element height exceeds the gap between references, it overlaps. Always ensure `gap ≥ element height + padding`. Check for `between_no_fit` warnings in the layout result.
> ```js
> // ❌ 70px element in a 24px gap → overlap
> el('E', { y: placeBetween('A', 'B'), h: 70 });
> // ✅ Ensure references have enough space
> el('B', { y: below('A', { gap: 150 }) });
> el('E', { y: placeBetween('A', 'B'), h: 70 }); // fits
> ```

#### `centerIn(rect)`

Centers an element within a rectangle. Works on both axes.

**Signature:** `centerIn(rect: Rect): { x: RelMarker, y: RelMarker }`

```js
const safe = safeRect();
el('<p>Centered</p>', { ...centerIn(safe), w: 400 });
```

---

## Transforms

PowerPoint-style alignment and distribution operations. Placed in the `transforms` array of a slide definition, applied during layout Phase 3.

All transform functions return `TransformMarker`: `{ _transform, _transformId, ids, options }`.

> ⚠️ **Anti-pattern:** Transforms only move the elements you explicitly list. If you distribute containers but not their labels/dots, the labels stay behind. Group related elements first, then transform the groups:
> ```js
> // ❌ distributeH(['container-1', 'container-2']) — labels orphaned
> // ✅ Wrap each container+label in a group, then distribute the groups
> group([container1, label1], { id: 'g1' });
> group([container2, label2], { id: 'g2' });
> transforms: [distributeH(['g1', 'g2'])]
> ```

### Alignment Functions

| Function | Behavior | `options.to` Default |
|---|---|---|
| `alignLeft(ids, options?)` | Aligns left edges | Min left edge |
| `alignRight(ids, options?)` | Aligns right edges | Max right edge |
| `alignTop(ids, options?)` | Aligns top edges | Min top edge |
| `alignBottom(ids, options?)` | Aligns bottom edges | Max bottom edge |
| `alignCenterH(ids, options?)` | Aligns horizontal centers | Average horizontal center |
| `alignCenterV(ids, options?)` | Aligns vertical centers | Average vertical center |

**Signature (all):** `(ids: string[], options?: { to?: number }): TransformMarker`

All accept `options.to` (number) to specify an explicit alignment target.

### Distribution Functions

#### `distributeH(ids, options?)`

Distributes elements horizontally with equal gaps.

**Signature:** `distributeH(ids: string[], options?: { startX?: number, endX?: number, mode?: string }): TransformMarker`

| Option | Type | Default | Description |
|---|---|---|---|
| `startX` | `number` | leftmost left edge | Start of distribution range |
| `endX` | `number` | rightmost right edge | End of distribution range |
| `mode` | `string` | `"equal-gap"` | `"equal-gap"` or `"equal-center"` |

#### `distributeV(ids, options?)`

Same as `distributeH` but vertical. Uses `startY`, `endY`.

> ⚠️ **Anti-pattern:** `distributeH`/`distributeV` with fewer than 2 elements silently does nothing. Always pass at least 2 element IDs.

### Size Matching Functions

| Function | Signature | Behavior |
|---|---|---|
| `matchWidth(ids)` | `(ids: string[]) → TransformMarker` | Sets all widths to the maximum width |
| `matchHeight(ids)` | `(ids: string[]) → TransformMarker` | Sets all heights to the maximum height |
| `matchSize(ids)` | `(ids: string[]) → TransformMarker` | Sets both dimensions to the respective maximums |

### `fitToRect(ids, rect)`

Scales and centers a group of elements to fit within a target rectangle, preserving aspect ratio.

**Signature:** `fitToRect(ids: string[], rect: Rect): TransformMarker`

---

## Styling

### CSS Pass-Through

The `style` property on any element accepts CSS properties that are passed through to the rendered DOM container. SlideKit owns layout (position, size, spatial relationships); you own styling (colors, gradients, shadows, fonts, borders, animations).

> ✅ **Pattern:** `textAlign` should match the positioning direction. When using `leftOf()`, add `style: { textAlign: 'right' }` so text hugs the reference. When using `rightOf()`, the default `textAlign: 'left'` is correct.

```js
el('', {
  x: 200, y: 300, w: 500, h: 280,
  style: {
    background: 'linear-gradient(135deg, #1a1a3e, #2a2a5e)',
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
  },
});
```

### Convenience Property Mapping

Element props support shorthand convenience properties that map to CSS equivalents. These are applied to the rendered container alongside `style` properties.

| Prop        | CSS Equivalent       |
|-------------|---------------------|
| `color`     | `color`             |
| `font`      | `fontFamily`        |
| `size`      | `fontSize` (+ "px") |
| `weight`    | `fontWeight`        |
| `fill`      | `background`        |
| `radius`    | `borderRadius`      |
| `border`    | `border`            |
| `align`     | `textAlign`         |
| `shadow`    | `boxShadow`         |

If both a convenience prop and `style` specify the same CSS property, `style` wins.

Text-specific convenience properties: `font`, `size`, `weight`, `color`, `lineHeight`, `letterSpacing`, `align`, `overflow`, `maxLines`, `fit`.

### Blocked Properties

These CSS properties are blocked from the `style` pass-through because they conflict with SlideKit's positioning system. Using a blocked property emits a warning with a prescriptive suggestion.

**Layout positioning:** `position`, `top`, `left`, `right`, `bottom`, `inset`, `insetBlock`, `insetBlockStart`, `insetBlockEnd`, `insetInline`, `insetInlineStart`, `insetInlineEnd`

**Sizing:** `width`, `height`, `minWidth`, `maxWidth`, `minHeight`, `maxHeight`, `blockSize`, `inlineSize`, `minBlockSize`, `maxBlockSize`, `minInlineSize`, `maxInlineSize`

**Display:** `display`

**Overflow:** `overflow`, `overflowX`, `overflowY`, `overflowBlock`, `overflowInline`

**Margin:** `margin`, `marginTop`, `marginRight`, `marginBottom`, `marginLeft`, `marginBlock`, `marginBlockStart`, `marginBlockEnd`, `marginInline`, `marginInlineStart`, `marginInlineEnd`

**Transform:** `transform`, `translate`, `rotate`, `scale`

**Containment:** `contain`, `contentVisibility`

Vendor-prefixed variants of all blocked properties are also blocked.

### `filterStyle(style?, elementType?)`

Filters a style object, removing blocked properties.

**Signature:** `filterStyle(style?: Record<string, unknown>, elementType?: string): StyleFilterResult`

**Returns:** `{ filtered, warnings }` — filtered CSS object and warning objects about blocked properties. Each warning includes `type`, `property`, `originalProperty`, `value`, and `suggestion`.

### CSS Auto-Promotion (`detectMisplacedCssProps`)

SlideKit detects CSS properties accidentally placed at the top level of an element's props (instead of inside `style: { ... }`), auto-promotes them, and emits a warning.

**Signature:** `detectMisplacedCssProps(props: Record<string, unknown>): { cssProps: Record<string, unknown>, warnings: Array<Record<string, unknown>> }`

**`CSS_LIKE_PROPS`** — a `ReadonlySet<string>` of CSS property names (camelCase) that trigger auto-promotion. Includes: `textAlign`, `fontSize`, `fontFamily`, `fontWeight`, `background`, `backgroundColor`, `border`, `borderRadius`, `boxShadow`, `padding`, `lineHeight`, `letterSpacing`, `whiteSpace`, `textDecoration`, `textTransform`, `cursor`, `visibility`, and more.

> ⚠️ **Anti-pattern:** Don't rely on auto-promotion as a feature — it exists to catch mistakes. Always write CSS properties inside `style: {}` from the start. A future `misplaced-css-prop` lint rule will flag this statically before render.

### Shadow Presets

#### `SHADOWS` constant

```ts
export const SHADOWS = {
  sm:   "0 1px 3px rgba(0,0,0,0.2)",
  md:   "0 4px 12px rgba(0,0,0,0.3)",
  lg:   "0 8px 32px rgba(0,0,0,0.4)",
  xl:   "0 16px 48px rgba(0,0,0,0.5)",
  glow: "0 0 40px rgba(124,92,191,0.3)",
} as const;
```

**`ShadowPreset`** — type alias: `keyof typeof SHADOWS` (i.e., `"sm" | "md" | "lg" | "xl" | "glow"`).

> ⚠️ **Anti-pattern:** Glow shadows (`shadow: 'glow'`) are only visible on dark backgrounds. Unlike regular shadows that appear on light surfaces, glows need a dark backdrop behind the element.

#### `resolveShadow(value)`

Resolves a shadow preset name to its CSS value. If `value` is not a preset name, returns it unchanged.

**Signature:** `resolveShadow(value: string): string`

#### `getShadowPresets()`

Returns a shallow copy of the shadow presets map.

**Signature:** `getShadowPresets(): Record<string, string>`

### Baseline CSS

SlideKit injects a baseline stylesheet inside every `el()` container that:

1. Neutralizes inherited styles from host frameworks (Reveal.js, etc.)
2. Ensures `measure()` and `render()` produce identical results
3. Provides predictable defaults for presentation content

**Key baseline defaults:**

| Property | Value | Why |
|---|---|---|
| `text-align` | `left` | Prevents framework `text-align: center` inheritance |
| `line-height` | `1.2` | Stable across browsers |
| `font-weight` | `400` | Prevents theme heading-weight inheritance |
| `margin` on all elements | `0` | Prevents framework margins shifting content |
| `font: inherit` on headings | (inherits) | Prevents theme heading font-size/weight overrides |
| `max-width/max-height` on media | `none` | Prevents responsive image shrinking |

User inline styles always win over the baseline.

> ✅ **Pattern:** For text on semi-transparent colored backgrounds, use opacity ≥ 0.25. Opacity 0.15 consistently fails contrast checks (the linter flags contrast ratios below 4.5:1).

### Theme CSS

SlideKit elements can reference CSS classes via the `className` property. These classes must exist in a loaded stylesheet (via `<link>` tag or inline `<style>` block).

**The CSS-Only Rule:** Theme CSS files should contain **only visual styling properties** — backgrounds, gradients, colors, borders, shadows, typography, filters, animations, transitions, and CSS custom properties. They should **never** contain layout properties (`position`, `display`, `width`, `height`, `margin`, `padding`, `flex`, `grid`). SlideKit strips layout properties from inline styles with warnings, but class-based layout properties apply silently and conflict with SlideKit's positioning.

```js
// className must match a class in a loaded stylesheet
el("", { x: 100, y: 200, w: 400, h: 300, className: "glass-card" });

// Multiple classes
el("", { x: 100, y: 200, w: 400, h: 300, className: "glass-card glow-accent" });
```

---

## Spacing

### Token Scale

SlideKit includes a built-in spacing scale usable anywhere a gap or padding value is accepted.

**`DEFAULT_SPACING` constant:**

| Token | Pixels | Typical Use |
|---|---|---|
| `"xs"` | 8 | Tight inner spacing |
| `"sm"` | 16 | Compact gaps |
| `"md"` | 24 | Standard gap |
| `"lg"` | 32 | Generous gap |
| `"xl"` | 48 | Section-level spacing |
| `"section"` | 80 | Major section breaks |

```js
vstack([...], { gap: 'md' });                  // 24px gap
panel([...], { padding: 'lg', gap: 'sm' });    // 32px padding, 16px gap
```

The scale is customizable via `init({ spacing: { ... } })`. Custom tokens merge with defaults.

> ✅ **Pattern:** Use spacing tokens (`'xs'`, `'sm'`, `'md'`, etc.) instead of magic pixel numbers. This makes gaps consistent across slides and easier to adjust globally. The linter flags gaps below 8px (`gap-too-small`).

> ⚠️ **Anti-pattern:** Don't use gaps smaller than `xs` (8px) between text elements — they fail readability checks and the linter will flag them. A 6px gap between stat numbers and labels is too tight; 10px+ improves readability.

### `resolveSpacing(value)`

The core spacing resolver. Resolves a spacing token name or raw pixel number to a concrete pixel number.

**Signature:** `resolveSpacing(value: number | string | undefined | null): number | undefined | null`

- Numbers pass through unchanged
- Strings are looked up in the active spacing scale → returns a `number`
- `undefined` / `null` pass through unchanged (callers handle their own defaults)
- Unknown token names throw with a list of available tokens

### `getSpacing(token)`

Public API for resolving a spacing token. Delegates to `resolveSpacing`.

**Signature:** `getSpacing(token: number | string): number`

```js
getSpacing('md');  // 24
getSpacing('xl');  // 48
getSpacing(100);   // 100 (numbers pass through)
```

**Throws** if the token string is not found in the scale.

---

## Connector Routing (Advanced)

### Connector Routing (`routeConnector`)

Computes orthogonal polyline waypoints for elbow-type connectors.

**Signature:** `routeConnector(options: RouteOptions): RouteResult`

#### `RouteOptions`

| Property | Type | Default | Description |
|---|---|---|---|
| `from` | `AnchorPointResult` | — | Source anchor point with direction vector |
| `to` | `AnchorPointResult` | — | Target anchor point with direction vector |
| `obstacles` | `Rect[]` | `[]` | Obstacle bounding boxes to route around |
| `stubLength` | `number` | `30` | Length of mandatory orthogonal stub from each endpoint |
| `clearance` | `number` | `15` | Minimum clearance from obstacles |

#### `RouteResult`

```ts
{ waypoints: Point[] }  // Array of { x, y } points forming the polyline
```

---

## Rendering

### `render(slides, options?)` — async

Renders an array of slide definitions into the DOM as absolutely-positioned elements inside Reveal.js `<section>` elements.

**Signature:** `render(slides: SlideDefinition[], options?: { container?: HTMLElement }): Promise<{ sections: HTMLElement[], layouts: LayoutResult[] }>`

| Param | Type | Default | Description |
|---|---|---|---|
| `slides` | `SlideDefinition[]` | — | Array of slide definition objects |
| `options.container` | `HTMLElement` | `.reveal .slides` | Target DOM container |

**Returns:** `{ sections, layouts }`

- `sections` — array of `<section>` DOM elements created
- `layouts` — array of `LayoutResult` objects (one per slide)

### Slide Definition

| Property | Type | Description |
|---|---|---|
| `id` | `string` | Slide identifier (set as `section.id`) |
| `background` | `string` | Slide background (color, gradient, or image path) |
| `elements` | `SlideElement[]` | Array of SlideKit elements |
| `transforms` | `TransformMarker[]` | Array of layout transform operations |
| `notes` | `string` | Speaker notes (rendered as `<aside class="notes">`) |

### Background Handling (Advanced / Internal)

`applySlideBackground(section, background)` — sets Reveal.js `data-background-*` attributes on a `<section>` element. Called automatically by `render()`.

| Background Value | Attribute Set |
|---|---|
| Solid colors (`#hex`, `rgb(...)`, `hsl(...)`) | `data-background-color` |
| Gradients (`linear-gradient(...)`, `radial-gradient(...)`) | `data-background-gradient` |
| Image paths / URLs | `data-background-image` |

### Scene Model (`window.sk`)

After rendering, `window.sk` contains the persisted scene model:

```js
window.sk = {
  layouts: [ /* LayoutResult per slide */ ],
  slides: [ { id, layout } ],
  _config: { /* current config */ },
  lint(slideId): LintFinding[],       // Lint a single slide
  lintDeck(): LintFinding[],          // Lint all slides
};
```

> ✅ **Pattern:** After every code change, rebuild, hard-reload (Ctrl+Shift+R or append `?v=<timestamp>` to the bundle URL), and re-lint. Browsers aggressively cache JS bundles — stale caches are a common source of "my fix didn't work."

> ✅ **Pattern:** Take browser screenshots after programmatic checks pass for visual verification. The linter catches structural issues but not visual balance, readability, or aesthetic problems.

### DOM Overflow Detection

After rendering, `render()` checks every `el`-type element for overflow. If `scrollHeight` exceeds `clientHeight` (or `scrollWidth` exceeds `clientWidth`) by more than 1px, warnings are appended:

- `dom_overflow_y` — vertical overflow detected
- `dom_overflow_x` — horizontal overflow detected

### Renderer Helpers (Advanced / Internal)

> ℹ️ **Note:** These functions are exported for advanced use cases (custom rendering pipelines, testing). Most users only need `render()`.

#### `computeZOrder(elements)`

Sorts elements by render order: layer (`bg` < `content` < `overlay`), then explicit `z` value (default `0`), then declaration order.

**Signature:** `computeZOrder(elements: SlideElement[]): Map<string, number>`

#### `applyStyleToDOM(domEl, styleObj)`

Applies a CSS style object to a DOM element. Handles CSS custom properties (`--*`) via `setProperty()` and standard properties via direct assignment.

**Signature:** `applyStyleToDOM(domEl: HTMLElement, styleObj: Record<string, any>): void`

#### `renderElementFromScene(element, zIndex, sceneElements, offsetX?, offsetY?)`

Renders a single element from the scene graph into a DOM node.

**Signature:** `renderElementFromScene(element: SlideElement, zIndex: number, sceneElements: Record<string, any>, offsetX?: number, offsetY?: number): HTMLElement`

---

## Layout & Validation

### `layout(slideDefinition, options?)` — async

The core layout engine. Takes a slide definition, resolves all positions, measures HTML content, detects collisions, validates bounds, and returns a complete scene graph.

**Signature:** `layout(slideDefinition: SlideDefinition, options?: { collisionThreshold?: number }): Promise<LayoutResult>`

| Param | Type | Default | Description |
|---|---|---|---|
| `slideDefinition` | `SlideDefinition` | — | `{ elements, transforms? }` |
| `options.collisionThreshold` | `number` | `0` | Minimum overlap area (px²) to report |

**Returns:** `LayoutResult` — `{ elements, rootIds, transforms, warnings, errors, collisions }`

### The Scene Graph (`elements`)

A map of `id → SceneElement`. Each entry contains:

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Element identifier |
| `type` | `ElementType` | Element type discriminator |
| `authored` | `object` | Original element spec (type, content, props) |
| `resolved` | `Rect` | Final absolute position `{ x, y, w, h }` (after anchor resolution) |
| `localResolved` | `Rect` | Position relative to parent (same as `resolved` for root elements) |
| `parentId` | `string \| null` | ID of parent group/stack, or `null` for root elements |
| `children` | `string[]` | Ordered array of child element IDs |
| `provenance` | `object` | Per-property source tracking (see below) |
| `_internal` | `boolean` | `true` for panel internal elements (bg rect, inner vstack) |

`rootIds` — ordered array of top-level element IDs with no parent.

#### Provenance Sources (`ProvenanceSource`)

| Value | Meaning |
|---|---|
| `"authored"` | Value came from user-specified props |
| `"measured"` | Value was computed by HTML measurement |
| `"constraint"` | Value was resolved from a `_rel` marker |
| `"stack"` | Value was set by a parent vstack/hstack |
| `"transform"` | Value was modified by a layout transform |
| `"default"` | Value came from default values |

### Warnings

Structured warning objects with `type`, `elementId`, and `message`. Warning types:

| Type | Description |
|---|---|
| `outside_safe_zone` | Element extends outside the safe zone |
| `outside_slide` | Element extends outside the slide canvas |
| `content_clustered` | Content elements are clustered too close together |
| `content_no_breathing_room` | Too little content density / spacing |
| `stretch_override` | A child's explicit size was overridden by `align: 'stretch'` |
| `panel_overflow` | Panel content exceeds the panel's authored height |
| `dom_overflow_y` / `dom_overflow_x` | Post-render DOM overflow detected |
| `transform_unknown_element` | Transform references a non-existent element ID |

**Layer-aware warning suppression:** Elements on `layer: 'bg'` are exempt from safe zone checks.

### Errors

| Type | Description |
|---|---|
| `dependency_cycle` | Circular reference chain in relative positioning |
| `unknown_ref` | `_rel` marker references a non-existent element ID |
| `invalid_rel_on_dimension` | `_rel` marker used on `w` or `h` (only valid on `x`/`y`) |

In strict mode (`init({ strict: true })`), safe zone and slide bounds violations become errors instead of warnings.

### Collisions

Array of collision objects:

```js
{ elementA: "box-1", elementB: "box-2", overlapArea: 4800, overlapRect: { x, y, w, h } }
```

Collision detection operates per-layer — elements on different layers don't collide.

### Layout Pipeline

1. **Phase 1 — Intrinsic Sizes:** Measures HTML content, resolves stack sizes, resolves percentages, handles panel auto-height, computes `bounds: 'hug'` group sizes
2. **Phase 2 — Positions:** Builds dependency graph from `_rel` markers, topological sort, resolves to absolute coords, applies anchor resolution, positions stack children
3. **Phase 3 — Transforms:** Applies alignment/distribution/sizing transforms in declaration order
4. **Phase 4 — Finalize:** Builds hierarchical scene model, resolves connector endpoints, collision detection, safe zone/bounds validation, panel overflow checks

### `getEffectiveDimensions(element)` — async

Computes the effective width and height of an element. For `el()` without explicit `h`, measures HTML content.

**Signature:** `getEffectiveDimensions(element: SlideElement): Promise<{ w: number, h: number, _autoHeight: boolean }>`

---

## Measurement

### `measure(html, props?)` — async

Measures how HTML content will render using off-screen DOM measurement.

**Signature:** `measure(html: string, props?: { w?: number, style?: Record<string, unknown>, className?: string }): Promise<{ w: number, h: number }>`

| Param | Type | Default | Description |
|---|---|---|---|
| `html` | `string` | — | HTML content to measure |
| `props.w` | `number` | — | Constraining width. If omitted, measures natural width. |
| `props.className` | `string` | `""` | CSS class(es) for the measurement container |
| `props.style` | `object` | `{}` | CSS style object (filtered through `filterStyle`) |

**Behavior:**
- Without `props.w`: measures natural width and height
- With `props.w`: constrains width and measures resulting height
- Images inside the HTML are waited on (3-second timeout) before reading dimensions
- Results are cached by `(html, w, style, className)`

### `clearMeasureCache()`

Clears the internal measurement cache. Call this if you change fonts or need fresh measurements.

**Signature:** `clearMeasureCache(): void`

---

## Linting

The linting subsystem provides static analysis rules for SlideKit scene graphs. Exposed both as module exports and on `window.sk`.

### `lintSlide(slideData, slideElement?)`

Run lint rules on a single slide.

**Signature:** `lintSlide(slideData: LintSlideData, slideElement?: HTMLElement | null): LintFinding[]`

#### `LintSlideData`

```ts
interface LintSlideData {
  id: string;
  layout: {
    elements: Record<string, SceneElement>;
    warnings: Array<Record<string, unknown>>;
    errors: Array<Record<string, unknown>>;
    collisions: Array<Record<string, unknown>>;
  };
}
```

### `lintDeck(skData, sections?)`

Run lint rules on all slides.

**Signature:** `lintDeck(skData: LintDeckData, sections?: NodeListOf<HTMLElement> | null): LintFinding[]`

#### `LintDeckData`

```ts
interface LintDeckData {
  slides: LintSlideData[];
}
```

### `LintFinding`

```ts
interface LintFinding {
  rule: string;                        // e.g., "text-overflow", "canvas-overflow"
  severity: 'error' | 'warning' | 'info';
  elementId: string | null;
  message: string;
  detail: Record<string, unknown>;
  bounds?: Rect | null;
  parentBounds?: Rect | null;
  suggestion: string;
  slideId?: string;
}
```

### `window.sk` Lint API

After `render()`, linting is available on the scene model:

```js
// Lint a single slide by ID
const findings = window.sk.lint('slide-1');

// Lint all slides
const allFindings = window.sk.lintDeck();

// Filter to actionable items
const issues = findings.filter(f => f.severity !== 'info');
```

> ✅ **Pattern:** Run `window.sk.lint(slideId)` after every change during development (fast, per-slide). Run `window.sk.lintDeck()` once at the end for cross-slide consistency checks (title-position-drift, style-drift).

> ✅ **Pattern:** Filter lint findings to actionable items: `findings.filter(f => f.severity !== 'info')`. Focus on `text-overflow`, `canvas-overflow`, and `non-ancestor-overlap`. Use `allowOverlap: true` on elements that intentionally overlap (e.g., background images, decorative layers).

> ⚠️ **Anti-pattern:** Don't suppress overflow with `overflow: 'hidden'` or `style: { overflow: 'hidden' }` to silence lint findings — fix the actual dimensions instead. Hidden overflow means clipped content.

---

## Configuration

### `init(config?)` — async

Initialize SlideKit with configuration. All fields are optional.

**Signature:** `init(config?: InitConfig): Promise<SlideKitConfig>`

```js
await init({
  slide: { w: 1920, h: 1080 },
  safeZone: { left: 120, right: 120, top: 90, bottom: 90 },
  strict: false,
  minFontSize: 24,
  spacing: { xs: 8, sm: 16, md: 24, lg: 32, xl: 48, section: 80 },
  fonts: [
    { family: 'Inter', weights: [400, 600, 700], source: 'google' },
  ],
});
```

| Property | Type | Default | Description |
|---|---|---|---|
| `slide.w` | `number` | `1920` | Slide width in pixels |
| `slide.h` | `number` | `1080` | Slide height in pixels |
| `safeZone.left` | `number` | `120` | Left margin |
| `safeZone.right` | `number` | `120` | Right margin |
| `safeZone.top` | `number` | `90` | Top margin |
| `safeZone.bottom` | `number` | `90` | Bottom margin |
| `strict` | `boolean` | `false` | When `true`, safe zone/bounds violations become errors |
| `minFontSize` | `number` | `24` | Font sizes below this trigger readability warnings |
| `spacing` | `Record<string, number>` | see [Spacing](#spacing) | Token-to-pixel map. Custom entries merge with defaults. |
| `fonts` | `FontDef[]` | `[]` | `[{ family, weights, source }]` — fonts to preload |

**`FontDef`:** `{ family: string, weights?: number[], source?: string }`

**Throws** if safe zone margins leave zero or negative usable area.

**`DEFAULT_CONFIG`** — the exported default configuration constant with all default values.

### `safeRect()`

Returns the current safe zone rectangle.

**Signature:** `safeRect(): Rect`

**Returns:** `{ x, y, w, h }` — a copy of the cached safe rectangle. Default: `{ x: 120, y: 90, w: 1680, h: 900 }`.

**Throws** if `init()` has not been called.

> ✅ **Pattern:** Always use `safeRect()` values for content positioning instead of hardcoded numbers. Content-layer elements should stay within `x: 120–1800`, `y: 90–990`. After building a vertical chain with `below()`, verify the last element's bottom edge is ≤ 990.

> ✅ **Pattern:** Use `splitRect(safe, ratio, gap)` for two-column layouts — it gives mathematically precise column rects:
> ```js
> const { left, right } = splitRect(safeRect(), 0.55, 40);
> // Use left.x, left.w, right.x, right.w for positioning
> ```

### `splitRect(rect, options?)`

Splits a rectangle into left and right sub-rectangles. This is a convenience function for **two-column slide layouts** — e.g., image on the left with content on the right, or vice versa. Combine with `safeRect()` to divide the safe zone into precise column regions.

**Signature:** `splitRect(rect: Rect, options?: { ratio?: number, gap?: number | string }): { left: Rect, right: Rect }`

| Param | Type | Default | Description |
|---|---|---|---|
| `rect` | `Rect` | — | The rectangle to split (typically `safeRect()`) |
| `options.ratio` | `number` | `0.5` | Fraction of usable width for the left side (0–1) |
| `options.gap` | `number \| string` | `0` | Gap between left and right (px or spacing token) |

```typescript
// Image-left / content-right layout (55% / 45% split with 40px gap)
const { left, right } = splitRect(safeRect(), { ratio: 0.55, gap: 40 });
const img = figure('photo.png', { ...left });
const content = vstack({ x: right.x, y: right.y, w: right.w }, [
  el('Heading', { style: { fontSize: 48 } }),
  el('Body text here...', { w: right.w }),
]);

// Equal halves with spacing token gap
const { left: colA, right: colB } = splitRect(safeRect(), { gap: 'md' });
```

> ✅ **Pattern:** Use `splitRect()` instead of manually computing column widths — it handles gap arithmetic and rounding correctly. This also produces lint-friendly layouts since elements get explicit coordinates rather than being inside stacks the linter can't resolve.

### `getConfig()`

Returns a deep copy of the current configuration, or `null` if `init()` hasn't been called.

**Signature:** `getConfig(): SlideKitConfig | null`

### `isFontLoaded(family, weight?)`

Returns `true` if the given font/weight combination was successfully loaded during `init()`.

**Signature:** `isFontLoaded(family: string, weight?: number): boolean`

Default weight: `400`.

### `getFontWarnings()`

Returns an array of font loading warning objects from the most recent `init()` call.

**Signature:** `getFontWarnings(): Array<Record<string, unknown>>`

### `_resetForTests()`

Resets all internal state: config, safe rect, ID counters, loaded fonts, measure cache, and removes injected DOM elements. **Testing only.**

### `resetIdCounter()`

Resets the auto-ID counter to `0`. Called automatically at the start of `layout()` and `render()`.

**Signature:** `resetIdCounter(): void`

---

## Utilities

### `grid(config?)`

Creates a column grid for consistent cross-slide positioning.

**Signature:** `grid(config?: { cols?: number, gutter?: number, margin?: { left?: number, right?: number } }): Grid`

| Param | Type | Default | Description |
|---|---|---|---|
| `config.cols` | `number` | `12` | Number of columns |
| `config.gutter` | `number` | `30` | Gap between columns (px) |
| `config.margin` | `object` | safe zone margins | `{ left, right }` — grid margins |

**Returns:**

| Property | Type | Description |
|---|---|---|
| `cols` | `number` | Number of columns |
| `gutter` | `number` | Gutter width |
| `colWidth` | `number` | Width of one column |
| `marginLeft` | `number` | Left margin |
| `marginRight` | `number` | Right margin |
| `totalWidth` | `number` | Total grid width |
| `col(n)` | `function` | X position of column `n` (1-based) |
| `spanW(from, to)` | `function` | Width spanning columns `from` to `to` (inclusive, 1-based) |

**Throws** if computed `colWidth <= 0`.

### `snap(value, gridSize)`

Rounds a value to the nearest grid increment.

**Signature:** `snap(value: number, gridSize: number): number`

Returns `value` unchanged if `gridSize <= 0`.

### `resolvePercentage(value, axis)`

Resolves percentage strings to pixel values relative to the slide or safe zone.

**Signature:** `resolvePercentage(value: unknown, axis: "x" | "y" | "w" | "h"): unknown`

The return type is `unknown` because the function passes non-string inputs through unchanged. In practice: percentage strings (e.g., `"50%"`, `"safe:25%"`) are resolved to a `number`; all other values are returned as-is.

**Syntax:**
- `"N%"` — percentage of slide dimension
- `"safe:N%"` — percentage of safe zone (offset + percentage for x/y, percentage of dimension for w/h)

Percentage strings on `x`, `y`, `w`, `h` are resolved automatically during layout Phase 1.

### `repeat(element, config?)`

Duplicates an element in a grid pattern.

**Signature:** `repeat(element: SlideElement, config?: RepeatConfig): GroupElement`

| Param | Type | Default | Description |
|---|---|---|---|
| `element` | `SlideElement` | — | Element to duplicate |
| `config.count` | `number` | `1` | Number of copies |
| `config.cols` | `number` | = count | Columns per row |
| `config.gapX` | `number \| string` | `0` | Horizontal gap (px or spacing token) |
| `config.gapY` | `number \| string` | `0` | Vertical gap (px or spacing token) |
| `config.startX` | `number` | `0` | Starting X position |
| `config.startY` | `number` | `0` | Starting Y position |

**Returns:** A `group` containing deep-cloned copies. Each copy gets ID `{baseId}-{i+1}`.

### `rotatedAABB(w, h, degrees)`

Computes the axis-aligned bounding box of a rotated rectangle.

**Signature:** `rotatedAABB(w: number, h: number, degrees: number): { w: number, h: number }`

---

## Types Reference

Key types for users building presentations:

### Geometry

| Type | Definition |
|---|---|
| `Rect` | `{ x: number, y: number, w: number, h: number }` |
| `Point` | `{ x: number, y: number }` |
| `AnchorPointResult` | `{ x: number, y: number, dx: number, dy: number }` |

### Element Types

| Type | Description |
|---|---|
| `SlideElement` | Discriminated union: `ElElement \| GroupElement \| VStackElement \| HStackElement \| ConnectorElement` |
| `ElElement` | `{ type: "el", id, content, props, _layoutFlags }` |
| `GroupElement` | `{ type: "group", id, children, props, _layoutFlags }` |
| `VStackElement` | `{ type: "vstack", id, children, props, _layoutFlags }` |
| `HStackElement` | `{ type: "hstack", id, children, props, _layoutFlags }` |
| `ConnectorElement` | `{ type: "connector", id, props, _layoutFlags }` |
| `PanelElement` | Group with `_compound: "panel"` and `_panelConfig` |
| `FigureElement` | Group with `_compound: "figure"` and `_figureConfig` |

### String Unions

| Type | Values |
|---|---|
| `AnchorPoint` | `"tl" \| "tc" \| "tr" \| "cl" \| "cc" \| "cr" \| "bl" \| "bc" \| "br"` |
| `LayerName` | `"bg" \| "content" \| "overlay"` |
| `VAlign` | `"top" \| "center" \| "bottom"` |
| `OverflowPolicy` | `"visible" \| "warn" \| "clip" \| "error"` |
| `HAlign` | `"left" \| "center" \| "right" \| "stretch"` |
| `HStackAlign` | `"top" \| "middle" \| "bottom" \| "stretch"` |
| `ConnectorType` | `"straight" \| "curved" \| "elbow"` |
| `ArrowType` | `"none" \| "end" \| "start" \| "both"` |
| `ElementType` | `"el" \| "group" \| "vstack" \| "hstack" \| "connector"` |
| `CompoundType` | `"panel" \| "figure"` |
| `BoundsMode` | `"hug" \| undefined` |
| `ProvenanceSource` | `"authored" \| "measured" \| "stack" \| "constraint" \| "transform" \| "default"` |
| `ShadowPreset` | `"sm" \| "md" \| "lg" \| "xl" \| "glow"` |

### Value Types

| Type | Definition |
|---|---|
| `PositionValue` | `number \| string \| RelMarker` |
| `SizeValue` | `number \| string` |
| `RelMarker` | `{ _rel: RelMarkerKind, ref?, ref2?, gap?, bias?, rect? }` |
| `TransformMarker` | `{ _transform: string, _transformId: string, ids: string[], options: object }` |

### Configuration Types

| Type | Description |
|---|---|
| `SlideKitConfig` | `{ slide, safeZone, strict, minFontSize, fonts, spacing }` |
| `FontDef` | `{ family: string, weights?: number[], source?: string }` |
| `SpacingScale` | `{ xs?, sm?, md?, lg?, xl?, section?, [key: string]: number }` |
| `SlideDefinition` | `{ id?, background?, elements, transforms?, notes? }` |

### Layout Types

| Type | Description |
|---|---|
| `LayoutResult` | `{ elements, rootIds, transforms, warnings, errors, collisions }` |
| `SceneElement` | Full resolved element in the scene graph |
| `Collision` | `{ elementA, elementB, overlapRect, overlapArea }` |
| `StyleFilterResult` | `{ filtered: Record<string, unknown>, warnings: Array<Record<string, unknown>> }` |

### Input Props Types

| Type | Description |
|---|---|
| `InputProps` | `ElementProps & { id?: string }` — input type for all element factory functions |
| `ElementProps` | Common properties shared by all elements: `x`, `y`, `w`, `h`, `anchor`, `layer`, `opacity`, `valign`, `overflow`, `style`, `className`, `shadow`, `z`, `maxW`, `maxH`, `rotate`, `gap`, `align`, `vAlign`, `hAlign`, `bounds`, `scale`, `clip` |
| `CardGridOptions` | `InputProps & { cols?: number }` |
| `ConnectorInputProps` | Connector-specific input: `{ id?, type?, arrow?, color?, thickness?, dash?, fromAnchor?, toAnchor?, label?, labelStyle?, layer?, opacity?, style?, className? }` |
| `PanelInputProps` | `InputProps & { padding?, fill?, radius?, border?, vAlign? }` |
| `FigureInputProps` | `{ id?, src?, x?, y?, w?, h?, anchor?, layer?, containerFill?, containerRadius?, containerPadding?, caption?, captionGap?, fit?, style? }` |

# SlideKit API Quick Reference

**SlideKit** is a coordinate-based slide layout library for [Reveal.js](https://revealjs.com/). Instead of writing HTML slides by hand, you describe elements with explicit positions, widths, and spacing tokens in JavaScript, and SlideKit handles measurement, rendering, collision detection, and linting. The canvas is 1920×1080. Everything is absolutely positioned — there is no CSS flow layout. If you are an AI model generating slides, use this reference to produce correct, lint-clean SlideKit code.

> **Audience:** AI agents writing SlideKit JavaScript slide code.
> **For workflow, pitfalls, anti-patterns, and the render-inspect-correct loop:** see [AI_AUTHORING_GUIDE.md](AI_AUTHORING_GUIDE.md).
> **For every option, edge case, and internal detail:** see [API.md](API.md).
> **For connector advanced routing:** see [CONNECTORS.md](CONNECTORS.md).

---

## Initialization & Configuration

### `init(config?)`

```ts
init(config?: InitConfig): Promise<SlideKitConfig>
```

Initializes SlideKit. Call once before any other function.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `slide.w` | `number` | `1920` | Canvas width (px) |
| `slide.h` | `number` | `1080` | Canvas height (px) |
| `safeZone` | `{ left, right, top, bottom }` | `120, 120, 90, 90` | Edge insets (px) |
| `strict` | `boolean` | `false` | Promote safe-zone/bounds violations to errors |
| `minFontSize` | `number` | `24` | Font sizes below this trigger warnings |
| `fonts` | `FontDef[]` | `[]` | `{ family, weights?, source? }` -- fonts to preload |
| `spacing` | `Record<string, number>` | see [Spacing Tokens](#spacing-tokens) | Custom tokens merge with defaults |
| `minVersion` | `string` | -- | Minimum compatible SlideKit version (semver) |
| `debug.sourceHint` | `string` | -- | Path to slide source file, shown in inspector (e.g., `'./slides.js'`) |

> **Important — declare your fonts.** If your slides use web fonts (Google Fonts, custom `@font-face`), list them in `init({ fonts })` so SlideKit preloads them before measuring text. Without this, `measure()` may run before fonts finish loading and compute incorrect element heights. SlideKit does await `document.fonts.ready` as a fallback, but explicitly declaring fonts is more reliable and avoids race conditions.

```js
await init({
  fonts: [
    { family: 'IBM Plex Sans', weights: [400, 600, 700], source: 'google' },
    { family: 'IBM Plex Serif', weights: [400, 600], source: 'google' },
  ],
});
```

### `safeRect()`

```ts
safeRect(): Rect  // { x: 120, y: 90, w: 1680, h: 900 }
```

Returns the usable content area. **Throws** if `init()` not called.

### `splitRect(rect, options?)`

```ts
splitRect(rect: Rect, options?: { ratio?: number, gap?: number | string }): { left: Rect, right: Rect }
```

Splits a rectangle into left/right. `ratio` (0--1, default `0.5`) = left fraction. `gap` accepts px or spacing tokens.

### `getSpacing(token)`

```ts
getSpacing(token: number | string): number
```

Resolves a spacing token name to pixels. Numbers pass through. **Throws** on unknown tokens.

### `getConfig()`

```ts
getConfig(): SlideKitConfig | null
```

Returns a deep copy of the current configuration, or `null` if `init()` has not been called.

---

## Element Creation -- Core Primitives

### `el(html, props?)`

```ts
el(html: string, props?: InputProps): ElElement
```

The single element primitive. Creates a positioned HTML element on the canvas.

**Key options:** All [Common Element Props](#common-element-props).

**Gotchas:**
- **Always set `w` on text elements** -- without it, text renders on one long line.
- **Avoid setting `h` on text elements** -- auto-measurement handles height and setting `h` overrides it, which is the leading cause of text-overflow bugs. Only set `h` when you intentionally want a fixed-size box (e.g., a styled node in a diagram with `vAlign: 'center'`).
- Use `style: {}` for CSS properties, not top-level props (auto-promoted with warning).
- Use the `overflow` prop (e.g., `{ overflow: 'clip' }`) instead of `style: { overflow: 'hidden' }` -- CSS overflow is blocked.

---

### `group(children, props?)`

```ts
group(children: SlideElement[], props?: InputProps): GroupElement
```

Container with shared coordinate origin. Moving the group moves all children.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `scale` | `number` | `1` | Scale factor for contents |
| `clip` | `boolean` | `false` | Clip children to group bounds |
| `bounds` | `"hug"` | -- | Auto-compute w/h from children's bounding box |

Plus all [Common Element Props](#common-element-props).

**Gotcha:** **Groups without dimensions _or_ `bounds: 'hug'` default to 0x0** -- children may be invisible. Always set `w`/`h` or `bounds: 'hug'` on layout container groups.

---

### `vstack(items, props?)`

```ts
vstack(items: SlideElement[], props?: InputProps): VStackElement
```

Vertical layout (top to bottom). If the stack has `w` and a child lacks `w`, the child inherits the stack's width.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `gap` | `number \| string` | `0` | Vertical gap (px or spacing token) |
| `align` | `HAlign` | `"left"` | Cross-axis alignment: `"left"`, `"center"`, `"right"`, `"stretch"` |
| `vAlign` | `VAlign` | `"top"` | Main-axis alignment: `"top"`, `"center"`, `"bottom"`. **Requires explicit `h`.** |

Plus all [Common Element Props](#common-element-props).

**Gotcha:** Relative positioning (`below()`, `rightOf()`) on stack children is **ignored** -- the stack controls child positions.

---

### `hstack(items, props?)`

```ts
hstack(items: SlideElement[], props?: InputProps): HStackElement
```

Horizontal layout (left to right).

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `gap` | `number \| string` | `0` | Horizontal gap (px or spacing token) |
| `align` | `HStackAlign` | `"top"` | Cross-axis alignment: `"top"`, `"middle"`, `"bottom"`, `"stretch"` |
| `hAlign` | `string` | `"left"` | Main-axis alignment: `"left"`, `"center"`, `"right"`. **Requires explicit `w`.** |

Plus all [Common Element Props](#common-element-props).

**Gotcha:** **The linter cannot resolve child positions inside `hstack()`/`cardGrid()`.** For lint-sensitive layouts, use explicit `x`/`y`/`w` positioning or `splitRect()` instead.

---

### `cardGrid(items, opts?)`

```ts
cardGrid(items: SlideElement[], opts?: CardGridOptions): VStackElement
```

Arranges items in a grid (rows of `hstack`s with `align: 'stretch'`). Returns the outer `vstack`.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `cols` | `number` | `2` | Columns per row |
| `gap` | `number \| string` | `0` | Gap in both directions |

Plus `id`, `x`, `y`, `w`, `anchor`, `layer`, `style` from common props.

---

## Compound Elements

### `panel(children, props?)`

```ts
panel(children: SlideElement[], props?: PanelInputProps): PanelElement
```

Visual container with background, padding, and vertically stacked children. Internally a `group` with background `el('')` + `vstack`.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `padding` | `number \| string` | `24` | Internal padding (px or spacing token) |
| `gap` | `number \| string` | `16` | Vertical gap between children |
| `fill` | `string` | -- | Background color/gradient |
| `radius` | `number \| string` | -- | Border radius |
| `border` | `string` | -- | CSS border shorthand |
| `vAlign` | `VAlign` | `"top"` | Main-axis alignment. **Requires explicit `h`.** |

Plus all [Common Element Props](#common-element-props).

**Gotchas:**
- Children with `w: "fill"` get width = `panelWidth - 2 * padding`.
- **Avoid `w: 'fill'` in nested panels** -- inner fill resolves before outer panel sets width.
- When panel children generate false-positive overlaps, flatten to a single `el()` with inline HTML.

---

### `connect(fromId, toId, props?)`

```ts
connect(fromId: string, toId: string, props?: ConnectorInputProps): ConnectorElement
```

SVG connector between two elements. Endpoints resolved during layout.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `type` | `ConnectorType` | `"straight"` | `"straight"`, `"curved"`, `"elbow"`, `"orthogonal"` |
| `arrow` | `ArrowType` | `"end"` | `"none"`, `"start"`, `"end"`, `"both"` |
| `color` | `string` | `"#ffffff"` | Stroke color |
| `thickness` | `number` | `2` | Stroke width (px) |
| `dash` | `string \| null` | `null` | SVG `stroke-dasharray`: `"5 5"`, `"10 4 2 4"`, `"2 4"` |
| `fromAnchor` | `AnchorPoint` | `"cr"` | Anchor on source element |
| `toAnchor` | `AnchorPoint` | `"cl"` | Anchor on target element |
| `label` | `string \| null` | `null` | Text label at midpoint |
| `labelStyle` | `object` | `{}` | `{ size, color, font, weight }` |
| `labelPosition` | `number` | `0.5` | Position along path (0=start, 1=end) |
| `cornerRadius` | `number` | `0` | Fillet radius for elbow corners |
| `obstacleMargin` | `number` | `200` | Search margin for obstacle avoidance (orthogonal type) |

**Gotchas:**
- **`dash` must be space-separated** (`"5 5"`), not comma-separated (`"5,5"`) -- wrong format silently produces a solid line.
- **For visible curves, use corner anchors** (`tr`/`tl`) not center-edge (`cr`/`cl`) -- center-edge on aligned boxes degenerates to straight.
- Port spreading is automatic when multiple connectors share an edge. Control order with `fromPortOrder`/`toPortOrder`.

---

## Common Element Props

All element types share these properties:

| Property | Type | Default | Notes |
|----------|------|---------|-------|
| `id` | `string` | auto (`sk-N`) | **Required** for referenced elements |
| `x`, `y` | `number \| string \| RelMarker` | `0` | Accepts px, `"50%"`, `"safe:25%"`, or relative marker |
| `w` | `number \| string \| RelMarker` | -- | **Required for text.** Accepts px, `"50%"`, `"fill"` (panels only), `matchWidthOf(refId)`, or `matchMaxWidth(group)` |
| `h` | `number \| string \| RelMarker` | -- | Auto-measured for text. Accepts px, `"50%"`, `matchHeightOf(refId)`, or `matchMaxHeight(group)`. Set only for fixed-size boxes. |
| `maxW`, `maxH` | `number` | -- | Max dimension constraints |
| `anchor` | `AnchorPoint` | `"tl"` | Which point sits at (x, y) |
| `layer` | `LayerName` | `"content"` | `"bg"`, `"content"`, `"overlay"` |
| `vAlign` | `VAlign` | `"top"` | Content vertical alignment within box. **Requires explicit `h` to take effect.** |
| `overflow` | `OverflowPolicy` | `"visible"` | `"visible"`, `"warn"`, `"clip"`, `"error"` |
| `style` | `object` | `{}` | CSS pass-through (see [Styling Rules](#styling-rules)) |
| `opacity` | `number` | `1` | 0--1 |
| `rotate` | `number` | -- | Degrees |
| `flipH` | `boolean` | -- | Horizontal flip (`scaleX(-1)`) |
| `flipV` | `boolean` | -- | Vertical flip (`scaleY(-1)`) |
| `z` | `number` | -- | Z-order within layer (higher = front) |
| `className` | `string` | `""` | CSS class name(s) |
| `shadow` | `string` | -- | Preset name or CSS `box-shadow` |
| `allowOverlap` | `boolean` | `false` | Suppresses linter overlap checks |

**Percentage positioning:** `"50%"` resolves to 50% of the slide dimension. `"safe:25%"` resolves to 25% of the safe zone dimension. Resolved automatically during layout.

### Anchor System

```
tl --- tc --- tr
|              |
cl     cc     cr
|              |
bl --- bc --- br
```

First char = row (`t`/`c`/`b`), second char = column (`l`/`c`/`r`).

---

## Positioning Helpers (Relative Placement)

All return `RelMarker` objects resolved during layout. **Only valid on `x` and `y` properties.** `gap` accepts px or spacing token strings.

### Adjacency

```ts
below(refId, gap?): RelMarker   // gap: number | string | { gap: number | string }
above(refId, gap?): RelMarker
rightOf(refId, gap?): RelMarker
leftOf(refId, gap?): RelMarker
```

The second argument accepts a bare number, spacing token string, or `{ gap }` object:

```js
y: below('title', 'lg')       // spacing token
y: below('title', 32)          // raw pixels
y: below('title', { gap: 'lg' })  // object form (also valid)
```

| Function | Axis | Resolves To |
|----------|------|-------------|
| `below` | Y | ref bottom + gap |
| `above` | Y | ref top - element height - gap |
| `rightOf` | X | ref right + gap |
| `leftOf` | X | ref left - element width - gap |

### Alignment -- `(refId) => RelMarker`

| Function | Axis | Resolves To |
|----------|------|-------------|
| `alignTopWith` | Y | ref top edge |
| `alignBottomWith` | Y | ref bottom - element height |
| `alignLeftWith` | X | ref left edge |
| `alignRightWith` | X | ref right - element width |
| `centerVWith` | Y | Vertically centered with ref |
| `centerHWith` | X | Horizontally centered with ref |

**Gotcha:** **Never cross axes** -- `alignTopWith()` returns Y; using it for X silently produces wrong positions.

### Slide-Level Centering (no ref needed)

| Function | Axis | Resolves To |
|----------|------|-------------|
| `centerHOnSlide()` | X | Horizontally centered on the slide |
| `centerVOnSlide()` | Y | Vertically centered on the slide |

```js
el('<h1 style="font:700 72px Inter;color:#fff;text-align:center">Title</h1>',
  { id: 'title', x: centerHOnSlide(), y: centerVOnSlide(), w: 800, anchor: 'tc' });
```

No reference element needed -- centers relative to the full 1920x1080 canvas.

### Dimension Matching

| Function | Axis | Resolves To |
|----------|------|-------------|
| `matchWidthOf(refId)` | W | Element width = ref's width |
| `matchHeightOf(refId)` | H | Element height = ref's height |
| `matchMaxWidth(group)` | W | Element width = widest in group |
| `matchMaxHeight(group)` | H | Element height = tallest in group |

```js
el('<p>Same width as header</p>', { id: 'body', y: below('header', 'md'), w: matchWidthOf('header') });
el('<div style="background:#1a1a3e">', { id: 'bg-box', x: 100, y: 100, w: matchWidthOf('card'), h: matchHeightOf('card') });
```

Unlike transform `matchWidth(ids)` which sets all listed elements to the max, `matchWidthOf(refId)` / `matchHeightOf(refId)` are constraint functions usable on `w` / `h` properties to match a specific reference element.

#### Group-Max Matching

`matchMaxWidth(group)` and `matchMaxHeight(group)` make all elements sharing the same group name adopt the widest or tallest element's measured size. No reference element needed -- just a group name string. Elements can be anywhere on the slide (even across layers).

```js
// Three cards that all match the tallest one's height
el('Card A (short)', { id: 'a', x: 0,   y: 0, w: 300, h: matchMaxHeight('row') });
el('Card B (tall)',  { id: 'b', x: 340, y: 0, w: 300, h: matchMaxHeight('row') });
el('Card C (short)', { id: 'c', x: 680, y: 0, w: 300, h: matchMaxHeight('row') });
```

### Between

```ts
between(refA: string | number, refB: string | number, opts: { axis: 'x' | 'y', bias?: number }): RelMarker
```

Positions element in the gap between two references on a given axis. At least one ref must be an element ID; the other can be a raw px coordinate.

- `axis: 'x'` -- positions in horizontal gap between refA's right edge and refB's left edge
- `axis: 'y'` -- positions in vertical gap between refA's bottom and refB's top
- `bias` (default `0.5`) -- 0.0 = flush to refA, 1.0 = flush to refB, 0.5 = centered

```js
x: between('node3', 'node5', { axis: 'x' }),           // center between two nodes
y: between('header', 'content', { axis: 'y', bias: 0.35 }), // explicit bias overrides default 0.5
y: between('lastCard', 990, { axis: 'y' }),             // between element and raw Y
```

**Gotcha:** If the element doesn't fit in the available gap, it is still placed at the bias point but a `between_no_fit` lint warning is emitted. Check lint output for this warning.

### Other

- `centerIn(rect: Rect): { x: RelMarker, y: RelMarker }` -- centers on both axes (use with `safeRect()`)
- `placeBetween(topRef, bottomYOrRef, opts?)` -- **deprecated**, use `between(refA, refB, { axis: 'y' })` instead.

---

## Post-Layout Transforms

Placed in `transforms[]` on the slide definition. All operate on **element ID strings**, not element objects. All return `TransformMarker`.

**Alignment:** `alignLeft`, `alignRight`, `alignTop`, `alignBottom`, `alignCenterH`, `alignCenterV` -- all `(ids, opts?: { to?: number })`. Align edges/centers. `to` overrides default target.

**Distribution:** `distributeH(ids, opts?: { startX?, endX?, mode? })`, `distributeV(ids, opts?: { startY?, endY?, mode? })`. `mode`: `"equal-gap"` (default) or `"equal-center"`. **Requires 2+ IDs.**

**Size matching:** `matchWidth(ids)`, `matchHeight(ids)`, `matchSize(ids)` -- set all to the maximum among them.

**Fitting:** `fitToRect(ids, rect)` -- scale and center to fit within a rect, preserving aspect ratio.

**Gotcha:** **Transforms only move explicitly-listed elements.** If you distribute containers, their labels stay behind. Group related elements first, then transform the groups.

---

## Styling Rules

### CSS Pass-Through

`style: {}` applies CSS directly to the rendered container. SlideKit owns layout; you own visual styling.

### Blocked CSS Properties

These are **silently dropped** from `style: {}` (conflicts with SlideKit positioning):

`position`, `top`, `left`, `right`, `bottom`, `inset*` | `width`, `height`, `min/maxWidth`, `min/maxHeight`, `blockSize`, `inlineSize` | `display` | `overflow`, `overflowX/Y` | `margin`, `marginTop/Right/Bottom/Left` | `transform`, `translate`, `rotate`, `scale` | `contain`, `contentVisibility`

Vendor-prefixed variants also blocked. Use element props (`w`, `h`, `overflow`, `rotate`) instead.

### Convenience Property Mapping

Element props `color`, `font`, `size`, `weight`, `fill`, `radius`, `border`, `align`, `shadow` map to their CSS equivalents (`color`, `fontFamily`, `fontSize`+"px", `fontWeight`, `background`, `borderRadius`, `border`, `textAlign`, `boxShadow`). If both a convenience prop and `style` specify the same CSS property, `style` wins.

**`align` disambiguation:** On `el()`, `align` is a convenience prop that maps to CSS `textAlign`. On `vstack`/`panel`, `align` controls cross-axis alignment (`"left"`, `"center"`, `"right"`, `"stretch"`). These are different properties that share the same name.

### Shadow Presets

| Preset | CSS Value |
|--------|-----------|
| `"sm"` | `0 1px 3px rgba(0,0,0,0.2)` |
| `"md"` | `0 4px 12px rgba(0,0,0,0.3)` |
| `"lg"` | `0 8px 32px rgba(0,0,0,0.4)` |
| `"xl"` | `0 16px 48px rgba(0,0,0,0.5)` |
| `"glow"` | `0 0 40px rgba(124,92,191,0.3)` -- **dark backgrounds only** |

Use via `shadow: 'md'` or pass a raw CSS `box-shadow` string.

### Baseline CSS

SlideKit injects resets inside every `el()` container (`text-align: left`, `line-height: 1.2`, `font-weight: 400`, zero margins, heading font inheritance). User inline styles always win.

### Theme CSS

`className` prop references classes from loaded stylesheets. Theme CSS must contain **only visual styling** (colors, gradients, borders, shadows, typography, animations). Never layout props (`position, display, width, height, margin, padding, flex, grid`) -- they conflict with SlideKit positioning.

---

## Spacing Tokens

| Token | Pixels | Typical Use |
|-------|--------|-------------|
| `"xs"` | 8 | Tight inner spacing |
| `"sm"` | 16 | Compact gaps |
| `"md"` | 24 | Standard gap |
| `"lg"` | 32 | Generous gap |
| `"xl"` | 48 | Section-level spacing |
| `"section"` | 80 | Major section breaks |

Any `gap`, `padding`, or `captionGap` property accepts token names as strings. Custom tokens can be added via `init({ spacing: { ... } })`.

---

## Utilities

### `grid(config?)`

Column grid for consistent positioning.

```ts
grid(config?: { cols?: number, gutter?: number, margin?: { left?, right? } }): Grid
```

Defaults: `cols=12`, `gutter=30`, margins = safe zone margins. Returns `col(n)` (X of 1-based column) and `spanW(from, to)` (width spanning columns, inclusive).

### `snap(value, gridSize)`

Rounds to nearest grid increment. `snap(137, 8)` → `136`.

### `repeat(element, config?)`

Duplicates element in a grid pattern. Returns group of deep-cloned copies with IDs `{baseId}-{i+1}`.

```ts
repeat(element, { count?: number, cols?: number, gapX?: px|tok, gapY?: px|tok, startX?, startY? }): GroupElement
```

### `resolvePercentage(value, axis)`

`"N%"` → % of slide dimension. `"safe:N%"` → % of safe zone. Non-strings pass through. Used automatically in layout.

### `rotatedAABB(w, h, degrees)`

Returns the axis-aligned bounding box `{ w, h }` of a rotated rectangle. Use to verify rotated elements stay within canvas bounds.

### `measure(html, props?)`

```ts
measure(html: string, props?: { w?: number, className?, style? }): Promise<{ w, h }>
```

Off-screen DOM measurement. Without `w`: natural dimensions. With `w`: constrained width, measured height. Use `clearMeasureCache()` if fonts change after initial measurements.

### `resolveAnchor(x, y, w, h, anchor)`

Converts anchor-relative position to CSS `{ left, top }`. Useful for manual anchor math.

### `getAnchorPoint(bounds, anchor)`

```ts
getAnchorPoint(bounds: Rect, anchor: AnchorPoint): { x, y, dx, dy }
```

Returns the pixel coordinates of an anchor point on a bounding rect, plus the outward direction vector (`dx`, `dy`).

---

## Layout Engine

### `layout(slideDefinition, options?)`

```ts
layout(slideDefinition: SlideDefinition, options?: { collisionThreshold?: number }): Promise<LayoutResult>
```

Core layout engine. Resolves positions, measures HTML, detects collisions, validates bounds. Called internally by `render()` but also available standalone.

Returns `LayoutResult: { elements, rootIds, transforms, warnings, errors, collisions }` where `elements` is a `Record<string, SceneElement>` -- the scene graph mapping IDs to fully resolved elements.

### `lintSlide(slideData, slideElement?)`

```ts
lintSlide(slideData: LintSlideData, slideElement?: HTMLElement): LintFinding[]
```

Programmatic lint for a single slide. Equivalent to `window.sk.lint(slideId)` at runtime.

### `lintDeck(deckData, sections?)`

```ts
lintDeck(deckData: LintDeckData, sections?: NodeListOf<HTMLElement>): LintFinding[]
```

Programmatic lint for all slides including cross-slide checks (title-position-drift, style-drift).

---

## Slide Definition & Rendering

```ts
{ id?, background?, elements: SlideElement[], transforms?: TransformMarker[], notes? }
```

- `background` -- CSS color, gradient, or image path (e.g., `'#0a0a1a'`, `'linear-gradient(...)'`, `'./bg.jpg'`). Sets the slide background.
- `notes` -- HTML string for Reveal.js speaker notes (e.g., `'<p>Mention the timeline here.</p>'`). Visible in speaker view only.

```ts
render(slides: SlideDefinition[]): Promise<{ sections: HTMLElement[], layouts: LayoutResult[] }>
```

`VERSION` constant: the current SlideKit version string (e.g., `"0.3.5"`).

### `window.sk` (Runtime API)

```js
window.sk.VERSION             // current version string
window.sk.lint(slideId)       // → LintFinding[] for one slide
window.sk.lintDeck()          // → LintFinding[] for all slides (includes cross-slide checks)
window.sk.layouts[i].elements // scene graph for slide i (Record<string, SceneElement>)
window.sk._config             // current SlideKitConfig
```

### Debug Inspector

The debug inspector is built into the main bundle (no separate debug bundle needed). Enable the keyboard toggle after rendering:

```js
enableKeyboardToggle();  // Ctrl+. to toggle inspector overlay
```

The inspector provides bounding-box overlays, element list with layer grouping, visibility checkboxes, live-preview HTML editing, and snap-to-10px-grid drag/resize (hold Shift to disable snap). Configure via `init()`:

```js
await init({ debug: { sourceHint: './slides.js' } });
```

Key lint findings to watch: `text-overflow`, `canvas-overflow`, `non-ancestor-overlap`, `dom_overflow_y`.

Use `allowOverlap: true` on intentionally overlapping elements to suppress overlap findings.

---

## Critical Rules (Do Not Violate)

1. **Avoid setting `h` on text elements** -- auto-measurement handles height. Only set `h` when you need a fixed-size box (images, bg rects, diagram nodes with `vAlign: 'center'`).
2. **Always set `w` on text elements** -- without width, text won't wrap and measurement fails.
3. **Don't spread positioning functions** -- `...below(ref)` breaks; use `y: below(ref)`.
4. **Use `id` on any element referenced** by positioning helpers, transforms, or connectors.
5. **Style properties are filtered** -- blocked props are silently dropped (see table above).
6. **Spacing tokens are strings** -- `gap: "md"` not `gap: md`.
7. **Never cross axes** with alignment helpers -- `alignTopWith` is Y, `alignLeftWith` is X.
8. **CSS properties go inside `style: {}`** -- top-level CSS props are auto-promoted with warnings.
9. **`dash` on connectors is SVG format** -- `"5 5"` (space-separated), not `"5,5"`.
10. **Put font styles on the innermost text element** -- the linter reads `font-size` from the DOM text node, not its container. Wrap text in `<p>` or `<span>` with inline styles rather than styling an outer `<div>`.

---

## Height Rules

- **Avoid** setting `h` on text elements -- it overrides DOM measurement and is the leading cause of text-overflow bugs. Only set `h` when you intentionally want a fixed-size box.
- **Avoid** calculating height mathematically (`fontSize * lineHeight * lines`) -- browser metrics make this inaccurate.
- **Avoid** setting `h` just for positioning math -- use `below()` chaining instead.
- **Avoid** using `h: left.h` from `splitRect()` on content containers -- that's the full column height (typically 900px). Omit `h` to let content auto-size.
- **Do** omit `h` on text elements -- SlideKit auto-measures from DOM.
- **Do** always specify `w` on text -- constrains wrapping so height measurement is accurate.
- **Do** set `h` when appropriate for: images with `fit: 'cover'`, background rects (`layer: 'bg'`), and fixed-size containers (diagram nodes, panels with `vAlign: 'center'`).

---

## Field-Tested Rules

Discovered by AI agents building real presentations:

- **Don't** create `el()` without explicit `w` -- collapses to 0px, invisible. Always set `w` or use `w: 'fill'` in a container.
- **Don't** create groups without `w`/`h` or `bounds: 'hug'` when used as layout containers -- defaults to 0×0, children invisible.
- **Don't** let `below()` chains accumulate beyond safe zone. Total budget: 990 − 90 = 900px. Verify last element bottom ≤ 990.
- **Don't** assume `w: 'fill'` equals parent width -- padding and siblings reduce it. Check `window.sk.layouts[N].elements['id'].resolved.w`.
- **Don't** use unencoded special characters in SVG data URIs -- use `encodeURIComponent()`.
- **Don't** use tight gaps (< 30px) after large visuals -- captions look cramped. Use `max(30px, 1.5× caption font size)`.
- **Do** for 3+ column layouts, compute positions explicitly instead of `hstack()` -- eliminates false-positive overlaps: `cardW = (safe.w - gap*(cols-1)) / cols; x = safe.x + col*(cardW+gap)`.
- **Do** when `panel([child1, child2])` causes false overlaps, flatten to single `el()` with inline HTML.
- **Do** fill the safe zone width with cards -- narrow cards waste space and trigger `content-clustering`.
- **Do** use `textAlign` matching positioning direction: `leftOf()` → `textAlign: 'right'`, `rightOf()` → `textAlign: 'left'`.
- **Do** use `layer: 'bg'` for full-bleed backgrounds and images. Without it, they render on content layer and occlude text.
- **Do** use semi-transparent background fills with opacity >= 0.25 for sufficient text contrast (e.g., `rgba(10,10,26,0.75)` not `rgba(10,10,26,0.10)`).

---

## Pre-Commit Checklist

- `text-overflow`: all text visible? `scrollHeight ≤ clientHeight`
- `canvas-overflow`: all elements within 1920×1080?
- Safe zone: content-layer elements within x:120–1800, y:90–990?
- No unintended sibling overlaps
- Gaps ≥ 8px between text elements
- Contrast ≥ 4.5:1 for body text
- `textAlign` matches direction (`leftOf` → `right`, `rightOf` → `left`)
- CSS props inside `style: {}`, not top level
- Related moving elements wrapped in `group()`
- `dash` is SVG string (`"5 5"`), not CSS (`"6,4"`)
- `between` elements fit in the gap

---

## Slide File Structure

A typical SlideKit slide file imports from the SlideKit bundle and exports a slide definition:

```js
import { init, safeRect, splitRect, el, group, vstack, hstack, panel, connect,
         below, above, rightOf, leftOf, centerIn, between,
         alignTopWith, alignLeftWith, centerHWith, centerVWith,
         centerHOnSlide, centerVOnSlide, matchWidthOf, matchHeightOf, matchMaxWidth, matchMaxHeight,
         alignTop, distributeH, matchWidth,
         render, enableKeyboardToggle } from './slidekit.bundle.js';

await init({ fonts: [{ family: 'Inter', weights: [400, 600, 700] }] });
const safe = safeRect();

const slides = [
  { id: 'slide-1', background: '#0a0a1a', elements: [ /* ... */ ] },
  // more slides...
];
await render(slides);
```

Import only the functions you use. All positioning helpers (`below`, `rightOf`, etc.) and transforms (`alignTop`, `distributeH`, etc.) are named exports.

---

## Micro-Recipes

> **Note:** All recipes below assume `const safe = safeRect()` has been called after `init()`.

### 1. Two-Column Split with Title

```js
const safe = safeRect();
const { left, right } = splitRect(safe, { ratio: 0.55, gap: 40 });
export default {
  id: 'two-col', background: '#0a0a1a',
  elements: [
    el('<h2 style="font:700 48px Inter;color:#fff">Key Insight</h2>',
      { id: 'heading', x: safe.x, y: safe.y, w: safe.w }),
    el('<p style="font:400 24px/1.5 Inter;color:#ccc">Left column body text.</p>',
      { id: 'left-body', x: left.x, y: below('heading', 'lg'), w: left.w }),
    el('<div style="width:100%;height:100%;background:url(\'./diagram.png\') center/contain no-repeat">', {
      id: 'right-img', x: right.x, y: below('heading', 'lg'), w: right.w, h: 500 }),
  ],
};
```

### 2. Vertical Stack

```js
export default {
  id: 'stacked', background: '#0a0a1a',
  elements: [
    vstack([
      el('<h2 style="font:700 44px Inter;color:#fff">Section Title</h2>', { w: 1200 }),
      el('<p style="font:400 24px/1.5 Inter;color:#ccc">First paragraph.</p>', { w: 1200 }),
      el('<p style="font:400 24px/1.5 Inter;color:#ccc">Second paragraph.</p>', { w: 1200 }),
    ], { id: 'content-stack', x: safe.x, y: safe.y, gap: 'md' }),
  ],
};
```

### 3. Explicit Multi-Column Cards (Lint-Friendly)

```js
// Prefer this over hstack/cardGrid -- linter can resolve each panel's position.
const cols = 3, gap = 24;
const cardW = (safe.w - gap * (cols - 1)) / cols;
const elements = cards.map((card, i) =>
  panel([
    el(`<h3 style="font:600 28px Inter;color:#fff">${card.title}</h3>`, { w: 'fill' }),
    el(`<p style="font:400 20px Inter;color:#ccc">${card.body}</p>`, { w: 'fill' }),
  ], {
    id: `card-${i}`, x: safe.x + i * (cardW + gap), y: 200,
    w: cardW, padding: 'lg', gap: 'sm', fill: 'rgba(255,255,255,0.06)', radius: 12,
  })
);
```

### 4. Connector Diagram

```js
// Three fixed-size diagram nodes with labeled connectors.
// h is set intentionally here — these are diagram boxes, not free-flowing text.
el('<p style="font:600 24px Inter;color:#fff;text-align:center">Client</p>',
  { id: 'n-a', x: 300, y: 400, w: 200, h: 80,
    style: { background: '#1a1a3e', borderRadius: '8px' }, vAlign: 'center' }),
el('<p style="font:600 24px Inter;color:#fff;text-align:center">Server</p>',
  { id: 'n-b', x: 860, y: 400, w: 200, h: 80,
    style: { background: '#1a1a3e', borderRadius: '8px' }, vAlign: 'center' }),
el('<p style="font:600 24px Inter;color:#fff;text-align:center">Database</p>',
  { id: 'n-c', x: 1420, y: 400, w: 200, h: 80,
    style: { background: '#1a1a3e', borderRadius: '8px' }, vAlign: 'center' }),
connect('n-a', 'n-b', { arrow: 'end', color: '#4caf50',
  label: 'REST', labelStyle: { size: 14, color: '#aaa', font: 'monospace' } }),
connect('n-b', 'n-c', { arrow: 'end', color: '#2196f3',
  label: 'SQL', labelStyle: { size: 14, color: '#aaa', font: 'monospace' } }),
```

### 5. Transforms (Align + Distribute)

```js
export default {
  id: 'transform-demo', background: '#0a0a1a',
  elements: [
    el('<p style="font:600 24px Inter;color:#fff;text-align:center">A</p>',
      { id: 'box-a', x: safe.x, y: 300, w: 240, style: { background: '#1a1a3e' }, vAlign: 'center' }),
    el('<p style="font:600 24px Inter;color:#fff;text-align:center">B</p>',
      { id: 'box-b', x: 600, y: 350, w: 240, style: { background: '#1a1a3e' }, vAlign: 'center' }),
    el('<p style="font:600 24px Inter;color:#fff;text-align:center">C</p>',
      { id: 'box-c', x: 1200, y: 280, w: 240, style: { background: '#1a1a3e' }, vAlign: 'center' }),
  ],
  transforms: [
    alignTop(['box-a', 'box-b', 'box-c']),
    matchWidth(['box-a', 'box-b', 'box-c']),
    distributeH(['box-a', 'box-b', 'box-c']),
  ],
};
```

### 6. Full-Bleed Hero with Text Overlay

```js
el('<div style="width:100%;height:100%;background:url(\'./hero.png\') center/cover;opacity:0.7">', {
  id: 'bg', x: 0, y: 0, w: 1920, h: 1080, layer: 'bg',
});
el('<h1 style="font:700 72px Inter;color:#fff">Bold Statement</h1>', {
  id: 'headline', x: safe.x, y: safe.y + safe.h - 280, w: 800,
});
el('<p style="font:400 28px Inter;color:rgba(255,255,255,0.8)">Supporting context below.</p>', {
  id: 'subtitle', x: safe.x, y: below('headline', 'sm'), w: 700,
});
```

Position text in the lower-left corner for visual weight. Control image brightness via `opacity`.

### 7. Big Stat Callout

```js
el('<p style="font:700 160px Inter;color:#00d4ff;text-align:center;letter-spacing:-4px;line-height:1">4.2B</p>', {
  id: 'number', x: safe.x, y: safe.y + 160, w: safe.w,
});
el('<p style="font:700 36px Inter;color:#fff;text-align:center;text-transform:uppercase;letter-spacing:4px">Events Processed Daily</p>', {
  id: 'label', x: safe.x, y: below('number', 'md'), w: safe.w,
});
el('<p style="font:400 24px Inter;color:rgba(255,255,255,0.6);text-align:center">Across 140+ data centers worldwide</p>', {
  id: 'context', x: safe.x + 200, y: below('label', 'sm'), w: safe.w - 400,
});
```

### 8. Centered Floating Card

```js
const cardW = 720;
const centered = centerIn(safe);
el('<div style="width:100%;height:100%;background:url(\'./bg.png\') center/cover;opacity:0.5">', {
  id: 'bg', x: 0, y: 0, w: 1920, h: 1080, layer: 'bg',
});
panel([
  el('<h2 style="font:700 40px Inter;color:#fff;text-align:center">Key Takeaway</h2>', { w: 'fill' }),
  el('<p style="font:400 22px/1.5 Inter;color:#ccc;text-align:center">The main point distilled.</p>', { w: 'fill' }),
], {
  id: 'card', x: centered.x, y: centered.y, w: cardW, anchor: 'cc',
  padding: 40, gap: 20, fill: 'rgba(10,10,26,0.92)', radius: 20,
  shadow: 'lg', border: '1px solid rgba(255,255,255,0.08)',
});
```

Use `anchor: 'cc'` with `centerIn()` coordinates for perfect centering.

### 9. Process Flow with Connectors

```js
const steps = ['Ingest', 'Transform', 'Validate', 'Deploy'];
const boxW = 280;
const totalGap = safe.w - steps.length * boxW;
const gap = totalGap / (steps.length - 1);
const boxY = 400;

steps.forEach((step, i) => {
  const boxX = safe.x + i * (boxW + gap);
  panel([
    el(`<p style="font:700 28px Inter;color:#fff;text-align:center">${step}</p>`, { w: 'fill' }),
  ], {
    id: `step${i}`, x: boxX, y: boxY, w: boxW,
    padding: 24, fill: 'rgba(255,255,255,0.06)', radius: 12,
    border: '1px solid rgba(255,255,255,0.1)',
  });
});
// Connect adjacent boxes with curved arrows
steps.slice(0, -1).forEach((_, i) =>
  connect(`step${i}`, `step${i+1}`, {
    type: 'curved', fromAnchor: 'cr', toAnchor: 'cl',
    color: '#00d4ff', thickness: 2, arrow: 'end',
  })
);
```

Omit `h` on panels -- let content auto-size. Use `fromAnchor: 'cr'` / `toAnchor: 'cl'` for horizontal flow.

---

## Key Types

### String Unions

| Type | Values |
|------|--------|
| `AnchorPoint` | `"tl"` `"tc"` `"tr"` `"cl"` `"cc"` `"cr"` `"bl"` `"bc"` `"br"` |
| `LayerName` | `"bg"` `"content"` `"overlay"` |
| `VAlign` | `"top"` `"center"` `"bottom"` |
| `HAlign` | `"left"` `"center"` `"right"` `"stretch"` |
| `HStackAlign` | `"top"` `"middle"` `"bottom"` `"stretch"` |
| `OverflowPolicy` | `"visible"` `"warn"` `"clip"` `"error"` |
| `ConnectorType` | `"straight"` `"curved"` `"elbow"` `"orthogonal"` |
| `ArrowType` | `"none"` `"end"` `"start"` `"both"` |
| `ShadowPreset` | `"sm"` `"md"` `"lg"` `"xl"` `"glow"` |
| `ElementType` | `"el"` `"group"` `"vstack"` `"hstack"` `"connector"` |
| `CompoundType` | `"panel"` `"figure"` |
| `ProvenanceSource` | `"authored"` `"measured"` `"stack"` `"constraint"` `"transform"` `"default"` |

### Data Types

| Type | Description |
|------|-------------|
| `Rect` | `{ x, y, w, h }` -- axis-aligned rectangle |
| `Point` | `{ x, y }` -- 2D point |
| `PositionValue` | `number \| string \| RelMarker` -- valid for `x`/`y` props |
| `SizeValue` | `number \| string` -- valid for `w`/`h` props |
| `RelMarker` | `{ _rel, ref?, gap?, bias?, axis?, rect? }` -- returned by positioning/dimension constraint helpers |
| `TransformMarker` | `{ _transform, _transformId, ids, options }` -- returned by transform functions |

### Element Types

| Type | Description |
|------|-------------|
| `SlideElement` | Union: `ElElement \| GroupElement \| VStackElement \| HStackElement \| ConnectorElement \| PanelElement \| FigureElement` |
| `ElElement` | `{ type: "el", id, content, props }` |
| `GroupElement` | `{ type: "group", id, children, props }` |
| `VStackElement` | `{ type: "vstack", id, children, props }` |
| `HStackElement` | `{ type: "hstack", id, children, props }` |
| `ConnectorElement` | `{ type: "connector", id, props: ConnectorProps }` |
| `PanelElement` | `GroupElement` with `_compound: "panel"` |
| `FigureElement` | `GroupElement` with `_compound: "figure"` |

### Configuration & Layout Types

| Type | Description |
|------|-------------|
| `SlideKitConfig` | `{ slide: SlideDimensions, safeZone: SafeZone, strict, minFontSize, fonts, spacing }` |
| `FontDef` | `{ family, weights?, source? }` |
| `SpacingScale` | `{ xs?, sm?, md?, lg?, xl?, section?, [key]: number }` |
| `SlideDefinition` | `{ id?, background?, elements: SlideElement[], transforms?: TransformMarker[], notes? }` |
| `LayoutResult` | `{ elements: Record<string, SceneElement>, rootIds, transforms, warnings, errors, collisions }` |
| `SceneElement` | Fully resolved element: `{ id, type, authored, resolved: Rect, localResolved: Rect, parentId, children, provenance }` |
| `LintFinding` | `{ rule, severity, elementId, message, detail?, bounds?, suggestion?, slideId? }` |
| `Collision` | `{ elementA, elementB, overlapRect: Rect, overlapArea }` |
| `ElementProps` | Common properties interface (all fields from [Common Element Props](#common-element-props)) |
| `ConnectorProps` | Connector-specific properties interface (all fields from [connect](#connectfromid-toid-props)) |

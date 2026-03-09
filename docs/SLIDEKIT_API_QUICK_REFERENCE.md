# SlideKit API Quick Reference

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
- **Never set `h` on text elements** -- auto-measurement handles height. Setting `h` is the leading cause of text-overflow bugs.
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

### `figure(opts?)`

```ts
figure(opts?: FigureInputProps): FigureElement
```

Image with optional caption. Returns group: `{id}-bg`, `{id}-img`, optionally `{id}-caption`.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `src` | `string` | `""` | Image source URL |
| `w` | `number` | `0` | Container width |
| `h` | `number` | `0` | Container height |
| `containerFill` | `string` | `"transparent"` | Background fill |
| `containerRadius` | `number \| string` | `0` | Border radius |
| `containerPadding` | `number \| string` | `0` | Padding around image |
| `caption` | `string` | -- | HTML caption string |
| `captionGap` | `number \| string` | `0` | Gap between container and caption |
| `fit` | `string` | `"contain"` | CSS `object-fit` for the image |

Plus `id`, `x`, `y`, `anchor`, `layer`, `style` from common props.

**Gotcha:** **Avoid `anchor: 'tc'` on `figure()`** -- the linter resolves children at raw group-relative coordinates and reports false overflow. Use `anchor: 'tl'` and compute centered x manually: `x: 960 - w/2`.

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
| `x`, `y` | `number \| string \| RelMarker` | `0` | Accepts px, %, `"safe:N%"`, or relative marker |
| `w` | `number \| string` | -- | **Required for text.** Accepts px, %, `"fill"` |
| `h` | `number \| string` | -- | **Never set on text -- auto-measured.** |
| `maxW`, `maxH` | `number` | -- | Max dimension constraints |
| `anchor` | `AnchorPoint` | `"tl"` | Which point sits at (x, y) |
| `layer` | `LayerName` | `"content"` | `"bg"`, `"content"`, `"overlay"` |
| `vAlign` | `VAlign` | `"top"` | Content vertical alignment within box |
| `overflow` | `OverflowPolicy` | `"visible"` | `"visible"`, `"warn"`, `"clip"`, `"error"` |
| `style` | `object` | `{}` | CSS pass-through (see [Styling Rules](#styling-rules)) |
| `opacity` | `number` | `1` | 0--1 |
| `rotate` | `number` | -- | Degrees |
| `z` | `number` | -- | Z-order within layer (higher = front) |
| `className` | `string` | `""` | CSS class name(s) |
| `shadow` | `string` | -- | Preset name or CSS `box-shadow` |
| `allowOverlap` | `boolean` | `false` | Suppresses linter overlap checks |

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

### Adjacency -- `(refId, opts?: { gap? }) => RelMarker`

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

### Other

- `centerIn(rect: Rect): { x: RelMarker, y: RelMarker }` -- centers on both axes (use with `safeRect()`)
- `placeBetween(topRef, bottomYOrRef, opts?: { bias? }): RelMarker` -- positions between two refs. `bias` default `0.35`. **Falls back silently if element doesn't fit.**

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

## Slide Definition & Rendering

```ts
{ id?, background?, elements: SlideElement[], transforms?: TransformMarker[], notes? }
```

```ts
render(slides: SlideDefinition[]): Promise<{ sections: HTMLElement[], layouts: LayoutResult[] }>
```

After rendering: `window.sk.lint(slideId)`, `window.sk.lintDeck()`, `window.sk.layouts[i].elements`.

---

## Critical Rules (Do Not Violate)

1. **Never set `h` on text elements** -- let auto-measurement handle height.
2. **Always set `w` on text elements** -- without width, text won't wrap and measurement fails.
3. **Don't spread positioning functions** -- `...below(ref)` breaks; use `y: below(ref)`.
4. **Use `id` on any element referenced** by positioning helpers, transforms, or connectors.
5. **Style properties are filtered** -- blocked props are silently dropped (see table above).
6. **Spacing tokens are strings** -- `gap: "md"` not `gap: md`.
7. **Never cross axes** with alignment helpers -- `alignTopWith` is Y, `alignLeftWith` is X.
8. **CSS properties go inside `style: {}`** -- top-level CSS props are auto-promoted with warnings.
9. **`dash` on connectors is SVG format** -- `"5 5"` (space-separated), not `"5,5"`.
10. **Inline text styles on HTML elements** -- the linter reads font-size from the DOM text node, not the container.

---

## Micro-Recipes

### 1. Two-Column Split with Title

```js
// Setup: const safe = safeRect();
// const { left, right } = splitRect(safe, { ratio: 0.55, gap: 40 });
export default {
  id: 'two-col', background: '#0a0a1a',
  elements: [
    el('<h2 style="font:700 48px Inter;color:#fff">Key Insight</h2>',
      { id: 'heading', x: safe.x, y: safe.y, w: safe.w }),
    el('<p style="font:400 24px/1.5 Inter;color:#ccc">Left column body text.</p>',
      { id: 'left-body', x: left.x, y: below('heading', { gap: 'lg' }), w: left.w }),
    figure({ id: 'right-img', src: 'assets/diagram.png',
      x: right.x, y: below('heading', { gap: 'lg' }), w: right.w, h: 500, fit: 'contain' }),
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

### 4. Figure with Caption

```js
figure({
  id: 'chart', src: 'assets/chart.png',
  x: 960 - 450, y: below('title', { gap: 'lg' }), w: 900, h: 500,
  containerFill: '#f8f9fa', containerRadius: 10, containerPadding: 10,
  fit: 'contain',
  caption: '<p style="font:400 18px Inter;color:#888">Figure 1: Results</p>',
  captionGap: 12,
})
```

### 5. Connector Diagram

```js
// Three nodes with labeled connectors
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

### 6. Transforms (Align + Distribute)

```js
// Three boxes aligned and evenly distributed across the safe zone
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
    alignTop(['box-a', 'box-b', 'box-c']),          // snap all to same y
    matchWidth(['box-a', 'box-b', 'box-c']),         // equalize widths
    distributeH(['box-a', 'box-b', 'box-c']),        // even horizontal spacing
  ],
};
```

---

## Key Types

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
| `Rect` | `{ x, y, w, h }` (all `number`) |

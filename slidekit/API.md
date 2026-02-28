# SlideKit API Reference

> **Read [OVERVIEW.md](OVERVIEW.md) first** for conceptual understanding — what SlideKit is, why it exists, and how the three-phase pipeline (specification, layout solve, render) works.

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

## Element Primitives

### `el(html, props?)`

The single element primitive. Creates a positioned HTML element on the canvas. The `html` parameter is rendered via `innerHTML` and can contain any HTML — text, images, empty divs for shapes, or complex markup.

```js
import { el } from './slidekit.js';

// Text
const title = el(
  '<p style="font:700 52px/1.1 Inter;color:#fff;text-align:center">Hello World</p>',
  { id: 'title', x: 960, y: 400, w: 800, anchor: 'tc' }
);

// Image
const hero = el(
  '<img src="hero.jpg" style="width:100%;height:100%;object-fit:cover">',
  { id: 'hero', x: 0, y: 0, w: 1920, h: 1080, layer: 'bg' }
);

// Rectangle / card
const card = el('', {
  id: 'card',
  x: 200, y: 300, w: 500, h: 280,
  style: {
    background: 'rgba(255,255,255,0.06)',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.15)',
  },
});

// Rule / divider
const accent = el('', {
  id: 'accent',
  x: 120, y: 400, w: 80, h: 3,
  style: { background: '#7c5cbf' },
});
```

**Returns:** `{ id, type: "el", content: html, props }`

| Property | Type | Default | Description |
|---|---|---|---|
| `id` | string | auto (`sk-N`) | Unique element identifier |
| `x` | number | `0` | X position (or relative positioning marker) |
| `y` | number | `0` | Y position (or relative positioning marker) |
| `w` | number | — | Width in pixels. If omitted, auto-computed from content measurement. |
| `h` | number | — | Height in pixels. If omitted, auto-computed from content measurement. |
| `anchor` | string | `"tl"` | Anchor point — see [Anchor System](#anchor-system) |
| `layer` | string | `"content"` | Render layer: `"bg"`, `"content"`, or `"overlay"` |
| `opacity` | number | `1` | Element opacity (0–1) |
| `rotate` | number | — | Rotation in degrees |
| `overflow` | string | `"visible"` | Overflow policy: `"visible"` or `"clip"` |
| `style` | object | `{}` | CSS pass-through properties (applied to the container div) |
| `className` | string | `""` | CSS class name(s) |

**Overflow policies:**

- `"visible"` (default) — renders fully, no warning
- `"clip"` — sets CSS `overflow: hidden` on the element

**How `el()` replaces the v1 primitives:**

- **Text:** Put styled text in the HTML string. `el('<p style="font:700 52px Inter;color:#fff">Title</p>', { x, y, w })`
- **Images:** Use an `<img>` tag. `el('<img src="photo.jpg" style="width:100%;height:100%;object-fit:cover">', { x, y, w, h })`
- **Rectangles:** Pass empty HTML with `style`. `el('', { x, y, w, h, style: { background: '#1a1a3e', borderRadius: '12px' } })`
- **Rules/dividers:** A thin empty `el()`. `el('', { x, y, w: 80, h: 3, style: { background: '#7c5cbf' } })`

---

### `group(children, props?)`

Creates a container that gives its children a shared coordinate origin. Moving the group moves everything inside it.

```js
import { group, el } from './slidekit.js';

const card = group([
  el('', { x: 0, y: 0, w: 400, h: 200, style: { background: '#1a1a3e' } }),
  el('<p style="font:600 28px Inter;color:#fff">Card Title</p>', { x: 20, y: 20, w: 360 }),
], {
  id: 'my-card',
  x: 500, y: 300,
});
```

**Returns:** `{ id, type: "group", children, props }`

| Property | Type | Default | Description |
|---|---|---|---|
| `children` | Array | — | Child elements (positioned relative to group origin) |
| `scale` | number | `1` | Scale factor |
| `clip` | boolean | `false` | Whether to clip children to group bounds |
| `bounds` | string | — | Set to `"hug"` to auto-compute w/h from children's bounding box |

Plus all [common properties](#common-properties).

#### `bounds: 'hug'`

When `bounds` is set to `"hug"`, the group's width and height are automatically computed from the bounding box of its children during layout Phase 1. This is useful when you want the group to tightly wrap its contents without specifying explicit dimensions.

```js
const badge = group([
  el('', { x: 0, y: 0, w: 120, h: 40, style: { background: '#7c5cbf', borderRadius: '20px' } }),
  el('<p style="font:600 16px Inter;color:#fff;text-align:center">NEW</p>', { x: 10, y: 8, w: 100 }),
], {
  id: 'badge',
  x: 800, y: 200,
  bounds: 'hug',  // group w=120, h=40 (computed from children)
});
```

The computed size is the axis-aligned bounding box of all children with resolved (non-relative) positions. Children using `_rel` markers that are unresolved at Phase 1 are skipped. Compound groups (panels, figures) are also skipped — they manage their own sizing.

---

### Common Properties

All element types share these properties via `COMMON_DEFAULTS`:

| Property | Type | Default | Description |
|---|---|---|---|
| `id` | string | auto (`sk-N`) | Unique identifier. Auto-generated if not provided. |
| `x` | number | `0` | X position on the 1920x1080 canvas |
| `y` | number | `0` | Y position (or a relative positioning marker) |
| `anchor` | string | `"tl"` | Which point of the element sits at (x, y) |
| `layer` | string | `"content"` | Render layer: `"bg"`, `"content"`, `"overlay"` |
| `opacity` | number | `1` | Element opacity (0–1) |
| `style` | object | `{}` | CSS pass-through properties (fresh object per element) |
| `className` | string | `""` | CSS class name(s) to apply |

---

## Measurement

### `measure(html, props?)` — async

Measures how HTML content will render — its actual dimensions — using off-screen DOM measurement. The HTML is rendered in a hidden container with the same constraints and styling that `render()` applies, then `offsetWidth` / `scrollHeight` are read.

```js
import { measure } from './slidekit.js';

const { w, h } = await measure(
  '<p style="font:28px Inter">Hello World</p>',
  { w: 400 }
);
// e.g. { w: 400, h: 34 }
```

**Parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `html` | string | — | HTML content to measure |
| `props.w` | number | — | Constraining width. If omitted, measures natural (unconstrained) width. |
| `props.className` | string | `""` | CSS class(es) to apply to the measurement container |
| `props.style` | object | `{}` | CSS style object to apply to the measurement container (filtered through `filterStyle`) |

**Returns:** `Promise<{ w: number, h: number }>` — measured dimensions in pixels.

**Behavior:**
- Without `props.w`: measures the natural width and height of the content
- With `props.w`: constrains the container to that width and measures the resulting height
- Images inside the HTML are waited on (3-second timeout per image) before reading dimensions
- Results are cached by `(html, w, style, className)` — identical calls return instantly
- The measurement container uses a `data-sk-measure` attribute which triggers a CSS reset: `[data-sk-measure] > * { margin: 0 }`

### `clearMeasureCache()`

Clears the internal measurement cache. Call this if you change fonts or need fresh measurements.

---

## Positioning

### Anchor System

Every element has an `anchor` property that controls what `(x, y)` refers to. Instead of always meaning "top-left corner," you can set the anchor to any of 9 points on the bounding box:

```
tl --- tc --- tr
|              |
cl     cc     cr
|              |
bl --- bc --- br
```

- **First character:** row — `t` (top), `c` (center), `b` (bottom)
- **Second character:** column — `l` (left), `c` (center), `r` (right)

```js
// Center the title horizontally at x=960
el('<p style="font:700 64px Inter;color:#fff;text-align:center">Centered Title</p>',
  { x: 960, y: 400, w: 800, anchor: 'tc' });

// Place a footer at the bottom-center
el('<p style="font:20px Inter;color:rgba(255,255,255,0.5)">Footer</p>',
  { x: 960, y: 1050, anchor: 'bc' });
```

#### `resolveAnchor(x, y, w, h, anchor)`

Converts anchor-relative coordinates to CSS top-left position.

**Parameters:** `x`, `y` (number), `w`, `h` (number), `anchor` (string)

**Returns:** `{ left, top }` — CSS pixel position for the element's top-left corner.

---

### Relative Positioning Helpers

Position elements relative to each other. These functions return deferred markers (`_rel` objects) that are resolved during `layout()` using a dependency graph with topological sort. Circular dependencies are detected and reported as errors.

```js
import { el, below, rightOf, alignTopWith, centerHWith } from './slidekit.js';

// Subtitle 24px below the title
el('<p style="font:24px Inter;color:rgba(255,255,255,0.6)">Subtitle</p>',
  { y: below('title', { gap: 24 }), w: 800 });

// Card to the right of the sidebar, aligned to its top edge
el('', {
  x: rightOf('sidebar', { gap: 40 }),
  y: alignTopWith('sidebar'),
  w: 400, h: 300,
  style: { background: '#1a1a3e' },
});

// Centered horizontally with another element
el('', { x: centerHWith('header'), anchor: 'tc', w: 200, h: 100 });
```

#### Position Helpers

| Function | Returns | Resolves To |
|---|---|---|
| `below(refId, { gap? })` | `{ _rel: "below", ref, gap }` | Y = ref's bottom edge + gap |
| `above(refId, { gap? })` | `{ _rel: "above", ref, gap }` | Y = ref's top edge - element's height - gap |
| `rightOf(refId, { gap? })` | `{ _rel: "rightOf", ref, gap }` | X = ref's right edge + gap |
| `leftOf(refId, { gap? })` | `{ _rel: "leftOf", ref, gap }` | X = ref's left edge - element's width - gap |
| `centerVWith(refId)` | `{ _rel: "centerV", ref }` | Y centers element vertically with ref |
| `centerHWith(refId)` | `{ _rel: "centerH", ref }` | X centers element horizontally with ref |
| `alignTopWith(refId)` | `{ _rel: "alignTop", ref }` | Y = ref's top edge |
| `alignBottomWith(refId)` | `{ _rel: "alignBottom", ref }` | Y = ref's bottom edge - element's height |
| `alignLeftWith(refId)` | `{ _rel: "alignLeft", ref }` | X = ref's left edge |
| `alignRightWith(refId)` | `{ _rel: "alignRight", ref }` | X = ref's right edge - element's width |
| `placeBetween(topRef, bottomRef, { bias? })` | `{ _rel: "between", ref, ref2, bias }` | Y centered between two references |

#### `placeBetween(topRef, bottomYOrRef, options?)`

Positions an element vertically between two references — useful for centering content in the gap between a header and a footer, or between two sections.

```js
import { el, placeBetween } from './slidekit.js';

// Center a divider between the heading and the card row
el('', {
  id: 'divider',
  x: 120, y: placeBetween('heading', 'card-row'),
  w: 80, h: 3,
  style: { background: '#7c5cbf' },
  anchor: 'cl',
});

// Bias toward the top (35% from top, 65% from bottom — the default)
el('...', { y: placeBetween('heading', 'card-row', { bias: 0.35 }) });

// Can also use a raw Y number as the second reference
el('...', { y: placeBetween('heading', 900) });
```

**Parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `topRef` | string | — | ID of the element above (uses its bottom edge) |
| `bottomYOrRef` | string\|number | — | ID of the element below (uses its top edge), or a raw Y pixel value |
| `options.bias` | number | `0.35` | 0.0 = flush with top reference, 1.0 = flush with bottom, 0.35 = biased toward top |

**Returns:** `{ _rel: "between", ref, ref2, bias }` — a relative positioning marker resolved during layout.

#### `centerIn(rect)`

Centers an element within a given rectangle. Works on both x and y axes.

```js
import { centerIn, safeRect, el } from './slidekit.js';

const safe = safeRect();
el('<p style="font:700 48px Inter;color:#fff;text-align:center">Centered</p>',
  { ...centerIn(safe), w: 400 });
// Or with a manual rect:
el('<p style="font:28px Inter;color:#fff">Centered</p>',
  { ...centerIn({ x: 200, y: 300, w: 400, h: 200 }), w: 300 });
```

**Parameters:** `rect` — `{ x, y, w, h }`

**Returns:** `{ x: { _rel: "centerIn", rect }, y: { _rel: "centerIn", rect } }` — designed for spread: `{ ...centerIn(rect), w: 400 }` sets both x and y.

> **Note:** Relative positioning markers are only valid on `x` and `y` properties. Using them on `w` or `h` produces an error.

---

### Stack Layouts

Stack primitives arrange children in a vertical or horizontal sequence. They resolve to absolute coordinates during layout — they're syntactic sugar over the coordinate system, not CSS flexbox.

> **Recommended pattern:** Use `vstack` as the primary building block for text columns. Instead of chaining `below()` calls with explicit IDs, put your elements in a vstack and let the stack handle vertical flow. See [vstack-First Pattern](#vstack-first-pattern) below.

#### `vstack(items, props?)`

Stacks items vertically (top to bottom) with configurable gap and alignment.

```js
import { vstack, el } from './slidekit.js';

const content = vstack([
  el('<p style="font:700 32px Inter;color:#fff">Title</p>', { w: 600 }),
  el('', { w: 600, h: 1, style: { background: 'rgba(255,255,255,0.2)' } }),
  el('<p style="font:20px/1.5 Inter;color:rgba(255,255,255,0.7)">Description text here</p>', { w: 600 }),
], {
  id: 'content-stack',
  x: 200, y: 300,
  gap: 16,
  align: 'left',
});
```

**Returns:** `{ id, type: "vstack", children, props }`

| Property | Type | Default | Description |
|---|---|---|---|
| `gap` | number\|string | `0` | Vertical gap between items (px or [spacing token](#spacing-tokens)) |
| `align` | string | `"left"` | Horizontal alignment: `"left"`, `"center"`, `"right"`, `"stretch"` |

If the stack has `w` and a child lacks `w`, the child inherits the stack's width.

#### `hstack(items, props?)`

Stacks items horizontally (left to right) with configurable gap and alignment.

```js
import { hstack, panel } from './slidekit.js';

hstack([
  panel([...], { id: 'card-1', w: 400 }),
  panel([...], { id: 'card-2', w: 400 }),
  panel([...], { id: 'card-3', w: 400 }),
], {
  id: 'card-row',
  x: 120, y: 300,
  gap: 30,
  align: 'top',
});
```

**Returns:** `{ id, type: "hstack", children, props }`

| Property | Type | Default | Description |
|---|---|---|---|
| `gap` | number\|string | `0` | Horizontal gap between items (px or [spacing token](#spacing-tokens)) |
| `align` | string | `"top"` | Vertical alignment: `"top"`, `"middle"`, `"bottom"`, `"stretch"` |

#### `align: 'stretch'`

The `stretch` alignment makes all children in a stack the same size along the cross axis:

- **vstack with `align: 'stretch'`** — all children get the same **width** (the widest child's width, or the stack's authored `w` if set). Auto-height `el()` children are re-measured at the new width so text reflows correctly.
- **hstack with `align: 'stretch'`** — all children get the same **height** (the tallest child's height, or the stack's authored `h` if set).

This is especially useful for card rows where you want equal-height cards:

```js
hstack([
  panel([...], { id: 'card-1', w: 480 }),
  panel([...], { id: 'card-2', w: 480 }),
  panel([...], { id: 'card-3', w: 480 }),
], {
  id: 'cards',
  x: 120, y: 300,
  gap: 'lg',
  align: 'stretch',  // all cards match the tallest
});
```

If a child has an explicit size that differs from the stretch target, a `stretch_override` warning is emitted.

#### vstack-First Pattern

**Prefer `vstack` over chained `below()` for text columns.** When you have a sequence of text elements stacked vertically (eyebrow, headline, subhead, body, etc.), a `vstack` is cleaner and more maintainable than chaining `below()` calls.

**Before — chained `below()` (verbose, fragile):**

```js
el(eyebrow, { id: 's2-eyebrow', x: 120, y: 310, w: 880 });
el(headline, { id: 's2-headline', x: 120, y: below('s2-eyebrow', { gap: 'md' }), w: 880 });
el(subhead,  { id: 's2-subhead',  x: 120, y: below('s2-headline', { gap: 'lg' }), w: 880 });
el(body,     { id: 's2-body',     x: 120, y: below('s2-subhead', { gap: 'sm' }), w: 880 });
```

**After — `vstack` (recommended):**

```js
vstack([
  el(eyebrow, { w: 880 }),
  el(headline, { w: 880 }),
  el(subhead, { w: 880 }),
  el(body, { w: 880 }),
], { id: 's2-text', x: 120, y: 310, gap: 'md' });
```

**Why this is better:**

- **x and starting y declared once** on the vstack, not repeated on every element.
- **Gap is uniform and token-based** — change one value to adjust all spacing.
- **Reordering is drag-and-drop** — move an element in the array without updating ID references or `below()` chains.
- **Children can use `w: 'fill'`** inside panels for automatic width.
- **Pairs with `align: 'stretch'`** in hstacks for equal-height card rows.

**When to still use `below()`:** One-off positioning between unrelated elements that aren't part of a natural vertical sequence. For example, placing a decorative rule between a title block and a card row — `below()` is fine for that single relationship.

---

## Alignment & Distribution

PowerPoint-style alignment and distribution operations. These are placed in the `transforms` array of a slide definition and applied during layout Phase 3, after position resolution.

```js
import { el, alignTop, distributeH, matchWidth } from './slidekit.js';

const slide = {
  elements: [
    el('', { id: 'a', x: 100, y: 200, w: 200, h: 150, style: { background: '#2a2a5e' } }),
    el('', { id: 'b', x: 400, y: 250, w: 180, h: 100, style: { background: '#3a3a6e' } }),
    el('', { id: 'c', x: 700, y: 220, w: 220, h: 130, style: { background: '#4a4a7e' } }),
  ],
  transforms: [
    alignTop(['a', 'b', 'c']),              // Align top edges
    distributeH(['a', 'b', 'c']),            // Equal horizontal gaps
    matchWidth(['a', 'b', 'c']),             // Match widths to widest
  ],
};
```

All transform functions return `{ _transform, _transformId, ids, options }`.

### Alignment Functions

| Function | Behavior | `options.to` Default |
|---|---|---|
| `alignLeft(ids, options?)` | Aligns left edges | Min left edge |
| `alignRight(ids, options?)` | Aligns right edges | Max right edge |
| `alignTop(ids, options?)` | Aligns top edges | Min top edge |
| `alignBottom(ids, options?)` | Aligns bottom edges | Max bottom edge |
| `alignCenterH(ids, options?)` | Aligns horizontal centers | Average horizontal center |
| `alignCenterV(ids, options?)` | Aligns vertical centers | Average vertical center |

All accept `options.to` (number) to specify an explicit alignment target.

### Distribution Functions

#### `distributeH(ids, options?)`

Distributes elements horizontally with equal gaps.

| Option | Type | Default | Description |
|---|---|---|---|
| `startX` | number | leftmost left edge | Start of distribution range |
| `endX` | number | rightmost right edge | End of distribution range |
| `mode` | string | `"equal-gap"` | `"equal-gap"` or `"equal-center"` |

#### `distributeV(ids, options?)`

Same as `distributeH` but vertical. Uses `startY`, `endY`.

### Size Matching Functions

| Function | Behavior |
|---|---|
| `matchWidth(ids)` | Sets all widths to the maximum width |
| `matchHeight(ids)` | Sets all heights to the maximum height |
| `matchSize(ids)` | Sets both width and height to the respective maximums |

### `fitToRect(ids, rect)`

Scales and centers a group of elements to fit within a target rectangle, preserving aspect ratio.

**Parameters:** `ids` (string[]), `rect` — `{ x, y, w, h }`

---

## Styling

### CSS Pass-Through

SlideKit owns layout (position, size, spatial relationships). You own styling (colors, gradients, shadows, fonts, borders, animations). The `style` property on any element accepts raw CSS properties that are passed through to the rendered DOM container.

With `el()`, you have full control over both the container `style` and the inner HTML content's inline styles. The container `style` is for the positioned wrapper div; the HTML content handles its own typography and visual styling.

```js
el('', {
  x: 200, y: 300, w: 500, h: 280,
  style: {
    background: 'linear-gradient(135deg, #1a1a3e, #2a2a5e)',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.1)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
    backdropFilter: 'blur(8px)',
  },
});
```

### Blocked Properties

A small set of CSS properties are blocked from the `style` pass-through because they would conflict with SlideKit's coordinate-based positioning system. Using a blocked property emits a warning with a prescriptive suggestion.

**Layout positioning:**
`position`, `top`, `left`, `right`, `bottom`, `inset`, `insetBlock`, `insetBlockStart`, `insetBlockEnd`, `insetInline`, `insetInlineStart`, `insetInlineEnd`

**Sizing (library owns via w/h props):**
`width`, `height`, `minWidth`, `maxWidth`, `minHeight`, `maxHeight`, `blockSize`, `inlineSize`, `minBlockSize`, `maxBlockSize`, `minInlineSize`, `maxInlineSize`

**Display:**
`display`

**Overflow (library manages via overflow prop):**
`overflow`, `overflowX`, `overflowY`, `overflowBlock`, `overflowInline`

**Margin (breaks absolute positioning):**
`margin`, `marginTop`, `marginRight`, `marginBottom`, `marginLeft`, `marginBlock`, `marginBlockStart`, `marginBlockEnd`, `marginInline`, `marginInlineStart`, `marginInlineEnd`

**Transform (library owns via rotate prop):**
`transform`, `translate`, `rotate`, `scale`

**Containment:**
`contain`, `contentVisibility`

Vendor-prefixed variants of all blocked properties are also blocked.

**Allowed properties** — everything not listed above passes through, including:

- All font properties (`fontFamily`, `fontSize`, `fontWeight`, `fontStyle`, `fontVariant`, etc.)
- Line height, letter spacing, word spacing
- Text properties (`textTransform`, `textIndent`, `textOverflow`, `whiteSpace`, etc.)
- All padding properties
- Box sizing
- Flexbox and grid properties (for styling inner content)
- Writing mode, direction
- Columns
- Line clamping (`-webkit-line-clamp`, `lineClamp`)
- Colors, gradients, shadows, borders, animations, transitions, filters, etc.

### Baseline CSS

SlideKit injects a baseline stylesheet inside every `el()` container. This stylesheet:

1. **Neutralises host framework styles** — Reveal.js (and similar frameworks) apply opinionated CSS to `<p>`, headings, lists, and images. The baseline blocks these from affecting `el()` content.
2. **Ensures measurement/render parity** — The identical baseline is applied in both `measure()` and `render()`, eliminating "split brain" where text measures one size but renders another.
3. **Provides predictable defaults** — LLM authors and humans can reason about styling without hidden inherited rules.

**Baseline defaults applied inside el():**

| Property | Value | Why |
|---|---|---|
| `text-align` | `left` | Prevents framework `text-align: center` inheritance |
| `line-height` | `1.2` | Stable across browsers; presentation-friendly |
| `font-weight` | `400` | Prevents theme heading-weight inheritance |
| `font-style` | `normal` | Clean default |
| `letter-spacing` | `normal` | Prevents theme adjustments |
| `text-transform` | `none` | Prevents theme uppercasing |
| `text-decoration` | `none` | Clean default |
| `white-space` | `normal` | Standard wrapping |
| `box-sizing` | `border-box` | Predictable sizing |
| `margin` on all elements | `0` | Prevents framework margins shifting content |
| `padding` on all elements | `0` | Clean default |
| `font: inherit` on headings | (inherits from root) | Prevents theme heading font-size/weight overrides |
| `max-width/max-height` on media | `none` | Prevents responsive image shrinking |

**Overriding the baseline:** Use inline styles in your HTML content. Inline styles always win over the baseline stylesheet:

```js
// Baseline sets text-align: left, but this overrides it to center:
el('<p style="text-align:center;font:700 52px Inter;color:#fff">Centered Title</p>', {
  id: 'title', x: 960, y: 400, w: 800, anchor: 'tc',
});

// Baseline sets margin: 0, but nested paragraphs can override:
el('<div><p style="margin-bottom:16px">First paragraph</p><p>Second paragraph</p></div>', {
  id: 'content', x: 120, y: 300, w: 600,
});
```

### `className`

Apply CSS classes to elements. Classes can handle any visual styling.

```js
el('<p class="headline">Title</p>', { className: 'text-shadow-soft' });
el('', { className: 'glass-card', w: 400, h: 200 });
```

### `filterStyle(style?, elementType?)`

Filters a style object, removing blocked properties.

**Parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `style` | object | `{}` | The user-provided style object (may use kebab-case or camelCase) |
| `elementType` | string | `"unknown"` | The element type (for context in warnings) |

**Returns:** `{ filtered, warnings }` — filtered CSS object and any warning messages about blocked properties. Each warning includes `type`, `property`, `originalProperty`, `value`, and `suggestion`.

### Shadow Presets

Shadow presets are available via `resolveShadow()` for use in `style.boxShadow`:

| Preset | CSS Value |
|---|---|
| `"sm"` | `0 1px 3px rgba(0,0,0,0.2)` |
| `"md"` | `0 4px 12px rgba(0,0,0,0.3)` |
| `"lg"` | `0 8px 32px rgba(0,0,0,0.4)` |
| `"xl"` | `0 16px 48px rgba(0,0,0,0.5)` |
| `"glow"` | `0 0 40px rgba(124,92,191,0.3)` |

```js
import { resolveShadow } from './slidekit.js';

el('', {
  x: 200, y: 300, w: 400, h: 200,
  style: {
    background: '#1a1a3e',
    boxShadow: resolveShadow('lg'),
  },
});
```

#### `resolveShadow(value)`

Resolves a shadow preset name to its CSS value. If `value` is not a preset name, returns it unchanged.

#### `getShadowPresets()`

Returns a shallow copy of the shadow presets map.

---

## Spacing Tokens

### Token Scale

SlideKit includes a built-in spacing scale that can be used anywhere a gap or padding value is accepted (stacks, panels, `splitRect`, `figure`, etc.). Instead of raw pixel numbers, you can pass a semantic token string.

**Default scale:**

| Token | Pixels | Typical Use |
|---|---|---|
| `"xs"` | 8 | Tight inner spacing |
| `"sm"` | 16 | Compact gaps |
| `"md"` | 24 | Standard gap |
| `"lg"` | 32 | Generous gap |
| `"xl"` | 48 | Section-level spacing |
| `"section"` | 80 | Major section breaks |

```js
vstack([...], { gap: 'md' });          // 24px gap
hstack([...], { gap: 'lg' });          // 32px gap
panel([...], { padding: 'lg', gap: 'sm' }); // 32px padding, 16px gap
```

The scale is customizable via `init()`:

```js
await init({
  spacing: {
    xs: 8, sm: 16, md: 24, lg: 32, xl: 48, section: 80,
    hero: 120,  // custom token
  },
});
```

Custom tokens merge with (and override) the defaults.

### `getSpacing(token)`

Resolves a spacing token to its pixel value. Useful for user-land calculations that need to stay in sync with the configured scale.

```js
import { getSpacing } from './slidekit.js';

getSpacing('md');   // 24
getSpacing('xl');   // 48
getSpacing(100);    // 100 (numbers pass through)
```

**Parameters:** `token` — a spacing token string or a pixel number.

**Returns:** `number` — the resolved pixel value.

**Throws** if the token string is not found in the scale.

---

## Layout & Validation

### `layout(slideDefinition, options?)` — async

The core layout engine. Takes a slide definition, resolves all positions, measures HTML content, detects collisions, validates bounds, and returns a complete scene graph.

```js
import { layout, el, below } from './slidekit.js';

const result = await layout({
  elements: [
    el('<p style="font:700 52px Inter;color:#fff">Title</p>',
      { id: 'title', x: 120, y: 90, w: 800 }),
    el('<p style="font:24px/1.5 Inter;color:rgba(255,255,255,0.7)">Body text</p>',
      { id: 'body', x: 120, y: below('title', { gap: 24 }), w: 800 }),
  ],
  transforms: [],
});

console.log(result.elements);    // scene graph
console.log(result.warnings);    // validation warnings
console.log(result.errors);      // validation errors
console.log(result.collisions);  // overlapping elements
```

**Parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `slideDefinition` | object | — | `{ elements: Array, transforms?: Array }` |
| `options.collisionThreshold` | number | `0` | Minimum overlap area (px^2) to report |

**Returns:** `{ elements, rootIds, transforms, warnings, errors, collisions }`

#### The Scene Graph (`elements`)

A map of `id -> SceneElement`. Each element contains:

```js
{
  id: "title",
  type: "el",
  authored: {
    type: "el",
    content: '<p style="font:700 52px Inter;color:#fff">Title</p>',
    props: { /* original props as authored */ },
  },
  resolved: {
    x: 120,    // final top-left x (after anchor resolution)
    y: 90,     // final top-left y
    w: 800,    // final width
    h: 68,     // final height (measured from HTML content)
  },
  localResolved: {
    x: 120,    // position relative to parent (same as resolved for root elements)
    y: 90,
    w: 800,
    h: 68,
  },
  parentId: null,       // ID of parent group/stack, or null for root elements
  children: [],         // ordered array of child IDs (for groups and stacks)
  provenance: {
    x: { source: "authored", value: 120 },
    y: { source: "authored", value: 90 },
    w: { source: "authored", value: 800 },
    h: { source: "measured" },
  },
}
```

#### Hierarchical Scene Model

The scene graph is a hierarchical tree, not a flat list. Each scene element includes:

| Field | Type | Description |
|---|---|---|
| `parentId` | string\|null | ID of the parent group or stack, or `null` for root elements |
| `children` | string[] | Ordered array of child element IDs (for groups and stacks) |
| `localResolved` | object | `{ x, y, w, h }` — position relative to the parent. For root elements, same as `resolved`. For group children, same as `resolved` (already group-relative). For stack children, `resolved` minus the stack's position. |
| `_internal` | boolean | `true` for panel internal elements (background rect, inner vstack) that are implementation details |

The layout result also includes `rootIds` — an ordered array of top-level element IDs with no parent, suitable for tree traversal:

```js
const result = await layout(slide);
console.log(result.rootIds);
// ['title', 'card-row', 'footer']  — only top-level elements

// Walk the tree
function visit(id, depth = 0) {
  const el = result.elements[id];
  console.log('  '.repeat(depth) + id);
  for (const childId of el.children) visit(childId, depth + 1);
}
for (const rootId of result.rootIds) visit(rootId);
```

**Provenance sources:**
- `"authored"` — value came from user-specified props
- `"measured"` — value was computed by HTML measurement
- `"relative"` — value was resolved from a `_rel` marker
- `"stack"` — value was set by a parent vstack/hstack
- `"transform"` — value was modified by a layout transform (contains `original` provenance)

#### Warnings

Structured warning objects with `type`, `elementId`, and `message`. Warning types include:

- `outside_safe_zone` — element extends outside the safe zone
- `slide_bounds_violation` — element extends outside the slide canvas
- `content_cluster_sparse` — too little content density
- `content_cluster_dense` — too much content density
- `stretch_override` — a child's explicit size was overridden by `align: 'stretch'`
- `panel_overflow` — panel content exceeds the panel's authored height (see [Panel Overflow Warnings](#panel-overflow-warnings))
- `dom_overflow_y` / `dom_overflow_x` — post-render DOM overflow detected (see [DOM Overflow Detection](#dom-overflow-detection))

**Layer-aware warning suppression:** Elements on `layer: 'bg'` are exempt from safe zone checks. Full-bleed backgrounds are expected to extend beyond the safe zone. If you have a content element that intentionally exceeds the safe zone, set `layer: 'bg'` to silence the warning.

#### Panel Overflow Warnings

When a panel has an explicit `h` and its content (children + padding) exceeds that height, a `panel_overflow` warning is emitted:

```js
{
  type: "panel_overflow",
  elementId: "my-card",
  contentHeight: 340,     // actual content height
  authoredHeight: 280,    // the h you set
  overflow: 60,           // how many pixels over
  message: "Panel 'my-card' content (340px) exceeds authored height (280px) by 60px. Remove explicit h to let panel size to content.",
}
```

**Fix:** Remove the explicit `h` from the panel to let it auto-size, or increase `h` to accommodate the content.

#### Errors

Structured error objects. In strict mode (`init({ strict: true })`), safe zone and slide bounds violations become errors instead of warnings. Additional error types:

- `circular_dependency` — circular reference chain in relative positioning
- `unresolved_reference` — `_rel` marker references a non-existent element ID
- `invalid_rel_on_dimension` — `_rel` marker used on `w` or `h` (only valid on `x`/`y`)

#### Collisions

Array of collision objects:

```js
{
  elementA: "box-1",
  elementB: "box-2",
  overlapArea: 4800,   // px^2
  overlapRect: { x: 200, y: 300, w: 80, h: 60 },
}
```

Collision detection operates per-layer — elements on different layers don't collide.

#### Layout Pipeline

1. **Phase 1 — Intrinsic Sizes:** Measures HTML content via `measure()`, resolves stack sizes bottom-up, resolves percentage strings, handles panel auto-height, computes `bounds: 'hug'` group sizes
2. **Phase 2 — Positions:** Builds dependency graph from `_rel` markers (including `placeBetween`), topological sort (Kahn's algorithm), resolves to absolute coords, applies anchor resolution, positions stack children (including `align: 'stretch'`)
3. **Phase 3 — Transforms:** Applies alignment/distribution/sizing transforms in declaration order
4. **Phase 4 — Finalize:** Builds hierarchical scene model (parentId, children, localResolved, rootIds), resolves connector endpoints, AABB collision detection, safe zone/bounds/clustering validation, panel overflow checks

### Configuration Helpers

#### `safeRect()`

Returns the current safe zone rectangle.

**Returns:** `{ x, y, w, h }` — a copy of the cached safe rectangle.

**Throws** if `init()` has not been called.

```js
const safe = safeRect();
// Default: { x: 120, y: 90, w: 1680, h: 900 }
```

#### `getConfig()`

Returns a deep copy of the current configuration, or `null` if `init()` hasn't been called.

#### `isFontLoaded(family, weight?)`

Returns `true` if the given font/weight combination was successfully loaded during `init()`.

**Parameters:** `family` (string), `weight` (number, default `400`)

#### `getFontWarnings()`

Returns an array of font loading warning objects from the most recent `init()` call.

---

## Rendering

### `render(slides, options?)` — async

Renders an array of slide definitions into the DOM as absolutely-positioned elements inside Reveal.js `<section>` elements.

```js
import { init, render, el } from './slidekit.js';

await init();

const result = await render([
  {
    id: 'slide-1',
    background: '#0c0c14',
    elements: [ /* ... */ ],
    notes: 'Speaker notes for this slide',
  },
]);

// result.layouts[0] — layout result for slide 1
// result.sections[0] — the <section> DOM element
// window.sk — scene model persisted for inspection
```

**Parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `slides` | Array | — | Array of slide definition objects |
| `options.container` | HTMLElement | `.reveal .slides` | Target DOM container |

**Returns:** `{ sections, layouts }`

- `sections` — array of `<section>` DOM elements created
- `layouts` — array of `layout()` results (one per slide)

#### Slide Definition

| Property | Type | Description |
|---|---|---|
| `id` | string | Slide identifier (set as `section.id`) |
| `background` | string | Slide background (color, gradient, or image path) |
| `elements` | Array | Array of SlideKit elements |
| `transforms` | Array | Array of layout transform operations |
| `notes` | string | Speaker notes (rendered as `<aside class="notes">`) |

#### Scene Model

After rendering, `window.sk` contains the persisted scene model:

```js
window.sk = {
  layouts: [ /* layout results per slide */ ],
  slides: [ { id, layout } ],
  _config: { /* current config */ },
};
```

#### Reveal.js Integration

SlideKit renders into Reveal.js `<section>` elements. Background support:

- Solid colors / gradients -> `data-background-color`
- Image paths -> `data-background-image` + `data-background-size="cover"`

Initialize Reveal.js after calling `render()`:

```js
await render(slides);
Reveal.initialize({
  width: 1920, height: 1080, center: false,
  hash: true, slideNumber: true, transition: 'fade',
});
```

#### DOM Overflow Detection

After rendering all slides to the DOM, `render()` performs a post-render check on every `el`-type element. If the browser's actual `scrollHeight` exceeds `clientHeight` (or `scrollWidth` exceeds `clientWidth`) by more than 1px, a warning is appended to that slide's layout result.

This catches cases where the off-screen `measure()` and actual browser rendering diverge — font metric differences, line wrapping variations, or content that grew after measurement.

Warning types:

- `dom_overflow_y` — vertical overflow detected
- `dom_overflow_x` — horizontal overflow detected

```js
{
  type: "dom_overflow_y",
  elementId: "body-text",
  clientHeight: 200,
  scrollHeight: 218,
  overflow: 18,
}
```

These warnings appear in `result.layouts[i].warnings` alongside the layout-phase warnings. A 1px tolerance is used to avoid sub-pixel false positives.

---

## Compound Primitives

### `connect(fromId, toId, props?)`

Creates a connector line between two elements. Rendered as SVG with optional arrowheads and labels. Endpoints are resolved during layout Phase 4 using the referenced elements' resolved positions.

```js
import { connect } from './slidekit.js';

connect('box-a', 'box-b', {
  id: 'conn-1',
  type: 'straight',
  arrow: 'end',
  color: '#7c5cbf',
  thickness: 2,
  fromAnchor: 'cr',   // center-right of box-a
  toAnchor: 'cl',     // center-left of box-b
  label: 'layout()',
  labelStyle: { size: 14, color: 'rgba(255,255,255,0.5)' },
});
```

**Returns:** `{ id, type: "connector", props }`

| Property | Type | Default | Description |
|---|---|---|---|
| `type` | string | `"straight"` | `"straight"`, `"curved"`, or `"elbow"` |
| `arrow` | string | `"end"` | `"none"`, `"start"`, `"end"`, or `"both"` |
| `color` | string | `"#ffffff"` | Line color |
| `thickness` | number | `2` | Line thickness in pixels |
| `dash` | Array\|null | `null` | SVG stroke-dasharray (e.g., `[5, 5]`) |
| `fromAnchor` | string | `"cr"` | Anchor point on the source element |
| `toAnchor` | string | `"cl"` | Anchor point on the target element |
| `label` | string\|null | `null` | Text label at the midpoint |
| `labelStyle` | object | — | `{ size, color, font, weight }` for the label |

**Connector types:**
- `"straight"` — direct line between anchor points
- `"curved"` — cubic bezier with 40% offset along the dominant axis
- `"elbow"` — right-angle path (horizontal -> vertical -> horizontal)

---

### `panel(children, props?)`

Creates a visual container with a background, padding, and vertically stacked children. The "card" pattern that appears constantly in presentations. Internally, `panel()` creates a `group` containing a background `el('')` and a `vstack` of children.

```js
import { panel, el } from './slidekit.js';

panel([
  el('<p style="font:600 28px Inter;color:#fff">Card Title</p>', { w: 'fill' }),
  el('', { w: 'fill', h: 1, style: { background: 'rgba(255,255,255,0.15)' } }),
  el('<p style="font:20px/1.5 Inter;color:rgba(255,255,255,0.65)">Card description goes here.</p>',
    { w: 'fill' }),
], {
  id: 'my-card',
  x: 200, y: 300, w: 480,
  padding: 28, gap: 14,
  style: {
    background: 'rgba(255,255,255,0.06)',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.15)',
  },
});
```

**Returns:** A `group` containing a background `el('')` and a `vstack` of children.

| Property | Type | Default | Description |
|---|---|---|---|
| `children` | Array | — | Child elements |
| `padding` | number | `24` | Internal padding |
| `gap` | number | `16` | Vertical gap between children |
| `w` | number | — | Panel width |
| `h` | number | — | Panel height (auto-computed from children if omitted) |
| `fill` | string | — | Background color/gradient (maps to CSS `background`) |
| `radius` | number\|string | — | Border radius (maps to CSS `borderRadius`) |
| `border` | string | — | CSS border shorthand |

Children with `w: "fill"` have their width set to `panelWidth - 2 * padding`.

---

### `figure(opts)`

Creates a figure element: a background container with an image and optional caption. Returns a `group` containing a background rect, an `<img>` element inset by padding, and an optional caption positioned below the container.

```js
import { figure } from './slidekit.js';

figure({
  id: 'hero-fig',
  src: 'architecture.png',
  x: 800, y: 200, w: 700, h: 500,
  containerFill: 'rgba(255,255,255,0.06)',
  containerRadius: 12,
  containerPadding: 'sm',
  caption: '<p style="font:16px Inter;color:rgba(255,255,255,0.5)">System architecture</p>',
  captionGap: 'xs',
  fit: 'contain',
});
```

**Returns:** A `group` containing a background `el('')`, an image `el`, and an optional caption `el`.

| Property | Type | Default | Description |
|---|---|---|---|
| `src` | string | — | Image source URL (required) |
| `x` | number | `0` | X position |
| `y` | number | `0` | Y position |
| `w` | number | — | Container width (required) |
| `h` | number | — | Container height (required) |
| `anchor` | string | `"tl"` | Anchor point |
| `layer` | string | `"content"` | Render layer |
| `containerFill` | string | `"transparent"` | Background fill color/gradient |
| `containerRadius` | number\|string | `0` | Border radius (number -> px, string -> pass through) |
| `containerPadding` | number\|string | `0` | Padding around the image (px or [spacing token](#spacing-tokens)) |
| `caption` | string | — | Optional HTML caption string |
| `captionGap` | number\|string | `0` | Gap between container bottom and caption (px or spacing token) |
| `fit` | string | `"contain"` | CSS `object-fit` for the image |
| `style` | object | `{}` | Additional style for the group container |

The group's children are assigned IDs based on the figure ID: `{id}-bg`, `{id}-img`, and `{id}-caption`.

---

### `cardGrid(items, props?)`

Arranges items in a grid pattern using nested vstack/hstack. Each row is an `hstack` with `align: 'stretch'` (so cards in the same row share equal height), and rows are stacked vertically with the same gap.

```js
import { cardGrid, panel, el } from './slidekit.js';

const cards = [
  panel([...], { id: 'card-1', w: 480 }),
  panel([...], { id: 'card-2', w: 480 }),
  panel([...], { id: 'card-3', w: 480 }),
  panel([...], { id: 'card-4', w: 480 }),
];

cardGrid(cards, {
  id: 'features',
  cols: 2,
  gap: 'lg',
  x: 120, y: 300,
  w: 1680,
});
// Row 1: card-1, card-2 (stretch to equal height)
// Row 2: card-3, card-4 (stretch to equal height)
```

**Returns:** A `vstack` of `hstack` rows.

| Property | Type | Default | Description |
|---|---|---|---|
| `items` | Array | — | Array of SlideKit elements (children) |
| `id` | string | auto | ID for the outer vstack |
| `cols` | number | `2` | Columns per row |
| `gap` | number\|string | `0` | Gap between items in both directions (px or [spacing token](#spacing-tokens)) |
| `x` | number | `0` | X position |
| `y` | number | `0` | Y position |
| `w` | number | — | Width |
| `anchor` | string | — | Anchor point |
| `layer` | string | — | Render layer |
| `style` | object | — | Style overrides |

Row hstacks are assigned IDs `{id}-row-0`, `{id}-row-1`, etc.

---

## Additional Features

### Grid System

#### `grid(config?)`

Creates a column grid for consistent cross-slide positioning.

```js
import { grid, el } from './slidekit.js';

const g = grid({ cols: 12, gutter: 30 });

// Position elements using grid columns
el('<p style="font:700 48px Inter;color:#fff">Title</p>',
  { x: g.col(1), y: 90, w: g.spanW(1, 8) });
el('', {
  x: g.col(9), y: 200, w: g.spanW(9, 12), h: 300,
  style: { background: '#1a1a3e' },
});

console.log(g.colWidth);    // width of a single column
console.log(g.totalWidth);  // total grid width
```

**Parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `config.cols` | number | `12` | Number of columns |
| `config.gutter` | number | `30` | Gap between columns (px) |
| `config.margin` | object | safe zone margins | `{ left, right }` — grid margins |

**Returns:**

| Property | Type | Description |
|---|---|---|
| `cols` | number | Number of columns |
| `gutter` | number | Gutter width |
| `colWidth` | number | Width of one column |
| `marginLeft` | number | Left margin |
| `marginRight` | number | Right margin |
| `totalWidth` | number | Total grid width (all columns + gutters) |
| `col(n)` | function | X position of column `n` (1-based) |
| `spanW(from, to)` | function | Width spanning columns `from` to `to` (inclusive, 1-based) |

**Throws** if computed `colWidth <= 0`.

---

### `splitRect(rect, options?)`

Splits a rectangle into two sub-rectangles (left and right). A convenience for the common split-layout pattern — text on one side, image on the other.

```js
import { splitRect, safeRect } from './slidekit.js';

const safe = safeRect();
const { left, right } = splitRect(safe, { ratio: 0.55, gap: 'xl' });

// left  = { x: 120, y: 90, w: ~896, h: 900 }
// right = { x: ~968, y: 90, w: ~732, h: 900 }

// Use each sub-rect for positioning
vstack([...], { x: left.x, y: left.y, w: left.w });
figure({ src: 'photo.jpg', x: right.x, y: right.y, w: right.w, h: right.h });
```

**Parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `rect` | object | — | `{ x, y, w, h }` — the rectangle to split |
| `options.ratio` | number | `0.5` | Fraction of usable width allocated to the left side (0–1) |
| `options.gap` | number\|string | `0` | Gap between left and right (px or [spacing token](#spacing-tokens)) |

**Returns:** `{ left: { x, y, w, h }, right: { x, y, w, h } }`

---

### `snap(value, gridSize)`

Rounds a value to the nearest grid increment.

```js
import { snap } from './slidekit.js';

snap(157, 10);   // 160
snap(153, 10);   // 150
snap(100, 0);    // 100 (returns unchanged if gridSize <= 0)
```

**Parameters:** `value` (number), `gridSize` (number)

**Returns:** `number` — nearest multiple of `gridSize`.

---

### Percentage Sugar

#### `resolvePercentage(value, axis)`

Resolves percentage strings to pixel values relative to the slide or safe zone.

```js
import { resolvePercentage } from './slidekit.js';

resolvePercentage('50%', 'x');       // 960  (50% of 1920)
resolvePercentage('50%', 'y');       // 540  (50% of 1080)
resolvePercentage('safe:50%', 'x');  // safeRect().x + 50% of safeRect().w
resolvePercentage('safe:25%', 'w');  // 25% of safeRect().w
resolvePercentage(200, 'x');         // 200  (non-strings pass through)
```

**Syntax:**
- `"N%"` — percentage of slide dimension (w for x/w axis, h for y/h axis)
- `"safe:N%"` — percentage of safe zone (offset + percentage of safe zone dimension for x/y)

Percentage strings on `x`, `y`, `w`, `h` are resolved automatically during layout Phase 1.

---

### `repeat(element, config?)`

Duplicates an element in a grid pattern with configurable offsets.

```js
import { repeat, el } from './slidekit.js';

const dots = repeat(
  el('', { w: 20, h: 20, style: { background: '#7c5cbf', borderRadius: '50%' } }),
  { count: 12, cols: 4, gapX: 40, gapY: 40, startX: 100, startY: 200 }
);
```

**Parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `element` | object | — | SlideKit element to duplicate |
| `config.count` | number | `1` | Number of copies |
| `config.cols` | number | = count | Columns per row |
| `config.gapX` | number | `0` | Horizontal gap between copies |
| `config.gapY` | number | `0` | Vertical gap between copies |
| `config.startX` | number | `0` | Starting X position |
| `config.startY` | number | `0` | Starting Y position |

**Returns:** A `group` containing `count` deep-cloned copies laid out in a row-major grid. Each copy gets ID `{baseId}-{i+1}`, and all nested children are re-ID'd recursively.

---

### `rotatedAABB(w, h, degrees)`

Computes the axis-aligned bounding box of a rotated rectangle. Used internally for collision detection of rotated elements.

**Parameters:** `w` (number), `h` (number), `degrees` (number)

**Returns:** `{ w, h }` — AABB dimensions.

**Formula:** `aabbW = |w*cos(t)| + |h*sin(t)|`, `aabbH = |w*sin(t)| + |h*cos(t)|`

---

## Configuration Reference

### `init(config?)` — async

Full configuration options:

```js
await init({
  slide: { w: 1920, h: 1080 },           // Slide canvas dimensions
  safeZone: {                              // Content-safe margins
    left: 120, right: 120,
    top: 90, bottom: 90,
  },
  strict: false,                           // Strict validation mode
  minFontSize: 24,                         // Projection readability threshold (px)
  spacing: {                               // Spacing token overrides (merged with defaults)
    xs: 8, sm: 16, md: 24, lg: 32, xl: 48, section: 80,
  },
  fonts: [                                 // Fonts to preload
    {
      family: 'Inter',
      weights: [400, 600, 700],
      source: 'google',                    // 'google' injects <link> tags
    },
    {
      family: 'JetBrains Mono',
      weights: [400],
      source: 'google',
    },
  ],
});
```

| Property | Type | Default | Description |
|---|---|---|---|
| `slide.w` | number | `1920` | Slide width in pixels |
| `slide.h` | number | `1080` | Slide height in pixels |
| `safeZone.left` | number | `120` | Left margin |
| `safeZone.right` | number | `120` | Right margin |
| `safeZone.top` | number | `90` | Top margin |
| `safeZone.bottom` | number | `90` | Bottom margin |
| `strict` | boolean | `false` | When `true`, safe zone/bounds violations become errors |
| `minFontSize` | number | `24` | Font sizes below this trigger readability warnings |
| `spacing` | object | see [Spacing Tokens](#spacing-tokens) | Token-to-pixel map. Custom entries merge with defaults. |
| `fonts` | Array | `[]` | `[{ family, weights, source }]` — fonts to preload |

**Returns:** `Promise<object>` — the resolved config.

**Throws** if safe zone margins leave zero or negative usable area.

### `_resetForTests()`

Resets all internal state: config, safe rect, ID counters, loaded fonts, measure cache, and removes injected DOM elements. **Testing only.**

### `resetIdCounter()`

Resets the auto-ID counter to `0`. Called automatically at the start of `layout()` and `render()` for deterministic IDs.

---

## Usage Patterns

### Title Slide

Full-bleed background with centered title, subtitle, and accent rule.

```js
el('<p style="font:700 80px/1.1 Inter;color:#fff;text-align:center">Building Better\nPresentations</p>', {
  id: 'title-text',
  x: 960, y: 340, w: 1200,
  anchor: 'tc',
});

el('', {
  id: 'accent',
  x: 960 - 40, y: below('title-text', { gap: 32 }),
  w: 80, h: 3,
  style: { background: '#7c5cbf' },
});

el('<p style="font:32px Inter;color:rgba(255,255,255,0.6);text-align:center">A coordinate-based approach to slide layout</p>', {
  id: 'subtitle',
  x: 960, w: 800,
  y: below('accent', { gap: 24 }),
  anchor: 'tc',
});
```

### Card Row

Horizontal row of styled panels with equal sizing.

```js
const safe = safeRect();

hstack([
  panel([
    el('<p style="font:600 28px Inter;color:#fff">Title</p>', { w: 'fill' }),
    el('', { w: 'fill', h: 1, style: { background: 'rgba(255,255,255,0.15)' } }),
    el('<p style="font:20px/1.5 Inter;color:rgba(255,255,255,0.65)">Description text here.</p>', { w: 'fill' }),
  ], { id: 'card-1', w: 480, padding: 28, gap: 14, style: { /* ... */ } }),
  // ... more panels
], { id: 'cards', x: safe.x, y: below('heading-rule', { gap: 48 }), gap: 30, align: 'top' });
```

### Relative Positioning

Elements positioned relative to each other using helper functions.

```js
el('', { id: 'anchor-box', x: 200, y: 300, w: 400, h: 200, style: { background: '#2a2a5e' } });

el('', { id: 'below-box', x: 200, y: below('anchor-box', { gap: 24 }), w: 400, h: 120,
  style: { background: '#3a3a6e' } });

el('', {
  id: 'right-box',
  x: rightOf('anchor-box', { gap: 40 }),
  y: alignTopWith('anchor-box'),
  w: 350, h: 200,
  style: { background: '#4a4a7e' },
});

el('', {
  id: 'centered-box',
  x: centerHWith('anchor-box'), anchor: 'tc',
  y: below('below-box', { gap: 40 }),
  w: 300, h: 100,
  style: { background: '#5a5a8e' },
});
```

### Connectors & Flowcharts

Boxes connected with different connector types.

```js
el('', { id: 'step-1', x: 170, y: 300, w: 280, h: 150, style: { background: '#1a1a3e' } });
el('', { id: 'step-2', x: 600, y: 300, w: 280, h: 150, style: { background: '#1a1a3e' } });

connect('step-1', 'step-2', {
  type: 'straight', arrow: 'end',
  color: '#7c5cbf', thickness: 2,
  fromAnchor: 'cr', toAnchor: 'cl',
  label: 'layout()',
  labelStyle: { size: 14, color: 'rgba(255,255,255,0.5)' },
});
```

### Grid Layout

Consistent multi-column positioning with the grid system.

```js
const g = grid({ cols: 12, gutter: 30 });
const safe = safeRect();

el('<p style="font:700 48px Inter;color:#fff">Title</p>',
  { x: g.col(1), y: safe.y, w: g.spanW(1, 8) });

el('', { id: 'sidebar', x: g.col(9), y: 200, w: g.spanW(9, 12), h: 300,
  style: { background: '#1a1a3e' } });

el('', { id: 'full-width', x: g.col(1), y: 570, w: g.spanW(1, 12), h: 120,
  style: { background: '#2a2a5e' } });
```

### Measurement

Measuring HTML content dimensions before placement.

```js
const { w, h } = await measure(
  '<p style="font:28px/1.4 Inter">Some text that may wrap to multiple lines</p>',
  { w: 400 }
);
// Use the measured height to position subsequent elements
el('<p style="font:28px/1.4 Inter">Some text that may wrap to multiple lines</p>',
  { x: 200, y: 300, w: 400, h });
```

### Alignment & Distribution

Transform operations applied after position resolution.

```js
const slide = {
  elements: [
    el('', { id: 'box-a', x: 100, y: 200, w: 200, h: 150, style: { background: '#2a2a5e' } }),
    el('', { id: 'box-b', x: 400, y: 250, w: 180, h: 100, style: { background: '#3a3a6e' } }),
    el('', { id: 'box-c', x: 700, y: 220, w: 220, h: 130, style: { background: '#4a4a7e' } }),
  ],
  transforms: [
    alignTop(['box-a', 'box-b', 'box-c']),
    distributeH(['box-a', 'box-b', 'box-c'], { startX: 200, endX: 1000 }),
    matchWidth(['box-a', 'box-b', 'box-c']),
  ],
};
```

### Safe Zone Validation

Inspecting layout warnings, errors, and collisions.

```js
const layoutResult = await layout(slideDefinition);
console.log(layoutResult.warnings);   // safe zone violations
console.log(layoutResult.errors);     // off-slide elements (strict mode)
console.log(layoutResult.collisions); // overlapping elements
```

### Full Presentation

Multi-slide rendering with speaker notes and backgrounds.

```js
const result = await render([slide1, slide2, slide3]);

Reveal.initialize({
  width: 1920, height: 1080, center: false,
  hash: true, slideNumber: true, transition: 'fade',
});

console.log(`Rendered ${result.layouts.length} slides`);
```

# SlideKit API Reference

> **Read [OVERVIEW.md](OVERVIEW.md) first** for conceptual understanding — what SlideKit is, why it exists, and how the three-phase pipeline (specification → layout solve → render) works.

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

> **Important:** The `bullets()` compound primitive measures text at creation time. Ensure fonts are loaded (via `init()`) before calling `bullets()`.

### Browser Environment

SlideKit requires a browser environment (DOM) for text measurement, font loading, and rendering. It targets Reveal.js as its rendering backend.

---

## Element Primitives

### `text(content, props?)`

Creates a text element.

```js
import { text } from './slidekit.js';

const title = text('Hello World', {
  id: 'title',
  x: 960, y: 400, w: 800,
  anchor: 'tc',
  size: 64, weight: 700, color: '#ffffff',
  align: 'center',
  lineHeight: 1.2,
});
```

**Returns:** `{ id, type: "text", content, props }`

| Property | Type | Default | Description |
|---|---|---|---|
| `id` | string | auto (`sk-N`) | Unique element identifier |
| `x` | number | `0` | X position (or relative positioning marker) |
| `y` | number | `0` | Y position (or relative positioning marker) |
| `w` | number | — | Width in pixels. Text wraps within this width. If omitted, text is measured without constraint. |
| `h` | number | — | Height in pixels. If omitted, auto-computed from text measurement. |
| `anchor` | string | `"tl"` | Anchor point — see [Anchor System](#anchor-system) |
| `layer` | string | `"content"` | Render layer: `"bg"`, `"content"`, or `"overlay"` |
| `opacity` | number | `1` | Element opacity (0–1) |
| `font` | string | `"Inter"` | Font family name |
| `size` | number | `32` | Font size in pixels |
| `weight` | number | `400` | Font weight |
| `fontStyle` | string | `"normal"` | Font style: `"normal"`, `"italic"`, `"oblique"` |
| `fontVariant` | string | `"normal"` | Font variant: `"normal"`, `"small-caps"`, etc. |
| `textTransform` | string | `"none"` | Text transform: `"none"`, `"uppercase"`, `"lowercase"`, `"capitalize"` |
| `color` | string | `"#ffffff"` | Text color |
| `lineHeight` | number | `1.3` | Line height multiplier |
| `letterSpacing` | string | `"0"` | CSS letter-spacing value |
| `wordSpacing` | string | `"normal"` | CSS word-spacing value |
| `align` | string | `"left"` | Text alignment: `"left"`, `"center"`, `"right"` |
| `overflow` | string | `"warn"` | Overflow policy: `"warn"`, `"visible"`, `"clip"`, `"ellipsis"`, `"shrink"`, `"error"` |
| `fit` | object\|null | `null` | Auto-fit configuration (used internally) |
| `maxLines` | number\|null | `null` | Maximum line count |
| `style` | object | `{}` | CSS pass-through properties |
| `className` | string | `""` | CSS class name(s) |

**Overflow policies** (applied when `h` is specified and text exceeds it):

- `"warn"` — renders fully, emits a layout warning
- `"visible"` — renders fully, no warning
- `"clip"` — hides overflow with CSS `overflow: hidden`
- `"ellipsis"` — clips with ellipsis via CSS
- `"shrink"` — auto-reduces font size to fit
- `"error"` — emits a layout error

*(See [text-fitting.js](examples/text-fitting.js) for overflow policy examples)*

---

### `image(src, props?)`

Creates an image element.

```js
import { image } from './slidekit.js';

const photo = image('hero.jpg', {
  id: 'hero',
  x: 0, y: 0, w: 1920, h: 1080,
  fit: 'cover',
  layer: 'bg',
});
```

**Returns:** `{ id, type: "image", src, props }`

| Property | Type | Default | Description |
|---|---|---|---|
| `src` | string | — | Image path or URL |
| `fit` | string | `"cover"` | CSS object-fit: `"cover"`, `"contain"`, `"fill"` |
| `position` | string | `"center"` | CSS object-position value |
| `w` | number | — | Width in pixels |
| `h` | number | — | Height in pixels |
| `style` | object | `{}` | CSS pass-through properties |

Plus all [common properties](#common-properties).

---

### `rect(props?)`

Creates a rectangle element — used for cards, panels, backgrounds, and decorative shapes.

```js
import { rect } from './slidekit.js';

const card = rect({
  id: 'card',
  x: 200, y: 300, w: 500, h: 280,
  style: {
    background: 'rgba(255,255,255,0.06)',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.15)',
  },
});
```

**Returns:** `{ id, type: "rect", props }`

| Property | Type | Default | Description |
|---|---|---|---|
| `fill` | string | `"transparent"` | Background color/gradient (maps to CSS `background`) |
| `radius` | number\|string | `0` | Border radius (maps to CSS `borderRadius`) |
| `border` | string | `"none"` | CSS border shorthand |
| `padding` | number | `0` | Padding (used by `panel()` internals) |

Plus all [common properties](#common-properties).

---

### `rule(props?)`

Creates a horizontal or vertical line for dividers and accents.

```js
import { rule, below } from './slidekit.js';

const divider = rule({
  id: 'accent',
  x: 120, y: below('title', { gap: 16 }),
  w: 80,
  color: '#7c5cbf',
  thickness: 3,
});
```

**Returns:** `{ id, type: "rule", props }`

| Property | Type | Default | Description |
|---|---|---|---|
| `direction` | string | `"horizontal"` | `"horizontal"` or `"vertical"` |
| `thickness` | number | `2` | Line thickness in pixels |
| `color` | string | `"#ffffff"` | Line color |
| `w` | number | — | Length (for horizontal rules) |
| `h` | number | — | Length (for vertical rules) |

Plus all [common properties](#common-properties).

For horizontal rules, `w` is the length and `thickness` is the height. For vertical rules, `h` is the length and `thickness` is the width.

---

### `group(children, props?)`

Creates a container that gives its children a shared coordinate origin. Moving the group moves everything inside it.

```js
import { group, text, rect } from './slidekit.js';

const card = group([
  rect({ x: 0, y: 0, w: 400, h: 200, fill: '#1a1a3e' }),
  text('Card Title', { x: 20, y: 20, w: 360, size: 28, weight: 600 }),
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

Plus all [common properties](#common-properties).

---

### Common Properties

All element types share these properties via `COMMON_DEFAULTS`:

| Property | Type | Default | Description |
|---|---|---|---|
| `id` | string | auto (`sk-N`) | Unique identifier. Auto-generated if not provided. |
| `x` | number | `0` | X position on the 1920×1080 canvas |
| `y` | number | `0` | Y position (or a relative positioning marker) |
| `anchor` | string | `"tl"` | Which point of the element sits at (x, y) |
| `layer` | string | `"content"` | Render layer: `"bg"`, `"content"`, `"overlay"` |
| `opacity` | number | `1` | Element opacity (0–1) |
| `style` | object | `{}` | CSS pass-through properties (fresh object per element) |
| `className` | string | `""` | CSS class name(s) to apply |

---

## Text System

### `measureText(content, props?)`

Measures how text will render — its actual dimensions, line count, and font size — using off-screen DOM measurement. Results are cached by `(content, font, size, weight, lineHeight, letterSpacing, w)`.

```js
import { measureText } from './slidekit.js';

const result = measureText('Hello World', {
  font: 'Inter', size: 32, weight: 400, lineHeight: 1.3, w: 400,
});
// result: { block: { w: 400, h: 42 }, lineCount: 1, fontSize: 32 }
```

**Parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `content` | string | — | Text to measure (supports `\n` line breaks) |
| `props.font` | string | `"Inter"` | Font family |
| `props.size` | number | `32` | Font size in pixels |
| `props.weight` | number | `400` | Font weight |
| `props.fontStyle` | string | `"normal"` | Font style (`"normal"`, `"italic"`, `"oblique"`) |
| `props.fontVariant` | string | `"normal"` | Font variant (`"normal"`, `"small-caps"`, etc.) |
| `props.textTransform` | string | `"none"` | Text transform (`"none"`, `"uppercase"`, `"lowercase"`, `"capitalize"`) |
| `props.lineHeight` | number | `1.3` | Line height multiplier |
| `props.letterSpacing` | string | `"0"` | CSS letter-spacing |
| `props.wordSpacing` | string | `"normal"` | CSS word-spacing |
| `props.w` | number | — | Constraining width. If omitted, text is measured as a single unwrapped line. |

**Returns:** `{ block: { w, h }, lineCount, fontSize, warnings? }`

- **`block.w`** / **`block.h`** — measured dimensions in pixels
- **`lineCount`** — number of lines the text occupies
- **`fontSize`** — the font size used (same as input `size`)

**Behavior:**
- Without `w`: measures as `display: inline-block; white-space: pre` (single line, no wrapping)
- With `w`: measures with `pre-wrap` and `word-break: break-word`
- Line count is computed as `ceil(scrollHeight / (size × lineHeight) - 0.05)`

*(See [text-fitting.js](examples/text-fitting.js) for a working example)*

---

### `fitText(content, box, options?)`

Finds the largest font size that makes `content` fit within `box` using binary search.

```js
import { fitText } from './slidekit.js';

const result = fitText(
  'Auto-fitted text finds the largest font size that fits',
  { w: 500, h: 200 },
  { minSize: 16, maxSize: 72, font: 'Inter', weight: 400 },
);
// result: { fontSize: 38, metrics: { block: {...}, lineCount: 2 }, warnings: [] }
```

**Parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `content` | string | — | Text to fit |
| `box` | object | — | `{ w, h }` — target bounding box |
| `options.font` | string | `"Inter"` | Font family |
| `options.weight` | number | `400` | Font weight |
| `options.fontStyle` | string | `"normal"` | Font style |
| `options.fontVariant` | string | `"normal"` | Font variant |
| `options.textTransform` | string | `"none"` | Text transform |
| `options.lineHeight` | number | `1.3` | Line height multiplier |
| `options.letterSpacing` | string | `"0"` | CSS letter-spacing |
| `options.wordSpacing` | string | `"normal"` | CSS word-spacing |
| `options.minSize` | number | `12` | Minimum font size |
| `options.maxSize` | number | `200` | Maximum font size |
| `options.step` | number | `1` | Binary search resolution (px) |

**Returns:** `{ fontSize, metrics, warnings }`

- **`fontSize`** — the largest size that fits
- **`metrics`** — result of `measureText()` at the fitted size
- **`warnings`** — array of warning objects (e.g., font size below `minFontSize`, text doesn't fit even at `minSize`)

---

### `clearMeasureCache()`

Clears the internal text measurement cache. Call this if you change fonts or need fresh measurements.

---

## Positioning

### Anchor System

Every element has an `anchor` property that controls what `(x, y)` refers to. Instead of always meaning "top-left corner," you can set the anchor to any of 9 points on the bounding box:

```
tl ─── tc ─── tr
│              │
cl     cc     cr
│              │
bl ─── bc ─── br
```

- **First character:** row — `t` (top), `c` (center), `b` (bottom)
- **Second character:** column — `l` (left), `c` (center), `r` (right)

```js
// Center the title horizontally at x=960
text('Centered Title', { x: 960, y: 400, anchor: 'tc', align: 'center' });

// Place a footer at the bottom-center
text('Footer', { x: 960, y: 1050, anchor: 'bc' });
```

#### `resolveAnchor(x, y, w, h, anchor)`

Converts anchor-relative coordinates to CSS top-left position.

**Parameters:** `x`, `y` (number), `w`, `h` (number), `anchor` (string)

**Returns:** `{ left, top }` — CSS pixel position for the element's top-left corner.

---

### Relative Positioning Helpers

Position elements relative to each other. These functions return deferred markers (`_rel` objects) that are resolved during `layout()` using a dependency graph with topological sort. Circular dependencies are detected and reported as errors.

```js
import { text, rule, below, rightOf, alignTopWith, centerHWith } from './slidekit.js';

// Subtitle 24px below the title
text('Subtitle', { y: below('title', { gap: 24 }) });

// Card to the right of the sidebar, aligned to its top edge
rect({ x: rightOf('sidebar', { gap: 40 }), y: alignTopWith('sidebar') });

// Centered horizontally with another element
rect({ x: centerHWith('header'), anchor: 'tc' });
```

*(See [relative-positioning.js](examples/relative-positioning.js) for a complete example)*

#### Position Helpers

| Function | Returns | Resolves To |
|---|---|---|
| `below(refId, { gap? })` | `{ _rel: "below", ref, gap }` | Y = ref's bottom edge + gap |
| `above(refId, { gap? })` | `{ _rel: "above", ref, gap }` | Y = ref's top edge − element's height − gap |
| `rightOf(refId, { gap? })` | `{ _rel: "rightOf", ref, gap }` | X = ref's right edge + gap |
| `leftOf(refId, { gap? })` | `{ _rel: "leftOf", ref, gap }` | X = ref's left edge − element's width − gap |
| `centerVWith(refId)` | `{ _rel: "centerV", ref }` | Y centers element vertically with ref |
| `centerHWith(refId)` | `{ _rel: "centerH", ref }` | X centers element horizontally with ref |
| `alignTopWith(refId)` | `{ _rel: "alignTop", ref }` | Y = ref's top edge |
| `alignBottomWith(refId)` | `{ _rel: "alignBottom", ref }` | Y = ref's bottom edge − element's height |
| `alignLeftWith(refId)` | `{ _rel: "alignLeft", ref }` | X = ref's left edge |
| `alignRightWith(refId)` | `{ _rel: "alignRight", ref }` | X = ref's right edge − element's width |

#### `centerIn(rect)`

Centers an element within a given rectangle. Works on both x and y axes.

```js
import { centerIn, safeRect } from './slidekit.js';

const safe = safeRect();
text('Centered', { ...centerIn(safe), w: 400 });
// Or with a manual rect:
text('Centered', { ...centerIn({ x: 200, y: 300, w: 400, h: 200 }), w: 300 });
```

**Parameters:** `rect` — `{ x, y, w, h }`

**Returns:** `{ _rel: "centerIn", rect }` — resolves x and y to center the element within the rectangle.

> **Note:** Relative positioning markers are only valid on `x` and `y` properties. Using them on `w` or `h` produces an error.

---

### Stack Layouts

Stack primitives arrange children in a vertical or horizontal sequence. They resolve to absolute coordinates during layout — they're syntactic sugar over the coordinate system, not CSS flexbox.

#### `vstack(items, props?)`

Stacks items vertically (top to bottom) with configurable gap and alignment.

```js
import { vstack, text, rule } from './slidekit.js';

const content = vstack([
  text('Title', { w: 600, size: 32, weight: 700 }),
  rule({ w: 600, thickness: 1 }),
  text('Description text here', { w: 600, size: 20 }),
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
| `gap` | number | `0` | Vertical gap between items (px) |
| `align` | string | `"left"` | Horizontal alignment: `"left"`, `"center"`, `"right"` |

If the stack has `w` and a child lacks `w`, the child inherits the stack's width. Text children are re-measured with the stack width constraint.

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
| `gap` | number | `0` | Horizontal gap between items (px) |
| `align` | string | `"top"` | Vertical alignment: `"top"`, `"middle"`, `"bottom"` |

*(See [card-row.js](examples/card-row.js) for an hstack example)*

---

## Alignment & Distribution

PowerPoint-style alignment and distribution operations. These are placed in the `transforms` array of a slide definition and applied during layout Phase 3, after position resolution.

```js
import { alignTop, distributeH, matchWidth } from './slidekit.js';

const slide = {
  elements: [
    rect({ id: 'a', x: 100, y: 200, w: 200, h: 150 }),
    rect({ id: 'b', x: 400, y: 250, w: 180, h: 100 }),
    rect({ id: 'c', x: 700, y: 220, w: 220, h: 130 }),
  ],
  transforms: [
    alignTop(['a', 'b', 'c']),              // Align top edges
    distributeH(['a', 'b', 'c']),            // Equal horizontal gaps
    matchWidth(['a', 'b', 'c']),             // Match widths to widest
  ],
};
```

*(See [alignment-distribution.js](examples/alignment-distribution.js) for a full example)*

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

SlideKit owns layout (position, size, spatial relationships). You own styling (colors, gradients, shadows, fonts, borders, animations). The `style` property on any element accepts raw CSS properties that are passed through to the rendered DOM element.

```js
rect({
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

CSS properties are blocked from the `style` pass-through for two reasons:

1. **Layout conflicts** — properties that would fight SlideKit's coordinate-based positioning.
2. **Measurement consistency** — properties that affect text dimensions. SlideKit measures text via convenience props; if the same properties are also set via `style`, the measurement and rendering would disagree ("split brain"), causing invisible overlaps that the collision detector can't catch.

Using a blocked property emits a warning with a prescriptive suggestion.

**Layout positioning:**
`position`, `top`, `left`, `right`, `bottom`, `inset*`, `width`, `height`, `min-width`, `max-width`, `min-height`, `max-height`, `block-size`, `inline-size`

**Display / Flex / Grid:**
`display`, `flex*`, `align-items`, `align-content`, `align-self`, `justify-content`, `justify-items`, `justify-self`, `order`, `gap`, `row-gap`, `column-gap`, `grid*`

**Float / Clear / Overflow:**
`float`, `clear`, `overflow`, `overflow-x`, `overflow-y`

**Margin:**
`margin`, `margin-top`, `margin-right`, `margin-bottom`, `margin-left`, `margin-block*`, `margin-inline*`

**Transform:**
`transform` — use the `rotate` prop for rotation.

**Font properties** (use convenience props: `font`, `size`, `weight`, `fontStyle`, `fontVariant`):
`font` (shorthand), `font-family`, `font-size`, `font-weight`, `font-style`, `font-variant`, `font-stretch`, `font-size-adjust`

**Line height & spacing** (use convenience props: `lineHeight`, `letterSpacing`, `wordSpacing`):
`line-height`, `letter-spacing`, `word-spacing`

**Text layout** (use convenience prop `textTransform` for transforms):
`text-transform`, `text-indent`, `text-overflow` — use SlideKit's `overflow` prop for truncation.

**Word/line breaking** (library-controlled):
`white-space`, `word-break`, `overflow-wrap`, `word-wrap`, `hyphens`, `line-break`

**Padding** (library sets padding:0 for measurement):
`padding`, `padding-top`, `padding-right`, `padding-bottom`, `padding-left`, `padding-block*`, `padding-inline*`

**Box sizing** (library-controlled):
`box-sizing`

**Writing mode:**
`writing-mode`, `direction`, `text-orientation`

**Multi-column:**
`columns`, `column-count`, `column-width`

**Line clamping:**
`-webkit-line-clamp`, `line-clamp` — use SlideKit's `overflow` prop instead.

Vendor-prefixed variants of all blocked properties are also blocked.

### `className`

Apply CSS classes to elements. Classes handle only visual styling — no layout properties.

```js
text('Title', { className: 'text-shadow-soft text-uppercase' });
rect({ className: 'glass-card' });
```

### Convenience Props vs Style

Element constructors accept convenience properties that map to CSS:

| Convenience Prop | CSS Property | Notes |
|---|---|---|
| `color` | `color` | Text color |
| `font` | `fontFamily` | Wrapped in quotes with sans-serif fallback |
| `size` | `fontSize` | Numeric values get `px` suffix |
| `weight` | `fontWeight` | Converted to string |
| `fontStyle` | `fontStyle` | `"normal"`, `"italic"`, or `"oblique"` |
| `fontVariant` | `fontVariant` | `"normal"`, `"small-caps"`, etc. |
| `textTransform` | `textTransform` | `"none"`, `"uppercase"`, `"lowercase"`, `"capitalize"` |
| `lineHeight` | `lineHeight` | Numeric multiplier |
| `letterSpacing` | `letterSpacing` | CSS value |
| `wordSpacing` | `wordSpacing` | CSS value (e.g., `"0.2em"`) |
| `fill` | `background` | For `rect` elements |
| `radius` | `borderRadius` | Numeric values get `px` suffix |
| `border` | `border` | CSS border shorthand |
| `align` | `textAlign` | For `text` elements |
| `shadow` | `boxShadow` | Accepts preset names or CSS values |

Convenience props feed into both CSS rendering **and** `measureText()`, ensuring layout and display agree. Their CSS equivalents (`fontFamily`, `fontSize`, `fontWeight`, `fontStyle`, `fontVariant`, `textTransform`, `lineHeight`, `letterSpacing`, `wordSpacing`) are blocked from the `style` pass-through — you **must** use the convenience props for these so that measurement stays consistent.

For non-measurement properties, explicit `style` values win over convenience props when both target the same CSS property.

### `filterStyle(style?, elementType?, convenienceProps?)`

Filters a style object, removing blocked properties and merging convenience props.

**Returns:** `{ filtered, warnings }` — filtered CSS object and any warning messages about blocked properties. Each warning includes `type`, `property`, `originalProperty`, `value`, and `suggestion`.

### Shadow Presets

The `shadow` convenience prop accepts named presets:

| Preset | CSS Value |
|---|---|
| `"sm"` | `0 1px 3px rgba(0,0,0,0.2)` |
| `"md"` | `0 4px 12px rgba(0,0,0,0.3)` |
| `"lg"` | `0 8px 32px rgba(0,0,0,0.4)` |
| `"xl"` | `0 16px 48px rgba(0,0,0,0.5)` |
| `"glow"` | `0 0 40px rgba(124,92,191,0.3)` |

#### `resolveShadow(value)`

Resolves a shadow preset name to its CSS value. If `value` is not a preset name, returns it unchanged.

#### `getShadowPresets()`

Returns a shallow copy of the shadow presets map.

---

## Layout & Validation

### `layout(slideDefinition, options?)` — async

The core layout engine. Takes a slide definition, resolves all positions, measures text, detects collisions, validates bounds, and returns a complete scene graph.

```js
import { layout, text, rect, below } from './slidekit.js';

const result = await layout({
  elements: [
    text('Title', { id: 'title', x: 120, y: 90, w: 800, size: 52 }),
    text('Body', { id: 'body', x: 120, y: below('title', { gap: 24 }), w: 800 }),
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
| `options.collisionThreshold` | number | `0` | Minimum overlap area (px²) to report |

**Returns:** `{ elements, transforms, warnings, errors, collisions }`

#### The Scene Graph (`elements`)

A map of `id → SceneElement`. Each element contains:

```js
{
  id: "title",
  type: "text",
  authored: {
    type: "text",
    content: "Title",
    props: { /* original props as authored */ },
  },
  resolved: {
    x: 120,    // final top-left x (after anchor resolution)
    y: 90,     // final top-left y
    w: 800,    // final width
    h: 68,     // final height (measured for text)
  },
  provenance: {
    x: { source: "authored", value: 120 },
    y: { source: "authored", value: 90 },
    w: { source: "authored", value: 800 },
    h: { source: "measured" },
  },
}
```

**Provenance sources:**
- `"authored"` — value came from user-specified props
- `"measured"` — value was computed by text measurement
- `"relative"` — value was resolved from a `_rel` marker
- `"stack"` — value was set by a parent vstack/hstack
- `"transform"` — value was modified by a layout transform (contains `original` provenance)

#### Warnings

Structured warning objects with `type`, `elementId`, and `message`. Warning types include:

- `safe_zone_violation` — element extends outside the safe zone
- `slide_bounds_violation` — element extends outside the slide canvas
- `font_size_warning` — font size below `minFontSize` (projection readability)
- `text_overflow` — text exceeds its bounding box
- `content_cluster_sparse` — too little content density
- `content_cluster_dense` — too much content density

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
  overlapArea: 4800,   // px²
  overlapRect: { x: 200, y: 300, w: 80, h: 60 },
}
```

Collision detection operates per-layer — elements on different layers don't collide.

*(See [safe-zone-validation.js](examples/safe-zone-validation.js) for validation examples)*

#### Four-Phase Pipeline

1. **Phase 1 — Intrinsic Sizes:** Measures text, resolves stack sizes bottom-up, resolves percentage strings, handles panel auto-height
2. **Phase 2 — Positions:** Builds dependency graph from `_rel` markers, topological sort (Kahn's algorithm), resolves to absolute coords, applies anchor resolution, positions stack children
3. **Phase 2.5 — Overflow Policies:** Applies overflow handling for text elements with explicit `h`
4. **Phase 3 — Transforms:** Applies alignment/distribution/sizing transforms in declaration order
5. **Phase 4 — Finalize:** Builds provenance, resolves connector endpoints, AABB collision detection, safe zone/bounds/font/clustering validation

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
import { init, render, text, rect } from './slidekit.js';

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

*(See [full-presentation.js](examples/full-presentation.js) for a multi-slide rendering example)*

#### Reveal.js Integration

SlideKit renders into Reveal.js `<section>` elements. Background support:

- Solid colors / gradients → `data-background-color`
- Image paths → `data-background-image` + `data-background-size="cover"`

Initialize Reveal.js after calling `render()`:

```js
await render(slides);
Reveal.initialize({
  width: 1920, height: 1080, center: false,
  hash: true, slideNumber: true, transition: 'fade',
});
```

---

## Compound Primitives

### `bullets(items, props?)`

Creates a structured bullet list with proper indentation, configurable bullet characters, and nested sub-items.

```js
import { bullets, below } from './slidekit.js';

bullets([
  'First point',
  'Second point',
  { text: 'Third point with sub-items', children: [
    'Sub-item A',
    'Sub-item B',
  ]},
  'Fourth point',
], {
  id: 'feature-list',
  x: 120, y: below('heading', { gap: 40 }),
  w: 1400,
  size: 28,
  color: 'rgba(255,255,255,0.85)',
  bulletColor: '#7c5cbf',
  bulletChar: '•',
  indent: 40,
  gap: 12,
});
```

**Returns:** A `vstack` containing groups of (bullet character + item text) per item.

| Property | Type | Default | Description |
|---|---|---|---|
| `items` | Array | — | `string` or `{ text, children? }` for nesting |
| `x` | number | `0` | X position |
| `y` | number | `0` | Y position |
| `w` | number | — | Width for text wrapping |
| `gap` | number | `8` | Vertical gap between items |
| `bulletChar` | string | `"•"` | Bullet character |
| `bulletColor` | string | same as `color` | Color for bullet characters |
| `bulletGap` | number | `16` | Gap between bullet and text |
| `indent` | number | `40` | Indent per nesting level |
| `font` | string | `"Inter"` | Font family |
| `size` | number | `32` | Font size |
| `weight` | number | `400` | Font weight |
| `color` | string | `"#ffffff"` | Text color |
| `lineHeight` | number | `1.3` | Line height multiplier |

> **Important:** `bullets()` measures text at creation time (not during `layout()`). Ensure fonts are loaded via `init()` before calling.

*(See [bullet-list.js](examples/bullet-list.js) for a working example)*

---

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
- `"elbow"` — right-angle path (horizontal → vertical → horizontal)

*(See [connectors.js](examples/connectors.js) for all three connector types)*

---

### `panel(children, props?)`

Creates a visual container with a background, padding, and vertically stacked children. The "card" pattern that appears constantly in presentations.

```js
import { panel, text, rule } from './slidekit.js';

panel([
  text('Card Title', { w: 'fill', size: 28, weight: 600, color: '#fff' }),
  rule({ w: 'fill', color: 'rgba(255,255,255,0.15)', thickness: 1 }),
  text('Card description goes here.', {
    w: 'fill', size: 20, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5,
  }),
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

**Returns:** A `group` containing a background `rect` and a `vstack` of children.

| Property | Type | Default | Description |
|---|---|---|---|
| `children` | Array | — | Child elements |
| `padding` | number | `24` | Internal padding |
| `gap` | number | `16` | Vertical gap between children |
| `w` | number | — | Panel width |
| `h` | number | — | Panel height (auto-computed from children if omitted) |

Children with `w: "fill"` have their width set to `panelWidth - 2 × padding`.

*(See [card-row.js](examples/card-row.js) for panel usage in an hstack)*

---

## Additional Features

### Grid System

#### `grid(config?)`

Creates a column grid for consistent cross-slide positioning.

```js
import { grid } from './slidekit.js';

const g = grid({ cols: 12, gutter: 30 });

// Position elements using grid columns
text('Title', { x: g.col(1), y: 90, w: g.spanW(1, 8) });
rect({ x: g.col(9), y: 200, w: g.spanW(9, 12), h: 300 });

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

**Throws** if computed `colWidth ≤ 0`.

*(See [grid-layout.js](examples/grid-layout.js) for a complete grid example)*

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
import { repeat, rect } from './slidekit.js';

const dots = repeat(
  rect({ w: 20, h: 20, style: { background: '#7c5cbf', borderRadius: '50%' } }),
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

**Formula:** `aabbW = |w·cos(θ)| + |h·sin(θ)|`, `aabbH = |w·sin(θ)| + |h·cos(θ)|`

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
// From examples/title-slide.js
text('Building Better\nPresentations', {
  id: 'title-text',
  x: 960, y: 340, w: 1200,
  anchor: 'tc',
  size: 80, weight: 700, color: '#ffffff',
  align: 'center', lineHeight: 1.1,
});

rule({
  id: 'accent',
  x: 960 - 40, y: below('title-text', { gap: 32 }),
  w: 80, color: '#7c5cbf', thickness: 3,
});

text('A coordinate-based approach to slide layout', {
  id: 'subtitle',
  x: 960, w: 800,
  y: below('accent', { gap: 24 }),
  anchor: 'tc',
  size: 32, color: 'rgba(255,255,255,0.6)',
  align: 'center',
});
```

*(Full example: [title-slide.js](examples/title-slide.js))*

### Card Row

Horizontal row of styled panels with equal sizing.

```js
// From examples/card-row.js
hstack([
  panel([
    text('Title', { w: 'fill', size: 28, weight: 600, color: '#fff' }),
    rule({ w: 'fill', color: 'rgba(255,255,255,0.15)', thickness: 1 }),
    text('Description text here.', { w: 'fill', size: 20, color: 'rgba(255,255,255,0.65)' }),
  ], { id: 'card-1', w: 480, padding: 28, gap: 14, style: { /* ... */ } }),
  // ... more panels
], { id: 'cards', x: safe.x, y: below('heading-rule', { gap: 48 }), gap: 30, align: 'top' });
```

*(Full example: [card-row.js](examples/card-row.js))*

### Bullet List

Heading with accent rule and nested bullet items.

```js
// From examples/bullet-list.js
bullets([
  'First item',
  { text: 'Item with children', children: ['Sub-item A', 'Sub-item B'] },
  'Another item',
], { id: 'features', x: safe.x, y: below('heading-rule', { gap: 40 }), w: 1400, size: 28 });
```

*(Full example: [bullet-list.js](examples/bullet-list.js))*

### Relative Positioning

Elements positioned relative to each other using helper functions.

```js
// From examples/relative-positioning.js
rect({ id: 'anchor-box', x: 200, y: 300, w: 400, h: 200 });
rect({ id: 'below-box', x: 200, y: below('anchor-box', { gap: 24 }), w: 400, h: 120 });
rect({
  id: 'right-box',
  x: rightOf('anchor-box', { gap: 40 }),
  y: alignTopWith('anchor-box'),
  w: 350, h: 200,
});
rect({
  id: 'centered-box',
  x: centerHWith('anchor-box'), anchor: 'tc',
  y: below('below-box', { gap: 40 }),
  w: 300, h: 100,
});
```

*(Full example: [relative-positioning.js](examples/relative-positioning.js))*

### Connectors & Flowcharts

Boxes connected with different connector types.

```js
// From examples/connectors.js
rect({ id: 'step-1', x: 170, y: 300, w: 280, h: 150 });
rect({ id: 'step-2', x: 600, y: 300, w: 280, h: 150 });

connect('step-1', 'step-2', {
  type: 'straight', arrow: 'end',
  color: '#7c5cbf', thickness: 2,
  fromAnchor: 'cr', toAnchor: 'cl',
  label: 'layout()',
  labelStyle: { size: 14, color: 'rgba(255,255,255,0.5)' },
});
```

*(Full example: [connectors.js](examples/connectors.js))*

### Grid Layout

Consistent multi-column positioning with the grid system.

```js
// From examples/grid-layout.js
const g = grid({ cols: 12, gutter: 30 });

text('Title', { x: g.col(1), y: safe.y, w: g.spanW(1, 8) });
rect({ id: 'sidebar', x: g.col(9), y: 200, w: g.spanW(9, 12), h: 300 });
rect({ id: 'full-width', x: g.col(1), y: 570, w: g.spanW(1, 12), h: 120 });
```

*(Full example: [grid-layout.js](examples/grid-layout.js))*

### Text Fitting

Measuring text and auto-fitting to bounding boxes.

```js
// From examples/text-fitting.js
const measured = measureText('Some text', { font: 'Inter', size: 28, w: 400 });
// { block: { w: 400, h: 73 }, lineCount: 2, fontSize: 28 }

const fitted = fitText('Long text to fit', { w: 500, h: 200 }, { minSize: 16, maxSize: 72 });
// { fontSize: 38, metrics: { ... }, warnings: [] }
```

*(Full example: [text-fitting.js](examples/text-fitting.js))*

### Alignment & Distribution

Transform operations applied after position resolution.

```js
// From examples/alignment-distribution.js
const slide = {
  elements: [ /* boxes at different positions */ ],
  transforms: [
    alignTop(['box-a', 'box-b', 'box-c']),
    distributeH(['box-a', 'box-b', 'box-c'], { startX: 200, endX: 1000 }),
    matchWidth(['box-a', 'box-b', 'box-c']),
  ],
};
```

*(Full example: [alignment-distribution.js](examples/alignment-distribution.js))*

### Safe Zone Validation

Inspecting layout warnings, errors, and collisions.

```js
// From examples/safe-zone-validation.js
const layoutResult = await layout(slideDefinition);
console.log(layoutResult.warnings);   // safe zone violations, small fonts
console.log(layoutResult.errors);     // off-slide elements (strict mode)
console.log(layoutResult.collisions); // overlapping elements
```

*(Full example: [safe-zone-validation.js](examples/safe-zone-validation.js))*

### Full Presentation

Multi-slide rendering with speaker notes and backgrounds.

```js
// From examples/full-presentation.js
const result = await render([slide1, slide2, slide3]);

Reveal.initialize({
  width: 1920, height: 1080, center: false,
  hash: true, slideNumber: true, transition: 'fade',
});

console.log(`Rendered ${result.layouts.length} slides`);
```

*(Full example: [full-presentation.js](examples/full-presentation.js))*

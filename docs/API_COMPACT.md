# SlideKit API Reference (Compact)

> Current as of: `66ce7bc` (2026-03-02). Read [OVERVIEW.md](OVERVIEW.md) first.

---

## Legend

Notation used throughout:
- `?` = optional, `!` = required
- `def=` default value
- `→` return type
- `px|tok` = number (pixels) or spacing token string
- DO: / DONT: = best practice / anti-pattern

---

## Common Props (CP)

These appear on most element types. When a section says "+ CP", all of these apply:

- `id: string def=auto("sk-N")` — unique identifier
- `x: PositionValue def=0` — X position (number, percentage string `"50%"`, `"safe:25%"`, or RelMarker)
- `y: PositionValue def=0` — Y position (same types as x)
- `w: SizeValue?` — width in px, percentage string, `"fill"` in panels, or `matchWidthOf(refId)`. Auto-measured if omitted.
- `h: SizeValue?` — height in px, percentage string, or `matchHeightOf(refId)`. Auto-measured if omitted.
- `maxW: number?` — max width constraint
- `maxH: number?` — max height constraint
- `anchor: AnchorPoint def="tl"` — which point sits at (x,y); see Anchor System
- `layer: "bg"|"content"|"overlay" def="content"` — render layer
- `vAlign: "top"|"center"|"bottom" def="top"` — vertical alignment of content within box
- `opacity: number def=1` — 0–1
- `rotate: number?` — degrees
- `flipH: boolean?` — horizontal flip (`scaleX(-1)`)
- `flipV: boolean?` — vertical flip (`scaleY(-1)`)
- `overflow: "visible"|"warn"|"clip"|"error" def="visible"` — overflow policy
- `shadow: string?` — preset name (`sm|md|lg|xl|glow`) or CSS `box-shadow` value
- `z: number?` — explicit z-order within same layer (higher = front)
- `allowOverlap: boolean def=false` — skip linter overlap checks
- `style: object def={}` — CSS pass-through (applied to container div)
- `className: string def=""` — CSS class(es)

Overflow policies: `visible` = render fully; `warn` = emit warning on overflow; `clip` = CSS `overflow:hidden`; `error` = error on overflow.

---

## Prerequisites

### `init(config?) → Promise<SlideKitConfig>`

Call before using any SlideKit function.

```js
await init({
  slide: { w: 1920, h: 1080 },
  safeZone: { left: 120, right: 120, top: 90, bottom: 90 },
  minFontSize: 24,
  fonts: [{ family: 'Inter', weights: [400, 600, 700], source: 'google' }],
});
```

Config fields (all optional):
- `slide.w: number def=1920`, `slide.h: number def=1080`
- `safeZone.{left,right}: number def=120`, `safeZone.{top,bottom}: number def=90`
- `strict: boolean def=false` — safe zone/bounds violations become errors
- `minFontSize: number def=24` — below this triggers readability warnings
- `spacing: Record<string,number>` — custom tokens merge with defaults (see Spacing)
- `fonts: FontDef[]` — `{ family, weights?, source? }` — preloaded; Google Fonts via `<link>`, 5s timeout per weight
- `minVersion: string?` — semver compatibility check (throws on mismatch)
- `debug.sourceHint: string?` — path to slide source file, shown in inspector

Version compatibility: 0.x and 1.x are same group. From 2.0+, major must match. Minor mismatch → console.warn. Breaking mismatch → throws with pointer to `docs/MIGRATION.md`.

`checkVersionCompatibility(minVersion, currentVersion) → { ok, warning?, error? }` — low-level check used by init.

Throws if safe zone leaves zero/negative usable area.

Requires browser environment (DOM) for measurement, font loading, Reveal.js rendering.

---

## Core Elements

### `el(html, props?) → ElElement`

Single element primitive. Creates a positioned HTML element.

```js
el('<p style="font:700 52px/1.1 Inter;color:#fff">Hello</p>', { id: 'title', x: 960, y: 400, w: 800, anchor: 'tc' });
```

Returns `{ id, type: "el", content: html, props, _layoutFlags }`. Accepts all CP.

Replaces v1 primitives:
- Text: `el('<p style="font:700 52px Inter">Title</p>', { x, y, w })`
- Image: `el('<img src="photo.jpg" style="width:100%;height:100%;object-fit:cover">', { x, y, w, h })`
- Rect: `el('', { x, y, w, h, style: { background: '#1a1a3e', borderRadius: '12px' } })`
- Rule/divider: `el('', { x, y, w: 80, h: 3, style: { background: '#7c5cbf' } })`

DONT: Put CSS props like `fontSize` at top level — put inside `style: {}`. Auto-promoted with warning; linter flags `misplaced-css-prop`.
DONT: Omit `w` on long text — `measure()` computes unconstrained single-line width. Always set `w` for paragraph text.
DO: Omit `h` on text elements — let `measure()` compute actual height. Only set `h` for fixed-size containers (panels, image frames).
DO: Use element prop `overflow` not CSS `style: { overflow }` — CSS overflow is blocked by `filterStyle()`.
DO: `layer: 'bg'` for full-bleed backgrounds, `layer: 'overlay'` for decorative edges. Both exempt from safe-zone rules.

### `group(children, props?) → GroupElement`

Container with shared coordinate origin. Moving group moves all children.

Returns `{ id, type: "group", children, props, _layoutFlags }`. Accepts all CP plus:
- `scale: number def=1`
- `clip: boolean def=false` — clip children to group bounds
- `bounds: "hug"?` — auto-compute w/h from children's bounding box (skips unresolved `_rel` markers and compound groups)

DO: `bounds: 'hug'` for containers whose size derives from content. Linter suppresses `child-overflow` for hug groups.
DONT: Create groups without dimensions or `bounds: 'hug'` when used as layout containers — defaults to 0×0.
DO: Children use group-relative coordinates. Group moves = children move.

---

## Stack Layouts

Stacks arrange children in sequence, resolving to absolute coordinates during layout. Not CSS flexbox.

DO: Prefer `vstack`/`hstack` over manual `below()`/`rightOf()` chains.
DONT: Use relative positioning (`below()`, `rightOf()`) on stack children — ignored with `ignored_rel_on_stack_child` warning.

### `vstack(items, props?) → VStackElement`

Stacks items vertically. Returns `{ id, type: "vstack", children, props, _layoutFlags }`. Accepts all CP plus:
- `gap: px|tok def=0` — vertical gap
- `align: "left"|"center"|"right"|"stretch" def="left"` — cross-axis (horizontal) alignment
- `vAlign: "top"|"center"|"bottom" def="top"` — main-axis vertical alignment (requires explicit `h`)

If stack has `w` and child lacks `w`, child inherits stack width.

### `hstack(items, props?) → HStackElement`

Stacks items horizontally. Returns `{ id, type: "hstack", children, props, _layoutFlags }`. Accepts all CP plus:
- `gap: px|tok def=0` — horizontal gap
- `align: "top"|"middle"|"bottom"|"stretch" def="top"` — cross-axis (vertical) alignment
- `hAlign: "left"|"center"|"right" def="left"` — main-axis horizontal alignment (requires explicit `w`)

### Main-Axis Alignment

`vAlign`/`hAlign` position the entire content block within the stack's explicit dimension. Requires explicit `h` (vstack) or `w` (hstack); otherwise no-op. `align` (cross-axis) and `vAlign`/`hAlign` (main-axis) are orthogonal — can combine.

### `align: 'stretch'`

- vstack: all children get same **width** (widest child or stack's `w`). Auto-height `el()` re-measured at new width.
- hstack: all children get same **height** (tallest child or stack's `h`).

Explicit size override emits `stretch_override` warning.

DO: `hstack({ align: 'stretch' })` for equal-height card layouts.

### `cardGrid(items, opts?) → VStackElement`

Grid via nested vstack/hstack. Each row is `hstack` with `align: 'stretch'`.

Options: `id?, cols: number def=2, gap: px|tok def=0, x?, y?, w?, anchor?, layer?, style?`

Row IDs: `{id}-row-0`, `{id}-row-1`, etc.

DONT: Linter can't resolve child positions inside `hstack()`/`cardGrid()`. For lint-friendly multi-column, use `splitRect()` or manual arithmetic.

---

## Compound Elements

### `panel(children, props?) → PanelElement`

Visual container with background, padding, vertically stacked children. Internally: group containing bg `el('')` + `vstack` of children.

Additional props beyond CP:
- `padding: px|tok def=24`
- `gap: px|tok def=16` — vertical gap between children
- `fill: string?` — background color/gradient (→ CSS `background`)
- `radius: number|string?` — border radius
- `border: string?` — CSS border shorthand
- `vAlign: "top"|"center"|"bottom" def="top"` — main-axis alignment (requires explicit `h`)

Panel content measured at full render width, not panel width — text wrapping may differ in narrow panels. Set explicit `w` on text children in narrow panels. Children with `w: "fill"` → `panelWidth - 2*padding`.

Children use panel-relative coordinates (after padding).

When panel has explicit `h` and content exceeds it → `panel_overflow` warning. Fix: remove `h` or increase it.

DONT: `w: 'fill'` in nested panels — inner `fill` resolves before outer sets width.
DO: When panel children cause false-positive overlaps, flatten to single `el()` with inline HTML.

### `figure(opts?) → FigureElement`

Image container with background + optional caption. Returns group containing `{id}-bg`, `{id}-img`, optionally `{id}-caption`.

Props:
- `id?, src: string def="", x?, y?, w?, h?, anchor?, layer?`
- `containerFill: string def="transparent"`, `containerRadius: number|string def=0`, `containerPadding: px|tok def=0`
- `caption: string?` — HTML caption
- `captionGap: px|tok def=0` — gap between container bottom and caption
- `fit: string def="contain"` — CSS `object-fit`
- `style: object def={}`

DONT: Guess image dimensions — render first, read `naturalWidth`/`naturalHeight`, compute exact size.
DONT: `anchor: 'tc'` on `figure()` — linter resolves children at raw group-relative coords → false overflow. Use `anchor: 'tl'` and compute `x: 960 - w/2`.

### `connect(fromId, toId, props?) → ConnectorElement`

Connector line between two elements. SVG with optional arrowheads/labels. Endpoints resolved during layout Phase 4.

Returns `{ id, type: "connector", props, _layoutFlags }`.

Props:
- `id?, type: "straight"|"curved"|"elbow"|"orthogonal" def="straight"`
- `arrow: "none"|"start"|"end"|"both" def="end"`
- `color: string def="#ffffff"`, `thickness: number def=2`
- `dash: string|null def=null` — SVG `stroke-dasharray` (e.g., `"5 5"` = dashed, `"10 4 2 4"` = dash-dot, `"2 4"` = dotted)
- `fromAnchor: AnchorPoint def="cr"`, `toAnchor: AnchorPoint def="cl"`
- `label: string|null def=null`, `labelStyle: { size?, color?, font?, weight? } def={}`
- `cornerRadius: number def=0` — rounding of corners on elbow/orthogonal connectors (0 = sharp corners)
- `obstacleMargin: number def=200` — search margin for obstacle avoidance on orthogonal connectors
- `layer?, opacity?`

Connector types: `straight` = direct line; `curved` = cubic bézier 40% offset along dominant axis; `elbow` = orthogonal path via `routeConnector()`; `orthogonal` = orthogonal path with obstacle avoidance (like `elbow` but routes around other elements).

DO: For visible curves, use corner anchors (`tr`→`tl`) not center-edge — center-edge on horizontally-aligned elements produces collinear control points (curve looks straight).
DONT: `dash` expects SVG format `"5 5"`, not CSS `"6,4"` — incorrect format silently produces solid line.

---

## Positioning & Anchors

### Anchor System

```
tl --- tc --- tr
|              |
cl     cc     cr
|              |
bl --- bc --- br
```

First char: row (`t`/`c`/`b`). Second char: column (`l`/`c`/`r`).

`resolveAnchor(x, y, w, h, anchor) → { left, top }` — converts anchor-relative to CSS top-left. Throws on invalid anchor.

`getAnchorPoint(bounds: Rect, anchor) → { x, y, dx, dy }` — pixel coordinates + outward direction vector.

DO: `anchor: 'tc'` with `x: 960` to center on slide. `anchor: 'tl'` with `x: safe.x` to left-align at safe zone.

### Relative Positioning Helpers

Return `RelMarker` objects resolved during layout via dependency graph (topological sort). Circular deps → error. Only valid on `x`/`y` — using on `w`/`h` → error.

**Position helpers** (all: `(refId, opts?: { gap?: px|tok }) → RelMarker`):
- `below(ref, {gap?})` → Y = ref bottom + gap
- `above(ref, {gap?})` → Y = ref top − element height − gap
- `rightOf(ref, {gap?})` → X = ref right + gap
- `leftOf(ref, {gap?})` → X = ref left − element width − gap

**Alignment helpers** (all: `(refId) → RelMarker`):
- `centerVWith(ref)` → Y centers vertically with ref
- `centerHWith(ref)` → X centers horizontally with ref
- `alignTopWith(ref)` → Y = ref top
- `alignBottomWith(ref)` → Y = ref bottom − element height
- `alignLeftWith(ref)` → X = ref left
- `alignRightWith(ref)` → X = ref right − element width

Axis rule: `alignTop/alignBottom/centerV` → Y axis. `alignLeft/alignRight/centerH` → X axis.

DONT: Cross axes — `alignTopWith()` (Y) used as X coordinate silently produces wrong positions.
DO: `centerVWith(ref)` to vertically center a label next to a taller element.

**Slide-level centering** (no ref needed):
- `centerHOnSlide()` → X centers horizontally on the slide (returns `{ _rel: 'centerHSlide' }`)
- `centerVOnSlide()` → Y centers vertically on the slide (returns `{ _rel: 'centerVSlide' }`)

```js
el('Title', { x: centerHOnSlide(), y: centerVOnSlide(), w: 800, anchor: 'tc' });
```

**Dimension constraints** (valid on `w`/`h`, not `x`/`y`):
- `matchWidthOf(ref)` → `{ _rel: 'matchWidth', ref }` — element width = ref's width
- `matchHeightOf(ref)` → `{ _rel: 'matchHeight', ref }` — element height = ref's height

```js
el('Body', { y: below('header', 'md'), w: matchWidthOf('header') });
```

DO: Use `matchWidthOf`/`matchHeightOf` to constrain a single element to a reference. Use transform `matchWidth`/`matchHeight` for batch operations on multiple elements.

### `between(refA, refB, { axis, bias? }) → RelMarker`

Positions element in the gap between two references on a given axis.
- `refA: string|number` — element ID or raw px coordinate
- `refB: string|number` — element ID or raw px coordinate (at least one must be an element ID)
- `axis: 'x'|'y'` — required. Which axis to position on.
- `bias: number def=0.5` — 0.0 = flush to refA edge, 1.0 = flush to refB edge, 0.5 = centered

When `axis: 'x'`: positions in the horizontal gap between refA's right edge and refB's left edge.
When `axis: 'y'`: positions in the vertical gap between refA's bottom edge and refB's top edge.

```js
// Center breakout box horizontally between two nodes
x: between('node3', 'node5', { axis: 'x' }),

// Place label between header and content, biased toward top
y: between('header', 'content', { axis: 'y', bias: 0.35 }),

// Between an element and a raw coordinate
y: between('lastCard', 990, { axis: 'y' }),
```

DONT: Falls back if element doesn't fit. Check for `between_no_fit` warnings.
DONT: Assign to the wrong prop (e.g., `y: between(..., { axis: 'x' })`). Emits `between_axis_mismatch` warning.

### `placeBetween(topRef, bottomYOrRef, opts?) → RelMarker` *(deprecated)*

> **Deprecated:** Use `between(refA, refB, { axis: 'y' })` instead.

Positions element vertically between two references.
- `topRef: string` — ID above (uses bottom edge)
- `bottomYOrRef: string|number` — ID below (uses top edge) or raw Y px
- `opts.bias: number def=0.35` — 0.0 = flush top, 1.0 = flush bottom

DONT: Falls back silently if element doesn't fit. Ensure gap ≥ element height. Check for `between_no_fit` warnings.

### `centerIn(rect) → { x: RelMarker, y: RelMarker }`

Centers element within a rectangle (both axes). `el('<p>Centered</p>', { ...centerIn(safe), w: 400 })`

---

## Transforms

PowerPoint-style operations applied during layout Phase 3 via `transforms` array on slide definition. All return `TransformMarker: { _transform, _transformId, ids, options }`.

DONT: Transforms only move listed elements. If distributing containers but not labels, labels stay behind. Group related elements first, then transform groups.

### Alignment (all: `(ids: string[], opts?: { to?: number }) → TransformMarker`)

`alignLeft` / `alignRight` / `alignTop` / `alignBottom` / `alignCenterH` / `alignCenterV`

Defaults for `to`: min left edge / max right edge / min top / max bottom / avg H center / avg V center.

### Distribution

`distributeH(ids, opts?) → TransformMarker` — equal horizontal gaps.
Options: `startX?: number, endX?: number, mode?: "equal-gap"|"equal-center" def="equal-gap"`

`distributeV(ids, opts?)` — same but vertical; uses `startY`, `endY`.

DONT: Fewer than 2 elements silently does nothing.

### Size Matching (all: `(ids: string[]) → TransformMarker`)

`matchWidth` — all widths → max width. `matchHeight` — all heights → max height. `matchSize` — both.

### `fitToRect(ids, rect: Rect) → TransformMarker`

Scales + centers elements to fit within rect, preserving aspect ratio.

---

## Styling

### CSS Pass-Through

`style` prop passes CSS to rendered container. SlideKit owns layout; you own styling (colors, gradients, shadows, fonts, borders, animations).

DO: `textAlign` should match positioning direction. With `leftOf()` → `style: { textAlign: 'right' }`.

### Convenience Prop Mapping

`color`→`color`, `font`→`fontFamily`, `size`→`fontSize`+"px", `weight`→`fontWeight`, `fill`→`background`, `radius`→`borderRadius`, `border`→`border`, `align`→`textAlign`, `shadow`→`boxShadow`. If both convenience and `style` set same CSS prop, `style` wins.

### Blocked Properties

These CSS props are blocked from `style` (conflict with positioning system) and emit warnings:
- Layout: `position, top, left, right, bottom, inset*`
- Sizing: `width, height, min/maxWidth, min/maxHeight, *Size` (block/inline variants)
- Display: `display`
- Overflow: `overflow, overflowX/Y, overflow*` (use element prop `overflow` instead)
- Margin: `margin*` (all variants)
- Transform: `transform, translate, rotate, scale`
- Containment: `contain, contentVisibility`
- Vendor-prefixed variants also blocked.

`filterStyle(style?, elementType?) → { filtered, warnings }` — removes blocked props.

### CSS Auto-Promotion

`detectMisplacedCssProps(props) → { cssProps, warnings }` — detects CSS props at element top-level, auto-promotes to `style`. `CSS_LIKE_PROPS` ReadonlySet includes: `textAlign, fontSize, fontFamily, fontWeight, background, backgroundColor, border, borderRadius, boxShadow, padding, lineHeight, letterSpacing, whiteSpace, textDecoration, textTransform, cursor, visibility`, etc.

DONT: Rely on auto-promotion — always write CSS inside `style: {}`.

### Shadow Presets

`SHADOWS`: `sm` = `"0 1px 3px rgba(0,0,0,0.2)"`, `md` = `"0 4px 12px rgba(0,0,0,0.3)"`, `lg` = `"0 8px 32px rgba(0,0,0,0.4)"`, `xl` = `"0 16px 48px rgba(0,0,0,0.5)"`, `glow` = `"0 0 40px rgba(124,92,191,0.3)"`.

`resolveShadow(value) → string` — resolves preset name to CSS; non-preset returned unchanged.
`getShadowPresets() → Record<string,string>` — shallow copy of presets map.

DONT: `glow` shadows only visible on dark backgrounds.

### Baseline CSS

Injected inside every `el()` container. Neutralizes inherited styles from host frameworks (Reveal.js). Key defaults: `text-align: left`, `line-height: 1.2`, `font-weight: 400`, all margins → 0, headings inherit font, media `max-width/max-height: none`. User inline styles always win.

DO: For text on semi-transparent backgrounds, use opacity ≥ 0.25. Opacity 0.15 fails contrast checks (linter flags < 4.5:1 ratio).

### Theme CSS

`className` prop references classes from loaded stylesheets. Theme CSS must contain **only visual styling** (colors, gradients, borders, shadows, typography, animations). Never layout props (`position, display, width, height, margin, padding, flex, grid`) — they conflict with SlideKit positioning.

---

## Spacing

### Token Scale (`DEFAULT_SPACING`)

`xs`=8, `sm`=16, `md`=24, `lg`=32, `xl`=48, `section`=80 (px).

Usable anywhere gap/padding accepted. Customizable via `init({ spacing })` — merges with defaults.

DO: Use tokens instead of magic numbers. Linter flags gaps < 8px (`gap-too-small`).
DONT: Gaps < `xs` (8px) between text — fails readability checks.

### `resolveSpacing(value: number|string|undefined|null) → number|undefined|null`

Numbers pass through. Strings looked up in scale → number. `undefined`/`null` pass through. Unknown token → throws with list of available tokens.

### `getSpacing(token: number|string) → number`

Public API. `getSpacing('md')` → 24. Numbers pass through. Throws on unknown token.

---

## Connector Routing (Advanced)

### `routeConnector(options) → { waypoints: Point[] }`

Computes orthogonal polyline for elbow connectors.

Options:
- `from: AnchorPointResult!` — source with direction vector
- `to: AnchorPointResult!` — target with direction vector
- `obstacles: Rect[] def=[]`
- `stubLength: number def=30` — mandatory orthogonal stub length
- `clearance: number def=15` — minimum obstacle clearance

---

## Rendering

### `render(slides, options?) → Promise<{ sections: HTMLElement[], layouts: LayoutResult[] }>`

Renders slide definitions into DOM as absolutely-positioned elements inside Reveal.js `<section>` elements.

Options: `container: HTMLElement def=document.querySelector('.reveal .slides')`

### Slide Definition

- `id: string` — slide ID (→ `section.id`)
- `background: string` — color, gradient, or image path
- `elements: SlideElement[]`
- `transforms: TransformMarker[]`
- `notes: string` — speaker notes (→ `<aside class="notes">`)

Background handling (`applySlideBackground`): solid colors → `data-background-color`; gradients → `data-background-gradient`; images → `data-background-image`.

### `window.sk` (Scene Model)

```js
window.sk = {
  layouts: [/* LayoutResult per slide */],
  slides: [{ id, layout }],
  _config: {/* current config */},
  lint(slideId) → LintFinding[],
  lintDeck() → LintFinding[],
};
```

DO: After code changes, hard-reload (Ctrl+Shift+R or `?v=timestamp`) and re-lint. Browsers cache aggressively.
DO: Take screenshots after programmatic checks for visual verification.

### Debug Inspector

Built into the main bundle (no separate debug bundle). Toggle with keyboard shortcut:

```js
enableKeyboardToggle();  // Ctrl+. to toggle inspector overlay
```

Features: bounding-box overlays, element list with layer grouping and hide checkboxes, visibility toggles for overlay features, live-preview HTML editing, snap-to-10px grid during drag/resize (Shift to disable snap).

### DOM Overflow Detection

After rendering, `render()` checks every `el` for overflow (scrollHeight > clientHeight + 1px). Emits `dom_overflow_y` / `dom_overflow_x` warnings.

### Renderer Helpers (Internal)

- `computeZOrder(elements) → Map<string,number>` — sorts by layer (`bg` < `content` < `overlay`), then `z` (def 0), then declaration order.
- `applyStyleToDOM(domEl, styleObj)` — applies CSS object; handles `--*` custom props via `setProperty()`.
- `renderElementFromScene(element, zIndex, sceneElements, offsetX?, offsetY?) → HTMLElement` — renders single element from scene graph.

---

## Layout & Validation

### `layout(slideDefinition, options?) → Promise<LayoutResult>`

Core layout engine. Resolves positions, measures HTML, detects collisions, validates bounds.

Options: `collisionThreshold: number def=0` — minimum overlap area (px²) to report.

Returns `LayoutResult: { elements, rootIds, transforms, warnings, errors, collisions }`

### Scene Graph (`elements`)

Map of `id → SceneElement`:
- `id, type, authored` (original spec), `resolved: Rect` (final absolute position), `localResolved: Rect` (parent-relative)
- `parentId: string|null`, `children: string[]`, `provenance: object`, `_internal: boolean` (panel internals)

`rootIds` — ordered array of top-level IDs (no parent).

Provenance sources: `authored` (user props), `measured` (HTML measurement), `constraint` (RelMarker), `stack` (parent stack), `transform` (layout transform), `default`.

### Warnings

`{ type, elementId, message }`:
- `outside_safe_zone`, `outside_slide` — bounds violations (bg layer exempt)
- `content_clustered`, `content_no_breathing_room` — spacing issues
- `stretch_override` — child size overridden by stretch
- `panel_overflow` — panel content exceeds authored height
- `dom_overflow_y/x` — post-render DOM overflow
- `transform_unknown_element` — transform references non-existent ID

### Errors

- `dependency_cycle` — circular relative positioning
- `unknown_ref` — RelMarker references non-existent ID
- `invalid_rel_on_dimension` — RelMarker on `w`/`h` (only valid on `x`/`y`)

Strict mode (`init({ strict: true })`): bounds violations become errors.

### Collisions

`{ elementA, elementB, overlapArea, overlapRect: Rect }` — per-layer (different layers don't collide).

### Layout Pipeline

1. **Phase 1 — Intrinsic Sizes:** measure HTML, resolve stack sizes, percentages, panel auto-height, `bounds: 'hug'`
2. **Phase 2 — Positions:** dependency graph from RelMarkers → topological sort → absolute coords, anchor resolution, stack child positions
3. **Phase 3 — Transforms:** alignment/distribution/sizing in declaration order
4. **Phase 4 — Finalize:** scene model, connector endpoints, collision detection, bounds validation, panel overflow

### `getEffectiveDimensions(element) → Promise<{ w, h, _autoHeight }>`

Computes effective w/h. For `el()` without explicit `h`, measures HTML.

---

## Measurement

### `measure(html, props?) → Promise<{ w, h }>`

Off-screen DOM measurement of HTML content.

Props: `w?: number` (constraining width), `className?: string`, `style?: object` (filtered through `filterStyle`).

Without `w`: natural width/height. With `w`: constrained width, measured height. Images waited on (3s timeout). Cached by `(html, w, style, className)`.

### `clearMeasureCache() → void`

Clears measurement cache. Call if fonts change.

---

## Linting

### `lintSlide(slideData, slideElement?) → LintFinding[]`

`slideData: { id, layout: { elements, warnings, errors, collisions } }`. Optional `slideElement: HTMLElement`.

### `lintDeck(skData, sections?) → LintFinding[]`

`skData: { slides: LintSlideData[] }`. Optional `sections: NodeListOf<HTMLElement>`.

### `LintFinding`

`{ rule, severity: "error"|"warning"|"info", elementId, message, detail, bounds?, parentBounds?, suggestion, slideId? }`

### Lint Rules

- `duplicate-id` (error): Two+ elements share same `id` on same slide. Runs first — duplicates cause cascading issues.

### `window.sk` Lint API

`window.sk.lint(slideId) → LintFinding[]` — per-slide (fast, use during dev).
`window.sk.lintDeck() → LintFinding[]` — all slides (cross-slide checks: title-position-drift, style-drift).

DO: Filter findings: `findings.filter(f => f.severity !== 'info')`. Focus on `text-overflow`, `canvas-overflow`, `non-ancestor-overlap`.
DO: `allowOverlap: true` on intentionally overlapping elements.
DONT: Suppress overflow with `overflow: 'hidden'` to silence lint — fix dimensions instead.

---

## Configuration Utilities

### `safeRect() → Rect`

Returns safe zone rectangle. Default: `{ x: 120, y: 90, w: 1680, h: 900 }`. Throws if `init()` not called.

DO: Use `safeRect()` instead of hardcoded numbers. Content stays within x: 120–1800, y: 90–990.

### `splitRect(rect, options?) → { left: Rect, right: Rect }`

Splits rectangle for two-column layouts.
- `rect: Rect!` (typically `safeRect()`)
- `options.ratio: number def=0.5` — fraction of usable width for left (0–1)
- `options.gap: px|tok def=0`

```js
const { left, right } = splitRect(safeRect(), { ratio: 0.55, gap: 40 });
```

DO: Use `splitRect()` over manual column math — lint-friendly explicit coordinates.
DONT: Use `left.h`/`right.h` as content height — it's max available. Omit `h` on content containers; use `h` only on full-bleed elements (images, bg rects).

### `getConfig() → SlideKitConfig|null`

Deep copy of current config, or `null` if `init()` not called.

### `isFontLoaded(family, weight? def=400) → boolean`

### `getFontWarnings() → Array<Record<string,unknown>>`

### `_resetForTests() → void`

Resets all state (config, safe rect, ID counters, fonts, cache, DOM). Testing only.

### `resetIdCounter() → void`

Resets auto-ID counter. Called automatically at start of `layout()` and `render()`.

---

## Utilities

### `grid(config?) → Grid`

Column grid for consistent positioning.
- `cols: number def=12`, `gutter: number def=30`, `margin: { left?, right? } def=safe zone margins`

Returns: `cols, gutter, colWidth, marginLeft, marginRight, totalWidth, col(n)` (X of column n, 1-based), `spanW(from, to)` (width spanning columns, inclusive, 1-based). Throws if `colWidth ≤ 0`.

### `snap(value, gridSize) → number`

Rounds to nearest grid increment. Returns unchanged if `gridSize ≤ 0`.

### `resolvePercentage(value, axis: "x"|"y"|"w"|"h") → unknown`

`"N%"` → % of slide dimension. `"safe:N%"` → % of safe zone. Non-strings pass through. Resolved automatically during layout Phase 1.

### `repeat(element, config?) → GroupElement`

Duplicates element in grid pattern.
- `count: number def=1`, `cols: number def=count`
- `gapX: px|tok def=0`, `gapY: px|tok def=0`
- `startX: number def=0`, `startY: number def=0`

Returns group of deep-cloned copies with IDs `{baseId}-{i+1}`.

### `rotatedAABB(w, h, degrees) → { w, h }`

Axis-aligned bounding box of rotated rectangle.

---

## Types Reference

### Geometry
`Rect = { x, y, w, h }` · `Point = { x, y }` · `AnchorPointResult = { x, y, dx, dy }`

### Element Types
`SlideElement = ElElement | GroupElement | VStackElement | HStackElement | ConnectorElement`
- `ElElement = { type: "el", id, content, props, _layoutFlags }`
- `GroupElement = { type: "group", id, children, props, _layoutFlags }`
- `VStackElement = { type: "vstack", id, children, props, _layoutFlags }`
- `HStackElement = { type: "hstack", id, children, props, _layoutFlags }`
- `ConnectorElement = { type: "connector", id, props, _layoutFlags }`
- `PanelElement` = Group with `_compound: "panel"`, `_panelConfig`
- `FigureElement` = Group with `_compound: "figure"`, `_figureConfig`

### String Unions
- `AnchorPoint`: `tl|tc|tr|cl|cc|cr|bl|bc|br`
- `LayerName`: `bg|content|overlay`
- `VAlign`: `top|center|bottom`
- `OverflowPolicy`: `visible|warn|clip|error`
- `HAlign`: `left|center|right|stretch`
- `HStackAlign`: `top|middle|bottom|stretch`
- `ConnectorType`: `straight|curved|elbow|orthogonal`
- `ArrowType`: `none|end|start|both`
- `ElementType`: `el|group|vstack|hstack|connector`
- `CompoundType`: `panel|figure`
- `BoundsMode`: `hug|undefined`
- `ProvenanceSource`: `authored|measured|stack|constraint|transform|default`
- `ShadowPreset`: `sm|md|lg|xl|glow`

### Value Types
- `PositionValue = number | string | RelMarker`
- `SizeValue = number | string | RelMarker`
- `RelMarker = { _rel: RelMarkerKind, ref?, ref2?, gap?, bias?, axis?, rect? }`
- `RelMarkerKind`: positional (`below|above|rightOf|leftOf|alignTop|alignBottom|alignLeft|alignRight|centerV|centerH|centerHSlide|centerVSlide|centerIn|between`), dimensional (`matchWidth|matchHeight`)
- `TransformMarker = { _transform, _transformId, ids, options }`

### Configuration Types
- `SlideKitConfig = { slide, safeZone, strict, minFontSize, fonts, spacing }`
- `FontDef = { family, weights?, source? }`
- `SpacingScale = { xs?, sm?, md?, lg?, xl?, section?, [key]: number }`
- `SlideDefinition = { id?, background?, elements, transforms?, notes? }`
- `VersionCheckResult = { ok, warning?, error? }`

### Layout Types
- `LayoutResult = { elements, rootIds, transforms, warnings, errors, collisions }`
- `SceneElement` = full resolved element in scene graph
- `Collision = { elementA, elementB, overlapRect, overlapArea }`
- `StyleFilterResult = { filtered, warnings }`

### Input Props Types
- `InputProps = ElementProps & { id? }` — input for all element factories
- `ElementProps` = all CP + `gap, align, vAlign, hAlign, bounds, scale, clip`
- `CardGridOptions = InputProps & { cols? }`
- `ConnectorInputProps = { id?, type?, arrow?, color?, thickness?, dash?, fromAnchor?, toAnchor?, label?, labelStyle?, cornerRadius?, obstacleMargin?, layer?, opacity?, style?, className? }`
- `PanelInputProps = InputProps & { padding?, fill?, radius?, border?, vAlign? }`
- `FigureInputProps = { id?, src?, x?, y?, w?, h?, anchor?, layer?, containerFill?, containerRadius?, containerPadding?, caption?, captionGap?, fit?, style? }`

---

## Height Rules

DONT: Specify `h` on text elements — overrides DOM measurement, leading cause of text-overflow bugs.
DONT: Calculate height mathematically (`fontSize * lineHeight`) — browser metrics make this inaccurate.
DONT: Specify `h` just for positioning math — use `below()` chaining instead.
DONT: Specify `h` to vertically center — use `vAlign: 'center'` in a vstack/panel instead.
DONT: Use `h: left.h` from `splitRect()` on content containers — that's full column height.
DO: Omit `h` on all text elements — SlideKit auto-measures from DOM.
DO: Always specify `w` on text — constrains wrapping so height measurement is accurate.
DO: Only specify `h` for fixed-size containers (panels, terminal blocks, image frames).

---

## Field-Tested DO/DONT Rules

These were discovered by AI agents building real presentations:

DONT: Create `el()` without explicit `w` — collapses to 0px, invisible. Always set `w` or use `w: 'fill'` in a container.
DONT: Create groups without `w`/`h` or `bounds: 'hug'` when used as layout containers — defaults to 0×0, children invisible.
DONT: Let `below()` chains accumulate beyond safe zone. Total budget: 990 − 90 = 900px for all elements + gaps. Verify last element bottom ≤ 990.
DONT: Assume `w: 'fill'` equals parent width — padding and siblings reduce it. Check `window.sk.layouts[N].elements['id'].resolved.w`.
DONT: Use unencoded special characters in SVG data URIs — use `encodeURIComponent()`.
DONT: Use `parentId` to suppress overlap warnings unless the parent-child relationship is actually correct.
DONT: Use tight gaps (< 30px) after large visuals — captions look cramped. Use `max(30px, 1.5× caption font size)`.
DO: For 3+ column layouts, compute positions explicitly instead of `hstack()` — eliminates 10-16 false-positive overlaps per slide: `cardW = (safe.w - gap*(cols-1)) / cols; x = safe.x + col*(cardW+gap)`.
DO: When `panel([child1, child2])` causes false overlaps, flatten to single `el()` with inline HTML.
DO: Fill the safe zone width with cards — narrow cards waste space and trigger `content-clustering`.
DO: Render images first, read `img.naturalWidth/naturalHeight`, compute exact container so `object-fit: contain` is a no-op.
DO: CSS framework resets go in `_baselineCSS()` (style.ts), not inline on every element.

---

## Common Design Patterns

### Title Slide
Large centered text (`anchor: 'tc'`, `x: 960`, font 72–96px), subtitle below with generous gap, decorative elements on `layer: 'bg'`. Sparse by design — `content-clustering` warnings expected.

### Two-Column Content
```js
const { left, right } = splitRect(safeRect(), { ratio: 0.5, gap: 40 });
el(content, { x: left.x, y: left.y, w: left.w });
el(diagram, { x: right.x, y: right.y, w: right.w });
```

### Lint-Friendly Card Grid (3+ columns)
```js
const cols = 3, gap = 20;
const cardW = (safe.w - gap * (cols - 1)) / cols;
cards.forEach((card, i) => {
  const col = i % cols, row = Math.floor(i / cols);
  panel(card.children, { x: safe.x + col * (cardW + gap), y: topY + row * (cardH + gap), w: cardW });
});
```

### Pre-Commit Checklist
- `text-overflow`: all text visible? `scrollHeight ≤ clientHeight`
- `canvas-overflow`: all elements within 1920×1080?
- Safe zone: content-layer within x:120–1800, y:90–990?
- No unintended sibling overlaps
- Gaps ≥ 8px between text elements
- Contrast ≥ 4.5:1 for body text
- `textAlign` matches direction (`leftOf`→`right`, `rightOf`→`left`)
- CSS props inside `style: {}`, not top level
- Related moving elements wrapped in `group()`
- `dash` is SVG string (`"5 5"`), not CSS (`"6,4"`)
- `between`/`placeBetween` elements fit in the gap

# SlideKit Implementation Plan

## Overview

This document describes exactly how to build SlideKit — the coordinate-based slide layout library specified in `SLIDEKIT_DESIGN.md`. The implementation is broken into ordered milestones. Each milestone produces working, testable code that builds on the previous one.

**Review feedback incorporated** (Gemini Pro 3 + GPT 5.2):
- M1.1: Auto-generated IDs scoped per `layout()`/`render()` call for determinism
- M1.3: CSS blocklist rewritten — normalize to camelCase, expand to all longhands, `filterStyle(style, elementType)`, `transform` blocked entirely
- M1.4: Added slide `background` and speaker `notes` rendering
- M2.3: `measureText()` uses `<div>` + `scrollHeight` (not `<span>` + `getClientRects()`), `lines[]` deferred to Tier 3
- M3.1: Layout solver restructured into explicit 4-phase pipeline (sizes → positions → transforms → finalize)
- M3.2: Deferred value validation — `_rel` markers only valid on `x`/`y`, error on `w`/`h`
- M4.2: Ellipsis uses binary search on word count, overflow detection via `scrollHeight > clientHeight`
- M5.4: Stacks participate as nodes in dependency graph (not separate pre-phase)
- M7.3: Panel children use `"fill"` instead of `"100%"` to avoid percentage ambiguity
- M8.3: `"N%"` is always slide-relative, `"fill"` is parent-relative
- M9: Added theme CSS loading docs, decktape export smoke test
- Testing: Async support required, tolerance-based text assertions

---

## Phase 2 Awareness: Live Editing & Round-Trip

**Milestones 1–9 are Phase 1** — the one-way pipeline (spec → layout solve → render). **Phase 2** (Milestones 10–11) adds live inspection, mutation, and round-trip serialization so an AI agent can view rendered slides via Playwright MCP, make corrections via the browser console, and export the updated layout back to a SlideKit specification.

Phase 2 is designed as an add-on, not a rewrite. But several Phase 1 decisions are made specifically to enable it:

### Front-Loaded Requirements (built in Phase 1, needed by Phase 2)

1. **Persistent scene model** — After `render()`, the scene model (constraint graph + resolved frames) must remain alive in memory, accessible via `window.sk`. The DOM is a render target, not the source of truth. *(Affects M3.3)*

2. **Provenance tracking** — Each resolved value in the scene graph carries metadata about what determined it: authored value, constraint resolution, text measurement, or transform adjustment. This is a few extra fields per element but makes Phase 2 export deterministic. *(Affects M3.1 Phase 4)*

3. **`data-sk-id` on DOM elements** — Every rendered DOM element gets a `data-sk-id` attribute matching its scene model ID. This enables Phase 2's inspection API to map between DOM and model. *(Affects M1.4)*

4. **Constraints preserved in scene graph** — The scene graph stores both `authored` (original spec with `_rel` markers, constraint references) and `resolved` (absolute pixel values). Phase 2 reads both. *(Affects M3.1)*

5. **Transforms stored in scene graph** — The `transforms` array (alignment, distribution, size matching operations) is preserved in the layout result so Phase 2 can serialize them back on export. *(Affects M6.5)*

### Implementation Note

When implementing Phase 1 milestones, do NOT discard constraint information after layout solve. The `layout()` result should contain everything needed to reconstruct the original specification. If you're tempted to throw away the original `_rel` markers or `transforms` array after resolving to absolute positions — don't. Phase 2 needs them.

---

**Technology choices:**
- Pure JavaScript (ES modules, no TypeScript for v1 — keeps the build step zero)
- No bundler — single-file library loaded via `<script type="module">` or import
- Tests via a test HTML page that renders slides and asserts layout results (no Node test runner needed — the library requires a DOM)
- Reveal.js 5.x loaded via CDN

**File structure:**
```
slidekit/
├── slidekit.js              # The library (single file, all tiers)
├── slidekit-debug.js        # Debug overlay renderer (separate to keep core lean)
├── test/
│   ├── test.html            # Test harness — loads slidekit, runs tests in-browser
│   ├── test-runner.js       # Test framework (assert, describe, it — minimal)
│   ├── test-primitives.js   # Tests for Tier 1 primitives
│   ├── test-text.js         # Tests for text system (measure, fit, overflow)
│   ├── test-layout.js       # Tests for layout solve, relative positioning, stacks
│   ├── test-validation.js   # Tests for warnings, errors, collision detection
│   ├── test-alignment.js    # Tests for Tier 2 alignment/distribution
│   ├── test-compounds.js    # Tests for Tier 2 compound primitives
│   ├── test-inspection.js   # Tests for Phase 2 inspection API (M10)
│   ├── test-mutation.js     # Tests for Phase 2 mutation API (M10)
│   ├── test-export.js       # Tests for Phase 2 round-trip export (M11)
│   └── visual/
│       ├── visual-test.html # Visual test page — renders example slides for human/screenshot review
│       └── slides.js        # Example slide definitions for visual testing
├── examples/
│   ├── basic.html           # Minimal example — one slide with a few elements
│   ├── full-deck.html       # Full example — 5-slide deck demonstrating all features
│   └── theme.css            # Example CSS theme (styling only, no layout)
└── README.md                # Usage guide
```

---

## Milestone 1: Foundation — Element Model, Coordinate System, Basic Rendering

**Goal:** Establish the core data model and render absolutely-positioned divs into a Reveal.js slide. No measurement, no layout solve, no validation — just "put div at (x, y) with width w and height h."

### 1.1 Core Element Model [DONE]

Define the element creation functions. Each returns a plain object (no classes):

```js
{ id, type, props }
```

- `text(content, props)` → `{ id: "auto-1", type: "text", content, props: { x, y, w, h, anchor, ... } }`
- `image(src, props)` → `{ id: "auto-2", type: "image", src, props: { x, y, w, h, fit, ... } }`
- `rect(props)` → `{ id: "auto-3", type: "rect", props: { x, y, w, h, fill, ... } }`
- `rule(props)` → `{ id: "auto-4", type: "rule", props: { x, y, w, direction, thickness, color, ... } }`
- `group(children, props)` → `{ id: "auto-5", type: "group", children, props: { x, y, scale, ... } }`

Auto-generated IDs use a counter scoped to each `layout()`/`render()` call (`sk-1`, `sk-2`, ...), reset between calls to ensure deterministic IDs for the same slide definition. User-provided `id` overrides.

Default values for all common properties (anchor defaults to `"tl"`, layer defaults to `"content"`, etc.).

### 1.2 Anchor Resolution [DONE]

Implement `resolveAnchor(x, y, w, h, anchor)` → `{ left, top }`.

Given the user-specified (x, y) and the element's (w, h), compute the CSS `left` and `top` values based on the anchor point.

- `"tl"`: left = x, top = y
- `"cc"`: left = x - w/2, top = y - h/2
- `"br"`: left = x - w, top = y - h
- All 9 combinations.

### 1.3 CSS Property Filtering [DONE]

Implement the style pass-through system:

- **Normalize all property names to camelCase** before comparison (e.g., `background-color` → `backgroundColor`). This prevents bypass via alternate naming.
- `BLOCKED_PROPERTIES` — comprehensive set of **longhand** CSS property names that are stripped. Expand shorthand families to all longhands:
  - Layout position: `position`, `top`, `left`, `right`, `bottom`, `inset`, `insetBlock`, `insetInline`, etc.
  - Sizing: `width`, `height`, `minWidth`, `maxWidth`, `minHeight`, `maxHeight`, `blockSize`, `inlineSize`, etc.
  - Flex: `display`, `flexDirection`, `flexWrap`, `flexGrow`, `flexShrink`, `flexBasis`, `alignItems`, `justifyContent`, `alignSelf`, `order`, `gap`, `rowGap`, `columnGap`
  - Grid: `gridTemplateColumns`, `gridTemplateRows`, `gridColumn`, `gridRow`, `gridArea`, `gridAutoFlow`, etc.
  - Float/clear: `float`, `clear`
  - Overflow: `overflow`, `overflowX`, `overflowY` (library manages these)
  - Margin: `margin`, `marginTop`, `marginRight`, `marginBottom`, `marginLeft`, `marginBlock`, `marginInline`
  - Transform: `transform` (blocked entirely — use the `rotate` prop instead; the library owns element positioning)
- `filterStyle(style, elementType)` → `{ filtered, warnings }` where `filtered` is the style object with blocked props removed, and `warnings` is an array of blocked-property warning objects. The `elementType` parameter enables future element-specific exceptions if needed.
- Convenience prop → CSS mapping: `color` → `color`, `font` → `fontFamily`, `size` → `fontSize` (with "px" suffix), etc.
- Merge order: convenience props first, then `style` object (style wins on conflict)

### 1.4 Basic Renderer [DONE]

Implement `SlideKit.render(slides, options)`:

- For each slide definition, create a `<section>` element (Reveal.js slide)
- Inside each section, create a `<div class="slidekit-layer">` with `position: relative; width: 1920px; height: 1080px;`
- For each element in the slide, create a `<div>` with:
  - `data-sk-id` attribute set to the element's ID *(Phase 2 requirement: enables DOM↔model mapping for inspection/mutation)*
  - `position: absolute`
  - `left`, `top` from anchor resolution
  - `width`, `height` from props
  - Merged styling CSS from filtered `style` + convenience props
  - `className` if provided
  - Type-specific rendering:
    - `text`: innerHTML = content (with `\n` → `<br>`)
    - `image`: child `<img>` element with `object-fit` from `fit` prop
    - `rect`: just the styled div (background, border, etc.)
    - `rule`: a div with appropriate width/height and background-color
    - `group`: a container div with children rendered recursively, offset by group's (x, y)
- Apply z-ordering: sort elements by layer (bg=0, content=1, overlay=2), then by declaration order within layer, then by explicit `z` if present. Set `z-index` accordingly.
- **Slide background:** If the slide definition includes a `background` property (color, gradient, or image), set it on the `<section>` element via Reveal.js `data-background-*` attributes
- **Speaker notes:** If the slide definition includes a `notes` property (string), render an `<aside class="notes">` element inside the `<section>`
- Append all `<section>` elements to the target `.reveal .slides` container
- Initialize Reveal.js with provided config

### 1.5 Init Function [DONE]

Implement `SlideKit.init(config)`:

- Store slide dimensions (default 1920×1080)
- Store safe zone config (default margins)
- Store validation mode (strict/lenient)
- Store min font size threshold
- Compute and cache `safeRect()`
- Return a promise that resolves when ready (for now, resolves immediately — font loading comes in M2)

### 1.6 Tests [DONE]

- Test element creation functions return correct object shapes
- Test auto-generated IDs are deterministic (same elements → same IDs across calls)
- Test anchor resolution for all 9 anchor points
- Test CSS property filtering blocks the right properties and passes others
- Test CSS filtering normalizes camelCase (e.g., `background-color` is allowed, `flex-direction` is blocked)
- Test CSS filtering blocks `transform` property
- Test convenience prop → CSS mapping
- Test slide `background` property renders as `data-background-*` attributes
- Test `notes` property renders `<aside class="notes">`
- Test that render produces correct DOM structure (check element positions, classes, styles)
- Visual test: render a slide with one of each element type, verify in browser

**Deliverable:** A working library that renders absolutely-positioned elements into Reveal.js slides. No text measurement yet — text height must be specified manually.

---

## Milestone 2: Text Measurement & Font Loading

**Goal:** Implement `measureText()` and font preloading so the agent can compute text dimensions before placing elements. This unblocks auto-height for text elements.

### 2.1 Font Preloading [DONE]

Extend `SlideKit.init()`:

- Accept `fonts` array in config
- For each font, call `document.fonts.load()` with the specified weight and a test string
- For Google Fonts: dynamically inject `<link>` elements to load the font CSS
- Wait for `document.fonts.ready`
- Track loaded fonts in a set for validation later
- If a font fails to load within a timeout (5s), emit a warning and fall back to system font

### 2.2 Measurement Element [DONE]

Create a hidden off-screen measurement container:

- A `<div>` with `position: absolute; left: -9999px; top: -9999px; visibility: hidden;`
- Styled identically to the slidekit-layer (same base font settings)
- This element is reused for all text measurements

### 2.3 `measureText(content, props)` [DONE]

Implementation:

1. Check that the required font is loaded (error if not)
2. Create a measurement `<div>` (not `<span>`) inside the measurement container — block-level elements give reliable height metrics for wrapped text
3. Apply CSS properties: `fontFamily`, `fontSize`, `fontWeight`, `lineHeight`, `letterSpacing`, `whiteSpace: pre-wrap`, `wordBreak: break-word`
4. If `w` is provided, set `width` on the div (constrains wrapping)
5. Set `innerHTML` to content (with `\n` → `<br>`)
6. Read `scrollHeight` and `offsetHeight` for block height (use `scrollHeight` as the canonical height — it's reliable for wrapped text across browsers). Read `offsetWidth` for unconstrained width when `w` is not provided.
7. Compute `lineCount` by dividing `scrollHeight` by computed `lineHeight` (rounded). **Note:** Per-line metrics via `getClientRects()` are unreliable for block-level wrapped text; exact line-break positions (`lines` array) are deferred to Tier 3 as a best-effort feature.
8. Return `{ block: {w, h}, lineCount, fontSize }` — where `h` is `scrollHeight` and `w` is the constraining width (or measured `offsetWidth` if unconstrained)
9. Cache the result keyed by `(content, font, size, weight, lineHeight, letterSpacing, w)`

**Cross-browser note:** `scrollHeight` on a hidden `<div>` is the most reliable way to measure wrapped text height. Avoid depending on `getClientRects()` for block metrics — it returns per-fragment rects that vary by browser for wrapped inline content.

### 2.4 Auto-Height for Text Elements [DONE]

Update the renderer to handle `h: null` (unspecified height) for text elements:

- During rendering, if a text element has no explicit `h`, call `measureText()` to determine height
- Store the measured height in the element's resolved data

### 2.5 Tests [DONE]

- Test measureText with single-line text returns correct width/height
- Test measureText with multi-line text (explicit `\n`) returns correct lineCount
- Test measureText with constrained width causes wrapping, correct lineCount
- Test measureText with different fonts returns different dimensions
- Test that measureText before font loading fails/warns
- Test auto-height text elements get correct height after rendering
- Test measurement caching (second call with same params doesn't hit DOM)

**Testing note:** Text measurement values vary by browser and system fonts. Use tolerance-based assertions (e.g., `assert.within(measured.h, expected, 4)`) rather than exact pixel values. Test with a known web font (loaded in test setup) for reproducibility.

**Deliverable:** `measureText()` works correctly. Text elements can omit `h` and get auto-measured height.

---

## Milestone 3: Layout Solve — Relative Positioning & Scene Graph

**Goal:** Implement the layout solve phase — resolve relative positions, build the scene graph, return structured layout data.

### 3.1 Layout Solve Pipeline [DONE]

Implement `SlideKit.layout(slideDefinition)` as an explicit **4-phase pipeline**:

**Phase 1: Resolve Intrinsic Sizes**
1. Collect all elements (flatten groups, expand stacks into their children nodes)
2. For text elements without explicit `h`, call `measureText()` to determine height
3. For text elements without explicit `w` (rare, but supported), measure unconstrained width
4. For stacks: measure all children first, then compute the stack's own w/h from children + gaps
5. After this phase, every element has known `w` and `h`

**Phase 2: Resolve Positions via Unified Topological Sort**
1. Build a dependency graph from all relative positioning references (`below("title")`, etc.) — stacks participate as nodes in this graph (a stack's children depend on the stack's position, the stack depends on whatever its own x/y references)
2. Detect cycles. If cycles exist, return an error.
3. Process elements in topological order:
   - Resolve any deferred position values (`_rel` markers) to absolute coordinates using referenced elements' resolved bounds
   - **Validate deferred values:** `_rel` markers are only valid on `x` and `y` properties. If found on `w` or `h`, emit an error.
   - Resolve anchor to compute final `left`/`top`
   - Store resolved bounds: `{ x, y, w, h }` (the actual top-left corner and dimensions)

**Phase 3: Apply Transforms**
1. Process the slide's `transforms` array in order (alignment, distribution, size matching — see M6)
2. Each transform reads current resolved bounds and adjusts positions/sizes
3. Re-resolve anchors for any elements whose positions changed

**Phase 4: Finalize**
1. Run collision detection (M5)
2. Resolve connector endpoints (M7 — `connect()` needs final positions of both endpoints)
3. Build **provenance metadata** for each element — record what determined each resolved value:
   - `"authored"`: the agent specified this value directly
   - `"constraint"`: resolved from a `_rel` marker (record constraint type, ref, params)
   - `"measured"`: determined by text measurement (record font, size)
   - `"transform"`: adjusted by a post-solve transform (record transform type)
   - `"stack"`: position computed by parent stack (record stack ID, index)
4. Run validation checks (safe zone, slide bounds, font size, content area — M4)
5. Return scene graph:
   ```js
   {
     elements: {
       [id]: {
         id, type,
         authored: { /* original spec with _rel markers, raw props */ },
         resolved: { x, y, w, h },
         provenance: { x: {source, ...}, y: {source, ...}, w: {source, ...}, h: {source, ...} },
       }
     },
     transforms: [ /* original transforms array, preserved for round-trip */ ],
     warnings: [],
     errors: [],
     collisions: [],
   }
   ```

*(Phase 2 note: The `authored` field and `provenance` metadata are what make deterministic round-trip export possible. The `transforms` array is preserved so it can be serialized back on export. Do not discard these after layout solve.)*

This 4-phase ordering eliminates ambiguity: sizes are known before positions are computed, positions are stable before transforms adjust them, and validation runs on final positions.

### 3.2 Relative Positioning Helpers [DONE]

Implement each helper as a function that returns a **deferred value** — a marker object that the layout solver recognizes and resolves:

- `below(refId, {gap})` → `{ _rel: "below", ref: refId, gap }`
- `above(refId, {gap})` → `{ _rel: "above", ref: refId, gap }`
- `rightOf(refId, {gap})` → `{ _rel: "rightOf", ref: refId, gap }`
- `leftOf(refId, {gap})` → `{ _rel: "leftOf", ref: refId, gap }`
- `centerVWith(refId)` → `{ _rel: "centerV", ref: refId }`
- `centerHWith(refId)` → `{ _rel: "centerH", ref: refId }`
- `alignTopWith(refId)` → `{ _rel: "alignTop", ref: refId }`
- `alignBottomWith(refId)` → `{ _rel: "alignBottom", ref: refId }`
- `alignLeftWith(refId)` → `{ _rel: "alignLeft", ref: refId }`
- `alignRightWith(refId)` → `{ _rel: "alignRight", ref: refId }`
- `centerIn(rect)` → `{ _rel: "centerIn", rect }`

During layout solve (Phase 2), when the solver encounters a `_rel` marker on `x` or `y`, it looks up the referenced element's resolved bounds and computes the value. **Validation:** If a `_rel` marker appears on `w` or `h`, emit an error — deferred values are only valid for position properties, not dimensions.

### 3.3 Update Renderer to Use Layout Solve [DONE]

Change `SlideKit.render()` to:

1. Call `SlideKit.layout()` first to get the resolved scene graph
2. Use resolved positions (not raw props) when creating DOM elements
3. **Persist the scene model** on `window.sk` (or a configurable global) so it's accessible from the browser console after rendering. Store the full layout result including `authored` specs, `resolved` frames, `provenance`, and `transforms`. *(Phase 2 requirement: the inspection and mutation APIs operate on this persistent model.)*
4. Return the layout result so the agent can inspect it programmatically

### 3.4 `safeRect()` Helper [DONE]

Implement as a function that returns `{ x, y, w, h }` computed from the init config's safe zone margins.

### 3.5 Tests [DONE]

- Test layout solve resolves `below()` correctly (measures ref element, adds gap)
- Test layout solve resolves `rightOf()`, `centerIn()`, and all other helpers
- Test cycle detection (A depends on B, B depends on A → error)
- Test multi-level dependencies (A → B → C resolves in correct order)
- Test deferred value validation: `_rel` on `w` or `h` produces error
- Test scene graph contains correct specified vs. resolved bounds
- Test 4-phase ordering: sizes resolved before positions, transforms after positions, validation last
- Test renderer uses resolved positions
- Test safeRect() computes correctly from config
- Test scene graph preserves `authored` specs (original `_rel` markers are accessible)
- Test provenance tracks correct source for each resolved value
- Test `window.sk` is populated after `render()` with the full scene model

**Deliverable:** Full layout solve pipeline. Relative positioning works. Scene graph is returned with resolved bounds, authored specs, and provenance metadata.

---

## Milestone 4: fitText, Overflow Policies, Text Validation

**Goal:** Implement auto-fit text sizing, overflow handling, and presentation-specific text validations.

### 4.1 `fitText(content, box, options)`

Implementation:

1. Start with `maxSize`
2. Call `measureText(content, { ...options, size: candidate, w: box.w })`
3. If `metrics.block.h <= box.h`, this size fits → return it
4. Decrement by `step` and try again
5. If reached `minSize` and still doesn't fit, return `minSize` + overflow warning
6. Optimization: use binary search between `minSize` and `maxSize` instead of linear scan

Return `{ fontSize, metrics, warnings }`.

### 4.2 Overflow Policies in Layout Solve

During layout solve, for text elements with explicit `h`:

1. Measure the text using `scrollHeight` from measurement div
2. If `scrollHeight > clientHeight` (overflow detected):
   - `"visible"`: no action, text renders beyond box
   - `"warn"`: add warning to layout result
   - `"clip"`: set `overflow: hidden` on the rendered element
   - `"ellipsis"`: truncate text using binary search on string length — remove words from the end until `measureText()` shows the text + "..." fits within the box height. Do NOT use CSS `text-overflow: ellipsis` (it only works for single-line text). Concrete algorithm:
     1. Split content into words
     2. Binary search for the maximum word count where `measureText(words.slice(0, n).join(" ") + "...", { w, font, size }).block.h <= h`
     3. Replace content with the truncated text + "..."
   - `"shrink"`: call `fitText()` to auto-size, update the element's font size
   - `"error"`: add error to layout result

### 4.3 Presentation-Specific Validations

Add to layout solve:

- **Font size check:** If any text element's font size is below `minFontSize` (from config), emit warning
- **Content outside safe zone:** If any element's resolved bounds extend outside `safeRect()`, emit warning (or error in strict mode)
- **Content outside slide:** If any element's resolved bounds extend outside (0, 0, 1920, 1080), emit warning/error
- **Content area usage:** Compute the bounding box of all content-layer elements. If it's less than 40% of safe zone area, emit "content may be too clustered" warning. If > 95%, emit "no breathing room" warning.

### 4.4 Tests

- Test fitText finds correct font size for various text lengths
- Test fitText respects minSize and maxSize bounds
- Test fitText emits warning when below projection threshold
- Test each overflow policy produces correct behavior
- Test ellipsis truncation is correct
- Test shrink policy calls fitText and updates font size
- Test safe zone warnings fire for out-of-bounds elements
- Test slide bounds warnings fire
- Test content area usage warnings
- Test strict mode produces errors instead of warnings

**Deliverable:** Text auto-sizing works. Overflow policies are enforced. Validation catches common slide problems.

---

## Milestone 5: Collision Detection & vstack/hstack

**Goal:** Detect overlapping elements. Implement stack layout primitives.

### 5.1 Collision Detection

After layout solve resolves all positions, run AABB intersection checks:

- For every pair of elements in the same layer (bg, content, overlay separately):
  - Compute intersection rectangle
  - If intersection area > threshold (configurable, default 0), record collision
- Skip: elements in different layers, elements where one is a child of the other (group containment)
- Add collisions to layout result

Collision object:
```js
{ elementA: "id1", elementB: "id2", overlapRect: {x, y, w, h}, overlapArea: number }
```

### 5.2 `vstack(items, props)`

Implementation:

1. Create a group-like container
2. During layout solve, iterate children top-to-bottom:
   - First child: placed at the stack's (x, y)
   - Each subsequent child: placed at `below(previousChild, { gap })`
   - Horizontal alignment within the stack: `"left"` → x = stack.x, `"center"` → x = stack.x + (stack.w - child.w) / 2, `"right"` → x = stack.x + stack.w - child.w
3. Resolve each child's position (including measuring text children for height)
4. Stack's total height = sum of children heights + gaps

Return a group element with children whose positions have been resolved to absolute coordinates.

### 5.3 `hstack(items, props)`

Same as vstack but horizontal:

1. Iterate children left-to-right
2. Each subsequent child: placed at `rightOf(previousChild, { gap })`
3. Vertical alignment: `"top"`, `"middle"`, `"bottom"`
4. Stack's total width = sum of children widths + gaps

### 5.4 Stack Integration with Layout Solve

Stacks participate as **nodes in the dependency graph**, not as a separate pre-phase. This follows the 4-phase pipeline from M3:

- **Phase 1 (Sizes):** Measure all stack children (text measurement, etc.), then compute each stack's total w/h from children sizes + gaps
- **Phase 2 (Positions):** Stacks enter the topological sort like any other element. A stack's position may depend on another element (e.g., `y: below("heading")`), and other elements may depend on stack children. The dependency graph captures all of this. Once a stack's position is resolved, its children's positions are computed from the stack origin + accumulated offsets.
- **Phase 3 (Transforms):** Alignment/distribution can target stack children just like any other element
- **Phase 4 (Finalize):** Collision detection treats stack children as individual elements

### 5.5 Tests

- Test collision detection finds overlapping elements
- Test collision detection ignores elements in different layers
- Test collision detection respects threshold
- Test vstack places children correctly with gap
- Test vstack alignment (left, center, right)
- Test hstack places children correctly with gap
- Test hstack alignment (top, middle, bottom)
- Test vstack with auto-height text children measures correctly
- Test elements can reference stack children via relative positioning
- Test nested stacks (vstack inside hstack)

**Deliverable:** Overlaps are detected and reported. Stack primitives produce correct absolute positioning.

---

## Milestone 6: Alignment, Distribution & Size Matching (Tier 2)

**Goal:** Implement PowerPoint-style alignment, distribution, and size matching operations.

### 6.1 Alignment Functions

Each function takes an array of element IDs and an optional `{ to: number }` anchor value. They modify element positions during layout solve.

Implementation: alignment operations are registered as **post-solve transforms** — they run after all elements have initial resolved positions, then adjust those positions.

- `alignLeft(ids, {to})`: Set all elements' left edge to `to` (or the minimum left edge among them)
- `alignRight(ids, {to})`: Set all elements' right edge to `to` (or the maximum right edge)
- `alignTop(ids, {to})`: Set all elements' top edge to `to` (or the minimum top edge)
- `alignBottom(ids, {to})`: Set all elements' bottom edge to `to` (or the maximum bottom edge)
- `alignCenterH(ids, {to})`: Set all elements' horizontal center to `to` (or the average center)
- `alignCenterV(ids, {to})`: Set all elements' vertical center to `to` (or the average center)

### 6.2 Distribution Functions

- `distributeH(ids, {startX, endX, mode})`:
  - `"equal-gap"`: Compute total gap = (endX - startX) - sum(widths). Divide by (n-1). Place first element at startX, each subsequent at prev.right + gap.
  - `"equal-center"`: Compute center spacing = (endX - startX) / (n-1). Place each element's center at startX + i * spacing. (Adjust start/end to be element centers.)

- `distributeV(ids, {startY, endY, mode})`: Same logic, vertical axis.

### 6.3 Size Matching

- `matchWidth(ids)`: Find max width among elements, set all to that width
- `matchHeight(ids)`: Find max height, set all to that height
- `matchSize(ids)`: Both width and height

### 6.4 `fitToRect(ids, rect)`

1. Compute the bounding box of all specified elements
2. Compute scale factor to fit that bounding box into `rect` (preserving aspect ratio)
3. Apply scale and translate to all elements

### 6.5 Registration with Layout Solve

These operations need to be registered on the slide definition so the layout solver knows to apply them:

```js
{
  id: "my-slide",
  elements: [...],
  transforms: [
    alignTop(["card1", "card2", "card3"]),
    distributeH(["card1", "card2", "card3"], { startX: 170, endX: 1750, mode: "equal-gap" }),
  ]
}
```

The layout solver processes elements first (resolve positions), then applies transforms in order.

**Phase 2 note:** The `transforms` array must be preserved in the layout result (not discarded after application). Phase 2's export needs to serialize these back. Each transform should also be stored as a first-class object with an auto-generated ID so Phase 2 can reference and modify individual transforms.

### 6.6 Tests

- Test each alignment function (6 functions × with/without `to` parameter)
- Test distribution with equal-gap mode (different-width elements)
- Test distribution with equal-center mode
- Test matchWidth/matchHeight/matchSize
- Test fitToRect scales and positions correctly
- Test transform ordering (align then distribute vs distribute then align)

**Deliverable:** Full PowerPoint-style alignment and distribution. Size matching works.

---

## Milestone 7: Compound Primitives — bullets, connect, panel (Tier 2)

**Goal:** Implement higher-level primitives for common slide patterns.

### 7.1 `bullets(items, props)`

Implementation:

1. Parse items array — each item is a string or `{ text, children }` for nested lists
2. For each item, create a text element for the bullet character + a text element for the text
3. Position using vstack logic with `indent` per nesting level
4. Measure each text item to determine height
5. Return a group containing all the bullet elements

Bullet character is positioned at `x`, text at `x + bulletWidth + bulletGap`.

For nested items: indent = `baseIndent + level * indent`.

### 7.2 `connect(fromId, toId, props)`

Implementation:

1. During layout solve, after all elements are resolved, compute connection points:
   - `fromAnchor` (default "cr") → get the pixel position on the source element's edge
   - `toAnchor` (default "cl") → get the pixel position on the target element's edge
2. Render as an SVG `<line>` or `<path>` element:
   - `"straight"`: single `<line>`
   - `"curved"`: `<path>` with a cubic bezier (control points offset perpendicular to the line)
   - `"elbow"`: `<path>` with right-angle segments (horizontal out → vertical → horizontal in)
3. Arrow heads: SVG `<marker>` elements with `<polygon>` arrowheads
4. Optional label: positioned at the midpoint of the connector

The SVG element is absolutely positioned within the slidekit-layer to cover the bounding box of the connector.

### 7.3 `panel(children, props)`

Implementation:

1. Create a rect element for the background (using the panel's style/className)
2. Create a vstack of children inside the rect, offset by padding
3. Children with `w: "fill"` resolve to `panel.w - 2 * padding`. **Note:** Use `"fill"` (not `"100%"`) for parent-relative sizing to avoid conflict with Tier 3 percentage sugar where `"N%"` always means slide-relative.
4. If panel `h` is not specified, compute from vstack height + 2 * padding
5. Return a group containing the rect + the vstack

### 7.4 Tests

- Test bullets renders correct number of items with proper indentation
- Test nested bullets indent correctly
- Test bullets with different bullet characters
- Test connect straight line between two elements
- Test connect curved and elbow variants
- Test connect with arrow heads
- Test connect label positioning
- Test panel auto-height from children
- Test panel with explicit height
- Test panel children width resolution (`"fill"`)
- Test panel padding applied correctly

**Deliverable:** All Tier 2 compound primitives working. Common slide patterns are easy to build.

---

## Milestone 8: Debug Overlay & Tier 3 Features

**Goal:** Implement debug visualization and remaining Tier 3 features.

### 8.1 Debug Overlay (slidekit-debug.js)

Implement `SlideKit.renderDebugOverlay(options)`:

- Create an overlay `<div>` on top of the slidekit-layer
- `showBoxes`: Draw semi-transparent colored rectangles for each element's resolved bounds (different colors per type: text=blue, image=green, rect=orange, etc.)
- `showSafeZone`: Draw a dashed border at the safe zone boundary
- `showIds`: Render element IDs as small labels at each element's anchor point
- `showAnchors`: Render a small dot at each element's anchor point
- `showCollisions`: Highlight collision areas in semi-transparent red
- Toggle on/off without re-rendering the slide

### 8.2 Grid System

Implement `SlideKit.grid(config)`:

- `cols`: number of columns
- `gutter`: space between columns
- `margin`: `{ left, right }` (or use safe zone)
- Compute column widths: `(totalWidth - margins - gutters) / cols`
- `grid.col(n)` → x position of column n's left edge
- `grid.spanW(from, to)` → width spanning from column `from` to column `to` (including gutters)

Implement `snap(value, gridSize)` → round to nearest multiple.

### 8.3 Percentage Sugar

In the layout solver, detect string values on `x`, `y`, `w`, `h`:

- `"10%"` → `0.10 * slideWidth` (or slideHeight for y/h) — **always slide-relative**
- `"safe:10%"` → `safeRect().x + 0.10 * safeRect().w` (or y/h equivalents)

Parse at layout solve time, resolve to pixel values.

**Important:** `"N%"` is always relative to the slide dimensions (1920×1080), never to a parent element. For parent-relative sizing (e.g., filling a panel's content area), use `"fill"` instead. This avoids the "100% of what?" ambiguity.

### 8.4 Rotate

Add `rotate` property to elements (a dedicated prop, not CSS `transform` — `transform` is blocked in user styles to prevent positioning conflicts). The library applies it as `transform: rotate(Xdeg)` in the rendered CSS. Bounding box for collision detection uses the AABB of the rotated rectangle.

### 8.5 Repeat/Duplicate

Implement `repeat(element, config)`:

- `count`, `cols`, `gapX`, `gapY`, `startX`, `startY`
- Generate `count` copies of the element, laid out in a grid pattern
- Each copy gets a unique ID (`{baseId}-1`, `{baseId}-2`, ...)
- Return a group containing all copies

### 8.6 Shadow Presets

Map named shadows to CSS values in the style convenience props:

```js
const SHADOWS = {
  sm: "0 1px 3px rgba(0,0,0,0.2)",
  md: "0 4px 12px rgba(0,0,0,0.3)",
  lg: "0 8px 32px rgba(0,0,0,0.4)",
  xl: "0 16px 48px rgba(0,0,0,0.5)",
  glow: "0 0 40px rgba(124,92,191,0.3)",
}
```

### 8.7 Tests

- Test debug overlay renders correct elements for each option
- Test grid column positions and span widths
- Test snap function
- Test percentage resolution (slide-relative and safe-relative)
- Test rotate property renders correctly
- Test repeat generates correct number of copies with correct positions
- Test shadow presets map to correct CSS values

**Deliverable:** All features from the design doc are implemented. Full Tier 1 + 2 + 3.

---

## Milestone 9: Examples, Documentation & Integration Test

**Goal:** Build example slides, write usage docs, and run an end-to-end integration test with the Presentation Maker pipeline.

### 9.1 Example: Basic Slide

`examples/basic.html` — A single-file example that loads SlideKit and Reveal.js, defines one slide with text, image, rect, and rule elements, and renders it.

### 9.2 Example: Full Deck

`examples/full-deck.html` — A 5-slide deck demonstrating:
- Title slide (background image + centered text + accent rule)
- Content slide (heading + 3-column hstack of panels)
- Diagram slide (boxes + connectors)
- Bullet list slide (bullets primitive with nested items)
- Closing slide (large centered text + rule + small footer)

Uses an external `theme.css` for styling to demonstrate the CSS separation.

### 9.3 Example Theme

`examples/theme.css` — A CSS file with:
- Color variables (dark theme)
- Glass card styles
- Typography classes
- Gradient backgrounds
- No layout properties (only visual styling)

Demonstrates the "CSS for styling, SlideKit for layout" philosophy.

### 9.4 README

Write `README.md` with:
- Quick start (copy-paste to get a working slide)
- API reference (all primitives, all properties, all helpers)
- The philosophy (why this exists, what problem it solves)
- Integration with Reveal.js
- Integration with Presentation Maker pipeline
- **Theme CSS loading guide:** Document how to load external CSS for styling (via `<link>` tag, Reveal.js theme config, or the optional `SlideKit.loadCSS(url)` helper). Explain that `className: "glass-card"` on elements requires the corresponding CSS class to exist in a loaded stylesheet. Emphasize: CSS files should contain only visual styling, never layout properties.

### 9.5 Integration Test

Run the full Presentation Maker pipeline (Phases 0–6) using SlideKit instead of raw HTML+CSS for a test paper. Verify:
- The agent can define slides using SlideKit primitives
- `layout()` catches issues before rendering
- The rendered slides export correctly via decktape
- The visual QA loop is faster (fewer iterations needed)

### 9.6 Export Smoke Test

Add a decktape export smoke test:
- Render a multi-slide deck using SlideKit
- Export to PDF via decktape
- Verify the PDF has the expected number of pages and non-zero file size
- This catches rendering issues that are only visible after export (e.g., fonts not embedded, SVG connectors missing)

**Deliverable:** Complete library with docs, examples, and validated integration.

---

## Phase 2: Live Editing & Round-Trip

*Phase 2 builds on the complete Phase 1 library (M1–M9). It adds the ability to inspect, mutate, and re-export slide layouts from the browser console.*

---

## Milestone 10: Inspection & Mutation API

**Goal:** Expose the persistent scene model to the browser console. Enable AI agents (via Playwright MCP) to query layout state and make live modifications that re-render immediately.

### 10.1 Global Scene Model API (`window.sk`)

After `render()`, `window.sk` already has the scene model (set up in M3.3). Extend it with a fluent inspection and mutation API:

**Inspection methods (read-only):**

- `sk.getNode(id)` — Returns the full node: `{ id, type, authored, resolved, provenance, constraintState }`. This is the primary inspection function.
- `sk.getFrame(id)` — Returns just `{ x, y, w, h }` (the resolved bounding box). Shorthand for common case.
- `sk.hitTest(x, y)` — Returns the ID of the topmost element at the given pixel coordinates (using resolved bounds + z-order). Returns `null` if nothing is there.
- `sk.overlaps(id)` — Returns an array of `{ id, overlapRect, overlapArea }` for all elements overlapping the given element. Uses the same AABB logic from M5, but callable on demand.
- `sk.isInSafeZone(id)` — Returns `true` if the element's resolved bounds are fully within the safe zone.
- `sk.getComputedStyle(id)` — Reads from the DOM element (via `data-sk-id` lookup + `getComputedStyle()`). Returns the actual rendered CSS, which may differ from authored styles due to CSS cascade.
- `sk.getConstraints(id)` — Returns all constraints involving this element, both as a source and as a target. Each constraint includes its type, parameters, and current state (active/overridden/detached).
- `sk.listElements()` — Returns an array of `{ id, type, layer }` for all elements on the current slide.
- `sk.exportScene()` — Returns the full scene graph as a JSON-serializable object (for programmatic analysis).

**Slide navigation:**

- `sk.setSlide(index)` — Switch to a different slide (updates the active scene model). Reveal.js slide navigation syncs automatically.
- `sk.currentSlide()` — Returns the index and ID of the current slide.

### 10.2 Mutation API

All mutations operate on the scene model, then trigger re-solve + re-render.

**Property mutations (may or may not trigger re-layout):**

- `sk.setProp(id, key, value)` — Set a property on an element.
  - Style-only properties (color, fill, font, className, opacity, etc.): update the scene model and DOM directly. No re-layout needed.
  - Layout-affecting properties (size, w, h, anchor, overflow): trigger re-solve + re-render.
  - Content changes (text content): trigger text re-measurement + re-solve + re-render.

**Position mutations (always trigger re-solve + re-render):**

- `sk.nudge(id, {dx, dy})` — Shift element by (dx, dy) pixels. **Default mode: nudge.** The element's position becomes an absolute override, but outgoing constraint references are preserved. Dependents that reference this element (via `below()`, etc.) will shift on re-solve.
- `sk.setFrame(id, {x, y, w, h})` — Set absolute position and/or size. Same semantics as nudge — constraint references are preserved. Only specified fields are changed (you can call `sk.setFrame("title", {x: 200})` to change just x).
- `sk.detach(id)` — Break all constraints involving this element. Convert its position to absolute values (from current resolved frame). Dependents that referenced this element lose their constraint and get their current resolved position baked in as absolute values.

**Batching:**

- `sk.batch(fn)` — Execute `fn` (which may call multiple mutations), then re-solve and re-render once at the end. Without batching, each mutation triggers its own re-solve. Example:
  ```js
  sk.batch(() => {
    sk.nudge("card1", {dx: -20})
    sk.setProp("card2", "size", 28)
    sk.setProp("card3", "fill", "#2a2a3e")
  })
  // One re-solve + one re-render for all three changes
  ```

### 10.3 Re-Solve & Re-Render Pipeline

When a mutation triggers re-layout:

1. Update the scene model's authored spec for the affected element
2. For position mutations: mark the element's position provenance as `"override"` (nudge) or clear constraints (detach)
3. Re-run the 4-phase layout solve pipeline on the current slide's elements
4. Diff the new resolved frames against the previous ones
5. Update only the changed DOM elements (set new `left`, `top`, `width`, `height`, and styles)
6. Update `window.sk` with the new scene model

For style-only mutations, skip steps 3–4 and update the DOM element directly.

### 10.4 Tests

- Test `sk.getNode()` returns correct authored + resolved + provenance for a text element
- Test `sk.getFrame()` returns correct bounding box
- Test `sk.hitTest()` returns correct element (accounts for z-order and overlapping elements)
- Test `sk.overlaps()` returns correct overlap list
- Test `sk.isInSafeZone()` returns false for element partially outside safe zone
- Test `sk.getConstraints()` lists both incoming and outgoing constraints
- Test `sk.nudge()` moves element and dependents follow
- Test `sk.nudge()` on element with no dependents only moves that element
- Test `sk.setFrame()` sets absolute position, dependents follow
- Test `sk.detach()` breaks constraints — dependent positions become absolute
- Test `sk.detach()` on element not involved in constraints is a no-op
- Test `sk.setProp()` for style-only change updates DOM without re-layout
- Test `sk.setProp()` for size change triggers re-layout
- Test `sk.batch()` produces single re-render for multiple mutations
- Test `sk.batch()` with style-only changes produces no re-layout
- Test that re-rendered DOM elements still have correct `data-sk-id` attributes
- Test provenance updated correctly after nudge (shows "override" source)
- Test provenance updated correctly after detach (constraints removed)

**Deliverable:** Full inspection and mutation API accessible from the browser console. AI agents can query layout state and make live corrections.

---

## Milestone 11: Round-Trip Export

**Goal:** Serialize the current scene model (after mutations) back to a SlideKit specification that can replace the original slide code.

### 11.1 `sk.export()` — Specification Export

Implementation:

1. For each element in the current slide's scene model:
   a. If the element was **not mutated** (no overrides, no detaches): emit the original authored spec (with `_rel` markers, constraint references intact)
   b. If the element was **nudged** (position overridden): emit the element with absolute `x`/`y` values (from current resolved frame) but preserve all other authored properties (style, size, content, overflow, etc.). Constraint references on this element are removed. Outgoing references (other elements pointing to this one) are preserved on those other elements.
   c. If the element was **detached**: emit the element with fully absolute positioning, all constraint references removed
   d. If a **property was changed** via `setProp()`: emit the element with the updated property value
2. Emit the `transforms` array: include transforms that are still active. If elements involved in a transform were detached, remove them from that transform's ID list. If no elements remain in a transform, omit it.
3. Emit slide-level properties (background, notes, id) unchanged.
4. Return the complete slide definition as a JSON-serializable object.

Output format matches the input format — the exported object can be passed directly to `SlideKit.render()` to produce an identical layout.

### 11.2 `sk.exportCode()` — JavaScript Code Export (Optional Convenience)

Generate runnable JavaScript code from the export:

```js
let code = sk.exportCode()
// Returns a string like:
// [
//   text("Main Title", { id: "title", x: 200, y: 100, w: 800, size: 64, weight: 700, color: "#fff" }),
//   text("A subtitle", { x: 200, y: below("title", { gap: 40 }), w: 800, size: 28, color: "#999" }),
//   ...
// ]
```

This is syntactic sugar over `sk.export()` — it produces the same data but formatted as SlideKit JavaScript code that the agent can paste into its slide definition file.

### 11.3 Export Validation

Before returning the export, validate:

- All element IDs are unique
- All constraint references point to valid element IDs
- No orphaned constraints (referencing elements that were removed)
- Emit warnings if the exported layout differs from the rendered layout by more than a tolerance (should never happen with explicit tracking, but serves as a safety check)

### 11.4 Tests

- Test export of unmodified slide returns the original spec (identity round-trip)
- Test export after `nudge()` has absolute position for nudged element, preserved constraints for others
- Test export after `detach()` has fully absolute element, no constraint references
- Test export after `setProp()` reflects the updated property value
- Test export preserves transforms array
- Test export removes detached elements from transform ID lists
- Test export → re-render produces identical layout to the current state
- Test export validation catches orphaned constraint references
- Test `exportCode()` produces valid JavaScript that evaluates to the same spec

**Deliverable:** Full round-trip capability. Agent can render → inspect → mutate → export → re-render with no data loss or drift.

---

## Build Order Summary

### Phase 1: One-Way Pipeline

| Milestone | Depends On | Key Deliverable |
|-----------|-----------|-----------------|
| M1: Foundation | — | Elements render as absolute-positioned divs |
| M2: Text Measurement | M1 | `measureText()` works, text auto-height |
| M3: Layout Solve | M1, M2 | Relative positioning, scene graph + provenance |
| M4: fitText & Validation | M2, M3 | Auto-sizing, overflow policies, warnings/errors |
| M5: Collisions & Stacks | M3 | Overlap detection, vstack/hstack |
| M6: Align & Distribute | M3 | PowerPoint-style alignment/distribution |
| M7: Compound Primitives | M3, M5 | bullets(), connect(), panel() |
| M8: Debug & Tier 3 | M3 | Debug overlay, grid, percentage sugar, etc. |
| M9: Examples & Docs | M1–M8 | Full examples, README, integration test |

### Phase 2: Live Editing & Round-Trip

| Milestone | Depends On | Key Deliverable |
|-----------|-----------|-----------------|
| M10: Inspection & Mutation | M9 (all Phase 1) | Console API: query, nudge, detach, batch |
| M11: Round-Trip Export | M10 | `sk.export()` serializes updated spec |

Phase 1 milestones 5, 6, 7, and 8 can be developed in parallel once M3 is complete. M4 can start once M2 and M3 are done. Phase 2 starts after Phase 1 is complete.

```
Phase 1:
  M1 → M2 → M3 → M4
                ↘ M5 (parallel)
                ↘ M6 (parallel)
                ↘ M7 (parallel, needs M5 for stacks in panels)
                ↘ M8 (parallel)
                     ↘ M9 (after all)

Phase 2:
  M9 → M10 → M11
```

---

## Testing Strategy

### In-Browser Test Runner

Since SlideKit requires a DOM (for text measurement, rendering), tests run in-browser:

- `test/test.html` loads all test modules
- Minimal test framework: `describe()`, `it()`, `assert.equal()`, `assert.deepEqual()`, `assert.throws()`, `assert.within(actual, expected, tolerance)`
- **Must support async tests** — font loading, text measurement, and rendering are async operations. `it()` should accept async functions and await them.
- Tests create elements, run layout, and assert on the scene graph results
- Visual tests render slides and can be screenshotted for review

### Test Categories

1. **Unit tests:** Each primitive, each helper function, each validation rule
2. **Layout tests:** Relative positioning resolution, stack layout, alignment/distribution
3. **Integration tests:** Full slide definitions → layout solve → render → inspect DOM
4. **Visual tests:** Rendered slides viewed in browser / screenshotted via Playwright
5. **Mutation tests (Phase 2):** Nudge/detach/setProp → verify re-solve produces correct results
6. **Round-trip tests (Phase 2):** Render → mutate → export → re-render → verify identical output

### Running Tests

```bash
# Start a local server
python -m http.server 8000 --directory slidekit/

# Open in browser
# http://localhost:8000/test/test.html  → runs unit/layout/integration tests
# http://localhost:8000/test/visual/visual-test.html  → renders example slides
```

For CI / automated testing, use Playwright to load `test.html` and check that all assertions pass (the test runner writes results to a DOM element that Playwright can read).

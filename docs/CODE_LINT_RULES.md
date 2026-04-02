# Code Lint Rules

Rules for catching common anti-patterns in SlideKit presentation code. These are patterns that cause silent bugs — no errors thrown, just incorrect rendering.

Each rule describes the anti-pattern, why it breaks, and the correct alternative.

---

## LINT-001: Do not spread positioning functions into element props

**Anti-pattern:**
```js
el('content', { ...alignTopWith('other'), w: 400 })
el('content', { ...below('heading', { gap: 24 }), w: 400 })
el('content', { ...rightOf('sidebar'), w: 400 })
```

**What happens:** Positioning functions (`below()`, `rightOf()`, `alignTopWith()`, `centerVWith()`, etc.) return a RelMarker object like `{ _rel: "alignTop", ref: "someId" }`. Spreading this puts `_rel` and `ref` as top-level props on the element. The `y` (or `x`) property is never set, so the element silently renders at position 0.

**Why it's hard to spot:** No error is thrown. The element renders — just in the wrong place (top-left corner). If the slide has a dark background, a white-text element at y:0 may be completely invisible.

**Correct usage:**
```js
el('content', { y: alignTopWith('other'), w: 400 })
el('content', { y: below('heading', { gap: 24 }), w: 400 })
el('content', { x: rightOf('sidebar'), w: 400 })
```

**Two-spread variant is even worse:**
```js
el('content', { ...rightOf('a'), ...alignTopWith('b'), w: 400 })
```
The second spread silently overwrites `_rel` and `ref` from the first. One positioning constraint is completely lost with no warning.

**Note on `centerIn()`:** `centerIn()` returns `{ x: RelMarker, y: RelMarker }` — it is the one positioning function where spread (`...centerIn(rect)`) is technically valid. However, in practice, all real-world usage extracts properties individually: `centerIn(safe).y` or `const pos = centerIn(safe); ... x: pos.x, y: pos.y`. Prefer property extraction for consistency with all other positioning functions.

**Runtime detection:** SlideKit emits a `console.warn` if it detects `_rel` as a top-level prop on any element during layout. Look for: *"Element X has _rel as a top-level prop"*.

**Detection pattern (for static analysis / grep):**
```
\.\.\.(below|above|rightOf|leftOf|centerVWith|centerHWith|alignTopWith|alignBottomWith|alignLeftWith|alignRightWith|placeBetween|centerHOnSlide|centerVOnSlide)\(
```

**Note:** `matchWidthOf()` and `matchHeightOf()` return RelMarker objects for `w`/`h` properties. Spreading them is also wrong — use `w: matchWidthOf('ref')`, not `...matchWidthOf('ref')`.

---

## LINT-002: Positioning references to non-existent element IDs

**Anti-pattern:**
```js
// Left column has 2 pills (lpill0, lpill1)
// Right column has 4 pills — but blindly references left pills by index
for (let i = 0; i < rightItems.length; i++) {
  el('...', { y: alignTopWith(`s15-lpill${i}`) })  // lpill2, lpill3 don't exist!
}
```

**What happens:** Relative positioning functions (`below()`, `alignTopWith()`, `centerVWith()`, etc.) and dimension constraints (`matchWidthOf()`, `matchHeightOf()`) take an element ID as a reference. If that ID doesn't exist in the slide, the layout engine has no anchor to resolve. The element silently renders at position 0 or off-screen.

**Why it's hard to spot:** No error is thrown. The element exists in the DOM with all its content — it's just invisible because it's positioned off the viewport. Other elements that chain from it (via `below()`) also break, causing a cascade of mispositioned content.

**Common cause:** Loops that generate elements for two columns of different lengths, using the loop index to construct reference IDs. When one column is shorter, the longer column's higher indices reference IDs that were never created.

**Correct approach:**
```js
const leftCount = leftItems.length;
for (let i = 0; i < rightItems.length; i++) {
  el('...', {
    y: i < leftCount
      ? alignTopWith(`s15-lpill${i}`)           // left counterpart exists
      : below(`s15-rpill${i - 1}`, { gap }),     // chain from previous right pill
  })
}
```

**Runtime detection:** SlideKit should warn when a RelMarker references an element ID that doesn't exist in the resolved element map. This can be checked during position resolution — if `ref` is not found in the flat element map, emit a `console.warn`.

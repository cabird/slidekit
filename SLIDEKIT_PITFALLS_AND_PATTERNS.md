# SlideKit: Known Pitfalls & Pro Patterns

A living collection of gotchas, best practices, and patterns discovered while authoring SlideKit presentations.

---

## Pitfalls

### 1. `leftOf` / `above` labels appear far from their reference element

**Symptom:** A text label positioned with `leftOf(ref, { gap: 16 })` appears visually ~150px away from the reference box, even though the gap is set to 16.

**Root cause:** `leftOf` places the element so its **right edge** is 16px from the reference's left edge. If the element has a large fixed width (e.g., `w: 340`) and left-aligned text, the visible text starts at the far left of the element — creating a large visual gap between the text and the reference.

This does **not** affect `rightOf` or `below`, because those place the element's **left/top edge** at the gap boundary, where left-aligned text naturally starts.

**Fix:** Use `textAlign: 'right'` on elements positioned with `leftOf`, and `textAlign: 'left'` (or default) for `rightOf`. Similarly, consider vertical text alignment when using `above`.

```typescript
// ❌ Looks wrong — text floats far from the box
codeLabel('some text', 'lbl', color, {
  x: leftOf('box', { gap: 16 }),
});

// ✅ Text hugs the box's left edge
codeLabel('some text', 'lbl', color, {
  x: leftOf('box', { gap: 16 }),
  textAlign: 'right',
});
```

**General rule:** When positioning an element relative to another, ensure the text alignment matches the side the gap is on:

| Position fn | Gap is at element's… | Recommended `textAlign` |
|-------------|----------------------|------------------------|
| `rightOf`   | left edge            | `left` (default)       |
| `leftOf`    | right edge           | `right`                |
| `below`     | top edge             | (usually fine)         |
| `above`     | bottom edge          | (consider `verticalAlign: 'bottom'` if supported) |

---

### 2. `placeBetween` silently falls back when the element doesn't fit

**Symptom:** An element placed with `placeBetween('A', 'B')` overlaps one of the references instead of sitting neatly between them.

**Root cause:** If the element's height (or width, for horizontal placement) exceeds the available gap between the two references, the library falls back to placing it at `topEdge + xs` spacing. This can cause overlap with the bottom reference.

**Fix:** Ensure the gap between references is large enough to fit the element. The library emits a `between_no_fit` warning — check layout warnings.

```typescript
// ❌ Box is 70px tall, but gap between A and B is only 24px
el('E', { y: placeBetween('A', 'B'), h: 70 });
// Fallback: placed near A, overlaps B

// ✅ Increase the gap so the element fits
// Gap should be >= element height + desired padding
el('B', { y: below('A', { gap: 150 }) }); // 150 > 70
el('E', { y: placeBetween('A', 'B'), h: 70 }); // fits comfortably
```

---

### 3. `dash` on connectors must be an array, not a string

**Symptom:** Connector renders as a solid line despite setting `dash`.

**Root cause:** The renderer calls `dash.join(",")` internally, so it expects a number array.

```typescript
// ❌ Silently ignored
connect('a', 'b', { dash: '6,4' });

// ✅ Correct
connect('a', 'b', { dash: [6, 4] });
```

---

### 4. Reveal.js ~3× font-size scaling affects DOM-based measurements

**Symptom:** Linter reports text-overflow or low-contrast issues that don't match your authored values.

**Root cause:** Reveal.js applies a viewport transform that scales everything ~3×. A declared `fontSize: 14` becomes `~42px` in the DOM. Linter rules that inspect computed DOM styles (text-overflow, low-contrast) see the scaled values.

**Implication:** When debugging lint findings, check the computed DOM values, not the authored values. The linter is correct — it sees what the browser sees.

---

### 5. `textAlign` and other CSS properties must go inside `style: {}`

**Symptom:** Setting `textAlign: 'right'` on an element has no effect — text stays left-aligned.

**Root cause:** The renderer only reads CSS from `props.style`. Top-level props like `textAlign` are silently ignored — they're spread into the element options but never mapped to CSS.

```typescript
// ❌ Silently ignored — textAlign is not a recognized top-level prop
el('text', { w: 340, textAlign: 'right' });

// ✅ Correct — CSS properties go inside style
el('text', { w: 340, style: { textAlign: 'right' } });
```

**General rule:** If it's a CSS property (textAlign, overflow, whiteSpace, etc.), it goes in `style: {}`. Top-level props are for SlideKit layout properties (x, y, w, h, anchor, layer, etc.).

---

### 6. Transforms like `distributeH` / `alignTop` only move the elements you pass them

**Symptom:** You use `distributeH` to space out a set of "container" boxes, but labels, dots, or other elements that visually belong inside those containers stay at their original positions — they get orphaned.

**Root cause:** Transforms operate on the specific element IDs you pass. They have no concept of "children" or "related elements" unless you explicitly group them.

```typescript
// ❌ Only containers move — dots and labels stay behind
transforms: [
  distributeH(['container-1', 'container-2', 'container-3'], { startX: 100, endX: 1800 }),
]

// ✅ Wrap related elements in group(), then transform the groups
group([container1, dot1, label1], { id: 'demo-group-1' }),
group([container2, dot2, label2], { id: 'demo-group-2' }),
group([container3, dot3, label3], { id: 'demo-group-3' }),
// ...
transforms: [
  distributeH(['demo-group-1', 'demo-group-2', 'demo-group-3'], { startX: 100, endX: 1800 }),
]
```

**General rule:** If elements need to move together, wrap them in a `group()` first, then apply transforms to the group IDs.

### 7. Inherited `font-size` from host frameworks (e.g., Reveal.js) inflates line boxes

**Symptom:** Text labels overflow into adjacent elements even though the `h` value looks correct for the font size.

**Root cause:** Host frameworks like Reveal.js set large `font-size` values (e.g., 42px) on ancestor elements. SlideKit container divs inherit this, creating an anonymous line box taller than the element's `h`. A `<span font-size:14px>` inside a `h:20` div still has a 42px line box from the inherited font size.

**Status:** Fixed in the library — container divs now reset `font-size: 0; line-height: 0` to prevent inheritance. User styles override this.

**Linter:** Caught by `text-overflow` rule (checks `scrollHeight > clientHeight`).

---

## Linter Coverage of Pitfalls

| # | Pitfall | Caught by existing rule? | New rule possible? |
|---|---------|------------------------|--------------------|
| 1 | `leftOf` text alignment | No | Yes — `textAlign-direction-mismatch`: flag `leftOf` without `textAlign: 'right'` |
| 2 | `placeBetween` fallback | Partially — `between_no_fit` warning + `non-ancestor-overlap` | Already covered |
| 3 | `dash` must be array | No | Yes — `invalid-dash-type`: check `typeof dash === 'string'` |
| 4 | Reveal.js font scaling | N/A (meta-pitfall) | No — documentation only |
| 5 | CSS props in `style: {}` | No | Yes — `misplaced-css-prop`: detect CSS names at top level (now auto-promoted with warning in library) |
| 6 | Transforms orphan elements | Partially — overlap detected after | Impractical — requires semantic grouping knowledge |
| 7 | Inherited font-size | Yes — `text-overflow` | Fixed in library |

**Highest-value new rules:** `misplaced-css-prop` (#5) and `textAlign-direction-mismatch` (#1).

---

## Pro Patterns

### 1. Consistent label helpers with alignment awareness

Create a label helper that automatically sets `textAlign` based on the positioning direction:

```typescript
const codeLabel = (
  text: string,
  id: string,
  color: string,
  extra: Record<string, unknown> = {}
) => el(
  `<span style="font-family:monospace;font-size:15px;color:${color};">${text}</span>`,
  { id, w: 340, h: 22, ...extra }
);

// Usage — manually set textAlign based on direction
codeLabel('description', 'lbl', color, {
  x: leftOf('box', { gap: 16 }),
  textAlign: 'right',  // ← match the direction
});
```

---

### 2. Use `centerVWith` / `centerHWith` for label-to-element alignment

When placing a label next to an element, use `centerVWith` (not `alignTopWith`) to visually center the label with the element:

```typescript
// ❌ Top-aligned — label text sits near the top of a tall box
codeLabel('description', 'lbl', color, {
  x: rightOf('box', { gap: 16 }),
  y: alignTopWith('box'),  // label h:22, box h:70 → label at top
});

// ✅ Center-aligned — label text is vertically centered with the box
codeLabel('description', 'lbl', color, {
  x: rightOf('box', { gap: 16 }),
  y: centerVWith('box'),  // centers label midpoint with box midpoint
});
```

Note: `centerVWith(refId)` is for positioning ONE element relative to another. `alignCenterV(ids[])` is a TRANSFORM for aligning MULTIPLE elements to a common center.

---

### 3. Use `slideTitle()` with explicit height to avoid text-overflow

Stack-based titles can overflow if the text is taller than the intrinsic measurement. Setting an explicit `h` prevents this:

```typescript
const slideTitle = (text: string, id: string) =>
  el(`<h2>${text}</h2>`, {
    id,
    w: 1720,
    h: 75,  // ← explicit height prevents overflow
    fontSize: 48,
    lineHeight: 1.2,
  });
```

---

### 3. Gap sizing: stay above 8px to avoid `gap-too-small` lint warnings

The linter flags gaps smaller than 8px. Use the spacing scale (`xs`=8, `sm`=16, etc.) or explicit values ≥ 8:

```typescript
// ❌ Triggers gap-too-small
vstack([...], { gap: 6 });

// ✅ Clean
vstack([...], { gap: 8 });    // or 'xs'
vstack([...], { gap: 'sm' }); // 16px
```

---

### 4. Padding canvas-edge elements to avoid `canvas-overflow`

Elements near the edges of the 1920×1080 canvas can overflow. Add padding or shift inward:

```typescript
// ❌ Anchor diagram right at x:60 might overflow left edge
el('diagram', { x: 60, y: 200 });

// ✅ Shifted inward with margin
el('diagram', { x: 100, y: 200 });
```

---

### 5. Contrast-safe colored backgrounds

When placing text on colored backgrounds, ensure sufficient contrast. Common fix: darken the background and use white text:

```typescript
// ❌ Low contrast — light accent on white text
el('<span>text</span>', {
  bg: 'rgba(0, 200, 180, 0.15)',
  color: '#ffffff',
});

// ✅ Darker background for contrast
el('<span>text</span>', {
  bg: 'rgba(0, 200, 180, 0.35)',
  color: '#ffffff',
});
```

# SlideKit Slide-Authoring Workflow

A practical guide for AI agents (and humans) creating slides with SlideKit. Focused on preventing common layout issues through a disciplined render → inspect → correct loop.

## Context

SlideKit is a JavaScript presentation library that renders elements on a **1920×1080** canvas with a **safe zone** (120px inset from edges). It runs on top of Reveal.js. Elements are positioned with `x`/`y`/`w`/`h` props. The layout engine computes resolved bounds for every element and exposes warnings via `window.sk`.

**Key insight:** When writing slide code, you don't know exact rendered dimensions (text wrapping, image sizes, etc.) until after the browser renders. You must always follow a render → inspect → correct loop.

---

## 1. Layout Invariants

These rules must hold for every slide. Violations are layout bugs.

### Rule 1: Containment

Every child element must be fully contained within its parent's bounding box. No child should ever extend beyond its parent's bounds. This applies recursively: nested HTML inside an `el()` must also stay within the el's box.

**Why it matters:** Overflow that escapes a parent breaks visual grouping and can collide with unrelated elements. It also means your size calculations are wrong.

### Rule 2: No Unintended Overlap

Sibling elements (or elements not in the same parent-child hierarchy) should not overlap unless explicitly intended (e.g., a background image behind content). If two unrelated elements overlap, it's a layout bug.

**Why it matters:** Overlapping elements hide content and indicate incorrect positioning or sizing.

### Rule 3: Safe Zone

All content-layer elements must stay within the safe zone:

| Edge   | Min | Max  |
|--------|-----|------|
| x      | 120 | 1800 |
| y      | 90  | 990  |

The SlideKit layout engine warns about safe zone violations via `window.sk.slides[i].layout.warnings`. These warnings are authoritative — if the engine says you're outside the safe zone, you are.

---

## 2. Programmatic Validation

After rendering, run these checks. Do not rely on visual inspection alone.

### Checking Layout Warnings

```javascript
const slide = window.sk.slides.find(s => s.id === 'slide-id');
console.log(slide.layout.warnings); // safe zone violations, overflow, etc.
```

If `warnings` is non-empty, fix every warning before proceeding.

### Checking Containment (Rule 1)

Use DOM inspection to verify every child fits inside its parent:

```javascript
function checkContainment(parentEl) {
  const parentRect = parentEl.getBoundingClientRect();
  for (const child of parentEl.children) {
    const childRect = child.getBoundingClientRect();
    if (childRect.top < parentRect.top || childRect.bottom > parentRect.bottom ||
        childRect.left < parentRect.left || childRect.right > parentRect.right) {
      console.warn(`Child overflows parent`, { parent: parentEl, child, overflow: {
        top: parentRect.top - childRect.top,
        bottom: childRect.bottom - parentRect.bottom,
        left: parentRect.left - childRect.left,
        right: childRect.right - parentRect.right
      }});
    }
    checkContainment(child); // recurse
  }
}
```

Run this on every SlideKit element container. Any logged warning is a Rule 1 violation.

### Checking Overlap (Rule 2)

Check all top-level SlideKit elements on a slide for unintended overlap:

```javascript
function checkOverlap(elements) {
  for (let i = 0; i < elements.length; i++) {
    for (let j = i + 1; j < elements.length; j++) {
      const a = elements[i].getBoundingClientRect();
      const b = elements[j].getBoundingClientRect();
      if (a.right > b.left && a.left < b.right && a.bottom > b.top && a.top < b.bottom) {
        console.warn(`Overlap detected`, { el1: elements[i], el2: elements[j] });
      }
    }
  }
}
```

If overlap is detected, determine whether it's intentional (layered backgrounds, decorative elements) or a bug. If it's a bug, fix positioning or sizing.

---

## 3. Image Sizing

Getting image dimensions right requires a render-first approach. Do not guess.

### Process

1. **First render** the slide to get the image's natural dimensions:
   ```javascript
   const img = document.querySelector('img'); // target image
   const naturalW = img.naturalWidth;
   const naturalH = img.naturalHeight;
   ```

2. **Calculate exact container size** from the image's aspect ratio:
   ```javascript
   const innerW = desiredImageWidth;
   const innerH = innerW / (naturalW / naturalH);
   const containerW = innerW + 2 * padding;
   const containerH = innerH + 2 * padding;
   ```

3. **Set these exact dimensions** on the `figure()` element so `object-fit: contain` is a no-op — the image fills its container exactly with no letterboxing.

4. **After re-rendering**, verify programmatically that `fits === true` (no content overflow in the figure).

### Why This Matters

If the container aspect ratio doesn't match the image aspect ratio, `object-fit: contain` will letterbox the image, leaving dead space. Or worse, if the container is too small, the image overflows. Neither is acceptable.

---

## 4. The Render-Inspect-Correct Workflow

Follow this process for every slide. No exceptions.

### Step 1: Write Slide Code

Write slide code with best-guess dimensions. Use the safe zone bounds as constraints. Estimate text heights conservatively (overestimate rather than underestimate).

### Step 2: Render in Browser

Load the presentation in a browser. Navigate to the target slide.

### Step 3: Run Programmatic Checks

Execute all validation checks in the browser console:

1. **Safe zone:** `window.sk.slides[i].layout.warnings` — must be empty
2. **Containment:** Run `checkContainment()` on every element — must produce zero warnings
3. **Overlap:** Run `checkOverlap()` on sibling elements — must produce zero unintended overlaps
4. **Image fit:** For all `figure()` elements, verify image dimensions match container dimensions

### Step 4: Fix Violations

For each violation found:
- **Safe zone violation:** Adjust `x`/`y`/`w`/`h` to stay within 120–1800 (x) and 90–990 (y)
- **Containment violation:** Increase parent size or decrease child size — do NOT use `overflow: 'hidden'`
- **Overlap:** Adjust positions so elements don't collide
- **Image misfit:** Recalculate container dimensions from actual `naturalWidth`/`naturalHeight`

### Step 5: Re-render and Repeat

Re-render the slide with fixes applied. Run all checks again. Repeat until **zero violations** across all checks.

### Step 6: Visual Inspection

Only after all programmatic checks pass, do a final visual inspection:
- Does the slide look balanced?
- Is text readable?
- Are margins and spacing consistent?

Visual inspection is the **last** step, not the first. Programmatic checks catch the bugs; visual inspection catches the aesthetics.

---

## 5. CSS Specificity

SlideKit uses a triple-attribute-selector strategy (`[data-sk-type="el"]×3`) to override Reveal.js styles with high specificity. This is by design.

### When You See Unexpected Styles

If elements have unexpected margins, padding, font sizes, or other style changes, the cause is almost always a Reveal.js CSS rule leaking through.

**The fix goes in `slidekit/src/style.js` `_baselineCSS()`**, NOT in individual slide code.

Do not add inline style overrides to individual elements to fight Reveal CSS. That creates a whack-a-mole situation. Instead, add a targeted reset rule in `_baselineCSS()` that neutralizes the Reveal rule for all SlideKit elements.

---

## 6. Common Pitfalls

### Don't hide overflow to fix containment

```javascript
// WRONG — hides the symptom, doesn't fix the bug
el({ style: { overflow: 'hidden' }, ... })

// RIGHT — fix the actual dimensions
el({ w: actualNeededWidth, h: actualNeededHeight, ... })
```

### Don't guess image dimensions

Always render first, read `naturalWidth`/`naturalHeight`, then calculate exact container sizes. Guessing leads to letterboxing or overflow.

### `object-fit: contain` does not prevent overflow

When an element has CSS margin injected by external stylesheets (e.g., Reveal.js), `object-fit: contain` constrains the image but the margin still pushes the element outside its parent. Check for leaked margins.

### `below()` chains accumulate gaps

When chaining elements with `below()`, each gap adds to the total height. After building a vertical chain, check that the bottom of the last element is still within the safe zone (y ≤ 990).

### `w: 'fill'` behaves differently in containers

`w: 'fill'` inside panels and stacks computes differently than explicit pixel widths. It fills the remaining space in the parent, which depends on siblings. Always verify the resolved width after rendering — don't assume it equals the parent width.

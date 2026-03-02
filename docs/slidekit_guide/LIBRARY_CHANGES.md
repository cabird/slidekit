# SlideKit Library: Required Changes

Catalog of bugs found, fixes already applied, and remaining work needed. Based on building two presentations (16-slide "about" deck, 17-slide academic deck) and an 18-slide stress test.

All references are to the TypeScript source in `slidekit/src/`.

---

## Already Fixed ✅

### 1. Backward Elbow Connector Routing (Bug)

**Problem:** `findBestRoute()` let simple candidates (direct/L-bend/Z-bend) win for backward cases where both elements are horizontally aligned, producing flat horizontal lines instead of U-shaped routes.

**Fix:** In `connectorRouting.ts` lines 202-226, backward and same-direction cases now only use U-route channel candidates. Simple candidates are skipped.

**Status:** ✅ Fixed in `connectorRouting.ts`.

### 2. U-Route Channel Offset Too Small (Bug)

**Problem:** `computeAllChannelRoutes()` used the raw `clearance` (15px) as the channel offset, making U-routes visually indistinguishable from flat lines.

**Fix:** `connectorRouting.ts` lines 346-347 now uses `Math.max(60, span * 0.3, clearance)` for proportional channel sizing.

**Status:** ✅ Fixed in `connectorRouting.ts`.

### 3. CSS Property Auto-Promotion (Enhancement)

**Problem:** CSS properties like `textAlign`, `fontSize` placed at the top level of element props were silently ignored — only `style: {}` properties were applied.

**Fix:** `style.ts` lines 69-138 added `CSS_LIKE_PROPS` set and `detectMisplacedCssProps()` function. `renderer.ts` lines 325-335 calls this before filtering styles, auto-promotes CSS props into the style object, and emits structured warnings.

**Status:** ✅ Fixed in `style.ts` and `renderer.ts`.

### 4. Reveal.js Font-Size Inheritance (Bug)

**Problem:** Reveal.js sets `font-size: 42px` on ancestor elements. SlideKit container divs inherited this, inflating line boxes and causing text-overflow issues.

**Fix:** `style.ts` `_baselineCSS()` (line 297) now includes `font-size: initial` in the container CSS reset, preventing inheritance.

**Status:** ✅ Fixed in `style.ts`.

### 5. Dead Code Removal: `computeURoute`

**Status:** ✅ Removed. Replaced by `computeAllChannelRoutes()`.

---

## Not Yet Fixed ❌ — Bugs

### 6. Nested Panel Fill Resolution (Bug)

**Problem:** `panel([...], { w: 'fill' })` inside another panel has a bug — the inner panel's `fill` resolves before the outer panel sets its width. The inner panel ends up with incorrect width.

**Location:** `compounds.ts`, panel layout pipeline.

**Workaround:** Use `el()` with inline styles instead of nested panels with `w: 'fill'`.

**Severity:** Medium — affects nested panel layouts.

### 7. Font Warnings Orphaned (Bug)

**Problem:** Font load failures/timeouts are stored in `state.fontWarnings` but never merged into the layout result's `warnings` array. Any agent inspecting `layout().warnings` will never see font problems.

**Location:** `state.ts` line 13 (storage), `layout/index.ts` line 34 (result building — never reads fontWarnings).

**Fix:** In `layout/index.ts`, append `state.fontWarnings` to the result's `warnings` array.

**Severity:** Low — only affects presentations with custom web fonts.

---

## Not Yet Fixed ❌ — Silent Fallbacks (9 Remaining)

These fallbacks fail silently with no warning. Users have no way to know something went wrong.

| # | Location | Fallback Behavior | Recommended Warning |
|---|----------|------------------|-------------------|
| 1 | `positions.ts:244-246` | Stack child not positioned → placed at (0,0) | `stack_child_unpositioned` |
| 2 | `renderer.ts:312-321` | Element not in scene graph → raw props used | `element_not_in_scene` |
| 3 | `renderer.ts:41-44` | Unknown layer → treated as "content" | `unknown_layer` |
| 4 | `elements.ts:170` | cardGrid cols < 1 → clamped to 1 | `invalid_cols` |
| 5 | `compounds.ts:159` | Panel contentW < 0 → clamped to 0 | `panel_too_small` |
| 6 | `relative.ts:143` | placeBetween bias out of range → clamped | `invalid_bias` |
| 7 | `transforms.ts:287` | distributeH with < 2 elements → no-op | `distribute_too_few` |
| 8 | `transforms.ts:334` | distributeV with < 2 elements → no-op | `distribute_too_few` |
| 9 | `compounds.ts` | Figure inner dims < 0 → clamped to 0 | `figure_too_small` |

**Previously silent, now fixed:**
- Blocked CSS property → `style.ts:227-233` now emits `blocked_css_property` warning ✅

---

## Not Yet Fixed ❌ — Missing Warning Details

### 8. `placeBetween` Warning Lacks Dimensions

**Current message:** `Element "${id}": does not fit between "${ref}" and "${ref2}"; using minimum gap fallback.`

**Should include:** Element size, available gap, and actionable suggestion.

**Better message:** `Element "${id}" (h=${h}) does not fit between "${ref}" and "${ref2}" (available gap: ${gap}px). Suggestion: increase gap to ≥ ${h + 24}px, or reduce element height to ≤ ${gap}px.`

**Location:** `positions.ts` lines 272-278 (x-axis) and 309-315 (y-axis).

### 9. Existing Warnings Lack `suggestion` Field

5 warning types emit structured warnings but don't include a `suggestion` field:
- `ignored_rel_on_stack_child`
- `between_no_fit` (x and y)
- `stretch_override` (vstack and hstack)
- `connector_self_reference`
- `connector_missing_endpoint`

### 10. No Formal Warning Type

Warnings are `Record<string, unknown>` — no TypeScript interface enforces shape. A formal `LayoutWarning` interface would improve developer experience and tooling.

---

## Not Yet Implemented ❌ — Feature Requests (Ranked by Impact)

### Rank 1: `below({ gap: 'auto' | 'balanced' })`

**Prevents:** Tight spacing, unbalanced trailing whitespace (3 of 13 issues in the academic deck).
**Implementation:** In `relative.ts`, add two special gap modes:
- `'auto'`: Compute gap from font sizes of both elements (1.5× smaller font single-line, 2.0× multi-line).
- `'balanced'`: Place at optical 1/3 point of remaining space to safe zone bottom.
**Status:** NOT implemented. `resolveSpacing()` only accepts numbers and spacing tokens.

### Rank 2: `chip()` / `flowRow()` Primitives

**Prevents:** Inline CSS centering bugs, verbose HTML for labeled boxes.
**Implementation:** New functions in `elements.ts` or `compounds.ts`:
- `chip(label, props)` — optically-centered labeled box.
- `flowRow(items, props)` — horizontal sequence with separators.
**Status:** NOT implemented.

### Rank 3: `panel({ overflow: 'grow' })` — Auto-Expanding Panels

**Prevents:** Panel content overflow (when children are taller than panel).
**Implementation:** After DOM render, if `scrollHeight > clientHeight`, re-layout with expanded height.
**Status:** NOT implemented. Panel uses fixed or omitted height only.

### Rank 4: Formal Warning Interface

```typescript
interface LayoutWarning {
  type: string;
  elementId?: string;
  message: string;
  suggestion?: string;
  detail?: Record<string, unknown>;
}
```

**Status:** NOT implemented. Warnings are `Record<string, unknown>`.

---

## Summary

| Category | Count | Status |
|----------|-------|--------|
| Bugs fixed | 5 | ✅ All in codebase |
| Bugs remaining | 2 | ❌ Nested panel fill, font warnings orphaned |
| Silent fallbacks remaining | 9 | ❌ Need warning emission |
| Missing warning details | 3 | ❌ placeBetween dims, suggestion fields, formal type |
| Feature requests | 4 | ❌ gap auto/balanced, chip/flowRow, panel grow, warning interface |

### What's Working Well

- Connector routing (backward + U-route) is fully fixed
- CSS auto-promotion catches a common pitfall at runtime
- Baseline CSS reset prevents Reveal.js font-size inheritance
- `hstack({ align: 'stretch' })` is implemented for equal-height children
- Scene model exports `panelChildren` with resolved bounds
- Lint findings have structured `suggestion` fields on all 26 rules
- `window.sk.lint(slideId)` / `lintDeck()` separation enables efficient iterative workflow
- `window.sk` browser API makes in-browser debugging powerful

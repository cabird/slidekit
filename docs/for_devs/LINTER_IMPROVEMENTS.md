# SlideKit Linter: Improvement Specification

> **Current as of:** `42ae636` (2026-03-02)

Prioritized changes to improve the linter's signal-to-noise ratio from ~4% to a target of >50%.

Based on analysis of 1269+ findings across two presentations (16-slide "about" deck, 17-slide academic deck) and an 18-slide stress test.

---

## Current State Summary

| Category | Finding Count | Actually Useful | Signal Rate |
|----------|--------------|----------------|-------------|
| non-ancestor-overlap | 884 | ~10 | 1% |
| child-overflow | 155 | ~5 | 3% |
| content-clustering | 8 | 2-3 | 30% |
| safe-zone-violation | 8 | 0 | 0% |
| text-overflow | 7 | 7 | 100% |
| canvas-overflow | 11 | 11 | 100% |
| gap-too-small | 28 | 12 | 43% |
| low-contrast | 7 | 7 | 100% |
| near-misalignment | 11 | 3 | 27% |
| title-position-drift | 1 | 0 | 0% |
| style-drift | 1 | 0 | 0% |

**Overall: ~1123 findings, ~55 useful (~5% signal rate).**

> **Note on `empty-text`:** Earlier linting experiments reported ~146 `empty-text` findings, but this rule does not exist in the current `lint.ts`. Those findings may have been from a prototype linter or a since-removed rule. If re-implemented, it should exempt decorative elements with background styling.

---

## Priority 1: Reduce False Positives (Biggest Impact)

These changes eliminate the most noise with minimal effort.

### 1.1 Exempt Connector-Endpoint Overlaps from `non-ancestor-overlap`

**Current:** Connectors are checked against all elements. Every connector generates overlap errors with its endpoints.
**Fix:** In `ruleNonAncestorOverlap()`, skip pairs where one element is a connector and the other is one of its endpoints (`fromId` or `toId`). Still check connector-vs-unrelated-content overlaps (a connector crossing through an unrelated text box is a real issue).
**Impact:** Eliminates the majority of connector false positives while preserving detection of real connector-content collisions.
**File:** `lint.ts`, around line 179-231.
**Already done?** NO. Connectors are only exempt from `ruleZeroSize()` (line 304), not overlap.

### 1.2 `empty-text` Rule — Does Not Currently Exist

Earlier linting experiments (from prototype/older versions) reported ~146 `empty-text` findings on decorative elements. The rule **does not exist in the current `lint.ts`**. If it's re-implemented in the future, it should:
- Not flag elements with `background`, `backgroundColor`, or `backgroundImage` in their `style`
- Not flag elements with `h <= 8` (accent lines/dividers)
- Not flag elements on `layer: 'bg'`
- Not flag auto-generated `sk-*` IDs from panel/compound containers

### 1.3 Improve `child-overflow` for Groups and Stacks

**Current:** Reports overflow using canvas-absolute coordinates when children use group-relative coordinates, producing enormous phantom overshoots. `parentId` is always `undefined`.
**Fix:**
- Always populate `parentId` in the finding.
- For `bounds: 'hug'` groups, suppress child-overflow entirely (the group's size is derived from children).
- Report both group-relative and canvas-absolute coordinates.
- For stack children, reframe as "stack content exceeds stack bounds" not "child overflows parent."
**Impact:** Eliminates ~150 confusing findings; remaining ones become actionable.
**Already done?** NO.

### 1.4 Exempt `layer: 'overlay'` from `safe-zone-violation`

**Current:** Only `layer: 'bg'` is exempt. Overlay elements (corner brackets, decorative framing) trigger safe-zone violations.
**Fix:** In `ruleSafeZoneViolation()` and `ruleEdgeCrowding()`, also skip elements with `normLayer(el) === 'overlay'`.
**Impact:** Eliminates ~8 false positives.
**File:** `lint.ts`, lines 271 and 439.
**Already done?** NO. Only `bg` is exempt.

### 1.5 Improve `content-clustering` for Title/Hero Slides

**Current:** Flags slides using <40% of safe zone. Title slides with 2-3 large elements are always sparse by design.
**Fix:** Either:
- Exempt slides with ≤ 4-5 content elements.
- Lower severity to `info` instead of `warning`.
- Auto-detect hero slides (largest text element >60px font-size, ≤5 elements).
**Impact:** Eliminates ~5-6 false positives.
**Already done?** NO.

### 1.6 Improve `title-position-drift` and `style-drift` for Slide Archetypes

**Current:** Compares all slides against each other. Hero/title slides with different typography trigger drift warnings.
**Fix:**
- Cluster slides by archetype before checking drift (e.g., hero vs content).
- Exclude obvious outliers (1-2 slides out of 16 that differ).
- Report which slides are the outliers, not just the magnitude.
**Impact:** Eliminates most drift false positives.
**Already done?** NO.

---

## Priority 2: Better Layout Abstraction Resolution

The #1 systemic issue: the linter cannot resolve positions inside `hstack()`, `vstack()`, `cardGrid()`, and `panel()`.

### 2.1 Current State

- `lint.ts` lines 121-125: `absoluteBoundsOf()` has `skipOffsetTypes = ['hstack', 'vstack']` — partial handling.
- `cardGrid` and `panel` are NOT in `skipOffsetTypes` — they cause offset double-counting.
- The scene model DOES export `panelChildren` (array of `{ id, type, x, y, w, h }`) since `finalize.ts` lines 154-163.

### 2.2 Recommended Fix

1. Add `'panel'`, `'cardGrid'`, and `'group'` to `skipOffsetTypes` where appropriate.
2. Use `panelChildren` data from the scene model to resolve child positions within panels.
3. For `cardGrid`, resolve row-by-row positions from the grid's geometry.
4. Test with the existing stress test and academic decks to verify false positive reduction.

**Impact:** Would eliminate hundreds of `non-ancestor-overlap` false positives from layout containers.
**Already done?** NO. Only hstack/vstack are partially handled.

---

## Priority 3: New Lint Rules (High Value)

### 3.1 `misplaced-css-prop`

**Purpose:** Detect CSS property names (`textAlign`, `fontSize`, `backgroundColor`, etc.) at the top level of element props instead of inside `style: {}`.
**Detection:** Check if any key in element props is in the `CSS_LIKE_PROPS` set (already defined in `style.ts` line 69).
**Severity:** warning
**Suggestion:** `Move "${key}" into the style object: style: { ${key}: ... }`
**Note:** The library now auto-promotes with a warning at render time, but a lint rule would catch it statically before render.
**Already done?** NO — runtime auto-promotion exists, but no lint rule.

### 3.2 `textAlign-direction-mismatch`

**Purpose:** Flag `leftOf` positioning without `textAlign: 'right'` in style (and vice versa for `rightOf` with `textAlign: 'right'`).
**Detection:** Check element's x-position helper type against `style.textAlign`.
**Severity:** warning
**Suggestion:** `Element uses leftOf() — add style: { textAlign: 'right' } for visual alignment`
**Already done?** NO.

### 3.3 `equal-height-peers`

**Purpose:** Flag children of an `hstack` with height deviation >5% from median.
**Detection:** For each hstack, compare child resolved heights.
**Severity:** warning
**Suggestion:** `Use hstack({ align: 'stretch' }) to equalize heights`
**Note:** `align: 'stretch'` IS already implemented in the library.
**Already done?** NO.

### 3.4 `spacing.min-vertical-gap` (Enhanced)

**Purpose:** Adjacent text elements must have gap ≥ 1.5× the smaller font size; if upper element wraps to multiple lines, ≥ 2.0×.
**Detection:** Compute gap between vertically adjacent text elements; compare to font-size-derived threshold.
**Severity:** warning
**Auto-fixable:** Yes — increase `gap` in `below()`.
**Already done?** NO. Current `gap-too-small` uses a flat 8px threshold.

### 3.5 `alignment.horizontal-center-consistency`

**Purpose:** On a centered-layout slide (most elements use `anchor: 'tc'`), flag element groups offset >50px from slide center.
**Detection:** Compute assembly center for groups of related elements; compare to slide center (960).
**Severity:** error at >100px, warning at >50px.
**Already done?** NO.

### 3.6 `unbalanced-trailing-whitespace`

**Purpose:** When an element has >3× more space below it (to safe zone bottom) than above it (gap to sibling).
**Detection:** Compare space-below to gap-above ratio.
**Severity:** suggestion at 3×, warning at 5×.
**Auto-fixable:** Yes — `optimalGap = availableRange * 0.35`.
**Already done?** NO.

---

## Priority 4: Warning System Improvements

### 4.1 Add Warnings to Silent Fallbacks

9 of 10 originally-silent fallbacks remain silent. One (blocked CSS property) now warns.

| Fallback | Recommended Warning |
|----------|-------------------|
| Stack child not positioned → (0,0) | `{ type: 'stack_child_unpositioned', elementId, message: '...', suggestion: 'Check stack layout' }` |
| Element not in scene graph → raw props | `{ type: 'element_not_in_scene', elementId, suggestion: 'Ensure all elements pass through layout()' }` |
| Unknown layer value → "content" | `{ type: 'unknown_layer', elementId, suggestion: "Valid layers: 'bg', 'content', 'overlay'" }` |
| cardGrid cols < 1 → clamped | `{ type: 'invalid_cols', suggestion: 'cols must be at least 1' }` |
| Panel contentW < 0 → clamped | `{ type: 'panel_too_small', suggestion: 'Increase panel w or decrease padding' }` |
| placeBetween bias out of range → clamped | `{ type: 'invalid_bias', suggestion: 'bias must be 0-1' }` |
| distributeH/V with < 2 elements → no-op | `{ type: 'distribute_too_few', suggestion: 'Need at least 2 elements' }` |

### 4.2 Add `suggestion` Fields to Existing Warnings

Current warnings that lack suggestions:

| Warning Type | Recommended Suggestion |
|-------------|----------------------|
| `ignored_rel_on_stack_child` | `Remove relative positioning, or move element outside the stack` |
| `between_no_fit` | `Reduce element size to ${availableGap}px, or increase space between references to ≥ ${elementSize + padding}px` |
| `stretch_override` | `Remove explicit dimension to let stretch control it` |
| `connector_self_reference` | `fromId and toId must be different elements` |
| `connector_missing_endpoint` | `Ensure both endpoint elements exist on this slide` |

**Note:** Lint findings DO have `suggestion` fields populated (all 26 rules). It's the layout WARNINGS (from `layout/index.ts`) that lack suggestions.

### 4.3 Merge `fontWarnings` into Layout Result

**Current:** `state.fontWarnings` accumulates during init but is never read.
**Fix:** In the layout pipeline (`layout/index.ts`), merge `state.fontWarnings` into the result's `warnings` array.
**File:** `layout/index.ts`, near line 34 where `warnings` array is initialized.
**Already done?** NO.

### 4.4 Include Dimensions in `placeBetween` Warning

**Current message:** `Element "${id}": does not fit between "${ref}" and "${ref2}"; using minimum gap fallback.`
**Recommended message:** `Element "${id}" (h=${elementH}) does not fit between "${ref}" and "${ref2}" (available gap: ${gap}px). Suggestion: increase gap to ≥ ${elementH + padding}px, or reduce element height to ≤ ${gap - padding}px.`
**File:** `positions.ts`, lines 272-278 and 309-315.
**Already done?** NO.

---

## Priority 5: API Improvements for Better Lint Results

### 5.1 `below({ gap: 'auto' | 'balanced' })`

- `'auto'`: Computes typographically appropriate gap from font sizes and element types.
- `'balanced'`: Distributes element at optical 1/3 point of remaining space to safe zone.
**Currently supported?** NO — only numeric pixels and spacing tokens.
**Impact:** Prevents "gap too tight" and "gap unbalanced" issues.

### 5.2 Scene Model: Export Panel Child Positions

**Currently supported?** YES — `panelChildren` is already exported in `finalize.ts` lines 154-163.
**Remaining work:** The linter needs to USE this data when resolving absolute positions for overlap checks.

### 5.3 `chip()` / `flowRow()` Primitives

**Currently supported?** NO.
**Purpose:** `chip(label, props)` — optically-centered labeled box. `flowRow(items, props)` — horizontal sequence with separators. Would replace verbose inline HTML/CSS for common patterns.

### 5.4 Formal Warning Type

**Current:** Warnings are `Record<string, unknown>` — no formal shape.
**Recommended:** Define a `LayoutWarning` interface:
```typescript
interface LayoutWarning {
  type: string;
  elementId?: string;
  message: string;
  suggestion?: string;
  detail?: Record<string, unknown>;
}
```

---

## Implementation Order (Recommended)

| Phase | Changes | Estimated Impact |
|-------|---------|-----------------|
| 1 | Exempt connectors from overlap (1.1), exempt overlay from safe-zone (1.4) | -400+ false positives |
| 2 | Improve child-overflow (1.3), improve content-clustering (1.5) | -160 false positives |
| 3 | Use `panelChildren` in linter (2.2), add panel/cardGrid to skipOffsetTypes | -200+ false positives |
| 4 | New rules: misplaced-css-prop (3.1), textAlign-direction-mismatch (3.2) | Catch 2 common bugs |
| 5 | Warning improvements: silent fallbacks (4.1), suggestions (4.2), fontWarnings (4.3) | Better developer experience |
| 6 | New rules: equal-height-peers (3.3), min-vertical-gap (3.4) | Catch visual quality issues |

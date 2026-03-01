# Stress Test Review Notebook

This notebook logs findings from reviewing each stress test slide — visual inspection, programmatic layout checks, issues found, fixes applied, and recommendations for linter rules or library improvements.

---

## Systemic Issues Found

### Issue: Title elements missing width
- **Problem**: The `title()` helper function (line 44) created elements with `{ id, h: 70, ...extra }` — no `w` property. Every slide title (slides 2–18) rendered with `w: 0`, making them invisible or collapsed.
- **Root cause**: The helper set `h` but not `w`, and no call site passed `w` in the `extra` parameter. All 17 title usages were affected.
- **Fix applied**: Added `w: 1680` to the title helper defaults: `{ id, w: 1680, h: 70, ...extra }`. The value 1680 equals `safe.w` (1920 − 120 − 120). The `...extra` spread still allows overriding `w` per-call if needed.
- **Linter rule**: Yes — "element has no `w` and is not inside a `fill` context (stack/panel with `w: 'fill'`)" would catch this. A rule checking that `el()` calls either specify `w`, use `w: 'fill'`, or live inside a container that provides width.

### Per-Slide Fixes

#### Slide 2: Deep Nesting
- **Problem**: `s2-group` had `{ id: 's2-group', x: 200, y: 200 }` — no `w` or `h`. The group defaulted to 0×0, so the entire nested structure (vstack → panels → hstacks) was invisible or collapsed to a point, despite children having proper dimensions.
- **Fix**: Changed to `{ id: 's2-group', x: safe.x, y: 190, w: safe.w, h: 600 }`. This positions the group at the safe-area left edge, just below the title (safe.y=90 + title h=70 + 30px gap = 190), and gives it the full safe width (1680) and sufficient height (600px) to contain the nested content (~182px actual).

#### All Other Slides (3–18): No additional fixes needed
- **Slides 3–8**: All use `box()` helper which always sets explicit `w` and `h`. Labels have `w`/`h` in `extra`. Stacks and transforms reference elements with proper dimensions.
- **Slide 9 (Panel Stress)**: Nested panels all have explicit `w`. Children use `w: 'fill'` with `h` set — correct since they're inside panels that provide width context.
- **Slides 10–11**: All elements have explicit `w`/`h`.
- **Slide 12 (cardGrid)**: Grid has `w: 1600`, cards have `w: 480` — correct.
- **Slide 13 (Figures)**: Figures have explicit `w`/`h`.
- **Slide 14 (Layers)**: `s14-content-grp` has no `w`/`h` but children use absolute coordinates within the group. The group is used for layering (`layer: 'content'`) and children render at known offsets. This is intentional — the group acts as a position anchor, not a layout container.
- **Slides 15–18**: All elements have explicit dimensions or use `box()` helper.

#### Slide 16 (Empty & Minimal): Intentional edge cases
- `s16-auto` has no `w` or `h` — this is **intentional** to test auto-measurement.
- `s16-empty-group` is an empty group — **intentional** edge case test.

---

## Slide 7: Backward Connector Routing — BUG FOUND

### Bug: Backward elbow produces flat horizontal line
- **Symptom**: When routing a backward elbow connector (B.cr → A.cl where A is LEFT of B), all waypoints share the same Y coordinate, producing a flat horizontal line (`M 1130 20 L 1160 20 L 0 20 L 30 20`) instead of a U-shaped route around both elements.
- **Root cause**: In `findBestRoute()`, direct/L-bend/Z-bend candidates were always added regardless of routing case. For backward cases where both stub endpoints share the same Y, these degenerate candidates (Manhattan distance ~1160) are shorter than proper U-routes (~1190) and win the shortest-path selection — even though they produce visually incorrect paths that double back through the elements.
- **Fix**: Moved `classifyCase()` call before candidate generation. For `backward` and `same-direction` cases, only U-route channel candidates (from `computeAllChannelRoutes`) are added — direct/L-bend/Z-bend are skipped entirely. This ensures the route exits perpendicular to the stub direction, clears both endpoints, and returns.
- **Library issue**: Yes — `connectorRouting.ts` and `connectorRouting.js` in slidekit
- **Linter rule**: N/A (runtime rendering bug, not a static analysis issue)

### Follow-up Fix: U-route channel offset too small
- **Symptom**: The backward U-route technically worked but the channel was only ~15px (the `clearance` value) above/below the endpoints, making it visually indistinguishable from a flat line through both boxes.
- **Root cause**: `computeAllChannelRoutes()` used the raw `clearance` (15px) as the channel offset from the bounding box of endpoints/obstacles. For a U-route to visually clear the elements it routes around, the offset needs to be proportional to the element span.
- **Fix**: Replaced the fixed `clearance` offset with a proportional calculation: `Math.max(60, span * 0.3, clearance)` where `span` is the bounding-box extent along the relevant axis. This ensures the channel is at least 60px away, or 30% of the span between endpoints — whichever is larger. Applied to both `.ts` and `.js` files.

---

## Slide-by-Slide Review Summary

Slides 1–18 were reviewed both visually (screenshot) and programmatically (DOM layout dump).

- **Title width bug (systemic)**: All 18 titles had `w: 0` — fixed by adding `w: 1680` to the title helper.
- **Slide 2 group bug**: Group lacked explicit dimensions — fixed by adding `w: safe.w`.
- **Backward routing flat-line bug (Slide 7)**: `findBestRoute()` let simple candidates (direct/L/Z) win for backward cases — fixed by skipping them when case is backward or same-direction.
- **U-route channel offset too small**: Was using clearance (15px) as offset — fixed to `max(60, span*0.3, clearance)`.
- **Unused `computeURoute`**: Removed after refactoring made it dead code.
- **No bugs found in slides 1, 3, 4, 5, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18.**
- All 809 tests pass after fixes.

---

## Potential Linter Rules

- **Elements should have explicit dimensions (w, h)** — catches the title `w: 0` bug.
- **Zero-size elements warning** — already caught by existing lint rules.

---

## Anti-Patterns to Add to Pitfalls

- Always specify explicit `w` on elements that contain text — relying on auto-sizing may result in 0 width.
- Groups should have explicit `w`/`h` if they serve as layout containers.

---

## Library Issues Found

- **Router backward case classification**: Simple candidates (direct/L-bend/Z-bend) degenerate for backward routes, producing flat lines that win on Manhattan distance.
- **U-route channel offset needs proportional sizing**: A fixed clearance value is too small for visually correct U-routes.
- **Obstacle bounds not yet wired into routing calls** (future work).

# SlideKit Inspector Feature Worklist

## 1. Ctrl+Shift+D: Simple On/Off Toggle — DONE
Changed hotkey from cycling 4 modes to simple on/off toggle. `cycleDebugMode()` still exported for API compat.

## 2. Inspector Visibility Toggles — DONE
Added collapsible "Visibility" section with 6 checkboxes (Boxes, Labels, Anchors, Safe Zone, Collisions, Constraints). Changes update `lastToggleOptions` and trigger overlay refresh.

## 3. Element List Panel with Layer Grouping — DONE
Added collapsible "Elements" section showing all elements grouped by layer (overlay/content/bg). Hover highlights element on slide, click selects, checkboxes hide from debug overlay, layer master checkboxes.

## 4. ~~Cross-Layer Overlap Suppression~~ — DROPPED
Collision detection already only checks within same layer.

## 5. Snap During Resize and Move — DONE
10px grid snap during drag/resize. Hold Shift to disable snap. Applied to both move and resize.

## 6. Dimension Constraints (matchWidth/matchHeight) — DONE
Added `matchWidthOf(ref)` and `matchHeightOf(ref)` as RelMarker constraints on w/h. Extended SizeValue type. New resolution in layout pipeline (intrinsics + positions phases). Provenance support. 13 new tests.

## 7. Editable Constraints in Inspector (Relationships Section) — DONE
Constraint type now clickable (dropdown) and reference element clickable (enters pick mode) in the Relationships section.

## 8. Negative Constraint Gaps — DONE
Verified negative gaps work (no code changes needed). 5 tests added.

## 9. HTML Content Editing in Inspector — DONE
Editable textarea with DOMParser validation, Ctrl+Enter to apply, Esc to revert. Undo/redo support.

## 10. Enhanced Diff Output for LLM Consumption — DONE
Added `debug.sourceHint` to init config. Diff prepends URL, slide index, sourceHint, and LLM instructions.

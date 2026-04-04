// Debug Inspector — Panel UI, element detail rendering, click selection

import type { SceneElement, RelMarker, LayoutResult, SlideDefinition } from './types.js';
import { debugController } from './debug-state.js';
import { PROVENANCE_COLORS, TYPE_BADGE_COLORS, escapeHtml, badge } from './debug-inspector-styles.js';
import { createResizeHandle, adjustViewport, resetViewport } from './debug-inspector-viewport.js';
import { createDiffActionBar, updateDiffDirtyIndicator } from './debug-inspector-diff.js';
import { extractRelationshipEdges, absoluteBounds } from './debug-overlay.js';
import { flattenElements, isRelMarker } from './layout/helpers.js';
import {
  isEditableProp, isEditableGap, isGapProp, getEnumOptions,
  isAnchorProp, startAnchorEdit,
  isElementIdProp, startElementIdEdit,
  startEdit, startEnumEdit, startGapTokenEdit, showLockedTooltip,
} from './debug-inspector-edit.js';
import { renderResizeHandles, removeResizeHandles } from './debug-inspector-drag.js';
import {
  clearConstraintSelection, renderConstraintDetail, updateConstraintHighlight,
  changeConstraintType, typesForAxis, axisForType, REFLESS_TYPES,
} from './debug-inspector-constraint.js';
import { attachContextMenuHandler, detachContextMenuHandler } from './debug-context-menu.js';
import { enterPickMode } from './debug-inspector-pick.js';

// =============================================================================
// Inspector Panel Lifecycle
// =============================================================================

/** Create and append the inspector panel to document.body. */
export function createInspectorPanel(): HTMLDivElement {
  const s = debugController.state;

  const panel = document.createElement("div");
  panel.setAttribute("data-sk-role", "debug-inspector");
  panel.style.position = "fixed";
  panel.style.top = "0";
  panel.style.right = "0";
  panel.style.width = `${s.panelWidth}px`;
  panel.style.height = "100vh";
  panel.style.background = "#f8f8fa";
  panel.style.color = "#1a1a2e";
  panel.style.fontFamily = "'SF Mono', 'Fira Code', 'Consolas', monospace";
  panel.style.fontSize = "12px";
  panel.style.zIndex = "99999";
  panel.style.overflowY = "auto";
  panel.style.borderLeft = "1px solid #ddd";
  panel.style.boxSizing = "border-box";

  // Resize handle
  panel.appendChild(createResizeHandle());

  // Header
  const header = document.createElement("div");
  header.style.padding = "12px 16px";
  header.style.borderBottom = "1px solid #ddd";
  header.style.fontSize = "14px";
  header.style.fontWeight = "600";
  header.style.color = "#1a1a2e";
  header.textContent = "Inspector";
  panel.appendChild(header);

  // Diff action bar
  panel.appendChild(createDiffActionBar());

  // Visibility toggles
  panel.appendChild(createVisibilitySection());

  // Element list
  const elementListContainer = document.createElement('div');
  elementListContainer.setAttribute('data-sk-role', 'element-list');
  panel.appendChild(elementListContainer);

  // Body (content area)
  const body = document.createElement("div");
  body.setAttribute("data-sk-inspector-body", "true");
  body.style.padding = "8px 0";
  panel.appendChild(body);

  document.body.appendChild(panel);
  s.inspectorPanel = panel;

  renderEmptyState();
  refreshElementList();
  adjustViewport(s.panelWidth);

  return panel;
}

/** Remove the inspector panel from DOM. */
export function removeInspectorPanel(): void {
  const s = debugController.state;
  resetViewport();
  if (s.inspectorPanel && s.inspectorPanel.parentNode) {
    s.inspectorPanel.parentNode.removeChild(s.inspectorPanel);
  }
  s.inspectorPanel = null;
}

// =============================================================================
// Empty State
// =============================================================================

/** Show the empty state message in the panel body. */
export function renderEmptyState(): void {
  const s = debugController.state;
  const body = s.inspectorPanel?.querySelector('[data-sk-inspector-body]');
  if (!body) return;
  body.innerHTML = '';
  const msg = document.createElement("div");
  msg.style.padding = "24px 16px";
  msg.style.color = "#888";
  msg.style.textAlign = "center";
  msg.style.fontStyle = "italic";
  msg.textContent = "Click an element to inspect";
  body.appendChild(msg);
}

// =============================================================================
// Visibility Toggles
// =============================================================================

const VISIBILITY_OPTIONS: { key: string; label: string; default: boolean }[] = [
  { key: 'showBoxes', label: 'Boxes', default: true },
  { key: 'showIds', label: 'Labels', default: true },
  { key: 'showAnchors', label: 'Anchors', default: true },
  { key: 'showSafeZone', label: 'Safe Zone', default: true },
  { key: 'showCollisions', label: 'Collisions', default: true },
  { key: 'showRelationships', label: 'Constraints', default: true },
];

/** Create the visibility toggle section for the inspector panel. */
function createVisibilitySection(): HTMLElement {
  const s = debugController.state;
  const section = document.createElement('div');
  section.setAttribute('data-sk-role', 'visibility-toggles');
  section.style.borderBottom = '1px solid #e8e8e8';
  section.style.padding = '8px 16px';

  // Header row (clickable to collapse)
  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.alignItems = 'center';
  header.style.cursor = 'pointer';
  header.style.userSelect = 'none';
  header.style.marginBottom = '0';

  const chevron = document.createElement('span');
  chevron.textContent = '\u25B6';
  chevron.style.fontSize = '8px';
  chevron.style.marginRight = '6px';
  chevron.style.transition = 'transform 0.15s';
  chevron.style.transform = 'rotate(90deg)';
  header.appendChild(chevron);

  const title = document.createElement('span');
  title.textContent = 'VISIBILITY';
  title.style.fontSize = '11px';
  title.style.fontWeight = '600';
  title.style.letterSpacing = '0.5px';
  title.style.color = '#777';
  header.appendChild(title);
  section.appendChild(header);

  // Checkbox grid
  const grid = document.createElement('div');
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = '1fr 1fr';
  grid.style.gap = '2px 8px';
  grid.style.marginTop = '6px';

  for (const opt of VISIBILITY_OPTIONS) {
    const opts = s.lastToggleOptions as Record<string, unknown>;
    const currentValue = opts[opt.key] !== undefined ? Boolean(opts[opt.key]) : opt.default;

    const label = document.createElement('label');
    label.style.display = 'flex';
    label.style.alignItems = 'center';
    label.style.gap = '4px';
    label.style.cursor = 'pointer';
    label.style.fontSize = '11px';
    label.style.color = '#555';
    label.style.padding = '1px 0';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = currentValue;
    checkbox.style.margin = '0';
    checkbox.style.cursor = 'pointer';
    checkbox.setAttribute('data-sk-visibility', opt.key);

    checkbox.addEventListener('change', () => {
      const toggleOpts = s.lastToggleOptions as Record<string, unknown>;
      toggleOpts[opt.key] = checkbox.checked;
      debugController.callbacks.refreshOverlayOnly?.(s.currentSlideIndex);
    });

    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(opt.label));
    grid.appendChild(label);
  }

  section.appendChild(grid);

  // Collapse toggle
  header.addEventListener('click', () => {
    const collapsed = grid.style.display === 'none';
    grid.style.display = collapsed ? 'grid' : 'none';
    chevron.style.transform = collapsed ? 'rotate(90deg)' : 'rotate(0deg)';
  });

  return section;
}

// =============================================================================
// Element List
// =============================================================================

const LAYER_ORDER = ['overlay', 'content', 'bg'] as const;
const LAYER_LABELS: Record<string, string> = { overlay: 'Overlay', content: 'Content', bg: 'Background' };

/** Rebuild the element list panel. Called on initial render and slide change. */
export function refreshElementList(): void {
  const s = debugController.state;
  const container = s.inspectorPanel?.querySelector('[data-sk-role="element-list"]') as HTMLElement | null;
  if (!container) return;
  container.innerHTML = '';

  const sk = typeof window !== 'undefined' ? (window as any).sk : null;
  if (!sk?.layouts?.[s.currentSlideIndex]) return;

  const layoutResult = sk.layouts[s.currentSlideIndex];
  const sceneElements: Record<string, SceneElement> = layoutResult.elements;

  // Group elements by layer
  const byLayer: Record<string, Array<{ id: string; el: SceneElement }>> = {
    overlay: [], content: [], bg: [],
  };
  for (const [id, sceneEl] of Object.entries(sceneElements)) {
    if (sceneEl._internal) continue;
    const layer = (sceneEl.authored?.props as Record<string, unknown>)?.layer as string || 'content';
    (byLayer[layer] ??= []).push({ id, el: sceneEl });
  }

  // Extract constraints
  const allEdges = extractRelationshipEdges(sceneElements);

  // Build collapsible section
  const section = document.createElement('div');
  section.style.borderBottom = '1px solid #e8e8e8';
  section.style.padding = '0';

  // Header
  const header = document.createElement('div');
  header.style.cssText = 'padding: 8px 16px; cursor: pointer; user-select: none; display: flex; align-items: center;';

  const chevron = document.createElement('span');
  chevron.textContent = '\u25B6';
  chevron.style.cssText = 'font-size: 8px; margin-right: 6px; transition: transform 0.15s;';
  chevron.style.transform = s.elementListExpanded ? 'rotate(90deg)' : 'rotate(0deg)';
  header.appendChild(chevron);

  const title = document.createElement('span');
  title.textContent = 'ELEMENTS & CONSTRAINTS';
  title.style.cssText = 'font-size: 11px; font-weight: 600; letter-spacing: 0.5px; color: #777;';
  header.appendChild(title);
  section.appendChild(header);

  // List body — preserve expanded state
  const listBody = document.createElement('div');
  listBody.style.display = s.elementListExpanded ? 'block' : 'none';
  listBody.style.padding = '0 8px 8px 8px';
  listBody.style.maxHeight = '300px';
  listBody.style.overflowY = 'auto';

  // --- Elements by layer ---
  for (const layerName of LAYER_ORDER) {
    const items = byLayer[layerName];
    if (!items || items.length === 0) continue;

    // Layer header with master checkbox
    const layerRow = document.createElement('div');
    layerRow.style.cssText = 'display: flex; align-items: center; gap: 4px; padding: 4px 0 2px 0; font-weight: 600; font-size: 11px; color: #555;';

    const layerCheckbox = document.createElement('input');
    layerCheckbox.type = 'checkbox';
    layerCheckbox.checked = !s.hiddenLayers.has(layerName);
    layerCheckbox.style.cssText = 'margin: 0; cursor: pointer;';
    layerCheckbox.addEventListener('change', () => {
      if (layerCheckbox.checked) {
        s.hiddenLayers.delete(layerName);
      } else {
        s.hiddenLayers.add(layerName);
      }
      debugController.callbacks.refreshOverlayOnly?.(s.currentSlideIndex);
      refreshElementList();
    });
    layerRow.appendChild(layerCheckbox);
    layerRow.appendChild(document.createTextNode(LAYER_LABELS[layerName] || layerName));
    listBody.appendChild(layerRow);

    // Element rows
    for (const item of items) {
      const row = document.createElement('div');
      row.style.cssText = 'display: flex; align-items: center; gap: 4px; padding: 1px 0 1px 12px; font-size: 11px; cursor: pointer;';
      row.setAttribute('data-sk-element-list-id', item.id);

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = !s.hiddenElementIds.has(item.id) && !s.hiddenLayers.has(layerName);
      cb.disabled = s.hiddenLayers.has(layerName);
      cb.style.cssText = 'margin: 0; cursor: pointer;';
      cb.addEventListener('change', (e) => {
        e.stopPropagation();
        if (cb.checked) {
          s.hiddenElementIds.delete(item.id);
        } else {
          s.hiddenElementIds.add(item.id);
        }
        debugController.callbacks.refreshOverlayOnly?.(s.currentSlideIndex);
      });
      row.appendChild(cb);

      const label = document.createElement('span');
      label.textContent = item.id;
      label.style.color = s.selectedElementId === item.id ? '#4a9eff' : '#333';
      label.style.fontWeight = s.selectedElementId === item.id ? '600' : 'normal';
      row.appendChild(label);

      // Type badge
      const typeBadge = document.createElement('span');
      typeBadge.textContent = item.el.type;
      typeBadge.style.cssText = 'font-size: 9px; color: #999; margin-left: auto;';
      row.appendChild(typeBadge);

      // Hover highlight
      row.addEventListener('mouseenter', () => {
        row.style.background = '#e8f0fe';
        highlightElementOnSlide(item.id, s.currentSlideIndex, true);
      });
      row.addEventListener('mouseleave', () => {
        row.style.background = '';
        highlightElementOnSlide(item.id, s.currentSlideIndex, false);
      });

      // Click to select (but not when clicking the checkbox)
      row.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).tagName === 'INPUT') return;
        e.stopPropagation();
        s.selectedElementId = item.id;
        s.selectedConstraint = null;
        clearConstraintSelection();
        renderElementDetail(item.id, s.currentSlideIndex);
        updateSelectionHighlight(item.id, s.currentSlideIndex);
        renderResizeHandles(item.id, s.currentSlideIndex);
        refreshElementList();
      });

      listBody.appendChild(row);
    }
  }

  // --- Constraints ---
  if (allEdges.length > 0) {
    const constraintHeader = document.createElement('div');
    constraintHeader.style.cssText = 'padding: 6px 0 2px 0; font-weight: 600; font-size: 11px; color: #555; border-top: 1px solid #e8e8e8; margin-top: 4px;';
    constraintHeader.textContent = 'Constraints';
    listBody.appendChild(constraintHeader);

    for (const edge of allEdges) {
      const row = document.createElement('div');
      row.style.cssText = 'display: flex; align-items: center; gap: 4px; padding: 1px 0 1px 4px; font-size: 10px; cursor: pointer; color: #555;';

      const arrow = document.createElement('span');
      arrow.textContent = '\u2192';
      arrow.style.color = '#999';
      row.appendChild(arrow);

      const text = document.createElement('span');
      let desc = `${edge.fromId} ${edge.type} ${edge.toId}`;
      if (edge.gap !== undefined) desc += ` (${edge.gap})`;
      text.textContent = desc;
      row.appendChild(text);

      // Hover: highlight both elements
      row.addEventListener('mouseenter', () => {
        row.style.background = '#e8f0fe';
        highlightElementOnSlide(edge.fromId, s.currentSlideIndex, true);
        highlightElementOnSlide(edge.toId, s.currentSlideIndex, true);
      });
      row.addEventListener('mouseleave', () => {
        row.style.background = '';
        highlightElementOnSlide(edge.fromId, s.currentSlideIndex, false);
        highlightElementOnSlide(edge.toId, s.currentSlideIndex, false);
      });

      // Click to select the constrained element and show constraint detail
      row.addEventListener('click', (e) => {
        e.stopPropagation();
        const constraintAxis = axisForType(edge.type);
        if (constraintAxis) {
          s.selectedElementId = null;
          s.selectedConstraint = { elementId: edge.toId, axis: constraintAxis };
          renderConstraintDetail(edge.toId, constraintAxis, s.currentSlideIndex);
          updateConstraintHighlight(edge.toId, constraintAxis, s.currentSlideIndex);
        }
      });

      listBody.appendChild(row);
    }
  }

  section.appendChild(listBody);

  // Collapse toggle
  header.addEventListener('click', () => {
    s.elementListExpanded = !s.elementListExpanded;
    listBody.style.display = s.elementListExpanded ? 'block' : 'none';
    chevron.style.transform = s.elementListExpanded ? 'rotate(90deg)' : 'rotate(0deg)';
  });

  container.appendChild(section);
}

/** Temporarily highlight an element on the slide when hovering in the element list. */
function highlightElementOnSlide(elementId: string, slideIndex: number, show: boolean): void {
  const s = debugController.state;
  if (!s.debugOverlay) return;

  // Remove existing highlight for this specific element
  const existing = s.debugOverlay.querySelectorAll(`[data-sk-debug="hover-highlight"][data-sk-debug-id="${elementId}"]`);
  existing.forEach(el => el.remove());

  if (!show) return;

  const sk = typeof window !== 'undefined' ? (window as any).sk : null;
  const allElements = sk?.layouts?.[slideIndex]?.elements;
  const sceneEl: SceneElement | undefined = allElements?.[elementId];
  if (!sceneEl?.resolved) return;

  const r = absoluteBounds(sceneEl, allElements);
  const highlight = document.createElement('div');
  highlight.setAttribute('data-sk-debug', 'hover-highlight');
  highlight.setAttribute('data-sk-debug-id', elementId);
  highlight.style.cssText = `
    position: absolute; left: ${r.x}px; top: ${r.y}px;
    width: ${r.w}px; height: ${r.h}px;
    border: 2px solid #4a9eff; background: rgba(74, 158, 255, 0.15);
    box-sizing: border-box; pointer-events: none; z-index: 10000;
  `;
  s.debugOverlay.appendChild(highlight);
}

// =============================================================================
// Refless Constraint Rows (centerHSlide, centerVSlide, matchMaxWidth, matchMaxHeight)
// =============================================================================

/** Badge colors for each axis. */
const AXIS_BADGE_COLORS: Record<string, string> = {
  x: '#4a9eff',
  y: '#34a853',
  w: '#ff8c32',
  h: '#ea4335',
};

/** Human-readable labels for refless constraint types. */
const REFLESS_LABELS: Record<string, string> = {
  centerHSlide: 'Centered horizontally on slide',
  centerVSlide: 'Centered vertically on slide',
  matchMaxWidth: 'Match widest in group',
  matchMaxHeight: 'Match tallest in group',
};

/** Map refless types to their axis key. */
const REFLESS_AXIS: Record<string, 'x' | 'y' | 'w' | 'h'> = {
  centerHSlide: 'x',
  centerVSlide: 'y',
  matchMaxWidth: 'w',
  matchMaxHeight: 'h',
};

/** Build DOM rows for refless constraints on an element. */
function buildReflessConstraintRows(
  elementId: string,
  slideIndex: number,
  authored: SceneElement['authored'] | undefined,
): HTMLElement[] {
  if (!authored?.props) return [];
  const props = authored.props as Record<string, unknown>;
  const rows: HTMLElement[] = [];

  for (const axis of ['x', 'y', 'w', 'h'] as const) {
    const val = props[axis];
    if (!isRelMarker(val)) continue;
    if (!REFLESS_TYPES.has(val._rel)) continue;

    const marker = val as RelMarker;
    const label = REFLESS_LABELS[marker._rel] ?? marker._rel;
    const axisKey = REFLESS_AXIS[marker._rel] ?? axis;
    const badgeColor = AXIS_BADGE_COLORS[axisKey] ?? '#666';

    const row = document.createElement('div');
    row.style.cssText = 'padding:3px 0;display:flex;align-items:center;gap:6px;';

    // Axis badge
    const axisBadge = document.createElement('span');
    axisBadge.textContent = axisKey.toUpperCase();
    axisBadge.style.cssText = `
      display:inline-block;padding:1px 5px;border-radius:3px;
      font-size:10px;font-weight:700;color:#fff;background:${badgeColor};
      line-height:1.4;letter-spacing:0.5px;flex-shrink:0;
    `;
    row.appendChild(axisBadge);

    // Label + group info
    const labelSpan = document.createElement('span');
    labelSpan.style.cssText = 'color:#1a1a2e;flex:1;';

    if (marker._rel === 'matchMaxWidth' || marker._rel === 'matchMaxHeight') {
      const groupName = marker.group ?? '(unnamed)';
      const memberCount = getGroupMemberIds(marker._rel, groupName, slideIndex).length;
      labelSpan.innerHTML =
        `${escapeHtml(label)} ` +
        `<span style="color:#4a9eff;font-weight:600;">"${escapeHtml(groupName)}"</span>` +
        `<span style="color:#999;"> \u00b7 ${memberCount} member${memberCount !== 1 ? 's' : ''}</span>`;

      // Hover: highlight all group members
      row.addEventListener('mouseenter', () => {
        const memberIds = getGroupMemberIds(marker._rel, groupName, slideIndex);
        for (const mid of memberIds) {
          highlightElementOnSlide(mid, slideIndex, true);
        }
      });
      row.addEventListener('mouseleave', () => {
        const memberIds = getGroupMemberIds(marker._rel, groupName, slideIndex);
        for (const mid of memberIds) {
          highlightElementOnSlide(mid, slideIndex, false);
        }
      });
    } else {
      labelSpan.textContent = label;
    }
    row.appendChild(labelSpan);

    // Unlock button — removes constraint, sets explicit value
    const freezeBtn = document.createElement('button');
    freezeBtn.textContent = 'Unlock';
    freezeBtn.style.cssText = `
      padding:3px 8px;font-size:10px;cursor:pointer;
      font-family:'SF Mono','Fira Code','Consolas',monospace;
      background:#fff;color:#4a9eff;border:1px solid #4a9eff;
      border-radius:3px;font-weight:600;flex-shrink:0;
    `;
    freezeBtn.addEventListener('mouseenter', () => {
      freezeBtn.style.background = '#4a9eff';
      freezeBtn.style.color = '#fff';
    });
    freezeBtn.addEventListener('mouseleave', () => {
      freezeBtn.style.background = '#fff';
      freezeBtn.style.color = '#4a9eff';
    });
    freezeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      freezeReflessConstraint(elementId, axisKey, slideIndex);
    });
    row.appendChild(freezeBtn);

    rows.push(row);
  }
  return rows;
}

/** Get IDs of all elements sharing a matchMax group on this slide. */
function getGroupMemberIds(relType: string, groupName: string, slideIndex: number): string[] {
  const sk = typeof window !== 'undefined' ? (window as any).sk : null;
  const def = sk?._definitions?.[slideIndex];
  if (!def) return [];
  const { flatMap } = flattenElements(def.elements);
  const ids: string[] = [];
  for (const [id, el] of flatMap) {
    const props = el.props as Record<string, unknown> | undefined;
    if (!props) continue;
    // Check w for matchMaxWidth, h for matchMaxHeight
    const axis = relType === 'matchMaxWidth' ? 'w' : 'h';
    const val = props[axis];
    if (isRelMarker(val) && val._rel === relType && val.group === groupName) {
      ids.push(id);
    }
  }
  return ids;
}

/** Unlock a refless constraint — replace with its current resolved value. */
async function freezeReflessConstraint(
  elementId: string,
  axis: 'x' | 'y' | 'w' | 'h',
  slideIndex: number,
): Promise<void> {
  const sk = (window as any).sk;
  if (!sk?._definitions?.[slideIndex] || !sk?.layouts?.[slideIndex]) return;

  const layoutResult: LayoutResult = sk.layouts[slideIndex];
  const sceneEl = layoutResult.elements[elementId];
  if (!sceneEl?.resolved) return;

  const definition: SlideDefinition = sk._definitions[slideIndex];
  const { flatMap } = flattenElements(definition.elements);
  const element = flatMap.get(elementId);
  if (!element) return;

  const props = element.props as Record<string, unknown>;
  const oldValue = props[axis];

  // Read the current resolved value for the axis
  const resolvedValue = sceneEl.resolved[axis];

  // Mutate to explicit number
  props[axis] = resolvedValue;

  // Re-render
  const rerender = sk._rerenderSlide as (i: number, d: SlideDefinition) => Promise<LayoutResult>;
  if (!rerender) return;
  await rerender(slideIndex, definition);

  // Push undo entry
  const s = debugController.state;
  s.undoStack.push({ elementId, propKey: axis, oldValue, newValue: resolvedValue, slideIndex });
  s.redoStack.length = 0;
  updateDiffDirtyIndicator();

  // Refresh overlay
  debugController.callbacks.renderDebugOverlay?.({ slideIndex, showInspector: false });

  // Select the element and refresh detail
  s.selectedElementId = elementId;
  debugController.callbacks.renderElementDetail?.(elementId, slideIndex);
}

// =============================================================================
// Inline Type Dropdown (for Relationships section)
// =============================================================================

/** Show a type dropdown inline in the Relationships section row. */
function showRelTypeDropdown(
  elementId: string,
  currentAxis: 'x' | 'y',
  currentType: string,
  typeSpan: HTMLElement,
  slideIndex: number,
): void {
  const sameAxisTypes = typesForAxis(currentAxis);
  const otherAxis: 'x' | 'y' = currentAxis === 'x' ? 'y' : 'x';
  const crossAxisTypes = typesForAxis(otherAxis);

  const select = document.createElement('select');
  select.style.cssText = `
    padding: 2px 4px; font-size: 11px;
    font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
    border: 1px solid #4a9eff; border-radius: 3px;
    background: #fff; color: #1a1a2e; outline: none;
    box-shadow: 0 0 3px rgba(74, 158, 255, 0.3);
    cursor: pointer;
  `;

  // Same-axis group
  const sameGroup = document.createElement('optgroup');
  sameGroup.label = `${currentAxis}-axis`;
  for (const type of sameAxisTypes) {
    const opt = document.createElement('option');
    opt.value = type;
    opt.textContent = type;
    if (type === currentType) opt.selected = true;
    sameGroup.appendChild(opt);
  }
  select.appendChild(sameGroup);

  // Cross-axis group
  const crossGroup = document.createElement('optgroup');
  crossGroup.label = `${otherAxis}-axis`;
  for (const type of crossAxisTypes) {
    const opt = document.createElement('option');
    opt.value = type;
    opt.textContent = type;
    crossGroup.appendChild(opt);
  }
  select.appendChild(crossGroup);

  // Replace the type span with the select
  const parent = typeSpan.parentNode!;
  parent.replaceChild(select, typeSpan);
  select.focus();

  const commit = () => {
    const newType = select.value;
    if (newType !== currentType) {
      changeConstraintType(elementId, currentAxis, newType, slideIndex);
    }
    // Re-render element detail to refresh the relationships section
    const s = debugController.state;
    s.selectedElementId = elementId;
    debugController.callbacks.renderElementDetail?.(elementId, slideIndex);
  };

  let committed = false;
  select.addEventListener('change', () => {
    committed = true;
    commit();
  });
  select.addEventListener('blur', () => {
    if (committed) return;  // change handler already fired
    const s = debugController.state;
    s.selectedElementId = elementId;
    debugController.callbacks.renderElementDetail?.(elementId, slideIndex);
  });
  select.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      const s = debugController.state;
      s.selectedElementId = elementId;
      debugController.callbacks.renderElementDetail?.(elementId, slideIndex);
    }
  });
}

// =============================================================================
// Collapsible Section
// =============================================================================

/** Create a collapsible section for the inspector. */
export function createSection(title: string, content: HTMLElement, collapsed = false): HTMLElement {
  const section = document.createElement("div");
  section.setAttribute("data-sk-inspector-section", title);
  section.style.borderBottom = "1px solid #e8e8e8";

  // Header
  const hdr = document.createElement("div");
  hdr.style.padding = "8px 16px";
  hdr.style.cursor = "pointer";
  hdr.style.display = "flex";
  hdr.style.alignItems = "center";
  hdr.style.userSelect = "none";
  hdr.style.fontSize = "11px";
  hdr.style.fontWeight = "600";
  hdr.style.textTransform = "uppercase";
  hdr.style.letterSpacing = "0.5px";
  hdr.style.color = "#777";

  const chevron = document.createElement("span");
  chevron.setAttribute("data-sk-inspector-chevron", "true");
  chevron.textContent = collapsed ? "\u25B6" : "\u25BC";
  chevron.style.marginRight = "6px";
  chevron.style.fontSize = "9px";
  hdr.appendChild(chevron);

  const titleSpan = document.createElement("span");
  titleSpan.textContent = title;
  hdr.appendChild(titleSpan);
  section.appendChild(hdr);

  // Content
  const contentWrap = document.createElement("div");
  contentWrap.setAttribute("data-sk-inspector-content", "true");
  contentWrap.style.padding = "0 16px 8px";
  contentWrap.style.display = collapsed ? "none" : "block";
  contentWrap.appendChild(content);
  section.appendChild(contentWrap);

  // Toggle
  hdr.addEventListener("click", () => {
    const isHidden = contentWrap.style.display === "none";
    contentWrap.style.display = isHidden ? "block" : "none";
    chevron.textContent = isHidden ? "\u25BC" : "\u25B6";
  });

  return section;
}

// =============================================================================
// Element Detail
// =============================================================================

/** Render the detail view for a selected element. */
export function renderElementDetail(elementId: string, slideIndex: number): void {
  const s = debugController.state;
  const body = s.inspectorPanel?.querySelector('[data-sk-inspector-body]');
  if (!body) return;
  body.innerHTML = '';

  const sk = typeof window !== "undefined" ? window.sk : null;
  if (!sk?.layouts?.[slideIndex]) return;

  const layoutResult = sk.layouts[slideIndex];
  const sceneEl = layoutResult.elements[elementId];
  if (!sceneEl) {
    renderEmptyState();
    return;
  }

  // Section 1: Identity
  const identityDiv = document.createElement("div");
  const typeBadgeColor = TYPE_BADGE_COLORS[sceneEl.type] || "#666";
  identityDiv.innerHTML = `
    <div style="margin-bottom:6px;"><strong style="color:#1a1a2e;font-size:14px;">${escapeHtml(sceneEl.id)}</strong>${badge(sceneEl.type, typeBadgeColor)}</div>
    <div style="margin-bottom:2px;">Parent: <span style="color:#666;">${sceneEl.parentId ?? "(root)"}</span></div>
    ${sceneEl._internal ? '<div style="color:#ff8c32;">Internal element</div>' : ''}
  `;
  body.appendChild(createSection("Identity", identityDiv));

  // Section 2: Inner HTML (editable for el type elements) — shown early for quick access
  const authored = sceneEl.authored;
  const htmlDiv = document.createElement("div");
  if (authored?.content !== undefined) {
    const textarea = document.createElement("textarea");
    textarea.value = authored.content;
    textarea.style.cssText = `
      width: 100%; min-height: 80px; max-height: 300px; padding: 6px;
      font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
      font-size: 11px; color: #1a1a2e; background: #fff;
      border: 1px solid #ddd; border-radius: 3px; resize: vertical;
      box-sizing: border-box; line-height: 1.4;
    `;
    textarea.setAttribute("data-sk-html-editor", "true");
    textarea.spellcheck = false;

    const statusMsg = document.createElement("div");
    statusMsg.style.cssText = "font-size: 10px; margin-top: 4px; min-height: 14px;";

    let committedContent = authored.content;
    let lastPreviewedContent = authored.content;
    let previewSeq = 0;

    /** Apply content to the slide for live preview (no undo entry). */
    const previewHtml = async (content: string) => {
      const sk = (window as any).sk;
      if (!sk?._definitions?.[slideIndex]) return;
      const def = sk._definitions[slideIndex];
      const flat = flattenElements(def.elements);
      const defElement = flat.flatMap.get(elementId);
      if (!defElement || !('content' in defElement)) return;

      (defElement as unknown as Record<string, unknown>).content = content;

      const rerender = sk._rerenderSlide as (i: number, d: any) => Promise<any>;
      if (!rerender) return;
      const seq = ++previewSeq;
      await rerender(slideIndex, def);
      if (seq !== previewSeq) return;

      debugController.callbacks.refreshOverlayOnly?.(slideIndex);
      lastPreviewedContent = content;
    };

    /** Commit the current value: push undo entry for the delta since last commit. */
    const commitHtmlEdit = async () => {
      const newContent = textarea.value;
      if (newContent === committedContent) return;

      if (lastPreviewedContent !== newContent) {
        await previewHtml(newContent);
      }

      const ds = debugController.state;
      ds.undoStack.push({ elementId, propKey: '_content', oldValue: committedContent, newValue: newContent, slideIndex });
      ds.redoStack.length = 0;
      updateDiffDirtyIndicator();

      committedContent = newContent;
      statusMsg.textContent = "Committed";
      statusMsg.style.color = "#4caf50";
      setTimeout(() => { if (statusMsg.textContent === "Committed") statusMsg.textContent = ""; }, 2000);
    };

    let inputDebounce: ReturnType<typeof setTimeout> | null = null;
    textarea.addEventListener("input", () => {
      if (inputDebounce) clearTimeout(inputDebounce);
      inputDebounce = setTimeout(() => {
        const content = textarea.value;
        const parser = new DOMParser();
        const doc = parser.parseFromString(`<body>${content}</body>`, "text/html");
        const errors = doc.querySelectorAll("parsererror");
        if (errors.length > 0) {
          statusMsg.textContent = "Invalid HTML";
          statusMsg.style.color = "#ea4335";
          textarea.style.borderColor = "#ea4335";
          return;
        }
        textarea.style.borderColor = "#4a9eff";
        statusMsg.textContent = content !== committedContent ? "Preview" : "";
        statusMsg.style.color = "#ff8c32";
        previewHtml(content);
      }, 150);
    });

    textarea.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.key === "Enter") {
        e.preventDefault();
        commitHtmlEdit();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        textarea.value = committedContent;
        textarea.style.borderColor = "#ddd";
        statusMsg.textContent = "";
        if (lastPreviewedContent !== committedContent) {
          previewHtml(committedContent);
        }
      }
    });

    textarea.addEventListener("blur", () => {
      if (inputDebounce) clearTimeout(inputDebounce);
      commitHtmlEdit();
    });

    const hint = document.createElement("div");
    hint.textContent = "Live preview \u2022 Ctrl+Enter to commit, Esc to revert";
    hint.style.cssText = "font-size: 10px; color: #999; margin-top: 2px;";

    htmlDiv.appendChild(textarea);
    htmlDiv.appendChild(statusMsg);
    htmlDiv.appendChild(hint);
  } else {
    htmlDiv.innerHTML = '<span style="color:#aaa;">(none)</span>';
  }
  body.appendChild(createSection("Inner HTML", htmlDiv));

  // Section 3: Resolved Bounds
  const boundsDiv = document.createElement("div");
  const r = sceneEl.resolved;
  boundsDiv.innerHTML = `<table style="width:100%;border-collapse:collapse;">
    <tr><td style="color:#999;padding:2px 8px 2px 0;">x</td><td style="color:#1a1a2e;">${r.x.toFixed(1)}</td>
        <td style="color:#999;padding:2px 8px 2px 16px;">y</td><td style="color:#1a1a2e;">${r.y.toFixed(1)}</td></tr>
    <tr><td style="color:#999;padding:2px 8px 2px 0;">w</td><td style="color:#1a1a2e;">${r.w.toFixed(1)}</td>
        <td style="color:#999;padding:2px 8px 2px 16px;">h</td><td style="color:#1a1a2e;">${r.h.toFixed(1)}</td></tr>
  </table>`;
  body.appendChild(createSection("Resolved Bounds", boundsDiv));

  // Section 4: Authored Props
  const propsDiv = document.createElement("div");
  if (authored?.props) {
    const prov = sceneEl.provenance;
    const lockedSources = new Set(["constraint", "stack", "transform"]);
    let hasProps = false;

    // Build props entries — for connectors, ensure cornerRadius is numeric
    const propsEntries: [string, unknown][] = Object.entries(authored.props);
    if (sceneEl.type === 'connector') {
      const idx = propsEntries.findIndex(([k]) => k === 'cornerRadius');
      if (idx >= 0 && propsEntries[idx][1] == null) {
        propsEntries[idx] = ['cornerRadius', 0];
      } else if (idx < 0) {
        propsEntries.push(['cornerRadius', 0]);
      }
    }

    for (const [key, val] of propsEntries) {
      if (key.startsWith('_')) continue;
      hasProps = true;

      let displayVal: string;
      if (val != null && typeof val === "object") {
        displayVal = JSON.stringify(val);
      } else {
        displayVal = String(val ?? "");
      }

      // Determine if locked (constrained)
      const axisProv = (prov as Record<string, {source?: string}>)?.[key];
      const isLocked = axisProv && lockedSources.has(axisProv.source || "");
      const enumOpts = !isLocked ? getEnumOptions(key, sceneEl.type) : null;
      const isAnchor = !isLocked && !enumOpts && isAnchorProp(key);
      const isGap = !isLocked && isGapProp(key);
      const isElId = !isLocked && !enumOpts && !isAnchor && !isGap && isElementIdProp(key);
      const editable = !isLocked && !enumOpts && !isAnchor && !isGap && !isElId && isEditableProp(key, val);

      const propRow = document.createElement("div");
      propRow.style.padding = "2px 0";
      propRow.setAttribute("data-sk-prop-key", key);

      /** Apply the standard editable-prop styling to a row. */
      const styleEditable = (row: HTMLElement, status: string) => {
        row.style.color = "#1a1a2e";
        row.style.textDecoration = "underline";
        row.style.textDecorationStyle = "dashed";
        row.style.textUnderlineOffset = "2px";
        row.style.cursor = "pointer";
        row.setAttribute("data-sk-prop-status", status);
        row.addEventListener("mouseenter", () => { row.style.background = "#e8f0fe"; });
        row.addEventListener("mouseleave", () => { row.style.background = ""; });
      };

      if (isLocked) {
        propRow.style.color = "#aaa";
        propRow.setAttribute("data-sk-prop-status", "locked");
        propRow.innerHTML = `<span style="margin-right:2px;">&#128274;</span>${escapeHtml(key)}: ${escapeHtml(displayVal)}`;
        propRow.style.cursor = "help";
        propRow.addEventListener("click", (e) => {
          e.stopPropagation();
          showLockedTooltip(key, propRow, sceneEl);
        });
      } else if (enumOpts) {
        styleEditable(propRow, "enum");
        propRow.textContent = `${key}: ${displayVal}`;
        propRow.addEventListener("click", (e) => {
          e.stopPropagation();
          startEnumEdit(elementId, key, String(val ?? ''), enumOpts, propRow, slideIndex);
        });
      } else if (isAnchor) {
        styleEditable(propRow, "anchor");
        propRow.textContent = `${key}: ${displayVal}`;
        propRow.addEventListener("click", (e) => {
          e.stopPropagation();
          startAnchorEdit(elementId, key, String(val ?? 'cc'), propRow, slideIndex);
        });
      } else if (isGap) {
        styleEditable(propRow, "gap");
        propRow.textContent = `${key}: ${displayVal}`;
        propRow.addEventListener("click", (e) => {
          e.stopPropagation();
          startGapTokenEdit(elementId, key, val as number | string, propRow, slideIndex);
        });
      } else if (isElId) {
        styleEditable(propRow, "element-id");
        propRow.textContent = `${key}: ${displayVal}`;
        propRow.addEventListener("click", (e) => {
          e.stopPropagation();
          startElementIdEdit(elementId, key, String(val ?? ''), propRow, slideIndex);
        });
      } else if (editable) {
        styleEditable(propRow, "editable");
        propRow.textContent = `${key}: ${displayVal}`;
        propRow.addEventListener("click", (e) => {
          e.stopPropagation();
          startEdit(elementId, key, val as number, propRow, slideIndex);
        });
      } else {
        propRow.style.color = "#1a1a2e";
        propRow.setAttribute("data-sk-prop-status", "readonly");
        propRow.textContent = `${key}: ${displayVal}`;
      }

      propsDiv.appendChild(propRow);
    }
    if (!hasProps) {
      propsDiv.innerHTML = '<span style="color:#aaa;">(none)</span>';
    }
  } else {
    propsDiv.innerHTML = '<span style="color:#aaa;">(none)</span>';
  }
  body.appendChild(createSection("Authored Props", propsDiv));

  // Section 5: Provenance
  const provDiv = document.createElement("div");
  const prov = sceneEl.provenance;
  let provHtml = '';
  for (const axis of ["x", "y", "w", "h"] as const) {
    const p = prov[axis];
    if (!p) continue;
    const color = PROVENANCE_COLORS[p.source] || "#999";
    provHtml += `<div style="padding:3px 0;">${axis}: ${badge(p.source, color)}`;

    if (p.source === "constraint") {
      provHtml += ` <span style="color:#666;">${escapeHtml(p.type || "")} ref=${escapeHtml(p.ref || "")}`;
      if (p.gap !== undefined) provHtml += ` gap=${p.gap}`;
      provHtml += `</span>`;
    } else if (p.source === "stack") {
      provHtml += ` <span style="color:#666;">stack=${escapeHtml(p.stackId || "")}</span>`;
    } else if (p.source === "transform" && p.original) {
      provHtml += ` <span style="color:#666;">original: ${escapeHtml(JSON.stringify(p.original))}</span>`;
    } else if (p.source === "authored" && p.value !== undefined) {
      provHtml += ` <span style="color:#666;">${escapeHtml(String(p.value))}</span>`;
    }

    if (p.sourceAnchor) provHtml += ` <span style="color:#999;">src=${p.sourceAnchor}</span>`;
    if (p.targetAnchor) provHtml += ` <span style="color:#999;">tgt=${p.targetAnchor}</span>`;
    provHtml += `</div>`;
  }
  provDiv.innerHTML = provHtml;
  body.appendChild(createSection("Provenance", provDiv));

  // Section 6: Relationships
  const relsDiv = document.createElement("div");
  const allEdges = extractRelationshipEdges(layoutResult.elements);
  const relEdges = allEdges.filter(e => e.fromId === elementId || e.toId === elementId);
  if (relEdges.length > 0) {
    for (const edge of relEdges) {
      const dir = edge.toId === elementId ? "incoming" : "outgoing";
      const arrow = dir === "incoming" ? "\u2190" : "\u2192";
      const otherId = dir === "incoming" ? edge.fromId : edge.toId;
      const edgeAxis = axisForType(edge.type);

      const row = document.createElement("div");
      row.style.padding = "2px 0";

      // Arrow
      const arrowSpan = document.createElement("span");
      arrowSpan.textContent = arrow + " ";
      row.appendChild(arrowSpan);

      if (dir === "incoming" && edgeAxis) {
        // Editable reference element (click to pick new reference)
        const refSpan = document.createElement("span");
        refSpan.textContent = otherId;
        refSpan.style.color = "#1a1a2e";
        refSpan.style.textDecoration = "underline";
        refSpan.style.textDecorationStyle = "dashed";
        refSpan.style.textUnderlineOffset = "2px";
        refSpan.style.cursor = "pointer";
        refSpan.title = "Click to change reference element";
        refSpan.addEventListener("mouseenter", () => { refSpan.style.background = "#e8f0fe"; });
        refSpan.addEventListener("mouseleave", () => { refSpan.style.background = ""; });
        refSpan.addEventListener("click", (e) => {
          e.stopPropagation();
          enterPickMode(elementId, edgeAxis, edge.type, slideIndex);
        });
        row.appendChild(refSpan);
        row.appendChild(document.createTextNode(" "));

        // Editable type (click to open dropdown)
        const typeSpan = document.createElement("span");
        typeSpan.textContent = edge.type;
        typeSpan.style.color = "#666";
        typeSpan.style.textDecoration = "underline";
        typeSpan.style.textDecorationStyle = "dashed";
        typeSpan.style.textUnderlineOffset = "2px";
        typeSpan.style.cursor = "pointer";
        typeSpan.title = "Click to change constraint type";
        typeSpan.addEventListener("mouseenter", () => { typeSpan.style.background = "#e8f0fe"; });
        typeSpan.addEventListener("mouseleave", () => { typeSpan.style.background = ""; });
        typeSpan.addEventListener("click", (e) => {
          e.stopPropagation();
          showRelTypeDropdown(elementId, edgeAxis, edge.type, typeSpan, slideIndex);
        });
        row.appendChild(typeSpan);

        // Anchor info (read-only)
        const anchorSpan = document.createElement("span");
        anchorSpan.textContent = ` [${edge.sourceAnchor}\u2192${edge.targetAnchor}]`;
        anchorSpan.style.color = "#999";
        row.appendChild(anchorSpan);
      } else {
        // Outgoing — read-only display
        const textPart = document.createElement("span");
        textPart.innerHTML = `<span style="color:#1a1a2e;">${escapeHtml(otherId)}</span> <span style="color:#666;">${escapeHtml(edge.type)} [${edge.sourceAnchor}\u2192${edge.targetAnchor}]</span>`;
        row.appendChild(textPart);
      }

      // Gap value — editable for incoming constraints with gap
      if (edge.gap !== undefined && dir === "incoming" && isEditableGap(edge.type)) {
        const axis = (edge.type === 'below' || edge.type === 'above') ? 'y' : 'x';
        const gapSpan = document.createElement("span");
        gapSpan.textContent = ` gap=${edge.gap}`;
        gapSpan.style.color = "#1a1a2e";
        gapSpan.style.textDecoration = "underline";
        gapSpan.style.textDecorationStyle = "dashed";
        gapSpan.style.textUnderlineOffset = "2px";
        gapSpan.style.cursor = "pointer";
        gapSpan.setAttribute("data-sk-gap-edit", `${axis}.gap`);
        gapSpan.addEventListener("mouseenter", () => { gapSpan.style.background = "#e8f0fe"; });
        gapSpan.addEventListener("mouseleave", () => { gapSpan.style.background = ""; });
        gapSpan.addEventListener("click", (e) => {
          e.stopPropagation();
          startGapTokenEdit(elementId, `${axis}.gap`, edge.gap!, gapSpan, slideIndex);
        });
        row.appendChild(gapSpan);
      } else if (edge.gap !== undefined) {
        const gapSpan = document.createElement("span");
        gapSpan.textContent = ` gap=${edge.gap}`;
        gapSpan.style.color = "#999";
        row.appendChild(gapSpan);
      }

      relsDiv.appendChild(row);
    }
  } else {
    relsDiv.innerHTML = '<span style="color:#aaa;">(none)</span>';
  }

  // Refless constraints sub-section (centerHSlide, centerVSlide, matchMaxWidth, matchMaxHeight)
  const reflessRows = buildReflessConstraintRows(elementId, slideIndex, authored);
  if (reflessRows.length > 0) {
    // If the only content was "(none)", replace it
    if (relEdges.length === 0) {
      relsDiv.innerHTML = '';
    }
    const subHeader = document.createElement("div");
    subHeader.style.cssText = "color:#999;font-size:10px;margin-top:6px;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px;";
    subHeader.textContent = "Relative to slide/group";
    relsDiv.appendChild(subHeader);
    for (const row of reflessRows) {
      relsDiv.appendChild(row);
    }
  }

  body.appendChild(createSection("Relationships", relsDiv));

  // Section 7: CSS Pass-through Styles
  const stylesDiv = document.createElement("div");
  const styleObj = authored?.props?.style as Record<string, unknown> | undefined;
  if (styleObj && Object.keys(styleObj).length > 0) {
    let stylesHtml = '';
    for (const [prop, val] of Object.entries(styleObj)) {
      stylesHtml += `<div style="padding:1px 0;">${escapeHtml(prop)}: <span style="color:#1a1a2e;">${escapeHtml(String(val))}</span></div>`;
    }
    stylesDiv.innerHTML = stylesHtml;
  } else {
    stylesDiv.innerHTML = '<span style="color:#aaa;">(none)</span>';
  }
  body.appendChild(createSection("CSS Styles", stylesDiv, true));
}

// =============================================================================
// Selection Highlight
// =============================================================================

/** Update the selection highlight on the debug overlay. */
export function updateSelectionHighlight(elementId: string | null, slideIndex: number): void {
  const s = debugController.state;

  // Remove existing selection highlight
  if (s.debugOverlay) {
    const existing = s.debugOverlay.querySelectorAll('[data-sk-debug="selection"]');
    existing.forEach(el => el.remove());
  }

  if (!elementId || !s.debugOverlay) return;

  const sk = typeof window !== "undefined" ? window.sk : null;
  if (!sk?.layouts?.[slideIndex]) return;

  const allElements = sk.layouts[slideIndex].elements;
  const sceneEl: SceneElement | undefined = allElements[elementId];
  if (!sceneEl?.resolved) return;

  const r = absoluteBounds(sceneEl, allElements);
  const highlight = document.createElement("div");
  highlight.setAttribute("data-sk-debug", "selection");
  highlight.setAttribute("data-sk-debug-id", elementId);
  highlight.style.position = "absolute";
  highlight.style.left = `${r.x}px`;
  highlight.style.top = `${r.y}px`;
  highlight.style.width = `${r.w}px`;
  highlight.style.height = `${r.h}px`;
  highlight.style.border = "2px solid #fff";
  highlight.style.boxShadow = "0 0 8px rgba(255,255,255,0.6)";
  highlight.style.boxSizing = "border-box";
  highlight.style.pointerEvents = "none";
  highlight.style.zIndex = "10000";

  s.debugOverlay.appendChild(highlight);
}

// =============================================================================
// Click Handler
// =============================================================================

/** Handle click events for element inspection. */
function handleInspectorClick(event: MouseEvent): void {
  const s = debugController.state;

  // Suppress click after a drag gesture completes
  if (s.dragInProgress) return;

  // Only act when debug overlay is visible
  if (!s.debugOverlay) return;

  // Don't deselect when clicking inside the inspector panel
  const target = event.target as HTMLElement;
  if (target && target.closest('[data-sk-role="debug-inspector"]')) return;

  // Don't deselect when clicking on a resize handle
  if (target && target.closest('[data-sk-debug="resize-handle"]')) return;

  // Check for constraint arrow click (hit target)
  const hitTarget = target?.closest('[data-sk-debug="rel-hit"]');
  if (hitTarget) {
    const elementId = hitTarget.getAttribute('data-sk-debug-element');
    const axis = hitTarget.getAttribute('data-sk-debug-axis') as 'x' | 'y' | null;
    if (elementId && axis) {
      // Clear element selection
      s.selectedElementId = null;
      updateSelectionHighlight(null, s.currentSlideIndex);
      removeResizeHandles();
      // Set constraint selection
      s.selectedConstraint = { elementId, axis };
      renderConstraintDetail(elementId, axis, s.currentSlideIndex);
      updateConstraintHighlight(elementId, axis, s.currentSlideIndex);
      return;
    }
  }

  // Walk up from target to find a data-sk-id element
  const skEl = target?.closest('[data-sk-id]');
  if (skEl) {
    const id = skEl.getAttribute('data-sk-id');
    if (id) {
      clearConstraintSelection();
      s.selectedElementId = id;
      renderElementDetail(id, s.currentSlideIndex);
      updateSelectionHighlight(id, s.currentSlideIndex);
      renderResizeHandles(id, s.currentSlideIndex);
      return;
    }
  }

  // Clicked empty space → deselect both
  s.selectedElementId = null;
  clearConstraintSelection();
  renderEmptyState();
  updateSelectionHighlight(null, s.currentSlideIndex);
  removeResizeHandles();
}

/** Attach the click handler for the inspector. */
export function attachClickHandler(): void {
  const s = debugController.state;
  if (s.clickHandlerAttached) return;
  document.addEventListener("click", handleInspectorClick, true);
  attachContextMenuHandler();
  s.clickHandlerAttached = true;
}

/** Detach the click handler for the inspector. */
export function detachClickHandler(): void {
  const s = debugController.state;
  if (!s.clickHandlerAttached) return;
  document.removeEventListener("click", handleInspectorClick, true);
  detachContextMenuHandler();
  s.clickHandlerAttached = false;
}

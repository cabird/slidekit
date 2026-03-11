// Debug Inspector — Pick Reference Element Mode
//
// After selecting a constraint type from the context menu, enters a mode
// where the user clicks on an element to use as the constraint reference.
// Shows a preview arrow and highlights valid targets on hover.

import { debugController } from './debug-state.js';
import { addConstraint, DIRECTIONAL_TYPES } from './debug-inspector-constraint.js';
import { getAnchorPosition } from './debug-overlay.js';
import type { SceneElement, Rect } from './types.js';

// =============================================================================
// Constraint anchor mapping (mirrors layout/helpers.ts _CONSTRAINT_ANCHORS)
// =============================================================================

const CONSTRAINT_ANCHORS: Record<string, [string, string]> = {
  below:       ['bc', 'tc'],
  above:       ['tc', 'bc'],
  rightOf:     ['cr', 'cl'],
  leftOf:      ['cl', 'cr'],
  centerV:     ['cc', 'cc'],
  centerH:     ['cc', 'cc'],
  alignTop:    ['tc', 'tc'],
  alignBottom: ['bc', 'bc'],
  alignLeft:   ['cl', 'cl'],
  alignRight:  ['cr', 'cr'],
};

// =============================================================================
// Cycle detection
// =============================================================================

/** BFS through constraint provenance to check if adding refId → elementId would create a cycle. */
function wouldCreateCycle(
  sceneElements: Record<string, SceneElement>,
  refId: string,
  elementId: string,
): boolean {
  const visited = new Set<string>();
  const queue = [refId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === elementId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    const el = sceneElements[current];
    if (!el?.provenance) continue;
    for (const axis of ['x', 'y'] as const) {
      const p = el.provenance[axis];
      if (p?.source === 'constraint' && p.ref) {
        queue.push(p.ref);
      }
    }
  }
  return false;
}

// =============================================================================
// Gap inference
// =============================================================================

/** Compute gap so the element stays in its current position. */
function inferGap(
  constraintType: string,
  subjectBounds: Rect,
  refBounds: Rect,
): number {
  let gap = 0;
  switch (constraintType) {
    case 'below':
      gap = subjectBounds.y - (refBounds.y + refBounds.h);
      break;
    case 'above':
      gap = refBounds.y - (subjectBounds.y + subjectBounds.h);
      break;
    case 'rightOf':
      gap = subjectBounds.x - (refBounds.x + refBounds.w);
      break;
    case 'leftOf':
      gap = refBounds.x - (subjectBounds.x + subjectBounds.w);
      break;
  }
  return Math.max(0, gap);
}

// =============================================================================
// Pick mode state
// =============================================================================

let pickOverlay: HTMLDivElement | null = null;
let previewSvg: SVGSVGElement | null = null;
let dropdownPanel: HTMLDivElement | null = null;
let hoveredRefId: string | null = null;

// =============================================================================
// Preview arrow
// =============================================================================

function updatePreviewArrow(
  refId: string | null,
  constraintType: string,
  subjectBounds: Rect,
  sceneElements: Record<string, SceneElement>,
): void {
  // Clear existing preview lines
  if (previewSvg) {
    const existing = previewSvg.querySelectorAll('[data-sk-pick-preview]');
    existing.forEach(el => el.remove());
  }

  if (!refId || !previewSvg) return;

  const refEl = sceneElements[refId];
  if (!refEl?.resolved) return;

  const anchors = CONSTRAINT_ANCHORS[constraintType];
  if (!anchors) return;

  // Arrows point from ref (source) to subject (target)
  const fromPt = getAnchorPosition(refEl.resolved, anchors[0]);
  const toPt = getAnchorPosition(subjectBounds, anchors[1]);

  const NS = 'http://www.w3.org/2000/svg';

  // Dashed blue preview line
  const line = document.createElementNS(NS, 'line');
  line.setAttribute('x1', String(fromPt.x));
  line.setAttribute('y1', String(fromPt.y));
  line.setAttribute('x2', String(toPt.x));
  line.setAttribute('y2', String(toPt.y));
  line.setAttribute('stroke', 'rgba(74, 158, 255, 0.8)');
  line.setAttribute('stroke-width', '2');
  line.setAttribute('stroke-dasharray', '6 4');
  line.setAttribute('pointer-events', 'none');
  line.setAttribute('data-sk-pick-preview', 'true');

  // Arrowhead
  const dx = toPt.x - fromPt.x;
  const dy = toPt.y - fromPt.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len > 10) {
    const ux = dx / len;
    const uy = dy / len;
    const arrowLen = 8;
    const arrowW = 4;
    const tipX = toPt.x;
    const tipY = toPt.y;
    const baseX = tipX - ux * arrowLen;
    const baseY = tipY - uy * arrowLen;
    const leftX = baseX - uy * arrowW;
    const leftY = baseY + ux * arrowW;
    const rightX = baseX + uy * arrowW;
    const rightY = baseY - ux * arrowW;

    const arrow = document.createElementNS(NS, 'polygon');
    arrow.setAttribute('points', `${tipX},${tipY} ${leftX},${leftY} ${rightX},${rightY}`);
    arrow.setAttribute('fill', 'rgba(74, 158, 255, 0.8)');
    arrow.setAttribute('pointer-events', 'none');
    arrow.setAttribute('data-sk-pick-preview', 'true');
    previewSvg.appendChild(arrow);
  }

  previewSvg.appendChild(line);
}

// =============================================================================
// Highlight management
// =============================================================================

function clearHighlights(): void {
  if (!pickOverlay) return;
  const existing = pickOverlay.querySelectorAll('[data-sk-pick-highlight]');
  existing.forEach(el => el.remove());
}

function highlightElement(
  refId: string,
  sceneElements: Record<string, SceneElement>,
  isValid: boolean,
): void {
  if (!pickOverlay) return;
  const el = sceneElements[refId];
  if (!el?.resolved) return;

  const highlight = document.createElement('div');
  highlight.setAttribute('data-sk-pick-highlight', refId);
  highlight.style.cssText = `
    position: absolute; pointer-events: none; box-sizing: border-box;
    border: 2px solid ${isValid ? 'rgba(74, 158, 255, 0.8)' : 'rgba(200, 200, 200, 0.5)'};
    background: ${isValid ? 'rgba(74, 158, 255, 0.08)' : 'rgba(200, 200, 200, 0.05)'};
    border-radius: 3px;
    left: ${el.resolved.x}px; top: ${el.resolved.y}px;
    width: ${el.resolved.w}px; height: ${el.resolved.h}px;
  `;
  pickOverlay.appendChild(highlight);
}

// =============================================================================
// Dropdown fallback
// =============================================================================

function createDropdownPanel(
  elementId: string,
  constraintType: string,
  slideIndex: number,
  sceneElements: Record<string, SceneElement>,
  validRefs: string[],
  invalidRefs: Set<string>,
): void {
  const panel = document.createElement('div');
  panel.setAttribute('data-sk-debug', 'pick-dropdown');
  panel.style.cssText = `
    position: fixed; z-index: 100002;
    right: ${debugController.state.panelWidth + 8}px; top: 8px;
    background: #fff; border: 1px solid #d0d0d0; border-radius: 6px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.15); padding: 12px;
    font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace; font-size: 12px;
    min-width: 200px;
  `;

  const title = document.createElement('div');
  title.style.cssText = 'font-weight: 600; margin-bottom: 8px; color: #1a1a2e;';
  title.textContent = `Pick reference for ${constraintType}`;
  panel.appendChild(title);

  const hint = document.createElement('div');
  hint.style.cssText = 'color: #888; margin-bottom: 8px; font-size: 11px;';
  hint.textContent = 'Click an element on the slide, or select below:';
  panel.appendChild(hint);

  const select = document.createElement('select');
  select.style.cssText = `
    width: 100%; padding: 4px 6px; font-size: 12px;
    font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
    border: 1px solid #4a9eff; border-radius: 3px;
    background: #fff; color: #1a1a2e; outline: none;
    cursor: pointer;
  `;

  // Default option
  const defaultOpt = document.createElement('option');
  defaultOpt.value = '';
  defaultOpt.textContent = '— select element —';
  defaultOpt.selected = true;
  select.appendChild(defaultOpt);

  for (const refId of validRefs) {
    const opt = document.createElement('option');
    opt.value = refId;
    opt.textContent = refId;
    if (invalidRefs.has(refId)) {
      opt.disabled = true;
      opt.textContent += ' (cycle)';
    }
    select.appendChild(opt);
  }

  select.addEventListener('change', () => {
    const refId = select.value;
    if (refId) {
      confirmPick(refId, elementId, constraintType, slideIndex, sceneElements);
    }
  });
  panel.appendChild(select);

  // Cancel button
  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.style.cssText = `
    display: block; margin-top: 8px; padding: 4px 12px; font-size: 11px;
    font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
    background: #fff; color: #666; border: 1px solid #ccc;
    border-radius: 4px; cursor: pointer; width: 100%;
  `;
  cancelBtn.addEventListener('click', exitPickMode);
  panel.appendChild(cancelBtn);

  document.body.appendChild(panel);
  dropdownPanel = panel;
}

// =============================================================================
// Confirm / exit
// =============================================================================

function confirmPick(
  refId: string,
  elementId: string,
  constraintType: string,
  slideIndex: number,
  sceneElements: Record<string, SceneElement>,
): void {
  const subjectEl = sceneElements[elementId];
  const refEl = sceneElements[refId];
  if (!subjectEl?.resolved || !refEl?.resolved) return;

  // Infer gap for directional types
  let gap = 0;
  if (DIRECTIONAL_TYPES.has(constraintType)) {
    gap = inferGap(constraintType, subjectEl.resolved, refEl.resolved);
  }

  exitPickMode();
  addConstraint(elementId, axisForConstraint(constraintType), constraintType, refId, gap, slideIndex);
}

function axisForConstraint(type: string): 'x' | 'y' {
  const yTypes = new Set(['below', 'above', 'centerV', 'alignTop', 'alignBottom']);
  return yTypes.has(type) ? 'y' : 'x';
}

export function exitPickMode(): void {
  const s = debugController.state;
  s.pickMode = null;
  hoveredRefId = null;

  if (pickOverlay) { pickOverlay.remove(); pickOverlay = null; }
  if (previewSvg) { previewSvg.remove(); previewSvg = null; }
  if (dropdownPanel) { dropdownPanel.remove(); dropdownPanel = null; }

  // Remove event listeners
  document.removeEventListener('pointermove', onPickPointerMove, true);
  document.removeEventListener('pointerdown', onPickPointerDown, true);
  document.removeEventListener('keydown', onPickKeyDown, true);
}

// =============================================================================
// Event handlers
// =============================================================================

function onPickPointerMove(event: PointerEvent): void {
  const s = debugController.state;
  if (!s.pickMode) return;

  const { elementId, constraintType, slideIndex } = s.pickMode;
  const sk = (window as any).sk;
  if (!sk?.layouts?.[slideIndex]) return;
  const sceneElements: Record<string, SceneElement> = sk.layouts[slideIndex].elements;
  const subjectEl = sceneElements[elementId];
  if (!subjectEl?.resolved) return;

  // Find element under cursor using DOM hit testing
  // Temporarily make pick overlay transparent to pointer events
  if (pickOverlay) pickOverlay.style.pointerEvents = 'none';
  const elementsAtPoint = document.elementsFromPoint(event.clientX, event.clientY);
  if (pickOverlay) pickOverlay.style.pointerEvents = 'auto';

  let foundRefId: string | null = null;
  for (const el of elementsAtPoint) {
    const skEl = (el as HTMLElement).closest?.('[data-sk-id]');
    if (skEl) {
      const id = skEl.getAttribute('data-sk-id');
      if (id && id !== elementId) {
        // Check it's not a connector
        const sceneRef = sceneElements[id];
        if (sceneRef && sceneRef.type !== 'connector') {
          foundRefId = id;
          break;
        }
      }
    }
  }

  if (foundRefId !== hoveredRefId) {
    hoveredRefId = foundRefId;
    clearHighlights();

    if (foundRefId) {
      const isCycle = wouldCreateCycle(sceneElements, foundRefId, elementId);
      highlightElement(foundRefId, sceneElements, !isCycle);

      if (!isCycle) {
        updatePreviewArrow(foundRefId, constraintType, subjectEl.resolved, sceneElements);
        if (pickOverlay) pickOverlay.style.cursor = 'pointer';
      } else {
        updatePreviewArrow(null, constraintType, subjectEl.resolved, sceneElements);
        if (pickOverlay) pickOverlay.style.cursor = 'not-allowed';
      }
    } else {
      updatePreviewArrow(null, constraintType, subjectEl.resolved, sceneElements);
      if (pickOverlay) pickOverlay.style.cursor = 'crosshair';
    }
  }
}

function onPickPointerDown(event: PointerEvent): void {
  const s = debugController.state;
  if (!s.pickMode) return;

  // Only handle left-click
  if (event.button !== 0) {
    if (event.button === 2) {
      // Right-click cancels
      event.preventDefault();
      event.stopPropagation();
      exitPickMode();
    }
    return;
  }

  // Don't capture clicks on the dropdown panel
  const target = event.target as HTMLElement;
  if (target?.closest('[data-sk-debug="pick-dropdown"]')) return;

  event.preventDefault();
  event.stopPropagation();

  const { elementId, constraintType, slideIndex } = s.pickMode;
  const sk = (window as any).sk;
  if (!sk?.layouts?.[slideIndex]) return;
  const sceneElements: Record<string, SceneElement> = sk.layouts[slideIndex].elements;

  if (hoveredRefId) {
    // Validate no cycle
    if (!wouldCreateCycle(sceneElements, hoveredRefId, elementId)) {
      confirmPick(hoveredRefId, elementId, constraintType, slideIndex, sceneElements);
      return;
    }
  }

  // Click on empty space cancels
  if (!hoveredRefId) {
    exitPickMode();
  }
}

function onPickKeyDown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault();
    event.stopPropagation();
    exitPickMode();
  }
}

// =============================================================================
// Enter pick mode
// =============================================================================

export function enterPickMode(
  elementId: string,
  axis: 'x' | 'y',
  constraintType: string,
  slideIndex: number,
): void {
  const s = debugController.state;

  // Exit any existing pick mode
  if (s.pickMode) exitPickMode();

  const sk = (window as any).sk;
  if (!sk?.layouts?.[slideIndex]) return;
  const sceneElements: Record<string, SceneElement> = sk.layouts[slideIndex].elements;
  const subjectEl = sceneElements[elementId];
  if (!subjectEl?.resolved) return;

  // Set state
  s.pickMode = { elementId, axis, constraintType, slideIndex };

  // Get slide dimensions
  const slideW: number = sk._config?.slide?.w ?? 1920;
  const slideH: number = sk._config?.slide?.h ?? 1080;

  // Create pick overlay (inside the debug overlay, in slide coordinates)
  const overlay = document.createElement('div');
  overlay.setAttribute('data-sk-debug', 'pick-overlay');
  overlay.style.cssText = `
    position: absolute; left: 0; top: 0;
    width: ${slideW}px; height: ${slideH}px;
    pointer-events: auto; cursor: crosshair;
    z-index: 10000;
  `;

  // Create preview SVG
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('width', String(slideW));
  svg.setAttribute('height', String(slideH));
  svg.style.cssText = 'position: absolute; left: 0; top: 0; pointer-events: none; overflow: visible;';
  overlay.appendChild(svg);
  previewSvg = svg;

  // Highlight the subject element
  const subjectHighlight = document.createElement('div');
  subjectHighlight.setAttribute('data-sk-pick-subject', 'true');
  subjectHighlight.style.cssText = `
    position: absolute; pointer-events: none; box-sizing: border-box;
    border: 2px solid rgba(255, 140, 50, 0.8);
    background: rgba(255, 140, 50, 0.08);
    border-radius: 3px;
    left: ${subjectEl.resolved.x}px; top: ${subjectEl.resolved.y}px;
    width: ${subjectEl.resolved.w}px; height: ${subjectEl.resolved.h}px;
  `;
  overlay.appendChild(subjectHighlight);

  // Subject label
  const subjectLabel = document.createElement('div');
  subjectLabel.style.cssText = `
    position: absolute; pointer-events: none;
    left: ${subjectEl.resolved.x}px; top: ${subjectEl.resolved.y - 18}px;
    font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
    font-size: 10px; color: rgba(255, 140, 50, 0.9);
    font-weight: 600; white-space: nowrap;
  `;
  subjectLabel.textContent = `${elementId} (${constraintType})`;
  overlay.appendChild(subjectLabel);

  // Append to debug overlay (so it's in slide coordinate space)
  if (s.debugOverlay) {
    s.debugOverlay.appendChild(overlay);
  }
  pickOverlay = overlay;

  // Collect valid reference IDs for the dropdown
  const validRefs: string[] = [];
  const invalidRefs = new Set<string>();
  for (const [id, el] of Object.entries(sceneElements)) {
    if (id === elementId) continue;
    if ((el as SceneElement).type === 'connector') continue;
    validRefs.push(id);
    if (wouldCreateCycle(sceneElements, id, elementId)) {
      invalidRefs.add(id);
    }
  }
  validRefs.sort();

  // Create dropdown fallback panel
  createDropdownPanel(elementId, constraintType, slideIndex, sceneElements, validRefs, invalidRefs);

  // Attach event listeners
  document.addEventListener('pointermove', onPickPointerMove, true);
  document.addEventListener('pointerdown', onPickPointerDown, true);
  document.addEventListener('keydown', onPickKeyDown, true);
}

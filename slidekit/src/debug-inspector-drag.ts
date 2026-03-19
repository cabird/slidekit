// Debug Inspector Drag — Click-and-drag move + resize handles
//
// Adds direct mouse interaction to debug inspector mode:
//  - Drag selected elements to reposition (x, y)
//  - Resize handles on selection to change dimensions (w, h)
//  - Provenance-gated: only authored axes are movable/resizable
//  - Preview via proxy overlay rectangle; single commit on pointerup
//
// Uses debugController.callbacks for refreshOverlayOnly and renderElementDetail
// to avoid circular imports with debug.ts and debug-inspector.ts.

import { debugController } from './debug-state.js';
import { updateDiffDirtyIndicator } from './debug-inspector-diff.js';
import { flattenElements } from './layout/helpers.js';
import { absoluteBounds } from './debug-overlay.js';
import type { SceneElement, SlideDefinition, SlideElement, LayoutResult } from './types.js';

// =============================================================================
// Constants
// =============================================================================

const DRAG_THRESHOLD = 5;  // px — must move this far before drag starts
const HANDLE_SIZE = 8;     // px in slide coordinates
const MIN_ELEMENT_SIZE = 10;  // minimum w/h in slide coordinates
const LOCKED_SOURCES = new Set(['constraint', 'stack', 'transform']);
const DEFAULT_SNAP_GRID = 10;  // px in slide coordinates

/** Snap a value to the nearest grid point. */
function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

type HandlePosition = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

// =============================================================================
// Types
// =============================================================================

interface CoordMapper {
  layerRect: DOMRect;
  scaleX: number;  // slideW / layerRect.width
  scaleY: number;  // slideH / layerRect.height
}

interface AxesEditability {
  x: boolean;
  y: boolean;
  w: boolean;
  h: boolean;
}

type HandleEligibility = Record<HandlePosition, boolean>;

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface DragState {
  mode: 'move' | 'resize';
  elementId: string;
  slideIndex: number;
  pointerId: number;       // for setPointerCapture
  captureTarget: Element | null;  // element holding pointer capture
  startClientX: number;
  startClientY: number;
  originalBounds: Rect;
  originalProps: Partial<Record<'x' | 'y' | 'w' | 'h', number>>;
  editableAxes: AxesEditability;
  handlePosition?: HandlePosition;
  mapper: CoordMapper;
  dragging: boolean;
  proxyRect: HTMLDivElement | null;
  rafId: number | null;  // requestAnimationFrame ID for throttling
}

// =============================================================================
// Module state
// =============================================================================

let _dragState: DragState | null = null;
let _currentSlideIndex = 0;
let _slideW = 1920;
let _slideH = 1080;
let _layerListenerAttached = false;

// Bound references for document-level listeners (so we can remove them)
const _onPointerMoveBound = onPointerMove as (e: Event) => void;
const _onPointerUpBound = onPointerUp as unknown as (e: Event) => void;
const _onPointerCancelBound = onPointerCancel as (e: Event) => void;
const _onKeyDownBound = onKeyDown as (e: Event) => void;

// =============================================================================
// Coordinate mapping
// =============================================================================

/** Look up the current .slidekit-layer fresh from the DOM each time.
 *  rerenderSlide() replaces the layer element, so caching it would go stale. */
function getCurrentLayer(): HTMLElement | null {
  const layers = document.querySelectorAll('.slidekit-layer');
  return (layers[_currentSlideIndex] as HTMLElement) ?? null;
}

function getSlideCoordMapper(): CoordMapper | null {
  const layer = getCurrentLayer();
  if (!layer) return null;
  const layerRect = layer.getBoundingClientRect();
  if (layerRect.width === 0 || layerRect.height === 0) return null;
  return {
    layerRect,
    scaleX: _slideW / layerRect.width,
    scaleY: _slideH / layerRect.height,
  };
}

// =============================================================================
// Provenance helpers
// =============================================================================

function getEditableAxes(sceneEl: SceneElement): AxesEditability {
  const p = sceneEl.provenance;
  return {
    x: !LOCKED_SOURCES.has(p.x.source),
    y: !LOCKED_SOURCES.has(p.y.source),
    w: !LOCKED_SOURCES.has(p.w.source),
    h: !LOCKED_SOURCES.has(p.h.source),
  };
}

function getHandleEligibility(axes: AxesEditability): HandleEligibility {
  return {
    e:  axes.w,
    w:  axes.w && axes.x,
    n:  axes.h && axes.y,
    s:  axes.h,
    ne: axes.h && axes.y && axes.w,
    nw: axes.h && axes.y && axes.w && axes.x,
    se: axes.h && axes.w,
    sw: axes.h && axes.w && axes.x,
  };
}

function canMove(axes: AxesEditability): boolean {
  return axes.x || axes.y;
}

// =============================================================================
// Element lookup
// =============================================================================

function findElement(definition: SlideDefinition, elementId: string): SlideElement | undefined {
  const { flatMap } = flattenElements(definition.elements);
  return flatMap.get(elementId);
}

function getSceneElement(elementId: string, slideIndex: number): SceneElement | undefined {
  const sk = (window as any).sk;
  return sk?.layouts?.[slideIndex]?.elements?.[elementId];
}

function getAllSceneElements(slideIndex: number): Record<string, SceneElement> {
  const sk = (window as any).sk;
  return sk?.layouts?.[slideIndex]?.elements ?? {};
}

// =============================================================================
// Proxy rectangle
// =============================================================================

function createProxyRect(bounds: Rect): HTMLDivElement {
  const proxy = document.createElement('div');
  proxy.setAttribute('data-sk-debug', 'drag-proxy');
  proxy.style.position = 'absolute';
  proxy.style.left = `${bounds.x}px`;
  proxy.style.top = `${bounds.y}px`;
  proxy.style.width = `${bounds.w}px`;
  proxy.style.height = `${bounds.h}px`;
  proxy.style.border = '2px dashed #4a9eff';
  proxy.style.background = 'rgba(74, 158, 255, 0.1)';
  proxy.style.boxSizing = 'border-box';
  proxy.style.pointerEvents = 'none';
  proxy.style.zIndex = '10001';

  const overlay = debugController.state.debugOverlay;
  if (overlay) overlay.appendChild(proxy);

  return proxy;
}

function updateProxyRect(proxy: HTMLDivElement, rect: Rect): void {
  proxy.style.left = `${rect.x}px`;
  proxy.style.top = `${rect.y}px`;
  proxy.style.width = `${rect.w}px`;
  proxy.style.height = `${rect.h}px`;
}

// =============================================================================
// Resize math
// =============================================================================

function computeNewBounds(
  original: Rect,
  dxSlide: number,
  dySlide: number,
  mode: 'move' | 'resize',
  axes: AxesEditability,
  handlePos?: HandlePosition,
  enableSnap = true,
): Rect {
  let { x, y, w, h } = original;
  const grid = enableSnap ? DEFAULT_SNAP_GRID : 0;

  if (mode === 'move') {
    if (axes.x) {
      x = original.x + dxSlide;
      if (grid) x = snapToGrid(x, grid);
    }
    if (axes.y) {
      y = original.y + dySlide;
      if (grid) y = snapToGrid(y, grid);
    }
  } else if (mode === 'resize' && handlePos) {
    const hasE = handlePos.includes('e');
    const hasW = handlePos.includes('w');
    const hasS = handlePos.includes('s');
    const hasN = handlePos.includes('n');

    // Horizontal
    if (hasE && axes.w) {
      w = Math.max(MIN_ELEMENT_SIZE, original.w + dxSlide);
      if (grid) w = snapToGrid(w, grid);
    }
    if (hasW && axes.w && axes.x) {
      let newW = Math.max(MIN_ELEMENT_SIZE, original.w - dxSlide);
      if (grid) newW = snapToGrid(newW, grid);
      x = original.x + (original.w - newW);
      w = newW;
    }

    // Vertical
    if (hasS && axes.h) {
      h = Math.max(MIN_ELEMENT_SIZE, original.h + dySlide);
      if (grid) h = snapToGrid(h, grid);
    }
    if (hasN && axes.h && axes.y) {
      let newH = Math.max(MIN_ELEMENT_SIZE, original.h - dySlide);
      if (grid) newH = snapToGrid(newH, grid);
      y = original.y + (original.h - newH);
      h = newH;
    }
  }

  // Clamp to slide bounds
  if (x < 0) { if (mode === 'resize') w += x; x = 0; }
  if (y < 0) { if (mode === 'resize') h += y; y = 0; }
  if (x + w > _slideW) w = _slideW - x;
  if (y + h > _slideH) h = _slideH - y;
  w = Math.max(MIN_ELEMENT_SIZE, w);
  h = Math.max(MIN_ELEMENT_SIZE, h);

  return { x, y, w, h };
}

// =============================================================================
// Event handlers — Move
// =============================================================================

function onLayerPointerDown(event: PointerEvent): void {
  // Only primary button
  if (event.button !== 0) return;

  // Already dragging?
  if (_dragState) return;

  const s = debugController.state;
  if (!s.debugOverlay) return;

  // Don't start drag if clicking inside inspector panel
  const target = event.target as HTMLElement;
  if (target?.closest('[data-sk-role="debug-inspector"]')) return;

  // Don't start drag if clicking on a resize handle (those have their own handler)
  if (target?.closest('[data-sk-debug="resize-handle"]')) return;

  // Find the slide element under the pointer
  const skEl = target?.closest('[data-sk-id]');
  if (!skEl) return;

  const elementId = skEl.getAttribute('data-sk-id');
  if (!elementId) return;

  const sceneEl = getSceneElement(elementId, s.currentSlideIndex);
  if (!sceneEl?.resolved) return;

  const axes = getEditableAxes(sceneEl);
  if (!canMove(axes)) {
    // Show not-allowed cursor briefly
    (skEl as HTMLElement).style.cursor = 'not-allowed';
    setTimeout(() => { (skEl as HTMLElement).style.cursor = ''; }, 500);
    return;
  }

  const mapper = getSlideCoordMapper();
  if (!mapper) return;

  // Snapshot authored props from definition
  const sk = (window as any).sk;
  const definition: SlideDefinition | undefined = sk?._definitions?.[s.currentSlideIndex];
  if (!definition) return;

  const defElement = findElement(definition, elementId);
  if (!defElement) return;

  const props = defElement.props as Record<string, unknown>;
  const originalProps: DragState['originalProps'] = {};
  if (axes.x && typeof props.x === 'number') originalProps.x = props.x;
  if (axes.y && typeof props.y === 'number') originalProps.y = props.y;

  _dragState = {
    mode: 'move',
    elementId,
    slideIndex: s.currentSlideIndex,
    pointerId: event.pointerId,
    captureTarget: null,
    startClientX: event.clientX,
    startClientY: event.clientY,
    originalBounds: absoluteBounds(sceneEl, getAllSceneElements(s.currentSlideIndex)),
    originalProps,
    editableAxes: axes,
    mapper,
    dragging: false,
    proxyRect: null,
    rafId: null,
  };

  // Add document-level listeners
  document.addEventListener('pointermove', _onPointerMoveBound);
  document.addEventListener('pointerup', _onPointerUpBound);
  document.addEventListener('pointercancel', _onPointerCancelBound);
  document.addEventListener('keydown', _onKeyDownBound, true);

  event.preventDefault();
}

// =============================================================================
// Event handlers — Resize handles
// =============================================================================

function onHandlePointerDown(event: PointerEvent): void {
  if (event.button !== 0) return;
  if (_dragState) return;

  const handle = (event.target as HTMLElement).closest('[data-sk-handle-pos]');
  if (!handle) return;

  const pos = handle.getAttribute('data-sk-handle-pos') as HandlePosition;
  if (!pos) return;

  const s = debugController.state;
  if (!s.selectedElementId || !s.debugOverlay) return;

  const sceneEl = getSceneElement(s.selectedElementId, s.currentSlideIndex);
  if (!sceneEl?.resolved) return;

  const axes = getEditableAxes(sceneEl);
  const mapper = getSlideCoordMapper();
  if (!mapper) return;

  // Snapshot authored props from definition
  const sk = (window as any).sk;
  const definition: SlideDefinition | undefined = sk?._definitions?.[s.currentSlideIndex];
  if (!definition) return;

  const defElement = findElement(definition, s.selectedElementId);
  if (!defElement) return;

  const props = defElement.props as Record<string, unknown>;
  const originalProps: DragState['originalProps'] = {};
  if (typeof props.x === 'number') originalProps.x = props.x;
  if (typeof props.y === 'number') originalProps.y = props.y;
  if (typeof props.w === 'number') originalProps.w = props.w;
  if (typeof props.h === 'number') originalProps.h = props.h;

  _dragState = {
    mode: 'resize',
    elementId: s.selectedElementId,
    slideIndex: s.currentSlideIndex,
    pointerId: event.pointerId,
    captureTarget: handle as HTMLElement,
    startClientX: event.clientX,
    startClientY: event.clientY,
    originalBounds: absoluteBounds(sceneEl, getAllSceneElements(s.currentSlideIndex)),
    originalProps,
    editableAxes: axes,
    handlePosition: pos,
    mapper,
    dragging: false,
    proxyRect: null,
    rafId: null,
  };

  // Resize handles start dragging immediately (no threshold)
  _dragState.dragging = true;
  _dragState.proxyRect = createProxyRect(absoluteBounds(sceneEl, getAllSceneElements(s.currentSlideIndex)));
  debugController.state.dragInProgress = true;

  try {
    (handle as HTMLElement).setPointerCapture(event.pointerId);
  } catch (_) { /* synthetic events in tests */ }

  document.addEventListener('pointermove', _onPointerMoveBound);
  document.addEventListener('pointerup', _onPointerUpBound);
  document.addEventListener('pointercancel', _onPointerCancelBound);
  document.addEventListener('keydown', _onKeyDownBound, true);

  event.preventDefault();
  event.stopPropagation();
}

// =============================================================================
// Shared pointer move / up / cancel / keydown
// =============================================================================

function onPointerMove(event: PointerEvent): void {
  if (!_dragState) return;

  const dx = event.clientX - _dragState.startClientX;
  const dy = event.clientY - _dragState.startClientY;

  // Threshold check for move mode
  if (!_dragState.dragging) {
    if (Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD) return;

    _dragState.dragging = true;
    debugController.state.dragInProgress = true;
    _dragState.proxyRect = createProxyRect(_dragState.originalBounds);

    // Capture pointer for move drags so events continue if pointer leaves the slide
    const layer = getCurrentLayer();
    if (layer) {
      try {
        layer.setPointerCapture(_dragState.pointerId);
        _dragState.captureTarget = layer;
      } catch (_) { /* synthetic events in tests */ }
    }

    // If this is a move, ensure the element is selected
    const s = debugController.state;
    if (s.selectedElementId !== _dragState.elementId) {
      s.selectedElementId = _dragState.elementId;
      debugController.callbacks.renderElementDetail?.(_dragState.elementId, _dragState.slideIndex);
    }
  }

  // Throttle with rAF — snapshot coords now (event objects may be reused)
  if (_dragState.rafId !== null) return;

  const clientX = event.clientX;
  const clientY = event.clientY;

  const shiftKey = event.shiftKey;

  _dragState.rafId = requestAnimationFrame(() => {
    if (!_dragState || !_dragState.proxyRect) return;
    _dragState.rafId = null;

    const dxSlide = (clientX - _dragState.startClientX) * _dragState.mapper.scaleX;
    const dySlide = (clientY - _dragState.startClientY) * _dragState.mapper.scaleY;

    const newBounds = computeNewBounds(
      _dragState.originalBounds,
      dxSlide,
      dySlide,
      _dragState.mode,
      _dragState.editableAxes,
      _dragState.handlePosition,
      !shiftKey,  // snap enabled unless Shift held
    );

    updateProxyRect(_dragState.proxyRect, newBounds);
  });
}

async function onPointerUp(event: PointerEvent): Promise<void> {
  if (!_dragState) return;

  removeDocumentListeners();

  if (_dragState.rafId !== null) {
    cancelAnimationFrame(_dragState.rafId);
  }

  if (!_dragState.dragging) {
    // Threshold never exceeded — let click handler process normally
    _dragState = null;
    return;
  }

  // Compute final bounds
  const dx = (event.clientX - _dragState.startClientX) * _dragState.mapper.scaleX;
  const dy = (event.clientY - _dragState.startClientY) * _dragState.mapper.scaleY;

  const finalBounds = computeNewBounds(
    _dragState.originalBounds,
    dx, dy,
    _dragState.mode,
    _dragState.editableAxes,
    _dragState.handlePosition,
    !event.shiftKey,  // snap enabled unless Shift held
  );

  // Remove proxy
  if (_dragState.proxyRect?.parentNode) {
    _dragState.proxyRect.parentNode.removeChild(_dragState.proxyRect);
  }

  // Suppress click handler — clear on next frame
  debugController.state.dragInProgress = true;

  const state = _dragState;
  _dragState = null;

  // Commit (awaited so overlay refresh completes before next interaction)
  await commitDrag(state, finalBounds);

  requestAnimationFrame(() => {
    debugController.state.dragInProgress = false;
  });
}

function onPointerCancel(_event: PointerEvent): void {
  cancelDrag();
}

function onKeyDown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && _dragState) {
    event.preventDefault();
    event.stopPropagation();
    cancelDrag();
  }
}

// =============================================================================
// Commit
// =============================================================================

async function commitDrag(state: DragState, finalBounds: Rect): Promise<void> {
  const { elementId, slideIndex, originalBounds, originalProps, editableAxes } = state;

  // Determine what changed
  const changes: Array<{ propKey: string; oldValue: number; newValue: number }> = [];

  // Apply delta to original authored props (not final resolved bounds) so
  // non-tl anchors are handled correctly — props.x/y are anchor-relative.
  if (editableAxes.x && Math.round(finalBounds.x) !== Math.round(originalBounds.x) && originalProps.x !== undefined) {
    const dx = finalBounds.x - originalBounds.x;
    changes.push({ propKey: 'x', oldValue: originalProps.x, newValue: Math.round(originalProps.x + dx) });
  }
  if (editableAxes.y && Math.round(finalBounds.y) !== Math.round(originalBounds.y) && originalProps.y !== undefined) {
    const dy = finalBounds.y - originalBounds.y;
    changes.push({ propKey: 'y', oldValue: originalProps.y, newValue: Math.round(originalProps.y + dy) });
  }
  if (editableAxes.w && Math.round(finalBounds.w) !== Math.round(originalBounds.w) && originalProps.w !== undefined) {
    changes.push({ propKey: 'w', oldValue: originalProps.w, newValue: Math.round(finalBounds.w) });
  }
  if (editableAxes.h && Math.round(finalBounds.h) !== Math.round(originalBounds.h) && originalProps.h !== undefined) {
    changes.push({ propKey: 'h', oldValue: originalProps.h, newValue: Math.round(finalBounds.h) });
  }

  if (changes.length === 0) return;

  // Batch-mutate definition
  const sk = (window as any).sk;
  const definition: SlideDefinition | undefined = sk?._definitions?.[slideIndex];
  if (!definition) return;
  const element = findElement(definition, elementId);
  if (!element) return;

  const props = element.props as Record<string, unknown>;
  for (const { propKey, newValue } of changes) {
    props[propKey] = newValue;
  }

  // Single re-render
  const rerender = sk._rerenderSlide as (i: number, d: SlideDefinition) => Promise<LayoutResult>;
  if (rerender) {
    await rerender(slideIndex, definition);
  }

  // Push undo entries
  const s = debugController.state;
  for (const { propKey, oldValue, newValue } of changes) {
    s.undoStack.push({ elementId, propKey, oldValue, newValue, slideIndex });
  }
  s.redoStack.length = 0;

  updateDiffDirtyIndicator();

  // Refresh overlay and inspector
  debugController.callbacks.refreshOverlayOnly?.(slideIndex);
  if (s.selectedElementId === elementId) {
    debugController.callbacks.renderElementDetail?.(elementId, slideIndex);
  }
}

// =============================================================================
// Cancel / cleanup
// =============================================================================

function cancelDrag(): void {
  if (!_dragState) return;

  removeDocumentListeners();

  if (_dragState.rafId !== null) {
    cancelAnimationFrame(_dragState.rafId);
  }

  if (_dragState.proxyRect?.parentNode) {
    _dragState.proxyRect.parentNode.removeChild(_dragState.proxyRect);
  }

  _dragState = null;
  debugController.state.dragInProgress = false;
}

function removeDocumentListeners(): void {
  document.removeEventListener('pointermove', _onPointerMoveBound);
  document.removeEventListener('pointerup', _onPointerUpBound);
  document.removeEventListener('pointercancel', _onPointerCancelBound);
  document.removeEventListener('keydown', _onKeyDownBound, true);
}

// =============================================================================
// Resize handles rendering
// =============================================================================

const HANDLE_POSITIONS: HandlePosition[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

const HANDLE_CURSORS: Record<HandlePosition, string> = {
  n: 'ns-resize', s: 'ns-resize',
  e: 'ew-resize', w: 'ew-resize',
  ne: 'nesw-resize', sw: 'nesw-resize',
  nw: 'nwse-resize', se: 'nwse-resize',
};

function getHandlePositionCoords(r: Rect, pos: HandlePosition): { left: number; top: number } {
  const half = HANDLE_SIZE / 2;
  switch (pos) {
    case 'n':  return { left: r.x + r.w / 2 - half, top: r.y - half };
    case 's':  return { left: r.x + r.w / 2 - half, top: r.y + r.h - half };
    case 'e':  return { left: r.x + r.w - half,      top: r.y + r.h / 2 - half };
    case 'w':  return { left: r.x - half,             top: r.y + r.h / 2 - half };
    case 'ne': return { left: r.x + r.w - half,      top: r.y - half };
    case 'nw': return { left: r.x - half,             top: r.y - half };
    case 'se': return { left: r.x + r.w - half,      top: r.y + r.h - half };
    case 'sw': return { left: r.x - half,             top: r.y + r.h - half };
  }
}

export function renderResizeHandles(elementId: string, slideIndex: number): void {
  removeResizeHandles();

  const s = debugController.state;
  if (!s.debugOverlay) return;

  const sceneEl = getSceneElement(elementId, slideIndex);
  if (!sceneEl?.resolved) return;

  const axes = getEditableAxes(sceneEl);
  const eligibility = getHandleEligibility(axes);
  const r = absoluteBounds(sceneEl, getAllSceneElements(slideIndex));

  for (const pos of HANDLE_POSITIONS) {
    const eligible = eligibility[pos];
    const { left, top } = getHandlePositionCoords(r, pos);

    const handle = document.createElement('div');
    handle.setAttribute('data-sk-debug', 'resize-handle');
    handle.setAttribute('data-sk-handle-pos', pos);
    handle.style.position = 'absolute';
    handle.style.left = `${left}px`;
    handle.style.top = `${top}px`;
    handle.style.width = `${HANDLE_SIZE}px`;
    handle.style.height = `${HANDLE_SIZE}px`;
    handle.style.boxSizing = 'border-box';
    handle.style.zIndex = '10002';
    handle.style.pointerEvents = 'auto';

    if (eligible) {
      handle.style.background = '#fff';
      handle.style.border = '1px solid #4a9eff';
      handle.style.cursor = HANDLE_CURSORS[pos];
      handle.addEventListener('pointerdown', onHandlePointerDown);
    } else {
      handle.style.background = '#ccc';
      handle.style.border = '1px solid #999';
      handle.style.cursor = 'not-allowed';
      handle.style.opacity = '0.5';
    }

    s.debugOverlay.appendChild(handle);
  }
}

export function removeResizeHandles(): void {
  const s = debugController.state;
  if (!s.debugOverlay) return;
  const handles = s.debugOverlay.querySelectorAll('[data-sk-debug="resize-handle"]');
  handles.forEach(h => h.remove());
}

// =============================================================================
// Lifecycle — called from debug.ts
// =============================================================================

export function attachDragHandlers(): void {
  const s = debugController.state;
  _currentSlideIndex = s.currentSlideIndex;

  // Read slide dimensions
  const sk = (window as any).sk;
  _slideW = sk?._config?.slide?.w ?? 1920;
  _slideH = sk?._config?.slide?.h ?? 1080;

  reattachLayerListener();
}

/**
 * (Re-)attach the pointerdown listener to the current .slidekit-layer.
 * Must be called after rerenderSlide() replaces the layer DOM element.
 */
function reattachLayerListener(): void {
  // Detach from old layer (if any — it may be detached from DOM already,
  // but removeEventListener on a detached node is harmless)
  detachLayerListener();

  const layer = getCurrentLayer();
  if (!layer) return;

  layer.addEventListener('pointerdown', onLayerPointerDown as EventListener);
  _layerListenerAttached = true;
}

function detachLayerListener(): void {
  if (!_layerListenerAttached) return;
  // Remove from ALL layers in case the element was replaced
  const layers = document.querySelectorAll('.slidekit-layer');
  for (const layer of layers) {
    layer.removeEventListener('pointerdown', onLayerPointerDown as EventListener);
  }
  _layerListenerAttached = false;
}

export function detachDragHandlers(): void {
  detachLayerListener();
  cancelDrag();
  removeResizeHandles();
}

export function refreshDragState(slideIndex: number): void {
  _currentSlideIndex = slideIndex;
  // The layer DOM may have been replaced by rerenderSlide — re-attach
  reattachLayerListener();
  // Re-render resize handles for selected element
  const s = debugController.state;
  if (s.selectedElementId) {
    renderResizeHandles(s.selectedElementId, slideIndex);
  }
}

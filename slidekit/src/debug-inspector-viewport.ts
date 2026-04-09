// Debug Inspector — Viewport adjustment and resize handle
//
// Manages shrinking the slide viewport when the inspector panel opens,
// and the draggable resize handle on the panel's left edge.

import { debugController } from './debug-state.js';

// =============================================================================
// Viewport Adjustment
// =============================================================================

/** Shrink the slide viewport to make room for the inspector panel.
 *
 *  Strategy for Reveal.js: switch to `embedded` mode so Reveal reads
 *  the `.reveal` container dimensions instead of forcing them to
 *  `window.innerWidth`.  Width is set BEFORE `configure()` so that
 *  Reveal's internal layout() call already sees the reduced container.
 */
export function adjustViewport(panelWidth: number): void {
  const s = debugController.state;

  // Try Reveal.js path first
  if (!s.revealContainer) {
    s.revealContainer = document.querySelector('.reveal') as HTMLElement | null;
  }

  if (s.revealContainer) {
     
    const Reveal = (window as any).Reveal;

    // Set width FIRST so any subsequent layout() reads the reduced size
    s.revealContainer.style.width = `calc(100vw - ${panelWidth}px)`;
    s.revealContainer.style.height = '100vh';

    if (Reveal) {
      if (!s.wasEmbedded && typeof Reveal.configure === 'function') {
        // First call: switch to embedded mode.  configure() triggers
        // layout() internally which will now see our reduced width.
        s.wasEmbedded = true;
        Reveal.configure({ embedded: true });
      } else if (typeof Reveal.layout === 'function') {
        // Subsequent calls (drag resize): just re-layout
        Reveal.layout();
      }
    }
    return;
  }

  // Fallback for non-Reveal.js contexts: scale .slidekit-layer
  const layer = document.querySelector('.slidekit-layer') as HTMLElement | null;
  if (layer) {
    const viewportWidth = window.innerWidth;
    const sk = window.sk;
    const slideW = sk?._config?.slide?.w ?? 1920;
    const factor = (viewportWidth - panelWidth) / slideW;
    layer.style.transform = `scale(${factor})`;
    layer.style.transformOrigin = 'top left';
  }
}

/** Restore the slide viewport to full width. */
export function resetViewport(): void {
  const s = debugController.state;

  if (s.revealContainer) {
    s.revealContainer.style.width = '';
    s.revealContainer.style.height = '';

     
    const Reveal = (window as any).Reveal;

    if (s.wasEmbedded && Reveal && typeof Reveal.configure === 'function') {
      // Restore non-embedded mode.  configure() triggers layout()
      // internally which will re-adopt full-viewport sizing.
      s.wasEmbedded = false;
      Reveal.configure({ embedded: false });
    } else if (Reveal && typeof Reveal.layout === 'function') {
      Reveal.layout();
    }

    s.revealContainer = null;
    return;
  }

  // Fallback cleanup
  const layer = document.querySelector('.slidekit-layer') as HTMLElement | null;
  if (layer) {
    layer.style.transform = '';
    layer.style.transformOrigin = '';
  }
}

// =============================================================================
// Resize Handle
// =============================================================================

/** Handle pointer-move during drag resize. */
function onResizeMove(event: PointerEvent): void {
  const s = debugController.state;
  if (!s.resizeState?.active) return;
  const newWidth = Math.min(600, Math.max(200, s.resizeState.startWidth + (s.resizeState.startX - event.clientX)));
  s.panelWidth = newWidth;
  if (s.inspectorPanel) {
    s.inspectorPanel.style.width = `${newWidth}px`;
  }
  adjustViewport(newWidth);
}

/** Handle pointer-up to end drag resize. */
function onResizeUp(_event: PointerEvent): void {
  const s = debugController.state;
  if (!s.resizeState?.active) return;
  s.resizeState = null;
  document.removeEventListener('pointermove', onResizeMove);
  document.removeEventListener('pointerup', onResizeUp);
}

/** Create the drag handle element for the left edge of the panel. */
export function createResizeHandle(): HTMLDivElement {
  const s = debugController.state;

  const handle = document.createElement('div');
  handle.setAttribute('data-sk-role', 'debug-inspector-handle');
  handle.style.position = 'absolute';
  handle.style.left = '0';
  handle.style.top = '0';
  handle.style.width = '6px';
  handle.style.height = '100%';
  handle.style.cursor = 'col-resize';
  handle.style.zIndex = '1';
  handle.style.display = 'flex';
  handle.style.alignItems = 'center';
  handle.style.justifyContent = 'center';

  // Grip indicator (subtle dots)
  const grip = document.createElement('div');
  grip.style.width = '2px';
  grip.style.height = '32px';
  grip.style.borderRadius = '1px';
  grip.style.background = 'rgba(0,0,0,0.18)';
  handle.appendChild(grip);

  handle.addEventListener('pointerdown', (event: PointerEvent) => {
    event.preventDefault();
    try { handle.setPointerCapture(event.pointerId); } catch (_e) { /* synthetic events */ }
    s.resizeState = { active: true, startX: event.clientX, startWidth: s.panelWidth };
    document.addEventListener('pointermove', onResizeMove);
    document.addEventListener('pointerup', onResizeUp);
  });

  return handle;
}

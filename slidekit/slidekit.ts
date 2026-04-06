// SlideKit — Coordinate-Based Slide Layout Library
// ES Module — all exports are named

// Re-exports — barrel file exposing all public API from src/ modules
export { VERSION } from './src/version.js';
export { resetIdCounter } from './src/id.js';
export { el, group, vstack, hstack, cardGrid } from './src/elements.js';
export { VALID_ANCHORS, resolveAnchor } from './src/anchor.js';
export { filterStyle, resolveShadow, getShadowPresets } from './src/style.js';
export { getSpacing } from './src/spacing.js';
export { init, safeRect, splitRect, getConfig, isFontLoaded, getFontWarnings, checkVersionCompatibility, _resetForTests } from './src/config.js';
export { clearMeasureCache, measure } from './src/measure.js';
export { below, above, rightOf, leftOf, centerVWith, centerHWith, alignTopWith, alignBottomWith, alignLeftWith, alignRightWith, centerIn, between, matchWidthOf, matchHeightOf, centerHOnSlide, centerVOnSlide, matchMaxWidth, matchMaxHeight } from './src/relative.js';
export { alignLeft, alignRight, alignTop, alignBottom, alignCenterH, alignCenterV, distributeH, distributeV, equalizeWidth, equalizeHeight, matchWidth, matchHeight, matchSize, fitToRect } from './src/transforms.js';
export { render, computeZOrder, applyStyleToDOM, applySlideBackground, renderElementFromScene, rerenderSlide } from './src/renderer.js';
export { connect, panel, getAnchorPoint } from './src/compounds.js';
export { routeConnector } from './src/connectorRouting.js';
export { grid, snap, resolvePercentage, repeat, rotatedAABB } from './src/utilities.js';
export { layout } from './src/layout.js';
export { lintSlide, lintDeck } from './src/lint.js';
export {
  renderDebugOverlay, removeDebugOverlay, isDebugOverlayVisible,
  toggleDebugOverlay, cycleDebugMode, getDebugMode,
  enableKeyboardToggle, disableKeyboardToggle, _resetDebugForTests,
  refreshOverlayOnly,
  undo, redo, isEditableGap, getEnumOptions, isGapProp,
} from './src/debug.js';
export type { DebugOverlayOptions } from './src/debug.js';

// Local imports for namespace object and renderer wiring
import { routeConnector } from './src/connectorRouting.js';
import { layout } from './src/layout.js';
import { _setLayoutFn } from './src/renderer.js';
import { el, group, vstack, hstack, cardGrid } from './src/elements.js';
import { resolveAnchor } from './src/anchor.js';
import { filterStyle, resolveShadow, getShadowPresets } from './src/style.js';
import { init, safeRect, splitRect, getConfig, isFontLoaded, getFontWarnings, checkVersionCompatibility, _resetForTests } from './src/config.js';
import { resetIdCounter } from './src/id.js';
import { measure, clearMeasureCache } from './src/measure.js';
import { below, above, rightOf, leftOf, centerVWith, centerHWith, alignTopWith, alignBottomWith, alignLeftWith, alignRightWith, centerIn, between, matchWidthOf, matchHeightOf, centerHOnSlide, centerVOnSlide, matchMaxWidth, matchMaxHeight } from './src/relative.js';
import { alignLeft, alignRight, alignTop, alignBottom, alignCenterH, alignCenterV, distributeH, distributeV, equalizeWidth, equalizeHeight, matchWidth, matchHeight, matchSize, fitToRect } from './src/transforms.js';
import { render } from './src/renderer.js';
import { connect, panel, getAnchorPoint } from './src/compounds.js';
import { grid, snap, repeat, resolvePercentage, rotatedAABB } from './src/utilities.js';
import { lintSlide, lintDeck } from './src/lint.js';
import { VERSION } from './src/version.js';
import {
  renderDebugOverlay, removeDebugOverlay, isDebugOverlayVisible,
  toggleDebugOverlay, cycleDebugMode, getDebugMode,
  enableKeyboardToggle, disableKeyboardToggle, _resetDebugForTests,
  refreshOverlayOnly,
  undo, redo, isEditableGap, getEnumOptions, isGapProp,
} from './src/debug.js';

// Inject layout function into renderer (avoids circular import)
_setLayoutFn(layout);

// Auto-enable Ctrl+. keyboard toggle for the debug inspector.
// Deferred to avoid interfering with test runners and SSR.
if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  // Use setTimeout to defer past any synchronous initialization
  setTimeout(() => { enableKeyboardToggle(); }, 0);
}

// =============================================================================
// Namespace Export (for convenient SlideKit.* usage)
// =============================================================================

const SlideKit = {
  VERSION,
  el,
  group,
  resolveAnchor,
  filterStyle,
  render,
  init,
  safeRect,
  splitRect,
  getConfig,
  resetIdCounter,
  measure,
  clearMeasureCache,
  isFontLoaded,
  getFontWarnings,
  checkVersionCompatibility,
  _resetForTests,
  // Layout solve and relative positioning
  layout,
  below,
  above,
  rightOf,
  leftOf,
  centerVWith,
  centerHWith,
  alignTopWith,
  alignBottomWith,
  alignLeftWith,
  alignRightWith,
  centerIn,
  between,
  matchWidthOf,
  matchHeightOf,
  centerHOnSlide,
  centerVOnSlide,
  matchMaxWidth,
  matchMaxHeight,
  // Stack primitives
  vstack,
  hstack,
  cardGrid,
  // Alignment, distribution, size matching transforms
  alignLeft,
  alignRight,
  alignTop,
  alignBottom,
  alignCenterH,
  alignCenterV,
  distributeH,
  distributeV,
  equalizeWidth,
  equalizeHeight,
  matchWidth,
  matchHeight,
  matchSize,
  fitToRect,
  // Compound primitives
  connect,
  panel,
  getAnchorPoint,
  routeConnector,
  // Utilities
  grid,
  snap,
  repeat,
  resolvePercentage,
  resolveShadow,
  getShadowPresets,
  rotatedAABB,
  lintSlide,
  lintDeck,
  // Debug overlay & inspector
  renderDebugOverlay,
  removeDebugOverlay,
  isDebugOverlayVisible,
  toggleDebugOverlay,
  cycleDebugMode,
  getDebugMode,
  enableKeyboardToggle,
  disableKeyboardToggle,
  _resetDebugForTests,
  refreshOverlayOnly,
  undo,
  redo,
  isEditableGap,
  getEnumOptions,
  isGapProp,
};

export default SlideKit;

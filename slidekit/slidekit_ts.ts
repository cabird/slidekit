// SlideKit — Coordinate-Based Slide Layout Library
// ES Module — all exports are named

// Re-exports — barrel file exposing all public API from src_ts/ modules
export { resetIdCounter } from './src_ts/id.js';
export { el, group, vstack, hstack, cardGrid } from './src_ts/elements.js';
export { VALID_ANCHORS, resolveAnchor } from './src_ts/anchor.js';
export { filterStyle, resolveShadow, getShadowPresets } from './src_ts/style.js';
export { getSpacing } from './src_ts/spacing.js';
export { init, safeRect, splitRect, getConfig, isFontLoaded, getFontWarnings, _resetForTests } from './src_ts/config.js';
export { clearMeasureCache, measure } from './src_ts/measure.js';
export { below, above, rightOf, leftOf, centerVWith, centerHWith, alignTopWith, alignBottomWith, alignLeftWith, alignRightWith, centerIn, placeBetween } from './src_ts/relative.js';
export { alignLeft, alignRight, alignTop, alignBottom, alignCenterH, alignCenterV, distributeH, distributeV, matchWidth, matchHeight, matchSize, fitToRect } from './src_ts/transforms.js';
export { render, computeZOrder, applyStyleToDOM, applySlideBackground, renderElementFromScene } from './src_ts/renderer.js';
export { connect, panel, figure } from './src_ts/compounds.js';
export { grid, snap, resolvePercentage, repeat, rotatedAABB } from './src_ts/utilities.js';
export { layout, getEffectiveDimensions } from './src_ts/layout.js';
export { lintSlide, lintDeck } from './src_ts/lint.js';

// Local imports for namespace object and renderer wiring
import { layout } from './src_ts/layout.js';
import { _setLayoutFn } from './src_ts/renderer.js';
import { el, group, vstack, hstack } from './src_ts/elements.js';
import { resolveAnchor } from './src_ts/anchor.js';
import { filterStyle, resolveShadow, getShadowPresets } from './src_ts/style.js';
import { init, safeRect, getConfig, isFontLoaded, getFontWarnings, _resetForTests } from './src_ts/config.js';
import { resetIdCounter } from './src_ts/id.js';
import { measure, clearMeasureCache } from './src_ts/measure.js';
import { below, above, rightOf, leftOf, centerVWith, centerHWith, alignTopWith, alignBottomWith, alignLeftWith, alignRightWith, centerIn } from './src_ts/relative.js';
import { alignLeft, alignRight, alignTop, alignBottom, alignCenterH, alignCenterV, distributeH, distributeV, matchWidth, matchHeight, matchSize, fitToRect } from './src_ts/transforms.js';
import { render } from './src_ts/renderer.js';
import { connect, panel, figure } from './src_ts/compounds.js';
import { grid, snap, repeat, resolvePercentage, rotatedAABB } from './src_ts/utilities.js';
import { lintSlide, lintDeck } from './src_ts/lint.js';

// Inject layout function into renderer (avoids circular import)
_setLayoutFn(layout);

// =============================================================================
// Namespace Export (for convenient SlideKit.* usage)
// =============================================================================

const SlideKit = {
  el,
  group,
  resolveAnchor,
  filterStyle,
  render,
  init,
  safeRect,
  getConfig,
  resetIdCounter,
  measure,
  clearMeasureCache,
  isFontLoaded,
  getFontWarnings,
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
  // Stack primitives
  vstack,
  hstack,
  // Alignment, distribution, size matching transforms
  alignLeft,
  alignRight,
  alignTop,
  alignBottom,
  alignCenterH,
  alignCenterV,
  distributeH,
  distributeV,
  matchWidth,
  matchHeight,
  matchSize,
  fitToRect,
  // Compound primitives
  connect,
  panel,
  figure,
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
};

export default SlideKit;

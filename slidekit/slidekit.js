// SlideKit — Coordinate-Based Slide Layout Library
// ES Module — all exports are named

// Re-exports — barrel file exposing all public API from src/ modules
export { resetIdCounter } from './src/id.js';
export { el, group, vstack, hstack, cardGrid } from './src/elements.js';
export { VALID_ANCHORS, resolveAnchor } from './src/anchor.js';
export { filterStyle, resolveShadow, getShadowPresets } from './src/style.js';
export { getSpacing } from './src/spacing.js';
export { init, safeRect, splitRect, getConfig, isFontLoaded, getFontWarnings, _resetForTests } from './src/config.js';
export { clearMeasureCache, measure } from './src/measure.js';
export { below, above, rightOf, leftOf, centerVWith, centerHWith, alignTopWith, alignBottomWith, alignLeftWith, alignRightWith, centerIn, placeBetween } from './src/relative.js';
export { alignLeft, alignRight, alignTop, alignBottom, alignCenterH, alignCenterV, distributeH, distributeV, matchWidth, matchHeight, matchSize, fitToRect } from './src/transforms.js';
export { render, computeZOrder, applyStyleToDOM, applySlideBackground, renderElementFromScene } from './src/renderer.js';
export { connect, panel, figure } from './src/compounds.js';
export { grid, snap, resolvePercentage, repeat, rotatedAABB } from './src/utilities.js';
export { layout, getEffectiveDimensions } from './src/layout.js';

// Local imports for namespace object and renderer wiring
import { layout } from './src/layout.js';
import { _setLayoutFn } from './src/renderer.js';
import { el, group, vstack, hstack } from './src/elements.js';
import { resolveAnchor } from './src/anchor.js';
import { filterStyle, resolveShadow, getShadowPresets } from './src/style.js';
import { init, safeRect, getConfig, isFontLoaded, getFontWarnings, _resetForTests } from './src/config.js';
import { resetIdCounter } from './src/id.js';
import { measure, clearMeasureCache } from './src/measure.js';
import { below, above, rightOf, leftOf, centerVWith, centerHWith, alignTopWith, alignBottomWith, alignLeftWith, alignRightWith, centerIn } from './src/relative.js';
import { alignLeft, alignRight, alignTop, alignBottom, alignCenterH, alignCenterV, distributeH, distributeV, matchWidth, matchHeight, matchSize, fitToRect } from './src/transforms.js';
import { render } from './src/renderer.js';
import { connect, panel, figure } from './src/compounds.js';
import { grid, snap, repeat, resolvePercentage, rotatedAABB } from './src/utilities.js';

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
};

export default SlideKit;

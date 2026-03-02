// SlideKit — Centralized mutable state
// Single exported state object replaces individual exports.

import type { SlideKitState } from './types.js';

export const state: SlideKitState = {
  idCounter: 0,
  config: null,
  safeRectCache: null,
  loadedFonts: new Set(),
  measureContainer: null,
  measureCache: new Map(),
  fontWarnings: [],
  injectedFontLinks: new Set(),
  transformIdCounter: 0,
};

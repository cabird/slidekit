// SlideKit — Centralized mutable state
// All module-scope `let` variables are exported here with setter functions
// so that ES module live bindings work correctly.

export let _idCounter = 0;
export function set_idCounter(v) { _idCounter = v; }

export let _config = null;
export function set_config(v) { _config = v; }

export let _safeRectCache = null;
export function set_safeRectCache(v) { _safeRectCache = v; }

export let _loadedFonts = new Set();
export function set_loadedFonts(v) { _loadedFonts = v; }

export let _measureContainer = null;
export function set_measureContainer(v) { _measureContainer = v; }

export let _measureCache = new Map();
export function set_measureCache(v) { _measureCache = v; }

export let _fontWarnings = [];
export function set_fontWarnings(v) { _fontWarnings = v; }

export let _injectedFontLinks = new Set();
export function set_injectedFontLinks(v) { _injectedFontLinks = v; }

export let _transformIdCounter = 0;
export function set_transformIdCounter(v) { _transformIdCounter = v; }

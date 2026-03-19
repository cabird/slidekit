// SlideKit — Init Function & Configuration (M1.5)
// Extracted from slidekit.js

import { state } from './state.js';

import { DEFAULT_SPACING, resolveSpacing } from './spacing.js';
import { resetIdCounter } from './id.js';
import { VERSION } from './version.js';
import type { SlideKitConfig, FontDef, Rect } from './types.js';

/**
 * Partial init configuration accepted by init().
 * All fields are optional; unspecified fields get defaults.
 */
interface InitConfig {
  slide?: { w?: number; h?: number };
  safeZone?: { left?: number; right?: number; top?: number; bottom?: number };
  strict?: boolean;
  minFontSize?: number;
  fonts?: FontDef[];
  spacing?: Record<string, number>;
  /** Minimum compatible SlideKit version (semver string, e.g. "0.2.0"). */
  minVersion?: string;
  /** Debug / inspector options. */
  debug?: {
    /** Hint for LLM diff output indicating where the slide source code lives (e.g. "test_dir_1/slides.js"). */
    sourceHint?: string;
  };
}

/**
 * Result of a version compatibility check.
 */
export interface VersionCheckResult {
  ok: boolean;
  warning?: string;
  error?: string;
}

/**
 * Parse a semver string into its numeric components.
 * Returns { major, minor, patch } or null if parsing fails.
 */
function parseSemver(v: string): { major: number; minor: number; patch: number } | null {
  const m = /^(\d+)\.(\d+)\.(\d+)/.exec(v);
  if (!m) return null;
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]) };
}

/**
 * Check whether the current SlideKit version is compatible with a
 * requested minimum version.
 *
 * **Compatibility rules:**
 * - Versions 0.x and 1.x are treated as the SAME compatibility group
 *   (pre-1.0 is development, 1.0 is "this is stable now" -- not a breaking change).
 * - From 2.0 onward, major version must match (2.x -> 3.0 is breaking).
 * - Within any major version, minor bumps only add features -- always backward compatible.
 * - If the current minor is lower than the requested minVersion's minor, warn (missing features).
 *
 * @param minVersion - The minimum version required (semver string)
 * @param currentVersion - The currently loaded version (semver string)
 * @returns { ok, warning?, error? }
 */
export function checkVersionCompatibility(minVersion: string, currentVersion: string): VersionCheckResult {
  const min = parseSemver(minVersion);
  const cur = parseSemver(currentVersion);

  if (!min) {
    return { ok: false, error: `Invalid minVersion format: "${minVersion}" (expected semver like "1.2.3")` };
  }
  if (!cur) {
    return { ok: false, error: `Invalid current version format: "${currentVersion}" (expected semver like "1.2.3")` };
  }

  // 0.x and 1.x compatibility group
  if (min.major <= 1 && cur.major <= 1) {
    if (min.major === cur.major) {
      // Same major within the group: check minor
      if (cur.minor < min.minor) {
        return {
          ok: true,
          warning: `SlideKit ${currentVersion} may be missing features from minVersion ${minVersion}. See docs/MIGRATION.md for details on what changed between versions.`,
        };
      }
      return { ok: true };
    }
    // Cross-major within the group (0.x <-> 1.x)
    if (cur.major > min.major) {
      // Current is 1.x, min is 0.x -- 1.x is a superset, always ok
      return { ok: true };
    }
    // Current is 0.x, min is 1.x -- current may be missing features
    return {
      ok: true,
      warning: `SlideKit ${currentVersion} may be missing features from minVersion ${minVersion}. See docs/MIGRATION.md for details on what changed between versions.`,
    };
  }

  // 2.0+ era: major must match
  if (cur.major !== min.major) {
    return {
      ok: false,
      error: `SlideKit ${currentVersion} is not compatible with minVersion ${minVersion} (major version mismatch). See docs/MIGRATION.md for upgrade guidance — an AI agent can use this guide to automatically update your presentation code.`,
    };
  }

  // Same major (>= 2): check minor
  if (cur.minor < min.minor) {
    return {
      ok: true,
      warning: `SlideKit ${currentVersion} may be missing features from minVersion ${minVersion}. See docs/MIGRATION.md for details on what changed between versions.`,
    };
  }

  return { ok: true };
}

/**
 * Default configuration values.
 */
export const DEFAULT_CONFIG: SlideKitConfig = {
  slide: { w: 1920, h: 1080 },
  safeZone: { left: 120, right: 120, top: 90, bottom: 90 },
  strict: false,
  minFontSize: 24,
  fonts: [],
  spacing: { ...DEFAULT_SPACING },
};

/**
 * Initialize SlideKit with configuration.
 *
 * @param config - Configuration object
 * @returns Resolves with the config when ready
 */
export async function init(config: InitConfig = {}): Promise<SlideKitConfig> {
  // Version compatibility check (before any other processing)
  if (config.minVersion) {
    const compat = checkVersionCompatibility(config.minVersion, VERSION);
    if (compat.error) {
      throw new Error(compat.error);
    }
    if (compat.warning) {
      console.warn(compat.warning);
    }
  }

  const resolved: SlideKitConfig = {
    slide: { ...DEFAULT_CONFIG.slide, ...(config.slide || {}) },
    safeZone: { ...DEFAULT_CONFIG.safeZone, ...(config.safeZone || {}) },
    strict: config.strict !== undefined ? config.strict : DEFAULT_CONFIG.strict,
    minFontSize: config.minFontSize !== undefined ? config.minFontSize : DEFAULT_CONFIG.minFontSize,
    fonts: config.fonts || DEFAULT_CONFIG.fonts,
    spacing: { ...DEFAULT_SPACING, ...(config.spacing || {}) },
    ...(config.debug ? { debug: { ...config.debug } } : {}),
  };
  state.config = resolved;

  // Compute and cache the safe rectangle
  const sz = resolved.safeZone;
  const sl = resolved.slide;
  const safeW = sl.w - sz.left - sz.right;
  const safeH = sl.h - sz.top - sz.bottom;
  if (safeW <= 0 || safeH <= 0) {
    throw new Error(
      `Invalid safeZone configuration: computed safe rect is ${safeW}x${safeH}. ` +
      `Check slide dimensions (${sl.w}x${sl.h}) and safeZone margins.`
    );
  }
  state.safeRectCache = {
    x: sz.left,
    y: sz.top,
    w: safeW,
    h: safeH,
  };

  // Reset font state
  state.loadedFonts = new Set();
  state.fontWarnings = [];
  state.measureCache = new Map();

  // M2.1: Font Preloading
  if (resolved.fonts.length > 0) {
    await _loadFonts(resolved.fonts);
  }

  return resolved;
}

/**
 * Load fonts specified in the config.
 *
 * For Google Fonts: dynamically inject <link> elements.
 * For each font/weight combo: call document.fonts.load().
 * Wait for document.fonts.ready.
 * Timeout: 5s per font -- emit warning and fall back on failure.
 *
 * @param fonts - Array of { family, weights, source }
 */
async function _loadFonts(fonts: FontDef[]): Promise<void> {
  const FONT_TIMEOUT_MS = 5000;
  const testString = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  // Step 1: Inject Google Font <link> elements for fonts with source: "google"
  for (const fontDef of fonts) {
    if (fontDef.source === "google") {
      _injectGoogleFontLink(fontDef);
    }
  }

  // Step 2: For each font/weight combination, try to load it with a timeout
  const loadPromises: Promise<void>[] = [];
  for (const fontDef of fonts) {
    const family = fontDef.family;
    const weights = fontDef.weights || [400];

    for (const weight of weights) {
      const fontString = `${weight} 16px "${family}"`;
      const key = `${family}:${weight}`;

      const loadPromise = _loadSingleFont(fontString, key, testString, FONT_TIMEOUT_MS);
      loadPromises.push(loadPromise);
    }
  }

  // Wait for all font load attempts to complete (they won't reject -- failures are warnings)
  await Promise.all(loadPromises);

  // Step 3: Also wait for document.fonts.ready for any other fonts
  try {
    await document.fonts.ready;
  } catch (e) {
    // document.fonts.ready failing is non-fatal
  }
}

/**
 * Attempt to load a single font with a timeout.
 *
 * @param fontString - CSS font shorthand, e.g. "700 16px \"Space Grotesk\""
 * @param key - Font tracking key, e.g. "Space Grotesk:700"
 * @param testString - String to use for font loading test
 * @param timeoutMs - Timeout in milliseconds
 */
async function _loadSingleFont(
  fontString: string,
  key: string,
  testString: string,
  timeoutMs: number,
): Promise<void> {
  try {
    const loadResult = await Promise.race([
      document.fonts.load(fontString, testString),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), timeoutMs)
      ),
    ]);

    // If we got a result (array of FontFace), check if it's non-empty
    if (Array.isArray(loadResult) && loadResult.length > 0) {
      state.loadedFonts.add(key);
    } else {
      // Font load returned empty -- the font may not exist or hasn't been registered
      // Still add it if document.fonts.check passes
      if (document.fonts.check(fontString, testString)) {
        state.loadedFonts.add(key);
      } else {
        state.fontWarnings.push({
          type: "font_load_failed",
          font: key,
          message: `Font "${key}" could not be loaded. Falling back to system font.`,
        });
      }
    }
  } catch (err) {
    // Timeout or other error
    state.fontWarnings.push({
      type: "font_load_timeout",
      font: key,
      message: `Font "${key}" failed to load within timeout. Falling back to system font.`,
    });
  }
}

/**
 * Inject a Google Fonts <link> element into the document head.
 *
 * @param fontDef - Font definition with family and optional weights
 */
function _injectGoogleFontLink(fontDef: FontDef): void {
  const family = fontDef.family.replace(/ /g, "+");
  const weights = (fontDef.weights || [400]).join(";");
  const href = `https://fonts.googleapis.com/css2?family=${family}:wght@${weights}&display=swap`;

  // Check if this link already exists to avoid duplicates
  const existing = document.querySelector(`link[href="${href}"]`);
  if (existing) return;

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
  state.injectedFontLinks.add(link);
}

/**
 * Check if a specific font+weight is loaded.
 *
 * @param family - Font family name
 * @param weight - Font weight
 * @returns Whether the font is loaded
 */
export function isFontLoaded(family: string, weight: number = 400): boolean {
  return state.loadedFonts.has(`${family}:${weight}`);
}

/**
 * Get font loading warnings from the most recent init() call.
 *
 * @returns Array of warning objects
 */
export function getFontWarnings(): Array<Record<string, unknown>> {
  return [...state.fontWarnings];
}

/**
 * Get the current safe rectangle.
 *
 * @returns The safe rectangle { x, y, w, h }
 */
export function safeRect(): Rect {
  if (!state.safeRectCache) {
    throw new Error("SlideKit.init() must be called before safeRect()");
  }
  return { ...state.safeRectCache };
}

/**
 * Split a rectangle into two sub-rectangles (left and right).
 *
 * Useful for the common split-layout pattern (e.g. text on left, image on
 * right). The `gap` parameter accepts a raw pixel number or a spacing token
 * string (e.g. 'xl').
 *
 * @param rect - The rectangle to split
 * @param options - Split options
 * @returns { left, right } sub-rectangles
 */
export function splitRect(
  rect: Rect,
  { ratio = 0.5, gap = 0 as number | string }: { ratio?: number; gap?: number | string } = {},
): { left: Rect; right: Rect } {
  const gapPx = resolveSpacing(gap);
  const leftW = Math.round((rect.w - gapPx) * ratio);
  const rightW = rect.w - gapPx - leftW;
  return {
    left:  { x: rect.x, y: rect.y, w: leftW, h: rect.h },
    right: { x: rect.x + leftW + gapPx, y: rect.y, w: rightW, h: rect.h },
  };
}

/**
 * Get the current configuration. Returns null if init() hasn't been called.
 *
 * @returns The current config or null
 */
export function getConfig(): SlideKitConfig | null {
  if (!state.config) return null;
  // Deep copy to prevent external mutation of internal state
  return JSON.parse(JSON.stringify(state.config));
}

/**
 * Reset all internal state. For testing only -- allows tests to verify
 * pre-init behavior and ensures test isolation.
 */
export function _resetForTests(): void {
  state.config = null;
  state.safeRectCache = null;
  resetIdCounter();
  state.transformIdCounter = 0;
  state.loadedFonts = new Set();
  state.fontWarnings = [];
  state.measureCache = new Map();
  // Remove measurement container from DOM if it exists
  if (state.measureContainer && state.measureContainer.parentNode) {
    state.measureContainer.parentNode.removeChild(state.measureContainer);
  }
  state.measureContainer = null;
  // Remove injected Google Font link elements
  for (const link of state.injectedFontLinks) {
    if (link.parentNode) link.parentNode.removeChild(link);
  }
  state.injectedFontLinks = new Set();
}

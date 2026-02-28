// SlideKit — Spacing Tokens (P1.1)
// Extracted from slidekit.js

import { state } from './state.js';

/**
 * Built-in spacing scale (named tokens → pixel values).
 * Users can extend or override via init({ spacing: { ... } }).
 */
export const DEFAULT_SPACING = {
  xs: 8,
  sm: 16,
  md: 24,
  lg: 32,
  xl: 48,
  section: 80,
};

/**
 * Resolve a spacing value — either a named token (string) or a raw pixel
 * number — to a concrete pixel number.
 *
 * - Numbers pass through unchanged (including 0).
 * - Strings are looked up in the active spacing scale (_config.spacing),
 *   falling back to DEFAULT_SPACING if init() hasn't been called yet.
 * - Unknown token names throw with a list of available tokens.
 * - undefined/null pass through (callers handle their own defaults).
 *
 * @param {number|string|undefined|null} value
 * @returns {number|undefined|null}
 */
export function resolveSpacing(value) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const scale = state.config?.spacing || DEFAULT_SPACING;
    if (Object.prototype.hasOwnProperty.call(scale, value)) return scale[value];
    const available = Object.keys(scale).join(', ');
    throw new Error(`Unknown spacing token "${value}". Available tokens: ${available}`);
  }
  return value; // pass through undefined/null
}

/**
 * Public API for resolving a spacing token to a pixel number.
 * Useful for user-land calculations that need to stay in sync with the
 * configured spacing scale.
 *
 * @param {number|string} token - A spacing token name or a pixel number
 * @returns {number}
 */
export function getSpacing(token) {
  return resolveSpacing(token);
}

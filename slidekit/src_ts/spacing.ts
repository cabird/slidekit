// SlideKit — Spacing Tokens (P1.1)
// Extracted from slidekit.js

import { state } from './state.js';
import type { SpacingScale } from './types.js';

/**
 * Built-in spacing scale (named tokens -> pixel values).
 * Users can extend or override via init({ spacing: { ... } }).
 */
export const DEFAULT_SPACING = {
  xs: 8,
  sm: 16,
  md: 24,
  lg: 32,
  xl: 48,
  section: 80,
} as const;

/**
 * Resolve a spacing value -- either a named token (string) or a raw pixel
 * number -- to a concrete pixel number.
 *
 * - Numbers pass through unchanged (including 0).
 * - Strings are looked up in the active spacing scale (_config.spacing),
 *   falling back to DEFAULT_SPACING if init() hasn't been called yet.
 * - Unknown token names throw with a list of available tokens.
 * - undefined/null pass through (callers handle their own defaults).
 *
 * @param value - A spacing token name, pixel number, or undefined/null
 * @returns Resolved pixel number, or the original undefined/null
 */
export function resolveSpacing(value: number | string | undefined | null): number;
export function resolveSpacing(value: number | string): number;
export function resolveSpacing(value: unknown): number | undefined | null {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const scale: SpacingScale = state.config?.spacing || DEFAULT_SPACING;
    if (Object.prototype.hasOwnProperty.call(scale, value)) return scale[value]!;
    const available = Object.keys(scale).join(', ');
    throw new Error(`Unknown spacing token "${value}". Available tokens: ${available}`);
  }
  return value as undefined | null; // pass through undefined/null
}

/**
 * Public API for resolving a spacing token to a pixel number.
 * Useful for user-land calculations that need to stay in sync with the
 * configured spacing scale.
 *
 * @param token - A spacing token name or a pixel number
 * @returns Resolved pixel number
 */
export function getSpacing(token: number | string): number {
  return resolveSpacing(token);
}

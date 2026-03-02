/**
 * SlideKit — Assertion Utilities
 *
 * TypeScript-native assertion helpers for narrowing types,
 * safe Map access, and exhaustive switch checking.
 */

/**
 * Assert a value is defined (not null or undefined).
 * Acts as a TypeScript type guard / assertion function.
 */
export function assertDefined<T>(value: T | null | undefined, msg?: string): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(msg ?? 'Expected value to be defined');
  }
}

/**
 * Safe Map.get that throws if key is missing.
 * Returns non-nullable value type.
 */
export function mustGet<K, V>(map: Map<K, V>, key: K, msg?: string): V {
  const value = map.get(key);
  if (value === undefined) {
    throw new Error(msg ?? `Map missing expected key: ${String(key)}`);
  }
  return value;
}

/**
 * Exhaustive switch/if check. Pass the never-reaching value to get a compile error
 * if a discriminated union case is unhandled.
 */
export function assertUnreachable(x: never, msg?: string): never {
  throw new Error(msg ?? `Unexpected value: ${String(x)}`);
}

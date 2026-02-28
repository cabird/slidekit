// @ts-check
// SlideKit — ID Generation (M1.1)

import { state } from './state.js';

/**
 * Reset the auto-ID counter. Called at the start of each layout()/render() call
 * to ensure deterministic IDs for the same slide definition.
 */
export function resetIdCounter() {
  state.idCounter = 0;
}

/**
 * Generate the next auto ID: sk-1, sk-2, ...
 */
export function nextId() {
  state.idCounter += 1;
  return `sk-${state.idCounter}`;
}

// SlideKit — ID Generation (M1.1)

import { _idCounter, set_idCounter } from './state.js';

/**
 * Reset the auto-ID counter. Called at the start of each layout()/render() call
 * to ensure deterministic IDs for the same slide definition.
 */
export function resetIdCounter() {
  set_idCounter(0);
}

/**
 * Generate the next auto ID: sk-1, sk-2, ...
 */
export function nextId() {
  set_idCounter(_idCounter + 1);
  return `sk-${_idCounter}`;
}

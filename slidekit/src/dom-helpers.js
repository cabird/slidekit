// @ts-check
/**
 * Apply a style object to a DOM element, handling CSS custom properties.
 * @param {HTMLElement} domEl - The DOM element to style
 * @param {object} styleObj - CSS properties in camelCase form
 */
export function applyStyleToDOM(domEl, styleObj) {
  for (const [key, value] of Object.entries(styleObj)) {
    if (key.startsWith("--")) {
      domEl.style.setProperty(key, value);
    } else {
      domEl.style[key] = value;
    }
  }
}

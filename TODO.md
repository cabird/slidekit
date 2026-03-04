# SlideKit Connector TODOs

## Label background sizing uses character-width estimate

**File:** `slidekit/src/renderer.ts`

The connector label background rectangle is sized using a rough per-character
width estimate rather than measuring actual rendered text dimensions. This
produces inaccurate backgrounds for:

- Mixed-width characters (e.g. "Will" vs "mmmm")
- Non-Latin scripts
- Labels with special characters or whitespace

**Ideal fix:** Use `getBoundingClientRect()` or SVG `getComputedTextLength()` on
the rendered text element, then size the background to match. This requires a
two-pass render (render text first, measure, then create background) or a
post-render adjustment pass.

**Why it's hard:** The label and its background are created in the same render
pass. Measuring requires the text to already be in the DOM, but the background
needs to be positioned behind it (lower z-order). Options:

1. Render text, measure, insert background before text in DOM order
2. Use SVG `<text>` with `getComputedTextLength()` (SVG-only approach)
3. Use a hidden measurement div, measure, then create both elements

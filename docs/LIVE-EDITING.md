# SlideKit Live Editing via AI + MCP

## The Discovery

SlideKit presentations can be **edited live in the browser** by an AI agent using MCP (Model Context Protocol) tools like Playwright or Chrome DevTools. No code changes, no rebuilds, no special tooling needed — the existing architecture already supports it.

The user watches the presentation in their browser while directing the AI conversationally: *"move the headline up 50"*, *"make C2's card warmer"*, *"add a glow to the title"*. The AI executes JavaScript in the browser console and the changes appear instantly.

## Why This Works

SlideKit's rendering architecture was designed for debugging, but it turns out to be perfectly suited for live manipulation:

1. **`data-sk-id` on every DOM element** — Every rendered element gets a `data-sk-id` attribute matching its model ID. This creates a direct bridge between the DOM and the scene model.

2. **`window.sk` scene graph** — After render, the full scene model is exposed at `window.sk.layouts[N].elements`, containing every element's resolved `{ x, y, w, h }` coordinates, type, parent/child relationships, and provenance.

3. **Absolute positioning** — All elements use `position: absolute` with inline `style.left`, `style.top`, `style.width`, `style.height`. Modifying these values moves/resizes elements instantly.

4. **No framework reactivity** — SlideKit renders to vanilla DOM. There's no React/Vue/Svelte diffing that would fight against direct DOM changes. What you set is what you see.

## The Helper Toolkit

Injecting a small set of helper functions makes the AI's job easier. These are injected once via `browser_evaluate` and persist for the session:

```javascript
// List all elements on the current slide with positions
window.skList = () => {
  const idx = Reveal.getState().indexh;
  const elements = window.sk.layouts[idx].elements;
  const results = [];
  for (const [id, el] of Object.entries(elements)) {
    if (el._internal) continue;
    const r = el.resolved;
    results.push({
      id, type: el.type,
      x: Math.round(r.x), y: Math.round(r.y),
      w: Math.round(r.w), h: Math.round(r.h)
    });
  }
  return results;
};

// Move an element by dx, dy pixels
window.skMove = (id, dx, dy) => {
  const el = document.querySelector(`[data-sk-id="${id}"]`);
  if (!el) return `Element "${id}" not found`;
  el.style.left = (parseFloat(el.style.left) + (dx || 0)) + 'px';
  el.style.top = (parseFloat(el.style.top) + (dy || 0)) + 'px';
  return `Moved "${id}" by (${dx||0}, ${dy||0})`;
};

// Highlight an element with a selection outline
window.skSelect = (id) => {
  document.querySelectorAll('[data-sk-selected]').forEach(el => {
    el.style.outline = '';
    el.removeAttribute('data-sk-selected');
  });
  if (!id) return 'Selection cleared';
  const el = document.querySelector(`[data-sk-id="${id}"]`);
  if (!el) return `Element "${id}" not found`;
  el.style.outline = '3px solid #3b82f6';
  el.style.outlineOffset = '2px';
  el.setAttribute('data-sk-selected', 'true');
  return `Selected "${id}"`;
};

// Resize an element by dw, dh pixels
window.skResize = (id, dw, dh) => {
  const el = document.querySelector(`[data-sk-id="${id}"]`);
  if (!el) return `Element "${id}" not found`;
  el.style.width = (parseFloat(el.style.width) + (dw || 0)) + 'px';
  el.style.height = (parseFloat(el.style.height) + (dh || 0)) + 'px';
  return `Resized "${id}" by (${dw||0}, ${dh||0})`;
};

// Change any CSS property on an element
window.skStyle = (id, prop, value) => {
  const el = document.querySelector(`[data-sk-id="${id}"]`);
  if (!el) return `Element "${id}" not found`;
  el.style[prop] = value;
  return `Set "${id}".style.${prop} = "${value}"`;
};
```

## What the AI Can Do

### Position & Layout
- `skMove('s9-headline', 0, -50)` — move an element up/down/left/right
- `skResize('s9-card-c1', 50, 0)` — make an element wider/taller
- Move groups of related elements together
- Rebalance spacing between elements

### Styling
- Change backgrounds (solid colors, gradients, transparency)
- Add/modify borders, border-radius, box-shadows
- Apply glow effects, accent bars, color themes
- Modify text colors, font sizes, font weights
- Add CSS transforms (scale, rotate, skew)
- Apply gradient text effects via `-webkit-background-clip: text`

### Inspection
- `skList()` — see all elements on the current slide with IDs and positions
- `skSelect('id')` — highlight an element with a blue outline
- Query the scene model for parent/child relationships, provenance, collision data

### Advanced DOM Manipulation
- Modify inner HTML content (change text, add/remove elements)
- Inject new DOM elements (annotations, callouts, arrows)
- Add CSS animations and transitions
- Toggle visibility of elements

## The Interaction Model

```
User (watching browser):  "The cards feel too far from the headline"
AI (via Playwright MCP):   skMove('s9-cards', 0, -40)
                           → Cards shift up 40px instantly

User:  "Give each card a different color theme"
AI:    [applies gradient backgrounds, colored borders, glows]
       → Three distinct card styles appear

User:  "That green is too bright"
AI:    skStyle('s9-card-c3', 'boxShadow', '0 0 15px rgba(16,185,129,0.15)')
       → Glow dims immediately

User:  "Perfect, now let's look at slide 11"
AI:    Reveal.slide(10)
       → Navigates to slide 11
```

The feedback loop is **seconds**, not minutes. No edit-save-rebuild-refresh cycle.

## Architectural Requirements

This works because of these SlideKit design decisions:

| Feature | Why It Matters |
|---------|---------------|
| `data-sk-id` attributes | DOM ↔ model round-trip without DOM traversal |
| `window.sk` scene graph | AI can inspect positions, relationships, provenance |
| Absolute positioning | Direct pixel control via `style.left/top` |
| Flat layer structure | All elements in one `.slidekit-layer` div, easy to query |
| No framework reactivity | DOM changes stick — no virtual DOM reconciliation |
| Reveal.js integration | `Reveal.getState()` for current slide, `Reveal.slide(n)` for navigation |

## Current Limitations

1. **DOM-only changes** — Modifications are visual only. Refreshing the page or navigating away and back resets everything. Changes aren't persisted to the source files.

2. **Stack children** — Elements inside vstacks/hstacks have their positions computed by the layout algorithm. Moving them independently requires pulling them out of the stack.

3. **Relative positioning** — Elements using `below()`, `rightOf()`, etc. will snap back to their computed position on re-layout. The AI would need to convert them to absolute positions to make moves permanent.

4. **Text reflow** — Changing an element's width doesn't re-measure text content. The text may overflow or leave gaps.

## Future: Full Mutation API (Phase 2 Vision)

The current live-editing approach manipulates the DOM directly, which means changes are visual-only and reset on page refresh. Phase 2 envisions a **scene-model-level mutation API** that goes through SlideKit's constraint solver, enabling persistent round-trip editing:

- **`sk.nudge(id, {dx, dy})`** — shift an element while preserving outgoing constraints (dependents follow)
- **`sk.setProp(id, prop, value)`** — change style/content properties (font size, color, fill)
- **`sk.setFrame(id, {x, y, w, h})`** — set absolute position, dependents follow
- **`sk.detach(id)`** — break all constraints, convert to fully absolute positioning
- **`sk.batch(() => { ... })`** — group multiple mutations into a single re-solve
- **`sk.export()`** — serialize the mutated scene back to a SlideKit spec (round-trip)

The key difference from current DOM manipulation: mutations flow through the scene model and constraint graph, so `below()`/`rightOf()` relationships are preserved or explicitly broken. Export produces a valid SlideKit spec that reproduces the edited layout on next render.

## Future Possibilities

See [LIVE-EDITING-IDEAS.md](./LIVE-EDITING-IDEAS.md) for brainstormed extensions of this capability.

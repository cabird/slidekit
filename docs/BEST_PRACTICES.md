# SlideKit API — Best Practices & Patterns

> **What this is:** Terse, example-driven patterns for common SlideKit scenarios. Aimed at AI model consumption.
>
> **How to add:** Append new sections following the existing format: short heading, one-sentence explanation, code example, optional gotcha. Keep explanations ≤3 sentences. Prefer showing over telling.
>
> **Current as of:** `HEAD` (2026-03-04)

---

## Intentional Overlap (`allowOverlap`)

The linter flags overlapping non-ancestor elements as errors. Set `allowOverlap: true` on elements that intentionally overlap others — background images behind text, decorative layers, hero sections.

```typescript
// Background image that content sits on top of
el('<img src="hero.jpg" style="width:100%;height:100%;object-fit:cover">', {
  id: 'hero-bg', x: 0, y: 0, w: 1920, h: 1080,
  allowOverlap: true,  // text elements will overlay this
}),
el('<h1 style="font:700 72px Inter;color:#fff">Title</h1>', {
  id: 'hero-title', x: 960, y: 400, w: 1200, anchor: 'tc',
}),
```

Only the element that *accepts* being overlapped needs the flag. In the example above, the background gets `allowOverlap`, the title does not.

**When to use vs. `layer: 'bg'`:** Use `layer: 'bg'` for full-slide backgrounds (the linter already skips cross-layer overlaps). Use `allowOverlap` for partial overlaps within the content layer — e.g., a decorative image behind a card cluster, or a watermark that crosses content.

---

## Layering with `layer` and `z`

Three layers render back-to-front: `bg` → `content` (default) → `overlay`. Within a layer, `z` controls stacking order (higher = in front; ties broken by array order).

```typescript
// Full-bleed gradient background
el('', {
  id: 'bg-gradient', x: 0, y: 0, w: 1920, h: 1080,
  layer: 'bg',
  style: { background: 'linear-gradient(135deg, #0a0a2e, #1a1a4e)' },
}),
// Decorative grid sits behind content but above bg
el('<img src="grid.svg" style="width:100%;height:100%;opacity:0.05">', {
  id: 'bg-grid', x: 0, y: 0, w: 1920, h: 1080,
  layer: 'bg', z: 1,  // above bg-gradient
}),
```

---

## Positioning with `splitRect`

Use `splitRect()` for multi-column/row layouts instead of manual arithmetic. Produces lint-friendly explicit coordinates.

```typescript
const safe = safeRect();
const [left, right] = splitRect(safe, { cols: 2, gap: 40 });

panel([
  el('<h2>Column A</h2>', { id: 'col-a-title', w: 'fill' }),
], { id: 'col-a', ...left, padding: 'md', fill: 'rgba(255,255,255,0.05)' }),

panel([
  el('<h2>Column B</h2>', { id: 'col-b-title', w: 'fill' }),
], { id: 'col-b', ...right, padding: 'md', fill: 'rgba(255,255,255,0.05)' }),
```

**Gotcha:** Don't use `hstack()`/`cardGrid()` for lint-sensitive layouts — the linter can't resolve stack-internal positions and will emit false overlap errors.

---

## Relative Positioning

Chain `below()`, `rightOf()`, `leftOf()`, `above()` to flow elements without hardcoding y-coordinates.

```typescript
el('<h1>Title</h1>', { id: 'title', x: 960, y: 120, w: 1200, anchor: 'tc' }),
el('<p>Subtitle</p>', {
  id: 'subtitle', x: 960, y: below('title', { gap: 16 }), w: 800, anchor: 'tc',
}),
el('<p>Body</p>', {
  id: 'body', x: 960, y: below('subtitle', { gap: 32 }), w: 1000, anchor: 'tc',
}),
```

Gap accepts pixels or spacing tokens: `'xs'` (8), `'sm'` (16), `'md'` (24), `'lg'` (32), `'xl'` (48).

---

## Glass Panel Pattern

Semi-transparent panels with backdrop blur. Common for card-based layouts on dark backgrounds.

```typescript
panel([
  el('<h3 style="color:#fff;font-size:28px">Card Title</h3>', { id: 'card-title', w: 'fill' }),
  el('<p style="color:#ccc;font-size:20px">Description text</p>', { id: 'card-body', w: 'fill' }),
], {
  id: 'glass-card',
  x: 120, y: 200, w: 500,
  padding: 'lg', gap: 12,
  fill: 'rgba(255,255,255,0.06)',
  radius: 12,
  border: '1px solid rgba(255,255,255,0.1)',
  style: { backdropFilter: 'blur(12px)' },
})
```

**Gotcha:** Panel children use `w: 'fill'` to stretch to panel width minus padding. Don't set explicit `w` on panel children unless you want fixed-width content.

---

## Figure with Framed Image

`figure()` creates a group with background, image, and optional caption. Use `containerFill` + `containerPadding` for a framed look.

```typescript
figure({
  id: 'chart',
  src: 'assets/chart.png',
  x: 960, y: 300, w: 900, h: 500,
  anchor: 'tc',
  containerFill: '#f8f9fa',
  containerRadius: 10,
  containerPadding: 10,
  fit: 'contain',
  caption: 'Figure 1: Results overview',
  captionStyle: 'font-family:Inter;font-size:18px;color:#888',
})
```

Figure internals (bg rect, img) are automatically marked `_internal` — the linter won't flag them as overlapping each other.

---

## Accent Bars and Decorative Elements

Thin decorative elements (dividers, accent bars) are common. The linter's horizontal-center-consistency rule automatically excludes very small elements (w<20 or h<12).

```typescript
// Accent bar under a heading
el('', {
  id: 'accent', x: 960, y: below('title', { gap: 12 }),
  w: 80, h: 4, anchor: 'tc',
  style: { background: '#7c5cbf', borderRadius: '2px' },
}),
```

---

## Safe Zone Awareness

Content must stay within the safe zone (120px sides, 90px top/bottom). Use `safeRect()` as the basis for all positioning.

```typescript
const safe = safeRect(); // { x: 120, y: 90, w: 1680, h: 900 }

// Position relative to safe zone edges
el('<p>Footer</p>', {
  id: 'footer',
  x: safe.x + safe.w,           // right edge of safe zone
  y: safe.y + safe.h - 30,      // near bottom of safe zone
  anchor: 'br',                 // anchor bottom-right
}),
```

Background elements (`layer: 'bg'`) are exempt from safe zone checks.

---

## Text Sizing

Inline all text styles in HTML. The linter checks actual rendered font sizes by walking DOM text nodes — the container's computed style is ignored.

```typescript
// ✅ Font size is on the <p>, where the linter reads it
el('<p style="font:600 32px/1.4 Inter;color:#fff">Body text</p>', {
  id: 'body', x: 120, y: 200, w: 800,
})

// ❌ Font size on container div won't be read correctly by older linter versions
el('<p>Body text</p>', {
  id: 'body', x: 120, y: 200, w: 800,
  style: { fontSize: '32px' },  // applies to container, not text
})
```

Minimum: 18px. Warning threshold: 24px. Maximum: 120px.

---

## Panel Sizing

Size panels to their content, not to `splitRect().h`. Oversized panels trigger `panel-content-surplus` warnings.

```typescript
const [left, right] = splitRect(safe, { cols: 2, gap: 40 });

// ❌ Panel uses full column height even if content is short
panel([...], { id: 'card', ...left })

// ✅ Panel uses column position but omits h — auto-sized to content
panel([...], { id: 'card', x: left.x, y: left.y, w: left.w, padding: 'md' })
```

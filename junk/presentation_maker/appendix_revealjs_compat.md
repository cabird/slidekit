---
title: "Reveal.js CSS Compatibility"
description: "Critical CSS rules for Reveal.js 5.x — what never to override on section elements"
---

**⚠ Reveal.js CSS Compatibility (CRITICAL — read before writing any CSS or slide HTML):**

Reveal.js 5.x controls slide visibility and positioning through specific CSS properties. Overriding these properties — even unintentionally — will cause slides to appear blank or stack vertically.

> **Note:** When using SlideKit, most of these constraints are handled automatically by the framework's layout primitives. However, agents writing **custom CSS** or **raw HTML `<section>` elements** must still follow all four rules below. Violations will break slide rendering regardless of the tooling layer.

**Rules that MUST NOT be violated:**

1. **Never set `position: relative` on `<section>` elements** (neither in CSS nor inline styles).
   Reveal.js sets `position: absolute` on sections to stack them at the same coordinates and uses
   transforms to transition between them. If a section has `position: relative`, it enters normal
   document flow and stacks below the previous slide — appearing blank because it's off-viewport.
   - BAD: `<section style="position: relative;">` or `.reveal section { position: relative; }`
   - This includes applying it via utility classes like `.gold-rule { position: relative; }`
     when `.gold-rule` is used on `<section>` tags.
   - `::before`/`::after` pseudo-elements with `position: absolute` work fine without their
     parent section being `position: relative` — reveal.js's `position: absolute` on the section
     already creates the containing block.

2. **Never set `display: flex !important` (or any `display: X !important`) on sections.**
   Reveal.js hides inactive slides by setting `display: none` inline. Using `!important` on display
   overrides this, making all slides visible simultaneously (content from all slides composited).
   - BAD: `.reveal .slides section { display: flex !important; }`
   - With SlideKit, use `center: false` and let SlideKit handle positioning. Apply flex
     only to inner containers (divs inside sections), never to the sections themselves.

3. **Never set `display: 'flex'` in `Reveal.initialize()` config.**
   The `display` config option controls what `display` value reveal.js sets on the *active* slide.
   Setting it to `'flex'` breaks the transform-based positioning system in reveal.js 5.x,
   causing slides to stack vertically in the DOM instead of overlapping.
   - BAD: `Reveal.initialize({ display: 'flex' })`
   - Use the default (`'block'`). With SlideKit, use `center: false` — SlideKit handles all positioning.

4. **Never set `height: 100%` on sections** when combined with flex or other layout overrides.
   This can interact badly with reveal.js's scaling system. Let reveal.js manage section dimensions.

**Safe patterns for common needs:**

- **Vertical centering** — with SlideKit, use `center: false` in `Reveal.initialize()` and let SlideKit's layout primitives handle positioning. Do not use CSS flex on sections.
- **Decorative pseudo-elements** (e.g., top borders, accent bars) — `::before`/`::after` with `position: absolute` work fine without `position: relative` on the parent section. Reveal.js's own `position: absolute` on the section already creates the containing block.
- **Flex layouts inside slides** — apply `display: flex` to inner `<div>` containers, never to `<section>` elements.
- **Nested list styling** — explicitly style nested lists to prevent browser defaults from mixing with custom styles. Use smaller markers and reduced opacity for visual subordination.

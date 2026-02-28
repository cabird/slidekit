# SlideKit Overview

## What Is SlideKit?

SlideKit is a JavaScript library for building presentation slides using explicit coordinates on a fixed canvas, rather than CSS auto-layout. You tell it exactly where every element goes — position, size, and styling — and it handles rendering, validation, and feedback.

It targets Reveal.js as its rendering backend, but the core idea is rendering-engine-agnostic: you describe a slide as a list of positioned elements, and SlideKit turns that into visible output.

## Why Does It Exist?

CSS layout (flexbox, grid, flow) was designed for reflowing documents that adapt to variable screen sizes. Slides are the opposite — they're fixed-dimension canvases (1920×1080) where every element has a deliberate position. When you use CSS auto-layout for slides, you're asking the browser to *decide* where things go, and when it decides wrong, you end up debugging cascading interactions, specificity conflicts, and emergent reflow behaviors.

This is especially painful for AI agents. LLMs cannot mentally simulate browser layout engines — they can't predict how `flex-grow` interacts with `min-width`, or how margin collapsing affects a nested card. But they *can* do coordinate geometry. "Place this at (170, 340) with width 800" is unambiguous.

SlideKit eliminates the gap between intent and result. You say where things go, and that's where they go. No surprises.

## The Core Model

### Fixed Canvas, Absolute Coordinates

Every slide is a 1920×1080 pixel canvas. The origin is the top-left corner. You place elements by specifying `(x, y)` position, width, and height in pixels. There is no reflow, no scrolling, no responsive breakpoints.

### Separation of Layout and Styling

SlideKit owns **layout** — position, size, and spatial relationships between elements. You own **styling** — colors, gradients, shadows, fonts, borders, animations. Styling is passed through as raw CSS properties, giving you full creative freedom without fighting the positioning system.

Two categories of CSS properties are blocked from the style pass-through:

1. **Layout properties** (`display`, `position`, `margin`, `flex`, `grid`, etc.) — they'd conflict with SlideKit's coordinate system.
2. **Measurement-affecting properties** (`font-family`, `font-size`, `font-weight`, `font-style`, `font-variant`, `text-transform`, `line-height`, `letter-spacing`, `word-spacing`, `padding`, `white-space`, etc.) — these must go through SlideKit's convenience props (`font`, `size`, `weight`, `fontStyle`, `fontVariant`, `textTransform`, `lineHeight`, `letterSpacing`, `wordSpacing`) so that `measureText()` and the collision detector see the same values as the renderer. Setting them via `style` would create a "split brain" where layout measures one size but the browser renders another.

Everything else (colors, gradients, shadows, borders, animations, transitions) passes through untouched. See [API.md](API.md) for the full blocked-properties list.

### Three-Phase Pipeline

1. **Specification** — You define slides as arrays of element objects with positions, sizes, and styles.
2. **Layout Solve** — The library resolves relative positions, measures text, detects collisions, checks bounds, and produces a complete scene graph with every element's final bounding box.
3. **Render** — The library renders the resolved layout into the DOM as absolutely-positioned elements.

The key insight is that you can inspect the resolved layout *between* solve and render. You get structured, machine-readable data about every element's final position, plus warnings (text too small, element near edge) and errors (element off-slide, unresolvable overlap). This means you can catch and fix problems without visual inspection.

## Element Primitives

SlideKit provides a small set of core primitives that cover the vast majority of slide content:

- **Text** — A text block at a given position. Supports font control, alignment, line height, and overflow policies (clip, ellipsis, auto-shrink, etc.).
- **Image** — A placed image with sizing control (cover, contain, fill).
- **Rectangle** — A box for cards, panels, backgrounds, and decorative shapes.
- **Rule** — A horizontal or vertical line for dividers and accents.
- **Group** — A container that gives its children a shared coordinate origin, so moving the group moves everything inside it.

Every element shares a common set of positioning properties: position, size, anchor point, layer, opacity, and a style object for visual CSS.

## Key Capabilities

### Anchor System

Every element has an anchor point that controls what `(x, y)` refers to. Instead of always meaning "top-left corner," you can set the anchor to center-center, bottom-right, or any of 9 points on the bounding box. This eliminates the constant `x - width/2` arithmetic that leads to positioning errors.

### Text Measurement and Auto-Fitting

You can measure how text will render — its actual dimensions, line count, and line breaks — *before* placing it on the slide. This is DOM-based measurement that accounts for fonts, line height, letter spacing, and word wrapping.

Auto-fitting takes a text string and a bounding box and finds the largest font size that fits, with configurable min/max bounds. This eliminates the most common iteration loop: guessing font sizes for variable-length content.

### Relative Positioning

Elements can be positioned relative to other elements — "24px below the title," "40px to the right of the sidebar." The library resolves these into absolute coordinates during layout solve using a dependency graph. Circular dependencies are detected and reported.

### Stacking Layouts

Vertical and horizontal stack primitives let you say "stack these items with 20px gaps" without manually chaining relative position calls. They resolve to absolute coordinates — they're syntactic sugar over the coordinate system, not CSS flexbox.

### Safe Zone

A configurable margin that defines where content *should* be placed, accounting for projector overscan and edge readability. Elements outside the safe zone trigger warnings (or errors in strict mode). Helper functions give you the safe zone rectangle for easy positioning.

### Collision Detection

The library detects overlapping elements during layout solve and reports them as structured data — which elements overlap, by how much, and where. Intentional overlaps (like text over a background image) can be handled by layer separation.

### Layering

Elements belong to one of three named layers — background, content, and overlay — rendered back-to-front. Within each layer, declaration order determines stacking. This replaces manual z-index management with clear semantic grouping.

### Inspection and Validation

After layout solve, you get a complete scene graph: every element's specified bounds, resolved bounds, ink bounds (actual rendered extent), overflow status, and safe zone compliance. Warnings and errors are structured JSON, not console messages. Validation can run in lenient mode (warnings only) or strict mode (errors halt layout).

Presentation-specific checks include minimum font size for projection readability, text contrast, content density (too sparse or too crowded), and word count per slide.

### Debug Overlay

A visual overlay that draws bounding boxes, safe zone boundaries, element IDs, anchor points, and collision highlights over the rendered slide. Useful for visual inspection and screenshots.

## Higher-Level Primitives

Beyond the core elements, SlideKit provides compound primitives for common slide patterns:

- **Bullet lists** with proper indentation, hanging punctuation, configurable bullet characters, and nested sub-items — rendered as positioned text elements, not browser list rendering.
- **Connectors** that draw lines and arrows between elements, with straight, elbow, and curved routing. Essential for flowcharts and relationship diagrams.
- **Panels** — visual containers with a background, padding, and vertically stacked child elements. The "card" pattern that appears constantly in presentations.

## Alignment and Distribution

PowerPoint-style alignment and distribution operations work on arrays of elements: align left edges, distribute horizontally with equal gaps, match widths to the widest element, fit a group of elements into a bounding rectangle. These are the spatial operations that human designers use constantly and that are difficult to replicate with CSS.

## Additional Features

- **Grid system** with configurable columns and gutters for consistent cross-slide alignment.
- **Snap** to round positions to grid increments.
- **Percentage sugar** for positions and sizes, resolved to pixels during layout solve.
- **Rotation** for images and decorative shapes.
- **Repeat/duplicate** to create grids of similar elements with position offsets.

## Live Editing and Round-Trip

After rendering, the scene model persists in the browser and is queryable and mutable through a console API. You can inspect any element's resolved position, test for overlaps, nudge elements, change properties, and then export the updated layout back to a SlideKit specification. Constraints (like "subtitle is 24px below title") survive through edits — moving the title automatically moves the subtitle.

This enables a closed loop: generate a slide, view it in a browser, make targeted corrections programmatically, and export the corrected layout. The scene model tracks provenance for every resolved value, so export is deterministic — no tolerance-based inference about whether constraints still hold.

## What SlideKit Does Not Do

- **It is not a design tool.** It doesn't have a GUI, drag-and-drop, or visual editor. It's a programmatic library.
- **It does not generate content.** It doesn't write your slide text or choose your images. It positions and validates what you give it.
- **It does not replace CSS for styling.** Colors, gradients, shadows, fonts, animations — that's all still CSS, and you have full access to it.
- **It does not handle slide transitions or presenter features.** That's Reveal.js's job. SlideKit renders content *within* slides.

## Next Steps

- **[API.md](API.md)** — Full API reference with every function signature, property table, defaults, and return shapes. Start here to write code.
- **[examples/](examples/)** — Runnable example files demonstrating common patterns (title slides, card rows, bullet lists, connectors, grids, text fitting, and more). Open `examples/run.html?example=title-slide` in a browser to see any example rendered live.

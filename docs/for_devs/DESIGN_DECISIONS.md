# Design Decisions Log

> **Current as of:** `cb951cf` (2026-03-02)

> Extracted from the original `docs/DESIGN.md`. These decisions were validated through multi-model consensus (Gemini Pro 3.1 + GPT 5.2).

### Decision: Absolute positioning over CSS auto-layout
**Rationale:** LLMs cannot simulate browser reflow engines. They can do coordinate geometry. Absolute positioning eliminates emergent layout behaviors that cause iteration loops.

### Decision: Pixels as canonical unit (1920×1080), not percentages
**Rationale:** Both models agreed that LLMs work better with absolute integers on a fixed canvas. Percentages introduce floating-point ambiguity and context-switching. Percentage sugar is available but always resolves to pixels.

### Decision: CSS pass-through for styling with layout property blocklist
**Rationale:** LLMs have extensive CSS styling knowledge. Replacing it with a custom styling API would lose this capability. Instead, we let agents use CSS for what it's good at (visual styling) while blocking properties that would interfere with absolute positioning.

### Decision: DOM-based text measurement, not Canvas measureText
**Rationale:** Canvas `measureText` doesn't account for CSS line-height, word-wrapping, or letter-spacing. It produces different results than DOM rendering. DOM-based measurement (off-screen element with identical CSS) matches the actual rendered output exactly.

### Decision: fitText with binary search is Tier 1, not optional
**Rationale:** Both models identified this as the highest-value single feature. Agents fail at guessing font sizes for variable-length text. Auto-shrink with min/max bounds eliminates the most common iteration loop.

### Decision: Named layers (bg/content/overlay) over manual z-index
**Rationale:** Manual z-index management confuses agents (they assign arbitrary numbers that conflict). Named layers provide clear semantic grouping. Declaration order within layers handles 95% of cases. Explicit z-index override is available as an escape hatch.

### Decision: Two-phase pipeline (spec → layout solve → render) with introspection
**Rationale:** The agent needs to inspect resolved geometry before committing to render. This is what enables self-correction without visual inspection. GPT 5.2 specifically emphasized this as the architectural key to agent reliability.

### Decision: Safe zone with configurable margins
**Rationale:** Directly addresses "content off edges" and "content too close to edges" problems. Provides the agent with a concrete target rectangle. Enforcement via warnings (lenient) or errors (strict).

### Decision: Anchors on all elements (9-point system)
**Rationale:** Both models agreed this eliminates a major class of positioning errors. "Center this text at (960, 540)" is clearer than "place this text at (960 - w/2, 540 - h/2)". Agents frequently botch the arithmetic.

### Decision: vstack/hstack resolve to absolute positions (not CSS flex)
**Rationale:** Slides frequently use stacked layouts (bullet lists, card rows). Forcing agents to chain `below()` calls is verbose and error-prone. But CSS flexbox is what we're trying to avoid. The solution: stack primitives that compute absolute positions during layout solve.

### Decision: Allow opt-in HTML mixing via dedicated SlideKit layer
**Rationale:** GPT 5.2 argued (convincingly) that some content types (iframes, code blocks, embedded widgets, speaker notes) are better served by raw HTML. A dedicated `slidekit-layer` div keeps SlideKit's positioning deterministic while allowing HTML outside that layer.

### Decision: Structured machine-readable warnings/errors, not console.log
**Rationale:** The whole point is that agents can programmatically read validation results and act on them. Console output is for humans. JSON warnings/errors are for agents.

### Decision: Persistent scene model with provenance (for Phase 2)
**Rationale:** Phase 2 (live editing & round-trip) requires the constraint graph and resolved frames to survive after layout solve. Rather than retrofitting this, Phase 1 builds the scene model with provenance from the start. This adds minimal overhead (a few extra fields per element) but makes Phase 2 a natural extension rather than a rewrite.

### Decision: "Nudge" as default edit mode, not "Detach" (Phase 2)
**Rationale:** GPT 5.2 and Gemini Pro disagreed here. Gemini advocated "detach" (break constraints on any manual move, following Figma's precedent). GPT advocated "nudge" (override position but keep outgoing references so dependents follow). We chose "nudge" because SlideKit's primary user is an AI agent making programmatic console adjustments, not a human visually dragging elements. When an agent nudges title right, it wants subtitle to follow — that's why it used `below()`. The Figma precedent assumes visual drag-and-drop, which is a different interaction model.

### Decision: Explicit constraint tracking over tolerance-based inference (Phase 2)
**Rationale:** Both models agreed strongly. Tolerance-based inference ("is subtitle still ~40px below title?") is brittle, ambiguous (multiple constraints can explain the same geometry), and causes round-trip drift. Explicit tracking (mutations are graph edits, export reads the updated graph) is deterministic and predictable. Heuristic recovery is deferred as an opt-in feature for importing foreign layouts.

// SlideKit Tests — M4.4: fitText, Overflow Policies, Presentation Validations

import { describe, it, assert } from './test-runner.js';
import {
  text, rect, group,
  render, layout, init, safeRect,
  measureText, fitText, clearMeasureCache,
  resetIdCounter, _resetForTests,
} from '../slidekit.js';

// =============================================================================
// Helper: create a temporary container for render tests
// =============================================================================

async function withContainer(fn) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  try {
    return await fn(container);
  } finally {
    document.body.removeChild(container);
  }
}

// =============================================================================
// M4.1: fitText — Auto-Size Text to Fit Box
// =============================================================================

describe("M4.1: fitText() — finds correct font size", () => {
  it("returns maxSize when text easily fits in a large box", async () => {
    _resetForTests();
    await init();
    const result = fitText("Hi", { w: 800, h: 600 }, { minSize: 12, maxSize: 80 });
    assert.equal(result.fontSize, 80, "should return maxSize when text fits");
    assert.ok(result.metrics, "should return metrics");
    assert.ok(result.metrics.block.h <= 600, "text height should fit in box");
    assert.equal(result.warnings.length, 0, "should have no warnings");
  });

  it("finds a smaller font size for long text in a small box", async () => {
    _resetForTests();
    await init();
    const longText = "This is a fairly long piece of text that should require a smaller font size to fit within the constraining box dimensions provided";
    const result = fitText(longText, { w: 300, h: 100 }, { minSize: 8, maxSize: 72 });
    assert.ok(result.fontSize >= 8, "fontSize should be >= minSize");
    assert.ok(result.fontSize <= 72, "fontSize should be <= maxSize");
    assert.ok(result.metrics.block.h <= 100, "text should fit in box height");
  });

  it("binary search converges to optimal size", async () => {
    _resetForTests();
    await init();
    const result = fitText("Test text here", { w: 200, h: 50 }, { minSize: 8, maxSize: 72, step: 1 });
    assert.ok(result.fontSize >= 8, "fontSize >= minSize");
    // Verify the found size actually fits
    const m = measureText("Test text here", {
      font: "Inter", size: result.fontSize, w: 200, weight: 400, lineHeight: 1.3, letterSpacing: "0",
    });
    assert.ok(m.block.h <= 50, "text at returned fontSize should fit");
  });
});

describe("M4.1: fitText() — respects minSize and maxSize", () => {
  it("never returns a fontSize below minSize", async () => {
    _resetForTests();
    await init();
    // Very long text in a tiny box
    const hugeText = "Word ".repeat(500);
    const result = fitText(hugeText, { w: 100, h: 30 }, { minSize: 16, maxSize: 72 });
    assert.equal(result.fontSize, 16, "should clamp to minSize");
  });

  it("never returns a fontSize above maxSize", async () => {
    _resetForTests();
    await init();
    const result = fitText("Hi", { w: 1000, h: 1000 }, { minSize: 10, maxSize: 50 });
    assert.equal(result.fontSize, 50, "should clamp to maxSize");
  });

  it("emits overflow warning when text doesn't fit at minSize", async () => {
    _resetForTests();
    await init();
    const hugeText = "Word ".repeat(500);
    const result = fitText(hugeText, { w: 100, h: 30 }, { minSize: 16, maxSize: 72 });
    const overflow = result.warnings.find(w => w.type === "text_overflow_at_min_size");
    assert.ok(overflow, "should have text_overflow_at_min_size warning");
    assert.equal(overflow.fontSize, 16, "warning should report minSize");
  });
});

describe("M4.1: fitText() — projection threshold warning", () => {
  it("emits font_small warning when below projection threshold", async () => {
    _resetForTests();
    await init({ minFontSize: 24 });
    // Force fitText to find a small size
    const longText = "This is a long piece of text that will need to be shrunk significantly to fit in this tiny box";
    const result = fitText(longText, { w: 200, h: 40 }, { minSize: 8, maxSize: 72 });
    if (result.fontSize < 24) {
      const warning = result.warnings.find(w => w.type === "font_small");
      assert.ok(warning, "should have font_small warning");
      assert.equal(warning.threshold, 24, "threshold should match config");
    }
  });

  it("does not emit font_small warning when fontSize >= threshold", async () => {
    _resetForTests();
    await init({ minFontSize: 10 });
    const result = fitText("Hi", { w: 800, h: 600 }, { minSize: 12, maxSize: 80 });
    const warning = result.warnings.find(w => w.type === "font_small");
    assert.ok(!warning, "should not have font_small warning when size is large");
  });
});

// =============================================================================
// M4.2: Overflow Policies in Layout Solve
// =============================================================================

describe("M4.2: overflow policy — visible", () => {
  it("visible policy allows text to overflow without warnings", async () => {
    _resetForTests();
    await init();
    const elements = [
      text("Very long text that will overflow its box", {
        id: "t1", x: 100, y: 100, w: 200, h: 20, size: 32,
        overflow: "visible",
      }),
    ];
    const result = await layout({ elements });
    const overflowWarnings = result.warnings.filter(
      w => w.type === "text_overflow" && w.elementId === "t1"
    );
    assert.equal(overflowWarnings.length, 0, "visible policy should produce no overflow warnings");
  });
});

describe("M4.2: overflow policy — warn", () => {
  it("warn policy emits a text_overflow warning", async () => {
    _resetForTests();
    await init();
    const elements = [
      text("Very long text that will definitely overflow its box because it is so long", {
        id: "t1", x: 100, y: 100, w: 200, h: 20, size: 32,
        overflow: "warn",
      }),
    ];
    const result = await layout({ elements });
    const overflowWarnings = result.warnings.filter(
      w => w.type === "text_overflow" && w.elementId === "t1"
    );
    assert.ok(overflowWarnings.length > 0, "warn policy should produce text_overflow warning");
    assert.equal(overflowWarnings[0].overflow, "warn");
  });
});

describe("M4.2: overflow policy — clip", () => {
  it("clip policy sets _layoutFlags.clip on the element", async () => {
    _resetForTests();
    await init();
    const elements = [
      text("Very long text that will definitely overflow its small box", {
        id: "t1", x: 100, y: 100, w: 200, h: 20, size: 32,
        overflow: "clip",
      }),
    ];
    const result = await layout({ elements });
    assert.ok(result.elements["t1"]._layoutFlags, "should have _layoutFlags");
    assert.equal(result.elements["t1"]._layoutFlags.clip, true, "clip flag should be true");
  });

  it("clip policy causes renderer to set overflow:hidden", async () => {
    _resetForTests();
    await init();
    await withContainer(async (container) => {
      const elements = [
        text("Very long text that will definitely overflow its small box", {
          id: "t1", x: 100, y: 100, w: 200, h: 20, size: 32,
          overflow: "clip",
        }),
      ];
      await render([{ elements }], { container });
      // render() calls layout() internally and applies _layoutFlags to DOM
      const section = container.querySelector("section");
      const textDiv = section.querySelector('[data-sk-id="t1"]');
      if (textDiv) {
        assert.equal(textDiv.style.overflow, "hidden", "rendered element should have overflow:hidden");
      }
    });
  });
});

describe("M4.2: overflow policy — ellipsis", () => {
  it("ellipsis policy truncates text with '...'", async () => {
    _resetForTests();
    await init();
    const longText = "This is a very long piece of text that should be truncated with an ellipsis because it does not fit in the box";
    const el = text(longText, {
      id: "t1", x: 100, y: 100, w: 300, h: 30, size: 32,
      overflow: "ellipsis",
    });
    const elements = [el];
    await layout({ elements });
    // After layout, el.content should be truncated
    assert.ok(el.content.endsWith("..."), "content should end with '...'");
    assert.ok(el.content.length < longText.length, "content should be shorter than original");
  });

  it("ellipsis with single word sets content to '...'", async () => {
    _resetForTests();
    await init();
    const el = text("Supercalifragilisticexpialidocious", {
      id: "t1", x: 100, y: 100, w: 50, h: 20, size: 32,
      overflow: "ellipsis",
    });
    const elements = [el];
    await layout({ elements });
    assert.equal(el.content, "...", "single word overflow should become '...'");
  });

  it("ellipsis truncated text fits within box height", async () => {
    _resetForTests();
    await init();
    const longText = "Word one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen";
    const el = text(longText, {
      id: "t1", x: 100, y: 100, w: 300, h: 50, size: 24,
      overflow: "ellipsis",
    });
    const elements = [el];
    await layout({ elements });
    // Measure the truncated content
    if (el.content !== "...") {
      const m = measureText(el.content, { font: "Inter", size: 24, w: 300, weight: 400, lineHeight: 1.3, letterSpacing: "0" });
      assert.ok(m.block.h <= 50, "truncated text should fit in box");
    }
  });
});

describe("M4.2: overflow policy — shrink", () => {
  it("shrink policy reduces font size to fit", async () => {
    _resetForTests();
    await init();
    const el = text("This text is too big for its box at the original size", {
      id: "t1", x: 100, y: 100, w: 200, h: 40, size: 48,
      overflow: "shrink",
    });
    const elements = [el];
    await layout({ elements });
    // After shrink, the font size should be reduced
    assert.ok(el.props.size < 48, "font size should be reduced");
    assert.ok(el.props.size >= 12, "font size should be >= default minSize");
  });

  it("shrink policy respects fit.minSize", async () => {
    _resetForTests();
    await init();
    const hugeText = "Word ".repeat(200);
    const el = text(hugeText, {
      id: "t1", x: 100, y: 100, w: 200, h: 30, size: 48,
      overflow: "shrink", fit: { minSize: 20 },
    });
    const elements = [el];
    await layout({ elements });
    assert.ok(el.props.size >= 20, "font size should respect fit.minSize");
  });
});

describe("M4.2: overflow policy — error", () => {
  it("error policy adds an error to layout result", async () => {
    _resetForTests();
    await init();
    const elements = [
      text("Very long text that overflows its box", {
        id: "t1", x: 100, y: 100, w: 200, h: 20, size: 32,
        overflow: "error",
      }),
    ];
    const result = await layout({ elements });
    const overflowErrors = result.errors.filter(
      e => e.type === "text_overflow" && e.elementId === "t1"
    );
    assert.ok(overflowErrors.length > 0, "error policy should produce text_overflow error");
    assert.equal(overflowErrors[0].overflow, "error");
  });
});

describe("M4.2: overflow — no overflow when text fits", () => {
  it("no overflow warnings/errors when text fits in box", async () => {
    _resetForTests();
    await init();
    const elements = [
      text("Hi", {
        id: "t1", x: 100, y: 100, w: 800, h: 200, size: 32,
        overflow: "warn",
      }),
    ];
    const result = await layout({ elements });
    const overflowWarnings = result.warnings.filter(
      w => w.type === "text_overflow" && w.elementId === "t1"
    );
    assert.equal(overflowWarnings.length, 0, "text that fits should produce no overflow warnings");
  });

  it("no overflow check for text without explicit h", async () => {
    _resetForTests();
    await init();
    // Text without explicit h uses auto-height, so overflow is not checked
    const elements = [
      text("Very long text that would overflow if h were set", {
        id: "t1", x: 100, y: 100, w: 200, size: 32,
        overflow: "error",
      }),
    ];
    const result = await layout({ elements });
    const overflowErrors = result.errors.filter(
      e => e.type === "text_overflow" && e.elementId === "t1"
    );
    assert.equal(overflowErrors.length, 0, "no overflow check without explicit h");
  });
});

// =============================================================================
// M4.3: Presentation-Specific Validations
// =============================================================================

describe("M4.3: font size validation", () => {
  it("warns when text font size is below minFontSize threshold", async () => {
    _resetForTests();
    await init({ minFontSize: 24 });
    const elements = [
      text("Small text", {
        id: "t1", x: 100, y: 100, w: 400, size: 16,
      }),
    ];
    const result = await layout({ elements });
    const fontWarnings = result.warnings.filter(
      w => w.type === "font_small" && w.elementId === "t1"
    );
    assert.ok(fontWarnings.length > 0, "should warn about small font");
    assert.equal(fontWarnings[0].fontSize, 16);
    assert.equal(fontWarnings[0].threshold, 24);
  });

  it("does not warn when font size is at or above threshold", async () => {
    _resetForTests();
    await init({ minFontSize: 24 });
    const elements = [
      text("Normal text", {
        id: "t1", x: 100, y: 100, w: 400, size: 32,
      }),
    ];
    const result = await layout({ elements });
    const fontWarnings = result.warnings.filter(
      w => w.type === "font_small" && w.elementId === "t1"
    );
    assert.equal(fontWarnings.length, 0, "no warning when font size is adequate");
  });
});

describe("M4.3: safe zone validation", () => {
  it("warns when element extends outside safe zone", async () => {
    _resetForTests();
    await init();
    // Default safe zone is roughly {x:120, y:90, w:1680, h:900}
    // Place element at x:0 to extend outside left edge of safe zone
    const elements = [
      rect({ id: "r1", x: 0, y: 100, w: 100, h: 100 }),
    ];
    const result = await layout({ elements });
    const safeWarnings = result.warnings.filter(
      w => w.type === "outside_safe_zone" && w.elementId === "r1"
    );
    assert.ok(safeWarnings.length > 0, "should warn about element outside safe zone");
  });

  it("does not warn for elements within safe zone", async () => {
    _resetForTests();
    await init();
    const sr = safeRect();
    const elements = [
      rect({ id: "r1", x: sr.x + 10, y: sr.y + 10, w: 100, h: 100 }),
    ];
    const result = await layout({ elements });
    const safeWarnings = result.warnings.filter(
      w => w.type === "outside_safe_zone" && w.elementId === "r1"
    );
    assert.equal(safeWarnings.length, 0, "no warning when inside safe zone");
  });

  it("skips bg-layer elements for safe zone check", async () => {
    _resetForTests();
    await init();
    // bg-layer elements are full-bleed and expected to exceed safe zone
    const elements = [
      rect({ id: "bg1", x: 0, y: 0, w: 1920, h: 1080, layer: "bg" }),
    ];
    const result = await layout({ elements });
    const safeWarnings = result.warnings.filter(
      w => w.type === "outside_safe_zone" && w.elementId === "bg1"
    );
    assert.equal(safeWarnings.length, 0, "bg layer should not trigger safe zone warning");
  });
});

describe("M4.3: slide bounds validation", () => {
  it("warns when element extends outside slide bounds", async () => {
    _resetForTests();
    await init();
    const elements = [
      rect({ id: "r1", x: -50, y: 100, w: 100, h: 100 }),
    ];
    const result = await layout({ elements });
    const slideWarnings = result.warnings.filter(
      w => w.type === "outside_slide" && w.elementId === "r1"
    );
    assert.ok(slideWarnings.length > 0, "should warn about element outside slide bounds");
  });

  it("warns when element extends beyond right/bottom edge", async () => {
    _resetForTests();
    await init();
    const elements = [
      rect({ id: "r1", x: 1850, y: 100, w: 200, h: 100 }),
    ];
    const result = await layout({ elements });
    const slideWarnings = result.warnings.filter(
      w => w.type === "outside_slide" && w.elementId === "r1"
    );
    assert.ok(slideWarnings.length > 0, "should warn when element extends past right edge");
  });

  it("does not warn when element is within slide bounds", async () => {
    _resetForTests();
    await init();
    const elements = [
      rect({ id: "r1", x: 100, y: 100, w: 200, h: 200 }),
    ];
    const result = await layout({ elements });
    const slideWarnings = result.warnings.filter(
      w => w.type === "outside_slide" && w.elementId === "r1"
    );
    assert.equal(slideWarnings.length, 0, "no warning when inside slide bounds");
  });
});

describe("M4.3: content area usage", () => {
  it("warns when content uses less than 40% of safe zone (clustered)", async () => {
    _resetForTests();
    await init();
    const sr = safeRect();
    // Place a small element in the corner — tiny content area
    const elements = [
      rect({ id: "r1", x: sr.x + 10, y: sr.y + 10, w: 50, h: 50 }),
    ];
    const result = await layout({ elements });
    const clustered = result.warnings.filter(w => w.type === "content_clustered");
    assert.ok(clustered.length > 0, "should warn about clustered content");
    assert.ok(clustered[0].usageRatio < 0.40, "usage ratio should be below 40%");
  });

  it("warns when content uses more than 95% of safe zone (no breathing room)", async () => {
    _resetForTests();
    await init();
    const sr = safeRect();
    // Place elements that span nearly the entire safe zone
    const elements = [
      rect({ id: "r1", x: sr.x, y: sr.y, w: sr.w, h: sr.h }),
    ];
    const result = await layout({ elements });
    const noRoom = result.warnings.filter(w => w.type === "content_no_breathing_room");
    assert.ok(noRoom.length > 0, "should warn about no breathing room");
    assert.ok(noRoom[0].usageRatio > 0.95, "usage ratio should be above 95%");
  });

  it("no usage warning when content is between 40% and 95%", async () => {
    _resetForTests();
    await init();
    const sr = safeRect();
    // Place element covering ~64% area (0.8 * 0.8 = 0.64)
    const midW = sr.w * 0.8;
    const midH = sr.h * 0.8;
    const elements = [
      rect({ id: "r1", x: sr.x + 10, y: sr.y + 10, w: midW, h: midH }),
    ];
    const result = await layout({ elements });
    const usage = result.warnings.filter(
      w => w.type === "content_clustered" || w.type === "content_no_breathing_room"
    );
    assert.equal(usage.length, 0, "no usage warning when content is well-distributed");
  });
});

describe("M4.3: strict mode — errors instead of warnings", () => {
  it("strict mode produces error for safe zone violation", async () => {
    _resetForTests();
    await init({ strict: true });
    const elements = [
      rect({ id: "r1", x: 0, y: 100, w: 100, h: 100 }),
    ];
    const result = await layout({ elements });
    const safeErrors = result.errors.filter(
      e => e.type === "outside_safe_zone" && e.elementId === "r1"
    );
    assert.ok(safeErrors.length > 0, "strict mode should produce error for safe zone violation");
    // Should NOT be a warning
    const safeWarnings = result.warnings.filter(
      w => w.type === "outside_safe_zone" && w.elementId === "r1"
    );
    assert.equal(safeWarnings.length, 0, "strict mode should not produce warning (only error)");
  });

  it("strict mode produces error for slide bounds violation", async () => {
    _resetForTests();
    await init({ strict: true });
    const elements = [
      rect({ id: "r1", x: -50, y: 100, w: 100, h: 100 }),
    ];
    const result = await layout({ elements });
    const slideErrors = result.errors.filter(
      e => e.type === "outside_slide" && e.elementId === "r1"
    );
    assert.ok(slideErrors.length > 0, "strict mode should produce error for slide bounds violation");
  });

  it("non-strict mode produces warnings (not errors) for same violations", async () => {
    _resetForTests();
    await init({ strict: false });
    const elements = [
      rect({ id: "r1", x: -50, y: 100, w: 100, h: 100 }),
    ];
    const result = await layout({ elements });
    const slideWarnings = result.warnings.filter(
      w => w.type === "outside_slide" && w.elementId === "r1"
    );
    assert.ok(slideWarnings.length > 0, "non-strict should produce warnings");
    const slideErrors = result.errors.filter(
      e => e.type === "outside_slide" && e.elementId === "r1"
    );
    assert.equal(slideErrors.length, 0, "non-strict should not produce errors");
  });
});

describe("M4.2: default overflow policy", () => {
  it("default overflow policy is 'warn'", async () => {
    _resetForTests();
    await init();
    // No explicit overflow prop set
    const elements = [
      text("Very long text that should overflow its tiny box at size 32 px", {
        id: "t1", x: 100, y: 100, w: 200, h: 20, size: 32,
      }),
    ];
    const result = await layout({ elements });
    const overflowWarnings = result.warnings.filter(
      w => w.type === "text_overflow" && w.elementId === "t1"
    );
    assert.ok(overflowWarnings.length > 0, "default should be warn policy");
  });
});

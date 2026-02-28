// SlideKit Tests — Overflow, Presentation Validations

import { describe, it, assert } from './test-runner.js';
import {
  el, group,
  render, layout, init, safeRect,
  clearMeasureCache,
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
// Overflow: visible (default)
// =============================================================================

describe("overflow: visible (default)", () => {
  it("el() default overflow is visible", () => {
    resetIdCounter();
    const e = el('<p>Hello</p>', { x: 100, y: 100, w: 200 });
    assert.equal(e.props.overflow, "visible");
  });

  it("visible overflow produces no overflow warnings", async () => {
    _resetForTests();
    await init();
    const elements = [
      el('<p style="font-size:32px">Very long text that will overflow its box</p>', {
        id: "t1", x: 100, y: 100, w: 200, h: 20,
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

// =============================================================================
// Overflow: clip
// =============================================================================

describe("overflow: clip", () => {
  it("clip causes renderer to set overflow:hidden", async () => {
    _resetForTests();
    await init();
    await withContainer(async (container) => {
      const elements = [
        el('<p style="font-size:32px">Very long text that will overflow its small box</p>', {
          id: "t1", x: 100, y: 100, w: 200, h: 20,
          overflow: "clip",
        }),
      ];
      await render([{ elements }], { container });
      const section = container.querySelector("section");
      const textDiv = section.querySelector('[data-sk-id="t1"]');
      if (textDiv) {
        assert.equal(textDiv.style.overflow, "hidden", "rendered element should have overflow:hidden");
      }
    });
  });
});

// =============================================================================
// Safe zone validation
// =============================================================================

describe("safe zone validation", () => {
  it("warns when element extends outside safe zone", async () => {
    _resetForTests();
    await init();
    const elements = [
      el('', { id: "r1", x: 0, y: 100, w: 100, h: 100 }),
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
      el('', { id: "r1", x: sr.x + 10, y: sr.y + 10, w: 100, h: 100 }),
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
    const elements = [
      el('', { id: "bg1", x: 0, y: 0, w: 1920, h: 1080, layer: "bg" }),
    ];
    const result = await layout({ elements });
    const safeWarnings = result.warnings.filter(
      w => w.type === "outside_safe_zone" && w.elementId === "bg1"
    );
    assert.equal(safeWarnings.length, 0, "bg layer should not trigger safe zone warning");
  });
});

// =============================================================================
// Slide bounds validation
// =============================================================================

describe("slide bounds validation", () => {
  it("warns when element extends outside slide bounds", async () => {
    _resetForTests();
    await init();
    const elements = [
      el('', { id: "r1", x: -50, y: 100, w: 100, h: 100 }),
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
      el('', { id: "r1", x: 1850, y: 100, w: 200, h: 100 }),
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
      el('', { id: "r1", x: 100, y: 100, w: 200, h: 200 }),
    ];
    const result = await layout({ elements });
    const slideWarnings = result.warnings.filter(
      w => w.type === "outside_slide" && w.elementId === "r1"
    );
    assert.equal(slideWarnings.length, 0, "no warning when inside slide bounds");
  });
});

// =============================================================================
// Content area usage
// =============================================================================

describe("content area usage", () => {
  it("warns when content uses less than 40% of safe zone (clustered)", async () => {
    _resetForTests();
    await init();
    const sr = safeRect();
    const elements = [
      el('', { id: "r1", x: sr.x + 10, y: sr.y + 10, w: 50, h: 50 }),
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
    const elements = [
      el('', { id: "r1", x: sr.x, y: sr.y, w: sr.w, h: sr.h }),
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
    const midW = sr.w * 0.8;
    const midH = sr.h * 0.8;
    const offsetX = (sr.w - midW) / 2;
    const offsetY = (sr.h - midH) / 2;
    const elements = [
      el('', { id: "r1", x: sr.x + offsetX, y: sr.y + offsetY, w: midW, h: midH }),
    ];
    const result = await layout({ elements });
    const usage = result.warnings.filter(
      w => w.type === "content_clustered" || w.type === "content_no_breathing_room"
    );
    assert.equal(usage.length, 0, "no usage warning when content is well-distributed");
  });
});

// =============================================================================
// Strict mode
// =============================================================================

describe("strict mode — errors instead of warnings", () => {
  it("strict mode produces error for safe zone violation", async () => {
    _resetForTests();
    await init({ strict: true });
    const elements = [
      el('', { id: "r1", x: 0, y: 100, w: 100, h: 100 }),
    ];
    const result = await layout({ elements });
    const safeErrors = result.errors.filter(
      e => e.type === "outside_safe_zone" && e.elementId === "r1"
    );
    assert.ok(safeErrors.length > 0, "strict mode should produce error for safe zone violation");
    const safeWarnings = result.warnings.filter(
      w => w.type === "outside_safe_zone" && w.elementId === "r1"
    );
    assert.equal(safeWarnings.length, 0, "strict mode should not produce warning (only error)");
  });

  it("strict mode produces error for slide bounds violation", async () => {
    _resetForTests();
    await init({ strict: true });
    const elements = [
      el('', { id: "r1", x: -50, y: 100, w: 100, h: 100 }),
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
      el('', { id: "r1", x: -50, y: 100, w: 100, h: 100 }),
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

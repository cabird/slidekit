// SlideKit Tests — Overflow, Presentation Validations

import { describe, it, assert } from './test-runner.js';
import {
  el, group, hstack,
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

  it("content layer outside safe zone includes actionable suggestion", async () => {
    _resetForTests();
    await init();
    const elements = [
      el('', { id: "c1", x: 0, y: 100, w: 100, h: 100, layer: "content" }),
    ];
    const result = await layout({ elements });
    const safeWarnings = result.warnings.filter(
      w => w.type === "outside_safe_zone" && w.elementId === "c1"
    );
    assert.ok(safeWarnings.length > 0, "content layer should trigger safe zone warning");
    assert.ok(
      safeWarnings[0].message.includes("set layer: 'bg' to silence this check"),
      "warning should include actionable suggestion to use bg layer"
    );
  });

  it("overlay layer outside safe zone gets warning with suggestion", async () => {
    _resetForTests();
    await init();
    const elements = [
      el('', { id: "o1", x: 0, y: 100, w: 100, h: 100, layer: "overlay" }),
    ];
    const result = await layout({ elements });
    const safeWarnings = result.warnings.filter(
      w => w.type === "outside_safe_zone" && w.elementId === "o1"
    );
    assert.ok(safeWarnings.length > 0, "overlay layer should trigger safe zone warning");
    assert.ok(
      safeWarnings[0].message.includes("set layer: 'bg' to silence this check"),
      "overlay warning should include actionable suggestion"
    );
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

// =============================================================================
// P3.3: Ragged-bottom detection on hstacks
// =============================================================================

describe("P3.3: ragged-bottom detection on hstacks", () => {
  it("emits ragged_bottom warning when hstack children have unequal heights", async () => {
    _resetForTests();
    await init();
    const child1 = el('', { id: "rb-c1", w: 200, h: 100 });
    const child2 = el('', { id: "rb-c2", w: 200, h: 83 });
    const child3 = el('', { id: "rb-c3", w: 200, h: 95 });
    const stack = hstack([child1, child2, child3], { id: "rb-stack", x: 200, y: 200, gap: 10 });

    const scene = await layout({ elements: [stack] });
    const raggedWarns = scene.warnings.filter(w => w.type === "ragged_bottom");
    assert.equal(raggedWarns.length, 1, "should emit exactly one ragged_bottom warning");
    const w = raggedWarns[0];
    assert.equal(w.elementId, "rb-stack");
    assert.deepEqual(w.childHeights, [100, 83, 95]);
    assert.equal(w.maxHeight, 100);
    assert.ok(w.message.includes("unequal heights"), "message should mention unequal heights");
    assert.ok(w.message.includes("stretch"), "message should suggest align: 'stretch'");
  });

  it("no warning when hstack children have equal heights", async () => {
    _resetForTests();
    await init();
    const child1 = el('', { id: "eq-c1", w: 200, h: 100 });
    const child2 = el('', { id: "eq-c2", w: 200, h: 100 });
    const child3 = el('', { id: "eq-c3", w: 200, h: 100 });
    const stack = hstack([child1, child2, child3], { id: "eq-stack", x: 200, y: 200, gap: 10 });

    const scene = await layout({ elements: [stack] });
    const raggedWarns = scene.warnings.filter(w => w.type === "ragged_bottom");
    assert.equal(raggedWarns.length, 0, "equal-height children should not trigger ragged_bottom");
  });

  it("no warning when hstack has align: 'stretch'", async () => {
    _resetForTests();
    await init();
    const child1 = el('', { id: "st-c1", w: 200, h: 100 });
    const child2 = el('', { id: "st-c2", w: 200, h: 60 });
    const stack = hstack([child1, child2], { id: "st-stack", x: 200, y: 200, gap: 10, align: "stretch" });

    const scene = await layout({ elements: [stack] });
    const raggedWarns = scene.warnings.filter(w => w.type === "ragged_bottom");
    assert.equal(raggedWarns.length, 0, "align: 'stretch' should suppress ragged_bottom warning");
  });

  it("no warning when hstack height difference is below threshold (5px)", async () => {
    _resetForTests();
    await init();
    const child1 = el('', { id: "th-c1", w: 200, h: 100 });
    const child2 = el('', { id: "th-c2", w: 200, h: 97 });
    const stack = hstack([child1, child2], { id: "th-stack", x: 200, y: 200, gap: 10 });

    const scene = await layout({ elements: [stack] });
    const raggedWarns = scene.warnings.filter(w => w.type === "ragged_bottom");
    assert.equal(raggedWarns.length, 0, "height difference <= 5px should not trigger warning");
  });

  it("no warning when hstack has only one child", async () => {
    _resetForTests();
    await init();
    const child1 = el('', { id: "one-c1", w: 200, h: 100 });
    const stack = hstack([child1], { id: "one-stack", x: 200, y: 200 });

    const scene = await layout({ elements: [stack] });
    const raggedWarns = scene.warnings.filter(w => w.type === "ragged_bottom");
    assert.equal(raggedWarns.length, 0, "single-child hstack should not trigger ragged_bottom");
  });
});

// =============================================================================
// P3.3: Off-center assembly detection
// =============================================================================

describe("P3.3: off-center assembly detection", () => {
  it("emits off_center_assembly warning for center-anchored group with mismatched w", async () => {
    _resetForTests();
    await init();
    // Group with center anchor and authored w=1200, but children span only 800px
    const child1 = el('', { id: "oc-c1", x: 0, y: 0, w: 400, h: 100 });
    const child2 = el('', { id: "oc-c2", x: 400, y: 0, w: 400, h: 100 });
    const g = group([child1, child2], { id: "oc-group", x: 960, y: 200, w: 1200, h: 200, anchor: "tc" });

    const scene = await layout({ elements: [g] });
    const offCenterWarns = scene.warnings.filter(w => w.type === "off_center_assembly");
    assert.equal(offCenterWarns.length, 1, "should emit exactly one off_center_assembly warning");
    const w = offCenterWarns[0];
    assert.equal(w.elementId, "oc-group");
    assert.equal(w.authoredW, 1200);
    assert.equal(w.contentW, 800);
    assert.ok(w.message.includes("bounds: 'hug'"), "message should suggest bounds: 'hug'");
  });

  it("no warning for group with bounds: 'hug'", async () => {
    _resetForTests();
    await init();
    const child1 = el('', { id: "hug-c1", x: 0, y: 0, w: 400, h: 100 });
    const child2 = el('', { id: "hug-c2", x: 400, y: 0, w: 400, h: 100 });
    const g = group([child1, child2], { id: "hug-group", x: 960, y: 200, w: 1200, h: 200, anchor: "tc", bounds: "hug" });

    const scene = await layout({ elements: [g] });
    const offCenterWarns = scene.warnings.filter(w => w.type === "off_center_assembly");
    assert.equal(offCenterWarns.length, 0, "bounds: 'hug' group should not trigger off_center_assembly");
  });

  it("no warning when authored w closely matches content w (within 20px)", async () => {
    _resetForTests();
    await init();
    const child1 = el('', { id: "close-c1", x: 0, y: 0, w: 400, h: 100 });
    const child2 = el('', { id: "close-c2", x: 400, y: 0, w: 400, h: 100 });
    // children span 800px, authored w=810 (diff = 10, below 20px threshold)
    const g = group([child1, child2], { id: "close-group", x: 960, y: 200, w: 810, h: 200, anchor: "tc" });

    const scene = await layout({ elements: [g] });
    const offCenterWarns = scene.warnings.filter(w => w.type === "off_center_assembly");
    assert.equal(offCenterWarns.length, 0, "small width difference should not trigger warning");
  });

  it("no warning for group without center anchor", async () => {
    _resetForTests();
    await init();
    const child1 = el('', { id: "tl-c1", x: 0, y: 0, w: 400, h: 100 });
    const child2 = el('', { id: "tl-c2", x: 400, y: 0, w: 400, h: 100 });
    // anchor: 'tl' — not centered
    const g = group([child1, child2], { id: "tl-group", x: 200, y: 200, w: 1200, h: 200, anchor: "tl" });

    const scene = await layout({ elements: [g] });
    const offCenterWarns = scene.warnings.filter(w => w.type === "off_center_assembly");
    assert.equal(offCenterWarns.length, 0, "non-center anchor should not trigger warning");
  });

  it("detects off-center with cc anchor too", async () => {
    _resetForTests();
    await init();
    const child1 = el('', { id: "cc-c1", x: 0, y: 0, w: 300, h: 100 });
    // children span 300px, authored w=600 (diff = 300, well above 20px)
    const g = group([child1], { id: "cc-group", x: 960, y: 540, w: 600, h: 200, anchor: "cc" });

    const scene = await layout({ elements: [g] });
    const offCenterWarns = scene.warnings.filter(w => w.type === "off_center_assembly");
    assert.equal(offCenterWarns.length, 1, "cc anchor with mismatched w should trigger warning");
  });
});

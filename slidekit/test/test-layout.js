// SlideKit Tests — M3.5 (Layout Solve Pipeline, Relative Positioning, Provenance, Scene Model)
// Updated for v2 API: all element factories replaced with el(html, layoutProps)

import { describe, it, assert } from './test-runner.js';
import {
  el, group,
  render, layout,
  init, safeRect, _resetForTests,
  below, above, rightOf, leftOf,
  centerVWith, centerHWith,
  alignTopWith, alignBottomWith,
  alignLeftWith, alignRightWith,
  centerIn,
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
// M3.2: Relative Positioning Helpers — Marker Shape
// =============================================================================

describe("M3.2: relative positioning helpers — marker shape", () => {
  it("below() returns a _rel marker with correct shape", () => {
    const m = below("ref1", { gap: 20 });
    assert.equal(m._rel, "below");
    assert.equal(m.ref, "ref1");
    assert.equal(m.gap, 20);
  });

  it("below() defaults gap to 0", () => {
    const m = below("ref1");
    assert.equal(m.gap, 0);
  });

  it("above() returns a _rel marker with correct shape", () => {
    const m = above("ref1", { gap: 15 });
    assert.equal(m._rel, "above");
    assert.equal(m.ref, "ref1");
    assert.equal(m.gap, 15);
  });

  it("above() defaults gap to 0", () => {
    const m = above("ref1");
    assert.equal(m.gap, 0);
  });

  it("rightOf() returns a _rel marker with correct shape", () => {
    const m = rightOf("ref1", { gap: 10 });
    assert.equal(m._rel, "rightOf");
    assert.equal(m.ref, "ref1");
    assert.equal(m.gap, 10);
  });

  it("rightOf() defaults gap to 0", () => {
    const m = rightOf("ref1");
    assert.equal(m.gap, 0);
  });

  it("leftOf() returns a _rel marker with correct shape", () => {
    const m = leftOf("ref1", { gap: 5 });
    assert.equal(m._rel, "leftOf");
    assert.equal(m.ref, "ref1");
    assert.equal(m.gap, 5);
  });

  it("leftOf() defaults gap to 0", () => {
    const m = leftOf("ref1");
    assert.equal(m.gap, 0);
  });

  it("centerVWith() returns a _rel marker with correct shape", () => {
    const m = centerVWith("ref1");
    assert.equal(m._rel, "centerV");
    assert.equal(m.ref, "ref1");
  });

  it("centerHWith() returns a _rel marker with correct shape", () => {
    const m = centerHWith("ref1");
    assert.equal(m._rel, "centerH");
    assert.equal(m.ref, "ref1");
  });

  it("alignTopWith() returns a _rel marker with correct shape", () => {
    const m = alignTopWith("ref1");
    assert.equal(m._rel, "alignTop");
    assert.equal(m.ref, "ref1");
  });

  it("alignBottomWith() returns a _rel marker with correct shape", () => {
    const m = alignBottomWith("ref1");
    assert.equal(m._rel, "alignBottom");
    assert.equal(m.ref, "ref1");
  });

  it("alignLeftWith() returns a _rel marker with correct shape", () => {
    const m = alignLeftWith("ref1");
    assert.equal(m._rel, "alignLeft");
    assert.equal(m.ref, "ref1");
  });

  it("alignRightWith() returns a _rel marker with correct shape", () => {
    const m = alignRightWith("ref1");
    assert.equal(m._rel, "alignRight");
    assert.equal(m.ref, "ref1");
  });

  it("centerIn() returns { x, y } _rel markers for spread usage", () => {
    const r = { x: 100, y: 50, w: 800, h: 600 };
    const m = centerIn(r);
    assert.equal(m.x._rel, "centerIn");
    assert.deepEqual(m.x.rect, r);
    assert.equal(m.y._rel, "centerIn");
    assert.deepEqual(m.y.rect, r);
  });
});

// =============================================================================
// M3.1: layout() — Basic Scene Graph Shape
// =============================================================================

describe("M3.1: layout() — basic scene graph shape", () => {
  it("returns a scene graph with expected top-level keys", async () => {
    const scene = await layout({ elements: [] });
    assert.ok("elements" in scene, "scene should have elements");
    assert.ok("transforms" in scene, "scene should have transforms");
    assert.ok("warnings" in scene, "scene should have warnings");
    assert.ok("errors" in scene, "scene should have errors");
    assert.ok("collisions" in scene, "scene should have collisions");
  });

  it("returns empty elements for empty slide", async () => {
    const scene = await layout({ elements: [] });
    assert.deepEqual(scene.elements, {});
    assert.equal(scene.errors.length, 0);
  });

  it("resolves a single static element", async () => {
    const e = el('', { id: "r1", x: 100, y: 200, w: 300, h: 150 });
    const scene = await layout({ elements: [e] });

    assert.ok(scene.elements["r1"], "r1 should exist in scene");
    assert.equal(scene.elements["r1"].resolved.x, 100);
    assert.equal(scene.elements["r1"].resolved.y, 200);
    assert.equal(scene.elements["r1"].resolved.w, 300);
    assert.equal(scene.elements["r1"].resolved.h, 150);
  });

  it("resolves multiple static elements independently", async () => {
    const e1 = el('', { id: "a", x: 0, y: 0, w: 100, h: 50 });
    const e2 = el('', { id: "b", x: 500, y: 300, w: 200, h: 100 });
    const scene = await layout({ elements: [e1, e2] });

    assert.equal(scene.elements["a"].resolved.x, 0);
    assert.equal(scene.elements["a"].resolved.y, 0);
    assert.equal(scene.elements["b"].resolved.x, 500);
    assert.equal(scene.elements["b"].resolved.y, 300);
  });

  it("preserves transforms array in scene graph", async () => {
    const transforms = [{ type: "align", axis: "y", ids: ["a", "b"] }];
    const scene = await layout({ elements: [], transforms });
    // M6 adds _transformId to each transform (deep-cloned), so check original fields are preserved
    assert.equal(scene.transforms.length, 1);
    assert.equal(scene.transforms[0].type, "align");
    assert.equal(scene.transforms[0].axis, "y");
    assert.deepEqual(scene.transforms[0].ids, ["a", "b"]);
    assert.ok(scene.transforms[0]._transformId, "should have an auto-generated _transformId");
  });
});

// =============================================================================
// M3.1: layout() — Anchor Resolution for Static Elements
// =============================================================================

describe("M3.1: layout() — anchor resolution for static elements", () => {
  it("applies tl anchor correctly (no shift)", async () => {
    const e = el('', { id: "r", x: 100, y: 200, w: 300, h: 150, anchor: "tl" });
    const scene = await layout({ elements: [e] });
    assert.equal(scene.elements["r"].resolved.x, 100);
    assert.equal(scene.elements["r"].resolved.y, 200);
  });

  it("applies cc anchor correctly", async () => {
    const e = el('', { id: "r", x: 960, y: 540, w: 400, h: 200, anchor: "cc" });
    const scene = await layout({ elements: [e] });
    // cc: x = 960 - 200 = 760, y = 540 - 100 = 440
    assert.equal(scene.elements["r"].resolved.x, 760);
    assert.equal(scene.elements["r"].resolved.y, 440);
  });

  it("applies br anchor correctly", async () => {
    const e = el('', { id: "r", x: 500, y: 400, w: 200, h: 100, anchor: "br" });
    const scene = await layout({ elements: [e] });
    // br: x = 500 - 200 = 300, y = 400 - 100 = 300
    assert.equal(scene.elements["r"].resolved.x, 300);
    assert.equal(scene.elements["r"].resolved.y, 300);
  });

  it("applies tc anchor correctly", async () => {
    const e = el('', { id: "r", x: 960, y: 0, w: 200, h: 100, anchor: "tc" });
    const scene = await layout({ elements: [e] });
    // tc: x = 960 - 100 = 860, y = 0
    assert.equal(scene.elements["r"].resolved.x, 860);
    assert.equal(scene.elements["r"].resolved.y, 0);
  });
});

// =============================================================================
// M3.2: layout() — Relative Positioning Resolution
// =============================================================================

describe("M3.2: layout() — below()", () => {
  it("positions element Y below reference bottom edge", async () => {
    const anchor = el('', { id: "anchor", x: 100, y: 100, w: 200, h: 50 });
    const target = el('', { id: "target", x: 100, y: below("anchor"), w: 200, h: 50 });
    const scene = await layout({ elements: [anchor, target] });

    // anchor bottom = 100 + 50 = 150
    assert.equal(scene.elements["target"].resolved.y, 150);
  });

  it("positions element Y below reference with gap", async () => {
    const anchor = el('', { id: "anchor", x: 100, y: 100, w: 200, h: 50 });
    const target = el('', { id: "target", x: 100, y: below("anchor", { gap: 20 }), w: 200, h: 50 });
    const scene = await layout({ elements: [anchor, target] });

    // anchor bottom = 150 + gap 20 = 170
    assert.equal(scene.elements["target"].resolved.y, 170);
  });
});

describe("M3.2: layout() — above()", () => {
  it("positions element Y above reference top edge", async () => {
    const anchor = el('', { id: "anchor", x: 100, y: 200, w: 200, h: 50 });
    const target = el('', { id: "target", x: 100, y: above("anchor"), w: 200, h: 80 });
    const scene = await layout({ elements: [anchor, target] });

    // above: y = ref.y - ownH - gap = 200 - 80 - 0 = 120
    assert.equal(scene.elements["target"].resolved.y, 120);
  });

  it("positions element Y above reference with gap", async () => {
    const anchor = el('', { id: "anchor", x: 100, y: 200, w: 200, h: 50 });
    const target = el('', { id: "target", x: 100, y: above("anchor", { gap: 10 }), w: 200, h: 80 });
    const scene = await layout({ elements: [anchor, target] });

    // above: y = 200 - 80 - 10 = 110
    assert.equal(scene.elements["target"].resolved.y, 110);
  });
});

describe("M3.2: layout() — rightOf()", () => {
  it("positions element X to the right of reference", async () => {
    const anchor = el('', { id: "anchor", x: 100, y: 100, w: 200, h: 50 });
    const target = el('', { id: "target", x: rightOf("anchor"), y: 100, w: 150, h: 50 });
    const scene = await layout({ elements: [anchor, target] });

    // rightOf: x = ref.x + ref.w = 100 + 200 = 300
    assert.equal(scene.elements["target"].resolved.x, 300);
  });

  it("positions element X to the right of reference with gap", async () => {
    const anchor = el('', { id: "anchor", x: 100, y: 100, w: 200, h: 50 });
    const target = el('', { id: "target", x: rightOf("anchor", { gap: 30 }), y: 100, w: 150, h: 50 });
    const scene = await layout({ elements: [anchor, target] });

    // rightOf: x = 300 + 30 = 330
    assert.equal(scene.elements["target"].resolved.x, 330);
  });
});

describe("M3.2: layout() — leftOf()", () => {
  it("positions element X to the left of reference", async () => {
    const anchor = el('', { id: "anchor", x: 300, y: 100, w: 200, h: 50 });
    const target = el('', { id: "target", x: leftOf("anchor"), y: 100, w: 100, h: 50 });
    const scene = await layout({ elements: [anchor, target] });

    // leftOf: x = ref.x - ownW = 300 - 100 = 200
    assert.equal(scene.elements["target"].resolved.x, 200);
  });

  it("positions element X to the left of reference with gap", async () => {
    const anchor = el('', { id: "anchor", x: 300, y: 100, w: 200, h: 50 });
    const target = el('', { id: "target", x: leftOf("anchor", { gap: 20 }), y: 100, w: 100, h: 50 });
    const scene = await layout({ elements: [anchor, target] });

    // leftOf: x = 300 - 100 - 20 = 180
    assert.equal(scene.elements["target"].resolved.x, 180);
  });
});

describe("M3.2: layout() — centerVWith()", () => {
  it("centers element vertically with reference", async () => {
    const anchor = el('', { id: "anchor", x: 100, y: 100, w: 200, h: 100 });
    const target = el('', { id: "target", x: 100, y: centerVWith("anchor"), w: 200, h: 40 });
    const scene = await layout({ elements: [anchor, target] });

    // centerV: y = ref.y + ref.h/2 - ownH/2 = 100 + 50 - 20 = 130
    assert.equal(scene.elements["target"].resolved.y, 130);
  });
});

describe("M3.2: layout() — centerHWith()", () => {
  it("centers element horizontally with reference", async () => {
    const anchor = el('', { id: "anchor", x: 100, y: 100, w: 400, h: 100 });
    const target = el('', { id: "target", x: centerHWith("anchor"), y: 250, w: 200, h: 50 });
    const scene = await layout({ elements: [anchor, target] });

    // centerH: x = ref.x + ref.w/2 - ownW/2 = 100 + 200 - 100 = 200
    assert.equal(scene.elements["target"].resolved.x, 200);
  });
});

describe("M3.2: layout() — alignTopWith()", () => {
  it("aligns element top with reference top", async () => {
    const anchor = el('', { id: "anchor", x: 100, y: 150, w: 200, h: 100 });
    const target = el('', { id: "target", x: 400, y: alignTopWith("anchor"), w: 200, h: 50 });
    const scene = await layout({ elements: [anchor, target] });

    // alignTop: y = ref.y = 150
    assert.equal(scene.elements["target"].resolved.y, 150);
  });
});

describe("M3.2: layout() — alignBottomWith()", () => {
  it("aligns element bottom with reference bottom", async () => {
    const anchor = el('', { id: "anchor", x: 100, y: 100, w: 200, h: 200 });
    const target = el('', { id: "target", x: 400, y: alignBottomWith("anchor"), w: 200, h: 50 });
    const scene = await layout({ elements: [anchor, target] });

    // alignBottom: y = ref.y + ref.h - ownH = 100 + 200 - 50 = 250
    assert.equal(scene.elements["target"].resolved.y, 250);
  });
});

describe("M3.2: layout() — alignLeftWith()", () => {
  it("aligns element left with reference left", async () => {
    const anchor = el('', { id: "anchor", x: 200, y: 100, w: 300, h: 100 });
    const target = el('', { id: "target", x: alignLeftWith("anchor"), y: 300, w: 100, h: 50 });
    const scene = await layout({ elements: [anchor, target] });

    // alignLeft: x = ref.x = 200
    assert.equal(scene.elements["target"].resolved.x, 200);
  });
});

describe("M3.2: layout() — alignRightWith()", () => {
  it("aligns element right with reference right", async () => {
    const anchor = el('', { id: "anchor", x: 200, y: 100, w: 300, h: 100 });
    const target = el('', { id: "target", x: alignRightWith("anchor"), y: 300, w: 100, h: 50 });
    const scene = await layout({ elements: [anchor, target] });

    // alignRight: x = ref.x + ref.w - ownW = 200 + 300 - 100 = 400
    assert.equal(scene.elements["target"].resolved.x, 400);
  });
});

describe("M3.2: layout() — centerIn()", () => {
  it("centers element within a given rectangle", async () => {
    const r = { x: 100, y: 50, w: 800, h: 600 };
    const e = el('', { id: "c", ...centerIn(r), w: 200, h: 100 });
    const scene = await layout({ elements: [e] });

    // centerIn x: 100 + 400 - 100 = 400
    // centerIn y: 50 + 300 - 50 = 300
    assert.equal(scene.elements["c"].resolved.x, 400);
    assert.equal(scene.elements["c"].resolved.y, 300);
  });

  it("spread pattern does not collapse to (0,0)", async () => {
    // Regression: old centerIn returned { _rel, rect } which spread _rel to
    // top-level props instead of onto x/y, so x/y silently defaulted to 0.
    const r = { x: 100, y: 100, w: 600, h: 400 };
    const e = el('', { id: "c", ...centerIn(r), w: 100, h: 100 });
    const scene = await layout({ elements: [e] });
    assert.ok(scene.elements["c"].resolved.x !== 0, "x should not be 0 — centerIn must set x");
    assert.ok(scene.elements["c"].resolved.y !== 0, "y should not be 0 — centerIn must set y");
    assert.equal(scene.elements["c"].resolved.x, 350); // 100 + 300 - 50
    assert.equal(scene.elements["c"].resolved.y, 250); // 100 + 200 - 50
  });

  it("centers element within safeRect()", async () => {
    _resetForTests();
    await init();
    try {
      const sr = safeRect(); // default: {x:120, y:90, w:1680, h:900}
      const e = el('', { id: "c", ...centerIn(sr), w: 400, h: 200 });
      const scene = await layout({ elements: [e] });

      // centerIn x: 120 + 840 - 200 = 760
      // centerIn y: 90 + 450 - 100 = 440
      assert.equal(scene.elements["c"].resolved.x, 760);
      assert.equal(scene.elements["c"].resolved.y, 440);
    } finally {
      _resetForTests();
    }
  });
});

// =============================================================================
// M3.2: Chained Relative Positioning
// =============================================================================

describe("M3.2: layout() — chained relative positioning", () => {
  it("resolves a chain: A -> B -> C", async () => {
    const a = el('', { id: "a", x: 100, y: 100, w: 200, h: 50 });
    const b = el('', { id: "b", x: 100, y: below("a", { gap: 10 }), w: 200, h: 50 });
    const c = el('', { id: "c", x: 100, y: below("b", { gap: 10 }), w: 200, h: 50 });
    const scene = await layout({ elements: [a, b, c] });

    // a: y=100
    // b: y = 100 + 50 + 10 = 160
    // c: y = 160 + 50 + 10 = 220
    assert.equal(scene.elements["a"].resolved.y, 100);
    assert.equal(scene.elements["b"].resolved.y, 160);
    assert.equal(scene.elements["c"].resolved.y, 220);
  });

  it("resolves elements declared out of dependency order", async () => {
    // c depends on b, b depends on a — but declared in reverse
    const c = el('', { id: "c", x: 100, y: below("b", { gap: 5 }), w: 100, h: 30 });
    const b = el('', { id: "b", x: 100, y: below("a", { gap: 5 }), w: 100, h: 30 });
    const a = el('', { id: "a", x: 100, y: 0, w: 100, h: 30 });
    const scene = await layout({ elements: [c, b, a] });

    // a: y=0
    // b: y = 0 + 30 + 5 = 35
    // c: y = 35 + 30 + 5 = 70
    assert.equal(scene.elements["a"].resolved.y, 0);
    assert.equal(scene.elements["b"].resolved.y, 35);
    assert.equal(scene.elements["c"].resolved.y, 70);
  });

  it("resolves mixed x and y relative positioning", async () => {
    const anchor = el('', { id: "anchor", x: 100, y: 100, w: 200, h: 100 });
    const target = el('', {
      id: "target",
      x: rightOf("anchor", { gap: 20 }),
      y: centerVWith("anchor"),
      w: 100,
      h: 40,
    });
    const scene = await layout({ elements: [anchor, target] });

    // x: rightOf = 100 + 200 + 20 = 320
    // y: centerV = 100 + 50 - 20 = 130
    assert.equal(scene.elements["target"].resolved.x, 320);
    assert.equal(scene.elements["target"].resolved.y, 130);
  });
});

// =============================================================================
// M3.1: Anchor + Relative Positioning Interaction (the double-application fix)
// =============================================================================

describe("M3.1: anchor does NOT double-apply on _rel positions", () => {
  it("_rel on y with cc anchor only applies anchor to authored x", async () => {
    // anchor element: a at (100, 100, 200x100)
    const a = el('', { id: "a", x: 100, y: 100, w: 200, h: 100 });
    // target: x=200 (authored), y=below("a") (_rel), anchor="cc", w=100, h=40
    // Expected: x should be anchor-shifted (200 - 50 = 150), y should NOT be shifted
    const target = el('', {
      id: "target",
      x: 200,
      y: below("a"),
      w: 100,
      h: 40,
      anchor: "cc",
    });
    const scene = await layout({ elements: [a, target] });

    // below: y = 100 + 100 = 200 (already top-left, no anchor shift)
    // x: cc shifts authored x: 200 - 50 = 150
    assert.equal(scene.elements["target"].resolved.x, 150);
    assert.equal(scene.elements["target"].resolved.y, 200);
  });

  it("_rel on x with br anchor only applies anchor to authored y", async () => {
    const a = el('', { id: "a", x: 100, y: 100, w: 200, h: 100 });
    const target = el('', {
      id: "target",
      x: rightOf("a", { gap: 10 }),
      y: 500,
      w: 80,
      h: 60,
      anchor: "br",
    });
    const scene = await layout({ elements: [a, target] });

    // rightOf: x = 100 + 200 + 10 = 310 (no anchor shift on _rel x)
    // y: br shifts authored y: 500 - 60 = 440
    assert.equal(scene.elements["target"].resolved.x, 310);
    assert.equal(scene.elements["target"].resolved.y, 440);
  });

  it("both x and y _rel: anchor shift is applied to neither", async () => {
    const a = el('', { id: "a", x: 100, y: 100, w: 200, h: 100 });
    const target = el('', {
      id: "target",
      x: rightOf("a"),
      y: below("a"),
      w: 100,
      h: 50,
      anchor: "cc",
    });
    const scene = await layout({ elements: [a, target] });

    // rightOf: x = 300 (no anchor shift)
    // below: y = 200 (no anchor shift)
    assert.equal(scene.elements["target"].resolved.x, 300);
    assert.equal(scene.elements["target"].resolved.y, 200);
  });
});

// =============================================================================
// M3.1: layout() — Error Handling
// =============================================================================

describe("M3.1: layout() — error handling", () => {
  it("reports error for _rel marker on w", async () => {
    const e = el('', { id: "r1", x: 0, y: 0, h: 100 });
    e.props.w = below("other"); // invalid: _rel on dimension
    const scene = await layout({ elements: [e] });

    assert.ok(scene.errors.length > 0, "should have errors");
    assert.equal(scene.errors[0].type, "invalid_rel_on_dimension");
    assert.equal(scene.errors[0].property, "w");
  });

  it("reports error for _rel marker on h", async () => {
    const e = el('', { id: "r1", x: 0, y: 0, w: 100 });
    e.props.h = below("other"); // invalid: _rel on dimension
    const scene = await layout({ elements: [e] });

    assert.ok(scene.errors.length > 0, "should have errors");
    assert.equal(scene.errors[0].type, "invalid_rel_on_dimension");
    assert.equal(scene.errors[0].property, "h");
  });

  it("reports error for unknown ref in _rel marker", async () => {
    const e = el('', { id: "r1", x: 0, y: below("nonexistent"), w: 100, h: 100 });
    const scene = await layout({ elements: [e] });

    assert.ok(scene.errors.length > 0, "should have errors");
    assert.equal(scene.errors[0].type, "unknown_ref");
    assert.equal(scene.errors[0].ref, "nonexistent");
  });

  it("detects circular dependency between two elements", async () => {
    const a = el('', { id: "a", x: 0, y: below("b"), w: 100, h: 50 });
    const b = el('', { id: "b", x: 0, y: below("a"), w: 100, h: 50 });
    const scene = await layout({ elements: [a, b] });

    assert.ok(scene.errors.length > 0, "should have errors");
    assert.equal(scene.errors[0].type, "dependency_cycle");
    assert.ok(scene.errors[0].elementIds.includes("a"), "cycle should include a");
    assert.ok(scene.errors[0].elementIds.includes("b"), "cycle should include b");
  });

  it("detects circular dependency in a 3-element chain", async () => {
    const a = el('', { id: "a", x: 0, y: below("c"), w: 100, h: 50 });
    const b = el('', { id: "b", x: 0, y: below("a"), w: 100, h: 50 });
    const c = el('', { id: "c", x: 0, y: below("b"), w: 100, h: 50 });
    const scene = await layout({ elements: [a, b, c] });

    assert.ok(scene.errors.length > 0, "should have errors");
    assert.equal(scene.errors[0].type, "dependency_cycle");
  });

  it("returns empty elements on error", async () => {
    const e = el('', { id: "r1", x: 0, y: below("nonexistent"), w: 100, h: 100 });
    const scene = await layout({ elements: [e] });

    assert.deepEqual(scene.elements, {});
  });
});

// =============================================================================
// M3.4: Provenance Tracking
// =============================================================================

describe("M3.4: provenance tracking", () => {
  it("authored position gets source:authored provenance", async () => {
    const e = el('', { id: "r1", x: 100, y: 200, w: 300, h: 150 });
    const scene = await layout({ elements: [e] });
    const prov = scene.elements["r1"].provenance;

    assert.equal(prov.x.source, "authored");
    assert.equal(prov.x.value, 100);
    assert.equal(prov.y.source, "authored");
    assert.equal(prov.y.value, 200);
  });

  it("authored dimensions get source:authored provenance", async () => {
    const e = el('', { id: "r1", x: 0, y: 0, w: 300, h: 150 });
    const scene = await layout({ elements: [e] });
    const prov = scene.elements["r1"].provenance;

    assert.equal(prov.w.source, "authored");
    assert.equal(prov.w.value, 300);
    assert.equal(prov.h.source, "authored");
    assert.equal(prov.h.value, 150);
  });

  it("_rel position gets source:constraint provenance", async () => {
    const anchor = el('', { id: "anchor", x: 0, y: 0, w: 200, h: 100 });
    const target = el('', { id: "target", x: 0, y: below("anchor", { gap: 20 }), w: 200, h: 50 });
    const scene = await layout({ elements: [anchor, target] });
    const prov = scene.elements["target"].provenance;

    assert.equal(prov.y.source, "constraint");
    assert.equal(prov.y.type, "below");
    assert.equal(prov.y.ref, "anchor");
    assert.equal(prov.y.gap, 20);
  });

  it("measured el() height gets source:measured provenance", async () => {
    _resetForTests();
    await init();
    try {
      const e = el('<p>Hello world</p>', { id: "t1", x: 0, y: 0, w: 600 });
      const scene = await layout({ elements: [e] });
      const prov = scene.elements["t1"].provenance;

      assert.equal(prov.h.source, "measured");
      assert.ok(prov.h.measuredAt, "should have measuredAt metadata");
    } finally {
      _resetForTests();
    }
  });

  it("centerIn provenance includes rect", async () => {
    const r = { x: 0, y: 0, w: 1920, h: 1080 };
    const e = el('', { id: "c", ...centerIn(r), w: 200, h: 100 });
    const scene = await layout({ elements: [e] });
    const prov = scene.elements["c"].provenance;

    assert.equal(prov.x.source, "constraint");
    assert.equal(prov.x.type, "centerIn");
    assert.deepEqual(prov.x.rect, r);
    assert.equal(prov.y.source, "constraint");
    assert.equal(prov.y.type, "centerIn");
  });
});

// =============================================================================
// M3.4: Authored Spec Preservation
// =============================================================================

describe("M3.4: authored spec preservation", () => {
  it("scene graph includes authored specs for each element", async () => {
    const e = el('', { id: "r1", x: 100, y: 200, w: 300, h: 150 });
    const scene = await layout({ elements: [e] });
    const authored = scene.elements["r1"].authored;

    assert.ok(authored, "authored spec should exist");
    assert.equal(authored.type, "el");
    assert.equal(authored.props.x, 100);
    assert.equal(authored.props.y, 200);
  });

  it("authored spec preserves original _rel markers", async () => {
    const anchor = el('', { id: "anchor", x: 0, y: 0, w: 200, h: 100 });
    const target = el('', { id: "target", x: 0, y: below("anchor", { gap: 20 }), w: 200, h: 50 });
    const scene = await layout({ elements: [anchor, target] });
    const authored = scene.elements["target"].authored;

    // The authored y should be the original _rel marker object
    assert.equal(authored.props.y._rel, "below");
    assert.equal(authored.props.y.ref, "anchor");
    assert.equal(authored.props.y.gap, 20);
  });

  it("authored spec is a deep clone (independent of original)", async () => {
    const e = el('', { id: "r1", x: 100, y: 200, w: 300, h: 150, style: { opacity: "0.5" } });
    const scene = await layout({ elements: [e] });

    // Mutate the original element props after layout
    e.props.x = 999;

    // The authored spec should still have the original value
    assert.equal(scene.elements["r1"].authored.props.x, 100);
  });
});

// =============================================================================
// M3.1: el() with explicit dimensions in Layout (replaces rule dimension tests)
// =============================================================================

describe("M3.1: el() dimensions in layout()", () => {
  it("horizontal line element uses explicit w and h", async () => {
    const e = el('', { id: "hr", x: 0, y: 100, w: 500, h: 3 });
    const scene = await layout({ elements: [e] });

    assert.equal(scene.elements["hr"].resolved.w, 500);
    assert.equal(scene.elements["hr"].resolved.h, 3);
  });

  it("vertical line element uses explicit w and h", async () => {
    const e = el('', { id: "vr", x: 100, y: 0, w: 4, h: 400 });
    const scene = await layout({ elements: [e] });

    assert.equal(scene.elements["vr"].resolved.w, 4);
    assert.equal(scene.elements["vr"].resolved.h, 400);
  });
});

// =============================================================================
// M3.1: Group Elements in Layout
// =============================================================================

describe("M3.1: group elements in layout()", () => {
  it("includes group and its children in scene graph", async () => {
    const g = group([
      el('', { id: "child1", x: 0, y: 0, w: 100, h: 50 }),
      el('', { id: "child2", x: 0, y: 60, w: 100, h: 50 }),
    ], { id: "grp", x: 200, y: 100, w: 400, h: 300 });
    const scene = await layout({ elements: [g] });

    assert.ok(scene.elements["grp"], "group should be in scene");
    assert.ok(scene.elements["child1"], "child1 should be in scene");
    assert.ok(scene.elements["child2"], "child2 should be in scene");
  });

  it("resolves group position correctly", async () => {
    const g = group([
      el('', { id: "child", x: 10, y: 20, w: 50, h: 50 }),
    ], { id: "grp", x: 200, y: 100, w: 400, h: 300 });
    const scene = await layout({ elements: [g] });

    assert.equal(scene.elements["grp"].resolved.x, 200);
    assert.equal(scene.elements["grp"].resolved.y, 100);
  });
});

// =============================================================================
// M3.3: render() with Layout Solve — Integration
// =============================================================================

describe("M3.3: render() returns { sections, layouts }", () => {
  it("returns object with sections and layouts arrays", async () => {
    _resetForTests();
    await init();
    await withContainer(async (container) => {
      const slides = [{ elements: [] }];
      const result = await render(slides, { container });
      assert.ok(result.sections, "result should have sections");
      assert.ok(result.layouts, "result should have layouts");
      assert.equal(result.sections.length, 1);
      assert.equal(result.layouts.length, 1);
    });
    _resetForTests();
  });

  it("layout result has scene graph with resolved positions", async () => {
    _resetForTests();
    await init();
    await withContainer(async (container) => {
      const slides = [{
        elements: [
          el('', { id: "r1", x: 100, y: 200, w: 300, h: 150 }),
        ],
      }];
      const result = await render(slides, { container });
      const layoutResult = result.layouts[0];
      assert.ok(layoutResult.elements["r1"], "r1 should be in layout");
      assert.equal(layoutResult.elements["r1"].resolved.x, 100);
      assert.equal(layoutResult.elements["r1"].resolved.y, 200);
    });
    _resetForTests();
  });
});

describe("M3.3: render() DOM uses resolved positions from layout solve", () => {
  it("relatively positioned element renders at resolved coordinates", async () => {
    _resetForTests();
    await init();
    await withContainer(async (container) => {
      const slides = [{
        elements: [
          el('', { id: "anchor", x: 100, y: 100, w: 200, h: 50 }),
          el('', { id: "target", x: 100, y: below("anchor", { gap: 20 }), w: 200, h: 50 }),
        ],
      }];
      await render(slides, { container });

      const targetEl = container.querySelector('[data-sk-id="target"]');
      // below: y = 100 + 50 + 20 = 170
      assert.equal(targetEl.style.top, "170px");
      assert.equal(targetEl.style.left, "100px");
    });
    _resetForTests();
  });
});

// =============================================================================
// M3.3: window.sk persistence
// =============================================================================

describe("M3.3: window.sk scene model persistence", () => {
  it("persists layouts on window.sk after render()", async () => {
    _resetForTests();
    await init();
    await withContainer(async (container) => {
      const slides = [
        { id: "slide-1", elements: [el('', { id: "r", x: 0, y: 0, w: 100, h: 100 })] },
      ];
      await render(slides, { container });

      assert.ok(window.sk, "window.sk should exist");
      assert.ok(window.sk.layouts, "window.sk should have layouts");
      assert.equal(window.sk.layouts.length, 1);
      assert.ok(window.sk.slides, "window.sk should have slides");
      assert.equal(window.sk.slides.length, 1);
      assert.equal(window.sk.slides[0].id, "slide-1");
    });
    _resetForTests();
  });

  it("window.sk.slides contains layout per slide", async () => {
    _resetForTests();
    await init();
    await withContainer(async (container) => {
      const slides = [
        { id: "s1", elements: [el('', { id: "r1", x: 0, y: 0, w: 100, h: 50 })] },
        { id: "s2", elements: [el('', { id: "r2", x: 100, y: 100, w: 200, h: 100 })] },
      ];
      await render(slides, { container });

      assert.equal(window.sk.slides.length, 2);
      assert.ok(window.sk.slides[0].layout.elements["r1"], "slide 1 layout should have r1");
      assert.ok(window.sk.slides[1].layout.elements["r2"], "slide 2 layout should have r2");
    });
    _resetForTests();
  });
});

// =============================================================================
// M3.1: Default x/y Values
// =============================================================================

describe("M3.1: default x/y values", () => {
  it("elements without explicit x/y default to 0", async () => {
    const e = el('', { id: "r", w: 100, h: 50 });
    const scene = await layout({ elements: [e] });

    assert.equal(scene.elements["r"].resolved.x, 0);
    assert.equal(scene.elements["r"].resolved.y, 0);
  });

  it("element with x=0, y=0 resolves correctly (not falsy)", async () => {
    const e = el('', { id: "r", x: 0, y: 0, w: 100, h: 50 });
    const scene = await layout({ elements: [e] });

    assert.equal(scene.elements["r"].resolved.x, 0);
    assert.equal(scene.elements["r"].resolved.y, 0);
  });
});

// =============================================================================
// M3.2: gap=0 explicitly (nullish coalescing correctness)
// =============================================================================

describe("M3.2: gap=0 works correctly (nullish coalescing)", () => {
  it("below with gap:0 positions exactly at bottom edge", async () => {
    const anchor = el('', { id: "a", x: 0, y: 0, w: 100, h: 100 });
    const target = el('', { id: "t", x: 0, y: below("a", { gap: 0 }), w: 100, h: 50 });
    const scene = await layout({ elements: [anchor, target] });

    assert.equal(scene.elements["t"].resolved.y, 100);
  });

  it("rightOf with gap:0 positions exactly at right edge", async () => {
    const anchor = el('', { id: "a", x: 50, y: 0, w: 200, h: 100 });
    const target = el('', { id: "t", x: rightOf("a", { gap: 0 }), y: 0, w: 100, h: 50 });
    const scene = await layout({ elements: [anchor, target] });

    assert.equal(scene.elements["t"].resolved.x, 250);
  });
});

// =============================================================================
// M3.1: Self-referencing cycle detection
// =============================================================================

describe("M3.1: self-referencing cycle detection", () => {
  it("detects a single-element self-reference", async () => {
    const e = el('', { id: "self", x: 0, y: below("self"), w: 100, h: 50 });
    const scene = await layout({ elements: [e] });

    assert.ok(scene.errors.length > 0, "should have errors");
    assert.equal(scene.errors[0].type, "dependency_cycle");
    assert.ok(scene.errors[0].elementIds.includes("self"), "cycle should include self");
  });
});

// =============================================================================
// M3.1: Scene graph per-element structural validation
// =============================================================================

describe("M3.1: scene graph element structure", () => {
  it("each element has id, type, authored, resolved, provenance", async () => {
    const e = el('', { id: "r1", x: 100, y: 200, w: 300, h: 150 });
    const scene = await layout({ elements: [e] });
    const node = scene.elements["r1"];

    assert.ok(node, "r1 should exist");
    assert.equal(node.id, "r1");
    assert.equal(node.type, "el");
    assert.ok(node.authored, "should have authored");
    assert.ok(node.resolved, "should have resolved");
    assert.ok(node.provenance, "should have provenance");
    assert.ok("x" in node.resolved, "resolved should have x");
    assert.ok("y" in node.resolved, "resolved should have y");
    assert.ok("w" in node.resolved, "resolved should have w");
    assert.ok("h" in node.resolved, "resolved should have h");
  });

  it("el() with HTML content has type 'el' in scene graph", async () => {
    _resetForTests();
    await init();
    try {
      const e = el('<p>Hello</p>', { id: "t1", x: 0, y: 0, w: 200, h: 50 });
      const scene = await layout({ elements: [e] });
      assert.equal(scene.elements["t1"].type, "el");
    } finally {
      _resetForTests();
    }
  });

  it("el() with image content has type 'el' in scene graph", async () => {
    const e = el('<img src="test.jpg" style="width:100%;height:100%;object-fit:cover">', { id: "img1", x: 0, y: 0, w: 200, h: 150 });
    const scene = await layout({ elements: [e] });
    assert.equal(scene.elements["img1"].type, "el");
  });

  it("el() with empty content has type 'el' in scene graph", async () => {
    const e = el('', { id: "r1", x: 0, y: 0, w: 500, h: 3 });
    const scene = await layout({ elements: [e] });
    assert.equal(scene.elements["r1"].type, "el");
  });

  it("group element has correct type in scene graph", async () => {
    const g = group([], { id: "g1", x: 0, y: 0, w: 100, h: 100 });
    const scene = await layout({ elements: [g] });
    assert.equal(scene.elements["g1"].type, "group");
  });
});

// =============================================================================
// M3.1: Group child coordinate contract
// =============================================================================

describe("M3.1: group child coordinates in scene graph", () => {
  it("group child resolved position is group-relative (not slide-absolute)", async () => {
    const g = group([
      el('', { id: "child", x: 10, y: 20, w: 50, h: 50 }),
    ], { id: "grp", x: 200, y: 100, w: 400, h: 300 });
    const scene = await layout({ elements: [g] });

    // Group children in the scene graph use group-relative coordinates,
    // because the DOM rendering nests them inside the group div.
    assert.equal(scene.elements["child"].resolved.x, 10);
    assert.equal(scene.elements["child"].resolved.y, 20);
  });
});

// =============================================================================
// M3.2: Negative coordinates and edge cases
// =============================================================================

describe("M3.2: negative and edge-case coordinates", () => {
  it("above() can produce negative y coordinate", async () => {
    const anchor = el('', { id: "anchor", x: 0, y: 30, w: 100, h: 50 });
    const target = el('', { id: "target", x: 0, y: above("anchor", { gap: 10 }), w: 100, h: 50 });
    const scene = await layout({ elements: [anchor, target] });

    // above: y = 30 - 50 - 10 = -30
    assert.equal(scene.elements["target"].resolved.y, -30);
  });

  it("leftOf() can produce negative x coordinate", async () => {
    const anchor = el('', { id: "anchor", x: 20, y: 0, w: 100, h: 50 });
    const target = el('', { id: "target", x: leftOf("anchor", { gap: 10 }), y: 0, w: 50, h: 50 });
    const scene = await layout({ elements: [anchor, target] });

    // leftOf: x = 20 - 50 - 10 = -40
    assert.equal(scene.elements["target"].resolved.x, -40);
  });

  it("element positioned at x=0 with below() works correctly", async () => {
    const anchor = el('', { id: "a", x: 0, y: 0, w: 100, h: 100 });
    const target = el('', { id: "t", x: 0, y: below("a"), w: 100, h: 50 });
    const scene = await layout({ elements: [anchor, target] });

    assert.equal(scene.elements["t"].resolved.x, 0);
    assert.equal(scene.elements["t"].resolved.y, 100);
  });
});

// =============================================================================
// M3.2: Cross-content relative positioning
// =============================================================================

describe("M3.2: cross-content relative positioning", () => {
  it("text el() positioned below box el()", async () => {
    _resetForTests();
    await init();
    try {
      const box = el('', { id: "box", x: 100, y: 50, w: 400, h: 200 });
      const caption = el('<p>Caption</p>', {
        id: "caption",
        x: 100,
        y: below("box", { gap: 16 }),
        w: 400,
        h: 40,
      });
      const scene = await layout({ elements: [box, caption] });

      // below: y = 50 + 200 + 16 = 266
      assert.equal(scene.elements["caption"].resolved.y, 266);
    } finally {
      _resetForTests();
    }
  });

  it("line el() positioned below text el()", async () => {
    _resetForTests();
    await init();
    try {
      const heading = el('<p>Heading</p>', { id: "heading", x: 100, y: 100, w: 600, h: 50 });
      const underline = el('', { id: "underline", x: 100, y: below("heading", { gap: 8 }), w: 600, h: 2, style: { background: '#ffffff' } });
      const scene = await layout({ elements: [heading, underline] });

      // below: y = 100 + 50 + 8 = 158
      assert.equal(scene.elements["underline"].resolved.y, 158);
    } finally {
      _resetForTests();
    }
  });

  it("image el() aligned right with box el()", async () => {
    const card = el('', { id: "card", x: 100, y: 100, w: 600, h: 400 });
    const photo = el('<img src="photo.jpg" style="width:100%;height:100%;object-fit:cover">', {
      id: "photo",
      x: alignRightWith("card"),
      y: alignTopWith("card"),
      w: 200,
      h: 200,
    });
    const scene = await layout({ elements: [card, photo] });

    // alignRight: x = 100 + 600 - 200 = 500
    // alignTop: y = 100
    assert.equal(scene.elements["photo"].resolved.x, 500);
    assert.equal(scene.elements["photo"].resolved.y, 100);
  });
});

// =============================================================================
// M3.4: Provenance with try/finally cleanup
// =============================================================================

describe("M3.4: provenance for measured el() with proper cleanup", () => {
  it("measured el() h provenance includes measuredAt metadata and h > 0", async () => {
    _resetForTests();
    await init();
    try {
      const e = el('<p>Hello world</p>', { id: "t1", x: 0, y: 0, w: 600 });
      const scene = await layout({ elements: [e] });
      const prov = scene.elements["t1"].provenance;

      assert.equal(prov.h.source, "measured");
      assert.ok(prov.h.measuredAt, "should have measuredAt metadata");
      // Verify authored h was absent
      assert.equal(scene.elements["t1"].authored.props.h, undefined);
      // Verify resolved height is positive
      assert.ok(scene.elements["t1"].resolved.h > 0, "measured height should be > 0");
    } finally {
      _resetForTests();
    }
  });
});

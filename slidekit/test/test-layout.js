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
  centerIn, placeBetween, between,
  matchWidthOf, matchHeightOf,
  centerHOnSlide, centerVOnSlide,
  vstack, hstack, panel,
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

  // -- Bare gap argument (string or number) --

  it("below() accepts bare pixel number as gap", () => {
    const m = below("ref1", 24);
    assert.equal(m._rel, "below");
    assert.equal(m.ref, "ref1");
    assert.equal(m.gap, 24);
  });

  it("below() accepts bare spacing token as gap", () => {
    const m = below("ref1", "sm");
    assert.equal(m._rel, "below");
    assert.equal(m.ref, "ref1");
    assert.equal(m.gap, 16); // sm = 16px
  });

  it("above() accepts bare pixel number as gap", () => {
    const m = above("ref1", 10);
    assert.equal(m._rel, "above");
    assert.equal(m.ref, "ref1");
    assert.equal(m.gap, 10);
  });

  it("above() accepts bare spacing token as gap", () => {
    const m = above("ref1", "md");
    assert.equal(m._rel, "above");
    assert.equal(m.ref, "ref1");
    assert.equal(m.gap, 24); // md = 24px
  });

  it("rightOf() accepts bare pixel number as gap", () => {
    const m = rightOf("ref1", 30);
    assert.equal(m._rel, "rightOf");
    assert.equal(m.ref, "ref1");
    assert.equal(m.gap, 30);
  });

  it("rightOf() accepts bare spacing token as gap", () => {
    const m = rightOf("ref1", "lg");
    assert.equal(m._rel, "rightOf");
    assert.equal(m.ref, "ref1");
    assert.equal(m.gap, 32); // lg = 32px
  });

  it("leftOf() accepts bare pixel number as gap", () => {
    const m = leftOf("ref1", 15);
    assert.equal(m._rel, "leftOf");
    assert.equal(m.ref, "ref1");
    assert.equal(m.gap, 15);
  });

  it("leftOf() accepts bare spacing token as gap", () => {
    const m = leftOf("ref1", "xs");
    assert.equal(m._rel, "leftOf");
    assert.equal(m.ref, "ref1");
    assert.equal(m.gap, 8); // xs = 8px
  });

  it("below() with bare 0 gives gap of 0", () => {
    const m = below("ref1", 0);
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

// =============================================================================
// M3.2: layout() — negative gaps (intentional overlap)
// =============================================================================

describe("M3.2: layout() — negative gap constraints", () => {
  it("below() with negative gap creates overlap", async () => {
    const anchor = el('', { id: "anchor", x: 100, y: 100, w: 200, h: 100 });
    const target = el('', { id: "target", x: 100, y: below("anchor", { gap: -20 }), w: 200, h: 50 });
    const scene = await layout({ elements: [anchor, target] });

    // below: y = ref.y + ref.h + gap = 100 + 100 + (-20) = 180
    assert.equal(scene.elements["target"].resolved.y, 180);
  });

  it("rightOf() with negative gap creates overlap", async () => {
    const anchor = el('', { id: "anchor", x: 100, y: 100, w: 200, h: 50 });
    const target = el('', { id: "target", x: rightOf("anchor", { gap: -10 }), y: 100, w: 150, h: 50 });
    const scene = await layout({ elements: [anchor, target] });

    // rightOf: x = ref.x + ref.w + gap = 100 + 200 + (-10) = 290
    assert.equal(scene.elements["target"].resolved.x, 290);
  });

  it("above() with negative gap creates overlap", async () => {
    const anchor = el('', { id: "anchor", x: 100, y: 200, w: 200, h: 50 });
    const target = el('', { id: "target", x: 100, y: above("anchor", { gap: -15 }), w: 200, h: 80 });
    const scene = await layout({ elements: [anchor, target] });

    // above: y = ref.y - ownH - gap = 200 - 80 - (-15) = 135
    assert.equal(scene.elements["target"].resolved.y, 135);
  });

  it("leftOf() with negative gap creates overlap", async () => {
    const anchor = el('', { id: "anchor", x: 300, y: 100, w: 200, h: 50 });
    const target = el('', { id: "target", x: leftOf("anchor", { gap: -15 }), y: 100, w: 100, h: 50 });
    const scene = await layout({ elements: [anchor, target] });

    // leftOf: x = ref.x - ownW - gap = 300 - 100 - (-15) = 215
    assert.equal(scene.elements["target"].resolved.x, 215);
  });

  it("below() with negative gap as bare number", async () => {
    const anchor = el('', { id: "anchor", x: 100, y: 100, w: 200, h: 100 });
    const target = el('', { id: "target", x: 100, y: below("anchor", -20), w: 200, h: 50 });
    const scene = await layout({ elements: [anchor, target] });

    // below: y = 100 + 100 + (-20) = 180
    assert.equal(scene.elements["target"].resolved.y, 180);
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

// =============================================================================
// P1.1: Semantic spacing tokens — relational positioning
// =============================================================================

describe("P1.1: below() with spacing token", () => {
  it("resolves gap: 'md' to 24px gap", async () => {
    _resetForTests();
    await init();
    const anchor = el('', { id: "anchor", x: 100, y: 100, w: 200, h: 50 });
    const target = el('', { id: "target", x: 100, y: below("anchor", { gap: "md" }), w: 200, h: 50 });
    const scene = await layout({ elements: [anchor, target] });

    // anchor bottom = 100 + 50 = 150; + md (24) = 174
    assert.equal(scene.elements["target"].resolved.y, 174);
  });
});

// =============================================================================
// Bare gap argument — layout integration tests
// =============================================================================

describe("Bare gap argument — layout integration", () => {
  it("below('ref', 'sm') positions with 16px gap", async () => {
    _resetForTests();
    await init();
    const anchor = el('', { id: "anchor", x: 100, y: 100, w: 200, h: 50 });
    const target = el('', { id: "target", x: 100, y: below("anchor", "sm"), w: 200, h: 50 });
    const scene = await layout({ elements: [anchor, target] });

    // anchor bottom = 100 + 50 = 150; + sm (16) = 166
    assert.equal(scene.elements["target"].resolved.y, 166);
  });

  it("below('ref', 24) positions with 24px gap", async () => {
    _resetForTests();
    await init();
    const anchor = el('', { id: "anchor", x: 100, y: 100, w: 200, h: 50 });
    const target = el('', { id: "target", x: 100, y: below("anchor", 24), w: 200, h: 50 });
    const scene = await layout({ elements: [anchor, target] });

    // anchor bottom = 100 + 50 = 150; + 24 = 174
    assert.equal(scene.elements["target"].resolved.y, 174);
  });

  it("above('ref', 'md') positions with 24px gap", async () => {
    _resetForTests();
    await init();
    const anchor = el('', { id: "anchor", x: 100, y: 200, w: 200, h: 100 });
    const target = el('', { id: "target", x: 100, y: above("anchor", "md"), w: 200, h: 80 });
    const scene = await layout({ elements: [anchor, target] });

    // above: y = ref.y - ownH - gap = 200 - 80 - 24 = 96
    assert.equal(scene.elements["target"].resolved.y, 96);
  });

  it("rightOf('ref', 16) positions with 16px gap", async () => {
    _resetForTests();
    await init();
    const anchor = el('', { id: "anchor", x: 100, y: 100, w: 200, h: 50 });
    const target = el('', { id: "target", x: rightOf("anchor", 16), y: 100, w: 150, h: 50 });
    const scene = await layout({ elements: [anchor, target] });

    // rightOf: x = ref.x + ref.w + gap = 100 + 200 + 16 = 316
    assert.equal(scene.elements["target"].resolved.x, 316);
  });

  it("leftOf('ref', 'xs') positions with 8px gap", async () => {
    _resetForTests();
    await init();
    const anchor = el('', { id: "anchor", x: 300, y: 100, w: 200, h: 50 });
    const target = el('', { id: "target", x: leftOf("anchor", "xs"), y: 100, w: 100, h: 50 });
    const scene = await layout({ elements: [anchor, target] });

    // leftOf: x = ref.x - ownW - gap = 300 - 100 - 8 = 192
    assert.equal(scene.elements["target"].resolved.x, 192);
  });

  it("bare gap gives same result as object form", async () => {
    _resetForTests();
    await init();
    const a1 = el('', { id: "a1", x: 100, y: 100, w: 200, h: 50 });
    const t1 = el('', { id: "t1", x: 100, y: below("a1", "lg"), w: 200, h: 50 });

    const a2 = el('', { id: "a2", x: 100, y: 100, w: 200, h: 50 });
    const t2 = el('', { id: "t2", x: 100, y: below("a2", { gap: "lg" }), w: 200, h: 50 });

    const scene1 = await layout({ elements: [a1, t1] });
    _resetForTests();
    await init();
    const scene2 = await layout({ elements: [a2, t2] });

    assert.equal(
      scene1.elements["t1"].resolved.y,
      scene2.elements["t2"].resolved.y,
      "bare 'lg' and { gap: 'lg' } should produce the same y position"
    );
  });
});

// =============================================================================
// P1.2: Hierarchical Scene Model
// =============================================================================

describe("P1.2: rootIds — top-level element tracking", () => {
  it("root elements have parentId: null and appear in rootIds", async () => {
    _resetForTests();
    await init();
    const a = el('', { id: "a", x: 0, y: 0, w: 100, h: 50 });
    const b = el('', { id: "b", x: 200, y: 0, w: 100, h: 50 });
    const scene = await layout({ elements: [a, b] });

    assert.equal(scene.elements["a"].parentId, null);
    assert.equal(scene.elements["b"].parentId, null);
    assert.ok(scene.rootIds.includes("a"), "rootIds should contain 'a'");
    assert.ok(scene.rootIds.includes("b"), "rootIds should contain 'b'");
    assert.equal(scene.rootIds.length, 2, "rootIds should have exactly 2 elements");
  });

  it("rootIds contains only top-level elements (not children of groups/stacks)", async () => {
    _resetForTests();
    await init();
    const g = group([
      el('', { id: "child1", x: 10, y: 10, w: 50, h: 30 }),
    ], { id: "grp", x: 100, y: 100, w: 200, h: 150 });
    const standalone = el('', { id: "standalone", x: 400, y: 0, w: 100, h: 50 });
    const scene = await layout({ elements: [g, standalone] });

    assert.ok(scene.rootIds.includes("grp"), "rootIds should contain 'grp'");
    assert.ok(scene.rootIds.includes("standalone"), "rootIds should contain 'standalone'");
    assert.ok(!scene.rootIds.includes("child1"), "rootIds should NOT contain group child 'child1'");
  });
});

describe("P1.2: group hierarchy — parentId and children", () => {
  it("group children have parentId set to the group's ID", async () => {
    _resetForTests();
    await init();
    const g = group([
      el('', { id: "gc1", x: 0, y: 0, w: 50, h: 30 }),
      el('', { id: "gc2", x: 60, y: 0, w: 50, h: 30 }),
    ], { id: "grp", x: 100, y: 100, w: 200, h: 150 });
    const scene = await layout({ elements: [g] });

    assert.equal(scene.elements["gc1"].parentId, "grp");
    assert.equal(scene.elements["gc2"].parentId, "grp");
  });

  it("group has children array listing child IDs in order", async () => {
    _resetForTests();
    await init();
    const g = group([
      el('', { id: "gc1", x: 0, y: 0, w: 50, h: 30 }),
      el('', { id: "gc2", x: 60, y: 0, w: 50, h: 30 }),
    ], { id: "grp", x: 100, y: 100, w: 200, h: 150 });
    const scene = await layout({ elements: [g] });

    assert.deepEqual(scene.elements["grp"].children, ["gc1", "gc2"]);
  });

  it("group children have localResolved equal to resolved (group-relative)", async () => {
    _resetForTests();
    await init();
    const g = group([
      el('', { id: "gc1", x: 10, y: 20, w: 50, h: 30 }),
    ], { id: "grp", x: 200, y: 100, w: 200, h: 150 });
    const scene = await layout({ elements: [g] });

    // Group children's resolved is group-relative; localResolved should match
    const gc1 = scene.elements["gc1"];
    assert.equal(gc1.localResolved.x, gc1.resolved.x);
    assert.equal(gc1.localResolved.y, gc1.resolved.y);
    assert.equal(gc1.localResolved.w, gc1.resolved.w);
    assert.equal(gc1.localResolved.h, gc1.resolved.h);
  });
});

describe("P1.2: vstack hierarchy — parentId, children, localResolved", () => {
  it("vstack children have parentId set to the stack's ID", async () => {
    _resetForTests();
    await init();
    const stack = vstack([
      el('', { id: "sc1", w: 100, h: 40 }),
      el('', { id: "sc2", w: 100, h: 60 }),
    ], { id: "vs1", x: 200, y: 100, w: 200, gap: 10 });
    const scene = await layout({ elements: [stack] });

    assert.equal(scene.elements["sc1"].parentId, "vs1");
    assert.equal(scene.elements["sc2"].parentId, "vs1");
  });

  it("vstack has children array listing child IDs in order", async () => {
    _resetForTests();
    await init();
    const stack = vstack([
      el('', { id: "sc1", w: 100, h: 40 }),
      el('', { id: "sc2", w: 100, h: 60 }),
    ], { id: "vs1", x: 200, y: 100, w: 200, gap: 10 });
    const scene = await layout({ elements: [stack] });

    assert.deepEqual(scene.elements["vs1"].children, ["sc1", "sc2"]);
  });

  it("vstack children have localResolved relative to stack origin", async () => {
    _resetForTests();
    await init();
    const stack = vstack([
      el('', { id: "sc1", w: 100, h: 40 }),
      el('', { id: "sc2", w: 100, h: 60 }),
    ], { id: "vs1", x: 200, y: 100, w: 200, gap: 10 });
    const scene = await layout({ elements: [stack] });

    // sc1 absolute: (200, 100), stack at (200, 100) => local (0, 0)
    assert.equal(scene.elements["sc1"].localResolved.x, 0);
    assert.equal(scene.elements["sc1"].localResolved.y, 0);

    // sc2 absolute: (200, 150), stack at (200, 100) => local (0, 50)
    assert.equal(scene.elements["sc2"].localResolved.x, 0);
    assert.equal(scene.elements["sc2"].localResolved.y, 50);
  });

  it("vstack not in rootIds but its children are not either", async () => {
    _resetForTests();
    await init();
    const stack = vstack([
      el('', { id: "sc1", w: 100, h: 40 }),
    ], { id: "vs1", x: 0, y: 0, w: 200 });
    const scene = await layout({ elements: [stack] });

    assert.ok(scene.rootIds.includes("vs1"), "rootIds should contain the stack");
    assert.ok(!scene.rootIds.includes("sc1"), "rootIds should NOT contain stack child");
  });
});

describe("P1.2: hstack hierarchy — parentId, children, localResolved", () => {
  it("hstack children have parentId and localResolved relative to stack", async () => {
    _resetForTests();
    await init();
    const stack = hstack([
      el('', { id: "hc1", w: 80, h: 40 }),
      el('', { id: "hc2", w: 120, h: 40 }),
    ], { id: "hs1", x: 300, y: 200, gap: 20 });
    const scene = await layout({ elements: [stack] });

    assert.equal(scene.elements["hc1"].parentId, "hs1");
    assert.equal(scene.elements["hc2"].parentId, "hs1");
    assert.deepEqual(scene.elements["hs1"].children, ["hc1", "hc2"]);

    // hc1 absolute: (300, 200), stack at (300, 200) => local (0, 0)
    assert.equal(scene.elements["hc1"].localResolved.x, 0);
    assert.equal(scene.elements["hc1"].localResolved.y, 0);

    // hc2 absolute: (300+80+20=400, 200), stack at (300, 200) => local (100, 0)
    assert.equal(scene.elements["hc2"].localResolved.x, 100);
    assert.equal(scene.elements["hc2"].localResolved.y, 0);
  });
});

describe("P1.2: panel hierarchy — _internal flag", () => {
  it("panel synthetic elements (bgRect, childStack) have _internal: true", async () => {
    _resetForTests();
    await init();
    const p = panel(
      [el('', { id: "pc1", w: 200, h: 40 })],
      { id: "pnl", x: 100, y: 100, w: 300 }
    );
    const scene = await layout({ elements: [p] });

    // Panel is a group with children [bgRect, childStack]
    const pnlEntry = scene.elements["pnl"];
    assert.ok(pnlEntry.children.length >= 2, "panel should have at least 2 children");

    const bgRectId = pnlEntry.children[0];
    const childStackId = pnlEntry.children[1];

    assert.equal(scene.elements[bgRectId]._internal, true, "bgRect should be _internal");
    assert.equal(scene.elements[childStackId]._internal, true, "childStack should be _internal");
  });

  it("panel user children have _internal: false", async () => {
    _resetForTests();
    await init();
    const p = panel(
      [el('', { id: "pc1", w: 200, h: 40 })],
      { id: "pnl", x: 100, y: 100, w: 300 }
    );
    const scene = await layout({ elements: [p] });

    assert.equal(scene.elements["pc1"]._internal, false, "user child should not be _internal");
  });

  it("panel group itself has _internal: false", async () => {
    _resetForTests();
    await init();
    const p = panel(
      [el('', { id: "pc1", w: 200, h: 40 })],
      { id: "pnl", x: 100, y: 100, w: 300 }
    );
    const scene = await layout({ elements: [p] });

    assert.equal(scene.elements["pnl"]._internal, false, "panel group should not be _internal");
  });
});

describe("P1.2: root elements — localResolved equals resolved", () => {
  it("root element localResolved matches resolved", async () => {
    _resetForTests();
    await init();
    const a = el('', { id: "root1", x: 150, y: 250, w: 100, h: 50 });
    const scene = await layout({ elements: [a] });

    const entry = scene.elements["root1"];
    assert.equal(entry.localResolved.x, entry.resolved.x);
    assert.equal(entry.localResolved.y, entry.resolved.y);
    assert.equal(entry.localResolved.w, entry.resolved.w);
    assert.equal(entry.localResolved.h, entry.resolved.h);
  });
});

describe("P1.2: leaf elements have empty children array", () => {
  it("plain el() has empty children array", async () => {
    _resetForTests();
    await init();
    const a = el('', { id: "leaf", x: 0, y: 0, w: 100, h: 50 });
    const scene = await layout({ elements: [a] });

    assert.deepEqual(scene.elements["leaf"].children, []);
  });
});

describe("P1.2: nested structures — group inside vstack", () => {
  it("group inside vstack has correct hierarchy chain", async () => {
    _resetForTests();
    await init();
    const innerGroup = group([
      el('', { id: "nested-child", x: 5, y: 5, w: 40, h: 20 }),
    ], { id: "inner-grp", w: 100, h: 60 });

    const stack = vstack([
      el('', { id: "top-item", w: 100, h: 30 }),
      innerGroup,
    ], { id: "vs-outer", x: 100, y: 100, w: 200, gap: 10 });
    const scene = await layout({ elements: [stack] });

    // Stack is root
    assert.equal(scene.elements["vs-outer"].parentId, null);
    assert.ok(scene.rootIds.includes("vs-outer"));

    // top-item is child of stack
    assert.equal(scene.elements["top-item"].parentId, "vs-outer");

    // inner-grp is child of stack
    assert.equal(scene.elements["inner-grp"].parentId, "vs-outer");

    // nested-child is child of inner-grp (not of stack)
    assert.equal(scene.elements["nested-child"].parentId, "inner-grp");

    // Verify children arrays
    assert.deepEqual(scene.elements["vs-outer"].children, ["top-item", "inner-grp"]);
    assert.deepEqual(scene.elements["inner-grp"].children, ["nested-child"]);

    // nested-child should NOT be in rootIds
    assert.ok(!scene.rootIds.includes("nested-child"));
    assert.ok(!scene.rootIds.includes("top-item"));
    assert.ok(!scene.rootIds.includes("inner-grp"));
  });
});

describe("P1.2: nested structures — vstack inside group", () => {
  it("vstack inside group preserves group ancestry for stack children", async () => {
    _resetForTests();
    await init();
    // This tests the fix for walk([child], null) dropping parentGroupId
    const innerStack = vstack([
      el('', { id: "sc1", w: 80, h: 30 }),
      el('', { id: "sc2", w: 80, h: 30 }),
    ], { id: "inner-vs", w: 100, gap: 5 });

    const g = group([
      el('', { id: "label", x: 0, y: 0, w: 100, h: 20 }),
      innerStack,
    ], { id: "grp", x: 200, y: 100, w: 200, h: 200 });
    const scene = await layout({ elements: [g] });

    // Group is root
    assert.equal(scene.elements["grp"].parentId, null);
    assert.ok(scene.rootIds.includes("grp"));

    // label is child of group
    assert.equal(scene.elements["label"].parentId, "grp");

    // inner-vs is child of group (via groupParent, not a root element)
    assert.equal(scene.elements["inner-vs"].parentId, "grp");
    assert.ok(!scene.rootIds.includes("inner-vs"), "inner stack should NOT be in rootIds");

    // sc1/sc2 are children of inner-vs (via stackParent)
    assert.equal(scene.elements["sc1"].parentId, "inner-vs");
    assert.equal(scene.elements["sc2"].parentId, "inner-vs");

    // Group's children includes label and inner-vs
    assert.deepEqual(scene.elements["grp"].children, ["label", "inner-vs"]);
    assert.deepEqual(scene.elements["inner-vs"].children, ["sc1", "sc2"]);

    // None of the nested elements should be in rootIds
    assert.ok(!scene.rootIds.includes("label"));
    assert.ok(!scene.rootIds.includes("sc1"));
    assert.ok(!scene.rootIds.includes("sc2"));
  });
});

// =============================================================================
// P2.2: placeBetween() — marker shape
// =============================================================================

describe("P2.2: placeBetween() — marker shape", () => {
  it("returns correct _rel marker with two string refs and default bias", () => {
    const m = placeBetween("a", "b");
    assert.equal(m._rel, "between");
    assert.equal(m.ref, "a");
    assert.equal(m.ref2, "b");
    assert.equal(m.bias, 0.35);
  });

  it("returns correct _rel marker with numeric bottom and custom bias", () => {
    const m = placeBetween("a", 500, { bias: 0.5 });
    assert.equal(m._rel, "between");
    assert.equal(m.ref, "a");
    assert.equal(m.ref2, 500);
    assert.equal(m.bias, 0.5);
  });
});

// =============================================================================
// P2.2: placeBetween() — layout integration
// =============================================================================

describe("P2.2: layout() — placeBetween()", () => {
  it("positions element between two refs with default bias (0.35)", async () => {
    // topRef: y=100, h=50 => bottom edge = 150
    // bottomRef: y=400 => top edge = 400
    // target: h=40
    // availableSlack = 400 - 150 - 40 = 210
    // y = 150 + 210 * 0.35 = 150 + 73.5 = 223.5
    const top = el('', { id: "top", x: 0, y: 100, w: 200, h: 50 });
    const bottom = el('', { id: "bottom", x: 0, y: 400, w: 200, h: 50 });
    const target = el('', { id: "target", x: 0, y: placeBetween("top", "bottom"), w: 200, h: 40 });
    const scene = await layout({ elements: [top, bottom, target] });

    assert.equal(scene.elements["target"].resolved.y, 150 + 210 * 0.35);
  });

  it("positions element between ref and absolute Y", async () => {
    // topRef: y=100, h=50 => bottom edge = 150
    // bottomY = 500 (absolute)
    // target: h=60
    // availableSlack = 500 - 150 - 60 = 290
    // y = 150 + 290 * 0.35 = 150 + 101.5 = 251.5
    const top = el('', { id: "top", x: 0, y: 100, w: 200, h: 50 });
    const target = el('', { id: "target", x: 0, y: placeBetween("top", 500), w: 200, h: 60 });
    const scene = await layout({ elements: [top, target] });

    assert.equal(scene.elements["target"].resolved.y, 150 + 290 * 0.35);
  });

  it("bias=0 places at top edge", async () => {
    // topRef bottom edge = 150, bottomRef top edge = 400, target h=40
    // availableSlack = 400 - 150 - 40 = 210
    // y = 150 + 210 * 0 = 150
    const top = el('', { id: "top", x: 0, y: 100, w: 200, h: 50 });
    const bottom = el('', { id: "bottom", x: 0, y: 400, w: 200, h: 50 });
    const target = el('', { id: "target", x: 0, y: placeBetween("top", "bottom", { bias: 0 }), w: 200, h: 40 });
    const scene = await layout({ elements: [top, bottom, target] });

    assert.equal(scene.elements["target"].resolved.y, 150);
  });

  it("bias=1 places at bottom edge minus element height", async () => {
    // topRef bottom edge = 150, bottomRef top edge = 400, target h=40
    // availableSlack = 400 - 150 - 40 = 210
    // y = 150 + 210 * 1 = 360
    // bottom edge of target = 360 + 40 = 400 = flush with bottomRef top
    const top = el('', { id: "top", x: 0, y: 100, w: 200, h: 50 });
    const bottom = el('', { id: "bottom", x: 0, y: 400, w: 200, h: 50 });
    const target = el('', { id: "target", x: 0, y: placeBetween("top", "bottom", { bias: 1 }), w: 200, h: 40 });
    const scene = await layout({ elements: [top, bottom, target] });

    assert.equal(scene.elements["target"].resolved.y, 360);
  });

  it("negative slack falls back to topEdge + 8 and emits warning", async () => {
    // topRef bottom edge = 150, bottomRef top edge = 170
    // target h=100 => availableSlack = 170 - 150 - 100 = -80
    // Fallback: y = 150 + 8 = 158
    const top = el('', { id: "top", x: 0, y: 100, w: 200, h: 50 });
    const bottom = el('', { id: "bottom", x: 0, y: 170, w: 200, h: 50 });
    const target = el('', { id: "target", x: 0, y: placeBetween("top", "bottom"), w: 200, h: 100 });
    const scene = await layout({ elements: [top, bottom, target] });

    assert.equal(scene.elements["target"].resolved.y, 158);
    // Check that a warning was emitted
    const w = scene.warnings.find(w => w.type === "between_no_fit" && w.elementId === "target");
    assert.ok(w, "expected a between_no_fit warning");
  });
});

// =============================================================================
// between() — marker shape
// =============================================================================

describe("between() — marker shape", () => {
  it("returns correct marker with two string refs, axis, and default bias", () => {
    const m = between("a", "b", { axis: "x" });
    assert.equal(m._rel, "between");
    assert.equal(m.ref, "a");
    assert.equal(m.ref2, "b");
    assert.equal(m.bias, 0.5);
    assert.equal(m.axis, "x");
  });

  it("accepts custom bias", () => {
    const m = between("a", "b", { axis: "y", bias: 0.3 });
    assert.equal(m.bias, 0.3);
    assert.equal(m.axis, "y");
  });

  it("accepts numeric refB", () => {
    const m = between("a", 500, { axis: "y" });
    assert.equal(m.ref, "a");
    assert.equal(m.ref2, 500);
    assert.equal(m.axis, "y");
  });

  it("swaps when refA is numeric — ref becomes the string, bias inverts", () => {
    const m = between(100, "b", { axis: "x", bias: 0.3 });
    assert.equal(m.ref, "b");
    assert.equal(m.ref2, 100);
    assert.equal(m.bias, 0.7);
    assert.equal(m.axis, "x");
  });

  it("throws if both refs are numbers", () => {
    assert.throws(() => between(100, 200, { axis: "x" }), /at least one element ID/);
  });

  it("clamps bias to [0, 1]", () => {
    const lo = between("a", "b", { axis: "x", bias: -0.5 });
    assert.equal(lo.bias, 0);
    const hi = between("a", "b", { axis: "x", bias: 2.0 });
    assert.equal(hi.bias, 1);
  });
});

// =============================================================================
// between() — layout integration (X axis)
// =============================================================================

describe("layout() — between() on X axis", () => {
  it("centers element horizontally between two refs (default bias 0.5)", async () => {
    // leftRef: x=100, w=200 => right edge = 300
    // rightRef: x=500 => left edge = 500
    // target: w=80
    // availableSlack = 500 - 300 - 80 = 120
    // x = 300 + 120 * 0.5 = 360
    const left = el('', { id: "left", x: 100, y: 0, w: 200, h: 50 });
    const right = el('', { id: "right", x: 500, y: 0, w: 200, h: 50 });
    const target = el('', { id: "target", x: between("left", "right", { axis: "x" }), y: 0, w: 80, h: 50 });
    const scene = await layout({ elements: [left, right, target] });

    assert.equal(scene.elements["target"].resolved.x, 300 + 120 * 0.5);
  });

  it("between on X with bias=0 places at left edge", async () => {
    const left = el('', { id: "left", x: 100, y: 0, w: 200, h: 50 });
    const right = el('', { id: "right", x: 500, y: 0, w: 200, h: 50 });
    const target = el('', { id: "target", x: between("left", "right", { axis: "x", bias: 0 }), y: 0, w: 80, h: 50 });
    const scene = await layout({ elements: [left, right, target] });

    assert.equal(scene.elements["target"].resolved.x, 300);
  });

  it("between on X with bias=1 places at right edge minus width", async () => {
    const left = el('', { id: "left", x: 100, y: 0, w: 200, h: 50 });
    const right = el('', { id: "right", x: 500, y: 0, w: 200, h: 50 });
    const target = el('', { id: "target", x: between("left", "right", { axis: "x", bias: 1 }), y: 0, w: 80, h: 50 });
    const scene = await layout({ elements: [left, right, target] });

    // x = 300 + (500 - 300 - 80) * 1 = 300 + 120 = 420
    // right edge of target = 420 + 80 = 500 = flush with rightRef left edge
    assert.equal(scene.elements["target"].resolved.x, 420);
  });

  it("between on X with numeric refB", async () => {
    // leftRef right edge = 300, raw rightEdge = 600
    // target w=100, slack = 600 - 300 - 100 = 200
    // x = 300 + 200 * 0.5 = 400
    const left = el('', { id: "left", x: 100, y: 0, w: 200, h: 50 });
    const target = el('', { id: "target", x: between("left", 600, { axis: "x" }), y: 0, w: 100, h: 50 });
    const scene = await layout({ elements: [left, target] });

    assert.equal(scene.elements["target"].resolved.x, 400);
  });
});

// =============================================================================
// between() — layout integration (Y axis)
// =============================================================================

describe("layout() — between() on Y axis", () => {
  it("centers element vertically between two refs (default bias 0.5)", async () => {
    // topRef: y=100, h=50 => bottom edge = 150
    // bottomRef: y=400 => top edge = 400
    // target: h=40
    // availableSlack = 400 - 150 - 40 = 210
    // y = 150 + 210 * 0.5 = 255
    const top = el('', { id: "top", x: 0, y: 100, w: 200, h: 50 });
    const bottom = el('', { id: "bottom", x: 0, y: 400, w: 200, h: 50 });
    const target = el('', { id: "target", x: 0, y: between("top", "bottom", { axis: "y" }), w: 200, h: 40 });
    const scene = await layout({ elements: [top, bottom, target] });

    assert.equal(scene.elements["target"].resolved.y, 150 + 210 * 0.5);
  });

  it("between on Y with numeric refB", async () => {
    // topRef bottom edge = 150, raw bottomEdge = 500
    // target h=60, slack = 500 - 150 - 60 = 290
    // y = 150 + 290 * 0.5 = 295
    const top = el('', { id: "top", x: 0, y: 100, w: 200, h: 50 });
    const target = el('', { id: "target", x: 0, y: between("top", 500, { axis: "y" }), w: 200, h: 60 });
    const scene = await layout({ elements: [top, target] });

    assert.equal(scene.elements["target"].resolved.y, 150 + 290 * 0.5);
  });

  it("negative slack emits between_no_fit warning", async () => {
    const top = el('', { id: "top", x: 0, y: 100, w: 200, h: 50 });
    const bottom = el('', { id: "bottom", x: 0, y: 170, w: 200, h: 50 });
    const target = el('', { id: "target", x: 0, y: between("top", "bottom", { axis: "y" }), w: 200, h: 100 });
    const scene = await layout({ elements: [top, bottom, target] });

    // Fallback: y = 150 + 8 = 158
    assert.equal(scene.elements["target"].resolved.y, 158);
    const w = scene.warnings.find(w => w.type === "between_no_fit" && w.elementId === "target");
    assert.ok(w, "expected a between_no_fit warning");
  });

  it("axis mismatch emits between_axis_mismatch warning", async () => {
    const left = el('', { id: "left", x: 100, y: 0, w: 200, h: 50 });
    const right = el('', { id: "right", x: 500, y: 0, w: 200, h: 50 });
    // axis: 'x' but assigned to y prop
    const target = el('', { id: "target", x: 0, y: between("left", "right", { axis: "x" }), w: 200, h: 40 });
    const scene = await layout({ elements: [left, right, target] });

    const w = scene.warnings.find(w => w.type === "between_axis_mismatch" && w.elementId === "target");
    assert.ok(w, "expected a between_axis_mismatch warning");
  });
});

// =============================================================================
// P2.5: group({ bounds: 'hug' })
// =============================================================================

describe("P2.5: group({ bounds: 'hug' })", () => {
  it("computes correct w/h from children bounding box", async () => {
    // Child 1 at (10, 20) 100x50, Child 2 at (200, 0) 80x60
    // BBox: minX=10, minY=0, maxX=280, maxY=70 => w=270, h=70
    const g = group([
      el('', { id: "c1", x: 10, y: 20, w: 100, h: 50 }),
      el('', { id: "c2", x: 200, y: 0, w: 80, h: 60 }),
    ], { id: "hug-grp", x: 100, y: 100, bounds: "hug" });
    const scene = await layout({ elements: [g] });

    assert.equal(scene.elements["hug-grp"].resolved.w, 270);
    assert.equal(scene.elements["hug-grp"].resolved.h, 70);
  });

  it("anchor: 'tc' centers correctly based on hug dimensions", async () => {
    // Children: (0,0) 200x100 and (200,0) 200x100
    // BBox: w=400, h=100
    // anchor: 'tc' at x=960 => left = 960 - 400/2 = 760
    const g = group([
      el('', { id: "a1", x: 0, y: 0, w: 200, h: 100 }),
      el('', { id: "a2", x: 200, y: 0, w: 200, h: 100 }),
    ], { id: "tc-grp", x: 960, y: 50, anchor: "tc", bounds: "hug" });
    const scene = await layout({ elements: [g] });

    assert.equal(scene.elements["tc-grp"].resolved.w, 400);
    assert.equal(scene.elements["tc-grp"].resolved.h, 100);
    assert.equal(scene.elements["tc-grp"].resolved.x, 760);
    assert.equal(scene.elements["tc-grp"].resolved.y, 50);
  });

  it("without bounds: 'hug', group uses authored w/h", async () => {
    const g = group([
      el('', { id: "n1", x: 0, y: 0, w: 200, h: 100 }),
    ], { id: "no-hug", x: 100, y: 100, w: 500, h: 400 });
    const scene = await layout({ elements: [g] });

    assert.equal(scene.elements["no-hug"].resolved.w, 500);
    assert.equal(scene.elements["no-hug"].resolved.h, 400);
  });

  it("bounds: 'hug' with single child", async () => {
    const g = group([
      el('', { id: "only", x: 30, y: 40, w: 120, h: 80 }),
    ], { id: "single-hug", x: 0, y: 0, bounds: "hug" });
    const scene = await layout({ elements: [g] });

    // BBox: minX=30, minY=40, maxX=150, maxY=120 => w=120, h=80
    assert.equal(scene.elements["single-hug"].resolved.w, 120);
    assert.equal(scene.elements["single-hug"].resolved.h, 80);
  });

  it("stores computed hug dimensions in resolved scene model", async () => {
    const g = group([
      el('', { id: "s1", x: 0, y: 0, w: 300, h: 150 }),
      el('', { id: "s2", x: 50, y: 100, w: 200, h: 100 }),
    ], { id: "scene-hug", x: 0, y: 0, bounds: "hug" });
    const scene = await layout({ elements: [g] });

    // BBox: minX=0, minY=0, maxX=300, maxY=200 => w=300, h=200
    const resolved = scene.elements["scene-hug"].resolved;
    assert.equal(resolved.w, 300);
    assert.equal(resolved.h, 200);
    assert.equal(resolved.x, 0);
    assert.equal(resolved.y, 0);
  });
});

// =============================================================================
// Main-axis alignment: vstack vAlign
// =============================================================================

describe("vstack vAlign — main-axis alignment", () => {
  it("vAlign:'top' positions children same as default (backward compat)", async () => {
    const stack = vstack([
      el('', { id: "c1", w: 100, h: 40 }),
      el('', { id: "c2", w: 100, h: 60 }),
    ], { id: "vs", x: 100, y: 100, w: 200, h: 400, gap: 10, vAlign: 'top' });
    const scene = await layout({ elements: [stack] });

    // Same as default: c1 at y=100, c2 at y=150
    assert.equal(scene.elements["c1"].resolved.y, 100);
    assert.equal(scene.elements["c2"].resolved.y, 150);
  });

  it("vAlign:'center' centers content block vertically within bounds", async () => {
    // Stack h=400, content = 40+10+60 = 110, slack = 290, offset = 145
    const stack = vstack([
      el('', { id: "c1", w: 100, h: 40 }),
      el('', { id: "c2", w: 100, h: 60 }),
    ], { id: "vs", x: 100, y: 100, w: 200, h: 400, gap: 10, vAlign: 'center' });
    const scene = await layout({ elements: [stack] });

    const totalContent = 40 + 10 + 60; // 110
    const slack = 400 - totalContent;   // 290
    const offset = slack / 2;           // 145
    assert.equal(scene.elements["c1"].resolved.y, 100 + offset);
    assert.equal(scene.elements["c2"].resolved.y, 100 + offset + 40 + 10);
  });

  it("vAlign:'center' works with multiple children and gaps", async () => {
    // Stack h=500, content = 50+20+50+20+50 = 190, slack = 310, offset = 155
    const stack = vstack([
      el('', { id: "a", w: 100, h: 50 }),
      el('', { id: "b", w: 100, h: 50 }),
      el('', { id: "c", w: 100, h: 50 }),
    ], { id: "vs", x: 0, y: 0, w: 200, h: 500, gap: 20, vAlign: 'center' });
    const scene = await layout({ elements: [stack] });

    const totalContent = 50 + 20 + 50 + 20 + 50; // 190
    const slack = 500 - totalContent;               // 310
    const offset = slack / 2;                        // 155
    assert.equal(scene.elements["a"].resolved.y, 0 + offset);
    assert.equal(scene.elements["b"].resolved.y, 0 + offset + 50 + 20);
    assert.equal(scene.elements["c"].resolved.y, 0 + offset + 50 + 20 + 50 + 20);
  });

  it("vAlign:'bottom' pushes content to bottom of bounds", async () => {
    // Stack h=400, content = 40+10+60 = 110, slack = 290
    const stack = vstack([
      el('', { id: "c1", w: 100, h: 40 }),
      el('', { id: "c2", w: 100, h: 60 }),
    ], { id: "vs", x: 100, y: 100, w: 200, h: 400, gap: 10, vAlign: 'bottom' });
    const scene = await layout({ elements: [stack] });

    const totalContent = 40 + 10 + 60; // 110
    const slack = 400 - totalContent;   // 290
    assert.equal(scene.elements["c1"].resolved.y, 100 + slack);
    assert.equal(scene.elements["c2"].resolved.y, 100 + slack + 40 + 10);
    // Verify last child's bottom edge is at stack bottom
    assert.equal(scene.elements["c2"].resolved.y + 60, 100 + 400);
  });

  it("vAlign:'center' combined with align:'center' centers both axes", async () => {
    // Stack w=400, h=400. Child w=100, h=50.
    // Cross-axis (align): childX = stackX + (400-100)/2 = 250
    // Main-axis (vAlign): content=50, slack=350, offset=175
    const stack = vstack([
      el('', { id: "c1", w: 100, h: 50 }),
    ], { id: "vs", x: 100, y: 100, w: 400, h: 400, align: 'center', vAlign: 'center' });
    const scene = await layout({ elements: [stack] });

    assert.equal(scene.elements["c1"].resolved.x, 100 + (400 - 100) / 2);
    assert.equal(scene.elements["c1"].resolved.y, 100 + (400 - 50) / 2);
  });

  it("vAlign with no explicit h is a no-op (content fills exactly)", async () => {
    // No h on stack — stack height = sum of children + gaps
    // vAlign should have no effect because there's no slack
    const stack = vstack([
      el('', { id: "c1", w: 100, h: 40 }),
      el('', { id: "c2", w: 100, h: 60 }),
    ], { id: "vs", x: 100, y: 100, w: 200, gap: 10, vAlign: 'center' });
    const scene = await layout({ elements: [stack] });

    // Should be same as default positioning
    assert.equal(scene.elements["c1"].resolved.y, 100);
    assert.equal(scene.elements["c2"].resolved.y, 150);
  });

  it("vAlign default is top (no vAlign prop)", async () => {
    const stack = vstack([
      el('', { id: "c1", w: 100, h: 40 }),
    ], { id: "vs", x: 100, y: 100, w: 200, h: 400 });
    const scene = await layout({ elements: [stack] });

    // Default: no offset applied
    assert.equal(scene.elements["c1"].resolved.y, 100);
  });
});

// =============================================================================
// vstack — variable-height children with text wrapping
// =============================================================================

describe("vstack — variable-height children with text wrapping", () => {
  const SHORT_TEXT = '<p style="font-size:20px;margin:0;line-height:1.4">Short line.</p>';
  const MEDIUM_TEXT = '<p style="font-size:20px;margin:0;line-height:1.4">This is a medium-length paragraph that should wrap to about two lines inside a reasonably narrow container.</p>';
  const LONG_TEXT = '<p style="font-size:20px;margin:0;line-height:1.4">This is a significantly longer paragraph of text that is specifically designed to wrap across multiple lines when rendered inside a narrow container. It contains enough words to ensure that the browser will need at least three or four lines to display the full content.</p>';

  it("children with different text lengths get different measured heights", async () => {
    _resetForTests();
    await init();
    try {
      const stack = vstack([
        el(SHORT_TEXT, { id: "short", w: 400 }),
        el(LONG_TEXT, { id: "long", w: 400 }),
        el(MEDIUM_TEXT, { id: "med", w: 400 }),
      ], { id: "vs", x: 0, y: 0, w: 400, gap: 0 });
      const scene = await layout({ elements: [stack] });

      const hShort = scene.elements["short"].resolved.h;
      const hLong = scene.elements["long"].resolved.h;
      const hMed = scene.elements["med"].resolved.h;

      assert.ok(hShort > 0, "short child should have positive height");
      assert.ok(hLong > 0, "long child should have positive height");
      assert.ok(hMed > 0, "medium child should have positive height");

      // Long text wraps more, so it should be taller than short text
      assert.ok(hLong > hShort, `long (${hLong}) should be taller than short (${hShort})`);
      // Long text should be taller than medium text
      assert.ok(hLong > hMed, `long (${hLong}) should be taller than medium (${hMed})`);
      // Medium text should be taller than short text
      assert.ok(hMed > hShort, `medium (${hMed}) should be taller than short (${hShort})`);
    } finally {
      _resetForTests();
    }
  });

  it("child that wraps to multiple lines is taller than single-line child", async () => {
    _resetForTests();
    await init();
    try {
      const stack = vstack([
        el(SHORT_TEXT, { id: "one-line", w: 500 }),
        el(LONG_TEXT, { id: "multi-line", w: 500 }),
      ], { id: "vs", x: 0, y: 0, w: 500, gap: 0 });
      const scene = await layout({ elements: [stack] });

      const hOneLine = scene.elements["one-line"].resolved.h;
      const hMultiLine = scene.elements["multi-line"].resolved.h;

      assert.ok(hMultiLine > hOneLine,
        `multi-line height (${hMultiLine}) should exceed single-line height (${hOneLine})`);
    } finally {
      _resetForTests();
    }
  });

  it("positioning accounts for wrapped height of preceding child", async () => {
    _resetForTests();
    await init();
    try {
      const stack = vstack([
        el(LONG_TEXT, { id: "first", w: 400 }),
        el(SHORT_TEXT, { id: "second", w: 400 }),
      ], { id: "vs", x: 50, y: 100, w: 400, gap: 0 });
      const scene = await layout({ elements: [stack] });

      const first = scene.elements["first"].resolved;
      const second = scene.elements["second"].resolved;

      // Second child's y must start at or after the first child's bottom edge
      assert.ok(second.y >= first.y + first.h,
        `second.y (${second.y}) should be >= first.y (${first.y}) + first.h (${first.h})`);
      // With gap=0, it should be exactly at the bottom edge
      assert.equal(second.y, first.y + first.h,
        `second.y (${second.y}) should equal first.y + first.h (${first.y + first.h})`);
    } finally {
      _resetForTests();
    }
  });

  it("stack total height includes all wrapped content plus gaps", async () => {
    _resetForTests();
    await init();
    try {
      const GAP = 12;
      const stack = vstack([
        el(SHORT_TEXT, { id: "c1", w: 400 }),
        el(LONG_TEXT, { id: "c2", w: 400 }),
        el(MEDIUM_TEXT, { id: "c3", w: 400 }),
      ], { id: "vs", x: 0, y: 0, w: 400, gap: GAP });
      const scene = await layout({ elements: [stack] });

      const h1 = scene.elements["c1"].resolved.h;
      const h2 = scene.elements["c2"].resolved.h;
      const h3 = scene.elements["c3"].resolved.h;
      const stackH = scene.elements["vs"].resolved.h;

      const expectedH = h1 + GAP + h2 + GAP + h3;
      assert.equal(stackH, expectedH,
        `stack height (${stackH}) should equal sum of children + gaps (${expectedH})`);
    } finally {
      _resetForTests();
    }
  });

  it("stretch alignment re-measures wrapped height at stretched width", async () => {
    _resetForTests();
    await init();
    try {
      // Children have narrow authored widths; stack is wider with align:'stretch'.
      // Stretching to a wider width should change how text wraps, so heights
      // get re-measured at the stretched width.
      const stack = vstack([
        el(LONG_TEXT, { id: "narrow", w: 200 }),
        el(SHORT_TEXT, { id: "short-s", w: 200 }),
      ], { id: "vs-stretch", x: 0, y: 0, w: 500, gap: 0, align: 'stretch' });
      const scene = await layout({ elements: [stack] });

      const narrow = scene.elements["narrow"].resolved;
      const shortS = scene.elements["short-s"].resolved;

      // Both children should be stretched to the stack width
      assert.equal(narrow.w, 500,
        `stretched child width (${narrow.w}) should equal stack width (500)`);
      assert.equal(shortS.w, 500,
        `stretched child width (${shortS.w}) should equal stack width (500)`);

      // Heights should be positive (re-measured at new width)
      assert.ok(narrow.h > 0, "re-measured height should be positive");
      assert.ok(shortS.h > 0, "re-measured height should be positive");

      // The long text at 500px wide should still be taller than the short text
      assert.ok(narrow.h > shortS.h,
        `long text height (${narrow.h}) should exceed short text height (${shortS.h}) even at stretched width`);

      // Second child should be positioned after the first
      assert.equal(shortS.y, narrow.y + narrow.h,
        `second child y (${shortS.y}) should equal first.y + first.h (${narrow.y + narrow.h})`);
    } finally {
      _resetForTests();
    }
  });
});

// =============================================================================
// Main-axis alignment: hstack hAlign
// =============================================================================

describe("hstack hAlign — main-axis alignment", () => {
  it("hAlign:'left' positions children same as default (backward compat)", async () => {
    const stack = hstack([
      el('', { id: "c1", w: 80, h: 40 }),
      el('', { id: "c2", w: 120, h: 40 }),
    ], { id: "hs", x: 100, y: 100, w: 600, h: 200, gap: 20, hAlign: 'left' });
    const scene = await layout({ elements: [stack] });

    // Same as default: c1 at x=100, c2 at x=200
    assert.equal(scene.elements["c1"].resolved.x, 100);
    assert.equal(scene.elements["c2"].resolved.x, 200);
  });

  it("hAlign:'center' centers content block horizontally within bounds", async () => {
    // Stack w=600, content = 80+20+120 = 220, slack = 380, offset = 190
    const stack = hstack([
      el('', { id: "c1", w: 80, h: 40 }),
      el('', { id: "c2", w: 120, h: 40 }),
    ], { id: "hs", x: 100, y: 100, w: 600, h: 200, gap: 20, hAlign: 'center' });
    const scene = await layout({ elements: [stack] });

    const totalContent = 80 + 20 + 120; // 220
    const slack = 600 - totalContent;     // 380
    const offset = slack / 2;              // 190
    assert.equal(scene.elements["c1"].resolved.x, 100 + offset);
    assert.equal(scene.elements["c2"].resolved.x, 100 + offset + 80 + 20);
  });

  it("hAlign:'center' works with multiple children and gaps", async () => {
    // Stack w=800, content = 100+20+100+20+100 = 340, slack = 460, offset = 230
    const stack = hstack([
      el('', { id: "a", w: 100, h: 40 }),
      el('', { id: "b", w: 100, h: 40 }),
      el('', { id: "c", w: 100, h: 40 }),
    ], { id: "hs", x: 0, y: 0, w: 800, h: 200, gap: 20, hAlign: 'center' });
    const scene = await layout({ elements: [stack] });

    const totalContent = 100 + 20 + 100 + 20 + 100; // 340
    const slack = 800 - totalContent;                   // 460
    const offset = slack / 2;                            // 230
    assert.equal(scene.elements["a"].resolved.x, 0 + offset);
    assert.equal(scene.elements["b"].resolved.x, 0 + offset + 100 + 20);
    assert.equal(scene.elements["c"].resolved.x, 0 + offset + 100 + 20 + 100 + 20);
  });

  it("hAlign:'right' pushes content to right of bounds", async () => {
    // Stack w=600, content = 80+20+120 = 220, slack = 380
    const stack = hstack([
      el('', { id: "c1", w: 80, h: 40 }),
      el('', { id: "c2", w: 120, h: 40 }),
    ], { id: "hs", x: 100, y: 100, w: 600, h: 200, gap: 20, hAlign: 'right' });
    const scene = await layout({ elements: [stack] });

    const totalContent = 80 + 20 + 120; // 220
    const slack = 600 - totalContent;     // 380
    assert.equal(scene.elements["c1"].resolved.x, 100 + slack);
    assert.equal(scene.elements["c2"].resolved.x, 100 + slack + 80 + 20);
    // Verify last child's right edge is at stack right
    assert.equal(scene.elements["c2"].resolved.x + 120, 100 + 600);
  });

  it("hAlign:'center' combined with align:'middle' centers both axes", async () => {
    // Stack w=600, h=200. Child w=100, h=40.
    // Cross-axis (align middle): childY = stackY + (200-40)/2 = 180
    // Main-axis (hAlign center): content=100, slack=500, offset=250
    const stack = hstack([
      el('', { id: "c1", w: 100, h: 40 }),
    ], { id: "hs", x: 100, y: 100, w: 600, h: 200, align: 'middle', hAlign: 'center' });
    const scene = await layout({ elements: [stack] });

    assert.equal(scene.elements["c1"].resolved.x, 100 + (600 - 100) / 2);
    assert.equal(scene.elements["c1"].resolved.y, 100 + (200 - 40) / 2);
  });

  it("hAlign with no explicit w is a no-op (content fills exactly)", async () => {
    // No w on stack — stack width = sum of children + gaps
    // hAlign should have no effect because there's no slack
    const stack = hstack([
      el('', { id: "c1", w: 80, h: 40 }),
      el('', { id: "c2", w: 120, h: 40 }),
    ], { id: "hs", x: 100, y: 100, gap: 20, hAlign: 'center' });
    const scene = await layout({ elements: [stack] });

    // Should be same as default positioning
    assert.equal(scene.elements["c1"].resolved.x, 100);
    assert.equal(scene.elements["c2"].resolved.x, 200);
  });

  it("hAlign default is left (no hAlign prop)", async () => {
    const stack = hstack([
      el('', { id: "c1", w: 80, h: 40 }),
    ], { id: "hs", x: 100, y: 100, w: 600, h: 200 });
    const scene = await layout({ elements: [stack] });

    // Default: no offset applied
    assert.equal(scene.elements["c1"].resolved.x, 100);
  });
});

// =============================================================================
// Main-axis alignment: panel vAlign passthrough
// =============================================================================

describe("panel vAlign — passthrough to inner vstack", () => {
  it("panel with vAlign:'center' centers its content vertically", async () => {
    // Panel: w=300, h=400, padding=24 (default)
    // Content area height = 400 - 2*24 = 352
    // Child: h=40, gap=16 (default), total content = 40
    // slack = 352 - 40 = 312, offset = 156
    const p = panel(
      [el('', { id: "pc1", w: 200, h: 40 })],
      { id: "pnl", x: 100, y: 100, w: 300, h: 400, vAlign: 'center' }
    );
    const scene = await layout({ elements: [p] });

    // The panel's child vstack is at (padding, padding) = (24, 24) within the group
    // The vstack has h = 400 - 2*24 = 352
    // Content = 40, slack = 312, offset = 156
    // Child y in absolute coords: group.y(100) + vstack.y(24) + offset(156) = 280
    const pc1 = scene.elements["pc1"];
    assert.ok(pc1, "panel child should exist");
    // Verify the child is centered within the panel's content area
    // Group at y=100, vstack at y=24 relative to group
    // vstack content starts at group.y + padding = 124
    // Content h = 40, content area h = 352
    // Center offset = (352 - 40) / 2 = 156
    // So child y = 124 + 156 = 280 (absolute) or 24 + 156 = 180 (relative to group)
    // Since panel children positions are group-relative in the scene graph:
    const expectedOffset = (352 - 40) / 2;
    assert.equal(pc1.resolved.y, 24 + expectedOffset);
  });

  it("panel with both align and vAlign passes both through correctly", async () => {
    // Panel: w=400, h=400, padding=24
    // Content area: w = 400 - 48 = 352, h = 400 - 48 = 352
    // Child: w=100, h=40
    // align:'center' => cross-axis centering within content width
    // vAlign:'bottom' => main-axis bottom alignment within content height
    const p = panel(
      [el('', { id: "pc1", w: 100, h: 40 })],
      { id: "pnl", x: 0, y: 0, w: 400, h: 400, align: 'center', vAlign: 'bottom' }
    );
    const scene = await layout({ elements: [p] });

    const pc1 = scene.elements["pc1"];
    assert.ok(pc1, "panel child should exist");

    // vAlign: 'bottom' => offset = 352 - 40 = 312
    // child y = padding(24) + 312 = 336
    assert.equal(pc1.resolved.y, 24 + (352 - 40));

    // align: 'center' => child x = padding + (contentW - childW)/2 = 24 + (352-100)/2 = 24 + 126 = 150
    assert.equal(pc1.resolved.x, 24 + (352 - 100) / 2);
  });
});

// =============================================================================
// Dimension Constraints: matchWidthOf / matchHeightOf
// =============================================================================

describe("matchWidthOf() helper", () => {
  it("returns a RelMarker with _rel 'matchWidth'", () => {
    const m = matchWidthOf("ref1");
    assert.equal(m._rel, "matchWidth");
    assert.equal(m.ref, "ref1");
  });
});

describe("matchHeightOf() helper", () => {
  it("returns a RelMarker with _rel 'matchHeight'", () => {
    const m = matchHeightOf("ref1");
    assert.equal(m._rel, "matchHeight");
    assert.equal(m.ref, "ref1");
  });
});

describe("layout() — matchWidthOf()", () => {
  it("makes element match reference width", async () => {
    _resetForTests();
    await init();
    const anchor = el('', { id: "anchor", x: 50, y: 50, w: 300, h: 100 });
    const target = el('', { id: "target", x: 50, y: 200, w: matchWidthOf("anchor"), h: 80 });

    const result = await layout({ elements: [anchor, target] });

    assert.equal(result.elements["target"].resolved.w, 300);
    assert.equal(result.elements["target"].resolved.h, 80);
    // x and y should be unaffected
    assert.equal(result.elements["target"].resolved.x, 50);
    assert.equal(result.elements["target"].resolved.y, 200);
  });

  it("provenance shows constraint source for matchWidth", async () => {
    _resetForTests();
    await init();
    const anchor = el('', { id: "anchor", x: 50, y: 50, w: 300, h: 100 });
    const target = el('', { id: "target", x: 50, y: 200, w: matchWidthOf("anchor"), h: 80 });

    const result = await layout({ elements: [anchor, target] });

    assert.equal(result.elements["target"].provenance.w.source, "constraint");
    assert.equal(result.elements["target"].provenance.w.type, "matchWidth");
    assert.equal(result.elements["target"].provenance.w.ref, "anchor");
    // Other axes should still have authored provenance
    assert.equal(result.elements["target"].provenance.x.source, "authored");
    assert.equal(result.elements["target"].provenance.h.source, "authored");
  });
});

describe("layout() — matchHeightOf()", () => {
  it("makes element match reference height", async () => {
    _resetForTests();
    await init();
    const anchor = el('', { id: "anchor", x: 50, y: 50, w: 200, h: 350 });
    const target = el('', { id: "target", x: 300, y: 50, w: 150, h: matchHeightOf("anchor") });

    const result = await layout({ elements: [anchor, target] });

    assert.equal(result.elements["target"].resolved.h, 350);
    assert.equal(result.elements["target"].resolved.w, 150);
    // x and y should be unaffected
    assert.equal(result.elements["target"].resolved.x, 300);
    assert.equal(result.elements["target"].resolved.y, 50);
  });

  it("provenance shows constraint source for matchHeight", async () => {
    _resetForTests();
    await init();
    const anchor = el('', { id: "anchor", x: 50, y: 50, w: 200, h: 350 });
    const target = el('', { id: "target", x: 300, y: 50, w: 150, h: matchHeightOf("anchor") });

    const result = await layout({ elements: [anchor, target] });

    assert.equal(result.elements["target"].provenance.h.source, "constraint");
    assert.equal(result.elements["target"].provenance.h.type, "matchHeight");
    assert.equal(result.elements["target"].provenance.h.ref, "anchor");
    assert.equal(result.elements["target"].provenance.y.source, "authored");
    assert.equal(result.elements["target"].provenance.w.source, "authored");
  });
});

describe("dimension constraints with positional constraints", () => {
  it("matchWidthOf works with below() on the same element", async () => {
    _resetForTests();
    await init();
    const anchor = el('', { id: "anchor", x: 50, y: 50, w: 300, h: 100 });
    const target = el('', { id: "target", x: 50, y: below("anchor", 10), w: matchWidthOf("anchor"), h: 80 });

    const result = await layout({ elements: [anchor, target] });

    assert.equal(result.elements["target"].resolved.w, 300);
    assert.equal(result.elements["target"].resolved.y, 160); // 50 + 100 + 10
    assert.equal(result.elements["target"].resolved.h, 80);
  });

  it("matchHeightOf works with rightOf() on the same element", async () => {
    _resetForTests();
    await init();
    const anchor = el('', { id: "anchor", x: 50, y: 50, w: 200, h: 350 });
    const target = el('', { id: "target", x: rightOf("anchor", 20), y: 50, w: 150, h: matchHeightOf("anchor") });

    const result = await layout({ elements: [anchor, target] });

    assert.equal(result.elements["target"].resolved.h, 350);
    assert.equal(result.elements["target"].resolved.x, 270); // 50 + 200 + 20
  });

  it("matchWidthOf and matchHeightOf on the same element", async () => {
    _resetForTests();
    await init();
    const anchor = el('', { id: "anchor", x: 50, y: 50, w: 300, h: 200 });
    const target = el('', { id: "target", x: 400, y: 50, w: matchWidthOf("anchor"), h: matchHeightOf("anchor") });

    const result = await layout({ elements: [anchor, target] });

    assert.equal(result.elements["target"].resolved.w, 300);
    assert.equal(result.elements["target"].resolved.h, 200);
  });

  it("chained dimension constraints: A -> B -> C", async () => {
    _resetForTests();
    await init();
    const a = el('', { id: "a", x: 50, y: 50, w: 400, h: 100 });
    const b = el('', { id: "b", x: 50, y: 200, w: matchWidthOf("a"), h: 80 });
    const c = el('', { id: "c", x: 50, y: 330, w: matchWidthOf("b"), h: 60 });

    const result = await layout({ elements: [a, b, c] });

    assert.equal(result.elements["b"].resolved.w, 400);
    assert.equal(result.elements["c"].resolved.w, 400);
  });

  it("errors on unknown reference element", async () => {
    _resetForTests();
    await init();
    const target = el('', { id: "target", x: 50, y: 50, w: matchWidthOf("nonexistent"), h: 80 });

    const result = await layout({ elements: [target] });

    assert.ok(result.errors.length > 0);
    assert.equal(result.errors[0].type, "unknown_ref");
    assert.equal(result.errors[0].ref, "nonexistent");
  });
});

// =============================================================================
// centerHOnSlide / centerVOnSlide
// =============================================================================

describe("centerHOnSlide / centerVOnSlide constraints", () => {
  it("centerHOnSlide() returns correct RelMarker", () => {
    const marker = centerHOnSlide();
    assert.equal(marker._rel, "centerHSlide");
    assert.equal(marker.ref, undefined);
  });

  it("centerVOnSlide() returns correct RelMarker", () => {
    const marker = centerVOnSlide();
    assert.equal(marker._rel, "centerVSlide");
    assert.equal(marker.ref, undefined);
  });

  it("centerHOnSlide centers element horizontally on the slide", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const e = el('', { id: "ch1", x: centerHOnSlide(), y: 100, w: 200, h: 50 });
      await render([{ elements: [e] }], { container });
      const scene = window.sk.layouts[0].elements;
      // slide width 1920 (default), element w=200: (1920 - 200) / 2 = 860
      assert.equal(scene.ch1.resolved.x, 860);
      assert.equal(scene.ch1.resolved.y, 100);
    });
  });

  it("centerVOnSlide centers element vertically on the slide", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const e = el('', { id: "cv1", x: 100, y: centerVOnSlide(), w: 200, h: 80 });
      await render([{ elements: [e] }], { container });
      const scene = window.sk.layouts[0].elements;
      // slide height 1080 (default), element h=80: (1080 - 80) / 2 = 500
      assert.equal(scene.cv1.resolved.x, 100);
      assert.equal(scene.cv1.resolved.y, 500);
    });
  });

  it("both centerHOnSlide and centerVOnSlide together", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const e = el('', { id: "cxy", x: centerHOnSlide(), y: centerVOnSlide(), w: 400, h: 200 });
      await render([{ elements: [e] }], { container });
      const scene = window.sk.layouts[0].elements;
      assert.equal(scene.cxy.resolved.x, 760); // (1920-400)/2
      assert.equal(scene.cxy.resolved.y, 440); // (1080-200)/2
    });
  });

  it("provenance shows constraint source for centerHSlide", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const e = el('', { id: "cp1", x: centerHOnSlide(), y: 100, w: 200, h: 50 });
      await render([{ elements: [e] }], { container });
      const scene = window.sk.layouts[0].elements;
      assert.equal(scene.cp1.provenance.x.source, "constraint");
      assert.equal(scene.cp1.provenance.x.type, "centerHSlide");
    });
  });
});

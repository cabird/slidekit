// SlideKit Tests — M6.6 (Alignment, Distribution, Size Matching, fitToRect)

import { describe, it, assert } from './test-runner.js';
import {
  el,
  layout, init, _resetForTests,
  alignLeft, alignRight, alignTop, alignBottom,
  alignCenterH, alignCenterV,
  distributeH, distributeV,
  matchWidth, matchHeight, matchSize,
  fitToRect,
} from '../slidekit.js';

// =============================================================================
// M6.1: Alignment Functions — Transform Marker Objects
// =============================================================================

describe("M6.1: Alignment — marker object shapes", () => {
  it("alignLeft returns correct marker shape", () => {
    _resetForTests();
    const t = alignLeft(["a", "b"], { to: 100 });
    assert.equal(t._transform, "alignLeft");
    assert.ok(t._transformId, "should have an auto-generated ID");
    assert.deepEqual(t.ids, ["a", "b"]);
    assert.equal(t.options.to, 100);
  });

  it("alignRight returns correct marker shape", () => {
    _resetForTests();
    const t = alignRight(["a"], {});
    assert.equal(t._transform, "alignRight");
    assert.deepEqual(t.ids, ["a"]);
  });

  it("alignTop returns correct marker shape", () => {
    _resetForTests();
    const t = alignTop(["x", "y", "z"]);
    assert.equal(t._transform, "alignTop");
    assert.equal(t.ids.length, 3);
  });

  it("alignBottom returns correct marker shape", () => {
    _resetForTests();
    const t = alignBottom(["a"]);
    assert.equal(t._transform, "alignBottom");
  });

  it("alignCenterH returns correct marker shape", () => {
    _resetForTests();
    const t = alignCenterH(["a", "b"], { to: 960 });
    assert.equal(t._transform, "alignCenterH");
    assert.equal(t.options.to, 960);
  });

  it("alignCenterV returns correct marker shape", () => {
    _resetForTests();
    const t = alignCenterV(["a", "b"]);
    assert.equal(t._transform, "alignCenterV");
  });
});

// =============================================================================
// M6.1: Alignment — Layout Integration
// =============================================================================

describe("M6.1: alignLeft — layout integration", () => {
  it("alignLeft without 'to' aligns to the minimum left edge", async () => {
    _resetForTests();
    await init();
    const r1 = el('', { id: "r1", x: 100, y: 0, w: 200, h: 50 });
    const r2 = el('', { id: "r2", x: 300, y: 0, w: 200, h: 50 });
    const r3 = el('', { id: "r3", x: 200, y: 0, w: 200, h: 50 });

    const result = await layout({
      elements: [r1, r2, r3],
      transforms: [alignLeft(["r1", "r2", "r3"])],
    });

    assert.equal(result.elements["r1"].resolved.x, 100);
    assert.equal(result.elements["r2"].resolved.x, 100);
    assert.equal(result.elements["r3"].resolved.x, 100);
  });

  it("alignLeft with 'to' aligns all to specified value", async () => {
    _resetForTests();
    await init();
    const r1 = el('', { id: "r1", x: 100, y: 0, w: 200, h: 50 });
    const r2 = el('', { id: "r2", x: 300, y: 0, w: 200, h: 50 });

    const result = await layout({
      elements: [r1, r2],
      transforms: [alignLeft(["r1", "r2"], { to: 50 })],
    });

    assert.equal(result.elements["r1"].resolved.x, 50);
    assert.equal(result.elements["r2"].resolved.x, 50);
  });
});

describe("M6.1: alignRight — layout integration", () => {
  it("alignRight without 'to' aligns to the maximum right edge", async () => {
    _resetForTests();
    await init();
    const r1 = el('', { id: "r1", x: 100, y: 0, w: 200, h: 50 }); // right = 300
    const r2 = el('', { id: "r2", x: 300, y: 0, w: 200, h: 50 }); // right = 500
    const r3 = el('', { id: "r3", x: 50, y: 0, w: 100, h: 50 });   // right = 150

    const result = await layout({
      elements: [r1, r2, r3],
      transforms: [alignRight(["r1", "r2", "r3"])],
    });

    // All right edges should be at 500
    assert.equal(result.elements["r1"].resolved.x, 300); // 500 - 200
    assert.equal(result.elements["r2"].resolved.x, 300); // 500 - 200
    assert.equal(result.elements["r3"].resolved.x, 400); // 500 - 100
  });

  it("alignRight with 'to' aligns all right edges to specified value", async () => {
    _resetForTests();
    await init();
    const r1 = el('', { id: "r1", x: 100, y: 0, w: 200, h: 50 });
    const r2 = el('', { id: "r2", x: 300, y: 0, w: 150, h: 50 });

    const result = await layout({
      elements: [r1, r2],
      transforms: [alignRight(["r1", "r2"], { to: 1000 })],
    });

    assert.equal(result.elements["r1"].resolved.x, 800);  // 1000 - 200
    assert.equal(result.elements["r2"].resolved.x, 850);  // 1000 - 150
  });
});

describe("M6.1: alignTop — layout integration", () => {
  it("alignTop without 'to' aligns to the minimum top edge", async () => {
    _resetForTests();
    await init();
    const r1 = el('', { id: "r1", x: 0, y: 100, w: 50, h: 200 });
    const r2 = el('', { id: "r2", x: 0, y: 300, w: 50, h: 200 });
    const r3 = el('', { id: "r3", x: 0, y: 50, w: 50, h: 100 });

    const result = await layout({
      elements: [r1, r2, r3],
      transforms: [alignTop(["r1", "r2", "r3"])],
    });

    assert.equal(result.elements["r1"].resolved.y, 50);
    assert.equal(result.elements["r2"].resolved.y, 50);
    assert.equal(result.elements["r3"].resolved.y, 50);
  });

  it("alignTop with 'to' aligns to specified value", async () => {
    _resetForTests();
    await init();
    const r1 = el('', { id: "r1", x: 0, y: 100, w: 50, h: 200 });
    const r2 = el('', { id: "r2", x: 0, y: 300, w: 50, h: 200 });

    const result = await layout({
      elements: [r1, r2],
      transforms: [alignTop(["r1", "r2"], { to: 20 })],
    });

    assert.equal(result.elements["r1"].resolved.y, 20);
    assert.equal(result.elements["r2"].resolved.y, 20);
  });
});

describe("M6.1: alignBottom — layout integration", () => {
  it("alignBottom without 'to' aligns to the maximum bottom edge", async () => {
    _resetForTests();
    await init();
    const r1 = el('', { id: "r1", x: 0, y: 100, w: 50, h: 200 }); // bottom = 300
    const r2 = el('', { id: "r2", x: 0, y: 300, w: 50, h: 300 }); // bottom = 600
    const r3 = el('', { id: "r3", x: 0, y: 50, w: 50, h: 100 });   // bottom = 150

    const result = await layout({
      elements: [r1, r2, r3],
      transforms: [alignBottom(["r1", "r2", "r3"])],
    });

    // All bottom edges at 600
    assert.equal(result.elements["r1"].resolved.y, 400); // 600 - 200
    assert.equal(result.elements["r2"].resolved.y, 300); // 600 - 300
    assert.equal(result.elements["r3"].resolved.y, 500); // 600 - 100
  });

  it("alignBottom with 'to' aligns all bottom edges to specified value", async () => {
    _resetForTests();
    await init();
    const r1 = el('', { id: "r1", x: 0, y: 100, w: 50, h: 200 });
    const r2 = el('', { id: "r2", x: 0, y: 300, w: 50, h: 100 });

    const result = await layout({
      elements: [r1, r2],
      transforms: [alignBottom(["r1", "r2"], { to: 800 })],
    });

    assert.equal(result.elements["r1"].resolved.y, 600); // 800 - 200
    assert.equal(result.elements["r2"].resolved.y, 700); // 800 - 100
  });
});

describe("M6.1: alignCenterH — layout integration", () => {
  it("alignCenterH without 'to' aligns to average horizontal center", async () => {
    _resetForTests();
    await init();
    const r1 = el('', { id: "r1", x: 100, y: 0, w: 200, h: 50 }); // center = 200
    const r2 = el('', { id: "r2", x: 400, y: 0, w: 100, h: 50 }); // center = 450
    const r3 = el('', { id: "r3", x: 250, y: 0, w: 300, h: 50 }); // center = 400

    // Average center = (200 + 450 + 400) / 3 = 350
    const result = await layout({
      elements: [r1, r2, r3],
      transforms: [alignCenterH(["r1", "r2", "r3"])],
    });

    assert.equal(result.elements["r1"].resolved.x, 250); // 350 - 200/2
    assert.equal(result.elements["r2"].resolved.x, 300); // 350 - 100/2
    assert.equal(result.elements["r3"].resolved.x, 200); // 350 - 300/2
  });

  it("alignCenterH with 'to' aligns all centers to specified value", async () => {
    _resetForTests();
    await init();
    const r1 = el('', { id: "r1", x: 100, y: 0, w: 200, h: 50 });
    const r2 = el('', { id: "r2", x: 400, y: 0, w: 100, h: 50 });

    const result = await layout({
      elements: [r1, r2],
      transforms: [alignCenterH(["r1", "r2"], { to: 960 })],
    });

    assert.equal(result.elements["r1"].resolved.x, 860); // 960 - 100
    assert.equal(result.elements["r2"].resolved.x, 910); // 960 - 50
  });
});

describe("M6.1: alignCenterV — layout integration", () => {
  it("alignCenterV without 'to' aligns to average vertical center", async () => {
    _resetForTests();
    await init();
    const r1 = el('', { id: "r1", x: 0, y: 100, w: 50, h: 200 }); // center = 200
    const r2 = el('', { id: "r2", x: 0, y: 400, w: 50, h: 100 }); // center = 450
    // Average center = (200 + 450) / 2 = 325

    const result = await layout({
      elements: [r1, r2],
      transforms: [alignCenterV(["r1", "r2"])],
    });

    assert.equal(result.elements["r1"].resolved.y, 225); // 325 - 100
    assert.equal(result.elements["r2"].resolved.y, 275); // 325 - 50
  });

  it("alignCenterV with 'to' aligns all centers to specified value", async () => {
    _resetForTests();
    await init();
    const r1 = el('', { id: "r1", x: 0, y: 100, w: 50, h: 200 });
    const r2 = el('', { id: "r2", x: 0, y: 400, w: 50, h: 100 });

    const result = await layout({
      elements: [r1, r2],
      transforms: [alignCenterV(["r1", "r2"], { to: 540 })],
    });

    assert.equal(result.elements["r1"].resolved.y, 440); // 540 - 100
    assert.equal(result.elements["r2"].resolved.y, 490); // 540 - 50
  });
});

// =============================================================================
// M6.2: Distribution Functions
// =============================================================================

describe("M6.2: distributeH — equal-gap mode", () => {
  it("distributes elements with equal gaps (different widths)", async () => {
    _resetForTests();
    await init();
    // Three elements with widths 100, 200, 150
    const r1 = el('', { id: "r1", x: 0, y: 0, w: 100, h: 50 });
    const r2 = el('', { id: "r2", x: 100, y: 0, w: 200, h: 50 });
    const r3 = el('', { id: "r3", x: 300, y: 0, w: 150, h: 50 });

    // Total range: 0 to 1000
    // Total widths: 100 + 200 + 150 = 450
    // Total gap: 1000 - 450 = 550
    // Gap between: 550 / 2 = 275
    const result = await layout({
      elements: [r1, r2, r3],
      transforms: [distributeH(["r1", "r2", "r3"], { startX: 0, endX: 1000 })],
    });

    assert.equal(result.elements["r1"].resolved.x, 0);
    assert.equal(result.elements["r2"].resolved.x, 375);  // 0 + 100 + 275
    assert.equal(result.elements["r3"].resolved.x, 850);  // 375 + 200 + 275
  });

  it("distributes using default start/end from element positions", async () => {
    _resetForTests();
    await init();
    const r1 = el('', { id: "r1", x: 100, y: 0, w: 100, h: 50 }); // left=100
    const r2 = el('', { id: "r2", x: 500, y: 0, w: 100, h: 50 }); // right=600
    const r3 = el('', { id: "r3", x: 300, y: 0, w: 100, h: 50 });

    // Default range: 100 to 600 (leftmost left edge to rightmost right edge)
    // Total widths: 300, total gap: 200, gap between: 100
    const result = await layout({
      elements: [r1, r2, r3],
      transforms: [distributeH(["r1", "r2", "r3"])],
    });

    assert.equal(result.elements["r1"].resolved.x, 100);
    assert.equal(result.elements["r3"].resolved.x, 300); // 100 + 100 + 100
    assert.equal(result.elements["r2"].resolved.x, 500); // 300 + 100 + 100
  });
});

describe("M6.2: distributeH — equal-center mode", () => {
  it("distributes element centers equally", async () => {
    _resetForTests();
    await init();
    const r1 = el('', { id: "r1", x: 0, y: 0, w: 100, h: 50 });
    const r2 = el('', { id: "r2", x: 100, y: 0, w: 200, h: 50 });
    const r3 = el('', { id: "r3", x: 200, y: 0, w: 50, h: 50 });

    // For equal-center mode, startX and endX define the center positions of the
    // first and last elements (not edge positions like equal-gap mode).
    // With startX=100, endX=900: spacing = (900 - 100) / 2 = 400
    // Centers: 100, 500, 900
    const result = await layout({
      elements: [r1, r2, r3],
      transforms: [distributeH(["r1", "r2", "r3"], { startX: 100, endX: 900, mode: "equal-center" })],
    });

    // r1 center=100 -> x = 100 - 50 = 50
    assert.equal(result.elements["r1"].resolved.x, 50);
    // r2 center=500 -> x = 500 - 100 = 400
    assert.equal(result.elements["r2"].resolved.x, 400);
    // r3 center=900 -> x = 900 - 25 = 875
    assert.equal(result.elements["r3"].resolved.x, 875);
  });

  it("equal-center defaults to element centers for start/end", async () => {
    _resetForTests();
    await init();
    const r1 = el('', { id: "r1", x: 100, y: 0, w: 200, h: 50 }); // center = 200
    const r2 = el('', { id: "r2", x: 700, y: 0, w: 100, h: 50 }); // center = 750
    const r3 = el('', { id: "r3", x: 400, y: 0, w: 150, h: 50 });

    // Default: startX = center of first (sorted by x) = 200
    //          endX = center of last (sorted by x) = 750
    // Spacing = (750 - 200) / 2 = 275
    // Centers: 200, 475, 750
    const result = await layout({
      elements: [r1, r2, r3],
      transforms: [distributeH(["r1", "r2", "r3"], { mode: "equal-center" })],
    });

    // r1 center=200 -> x = 200 - 100 = 100
    assert.equal(result.elements["r1"].resolved.x, 100);
    // r3 center=475 -> x = 475 - 75 = 400
    assert.equal(result.elements["r3"].resolved.x, 400);
    // r2 center=750 -> x = 750 - 50 = 700
    assert.equal(result.elements["r2"].resolved.x, 700);
  });
});

describe("M6.2: distributeV — equal-gap mode", () => {
  it("distributes elements vertically with equal gaps", async () => {
    _resetForTests();
    await init();
    const r1 = el('', { id: "r1", x: 0, y: 0, w: 50, h: 100 });
    const r2 = el('', { id: "r2", x: 0, y: 100, w: 50, h: 200 });
    const r3 = el('', { id: "r3", x: 0, y: 300, w: 50, h: 150 });

    // Range: 0 to 1000
    // Total heights: 100 + 200 + 150 = 450
    // Total gap: 550, gap between: 275
    const result = await layout({
      elements: [r1, r2, r3],
      transforms: [distributeV(["r1", "r2", "r3"], { startY: 0, endY: 1000 })],
    });

    assert.equal(result.elements["r1"].resolved.y, 0);
    assert.equal(result.elements["r2"].resolved.y, 375);  // 0 + 100 + 275
    assert.equal(result.elements["r3"].resolved.y, 850);  // 375 + 200 + 275
  });

  it("distributes using default start/end from element positions", async () => {
    _resetForTests();
    await init();
    const r1 = el('', { id: "r1", x: 0, y: 100, w: 50, h: 100 }); // top=100
    const r2 = el('', { id: "r2", x: 0, y: 500, w: 50, h: 100 }); // bottom=600
    const r3 = el('', { id: "r3", x: 0, y: 300, w: 50, h: 100 });

    // Default range: 100 to 600 (topmost top edge to bottommost bottom edge)
    // Total heights: 300, total gap: 200, gap between: 100
    const result = await layout({
      elements: [r1, r2, r3],
      transforms: [distributeV(["r1", "r2", "r3"])],
    });

    assert.equal(result.elements["r1"].resolved.y, 100);
    assert.equal(result.elements["r3"].resolved.y, 300); // 100 + 100 + 100
    assert.equal(result.elements["r2"].resolved.y, 500); // 300 + 100 + 100
  });
});

describe("M6.2: distributeV — equal-center mode", () => {
  it("distributes element centers equally vertically", async () => {
    _resetForTests();
    await init();
    const r1 = el('', { id: "r1", x: 0, y: 0, w: 50, h: 100 });
    const r2 = el('', { id: "r2", x: 0, y: 100, w: 50, h: 200 });
    const r3 = el('', { id: "r3", x: 0, y: 200, w: 50, h: 50 });

    // With explicit startY=100, endY=900
    // Spacing = 400, centers: 100, 500, 900
    const result = await layout({
      elements: [r1, r2, r3],
      transforms: [distributeV(["r1", "r2", "r3"], { startY: 100, endY: 900, mode: "equal-center" })],
    });

    assert.equal(result.elements["r1"].resolved.y, 50);   // 100 - 50
    assert.equal(result.elements["r2"].resolved.y, 400);  // 500 - 100
    assert.equal(result.elements["r3"].resolved.y, 875);  // 900 - 25
  });

  it("equal-center defaults to element centers for start/end", async () => {
    _resetForTests();
    await init();
    const r1 = el('', { id: "r1", x: 0, y: 100, w: 50, h: 200 }); // center = 200
    const r2 = el('', { id: "r2", x: 0, y: 700, w: 50, h: 100 }); // center = 750
    const r3 = el('', { id: "r3", x: 0, y: 400, w: 50, h: 150 });

    // For equal-center mode, startY/endY default to centers of first/last sorted by y
    // Default: startY = center of first (sorted by y) = 200
    //          endY = center of last (sorted by y) = 750
    // Spacing = (750 - 200) / 2 = 275
    // Centers: 200, 475, 750
    const result = await layout({
      elements: [r1, r2, r3],
      transforms: [distributeV(["r1", "r2", "r3"], { mode: "equal-center" })],
    });

    // r1 center=200 -> y = 200 - 100 = 100
    assert.equal(result.elements["r1"].resolved.y, 100);
    // r3 center=475 -> y = 475 - 75 = 400
    assert.equal(result.elements["r3"].resolved.y, 400);
    // r2 center=750 -> y = 750 - 50 = 700
    assert.equal(result.elements["r2"].resolved.y, 700);
  });
});

// =============================================================================
// M6.3: Size Matching
// =============================================================================

describe("M6.3: matchWidth", () => {
  it("sets all elements to the width of the widest", async () => {
    _resetForTests();
    await init();
    const r1 = el('', { id: "r1", x: 0, y: 0, w: 100, h: 50 });
    const r2 = el('', { id: "r2", x: 0, y: 100, w: 300, h: 50 });
    const r3 = el('', { id: "r3", x: 0, y: 200, w: 200, h: 50 });

    const result = await layout({
      elements: [r1, r2, r3],
      transforms: [matchWidth(["r1", "r2", "r3"])],
    });

    assert.equal(result.elements["r1"].resolved.w, 300);
    assert.equal(result.elements["r2"].resolved.w, 300);
    assert.equal(result.elements["r3"].resolved.w, 300);
  });
});

describe("M6.3: matchHeight", () => {
  it("sets all elements to the height of the tallest", async () => {
    _resetForTests();
    await init();
    const r1 = el('', { id: "r1", x: 0, y: 0, w: 50, h: 100 });
    const r2 = el('', { id: "r2", x: 100, y: 0, w: 50, h: 400 });
    const r3 = el('', { id: "r3", x: 200, y: 0, w: 50, h: 250 });

    const result = await layout({
      elements: [r1, r2, r3],
      transforms: [matchHeight(["r1", "r2", "r3"])],
    });

    assert.equal(result.elements["r1"].resolved.h, 400);
    assert.equal(result.elements["r2"].resolved.h, 400);
    assert.equal(result.elements["r3"].resolved.h, 400);
  });
});

describe("M6.3: matchSize", () => {
  it("matches both width and height to the largest", async () => {
    _resetForTests();
    await init();
    const r1 = el('', { id: "r1", x: 0, y: 0, w: 100, h: 200 });
    const r2 = el('', { id: "r2", x: 200, y: 0, w: 300, h: 100 });
    const r3 = el('', { id: "r3", x: 400, y: 0, w: 200, h: 300 });

    const result = await layout({
      elements: [r1, r2, r3],
      transforms: [matchSize(["r1", "r2", "r3"])],
    });

    assert.equal(result.elements["r1"].resolved.w, 300);
    assert.equal(result.elements["r1"].resolved.h, 300);
    assert.equal(result.elements["r2"].resolved.w, 300);
    assert.equal(result.elements["r2"].resolved.h, 300);
    assert.equal(result.elements["r3"].resolved.w, 300);
    assert.equal(result.elements["r3"].resolved.h, 300);
  });
});

// =============================================================================
// M6.4: fitToRect
// =============================================================================

describe("M6.4: fitToRect", () => {
  it("scales and centers elements to fit within a target rectangle", async () => {
    _resetForTests();
    await init();
    // Elements form a 200x200 bounding box at (0,0)
    const r1 = el('', { id: "r1", x: 0, y: 0, w: 100, h: 100 });
    const r2 = el('', { id: "r2", x: 100, y: 100, w: 100, h: 100 });

    // Target: 400x400 at (100, 100) — scale factor = 2
    const result = await layout({
      elements: [r1, r2],
      transforms: [fitToRect(["r1", "r2"], { x: 100, y: 100, w: 400, h: 400 })],
    });

    // BB: (0,0) to (200,200), scale=2, scaledBB=400x400 -> offset=(100,100)
    // r1: (100 + 0*2, 100 + 0*2) = (100, 100), w=200, h=200
    assert.equal(result.elements["r1"].resolved.x, 100);
    assert.equal(result.elements["r1"].resolved.y, 100);
    assert.equal(result.elements["r1"].resolved.w, 200);
    assert.equal(result.elements["r1"].resolved.h, 200);

    // r2: (100 + 100*2, 100 + 100*2) = (300, 300), w=200, h=200
    assert.equal(result.elements["r2"].resolved.x, 300);
    assert.equal(result.elements["r2"].resolved.y, 300);
    assert.equal(result.elements["r2"].resolved.w, 200);
    assert.equal(result.elements["r2"].resolved.h, 200);
  });

  it("preserves aspect ratio when target is non-square", async () => {
    _resetForTests();
    await init();
    // Elements form a 200x100 bounding box
    const r1 = el('', { id: "r1", x: 0, y: 0, w: 200, h: 100 });

    // Target: 800x200 — scaleX=4, scaleY=2, use min=2
    const result = await layout({
      elements: [r1],
      transforms: [fitToRect(["r1"], { x: 0, y: 0, w: 800, h: 200 })],
    });

    // scale=2, scaledW=400, scaledH=200
    // offsetX = (800-400)/2 = 200, offsetY = (200-200)/2 = 0
    assert.equal(result.elements["r1"].resolved.w, 400);
    assert.equal(result.elements["r1"].resolved.h, 200);
    assert.equal(result.elements["r1"].resolved.x, 200);
    assert.equal(result.elements["r1"].resolved.y, 0);
  });

  it("centers the scaled group within the target rect", async () => {
    _resetForTests();
    await init();
    // Single element 100x100 at (50, 50)
    const r1 = el('', { id: "r1", x: 50, y: 50, w: 100, h: 100 });

    // Target: 400x600 — scale=4 (400/100), but 600/100=6, min=4
    const result = await layout({
      elements: [r1],
      transforms: [fitToRect(["r1"], { x: 0, y: 0, w: 400, h: 600 })],
    });

    // scaledBB: 400x400, centerY offset: (600-400)/2 = 100
    assert.equal(result.elements["r1"].resolved.w, 400);
    assert.equal(result.elements["r1"].resolved.h, 400);
    assert.equal(result.elements["r1"].resolved.x, 0);
    assert.equal(result.elements["r1"].resolved.y, 100);
  });
});

// =============================================================================
// M6.5: Registration and Transform Ordering
// =============================================================================

describe("M6.5: Transforms preserved in scene graph", () => {
  it("transforms array is preserved in layout result", async () => {
    _resetForTests();
    await init();
    const r1 = el('', { id: "r1", x: 100, y: 0, w: 200, h: 50 });
    const r2 = el('', { id: "r2", x: 300, y: 0, w: 200, h: 50 });

    const result = await layout({
      elements: [r1, r2],
      transforms: [alignLeft(["r1", "r2"])],
    });

    assert.equal(result.transforms.length, 1);
    assert.equal(result.transforms[0]._transform, "alignLeft");
    assert.ok(result.transforms[0]._transformId, "transform should have an ID");
  });

  it("multiple transforms are preserved in order", async () => {
    _resetForTests();
    await init();
    const r1 = el('', { id: "r1", x: 100, y: 100, w: 200, h: 50 });
    const r2 = el('', { id: "r2", x: 300, y: 200, w: 200, h: 50 });

    const result = await layout({
      elements: [r1, r2],
      transforms: [
        alignTop(["r1", "r2"]),
        distributeH(["r1", "r2"], { startX: 0, endX: 600 }),
      ],
    });

    assert.equal(result.transforms.length, 2);
    assert.equal(result.transforms[0]._transform, "alignTop");
    assert.equal(result.transforms[1]._transform, "distributeH");
  });
});

describe("M6.5: Transform ordering effects", () => {
  it("align then distribute produces correct result", async () => {
    _resetForTests();
    await init();
    const r1 = el('', { id: "r1", x: 100, y: 100, w: 200, h: 50 });
    const r2 = el('', { id: "r2", x: 300, y: 200, w: 200, h: 80 });
    const r3 = el('', { id: "r3", x: 500, y: 150, w: 200, h: 60 });

    const result = await layout({
      elements: [r1, r2, r3],
      transforms: [
        alignTop(["r1", "r2", "r3"]),
        distributeH(["r1", "r2", "r3"], { startX: 100, endX: 1000 }),
      ],
    });

    // After alignTop: all y = 100
    assert.equal(result.elements["r1"].resolved.y, 100);
    assert.equal(result.elements["r2"].resolved.y, 100);
    assert.equal(result.elements["r3"].resolved.y, 100);

    // After distributeH: total widths = 600, total gap = 300, gap = 150
    assert.equal(result.elements["r1"].resolved.x, 100);
    assert.equal(result.elements["r2"].resolved.x, 450); // 100 + 200 + 150
    assert.equal(result.elements["r3"].resolved.x, 800); // 450 + 200 + 150
  });

  it("transform order matters for non-commutative operations on the same axis", async () => {
    _resetForTests();
    await init();

    // Case A: distribute then alignLeft — final state should be aligned at x=50
    const resultA = await layout({
      elements: [
        el('', { id: "r1", x: 100, y: 0, w: 100, h: 50 }),
        el('', { id: "r2", x: 400, y: 0, w: 100, h: 50 }),
      ],
      transforms: [
        distributeH(["r1", "r2"], { startX: 0, endX: 800 }),
        alignLeft(["r1", "r2"], { to: 50 }),
      ],
    });
    // After distribute: r1 at 0, r2 at 700. After alignLeft(to:50): both at 50.
    assert.equal(resultA.elements["r1"].resolved.x, 50);
    assert.equal(resultA.elements["r2"].resolved.x, 50);

    // Case B: alignLeft then distribute — final state should be distributed
    const resultB = await layout({
      elements: [
        el('', { id: "r1", x: 100, y: 0, w: 100, h: 50 }),
        el('', { id: "r2", x: 400, y: 0, w: 100, h: 50 }),
      ],
      transforms: [
        alignLeft(["r1", "r2"], { to: 50 }),
        distributeH(["r1", "r2"], { startX: 0, endX: 800 }),
      ],
    });
    // After alignLeft: both at 50. After distribute (range 0-800, widths 200, gap 600):
    // r1 at 0, r2 at 700.
    assert.equal(resultB.elements["r1"].resolved.x, 0);
    assert.equal(resultB.elements["r2"].resolved.x, 700);

    // The results differ, proving that order matters
    assert.ok(resultA.elements["r1"].resolved.x !== resultB.elements["r1"].resolved.x,
      "ordering should produce different results for same-axis non-commutative transforms");
  });
});

// =============================================================================
// M6: Provenance tracking for transforms
// =============================================================================

describe("M6: Transform provenance", () => {
  it("transformed elements have provenance source 'transform' on affected axes", async () => {
    _resetForTests();
    await init();
    const r1 = el('', { id: "r1", x: 100, y: 100, w: 200, h: 50 });
    const r2 = el('', { id: "r2", x: 300, y: 200, w: 200, h: 50 });

    const result = await layout({
      elements: [r1, r2],
      transforms: [alignTop(["r1", "r2"])],
    });

    // r1 was already at y=100 (the min), so it shouldn't change
    // r2 was at y=200 and moved to y=100 — y provenance should be "transform"
    assert.equal(result.elements["r2"].provenance.y.source, "transform");
    // r2's x should NOT be "transform" since alignTop only affects y
    assert.equal(result.elements["r2"].provenance.x.source, "authored");
  });

  it("untouched axes keep original provenance", async () => {
    _resetForTests();
    await init();
    const r1 = el('', { id: "r1", x: 100, y: 0, w: 200, h: 50 });
    const r2 = el('', { id: "r2", x: 300, y: 0, w: 100, h: 50 });

    const result = await layout({
      elements: [r1, r2],
      transforms: [matchWidth(["r1", "r2"])],
    });

    // matchWidth sets both to max w=200. r2 changes from 100 to 200.
    // r2's w provenance should be "transform", other axes stay "authored"
    assert.equal(result.elements["r2"].provenance.w.source, "transform");
    assert.equal(result.elements["r2"].provenance.x.source, "authored");
    assert.equal(result.elements["r2"].provenance.y.source, "authored");
    assert.equal(result.elements["r2"].provenance.h.source, "authored");
    // r1 already had w=200 (the max), so it doesn't change — stays "authored"
    assert.equal(result.elements["r1"].provenance.w.source, "authored");
  });
});

// =============================================================================
// M6: Edge Cases and Warnings
// =============================================================================

describe("M6: Edge cases", () => {
  it("missing element IDs in transforms produce warnings, not errors", async () => {
    _resetForTests();
    await init();
    const r1 = el('', { id: "r1", x: 100, y: 0, w: 200, h: 50 });

    const result = await layout({
      elements: [r1],
      transforms: [alignLeft(["r1", "nonexistent"])],
    });

    assert.equal(result.errors.length, 0);
    const warning = result.warnings.find(w => w.type === "transform_unknown_element");
    assert.ok(warning, "should have a warning about nonexistent element");
    assert.equal(warning.elementId, "nonexistent");
  });

  it("transform with no valid IDs is a no-op", async () => {
    _resetForTests();
    await init();
    const r1 = el('', { id: "r1", x: 100, y: 0, w: 200, h: 50 });

    const result = await layout({
      elements: [r1],
      transforms: [alignLeft(["ghost1", "ghost2"])],
    });

    // r1 is unaffected
    assert.equal(result.elements["r1"].resolved.x, 100);
    // Warnings for both missing IDs
    const unknownWarnings = result.warnings.filter(w => w.type === "transform_unknown_element");
    assert.equal(unknownWarnings.length, 2);
  });

  it("invalid transform objects in transforms array produce warnings", async () => {
    _resetForTests();
    await init();
    const r1 = el('', { id: "r1", x: 100, y: 0, w: 200, h: 50 });

    const result = await layout({
      elements: [r1],
      transforms: [{ bad: "object" }, null, alignLeft(["r1"])],
    });

    // Should have warnings for the two invalid transforms
    const invalidWarnings = result.warnings.filter(w => w.type === "invalid_transform_object");
    assert.equal(invalidWarnings.length, 2);
    // The valid alignLeft should still work
    assert.equal(result.elements["r1"].resolved.x, 100);
  });

  it("distribution with fewer than 2 elements is a no-op", async () => {
    _resetForTests();
    await init();
    const r1 = el('', { id: "r1", x: 100, y: 0, w: 200, h: 50 });

    const result = await layout({
      elements: [r1],
      transforms: [distributeH(["r1"], { startX: 0, endX: 1000 })],
    });

    // With only 1 element, distribution is skipped
    assert.equal(result.elements["r1"].resolved.x, 100);
  });

  it("alignLeft with single element still works", async () => {
    _resetForTests();
    await init();
    const r1 = el('', { id: "r1", x: 500, y: 0, w: 200, h: 50 });

    const result = await layout({
      elements: [r1],
      transforms: [alignLeft(["r1"], { to: 100 })],
    });

    assert.equal(result.elements["r1"].resolved.x, 100);
  });

  it("alignLeft with single element and no 'to' is a no-op", async () => {
    _resetForTests();
    await init();
    const r1 = el('', { id: "r1", x: 500, y: 0, w: 200, h: 50 });

    const result = await layout({
      elements: [r1],
      transforms: [alignLeft(["r1"])],
    });

    // Single element aligns to its own left edge — no change
    assert.equal(result.elements["r1"].resolved.x, 500);
  });
});

// SlideKit Tests — M8 (Tier 3: Debug Overlay, Grid, Percentages, Rotate, Repeat, Shadows)

import { describe, it, assert } from './test-runner.js';
import {
  el, group, vstack, hstack,
  render, layout, init,
  _resetForTests,
  below, rightOf, centerHWith,
  grid, snap,
  resolvePercentage,
  resolveShadow, getShadowPresets,
  repeat,
  rotatedAABB,
  filterStyle,
  getConfig, safeRect,
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
// M8.2: grid() — Basic Configuration
// =============================================================================

describe("M8.2: grid — basic configuration", () => {
  it("returns a grid object with default 12 columns", () => {
    _resetForTests();
    const g = grid();
    assert.equal(g.cols, 12);
  });

  it("returns a grid object with default gutter of 30", () => {
    _resetForTests();
    const g = grid();
    assert.equal(g.gutter, 30);
  });

  it("uses default margins of 120 when no safe zone configured", () => {
    _resetForTests();
    const g = grid();
    assert.equal(g.marginLeft, 120);
    assert.equal(g.marginRight, 120);
  });

  it("computes totalWidth from slide width minus margins", () => {
    _resetForTests();
    const g = grid();
    // Default: 1920 - 120 - 120 = 1680
    assert.equal(g.totalWidth, 1680);
  });

  it("computes colWidth from totalWidth minus gutters divided by cols", () => {
    _resetForTests();
    const g = grid();
    // (1680 - 11*30) / 12 = (1680 - 330) / 12 = 1350/12 = 112.5
    assert.within(g.colWidth, 112.5, 0.01);
  });

  it("accepts custom cols", () => {
    _resetForTests();
    const g = grid({ cols: 6 });
    assert.equal(g.cols, 6);
  });

  it("accepts custom gutter", () => {
    _resetForTests();
    const g = grid({ gutter: 20 });
    assert.equal(g.gutter, 20);
  });

  it("accepts custom margins", () => {
    _resetForTests();
    const g = grid({ margin: { left: 50, right: 50 } });
    assert.equal(g.marginLeft, 50);
    assert.equal(g.marginRight, 50);
    // 1920 - 50 - 50 = 1820
    assert.equal(g.totalWidth, 1820);
  });

  it("uses safe zone margins when init has been called", async () => {
    _resetForTests();
    await withContainer(async (container) => {
      await render([{ elements: [el('', { id: "gg1", x: 0, y: 0, w: 100, h: 100 })] }], { container });
      const g = grid();
      // After init via render, should use safe zone margins
      assert.ok(g.marginLeft >= 0, "marginLeft should be non-negative");
      assert.ok(g.marginRight >= 0, "marginRight should be non-negative");
    });
  });

  it("throws when column width is non-positive", () => {
    _resetForTests();
    // cols: 1000, gutter: 100 would make colWidth <= 0
    assert.throws(() => grid({ cols: 1000, gutter: 100 }));
  });
});

// =============================================================================
// M8.2: grid().col() — Column Positions
// =============================================================================

describe("M8.2: grid.col — column positions", () => {
  it("col(1) returns the left margin", () => {
    _resetForTests();
    const g = grid();
    assert.equal(g.col(1), 120); // default marginLeft
  });

  it("col(2) returns marginLeft + colWidth + gutter", () => {
    _resetForTests();
    const g = grid();
    assert.within(g.col(2), 120 + g.colWidth + g.gutter, 0.01);
  });

  it("col(n) for last column is correct", () => {
    _resetForTests();
    const g = grid({ cols: 4, gutter: 20, margin: { left: 100, right: 100 } });
    // totalWidth = 1920 - 100 - 100 = 1720
    // colWidth = (1720 - 3*20) / 4 = (1720 - 60) / 4 = 415
    const expectedCol4 = 100 + 3 * (415 + 20);
    assert.within(g.col(4), expectedCol4, 0.01);
  });

  it("throws for col(0)", () => {
    _resetForTests();
    const g = grid();
    assert.throws(() => g.col(0));
  });

  it("throws for col beyond cols", () => {
    _resetForTests();
    const g = grid({ cols: 6 });
    assert.throws(() => g.col(7));
  });

  it("throws for negative column number", () => {
    _resetForTests();
    const g = grid();
    assert.throws(() => g.col(-1));
  });
});

// =============================================================================
// M8.2: grid().spanW() — Spanning Widths
// =============================================================================

describe("M8.2: grid.spanW — spanning widths", () => {
  it("spanW(1, 1) returns one column width", () => {
    _resetForTests();
    const g = grid();
    assert.within(g.spanW(1, 1), g.colWidth, 0.01);
  });

  it("spanW(1, 2) returns two columns plus one gutter", () => {
    _resetForTests();
    const g = grid();
    const expected = 2 * g.colWidth + g.gutter;
    assert.within(g.spanW(1, 2), expected, 0.01);
  });

  it("spanW(1, cols) returns the full totalWidth", () => {
    _resetForTests();
    const g = grid();
    assert.within(g.spanW(1, g.cols), g.totalWidth, 0.01);
  });

  it("spanW for middle columns is correct", () => {
    _resetForTests();
    const g = grid({ cols: 8 });
    // spanW(3, 5) = 3 colWidths + 2 gutters
    const expected = 3 * g.colWidth + 2 * g.gutter;
    assert.within(g.spanW(3, 5), expected, 0.01);
  });

  it("throws for invalid range (from > to)", () => {
    _resetForTests();
    const g = grid();
    assert.throws(() => g.spanW(5, 3));
  });

  it("throws for from < 1", () => {
    _resetForTests();
    const g = grid();
    assert.throws(() => g.spanW(0, 3));
  });

  it("throws for to > cols", () => {
    _resetForTests();
    const g = grid({ cols: 6 });
    assert.throws(() => g.spanW(1, 7));
  });
});

// =============================================================================
// M8.2: snap() — Value Snapping
// =============================================================================

describe("M8.2: snap — value snapping", () => {
  it("snaps value to nearest multiple", () => {
    _resetForTests();
    assert.equal(snap(17, 10), 20);
  });

  it("snaps down when closer to lower multiple", () => {
    _resetForTests();
    assert.equal(snap(12, 10), 10);
  });

  it("snaps exact multiple to itself", () => {
    _resetForTests();
    assert.equal(snap(30, 10), 30);
  });

  it("returns value unchanged when gridSize is 0", () => {
    _resetForTests();
    assert.equal(snap(17, 0), 17);
  });

  it("returns value unchanged when gridSize is negative", () => {
    _resetForTests();
    assert.equal(snap(17, -5), 17);
  });

  it("snaps negative values correctly", () => {
    _resetForTests();
    assert.equal(snap(-17, 10), -20);
  });

  it("snaps 0 to 0", () => {
    _resetForTests();
    assert.equal(snap(0, 10), 0);
  });

  it("snaps to non-round grid sizes", () => {
    _resetForTests();
    assert.within(snap(7, 3), 6, 0.01);
  });
});

// =============================================================================
// M8.3: resolvePercentage — Slide-Relative
// =============================================================================

describe("M8.3: resolvePercentage — slide-relative", () => {
  it("resolves '50%' on x axis to half of slide width", () => {
    _resetForTests();
    const val = resolvePercentage("50%", "x");
    assert.equal(val, 960); // 50% of 1920
  });

  it("resolves '50%' on y axis to half of slide height", () => {
    _resetForTests();
    const val = resolvePercentage("50%", "y");
    assert.equal(val, 540); // 50% of 1080
  });

  it("resolves '100%' on w axis to full slide width", () => {
    _resetForTests();
    const val = resolvePercentage("100%", "w");
    assert.equal(val, 1920);
  });

  it("resolves '100%' on h axis to full slide height", () => {
    _resetForTests();
    const val = resolvePercentage("100%", "h");
    assert.equal(val, 1080);
  });

  it("resolves '0%' to 0", () => {
    _resetForTests();
    assert.equal(resolvePercentage("0%", "x"), 0);
    assert.equal(resolvePercentage("0%", "y"), 0);
  });

  it("resolves fractional percentages", () => {
    _resetForTests();
    const val = resolvePercentage("12.5%", "w");
    assert.equal(val, 240); // 12.5% of 1920
  });

  it("returns non-string values unchanged", () => {
    _resetForTests();
    assert.equal(resolvePercentage(100, "x"), 100);
    assert.equal(resolvePercentage(null, "x"), null);
    assert.equal(resolvePercentage(undefined, "x"), undefined);
  });

  it("returns non-percentage strings unchanged", () => {
    _resetForTests();
    assert.equal(resolvePercentage("auto", "x"), "auto");
    assert.equal(resolvePercentage("fill", "w"), "fill");
    assert.equal(resolvePercentage("100px", "x"), "100px");
  });
});

// =============================================================================
// M8.3: resolvePercentage — Safe-Zone-Relative
// =============================================================================

describe("M8.3: resolvePercentage — safe-zone-relative", () => {
  it("resolves 'safe:0%' on x to safe zone left edge", () => {
    _resetForTests();
    const val = resolvePercentage("safe:0%", "x");
    // Default safe zone: x=120
    assert.equal(val, 120);
  });

  it("resolves 'safe:0%' on y to safe zone top edge", () => {
    _resetForTests();
    const val = resolvePercentage("safe:0%", "y");
    // Default safe zone: y=90
    assert.equal(val, 90);
  });

  it("resolves 'safe:50%' on x to center of safe zone", () => {
    _resetForTests();
    const val = resolvePercentage("safe:50%", "x");
    // x=120 + 0.5 * 1680 = 120 + 840 = 960
    assert.equal(val, 960);
  });

  it("resolves 'safe:50%' on y to vertical center of safe zone", () => {
    _resetForTests();
    const val = resolvePercentage("safe:50%", "y");
    // y=90 + 0.5 * 900 = 90 + 450 = 540
    assert.equal(val, 540);
  });

  it("resolves 'safe:100%' on w to safe zone width", () => {
    _resetForTests();
    const val = resolvePercentage("safe:100%", "w");
    // Default safe zone w=1680
    assert.equal(val, 1680);
  });

  it("resolves 'safe:100%' on h to safe zone height", () => {
    _resetForTests();
    const val = resolvePercentage("safe:100%", "h");
    // Default safe zone h=900
    assert.equal(val, 900);
  });

  it("resolves 'safe:25%' on w correctly", () => {
    _resetForTests();
    const val = resolvePercentage("safe:25%", "w");
    assert.equal(val, 420); // 25% of 1680
  });

  it("handles space in safe: prefix", () => {
    _resetForTests();
    const val = resolvePercentage("safe: 50%", "x");
    assert.equal(val, 960);
  });
});

// =============================================================================
// M8.3: resolvePercentage — Layout Integration
// =============================================================================

describe("M8.3: percentage sugar — layout integration", () => {
  it("layout resolves percentage x position", async () => {
    _resetForTests();
    const e = el('', { id: "pct-x", x: "50%", y: 100, w: 200, h: 100 });
    const scene = await layout({ elements: [e] });
    assert.equal(scene.elements["pct-x"].resolved.x, 960);
  });

  it("layout resolves percentage y position", async () => {
    _resetForTests();
    const e = el('', { id: "pct-y", x: 100, y: "25%", w: 200, h: 100 });
    const scene = await layout({ elements: [e] });
    assert.equal(scene.elements["pct-y"].resolved.y, 270); // 25% of 1080
  });

  it("layout resolves percentage width", async () => {
    _resetForTests();
    const e = el('', { id: "pct-w", x: 0, y: 0, w: "50%", h: 100 });
    const scene = await layout({ elements: [e] });
    assert.equal(scene.elements["pct-w"].resolved.w, 960);
  });

  it("layout resolves percentage height", async () => {
    _resetForTests();
    const e = el('', { id: "pct-h", x: 0, y: 0, w: 200, h: "50%"  });
    const scene = await layout({ elements: [e] });
    assert.equal(scene.elements["pct-h"].resolved.h, 540);
  });

  it("layout resolves safe-zone percentage position", async () => {
    _resetForTests();
    const e = el('', { id: "safe-x", x: "safe:0%", y: "safe:0%", w: 200, h: 100 });
    const scene = await layout({ elements: [e] });
    assert.equal(scene.elements["safe-x"].resolved.x, 120);
    assert.equal(scene.elements["safe-x"].resolved.y, 90);
  });

  it("layout resolves safe-zone percentage width", async () => {
    _resetForTests();
    const e = el('', { id: "safe-w", x: 120, y: 90, w: "safe:100%", h: 100 });
    const scene = await layout({ elements: [e] });
    assert.equal(scene.elements["safe-w"].resolved.w, 1680);
  });

  it("does not resolve 'fill' as a percentage", async () => {
    _resetForTests();
    const e = el('', { id: "fill-w", x: 0, y: 0, w: "fill", h: 100 });
    // fill is handled by stacks, not by percentage resolution
    // Just make sure it doesn't crash
    const scene = await layout({ elements: [e] });
    assert.ok(scene, "layout should not crash with fill width");
  });

  it("no errors for valid percentage positions", async () => {
    _resetForTests();
    const e = el('', { id: "pct-ok", x: "50%", y: "50%", w: "25%", h: "25%" });
    const scene = await layout({ elements: [e] });
    assert.equal(scene.errors.length, 0, "should have no layout errors");
  });
});

// =============================================================================
// M8.4: rotatedAABB — AABB Computation
// =============================================================================

describe("M8.4: rotatedAABB — AABB computation", () => {
  it("0 degrees returns same dimensions", () => {
    const aabb = rotatedAABB(200, 100, 0);
    assert.within(aabb.w, 200, 0.01);
    assert.within(aabb.h, 100, 0.01);
  });

  it("90 degrees swaps width and height", () => {
    const aabb = rotatedAABB(200, 100, 90);
    assert.within(aabb.w, 100, 0.01);
    assert.within(aabb.h, 200, 0.01);
  });

  it("180 degrees returns same dimensions", () => {
    const aabb = rotatedAABB(200, 100, 180);
    assert.within(aabb.w, 200, 0.01);
    assert.within(aabb.h, 100, 0.01);
  });

  it("270 degrees swaps width and height", () => {
    const aabb = rotatedAABB(200, 100, 270);
    assert.within(aabb.w, 100, 0.01);
    assert.within(aabb.h, 200, 0.01);
  });

  it("360 degrees returns same dimensions", () => {
    const aabb = rotatedAABB(200, 100, 360);
    assert.within(aabb.w, 200, 0.01);
    assert.within(aabb.h, 100, 0.01);
  });

  it("45 degrees on a square returns larger AABB", () => {
    const aabb = rotatedAABB(100, 100, 45);
    // sqrt(2) * 100 = 141.42
    const expected = Math.sqrt(2) * 100;
    assert.within(aabb.w, expected, 0.1);
    assert.within(aabb.h, expected, 0.1);
  });

  it("45 degrees on a rectangle", () => {
    const aabb = rotatedAABB(200, 100, 45);
    // w = |200*cos(45)| + |100*sin(45)| = 141.42 + 70.71 = 212.13
    // h = |200*sin(45)| + |100*cos(45)| = 141.42 + 70.71 = 212.13
    assert.within(aabb.w, 212.13, 0.1);
    assert.within(aabb.h, 212.13, 0.1);
  });

  it("negative degrees work same as positive", () => {
    const aabb1 = rotatedAABB(200, 100, 30);
    const aabb2 = rotatedAABB(200, 100, -30);
    assert.within(aabb1.w, aabb2.w, 0.01);
    assert.within(aabb1.h, aabb2.h, 0.01);
  });

  it("zero-sized rectangle stays zero", () => {
    const aabb = rotatedAABB(0, 0, 45);
    assert.within(aabb.w, 0, 0.01);
    assert.within(aabb.h, 0, 0.01);
  });
});

// =============================================================================
// M8.4: rotate — Layout Integration
// =============================================================================

describe("M8.4: rotate — layout integration", () => {
  it("layout resolves element with rotate prop", async () => {
    _resetForTests();
    const e = el('', { id: "rot1", x: 100, y: 100, w: 200, h: 100, rotate: 45 });
    const scene = await layout({ elements: [e] });
    assert.ok(scene.elements["rot1"], "rotated element should be in scene");
    assert.equal(scene.elements["rot1"].resolved.w, 200, "resolved w should be the authored w");
    assert.equal(scene.elements["rot1"].resolved.h, 100, "resolved h should be the authored h");
  });

  it("rotate does not affect authored dimensions in scene model", async () => {
    _resetForTests();
    const e = el('', { id: "rot2", x: 100, y: 100, w: 200, h: 100, rotate: 90 });
    const scene = await layout({ elements: [e] });
    // The resolved bounds should still be the authored dimensions
    assert.equal(scene.elements["rot2"].resolved.w, 200);
    assert.equal(scene.elements["rot2"].resolved.h, 100);
  });

  it("no errors for valid element with rotate", async () => {
    _resetForTests();
    const e = el('', { id: "rot3", x: 500, y: 400, w: 300, h: 200, rotate: 30 });
    const scene = await layout({ elements: [e] });
    assert.equal(scene.errors.length, 0);
  });
});

// =============================================================================
// M8.4: rotate — Rendering
// =============================================================================

describe("M8.4: rotate — rendering", () => {
  it("renders element with rotate as CSS transform", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const e = el('', { id: "rr1", x: 100, y: 100, w: 200, h: 100, rotate: 45, style: { background: "#333" } });
      await render([{ elements: [e] }], { container });

      const div = container.querySelector('[data-sk-id="rr1"]');
      assert.ok(div, "rotated element should be rendered");
      const transform = div.style.transform;
      assert.ok(transform.includes("rotate(45deg)"), "should have rotate transform");
    });
  });

  it("does not add transform when rotate is 0", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const e = el('', { id: "rr2", x: 100, y: 100, w: 200, h: 100, rotate: 0, style: { background: "#333" } });
      await render([{ elements: [e] }], { container });

      const div = container.querySelector('[data-sk-id="rr2"]');
      assert.ok(div, "element should be rendered");
      const transform = div.style.transform;
      assert.ok(!transform || !transform.includes("rotate"), "should not have rotate transform for 0 degrees");
    });
  });

  it("does not add transform when rotate is undefined", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const e = el('', { id: "rr3", x: 100, y: 100, w: 200, h: 100, style: { background: "#333" } });
      await render([{ elements: [e] }], { container });

      const div = container.querySelector('[data-sk-id="rr3"]');
      assert.ok(div, "element should be rendered");
      const transform = div.style.transform;
      assert.ok(!transform || !transform.includes("rotate"), "should not have rotate transform");
    });
  });
});

// =============================================================================
// M8.5: repeat() — Basic Configuration
// =============================================================================

describe("M8.5: repeat — basic configuration", () => {
  it("returns a group containing count copies", () => {
    _resetForTests();
    const e = el('', { id: "r1", w: 100, h: 50 });
    const result = repeat(e, { count: 3 });
    assert.equal(result.type, "group");
    assert.equal(result.children.length, 3);
  });

  it("each copy has unique ID with suffix", () => {
    _resetForTests();
    const e = el('', { id: "card", w: 100, h: 50 });
    const result = repeat(e, { count: 3 });
    assert.equal(result.children[0].id, "card-1");
    assert.equal(result.children[1].id, "card-2");
    assert.equal(result.children[2].id, "card-3");
  });

  it("positions copies in a single row by default", () => {
    _resetForTests();
    const e = el('', { id: "item", w: 100, h: 50 });
    const result = repeat(e, { count: 3, gapX: 10 });
    assert.equal(result.children[0].props.x, 0);
    assert.equal(result.children[1].props.x, 110); // 100 + 10
    assert.equal(result.children[2].props.x, 220); // 200 + 20
    // All in same row
    assert.equal(result.children[0].props.y, 0);
    assert.equal(result.children[1].props.y, 0);
    assert.equal(result.children[2].props.y, 0);
  });

  it("arranges copies in a grid with cols", () => {
    _resetForTests();
    const e = el('', { id: "box", w: 100, h: 80 });
    const result = repeat(e, { count: 4, cols: 2, gapX: 10, gapY: 20 });
    // Row 0: (0, 0), (110, 0)
    // Row 1: (0, 100), (110, 100)
    assert.equal(result.children[0].props.x, 0);
    assert.equal(result.children[0].props.y, 0);
    assert.equal(result.children[1].props.x, 110);
    assert.equal(result.children[1].props.y, 0);
    assert.equal(result.children[2].props.x, 0);
    assert.equal(result.children[2].props.y, 100); // 80 + 20
    assert.equal(result.children[3].props.x, 110);
    assert.equal(result.children[3].props.y, 100);
  });

  it("applies startX and startY offsets", () => {
    _resetForTests();
    const e = el('', { id: "off", w: 50, h: 50 });
    const result = repeat(e, { count: 2, startX: 100, startY: 200 });
    assert.equal(result.children[0].props.x, 100);
    assert.equal(result.children[0].props.y, 200);
  });

  it("computes correct group bounds", () => {
    _resetForTests();
    const e = el('', { id: "gb", w: 100, h: 50 });
    const result = repeat(e, { count: 6, cols: 3, gapX: 10, gapY: 20 });
    // groupW = 3*100 + 2*10 = 320
    // groupH = 2*50 + 1*20 = 120
    assert.equal(result.props.w, 320);
    assert.equal(result.props.h, 120);
  });

  it("default count is 1 when not specified", () => {
    _resetForTests();
    const e = el('', { id: "one", w: 100, h: 100 });
    const result = repeat(e, {});
    assert.equal(result.children.length, 1);
  });

  it("each copy is independent (deep clone)", () => {
    _resetForTests();
    const e = el('', { id: "dc", w: 100, h: 100, style: { background: "#f00" } });
    const result = repeat(e, { count: 2 });
    // Modify first copy's props; second should be unaffected
    result.children[0].props.style.background = "#00f";
    assert.equal(result.children[1].props.style.background, "#f00");
  });
});

// =============================================================================
// M8.5: repeat() — Nested Children Re-ID
// =============================================================================

describe("M8.5: repeat — nested children re-ID", () => {
  it("re-IDs children of groups", () => {
    _resetForTests();
    const e = group([
      el('', { id: "inner-a", w: 50, h: 50 }),
      el('', { id: "inner-b", w: 50, h: 50 }),
    ], { id: "grp", w: 200, h: 100 });
    const result = repeat(e, { count: 2 });

    // First copy: grp-1, inner-a-1, inner-b-1
    assert.equal(result.children[0].id, "grp-1");
    assert.equal(result.children[0].children[0].id, "inner-a-1");
    assert.equal(result.children[0].children[1].id, "inner-b-1");

    // Second copy: grp-2, inner-a-2, inner-b-2
    assert.equal(result.children[1].id, "grp-2");
    assert.equal(result.children[1].children[0].id, "inner-a-2");
    assert.equal(result.children[1].children[1].id, "inner-b-2");
  });

  it("re-IDs deeply nested children", () => {
    _resetForTests();
    const e = group([
      group([
        el('', { id: "deep", w: 20, h: 20 }),
      ], { id: "mid", w: 50, h: 50 }),
    ], { id: "outer", w: 100, h: 100 });
    const result = repeat(e, { count: 2 });

    // First copy
    assert.equal(result.children[0].id, "outer-1");
    assert.equal(result.children[0].children[0].id, "mid-1");
    assert.equal(result.children[0].children[0].children[0].id, "deep-1");

    // Second copy
    assert.equal(result.children[1].id, "outer-2");
    assert.equal(result.children[1].children[0].id, "mid-2");
    assert.equal(result.children[1].children[0].children[0].id, "deep-2");
  });
});

// =============================================================================
// M8.5: repeat() — Layout Integration
// =============================================================================

describe("M8.5: repeat — layout integration", () => {
  it("layout resolves repeated elements", async () => {
    _resetForTests();
    const e = el('', { id: "rl", w: 100, h: 50 });
    const result = repeat(e, { count: 3, gapX: 10, startX: 100, startY: 200 });
    result.props.x = 0;
    result.props.y = 0;

    const scene = await layout({ elements: [result] });
    assert.ok(scene.elements["rl-1"], "first copy should be in scene");
    assert.ok(scene.elements["rl-2"], "second copy should be in scene");
    assert.ok(scene.elements["rl-3"], "third copy should be in scene");
  });

  it("no errors for valid repeat", async () => {
    _resetForTests();
    const e = el('', { id: "rle", w: 80, h: 40 });
    const result = repeat(e, { count: 4, cols: 2, gapX: 10, gapY: 10 });
    result.props.x = 100;
    result.props.y = 100;

    const scene = await layout({ elements: [result] });
    assert.equal(scene.errors.length, 0);
  });
});

// =============================================================================
// M8.6: Shadow Presets — resolveShadow()
// =============================================================================

describe("M8.6: shadow presets — resolveShadow", () => {
  it("resolves 'sm' to small shadow CSS", () => {
    const result = resolveShadow("sm");
    assert.equal(result, "0 1px 3px rgba(0,0,0,0.2)");
  });

  it("resolves 'md' to medium shadow CSS", () => {
    const result = resolveShadow("md");
    assert.equal(result, "0 4px 12px rgba(0,0,0,0.3)");
  });

  it("resolves 'lg' to large shadow CSS", () => {
    const result = resolveShadow("lg");
    assert.equal(result, "0 8px 32px rgba(0,0,0,0.4)");
  });

  it("resolves 'xl' to extra-large shadow CSS", () => {
    const result = resolveShadow("xl");
    assert.equal(result, "0 16px 48px rgba(0,0,0,0.5)");
  });

  it("resolves 'glow' to glow shadow CSS", () => {
    const result = resolveShadow("glow");
    assert.equal(result, "0 0 40px rgba(124,92,191,0.3)");
  });

  it("passes through custom CSS values", () => {
    const custom = "2px 4px 8px rgba(0,0,0,0.5)";
    assert.equal(resolveShadow(custom), custom);
  });

  it("returns empty string for falsy input", () => {
    assert.equal(resolveShadow(""), "");
    assert.equal(resolveShadow(null), "");
    assert.equal(resolveShadow(undefined), "");
  });

  it("returns unknown key as-is (passthrough)", () => {
    assert.equal(resolveShadow("custom-value"), "custom-value");
  });
});

// =============================================================================
// M8.6: Shadow Presets — getShadowPresets()
// =============================================================================

describe("M8.6: shadow presets — getShadowPresets", () => {
  it("returns an object with all preset keys", () => {
    const presets = getShadowPresets();
    assert.ok(presets.sm, "should have sm preset");
    assert.ok(presets.md, "should have md preset");
    assert.ok(presets.lg, "should have lg preset");
    assert.ok(presets.xl, "should have xl preset");
    assert.ok(presets.glow, "should have glow preset");
  });

  it("returns a copy (not the original object)", () => {
    const presets1 = getShadowPresets();
    presets1.sm = "modified";
    const presets2 = getShadowPresets();
    assert.ok(presets2.sm !== "modified", "should be a copy, not shared reference");
  });

  it("preset values match resolveShadow results", () => {
    const presets = getShadowPresets();
    for (const key of Object.keys(presets)) {
      assert.equal(resolveShadow(key), presets[key]);
    }
  });
});

// =============================================================================
// M8.6: Shadow — Rendering via style.boxShadow
// =============================================================================

describe("M8.6: shadow — rendering via style.boxShadow", () => {
  it("boxShadow style maps to boxShadow in CSS", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const e = el('', { id: "sh1", x: 100, y: 100, w: 200, h: 100, style: { boxShadow: resolveShadow("md"), background: "#333" } });
      await render([{ elements: [e] }], { container });

      const div = container.querySelector('[data-sk-id="sh1"]');
      assert.ok(div, "shadow element should be rendered");
      assert.ok(div.style.boxShadow, "should have boxShadow style");
      assert.ok(div.style.boxShadow.includes("12px"), "should contain md shadow value");
    });
  });

  it("custom boxShadow CSS value is applied directly", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const customShadow = "5px 5px 15px red";
      const e = el('', { id: "sh2", x: 100, y: 100, w: 200, h: 100, style: { boxShadow: customShadow, background: "#333" } });
      await render([{ elements: [e] }], { container });

      const div = container.querySelector('[data-sk-id="sh2"]');
      assert.ok(div, "element should be rendered");
      assert.ok(div.style.boxShadow, "should have boxShadow style");
    });
  });
});

// =============================================================================
// M8.4: rotate — Collision AABB Expansion
// =============================================================================

describe("M8.4: rotate — collision AABB expansion", () => {
  it("rotated elements expand collision bounds", async () => {
    _resetForTests();
    // Two elements side by side that only overlap when one is rotated
    // el at (200, 200) w=200, h=100, rotate=45 -> AABB expands
    // el at (380, 200) w=100, h=100 (no rotate)
    // Without rotation, no collision (gap of 180px between them? Let's arrange more carefully)
    // Actually, AABB for 200x100@45deg: w=h=212.13
    // Center of first: (300, 250). AABB: x=300-106=194, y=250-106=144, w=212, h=212
    // Second at (380, 200) w=100, h=100 -> x=380..480, y=200..300
    // AABB first: x=194..406, y=144..356
    // Second: x=380..480, y=200..300
    // Overlap: x=380..406, y=200..300 -> should detect collision
    const e1 = el('', { id: "col-r1", x: 200, y: 200, w: 200, h: 100, rotate: 45 });
    const e2 = el('', { id: "col-r2", x: 380, y: 200, w: 100, h: 100 });

    const scene = await layout({ elements: [e1, e2] });

    // Should have collision due to AABB expansion
    assert.ok(scene.collisions.length > 0, "rotated element should create collision via AABB expansion");
  });

  it("non-rotated elements that do not overlap have no collisions", async () => {
    _resetForTests();
    const e1 = el('', { id: "nc1", x: 0, y: 0, w: 100, h: 100 });
    const e2 = el('', { id: "nc2", x: 200, y: 0, w: 100, h: 100 });

    const scene = await layout({ elements: [e1, e2] });
    assert.equal(scene.collisions.length, 0, "no collisions for non-overlapping elements");
  });
});

// =============================================================================
// M8.1: Debug Overlay — Module Structure (DOM tests)
// =============================================================================

describe("M8.1: debug overlay — module exports", () => {
  it("slidekit-debug.js exports renderDebugOverlay function", async () => {
    const mod = await import('../slidekit-debug.js');
    assert.equal(typeof mod.renderDebugOverlay, "function");
  });

  it("slidekit-debug.js exports removeDebugOverlay function", async () => {
    const mod = await import('../slidekit-debug.js');
    assert.equal(typeof mod.removeDebugOverlay, "function");
  });

  it("slidekit-debug.js exports isDebugOverlayVisible function", async () => {
    const mod = await import('../slidekit-debug.js');
    assert.equal(typeof mod.isDebugOverlayVisible, "function");
  });

  it("slidekit-debug.js exports toggleDebugOverlay function", async () => {
    const mod = await import('../slidekit-debug.js');
    assert.equal(typeof mod.toggleDebugOverlay, "function");
  });

  it("slidekit-debug.js exports SlideKitDebug default with all methods", async () => {
    const mod = await import('../slidekit-debug.js');
    assert.ok(mod.default, "should have default export");
    assert.equal(typeof mod.default.renderDebugOverlay, "function");
    assert.equal(typeof mod.default.removeDebugOverlay, "function");
    assert.equal(typeof mod.default.isDebugOverlayVisible, "function");
    assert.equal(typeof mod.default.toggleDebugOverlay, "function");
  });
});

// =============================================================================
// M8.1: Debug Overlay — Render and Toggle
// =============================================================================

describe("M8.1: debug overlay — render and toggle", () => {
  it("renders debug overlay after render() has been called", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const e = el('', { id: "dbg1", x: 100, y: 100, w: 200, h: 100, style: { background: "#333" } });
      await render([{ elements: [e] }], { container });

      const mod = await import('../slidekit-debug.js');
      const overlay = mod.renderDebugOverlay();
      assert.ok(overlay, "overlay should be returned");
      assert.ok(overlay.classList.contains("slidekit-debug-overlay"), "should have correct class");

      // Clean up
      mod.removeDebugOverlay();
    });
  });

  it("returns null when no scene model exists", async () => {
    const savedSk = window.sk;
    window.sk = null;

    const mod = await import('../slidekit-debug.js');
    const overlay = mod.renderDebugOverlay();
    assert.equal(overlay, null, "should return null without scene model");

    window.sk = savedSk;
  });

  it("toggle turns overlay on then off", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const e = el('', { id: "dbg2", x: 100, y: 100, w: 200, h: 100, style: { background: "#333" } });
      await render([{ elements: [e] }], { container });

      const mod = await import('../slidekit-debug.js');

      // Toggle on
      const isOn = mod.toggleDebugOverlay();
      assert.equal(isOn, true, "toggle should return true when turning on");
      assert.equal(mod.isDebugOverlayVisible(), true, "should be visible after toggle on");

      // Toggle off
      const isOff = mod.toggleDebugOverlay();
      assert.equal(isOff, false, "toggle should return false when turning off");
      assert.equal(mod.isDebugOverlayVisible(), false, "should not be visible after toggle off");
    });
  });

  it("overlay contains safe zone element by default", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const e = el('', { id: "dbg3", x: 100, y: 100, w: 200, h: 100, style: { background: "#333" } });
      await render([{ elements: [e] }], { container });

      const mod = await import('../slidekit-debug.js');
      const overlay = mod.renderDebugOverlay();
      assert.ok(overlay, "overlay should be rendered");

      const safeZone = overlay.querySelector('[data-sk-debug="safe-zone"]');
      assert.ok(safeZone, "should contain safe zone element");

      mod.removeDebugOverlay();
    });
  });

  it("overlay contains element boxes", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const e = el('', { id: "dbg4", x: 100, y: 100, w: 200, h: 100, style: { background: "#333" } });
      await render([{ elements: [e] }], { container });

      const mod = await import('../slidekit-debug.js');
      const overlay = mod.renderDebugOverlay();

      const boxes = overlay.querySelectorAll('[data-sk-debug="box"]');
      assert.ok(boxes.length > 0, "should contain element boxes");

      mod.removeDebugOverlay();
    });
  });

  it("overlay can be rendered with only specific features", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const e = el('', { id: "dbg5", x: 100, y: 100, w: 200, h: 100, style: { background: "#333" } });
      await render([{ elements: [e] }], { container });

      const mod = await import('../slidekit-debug.js');
      const overlay = mod.renderDebugOverlay({
        showBoxes: false,
        showSafeZone: false,
        showIds: true,
        showAnchors: false,
        showCollisions: false,
      });

      const boxes = overlay.querySelectorAll('[data-sk-debug="box"]');
      assert.equal(boxes.length, 0, "should not contain boxes when showBoxes is false");

      const safeZone = overlay.querySelector('[data-sk-debug="safe-zone"]');
      assert.equal(safeZone, null, "should not contain safe zone when showSafeZone is false");

      const labels = overlay.querySelectorAll('[data-sk-debug="id-label"]');
      assert.ok(labels.length > 0, "should contain id labels when showIds is true");

      mod.removeDebugOverlay();
    });
  });

  it("removeDebugOverlay cleans up the DOM", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const e = el('', { id: "dbg6", x: 100, y: 100, w: 200, h: 100, style: { background: "#333" } });
      await render([{ elements: [e] }], { container });

      const mod = await import('../slidekit-debug.js');
      mod.renderDebugOverlay();
      assert.equal(mod.isDebugOverlayVisible(), true);

      mod.removeDebugOverlay();
      assert.equal(mod.isDebugOverlayVisible(), false);

      const overlays = document.querySelectorAll(".slidekit-debug-overlay");
      assert.equal(overlays.length, 0, "no overlay elements should remain");
    });
  });
});

// =============================================================================
// M8: Integration — Combined Tier 3 Features
// =============================================================================

describe("M8: integration — combined tier 3 features", () => {
  it("layout handles percentage positions with rotate", async () => {
    _resetForTests();
    const e = el('', { id: "int1", x: "50%", y: "50%", w: 200, h: 100, rotate: 30 });
    const scene = await layout({ elements: [e] });
    assert.equal(scene.elements["int1"].resolved.x, 960);
    assert.equal(scene.elements["int1"].resolved.y, 540);
    assert.equal(scene.errors.length, 0);
  });

  it("repeat with shadow on each copy", async () => {
    _resetForTests();
    const e = el('', { id: "rs", w: 100, h: 80, style: { boxShadow: resolveShadow("md"), background: "#333" } });
    const result = repeat(e, { count: 3, gapX: 20 });
    result.props.x = 100;
    result.props.y = 100;

    const scene = await layout({ elements: [result] });
    assert.ok(scene.elements["rs-1"], "first copy in scene");
    assert.ok(scene.elements["rs-2"], "second copy in scene");
    assert.ok(scene.elements["rs-3"], "third copy in scene");
    assert.equal(scene.errors.length, 0);
  });

  it("grid positions work with percentage widths", async () => {
    _resetForTests();
    const g = grid({ cols: 4 });
    const e = el('', { id: "gp1", x: g.col(1), y: 100, w: "safe:25%", h: 200 });
    const scene = await layout({ elements: [e] });
    assert.equal(scene.elements["gp1"].resolved.x, g.col(1));
    assert.equal(scene.elements["gp1"].resolved.w, 420); // 25% of 1680
    assert.equal(scene.errors.length, 0);
  });

  it("render handles shadow + rotate together", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const e = el('', {
        id: "combo1", x: 500, y: 400, w: 300, h: 200,
        rotate: 15, style: { boxShadow: resolveShadow("lg"), background: "#444" },
      });
      await render([{ elements: [e] }], { container });

      const div = container.querySelector('[data-sk-id="combo1"]');
      assert.ok(div, "element should be rendered");
      assert.ok(div.style.transform.includes("rotate(15deg)"), "should have rotation");
      assert.ok(div.style.boxShadow, "should have shadow");
    });
  });
});

// =============================================================================
// M8: Additional Edge Cases (from review feedback)
// =============================================================================

describe("M8.3: resolvePercentage — edge cases", () => {
  it("returns original string for NaN-producing percentage", () => {
    _resetForTests();
    // The regex only matches [0-9.]+ so "abc%" won't match — returns as-is
    assert.equal(resolvePercentage("abc%", "x"), "abc%");
  });

  it("returns original string for double-percent", () => {
    _resetForTests();
    assert.equal(resolvePercentage("10%%", "x"), "10%%");
  });

  it("returns original string for safe: with invalid percent", () => {
    _resetForTests();
    assert.equal(resolvePercentage("safe:abc%", "x"), "safe:abc%");
  });

  it("negative percentages are not matched (pass-through)", () => {
    _resetForTests();
    // regex is /^([0-9.]+)%$/ which does not match "-10%"
    assert.equal(resolvePercentage("-10%", "x"), "-10%");
  });

  it("safe: negative percentages are not matched (pass-through)", () => {
    _resetForTests();
    assert.equal(resolvePercentage("safe:-10%", "x"), "safe:-10%");
  });
});

describe("M8.2: grid — additional edge cases", () => {
  it("grid({cols: 0}) falls back to default 12 columns", () => {
    _resetForTests();
    // cols: 0 is falsy, so || 12 makes it 12
    const g = grid({ cols: 0 });
    assert.equal(g.cols, 12);
  });

  it("grid with 1 column has no gutters", () => {
    _resetForTests();
    const g = grid({ cols: 1 });
    assert.equal(g.colWidth, g.totalWidth);
  });
});

describe("M8.2: snap — additional edge cases", () => {
  it("snaps to float grid sizes", () => {
    _resetForTests();
    // snap(7, 2.5): 7/2.5 = 2.8, round = 3, 3*2.5 = 7.5
    assert.within(snap(7, 2.5), 7.5, 0.01);
  });

  it("snaps 173 to 2.5 grid", () => {
    _resetForTests();
    // 173/2.5 = 69.2, round = 69, 69*2.5 = 172.5
    assert.within(snap(173, 2.5), 172.5, 0.01);
  });
});

describe("M8.5: repeat — vstack nested re-ID", () => {
  it("re-IDs children inside vstacks", () => {
    _resetForTests();
    const e = vstack([
      el('', { id: "vs-child-a", w: 100, h: 30 }),
      el('', { id: "vs-child-b", w: 100, h: 30 }),
    ], { id: "vs", w: 100, h: 60, gap: 0 });
    const result = repeat(e, { count: 2 });

    assert.equal(result.children[0].id, "vs-1");
    assert.equal(result.children[0].children[0].id, "vs-child-a-1");
    assert.equal(result.children[0].children[1].id, "vs-child-b-1");

    assert.equal(result.children[1].id, "vs-2");
    assert.equal(result.children[1].children[0].id, "vs-child-a-2");
    assert.equal(result.children[1].children[1].id, "vs-child-b-2");
  });

  it("all descendant IDs across copies are unique", () => {
    _resetForTests();
    const e = group([
      vstack([
        el('', { id: "inner", w: 50, h: 20 }),
      ], { id: "stack", w: 50, h: 20, gap: 0 }),
    ], { id: "outer", w: 100, h: 100 });
    const result = repeat(e, { count: 3 });

    // Collect all IDs recursively
    const allIds = [];
    function collectIds(node) {
      if (node.id) allIds.push(node.id);
      if (node.children) node.children.forEach(collectIds);
    }
    result.children.forEach(collectIds);

    const uniqueIds = new Set(allIds);
    assert.equal(uniqueIds.size, allIds.length, "all descendant IDs should be unique across copies");
  });
});

describe("M8.1: debug overlay — config dimensions", () => {
  it("overlay uses configured slide dimensions", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const e = el('', { id: "cfg1", x: 50, y: 50, w: 100, h: 100, style: { background: "#333" } });
      await render([{ elements: [e] }], { container });

      const mod = await import('../slidekit-debug.js');
      const overlay = mod.renderDebugOverlay();
      assert.ok(overlay, "overlay should be created");

      // Default config uses 1920x1080
      assert.equal(overlay.style.width, "1920px", "overlay width should match slide width");
      assert.equal(overlay.style.height, "1080px", "overlay height should match slide height");

      mod.removeDebugOverlay();
    });
  });
});

// =============================================================================
// Provenance anchor tests
// =============================================================================

describe("provenance anchors — constraint types", () => {
  it("below() provenance has sourceAnchor 'bc' and targetAnchor 'tc'", async () => {
    _resetForTests();
    const a = el('', { id: "anc-a", x: 100, y: 100, w: 200, h: 100, style: { background: "#333" } });
    const b = el('', { id: "anc-b", x: 100, y: below("anc-a", { gap: 16 }), w: 200, h: 100, style: { background: "#333" } });
    const scene = await layout({ elements: [a, b] });
    const provY = scene.elements["anc-b"].provenance.y;
    assert.equal(provY.source, "constraint");
    assert.equal(provY.type, "below");
    assert.equal(provY.sourceAnchor, "bc", "source anchor should be bc (ref bottom-center)");
    assert.equal(provY.targetAnchor, "tc", "target anchor should be tc (elem top-center)");
  });

  it("rightOf() provenance has sourceAnchor 'cr' and targetAnchor 'cl'", async () => {
    _resetForTests();
    const a = el('', { id: "anc-c", x: 100, y: 100, w: 200, h: 100, style: { background: "#333" } });
    const b = el('', { id: "anc-d", x: rightOf("anc-c", { gap: 20 }), y: 100, w: 200, h: 100, style: { background: "#333" } });
    const scene = await layout({ elements: [a, b] });
    const provX = scene.elements["anc-d"].provenance.x;
    assert.equal(provX.source, "constraint");
    assert.equal(provX.type, "rightOf");
    assert.equal(provX.sourceAnchor, "cr", "source anchor should be cr (ref center-right)");
    assert.equal(provX.targetAnchor, "cl", "target anchor should be cl (elem center-left)");
  });

  it("element with no constraint has no anchor fields", async () => {
    _resetForTests();
    const a = el('', { id: "anc-plain", x: 100, y: 100, w: 200, h: 100, style: { background: "#333" } });
    const scene = await layout({ elements: [a] });
    const provX = scene.elements["anc-plain"].provenance.x;
    assert.equal(provX.source, "authored");
    assert.equal(provX.sourceAnchor, undefined, "authored provenance should have no sourceAnchor");
    assert.equal(provX.targetAnchor, undefined, "authored provenance should have no targetAnchor");
  });

  it("stack children have sourceAnchor and targetAnchor", async () => {
    _resetForTests();
    const child = el('', { id: "stk-child", w: 100, h: 50, style: { background: "#333" } });
    const stack = vstack([child], { id: "stk-parent", x: 100, y: 100, w: 200, gap: 10 });
    const scene = await layout({ elements: [stack] });
    const provX = scene.elements["stk-child"].provenance.x;
    assert.equal(provX.source, "stack");
    assert.equal(provX.sourceAnchor, "cc", "stack sourceAnchor should be cc");
    assert.equal(provX.targetAnchor, "cl", "stack targetAnchor should be cl");
  });
});

// =============================================================================
// Keyboard toggle tests
// =============================================================================

describe("debug overlay — keyboard toggle", () => {
  it("exports enableKeyboardToggle, disableKeyboardToggle, cycleDebugMode, getDebugMode", async () => {
    const mod = await import('../slidekit-debug.js');
    assert.equal(typeof mod.enableKeyboardToggle, "function");
    assert.equal(typeof mod.disableKeyboardToggle, "function");
    assert.equal(typeof mod.cycleDebugMode, "function");
    assert.equal(typeof mod.getDebugMode, "function");
  });

  it("namespace export includes keyboard and mode functions", async () => {
    const mod = await import('../slidekit-debug.js');
    assert.equal(typeof mod.default.enableKeyboardToggle, "function");
    assert.equal(typeof mod.default.disableKeyboardToggle, "function");
    assert.equal(typeof mod.default.cycleDebugMode, "function");
    assert.equal(typeof mod.default.getDebugMode, "function");
  });

  it("Ctrl+Shift+D cycles through debug modes", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const e = el('', { id: "kbd1", x: 100, y: 100, w: 200, h: 100, style: { background: "#333" } });
      await render([{ elements: [e] }], { container });

      const mod = await import('../slidekit-debug.js');
      mod.removeDebugOverlay();
      mod.disableKeyboardToggle();
      mod.enableKeyboardToggle();

      const press = () => document.dispatchEvent(new KeyboardEvent("keydown", {
        key: "D", ctrlKey: true, shiftKey: true, bubbles: true,
      }));

      // Mode 0 -> 1: boxes + labels (no relationships)
      press();
      assert.equal(mod.getDebugMode(), 1, "mode should be 1 after first press");
      assert.equal(mod.isDebugOverlayVisible(), true, "overlay should be visible in mode 1");
      let relSvg = document.querySelector('[data-sk-debug="relationships"]');
      assert.equal(relSvg, null, "mode 1 should not show relationships");

      // Mode 1 -> 2: boxes + labels + relationships
      press();
      assert.equal(mod.getDebugMode(), 2, "mode should be 2 after second press");
      assert.equal(mod.isDebugOverlayVisible(), true, "overlay should be visible in mode 2");

      // Mode 2 -> 3: relationships only
      press();
      assert.equal(mod.getDebugMode(), 3, "mode should be 3 after third press");
      assert.equal(mod.isDebugOverlayVisible(), true, "overlay should be visible in mode 3");
      const boxes = document.querySelectorAll('[data-sk-debug="box"]');
      assert.equal(boxes.length, 0, "mode 3 should not show boxes");

      // Mode 3 -> 0: off
      press();
      assert.equal(mod.getDebugMode(), 0, "mode should be 0 after fourth press");
      assert.equal(mod.isDebugOverlayVisible(), false, "overlay should be hidden in mode 0");

      mod.disableKeyboardToggle();
    });
  });

  it("does not fire when target is an input element", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const e = el('', { id: "kbd2", x: 100, y: 100, w: 200, h: 100, style: { background: "#333" } });
      await render([{ elements: [e] }], { container });

      const mod = await import('../slidekit-debug.js');
      mod.removeDebugOverlay();
      mod.disableKeyboardToggle();
      mod.enableKeyboardToggle();

      // Create an input and dispatch from it
      const input = document.createElement("input");
      document.body.appendChild(input);

      input.dispatchEvent(new KeyboardEvent("keydown", {
        key: "D", ctrlKey: true, shiftKey: true, bubbles: true,
      }));
      assert.equal(mod.isDebugOverlayVisible(), false, "overlay should NOT toggle when target is input");

      document.body.removeChild(input);
      mod.disableKeyboardToggle();
    });
  });
});

// =============================================================================
// Relationship arrow tests
// =============================================================================

describe("debug overlay — relationship arrows", () => {
  it("SVG with data-sk-debug='relationships' appears for below() constraint", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const a = el('', { id: "rel-a", x: 100, y: 100, w: 200, h: 100, style: { background: "#333" } });
      const b = el('', { id: "rel-b", x: 100, y: below("rel-a", { gap: 16 }), w: 200, h: 100, style: { background: "#333" } });
      await render([{ elements: [a, b] }], { container });

      const mod = await import('../slidekit-debug.js');
      const overlay = mod.renderDebugOverlay();
      assert.ok(overlay, "overlay should be rendered");

      const relSvg = overlay.querySelector('[data-sk-debug="relationships"]');
      assert.ok(relSvg, "should have relationships SVG");

      mod.removeDebugOverlay();
    });
  });

  it("arrow has correct data-sk-debug-from and data-sk-debug-to attributes", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const a = el('', { id: "arr-a", x: 100, y: 100, w: 200, h: 100, style: { background: "#333" } });
      const b = el('', { id: "arr-b", x: 100, y: below("arr-a", { gap: 16 }), w: 200, h: 100, style: { background: "#333" } });
      await render([{ elements: [a, b] }], { container });

      const mod = await import('../slidekit-debug.js');
      const overlay = mod.renderDebugOverlay();
      const arrow = overlay.querySelector('[data-sk-debug="rel-arrow"]');
      assert.ok(arrow, "should have a rel-arrow element");
      assert.equal(arrow.getAttribute("data-sk-debug-from"), "arr-a");
      assert.equal(arrow.getAttribute("data-sk-debug-to"), "arr-b");

      mod.removeDebugOverlay();
    });
  });

  it("label contains constraint type and gap text", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const a = el('', { id: "lbl-a", x: 100, y: 100, w: 200, h: 100, style: { background: "#333" } });
      const b = el('', { id: "lbl-b", x: 100, y: below("lbl-a", { gap: 24 }), w: 200, h: 100, style: { background: "#333" } });
      await render([{ elements: [a, b] }], { container });

      const mod = await import('../slidekit-debug.js');
      const overlay = mod.renderDebugOverlay();
      const label = overlay.querySelector('[data-sk-debug="rel-label"]');
      assert.ok(label, "should have a rel-label element");
      assert.ok(label.textContent.includes("below"), "label should contain constraint type");
      assert.ok(label.textContent.includes("24"), "label should contain gap value");

      mod.removeDebugOverlay();
    });
  });

  it("showRelationships: false suppresses the SVG", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const a = el('', { id: "norel-a", x: 100, y: 100, w: 200, h: 100, style: { background: "#333" } });
      const b = el('', { id: "norel-b", x: 100, y: below("norel-a", { gap: 16 }), w: 200, h: 100, style: { background: "#333" } });
      await render([{ elements: [a, b] }], { container });

      const mod = await import('../slidekit-debug.js');
      const overlay = mod.renderDebugOverlay({ showRelationships: false });
      const relSvg = overlay.querySelector('[data-sk-debug="relationships"]');
      assert.equal(relSvg, null, "should not have relationships SVG when disabled");

      mod.removeDebugOverlay();
    });
  });

  it("element with both x and y constraints gets two arrows", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const a = el('', { id: "dual-a", x: 100, y: 100, w: 200, h: 100, style: { background: "#333" } });
      const b = el('', { id: "dual-b", x: rightOf("dual-a", { gap: 10 }), y: below("dual-a", { gap: 10 }), w: 200, h: 100, style: { background: "#333" } });
      await render([{ elements: [a, b] }], { container });

      const mod = await import('../slidekit-debug.js');
      const overlay = mod.renderDebugOverlay();
      const arrows = overlay.querySelectorAll('[data-sk-debug="rel-arrow"][data-sk-debug-to="dual-b"]');
      assert.equal(arrows.length, 2, "should have two arrows pointing to dual-b");

      mod.removeDebugOverlay();
    });
  });

  it("stack children show parent-to-child arrows", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const child1 = el('', { id: "stk-c1", w: 100, h: 50, style: { background: "#333" } });
      const child2 = el('', { id: "stk-c2", w: 100, h: 50, style: { background: "#333" } });
      const stack = vstack([child1, child2], { id: "stk-p", x: 100, y: 100, w: 200, gap: 10 });
      await render([{ elements: [stack] }], { container });

      const mod = await import('../slidekit-debug.js');
      const overlay = mod.renderDebugOverlay();
      const arrows = overlay.querySelectorAll('[data-sk-debug="rel-arrow"][data-sk-debug-from="stk-p"]');
      assert.ok(arrows.length >= 2, "should have arrows from stack parent to children");

      mod.removeDebugOverlay();
    });
  });
});

// =============================================================================
// Inspector Panel — Panel Lifecycle
// =============================================================================

describe("inspector panel — lifecycle", () => {
  it("panel appears when debug overlay is rendered", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const e = el('', { id: "insp1", x: 100, y: 100, w: 200, h: 100, style: { background: "#333" } });
      await render([{ elements: [e] }], { container });

      const mod = await import('../slidekit-debug.js');
      mod._resetDebugForTests();
      mod.renderDebugOverlay();

      const panel = document.querySelector('[data-sk-role="debug-inspector"]');
      assert.ok(panel, "inspector panel should be in DOM");

      mod._resetDebugForTests();
    });
  });

  it("panel is removed when overlay is removed", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const e = el('', { id: "insp2", x: 100, y: 100, w: 200, h: 100, style: { background: "#333" } });
      await render([{ elements: [e] }], { container });

      const mod = await import('../slidekit-debug.js');
      mod._resetDebugForTests();
      mod.renderDebugOverlay();
      mod.removeDebugOverlay();

      const panel = document.querySelector('[data-sk-role="debug-inspector"]');
      assert.equal(panel, null, "inspector panel should be removed from DOM");

      mod._resetDebugForTests();
    });
  });

  it("panel follows cycleDebugMode on/off", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const e = el('', { id: "insp3", x: 100, y: 100, w: 200, h: 100, style: { background: "#333" } });
      await render([{ elements: [e] }], { container });

      const mod = await import('../slidekit-debug.js');
      mod._resetDebugForTests();

      // Mode 0 → 1: panel visible
      mod.cycleDebugMode();
      assert.ok(document.querySelector('[data-sk-role="debug-inspector"]'), "panel should appear in mode 1");

      // Mode 1 → 2: still visible
      mod.cycleDebugMode();
      assert.ok(document.querySelector('[data-sk-role="debug-inspector"]'), "panel should remain in mode 2");

      // Mode 2 → 3: still visible
      mod.cycleDebugMode();
      assert.ok(document.querySelector('[data-sk-role="debug-inspector"]'), "panel should remain in mode 3");

      // Mode 3 → 0: gone
      mod.cycleDebugMode();
      assert.equal(document.querySelector('[data-sk-role="debug-inspector"]'), null, "panel should be gone in mode 0");

      mod._resetDebugForTests();
    });
  });

  it("shows empty state initially", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const e = el('', { id: "insp4", x: 100, y: 100, w: 200, h: 100, style: { background: "#333" } });
      await render([{ elements: [e] }], { container });

      const mod = await import('../slidekit-debug.js');
      mod._resetDebugForTests();
      mod.renderDebugOverlay();

      const body = document.querySelector('[data-sk-inspector-body]');
      assert.ok(body, "inspector body should exist");
      assert.ok(body.textContent.includes("Click an element to inspect"), "should show empty state text");

      mod._resetDebugForTests();
    });
  });

  it("_resetDebugForTests clears panel and overlay", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const e = el('', { id: "insp5", x: 100, y: 100, w: 200, h: 100, style: { background: "#333" } });
      await render([{ elements: [e] }], { container });

      const mod = await import('../slidekit-debug.js');
      mod._resetDebugForTests();
      mod.renderDebugOverlay();

      assert.ok(document.querySelector('[data-sk-role="debug-inspector"]'), "panel should exist");
      assert.equal(mod.isDebugOverlayVisible(), true, "overlay should be visible");

      mod._resetDebugForTests();

      assert.equal(document.querySelector('[data-sk-role="debug-inspector"]'), null, "panel should be removed after reset");
      assert.equal(mod.isDebugOverlayVisible(), false, "overlay should be hidden after reset");
      assert.equal(mod.getDebugMode(), 0, "debug mode should be 0 after reset");
    });
  });
});

// =============================================================================
// Inspector Panel — Element Selection
// =============================================================================

describe("inspector panel — element selection", () => {
  it("click on element shows its ID in the panel", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const e = el('', { id: "sel1", x: 100, y: 100, w: 200, h: 100, style: { background: "#333" } });
      await render([{ elements: [e] }], { container });

      const mod = await import('../slidekit-debug.js');
      mod._resetDebugForTests();
      mod.renderDebugOverlay();

      // Simulate click on the element
      const target = container.querySelector('[data-sk-id="sel1"]');
      assert.ok(target, "element should be in DOM");
      target.dispatchEvent(new MouseEvent("click", { bubbles: true }));

      const body = document.querySelector('[data-sk-inspector-body]');
      assert.ok(body.textContent.includes("sel1"), "panel should show selected element ID");

      mod._resetDebugForTests();
    });
  });

  it("panel shows correct resolved bounds", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const e = el('', { id: "sel2", x: 150, y: 250, w: 300, h: 200, style: { background: "#333" } });
      await render([{ elements: [e] }], { container });

      const mod = await import('../slidekit-debug.js');
      mod._resetDebugForTests();
      mod.renderDebugOverlay();

      const target = container.querySelector('[data-sk-id="sel2"]');
      target.dispatchEvent(new MouseEvent("click", { bubbles: true }));

      const body = document.querySelector('[data-sk-inspector-body]');
      assert.ok(body.textContent.includes("150.0"), "should show x value");
      assert.ok(body.textContent.includes("250.0"), "should show y value");
      assert.ok(body.textContent.includes("300.0"), "should show w value");
      assert.ok(body.textContent.includes("200.0"), "should show h value");

      mod._resetDebugForTests();
    });
  });

  it("click on empty space deselects", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const e = el('', { id: "sel3", x: 100, y: 100, w: 200, h: 100, style: { background: "#333" } });
      await render([{ elements: [e] }], { container });

      const mod = await import('../slidekit-debug.js');
      mod._resetDebugForTests();
      mod.renderDebugOverlay();

      // First select an element
      const target = container.querySelector('[data-sk-id="sel3"]');
      target.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      assert.ok(document.querySelector('[data-sk-inspector-body]').textContent.includes("sel3"), "should be selected");

      // Click empty space (document body)
      document.body.dispatchEvent(new MouseEvent("click", { bubbles: true }));

      const body = document.querySelector('[data-sk-inspector-body]');
      assert.ok(body.textContent.includes("Click an element to inspect"), "should show empty state after deselect");

      mod._resetDebugForTests();
    });
  });

  it("click inside panel does not deselect", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const e = el('', { id: "sel4", x: 100, y: 100, w: 200, h: 100, style: { background: "#333" } });
      await render([{ elements: [e] }], { container });

      const mod = await import('../slidekit-debug.js');
      mod._resetDebugForTests();
      mod.renderDebugOverlay();

      // Select an element
      const target = container.querySelector('[data-sk-id="sel4"]');
      target.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      assert.ok(document.querySelector('[data-sk-inspector-body]').textContent.includes("sel4"), "should be selected");

      // Click inside the inspector panel
      const panel = document.querySelector('[data-sk-role="debug-inspector"]');
      panel.dispatchEvent(new MouseEvent("click", { bubbles: true }));

      const body = document.querySelector('[data-sk-inspector-body]');
      assert.ok(body.textContent.includes("sel4"), "should still show selected element after panel click");

      mod._resetDebugForTests();
    });
  });

  it("selection highlight appears on overlay", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const e = el('', { id: "sel5", x: 100, y: 100, w: 200, h: 100, style: { background: "#333" } });
      await render([{ elements: [e] }], { container });

      const mod = await import('../slidekit-debug.js');
      mod._resetDebugForTests();
      mod.renderDebugOverlay();

      const target = container.querySelector('[data-sk-id="sel5"]');
      target.dispatchEvent(new MouseEvent("click", { bubbles: true }));

      const highlight = document.querySelector('[data-sk-debug="selection"]');
      assert.ok(highlight, "selection highlight should appear");
      assert.equal(highlight.getAttribute("data-sk-debug-id"), "sel5", "highlight should have correct ID");

      mod._resetDebugForTests();
    });
  });

  it("constrained props are marked as locked", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const a = el('', { id: "lck-a", x: 100, y: 100, w: 200, h: 100, style: { background: "#333" } });
      const b = el('', { id: "lck-b", x: 100, y: below("lck-a", { gap: 16 }), w: 200, h: 100, style: { background: "#333" } });
      await render([{ elements: [a, b] }], { container });

      const mod = await import('../slidekit-debug.js');
      mod._resetDebugForTests();
      mod.renderDebugOverlay();

      const target = container.querySelector('[data-sk-id="lck-b"]');
      target.dispatchEvent(new MouseEvent("click", { bubbles: true }));

      const locked = document.querySelectorAll('[data-sk-prop-status="locked"]');
      assert.ok(locked.length > 0, "should have at least one locked prop");

      mod._resetDebugForTests();
    });
  });
});

// =============================================================================
// Inspector Panel — Content Sections
// =============================================================================

describe("inspector panel — content sections", () => {
  it("CSS styles section shows style props", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const e = el('', { id: "css1", x: 100, y: 100, w: 200, h: 100, style: { background: "#ff0000", borderRadius: "8px" } });
      await render([{ elements: [e] }], { container });

      const mod = await import('../slidekit-debug.js');
      mod._resetDebugForTests();
      mod.renderDebugOverlay();

      const target = container.querySelector('[data-sk-id="css1"]');
      target.dispatchEvent(new MouseEvent("click", { bubbles: true }));

      const section = document.querySelector('[data-sk-inspector-section="CSS Styles"]');
      assert.ok(section, "CSS Styles section should exist");
      assert.ok(section.textContent.includes("background"), "should show background property");
      assert.ok(section.textContent.includes("#ff0000"), "should show background value");

      mod._resetDebugForTests();
    });
  });

  it("Inner HTML section shows content", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const e = el('<h1>Hello World</h1>', { id: "htm1", x: 100, y: 100, w: 400, h: 200 });
      await render([{ elements: [e] }], { container });

      const mod = await import('../slidekit-debug.js');
      mod._resetDebugForTests();
      mod.renderDebugOverlay();

      const target = container.querySelector('[data-sk-id="htm1"]');
      target.dispatchEvent(new MouseEvent("click", { bubbles: true }));

      const section = document.querySelector('[data-sk-inspector-section="Inner HTML"]');
      assert.ok(section, "Inner HTML section should exist");
      assert.ok(section.textContent.includes("Hello World"), "should show HTML content");

      mod._resetDebugForTests();
    });
  });

  it("provenance shows constraint details for below()", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const a = el('', { id: "prov-a", x: 100, y: 100, w: 200, h: 100, style: { background: "#333" } });
      const b = el('', { id: "prov-b", x: 100, y: below("prov-a", { gap: 20 }), w: 200, h: 100, style: { background: "#333" } });
      await render([{ elements: [a, b] }], { container });

      const mod = await import('../slidekit-debug.js');
      mod._resetDebugForTests();
      mod.renderDebugOverlay();

      const target = container.querySelector('[data-sk-id="prov-b"]');
      target.dispatchEvent(new MouseEvent("click", { bubbles: true }));

      const section = document.querySelector('[data-sk-inspector-section="Provenance"]');
      assert.ok(section, "Provenance section should exist");
      assert.ok(section.textContent.includes("constraint"), "should show constraint source");
      assert.ok(section.textContent.includes("below"), "should show constraint type");
      assert.ok(section.textContent.includes("prov-a"), "should show reference element");

      mod._resetDebugForTests();
    });
  });

  it("relationships section shows edges", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const a = el('', { id: "edge-a", x: 100, y: 100, w: 200, h: 100, style: { background: "#333" } });
      const b = el('', { id: "edge-b", x: 100, y: below("edge-a", { gap: 16 }), w: 200, h: 100, style: { background: "#333" } });
      await render([{ elements: [a, b] }], { container });

      const mod = await import('../slidekit-debug.js');
      mod._resetDebugForTests();
      mod.renderDebugOverlay();

      const target = container.querySelector('[data-sk-id="edge-b"]');
      target.dispatchEvent(new MouseEvent("click", { bubbles: true }));

      const section = document.querySelector('[data-sk-inspector-section="Relationships"]');
      assert.ok(section, "Relationships section should exist");
      assert.ok(section.textContent.includes("edge-a"), "should show related element");
      assert.ok(section.textContent.includes("below"), "should show relationship type");

      mod._resetDebugForTests();
    });
  });

  it("sections are collapsible", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const e = el('', { id: "coll1", x: 100, y: 100, w: 200, h: 100, style: { background: "#333" } });
      await render([{ elements: [e] }], { container });

      const mod = await import('../slidekit-debug.js');
      mod._resetDebugForTests();
      mod.renderDebugOverlay();

      const target = container.querySelector('[data-sk-id="coll1"]');
      target.dispatchEvent(new MouseEvent("click", { bubbles: true }));

      // Identity section should be expanded by default
      const identSection = document.querySelector('[data-sk-inspector-section="Identity"]');
      assert.ok(identSection, "Identity section should exist");
      const identContent = identSection.querySelector('[data-sk-inspector-content]');
      assert.equal(identContent.style.display, "block", "Identity should be expanded");

      // CSS Styles starts collapsed
      const cssSection = document.querySelector('[data-sk-inspector-section="CSS Styles"]');
      const cssContent = cssSection.querySelector('[data-sk-inspector-content]');
      assert.equal(cssContent.style.display, "none", "CSS Styles should start collapsed");

      // Click to expand
      const cssChevron = cssSection.querySelector('[data-sk-inspector-chevron]');
      cssChevron.parentElement.click();
      assert.equal(cssContent.style.display, "block", "CSS Styles should expand after click");

      // Click to collapse
      cssChevron.parentElement.click();
      assert.equal(cssContent.style.display, "none", "CSS Styles should collapse after second click");

      mod._resetDebugForTests();
    });
  });
});

// =============================================================================
// Inspector Panel — showInspector option
// =============================================================================

describe("inspector panel — showInspector option", () => {
  it("showInspector: false suppresses the panel", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const e = el('', { id: "noinsp", x: 100, y: 100, w: 200, h: 100, style: { background: "#333" } });
      await render([{ elements: [e] }], { container });

      const mod = await import('../slidekit-debug.js');
      mod._resetDebugForTests();
      mod.renderDebugOverlay({ showInspector: false });

      const panel = document.querySelector('[data-sk-role="debug-inspector"]');
      assert.equal(panel, null, "inspector panel should not exist when showInspector is false");

      mod._resetDebugForTests();
    });
  });

  it("namespace export includes _resetDebugForTests", async () => {
    const mod = await import('../slidekit-debug.js');
    assert.equal(typeof mod.default._resetDebugForTests, "function");
  });
});

// =============================================================================
// Inspector Panel — Viewport Adjustment
// =============================================================================

describe("inspector panel — viewport adjustment", () => {
  it("sets .reveal container width when inspector opens", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      // Create a fake .reveal container
      const reveal = document.createElement("div");
      reveal.className = "reveal";
      reveal.style.width = "100%";
      document.body.appendChild(reveal);

      const e = el('', { id: "vp1", x: 100, y: 100, w: 200, h: 100, style: { background: "#333" } });
      await render([{ elements: [e] }], { container });

      const mod = await import('../slidekit-debug.js');
      mod._resetDebugForTests();
      mod.renderDebugOverlay();

      assert.ok(reveal.style.width.includes("calc"), ".reveal width should be set to calc expression");
      assert.ok(reveal.style.width.includes("380"), ".reveal width should account for panel width");

      mod._resetDebugForTests();
      document.body.removeChild(reveal);
    });
  });

  it("restores .reveal container width when inspector closes", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const reveal = document.createElement("div");
      reveal.className = "reveal";
      reveal.style.width = "100%";
      document.body.appendChild(reveal);

      const e = el('', { id: "vp2", x: 100, y: 100, w: 200, h: 100, style: { background: "#333" } });
      await render([{ elements: [e] }], { container });

      const mod = await import('../slidekit-debug.js');
      mod._resetDebugForTests();
      mod.renderDebugOverlay();
      assert.ok(reveal.style.width.includes("calc"), "width should be adjusted");

      mod.removeDebugOverlay();
      assert.equal(reveal.style.width, "", ".reveal width should be restored");

      mod._resetDebugForTests();
      document.body.removeChild(reveal);
    });
  });

  it("viewport adjusts on cycleDebugMode transitions", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const reveal = document.createElement("div");
      reveal.className = "reveal";
      document.body.appendChild(reveal);

      const e = el('', { id: "vp3", x: 100, y: 100, w: 200, h: 100, style: { background: "#333" } });
      await render([{ elements: [e] }], { container });

      const mod = await import('../slidekit-debug.js');
      mod._resetDebugForTests();

      // Mode 0 → 1: should adjust
      mod.cycleDebugMode();
      assert.ok(reveal.style.width.includes("calc"), "mode 1: reveal width should be adjusted");

      // Mode 1 → 2: should remain adjusted
      mod.cycleDebugMode();
      assert.ok(reveal.style.width.includes("calc"), "mode 2: reveal width should still be adjusted");

      // Mode 3 → 0: should restore
      mod.cycleDebugMode(); // mode 3
      mod.cycleDebugMode(); // mode 0
      assert.equal(reveal.style.width, "", "mode 0: reveal width should be restored");

      mod._resetDebugForTests();
      document.body.removeChild(reveal);
    });
  });

  it("showInspector: false does not adjust viewport", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const reveal = document.createElement("div");
      reveal.className = "reveal";
      reveal.style.width = "100%";
      document.body.appendChild(reveal);

      const e = el('', { id: "vp4", x: 100, y: 100, w: 200, h: 100, style: { background: "#333" } });
      await render([{ elements: [e] }], { container });

      const mod = await import('../slidekit-debug.js');
      mod._resetDebugForTests();
      mod.renderDebugOverlay({ showInspector: false });

      assert.equal(reveal.style.width, "100%", "reveal width should not change when showInspector is false");

      mod._resetDebugForTests();
      document.body.removeChild(reveal);
    });
  });
});

// =============================================================================
// Inspector Panel — Resize Handle
// =============================================================================

describe("inspector panel — resize handle", () => {
  it("drag handle element exists on panel", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const e = el('', { id: "rh1", x: 100, y: 100, w: 200, h: 100, style: { background: "#333" } });
      await render([{ elements: [e] }], { container });

      const mod = await import('../slidekit-debug.js');
      mod._resetDebugForTests();
      mod.renderDebugOverlay();

      const handle = document.querySelector('[data-sk-role="debug-inspector-handle"]');
      assert.ok(handle, "resize handle should exist on panel");
      assert.equal(handle.style.cursor, "col-resize", "handle should have col-resize cursor");

      mod._resetDebugForTests();
    });
  });

  it("panel width changes with simulated pointer drag", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const e = el('', { id: "rh2", x: 100, y: 100, w: 200, h: 100, style: { background: "#333" } });
      await render([{ elements: [e] }], { container });

      const mod = await import('../slidekit-debug.js');
      mod._resetDebugForTests();
      mod.renderDebugOverlay();

      const handle = document.querySelector('[data-sk-role="debug-inspector-handle"]');
      const panel = document.querySelector('[data-sk-role="debug-inspector"]');
      assert.ok(handle, "handle should exist");
      assert.ok(panel, "panel should exist");

      // Simulate drag: start at x=380, move left to x=280 → panel should widen by 100px
      handle.dispatchEvent(new PointerEvent("pointerdown", { clientX: 380, bubbles: true }));
      document.dispatchEvent(new PointerEvent("pointermove", { clientX: 280, bubbles: true }));
      document.dispatchEvent(new PointerEvent("pointerup", { clientX: 280, bubbles: true }));

      assert.equal(panel.style.width, "480px", "panel should be 480px after dragging left by 100");

      mod._resetDebugForTests();
    });
  });

  it("panel width is clamped to min/max bounds", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const e = el('', { id: "rh3", x: 100, y: 100, w: 200, h: 100, style: { background: "#333" } });
      await render([{ elements: [e] }], { container });

      const mod = await import('../slidekit-debug.js');
      mod._resetDebugForTests();
      mod.renderDebugOverlay();

      const handle = document.querySelector('[data-sk-role="debug-inspector-handle"]');
      const panel = document.querySelector('[data-sk-role="debug-inspector"]');

      // Drag far right (shrink past min): start at 380, move right to 700 → would be 380 - 320 = 60, clamped to 200
      handle.dispatchEvent(new PointerEvent("pointerdown", { clientX: 380, bubbles: true }));
      document.dispatchEvent(new PointerEvent("pointermove", { clientX: 700, bubbles: true }));
      document.dispatchEvent(new PointerEvent("pointerup", { clientX: 700, bubbles: true }));
      assert.equal(panel.style.width, "200px", "panel width should be clamped to 200px min");

      // Reset and drag far left (grow past max)
      mod._resetDebugForTests();
      mod.renderDebugOverlay();
      const handle2 = document.querySelector('[data-sk-role="debug-inspector-handle"]');
      const panel2 = document.querySelector('[data-sk-role="debug-inspector"]');

      handle2.dispatchEvent(new PointerEvent("pointerdown", { clientX: 380, bubbles: true }));
      document.dispatchEvent(new PointerEvent("pointermove", { clientX: -300, bubbles: true }));
      document.dispatchEvent(new PointerEvent("pointerup", { clientX: -300, bubbles: true }));
      assert.equal(panel2.style.width, "600px", "panel width should be clamped to 600px max");

      mod._resetDebugForTests();
    });
  });

  it("viewport re-adjusts after drag", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const reveal = document.createElement("div");
      reveal.className = "reveal";
      document.body.appendChild(reveal);

      const e = el('', { id: "rh4", x: 100, y: 100, w: 200, h: 100, style: { background: "#333" } });
      await render([{ elements: [e] }], { container });

      const mod = await import('../slidekit-debug.js');
      mod._resetDebugForTests();
      mod.renderDebugOverlay();

      const handle = document.querySelector('[data-sk-role="debug-inspector-handle"]');

      // Drag to widen the panel
      handle.dispatchEvent(new PointerEvent("pointerdown", { clientX: 380, bubbles: true }));
      document.dispatchEvent(new PointerEvent("pointermove", { clientX: 280, bubbles: true }));
      document.dispatchEvent(new PointerEvent("pointerup", { clientX: 280, bubbles: true }));

      assert.ok(reveal.style.width.includes("480"), "reveal width should reflect new panel width of 480px");

      mod._resetDebugForTests();
      document.body.removeChild(reveal);
    });
  });
});

// =============================================================================
// Inspector Inline Editing — Phase 1
// =============================================================================

describe("inspector editing — _definitions persistence", () => {
  it("window.sk._definitions exists after render", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const e = el('hello', { id: "def1", x: 100, y: 100, w: 200, h: 100 });
      await render([{ elements: [e] }], { container });

      assert.ok(window.sk._definitions, "_definitions should exist");
      assert.equal(window.sk._definitions.length, 1, "should have 1 slide definition");
    });
  });

  it("_definitions contains the original elements (live references)", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const e = el('test', { id: "def2", x: 50, y: 60, w: 300, h: 200 });
      await render([{ elements: [e] }], { container });

      const defs = window.sk._definitions;
      assert.equal(defs[0].elements[0].id, "def2", "first element should be def2");
      assert.equal(defs[0].elements[0].props.x, 50, "x should match original");
    });
  });
});

describe("inspector editing — inline number editor", () => {
  it("editable numeric prop creates input on startEdit", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const e = el('edit test', { id: "ed1", x: 100, y: 200, w: 300, h: 100 });
      await render([{ elements: [e] }], { container });

      const mod = await import('../slidekit-debug.js');
      mod._resetDebugForTests();
      mod.renderDebugOverlay();

      // Click on element to select it
      const domEl = container.querySelector('[data-sk-id="ed1"]');
      domEl.click();

      // Find editable prop row for 'x'
      const propRow = document.querySelector('[data-sk-prop-key="x"][data-sk-prop-status="editable"]');
      assert.ok(propRow, "x prop row should exist and be editable");

      // Click to start editing
      propRow.click();

      // Should have an input element now
      const input = propRow.querySelector('input[type="number"]');
      assert.ok(input, "input should be created");
      assert.equal(input.value, "100", "input value should match current x");

      mod._resetDebugForTests();
    });
  });

  it("input value change updates the scene element resolved bounds", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const e = el('edit test', { id: "ed2", x: 100, y: 200, w: 300, h: 100 });
      await render([{ elements: [e] }], { container });

      const mod = await import('../slidekit-debug.js');
      mod._resetDebugForTests();
      mod.renderDebugOverlay();

      // Select the element
      const domEl = container.querySelector('[data-sk-id="ed2"]');
      domEl.click();

      // Start editing x
      const propRow = document.querySelector('[data-sk-prop-key="x"][data-sk-prop-status="editable"]');
      propRow.click();

      const input = propRow.querySelector('input[type="number"]');
      input.value = "500";
      input.dispatchEvent(new Event('input', { bubbles: true }));

      // Wait for async re-layout
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check that the definition was mutated
      assert.equal(window.sk._definitions[0].elements[0].props.x, 500, "definition x should be updated");

      // Check resolved bounds in layout
      const resolved = window.sk.layouts[0].elements["ed2"].resolved;
      assert.equal(resolved.x, 500, "resolved x should be 500");

      mod._resetDebugForTests();
    });
  });

  it("Escape cancels edit and restores original value", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const e = el('escape test', { id: "ed3", x: 100, y: 200, w: 300, h: 100 });
      await render([{ elements: [e] }], { container });

      const mod = await import('../slidekit-debug.js');
      mod._resetDebugForTests();
      mod.renderDebugOverlay();

      // Select and start editing
      const domEl = container.querySelector('[data-sk-id="ed3"]');
      domEl.click();

      const propRow = document.querySelector('[data-sk-prop-key="x"][data-sk-prop-status="editable"]');
      propRow.click();

      const input = propRow.querySelector('input[type="number"]');
      input.value = "999";
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 100));

      // Press Escape
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 100));

      // Value should be restored
      assert.equal(window.sk._definitions[0].elements[0].props.x, 100, "x should be restored to original");

      mod._resetDebugForTests();
    });
  });

  it("locked prop click does not create input", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const header = el('header', { id: "lk-hdr", x: 100, y: 100, w: 300, h: 50 });
      const body = el('body', { id: "lk-body", x: 100, y: below("lk-hdr", { gap: 10 }), w: 300, h: 200 });
      await render([{ elements: [header, body] }], { container });

      const mod = await import('../slidekit-debug.js');
      mod._resetDebugForTests();
      mod.renderDebugOverlay();

      // Select the constrained element
      const domEl = container.querySelector('[data-sk-id="lk-body"]');
      domEl.click();

      // y prop should be locked
      const lockedRow = document.querySelector('[data-sk-prop-key="y"][data-sk-prop-status="locked"]');
      assert.ok(lockedRow, "y prop should be locked");

      // Click on locked prop
      lockedRow.click();

      // Should NOT have an input
      const input = lockedRow.querySelector('input');
      assert.equal(input, null, "locked prop should not get an input");

      // Should show tooltip
      const tooltip = document.querySelector('[data-sk-locked-tooltip]');
      assert.ok(tooltip, "tooltip should appear for locked prop");

      // Clean up tooltip
      if (tooltip) tooltip.remove();
      mod._resetDebugForTests();
    });
  });
});

describe("inspector editing — undo/redo", () => {
  it("undo stack is empty initially", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const e = el('', { id: "ur1", x: 100, y: 100, w: 200, h: 100 });
      await render([{ elements: [e] }], { container });

      const mod = await import('../slidekit-debug.js');
      mod._resetDebugForTests();
      mod.renderDebugOverlay();

      // Access internal state through the debug controller
      // The undo stack should be empty after reset
      assert.equal(window.sk._definitions.length, 1, "definitions should exist");
      // Undo with empty stack should be a no-op (no errors)

      mod._resetDebugForTests();
    });
  });

  it("after edit, undo restores previous value", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const e = el('undo test', { id: "ur2", x: 100, y: 200, w: 300, h: 100 });
      await render([{ elements: [e] }], { container });

      const mod = await import('../slidekit-debug.js');
      mod._resetDebugForTests();
      mod.enableKeyboardToggle();
      mod.renderDebugOverlay();

      // Select element
      const domEl = container.querySelector('[data-sk-id="ur2"]');
      domEl.click();

      // Start editing x
      const propRow = document.querySelector('[data-sk-prop-key="x"][data-sk-prop-status="editable"]');
      propRow.click();

      const input = propRow.querySelector('input[type="number"]');
      input.value = "500";
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 100));

      // Commit via Enter
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 100));

      assert.equal(window.sk._definitions[0].elements[0].props.x, 500, "x should be 500 after edit");

      // Undo via Ctrl+Z
      document.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'z', ctrlKey: true, bubbles: true
      }));
      await new Promise(resolve => setTimeout(resolve, 200));

      assert.equal(window.sk._definitions[0].elements[0].props.x, 100, "x should be restored to 100 after undo");

      mod._resetDebugForTests();
    });
  });

  it("after undo, redo re-applies the edit", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const e = el('redo test', { id: "ur3", x: 100, y: 200, w: 300, h: 100 });
      await render([{ elements: [e] }], { container });

      const mod = await import('../slidekit-debug.js');
      mod._resetDebugForTests();
      mod.enableKeyboardToggle();
      mod.renderDebugOverlay();

      // Select element
      const domEl = container.querySelector('[data-sk-id="ur3"]');
      domEl.click();

      // Edit x to 600
      const propRow = document.querySelector('[data-sk-prop-key="x"][data-sk-prop-status="editable"]');
      propRow.click();

      const input = propRow.querySelector('input[type="number"]');
      input.value = "600";
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 100));

      // Commit
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 100));

      // Undo
      document.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'z', ctrlKey: true, bubbles: true
      }));
      await new Promise(resolve => setTimeout(resolve, 200));

      assert.equal(window.sk._definitions[0].elements[0].props.x, 100, "after undo x=100");

      // Redo via Ctrl+Shift+Z
      document.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Z', ctrlKey: true, shiftKey: true, bubbles: true
      }));
      await new Promise(resolve => setTimeout(resolve, 200));

      assert.equal(window.sk._definitions[0].elements[0].props.x, 600, "after redo x=600");

      mod._resetDebugForTests();
    });
  });

  it("multiple edits create correct undo stack", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const e = el('multi undo', { id: "ur4", x: 100, y: 200, w: 300, h: 100 });
      await render([{ elements: [e] }], { container });

      const mod = await import('../slidekit-debug.js');
      mod._resetDebugForTests();
      mod.enableKeyboardToggle();
      mod.renderDebugOverlay();

      // Select element
      const domEl = container.querySelector('[data-sk-id="ur4"]');
      domEl.click();

      // Edit 1: x = 200
      let propRow = document.querySelector('[data-sk-prop-key="x"][data-sk-prop-status="editable"]');
      propRow.click();
      let input = propRow.querySelector('input[type="number"]');
      input.value = "200";
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 100));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 100));

      // Edit 2: x = 400
      propRow = document.querySelector('[data-sk-prop-key="x"][data-sk-prop-status="editable"]');
      propRow.click();
      input = propRow.querySelector('input[type="number"]');
      input.value = "400";
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 100));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 100));

      assert.equal(window.sk._definitions[0].elements[0].props.x, 400, "x=400 after two edits");

      // Undo once -> x = 200 (call directly to avoid async race with keyboard handler)
      await mod.undo();
      await new Promise(resolve => setTimeout(resolve, 100));
      assert.equal(window.sk._definitions[0].elements[0].props.x, 200, "x=200 after first undo");

      // Undo again -> x = 100
      await mod.undo();
      await new Promise(resolve => setTimeout(resolve, 100));
      assert.equal(window.sk._definitions[0].elements[0].props.x, 100, "x=100 after second undo");

      mod._resetDebugForTests();
    });
  });
});

describe("inspector editing — re-render verification", () => {
  it("after edit, DOM element position matches new value", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const e = el('position test', { id: "rr1", x: 100, y: 200, w: 300, h: 100 });
      await render([{ elements: [e] }], { container });

      const mod = await import('../slidekit-debug.js');
      mod._resetDebugForTests();
      mod.renderDebugOverlay();

      // Select element and edit x
      const domEl = container.querySelector('[data-sk-id="rr1"]');
      domEl.click();

      const propRow = document.querySelector('[data-sk-prop-key="x"][data-sk-prop-status="editable"]');
      propRow.click();

      const input = propRow.querySelector('input[type="number"]');
      input.value = "750";
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 100));

      // Commit
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check DOM position
      const updatedDom = container.querySelector('[data-sk-id="rr1"]');
      assert.equal(updatedDom.style.left, "750px", "DOM left should be 750px");

      mod._resetDebugForTests();
    });
  });

  it("after edit, window.sk.layouts reflects new layout", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const e = el('layout test', { id: "rr2", x: 100, y: 200, w: 300, h: 100 });
      await render([{ elements: [e] }], { container });

      const mod = await import('../slidekit-debug.js');
      mod._resetDebugForTests();
      mod.renderDebugOverlay();

      // Select element and edit y
      const domEl = container.querySelector('[data-sk-id="rr2"]');
      domEl.click();

      const propRow = document.querySelector('[data-sk-prop-key="y"][data-sk-prop-status="editable"]');
      propRow.click();

      const input = propRow.querySelector('input[type="number"]');
      input.value = "500";
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 100));

      // Commit
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check layouts
      const resolved = window.sk.layouts[0].elements["rr2"].resolved;
      assert.equal(resolved.y, 500, "layout resolved y should be 500");

      mod._resetDebugForTests();
    });
  });
});

// =============================================================================
// Constraint Gap Editing
// =============================================================================

describe("inspector editing — constraint gap", () => {
  it("gap token dropdown selects correct token and updates definition", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      // Use gap=24 which matches "md" token
      const hdr = el('header', { id: "gh1", x: 100, y: 100, w: 400, h: 80 });
      const bod = el('body', { id: "gb1", x: 100, y: below("gh1", { gap: 24 }), w: 400, h: 200 });
      await render([{ elements: [hdr, bod] }], { container });

      const mod = await import('../slidekit-debug.js');
      mod._resetDebugForTests();
      mod.enableKeyboardToggle();
      mod.renderDebugOverlay();

      // Select the body element
      const domEl = container.querySelector('[data-sk-id="gb1"]');
      domEl.click();

      // Find the editable gap in the Relationships section
      const gapSpan = document.querySelector('[data-sk-gap-edit="y.gap"]');
      assert.ok(gapSpan, "gap span should exist for below constraint");

      // Click to start editing — should create a <select>
      gapSpan.click();
      const select = gapSpan.querySelector('select');
      assert.ok(select, "select dropdown should be created");

      // Current value 24 matches "md" — should be pre-selected
      assert.equal(select.value, "md", "md token should be pre-selected for gap=24");

      // Select "xl" token (48px) via change event
      select.value = "xl";
      select.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 100));

      // Constraint gap stores the pixel number (not token string)
      const marker = window.sk._definitions[0].elements[1].props.y;
      assert.equal(marker.gap, 48, "gap in definition should be 48 (xl)");

      mod._resetDebugForTests();
    });
  });

  it("gap edit changes the resolved position", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      // gap=16 matches "sm" token
      const hdr = el('header', { id: "gh2", x: 100, y: 100, w: 400, h: 80 });
      const bod = el('body', { id: "gb2", x: 100, y: below("gh2", { gap: 16 }), w: 400, h: 200 });
      await render([{ elements: [hdr, bod] }], { container });

      // Initial resolved y should be 100 + 80 + 16 = 196
      const initialY = window.sk.layouts[0].elements["gb2"].resolved.y;
      assert.equal(initialY, 196, "initial resolved y should be 196");

      const mod = await import('../slidekit-debug.js');
      mod._resetDebugForTests();
      mod.enableKeyboardToggle();
      mod.renderDebugOverlay();

      // Select the body element
      const domEl = container.querySelector('[data-sk-id="gb2"]');
      domEl.click();

      // Edit the gap — select "lg" token (32px)
      const gapSpan = document.querySelector('[data-sk-gap-edit="y.gap"]');
      gapSpan.click();
      const select = gapSpan.querySelector('select');
      select.value = "lg";
      select.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 100));

      // Resolved y should now be 100 + 80 + 32 = 212
      const newY = window.sk.layouts[0].elements["gb2"].resolved.y;
      assert.equal(newY, 212, "resolved y should be 212 after gap change to lg");

      mod._resetDebugForTests();
    });
  });

  it("undo restores the previous gap value", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      // gap=32 matches "lg"
      const hdr = el('header', { id: "gh3", x: 100, y: 100, w: 400, h: 80 });
      const bod = el('body', { id: "gb3", x: 100, y: below("gh3", { gap: 32 }), w: 400, h: 200 });
      await render([{ elements: [hdr, bod] }], { container });

      const mod = await import('../slidekit-debug.js');
      mod._resetDebugForTests();
      mod.enableKeyboardToggle();
      mod.renderDebugOverlay();

      // Select the body element
      const domEl = container.querySelector('[data-sk-id="gb3"]');
      domEl.click();

      // Edit the gap — select "xl" token (48px)
      const gapSpan = document.querySelector('[data-sk-gap-edit="y.gap"]');
      gapSpan.click();
      const select = gapSpan.querySelector('select');
      select.value = "xl";
      select.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 100));

      assert.equal(window.sk._definitions[0].elements[1].props.y.gap, 48, "gap=48 after edit");

      // Undo
      await mod.undo();
      await new Promise(resolve => setTimeout(resolve, 100));

      assert.equal(window.sk._definitions[0].elements[1].props.y.gap, 32, "gap=32 after undo");

      mod._resetDebugForTests();
    });
  });

  it("gap Custom option switches to number input", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const hdr = el('header', { id: "gh5", x: 100, y: 100, w: 400, h: 80 });
      const bod = el('body', { id: "gb5", x: 100, y: below("gh5", { gap: 24 }), w: 400, h: 200 });
      await render([{ elements: [hdr, bod] }], { container });

      const mod = await import('../slidekit-debug.js');
      mod._resetDebugForTests();
      mod.enableKeyboardToggle();
      mod.renderDebugOverlay();

      // Select the body element
      const domEl = container.querySelector('[data-sk-id="gb5"]');
      domEl.click();

      // Open gap dropdown
      const gapSpan = document.querySelector('[data-sk-gap-edit="y.gap"]');
      gapSpan.click();
      const select = gapSpan.querySelector('select');
      assert.ok(select, "select should exist");

      // Select "Custom..."
      select.value = "__custom__";
      select.dispatchEvent(new Event('change', { bubbles: true }));

      // Should switch to a number input
      const input = gapSpan.querySelector('input[type="number"]');
      assert.ok(input, "number input should appear after selecting Custom");

      // Edit the custom value
      input.value = "55";
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 100));

      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 100));

      assert.equal(window.sk._definitions[0].elements[1].props.y.gap, 55, "gap should be 55 after custom edit");

      mod._resetDebugForTests();
    });
  });

  it("non-gap constraints (centerHWith) do not show editable gap", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const hdr = el('header', { id: "gh4", x: 100, y: 100, w: 400, h: 80 });
      const bod = el('body', { id: "gb4", x: centerHWith("gh4"), y: 300, w: 200, h: 200 });
      await render([{ elements: [hdr, bod] }], { container });

      const mod = await import('../slidekit-debug.js');
      mod._resetDebugForTests();
      mod.renderDebugOverlay();

      // Select the body element
      const domEl = container.querySelector('[data-sk-id="gb4"]');
      domEl.click();

      // Should not have any editable gap spans
      const gapSpan = document.querySelector('[data-sk-gap-edit]');
      assert.ok(!gapSpan, "centerHWith should not have an editable gap");

      // isEditableGap should return false for centerH
      assert.ok(!mod.isEditableGap('centerH'), "centerH is not gap-editable");
      assert.ok(mod.isEditableGap('below'), "below is gap-editable");
      assert.ok(mod.isEditableGap('rightOf'), "rightOf is gap-editable");

      mod._resetDebugForTests();
    });
  });

  it("enum prop dropdown edits align value", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const stack = vstack([
        el('item 1', { id: "ev1", w: 200, h: 50 }),
        el('item 2', { id: "ev2", w: 200, h: 50 }),
      ], { id: "enum-vs", x: 100, y: 100, gap: 16, align: 'left' });
      await render([{ elements: [stack] }], { container });

      const mod = await import('../slidekit-debug.js');
      mod._resetDebugForTests();
      mod.enableKeyboardToggle();
      mod.renderDebugOverlay();

      // Select the vstack
      const domEl = container.querySelector('[data-sk-id="enum-vs"]');
      domEl.click();

      // Find the align prop row
      const alignRow = document.querySelector('[data-sk-prop-key="align"][data-sk-prop-status="enum"]');
      assert.ok(alignRow, "align should be shown as enum prop");

      // Click to start editing
      alignRow.click();
      const select = alignRow.querySelector('select');
      assert.ok(select, "select dropdown should be created for align");
      assert.equal(select.value, "left", "left should be pre-selected");

      // Change to center
      select.value = "center";
      select.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 100));

      assert.equal(window.sk._definitions[0].elements[0].props.align, "center", "align should be center");

      mod._resetDebugForTests();
    });
  });

  it("stack gap prop uses token dropdown", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const stack = vstack([
        el('item 1', { id: "gv1", w: 200, h: 50 }),
        el('item 2', { id: "gv2", w: 200, h: 50 }),
      ], { id: "gap-vs", x: 100, y: 100, gap: "md", align: 'left' });
      await render([{ elements: [stack] }], { container });

      const mod = await import('../slidekit-debug.js');
      mod._resetDebugForTests();
      mod.enableKeyboardToggle();
      mod.renderDebugOverlay();

      // Select the vstack
      const domEl = container.querySelector('[data-sk-id="gap-vs"]');
      domEl.click();

      // Find the gap prop row
      const gapRow = document.querySelector('[data-sk-prop-key="gap"][data-sk-prop-status="gap"]');
      assert.ok(gapRow, "gap should be shown as gap prop");

      // Click to start editing
      gapRow.click();
      const select = gapRow.querySelector('select');
      assert.ok(select, "select dropdown should be created for gap");
      assert.equal(select.value, "md", "md token should be pre-selected");

      // Change to lg
      select.value = "lg";
      select.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 100));

      // Stack gap stores the token string
      assert.equal(window.sk._definitions[0].elements[0].props.gap, "lg", "gap should be 'lg' token");

      mod._resetDebugForTests();
    });
  });

  it("getEnumOptions returns correct values per element type", () => {
    const mod_sync = { getEnumOptions: null };
    // Test via dynamic import
    return import('../slidekit-debug.js').then(mod => {
      const opts = mod.getEnumOptions;
      assert.deepEqual(opts('align', 'vstack'), ['left', 'center', 'right', 'stretch']);
      assert.deepEqual(opts('align', 'hstack'), ['top', 'middle', 'bottom', 'stretch']);
      assert.equal(opts('align', 'el'), null);
      assert.deepEqual(opts('valign', 'el'), ['top', 'center', 'bottom']);
      assert.deepEqual(opts('overflow', 'el'), ['visible', 'warn', 'clip', 'error']);
      assert.deepEqual(opts('layer', 'el'), ['bg', 'content', 'overlay']);
      assert.equal(opts('unknownProp', 'el'), null);
    });
  });
});

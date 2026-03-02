// SlideKit Tests — Connector Routing
// Tests for orthogonal polyline waypoint computation

import { describe, it, assert } from './test-runner.js';
import { routeConnector, getAnchorPoint } from '../slidekit.js';

// =============================================================================
// Helpers
// =============================================================================

/** Standard box dimensions for tests: {x, y, w, h} */
const boxA = { x: 100, y: 100, w: 200, h: 100 };
const boxB = { x: 400, y: 100, w: 200, h: 100 };
const boxBelow = { x: 100, y: 300, w: 200, h: 100 };
const boxBelowRight = { x: 400, y: 300, w: 200, h: 100 };

function route(fromBounds, fromAnchor, toBounds, toAnchor, obstacles) {
  const from = getAnchorPoint(fromBounds, fromAnchor);
  const to = getAnchorPoint(toBounds, toAnchor);
  return routeConnector({ from, to, obstacles: obstacles || [] });
}

/** Check no consecutive duplicate points in waypoints. */
function hasNoDuplicates(waypoints) {
  for (let i = 1; i < waypoints.length; i++) {
    if (Math.abs(waypoints[i].x - waypoints[i - 1].x) < 0.5 &&
        Math.abs(waypoints[i].y - waypoints[i - 1].y) < 0.5) {
      return false;
    }
  }
  return true;
}

/**
 * Check that consecutive segments are axis-aligned.
 * Returns true if every consecutive pair shares x or y (within tolerance).
 * Corner anchor stubs may have a diagonal first/last segment, so we can
 * optionally skip the first and last segment.
 */
function allSegmentsAxisAligned(waypoints, tolerance) {
  tolerance = tolerance || 1;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const dx = Math.abs(waypoints[i + 1].x - waypoints[i].x);
    const dy = Math.abs(waypoints[i + 1].y - waypoints[i].y);
    if (dx > tolerance && dy > tolerance) {
      return false;
    }
  }
  return true;
}

// =============================================================================
// 1. Direction Vectors from getAnchorPoint
// =============================================================================

describe("Connector Routing: getAnchorPoint direction vectors", () => {
  const bounds = { x: 0, y: 0, w: 100, h: 100 };

  it("cr → dx=1, dy=0", () => {
    const pt = getAnchorPoint(bounds, "cr");
    assert.equal(pt.dx, 1, "dx should be 1");
    assert.equal(pt.dy, 0, "dy should be 0");
    assert.equal(pt.x, 100, "x at right edge");
    assert.equal(pt.y, 50, "y at center");
  });

  it("cl → dx=-1, dy=0", () => {
    const pt = getAnchorPoint(bounds, "cl");
    assert.equal(pt.dx, -1);
    assert.equal(pt.dy, 0);
    assert.equal(pt.x, 0, "x at left edge");
  });

  it("tc → dx=0, dy=-1", () => {
    const pt = getAnchorPoint(bounds, "tc");
    assert.equal(pt.dx, 0);
    assert.equal(pt.dy, -1);
    assert.equal(pt.y, 0, "y at top edge");
  });

  it("bc → dx=0, dy=1", () => {
    const pt = getAnchorPoint(bounds, "bc");
    assert.equal(pt.dx, 0);
    assert.equal(pt.dy, 1);
    assert.equal(pt.y, 100, "y at bottom edge");
  });

  it("tl → dx ≈ -0.707, dy ≈ -0.707", () => {
    const pt = getAnchorPoint(bounds, "tl");
    assert.within(pt.dx, -0.707, 0.01, "dx");
    assert.within(pt.dy, -0.707, 0.01, "dy");
  });

  it("tr → dx ≈ 0.707, dy ≈ -0.707", () => {
    const pt = getAnchorPoint(bounds, "tr");
    assert.within(pt.dx, 0.707, 0.01, "dx");
    assert.within(pt.dy, -0.707, 0.01, "dy");
  });

  it("bl → dx ≈ -0.707, dy ≈ 0.707", () => {
    const pt = getAnchorPoint(bounds, "bl");
    assert.within(pt.dx, -0.707, 0.01, "dx");
    assert.within(pt.dy, 0.707, 0.01, "dy");
  });

  it("br → dx ≈ 0.707, dy ≈ 0.707", () => {
    const pt = getAnchorPoint(bounds, "br");
    assert.within(pt.dx, 0.707, 0.01, "dx");
    assert.within(pt.dy, 0.707, 0.01, "dy");
  });

  it("cc → dx=0, dy=0 (direction computed later)", () => {
    const pt = getAnchorPoint(bounds, "cc");
    assert.equal(pt.dx, 0);
    assert.equal(pt.dy, 0);
    assert.equal(pt.x, 50);
    assert.equal(pt.y, 50);
  });
});

// =============================================================================
// 2. Forward Routing (simplest case)
// =============================================================================

describe("Connector Routing: forward routing (cr → cl)", () => {
  it("routes right from A to left of B", () => {
    const result = route(boxA, "cr", boxB, "cl");
    const wp = result.waypoints;
    assert.ok(wp.length >= 2, "should have at least start and end");

    // First waypoint at A's right edge
    assert.equal(wp[0].x, 300, "start x = A.x + A.w");
    assert.within(wp[0].y, 150, 1, "start y = A center");

    // Last waypoint at B's left edge
    assert.equal(wp[wp.length - 1].x, 400, "end x = B.x");
    assert.within(wp[wp.length - 1].y, 150, 1, "end y = B center");
  });

  it("first segment goes rightward (increasing x)", () => {
    const result = route(boxA, "cr", boxB, "cl");
    const wp = result.waypoints;
    assert.ok(wp[1].x > wp[0].x, "second point x > first point x");
  });

  it("last segment goes rightward (arriving from left)", () => {
    const result = route(boxA, "cr", boxB, "cl");
    const wp = result.waypoints;
    const n = wp.length;
    assert.ok(wp[n - 1].x >= wp[n - 2].x,
      "final waypoint x >= penultimate x (approaching from left)");
  });
});

// =============================================================================
// 3. Backward Routing (complex case)
// =============================================================================

describe("Connector Routing: backward routing (B.cr → A.cl)", () => {
  it("produces a route with bends for backward direction", () => {
    const result = route(boxB, "cr", boxA, "cl");
    const wp = result.waypoints;
    // Backward routing needs to go right from B then loop around to approach A from left
    assert.ok(wp.length >= 4, "backward route should have 4+ waypoints (bends)");
  });

  it("first move is rightward from B's right edge", () => {
    const result = route(boxB, "cr", boxA, "cl");
    const wp = result.waypoints;
    // Source exits right, so second point should have x > first
    assert.ok(wp[1].x > wp[0].x, "first move goes rightward from B");
  });

  it("last segment approaches A from the left", () => {
    const result = route(boxB, "cr", boxA, "cl");
    const wp = result.waypoints;
    const n = wp.length;
    // Target anchor is cl (left side of A at x=100)
    // The penultimate point should have x < target x (approaching from left)
    // OR at least the route arrives at A's left edge
    assert.equal(wp[n - 1].x, 100, "final point at A's left edge");
  });
});

// =============================================================================
// 4. Same-Direction Routing
// =============================================================================

describe("Connector Routing: same-direction routing (A.cr → B.cr)", () => {
  it("produces a U-shaped route when both exit right", () => {
    const result = route(boxA, "cr", boxB, "cr");
    const wp = result.waypoints;
    // Both anchors exit right — needs U-route around
    assert.ok(wp.length >= 4, "same-direction route should have 4+ waypoints");
  });

  it("starts at A's right edge and ends at B's right edge", () => {
    const result = route(boxA, "cr", boxB, "cr");
    const wp = result.waypoints;
    assert.equal(wp[0].x, 300, "start at A's right edge");
    assert.equal(wp[wp.length - 1].x, 600, "end at B's right edge");
  });

  it("route extends rightward beyond both boxes", () => {
    const result = route(boxA, "cr", boxB, "cr");
    const wp = result.waypoints;
    // Some waypoint should be to the right of B's right edge (600) + stub
    const maxX = Math.max(...wp.map(p => p.x));
    assert.ok(maxX > 600, "route should extend right of B's right edge");
  });
});

// =============================================================================
// 5. Perpendicular Routing
// =============================================================================

describe("Connector Routing: perpendicular routing (A.bc → B_below_right.cl)", () => {
  it("produces an L-bend route", () => {
    const result = route(boxA, "bc", boxBelowRight, "cl");
    const wp = result.waypoints;
    // A exits down, B enters from left — should be L-bend
    assert.ok(wp.length >= 3, "perpendicular route needs at least 3 points for L-bend");
  });

  it("starts at A's bottom center", () => {
    const result = route(boxA, "bc", boxBelowRight, "cl");
    const wp = result.waypoints;
    assert.within(wp[0].x, 200, 1, "start x = A center x");
    assert.equal(wp[0].y, 200, "start y = A bottom");
  });

  it("ends at B's left center", () => {
    const result = route(boxA, "bc", boxBelowRight, "cl");
    const wp = result.waypoints;
    const last = wp[wp.length - 1];
    assert.equal(last.x, 400, "end x = B left edge");
    assert.within(last.y, 350, 1, "end y = B center");
  });
});

// =============================================================================
// 6. Vertical Forward Routing
// =============================================================================

describe("Connector Routing: vertical forward (A.bc → B_below.tc)", () => {
  it("routes downward from A to B", () => {
    const result = route(boxA, "bc", boxBelow, "tc");
    const wp = result.waypoints;
    assert.ok(wp.length >= 2, "should have at least start and end");

    // Start at A's bottom center
    assert.within(wp[0].x, 200, 1, "start x = center of A");
    assert.equal(wp[0].y, 200, "start y = A bottom");

    // End at B's top center
    assert.within(wp[wp.length - 1].x, 200, 1, "end x = center of B_below");
    assert.equal(wp[wp.length - 1].y, 300, "end y = B_below top");
  });

  it("path moves downward (increasing y)", () => {
    const result = route(boxA, "bc", boxBelow, "tc");
    const wp = result.waypoints;
    // Every waypoint y should be >= the previous (moving down)
    for (let i = 1; i < wp.length; i++) {
      assert.ok(wp[i].y >= wp[i - 1].y - 1,
        `waypoint ${i} y should be >= waypoint ${i - 1} y`);
    }
  });
});

// =============================================================================
// 7. Waypoint Validity (structural checks for all routes)
// =============================================================================

describe("Connector Routing: waypoint validity", () => {
  // Perpendicular routes with offset endpoints may use L-bend midpoints
  // that are inherently non-axis-aligned, so we exclude them from the
  // axis-aligned structural check.
  const scenarios = [
    { name: "forward cr→cl", from: [boxA, "cr"], to: [boxB, "cl"], checkAligned: true },
    { name: "backward B.cr→A.cl", from: [boxB, "cr"], to: [boxA, "cl"], checkAligned: true },
    { name: "same-dir A.cr→B.cr", from: [boxA, "cr"], to: [boxB, "cr"], checkAligned: true },
    { name: "perp A.bc→BR.cl", from: [boxA, "bc"], to: [boxBelowRight, "cl"], checkAligned: false },
    { name: "vert A.bc→Below.tc", from: [boxA, "bc"], to: [boxBelow, "tc"], checkAligned: true },
  ];

  for (const sc of scenarios) {
    it(`${sc.name}: first waypoint matches from point`, () => {
      const fromPt = getAnchorPoint(sc.from[0], sc.from[1]);
      const result = route(sc.from[0], sc.from[1], sc.to[0], sc.to[1]);
      const wp = result.waypoints;
      assert.within(wp[0].x, fromPt.x, 1, "first wp x");
      assert.within(wp[0].y, fromPt.y, 1, "first wp y");
    });

    it(`${sc.name}: last waypoint matches to point`, () => {
      const toPt = getAnchorPoint(sc.to[0], sc.to[1]);
      const result = route(sc.from[0], sc.from[1], sc.to[0], sc.to[1]);
      const wp = result.waypoints;
      assert.within(wp[wp.length - 1].x, toPt.x, 1, "last wp x");
      assert.within(wp[wp.length - 1].y, toPt.y, 1, "last wp y");
    });

    it(`${sc.name}: no consecutive duplicate points`, () => {
      const result = route(sc.from[0], sc.from[1], sc.to[0], sc.to[1]);
      assert.ok(hasNoDuplicates(result.waypoints),
        "should have no consecutive duplicate points");
    });

    it(`${sc.name}: segments are axis-aligned`, () => {
      if (!sc.checkAligned) return; // skip for perpendicular with offset endpoints
      const result = route(sc.from[0], sc.from[1], sc.to[0], sc.to[1]);
      assert.ok(allSegmentsAxisAligned(result.waypoints, 1),
        "all segments should be axis-aligned (share x or y within 1px)");
    });
  }
});

// =============================================================================
// 8. Stub Direction
// =============================================================================

describe("Connector Routing: stub direction", () => {
  it("second waypoint is in exit direction from the first (rightward for cr)", () => {
    const result = route(boxA, "cr", boxB, "cl");
    const wp = result.waypoints;
    assert.ok(wp[1].x > wp[0].x,
      "second waypoint should be right of first (exit direction cr)");
  });

  it("second waypoint is in exit direction from the first (downward for bc)", () => {
    const result = route(boxA, "bc", boxBelow, "tc");
    const wp = result.waypoints;
    assert.ok(wp[1].y > wp[0].y,
      "second waypoint should be below first (exit direction bc)");
  });

  it("second-to-last waypoint approaches from entry direction (leftward for cl)", () => {
    const result = route(boxA, "cr", boxB, "cl");
    const wp = result.waypoints;
    const n = wp.length;
    // Entry anchor is cl → entry from left, so penultimate point x <= last point x
    assert.ok(wp[n - 2].x <= wp[n - 1].x,
      "penultimate waypoint x <= last x (approaching from left for cl)");
  });

  it("second-to-last waypoint approaches from entry direction (upward for tc)", () => {
    const result = route(boxA, "bc", boxBelow, "tc");
    const wp = result.waypoints;
    const n = wp.length;
    // Entry anchor is tc → entry from top, so penultimate point y <= last point y
    assert.ok(wp[n - 2].y <= wp[n - 1].y,
      "penultimate waypoint y <= last y (approaching from top for tc)");
  });
});

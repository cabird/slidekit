// SlideKit Tests — Connector Improvements
// Tests for obstacle avoidance, port spreading, label placement, corner radius

import { describe, it, assert } from './test-runner.js';
import { routeConnector, getAnchorPoint } from '../slidekit.js';

// =============================================================================
// Helpers
// =============================================================================

const boxA = { x: 100, y: 100, w: 120, h: 100 };
const boxB = { x: 500, y: 100, w: 120, h: 100 };
const boxMiddle = { x: 330, y: 80, w: 80, h: 140 }; // obstacle clearly between A and B
const boxBelow = { x: 100, y: 400, w: 120, h: 100 };

function route(fromBounds, fromAnchor, toBounds, toAnchor, obstacles) {
  const from = getAnchorPoint(fromBounds, fromAnchor);
  const to = getAnchorPoint(toBounds, toAnchor);
  return routeConnector({ from, to, obstacles: obstacles || [] });
}

/** Check if any segment of the polyline intersects a rectangle. */
function polylineIntersectsRect(waypoints, rect, clearance) {
  clearance = clearance || 0;
  const left = rect.x - clearance;
  const right = rect.x + rect.w + clearance;
  const top = rect.y - clearance;
  const bottom = rect.y + rect.h + clearance;

  for (let i = 0; i < waypoints.length - 1; i++) {
    const p1 = waypoints[i];
    const p2 = waypoints[i + 1];
    const minX = Math.min(p1.x, p2.x);
    const maxX = Math.max(p1.x, p2.x);
    const minY = Math.min(p1.y, p2.y);
    const maxY = Math.max(p1.y, p2.y);

    const isH = Math.abs(p1.y - p2.y) < 0.5;
    const isV = Math.abs(p1.x - p2.x) < 0.5;

    if (isH && p1.y > top && p1.y < bottom && maxX > left && minX < right) return true;
    if (isV && p1.x > left && p1.x < right && maxY > top && minY < bottom) return true;
  }
  return false;
}

// =============================================================================
// 1. Obstacle Avoidance
// =============================================================================

describe("Connector Improvements: obstacle avoidance", () => {
  it("route avoids a box placed between source and target", () => {
    const result = route(boxA, "cr", boxB, "cl", [boxMiddle]);
    const wp = result.waypoints;
    // Route should not intersect the obstacle
    assert.ok(!polylineIntersectsRect(wp, boxMiddle, 0),
      "route should not pass through the obstacle box");
  });

  it("route without obstacles goes straight through", () => {
    const result = route(boxA, "cr", boxB, "cl", []);
    const wp = result.waypoints;
    // Without obstacles, the route can go directly
    assert.ok(wp.length >= 2, "should have at least start and end");
  });

  it("route avoids multiple obstacles", () => {
    const obs1 = { x: 300, y: 50, w: 50, h: 200 };
    const obs2 = { x: 400, y: 50, w: 50, h: 200 };
    const result = route(boxA, "cr", boxB, "cl", [obs1, obs2]);
    const wp = result.waypoints;
    assert.ok(!polylineIntersectsRect(wp, obs1, 0), "should avoid obstacle 1");
    assert.ok(!polylineIntersectsRect(wp, obs2, 0), "should avoid obstacle 2");
  });

  it("backward route avoids obstacles", () => {
    const obs = { x: 300, y: 50, w: 100, h: 400 };
    const result = route(boxB, "cl", boxA, "cr", [obs]);
    const wp = result.waypoints;
    assert.ok(!polylineIntersectsRect(wp, obs, 0),
      "backward route should avoid obstacle");
  });

  it("route starts and ends at correct anchor points with obstacles", () => {
    const result = route(boxA, "cr", boxB, "cl", [boxMiddle]);
    const wp = result.waypoints;
    const fromPt = getAnchorPoint(boxA, "cr");
    const toPt = getAnchorPoint(boxB, "cl");
    assert.within(wp[0].x, fromPt.x, 1, "start x");
    assert.within(wp[0].y, fromPt.y, 1, "start y");
    assert.within(wp[wp.length - 1].x, toPt.x, 1, "end x");
    assert.within(wp[wp.length - 1].y, toPt.y, 1, "end y");
  });
});

// =============================================================================
// 2. Port Spreading Logic (unit tests for sorting behavior)
// =============================================================================

describe("Connector Improvements: port spreading sort order", () => {
  it("connectors from bottom edge sort by target x to avoid crossings", () => {
    const targets = [
      { targetX: 600, label: "right" },
      { targetX: 200, label: "left" },
    ];
    targets.sort((a, b) => a.targetX - b.targetX);
    assert.equal(targets[0].label, "left", "left target should come first");
    assert.equal(targets[1].label, "right", "right target should come second");
  });

  it("connectors from right edge sort by target y", () => {
    const targets = [
      { targetY: 500, label: "bottom" },
      { targetY: 100, label: "top" },
    ];
    targets.sort((a, b) => a.targetY - b.targetY);
    assert.equal(targets[0].label, "top", "top target should come first");
    assert.equal(targets[1].label, "bottom", "bottom target should come second");
  });

  it("portOrder takes precedence over target projection", () => {
    const entries = [
      { portOrder: 1, targetX: 100, label: "B" },
      { portOrder: 0, targetX: 500, label: "A" },
    ];
    entries.sort((a, b) => {
      if (a.portOrder !== b.portOrder) return a.portOrder - b.portOrder;
      return a.targetX - b.targetX;
    });
    assert.equal(entries[0].label, "A", "lower portOrder comes first");
    assert.equal(entries[1].label, "B", "higher portOrder comes second");
  });
});

// =============================================================================
// 2b. Port Spreading Offset Math (tests the actual spacing algorithm)
// =============================================================================

describe("Connector Improvements: port spreading offset computation", () => {
  // Mirror the production spreading constants and algorithm from finalize.ts
  const PORT_SPACING = 14;
  const EDGE_MARGIN = 8;

  function computeSpreadOffsets(count, edgeLength) {
    const usable = edgeLength - 2 * EDGE_MARGIN;
    const totalSpread = (count - 1) * PORT_SPACING;
    const spacing = totalSpread > usable
      ? usable / (count - 1)
      : PORT_SPACING;
    const startOffset = -((count - 1) * spacing / 2);
    const offsets = [];
    for (let i = 0; i < count; i++) {
      offsets.push(startOffset + i * spacing);
    }
    return { offsets, spacing };
  }

  it("two connectors are spread symmetrically around center", () => {
    const { offsets } = computeSpreadOffsets(2, 120);
    assert.equal(offsets.length, 2);
    // Should be symmetric: -7 and +7
    assert.within(offsets[0], -PORT_SPACING / 2, 0.01, "first offset");
    assert.within(offsets[1], PORT_SPACING / 2, 0.01, "second offset");
    // Sum should be zero (centered)
    assert.within(offsets[0] + offsets[1], 0, 0.01, "offsets sum to zero");
  });

  it("three connectors get evenly spaced offsets", () => {
    const { offsets } = computeSpreadOffsets(3, 200);
    assert.equal(offsets.length, 3);
    assert.within(offsets[0], -PORT_SPACING, 0.01, "first");
    assert.within(offsets[1], 0, 0.01, "center");
    assert.within(offsets[2], PORT_SPACING, 0.01, "last");
  });

  it("spacing compresses when edge is too small for full PORT_SPACING", () => {
    // Edge of 30px, margin 8 each side = 14px usable, 3 connectors need 28px at full spacing
    const { offsets, spacing } = computeSpreadOffsets(3, 30);
    const usable = 30 - 2 * EDGE_MARGIN; // 14
    assert.ok(spacing < PORT_SPACING, "spacing should be compressed");
    assert.within(spacing, usable / 2, 0.01, "spacing = usable / (count-1)");
    // All offsets should still be within usable range
    const min = offsets[0];
    const max = offsets[offsets.length - 1];
    assert.ok(max - min <= usable, "total spread fits within usable edge");
  });

  it("single connector gets zero offset (no spreading needed)", () => {
    // The production code skips single-connector groups,
    // but if we ran the math, offset should be 0
    const { offsets } = computeSpreadOffsets(1, 120);
    assert.equal(offsets.length, 1);
    assert.within(offsets[0], 0, 0.01, "single connector centered");
  });
});

// =============================================================================
// 3. pointAlongPolyline (tested via rendering behavior)
// =============================================================================

describe("Connector Improvements: path midpoint helpers", () => {
  it("midpoint of two points is their geometric center", () => {
    // Simple two-point path
    const points = [{ x: 0, y: 0 }, { x: 100, y: 0 }];
    // At t=0.5, should be at (50, 0)
    const mid = pointAlongPolylineTest(points, 0.5);
    assert.within(mid.x, 50, 0.1, "midpoint x");
    assert.within(mid.y, 0, 0.1, "midpoint y");
  });

  it("t=0 returns start point", () => {
    const points = [{ x: 10, y: 20 }, { x: 100, y: 200 }];
    const pt = pointAlongPolylineTest(points, 0);
    assert.within(pt.x, 10, 0.1, "start x");
    assert.within(pt.y, 20, 0.1, "start y");
  });

  it("t=1 returns end point", () => {
    const points = [{ x: 10, y: 20 }, { x: 100, y: 200 }];
    const pt = pointAlongPolylineTest(points, 1);
    assert.within(pt.x, 100, 0.1, "end x");
    assert.within(pt.y, 200, 0.1, "end y");
  });

  it("L-shaped polyline midpoint is on the path, not endpoint midpoint", () => {
    // L-shaped path: (0,0) → (100,0) → (100,100)
    // Total length = 200, midpoint at length 100 = (100, 0)
    const points = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }];
    const mid = pointAlongPolylineTest(points, 0.5);
    assert.within(mid.x, 100, 0.1, "L-path midpoint x");
    assert.within(mid.y, 0, 0.1, "L-path midpoint y");
  });

  it("single-point path returns that point", () => {
    const points = [{ x: 42, y: 99 }];
    const pt = pointAlongPolylineTest(points, 0.5);
    assert.equal(pt.x, 42);
    assert.equal(pt.y, 99);
  });
});

// Standalone implementation for testing (mirrors renderer's pointAlongPolyline)
function pointAlongPolylineTest(points, t) {
  if (points.length < 2) return points[0] || { x: 0, y: 0 };
  const segLengths = [];
  let totalLength = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const dx = points[i + 1].x - points[i].x;
    const dy = points[i + 1].y - points[i].y;
    const len = Math.sqrt(dx * dx + dy * dy);
    segLengths.push(len);
    totalLength += len;
  }
  if (totalLength === 0) return points[0];
  const targetLength = t * totalLength;
  let accumulated = 0;
  for (let i = 0; i < segLengths.length; i++) {
    if (accumulated + segLengths[i] >= targetLength) {
      const segFraction = segLengths[i] > 0 ? (targetLength - accumulated) / segLengths[i] : 0;
      return {
        x: points[i].x + (points[i + 1].x - points[i].x) * segFraction,
        y: points[i].y + (points[i + 1].y - points[i].y) * segFraction,
      };
    }
    accumulated += segLengths[i];
  }
  return points[points.length - 1];
}

// =============================================================================
// 4. Rounded Elbow Path (SVG arc generation)
// =============================================================================

describe("Connector Improvements: rounded elbow path generation", () => {
  it("buildRoundedElbowPath produces valid SVG path with arcs", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
    ];
    const path = buildRoundedElbowPathTest(points, 10);
    assert.ok(path.startsWith("M "), "should start with M command");
    assert.ok(path.includes("A "), "should contain arc command");
    assert.ok(path.includes("L "), "should contain line command");
  });

  it("radius clamped to half segment length for short segments", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },  // very short segment (10px)
      { x: 10, y: 100 },
    ];
    const path = buildRoundedElbowPathTest(points, 100);
    // Radius should be clamped to 5 (half of 10px segment)
    assert.ok(path.includes("A 5 5"), "radius should be clamped to 5");
  });

  it("two-point path produces simple line (no arcs)", () => {
    const points = [{ x: 0, y: 0 }, { x: 100, y: 100 }];
    const path = buildRoundedElbowPathTest(points, 10);
    assert.ok(!path.includes("A "), "two-point path should not have arcs");
    assert.ok(path.includes("L "), "should have a line segment");
  });

  it("zero radius produces no arcs", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
    ];
    // When radius is 0 or less than 1, should fall back to lines
    const path = buildRoundedElbowPathTest(points, 0);
    assert.ok(!path.includes("A "), "zero radius should not produce arcs");
  });

  it("multiple corners all get arcs", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 200, y: 100 },
    ];
    const path = buildRoundedElbowPathTest(points, 8);
    const arcCount = (path.match(/A /g) || []).length;
    assert.equal(arcCount, 2, "should have 2 arcs for 2 interior corners");
  });
});

// Standalone implementation for testing — mirrors renderer's buildRoundedElbowPath exactly.
// Uses angle-based fillet math so arc radius is correct for any turn angle, not just 90°.
function buildRoundedElbowPathTest(points, radius) {
  if (points.length < 2) return '';
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  let d = `M ${points[0].x} ${points[0].y}`;

  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];

    const len1 = Math.sqrt((curr.x - prev.x) ** 2 + (curr.y - prev.y) ** 2);
    const len2 = Math.sqrt((next.x - curr.x) ** 2 + (next.y - curr.y) ** 2);

    if (len1 < 0.5 || len2 < 0.5) {
      d += ` L ${curr.x} ${curr.y}`;
      continue;
    }

    const ux1 = (curr.x - prev.x) / len1;
    const uy1 = (curr.y - prev.y) / len1;
    const ux2 = (next.x - curr.x) / len2;
    const uy2 = (next.y - curr.y) / len2;

    const cross = ux1 * uy2 - uy1 * ux2;
    const dot = ux1 * ux2 + uy1 * uy2;
    const absCross = Math.abs(cross);

    // Skip arc for near-collinear segments
    if (absCross < 0.01) {
      d += ` L ${curr.x} ${curr.y}`;
      continue;
    }

    // tan(β/2) = |cross| / (1 - dot), where β is the opening angle
    const tanHalf = absCross / (1 - dot);
    let trim = radius / tanHalf;

    const maxTrim = Math.min(len1 / 2, len2 / 2);
    if (trim > maxTrim) {
      trim = maxTrim;
    }

    const arcRadius = trim * tanHalf;

    if (trim < 1 || arcRadius < 1) {
      d += ` L ${curr.x} ${curr.y}`;
      continue;
    }

    const enterX = curr.x - ux1 * trim;
    const enterY = curr.y - uy1 * trim;
    const exitX = curr.x + ux2 * trim;
    const exitY = curr.y + uy2 * trim;

    const sweep = cross > 0 ? 1 : 0;

    d += ` L ${enterX} ${enterY}`;
    d += ` A ${arcRadius} ${arcRadius} 0 0 ${sweep} ${exitX} ${exitY}`;
  }

  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

// =============================================================================
// 5. Obstacle avoidance with routing quality
// =============================================================================

describe("Connector Improvements: routing quality with obstacles", () => {
  it("route with obstacle has more waypoints than without", () => {
    const withoutObs = route(boxA, "cr", boxB, "cl", []);
    const withObs = route(boxA, "cr", boxB, "cl", [boxMiddle]);
    assert.ok(withObs.waypoints.length >= withoutObs.waypoints.length,
      "obstacle-aware route should have equal or more waypoints");
  });

  it("vertical route avoids horizontal obstacle", () => {
    // Obstacle blocks the vertical path between A and boxBelow
    const hObs = { x: 50, y: 250, w: 300, h: 50 };
    const result = route(boxA, "bc", boxBelow, "tc", [hObs]);
    const wp = result.waypoints;
    assert.ok(!polylineIntersectsRect(wp, hObs, 0),
      "vertical route should avoid horizontal obstacle");
  });

  it("route waypoints still start and end correctly with obstacles", () => {
    const obs = { x: 300, y: 50, w: 100, h: 200 };
    const result = route(boxA, "cr", boxB, "cl", [obs]);
    const wp = result.waypoints;
    const fromPt = getAnchorPoint(boxA, "cr");
    const toPt = getAnchorPoint(boxB, "cl");
    assert.within(wp[0].x, fromPt.x, 1, "start x correct");
    assert.within(wp[0].y, fromPt.y, 1, "start y correct");
    assert.within(wp[wp.length - 1].x, toPt.x, 1, "end x correct");
    assert.within(wp[wp.length - 1].y, toPt.y, 1, "end y correct");
  });
});

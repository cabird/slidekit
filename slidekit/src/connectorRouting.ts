// =============================================================================
// Connector Routing Module
//
// Computes orthogonal polyline waypoints for connectors based on:
// - Source/target anchor points with direction vectors
// - Obstacle bounding boxes (other elements on the slide)
//
// Routing approach:
// 1. Extend mandatory stubs from source and target (orthogonal exit/entry)
// 2. Route between stub endpoints using case classification
// 3. Check for obstacle intersections and reroute if needed
// =============================================================================

import type { Rect, Point, AnchorPointResult } from './types.js';

// =============================================================================
// Public interfaces
// =============================================================================

export interface RouteOptions {
  from: AnchorPointResult;
  to: AnchorPointResult;
  obstacles?: Rect[];
  stubLength?: number;
  clearance?: number;
  /** When true, only produce axis-aligned (horizontal/vertical) segments. */
  orthogonal?: boolean;
}

export interface RouteResult {
  waypoints: Point[];
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_STUB_LENGTH = 30;
const DEFAULT_CLEARANCE = 15;

// =============================================================================
// Main entry point
// =============================================================================

export function routeConnector(options: RouteOptions): RouteResult {
  const {
    from,
    to,
    obstacles = [],
    stubLength = DEFAULT_STUB_LENGTH,
    clearance = DEFAULT_CLEARANCE,
    orthogonal = false,
  } = options;

  const fromPt: Point = { x: from.x, y: from.y };
  const toPt: Point = { x: to.x, y: to.y };

  const fromStub = computeStubEnd(from, stubLength);
  const toStub = computeStubEnd(to, stubLength);

  const fromDir = normalizeDirection(from.dx, from.dy);
  const toDir = normalizeDirection(to.dx, to.dy);

  // For corner anchors, insert a bend so the path becomes axis-aligned
  const fromSegments = buildStubSegments(fromPt, fromStub, from.dx, from.dy);
  const toSegments = buildStubSegments(toPt, toStub, to.dx, to.dy);

  // The effective axis-aligned stub endpoints for routing
  const p1 = fromSegments[fromSegments.length - 1];
  const q1 = toSegments[toSegments.length - 1];

  const middle = findBestRoute(p1, fromDir, q1, toDir, obstacles, clearance, orthogonal);

  // Assemble full path: from → stub segments → middle → reverse(to stub segments) → to
  const toSegmentsReversed = [...toSegments].reverse();
  const waypoints = deduplicatePoints([
    fromPt,
    ...fromSegments,
    ...middle,
    ...toSegmentsReversed,
    toPt,
  ]);

  return { waypoints };
}

// =============================================================================
// Stub helpers
// =============================================================================

function computeStubEnd(anchor: AnchorPointResult, stubLength: number): Point {
  return {
    x: anchor.x + anchor.dx * stubLength,
    y: anchor.y + anchor.dy * stubLength,
  };
}

/** Normalize a direction vector to axis-aligned unit or keep diagonal. */
function normalizeDirection(dx: number, dy: number): { dx: number; dy: number } {
  if (dx !== 0 && dy !== 0) {
    // Diagonal — pick the dominant axis (or favor horizontal)
    return Math.abs(dx) >= Math.abs(dy)
      ? { dx: Math.sign(dx), dy: 0 }
      : { dx: 0, dy: Math.sign(dy) };
  }
  if (dx !== 0) return { dx: Math.sign(dx), dy: 0 };
  if (dy !== 0) return { dx: 0, dy: Math.sign(dy) };
  return { dx: 1, dy: 0 }; // fallback: rightward
}

/**
 * Build stub segments from an anchor point to its stub end.
 * For axis-aligned directions this is a single point (the stub end).
 * For diagonal directions we insert a bend to become axis-aligned.
 */
function buildStubSegments(
  origin: Point,
  stubEnd: Point,
  dx: number,
  dy: number,
): Point[] {
  const isDiagonal = dx !== 0 && dy !== 0;
  if (!isDiagonal) {
    return [stubEnd];
  }
  // TODO: Diagonal stubs could be optimized to score both horizontal-first
  // and vertical-first variants and pick the shorter overall route.
  // Diagonal stub: extend horizontally first, then vertically to become axis-aligned
  const midPoint: Point = { x: stubEnd.x, y: origin.y };
  return [midPoint, stubEnd];
}

// =============================================================================
// Segment–Rect intersection
// =============================================================================

/** Check if an axis-aligned segment intersects an inflated obstacle rect. */
function segmentIntersectsRect(
  p1: Point,
  p2: Point,
  rect: Rect,
  clearance: number,
): boolean {
  const left = rect.x - clearance;
  const right = rect.x + rect.w + clearance;
  const top = rect.y - clearance;
  const bottom = rect.y + rect.h + clearance;

  const minX = Math.min(p1.x, p2.x);
  const maxX = Math.max(p1.x, p2.x);
  const minY = Math.min(p1.y, p2.y);
  const maxY = Math.max(p1.y, p2.y);

  const isHorizontal = Math.abs(p1.y - p2.y) < 0.5;
  const isVertical = Math.abs(p1.x - p2.x) < 0.5;

  if (isHorizontal) {
    return p1.y > top && p1.y < bottom && maxX > left && minX < right;
  }
  if (isVertical) {
    return p1.x > left && p1.x < right && maxY > top && minY < bottom;
  }

  // Non-axis-aligned segment — conservative AABB check
  return maxX > left && minX < right && maxY > top && minY < bottom;
}

/** Check if any segment in a polyline intersects any obstacle. */
function polylineIntersectsObstacles(
  points: Point[],
  obstacles: Rect[],
  clearance: number,
): boolean {
  for (let i = 0; i < points.length - 1; i++) {
    for (const obs of obstacles) {
      if (segmentIntersectsRect(points[i], points[i + 1], obs, clearance)) {
        return true;
      }
    }
  }
  return false;
}

// =============================================================================
// Route finding
// =============================================================================

/**
 * Generate candidate routes between stub endpoints p1 and q1 and pick the
 * shortest one that avoids obstacles.
 */
function findBestRoute(
  p1: Point,
  d1: { dx: number; dy: number },
  q1: Point,
  d2: { dx: number; dy: number },
  obstacles: Rect[],
  clearance: number,
  orthogonal: boolean = false,
): Point[] {
  const candidates: Point[][] = [];

  // Classify the routing case first to decide which candidates are valid
  const caseType = classifyCase(p1, d1, q1, d2);

  if (caseType === 'backward' || caseType === 'same-direction') {
    // Only U-route candidates are valid; direct/L-bend/Z-bend would create
    // paths that double back through elements
    const uCandidates = computeAllChannelRoutes(p1, d1, q1, d2, obstacles, clearance);
    candidates.push(...uCandidates);
  } else {
    // Direct segment — skip for orthogonal mode (would create diagonal)
    if (!orthogonal) {
      candidates.push([]);
    }

    // L-bend variants
    candidates.push([{ x: q1.x, y: p1.y }]);
    candidates.push([{ x: p1.x, y: q1.y }]);

    // Z-bend (horizontal-first and vertical-first)
    const midX = (p1.x + q1.x) / 2;
    const midY = (p1.y + q1.y) / 2;
    candidates.push([
      { x: midX, y: p1.y },
      { x: midX, y: q1.y },
    ]);
    candidates.push([
      { x: p1.x, y: midY },
      { x: q1.x, y: midY },
    ]);
  }

  // Score each candidate: prefer shortest obstacle-free route
  let bestRoute: Point[] = [];
  let bestDist = Infinity;

  for (const middle of candidates) {
    const full = [p1, ...middle, q1];
    const dist = manhattanLength(full);
    if (dist < bestDist) {
      if (!polylineIntersectsObstacles(full, obstacles, clearance)) {
        bestDist = dist;
        bestRoute = middle;
      }
    }
  }

  // If no obstacle-free route found, try U-routes in all four channel directions
  if (bestDist === Infinity) {
    const fallbackRoutes = computeAllChannelRoutes(p1, d1, q1, d2, obstacles, clearance);
    for (const route of fallbackRoutes) {
      const full = [p1, ...route, q1];
      const dist = manhattanLength(full);
      if (dist < bestDist && !polylineIntersectsObstacles(full, obstacles, clearance)) {
        bestDist = dist;
        bestRoute = route;
      }
    }
  }

  // Final fallback: route around the convex bounding box of all obstacles
  if (bestDist === Infinity) {
    bestRoute = routeAroundAll(p1, q1, obstacles, clearance);
  }

  return bestRoute;
}

// =============================================================================
// Case classification
// =============================================================================

type RoutingCase = 'direct' | 'perpendicular' | 'backward' | 'same-direction';

function classifyCase(
  p1: Point,
  d1: { dx: number; dy: number },
  q1: Point,
  d2: { dx: number; dy: number },
): RoutingCase {
  // Dot product of directions
  const dot = d1.dx * d2.dx + d1.dy * d2.dy;

  // Direction from p1 toward q1
  const toTargetX = Math.sign(q1.x - p1.x);
  const toTargetY = Math.sign(q1.y - p1.y);

  // Only check axes where there IS a position difference;
  // when points share an axis (delta=0), that axis is irrelevant for facing
  let facingTarget: boolean;
  if (toTargetX === 0 && toTargetY === 0) {
    // Points coincide — treat opposite-facing directions as facing each other
    facingTarget = dot < 0;
  } else {
    facingTarget =
      (toTargetX !== 0 && d1.dx === toTargetX) ||
      (toTargetY !== 0 && d1.dy === toTargetY);
  }

  if (dot < 0 && facingTarget) {
    // Directions face each other
    return 'direct';
  }

  if (dot === 0) {
    return 'perpendicular';
  }

  if (dot > 0) {
    return 'same-direction';
  }

  return 'backward';
}

// =============================================================================
// U-route computation
// =============================================================================

/**
 * Generate U-route candidates through channels above, below, left, and right
 * of the combined bounding box of all relevant geometry.
 */
function computeAllChannelRoutes(
  p1: Point,
  d1: { dx: number; dy: number },
  q1: Point,
  _d2: { dx: number; dy: number },
  obstacles: Rect[],
  clearance: number,
): Point[][] {
  // Compute combined bounding box of p1, q1, and all obstacles
  let minX = Math.min(p1.x, q1.x);
  let minY = Math.min(p1.y, q1.y);
  let maxX = Math.max(p1.x, q1.x);
  let maxY = Math.max(p1.y, q1.y);

  for (const obs of obstacles) {
    minX = Math.min(minX, obs.x);
    minY = Math.min(minY, obs.y);
    maxX = Math.max(maxX, obs.x + obs.w);
    maxY = Math.max(maxY, obs.y + obs.h);
  }

  const routes: Point[][] = [];

  // Offset must be large enough for U-routes to visually clear the elements.
  // Use 30% of the span between endpoints, with a minimum of 60px.
  const spanX = maxX - minX;
  const spanY = maxY - minY;
  const offsetY = Math.max(60, spanY * 0.3, clearance);
  const offsetX = Math.max(60, spanX * 0.3, clearance);

  // Channel above (top)
  const topY = minY - offsetY;
  routes.push(buildChannelRoute(p1, q1, d1, 'y', topY));

  // Channel below (bottom)
  const bottomY = maxY + offsetY;
  routes.push(buildChannelRoute(p1, q1, d1, 'y', bottomY));

  // Channel left
  const leftX = minX - offsetX;
  routes.push(buildChannelRoute(p1, q1, d1, 'x', leftX));

  // Channel right
  const rightX = maxX + offsetX;
  routes.push(buildChannelRoute(p1, q1, d1, 'x', rightX));

  return routes;
}

/**
 * Build a U-shaped route through a channel at the given coordinate.
 * channelAxis='y' means the channel runs horizontally at channelValue y.
 * channelAxis='x' means the channel runs vertically at channelValue x.
 */
function buildChannelRoute(
  p1: Point,
  q1: Point,
  _d1: { dx: number; dy: number },
  channelAxis: 'x' | 'y',
  channelValue: number,
): Point[] {
  if (channelAxis === 'y') {
    // Route: p1 → (p1.x, channelValue) → (q1.x, channelValue) → q1
    return [
      { x: p1.x, y: channelValue },
      { x: q1.x, y: channelValue },
    ];
  }
  // Route: p1 → (channelValue, p1.y) → (channelValue, q1.y) → q1
  return [
    { x: channelValue, y: p1.y },
    { x: channelValue, y: q1.y },
  ];
}

// =============================================================================
// Fallback: route around all obstacles
// =============================================================================

function routeAroundAll(
  p1: Point,
  q1: Point,
  obstacles: Rect[],
  clearance: number,
): Point[] {
  if (obstacles.length === 0) {
    // Simple L-bend when no obstacles
    return [{ x: q1.x, y: p1.y }];
  }

  // Compute combined bounding box of all obstacles
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const obs of obstacles) {
    minX = Math.min(minX, obs.x);
    minY = Math.min(minY, obs.y);
    maxX = Math.max(maxX, obs.x + obs.w);
    maxY = Math.max(maxY, obs.y + obs.h);
  }

  // Add clearance
  minX -= clearance;
  minY -= clearance;
  maxX += clearance;
  maxY += clearance;

  // Try four routes around the bounding box, pick shortest
  const candidates: Point[][] = [
    // Top route
    [{ x: p1.x, y: minY }, { x: q1.x, y: minY }],
    // Bottom route
    [{ x: p1.x, y: maxY }, { x: q1.x, y: maxY }],
    // Left route
    [{ x: minX, y: p1.y }, { x: minX, y: q1.y }],
    // Right route
    [{ x: maxX, y: p1.y }, { x: maxX, y: q1.y }],
  ];

  let best = candidates[0];
  let bestDist = Infinity;
  for (const route of candidates) {
    const full = [p1, ...route, q1];
    const dist = manhattanLength(full);
    if (dist < bestDist) {
      bestDist = dist;
      best = route;
    }
  }

  return best;
}

// =============================================================================
// Geometry utilities
// =============================================================================

/** Total Manhattan distance along a polyline. */
function manhattanLength(points: Point[]): number {
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    total += Math.abs(points[i + 1].x - points[i].x) + Math.abs(points[i + 1].y - points[i].y);
  }
  return total;
}

/** Remove consecutive duplicate points. */
function deduplicatePoints(points: Point[]): Point[] {
  if (points.length === 0) return [];
  const result: Point[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const prev = result[result.length - 1];
    if (Math.abs(points[i].x - prev.x) > 0.5 || Math.abs(points[i].y - prev.y) > 0.5) {
      result.push(points[i]);
    }
  }
  return result;
}

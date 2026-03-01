// @ts-check

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

/** @typedef {import('./types.js').Rect} Rect */
/** @typedef {import('./types.js').Point} Point */
/** @typedef {import('./types.js').AnchorPointResult} AnchorPointResult */

/**
 * @typedef {Object} RouteOptions
 * @property {AnchorPointResult} from
 * @property {AnchorPointResult} to
 * @property {Rect[]} [obstacles]
 * @property {number} [stubLength]
 * @property {number} [clearance]
 */

/**
 * @typedef {Object} RouteResult
 * @property {Point[]} waypoints
 */

const DEFAULT_STUB_LENGTH = 30;
const DEFAULT_CLEARANCE = 15;

// =============================================================================
// Main entry point
// =============================================================================

/**
 * @param {RouteOptions} options
 * @returns {RouteResult}
 */
export function routeConnector(options) {
  const {
    from,
    to,
    obstacles = [],
    stubLength = DEFAULT_STUB_LENGTH,
    clearance = DEFAULT_CLEARANCE,
  } = options;

  /** @type {Point} */
  const fromPt = { x: from.x, y: from.y };
  /** @type {Point} */
  const toPt = { x: to.x, y: to.y };

  const fromStub = computeStubEnd(from, stubLength);
  const toStub = computeStubEnd(to, stubLength);

  const fromDir = normalizeDirection(from.dx, from.dy);
  const toDir = normalizeDirection(to.dx, to.dy);

  const fromSegments = buildStubSegments(fromPt, fromStub, from.dx, from.dy);
  const toSegments = buildStubSegments(toPt, toStub, to.dx, to.dy);

  const p1 = fromSegments[fromSegments.length - 1];
  const q1 = toSegments[toSegments.length - 1];

  const middle = findBestRoute(p1, fromDir, q1, toDir, obstacles, clearance);

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

/**
 * @param {AnchorPointResult} anchor
 * @param {number} stubLength
 * @returns {Point}
 */
function computeStubEnd(anchor, stubLength) {
  return {
    x: anchor.x + anchor.dx * stubLength,
    y: anchor.y + anchor.dy * stubLength,
  };
}

/**
 * @param {number} dx
 * @param {number} dy
 * @returns {{dx: number, dy: number}}
 */
function normalizeDirection(dx, dy) {
  if (dx !== 0 && dy !== 0) {
    return Math.abs(dx) >= Math.abs(dy)
      ? { dx: Math.sign(dx), dy: 0 }
      : { dx: 0, dy: Math.sign(dy) };
  }
  if (dx !== 0) return { dx: Math.sign(dx), dy: 0 };
  if (dy !== 0) return { dx: 0, dy: Math.sign(dy) };
  return { dx: 1, dy: 0 };
}

/**
 * @param {Point} origin
 * @param {Point} stubEnd
 * @param {number} dx
 * @param {number} dy
 * @returns {Point[]}
 */
function buildStubSegments(origin, stubEnd, dx, dy) {
  const isDiagonal = dx !== 0 && dy !== 0;
  if (!isDiagonal) {
    return [stubEnd];
  }
  // TODO: Diagonal stubs could be optimized to score both horizontal-first
  // and vertical-first variants and pick the shorter overall route.
  /** @type {Point} */
  const midPoint = { x: stubEnd.x, y: origin.y };
  return [midPoint, stubEnd];
}

// =============================================================================
// Segment–Rect intersection
// =============================================================================

/**
 * @param {Point} p1
 * @param {Point} p2
 * @param {Rect} rect
 * @param {number} clearance
 * @returns {boolean}
 */
function segmentIntersectsRect(p1, p2, rect, clearance) {
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

  return maxX > left && minX < right && maxY > top && minY < bottom;
}

/**
 * @param {Point[]} points
 * @param {Rect[]} obstacles
 * @param {number} clearance
 * @returns {boolean}
 */
function polylineIntersectsObstacles(points, obstacles, clearance) {
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
 * @param {Point} p1
 * @param {{dx: number, dy: number}} d1
 * @param {Point} q1
 * @param {{dx: number, dy: number}} d2
 * @param {Rect[]} obstacles
 * @param {number} clearance
 * @returns {Point[]}
 */
function findBestRoute(p1, d1, q1, d2, obstacles, clearance) {
  /** @type {Point[][]} */
  const candidates = [];

  // Direct segment
  candidates.push([]);

  // L-bend variants
  candidates.push([{ x: q1.x, y: p1.y }]);
  candidates.push([{ x: p1.x, y: q1.y }]);

  // Z-bend
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

  const caseType = classifyCase(p1, d1, q1, d2);
  if (caseType === 'backward' || caseType === 'same-direction') {
    const uRoutes = computeURoute(p1, d1, q1, d2, obstacles, clearance);
    candidates.push(uRoutes);
  }

  let bestRoute = /** @type {Point[]} */ ([]);
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

  if (bestDist === Infinity) {
    bestRoute = routeAroundAll(p1, q1, obstacles, clearance);
  }

  return bestRoute;
}

// =============================================================================
// Case classification
// =============================================================================

/**
 * @param {Point} p1
 * @param {{dx: number, dy: number}} d1
 * @param {Point} q1
 * @param {{dx: number, dy: number}} d2
 * @returns {'direct' | 'perpendicular' | 'backward' | 'same-direction'}
 */
function classifyCase(p1, d1, q1, d2) {
  const dot = d1.dx * d2.dx + d1.dy * d2.dy;

  const toTargetX = Math.sign(q1.x - p1.x);
  const toTargetY = Math.sign(q1.y - p1.y);

  // Only check axes where there IS a position difference;
  // when points share an axis (delta=0), that axis is irrelevant for facing
  let facingTarget;
  if (toTargetX === 0 && toTargetY === 0) {
    // Points coincide — treat opposite-facing directions as facing each other
    facingTarget = dot < 0;
  } else {
    facingTarget =
      (toTargetX !== 0 && d1.dx === toTargetX) ||
      (toTargetY !== 0 && d1.dy === toTargetY);
  }

  if (dot < 0 && facingTarget) {
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
 * @param {Point} p1
 * @param {{dx: number, dy: number}} d1
 * @param {Point} q1
 * @param {{dx: number, dy: number}} d2
 * @param {Rect[]} obstacles
 * @param {number} clearance
 * @returns {Point[]}
 */
function computeURoute(p1, d1, q1, d2, obstacles, clearance) {
  const routes = computeAllChannelRoutes(p1, d1, q1, d2, obstacles, clearance);

  let best = /** @type {Point[]} */ ([]);
  let bestDist = Infinity;
  for (const route of routes) {
    const full = [p1, ...route, q1];
    const dist = manhattanLength(full);
    if (dist < bestDist && !polylineIntersectsObstacles(full, obstacles, clearance)) {
      bestDist = dist;
      best = route;
    }
  }

  if (bestDist === Infinity && routes.length > 0) {
    let fallbackDist = Infinity;
    for (const route of routes) {
      const full = [p1, ...route, q1];
      const dist = manhattanLength(full);
      if (dist < fallbackDist) {
        fallbackDist = dist;
        best = route;
      }
    }
  }

  return best;
}

/**
 * @param {Point} p1
 * @param {{dx: number, dy: number}} d1
 * @param {Point} q1
 * @param {{dx: number, dy: number}} _d2
 * @param {Rect[]} obstacles
 * @param {number} clearance
 * @returns {Point[][]}
 */
function computeAllChannelRoutes(p1, d1, q1, _d2, obstacles, clearance) {
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

  /** @type {Point[][]} */
  const routes = [];

  const topY = minY - clearance;
  routes.push(buildChannelRoute(p1, q1, d1, 'y', topY));

  const bottomY = maxY + clearance;
  routes.push(buildChannelRoute(p1, q1, d1, 'y', bottomY));

  const leftX = minX - clearance;
  routes.push(buildChannelRoute(p1, q1, d1, 'x', leftX));

  const rightX = maxX + clearance;
  routes.push(buildChannelRoute(p1, q1, d1, 'x', rightX));

  return routes;
}

/**
 * @param {Point} p1
 * @param {Point} q1
 * @param {{dx: number, dy: number}} _d1
 * @param {'x' | 'y'} channelAxis
 * @param {number} channelValue
 * @returns {Point[]}
 */
function buildChannelRoute(p1, q1, _d1, channelAxis, channelValue) {
  if (channelAxis === 'y') {
    return [
      { x: p1.x, y: channelValue },
      { x: q1.x, y: channelValue },
    ];
  }
  return [
    { x: channelValue, y: p1.y },
    { x: channelValue, y: q1.y },
  ];
}

// =============================================================================
// Fallback: route around all obstacles
// =============================================================================

/**
 * @param {Point} p1
 * @param {Point} q1
 * @param {Rect[]} obstacles
 * @param {number} clearance
 * @returns {Point[]}
 */
function routeAroundAll(p1, q1, obstacles, clearance) {
  if (obstacles.length === 0) {
    return [{ x: q1.x, y: p1.y }];
  }

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

  minX -= clearance;
  minY -= clearance;
  maxX += clearance;
  maxY += clearance;

  /** @type {Point[][]} */
  const candidates = [
    [{ x: p1.x, y: minY }, { x: q1.x, y: minY }],
    [{ x: p1.x, y: maxY }, { x: q1.x, y: maxY }],
    [{ x: minX, y: p1.y }, { x: minX, y: q1.y }],
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

/**
 * @param {Point[]} points
 * @returns {number}
 */
function manhattanLength(points) {
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    total += Math.abs(points[i + 1].x - points[i].x) + Math.abs(points[i + 1].y - points[i].y);
  }
  return total;
}

/**
 * @param {Point[]} points
 * @returns {Point[]}
 */
function deduplicatePoints(points) {
  if (points.length === 0) return [];
  /** @type {Point[]} */
  const result = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const prev = result[result.length - 1];
    if (Math.abs(points[i].x - prev.x) > 0.5 || Math.abs(points[i].y - prev.y) > 0.5) {
      result.push(points[i]);
    }
  }
  return result;
}

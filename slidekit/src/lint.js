// @ts-check
// =============================================================================
// Lint — Static analysis rules for SlideKit scene graphs
// =============================================================================
// Pure read-only analysis; never modifies scene data.

const THRESHOLDS = {
  minFontSize: 18,
  warnFontSize: 24,
  maxFontSize: 120,
  maxLineLength: 80,
  minLineHeightRatio: 1.15,
  minGap: 8,
  alignmentTolerance: 4,
  edgeCrowding: 8,
  contentAreaMin: 0.40,
  maxRootElements: 15,
  imageUpscaleMax: 1.10,
  aspectRatioTolerance: 0.01,
  contrastMin: 3.0,
  titlePositionDrift: 20,
  maxFontFamilies: 3,
};

const CANVAS = { x: 0, y: 0, w: 1920, h: 1080 };
const SAFE_ZONE = { x: 120, y: 90, w: 1680, h: 900 };

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}

function rectIntersection(a, b) {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.w, b.x + b.w);
  const y2 = Math.min(a.y + a.h, b.y + b.h);
  if (x2 <= x || y2 <= y) return null;
  return { x, y, w: x2 - x, h: y2 - y };
}

/** Walk parentId chain to determine if `ancestorId` is an ancestor of `elementId`. */
function isAncestor(elements, elementId, ancestorId) {
  let current = elements[elementId];
  while (current && current.parentId) {
    if (current.parentId === ancestorId) return true;
    current = elements[current.parentId];
  }
  return false;
}

function boundsOf(el) {
  const r = el.resolved;
  return r ? { x: r.x, y: r.y, w: r.w, h: r.h } : null;
}

// ---------------------------------------------------------------------------
// Rule implementations
// ---------------------------------------------------------------------------

function ruleChildOverflow(elements) {
  const findings = [];
  for (const el of Object.values(elements)) {
    if (!el.parentId || el._internal) continue;
    const parent = elements[el.parentId];
    if (!parent) continue;
    const cb = boundsOf(el);
    const pb = boundsOf(parent);
    if (!cb || !pb) continue;

    const edges = [
      { edge: 'left',   overshoot: pb.x - cb.x },
      { edge: 'top',    overshoot: pb.y - cb.y },
      { edge: 'right',  overshoot: (cb.x + cb.w) - (pb.x + pb.w) },
      { edge: 'bottom', overshoot: (cb.y + cb.h) - (pb.y + pb.h) },
    ];

    for (const { edge, overshoot } of edges) {
      if (overshoot > 0.5) {
        const dim = (edge === 'left' || edge === 'right') ? 'width' : 'height';
        const parentDim = (dim === 'width') ? pb.w : pb.h;
        findings.push({
          rule: 'child-overflow',
          severity: 'error',
          elementId: el.id,
          message: `Child "${el.id}" overflows parent "${el.parentId}" on ${edge} by ${overshoot}px`,
          detail: { edge, overshoot },
          bounds: cb,
          parentBounds: pb,
          suggestion: `Reduce child ${dim} or increase parent ${dim} to ${parentDim + overshoot}`,
        });
      }
    }
  }
  return findings;
}

function ruleNonAncestorOverlap(elements) {
  const findings = [];
  const els = Object.values(elements).filter(e => !e._internal);
  const withSize = els.filter(e => {
    const b = boundsOf(e);
    return b && b.w > 0 && b.h > 0;
  });

  const seen = new Set();
  for (let i = 0; i < withSize.length; i++) {
    for (let j = i + 1; j < withSize.length; j++) {
      const a = withSize[i];
      const b = withSize[j];
      // Skip elements on different layers — they intentionally stack
      const layerA = (a.authored && a.authored.props && a.authored.props.layer) || 'content';
      const layerB = (b.authored && b.authored.props && b.authored.props.layer) || 'content';
      if (layerA !== layerB) continue;

      if (isAncestor(elements, a.id, b.id) || isAncestor(elements, b.id, a.id)) continue;

      const ba = boundsOf(a);
      const bb = boundsOf(b);
      if (!rectsOverlap(ba, bb)) continue;

      const key = [a.id, b.id].sort().join('|');
      if (seen.has(key)) continue;
      seen.add(key);

      const overlap = rectIntersection(ba, bb);
      const overlapArea = overlap ? overlap.w * overlap.h : 0;

      findings.push({
        rule: 'non-ancestor-overlap',
        severity: 'error',
        elementId: a.id,
        message: `"${a.id}" overlaps with "${b.id}" by ${overlapArea}px²`,
        detail: { elementA: a.id, elementB: b.id, overlapArea, overlapRect: overlap },
        bounds: ba,
        parentBounds: null,
        suggestion: `Move ${a.id} to avoid ${overlapArea}px overlap with ${b.id}`,
      });
    }
  }
  return findings;
}

function ruleCanvasOverflow(elements) {
  const findings = [];
  for (const el of Object.values(elements)) {
    if (el._internal) continue;
    if (el.authored && el.authored.props && el.authored.props.layer === 'bg') continue;
    const b = boundsOf(el);
    if (!b) continue;

    const edges = [
      { edge: 'left',   overshoot: CANVAS.x - b.x },
      { edge: 'top',    overshoot: CANVAS.y - b.y },
      { edge: 'right',  overshoot: (b.x + b.w) - (CANVAS.x + CANVAS.w) },
      { edge: 'bottom', overshoot: (b.y + b.h) - (CANVAS.y + CANVAS.h) },
    ];

    for (const { edge, overshoot } of edges) {
      if (overshoot > 0.5) {
        findings.push({
          rule: 'canvas-overflow',
          severity: 'error',
          elementId: el.id,
          message: `"${el.id}" extends beyond canvas on ${edge} by ${overshoot}px`,
          detail: { edge, overshoot },
          bounds: b,
          parentBounds: null,
          suggestion: `Move element inward by ${overshoot}px`,
        });
      }
    }
  }
  return findings;
}

function ruleSafeZoneViolation(elements) {
  const findings = [];
  for (const el of Object.values(elements)) {
    if (el._internal) continue;
    if (el.parentId !== null) continue;
    if (el.authored && el.authored.props && el.authored.props.layer === 'bg') continue;
    const b = boundsOf(el);
    if (!b) continue;

    const edges = [
      { edge: 'left',   overshoot: SAFE_ZONE.x - b.x },
      { edge: 'top',    overshoot: SAFE_ZONE.y - b.y },
      { edge: 'right',  overshoot: (b.x + b.w) - (SAFE_ZONE.x + SAFE_ZONE.w) },
      { edge: 'bottom', overshoot: (b.y + b.h) - (SAFE_ZONE.y + SAFE_ZONE.h) },
    ];

    for (const { edge, overshoot } of edges) {
      if (overshoot > 0.5) {
        findings.push({
          rule: 'safe-zone-violation',
          severity: 'warning',
          elementId: el.id,
          message: `"${el.id}" extends outside safe zone on ${edge} by ${overshoot}px`,
          detail: { edge, overshoot, safeRect: { ...SAFE_ZONE } },
          bounds: b,
          parentBounds: null,
          suggestion: `Move element ${overshoot}px inward from ${edge}`,
        });
      }
    }
  }
  return findings;
}

function ruleZeroSize(elements) {
  const findings = [];
  for (const el of Object.values(elements)) {
    if (el._internal) continue;
    if (el.type === 'connector') continue;
    const b = boundsOf(el);
    if (!b) continue;
    if (b.w <= 0 || b.h <= 0) {
      findings.push({
        rule: 'zero-size',
        severity: 'error',
        elementId: el.id,
        message: `"${el.id}" has zero or negative size (${b.w}×${b.h})`,
        detail: { w: b.w, h: b.h },
        bounds: b,
        parentBounds: null,
        suggestion: 'Set explicit width/height for element',
      });
    }
  }
  return findings;
}

// TODO: Rule 6 (orphaned-element) — requires z-order information to detect
// fully occluded elements. Will be implemented when z-order data is available
// in the scene model.

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Lint a single slide.
 * @param {{ id: string, layout: { elements: Object, warnings: any[], errors: any[], collisions: any[] } }} slideData
 * @returns {Array} Array of finding objects
 */
export function lintSlide(slideData) {
  const elements = slideData.layout.elements;
  if (!elements || typeof elements !== 'object') return [];

  return [
    ...ruleChildOverflow(elements),
    ...ruleNonAncestorOverlap(elements),
    ...ruleCanvasOverflow(elements),
    ...ruleSafeZoneViolation(elements),
    ...ruleZeroSize(elements),
  ];
}

/**
 * Lint an entire deck.
 * @param {{ slides: Array<{ id: string, layout: Object }> }} skData — the window.sk object
 * @returns {Array} Array of finding objects (with slideId added)
 */
export function lintDeck(skData) {
  const findings = [];
  for (const slide of skData.slides) {
    const slideFindings = lintSlide(slide);
    for (const f of slideFindings) {
      findings.push({ ...f, slideId: slide.id });
    }
  }
  return findings;
}

// =============================================================================
// Lint — Static analysis rules for SlideKit scene graphs
// =============================================================================
// Pure read-only analysis; never modifies scene data.

import type { Rect, SceneElement } from './types.js';

// ---------------------------------------------------------------------------
// Lint-specific interfaces
// ---------------------------------------------------------------------------

export interface LintFinding {
  rule: string;
  severity: 'error' | 'warning' | 'info';
  elementId: string | null;
  message: string;
  detail: Record<string, unknown>;
  bounds?: Rect | null;
  parentBounds?: Rect | null;
  suggestion: string;
  slideId?: string;
}

export interface LintSlideData {
  id: string;
  layout: {
    elements: Record<string, SceneElement>;
    warnings: Array<Record<string, unknown>>;
    errors: Array<Record<string, unknown>>;
    collisions: Array<Record<string, unknown>>;
  };
}

export interface LintDeckData {
  slides: LintSlideData[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

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
  marginRatioMax: 0.25,
} as const;

const CANVAS: Rect = { x: 0, y: 0, w: 1920, h: 1080 };
const SAFE_ZONE: Rect = { x: 120, y: 90, w: 1680, h: 900 };

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}

function rectIntersection(a: Rect, b: Rect): Rect | null {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.w, b.x + b.w);
  const y2 = Math.min(a.y + a.h, b.y + b.h);
  if (x2 <= x || y2 <= y) return null;
  return { x, y, w: x2 - x, h: y2 - y };
}

/** Walk parentId chain to determine if `ancestorId` is an ancestor of `elementId`. */
function isAncestor(elements: Record<string, SceneElement>, elementId: string, ancestorId: string): boolean {
  const visited = new Set<string>();
  let current = elements[elementId];
  while (current && current.parentId) {
    if (visited.has(current.id)) return false;
    visited.add(current.id);
    if (current.parentId === ancestorId) return true;
    current = elements[current.parentId];
  }
  return false;
}

/** Return local bounds (relative to parent) for parent–child comparisons. */
function localBoundsOf(el: SceneElement): Rect | null {
  const r = el.resolved;
  return r ? { x: r.x, y: r.y, w: r.w, h: r.h } : null;
}

/**
 * Return absolute bounds by walking the parentId chain and summing offsets.
 * resolved coords are local (relative to parent); this converts to canvas-absolute.
 */
function absoluteBoundsOf(el: SceneElement, elements: Record<string, SceneElement>): Rect | null {
  const r = el.resolved;
  if (!r) return null;
  let absX = r.x;
  let absY = r.y;
  const visited = new Set<string>();
  let cur = el;
  while (cur.parentId) {
    if (visited.has(cur.id)) return null; // cycle — can't resolve
    visited.add(cur.id);
    const parent = elements[cur.parentId];
    if (!parent?.resolved) return null; // broken chain — can't resolve
    absX += parent.resolved.x;
    absY += parent.resolved.y;
    cur = parent;
  }
  return { x: absX, y: absY, w: r.w, h: r.h };
}

function normLayer(el: SceneElement): 'bg' | 'content' | 'overlay' {
  const layer = el?.authored?.props?.layer;
  return (layer === 'bg' || layer === 'overlay' || layer === 'content') ? layer : 'content';
}

// ---------------------------------------------------------------------------
// Rule implementations
// ---------------------------------------------------------------------------

function ruleChildOverflow(elements: Record<string, SceneElement>): LintFinding[] {
  const findings: LintFinding[] = [];
  for (const el of Object.values(elements)) {
    if (!el.parentId || el._internal) continue;
    const parent = elements[el.parentId];
    if (!parent) continue;
    const cb = localBoundsOf(el);
    const pr = parent.resolved;
    if (!cb || !pr) continue;
    // Parent's local extent is (0, 0, w, h); child coords are relative to parent
    const pb: Rect = { x: 0, y: 0, w: pr.w, h: pr.h };

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

function ruleNonAncestorOverlap(elements: Record<string, SceneElement>): LintFinding[] {
  const findings: LintFinding[] = [];
  const els = Object.values(elements).filter(e => !e._internal);

  // Cache absolute bounds to avoid repeated parent-chain walks (O(n²) pairs)
  const absCache = new Map<string, Rect | null>();
  function cachedAbsBounds(e: SceneElement): Rect | null {
    if (!absCache.has(e.id)) absCache.set(e.id, absoluteBoundsOf(e, elements));
    return absCache.get(e.id)!;
  }

  const withSize = els.filter(e => {
    const b = cachedAbsBounds(e);
    return b && b.w > 0 && b.h > 0;
  });

  const seen = new Set<string>();
  for (let i = 0; i < withSize.length; i++) {
    for (let j = i + 1; j < withSize.length; j++) {
      const a = withSize[i];
      const b = withSize[j];
      // Skip elements on different layers — they intentionally stack
      const layerA = normLayer(a);
      const layerB = normLayer(b);
      if (layerA !== layerB) continue;

      if (isAncestor(elements, a.id, b.id) || isAncestor(elements, b.id, a.id)) continue;

      const ba = cachedAbsBounds(a)!;
      const bb = cachedAbsBounds(b)!;
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

function ruleCanvasOverflow(elements: Record<string, SceneElement>): LintFinding[] {
  const findings: LintFinding[] = [];
  for (const el of Object.values(elements)) {
    if (el._internal) continue;
    if (normLayer(el) === 'bg') continue;
    const b = absoluteBoundsOf(el, elements);
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

function ruleSafeZoneViolation(elements: Record<string, SceneElement>): LintFinding[] {
  const findings: LintFinding[] = [];
  for (const el of Object.values(elements)) {
    if (el._internal) continue;
    if (el.parentId != null) continue;
    if (normLayer(el) === 'bg') continue;
    const b = absoluteBoundsOf(el, elements);
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

function ruleZeroSize(elements: Record<string, SceneElement>): LintFinding[] {
  const findings: LintFinding[] = [];
  for (const el of Object.values(elements)) {
    if (el._internal) continue;
    if (el.type === 'connector') continue;
    const b = localBoundsOf(el);
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
// Spacing, alignment & content distribution rules (13–18)
// ---------------------------------------------------------------------------

/** Collect sibling groups: root-level elements and children sharing a parentId. */
function siblingGroups(elements: Record<string, SceneElement>): Map<string, SceneElement[]> {
  const groups = new Map<string, SceneElement[]>();
  for (const el of Object.values(elements)) {
    if (el._internal) continue;
    if (normLayer(el) === 'bg') continue;
    const b = localBoundsOf(el);
    if (!b || b.w <= 0 || b.h <= 0) continue;
    const key = el.parentId ?? '__root__';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(el);
  }
  return groups;
}

/** Minimum gap between two axis-aligned rects (0 if overlapping/touching). */
function rectGap(a: Rect, b: Rect): { gap: number; axis: string } {
  const overlapX = a.x < b.x + b.w && a.x + a.w > b.x;
  const overlapY = a.y < b.y + b.h && a.y + a.h > b.y;

  const hGap = Math.max(0, Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w)));
  const vGap = Math.max(0, Math.max(b.y - (a.y + a.h), a.y - (b.y + b.h)));

  if (hGap > 0 && overlapY) return { gap: hGap, axis: 'horizontal' };
  if (vGap > 0 && overlapX) return { gap: vGap, axis: 'vertical' };
  return { gap: 0, axis: 'none' };
}

function ruleGapTooSmall(elements: Record<string, SceneElement>): LintFinding[] {
  const findings: LintFinding[] = [];
  for (const siblings of siblingGroups(elements).values()) {
    for (let i = 0; i < siblings.length; i++) {
      for (let j = i + 1; j < siblings.length; j++) {
        const a = siblings[i], b = siblings[j];
        const ba = localBoundsOf(a)!, bb = localBoundsOf(b)!;
        const { gap, axis } = rectGap(ba, bb);
        if (gap > 0 && gap < THRESHOLDS.minGap) {
          findings.push({
            rule: 'gap-too-small',
            severity: 'warning',
            elementId: a.id,
            message: `Gap between "${a.id}" and "${b.id}" is only ${gap}px`,
            detail: { elementA: a.id, elementB: b.id, gap, axis },
            suggestion: `Increase gap between elements to at least ${THRESHOLDS.minGap}px`,
          });
        }
      }
    }
  }
  return findings;
}

function ruleNearMisalignment(elements: Record<string, SceneElement>): LintFinding[] {
  const findings: LintFinding[] = [];
  const EXACT = 0.5;
  for (const siblings of siblingGroups(elements).values()) {
    for (let i = 0; i < siblings.length; i++) {
      for (let j = i + 1; j < siblings.length; j++) {
        const a = siblings[i], b = siblings[j];
        const ba = localBoundsOf(a)!, bb = localBoundsOf(b)!;
        const overlapX = ba.x < bb.x + bb.w && ba.x + ba.w > bb.x;
        const overlapY = ba.y < bb.y + bb.h && ba.y + ba.h > bb.y;
        const edges: Array<{ type: string; vA: number; vB: number }> = [];
        if (overlapY) {
          edges.push(
            { type: 'left',   vA: ba.x, vB: bb.x },
            { type: 'right',  vA: ba.x + ba.w, vB: bb.x + bb.w },
            { type: 'center-x', vA: ba.x + ba.w / 2, vB: bb.x + bb.w / 2 },
          );
        }
        if (overlapX) {
          edges.push(
            { type: 'top',    vA: ba.y, vB: bb.y },
            { type: 'bottom', vA: ba.y + ba.h, vB: bb.y + bb.h },
            { type: 'center-y', vA: ba.y + ba.h / 2, vB: bb.y + bb.h / 2 },
          );
        }
        let best: { edgeType: string; valueA: number; valueB: number; drift: number } | null = null;
        for (const { type, vA, vB } of edges) {
          const drift = Math.abs(vA - vB);
          if (drift > EXACT && drift <= THRESHOLDS.alignmentTolerance) {
            if (!best || drift < best.drift) {
              best = { edgeType: type, valueA: vA, valueB: vB, drift };
            }
          }
        }
        if (best) {
          findings.push({
            rule: 'near-misalignment',
            severity: 'info',
            elementId: a.id,
            message: `"${a.id}" and "${b.id}" are nearly aligned on ${best.edgeType} (drift: ${best.drift}px)`,
            detail: { elementA: a.id, elementB: b.id, ...best },
            suggestion: `Align ${best.edgeType} of ${a.id} with ${b.id} (drift: ${best.drift}px)`,
          });
        }
      }
    }
  }
  return findings;
}

function ruleEdgeCrowding(elements: Record<string, SceneElement>): LintFinding[] {
  const findings: LintFinding[] = [];
  const sz = SAFE_ZONE;
  for (const el of Object.values(elements)) {
    if (el._internal) continue;
    if (el.parentId != null) continue;
    if (normLayer(el) === 'bg') continue;
    const b = localBoundsOf(el);
    if (!b || b.w <= 0 || b.h <= 0) continue;

    const checks = [
      { edge: 'left',   distance: b.x - sz.x },
      { edge: 'top',    distance: b.y - sz.y },
      { edge: 'right',  distance: (sz.x + sz.w) - (b.x + b.w) },
      { edge: 'bottom', distance: (sz.y + sz.h) - (b.y + b.h) },
    ];
    for (const { edge, distance } of checks) {
      if (distance > 0 && distance < THRESHOLDS.edgeCrowding) {
        findings.push({
          rule: 'edge-crowding',
          severity: 'info',
          elementId: el.id,
          message: `"${el.id}" is only ${distance}px from safe zone ${edge}`,
          detail: { edge, distance, needed: THRESHOLDS.edgeCrowding - distance, threshold: THRESHOLDS.edgeCrowding },
          suggestion: `Move element ${THRESHOLDS.edgeCrowding - distance}px away from safe zone ${edge}`,
        });
      }
    }
  }
  return findings;
}

function ruleContentClustering(elements: Record<string, SceneElement>): LintFinding[] {
  const findings: LintFinding[] = [];
  const roots = Object.values(elements).filter(el =>
    !el._internal && el.parentId == null && normLayer(el) !== 'bg'
  );
  const withBounds = roots.map(el => localBoundsOf(el)).filter((b): b is Rect => b != null && b.w > 0 && b.h > 0);
  if (withBounds.length === 0) return findings;

  let covered = 0;
  for (const b of withBounds) covered += b.w * b.h;
  const safeZoneArea = SAFE_ZONE.w * SAFE_ZONE.h;
  const usageRatio = covered / safeZoneArea;

  if (usageRatio < THRESHOLDS.contentAreaMin) {
    findings.push({
      rule: 'content-clustering',
      severity: 'warning',
      elementId: 'slide',
      message: `Content uses only ${(usageRatio * 100).toFixed(0)}% of the safe zone`,
      detail: { usageRatio, covered, safeZoneArea },
      suggestion: `Content uses only ${(usageRatio * 100).toFixed(0)}% of the safe zone — consider using more of the available space`,
    });
  }
  return findings;
}

function ruleLopsidedLayout(elements: Record<string, SceneElement>): LintFinding[] {
  const findings: LintFinding[] = [];
  const roots = Object.values(elements).filter(el =>
    !el._internal && el.parentId == null && normLayer(el) !== 'bg'
  );
  const withBounds = roots.map(el => localBoundsOf(el)).filter((b): b is Rect => b != null && b.w > 0 && b.h > 0);
  if (withBounds.length === 0) return findings;

  let sumX = 0, sumY = 0, sumWeight = 0;
  for (const b of withBounds) {
    const weight = b.w * b.h;
    sumX += (b.x + b.w / 2) * weight;
    sumY += (b.y + b.h / 2) * weight;
    sumWeight += weight;
  }
  if (sumWeight === 0) return findings;
  const centroid = { x: sumX / sumWeight, y: sumY / sumWeight };
  const slideCenter = { x: 960, y: 540 };
  const drift = { x: centroid.x - slideCenter.x, y: centroid.y - slideCenter.y };

  if (Math.abs(drift.x) > 200 || Math.abs(drift.y) > 200) {
    const dirs: string[] = [];
    if (drift.y < -200) dirs.push('upward');
    if (drift.y > 200) dirs.push('downward');
    if (drift.x < -200) dirs.push('left');
    if (drift.x > 200) dirs.push('right');
    findings.push({
      rule: 'lopsided-layout',
      severity: 'info',
      elementId: 'slide',
      message: `Content centroid is shifted ${dirs.join(' and ')} from slide center`,
      detail: { centroid, slideCenter, drift },
      suggestion: `Content is shifted ${dirs.join(' and ')} — consider recentering`,
    });
  }
  return findings;
}

function ruleTooManyElements(elements: Record<string, SceneElement>): LintFinding[] {
  const findings: LintFinding[] = [];
  const count = Object.values(elements).filter(el =>
    !el._internal && el.parentId == null && normLayer(el) !== 'bg'
  ).length;
  if (count > THRESHOLDS.maxRootElements) {
    findings.push({
      rule: 'too-many-elements',
      severity: 'info',
      elementId: 'slide',
      message: `Slide has ${count} root elements (guideline: ${THRESHOLDS.maxRootElements})`,
      detail: { count, threshold: THRESHOLDS.maxRootElements },
      suggestion: `Consider simplifying slide — ${count} root elements exceeds guideline of ${THRESHOLDS.maxRootElements}`,
    });
  }
  return findings;
}

function ruleContentUnderutilized(elements: Record<string, SceneElement>): LintFinding[] {
  const findings: LintFinding[] = [];
  const roots = Object.values(elements).filter(el =>
    !el._internal && el.parentId == null && normLayer(el) !== 'bg'
  );
  const withBounds = roots.map(el => localBoundsOf(el)).filter((b): b is Rect => b != null && b.w > 0 && b.h > 0);
  if (withBounds.length === 0) return findings;

  const contentBounds: Rect = {
    x: Math.min(...withBounds.map(b => b.x)),
    y: Math.min(...withBounds.map(b => b.y)),
    w: 0,
    h: 0,
  };
  contentBounds.w = Math.max(...withBounds.map(b => b.x + b.w)) - contentBounds.x;
  contentBounds.h = Math.max(...withBounds.map(b => b.y + b.h)) - contentBounds.y;

  const leftMargin = contentBounds.x - SAFE_ZONE.x;
  const rightMargin = (SAFE_ZONE.x + SAFE_ZONE.w) - (contentBounds.x + contentBounds.w);
  const topMargin = contentBounds.y - SAFE_ZONE.y;
  const bottomMargin = (SAFE_ZONE.y + SAFE_ZONE.h) - (contentBounds.y + contentBounds.h);

  const hThreshold = SAFE_ZONE.w * THRESHOLDS.marginRatioMax;
  const vThreshold = SAFE_ZONE.h * THRESHOLDS.marginRatioMax;

  const narrowH = leftMargin > hThreshold && rightMargin > hThreshold;
  const narrowV = topMargin > vThreshold && bottomMargin > vThreshold;

  if (!narrowH && !narrowV) return findings;

  const underutilized = narrowH && narrowV ? 'both' : narrowH ? 'horizontal' : 'vertical';
  const margins = { left: leftMargin, right: rightMargin, top: topMargin, bottom: bottomMargin };

  let message: string, suggestion: string;
  if (underutilized === 'both') {
    message = 'Content is small — large margins on all sides';
    suggestion = 'Enlarge content elements or reduce margins on all sides';
  } else if (underutilized === 'horizontal') {
    message = 'Content is narrow — consider using more horizontal space';
    suggestion = 'Widen content elements or reduce horizontal margins';
  } else {
    message = 'Content is short — consider using more vertical space';
    suggestion = 'Increase content height or reduce vertical margins';
  }

  findings.push({
    rule: 'content-underutilized',
    severity: 'info',
    elementId: 'slide',
    message,
    detail: { contentBounds, margins, underutilized, safeZone: SAFE_ZONE },
    suggestion,
  });
  return findings;
}

// ---------------------------------------------------------------------------
// DOM helpers
// ---------------------------------------------------------------------------

function findSkTextElements(slideEl: HTMLElement): Element[] {
  if (!slideEl) return [];
  return Array.from(slideEl.querySelectorAll('[data-sk-type="el"][data-sk-id]'));
}

// ---------------------------------------------------------------------------
// DOM-based rule implementations (Rules 7–12)
// ---------------------------------------------------------------------------

function ruleTextOverflow(slideEl: HTMLElement | null): LintFinding[] {
  const findings: LintFinding[] = [];
  if (!slideEl) return findings;
  const els = slideEl.querySelectorAll('[data-sk-type="el"]');
  for (const el of els) {
    const overflowY = el.scrollHeight > el.clientHeight + 1;
    const overflowX = el.scrollWidth > el.clientWidth + 1;
    if (overflowY || overflowX) {
      findings.push({
        rule: 'text-overflow',
        severity: 'error',
        elementId: el.getAttribute('data-sk-id'),
        message: `Element "${el.getAttribute('data-sk-id')}" has content overflow`,
        detail: {
          scrollHeight: el.scrollHeight,
          clientHeight: el.clientHeight,
          scrollWidth: el.scrollWidth,
          clientWidth: el.clientWidth,
          overflowY,
          overflowX,
        },
        suggestion: 'Reduce content or increase element height/width',
      });
    }
  }
  return findings;
}

function ruleFontTooSmall(slideEl: HTMLElement | null): LintFinding[] {
  const findings: LintFinding[] = [];
  for (const el of findSkTextElements(slideEl!)) {
    if (!el.textContent || !el.textContent.trim()) continue;
    const fontSize = parseFloat(getComputedStyle(el).fontSize);
    if (fontSize < THRESHOLDS.minFontSize) {
      findings.push({
        rule: 'font-too-small',
        severity: 'warning',
        elementId: el.getAttribute('data-sk-id'),
        message: `Font size ${fontSize}px is below minimum ${THRESHOLDS.minFontSize}px`,
        detail: { fontSize, threshold: THRESHOLDS.minFontSize },
        suggestion: `Increase font size to at least ${THRESHOLDS.minFontSize}px`,
      });
    }
  }
  return findings;
}

function ruleFontTooLarge(slideEl: HTMLElement | null): LintFinding[] {
  const findings: LintFinding[] = [];
  for (const el of findSkTextElements(slideEl!)) {
    if (!el.textContent || !el.textContent.trim()) continue;
    const fontSize = parseFloat(getComputedStyle(el).fontSize);
    if (fontSize > THRESHOLDS.maxFontSize) {
      findings.push({
        rule: 'font-too-large',
        severity: 'info',
        elementId: el.getAttribute('data-sk-id'),
        message: `Font size ${fontSize}px exceeds maximum ${THRESHOLDS.maxFontSize}px`,
        detail: { fontSize, threshold: THRESHOLDS.maxFontSize },
        suggestion: `Decrease font size to at most ${THRESHOLDS.maxFontSize}px`,
      });
    }
  }
  return findings;
}

function ruleLineTooLong(slideEl: HTMLElement | null): LintFinding[] {
  const findings: LintFinding[] = [];
  for (const el of findSkTextElements(slideEl!)) {
    if (!el.textContent || !el.textContent.trim()) continue;
    const fontSize = parseFloat(getComputedStyle(el).fontSize);
    const elementWidth = (el as HTMLElement).clientWidth;
    const estimatedCharsPerLine = elementWidth / (fontSize * 0.6);
    if (estimatedCharsPerLine > THRESHOLDS.maxLineLength) {
      findings.push({
        rule: 'line-too-long',
        severity: 'info',
        elementId: el.getAttribute('data-sk-id'),
        message: `Estimated ${Math.round(estimatedCharsPerLine)} chars/line exceeds ${THRESHOLDS.maxLineLength}`,
        detail: { estimatedCharsPerLine: Math.round(estimatedCharsPerLine), threshold: THRESHOLDS.maxLineLength, elementWidth },
        suggestion: 'Reduce element width or increase font size',
      });
    }
  }
  return findings;
}

function ruleLineHeightTight(slideEl: HTMLElement | null): LintFinding[] {
  const findings: LintFinding[] = [];
  for (const el of findSkTextElements(slideEl!)) {
    if (!el.textContent || !el.textContent.trim()) continue;
    const style = getComputedStyle(el);
    const lineHeight = style.lineHeight;
    if (lineHeight === 'normal') continue;
    const fontSize = parseFloat(style.fontSize);
    const lhNum = parseFloat(lineHeight);
    // Detect unitless values (e.g., "1.2" vs "24px")
    const isPixels = lineHeight.endsWith('px');
    const lhPx = isPixels ? lhNum : lhNum * fontSize;
    const ratio = lhPx / fontSize;
    if (ratio < THRESHOLDS.minLineHeightRatio) {
      findings.push({
        rule: 'line-height-tight',
        severity: 'warning',
        elementId: el.getAttribute('data-sk-id'),
        message: `Line-height ratio ${ratio.toFixed(2)} is below minimum ${THRESHOLDS.minLineHeightRatio}`,
        detail: { lineHeight, fontSize, ratio, threshold: THRESHOLDS.minLineHeightRatio },
        suggestion: `Increase line-height to at least ${(fontSize * THRESHOLDS.minLineHeightRatio).toFixed(0)}px`,
      });
    }
  }
  return findings;
}



// ---------------------------------------------------------------------------
// Color helpers (for contrast checking)
// ---------------------------------------------------------------------------

interface RGBColor {
  r: number;
  g: number;
  b: number;
}

function parseColor(str: string): RGBColor | null {
  if (!str || str === 'transparent') return null;
  const m = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!m) return null;
  const a = m[4] !== undefined ? parseFloat(m[4]) : 1;
  if (a < 0.1) return null;
  return { r: parseInt(m[1]) / 255, g: parseInt(m[2]) / 255, b: parseInt(m[3]) / 255 };
}

function relativeLuminance(c: RGBColor): number {
  const sRGB = [c.r, c.g, c.b].map(v =>
    v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
}

function contrastRatio(c1: RGBColor, c2: RGBColor): number {
  const l1 = relativeLuminance(c1);
  const l2 = relativeLuminance(c2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ---------------------------------------------------------------------------
// Image & Visual Hierarchy rules (Rules 19–22)
// ---------------------------------------------------------------------------

function ruleImageUpscaled(slideEl: HTMLElement | null): LintFinding[] {
  const findings: LintFinding[] = [];
  if (!slideEl) return findings;
  const imgs = slideEl.querySelectorAll('img');
  for (const img of imgs) {
    if (img.naturalWidth === 0) continue;
    const rw = img.clientWidth;
    const rh = img.clientHeight;
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    const scaleX = rw / nw;
    const scaleY = rh / nh;
    if (rw > nw * THRESHOLDS.imageUpscaleMax || rh > nh * THRESHOLDS.imageUpscaleMax) {
      const maxScale = Math.max(scaleX, scaleY);
      const pct = Math.round((maxScale - 1) * 100);
      const ancestor = img.closest('[data-sk-id]');
      findings.push({
        rule: 'image-upscaled',
        severity: 'warning',
        elementId: ancestor ? ancestor.getAttribute('data-sk-id') : null,
        message: `Image is upscaled ${pct}% beyond natural size`,
        detail: { renderedWidth: rw, renderedHeight: rh, naturalWidth: nw, naturalHeight: nh, scaleX, scaleY },
        suggestion: `Image is upscaled ${pct}% beyond natural size — use a higher resolution source`,
      });
    }
  }
  return findings;
}

function ruleAspectRatioDistortion(slideEl: HTMLElement | null): LintFinding[] {
  const findings: LintFinding[] = [];
  if (!slideEl) return findings;
  const imgs = slideEl.querySelectorAll('img');
  for (const img of imgs) {
    if (img.naturalWidth === 0 || img.naturalHeight === 0) continue;
    const naturalRatio = img.naturalWidth / img.naturalHeight;
    const renderedRatio = img.clientWidth / img.clientHeight;
    const distortion = Math.abs(renderedRatio - naturalRatio) / naturalRatio;
    if (distortion > THRESHOLDS.aspectRatioTolerance) {
      const ancestor = img.closest('[data-sk-id]');
      findings.push({
        rule: 'aspect-ratio-distortion',
        severity: 'warning',
        elementId: ancestor ? ancestor.getAttribute('data-sk-id') : null,
        message: `Image aspect ratio distorted by ${(distortion * 100).toFixed(1)}%`,
        detail: { naturalRatio, renderedRatio, distortion },
        suggestion: 'Image aspect ratio distorted — use object-fit: contain or adjust container',
      });
    }
  }
  return findings;
}

function ruleHeadingSizeInversion(slideEl: HTMLElement | null): LintFinding[] {
  const findings: LintFinding[] = [];
  if (!slideEl) return findings;
  const headings = slideEl.querySelectorAll('h1, h2, h3, h4, h5, h6');
  if (headings.length === 0) return findings;

  // Group by heading level, track max font-size per level
  const levelSizes = new Map<number, number>();
  for (const h of headings) {
    const level = parseInt(h.tagName[1]);
    const fontSize = parseFloat(getComputedStyle(h).fontSize);
    if (!levelSizes.has(level) || fontSize > levelSizes.get(level)!) {
      levelSizes.set(level, fontSize);
    }
  }

  const levels = Array.from(levelSizes.keys()).sort((a, b) => a - b);
  for (let i = 0; i < levels.length - 1; i++) {
    const higher = levels[i]; // e.g. h2 (smaller number = higher rank)
    const lower = levels[i + 1]; // e.g. h3
    const higherSize = levelSizes.get(higher)!;
    const lowerSize = levelSizes.get(lower)!;
    if (higherSize < lowerSize) {
      findings.push({
        rule: 'heading-size-inversion',
        severity: 'warning',
        elementId: null,
        message: `h${higher} (${higherSize}px) should be larger than h${lower} (${lowerSize}px)`,
        detail: { largerHeading: `h${higher}`, largerSize: higherSize, smallerHeading: `h${lower}`, smallerSize: lowerSize },
        suggestion: `h${higher} (${higherSize}px) should be larger than h${lower} (${lowerSize}px)`,
      });
    }
  }
  return findings;
}

function ruleLowContrast(slideEl: HTMLElement | null): LintFinding[] {
  const findings: LintFinding[] = [];
  if (!slideEl) return findings;
  const els = slideEl.querySelectorAll('*');
  for (const el of els) {
    if (!el.textContent || !el.textContent.trim()) continue;
    // Only check leaf text nodes — skip containers whose text comes from children
    if (el.children.length > 0) {
      let hasDirectText = false;
      for (const node of el.childNodes) {
        if (node.nodeType === 3 && node.textContent!.trim()) { hasDirectText = true; break; }
      }
      if (!hasDirectText) continue;
    }

    const style = getComputedStyle(el);
    const textColor = parseColor(style.color);
    if (!textColor) continue;

    // Walk up to find actual background
    let bgColor: RGBColor | null = null;
    let current: Element | null = el;
    while (current && current !== document.documentElement) {
      bgColor = parseColor(getComputedStyle(current).backgroundColor);
      if (bgColor) break;
      current = current.parentElement;
    }
    if (!bgColor) continue;

    const ratio = contrastRatio(textColor, bgColor);
    if (ratio < THRESHOLDS.contrastMin) {
      const ancestor = el.closest('[data-sk-id]');
      findings.push({
        rule: 'low-contrast',
        severity: 'warning',
        elementId: ancestor ? ancestor.getAttribute('data-sk-id') : null,
        message: `Low contrast ratio ${ratio.toFixed(2)}:1 (minimum: ${THRESHOLDS.contrastMin}:1)`,
        detail: { textColor: style.color, bgColor: getComputedStyle(current!).backgroundColor, contrastRatio: ratio, threshold: THRESHOLDS.contrastMin },
        suggestion: `Increase contrast between text and background (current: ${ratio.toFixed(2)}:1, minimum: ${THRESHOLDS.contrastMin}:1)`,
      });
    }
  }
  return findings;
}

// ---------------------------------------------------------------------------
// Cross-slide consistency rules (23–25) — deck-level only
// ---------------------------------------------------------------------------

function ruleTitlePositionDrift(slides: LintSlideData[]): LintFinding[] {
  const findings: LintFinding[] = [];
  const positions: Array<{ slideId: string; x: number; y: number }> = [];
  for (const slide of slides) {
    const elements = slide.layout?.elements;
    if (!elements) continue;
    for (const el of Object.values(elements)) {
      if (el._internal) continue;
      if (!el.id || !el.id.toLowerCase().includes('title')) continue;
      // Use absolute bounds — titles may be nested inside containers
      const abs = absoluteBoundsOf(el, elements);
      if (!abs) continue;
      positions.push({ slideId: slide.id, x: abs.x, y: abs.y });
    }
  }
  if (positions.length < 2) return findings;

  const xs = positions.map(p => p.x);
  const ys = positions.map(p => p.y);
  const driftX = Math.max(...xs) - Math.min(...xs);
  const driftY = Math.max(...ys) - Math.min(...ys);
  const maxDrift = Math.max(driftX, driftY);

  if (maxDrift > THRESHOLDS.titlePositionDrift) {
    findings.push({
      rule: 'title-position-drift',
      severity: 'info',
      elementId: null,
      message: `Title position varies by ${maxDrift}px across slides — standardize to consistent position`,
      detail: { positions, driftX, driftY },
      suggestion: `Title position varies by ${maxDrift}px across slides — standardize to consistent position`,
    });
  }
  return findings;
}

function ruleFontCount(sections: NodeListOf<HTMLElement>): LintFinding[] {
  const findings: LintFinding[] = [];
  const families = new Set<string>();
  for (const section of sections) {
    if (!section) continue;
    const els = section.querySelectorAll('[data-sk-type="el"]');
    for (const el of els) {
      if (!el.textContent || !el.textContent.trim()) continue;
      const raw = getComputedStyle(el).fontFamily;
      if (!raw) continue;
      const first = raw.split(',')[0].trim().toLowerCase().replace(/['"]/g, '');
      if (first) families.add(first);
    }
  }
  if (families.size > THRESHOLDS.maxFontFamilies) {
    findings.push({
      rule: 'font-count',
      severity: 'info',
      elementId: null,
      message: `Deck uses ${families.size} font families — consider limiting to ${THRESHOLDS.maxFontFamilies}`,
      detail: { families: Array.from(families), count: families.size, threshold: THRESHOLDS.maxFontFamilies },
      suggestion: `Deck uses ${families.size} font families — consider limiting to ${THRESHOLDS.maxFontFamilies}`,
    });
  }
  return findings;
}

function ruleStyleDrift(sections: NodeListOf<HTMLElement>, slides: LintSlideData[]): LintFinding[] {
  const findings: LintFinding[] = [];
  const bodyFontSizes: Array<{ slideId: string; size: number }> = [];
  const headingFontSizes: Array<{ slideId: string; size: number }> = [];

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    if (!section) continue;
    const slideId = slides[i]?.id ?? `slide-${i}`;

    // Body text: most common font size from [data-sk-type="el"] elements
    const textEls = section.querySelectorAll('[data-sk-type="el"]');
    const sizeCounts = new Map<number, number>();
    for (const el of textEls) {
      if (!el.textContent || !el.textContent.trim()) continue;
      const size = Math.round(parseFloat(getComputedStyle(el).fontSize));
      sizeCounts.set(size, (sizeCounts.get(size) || 0) + 1);
    }
    if (sizeCounts.size > 0) {
      let mostCommon = 0, bestCount = 0;
      for (const [size, count] of sizeCounts) {
        if (count > bestCount) { mostCommon = size; bestCount = count; }
      }
      bodyFontSizes.push({ slideId, size: mostCommon });
    }

    // Heading sizes: most common from h1-h3
    const headings = section.querySelectorAll('h1, h2, h3');
    const hSizeCounts = new Map<number, number>();
    for (const h of headings) {
      const size = Math.round(parseFloat(getComputedStyle(h).fontSize));
      hSizeCounts.set(size, (hSizeCounts.get(size) || 0) + 1);
    }
    if (hSizeCounts.size > 0) {
      let mostCommon = 0, bestCount = 0;
      for (const [size, count] of hSizeCounts) {
        if (count > bestCount) { mostCommon = size; bestCount = count; }
      }
      headingFontSizes.push({ slideId, size: mostCommon });
    }
  }

  if (bodyFontSizes.length >= 2) {
    const sizes = bodyFontSizes.map(e => e.size);
    const min = Math.min(...sizes);
    const max = Math.max(...sizes);
    if (max - min > 4) {
      findings.push({
        rule: 'style-drift',
        severity: 'info',
        elementId: null,
        message: `Body text size varies from ${min}px to ${max}px across slides — standardize`,
        detail: { bodyFontSizes, headingFontSizes },
        suggestion: `Body text size varies from ${min}px to ${max}px across slides — standardize`,
      });
    }
  }

  if (headingFontSizes.length >= 2) {
    const sizes = headingFontSizes.map(e => e.size);
    const min = Math.min(...sizes);
    const max = Math.max(...sizes);
    if (max - min > 4) {
      findings.push({
        rule: 'style-drift',
        severity: 'info',
        elementId: null,
        message: `Heading size varies from ${min}px to ${max}px across slides — standardize`,
        detail: { bodyFontSizes, headingFontSizes },
        suggestion: `Heading size varies from ${min}px to ${max}px across slides — standardize`,
      });
    }
  }

  return findings;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Lint a single slide.
 * @param slideData - Slide data with layout scene graph
 * @param slideElement - Optional DOM element for the slide section (enables DOM-based rules)
 * @returns Array of finding objects
 */
export function lintSlide(slideData: LintSlideData, slideElement: HTMLElement | null = null): LintFinding[] {
  const elements = slideData.layout.elements;
  if (!elements || typeof elements !== 'object') return [];

  const findings: LintFinding[] = [
    ...ruleChildOverflow(elements),
    ...ruleNonAncestorOverlap(elements),
    ...ruleCanvasOverflow(elements),
    ...ruleSafeZoneViolation(elements),
    ...ruleZeroSize(elements),
    // Spacing & alignment
    ...ruleGapTooSmall(elements),
    ...ruleNearMisalignment(elements),
    ...ruleEdgeCrowding(elements),
    // Content distribution
    ...ruleContentClustering(elements),
    ...ruleLopsidedLayout(elements),
    ...ruleTooManyElements(elements),
    ...ruleContentUnderutilized(elements),
  ];

  // DOM-based rules only run when a slide DOM element is provided
  if (slideElement) {
    findings.push(
      ...ruleTextOverflow(slideElement),
      ...ruleFontTooSmall(slideElement),
      ...ruleFontTooLarge(slideElement),
      ...ruleLineTooLong(slideElement),
      ...ruleLineHeightTight(slideElement),
      // Image + Visual Hierarchy
      ...ruleImageUpscaled(slideElement),
      ...ruleAspectRatioDistortion(slideElement),
      ...ruleHeadingSizeInversion(slideElement),
      ...ruleLowContrast(slideElement),
    );
  }

  return findings;
}

/**
 * Lint an entire deck.
 * @param skData - the window.sk object
 * @param sections - Optional slide section DOM elements
 * @returns Array of finding objects (with slideId added)
 */
export function lintDeck(skData: LintDeckData, sections: NodeListOf<HTMLElement> | null = null): LintFinding[] {
  const slides = skData?.slides;
  if (!Array.isArray(slides)) return [];
  const findings: LintFinding[] = [];

  // Per-slide rules
  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    const slideEl = sections ? (sections[i] || null) : null;
    const slideFindings = lintSlide(slide, slideEl);
    for (const f of slideFindings) {
      findings.push({ ...f, slideId: slide.id });
    }
  }

  // Cross-slide consistency rules
  findings.push(
    ...ruleTitlePositionDrift(slides),
  );

  // DOM-based cross-slide rules
  if (sections) {
    findings.push(
      ...ruleFontCount(sections),
      ...ruleStyleDrift(sections, slides),
    );
  }

  return findings;
}

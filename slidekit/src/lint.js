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
  const visited = new Set();
  let current = elements[elementId];
  while (current && current.parentId) {
    if (visited.has(current.id)) return false;
    visited.add(current.id);
    if (current.parentId === ancestorId) return true;
    current = elements[current.parentId];
  }
  return false;
}

function boundsOf(el) {
  const r = el.resolved;
  return r ? { x: r.x, y: r.y, w: r.w, h: r.h } : null;
}

function normLayer(el) {
  const layer = el?.authored?.props?.layer;
  return (layer === 'bg' || layer === 'overlay' || layer === 'content') ? layer : 'content';
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
      const layerA = normLayer(a);
      const layerB = normLayer(b);
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
    if (normLayer(el) === 'bg') continue;
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
    if (el.parentId != null) continue;
    if (normLayer(el) === 'bg') continue;
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
// DOM helpers
// ---------------------------------------------------------------------------

function findSkElements(slideEl) {
  if (!slideEl) return [];
  return Array.from(slideEl.querySelectorAll('[data-sk-id]'));
}

function findSkTextElements(slideEl) {
  if (!slideEl) return [];
  return Array.from(slideEl.querySelectorAll('[data-sk-type="el"][data-sk-id]'));
}

// ---------------------------------------------------------------------------
// DOM-based rule implementations (Rules 7–12)
// ---------------------------------------------------------------------------

function ruleTextOverflow(slideEl) {
  const findings = [];
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

function ruleFontTooSmall(slideEl) {
  const findings = [];
  for (const el of findSkTextElements(slideEl)) {
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

function ruleFontTooLarge(slideEl) {
  const findings = [];
  for (const el of findSkTextElements(slideEl)) {
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

function ruleLineTooLong(slideEl) {
  const findings = [];
  for (const el of findSkTextElements(slideEl)) {
    if (!el.textContent || !el.textContent.trim()) continue;
    const fontSize = parseFloat(getComputedStyle(el).fontSize);
    const elementWidth = el.clientWidth;
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

function ruleLineHeightTight(slideEl) {
  const findings = [];
  for (const el of findSkTextElements(slideEl)) {
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

function ruleEmptyText(slideEl) {
  const findings = [];
  if (!slideEl) return findings;
  const els = slideEl.querySelectorAll('[data-sk-type="el"]');
  for (const el of els) {
    // Skip elements containing non-text content
    if (el.querySelector('img, svg, canvas, video, audio, iframe')) continue;
    if (!el.textContent || !el.textContent.trim()) {
      findings.push({
        rule: 'empty-text',
        severity: 'warning',
        elementId: el.getAttribute('data-sk-id'),
        message: `Element "${el.getAttribute('data-sk-id')}" has no text content`,
        detail: { content: el.textContent },
        suggestion: 'Remove empty element or add content',
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
 * @param {{ id: string, layout: { elements: Object, warnings: any[], errors: any[], collisions: any[] } }} slideData
 * @param {HTMLElement} [slideElement=null] - Optional DOM element for the slide section (enables DOM-based rules)
 * @returns {Array} Array of finding objects
 */
export function lintSlide(slideData, slideElement = null) {
  const elements = slideData.layout.elements;
  if (!elements || typeof elements !== 'object') return [];

  const findings = [
    ...ruleChildOverflow(elements),
    ...ruleNonAncestorOverlap(elements),
    ...ruleCanvasOverflow(elements),
    ...ruleSafeZoneViolation(elements),
    ...ruleZeroSize(elements),
  ];

  // DOM-based rules only run when a slide DOM element is provided
  if (slideElement) {
    findings.push(
      ...ruleTextOverflow(slideElement),
      ...ruleFontTooSmall(slideElement),
      ...ruleFontTooLarge(slideElement),
      ...ruleLineTooLong(slideElement),
      ...ruleLineHeightTight(slideElement),
      ...ruleEmptyText(slideElement),
    );
  }

  return findings;
}

/**
 * Lint an entire deck.
 * @param {{ slides: Array<{ id: string, layout: Object }> }} skData — the window.sk object
 * @param {NodeListOf<HTMLElement>} [sections=null] - Optional slide section DOM elements
 * @returns {Array} Array of finding objects (with slideId added)
 */
export function lintDeck(skData, sections = null) {
  const slides = skData?.slides;
  if (!Array.isArray(slides)) return [];
  const findings = [];
  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    const slideEl = sections ? (sections[i] || null) : null;
    const slideFindings = lintSlide(slide, slideEl);
    for (const f of slideFindings) {
      findings.push({ ...f, slideId: slide.id });
    }
  }
  return findings;
}

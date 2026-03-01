import { describe, it, assert } from './test-runner.js';
import { lintSlide, lintDeck } from '../slidekit.js';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function mockSlide(id, elements) {
  return {
    id,
    layout: {
      elements,
      warnings: [],
      errors: [],
      collisions: [],
    },
  };
}

function mockElement(id, resolved, opts = {}) {
  return {
    id,
    type: opts.type || 'el',
    resolved: { x: resolved.x, y: resolved.y, w: resolved.w, h: resolved.h },
    parentId: opts.parentId !== undefined ? opts.parentId : null,
    children: opts.children || [],
    authored: { props: opts.props || {} },
    _internal: opts._internal || false,
    _layoutFlags: opts._layoutFlags || {},
  };
}

// ---------------------------------------------------------------------------
// child-overflow
// ---------------------------------------------------------------------------

describe('lint: child-overflow', () => {
  it('detects child overflowing parent on bottom', () => {
    const elements = {
      parent: mockElement('parent', { x: 100, y: 100, w: 200, h: 200 }, { children: ['child'] }),
      child: mockElement('child', { x: 100, y: 100, w: 200, h: 250 }, { parentId: 'parent' }),
    };
    const findings = lintSlide(mockSlide('s1', elements));
    const overflow = findings.filter(f => f.rule === 'child-overflow');
    assert.equal(overflow.length, 1);
    assert.equal(overflow[0].detail.edge, 'bottom');
    assert.equal(overflow[0].detail.overshoot, 50);
    assert.equal(overflow[0].severity, 'error');
  });

  it('detects child overflowing parent on right', () => {
    const elements = {
      parent: mockElement('parent', { x: 100, y: 100, w: 200, h: 200 }, { children: ['child'] }),
      child: mockElement('child', { x: 100, y: 100, w: 250, h: 200 }, { parentId: 'parent' }),
    };
    const findings = lintSlide(mockSlide('s1', elements));
    const overflow = findings.filter(f => f.rule === 'child-overflow');
    assert.equal(overflow.length, 1);
    assert.equal(overflow[0].detail.edge, 'right');
    assert.equal(overflow[0].detail.overshoot, 50);
  });

  it('detects child overflowing parent on left', () => {
    const elements = {
      parent: mockElement('parent', { x: 100, y: 100, w: 200, h: 200 }, { children: ['child'] }),
      child: mockElement('child', { x: 50, y: 100, w: 200, h: 200 }, { parentId: 'parent' }),
    };
    const findings = lintSlide(mockSlide('s1', elements));
    const overflow = findings.filter(f => f.rule === 'child-overflow');
    assert.equal(overflow.length, 1);
    assert.equal(overflow[0].detail.edge, 'left');
    assert.equal(overflow[0].detail.overshoot, 50);
  });

  it('detects child overflowing parent on top', () => {
    const elements = {
      parent: mockElement('parent', { x: 100, y: 100, w: 200, h: 200 }, { children: ['child'] }),
      child: mockElement('child', { x: 100, y: 60, w: 200, h: 200 }, { parentId: 'parent' }),
    };
    const findings = lintSlide(mockSlide('s1', elements));
    const overflow = findings.filter(f => f.rule === 'child-overflow');
    assert.equal(overflow.length, 1);
    assert.equal(overflow[0].detail.edge, 'top');
    assert.equal(overflow[0].detail.overshoot, 40);
  });

  it('reports no finding when child fits inside parent', () => {
    const elements = {
      parent: mockElement('parent', { x: 100, y: 100, w: 200, h: 200 }, { children: ['child'] }),
      child: mockElement('child', { x: 110, y: 110, w: 180, h: 180 }, { parentId: 'parent' }),
    };
    const findings = lintSlide(mockSlide('s1', elements));
    const overflow = findings.filter(f => f.rule === 'child-overflow');
    assert.equal(overflow.length, 0);
  });

  it('skips _internal elements', () => {
    const elements = {
      parent: mockElement('parent', { x: 100, y: 100, w: 200, h: 200 }, { children: ['child'] }),
      child: mockElement('child', { x: 100, y: 100, w: 200, h: 999 }, { parentId: 'parent', _internal: true }),
    };
    const findings = lintSlide(mockSlide('s1', elements));
    const overflow = findings.filter(f => f.rule === 'child-overflow');
    assert.equal(overflow.length, 0);
  });
});

// ---------------------------------------------------------------------------
// non-ancestor-overlap
// ---------------------------------------------------------------------------

describe('lint: non-ancestor-overlap', () => {
  it('detects overlapping siblings', () => {
    const elements = {
      a: mockElement('a', { x: 100, y: 100, w: 200, h: 200 }),
      b: mockElement('b', { x: 250, y: 100, w: 200, h: 200 }),
    };
    const findings = lintSlide(mockSlide('s1', elements));
    const overlaps = findings.filter(f => f.rule === 'non-ancestor-overlap');
    assert.equal(overlaps.length, 1);
    assert.equal(overlaps[0].detail.overlapArea, 50 * 200);
  });

  it('does not flag parent-child overlap', () => {
    const elements = {
      parent: mockElement('parent', { x: 100, y: 100, w: 200, h: 200 }, { children: ['child'] }),
      child: mockElement('child', { x: 100, y: 100, w: 200, h: 200 }, { parentId: 'parent' }),
    };
    const findings = lintSlide(mockSlide('s1', elements));
    const overlaps = findings.filter(f => f.rule === 'non-ancestor-overlap');
    assert.equal(overlaps.length, 0);
  });

  it('detects overlapping cousins', () => {
    const elements = {
      gp: mockElement('gp', { x: 0, y: 0, w: 1920, h: 1080 }, { children: ['p1', 'p2'] }),
      p1: mockElement('p1', { x: 100, y: 100, w: 400, h: 400 }, { parentId: 'gp', children: ['c1'] }),
      p2: mockElement('p2', { x: 600, y: 100, w: 400, h: 400 }, { parentId: 'gp', children: ['c2'] }),
      c1: mockElement('c1', { x: 200, y: 200, w: 500, h: 100 }, { parentId: 'p1' }),
      c2: mockElement('c2', { x: 600, y: 200, w: 200, h: 100 }, { parentId: 'p2' }),
    };
    const findings = lintSlide(mockSlide('s1', elements));
    const overlaps = findings.filter(f => f.rule === 'non-ancestor-overlap');
    const cousinOverlap = overlaps.find(f =>
      (f.detail.elementA === 'c1' && f.detail.elementB === 'c2') ||
      (f.detail.elementA === 'c2' && f.detail.elementB === 'c1')
    );
    assert.equal(!!cousinOverlap, true, 'should detect cousin overlap');
  });

  it('reports no finding when elements do not overlap', () => {
    const elements = {
      a: mockElement('a', { x: 100, y: 100, w: 200, h: 200 }),
      b: mockElement('b', { x: 400, y: 100, w: 200, h: 200 }),
    };
    const findings = lintSlide(mockSlide('s1', elements));
    const overlaps = findings.filter(f => f.rule === 'non-ancestor-overlap');
    assert.equal(overlaps.length, 0);
  });

  it('does not flag overlapping elements on different layers', () => {
    const elements = {
      bg: mockElement('bg', { x: 0, y: 0, w: 1920, h: 1080 }, { props: { layer: 'bg' } }),
      content: mockElement('content', { x: 100, y: 100, w: 400, h: 400 }, { props: { layer: 'content' } }),
    };
    const findings = lintSlide(mockSlide('s1', elements));
    const overlaps = findings.filter(f => f.rule === 'non-ancestor-overlap');
    assert.equal(overlaps.length, 0);
  });
});

// ---------------------------------------------------------------------------
// canvas-overflow
// ---------------------------------------------------------------------------

describe('lint: canvas-overflow', () => {
  it('detects element extending beyond canvas right edge', () => {
    const elements = {
      a: mockElement('a', { x: 1800, y: 100, w: 200, h: 100 }),
    };
    const findings = lintSlide(mockSlide('s1', elements));
    const overflow = findings.filter(f => f.rule === 'canvas-overflow');
    assert.equal(overflow.length, 1);
    assert.equal(overflow[0].detail.edge, 'right');
    assert.equal(overflow[0].detail.overshoot, 80);
  });

  it('detects element extending beyond canvas bottom', () => {
    const elements = {
      a: mockElement('a', { x: 100, y: 1000, w: 100, h: 200 }),
    };
    const findings = lintSlide(mockSlide('s1', elements));
    const overflow = findings.filter(f => f.rule === 'canvas-overflow');
    assert.equal(overflow.length, 1);
    assert.equal(overflow[0].detail.edge, 'bottom');
    assert.equal(overflow[0].detail.overshoot, 120);
  });

  it('does not flag background layer elements', () => {
    const elements = {
      bg: mockElement('bg', { x: -10, y: -10, w: 2000, h: 1100 }, { props: { layer: 'bg' } }),
    };
    const findings = lintSlide(mockSlide('s1', elements));
    const overflow = findings.filter(f => f.rule === 'canvas-overflow');
    assert.equal(overflow.length, 0);
  });

  it('reports no finding for element within canvas', () => {
    const elements = {
      a: mockElement('a', { x: 100, y: 100, w: 200, h: 200 }),
    };
    const findings = lintSlide(mockSlide('s1', elements));
    const overflow = findings.filter(f => f.rule === 'canvas-overflow');
    assert.equal(overflow.length, 0);
  });
});

// ---------------------------------------------------------------------------
// safe-zone-violation
// ---------------------------------------------------------------------------

describe('lint: safe-zone-violation', () => {
  it('detects root element outside safe zone', () => {
    const elements = {
      a: mockElement('a', { x: 50, y: 100, w: 200, h: 200 }),
    };
    const findings = lintSlide(mockSlide('s1', elements));
    const violations = findings.filter(f => f.rule === 'safe-zone-violation');
    assert.equal(violations.length, 1);
    assert.equal(violations[0].detail.edge, 'left');
    assert.equal(violations[0].detail.overshoot, 70);
    assert.equal(violations[0].severity, 'warning');
  });

  it('does not flag background layer elements', () => {
    const elements = {
      bg: mockElement('bg', { x: 0, y: 0, w: 1920, h: 1080 }, { props: { layer: 'bg' } }),
    };
    const findings = lintSlide(mockSlide('s1', elements));
    const violations = findings.filter(f => f.rule === 'safe-zone-violation');
    assert.equal(violations.length, 0);
  });

  it('does not flag child elements', () => {
    const elements = {
      parent: mockElement('parent', { x: 200, y: 200, w: 400, h: 400 }, { children: ['child'] }),
      child: mockElement('child', { x: 50, y: 50, w: 100, h: 100 }, { parentId: 'parent' }),
    };
    const findings = lintSlide(mockSlide('s1', elements));
    const violations = findings.filter(f => f.rule === 'safe-zone-violation');
    assert.equal(violations.length, 0);
  });

  it('reports no finding for element within safe zone', () => {
    const elements = {
      a: mockElement('a', { x: 200, y: 200, w: 400, h: 400 }),
    };
    const findings = lintSlide(mockSlide('s1', elements));
    const violations = findings.filter(f => f.rule === 'safe-zone-violation');
    assert.equal(violations.length, 0);
  });
});

// ---------------------------------------------------------------------------
// zero-size
// ---------------------------------------------------------------------------

describe('lint: zero-size', () => {
  it('detects element with zero width', () => {
    const elements = {
      a: mockElement('a', { x: 100, y: 100, w: 0, h: 200 }),
    };
    const findings = lintSlide(mockSlide('s1', elements));
    const zs = findings.filter(f => f.rule === 'zero-size');
    assert.equal(zs.length, 1);
    assert.equal(zs[0].detail.w, 0);
    assert.equal(zs[0].severity, 'error');
  });

  it('detects element with negative height', () => {
    const elements = {
      a: mockElement('a', { x: 100, y: 100, w: 200, h: -10 }),
    };
    const findings = lintSlide(mockSlide('s1', elements));
    const zs = findings.filter(f => f.rule === 'zero-size');
    assert.equal(zs.length, 1);
    assert.equal(zs[0].detail.h, -10);
  });

  it('reports no finding for normal element', () => {
    const elements = {
      a: mockElement('a', { x: 100, y: 100, w: 200, h: 200 }),
    };
    const findings = lintSlide(mockSlide('s1', elements));
    const zs = findings.filter(f => f.rule === 'zero-size');
    assert.equal(zs.length, 0);
  });

  it('skips connector elements', () => {
    const elements = {
      conn: mockElement('conn', { x: 100, y: 100, w: 0, h: 0 }, { type: 'connector' }),
    };
    const findings = lintSlide(mockSlide('s1', elements));
    const zs = findings.filter(f => f.rule === 'zero-size');
    assert.equal(zs.length, 0);
  });
});

// ---------------------------------------------------------------------------
// lintDeck
// ---------------------------------------------------------------------------

describe('lint: lintDeck', () => {
  it('runs lintSlide on all slides and adds slideId', () => {
    const slide1 = mockSlide('s1', {
      a: mockElement('a', { x: 1900, y: 100, w: 100, h: 100 }),
    });
    const slide2 = mockSlide('s2', {
      b: mockElement('b', { x: 100, y: 100, w: 0, h: 200 }),
    });
    const skData = { slides: [slide1, slide2] };
    const findings = lintDeck(skData);
    const fromS1 = findings.filter(f => f.slideId === 's1');
    const fromS2 = findings.filter(f => f.slideId === 's2');
    assert.equal(fromS1.length > 0, true, 'should have findings from slide 1');
    assert.equal(fromS2.length > 0, true, 'should have findings from slide 2');
  });
});

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

// ---------------------------------------------------------------------------
// gap-too-small
// ---------------------------------------------------------------------------

describe('lint: gap-too-small', () => {
  it('detects siblings 4px apart', () => {
    const elements = {
      a: mockElement('a', { x: 200, y: 200, w: 100, h: 100 }),
      b: mockElement('b', { x: 304, y: 200, w: 100, h: 100 }),
    };
    const findings = lintSlide(mockSlide('s1', elements));
    const gaps = findings.filter(f => f.rule === 'gap-too-small');
    assert.equal(gaps.length, 1);
    assert.equal(gaps[0].detail.gap, 4);
    assert.equal(gaps[0].severity, 'warning');
  });

  it('reports no finding when siblings are 10px apart', () => {
    const elements = {
      a: mockElement('a', { x: 200, y: 200, w: 100, h: 100 }),
      b: mockElement('b', { x: 310, y: 200, w: 100, h: 100 }),
    };
    const findings = lintSlide(mockSlide('s1', elements));
    const gaps = findings.filter(f => f.rule === 'gap-too-small');
    assert.equal(gaps.length, 0);
  });
});

// ---------------------------------------------------------------------------
// near-misalignment
// ---------------------------------------------------------------------------

describe('lint: near-misalignment', () => {
  it('detects elements with x=100 and x=103', () => {
    const elements = {
      a: mockElement('a', { x: 100, y: 200, w: 100, h: 100 }),
      b: mockElement('b', { x: 103, y: 250, w: 100, h: 100 }),
    };
    const findings = lintSlide(mockSlide('s1', elements));
    const mis = findings.filter(f => f.rule === 'near-misalignment');
    assert.equal(mis.length, 1);
    assert.equal(mis[0].severity, 'info');
    assert.equal(mis[0].detail.drift, 3);
  });

  it('reports no finding when edges are exactly aligned', () => {
    const elements = {
      a: mockElement('a', { x: 100, y: 200, w: 100, h: 100 }),
      b: mockElement('b', { x: 100, y: 400, w: 100, h: 100 }),
    };
    const findings = lintSlide(mockSlide('s1', elements));
    const mis = findings.filter(f => f.rule === 'near-misalignment');
    assert.equal(mis.length, 0);
  });
});

// ---------------------------------------------------------------------------
// edge-crowding
// ---------------------------------------------------------------------------

describe('lint: edge-crowding', () => {
  it('detects element 5px from safe zone left edge', () => {
    const elements = {
      a: mockElement('a', { x: 125, y: 200, w: 100, h: 100 }),
    };
    const findings = lintSlide(mockSlide('s1', elements));
    const crowd = findings.filter(f => f.rule === 'edge-crowding');
    assert.equal(crowd.length, 1);
    assert.equal(crowd[0].detail.edge, 'left');
    assert.equal(crowd[0].detail.distance, 5);
    assert.equal(crowd[0].severity, 'info');
  });

  it('reports no finding for element well inside safe zone', () => {
    const elements = {
      a: mockElement('a', { x: 200, y: 200, w: 100, h: 100 }),
    };
    const findings = lintSlide(mockSlide('s1', elements));
    const crowd = findings.filter(f => f.rule === 'edge-crowding');
    assert.equal(crowd.length, 0);
  });
});

// ---------------------------------------------------------------------------
// content-clustering
// ---------------------------------------------------------------------------

describe('lint: content-clustering', () => {
  it('detects single small element in huge safe zone', () => {
    const elements = {
      a: mockElement('a', { x: 500, y: 400, w: 50, h: 50 }),
    };
    const findings = lintSlide(mockSlide('s1', elements));
    const cluster = findings.filter(f => f.rule === 'content-clustering');
    assert.equal(cluster.length, 1);
    assert.equal(cluster[0].severity, 'warning');
  });

  it('reports no finding when elements use most of safe zone', () => {
    const elements = {
      a: mockElement('a', { x: 120, y: 90, w: 840, h: 450 }),
      b: mockElement('b', { x: 960, y: 540, w: 840, h: 450 }),
    };
    const findings = lintSlide(mockSlide('s1', elements));
    const cluster = findings.filter(f => f.rule === 'content-clustering');
    assert.equal(cluster.length, 0);
  });
});

// ---------------------------------------------------------------------------
// lopsided-layout
// ---------------------------------------------------------------------------

describe('lint: lopsided-layout', () => {
  it('detects all content in top-left corner', () => {
    const elements = {
      a: mockElement('a', { x: 130, y: 100, w: 200, h: 100 }),
      b: mockElement('b', { x: 130, y: 210, w: 200, h: 100 }),
    };
    const findings = lintSlide(mockSlide('s1', elements));
    const lopsided = findings.filter(f => f.rule === 'lopsided-layout');
    assert.equal(lopsided.length, 1);
    assert.equal(lopsided[0].severity, 'info');
  });

  it('reports no finding when content is centered', () => {
    const elements = {
      a: mockElement('a', { x: 760, y: 390, w: 400, h: 300 }),
    };
    const findings = lintSlide(mockSlide('s1', elements));
    const lopsided = findings.filter(f => f.rule === 'lopsided-layout');
    assert.equal(lopsided.length, 0);
  });
});

// ---------------------------------------------------------------------------
// too-many-elements
// ---------------------------------------------------------------------------

describe('lint: too-many-elements', () => {
  it('detects 16 root elements', () => {
    const elements = {};
    for (let i = 0; i < 16; i++) {
      elements[`e${i}`] = mockElement(`e${i}`, { x: 200 + i * 50, y: 200, w: 40, h: 40 });
    }
    const findings = lintSlide(mockSlide('s1', elements));
    const tme = findings.filter(f => f.rule === 'too-many-elements');
    assert.equal(tme.length, 1);
    assert.equal(tme[0].detail.count, 16);
    assert.equal(tme[0].severity, 'info');
  });

  it('reports no finding for 10 root elements', () => {
    const elements = {};
    for (let i = 0; i < 10; i++) {
      elements[`e${i}`] = mockElement(`e${i}`, { x: 200 + i * 80, y: 200, w: 60, h: 60 });
    }
    const findings = lintSlide(mockSlide('s1', elements));
    const tme = findings.filter(f => f.rule === 'too-many-elements');
    assert.equal(tme.length, 0);
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

// ---------------------------------------------------------------------------
// lintSlide with optional slideElement parameter
// ---------------------------------------------------------------------------

describe('lint: lintSlide with slideElement', () => {
  it('accepts optional slideElement without error', () => {
    const elements = {
      a: mockElement('a', { x: 200, y: 200, w: 400, h: 400 }),
    };
    const slide = mockSlide('s1', elements);
    // Should not throw when called with null
    const f1 = lintSlide(slide, null);
    assert.equal(Array.isArray(f1), true);
    // Should not throw when called without second arg
    const f2 = lintSlide(slide);
    assert.equal(Array.isArray(f2), true);
  });

  it('returns only scene-model findings when no slideElement provided', () => {
    const elements = {
      a: mockElement('a', { x: 200, y: 200, w: 400, h: 400 }),
    };
    const slide = mockSlide('s1', elements);
    const findings = lintSlide(slide);
    const domRules = ['text-overflow', 'font-too-small', 'font-too-large', 'line-too-long', 'line-height-tight', 'empty-text'];
    const domFindings = findings.filter(f => domRules.includes(f.rule));
    assert.equal(domFindings.length, 0, 'DOM rules should not run without slideElement');
  });
});

// ---------------------------------------------------------------------------
// DOM-based rules (Rules 7–12)
// ---------------------------------------------------------------------------

describe('lint: text-overflow (DOM)', () => {
  it('detects text overflow in DOM element', () => {
    const container = document.createElement('section');
    const el = document.createElement('div');
    el.setAttribute('data-sk-type', 'el');
    el.setAttribute('data-sk-id', 'overflow-el');
    el.style.width = '100px';
    el.style.height = '20px';
    el.style.overflow = 'hidden';
    el.style.fontSize = '16px';
    el.style.position = 'absolute';
    el.textContent = 'This is a very long text that should overflow the container element and cause a finding to be reported by the lint rule';
    container.appendChild(el);
    document.body.appendChild(container);

    const slide = mockSlide('s1', {});
    const findings = lintSlide(slide, container);
    const overflows = findings.filter(f => f.rule === 'text-overflow');
    assert.equal(overflows.length, 1);
    assert.equal(overflows[0].elementId, 'overflow-el');
    assert.equal(overflows[0].severity, 'error');

    document.body.removeChild(container);
  });

  it('reports no finding when content fits', () => {
    const container = document.createElement('section');
    const el = document.createElement('div');
    el.setAttribute('data-sk-type', 'el');
    el.setAttribute('data-sk-id', 'fits-el');
    el.style.width = '500px';
    el.style.height = '200px';
    el.style.fontSize = '16px';
    el.style.position = 'absolute';
    el.textContent = 'Short';
    container.appendChild(el);
    document.body.appendChild(container);

    const slide = mockSlide('s1', {});
    const findings = lintSlide(slide, container);
    const overflows = findings.filter(f => f.rule === 'text-overflow');
    assert.equal(overflows.length, 0);

    document.body.removeChild(container);
  });
});

describe('lint: font-too-small (DOM)', () => {
  it('detects font below minimum threshold', () => {
    const container = document.createElement('section');
    const el = document.createElement('div');
    el.setAttribute('data-sk-id', 'small-font');
    el.setAttribute('data-sk-type', 'el');
    el.style.fontSize = '12px';
    el.style.position = 'absolute';
    el.textContent = 'Tiny text';
    container.appendChild(el);
    document.body.appendChild(container);

    const slide = mockSlide('s1', {});
    const findings = lintSlide(slide, container);
    const small = findings.filter(f => f.rule === 'font-too-small');
    assert.equal(small.length, 1);
    assert.equal(small[0].severity, 'warning');
    assert.equal(small[0].detail.threshold, 18);

    document.body.removeChild(container);
  });

  it('does not flag font above threshold', () => {
    const container = document.createElement('section');
    const el = document.createElement('div');
    el.setAttribute('data-sk-id', 'ok-font');
    el.setAttribute('data-sk-type', 'el');
    el.style.fontSize = '24px';
    el.style.position = 'absolute';
    el.textContent = 'Normal text';
    container.appendChild(el);
    document.body.appendChild(container);

    const slide = mockSlide('s1', {});
    const findings = lintSlide(slide, container);
    const small = findings.filter(f => f.rule === 'font-too-small');
    assert.equal(small.length, 0);

    document.body.removeChild(container);
  });
});

describe('lint: font-too-large (DOM)', () => {
  it('detects font above maximum threshold', () => {
    const container = document.createElement('section');
    const el = document.createElement('div');
    el.setAttribute('data-sk-id', 'big-font');
    el.setAttribute('data-sk-type', 'el');
    el.style.fontSize = '150px';
    el.style.position = 'absolute';
    el.textContent = 'Huge';
    container.appendChild(el);
    document.body.appendChild(container);

    const slide = mockSlide('s1', {});
    const findings = lintSlide(slide, container);
    const large = findings.filter(f => f.rule === 'font-too-large');
    assert.equal(large.length, 1);
    assert.equal(large[0].severity, 'info');
    assert.equal(large[0].detail.threshold, 120);

    document.body.removeChild(container);
  });
});

describe('lint: line-too-long (DOM)', () => {
  it('detects wide element with small font', () => {
    const container = document.createElement('section');
    const el = document.createElement('div');
    el.setAttribute('data-sk-id', 'wide-el');
    el.setAttribute('data-sk-type', 'el');
    el.style.width = '1600px';
    el.style.fontSize = '16px';
    el.style.position = 'absolute';
    el.textContent = 'Some text content that could be very long per line';
    container.appendChild(el);
    document.body.appendChild(container);

    const slide = mockSlide('s1', {});
    const findings = lintSlide(slide, container);
    const long = findings.filter(f => f.rule === 'line-too-long');
    assert.equal(long.length, 1);
    assert.equal(long[0].severity, 'info');

    document.body.removeChild(container);
  });
});

describe('lint: line-height-tight (DOM)', () => {
  it('detects tight line-height', () => {
    const container = document.createElement('section');
    const el = document.createElement('div');
    el.setAttribute('data-sk-id', 'tight-lh');
    el.setAttribute('data-sk-type', 'el');
    el.style.fontSize = '20px';
    el.style.lineHeight = '20px';
    el.style.position = 'absolute';
    el.textContent = 'Cramped text';
    container.appendChild(el);
    document.body.appendChild(container);

    const slide = mockSlide('s1', {});
    const findings = lintSlide(slide, container);
    const tight = findings.filter(f => f.rule === 'line-height-tight');
    assert.equal(tight.length, 1);
    assert.equal(tight[0].severity, 'warning');
    assert.equal(tight[0].detail.ratio, 1.0);

    document.body.removeChild(container);
  });

  it('does not flag normal line-height', () => {
    const container = document.createElement('section');
    const el = document.createElement('div');
    el.setAttribute('data-sk-id', 'normal-lh');
    el.setAttribute('data-sk-type', 'el');
    el.style.fontSize = '20px';
    el.style.position = 'absolute';
    el.textContent = 'Normal text';
    container.appendChild(el);
    document.body.appendChild(container);

    const slide = mockSlide('s1', {});
    const findings = lintSlide(slide, container);
    const tight = findings.filter(f => f.rule === 'line-height-tight');
    assert.equal(tight.length, 0);

    document.body.removeChild(container);
  });
});

describe('lint: empty-text (DOM)', () => {
  it('detects empty el-type element', () => {
    const container = document.createElement('section');
    const el = document.createElement('div');
    el.setAttribute('data-sk-type', 'el');
    el.setAttribute('data-sk-id', 'empty-el');
    el.style.position = 'absolute';
    el.textContent = '';
    container.appendChild(el);
    document.body.appendChild(container);

    const slide = mockSlide('s1', {});
    const findings = lintSlide(slide, container);
    const empty = findings.filter(f => f.rule === 'empty-text');
    assert.equal(empty.length, 1);
    assert.equal(empty[0].severity, 'warning');

    document.body.removeChild(container);
  });

  it('does not flag element with text content', () => {
    const container = document.createElement('section');
    const el = document.createElement('div');
    el.setAttribute('data-sk-type', 'el');
    el.setAttribute('data-sk-id', 'has-text');
    el.style.position = 'absolute';
    el.textContent = 'Hello world';
    container.appendChild(el);
    document.body.appendChild(container);

    const slide = mockSlide('s1', {});
    const findings = lintSlide(slide, container);
    const empty = findings.filter(f => f.rule === 'empty-text');
    assert.equal(empty.length, 0);

    document.body.removeChild(container);
  });

  it('does not flag element containing an image', () => {
    const container = document.createElement('section');
    const el = document.createElement('div');
    el.setAttribute('data-sk-type', 'el');
    el.setAttribute('data-sk-id', 'img-el');
    el.style.position = 'absolute';
    const img = document.createElement('img');
    img.src = 'test.png';
    el.appendChild(img);
    container.appendChild(el);
    document.body.appendChild(container);

    const slide = mockSlide('s1', {});
    const findings = lintSlide(slide, container);
    const empty = findings.filter(f => f.rule === 'empty-text');
    assert.equal(empty.length, 0);

    document.body.removeChild(container);
  });
});

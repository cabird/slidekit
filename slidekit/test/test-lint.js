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
    localResolved: opts.localResolved || { x: resolved.x, y: resolved.y, w: resolved.w, h: resolved.h },
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
  // Child resolved coords are LOCAL to parent; parent extent is (0, 0, w, h)
  it('detects child overflowing parent on bottom', () => {
    const elements = {
      parent: mockElement('parent', { x: 100, y: 100, w: 200, h: 200 }, { children: ['child'] }),
      child: mockElement('child', { x: 0, y: 0, w: 200, h: 250 }, { parentId: 'parent' }),
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
      child: mockElement('child', { x: 0, y: 0, w: 250, h: 200 }, { parentId: 'parent' }),
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
      child: mockElement('child', { x: -50, y: 0, w: 200, h: 200 }, { parentId: 'parent' }),
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
      child: mockElement('child', { x: 0, y: -40, w: 200, h: 200 }, { parentId: 'parent' }),
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
      child: mockElement('child', { x: 10, y: 10, w: 180, h: 180 }, { parentId: 'parent' }),
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
    // Parents are groups — absoluteBoundsOf adds group offsets to children's resolved
    // c1 absolute: 350 + group p1 offset 100 = 450, w=500 → ends at 950
    // c2 absolute: 0 + group p2 offset 600 = 600, w=200 → starts at 600
    // Overlap: 600..950 on x → 350px overlap
    const elements = {
      gp: mockElement('gp', { x: 0, y: 0, w: 1920, h: 1080 }, { type: 'group', children: ['p1', 'p2'] }),
      p1: mockElement('p1', { x: 100, y: 100, w: 400, h: 400 }, { type: 'group', parentId: 'gp', children: ['c1'] }),
      p2: mockElement('p2', { x: 600, y: 100, w: 400, h: 400 }, { type: 'group', parentId: 'gp', children: ['c2'] }),
      c1: mockElement('c1', { x: 350, y: 0, w: 500, h: 100 }, { parentId: 'p1' }),
      c2: mockElement('c2', { x: 0, y: 0, w: 200, h: 100 }, { parentId: 'p2' }),
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

  it('does not flag when either element has allowOverlap: true', () => {
    const elements = {
      bg: mockElement('bg', { x: 100, y: 100, w: 400, h: 400 }, { props: { allowOverlap: true } }),
      content: mockElement('content', { x: 200, y: 200, w: 200, h: 200 }),
    };
    const findings = lintSlide(mockSlide('s1', elements));
    const overlaps = findings.filter(f => f.rule === 'non-ancestor-overlap');
    assert.equal(overlaps.length, 0, 'allowOverlap should suppress overlap finding');
  });

  it('does not flag two full-bleed background elements', () => {
    const elements = {
      bgRect: mockElement('bgRect', { x: 0, y: 0, w: 1920, h: 1080 }),
      bgImg: mockElement('bgImg', { x: 0, y: 0, w: 1920, h: 1080 }),
    };
    const findings = lintSlide(mockSlide('s1', elements));
    const overlaps = findings.filter(f => f.rule === 'non-ancestor-overlap');
    assert.equal(overlaps.length, 0, 'full-bleed pairs should be skipped');
  });

  it('does not flag containment when container has panel-like styles', () => {
    const elements = {
      panel: mockElement('panel', { x: 100, y: 100, w: 600, h: 400 }, {
        props: { style: { backgroundColor: '#1a1a3e', border: '1px solid rgba(255,255,255,0.1)' } },
      }),
      content: mockElement('content', { x: 150, y: 150, w: 200, h: 200 }),
    };
    const findings = lintSlide(mockSlide('s1', elements));
    const overlaps = findings.filter(f => f.rule === 'non-ancestor-overlap');
    assert.equal(overlaps.length, 0, 'containment with panel styles should be skipped');
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
    const domRules = ['text-overflow', 'font-too-small', 'font-too-large', 'line-too-long', 'line-height-tight', 'image-upscaled', 'aspect-ratio-distortion', 'heading-size-inversion', 'panel-content-surplus'];
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

  it('detects small font on inner span (TreeWalker)', () => {
    const container = document.createElement('section');
    const el = document.createElement('div');
    el.setAttribute('data-sk-id', 'inner-span');
    el.setAttribute('data-sk-type', 'el');
    el.style.fontSize = '24px'; // container says 24px
    el.style.position = 'absolute';
    el.innerHTML = '<span style="font-size:10px">Tiny inner text</span>';
    container.appendChild(el);
    document.body.appendChild(container);

    const slide = mockSlide('s1', {});
    const findings = lintSlide(slide, container);
    const small = findings.filter(f => f.rule === 'font-too-small');
    assert.equal(small.length, 1, 'should detect small font on inner span, not container');
    assert.equal(small[0].detail.fontSize, 10);

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

// ---------------------------------------------------------------------------
// Image & Visual Hierarchy rules (Rules 19–22)
// ---------------------------------------------------------------------------

describe('lint: image-upscaled (DOM)', () => {
  const dataUri = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

  it('detects image rendered larger than natural size', () => {
    const container = document.createElement('section');
    const wrapper = document.createElement('div');
    wrapper.setAttribute('data-sk-id', 'img-wrapper');
    const img = document.createElement('img');
    img.src = dataUri;
    // naturalWidth/Height = 1x1 for this GIF
    img.style.width = '200px';
    img.style.height = '200px';
    img.style.position = 'absolute';
    wrapper.appendChild(img);
    container.appendChild(wrapper);
    document.body.appendChild(container);

    // Force load for natural dimensions
    return new Promise(resolve => {
      img.onload = () => {
        const slide = mockSlide('s1', {});
        const findings = lintSlide(slide, container);
        const upscaled = findings.filter(f => f.rule === 'image-upscaled');
        assert.equal(upscaled.length, 1);
        assert.equal(upscaled[0].severity, 'warning');
        assert.equal(upscaled[0].elementId, 'img-wrapper');
        assert.equal(upscaled[0].detail.naturalWidth, 1);
        assert.equal(upscaled[0].detail.naturalHeight, 1);
        document.body.removeChild(container);
        resolve();
      };
      // trigger load if already cached
      if (img.naturalWidth > 0) img.onload();
    });
  });

  it('does not flag image at natural size', () => {
    const container = document.createElement('section');
    const img = document.createElement('img');
    img.src = dataUri;
    img.style.width = '1px';
    img.style.height = '1px';
    img.style.position = 'absolute';
    container.appendChild(img);
    document.body.appendChild(container);

    return new Promise(resolve => {
      img.onload = () => {
        const slide = mockSlide('s1', {});
        const findings = lintSlide(slide, container);
        const upscaled = findings.filter(f => f.rule === 'image-upscaled');
        assert.equal(upscaled.length, 0);
        document.body.removeChild(container);
        resolve();
      };
      if (img.naturalWidth > 0) img.onload();
    });
  });
});

describe('lint: aspect-ratio-distortion (DOM)', () => {
  it('detects distorted aspect ratio', () => {
    const container = document.createElement('section');
    const wrapper = document.createElement('div');
    wrapper.setAttribute('data-sk-id', 'distorted-img');
    // Use a 10x10 canvas to create a known-size image
    const canvas = document.createElement('canvas');
    canvas.width = 10;
    canvas.height = 10;
    const imgSrc = canvas.toDataURL();
    const img = document.createElement('img');
    img.src = imgSrc;
    // Render at 200x100 (2:1) but natural is 1:1 — that's distorted
    img.style.width = '200px';
    img.style.height = '100px';
    img.style.position = 'absolute';
    wrapper.appendChild(img);
    container.appendChild(wrapper);
    document.body.appendChild(container);

    return new Promise(resolve => {
      img.onload = () => {
        const slide = mockSlide('s1', {});
        const findings = lintSlide(slide, container);
        const distorted = findings.filter(f => f.rule === 'aspect-ratio-distortion');
        assert.equal(distorted.length, 1);
        assert.equal(distorted[0].severity, 'warning');
        assert.equal(distorted[0].elementId, 'distorted-img');
        document.body.removeChild(container);
        resolve();
      };
      if (img.naturalWidth > 0) img.onload();
    });
  });

  it('does not flag image with correct aspect ratio', () => {
    const container = document.createElement('section');
    const canvas = document.createElement('canvas');
    canvas.width = 10;
    canvas.height = 10;
    const imgSrc = canvas.toDataURL();
    const img = document.createElement('img');
    img.src = imgSrc;
    img.style.width = '100px';
    img.style.height = '100px';
    img.style.position = 'absolute';
    container.appendChild(img);
    document.body.appendChild(container);

    return new Promise(resolve => {
      img.onload = () => {
        const slide = mockSlide('s1', {});
        const findings = lintSlide(slide, container);
        const distorted = findings.filter(f => f.rule === 'aspect-ratio-distortion');
        assert.equal(distorted.length, 0);
        document.body.removeChild(container);
        resolve();
      };
      if (img.naturalWidth > 0) img.onload();
    });
  });

  it('does not flag distorted image with object-fit: contain', () => {
    const container = document.createElement('section');
    const canvas = document.createElement('canvas');
    canvas.width = 10;
    canvas.height = 10;
    const imgSrc = canvas.toDataURL();
    const img = document.createElement('img');
    img.src = imgSrc;
    img.style.width = '200px';
    img.style.height = '100px';
    img.style.objectFit = 'contain';
    img.style.position = 'absolute';
    container.appendChild(img);
    document.body.appendChild(container);

    return new Promise(resolve => {
      img.onload = () => {
        const slide = mockSlide('s1', {});
        const findings = lintSlide(slide, container);
        const distorted = findings.filter(f => f.rule === 'aspect-ratio-distortion');
        assert.equal(distorted.length, 0, 'object-fit: contain should skip distortion check');
        document.body.removeChild(container);
        resolve();
      };
      if (img.naturalWidth > 0) img.onload();
    });
  });
});

describe('lint: heading-size-inversion (DOM)', () => {
  it('detects h3 larger than h2', () => {
    const container = document.createElement('section');
    const h2 = document.createElement('h2');
    h2.style.fontSize = '20px';
    h2.textContent = 'Heading 2';
    const h3 = document.createElement('h3');
    h3.style.fontSize = '28px';
    h3.textContent = 'Heading 3';
    container.appendChild(h2);
    container.appendChild(h3);
    document.body.appendChild(container);

    const slide = mockSlide('s1', {});
    const findings = lintSlide(slide, container);
    const inversions = findings.filter(f => f.rule === 'heading-size-inversion');
    assert.equal(inversions.length, 1);
    assert.equal(inversions[0].severity, 'warning');
    assert.equal(inversions[0].detail.largerHeading, 'h2');
    assert.equal(inversions[0].detail.largerSize, 20);
    assert.equal(inversions[0].detail.smallerHeading, 'h3');
    assert.equal(inversions[0].detail.smallerSize, 28);

    document.body.removeChild(container);
  });

  it('does not flag proper heading hierarchy', () => {
    const container = document.createElement('section');
    const h1 = document.createElement('h1');
    h1.style.fontSize = '36px';
    h1.textContent = 'Title';
    const h2 = document.createElement('h2');
    h2.style.fontSize = '28px';
    h2.textContent = 'Subtitle';
    const h3 = document.createElement('h3');
    h3.style.fontSize = '20px';
    h3.textContent = 'Section';
    container.appendChild(h1);
    container.appendChild(h2);
    container.appendChild(h3);
    document.body.appendChild(container);

    const slide = mockSlide('s1', {});
    const findings = lintSlide(slide, container);
    const inversions = findings.filter(f => f.rule === 'heading-size-inversion');
    assert.equal(inversions.length, 0);

    document.body.removeChild(container);
  });

  it('does not flag when same level headings have different sizes (uses max)', () => {
    const container = document.createElement('section');
    const h2a = document.createElement('h2');
    h2a.style.fontSize = '20px';
    h2a.textContent = 'Heading A';
    const h2b = document.createElement('h2');
    h2b.style.fontSize = '30px';
    h2b.textContent = 'Heading B';
    const h3 = document.createElement('h3');
    h3.style.fontSize = '24px';
    h3.textContent = 'Sub';
    container.appendChild(h2a);
    container.appendChild(h2b);
    container.appendChild(h3);
    document.body.appendChild(container);

    const slide = mockSlide('s1', {});
    const findings = lintSlide(slide, container);
    const inversions = findings.filter(f => f.rule === 'heading-size-inversion');
    // max h2 = 30px > h3 = 24px, so no inversion
    assert.equal(inversions.length, 0);

    document.body.removeChild(container);
  });
});

// low-contrast rule removed — visual verifier handles contrast checks

// ---------------------------------------------------------------------------
// Cross-slide: title-position-drift (Rule 23)
// ---------------------------------------------------------------------------

describe('lint: title-position-drift', () => {
  it('detects title position drift across slides', () => {
    const slide1 = mockSlide('s1', {
      title1: mockElement('title1', { x: 100, y: 50, w: 400, h: 60 }),
    });
    const slide2 = mockSlide('s2', {
      title2: mockElement('title2', { x: 100, y: 80, w: 400, h: 60 }),
    });
    const findings = lintDeck({ slides: [slide1, slide2] });
    const drift = findings.filter(f => f.rule === 'title-position-drift');
    assert.equal(drift.length, 1, 'should detect title position drift > 20px');
    assert.equal(drift[0].severity, 'info');
    assert.equal(drift[0].detail.driftY, 30);
  });

  it('does not flag consistent title positions', () => {
    const slide1 = mockSlide('s1', {
      title1: mockElement('title1', { x: 100, y: 50, w: 400, h: 60 }),
    });
    const slide2 = mockSlide('s2', {
      title2: mockElement('title2', { x: 100, y: 55, w: 400, h: 60 }),
    });
    const findings = lintDeck({ slides: [slide1, slide2] });
    const drift = findings.filter(f => f.rule === 'title-position-drift');
    assert.equal(drift.length, 0, 'no drift when positions within threshold');
  });

  it('title-position-drift works without sections (no crash)', () => {
    const slide1 = mockSlide('s1', {
      'my-title': mockElement('my-title', { x: 100, y: 50, w: 400, h: 60 }),
    });
    const slide2 = mockSlide('s2', {
      'slide-title': mockElement('slide-title', { x: 200, y: 50, w: 400, h: 60 }),
    });
    const findings = lintDeck({ slides: [slide1, slide2] });
    const drift = findings.filter(f => f.rule === 'title-position-drift');
    assert.equal(drift.length, 1, 'should detect x drift of 100px');
    assert.equal(drift[0].detail.driftX, 100);
  });
});

// ---------------------------------------------------------------------------
// Cross-slide: font-count (Rule 24) — scene-only safe (no crash without DOM)
// ---------------------------------------------------------------------------

describe('lint: font-count', () => {
  it('does not crash without sections', () => {
    const slide1 = mockSlide('s1', {
      el1: mockElement('el1', { x: 100, y: 100, w: 200, h: 100 }),
    });
    const findings = lintDeck({ slides: [slide1] });
    const fc = findings.filter(f => f.rule === 'font-count');
    assert.equal(fc.length, 0, 'no font-count findings without DOM');
  });
});

// ---------------------------------------------------------------------------
// Cross-slide: style-drift (Rule 25) — scene-only safe (no crash without DOM)
// ---------------------------------------------------------------------------

describe('lint: style-drift', () => {
  it('does not crash without sections', () => {
    const slide1 = mockSlide('s1', {
      el1: mockElement('el1', { x: 100, y: 100, w: 200, h: 100 }),
    });
    const findings = lintDeck({ slides: [slide1] });
    const sd = findings.filter(f => f.rule === 'style-drift');
    assert.equal(sd.length, 0, 'no style-drift findings without DOM');
  });
});

// ---------------------------------------------------------------------------
// content-underutilized (Rule – scene-model)
// ---------------------------------------------------------------------------

describe('lint: content-underutilized', () => {
  it('detects content narrow in both dimensions', () => {
    const elements = {
      a: mockElement('a', { x: 700, y: 400, w: 200, h: 100 }),
    };
    const findings = lintSlide(mockSlide('s1', elements));
    const f = findings.filter(f => f.rule === 'content-underutilized');
    assert.equal(f.length, 1);
    assert.equal(f[0].detail.underutilized, 'both');
  });

  it('detects content narrow horizontally only', () => {
    const elements = {
      a: mockElement('a', { x: 700, y: 100, w: 200, h: 800 }),
    };
    const findings = lintSlide(mockSlide('s1', elements));
    const f = findings.filter(f => f.rule === 'content-underutilized');
    assert.equal(f.length, 1);
    assert.equal(f[0].detail.underutilized, 'horizontal');
  });

  it('detects content narrow vertically only', () => {
    const elements = {
      a: mockElement('a', { x: 200, y: 400, w: 1400, h: 100 }),
    };
    const findings = lintSlide(mockSlide('s1', elements));
    const f = findings.filter(f => f.rule === 'content-underutilized');
    assert.equal(f.length, 1);
    assert.equal(f[0].detail.underutilized, 'vertical');
  });

  it('reports no finding when content uses space well', () => {
    const elements = {
      a: mockElement('a', { x: 200, y: 150, w: 1400, h: 700 }),
    };
    const findings = lintSlide(mockSlide('s1', elements));
    const f = findings.filter(f => f.rule === 'content-underutilized');
    assert.equal(f.length, 0);
  });
});

// ---------------------------------------------------------------------------
// min-vertical-gap
// ---------------------------------------------------------------------------

describe('lint: min-vertical-gap', () => {
  it('flags siblings with gap below threshold', () => {
    // Two text elements 5px apart, font ~24px → minGap = min(36, 24*0.75) = 18px
    const elements = {
      a: mockElement('a', { x: 200, y: 200, w: 400, h: 30 }, { props: { style: { fontSize: '24px' } } }),
      b: mockElement('b', { x: 200, y: 235, w: 400, h: 30 }, { props: { style: { fontSize: '24px' } } }),
    };
    const findings = lintSlide(mockSlide('s1', elements));
    const gap = findings.filter(f => f.rule === 'min-vertical-gap');
    assert.equal(gap.length, 1, 'should flag 5px gap');
    assert.equal(gap[0].detail.gap, 5);
  });

  it('does not flag adequate gap', () => {
    // 30px gap with 24px font → minGap = 18px, so 30 > 18 → no finding
    const elements = {
      a: mockElement('a', { x: 200, y: 200, w: 400, h: 30 }, { props: { style: { fontSize: '24px' } } }),
      b: mockElement('b', { x: 200, y: 260, w: 400, h: 30 }, { props: { style: { fontSize: '24px' } } }),
    };
    const findings = lintSlide(mockSlide('s1', elements));
    const gap = findings.filter(f => f.rule === 'min-vertical-gap');
    assert.equal(gap.length, 0);
  });

  it('severity is warning when gap < 8px, info otherwise', () => {
    // 5px gap → warning (< minGap threshold of 8)
    const elements = {
      a: mockElement('a', { x: 200, y: 200, w: 400, h: 30 }, { props: { style: { fontSize: '24px' } } }),
      b: mockElement('b', { x: 200, y: 235, w: 400, h: 30 }, { props: { style: { fontSize: '24px' } } }),
    };
    const findings = lintSlide(mockSlide('s1', elements));
    const gap = findings.filter(f => f.rule === 'min-vertical-gap');
    assert.equal(gap.length, 1);
    assert.equal(gap[0].severity, 'warning', 'gap < 8px should be warning');
  });

  it('caps minGap at 36px', () => {
    // 60px font → 60*0.75 = 45 but capped at 36. Gap of 37px → no finding.
    const elements = {
      a: mockElement('a', { x: 200, y: 200, w: 400, h: 70 }, { props: { style: { fontSize: '60px' } } }),
      b: mockElement('b', { x: 200, y: 307, w: 400, h: 70 }, { props: { style: { fontSize: '60px' } } }),
    };
    const findings = lintSlide(mockSlide('s1', elements));
    const gap = findings.filter(f => f.rule === 'min-vertical-gap');
    assert.equal(gap.length, 0, 'gap of 37px should pass with 36px cap');
  });
});

// ---------------------------------------------------------------------------
// horizontal-center-consistency
// ---------------------------------------------------------------------------

describe('lint: horizontal-center-consistency', () => {
  it('flags off-center element on a centered-layout slide', () => {
    // 3 elements centered, 1 off-center
    const elements = {
      a: mockElement('a', { x: 660, y: 100, w: 600, h: 60 }), // center = 960 ✓
      b: mockElement('b', { x: 660, y: 200, w: 600, h: 60 }), // center = 960 ✓
      c: mockElement('c', { x: 660, y: 300, w: 600, h: 60 }), // center = 960 ✓
      d: mockElement('d', { x: 200, y: 400, w: 300, h: 60 }), // center = 350 ✗ (610px off)
    };
    const findings = lintSlide(mockSlide('s1', elements));
    const center = findings.filter(f => f.rule === 'horizontal-center-consistency');
    assert.equal(center.length, 1, 'should flag off-center element');
    assert.equal(center[0].elementId, 'd');
  });

  it('excludes small decorative elements', () => {
    // 3 centered + 1 thin accent bar off-center
    const elements = {
      a: mockElement('a', { x: 660, y: 100, w: 600, h: 60 }),
      b: mockElement('b', { x: 660, y: 200, w: 600, h: 60 }),
      c: mockElement('c', { x: 660, y: 300, w: 600, h: 60 }),
      accent: mockElement('accent', { x: 200, y: 400, w: 80, h: 4 }), // area = 320 < 2000
    };
    const findings = lintSlide(mockSlide('s1', elements));
    const center = findings.filter(f => f.rule === 'horizontal-center-consistency');
    assert.equal(center.length, 0, 'decorative accent bar should be excluded');
  });

  it('does not flag non-centered-layout slides', () => {
    // Most elements NOT centered → not a centered layout
    const elements = {
      a: mockElement('a', { x: 100, y: 100, w: 400, h: 60 }),
      b: mockElement('b', { x: 800, y: 200, w: 400, h: 60 }),
      c: mockElement('c', { x: 200, y: 300, w: 300, h: 60 }),
    };
    const findings = lintSlide(mockSlide('s1', elements));
    const center = findings.filter(f => f.rule === 'horizontal-center-consistency');
    assert.equal(center.length, 0, 'should not flag non-centered layout');
  });
});

// ---------------------------------------------------------------------------
// unbalanced-trailing-whitespace (block-level vertical balance)
// ---------------------------------------------------------------------------

describe('lint: unbalanced-trailing-whitespace', () => {
  it('detects top-heavy whitespace', () => {
    // Content positioned near bottom of safe zone
    // Safe zone: y=90..990. Content at y=700 → topGap=610, bottomGap clamped by content height
    const elements = {
      a: mockElement('a', { x: 200, y: 700, w: 1400, h: 200 }),
    };
    const findings = lintSlide(mockSlide('s1', elements));
    const f = findings.filter(f => f.rule === 'unbalanced-trailing-whitespace');
    assert.equal(f.length, 1, 'should detect top-heavy whitespace');
    assert.equal(f[0].detail.direction, 'top-heavy whitespace');
  });

  it('detects bottom-heavy whitespace', () => {
    // Content positioned near top of safe zone
    const elements = {
      a: mockElement('a', { x: 200, y: 100, w: 1400, h: 200 }),
    };
    const findings = lintSlide(mockSlide('s1', elements));
    const f = findings.filter(f => f.rule === 'unbalanced-trailing-whitespace');
    assert.equal(f.length, 1, 'should detect bottom-heavy whitespace');
    assert.equal(f[0].detail.direction, 'bottom-heavy whitespace');
  });

  it('reports no finding when content is vertically balanced', () => {
    // Content centered in safe zone
    const elements = {
      a: mockElement('a', { x: 200, y: 200, w: 1400, h: 600 }),
    };
    const findings = lintSlide(mockSlide('s1', elements));
    const f = findings.filter(f => f.rule === 'unbalanced-trailing-whitespace');
    assert.equal(f.length, 0, 'balanced content should not trigger');
  });

  it('handles content touching safe zone edge', () => {
    // Content at exact top of safe zone (y=90) with empty bottom
    const elements = {
      a: mockElement('a', { x: 200, y: 90, w: 1400, h: 100 }),
    };
    const findings = lintSlide(mockSlide('s1', elements));
    const f = findings.filter(f => f.rule === 'unbalanced-trailing-whitespace');
    // topGap clamped to 1, bottomGap = 990-190 = 800 → ratio = 800 → should fire
    assert.equal(f.length, 1, 'should detect imbalance even when touching edge');
  });
});

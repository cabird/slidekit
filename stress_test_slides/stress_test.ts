// stress_test.ts — SlideKit Stress Test Deck
// Exercises every feature and edge case to shake out bugs.

import {
  init, render, safeRect,
  el, below, above, rightOf, leftOf,
  centerHWith, centerVWith, alignTopWith, placeBetween,
  panel, hstack, vstack, group, connect,
  alignTop, distributeH, matchHeight, alignCenterV,
  cardGrid, figure,
} from '../slidekit/dist/slidekit_ts.bundle.js';

import type {
  SlideDefinition,
  SlideElement,
  Rect,
} from '../slidekit/src_ts/types.js';

// -- Design Tokens ------------------------------------------------------------

const C = {
  bg:      '#0a0a1a',
  accent1: '#00d4ff',
  accent2: '#7c5cbf',
  accent3: '#ff6b9d',
  accent4: '#00ff88',
  text:    '#ffffff',
  textSec: 'rgba(255,255,255,0.65)',
  glass:   'rgba(255,255,255,0.06)',
  glassBr: 'rgba(255,255,255,0.10)',
} as const;

const FONT = 'Inter';

// -- Helpers ------------------------------------------------------------------

function box(id: string, label: string, x: number | object, y: number | object, w = 160, h = 80, bg = C.glass): SlideElement {
  return el(
    `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:${bg};border:1px solid ${C.glassBr};border-radius:8px;font-family:${FONT};font-size:16px;color:${C.text};">${label}</div>`,
    { id, x, y, w, h },
  );
}

function title(text: string, id: string, extra: Record<string, unknown> = {}): SlideElement {
  return el(
    `<h2 style="font-family:${FONT};font-size:48px;font-weight:700;color:${C.text};line-height:1.2;">${text}</h2>`,
    { id, w: 1680, h: 70, ...extra },
  );
}

function label(text: string, id: string, extra: Record<string, unknown> = {}): SlideElement {
  return el(
    `<span style="font-family:${FONT};font-size:18px;color:${C.textSec};">${text}</span>`,
    { id, ...extra },
  );
}

const PLACEHOLDER_SVG = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect fill="%23334" width="400" height="300"/><text x="200" y="150" text-anchor="middle" fill="white" font-size="20">Image</text></svg>`;

// -- Main Entry ---------------------------------------------------------------

export async function run() {
  await init({
    slide: { w: 1920, h: 1080 },
    safeZone: { left: 120, right: 120, top: 90, bottom: 90 },
    minFontSize: 12,
    fonts: [
      { family: 'Inter', weights: [300, 400, 600, 700, 800], source: 'google' },
    ],
  });

  const safe: Rect = safeRect();

  const slides: SlideDefinition[] = [

    // ================================================================
    // SLIDE 1: Title Slide — Anchor Points
    // ================================================================
    {
      id: 'anchor-title',
      background: C.bg,
      elements: [
        el(
          `<h1 style="font-family:${FONT};font-size:72px;font-weight:800;color:${C.text};text-align:center;">SlideKit Stress Test</h1>`,
          { id: 's1-title', x: 960, y: 440, w: 1200, h: 100, anchor: 'cc' },
        ),
        el(
          `<p style="font-family:${FONT};font-size:28px;color:${C.textSec};text-align:center;">Exercising every feature and edge case</p>`,
          { id: 's1-subtitle', x: 960, y: 540, w: 800, h: 50, anchor: 'tc' },
        ),
        el(
          `<div style="width:100%;height:100%;background:linear-gradient(90deg, ${C.accent1}, ${C.accent2}, ${C.accent3});border-radius:2px;"></div>`,
          { id: 's1-line', x: 960, y: 1020, w: 600, h: 4, anchor: 'bc' },
        ),
      ],
    },

    // ================================================================
    // SLIDE 2: Deep Nesting (5+ levels)
    // ================================================================
    {
      id: 'deep-nesting',
      background: C.bg,
      elements: [
        title('Deep Nesting', 's2-title', { x: safe.x, y: safe.y }),
        group([
          vstack([
            panel([
              hstack([
                el(`<span style="font-family:${FONT};font-size:14px;color:${C.accent1};">Level 5 — A</span>`, { id: 's2-l5a', w: 140, h: 30 }),
                el(`<span style="font-family:${FONT};font-size:14px;color:${C.accent2};">Level 5 — B</span>`, { id: 's2-l5b', w: 140, h: 30 }),
              ], { id: 's2-hstack1', gap: 12 }),
              hstack([
                el(`<span style="font-family:${FONT};font-size:14px;color:${C.accent3};">Level 5 — C</span>`, { id: 's2-l5c', w: 140, h: 30 }),
                el(`<span style="font-family:${FONT};font-size:14px;color:${C.accent4};">Level 5 — D</span>`, { id: 's2-l5d', w: 140, h: 30 }),
              ], { id: 's2-hstack2', gap: 12 }),
            ], { id: 's2-panel1', w: 400, fill: C.glass, radius: 12, border: `1px solid ${C.glassBr}`, padding: 16, gap: 12 }),
            panel([
              hstack([
                el(`<span style="font-family:${FONT};font-size:14px;color:${C.accent4};">Level 5 — E</span>`, { id: 's2-l5e', w: 140, h: 30 }),
                el(`<span style="font-family:${FONT};font-size:14px;color:${C.accent1};">Level 5 — F</span>`, { id: 's2-l5f', w: 140, h: 30 }),
              ], { id: 's2-hstack3', gap: 12 }),
            ], { id: 's2-panel2', w: 400, fill: C.glass, radius: 12, border: `1px solid ${C.glassBr}`, padding: 16 }),
          ], { id: 's2-vstack', gap: 16 }),
        ], { id: 's2-group', x: safe.x, y: 190, w: safe.w, h: 600 }),
      ],
    },

    // ================================================================
    // SLIDE 3: Relative Positioning Chain (8+ elements, zigzag)
    // ================================================================
    {
      id: 'rel-chain',
      background: C.bg,
      elements: [
        title('Relative Positioning Chain', 's3-title', { x: safe.x, y: safe.y }),
        box('s3-a', 'A', 200, 250, 120, 60),
        box('s3-b', 'B', rightOf('s3-a', { gap: 20 }), alignTopWith('s3-a'), 120, 60),
        box('s3-c', 'C', rightOf('s3-b', { gap: 20 }), alignTopWith('s3-b'), 120, 60),
        box('s3-d', 'D', alignTopWith('s3-c') as unknown as number, below('s3-c', { gap: 20 }), 120, 60),
        box('s3-e', 'E', leftOf('s3-d', { gap: 20 }), alignTopWith('s3-d'), 120, 60),
        box('s3-f', 'F', leftOf('s3-e', { gap: 20 }), alignTopWith('s3-e'), 120, 60),
        box('s3-g', 'G', alignTopWith('s3-f') as unknown as number, below('s3-f', { gap: 20 }), 120, 60),
        box('s3-h', 'H', rightOf('s3-g', { gap: 20 }), alignTopWith('s3-g'), 120, 60),
        box('s3-i', 'I', rightOf('s3-h', { gap: 20 }), alignTopWith('s3-h'), 120, 60),
        box('s3-j', 'J', rightOf('s3-i', { gap: 20 }), alignTopWith('s3-i'), 120, 60),
      ],
    },

    // ================================================================
    // SLIDE 4: All 9 Anchor Points Demo
    // ================================================================
    {
      id: 'anchor-demo',
      background: C.bg,
      elements: [
        title('All 9 Anchor Points', 's4-title', { x: safe.x, y: safe.y }),
        // Cross-hairs at center
        el(`<div style="width:100%;height:1px;background:rgba(255,255,255,0.15);"></div>`, { id: 's4-crossH', x: 460, y: 540, w: 1000, h: 1 }),
        el(`<div style="width:1px;height:100%;background:rgba(255,255,255,0.15);"></div>`, { id: 's4-crossV', x: 960, y: 200, w: 1, h: 680 }),
        // 9 boxes at (960, 540) with different anchors
        box('s4-tl', 'tl', 960, 540, 100, 50, 'rgba(0,212,255,0.25)'),
        el(`<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:rgba(124,92,191,0.25);border:1px solid ${C.glassBr};border-radius:8px;font-family:${FONT};font-size:16px;color:${C.text};">tc</div>`,
          { id: 's4-tc', x: 960, y: 540, w: 100, h: 50, anchor: 'tc' }),
        el(`<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:rgba(255,107,157,0.25);border:1px solid ${C.glassBr};border-radius:8px;font-family:${FONT};font-size:16px;color:${C.text};">tr</div>`,
          { id: 's4-tr', x: 960, y: 540, w: 100, h: 50, anchor: 'tr' }),
        el(`<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:rgba(0,255,136,0.25);border:1px solid ${C.glassBr};border-radius:8px;font-family:${FONT};font-size:16px;color:${C.text};">cl</div>`,
          { id: 's4-cl', x: 960, y: 540, w: 100, h: 50, anchor: 'cl' }),
        el(`<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:rgba(255,165,0,0.25);border:1px solid ${C.glassBr};border-radius:8px;font-family:${FONT};font-size:16px;color:${C.text};">cc</div>`,
          { id: 's4-cc', x: 960, y: 540, w: 100, h: 50, anchor: 'cc' }),
        el(`<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:rgba(255,0,0,0.25);border:1px solid ${C.glassBr};border-radius:8px;font-family:${FONT};font-size:16px;color:${C.text};">cr</div>`,
          { id: 's4-cr', x: 960, y: 540, w: 100, h: 50, anchor: 'cr' }),
        el(`<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:rgba(200,200,0,0.25);border:1px solid ${C.glassBr};border-radius:8px;font-family:${FONT};font-size:16px;color:${C.text};">bl</div>`,
          { id: 's4-bl', x: 960, y: 540, w: 100, h: 50, anchor: 'bl' }),
        el(`<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:rgba(0,100,200,0.25);border:1px solid ${C.glassBr};border-radius:8px;font-family:${FONT};font-size:16px;color:${C.text};">bc</div>`,
          { id: 's4-bc', x: 960, y: 540, w: 100, h: 50, anchor: 'bc' }),
        el(`<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:rgba(180,0,180,0.25);border:1px solid ${C.glassBr};border-radius:8px;font-family:${FONT};font-size:16px;color:${C.text};">br</div>`,
          { id: 's4-br', x: 960, y: 540, w: 100, h: 50, anchor: 'br' }),
      ],
    },

    // ================================================================
    // SLIDE 5: Stack Alignments
    // ================================================================
    {
      id: 'stack-align',
      background: C.bg,
      elements: [
        title('Stack Alignments', 's5-title', { x: safe.x, y: safe.y }),
        // hstack with align: 'stretch'
        label('hstack align: stretch', 's5-lbl1', { x: 150, y: 190, w: 300, h: 30 }),
        hstack([
          panel([
            el(`<span style="font-family:${FONT};font-size:14px;color:${C.text};">Short</span>`, { id: 's5-hs-a', w: 200, h: 30 }),
          ], { id: 's5-hs-p1', w: 220, fill: 'rgba(0,212,255,0.15)', radius: 8, border: `1px solid ${C.glassBr}`, padding: 10 }),
          panel([
            el(`<span style="font-family:${FONT};font-size:14px;color:${C.text};">Medium height<br>with two lines</span>`, { id: 's5-hs-b', w: 200, h: 60 }),
          ], { id: 's5-hs-p2', w: 220, fill: 'rgba(124,92,191,0.15)', radius: 8, border: `1px solid ${C.glassBr}`, padding: 10 }),
          panel([
            el(`<span style="font-family:${FONT};font-size:14px;color:${C.text};">Tall<br>with<br>three lines</span>`, { id: 's5-hs-c', w: 200, h: 90 }),
          ], { id: 's5-hs-p3', w: 220, fill: 'rgba(255,107,157,0.15)', radius: 8, border: `1px solid ${C.glassBr}`, padding: 10 }),
        ], { id: 's5-hstack', x: 150, y: 230, gap: 16, align: 'stretch' }),
        // vstack with align: 'center'
        label('vstack align: center', 's5-lbl2', { x: 1000, y: 190, w: 300, h: 30 }),
        vstack([
          el(`<div style="background:rgba(0,255,136,0.15);border:1px solid ${C.glassBr};border-radius:8px;width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-family:${FONT};font-size:14px;color:${C.text};">Wide: 500px</div>`,
            { id: 's5-vs-a', w: 500, h: 50 }),
          el(`<div style="background:rgba(255,165,0,0.15);border:1px solid ${C.glassBr};border-radius:8px;width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-family:${FONT};font-size:14px;color:${C.text};">Medium: 300px</div>`,
            { id: 's5-vs-b', w: 300, h: 50 }),
          el(`<div style="background:rgba(200,200,0,0.15);border:1px solid ${C.glassBr};border-radius:8px;width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-family:${FONT};font-size:14px;color:${C.text};">Narrow: 150px</div>`,
            { id: 's5-vs-c', w: 150, h: 50 }),
        ], { id: 's5-vstack', x: 1000, y: 230, gap: 12, align: 'center' }),
      ],
    },

    // ================================================================
    // SLIDE 6: Connector Types
    // ================================================================
    {
      id: 'connectors',
      background: C.bg,
      elements: [
        title('Connector Types', 's6-title', { x: safe.x, y: safe.y }),
        // 2x3 grid of boxes
        box('s6-a', 'A', 300, 250, 180, 80),
        box('s6-b', 'B', 700, 250, 180, 80),
        box('s6-c', 'C', 1100, 250, 180, 80),
        box('s6-d', 'D', 300, 550, 180, 80),
        box('s6-e', 'E', 700, 550, 180, 80),
        box('s6-f', 'F', 1100, 550, 180, 80),
        // Straight connectors
        connect('s6-a', 's6-b', { id: 's6-c1', type: 'straight', arrow: 'end', color: C.accent1, fromAnchor: 'cr', toAnchor: 'cl', label: 'straight' }),
        // Curved connector
        connect('s6-b', 's6-c', { id: 's6-c2', type: 'curved', arrow: 'both', color: C.accent2, fromAnchor: 'cr', toAnchor: 'cl', label: 'curved+both' }),
        // Elbow connector
        connect('s6-a', 's6-d', { id: 's6-c3', type: 'elbow', arrow: 'end', color: C.accent3, fromAnchor: 'bc', toAnchor: 'tc', label: 'elbow' }),
        // Dashed straight
        connect('s6-d', 's6-e', { id: 's6-c4', type: 'straight', arrow: 'start', color: C.accent4, dash: '6 4', fromAnchor: 'cr', toAnchor: 'cl', label: 'dashed+start' }),
        // No arrow
        connect('s6-e', 's6-f', { id: 's6-c5', type: 'elbow', arrow: 'none', color: C.text, fromAnchor: 'cr', toAnchor: 'cl', label: 'no arrow' }),
        // Same-direction routing (cl→cl)
        connect('s6-c', 's6-f', { id: 's6-c6', type: 'elbow', arrow: 'end', color: C.accent1, dash: '8 3', fromAnchor: 'cl', toAnchor: 'cl', label: 'cl→cl' }),
      ],
    },

    // ================================================================
    // SLIDE 7: Backward Connector Routing
    // ================================================================
    {
      id: 'backward-routing',
      background: C.bg,
      elements: [
        title('Backward Connector Routing', 's7-title', { x: safe.x, y: safe.y }),
        box('s7-a', 'Box A', 300, 400, 200, 100, 'rgba(0,212,255,0.15)'),
        box('s7-b', 'Box B', 1200, 400, 200, 100, 'rgba(255,107,157,0.15)'),
        // Backward: B.cr → A.cl (must route around)
        connect('s7-b', 's7-a', { id: 's7-c1', type: 'elbow', arrow: 'end', color: C.accent3, fromAnchor: 'cr', toAnchor: 'cl', label: 'backward elbow', thickness: 3 }),
        // Vertical forward: A.bc → B.tc
        connect('s7-a', 's7-b', { id: 's7-c2', type: 'straight', arrow: 'end', color: C.accent1, fromAnchor: 'bc', toAnchor: 'tc', label: 'diagonal anchors' }),
        // Diagonal anchors: A.tr → B.bl
        connect('s7-a', 's7-b', { id: 's7-c3', type: 'curved', arrow: 'both', color: C.accent4, fromAnchor: 'tr', toAnchor: 'bl', label: 'A.tr → B.bl' }),
      ],
    },

    // ================================================================
    // SLIDE 8: Transforms
    // ================================================================
    {
      id: 'transforms',
      background: C.bg,
      elements: [
        title('Transforms', 's8-title', { x: safe.x, y: safe.y }),
        label('distributeH + alignTop + matchHeight', 's8-lbl1', { x: 150, y: 190, w: 600, h: 30 }),
        box('s8-a', 'A', 200, 250, 140, 60),
        box('s8-b', 'B', 400, 280, 180, 100),
        box('s8-c', 'C', 600, 260, 120, 80),
        box('s8-d', 'D', 800, 300, 160, 50),
        box('s8-e', 'E', 1000, 240, 200, 120),
        // Second set for alignCenterV
        label('alignCenterV', 's8-lbl2', { x: 150, y: 550, w: 300, h: 30 }),
        box('s8-f', 'F', 200, 600, 140, 40),
        box('s8-g', 'G', 500, 650, 180, 100),
        box('s8-h', 'H', 800, 620, 120, 60),
      ],
      transforms: [
        distributeH(['s8-a', 's8-b', 's8-c', 's8-d', 's8-e'], { startX: 200, endX: 1700 }),
        alignTop(['s8-a', 's8-b', 's8-c', 's8-d', 's8-e']),
        matchHeight(['s8-a', 's8-b', 's8-c', 's8-d', 's8-e']),
        alignCenterV(['s8-f', 's8-g', 's8-h']),
      ],
    },

    // ================================================================
    // SLIDE 9: Panel Stress
    // ================================================================
    {
      id: 'panel-stress',
      background: C.bg,
      elements: [
        title('Panel Stress', 's9-title', { x: safe.x, y: safe.y }),
        // Nested panels (3 levels)
        panel([
          el(`<span style="font-family:${FONT};font-size:14px;color:${C.accent1};">Outer Panel</span>`, { id: 's9-outer-lbl', w: 'fill' as unknown as number, h: 24 }),
          panel([
            el(`<span style="font-family:${FONT};font-size:14px;color:${C.accent2};">Middle Panel</span>`, { id: 's9-mid-lbl', w: 'fill' as unknown as number, h: 24 }),
            panel([
              el(`<span style="font-family:${FONT};font-size:14px;color:${C.accent3};">Inner Panel</span>`, { id: 's9-inner-lbl', w: 'fill' as unknown as number, h: 24 }),
            ], { id: 's9-inner', w: 280, fill: 'rgba(255,107,157,0.12)', radius: 8, border: `1px solid ${C.glassBr}`, padding: 12 }),
          ], { id: 's9-mid', w: 360, fill: 'rgba(124,92,191,0.12)', radius: 10, border: `1px solid ${C.glassBr}`, padding: 16 }),
        ], { id: 's9-outer', x: 150, y: 200, w: 460, fill: 'rgba(0,212,255,0.08)', radius: 12, border: `1px solid ${C.glassBr}`, padding: 20 }),
        // Panel with many children
        panel([
          el(`<span style="font-family:${FONT};font-size:13px;color:${C.text};">Item 1</span>`, { id: 's9-item1', w: 'fill' as unknown as number, h: 22 }),
          el(`<span style="font-family:${FONT};font-size:13px;color:${C.text};">Item 2</span>`, { id: 's9-item2', w: 'fill' as unknown as number, h: 22 }),
          el(`<span style="font-family:${FONT};font-size:13px;color:${C.text};">Item 3</span>`, { id: 's9-item3', w: 'fill' as unknown as number, h: 22 }),
          el(`<span style="font-family:${FONT};font-size:13px;color:${C.text};">Item 4</span>`, { id: 's9-item4', w: 'fill' as unknown as number, h: 22 }),
          el(`<span style="font-family:${FONT};font-size:13px;color:${C.text};">Item 5</span>`, { id: 's9-item5', w: 'fill' as unknown as number, h: 22 }),
          el(`<span style="font-family:${FONT};font-size:13px;color:${C.text};">Item 6</span>`, { id: 's9-item6', w: 'fill' as unknown as number, h: 22 }),
          el(`<span style="font-family:${FONT};font-size:13px;color:${C.text};">Item 7</span>`, { id: 's9-item7', w: 'fill' as unknown as number, h: 22 }),
          el(`<span style="font-family:${FONT};font-size:13px;color:${C.text};">Item 8</span>`, { id: 's9-item8', w: 'fill' as unknown as number, h: 22 }),
        ], { id: 's9-many', x: 700, y: 200, w: 300, fill: C.glass, radius: 10, border: `1px solid ${C.glassBr}`, padding: 12, gap: 8 }),
        // Tiny padding panel
        panel([
          el(`<span style="font-family:${FONT};font-size:12px;color:${C.text};">Tiny pad (2px)</span>`, { id: 's9-tiny-lbl', w: 'fill' as unknown as number, h: 20 }),
        ], { id: 's9-tiny', x: 1100, y: 200, w: 200, fill: C.glass, radius: 4, border: `1px solid ${C.glassBr}`, padding: 2 }),
        // Huge padding panel
        panel([
          el(`<span style="font-family:${FONT};font-size:14px;color:${C.text};">Huge pad (60px)</span>`, { id: 's9-huge-lbl', w: 'fill' as unknown as number, h: 24 }),
        ], { id: 's9-huge', x: 1100, y: 350, w: 400, fill: C.glass, radius: 16, border: `1px solid ${C.glassBr}`, padding: 60 }),
      ],
    },

    // ================================================================
    // SLIDE 10: Canvas Boundaries
    // ================================================================
    {
      id: 'canvas-bounds',
      background: C.bg,
      elements: [
        title('Canvas Boundaries', 's10-title', { x: safe.x, y: safe.y }),
        // Four corners
        box('s10-tl', 'TL', 0, 0, 120, 60, 'rgba(0,212,255,0.2)'),
        box('s10-tr', 'TR', 1800, 0, 120, 60, 'rgba(124,92,191,0.2)'),
        box('s10-bl', 'BL', 0, 1020, 120, 60, 'rgba(255,107,157,0.2)'),
        box('s10-br', 'BR', 1800, 1020, 120, 60, 'rgba(0,255,136,0.2)'),
        // Intentional overflow past right edge
        box('s10-overflow', 'Overflow →', 1850, 500, 200, 60, 'rgba(255,0,0,0.3)'),
        // Safe zone boundary elements
        box('s10-safe-tl', 'Safe TL', safe.x, safe.y + 80, 140, 50),
        box('s10-safe-br', 'Safe BR', safe.x + safe.w - 140, safe.y + safe.h - 50, 140, 50),
        // Outline the safe zone
        el(`<div style="width:100%;height:100%;border:2px dashed rgba(255,255,255,0.15);border-radius:4px;"></div>`,
          { id: 's10-safe-outline', x: safe.x, y: safe.y, w: safe.w, h: safe.h }),
      ],
    },

    // ================================================================
    // SLIDE 11: Text Extremes
    // ================================================================
    {
      id: 'text-extremes',
      background: C.bg,
      elements: [
        title('Text Extremes', 's11-title', { x: safe.x, y: safe.y }),
        // Very small text
        el(`<span style="font-size:10px;font-family:${FONT};color:${C.text};">Very small text (10px) — can you even read this?</span>`,
          { id: 's11-tiny', x: 150, y: 200, w: 400, h: 20 }),
        // Very large text
        el(`<span style="font-size:100px;font-family:${FONT};font-weight:800;color:${C.accent1};">BIG</span>`,
          { id: 's11-huge', x: 150, y: 240, w: 600, h: 130 }),
        // Very long single line
        el(`<span style="font-size:16px;font-family:${FONT};color:${C.textSec};white-space:nowrap;">This is an extremely long single line of text that goes on and on and on without wrapping to test how SlideKit handles very long unwrapped text content that extends way beyond what you would normally expect in a slide element</span>`,
          { id: 's11-long', x: 150, y: 400, w: 1700, h: 30, style: { overflow: 'hidden' } }),
        // Tight line-height
        el(`<span style="font-size:20px;font-family:${FONT};color:${C.text};line-height:1.0;">Tight line-height (1.0)<br>Second line<br>Third line</span>`,
          { id: 's11-tight', x: 150, y: 480, w: 400, h: 80 }),
        // Wide line-height
        el(`<span style="font-size:20px;font-family:${FONT};color:${C.text};line-height:2.5;">Wide line-height (2.5)<br>Second line<br>Third line</span>`,
          { id: 's11-wide', x: 700, y: 480, w: 400, h: 180 }),
      ],
    },

    // ================================================================
    // SLIDE 12: cardGrid
    // ================================================================
    {
      id: 'card-grid',
      background: C.bg,
      elements: [
        title('cardGrid Layout', 's12-title', { x: safe.x, y: safe.y }),
        cardGrid([
          panel([
            el(`<span style="font-family:${FONT};font-size:16px;font-weight:600;color:${C.accent1};">Card 1</span>`, { id: 's12-c1-title', w: 'fill' as unknown as number, h: 24 }),
            el(`<span style="font-family:${FONT};font-size:13px;color:${C.textSec};">Short content</span>`, { id: 's12-c1-body', w: 'fill' as unknown as number, h: 20 }),
          ], { id: 's12-c1', w: 480, fill: C.glass, radius: 12, border: `1px solid ${C.glassBr}`, padding: 16, gap: 8 }),
          panel([
            el(`<span style="font-family:${FONT};font-size:16px;font-weight:600;color:${C.accent2};">Card 2</span>`, { id: 's12-c2-title', w: 'fill' as unknown as number, h: 24 }),
            el(`<span style="font-family:${FONT};font-size:13px;color:${C.textSec};">This card has significantly more content to test how the grid handles uneven heights across columns.</span>`, { id: 's12-c2-body', w: 'fill' as unknown as number, h: 60 }),
          ], { id: 's12-c2', w: 480, fill: C.glass, radius: 12, border: `1px solid ${C.glassBr}`, padding: 16, gap: 8 }),
          panel([
            el(`<span style="font-family:${FONT};font-size:16px;font-weight:600;color:${C.accent3};">Card 3</span>`, { id: 's12-c3-title', w: 'fill' as unknown as number, h: 24 }),
            el(`<span style="font-family:${FONT};font-size:13px;color:${C.textSec};">Medium text</span>`, { id: 's12-c3-body', w: 'fill' as unknown as number, h: 30 }),
          ], { id: 's12-c3', w: 480, fill: C.glass, radius: 12, border: `1px solid ${C.glassBr}`, padding: 16, gap: 8 }),
          panel([
            el(`<span style="font-family:${FONT};font-size:16px;font-weight:600;color:${C.accent4};">Card 4</span>`, { id: 's12-c4-title', w: 'fill' as unknown as number, h: 24 }),
            el(`<span style="font-family:${FONT};font-size:13px;color:${C.textSec};">Content</span>`, { id: 's12-c4-body', w: 'fill' as unknown as number, h: 20 }),
          ], { id: 's12-c4', w: 480, fill: C.glass, radius: 12, border: `1px solid ${C.glassBr}`, padding: 16, gap: 8 }),
          panel([
            el(`<span style="font-family:${FONT};font-size:16px;font-weight:600;color:${C.accent1};">Card 5</span>`, { id: 's12-c5-title', w: 'fill' as unknown as number, h: 24 }),
            el(`<span style="font-family:${FONT};font-size:13px;color:${C.textSec};">Another card here</span>`, { id: 's12-c5-body', w: 'fill' as unknown as number, h: 20 }),
          ], { id: 's12-c5', w: 480, fill: C.glass, radius: 12, border: `1px solid ${C.glassBr}`, padding: 16, gap: 8 }),
          panel([
            el(`<span style="font-family:${FONT};font-size:16px;font-weight:600;color:${C.accent2};">Card 6</span>`, { id: 's12-c6-title', w: 'fill' as unknown as number, h: 24 }),
            el(`<span style="font-family:${FONT};font-size:13px;color:${C.textSec};">Last card in the 3-column grid</span>`, { id: 's12-c6-body', w: 'fill' as unknown as number, h: 20 }),
          ], { id: 's12-c6', w: 480, fill: C.glass, radius: 12, border: `1px solid ${C.glassBr}`, padding: 16, gap: 8 }),
        ], { id: 's12-grid', cols: 3, gap: 20, x: 150, y: 200, w: 1600 }),
      ],
    },

    // ================================================================
    // SLIDE 13: Figures
    // ================================================================
    {
      id: 'figures',
      background: C.bg,
      elements: [
        title('Figure Compound', 's13-title', { x: safe.x, y: safe.y }),
        // Figure with caption
        figure({
          id: 's13-fig1',
          src: PLACEHOLDER_SVG,
          x: 150, y: 200, w: 400, h: 300,
          caption: `<span style="font-family:${FONT};font-size:14px;color:${C.textSec};text-align:center;">Figure with caption</span>`,
          captionGap: 12,
        }),
        // Figure with container styling
        figure({
          id: 's13-fig2',
          src: PLACEHOLDER_SVG,
          x: 650, y: 200, w: 400, h: 300,
          containerFill: 'rgba(0,212,255,0.1)',
          containerRadius: 16,
          containerPadding: 20,
          caption: `<span style="font-family:${FONT};font-size:14px;color:${C.textSec};text-align:center;">Container fill + radius + padding</span>`,
          captionGap: 12,
        }),
        // Figure without src (empty image)
        figure({
          id: 's13-fig3',
          x: 1150, y: 200, w: 400, h: 300,
          containerFill: 'rgba(255,107,157,0.1)',
          containerRadius: 8,
          containerPadding: 10,
          caption: `<span style="font-family:${FONT};font-size:14px;color:${C.textSec};text-align:center;">No src (empty image)</span>`,
          captionGap: 12,
        }),
      ],
    },

    // ================================================================
    // SLIDE 14: Overlapping Elements / Layers
    // ================================================================
    {
      id: 'layers',
      background: C.bg,
      elements: [
        title('Layers & Overlap', 's14-title', { x: safe.x, y: safe.y }),
        // Background layer rect
        el(`<div style="width:100%;height:100%;background:linear-gradient(135deg, rgba(0,212,255,0.15), rgba(124,92,191,0.15));border-radius:16px;"></div>`,
          { id: 's14-bg-rect', x: 300, y: 250, w: 800, h: 500, layer: 'bg' }),
        // Content layer group
        group([
          box('s14-mid-a', 'Content A', 0, 0, 200, 100, 'rgba(0,255,136,0.2)'),
          box('s14-mid-b', 'Content B', 150, 60, 200, 100, 'rgba(255,107,157,0.2)'),
        ], { id: 's14-content-grp', x: 400, y: 350, layer: 'content' }),
        // Overlay layer text
        el(`<div style="font-family:${FONT};font-size:36px;font-weight:700;color:${C.accent1};text-align:center;background:rgba(0,0,0,0.6);padding:16px 32px;border-radius:12px;">OVERLAY</div>`,
          { id: 's14-overlay', x: 500, y: 430, w: 300, h: 80, layer: 'overlay' }),
        // Second independent set
        el(`<div style="width:100%;height:100%;background:rgba(255,165,0,0.1);border-radius:12px;"></div>`,
          { id: 's14-bg2', x: 1200, y: 250, w: 500, h: 500, layer: 'bg' }),
        el(`<span style="font-family:${FONT};font-size:20px;color:${C.text};">Layered content on bg</span>`,
          { id: 's14-text-on-bg', x: 1300, y: 450, w: 300, h: 30, layer: 'content' }),
      ],
    },

    // ================================================================
    // SLIDE 15: placeBetween
    // ================================================================
    {
      id: 'place-between',
      background: C.bg,
      elements: [
        title('placeBetween', 's15-title', { x: safe.x, y: safe.y }),
        // Reference elements with gap
        box('s15-top', 'Top Ref', 300, 220, 300, 80, 'rgba(0,212,255,0.2)'),
        box('s15-bottom', 'Bottom Ref', 300, 600, 300, 80, 'rgba(255,107,157,0.2)'),
        // Default bias (0.35)
        el(`<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:rgba(0,255,136,0.2);border:2px dashed ${C.accent4};border-radius:8px;font-family:${FONT};font-size:14px;color:${C.text};">placeBetween default</div>`,
          { id: 's15-between-default', x: 300, y: placeBetween('s15-top', 's15-bottom'), w: 300, h: 60 }),
        // Bias 0.75
        box('s15-top2', 'Top Ref 2', 800, 220, 300, 80, 'rgba(124,92,191,0.2)'),
        box('s15-bottom2', 'Bottom Ref 2', 800, 600, 300, 80, 'rgba(255,165,0,0.2)'),
        el(`<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:rgba(124,92,191,0.2);border:2px dashed ${C.accent2};border-radius:8px;font-family:${FONT};font-size:14px;color:${C.text};">placeBetween bias:0.75</div>`,
          { id: 's15-between-biased', x: 800, y: placeBetween('s15-top2', 's15-bottom2', { bias: 0.75 }), w: 300, h: 60 }),
        // Tight gap (barely fits)
        box('s15-tight-top', 'Tight Top', 1350, 400, 250, 80, 'rgba(200,200,0,0.2)'),
        box('s15-tight-bot', 'Tight Bot', 1350, 560, 250, 80, 'rgba(200,200,0,0.2)'),
        el(`<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:rgba(200,200,0,0.15);border:1px dashed ${C.textSec};border-radius:4px;font-family:${FONT};font-size:12px;color:${C.text};">Tight fit</div>`,
          { id: 's15-tight-mid', x: 1350, y: placeBetween('s15-tight-top', 's15-tight-bot'), w: 250, h: 50 }),
      ],
    },

    // ================================================================
    // SLIDE 16: Empty and Minimal Elements
    // ================================================================
    {
      id: 'empty-minimal',
      background: C.bg,
      elements: [
        title('Empty & Minimal Elements', 's16-title', { x: safe.x, y: safe.y }),
        // Empty HTML string
        label('Empty HTML ↓', 's16-lbl1', { x: 200, y: 200, w: 200, h: 24 }),
        el('', { id: 's16-empty', x: 200, y: 240, w: 200, h: 50, style: { background: 'rgba(255,0,0,0.1)', border: '1px dashed rgba(255,255,255,0.2)' } }),
        // Near-zero size
        label('1×1 pixel ↓', 's16-lbl2', { x: 500, y: 200, w: 200, h: 24 }),
        el(`<div style="background:${C.accent3};"></div>`, { id: 's16-tiny', x: 500, y: 240, w: 1, h: 1 }),
        // No explicit w or h (auto-measured)
        label('Auto-measured ↓', 's16-lbl3', { x: 700, y: 200, w: 200, h: 24 }),
        el(`<span style="font-family:${FONT};font-size:16px;color:${C.accent4};">Auto sized text</span>`,
          { id: 's16-auto', x: 700, y: 240 }),
        // Empty group
        label('Empty group ↓', 's16-lbl4', { x: 1000, y: 200, w: 200, h: 24 }),
        group([], { id: 's16-empty-group', x: 1000, y: 240 }),
        // Visible marker after empty group to confirm rendering continues
        el(`<div style="background:${C.accent1};border-radius:50%;width:100%;height:100%;"></div>`,
          { id: 's16-after-empty', x: 1000, y: 280, w: 16, h: 16 }),
      ],
    },

    // ================================================================
    // SLIDE 17: Mixed Stacks + Connectors
    // ================================================================
    {
      id: 'stacks-connectors',
      background: C.bg,
      elements: [
        title('Mixed Stacks + Connectors', 's17-title', { x: safe.x, y: safe.y }),
        hstack([
          vstack([
            box('s17-a1', 'A1', 0, 0, 180, 60, 'rgba(0,212,255,0.15)'),
            box('s17-a2', 'A2', 0, 0, 180, 60, 'rgba(0,212,255,0.15)'),
            box('s17-a3', 'A3', 0, 0, 180, 60, 'rgba(0,212,255,0.15)'),
          ], { id: 's17-vs1', gap: 16 }),
          vstack([
            box('s17-b1', 'B1', 0, 0, 180, 60, 'rgba(124,92,191,0.15)'),
            box('s17-b2', 'B2', 0, 0, 180, 60, 'rgba(124,92,191,0.15)'),
            box('s17-b3', 'B3', 0, 0, 180, 60, 'rgba(124,92,191,0.15)'),
          ], { id: 's17-vs2', gap: 16 }),
          vstack([
            box('s17-c1', 'C1', 0, 0, 180, 60, 'rgba(255,107,157,0.15)'),
            box('s17-c2', 'C2', 0, 0, 180, 60, 'rgba(255,107,157,0.15)'),
            box('s17-c3', 'C3', 0, 0, 180, 60, 'rgba(255,107,157,0.15)'),
          ], { id: 's17-vs3', gap: 16 }),
        ], { id: 's17-hstack', x: 300, y: 220, gap: 120 }),
        // Connectors between elements in different stacks
        connect('s17-a1', 's17-b1', { id: 's17-conn1', type: 'straight', arrow: 'end', color: C.accent1, fromAnchor: 'cr', toAnchor: 'cl' }),
        connect('s17-a2', 's17-b3', { id: 's17-conn2', type: 'elbow', arrow: 'end', color: C.accent2, fromAnchor: 'cr', toAnchor: 'cl' }),
        connect('s17-b1', 's17-c2', { id: 's17-conn3', type: 'curved', arrow: 'both', color: C.accent3, fromAnchor: 'cr', toAnchor: 'cl' }),
        connect('s17-a3', 's17-c3', { id: 's17-conn4', type: 'elbow', arrow: 'end', color: C.accent4, fromAnchor: 'cr', toAnchor: 'cl', dash: '6 4' }),
        connect('s17-c1', 's17-a3', { id: 's17-conn5', type: 'elbow', arrow: 'end', color: C.text, fromAnchor: 'cl', toAnchor: 'cr', label: 'cross-stack' }),
      ],
    },

    // ================================================================
    // SLIDE 18: Multiple Transforms on Same Elements
    // ================================================================
    {
      id: 'multi-transforms',
      background: C.bg,
      elements: [
        title('Multiple Transforms on Same Elements', 's18-title', { x: safe.x, y: safe.y }),
        label('Elements share across 3 transform groups', 's18-lbl', { x: 150, y: 190, w: 600, h: 30 }),
        box('s18-a', 'A (all 3)', 200, 300, 140, 60, 'rgba(0,212,255,0.2)'),
        box('s18-b', 'B (align+dist)', 400, 350, 180, 90, 'rgba(124,92,191,0.2)'),
        box('s18-c', 'C (align+match)', 650, 280, 120, 50, 'rgba(255,107,157,0.2)'),
        box('s18-d', 'D (dist+match)', 900, 320, 160, 70, 'rgba(0,255,136,0.2)'),
        box('s18-e', 'E (dist only)', 1100, 340, 150, 80, 'rgba(255,165,0,0.2)'),
        // Second row — separate transform set
        box('s18-f', 'F', 300, 650, 160, 60, 'rgba(0,212,255,0.15)'),
        box('s18-g', 'G', 600, 700, 200, 90, 'rgba(124,92,191,0.15)'),
        box('s18-h', 'H', 900, 670, 140, 50, 'rgba(255,107,157,0.15)'),
      ],
      transforms: [
        // Group 1: alignTop — A, B, C (A is in all 3)
        alignTop(['s18-a', 's18-b', 's18-c']),
        // Group 2: distributeH — A, B, D, E
        distributeH(['s18-a', 's18-b', 's18-d', 's18-e'], { startX: 200, endX: 1700 }),
        // Group 3: matchHeight — A, C, D
        matchHeight(['s18-a', 's18-c', 's18-d']),
        // Group 4: alignCenterV on second row
        alignCenterV(['s18-f', 's18-g', 's18-h']),
      ],
    },

  ];

  return await render(slides);
}

// connector_demo.ts — Connector Improvements Demo Deck
// Showcases obstacle avoidance, port spreading, rounded elbows,
// label placement, and new connector API features.

import {
  init, render, safeRect,
  el, below, rightOf, leftOf,
  centerHWith, alignTopWith,
  panel, hstack, vstack, connect,
} from '../../slidekit/dist/slidekit.bundle.js';

import type { SlideDefinition, SlideElement } from '../../slidekit/src/types.js';

// -- Design Tokens ------------------------------------------------------------

const C = {
  bg:      '#0a0a1a',
  accent1: '#00d4ff',
  accent2: '#7c5cbf',
  accent3: '#ff6b9d',
  accent4: '#00ff88',
  accent5: '#ffaa33',
  text:    '#ffffff',
  textSec: 'rgba(255,255,255,0.65)',
  glass:   'rgba(255,255,255,0.06)',
  glassBr: 'rgba(255,255,255,0.10)',
};

const box = (id: string, label: string, x: number, y: number, opts: any = {}): SlideElement =>
  panel([
    el(`<div style="font-size:22px;font-weight:600;color:${C.text};text-align:center">${label}</div>`, { id: `${id}-lbl` }),
  ], {
    id,
    x, y, w: opts.w || 180, h: opts.h || 70,
    fill: opts.fill || C.glass,
    border: `1px solid ${opts.borderColor || C.glassBr}`,
    radius: 12,
    padding: 'sm',
    anchor: opts.anchor || 'tc',
  });

const title = (text: string, y?: number): SlideElement =>
  el(`<h1 style="font-size:52px;font-weight:700;color:${C.text};margin:0">${text}</h1>`, {
    id: 'title', x: 960, y: y || 60, anchor: 'tc', layer: 'bg',
  });

const subtitle = (text: string): SlideElement =>
  el(`<p style="font-size:24px;color:${C.textSec};margin:0">${text}</p>`, {
    id: 'subtitle', y: below('title', { gap: 8 }), x: centerHWith('title'), layer: 'bg',
  });

// =============================================================================
// Slide 1: Title Slide
// =============================================================================

const slide1: SlideDefinition = {
  id: 'title-slide',
  background: C.bg,
  elements: [
    el(`<h1 style="font-size:72px;font-weight:700;color:${C.accent1};margin:0;text-align:center">
      Connector Improvements
    </h1>`, { id: 'hero-title', x: 960, y: 250, anchor: 'cc' }),

    el(`<p style="font-size:28px;color:${C.textSec};margin:0;text-align:center">
      Obstacle Avoidance · Port Spreading · Rounded Elbows · Smart Labels
    </p>`, { id: 'hero-sub', x: 960, y: 400, anchor: 'cc' }),

    // Decorative connector demo: fan-out with rounded elbows
    box('t-hub', 'Hub', 960, 650, { w: 180, h: 80, fill: 'rgba(0,212,255,0.12)', borderColor: C.accent1 }),
    box('t-d1', 'Service A', 500, 850, { w: 160, h: 65 }),
    box('t-d2', 'Service B', 960, 850, { w: 160, h: 65 }),
    box('t-d3', 'Service C', 1420, 850, { w: 160, h: 65 }),

    connect('t-hub', 't-d1', {
      id: 't-c1', type: 'elbow', arrow: 'end', color: C.accent1,
      fromAnchor: 'bc', toAnchor: 'tc', cornerRadius: 12, thickness: 2,
    }),
    connect('t-hub', 't-d2', {
      id: 't-c2', type: 'elbow', arrow: 'end', color: C.accent4,
      fromAnchor: 'bc', toAnchor: 'tc', cornerRadius: 12, thickness: 2,
    }),
    connect('t-hub', 't-d3', {
      id: 't-c3', type: 'elbow', arrow: 'end', color: C.accent2,
      fromAnchor: 'bc', toAnchor: 'tc', cornerRadius: 12, thickness: 2,
    }),
  ],
};

// =============================================================================
// Slide 2: Obstacle Avoidance
// =============================================================================

const slide2: SlideDefinition = {
  id: 'obstacle-avoidance',
  background: C.bg,
  elements: [
    title('Obstacle Avoidance'),
    subtitle('Connectors automatically route around other elements on the slide'),

    // Demo 1: horizontal route with obstacle in the way
    box('s2-src1', 'API Server', 250, 300, { w: 200, h: 80 }),
    panel([
      el(`<div style="font-size:20px;color:${C.accent3};text-align:center">🛡️ Cache</div>`, { id: 's2-obs1-lbl' }),
    ], {
      id: 's2-obs1', x: 680, y: 260, w: 180, h: 160,
      fill: 'rgba(255,107,157,0.10)', border: `2px dashed ${C.accent3}`,
      radius: 8, padding: 'sm', anchor: 'tc',
    }),
    box('s2-dst1', 'Database', 1100, 300, { w: 200, h: 80 }),

    connect('s2-src1', 's2-dst1', {
      id: 's2-c1', type: 'elbow', arrow: 'end', color: C.accent1, thickness: 3,
      fromAnchor: 'cr', toAnchor: 'cl', cornerRadius: 12,
      label: 'routes around cache', labelPosition: 0.5,
      labelStyle: { color: C.accent1, fontSize: '18px' },
    }),

    // Demo 2: vertical route with obstacle
    box('s2-top', 'Controller', 1550, 250, { w: 220, h: 80 }),
    panel([
      el(`<div style="font-size:16px;color:${C.accent3};text-align:center">🔒 Auth</div>`, { id: 's2-auth-lbl' }),
    ], {
      id: 's2-auth', x: 1600, y: 420, w: 160, h: 100,
      fill: 'rgba(255,107,157,0.10)', border: `2px dashed ${C.accent3}`,
      radius: 8, padding: 'sm', anchor: 'tc',
    }),
    box('s2-bot', 'Repository', 1550, 640, { w: 220, h: 80 }),

    connect('s2-top', 's2-bot', {
      id: 's2-c2', type: 'elbow', arrow: 'end', color: C.accent4, thickness: 3,
      fromAnchor: 'bc', toAnchor: 'tc', cornerRadius: 12,
    }),

    // Demo 3 (bottom): comparison — direct path without obstacle
    box('s2-src3', 'View', 300, 700, { w: 200, h: 80 }),
    box('s2-dst3', 'Model', 800, 700, { w: 200, h: 80 }),
    connect('s2-src3', 's2-dst3', {
      id: 's2-c3', type: 'elbow', arrow: 'both', color: C.accent5, thickness: 3,
      fromAnchor: 'cr', toAnchor: 'cl', cornerRadius: 12,
      label: 'direct — no obstacles', labelPosition: 0.5,
      labelStyle: { color: C.accent5, fontSize: '18px' },
    }),
  ],
};

// =============================================================================
// Slide 3: Port Spreading
// =============================================================================

const slide3: SlideDefinition = {
  id: 'port-spreading',
  background: C.bg,
  elements: [
    title('Port Spreading'),
    subtitle('Multiple connectors from the same edge spread out to avoid overlap'),

    // Left: fan-out from bottom
    el(`<p style="font-size:20px;color:${C.accent1};font-weight:600">Fan-Out (bottom edge)</p>`, {
      id: 's3-label1', layer: 'bg', x: 400, y: 200, anchor: 'tc',
    }),
    box('s3-hub', 'Router', 400, 280, { w: 200, h: 80, fill: 'rgba(0,212,255,0.12)', borderColor: C.accent1 }),
    box('s3-d1', 'Node A', 180, 520),
    box('s3-d2', 'Node B', 400, 520),
    box('s3-d3', 'Node C', 620, 520),

    connect('s3-hub', 's3-d1', {
      id: 's3-c1', type: 'elbow', arrow: 'end', color: C.accent1,
      fromAnchor: 'bc', toAnchor: 'tc', cornerRadius: 8,
    }),
    connect('s3-hub', 's3-d2', {
      id: 's3-c2', type: 'elbow', arrow: 'end', color: C.accent4,
      fromAnchor: 'bc', toAnchor: 'tc', cornerRadius: 8,
    }),
    connect('s3-hub', 's3-d3', {
      id: 's3-c3', type: 'elbow', arrow: 'end', color: C.accent2,
      fromAnchor: 'bc', toAnchor: 'tc', cornerRadius: 8,
    }),

    // Right: fan-out from right edge
    el(`<p style="font-size:20px;color:${C.accent4};font-weight:600">Fan-Out (right edge)</p>`, {
      id: 's3-label2', layer: 'bg', x: 1350, y: 200, anchor: 'tc',
    }),
    box('s3-src', 'Gateway', 1100, 400, { w: 200, h: 80, fill: 'rgba(0,255,136,0.12)', borderColor: C.accent4 }),
    box('s3-t1', 'Auth', 1500, 280),
    box('s3-t2', 'Users', 1500, 400),
    box('s3-t3', 'Orders', 1500, 520),

    connect('s3-src', 's3-t1', {
      id: 's3-c4', type: 'elbow', arrow: 'end', color: C.accent1, cornerRadius: 8,
      fromAnchor: 'cr', toAnchor: 'cl',
    }),
    connect('s3-src', 's3-t2', {
      id: 's3-c5', type: 'elbow', arrow: 'end', color: C.accent4, cornerRadius: 8,
      fromAnchor: 'cr', toAnchor: 'cl',
    }),
    connect('s3-src', 's3-t3', {
      id: 's3-c6', type: 'elbow', arrow: 'end', color: C.accent2, cornerRadius: 8,
      fromAnchor: 'cr', toAnchor: 'cl',
    }),

    // Bottom: explicit port ordering
    el(`<p style="font-size:20px;color:${C.accent5};font-weight:600">Explicit Port Ordering</p>`, {
      id: 's3-label3', layer: 'bg', x: 960, y: 620, anchor: 'tc',
    }),
    el(`<p style="font-size:16px;color:${C.textSec}">Use fromPortOrder / toPortOrder to control which port goes where</p>`, {
      id: 's3-hint', layer: 'bg', y: below('s3-label3', { gap: 4 }), x: centerHWith('s3-label3'),
    }),

    box('s3-ctrl', 'Controller', 700, 730, { w: 220, h: 80, fill: 'rgba(255,170,51,0.12)', borderColor: C.accent5 }),
    box('s3-svc1', 'Service A', 1100, 700),
    box('s3-svc2', 'Service B', 1100, 840),

    connect('s3-ctrl', 's3-svc1', {
      id: 's3-c7', type: 'elbow', arrow: 'end', color: C.accent5, cornerRadius: 8,
      fromAnchor: 'cr', toAnchor: 'cl',
      fromPortOrder: 0, label: 'order: 0',
      labelStyle: { color: C.accent5, fontSize: '14px' },
    }),
    connect('s3-ctrl', 's3-svc2', {
      id: 's3-c8', type: 'elbow', arrow: 'end', color: C.accent3, cornerRadius: 8,
      fromAnchor: 'cr', toAnchor: 'cl',
      fromPortOrder: 1, label: 'order: 1',
      labelStyle: { color: C.accent3, fontSize: '14px' },
    }),
  ],
};

// =============================================================================
// Slide 4: Rounded Elbows
// =============================================================================

const slide4: SlideDefinition = {
  id: 'rounded-elbows',
  background: C.bg,
  elements: [
    title('Rounded Elbow Corners'),
    subtitle('Corner radius adds smooth curves at elbow bends via SVG arcs'),

    // Row of comparisons: no radius vs small vs large
    el(`<p style="font-size:18px;color:${C.textSec}">cornerRadius: 0</p>`, {
      id: 's4-lbl0', layer: 'bg', x: 250, y: 230, anchor: 'tc',
    }),
    box('s4-a0', 'A', 150, 300),
    box('s4-b0', 'B', 350, 500),
    connect('s4-a0', 's4-b0', {
      id: 's4-r0', type: 'orthogonal', arrow: 'end', color: C.textSec, thickness: 2,
      fromAnchor: 'bc', toAnchor: 'cl',
    }),

    el(`<p style="font-size:18px;color:${C.accent1}">cornerRadius: 8</p>`, {
      id: 's4-lbl8', layer: 'bg', x: 600, y: 230, anchor: 'tc',
    }),
    box('s4-a8', 'A', 500, 300),
    box('s4-b8', 'B', 700, 500),
    connect('s4-a8', 's4-b8', {
      id: 's4-r8', type: 'orthogonal', arrow: 'end', color: C.accent1, thickness: 2,
      fromAnchor: 'bc', toAnchor: 'cl', cornerRadius: 8,
    }),

    el(`<p style="font-size:18px;color:${C.accent4}">cornerRadius: 16</p>`, {
      id: 's4-lbl16', layer: 'bg', x: 950, y: 230, anchor: 'tc',
    }),
    box('s4-a16', 'A', 850, 300),
    box('s4-b16', 'B', 1050, 500),
    connect('s4-a16', 's4-b16', {
      id: 's4-r16', type: 'orthogonal', arrow: 'end', color: C.accent4, thickness: 2,
      fromAnchor: 'bc', toAnchor: 'cl', cornerRadius: 16,
    }),

    el(`<p style="font-size:18px;color:${C.accent3}">cornerRadius: 30</p>`, {
      id: 's4-lbl30', layer: 'bg', x: 1300, y: 230, anchor: 'tc',
    }),
    box('s4-a30', 'A', 1200, 300),
    box('s4-b30', 'B', 1400, 500),
    connect('s4-a30', 's4-b30', {
      id: 's4-r30', type: 'orthogonal', arrow: 'end', color: C.accent3, thickness: 2,
      fromAnchor: 'bc', toAnchor: 'cl', cornerRadius: 30,
    }),

    // Z-bend with rounded corners
    el(`<p style="font-size:20px;color:${C.accent2};font-weight:600">Multi-bend with Rounded Corners</p>`, {
      id: 's4-multi-lbl', layer: 'bg', x: 960, y: 630, anchor: 'tc',
    }),
    box('s4-m1', 'Frontend', 400, 720, { w: 200, h: 80, fill: 'rgba(124,92,191,0.15)', borderColor: C.accent2 }),
    box('s4-m2', 'Backend', 1350, 860, { w: 200, h: 80, fill: 'rgba(124,92,191,0.15)', borderColor: C.accent2 }),
    connect('s4-m1', 's4-m2', {
      id: 's4-mc', type: 'orthogonal', arrow: 'end', color: C.accent2, thickness: 3,
      fromAnchor: 'cr', toAnchor: 'cl', cornerRadius: 14,
      label: 'API calls', labelPosition: 0.5,
      labelStyle: { color: C.accent2, fontSize: '18px', fontWeight: '600' },
    }),

    // Right side: backward elbow with radius
    box('s4-bk1', 'Response', 1650, 720, { w: 160, h: 70 }),
    box('s4-bk2', 'Request', 1650, 900, { w: 160, h: 70 }),
    connect('s4-bk2', 's4-bk1', {
      id: 's4-bkc', type: 'orthogonal', arrow: 'end', color: C.accent5, thickness: 2,
      fromAnchor: 'tc', toAnchor: 'bc', cornerRadius: 12,
      label: 'returns',
      labelStyle: { color: C.accent5, fontSize: '15px' },
    }),
  ],
};

// =============================================================================
// Slide 5: Label Placement
// =============================================================================

const slide5: SlideDefinition = {
  id: 'label-placement',
  background: C.bg,
  elements: [
    title('Smart Label Placement'),
    subtitle('Labels follow the path and can be positioned at any point along it'),

    // labelPosition comparison
    el(`<p style="font-size:18px;color:${C.accent1}">labelPosition: 0.0 (start)</p>`, {
      id: 's5-lp0', layer: 'bg', x: 300, y: 230, anchor: 'tc',
    }),
    box('s5-a0', 'A', 150, 320),
    box('s5-b0', 'B', 450, 500),
    connect('s5-a0', 's5-b0', {
      id: 's5-c0', type: 'elbow', arrow: 'end', color: C.accent1, thickness: 2,
      fromAnchor: 'cr', toAnchor: 'tc', cornerRadius: 10,
      label: 'near start', labelPosition: 0.15,
      labelStyle: { color: C.accent1, fontSize: '15px' },
    }),

    el(`<p style="font-size:18px;color:${C.accent4}">labelPosition: 0.5 (mid)</p>`, {
      id: 's5-lp5', layer: 'bg', x: 750, y: 230, anchor: 'tc',
    }),
    box('s5-a5', 'A', 600, 320),
    box('s5-b5', 'B', 900, 500),
    connect('s5-a5', 's5-b5', {
      id: 's5-c5', type: 'elbow', arrow: 'end', color: C.accent4, thickness: 2,
      fromAnchor: 'cr', toAnchor: 'tc', cornerRadius: 10,
      label: 'midpoint', labelPosition: 0.5,
      labelStyle: { color: C.accent4, fontSize: '15px' },
    }),

    el(`<p style="font-size:18px;color:${C.accent3}">labelPosition: 1.0 (end)</p>`, {
      id: 's5-lp1', layer: 'bg', x: 1200, y: 230, anchor: 'tc',
    }),
    box('s5-a1', 'A', 1050, 320),
    box('s5-b1', 'B', 1350, 500),
    connect('s5-a1', 's5-b1', {
      id: 's5-c1', type: 'elbow', arrow: 'end', color: C.accent3, thickness: 2,
      fromAnchor: 'cr', toAnchor: 'tc', cornerRadius: 10,
      label: 'near end', labelPosition: 0.85,
      labelStyle: { color: C.accent3, fontSize: '15px' },
    }),

    // Label offset demo
    el(`<p style="font-size:20px;color:${C.accent2};font-weight:600">Label Offset</p>`, {
      id: 's5-off-lbl', layer: 'bg', x: 1650, y: 230, anchor: 'tc',
    }),
    box('s5-ao', 'X', 1550, 320),
    box('s5-bo', 'Y', 1750, 500),
    connect('s5-ao', 's5-bo', {
      id: 's5-co', type: 'elbow', arrow: 'end', color: C.accent2, thickness: 2,
      fromAnchor: 'bc', toAnchor: 'cl', cornerRadius: 10,
      label: 'offset applied', labelPosition: 0.5,
      labelOffset: { x: 0, y: -20 },
      labelStyle: { color: C.accent2, fontSize: '15px' },
    }),

    // Bottom: straight + curved label placement
    el(`<p style="font-size:20px;color:${C.accent5};font-weight:600">Labels on All Connector Types</p>`, {
      id: 's5-types-lbl', layer: 'bg', x: 960, y: 620, anchor: 'tc',
    }),

    box('s5-ts', 'A', 200, 760),
    box('s5-td', 'B', 550, 760),
    connect('s5-ts', 's5-td', {
      id: 's5-str', type: 'straight', arrow: 'end', color: C.accent1, thickness: 2,
      fromAnchor: 'cr', toAnchor: 'cl',
      label: 'straight', labelPosition: 0.5,
      labelStyle: { color: C.accent1, fontSize: '16px' },
    }),

    box('s5-cs', 'C', 750, 760),
    box('s5-cd', 'D', 1100, 760),
    connect('s5-cs', 's5-cd', {
      id: 's5-curv', type: 'curved', arrow: 'end', color: C.accent4, thickness: 2,
      fromAnchor: 'cr', toAnchor: 'cl',
      label: 'curved', labelPosition: 0.5,
      labelStyle: { color: C.accent4, fontSize: '16px' },
    }),

    box('s5-es', 'E', 1300, 720),
    box('s5-ed', 'F', 1650, 880),
    connect('s5-es', 's5-ed', {
      id: 's5-elb', type: 'elbow', arrow: 'end', color: C.accent3, thickness: 2,
      fromAnchor: 'cr', toAnchor: 'cl', cornerRadius: 12,
      label: 'elbow', labelPosition: 0.5,
      labelStyle: { color: C.accent3, fontSize: '16px' },
    }),
  ],
};

// =============================================================================
// Slide 6: Architecture Diagram (real-world use case)
// =============================================================================

const slide6: SlideDefinition = {
  id: 'architecture-demo',
  background: C.bg,
  elements: [
    title('Architecture Diagram', 40),
    el(`<p style="font-size:22px;color:${C.textSec};margin:0">A realistic diagram using all connector improvements together</p>`, {
      id: 'arch-sub', layer: 'bg', y: below('title', { gap: 6 }), x: centerHWith('title'),
    }),

    // Top tier: clients
    box('arch-web', '🌐 Web App', 350, 180, { w: 200, h: 80, fill: 'rgba(0,212,255,0.12)', borderColor: C.accent1 }),
    box('arch-mobile', '📱 Mobile', 750, 180, { w: 200, h: 80, fill: 'rgba(0,212,255,0.12)', borderColor: C.accent1 }),
    box('arch-cli', '⌨️ CLI', 1150, 180, { w: 200, h: 80, fill: 'rgba(0,212,255,0.12)', borderColor: C.accent1 }),

    // API Gateway
    box('arch-gw', '🔀 API Gateway', 750, 370, { w: 260, h: 90, fill: 'rgba(0,255,136,0.12)', borderColor: C.accent4 }),

    // Services tier
    box('arch-auth', '🔐 Auth', 250, 570, { w: 200, h: 80, fill: 'rgba(124,92,191,0.15)', borderColor: C.accent2 }),
    box('arch-users', '👥 Users', 600, 570, { w: 200, h: 80, fill: 'rgba(124,92,191,0.15)', borderColor: C.accent2 }),
    box('arch-orders', '📦 Orders', 950, 570, { w: 200, h: 80, fill: 'rgba(124,92,191,0.15)', borderColor: C.accent2 }),
    box('arch-notify', '🔔 Notify', 1300, 570, { w: 200, h: 80, fill: 'rgba(124,92,191,0.15)', borderColor: C.accent2 }),

    // Data tier
    box('arch-pg', '🐘 PostgreSQL', 400, 800, { w: 220, h: 80, fill: 'rgba(255,107,157,0.12)', borderColor: C.accent3 }),
    box('arch-redis', '⚡ Redis', 800, 800, { w: 200, h: 80, fill: 'rgba(255,107,157,0.12)', borderColor: C.accent3 }),
    box('arch-queue', '📬 Queue', 1200, 800, { w: 200, h: 80, fill: 'rgba(255,107,157,0.12)', borderColor: C.accent3 }),

    // Clients → Gateway (fan-in to top of gateway, port spreading)
    connect('arch-web', 'arch-gw', {
      id: 'arch-c1', type: 'elbow', arrow: 'end', color: C.accent1, cornerRadius: 10,
      fromAnchor: 'bc', toAnchor: 'tc', thickness: 2,
    }),
    connect('arch-mobile', 'arch-gw', {
      id: 'arch-c2', type: 'elbow', arrow: 'end', color: C.accent1, cornerRadius: 10,
      fromAnchor: 'bc', toAnchor: 'tc', thickness: 2,
    }),
    connect('arch-cli', 'arch-gw', {
      id: 'arch-c3', type: 'elbow', arrow: 'end', color: C.accent1, cornerRadius: 10,
      fromAnchor: 'bc', toAnchor: 'tc', thickness: 2,
    }),

    // Gateway → Services (fan-out from bottom, port spreading)
    connect('arch-gw', 'arch-auth', {
      id: 'arch-c4', type: 'elbow', arrow: 'end', color: C.accent4, cornerRadius: 10,
      fromAnchor: 'bc', toAnchor: 'tc', thickness: 2,
      label: 'auth', labelStyle: { color: C.accent4, fontSize: '13px' },
    }),
    connect('arch-gw', 'arch-users', {
      id: 'arch-c5', type: 'elbow', arrow: 'end', color: C.accent4, cornerRadius: 10,
      fromAnchor: 'bc', toAnchor: 'tc', thickness: 2,
      label: 'CRUD', labelStyle: { color: C.accent4, fontSize: '13px' },
    }),
    connect('arch-gw', 'arch-orders', {
      id: 'arch-c6', type: 'elbow', arrow: 'end', color: C.accent4, cornerRadius: 10,
      fromAnchor: 'bc', toAnchor: 'tc', thickness: 2,
      label: 'orders', labelStyle: { color: C.accent4, fontSize: '13px' },
    }),
    connect('arch-gw', 'arch-notify', {
      id: 'arch-c7', type: 'elbow', arrow: 'end', color: C.accent4, cornerRadius: 10,
      fromAnchor: 'bc', toAnchor: 'tc', thickness: 2,
      label: 'push', labelStyle: { color: C.accent4, fontSize: '13px' },
    }),

    // Services → Data (various connections)
    connect('arch-auth', 'arch-pg', {
      id: 'arch-c8', type: 'elbow', arrow: 'end', color: C.accent3, cornerRadius: 8,
      fromAnchor: 'bc', toAnchor: 'tc', thickness: 1,
    }),
    connect('arch-users', 'arch-pg', {
      id: 'arch-c9', type: 'elbow', arrow: 'end', color: C.accent3, cornerRadius: 8,
      fromAnchor: 'bc', toAnchor: 'tc', thickness: 1,
    }),
    connect('arch-orders', 'arch-pg', {
      id: 'arch-c10', type: 'elbow', arrow: 'end', color: C.accent3, cornerRadius: 8,
      fromAnchor: 'bc', toAnchor: 'tc', thickness: 1, dash: '4 3',
    }),
    connect('arch-users', 'arch-redis', {
      id: 'arch-c11', type: 'elbow', arrow: 'end', color: C.accent5, cornerRadius: 8,
      fromAnchor: 'bc', toAnchor: 'tc', thickness: 1,
      label: 'cache', labelStyle: { color: C.accent5, fontSize: '12px' },
    }),
    connect('arch-orders', 'arch-queue', {
      id: 'arch-c12', type: 'elbow', arrow: 'end', color: C.accent5, cornerRadius: 8,
      fromAnchor: 'bc', toAnchor: 'tc', thickness: 1,
    }),
    connect('arch-notify', 'arch-queue', {
      id: 'arch-c13', type: 'elbow', arrow: 'both', color: C.accent5, cornerRadius: 8,
      fromAnchor: 'bc', toAnchor: 'tc', thickness: 1,
      label: 'pub/sub', labelStyle: { color: C.accent5, fontSize: '12px' },
    }),

    // Cross-service communication
    connect('arch-auth', 'arch-redis', {
      id: 'arch-c14', type: 'elbow', arrow: 'end', color: 'rgba(255,255,255,0.3)', cornerRadius: 8,
      fromAnchor: 'cr', toAnchor: 'cl', thickness: 1, dash: '3 3',
      label: 'sessions', labelStyle: { color: C.textSec, fontSize: '12px' },
    }),
  ],
};

// =============================================================================
// Slide 7: Connector Types Comparison
// =============================================================================

const slide7: SlideDefinition = {
  id: 'connector-types',
  background: C.bg,
  elements: [
    title('Connector Types & Styles'),
    subtitle('Straight, curved, elbow, and orthogonal connectors with various styling options'),

    // Row 1: types — 4 columns at x ≈ 250, 650, 1050, 1500
    el(`<p style="font-size:22px;color:${C.accent1};font-weight:600">Straight</p>`, {
      id: 's7-t1', layer: 'bg', x: 270, y: 220, anchor: 'tc',
    }),
    box('s7-a1', 'A', 160, 300),
    box('s7-b1', 'B', 380, 450),
    connect('s7-a1', 's7-b1', {
      id: 's7-sc', type: 'straight', arrow: 'end', color: C.accent1, thickness: 3,
      fromAnchor: 'cr', toAnchor: 'cl',
    }),

    el(`<p style="font-size:22px;color:${C.accent2};font-weight:600">Curved</p>`, {
      id: 's7-t2', layer: 'bg', x: 680, y: 220, anchor: 'tc',
    }),
    box('s7-a2', 'A', 570, 300),
    box('s7-b2', 'B', 790, 450),
    connect('s7-a2', 's7-b2', {
      id: 's7-cv', type: 'curved', arrow: 'end', color: C.accent2, thickness: 3,
      fromAnchor: 'cr', toAnchor: 'cl',
    }),

    el(`<p style="font-size:22px;color:${C.accent4};font-weight:600">Elbow</p>`, {
      id: 's7-t3', layer: 'bg', x: 1090, y: 220, anchor: 'tc',
    }),
    box('s7-a3', 'A', 980, 300),
    box('s7-b3', 'B', 1200, 450),
    connect('s7-a3', 's7-b3', {
      id: 's7-el', type: 'elbow', arrow: 'end', color: C.accent4, thickness: 3,
      fromAnchor: 'bc', toAnchor: 'cl', cornerRadius: 12,
    }),

    el(`<p style="font-size:22px;color:${C.accent3};font-weight:600">Orthogonal</p>`, {
      id: 's7-t4', layer: 'bg', x: 1650, y: 220, anchor: 'tc',
    }),
    box('s7-a4', 'A', 1550, 290),
    box('s7-b4', 'B', 1750, 450),
    connect('s7-a4', 's7-b4', {
      id: 's7-er', type: 'orthogonal', arrow: 'end', color: C.accent3, thickness: 3,
      fromAnchor: 'bc', toAnchor: 'tc', cornerRadius: 12,
    }),

    // Row 2: arrow types and styles
    el(`<p style="font-size:22px;color:${C.text};font-weight:600">Arrow Styles</p>`, {
      id: 's7-arr-lbl', layer: 'bg', x: 400, y: 610, anchor: 'tc',
    }),
    box('s7-n1', '→ end', 180, 680),
    box('s7-n2', '← start', 430, 680),
    connect('s7-n1', 's7-n2', {
      id: 's7-ae', type: 'straight', arrow: 'end', color: C.accent1, thickness: 2,
      fromAnchor: 'cr', toAnchor: 'cl', label: 'end',
      labelStyle: { color: C.accent1, fontSize: '14px' },
    }),

    box('s7-n3', '↔ both', 180, 810),
    box('s7-n4', '— none', 430, 810),
    connect('s7-n3', 's7-n4', {
      id: 's7-ab', type: 'straight', arrow: 'both', color: C.accent4, thickness: 2,
      fromAnchor: 'cr', toAnchor: 'cl', label: 'both',
      labelStyle: { color: C.accent4, fontSize: '14px' },
    }),

    box('s7-n5', 'start', 180, 940),
    box('s7-n6', 'target', 430, 940),
    connect('s7-n5', 's7-n6', {
      id: 's7-an', type: 'straight', arrow: 'none', color: C.textSec, thickness: 2,
      fromAnchor: 'cr', toAnchor: 'cl', label: 'none',
      labelStyle: { color: C.textSec, fontSize: '14px' },
    }),

    // Dash patterns
    el(`<p style="font-size:22px;color:${C.text};font-weight:600">Dash Patterns</p>`, {
      id: 's7-dash-lbl', layer: 'bg', x: 900, y: 610, anchor: 'tc',
    }),
    box('s7-d1', 'Solid', 750, 700),
    box('s7-d2', 'End', 1050, 700),
    connect('s7-d1', 's7-d2', {
      id: 's7-ds', type: 'straight', arrow: 'end', color: C.accent1, thickness: 2,
      fromAnchor: 'cr', toAnchor: 'cl',
    }),
    box('s7-d3', 'Dashed', 750, 830),
    box('s7-d4', 'End', 1050, 830),
    connect('s7-d3', 's7-d4', {
      id: 's7-dd', type: 'straight', arrow: 'end', color: C.accent2, thickness: 2,
      fromAnchor: 'cr', toAnchor: 'cl', dash: '8 4',
    }),
    box('s7-d5', 'Dotted', 750, 960),
    box('s7-d6', 'End', 1050, 960),
    connect('s7-d5', 's7-d6', {
      id: 's7-dt', type: 'straight', arrow: 'end', color: C.accent3, thickness: 2,
      fromAnchor: 'cr', toAnchor: 'cl', dash: '2 4',
    }),

    // Thickness
    el(`<p style="font-size:22px;color:${C.text};font-weight:600">Thickness</p>`, {
      id: 's7-thick-lbl', layer: 'bg', x: 1450, y: 610, anchor: 'tc',
    }),
    box('s7-th1', 'Thin', 1300, 700, { w: 120, h: 60 }),
    box('s7-th2', 'End', 1600, 700, { w: 120, h: 60 }),
    connect('s7-th1', 's7-th2', {
      id: 's7-t1c', type: 'straight', arrow: 'end', color: C.accent4, thickness: 1,
      fromAnchor: 'cr', toAnchor: 'cl', label: '1px',
      labelStyle: { color: C.accent4, fontSize: '13px' },
    }),
    box('s7-th3', 'Medium', 1300, 830, { w: 120, h: 60 }),
    box('s7-th4', 'End', 1600, 830, { w: 120, h: 60 }),
    connect('s7-th3', 's7-th4', {
      id: 's7-t2c', type: 'straight', arrow: 'end', color: C.accent5, thickness: 3,
      fromAnchor: 'cr', toAnchor: 'cl', label: '3px',
      labelStyle: { color: C.accent5, fontSize: '13px' },
    }),
    box('s7-th5', 'Thick', 1300, 960, { w: 120, h: 60 }),
    box('s7-th6', 'End', 1600, 960, { w: 120, h: 60 }),
    connect('s7-th5', 's7-th6', {
      id: 's7-t3c', type: 'straight', arrow: 'end', color: C.accent3, thickness: 5,
      fromAnchor: 'cr', toAnchor: 'cl', label: '5px',
      labelStyle: { color: C.accent3, fontSize: '13px' },
    }),
  ],
};

// =============================================================================
// Init + Render
// =============================================================================

export async function run() {
  await init({
    slide: { w: 1920, h: 1080 },
    safeZone: { left: 80, right: 80, top: 60, bottom: 60 },
    minFontSize: 12,
    fonts: [
      { family: 'Inter', weights: [300, 400, 600, 700], source: 'google' },
    ],
  });

  const slides: SlideDefinition[] = [
    slide1,
    slide2,
    slide3,
    slide4,
    slide5,
    slide6,
    slide7,
  ];

  await render(slides);
}

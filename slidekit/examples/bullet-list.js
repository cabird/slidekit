// bullet-list.js — Slide with heading, accent rule, and formatted bullet list
// Demonstrates: text, rule, bullets (compound primitive), below, nested items

import {
  init, render, safeRect,
  text, rect, rule,
  below, bullets,
} from '../slidekit.js';

export async function run() {
  await init({
    slide: { w: 1920, h: 1080 },
    safeZone: { left: 120, right: 120, top: 90, bottom: 90 },
    minFontSize: 24,
  });

  const safe = safeRect();

  const slides = [{
    id: 'bullet-list',
    background: '#0c0c14',
    elements: [
      rect({
        id: 'bg',
        x: 0, y: 0, w: 1920, h: 1080,
        layer: 'bg',
        style: {
          background: 'linear-gradient(180deg, #0c0c14 0%, #0a1628 50%, #0c1420 100%)',
        },
      }),

      text('Key Capabilities', {
        id: 'heading',
        x: safe.x, y: safe.y, w: safe.w,
        size: 52, weight: 700, color: '#ffffff',
      }),

      rule({
        id: 'heading-rule',
        x: safe.x, y: below('heading', { gap: 16 }),
        w: 80,
        color: '#7c5cbf', thickness: 3,
      }),

      // Bullet list with nested sub-items
      bullets([
        'Absolute positioning with 9-point anchor system',
        'DOM-based text measurement before placement',
        { text: 'Auto-fit text sizing', children: [
          'Binary search between configurable min and max',
          'Projection-readability warnings below 24px',
        ]},
        'Relative positioning helpers (below, rightOf, centerIn...)',
        { text: 'Layout validation and collision detection', children: [
          'Safe zone enforcement with configurable margins',
          'Overlap detection with structured warnings',
        ]},
        'Stack primitives that resolve to absolute coordinates',
      ], {
        id: 'features',
        x: safe.x, y: below('heading-rule', { gap: 40 }),
        w: 1400,
        size: 28,
        color: 'rgba(255,255,255,0.85)',
        bulletColor: '#7c5cbf',
        bulletChar: '\u2022',
        indent: 40,
        gap: 12,
        lineHeight: 1.4,
      }),
    ],
  }];

  return await render(slides);
}

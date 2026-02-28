// alignment-distribution.js — Aligning and distributing elements across the slide
// Demonstrates: alignTop, distributeH, matchWidth, matchSize, fitToRect, transforms array

import {
  init, render, safeRect,
  el,
  below,
  alignTop, distributeH, matchWidth,
} from '../slidekit.js';

export async function run() {
  await init({
    slide: { w: 1920, h: 1080 },
    safeZone: { left: 120, right: 120, top: 90, bottom: 90 },
    minFontSize: 24,
  });

  const safe = safeRect();

  const slides = [{
    id: 'alignment',
    background: '#0c0c14',
    elements: [
      el('<p style="font:700 52px Inter;color:#fff">Alignment &amp; Distribution</p>', {
        id: 'heading',
        x: safe.x, y: safe.y, w: safe.w,
      }),

      el('', {
        id: 'heading-rule',
        x: safe.x, y: below('heading', { gap: 16 }),
        w: 80, h: 3,
        style: { background: '#7c5cbf' },
      }),

      // --- Top row: boxes before alignment (different heights, positions) ---
      el('<p style="font:24px Inter;color:rgba(255,255,255,0.5)">Before Transforms</p>', {
        id: 'before-label',
        x: safe.x, y: below('heading-rule', { gap: 32 }),
        w: 300,
      }),

      el('', {
        id: 'box-a',
        x: 200, y: 320, w: 200, h: 150,
        style: {
          background: 'rgba(124,92,191,0.3)',
          border: '2px solid #7c5cbf',
          borderRadius: '8px',
        },
      }),
      el('<p style="font:600 28px Inter;color:#fff;text-align:center">A</p>', { id: 'label-a', x: 280, y: 375, w: 40, anchor: 'cc' }),

      el('', {
        id: 'box-b',
        x: 500, y: 360, w: 180, h: 100,
        style: {
          background: 'rgba(66,133,244,0.3)',
          border: '2px solid #4285f4',
          borderRadius: '8px',
        },
      }),
      el('<p style="font:600 28px Inter;color:#fff;text-align:center">B</p>', { id: 'label-b', x: 570, y: 390, w: 40, anchor: 'cc' }),

      el('', {
        id: 'box-c',
        x: 780, y: 340, w: 220, h: 130,
        style: {
          background: 'rgba(52,168,83,0.3)',
          border: '2px solid #34a853',
          borderRadius: '8px',
        },
      }),
      el('<p style="font:600 28px Inter;color:#fff;text-align:center">C</p>', { id: 'label-c', x: 870, y: 385, w: 40, anchor: 'cc' }),

      // --- Bottom row: same boxes after transforms ---
      el('<p style="font:24px Inter;color:rgba(255,255,255,0.5)">After: alignTop + distributeH + matchWidth</p>', {
        id: 'after-label',
        x: safe.x, y: 560,
        w: 700,
      }),

      el('', {
        id: 'box-d',
        x: 200, y: 620, w: 200, h: 150,
        style: {
          background: 'rgba(124,92,191,0.3)',
          border: '2px solid #7c5cbf',
          borderRadius: '8px',
        },
      }),
      el('<p style="font:600 28px Inter;color:#fff;text-align:center">A</p>', { id: 'label-d', x: 280, y: 675, w: 40, anchor: 'cc' }),

      el('', {
        id: 'box-e',
        x: 500, y: 660, w: 180, h: 100,
        style: {
          background: 'rgba(66,133,244,0.3)',
          border: '2px solid #4285f4',
          borderRadius: '8px',
        },
      }),
      el('<p style="font:600 28px Inter;color:#fff;text-align:center">B</p>', { id: 'label-e', x: 570, y: 690, w: 40, anchor: 'cc' }),

      el('', {
        id: 'box-f',
        x: 780, y: 640, w: 220, h: 130,
        style: {
          background: 'rgba(52,168,83,0.3)',
          border: '2px solid #34a853',
          borderRadius: '8px',
        },
      }),
      el('<p style="font:600 28px Inter;color:#fff;text-align:center">C</p>', { id: 'label-f', x: 870, y: 685, w: 40, anchor: 'cc' }),

      // Explanation
      el('', {
        id: 'info-panel',
        x: 1100, y: 280, w: 650, h: 600,
        style: {
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px',
        },
      }),

      el('<p style="font:600 28px Inter;color:#fff">Transform Operations</p>', {
        id: 'info-title',
        x: 1140, y: 310, w: 570,
      }),

      el('', {
        id: 'info-rule',
        x: 1140, y: below('info-title', { gap: 12 }),
        w: 60, h: 2,
        style: { background: '#7c5cbf' },
      }),

      el('<p style="font:20px Inter;color:rgba(255,255,255,0.6);line-height:1.5">Transforms are PowerPoint-style alignment and distribution operations. They are placed in the <code>transforms</code> array and applied after position resolution.<br><br>&bull; alignTop &mdash; aligns top edges<br>&bull; alignLeft/Right/Bottom &mdash; edge alignment<br>&bull; distributeH/V &mdash; equal spacing<br>&bull; matchWidth/Height/Size &mdash; size matching<br>&bull; fitToRect &mdash; scale to fit a rectangle</p>', {
        id: 'info-desc',
        x: 1140, y: below('info-rule', { gap: 16 }),
        w: 570,
      }),
    ],

    // Transforms applied during layout Phase 3
    transforms: [
      alignTop(['box-d', 'box-e', 'box-f']),
      distributeH(['box-d', 'box-e', 'box-f'], { startX: 200, endX: 1000 }),
      matchWidth(['box-d', 'box-e', 'box-f']),
    ],
  }];

  return await render(slides);
}

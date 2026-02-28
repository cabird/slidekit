// alignment-distribution.js — Aligning and distributing elements across the slide
// Demonstrates: alignTop, distributeH, matchWidth, matchSize, fitToRect, transforms array

import {
  init, render, safeRect,
  text, rect, rule,
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
      text('Alignment & Distribution', {
        id: 'heading',
        x: safe.x, y: safe.y, w: safe.w,
        size: 52, weight: 700, color: '#ffffff',
      }),

      rule({
        id: 'heading-rule',
        x: safe.x, y: below('heading', { gap: 16 }),
        w: 80, color: '#7c5cbf', thickness: 3,
      }),

      // --- Top row: boxes before alignment (different heights, positions) ---
      text('Before Transforms', {
        id: 'before-label',
        x: safe.x, y: below('heading-rule', { gap: 32 }),
        w: 300,
        size: 24, color: 'rgba(255,255,255,0.5)',
      }),

      rect({
        id: 'box-a',
        x: 200, y: 320, w: 200, h: 150,
        style: {
          background: 'rgba(124,92,191,0.3)',
          border: '2px solid #7c5cbf',
          borderRadius: '8px',
        },
      }),
      text('A', { id: 'label-a', x: 280, y: 375, w: 40, size: 28, weight: 600, color: '#fff', anchor: 'cc', align: 'center' }),

      rect({
        id: 'box-b',
        x: 500, y: 360, w: 180, h: 100,
        style: {
          background: 'rgba(66,133,244,0.3)',
          border: '2px solid #4285f4',
          borderRadius: '8px',
        },
      }),
      text('B', { id: 'label-b', x: 570, y: 390, w: 40, size: 28, weight: 600, color: '#fff', anchor: 'cc', align: 'center' }),

      rect({
        id: 'box-c',
        x: 780, y: 340, w: 220, h: 130,
        style: {
          background: 'rgba(52,168,83,0.3)',
          border: '2px solid #34a853',
          borderRadius: '8px',
        },
      }),
      text('C', { id: 'label-c', x: 870, y: 385, w: 40, size: 28, weight: 600, color: '#fff', anchor: 'cc', align: 'center' }),

      // --- Bottom row: same boxes after transforms ---
      text('After: alignTop + distributeH + matchWidth', {
        id: 'after-label',
        x: safe.x, y: 560,
        w: 700,
        size: 24, color: 'rgba(255,255,255,0.5)',
      }),

      rect({
        id: 'box-d',
        x: 200, y: 620, w: 200, h: 150,
        style: {
          background: 'rgba(124,92,191,0.3)',
          border: '2px solid #7c5cbf',
          borderRadius: '8px',
        },
      }),
      text('A', { id: 'label-d', x: 280, y: 675, w: 40, size: 28, weight: 600, color: '#fff', anchor: 'cc', align: 'center' }),

      rect({
        id: 'box-e',
        x: 500, y: 660, w: 180, h: 100,
        style: {
          background: 'rgba(66,133,244,0.3)',
          border: '2px solid #4285f4',
          borderRadius: '8px',
        },
      }),
      text('B', { id: 'label-e', x: 570, y: 690, w: 40, size: 28, weight: 600, color: '#fff', anchor: 'cc', align: 'center' }),

      rect({
        id: 'box-f',
        x: 780, y: 640, w: 220, h: 130,
        style: {
          background: 'rgba(52,168,83,0.3)',
          border: '2px solid #34a853',
          borderRadius: '8px',
        },
      }),
      text('C', { id: 'label-f', x: 870, y: 685, w: 40, size: 28, weight: 600, color: '#fff', anchor: 'cc', align: 'center' }),

      // Explanation
      rect({
        id: 'info-panel',
        x: 1100, y: 280, w: 650, h: 600,
        style: {
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px',
        },
      }),

      text('Transform Operations', {
        id: 'info-title',
        x: 1140, y: 310, w: 570,
        size: 28, weight: 600, color: '#ffffff',
      }),

      rule({
        id: 'info-rule',
        x: 1140, y: below('info-title', { gap: 12 }),
        w: 60, color: '#7c5cbf', thickness: 2,
      }),

      text('Transforms are PowerPoint-style alignment and distribution operations. They are placed in the `transforms` array and applied after position resolution.\n\n• alignTop — aligns top edges\n• alignLeft/Right/Bottom — edge alignment\n• distributeH/V — equal spacing\n• matchWidth/Height/Size — size matching\n• fitToRect — scale to fit a rectangle', {
        id: 'info-desc',
        x: 1140, y: below('info-rule', { gap: 16 }),
        w: 570,
        size: 20, color: 'rgba(255,255,255,0.6)',
        lineHeight: 1.5,
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

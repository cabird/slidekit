// relative-positioning.js — Elements positioned relative to each other
// Demonstrates: below, rightOf, alignTopWith, centerHWith, alignLeftWith, centerIn

import {
  init, render, safeRect,
  text, rect, rule,
  below, rightOf, alignTopWith, centerHWith, alignLeftWith, centerIn,
} from '../slidekit.js';

export async function run() {
  await init({
    slide: { w: 1920, h: 1080 },
    safeZone: { left: 120, right: 120, top: 90, bottom: 90 },
    minFontSize: 24,
  });

  const safe = safeRect();

  const slides = [{
    id: 'relative-pos',
    background: '#0c0c14',
    elements: [
      text('Relative Positioning', {
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

      // Anchor element — everything else is relative to this
      rect({
        id: 'anchor-box',
        x: 200, y: 300, w: 400, h: 200,
        style: {
          background: 'rgba(124,92,191,0.2)',
          border: '2px solid #7c5cbf',
          borderRadius: '12px',
        },
      }),

      text('Anchor Element', {
        id: 'anchor-label',
        ...centerIn({ x: 200, y: 300, w: 400, h: 200 }),
        w: 360,
        size: 28, weight: 600, color: '#ffffff',
        align: 'center',
      }),

      // Below the anchor box with a 24px gap
      rect({
        id: 'below-box',
        x: 200, y: below('anchor-box', { gap: 24 }),
        w: 400, h: 120,
        style: {
          background: 'rgba(66,133,244,0.15)',
          border: '1px solid rgba(66,133,244,0.4)',
          borderRadius: '8px',
        },
      }),

      text('below("anchor-box", { gap: 24 })', {
        id: 'below-label',
        x: 220, y: below('anchor-box', { gap: 50 }),
        w: 360,
        size: 18, color: 'rgba(255,255,255,0.7)',
      }),

      // To the right of the anchor box
      rect({
        id: 'right-box',
        x: rightOf('anchor-box', { gap: 40 }),
        y: alignTopWith('anchor-box'),
        w: 350, h: 200,
        style: {
          background: 'rgba(52,168,83,0.15)',
          border: '1px solid rgba(52,168,83,0.4)',
          borderRadius: '8px',
        },
      }),

      text('rightOf + alignTopWith', {
        id: 'right-label',
        x: rightOf('anchor-box', { gap: 60 }),
        y: below('right-box', { gap: 12 }),
        w: 300,
        size: 18, color: 'rgba(255,255,255,0.7)',
      }),

      // Centered horizontally with the anchor box, further down
      rect({
        id: 'centered-box',
        x: centerHWith('anchor-box'),
        y: below('below-box', { gap: 40 }),
        w: 300, h: 100,
        anchor: 'tc',
        style: {
          background: 'rgba(251,188,4,0.15)',
          border: '1px solid rgba(251,188,4,0.4)',
          borderRadius: '8px',
        },
      }),

      text('centerHWith("anchor-box")', {
        id: 'centered-label',
        x: centerHWith('anchor-box'),
        y: below('centered-box', { gap: 12 }),
        w: 300,
        anchor: 'tc',
        size: 18, color: 'rgba(255,255,255,0.7)',
        align: 'center',
      }),

      // Right side: explanation panel
      rect({
        id: 'info-panel',
        x: 1100, y: 300, w: 650, h: 500,
        style: {
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px',
        },
      }),

      text('How It Works', {
        id: 'info-title',
        x: 1140, y: 330, w: 570,
        size: 28, weight: 600, color: '#ffffff',
      }),

      rule({
        id: 'info-rule',
        x: 1140, y: below('info-title', { gap: 12 }),
        w: 60, color: '#7c5cbf', thickness: 2,
      }),

      text('Relative positioning helpers return deferred markers that are resolved during layout(). The library builds a dependency graph and uses topological sort to resolve positions in the correct order.\n\nCircular dependencies are detected and reported as errors.', {
        id: 'info-desc',
        x: 1140, y: below('info-rule', { gap: 16 }),
        w: 570,
        size: 20, color: 'rgba(255,255,255,0.6)',
        lineHeight: 1.5,
      }),
    ],
  }];

  return await render(slides);
}

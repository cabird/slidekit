// title-slide.js — Full-bleed background with centered title, subtitle, and accent rule
// Demonstrates: image, text, rule, below, init, render, anchor system

import {
  init, render, safeRect,
  text, rect, rule, image,
  below,
} from '../slidekit.js';

export async function run() {
  await init({
    slide: { w: 1920, h: 1080 },
    safeZone: { left: 120, right: 120, top: 90, bottom: 90 },
    minFontSize: 24,
  });

  const safe = safeRect();

  const slides = [{
    id: 'title',
    background: '#0c0c14',
    elements: [
      // Full-bleed background gradient
      rect({
        id: 'bg-glow',
        x: 0, y: 0, w: 1920, h: 1080,
        layer: 'bg',
        style: {
          background: 'radial-gradient(ellipse at 30% 40%, rgba(124,92,191,0.2) 0%, transparent 60%)',
        },
      }),

      // Main title — centered horizontally using anchor: "tc"
      text('Building Better\nPresentations', {
        id: 'title-text',
        x: 960, y: 340, w: 1200,
        anchor: 'tc',
        size: 80, weight: 700, color: '#ffffff',
        align: 'center',
        lineHeight: 1.1,
        style: { textShadow: '0 2px 20px rgba(0,0,0,0.5)' },
      }),

      // Accent rule — positioned below the title with a 32px gap
      rule({
        id: 'accent',
        x: 960 - 40, y: below('title-text', { gap: 32 }),
        w: 80,
        color: '#7c5cbf', thickness: 3,
      }),

      // Subtitle — positioned below the rule
      text('A coordinate-based approach to slide layout', {
        id: 'subtitle',
        x: 960, w: 800,
        y: below('accent', { gap: 24 }),
        anchor: 'tc',
        size: 32, weight: 400, color: 'rgba(255,255,255,0.6)',
        align: 'center',
      }),

      // Footer text anchored to bottom-center
      text('SlideKit  |  2026', {
        id: 'footer',
        x: 960, y: 1000, w: 600,
        anchor: 'bc',
        size: 18, weight: 400, color: 'rgba(255,255,255,0.3)',
        align: 'center',
      }),
    ],
  }];

  return await render(slides);
}

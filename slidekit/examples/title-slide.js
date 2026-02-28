// title-slide.js — Full-bleed background with centered title, subtitle, and accent rule
// Demonstrates: el (v2 API), below, init, render, anchor system

import {
  init, render, safeRect,
  el,
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
      el('', {
        id: 'bg-glow',
        x: 0, y: 0, w: 1920, h: 1080,
        layer: 'bg',
        style: {
          background: 'radial-gradient(ellipse at 30% 40%, rgba(124,92,191,0.2) 0%, transparent 60%)',
        },
      }),

      // Main title — centered horizontally using anchor: "tc"
      el('<p style="font:700 80px/1.1 Inter;color:#ffffff;text-align:center;text-shadow:0 2px 20px rgba(0,0,0,0.5)">Building Better<br>Presentations</p>', {
        id: 'title-text',
        x: 960, y: 340, w: 1200,
        anchor: 'tc',
      }),

      // Accent rule — positioned below the title with a 32px gap
      el('', {
        id: 'accent',
        x: 960 - 40, y: below('title-text', { gap: 32 }),
        w: 80, h: 3,
        style: { background: '#7c5cbf' },
      }),

      // Subtitle — positioned below the rule
      el('<p style="font:400 32px Inter;color:rgba(255,255,255,0.6);text-align:center">A coordinate-based approach to slide layout</p>', {
        id: 'subtitle',
        x: 960, w: 800,
        y: below('accent', { gap: 24 }),
        anchor: 'tc',
      }),

      // Footer text anchored to bottom-center
      el('<p style="font:400 18px Inter;color:rgba(255,255,255,0.3);text-align:center">SlideKit  |  2026</p>', {
        id: 'footer',
        x: 960, y: 1000, w: 600,
        anchor: 'bc',
      }),
    ],
  }];

  return await render(slides);
}

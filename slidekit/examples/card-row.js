// card-row.js — Horizontal row of styled cards with equal sizing
// Demonstrates: hstack, el (v2 API), panel, style, className, below

import {
  init, render, safeRect,
  el,
  below, hstack, panel,
} from '../slidekit.js';

export async function run() {
  await init({
    slide: { w: 1920, h: 1080 },
    safeZone: { left: 120, right: 120, top: 90, bottom: 90 },
    minFontSize: 24,
  });

  const safe = safeRect();

  const slides = [{
    id: 'card-row',
    background: '#0c0c14',
    elements: [
      // Section heading
      el('<p style="font:700 52px Inter;color:#ffffff">Three Approaches</p>', {
        id: 'heading',
        x: safe.x, y: safe.y, w: safe.w,
      }),

      el('', {
        id: 'heading-rule',
        x: safe.x, y: below('heading', { gap: 16 }),
        w: 80, h: 3,
        style: { background: '#7c5cbf' },
      }),

      // Three equal-width panels in a horizontal stack
      hstack([
        panel([
          el('<p style="font:600 28px Inter;color:#ffffff">Declarative</p>', { w: 'fill' }),
          el('', { w: 'fill', h: 2, style: { background: 'rgba(255,255,255,0.2)' } }),
          el('<p style="font:400 20px/1.5 Inter;color:rgba(255,255,255,0.65)">Define what you want, not how to get there. Coordinates are explicit and deterministic.</p>', {
            w: 'fill',
          }),
        ], {
          id: 'card-1',
          w: 480, padding: 28, gap: 28,
          style: {
            background: 'rgba(255,255,255,0.06)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          },
        }),

        panel([
          el('<p style="font:600 28px Inter;color:#ffffff">Measurable</p>', { w: 'fill' }),
          el('', { w: 'fill', h: 2, style: { background: 'rgba(255,255,255,0.2)' } }),
          el('<p style="font:400 20px/1.5 Inter;color:rgba(255,255,255,0.65)">Text is measured before placement. Auto-fitting eliminates guesswork for font sizing.</p>', {
            w: 'fill',
          }),
        ], {
          id: 'card-2',
          w: 480, padding: 28, gap: 28,
          style: {
            background: 'rgba(255,255,255,0.06)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          },
        }),

        panel([
          el('<p style="font:600 28px Inter;color:#ffffff">Validated</p>', { w: 'fill' }),
          el('', { w: 'fill', h: 2, style: { background: 'rgba(255,255,255,0.2)' } }),
          el('<p style="font:400 20px/1.5 Inter;color:rgba(255,255,255,0.65)">Overlap detection, safe zone checks, and font size validation happen automatically.</p>', {
            w: 'fill',
          }),
        ], {
          id: 'card-3',
          w: 480, padding: 28, gap: 28,
          style: {
            background: 'rgba(255,255,255,0.06)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          },
        }),
      ], {
        id: 'cards',
        x: safe.x, y: below('heading-rule', { gap: 48 }),
        gap: 30,
        align: 'top',
      }),
    ],
  }];

  return await render(slides);
}

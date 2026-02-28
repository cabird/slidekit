// card-row.js — Horizontal row of styled cards with equal sizing
// Demonstrates: hstack, rect, text, panel, style, className, below

import {
  init, render, safeRect,
  text, rect, rule,
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
      text('Three Approaches', {
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

      // Three equal-width panels in a horizontal stack
      hstack([
        panel([
          text('Declarative', { w: 'fill', size: 28, weight: 600, color: '#ffffff' }),
          rule({ w: 'fill', color: 'rgba(255,255,255,0.15)', thickness: 1 }),
          text('Define what you want, not how to get there. Coordinates are explicit and deterministic.', {
            w: 'fill', size: 20, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5,
          }),
        ], {
          id: 'card-1',
          w: 480, padding: 28, gap: 14,
          style: {
            background: 'rgba(255,255,255,0.06)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          },
        }),

        panel([
          text('Measurable', { w: 'fill', size: 28, weight: 600, color: '#ffffff' }),
          rule({ w: 'fill', color: 'rgba(255,255,255,0.15)', thickness: 1 }),
          text('Text is measured before placement. Auto-fitting eliminates guesswork for font sizing.', {
            w: 'fill', size: 20, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5,
          }),
        ], {
          id: 'card-2',
          w: 480, padding: 28, gap: 14,
          style: {
            background: 'rgba(255,255,255,0.06)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          },
        }),

        panel([
          text('Validated', { w: 'fill', size: 28, weight: 600, color: '#ffffff' }),
          rule({ w: 'fill', color: 'rgba(255,255,255,0.15)', thickness: 1 }),
          text('Overlap detection, safe zone checks, and font size validation happen automatically.', {
            w: 'fill', size: 20, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5,
          }),
        ], {
          id: 'card-3',
          w: 480, padding: 28, gap: 14,
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

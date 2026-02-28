// grid-layout.js — Using the grid system for consistent positioning
// Demonstrates: grid(), col(), spanW(), snap(), el

import {
  init, render, safeRect,
  el,
  below, grid, snap,
} from '../slidekit.js';

export async function run() {
  await init({
    slide: { w: 1920, h: 1080 },
    safeZone: { left: 120, right: 120, top: 90, bottom: 90 },
    minFontSize: 24,
  });

  const safe = safeRect();

  // Create a 12-column grid with 30px gutters
  const g = grid({ cols: 12, gutter: 30 });

  const slides = [{
    id: 'grid-layout',
    background: '#0c0c14',
    elements: [
      // Heading spanning columns 1-8
      el('<p style="font:700 52px Inter;color:#fff">Grid System</p>', {
        id: 'heading',
        x: g.col(1), y: safe.y, w: g.spanW(1, 8),
      }),

      el('', {
        id: 'heading-rule',
        x: g.col(1), y: below('heading', { gap: 16 }),
        w: 80, h: 3,
        style: { background: '#7c5cbf' },
      }),

      // Visualize the 12-column grid (background guides)
      ...Array.from({ length: 12 }, (_, i) =>
        el('', {
          id: `grid-col-${i + 1}`,
          x: g.col(i + 1), y: 240, w: g.colWidth, h: 780,
          layer: 'bg',
          style: {
            background: i % 2 === 0
              ? 'rgba(124,92,191,0.04)'
              : 'rgba(124,92,191,0.08)',
          },
        })
      ),

      // Content block: columns 1-4
      el('', {
        id: 'block-1',
        x: g.col(1), y: 280, w: g.spanW(1, 4), h: 250,
        style: {
          background: 'rgba(124,92,191,0.15)',
          border: '1px solid rgba(124,92,191,0.3)',
          borderRadius: '12px',
        },
      }),
      el('<p style="font:600 24px Inter;color:#fff">Columns 1&ndash;4</p>', {
        id: 'block-1-label',
        x: g.col(1) + 20, y: 300, w: g.spanW(1, 4) - 40,
      }),
      el(`<p style="font:18px Inter;color:rgba(255,255,255,0.5)">x: ${g.col(1)}, w: ${g.spanW(1, 4)}</p>`, {
        id: 'block-1-coords',
        x: g.col(1) + 20, y: below('block-1-label', { gap: 8 }),
        w: g.spanW(1, 4) - 40,
      }),

      // Content block: columns 5-8
      el('', {
        id: 'block-2',
        x: g.col(5), y: 280, w: g.spanW(5, 8), h: 250,
        style: {
          background: 'rgba(66,133,244,0.15)',
          border: '1px solid rgba(66,133,244,0.3)',
          borderRadius: '12px',
        },
      }),
      el('<p style="font:600 24px Inter;color:#fff">Columns 5&ndash;8</p>', {
        id: 'block-2-label',
        x: g.col(5) + 20, y: 300, w: g.spanW(5, 8) - 40,
      }),
      el(`<p style="font:18px Inter;color:rgba(255,255,255,0.5)">x: ${g.col(5)}, w: ${g.spanW(5, 8)}</p>`, {
        id: 'block-2-coords',
        x: g.col(5) + 20, y: below('block-2-label', { gap: 8 }),
        w: g.spanW(5, 8) - 40,
      }),

      // Content block: columns 9-12
      el('', {
        id: 'block-3',
        x: g.col(9), y: 280, w: g.spanW(9, 12), h: 250,
        style: {
          background: 'rgba(52,168,83,0.15)',
          border: '1px solid rgba(52,168,83,0.3)',
          borderRadius: '12px',
        },
      }),
      el('<p style="font:600 24px Inter;color:#fff">Columns 9&ndash;12</p>', {
        id: 'block-3-label',
        x: g.col(9) + 20, y: 300, w: g.spanW(9, 12) - 40,
      }),
      el(`<p style="font:18px Inter;color:rgba(255,255,255,0.5)">x: ${g.col(9)}, w: ${g.spanW(9, 12)}</p>`, {
        id: 'block-3-coords',
        x: g.col(9) + 20, y: below('block-3-label', { gap: 8 }),
        w: g.spanW(9, 12) - 40,
      }),

      // Full-width block: columns 1-12
      el('', {
        id: 'block-full',
        x: g.col(1), y: 570, w: g.spanW(1, 12), h: 120,
        style: {
          background: 'rgba(251,188,4,0.1)',
          border: '1px solid rgba(251,188,4,0.3)',
          borderRadius: '12px',
        },
      }),
      el('<p style="font:600 24px Inter;color:#fff">Full width: columns 1&ndash;12</p>', {
        id: 'block-full-label',
        x: g.col(1) + 20, y: 590, w: g.spanW(1, 12) - 40,
      }),

      // Two halves: 1-6 and 7-12
      el('', {
        id: 'half-left',
        x: g.col(1), y: 730, w: g.spanW(1, 6), h: 120,
        style: {
          background: 'rgba(234,67,53,0.1)',
          border: '1px solid rgba(234,67,53,0.3)',
          borderRadius: '12px',
        },
      }),
      el('<p style="font:600 24px Inter;color:#fff">Left half: 1&ndash;6</p>', {
        id: 'half-left-label',
        x: g.col(1) + 20, y: 750, w: g.spanW(1, 6) - 40,
      }),

      el('', {
        id: 'half-right',
        x: g.col(7), y: 730, w: g.spanW(7, 12), h: 120,
        style: {
          background: 'rgba(124,92,191,0.1)',
          border: '1px solid rgba(124,92,191,0.3)',
          borderRadius: '12px',
        },
      }),
      el('<p style="font:600 24px Inter;color:#fff">Right half: 7&ndash;12</p>', {
        id: 'half-right-label',
        x: g.col(7) + 20, y: 750, w: g.spanW(7, 12) - 40,
      }),

      // Grid config info
      el(`<p style="font:20px Inter;color:rgba(255,255,255,0.4)">Grid: ${g.cols} cols, ${g.gutter}px gutter, colWidth: ${g.colWidth}px | snap(157, 10) = ${snap(157, 10)}</p>`, {
        id: 'grid-info',
        x: g.col(1), y: 900, w: g.spanW(1, 12),
      }),
    ],
  }];

  return await render(slides);
}

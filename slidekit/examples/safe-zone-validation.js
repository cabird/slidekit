// safe-zone-validation.js — Safe zone checks and layout validation
// Demonstrates: init with custom safeZone, layout(), inspecting warnings and errors

import {
  init, render, layout, safeRect,
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

  const slideDefinition = {
    id: 'validation',
    background: '#0c0c14',
    elements: [
      el('<p style="font:700 52px Inter;color:#fff">Layout Validation</p>', {
        id: 'heading',
        x: safe.x, y: safe.y, w: safe.w,
      }),

      el('', {
        id: 'heading-rule',
        x: safe.x, y: below('heading', { gap: 16 }),
        w: 80, h: 3,
        style: { background: '#7c5cbf' },
      }),

      // --- Properly placed element (inside safe zone) ---
      el('', {
        id: 'safe-element',
        x: safe.x, y: 280, w: 500, h: 200,
        style: {
          background: 'rgba(52,168,83,0.15)',
          border: '2px solid rgba(52,168,83,0.5)',
          borderRadius: '12px',
        },
      }),
      el('<p style="font:600 24px Inter;color:#34a853">&#x2713; Inside safe zone</p>', {
        id: 'safe-label',
        x: safe.x + 20, y: 310, w: 460,
      }),
      el('<p style="font:18px Inter;color:rgba(255,255,255,0.6);line-height:1.4">This element is fully within the safe margins. No warnings generated.</p>', {
        id: 'safe-desc',
        x: safe.x + 20, y: below('safe-label', { gap: 8 }), w: 460,
      }),

      // --- Element partially outside safe zone (triggers warning) ---
      el('', {
        id: 'warn-element',
        x: 30, y: 280, w: 200, h: 200,
        style: {
          background: 'rgba(251,188,4,0.15)',
          border: '2px solid rgba(251,188,4,0.5)',
          borderRadius: '12px',
        },
      }),
      el('<p style="font:600 18px Inter;color:#fbbc04">&#x26A0; Partially outside</p>', {
        id: 'warn-label',
        x: 50, y: 310, w: 160,
      }),

      // --- Element near slide edge (may trigger bounds warning) ---
      el('', {
        id: 'edge-element',
        x: 1870, y: 500, w: 100, h: 100,
        style: {
          background: 'rgba(234,67,53,0.15)',
          border: '2px solid rgba(234,67,53,0.5)',
          borderRadius: '12px',
        },
      }),

      // --- Small text (triggers font size warning) ---
      el('<p style="font-size:16px;font-family:Inter;color:rgba(255,255,255,0.5)">This text is below the minimum font size threshold</p>', {
        id: 'small-text',
        x: safe.x, y: 550, w: 500,
      }),

      // --- Safe zone visualization ---
      el('', {
        id: 'safe-zone-viz',
        x: safe.x, y: safe.y, w: safe.w, h: safe.h,
        layer: 'bg',
        style: {
          border: '1px dashed rgba(124,92,191,0.3)',
          borderRadius: '0',
        },
      }),

      // Info panel on the right
      el('', {
        id: 'info-panel',
        x: 1100, y: 280, w: 650, h: 500,
        style: {
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px',
        },
      }),

      el('<p style="font:600 28px Inter;color:#fff">Validation System</p>', {
        id: 'info-title',
        x: 1140, y: 310, w: 570,
      }),

      el('', {
        id: 'info-rule',
        x: 1140, y: below('info-title', { gap: 12 }),
        w: 60, h: 2,
        style: { background: '#7c5cbf' },
      }),

      el('<p style="font:20px Inter;color:rgba(255,255,255,0.6);line-height:1.5">layout() returns structured validation data:<br><br>&bull; warnings &mdash; safe zone violations, small fonts, clustering<br>&bull; errors &mdash; off-slide elements, circular deps (strict mode)<br>&bull; collisions &mdash; overlapping elements with overlap area<br><br>The safeRect() helper provides the usable content area. Check console for this slide\'s validation output.</p>', {
        id: 'info-desc',
        x: 1140, y: below('info-rule', { gap: 16 }),
        w: 570,
      }),
    ],
  };

  // First, run layout() to inspect warnings/errors
  const layoutResult = await layout(slideDefinition);
  console.log('=== Layout Validation Results ===');
  console.log('Warnings:', layoutResult.warnings);
  console.log('Errors:', layoutResult.errors);
  console.log('Collisions:', layoutResult.collisions);
  console.log('Elements:', Object.keys(layoutResult.elements));

  // Then render the slide
  return await render([slideDefinition]);
}

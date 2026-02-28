// safe-zone-validation.js — Safe zone checks and layout validation
// Demonstrates: init with custom safeZone, layout(), inspecting warnings and errors

import {
  init, render, layout, safeRect,
  text, rect, rule,
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
      text('Layout Validation', {
        id: 'heading',
        x: safe.x, y: safe.y, w: safe.w,
        size: 52, weight: 700, color: '#ffffff',
      }),

      rule({
        id: 'heading-rule',
        x: safe.x, y: below('heading', { gap: 16 }),
        w: 80, color: '#7c5cbf', thickness: 3,
      }),

      // --- Properly placed element (inside safe zone) ---
      rect({
        id: 'safe-element',
        x: safe.x, y: 280, w: 500, h: 200,
        style: {
          background: 'rgba(52,168,83,0.15)',
          border: '2px solid rgba(52,168,83,0.5)',
          borderRadius: '12px',
        },
      }),
      text('✓ Inside safe zone', {
        id: 'safe-label',
        x: safe.x + 20, y: 310, w: 460,
        size: 24, weight: 600, color: '#34a853',
      }),
      text('This element is fully within the safe margins. No warnings generated.', {
        id: 'safe-desc',
        x: safe.x + 20, y: below('safe-label', { gap: 8 }), w: 460,
        size: 18, color: 'rgba(255,255,255,0.6)', lineHeight: 1.4,
      }),

      // --- Element partially outside safe zone (triggers warning) ---
      rect({
        id: 'warn-element',
        x: 30, y: 280, w: 200, h: 200,
        style: {
          background: 'rgba(251,188,4,0.15)',
          border: '2px solid rgba(251,188,4,0.5)',
          borderRadius: '12px',
        },
      }),
      text('⚠ Partially outside', {
        id: 'warn-label',
        x: 50, y: 310, w: 160,
        size: 18, weight: 600, color: '#fbbc04',
      }),

      // --- Element near slide edge (may trigger bounds warning) ---
      rect({
        id: 'edge-element',
        x: 1870, y: 500, w: 100, h: 100,
        style: {
          background: 'rgba(234,67,53,0.15)',
          border: '2px solid rgba(234,67,53,0.5)',
          borderRadius: '12px',
        },
      }),

      // --- Small text (triggers font size warning) ---
      text('This text is below the minimum font size threshold', {
        id: 'small-text',
        x: safe.x, y: 550, w: 500,
        size: 16, color: 'rgba(255,255,255,0.5)',
      }),

      // --- Safe zone visualization ---
      rect({
        id: 'safe-zone-viz',
        x: safe.x, y: safe.y, w: safe.w, h: safe.h,
        layer: 'bg',
        style: {
          border: '1px dashed rgba(124,92,191,0.3)',
          borderRadius: '0',
        },
      }),

      // Info panel on the right
      rect({
        id: 'info-panel',
        x: 1100, y: 280, w: 650, h: 500,
        style: {
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px',
        },
      }),

      text('Validation System', {
        id: 'info-title',
        x: 1140, y: 310, w: 570,
        size: 28, weight: 600, color: '#ffffff',
      }),

      rule({
        id: 'info-rule',
        x: 1140, y: below('info-title', { gap: 12 }),
        w: 60, color: '#7c5cbf', thickness: 2,
      }),

      text('layout() returns structured validation data:\n\n• warnings — safe zone violations, small fonts, clustering\n• errors — off-slide elements, circular deps (strict mode)\n• collisions — overlapping elements with overlap area\n\nThe safeRect() helper provides the usable content area. Check console for this slide\'s validation output.', {
        id: 'info-desc',
        x: 1140, y: below('info-rule', { gap: 16 }),
        w: 570,
        size: 20, color: 'rgba(255,255,255,0.6)',
        lineHeight: 1.5,
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

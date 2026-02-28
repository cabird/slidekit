// text-fitting.js — Auto-sizing text to fit a bounding box, with measurement
// Demonstrates: measureText, fitText, text with overflow policies

import {
  init, render, safeRect,
  text, rect, rule,
  below, rightOf, measureText, fitText,
} from '../slidekit.js';

export async function run() {
  await init({
    slide: { w: 1920, h: 1080 },
    safeZone: { left: 120, right: 120, top: 90, bottom: 90 },
    minFontSize: 24,
  });

  const safe = safeRect();

  // --- Demonstrate measureText ---
  const measured = measureText('This text has been measured to determine its exact dimensions', {
    font: 'Inter', size: 28, weight: 400, lineHeight: 1.3, w: 400,
  });
  console.log('measureText result:', measured);

  // --- Demonstrate fitText ---
  const fitted = fitText(
    'Auto-fitted text finds the largest font size that fits within the given box',
    { w: 500, h: 200 },
    { font: 'Inter', weight: 400, lineHeight: 1.3, minSize: 16, maxSize: 72 },
  );
  console.log('fitText result:', fitted);

  const slides = [{
    id: 'text-fitting',
    background: '#0c0c14',
    elements: [
      text('Text Measurement & Fitting', {
        id: 'heading',
        x: safe.x, y: safe.y, w: safe.w,
        size: 52, weight: 700, color: '#ffffff',
      }),

      rule({
        id: 'heading-rule',
        x: safe.x, y: below('heading', { gap: 16 }),
        w: 80, color: '#7c5cbf', thickness: 3,
      }),

      // Left column: measureText demo
      text('measureText()', {
        id: 'measure-label',
        x: safe.x, y: below('heading-rule', { gap: 40 }),
        w: 700,
        size: 32, weight: 600, color: '#ffffff',
      }),

      // Bounding box visualization
      rect({
        id: 'measure-box',
        x: safe.x, y: below('measure-label', { gap: 16 }),
        w: 400, h: measured.block.h,
        style: {
          background: 'rgba(124,92,191,0.1)',
          border: '1px dashed rgba(124,92,191,0.4)',
          borderRadius: '4px',
        },
      }),

      text('This text has been measured to determine its exact dimensions', {
        id: 'measured-text',
        x: safe.x, y: below('measure-label', { gap: 16 }),
        w: 400,
        size: 28, weight: 400, color: '#ffffff',
        lineHeight: 1.3,
      }),

      text(`Block: ${measured.block.w}×${measured.block.h}px\nLines: ${measured.lineCount}\nFont: ${measured.fontSize}px`, {
        id: 'measure-info',
        x: rightOf('measure-box', { gap: 24 }),
        y: below('measure-label', { gap: 16 }),
        w: 300,
        size: 20, color: 'rgba(255,255,255,0.6)',
        lineHeight: 1.5,
      }),

      // Right column: fitText demo
      text('fitText()', {
        id: 'fit-label',
        x: 1000, y: below('heading-rule', { gap: 40 }),
        w: 700,
        size: 32, weight: 600, color: '#ffffff',
      }),

      rect({
        id: 'fit-box',
        x: 1000, y: below('fit-label', { gap: 16 }),
        w: 500, h: 200,
        style: {
          background: 'rgba(52,168,83,0.1)',
          border: '1px dashed rgba(52,168,83,0.4)',
          borderRadius: '4px',
        },
      }),

      text('Auto-fitted text finds the largest font size that fits within the given box', {
        id: 'fitted-text',
        x: 1000, y: below('fit-label', { gap: 16 }),
        w: 500, h: 200,
        size: fitted.fontSize, weight: 400, color: '#ffffff',
        lineHeight: 1.3,
      }),

      text(`Fitted size: ${fitted.fontSize}px\nBox: 500×200px`, {
        id: 'fit-info',
        x: 1520, y: below('fit-label', { gap: 16 }),
        w: 250,
        size: 20, color: 'rgba(255,255,255,0.6)',
        lineHeight: 1.5,
      }),

      // Bottom: overflow policies
      text('Overflow Policies', {
        id: 'overflow-label',
        x: safe.x, y: 680,
        w: safe.w,
        size: 32, weight: 600, color: '#ffffff',
      }),

      // "warn" — default: warns if text overflows but renders fully
      rect({
        id: 'overflow-warn-box',
        x: safe.x, y: below('overflow-label', { gap: 16 }),
        w: 350, h: 100,
        style: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' },
      }),
      text('This text uses overflow: "warn" which is the default policy. It renders fully and logs a warning.', {
        id: 'overflow-warn-text',
        x: safe.x + 12, y: below('overflow-label', { gap: 28 }),
        w: 326, h: 80,
        size: 18, color: 'rgba(255,255,255,0.7)', lineHeight: 1.4,
        overflow: 'warn',
      }),

      // "clip" — clips overflow
      rect({
        id: 'overflow-clip-box',
        x: rightOf('overflow-warn-box', { gap: 24 }),
        y: below('overflow-label', { gap: 16 }),
        w: 350, h: 100,
        style: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' },
      }),
      text('This text uses overflow: "clip". Content beyond the bounding box is hidden with CSS overflow hidden.', {
        id: 'overflow-clip-text',
        x: rightOf('overflow-warn-box', { gap: 36 }),
        y: below('overflow-label', { gap: 28 }),
        w: 326, h: 80,
        size: 18, color: 'rgba(255,255,255,0.7)', lineHeight: 1.4,
        overflow: 'clip',
      }),

      // "shrink" — auto-shrinks font
      rect({
        id: 'overflow-shrink-box',
        x: rightOf('overflow-clip-box', { gap: 24 }),
        y: below('overflow-label', { gap: 16 }),
        w: 350, h: 100,
        style: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' },
      }),
      text('This text uses overflow: "shrink". The font size is automatically reduced until the text fits within the box.', {
        id: 'overflow-shrink-text',
        x: rightOf('overflow-clip-box', { gap: 36 }),
        y: below('overflow-label', { gap: 28 }),
        w: 326, h: 80,
        size: 18, color: 'rgba(255,255,255,0.7)', lineHeight: 1.4,
        overflow: 'shrink',
      }),
    ],
  }];

  return await render(slides);
}

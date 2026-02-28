// text-fitting.js — Measuring HTML content with the async measure() API
// Demonstrates: measure() with different widths, measuring image-containing elements, clip overflow

import {
  init, render, safeRect,
  el,
  below, rightOf, measure,
} from '../slidekit.js';

export async function run() {
  await init({
    slide: { w: 1920, h: 1080 },
    safeZone: { left: 120, right: 120, top: 90, bottom: 90 },
    minFontSize: 24,
  });

  const safe = safeRect();

  // --- Demonstrate measure() with a text paragraph ---
  const measured = await measure(
    '<p style="font:28px Inter;color:#fff">This text has been measured to determine its exact dimensions</p>',
    { w: 400 },
  );
  console.log('measure result (w:400):', measured);

  // --- Demonstrate measure() with a different width ---
  const measuredWide = await measure(
    '<p style="font:28px Inter;color:#fff">This text has been measured to determine its exact dimensions</p>',
    { w: 700 },
  );
  console.log('measure result (w:700):', measuredWide);

  // --- Demonstrate measure() with an image-containing element ---
  const measuredImg = await measure(
    '<div><img src="https://placehold.co/120x80" style="display:block"><p style="font:20px Inter;color:#fff">Caption text</p></div>',
    { w: 300 },
  );
  console.log('measure result (image element):', measuredImg);

  const slides = [{
    id: 'html-measurement',
    background: '#0c0c14',
    elements: [
      el('<p style="font:700 52px Inter;color:#fff">HTML Measurement</p>', {
        id: 'heading',
        x: safe.x, y: safe.y, w: safe.w,
      }),

      el('', {
        id: 'heading-rule',
        x: safe.x, y: below('heading', { gap: 16 }),
        w: 80, h: 3,
        style: { background: '#7c5cbf' },
      }),

      // Left column: measure() with constrained width
      el('<p style="font:600 32px Inter;color:#fff">measure() &mdash; w: 400</p>', {
        id: 'measure-label',
        x: safe.x, y: below('heading-rule', { gap: 40 }),
        w: 700,
      }),

      // Bounding box visualization
      el('', {
        id: 'measure-box',
        x: safe.x, y: below('measure-label', { gap: 16 }),
        w: 400, h: measured.h,
        style: {
          background: 'rgba(124,92,191,0.1)',
          border: '1px dashed rgba(124,92,191,0.4)',
          borderRadius: '4px',
        },
      }),

      el('<p style="font:28px Inter;color:#fff">This text has been measured to determine its exact dimensions</p>', {
        id: 'measured-text',
        x: safe.x, y: below('measure-label', { gap: 16 }),
        w: 400,
      }),

      el(`<p style="font:20px Inter;color:rgba(255,255,255,0.6);line-height:1.5">Size: ${measured.w}&times;${measured.h}px</p>`, {
        id: 'measure-info',
        x: rightOf('measure-box', { gap: 24 }),
        y: below('measure-label', { gap: 16 }),
        w: 300,
      }),

      // Middle column: measure() with wider width
      el('<p style="font:600 32px Inter;color:#fff">measure() &mdash; w: 700</p>', {
        id: 'wide-label',
        x: safe.x, y: below('measure-box', { gap: 48 }),
        w: 700,
      }),

      el('', {
        id: 'wide-box',
        x: safe.x, y: below('wide-label', { gap: 16 }),
        w: 700, h: measuredWide.h,
        style: {
          background: 'rgba(52,168,83,0.1)',
          border: '1px dashed rgba(52,168,83,0.4)',
          borderRadius: '4px',
        },
      }),

      el('<p style="font:28px Inter;color:#fff">This text has been measured to determine its exact dimensions</p>', {
        id: 'wide-text',
        x: safe.x, y: below('wide-label', { gap: 16 }),
        w: 700,
      }),

      el(`<p style="font:20px Inter;color:rgba(255,255,255,0.6);line-height:1.5">Size: ${measuredWide.w}&times;${measuredWide.h}px</p>`, {
        id: 'wide-info',
        x: rightOf('wide-box', { gap: 24 }),
        y: below('wide-label', { gap: 16 }),
        w: 300,
      }),

      // Right column: measure() with image element
      el('<p style="font:600 32px Inter;color:#fff">measure() &mdash; image element</p>', {
        id: 'img-label',
        x: 1000, y: below('heading-rule', { gap: 40 }),
        w: 700,
      }),

      el('', {
        id: 'img-box',
        x: 1000, y: below('img-label', { gap: 16 }),
        w: 300, h: measuredImg.h,
        style: {
          background: 'rgba(251,188,4,0.1)',
          border: '1px dashed rgba(251,188,4,0.4)',
          borderRadius: '4px',
        },
      }),

      el('<div><img src="https://placehold.co/120x80" style="display:block"><p style="font:20px Inter;color:#fff">Caption text</p></div>', {
        id: 'img-content',
        x: 1000, y: below('img-label', { gap: 16 }),
        w: 300,
      }),

      el(`<p style="font:20px Inter;color:rgba(255,255,255,0.6);line-height:1.5">Size: ${measuredImg.w}&times;${measuredImg.h}px</p>`, {
        id: 'img-info',
        x: rightOf('img-box', { gap: 24 }),
        y: below('img-label', { gap: 16 }),
        w: 300,
      }),

      // Bottom: clip overflow demo
      el('<p style="font:600 32px Inter;color:#fff">Overflow: clip</p>', {
        id: 'clip-label',
        x: 1000, y: below('img-box', { gap: 48 }),
        w: 700,
      }),

      el('', {
        id: 'overflow-clip-box',
        x: 1000, y: below('clip-label', { gap: 16 }),
        w: 350, h: 100,
        style: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' },
      }),
      el('<p style="font:18px Inter;color:rgba(255,255,255,0.7);line-height:1.4">This text uses overflow: "clip". Content beyond the bounding box is hidden with CSS overflow hidden.</p>', {
        id: 'overflow-clip-text',
        x: 1012, y: below('clip-label', { gap: 28 }),
        w: 326, h: 80,
        overflow: 'clip',
      }),
    ],
  }];

  return await render(slides);
}

// bullet-list.js — Slide with heading, accent rule, and formatted bullet list
// Demonstrates: el (v2 API), below, HTML unordered list with nested items

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
    id: 'bullet-list',
    background: '#0c0c14',
    elements: [
      el('', {
        id: 'bg',
        x: 0, y: 0, w: 1920, h: 1080,
        layer: 'bg',
        style: {
          background: 'linear-gradient(180deg, #0c0c14 0%, #0a1628 50%, #0c1420 100%)',
        },
      }),

      el('<p style="font:700 52px Inter;color:#ffffff">Key Capabilities</p>', {
        id: 'heading',
        x: safe.x, y: safe.y, w: safe.w,
      }),

      el('', {
        id: 'heading-rule',
        x: safe.x, y: below('heading', { gap: 16 }),
        w: 80, h: 3,
        style: { background: '#7c5cbf' },
      }),

      // Bullet list with nested sub-items — using HTML <ul>/<li> to replace bullets()
      el(`<ul style="font:400 28px/1.4 Inter;color:rgba(255,255,255,0.85);list-style:none;margin:0;padding:0">
  <li style="padding-left:40px;margin-bottom:12px;text-indent:-40px"><span style="color:#7c5cbf;margin-right:16px">\u2022</span>Absolute positioning with 9-point anchor system</li>
  <li style="padding-left:40px;margin-bottom:12px;text-indent:-40px"><span style="color:#7c5cbf;margin-right:16px">\u2022</span>DOM-based text measurement before placement</li>
  <li style="padding-left:40px;margin-bottom:12px;text-indent:-40px"><span style="color:#7c5cbf;margin-right:16px">\u2022</span>Auto-fit text sizing
    <ul style="list-style:none;margin:12px 0 0 0;padding:0">
      <li style="padding-left:40px;margin-bottom:12px;text-indent:-40px"><span style="color:#7c5cbf;margin-right:16px">\u2022</span>Binary search between configurable min and max</li>
      <li style="padding-left:40px;margin-bottom:12px;text-indent:-40px"><span style="color:#7c5cbf;margin-right:16px">\u2022</span>Projection-readability warnings below 24px</li>
    </ul>
  </li>
  <li style="padding-left:40px;margin-bottom:12px;text-indent:-40px"><span style="color:#7c5cbf;margin-right:16px">\u2022</span>Relative positioning helpers (below, rightOf, centerIn...)</li>
  <li style="padding-left:40px;margin-bottom:12px;text-indent:-40px"><span style="color:#7c5cbf;margin-right:16px">\u2022</span>Layout validation and collision detection
    <ul style="list-style:none;margin:12px 0 0 0;padding:0">
      <li style="padding-left:40px;margin-bottom:12px;text-indent:-40px"><span style="color:#7c5cbf;margin-right:16px">\u2022</span>Safe zone enforcement with configurable margins</li>
      <li style="padding-left:40px;margin-bottom:12px;text-indent:-40px"><span style="color:#7c5cbf;margin-right:16px">\u2022</span>Overlap detection with structured warnings</li>
    </ul>
  </li>
  <li style="padding-left:40px;margin-bottom:12px;text-indent:-40px"><span style="color:#7c5cbf;margin-right:16px">\u2022</span>Stack primitives that resolve to absolute coordinates</li>
</ul>`, {
        id: 'features',
        x: safe.x, y: below('heading-rule', { gap: 40 }),
        w: 1400,
      }),
    ],
  }];

  return await render(slides);
}

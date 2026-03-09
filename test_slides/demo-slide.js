// demo-slide.js — Test slide for inspector feature development
// Uses multiple relationship types to test provenance inspection

import {
  init, render, safeRect,
  el, vstack, hstack,
  below, rightOf, alignTopWith, centerHWith,
} from '../slidekit/slidekit.js';

export async function run() {
  await init({
    slide: { w: 1920, h: 1080 },
    safeZone: { left: 120, right: 120, top: 90, bottom: 90 },
    minFontSize: 24,
  });

  const safe = safeRect();

  const slides = [{
    id: 'inspector-demo',
    background: '#1a1a2e',
    elements: [
      // Title — absolute position
      el('<p style="font:700 64px/1.1 Inter;color:#fff">Inspector Demo</p>', {
        id: 'title',
        x: safe.x, y: safe.y, w: 800,
        anchor: 'tl',
      }),

      // Subtitle — below title (constraint relationship)
      el('<p style="font:400 28px Inter;color:rgba(255,255,255,0.6)">Testing provenance & relationships</p>', {
        id: 'subtitle',
        x: safe.x, y: below('title', { gap: 16 }),
        w: 600,
      }),

      // Left card — absolute position
      el(`<div style="background:rgba(124,92,191,0.2);border:1px solid rgba(124,92,191,0.5);border-radius:12px;padding:32px">
        <p style="font:600 28px Inter;color:#b89eff;margin:0 0 12px 0">Card A</p>
        <p style="font:400 20px Inter;color:rgba(255,255,255,0.7);margin:0">Positioned absolutely at a fixed location on the slide.</p>
      </div>`, {
        id: 'card-a',
        x: safe.x, y: 350,
        w: 500, h: 200,
      }),

      // Right card — rightOf card-a + alignTop (two constraints)
      el(`<div style="background:rgba(52,168,83,0.2);border:1px solid rgba(52,168,83,0.5);border-radius:12px;padding:32px">
        <p style="font:600 28px Inter;color:#6ecf8a;margin:0 0 12px 0">Card B</p>
        <p style="font:400 20px Inter;color:rgba(255,255,255,0.7);margin:0">Positioned rightOf Card A, aligned top.</p>
      </div>`, {
        id: 'card-b',
        x: rightOf('card-a', { gap: 40 }),
        y: alignTopWith('card-a'),
        w: 500, h: 200,
      }),

      // Info box — below card-a, centerH with card-a
      el(`<div style="background:rgba(251,188,4,0.15);border:1px solid rgba(251,188,4,0.4);border-radius:8px;padding:24px">
        <p style="font:500 22px Inter;color:#fbc02d;margin:0">Info Box</p>
        <p style="font:400 18px Inter;color:rgba(255,255,255,0.6);margin:8px 0 0 0">Below Card A, centered horizontally with it.</p>
      </div>`, {
        id: 'info-box',
        x: centerHWith('card-a'),
        y: below('card-a', { gap: 32 }),
        w: 400,
        anchor: 'tc',
      }),

      // VStack — below info-box
      vstack([
        el('<p style="font:600 20px Inter;color:#b89eff;margin:0">VStack Item 1</p>', { id: 'vs-1', w: 300, h: 50 }),
        el('<p style="font:600 20px Inter;color:#6ecf8a;margin:0">VStack Item 2</p>', { id: 'vs-2', w: 300, h: 50 }),
        el('<p style="font:600 20px Inter;color:#fbc02d;margin:0">VStack Item 3</p>', { id: 'vs-3', w: 300, h: 50 }),
      ], {
        id: 'demo-vstack',
        x: safe.x, y: below('info-box', { gap: 32 }),
        gap: 'md', align: 'left',
      }),

      // HStack — right of vstack
      hstack([
        el(`<div style="background:rgba(66,133,244,0.2);border:1px solid rgba(66,133,244,0.5);border-radius:8px;padding:16px">
          <p style="font:500 18px Inter;color:#4285f4;margin:0">H1</p>
        </div>`, { id: 'hs-1', w: 150, h: 80 }),
        el(`<div style="background:rgba(234,67,53,0.2);border:1px solid rgba(234,67,53,0.5);border-radius:8px;padding:16px">
          <p style="font:500 18px Inter;color:#ea4335;margin:0">H2</p>
        </div>`, { id: 'hs-2', w: 150, h: 80 }),
        el(`<div style="background:rgba(52,168,83,0.2);border:1px solid rgba(52,168,83,0.5);border-radius:8px;padding:16px">
          <p style="font:500 18px Inter;color:#34a853;margin:0">H3</p>
        </div>`, { id: 'hs-3', w: 150, h: 80 }),
      ], {
        id: 'demo-hstack',
        x: rightOf('demo-vstack', { gap: 40 }),
        y: alignTopWith('demo-vstack'),
        gap: 'sm', align: 'middle',
      }),

      // Footer — absolute bottom
      el('<p style="font:400 18px Inter;color:rgba(255,255,255,0.3);text-align:center">SlideKit Inspector Demo</p>', {
        id: 'footer',
        x: 960, y: 1000, w: 600,
        anchor: 'bc',
      }),
    ],
  }];

  return await render(slides);
}

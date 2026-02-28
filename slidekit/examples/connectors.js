// connectors.js — Flowchart-style diagram with connected boxes
// Demonstrates: el (v2 API), connect (straight, curved, elbow), arrows, labels

import {
  init, render, safeRect,
  el,
  below, connect,
} from '../slidekit.js';

export async function run() {
  await init({
    slide: { w: 1920, h: 1080 },
    safeZone: { left: 120, right: 120, top: 90, bottom: 90 },
    minFontSize: 24,
  });

  const safe = safeRect();

  const slides = [{
    id: 'connectors',
    background: '#0c0c14',
    elements: [
      el('<p style="font:700 52px Inter;color:#ffffff">Connectors &amp; Flowcharts</p>', {
        id: 'heading',
        x: safe.x, y: safe.y, w: safe.w,
      }),

      el('', {
        id: 'heading-rule',
        x: safe.x, y: below('heading', { gap: 16 }),
        w: 80, h: 3,
        style: { background: '#7c5cbf' },
      }),

      // --- Top row: linear flow with straight connectors ---
      el('', {
        id: 'step-1',
        x: 170, y: 300, w: 280, h: 150,
        style: {
          background: 'linear-gradient(135deg, rgba(124,92,191,0.2), rgba(124,92,191,0.05))',
          border: '1px solid rgba(124,92,191,0.4)',
          borderRadius: '12px',
        },
      }),
      el('<p style="font:600 24px/1.3 Inter;color:#ffffff;text-align:center">Define<br>Elements</p>', {
        id: 'step-1-label',
        x: 210, y: 345, w: 200,
      }),

      el('', {
        id: 'step-2',
        x: 600, y: 300, w: 280, h: 150,
        style: {
          background: 'linear-gradient(135deg, rgba(66,133,244,0.2), rgba(66,133,244,0.05))',
          border: '1px solid rgba(66,133,244,0.4)',
          borderRadius: '12px',
        },
      }),
      el('<p style="font:600 24px/1.3 Inter;color:#ffffff;text-align:center">Layout<br>Solve</p>', {
        id: 'step-2-label',
        x: 640, y: 345, w: 200,
      }),

      el('', {
        id: 'step-3',
        x: 1030, y: 300, w: 280, h: 150,
        style: {
          background: 'linear-gradient(135deg, rgba(52,168,83,0.2), rgba(52,168,83,0.05))',
          border: '1px solid rgba(52,168,83,0.4)',
          borderRadius: '12px',
        },
      }),
      el('<p style="font:600 24px/1.3 Inter;color:#ffffff;text-align:center">Render<br>to DOM</p>', {
        id: 'step-3-label',
        x: 1070, y: 345, w: 200,
      }),

      el('', {
        id: 'step-4',
        x: 1460, y: 300, w: 280, h: 150,
        style: {
          background: 'linear-gradient(135deg, rgba(251,188,4,0.2), rgba(251,188,4,0.05))',
          border: '1px solid rgba(251,188,4,0.4)',
          borderRadius: '12px',
        },
      }),
      el('<p style="font:600 24px/1.3 Inter;color:#ffffff;text-align:center">Inspect<br>&amp; Iterate</p>', {
        id: 'step-4-label',
        x: 1500, y: 345, w: 200,
      }),

      // Straight connectors between steps
      connect('step-1', 'step-2', {
        id: 'conn-1-2',
        type: 'straight',
        arrow: 'end',
        color: '#7c5cbf',
        thickness: 2,
        fromAnchor: 'cr',
        toAnchor: 'cl',
      }),

      connect('step-2', 'step-3', {
        id: 'conn-2-3',
        type: 'straight',
        arrow: 'end',
        color: '#4285f4',
        thickness: 2,
        fromAnchor: 'cr',
        toAnchor: 'cl',
        label: 'layout()',
        labelStyle: { size: 14, color: 'rgba(255,255,255,0.5)' },
      }),

      connect('step-3', 'step-4', {
        id: 'conn-3-4',
        type: 'straight',
        arrow: 'end',
        color: '#34a853',
        thickness: 2,
        fromAnchor: 'cr',
        toAnchor: 'cl',
        label: 'render()',
        labelStyle: { size: 14, color: 'rgba(255,255,255,0.5)' },
      }),

      // --- Bottom section: different connector types ---
      el('<p style="font:600 32px Inter;color:#ffffff">Connector Types</p>', {
        id: 'types-label',
        x: safe.x, y: 560,
        w: 400,
      }),

      // Straight
      el('', {
        id: 'type-a1',
        x: 170, y: 650, w: 150, h: 80,
        style: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px' },
      }),
      el('<p style="font:600 20px Inter;color:#fff;text-align:center">A</p>', {
        id: 'type-a1-label', x: 225, y: 675, w: 40, anchor: 'cc',
      }),

      el('', {
        id: 'type-b1',
        x: 470, y: 650, w: 150, h: 80,
        style: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px' },
      }),
      el('<p style="font:600 20px Inter;color:#fff;text-align:center">B</p>', {
        id: 'type-b1-label', x: 525, y: 675, w: 40, anchor: 'cc',
      }),

      connect('type-a1', 'type-b1', {
        id: 'conn-straight',
        type: 'straight', arrow: 'end', color: '#7c5cbf', thickness: 2,
        fromAnchor: 'cr', toAnchor: 'cl',
      }),
      el('<p style="font:400 16px Inter;color:rgba(255,255,255,0.5);text-align:center">straight</p>', {
        id: 'straight-label', x: 300, y: 745, w: 200,
      }),

      // Curved
      el('', {
        id: 'type-a2',
        x: 720, y: 650, w: 150, h: 80,
        style: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px' },
      }),
      el('<p style="font:600 20px Inter;color:#fff;text-align:center">A</p>', {
        id: 'type-a2-label', x: 775, y: 675, w: 40, anchor: 'cc',
      }),

      el('', {
        id: 'type-b2',
        x: 1020, y: 650, w: 150, h: 80,
        style: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px' },
      }),
      el('<p style="font:600 20px Inter;color:#fff;text-align:center">B</p>', {
        id: 'type-b2-label', x: 1075, y: 675, w: 40, anchor: 'cc',
      }),

      connect('type-a2', 'type-b2', {
        id: 'conn-curved',
        type: 'curved', arrow: 'end', color: '#4285f4', thickness: 2,
        fromAnchor: 'cr', toAnchor: 'cl',
      }),
      el('<p style="font:400 16px Inter;color:rgba(255,255,255,0.5);text-align:center">curved</p>', {
        id: 'curved-label', x: 850, y: 745, w: 200,
      }),

      // Elbow
      el('', {
        id: 'type-a3',
        x: 1270, y: 650, w: 150, h: 80,
        style: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px' },
      }),
      el('<p style="font:600 20px Inter;color:#fff;text-align:center">A</p>', {
        id: 'type-a3-label', x: 1325, y: 675, w: 40, anchor: 'cc',
      }),

      el('', {
        id: 'type-b3',
        x: 1570, y: 650, w: 150, h: 80,
        style: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px' },
      }),
      el('<p style="font:600 20px Inter;color:#fff;text-align:center">B</p>', {
        id: 'type-b3-label', x: 1625, y: 675, w: 40, anchor: 'cc',
      }),

      connect('type-a3', 'type-b3', {
        id: 'conn-elbow',
        type: 'elbow', arrow: 'both', color: '#34a853', thickness: 2,
        fromAnchor: 'cr', toAnchor: 'cl',
      }),
      el('<p style="font:400 16px Inter;color:rgba(255,255,255,0.5);text-align:center">elbow (both arrows)</p>', {
        id: 'elbow-label', x: 1370, y: 745, w: 250,
      }),
    ],
  }];

  return await render(slides);
}

// demo-slide.js — Test slide for inspector feature development
// Uses multiple relationship types to test provenance inspection

import {
  init, render, safeRect,
  el, vstack, hstack, connect,
  below, rightOf, alignTopWith, centerHWith, between,
} from '../slidekit/slidekit.js';

export async function run() {
  await init({
    slide: { w: 1920, h: 1080 },
    safeZone: { left: 120, right: 120, top: 90, bottom: 90 },
    minFontSize: 24,
  });

  const safe = safeRect();

  // -- Slide 1: Inspector Demo --
  const slide1 = {
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
  };

  // -- Slide 2: "The Productivity Pressure Paradox" (ai_study slide 16) --
  // Circular flow diagram with connectors — tests connect(), vAlign, transforms
  const slide2 = (() => {
    // Theme tokens from the ai_study deck
    const T = {
      bg:          '#F7F5F0',
      bgDark:      '#1B2A4A',
      surface:     '#EDE9E1',
      text:        '#2A2A2A',
      textHeading: '#1B2A4A',
      textInverted:'#FFFFFF',
      muted:       '#736D62',
      accent:      '#C17D2F',
      fontHeading: "'Playfair Display', serif",
      fontBody:    "'Source Sans 3', sans-serif",
      sizeH3:      56,
      sizeBody:    28,
      sizeLabel:   20,
      sizeFooter:  16,
      lhHeading:   1.1,
      lhBody:      1.5,
      accentRuleWeight: 3,
      spacingMarginX: 134,
      spacingFooterY: 1040,
    };

    function footerBar(slideId, pageNum) {
      return [
        el(
          `<div style="display:flex;align-items:center;gap:10px;">
            <div style="width:28px;height:28px;background:${T.accent};display:flex;align-items:center;justify-content:center;">
              <span style="font-family:${T.fontBody};font-size:14px;font-weight:700;color:#FFFFFF;">A</span>
            </div>
            <span style="font-family:${T.fontBody};font-size:${T.sizeFooter}px;font-weight:400;color:${T.muted};">AI Study</span>
          </div>`,
          { id: `${slideId}-footer-logo`, x: T.spacingMarginX, y: T.spacingFooterY, w: 200 },
        ),
        el(
          `<p style="font-family:${T.fontBody};font-size:${T.sizeFooter}px;font-weight:400;color:${T.muted};text-align:right;">${pageNum}</p>`,
          { id: `${slideId}-footer-num`, x: 1920 - T.spacingMarginX - 60, y: T.spacingFooterY + 4, w: 60 },
        ),
      ];
    }

    // Headline
    const headlineEl = el(`<h2 style="font-family:${T.fontHeading};font-size:${T.sizeH3}px;font-weight:700;font-style:italic;color:${T.textHeading};line-height:${T.lhHeading};text-align:center;margin:0;">The Productivity Pressure Paradox</h2>`, {
      id: 's16-headline', x: 960, y: 90, w: 1000, anchor: 'tc', overflow: 'clip',
    });

    // Elliptical layout for 6 nodes
    const cx = 960, cy = 530;
    const rx = 380, ry = 240;
    const nodeW = 240, nodeH = 100;

    const nodeLabels = [
      'Raised Productivity\nExpectations',
      'Pressure for\nImmediate Gains',
      'Tighter\nDeadlines',
      'No Time\nto Learn',
      'Revert to\nFamiliar Methods',
      'Unrealized\nROI',
    ];

    const angles = nodeLabels.map((_, i) => (i * 2 * Math.PI) / 6 - Math.PI / 2);
    const nodePositions = angles.map(angle => ({
      x: cx + rx * Math.cos(angle) - nodeW / 2,
      y: cy + ry * Math.sin(angle) - nodeH / 2,
    }));

    const nodeElements = nodeLabels.map((label, i) => {
      const pos = nodePositions[i];
      const isOrigin = i === 0;
      const fill = isOrigin ? T.bgDark : T.surface;
      const textColor = isOrigin ? T.textInverted : T.text;
      const htmlLabel = label.replace('\n', '<br>');

      return el(
        `<p style="font-family:${T.fontBody};font-size:${T.sizeBody}px;font-weight:600;color:${textColor};line-height:1.25;text-align:center;">${htmlLabel}</p>`,
        {
          id: `s16-node${i}`,
          x: pos.x,
          y: pos.y,
          w: nodeW,
          h: nodeH,
          vAlign: 'center',
          style: { background: fill, ...(!isOrigin ? { border: `2px solid ${T.textHeading}` } : {}) },
        },
      );
    });

    // Connector arrows between sequential nodes (0→1→2→3→4→5→0)
    const connectorAnchors = [
      { from: 'cr', to: 'tl' },
      { from: 'bc', to: 'tc' },
      { from: 'bl', to: 'tr' },
      { from: 'cl', to: 'cr' },
      { from: 'tc', to: 'bc' },
      { from: 'tr', to: 'bl' },
    ];

    const connectorElements = connectorAnchors.map((anchors, i) => {
      const fromId = `s16-node${i}`;
      const toId = `s16-node${(i + 1) % 6}`;
      return connect(fromId, toId, {
        id: `s16-conn${i}`,
        type: 'straight',
        arrow: 'end',
        color: T.textHeading,
        thickness: 2,
        fromAnchor: anchors.from,
        toAnchor: anchors.to,
      });
    });

    // Break-point callout
    const breakX = cx - 180;
    const breakY = cy + ry + 80;

    const breakoutEl = el(
      `<div>
        <p style="font-family:${T.fontBody};font-size:${T.sizeLabel}px;font-weight:600;color:${T.accent};line-height:1.3;margin:0 0 6px 0;">BREAK THE CYCLE:</p>
        <p style="font-family:${T.fontBody};font-size:${T.sizeLabel}px;font-weight:400;color:${T.text};line-height:1.3;margin:0;">Context-Specific Resources + Protected Time</p>
      </div>`,
      {
        id: 's16-breakout',
        x: breakX,
        y: breakY,
        w: 360,
        style: {
          background: T.bg,
          border: `${T.accentRuleWeight}px solid ${T.accent}`,
          padding: '16px 20px',
        },
      },
    );

    const breakArrow = connect('s16-breakout', 's16-node4', {
      id: 's16-break-arrow',
      type: 'straight',
      arrow: 'end',
      color: T.accent,
      thickness: 2,
      fromAnchor: 'tc',
      toAnchor: 'bc',
    });

    return {
      id: 'slide-16',
      background: T.bg,
      elements: [
        headlineEl,
        ...nodeElements,
        ...connectorElements,
        breakoutEl,
        breakArrow,
        ...footerBar('s16', '16'),
      ],
      transforms: [
        { step: 1, ids: ['s16-headline'], enter: 'fade' },
        { step: 2, ids: ['s16-node0'], enter: 'fade' },
        { step: 3, ids: ['s16-node1', 's16-conn0'], enter: 'fade' },
        { step: 4, ids: ['s16-node2', 's16-conn1'], enter: 'fade' },
        { step: 5, ids: ['s16-node3', 's16-conn2'], enter: 'fade' },
        { step: 6, ids: ['s16-node4', 's16-conn3'], enter: 'fade' },
        { step: 7, ids: ['s16-node5', 's16-conn4'], enter: 'fade' },
        { step: 8, ids: ['s16-conn5'], enter: 'fade' },
        { step: 9, ids: ['s16-breakout', 's16-break-arrow'], enter: 'fade' },
      ],
    };
  })();

  // -- Slide 3: Copy of slide 16 with diff applied --
  const slide3 = (() => {
    const T = {
      bg:          '#F7F5F0',
      bgDark:      '#1B2A4A',
      surface:     '#EDE9E1',
      text:        '#2A2A2A',
      textHeading: '#1B2A4A',
      textInverted:'#FFFFFF',
      muted:       '#736D62',
      accent:      '#C17D2F',
      fontHeading: "'Playfair Display', serif",
      fontBody:    "'Source Sans 3', sans-serif",
      sizeH3:      56,
      sizeBody:    28,
      sizeLabel:   20,
      sizeFooter:  16,
      lhHeading:   1.1,
      lhBody:      1.5,
      accentRuleWeight: 3,
      spacingMarginX: 134,
      spacingFooterY: 1040,
    };

    function footerBar(slideId, pageNum) {
      return [
        el(
          `<div style="display:flex;align-items:center;gap:10px;">
            <div style="width:28px;height:28px;background:${T.accent};display:flex;align-items:center;justify-content:center;">
              <span style="font-family:${T.fontBody};font-size:14px;font-weight:700;color:#FFFFFF;">A</span>
            </div>
            <span style="font-family:${T.fontBody};font-size:${T.sizeFooter}px;font-weight:400;color:${T.muted};">AI Study</span>
          </div>`,
          { id: `${slideId}-footer-logo`, x: T.spacingMarginX, y: T.spacingFooterY, w: 200 },
        ),
        el(
          `<p style="font-family:${T.fontBody};font-size:${T.sizeFooter}px;font-weight:400;color:${T.muted};text-align:right;">${pageNum}</p>`,
          { id: `${slideId}-footer-num`, x: 1920 - T.spacingMarginX - 60, y: T.spacingFooterY + 4, w: 60 },
        ),
      ];
    }

    const headlineEl = el(`<h2 style="font-family:${T.fontHeading};font-size:${T.sizeH3}px;font-weight:700;font-style:italic;color:${T.textHeading};line-height:${T.lhHeading};text-align:center;margin:0;">The Productivity Pressure Paradox</h2>`, {
      id: 's16b-headline', x: 960, y: 90, w: 1000, anchor: 'tc', overflow: 'clip',
    });

    // "Updated" badge
    const updatedBadge = el(
      `<p style="font-family:${T.fontBody};font-size:14px;font-weight:700;color:#fff;background:${T.accent};padding:4px 12px;border-radius:4px;display:inline-block;">UPDATED</p>`,
      { id: 's16b-updated', x: 1920 - T.spacingMarginX, y: 90, w: 120, anchor: 'tr' },
    );

    const cx = 960, cy = 530;
    const rx = 380, ry = 240;
    const nodeW = 240, nodeH = 100;

    const nodeLabels = [
      'Raised Productivity\nExpectations',
      'Pressure for\nImmediate Gains',
      'Tighter\nDeadlines',
      'No Time\nto Learn',
      'Revert to\nFamiliar Methods',
      'Unrealized\nROI',
    ];

    const angles = nodeLabels.map((_, i) => (i * 2 * Math.PI) / 6 - Math.PI / 2);
    const nodePositions = angles.map(angle => ({
      x: cx + rx * Math.cos(angle) - nodeW / 2,
      y: cy + ry * Math.sin(angle) - nodeH / 2,
    }));

    const nodeElements = nodeLabels.map((label, i) => {
      const pos = nodePositions[i];
      const isOrigin = i === 0;
      const fill = isOrigin ? T.bgDark : T.surface;
      const textColor = isOrigin ? T.textInverted : T.text;
      const htmlLabel = label.replace('\n', '<br>');

      // Diff: s16-node0 h: 100 → 119
      const h = i === 0 ? 119 : nodeH;

      return el(
        `<p style="font-family:${T.fontBody};font-size:${T.sizeBody}px;font-weight:600;color:${textColor};line-height:1.25;text-align:center;">${htmlLabel}</p>`,
        {
          id: `s16b-node${i}`,
          x: pos.x,
          y: pos.y,
          w: nodeW,
          h: h,
          vAlign: 'center',
          style: { background: fill, ...(!isOrigin ? { border: `2px solid ${T.textHeading}` } : {}) },
        },
      );
    });

    // Connector arrows — with diff changes applied:
    //   s16-conn2: toAnchor "tr" → "cr"
    //   s16-conn3: toAnchor "cr" → "br"
    //   s16-conn5: toAnchor "bl" → "cl"
    const connectorAnchors = [
      { from: 'cr', to: 'tl' },   // conn0 — unchanged
      { from: 'bc', to: 'tc' },   // conn1 — unchanged
      { from: 'bl', to: 'cr' },   // conn2 — toAnchor: tr → cr
      { from: 'cl', to: 'br' },   // conn3 — toAnchor: cr → br
      { from: 'tc', to: 'bc' },   // conn4 — unchanged
      { from: 'tr', to: 'cl' },   // conn5 — toAnchor: bl → cl
    ];

    const connectorElements = connectorAnchors.map((anchors, i) => {
      const fromId = `s16b-node${i}`;
      const toId = `s16b-node${(i + 1) % 6}`;
      return connect(fromId, toId, {
        id: `s16b-conn${i}`,
        type: 'straight',
        arrow: 'end',
        color: T.textHeading,
        thickness: 2,
        fromAnchor: anchors.from,
        toAnchor: anchors.to,
      });
    });

    // Break-point callout — uses between() API for positioning
    const breakoutEl = el(
      `<div>
        <p style="font-family:${T.fontBody};font-size:${T.sizeLabel}px;font-weight:600;color:${T.accent};line-height:1.3;margin:0 0 6px 0;">BREAK THE CYCLE:</p>
        <p style="font-family:${T.fontBody};font-size:${T.sizeLabel}px;font-weight:400;color:${T.text};line-height:1.3;margin:0;">Context-Specific Resources + Protected Time</p>
      </div>`,
      {
        id: 's16b-breakout',
        x: between('s16b-node3', 's16b-node5', { axis: 'x' }),
        y: below('s16b-node3', { gap: 40 }),
        w: 360,
        anchor: 'tc',
        style: {
          background: T.bg,
          border: `${T.accentRuleWeight}px solid ${T.accent}`,
          padding: '16px 20px',
        },
      },
    );

    // Break arrow — diff: type straight → orthogonal, toId node4 → node3, cornerRadius: 8
    const breakArrow = connect('s16b-breakout', 's16b-node3', {
      id: 's16b-break-arrow',
      type: 'orthogonal',
      arrow: 'end',
      color: T.accent,
      thickness: 2,
      fromAnchor: 'tc',
      toAnchor: 'bc',
      cornerRadius: 8,
    });

    return {
      id: 'slide-16-updated',
      background: T.bg,
      elements: [
        headlineEl,
        updatedBadge,
        ...nodeElements,
        ...connectorElements,
        breakoutEl,
        breakArrow,
        ...footerBar('s16b', '16'),
      ],
      transforms: [
        { step: 1, ids: ['s16b-headline'], enter: 'fade' },
        { step: 2, ids: ['s16b-node0'], enter: 'fade' },
        { step: 3, ids: ['s16b-node1', 's16b-conn0'], enter: 'fade' },
        { step: 4, ids: ['s16b-node2', 's16b-conn1'], enter: 'fade' },
        { step: 5, ids: ['s16b-node3', 's16b-conn2'], enter: 'fade' },
        { step: 6, ids: ['s16b-node4', 's16b-conn3'], enter: 'fade' },
        { step: 7, ids: ['s16b-node5', 's16b-conn4'], enter: 'fade' },
        { step: 8, ids: ['s16b-conn5'], enter: 'fade' },
        { step: 9, ids: ['s16b-breakout', 's16b-break-arrow'], enter: 'fade' },
      ],
    };
  })();

  const slides = [slide1, slide2, slide3];

  return await render(slides);
}

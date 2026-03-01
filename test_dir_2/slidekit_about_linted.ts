// slidekit_about.ts — SlideKit: The Presentation About Itself
// A self-referential deck that teaches SlideKit's API by using it.

import {
  init, render, safeRect, splitRect, el,
  below, above, rightOf, leftOf, centerHWith, centerVWith, centerIn,
  alignTopWith, placeBetween,
  panel, hstack, vstack, group, connect,
  alignTop, distributeH, matchWidth, matchHeight, fitToRect,
  cardGrid, figure, grid, snap, repeat,
  getSpacing, resolveShadow,
} from '../slidekit/dist/slidekit_ts.bundle.js';

import type {
  SlideDefinition,
  SlideElement,
  Rect,
} from '../slidekit/src_ts/types.js';

// -- Design Tokens ------------------------------------------------------------

const C = {
  bg:             '#0a0a1a',
  bgAlt:          '#0f1029',
  accent1:        '#00d4ff',   // electric cyan
  accent2:        '#7c5cbf',   // violet
  accent3:        '#ff6b9d',   // coral
  accent4:        '#00ff88',   // mint green
  text:           '#ffffff',
  textSec:        'rgba(255,255,255,0.65)',
  textTer:        'rgba(255,255,255,0.4)',
  glass:          'rgba(255,255,255,0.04)',
  glassBorder:    'rgba(255,255,255,0.08)',
  glassEmph:      'rgba(255,255,255,0.07)',
  glassEmphBorder:'rgba(255,255,255,0.12)',
} as const;

const FONT = 'Inter';
const MONO = "'JetBrains Mono', monospace";

// -- Helper Functions ---------------------------------------------------------

/** Eyebrow label — small-caps, letter-spaced, colored. */
function mkEyebrow(text: string, id: string, color = C.accent1, extra: Record<string, unknown> = {}): SlideElement {
  return el(
    `<p style="font-family:${FONT};font-size:20px;font-weight:600;color:${color};text-transform:uppercase;letter-spacing:3px;">${text}</p>`,
    { id, ...extra },
  );
}

/** Thin gradient accent rule. */
function accentRule(id: string, extra: Record<string, unknown> = {}): SlideElement {
  return el(
    `<div style="width:100%;height:100%;background:linear-gradient(90deg, ${C.accent1}, ${C.accent2});border-radius:2px;"></div>`,
    { id, w: 80, h: 3, ...extra },
  );
}

/** Glass panel shorthand — returns a panel with glass styling. */
function glassPanel(
  children: SlideElement[],
  opts: {
    id: string;
    w?: number | string;
    h?: number;
    padding?: number | string;
    gap?: number | string;
    emphasis?: boolean;
    style?: Record<string, unknown>;
    [key: string]: unknown;
  },
): SlideElement {
  const { emphasis = false, style: extraStyle = {}, ...rest } = opts;
  return panel(children, {
    fill: emphasis ? C.glassEmph : C.glass,
    radius: 16,
    border: `1px solid ${emphasis ? C.glassEmphBorder : C.glassBorder}`,
    ...rest,
    style: extraStyle,
  });
}

/** Badge element for the title slide bottom row. */
function badge(text: string, id: string): SlideElement {
  return el(
    `<span style="font-family:${FONT};font-size:18px;font-weight:600;color:${C.accent1};border:1px solid rgba(0,212,255,0.3);padding:8px 24px;border-radius:6px;display:inline-block;letter-spacing:0.04em;">${text}</span>`,
    { id, w: 220, h: 50 },
  );
}

/** Slide title at standard size (56px). */
function slideTitle(text: string, id: string, extra: Record<string, unknown> = {}): SlideElement {
  return el(
    `<h2 style="font-family:${FONT};font-size:56px;font-weight:700;color:${C.text};line-height:1.2;">${text}</h2>`,
    { id, h: 75, ...extra },
  );
}

/** Body text at standard size (26px). */
function bodyText(text: string, id: string, extra: Record<string, unknown> = {}): SlideElement {
  return el(
    `<p style="font-family:${FONT};font-size:26px;font-weight:400;color:${C.textSec};line-height:1.6;">${text}</p>`,
    { id, ...extra },
  );
}

/** Code block text (monospace, mint green). */
function codeText(text: string, id: string, extra: Record<string, unknown> = {}): SlideElement {
  return el(
    `<pre style="font-family:${MONO};font-size:22px;color:${C.accent4};line-height:1.5;margin:0;white-space:pre;">${text}</pre>`,
    { id, ...extra },
  );
}

/** Small caption text. */
function caption(text: string, id: string, extra: Record<string, unknown> = {}): SlideElement {
  return el(
    `<p style="font-family:${FONT};font-size:18px;font-weight:400;color:${C.textTer};line-height:1.4;">${text}</p>`,
    { id, ...extra },
  );
}

// -- Main Entry ---------------------------------------------------------------

export async function run() {
  await init({
    slide: { w: 1920, h: 1080 },
    safeZone: { left: 120, right: 120, top: 90, bottom: 90 },
    minFontSize: 12,
    fonts: [
      { family: 'Inter', weights: [300, 400, 600, 700, 800], source: 'google' },
      { family: 'JetBrains Mono', weights: [400, 600], source: 'google' },
    ],
  });

  const safe: Rect = safeRect();

  const slides: SlideDefinition[] = [

    // ================================================================
    // SLIDE 1: TITLE — "What is SlideKit?"
    // ================================================================
    {
      id: 'title',
      background: C.bg,
      notes: 'SlideKit is a coordinate-based layout engine for presentations, designed so AI agents can author slides deterministically. This deck is itself built with SlideKit.',
      elements: [
        // Background radial glow (bg layer)
        el('<div style="width:100%;height:100%;background:radial-gradient(ellipse at 50% 45%, rgba(0,212,255,0.08) 0%, transparent 55%);"></div>', {
          id: 's1-glow',
          x: 0, y: 0, w: 1920, h: 1080,
          layer: 'bg',
        }),

        // Eyebrow: INTRODUCING
        mkEyebrow('Introducing', 's1-eyebrow', C.accent1, {
          x: 960, y: 300, anchor: 'bc', w: 400,
          style: { textAlign: 'center' },
        }),

        // Hero title: SlideKit (96px)
        el(`<h1 style="font-family:${FONT};font-size:96px;font-weight:800;color:${C.text};line-height:1.0;text-align:center;">SlideKit</h1>`, {
          id: 's1-title',
          x: 960, y: below('s1-eyebrow', { gap: 'md' }),
          w: 1000, h: 120, anchor: 'tc',
        }),

        // Accent rule below title
        accentRule('s1-rule', {
          x: 960 - 40, y: below('s1-title', { gap: 'lg' }),
        }),

        // Tagline
        el(`<p style="font-family:${FONT};font-size:30px;font-weight:400;color:${C.textSec};line-height:1.5;text-align:center;">Coordinate-based slide layout for the AI\u00a0era</p>`, {
          id: 's1-tagline',
          x: 960, y: below('s1-rule', { gap: 'md' }),
          w: 900, anchor: 'tc',
        }),

        // Bottom badges row
        hstack([
          badge('Deterministic', 's1-badge1'),
          el(`<span style="font-family:${FONT};font-size:24px;color:${C.textTer};">\u00b7</span>`, {
            id: 's1-dot1', w: 30, h: 50,
          }),
          badge('Measurable', 's1-badge2'),
          el(`<span style="font-family:${FONT};font-size:24px;color:${C.textTer};">\u00b7</span>`, {
            id: 's1-dot2', w: 30, h: 50,
          }),
          badge('Validated', 's1-badge3'),
        ], {
          id: 's1-badges',
          x: 960, y: 880,
          anchor: 'bc',
          gap: 16,
          align: 'middle',
        }),

        // Decorative rotated rectangle (bottom-right)
        el('<div style="width:100%;height:100%;background:linear-gradient(135deg, rgba(0,212,255,0.15), rgba(124,92,191,0.15));border-radius:4px;"></div>', {
          id: 's1-deco-rect',
          x: 1650, y: 850, w: 200, h: 8,
          rotate: 15,
          opacity: 0.12,
          layer: 'bg',
        }),
      ],
    },

    // ================================================================
    // SLIDE 2: THE PROBLEM — "CSS Wasn't Built for Slides"
    // ================================================================
    {
      id: 'the-problem',
      background: C.bg,
      notes: 'CSS layout was designed for reflowing documents. Slides are fixed canvases. When auto-layout decides wrong, you debug cascading interactions instead of designing.',
      elements: (() => {
        const { left, right } = splitRect(safe, { ratio: 0.5, gap: 60 });

        const leftElements: SlideElement[] = [
          // Left column: text content
          vstack([
            mkEyebrow('The Problem', 's2-eyebrow', C.accent3),

            slideTitle("CSS Wasn\u2019t Built for Slides", 's2-title'),

            accentRule('s2-rule'),

            bodyText(
              'CSS layout was designed for reflowing documents that adapt to variable screen sizes. Slides are the opposite\u00a0\u2014 fixed canvases where every element has a deliberate position.',
              's2-body1',
            ),

            bodyText(
              'When you use auto-layout for slides, the <strong style="color:#ffffff;">browser decides</strong> where things go. When it decides wrong, you debug cascading interactions and emergent reflow.',
              's2-body2',
            ),
          ], {
            id: 's2-left-stack',
            x: left.x, y: left.y, w: left.w,
            gap: 'md',
            align: 'left',
          }),
        ];

        // Right column: "CSS chaos" panels
        const chaosPanel = (label: string, idx: number): SlideElement =>
          panel([
            el(`<p style="font-family:${MONO};font-size:20px;color:${C.accent3};line-height:1.4;">${label}</p>`, {
              id: `s2-chaos-label${idx}`, w: 'fill',
            }),
          ], {
            id: `s2-chaos-panel${idx}`,
            w: right.w,
            padding: 'sm', gap: 6,
            fill: 'rgba(255,107,157,0.08)',
            radius: 12,
            border: '1px solid rgba(255,107,157,0.2)',
          });

        const panelGap = 80;
        const rightElements: SlideElement[] = [
          // Three chaos panels
          (() => { const p = chaosPanel('flex-grow: 1 ???', 1); (p as any).props.x = right.x; (p as any).props.y = right.y + 60; return p; })(),
          (() => { const p = chaosPanel('margin collapse ???', 2); (p as any).props.x = right.x; (p as any).props.y = right.y + 60 + panelGap + 50; return p; })(),
          (() => { const p = chaosPanel('min-width override ???', 3); (p as any).props.x = right.x; (p as any).props.y = right.y + 60 + (panelGap + 50) * 2; return p; })(),

          // Connectors between chaos panels (curved, both arrows — chaos!)
          connect('s2-chaos-panel1', 's2-chaos-panel2', {
            id: 's2-conn1',
            type: 'curved',
            arrow: 'both',
            color: C.accent3,
            thickness: 2,
            dash: [6, 4],
          }),
          connect('s2-chaos-panel2', 's2-chaos-panel3', {
            id: 's2-conn2',
            type: 'curved',
            arrow: 'both',
            color: C.accent3,
            thickness: 2,
            dash: [6, 4],
          }),
          connect('s2-chaos-panel1', 's2-chaos-panel3', {
            id: 's2-conn3',
            type: 'curved',
            arrow: 'both',
            color: 'rgba(255,107,157,0.4)',
            thickness: 1,
            fromAnchor: 'br',
            toAnchor: 'tr',
          }),
        ];

        return [...leftElements, ...rightElements];
      })(),
    },

    // ================================================================
    // SLIDE 3: THE SOLUTION — "Just Say Where Things Go"
    // ================================================================
    {
      id: 'the-solution',
      background: C.bgAlt,
      notes: 'SlideKit uses explicit coordinates. You say where an element goes and it goes there. No surprises, no debugging layout engine quirks.',
      elements: (() => {
        const { left, right } = splitRect(safe, { ratio: 0.45, gap: 60 });

        return [
          // Left side: eyebrow + title + code block
          vstack([
            mkEyebrow('The Solution', 's3-eyebrow', C.accent1),

            slideTitle('Just Say Where Things Go', 's3-title'),

            accentRule('s3-rule'),

            // Code block panel
            panel([
              codeText(
`el(<span style="color:${C.accent3};">'Hello World'</span>, {
  <span style="color:${C.accent1};">x</span>: 200, <span style="color:${C.accent1};">y</span>: 300,
  <span style="color:${C.accent1};">w</span>: 800, <span style="color:${C.accent1};">h</span>: 400
})`,
                's3-code',
                { w: 'fill' },
              ),
            ], {
              id: 's3-code-panel',
              w: left.w,
              padding: 'md', gap: 8,
              fill: 'rgba(0,255,136,0.04)',
              radius: 12,
              border: `1px solid rgba(0,255,136,0.15)`,
            }),
          ], {
            id: 's3-left-stack',
            x: left.x, y: left.y, w: left.w,
            gap: 'md',
            align: 'left',
          }),

          // Right side: visual representation
          group([
            // Canvas outline
            el('<div style="width:100%;height:100%;border:1px solid rgba(255,255,255,0.15);border-radius:4px;"></div>', {
              id: 's3-canvas-outline',
              x: 0, y: 0, w: 560, h: 315,
            }),

            // Placed element (proportionally mapped: 200/1920*560≈58, 300/1080*315≈87)
            el('<div style="width:100%;height:100%;background:rgba(0,80,120,0.6);border:1px solid rgba(0,212,255,0.4);border-radius:4px;display:flex;align-items:center;justify-content:center;"><span style="font-family:Inter;font-size:18px;color:#ffffff;">Hello World</span></div>', {
              id: 's3-placed-el',
              x: 58, y: 87, w: 233, h: 116,
            }),

            // Coordinate labels
            el(`<span style="font-family:${MONO};font-size:14px;color:${C.accent1};line-height:1.4;">(200, 300)</span>`, {
              id: 's3-coord-tl',
              x: 58, y: 68, w: 150, h: 54,
            }),
            el(`<span style="font-family:${MONO};font-size:14px;color:${C.accent1};line-height:1.4;">(1000, 700)</span>`, {
              id: 's3-coord-br',
              x: 233 + 58 - 10, y: 87 + 116 + 12, w: 150, h: 54,
            }),
          ], {
            id: 's3-canvas-group',
            x: right.x + right.w / 2, y: right.y + 80,
            w: 560, h: 340,
            bounds: 'hug',
            anchor: 'tc',
          }),

          // Caption below canvas
          caption(
            '\u201cYou say where. It goes there. No\u00a0surprises.\u201d',
            's3-caption',
            {
              x: centerHWith('s3-canvas-group'),
              y: below('s3-canvas-group', { gap: 'lg' }),
              w: 500, anchor: 'tc',
              style: { textAlign: 'center', fontStyle: 'italic' },
            },
          ),
        ];
      })(),
    },

    // ================================================================
    // SLIDE 4: WHY AI AGENTS LOVE IT — "LLMs Think in Coordinates"
    // ================================================================
    {
      id: 'for-ai',
      background: C.bg,
      notes: 'AI agents can reason about geometry. They cannot simulate browser layout engines. Coordinates are deterministic — same input always produces same output.',
      elements: (() => {
        const cardW = (safe.w - 80) / 2;  // two cards with gap

        return [
          // Title stack
          vstack([
            mkEyebrow('Designed for AI', 's4-eyebrow', C.accent1),
            slideTitle('LLMs Think in Coordinates', 's4-title'),
          ], {
            id: 's4-title-stack',
            x: safe.x, y: safe.y, w: safe.w,
            gap: 'sm',
            align: 'left',
          }),

          // Two comparison cards
          hstack([
            // CSS card (bad)
            panel([
              el(`<p style="font-family:${FONT};font-size:24px;font-weight:700;color:${C.accent3};">\u274c CSS Approach</p>`, {
                id: 's4-css-heading', w: 'fill',
              }),
              codeText(
`display: flex;
gap: 1rem;
flex-wrap: wrap;
min-width: 200px;`,
                's4-css-code',
                { w: 'fill' },
              ),
              el(`<p style="font-family:${FONT};font-size:22px;color:${C.textSec};line-height:1.5;">\u2192 Where does it end up? \ud83e\udd37</p>`, {
                id: 's4-css-result', w: 'fill',
              }),
            ], {
              id: 's4-css-card',
              w: cardW,
              padding: 'lg', gap: 'md',
              fill: 'rgba(255,107,157,0.06)',
              radius: 16,
              border: '1px solid rgba(255,107,157,0.2)',
            }),

            // SlideKit card (good)
            panel([
              el(`<p style="font-family:${FONT};font-size:24px;font-weight:700;color:${C.accent4};">\u2705 SlideKit Approach</p>`, {
                id: 's4-sk-heading', w: 'fill',
              }),
              codeText(
`x: 200, y: 300,
w: 800, h: 400`,
                's4-sk-code',
                { w: 'fill' },
              ),
              el(`<p style="font-family:${FONT};font-size:22px;color:${C.textSec};line-height:1.5;">\u2192 Exactly at (200,\u00a0300). Always.</p>`, {
                id: 's4-sk-result', w: 'fill',
              }),
            ], {
              id: 's4-sk-card',
              w: cardW,
              padding: 'lg', gap: 'md',
              fill: 'rgba(0,255,136,0.06)',
              radius: 16,
              border: '1px solid rgba(0,255,136,0.2)',
            }),
          ], {
            id: 's4-cards',
            x: safe.x, y: below('s4-title-stack', { gap: 'xl' }),
            w: safe.w,
            gap: 'lg',
            align: 'stretch',
          }),

          // Bottom quote
          el(`<p style="font-family:${FONT};font-size:24px;font-weight:400;color:${C.textTer};line-height:1.5;text-align:center;font-style:italic;">\u201cAI agents can reason about geometry. They cannot simulate browser layout engines.\u201d</p>`, {
            id: 's4-quote',
            x: safe.x, y: below('s4-cards', { gap: 'xl' }),
            w: safe.w, anchor: 'tl',
          }),
        ];
      })(),
    },

    // ================================================================
    // SLIDE 5: THE ANCHOR SYSTEM — "Nine Points of Control"
    // ================================================================
    {
      id: 'anchor-system',
      background: C.bg,
      notes: 'The anchor property controls which point of an element sits at (x, y). Nine anchor points give precise control: tl, tc, tr, cl, cc, cr, bl, bc, br.',
      elements: (() => {
        const anchors: Array<{ key: string; col: number; row: number }> = [
          { key: 'tl', col: 0, row: 0 }, { key: 'tc', col: 1, row: 0 }, { key: 'tr', col: 2, row: 0 },
          { key: 'cl', col: 0, row: 1 }, { key: 'cc', col: 1, row: 1 }, { key: 'cr', col: 2, row: 1 },
          { key: 'bl', col: 0, row: 2 }, { key: 'bc', col: 1, row: 2 }, { key: 'br', col: 2, row: 2 },
        ];

        const { left: leftR, right: rightR } = splitRect(safe, { ratio: 0.55, gap: 80 });

        // Anchor diagram dimensions
        const diagW = 420;
        const diagH = 260;
        const dotR = 10;
        const colSpacing = diagW / 2;
        const rowSpacing = diagH / 2;
        const diagPad = 40; // offset so no elements go negative

        // Build the 3x3 anchor diagram inside a group
        const dotElements: SlideElement[] = [];
        const labelElements: SlideElement[] = [];

        for (const a of anchors) {
          const dx = a.col * colSpacing + diagPad;
          const dy = a.row * rowSpacing + diagPad;
          const dotId = `s5-dot-${a.key}`;
          const labelId = `s5-label-${a.key}`;

          // Anchor dot (cyan circle with glow)
          dotElements.push(
            el(`<div style="width:${dotR * 2}px;height:${dotR * 2}px;border-radius:50%;background:${C.accent1};box-shadow:0 0 8px ${C.accent1};"></div>`, {
              id: dotId,
              x: dx - dotR, y: dy - dotR,
              w: dotR * 2, h: dotR * 2,
            }),
          );

          // Label next to dot
          labelElements.push(
            el(`<span style="font-family:${MONO};font-size:16px;color:${C.text};">${a.key}</span>`, {
              id: labelId,
              x: dx + dotR + 10, y: dy - 8,
              w: 40, h: 20,
            }),
          );
        }

        // Background rect for the diagram
        const diagBg = el(
          '<div style="width:100%;height:100%;border:1px solid rgba(255,255,255,0.12);border-radius:8px;background:rgba(255,255,255,0.02);"></div>',
          {
            id: 's5-diag-bg',
            x: diagPad - 30, y: diagPad - 30,
            w: diagW + 60, h: diagH + 60,
          },
        );

        // Three anchor demo examples using actual anchor property
        const demoAnchors = ['tl', 'cc', 'br'] as const;
        const demoW = 220;
        const demoH = 150;
        const blueW = 90;
        const blueH = 60;
        const demoGroups: SlideElement[] = [];
        // Dot position relative to group (center of container)
        const dotRelX = demoW / 2;
        const dotRelY = demoH / 2;

        for (let i = 0; i < demoAnchors.length; i++) {
          const ak = demoAnchors[i];
          const groupId = `s3-anchor-demo-${i}`;

          const container = el('<div style="width:100%;height:100%;border:1px solid rgba(255,255,255,0.12);border-radius:4px;background:rgba(255,255,255,0.05);"></div>', {
            id: `${groupId}-bg`,
            x: 0, y: 0,
            w: demoW, h: demoH,
          });

          const dot = el(`<div style="width:12px;height:12px;border-radius:50%;background:${C.accent3};box-shadow:0 0 8px ${C.accent3};position:relative;z-index:2;"></div>`, {
            id: `${groupId}-dot`,
            x: dotRelX - 6, y: dotRelY - 6,
            w: 12, h: 12,
          });

          const blueBox = el('<div style="width:100%;height:100%;background:rgba(0,212,255,0.2);border:1px solid rgba(0,212,255,0.5);border-radius:3px;"></div>', {
            id: `${groupId}-blue`,
            x: dotRelX, y: dotRelY,
            w: blueW, h: blueH,
            anchor: ak,
          });

          const label = el(`<span style="font-family:${MONO};font-size:18px;color:${C.accent1};text-align:center;display:block;">anchor: '${ak}'</span>`, {
            id: `${groupId}-label`,
            x: 0, y: demoH + 12,
            w: demoW, h: 28,
          });

          demoGroups.push(
            group([container, blueBox, dot, label], {
              id: groupId,
              x: 0, y: below('s5-demo-heading', { gap: 'lg' }),
              w: demoW, h: demoH + 12 + 28,
            }),
          );
        }

        return [
          // Title area
          vstack([
            mkEyebrow('Positioning', 's5-eyebrow', C.accent1),
            slideTitle('The Anchor System', 's5-title'),
            bodyText('Nine points of control for precise element placement', 's5-subtitle'),
          ], {
            id: 's5-title-stack',
            x: safe.x, y: safe.y, w: safe.w,
            gap: 'sm',
            align: 'left',
          }),

          // Anchor diagram group
          group([diagBg, ...dotElements, ...labelElements], {
            id: 's5-diagram',
            x: leftR.x + leftR.w / 2,
            y: below('s5-title-stack', { gap: 'xl' }),
            w: diagW + 60 + diagPad, h: diagH + 60 + diagPad,
            bounds: 'hug',
            anchor: 'tc',
          }),

          // Caption below diagram
          caption(
            'Each anchor determines which point of the element sits at (x, y)',
            's5-diagram-caption',
            {
              x: centerHWith('s5-diagram'),
              y: below('s5-diagram', { gap: 'md' }),
              w: 500, anchor: 'tc',
              style: { textAlign: 'center' },
            },
          ),

          // Right side: three demo examples
          el(`<p style="font-family:${FONT};font-size:28px;font-weight:600;color:${C.text};">Same (x, y), different anchor:</p>`, {
            id: 's5-demo-heading',
            x: rightR.x, y: below('s5-title-stack', { gap: 'xl' }),
            w: rightR.w, h: 40,
          }),

          ...demoGroups,
        ];
      })(),
      transforms: [
        alignTop(['s3-anchor-demo-0', 's3-anchor-demo-1', 's3-anchor-demo-2']),
        distributeH(['s3-anchor-demo-0', 's3-anchor-demo-1', 's3-anchor-demo-2'], {
          startX: safe.x + safe.w * 0.55 + 80,
          endX: safe.x + safe.w,
        }),
      ],
    },

    // ================================================================
    // SLIDE 6: RELATIVE POSITIONING — "Elements That Know About Each Other"
    // ================================================================
    {
      id: 'relative-positioning',
      background: C.bgAlt,
      notes: 'SlideKit resolves relative positions through a dependency graph with topological sort.',
      elements: (() => {
        const boxW = 140;
        const boxH = 70;
        const mkBox = (label: string, id: string, color: string) =>
          el(`<div style="width:100%;height:100%;background:rgba(${color},0.15);border:2px solid ${color};border-radius:8px;display:flex;align-items:center;justify-content:center;"><span style="font-family:${MONO};font-size:22px;font-weight:700;color:${color};">${label}</span></div>`, { id, w: boxW, h: boxH });

        const codeLabel = (text: string, id: string, color: string, extra: Record<string, unknown> = {}) =>
          el(`<span style="font-family:${MONO};font-size:15px;color:${color};">${text}</span>`, { id, w: 340, h: 22, ...extra });

        // centerIn demo rect
        const ciRect = { x: 1400, y: 740, w: 260, h: 140 };
        const ciPos = centerIn(ciRect);

        return [
          // Title
          vstack([
            mkEyebrow('Relative Positioning', 's6-eyebrow', C.accent1),
            slideTitle('Elements That Know About Each Other', 's6-title'),
          ], {
            id: 's6-title-stack',
            x: safe.x, y: safe.y, w: safe.w,
            gap: 'sm',
            align: 'left',
          }),

          // Box A — fixed anchor
          (() => { const b = mkBox('A', 's6-boxA', C.accent1); (b as any).props.x = 700; (b as any).props.y = 480; return b; })(),

          // Box B — below A
          (() => { const b = mkBox('B', 's6-boxB', C.accent2); (b as any).props.x = 700; (b as any).props.y = below('s6-boxA', { gap: 150 }); return b; })(),

          // Box C — right of A, aligned top with A
          (() => { const b = mkBox('C', 's6-boxC', C.accent3); (b as any).props.x = rightOf('s6-boxA', { gap: 40 }); (b as any).props.y = alignTopWith('s6-boxA'); return b; })(),

          // Box D — left of A, above A
          (() => { const b = mkBox('D', 's6-boxD', C.accent4); (b as any).props.x = leftOf('s6-boxA', { gap: 40 }); (b as any).props.y = above('s6-boxA', { gap: 24 }); return b; })(),

          // Box E — placed between A and B, offset right
          (() => { const b = mkBox('E', 's6-boxE', 'rgba(255,255,255,0.6)'); (b as any).props.x = 700; (b as any).props.y = placeBetween('s6-boxA', 's6-boxB'); return b; })(),

          // Connectors
          connect('s6-boxA', 's6-boxB', {
            id: 's6-connAB',
            type: 'elbow',
            fromAnchor: 'cl',
            toAnchor: 'cl',
            arrow: 'end',
            color: C.accent2,
            thickness: 2,
          }),
          connect('s6-boxA', 's6-boxC', {
            id: 's6-connAC',
            type: 'straight',
            arrow: 'end',
            color: C.accent3,
            thickness: 2,
          }),

          // Code labels next to each box
          codeLabel('below(\'A\', {gap:150})', 's6-labelB', C.accent2, {
            x: leftOf('s6-boxB', { gap: 16 }), y: alignTopWith('s6-boxB'), style: { textAlign: 'right' },
          }),
          codeLabel('rightOf(\'A\') + alignTopWith(\'A\')', 's6-labelC', C.accent3, {
            x: rightOf('s6-boxC', { gap: 16 }), y: alignTopWith('s6-boxC'),
          }),
          codeLabel('leftOf(\'A\') + above(\'A\')', 's6-labelD', C.accent4, {
            x: leftOf('s6-boxD', { gap: 16 }), y: alignTopWith('s6-boxD'), style: { textAlign: 'right' },
          }),
          codeLabel('placeBetween(\'A\', \'B\')', 's6-labelE', C.textSec, {
            x: rightOf('s6-boxE', { gap: 16 }), y: alignTopWith('s6-boxE'),
          }),

          // centerIn() demo — outlined rect with centered label
          el('<div style="width:100%;height:100%;border:2px dashed rgba(0,212,255,0.3);border-radius:8px;"></div>', {
            id: 's6-centerRect',
            x: ciRect.x, y: ciRect.y, w: ciRect.w, h: ciRect.h,
          }),
          el(`<span style="font-family:${MONO};font-size:16px;color:${C.accent1};text-align:center;display:block;">centerIn(rect)</span>`, {
            id: 's6-centerLabel',
            x: ciPos.x, y: ciPos.y,
            w: 160, h: 24, anchor: 'cc',
          }),

          // Caption for centerIn
          caption('Position a label dead-center inside any rect', 's6-centerCaption', {
            x: ciRect.x, y: ciRect.y + ciRect.h + 12,
            w: ciRect.w, h: 22,
            style: { textAlign: 'center' },
          }),
        ];
      })(),
    },

    // ================================================================
    // SLIDE 7: STACK LAYOUTS — "Vertical & Horizontal Flow"
    // ================================================================
    {
      id: 'stack-layouts',
      background: C.bg,
      notes: 'Stacks resolve to absolute coordinates — they\'re syntactic sugar over the coordinate system, not CSS flexbox.',
      elements: (() => {
        const { left, right } = splitRect(safe, { ratio: 0.48, gap: 60 });

        // Small colored bar for stack demos
        const bar = (id: string, color: string, w: number, h: number) =>
          el(`<div style="width:100%;height:100%;background:${color};border-radius:4px;"></div>`, { id, w, h });

        const sectionLabel = (text: string, id: string, color: string, extra: Record<string, unknown> = {}) =>
          el(`<p style="font-family:${FONT};font-size:28px;font-weight:700;color:${color};">${text}</p>`, { id, w: 300, h: 36, ...extra });

        const modeLabel = (text: string, id: string) =>
          el(`<span style="font-family:${MONO};font-size:14px;color:${C.textTer};">${text}</span>`, { id, w: 120, h: 20 });

        // vstack alignment modes
        const vstackAligns = ['left', 'center', 'right', 'stretch'] as const;
        const vstackDemos: SlideElement[] = [];
        const vstackPanelIds: string[] = [];

        for (let i = 0; i < vstackAligns.length; i++) {
          const align = vstackAligns[i];
          const panelId = `s7-vs-panel-${align}`;
          vstackPanelIds.push(panelId);
          vstackDemos.push(
            panel([
              modeLabel(align, `s7-vs-lbl-${align}`),
              vstack([
                bar(`s7-vs-${align}-a`, C.accent1, 100, 16),
                bar(`s7-vs-${align}-b`, C.accent2, 60, 16),
                bar(`s7-vs-${align}-c`, C.accent3, 130, 16),
              ], {
                id: `s7-vs-${align}`,
                w: 160, gap: 8,
                align: align as any,
              }),
            ], {
              id: panelId,
              w: left.w,
              padding: 'sm', gap: 8,
              fill: C.glass,
              radius: 12,
              border: `1px solid ${C.glassBorder}`,
            }),
          );
        }

        // hstack alignment modes
        const hstackAligns = ['top', 'middle', 'bottom', 'stretch'] as const;
        const hstackDemos: SlideElement[] = [];

        for (let i = 0; i < hstackAligns.length; i++) {
          const align = hstackAligns[i];
          hstackDemos.push(
            panel([
              modeLabel(align, `s7-hs-lbl-${align}`),
              hstack([
                bar(`s7-hs-${align}-a`, C.accent1, 30, 50),
                bar(`s7-hs-${align}-b`, C.accent2, 30, 30),
                bar(`s7-hs-${align}-c`, C.accent3, 30, 70),
              ], {
                id: `s7-hs-${align}`,
                h: 80, gap: 8,
                align: align as any,
              }),
            ], {
              id: `s7-hs-panel-${align}`,
              w: right.w,
              padding: 'sm', gap: 8,
              fill: C.glass,
              radius: 12,
              border: `1px solid ${C.glassBorder}`,
            }),
          );
        }

        return [
          // Title
          vstack([
            mkEyebrow('Stack Layouts', 's7-eyebrow', C.accent1),
            slideTitle('Vertical & Horizontal Flow', 's7-title'),
          ], {
            id: 's7-title-stack',
            x: safe.x, y: safe.y, w: safe.w,
            gap: 'sm',
            align: 'left',
          }),

          // Left column: vstack demos
          sectionLabel('vstack', 's7-vs-heading', C.accent1, {
            x: left.x, y: below('s7-title-stack', { gap: 'xl' }),
          }),

          vstack(vstackDemos, {
            id: 's7-vs-demos',
            x: left.x, y: below('s7-vs-heading', { gap: 'md' }),
            w: left.w,
            gap: 'sm',
            align: 'left',
          }),

          // Right column: hstack demos
          sectionLabel('hstack', 's7-hs-heading', C.accent2, {
            x: right.x, y: below('s7-title-stack', { gap: 'xl' }),
          }),

          vstack(hstackDemos, {
            id: 's7-hs-demos',
            x: right.x, y: below('s7-hs-heading', { gap: 'md' }),
            w: right.w,
            gap: 'sm',
            align: 'left',
          }),
        ];
      })(),
      transforms: [
        matchWidth(['s7-vs-panel-left', 's7-vs-panel-center', 's7-vs-panel-right', 's7-vs-panel-stretch']),
      ],
    },

    // ================================================================
    // SLIDE 8: TRANSFORMS — "PowerPoint-Style Precision"
    // ================================================================
    {
      id: 'transforms',
      background: C.bg,
      notes: 'Transforms run in Phase 3 of the layout pipeline, after positions are resolved.',
      elements: (() => {
        const colW = 200;
        const beforeY = 340;
        const afterY = 680;

        const makeRect = (id: string, color: string, x: number, y: number, w: number, h: number) =>
          el(`<div style="width:100%;height:100%;background:${color};border-radius:6px;opacity:0.85;"></div>`, { id, x, y, w, h });

        // fitToRect demo area
        const fitRect = { x: safe.x + safe.w - 400, y: 380, w: 340, h: 280 };

        return [
          // Title
          vstack([
            mkEyebrow('Transforms', 's8-eyebrow', C.accent1),
            slideTitle('PowerPoint-Style Precision', 's8-title'),
          ], {
            id: 's8-title-stack',
            x: safe.x, y: safe.y, w: safe.w,
            gap: 'sm',
            align: 'left',
          }),

          // BEFORE label
          el(`<p style="font-family:${FONT};font-size:22px;font-weight:700;color:${C.accent3};text-transform:uppercase;letter-spacing:2px;">Before</p>`, {
            id: 's8-before-label',
            x: safe.x, y: beforeY - 40, w: 200, h: 30,
          }),

          // Before: 3 misaligned rectangles
          makeRect('s8-before1', 'rgba(0,212,255,0.25)', safe.x, beforeY, 180, 100),
          makeRect('s8-before2', 'rgba(124,92,191,0.25)', safe.x + 220, beforeY + 30, 240, 70),
          makeRect('s8-before3', 'rgba(255,107,157,0.25)', safe.x + 500, beforeY + 15, 160, 120),

          // AFTER label
          el(`<p style="font-family:${FONT};font-size:22px;font-weight:700;color:${C.accent4};text-transform:uppercase;letter-spacing:2px;">After</p>`, {
            id: 's8-after-label',
            x: safe.x, y: afterY - 40, w: 200, h: 30,
          }),

          // After: 3 rectangles (transforms will align & distribute them)
          makeRect('s8-after1', 'rgba(0,212,255,0.4)', safe.x, afterY, 180, 100),
          makeRect('s8-after2', 'rgba(124,92,191,0.4)', safe.x + 220, afterY + 30, 240, 70),
          makeRect('s8-after3', 'rgba(255,107,157,0.4)', safe.x + 500, afterY + 15, 160, 120),

          // Elbow connectors from before to after
          connect('s8-before1', 's8-after1', {
            id: 's8-conn1',
            type: 'elbow',
            arrow: 'end',
            color: C.textTer,
            thickness: 1,
            dash: [4, 4],
          }),
          connect('s8-before2', 's8-after2', {
            id: 's8-conn2',
            type: 'elbow',
            arrow: 'end',
            color: C.textTer,
            thickness: 1,
            dash: [4, 4],
          }),
          connect('s8-before3', 's8-after3', {
            id: 's8-conn3',
            type: 'elbow',
            arrow: 'end',
            color: C.textTer,
            thickness: 1,
            dash: [4, 4],
          }),

          // Transform code annotation
          el(`<pre style="font-family:${MONO};font-size:16px;color:${C.accent4};line-height:1.6;margin:0;">transforms: [\n  alignTop([...]),\n  distributeH([...]),\n  matchHeight([...])\n]</pre>`, {
            id: 's8-code-annotation',
            x: safe.x, y: afterY + 140, w: 340, h: 90,
          }),

          // fitToRect demo
          el('<div style="width:100%;height:100%;border:2px dashed rgba(0,212,255,0.3);border-radius:8px;"></div>', {
            id: 's8-fit-outline',
            x: fitRect.x, y: fitRect.y, w: fitRect.w, h: fitRect.h,
          }),
          el(`<p style="font-family:${FONT};font-size:20px;font-weight:600;color:${C.accent1};text-transform:uppercase;letter-spacing:2px;">fitToRect()</p>`, {
            id: 's8-fit-label',
            x: fitRect.x, y: fitRect.y - 36, w: 200, h: 28,
          }),
          makeRect('s8-fit-a', 'rgba(0,212,255,0.3)', fitRect.x + 20, fitRect.y + 20, 80, 60),
          makeRect('s8-fit-b', 'rgba(124,92,191,0.3)', fitRect.x + 120, fitRect.y + 50, 100, 40),
          makeRect('s8-fit-c', 'rgba(255,107,157,0.3)', fitRect.x + 240, fitRect.y + 30, 60, 80),
        ];
      })(),
      transforms: [
        alignTop(['s8-after1', 's8-after2', 's8-after3']),
        distributeH(['s8-after1', 's8-after2', 's8-after3'], {
          startX: safe.x,
          endX: safe.x + safe.w * 0.55,
        }),
        matchHeight(['s8-after1', 's8-after2', 's8-after3']),
        fitToRect(['s8-fit-a', 's8-fit-b', 's8-fit-c'], {
          x: safe.x + safe.w - 400 + 20,
          y: 400,
          w: 300,
          h: 240,
        }),
      ],
    },

    // ================================================================
    // SLIDE 9: PANELS & CARD GRIDS — "Structured Content"
    // ================================================================
    {
      id: 'panels-card-grids',
      background: C.bgAlt,
      notes: 'cardGrid automatically equalizes heights per row for consistent visual rhythm.',
      elements: (() => {
        const spacing = getSpacing('lg');
        const shadow = resolveShadow('md');

        const cards = [
          { title: 'Measurement',    color: C.accent1, desc: 'Every element has a resolved bounding box. Query positions, check overlaps, validate alignment.' },
          { title: 'Validation',     color: C.accent2, desc: 'Built-in warnings for overflow, overlap, tiny text, and missing fonts — before you render.' },
          { title: 'Layering',       color: C.accent3, desc: 'Explicit layer ordering: bg → default → fg → overlay. No z-index guessing games.' },
          { title: 'Speaker Notes',  color: C.accent4, desc: 'Attach notes to any slide. Rendered in presenter view, excluded from PDF export.' },
          { title: 'Debug Overlay',  color: C.accent1, desc: 'Toggle bounding-box outlines, safe-zone markers, and element IDs for rapid debugging.' },
          { title: 'Theming',        color: C.accent2, desc: 'Define design tokens once. Reference them everywhere. Change the palette in one place.' },
        ];

        const cardElements: SlideElement[] = cards.map((card, i) =>
          panel([
            // Colored accent bar at top
            el(`<div style="width:100%;height:100%;background:${card.color};border-radius:3px;"></div>`, {
              id: `s9-card${i}-bar`, w: 'fill', h: 4,
            }),
            // Card title
            el(`<p style="font-family:${FONT};font-size:22px;font-weight:700;color:${C.text};">${card.title}</p>`, {
              id: `s9-card${i}-title`, w: 'fill',
            }),
            // Thin divider
            el(`<div style="width:100%;height:1px;background:${C.glassBorder};"></div>`, {
              id: `s9-card${i}-divider`, w: 'fill', h: 1,
            }),
            // Description
            el(`<p style="font-family:${FONT};font-size:18px;color:${C.textSec};line-height:1.5;">${card.desc}</p>`, {
              id: `s9-card${i}-desc`, w: 'fill',
            }),
          ], {
            id: `s9-card${i}`,
            w: (safe.w - spacing * 2) / 3,
            padding: 'lg',
            gap: 'sm',
            fill: C.glassEmph,
            radius: 16,
            border: `1px solid ${C.glassEmphBorder}`,
            shadow,
          }),
        );

        return [
          // Title
          vstack([
            mkEyebrow('Structured Content', 's9-eyebrow', C.accent1),
            slideTitle('Panels & Card Grids', 's9-title'),
          ], {
            id: 's9-title-stack',
            x: safe.x, y: safe.y, w: safe.w,
            gap: 'sm',
            align: 'left',
          }),

          // Card grid
          cardGrid(cardElements, {
            id: 's9-grid',
            cols: 3,
            gap: 'lg',
            x: safe.x,
            y: below('s9-title-stack', { gap: 'xl' }),
            w: safe.w,
          }),
        ];
      })(),
    },

    // ================================================================
    // SLIDE 10: CONNECTORS — "Draw Relationships"
    // ================================================================
    {
      id: 'connectors',
      background: C.bg,
      notes: 'Connectors render as SVG paths. They resolve their endpoints from the scene graph after layout solve.',
      elements: (() => {
        const pipeBoxW = 220;
        const pipeBoxH = 80;
        const subBoxW = 160;
        const subBoxH = 56;

        const pipeBox = (label: string, id: string, color: string) =>
          el(`<div style="width:100%;height:100%;background:rgba(${color});border:2px solid ${color};border-radius:12px;display:flex;align-items:center;justify-content:center;"><span style="font-family:${FONT};font-size:22px;font-weight:700;color:${C.text};">${label}</span></div>`, { id, w: pipeBoxW, h: pipeBoxH });

        const subBox = (label: string, id: string, borderColor: string) =>
          el(`<div style="width:100%;height:100%;background:${C.glass};border:1px solid ${borderColor};border-radius:8px;display:flex;align-items:center;justify-content:center;"><span style="font-family:${FONT};font-size:18px;font-weight:600;color:${C.textSec};">${label}</span></div>`, { id, w: subBoxW, h: subBoxH });

        return [
          // Title
          vstack([
            mkEyebrow('Connectors', 's10-eyebrow', C.accent1),
            slideTitle('Draw Relationships', 's10-title'),
          ], {
            id: 's10-title-stack',
            x: safe.x, y: safe.y, w: safe.w,
            gap: 'sm',
            align: 'left',
          }),

          // Pipeline: three main boxes in hstack
          hstack([
            pipeBox('Specify', 's10-specify', C.accent1),
            pipeBox('Layout Solve', 's10-layout', C.accent2),
            pipeBox('Render', 's10-render', C.accent3),
          ], {
            id: 's10-pipeline',
            x: safe.x + safe.w / 2, y: below('s10-title-stack', { gap: 'xl' }),
            w: safe.w * 0.85,
            anchor: 'tc',
            gap: 80,
            align: 'middle',
          }),

          // Straight connector: Specify → Layout
          connect('s10-specify', 's10-layout', {
            id: 's10-conn-straight',
            type: 'straight',
            arrow: 'end',
            color: C.accent1,
            thickness: 2,
            label: 'straight',
            labelStyle: { fontFamily: MONO, fontSize: '13px', color: C.textTer },
          }),

          // Curved connector: Layout → Render
          connect('s10-layout', 's10-render', {
            id: 's10-conn-curved',
            type: 'curved',
            arrow: 'end',
            color: C.accent2,
            thickness: 2,
            label: 'curved',
            labelStyle: { fontFamily: MONO, fontSize: '13px', color: C.textTer },
          }),

          // Sub-boxes below Layout
          (() => {
            const b = subBox('Warnings', 's10-warnings', C.accent4);
            (b as any).props.x = centerHWith('s10-layout');
            (b as any).props.y = below('s10-pipeline', { gap: 100 });
            (b as any).props.anchor = 'tc';
            return b;
          })(),

          (() => {
            const b = subBox('Errors', 's10-errors', C.accent3);
            (b as any).props.x = rightOf('s10-warnings', { gap: 40 });
            (b as any).props.y = centerVWith('s10-warnings');
            return b;
          })(),

          // Elbow connector: Layout → Warnings (dashed)
          connect('s10-layout', 's10-warnings', {
            id: 's10-conn-warn',
            type: 'elbow',
            arrow: 'end',
            color: C.accent4,
            thickness: 2,
            dash: [6, 4],
            fromAnchor: 'bc',
            toAnchor: 'tc',
          }),

          // Elbow connector: Layout → Errors
          connect('s10-layout', 's10-errors', {
            id: 's10-conn-err',
            type: 'elbow',
            arrow: 'end',
            color: C.accent3,
            thickness: 2,
            fromAnchor: 'bc',
            toAnchor: 'tc',
            label: 'elbow',
            labelStyle: { fontFamily: MONO, fontSize: '13px', color: C.textTer },
          }),

          // Connector type legend at bottom
          caption(
            'Three connector types: straight \u00b7 curved \u00b7 elbow  \u2014  with arrow, dash & label options',
            's10-legend',
            {
              x: safe.x + safe.w / 2, y: below('s10-warnings', { gap: 'xl' }),
              w: 700, h: 28, anchor: 'tc',
              style: { textAlign: 'center' },
            },
          ),
        ];
      })(),
    },

    // ================================================================
    // SLIDE 11: GRID, SNAP & REPEAT — "Consistent Alignment"
    // ================================================================
    {
      id: 'grid-snap-repeat',
      background: C.bgAlt,
      notes: 'The grid system provides consistent alignment. Snap rounds to pixel grid. Repeat clones elements.',
      elements: (() => {
        const g = grid({ cols: 12, gutter: 30 });

        return [
          // Title
          vstack([
            mkEyebrow('Utilities', 's11-eyebrow', C.accent1),
            slideTitle('Grid, Snap & Repeat', 's11-title'),
          ], {
            id: 's11-title-stack',
            x: safe.x, y: safe.y, w: safe.w,
            gap: 'sm',
            align: 'left',
          }),

          // --- Section 1: grid() ---
          el(`<p style="font-family:${FONT};font-size:28px;font-weight:600;color:${C.text};">grid()</p>`, {
            id: 's11-grid-heading',
            x: safe.x, y: below('s11-title-stack', { gap: 'lg' }),
            w: 200, h: 36,
          }),

          // Grid demo: colored column bands
          group([
            // Full 12-column bar (background)
            el('<div style="width:100%;height:100%;background:rgba(255,255,255,0.04);border-radius:6px;"></div>', {
              id: 's11-grid-bg', x: 0, y: 0, w: safe.w, h: 50,
            }),
            // Span 1-4 (cyan) — subtract marginLeft since children are relative to group
            el(`<div style="width:100%;height:100%;background:rgba(0,140,180,0.5);border:1px solid rgba(0,212,255,0.4);border-radius:4px;display:flex;align-items:center;justify-content:center;"><span style="font-family:${MONO};font-size:14px;color:#ffffff;">cols 1–4</span></div>`, {
              id: 's11-span1', x: g.col(1) - g.marginLeft, y: 4, w: g.spanW(1, 4), h: 42,
            }),
            // Span 5-8 (violet)
            el(`<div style="width:100%;height:100%;background:rgba(124,92,191,0.2);border:1px solid rgba(124,92,191,0.4);border-radius:4px;display:flex;align-items:center;justify-content:center;"><span style="font-family:${MONO};font-size:14px;color:#ffffff;">cols 5–8</span></div>`, {
              id: 's11-span2', x: g.col(5) - g.marginLeft, y: 4, w: g.spanW(5, 8), h: 42,
            }),
            // Span 9-12 (coral)
            el(`<div style="width:100%;height:100%;background:rgba(180,60,100,0.5);border:1px solid rgba(255,107,157,0.4);border-radius:4px;display:flex;align-items:center;justify-content:center;"><span style="font-family:${MONO};font-size:14px;color:#ffffff;">cols 9–12</span></div>`, {
              id: 's11-span3', x: g.col(9) - g.marginLeft, y: 4, w: g.spanW(9, 12), h: 42,
            }),
          ], {
            id: 's11-grid-demo',
            x: safe.x, y: below('s11-grid-heading', { gap: 'sm' }),
            w: safe.w, h: 50,
          }),

          // Code caption for grid
          caption(
            'grid({ cols: 12, gutter: 30 })  →  g.col(1), g.spanW(1, 4)',
            's11-grid-caption',
            {
              x: safe.x, y: below('s11-grid-demo', { gap: 'sm' }),
              w: safe.w, h: 24,
            },
          ),

          // --- Section 2: snap() ---
          el(`<p style="font-family:${FONT};font-size:28px;font-weight:600;color:${C.text};">snap()</p>`, {
            id: 's11-snap-heading',
            x: safe.x, y: below('s11-grid-caption', { gap: 'lg' }),
            w: 200, h: 36,
          }),

          hstack([
            // 157 → 160
            panel([
              el(`<p style="font-family:${MONO};font-size:22px;color:${C.textSec};text-align:center;"><span style="color:${C.accent3};">157</span> → <span style="color:${C.accent4};">160</span></p>`, {
                id: 's11-snap-val1', w: 'fill',
              }),
            ], {
              id: 's11-snap-panel1',
              w: 220, padding: 'sm',
              fill: C.glass, radius: 12,
              border: `1px solid ${C.glassBorder}`,
            }),
            // Arrow
            el(`<span style="font-family:${MONO};font-size:24px;color:${C.textTer};">snap(v, 10)</span>`, {
              id: 's11-snap-arrow', w: 200, h: 40,
            }),
            // 243 → 240
            panel([
              el(`<p style="font-family:${MONO};font-size:22px;color:${C.textSec};text-align:center;"><span style="color:${C.accent3};">243</span> → <span style="color:${C.accent4};">240</span></p>`, {
                id: 's11-snap-val2', w: 'fill',
              }),
            ], {
              id: 's11-snap-panel2',
              w: 220, padding: 'sm',
              fill: C.glass, radius: 12,
              border: `1px solid ${C.glassBorder}`,
            }),
          ], {
            id: 's11-snap-row',
            x: safe.x, y: below('s11-snap-heading', { gap: 'sm' }),
            gap: 'md',
            align: 'middle',
          }),

          caption(
            'snap(157, 10) → 160   |   snap(243, 10) → 240',
            's11-snap-caption',
            {
              x: safe.x, y: below('s11-snap-row', { gap: 'sm' }),
              w: safe.w, h: 24,
            },
          ),

          // --- Section 3: repeat() ---
          el(`<p style="font-family:${FONT};font-size:28px;font-weight:600;color:${C.text};">repeat()</p>`, {
            id: 's11-repeat-heading',
            x: safe.x, y: below('s11-snap-caption', { gap: 'lg' }),
            w: 200, h: 36,
          }),

          // 4×3 dot grid via repeat()
          (() => {
            const rg = repeat(
              el(`<div style="width:100%;height:100%;border-radius:50%;background:${C.accent1};opacity:0.6;"></div>`, {
                id: 's11-repeat-dot', w: 14, h: 14,
              }),
              { count: 12, cols: 4, gapX: 28, gapY: 28 },
            );
            (rg as any).id = 's11-dot-grid';
            (rg as any).props.x = safe.x;
            (rg as any).props.y = below('s11-repeat-heading', { gap: 'sm' });
            return rg;
          })(),

          caption(
            'repeat(dot, { count: 12, cols: 4, gapX: 28, gapY: 28 })',
            's11-repeat-caption',
            {
              x: safe.x, y: below('s11-dot-grid', { gap: 'sm' }),
              w: safe.w, h: 24,
            },
          ),
        ];
      })(),
    },

    // ================================================================
    // SLIDE 12: FIGURES — "Structured Visual Containers"
    // ================================================================
    {
      id: 'figures',
      background: C.bg,
      notes: 'Figures wrap images with structured containers, padding, and optional captions.',
      elements: (() => {
        const placeholderSvg = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 400 300%22%3E%3Crect fill=%22%2300d4ff%22 width=%22400%22 height=%22300%22 opacity=%220.3%22/%3E%3C/svg%3E';

        return [
          // Title
          vstack([
            mkEyebrow('Compound Elements', 's12-eyebrow', C.accent1),
            slideTitle('Figures', 's12-title'),
            bodyText('Structured visual containers with padding, radius & captions', 's12-subtitle'),
          ], {
            id: 's12-title-stack',
            x: safe.x, y: safe.y, w: safe.w,
            gap: 'sm',
            align: 'left',
          }),

          // Three figures in hstack
          hstack([
            // Figure 1: basic with containerFill
            figure({
              id: 's12-fig1',
              src: placeholderSvg,
              w: 320, h: 240,
              containerFill: 'rgba(0,212,255,0.08)',
            }),

            // Figure 2: with radius and padding
            figure({
              id: 's12-fig2',
              src: placeholderSvg,
              w: 320, h: 240,
              containerFill: 'rgba(124,92,191,0.08)',
              containerRadius: 16,
              containerPadding: 16,
            }),

            // Figure 3: with caption and captionGap
            figure({
              id: 's12-fig3',
              src: placeholderSvg,
              w: 320, h: 240,
              containerFill: 'rgba(0,255,136,0.08)',
              containerRadius: 12,
              containerPadding: 12,
              caption: `<span style="font-family:${FONT};font-size:16px;color:${C.textSec};">Fig 3 — with caption</span>`,
              captionGap: 12,
            }),
          ], {
            id: 's12-figures-row',
            x: safe.x, y: below('s12-title-stack', { gap: 'xl' }),
            w: safe.w,
            gap: 'lg',
            align: 'top',
          }),

          // Labels beneath each figure
          caption('containerFill', 's12-label1', {
            x: safe.x + 160, y: below('s12-figures-row', { gap: 'sm' }),
            w: 320, h: 24, anchor: 'tc',
            style: { textAlign: 'center' },
          }),

          caption('containerRadius + Padding', 's12-label2', {
            x: safe.x + 160 + 320 + getSpacing('lg'), y: below('s12-figures-row', { gap: 'sm' }),
            w: 320, h: 24, anchor: 'tc',
            style: { textAlign: 'center' },
          }),

          caption('caption + captionGap', 's12-label3', {
            x: safe.x + 160 + (320 + getSpacing('lg')) * 2, y: below('s12-figures-row', { gap: 'sm' }),
            w: 320, h: 24, anchor: 'tc',
            style: { textAlign: 'center' },
          }),

          // Anatomy section: annotation lines
          group([
            // Container outline
            el('<div style="width:100%;height:100%;border:2px dashed rgba(0,212,255,0.3);border-radius:12px;"></div>', {
              id: 's12-anatomy-outline',
              x: 0, y: 0, w: 400, h: 260,
            }),
            // Padding area
            el('<div style="width:100%;height:100%;border:1px dashed rgba(124,92,191,0.4);border-radius:8px;background:rgba(124,92,191,0.05);"></div>', {
              id: 's12-anatomy-padding',
              x: 16, y: 16, w: 368, h: 196,
            }),
            // Image placeholder
            el(`<div style="width:100%;height:100%;background:rgba(0,120,160,0.5);border-radius:4px;display:flex;align-items:center;justify-content:center;"><span style="font-family:${MONO};font-size:14px;color:#ffffff;">image</span></div>`, {
              id: 's12-anatomy-image',
              x: 28, y: 28, w: 344, h: 172,
            }),
            // Caption area
            el(`<div style="width:100%;height:100%;background:rgba(255,255,255,0.04);border-radius:4px;display:flex;align-items:center;justify-content:center;"><span style="font-family:${MONO};font-size:14px;color:${C.textTer};">caption</span></div>`, {
              id: 's12-anatomy-caption',
              x: 16, y: 228, w: 368, h: 24,
            }),
            // Labels
            el(`<span style="font-family:${MONO};font-size:13px;color:${C.accent1};">containerFill</span>`, {
              id: 's12-anatomy-lbl1', x: 410, y: 4, w: 120, h: 18,
            }),
            el(`<span style="font-family:${MONO};font-size:13px;color:${C.accent2};">containerPadding</span>`, {
              id: 's12-anatomy-lbl2', x: 410, y: 40, w: 140, h: 18,
            }),
            el(`<span style="font-family:${MONO};font-size:13px;color:${C.textTer};">captionGap</span>`, {
              id: 's12-anatomy-lbl3', x: 410, y: 218, w: 100, h: 18,
            }),
          ], {
            id: 's12-anatomy',
            x: safe.x + safe.w - 600,
            y: below('s12-label1', { gap: 'lg' }),
            w: 560, h: 270,
            bounds: 'hug',
          }),
        ];
      })(),
    },

    // ================================================================
    // SLIDE 13: STYLING — "You Own the Pixels"
    // ================================================================
    {
      id: 'styling',
      background: C.bg,
      notes: 'SlideKit passes through all CSS except properties that conflict with the coordinate system.',
      elements: (() => {
        const cardW = (safe.w - getSpacing('lg')) / 2;

        return [
          // Title
          vstack([
            mkEyebrow('Visual Design', 's13-eyebrow', C.accent1),
            slideTitle('You Own the Pixels', 's13-title'),
          ], {
            id: 's13-title-stack',
            x: safe.x, y: safe.y, w: safe.w,
            gap: 'sm',
            align: 'left',
          }),

          // 2×2 card grid
          cardGrid([
            // Card 1: Gradient backgrounds
            panel([
              el(`<p style="font-family:${FONT};font-size:22px;font-weight:600;color:${C.text};margin-bottom:12px;">Gradients</p>`, {
                id: 's13-grad-label', w: 'fill',
              }),
              el('<div style="width:100%;height:100%;background:linear-gradient(135deg, #00d4ff 0%, #7c5cbf 50%, #ff6b9d 100%);border-radius:8px;"></div>', {
                id: 's13-grad-demo', w: 'fill', h: 80,
              }),
              el('<div style="width:100%;height:100%;background:linear-gradient(90deg, #0a0a1a, #00ff88, #0a0a1a);border-radius:8px;"></div>', {
                id: 's13-grad-demo2', w: 'fill', h: 40,
              }),
            ], {
              id: 's13-card-grad',
              w: cardW, padding: 'md', gap: 'sm',
              fill: C.glass, radius: 16,
              border: `1px solid ${C.glassBorder}`,
            }),

            // Card 2: Shadow presets
            panel([
              el(`<p style="font-family:${FONT};font-size:22px;font-weight:600;color:${C.text};margin-bottom:12px;">Shadow Presets</p>`, {
                id: 's13-shadow-label', w: 'fill',
              }),
              hstack([
                el(`<div style="width:100%;height:100%;background:${C.glassEmph};border-radius:6px;box-shadow:${resolveShadow('sm')};display:flex;align-items:center;justify-content:center;"><span style="font-family:${MONO};font-size:12px;color:${C.textSec};">sm</span></div>`, {
                  id: 's13-sh-sm', w: 56, h: 56,
                }),
                el(`<div style="width:100%;height:100%;background:${C.glassEmph};border-radius:6px;box-shadow:${resolveShadow('md')};display:flex;align-items:center;justify-content:center;"><span style="font-family:${MONO};font-size:12px;color:${C.textSec};">md</span></div>`, {
                  id: 's13-sh-md', w: 56, h: 56,
                }),
                el(`<div style="width:100%;height:100%;background:${C.glassEmph};border-radius:6px;box-shadow:${resolveShadow('lg')};display:flex;align-items:center;justify-content:center;"><span style="font-family:${MONO};font-size:12px;color:${C.textSec};">lg</span></div>`, {
                  id: 's13-sh-lg', w: 56, h: 56,
                }),
                el(`<div style="width:100%;height:100%;background:${C.glassEmph};border-radius:6px;box-shadow:${resolveShadow('xl')};display:flex;align-items:center;justify-content:center;"><span style="font-family:${MONO};font-size:12px;color:${C.textSec};">xl</span></div>`, {
                  id: 's13-sh-xl', w: 56, h: 56,
                }),
                el(`<div style="width:100%;height:100%;background:${C.glassEmph};border-radius:6px;box-shadow:${resolveShadow('glow')};display:flex;align-items:center;justify-content:center;"><span style="font-family:${MONO};font-size:12px;color:${C.accent1};">glow</span></div>`, {
                  id: 's13-sh-glow', w: 56, h: 56,
                }),
              ], {
                id: 's13-shadow-row',
                w: 'fill', gap: 'sm', align: 'middle',
              }),
            ], {
              id: 's13-card-shadow',
              w: cardW, padding: 'md', gap: 'sm',
              fill: C.glass, radius: 16,
              border: `1px solid ${C.glassBorder}`,
            }),

            // Card 3: Glass-morphism
            panel([
              el(`<p style="font-family:${FONT};font-size:22px;font-weight:600;color:${C.text};margin-bottom:12px;">Glass-morphism</p>`, {
                id: 's13-glass-label', w: 'fill',
              }),
              // Layered glass panels
              el('<div style="width:100%;height:100%;background:rgba(0,212,255,0.15);border-radius:12px;border:1px solid rgba(0,212,255,0.2);"></div>', {
                id: 's13-glass-bg', w: 'fill', h: 100,
              }),
              // Use el instead of nested panel to avoid w:'fill' resolution bug in nested panels
              el(`<div style="width:100%;height:100%;background:${C.glassEmph};border-radius:10px;border:1px solid ${C.glassEmphBorder};display:flex;align-items:center;padding:0 16px;"><p style="font-family:${FONT};font-size:16px;color:${C.text};margin:0;">Glass panel overlay</p></div>`, {
                id: 's13-glass-overlay', w: 'fill', h: 44,
              }),
            ], {
              id: 's13-card-glass',
              w: cardW, padding: 'md', gap: 'sm',
              fill: C.glass, radius: 16,
              border: `1px solid ${C.glassBorder}`,
            }),

            // Card 4: Borders & overflow
            panel([
              el(`<p style="font-family:${FONT};font-size:22px;font-weight:600;color:${C.text};margin-bottom:12px;">Borders & Overflow</p>`, {
                id: 's13-border-label', w: 'fill',
              }),
              el(`<div style="width:100%;height:100%;border:2px solid ${C.accent1};border-radius:8px;display:flex;align-items:center;justify-content:center;"><span style="font-family:${MONO};font-size:14px;color:${C.accent1};">solid border</span></div>`, {
                id: 's13-border-solid', w: 'fill', h: 40,
              }),
              el(`<div style="width:100%;height:100%;border:2px dashed ${C.accent2};border-radius:8px;display:flex;align-items:center;justify-content:center;"><span style="font-family:${MONO};font-size:14px;color:${C.accent2};">dashed border</span></div>`, {
                id: 's13-border-dashed', w: 'fill', h: 40,
              }),
              el(`<div style="width:100%;height:100%;background:rgba(180,60,100,0.5);border-radius:8px;overflow:hidden;position:relative;display:flex;align-items:center;"><div style="position:absolute;top:-10px;left:-10px;width:120%;height:120%;background:linear-gradient(45deg,rgba(255,107,157,0.3),transparent);"></div><span style="font-family:${MONO};font-size:14px;color:#ffffff;position:relative;padding:0 8px;text-shadow:0 1px 3px rgba(0,0,0,0.5);">overflow: clip</span></div>`, {
                id: 's13-border-clip', w: 'fill', h: 40,
                overflow: 'clip',
                className: 'sk-overflow-demo',
              }),
            ], {
              id: 's13-card-border',
              w: cardW, padding: 'md', gap: 'sm',
              fill: C.glass, radius: 16,
              border: `1px solid ${C.glassBorder}`,
            }),
          ], {
            id: 's13-card-grid',
            x: safe.x, y: below('s13-title-stack', { gap: 'lg' }),
            w: safe.w,
            cols: 2,
            gap: 'lg',
          }),
        ];
      })(),
    },

    // ================================================================
    // SLIDE 14: MEASUREMENT & VALIDATION — "Catch Problems Before You See Them"
    // ================================================================
    {
      id: 'measurement-validation',
      background: C.bgAlt,
      notes: 'measure() renders HTML off-screen and returns exact dimensions. Validation catches problems without visual inspection.',
      elements: (() => {
        const { left, right } = splitRect(safe, { ratio: 0.45, gap: 60 });

        return [
          // Title
          vstack([
            mkEyebrow('Quality', 's14-eyebrow', C.accent4),
            slideTitle('Catch Problems Early', 's14-title'),
          ], {
            id: 's14-title-stack',
            x: safe.x, y: safe.y, w: safe.w,
            gap: 'sm',
            align: 'left',
          }),

          // Left: measure() workflow
          panel([
            el(`<p style="font-family:${FONT};font-size:24px;font-weight:600;color:${C.text};margin-bottom:8px;">measure()</p>`, {
              id: 's14-measure-heading', w: 'fill',
            }),
            // Code showing measure call
            codeText(
`const size = await measure(
  '&lt;h1&gt;Hello World&lt;/h1&gt;',
  { w: 800, fontSize: 56 }
);
// → { w: 482, h: 64 }`,
              's14-measure-code',
              { w: 'fill' },
            ),
            // Bounding box visualization
            group([
              el('<div style="width:100%;height:100%;border:2px dashed rgba(0,212,255,0.4);border-radius:4px;"></div>', {
                id: 's14-bbox-outer', x: 0, y: 0, w: 300, h: 60,
              }),
              el(`<div style="width:100%;height:100%;background:rgba(0,60,80,0.5);border-radius:3px;display:flex;align-items:center;justify-content:center;"><span style="font-family:${FONT};font-size:20px;font-weight:700;color:${C.text};">Hello World</span></div>`, {
                id: 's14-bbox-inner', x: 0, y: 0, w: 200, h: 52,
              }),
              el(`<span style="font-family:${MONO};font-size:13px;color:${C.accent1};">{ w: 482, h: 64 }</span>`, {
                id: 's14-bbox-label', x: 210, y: 20, w: 140, h: 18,
              }),
            ], {
              id: 's14-bbox-group',
              x: 24, y: 0, w: 360, h: 60,
              bounds: 'hug',
            }),
          ], {
            id: 's14-measure-panel',
            x: left.x, y: below('s14-title-stack', { gap: 'xl' }),
            w: left.w, padding: 'lg', gap: 'md',
            fill: 'rgba(0,212,255,0.04)',
            radius: 16,
            border: `1px solid rgba(0,212,255,0.15)`,
          }),

          // Right: validation output
          panel([
            el(`<p style="font-family:${FONT};font-size:24px;font-weight:600;color:${C.text};margin-bottom:8px;">Validation Output</p>`, {
              id: 's14-valid-heading', w: 'fill',
            }),
            vstack([
              // Warning row
              panel([
                el(`<p style="font-family:${MONO};font-size:18px;color:#ffcc00;line-height:1.4;">⚠ Element "card-3" extends beyond safe zone (x: 1820 + w: 300 > 1800)</p>`, {
                  id: 's14-warn1-text', w: 'fill',
                }),
              ], {
                id: 's14-warn1',
                w: 'fill', padding: 'sm',
                fill: 'rgba(255,204,0,0.06)',
                radius: 8,
                border: '1px solid rgba(255,204,0,0.2)',
              }),
              // Error row
              panel([
                el(`<p style="font-family:${MONO};font-size:18px;color:${C.accent3};line-height:1.4;">✗ Element "title" missing required "w" property</p>`, {
                  id: 's14-err1-text', w: 'fill',
                }),
              ], {
                id: 's14-err1',
                w: 'fill', padding: 'sm',
                fill: 'rgba(255,107,157,0.06)',
                radius: 8,
                border: '1px solid rgba(255,107,157,0.2)',
              }),
              // Success row
              panel([
                el(`<p style="font-family:${MONO};font-size:18px;color:${C.accent4};line-height:1.4;">✓ 14 elements validated — no overlaps detected</p>`, {
                  id: 's14-ok1-text', w: 'fill',
                }),
              ], {
                id: 's14-ok1',
                w: 'fill', padding: 'sm',
                fill: 'rgba(0,255,136,0.06)',
                radius: 8,
                border: '1px solid rgba(0,255,136,0.2)',
              }),
            ], {
              id: 's14-valid-stack',
              w: 'fill', gap: 'sm', align: 'left',
            }),
          ], {
            id: 's14-valid-panel',
            x: right.x, y: below('s14-title-stack', { gap: 'xl' }),
            w: right.w, padding: 'lg', gap: 'md',
            fill: C.glass, radius: 16,
            border: `1px solid ${C.glassBorder}`,
          }),

          // Bottom: mini-slide with safeRect() visualization
          group([
            // Slide outline
            el('<div style="width:100%;height:100%;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.12);border-radius:4px;"></div>', {
              id: 's14-mini-slide', x: 0, y: 0, w: 400, h: 225,
            }),
            // Safe zone (dashed)
            el('<div style="width:100%;height:100%;border:2px dashed rgba(0,255,136,0.3);border-radius:2px;"></div>', {
              id: 's14-mini-safe', x: 25, y: 19, w: 350, h: 187,
            }),
            // Label
            el(`<span style="font-family:${MONO};font-size:13px;color:${C.accent4};background:${C.bgAlt};padding:0 4px;">safeRect()</span>`, {
              id: 's14-mini-label', x: 30, y: 12, w: 100, h: 16,
            }),
          ], {
            id: 's14-mini-group',
            x: placeBetween('s14-measure-panel', 's14-valid-panel'),
            y: below('s14-measure-panel', { gap: 'lg' }),
            w: 400, h: 225,
            bounds: 'hug',
            anchor: 'tc',
          }),
        ];
      })(),
    },

    // ================================================================
    // SLIDE 15: FULL EXAMPLE — "Putting It All Together"
    // ================================================================
    {
      id: 'full-example',
      background: C.bg,
      notes: 'A complete SlideKit slide is a plain object with elements array. No magic — just coordinates.',
      elements: (() => {
        const { left, right } = splitRect(safe, { ratio: 0.55, gap: 60 });

        return [
          // Title
          vstack([
            mkEyebrow('Complete Example', 's15-eyebrow', C.accent1),
            slideTitle('Putting It All Together', 's15-title'),
          ], {
            id: 's15-title-stack',
            x: safe.x, y: safe.y, w: safe.w,
            gap: 'sm',
            align: 'left',
          }),

          // Left: code editor panel
          panel([
            // Line numbers + code
            codeText(
`<span style="color:${C.textTer}"> 1</span>  {
<span style="color:${C.textTer}"> 2</span>    <span style="color:${C.accent1};">id</span>: <span style="color:${C.accent3};">'my-slide'</span>,
<span style="color:${C.textTer}"> 3</span>    <span style="color:${C.accent1};">background</span>: <span style="color:${C.accent3};">'#0a0a1a'</span>,
<span style="color:${C.textTer}"> 4</span>    <span style="color:${C.accent1};">elements</span>: [
<span style="color:${C.textTer}"> 5</span>      el(<span style="color:${C.accent3};">'&lt;h1&gt;Title&lt;/h1&gt;'</span>, {
<span style="color:${C.textTer}"> 6</span>        <span style="color:${C.accent1};">x</span>: 960, <span style="color:${C.accent1};">y</span>: 200,
<span style="color:${C.textTer}"> 7</span>        <span style="color:${C.accent1};">w</span>: 800, <span style="color:${C.accent1};">anchor</span>: <span style="color:${C.accent3};">'tc'</span>
<span style="color:${C.textTer}"> 8</span>      }),
<span style="color:${C.textTer}"> 9</span>      hstack([card1, card2, card3], {
<span style="color:${C.textTer}">10</span>        <span style="color:${C.accent1};">x</span>: 120, <span style="color:${C.accent1};">y</span>: 400,
<span style="color:${C.textTer}">11</span>        <span style="color:${C.accent1};">gap</span>: <span style="color:${C.accent3};">'lg'</span>
<span style="color:${C.textTer}">12</span>      }),
<span style="color:${C.textTer}">13</span>    ]
<span style="color:${C.textTer}">14</span>  }`,
              's15-code',
              { w: 'fill' },
            ),
          ], {
            id: 's15-code-panel',
            x: left.x,
            y: below('s15-title-stack', { gap: 'xl' }),
            w: left.w, padding: 'lg', gap: 0,
            fill: 'rgba(0,255,136,0.03)',
            radius: 16,
            border: `1px solid rgba(0,255,136,0.12)`,
          }),

          // Right: mini rendered slide
          group([
            // Slide frame
            el(`<div style="width:100%;height:100%;background:${C.bg};border:1px solid rgba(255,255,255,0.15);border-radius:6px;"></div>`, {
              id: 's15-mini-bg', x: 0, y: 0, w: 480, h: 270,
            }),

            // Mini title
            el(`<p style="font-family:${FONT};font-size:22px;font-weight:700;color:${C.text};text-align:center;">Title</p>`, {
              id: 's15-mini-title', x: 90, y: 40, w: 300, h: 30,
            }),

            // Mini subtitle
            el(`<p style="font-family:${FONT};font-size:14px;color:${C.textSec};text-align:center;">Subtitle text here</p>`, {
              id: 's15-mini-subtitle', x: 90, y: 78, w: 300, h: 20,
            }),

            // Three mini cards
            el(`<div style="width:100%;height:100%;background:rgba(0,212,255,0.1);border:1px solid rgba(0,212,255,0.3);border-radius:4px;"></div>`, {
              id: 's15-mini-card1', x: 30, y: 110, w: 130, h: 100,
            }),
            el(`<div style="width:100%;height:100%;background:rgba(124,92,191,0.1);border:1px solid rgba(124,92,191,0.3);border-radius:4px;"></div>`, {
              id: 's15-mini-card2', x: 175, y: 110, w: 130, h: 100,
            }),
            el(`<div style="width:100%;height:100%;background:rgba(0,255,136,0.1);border:1px solid rgba(0,255,136,0.3);border-radius:4px;"></div>`, {
              id: 's15-mini-card3', x: 320, y: 110, w: 130, h: 100,
            }),

            // Mini footer
            el(`<p style="font-family:${MONO};font-size:11px;color:${C.textTer};text-align:center;">Footer</p>`, {
              id: 's15-mini-footer', x: 140, y: 240, w: 200, h: 16,
            }),
          ], {
            id: 's15-mini-slide',
            x: right.x + right.w / 2,
            y: below('s15-title-stack', { gap: 'xl' }),
            w: 480, h: 270,
            bounds: 'hug',
            anchor: 'tc',
            scale: 0.85,
          }),

          // Connect annotation lines from code to rendered elements
          connect('s15-code-panel', 's15-mini-slide', {
            id: 's15-connect1',
            type: 'straight',
            arrow: 'end',
            color: C.accent1,
            thickness: 1,
            dash: [6, 4],
            fromAnchor: 'cr',
            toAnchor: 'cl',
          }),

          // Caption
          caption(
            'A complete slide is a plain object — no magic, just coordinates.',
            's15-caption',
            {
              x: centerHWith('s15-code-panel'),
              y: below('s15-code-panel', { gap: 'md' }),
              w: left.w, anchor: 'tc',
              style: { textAlign: 'center', fontStyle: 'italic' },
            },
          ),
        ];
      })(),
    },

    // ================================================================
    // SLIDE 16: CLOSING — "Start Building"
    // ================================================================
    {
      id: 'closing',
      background: C.bg,
      notes: 'Thank you for exploring SlideKit. Every slide in this presentation was built with the library it describes.',
      elements: [
        // Radial gradient overlay on bg layer
        el('<div style="width:100%;height:100%;background:radial-gradient(ellipse at 50% 40%, rgba(0,212,255,0.1) 0%, rgba(124,92,191,0.05) 40%, transparent 70%);"></div>', {
          id: 's16-glow',
          x: 0, y: 0, w: 1920, h: 1080,
          layer: 'bg',
        }),

        // Large centered title
        el(`<h1 style="font-family:${FONT};font-size:80px;font-weight:800;color:${C.text};text-align:center;line-height:1.1;">Start Building</h1>`, {
          id: 's16-title',
          x: 960, y: 300,
          w: 1000, anchor: 'tc',
          style: { textAlign: 'center' },
        }),

        // Accent rule
        accentRule('s16-rule', {
          x: 960 - 40, y: below('s16-title', { gap: 'md' }),
        }),

        // Subtitle
        el(`<p style="font-family:${FONT};font-size:28px;font-weight:400;color:${C.textSec};text-align:center;line-height:1.5;">Every slide in this presentation was built with the library it describes.</p>`, {
          id: 's16-subtitle',
          x: 960, y: below('s16-rule', { gap: 'md' }),
          w: 900, anchor: 'tc',
        }),

        // Three value cards in hstack
        hstack([
          panel([
            el(`<p style="font-family:${FONT};font-size:36px;text-align:center;">🎯</p>`, {
              id: 's16-icon1', w: 'fill',
            }),
            el(`<p style="font-family:${FONT};font-size:22px;font-weight:600;color:${C.text};text-align:center;">Deterministic</p>`, {
              id: 's16-val1-title', w: 'fill',
            }),
            el(`<p style="font-family:${FONT};font-size:16px;color:${C.textSec};text-align:center;line-height:1.5;">Same input, same output. Every\u00a0time.</p>`, {
              id: 's16-val1-desc', w: 'fill',
            }),
          ], {
            id: 's16-card1',
            w: 280, padding: 'lg', gap: 'sm',
            fill: C.glass, radius: 16,
            border: `1px solid ${C.glassBorder}`,
          }),

          panel([
            el(`<p style="font-family:${FONT};font-size:36px;text-align:center;">📐</p>`, {
              id: 's16-icon2', w: 'fill',
            }),
            el(`<p style="font-family:${FONT};font-size:22px;font-weight:600;color:${C.text};text-align:center;">Measurable</p>`, {
              id: 's16-val2-title', w: 'fill',
            }),
            el(`<p style="font-family:${FONT};font-size:16px;color:${C.textSec};text-align:center;line-height:1.5;">Know exact sizes before rendering.</p>`, {
              id: 's16-val2-desc', w: 'fill',
            }),
          ], {
            id: 's16-card2',
            w: 280, padding: 'lg', gap: 'sm',
            fill: C.glass, radius: 16,
            border: `1px solid ${C.glassBorder}`,
          }),

          panel([
            el(`<p style="font-family:${FONT};font-size:36px;text-align:center;">✅</p>`, {
              id: 's16-icon3', w: 'fill',
            }),
            el(`<p style="font-family:${FONT};font-size:22px;font-weight:600;color:${C.text};text-align:center;">Validated</p>`, {
              id: 's16-val3-title', w: 'fill',
            }),
            el(`<p style="font-family:${FONT};font-size:16px;color:${C.textSec};text-align:center;line-height:1.5;">Catch errors before you see\u00a0them.</p>`, {
              id: 's16-val3-desc', w: 'fill',
            }),
          ], {
            id: 's16-card3',
            w: 280, padding: 'lg', gap: 'sm',
            fill: C.glass, radius: 16,
            border: `1px solid ${C.glassBorder}`,
          }),
        ], {
          id: 's16-cards',
          x: 960, y: below('s16-subtitle', { gap: 'xl' }),
          anchor: 'tc',
          gap: 'lg',
          align: 'stretch',
        }),

        // Footer
        el(`<p style="font-family:${FONT};font-size:18px;color:${C.textTer};text-align:center;">github.com/anthropics/slidekit</p>`, {
          id: 's16-footer',
          x: 960, y: 960,
          w: 400, anchor: 'bc',
        }),

        // Corner brackets (overlay layer)
        // Top-left bracket
        group([
          el(`<div style="width:100%;height:100%;background:${C.accent1};"></div>`, {
            id: 's16-br-tl-h', x: 0, y: 0, w: 40, h: 2,
          }),
          el(`<div style="width:100%;height:100%;background:${C.accent1};"></div>`, {
            id: 's16-br-tl-v', x: 0, y: 0, w: 2, h: 40,
          }),
        ], {
          id: 's16-bracket-tl',
          x: 40, y: 40, w: 40, h: 40,
          bounds: 'hug', layer: 'overlay', opacity: 0.3,
        }),
        // Top-right bracket
        group([
          el(`<div style="width:100%;height:100%;background:${C.accent1};"></div>`, {
            id: 's16-br-tr-h', x: 0, y: 0, w: 40, h: 2,
          }),
          el(`<div style="width:100%;height:100%;background:${C.accent1};"></div>`, {
            id: 's16-br-tr-v', x: 38, y: 0, w: 2, h: 40,
          }),
        ], {
          id: 's16-bracket-tr',
          x: 1840, y: 40, w: 40, h: 40,
          bounds: 'hug', layer: 'overlay', opacity: 0.3,
        }),
        // Bottom-left bracket
        group([
          el(`<div style="width:100%;height:100%;background:${C.accent2};"></div>`, {
            id: 's16-br-bl-h', x: 0, y: 38, w: 40, h: 2,
          }),
          el(`<div style="width:100%;height:100%;background:${C.accent2};"></div>`, {
            id: 's16-br-bl-v', x: 0, y: 0, w: 2, h: 40,
          }),
        ], {
          id: 's16-bracket-bl',
          x: 40, y: 1000, w: 40, h: 40,
          bounds: 'hug', layer: 'overlay', opacity: 0.3,
        }),
        // Bottom-right bracket
        group([
          el(`<div style="width:100%;height:100%;background:${C.accent2};"></div>`, {
            id: 's16-br-br-h', x: 0, y: 38, w: 40, h: 2,
          }),
          el(`<div style="width:100%;height:100%;background:${C.accent2};"></div>`, {
            id: 's16-br-br-v', x: 38, y: 0, w: 2, h: 40,
          }),
        ], {
          id: 's16-bracket-br',
          x: 1840, y: 1000, w: 40, h: 40,
          bounds: 'hug', layer: 'overlay', opacity: 0.3,
        }),
      ],
    }
  ];

  return await render(slides);
}

// slides.js — "SlideKit Layout Cookbook" (Combined Edition)
// A comprehensive catalog of composition patterns for SlideKit presentations.
// Part 1: 56 layout pattern slides (dark theme)
// Part 2: 13 data visualization pattern slides (light theme)

import {
  init, render, safeRect, splitRect,
  el, below, rightOf, centerIn, centerVWith,
  hstack, vstack, panel, figure, group, connect,
  grid, repeat, getSpacing, distributeH, matchWidth,
} from '../../slidekit/dist/slidekit.bundle.js';

// -- Image Manifest --------------------------------------------------------------

const IMAGES = {
  heroBg:           './hero-bg.png',
  landscapeBanner:  './landscape-banner.png',
  squareFeature:    './square-feature.png',
  portraitSidebar:  './portrait-sidebar.png',
  smallIcon:        './small-icon-photo.png',
  texturedOverlay:  './textured-overlay.png',
};

// -- Design Tokens (Dark Theme) --------------------------------------------------

const CD = {
  bg:        '#0a0a1a',
  surface:   '#1a1a2e',
  surfaceAlt:'#16213e',
  text:      '#ffffff',
  textMuted: 'rgba(255,255,255,0.65)',
  textDim:   'rgba(255,255,255,0.35)',
  accent:    '#00d4ff',
  accentRed: '#ff6b6b',
  accentGrn: '#4ade80',
  border:    'rgba(255,255,255,0.08)',
};

// -- Design Tokens (Light Theme) -------------------------------------------------

const CL = {
  accent: '#0891b2',
  accentRed: '#dc2626',
  accentGrn: '#16a34a',
  accentYlw: '#d97706',
  accentPrp: '#7c3aed',
  accentOrg: '#ea580c',
  bg: '#f8fafc',
  surface: '#ffffff',
  text: '#1e293b',
  textMuted: 'rgba(30,41,59,0.6)',
  textDim: 'rgba(30,41,59,0.4)',
  border: 'rgba(30,41,59,0.12)',
};

const FONT = "'Inter', sans-serif";

// -- Helpers (Dark Theme) --------------------------------------------------------

function patternLabel(text, slideId) {
  return el(
    `<p style="font:600 14px ${FONT};color:${CD.textDim};letter-spacing:2px;text-transform:uppercase">${text}</p>`,
    { id: `${slideId}-label`, x: 120, y: 40, w: 600, layer: 'overlay' },
  );
}

// -- Helpers (Light Theme) -------------------------------------------------------

function dataPatternLabel(text, id) {
  return el(`<p style="font:600 13px ${FONT};color:${CL.textDim};text-transform:uppercase;letter-spacing:2px">${text}</p>`, {
    id: `${id}-label`, x: 1920 - 120 - 400, y: 12, w: 400,
    layer: 'overlay',
    style: { textAlign: 'right' },
  });
}

function dataSlideBg(id) {
  return el(`<div style="width:100%;height:100%;background:${CL.bg}"></div>`, {
    id: `${id}-bg`, x: 0, y: 0, w: 1920, h: 1080, layer: 'bg',
  });
}

// -- Init & Slides ---------------------------------------------------------------

export async function run() {
  await init({
    slide: { w: 1920, h: 1080 },
    safeZone: { left: 120, right: 120, top: 90, bottom: 90 },
    minFontSize: 12,
    fonts: [
      { family: 'Inter', weights: [300, 400, 600, 700, 800], source: 'google' },
    ],
  });

  const safe = safeRect();

  // Alias for convenience — dark theme uses C, light theme uses CL
  const C = CD;

  const slides = [

    // =========================================================================
    // SLIDE 1 — Title / Cover
    // Pattern: Full-bleed background + centered overlay text
    // Technique: Use layer:'bg' for the image, anchor:'cc' for centered text
    // When to use: Opening / closing slides, section dividers
    // Key APIs: el, layer:'bg', anchor:'cc'
    // =========================================================================
    {
      id: 'title',
      background: '#000000',
      elements: [
        el(`<div style="width:1920px;height:1080px;background:url('${IMAGES.heroBg}') center/cover;opacity:0.6"></div>`, {
          id: 'title-bg', x: 0, y: 0, w: 1920, h: 1080, layer: 'bg',
        }),

        el(`<p style="font:700 80px ${FONT};color:${C.text};text-align:center;letter-spacing:-2px">SlideKit Layout Cookbook</p>`, {
          id: 'title-heading', x: 960, y: 490, w: 1400, anchor: 'cc',
        }),

        el(`<p style="font:400 28px ${FONT};color:${C.textMuted};text-align:center">A comprehensive catalog of composition patterns</p>`, {
          id: 'title-subtitle', y: below('title-heading', { gap: 'md' }), x: 460, w: 1000,
        }),
      ],
    },

    // =========================================================================
    // SLIDE 2 — A1: Equal Split (50/50)
    // Pattern: Two equal columns side by side
    // Technique: splitRect with ratio 0.5 and gap. Each side gets a panel.
    // When to use: Comparing two concepts, before/after, pros/cons
    // Key APIs: splitRect, panel, vstack
    // =========================================================================
    {
      id: 'a1-equal-split',
      background: C.bg,
      elements: (() => {
        const { left, right } = splitRect(safe, { ratio: 0.5, gap: 40 });
        return [
          patternLabel('A1 · Equal Split', 'a1'),

          el(`<p style="font:700 48px ${FONT};color:${C.text};letter-spacing:-1px">Two-Column Layouts</p>`, {
            id: 'a1-title', x: safe.x, y: safe.y, w: safe.w,
          }),

          panel([
            el(`<p style="font:700 32px ${FONT};color:${C.accent}">Concept Alpha</p>`, {
              id: 'a1-left-title', w: left.w - 48,
            }),
            el(`<p style="font:400 24px ${FONT};color:${C.textMuted};line-height:1.6">Nebula Analytics provides real-time data pipelines for distributed observability. Teams can instrument, collect, and query telemetry at petabyte scale.</p>`, {
              id: 'a1-left-body', w: left.w - 48,
            }),
          ], {
            id: 'a1-left-panel', x: left.x, y: below('a1-title', { gap: 'lg' }),
            w: left.w, padding: 24, gap: 'sm', fill: C.surface, radius: 12,
          }),

          panel([
            el(`<p style="font:700 32px ${FONT};color:${C.accentRed}">Concept Beta</p>`, {
              id: 'a1-right-title', w: right.w - 48,
            }),
            el(`<p style="font:400 24px ${FONT};color:${C.textMuted};line-height:1.6">Horizon Gateway unifies API management across hybrid cloud environments. Route, throttle, and secure every endpoint from one declarative config.</p>`, {
              id: 'a1-right-body', w: right.w - 48,
            }),
          ], {
            id: 'a1-right-panel', x: right.x, y: below('a1-title', { gap: 'lg' }),
            w: right.w, padding: 24, gap: 'sm', fill: C.surface, radius: 12,
          }),
        ];
      })(),
    },

    // =========================================================================
    // SLIDE 3 — A2: Asymmetric Split (35/65)
    // Pattern: Narrow sidebar + wide main content
    // Technique: splitRect with 0.35 ratio. Left column gets stacked nav items.
    // When to use: Navigation, table of contents, sidebar commentary
    // Key APIs: splitRect, vstack, below
    // =========================================================================
    {
      id: 'a2-asymmetric-split',
      background: C.bg,
      elements: (() => {
        const { left, right } = splitRect(safe, { ratio: 0.35, gap: 40 });
        return [
          patternLabel('A2 · Asymmetric Split', 'a2'),

          panel([
            el(`<p style="font:600 20px ${FONT};color:${C.accent};text-transform:uppercase;letter-spacing:2px">Navigation</p>`, {
              id: 'a2-nav-heading', w: left.w - 48,
            }),
            el(`<p style="font:400 22px ${FONT};color:${C.text};padding:12px 0;border-bottom:1px solid ${C.border}">01 — Project Overview</p>`, {
              id: 'a2-nav-item1', w: left.w - 48,
            }),
            el(`<p style="font:400 22px ${FONT};color:${C.textMuted};padding:12px 0;border-bottom:1px solid ${C.border}">02 — Technical Architecture</p>`, {
              id: 'a2-nav-item2', w: left.w - 48,
            }),
            el(`<p style="font:400 22px ${FONT};color:${C.textMuted};padding:12px 0">03 — Deployment Strategy</p>`, {
              id: 'a2-nav-item3', w: left.w - 48,
            }),
          ], {
            id: 'a2-sidebar', x: left.x, y: safe.y, w: left.w,
            padding: 24, gap: 'xs', fill: C.surface, radius: 12,
          }),

          el(`<p style="font:700 48px ${FONT};color:${C.text};letter-spacing:-1px">Project Overview</p>`, {
            id: 'a2-main-title', x: right.x, y: safe.y, w: right.w,
          }),

          el(`<p style="font:400 20px ${FONT};color:${C.textMuted};line-height:1.7">The Orion Platform consolidates disparate monitoring systems into a single pane of glass. Built on a columnar storage engine, it ingests over 2 million events per second while maintaining sub-second query latency across 90-day retention windows.</p>`, {
            id: 'a2-main-body1', x: right.x, y: below('a2-main-title', { gap: 'md' }), w: right.w,
          }),

          el(`<p style="font:400 20px ${FONT};color:${C.textMuted};line-height:1.7">Each service emits structured logs, metrics, and traces through a lightweight sidecar agent. Correlation IDs propagate automatically, eliminating manual stitching across service boundaries.</p>`, {
            id: 'a2-main-body2', x: right.x, y: below('a2-main-body1', { gap: 'sm' }), w: right.w,
          }),
        ];
      })(),
    },

    // =========================================================================
    // SLIDE 4 — A3: Image Left, Text Right
    // Pattern: Image occupies the left column, text on the right
    // Technique: splitRect with 0.45 ratio. figure() for the image.
    // When to use: Product shots, team photos, visual evidence + explanation
    // Key APIs: splitRect, figure, vstack
    // =========================================================================
    {
      id: 'a3-image-left',
      background: C.bg,
      elements: (() => {
        const { left, right } = splitRect(safe, { ratio: 0.45, gap: 40 });
        return [
          patternLabel('A3 · Image Left, Text Right', 'a3'),

          figure({
            id: 'a3-photo', src: './landscape-banner.png',
            x: left.x, y: safe.y, w: left.w, h: left.h,
            fit: 'cover', containerRadius: 12,
          }),

          el(`<p style="font:600 16px ${FONT};color:${C.accent};text-transform:uppercase;letter-spacing:2px">Field Report</p>`, {
            id: 'a3-eyebrow', x: right.x, y: safe.y, w: right.w,
          }),

          el(`<p style="font:700 48px ${FONT};color:${C.text};letter-spacing:-1px;line-height:1.15">Cascade Ridge Observatory</p>`, {
            id: 'a3-title', x: right.x, y: below('a3-eyebrow', { gap: 'sm' }), w: right.w,
          }),

          el(`<p style="font:400 24px ${FONT};color:${C.textMuted};line-height:1.7">Situated at 3,200 meters above sea level, the Cascade Ridge Observatory captures deep-sky imagery through a 1.2-meter Ritchey-Chrétien reflector. The site's median seeing of 0.8 arcseconds rivals the best ground-based facilities worldwide.</p>`, {
            id: 'a3-body', x: right.x, y: below('a3-title', { gap: 'md' }), w: right.w,
          }),

          el(`<p style="font:600 20px ${FONT};color:${C.accentGrn}">↗ 42% improvement in resolution since 2021</p>`, {
            id: 'a3-stat', x: right.x, y: below('a3-body', { gap: 'md' }), w: right.w,
          }),
        ];
      })(),
    },

    // =========================================================================
    // SLIDE 5 — A4: Text Left, Image Right
    // Pattern: Text content on the left, image on the right
    // Technique: splitRect with 0.55 ratio. Text column is wider.
    // When to use: Story-first layouts where narrative leads, visual supports
    // Key APIs: splitRect, figure, vstack, below
    // =========================================================================
    {
      id: 'a4-image-right',
      background: C.bg,
      elements: (() => {
        const { left, right } = splitRect(safe, { ratio: 0.55, gap: 40 });
        return [
          patternLabel('A4 · Text Left, Image Right', 'a4'),

          el(`<p style="font:700 48px ${FONT};color:${C.text};letter-spacing:-1px;line-height:1.15">Meridian Observatory</p>`, {
            id: 'a4-title', x: left.x, y: safe.y, w: left.w,
          }),

          el(`<p style="font:400 24px ${FONT};color:${C.textMuted};line-height:1.7">The Meridian Observatory network spans four continents, providing continuous coverage of transient astronomical events. Each station operates autonomously, syncing observations through a low-latency mesh protocol.</p>`, {
            id: 'a4-body', x: left.x, y: below('a4-title', { gap: 'md' }), w: left.w,
          }),

          el(`<p style="font:700 56px ${FONT};color:${C.accent}">12</p>`, {
            id: 'a4-stat1-val', x: left.x, y: below('a4-body', { gap: 'lg' }), w: 200,
          }),
          el(`<p style="font:400 16px ${FONT};color:${C.textMuted}">Active stations</p>`, {
            id: 'a4-stat1-lbl', x: left.x, y: below('a4-stat1-val', { gap: 4 }), w: 200,
          }),
          el(`<p style="font:700 56px ${FONT};color:${C.accentGrn}">98.7%</p>`, {
            id: 'a4-stat2-val', x: rightOf('a4-stat1-val', { gap: 40 }), y: below('a4-body', { gap: 'lg' }), w: 200,
          }),
          el(`<p style="font:400 16px ${FONT};color:${C.textMuted}">Uptime (30d)</p>`, {
            id: 'a4-stat2-lbl', x: rightOf('a4-stat1-lbl', { gap: 40 }), y: below('a4-stat2-val', { gap: 4 }), w: 200,
          }),

          figure({
            id: 'a4-photo', src: './square-feature.png',
            x: right.x, y: safe.y, w: right.w, h: right.h,
            fit: 'cover', containerRadius: 12,
          }),
        ];
      })(),
    },

    // =========================================================================
    // SLIDE 6 — A5: Narrow Sidebar (20/80)
    // Pattern: Very narrow image column alongside wide text area
    // Technique: splitRect with 0.20 ratio. Tall portrait image fills sidebar.
    // When to use: Author bios, vertical imagery, accent strips
    // Key APIs: splitRect, figure, vstack
    // =========================================================================
    {
      id: 'a5-narrow-sidebar',
      background: C.bg,
      elements: (() => {
        const { left, right } = splitRect(safe, { ratio: 0.20, gap: 32 });
        return [
          patternLabel('A5 · Narrow Sidebar', 'a5'),

          figure({
            id: 'a5-portrait', src: './portrait-sidebar.png',
            x: left.x, y: safe.y, w: left.w, h: left.h,
            fit: 'cover', containerRadius: 12,
          }),

          el(`<p style="font:700 48px ${FONT};color:${C.text};letter-spacing:-1px;line-height:1.15">Dr. Elena Vasquez</p>`, {
            id: 'a5-title', x: right.x, y: safe.y, w: right.w,
          }),

          el(`<p style="font:600 18px ${FONT};color:${C.accent};text-transform:uppercase;letter-spacing:2px">Principal Researcher · Astra Labs</p>`, {
            id: 'a5-role', x: right.x, y: below('a5-title', { gap: 'sm' }), w: right.w,
          }),

          el(`<p style="font:400 24px ${FONT};color:${C.textMuted};line-height:1.7">With over fifteen years leading distributed systems research, Dr. Vasquez pioneered the event-sourced architecture that powers Astra's real-time analytics engine. Her work on causal consistency models has been cited in more than 300 peer-reviewed publications.</p>`, {
            id: 'a5-bio1', x: right.x, y: below('a5-role', { gap: 'md' }), w: right.w,
          }),

          el(`<p style="font:400 24px ${FONT};color:${C.textMuted};line-height:1.7">She currently leads a team of forty engineers building the next generation of stream processing infrastructure, targeting sub-millisecond event delivery at global scale.</p>`, {
            id: 'a5-bio2', x: right.x, y: below('a5-bio1', { gap: 'sm' }), w: right.w,
          }),
        ];
      })(),
    },

    // =========================================================================
    // SLIDE 7 — A6: Split with Overlap
    // Pattern: Two halves with a floating card crossing the boundary
    // Technique: splitRect with no gap, then an overlapping panel with z-index.
    // When to use: Emphasis, call-to-action, bridging two concepts
    // Key APIs: splitRect, figure, panel, shadow, z-ordering
    // =========================================================================
    {
      id: 'a6-split-overlap',
      background: C.bg,
      elements: (() => {
        const { left, right } = splitRect(safe, { ratio: 0.50, gap: 0 });
        const overlapW = 560;
        const overlapX = safe.x + (safe.w - overlapW) / 2;
        return [
          patternLabel('A6 · Split with Overlap', 'a6'),

          panel([], {
            id: 'a6-left-bg', x: left.x, y: safe.y,
            w: left.w, h: left.h, fill: C.surface, radius: 0, layer: 'bg',
          }),

          el(`<p style="font:700 40px ${FONT};color:${C.text};line-height:1.3">Convergence Platform</p>`, {
            id: 'a6-left-title', x: left.x + 40, y: safe.y + 60, w: left.w - 80,
          }),

          el(`<p style="font:400 22px ${FONT};color:${C.textMuted};line-height:1.6">Bridging the gap between data engineering and product analytics.</p>`, {
            id: 'a6-left-desc', x: left.x + 40, y: below('a6-left-title', { gap: 'sm' }), w: left.w - 80,
          }),

          figure({
            id: 'a6-right-img', src: './square-feature.png',
            x: right.x, y: safe.y, w: right.w, h: right.h,
            fit: 'cover',
          }),

          panel([
            el(`<p style="font:700 28px ${FONT};color:${C.text};text-align:center">Unified Data Layer</p>`, {
              id: 'a6-overlap-title', w: overlapW - 64,
            }),
            el(`<p style="font:400 20px ${FONT};color:${C.textMuted};text-align:center;line-height:1.6">One schema, one query language, one access control model — across every warehouse, lake, and stream.</p>`, {
              id: 'a6-overlap-body', w: overlapW - 64,
            }),
          ], {
            id: 'a6-overlap-card', x: overlapX, y: safe.y + safe.h / 2 - 100,
            w: overlapW, padding: 32, gap: 'sm', fill: '#0d1b3e', radius: 16,
            shadow: 'xl', border: `1px solid ${C.border}`, z: 10,
          }),
        ];
      })(),
    },

    // =========================================================================
    // SLIDE 8 — B1: Full-Bleed + Text Overlay
    // Pattern: Full-screen image with floating text in the lower-left
    // Technique: Background image on 'bg' layer, text on 'content' layer.
    // When to use: Hero moments, dramatic openers, photo-driven storytelling
    // Key APIs: el with layer:'bg', el positioned in safe zone
    // =========================================================================
    {
      id: 'b1-full-bleed',
      background: '#000000',
      elements: [
        patternLabel('B1 · Full-Bleed + Text Overlay', 'b1'),

        el('<img src="./hero-bg.png" style="width:100%;height:100%;object-fit:cover;opacity:0.7">', {
          id: 'b1-bg', x: 0, y: 0, w: 1920, h: 1080, layer: 'bg',
        }),

        el(`<p style="font:700 72px ${FONT};color:${C.text};letter-spacing:-2px;line-height:1.1">Into the<br>Unknown</p>`, {
          id: 'b1-headline', x: safe.x, y: safe.y + safe.h - 280, w: 800,
        }),

        el(`<p style="font:400 26px ${FONT};color:${C.textMuted};line-height:1.5">The Polaris Deep-Space Initiative sends autonomous probes beyond the heliopause, where solar wind gives way to interstellar medium.</p>`, {
          id: 'b1-subtitle', x: safe.x, y: below('b1-headline', { gap: 20 }), w: 700,
        }),
      ],
    },

    // =========================================================================
    // SLIDE 9 — B2: Full-Bleed + Gradient Overlay
    // Pattern: Background image with a dark gradient overlay for readability
    // Technique: Image on 'bg', gradient div on 'overlay', text over gradient.
    // When to use: When image detail must show but text must remain readable
    // Key APIs: layer:'bg', layer:'overlay', gradient div
    // =========================================================================
    {
      id: 'b2-gradient-overlay',
      background: '#000000',
      elements: [
        patternLabel('B2 · Gradient Overlay', 'b2'),

        el('<img src="./landscape-banner.png" style="width:100%;height:100%;object-fit:cover">', {
          id: 'b2-bg', x: 0, y: 0, w: 1920, h: 1080, layer: 'bg',
        }),

        el('<div style="width:100%;height:100%;background:linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 40%, transparent 70%)"></div>', {
          id: 'b2-gradient', x: 0, y: 0, w: 1920, h: 1080, layer: 'overlay',
        }),

        el(`<p style="font:700 56px ${FONT};color:${C.text};letter-spacing:-1px;line-height:1.15">Cerulean Coast Expedition</p>`, {
          id: 'b2-title', x: safe.x, y: safe.y + safe.h - 240, w: 1000,
        }),

        el(`<p style="font:400 24px ${FONT};color:${C.textMuted};line-height:1.6">Mapping the bioluminescent corridors of the continental shelf — a twelve-month survey of deep-water ecosystems off the Azores.</p>`, {
          id: 'b2-body', x: safe.x, y: below('b2-title', { gap: 'sm' }), w: 900,
        }),
      ],
    },

    // =========================================================================
    // SLIDE 10 — B3: Letterboxed Cinematic
    // Pattern: Cinematic black bars top and bottom with content in the strip
    // Technique: Image on 'bg', two black bars on 'overlay' to mask edges.
    // When to use: Cinematic reveals, video-style stills, dramatic framing
    // Key APIs: layer:'bg', layer:'overlay', el bars
    // =========================================================================
    {
      id: 'b3-letterbox',
      background: '#000000',
      elements: [
        patternLabel('B3 · Letterboxed Cinematic', 'b3'),

        el('<img src="./landscape-banner.png" style="width:100%;height:100%;object-fit:cover">', {
          id: 'b3-bg', x: 0, y: 0, w: 1920, h: 1080, layer: 'bg',
        }),

        el('<div style="width:100%;height:100%;background:#000"></div>', {
          id: 'b3-bar-top', x: 0, y: 0, w: 1920, h: 160, layer: 'overlay',
        }),

        el('<div style="width:100%;height:100%;background:#000"></div>', {
          id: 'b3-bar-bottom', x: 0, y: 920, w: 1920, h: 160, layer: 'overlay',
        }),

        el(`<p style="font:700 48px ${FONT};color:${C.text};text-align:center;letter-spacing:-1px">The Stillness Between Signals</p>`, {
          id: 'b3-title', x: 960, y: centerIn({ x: 0, y: 160, w: 1920, h: 760 }).y, w: 1400, anchor: 'tc',
        }),

        el(`<p style="font:400 20px ${FONT};color:${C.textMuted};text-align:center">A visual essay on electromagnetic silence in deep space</p>`, {
          id: 'b3-subtitle', y: below('b3-title', { gap: 'sm' }), x: 960, w: 1400, anchor: 'tc',
        }),
      ],
    },

    // =========================================================================
    // SLIDE 11 — B4: Dramatic Typography
    // Pattern: No image — pure typographic impact with accent decoration
    // Technique: Oversized headline, thin accent line, supporting text below.
    // When to use: Key statements, quotes, section breaks, manifesto slides
    // Key APIs: el, anchor, below
    // =========================================================================
    {
      id: 'b4-dramatic-type',
      background: C.bg,
      elements: [
        patternLabel('B4 · Dramatic Typography', 'b4'),

        el('', {
          id: 'b4-accent-line', x: safe.x + (safe.w - 80) / 2, y: safe.y + 200, w: 80, h: 4,
          style: { background: C.accent, borderRadius: '2px' }, layer: 'overlay',
        }),

        el(`<p style="font:700 96px ${FONT};color:${C.text};text-align:center;letter-spacing:-3px;line-height:1.05">Build for<br>tomorrow.</p>`, {
          id: 'b4-headline', x: 260, y: below('b4-accent-line', { gap: 'lg' }), w: 1400,
        }),

        el(`<p style="font:400 28px ${FONT};color:${C.textMuted};text-align:center;line-height:1.5">The infrastructure you choose today shapes the products<br>your team can imagine next year.</p>`, {
          id: 'b4-support', x: 360, y: below('b4-headline', { gap: 40 }), w: 1200,
        }),
      ],
    },

    // =========================================================================
    // SLIDE 12 — B5: Full-Bleed + Inset Card
    // Pattern: Background image with a floating card centered on top
    // Technique: Image on 'bg', panel with shadow using centerIn for position.
    // When to use: Call-to-action, summary, key takeaway over imagery
    // Key APIs: layer:'bg', panel, shadow:'lg', centerIn
    // =========================================================================
    {
      id: 'b5-inset-card',
      background: '#000000',
      elements: (() => {
        const cardW = 720;
        const centered = centerIn(safe);
        return [
          patternLabel('B5 · Full-Bleed + Inset Card', 'b5'),

          el('<img src="./hero-bg.png" style="width:100%;height:100%;object-fit:cover;opacity:0.5">', {
            id: 'b5-bg', x: 0, y: 0, w: 1920, h: 1080, layer: 'bg',
          }),

          panel([
            el(`<p style="font:700 36px ${FONT};color:${C.text};text-align:center;letter-spacing:-1px">Ready to launch?</p>`, {
              id: 'b5-card-title', w: cardW - 80,
            }),
            el(`<p style="font:400 22px ${FONT};color:${C.textMuted};text-align:center;line-height:1.6">Join the Vanguard Accelerator and ship your first integration in under 48 hours. No infrastructure overhead, no cold starts.</p>`, {
              id: 'b5-card-body', w: cardW - 80,
            }),
            el(`<p style="font:600 20px ${FONT};color:${C.accent};text-align:center;letter-spacing:1px">GET STARTED →</p>`, {
              id: 'b5-card-cta', w: cardW - 80,
            }),
          ], {
            id: 'b5-card', x: centered.x, y: centered.y, w: cardW, anchor: 'cc',
            padding: 40, gap: 20, fill: 'rgba(10,10,26,0.92)', radius: 20,
            shadow: 'lg', border: `1px solid ${C.border}`,
          }),
        ];
      })(),
    },

    // =========================================================================
    // SLIDE 13 — C1: 2-Column Card Grid
    // Pattern: Title at top, two equal cards below
    // Technique: splitRect for two columns; each column is a panel.
    // When to use: Feature comparison, two options, paired content
    // Key APIs: splitRect, panel, vstack
    // =========================================================================
    {
      id: 'c1-two-col-grid',
      background: C.bg,
      elements: (() => {
        const contentY = safe.y + 70 + 32;
        const contentH = safe.h - 70 - 32;
        const contentRect = { x: safe.x, y: contentY, w: safe.w, h: contentH };
        const { left, right } = splitRect(contentRect, { ratio: 0.5, gap: 32 });
        return [
          patternLabel('C1 · 2-Column Card Grid', 'c1'),

          el(`<p style="font:700 48px ${FONT};color:${C.text};letter-spacing:-1px">Platform Capabilities</p>`, {
            id: 'c1-title', x: safe.x, y: safe.y, w: safe.w,
          }),

          panel([
            el(`<p style="font:700 28px ${FONT};color:${C.accent}">Stream Processing</p>`, {
              id: 'c1-card1-title', w: left.w - 64,
            }),
            el(`<p style="font:400 18px ${FONT};color:${C.textMuted};line-height:1.6">Process millions of events per second with exactly-once semantics. Built on a shared-nothing architecture with automatic partition rebalancing and backpressure handling.</p>`, {
              id: 'c1-card1-body', w: left.w - 64,
            }),
          ], {
            id: 'c1-card1', x: left.x, y: left.y, w: left.w,
            padding: 32, gap: 'sm', fill: C.surface, radius: 16,
            border: `1px solid ${C.border}`,
          }),

          panel([
            el(`<p style="font:700 28px ${FONT};color:${C.accentRed}">Batch Analytics</p>`, {
              id: 'c1-card2-title', w: right.w - 64,
            }),
            el(`<p style="font:400 18px ${FONT};color:${C.textMuted};line-height:1.6">Run complex aggregation queries across petabytes of historical data. Columnar storage with adaptive compression delivers 10× throughput over traditional row-oriented engines.</p>`, {
              id: 'c1-card2-body', w: right.w - 64,
            }),
          ], {
            id: 'c1-card2', x: right.x, y: right.y, w: right.w,
            padding: 32, gap: 'sm', fill: C.surface, radius: 16,
            border: `1px solid ${C.border}`,
          }),
        ];
      })(),
    },

    // =========================================================================
    // SLIDE 14 — C2: 3-Column Card Grid
    // Pattern: Title at top, three equal cards in a row
    // Technique: Manual column calculation: cardW = (safe.w - 2*gap) / 3
    // When to use: Feature sets, team members, pricing tiers, triple comparison
    // Key APIs: explicit column calculation, panel
    // =========================================================================
    {
      id: 'c2-three-col-grid',
      background: C.bg,
      elements: (() => {
        const gap = 32; // equals spacing token 'lg'
        const cardW = Math.floor((safe.w - 2 * gap) / 3);
        const cardY = safe.y + 70 + 32;
        const col1X = safe.x;
        const col2X = safe.x + cardW + gap;
        const col3X = safe.x + 2 * (cardW + gap);
        const innerW = cardW - 64;

        const cards = [
          { x: col1X, suffix: '1', icon: '◈', color: C.accent,    title: 'Ingest',    desc: 'Connectors for Kafka, Kinesis, Pub/Sub, and 40+ sources. Schema registry with automatic evolution.' },
          { x: col2X, suffix: '2', icon: '◉', color: C.accentRed, title: 'Transform',  desc: 'SQL and Python transforms with incremental materialization. Built-in data quality checks on every pipeline run.' },
          { x: col3X, suffix: '3', icon: '◎', color: C.accentGrn, title: 'Serve',      desc: 'Low-latency serving layer for dashboards, APIs, and ML features. Sub-10ms p99 reads at any scale.' },
        ];

        return [
          patternLabel('C2 · 3-Column Card Grid', 'c2'),

          el(`<p style="font:700 48px ${FONT};color:${C.text};letter-spacing:-1px">How It Works</p>`, {
            id: 'c2-title', x: safe.x, y: safe.y, w: safe.w,
          }),

          ...cards.map(c => panel([
            el(`<p style="font:400 28px ${FONT};color:${c.color}">${c.icon}</p>`, {
              id: `c2-card${c.suffix}-icon`, w: innerW,
            }),
            el(`<p style="font:700 26px ${FONT};color:${C.text}">${c.title}</p>`, {
              id: `c2-card${c.suffix}-title`, w: innerW,
            }),
            el(`<p style="font:400 20px ${FONT};color:${C.textMuted};line-height:1.6">${c.desc}</p>`, {
              id: `c2-card${c.suffix}-desc`, w: innerW,
            }),
          ], {
            id: `c2-card${c.suffix}`, x: c.x, y: cardY, w: cardW,
            padding: 32, gap: 12, fill: C.surface, radius: 16,
            border: `1px solid ${C.border}`,
          })),
        ];
      })(),
    },

    // =========================================================================
    // SLIDE 15 — C3: 4-Column Compact Grid
    // Pattern: Title at top, four compact cards in a row
    // Technique: Manual column calculation: cardW = (safe.w - 3*gap) / 4
    // When to use: Metrics, feature lists, icon grids, compact overviews
    // Key APIs: explicit column calculation, panel
    // =========================================================================
    {
      id: 'c3-four-col-grid',
      background: C.bg,
      elements: (() => {
        const gap = 24; // equals spacing token 'md'
        const cardW = Math.floor((safe.w - 3 * gap) / 4);
        const cardY = safe.y + 70 + 32;
        const innerW = cardW - 48;

        const items = [
          { num: '01', label: 'Regions',    desc: 'Multi-region failover with <50ms switchover',   color: C.accent },
          { num: '02', label: 'Uptime',     desc: '99.995% SLA across all production tiers',        color: C.accentGrn },
          { num: '03', label: 'Throughput', desc: '2.4M events/sec sustained ingestion rate',       color: C.accentRed },
          { num: '04', label: 'Latency',    desc: 'P99 query response under 12 milliseconds',      color: '#a78bfa' },
        ];

        return [
          patternLabel('C3 · 4-Column Compact Grid', 'c3'),

          el(`<p style="font:700 48px ${FONT};color:${C.text};letter-spacing:-1px">By the Numbers</p>`, {
            id: 'c3-title', x: safe.x, y: safe.y, w: safe.w,
          }),

          hstack(items.map((item, i) => {
            return panel([
              el(`<p style="font:700 48px ${FONT};color:${item.color}">${item.num}</p>`, {
                id: `c3-card${i}-num`, w: innerW,
              }),
              el(`<p style="font:700 22px ${FONT};color:${C.text}">${item.label}</p>`, {
                id: `c3-card${i}-label`, w: innerW,
              }),
              el(`<p style="font:400 18px ${FONT};color:${C.textMuted};line-height:1.5">${item.desc}</p>`, {
                id: `c3-card${i}-desc`, w: innerW,
              }),
            ], {
              id: `c3-card${i}`, w: cardW,
              padding: 24, gap: 10, fill: C.surface, radius: 12,
              border: `1px solid ${C.border}`,
            });
          }), {
            id: 'c3-cards-row', x: safe.x, y: cardY, w: safe.w,
            gap: gap, align: 'stretch',
          }),
        ];
      })(),
    },

    // =========================================================================
    // SLIDE 16 — C4: Uneven Grid (1 Large + 2 Small)
    // Pattern: One dominant card beside two smaller stacked cards
    // Technique: splitRect 60/40, right side uses two panels with below()
    // When to use: Feature highlight with supporting details
    // Key APIs: splitRect, panel, figure
    // =========================================================================
    {
      id: 'c4-uneven-grid',
      background: C.bg,
      elements: (() => {
        const { left, right } = splitRect(safe, { ratio: 0.6, gap: 32 });
        const cardY = safe.y;
        const smallCardH = (safe.h - 32) / 2;
        return [
          patternLabel('C4 · Uneven Grid', 'c4'),

          panel([
            figure({
              id: 'c4-large-img', src: IMAGES.squareFeature,
              w: left.w - 48, h: 340, fit: 'cover', containerRadius: 8,
            }),
            el(`<p style="font:700 32px ${FONT};color:${C.text}">Quantum Mesh Networking</p>`, {
              id: 'c4-large-title', w: left.w - 48,
            }),
            el(`<p style="font:400 22px ${FONT};color:${C.textMuted};line-height:1.6">A self-healing network topology that routes around failures in under 3 milliseconds, maintaining full duplex communication across 14 continental nodes.</p>`, {
              id: 'c4-large-body', w: left.w - 48,
            }),
          ], {
            id: 'c4-large-card', x: left.x, y: cardY,
            w: left.w, padding: 24, gap: 'sm', fill: C.surface, radius: 12,
          }),

          panel([
            el(`<p style="font:700 24px ${FONT};color:${C.accent}">Edge Compute</p>`, {
              id: 'c4-small1-title', w: right.w - 48,
            }),
            el(`<p style="font:400 20px ${FONT};color:${C.textMuted};line-height:1.5">Deploy inference workloads to 200+ edge locations with cold-start times under 50ms.</p>`, {
              id: 'c4-small1-body', w: right.w - 48,
            }),
          ], {
            id: 'c4-small1', x: right.x, y: cardY,
            w: right.w, padding: 24, gap: 12, fill: C.surface, radius: 12,
          }),

          panel([
            el(`<p style="font:700 24px ${FONT};color:${C.accentGrn}">Fleet Telemetry</p>`, {
              id: 'c4-small2-title', w: right.w - 48,
            }),
            el(`<p style="font:400 20px ${FONT};color:${C.textMuted};line-height:1.5">Unified dashboard for monitoring container health, resource saturation, and error budgets across every cluster.</p>`, {
              id: 'c4-small2-body', w: right.w - 48,
            }),
          ], {
            id: 'c4-small2', x: right.x, y: cardY + smallCardH + 32,
            w: right.w, padding: 24, gap: 12, fill: C.surface, radius: 12,
          }),
        ];
      })(),
    },

    // =========================================================================
    // SLIDE 17 — C5: Icon Grid (Repeated Icons)
    // Pattern: Title + 4×2 grid of icon/label items
    // Technique: Explicit column/row math for uniform grid placement
    // When to use: Feature lists, capability overviews, service catalogs
    // Key APIs: figure (small), el, explicit grid math
    // =========================================================================
    {
      id: 'c5-icon-grid',
      background: C.bg,
      elements: (() => {
        const cols = 4;
        const rows = 2;
        const iconSize = 80;
        const cellGap = 24;
        const cellW = (safe.w - (cols - 1) * cellGap) / cols;
        const gridTop = safe.y + 100;
        const rowH = iconSize + 60 + cellGap;

        const items = [
          'Data Ingestion', 'Stream Processing', 'Model Training', 'Deployment',
          'Monitoring', 'Alerting', 'Cost Analysis', 'Compliance',
        ];

        return [
          patternLabel('C5 · Icon Grid', 'c5'),

          el(`<p style="font:700 48px ${FONT};color:${C.text};letter-spacing:-1px">Platform Capabilities</p>`, {
            id: 'c5-title', x: safe.x, y: safe.y, w: safe.w,
          }),

          ...items.map((label, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const cellX = safe.x + col * (cellW + cellGap);
            const cellY = gridTop + row * rowH;
            return group([
              figure({
                id: `c5-icon${i}`, src: IMAGES.smallIcon,
                w: iconSize, h: iconSize, fit: 'cover', containerRadius: 12,
              }),
              el(`<p style="font:600 20px ${FONT};color:${C.text};text-align:center">${label}</p>`, {
                id: `c5-label${i}`, y: below(`c5-icon${i}`, { gap: 12 }), w: cellW,
              }),
            ], {
              id: `c5-cell${i}`, x: cellX, y: cellY, w: cellW, h: rowH,
            });
          }),
        ];
      })(),
    },

    // =========================================================================
    // SLIDE 18 — D1: Headline → Body → Footer Stack
    // Pattern: Simple vertical chain of typographic elements
    // Technique: vstack for automatic vertical layout
    // When to use: Statement slides, announcements, key messages
    // Key APIs: vstack, el
    // =========================================================================
    {
      id: 'd1-vertical-stack',
      background: C.bg,
      elements: [
        patternLabel('D1 · Vertical Stack', 'd1'),

        vstack([
          el(`<p style="font:600 18px ${FONT};color:${C.accent};text-transform:uppercase;letter-spacing:3px">Engineering Update</p>`, {
            id: 'd1-eyebrow', w: safe.w,
          }),
          el(`<p style="font:700 56px ${FONT};color:${C.text};letter-spacing:-1px;line-height:1.2">Infrastructure Migration Complete</p>`, {
            id: 'd1-headline', w: safe.w,
          }),
          el(`<p style="font:400 22px ${FONT};color:${C.textMuted};line-height:1.7">All 847 microservices have been migrated to the new Kubernetes control plane. Average pod startup latency decreased by 62% and cross-region failover now completes in under 4 seconds.</p>`, {
            id: 'd1-body', w: safe.w,
          }),
          el('', {
            id: 'd1-divider', w: 120, h: 3,
            style: { background: C.accent, borderRadius: '2px' }, layer: 'overlay',
          }),
          el(`<p style="font:400 20px ${FONT};color:${C.textDim}">Platform Engineering · Q4 2024 · Internal</p>`, {
            id: 'd1-footer', w: safe.w,
          }),
        ], {
          id: 'd1-stack', x: safe.x, y: safe.y + 80, w: safe.w, gap: 'md',
        }),
      ],
    },

    // =========================================================================
    // SLIDE 19 — D2: Stacked Sections with Dividers
    // Pattern: 3 content sections separated by horizontal lines
    // Technique: Chained below() calls with divider elements between sections
    // When to use: Agenda items, process steps, grouped information
    // Key APIs: below, el (for divider lines)
    // =========================================================================
    {
      id: 'd2-stacked-dividers',
      background: C.bg,
      elements: (() => {
        const sectionW = safe.w;
        const sections = [
          { title: 'Discovery & Research', desc: 'Conduct stakeholder interviews, competitive analysis, and user journey mapping to establish project foundations.' },
          { title: 'Design & Prototyping', desc: 'Translate insights into interactive wireframes and validate assumptions through rapid usability testing cycles.' },
          { title: 'Build & Ship', desc: 'Implement in two-week sprints with continuous integration, automated testing, and progressive rollout to production.' },
        ];

        const elements = [
          patternLabel('D2 · Stacked Dividers', 'd2'),

          el(`<p style="font:700 48px ${FONT};color:${C.text};letter-spacing:-1px">Project Phases</p>`, {
            id: 'd2-title', x: safe.x, y: safe.y, w: sectionW,
          }),
        ];

        sections.forEach((sec, i) => {
          const prevId = i === 0 ? 'd2-title' : `d2-desc${i - 1}`;
          const divId = `d2-div${i}`;
          const titleId = `d2-sec${i}`;
          const descId = `d2-desc${i}`;

          elements.push(
            el(`<div style="width:${sectionW}px;height:1px;background:${C.border}"></div>`, {
              id: divId, x: safe.x, y: below(prevId, { gap: 'lg' }), w: sectionW,
            }),
            el(`<p style="font:700 28px ${FONT};color:${C.accent}">${sec.title}</p>`, {
              id: titleId, x: safe.x, y: below(divId, { gap: 'md' }), w: sectionW,
            }),
            el(`<p style="font:400 22px ${FONT};color:${C.textMuted};line-height:1.6">${sec.desc}</p>`, {
              id: descId, x: safe.x, y: below(titleId, { gap: 10 }), w: sectionW,
            }),
          );
        });

        return elements;
      })(),
    },

    // =========================================================================
    // SLIDE 20 — D3: Vertical Timeline
    // Pattern: Vertical spine with alternating left/right entries
    // Technique: connect() for the vertical line, explicit positioning for entries
    // When to use: Chronological events, milestones, roadmaps
    // Key APIs: connect, el, explicit positioning
    // =========================================================================
    {
      id: 'd3-timeline',
      background: C.bg,
      elements: (() => {
        const centerX = safe.x + safe.w / 2;
        const dotW = 16;
        const entryW = safe.w / 2 - 80;
        const startY = safe.y + 80;
        const entryGap = 160;

        const entries = [
          { year: '2021', text: 'Founded with seed funding. First prototype of the distributed query engine shipped to 3 design partners.' },
          { year: '2022', text: 'Series A closed. Launched managed cloud offering with SOC 2 Type II certification.' },
          { year: '2023', text: 'Crossed 500 enterprise customers. Opened Tokyo and Frankfurt data center regions.' },
          { year: '2024', text: 'Acquired StreamForge for real-time CDC. Platform now processes 4 billion events daily.' },
        ];

        const elements = [
          patternLabel('D3 · Vertical Timeline', 'd3'),

          el(`<p style="font:700 48px ${FONT};color:${C.text};letter-spacing:-1px;text-align:center">Company Milestones</p>`, {
            id: 'd3-title', x: safe.x, y: safe.y, w: safe.w,
          }),
        ];

        // Timeline dots and entries
        entries.forEach((entry, i) => {
          const dotY = startY + i * entryGap;
          const isLeft = i % 2 === 0;

          elements.push(
            el(`<div style="width:${dotW}px;height:${dotW}px;background:${C.accent};border-radius:50%"></div>`, {
              id: `d3-dot${i}`, x: centerX - dotW / 2, y: dotY, w: dotW,
            }),
            el(`<p style="font:700 36px ${FONT};color:${C.accent}">${entry.year}</p>`, {
              id: `d3-year${i}`,
              x: isLeft ? centerX - entryW - 48 : centerX + 48,
              y: dotY - 8,
              w: entryW,
              style: { textAlign: isLeft ? 'right' : 'left' },
            }),
            el(`<p style="font:400 20px ${FONT};color:${C.textMuted};line-height:1.5">${entry.text}</p>`, {
              id: `d3-text${i}`,
              x: isLeft ? centerX - entryW - 48 : centerX + 48,
              y: below(`d3-year${i}`, { gap: 'xs' }),
              w: entryW,
              style: { textAlign: isLeft ? 'right' : 'left' },
            }),
          );
        });

        // Vertical spine connecting first to last dot
        elements.push(
          connect('d3-dot0', `d3-dot${entries.length - 1}`, {
            type: 'straight', fromAnchor: 'bc', toAnchor: 'tc',
            color: C.accent, thickness: 2,
          }),
        );

        return elements;
      })(),
    },

    // =========================================================================
    // SLIDE 21 — D4: Numbered List with Large Numbers
    // Pattern: Bold numbers on left, description text on right
    // Technique: Chained below() with rightOf() for number/text pairing
    // When to use: Steps, priorities, ranked items
    // Key APIs: below, rightOf, centerVWith, el
    // =========================================================================
    {
      id: 'd4-numbered-list',
      background: C.bg,
      elements: (() => {
        const numW = 120;
        const textW = safe.w - numW - 32;
        const startY = safe.y + 80;
        const rowGap = 32;

        const items = [
          { num: '01', text: 'Audit every third-party dependency for known CVEs and pin versions with lockfile integrity checks.' },
          { num: '02', text: 'Encrypt all data at rest using AES-256-GCM and rotate keys automatically every 90 days.' },
          { num: '03', text: 'Enforce mutual TLS between all internal services with certificate lifetimes under 24 hours.' },
          { num: '04', text: 'Run automated penetration tests against staging environments before every production deploy.' },
        ];

        const elements = [
          patternLabel('D4 · Numbered List', 'd4'),

          el(`<p style="font:700 48px ${FONT};color:${C.text};letter-spacing:-1px">Security Checklist</p>`, {
            id: 'd4-title', x: safe.x, y: safe.y, w: safe.w,
          }),
        ];

        items.forEach((item, i) => {
          const prevRef = i === 0 ? 'd4-title' : `d4-text${i - 1}`;
          const yPos = below(prevRef, { gap: rowGap });
          elements.push(
            el(`<p style="font:700 64px ${FONT};color:${C.accent}">${item.num}</p>`, {
              id: `d4-num${i}`, x: safe.x, y: yPos, w: numW,
            }),
            el(`<p style="font:400 20px ${FONT};color:${C.textMuted};line-height:1.6">${item.text}</p>`, {
              id: `d4-text${i}`, x: safe.x + numW + 32, y: centerVWith(`d4-num${i}`), w: textW,
            }),
          );
        });

        return elements;
      })(),
    },

    // =========================================================================
    // SLIDE 22 — E1: BG Image + Semi-Transparent Panel
    // Pattern: Full-bleed background with floating translucent content panel
    // Technique: layer:'bg' for image, panel with rgba fill for glass effect
    // When to use: Hero sections, call-to-action, atmospheric slides
    // Key APIs: layer:'bg', panel, shadow
    // =========================================================================
    {
      id: 'e1-overlay-panel',
      background: C.bg,
      elements: (() => {
        const panelW = 800;
        const panelX = (1920 - panelW) / 2;
        return [
          patternLabel('E1 · Overlay Panel', 'e1'),

          el('<img src="./textured-overlay.png" style="width:100%;height:100%;object-fit:cover;opacity:0.5">', {
            id: 'e1-bg', x: 0, y: 0, w: 1920, h: 1080, layer: 'bg',
          }),

          panel([
            el(`<p style="font:700 44px ${FONT};color:${C.text};text-align:center;letter-spacing:-1px">Join the Waitlist</p>`, {
              id: 'e1-panel-title', w: panelW - 80,
            }),
            el(`<p style="font:400 24px ${FONT};color:rgba(255,255,255,0.85);text-align:center;line-height:1.7">Early access to the next generation of collaborative design infrastructure. Ship faster with real-time multiplayer editing, version control, and automated asset pipelines.</p>`, {
              id: 'e1-panel-body', w: panelW - 80,
            }),
          ], {
            id: 'e1-panel', x: panelX, y: 280,
            w: panelW, padding: 40, gap: 'md',
            fill: 'rgba(10, 10, 26, 0.75)', radius: 16,
            border: `1px solid rgba(255,255,255,0.1)`,
            shadow: 'lg',
          }),
        ];
      })(),
    },

    // =========================================================================
    // SLIDE 23 — E2: Cascading Stacked Cards
    // Pattern: Overlapping cards with offset to create depth
    // Technique: Explicit x/y offsets with z-ordering
    // When to use: Layered concepts, depth illustration, visual interest
    // Key APIs: panel, z-ordering, shadow:'md'
    // =========================================================================
    {
      id: 'e2-stacked-cards',
      background: C.bg,
      elements: (() => {
        const cardW = 600;
        const baseX = safe.x + 300;
        const baseY = safe.y + 100;
        const offsetX = 60;
        const offsetY = 50;
        const cards = [
          { title: 'Foundation Layer', body: 'Core runtime, memory allocator, and syscall interface providing the execution substrate for all higher-level services.', shade: '#12122a', z: 1 },
          { title: 'Service Mesh', body: 'Transparent proxy sidecar handling mTLS termination, load balancing, and circuit breaking across 400+ microservices.', shade: '#1a1a36', z: 2 },
          { title: 'Application Tier', body: 'Business logic modules with feature flags, A/B testing hooks, and graceful degradation for every user-facing endpoint.', shade: '#222244', z: 3 },
        ];

        return [
          patternLabel('E2 · Stacked Cards', 'e2'),

          ...cards.map((card, i) => panel([
            el(`<p style="font:700 28px ${FONT};color:${C.text}">${card.title}</p>`, {
              id: `e2-card${i}-title`, w: cardW - 64,
            }),
            el(`<p style="font:400 22px ${FONT};color:${C.textMuted};line-height:1.6">${card.body}</p>`, {
              id: `e2-card${i}-body`, w: cardW - 64,
            }),
          ], {
            id: `e2-card${i}`,
            x: baseX + i * offsetX,
            y: baseY + i * offsetY,
            w: cardW, padding: 32, gap: 'sm',
            fill: card.shade, radius: 12,
            border: `1px solid ${C.border}`,
            shadow: 'md',
            z: card.z,
          })),
        ];
      })(),
    },

    // =========================================================================
    // SLIDE 24 — E3: Decorative Corner Brackets
    // Pattern: Content framed by L-shaped bracket decorations
    // Technique: Overlay-layer corner elements using border tricks
    // When to use: Emphasis frames, premium feel, visual framing
    // Key APIs: layer:'overlay', el, group
    // =========================================================================
    {
      id: 'e3-corner-brackets',
      background: C.bg,
      elements: (() => {
        const bracketLen = 60;
        const bracketThick = 3;
        const inset = 160;
        const bracketColor = C.accent;

        function bracket(cornerId, x, y, bottomH, rightV) {
          return group([
            el('', {
              id: `${cornerId}-h`, w: bracketLen, h: bracketThick,
              y: bottomH ? bracketLen - bracketThick : 0,
              style: { background: bracketColor },
            }),
            el('', {
              id: `${cornerId}-v`, w: bracketThick, h: bracketLen,
              x: rightV ? bracketLen - bracketThick : 0, y: 0,
              style: { background: bracketColor },
            }),
          ], {
            id: cornerId, x, y, w: bracketLen, h: bracketLen, layer: 'overlay',
          });
        }

        return [
          patternLabel('E3 · Corner Brackets', 'e3'),

          bracket('e3-tl', inset, 120, false, false),
          bracket('e3-tr', 1920 - inset - bracketLen, 120, false, true),
          bracket('e3-bl', inset, 1080 - 120 - bracketLen, true, false),
          bracket('e3-br', 1920 - inset - bracketLen, 1080 - 120 - bracketLen, true, true),

          el(`<p style="font:700 48px ${FONT};color:${C.text};text-align:center;letter-spacing:-1px">Precision Engineered</p>`, {
            id: 'e3-headline', x: safe.x + 100, y: safe.y + 200, w: safe.w - 200,
          }),
          el(`<p style="font:400 26px ${FONT};color:${C.textMuted};text-align:center;line-height:1.7">Every component is designed with sub-pixel accuracy, tested across 12 viewport breakpoints, and optimized for rendering performance on low-power devices.</p>`, {
            id: 'e3-body', x: safe.x + 160, y: below('e3-headline', { gap: 'md' }), w: safe.w - 320,
          }),
        ];
      })(),
    },

    // =========================================================================
    // SLIDE 25 — E4: Full-Bleed + Floating Islands
    // Pattern: Background image with scattered floating content panels
    // Technique: layer:'bg' for hero, multiple panels at explicit positions
    // When to use: Dashboard previews, feature showcases, spatial layouts
    // Key APIs: layer:'bg', panel, shadow, explicit positioning
    // =========================================================================
    {
      id: 'e4-floating-islands',
      background: C.bg,
      elements: [
        patternLabel('E4 · Floating Islands', 'e4'),

        el('<img src="./hero-bg.png" style="width:100%;height:100%;object-fit:cover;opacity:0.35">', {
          id: 'e4-bg', x: 0, y: 0, w: 1920, h: 1080, layer: 'bg',
        }),

        panel([
          el(`<p style="font:700 28px ${FONT};color:${C.accent}">Uptime</p>`, {
            id: 'e4-island1-title', w: 340,
          }),
          el(`<p style="font:700 56px ${FONT};color:${C.text}">99.97%</p>`, {
            id: 'e4-island1-stat', w: 340,
          }),
          el(`<p style="font:400 18px ${FONT};color:${C.textMuted}">Rolling 30-day average across all regions</p>`, {
            id: 'e4-island1-desc', w: 340,
          }),
        ], {
          id: 'e4-island1', x: 140, y: 160,
          w: 420, padding: 32, gap: 12,
          fill: 'rgba(10,10,26,0.8)', radius: 12, shadow: 'lg',
          border: `1px solid ${C.border}`,
        }),

        panel([
          el(`<p style="font:700 28px ${FONT};color:${C.accentGrn}">Deployments</p>`, {
            id: 'e4-island2-title', w: 340,
          }),
          el(`<p style="font:700 56px ${FONT};color:${C.text}">1,247</p>`, {
            id: 'e4-island2-stat', w: 340,
          }),
          el(`<p style="font:400 18px ${FONT};color:${C.textMuted}">Successful releases this quarter</p>`, {
            id: 'e4-island2-desc', w: 340,
          }),
        ], {
          id: 'e4-island2', x: 1360, y: 120,
          w: 420, padding: 32, gap: 12,
          fill: 'rgba(10,10,26,0.8)', radius: 12, shadow: 'lg',
          border: `1px solid ${C.border}`,
        }),

        panel([
          el(`<p style="font:700 28px ${FONT};color:${C.accentRed}">Incidents</p>`, {
            id: 'e4-island3-title', w: 380,
          }),
          el(`<p style="font:700 56px ${FONT};color:${C.text}">3</p>`, {
            id: 'e4-island3-stat', w: 380,
          }),
          el(`<p style="font:400 18px ${FONT};color:${C.textMuted}">Severity-1 events in the past 12 months</p>`, {
            id: 'e4-island3-desc', w: 380,
          }),
        ], {
          id: 'e4-island3', x: 700, y: 640,
          w: 460, padding: 32, gap: 12,
          fill: 'rgba(10,10,26,0.8)', radius: 12, shadow: 'lg',
          border: `1px solid ${C.border}`,
        }),
      ],
    },

    // =========================================================================
    // SLIDE 26 — F1: Centered Pull Quote
    // Pattern: Large italic quote centered with decorative quotation mark
    // Technique: Centered text with anchor:'tc', decorative oversized glyph
    // When to use: Testimonials, key statements, emphasis
    // Key APIs: el, anchor:'tc', below
    // =========================================================================
    {
      id: 'f1-pull-quote',
      background: C.bg,
      elements: [
        patternLabel('F1 · Pull Quote', 'f1'),

        el(`<p style="font:700 180px ${FONT};color:rgba(0,212,255,0.15);line-height:1">\u201C</p>`, {
          id: 'f1-deco', x: safe.x + safe.w / 2 - 100, y: safe.y + 40, w: 200, layer: 'overlay',
        }),

        el(`<p style="font:400 italic 36px ${FONT};color:${C.text};text-align:center;line-height:1.6">The best infrastructure is the kind your engineers never have to think about. It should be invisible, reliable, and fast enough that nobody writes a ticket about it.</p>`, {
          id: 'f1-quote', x: safe.x + 120, y: safe.y + 220, w: safe.w - 240,
        }),

        el(`<p style="font:600 22px ${FONT};color:${C.accent};text-align:right">— Maren Voss, VP of Platform Engineering</p>`, {
          id: 'f1-attribution', x: safe.x + 120, y: below('f1-quote', { gap: 40 }), w: safe.w - 240,
        }),
      ],
    },

    // =========================================================================
    // SLIDE 27 — F2: Asymmetric Pull Quote
    // Pattern: Quote on left, attribution on right (vertically centered)
    // Technique: splitRect for asymmetric layout, centerVWith for alignment
    // When to use: Editorial layouts, interview excerpts, featured quotes
    // Key APIs: splitRect, centerVWith, el
    // =========================================================================
    {
      id: 'f2-pull-quote-asym',
      background: C.bg,
      elements: (() => {
        const { left, right } = splitRect(safe, { ratio: 0.65, gap: 40 });
        return [
          patternLabel('F2 · Asymmetric Quote', 'f2'),

          el(`<p style="font:400 italic 34px ${FONT};color:${C.text};line-height:1.7">We replaced four separate monitoring tools with a single platform and cut our mean time to detection from 14 minutes to 45 seconds. The on-call team finally sleeps through the night.</p>`, {
            id: 'f2-quote', x: left.x, y: left.y + 80, w: left.w,
          }),

          el('', {
            id: 'f2-divider', x: right.x - 20, y: centerVWith('f2-quote'), w: 4, h: 180,
            style: { background: C.accent, borderRadius: '2px' },
          }),

          vstack([
            el(`<p style="font:700 24px ${FONT};color:${C.text}">Kiran Patel</p>`, {
              id: 'f2-name', w: right.w,
            }),
            el(`<p style="font:400 20px ${FONT};color:${C.accent}">Director of Site Reliability</p>`, {
              id: 'f2-role', w: right.w,
            }),
            el(`<p style="font:400 20px ${FONT};color:${C.textMuted}">Stratos Financial Systems</p>`, {
              id: 'f2-company', w: right.w,
            }),
          ], {
            id: 'f2-attr-stack', x: right.x, y: centerVWith('f2-quote'), w: right.w, gap: 'xs',
          }),
        ];
      })(),
    },

    // =========================================================================
    // SLIDE 28 — F3: Big Number + Label
    // Pattern: One massive statistic as the focal point
    // Technique: Large font centered with supporting text below
    // When to use: KPI highlights, impact statements, single data points
    // Key APIs: el, below, anchor:'tc'
    // =========================================================================
    {
      id: 'f3-big-stat',
      background: C.bg,
      elements: [
        patternLabel('F3 · Big Stat', 'f3'),

        el(`<p style="font:700 160px ${FONT};color:${C.accent};text-align:center;letter-spacing:-4px;line-height:1">4.2B</p>`, {
          id: 'f3-number', x: safe.x, y: safe.y + 160, w: safe.w,
        }),

        el(`<p style="font:700 36px ${FONT};color:${C.text};text-align:center;letter-spacing:2px;text-transform:uppercase">Events Processed Daily</p>`, {
          id: 'f3-stat-label', x: safe.x, y: below('f3-number', { gap: 'md' }), w: safe.w,
        }),

        el(`<p style="font:400 24px ${FONT};color:${C.textMuted};text-align:center">Across 14 regions with a median end-to-end latency of 8 milliseconds</p>`, {
          id: 'f3-context', x: safe.x + 200, y: below('f3-stat-label', { gap: 'sm' }), w: safe.w - 400,
        }),
      ],
    },

    // =========================================================================
    // SLIDE 29 — F4: Multi-Stat Row (4 Statistics)
    // Pattern: Title + row of 4 stat columns side by side
    // Technique: Explicit column calculation for uniform stat layout
    // When to use: Dashboards, quarterly reports, metric overviews
    // Key APIs: explicit cols, el, below, distributeH
    // =========================================================================
    {
      id: 'f4-multi-stat',
      background: C.bg,
      elements: (() => {
        const cols = 4;
        const colGap = 32; // equals spacing token 'lg'
        const colW = (safe.w - (cols - 1) * colGap) / cols;
        const statY = safe.y + 200;

        const stats = [
          { value: '99.99%', unit: 'uptime', label: 'Production SLA', color: C.accent },
          { value: '847', unit: 'services', label: 'Active Microservices', color: C.accentGrn },
          { value: '<12ms', unit: 'p99', label: 'Query Latency', color: C.accentRed },
          { value: '2.4M', unit: 'eps', label: 'Events Per Second', color: '#a78bfa' },
        ];

        return [
          patternLabel('F4 · Multi-Stat Row', 'f4'),

          el(`<p style="font:700 48px ${FONT};color:${C.text};letter-spacing:-1px;text-align:center">Platform Health Dashboard</p>`, {
            id: 'f4-title', x: safe.x, y: safe.y, w: safe.w,
          }),

          ...stats.map((stat, i) => {
            const colX = safe.x + i * (colW + colGap);
            return group([
              el(`<p style="font:700 72px ${FONT};color:${stat.color};text-align:center;letter-spacing:-2px">${stat.value}</p>`, {
                id: `f4-val${i}`, w: colW,
              }),
              el(`<p style="font:600 20px ${FONT};color:${C.textMuted};text-align:center;text-transform:uppercase;letter-spacing:2px">${stat.unit}</p>`, {
                id: `f4-unit${i}`, y: below(`f4-val${i}`, { gap: 'xs' }), w: colW,
              }),
              el(`<p style="font:400 20px ${FONT};color:${C.textDim};text-align:center">${stat.label}</p>`, {
                id: `f4-label${i}`, y: below(`f4-unit${i}`, { gap: 'xs' }), w: colW,
              }),
            ], {
              id: `f4-col${i}`, x: colX, y: statY, w: colW, bounds: 'hug',
            });
          }),
        ];
      })(),
    },

    // =========================================================================
    // SLIDE 30 — F5: Title + Subtitle + Eyebrow (Typographic Hierarchy)
    // Pattern: Demonstrates typographic scale and hierarchy
    // Technique: vstack for vertical rhythm with varied font sizes
    // When to use: Section openers, title slides, typographic reference
    // Key APIs: vstack, el
    // =========================================================================
    {
      id: 'f5-title-hierarchy',
      background: C.bg,
      elements: [
        patternLabel('F5 · Title Hierarchy', 'f5'),

        vstack([
          el(`<p style="font:600 14px ${FONT};color:${C.accent};text-transform:uppercase;letter-spacing:4px">Chapter Three</p>`, {
            id: 'f5-eyebrow', w: safe.w,
          }),
          el(`<p style="font:700 64px ${FONT};color:${C.text};letter-spacing:-2px;line-height:1.1">Building for Resilience at Global Scale</p>`, {
            id: 'f5-title', w: safe.w,
          }),
          el(`<p style="font:300 28px ${FONT};color:${C.textMuted};line-height:1.5">How distributed systems survive cascading failures, region outages, and traffic spikes without human intervention</p>`, {
            id: 'f5-subtitle', w: safe.w,
          }),
          el(`<p style="font:400 24px ${FONT};color:${C.textDim};line-height:1.7">This section explores the architectural patterns, operational playbooks, and cultural practices that enable our platform to maintain five-nines availability while deploying 200 times per week across 14 geographic regions.</p>`, {
            id: 'f5-body', w: safe.w,
          }),
        ], {
          id: 'f5-stack', x: safe.x, y: safe.y + 120, w: safe.w, gap: 28,
        }),
      ],
    },

    // =========================================================================
    // SLIDE 31 — G1: Horizontal Bar Chart
    // Pattern: Data-viz style horizontal bar chart with labels and values
    // Technique: Stacked rows using below() with proportional-width rectangles
    // When to use: Resource allocation, survey results, budget breakdowns
    // Key APIs: el, below, rightOf
    // =========================================================================
    {
      id: 'g1-bar-chart',
      background: C.bg,
      elements: (() => {
        const chartX = safe.x + 200;
        const barMaxW = safe.w - 400;
        const barH = 44;
        const barGap = 24;
        const startY = safe.y + 160;

        const bars = [
          { label: 'Engineering', pct: 0.38, value: '38%', color: C.accent },
          { label: 'Marketing', pct: 0.22, value: '22%', color: C.accentGrn },
          { label: 'Operations', pct: 0.18, value: '18%', color: '#a78bfa' },
          { label: 'Sales', pct: 0.14, value: '14%', color: C.accentRed },
          { label: 'Support', pct: 0.08, value: '8%', color: '#f59e0b' },
        ];

        return [
          patternLabel('G1 · Horizontal Bar Chart', 'g1'),

          el(`<p style="font:700 48px ${FONT};color:${C.text};letter-spacing:-1px">Quarterly Resource Allocation</p>`, {
            id: 'g1-title', x: safe.x, y: safe.y, w: safe.w,
          }),

          ...bars.flatMap((bar, i) => {
            const rowY = startY + i * (barH + barGap);
            return [
              el(`<p style="font:600 20px ${FONT};color:${C.textMuted};text-align:right;line-height:${barH}px">${bar.label}</p>`, {
                id: `g1-lbl${i}`, x: safe.x, y: rowY, w: 170,
              }),
              el('', {
                id: `g1-barbg${i}`, x: chartX, y: rowY, w: barMaxW, h: barH,
                style: { background: C.surface, borderRadius: '6px' },
              }),
              el('', {
                id: `g1-bar${i}`, x: chartX, y: rowY, w: Math.round(barMaxW * bar.pct), h: barH,
                style: { background: bar.color, borderRadius: '6px' },
              }),
              el(`<p style="font:700 20px ${FONT};color:${bar.color};line-height:${barH}px">${bar.value}</p>`, {
                id: `g1-val${i}`, x: rightOf(`g1-bar${i}`, { gap: 'sm' }), y: rowY, w: 80,
              }),
            ];
          }),
        ];
      })(),
    },

    // =========================================================================
    // SLIDE 32 — G2: Process Flow with Connectors
    // Pattern: Horizontal process flow with connected step boxes
    // Technique: Explicitly positioned panels with curved connectors
    // When to use: Workflow diagrams, process documentation, pipelines
    // Key APIs: panel, connect(type:'curved'), explicit positioning
    // =========================================================================
    {
      id: 'g2-process-flow',
      background: C.bg,
      elements: (() => {
        const steps = [
          { num: '01', label: 'Discovery' },
          { num: '02', label: 'Design' },
          { num: '03', label: 'Develop' },
          { num: '04', label: 'Deploy' },
        ];
        const boxW = 280;
        const totalGap = safe.w - steps.length * boxW;
        const gap = totalGap / (steps.length - 1);
        const boxY = safe.y + 260;

        return [
          patternLabel('G2 · Process Flow', 'g2'),

          el(`<p style="font:700 48px ${FONT};color:${C.text};letter-spacing:-1px;text-align:center">Development Lifecycle</p>`, {
            id: 'g2-title', x: safe.x, y: safe.y + 40, w: safe.w,
          }),
          el(`<p style="font:400 22px ${FONT};color:${C.textMuted};text-align:center">From concept to production in four streamlined phases</p>`, {
            id: 'g2-subtitle', x: safe.x, y: safe.y + 110, w: safe.w,
          }),

          ...steps.map((step, i) => {
            const boxX = safe.x + i * (boxW + gap);
            return panel([
              el(`<p style="font:700 36px ${FONT};color:${C.accent}">${step.num}</p>`, {
                id: `g2-num${i}`, w: boxW - 48,
              }),
              el(`<p style="font:600 24px ${FONT};color:${C.text}">${step.label}</p>`, {
                id: `g2-step${i}`, w: boxW - 48,
              }),
            ], {
              id: `g2-box${i}`, x: boxX, y: boxY, w: boxW,
              padding: 24, gap: 12, fill: C.surface, radius: 12,
              border: `1px solid ${C.border}`,
            });
          }),

          ...steps.slice(0, -1).map((_, i) =>
            connect(`g2-box${i}`, `g2-box${i + 1}`, {
              type: 'curved', fromAnchor: 'cr', toAnchor: 'cl',
              color: C.accent, thickness: 2, arrow: 'end',
            })
          ),
        ];
      })(),
    },

    // =========================================================================
    // SLIDE 33 — G3: Comparison Table
    // Pattern: Two-column comparison table with alternating rows
    // Technique: splitRect for columns, stacked rows with below()
    // When to use: Feature comparisons, plan tiers, before/after analysis
    // Key APIs: splitRect, panel, below, el
    // =========================================================================
    {
      id: 'g3-comparison-table',
      background: C.bg,
      elements: (() => {
        const { left: colL, right: colR } = splitRect(
          { x: safe.x, y: safe.y + 120, w: safe.w, h: safe.h - 120 },
          { ratio: 0.5, gap: 4 },
        );
        const rowH = 56;
        const rows = [
          { feature: 'Deployment', free: 'Manual', pro: 'Automated CI/CD' },
          { feature: 'Monitoring', free: 'Basic logs', pro: 'Full observability' },
          { feature: 'Scaling', free: 'Vertical only', pro: 'Auto-horizontal' },
          { feature: 'Support', free: 'Community', pro: '24/7 dedicated' },
          { feature: 'SLA', free: '99.5%', pro: '99.99%' },
        ];

        return [
          patternLabel('G3 · Comparison Table', 'g3'),

          el(`<p style="font:700 48px ${FONT};color:${C.text};letter-spacing:-1px;text-align:center">Plan Comparison</p>`, {
            id: 'g3-title', x: safe.x, y: safe.y, w: safe.w,
          }),

          // Header row
          el(`<p style="font:700 22px ${FONT};color:${C.text};text-align:center;line-height:${rowH}px">Free Tier</p>`, {
            id: 'g3-hdrL', x: colL.x, y: colL.y, w: colL.w,
            style: { background: C.surfaceAlt, borderRadius: '8px 0 0 0' },
          }),
          el(`<p style="font:700 22px ${FONT};color:#ffffff;text-align:center;line-height:${rowH}px">Pro Tier</p>`, {
            id: 'g3-hdrR', x: colR.x, y: colL.y, w: colR.w,
            style: { background: '#0a3040', borderRadius: '0 8px 0 0' },
          }),

          ...rows.flatMap((row, i) => {
            const rowY = colL.y + rowH + i * rowH;
            const bgColor = i % 2 === 0 ? C.surface : 'transparent';
            return [
              el(`<p style="font:400 18px ${FONT};color:${C.textMuted};text-align:center;line-height:${rowH}px"><span style="color:${C.textDim};font-size:13px">${row.feature}:</span> ${row.free}</p>`, {
                id: `g3-cellL${i}`, x: colL.x, y: rowY, w: colL.w,
                style: { background: bgColor },
              }),
              el(`<p style="font:500 18px ${FONT};color:${C.text};text-align:center;line-height:${rowH}px"><span style="color:${C.textDim};font-size:13px">${row.feature}:</span> ${row.pro}</p>`, {
                id: `g3-cellR${i}`, x: colR.x, y: rowY, w: colR.w,
                style: { background: bgColor },
              }),
            ];
          }),
        ];
      })(),
    },

    // =========================================================================
    // SLIDE 34 — G4: KPI Dashboard (4 Metric Cards)
    // Pattern: 2×2 grid of metric cards with large numbers and trends
    // Technique: Explicit grid calculation for uniform card layout
    // When to use: Executive dashboards, quarterly reviews, status reports
    // Key APIs: explicit grid calc, panel, el
    // =========================================================================
    {
      id: 'g4-kpi-dashboard',
      background: C.bg,
      elements: (() => {
        const cols = 2;
        const rows = 2;
        const gap = 24; // equals spacing token 'md'
        const gridY = safe.y + 140;
        const cardW = (safe.w - gap) / cols;
        const cardH = (safe.h - 140 - gap) / rows;

        const metrics = [
          { value: '$4.2M', label: 'Monthly Revenue', trend: '↑ 12.4%', trendColor: C.accentGrn, indicator: '💰' },
          { value: '18,429', label: 'Active Users', trend: '↑ 8.7%', trendColor: C.accentGrn, indicator: '👥' },
          { value: '342ms', label: 'Avg Response Time', trend: '↓ 23%', trendColor: C.accentGrn, indicator: '⚡' },
          { value: '99.97%', label: 'Uptime SLA', trend: '→ stable', trendColor: C.textMuted, indicator: '🛡️' },
        ];

        return [
          patternLabel('G4 · KPI Dashboard', 'g4'),

          el(`<p style="font:700 48px ${FONT};color:${C.text};letter-spacing:-1px">Performance Overview</p>`, {
            id: 'g4-title', x: safe.x, y: safe.y, w: safe.w,
          }),

          ...metrics.map((m, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const cardX = safe.x + col * (cardW + gap);
            const cardY = gridY + row * (cardH + gap);

            return panel([
              el(`<p style="font-size:32px;line-height:1">${m.indicator}</p>`, {
                id: `g4-icon${i}`, w: 50,
              }),
              el(`<p style="font:700 56px ${FONT};color:${C.text};letter-spacing:-2px">${m.value}</p>`, {
                id: `g4-val${i}`, y: below(`g4-icon${i}`, { gap: 'sm' }), w: cardW - 64,
              }),
              el(`<p style="font:400 20px ${FONT};color:${C.textMuted}">${m.label}</p>`, {
                id: `g4-lbl${i}`, y: below(`g4-val${i}`, { gap: 'xs' }), w: cardW - 64,
              }),
              el(`<p style="font:600 18px ${FONT};color:${m.trendColor}">${m.trend}</p>`, {
                id: `g4-trend${i}`, y: below(`g4-lbl${i}`, { gap: 12 }), w: cardW - 64,
              }),
            ], {
              id: `g4-card${i}`, x: cardX, y: cardY, w: cardW, h: cardH,
              padding: 32, fill: C.surface, radius: 16,
              border: `1px solid ${C.border}`,
            });
          }),
        ];
      })(),
    },

    // =========================================================================
    // SLIDE 35 — H1: 3-Image Gallery Row
    // Pattern: Three images side by side with captions
    // Technique: Explicit column calculation with figure + el captions
    // When to use: Portfolio displays, image galleries, visual comparisons
    // Key APIs: figure, explicit cols, below, el
    // =========================================================================
    {
      id: 'h1-image-gallery',
      background: C.bg,
      elements: (() => {
        const cols = 3;
        const colGap = 24; // equals spacing token 'md'
        const colW = (safe.w - (cols - 1) * colGap) / cols;
        const imgH = 480;
        const imgY = safe.y + 120;

        const images = [
          { src: IMAGES.squareFeature, caption: 'Product Launch Campaign' },
          { src: IMAGES.landscapeBanner, caption: 'Annual Conference Keynote' },
          { src: IMAGES.smallIcon, caption: 'Brand Identity Refresh' },
        ];

        return [
          patternLabel('H1 · Image Gallery', 'h1'),

          el(`<p style="font:700 48px ${FONT};color:${C.text};letter-spacing:-1px;text-align:center">Featured Projects</p>`, {
            id: 'h1-title', x: safe.x, y: safe.y, w: safe.w,
          }),

          ...images.flatMap((img, i) => {
            const colX = safe.x + i * (colW + colGap);
            return [
              figure({
                id: `h1-img${i}`, src: img.src,
                x: colX, y: imgY, w: colW, h: imgH,
                fit: 'cover', containerRadius: 12,
              }),
              el(`<p style="font:500 18px ${FONT};color:${C.textMuted};text-align:center">${img.caption}</p>`, {
                id: `h1-cap${i}`, x: colX, y: below(`h1-img${i}`, { gap: 'sm' }), w: colW,
              }),
            ];
          }),
        ];
      })(),
    },

    // =========================================================================
    // SLIDE 36 — H2: Hero Image + Text at Bottom
    // Pattern: Large hero image with text overlay bar at bottom
    // Technique: Full-width figure with positioned text below
    // When to use: Visual-first slides, photography showcases, intro slides
    // Key APIs: figure, below, el
    // =========================================================================
    {
      id: 'h2-hero-image-text',
      background: C.bg,
      elements: [
        patternLabel('H2 · Hero Image + Text', 'h2'),

        figure({
          id: 'h2-hero', src: IMAGES.heroBg,
          x: 0, y: 0, w: 1920, h: 780,
          fit: 'cover', layer: 'bg',
        }),

        el('', {
          id: 'h2-textbar', x: 0, y: 780, w: 1920, h: 300,
          style: { background: `linear-gradient(180deg, ${C.bg}00, ${C.bg} 30%)` },
          layer: 'bg',
        }),

        el(`<p style="font:700 44px ${FONT};color:${C.text};letter-spacing:-1px">Captured in the Wild</p>`, {
          id: 'h2-btitle', x: safe.x, y: 820, w: safe.w,
        }),

        el(`<p style="font:400 22px ${FONT};color:${C.textMuted};line-height:1.6">A photographic journey through untamed landscapes — exploring the raw beauty of nature at the edge of civilization.</p>`, {
          id: 'h2-bdesc', x: safe.x, y: below('h2-btitle', { gap: 'sm' }), w: safe.w * 0.65,
        }),
      ],
    },

    // =========================================================================
    // SLIDE 37 — H3: Image + Detailed Caption
    // Pattern: Large image with multi-line caption below
    // Technique: Figure for the image, vstack for caption block
    // When to use: Case studies, detailed image descriptions, documentation
    // Key APIs: figure, below, vstack
    // =========================================================================
    {
      id: 'h3-image-caption',
      background: C.bg,
      elements: [
        patternLabel('H3 · Image + Caption', 'h3'),

        figure({
          id: 'h3-photo', src: IMAGES.landscapeBanner,
          x: safe.x, y: safe.y, w: safe.w, h: safe.h * 0.6,
          fit: 'cover', containerRadius: 16,
        }),

        vstack([
          el(`<p style="font:700 28px ${FONT};color:${C.text}">Cloud Migration Architecture — Phase 2</p>`, {
            id: 'h3-cap-title', w: safe.w * 0.8,
          }),
          el(`<p style="font:400 20px ${FONT};color:${C.textMuted};line-height:1.7">The diagram above illustrates the hybrid transit gateway topology deployed across three availability zones. Ingress traffic flows through the global accelerator into the primary region, with automatic failover configured for sub-second recovery. Database replication uses synchronous writes within the region and asynchronous cross-region streaming.</p>`, {
            id: 'h3-cap-body', w: safe.w * 0.8,
          }),
        ], {
          id: 'h3-cap-stack', x: safe.x, y: below('h3-photo', { gap: 'md' }), w: safe.w, gap: 12,
        }),
      ],
    },

    // =========================================================================
    // SLIDE 38 — H4: Side-by-Side Before/After
    // Pattern: Split comparison with labeled images and a divider
    // Technique: splitRect for even columns with figures and labels
    // When to use: Before/after comparisons, A/B testing, redesign showcases
    // Key APIs: splitRect, figure, el
    // =========================================================================
    {
      id: 'h4-before-after',
      background: C.bg,
      elements: (() => {
        const { left: colL, right: colR } = splitRect(safe, { ratio: 0.5, gap: 24 });
        const labelH = 48;
        const imgY = safe.y + labelH + 16;
        const imgH = safe.h - labelH - 16;

        return [
          patternLabel('H4 · Before / After', 'h4'),

          el(`<p style="font:700 22px ${FONT};color:${C.accentRed};text-transform:uppercase;letter-spacing:3px;text-align:center">Before</p>`, {
            id: 'h4-lbl-before', x: colL.x, y: colL.y, w: colL.w,
          }),
          figure({
            id: 'h4-img-before', src: IMAGES.heroBg,
            x: colL.x, y: imgY, w: colL.w, h: imgH,
            fit: 'cover', containerRadius: 12,
          }),

          // Divider line
          el('', {
            id: 'h4-divider', x: safe.x + safe.w / 2 - 1, y: safe.y, w: 2, h: safe.h,
            style: { background: C.border },
          }),

          el(`<p style="font:700 22px ${FONT};color:${C.accentGrn};text-transform:uppercase;letter-spacing:3px;text-align:center">After</p>`, {
            id: 'h4-lbl-after', x: colR.x, y: colR.y, w: colR.w,
          }),
          figure({
            id: 'h4-img-after', src: IMAGES.landscapeBanner,
            x: colR.x, y: imgY, w: colR.w, h: imgH,
            fit: 'cover', containerRadius: 12,
          }),
        ];
      })(),
    },

    // =========================================================================
    // SLIDE 39 — I1: Centered Island (Whitespace)
    // Pattern: Minimal content island centered in generous whitespace
    // Technique: centerIn for perfect centering with a small panel
    // When to use: Quotes, key insights, reflective pauses, emphasis slides
    // Key APIs: centerIn, panel, shadow
    // =========================================================================
    {
      id: 'i1-centered-island',
      background: C.bg,
      elements: (() => {
        const islandW = 600;
        const pos = centerIn({ x: 0, y: 0, w: 1920, h: 1080 });

        return [
          patternLabel('I1 · Centered Island', 'i1'),

          panel([
            el('', {
              id: 'i1-deco-line', w: 48, h: 3,
              style: { background: C.accent, borderRadius: '2px' },
            }),
            el(`<p style="font:italic 400 26px ${FONT};color:${C.text};line-height:1.7">"The best interface is no interface. The best code is no code. Strive to remove, not to add."</p>`, {
              id: 'i1-quote', y: below('i1-deco-line', { gap: 'md' }), w: islandW - 80,
            }),
            el(`<p style="font:600 16px ${FONT};color:${C.textMuted};letter-spacing:1px">— GOLDEN KRISHNA</p>`, {
              id: 'i1-attr', y: below('i1-quote', { gap: 20 }), w: islandW - 80,
            }),
          ], {
            id: 'i1-panel', x: pos.x, y: pos.y, w: islandW,
            padding: 40, fill: C.surface, radius: 20,
            border: `1px solid ${C.border}`, shadow: 'xl',
          }),
        ];
      })(),
    },

    // =========================================================================
    // SLIDE 40 — I2: Radial Hub-Spoke
    // Pattern: Central hub with satellite nodes arranged in a circle
    // Technique: Trigonometric positioning for radial layout with connectors
    // When to use: Ecosystem diagrams, platform overviews, dependency maps
    // Key APIs: connect, el, explicit positioning
    // =========================================================================
    {
      id: 'i2-radial-hub',
      background: C.bg,
      elements: (() => {
        const cx = 960;
        const cy = 480;
        const hubSize = 110;
        const radius = 280;
        const spokeW = 180;
        const spokeH = 70;

        const spokes = [
          { label: 'Auth Service', color: C.accent },
          { label: 'Data Pipeline', color: C.accentGrn },
          { label: 'ML Engine', color: '#a78bfa' },
          { label: 'API Gateway', color: C.accentRed },
          { label: 'Edge CDN', color: '#f59e0b' },
          { label: 'Monitoring', color: '#34d399' },
        ];

        const spokePositions = spokes.map((_, i) => {
          const angle = (i * 2 * Math.PI) / spokes.length - Math.PI / 2;
          return {
            x: cx + radius * Math.cos(angle) - spokeW / 2,
            y: cy + radius * Math.sin(angle) - spokeH / 2,
          };
        });

        return [
          patternLabel('I2 · Radial Hub-Spoke', 'i2'),

          // Hub
          panel([
            el(`<p style="font:700 16px ${FONT};color:${C.text};text-align:center">Core<br>Platform</p>`, {
              id: 'i2-hub-txt', w: hubSize - 32,
            }),
          ], {
            id: 'i2-hub', x: cx - hubSize / 2, y: cy - hubSize / 2,
            w: hubSize, h: hubSize,
            padding: 16, fill: C.accent + '22', radius: hubSize / 2,
            border: `2px solid ${C.accent}`,
          }),

          // Spokes
          ...spokes.map((spoke, i) =>
            panel([
              el(`<p style="font:600 15px ${FONT};color:${spoke.color};text-align:center">${spoke.label}</p>`, {
                id: `i2-spoke-txt${i}`, w: spokeW - 32,
              }),
            ], {
              id: `i2-spoke${i}`,
              x: spokePositions[i].x, y: spokePositions[i].y,
              w: spokeW, h: spokeH,
              padding: 16, fill: C.surface, radius: 12,
              border: `1px solid ${spoke.color}44`,
            })
          ),

          // Connectors
          ...spokes.map((spoke, i) =>
            connect('i2-hub', `i2-spoke${i}`, {
              type: 'straight', color: spoke.color + '66', thickness: 2,
              arrow: 'end', dash: '8 6',
            })
          ),

          // Subtitle
          el(`<p style="font:400 20px ${FONT};color:${C.textMuted};text-align:center">Platform services connected through a unified API gateway</p>`, {
            id: 'i2-subtitle', x: safe.x + 200, y: cy + radius + spokeH / 2 + 60, w: safe.w - 400,
          }),
        ];
      })(),
    },

    // =========================================================================
    // SLIDE 41 — I3: Magazine Editorial Spread
    // Pattern: Asymmetric editorial layout with tall image and text blocks
    // Technique: Manual asymmetric positioning for editorial feel
    // When to use: Creative decks, editorial layouts, storytelling slides
    // Key APIs: figure, el, asymmetric positioning
    // =========================================================================
    {
      id: 'i3-magazine-spread',
      background: C.bg,
      elements: (() => {
        const imgW = Math.round(safe.w * 0.3);
        const rightX = safe.x + imgW + 48;
        const rightW = safe.w - imgW - 48;

        return [
          patternLabel('I3 · Magazine Editorial', 'i3'),

          figure({
            id: 'i3-portrait', src: IMAGES.portraitSidebar,
            x: safe.x, y: safe.y, w: imgW, h: safe.h,
            fit: 'cover', containerRadius: 16,
          }),

          el(`<p style="font:italic 300 36px ${FONT};color:${C.accent};line-height:1.5">"Design is not just what it looks like and feels like. Design is how it works."</p>`, {
            id: 'i3-pullquote', x: rightX, y: safe.y + 40, w: rightW,
          }),

          el(`<p style="font:400 20px ${FONT};color:${C.textMuted};line-height:1.8">Our editorial approach to product design emphasizes clarity over complexity. Every interaction is intentionally crafted to reduce cognitive load and surface the most relevant information at exactly the right moment. We believe constraints breed creativity — and we embrace them at every level of the design process, from typography to information architecture.</p>`, {
            id: 'i3-body', x: rightX, y: below('i3-pullquote', { gap: 40 }), w: rightW,
          }),

          figure({
            id: 'i3-detail', src: IMAGES.smallIcon,
            x: rightX + rightW - 200, y: safe.y + safe.h - 200, w: 180, h: 180,
            fit: 'cover', containerRadius: 12,
          }),
        ];
      })(),
    },

    // =========================================================================
    // SLIDE 42 — J1: Section Divider
    // Pattern: Bold section number as background with centered title
    // Technique: Large muted text on bg layer with overlay title and accent line
    // When to use: Section breaks, chapter transitions, major topic shifts
    // Key APIs: el, layer:'bg', anchor
    // =========================================================================
    {
      id: 'j1-section-divider',
      background: C.bg,
      elements: [
        patternLabel('J1 · Section Divider', 'j1'),

        el(`<p style="font:900 360px ${FONT};color:rgba(255,255,255,0.04);text-align:center;line-height:1">03</p>`, {
          id: 'j1-bignumber', x: 0, y: 280, w: 1920, layer: 'bg',
        }),

        el(`<p style="font:700 56px ${FONT};color:${C.text};text-align:center;letter-spacing:-1px">Infrastructure & Operations</p>`, {
          id: 'j1-title', x: safe.x, y: centerIn(safe).y, w: safe.w,
        }),

        el('', {
          id: 'j1-accent-line', x: 960 - 60, y: below('j1-title', { gap: 28 }), w: 120, h: 4,
          style: { background: C.accent, borderRadius: '2px' }, layer: 'overlay',
        }),

        el(`<p style="font:400 22px ${FONT};color:${C.textMuted};text-align:center">Scaling systems, hardening security, and automating everything</p>`, {
          id: 'j1-sub', x: safe.x, y: below('j1-accent-line', { gap: 28 }), w: safe.w,
        }),
      ],
    },

    // =========================================================================
    // SLIDE 43 — J2: Agenda / Table of Contents
    // Pattern: Numbered agenda items with visual alignment aids
    // Technique: Stacked rows using below() with number + title + dots + time
    // When to use: Agenda slides, table of contents, session outlines
    // Key APIs: below, el, rightOf
    // =========================================================================
    {
      id: 'j2-agenda',
      background: C.bg,
      elements: (() => {
        const items = [
          { num: '01', title: 'Opening Remarks & Vision', time: '9:00 AM' },
          { num: '02', title: 'Q3 Performance Review', time: '9:20 AM' },
          { num: '03', title: 'Product Roadmap 2025', time: '9:45 AM' },
          { num: '04', title: 'Engineering Deep Dive', time: '10:15 AM' },
          { num: '05', title: 'Customer Case Studies', time: '10:45 AM' },
          { num: '06', title: 'Q&A and Closing', time: '11:15 AM' },
        ];
        const startY = safe.y + 140;
        const rowH = 64;
        const numW = 60;
        const titleW = 700;
        const dotsW = safe.w - numW - titleW - 140;

        return [
          patternLabel('J2 · Agenda', 'j2'),

          el(`<p style="font:700 48px ${FONT};color:${C.text};letter-spacing:-1px">Agenda</p>`, {
            id: 'j2-title', x: safe.x, y: safe.y, w: safe.w,
          }),

          ...items.flatMap((item, i) => {
            const rowY = startY + i * (rowH + 8);
            return [
              el(`<p style="font:700 24px ${FONT};color:${C.accent};line-height:${rowH}px">${item.num}</p>`, {
                id: `j2-num${i}`, x: safe.x, y: rowY, w: numW,
              }),
              el(`<p style="font:500 24px ${FONT};color:${C.text};line-height:${rowH}px">${item.title}</p>`, {
                id: `j2-item${i}`, x: safe.x + numW + 16, y: rowY, w: titleW,
              }),
              el(`<p style="font:400 18px ${FONT};color:${C.textDim};line-height:${rowH}px;overflow:hidden;white-space:nowrap">${'· '.repeat(80)}</p>`, {
                id: `j2-dots${i}`, x: safe.x + numW + titleW + 32, y: rowY, w: dotsW,
              }),
              el(`<p style="font:600 20px ${FONT};color:${C.textMuted};line-height:${rowH}px;text-align:right">${item.time}</p>`, {
                id: `j2-time${i}`, x: safe.x + safe.w - 120, y: rowY, w: 120,
              }),
            ];
          }),
        ];
      })(),
    },

    // =========================================================================
    // SLIDE 44 — J3: Thank You / Closing
    // Pattern: Elegant closing slide with hero background and centered text
    // Technique: Background image on bg layer with centered overlay text
    // When to use: Final slides, closing statements, farewell messages
    // Key APIs: layer:'bg', el, anchor
    // =========================================================================
    {
      id: 'j3-closing',
      background: C.bg,
      elements: [
        patternLabel('J3 · Closing', 'j3'),

        figure({
          id: 'j3-bg', src: IMAGES.heroBg,
          x: 0, y: 0, w: 1920, h: 1080,
          fit: 'cover', layer: 'bg',
        }),

        el('', {
          id: 'j3-overlay', x: 0, y: 0, w: 1920, h: 1080,
          style: { background: 'rgba(10,10,26,0.75)' },
          layer: 'bg',
        }),

        el(`<p style="font:700 80px ${FONT};color:${C.text};text-align:center;letter-spacing:-2px">Thank You</p>`, {
          id: 'j3-thanks', x: safe.x, y: centerIn(safe).y, w: safe.w,
        }),

        el('', {
          id: 'j3-line', x: 960 - 40, y: below('j3-thanks', { gap: 'md' }), w: 80, h: 3,
          style: { background: C.accent, borderRadius: '2px' }, layer: 'overlay',
        }),

        el(`<p style="font:400 24px ${FONT};color:${C.textMuted};text-align:center">hello@acmecorp.io · acmecorp.io/slides · @acmecorp</p>`, {
          id: 'j3-contact', x: safe.x, y: below('j3-line', { gap: 'md' }), w: safe.w,
        }),
      ],
    },

    // =========================================================================
    // SLIDE 45 — J4: Team Profile Cards
    // Pattern: Row of profile cards with avatar, name, role, and bio
    // Technique: Explicit column calculation with panel + figure for avatars
    // When to use: Team pages, about us, contributor credits
    // Key APIs: panel, figure, explicit cols
    // =========================================================================
    {
      id: 'j4-team-cards',
      background: C.bg,
      elements: (() => {
        const cols = 3;
        const colGap = 32; // equals spacing token 'lg'
        const colW = (safe.w - (cols - 1) * colGap) / cols;
        const cardY = safe.y + 140;
        const cardH = safe.h - 140;
        const avatarSize = 80;

        const members = [
          { name: 'Ariana Chen', role: 'Chief Architect', bio: 'Leads platform architecture across 14 global regions with a focus on resilience and sub-millisecond latency.' },
          { name: 'Marcus Webb', role: 'VP Engineering', bio: 'Oversees 120+ engineers shipping critical infrastructure and developer experience tooling.' },
          { name: 'Sofia Reyes', role: 'Head of Design', bio: 'Drives design systems and accessibility standards that serve over 2 million daily active users.' },
        ];

        return [
          patternLabel('J4 · Team Cards', 'j4'),

          el(`<p style="font:700 48px ${FONT};color:${C.text};letter-spacing:-1px;text-align:center">Meet the Leadership</p>`, {
            id: 'j4-title', x: safe.x, y: safe.y, w: safe.w,
          }),

          ...members.map((member, i) => {
            const cardX = safe.x + i * (colW + colGap);
            return panel([
              figure({
                id: `j4-avatar${i}`, src: IMAGES.smallIcon,
                x: (colW - 64) / 2 - avatarSize / 2, y: 0,
                w: avatarSize, h: avatarSize,
                fit: 'cover', containerRadius: avatarSize / 2,
              }),
              el(`<p style="font:700 24px ${FONT};color:${C.text};text-align:center">${member.name}</p>`, {
                id: `j4-name${i}`, y: below(`j4-avatar${i}`, { gap: 20 }), w: colW - 64,
              }),
              el(`<p style="font:600 16px ${FONT};color:${C.accent};text-align:center;text-transform:uppercase;letter-spacing:2px">${member.role}</p>`, {
                id: `j4-role${i}`, y: below(`j4-name${i}`, { gap: 'xs' }), w: colW - 64,
              }),
              el('', {
                id: `j4-divider${i}`, y: below(`j4-role${i}`, { gap: 'sm' }), w: 40, h: 2,
                style: { background: C.border },
              }),
              el(`<p style="font:400 17px ${FONT};color:${C.textMuted};text-align:center;line-height:1.7">${member.bio}</p>`, {
                id: `j4-bio${i}`, y: below(`j4-divider${i}`, { gap: 'sm' }), w: colW - 64,
              }),
            ], {
              id: `j4-card${i}`, x: cardX, y: cardY, w: colW, h: cardH,
              padding: 32, fill: C.surface, radius: 16,
              border: `1px solid ${C.border}`,
            });
          }),
        ];
      })(),
    },

    // =========================================================================
    // Category L: Advanced Compositions
    // =========================================================================

    // =========================================================================
    // SLIDE 46 — L1: Diagonal / Angled Composition
    // Pattern: Content divided by an angled line/shape across the slide
    // Technique: Use rotate prop on a wide colored bar to create a diagonal
    //   divider. Place content in the upper-left and lower-right quadrants.
    // When to use: Dynamic / energetic layouts, breaking rigid grid feel
    // Key APIs: el, rotate, below
    // =========================================================================
    {
      id: 'l1-diagonal',
      background: C.bg,
      elements: (() => {
        return [
          patternLabel('L1 · Diagonal Composition', 'l1'),

          // Diagonal accent bar spanning the slide
          el('', {
            id: 'l1-bar', x: -200, y: 440, w: 2400, h: 6,
            rotate: -15,
            style: { background: C.accent }, layer: 'overlay',
          }),

          // Upper-left quadrant: title + body
          el(`<p style="font:600 16px ${FONT};color:${C.accent};text-transform:uppercase;letter-spacing:2px">Innovation Report</p>`, {
            id: 'l1-eyebrow', x: safe.x, y: safe.y + 20, w: 700,
          }),

          el(`<p style="font:700 56px ${FONT};color:${C.text};letter-spacing:-1px;line-height:1.1">Breaking the Grid</p>`, {
            id: 'l1-title', x: safe.x, y: below('l1-eyebrow', { gap: 'sm' }), w: 700,
          }),

          el(`<p style="font:400 22px ${FONT};color:${C.textMuted};line-height:1.7">Diagonal compositions inject energy and movement into layouts. The angled divider draws the eye across the slide and creates two distinct content zones without rigid vertical or horizontal lines.</p>`, {
            id: 'l1-body', x: safe.x, y: below('l1-title', { gap: 20 }), w: 640,
          }),

          // Lower-right quadrant: stats callout
          panel([
            el(`<p style="font:700 64px ${FONT};color:${C.accent}">3.2×</p>`, {
              id: 'l1-stat-value', w: 400,
            }),
            el(`<p style="font:600 20px ${FONT};color:${C.text}">Engagement Lift</p>`, {
              id: 'l1-stat-label', y: below('l1-stat-value', { gap: 'xs' }), w: 400,
            }),
            el(`<p style="font:400 17px ${FONT};color:${C.textMuted};line-height:1.6">Dynamic layouts outperform static grids in average viewer attention span and recall metrics.</p>`, {
              id: 'l1-stat-desc', y: below('l1-stat-label', { gap: 12 }), w: 400,
            }),
          ], {
            id: 'l1-stat-card', x: safe.x + safe.w - 500, y: safe.y + safe.h - 300,
            w: 500, padding: 32, fill: C.surface, radius: 16,
            border: `1px solid ${C.border}`,
          }),
        ];
      })(),
    },

    // =========================================================================
    // SLIDE 47 — L2: Annotated Diagram
    // Pattern: Central image with callout labels connected by lines
    // Technique: figure() centered, small panel labels around it, connect()
    //   draws lines from each label to a point near the image.
    // When to use: Product diagrams, architecture overviews, feature callouts
    // Key APIs: figure, panel, connect, el
    // =========================================================================
    {
      id: 'l2-annotated-diagram',
      background: C.bg,
      elements: (() => {
        const imgW = 480;
        const imgH = 480;
        const imgX = safe.x + (safe.w - imgW) / 2;
        const imgY = safe.y + (safe.h - imgH) / 2 + 20;

        const callouts = [
          { label: 'Neural Engine', desc: '12-core ML accelerator', x: safe.x + 40, y: safe.y + 120, fromAnchor: 'cr', toAnchor: 'cl' },
          { label: 'Edge Cache', desc: '256 GB NVMe tier', x: safe.x + safe.w - 340, y: safe.y + 120, fromAnchor: 'cl', toAnchor: 'cr' },
          { label: 'Mesh Network', desc: 'Sub-ms inter-node RPC', x: safe.x + 40, y: safe.y + safe.h - 200, fromAnchor: 'cr', toAnchor: 'cl' },
          { label: 'Telemetry Bus', desc: 'Real-time observability', x: safe.x + safe.w - 340, y: safe.y + safe.h - 200, fromAnchor: 'cl', toAnchor: 'cr' },
        ];

        return [
          patternLabel('L2 · Annotated Diagram', 'l2'),

          el(`<p style="font:700 40px ${FONT};color:${C.text};text-align:center;letter-spacing:-1px">System Architecture</p>`, {
            id: 'l2-title', x: safe.x, y: safe.y, w: safe.w,
          }),

          // Central image
          figure({
            id: 'l2-center-img', src: './square-feature.png',
            x: imgX, y: imgY, w: imgW, h: imgH,
            fit: 'cover', containerRadius: 16,
          }),

          // Callout panels
          ...callouts.map((c, i) =>
            panel([
              el(`<p style="font:600 18px ${FONT};color:${C.accent}">${c.label}</p>`, {
                id: `l2-callout-title${i}`, w: 260,
              }),
              el(`<p style="font:400 15px ${FONT};color:${C.textMuted}">${c.desc}</p>`, {
                id: `l2-callout-desc${i}`, w: 260,
              }),
            ], {
              id: `l2-callout${i}`, x: c.x, y: c.y,
              w: 300, padding: 20, gap: 6, fill: C.surface, radius: 12,
              border: `1px solid ${C.border}`,
            })
          ),

          // Connect callouts to center image
          ...callouts.map((c, i) =>
            connect(`l2-callout${i}`, 'l2-center-img', {
              type: 'straight', color: C.accent + '66', thickness: 2,
              arrow: 'end', dash: '8 6',
              fromAnchor: c.fromAnchor, toAnchor: c.toAnchor,
            })
          ),
        ];
      })(),
    },

    // =========================================================================
    // SLIDE 48 — L3: Code Syntax Showcase
    // Pattern: A code block styled like an IDE editor window
    // Technique: panel() for the editor frame, title bar with traffic-light
    //   dots, monospace font for code body with syntax-colored keywords.
    // When to use: Developer-focused slides, API demos, code walkthroughs
    // Key APIs: panel, el, below
    // =========================================================================
    {
      id: 'l3-code-showcase',
      background: C.bg,
      elements: (() => {
        const editorX = safe.x + 160;
        const editorW = safe.w - 320;
        const editorY = safe.y + 80;

        const codeLines = [
          `<span style="color:#c678dd">import</span> <span style="color:#e5c07b">{ Pipeline }</span> <span style="color:#c678dd">from</span> <span style="color:#98c379">'@acme/core'</span>;`,
          ``,
          `<span style="color:#c678dd">const</span> <span style="color:#e06c75">pipeline</span> = <span style="color:#c678dd">new</span> <span style="color:#e5c07b">Pipeline</span>({`,
          `  <span style="color:#e06c75">source</span>: <span style="color:#98c379">'events.stream'</span>,`,
          `  <span style="color:#e06c75">workers</span>: <span style="color:#d19a66">8</span>,`,
          `  <span style="color:#e06c75">batchSize</span>: <span style="color:#d19a66">1000</span>,`,
          `});`,
          ``,
          `<span style="color:#c678dd">await</span> <span style="color:#e06c75">pipeline</span>.<span style="color:#61afef">run</span>({`,
          `  <span style="color:#e06c75">transform</span>: (<span style="color:#e06c75">event</span>) =&gt; <span style="color:#e06c75">event</span>.<span style="color:#61afef">normalize</span>(),`,
          `  <span style="color:#e06c75">sink</span>: <span style="color:#98c379">'warehouse.analytics'</span>,`,
          `});`,
        ];

        return [
          patternLabel('L3 · Code Showcase', 'l3'),

          el(`<p style="font:700 40px ${FONT};color:${C.text};text-align:center;letter-spacing:-1px">Pipeline Configuration</p>`, {
            id: 'l3-heading', x: safe.x, y: safe.y, w: safe.w,
          }),

          // Editor window frame
          panel([
            // Title bar with traffic-light dots and filename
            el(`<div style="display:flex;align-items:center;gap:8px;padding-bottom:16px;border-bottom:1px solid ${C.border}">
              <span style="display:inline-block;width:12px;height:12px;background:#ff5f57;border-radius:50%"></span>
              <span style="display:inline-block;width:12px;height:12px;background:#febc2e;border-radius:50%"></span>
              <span style="display:inline-block;width:12px;height:12px;background:#28c840;border-radius:50%"></span>
              <span style="font:400 14px 'Fira Mono',monospace;color:${C.textDim};padding-left:12px">pipeline.config.ts</span>
            </div>`, {
              id: 'l3-titlebar', w: editorW - 64,
            }),

            // Code body
            el(`<pre style="font:400 18px 'Fira Mono',monospace;color:#abb2bf;line-height:1.8;white-space:pre-wrap">${codeLines.join('\n')}</pre>`, {
              id: 'l3-code', w: editorW - 64,
            }),
          ], {
            id: 'l3-editor', x: editorX, y: editorY,
            w: editorW, padding: 32, gap: 20, fill: '#1e1e2e', radius: 16,
            border: `1px solid ${C.border}`,
            shadow: 'lg',
          }),
        ];
      })(),
    },

    // =========================================================================
    // SLIDE 49 — L4: Progress Indicator / Step Wizard
    // Pattern: Horizontal step indicators — completed, active, upcoming
    // Technique: Row of circles connected by lines. Completed steps use
    //   accent fill + checkmark, active step has accent border, upcoming muted.
    // When to use: Onboarding flows, multi-step processes, project phases
    // Key APIs: el, connect, below
    // =========================================================================
    {
      id: 'l4-progress-steps',
      background: C.bg,
      elements: (() => {
        const steps = [
          { label: 'Account', status: 'done' },
          { label: 'Configure', status: 'done' },
          { label: 'Integrate', status: 'active' },
          { label: 'Test', status: 'upcoming' },
          { label: 'Deploy', status: 'upcoming' },
        ];

        const dotSize = 48;
        const totalW = safe.w - 200;
        const stepGap = (totalW - dotSize) / (steps.length - 1);
        const startX = safe.x + 100;
        const dotY = safe.y + safe.h / 2 - 40;

        const elements = [
          patternLabel('L4 · Progress Steps', 'l4'),

          el(`<p style="font:700 48px ${FONT};color:${C.text};text-align:center;letter-spacing:-1px">Setup Wizard</p>`, {
            id: 'l4-title', x: safe.x, y: safe.y + 40, w: safe.w,
          }),

          el(`<p style="font:400 22px ${FONT};color:${C.textMuted};text-align:center">Complete each step to activate your workspace</p>`, {
            id: 'l4-subtitle', y: below('l4-title', { gap: 'sm' }), x: safe.x + 200, w: safe.w - 400,
          }),
        ];

        // Step circles
        steps.forEach((step, i) => {
          const cx = startX + i * stepGap;
          const isDone = step.status === 'done';
          const isActive = step.status === 'active';

          const bg = isDone ? C.accent : 'transparent';
          const borderColor = isDone ? C.accent : isActive ? C.accent : C.textDim;
          const textColor = isDone ? '#0a0a1a' : isActive ? C.accent : C.textDim;
          const content = isDone ? '✓' : `${i + 1}`;

          elements.push(
            el(`<div style="width:${dotSize}px;height:${dotSize}px;background:${bg};border:3px solid ${borderColor};border-radius:50%;display:flex;align-items:center;justify-content:center;font:700 20px ${FONT};color:${textColor}">${content}</div>`, {
              id: `l4-dot${i}`, x: cx, y: dotY, w: dotSize,
            }),

            el(`<p style="font:600 16px ${FONT};color:${isDone || isActive ? C.text : C.textDim};text-align:center">${step.label}</p>`, {
              id: `l4-label${i}`, x: cx - 30, y: below(`l4-dot${i}`, { gap: 'sm' }), w: dotSize + 60,
            }),
          );
        });

        // Connecting lines between dots
        steps.slice(0, -1).forEach((_, i) => {
          elements.push(
            connect(`l4-dot${i}`, `l4-dot${i + 1}`, {
              type: 'straight', fromAnchor: 'cr', toAnchor: 'cl',
              color: steps[i + 1].status === 'done' || steps[i + 1].status === 'active' ? C.accent : C.textDim,
              thickness: 3,
            })
          );
        });

        return elements;
      })(),
    },

    // =========================================================================
    // SLIDE 50 — L5: Comparison Slider (Before / After Split)
    // Pattern: Two images edge-to-edge with a vertical divider line
    // Technique: splitRect with gap:0, vertical divider with circle handle
    // When to use: Before/after, version comparisons, A/B testing results
    // Key APIs: splitRect, figure, el
    // =========================================================================
    {
      id: 'l5-comparison-slider',
      background: C.bg,
      elements: (() => {
        const imgArea = { x: safe.x, y: safe.y + 80, w: safe.w, h: safe.h - 120 };
        const { left, right } = splitRect(imgArea, { ratio: 0.5, gap: 0 });
        const dividerX = left.x + left.w;

        return [
          patternLabel('L5 · Comparison Slider', 'l5'),

          el(`<p style="font:700 40px ${FONT};color:${C.text};text-align:center;letter-spacing:-1px">Before &amp; After</p>`, {
            id: 'l5-title', x: safe.x, y: safe.y, w: safe.w,
          }),

          // Left image
          figure({
            id: 'l5-img-left', src: './landscape-banner.png',
            x: left.x, y: left.y, w: left.w, h: left.h,
            fit: 'cover', containerRadius: 0,
          }),

          // Right image
          figure({
            id: 'l5-img-right', src: './hero-bg.png',
            x: right.x, y: right.y, w: right.w, h: right.h,
            fit: 'cover', containerRadius: 0,
          }),

          // Vertical divider line
          el('', {
            id: 'l5-divider', x: dividerX - 2, y: imgArea.y, w: 4, h: imgArea.h,
            style: { background: '#ffffff' },
          }),

          // Circle handle on divider
          el(`<div style="width:40px;height:40px;background:#ffffff;border-radius:50%;box-shadow:0 2px 12px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;font:700 18px ${FONT};color:#0a0a1a">⇔</div>`, {
            id: 'l5-handle', x: dividerX - 20, y: imgArea.y + imgArea.h / 2 - 20, w: 40,
          }),

          // "Before" label
          el(`<p style="font:600 18px ${FONT};color:${C.text};text-transform:uppercase;letter-spacing:2px">Before</p>`, {
            id: 'l5-label-before', x: left.x + 24, y: imgArea.y + imgArea.h - 48, w: 200,
          }),

          // "After" label
          el(`<p style="font:600 18px ${FONT};color:${C.text};text-transform:uppercase;letter-spacing:2px;text-align:right">After</p>`, {
            id: 'l5-label-after', x: right.x + right.w - 224, y: imgArea.y + imgArea.h - 48, w: 200,
          }),
        ];
      })(),
    },

    // =========================================================================
    // SLIDE 51 — L6: Waterfall / Funnel Chart
    // Pattern: Progressively narrower horizontal bars showing conversion stages
    // Technique: Manually calculate bar widths as percentages of safe zone,
    //   center each bar horizontally, stack vertically with below().
    // When to use: Conversion funnels, drop-off analysis, pipeline stages
    // Key APIs: el, below, explicit positioning
    // =========================================================================
    {
      id: 'l6-funnel',
      background: C.bg,
      elements: (() => {
        const stages = [
          { label: 'Visitors', count: '124,500', pct: 1.00, color: C.accent },
          { label: 'Sign-ups', count: '89,640', pct: 0.72, color: '#38bdf8' },
          { label: 'Activated', count: '59,760', pct: 0.48, color: '#818cf8' },
          { label: 'Subscribed', count: '34,860', pct: 0.28, color: '#c084fc' },
          { label: 'Enterprise', count: '17,430', pct: 0.14, color: '#f472b6' },
        ];

        const maxBarW = safe.w - 200;
        const barH = 60;
        const barGap = 24;
        const startY = safe.y + 120;

        const elements = [
          patternLabel('L6 · Funnel Chart', 'l6'),

          el(`<p style="font:700 48px ${FONT};color:${C.text};text-align:center;letter-spacing:-1px">Conversion Funnel</p>`, {
            id: 'l6-title', x: safe.x, y: safe.y, w: safe.w,
          }),

          el(`<p style="font:400 20px ${FONT};color:${C.textMuted};text-align:center">Q4 2024 · All Channels</p>`, {
            id: 'l6-subtitle', y: below('l6-title', { gap: 12 }), x: safe.x + 200, w: safe.w - 400,
          }),
        ];

        stages.forEach((stage, i) => {
          const barW = maxBarW * stage.pct;
          const barX = safe.x + 100 + (maxBarW - barW) / 2;
          const barY = startY + i * (barH + barGap);

          elements.push(
            // Bar
            el('', {
              id: `l6-bar${i}`, x: barX, y: barY, w: barW, h: barH,
              style: { background: stage.color, borderRadius: '8px' },
            }),

            // Label (left-aligned inside bar)
            el(`<p style="font:600 18px ${FONT};color:#0a0a1a;line-height:${barH}px;padding-left:16px">${stage.label}</p>`, {
              id: `l6-label${i}`, x: barX, y: barY, w: barW, h: barH,
            }),

            // Count (right-aligned outside bar)
            el(`<p style="font:700 18px ${FONT};color:${stage.color};text-align:right">${stage.count}</p>`, {
              id: `l6-count${i}`, x: barX + barW + 16, y: barY, w: 160, h: barH,
              style: { lineHeight: `${barH}px` },
            }),
          );
        });

        return elements;
      })(),
    },

    // =========================================================================
    // SLIDE 52 — L7: Sticky Header Pattern
    // Pattern: Fixed header area with interchangeable content below
    // Technique: Prominent header section (~200px) with logo/title, accent
    //   divider, and a 2-column body section using splitRect().
    // When to use: Multi-slide series with consistent branding, section pages
    // Key APIs: el, splitRect, panel, below
    // =========================================================================
    {
      id: 'l7-sticky-header',
      background: C.bg,
      elements: (() => {
        const headerH = 180;
        const dividerY = safe.y + headerH;
        const bodyY = dividerY + 32;
        const bodyH = safe.y + safe.h - bodyY;
        const bodyRect = { x: safe.x, y: bodyY, w: safe.w, h: bodyH };
        const { left, right } = splitRect(bodyRect, { ratio: 0.5, gap: 40 });

        return [
          patternLabel('L7 · Sticky Header', 'l7'),

          // Header section: icon + title + breadcrumb
          el(`<div style="width:48px;height:48px;background:${C.accent};border-radius:12px;display:flex;align-items:center;justify-content:center;font:700 24px ${FONT};color:#0a0a1a">A</div>`, {
            id: 'l7-logo', x: safe.x, y: safe.y + 20, w: 48,
          }),

          el(`<p style="font:700 44px ${FONT};color:${C.text};letter-spacing:-1px">Platform Overview</p>`, {
            id: 'l7-header-title', x: rightOf('l7-logo', { gap: 20 }), y: safe.y + 14, w: 600,
          }),

          el(`<p style="font:400 16px ${FONT};color:${C.textDim}">Documentation / Architecture / Overview</p>`, {
            id: 'l7-breadcrumb', x: rightOf('l7-logo', { gap: 20 }), y: below('l7-header-title', { gap: 4 }), w: 600,
          }),

          // Accent divider line
          el('', {
            id: 'l7-divider', x: safe.x, y: dividerY, w: safe.w, h: 3,
            style: { background: `linear-gradient(90deg, ${C.accent}, transparent)` },
          }),

          // Left column
          panel([
            el(`<p style="font:700 28px ${FONT};color:${C.text}">Core Services</p>`, {
              id: 'l7-left-title', w: left.w - 64,
            }),
            el(`<p style="font:400 18px ${FONT};color:${C.textMuted};line-height:1.7">The platform core provides authentication, rate limiting, and request routing. All services communicate via gRPC with automatic retries and circuit-breaking.</p>`, {
              id: 'l7-left-body', w: left.w - 64,
            }),
            el(`<p style="font:600 16px ${FONT};color:${C.accent}">→ 99.99% uptime SLA</p>`, {
              id: 'l7-left-stat', w: left.w - 64,
            }),
          ], {
            id: 'l7-left-panel', x: left.x, y: left.y,
            w: left.w, padding: 32, gap: 'sm', fill: C.surface, radius: 16,
            border: `1px solid ${C.border}`,
          }),

          // Right column
          panel([
            el(`<p style="font:700 28px ${FONT};color:${C.text}">Data Layer</p>`, {
              id: 'l7-right-title', w: right.w - 64,
            }),
            el(`<p style="font:400 18px ${FONT};color:${C.textMuted};line-height:1.7">Distributed PostgreSQL with read replicas across three regions. Automatic failover completes in under 5 seconds with zero data loss guaranteed by synchronous replication.</p>`, {
              id: 'l7-right-body', w: right.w - 64,
            }),
            el(`<p style="font:600 16px ${FONT};color:${C.accentGrn}">→ 4.2 ms average query latency</p>`, {
              id: 'l7-right-stat', w: right.w - 64,
            }),
          ], {
            id: 'l7-right-panel', x: right.x, y: right.y,
            w: right.w, padding: 32, gap: 'sm', fill: C.surface, radius: 16,
            border: `1px solid ${C.border}`,
          }),
        ];
      })(),
    },

    // =========================================================================
    // SLIDE 53 — M1: Full-Bleed Image Left
    // Pattern: Image fills the left half of the canvas edge-to-edge
    // Technique: figure at x:0, y:0, w:960, h:1080 with containerRadius:0.
    //   Text content occupies right half within safe margins.
    // When to use: Visual-led narratives, dramatic photo reveals
    // Key APIs: figure, el, below
    // =========================================================================
    {
      id: 'm1-fullbleed-left',
      background: C.bg,
      elements: (() => {
        const textX = 1020;
        const textW = 780;
        return [
          patternLabel('M1 · Full-Bleed Left', 'm1'),

          figure({
            id: 'm1-photo', src: './landscape-banner.png',
            x: 0, y: 0, w: 960, h: 1080,
            fit: 'cover', containerRadius: 0,
          }),

          el(`<p style="font:600 16px ${FONT};color:${C.accent};text-transform:uppercase;letter-spacing:2px">Signal Analysis</p>`, {
            id: 'm1-eyebrow', x: textX, y: 260, w: textW,
          }),

          el(`<p style="font:700 52px ${FONT};color:${C.text};letter-spacing:-1px;line-height:1.12">Helios Array<br>Deep-Field Scan</p>`, {
            id: 'm1-title', x: textX, y: below('m1-eyebrow', { gap: 'sm' }), w: textW,
          }),

          el(`<p style="font:400 22px ${FONT};color:${C.textMuted};line-height:1.7">The Helios phased-array antenna farm captures wideband emissions from magnetar candidates across the galactic plane. Each baseline pair contributes to a synthetic aperture exceeding 400 km.</p>`, {
            id: 'm1-body', x: textX, y: below('m1-title', { gap: 'md' }), w: textW,
          }),

          el(`<p style="font:600 20px ${FONT};color:${C.accentGrn}">↗ 1.4 Tbit/s sustained throughput</p>`, {
            id: 'm1-stat', x: textX, y: below('m1-body', { gap: 28 }), w: textW,
          }),
        ];
      })(),
    },

    // =========================================================================
    // SLIDE 54 — M2: Full-Bleed Image Right
    // Pattern: Image fills the right half of the canvas edge-to-edge
    // Technique: figure at x:960, y:0, w:960, h:1080 with containerRadius:0.
    //   Text content occupies left half within safe margins.
    // When to use: Text-first layouts with dramatic visual payoff on the right
    // Key APIs: figure, el, below
    // =========================================================================
    {
      id: 'm2-fullbleed-right',
      background: C.bg,
      elements: (() => {
        const textX = 120;
        const textW = 780;
        return [
          patternLabel('M2 · Full-Bleed Right', 'm2'),

          figure({
            id: 'm2-photo', src: './hero-bg.png',
            x: 960, y: 0, w: 960, h: 1080,
            fit: 'cover', containerRadius: 0,
          }),

          el(`<p style="font:700 52px ${FONT};color:${C.text};letter-spacing:-1px;line-height:1.12">Quantum Mesh<br>Routing Protocol</p>`, {
            id: 'm2-title', x: textX, y: 200, w: textW,
          }),

          el(`<p style="font:400 22px ${FONT};color:${C.textMuted};line-height:1.7">Entanglement-assisted relay nodes form a self-healing mesh that delivers deterministic latency across interplanetary distances. The protocol stack replaces classical TCP with qubit-stream multiplexing.</p>`, {
            id: 'm2-body', x: textX, y: below('m2-title', { gap: 'md' }), w: textW,
          }),

          el(`<p style="font:600 18px ${FONT};color:${C.textMuted};line-height:2.2">
            <span style="color:${C.accent}">●</span>&nbsp; Sub-nanosecond jitter across 4 AU<br>
            <span style="color:${C.accent}">●</span>&nbsp; 256-qubit error-corrected channels<br>
            <span style="color:${C.accent}">●</span>&nbsp; Zero-trust authentication per hop
          </p>`, {
            id: 'm2-bullets', x: textX, y: below('m2-body', { gap: 28 }), w: textW,
          }),
        ];
      })(),
    },

    // =========================================================================
    // SLIDE 55 — M3: Full-Bleed Image Top
    // Pattern: Image fills the top half of the canvas edge-to-edge
    // Technique: figure at x:0, y:0, w:1920, h:540 with containerRadius:0.
    //   Text content sits in the bottom half within safe margins.
    // When to use: Landscape panoramas above explanatory text
    // Key APIs: figure, el, below
    // =========================================================================
    {
      id: 'm3-fullbleed-top',
      background: C.bg,
      elements: (() => {
        const textW = 1200;
        const textX = (1920 - textW) / 2;
        return [
          patternLabel('M3 · Full-Bleed Top', 'm3'),

          figure({
            id: 'm3-photo', src: './textured-overlay.png',
            x: 0, y: 0, w: 1920, h: 540,
            fit: 'cover', containerRadius: 0,
          }),

          el(`<p style="font:700 48px ${FONT};color:${C.text};letter-spacing:-1px;line-height:1.15;text-align:center">Stratospheric Relay Platform</p>`, {
            id: 'm3-title', x: textX, y: 600, w: textW,
          }),

          el(`<p style="font:400 22px ${FONT};color:${C.textMuted};line-height:1.7;text-align:center">Solar-powered high-altitude platforms orbit at 20 km, bridging satellite constellations and ground terminals. Each node carries a 48-beam phased array capable of sustaining 200 Gbit/s aggregate downlink while autonomously station-keeping against stratospheric winds.</p>`, {
            id: 'm3-body', x: textX, y: below('m3-title', { gap: 'md' }), w: textW,
          }),
        ];
      })(),
    },

    // =========================================================================
    // SLIDE 56 — M4: Full-Bleed Image Bottom
    // Pattern: Image fills the bottom half of the canvas edge-to-edge
    // Technique: figure at x:0, y:540, w:1920, h:540 with containerRadius:0.
    //   Text content sits in the top half within safe margins.
    // When to use: Hero images below a headline, call-to-action layouts
    // Key APIs: figure, el, below
    // =========================================================================
    {
      id: 'm4-fullbleed-bottom',
      background: C.bg,
      elements: (() => {
        const textX = 120;
        const textW = 1680;
        return [
          patternLabel('M4 · Full-Bleed Bottom', 'm4'),

          figure({
            id: 'm4-photo', src: './landscape-banner.png',
            x: 0, y: 540, w: 1920, h: 540,
            fit: 'cover', containerRadius: 0,
          }),

          el(`<p style="font:700 56px ${FONT};color:${C.text};letter-spacing:-1px;line-height:1.15">Orbital Foundry Initiative</p>`, {
            id: 'm4-title', x: textX, y: 90, w: textW,
          }),

          el(`<p style="font:400 24px ${FONT};color:${C.textMuted};line-height:1.6">Manufacturing in microgravity unlocks alloy compositions impossible under 1 g — from amorphous titanium lattices to single-crystal turbine blades grown in vacuum.</p>`, {
            id: 'm4-subtitle', x: textX, y: below('m4-title', { gap: 20 }), w: 1100,
          }),

          el(`<p style="font:600 20px ${FONT};color:${C.accent}">→ &nbsp;Apply for early-access flight allocation</p>`, {
            id: 'm4-cta', x: textX, y: below('m4-subtitle', { gap: 28 }), w: 600,
          }),
        ];
      })(),
    },

    // =========================================================================
    // SECTION DIVIDER — Data Visualization Patterns
    // =========================================================================
    {
      id: 'data-section-divider',
      background: CD.bg,
      elements: [
        el(`<p style="font:900 360px ${FONT};color:rgba(255,255,255,0.04);text-align:center;line-height:1">II</p>`, {
          id: 'dsec-bignumber', x: 0, y: 280, w: 1920, layer: 'bg',
        }),

        el(`<p style="font:700 56px ${FONT};color:${CD.text};text-align:center;letter-spacing:-1px">Data Visualization Patterns</p>`, {
          id: 'dsec-title', x: safe.x, y: centerIn(safe).y, w: safe.w,
        }),

        el('', {
          id: 'dsec-accent-line', x: 960 - 60, y: below('dsec-title', { gap: 28 }), w: 120, h: 4,
          style: { background: CD.accent, borderRadius: '2px' }, layer: 'overlay',
        }),

        el(`<p style="font:400 22px ${FONT};color:${CD.textMuted};text-align:center">Charts, dashboards, and data-driven layout patterns</p>`, {
          id: 'dsec-sub', x: safe.x, y: below('dsec-accent-line', { gap: 28 }), w: safe.w,
        }),
      ],
    },


    // =========================================================================
    // SLIDE 1 — Title
    // =========================================================================
    {
      id: 'data-title',
      background: '#f8fafc',
      elements: [
        el(`<div style="width:100%;height:100%;background:linear-gradient(135deg, ${CL.surface} 0%, ${CL.bg} 100%);border-radius:0"></div>`, {
          id: 'data-title-bg', x: 0, y: 0, w: 1920, h: 1080, layer: 'bg',
        }),
        el(`<p style="font:800 72px ${FONT};color:${CL.text}">SlideKit Data Cookbook</p>`, {
          id: 'data-title-main', x: safe.x, y: 340, w: safe.w,
          style: { textAlign: 'center' },
        }),
        el(`<p style="font:300 28px ${FONT};color:${CL.textMuted}">Visualization patterns for data-driven presentations</p>`, {
          id: 'data-title-sub', x: safe.x, y: 440, w: safe.w,
          style: { textAlign: 'center' },
        }),
        el(`<div style="width:100%;height:100%;background:${CL.accent};border-radius:2px"></div>`, {
          id: 'data-title-rule', x: 860, y: 520, w: 200, h: 4,
        }),
        el(`<p style="font:400 18px ${FONT};color:${CL.textDim}">12 patterns · No charting libraries · Pure positioned elements</p>`, {
          id: 'data-title-note', x: safe.x, y: 560, w: safe.w,
          style: { textAlign: 'center' },
        }),
      ],
    },

    // =========================================================================
    // SLIDE 2 — D1: Quadrant Matrix
    // Strategic 2×2 matrix with items plotted by two axes
    // Use: prioritization, effort-vs-impact, risk assessment
    // APIs: el(), group(), panel()
    // =========================================================================
    {
      id: 'data-d1-quadrant-matrix',
      background: '#f8fafc',
      elements: [
        dataPatternLabel('D1 · Quadrant Matrix', 'd1'),
        el(`<p style="font:700 40px ${FONT};color:${CL.text}">Priority Matrix</p>`, {
          id: 'data-d1-title', x: safe.x, y: safe.y, w: 600,
        }),
        // Axes
        el(`<div style="width:100%;height:100%;background:${CL.border}"></div>`, {
          id: 'data-d1-axis-y', x: 900, y: 180, w: 2, h: 720,
        }),
        el(`<div style="width:100%;height:100%;background:${CL.border}"></div>`, {
          id: 'data-d1-axis-x', x: 260, y: 540, w: 1280, h: 2,
        }),
        // Axis labels — at ends of axes only
        el(`<p style="font:600 13px ${FONT};color:${CL.textDim};letter-spacing:1px">← LOW EFFORT</p>`, {
          id: 'data-d1-ax-lo', x: 280, y: 545, w: 200,
        }),
        el(`<p style="font:600 13px ${FONT};color:${CL.textDim};letter-spacing:1px">HIGH EFFORT →</p>`, {
          id: 'data-d1-ax-hi', x: 1340, y: 545, w: 200, style: { textAlign: 'right' },
        }),
        el(`<p style="font:600 13px ${FONT};color:${CL.textDim};letter-spacing:1px">↑ HIGH IMPACT</p>`, {
          id: 'data-d1-ay-hi', x: 830, y: 160, w: 140, style: { textAlign: 'center' },
        }),
        el(`<p style="font:600 13px ${FONT};color:${CL.textDim};letter-spacing:1px">LOW IMPACT ↓</p>`, {
          id: 'data-d1-ay-lo', x: 830, y: 905, w: 140, style: { textAlign: 'center' },
        }),
        // Quadrant labels — subtle watermarks
        el(`<p style="font:800 16px ${FONT};color:${CL.accentGrn};opacity:0.35;text-transform:uppercase;letter-spacing:2px">Quick Wins</p>`, {
          id: 'data-d1-ql-tl', x: 350, y: 200, w: 300, style: { textAlign: 'center' },
        }),
        el(`<p style="font:800 16px ${FONT};color:${CL.accent};opacity:0.35;text-transform:uppercase;letter-spacing:2px">Strategic Bets</p>`, {
          id: 'data-d1-ql-tr', x: 1080, y: 200, w: 300, style: { textAlign: 'center' },
        }),
        el(`<p style="font:800 16px ${FONT};color:${CL.textDim};opacity:0.5;text-transform:uppercase;letter-spacing:2px">Low Priority</p>`, {
          id: 'data-d1-ql-bl', x: 350, y: 840, w: 300, style: { textAlign: 'center' },
        }),
        el(`<p style="font:800 16px ${FONT};color:${CL.accentRed};opacity:0.35;text-transform:uppercase;letter-spacing:2px">Reconsider</p>`, {
          id: 'data-d1-ql-br', x: 1080, y: 840, w: 300, style: { textAlign: 'center' },
        }),
        // Plotted items — Quick Wins quadrant (top-left: low effort, high impact)
        panel([
          el(`<p style="font:600 14px ${FONT};color:${CL.text}">Dark Mode</p>`, { id: 'data-d1-i1-t', x: 0, y: 0, w: 116 }),
        ], { id: 'data-d1-i1', x: 380, y: 300, w: 140, padding: 12, fill: CL.accentGrn + '22', radius: 8, border: `1px solid ${CL.accentGrn}44` }),
        panel([
          el(`<p style="font:600 14px ${FONT};color:${CL.text}">Cache Layer</p>`, { id: 'data-d1-i2-t', x: 0, y: 0, w: 116 }),
        ], { id: 'data-d1-i2', x: 520, y: 360, w: 140, padding: 12, fill: CL.accentGrn + '22', radius: 8, border: `1px solid ${CL.accentGrn}44` }),
        // Strategic Bets (top-right: high effort, high impact)
        panel([
          el(`<p style="font:600 14px ${FONT};color:${CL.text}">GraphQL Migration</p>`, { id: 'data-d1-i3-t', x: 0, y: 0, w: 156 }),
        ], { id: 'data-d1-i3', x: 1050, y: 280, w: 180, padding: 12, fill: CL.accent + '22', radius: 8, border: `1px solid ${CL.accent}44` }),
        panel([
          el(`<p style="font:600 14px ${FONT};color:${CL.text}">Auth Revamp</p>`, { id: 'data-d1-i4-t', x: 0, y: 0, w: 136 }),
        ], { id: 'data-d1-i4', x: 1280, y: 350, w: 160, padding: 12, fill: CL.accent + '22', radius: 8, border: `1px solid ${CL.accent}44` }),
        // Low Priority (bottom-left)
        panel([
          el(`<p style="font:600 14px ${FONT};color:${CL.textMuted}">Logo Refresh</p>`, { id: 'data-d1-i5-t', x: 0, y: 0, w: 126 }),
        ], { id: 'data-d1-i5', x: 440, y: 680, w: 150, padding: 12, fill: CL.surface, radius: 8, border: `1px solid ${CL.border}` }),
        // Reconsider (bottom-right)
        panel([
          el(`<p style="font:600 14px ${FONT};color:${CL.textMuted}">Rewrite in Rust</p>`, { id: 'data-d1-i6-t', x: 0, y: 0, w: 146 }),
        ], { id: 'data-d1-i6', x: 1150, y: 620, w: 170, padding: 12, fill: CL.accentRed + '11', radius: 8, border: `1px solid ${CL.accentRed}33` }),
        panel([
          el(`<p style="font:600 14px ${FONT};color:${CL.textMuted}">Custom CMS</p>`, { id: 'data-d1-i7-t', x: 0, y: 0, w: 126 }),
        ], { id: 'data-d1-i7', x: 1320, y: 720, w: 150, padding: 12, fill: CL.accentRed + '11', radius: 8, border: `1px solid ${CL.accentRed}33` }),
      ],
    },

    // =========================================================================
    // SLIDE 3 — D2: Leaderboard
    // Ranked list with medal badges, inline bars, deltas
    // Use: rankings, top-N lists, competitive metrics
    // APIs: el(), panel(), splitRect()
    // =========================================================================
    {
      id: 'data-d2-leaderboard',
      background: '#f8fafc',
      elements: (() => {
        const items = [
          { name: 'Sarah Chen', score: 94, delta: +12, prev: 82 },
          { name: 'Marcus Rivera', score: 87, delta: +5, prev: 82 },
          { name: 'Aisha Patel', score: 81, delta: -3, prev: 84 },
          { name: 'James Okonkwo', score: 76, delta: +8, prev: 68 },
          { name: 'Lin Zhang', score: 68, delta: -7, prev: 75 },
        ];
        const medals = ['#FFD700', '#C0C0C0', '#CD7F32'];
        const rowH = 72;
        const rowGap = 16;
        const barMaxW = 500;
        const startY = 220;
        const rowX = safe.x;
        const rowW = safe.w;

        const els = [
          dataPatternLabel('D2 · Leaderboard', 'd2'),
          el(`<p style="font:700 40px ${FONT};color:${CL.text}">Q4 Pipeline Rankings</p>`, {
            id: 'data-d2-title', x: safe.x, y: safe.y, w: 600,
          }),
        ];

        items.forEach((item, i) => {
          const y = startY + i * (rowH + rowGap);
          const medalColor = i < 3 ? medals[i] : CL.textDim;
          const barW = (item.score / 100) * barMaxW;
          const deltaColor = item.delta >= 0 ? CL.accentGrn : CL.accentRed;
          const deltaArrow = item.delta >= 0 ? '↑' : '↓';

          // Row background
          els.push(
            el(`<div style="width:100%;height:100%;background:${CL.surface};border-radius:12px;border:1px solid ${CL.border}"></div>`, {
              id: `data-d2-rowbg-${i}`, x: rowX, y, w: rowW, h: rowH,
            }),
          );
          // Badge circle
          els.push(
            el(`<div style="width:100%;height:100%;background:${medalColor};border-radius:50%"></div>`, {
              id: `data-d2-badge-${i}`, x: rowX + 16, y: y + 12, w: 48, h: 48,
            }),
          );
          // Rank number
          els.push(
            el(`<p style="font:700 20px ${FONT};color:${CL.text}">${i + 1}</p>`, {
              id: `data-d2-rank-${i}`, x: rowX + 16, y: y + 22, w: 48, style: { textAlign: 'center' },
            }),
          );
          // Name
          els.push(
            el(`<p style="font:600 22px ${FONT};color:${CL.text}">${item.name}</p>`, {
              id: `data-d2-name-${i}`, x: rowX + 80, y: y + 22, w: 260,
            }),
          );
          // Bar background
          els.push(
            el(`<div style="width:100%;height:100%;background:${CL.border};border-radius:4px"></div>`, {
              id: `data-d2-barbg-${i}`, x: rowX + 380, y: y + 24, w: barMaxW, h: 24,
            }),
          );
          // Bar fill
          els.push(
            el(`<div style="width:100%;height:100%;background:linear-gradient(90deg, ${CL.accent}88, ${CL.accent});border-radius:4px"></div>`, {
              id: `data-d2-bar-${i}`, x: rowX + 380, y: y + 24, w: barW, h: 24,
            }),
          );
          // Score
          els.push(
            el(`<p style="font:700 22px ${FONT};color:${CL.text}">${item.score}</p>`, {
              id: `data-d2-score-${i}`, x: rowX + 920, y: y + 22, w: 60, style: { textAlign: 'right' },
            }),
          );
          // Delta
          els.push(
            el(`<p style="font:600 18px ${FONT};color:${deltaColor}">${deltaArrow} ${Math.abs(item.delta)}%</p>`, {
              id: `data-d2-delta-${i}`, x: rowX + 1000, y: y + 24, w: 100,
            }),
          );
        });

        return els;
      })(),
    },

    // =========================================================================
    // SLIDE 4 — D3: Waffle Grid
    // 10×10 grid of small squares showing proportional data
    // Use: percentage visualization, survey results, completion tracking
    // APIs: el(), repeat()
    // =========================================================================
    {
      id: 'data-d3-waffle-grid',
      background: '#f8fafc',
      elements: (() => {
        const pct = 67;
        const cellSize = 52;
        const gap = 6;
        const cols = 10;
        const gridW = cols * (cellSize + gap) - gap;
        const gridX = Math.round((1920 - gridW) / 2);
        const gridY = 280;

        const els = [
          dataPatternLabel('D3 · Waffle Grid', 'd3'),
          el(`<p style="font:700 40px ${FONT};color:${CL.text}">Market Penetration</p>`, {
            id: 'data-d3-title', x: safe.x, y: safe.y, w: 600,
          }),
          el(`<p style="font:800 96px ${FONT};color:${CL.accent}">${pct}%</p>`, {
            id: 'data-d3-bignum', x: safe.x, y: safe.y, w: safe.w, style: { textAlign: 'center' },
          }),
        ];

        for (let i = 0; i < 100; i++) {
          const row = Math.floor(i / cols);
          const col = i % cols;
          const filled = i < pct;
          const color = filled ? CL.accent : CL.surface;
          const opacity = filled ? '' : '';
          els.push(
            el(`<div style="width:100%;height:100%;background:${color};border-radius:6px;border:1px solid ${filled ? CL.accent + '44' : CL.border}"></div>`, {
              id: `data-d3-cell-${i}`, x: gridX + col * (cellSize + gap), y: gridY + row * (cellSize + gap), w: cellSize, h: cellSize,
            }),
          );
        }

        // Legend
        els.push(
          el(`<div style="width:100%;height:100%;background:${CL.accent};border-radius:4px"></div>`, {
            id: 'data-d3-leg1-box', x: 720, y: 900, w: 20, h: 20,
          }),
          el(`<p style="font:400 16px ${FONT};color:${CL.textMuted}">Converted</p>`, {
            id: 'data-d3-leg1-txt', x: 750, y: 900, w: 120,
          }),
          el(`<div style="width:100%;height:100%;background:${CL.surface};border-radius:4px;border:1px solid ${CL.border}"></div>`, {
            id: 'data-d3-leg2-box', x: 900, y: 900, w: 20, h: 20,
          }),
          el(`<p style="font:400 16px ${FONT};color:${CL.textMuted}">Remaining</p>`, {
            id: 'data-d3-leg2-txt', x: 930, y: 900, w: 120,
          }),
        );

        return els;
      })(),
    },

    // =========================================================================
    // SLIDE 5 — D4: Diverging Bar Chart
    // Horizontal bars extending left/right from a center baseline
    // Use: sentiment analysis, net promoter, before/after comparisons
    // APIs: el(), panel()
    // =========================================================================
    {
      id: 'data-d4-diverging-bar',
      background: '#f8fafc',
      elements: (() => {
        const categories = [
          { name: 'Onboarding', neg: -18, pos: 72 },
          { name: 'Documentation', neg: -35, pos: 48 },
          { name: 'API Stability', neg: -8, pos: 89 },
          { name: 'Support Response', neg: -42, pos: 38 },
          { name: 'Pricing', neg: -55, pos: 25 },
          { name: 'Performance', neg: -12, pos: 82 },
        ];
        const centerX = 960;
        const barMaxW = 400;
        const barH = 40;
        const rowGap = 60;
        const startY = 220;

        const els = [
          dataPatternLabel('D4 · Diverging Bar', 'd4'),
          el(`<p style="font:700 40px ${FONT};color:${CL.text}">Customer Sentiment Analysis</p>`, {
            id: 'data-d4-title', x: safe.x, y: safe.y, w: 800,
          }),
          // Center baseline
          el(`<div style="width:100%;height:100%;background:${CL.textDim}"></div>`, {
            id: 'data-d4-baseline', x: centerX, y: 190, w: 2, h: 740,
          }),
          // Column headers
          el(`<p style="font:600 14px ${FONT};color:${CL.accentRed};text-transform:uppercase;letter-spacing:1px">Negative</p>`, {
            id: 'data-d4-hdr-neg', x: centerX - 280, y: 195, w: 200, style: { textAlign: 'center' },
          }),
          el(`<p style="font:600 14px ${FONT};color:${CL.accentGrn};text-transform:uppercase;letter-spacing:1px">Positive</p>`, {
            id: 'data-d4-hdr-pos', x: centerX + 80, y: 195, w: 200, style: { textAlign: 'center' },
          }),
        ];

        categories.forEach((cat, i) => {
          const y = startY + i * (barH + rowGap);
          const negW = Math.round((Math.abs(cat.neg) / 100) * barMaxW);
          const posW = Math.round((cat.pos / 100) * barMaxW);

          els.push(
            // Category label
            el(`<p style="font:600 18px ${FONT};color:${CL.text}">${cat.name}</p>`, {
              id: `data-d4-cat-${i}`, x: 140, y: y + 8, w: 220, style: { textAlign: 'right' },
            }),
            // Negative bar (extends left from center)
            el(`<div style="width:100%;height:100%;background:${CL.accentRed};border-radius:4px 0 0 4px"></div>`, {
              id: `data-d4-neg-${i}`, x: centerX - negW, y, w: negW, h: barH,
            }),
            // Negative label
            el(`<p style="font:600 14px ${FONT};color:${CL.accentRed}">${cat.neg}%</p>`, {
              id: `data-d4-negv-${i}`, x: centerX - negW - 60, y: y + 10, w: 50, style: { textAlign: 'right' },
            }),
            // Positive bar (extends right from center)
            el(`<div style="width:100%;height:100%;background:${CL.accentGrn};border-radius:0 4px 4px 0"></div>`, {
              id: `data-d4-pos-${i}`, x: centerX + 2, y, w: posW, h: barH,
            }),
            // Positive label
            el(`<p style="font:600 14px ${FONT};color:${CL.accentGrn}">+${cat.pos}%</p>`, {
              id: `data-d4-posv-${i}`, x: centerX + posW + 12, y: y + 10, w: 60,
            }),
          );
        });

        return els;
      })(),
    },

    // =========================================================================
    // SLIDE 6 — D5: Waterfall Chart
    // Staggered columns showing incremental build-up to a final sum
    // Use: revenue bridges, budget breakdowns, P&L analysis
    // APIs: el(), group()
    // =========================================================================
    {
      id: 'data-d5-waterfall',
      background: '#f8fafc',
      elements: (() => {
        const steps = [
          { label: 'Q3 Revenue', value: 4200, delta: 0, type: 'total' },
          { label: 'New Accounts', value: 1800, delta: 1800, type: 'add' },
          { label: 'Upsells', value: 900, delta: 900, type: 'add' },
          { label: 'Price Increase', value: 300, delta: 300, type: 'add' },
          { label: 'Churn', value: -700, delta: -700, type: 'sub' },
          { label: 'Downgrades', value: -400, delta: -400, type: 'sub' },
          { label: 'Q4 Revenue', value: 6100, delta: 0, type: 'total' },
        ];

        const chartX = 200;
        const chartW = 1520;
        const colW = 120;
        const colGap = Math.round((chartW - steps.length * colW) / (steps.length - 1));
        const chartBottom = 800;
        const maxVal = 7200;
        const pxPerUnit = 500 / maxVal;

        let runningTotal = 0;
        const els = [
          dataPatternLabel('D5 · Waterfall Chart', 'd5'),
          el(`<p style="font:700 40px ${FONT};color:${CL.text}">Revenue Bridge: Q3 → Q4</p>`, {
            id: 'data-d5-title', x: safe.x, y: safe.y, w: 800,
          }),
          // Baseline
          el(`<div style="width:100%;height:100%;background:${CL.border}"></div>`, {
            id: 'data-d5-base', x: chartX - 20, y: chartBottom, w: chartW + 40, h: 1,
          }),
        ];

        steps.forEach((step, i) => {
          const x = chartX + i * (colW + colGap);

          if (step.type === 'total') {
            const colH = Math.round(step.value * pxPerUnit);
            const colY = chartBottom - colH;
            const color = i === 0 ? CL.textDim : CL.accent;
            runningTotal = step.value;

            els.push(
              el(`<div style="width:100%;height:100%;background:${color};border-radius:4px 4px 0 0"></div>`, {
                id: `data-d5-col-${i}`, x, y: colY, w: colW, h: colH,
              }),
              el(`<p style="font:700 16px ${FONT};color:${CL.text}">$${(step.value / 1000).toFixed(1)}M</p>`, {
                id: `data-d5-val-${i}`, x, y: colY - 30, w: colW, style: { textAlign: 'center' },
              }),
              el(`<p style="font:600 13px ${FONT};color:${CL.textMuted}">${step.label}</p>`, {
                id: `data-d5-lbl-${i}`, x: x - 10, y: chartBottom + 12, w: colW + 20, style: { textAlign: 'center' },
              }),
            );
          } else {
            const isAdd = step.type === 'add';
            const absDelta = Math.abs(step.delta);
            const colH = Math.round(absDelta * pxPerUnit);
            const prevTop = chartBottom - Math.round(runningTotal * pxPerUnit);
            const colY = isAdd ? prevTop - colH : prevTop;
            const color = isAdd ? CL.accentGrn : CL.accentRed;

            runningTotal += step.delta;

            els.push(
              el(`<div style="width:100%;height:100%;background:${color}cc;border-radius:4px"></div>`, {
                id: `data-d5-col-${i}`, x, y: colY, w: colW, h: colH,
              }),
              el(`<p style="font:700 14px ${FONT};color:${color}">${isAdd ? '+' : '-'}$${(absDelta / 1000).toFixed(1)}M</p>`, {
                id: `data-d5-val-${i}`, x, y: colY - 25, w: colW, style: { textAlign: 'center' },
              }),
              el(`<p style="font:600 12px ${FONT};color:${CL.textMuted}">${step.label}</p>`, {
                id: `data-d5-lbl-${i}`, x: x - 10, y: chartBottom + 12, w: colW + 20, style: { textAlign: 'center' },
              }),
              // Connector line to next column
              ...(i < steps.length - 1 ? [
                el(`<div style="width:100%;height:100%;background:${CL.textDim};border-top:1px dashed ${CL.textDim}"></div>`, {
                  id: `data-d5-conn-${i}`, x: x + colW, y: chartBottom - Math.round(runningTotal * pxPerUnit), w: colGap, h: 1,
                }),
              ] : []),
            );
          }
        });

        return els;
      })(),
    },

    // =========================================================================
    // SLIDE 7 — D6: Heatmap Grid
    // Matrix of colored cells showing intensity values
    // Use: activity calendars, deploy frequency, resource utilization
    // APIs: el(), repeat()
    // =========================================================================
    {
      id: 'data-d6-heatmap',
      background: '#f8fafc',
      elements: (() => {
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const hours = ['6 AM', '9 AM', '12 PM', '3 PM', '6 PM', '9 PM', '12 AM', '3 AM'];
        // Activity data (0-10 scale)
        const data = [
          [2, 7, 9, 8, 6, 3, 1, 0],
          [3, 8, 10, 9, 7, 2, 1, 0],
          [1, 6, 8, 10, 8, 4, 2, 1],
          [2, 7, 9, 7, 5, 3, 1, 0],
          [4, 9, 10, 8, 4, 2, 0, 0],
          [0, 1, 3, 2, 1, 1, 0, 0],
          [0, 0, 2, 1, 1, 0, 0, 0],
        ];
        const cellW = 120;
        const cellH = 72;
        const gap = 4;
        const gridX = 340;
        const gridY = 240;

        function intensityColor(val) {
          if (val === 0) return CL.surface;
          const hex = Math.round((val / 10) * 255).toString(16).padStart(2, '0');
          return CL.accent.slice(0, -2) + hex; // replace last 2 chars with opacity-like brightness
        }

        const els = [
          dataPatternLabel('D6 · Heatmap Grid', 'd6'),
          el(`<p style="font:700 40px ${FONT};color:${CL.text}">Deploy Frequency by Day & Hour</p>`, {
            id: 'data-d6-title', x: safe.x, y: safe.y, w: 800,
          }),
        ];

        // Column headers
        hours.forEach((h, j) => {
          els.push(
            el(`<p style="font:600 14px ${FONT};color:${CL.textDim}">${h}</p>`, {
              id: `data-d6-hdr-${j}`, x: gridX + j * (cellW + gap), y: gridY - 30, w: cellW, style: { textAlign: 'center' },
            }),
          );
        });

        // Rows
        days.forEach((day, i) => {
          els.push(
            el(`<p style="font:600 16px ${FONT};color:${CL.textMuted}">${day}</p>`, {
              id: `data-d6-day-${i}`, x: gridX - 80, y: gridY + i * (cellH + gap) + 22, w: 70, style: { textAlign: 'right' },
            }),
          );
          hours.forEach((_, j) => {
            const val = data[i][j];
            // Interpolate from light (#e0f7fa) to dark (#0e7490) based on value
            const t = val / 10;
            const r = Math.round(224 + (14 - 224) * t);
            const g = Math.round(247 + (116 - 247) * t);
            const b = Math.round(250 + (144 - 250) * t);
            const bgColor = val === 0 ? CL.surface : `rgb(${r},${g},${b})`;
            const textColor = val >= 7 ? '#fff' : CL.text;
            els.push(
              el(`<div style="width:100%;height:100%;background:${bgColor};border-radius:6px;border:1px solid ${CL.border}"></div>`, {
                id: `data-d6-cell-${i}-${j}`, x: gridX + j * (cellW + gap), y: gridY + i * (cellH + gap), w: cellW, h: cellH,
              }),
              ...(val > 0 ? [
                el(`<p style="font:700 16px ${FONT};color:${textColor}">${val}</p>`, {
                  id: `data-d6-val-${i}-${j}`, x: gridX + j * (cellW + gap), y: gridY + i * (cellH + gap) + 24, w: cellW, style: { textAlign: 'center' },
                }),
              ] : []),
            );
          });
        });

        // Legend gradient
        els.push(
          el(`<p style="font:600 14px ${FONT};color:${CL.textDim}">Low</p>`, {
            id: 'data-d6-leg-lo', x: gridX + 300, y: 870, w: 60, style: { textAlign: 'right' },
          }),
          el(`<div style="width:100%;height:100%;background:linear-gradient(90deg, #e0f7fa, #0e7490);border-radius:4px"></div>`, {
            id: 'data-d6-leg-bar', x: gridX + 370, y: 870, w: 200, h: 20,
          }),
          el(`<p style="font:600 14px ${FONT};color:${CL.textDim}">High</p>`, {
            id: 'data-d6-leg-hi', x: gridX + 580, y: 870, w: 60,
          }),
        );

        return els;
      })(),
    },

    // =========================================================================
    // SLIDE 8 — D7: Change Card Grid
    // Metric cards with current value, delta, and previous value
    // Use: dashboards, KPI snapshots, performance monitoring
    // APIs: panel(), el(), splitRect()
    // =========================================================================
    {
      id: 'data-d7-change-cards',
      background: '#f8fafc',
      elements: (() => {
        const metrics = [
          { name: 'Requests/sec', value: '14.2K', delta: '+12.4%', prev: '12.6K', good: true },
          { name: 'P99 Latency', value: '48ms', delta: '-8.3%', prev: '52ms', good: true },
          { name: 'Error Rate', value: '0.12%', delta: '+0.04%', prev: '0.08%', good: false },
          { name: 'Cache Hit Rate', value: '94.7%', delta: '+2.1%', prev: '92.6%', good: true },
          { name: 'Throughput', value: '892 MB/s', delta: '+15.7%', prev: '771 MB/s', good: true },
          { name: 'Availability', value: '99.97%', delta: '-0.01%', prev: '99.98%', good: false },
        ];

        const cols = 3;
        const cardW = 480;
        const cardH = 200;
        const gapX = 40;
        const gapY = 40;
        const startX = safe.x + Math.round((safe.w - cols * cardW - (cols - 1) * gapX) / 2);
        const startY = 220;

        const els = [
          dataPatternLabel('D7 · Change Cards', 'd7'),
          el(`<p style="font:700 40px ${FONT};color:${CL.text}">Performance Dashboard</p>`, {
            id: 'data-d7-title', x: safe.x, y: safe.y, w: 600,
          }),
          el(`<p style="font:400 20px ${FONT};color:${CL.textMuted}">Week over Week</p>`, {
            id: 'data-d7-sub', x: safe.x, y: 140, w: 300,
          }),
        ];

        metrics.forEach((m, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const x = startX + col * (cardW + gapX);
          const y = startY + row * (cardH + gapY);
          const deltaColor = m.good ? CL.accentGrn : CL.accentRed;
          const arrow = m.good ? '↑' : '↓';

          els.push(
            panel([
              el(`<p style="font:600 14px ${FONT};color:${CL.textDim};text-transform:uppercase;letter-spacing:1px">${m.name}</p>`, {
                id: `data-d7-name-${i}`, x: 0, y: 0, w: cardW - 60,
              }),
              el(`<p style="font:800 48px ${FONT};color:${CL.text}">${m.value}</p>`, {
                id: `data-d7-val-${i}`, x: 0, y: 36, w: cardW - 60,
              }),
              el(`<p style="font:600 22px ${FONT};color:${deltaColor}">${arrow} ${m.delta}</p>`, {
                id: `data-d7-delta-${i}`, x: 0, y: 100, w: 200,
              }),
              el(`<p style="font:400 15px ${FONT};color:${CL.textDim}">was ${m.prev}</p>`, {
                id: `data-d7-prev-${i}`, x: 0, y: 134, w: 200,
              }),
            ], { id: `data-d7-card-${i}`, x, y, w: cardW, padding: 28, fill: CL.surface, radius: 16, border: `1px solid ${CL.border}` }),
          );
        });

        return els;
      })(),
    },

    // =========================================================================
    // SLIDE 9 — D8: Gauge / Progress Meters
    // Horizontal progress-bar style gauges with tick marks and zones
    // Use: system health, capacity planning, SLA tracking
    // APIs: el(), panel(), group()
    // =========================================================================
    {
      id: 'data-d8-gauge',
      background: '#f8fafc',
      elements: (() => {
        const gauges = [
          { label: 'CPU Utilization', value: 72, unit: '%', zones: [[0, 50, CL.accentGrn], [50, 80, CL.accentYlw], [80, 100, CL.accentRed]] },
          { label: 'Memory Usage', value: 45, unit: '%', zones: [[0, 60, CL.accentGrn], [60, 85, CL.accentYlw], [85, 100, CL.accentRed]] },
          { label: 'Network I/O', value: 91, unit: '%', zones: [[0, 40, CL.accentGrn], [40, 70, CL.accentYlw], [70, 100, CL.accentRed]] },
        ];

        const barW = 1200;
        const barH = 36;
        const barX = safe.x + 200;
        const startY = 260;
        const rowGap = 200;

        const els = [
          dataPatternLabel('D8 · Gauge Meter', 'd8'),
          el(`<p style="font:700 40px ${FONT};color:${CL.text}">System Health Score</p>`, {
            id: 'data-d8-title', x: safe.x, y: safe.y, w: 600,
          }),
        ];

        gauges.forEach((g, i) => {
          const y = startY + i * rowGap;
          const fillW = Math.round((g.value / 100) * barW);

          // Determine color from zones
          let fillColor = CL.accent;
          for (const [lo, hi, color] of g.zones) {
            if (g.value >= lo && g.value <= hi) { fillColor = color; break; }
          }

          els.push(
            // Label
            el(`<p style="font:600 20px ${FONT};color:${CL.textMuted}">${g.label}</p>`, {
              id: `data-d8-lbl-${i}`, x: safe.x, y: y + 4, w: 190,
            }),
            // Track background
            el(`<div style="width:100%;height:100%;background:${CL.surface};border-radius:6px;border:1px solid ${CL.border}"></div>`, {
              id: `data-d8-track-${i}`, x: barX, y, w: barW, h: barH,
            }),
            // Zone markers (colored segments underneath)
            ...g.zones.map(([lo, hi, color], z) => {
              const zx = barX + Math.round((lo / 100) * barW);
              const zw = Math.round(((hi - lo) / 100) * barW);
              return el(`<div style="width:100%;height:100%;background:${color}22;border-radius:${z === 0 ? '6px 0 0 6px' : z === g.zones.length - 1 ? '0 6px 6px 0' : '0'}"></div>`, {
                id: `data-d8-zone-${i}-${z}`, x: zx, y, w: zw, h: barH,
              });
            }),
            // Fill bar
            el(`<div style="width:100%;height:100%;background:${fillColor};border-radius:6px 0 0 6px"></div>`, {
              id: `data-d8-fill-${i}`, x: barX, y: y + 4, w: fillW, h: barH - 8,
            }),
            // Value
            el(`<p style="font:800 36px ${FONT};color:${fillColor}">${g.value}${g.unit}</p>`, {
              id: `data-d8-val-${i}`, x: barX + barW + 24, y: y - 4, w: 120,
            }),
            // Tick marks at 25, 50, 75
            ...[25, 50, 75].map(tick => {
              const tx = barX + Math.round((tick / 100) * barW);
              return el(`<div style="width:100%;height:100%;background:${CL.textDim}"></div>`, {
                id: `data-d8-tick-${i}-${tick}`, x: tx, y: y + barH + 4, w: 1, h: 12,
              });
            }),
            // Tick labels
            ...[0, 25, 50, 75, 100].map(tick => {
              const tx = barX + Math.round((tick / 100) * barW) - 15;
              return el(`<p style="font:400 12px ${FONT};color:${CL.textDim}">${tick}</p>`, {
                id: `data-d8-tlbl-${i}-${tick}`, x: tx, y: y + barH + 18, w: 30, style: { textAlign: 'center' },
              });
            }),
          );
        });

        return els;
      })(),
    },

    // =========================================================================
    // SLIDE 10 — D9: Slope Chart
    // Lines connecting two time points showing rank/value changes
    // Use: market share shifts, before/after rankings, trend comparison
    // APIs: el(), connect()
    // =========================================================================
    {
      id: 'data-d9-slope-chart',
      background: '#f8fafc',
      elements: (() => {
        const items = [
          { name: 'Vortex Labs', v1: 28, v2: 22, color: CL.accentRed },
          { name: 'NovaTech', v1: 24, v2: 31, color: CL.accentGrn },
          { name: 'Apex Systems', v1: 22, v2: 20, color: CL.accentYlw },
          { name: 'Meridian Corp', v1: 15, v2: 18, color: CL.accentPrp },
          { name: 'Stratos Inc', v1: 11, v2: 9, color: CL.accentOrg },
        ];

        const leftX = 480;
        const rightX = 1320;
        const topY = 240;
        const rangeH = 600;
        const maxVal = 35;

        function valToY(v) { return topY + rangeH - Math.round((v / maxVal) * rangeH); }

        const els = [
          dataPatternLabel('D9 · Slope Chart', 'd9'),
          el(`<p style="font:700 40px ${FONT};color:${CL.text}">Market Share Shift</p>`, {
            id: 'data-d9-title', x: safe.x, y: safe.y, w: 600,
          }),
          // Year labels
          el(`<p style="font:700 24px ${FONT};color:${CL.textMuted}">2024</p>`, {
            id: 'data-d9-yr1', x: leftX - 20, y: 190, w: 100, style: { textAlign: 'center' },
          }),
          el(`<p style="font:700 24px ${FONT};color:${CL.textMuted}">2025</p>`, {
            id: 'data-d9-yr2', x: rightX - 20, y: 190, w: 100, style: { textAlign: 'center' },
          }),
          // Vertical guides
          el(`<div style="width:100%;height:100%;background:${CL.border}"></div>`, {
            id: 'data-d9-guide1', x: leftX + 20, y: topY, w: 1, h: rangeH,
          }),
          el(`<div style="width:100%;height:100%;background:${CL.border}"></div>`, {
            id: 'data-d9-guide2', x: rightX + 20, y: topY, w: 1, h: rangeH,
          }),
        ];

        items.forEach((item, i) => {
          const y1 = valToY(item.v1);
          const y2 = valToY(item.v2);

          // Left dot and label
          els.push(
            el(`<div style="width:100%;height:100%;background:${item.color};border-radius:50%"></div>`, {
              id: `data-d9-dotL-${i}`, x: leftX + 12, y: y1 - 8, w: 16, h: 16,
            }),
            el(`<p style="font:600 16px ${FONT};color:${CL.text}">${item.name}: ${item.v1}%</p>`, {
              id: `data-d9-lblL-${i}`, x: leftX - 260, y: y1 - 10, w: 260, style: { textAlign: 'right' },
            }),
            // Right dot and label
            el(`<div style="width:100%;height:100%;background:${item.color};border-radius:50%"></div>`, {
              id: `data-d9-dotR-${i}`, x: rightX + 12, y: y2 - 8, w: 16, h: 16,
            }),
            el(`<p style="font:600 16px ${FONT};color:${CL.text}">${item.name}: ${item.v2}%</p>`, {
              id: `data-d9-lblR-${i}`, x: rightX + 50, y: y2 - 10, w: 260,
            }),
          );

          // Connect line
          els.push(
            connect(`data-d9-dotL-${i}`, `data-d9-dotR-${i}`, {
              color: item.color + 'aa',
              thickness: 3,
              arrow: false,
            }),
          );
        });

        return els;
      })(),
    },

    // =========================================================================
    // SLIDE 11 — D10: Stacked Proportional Bar
    // Wide bar subdivided into colored segments showing composition
    // Use: cost breakdowns, resource allocation, portfolio composition
    // APIs: el()
    // =========================================================================
    {
      id: 'data-d10-stacked-bar',
      background: '#f8fafc',
      elements: (() => {
        const segments = [
          { label: 'Compute', pct: 45, color: CL.accent },
          { label: 'Storage', pct: 22, color: CL.accentGrn },
          { label: 'Network', pct: 15, color: CL.accentYlw },
          { label: 'Database', pct: 12, color: CL.accentPrp },
          { label: 'Other', pct: 6, color: CL.textDim },
        ];
        const segments2 = [
          { label: 'Compute', pct: 52, color: CL.accent },
          { label: 'Storage', pct: 18, color: CL.accentGrn },
          { label: 'Network', pct: 12, color: CL.accentYlw },
          { label: 'Database', pct: 14, color: CL.accentPrp },
          { label: 'Other', pct: 4, color: CL.textDim },
        ];

        const barX = safe.x;
        const barW = safe.w;
        const barH = 80;
        const bar1Y = 280;
        const bar2Y = 520;

        function makeBar(segs, y, prefix, label) {
          const els = [
            el(`<p style="font:600 18px ${FONT};color:${CL.textMuted}">${label}</p>`, {
              id: `data-${prefix}-label`, x: barX, y: y - 35, w: 400,
            }),
          ];
          let offsetPct = 0;
          segs.forEach((seg, i) => {
            const segX = barX + Math.round((offsetPct / 100) * barW);
            const segW = Math.round((seg.pct / 100) * barW);
            const isFirst = i === 0;
            const isLast = i === segs.length - 1;
            const radius = isFirst ? '8px 0 0 8px' : isLast ? '0 8px 8px 0' : '0';

            els.push(
              el(`<div style="width:100%;height:100%;background:${seg.color};border-radius:${radius}"></div>`, {
                id: `data-${prefix}-seg-${i}`, x: segX, y, w: segW, h: barH,
              }),
            );
            // Label inside if wide enough
            if (seg.pct >= 10) {
              els.push(
                el(`<p style="font:700 14px ${FONT};color:#fff">${seg.label} · ${seg.pct}%</p>`, {
                  id: `data-${prefix}-txt-${i}`, x: segX + 8, y: y + 30, w: segW - 16,
                }),
              );
            }
            offsetPct += seg.pct;
          });
          return els;
        }

        const els = [
          dataPatternLabel('D10 · Stacked Bar', 'd10'),
          el(`<p style="font:700 40px ${FONT};color:${CL.text}">Infrastructure Cost Breakdown</p>`, {
            id: 'data-d10-title', x: safe.x, y: safe.y, w: 1000,
          }),
          ...makeBar(segments, bar1Y, 'd10-q4', 'Q4 2025 — $2.4M/mo'),
          ...makeBar(segments2, bar2Y, 'd10-q3', 'Q3 2025 — $2.1M/mo'),
        ];

        // Legend
        const legY = 720;
        segments.forEach((seg, i) => {
          const lx = safe.x + i * 280;
          els.push(
            el(`<div style="width:100%;height:100%;background:${seg.color};border-radius:50%"></div>`, {
              id: `data-d10-leg-dot-${i}`, x: lx, y: legY, w: 16, h: 16,
            }),
            el(`<p style="font:400 16px ${FONT};color:${CL.textMuted}">${seg.label}</p>`, {
              id: `data-d10-leg-txt-${i}`, x: lx + 24, y: legY - 2, w: 160,
            }),
          );
        });

        return els;
      })(),
    },

    // =========================================================================
    // SLIDE 12 — D11: Confidence Range / Error Bars
    // Point estimates with visual confidence intervals
    // Use: forecasts, A/B test results, estimation ranges
    // APIs: el()
    // =========================================================================
    {
      id: 'data-d11-confidence-range',
      background: '#f8fafc',
      elements: (() => {
        const regions = [
          { name: 'North America', est: 4.2, lo: 3.8, hi: 4.6, color: CL.accent },
          { name: 'Europe', est: 3.1, lo: 2.6, hi: 3.5, color: CL.accentGrn },
          { name: 'Asia-Pacific', est: 2.8, lo: 2.1, hi: 3.6, color: CL.accentYlw },
          { name: 'Latin America', est: 1.4, lo: 1.0, hi: 1.9, color: CL.accentPrp },
          { name: 'Middle East', est: 0.8, lo: 0.5, hi: 1.2, color: CL.accentOrg },
        ];

        const chartX = 380;
        const chartW = 1100;
        const rowH = 100;
        const startY = 240;
        const maxVal = 5.0;
        const barH = 6;
        const dotR = 14;

        function valToX(v) { return chartX + Math.round((v / maxVal) * chartW); }

        const els = [
          dataPatternLabel('D11 · Confidence Range', 'd11'),
          el(`<p style="font:700 40px ${FONT};color:${CL.text}">Revenue Forecast by Region</p>`, {
            id: 'data-d11-title', x: safe.x, y: safe.y, w: 1000,
          }),
          // Scale marks
          ...[0, 1, 2, 3, 4, 5].map(v => el(`<p style="font:400 13px ${FONT};color:${CL.textDim}">$${v}M</p>`, {
            id: `data-d11-scale-${v}`, x: valToX(v) - 20, y: 200, w: 40, style: { textAlign: 'center' },
          })),
          // Grid lines
          ...[0, 1, 2, 3, 4, 5].map(v => el(`<div style="width:100%;height:100%;background:${CL.border}"></div>`, {
            id: `data-d11-grid-${v}`, x: valToX(v), y: 220, w: 1, h: 540,
          })),
        ];

        regions.forEach((r, i) => {
          const y = startY + i * rowH;
          const midY = y + 30;

          els.push(
            // Label
            el(`<p style="font:600 18px ${FONT};color:${CL.text}">${r.name}</p>`, {
              id: `data-d11-name-${i}`, x: safe.x, y: midY - 10, w: 240, style: { textAlign: 'right' },
            }),
            // Range bar
            el(`<div style="width:100%;height:100%;background:${r.color}44;border-radius:3px"></div>`, {
              id: `data-d11-range-${i}`, x: valToX(r.lo), y: midY - barH / 2, w: valToX(r.hi) - valToX(r.lo), h: barH,
            }),
            // Whisker ends
            el(`<div style="width:100%;height:100%;background:${r.color}"></div>`, {
              id: `data-d11-whiskL-${i}`, x: valToX(r.lo), y: midY - 12, w: 2, h: 24,
            }),
            el(`<div style="width:100%;height:100%;background:${r.color}"></div>`, {
              id: `data-d11-whiskR-${i}`, x: valToX(r.hi), y: midY - 12, w: 2, h: 24,
            }),
            // Point estimate dot
            el(`<div style="width:100%;height:100%;background:${r.color};border-radius:50%;border:3px solid ${CL.bg}"></div>`, {
              id: `data-d11-dot-${i}`, x: valToX(r.est) - dotR / 2, y: midY - dotR / 2, w: dotR, h: dotR,
            }),
            // Value label
            el(`<p style="font:700 16px ${FONT};color:${r.color}">$${r.est}M</p>`, {
              id: `data-d11-val-${i}`, x: valToX(r.est) + dotR, y: midY - 10, w: 120,
            }),
            // Range label
            el(`<p style="font:400 13px ${FONT};color:${CL.textDim}">($${r.lo}–${r.hi}M)</p>`, {
              id: `data-d11-rng-${i}`, x: valToX(r.est) + dotR, y: midY + 10, w: 120,
            }),
          );
        });

        return els;
      })(),
    },

    // =========================================================================
    // SLIDE 13 — D12: Bracket / Tournament
    // Single-elimination bracket showing competition outcomes
    // Use: framework evaluations, decision trees, playoff brackets
    // APIs: el(), panel(), connect()
    // =========================================================================
    {
      id: 'data-d12-bracket',
      background: '#f8fafc',
      elements: (() => {
        const r1 = ['React', 'Angular', 'Vue', 'Svelte', 'Solid', 'Qwik', 'Astro', 'Next.js'];
        const r2 = ['React', 'Vue', 'Solid', 'Next.js'];
        const r3 = ['React', 'Next.js'];
        const winner = 'React';

        const colW = 180;
        const colGap = 160;
        const startX = 160;
        const cardH = 44;

        // Round positions
        const rounds = [
          { items: r1, x: startX, spacing: 70 },
          { items: r2, x: startX + colW + colGap, spacing: 140 + 70 },
          { items: r3, x: startX + 2 * (colW + colGap), spacing: 280 + 140 + 70 },
          { items: [winner], x: startX + 3 * (colW + colGap), spacing: 0 },
        ];

        const els = [
          dataPatternLabel('D12 · Tournament Bracket', 'd12'),
          el(`<p style="font:700 40px ${FONT};color:${CL.text}">Framework Evaluation</p>`, {
            id: 'data-d12-title', x: safe.x, y: safe.y, w: 900,
          }),
          // Round labels
          el(`<p style="font:600 14px ${FONT};color:${CL.textDim};text-transform:uppercase;letter-spacing:1px">Round 1</p>`, {
            id: 'data-d12-rnd1', x: startX, y: 160, w: colW, style: { textAlign: 'center' },
          }),
          el(`<p style="font:600 14px ${FONT};color:${CL.textDim};text-transform:uppercase;letter-spacing:1px">Quarterfinals</p>`, {
            id: 'data-d12-rnd2', x: startX + colW + colGap, y: 160, w: colW, style: { textAlign: 'center' },
          }),
          el(`<p style="font:600 14px ${FONT};color:${CL.textDim};text-transform:uppercase;letter-spacing:1px">Semifinals</p>`, {
            id: 'data-d12-rnd3', x: startX + 2 * (colW + colGap), y: 160, w: colW, style: { textAlign: 'center' },
          }),
          el(`<p style="font:600 14px ${FONT};color:${CL.accent};text-transform:uppercase;letter-spacing:1px">Winner</p>`, {
            id: 'data-d12-rndW', x: startX + 3 * (colW + colGap), y: 160, w: colW, style: { textAlign: 'center' },
          }),
        ];

        // Place cards for each round
        rounds.forEach((round, ri) => {
          const totalH = round.items.length > 1 ? (round.items.length - 1) * round.spacing : 0;
          const baseY = 500 - totalH / 2;

          round.items.forEach((name, ii) => {
            const y = round.items.length === 1 ? 478 : baseY + ii * round.spacing;
            const isWinner = ri === 3;
            const fill = isWinner ? CL.accent + '33' : CL.surface;
            const border = isWinner ? `2px solid ${CL.accent}` : `1px solid ${CL.border}`;
            const textColor = isWinner ? CL.accent : CL.text;

            els.push(
              panel([
                el(`<p style="font:${isWinner ? '700' : '600'} ${isWinner ? '18' : '15'}px ${FONT};color:${textColor}">${name}</p>`, {
                  id: `data-d12-r${ri}-${ii}-name`, x: 0, y: 0, w: colW - 24,
                }),
              ], { id: `data-d12-r${ri}-${ii}`, x: round.x, y, w: colW, padding: 12, fill, radius: 8, border }),
            );
          });
        });

        // Connect rounds with lines
        // R1→R2
        for (let i = 0; i < 4; i++) {
          els.push(
            connect(`data-d12-r0-${i * 2}`, `data-d12-r1-${i}`, { color: CL.textDim, thickness: 1.5 }),
            connect(`data-d12-r0-${i * 2 + 1}`, `data-d12-r1-${i}`, { color: CL.textDim, thickness: 1.5 }),
          );
        }
        // R2→R3
        for (let i = 0; i < 2; i++) {
          els.push(
            connect(`data-d12-r1-${i * 2}`, `data-d12-r2-${i}`, { color: CL.textDim, thickness: 1.5 }),
            connect(`data-d12-r1-${i * 2 + 1}`, `data-d12-r2-${i}`, { color: CL.textDim, thickness: 1.5 }),
          );
        }
        // R3→Winner
        els.push(
          connect('data-d12-r2-0', 'data-d12-r3-0', { color: CL.accent, thickness: 2.5 }),
          connect('data-d12-r2-1', 'data-d12-r3-0', { color: CL.accent, thickness: 2.5 }),
        );

        return els;
      })(),
    },


  ];

  // Inject light background element into data slides (Part 2)
  slides.forEach(s => {
    if (s.background === '#f8fafc') {
      const bgEl = dataSlideBg(s.id);
      if (Array.isArray(s.elements)) {
        s.elements.unshift(bgEl);
      }
    }
  });

  return await render(slides);
}

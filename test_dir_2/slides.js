// slides.js — SlideKit replication of the ICSE 2026 "AI Where It Matters" deck
// Source: test_dir_2/source/index.html + css/custom-theme.css

import {
  init, render, safeRect, el,
  below, rightOf, centerIn, alignLeftWith,
  group, panel, hstack, vstack,
  splitRect, figure, cardGrid,
} from '../slidekit/slidekit.js?v=2';

// ── Design tokens (from custom-theme.css) ──────────────────────────
const C = {
  bg:       '#111827',
  text:     '#F9FAFB',
  muted:    '#9CA3AF',
  accent1:  '#3B82F6',  // blue
  accent2:  '#10B981',  // green
  accent3:  '#F43F5E',  // rose
  accent4:  '#A78BFA',  // purple
  surface:  'rgba(255,255,255,0.06)',
  border:   'rgba(255,255,255,0.1)',
};

const FONT_HEAD = "'Roboto', sans-serif";
const FONT_BODY = "'Inter', sans-serif";

export async function run() {
  await init({
    slide: { w: 1920, h: 1080 },
    safeZone: { left: 120, right: 120, top: 90, bottom: 90 },
    minFontSize: 12,
    fonts: [
      { family: 'Roboto', weights: [300, 400, 500, 700, 900], source: 'google' },
      { family: 'Inter',  weights: [300, 400, 600],           source: 'google' },
    ],
  });

  const safe = safeRect();
  const { left, right } = splitRect(safe, { ratio: 0.55, gap: 60 });

  const slides = [

    // ════════════════════════════════════════════════════════════════
    // SLIDE 1: TITLE
    // ════════════════════════════════════════════════════════════════
    {
      id: 'title',
      background: C.bg,
      elements: [
        // Background image (subtle, low opacity)
        el('<img src="assets/images/s01-title-bg.png" style="width:100%;height:100%;object-fit:cover;opacity:0.04;">', {
          id: 's1-bg-img',
          x: 0, y: 0, w: 1920, h: 1080,
          layer: 'bg',
        }),

        // Glow effect top-right
        el('<div style="width:500px;height:500px;background:radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%);"></div>', {
          id: 's1-glow',
          x: 1420, y: -150, w: 500, h: 500,
          layer: 'bg',
        }),

        // ICSE 2026 overline badge
        el(`<span style="font-family:${FONT_HEAD};font-size:24px;font-weight:500;color:${C.accent1};border:1px solid ${C.accent1};padding:6px 20px;border-radius:4px;display:inline-block;letter-spacing:0.06em;">ICSE 2026</span>`, {
          id: 's1-overline',
          x: 960, y: 280, w: 200, anchor: 'tc',
        }),

        // Main title with gradient
        el(`<h1 style="font-family:${FONT_HEAD};font-size:120px;font-weight:900;line-height:1.05;text-transform:uppercase;background:linear-gradient(135deg, ${C.accent1}, ${C.accent2});-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;text-align:center;">AI Where It Matters</h1>`, {
          id: 's1-title',
          x: 960, y: below('s1-overline', { gap: 'lg' }), w: 1400, anchor: 'tc',
        }),

        // Subtitle
        el(`<p style="font-family:${FONT_BODY};font-size:34px;font-weight:400;color:${C.muted};line-height:1.5;text-align:center;">Where, Why, and How Developers Want AI&nbsp;Support in&nbsp;Daily&nbsp;Work</p>`, {
          id: 's1-subtitle',
          x: 960, y: below('s1-title', { gap: 28 }), w: 1000, anchor: 'tc',
        }),

        // Authors
        el(`<p style="font-family:${FONT_BODY};font-size:24px;font-weight:400;color:${C.accent2};letter-spacing:0.03em;text-align:center;">Rudrajit Choudhuri &nbsp;\u00b7&nbsp; Carmen Badea &nbsp;\u00b7&nbsp; Christian Bird &nbsp;\u00b7&nbsp; Jenna L. Butler &nbsp;\u00b7&nbsp; Robert DeLine &nbsp;\u00b7&nbsp; Brian Houck</p>`, {
          id: 's1-authors',
          x: 960, y: below('s1-subtitle', { gap: 'xl' }), w: 1400, anchor: 'tc',
        }),

        // Affiliations
        el(`<p style="font-family:${FONT_BODY};font-size:19px;font-weight:400;color:${C.muted};text-align:center;">Oregon State University &nbsp;&nbsp;|&nbsp;&nbsp; Microsoft</p>`, {
          id: 's1-affiliations',
          x: 960, y: below('s1-authors', { gap: 'sm' }), w: 600, anchor: 'tc',
        }),
      ],
    },

    // ════════════════════════════════════════════════════════════════
    // SLIDE 2: THE TENSION / ADOPTION PARADOX
    // ════════════════════════════════════════════════════════════════
    {
      id: 'tension',
      background: C.bg,
      elements: [
        // ── Left column: text content ──
        vstack([
          // Eyebrow
          el(`<p style="font-family:${FONT_HEAD};font-size:22px;font-weight:600;color:${C.accent1};text-transform:uppercase;letter-spacing:0.12em;">The Adoption Paradox</p>`, {
            id: 's2-eyebrow',
          }),

          // Main headline
          el(`<h2 style="font-family:${FONT_HEAD};font-size:58px;font-weight:700;color:${C.text};line-height:1.15;">AI tools promise faster delivery and lower cognitive load</h2>`, {
            id: 's2-headline',
          }),

          // Subhead
          el(`<p style="font-family:${FONT_BODY};font-size:28px;color:${C.text};line-height:1.6;">But are they optimizing the <strong style="color:${C.accent1};">right</strong> work?</p>`, {
            id: 's2-subhead',
          }),

          // Body text
          el(`<p style="font-family:${FONT_BODY};font-size:24px;color:${C.muted};line-height:1.6;">Developers report more flow state \u2014 yet <strong style="color:${C.text};font-weight:600;">less time on the work they value most</strong>.</p>`, {
            id: 's2-body',
          }),
        ], {
          id: 's2-text',
          x: left.x, y: 310, w: left.w,
          gap: 'md',
        }),

        // ── Right column: image ──
        el('<img src="assets/images/s02-tension.png" style="width:100%;height:100%;object-fit:contain;">', {
          id: 's2-image',
          x: right.x, y: 140, w: right.w, h: 800,
        }),
      ],
    },

    // ════════════════════════════════════════════════════════════════
    // SLIDE 3: RESEARCH QUESTIONS
    // ════════════════════════════════════════════════════════════════
    {
      id: 'research-questions',
      background: C.bg,
      elements: [
        // Eyebrow / section title
        el(`<h3 style="font-family:${FONT_HEAD};font-size:28px;font-weight:600;color:${C.accent1};text-transform:uppercase;letter-spacing:0.12em;text-align:center;">Research Questions</h3>`, {
          id: 's3-eyebrow',
          x: 960, y: 270, w: 800, anchor: 'tc',
        }),

        // Two glass cards side by side
        hstack([
          // ── Card 1: RQ 1 ──
          panel([
            el(`<div style="font-size:48px;line-height:1;">\uD83D\uDD0D</div>`, { id: 's3-icon1', w: 'fill' }),
            el(`<p style="font-family:${FONT_BODY};font-size:20px;font-weight:600;color:${C.accent1};">RQ 1</p>`, { id: 's3-label1', w: 'fill' }),
            el(`<p style="font-family:${FONT_BODY};font-size:26px;color:${C.text};line-height:1.5;">How do developers\u2019 <strong>task appraisals</strong> shape their openness to and use of AI\u00a0tools?</p>`, { id: 's3-desc1', w: 'fill' }),
          ], {
            id: 's3-card1',
            w: 500,
            padding: 'lg',
            gap: 12,
            fill: C.surface,
            radius: 10,
            border: `1px solid ${C.border}`,
            style: {
              borderBottom: `2px solid ${C.accent1}`,
            },
          }),

          // ── Card 2: RQ 2 ──
          panel([
            el(`<div style="font-size:48px;line-height:1;">\uD83D\uDEE1\uFE0F</div>`, { id: 's3-icon2', w: 'fill' }),
            el(`<p style="font-family:${FONT_BODY};font-size:20px;font-weight:600;color:${C.accent2};">RQ 2</p>`, { id: 's3-label2', w: 'fill' }),
            el(`<p style="font-family:${FONT_BODY};font-size:26px;color:${C.text};line-height:1.5;">Which <strong>Responsible AI</strong> design principles do developers prioritize, and how do priorities vary?</p>`, { id: 's3-desc2', w: 'fill' }),
          ], {
            id: 's3-card2',
            w: 500,
            padding: 'lg',
            gap: 12,
            fill: C.surface,
            radius: 10,
            border: `1px solid ${C.border}`,
            style: {
              borderBottom: `2px solid ${C.accent2}`,
            },
          }),
        ], {
          id: 's3-cards',
          x: 960, y: below('s3-eyebrow', { gap: 36 }),
          anchor: 'tc',
          gap: 40,
          align: 'stretch',
        }),
      ],
    },

    // ════════════════════════════════════════════════════════════════
    // SLIDE 4: APPRAISAL FRAMEWORK
    // ════════════════════════════════════════════════════════════════
    {
      id: 'appraisal-framework',
      background: C.bg,
      elements: [
        // ── Left column: text content ──
        vstack([
          // Eyebrow
          el(`<p style="font-family:${FONT_HEAD};font-size:22px;font-weight:600;color:${C.accent1};text-transform:uppercase;letter-spacing:0.12em;">Theoretical Lens</p>`, {
            id: 's4-eyebrow',
          }),

          // Main headline
          el(`<h2 style="font-family:${FONT_HEAD};font-size:56px;font-weight:700;color:${C.text};line-height:1.15;text-transform:uppercase;">Cognitive Appraisal Theory</h2>`, {
            id: 's4-headline',
          }),

          // Body paragraph 1
          el(`<p style="font-family:${FONT_BODY};font-size:24px;color:${C.muted};line-height:1.6;">People evaluate events through personal appraisals that shape their emotional and behavioral\u00a0responses.</p>`, {
            id: 's4-body1', w: 680,
          }),

          // Body paragraph 2
          el(`<p style="font-family:${FONT_BODY};font-size:24px;color:${C.muted};line-height:1.6;">We adapt this to understand <strong style="color:${C.text};font-weight:600;">why developers seek or resist AI</strong> for different\u00a0tasks.</p>`, {
            id: 's4-body2', w: 680,
          }),
        ], {
          id: 's4-text',
          x: 120, y: 250, w: 700,
          gap: 'md',
        }),

        // ── Flow diagram: Event → Appraisal → Response ──
        el(`<div style="display:flex;align-items:center;gap:10px;">
          <div style="background:rgba(59,130,246,0.15);border:1px solid rgba(59,130,246,0.3);border-radius:8px;padding:8px 16px;">
            <span style="font-family:${FONT_BODY};font-size:18px;color:${C.accent1};">Event</span>
          </div>
          <span style="font-family:${FONT_BODY};font-size:20px;color:${C.muted};">\u2192</span>
          <div style="background:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.3);border-radius:8px;padding:8px 16px;">
            <span style="font-family:${FONT_BODY};font-size:18px;color:${C.accent2};">Appraisal</span>
          </div>
          <span style="font-family:${FONT_BODY};font-size:20px;color:${C.muted};">\u2192</span>
          <div style="background:rgba(167,139,250,0.15);border:1px solid rgba(167,139,250,0.3);border-radius:8px;padding:8px 16px;">
            <span style="font-family:${FONT_BODY};font-size:18px;color:${C.accent4};">Response</span>
          </div>
        </div>`, {
          id: 's4-flow',
          x: 120, y: below('s4-body2', { gap: 'md' }), w: 600,
        }),

        // ── Right column: 2×2 card grid ──
        cardGrid([
          panel([
            el(`<div style="width:48px;height:48px;border-radius:50%;background:rgba(59,130,246,0.15);display:flex;align-items:center;justify-content:center;font-size:24px;">\uD83D\uDC8E</div>`, {
              id: 's4-val-icon', w: 'fill',
            }),
            el(`<p style="font-family:${FONT_BODY};font-size:22px;font-weight:600;color:${C.accent1};text-align:center;">Value</p>`, {
              id: 's4-val-label', w: 'fill',
            }),
            el(`<p style="font-family:${FONT_BODY};font-size:17px;color:${C.muted};line-height:1.5;text-align:center;">How important is this task to my goals?</p>`, {
              id: 's4-val-desc', w: 'fill',
            }),
          ], {
            id: 's4-card-value', w: 280,
            padding: 20, gap: 'xs',
            fill: C.surface, radius: 10,
            border: `1px solid ${C.border}`,
            style: { borderBottom: `2px solid ${C.accent1}` },
          }),
          panel([
            el(`<div style="width:48px;height:48px;border-radius:50%;background:rgba(16,185,129,0.15);display:flex;align-items:center;justify-content:center;font-size:24px;">\uD83E\uDEAA</div>`, {
              id: 's4-id-icon', w: 'fill',
            }),
            el(`<p style="font-family:${FONT_BODY};font-size:22px;font-weight:600;color:${C.accent2};text-align:center;">Identity</p>`, {
              id: 's4-id-label', w: 'fill',
            }),
            el(`<p style="font-family:${FONT_BODY};font-size:17px;color:${C.muted};line-height:1.5;text-align:center;">How central is this to who I am as a developer?</p>`, {
              id: 's4-id-desc', w: 'fill',
            }),
          ], {
            id: 's4-card-identity', w: 280,
            padding: 20, gap: 'xs',
            fill: C.surface, radius: 10,
            border: `1px solid ${C.border}`,
            style: { borderBottom: `2px solid ${C.accent2}` },
          }),
          panel([
            el(`<div style="width:48px;height:48px;border-radius:50%;background:rgba(244,63,94,0.15);display:flex;align-items:center;justify-content:center;font-size:24px;">\u2696\uFE0F</div>`, {
              id: 's4-acc-icon', w: 'fill',
            }),
            el(`<p style="font-family:${FONT_BODY};font-size:22px;font-weight:600;color:${C.accent3};text-align:center;">Accountability</p>`, {
              id: 's4-acc-label', w: 'fill',
            }),
            el(`<p style="font-family:${FONT_BODY};font-size:17px;color:${C.muted};line-height:1.5;text-align:center;">Am I personally responsible for the outcome?</p>`, {
              id: 's4-acc-desc', w: 'fill',
            }),
          ], {
            id: 's4-card-accountability', w: 280,
            padding: 20, gap: 'xs',
            fill: C.surface, radius: 10,
            border: `1px solid ${C.border}`,
            style: { borderBottom: `2px solid ${C.accent3}` },
          }),
          panel([
            el(`<div style="width:48px;height:48px;border-radius:50%;background:rgba(167,139,250,0.15);display:flex;align-items:center;justify-content:center;font-size:24px;">\u26A1</div>`, {
              id: 's4-dem-icon', w: 'fill',
            }),
            el(`<p style="font-family:${FONT_BODY};font-size:22px;font-weight:600;color:${C.accent4};text-align:center;">Demands</p>`, {
              id: 's4-dem-label', w: 'fill',
            }),
            el(`<p style="font-family:${FONT_BODY};font-size:17px;color:${C.muted};line-height:1.5;text-align:center;">How cognitively or emotionally taxing is this?</p>`, {
              id: 's4-dem-desc', w: 'fill',
            }),
          ], {
            id: 's4-card-demands', w: 280,
            padding: 20, gap: 'xs',
            fill: C.surface, radius: 10,
            border: `1px solid ${C.border}`,
            style: { borderBottom: `2px solid ${C.accent4}` },
          }),
        ], {
          id: 's4-grid',
          cols: 2,
          gap: 20,
          x: 920, y: 220,
        }),
      ],
    },

    // ════════════════════════════════════════════════════════════════
    // SLIDE 5: METHOD
    // ════════════════════════════════════════════════════════════════
    {
      id: 'method',
      background: C.bg,
      elements: [
        // ── Left column: text content ──

        // Eyebrow
        el(`<p style="font-family:${FONT_HEAD};font-size:22px;font-weight:600;color:${C.accent1};text-transform:uppercase;letter-spacing:0.12em;">Methodology</p>`, {
          id: 's5-eyebrow',
          x: 120, y: 250, w: 880,
        }),

        // Main headline
        el(`<h2 style="font-family:${FONT_HEAD};font-size:56px;font-weight:700;color:${C.text};line-height:1.15;text-transform:uppercase;">A Large-Scale Mixed-Methods Study</h2>`, {
          id: 's5-headline',
          x: 120, y: below('s5-eyebrow', { gap: 'sm' }), w: 880,
        }),

        // ── Stat cards row ──
        hstack([
          // Stat 1: 860 (blue)
          panel([
            el(`<p style="font-family:${FONT_HEAD};font-size:72px;font-weight:900;color:${C.accent1};line-height:1;">860</p>`, {
              id: 's5-num1', w: 'fill',
            }),
            el(`<p style="font-family:${FONT_BODY};font-size:18px;color:${C.muted};line-height:1.4;">Professional developers surveyed</p>`, {
              id: 's5-label1', w: 'fill',
            }),
            el(`<p style="font-family:${FONT_BODY};font-size:15px;color:${C.muted};opacity:0.7;line-height:1.4;">Microsoft \u00b7 6 continents</p>`, {
              id: 's5-sub1', w: 'fill',
            }),
          ], {
            id: 's5-stat1',
            w: 240,
            padding: 'md', gap: 6,
            fill: C.surface,
            radius: 10,
            border: `1px solid ${C.border}`,
            style: {
              borderBottom: `2px solid ${C.accent1}`,
            },
          }),

          // Stat 2: 20 (green)
          panel([
            el(`<p style="font-family:${FONT_HEAD};font-size:72px;font-weight:900;color:${C.accent2};line-height:1;">20</p>`, {
              id: 's5-num2', w: 'fill',
            }),
            el(`<p style="font-family:${FONT_BODY};font-size:18px;color:${C.muted};line-height:1.4;">SE tasks appraised</p>`, {
              id: 's5-label2', w: 'fill',
            }),
            el(`<p style="font-family:${FONT_BODY};font-size:15px;color:${C.muted};opacity:0.7;line-height:1.4;">5 categories \u00b7 within-subjects</p>`, {
              id: 's5-sub2', w: 'fill',
            }),
          ], {
            id: 's5-stat2',
            w: 240,
            padding: 'md', gap: 6,
            fill: C.surface,
            radius: 10,
            border: `1px solid ${C.border}`,
            style: {
              borderBottom: `2px solid ${C.accent2}`,
            },
          }),

          // Stat 3: 3,981 (rose)
          panel([
            el(`<p style="font-family:${FONT_HEAD};font-size:72px;font-weight:900;color:${C.accent3};line-height:1;">3,981</p>`, {
              id: 's5-num3', w: 'fill',
            }),
            el(`<p style="font-family:${FONT_BODY};font-size:18px;color:${C.muted};line-height:1.4;">Qualitative responses analyzed</p>`, {
              id: 's5-label3', w: 'fill',
            }),
            el(`<p style="font-family:${FONT_BODY};font-size:15px;color:${C.muted};opacity:0.7;line-height:1.4;">Open-ended \u00b7 thematic coding</p>`, {
              id: 's5-sub3', w: 'fill',
            }),
          ], {
            id: 's5-stat3',
            w: 240,
            padding: 'md', gap: 6,
            fill: C.surface,
            radius: 10,
            border: `1px solid ${C.border}`,
            style: {
              borderBottom: `2px solid ${C.accent3}`,
            },
          }),
        ], {
          id: 's5-stats',
          x: 120, y: below('s5-headline', { gap: 36 }),
          gap: 20,
          align: 'stretch',
        }),

        // ── Right column: image ──
        el('<img src="assets/images/s05-method.png" style="width:100%;height:100%;object-fit:contain;">', {
          id: 's5-image',
          x: right.x, y: 140, w: right.w, h: 800,
        }),
      ],
    },

    // ════════════════════════════════════════════════════════════════
    // SLIDE 6: TASK TAXONOMY — 20 TASKS ACROSS 5 CATEGORIES
    // ════════════════════════════════════════════════════════════════
    {
      id: 'task-taxonomy',
      background: C.bg,
      elements: [
        // Eyebrow
        el(`<h3 style="font-family:${FONT_HEAD};font-size:28px;font-weight:600;color:${C.accent1};text-transform:uppercase;letter-spacing:0.12em;text-align:center;">SE Task Taxonomy</h3>`, {
          id: 's6-eyebrow',
          x: 960, y: 240, w: 800, anchor: 'tc',
        }),

        // Main heading
        el(`<h2 style="font-family:${FONT_HEAD};font-size:60px;font-weight:700;color:${C.text};line-height:1.15;text-transform:uppercase;text-align:center;">20 Tasks Across 5 Categories</h2>`, {
          id: 's6-headline',
          x: 960, y: below('s6-eyebrow', { gap: 'sm' }), w: 1200, anchor: 'tc',
        }),

        // Table rows as vstack (all gap:0, same x/w/anchor)
        vstack([
          // Table header row
          el(`<div style="display:flex;border-bottom:2px solid ${C.border};padding:10px 0;">
            <div style="width:310px;font-family:${FONT_HEAD};font-size:20px;font-weight:600;color:${C.accent1};">Category</div>
            <div style="flex:1;font-family:${FONT_HEAD};font-size:20px;font-weight:600;color:${C.accent1};">Tasks</div>
          </div>`, {
            id: 's6-thead', w: 1100,
          }),

          // Row 1: Development
          el(`<div style="display:flex;align-items:baseline;border-bottom:1px solid ${C.border};padding:12px 0;">
            <div style="width:310px;display:flex;align-items:center;gap:8px;">
              <span style="font-size:18px;">\u2699\uFE0F</span>
              <span style="font-family:${FONT_BODY};font-size:20px;font-weight:600;color:#F59E0B;">Development</span>
            </div>
            <div style="flex:1;font-family:${FONT_BODY};font-size:19px;color:${C.muted};line-height:1.55;">Coding/Programming \u00b7 Bug Fixing/Debugging \u00b7 Performance Optimization \u00b7 Refactoring &amp; Maintenance/Updates \u00b7 AI Integration</div>
          </div>`, {
            id: 's6-row1', w: 1100,
          }),

          // Row 2: Design & Planning
          el(`<div style="display:flex;align-items:baseline;border-bottom:1px solid ${C.border};padding:12px 0;">
            <div style="width:310px;display:flex;align-items:center;gap:8px;">
              <span style="font-size:18px;">\uD83D\uDCD0</span>
              <span style="font-family:${FONT_BODY};font-size:20px;font-weight:600;color:${C.accent2};">Design &amp; Planning</span>
            </div>
            <div style="flex:1;font-family:${FONT_BODY};font-size:19px;color:${C.muted};line-height:1.55;">System Design \u00b7 Requirements Engineering \u00b7 Project Planning &amp; Management</div>
          </div>`, {
            id: 's6-row2', w: 1100,
          }),

          // Row 3: Quality & Risk Mgmt
          el(`<div style="display:flex;align-items:baseline;border-bottom:1px solid ${C.border};padding:12px 0;">
            <div style="width:310px;display:flex;align-items:center;gap:8px;">
              <span style="font-size:18px;">\uD83D\uDEE1\uFE0F</span>
              <span style="font-family:${FONT_BODY};font-size:20px;font-weight:600;color:${C.accent3};">Quality &amp; Risk Mgmt</span>
            </div>
            <div style="flex:1;font-family:${FONT_BODY};font-size:19px;color:${C.muted};line-height:1.55;">Testing &amp; Quality Assurance \u00b7 Code Review/Pull Requests \u00b7 Security &amp; Compliance</div>
          </div>`, {
            id: 's6-row3', w: 1100,
          }),

          // Row 4: Infrastructure & Ops
          el(`<div style="display:flex;align-items:baseline;border-bottom:1px solid ${C.border};padding:12px 0;">
            <div style="width:310px;display:flex;align-items:center;gap:8px;">
              <span style="font-size:18px;">\uD83D\uDDA5\uFE0F</span>
              <span style="font-family:${FONT_BODY};font-size:20px;font-weight:600;color:${C.accent4};">Infrastructure &amp; Ops</span>
            </div>
            <div style="flex:1;font-family:${FONT_BODY};font-size:19px;color:${C.muted};line-height:1.55;">DevOps (CI/CD) \u00b7 Environment Setup &amp; Maintenance \u00b7 Infrastructure Monitoring \u00b7 Customer Support</div>
          </div>`, {
            id: 's6-row4', w: 1100,
          }),

          // Row 5: Meta-work (no bottom border on last row)
          el(`<div style="display:flex;align-items:baseline;padding:12px 0;">
            <div style="width:310px;display:flex;align-items:center;gap:8px;">
              <span style="font-size:18px;">\uD83D\uDCDA</span>
              <span style="font-family:${FONT_BODY};font-size:20px;font-weight:600;color:#67E8F9;">Meta-work</span>
            </div>
            <div style="flex:1;font-family:${FONT_BODY};font-size:19px;color:${C.muted};line-height:1.55;">Documentation \u00b7 Client/Stakeholder Communication \u00b7 Mentoring &amp; Onboarding \u00b7 Learning \u00b7 Research &amp; Brainstorming</div>
          </div>`, {
            id: 's6-row5', w: 1100,
          }),
        ], {
          id: 's6-table',
          x: 960, y: below('s6-headline', { gap: 'lg' }),
          w: 1100,
          anchor: 'tc',
          gap: 0,
        }),
      ],
    },

    // ════════════════════════════════════════════════════════════════
    // SLIDE 7: APPRAISALS PREDICT AI ADOPTION
    // ════════════════════════════════════════════════════════════════
    {
      id: 'appraisals-predict',
      background: C.bg,
      elements: [
        // ── Left column: text content ──
        vstack([
          // Eyebrow
          el(`<p style="font-family:${FONT_HEAD};font-size:22px;font-weight:600;color:${C.accent1};text-transform:uppercase;letter-spacing:0.12em;">RQ1 Results</p>`, {
            id: 's7-eyebrow',
          }),

          // Main headline
          el(`<h2 style="font-family:${FONT_HEAD};font-size:64px;font-weight:700;color:${C.text};line-height:1.1;text-transform:uppercase;">Appraisals Predict AI\u00a0Adoption</h2>`, {
            id: 's7-headline',
          }),

          // Body text 1
          el(`<p style="font-family:${FONT_BODY};font-size:24px;color:${C.muted};line-height:1.6;">All four appraisal dimensions <strong style="color:${C.text};font-weight:600;">significantly predict</strong> both openness to AI and current AI\u00a0usage.</p>`, {
            id: 's7-body1', w: 680,
          }),

          // Body text 2 (methodology note)
          el(`<p style="font-family:${FONT_BODY};font-size:20px;color:${C.muted};line-height:1.6;">Ordinal mixed-effects regression, controlling for role, experience, and task random effects.</p>`, {
            id: 's7-body2', w: 680,
          }),
        ], {
          id: 's7-text',
          x: 120, y: 260, w: 700,
          gap: 'md',
        }),

        // ── Right column: four appraisal result cards ──
        vstack([
          // Card 1: Value — β = +.23 (blue)
          panel([
            el(`<div style="display:flex;align-items:center;justify-content:space-between;width:100%;">
              <div style="display:flex;align-items:center;gap:12px;">
                <span style="font-size:26px;">\uD83D\uDC8E</span>
                <div>
                  <p style="font-family:${FONT_BODY};font-size:21px;font-weight:600;color:${C.accent1};margin:0;">Value</p>
                  <p style="font-family:${FONT_BODY};font-size:16px;color:${C.muted};margin:3px 0 0;">Higher value \u2192 more open to AI</p>
                </div>
              </div>
              <div style="text-align:right;">
                <span style="font-family:${FONT_HEAD};font-size:36px;font-weight:700;color:${C.accent2};">\u03B2 = +.23</span>
              </div>
            </div>`, { id: 's7-val-row', w: 'fill' }),
          ], {
            id: 's7-card-value',
            w: 580,
            padding: 18, gap: 0,
            fill: C.surface,
            radius: 10,
            border: `1px solid ${C.border}`,
            style: { borderBottom: `2px solid ${C.accent1}` },
          }),

          // Card 2: Identity — dual effect ↓ −.09  ↑ +.15 (green)
          panel([
            el(`<div style="display:flex;align-items:center;justify-content:space-between;width:100%;">
              <div style="display:flex;align-items:center;gap:12px;">
                <span style="font-size:26px;">\uD83E\uDEAA</span>
                <div>
                  <p style="font-family:${FONT_BODY};font-size:21px;font-weight:600;color:${C.accent2};margin:0;">Identity</p>
                  <p style="font-family:${FONT_BODY};font-size:16px;color:${C.muted};margin:3px 0 0;">Dual effect: protect craft, yet augment</p>
                </div>
              </div>
              <div style="text-align:right;">
                <span style="font-family:${FONT_HEAD};font-size:34px;font-weight:700;color:${C.accent4};">\u2193 \u2212.09 &nbsp; \u2191 +.15</span>
              </div>
            </div>`, { id: 's7-id-row', w: 'fill' }),
          ], {
            id: 's7-card-identity',
            w: 580,
            padding: 18, gap: 0,
            fill: C.surface,
            radius: 10,
            border: `1px solid ${C.border}`,
            style: { borderBottom: `2px solid ${C.accent2}` },
          }),

          // Card 3: Accountability — β = +.16 (rose)
          panel([
            el(`<div style="display:flex;align-items:center;justify-content:space-between;width:100%;">
              <div style="display:flex;align-items:center;gap:12px;">
                <span style="font-size:26px;">\u2696\uFE0F</span>
                <div>
                  <p style="font-family:${FONT_BODY};font-size:21px;font-weight:600;color:${C.accent3};margin:0;">Accountability</p>
                  <p style="font-family:${FONT_BODY};font-size:16px;color:${C.muted};margin:3px 0 0;">Responsible \u2192 want AI backup</p>
                </div>
              </div>
              <div style="text-align:right;">
                <span style="font-family:${FONT_HEAD};font-size:36px;font-weight:700;color:${C.accent2};">\u03B2 = +.16</span>
              </div>
            </div>`, { id: 's7-acc-row', w: 'fill' }),
          ], {
            id: 's7-card-accountability',
            w: 580,
            padding: 18, gap: 0,
            fill: C.surface,
            radius: 10,
            border: `1px solid ${C.border}`,
            style: { borderBottom: `2px solid ${C.accent3}` },
          }),

          // Card 4: Demands — β = +.12 (purple)
          panel([
            el(`<div style="display:flex;align-items:center;justify-content:space-between;width:100%;">
              <div style="display:flex;align-items:center;gap:12px;">
                <span style="font-size:26px;">\u26A1</span>
                <div>
                  <p style="font-family:${FONT_BODY};font-size:21px;font-weight:600;color:${C.accent4};margin:0;">Demands</p>
                  <p style="font-family:${FONT_BODY};font-size:16px;color:${C.muted};margin:3px 0 0;">Higher load \u2192 seek AI relief</p>
                </div>
              </div>
              <div style="text-align:right;">
                <span style="font-family:${FONT_HEAD};font-size:36px;font-weight:700;color:${C.accent2};">\u03B2 = +.12</span>
              </div>
            </div>`, { id: 's7-dem-row', w: 'fill' }),
          ], {
            id: 's7-card-demands',
            w: 580,
            padding: 18, gap: 0,
            fill: C.surface,
            radius: 10,
            border: `1px solid ${C.border}`,
            style: { borderBottom: `2px solid ${C.accent4}` },
          }),
        ], {
          id: 's7-cards',
          x: 880, y: 240,
          gap: 14,
        }),
      ],
    },

    // ════════════════════════════════════════════════════════════════
    // SLIDE 8: IDENTITY — PROTECT & AUGMENT
    // ════════════════════════════════════════════════════════════════
    {
      id: 'identity-dual',
      background: C.bg,
      elements: [
        // ── Left column: text content ──
        vstack([
          // Eyebrow
          el(`<p style="font-family:${FONT_HEAD};font-size:22px;font-weight:600;color:${C.accent1};text-transform:uppercase;letter-spacing:0.12em;">Key Finding</p>`, {
            id: 's8-eyebrow',
          }),

          // Main headline
          el(`<h2 style="font-family:${FONT_HEAD};font-size:60px;font-weight:700;color:${C.text};line-height:1.1;text-transform:uppercase;">Identity: Protect &amp;&nbsp;Augment</h2>`, {
            id: 's8-headline',
          }),

          // Dual arrow indicators
          el(`<div style="display:flex;gap:32px;align-items:center;">
            <span style="font-family:${FONT_BODY};font-size:22px;font-weight:600;color:${C.accent3};">\u25BC Openness \u03B2 = \u2212.09</span>
            <span style="font-family:${FONT_BODY};font-size:22px;font-weight:600;color:${C.accent2};">\u25B2 Usage \u03B2 = +.15</span>
          </div>`, {
            id: 's8-dual-arrows',
          }),

          // Body text
          el(`<p style="font-family:${FONT_BODY};font-size:24px;color:${C.muted};line-height:1.6;">Developers <strong style="color:${C.accent3};font-weight:600;">guard</strong> tasks central to their identity \u2014 but <strong style="color:${C.accent2};font-weight:600;">use AI more</strong> on those same tasks to sharpen their\u00a0craft.</p>`, {
            id: 's8-body', w: 780,
          }),
        ], {
          id: 's8-text',
          x: 120, y: 260, w: 800,
          gap: 'md',
        }),

        // ── Right column: image + quote blocks ──

        // Image
        el('<img src="assets/images/s08-identity.png" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">', {
          id: 's8-image',
          x: 1000, y: 140, w: 800, h: 480,
        }),

        // Quote block 1 (rose border) — "I don't want AI writing code for me..."
        panel([
          el(`<p style="font-family:${FONT_BODY};font-size:19px;font-style:italic;color:${C.text};line-height:1.5;">\u201CI don\u2019t want AI writing code for me. That\u2019s the part I\u00a0enjoy.\u201D</p>`, {
            id: 's8-q1-text', w: 'fill',
          }),
          el(`<p style="font-family:${FONT_BODY};font-size:16px;color:${C.accent2};font-weight:600;">\u2014 P110</p>`, {
            id: 's8-q1-attr', w: 'fill',
          }),
        ], {
          id: 's8-quote1',
          x: 1000, y: below('s8-image', { gap: 12 }), w: 800,
          padding: 'sm', gap: 6,
          fill: C.surface,
          radius: '0 8px 8px 0',
          style: {
            borderLeft: `3px solid ${C.accent3}`,
          },
        }),

        // Quote block 2 (green border) — "AI should enhance engineers' learning..."
        panel([
          el(`<p style="font-family:${FONT_BODY};font-size:19px;font-style:italic;color:${C.text};line-height:1.5;">\u201CAI should enhance engineers\u2019 learning, not replace growth\u00a0tasks.\u201D</p>`, {
            id: 's8-q2-text', w: 'fill',
          }),
          el(`<p style="font-family:${FONT_BODY};font-size:16px;color:${C.accent2};font-weight:600;">\u2014 P16</p>`, {
            id: 's8-q2-attr', w: 'fill',
          }),
        ], {
          id: 's8-quote2',
          x: 1000, y: below('s8-quote1', { gap: 10 }), w: 800,
          padding: 'sm', gap: 6,
          fill: C.surface,
          radius: '0 8px 8px 0',
          style: {
            borderLeft: `3px solid ${C.accent2}`,
          },
        }),
      ],
    },

    // ════════════════════════════════════════════════════════════════
    // SLIDE 9: THREE TASK CLUSTERS EMERGED
    // ════════════════════════════════════════════════════════════════
    {
      id: 'task-clusters',
      background: C.bg,
      elements: [
        // Eyebrow
        el(`<h3 style="font-family:${FONT_HEAD};font-size:28px;font-weight:600;color:${C.accent1};text-transform:uppercase;letter-spacing:0.12em;text-align:center;">Cluster Analysis</h3>`, {
          id: 's9-eyebrow',
          x: 960, y: 260, w: 800, anchor: 'tc',
        }),

        // Main heading
        el(`<h2 style="font-family:${FONT_HEAD};font-size:60px;font-weight:700;color:${C.text};line-height:1.15;text-transform:uppercase;text-align:center;">Three Task Clusters Emerged</h2>`, {
          id: 's9-headline',
          x: 960, y: below('s9-eyebrow', { gap: 'sm' }), w: 1200, anchor: 'tc',
        }),

        // Three cluster cards
        hstack([
          // ── C1: Core Work (blue accent) ──
          panel([
            el(`<div style="font-size:40px;line-height:1;">\uD83D\uDCBB</div>`, {
              id: 's9-c1-icon', w: 'fill',
            }),
            el(`<p style="font-family:${FONT_BODY};font-size:18px;font-weight:700;color:${C.accent1};letter-spacing:0.05em;margin:0;">C1 \u00B7 CORE WORK</p>`, {
              id: 's9-c1-label', w: 'fill',
            }),
            el(`<p style="font-family:${FONT_BODY};font-size:22px;color:${C.text};line-height:1.45;">Coding \u00B7 Debugging \u00B7 Testing \u00B7 Code Review \u00B7 System Design</p>`, {
              id: 's9-c1-tasks', w: 'fill',
            }),
            el(`<p style="font-family:${FONT_BODY};font-size:17px;color:${C.muted};line-height:1.4;">High value &amp; demands \u00B7 Strong AI appetite</p>`, {
              id: 's9-c1-desc', w: 'fill',
            }),
            el(`<p style="font-family:${FONT_BODY};font-size:17px;font-weight:600;color:${C.accent1};line-height:1.4;">\u2192 AI as collaborator</p>`, {
              id: 's9-c1-takeaway', w: 'fill',
            }),
          ], {
            id: 's9-card-c1',
            w: 350,
            padding: 'md', gap: 'xs',
            fill: C.surface,
            radius: 10,
            border: `1px solid ${C.border}`,
            style: {
              borderBottom: `2px solid ${C.accent1}`,
            },
          }),

          // ── C2: People & AI-Building (rose accent) ──
          panel([
            el(`<div style="font-size:40px;line-height:1;">\uD83E\uDD1D</div>`, {
              id: 's9-c2-icon', w: 'fill',
            }),
            el(`<p style="font-family:${FONT_BODY};font-size:18px;font-weight:700;color:${C.accent3};letter-spacing:0.05em;margin:0;">C2 \u00B7 PEOPLE &amp; AI-BUILDING</p>`, {
              id: 's9-c2-label', w: 'fill',
            }),
            el(`<p style="font-family:${FONT_BODY};font-size:22px;color:${C.text};line-height:1.45;">Mentoring \u00B7 AI Integration \u00B7 Collaboration</p>`, {
              id: 's9-c2-tasks', w: 'fill',
            }),
            el(`<p style="font-family:${FONT_BODY};font-size:17px;color:${C.muted};line-height:1.4;">High identity \u00B7 Relational &amp; craft-based</p>`, {
              id: 's9-c2-desc', w: 'fill',
            }),
            el(`<p style="font-family:${FONT_BODY};font-size:17px;font-weight:600;color:${C.accent3};line-height:1.4;">\u2192 AI largely resisted</p>`, {
              id: 's9-c2-takeaway', w: 'fill',
            }),
          ], {
            id: 's9-card-c2',
            w: 350,
            padding: 'md', gap: 'xs',
            fill: C.surface,
            radius: 10,
            border: `1px solid ${C.border}`,
            style: {
              borderBottom: `2px solid ${C.accent3}`,
            },
          }),

          // ── C3: Ops & Coordination (green accent) ──
          panel([
            el(`<div style="font-size:40px;line-height:1;">\u2699\uFE0F</div>`, {
              id: 's9-c3-icon', w: 'fill',
            }),
            el(`<p style="font-family:${FONT_BODY};font-size:18px;font-weight:700;color:${C.accent2};letter-spacing:0.05em;margin:0;">C3 \u00B7 OPS &amp; COORDINATION</p>`, {
              id: 's9-c3-label', w: 'fill',
            }),
            el(`<p style="font-family:${FONT_BODY};font-size:22px;color:${C.text};line-height:1.45;">DevOps \u00B7 Env Setup \u00B7 Documentation \u00B7 Customer Support</p>`, {
              id: 's9-c3-tasks', w: 'fill',
            }),
            el(`<p style="font-family:${FONT_BODY};font-size:17px;color:${C.muted};line-height:1.4;">Low identity \u00B7 High demands \u00B7 Toil-heavy</p>`, {
              id: 's9-c3-desc', w: 'fill',
            }),
            el(`<p style="font-family:${FONT_BODY};font-size:17px;font-weight:600;color:${C.accent2};line-height:1.4;">\u2192 Automate the grunt work</p>`, {
              id: 's9-c3-takeaway', w: 'fill',
            }),
          ], {
            id: 's9-card-c3',
            w: 350,
            padding: 'md', gap: 'xs',
            fill: C.surface,
            radius: 10,
            border: `1px solid ${C.border}`,
            style: {
              borderBottom: `2px solid ${C.accent2}`,
            },
          }),
        ], {
          id: 's9-cards',
          x: 960, y: below('s9-headline', { gap: 36 }),
          anchor: 'tc',
          gap: 'md',
          align: 'stretch',
        }),
      ],
    },

    // ════════════════════════════════════════════════════════════════
    // SLIDE 10: THE GAP MAP — WHERE AI SUPPORT IS NEEDED VS. USED
    // ════════════════════════════════════════════════════════════════
    {
      id: 'gap-map',
      background: C.bg,
      elements: [
        // Eyebrow
        el(`<h3 style="font-family:${FONT_HEAD};font-size:28px;font-weight:600;color:${C.accent1};text-transform:uppercase;letter-spacing:0.12em;text-align:center;">The Gap Map</h3>`, {
          id: 's10-eyebrow',
          x: 960, y: 90, w: 800, anchor: 'tc',
        }),

        // Main heading
        el(`<h2 style="font-family:${FONT_HEAD};font-size:60px;font-weight:700;color:${C.text};line-height:1.15;text-transform:uppercase;text-align:center;">Where AI Support Is Needed vs.\u00a0Used</h2>`, {
          id: 's10-headline',
          x: 960, y: below('s10-eyebrow', { gap: 'sm' }), w: 1400, anchor: 'tc',
        }),

        // Quadrant chart image
        el('<img src="assets/images/quadrant_screenshot_from_paper.png" style="width:100%;height:100%;object-fit:contain;">', {
          id: 's10-chart',
          x: 960, y: below('s10-headline', { gap: 'md' }), w: 820, h: 620,
          anchor: 'tc',
        }),

        // Caption
        el(`<p style="font-family:${FONT_BODY};font-size:28px;color:${C.muted};line-height:1.5;text-align:center;">Tasks in the <strong style="color:${C.accent1};font-weight:600;">Build</strong> quadrant have high need but low current usage \u2014 the biggest opportunity gap.</p>`, {
          id: 's10-caption',
          x: 960, y: below('s10-chart', { gap: 'xl' }), w: 1200, anchor: 'tc',
        }),
      ],
    },

    // ════════════════════════════════════════════════════════════════
    // SLIDE 11: C1 · CORE WORK — AI AS COLLABORATOR
    // ════════════════════════════════════════════════════════════════
    {
      id: 'core-work',
      background: C.bg,
      elements: [
        // ── Left column: text content ──
        vstack([
          // Eyebrow
          el(`<p style="font-family:${FONT_HEAD};font-size:22px;font-weight:600;color:${C.accent1};text-transform:uppercase;letter-spacing:0.12em;">C1 \u00B7 Core Work</p>`, {
            id: 's11-eyebrow',
          }),

          // Main headline
          el(`<h2 style="font-family:${FONT_HEAD};font-size:64px;font-weight:700;color:${C.text};line-height:1.1;text-transform:uppercase;">AI as Collaborator</h2>`, {
            id: 's11-headline',
          }),

          // Bullet list
          el(`<ul style="font-family:${FONT_BODY};font-size:24px;color:${C.muted};line-height:1.8;list-style:disc;padding-left:24px;">
            <li><strong style="color:${C.accent2};font-weight:600;">Workflow efficiency</strong> \u2014 automate boilerplate, scaffold code</li>
            <li><strong style="color:${C.accent2};font-weight:600;">Proactive quality</strong> \u2014 catch bugs before review</li>
            <li><strong style="color:${C.accent2};font-weight:600;">Cross-context awareness</strong> \u2014 surface relevant code &amp; docs</li>
          </ul>`, {
            id: 's11-bullets', w: 820,
          }),

          // Caveat line (rose)
          el(`<p style="font-family:${FONT_BODY};font-size:20px;font-weight:600;color:${C.accent3};line-height:1.5;">But: retain oversight \u00B7 decision control \u00B7 preserve craft</p>`, {
            id: 's11-caveat', w: 820,
          }),
        ], {
          id: 's11-text',
          x: left.x, y: 310, w: left.w,
          gap: 'md',
        }),

        // ── Right column: illustration ──
        el('<img src="assets/images/s11-core-work.png" style="width:100%;height:100%;object-fit:contain;">', {
          id: 's11-image',
          x: right.x, y: 160, w: right.w, h: 760,
        }),
      ],
    },

    // ════════════════════════════════════════════════════════════════
    // SLIDE 12: C3 · OPS & COORDINATION — AUTOMATE THE GRUNT WORK
    // ════════════════════════════════════════════════════════════════
    {
      id: 'ops-coordination',
      background: C.bg,
      elements: [
        // ── Left column: text content ──
        vstack([
          // Eyebrow
          el(`<p style="font-family:${FONT_HEAD};font-size:22px;font-weight:600;color:${C.accent1};text-transform:uppercase;letter-spacing:0.12em;">C3 \u00B7 Ops &amp; Coordination</p>`, {
            id: 's12-eyebrow',
          }),

          // Main headline
          el(`<h2 style="font-family:${FONT_HEAD};font-size:64px;font-weight:700;color:${C.text};line-height:1.1;text-transform:uppercase;">Automate the Grunt\u00a0Work</h2>`, {
            id: 's12-headline',
          }),

          // Bullet list
          el(`<ul style="font-family:${FONT_BODY};font-size:24px;color:${C.muted};line-height:1.8;list-style:disc;padding-left:24px;">
            <li><strong style="color:${C.accent2};font-weight:600;">Toil reduction</strong> \u2014 CI/CD, env setup, documentation</li>
            <li><strong style="color:${C.accent2};font-weight:600;">Pattern execution</strong> \u2014 repetitive, well-defined workflows</li>
          </ul>`, {
            id: 's12-bullets', w: 820,
          }),

          // Quote block
          panel([
            el(`<p style="font-family:${FONT_BODY};font-size:22px;font-style:italic;color:${C.text};line-height:1.5;">\u201CAnything that touches prod stays behind human\u00a0gates.\u201D</p>`, { w: 'fill' }),
            el(`<p style="font-family:${FONT_BODY};font-size:18px;color:${C.accent2};font-style:normal;">\u2014 P165</p>`, { w: 'fill' }),
          ], {
            id: 's12-quote',
            w: 760,
            padding: 20, gap: 'xs',
            fill: C.surface,
            radius: '0 8px 8px 0',
            style: {
              borderLeft: `3px solid ${C.accent1}`,
            },
          }),

          // Tagline (green keywords)
          el(`<p style="font-family:${FONT_BODY};font-size:20px;font-weight:600;color:${C.accent3};line-height:1.5;">Determinism \u00B7 Verifiability \u00B7 Human-gated</p>`, {
            id: 's12-tagline', w: 820,
          }),
        ], {
          id: 's12-text',
          x: left.x, y: 310, w: left.w,
          gap: 'md',
        }),

        // ── Right column: illustration ──
        el('<img src="assets/images/s12-ops.png" style="width:100%;height:100%;object-fit:contain;">', {
          id: 's12-image',
          x: right.x, y: 160, w: right.w, h: 760,
        }),
      ],
    },

    // ════════════════════════════════════════════════════════════════
    // SLIDE 13: C2 · PEOPLE & AI-BUILDING — KEEP IT HUMAN
    // ════════════════════════════════════════════════════════════════
    {
      id: 'keep-it-human',
      background: C.bg,
      elements: [
        // ── Left column: text content ──
        vstack([
          // Eyebrow
          el(`<p style="font-family:${FONT_HEAD};font-size:22px;font-weight:600;color:${C.accent1};text-transform:uppercase;letter-spacing:0.12em;">C2 \u00B7 People &amp; AI-Building</p>`, {
            id: 's13-eyebrow',
          }),

          // Main headline
          el(`<h2 style="font-family:${FONT_HEAD};font-size:64px;font-weight:700;color:${C.text};line-height:1.1;text-transform:uppercase;">Keep It Human</h2>`, {
            id: 's13-headline',
          }),

          // Body text
          el(`<p style="font-family:${FONT_BODY};font-size:24px;color:${C.muted};line-height:1.6;">Mentoring is about <strong style="color:${C.text};font-weight:600;">relationships</strong>, not information transfer. AI integration is <strong style="color:${C.text};font-weight:600;">craftwork</strong>.</p>`, {
            id: 's13-body', w: 820,
          }),

          // Quote block 1 (rose border) — "Relationships are important."
          panel([
            el(`<p style="font-family:${FONT_BODY};font-size:22px;font-style:italic;color:${C.text};line-height:1.5;">\u201CRelationships are important.\u201D</p>`, {
              id: 's13-q1-text', w: 'fill',
            }),
            el(`<p style="font-family:${FONT_BODY};font-size:18px;color:${C.accent2};font-weight:600;">\u2014 P85</p>`, {
              id: 's13-q1-attr', w: 'fill',
            }),
          ], {
            id: 's13-quote1',
            w: 760,
            padding: 20, gap: 'xs',
            fill: C.surface,
            radius: '0 8px 8px 0',
            style: {
              borderLeft: `3px solid ${C.accent3}`,
            },
          }),

          // Quote block 2 (green border) — "Mentoring teaches the mentor as well."
          panel([
            el(`<p style="font-family:${FONT_BODY};font-size:22px;font-style:italic;color:${C.text};line-height:1.5;">\u201CMentoring teaches the mentor as\u00a0well.\u201D</p>`, {
              id: 's13-q2-text', w: 'fill',
            }),
            el(`<p style="font-family:${FONT_BODY};font-size:18px;color:${C.accent2};font-weight:600;">\u2014 P228</p>`, {
              id: 's13-q2-attr', w: 'fill',
            }),
          ], {
            id: 's13-quote2',
            w: 760,
            padding: 20, gap: 'xs',
            fill: C.surface,
            radius: '0 8px 8px 0',
            style: {
              borderLeft: `3px solid ${C.accent2}`,
            },
          }),
        ], {
          id: 's13-text',
          x: left.x, y: 310, w: left.w,
          gap: 'md',
        }),

        // ── Right column: illustration ──
        el('<img src="assets/images/s13-people.png" style="width:100%;height:100%;object-fit:contain;">', {
          id: 's13-image',
          x: right.x, y: 160, w: right.w, h: 760,
        }),
      ],
    },

    // ════════════════════════════════════════════════════════════════
    // SLIDE 14: THE AUGMENTATION SPECTRUM
    // ════════════════════════════════════════════════════════════════
    {
      id: 'augmentation-spectrum',
      background: C.bg,
      elements: [
        // Eyebrow
        el(`<h3 style="font-family:${FONT_HEAD};font-size:28px;font-weight:600;color:${C.accent1};text-transform:uppercase;letter-spacing:0.12em;text-align:center;">Synthesis</h3>`, {
          id: 's14-eyebrow',
          x: 960, y: 220, w: 800, anchor: 'tc',
        }),

        // Main heading
        el(`<h2 style="font-family:${FONT_HEAD};font-size:64px;font-weight:700;color:${C.text};line-height:1.15;text-transform:uppercase;text-align:center;">The Augmentation Spectrum</h2>`, {
          id: 's14-headline',
          x: 960, y: below('s14-eyebrow', { gap: 12 }), w: 1200, anchor: 'tc',
        }),

        // ── Spectrum bar with emoji endpoints ──
        hstack([
          // Person emoji (left)
          el(`<span style="font-size:32px;line-height:1;">\uD83E\uDDD1\u200D\uD83D\uDCBB</span>`, {
            id: 's14-emoji-left', w: 40,
          }),

          // Gradient spectrum bar
          el(`<div style="height:8px;background:linear-gradient(to right, ${C.accent1}, ${C.accent2}, ${C.accent3});border-radius:4px;box-shadow:0 0 12px rgba(59,130,246,0.3);"></div>`, {
            id: 's14-bar', w: 1060, h: 8,
          }),

          // Robot emoji (right)
          el(`<span style="font-size:32px;line-height:1;">\uD83E\uDD16</span>`, {
            id: 's14-emoji-right', w: 40,
          }),
        ], {
          id: 's14-spectrum',
          x: 960, y: below('s14-headline', { gap: 'lg' }),
          anchor: 'tc',
          gap: 12,
          align: 'middle',
        }),

        // "Human-Led" label
        el(`<span style="font-family:${FONT_BODY};font-size:18px;color:${C.accent1};">Human-Led</span>`, {
          id: 's14-label-left',
          x: alignLeftWith('s14-emoji-left'), y: below('s14-spectrum', { gap: 6 }), w: 120,
        }),

        // "AI-Led" label
        el(`<span style="font-family:${FONT_BODY};font-size:18px;color:${C.accent3};">AI-Led</span>`, {
          id: 's14-label-right',
          x: alignLeftWith('s14-emoji-right'), y: below('s14-spectrum', { gap: 6 }), w: 80,
        }),

        // ── Three strategy cards ──
        hstack([
          // Card 1: Augment (blue)
          panel([
            el(`<p style="font-family:${FONT_BODY};font-size:28px;font-weight:700;color:${C.accent1};text-align:center;">Augment</p>`, {
              id: 's14-c1-title', w: 'fill',
            }),
            el(`<p style="font-family:${FONT_BODY};font-size:22px;font-weight:600;color:${C.text};text-align:center;">Core Work</p>`, {
              id: 's14-c1-what', w: 'fill',
            }),
            el(`<p style="font-family:${FONT_BODY};font-size:18px;color:${C.muted};line-height:1.5;text-align:center;">High value + identity<br>= AI as partner</p>`, {
              id: 's14-c1-desc', w: 'fill',
            }),
          ], {
            id: 's14-card-augment',
            w: 350,
            padding: 'md', gap: 'xs',
            fill: C.surface,
            radius: 10,
            border: `1px solid ${C.border}`,
            style: {
              borderBottom: `2px solid ${C.accent1}`,
            },
          }),

          // Card 2: Automate (green)
          panel([
            el(`<p style="font-family:${FONT_BODY};font-size:28px;font-weight:700;color:${C.accent2};text-align:center;">Automate</p>`, {
              id: 's14-c2-title', w: 'fill',
            }),
            el(`<p style="font-family:${FONT_BODY};font-size:22px;font-weight:600;color:${C.text};text-align:center;">Ops &amp; Coordination</p>`, {
              id: 's14-c2-what', w: 'fill',
            }),
            el(`<p style="font-family:${FONT_BODY};font-size:18px;color:${C.muted};line-height:1.5;text-align:center;">Low identity + high demands<br>= delegate toil</p>`, {
              id: 's14-c2-desc', w: 'fill',
            }),
          ], {
            id: 's14-card-automate',
            w: 350,
            padding: 'md', gap: 'xs',
            fill: C.surface,
            radius: 10,
            border: `1px solid ${C.border}`,
            style: {
              borderBottom: `2px solid ${C.accent2}`,
            },
          }),

          // Card 3: Resist (rose)
          panel([
            el(`<p style="font-family:${FONT_BODY};font-size:28px;font-weight:700;color:${C.accent3};text-align:center;">Resist</p>`, {
              id: 's14-c3-title', w: 'fill',
            }),
            el(`<p style="font-family:${FONT_BODY};font-size:22px;font-weight:600;color:${C.text};text-align:center;">People &amp; AI-Building</p>`, {
              id: 's14-c3-what', w: 'fill',
            }),
            el(`<p style="font-family:${FONT_BODY};font-size:18px;color:${C.muted};line-height:1.5;text-align:center;">High identity + relational<br>= keep human</p>`, {
              id: 's14-c3-desc', w: 'fill',
            }),
          ], {
            id: 's14-card-resist',
            w: 350,
            padding: 'md', gap: 'xs',
            fill: C.surface,
            radius: 10,
            border: `1px solid ${C.border}`,
            style: {
              borderBottom: `2px solid ${C.accent3}`,
            },
          }),
        ], {
          id: 's14-cards',
          x: 960, y: below('s14-label-left', { gap: 20 }),
          anchor: 'tc',
          gap: 'md',
          align: 'stretch',
        }),

        // Caption / takeaway
        el(`<p style="font-family:${FONT_BODY};font-size:28px;color:${C.muted};line-height:1.5;text-align:center;">Appraisal signatures determine where AI belongs on the spectrum.</p>`, {
          id: 's14-caption',
          x: 960, y: below('s14-cards', { gap: 36 }), w: 1200, anchor: 'tc',
        }),
      ],
    },

    // ════════════════════════════════════════════════════════════════
    // SLIDE 15: RAI PRIORITIES VARY BY TASK CONTEXT
    // ════════════════════════════════════════════════════════════════
    {
      id: 'rai-priorities',
      background: C.bg,
      elements: [
        // Eyebrow
        el(`<h3 style="font-family:${FONT_HEAD};font-size:28px;font-weight:600;color:${C.accent1};text-transform:uppercase;letter-spacing:0.12em;text-align:center;">RQ2 Results</h3>`, {
          id: 's15-eyebrow',
          x: 960, y: 90, w: 800, anchor: 'tc',
        }),

        // Main heading
        el(`<h2 style="font-family:${FONT_HEAD};font-size:60px;font-weight:700;color:${C.text};line-height:1.15;text-transform:uppercase;text-align:center;">RAI Priorities Vary by Task\u00a0Context</h2>`, {
          id: 's15-headline',
          x: 960, y: below('s15-eyebrow', { gap: 'sm' }), w: 1400, anchor: 'tc',
        }),

        // Figure container with chart image
        figure({
          id: 's15-fig',
          src: 'assets/images/paper_fig_p8_1.png',
          x: 960, y: below('s15-headline', { gap: 'md' }), w: 1100, h: 580,
          anchor: 'tc',
          containerFill: '#f8f9fa',
          containerRadius: 10,
          containerPadding: 10,
          fit: 'contain',
        }),

        // Caption
        el(`<p style="font-family:${FONT_BODY};font-size:28px;color:${C.muted};line-height:1.5;text-align:center;"><strong style="color:${C.accent1};font-weight:600;">Systems-facing:</strong> Reliability &amp; Safety (85%), Privacy (77%) &nbsp;\u2502&nbsp; <strong style="color:${C.accent2};font-weight:600;">Human-facing:</strong> Fairness elevated</p>`, {
          id: 's15-caption',
          x: 960, y: below('s15-fig', { gap: 'xl' }), w: 1400, anchor: 'tc',
        }),
      ],
    },

    // ════════════════════════════════════════════════════════════════
    // SLIDE 16: THREE DESIGN PRINCIPLES
    // ════════════════════════════════════════════════════════════════
    {
      id: 'design-principles',
      background: C.bg,
      elements: [
        // Eyebrow
        el(`<h3 style="font-family:${FONT_HEAD};font-size:28px;font-weight:600;color:${C.accent1};text-transform:uppercase;letter-spacing:0.12em;text-align:center;">Implications for Tool Builders</h3>`, {
          id: 's16-eyebrow',
          x: 960, y: 260, w: 800, anchor: 'tc',
        }),

        // Main heading
        el(`<h2 style="font-family:${FONT_HEAD};font-size:64px;font-weight:700;color:${C.text};line-height:1.15;text-transform:uppercase;text-align:center;">Three Design Principles</h2>`, {
          id: 's16-headline',
          x: 960, y: below('s16-eyebrow', { gap: 'sm' }), w: 1200, anchor: 'tc',
        }),

        // Three principle cards
        hstack([
          // ── Card 1: Task-Aware Personas (green) ──
          panel([
            el(`<div style="width:56px;height:56px;border-radius:50%;background:rgba(16,185,129,0.15);display:flex;align-items:center;justify-content:center;font-size:28px;">\uD83E\uDDD1\u200D\uD83D\uDCBB</div>`, {
              id: 's16-icon1', w: 'fill',
            }),
            el(`<p style="font-family:${FONT_BODY};font-size:24px;font-weight:600;color:${C.accent2};">Task-Aware Personas</p>`, {
              id: 's16-title1', w: 'fill',
            }),
            el(`<p style="font-family:${FONT_BODY};font-size:19px;color:${C.muted};line-height:1.5;">Exploration vs. implementation vs. review vs.\u00a0ops modes. Adapt AI behavior to task\u00a0context.</p>`, {
              id: 's16-desc1', w: 'fill',
            }),
          ], {
            id: 's16-card1',
            w: 340,
            padding: 'md', gap: 10,
            fill: C.surface,
            radius: 10,
            border: `1px solid ${C.border}`,
            style: {
              borderBottom: `3px solid ${C.accent2}`,
            },
          }),

          // ── Card 2: Human-Gated Control (amber) ──
          panel([
            el(`<div style="width:56px;height:56px;border-radius:50%;background:rgba(245,158,11,0.15);display:flex;align-items:center;justify-content:center;font-size:28px;">\uD83D\uDD12</div>`, {
              id: 's16-icon2', w: 'fill',
            }),
            el(`<p style="font-family:${FONT_BODY};font-size:24px;font-weight:600;color:#F59E0B;">Human-Gated Control</p>`, {
              id: 's16-title2', w: 'fill',
            }),
            el(`<p style="font-family:${FONT_BODY};font-size:19px;color:${C.muted};line-height:1.5;">Suggest-only flows, reversible changes, approval checkpoints. Never automate silently.</p>`, {
              id: 's16-desc2', w: 'fill',
            }),
          ], {
            id: 's16-card2',
            w: 340,
            padding: 'md', gap: 10,
            fill: C.surface,
            radius: 10,
            border: `1px solid ${C.border}`,
            style: {
              borderBottom: `3px solid #F59E0B`,
            },
          }),

          // ── Card 3: Augmentation, Not Automation (rose) ──
          panel([
            el(`<div style="width:56px;height:56px;border-radius:50%;background:rgba(244,63,94,0.15);display:flex;align-items:center;justify-content:center;font-size:28px;">\uD83E\uDDE0</div>`, {
              id: 's16-icon3', w: 'fill',
            }),
            el(`<p style="font-family:${FONT_BODY};font-size:24px;font-weight:600;color:${C.accent3};">Augmentation, Not Automation</p>`, {
              id: 's16-title3', w: 'fill',
            }),
            el(`<p style="font-family:${FONT_BODY};font-size:19px;color:${C.muted};line-height:1.5;">Preserve craft, reveal reasoning, prevent deskilling. Keep humans in the\u00a0loop.</p>`, {
              id: 's16-desc3', w: 'fill',
            }),
          ], {
            id: 's16-card3',
            w: 340,
            padding: 'md', gap: 10,
            fill: C.surface,
            radius: 10,
            border: `1px solid ${C.border}`,
            style: {
              borderBottom: `3px solid ${C.accent3}`,
            },
          }),
        ], {
          id: 's16-cards',
          x: 960, y: below('s16-headline', { gap: 36 }),
          anchor: 'tc',
          gap: 'md',
          align: 'stretch',
        }),
      ],
    },

    // ════════════════════════════════════════════════════════════════
    // SLIDE 17: CLOSING — DELIVER AI WHERE IT MATTERS
    // ════════════════════════════════════════════════════════════════
    {
      id: 'closing',
      background: C.bg,
      elements: [
        // ── Left column: text content ──
        vstack([
          // Eyebrow — "CLOSING"
          el(`<p style="font-family:${FONT_HEAD};font-size:22px;font-weight:600;color:${C.accent1};text-transform:uppercase;letter-spacing:0.12em;">Closing</p>`, {
            id: 's17-eyebrow',
          }),

          // Main headline with gradient (matches slide 1 gradient style)
          el(`<h1 style="font-family:${FONT_HEAD};font-size:96px;font-weight:900;line-height:1.05;text-transform:uppercase;background:linear-gradient(135deg, ${C.accent1}, ${C.accent2});-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">Deliver AI<br>Where It Matters</h1>`, {
            id: 's17-headline',
          }),

          // Subtitle / tagline
          el(`<p style="font-family:${FONT_BODY};font-size:30px;font-weight:300;color:${C.text};line-height:1.6;">Preserve agency. Foster expertise.<br>Sustain meaningful work.</p>`, {
            id: 's17-subtitle',
          }),

          // Footer line with link icon and URL
          el(`<p style="font-family:${FONT_BODY};font-size:20px;color:${C.muted};line-height:1.6;"><span style="color:${C.accent1};">\uD83D\uDCC4</span>\u00a0 Interactive diagrams, per-task reports &amp; chat with the research:\u00a0 <span style="color:${C.accent2};">aka.ms/AI-Where-It-Matters</span></p>`, {
            id: 's17-footer',
          }),
        ], {
          id: 's17-text',
          x: 120, y: 280, w: 850,
          gap: 'lg',
        }),

        // ── Right column: closing illustration ──
        el('<img src="assets/images/s17-closing.png" style="width:100%;height:100%;object-fit:contain;">', {
          id: 's17-image',
          x: 1040, y: 140, w: 780, h: 800,
        }),
      ],
    },

  ];

  return await render(slides);
}

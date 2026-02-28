// slides.js — ICSE 2026 presentation: "AI Where It Matters"
// BLED Minimalist Editorial aesthetic built with SlideKit

import {
  init, render, safeRect, measure,
  el, group,
  below, rightOf, centerHWith, alignTopWith,
  vstack, hstack,
} from '../slidekit/slidekit.js';

export async function run() {
  await init({
    slide: { w: 1920, h: 1080 },
    safeZone: { left: 170, right: 170, top: 100, bottom: 80 },
    minFontSize: 18,
    fonts: [
      { family: 'Playfair Display', weights: [400, 700], source: 'google' },
      { family: 'Inter', weights: [400, 500, 600, 700], source: 'google' },
    ],
  });

  const safe = safeRect();

  // ── Color palette ──
  const BLACK = '#000000';
  const DARK = '#1A1A1A';
  const GRAY = '#808080';
  const LIGHT_RULE = '#E5E5E5';
  const WHITE = '#FFFFFF';
  const TEAL = '#00C8B4';
  const DARK_RULE = '#333333';

  // ── Typography constants ──
  const SERIF = 'Playfair Display';
  const SANS = 'Inter';

  // ── Type scale (projection-optimized, 1920×1080 canvas) ──
  const SZ = {
    hero: 120,        // title slide, closing statement
    display: 64,      // large display (cluster numbers)
    title: 48,        // slide main titles
    subtitle: 36,     // secondary headings, section titles
    heading: 28,      // sub-headings, item titles within slides
    body: 24,         // body text, descriptions, explanations
    label: 20,        // section labels, category tags, legend labels
    caption: 18,      // attributions, footnotes — absolute minimum
  };

  // ── Split layout (D5) constants ──
  const HALF = 960;
  const R_PAD = 80;
  const R_X = HALF + R_PAD;
  const R_W = HALF - R_PAD * 2;

  // ── Reusable label+rule pattern for white content slides ──
  function sectionLabel(slidePrefix, labelText, x, y, w) {
    return [
      el(`<p style="font-size:${SZ.label}px; font-family:${SANS}; font-weight:600; color:${GRAY}; letter-spacing:0.15em">${labelText}</p>`, {
        id: `${slidePrefix}-label`,
        x, y, w,
      }),
      el('', {
        id: `${slidePrefix}-rule`,
        x, y: below(`${slidePrefix}-label`, { gap: 12 }),
        w: w || 600, h: 1,
        style: { background: LIGHT_RULE },
      }),
    ];
  }

  // Same for dark backgrounds
  function sectionLabelDark(slidePrefix, labelText, x, y, w) {
    return [
      el(`<p style="font-size:${SZ.label}px; font-family:${SANS}; font-weight:600; color:rgba(255,255,255,0.5); letter-spacing:0.15em">${labelText}</p>`, {
        id: `${slidePrefix}-label`,
        x, y, w,
      }),
      el('', {
        id: `${slidePrefix}-rule`,
        x, y: below(`${slidePrefix}-label`, { gap: 12 }),
        w: w || 600, h: 1,
        style: { background: DARK_RULE },
      }),
    ];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SLIDE 1: Title (D1 — full-bleed dark photo)
  // ═══════════════════════════════════════════════════════════════════════════

  const slide01 = {
    id: 's01-title',
    background: 'assets/title-bg.png',
    elements: [
      // Dark overlay for text legibility
      el('', {
        id: 's01-overlay',
        x: 0, y: 0, w: 1920, h: 1080,
        layer: 'bg',
        style: { background: 'rgba(0,0,0,0.35)' },
      }),

      // Main title
      el(`<p style="font-size:140px; font-family:${SERIF}; font-weight:700; color:${WHITE}; line-height:0.92; letter-spacing:0.03em">AI WHERE<br>IT MATTERS</p>`, {
        id: 's01-title',
        x: safe.x, y: 320, w: 1200,
      }),

      // Subtitle
      el(`<p style="font-size:${SZ.label}px; font-family:${SANS}; font-weight:500; color:rgba(255,255,255,0.6); letter-spacing:0.12em; line-height:1.6">WHERE, WHY, AND HOW DEVELOPERS WANT AI SUPPORT</p>`, {
        id: 's01-subtitle',
        x: safe.x, y: below('s01-title', { gap: 32 }),
        w: 1000,
      }),

      // Conference + authors (bottom-left, single line)
      el(`<p style="font-size:${SZ.caption}px; font-family:${SANS}; font-weight:400; color:rgba(255,255,255,0.4); letter-spacing:0.06em">ICSE 2026  \u00B7  Choudhuri, Badea, Bird, Butler, DeLine, Houck</p>`, {
        id: 's01-credits',
        x: safe.x, y: 960,
        w: 900,
      }),
    ],
    notes: 'Opening slide. Title of the paper, authors, conference.',
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // SLIDE 2: The Tension (D2 — big typography over dark photo)
  // ═══════════════════════════════════════════════════════════════════════════

  // Measure "WORK" to position the teal asterisk precisely
  const workMeasure = await measure(
    `<p style="font-size:180px; font-family:${SERIF}; font-weight:700; letter-spacing:0.02em">WORK</p>`
  );
  const asteriskX = safe.x + workMeasure.w;
  // Second line y = hero y + first line height (size * lineHeight)
  const heroY = 200;
  const line2Y = heroY + 180 * 0.95;

  const slide02 = {
    id: 's02-tension',
    background: 'assets/tension-bg.png',
    elements: [
      // Dark overlay
      el('', {
        id: 's02-overlay',
        x: 0, y: 0, w: 1920, h: 1080,
        layer: 'bg',
        style: { background: 'rgba(0,0,0,0.55)' },
      }),

      // Hero text — two lines with tight leading
      el(`<p style="font-size:180px; font-family:${SERIF}; font-weight:700; color:${WHITE}; letter-spacing:0.02em; line-height:0.95">THE RIGHT<br>WORK</p>`, {
        id: 's02-hero',
        x: safe.x, y: heroY,
        w: 1600,
      }),

      // Teal asterisk — positioned at end of "WORK" on line 2
      el(`<p style="font-size:180px; font-family:${SERIF}; font-weight:700; color:${TEAL}; line-height:0.95">*</p>`, {
        id: 's02-asterisk',
        x: asteriskX, y: line2Y,
      }),

      // Body text (bottom-left)
      el(`<p style="font-size:${SZ.body}px; font-family:${SANS}; font-weight:400; color:rgba(255,255,255,0.6); line-height:1.6">AI tools promise faster delivery \u2014<br>but are they optimizing the right tasks?</p>`, {
        id: 's02-body',
        x: safe.x, y: 860,
        w: safe.w * 0.55,
      }),
    ],
    notes: 'Set up the core problem \u2014 AI adoption is widespread but not strategic. The adoption paradox.',
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // SLIDE 3: Research Questions (D5 — split layout)
  // ═══════════════════════════════════════════════════════════════════════════

  const slide03 = {
    id: 's03-rqs',
    background: WHITE,
    elements: [
      // Left half: photo
      el('<img src="assets/inquiry-photo.png" style="width:100%;height:100%;object-fit:cover">', {
        id: 's03-photo',
        x: 0, y: 0, w: HALF, h: 1080,
        layer: 'bg',
      }),

      // Right half content
      ...sectionLabel('s03', 'RESEARCH QUESTIONS', R_X, 100, R_W),

      // RQ1
      el(`<p style="font-size:${SZ.title}px; font-family:${SERIF}; font-weight:700; color:${BLACK}">01</p>`, {
        id: 's03-rq1-num',
        x: R_X, y: below('s03-rule', { gap: 40 }),
      }),
      el(`<p style="font-size:${SZ.heading}px; font-family:${SERIF}; font-weight:700; color:${BLACK}; line-height:1.3">How do task appraisals shape openness to AI?</p>`, {
        id: 's03-rq1-text',
        x: R_X + 80, y: alignTopWith('s03-rq1-num'),
        w: R_W - 80,
      }),
      el(`<p style="font-size:${SZ.body}px; font-family:${SANS}; font-weight:400; color:${GRAY}; line-height:1.5">Cognitive appraisal theory applied to 20 SE tasks</p>`, {
        id: 's03-rq1-sub',
        x: R_X + 80, y: below('s03-rq1-text', { gap: 12 }),
        w: R_W - 80,
      }),

      // RQ2
      el(`<p style="font-size:${SZ.title}px; font-family:${SERIF}; font-weight:700; color:${BLACK}">02</p>`, {
        id: 's03-rq2-num',
        x: R_X, y: below('s03-rq1-sub', { gap: 48 }),
      }),
      el(`<p style="font-size:${SZ.heading}px; font-family:${SERIF}; font-weight:700; color:${BLACK}; line-height:1.3">Which RAI principles do developers prioritize?</p>`, {
        id: 's03-rq2-text',
        x: R_X + 80, y: alignTopWith('s03-rq2-num'),
        w: R_W - 80,
      }),
      el(`<p style="font-size:${SZ.body}px; font-family:${SANS}; font-weight:400; color:${GRAY}; line-height:1.5">8 Responsible AI principles across 5 task categories</p>`, {
        id: 's03-rq2-sub',
        x: R_X + 80, y: below('s03-rq2-text', { gap: 12 }),
        w: R_W - 80,
      }),
    ],
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // SLIDE 4: Appraisal Framework (D5 — split layout)
  // ═══════════════════════════════════════════════════════════════════════════

  const driverGap = 48;

  const slide04 = {
    id: 's04-framework',
    background: WHITE,
    elements: [
      el('<img src="assets/framework-photo.png" style="width:100%;height:100%;object-fit:cover">', {
        id: 's04-photo',
        x: 0, y: 0, w: HALF, h: 1080,
        layer: 'bg',
      }),

      ...sectionLabel('s04', 'THEORETICAL FRAMEWORK', R_X, 100, R_W),

      el(`<p style="font-size:${SZ.subtitle}px; font-family:${SERIF}; font-weight:700; color:${BLACK}">Cognitive Appraisal Theory</p>`, {
        id: 's04-title',
        x: R_X, y: below('s04-rule', { gap: 24 }),
        w: R_W,
      }),

      // Driver 1: VALUE
      el(`<p style="font-size:${SZ.label}px; font-family:${SANS}; font-weight:700; color:${BLACK}; letter-spacing:0.12em">VALUE</p>`, {
        id: 's04-d1-label',
        x: R_X, y: below('s04-title', { gap: 48 }),
      }),
      el('', {
        id: 's04-d1-rule',
        x: R_X, y: below('s04-d1-label', { gap: 8 }),
        w: R_W * 0.4, h: 1,
        style: { background: LIGHT_RULE },
      }),
      el(`<p style="font-size:${SZ.body}px; font-family:${SANS}; font-weight:400; color:${GRAY}; line-height:1.5">How important is this task to my goals?</p>`, {
        id: 's04-d1-desc',
        x: R_X, y: below('s04-d1-rule', { gap: 8 }),
        w: R_W,
      }),

      // Driver 2: IDENTITY
      el(`<p style="font-size:${SZ.label}px; font-family:${SANS}; font-weight:700; color:${BLACK}; letter-spacing:0.12em">IDENTITY</p>`, {
        id: 's04-d2-label',
        x: R_X, y: below('s04-d1-desc', { gap: driverGap }),
      }),
      el('', {
        id: 's04-d2-rule',
        x: R_X, y: below('s04-d2-label', { gap: 8 }),
        w: R_W * 0.4, h: 1,
        style: { background: LIGHT_RULE },
      }),
      el(`<p style="font-size:${SZ.body}px; font-family:${SANS}; font-weight:400; color:${GRAY}; line-height:1.5">How central is this task to who I am as a developer?</p>`, {
        id: 's04-d2-desc',
        x: R_X, y: below('s04-d2-rule', { gap: 8 }),
        w: R_W,
      }),

      // Driver 3: ACCOUNTABILITY
      el(`<p style="font-size:${SZ.label}px; font-family:${SANS}; font-weight:700; color:${BLACK}; letter-spacing:0.12em">ACCOUNTABILITY</p>`, {
        id: 's04-d3-label',
        x: R_X, y: below('s04-d2-desc', { gap: driverGap }),
      }),
      el('', {
        id: 's04-d3-rule',
        x: R_X, y: below('s04-d3-label', { gap: 8 }),
        w: R_W * 0.4, h: 1,
        style: { background: LIGHT_RULE },
      }),
      el(`<p style="font-size:${SZ.body}px; font-family:${SANS}; font-weight:400; color:${GRAY}; line-height:1.5">How responsible am I for the outcome?</p>`, {
        id: 's04-d3-desc',
        x: R_X, y: below('s04-d3-rule', { gap: 8 }),
        w: R_W,
      }),

      // Driver 4: DEMANDS
      el(`<p style="font-size:${SZ.label}px; font-family:${SANS}; font-weight:700; color:${BLACK}; letter-spacing:0.12em">DEMANDS</p>`, {
        id: 's04-d4-label',
        x: R_X, y: below('s04-d3-desc', { gap: driverGap }),
      }),
      el('', {
        id: 's04-d4-rule',
        x: R_X, y: below('s04-d4-label', { gap: 8 }),
        w: R_W * 0.4, h: 1,
        style: { background: LIGHT_RULE },
      }),
      el(`<p style="font-size:${SZ.body}px; font-family:${SANS}; font-weight:400; color:${GRAY}; line-height:1.5">How much effort and cognitive load does this require?</p>`, {
        id: 's04-d4-desc',
        x: R_X, y: below('s04-d4-rule', { gap: 8 }),
        w: R_W,
      }),
    ],
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // SLIDE 5: Method (D5 — split layout with stacked stats)
  // ═══════════════════════════════════════════════════════════════════════════

  const slide05 = {
    id: 's05-method',
    background: WHITE,
    elements: [
      el('<img src="assets/survey-photo.png" style="width:100%;height:100%;object-fit:cover">', {
        id: 's05-photo',
        x: 0, y: 0, w: HALF, h: 1080,
        layer: 'bg',
      }),

      ...sectionLabel('s05', 'METHODOLOGY', R_X, 100, R_W),

      // Stat 1: 860
      el(`<p style="font-size:72px; font-family:${SERIF}; font-weight:700; color:${BLACK}">860</p>`, {
        id: 's05-stat1-num',
        x: R_X, y: below('s05-rule', { gap: 56 }),
      }),
      el(`<p style="font-size:${SZ.caption}px; font-family:${SANS}; font-weight:600; color:${GRAY}; letter-spacing:0.15em">DEVELOPERS</p>`, {
        id: 's05-stat1-label',
        x: R_X + 8, y: below('s05-stat1-num', { gap: 4 }),
      }),

      // Stat 2: 20
      el(`<p style="font-size:72px; font-family:${SERIF}; font-weight:700; color:${BLACK}">20</p>`, {
        id: 's05-stat2-num',
        x: R_X, y: below('s05-stat1-label', { gap: 40 }),
      }),
      el(`<p style="font-size:${SZ.caption}px; font-family:${SANS}; font-weight:600; color:${GRAY}; letter-spacing:0.15em">SE TASKS</p>`, {
        id: 's05-stat2-label',
        x: R_X + 8, y: below('s05-stat2-num', { gap: 4 }),
      }),

      // Stat 3: 3,981
      el(`<p style="font-size:72px; font-family:${SERIF}; font-weight:700; color:${BLACK}">3,981</p>`, {
        id: 's05-stat3-num',
        x: R_X, y: below('s05-stat2-label', { gap: 40 }),
      }),
      el(`<p style="font-size:${SZ.caption}px; font-family:${SANS}; font-weight:600; color:${GRAY}; letter-spacing:0.15em">QUALITATIVE RESPONSES</p>`, {
        id: 's05-stat3-label',
        x: R_X + 8, y: below('s05-stat3-num', { gap: 4 }),
      }),

      // Method note
      el(`<p style="font-size:${SZ.body}px; font-family:${SANS}; font-weight:400; color:${GRAY}; line-height:1.5">Mixed-methods survey at Microsoft, 6 continents</p>`, {
        id: 's05-note',
        x: R_X, y: below('s05-stat3-label', { gap: 48 }),
        w: R_W,
      }),
    ],
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // SLIDE 6: Task Taxonomy (D5 — split layout)
  // ═══════════════════════════════════════════════════════════════════════════

  const catGap = 36;

  const slide06 = {
    id: 's06-taxonomy',
    background: WHITE,
    elements: [
      el('<img src="assets/taxonomy-photo.png" style="width:100%;height:100%;object-fit:cover">', {
        id: 's06-photo',
        x: 0, y: 0, w: HALF, h: 1080,
        layer: 'bg',
      }),

      ...sectionLabel('s06', 'TASK LANDSCAPE', R_X, 100, R_W),

      el(`<p style="font-size:${SZ.subtitle}px; font-family:${SERIF}; font-weight:700; color:${BLACK}">20 SE Tasks</p>`, {
        id: 's06-title',
        x: R_X, y: below('s06-rule', { gap: 24 }),
        w: R_W,
      }),

      // Category 1
      el(`<p style="font-size:${SZ.label}px; font-family:${SANS}; font-weight:700; color:${BLACK}; letter-spacing:0.12em">DEVELOPMENT</p>`, {
        id: 's06-c1',
        x: R_X, y: below('s06-title', { gap: 40 }),
      }),
      el(`<p style="font-size:${SZ.body}px; font-family:${SANS}; font-weight:400; color:${GRAY}">Coding, debugging, testing, code review</p>`, {
        id: 's06-c1-tasks',
        x: R_X, y: below('s06-c1', { gap: 6 }),
        w: R_W,
      }),

      // Category 2
      el(`<p style="font-size:${SZ.label}px; font-family:${SANS}; font-weight:700; color:${BLACK}; letter-spacing:0.12em">DESIGN & PLANNING</p>`, {
        id: 's06-c2',
        x: R_X, y: below('s06-c1-tasks', { gap: catGap }),
      }),
      el(`<p style="font-size:${SZ.body}px; font-family:${SANS}; font-weight:400; color:${GRAY}">System design, requirements, architecture</p>`, {
        id: 's06-c2-tasks',
        x: R_X, y: below('s06-c2', { gap: 6 }),
        w: R_W,
      }),

      // Category 3
      el(`<p style="font-size:${SZ.label}px; font-family:${SANS}; font-weight:700; color:${BLACK}; letter-spacing:0.12em">QUALITY & RISK</p>`, {
        id: 's06-c3',
        x: R_X, y: below('s06-c2-tasks', { gap: catGap }),
      }),
      el(`<p style="font-size:${SZ.body}px; font-family:${SANS}; font-weight:400; color:${GRAY}">Security, reliability, compliance, risk assessment</p>`, {
        id: 's06-c3-tasks',
        x: R_X, y: below('s06-c3', { gap: 6 }),
        w: R_W,
      }),

      // Category 4
      el(`<p style="font-size:${SZ.label}px; font-family:${SANS}; font-weight:700; color:${BLACK}; letter-spacing:0.12em">INFRASTRUCTURE & OPS</p>`, {
        id: 's06-c4',
        x: R_X, y: below('s06-c3-tasks', { gap: catGap }),
      }),
      el(`<p style="font-size:${SZ.body}px; font-family:${SANS}; font-weight:400; color:${GRAY}">CI/CD, environment setup, DevOps, monitoring</p>`, {
        id: 's06-c4-tasks',
        x: R_X, y: below('s06-c4', { gap: 6 }),
        w: R_W,
      }),

      // Category 5
      el(`<p style="font-size:${SZ.label}px; font-family:${SANS}; font-weight:700; color:${BLACK}; letter-spacing:0.12em">META-WORK</p>`, {
        id: 's06-c5',
        x: R_X, y: below('s06-c4-tasks', { gap: catGap }),
      }),
      el(`<p style="font-size:${SZ.body}px; font-family:${SANS}; font-weight:400; color:${GRAY}">Documentation, mentoring, customer support, AI integration</p>`, {
        id: 's06-c5-tasks',
        x: R_X, y: below('s06-c5', { gap: 6 }),
        w: R_W,
      }),
    ],
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // SLIDE 7: Appraisals Predict AI Adoption (D3 — white content)
  // ═══════════════════════════════════════════════════════════════════════════

  const hGap = 56;

  const slide07 = {
    id: 's07-regression',
    background: WHITE,
    elements: [
      ...sectionLabel('s07', 'KEY FINDING', safe.x, 100, safe.w),

      el(`<p style="font-size:${SZ.title}px; font-family:${SERIF}; font-weight:700; color:${BLACK}; line-height:1.2">All Four Appraisals<br>Predict AI Adoption</p>`, {
        id: 's07-title',
        x: safe.x, y: below('s07-rule', { gap: 24 }),
        w: safe.w * 0.6,
      }),

      // Hypothesis results — large sign + driver name
      el(`<p style="font-size:${SZ.title}px; font-family:${SERIF}; font-weight:700; color:${BLACK}">+</p>`, {
        id: 's07-h1-sign',
        x: safe.x, y: below('s07-title', { gap: 56 }),
      }),
      el(`<p style="font-size:${SZ.label}px; font-family:${SANS}; font-weight:700; color:${BLACK}; letter-spacing:0.1em; line-height:3">VALUE</p>`, {
        id: 's07-h1-label',
        x: safe.x + 60, y: alignTopWith('s07-h1-sign'),
      }),
      el(`<p style="font-size:${SZ.body}px; font-family:${SANS}; font-weight:400; color:${GRAY}">Higher task value \u2192 greater openness and usage</p>`, {
        id: 's07-h1-desc',
        x: safe.x + 60, y: below('s07-h1-label', { gap: 4 }),
        w: safe.w * 0.5,
      }),

      el(`<p style="font-size:${SZ.title}px; font-family:${SERIF}; font-weight:700; color:${BLACK}">\u00B1</p>`, {
        id: 's07-h2-sign',
        x: safe.x, y: below('s07-h1-desc', { gap: hGap }),
      }),
      el(`<p style="font-size:${SZ.label}px; font-family:${SANS}; font-weight:700; color:${BLACK}; letter-spacing:0.1em; line-height:3">IDENTITY</p>`, {
        id: 's07-h2-label',
        x: safe.x + 60, y: alignTopWith('s07-h2-sign'),
      }),
      el(`<p style="font-size:${SZ.body}px; font-family:${SANS}; font-weight:400; color:${TEAL}">Dual effect: lower openness, higher usage</p>`, {
        id: 's07-h2-desc',
        x: safe.x + 60, y: below('s07-h2-label', { gap: 4 }),
        w: safe.w * 0.5,
      }),

      el(`<p style="font-size:${SZ.title}px; font-family:${SERIF}; font-weight:700; color:${BLACK}">+</p>`, {
        id: 's07-h3-sign',
        x: safe.x, y: below('s07-h2-desc', { gap: hGap }),
      }),
      el(`<p style="font-size:${SZ.label}px; font-family:${SANS}; font-weight:700; color:${BLACK}; letter-spacing:0.1em; line-height:3">ACCOUNTABILITY</p>`, {
        id: 's07-h3-label',
        x: safe.x + 60, y: alignTopWith('s07-h3-sign'),
      }),
      el(`<p style="font-size:${SZ.body}px; font-family:${SANS}; font-weight:400; color:${GRAY}">Higher responsibility \u2192 seek AI as safety net</p>`, {
        id: 's07-h3-desc',
        x: safe.x + 60, y: below('s07-h3-label', { gap: 4 }),
        w: safe.w * 0.5,
      }),

      el(`<p style="font-size:${SZ.title}px; font-family:${SERIF}; font-weight:700; color:${BLACK}">+</p>`, {
        id: 's07-h4-sign',
        x: safe.x, y: below('s07-h3-desc', { gap: hGap }),
      }),
      el(`<p style="font-size:${SZ.label}px; font-family:${SANS}; font-weight:700; color:${BLACK}; letter-spacing:0.1em; line-height:3">DEMANDS</p>`, {
        id: 's07-h4-label',
        x: safe.x + 60, y: alignTopWith('s07-h4-sign'),
      }),
      el(`<p style="font-size:${SZ.body}px; font-family:${SANS}; font-weight:400; color:${GRAY}">Higher cognitive load \u2192 welcome AI relief</p>`, {
        id: 's07-h4-desc',
        x: safe.x + 60, y: below('s07-h4-label', { gap: 4 }),
        w: safe.w * 0.5,
      }),
    ],
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // SLIDE 8: The Identity Dual Pattern (D5 — split layout with quotes)
  // ═══════════════════════════════════════════════════════════════════════════

  const slide08 = {
    id: 's08-identity',
    background: WHITE,
    elements: [
      el('<img src="assets/identity-photo.png" style="width:100%;height:100%;object-fit:cover">', {
        id: 's08-photo',
        x: 0, y: 0, w: HALF, h: 1080,
        layer: 'bg',
      }),

      ...sectionLabel('s08', 'THE IDENTITY PARADOX', R_X, 100, R_W),

      // Quote 1
      el(`<p style="font-size:${SZ.heading}px; font-family:${SERIF}; font-weight:400; color:${BLACK}; line-height:1.45">\u201CI do not want AI to handle writing code for me. That\u2019s the part I enjoy.\u201D</p>`, {
        id: 's08-quote1',
        x: R_X, y: below('s08-rule', { gap: 48 }),
        w: R_W,
      }),
      el(`<p style="font-size:${SZ.caption}px; font-family:${SANS}; font-weight:600; color:${GRAY}; letter-spacing:0.1em">\u2014 P110, SENIOR DEVELOPER</p>`, {
        id: 's08-attr1',
        x: R_X, y: below('s08-quote1', { gap: 16 }),
      }),

      // Thin separator
      el('', {
        id: 's08-sep',
        x: R_X, y: below('s08-attr1', { gap: 48 }),
        w: 60, h: 1,
        style: { background: LIGHT_RULE },
      }),

      // Quote 2
      el(`<p style="font-size:${SZ.body}px; font-family:${SERIF}; font-weight:400; color:${DARK}; line-height:1.5">\u201CAI should enhance human engineers\u2019 learning, not replace tasks that allow them to become better.\u201D</p>`, {
        id: 's08-quote2',
        x: R_X, y: below('s08-sep', { gap: 48 }),
        w: R_W,
      }),
      el(`<p style="font-size:${SZ.caption}px; font-family:${SANS}; font-weight:600; color:${GRAY}; letter-spacing:0.1em">\u2014 P16</p>`, {
        id: 's08-attr2',
        x: R_X, y: below('s08-quote2', { gap: 16 }),
      }),
    ],
    notes: 'Identity shows a dual pattern: lower openness (\u03B2=-.09) but higher usage (\u03B2=.15). Developers protect their craft identity while pragmatically using AI.',
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // SLIDE 9: Three Task Clusters (D4 — full-bleed dark photo with overlay)
  // ═══════════════════════════════════════════════════════════════════════════

  const colW = 440;
  const col1X = 170;
  const col2X = 170 + colW + 80;
  const col3X = 170 + (colW + 80) * 2;
  const colY = 380;

  const slide09 = {
    id: 's09-clusters',
    background: 'assets/clusters-bg.png',
    elements: [
      // Dark overlay
      el('', {
        id: 's09-overlay',
        x: 0, y: 0, w: 1920, h: 1080,
        layer: 'bg',
        style: { background: 'rgba(0,0,0,0.6)' },
      }),

      ...sectionLabelDark('s09', 'CLUSTER ANALYSIS', safe.x, 100, safe.w),

      // Column 1: Core Work
      el(`<p style="font-size:${SZ.display}px; font-family:${SERIF}; font-weight:700; color:${WHITE}">C1</p>`, {
        id: 's09-c1-num',
        x: col1X, y: colY,
      }),
      el(`<p style="font-size:${SZ.label}px; font-family:${SANS}; font-weight:600; color:rgba(255,255,255,0.7); letter-spacing:0.15em">CORE WORK</p>`, {
        id: 's09-c1-name',
        x: col1X, y: below('s09-c1-num', { gap: 8 }),
      }),
      el(`<p style="font-size:${SZ.body}px; font-family:${SANS}; font-weight:400; color:rgba(255,255,255,0.55); line-height:1.6">Coding, debugging, testing,<br>code review, system design<br><br>High value & demands<br>Strong AI appetite \u2014<br>but identity constrains delegation</p>`, {
        id: 's09-c1-desc',
        x: col1X, y: below('s09-c1-name', { gap: 20 }),
        w: colW,
      }),

      // Vertical rule 1
      el('', {
        id: 's09-vr1',
        x: col1X + colW + 40, y: colY,
        w: 1, h: 380,
        style: { background: DARK_RULE },
      }),

      // Column 2: People & AI-Building
      el(`<p style="font-size:${SZ.display}px; font-family:${SERIF}; font-weight:700; color:${WHITE}">C2</p>`, {
        id: 's09-c2-num',
        x: col2X, y: colY,
      }),
      el(`<p style="font-size:${SZ.label}px; font-family:${SANS}; font-weight:600; color:rgba(255,255,255,0.7); letter-spacing:0.15em">PEOPLE & AI-BUILDING</p>`, {
        id: 's09-c2-name',
        x: col2X, y: below('s09-c2-num', { gap: 8 }),
      }),
      el(`<p style="font-size:${SZ.body}px; font-family:${SANS}; font-weight:400; color:rgba(255,255,255,0.55); line-height:1.6">Mentoring, AI integration<br><br>Strong identity<br>AI largely resisted \u2014<br>relationships are irreducibly human</p>`, {
        id: 's09-c2-desc',
        x: col2X, y: below('s09-c2-name', { gap: 20 }),
        w: colW,
      }),

      // Vertical rule 2
      el('', {
        id: 's09-vr2',
        x: col2X + colW + 40, y: colY,
        w: 1, h: 380,
        style: { background: DARK_RULE },
      }),

      // Column 3: Ops & Coordination
      el(`<p style="font-size:${SZ.display}px; font-family:${SERIF}; font-weight:700; color:${WHITE}">C3</p>`, {
        id: 's09-c3-num',
        x: col3X, y: colY,
      }),
      el(`<p style="font-size:${SZ.label}px; font-family:${SANS}; font-weight:600; color:rgba(255,255,255,0.7); letter-spacing:0.15em">OPS & COORDINATION</p>`, {
        id: 's09-c3-name',
        x: col3X, y: below('s09-c3-num', { gap: 8 }),
      }),
      el(`<p style="font-size:${SZ.body}px; font-family:${SANS}; font-weight:400; color:rgba(255,255,255,0.55); line-height:1.6">DevOps, env setup,<br>documentation, customer support<br><br>Low identity<br>AI welcome for toil reduction \u2014<br>but reliability first</p>`, {
        id: 's09-c3-desc',
        x: col3X, y: below('s09-c3-name', { gap: 20 }),
        w: colW,
      }),
    ],
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // SLIDE 10: The Quadrant Map (D3 — white content with figure)
  // ═══════════════════════════════════════════════════════════════════════════

  const slide10 = {
    id: 's10-quadrant',
    background: WHITE,
    elements: [
      ...sectionLabel('s10', 'NEED VS. USE', safe.x, 100, safe.w),

      el(`<p style="font-size:${SZ.subtitle}px; font-family:${SERIF}; font-weight:700; color:${BLACK}">Where AI Support Is Needed vs. Used</p>`, {
        id: 's10-title',
        x: safe.x, y: below('s10-rule', { gap: 24 }),
        w: safe.w * 0.7,
      }),

      // Paper figure
      el('<img src="assets/quadrant-map.png" style="width:100%;height:100%;object-fit:contain">', {
        id: 's10-figure',
        x: safe.x, y: below('s10-title', { gap: 32 }),
        w: safe.w * 0.65,
        h: 620,
      }),

      // Quadrant legend (right side)
      el(`<p style="font-size:${SZ.label}px; font-family:${SANS}; font-weight:700; color:${BLACK}; letter-spacing:0.1em">BUILD</p>`, {
        id: 's10-q1',
        x: safe.x + safe.w * 0.72, y: below('s10-title', { gap: 60 }),
      }),
      el(`<p style="font-size:${SZ.body}px; font-family:${SANS}; font-weight:400; color:${GRAY}">High need, low use \u2014 invest here</p>`, {
        id: 's10-q1-desc',
        x: safe.x + safe.w * 0.72, y: below('s10-q1', { gap: 6 }),
        w: 340,
      }),

      el(`<p style="font-size:${SZ.label}px; font-family:${SANS}; font-weight:700; color:${BLACK}; letter-spacing:0.1em">IMPROVE</p>`, {
        id: 's10-q2',
        x: safe.x + safe.w * 0.72, y: below('s10-q1-desc', { gap: 32 }),
      }),
      el(`<p style="font-size:${SZ.body}px; font-family:${SANS}; font-weight:400; color:${GRAY}">High need, high use \u2014 refine tools</p>`, {
        id: 's10-q2-desc',
        x: safe.x + safe.w * 0.72, y: below('s10-q2', { gap: 6 }),
        w: 340,
      }),

      el(`<p style="font-size:${SZ.label}px; font-family:${SANS}; font-weight:700; color:${BLACK}; letter-spacing:0.1em">SUSTAIN</p>`, {
        id: 's10-q3',
        x: safe.x + safe.w * 0.72, y: below('s10-q2-desc', { gap: 32 }),
      }),
      el(`<p style="font-size:${SZ.body}px; font-family:${SANS}; font-weight:400; color:${GRAY}">Low need, high use \u2014 maintain</p>`, {
        id: 's10-q3-desc',
        x: safe.x + safe.w * 0.72, y: below('s10-q3', { gap: 6 }),
        w: 340,
      }),

      el(`<p style="font-size:${SZ.label}px; font-family:${SANS}; font-weight:700; color:${BLACK}; letter-spacing:0.1em">DE-PRIORITIZE</p>`, {
        id: 's10-q4',
        x: safe.x + safe.w * 0.72, y: below('s10-q3-desc', { gap: 32 }),
      }),
      el(`<p style="font-size:${SZ.body}px; font-family:${SANS}; font-weight:400; color:${GRAY}">Low need, low use \u2014 redirect effort</p>`, {
        id: 's10-q4-desc',
        x: safe.x + safe.w * 0.72, y: below('s10-q4', { gap: 6 }),
        w: 340,
      }),
    ],
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // SLIDE 11: Core Work (D5 — split layout)
  // ═══════════════════════════════════════════════════════════════════════════

  const slide11 = {
    id: 's11-core-work',
    background: WHITE,
    elements: [
      el('<img src="assets/core-work-photo.png" style="width:100%;height:100%;object-fit:cover">', {
        id: 's11-photo',
        x: 0, y: 0, w: HALF, h: 1080,
        layer: 'bg',
      }),

      ...sectionLabel('s11', 'CORE WORK \u2014 C1', R_X, 100, R_W),

      el(`<p style="font-size:${SZ.title}px; font-family:${SERIF}; font-weight:700; color:${BLACK}; line-height:1.15">Augment,<br>Don\u2019t Replace</p>`, {
        id: 's11-title',
        x: R_X, y: below('s11-rule', { gap: 24 }),
        w: R_W,
      }),

      el(`<p style="font-size:${SZ.body}px; font-family:${SANS}; font-weight:400; color:${GRAY}; line-height:1.7">Workflow efficiency.<br>Proactive quality.<br>Cross-context awareness.</p>`, {
        id: 's11-want',
        x: R_X, y: below('s11-title', { gap: 40 }),
        w: R_W,
      }),

      el('', {
        id: 's11-sep',
        x: R_X, y: below('s11-want', { gap: 32 }),
        w: 60, h: 1,
        style: { background: LIGHT_RULE },
      }),

      el(`<p style="font-size:${SZ.body}px; font-family:${SANS}; font-weight:500; color:${DARK}; line-height:1.7">But: retain oversight,<br>decision control, preserve craft.</p>`, {
        id: 's11-but',
        x: R_X, y: below('s11-sep', { gap: 32 }),
        w: R_W,
      }),
    ],
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // SLIDE 12: Ops & Coordination (D5 — split layout)
  // ═══════════════════════════════════════════════════════════════════════════

  const slide12 = {
    id: 's12-ops',
    background: WHITE,
    elements: [
      el('<img src="assets/ops-photo.png" style="width:100%;height:100%;object-fit:cover">', {
        id: 's12-photo',
        x: 0, y: 0, w: HALF, h: 1080,
        layer: 'bg',
      }),

      ...sectionLabel('s12', 'OPS & COORDINATION \u2014 C3', R_X, 100, R_W),

      el(`<p style="font-size:${SZ.title}px; font-family:${SERIF}; font-weight:700; color:${BLACK}; line-height:1.15">Automate<br>the Toil</p>`, {
        id: 's12-title',
        x: R_X, y: below('s12-rule', { gap: 24 }),
        w: R_W,
      }),

      el(`<p style="font-size:${SZ.body}px; font-family:${SANS}; font-weight:400; color:${GRAY}; line-height:1.7">CI/CD pipelines.<br>Environment setup.<br>Documentation.</p>`, {
        id: 's12-tasks',
        x: R_X, y: below('s12-title', { gap: 40 }),
        w: R_W,
      }),

      el('', {
        id: 's12-sep',
        x: R_X, y: below('s12-tasks', { gap: 32 }),
        w: 60, h: 1,
        style: { background: LIGHT_RULE },
      }),

      el(`<p style="font-size:${SZ.body}px; font-family:${SANS}; font-weight:500; color:${DARK}; line-height:1.7">Determinism, verifiability,<br>human-gated.</p>`, {
        id: 's12-constraint',
        x: R_X, y: below('s12-sep', { gap: 32 }),
        w: R_W,
      }),

      // Quote
      el(`<p style="font-size:${SZ.body}px; font-family:${SERIF}; font-weight:400; color:${GRAY}; line-height:1.5">\u201CAnything that touches prod stays behind human gates.\u201D</p>`, {
        id: 's12-quote',
        x: R_X, y: below('s12-constraint', { gap: 40 }),
        w: R_W,
      }),
      el(`<p style="font-size:${SZ.caption}px; font-family:${SANS}; font-weight:600; color:${GRAY}; letter-spacing:0.1em">\u2014 P165</p>`, {
        id: 's12-attr',
        x: R_X, y: below('s12-quote', { gap: 8 }),
      }),
    ],
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // SLIDE 13: People & AI-Building (D4 — full-bleed dark photo)
  // ═══════════════════════════════════════════════════════════════════════════

  const slide13 = {
    id: 's13-people',
    background: 'assets/people-photo.png',
    elements: [
      // Subtle overlay for text readability at bottom
      el('', {
        id: 's13-overlay',
        x: 0, y: 700, w: 1920, h: 380,
        layer: 'bg',
        style: {
          background: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.6) 100%)',
        },
      }),

      // Label
      el(`<p style="font-size:${SZ.label}px; font-family:${SANS}; font-weight:600; color:rgba(255,255,255,0.5); letter-spacing:0.15em">PEOPLE & AI-BUILDING \u2014 C2</p>`, {
        id: 's13-label',
        x: safe.x, y: 880,
      }),

      // Title
      el(`<p style="font-size:${SZ.title}px; font-family:${SERIF}; font-weight:700; color:${WHITE}">Keep It Human</p>`, {
        id: 's13-title',
        x: safe.x, y: below('s13-label', { gap: 12 }),
      }),
    ],
    notes: 'People & AI-Building cluster shows the highest identity scores. Mentoring is about relationships, not information transfer. Developers quote: "Relationships are important" (P85). This cluster actively resists AI delegation.',
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // SLIDE 14: The Augmentation Spectrum (D3 — white content)
  // ═══════════════════════════════════════════════════════════════════════════

  const spectrumY = 500;
  const spectrumX = safe.x + 60;
  const spectrumW = safe.w - 120;

  const slide14 = {
    id: 's14-spectrum',
    background: WHITE,
    elements: [
      ...sectionLabel('s14', 'SYNTHESIS', safe.x, 100, safe.w),

      el(`<p style="font-size:${SZ.title}px; font-family:${SERIF}; font-weight:700; color:${BLACK}">The Augmentation Spectrum</p>`, {
        id: 's14-title',
        x: safe.x, y: below('s14-rule', { gap: 24 }),
        w: safe.w * 0.7,
      }),

      // Spectrum line
      el('', {
        id: 's14-line',
        x: spectrumX, y: spectrumY,
        w: spectrumW, h: 2,
        style: { background: LIGHT_RULE },
      }),

      // Tick marks (short vertical rules)
      el('', {
        id: 's14-tick1',
        x: spectrumX, y: spectrumY - 12,
        w: 2, h: 24,
        style: { background: BLACK },
      }),
      el('', {
        id: 's14-tick2',
        x: spectrumX + spectrumW / 2, y: spectrumY - 12,
        w: 2, h: 24,
        style: { background: BLACK },
      }),
      el('', {
        id: 's14-tick3',
        x: spectrumX + spectrumW, y: spectrumY - 12,
        w: 2, h: 24,
        style: { background: BLACK },
      }),

      // Position 1: AUGMENT (left)
      el(`<p style="font-size:${SZ.label}px; font-family:${SANS}; font-weight:700; color:${BLACK}; letter-spacing:0.1em">AUGMENT</p>`, {
        id: 's14-p1-label',
        x: spectrumX, y: spectrumY + 24,
      }),
      el(`<p style="font-size:${SZ.heading}px; font-family:${SERIF}; font-weight:700; color:${DARK}">Core Work</p>`, {
        id: 's14-p1-cluster',
        x: spectrumX, y: below('s14-p1-label', { gap: 8 }),
      }),
      el(`<p style="font-size:${SZ.label}px; font-family:${SANS}; font-weight:400; color:${GRAY}">value + identity</p>`, {
        id: 's14-p1-driver',
        x: spectrumX, y: below('s14-p1-cluster', { gap: 6 }),
      }),

      // Position 2: AUTOMATE (center)
      el(`<p style="font-size:${SZ.label}px; font-family:${SANS}; font-weight:700; color:${BLACK}; letter-spacing:0.1em">AUTOMATE</p>`, {
        id: 's14-p2-label',
        x: spectrumX + spectrumW / 2, y: spectrumY + 24,
        anchor: 'tl',
      }),
      el(`<p style="font-size:${SZ.heading}px; font-family:${SERIF}; font-weight:700; color:${DARK}">Ops & Coordination</p>`, {
        id: 's14-p2-cluster',
        x: spectrumX + spectrumW / 2, y: below('s14-p2-label', { gap: 8 }),
      }),
      el(`<p style="font-size:${SZ.label}px; font-family:${SANS}; font-weight:400; color:${GRAY}">low identity + demands</p>`, {
        id: 's14-p2-driver',
        x: spectrumX + spectrumW / 2, y: below('s14-p2-cluster', { gap: 6 }),
      }),

      // Position 3: RESIST (right)
      el(`<p style="font-size:${SZ.label}px; font-family:${SANS}; font-weight:700; color:${BLACK}; letter-spacing:0.1em">RESIST</p>`, {
        id: 's14-p3-label',
        x: spectrumX + spectrumW, y: spectrumY + 24,
        anchor: 'tr',
      }),
      el(`<p style="font-size:${SZ.heading}px; font-family:${SERIF}; font-weight:700; color:${DARK}">People & AI-Building</p>`, {
        id: 's14-p3-cluster',
        x: spectrumX + spectrumW, y: below('s14-p3-label', { gap: 8 }),
        anchor: 'tr',
      }),
      el(`<p style="font-size:${SZ.label}px; font-family:${SANS}; font-weight:400; color:${GRAY}">high identity + relational</p>`, {
        id: 's14-p3-driver',
        x: spectrumX + spectrumW, y: below('s14-p3-cluster', { gap: 6 }),
        anchor: 'tr',
      }),
    ],
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // SLIDE 15: RAI Priorities (D3 — white content with figure)
  // ═══════════════════════════════════════════════════════════════════════════

  const slide15 = {
    id: 's15-rai',
    background: WHITE,
    elements: [
      ...sectionLabel('s15', 'RESPONSIBLE AI', safe.x, 100, safe.w),

      el(`<p style="font-size:${SZ.subtitle}px; font-family:${SERIF}; font-weight:700; color:${BLACK}">Priorities Vary by Context</p>`, {
        id: 's15-title',
        x: safe.x, y: below('s15-rule', { gap: 24 }),
        w: safe.w * 0.7,
      }),

      // Paper figure
      el('<img src="assets/rai-chart.png" style="width:100%;height:100%;object-fit:contain">', {
        id: 's15-figure',
        x: safe.x, y: below('s15-title', { gap: 32 }),
        w: safe.w * 0.65,
        h: 520,
      }),

      // Takeaway text
      el(`<p style="font-size:${SZ.body}px; font-family:${SANS}; font-weight:400; color:${GRAY}; line-height:1.5">Systems-facing tasks: Reliability & Safety (85%), Privacy & Security (77%)</p>`, {
        id: 's15-takeaway1',
        x: safe.x, y: below('s15-figure', { gap: 24 }),
        w: safe.w * 0.7,
      }),
      el(`<p style="font-size:${SZ.body}px; font-family:${SANS}; font-weight:400; color:${GRAY}; line-height:1.5">People-facing tasks: Fairness & Inclusiveness elevated</p>`, {
        id: 's15-takeaway2',
        x: safe.x, y: below('s15-takeaway1', { gap: 8 }),
        w: safe.w * 0.7,
      }),
    ],
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // SLIDE 16: Implications (D3 — white content with numbered list)
  // ═══════════════════════════════════════════════════════════════════════════

  const impGap = 56;

  const slide16 = {
    id: 's16-implications',
    background: WHITE,
    elements: [
      ...sectionLabel('s16', 'IMPLICATIONS FOR TOOL BUILDERS', safe.x, 100, safe.w),

      // Item 1
      el(`<p style="font-size:${SZ.title}px; font-family:${SERIF}; font-weight:700; color:${BLACK}">01</p>`, {
        id: 's16-n1',
        x: safe.x, y: below('s16-rule', { gap: 48 }),
      }),
      el(`<p style="font-size:${SZ.heading}px; font-family:${SERIF}; font-weight:700; color:${BLACK}; line-height:2">Task-Aware Personas</p>`, {
        id: 's16-t1',
        x: safe.x + 80, y: alignTopWith('s16-n1'),
      }),
      el(`<p style="font-size:${SZ.body}px; font-family:${SANS}; font-weight:400; color:${GRAY}; line-height:1.6">AI should adapt its behavior to the task at hand \u2014 more assertive for ops, more collaborative for design.</p>`, {
        id: 's16-d1',
        x: safe.x + 80, y: below('s16-t1', { gap: 4 }),
        w: safe.w * 0.55,
      }),

      // Item 2
      el(`<p style="font-size:${SZ.title}px; font-family:${SERIF}; font-weight:700; color:${BLACK}">02</p>`, {
        id: 's16-n2',
        x: safe.x, y: below('s16-d1', { gap: impGap }),
      }),
      el(`<p style="font-size:${SZ.heading}px; font-family:${SERIF}; font-weight:700; color:${BLACK}; line-height:2">Human-Gated Control</p>`, {
        id: 's16-t2',
        x: safe.x + 80, y: alignTopWith('s16-n2'),
      }),
      el(`<p style="font-size:${SZ.body}px; font-family:${SANS}; font-weight:400; color:${GRAY}; line-height:1.6">Ship AI that proposes, not disposes. For Core Work, developers want oversight and decision authority.</p>`, {
        id: 's16-d2',
        x: safe.x + 80, y: below('s16-t2', { gap: 4 }),
        w: safe.w * 0.55,
      }),

      // Item 3
      el(`<p style="font-size:${SZ.title}px; font-family:${SERIF}; font-weight:700; color:${BLACK}">03</p>`, {
        id: 's16-n3',
        x: safe.x, y: below('s16-d2', { gap: impGap }),
      }),
      el(`<p style="font-size:${SZ.heading}px; font-family:${SERIF}; font-weight:700; color:${BLACK}; line-height:2">Augmentation, Not Automation</p>`, {
        id: 's16-t3',
        x: safe.x + 80, y: alignTopWith('s16-n3'),
      }),
      el(`<p style="font-size:${SZ.body}px; font-family:${SANS}; font-weight:400; color:${GRAY}; line-height:1.6">Preserve agency, foster expertise, sustain meaningful work. The goal is better developers, not fewer.</p>`, {
        id: 's16-d3',
        x: safe.x + 80, y: below('s16-t3', { gap: 4 }),
        w: safe.w * 0.55,
      }),
    ],
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // SLIDE 17: Closing (D1 — full-bleed dark photo)
  // ═══════════════════════════════════════════════════════════════════════════

  const slide17 = {
    id: 's17-closing',
    background: 'assets/closing-bg.png',
    elements: [
      // Dark overlay
      el('', {
        id: 's17-overlay',
        x: 0, y: 0, w: 1920, h: 1080,
        layer: 'bg',
        style: { background: 'rgba(0,0,0,0.4)' },
      }),

      // Main closing statement
      el(`<p style="font-size:${SZ.hero}px; font-family:${SERIF}; font-weight:700; color:${WHITE}; line-height:0.95; letter-spacing:0.02em">DELIVER AI<br>WHERE IT<br>MATTERS</p>`, {
        id: 's17-title',
        x: safe.x, y: 240, w: 1200,
      }),

      // Subtitle
      el(`<p style="font-size:${SZ.label}px; font-family:${SANS}; font-weight:500; color:rgba(255,255,255,0.6); letter-spacing:0.12em; line-height:1.6">PRESERVE AGENCY. FOSTER EXPERTISE. SUSTAIN MEANINGFUL WORK.</p>`, {
        id: 's17-subtitle',
        x: safe.x, y: below('s17-title', { gap: 40 }),
        w: 1000,
      }),

      // Credits (bottom-left)
      el(`<p style="font-size:${SZ.caption}px; font-family:${SANS}; font-weight:400; color:rgba(255,255,255,0.35); letter-spacing:0.05em">Choudhuri  \u00B7  Badea  \u00B7  Bird  \u00B7  Butler  \u00B7  DeLine  \u00B7  Houck</p>`, {
        id: 's17-authors',
        x: safe.x, y: 940,
        w: 800,
      }),
      el(`<p style="font-size:${SZ.caption}px; font-family:${SANS}; font-weight:600; color:${GRAY}; letter-spacing:0.15em">ICSE 2026</p>`, {
        id: 's17-conf',
        x: safe.x, y: below('s17-authors', { gap: 8 }),
      }),
    ],
    notes: 'Closing message. Reinforce the augmentation thesis.',
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // Render all slides
  // ═══════════════════════════════════════════════════════════════════════════

  const allSlides = [
    slide01, slide02, slide03, slide04, slide05, slide06,
    slide07, slide08, slide09, slide10, slide11, slide12,
    slide13, slide14, slide15, slide16, slide17,
  ];

  const result = await render(allSlides);

  // Log results
  console.log(`Rendered ${result.layouts.length} slides`);
  for (let i = 0; i < result.layouts.length; i++) {
    const lo = result.layouts[i];
    if (lo.warnings.length > 0) {
      console.warn(`Slide ${i + 1} warnings:`, lo.warnings);
    }
    if (lo.errors.length > 0) {
      console.error(`Slide ${i + 1} errors:`, lo.errors);
    }
  }

  return result;
}

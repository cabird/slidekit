// slides.js — ICSE 2026 presentation: "AI Where It Matters"
// BLED Minimalist Editorial aesthetic built with SlideKit

import {
  init, render, safeRect, measureText,
  text, image, rect, rule, group,
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
      text(labelText, {
        id: `${slidePrefix}-label`,
        x, y, w,
        font: SANS, size: SZ.label, weight: 600, color: GRAY,
        letterSpacing: '0.15em',
      }),
      rule({
        id: `${slidePrefix}-rule`,
        x, y: below(`${slidePrefix}-label`, { gap: 12 }),
        w: w || 600,
        color: LIGHT_RULE, thickness: 1,
      }),
    ];
  }

  // Same for dark backgrounds
  function sectionLabelDark(slidePrefix, labelText, x, y, w) {
    return [
      text(labelText, {
        id: `${slidePrefix}-label`,
        x, y, w,
        font: SANS, size: SZ.label, weight: 600, color: 'rgba(255,255,255,0.5)',
        letterSpacing: '0.15em',
      }),
      rule({
        id: `${slidePrefix}-rule`,
        x, y: below(`${slidePrefix}-label`, { gap: 12 }),
        w: w || 600,
        color: DARK_RULE, thickness: 1,
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
      rect({
        id: 's01-overlay',
        x: 0, y: 0, w: 1920, h: 1080,
        layer: 'bg',
        style: { background: 'rgba(0,0,0,0.35)' },
      }),

      // Main title
      text('AI WHERE\nIT MATTERS', {
        id: 's01-title',
        x: safe.x, y: 320, w: 1200,
        font: SERIF, size: 140, weight: 700, color: WHITE,
        lineHeight: 0.92,
        letterSpacing: '0.03em',
      }),

      // Subtitle
      text('WHERE, WHY, AND HOW DEVELOPERS WANT AI SUPPORT', {
        id: 's01-subtitle',
        x: safe.x, y: below('s01-title', { gap: 32 }),
        w: 1000,
        font: SANS, size: SZ.label, weight: 500, color: 'rgba(255,255,255,0.6)',
        letterSpacing: '0.12em',
        lineHeight: 1.6,
      }),

      // Conference + authors (bottom-left, single line)
      text('ICSE 2026  \u00B7  Choudhuri, Badea, Bird, Butler, DeLine, Houck', {
        id: 's01-credits',
        x: safe.x, y: 960,
        w: 900,
        font: SANS, size: SZ.caption, weight: 400, color: 'rgba(255,255,255,0.4)',
        letterSpacing: '0.06em',
      }),
    ],
    notes: 'Opening slide. Title of the paper, authors, conference.',
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // SLIDE 2: The Tension (D2 — big typography over dark photo)
  // ═══════════════════════════════════════════════════════════════════════════

  // Measure "WORK" to position the teal asterisk precisely
  const heroFont = { font: SERIF, size: 180, weight: 700, letterSpacing: '0.02em' };
  const workMeasure = measureText('WORK', heroFont);
  const asteriskX = safe.x + workMeasure.block.w;
  // Second line y = hero y + first line height (size * lineHeight)
  const heroY = 200;
  const line2Y = heroY + 180 * 0.95;

  const slide02 = {
    id: 's02-tension',
    background: 'assets/tension-bg.png',
    elements: [
      // Dark overlay
      rect({
        id: 's02-overlay',
        x: 0, y: 0, w: 1920, h: 1080,
        layer: 'bg',
        style: { background: 'rgba(0,0,0,0.55)' },
      }),

      // Hero text — two lines with tight leading
      text('THE RIGHT\nWORK', {
        id: 's02-hero',
        x: safe.x, y: heroY,
        w: 1600,
        font: SERIF, size: 180, weight: 700, color: WHITE,
        letterSpacing: '0.02em',
        lineHeight: 0.95,
      }),

      // Teal asterisk — positioned at end of "WORK" on line 2
      text('*', {
        id: 's02-asterisk',
        x: asteriskX, y: line2Y,
        font: SERIF, size: 180, weight: 700, color: TEAL,
        lineHeight: 0.95,
      }),

      // Body text (bottom-left)
      text('AI tools promise faster delivery \u2014\nbut are they optimizing the right tasks?', {
        id: 's02-body',
        x: safe.x, y: 860,
        w: safe.w * 0.55,
        font: SANS, size: SZ.body, weight: 400, color: 'rgba(255,255,255,0.6)',
        lineHeight: 1.6,
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
      image('assets/inquiry-photo.png', {
        id: 's03-photo',
        x: 0, y: 0, w: HALF, h: 1080,
        fit: 'cover',
        layer: 'bg',
      }),

      // Right half content
      ...sectionLabel('s03', 'RESEARCH QUESTIONS', R_X, 100, R_W),

      // RQ1
      text('01', {
        id: 's03-rq1-num',
        x: R_X, y: below('s03-rule', { gap: 40 }),
        font: SERIF, size: SZ.title, weight: 700, color: BLACK,
      }),
      text('How do task appraisals shape openness to AI?', {
        id: 's03-rq1-text',
        x: R_X + 80, y: alignTopWith('s03-rq1-num'),
        w: R_W - 80,
        font: SERIF, size: SZ.heading, weight: 700, color: BLACK,
        lineHeight: 1.3,
      }),
      text('Cognitive appraisal theory applied to 20 SE tasks', {
        id: 's03-rq1-sub',
        x: R_X + 80, y: below('s03-rq1-text', { gap: 12 }),
        w: R_W - 80,
        font: SANS, size: SZ.body, weight: 400, color: GRAY,
        lineHeight: 1.5,
      }),

      // RQ2
      text('02', {
        id: 's03-rq2-num',
        x: R_X, y: below('s03-rq1-sub', { gap: 48 }),
        font: SERIF, size: SZ.title, weight: 700, color: BLACK,
      }),
      text('Which RAI principles do developers prioritize?', {
        id: 's03-rq2-text',
        x: R_X + 80, y: alignTopWith('s03-rq2-num'),
        w: R_W - 80,
        font: SERIF, size: SZ.heading, weight: 700, color: BLACK,
        lineHeight: 1.3,
      }),
      text('8 Responsible AI principles across 5 task categories', {
        id: 's03-rq2-sub',
        x: R_X + 80, y: below('s03-rq2-text', { gap: 12 }),
        w: R_W - 80,
        font: SANS, size: SZ.body, weight: 400, color: GRAY,
        lineHeight: 1.5,
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
      image('assets/framework-photo.png', {
        id: 's04-photo',
        x: 0, y: 0, w: HALF, h: 1080,
        fit: 'cover',
        layer: 'bg',
      }),

      ...sectionLabel('s04', 'THEORETICAL FRAMEWORK', R_X, 100, R_W),

      text('Cognitive Appraisal Theory', {
        id: 's04-title',
        x: R_X, y: below('s04-rule', { gap: 24 }),
        w: R_W,
        font: SERIF, size: SZ.subtitle, weight: 700, color: BLACK,
      }),

      // Driver 1: VALUE
      text('VALUE', {
        id: 's04-d1-label',
        x: R_X, y: below('s04-title', { gap: 48 }),
        font: SANS, size: SZ.label, weight: 700, color: BLACK,
        letterSpacing: '0.12em',
      }),
      rule({
        id: 's04-d1-rule',
        x: R_X, y: below('s04-d1-label', { gap: 8 }),
        w: R_W * 0.4, color: LIGHT_RULE, thickness: 1,
      }),
      text('How important is this task to my goals?', {
        id: 's04-d1-desc',
        x: R_X, y: below('s04-d1-rule', { gap: 8 }),
        w: R_W,
        font: SANS, size: SZ.body, weight: 400, color: GRAY,
        lineHeight: 1.5,
      }),

      // Driver 2: IDENTITY
      text('IDENTITY', {
        id: 's04-d2-label',
        x: R_X, y: below('s04-d1-desc', { gap: driverGap }),
        font: SANS, size: SZ.label, weight: 700, color: BLACK,
        letterSpacing: '0.12em',
      }),
      rule({
        id: 's04-d2-rule',
        x: R_X, y: below('s04-d2-label', { gap: 8 }),
        w: R_W * 0.4, color: LIGHT_RULE, thickness: 1,
      }),
      text('How central is this task to who I am as a developer?', {
        id: 's04-d2-desc',
        x: R_X, y: below('s04-d2-rule', { gap: 8 }),
        w: R_W,
        font: SANS, size: SZ.body, weight: 400, color: GRAY,
        lineHeight: 1.5,
      }),

      // Driver 3: ACCOUNTABILITY
      text('ACCOUNTABILITY', {
        id: 's04-d3-label',
        x: R_X, y: below('s04-d2-desc', { gap: driverGap }),
        font: SANS, size: SZ.label, weight: 700, color: BLACK,
        letterSpacing: '0.12em',
      }),
      rule({
        id: 's04-d3-rule',
        x: R_X, y: below('s04-d3-label', { gap: 8 }),
        w: R_W * 0.4, color: LIGHT_RULE, thickness: 1,
      }),
      text('How responsible am I for the outcome?', {
        id: 's04-d3-desc',
        x: R_X, y: below('s04-d3-rule', { gap: 8 }),
        w: R_W,
        font: SANS, size: SZ.body, weight: 400, color: GRAY,
        lineHeight: 1.5,
      }),

      // Driver 4: DEMANDS
      text('DEMANDS', {
        id: 's04-d4-label',
        x: R_X, y: below('s04-d3-desc', { gap: driverGap }),
        font: SANS, size: SZ.label, weight: 700, color: BLACK,
        letterSpacing: '0.12em',
      }),
      rule({
        id: 's04-d4-rule',
        x: R_X, y: below('s04-d4-label', { gap: 8 }),
        w: R_W * 0.4, color: LIGHT_RULE, thickness: 1,
      }),
      text('How much effort and cognitive load does this require?', {
        id: 's04-d4-desc',
        x: R_X, y: below('s04-d4-rule', { gap: 8 }),
        w: R_W,
        font: SANS, size: SZ.body, weight: 400, color: GRAY,
        lineHeight: 1.5,
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
      image('assets/survey-photo.png', {
        id: 's05-photo',
        x: 0, y: 0, w: HALF, h: 1080,
        fit: 'cover',
        layer: 'bg',
      }),

      ...sectionLabel('s05', 'METHODOLOGY', R_X, 100, R_W),

      // Stat 1: 860
      text('860', {
        id: 's05-stat1-num',
        x: R_X, y: below('s05-rule', { gap: 56 }),
        font: SERIF, size: 72, weight: 700, color: BLACK,
      }),
      text('DEVELOPERS', {
        id: 's05-stat1-label',
        x: R_X + 8, y: below('s05-stat1-num', { gap: 4 }),
        font: SANS, size: SZ.caption, weight: 600, color: GRAY,
        letterSpacing: '0.15em',
      }),

      // Stat 2: 20
      text('20', {
        id: 's05-stat2-num',
        x: R_X, y: below('s05-stat1-label', { gap: 40 }),
        font: SERIF, size: 72, weight: 700, color: BLACK,
      }),
      text('SE TASKS', {
        id: 's05-stat2-label',
        x: R_X + 8, y: below('s05-stat2-num', { gap: 4 }),
        font: SANS, size: SZ.caption, weight: 600, color: GRAY,
        letterSpacing: '0.15em',
      }),

      // Stat 3: 3,981
      text('3,981', {
        id: 's05-stat3-num',
        x: R_X, y: below('s05-stat2-label', { gap: 40 }),
        font: SERIF, size: 72, weight: 700, color: BLACK,
      }),
      text('QUALITATIVE RESPONSES', {
        id: 's05-stat3-label',
        x: R_X + 8, y: below('s05-stat3-num', { gap: 4 }),
        font: SANS, size: SZ.caption, weight: 600, color: GRAY,
        letterSpacing: '0.15em',
      }),

      // Method note
      text('Mixed-methods survey at Microsoft, 6 continents', {
        id: 's05-note',
        x: R_X, y: below('s05-stat3-label', { gap: 48 }),
        w: R_W,
        font: SANS, size: SZ.body, weight: 400, color: GRAY,
        lineHeight: 1.5,
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
      image('assets/taxonomy-photo.png', {
        id: 's06-photo',
        x: 0, y: 0, w: HALF, h: 1080,
        fit: 'cover',
        layer: 'bg',
      }),

      ...sectionLabel('s06', 'TASK LANDSCAPE', R_X, 100, R_W),

      text('20 SE Tasks', {
        id: 's06-title',
        x: R_X, y: below('s06-rule', { gap: 24 }),
        w: R_W,
        font: SERIF, size: SZ.subtitle, weight: 700, color: BLACK,
      }),

      // Category 1
      text('DEVELOPMENT', {
        id: 's06-c1',
        x: R_X, y: below('s06-title', { gap: 40 }),
        font: SANS, size: SZ.label, weight: 700, color: BLACK,
        letterSpacing: '0.12em',
      }),
      text('Coding, debugging, testing, code review', {
        id: 's06-c1-tasks',
        x: R_X, y: below('s06-c1', { gap: 6 }),
        w: R_W,
        font: SANS, size: SZ.body, weight: 400, color: GRAY,
      }),

      // Category 2
      text('DESIGN & PLANNING', {
        id: 's06-c2',
        x: R_X, y: below('s06-c1-tasks', { gap: catGap }),
        font: SANS, size: SZ.label, weight: 700, color: BLACK,
        letterSpacing: '0.12em',
      }),
      text('System design, requirements, architecture', {
        id: 's06-c2-tasks',
        x: R_X, y: below('s06-c2', { gap: 6 }),
        w: R_W,
        font: SANS, size: SZ.body, weight: 400, color: GRAY,
      }),

      // Category 3
      text('QUALITY & RISK', {
        id: 's06-c3',
        x: R_X, y: below('s06-c2-tasks', { gap: catGap }),
        font: SANS, size: SZ.label, weight: 700, color: BLACK,
        letterSpacing: '0.12em',
      }),
      text('Security, reliability, compliance, risk assessment', {
        id: 's06-c3-tasks',
        x: R_X, y: below('s06-c3', { gap: 6 }),
        w: R_W,
        font: SANS, size: SZ.body, weight: 400, color: GRAY,
      }),

      // Category 4
      text('INFRASTRUCTURE & OPS', {
        id: 's06-c4',
        x: R_X, y: below('s06-c3-tasks', { gap: catGap }),
        font: SANS, size: SZ.label, weight: 700, color: BLACK,
        letterSpacing: '0.12em',
      }),
      text('CI/CD, environment setup, DevOps, monitoring', {
        id: 's06-c4-tasks',
        x: R_X, y: below('s06-c4', { gap: 6 }),
        w: R_W,
        font: SANS, size: SZ.body, weight: 400, color: GRAY,
      }),

      // Category 5
      text('META-WORK', {
        id: 's06-c5',
        x: R_X, y: below('s06-c4-tasks', { gap: catGap }),
        font: SANS, size: SZ.label, weight: 700, color: BLACK,
        letterSpacing: '0.12em',
      }),
      text('Documentation, mentoring, customer support, AI integration', {
        id: 's06-c5-tasks',
        x: R_X, y: below('s06-c5', { gap: 6 }),
        w: R_W,
        font: SANS, size: SZ.body, weight: 400, color: GRAY,
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

      text('All Four Appraisals\nPredict AI Adoption', {
        id: 's07-title',
        x: safe.x, y: below('s07-rule', { gap: 24 }),
        w: safe.w * 0.6,
        font: SERIF, size: SZ.title, weight: 700, color: BLACK,
        lineHeight: 1.2,
      }),

      // Hypothesis results — large sign + driver name
      text('+', {
        id: 's07-h1-sign',
        x: safe.x, y: below('s07-title', { gap: 56 }),
        font: SERIF, size: SZ.title, weight: 700, color: BLACK,
      }),
      text('VALUE', {
        id: 's07-h1-label',
        x: safe.x + 60, y: alignTopWith('s07-h1-sign'),
        font: SANS, size: SZ.label, weight: 700, color: BLACK,
        letterSpacing: '0.1em',
        lineHeight: 3,
      }),
      text('Higher task value \u2192 greater openness and usage', {
        id: 's07-h1-desc',
        x: safe.x + 60, y: below('s07-h1-label', { gap: 4 }),
        w: safe.w * 0.5,
        font: SANS, size: SZ.body, weight: 400, color: GRAY,
      }),

      text('\u00B1', {
        id: 's07-h2-sign',
        x: safe.x, y: below('s07-h1-desc', { gap: hGap }),
        font: SERIF, size: SZ.title, weight: 700, color: BLACK,
      }),
      text('IDENTITY', {
        id: 's07-h2-label',
        x: safe.x + 60, y: alignTopWith('s07-h2-sign'),
        font: SANS, size: SZ.label, weight: 700, color: BLACK,
        letterSpacing: '0.1em',
        lineHeight: 3,
      }),
      text('Dual effect: lower openness, higher usage', {
        id: 's07-h2-desc',
        x: safe.x + 60, y: below('s07-h2-label', { gap: 4 }),
        w: safe.w * 0.5,
        font: SANS, size: SZ.body, weight: 400, color: TEAL,
      }),

      text('+', {
        id: 's07-h3-sign',
        x: safe.x, y: below('s07-h2-desc', { gap: hGap }),
        font: SERIF, size: SZ.title, weight: 700, color: BLACK,
      }),
      text('ACCOUNTABILITY', {
        id: 's07-h3-label',
        x: safe.x + 60, y: alignTopWith('s07-h3-sign'),
        font: SANS, size: SZ.label, weight: 700, color: BLACK,
        letterSpacing: '0.1em',
        lineHeight: 3,
      }),
      text('Higher responsibility \u2192 seek AI as safety net', {
        id: 's07-h3-desc',
        x: safe.x + 60, y: below('s07-h3-label', { gap: 4 }),
        w: safe.w * 0.5,
        font: SANS, size: SZ.body, weight: 400, color: GRAY,
      }),

      text('+', {
        id: 's07-h4-sign',
        x: safe.x, y: below('s07-h3-desc', { gap: hGap }),
        font: SERIF, size: SZ.title, weight: 700, color: BLACK,
      }),
      text('DEMANDS', {
        id: 's07-h4-label',
        x: safe.x + 60, y: alignTopWith('s07-h4-sign'),
        font: SANS, size: SZ.label, weight: 700, color: BLACK,
        letterSpacing: '0.1em',
        lineHeight: 3,
      }),
      text('Higher cognitive load \u2192 welcome AI relief', {
        id: 's07-h4-desc',
        x: safe.x + 60, y: below('s07-h4-label', { gap: 4 }),
        w: safe.w * 0.5,
        font: SANS, size: SZ.body, weight: 400, color: GRAY,
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
      image('assets/identity-photo.png', {
        id: 's08-photo',
        x: 0, y: 0, w: HALF, h: 1080,
        fit: 'cover',
        layer: 'bg',
      }),

      ...sectionLabel('s08', 'THE IDENTITY PARADOX', R_X, 100, R_W),

      // Quote 1
      text('\u201CI do not want AI to handle writing code for me. That\u2019s the part I enjoy.\u201D', {
        id: 's08-quote1',
        x: R_X, y: below('s08-rule', { gap: 48 }),
        w: R_W,
        font: SERIF, size: SZ.heading, weight: 400, color: BLACK,
        lineHeight: 1.45,
      }),
      text('\u2014 P110, SENIOR DEVELOPER', {
        id: 's08-attr1',
        x: R_X, y: below('s08-quote1', { gap: 16 }),
        font: SANS, size: SZ.caption, weight: 600, color: GRAY,
        letterSpacing: '0.1em',
      }),

      // Thin separator
      rule({
        id: 's08-sep',
        x: R_X, y: below('s08-attr1', { gap: 48 }),
        w: 60, color: LIGHT_RULE, thickness: 1,
      }),

      // Quote 2
      text('\u201CAI should enhance human engineers\u2019 learning, not replace tasks that allow them to become better.\u201D', {
        id: 's08-quote2',
        x: R_X, y: below('s08-sep', { gap: 48 }),
        w: R_W,
        font: SERIF, size: SZ.body, weight: 400, color: DARK,
        lineHeight: 1.5,
      }),
      text('\u2014 P16', {
        id: 's08-attr2',
        x: R_X, y: below('s08-quote2', { gap: 16 }),
        font: SANS, size: SZ.caption, weight: 600, color: GRAY,
        letterSpacing: '0.1em',
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
      rect({
        id: 's09-overlay',
        x: 0, y: 0, w: 1920, h: 1080,
        layer: 'bg',
        style: { background: 'rgba(0,0,0,0.6)' },
      }),

      ...sectionLabelDark('s09', 'CLUSTER ANALYSIS', safe.x, 100, safe.w),

      // Column 1: Core Work
      text('C1', {
        id: 's09-c1-num',
        x: col1X, y: colY,
        font: SERIF, size: SZ.display, weight: 700, color: WHITE,
      }),
      text('CORE WORK', {
        id: 's09-c1-name',
        x: col1X, y: below('s09-c1-num', { gap: 8 }),
        font: SANS, size: SZ.label, weight: 600, color: 'rgba(255,255,255,0.7)',
        letterSpacing: '0.15em',
      }),
      text('Coding, debugging, testing,\ncode review, system design\n\nHigh value & demands\nStrong AI appetite \u2014\nbut identity constrains delegation', {
        id: 's09-c1-desc',
        x: col1X, y: below('s09-c1-name', { gap: 20 }),
        w: colW,
        font: SANS, size: SZ.body, weight: 400, color: 'rgba(255,255,255,0.55)',
        lineHeight: 1.6,
      }),

      // Vertical rule 1
      rule({
        id: 's09-vr1',
        x: col1X + colW + 40, y: colY,
        h: 380, direction: 'vertical',
        color: DARK_RULE, thickness: 1,
      }),

      // Column 2: People & AI-Building
      text('C2', {
        id: 's09-c2-num',
        x: col2X, y: colY,
        font: SERIF, size: SZ.display, weight: 700, color: WHITE,
      }),
      text('PEOPLE & AI-BUILDING', {
        id: 's09-c2-name',
        x: col2X, y: below('s09-c2-num', { gap: 8 }),
        font: SANS, size: SZ.label, weight: 600, color: 'rgba(255,255,255,0.7)',
        letterSpacing: '0.15em',
      }),
      text('Mentoring, AI integration\n\nStrong identity\nAI largely resisted \u2014\nrelationships are irreducibly human', {
        id: 's09-c2-desc',
        x: col2X, y: below('s09-c2-name', { gap: 20 }),
        w: colW,
        font: SANS, size: SZ.body, weight: 400, color: 'rgba(255,255,255,0.55)',
        lineHeight: 1.6,
      }),

      // Vertical rule 2
      rule({
        id: 's09-vr2',
        x: col2X + colW + 40, y: colY,
        h: 380, direction: 'vertical',
        color: DARK_RULE, thickness: 1,
      }),

      // Column 3: Ops & Coordination
      text('C3', {
        id: 's09-c3-num',
        x: col3X, y: colY,
        font: SERIF, size: SZ.display, weight: 700, color: WHITE,
      }),
      text('OPS & COORDINATION', {
        id: 's09-c3-name',
        x: col3X, y: below('s09-c3-num', { gap: 8 }),
        font: SANS, size: SZ.label, weight: 600, color: 'rgba(255,255,255,0.7)',
        letterSpacing: '0.15em',
      }),
      text('DevOps, env setup,\ndocumentation, customer support\n\nLow identity\nAI welcome for toil reduction \u2014\nbut reliability first', {
        id: 's09-c3-desc',
        x: col3X, y: below('s09-c3-name', { gap: 20 }),
        w: colW,
        font: SANS, size: SZ.body, weight: 400, color: 'rgba(255,255,255,0.55)',
        lineHeight: 1.6,
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

      text('Where AI Support Is Needed vs. Used', {
        id: 's10-title',
        x: safe.x, y: below('s10-rule', { gap: 24 }),
        w: safe.w * 0.7,
        font: SERIF, size: SZ.subtitle, weight: 700, color: BLACK,
      }),

      // Paper figure
      image('assets/quadrant-map.png', {
        id: 's10-figure',
        x: safe.x, y: below('s10-title', { gap: 32 }),
        w: safe.w * 0.65,
        h: 620,
        fit: 'contain',
      }),

      // Quadrant legend (right side)
      text('BUILD', {
        id: 's10-q1',
        x: safe.x + safe.w * 0.72, y: below('s10-title', { gap: 60 }),
        font: SANS, size: SZ.label, weight: 700, color: BLACK,
        letterSpacing: '0.1em',
      }),
      text('High need, low use \u2014 invest here', {
        id: 's10-q1-desc',
        x: safe.x + safe.w * 0.72, y: below('s10-q1', { gap: 6 }),
        w: 340,
        font: SANS, size: SZ.body, weight: 400, color: GRAY,
      }),

      text('IMPROVE', {
        id: 's10-q2',
        x: safe.x + safe.w * 0.72, y: below('s10-q1-desc', { gap: 32 }),
        font: SANS, size: SZ.label, weight: 700, color: BLACK,
        letterSpacing: '0.1em',
      }),
      text('High need, high use \u2014 refine tools', {
        id: 's10-q2-desc',
        x: safe.x + safe.w * 0.72, y: below('s10-q2', { gap: 6 }),
        w: 340,
        font: SANS, size: SZ.body, weight: 400, color: GRAY,
      }),

      text('SUSTAIN', {
        id: 's10-q3',
        x: safe.x + safe.w * 0.72, y: below('s10-q2-desc', { gap: 32 }),
        font: SANS, size: SZ.label, weight: 700, color: BLACK,
        letterSpacing: '0.1em',
      }),
      text('Low need, high use \u2014 maintain', {
        id: 's10-q3-desc',
        x: safe.x + safe.w * 0.72, y: below('s10-q3', { gap: 6 }),
        w: 340,
        font: SANS, size: SZ.body, weight: 400, color: GRAY,
      }),

      text('DE-PRIORITIZE', {
        id: 's10-q4',
        x: safe.x + safe.w * 0.72, y: below('s10-q3-desc', { gap: 32 }),
        font: SANS, size: SZ.label, weight: 700, color: BLACK,
        letterSpacing: '0.1em',
      }),
      text('Low need, low use \u2014 redirect effort', {
        id: 's10-q4-desc',
        x: safe.x + safe.w * 0.72, y: below('s10-q4', { gap: 6 }),
        w: 340,
        font: SANS, size: SZ.body, weight: 400, color: GRAY,
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
      image('assets/core-work-photo.png', {
        id: 's11-photo',
        x: 0, y: 0, w: HALF, h: 1080,
        fit: 'cover',
        layer: 'bg',
      }),

      ...sectionLabel('s11', 'CORE WORK \u2014 C1', R_X, 100, R_W),

      text('Augment,\nDon\u2019t Replace', {
        id: 's11-title',
        x: R_X, y: below('s11-rule', { gap: 24 }),
        w: R_W,
        font: SERIF, size: SZ.title, weight: 700, color: BLACK,
        lineHeight: 1.15,
      }),

      text('Workflow efficiency.\nProactive quality.\nCross-context awareness.', {
        id: 's11-want',
        x: R_X, y: below('s11-title', { gap: 40 }),
        w: R_W,
        font: SANS, size: SZ.body, weight: 400, color: GRAY,
        lineHeight: 1.7,
      }),

      rule({
        id: 's11-sep',
        x: R_X, y: below('s11-want', { gap: 32 }),
        w: 60, color: LIGHT_RULE, thickness: 1,
      }),

      text('But: retain oversight,\ndecision control, preserve craft.', {
        id: 's11-but',
        x: R_X, y: below('s11-sep', { gap: 32 }),
        w: R_W,
        font: SANS, size: SZ.body, weight: 500, color: DARK,
        lineHeight: 1.7,
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
      image('assets/ops-photo.png', {
        id: 's12-photo',
        x: 0, y: 0, w: HALF, h: 1080,
        fit: 'cover',
        layer: 'bg',
      }),

      ...sectionLabel('s12', 'OPS & COORDINATION \u2014 C3', R_X, 100, R_W),

      text('Automate\nthe Toil', {
        id: 's12-title',
        x: R_X, y: below('s12-rule', { gap: 24 }),
        w: R_W,
        font: SERIF, size: SZ.title, weight: 700, color: BLACK,
        lineHeight: 1.15,
      }),

      text('CI/CD pipelines.\nEnvironment setup.\nDocumentation.', {
        id: 's12-tasks',
        x: R_X, y: below('s12-title', { gap: 40 }),
        w: R_W,
        font: SANS, size: SZ.body, weight: 400, color: GRAY,
        lineHeight: 1.7,
      }),

      rule({
        id: 's12-sep',
        x: R_X, y: below('s12-tasks', { gap: 32 }),
        w: 60, color: LIGHT_RULE, thickness: 1,
      }),

      text('Determinism, verifiability,\nhuman-gated.', {
        id: 's12-constraint',
        x: R_X, y: below('s12-sep', { gap: 32 }),
        w: R_W,
        font: SANS, size: SZ.body, weight: 500, color: DARK,
        lineHeight: 1.7,
      }),

      // Quote
      text('\u201CAnything that touches prod stays behind human gates.\u201D', {
        id: 's12-quote',
        x: R_X, y: below('s12-constraint', { gap: 40 }),
        w: R_W,
        font: SERIF, size: SZ.body, weight: 400, color: GRAY,
        lineHeight: 1.5,
      }),
      text('\u2014 P165', {
        id: 's12-attr',
        x: R_X, y: below('s12-quote', { gap: 8 }),
        font: SANS, size: SZ.caption, weight: 600, color: GRAY,
        letterSpacing: '0.1em',
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
      rect({
        id: 's13-overlay',
        x: 0, y: 700, w: 1920, h: 380,
        layer: 'bg',
        style: {
          background: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.6) 100%)',
        },
      }),

      // Label
      text('PEOPLE & AI-BUILDING \u2014 C2', {
        id: 's13-label',
        x: safe.x, y: 880,
        font: SANS, size: SZ.label, weight: 600, color: 'rgba(255,255,255,0.5)',
        letterSpacing: '0.15em',
      }),

      // Title
      text('Keep It Human', {
        id: 's13-title',
        x: safe.x, y: below('s13-label', { gap: 12 }),
        font: SERIF, size: SZ.title, weight: 700, color: WHITE,
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

      text('The Augmentation Spectrum', {
        id: 's14-title',
        x: safe.x, y: below('s14-rule', { gap: 24 }),
        w: safe.w * 0.7,
        font: SERIF, size: SZ.title, weight: 700, color: BLACK,
      }),

      // Spectrum line
      rule({
        id: 's14-line',
        x: spectrumX, y: spectrumY,
        w: spectrumW,
        color: LIGHT_RULE, thickness: 2,
      }),

      // Tick marks (short vertical rules)
      rule({
        id: 's14-tick1',
        x: spectrumX, y: spectrumY - 12,
        h: 24, direction: 'vertical',
        color: BLACK, thickness: 2,
      }),
      rule({
        id: 's14-tick2',
        x: spectrumX + spectrumW / 2, y: spectrumY - 12,
        h: 24, direction: 'vertical',
        color: BLACK, thickness: 2,
      }),
      rule({
        id: 's14-tick3',
        x: spectrumX + spectrumW, y: spectrumY - 12,
        h: 24, direction: 'vertical',
        color: BLACK, thickness: 2,
      }),

      // Position 1: AUGMENT (left)
      text('AUGMENT', {
        id: 's14-p1-label',
        x: spectrumX, y: spectrumY + 24,
        font: SANS, size: SZ.label, weight: 700, color: BLACK,
        letterSpacing: '0.1em',
      }),
      text('Core Work', {
        id: 's14-p1-cluster',
        x: spectrumX, y: below('s14-p1-label', { gap: 8 }),
        font: SERIF, size: SZ.heading, weight: 700, color: DARK,
      }),
      text('value + identity', {
        id: 's14-p1-driver',
        x: spectrumX, y: below('s14-p1-cluster', { gap: 6 }),
        font: SANS, size: SZ.label, weight: 400, color: GRAY,
      }),

      // Position 2: AUTOMATE (center)
      text('AUTOMATE', {
        id: 's14-p2-label',
        x: spectrumX + spectrumW / 2, y: spectrumY + 24,
        anchor: 'tl',
        font: SANS, size: SZ.label, weight: 700, color: BLACK,
        letterSpacing: '0.1em',
      }),
      text('Ops & Coordination', {
        id: 's14-p2-cluster',
        x: spectrumX + spectrumW / 2, y: below('s14-p2-label', { gap: 8 }),
        font: SERIF, size: SZ.heading, weight: 700, color: DARK,
      }),
      text('low identity + demands', {
        id: 's14-p2-driver',
        x: spectrumX + spectrumW / 2, y: below('s14-p2-cluster', { gap: 6 }),
        font: SANS, size: SZ.label, weight: 400, color: GRAY,
      }),

      // Position 3: RESIST (right)
      text('RESIST', {
        id: 's14-p3-label',
        x: spectrumX + spectrumW, y: spectrumY + 24,
        anchor: 'tr',
        font: SANS, size: SZ.label, weight: 700, color: BLACK,
        letterSpacing: '0.1em',
      }),
      text('People & AI-Building', {
        id: 's14-p3-cluster',
        x: spectrumX + spectrumW, y: below('s14-p3-label', { gap: 8 }),
        anchor: 'tr',
        font: SERIF, size: SZ.heading, weight: 700, color: DARK,
      }),
      text('high identity + relational', {
        id: 's14-p3-driver',
        x: spectrumX + spectrumW, y: below('s14-p3-cluster', { gap: 6 }),
        anchor: 'tr',
        font: SANS, size: SZ.label, weight: 400, color: GRAY,
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

      text('Priorities Vary by Context', {
        id: 's15-title',
        x: safe.x, y: below('s15-rule', { gap: 24 }),
        w: safe.w * 0.7,
        font: SERIF, size: SZ.subtitle, weight: 700, color: BLACK,
      }),

      // Paper figure
      image('assets/rai-chart.png', {
        id: 's15-figure',
        x: safe.x, y: below('s15-title', { gap: 32 }),
        w: safe.w * 0.65,
        h: 520,
        fit: 'contain',
      }),

      // Takeaway text
      text('Systems-facing tasks: Reliability & Safety (85%), Privacy & Security (77%)', {
        id: 's15-takeaway1',
        x: safe.x, y: below('s15-figure', { gap: 24 }),
        w: safe.w * 0.7,
        font: SANS, size: SZ.body, weight: 400, color: GRAY,
        lineHeight: 1.5,
      }),
      text('People-facing tasks: Fairness & Inclusiveness elevated', {
        id: 's15-takeaway2',
        x: safe.x, y: below('s15-takeaway1', { gap: 8 }),
        w: safe.w * 0.7,
        font: SANS, size: SZ.body, weight: 400, color: GRAY,
        lineHeight: 1.5,
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
      text('01', {
        id: 's16-n1',
        x: safe.x, y: below('s16-rule', { gap: 48 }),
        font: SERIF, size: SZ.title, weight: 700, color: BLACK,
      }),
      text('Task-Aware Personas', {
        id: 's16-t1',
        x: safe.x + 80, y: alignTopWith('s16-n1'),
        font: SERIF, size: SZ.heading, weight: 700, color: BLACK,
        lineHeight: 2,
      }),
      text('AI should adapt its behavior to the task at hand \u2014 more assertive for ops, more collaborative for design.', {
        id: 's16-d1',
        x: safe.x + 80, y: below('s16-t1', { gap: 4 }),
        w: safe.w * 0.55,
        font: SANS, size: SZ.body, weight: 400, color: GRAY,
        lineHeight: 1.6,
      }),

      // Item 2
      text('02', {
        id: 's16-n2',
        x: safe.x, y: below('s16-d1', { gap: impGap }),
        font: SERIF, size: SZ.title, weight: 700, color: BLACK,
      }),
      text('Human-Gated Control', {
        id: 's16-t2',
        x: safe.x + 80, y: alignTopWith('s16-n2'),
        font: SERIF, size: SZ.heading, weight: 700, color: BLACK,
        lineHeight: 2,
      }),
      text('Ship AI that proposes, not disposes. For Core Work, developers want oversight and decision authority.', {
        id: 's16-d2',
        x: safe.x + 80, y: below('s16-t2', { gap: 4 }),
        w: safe.w * 0.55,
        font: SANS, size: SZ.body, weight: 400, color: GRAY,
        lineHeight: 1.6,
      }),

      // Item 3
      text('03', {
        id: 's16-n3',
        x: safe.x, y: below('s16-d2', { gap: impGap }),
        font: SERIF, size: SZ.title, weight: 700, color: BLACK,
      }),
      text('Augmentation, Not Automation', {
        id: 's16-t3',
        x: safe.x + 80, y: alignTopWith('s16-n3'),
        font: SERIF, size: SZ.heading, weight: 700, color: BLACK,
        lineHeight: 2,
      }),
      text('Preserve agency, foster expertise, sustain meaningful work. The goal is better developers, not fewer.', {
        id: 's16-d3',
        x: safe.x + 80, y: below('s16-t3', { gap: 4 }),
        w: safe.w * 0.55,
        font: SANS, size: SZ.body, weight: 400, color: GRAY,
        lineHeight: 1.6,
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
      rect({
        id: 's17-overlay',
        x: 0, y: 0, w: 1920, h: 1080,
        layer: 'bg',
        style: { background: 'rgba(0,0,0,0.4)' },
      }),

      // Main closing statement
      text('DELIVER AI\nWHERE IT\nMATTERS', {
        id: 's17-title',
        x: safe.x, y: 240, w: 1200,
        font: SERIF, size: SZ.hero, weight: 700, color: WHITE,
        lineHeight: 0.95,
        letterSpacing: '0.02em',
      }),

      // Subtitle
      text('PRESERVE AGENCY. FOSTER EXPERTISE. SUSTAIN MEANINGFUL WORK.', {
        id: 's17-subtitle',
        x: safe.x, y: below('s17-title', { gap: 40 }),
        w: 1000,
        font: SANS, size: SZ.label, weight: 500, color: 'rgba(255,255,255,0.6)',
        letterSpacing: '0.12em',
        lineHeight: 1.6,
      }),

      // Credits (bottom-left)
      text('Choudhuri  \u00B7  Badea  \u00B7  Bird  \u00B7  Butler  \u00B7  DeLine  \u00B7  Houck', {
        id: 's17-authors',
        x: safe.x, y: 940,
        w: 800,
        font: SANS, size: SZ.caption, weight: 400, color: 'rgba(255,255,255,0.35)',
        letterSpacing: '0.05em',
      }),
      text('ICSE 2026', {
        id: 's17-conf',
        x: safe.x, y: below('s17-authors', { gap: 8 }),
        font: SANS, size: SZ.caption, weight: 600, color: GRAY,
        letterSpacing: '0.15em',
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

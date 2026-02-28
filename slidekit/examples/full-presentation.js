// full-presentation.js — A minimal 3-slide presentation rendered end-to-end
// Demonstrates: render() with multiple slides, notes, background, safeRect

import {
  init, render, safeRect,
  el,
  below, hstack, panel,
} from '../slidekit.js';

export async function run() {
  await init({
    slide: { w: 1920, h: 1080 },
    safeZone: { left: 120, right: 120, top: 90, bottom: 90 },
    minFontSize: 24,
  });

  const safe = safeRect();

  // Slide 1: Title
  const slide1 = {
    id: 'intro',
    background: '#0c0c14',
    elements: [
      el('', {
        id: 's1-bg',
        x: 0, y: 0, w: 1920, h: 1080,
        layer: 'bg',
        style: {
          background: 'radial-gradient(ellipse at 30% 40%, rgba(124,92,191,0.2) 0%, transparent 60%)',
        },
      }),

      el('<p style="font:700 80px/1.1 Inter;color:#fff;text-align:center;text-shadow:0 2px 20px rgba(0,0,0,0.5)">Coordinate-Based<br>Slide Layout</p>', {
        id: 's1-title',
        x: 960, y: 380, w: 1200,
        anchor: 'tc',
      }),

      el('', {
        id: 's1-rule',
        x: 960 - 40, y: below('s1-title', { gap: 32 }),
        w: 80, h: 3,
        style: { background: '#7c5cbf' },
      }),

      el('<p style="font:28px Inter;color:rgba(255,255,255,0.5);text-align:center">Deterministic &bull; Measurable &bull; Validated</p>', {
        id: 's1-tagline',
        x: 960, w: 800,
        y: below('s1-rule', { gap: 24 }),
        anchor: 'tc',
      }),
    ],
    notes: 'Opening slide. Introduce the concept of coordinate-based layout for presentations.',
  };

  // Slide 2: Content with panels
  const slide2 = {
    id: 'benefits',
    background: '#0c0c14',
    elements: [
      el('<p style="font:700 52px Inter;color:#fff">Why Coordinates?</p>', {
        id: 's2-heading',
        x: safe.x, y: safe.y, w: safe.w,
      }),

      el('', {
        id: 's2-rule',
        x: safe.x, y: below('s2-heading', { gap: 16 }),
        w: 80, h: 3,
        style: { background: '#7c5cbf' },
      }),

      hstack([
        panel([
          el('<p style="font:600 28px Inter;color:#fff">For AI Agents</p>', { w: 'fill' }),
          el('', { w: 'fill', h: 1, style: { background: 'rgba(255,255,255,0.15)' } }),
          el('<p style="font:20px Inter;color:rgba(255,255,255,0.65);line-height:1.5">LLMs can reason about coordinates but cannot simulate CSS layout engines. Explicit positioning removes ambiguity.</p>', {
            w: 'fill',
          }),
        ], {
          id: 's2-card1', w: 520, padding: 28, gap: 14,
          style: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px' },
        }),

        panel([
          el('<p style="font:600 28px Inter;color:#fff">For Humans</p>', { w: 'fill' }),
          el('', { w: 'fill', h: 1, style: { background: 'rgba(255,255,255,0.15)' } }),
          el('<p style="font:20px Inter;color:rgba(255,255,255,0.65);line-height:1.5">No more fighting flexbox or debugging CSS cascade. Say where things go, and that\'s where they go. Full CSS for styling.</p>', {
            w: 'fill',
          }),
        ], {
          id: 's2-card2', w: 520, padding: 28, gap: 14,
          style: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px' },
        }),

        panel([
          el('<p style="font:600 28px Inter;color:#fff">For Both</p>', { w: 'fill' }),
          el('', { w: 'fill', h: 1, style: { background: 'rgba(255,255,255,0.15)' } }),
          el('<p style="font:20px Inter;color:rgba(255,255,255,0.65);line-height:1.5">Structured validation catches mistakes before rendering. Warnings and errors are machine-readable JSON, not console noise.</p>', {
            w: 'fill',
          }),
        ], {
          id: 's2-card3', w: 520, padding: 28, gap: 14,
          style: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px' },
        }),
      ], {
        id: 's2-cards',
        x: safe.x, y: below('s2-rule', { gap: 48 }),
        gap: 30, align: 'top',
      }),
    ],
    notes: 'Three audiences: AI agents, human developers, and the combination of both.',
  };

  // Slide 3: Closing
  const slide3 = {
    id: 'closing',
    background: '#0c0c14',
    elements: [
      el('', {
        id: 's3-bg',
        x: 0, y: 0, w: 1920, h: 1080,
        layer: 'bg',
        style: {
          background: 'radial-gradient(ellipse at 70% 60%, rgba(124,92,191,0.15) 0%, transparent 50%)',
        },
      }),

      el('<p style="font:700 72px/1.15 Inter;color:#fff;text-align:center;text-shadow:0 2px 20px rgba(0,0,0,0.5)">Slides Are Canvases,<br>Not Documents</p>', {
        id: 's3-title',
        x: 960, y: 400, w: 1400,
        anchor: 'tc',
      }),

      el('', {
        id: 's3-rule',
        x: 960 - 40, y: below('s3-title', { gap: 32 }),
        w: 80, h: 3,
        style: { background: '#7c5cbf' },
      }),

      el('<p style="font:28px Inter;color:rgba(255,255,255,0.6);text-align:center;line-height:1.5">CSS for styling. Coordinates for layout.<br>Deterministic, measurable, validated.</p>', {
        id: 's3-tagline',
        x: 960, w: 900,
        y: below('s3-rule', { gap: 24 }),
        anchor: 'tc',
      }),
    ],
    notes: 'Closing message. Reinforce the core thesis.',
  };

  // Render all slides and log results
  const result = await render([slide1, slide2, slide3]);

  console.log(`Rendered ${result.layouts.length} slides`);
  for (let i = 0; i < result.layouts.length; i++) {
    const layout = result.layouts[i];
    if (layout.warnings.length > 0) {
      console.warn(`Slide ${i + 1} warnings:`, layout.warnings);
    }
  }

  return result;
}

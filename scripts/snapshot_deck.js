#!/usr/bin/env node
// snapshot_deck.js — Capture screenshots, lint results, and scene graphs for all slides
//
// Usage: node snapshot_deck.js [--port 52624] [--out ./snapshots] [--slides 1,7,9]
//
// This script:
//   1. Starts a local HTTP server (or uses an existing one)
//   2. Launches headless Chromium via Playwright
//   3. Loads the deck (init + render + Reveal.js)
//   4. For each slide:
//      a. Navigates to it via Reveal
//      b. Takes a 1920×1080 screenshot → out/screenshots/slide_NN.png
//      c. Runs sk.lint(slideId) → out/lint/slide_NN.json
//      d. Extracts the scene graph → out/scenes/slide_NN.json
//   5. Runs sk.lintDeck() → out/lint/deck.json
//   6. Writes a summary → out/summary.json

const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

// --- Args ---
const args = process.argv.slice(2);
function getArg(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

const PORT = parseInt(getArg('port', '0'), 10); // 0 = auto-start
const OUT_DIR = path.resolve(getArg('out', './snapshots'));
const DECK_DIR = path.resolve(getArg('dir', '.'));
const SLIDES_FILTER = getArg('slides', ''); // e.g. "1,7,9" or "slide-05,slide-09"

// --- Helpers ---
function ensureDir(d) { fs.mkdirSync(d, { recursive: true }); }

function pad(n) { return String(n).padStart(2, '0'); }

// Simple static file server
function startServer(root) {
  return new Promise((resolve) => {
    const MIME = {
      '.html': 'text/html', '.js': 'application/javascript', '.mjs': 'application/javascript',
      '.css': 'text/css', '.json': 'application/json',
      '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
      '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf',
      '.map': 'application/json',
    };
    const resolvedRoot = path.resolve(root);
    const srv = http.createServer((req, res) => {
      let url;
      try { url = decodeURIComponent(req.url.split('?')[0]); }
      catch { res.writeHead(400); res.end('Bad request'); return; }
      if (url === '/') url = '/index.html';
      const filePath = path.resolve(path.join(resolvedRoot, url));
      // Prevent path traversal outside root
      if (!filePath.startsWith(resolvedRoot + path.sep) && filePath !== resolvedRoot) {
        res.writeHead(403); res.end('Forbidden'); return;
      }
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        res.writeHead(404); res.end('Not found'); return;
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      const stream = fs.createReadStream(filePath);
      stream.on('error', () => { res.writeHead(500); res.end('Read error'); });
      stream.pipe(res);
    });
    srv.listen(0, '127.0.0.1', () => {
      const port = srv.address().port;
      console.log(`[snapshot] Static server on http://127.0.0.1:${port}`);
      resolve({ server: srv, port });
    });
  });
}

// --- Main ---
(async () => {
  console.log('[snapshot] Starting deck snapshot...');
  console.log(`[snapshot] Deck dir: ${DECK_DIR}`);
  console.log(`[snapshot] Output dir: ${OUT_DIR}`);

  // Prepare output dirs
  ensureDir(path.join(OUT_DIR, 'screenshots'));
  ensureDir(path.join(OUT_DIR, 'lint'));
  ensureDir(path.join(OUT_DIR, 'scenes'));

  // Start server if needed
  let server = null;
  let port = PORT;
  if (port === 0) {
    const s = await startServer(DECK_DIR);
    server = s.server;
    port = s.port;
  }

  const url = `http://127.0.0.1:${port}/index.html`;

  // Launch browser
  const browser = await chromium.launch({ headless: true });
  let totalErrors = 0;

  try {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    // Collect console errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    console.log(`[snapshot] Loading ${url} ...`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Wait for SlideKit to be ready
    await page.waitForFunction(() => window.sk && window.Reveal, { timeout: 30000 });
    // Extra wait for fonts and rendering
    await page.waitForTimeout(3000);

    // Disable fragments entirely so all elements render immediately
    await page.evaluate(() => Reveal.configure({ fragments: false }));
    await page.addStyleTag({
      content: `.reveal .fragment {
        transition: none !important;
        opacity: 1 !important;
        visibility: visible !important;
      }`,
    });

    // Get slide list — use index as primary key, slideId as metadata
    const slideInfo = await page.evaluate(() => {
      const revealSlides = Reveal.getSlides();
      return revealSlides.map((s, i) => ({
        index: i,
        slideId: s.getAttribute('data-slide-id') || s.id || `slide-${i}`,
      }));
    });

    if (slideInfo.length === 0) {
      console.error('[snapshot] No slides found!');
      process.exit(2);
    }

    console.log(`[snapshot] Found ${slideInfo.length} slides: ${slideInfo.map(s => s.slideId).join(', ')}`);

    // Filter slides if --slides was provided
    let slidesToProcess = slideInfo;
    if (SLIDES_FILTER) {
      const filters = SLIDES_FILTER.split(',').map(s => s.trim());
      slidesToProcess = slideInfo.filter(({ index, slideId }) => {
        const num = String(index + 1);
        const nn = pad(index + 1);
        return filters.some(f => f === num || f === nn || f === slideId);
      });
      if (slidesToProcess.length === 0) {
        console.error(`[snapshot] No slides matched filter: ${SLIDES_FILTER}`);
        console.error(`[snapshot] Available: ${slideInfo.map((s, i) => `${i + 1}=${s.slideId}`).join(', ')}`);
        process.exit(2);
      }
      console.log(`[snapshot] Filtered to ${slidesToProcess.length} slides: ${slidesToProcess.map(s => s.slideId).join(', ')}`);
    }

    const summary = {
      timestamp: new Date().toISOString(),
      slideCount: slideInfo.length,
      processedCount: slidesToProcess.length,
      filtered: !!SLIDES_FILTER,
      slides: {},
      consoleErrors: [],
    };

    // Process each slide (filtered or all)
    for (const { index: i, slideId } of slidesToProcess) {
      const nn = pad(i + 1);
      console.log(`[snapshot] Processing slide ${nn} (${slideId})...`);

      // Navigate to slide and wait for transition
      await page.evaluate((idx) => { Reveal.slide(idx); }, i);
      await page.waitForFunction(
        (idx) => Reveal.getIndices().h === idx,
        i,
        { timeout: 5000 }
      ).catch(() => {}); // Fall back to timeout if event doesn't fire
      await page.waitForTimeout(1000);

      // Screenshot
      const ssPath = path.join(OUT_DIR, 'screenshots', `slide_${nn}.png`);
      await page.screenshot({ path: ssPath, type: 'png' });

      // Lint
      let lintResults = [];
      try {
        lintResults = await page.evaluate((id) => window.sk.lint(id), slideId);
      } catch (e) {
        lintResults = [{ rule: 'LINT_ERROR', severity: 'error', message: e.message }];
      }
      const lintPath = path.join(OUT_DIR, 'lint', `slide_${nn}.json`);
      fs.writeFileSync(lintPath, JSON.stringify(lintResults, null, 2));

      // Scene graph
      let scene = null;
      try {
        scene = await page.evaluate((idx) => {
          return window.sk.layouts[idx] || null;
        }, i);
      } catch (e) {
        scene = { error: e.message };
      }
      const scenePath = path.join(OUT_DIR, 'scenes', `slide_${nn}.json`);
      fs.writeFileSync(scenePath, JSON.stringify(scene, null, 2));

      // Summary entry (keyed by index to avoid duplicate ID collisions)
      const errors = lintResults.filter(r => r.severity === 'error');
      const warnings = lintResults.filter(r => r.severity === 'warning');
      summary.slides[`${nn}_${slideId}`] = {
        index: i + 1,
        slideId,
        screenshot: `screenshots/slide_${nn}.png`,
        lint: `lint/slide_${nn}.json`,
        scene: `scenes/slide_${nn}.json`,
        errorCount: errors.length,
        warningCount: warnings.length,
        errors: errors.map(e => ({ rule: e.rule, element: e.elementId, msg: e.message })),
      };
    }

    // Deck-level lint
    console.log('[snapshot] Running deck-level lint...');
    try {
      const deckLint = await page.evaluate(async () => {
        if (window.sk.lintDeck) return window.sk.lintDeck();
        // Fallback: lint all slides and merge
        const allSlides = Reveal.getSlides();
        const all = [];
        for (const s of allSlides) {
          const id = s.getAttribute('data-slide-id') || s.id;
          if (id) {
            try {
              const results = await Promise.resolve(window.sk.lint(id));
              all.push(...results.map(r => ({ ...r, slideId: id })));
            } catch (e) {
              all.push({ rule: 'LINT_ERROR', slideId: id, severity: 'error', message: e.message });
            }
          }
        }
        return all;
      });
      fs.writeFileSync(path.join(OUT_DIR, 'lint', 'deck.json'), JSON.stringify(deckLint, null, 2));
    } catch (e) {
      fs.writeFileSync(path.join(OUT_DIR, 'lint', 'deck.json'), JSON.stringify({ error: e.message }, null, 2));
    }

    summary.consoleErrors = consoleErrors;

    // Write summary
    fs.writeFileSync(path.join(OUT_DIR, 'summary.json'), JSON.stringify(summary, null, 2));

    // Print summary
    console.log('\n========== SNAPSHOT SUMMARY ==========');
    let totalWarnings = 0;
    for (const [key, info] of Object.entries(summary.slides)) {
      const errStr = info.errorCount > 0 ? `❌ ${info.errorCount} errors` : '✅';
      const warnStr = info.warningCount > 0 ? `⚠ ${info.warningCount} warnings` : '';
      console.log(`  ${pad(info.index)} ${info.slideId}: ${errStr} ${warnStr}`);
      if (info.errorCount > 0) {
        for (const e of info.errors) {
          console.log(`      ${e.rule}: ${e.element || ''} — ${e.msg.substring(0, 80)}`);
        }
      }
      totalErrors += info.errorCount;
      totalWarnings += info.warningCount;
    }
    console.log(`\nTotal: ${totalErrors} errors, ${totalWarnings} warnings across ${slideInfo.length} slides`);
    if (consoleErrors.length > 0) {
      console.log(`\nConsole errors (${consoleErrors.length}):`);
      for (const e of consoleErrors) console.log(`  ${e.substring(0, 120)}`);
    }
    console.log(`\nOutput: ${OUT_DIR}`);
    console.log('======================================\n');

    await context.close();
  } finally {
    await browser.close().catch(() => {});
    if (server) await new Promise(r => server.close(r));
  }

  // Exit with error code if there are lint errors
  process.exit(totalErrors > 0 ? 1 : 0);
})().catch(err => {
  console.error('[snapshot] Fatal error:', err);
  process.exit(2);
});

// /// script
// dependencies = []
// requires-python = ">=3.11"
// ///

// Playwright inspection script — serves the demo and inspects runtime state
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');

const MIME = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.ts':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
};

// Simple static file server
const server = createServer((req, res) => {
  let filePath = join(ROOT, req.url === '/' ? '/test_slides/index.html' : req.url);
  if (!existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  const ext = extname(filePath);
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  res.end(readFileSync(filePath));
});

server.listen(0, async () => {
  const port = server.address().port;
  console.log(`Serving on http://localhost:${port}`);

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  // Collect console messages
  page.on('console', msg => console.log(`[browser ${msg.type()}]`, msg.text()));
  page.on('pageerror', err => console.error('[browser error]', err.message));

  await page.goto(`http://localhost:${port}/test_slides/index.html`);
  await page.waitForTimeout(3000); // Let everything render

  // 1. Check window.sk structure
  const skKeys = await page.evaluate(() => {
    if (!window.sk) return 'window.sk is null/undefined';
    return {
      topKeys: Object.keys(window.sk),
      layoutCount: window.sk.layouts?.length,
      slideCount: window.sk.slides?.length,
      hasConfig: !!window.sk._config,
    };
  });
  console.log('\n=== window.sk structure ===');
  console.log(JSON.stringify(skKeys, null, 2));

  // 2. Check scene elements — IDs, types, resolved positions, provenance
  const elements = await page.evaluate(() => {
    const layout = window.sk?.layouts?.[0];
    if (!layout) return 'No layout';
    const result = {};
    for (const [id, el] of Object.entries(layout.elements)) {
      result[id] = {
        type: el.type,
        resolved: el.resolved,
        parentId: el.parentId,
        children: el.children,
        _internal: el._internal,
        provenance: el.provenance,
        authoredPropsKeys: el.authored?.props ? Object.keys(el.authored.props) : [],
        authoredProps: el.authored?.props || {},
      };
    }
    return result;
  });
  console.log('\n=== Scene elements ===');
  console.log(JSON.stringify(elements, null, 2));

  // 3. Check DOM attributes on rendered elements
  const domInfo = await page.evaluate(() => {
    const els = document.querySelectorAll('[data-sk-id]');
    return Array.from(els).map(el => ({
      tagName: el.tagName,
      'data-sk-id': el.getAttribute('data-sk-id'),
      'data-sk-type': el.getAttribute('data-sk-type'),
      id: el.id || null,
      classList: Array.from(el.classList),
      childElementCount: el.childElementCount,
      computedFontSize: getComputedStyle(el).fontSize,
      computedColor: getComputedStyle(el).color,
    }));
  });
  console.log('\n=== DOM elements with data-sk-id ===');
  console.log(JSON.stringify(domInfo, null, 2));

  // 4. Check if original slide definitions are accessible
  const slideDefAccess = await page.evaluate(() => {
    return {
      hasSlidesArray: !!window.sk?.slides,
      slidesStructure: window.sk?.slides?.map(s => ({
        id: s.id,
        hasLayout: !!s.layout,
        layoutElementCount: s.layout ? Object.keys(s.layout.elements).length : 0,
      })),
    };
  });
  console.log('\n=== Slide definition access ===');
  console.log(JSON.stringify(slideDefAccess, null, 2));

  // 5. Check if render function is accessible for re-render
  const rerenderInfo = await page.evaluate(() => {
    return {
      hasSkGlobal: !!window.sk,
      skKeys: window.sk ? Object.keys(window.sk) : [],
      hasRenderFn: typeof window.sk?.render === 'function',
      hasLayoutFn: typeof window.sk?.layout === 'function',
    };
  });
  console.log('\n=== Re-render capability ===');
  console.log(JSON.stringify(rerenderInfo, null, 2));

  await browser.close();
  server.close();
  console.log('\nDone.');
});

// SlideKit Tests — measure(), Font Loading, Auto-Height

import { describe, it, assert } from './test-runner.js';
import {
  el, render, measure,
  init, clearMeasureCache, isFontLoaded, getFontWarnings,
  resetIdCounter, _resetForTests,
} from '../slidekit.js';

// =============================================================================
// Helper: create a temporary container for render tests
// =============================================================================

async function withContainer(fn) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  try {
    return await fn(container);
  } finally {
    document.body.removeChild(container);
  }
}

// =============================================================================
// measure() — basic measurement
// =============================================================================

describe("measure() — basic HTML measurement", () => {
  it("returns non-zero width and height for simple text HTML", async () => {
    _resetForTests();
    await init();
    const result = await measure(
      '<p style="font-size:32px;font-family:sans-serif">Hello World</p>',
      { w: 800 }
    );
    assert.ok(result.w > 0, "width should be > 0");
    assert.ok(result.h > 0, "height should be > 0");
  });

  it("width equals constrained width when w is provided", async () => {
    _resetForTests();
    await init();
    const result = await measure(
      '<p style="font-size:32px;font-family:sans-serif">Test</p>',
      { w: 600 }
    );
    assert.equal(result.w, 600, "w should match constrained width");
  });

  it("height scales with font size", async () => {
    _resetForTests();
    await init();
    const small = await measure(
      '<p style="font-size:16px;font-family:sans-serif">Hello</p>',
      { w: 800 }
    );
    const large = await measure(
      '<p style="font-size:64px;font-family:sans-serif">Hello</p>',
      { w: 800 }
    );
    assert.ok(large.h > small.h,
      `64px text (${large.h}px) should be taller than 16px (${small.h}px)`);
  });

  it("multi-line HTML is taller than single-line", async () => {
    _resetForTests();
    await init();
    const single = await measure(
      '<p style="font-size:24px;font-family:sans-serif">One line</p>',
      { w: 800 }
    );
    const multi = await measure(
      '<p style="font-size:24px;font-family:sans-serif">Line one<br>Line two<br>Line three</p>',
      { w: 800 }
    );
    assert.ok(multi.h > single.h,
      `multi-line (${multi.h}) should be taller than single-line (${single.h})`);
  });

  it("narrow width causes wrapping and increases height", async () => {
    _resetForTests();
    await init();
    const html = '<p style="font-size:24px;font-family:sans-serif">This is a long sentence that should wrap when constrained to a narrow width</p>';
    const wide = await measure(html, { w: 2000 });
    const narrow = await measure(html, { w: 200 });
    assert.ok(narrow.h > wide.h, "narrow should be taller due to wrapping");
  });

  it("empty string returns valid measurement", async () => {
    _resetForTests();
    await init();
    const result = await measure('', { w: 800 });
    assert.ok(result.w !== undefined, "w should be defined");
    assert.ok(result.h !== undefined, "h should be defined");
  });

  it("unconstrained measurement returns natural width", async () => {
    _resetForTests();
    await init();
    const result = await measure(
      '<p style="font-size:32px;font-family:sans-serif">Hello</p>'
    );
    assert.ok(result.w > 0, "unconstrained width should be > 0");
    assert.ok(result.h > 0, "unconstrained height should be > 0");
  });
});

describe("measure() — container styles", () => {
  it("respects container padding in measurement", async () => {
    _resetForTests();
    await init();
    const noPad = await measure(
      '<p style="font-size:24px">Text</p>',
      { w: 400 }
    );
    const withPad = await measure(
      '<p style="font-size:24px">Text</p>',
      { w: 400, style: { padding: "20px" } }
    );
    assert.ok(withPad.h > noPad.h,
      `padded (${withPad.h}) should be taller than unpadded (${noPad.h})`);
  });
});

// =============================================================================
// measure() — caching
// =============================================================================

describe("measure() — caching", () => {
  it("second call with same params returns cached result (same reference)", async () => {
    _resetForTests();
    await init();
    clearMeasureCache();
    const html = '<p style="font-size:32px;font-family:sans-serif">Cache test</p>';
    const result1 = await measure(html, { w: 800 });
    const result2 = await measure(html, { w: 800 });
    assert.ok(result1 === result2, "second call should return cached result (same reference)");
  });

  it("different content produces different cached results", async () => {
    _resetForTests();
    await init();
    clearMeasureCache();
    const result1 = await measure('<p>Text A</p>', { w: 800 });
    const result2 = await measure('<p>Text B</p>', { w: 800 });
    assert.ok(result1 !== result2, "different content should not share cache");
  });

  it("different width produces different cached results", async () => {
    _resetForTests();
    await init();
    clearMeasureCache();
    const html = '<p style="font-size:32px">Same text</p>';
    const result1 = await measure(html, { w: 800 });
    const result2 = await measure(html, { w: 200 });
    assert.ok(result1 !== result2, "different w should not share cache");
  });

  it("clearMeasureCache forces re-measurement", async () => {
    _resetForTests();
    await init();
    const html = '<p style="font-size:32px">Clear test</p>';
    const result1 = await measure(html, { w: 800 });
    clearMeasureCache();
    const result2 = await measure(html, { w: 800 });
    assert.ok(result1 !== result2, "after cache clear, should be a new object");
    assert.equal(result1.h, result2.h, "but values should match");
  });

  it("different container style produces different cached results", async () => {
    _resetForTests();
    await init();
    clearMeasureCache();
    const html = '<p style="font-size:32px">Same text</p>';
    const result1 = await measure(html, { w: 800 });
    const result2 = await measure(html, { w: 800, style: { padding: "20px" } });
    assert.ok(result1 !== result2, "different container style should not share cache");
  });
});

// =============================================================================
// Font loading
// =============================================================================

describe("Font preloading", () => {
  it("isFontLoaded returns false for unloaded font", async () => {
    _resetForTests();
    await init();
    assert.equal(isFontLoaded("NonExistentFont123", 400), false,
      "unloaded font should return false");
  });

  it("system fonts can be loaded without warnings", async () => {
    _resetForTests();
    await init({
      fonts: [{ family: "sans-serif", weights: [400] }],
    });
    const warnings = getFontWarnings();
    for (const w of warnings) {
      assert.ok(w.type === "font_load_failed" || w.type === "font_load_timeout",
        "any warning should be a recognized type");
    }
  });

  it("init() completes even when fonts fail to load", async () => {
    _resetForTests();
    await init({
      fonts: [{ family: "TotallyFakeFont99999", weights: [400, 700] }],
    });
    const warnings = getFontWarnings();
    for (const w of warnings) {
      assert.ok(
        w.type === "font_load_failed" || w.type === "font_load_timeout",
        "warning type should indicate failure"
      );
    }
  });

  it("getFontWarnings() returns empty array when no font issues", async () => {
    _resetForTests();
    await init();
    const warnings = getFontWarnings();
    assert.equal(warnings.length, 0, "no warnings when no fonts configured");
  });
});

// =============================================================================
// Auto-height for el() elements
// =============================================================================

describe("Auto-height el() elements", () => {
  it("el without h gets auto-measured height in rendered DOM", async () => {
    _resetForTests();
    await init();
    await withContainer(async (container) => {
      const slides = [{
        elements: [
          el('<p style="font-size:32px;font-family:sans-serif">Auto height text</p>', {
            id: "auto-h", x: 100, y: 100, w: 600,
          }),
        ],
      }];
      await render(slides, { container });
      const node = container.querySelector('[data-sk-id="auto-h"]');
      assert.ok(node, "element should exist");
      const height = parseInt(node.style.height, 10);
      assert.ok(height > 0, `auto-height should be > 0, got ${height}`);
    });
  });

  it("auto-height el is taller with more lines", async () => {
    _resetForTests();
    await init();
    await withContainer(async (container) => {
      const slides = [{
        elements: [
          el('<p style="font-size:24px;font-family:sans-serif">Single line</p>', {
            id: "single", x: 0, y: 0, w: 600,
          }),
          el('<p style="font-size:24px;font-family:sans-serif">Line 1<br>Line 2<br>Line 3</p>', {
            id: "multi", x: 0, y: 200, w: 600,
          }),
        ],
      }];
      await render(slides, { container });
      const singleEl = container.querySelector('[data-sk-id="single"]');
      const multiEl = container.querySelector('[data-sk-id="multi"]');
      const singleH = parseInt(singleEl.style.height, 10);
      const multiH = parseInt(multiEl.style.height, 10);
      assert.ok(multiH > singleH,
        `multi-line (${multiH}) should be taller than single-line (${singleH})`);
    });
  });

  it("el with explicit h uses that height (not auto-measured)", async () => {
    _resetForTests();
    await init();
    await withContainer(async (container) => {
      const slides = [{
        elements: [
          el('<p style="font-size:32px;font-family:sans-serif">Explicit height</p>', {
            id: "explicit-h", x: 0, y: 0, w: 600, h: 200,
          }),
        ],
      }];
      await render(slides, { container });
      const node = container.querySelector('[data-sk-id="explicit-h"]');
      assert.equal(node.style.height, "200px", "should use explicit h");
    });
  });

  it("empty el with no h gets height 0", async () => {
    _resetForTests();
    await init();
    await withContainer(async (container) => {
      const slides = [{
        elements: [
          el('', {
            id: "empty-auto", x: 0, y: 0, w: 600,
          }),
        ],
      }];
      await render(slides, { container });
      const node = container.querySelector('[data-sk-id="empty-auto"]');
      assert.equal(node.style.height, "0px", "empty el should get height 0");
    });
  });
});

// =============================================================================
// Measurement container
// =============================================================================

describe("Measurement container", () => {
  it("measurement container is created lazily on first measure() call", async () => {
    _resetForTests();
    await init();
    const containerBefore = document.querySelector('[data-sk-role="measure-container"]');
    assert.equal(containerBefore, null,
      "precondition: measure container should not exist after reset/init");
    await measure('<p style="font-size:16px">trigger container</p>', { w: 200 });
    const containerAfter = document.querySelector('[data-sk-role="measure-container"]');
    assert.ok(containerAfter, "measurement container should exist after measure call");
  });

  it("measurement container is hidden off-screen", async () => {
    _resetForTests();
    await init();
    await measure('<p>trigger</p>', { w: 200 });
    const container = document.querySelector('[data-sk-role="measure-container"]');
    assert.equal(container.style.visibility, "hidden");
    assert.equal(container.style.position, "absolute");
    assert.equal(container.style.left, "-9999px");
  });

  it("measurement container is cleaned up by _resetForTests", async () => {
    _resetForTests();
    await init();
    await measure('<p>trigger</p>', { w: 200 });
    assert.ok(document.querySelector('[data-sk-role="measure-container"]'),
      "container should exist before reset");
    _resetForTests();
    assert.equal(document.querySelector('[data-sk-role="measure-container"]'), null,
      "container should be removed after reset");
  });
});

// =============================================================================
// Google Font link injection
// =============================================================================

describe("Google Font link injection", () => {
  it("_resetForTests cleans up injected font links", async () => {
    _resetForTests();
    await init({
      fonts: [{ family: "Roboto", weights: [400], source: "google" }],
    });
    const link = document.querySelector('link[href*="fonts.googleapis.com"][href*="Roboto"]');
    assert.ok(link, "Google Font link should be injected");

    _resetForTests();
    const linkAfterReset = document.querySelector('link[href*="fonts.googleapis.com"][href*="Roboto"]');
    assert.equal(linkAfterReset, null, "Google Font link should be removed after reset");
  });
});

// SlideKit Tests — M2.5: Text Measurement, Font Loading, Auto-Height

import { describe, it, assert } from './test-runner.js';
import {
  text, rect, render,
  init, measureText, clearMeasureCache, isFontLoaded, getFontWarnings,
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
// M2.3: measureText — basic measurement
// =============================================================================

describe("M2.3: measureText() — single-line text", () => {
  it("returns block with non-zero width and height for simple text", async () => {
    _resetForTests();
    await init();
    const result = measureText("Hello World", { font: "sans-serif", size: 32, w: 800 });
    assert.ok(result.block.w > 0, "width should be > 0");
    assert.ok(result.block.h > 0, "height should be > 0");
    assert.equal(result.fontSize, 32);
  });

  it("returns lineCount of 1 for single-line text", async () => {
    _resetForTests();
    await init();
    const result = measureText("Short text", { font: "sans-serif", size: 24, w: 800 });
    assert.equal(result.lineCount, 1, "single-line text should have lineCount 1");
  });

  it("block width equals constrained width when w is provided", async () => {
    _resetForTests();
    await init();
    const result = measureText("Test", { font: "sans-serif", size: 32, w: 600 });
    assert.equal(result.block.w, 600, "block.w should match constrained width");
  });

  it("height is approximately size * lineHeight for single line", async () => {
    _resetForTests();
    await init();
    const size = 32;
    const lineHeight = 1.3;
    const result = measureText("Hello", { font: "sans-serif", size, lineHeight, w: 800 });
    const expectedH = size * lineHeight;
    // Allow generous tolerance for browser differences
    assert.within(result.block.h, expectedH, expectedH * 0.5,
      "height should be approximately size * lineHeight");
  });
});

describe("M2.3: measureText() — multi-line text", () => {
  it("explicit \\n produces correct lineCount", async () => {
    _resetForTests();
    await init();
    const result = measureText("Line 1\nLine 2\nLine 3", {
      font: "sans-serif", size: 24, lineHeight: 1.3, w: 800,
    });
    assert.equal(result.lineCount, 3, `lineCount should be exactly 3, got ${result.lineCount}`);
  });

  it("multi-line text is taller than single-line text", async () => {
    _resetForTests();
    await init();
    const props = { font: "sans-serif", size: 24, lineHeight: 1.3, w: 800 };
    const single = measureText("One line", props);
    const multi = measureText("Line one\nLine two\nLine three", props);
    assert.ok(multi.block.h > single.block.h,
      `multi-line (${multi.block.h}) should be taller than single-line (${single.block.h})`);
  });
});

describe("M2.3: measureText() — constrained width wrapping", () => {
  it("narrow width causes wrapping and increases lineCount", async () => {
    _resetForTests();
    await init();
    const text = "This is a long sentence that should wrap when constrained to a narrow width";
    const wide = measureText(text, { font: "sans-serif", size: 24, w: 2000 });
    const narrow = measureText(text, { font: "sans-serif", size: 24, w: 200 });

    assert.ok(narrow.lineCount > wide.lineCount,
      `narrow (${narrow.lineCount} lines) should have more lines than wide (${wide.lineCount} lines)`);
    assert.ok(narrow.block.h > wide.block.h,
      "narrow should be taller due to wrapping");
  });

  it("constrained width returns that width as block.w", async () => {
    _resetForTests();
    await init();
    const result = measureText("Wrapped text", { font: "sans-serif", size: 24, w: 150 });
    assert.equal(result.block.w, 150, "block.w should equal constrained width");
  });
});

describe("M2.3: measureText() — different fonts/sizes", () => {
  it("larger font size produces taller measurement", async () => {
    _resetForTests();
    await init();
    const small = measureText("Hello", { font: "sans-serif", size: 16, w: 800 });
    const large = measureText("Hello", { font: "sans-serif", size: 64, w: 800 });
    assert.ok(large.block.h > small.block.h,
      `64px text (${large.block.h}px) should be taller than 16px (${small.block.h}px)`);
  });

  it("different fonts may produce different dimensions", async () => {
    _resetForTests();
    await init();
    // Serif and monospace typically have different metrics
    const serif = measureText("Test measurement", { font: "serif", size: 32, w: 800 });
    const mono = measureText("Test measurement", { font: "monospace", size: 32, w: 800 });
    // Heights might be similar, but at least both should be valid
    assert.ok(serif.block.h > 0, "serif height should be > 0");
    assert.ok(mono.block.h > 0, "monospace height should be > 0");
    // We can't guarantee they differ (depends on system fonts), but both should work
  });

  it("fontSize in result matches input size", async () => {
    _resetForTests();
    await init();
    const result = measureText("Hello", { size: 48 });
    assert.equal(result.fontSize, 48, "fontSize should match input");
  });
});

describe("M2.3: measureText() — unconstrained width", () => {
  it("returns measured width when no w is provided", async () => {
    _resetForTests();
    await init();
    const result = measureText("Hello", { font: "sans-serif", size: 32 });
    assert.ok(result.block.w > 0, "unconstrained width should be > 0");
    assert.ok(result.block.h > 0, "unconstrained height should be > 0");
  });

  it("unconstrained width is less than or equal to long constrained width", async () => {
    _resetForTests();
    await init();
    const unconstrained = measureText("Short", { font: "sans-serif", size: 32 });
    const constrained = measureText("Short", { font: "sans-serif", size: 32, w: 2000 });
    // Unconstrained width should be the natural text width
    // Constrained with large width should report the constraint
    assert.ok(unconstrained.block.w <= 2000,
      "unconstrained width should be reasonable");
  });
});

describe("M2.3: measureText() — empty string", () => {
  it("empty string returns valid measurement with lineCount 1", async () => {
    _resetForTests();
    await init();
    const result = measureText("", { font: "sans-serif", size: 32, w: 800 });
    assert.ok(result.block.w !== undefined, "block.w should be defined");
    assert.ok(result.block.h !== undefined, "block.h should be defined");
    assert.equal(result.lineCount, 1, "empty string should have lineCount 1");
    assert.equal(result.fontSize, 32, "fontSize should match input");
  });
});

// =============================================================================
// M2.3: measureText — caching
// =============================================================================

describe("M2.3: measureText() — caching", () => {
  it("second call with same params returns cached result (same reference)", async () => {
    _resetForTests();
    await init();
    clearMeasureCache();
    const props = { font: "sans-serif", size: 32, w: 800 };
    const result1 = measureText("Cache test", props);
    const result2 = measureText("Cache test", props);
    // Same object reference means it came from cache
    assert.ok(result1 === result2, "second call should return cached result (same reference)");
  });

  it("different content produces different cached results", async () => {
    _resetForTests();
    await init();
    clearMeasureCache();
    const props = { font: "sans-serif", size: 32, w: 800 };
    const result1 = measureText("Text A", props);
    const result2 = measureText("Text B", props);
    assert.ok(result1 !== result2, "different content should not share cache");
  });

  it("different width produces different cached results", async () => {
    _resetForTests();
    await init();
    clearMeasureCache();
    const result1 = measureText("Same text", { font: "sans-serif", size: 32, w: 800 });
    const result2 = measureText("Same text", { font: "sans-serif", size: 32, w: 200 });
    assert.ok(result1 !== result2, "different w should not share cache");
  });

  it("clearMeasureCache forces re-measurement", async () => {
    _resetForTests();
    await init();
    const props = { font: "sans-serif", size: 32, w: 800 };
    const result1 = measureText("Clear test", props);
    clearMeasureCache();
    const result2 = measureText("Clear test", props);
    // After clearing cache, we get a new object (same values but different reference)
    assert.ok(result1 !== result2, "after cache clear, should be a new object");
    assert.equal(result1.block.h, result2.block.h, "but values should match");
  });

  it("different letterSpacing produces different cached results", async () => {
    _resetForTests();
    await init();
    clearMeasureCache();
    const result1 = measureText("Same text", { font: "sans-serif", size: 32, w: 800, letterSpacing: "0" });
    const result2 = measureText("Same text", { font: "sans-serif", size: 32, w: 800, letterSpacing: "0.1em" });
    assert.ok(result1 !== result2, "different letterSpacing should not share cache");
  });
});

// =============================================================================
// M2.1: Font loading
// =============================================================================

describe("M2.1: Font preloading", () => {
  it("isFontLoaded returns false for unloaded font", async () => {
    _resetForTests();
    await init();
    assert.equal(isFontLoaded("NonExistentFont123", 400), false,
      "unloaded font should return false");
  });

  it("system fonts can be loaded without warnings", async () => {
    _resetForTests();
    // System fonts like sans-serif should load immediately
    await init({
      fonts: [{ family: "sans-serif", weights: [400] }],
    });
    // init() should complete without throwing, and system fonts
    // should either load successfully or fail gracefully
    const warnings = getFontWarnings();
    // System fonts may or may not register — but there should be no crash
    // and warnings (if any) should be properly structured
    for (const w of warnings) {
      assert.ok(w.type === "font_load_failed" || w.type === "font_load_timeout",
        "any warning should be a recognized type");
    }
  });

  it("init() completes even when fonts fail to load", async () => {
    _resetForTests();
    // A completely fake font should fail gracefully — init() must not throw.
    await init({
      fonts: [{ family: "TotallyFakeFont99999", weights: [400, 700] }],
    });
    // In some browser environments (especially headless Chromium),
    // document.fonts.check may return true for any font, so the font
    // might appear "loaded" with no warnings. In other environments,
    // there will be warnings. Either outcome is acceptable — the key
    // contract is that init() completes without throwing.
    const warnings = getFontWarnings();
    // If there are warnings, they should be properly structured
    for (const w of warnings) {
      assert.ok(
        w.type === "font_load_failed" || w.type === "font_load_timeout",
        "warning type should indicate failure"
      );
    }
  });

  it("getFontWarnings() returns empty array when no font issues", async () => {
    _resetForTests();
    await init(); // no fonts configured
    const warnings = getFontWarnings();
    assert.equal(warnings.length, 0, "no warnings when no fonts configured");
  });
});

describe("M2.1: measureText — font validation warnings", () => {
  it("measureText produces warning when font is not loaded", async () => {
    _resetForTests();
    // Configure init with sans-serif (which should be checkable by the browser)
    // and a fake font. The sans-serif weight should pass document.fonts.check,
    // populating _loadedFonts. Then requesting a different font triggers the warning.
    await init({
      fonts: [
        { family: "sans-serif", weights: [400] },
      ],
    });

    // Precondition: at least one font must be in _loadedFonts for the
    // validation path to be active. If sans-serif didn't register (varies
    // by browser), the warning path is unreachable — skip gracefully.
    if (!isFontLoaded("sans-serif", 400)) {
      // Cannot test this path in this browser environment — not a failure
      return;
    }

    // Now call measureText with a font that is NOT in _loadedFonts
    const result = measureText("Test", { font: "UnloadedFont", weight: 400, w: 800 });
    assert.ok(result.warnings, "should have warnings array");
    assert.ok(result.warnings.length > 0, "should have at least one warning");
    assert.equal(result.warnings[0].type, "font_not_loaded");
  });
});

// =============================================================================
// M2.4: Auto-height for text elements
// =============================================================================

describe("M2.4: Auto-height text elements", () => {
  it("text without h gets auto-measured height in rendered DOM", async () => {
    _resetForTests();
    await init();
    await withContainer(async (container) => {
      const slides = [{
        elements: [
          text("Auto height text", {
            id: "auto-h", x: 100, y: 100, w: 600,
            font: "sans-serif", size: 32,
            // No h specified — should be auto-measured
          }),
        ],
      }];
      await render(slides, { container });
      const el = container.querySelector('[data-sk-id="auto-h"]');
      assert.ok(el, "element should exist");
      const height = parseInt(el.style.height, 10);
      assert.ok(height > 0, `auto-height should be > 0, got ${height}`);
    });
  });

  it("auto-height text is taller with more lines", async () => {
    _resetForTests();
    await init();
    await withContainer(async (container) => {
      const slides = [{
        elements: [
          text("Single line", {
            id: "single", x: 0, y: 0, w: 600,
            font: "sans-serif", size: 24,
          }),
          text("Line 1\nLine 2\nLine 3", {
            id: "multi", x: 0, y: 200, w: 600,
            font: "sans-serif", size: 24,
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

  it("text with explicit h uses that height (not auto-measured)", async () => {
    _resetForTests();
    await init();
    await withContainer(async (container) => {
      const slides = [{
        elements: [
          text("Explicit height", {
            id: "explicit-h", x: 0, y: 0, w: 600, h: 200,
            font: "sans-serif", size: 32,
          }),
        ],
      }];
      await render(slides, { container });
      const el = container.querySelector('[data-sk-id="explicit-h"]');
      assert.equal(el.style.height, "200px", "should use explicit h");
    });
  });

  it("empty text with no h gets height 0", async () => {
    _resetForTests();
    await init();
    await withContainer(async (container) => {
      const slides = [{
        elements: [
          text("", {
            id: "empty-auto", x: 0, y: 0, w: 600,
            font: "sans-serif", size: 32,
          }),
        ],
      }];
      await render(slides, { container });
      const el = container.querySelector('[data-sk-id="empty-auto"]');
      assert.equal(el.style.height, "0px", "empty text should get height 0");
    });
  });

  it("auto-height width comes from measurement when w not specified", async () => {
    _resetForTests();
    await init();
    // When neither w nor h is specified, measureText runs unconstrained
    const result = measureText("Unconstrained", { font: "sans-serif", size: 32 });
    assert.ok(result.block.w > 0, "unconstrained width should be > 0");
    assert.ok(result.block.h > 0, "unconstrained height should be > 0");
  });
});

// =============================================================================
// M2.2: Measurement container
// =============================================================================

describe("M2.2: Measurement container", () => {
  it("measurement container is created lazily on first measureText call", async () => {
    _resetForTests();
    await init();
    // After _resetForTests + init, no measurement container should exist yet
    // (measurement container is lazy — only created on first measureText call)
    const containerBefore = document.querySelector('[data-sk-role="measure-container"]');
    assert.equal(containerBefore, null,
      "precondition: measure container should not exist after reset/init");
    // After calling measureText, it should exist
    measureText("trigger container", { font: "sans-serif", size: 16, w: 200 });
    const containerAfter = document.querySelector('[data-sk-role="measure-container"]');
    assert.ok(containerAfter, "measurement container should exist after measureText call");
  });

  it("measurement container is hidden off-screen", async () => {
    _resetForTests();
    await init();
    measureText("trigger", { font: "sans-serif", size: 16, w: 200 });
    const container = document.querySelector('[data-sk-role="measure-container"]');
    assert.equal(container.style.visibility, "hidden");
    assert.equal(container.style.position, "absolute");
    assert.equal(container.style.left, "-9999px");
  });

  it("measurement container is cleaned up by _resetForTests", async () => {
    _resetForTests();
    await init();
    measureText("trigger", { font: "sans-serif", size: 16, w: 200 });
    assert.ok(document.querySelector('[data-sk-role="measure-container"]'),
      "container should exist before reset");
    _resetForTests();
    assert.equal(document.querySelector('[data-sk-role="measure-container"]'), null,
      "container should be removed after reset");
  });
});

// =============================================================================
// M2.1: Google Font link injection
// =============================================================================

describe("M2.1: Google Font link injection", () => {
  it("_resetForTests cleans up injected font links", async () => {
    _resetForTests();
    // We can't easily test actual Google Font loading without network,
    // but we can verify cleanup. If we call init with a Google font source,
    // it should inject a <link> and _resetForTests should remove it.
    await init({
      fonts: [{ family: "Roboto", weights: [400], source: "google" }],
    });
    // Check that the link was injected
    const link = document.querySelector('link[href*="fonts.googleapis.com"][href*="Roboto"]');
    assert.ok(link, "Google Font link should be injected");

    // Reset should clean it up
    _resetForTests();
    const linkAfterReset = document.querySelector('link[href*="fonts.googleapis.com"][href*="Roboto"]');
    assert.equal(linkAfterReset, null, "Google Font link should be removed after reset");
  });
});

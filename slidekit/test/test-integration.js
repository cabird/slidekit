// SlideKit Tests — M9.6 (Export Smoke Test / Integration Test)
//
// Renders a multi-slide deck using SlideKit and verifies:
// - The rendered DOM has the expected number of slides
// - Elements are positioned correctly (resolved bounds match DOM)
// - The scene model is populated on window.sk
// - Layout results contain valid warnings/errors arrays

import { describe, it, assert } from './test-runner.js';
import {
  el, group,
  vstack, hstack,
  panel, connect,
  below, rightOf,
  render, layout, init, _resetForTests, safeRect,
  alignTop, distributeH,
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
// M9.6: Multi-Slide Integration / Export Smoke Test
// =============================================================================

describe("M9.6: Multi-slide integration smoke test", () => {

  it("renders a 5-slide deck and produces correct number of sections", async () => {
    _resetForTests();
    await init();

    await withContainer(async (container) => {
      const slides = buildTestDeck();
      const result = await render(slides, { container });

      // Verify correct number of slides
      assert.equal(result.sections.length, 5, "should have 5 sections");
      assert.equal(result.layouts.length, 5, "should have 5 layout results");

      // Verify DOM has 5 <section> elements
      const sections = container.querySelectorAll("section");
      assert.equal(sections.length, 5, "DOM should have 5 section elements");

      // Each section should have a slidekit-layer
      for (let i = 0; i < sections.length; i++) {
        const layer = sections[i].querySelector(".slidekit-layer");
        assert.ok(layer, `section ${i} should have a .slidekit-layer`);
      }
    });
  });

  it("populates window.sk with scene model after render", async () => {
    _resetForTests();
    await init();

    await withContainer(async (container) => {
      const slides = buildTestDeck();
      await render(slides, { container });

      // window.sk should be populated
      assert.ok(window.sk, "window.sk should exist");
      assert.ok(window.sk.layouts, "window.sk.layouts should exist");
      assert.equal(window.sk.layouts.length, 5, "window.sk should have 5 layouts");
      assert.ok(window.sk.slides, "window.sk.slides should exist");
      assert.equal(window.sk.slides.length, 5, "window.sk should have 5 slides");
    });
  });

  it("layout results contain valid elements, warnings, errors, and collisions", async () => {
    _resetForTests();
    await init();

    await withContainer(async (container) => {
      const slides = buildTestDeck();
      const result = await render(slides, { container });

      for (let i = 0; i < result.layouts.length; i++) {
        const lay = result.layouts[i];

        // Each layout should have the expected fields
        assert.ok(lay.elements !== undefined, `slide ${i}: elements should exist`);
        assert.ok(Array.isArray(lay.warnings), `slide ${i}: warnings should be array`);
        assert.ok(Array.isArray(lay.errors), `slide ${i}: errors should be array`);
        assert.ok(Array.isArray(lay.collisions), `slide ${i}: collisions should be array`);

        // Elements should have resolved positions
        const elIds = Object.keys(lay.elements);
        assert.ok(elIds.length > 0, `slide ${i}: should have resolved elements`);

        for (const eid of elIds) {
          const elem = lay.elements[eid];
          assert.ok(elem.resolved, `slide ${i}, element "${eid}": should have resolved bounds`);
          assert.ok(typeof elem.resolved.x === "number", `slide ${i}, "${eid}": resolved.x should be number`);
          assert.ok(typeof elem.resolved.y === "number", `slide ${i}, "${eid}": resolved.y should be number`);
          assert.ok(typeof elem.resolved.w === "number", `slide ${i}, "${eid}": resolved.w should be number`);
          assert.ok(typeof elem.resolved.h === "number", `slide ${i}, "${eid}": resolved.h should be number`);
        }
      }
    });
  });

  it("resolved positions match DOM element positions", async () => {
    _resetForTests();
    await init();

    await withContainer(async (container) => {
      // Use a simple single slide for precise position checking
      const slides = [{
        id: "pos-check",
        elements: [
          el("", { id: "r1", x: 100, y: 200, w: 300, h: 150 }),
          el('<p style="font-size:32px;color:#fff">Hello</p>', { id: "t1", x: 500, y: 300, w: 400 }),
          el("", { id: "ru1", x: 100, y: 500, w: 200, h: 3, style: { background: "#fff" } }),
        ],
      }];

      const result = await render(slides, { container });
      const lay = result.layouts[0];

      // Check rect position
      const r1Resolved = lay.elements["r1"]?.resolved;
      assert.ok(r1Resolved, "r1 should be resolved");
      assert.equal(r1Resolved.x, 100, "r1.x should be 100");
      assert.equal(r1Resolved.y, 200, "r1.y should be 200");
      assert.equal(r1Resolved.w, 300, "r1.w should be 300");
      assert.equal(r1Resolved.h, 150, "r1.h should be 150");

      // Check DOM element
      const r1Dom = container.querySelector('[data-sk-id="r1"]');
      assert.ok(r1Dom, "r1 DOM element should exist");
      assert.equal(r1Dom.style.left, "100px", "r1 DOM left should be 100px");
      assert.equal(r1Dom.style.top, "200px", "r1 DOM top should be 200px");

      // Check text element resolved position
      const t1Resolved = lay.elements["t1"]?.resolved;
      assert.ok(t1Resolved, "t1 should be resolved");
      assert.equal(t1Resolved.x, 500, "t1.x should be 500");
      assert.equal(t1Resolved.y, 300, "t1.y should be 300");

      const t1Dom = container.querySelector('[data-sk-id="t1"]');
      assert.ok(t1Dom, "t1 DOM element should exist");
      assert.equal(t1Dom.style.left, "500px", "t1 DOM left should be 500px");
      assert.equal(t1Dom.style.top, "300px", "t1 DOM top should be 300px");
    });
  });

  it("relative positioning resolves correctly in multi-slide deck", async () => {
    _resetForTests();
    await init();

    await withContainer(async (container) => {
      const slides = [{
        id: "rel-check",
        elements: [
          el('<p style="font-size:48px;font-weight:700;color:#fff">Title</p>', {
            id: "rel-title", x: 100, y: 100, w: 400,
          }),
          el('<p style="font-size:28px;color:#fff">Subtitle</p>', {
            id: "rel-sub", x: 100, w: 400,
            y: below("rel-title", { gap: 20 }),
          }),
          el("", {
            id: "rel-box",
            x: rightOf("rel-title", { gap: 30 }),
            y: 100, w: 200, h: 100,
          }),
        ],
      }];

      const result = await render(slides, { container });
      const lay = result.layouts[0];

      const titleResolved = lay.elements["rel-title"]?.resolved;
      const subResolved = lay.elements["rel-sub"]?.resolved;
      const boxResolved = lay.elements["rel-box"]?.resolved;

      assert.ok(titleResolved, "title should be resolved");
      assert.ok(subResolved, "subtitle should be resolved");
      assert.ok(boxResolved, "box should be resolved");

      // Subtitle should be below title with 20px gap
      const expectedSubY = titleResolved.y + titleResolved.h + 20;
      assert.within(subResolved.y, expectedSubY, 2, "subtitle y should be below title + gap");

      // Box should be to the right of title with 30px gap
      const expectedBoxX = titleResolved.x + titleResolved.w + 30;
      assert.within(boxResolved.x, expectedBoxX, 2, "box x should be right of title + gap");
    });
  });

  it("slide IDs are set on section elements", async () => {
    _resetForTests();
    await init();

    await withContainer(async (container) => {
      const slides = buildTestDeck();
      await render(slides, { container });

      const sections = container.querySelectorAll("section");
      assert.equal(sections[0].id, "s-title", "first section should have id 's-title'");
      assert.equal(sections[1].id, "s-content", "second section should have id 's-content'");
    });
  });

  it("speaker notes are rendered as <aside> elements", async () => {
    _resetForTests();
    await init();

    await withContainer(async (container) => {
      const slides = [{
        id: "notes-test",
        notes: "These are speaker notes.",
        elements: [
          el('<p style="font-size:32px;color:#fff">Slide</p>', { x: 100, y: 100, w: 400 }),
        ],
      }];

      await render(slides, { container });

      const aside = container.querySelector("aside.notes");
      assert.ok(aside, "should render <aside class='notes'>");
      assert.equal(aside.textContent, "These are speaker notes.", "notes content should match");
    });
  });

  it("background property is applied to sections", async () => {
    _resetForTests();
    await init();

    await withContainer(async (container) => {
      const slides = [{
        id: "bg-test",
        background: "#1a1a2e",
        elements: [
          el('<p style="font-size:32px;color:#fff">BG Test</p>', { x: 100, y: 100, w: 400 }),
        ],
      }];

      await render(slides, { container });

      const section = container.querySelector("section");
      assert.ok(section, "section should exist");
      assert.equal(
        section.getAttribute("data-background-color"),
        "#1a1a2e",
        "background color should be set"
      );
    });
  });

  it("compound primitives render correctly in deck context", async () => {
    _resetForTests();
    await init();

    await withContainer(async (container) => {
      // A slide with panel and a list built from el()
      const slides = [{
        id: "compound-test",
        elements: [
          panel([
            el('<p style="font-size:24px;font-weight:600;color:#fff">Panel Title</p>', { w: "fill" }),
            el('<p style="font-size:18px;color:#ccc">Panel body text.</p>', { w: "fill" }),
          ], {
            id: "test-panel",
            x: 100, y: 100, w: 400,
            padding: 24, gap: 12,
          }),
          el('<ul style="font-size:24px;color:#fff"><li>First item</li><li>Second item</li><li>Third with children<ul><li>Sub A</li><li>Sub B</li></ul></li></ul>', {
            id: "test-list",
            x: 100, y: below("test-panel", { gap: 30 }),
            w: 600,
          }),
        ],
      }];

      const result = await render(slides, { container });
      const lay = result.layouts[0];

      // Panel should have resolved elements
      assert.ok(lay.elements["test-panel"], "panel should be in scene graph");

      // List should have resolved elements
      assert.ok(lay.elements["test-list"], "list should be in scene graph");

      // No errors
      assert.equal(lay.errors.length, 0, "should have no layout errors");
    });
  });

  it("connectors resolve between positioned elements", async () => {
    _resetForTests();
    await init();

    await withContainer(async (container) => {
      const slides = [{
        id: "conn-test",
        elements: [
          el("", { id: "box-a", x: 100, y: 300, w: 200, h: 100 }),
          el("", { id: "box-b", x: 500, y: 300, w: 200, h: 100 }),
          connect("box-a", "box-b", {
            id: "conn-ab",
            type: "straight",
            arrow: "end",
            color: "#7c5cbf",
            thickness: 2,
          }),
        ],
      }];

      const result = await render(slides, { container });
      const lay = result.layouts[0];

      // Connector should be resolved
      assert.ok(lay.elements["conn-ab"], "connector should be in scene graph");

      // The SVG connector should be in the DOM
      const connDom = container.querySelector('[data-sk-id="conn-ab"]');
      assert.ok(connDom, "connector DOM element should exist");
    });
  });

  it("window.sk._config reflects initialization settings", async () => {
    _resetForTests();
    await init({
      slide: { w: 1920, h: 1080 },
      safeZone: { left: 100, right: 100, top: 80, bottom: 80 },
      minFontSize: 20,
    });

    await withContainer(async (container) => {
      const slides = [{
        elements: [el('<p style="font-size:32px;color:#fff">Test</p>', { x: 100, y: 100, w: 400 })],
      }];
      await render(slides, { container });

      assert.ok(window.sk._config, "window.sk._config should exist");
      assert.equal(window.sk._config.slide.w, 1920, "slide width should be 1920");
      assert.equal(window.sk._config.slide.h, 1080, "slide height should be 1080");
      assert.equal(window.sk._config.safeZone.left, 100, "safe zone left should be 100");
      assert.equal(window.sk._config.minFontSize, 20, "minFontSize should be 20");
    });
  });
});

// =============================================================================
// Helper: build a 5-slide test deck exercising various features
// =============================================================================

function buildTestDeck() {
  return [
    // Slide 1: Title slide
    {
      id: "s-title",
      background: "#0c0c14",
      elements: [
        el("", { id: "s1-bg", x: 0, y: 0, w: 1920, h: 1080, layer: "bg",
          style: { background: "radial-gradient(ellipse at 30% 40%, rgba(124,92,191,0.15), transparent)" },
        }),
        el('<p style="font-size:72px;font-weight:700;color:#fff;text-align:center">Test Deck Title</p>', {
          id: "s1-title", x: 960, y: 400, w: 1200,
          anchor: "tc",
        }),
        el("", {
          id: "s1-rule", x: 900, y: below("s1-title", { gap: 24 }), w: 120, h: 3,
          style: { background: "#7c5cbf" },
        }),
        el('<p style="font-size:28px;color:rgba(255,255,255,0.6);text-align:center">A subtitle for testing</p>', {
          id: "s1-sub", x: 960, w: 800,
          y: below("s1-rule", { gap: 20 }),
          anchor: "tc",
        }),
      ],
      notes: "Title slide speaker notes.",
    },

    // Slide 2: Content with hstack panels
    {
      id: "s-content",
      elements: [
        el('<p style="font-size:48px;font-weight:700;color:#fff">Content Slide</p>', {
          id: "s2-heading", x: 120, y: 90, w: 1680,
        }),
        hstack([
          panel([
            el('<p style="font-size:24px;font-weight:600;color:#fff">Card A</p>', { w: "fill" }),
            el('<p style="font-size:18px;color:#ccc">Description.</p>', { w: "fill" }),
          ], { id: "s2-card-a", w: 480, padding: 24, gap: 12 }),
          panel([
            el('<p style="font-size:24px;font-weight:600;color:#fff">Card B</p>', { w: "fill" }),
            el('<p style="font-size:18px;color:#ccc">Description.</p>', { w: "fill" }),
          ], { id: "s2-card-b", w: 480, padding: 24, gap: 12 }),
        ], {
          id: "s2-cards", x: 120, y: below("s2-heading", { gap: 40 }), gap: 30,
        }),
      ],
    },

    // Slide 3: Diagram with connectors
    {
      id: "s-diagram",
      elements: [
        el('<p style="font-size:48px;font-weight:700;color:#fff">Diagram</p>', {
          id: "s3-heading", x: 120, y: 90, w: 800,
        }),
        el("", { id: "s3-box1", x: 200, y: 350, w: 250, h: 150 }),
        el("", { id: "s3-box2", x: 600, y: 350, w: 250, h: 150 }),
        connect("s3-box1", "s3-box2", {
          id: "s3-conn", type: "straight", arrow: "end", color: "#7c5cbf",
        }),
      ],
    },

    // Slide 4: Feature list
    {
      id: "s-features",
      elements: [
        el('<p style="font-size:48px;font-weight:700;color:#fff">Features</p>', {
          id: "s4-heading", x: 120, y: 90, w: 800,
        }),
        el('<ul style="font-size:28px;color:#fff"><li>First feature</li><li>Second feature</li><li>Third feature<ul><li>Detail A</li><li>Detail B</li></ul></li></ul>', {
          id: "s4-list",
          x: 120, y: below("s4-heading", { gap: 30 }),
          w: 1000,
        }),
      ],
    },

    // Slide 5: Closing
    {
      id: "s-closing",
      elements: [
        el('<p style="font-size:72px;font-weight:700;color:#fff;text-align:center">Thank You</p>', {
          id: "s5-title", x: 960, y: 450, w: 1200,
          anchor: "tc",
        }),
        el("", {
          id: "s5-rule", x: 900, y: below("s5-title", { gap: 24 }), w: 120, h: 3,
          style: { background: "#7c5cbf" },
        }),
        el('<p style="font-size:18px;color:rgba(255,255,255,0.3);text-align:center">The End</p>', {
          id: "s5-footer", x: 960, y: 950, w: 400,
          anchor: "bc",
        }),
      ],
    },
  ];
}

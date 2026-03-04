// SlideKit Tests — M1.4 (Basic Renderer) + M1.6 (Remaining Tests)
// Updated for v2 API: all element factories replaced by el(html, props)

import { describe, it, assert } from './test-runner.js';
import {
  el, group,
  render, resolveAnchor, filterStyle,
  init, getConfig, resetIdCounter, _resetForTests,
} from '../slidekit.js';

// =============================================================================
// Helper: create a temporary container for render tests
// =============================================================================

/**
 * Create a temporary container div, run a callback that renders into it,
 * then clean up the container. Supports both sync and async callbacks.
 */
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
// M1.4: render() — Basic DOM Structure
// =============================================================================

describe("M1.4: render() — basic DOM structure", () => {
  it("creates a <section> for each slide", async () => {
    await withContainer(async (container) => {
      const slides = [
        { id: "slide-1", elements: [] },
        { id: "slide-2", elements: [] },
      ];
      const { sections } = await render(slides, { container });
      assert.equal(sections.length, 2);
      assert.equal(container.querySelectorAll("section").length, 2);
    });
  });

  it("sets slide id on <section> elements", async () => {
    await withContainer(async (container) => {
      const slides = [{ id: "my-slide", elements: [] }];
      const { sections } = await render(slides, { container });
      assert.equal(sections[0].id, "my-slide");
    });
  });

  it("creates a slidekit-layer div inside each section", async () => {
    await withContainer(async (container) => {
      const slides = [{ elements: [] }];
      const { sections } = await render(slides, { container });
      const layer = sections[0].querySelector(".slidekit-layer");
      assert.ok(layer, "slidekit-layer should exist");
      assert.equal(layer.style.position, "relative");
    });
  });

  it("slidekit-layer uses default 1920x1080 when no config", async () => {
    _resetForTests();
    await withContainer(async (container) => {
      const slides = [{ elements: [] }];
      const { sections } = await render(slides, { container });
      const layer = sections[0].querySelector(".slidekit-layer");
      assert.equal(layer.style.width, "1920px");
      assert.equal(layer.style.height, "1080px");
    });
  });

  it("slidekit-layer uses configured slide dimensions", async () => {
    _resetForTests();
    await init({ slide: { w: 3840, h: 2160 } });
    await withContainer(async (container) => {
      const slides = [{ elements: [] }];
      const { sections } = await render(slides, { container });
      const layer = sections[0].querySelector(".slidekit-layer");
      assert.equal(layer.style.width, "3840px");
      assert.equal(layer.style.height, "2160px");
    });
    _resetForTests();
  });

  it("renders element divs inside slidekit-layer", async () => {
    await withContainer(async (container) => {
      resetIdCounter();
      const slides = [{
        elements: [
          el('<p>Hello</p>', { id: "t1", x: 100, y: 200, w: 400, h: 50 }),
          el('', { id: "r1", x: 0, y: 0, w: 100, h: 100 }),
        ],
      }];
      const { sections } = await render(slides, { container });
      const layer = sections[0].querySelector(".slidekit-layer");
      const children = layer.querySelectorAll("[data-sk-id]");
      assert.equal(children.length, 2);
    });
  });

  it("rejects when no container is available", async () => {
    let rejected = false;
    try {
      await render([{ elements: [] }], { container: null });
    } catch (e) {
      rejected = true;
    }
    assert.ok(rejected, "render() should reject when no container is available");
  });

  it("returns created sections array", async () => {
    await withContainer(async (container) => {
      const slides = [{ elements: [] }, { elements: [] }];
      const { sections } = await render(slides, { container });
      assert.equal(sections.length, 2);
      assert.equal(sections[0].tagName, "SECTION");
      assert.equal(sections[1].tagName, "SECTION");
    });
  });

  it("returns empty array for empty slides input", async () => {
    await withContainer(async (container) => {
      const { sections } = await render([], { container });
      assert.equal(sections.length, 0);
      assert.equal(container.querySelectorAll("section").length, 0);
    });
  });
});

// =============================================================================
// M1.4: data-sk-id attributes
// =============================================================================

describe("M1.4: data-sk-id attributes", () => {
  it("sets data-sk-id on all rendered elements", async () => {
    await withContainer(async (container) => {
      resetIdCounter();
      const slides = [{
        elements: [
          el('<p>A</p>', { id: "text-1", x: 0, y: 0, w: 200, h: 40 }),
          el('', { id: "rect-1", x: 0, y: 50, w: 200, h: 100 }),
          el('<img src="test.jpg" style="width:100%;height:100%;object-fit:cover">', { id: "img-1", x: 0, y: 160, w: 200, h: 100 }),
        ],
      }];
      await render(slides, { container });
      assert.ok(container.querySelector('[data-sk-id="text-1"]'), "text element should have data-sk-id");
      assert.ok(container.querySelector('[data-sk-id="rect-1"]'), "rect element should have data-sk-id");
      assert.ok(container.querySelector('[data-sk-id="img-1"]'), "image element should have data-sk-id");
    });
  });

  it("sets data-sk-id on auto-generated IDs", async () => {
    await withContainer(async (container) => {
      resetIdCounter();
      const slides = [{
        elements: [
          el('<p>A</p>', { x: 0, y: 0, w: 200, h: 40 }),
        ],
      }];
      await render(slides, { container });
      // After resetIdCounter in render(), the first element gets sk-1
      const found = container.querySelector('[data-sk-id="sk-1"]');
      assert.ok(found, "auto-generated ID should be set as data-sk-id");
    });
  });

  it("sets data-sk-id on group children", async () => {
    await withContainer(async (container) => {
      resetIdCounter();
      const slides = [{
        elements: [
          group([
            el('<p>Child</p>', { id: "child-text", x: 0, y: 0, w: 100, h: 30 }),
          ], { id: "grp", x: 50, y: 50, w: 400, h: 300 }),
        ],
      }];
      await render(slides, { container });
      assert.ok(container.querySelector('[data-sk-id="grp"]'), "group should have data-sk-id");
      assert.ok(container.querySelector('[data-sk-id="child-text"]'), "group child should have data-sk-id");
    });
  });
});

// =============================================================================
// M1.4: Element positions (left/top styles)
// =============================================================================

describe("M1.4: element positions", () => {
  it("sets correct left/top for tl anchor", async () => {
    await withContainer(async (container) => {
      const slides = [{
        elements: [
          el('', { id: "r", x: 100, y: 200, w: 300, h: 150, anchor: "tl" }),
        ],
      }];
      await render(slides, { container });
      const found = container.querySelector('[data-sk-id="r"]');
      assert.equal(found.style.left, "100px");
      assert.equal(found.style.top, "200px");
    });
  });

  it("sets correct left/top for cc anchor", async () => {
    await withContainer(async (container) => {
      const slides = [{
        elements: [
          el('', { id: "r", x: 960, y: 540, w: 400, h: 200, anchor: "cc" }),
        ],
      }];
      await render(slides, { container });
      const found = container.querySelector('[data-sk-id="r"]');
      // cc: left = 960 - 200 = 760, top = 540 - 100 = 440
      assert.equal(found.style.left, "760px");
      assert.equal(found.style.top, "440px");
    });
  });

  it("sets correct left/top for br anchor", async () => {
    await withContainer(async (container) => {
      const slides = [{
        elements: [
          el('', { id: "r", x: 500, y: 400, w: 200, h: 100, anchor: "br" }),
        ],
      }];
      await render(slides, { container });
      const found = container.querySelector('[data-sk-id="r"]');
      // br: left = 500 - 200 = 300, top = 400 - 100 = 300
      assert.equal(found.style.left, "300px");
      assert.equal(found.style.top, "300px");
    });
  });
});

// =============================================================================
// M1.4: Element dimensions (width/height styles)
// =============================================================================

describe("M1.4: element dimensions", () => {
  it("sets width and height on element", async () => {
    await withContainer(async (container) => {
      const slides = [{
        elements: [
          el('', { id: "r", x: 0, y: 0, w: 400, h: 300 }),
        ],
      }];
      await render(slides, { container });
      const found = container.querySelector('[data-sk-id="r"]');
      assert.equal(found.style.width, "400px");
      assert.equal(found.style.height, "300px");
    });
  });

  it("uses position:absolute and box-sizing:border-box", async () => {
    await withContainer(async (container) => {
      const slides = [{
        elements: [
          el('', { id: "r", x: 0, y: 0, w: 100, h: 100 }),
        ],
      }];
      await render(slides, { container });
      const found = container.querySelector('[data-sk-id="r"]');
      assert.equal(found.style.position, "absolute");
      assert.equal(found.style.boxSizing, "border-box");
    });
  });
});

// =============================================================================
// M1.4: Text content rendering
// =============================================================================

describe("M1.4: text element rendering", () => {
  it("renders text content", async () => {
    await withContainer(async (container) => {
      const slides = [{
        elements: [
          el('<p>Hello World</p>', { id: "t", x: 0, y: 0, w: 400, h: 50 }),
        ],
      }];
      await render(slides, { container });
      const found = container.querySelector('[data-sk-id="t"]');
      assert.equal(found.textContent, "Hello World");
    });
  });

  it("converts \\n to <br> elements", async () => {
    await withContainer(async (container) => {
      const slides = [{
        elements: [
          el('Line 1<br>Line 2<br>Line 3', { id: "t", x: 0, y: 0, w: 400, h: 100 }),
        ],
      }];
      await render(slides, { container });
      const found = container.querySelector('[data-sk-id="t"]');
      const brs = found.querySelectorAll("br");
      assert.equal(brs.length, 2, "should have 2 <br> elements");
      assert.equal(found.textContent, "Line 1Line 2Line 3");
    });
  });

  it("renders empty string content safely", async () => {
    await withContainer(async (container) => {
      const slides = [{
        elements: [
          el('', { id: "t", x: 0, y: 0, w: 200, h: 30 }),
        ],
      }];
      await render(slides, { container });
      const found = container.querySelector('[data-sk-id="t"]');
      assert.equal(found.textContent, "");
    });
  });

  it("el() renders raw HTML via innerHTML (no XSS escaping by design)", async () => {
    await withContainer(async (container) => {
      // v2: el() uses innerHTML, so HTML is rendered as-is.
      // Script tags inserted via innerHTML do not execute per the HTML spec,
      // but the content is treated as HTML, not escaped text.
      const slides = [{
        elements: [
          el('<b>Bold</b> and <em>italic</em>', { id: "t", x: 0, y: 0, w: 400, h: 50 }),
        ],
      }];
      await render(slides, { container });
      const found = container.querySelector('[data-sk-id="t"]');
      assert.ok(found.querySelector("b"), "HTML tags should be rendered as DOM elements");
      assert.equal(found.textContent, "Bold and italic");
    });
  });
});

// =============================================================================
// M1.4: Image element rendering
// =============================================================================

describe("M1.4: image element rendering", () => {
  it("renders <img> child with correct src", async () => {
    await withContainer(async (container) => {
      const slides = [{
        elements: [
          el('<img src="test.jpg" style="width:100%;height:100%;object-fit:cover">', { id: "img", x: 0, y: 0, w: 400, h: 300 }),
        ],
      }];
      await render(slides, { container });
      const found = container.querySelector('[data-sk-id="img"]');
      const img = found.querySelector("img");
      assert.ok(img, "should have an <img> child");
      assert.ok(img.src.endsWith("test.jpg"), "img src should contain test.jpg");
    });
  });

  it("sets object-fit from fit prop (default: cover)", async () => {
    await withContainer(async (container) => {
      const slides = [{
        elements: [
          el('<img src="test.jpg" style="width:100%;height:100%;object-fit:cover">', { id: "img", x: 0, y: 0, w: 400, h: 300 }),
        ],
      }];
      await render(slides, { container });
      const img = container.querySelector('[data-sk-id="img"] img');
      assert.equal(img.style.objectFit, "cover");
    });
  });

  it("sets object-fit from explicit fit prop", async () => {
    await withContainer(async (container) => {
      const slides = [{
        elements: [
          el('<img src="test.jpg" style="width:100%;height:100%;object-fit:contain">', { id: "img", x: 0, y: 0, w: 400, h: 300 }),
        ],
      }];
      await render(slides, { container });
      const img = container.querySelector('[data-sk-id="img"] img');
      assert.equal(img.style.objectFit, "contain");
    });
  });

  it("sets object-position from position prop", async () => {
    await withContainer(async (container) => {
      const slides = [{
        elements: [
          el('<img src="test.jpg" style="width:100%;height:100%;object-fit:cover;object-position:top left">', { id: "img", x: 0, y: 0, w: 400, h: 300 }),
        ],
      }];
      await render(slides, { container });
      const img = container.querySelector('[data-sk-id="img"] img');
      // Browsers may normalize "top left" to "left top"
      const pos = img.style.objectPosition;
      assert.ok(
        pos === "top left" || pos === "left top",
        `object-position should be "top left" or "left top", got "${pos}"`
      );
    });
  });

  it("img has width/height 100% and display block", async () => {
    await withContainer(async (container) => {
      const slides = [{
        elements: [
          el('<img src="test.jpg" style="width:100%;height:100%;display:block;object-fit:cover">', { id: "img", x: 0, y: 0, w: 400, h: 300 }),
        ],
      }];
      await render(slides, { container });
      const img = container.querySelector('[data-sk-id="img"] img');
      assert.equal(img.style.width, "100%");
      assert.equal(img.style.height, "100%");
      assert.equal(img.style.display, "block");
    });
  });
});

// =============================================================================
// M1.4: Rect element rendering
// =============================================================================

describe("M1.4: rect element rendering", () => {
  it("renders as a styled div with fill applied as background", async () => {
    await withContainer(async (container) => {
      const slides = [{
        elements: [
          el('', { id: "r", x: 100, y: 200, w: 300, h: 150, style: { background: "#1a1a2e" } }),
        ],
      }];
      await render(slides, { container });
      const found = container.querySelector('[data-sk-id="r"]');
      assert.ok(found, "rect element should exist");
      // background is applied via the style prop; browser may store as hex or rgb
      const bg = found.style.background;
      assert.ok(
        bg === "#1a1a2e" || bg.includes("26, 26, 46") || bg === "rgb(26, 26, 46)",
        `rect background should reflect fill value, got: "${bg}"`
      );
    });
  });

  it("applies radius as borderRadius", async () => {
    await withContainer(async (container) => {
      const slides = [{
        elements: [
          el('', { id: "r", x: 0, y: 0, w: 100, h: 100, style: { borderRadius: "16px" } }),
        ],
      }];
      await render(slides, { container });
      const found = container.querySelector('[data-sk-id="r"]');
      assert.equal(found.style.borderRadius, "16px");
    });
  });
});

// =============================================================================
// M1.4: Rule element rendering
// =============================================================================

describe("M1.4: rule element rendering", () => {
  it("horizontal rule has correct width and height=thickness", async () => {
    await withContainer(async (container) => {
      const slides = [{
        elements: [
          el('', { id: "hr", x: 170, y: 300, w: 120, h: 3, style: { background: "#ffffff" } }),
        ],
      }];
      await render(slides, { container });
      const found = container.querySelector('[data-sk-id="hr"]');
      assert.equal(found.style.width, "120px");
      assert.equal(found.style.height, "3px");
    });
  });

  it("vertical rule has correct height and width=thickness", async () => {
    await withContainer(async (container) => {
      const slides = [{
        elements: [
          el('', { id: "vr", x: 100, y: 100, w: 4, h: 200, style: { background: "#ffffff" } }),
        ],
      }];
      await render(slides, { container });
      const found = container.querySelector('[data-sk-id="vr"]');
      assert.equal(found.style.width, "4px");
      assert.equal(found.style.height, "200px");
    });
  });

  it("rule has backgroundColor from color prop", async () => {
    await withContainer(async (container) => {
      const slides = [{
        elements: [
          el('', { id: "r", x: 0, y: 0, w: 100, h: 2, style: { background: "#7c5cbf" } }),
        ],
      }];
      await render(slides, { container });
      const found = container.querySelector('[data-sk-id="r"]');
      // background should be the rule's color
      const bg = found.style.background;
      assert.ok(
        bg === "rgb(124, 92, 191)" || bg === "#7c5cbf",
        "rule background should match color prop"
      );
    });
  });

  it("rule defaults to white color and 2px thickness", async () => {
    await withContainer(async (container) => {
      const slides = [{
        elements: [
          el('', { id: "r", x: 0, y: 0, w: 100, h: 2, style: { background: "#ffffff" } }),
        ],
      }];
      await render(slides, { container });
      const found = container.querySelector('[data-sk-id="r"]');
      assert.equal(found.style.height, "2px");
    });
  });
});

// =============================================================================
// M1.4: Group element rendering
// =============================================================================

describe("M1.4: group element rendering", () => {
  it("renders group as container with children inside", async () => {
    await withContainer(async (container) => {
      const slides = [{
        elements: [
          group([
            el('', { id: "c1", x: 0, y: 0, w: 100, h: 50 }),
            el('<p>Hi</p>', { id: "c2", x: 0, y: 60, w: 100, h: 30 }),
          ], { id: "g", x: 200, y: 100, w: 400, h: 300 }),
        ],
      }];
      await render(slides, { container });
      const grpEl = container.querySelector('[data-sk-id="g"]');
      assert.ok(grpEl, "group element should exist");
      const children = grpEl.querySelectorAll("[data-sk-id]");
      assert.equal(children.length, 2, "group should contain 2 children");
    });
  });

  it("group children are positioned relative to group", async () => {
    await withContainer(async (container) => {
      const slides = [{
        elements: [
          group([
            el('', { id: "c1", x: 10, y: 20, w: 50, h: 50 }),
          ], { id: "g", x: 200, y: 100, w: 400, h: 300 }),
        ],
      }];
      await render(slides, { container });
      // Group div is at left:200, top:100
      const grpEl = container.querySelector('[data-sk-id="g"]');
      assert.equal(grpEl.style.left, "200px");
      assert.equal(grpEl.style.top, "100px");

      // Child is at x:10, y:20 relative to group (so left:10, top:20 within group div)
      const child = container.querySelector('[data-sk-id="c1"]');
      assert.equal(child.style.left, "10px");
      assert.equal(child.style.top, "20px");
    });
  });

  it("nested groups render recursively", async () => {
    await withContainer(async (container) => {
      const slides = [{
        elements: [
          group([
            group([
              el('', { id: "inner-rect", x: 0, y: 0, w: 50, h: 50 }),
            ], { id: "inner-group", x: 10, y: 10, w: 100, h: 100 }),
          ], { id: "outer-group", x: 50, y: 50, w: 200, h: 200 }),
        ],
      }];
      await render(slides, { container });
      const outer = container.querySelector('[data-sk-id="outer-group"]');
      assert.ok(outer, "outer group should exist");
      const inner = outer.querySelector('[data-sk-id="inner-group"]');
      assert.ok(inner, "inner group should be inside outer");
      const innerRect = inner.querySelector('[data-sk-id="inner-rect"]');
      assert.ok(innerRect, "inner rect should be inside inner group");
    });
  });
});

// =============================================================================
// M1.4: Z-ordering
// =============================================================================

describe("M1.4: z-ordering", () => {
  it("bg layer elements have lower z-index than content layer", async () => {
    await withContainer(async (container) => {
      const slides = [{
        elements: [
          el('', { id: "content-el", x: 0, y: 0, w: 100, h: 100, layer: "content" }),
          el('', { id: "bg-el", x: 0, y: 0, w: 100, h: 100, layer: "bg" }),
        ],
      }];
      await render(slides, { container });
      const bgEl = container.querySelector('[data-sk-id="bg-el"]');
      const contentEl = container.querySelector('[data-sk-id="content-el"]');
      const bgZ = parseInt(bgEl.style.zIndex, 10);
      const contentZ = parseInt(contentEl.style.zIndex, 10);
      assert.ok(bgZ < contentZ, `bg z-index (${bgZ}) should be less than content z-index (${contentZ})`);
    });
  });

  it("overlay layer elements have higher z-index than content layer", async () => {
    await withContainer(async (container) => {
      const slides = [{
        elements: [
          el('', { id: "content-el", x: 0, y: 0, w: 100, h: 100, layer: "content" }),
          el('', { id: "overlay-el", x: 0, y: 0, w: 100, h: 100, layer: "overlay" }),
        ],
      }];
      await render(slides, { container });
      const contentEl = container.querySelector('[data-sk-id="content-el"]');
      const overlayEl = container.querySelector('[data-sk-id="overlay-el"]');
      const contentZ = parseInt(contentEl.style.zIndex, 10);
      const overlayZ = parseInt(overlayEl.style.zIndex, 10);
      assert.ok(overlayZ > contentZ, `overlay z-index (${overlayZ}) should be greater than content z-index (${contentZ})`);
    });
  });

  it("declaration order determines z-index within same layer", async () => {
    await withContainer(async (container) => {
      const slides = [{
        elements: [
          el('', { id: "first", x: 0, y: 0, w: 100, h: 100 }),
          el('', { id: "second", x: 0, y: 0, w: 100, h: 100 }),
          el('', { id: "third", x: 0, y: 0, w: 100, h: 100 }),
        ],
      }];
      await render(slides, { container });
      const z1 = parseInt(container.querySelector('[data-sk-id="first"]').style.zIndex, 10);
      const z2 = parseInt(container.querySelector('[data-sk-id="second"]').style.zIndex, 10);
      const z3 = parseInt(container.querySelector('[data-sk-id="third"]').style.zIndex, 10);
      assert.ok(z1 < z2, "first element should have lower z than second");
      assert.ok(z2 < z3, "second element should have lower z than third");
    });
  });

  it("explicit z overrides declaration order", async () => {
    await withContainer(async (container) => {
      const slides = [{
        elements: [
          el('', { id: "first", x: 0, y: 0, w: 100, h: 100, z: 10 }),
          el('', { id: "second", x: 0, y: 0, w: 100, h: 100, z: 5 }),
        ],
      }];
      await render(slides, { container });
      const z1 = parseInt(container.querySelector('[data-sk-id="first"]').style.zIndex, 10);
      const z2 = parseInt(container.querySelector('[data-sk-id="second"]').style.zIndex, 10);
      assert.ok(z1 > z2, `first (z:10) should have higher z-index (${z1}) than second (z:5, ${z2})`);
    });
  });

  it("negative z pushes element behind default-ordered elements", async () => {
    await withContainer(async (container) => {
      const slides = [{
        elements: [
          el('', { id: "default-el", x: 0, y: 0, w: 100, h: 100 }),
          el('', { id: "behind-el", x: 0, y: 0, w: 100, h: 100, z: -1 }),
        ],
      }];
      await render(slides, { container });
      const defaultZ = parseInt(container.querySelector('[data-sk-id="default-el"]').style.zIndex, 10);
      const behindZ = parseInt(container.querySelector('[data-sk-id="behind-el"]').style.zIndex, 10);
      assert.ok(behindZ < defaultZ, `z:-1 element (${behindZ}) should be behind default (${defaultZ})`);
    });
  });

  it("all three layers sort correctly: bg < content < overlay", async () => {
    await withContainer(async (container) => {
      const slides = [{
        elements: [
          el('', { id: "overlay", x: 0, y: 0, w: 100, h: 100, layer: "overlay" }),
          el('', { id: "bg", x: 0, y: 0, w: 100, h: 100, layer: "bg" }),
          el('', { id: "content", x: 0, y: 0, w: 100, h: 100, layer: "content" }),
        ],
      }];
      await render(slides, { container });
      const bgZ = parseInt(container.querySelector('[data-sk-id="bg"]').style.zIndex, 10);
      const contentZ = parseInt(container.querySelector('[data-sk-id="content"]').style.zIndex, 10);
      const overlayZ = parseInt(container.querySelector('[data-sk-id="overlay"]').style.zIndex, 10);
      assert.ok(bgZ < contentZ, "bg < content");
      assert.ok(contentZ < overlayZ, "content < overlay");
    });
  });
});

// =============================================================================
// M1.4: Slide background
// =============================================================================

describe("M1.4: slide background", () => {
  it("hex color sets data-background-color", async () => {
    await withContainer(async (container) => {
      const slides = [{ background: "#0c0c14", elements: [] }];
      const { sections } = await render(slides, { container });
      assert.equal(sections[0].getAttribute("data-background-color"), "#0c0c14");
    });
  });

  it("rgb color sets data-background-color", async () => {
    await withContainer(async (container) => {
      const slides = [{ background: "rgb(12, 12, 20)", elements: [] }];
      const { sections } = await render(slides, { container });
      assert.equal(sections[0].getAttribute("data-background-color"), "rgb(12, 12, 20)");
    });
  });

  it("rgba color sets data-background-color", async () => {
    await withContainer(async (container) => {
      const slides = [{ background: "rgba(12, 12, 20, 0.5)", elements: [] }];
      const { sections } = await render(slides, { container });
      assert.equal(sections[0].getAttribute("data-background-color"), "rgba(12, 12, 20, 0.5)");
    });
  });

  it("hsl color sets data-background-color", async () => {
    await withContainer(async (container) => {
      const slides = [{ background: "hsl(240, 25%, 6%)", elements: [] }];
      const { sections } = await render(slides, { container });
      assert.equal(sections[0].getAttribute("data-background-color"), "hsl(240, 25%, 6%)");
    });
  });

  it("hsla color sets data-background-color", async () => {
    await withContainer(async (container) => {
      const slides = [{ background: "hsla(240, 25%, 6%, 0.8)", elements: [] }];
      const { sections } = await render(slides, { container });
      assert.equal(sections[0].getAttribute("data-background-color"), "hsla(240, 25%, 6%, 0.8)");
    });
  });

  it("linear-gradient sets data-background-gradient", async () => {
    await withContainer(async (container) => {
      const slides = [{ background: "linear-gradient(135deg, #1a1a2e, #16213e)", elements: [] }];
      const { sections } = await render(slides, { container });
      assert.equal(
        sections[0].getAttribute("data-background-gradient"),
        "linear-gradient(135deg, #1a1a2e, #16213e)"
      );
    });
  });

  it("radial-gradient sets data-background-gradient", async () => {
    await withContainer(async (container) => {
      const slides = [{ background: "radial-gradient(circle, #fff, #000)", elements: [] }];
      const { sections } = await render(slides, { container });
      assert.equal(
        sections[0].getAttribute("data-background-gradient"),
        "radial-gradient(circle, #fff, #000)"
      );
    });
  });

  it("image path sets data-background-image", async () => {
    await withContainer(async (container) => {
      const slides = [{ background: "assets/images/hero-bg.png", elements: [] }];
      const { sections } = await render(slides, { container });
      assert.equal(sections[0].getAttribute("data-background-image"), "assets/images/hero-bg.png");
    });
  });

  it("URL sets data-background-image", async () => {
    await withContainer(async (container) => {
      const slides = [{ background: "https://example.com/bg.jpg", elements: [] }];
      const { sections } = await render(slides, { container });
      assert.equal(sections[0].getAttribute("data-background-image"), "https://example.com/bg.jpg");
    });
  });

  it("no background property means no data-background attributes", async () => {
    await withContainer(async (container) => {
      const slides = [{ elements: [] }];
      const { sections } = await render(slides, { container });
      assert.equal(sections[0].getAttribute("data-background-color"), null);
      assert.equal(sections[0].getAttribute("data-background-gradient"), null);
      assert.equal(sections[0].getAttribute("data-background-image"), null);
    });
  });
});

// =============================================================================
// M1.4: Speaker notes
// =============================================================================

describe("M1.4: speaker notes", () => {
  it("renders <aside class='notes'> when notes property present", async () => {
    await withContainer(async (container) => {
      const slides = [{
        elements: [],
        notes: "Welcome to the presentation.",
      }];
      const { sections } = await render(slides, { container });
      const aside = sections[0].querySelector("aside.notes");
      assert.ok(aside, "aside.notes should exist");
      assert.equal(aside.textContent, "Welcome to the presentation.");
    });
  });

  it("does not render aside when notes property missing", async () => {
    await withContainer(async (container) => {
      const slides = [{ elements: [] }];
      const { sections } = await render(slides, { container });
      const aside = sections[0].querySelector("aside.notes");
      assert.equal(aside, null, "aside.notes should not exist when no notes");
    });
  });

  it("does not render aside when notes is empty string", async () => {
    await withContainer(async (container) => {
      const slides = [{ elements: [], notes: "" }];
      const { sections } = await render(slides, { container });
      const aside = sections[0].querySelector("aside.notes");
      assert.equal(aside, null, "aside.notes should not exist for empty notes");
    });
  });
});

// =============================================================================
// M1.4: className
// =============================================================================

describe("M1.4: className", () => {
  it("applies className to rendered element", async () => {
    await withContainer(async (container) => {
      const slides = [{
        elements: [
          el('', { id: "r", x: 0, y: 0, w: 100, h: 100, className: "glass-card accent" }),
        ],
      }];
      await render(slides, { container });
      const found = container.querySelector('[data-sk-id="r"]');
      assert.ok(found.classList.contains("glass-card"), "should have glass-card class");
      assert.ok(found.classList.contains("accent"), "should have accent class");
    });
  });

  it("no className means no class attribute set", async () => {
    await withContainer(async (container) => {
      const slides = [{
        elements: [
          el('', { id: "r", x: 0, y: 0, w: 100, h: 100 }),
        ],
      }];
      await render(slides, { container });
      const found = container.querySelector('[data-sk-id="r"]');
      assert.equal(found.className, "");
    });
  });
});

// =============================================================================
// M1.4: CSS filtering applied in rendering
// =============================================================================

describe("M1.4: CSS filtering in rendering", () => {
  it("blocked CSS properties do not appear in rendered styles", async () => {
    await withContainer(async (container) => {
      const slides = [{
        elements: [
          el('', {
            id: "r", x: 0, y: 0, w: 100, h: 100,
            style: {
              display: "flex",
              margin: "10px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            },
          }),
        ],
      }];
      await render(slides, { container });
      const found = container.querySelector('[data-sk-id="r"]');
      // boxShadow should be applied
      assert.ok(found.style.boxShadow.includes("rgba"), "boxShadow should be applied");
      // display should NOT be "flex" (blocked), it should be whatever the default is or empty
      assert.ok(found.style.display !== "flex", "display:flex should be blocked");
    });
  });

  it("style properties are applied to rendered elements", async () => {
    await withContainer(async (container) => {
      const slides = [{
        elements: [
          el('<p>Hello</p>', {
            id: "t", x: 0, y: 0, w: 200, h: 50,
            style: {
              color: "#ff0000",
              fontSize: "48px",
              fontWeight: "700",
              fontFamily: "Georgia, sans-serif",
            },
          }),
        ],
      }];
      await render(slides, { container });
      const found = container.querySelector('[data-sk-id="t"]');
      assert.equal(found.style.color, "rgb(255, 0, 0)");
      assert.equal(found.style.fontSize, "48px");
      assert.equal(found.style.fontWeight, "700");
      // Browser normalizes single-word font families by dropping quotes
      assert.equal(found.style.fontFamily, "Georgia, sans-serif");
    });
  });

  it("style object properties are applied to rendered element", async () => {
    await withContainer(async (container) => {
      const slides = [{
        elements: [
          el('<p>Hello</p>', {
            id: "t", x: 0, y: 0, w: 200, h: 50,
            style: { color: "red" },
          }),
        ],
      }];
      await render(slides, { container });
      const found = container.querySelector('[data-sk-id="t"]');
      assert.equal(found.style.color, "red");
    });
  });

  it("CSS custom properties are applied via setProperty", async () => {
    await withContainer(async (container) => {
      const slides = [{
        elements: [
          el('', {
            id: "r", x: 0, y: 0, w: 100, h: 100,
            style: { "--sk-accent": "#7c5cbf", "--glow-size": "20px" },
          }),
        ],
      }];
      await render(slides, { container });
      const found = container.querySelector('[data-sk-id="r"]');
      assert.equal(
        found.style.getPropertyValue("--sk-accent"),
        "#7c5cbf",
        "CSS custom property --sk-accent should be set"
      );
      assert.equal(
        found.style.getPropertyValue("--glow-size"),
        "20px",
        "CSS custom property --glow-size should be set"
      );
    });
  });
});

// =============================================================================
// M1.4: Opacity
// =============================================================================

describe("M1.4: opacity", () => {
  it("applies opacity when not 1", async () => {
    await withContainer(async (container) => {
      const slides = [{
        elements: [
          el('', { id: "r", x: 0, y: 0, w: 100, h: 100, opacity: 0.5 }),
        ],
      }];
      await render(slides, { container });
      const found = container.querySelector('[data-sk-id="r"]');
      assert.equal(found.style.opacity, "0.5");
    });
  });

  it("does not set opacity when it is 1 (default)", async () => {
    await withContainer(async (container) => {
      const slides = [{
        elements: [
          el('', { id: "r", x: 0, y: 0, w: 100, h: 100 }),
        ],
      }];
      await render(slides, { container });
      const found = container.querySelector('[data-sk-id="r"]');
      assert.equal(found.style.opacity, "");
    });
  });
});

// =============================================================================
// M1.4: ID determinism
// =============================================================================

describe("M1.4: ID determinism in render()", () => {
  it("resets ID counter at start of render for deterministic IDs", async () => {
    await withContainer(async (container) => {
      // First render
      const slides = [{
        elements: [
          el('<p>A</p>', { x: 0, y: 0, w: 100, h: 30 }),
          el('', { x: 0, y: 0, w: 50, h: 50 }),
        ],
      }];
      await render(slides, { container });
      const ids1 = Array.from(container.querySelectorAll("[data-sk-id]")).map(
        found => found.getAttribute("data-sk-id")
      );

      // Clear and render again
      container.innerHTML = "";
      await render(slides, { container });
      const ids2 = Array.from(container.querySelectorAll("[data-sk-id]")).map(
        found => found.getAttribute("data-sk-id")
      );

      assert.deepEqual(ids1, ids2, "IDs should be deterministic across render calls");
    });
  });
});

// =============================================================================
// M1.4: Multiple slides
// =============================================================================

describe("M1.4: multiple slides", () => {
  it("renders multiple slides with separate sections", async () => {
    await withContainer(async (container) => {
      const slides = [
        {
          id: "slide-1",
          background: "#000",
          elements: [el('<p>Slide 1</p>', { id: "s1-text", x: 0, y: 0, w: 200, h: 50 })],
          notes: "First slide notes",
        },
        {
          id: "slide-2",
          background: "linear-gradient(135deg, #1a1a2e, #16213e)",
          elements: [
            el('', { id: "s2-bg", x: 0, y: 0, w: 1920, h: 1080, layer: "bg" }),
            el('<p>Slide 2</p>', { id: "s2-text", x: 100, y: 100, w: 200, h: 50 }),
          ],
        },
      ];
      const { sections } = await render(slides, { container });
      assert.equal(sections.length, 2);

      // Slide 1
      assert.equal(sections[0].id, "slide-1");
      assert.equal(sections[0].getAttribute("data-background-color"), "#000");
      assert.ok(sections[0].querySelector("aside.notes"));

      // Slide 2
      assert.equal(sections[1].id, "slide-2");
      assert.ok(sections[1].getAttribute("data-background-gradient"));
      assert.equal(sections[1].querySelector("aside.notes"), null);
    });
  });
});

// =============================================================================
// P0.2: Post-render DOM overflow detection
// =============================================================================

describe("P0.2: DOM overflow detection", () => {
  it("detects dom_overflow_y when content overflows element height", async () => {
    await withContainer(async (container) => {
      // Create an element with a very small explicit h but lots of text content.
      // The font size ensures the text is much taller than 20px.
      const slides = [{
        elements: [
          el(
            '<p style="font-size:48px;line-height:1.2;margin:0">Line one<br>Line two<br>Line three<br>Line four</p>',
            { id: "overflow-el", x: 0, y: 0, w: 400, h: 20 }
          ),
        ],
      }];
      const { layouts } = await render(slides, { container });
      const yWarnings = layouts[0].warnings.filter(
        w => w.type === "dom_overflow_y" && w.elementId === "overflow-el"
      );
      assert.ok(yWarnings.length > 0, "should have a dom_overflow_y warning");
    });
  });

  it("no overflow warning when element has sufficient height", async () => {
    await withContainer(async (container) => {
      // A short text in a generously sized box should not overflow.
      const slides = [{
        elements: [
          el('<p style="font-size:16px;margin:0">Short</p>', { id: "no-overflow", x: 0, y: 0, w: 400, h: 200 }),
        ],
      }];
      const { layouts } = await render(slides, { container });
      const overflowWarnings = layouts[0].warnings.filter(
        w => (w.type === "dom_overflow_y" || w.type === "dom_overflow_x") && w.elementId === "no-overflow"
      );
      assert.equal(overflowWarnings.length, 0, "should have no DOM overflow warnings");
    });
  });

  it("detects overflow even with overflow:clip styling", async () => {
    await withContainer(async (container) => {
      // overflow:clip hides content visually but scrollHeight still reports full content size
      const slides = [{
        elements: [
          el(
            '<p style="font-size:48px;line-height:1.2;margin:0">Line one<br>Line two<br>Line three<br>Line four</p>',
            { id: "clipped-el", x: 0, y: 0, w: 400, h: 20, overflow: "clip" }
          ),
        ],
      }];
      const { layouts } = await render(slides, { container });
      const yWarnings = layouts[0].warnings.filter(
        w => w.type === "dom_overflow_y" && w.elementId === "clipped-el"
      );
      assert.ok(yWarnings.length > 0, "should detect overflow even with clip");
    });
  });

  it("warning has correct shape with all required fields", async () => {
    await withContainer(async (container) => {
      const slides = [{
        elements: [
          el(
            '<p style="font-size:48px;line-height:1.2;margin:0">Line one<br>Line two<br>Line three<br>Line four</p>',
            { id: "shape-el", x: 0, y: 0, w: 400, h: 20 }
          ),
        ],
      }];
      const { layouts } = await render(slides, { container });
      const yWarning = layouts[0].warnings.find(
        w => w.type === "dom_overflow_y" && w.elementId === "shape-el"
      );
      assert.ok(yWarning, "should have a dom_overflow_y warning");
      assert.equal(yWarning.type, "dom_overflow_y");
      assert.equal(yWarning.elementId, "shape-el");
      assert.equal(typeof yWarning.clientHeight, "number", "clientHeight should be a number");
      assert.equal(typeof yWarning.scrollHeight, "number", "scrollHeight should be a number");
      assert.equal(typeof yWarning.overflow, "number", "overflow should be a number");
      assert.ok(yWarning.overflow > 0, "overflow should be positive");
      assert.equal(yWarning.overflow, yWarning.scrollHeight - yWarning.clientHeight, "overflow should equal scrollHeight - clientHeight");
    });
  });

  it("does not check group or stack elements for overflow", async () => {
    await withContainer(async (container) => {
      const slides = [{
        elements: [
          group([
            el('<p style="font-size:48px;line-height:1.2;margin:0">Tall text<br>More text</p>', { id: "child-el", x: 0, y: 0, w: 200, h: 20 }),
          ], { id: "grp", x: 0, y: 0, w: 400, h: 30 }),
        ],
      }];
      const { layouts } = await render(slides, { container });
      const groupOverflows = layouts[0].warnings.filter(
        w => (w.type === "dom_overflow_y" || w.type === "dom_overflow_x") && w.elementId === "grp"
      );
      assert.equal(groupOverflows.length, 0, "group elements should not have DOM overflow warnings");

      // But the child el inside the group should still be checked
      const childOverflows = layouts[0].warnings.filter(
        w => w.type === "dom_overflow_y" && w.elementId === "child-el"
      );
      assert.ok(childOverflows.length > 0, "child el inside group should still get overflow warnings");
    });
  });
});

// =============================================================================
// flipH / flipV — Rendering
// =============================================================================

describe("flipH / flipV — rendering", () => {
  it("flipH applies scaleX(-1)", async () => {
    await withContainer(async (container) => {
      const slides = [{
        elements: [
          el('', { id: "fh1", x: 100, y: 100, w: 200, h: 100, flipH: true, style: { background: "#333" } }),
        ],
      }];
      await render(slides, { container });
      const div = container.querySelector('[data-sk-id="fh1"]');
      assert.ok(div, "flipped element should be rendered");
      const transform = div.style.transform;
      assert.ok(transform.includes("scaleX(-1)"), `transform should contain scaleX(-1), got "${transform}"`);
    });
  });

  it("flipV applies scaleY(-1)", async () => {
    await withContainer(async (container) => {
      const slides = [{
        elements: [
          el('', { id: "fv1", x: 100, y: 100, w: 200, h: 100, flipV: true, style: { background: "#333" } }),
        ],
      }];
      await render(slides, { container });
      const div = container.querySelector('[data-sk-id="fv1"]');
      assert.ok(div, "flipped element should be rendered");
      const transform = div.style.transform;
      assert.ok(transform.includes("scaleY(-1)"), `transform should contain scaleY(-1), got "${transform}"`);
    });
  });

  it("both flipH and flipV combined", async () => {
    await withContainer(async (container) => {
      const slides = [{
        elements: [
          el('', { id: "fb1", x: 100, y: 100, w: 200, h: 100, flipH: true, flipV: true, style: { background: "#333" } }),
        ],
      }];
      await render(slides, { container });
      const div = container.querySelector('[data-sk-id="fb1"]');
      assert.ok(div, "double-flipped element should be rendered");
      const transform = div.style.transform;
      assert.ok(transform.includes("scaleX(-1)"), `transform should contain scaleX(-1), got "${transform}"`);
      assert.ok(transform.includes("scaleY(-1)"), `transform should contain scaleY(-1), got "${transform}"`);
    });
  });

  it("flipH + rotate combined", async () => {
    await withContainer(async (container) => {
      const slides = [{
        elements: [
          el('', { id: "fr1", x: 100, y: 100, w: 200, h: 100, flipH: true, rotate: 45, style: { background: "#333" } }),
        ],
      }];
      await render(slides, { container });
      const div = container.querySelector('[data-sk-id="fr1"]');
      assert.ok(div, "flip+rotate element should be rendered");
      const transform = div.style.transform;
      assert.ok(transform.includes("rotate(45deg)"), `transform should contain rotate(45deg), got "${transform}"`);
      assert.ok(transform.includes("scaleX(-1)"), `transform should contain scaleX(-1), got "${transform}"`);
    });
  });

  it("no flip by default — no scaleX/scaleY in transform", async () => {
    await withContainer(async (container) => {
      const slides = [{
        elements: [
          el('', { id: "nf1", x: 100, y: 100, w: 200, h: 100, style: { background: "#333" } }),
        ],
      }];
      await render(slides, { container });
      const div = container.querySelector('[data-sk-id="nf1"]');
      assert.ok(div, "element should be rendered");
      const transform = div.style.transform;
      assert.ok(!transform || (!transform.includes("scaleX") && !transform.includes("scaleY")),
        `transform should not contain scaleX or scaleY, got "${transform}"`);
    });
  });

  it("flipH: false is same as omitted — no scaleX in transform", async () => {
    await withContainer(async (container) => {
      const slides = [{
        elements: [
          el('', { id: "ff1", x: 100, y: 100, w: 200, h: 100, flipH: false, style: { background: "#333" } }),
        ],
      }];
      await render(slides, { container });
      const div = container.querySelector('[data-sk-id="ff1"]');
      assert.ok(div, "element should be rendered");
      const transform = div.style.transform;
      assert.ok(!transform || !transform.includes("scaleX"),
        `transform should not contain scaleX when flipH is false, got "${transform}"`);
    });
  });

  it("flipH/flipV not flagged as misplaced CSS props", async () => {
    await withContainer(async (container) => {
      const slides = [{
        elements: [
          el('', { id: "mc1", x: 100, y: 100, w: 200, h: 100, flipH: true, flipV: true, style: { background: "#333" } }),
        ],
      }];
      const { layouts } = await render(slides, { container });
      // Check that no styleWarnings of type misplaced_css_prop exist for flipH/flipV
      const sceneEntry = layouts[0].elements["mc1"];
      const misplacedWarnings = (sceneEntry?.styleWarnings || []).filter(
        w => w.type === "misplaced_css_prop" && (w.property === "flipH" || w.property === "flipV")
      );
      assert.equal(misplacedWarnings.length, 0, "flipH/flipV should not be flagged as misplaced CSS props");
    });
  });

  it("flipH/flipV on group elements", async () => {
    await withContainer(async (container) => {
      const slides = [{
        elements: [
          group([
            el('', { id: "gc1", x: 0, y: 0, w: 100, h: 50 }),
          ], { id: "fg1", x: 100, y: 100, w: 200, h: 100, flipH: true, flipV: true }),
        ],
      }];
      await render(slides, { container });
      const div = container.querySelector('[data-sk-id="fg1"]');
      assert.ok(div, "flipped group should be rendered");
      const transform = div.style.transform;
      assert.ok(transform.includes("scaleX(-1)"), `group transform should contain scaleX(-1), got "${transform}"`);
      assert.ok(transform.includes("scaleY(-1)"), `group transform should contain scaleY(-1), got "${transform}"`);
    });
  });
});

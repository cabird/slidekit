// SlideKit Tests — M1.4 (Basic Renderer) + M1.6 (Remaining Tests)

import { describe, it, assert } from './test-runner.js';
import {
  text, image, rect, rule, group,
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
          text("Hello", { id: "t1", x: 100, y: 200, w: 400, h: 50 }),
          rect({ id: "r1", x: 0, y: 0, w: 100, h: 100 }),
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
          text("A", { id: "text-1", x: 0, y: 0, w: 200, h: 40 }),
          rect({ id: "rect-1", x: 0, y: 50, w: 200, h: 100 }),
          image("test.jpg", { id: "img-1", x: 0, y: 160, w: 200, h: 100 }),
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
          text("A", { x: 0, y: 0, w: 200, h: 40 }),
        ],
      }];
      await render(slides, { container });
      // After resetIdCounter in render(), the first element gets sk-1
      const el = container.querySelector('[data-sk-id="sk-1"]');
      assert.ok(el, "auto-generated ID should be set as data-sk-id");
    });
  });

  it("sets data-sk-id on group children", async () => {
    await withContainer(async (container) => {
      resetIdCounter();
      const slides = [{
        elements: [
          group([
            text("Child", { id: "child-text", x: 0, y: 0, w: 100, h: 30 }),
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
          rect({ id: "r", x: 100, y: 200, w: 300, h: 150, anchor: "tl" }),
        ],
      }];
      await render(slides, { container });
      const el = container.querySelector('[data-sk-id="r"]');
      assert.equal(el.style.left, "100px");
      assert.equal(el.style.top, "200px");
    });
  });

  it("sets correct left/top for cc anchor", async () => {
    await withContainer(async (container) => {
      const slides = [{
        elements: [
          rect({ id: "r", x: 960, y: 540, w: 400, h: 200, anchor: "cc" }),
        ],
      }];
      await render(slides, { container });
      const el = container.querySelector('[data-sk-id="r"]');
      // cc: left = 960 - 200 = 760, top = 540 - 100 = 440
      assert.equal(el.style.left, "760px");
      assert.equal(el.style.top, "440px");
    });
  });

  it("sets correct left/top for br anchor", async () => {
    await withContainer(async (container) => {
      const slides = [{
        elements: [
          rect({ id: "r", x: 500, y: 400, w: 200, h: 100, anchor: "br" }),
        ],
      }];
      await render(slides, { container });
      const el = container.querySelector('[data-sk-id="r"]');
      // br: left = 500 - 200 = 300, top = 400 - 100 = 300
      assert.equal(el.style.left, "300px");
      assert.equal(el.style.top, "300px");
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
          rect({ id: "r", x: 0, y: 0, w: 400, h: 300 }),
        ],
      }];
      await render(slides, { container });
      const el = container.querySelector('[data-sk-id="r"]');
      assert.equal(el.style.width, "400px");
      assert.equal(el.style.height, "300px");
    });
  });

  it("uses position:absolute and box-sizing:border-box", async () => {
    await withContainer(async (container) => {
      const slides = [{
        elements: [
          rect({ id: "r", x: 0, y: 0, w: 100, h: 100 }),
        ],
      }];
      await render(slides, { container });
      const el = container.querySelector('[data-sk-id="r"]');
      assert.equal(el.style.position, "absolute");
      assert.equal(el.style.boxSizing, "border-box");
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
          text("Hello World", { id: "t", x: 0, y: 0, w: 400, h: 50 }),
        ],
      }];
      await render(slides, { container });
      const el = container.querySelector('[data-sk-id="t"]');
      assert.equal(el.textContent, "Hello World");
    });
  });

  it("converts \\n to <br> elements", async () => {
    await withContainer(async (container) => {
      const slides = [{
        elements: [
          text("Line 1\nLine 2\nLine 3", { id: "t", x: 0, y: 0, w: 400, h: 100 }),
        ],
      }];
      await render(slides, { container });
      const el = container.querySelector('[data-sk-id="t"]');
      const brs = el.querySelectorAll("br");
      assert.equal(brs.length, 2, "should have 2 <br> elements");
      assert.equal(el.textContent, "Line 1Line 2Line 3");
    });
  });

  it("renders empty string content safely", async () => {
    await withContainer(async (container) => {
      const slides = [{
        elements: [
          text("", { id: "t", x: 0, y: 0, w: 200, h: 30 }),
        ],
      }];
      await render(slides, { container });
      const el = container.querySelector('[data-sk-id="t"]');
      assert.equal(el.textContent, "");
    });
  });

  it("does not execute script tags in text content (XSS protection)", async () => {
    await withContainer(async (container) => {
      const slides = [{
        elements: [
          text('<script>window.__xss_test=true</script>', { id: "t", x: 0, y: 0, w: 400, h: 50 }),
        ],
      }];
      await render(slides, { container });
      const el = container.querySelector('[data-sk-id="t"]');
      // Content should be treated as text, not HTML
      assert.ok(el.textContent.includes("<script>"), "script tag should be visible as text");
      assert.equal(window.__xss_test, undefined, "script should not have executed");
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
          image("test.jpg", { id: "img", x: 0, y: 0, w: 400, h: 300 }),
        ],
      }];
      await render(slides, { container });
      const el = container.querySelector('[data-sk-id="img"]');
      const img = el.querySelector("img");
      assert.ok(img, "should have an <img> child");
      assert.ok(img.src.endsWith("test.jpg"), "img src should contain test.jpg");
    });
  });

  it("sets object-fit from fit prop (default: cover)", async () => {
    await withContainer(async (container) => {
      const slides = [{
        elements: [
          image("test.jpg", { id: "img", x: 0, y: 0, w: 400, h: 300 }),
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
          image("test.jpg", { id: "img", x: 0, y: 0, w: 400, h: 300, fit: "contain" }),
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
          image("test.jpg", { id: "img", x: 0, y: 0, w: 400, h: 300, position: "top left" }),
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
          image("test.jpg", { id: "img", x: 0, y: 0, w: 400, h: 300 }),
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
          rect({ id: "r", x: 100, y: 200, w: 300, h: 150, fill: "#1a1a2e" }),
        ],
      }];
      await render(slides, { container });
      const el = container.querySelector('[data-sk-id="r"]');
      assert.ok(el, "rect element should exist");
      // fill maps to background via convenience props; browser may store as hex or rgb
      const bg = el.style.background;
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
          rect({ id: "r", x: 0, y: 0, w: 100, h: 100, radius: 16 }),
        ],
      }];
      await render(slides, { container });
      const el = container.querySelector('[data-sk-id="r"]');
      assert.equal(el.style.borderRadius, "16px");
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
          rule({ id: "hr", x: 170, y: 300, w: 120, thickness: 3 }),
        ],
      }];
      await render(slides, { container });
      const el = container.querySelector('[data-sk-id="hr"]');
      assert.equal(el.style.width, "120px");
      assert.equal(el.style.height, "3px");
    });
  });

  it("vertical rule has correct height and width=thickness", async () => {
    await withContainer(async (container) => {
      const slides = [{
        elements: [
          rule({ id: "vr", x: 100, y: 100, h: 200, direction: "vertical", thickness: 4 }),
        ],
      }];
      await render(slides, { container });
      const el = container.querySelector('[data-sk-id="vr"]');
      assert.equal(el.style.width, "4px");
      assert.equal(el.style.height, "200px");
    });
  });

  it("rule has backgroundColor from color prop", async () => {
    await withContainer(async (container) => {
      const slides = [{
        elements: [
          rule({ id: "r", x: 0, y: 0, w: 100, color: "#7c5cbf", thickness: 2 }),
        ],
      }];
      await render(slides, { container });
      const el = container.querySelector('[data-sk-id="r"]');
      // backgroundColor should be the rule's color
      assert.ok(
        el.style.backgroundColor === "rgb(124, 92, 191)" || el.style.backgroundColor === "#7c5cbf",
        "rule backgroundColor should match color prop"
      );
    });
  });

  it("rule defaults to white color and 2px thickness", async () => {
    await withContainer(async (container) => {
      const slides = [{
        elements: [
          rule({ id: "r", x: 0, y: 0, w: 100 }),
        ],
      }];
      await render(slides, { container });
      const el = container.querySelector('[data-sk-id="r"]');
      assert.equal(el.style.height, "2px");
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
            rect({ id: "c1", x: 0, y: 0, w: 100, h: 50 }),
            text("Hi", { id: "c2", x: 0, y: 60, w: 100, h: 30 }),
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
            rect({ id: "c1", x: 10, y: 20, w: 50, h: 50 }),
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
              rect({ id: "inner-rect", x: 0, y: 0, w: 50, h: 50 }),
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
          rect({ id: "content-el", x: 0, y: 0, w: 100, h: 100, layer: "content" }),
          rect({ id: "bg-el", x: 0, y: 0, w: 100, h: 100, layer: "bg" }),
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
          rect({ id: "content-el", x: 0, y: 0, w: 100, h: 100, layer: "content" }),
          rect({ id: "overlay-el", x: 0, y: 0, w: 100, h: 100, layer: "overlay" }),
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
          rect({ id: "first", x: 0, y: 0, w: 100, h: 100 }),
          rect({ id: "second", x: 0, y: 0, w: 100, h: 100 }),
          rect({ id: "third", x: 0, y: 0, w: 100, h: 100 }),
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
          rect({ id: "first", x: 0, y: 0, w: 100, h: 100, z: 10 }),
          rect({ id: "second", x: 0, y: 0, w: 100, h: 100, z: 5 }),
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
          rect({ id: "default-el", x: 0, y: 0, w: 100, h: 100 }),
          rect({ id: "behind-el", x: 0, y: 0, w: 100, h: 100, z: -1 }),
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
          rect({ id: "overlay", x: 0, y: 0, w: 100, h: 100, layer: "overlay" }),
          rect({ id: "bg", x: 0, y: 0, w: 100, h: 100, layer: "bg" }),
          rect({ id: "content", x: 0, y: 0, w: 100, h: 100, layer: "content" }),
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
          rect({ id: "r", x: 0, y: 0, w: 100, h: 100, className: "glass-card accent" }),
        ],
      }];
      await render(slides, { container });
      const el = container.querySelector('[data-sk-id="r"]');
      assert.ok(el.classList.contains("glass-card"), "should have glass-card class");
      assert.ok(el.classList.contains("accent"), "should have accent class");
    });
  });

  it("no className means no class attribute set", async () => {
    await withContainer(async (container) => {
      const slides = [{
        elements: [
          rect({ id: "r", x: 0, y: 0, w: 100, h: 100 }),
        ],
      }];
      await render(slides, { container });
      const el = container.querySelector('[data-sk-id="r"]');
      assert.equal(el.className, "");
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
          rect({
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
      const el = container.querySelector('[data-sk-id="r"]');
      // boxShadow should be applied
      assert.ok(el.style.boxShadow.includes("rgba"), "boxShadow should be applied");
      // display should NOT be "flex" (blocked), it should be whatever the default is or empty
      assert.ok(el.style.display !== "flex", "display:flex should be blocked");
    });
  });

  it("convenience props are applied to rendered elements", async () => {
    await withContainer(async (container) => {
      const slides = [{
        elements: [
          text("Hello", {
            id: "t", x: 0, y: 0, w: 200, h: 50,
            color: "#ff0000", size: 48, weight: 700, font: "Georgia",
          }),
        ],
      }];
      await render(slides, { container });
      const el = container.querySelector('[data-sk-id="t"]');
      assert.equal(el.style.color, "rgb(255, 0, 0)");
      assert.equal(el.style.fontSize, "48px");
      assert.equal(el.style.fontWeight, "700");
      // Browser normalizes single-word font families by dropping quotes
      assert.equal(el.style.fontFamily, "Georgia, sans-serif");
    });
  });

  it("style object overrides convenience props on rendered element", async () => {
    await withContainer(async (container) => {
      const slides = [{
        elements: [
          text("Hello", {
            id: "t", x: 0, y: 0, w: 200, h: 50,
            color: "blue",
            style: { color: "red" },
          }),
        ],
      }];
      await render(slides, { container });
      const el = container.querySelector('[data-sk-id="t"]');
      // style.color should be "red" because style overrides convenience
      assert.equal(el.style.color, "red");
    });
  });

  it("CSS custom properties are applied via setProperty", async () => {
    await withContainer(async (container) => {
      const slides = [{
        elements: [
          rect({
            id: "r", x: 0, y: 0, w: 100, h: 100,
            style: { "--sk-accent": "#7c5cbf", "--glow-size": "20px" },
          }),
        ],
      }];
      await render(slides, { container });
      const el = container.querySelector('[data-sk-id="r"]');
      assert.equal(
        el.style.getPropertyValue("--sk-accent"),
        "#7c5cbf",
        "CSS custom property --sk-accent should be set"
      );
      assert.equal(
        el.style.getPropertyValue("--glow-size"),
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
          rect({ id: "r", x: 0, y: 0, w: 100, h: 100, opacity: 0.5 }),
        ],
      }];
      await render(slides, { container });
      const el = container.querySelector('[data-sk-id="r"]');
      assert.equal(el.style.opacity, "0.5");
    });
  });

  it("does not set opacity when it is 1 (default)", async () => {
    await withContainer(async (container) => {
      const slides = [{
        elements: [
          rect({ id: "r", x: 0, y: 0, w: 100, h: 100 }),
        ],
      }];
      await render(slides, { container });
      const el = container.querySelector('[data-sk-id="r"]');
      assert.equal(el.style.opacity, "");
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
          text("A", { x: 0, y: 0, w: 100, h: 30 }),
          rect({ x: 0, y: 0, w: 50, h: 50 }),
        ],
      }];
      await render(slides, { container });
      const ids1 = Array.from(container.querySelectorAll("[data-sk-id]")).map(
        el => el.getAttribute("data-sk-id")
      );

      // Clear and render again
      container.innerHTML = "";
      await render(slides, { container });
      const ids2 = Array.from(container.querySelectorAll("[data-sk-id]")).map(
        el => el.getAttribute("data-sk-id")
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
          elements: [text("Slide 1", { id: "s1-text", x: 0, y: 0, w: 200, h: 50 })],
          notes: "First slide notes",
        },
        {
          id: "slide-2",
          background: "linear-gradient(135deg, #1a1a2e, #16213e)",
          elements: [
            rect({ id: "s2-bg", x: 0, y: 0, w: 1920, h: 1080, layer: "bg" }),
            text("Slide 2", { id: "s2-text", x: 100, y: 100, w: 200, h: 50 }),
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

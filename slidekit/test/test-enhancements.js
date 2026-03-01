// SlideKit Tests — Enhancement Features (valign, panelChildren)

import { describe, it, assert } from './test-runner.js';
import {
  el,
  render, layout,
  init, _resetForTests,
  panel,
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
// Valign — Default & Flexbox Rendering
// =============================================================================

describe("Enhancements: valign", () => {
  it("el() defaults valign to 'top'", () => {
    _resetForTests();
    const e = el('Hello', { id: "va1", w: 200 });
    assert.equal(e.props.valign, "top");
  });

  it("valign: 'center' applies flexbox centering when element has explicit h", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const e = el('<p>Centered</p>', { id: "va2", x: 0, y: 0, w: 300, h: 200, valign: "center" });
      await render([{ elements: [e] }], { container });
      const div = container.querySelector('[data-sk-id="va2"]');
      assert.equal(div.style.display, "flex");
      assert.equal(div.style.flexDirection, "column");
      assert.equal(div.style.justifyContent, "center");
    });
  });

  it("valign: 'bottom' applies flex-end", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const e = el('<p>Bottom</p>', { id: "va3", x: 0, y: 0, w: 300, h: 200, valign: "bottom" });
      await render([{ elements: [e] }], { container });
      const div = container.querySelector('[data-sk-id="va3"]');
      assert.equal(div.style.display, "flex");
      assert.equal(div.style.flexDirection, "column");
      assert.equal(div.style.justifyContent, "flex-end");
    });
  });

  it("valign is ignored without explicit h", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const e = el('<p>No height</p>', { id: "va4", x: 0, y: 0, w: 300, valign: "center" });
      await render([{ elements: [e] }], { container });
      const div = container.querySelector('[data-sk-id="va4"]');
      assert.ok(div.style.display !== "flex", "display should not be flex without explicit h");
    });
  });

  it("valign: 'top' does not apply flexbox", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const e = el('<p>Top</p>', { id: "va5", x: 0, y: 0, w: 300, h: 200, valign: "top" });
      await render([{ elements: [e] }], { container });
      const div = container.querySelector('[data-sk-id="va5"]');
      assert.ok(div.style.display !== "flex", "display should not be flex for valign top");
    });
  });
});

// =============================================================================
// Panel Children Export
// =============================================================================

describe("Enhancements: panelChildren export", () => {
  it("panel layout result includes panelChildren", async () => {
    _resetForTests();
    const child = el('', { id: "pce1", w: 200, h: 50 });
    const p = panel([child], { id: "pcp1", w: 400, x: 0, y: 0 });
    const scene = await layout({ elements: [p] });

    const panelData = scene.elements["pcp1"];
    assert.ok(panelData.panelChildren, "panel should have panelChildren array");
    assert.ok(Array.isArray(panelData.panelChildren), "panelChildren should be an array");
  });

  it("panelChildren contains correct child ids", async () => {
    _resetForTests();
    const child = el('', { id: "pce2", w: 200, h: 50 });
    const p = panel([child], { id: "pcp2", w: 400, x: 0, y: 0 });
    const scene = await layout({ elements: [p] });

    const panelData = scene.elements["pcp2"];
    const bgRect = p.children[0];
    const childStack = p.children[1];
    const childIds = panelData.panelChildren.map(c => c.id);
    assert.ok(childIds.includes(bgRect.id), "panelChildren should contain bgRect id");
    assert.ok(childIds.includes(childStack.id), "panelChildren should contain childStack id");
  });

  it("panelChildren includes resolved bounds", async () => {
    _resetForTests();
    const child = el('', { id: "pce3", w: 200, h: 50 });
    const p = panel([child], { id: "pcp3", w: 400, x: 0, y: 0 });
    const scene = await layout({ elements: [p] });

    const panelData = scene.elements["pcp3"];
    for (const entry of panelData.panelChildren) {
      assert.equal(typeof entry.x, "number", `${entry.id} x should be a number`);
      assert.equal(typeof entry.y, "number", `${entry.id} y should be a number`);
      assert.equal(typeof entry.w, "number", `${entry.id} w should be a number`);
      assert.equal(typeof entry.h, "number", `${entry.id} h should be a number`);
    }
  });

  it("panelChildren works with custom padding", async () => {
    _resetForTests();
    const child = el('', { id: "pce4", w: 200, h: 80 });
    const p = panel([child], { id: "pcp4", w: 500, x: 0, y: 0, padding: 40 });
    const scene = await layout({ elements: [p] });

    const panelData = scene.elements["pcp4"];
    assert.ok(panelData.panelChildren, "panelChildren should be present with custom padding");
    assert.ok(panelData.panelChildren.length >= 2, "should have at least bgRect and childStack");

    for (const entry of panelData.panelChildren) {
      assert.equal(typeof entry.w, "number", `${entry.id} w should be a number`);
      assert.equal(typeof entry.h, "number", `${entry.id} h should be a number`);
      assert.ok(entry.w > 0, `${entry.id} w should be positive`);
      assert.ok(entry.h > 0, `${entry.id} h should be positive`);
    }
  });
});

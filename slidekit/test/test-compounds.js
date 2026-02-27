// SlideKit Tests — M7 (Compound Primitives: bullets, connect, panel)

import { describe, it, assert } from './test-runner.js';
import {
  text, rect, group,
  render, layout,
  init, _resetForTests, resetIdCounter,
  vstack, hstack,
  bullets, connect, panel,
  measureText,
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
// M7.1: bullets() — Element Shape & Defaults
// =============================================================================

describe("M7.1: bullets — element shape & defaults", () => {
  it("returns a vstack element tagged as bullets compound", () => {
    _resetForTests();
    const el = bullets(["Item one", "Item two"], { id: "b1" });
    assert.equal(el.type, "vstack");
    assert.equal(el.id, "b1");
    assert.equal(el._compound, "bullets");
  });

  it("creates one child group per item", () => {
    _resetForTests();
    const el = bullets(["A", "B", "C"], { id: "b2" });
    assert.equal(el.children.length, 3);
    for (const child of el.children) {
      assert.equal(child.type, "group");
    }
  });

  it("each group contains a bullet text and item text", () => {
    _resetForTests();
    const el = bullets(["Hello"], { id: "b3" });
    const itemGroup = el.children[0];
    assert.equal(itemGroup.children.length, 2);
    assert.equal(itemGroup.children[0].type, "text"); // bullet char
    assert.equal(itemGroup.children[1].type, "text"); // item text
    assert.equal(itemGroup.children[0].content, "\u2022"); // default bullet
    assert.equal(itemGroup.children[1].content, "Hello");
  });

  it("uses custom bullet character", () => {
    _resetForTests();
    const el = bullets(["Item"], { id: "b4", bulletChar: "-" });
    const bulletEl = el.children[0].children[0];
    assert.equal(bulletEl.content, "-");
  });

  it("uses 'bullet' prop as alias for bulletChar", () => {
    _resetForTests();
    const el = bullets(["Item"], { id: "b5", bullet: ">" });
    const bulletEl = el.children[0].children[0];
    assert.equal(bulletEl.content, ">");
  });

  it("applies default gap of 8", () => {
    _resetForTests();
    const el = bullets(["A", "B"], { id: "b6" });
    assert.equal(el.props.gap, 8);
  });

  it("accepts custom gap", () => {
    _resetForTests();
    const el = bullets(["A", "B"], { id: "b7", gap: 20 });
    assert.equal(el.props.gap, 20);
  });

  it("applies default font/size/color", () => {
    _resetForTests();
    const el = bullets(["Test"], { id: "b8" });
    const textEl = el.children[0].children[1]; // item text
    assert.equal(textEl.props.font, "Inter");
    assert.equal(textEl.props.size, 32);
    assert.equal(textEl.props.weight, 400);
    assert.equal(textEl.props.color, "#ffffff");
  });

  it("accepts custom font props", () => {
    _resetForTests();
    const el = bullets(["Test"], { id: "b9", font: "Georgia", size: 24, weight: 700, color: "#ff0000" });
    const textEl = el.children[0].children[1];
    assert.equal(textEl.props.font, "Georgia");
    assert.equal(textEl.props.size, 24);
    assert.equal(textEl.props.weight, 700);
    assert.equal(textEl.props.color, "#ff0000");
  });

  it("passes x and y to the outer vstack", () => {
    _resetForTests();
    const el = bullets(["A"], { id: "b10", x: 100, y: 200 });
    assert.equal(el.props.x, 100);
    assert.equal(el.props.y, 200);
  });

  it("generates auto ID when none provided", () => {
    _resetForTests();
    const el = bullets(["A"]);
    assert.ok(el.id.startsWith("sk-"), "auto ID should start with sk-");
  });

  it("stores flat item list in _bulletItems", () => {
    _resetForTests();
    const el = bullets(["A", "B", "C"], { id: "b11" });
    assert.equal(el._bulletItems.length, 3);
    assert.equal(el._bulletItems[0].text, "A");
    assert.equal(el._bulletItems[0].level, 0);
  });
});

// =============================================================================
// M7.1: bullets() — Nested Items
// =============================================================================

describe("M7.1: bullets — nested items", () => {
  it("flattens nested items with correct levels", () => {
    _resetForTests();
    const el = bullets([
      { text: "Parent", children: ["Child 1", "Child 2"] },
      "Sibling",
    ], { id: "bn1" });

    assert.equal(el._bulletItems.length, 4);
    assert.equal(el._bulletItems[0].text, "Parent");
    assert.equal(el._bulletItems[0].level, 0);
    assert.equal(el._bulletItems[1].text, "Child 1");
    assert.equal(el._bulletItems[1].level, 1);
    assert.equal(el._bulletItems[2].text, "Child 2");
    assert.equal(el._bulletItems[2].level, 1);
    assert.equal(el._bulletItems[3].text, "Sibling");
    assert.equal(el._bulletItems[3].level, 0);
  });

  it("handles deeply nested items", () => {
    _resetForTests();
    const el = bullets([
      { text: "L0", children: [
        { text: "L1", children: [
          { text: "L2" }
        ] }
      ] }
    ], { id: "bn2" });

    assert.equal(el._bulletItems.length, 3);
    assert.equal(el._bulletItems[2].text, "L2");
    assert.equal(el._bulletItems[2].level, 2);
  });

  it("creates correct number of children for nested items", () => {
    _resetForTests();
    const el = bullets([
      { text: "A", children: ["B"] },
    ], { id: "bn3" });
    // Should have 2 children: one for A (level 0), one for B (level 1)
    assert.equal(el.children.length, 2);
  });

  it("indents nested items", () => {
    _resetForTests();
    const el = bullets([
      { text: "Parent", children: ["Child"] },
    ], { id: "bn4", indent: 40 });

    // The child (level 1) bullet should be at x = 40
    const childGroup = el.children[1]; // second item = "Child" at level 1
    const bulletEl = childGroup.children[0]; // bullet text
    assert.equal(bulletEl.props.x, 40);
  });
});

// =============================================================================
// M7.1: bullets() — Edge Cases
// =============================================================================

describe("M7.1: bullets — edge cases", () => {
  it("handles empty items array", () => {
    _resetForTests();
    const el = bullets([], { id: "be1" });
    assert.equal(el.children.length, 0);
    assert.equal(el._bulletItems.length, 0);
  });

  it("handles item with empty text", () => {
    _resetForTests();
    const el = bullets([{ text: "" }], { id: "be2" });
    assert.equal(el._bulletItems.length, 1);
    assert.equal(el._bulletItems[0].text, "");
  });

  it("clamps negative textW to zero when indent exceeds width", () => {
    _resetForTests();
    // With w: 50, indent: 40, and level 2, indent = 80 which is > 50
    const el = bullets([
      { text: "A", children: [
        { text: "B", children: [
          { text: "Deep" }
        ] }
      ] }
    ], { id: "be3", w: 50, indent: 40 });

    // Should not throw; the deeply nested item should still be created
    assert.ok(el.children.length > 0, "should create children even with narrow width");
  });

  it("sets w on vstack when width is specified", () => {
    _resetForTests();
    const el = bullets(["A"], { id: "be4", w: 800 });
    assert.equal(el.props.w, 800);
  });

  it("groups have explicit h for vstack sizing", () => {
    _resetForTests();
    const el = bullets(["Test item"], { id: "be5", w: 400 });
    const itemGroup = el.children[0];
    assert.ok(itemGroup.props.h > 0, "item group should have positive height");
  });
});

// =============================================================================
// M7.1: bullets() — Layout Integration
// =============================================================================

describe("M7.1: bullets — layout integration", () => {
  it("layout resolves bullets position", async () => {
    _resetForTests();
    const el = bullets(["Alpha", "Beta"], { id: "bul1", x: 100, y: 200, w: 600 });
    const scene = await layout({ elements: [el] });

    assert.ok(scene.elements["bul1"], "bullets element should exist in scene");
    assert.equal(scene.elements["bul1"].resolved.x, 100);
    assert.equal(scene.elements["bul1"].resolved.y, 200);
  });

  it("layout resolves bullets children as part of vstack", async () => {
    _resetForTests();
    const el = bullets(["A", "B"], { id: "bul2", x: 50, y: 50, w: 400 });
    const scene = await layout({ elements: [el] });

    // Children should be resolved (they are groups inside the vstack)
    const children = el.children;
    for (const child of children) {
      assert.ok(scene.elements[child.id], `child ${child.id} should exist in scene`);
    }
  });

  it("no layout errors for valid bullets", async () => {
    _resetForTests();
    const el = bullets(["Item one", "Item two", "Item three"], { id: "bul3", x: 0, y: 0, w: 800 });
    const scene = await layout({ elements: [el] });
    assert.equal(scene.errors.length, 0, "should have no layout errors");
  });
});

// =============================================================================
// M7.2: connect() — Element Shape & Defaults
// =============================================================================

describe("M7.2: connect — element shape & defaults", () => {
  it("returns a connector element with correct type", () => {
    _resetForTests();
    const el = connect("a", "b", { id: "c1" });
    assert.equal(el.type, "connector");
    assert.equal(el.id, "c1");
  });

  it("stores fromId and toId in props", () => {
    _resetForTests();
    const el = connect("source", "target", { id: "c2" });
    assert.equal(el.props.fromId, "source");
    assert.equal(el.props.toId, "target");
  });

  it("applies default connector properties", () => {
    _resetForTests();
    const el = connect("a", "b", { id: "c3" });
    assert.equal(el.props.connectorType, "straight");
    assert.equal(el.props.arrow, "end");
    assert.equal(el.props.color, "#ffffff");
    assert.equal(el.props.thickness, 2);
    assert.equal(el.props.dash, null);
    assert.equal(el.props.fromAnchor, "cr");
    assert.equal(el.props.toAnchor, "cl");
    assert.equal(el.props.label, null);
  });

  it("accepts custom connector type", () => {
    _resetForTests();
    const el = connect("a", "b", { id: "c4", type: "curved" });
    assert.equal(el.props.connectorType, "curved");
  });

  it("accepts custom arrow setting", () => {
    _resetForTests();
    const el = connect("a", "b", { id: "c5", arrow: "both" });
    assert.equal(el.props.arrow, "both");
  });

  it("accepts custom anchors", () => {
    _resetForTests();
    const el = connect("a", "b", { id: "c6", fromAnchor: "bc", toAnchor: "tc" });
    assert.equal(el.props.fromAnchor, "bc");
    assert.equal(el.props.toAnchor, "tc");
  });

  it("accepts custom color, thickness, dash", () => {
    _resetForTests();
    const el = connect("a", "b", { id: "c7", color: "#ff0000", thickness: 4, dash: [5, 5] });
    assert.equal(el.props.color, "#ff0000");
    assert.equal(el.props.thickness, 4);
    assert.deepEqual(el.props.dash, [5, 5]);
  });

  it("accepts label and labelStyle", () => {
    _resetForTests();
    const el = connect("a", "b", { id: "c8", label: "flow", labelStyle: { size: 16, color: "#aaa" } });
    assert.equal(el.props.label, "flow");
    assert.equal(el.props.labelStyle.size, 16);
  });

  it("generates auto ID when none provided", () => {
    _resetForTests();
    const el = connect("a", "b");
    assert.ok(el.id.startsWith("sk-"), "auto ID should start with sk-");
  });

  it("sets common props (layer, opacity, anchor)", () => {
    _resetForTests();
    const el = connect("a", "b", { id: "c9", layer: "overlay", opacity: 0.5 });
    assert.equal(el.props.layer, "overlay");
    assert.equal(el.props.opacity, 0.5);
    assert.equal(el.props.anchor, "tl");
  });

  it("accepts arrow: 'none'", () => {
    _resetForTests();
    const el = connect("a", "b", { id: "c10", arrow: "none" });
    assert.equal(el.props.arrow, "none");
  });

  it("accepts arrow: 'start'", () => {
    _resetForTests();
    const el = connect("a", "b", { id: "c11", arrow: "start" });
    assert.equal(el.props.arrow, "start");
  });
});

// =============================================================================
// M7.2: connect() — Layout Integration
// =============================================================================

describe("M7.2: connect — layout integration", () => {
  it("resolves connector endpoints from source and target bounds", async () => {
    _resetForTests();
    const src = rect({ id: "src", x: 100, y: 100, w: 200, h: 100 });
    const tgt = rect({ id: "tgt", x: 500, y: 100, w: 200, h: 100 });
    const conn = connect("src", "tgt", { id: "conn1" });

    const scene = await layout({ elements: [src, tgt, conn] });

    assert.ok(scene.elements["conn1"], "connector should exist in scene");
    // Default anchors: cr (center-right of source) -> cl (center-left of target)
    // Source cr: x=100+200=300, y=100+50=150
    // Target cl: x=500, y=100+50=150
    const connData = scene.elements["conn1"];
    assert.ok(connData._connectorResolved, "connector should have resolved data");
    assert.equal(connData._connectorResolved.from.x, 300);
    assert.equal(connData._connectorResolved.from.y, 150);
    assert.equal(connData._connectorResolved.to.x, 500);
    assert.equal(connData._connectorResolved.to.y, 150);
  });

  it("resolves connector with custom anchors", async () => {
    _resetForTests();
    const src = rect({ id: "s1", x: 0, y: 0, w: 100, h: 100 });
    const tgt = rect({ id: "t1", x: 300, y: 300, w: 100, h: 100 });
    // bc = bottom-center, tc = top-center
    const conn = connect("s1", "t1", { id: "c2", fromAnchor: "bc", toAnchor: "tc" });

    const scene = await layout({ elements: [src, tgt, conn] });

    const connData = scene.elements["c2"];
    assert.ok(connData._connectorResolved);
    // Source bc: x=0+50=50, y=0+100=100
    assert.equal(connData._connectorResolved.from.x, 50);
    assert.equal(connData._connectorResolved.from.y, 100);
    // Target tc: x=300+50=350, y=300
    assert.equal(connData._connectorResolved.to.x, 350);
    assert.equal(connData._connectorResolved.to.y, 300);
  });

  it("connector resolvedBounds are populated with bounding box", async () => {
    _resetForTests();
    const src = rect({ id: "s2", x: 100, y: 100, w: 200, h: 100 });
    const tgt = rect({ id: "t2", x: 500, y: 300, w: 200, h: 100 });
    const conn = connect("s2", "t2", { id: "c3" });

    const scene = await layout({ elements: [src, tgt, conn] });

    const connEl = scene.elements["c3"];
    assert.ok(connEl, "connector should exist");
    assert.ok(connEl.resolved, "connector should have resolved bounds");
    // cr of source: x=300, y=150; cl of target: x=500, y=350
    // Bounding box: min(300,500)=300, min(150,350)=150, max(300,500)=500, max(150,350)=350
    assert.equal(connEl.resolved.x, 300);
    assert.equal(connEl.resolved.y, 150);
    assert.equal(connEl.resolved.w, 200);
    assert.equal(connEl.resolved.h, 200);
  });

  it("reports error when connector references unknown fromId", async () => {
    _resetForTests();
    const tgt = rect({ id: "real-target", x: 100, y: 100, w: 100, h: 100 });
    const conn = connect("nonexistent", "real-target", { id: "c4" });

    const scene = await layout({ elements: [tgt, conn] });

    const fromErr = scene.errors.find(e => e.property === "fromId" && e.elementId === "c4");
    assert.ok(fromErr, "should report error for unknown fromId");
  });

  it("reports error when connector references unknown toId", async () => {
    _resetForTests();
    const src = rect({ id: "real-source", x: 100, y: 100, w: 100, h: 100 });
    const conn = connect("real-source", "nonexistent", { id: "c5" });

    const scene = await layout({ elements: [src, conn] });

    const toErr = scene.errors.find(e => e.property === "toId" && e.elementId === "c5");
    assert.ok(toErr, "should report error for unknown toId");
  });

  it("connector depends on source and target positions (topological order)", async () => {
    _resetForTests();
    // Even if connector is listed first, it should still resolve correctly
    // because layout builds a dependency graph
    const conn = connect("box-a", "box-b", { id: "c6" });
    const boxA = rect({ id: "box-a", x: 50, y: 50, w: 100, h: 80 });
    const boxB = rect({ id: "box-b", x: 400, y: 50, w: 100, h: 80 });

    const scene = await layout({ elements: [conn, boxA, boxB] });

    assert.equal(scene.errors.length, 0, "no errors expected");
    const connData = scene.elements["c6"];
    assert.ok(connData._connectorResolved, "connector should be resolved");
    // box-a cr: x=150, y=90 | box-b cl: x=400, y=90
    assert.equal(connData._connectorResolved.from.x, 150);
    assert.equal(connData._connectorResolved.to.x, 400);
  });

  it("warns when connector endpoint cannot be resolved", async () => {
    _resetForTests();
    // Both refs are unknown - gets errors, not warnings (unknown_ref errors in dep graph)
    const conn = connect("ghost-a", "ghost-b", { id: "c7" });
    const scene = await layout({ elements: [conn] });

    // Should have errors about unknown refs
    assert.ok(scene.errors.length >= 2, "should have errors for unknown fromId and toId");
  });

  it("multiple connectors between different elements", async () => {
    _resetForTests();
    const a = rect({ id: "ma", x: 0, y: 0, w: 100, h: 100 });
    const b = rect({ id: "mb", x: 300, y: 0, w: 100, h: 100 });
    const c = rect({ id: "mc", x: 600, y: 0, w: 100, h: 100 });
    const conn1 = connect("ma", "mb", { id: "mc1" });
    const conn2 = connect("mb", "mc", { id: "mc2" });

    const scene = await layout({ elements: [a, b, c, conn1, conn2] });

    assert.equal(scene.errors.length, 0);
    assert.ok(scene.elements["mc1"]._connectorResolved);
    assert.ok(scene.elements["mc2"]._connectorResolved);
  });
});

// =============================================================================
// M7.2: connect() — Rendering
// =============================================================================

describe("M7.2: connect — rendering", () => {
  it("renders a connector as an SVG element", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const src = rect({ id: "rs", x: 100, y: 100, w: 200, h: 100, fill: "#333" });
      const tgt = rect({ id: "rt", x: 500, y: 100, w: 200, h: 100, fill: "#333" });
      const conn = connect("rs", "rt", { id: "rc1" });

      await render([{ elements: [src, tgt, conn] }], { container });

      const svgWrapper = container.querySelector('[data-sk-id="rc1"]');
      assert.ok(svgWrapper, "connector should be rendered with data-sk-id");
      const svg = svgWrapper.querySelector("svg");
      assert.ok(svg, "connector wrapper should contain an SVG element");
    });
  });

  it("renders straight connector as a <line>", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const src = rect({ id: "rs2", x: 100, y: 100, w: 200, h: 100 });
      const tgt = rect({ id: "rt2", x: 500, y: 100, w: 200, h: 100 });
      const conn = connect("rs2", "rt2", { id: "rc2", type: "straight" });

      await render([{ elements: [src, tgt, conn] }], { container });

      const svgWrapper = container.querySelector('[data-sk-id="rc2"]');
      const line = svgWrapper.querySelector("line");
      assert.ok(line, "straight connector should use <line> element");
    });
  });

  it("renders curved connector as a <path>", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const src = rect({ id: "rs3", x: 100, y: 100, w: 200, h: 100 });
      const tgt = rect({ id: "rt3", x: 500, y: 100, w: 200, h: 100 });
      const conn = connect("rs3", "rt3", { id: "rc3", type: "curved" });

      await render([{ elements: [src, tgt, conn] }], { container });

      const svgWrapper = container.querySelector('[data-sk-id="rc3"]');
      const path = svgWrapper.querySelector("path");
      assert.ok(path, "curved connector should use <path> element");
      const d = path.getAttribute("d");
      assert.ok(d && d.includes("C"), "curved path should have cubic bezier (C command)");
    });
  });

  it("renders elbow connector as a <path>", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const src = rect({ id: "rs4", x: 100, y: 100, w: 200, h: 100 });
      const tgt = rect({ id: "rt4", x: 500, y: 300, w: 200, h: 100 });
      const conn = connect("rs4", "rt4", { id: "rc4", type: "elbow" });

      await render([{ elements: [src, tgt, conn] }], { container });

      const svgWrapper = container.querySelector('[data-sk-id="rc4"]');
      const path = svgWrapper.querySelector("path");
      assert.ok(path, "elbow connector should use <path> element");
      const d = path.getAttribute("d");
      assert.ok(d && d.includes("L"), "elbow path should have line segments (L command)");
    });
  });

  it("applies arrow marker to connector", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const src = rect({ id: "rs5", x: 100, y: 100, w: 200, h: 100 });
      const tgt = rect({ id: "rt5", x: 500, y: 100, w: 200, h: 100 });
      const conn = connect("rs5", "rt5", { id: "rc5", arrow: "end" });

      await render([{ elements: [src, tgt, conn] }], { container });

      const svgWrapper = container.querySelector('[data-sk-id="rc5"]');
      const line = svgWrapper.querySelector("line");
      const markerEnd = line.getAttribute("marker-end");
      assert.ok(markerEnd, "should have marker-end attribute");
      assert.ok(markerEnd.includes("url(#sk-arrow-"), "marker-end should reference unique arrow marker");
    });
  });

  it("no arrow markers when arrow is 'none'", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const src = rect({ id: "rs6", x: 100, y: 100, w: 200, h: 100 });
      const tgt = rect({ id: "rt6", x: 500, y: 100, w: 200, h: 100 });
      const conn = connect("rs6", "rt6", { id: "rc6", arrow: "none" });

      await render([{ elements: [src, tgt, conn] }], { container });

      const svgWrapper = container.querySelector('[data-sk-id="rc6"]');
      const line = svgWrapper.querySelector("line");
      assert.ok(!line.getAttribute("marker-end"), "should not have marker-end");
      assert.ok(!line.getAttribute("marker-start"), "should not have marker-start");
    });
  });

  it("applies custom color and thickness to connector", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const src = rect({ id: "rs7", x: 100, y: 100, w: 200, h: 100 });
      const tgt = rect({ id: "rt7", x: 500, y: 100, w: 200, h: 100 });
      const conn = connect("rs7", "rt7", { id: "rc7", color: "#ff0000", thickness: 5 });

      await render([{ elements: [src, tgt, conn] }], { container });

      const svgWrapper = container.querySelector('[data-sk-id="rc7"]');
      const line = svgWrapper.querySelector("line");
      assert.equal(line.getAttribute("stroke"), "#ff0000");
      assert.equal(line.getAttribute("stroke-width"), "5");
    });
  });

  it("applies dash array to connector", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const src = rect({ id: "rs8", x: 100, y: 100, w: 200, h: 100 });
      const tgt = rect({ id: "rt8", x: 500, y: 100, w: 200, h: 100 });
      const conn = connect("rs8", "rt8", { id: "rc8", dash: [10, 5] });

      await render([{ elements: [src, tgt, conn] }], { container });

      const svgWrapper = container.querySelector('[data-sk-id="rc8"]');
      const line = svgWrapper.querySelector("line");
      assert.equal(line.getAttribute("stroke-dasharray"), "10,5");
    });
  });

  it("renders connector label", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const src = rect({ id: "rs9", x: 100, y: 100, w: 200, h: 100 });
      const tgt = rect({ id: "rt9", x: 500, y: 100, w: 200, h: 100 });
      const conn = connect("rs9", "rt9", { id: "rc9", label: "data flow" });

      await render([{ elements: [src, tgt, conn] }], { container });

      const svgWrapper = container.querySelector('[data-sk-id="rc9"]');
      const svgText = svgWrapper.querySelector("text");
      assert.ok(svgText, "connector label should be rendered as SVG text");
      assert.equal(svgText.textContent, "data flow");
    });
  });

  it("unique marker IDs across multiple connectors", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const a = rect({ id: "ua", x: 0, y: 0, w: 100, h: 100 });
      const b = rect({ id: "ub", x: 300, y: 0, w: 100, h: 100 });
      const c = rect({ id: "uc", x: 600, y: 0, w: 100, h: 100 });
      const conn1 = connect("ua", "ub", { id: "uc1" });
      const conn2 = connect("ub", "uc", { id: "uc2" });

      await render([{ elements: [a, b, c, conn1, conn2] }], { container });

      // Find all marker elements
      const markers = container.querySelectorAll("marker");
      const markerIds = [...markers].map(m => m.getAttribute("id"));
      // All marker IDs should be unique
      const uniqueIds = new Set(markerIds);
      assert.equal(uniqueIds.size, markerIds.length, "marker IDs should be unique across connectors");
    });
  });
});

// =============================================================================
// M7.3: panel() — Element Shape & Defaults
// =============================================================================

describe("M7.3: panel — element shape & defaults", () => {
  it("returns a group element tagged as panel compound", () => {
    _resetForTests();
    const el = panel([rect({ w: 200, h: 50 })], { id: "p1", w: 400 });
    assert.equal(el.type, "group");
    assert.equal(el.id, "p1");
    assert.equal(el._compound, "panel");
  });

  it("contains bgRect and childStack as children", () => {
    _resetForTests();
    const el = panel([rect({ w: 200, h: 50 })], { id: "p2", w: 400 });
    assert.equal(el.children.length, 2);
    assert.equal(el.children[0].type, "rect"); // background rect
    assert.equal(el.children[1].type, "vstack"); // child stack
  });

  it("applies default padding of 24", () => {
    _resetForTests();
    const el = panel([rect({ w: 200, h: 50 })], { id: "p3", w: 400 });
    assert.equal(el._panelConfig.padding, 24);
  });

  it("applies default gap of 16", () => {
    _resetForTests();
    const el = panel([rect({ w: 200, h: 50 })], { id: "p4", w: 400 });
    assert.equal(el._panelConfig.gap, 16);
  });

  it("accepts custom padding and gap", () => {
    _resetForTests();
    const el = panel([rect({ w: 200, h: 50 })], { id: "p5", w: 400, padding: 32, gap: 8 });
    assert.equal(el._panelConfig.padding, 32);
    assert.equal(el._panelConfig.gap, 8);
  });

  it("positions childStack at (padding, padding)", () => {
    _resetForTests();
    const el = panel([rect({ w: 200, h: 50 })], { id: "p6", w: 400, padding: 20 });
    const childStack = el.children[1];
    assert.equal(childStack.props.x, 20);
    assert.equal(childStack.props.y, 20);
  });

  it("bgRect starts at (0, 0) with panel width", () => {
    _resetForTests();
    const el = panel([rect({ w: 200, h: 50 })], { id: "p7", w: 500 });
    const bgRect = el.children[0];
    assert.equal(bgRect.props.x, 0);
    assert.equal(bgRect.props.y, 0);
    assert.equal(bgRect.props.w, 500);
  });

  it("passes fill and radius to bgRect", () => {
    _resetForTests();
    const el = panel([rect({ w: 200, h: 50 })], {
      id: "p8", w: 400, fill: "#1a1a2e", radius: 12,
    });
    const bgRect = el.children[0];
    assert.equal(bgRect.props.fill, "#1a1a2e");
    assert.equal(bgRect.props.radius, 12);
  });

  it("passes border to bgRect", () => {
    _resetForTests();
    const el = panel([rect({ w: 200, h: 50 })], {
      id: "p9", w: 400, border: "1px solid #ccc",
    });
    const bgRect = el.children[0];
    assert.equal(bgRect.props.border, "1px solid #ccc");
  });

  it("passes x, y, layer, opacity to the group", () => {
    _resetForTests();
    const el = panel([rect({ w: 200, h: 50 })], {
      id: "p10", w: 400, x: 100, y: 200, layer: "overlay", opacity: 0.8,
    });
    assert.equal(el.props.x, 100);
    assert.equal(el.props.y, 200);
    assert.equal(el.props.layer, "overlay");
    assert.equal(el.props.opacity, 0.8);
  });

  it("generates auto ID when none provided", () => {
    _resetForTests();
    const el = panel([rect({ w: 200, h: 50 })], { w: 400 });
    assert.ok(el.id.startsWith("sk-"), "auto ID should start with sk-");
  });

  it("stores panel config in _panelConfig", () => {
    _resetForTests();
    const el = panel([rect({ w: 200, h: 50 })], { id: "p11", w: 600, h: 400, padding: 30, gap: 10 });
    assert.equal(el._panelConfig.panelW, 600);
    assert.equal(el._panelConfig.panelH, 400);
    assert.equal(el._panelConfig.padding, 30);
    assert.equal(el._panelConfig.gap, 10);
  });
});

// =============================================================================
// M7.3: panel() — "fill" Width Resolution
// =============================================================================

describe("M7.3: panel — fill width resolution", () => {
  it("resolves w: 'fill' on children to panelW - 2*padding", () => {
    _resetForTests();
    const child = rect({ id: "fc", w: "fill", h: 50 });
    const el = panel([child], { id: "pf1", w: 400, padding: 24 });

    // The child inside the vstack should have resolved width
    const stackChildren = el.children[1].children; // vstack children
    assert.equal(stackChildren[0].props.w, 400 - 2 * 24);
    assert.equal(stackChildren[0].props.w, 352);
  });

  it("does not modify children without w: 'fill'", () => {
    _resetForTests();
    const child = rect({ id: "fc2", w: 200, h: 50 });
    const el = panel([child], { id: "pf2", w: 400, padding: 24 });

    const stackChildren = el.children[1].children;
    assert.equal(stackChildren[0].props.w, 200);
  });

  it("clamps contentW to 0 when panel is narrower than 2*padding", () => {
    _resetForTests();
    const child = rect({ id: "fc3", w: "fill", h: 50 });
    // Panel w=10 but padding=24, so contentW would be 10-48=-38 -> clamped to 0
    const el = panel([child], { id: "pf3", w: 10, padding: 24 });

    const stackChildren = el.children[1].children;
    assert.equal(stackChildren[0].props.w, 0);
  });

  it("does not resolve fill when panelW is not specified", () => {
    _resetForTests();
    const child = rect({ id: "fc4", w: "fill", h: 50 });
    const el = panel([child], { id: "pf4", padding: 24 });

    // Without panelW, contentW is undefined, so fill is not resolved
    const stackChildren = el.children[1].children;
    assert.equal(stackChildren[0].props.w, "fill");
  });
});

// =============================================================================
// M7.3: panel() — Layout Integration
// =============================================================================

describe("M7.3: panel — layout integration", () => {
  it("layout resolves panel position", async () => {
    _resetForTests();
    const el = panel([rect({ w: 200, h: 50 })], { id: "pl1", w: 400, x: 100, y: 200 });
    const scene = await layout({ elements: [el] });

    assert.ok(scene.elements["pl1"], "panel should exist in scene");
    assert.equal(scene.elements["pl1"].resolved.x, 100);
    assert.equal(scene.elements["pl1"].resolved.y, 200);
  });

  it("panel auto-height is computed from children + 2*padding", async () => {
    _resetForTests();
    const child1 = rect({ id: "pc1", w: 200, h: 80 });
    const child2 = rect({ id: "pc2", w: 200, h: 60 });
    const el = panel([child1, child2], { id: "pl2", w: 400, padding: 24, gap: 16 });

    const scene = await layout({ elements: [el] });

    // vstack height = 80 + 16 + 60 = 156
    // auto-height = 156 + 2*24 = 204
    const panelData = scene.elements["pl2"];
    assert.equal(panelData.resolved.h, 204, "panel height should be auto-computed");
  });

  it("explicit panel height overrides auto-height", async () => {
    _resetForTests();
    const child = rect({ id: "pc3", w: 200, h: 80 });
    const el = panel([child], { id: "pl3", w: 400, h: 300, padding: 24 });

    const scene = await layout({ elements: [el] });

    const panelData = scene.elements["pl3"];
    assert.equal(panelData.resolved.h, 300, "explicit h should override auto-height");
  });

  it("bgRect height matches panel height", async () => {
    _resetForTests();
    const child = rect({ id: "pc4", w: 200, h: 100 });
    const el = panel([child], { id: "pl4", w: 400, padding: 20 });

    const scene = await layout({ elements: [el] });

    // Auto-height = 100 + 2*20 = 140
    const bgRect = el.children[0];
    const bgData = scene.elements[bgRect.id];
    assert.equal(bgData.resolved.h, 140, "bgRect height should match panel auto-height");
  });

  it("panel width is set on the group", async () => {
    _resetForTests();
    const child = rect({ id: "pc5", w: 200, h: 50 });
    const el = panel([child], { id: "pl5", w: 600, padding: 24 });

    const scene = await layout({ elements: [el] });

    assert.equal(scene.elements["pl5"].resolved.w, 600);
  });

  it("no layout errors for valid panel", async () => {
    _resetForTests();
    const child1 = rect({ id: "pc6", w: 200, h: 50 });
    const child2 = rect({ id: "pc7", w: 200, h: 50 });
    const el = panel([child1, child2], { id: "pl6", w: 400, padding: 24, gap: 10 });

    const scene = await layout({ elements: [el] });
    assert.equal(scene.errors.length, 0, "should have no layout errors");
  });
});

// =============================================================================
// M7.3: panel() — Rendering
// =============================================================================

describe("M7.3: panel — rendering", () => {
  it("renders panel with background rect and children", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const child = rect({ id: "prc1", w: 200, h: 50, fill: "#444" });
      const el = panel([child], { id: "prp1", w: 400, fill: "#1a1a2e", radius: 8 });

      await render([{ elements: [el] }], { container });

      const panelEl = container.querySelector('[data-sk-id="prp1"]');
      assert.ok(panelEl, "panel group should be rendered");

      // bgRect should be rendered as a child
      const bgRect = el.children[0];
      const bgEl = container.querySelector(`[data-sk-id="${bgRect.id}"]`);
      assert.ok(bgEl, "bgRect should be rendered");
    });
  });
});

// =============================================================================
// M7: Integration — Mixed Compounds
// =============================================================================

describe("M7: integration — mixed compounds on a slide", () => {
  it("layout handles bullets, connectors, and panels together", async () => {
    _resetForTests();
    const header = text("Architecture", { id: "hdr", x: 100, y: 50, w: 800, size: 48 });
    const box1 = rect({ id: "box1", x: 200, y: 200, w: 250, h: 150 });
    const box2 = rect({ id: "box2", x: 600, y: 200, w: 250, h: 150 });
    const conn = connect("box1", "box2", { id: "arrow1" });
    const bul = bullets(["Step 1", "Step 2", "Step 3"], { id: "steps", x: 200, y: 500, w: 600 });
    const pnl = panel(
      [rect({ id: "info-bg", w: 300, h: 40 })],
      { id: "info-panel", x: 1200, y: 200, w: 400, fill: "#2a2a4e", radius: 12 }
    );

    const scene = await layout({ elements: [header, box1, box2, conn, bul, pnl] });

    assert.equal(scene.errors.length, 0, "no errors for mixed compounds");
    assert.ok(scene.elements["hdr"], "header resolved");
    assert.ok(scene.elements["box1"], "box1 resolved");
    assert.ok(scene.elements["box2"], "box2 resolved");
    assert.ok(scene.elements["arrow1"], "connector resolved");
    assert.ok(scene.elements["arrow1"]._connectorResolved, "connector endpoints resolved");
    assert.ok(scene.elements["steps"], "bullets resolved");
    assert.ok(scene.elements["info-panel"], "panel resolved");
  });

  it("render handles all compound types", async () => {
    await withContainer(async (container) => {
      _resetForTests();
      const box1 = rect({ id: "rb1", x: 100, y: 100, w: 200, h: 100, fill: "#333" });
      const box2 = rect({ id: "rb2", x: 500, y: 100, w: 200, h: 100, fill: "#333" });
      const conn = connect("rb1", "rb2", { id: "rconn" });
      const bul = bullets(["A", "B"], { id: "rbul", x: 100, y: 400, w: 400 });
      const pnl = panel(
        [rect({ id: "rpc", w: 200, h: 40, fill: "#555" })],
        { id: "rpnl", x: 800, y: 400, w: 300, fill: "#222" }
      );

      await render([{ elements: [box1, box2, conn, bul, pnl] }], { container });

      assert.ok(container.querySelector('[data-sk-id="rb1"]'), "box1 rendered");
      assert.ok(container.querySelector('[data-sk-id="rb2"]'), "box2 rendered");
      assert.ok(container.querySelector('[data-sk-id="rconn"]'), "connector rendered");
      assert.ok(container.querySelector('[data-sk-id="rbul"]'), "bullets rendered");
      assert.ok(container.querySelector('[data-sk-id="rpnl"]'), "panel rendered");
    });
  });
});

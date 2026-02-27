// SlideKit Tests — M5.5 (Collision Detection, vstack, hstack)

import { describe, it, assert } from './test-runner.js';
import {
  text, image, rect, rule, group,
  render, layout,
  init, safeRect, _resetForTests,
  below, above, rightOf, leftOf,
  centerVWith, centerHWith,
  alignTopWith, alignBottomWith,
  alignLeftWith, alignRightWith,
  centerIn,
  vstack, hstack,
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
// M5.2: vstack() — Element Shape & Defaults
// =============================================================================

describe("M5.2: vstack — element shape & defaults", () => {
  it("vstack() returns the correct element shape", () => {
    _resetForTests();
    const child1 = rect({ id: "c1", w: 100, h: 50 });
    const child2 = rect({ id: "c2", w: 100, h: 50 });
    const stack = vstack([child1, child2], { id: "vs1" });

    assert.equal(stack.type, "vstack");
    assert.equal(stack.id, "vs1");
    assert.equal(stack.children.length, 2);
    assert.equal(stack.props.gap, 0);
    assert.equal(stack.props.align, "left");
  });

  it("vstack() accepts custom gap and align", () => {
    _resetForTests();
    const stack = vstack([rect({ w: 100, h: 50 })], { id: "vs2", gap: 20, align: "center" });

    assert.equal(stack.props.gap, 20);
    assert.equal(stack.props.align, "center");
  });

  it("vstack() generates auto ID when none provided", () => {
    _resetForTests();
    const stack = vstack([rect({ w: 10, h: 10 })]);
    assert.ok(stack.id.startsWith("sk-"), "auto ID should start with sk-");
  });
});

// =============================================================================
// M5.3: hstack() — Element Shape & Defaults
// =============================================================================

describe("M5.3: hstack — element shape & defaults", () => {
  it("hstack() returns the correct element shape", () => {
    _resetForTests();
    const child1 = rect({ id: "c1", w: 100, h: 50 });
    const child2 = rect({ id: "c2", w: 100, h: 50 });
    const stack = hstack([child1, child2], { id: "hs1" });

    assert.equal(stack.type, "hstack");
    assert.equal(stack.id, "hs1");
    assert.equal(stack.children.length, 2);
    assert.equal(stack.props.gap, 0);
    assert.equal(stack.props.align, "top");
  });

  it("hstack() accepts custom gap and align", () => {
    _resetForTests();
    const stack = hstack([rect({ w: 100, h: 50 })], { id: "hs2", gap: 15, align: "middle" });

    assert.equal(stack.props.gap, 15);
    assert.equal(stack.props.align, "middle");
  });

  it("hstack() generates auto ID when none provided", () => {
    _resetForTests();
    const stack = hstack([rect({ w: 10, h: 10 })]);
    assert.ok(stack.id.startsWith("sk-"), "auto ID should start with sk-");
  });
});

// =============================================================================
// M5.4: vstack — Layout Integration
// =============================================================================

describe("M5.4: vstack — layout integration", () => {
  it("vstack places children top-to-bottom with no gap", async () => {
    _resetForTests();
    await init();

    const child1 = rect({ id: "c1", w: 200, h: 80 });
    const child2 = rect({ id: "c2", w: 200, h: 60 });
    const child3 = rect({ id: "c3", w: 200, h: 40 });
    const stack = vstack([child1, child2, child3], { id: "vs1", x: 100, y: 100, w: 200 });

    const scene = await layout({ elements: [stack] });
    assert.equal(scene.errors.length, 0);

    // Stack at (100, 100)
    assert.equal(scene.elements["vs1"].resolved.x, 100);
    assert.equal(scene.elements["vs1"].resolved.y, 100);

    // Child 1 at (100, 100), child 2 at (100, 180), child 3 at (100, 240)
    assert.equal(scene.elements["c1"].resolved.x, 100);
    assert.equal(scene.elements["c1"].resolved.y, 100);
    assert.equal(scene.elements["c2"].resolved.x, 100);
    assert.equal(scene.elements["c2"].resolved.y, 180);
    assert.equal(scene.elements["c3"].resolved.x, 100);
    assert.equal(scene.elements["c3"].resolved.y, 240);
  });

  it("vstack places children with gap", async () => {
    _resetForTests();
    await init();

    const child1 = rect({ id: "c1", w: 200, h: 80 });
    const child2 = rect({ id: "c2", w: 200, h: 60 });
    const stack = vstack([child1, child2], { id: "vs1", x: 100, y: 100, w: 200, gap: 20 });

    const scene = await layout({ elements: [stack] });
    assert.equal(scene.errors.length, 0);

    // Child 1 at y=100, child 2 at y=100+80+20=200
    assert.equal(scene.elements["c1"].resolved.y, 100);
    assert.equal(scene.elements["c2"].resolved.y, 200);
  });

  it("vstack left alignment (default)", async () => {
    _resetForTests();
    await init();

    const child1 = rect({ id: "c1", w: 200, h: 50 });
    const child2 = rect({ id: "c2", w: 100, h: 50 }); // narrower
    const stack = vstack([child1, child2], { id: "vs1", x: 100, y: 100, w: 200 });

    const scene = await layout({ elements: [stack] });

    // Left-aligned: both start at stack x=100
    assert.equal(scene.elements["c1"].resolved.x, 100);
    assert.equal(scene.elements["c2"].resolved.x, 100);
  });

  it("vstack center alignment", async () => {
    _resetForTests();
    await init();

    const child1 = rect({ id: "c1", w: 200, h: 50 });
    const child2 = rect({ id: "c2", w: 100, h: 50 }); // narrower
    const stack = vstack([child1, child2], { id: "vs1", x: 100, y: 100, w: 200, align: "center" });

    const scene = await layout({ elements: [stack] });

    // Center-aligned: child2 centered in 200px stack width
    // child2.x = stackX + (stackW - childW) / 2 = 100 + (200 - 100) / 2 = 150
    assert.equal(scene.elements["c1"].resolved.x, 100);
    assert.equal(scene.elements["c2"].resolved.x, 150);
  });

  it("vstack right alignment", async () => {
    _resetForTests();
    await init();

    const child1 = rect({ id: "c1", w: 200, h: 50 });
    const child2 = rect({ id: "c2", w: 100, h: 50 }); // narrower
    const stack = vstack([child1, child2], { id: "vs1", x: 100, y: 100, w: 200, align: "right" });

    const scene = await layout({ elements: [stack] });

    // Right-aligned: child2.x = stackX + stackW - childW = 100 + 200 - 100 = 200
    assert.equal(scene.elements["c1"].resolved.x, 100);
    assert.equal(scene.elements["c2"].resolved.x, 200);
  });

  it("vstack computes total height from children", async () => {
    _resetForTests();
    await init();

    const child1 = rect({ id: "c1", w: 200, h: 80 });
    const child2 = rect({ id: "c2", w: 200, h: 60 });
    const stack = vstack([child1, child2], { id: "vs1", x: 0, y: 0, w: 200, gap: 10 });

    const scene = await layout({ elements: [stack] });

    // Total height = 80 + 10 + 60 = 150
    assert.equal(scene.elements["vs1"].resolved.h, 150);
  });

  it("vstack uses max child width when stack w not specified", async () => {
    _resetForTests();
    await init();

    const child1 = rect({ id: "c1", w: 200, h: 50 });
    const child2 = rect({ id: "c2", w: 300, h: 50 }); // wider
    const stack = vstack([child1, child2], { id: "vs1", x: 0, y: 0 });

    const scene = await layout({ elements: [stack] });

    // Stack width = max(200, 300) = 300
    assert.equal(scene.elements["vs1"].resolved.w, 300);
  });

  it("vstack children inherit stack width when child has no explicit w", async () => {
    _resetForTests();
    await init();

    // A text element without explicit w should inherit the stack's w
    const child1 = text("Hello World", { id: "c1", h: 50 });
    const child2 = rect({ id: "c2", w: 300, h: 50 });
    const stack = vstack([child1, child2], { id: "vs1", x: 0, y: 0, w: 400 });

    const scene = await layout({ elements: [stack] });

    // child1 should inherit stack width of 400
    assert.equal(scene.elements["c1"].resolved.w, 400);
  });

  it("vstack with auto-height text children measures correctly", async () => {
    _resetForTests();
    await init();

    // Text without explicit h gets auto-measured
    const child1 = text("Line one", { id: "c1", size: 32 });
    const child2 = text("Line two", { id: "c2", size: 32 });
    const stack = vstack([child1, child2], { id: "vs1", x: 200, y: 200, w: 400, gap: 10 });

    const scene = await layout({ elements: [stack] });
    assert.equal(scene.errors.length, 0);

    // Children should have auto-measured heights
    assert.ok(scene.elements["c1"].resolved.h > 0, "text child 1 should have measured height");
    assert.ok(scene.elements["c2"].resolved.h > 0, "text child 2 should have measured height");

    // child2.y should be child1.y + child1.h + gap
    const c1 = scene.elements["c1"].resolved;
    const c2 = scene.elements["c2"].resolved;
    assert.equal(c2.y, c1.y + c1.h + 10);
  });

  it("vstack provenance shows source: stack for children", async () => {
    _resetForTests();
    await init();

    const child1 = rect({ id: "c1", w: 200, h: 50 });
    const stack = vstack([child1], { id: "vs1", x: 100, y: 100, w: 200 });

    const scene = await layout({ elements: [stack] });

    const prov = scene.elements["c1"].provenance;
    assert.equal(prov.x.source, "stack");
    assert.equal(prov.x.stackId, "vs1");
    assert.equal(prov.y.source, "stack");
    assert.equal(prov.y.stackId, "vs1");
  });

  it("vstack can be positioned with relative markers", async () => {
    _resetForTests();
    await init();

    const heading = rect({ id: "heading", x: 200, y: 100, w: 400, h: 60 });
    const child1 = rect({ id: "c1", w: 400, h: 50 });
    const child2 = rect({ id: "c2", w: 400, h: 50 });
    const stack = vstack([child1, child2], {
      id: "vs1", x: 200, y: below("heading", { gap: 20 }), w: 400
    });

    const scene = await layout({ elements: [heading, stack] });
    assert.equal(scene.errors.length, 0);

    // Stack y = heading.y + heading.h + gap = 100 + 60 + 20 = 180
    assert.equal(scene.elements["vs1"].resolved.y, 180);
    // First child should be at stack's y
    assert.equal(scene.elements["c1"].resolved.y, 180);
  });
});

// =============================================================================
// M5.4: hstack — Layout Integration
// =============================================================================

describe("M5.4: hstack — layout integration", () => {
  it("hstack places children left-to-right with no gap", async () => {
    _resetForTests();
    await init();

    const child1 = rect({ id: "c1", w: 100, h: 80 });
    const child2 = rect({ id: "c2", w: 120, h: 80 });
    const child3 = rect({ id: "c3", w: 80, h: 80 });
    const stack = hstack([child1, child2, child3], { id: "hs1", x: 100, y: 100 });

    const scene = await layout({ elements: [stack] });
    assert.equal(scene.errors.length, 0);

    // Stack at (100, 100)
    assert.equal(scene.elements["hs1"].resolved.x, 100);
    assert.equal(scene.elements["hs1"].resolved.y, 100);

    // Child 1 at x=100, child 2 at x=200, child 3 at x=320
    assert.equal(scene.elements["c1"].resolved.x, 100);
    assert.equal(scene.elements["c2"].resolved.x, 200);
    assert.equal(scene.elements["c3"].resolved.x, 320);
  });

  it("hstack places children with gap", async () => {
    _resetForTests();
    await init();

    const child1 = rect({ id: "c1", w: 100, h: 80 });
    const child2 = rect({ id: "c2", w: 120, h: 80 });
    const stack = hstack([child1, child2], { id: "hs1", x: 100, y: 100, gap: 30 });

    const scene = await layout({ elements: [stack] });
    assert.equal(scene.errors.length, 0);

    // Child 1 at x=100, child 2 at x=100+100+30=230
    assert.equal(scene.elements["c1"].resolved.x, 100);
    assert.equal(scene.elements["c2"].resolved.x, 230);
  });

  it("hstack top alignment (default)", async () => {
    _resetForTests();
    await init();

    const child1 = rect({ id: "c1", w: 100, h: 80 });
    const child2 = rect({ id: "c2", w: 100, h: 40 }); // shorter
    const stack = hstack([child1, child2], { id: "hs1", x: 100, y: 100 });

    const scene = await layout({ elements: [stack] });

    // Top-aligned: both start at stack y=100
    assert.equal(scene.elements["c1"].resolved.y, 100);
    assert.equal(scene.elements["c2"].resolved.y, 100);
  });

  it("hstack middle alignment", async () => {
    _resetForTests();
    await init();

    const child1 = rect({ id: "c1", w: 100, h: 80 });
    const child2 = rect({ id: "c2", w: 100, h: 40 }); // shorter
    const stack = hstack([child1, child2], { id: "hs1", x: 100, y: 100, align: "middle" });

    const scene = await layout({ elements: [stack] });

    // Stack height = max(80, 40) = 80
    // child2.y = stackY + (stackH - childH) / 2 = 100 + (80 - 40) / 2 = 120
    assert.equal(scene.elements["c1"].resolved.y, 100);
    assert.equal(scene.elements["c2"].resolved.y, 120);
  });

  it("hstack bottom alignment", async () => {
    _resetForTests();
    await init();

    const child1 = rect({ id: "c1", w: 100, h: 80 });
    const child2 = rect({ id: "c2", w: 100, h: 40 }); // shorter
    const stack = hstack([child1, child2], { id: "hs1", x: 100, y: 100, align: "bottom" });

    const scene = await layout({ elements: [stack] });

    // Stack height = max(80, 40) = 80
    // child2.y = stackY + stackH - childH = 100 + 80 - 40 = 140
    assert.equal(scene.elements["c1"].resolved.y, 100);
    assert.equal(scene.elements["c2"].resolved.y, 140);
  });

  it("hstack computes total width from children", async () => {
    _resetForTests();
    await init();

    const child1 = rect({ id: "c1", w: 100, h: 80 });
    const child2 = rect({ id: "c2", w: 120, h: 80 });
    const stack = hstack([child1, child2], { id: "hs1", x: 0, y: 0, gap: 10 });

    const scene = await layout({ elements: [stack] });

    // Total width = 100 + 10 + 120 = 230
    assert.equal(scene.elements["hs1"].resolved.w, 230);
  });

  it("hstack uses max child height when stack h not specified", async () => {
    _resetForTests();
    await init();

    const child1 = rect({ id: "c1", w: 100, h: 80 });
    const child2 = rect({ id: "c2", w: 100, h: 120 }); // taller
    const stack = hstack([child1, child2], { id: "hs1", x: 0, y: 0 });

    const scene = await layout({ elements: [stack] });

    // Stack height = max(80, 120) = 120
    assert.equal(scene.elements["hs1"].resolved.h, 120);
  });

  it("hstack provenance shows source: stack for children", async () => {
    _resetForTests();
    await init();

    const child1 = rect({ id: "c1", w: 100, h: 50 });
    const stack = hstack([child1], { id: "hs1", x: 100, y: 100 });

    const scene = await layout({ elements: [stack] });

    const prov = scene.elements["c1"].provenance;
    assert.equal(prov.x.source, "stack");
    assert.equal(prov.x.stackId, "hs1");
    assert.equal(prov.y.source, "stack");
    assert.equal(prov.y.stackId, "hs1");
  });
});

// =============================================================================
// M5.4: Nested Stacks
// =============================================================================

describe("M5.4: nested stacks", () => {
  it("vstack inside hstack resolves correctly", async () => {
    _resetForTests();
    await init();

    const innerChild1 = rect({ id: "ic1", w: 100, h: 30 });
    const innerChild2 = rect({ id: "ic2", w: 100, h: 30 });
    const innerStack = vstack([innerChild1, innerChild2], { id: "inner-vs", w: 100, gap: 10 });

    const sideChild = rect({ id: "side", w: 80, h: 70 });
    const outerStack = hstack([innerStack, sideChild], { id: "outer-hs", x: 200, y: 200, gap: 20 });

    const scene = await layout({ elements: [outerStack] });
    assert.equal(scene.errors.length, 0);

    // Inner vstack: h = 30 + 10 + 30 = 70, w = 100
    assert.equal(scene.elements["inner-vs"].resolved.w, 100);
    assert.equal(scene.elements["inner-vs"].resolved.h, 70);

    // Outer hstack at (200, 200)
    // Inner vstack at x=200, side at x=200+100+20=320
    assert.equal(scene.elements["inner-vs"].resolved.x, 200);
    assert.equal(scene.elements["side"].resolved.x, 320);

    // Inner children: ic1 at (200, 200), ic2 at (200, 240) [200 + 30h + 10gap]
    assert.equal(scene.elements["ic1"].resolved.x, 200);
    assert.equal(scene.elements["ic1"].resolved.y, 200);
    assert.equal(scene.elements["ic2"].resolved.x, 200);
    assert.equal(scene.elements["ic2"].resolved.y, 240);
  });

  it("hstack inside vstack resolves correctly", async () => {
    _resetForTests();
    await init();

    const innerChild1 = rect({ id: "ic1", w: 60, h: 40 });
    const innerChild2 = rect({ id: "ic2", w: 80, h: 40 });
    const innerStack = hstack([innerChild1, innerChild2], { id: "inner-hs", gap: 10 });

    const topChild = rect({ id: "top", w: 150, h: 50 });
    const outerStack = vstack([topChild, innerStack], { id: "outer-vs", x: 100, y: 100, w: 150, gap: 10 });

    const scene = await layout({ elements: [outerStack] });
    assert.equal(scene.errors.length, 0);

    // Inner hstack: w = 60 + 10 + 80 = 150, h = max(40, 40) = 40
    assert.equal(scene.elements["inner-hs"].resolved.w, 150);
    assert.equal(scene.elements["inner-hs"].resolved.h, 40);

    // Outer vstack at (100, 100), top child at y=100, inner at y=100+50+10=160
    assert.equal(scene.elements["top"].resolved.y, 100);
    assert.equal(scene.elements["inner-hs"].resolved.y, 160);

    // Inner children: ic1 at (100, 160), ic2 at (170, 160)
    assert.equal(scene.elements["ic1"].resolved.x, 100);
    assert.equal(scene.elements["ic1"].resolved.y, 160);
    assert.equal(scene.elements["ic2"].resolved.x, 170);
    assert.equal(scene.elements["ic2"].resolved.y, 160);
  });
});

// =============================================================================
// M5.4: Elements Can Reference Stack Children
// =============================================================================

describe("M5.4: elements can reference stack children", () => {
  it("external element can use below() referencing a stack child", async () => {
    _resetForTests();
    await init();

    const child1 = rect({ id: "sc1", w: 200, h: 60 });
    const child2 = rect({ id: "sc2", w: 200, h: 40 });
    const stack = vstack([child1, child2], { id: "vs1", x: 200, y: 100, w: 200 });

    // Element positioned below the last stack child
    const label = rect({ id: "label", x: 200, y: below("sc2", { gap: 10 }), w: 200, h: 30 });

    const scene = await layout({ elements: [stack, label] });
    assert.equal(scene.errors.length, 0);

    // sc2 is at y=100+60=160, h=40, so label.y = 160+40+10 = 210
    assert.equal(scene.elements["label"].resolved.y, 210);
  });

  it("external element can use rightOf() referencing a stack", async () => {
    _resetForTests();
    await init();

    const child1 = rect({ id: "sc1", w: 100, h: 50 });
    const stack = hstack([child1], { id: "hs1", x: 100, y: 100 });

    const label = rect({ id: "label", x: rightOf("hs1", { gap: 20 }), y: 100, w: 50, h: 50 });

    const scene = await layout({ elements: [stack, label] });
    assert.equal(scene.errors.length, 0);

    // Stack at x=100, w=100, so label.x = 100 + 100 + 20 = 220
    assert.equal(scene.elements["label"].resolved.x, 220);
  });
});

// =============================================================================
// M5.4: _rel Warning on Stack Children
// =============================================================================

describe("M5.4: _rel warning on stack children", () => {
  it("warns when a stack child has a _rel marker on x or y", async () => {
    _resetForTests();
    await init();

    const heading = rect({ id: "heading", x: 100, y: 50, w: 200, h: 40 });
    // Stack child with a _rel marker on y — this is ignored by the stack layout
    const child1 = rect({ id: "c1", w: 200, h: 50, y: below("heading") });
    const stack = vstack([child1], { id: "vs1", x: 100, y: 100, w: 200 });

    const scene = await layout({ elements: [heading, stack] });

    // Should have a warning about ignored _rel on stack child
    const relWarning = scene.warnings.find(w => w.type === "ignored_rel_on_stack_child");
    assert.ok(relWarning, "should warn about _rel on stack child");
    assert.equal(relWarning.elementId, "c1");
    assert.equal(relWarning.stackId, "vs1");
  });
});

// =============================================================================
// M5.1: Collision Detection
// =============================================================================

describe("M5.1: collision detection — overlapping elements", () => {
  it("detects overlapping elements on the same layer", async () => {
    _resetForTests();
    await init();

    const r1 = rect({ id: "r1", x: 200, y: 200, w: 200, h: 200 });
    const r2 = rect({ id: "r2", x: 300, y: 300, w: 200, h: 200 }); // overlaps r1

    const scene = await layout({ elements: [r1, r2] });
    assert.equal(scene.errors.length, 0);

    // r1: (200,200)-(400,400), r2: (300,300)-(500,500)
    // Overlap: (300,300)-(400,400) = 100x100
    assert.equal(scene.collisions.length, 1);
    assert.equal(scene.collisions[0].elementA, "r1");
    assert.equal(scene.collisions[0].elementB, "r2");
    assert.equal(scene.collisions[0].overlapArea, 10000); // 100*100
    assert.equal(scene.collisions[0].overlapRect.x, 300);
    assert.equal(scene.collisions[0].overlapRect.y, 300);
    assert.equal(scene.collisions[0].overlapRect.w, 100);
    assert.equal(scene.collisions[0].overlapRect.h, 100);
  });

  it("does not detect collision for non-overlapping elements", async () => {
    _resetForTests();
    await init();

    const r1 = rect({ id: "r1", x: 200, y: 200, w: 100, h: 100 });
    const r2 = rect({ id: "r2", x: 400, y: 200, w: 100, h: 100 }); // no overlap

    const scene = await layout({ elements: [r1, r2] });
    assert.equal(scene.collisions.length, 0);
  });

  it("does not detect collision for elements that just touch edges", async () => {
    _resetForTests();
    await init();

    const r1 = rect({ id: "r1", x: 200, y: 200, w: 100, h: 100 });
    const r2 = rect({ id: "r2", x: 300, y: 200, w: 100, h: 100 }); // touching, not overlapping

    const scene = await layout({ elements: [r1, r2] });
    assert.equal(scene.collisions.length, 0);
  });

  it("detects multiple collisions", async () => {
    _resetForTests();
    await init();

    const r1 = rect({ id: "r1", x: 200, y: 200, w: 200, h: 200 });
    const r2 = rect({ id: "r2", x: 300, y: 200, w: 200, h: 200 }); // overlaps r1
    const r3 = rect({ id: "r3", x: 250, y: 250, w: 100, h: 100 }); // overlaps r1 and r2

    const scene = await layout({ elements: [r1, r2, r3] });

    // Should have 3 collisions: r1-r2, r1-r3, r2-r3
    assert.equal(scene.collisions.length, 3);
  });
});

describe("M5.1: collision detection — cross-layer behavior", () => {
  it("does not detect collision between elements on different layers", async () => {
    _resetForTests();
    await init();

    const bg = rect({ id: "r1", x: 200, y: 200, w: 200, h: 200, layer: "bg" });
    const content = rect({ id: "r2", x: 200, y: 200, w: 200, h: 200, layer: "content" });

    const scene = await layout({ elements: [bg, content] });

    // Same position but different layers — no collision
    assert.equal(scene.collisions.length, 0);
  });

  it("detects collision within the bg layer", async () => {
    _resetForTests();
    await init();

    const bg1 = rect({ id: "r1", x: 200, y: 200, w: 200, h: 200, layer: "bg" });
    const bg2 = rect({ id: "r2", x: 300, y: 300, w: 200, h: 200, layer: "bg" });

    const scene = await layout({ elements: [bg1, bg2] });
    assert.equal(scene.collisions.length, 1);
  });

  it("detects collision within the overlay layer", async () => {
    _resetForTests();
    await init();

    const ov1 = rect({ id: "r1", x: 200, y: 200, w: 200, h: 200, layer: "overlay" });
    const ov2 = rect({ id: "r2", x: 300, y: 300, w: 200, h: 200, layer: "overlay" });

    const scene = await layout({ elements: [ov1, ov2] });
    assert.equal(scene.collisions.length, 1);
  });
});

describe("M5.1: collision detection — threshold", () => {
  it("collision threshold filters out small overlaps", async () => {
    _resetForTests();
    await init();

    // Overlap area = 10 * 200 = 2000 (only 10px horizontal overlap)
    const r1 = rect({ id: "r1", x: 200, y: 200, w: 200, h: 200 });
    const r2 = rect({ id: "r2", x: 390, y: 200, w: 200, h: 200 }); // 10px overlap

    // With default threshold (0) — collision detected
    const scene1 = await layout({ elements: [r1, r2] });
    assert.equal(scene1.collisions.length, 1);

    _resetForTests();
    await init();

    // Same elements but with threshold higher than overlap area
    const r1b = rect({ id: "r1", x: 200, y: 200, w: 200, h: 200 });
    const r2b = rect({ id: "r2", x: 390, y: 200, w: 200, h: 200 });
    const scene2 = await layout({ elements: [r1b, r2b] }, { collisionThreshold: 5000 });
    assert.equal(scene2.collisions.length, 0);
  });

  it("collision threshold allows large overlaps through", async () => {
    _resetForTests();
    await init();

    // Large overlap: 100 * 100 = 10000
    const r1 = rect({ id: "r1", x: 200, y: 200, w: 200, h: 200 });
    const r2 = rect({ id: "r2", x: 300, y: 300, w: 200, h: 200 });

    const scene = await layout({ elements: [r1, r2] }, { collisionThreshold: 5000 });
    assert.equal(scene.collisions.length, 1);
    assert.equal(scene.collisions[0].overlapArea, 10000);
  });
});

describe("M5.1: collision detection — stack children", () => {
  it("detects collision between stack child and external element", async () => {
    _resetForTests();
    await init();

    const child1 = rect({ id: "sc1", w: 200, h: 100 });
    const stack = vstack([child1], { id: "vs1", x: 200, y: 200, w: 200 });

    // External element that overlaps the stack child
    const overlapper = rect({ id: "ext", x: 300, y: 250, w: 200, h: 100 });

    const scene = await layout({ elements: [stack, overlapper] });

    // sc1 at (200,200)-(400,300), ext at (300,250)-(500,350)
    // Overlap: (300,250)-(400,300) = 100x50 = 5000
    assert.equal(scene.collisions.length, 1);
    assert.equal(scene.collisions[0].overlapArea, 5000);
  });

  it("does not report collision between stack container and its children", async () => {
    _resetForTests();
    await init();

    const child1 = rect({ id: "sc1", w: 200, h: 100 });
    const child2 = rect({ id: "sc2", w: 200, h: 100 });
    const stack = vstack([child1, child2], { id: "vs1", x: 200, y: 200, w: 200 });

    const scene = await layout({ elements: [stack] });

    // No collisions — stack children don't collide with each other
    // (they're laid out without overlap) and the stack container is skipped
    assert.equal(scene.collisions.length, 0);
  });

  it("does not report collision for zero-sized elements", async () => {
    _resetForTests();
    await init();

    const r1 = rect({ id: "r1", x: 200, y: 200, w: 200, h: 200 });
    const r2 = rect({ id: "r2", x: 200, y: 200, w: 0, h: 0 }); // zero-size

    const scene = await layout({ elements: [r1, r2] });
    assert.equal(scene.collisions.length, 0);
  });
});

// =============================================================================
// M5.4: Stack Rendering
// =============================================================================

describe("M5.4: stack rendering", () => {
  it("vstack renders children as DOM elements inside stack div", async () => {
    _resetForTests();
    await init();

    const child1 = rect({ id: "c1", w: 200, h: 50, fill: "#ff0000" });
    const child2 = rect({ id: "c2", w: 200, h: 50, fill: "#00ff00" });
    const stack = vstack([child1, child2], { id: "vs1", x: 300, y: 300, w: 200, gap: 10 });

    await withContainer(async (container) => {
      const { sections } = await render([{ elements: [stack] }], { container });
      const layer = sections[0].querySelector(".slidekit-layer");

      // Stack div should exist
      const stackDiv = layer.querySelector('[data-sk-id="vs1"]');
      assert.ok(stackDiv, "stack div should exist");

      // Stack children should be inside the stack div
      const child1Div = stackDiv.querySelector('[data-sk-id="c1"]');
      const child2Div = stackDiv.querySelector('[data-sk-id="c2"]');
      assert.ok(child1Div, "child 1 should be inside stack div");
      assert.ok(child2Div, "child 2 should be inside stack div");

      // Stack div should have overflow: visible
      assert.equal(stackDiv.style.overflow, "visible");
    });
  });

  it("hstack renders children as DOM elements inside stack div", async () => {
    _resetForTests();
    await init();

    const child1 = rect({ id: "c1", w: 100, h: 50, fill: "#ff0000" });
    const child2 = rect({ id: "c2", w: 100, h: 50, fill: "#00ff00" });
    const stack = hstack([child1, child2], { id: "hs1", x: 300, y: 300, gap: 10 });

    await withContainer(async (container) => {
      const { sections } = await render([{ elements: [stack] }], { container });
      const layer = sections[0].querySelector(".slidekit-layer");

      const stackDiv = layer.querySelector('[data-sk-id="hs1"]');
      assert.ok(stackDiv, "stack div should exist");

      const child1Div = stackDiv.querySelector('[data-sk-id="c1"]');
      const child2Div = stackDiv.querySelector('[data-sk-id="c2"]');
      assert.ok(child1Div, "child 1 should be inside stack div");
      assert.ok(child2Div, "child 2 should be inside stack div");
    });
  });

  it("stack children use stack-relative coordinates in DOM", async () => {
    _resetForTests();
    await init();

    const child1 = rect({ id: "c1", w: 200, h: 50 });
    const child2 = rect({ id: "c2", w: 200, h: 50 });
    const stack = vstack([child1, child2], { id: "vs1", x: 300, y: 400, w: 200, gap: 10 });

    await withContainer(async (container) => {
      const { sections } = await render([{ elements: [stack] }], { container });
      const layer = sections[0].querySelector(".slidekit-layer");

      const child1Div = layer.querySelector('[data-sk-id="c1"]');
      const child2Div = layer.querySelector('[data-sk-id="c2"]');

      // child1 DOM position should be relative to stack: (0, 0)
      assert.equal(child1Div.style.left, "0px");
      assert.equal(child1Div.style.top, "0px");

      // child2 DOM position should be relative to stack: (0, 60)
      assert.equal(child2Div.style.left, "0px");
      assert.equal(child2Div.style.top, "60px");
    });
  });
});

// =============================================================================
// M5: Scene Graph Structure
// =============================================================================

describe("M5: scene graph structure", () => {
  it("scene graph includes both stack and its children", async () => {
    _resetForTests();
    await init();

    const child1 = rect({ id: "c1", w: 100, h: 50 });
    const child2 = rect({ id: "c2", w: 100, h: 50 });
    const stack = vstack([child1, child2], { id: "vs1", x: 200, y: 200, w: 100 });

    const scene = await layout({ elements: [stack] });

    assert.ok(scene.elements["vs1"], "stack should be in scene graph");
    assert.ok(scene.elements["c1"], "child 1 should be in scene graph");
    assert.ok(scene.elements["c2"], "child 2 should be in scene graph");

    // Stack type is preserved
    assert.equal(scene.elements["vs1"].type, "vstack");
    assert.equal(scene.elements["c1"].type, "rect");
  });

  it("collisions array is always present in scene graph", async () => {
    _resetForTests();
    await init();

    const r1 = rect({ id: "r1", x: 200, y: 200, w: 100, h: 100 });
    const scene = await layout({ elements: [r1] });

    assert.ok(Array.isArray(scene.collisions), "collisions should be an array");
  });
});

// =============================================================================
// Edge Cases: Empty & Single-Child Stacks
// =============================================================================

describe("M5.4: stack edge cases", () => {
  it("vstack with single child positions it at stack origin", async () => {
    _resetForTests();
    await init();

    const child = rect({ id: "c1", w: 100, h: 50 });
    const stack = vstack([child], { id: "vs1", x: 300, y: 400, w: 100 });

    const scene = await layout({ elements: [stack] });
    assert.equal(scene.errors.length, 0);

    assert.equal(scene.elements["c1"].resolved.x, 300);
    assert.equal(scene.elements["c1"].resolved.y, 400);
    assert.equal(scene.elements["vs1"].resolved.h, 50);
  });

  it("hstack with single child positions it at stack origin", async () => {
    _resetForTests();
    await init();

    const child = rect({ id: "c1", w: 100, h: 50 });
    const stack = hstack([child], { id: "hs1", x: 300, y: 400 });

    const scene = await layout({ elements: [stack] });
    assert.equal(scene.errors.length, 0);

    assert.equal(scene.elements["c1"].resolved.x, 300);
    assert.equal(scene.elements["c1"].resolved.y, 400);
    assert.equal(scene.elements["hs1"].resolved.w, 100);
  });

  it("vstack with explicit h keeps that h", async () => {
    _resetForTests();
    await init();

    const child = rect({ id: "c1", w: 100, h: 50 });
    const stack = vstack([child], { id: "vs1", x: 0, y: 0, w: 100, h: 200 });

    const scene = await layout({ elements: [stack] });

    // Stack h should be the explicit 200, not the child sum of 50
    assert.equal(scene.elements["vs1"].resolved.h, 200);
  });

  it("hstack with explicit w keeps that w", async () => {
    _resetForTests();
    await init();

    const child = rect({ id: "c1", w: 100, h: 50 });
    const stack = hstack([child], { id: "hs1", x: 0, y: 0, h: 50, w: 500 });

    const scene = await layout({ elements: [stack] });

    // Stack w should be the explicit 500, not the child sum of 100
    assert.equal(scene.elements["hs1"].resolved.w, 500);
  });

  it("multiple collisions include correct element pairs", async () => {
    _resetForTests();
    await init();

    const r1 = rect({ id: "r1", x: 200, y: 200, w: 200, h: 200 });
    const r2 = rect({ id: "r2", x: 300, y: 200, w: 200, h: 200 }); // overlaps r1
    const r3 = rect({ id: "r3", x: 250, y: 250, w: 100, h: 100 }); // overlaps r1 and r2

    const scene = await layout({ elements: [r1, r2, r3] });

    // Should have 3 collisions: r1-r2, r1-r3, r2-r3
    assert.equal(scene.collisions.length, 3);

    // Verify each pair exists
    const pairs = scene.collisions.map(c => `${c.elementA}-${c.elementB}`);
    assert.ok(pairs.includes("r1-r2"), "should have r1-r2 collision");
    assert.ok(pairs.includes("r1-r3"), "should have r1-r3 collision");
    assert.ok(pairs.includes("r2-r3"), "should have r2-r3 collision");
  });
});

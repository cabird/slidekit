// SlideKit Tests — M1.1 (Element Model), M1.2 (Anchors), M1.3 (CSS Filtering), M1.5 (Init)

import { describe, it, assert } from './test-runner.js';
import {
  text, image, rect, rule, group,
  resolveAnchor, filterStyle,
  init, safeRect, getConfig, resetIdCounter, _resetForTests,
} from '../slidekit.js';

// =============================================================================
// M1.1: Core Element Model
// =============================================================================

describe("M1.1: text()", () => {
  it("returns correct object shape", () => {
    resetIdCounter();
    const el = text("Hello", { x: 100, y: 200, w: 800 });
    assert.equal(el.type, "text");
    assert.equal(el.content, "Hello");
    assert.equal(el.props.x, 100);
    assert.equal(el.props.y, 200);
    assert.equal(el.props.w, 800);
  });

  it("applies default values for text-specific props", () => {
    resetIdCounter();
    const el = text("Hello");
    assert.equal(el.props.font, "Inter");
    assert.equal(el.props.size, 32);
    assert.equal(el.props.weight, 400);
    assert.equal(el.props.color, "#ffffff");
    assert.equal(el.props.lineHeight, 1.3);
    assert.equal(el.props.letterSpacing, "0");
    assert.equal(el.props.align, "left");
    assert.equal(el.props.overflow, "warn");
    assert.equal(el.props.fit, null);
    assert.equal(el.props.maxLines, null);
  });

  it("applies common default values", () => {
    resetIdCounter();
    const el = text("Hello");
    assert.equal(el.props.x, 0);
    assert.equal(el.props.y, 0);
    assert.equal(el.props.anchor, "tl");
    assert.equal(el.props.layer, "content");
    assert.equal(el.props.opacity, 1);
    assert.equal(el.props.className, "");
    assert.deepEqual(el.props.style, {});
  });

  it("preserves user-provided props over defaults", () => {
    resetIdCounter();
    const el = text("Hello", { font: "Georgia", size: 48, anchor: "cc", layer: "overlay" });
    assert.equal(el.props.font, "Georgia");
    assert.equal(el.props.size, 48);
    assert.equal(el.props.anchor, "cc");
    assert.equal(el.props.layer, "overlay");
  });

  it("does not include id in props", () => {
    resetIdCounter();
    const el = text("Hello", { id: "my-text" });
    assert.equal(el.id, "my-text");
    assert.equal(el.props.id, undefined, "id should not be in props");
  });

  it("passes through extra user props not in defaults", () => {
    resetIdCounter();
    const el = text("Hello", { w: 400, h: 200, z: 5 });
    assert.equal(el.props.w, 400);
    assert.equal(el.props.h, 200);
    assert.equal(el.props.z, 5);
  });

  it("handles empty string content", () => {
    resetIdCounter();
    const el = text("");
    assert.equal(el.content, "");
    assert.equal(el.type, "text");
  });
});

describe("M1.1: image()", () => {
  it("returns correct object shape", () => {
    resetIdCounter();
    const el = image("photo.jpg", { x: 0, y: 0, w: 1920, h: 1080 });
    assert.equal(el.type, "image");
    assert.equal(el.src, "photo.jpg");
    assert.equal(el.props.w, 1920);
    assert.equal(el.props.h, 1080);
  });

  it("applies image-specific defaults", () => {
    resetIdCounter();
    const el = image("photo.jpg");
    assert.equal(el.props.fit, "cover");
    assert.equal(el.props.position, "center");
  });

  it("does not include id in props", () => {
    resetIdCounter();
    const el = image("photo.jpg", { id: "hero" });
    assert.equal(el.id, "hero");
    assert.equal(el.props.id, undefined);
  });
});

describe("M1.1: rect()", () => {
  it("returns correct object shape", () => {
    resetIdCounter();
    const el = rect({ x: 100, y: 200, w: 500, h: 400 });
    assert.equal(el.type, "rect");
    assert.equal(el.props.x, 100);
    assert.equal(el.props.w, 500);
  });

  it("applies rect-specific defaults", () => {
    resetIdCounter();
    const el = rect();
    assert.equal(el.props.fill, "transparent");
    assert.equal(el.props.radius, 0);
    assert.equal(el.props.border, "none");
    assert.equal(el.props.padding, 0);
  });
});

describe("M1.1: rule()", () => {
  it("returns correct object shape", () => {
    resetIdCounter();
    const el = rule({ x: 170, y: 470, w: 120 });
    assert.equal(el.type, "rule");
    assert.equal(el.props.x, 170);
    assert.equal(el.props.w, 120);
  });

  it("applies rule-specific defaults", () => {
    resetIdCounter();
    const el = rule();
    assert.equal(el.props.direction, "horizontal");
    assert.equal(el.props.thickness, 2);
    assert.equal(el.props.color, "#ffffff");
  });
});

describe("M1.1: group()", () => {
  it("returns correct object shape with children", () => {
    resetIdCounter();
    const child1 = rect({ w: 100, h: 100 });
    const child2 = text("Hi", { w: 100 });
    const g = group([child1, child2], { x: 50, y: 50 });
    assert.equal(g.type, "group");
    assert.equal(g.children.length, 2);
    assert.equal(g.children[0].type, "rect");
    assert.equal(g.children[1].type, "text");
    assert.equal(g.props.x, 50);
  });

  it("applies group-specific defaults", () => {
    resetIdCounter();
    const g = group([]);
    assert.equal(g.props.scale, 1);
    assert.equal(g.props.clip, false);
  });
});

describe("M1.1: Auto-generated IDs", () => {
  it("generates sequential IDs starting from sk-1", () => {
    resetIdCounter();
    const el1 = text("A");
    const el2 = rect();
    const el3 = image("x.jpg");
    assert.equal(el1.id, "sk-1");
    assert.equal(el2.id, "sk-2");
    assert.equal(el3.id, "sk-3");
  });

  it("produces deterministic IDs after reset", () => {
    // First call
    resetIdCounter();
    const firstRun = [text("A").id, rect().id, image("x.jpg").id];

    // Second call — same elements, same order, same IDs
    resetIdCounter();
    const secondRun = [text("A").id, rect().id, image("x.jpg").id];

    assert.deepEqual(firstRun, secondRun, "IDs should be deterministic across calls");
  });

  it("user-provided id overrides auto-generated", () => {
    resetIdCounter();
    const el1 = text("A");
    const el2 = text("B", { id: "my-id" });
    const el3 = text("C");
    assert.equal(el1.id, "sk-1");
    assert.equal(el2.id, "my-id");
    // el3 should be sk-2 because el2 didn't consume an auto-ID
    assert.equal(el3.id, "sk-2");
  });

  it("each element type gets unique sequential IDs", () => {
    resetIdCounter();
    const ids = [
      text("A").id,
      image("b.jpg").id,
      rect().id,
      rule().id,
      group([]).id,
    ];
    assert.deepEqual(ids, ["sk-1", "sk-2", "sk-3", "sk-4", "sk-5"]);
  });
});

describe("M1.1: Style isolation", () => {
  it("each element gets its own style object (no shared reference)", () => {
    resetIdCounter();
    const el1 = text("A");
    const el2 = text("B");
    assert.ok(el1.props.style !== el2.props.style, "style objects should be different references");
    // Mutating one should not affect the other
    el1.props.style.color = "red";
    assert.equal(el2.props.style.color, undefined);
  });
});

// =============================================================================
// M1.2: Anchor Resolution
// =============================================================================

describe("M1.2: resolveAnchor()", () => {
  // Test element: x=100, y=200, w=400, h=300
  const x = 100, y = 200, w = 400, h = 300;

  it("tl — top-left: left=x, top=y", () => {
    const r = resolveAnchor(x, y, w, h, "tl");
    assert.equal(r.left, 100);
    assert.equal(r.top, 200);
  });

  it("tc — top-center: left=x-w/2, top=y", () => {
    const r = resolveAnchor(x, y, w, h, "tc");
    assert.equal(r.left, -100); // 100 - 200
    assert.equal(r.top, 200);
  });

  it("tr — top-right: left=x-w, top=y", () => {
    const r = resolveAnchor(x, y, w, h, "tr");
    assert.equal(r.left, -300); // 100 - 400
    assert.equal(r.top, 200);
  });

  it("cl — center-left: left=x, top=y-h/2", () => {
    const r = resolveAnchor(x, y, w, h, "cl");
    assert.equal(r.left, 100);
    assert.equal(r.top, 50); // 200 - 150
  });

  it("cc — center-center: left=x-w/2, top=y-h/2", () => {
    const r = resolveAnchor(x, y, w, h, "cc");
    assert.equal(r.left, -100);
    assert.equal(r.top, 50);
  });

  it("cr — center-right: left=x-w, top=y-h/2", () => {
    const r = resolveAnchor(x, y, w, h, "cr");
    assert.equal(r.left, -300);
    assert.equal(r.top, 50);
  });

  it("bl — bottom-left: left=x, top=y-h", () => {
    const r = resolveAnchor(x, y, w, h, "bl");
    assert.equal(r.left, 100);
    assert.equal(r.top, -100); // 200 - 300
  });

  it("bc — bottom-center: left=x-w/2, top=y-h", () => {
    const r = resolveAnchor(x, y, w, h, "bc");
    assert.equal(r.left, -100);
    assert.equal(r.top, -100);
  });

  it("br — bottom-right: left=x-w, top=y-h", () => {
    const r = resolveAnchor(x, y, w, h, "br");
    assert.equal(r.left, -300);
    assert.equal(r.top, -100);
  });

  it("cc centers a 1200x100 box at slide center (960,540)", () => {
    const r = resolveAnchor(960, 540, 1200, 100, "cc");
    assert.equal(r.left, 360); // 960 - 600
    assert.equal(r.top, 490);  // 540 - 50
  });

  it("throws on invalid anchor string", () => {
    assert.throws(() => resolveAnchor(0, 0, 100, 100, "xx"), "should throw for invalid anchor");
  });

  it("throws on null anchor", () => {
    assert.throws(() => resolveAnchor(0, 0, 100, 100, null), "should throw for null anchor");
  });

  it("throws on empty string anchor", () => {
    assert.throws(() => resolveAnchor(0, 0, 100, 100, ""), "should throw for empty anchor");
  });

  it("throws on anchor that is too long", () => {
    assert.throws(() => resolveAnchor(0, 0, 100, 100, "tlx"), "should throw for too-long anchor");
  });

  it("throws on single-character anchor", () => {
    assert.throws(() => resolveAnchor(0, 0, 100, 100, "t"), "should throw for single-char anchor");
  });
});

// =============================================================================
// M1.3: CSS Property Filtering
// =============================================================================

describe("M1.3: filterStyle() — blocked properties", () => {
  it("blocks position-related properties", () => {
    const { filtered, warnings } = filterStyle({
      position: "relative",
      top: "10px",
      left: "20px",
      right: "30px",
      bottom: "40px",
    });
    assert.equal(Object.keys(filtered).length, 0, "no props should pass through");
    assert.equal(warnings.length, 5);
  });

  it("blocks sizing properties", () => {
    const { filtered, warnings } = filterStyle({
      width: "100px",
      height: "200px",
      minWidth: "50px",
      maxHeight: "500px",
    });
    assert.equal(Object.keys(filtered).length, 0);
    assert.equal(warnings.length, 4);
  });

  it("blocks flex properties", () => {
    const { filtered, warnings } = filterStyle({
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    });
    assert.equal(Object.keys(filtered).length, 0);
    assert.equal(warnings.length, 4);
  });

  it("blocks grid properties", () => {
    const { filtered, warnings } = filterStyle({
      gridTemplateColumns: "1fr 1fr",
      gridArea: "main",
    });
    assert.equal(Object.keys(filtered).length, 0);
    assert.equal(warnings.length, 2);
  });

  it("blocks float and clear", () => {
    const { warnings } = filterStyle({ float: "left", clear: "both" });
    assert.equal(warnings.length, 2);
  });

  it("blocks overflow properties", () => {
    const { warnings } = filterStyle({ overflow: "hidden", overflowX: "scroll" });
    assert.equal(warnings.length, 2);
  });

  it("blocks margin properties", () => {
    const { warnings } = filterStyle({ margin: "10px", marginTop: "20px" });
    assert.equal(warnings.length, 2);
  });

  it("blocks transform entirely", () => {
    const { filtered, warnings } = filterStyle({ transform: "rotate(45deg)" });
    assert.equal(filtered.transform, undefined, "transform should be removed");
    assert.equal(warnings.length, 1);
    assert.equal(warnings[0].property, "transform");
  });

  it("blocks vendor-prefixed layout properties", () => {
    const { filtered, warnings } = filterStyle({
      "-webkit-transform": "rotate(45deg)",
      "-webkit-flex-direction": "row",
      "-ms-flex-wrap": "wrap",
    });
    assert.equal(filtered.WebkitTransform, undefined, "vendor-prefixed transform should be blocked");
    assert.equal(filtered.WebkitFlexDirection, undefined, "vendor-prefixed flex-direction should be blocked");
    assert.equal(filtered.msFlexWrap, undefined, "vendor-prefixed flex-wrap should be blocked");
    assert.equal(warnings.length, 3);
  });

  it("allows vendor-prefixed non-layout properties", () => {
    const { filtered, warnings } = filterStyle({
      "-webkit-backdrop-filter": "blur(10px)",
      "-webkit-font-smoothing": "antialiased",
    });
    assert.equal(warnings.length, 0);
    assert.equal(filtered.WebkitBackdropFilter, "blur(10px)");
    assert.equal(filtered.WebkitFontSmoothing, "antialiased");
  });
});

describe("M1.3: filterStyle() — allowed properties", () => {
  it("passes through visual styling properties", () => {
    const { filtered, warnings } = filterStyle({
      background: "linear-gradient(135deg, #1a1a2e, #16213e)",
      borderRadius: "16px",
      boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
      border: "1px solid rgba(255,255,255,0.1)",
      backdropFilter: "blur(12px)",
      color: "#ffffff",
      opacity: "0.8",
    });
    assert.equal(warnings.length, 0, "no warnings for allowed props");
    assert.equal(filtered.background, "linear-gradient(135deg, #1a1a2e, #16213e)");
    assert.equal(filtered.borderRadius, "16px");
    assert.equal(filtered.boxShadow, "0 8px 32px rgba(0,0,0,0.3)");
    assert.equal(filtered.backdropFilter, "blur(12px)");
    assert.equal(filtered.color, "#ffffff");
  });

  it("passes through typography properties", () => {
    const { filtered, warnings } = filterStyle({
      fontFamily: "Inter",
      fontSize: "24px",
      fontWeight: "700",
      textDecoration: "underline",
      textTransform: "uppercase",
    });
    assert.equal(warnings.length, 0);
    assert.equal(filtered.fontFamily, "Inter");
    assert.equal(filtered.textTransform, "uppercase");
  });

  it("passes through transition and animation properties", () => {
    const { filtered, warnings } = filterStyle({
      transition: "all 0.3s ease",
      animationName: "fadeIn",
    });
    assert.equal(warnings.length, 0);
    assert.equal(filtered.transition, "all 0.3s ease");
  });

  it("passes through transformOrigin (only transform itself is blocked)", () => {
    const { filtered, warnings } = filterStyle({ transformOrigin: "center" });
    assert.equal(warnings.length, 0);
    assert.equal(filtered.transformOrigin, "center");
  });
});

describe("M1.3: filterStyle() — camelCase normalization", () => {
  it("normalizes kebab-case to camelCase", () => {
    const { filtered, warnings } = filterStyle({
      "background-color": "#1a1a2e",
      "border-radius": "12px",
      "text-shadow": "0 2px 20px rgba(0,0,0,0.5)",
    });
    assert.equal(warnings.length, 0);
    assert.equal(filtered.backgroundColor, "#1a1a2e");
    assert.equal(filtered.borderRadius, "12px");
    assert.equal(filtered.textShadow, "0 2px 20px rgba(0,0,0,0.5)");
  });

  it("blocks kebab-case blocked properties after normalization", () => {
    const { warnings } = filterStyle({
      "flex-direction": "row",
      "margin-top": "10px",
      "grid-template-columns": "1fr 1fr",
    });
    assert.equal(warnings.length, 3);
    assert.equal(warnings[0].property, "flexDirection");
    assert.equal(warnings[0].originalProperty, "flex-direction");
  });

  it("preserves CSS custom properties (--variables)", () => {
    const { filtered, warnings } = filterStyle({
      "--accent-color": "#7c5cbf",
      "--card-bg": "rgba(255,255,255,0.06)",
    });
    assert.equal(warnings.length, 0);
    assert.equal(filtered["--accent-color"], "#7c5cbf");
    assert.equal(filtered["--card-bg"], "rgba(255,255,255,0.06)");
  });

  it("handles already-camelCase properties correctly", () => {
    const { filtered, warnings } = filterStyle({
      backgroundColor: "#000",
      boxShadow: "none",
    });
    assert.equal(warnings.length, 0);
    assert.equal(filtered.backgroundColor, "#000");
  });
});

describe("M1.3: filterStyle() — convenience props", () => {
  it("maps color convenience prop to CSS color", () => {
    const { filtered } = filterStyle({}, "text", { color: "#fff" });
    assert.equal(filtered.color, "#fff");
  });

  it("maps font convenience prop to fontFamily", () => {
    const { filtered } = filterStyle({}, "text", { font: "Space Grotesk" });
    assert.equal(filtered.fontFamily, "Space Grotesk");
  });

  it("maps size convenience prop to fontSize with px suffix", () => {
    const { filtered } = filterStyle({}, "text", { size: 48 });
    assert.equal(filtered.fontSize, "48px");
  });

  it("maps weight convenience prop to fontWeight as string", () => {
    const { filtered } = filterStyle({}, "text", { weight: 700 });
    assert.equal(filtered.fontWeight, "700");
  });

  it("maps fill convenience prop to background", () => {
    const { filtered } = filterStyle({}, "rect", { fill: "#1a1a2e" });
    assert.equal(filtered.background, "#1a1a2e");
  });

  it("maps radius convenience prop to borderRadius with px suffix", () => {
    const { filtered } = filterStyle({}, "rect", { radius: 12 });
    assert.equal(filtered.borderRadius, "12px");
  });

  it("maps border convenience prop to CSS border", () => {
    const { filtered } = filterStyle({}, "rect", { border: "1px solid #fff" });
    assert.equal(filtered.border, "1px solid #fff");
  });

  it("maps align convenience prop to textAlign", () => {
    const { filtered } = filterStyle({}, "text", { align: "center" });
    assert.equal(filtered.textAlign, "center");
  });

  it("maps lineHeight convenience prop", () => {
    const { filtered } = filterStyle({}, "text", { lineHeight: 1.5 });
    assert.equal(filtered.lineHeight, 1.5);
  });

  it("maps letterSpacing convenience prop", () => {
    const { filtered } = filterStyle({}, "text", { letterSpacing: "0.05em" });
    assert.equal(filtered.letterSpacing, "0.05em");
  });

  it("style object overrides convenience props on conflict", () => {
    const { filtered } = filterStyle(
      { color: "red" },  // style
      "text",
      { color: "blue" }  // convenience prop
    );
    // style wins over convenience
    assert.equal(filtered.color, "red");
  });

  it("convenience props and style merge without conflict", () => {
    const { filtered } = filterStyle(
      { boxShadow: "0 4px 12px rgba(0,0,0,0.3)" },
      "text",
      { color: "#fff", size: 32 }
    );
    assert.equal(filtered.color, "#fff");
    assert.equal(filtered.fontSize, "32px");
    assert.equal(filtered.boxShadow, "0 4px 12px rgba(0,0,0,0.3)");
  });
});

describe("M1.3: filterStyle() — empty/edge cases", () => {
  it("returns empty filtered and no warnings for empty style", () => {
    const { filtered, warnings } = filterStyle({});
    assert.deepEqual(filtered, {});
    assert.equal(warnings.length, 0);
  });

  it("handles undefined style input", () => {
    const { filtered, warnings } = filterStyle(undefined);
    assert.deepEqual(filtered, {});
    assert.equal(warnings.length, 0);
  });
});

describe("M1.3: filterStyle() — warning structure", () => {
  it("warning includes required fields", () => {
    const { warnings } = filterStyle({ display: "flex" });
    assert.equal(warnings.length, 1);
    assert.equal(warnings[0].type, "blocked_css_property");
    assert.equal(warnings[0].property, "display");
    assert.equal(warnings[0].value, "flex");
    assert.ok(warnings[0].suggestion, "should have a suggestion");
  });

  it("warning includes originalProperty for kebab-case input", () => {
    const { warnings } = filterStyle({ "flex-direction": "row" });
    assert.equal(warnings[0].originalProperty, "flex-direction");
    assert.equal(warnings[0].property, "flexDirection");
  });
});

// =============================================================================
// M1.5: Init Function
// =============================================================================

describe("M1.5: init()", () => {
  it("stores default config when called with no arguments", async () => {
    _resetForTests();
    await init();
    const cfg = getConfig();
    assert.equal(cfg.slide.w, 1920);
    assert.equal(cfg.slide.h, 1080);
    assert.equal(cfg.safeZone.left, 120);
    assert.equal(cfg.safeZone.right, 120);
    assert.equal(cfg.safeZone.top, 90);
    assert.equal(cfg.safeZone.bottom, 90);
    assert.equal(cfg.strict, false);
    assert.equal(cfg.minFontSize, 24);
  });

  it("merges custom slide dimensions", async () => {
    _resetForTests();
    await init({ slide: { w: 3840, h: 2160 } });
    const cfg = getConfig();
    assert.equal(cfg.slide.w, 3840);
    assert.equal(cfg.slide.h, 2160);
  });

  it("merges custom safe zone margins", async () => {
    _resetForTests();
    await init({ safeZone: { left: 200, right: 200, top: 100, bottom: 100 } });
    const cfg = getConfig();
    assert.equal(cfg.safeZone.left, 200);
    assert.equal(cfg.safeZone.right, 200);
  });

  it("stores strict mode", async () => {
    _resetForTests();
    await init({ strict: true });
    assert.equal(getConfig().strict, true);
  });

  it("stores custom minFontSize", async () => {
    _resetForTests();
    await init({ minFontSize: 18 });
    assert.equal(getConfig().minFontSize, 18);
  });

  it("stores fonts array", async () => {
    _resetForTests();
    const fonts = [{ family: "Inter", weights: [400, 700] }];
    await init({ fonts });
    const cfg = getConfig();
    assert.equal(cfg.fonts.length, 1);
    assert.equal(cfg.fonts[0].family, "Inter");
  });

  it("returns a promise", async () => {
    _resetForTests();
    const result = init();
    assert.ok(result instanceof Promise, "init() should return a Promise");
    await result;
  });

  it("throws on invalid safeZone (margins larger than slide)", async () => {
    _resetForTests();
    let threw = false;
    try {
      await init({ slide: { w: 100, h: 100 }, safeZone: { left: 60, right: 60, top: 10, bottom: 10 } });
    } catch (e) {
      threw = true;
    }
    assert.ok(threw, "should throw when safe rect has negative width");
  });
});

describe("M1.5: safeRect()", () => {
  it("throws when called before init()", () => {
    _resetForTests();
    assert.throws(() => safeRect(), "safeRect should throw before init");
  });

  it("computes correctly from default config", async () => {
    _resetForTests();
    await init();
    const sr = safeRect();
    assert.equal(sr.x, 120);
    assert.equal(sr.y, 90);
    assert.equal(sr.w, 1680); // 1920 - 120 - 120
    assert.equal(sr.h, 900);  // 1080 - 90 - 90
  });

  it("computes correctly from custom config", async () => {
    _resetForTests();
    await init({
      slide: { w: 1920, h: 1080 },
      safeZone: { left: 200, right: 200, top: 150, bottom: 150 },
    });
    const sr = safeRect();
    assert.equal(sr.x, 200);
    assert.equal(sr.y, 150);
    assert.equal(sr.w, 1520); // 1920 - 200 - 200
    assert.equal(sr.h, 780);  // 1080 - 150 - 150
  });

  it("returns a copy (mutation does not affect cached value)", async () => {
    _resetForTests();
    await init();
    const sr1 = safeRect();
    sr1.x = 9999;
    const sr2 = safeRect();
    assert.equal(sr2.x, 120, "cached value should not be mutated");
  });
});

describe("M1.5: getConfig()", () => {
  it("returns null before init()", () => {
    _resetForTests();
    assert.equal(getConfig(), null);
  });

  it("returns a deep copy (mutations don't affect internal state)", async () => {
    _resetForTests();
    await init({ fonts: [{ family: "Inter", weights: [400] }] });
    const cfg = getConfig();
    cfg.slide.w = 9999;
    cfg.safeZone.left = 9999;
    cfg.fonts.push({ family: "Fake" });
    cfg.fonts[0].family = "Changed";

    const cfg2 = getConfig();
    assert.equal(cfg2.slide.w, 1920, "slide should not be mutated");
    assert.equal(cfg2.safeZone.left, 120, "safeZone should not be mutated");
    assert.equal(cfg2.fonts.length, 1, "fonts array should not be mutated");
    assert.equal(cfg2.fonts[0].family, "Inter", "font objects should not be mutated");
  });

  it("deep copies font weights arrays", async () => {
    _resetForTests();
    await init({ fonts: [{ family: "Inter", weights: [400, 700] }] });
    const cfg = getConfig();
    cfg.fonts[0].weights.push(900);
    const cfg2 = getConfig();
    assert.equal(cfg2.fonts[0].weights.length, 2, "weights array should not be mutated");
  });
});

// SlideKit Tests — Core Element Model, Anchors, CSS Filtering, Init

import { describe, it, assert } from './test-runner.js';
import {
  el, group,
  resolveAnchor, filterStyle,
  init, safeRect, getConfig, resetIdCounter, _resetForTests,
} from '../slidekit.js';

// =============================================================================
// el() factory
// =============================================================================

describe("el() — object shape", () => {
  it("returns correct structure", () => {
    resetIdCounter();
    const e = el('<p>Hello</p>', { x: 100, y: 200, w: 800 });
    assert.equal(e.type, "el");
    assert.equal(e.content, "<p>Hello</p>");
    assert.equal(e.props.x, 100);
    assert.equal(e.props.y, 200);
    assert.equal(e.props.w, 800);
  });

  it("applies common defaults", () => {
    resetIdCounter();
    const e = el('<p>Hi</p>');
    assert.equal(e.props.x, 0);
    assert.equal(e.props.y, 0);
    assert.equal(e.props.anchor, "tl");
    assert.equal(e.props.layer, "content");
    assert.equal(e.props.opacity, 1);
    assert.equal(e.props.className, "");
    assert.deepEqual(e.props.style, {});
  });

  it("applies el-specific default: overflow visible", () => {
    resetIdCounter();
    const e = el('<p>Hi</p>');
    assert.equal(e.props.overflow, "visible");
  });

  it("preserves user-provided props over defaults", () => {
    resetIdCounter();
    const e = el('<p>Hi</p>', { anchor: "cc", layer: "overlay", overflow: "clip" });
    assert.equal(e.props.anchor, "cc");
    assert.equal(e.props.layer, "overlay");
    assert.equal(e.props.overflow, "clip");
  });

  it("does not include id in props", () => {
    resetIdCounter();
    const e = el('<p>Hi</p>', { id: "my-el" });
    assert.equal(e.id, "my-el");
    assert.equal(e.props.id, undefined, "id should not be in props");
  });

  it("passes through extra user props not in defaults", () => {
    resetIdCounter();
    const e = el('<p>Hi</p>', { w: 400, h: 200, rotate: 45 });
    assert.equal(e.props.w, 400);
    assert.equal(e.props.h, 200);
    assert.equal(e.props.rotate, 45);
  });

  it("handles empty string content", () => {
    resetIdCounter();
    const e = el('');
    assert.equal(e.content, "");
    assert.equal(e.type, "el");
  });

  it("stores container style in props", () => {
    resetIdCounter();
    const e = el('', { style: { background: "#1a1a2e", borderRadius: "12px" } });
    assert.equal(e.props.style.background, "#1a1a2e");
    assert.equal(e.props.style.borderRadius, "12px");
  });

  it("stores className in props", () => {
    resetIdCounter();
    const e = el('<p>Hi</p>', { className: "card accent" });
    assert.equal(e.props.className, "card accent");
  });
});

describe("group() — with el() children", () => {
  it("returns correct object shape with children", () => {
    resetIdCounter();
    const child1 = el('', { w: 100, h: 100 });
    const child2 = el('<p>Hi</p>', { w: 100 });
    const g = group([child1, child2], { x: 50, y: 50 });
    assert.equal(g.type, "group");
    assert.equal(g.children.length, 2);
    assert.equal(g.children[0].type, "el");
    assert.equal(g.children[1].type, "el");
    assert.equal(g.props.x, 50);
  });

  it("applies group-specific defaults", () => {
    resetIdCounter();
    const g = group([]);
    assert.equal(g.props.scale, 1);
    assert.equal(g.props.clip, false);
  });
});

describe("Auto-generated IDs", () => {
  it("generates sequential IDs starting from sk-1", () => {
    resetIdCounter();
    const e1 = el('<p>A</p>');
    const e2 = el('');
    const e3 = el('<img src="x.jpg">');
    assert.equal(e1.id, "sk-1");
    assert.equal(e2.id, "sk-2");
    assert.equal(e3.id, "sk-3");
  });

  it("produces deterministic IDs after reset", () => {
    resetIdCounter();
    const firstRun = [el('<p>A</p>').id, el('').id, el('<img>').id];
    resetIdCounter();
    const secondRun = [el('<p>A</p>').id, el('').id, el('<img>').id];
    assert.deepEqual(firstRun, secondRun, "IDs should be deterministic across calls");
  });

  it("user-provided id overrides auto-generated", () => {
    resetIdCounter();
    const e1 = el('<p>A</p>');
    const e2 = el('<p>B</p>', { id: "my-id" });
    const e3 = el('<p>C</p>');
    assert.equal(e1.id, "sk-1");
    assert.equal(e2.id, "my-id");
    assert.equal(e3.id, "sk-2");
  });

  it("el and group get unique sequential IDs", () => {
    resetIdCounter();
    const ids = [
      el('<p>A</p>').id,
      el('').id,
      el('<img>').id,
      group([]).id,
    ];
    assert.deepEqual(ids, ["sk-1", "sk-2", "sk-3", "sk-4"]);
  });
});

describe("Style isolation", () => {
  it("each element gets its own style object (no shared reference)", () => {
    resetIdCounter();
    const e1 = el('<p>A</p>');
    const e2 = el('<p>B</p>');
    assert.ok(e1.props.style !== e2.props.style, "style objects should be different references");
    e1.props.style.color = "red";
    assert.equal(e2.props.style.color, undefined);
  });
});

// =============================================================================
// Anchor Resolution
// =============================================================================

describe("resolveAnchor()", () => {
  const x = 100, y = 200, w = 400, h = 300;

  it("tl — top-left: left=x, top=y", () => {
    const r = resolveAnchor(x, y, w, h, "tl");
    assert.equal(r.left, 100);
    assert.equal(r.top, 200);
  });

  it("tc — top-center: left=x-w/2, top=y", () => {
    const r = resolveAnchor(x, y, w, h, "tc");
    assert.equal(r.left, -100);
    assert.equal(r.top, 200);
  });

  it("tr — top-right: left=x-w, top=y", () => {
    const r = resolveAnchor(x, y, w, h, "tr");
    assert.equal(r.left, -300);
    assert.equal(r.top, 200);
  });

  it("cl — center-left: left=x, top=y-h/2", () => {
    const r = resolveAnchor(x, y, w, h, "cl");
    assert.equal(r.left, 100);
    assert.equal(r.top, 50);
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
    assert.equal(r.top, -100);
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
    assert.equal(r.left, 360);
    assert.equal(r.top, 490);
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
// CSS Property Filtering
// =============================================================================

describe("filterStyle() — blocked properties", () => {
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

  it("blocks display", () => {
    const { filtered, warnings } = filterStyle({ display: "flex" });
    assert.equal(Object.keys(filtered).length, 0);
    assert.equal(warnings.length, 1);
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

  it("blocks translate, rotate, scale properties", () => {
    const { filtered, warnings } = filterStyle({
      translate: "10px 20px",
      rotate: "45deg",
      scale: "1.5",
    });
    assert.equal(Object.keys(filtered).length, 0);
    assert.equal(warnings.length, 3);
  });

  it("blocks contain and contentVisibility", () => {
    const { warnings } = filterStyle({
      contain: "layout",
      contentVisibility: "auto",
    });
    assert.equal(warnings.length, 2);
  });

  it("blocks inset properties", () => {
    const { warnings } = filterStyle({
      inset: "0",
      insetBlock: "10px",
      insetInline: "20px",
    });
    assert.equal(warnings.length, 3);
  });

  it("blocks logical sizing properties", () => {
    const { warnings } = filterStyle({
      blockSize: "100px",
      inlineSize: "200px",
      minBlockSize: "50px",
      maxInlineSize: "400px",
    });
    assert.equal(warnings.length, 4);
  });

  it("blocks all margin variants", () => {
    const { warnings } = filterStyle({
      marginBlock: "10px",
      marginBlockStart: "5px",
      marginInline: "20px",
      marginInlineEnd: "15px",
    });
    assert.equal(warnings.length, 4);
  });

  it("blocks vendor-prefixed layout properties", () => {
    const { filtered, warnings } = filterStyle({
      "-webkit-transform": "rotate(45deg)",
    });
    assert.equal(filtered.WebkitTransform, undefined, "vendor-prefixed transform should be blocked");
    assert.equal(warnings.length, 1);
  });
});

describe("filterStyle() — allowed properties", () => {
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

  it("passes through typography properties (no longer blocked)", () => {
    const { filtered, warnings } = filterStyle({
      fontFamily: "Inter, sans-serif",
      fontSize: "24px",
      fontWeight: "700",
      fontStyle: "italic",
      lineHeight: "1.5",
      letterSpacing: "0.05em",
      wordSpacing: "4px",
    });
    assert.equal(warnings.length, 0, "typography props should pass through");
    assert.equal(filtered.fontFamily, "Inter, sans-serif");
    assert.equal(filtered.fontSize, "24px");
    assert.equal(filtered.fontWeight, "700");
    assert.equal(filtered.fontStyle, "italic");
    assert.equal(filtered.lineHeight, "1.5");
    assert.equal(filtered.letterSpacing, "0.05em");
  });

  it("passes through text layout properties (no longer blocked)", () => {
    const { filtered, warnings } = filterStyle({
      textTransform: "uppercase",
      textIndent: "2em",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      wordBreak: "break-all",
    });
    assert.equal(warnings.length, 0, "text layout props should pass through");
    assert.equal(filtered.textTransform, "uppercase");
    assert.equal(filtered.whiteSpace, "nowrap");
  });

  it("passes through padding properties (no longer blocked)", () => {
    const { filtered, warnings } = filterStyle({
      padding: "24px",
      paddingTop: "12px",
      paddingRight: "16px",
    });
    assert.equal(warnings.length, 0, "padding should pass through");
    assert.equal(filtered.padding, "24px");
  });

  it("passes through flex properties (no longer blocked)", () => {
    const { filtered, warnings } = filterStyle({
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    });
    assert.equal(warnings.length, 0, "flex props should pass through");
    assert.equal(filtered.flexDirection, "row");
  });

  it("passes through grid properties (no longer blocked)", () => {
    const { filtered, warnings } = filterStyle({
      gridTemplateColumns: "1fr 1fr",
      gridArea: "main",
    });
    assert.equal(warnings.length, 0, "grid props should pass through");
    assert.equal(filtered.gridTemplateColumns, "1fr 1fr");
  });

  it("passes through text decoration and shadow", () => {
    const { filtered, warnings } = filterStyle({
      textDecoration: "underline",
      textShadow: "0 2px 4px rgba(0,0,0,0.5)",
    });
    assert.equal(warnings.length, 0);
    assert.equal(filtered.textDecoration, "underline");
    assert.equal(filtered.textShadow, "0 2px 4px rgba(0,0,0,0.5)");
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

  it("passes through vendor-prefixed non-layout properties", () => {
    const { filtered, warnings } = filterStyle({
      "-webkit-backdrop-filter": "blur(10px)",
      "-webkit-font-smoothing": "antialiased",
    });
    assert.equal(warnings.length, 0);
    assert.equal(filtered.WebkitBackdropFilter, "blur(10px)");
    assert.equal(filtered.WebkitFontSmoothing, "antialiased");
  });
});

describe("filterStyle() — camelCase normalization", () => {
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
      "margin-top": "10px",
    });
    assert.equal(warnings.length, 1);
    assert.equal(warnings[0].property, "marginTop");
    assert.equal(warnings[0].originalProperty, "margin-top");
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

describe("filterStyle() — empty/edge cases", () => {
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

describe("filterStyle() — warning structure", () => {
  it("warning includes required fields", () => {
    const { warnings } = filterStyle({ display: "flex" });
    assert.equal(warnings.length, 1);
    assert.equal(warnings[0].type, "blocked_css_property");
    assert.equal(warnings[0].property, "display");
    assert.equal(warnings[0].value, "flex");
    assert.ok(warnings[0].suggestion, "should have a suggestion");
  });

  it("warning includes originalProperty for kebab-case input", () => {
    const { warnings } = filterStyle({ "margin-top": "10px" });
    assert.equal(warnings[0].originalProperty, "margin-top");
    assert.equal(warnings[0].property, "marginTop");
  });
});

// =============================================================================
// Init Function
// =============================================================================

describe("init()", () => {
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

describe("safeRect()", () => {
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
    assert.equal(sr.w, 1680);
    assert.equal(sr.h, 900);
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
    assert.equal(sr.w, 1520);
    assert.equal(sr.h, 780);
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

describe("getConfig()", () => {
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

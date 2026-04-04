// slidekit/dist/slidekit.bundle.js
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
function initialState() {
  return {
    debugOverlay: null,
    keyboardListenerAttached: false,
    lastToggleOptions: {},
    debugMode: 0,
    inspectorPanel: null,
    selectedElementId: null,
    selectedConstraint: null,
    clickHandlerAttached: false,
    currentSlideIndex: 0,
    panelWidth: 380,
    resizeState: null,
    revealContainer: null,
    wasEmbedded: false,
    editingPropKey: null,
    editInputElement: null,
    undoStack: [],
    redoStack: [],
    dragInProgress: false,
    pickMode: null,
    hiddenElementIds: /* @__PURE__ */ new Set(),
    hiddenLayers: /* @__PURE__ */ new Set(),
    elementListExpanded: false,
    baselineSceneGraphs: {}
  };
}
function createDebugState() {
  const listeners = /* @__PURE__ */ new Set();
  const s = initialState();
  return {
    state: s,
    callbacks: {},
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    notify() {
      for (const fn of listeners) fn();
    },
    reset() {
      Object.assign(s, initialState());
    }
  };
}
var debugController;
var init_debug_state = __esm({
  "slidekit/src/debug-state.ts"() {
    "use strict";
    debugController = createDebugState();
  }
});
function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function badge(text, color) {
  return `<span style="display:inline-block;padding:1px 6px;border-radius:3px;font-size:10px;font-weight:600;background:${color};color:#fff;margin-left:4px;">${escapeHtml(text)}</span>`;
}
var TYPE_COLORS;
var TYPE_BORDER_COLORS;
var PROVENANCE_COLORS;
var TYPE_BADGE_COLORS;
var init_debug_inspector_styles = __esm({
  "slidekit/src/debug-inspector-styles.ts"() {
    "use strict";
    TYPE_COLORS = {
      text: "rgba(66, 133, 244, 0.3)",
      // blue
      image: "rgba(52, 168, 83, 0.3)",
      // green
      rect: "rgba(251, 188, 4, 0.3)",
      // orange
      rule: "rgba(234, 67, 53, 0.3)",
      // red
      group: "rgba(124, 92, 191, 0.3)",
      // purple
      vstack: "rgba(124, 92, 191, 0.3)",
      // purple
      hstack: "rgba(124, 92, 191, 0.3)",
      // purple
      connector: "rgba(0, 188, 212, 0.3)",
      // teal
      panel: "rgba(124, 92, 191, 0.3)"
      // purple
    };
    TYPE_BORDER_COLORS = {
      text: "rgba(66, 133, 244, 0.8)",
      image: "rgba(52, 168, 83, 0.8)",
      rect: "rgba(251, 188, 4, 0.8)",
      rule: "rgba(234, 67, 53, 0.8)",
      group: "rgba(124, 92, 191, 0.8)",
      vstack: "rgba(124, 92, 191, 0.8)",
      hstack: "rgba(124, 92, 191, 0.8)",
      connector: "rgba(0, 188, 212, 0.8)",
      panel: "rgba(124, 92, 191, 0.8)"
    };
    PROVENANCE_COLORS = {
      authored: "#34a853",
      // green
      constraint: "#ff8c32",
      // orange
      stack: "#a078ff",
      // purple
      measured: "#4285f4",
      // blue
      transform: "#fbc02d",
      // yellow
      default: "#999"
      // gray
    };
    TYPE_BADGE_COLORS = {
      el: "#4285f4",
      text: "#4285f4",
      image: "#34a853",
      rect: "#fbc004",
      rule: "#ea4335",
      group: "#7c5cbf",
      vstack: "#7c5cbf",
      hstack: "#7c5cbf",
      connector: "#00bcd4",
      panel: "#7c5cbf"
    };
  }
});
function isElementHidden(id, sceneEl) {
  const s = debugController.state;
  if (s.hiddenElementIds.has(id)) return true;
  const layer = sceneEl.authored?.props?.layer || "content";
  return s.hiddenLayers.has(layer);
}
function absoluteBounds(sceneEl, allElements) {
  const r = sceneEl.resolved;
  if (!sceneEl.parentId) return r;
  let offsetX = 0;
  let offsetY = 0;
  let current = sceneEl;
  while (current?.parentId) {
    const parent = allElements[current.parentId];
    if (!parent) break;
    if (parent.type === "group") {
      const parentAbs = absoluteBounds(parent, allElements);
      offsetX += parentAbs.x;
      offsetY += parentAbs.y;
      break;
    }
    current = parent;
  }
  return { x: r.x + offsetX, y: r.y + offsetY, w: r.w, h: r.h };
}
function getAnchorPosition(bounds, anchor) {
  const row = anchor && anchor[0] || "t";
  const col = anchor && anchor[1] || "l";
  let px, py;
  if (col === "l") px = bounds.x;
  else if (col === "c") px = bounds.x + bounds.w / 2;
  else px = bounds.x + bounds.w;
  if (row === "t") py = bounds.y;
  else if (row === "c") py = bounds.y + bounds.h / 2;
  else py = bounds.y + bounds.h;
  return { x: px, y: py };
}
function createSafeZoneOverlay(sk) {
  let safeX = 120, safeY = 90, safeW = 1680, safeH = 900;
  try {
    if (sk._config) {
      const cfg = sk._config;
      const sz = cfg.safeZone || { left: 120, right: 120, top: 90, bottom: 90 };
      const sl = cfg.slide || { w: 1920, h: 1080 };
      safeX = sz.left;
      safeY = sz.top;
      safeW = sl.w - sz.left - sz.right;
      safeH = sl.h - sz.top - sz.bottom;
    }
  } catch (_e) {
  }
  const el2 = document.createElement("div");
  el2.setAttribute("data-sk-debug", "safe-zone");
  el2.style.position = "absolute";
  el2.style.left = `${safeX}px`;
  el2.style.top = `${safeY}px`;
  el2.style.width = `${safeW}px`;
  el2.style.height = `${safeH}px`;
  el2.style.border = "2px dashed rgba(255, 255, 0, 0.6)";
  el2.style.boxSizing = "border-box";
  el2.style.pointerEvents = "none";
  return el2;
}
function extractRelationshipEdges(sceneElements) {
  const edges = [];
  const seenKeys = /* @__PURE__ */ new Set();
  for (const [id, sceneEl] of Object.entries(sceneElements)) {
    const prov = sceneEl.provenance;
    if (!prov) continue;
    for (const axis of ["x", "y"]) {
      let p = prov[axis];
      if (!p) continue;
      if (p.source === "transform" && p.original && typeof p.original === "object" && "source" in p.original) {
        p = p.original;
      }
      if (p.source === "constraint" && p.ref && p.sourceAnchor && p.targetAnchor) {
        if (p.type === "centerIn") continue;
        const key = `${p.ref}->${id}:${p.type}:${axis}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          edges.push({
            fromId: p.ref,
            toId: id,
            type: p.type || "constraint",
            sourceAnchor: p.sourceAnchor,
            targetAnchor: p.targetAnchor,
            gap: p.gap,
            isStack: false,
            axis
          });
        }
      } else if (p.source === "stack" && p.stackId && p.sourceAnchor && p.targetAnchor) {
        const key = `${p.stackId}->${id}:stack`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          edges.push({
            fromId: p.stackId,
            toId: id,
            type: "stack",
            sourceAnchor: p.sourceAnchor,
            targetAnchor: p.targetAnchor,
            isStack: true
          });
        }
      }
    }
  }
  return edges;
}
function buildRelationshipSVG(sceneElements, slideW, slideH) {
  const edges = extractRelationshipEdges(sceneElements);
  if (edges.length === 0) return null;
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("width", String(slideW));
  svg.setAttribute("height", String(slideH));
  svg.setAttribute("data-sk-debug", "relationships");
  svg.style.position = "absolute";
  svg.style.left = "0";
  svg.style.top = "0";
  svg.style.pointerEvents = "none";
  svg.style.overflow = "visible";
  const defs = document.createElementNS(NS, "defs");
  const constraintMarker = document.createElementNS(NS, "marker");
  constraintMarker.setAttribute("id", "sk-debug-arrow-constraint");
  constraintMarker.setAttribute("viewBox", "0 0 10 7");
  constraintMarker.setAttribute("refX", "10");
  constraintMarker.setAttribute("refY", "3.5");
  constraintMarker.setAttribute("markerWidth", "8");
  constraintMarker.setAttribute("markerHeight", "6");
  constraintMarker.setAttribute("orient", "auto-start-reverse");
  const cPath = document.createElementNS(NS, "path");
  cPath.setAttribute("d", "M 0 0 L 10 3.5 L 0 7 z");
  cPath.setAttribute("fill", "rgba(255, 140, 50, 0.85)");
  constraintMarker.appendChild(cPath);
  defs.appendChild(constraintMarker);
  const stackMarker = document.createElementNS(NS, "marker");
  stackMarker.setAttribute("id", "sk-debug-arrow-stack");
  stackMarker.setAttribute("viewBox", "0 0 10 7");
  stackMarker.setAttribute("refX", "10");
  stackMarker.setAttribute("refY", "3.5");
  stackMarker.setAttribute("markerWidth", "8");
  stackMarker.setAttribute("markerHeight", "6");
  stackMarker.setAttribute("orient", "auto-start-reverse");
  const sPath = document.createElementNS(NS, "path");
  sPath.setAttribute("d", "M 0 0 L 10 3.5 L 0 7 z");
  sPath.setAttribute("fill", "rgba(160, 120, 255, 0.7)");
  stackMarker.appendChild(sPath);
  defs.appendChild(stackMarker);
  svg.appendChild(defs);
  for (const edge of edges) {
    const fromEl = sceneElements[edge.fromId];
    const toEl = sceneElements[edge.toId];
    if (!fromEl?.resolved || !toEl?.resolved) continue;
    const fromPt = getAnchorPosition(absoluteBounds(fromEl, sceneElements), edge.sourceAnchor);
    const toPt = getAnchorPosition(absoluteBounds(toEl, sceneElements), edge.targetAnchor);
    const color = edge.isStack ? "rgba(160, 120, 255, 0.7)" : "rgba(255, 140, 50, 0.85)";
    const markerId = edge.isStack ? "sk-debug-arrow-stack" : "sk-debug-arrow-constraint";
    if (!edge.isStack && edge.axis) {
      const hit = document.createElementNS(NS, "line");
      hit.setAttribute("x1", String(fromPt.x));
      hit.setAttribute("y1", String(fromPt.y));
      hit.setAttribute("x2", String(toPt.x));
      hit.setAttribute("y2", String(toPt.y));
      hit.setAttribute("stroke", "transparent");
      hit.setAttribute("stroke-width", "12");
      hit.setAttribute("pointer-events", "stroke");
      hit.setAttribute("cursor", "pointer");
      hit.setAttribute("data-sk-debug", "rel-hit");
      hit.setAttribute("data-sk-debug-element", edge.toId);
      hit.setAttribute("data-sk-debug-axis", edge.axis);
      svg.appendChild(hit);
    }
    const line = document.createElementNS(NS, "line");
    line.setAttribute("x1", String(fromPt.x));
    line.setAttribute("y1", String(fromPt.y));
    line.setAttribute("x2", String(toPt.x));
    line.setAttribute("y2", String(toPt.y));
    line.setAttribute("stroke", color);
    line.setAttribute("stroke-width", "1.5");
    line.setAttribute("marker-end", `url(#${markerId})`);
    line.setAttribute("data-sk-debug", "rel-arrow");
    line.setAttribute("data-sk-debug-from", edge.fromId);
    line.setAttribute("data-sk-debug-to", edge.toId);
    if (edge.axis) line.setAttribute("data-sk-debug-axis", edge.axis);
    if (edge.isStack) {
      line.setAttribute("stroke-dasharray", "6 3");
    }
    svg.appendChild(line);
    const midX = (fromPt.x + toPt.x) / 2;
    const midY = (fromPt.y + toPt.y) / 2;
    const labelText = edge.gap !== void 0 ? `${edge.type} ${edge.gap}px` : edge.type;
    const bgRect = document.createElementNS(NS, "rect");
    const textWidth = labelText.length * 6 + 6;
    bgRect.setAttribute("x", String(midX - textWidth / 2));
    bgRect.setAttribute("y", String(midY - 7));
    bgRect.setAttribute("width", String(textWidth));
    bgRect.setAttribute("height", "14");
    bgRect.setAttribute("rx", "2");
    bgRect.setAttribute("fill", "rgba(0, 0, 0, 0.75)");
    svg.appendChild(bgRect);
    const text = document.createElementNS(NS, "text");
    text.setAttribute("x", String(midX));
    text.setAttribute("y", String(midY + 3));
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("fill", color);
    text.setAttribute("font-size", "10");
    text.setAttribute("font-family", "monospace");
    text.setAttribute("data-sk-debug", "rel-label");
    text.textContent = labelText;
    svg.appendChild(text);
  }
  return svg;
}
function buildOverlayContent(overlay, sceneElements, collisions, sk, slideW, slideH, options) {
  const showBoxes = options.showBoxes !== false;
  const showSafeZone = options.showSafeZone !== false;
  const showIds = options.showIds !== false;
  const showAnchors = options.showAnchors !== false;
  const showCollisions = options.showCollisions !== false;
  const showRelationships = options.showRelationships !== false;
  if (showSafeZone) {
    const safeZoneEl = createSafeZoneOverlay(sk);
    if (safeZoneEl) overlay.appendChild(safeZoneEl);
  }
  if (showBoxes) {
    const MIN_BOX = 8;
    for (const [id, sceneEl] of Object.entries(sceneElements)) {
      if (!sceneEl.resolved) continue;
      if (isElementHidden(id, sceneEl)) continue;
      const abs = absoluteBounds(sceneEl, sceneElements);
      let bx = abs.x, by = abs.y;
      let bw = abs.w, bh = abs.h;
      if (bw < MIN_BOX) {
        bx -= (MIN_BOX - bw) / 2;
        bw = MIN_BOX;
      }
      if (bh < MIN_BOX) {
        by -= (MIN_BOX - bh) / 2;
        bh = MIN_BOX;
      }
      const boxEl = document.createElement("div");
      boxEl.setAttribute("data-sk-debug", "box");
      boxEl.setAttribute("data-sk-debug-id", id);
      boxEl.style.position = "absolute";
      boxEl.style.left = `${bx}px`;
      boxEl.style.top = `${by}px`;
      boxEl.style.width = `${bw}px`;
      boxEl.style.height = `${bh}px`;
      boxEl.style.background = TYPE_COLORS[sceneEl.type] || "rgba(128, 128, 128, 0.3)";
      boxEl.style.border = `1px solid ${TYPE_BORDER_COLORS[sceneEl.type] || "rgba(128, 128, 128, 0.8)"}`;
      boxEl.style.boxSizing = "border-box";
      boxEl.style.pointerEvents = "none";
      overlay.appendChild(boxEl);
    }
  }
  if (showIds) {
    for (const [id, sceneEl] of Object.entries(sceneElements)) {
      if (!sceneEl.resolved) continue;
      if (isElementHidden(id, sceneEl)) continue;
      const abs = absoluteBounds(sceneEl, sceneElements);
      const anchor = sceneEl.authored?.props?.anchor || "tl";
      const anchorPos = getAnchorPosition(abs, anchor);
      const labelEl = document.createElement("div");
      labelEl.setAttribute("data-sk-debug", "id-label");
      labelEl.setAttribute("data-sk-debug-id", id);
      labelEl.style.position = "absolute";
      labelEl.style.left = `${anchorPos.x}px`;
      labelEl.style.top = `${anchorPos.y}px`;
      labelEl.style.transform = "translate(-50%, -100%)";
      labelEl.style.background = "rgba(0, 0, 0, 0.8)";
      labelEl.style.color = "#fff";
      labelEl.style.fontSize = "10px";
      labelEl.style.fontFamily = "monospace";
      labelEl.style.padding = "1px 4px";
      labelEl.style.borderRadius = "2px";
      labelEl.style.whiteSpace = "nowrap";
      labelEl.style.pointerEvents = "none";
      labelEl.textContent = id;
      overlay.appendChild(labelEl);
    }
  }
  if (showAnchors) {
    for (const [id, sceneEl] of Object.entries(sceneElements)) {
      if (!sceneEl.resolved) continue;
      if (isElementHidden(id, sceneEl)) continue;
      const abs = absoluteBounds(sceneEl, sceneElements);
      const anchor = sceneEl.authored?.props?.anchor || "tl";
      const anchorPos = getAnchorPosition(abs, anchor);
      const dotEl = document.createElement("div");
      dotEl.setAttribute("data-sk-debug", "anchor");
      dotEl.setAttribute("data-sk-debug-id", id);
      dotEl.style.position = "absolute";
      dotEl.style.left = `${anchorPos.x - 4}px`;
      dotEl.style.top = `${anchorPos.y - 4}px`;
      dotEl.style.width = "8px";
      dotEl.style.height = "8px";
      dotEl.style.borderRadius = "50%";
      dotEl.style.background = "rgba(255, 0, 0, 0.9)";
      dotEl.style.border = "1px solid white";
      dotEl.style.pointerEvents = "none";
      overlay.appendChild(dotEl);
    }
  }
  if (showCollisions && collisions.length > 0) {
    for (const collision of collisions) {
      const rect = collision.overlapRect;
      if (!rect) continue;
      const collisionEl = document.createElement("div");
      collisionEl.setAttribute("data-sk-debug", "collision");
      collisionEl.setAttribute("data-sk-debug-a", collision.elementA);
      collisionEl.setAttribute("data-sk-debug-b", collision.elementB);
      collisionEl.style.position = "absolute";
      collisionEl.style.left = `${rect.x}px`;
      collisionEl.style.top = `${rect.y}px`;
      collisionEl.style.width = `${rect.w}px`;
      collisionEl.style.height = `${rect.h}px`;
      collisionEl.style.background = "rgba(255, 0, 0, 0.3)";
      collisionEl.style.border = "2px solid rgba(255, 0, 0, 0.8)";
      collisionEl.style.boxSizing = "border-box";
      collisionEl.style.pointerEvents = "none";
      overlay.appendChild(collisionEl);
    }
  }
  if (showRelationships) {
    const relSvg = buildRelationshipSVG(sceneElements, slideW, slideH);
    if (relSvg) overlay.appendChild(relSvg);
  }
}
var init_debug_overlay = __esm({
  "slidekit/src/debug-overlay.ts"() {
    "use strict";
    init_debug_inspector_styles();
    init_debug_state();
  }
});
function adjustViewport(panelWidth) {
  const s = debugController.state;
  if (!s.revealContainer) {
    s.revealContainer = document.querySelector(".reveal");
  }
  if (s.revealContainer) {
    const Reveal = window.Reveal;
    s.revealContainer.style.width = `calc(100vw - ${panelWidth}px)`;
    s.revealContainer.style.height = "100vh";
    if (Reveal) {
      if (!s.wasEmbedded && typeof Reveal.configure === "function") {
        s.wasEmbedded = true;
        Reveal.configure({ embedded: true });
      } else if (typeof Reveal.layout === "function") {
        Reveal.layout();
      }
    }
    return;
  }
  const layer = document.querySelector(".slidekit-layer");
  if (layer) {
    const viewportWidth = window.innerWidth;
    const sk = window.sk;
    const slideW = sk?._config?.slide?.w ?? 1920;
    const factor = (viewportWidth - panelWidth) / slideW;
    layer.style.transform = `scale(${factor})`;
    layer.style.transformOrigin = "top left";
  }
}
function resetViewport() {
  const s = debugController.state;
  if (s.revealContainer) {
    s.revealContainer.style.width = "";
    s.revealContainer.style.height = "";
    const Reveal = window.Reveal;
    if (s.wasEmbedded && Reveal && typeof Reveal.configure === "function") {
      s.wasEmbedded = false;
      Reveal.configure({ embedded: false });
    } else if (Reveal && typeof Reveal.layout === "function") {
      Reveal.layout();
    }
    s.revealContainer = null;
    return;
  }
  const layer = document.querySelector(".slidekit-layer");
  if (layer) {
    layer.style.transform = "";
    layer.style.transformOrigin = "";
  }
}
function onResizeMove(event) {
  const s = debugController.state;
  if (!s.resizeState?.active) return;
  const newWidth = Math.min(600, Math.max(200, s.resizeState.startWidth + (s.resizeState.startX - event.clientX)));
  s.panelWidth = newWidth;
  if (s.inspectorPanel) {
    s.inspectorPanel.style.width = `${newWidth}px`;
  }
  adjustViewport(newWidth);
}
function onResizeUp(_event) {
  const s = debugController.state;
  if (!s.resizeState?.active) return;
  s.resizeState = null;
  document.removeEventListener("pointermove", onResizeMove);
  document.removeEventListener("pointerup", onResizeUp);
}
function createResizeHandle() {
  const s = debugController.state;
  const handle = document.createElement("div");
  handle.setAttribute("data-sk-role", "debug-inspector-handle");
  handle.style.position = "absolute";
  handle.style.left = "0";
  handle.style.top = "0";
  handle.style.width = "6px";
  handle.style.height = "100%";
  handle.style.cursor = "col-resize";
  handle.style.zIndex = "1";
  handle.style.display = "flex";
  handle.style.alignItems = "center";
  handle.style.justifyContent = "center";
  const grip = document.createElement("div");
  grip.style.width = "2px";
  grip.style.height = "32px";
  grip.style.borderRadius = "1px";
  grip.style.background = "rgba(0,0,0,0.18)";
  handle.appendChild(grip);
  handle.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    try {
      handle.setPointerCapture(event.pointerId);
    } catch (_e) {
    }
    s.resizeState = { active: true, startX: event.clientX, startWidth: s.panelWidth };
    document.addEventListener("pointermove", onResizeMove);
    document.addEventListener("pointerup", onResizeUp);
  });
  return handle;
}
var init_debug_inspector_viewport = __esm({
  "slidekit/src/debug-inspector-viewport.ts"() {
    "use strict";
    init_debug_state();
  }
});
function formatRelMarker(marker) {
  if (marker._rel === "between") {
    const args = [];
    if (marker.ref) args.push(marker.ref);
    if (marker.ref2 !== void 0) args.push(typeof marker.ref2 === "string" ? marker.ref2 : String(marker.ref2));
    const opts2 = [];
    if (marker.axis) opts2.push(`axis: ${marker.axis}`);
    if (marker.bias !== void 0 && marker.bias !== 0.5) opts2.push(`bias: ${marker.bias}`);
    if (opts2.length > 0) args.push(`{${opts2.join(", ")}}`);
    return `between(${args.join(", ")})`;
  }
  const parts = [];
  if (marker.ref) parts.push(marker.ref);
  const opts = [];
  if (marker.gap !== void 0) opts.push(`gap: ${marker.gap}`);
  if (marker.bias !== void 0) opts.push(`bias: ${marker.bias}`);
  if (marker.group) opts.push(`group: ${JSON.stringify(marker.group)}`);
  if (marker.ref2 !== void 0) opts.push(`ref2: ${JSON.stringify(marker.ref2)}`);
  if (opts.length > 0) parts.push(`{${opts.join(", ")}}`);
  return `${marker._rel}(${parts.join(", ")})`;
}
function formatPropValue(val) {
  if (val != null && typeof val === "object" && "_rel" in val) {
    return formatRelMarker(val);
  }
  if (typeof val === "string") return JSON.stringify(val);
  if (val == null) return String(val);
  return JSON.stringify(val);
}
function formatProvenance(p) {
  let result = p.source;
  if (p.source === "authored" && p.value !== void 0) {
    result += ` = ${formatPropValue(p.value)}`;
  } else if (p.source === "constraint" && p.type) {
    if (p.type === "between") {
      result += ` between(${p.ref || ""}`;
      if (p.ref2 !== void 0) result += `, ${p.ref2}`;
      result += ")";
    } else {
      result += ` ${p.type}(${p.ref || ""}`;
      if (p.gap !== void 0) result += `, gap=${p.gap}`;
      result += ")";
    }
  } else if (p.source === "stack" && p.stackId) {
    result += ` stack=${p.stackId}`;
  }
  return result;
}
function serializeSceneGraph(elements) {
  const lines = [];
  for (const [id, el2] of Object.entries(elements)) {
    if (el2._internal) continue;
    lines.push(`--- ${id} (${el2.type}) ---`);
    lines.push(`  parent: ${el2.parentId ?? "(root)"}`);
    lines.push(`  children: [${el2.children.join(", ")}]`);
    const props = el2.authored?.props;
    if (props) {
      lines.push("  props:");
      for (const [key, val] of Object.entries(props)) {
        if (key.startsWith("_")) continue;
        lines.push(`    ${key}: ${formatPropValue(val)}`);
      }
    }
    if (el2.authored?.content) {
      lines.push(`  content: ${JSON.stringify(el2.authored.content)}`);
    }
    lines.push("  provenance:");
    for (const axis of ["x", "y", "w", "h"]) {
      const p = el2.provenance[axis];
      if (p) {
        lines.push(`    ${axis}: ${formatProvenance(p)}`);
      }
    }
    lines.push("");
  }
  return lines.join("\n");
}
function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}
function diffProps(before, after) {
  const changes = [];
  const allKeys = /* @__PURE__ */ new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of allKeys) {
    if (key.startsWith("_")) continue;
    const bVal = before[key];
    const aVal = after[key];
    if (!deepEqual(bVal, aVal)) {
      changes.push({ key, before: bVal, after: aVal });
    }
  }
  return changes;
}
function buildDiffHeader(slideIndex) {
  const lines = [];
  const url = typeof window !== "undefined" ? window.location.href : "(unknown)";
  const sk = typeof window !== "undefined" ? window.sk : null;
  const sourceHint = sk?._config?.debug?.sourceHint;
  lines.push("# Presentation Context");
  lines.push(`- URL: ${url}`);
  lines.push(`- Slide: ${slideIndex} (0-indexed)`);
  if (sourceHint) {
    lines.push(`- Source: ${sourceHint}`);
  }
  lines.push("");
  lines.push("# Instructions");
  lines.push(
    `There is a presentation at the URL above. The user has modified slide ${slideIndex} using the SlideKit inspector. Below is a diff of what changed in the scene graph. Please look at the slide definition code${sourceHint ? ` in ${sourceHint}` : ""} and update it to match the AFTER state.`
  );
  lines.push("");
  return lines.join("\n");
}
function generateSceneGraphDiff(before, after, slideIndex) {
  const header = slideIndex !== void 0 ? buildDiffHeader(slideIndex) : "";
  const lines = ["# Scene Graph Changes", ""];
  let hasChanges = false;
  const allIds = /* @__PURE__ */ new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const id of allIds) {
    const bEl = before[id];
    const aEl = after[id];
    if (bEl?._internal || aEl?._internal) continue;
    if (!bEl) {
      hasChanges = true;
      lines.push(`## ${id} (${aEl.type}) \u2014 ADDED`);
      lines.push("");
      continue;
    }
    if (!aEl) {
      hasChanges = true;
      lines.push(`## ${id} (${bEl.type}) \u2014 REMOVED`);
      lines.push("");
      continue;
    }
    const bProps = bEl.authored?.props ?? {};
    const aProps = aEl.authored?.props ?? {};
    const changes = diffProps(bProps, aProps);
    const bContent = bEl.authored?.content;
    const aContent = aEl.authored?.content;
    const contentChanged = bContent !== aContent;
    if (changes.length > 0 || contentChanged) {
      hasChanges = true;
      lines.push(`## ${id} (${aEl.type})`);
      if (contentChanged) {
        const bStr = bContent ?? "(none)";
        const aStr = aContent ?? "(none)";
        lines.push(`  content: ${JSON.stringify(bStr)} \u2192 ${JSON.stringify(aStr)}`);
      }
      for (const { key, before: bVal, after: aVal } of changes) {
        lines.push(`  ${key}: ${formatPropValue(bVal)} \u2192 ${formatPropValue(aVal)}`);
        const prov = aEl.provenance[key];
        if (prov && prov.source === "constraint") {
          lines.push(`    (provenance: ${formatProvenance(prov)})`);
        }
      }
      lines.push("");
    }
  }
  if (!hasChanges) {
    lines.push("(no changes)");
    lines.push("");
  }
  return header + lines.join("\n");
}
function createDiffActionBar() {
  const bar = document.createElement("div");
  bar.setAttribute("data-sk-diff-action-bar", "true");
  bar.style.cssText = `
    padding: 8px 16px;
    border-bottom: 1px solid #ddd;
    display: flex;
    align-items: center;
  `;
  const btn = document.createElement("button");
  btn.setAttribute("data-sk-diff-btn", "true");
  btn.style.cssText = `
    position: relative;
    padding: 4px 12px;
    font-size: 12px;
    font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
    background: #fff;
    border: 1px solid #ccc;
    border-radius: 4px;
    color: #1a1a2e;
    cursor: pointer;
    transition: background 0.15s;
  `;
  btn.textContent = "Show Slide Diff";
  btn.addEventListener("mouseenter", () => {
    btn.style.background = "#f0f0f4";
  });
  btn.addEventListener("mouseleave", () => {
    btn.style.background = "#fff";
  });
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    openDiffModal();
  });
  const badge22 = document.createElement("span");
  badge22.setAttribute("data-sk-diff-dirty", "true");
  badge22.style.cssText = `
    position: absolute;
    top: -3px;
    right: -3px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #ff8c32;
    display: none;
  `;
  btn.appendChild(badge22);
  bar.appendChild(btn);
  return bar;
}
function updateDiffDirtyIndicator() {
  const s = debugController.state;
  const badge22 = s.inspectorPanel?.querySelector("[data-sk-diff-dirty]");
  if (!badge22) return;
  const hasPendingEdits = s.undoStack.some(
    (e) => "compound" in e ? e.entries.some((c) => c.slideIndex === s.currentSlideIndex) : e.slideIndex === s.currentSlideIndex
  );
  badge22.style.display = hasPendingEdits ? "block" : "none";
}
function openDiffModal() {
  closeDiffModal();
  const s = debugController.state;
  const slideIndex = s.currentSlideIndex;
  const baseline = s.baselineSceneGraphs[slideIndex] ?? {};
  const sk = typeof window !== "undefined" ? window.sk : null;
  const current = sk?.layouts?.[slideIndex]?.elements ?? {};
  const diffText = generateSceneGraphDiff(baseline, current, slideIndex);
  const beforeText = serializeSceneGraph(baseline);
  const afterText = serializeSceneGraph(current);
  const tabContent = {
    diff: diffText,
    before: beforeText,
    after: afterText
  };
  let activeTab = "diff";
  const overlay = document.createElement("div");
  overlay.setAttribute("data-sk-diff-modal-overlay", "true");
  overlay.style.cssText = `
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 200000;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  const modal = document.createElement("div");
  modal.setAttribute("data-sk-diff-modal", "true");
  modal.style.cssText = `
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    width: 720px;
    max-width: 90vw;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
    font-size: 12px;
    color: #1a1a2e;
  `;
  const header = document.createElement("div");
  header.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid #ddd;
    flex-shrink: 0;
  `;
  const title = document.createElement("span");
  title.style.cssText = "font-size: 14px; font-weight: 600;";
  title.textContent = "Slide Diff";
  header.appendChild(title);
  const closeBtn = document.createElement("button");
  closeBtn.style.cssText = `
    background: none; border: none; font-size: 18px;
    cursor: pointer; color: #888; padding: 0 4px;
    line-height: 1;
  `;
  closeBtn.textContent = "\xD7";
  closeBtn.addEventListener("click", closeDiffModal);
  header.appendChild(closeBtn);
  modal.appendChild(header);
  const tabBar = document.createElement("div");
  tabBar.style.cssText = `
    display: flex;
    border-bottom: 1px solid #ddd;
    flex-shrink: 0;
  `;
  const tabs = ["diff", "before", "after"];
  const tabLabels = { diff: "Diff", before: "Before", after: "After" };
  const tabButtons = {};
  for (const tab of tabs) {
    const tabBtn = document.createElement("button");
    tabBtn.setAttribute("data-sk-diff-tab", tab);
    tabBtn.style.cssText = `
      padding: 8px 16px;
      font-size: 12px;
      font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
      background: none;
      border: none;
      border-bottom: 2px solid transparent;
      cursor: pointer;
      color: #666;
      transition: color 0.15s;
    `;
    tabBtn.textContent = tabLabels[tab];
    tabBtn.addEventListener("click", () => switchTab(tab));
    tabButtons[tab] = tabBtn;
    tabBar.appendChild(tabBtn);
  }
  modal.appendChild(tabBar);
  const contentArea = document.createElement("pre");
  contentArea.setAttribute("data-sk-diff-content", "true");
  contentArea.style.cssText = `
    margin: 0;
    padding: 16px;
    overflow: auto;
    flex: 1;
    white-space: pre-wrap;
    word-break: break-word;
    font-size: 11px;
    line-height: 1.5;
    color: #333;
    min-height: 200px;
  `;
  modal.appendChild(contentArea);
  const footer = document.createElement("div");
  footer.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding: 8px 16px;
    border-top: 1px solid #ddd;
    flex-shrink: 0;
  `;
  const copyBtn = document.createElement("button");
  copyBtn.style.cssText = `
    padding: 6px 16px;
    font-size: 12px;
    font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
    background: #4a9eff;
    border: none;
    border-radius: 4px;
    color: #fff;
    cursor: pointer;
    transition: background 0.15s;
  `;
  copyBtn.textContent = "Copy";
  copyBtn.addEventListener("mouseenter", () => {
    copyBtn.style.background = "#3a8eef";
  });
  copyBtn.addEventListener("mouseleave", () => {
    copyBtn.style.background = "#4a9eff";
  });
  copyBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(tabContent[activeTab]).then(() => {
      const original = copyBtn.textContent;
      copyBtn.textContent = "Copied!";
      setTimeout(() => {
        copyBtn.textContent = original;
      }, 1500);
    });
  });
  footer.appendChild(copyBtn);
  modal.appendChild(footer);
  overlay.appendChild(modal);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeDiffModal();
  });
  const onKeydown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      closeDiffModal();
      document.removeEventListener("keydown", onKeydown, true);
    }
  };
  document.addEventListener("keydown", onKeydown, true);
  document.body.appendChild(overlay);
  function switchTab(tab) {
    activeTab = tab;
    contentArea.textContent = tabContent[tab];
    for (const [t, btn] of Object.entries(tabButtons)) {
      if (t === tab) {
        btn.style.color = "#1a1a2e";
        btn.style.borderBottomColor = "#4a9eff";
        btn.style.fontWeight = "600";
      } else {
        btn.style.color = "#666";
        btn.style.borderBottomColor = "transparent";
        btn.style.fontWeight = "normal";
      }
    }
  }
  switchTab("diff");
}
function closeDiffModal() {
  const existing = document.querySelector("[data-sk-diff-modal-overlay]");
  if (existing) existing.remove();
}
var init_debug_inspector_diff = __esm({
  "slidekit/src/debug-inspector-diff.ts"() {
    "use strict";
    init_debug_state();
  }
});
function isRelMarker(value) {
  return value !== null && typeof value === "object" && typeof value._rel === "string";
}
function deepClone(obj) {
  if (typeof structuredClone === "function") {
    return structuredClone(obj);
  }
  return JSON.parse(JSON.stringify(obj));
}
function flattenElements(elements) {
  const flatMap = /* @__PURE__ */ new Map();
  const groupParent = /* @__PURE__ */ new Map();
  const stackParent = /* @__PURE__ */ new Map();
  const stackChildren = /* @__PURE__ */ new Map();
  const groupChildren = /* @__PURE__ */ new Map();
  const panelInternals = /* @__PURE__ */ new Set();
  const idCounts = /* @__PURE__ */ new Map();
  function walk(els, parentGroupId) {
    for (const el2 of els) {
      idCounts.set(el2.id, (idCounts.get(el2.id) || 0) + 1);
      flatMap.set(el2.id, el2);
      if (parentGroupId) {
        groupParent.set(el2.id, parentGroupId);
      }
      if (el2.type === "group" && el2.children) {
        const childIds = el2.children.map((c) => c.id);
        groupChildren.set(el2.id, childIds);
        if (el2._compound === "panel" && el2.children.length >= 2) {
          panelInternals.add(el2.children[0].id);
          panelInternals.add(el2.children[1].id);
        }
        if (el2._compound === "figure" && el2.children.length >= 2) {
          panelInternals.add(el2.children[0].id);
          panelInternals.add(el2.children[1].id);
        }
        walk(el2.children, el2.id);
      }
      if ((el2.type === "vstack" || el2.type === "hstack") && el2.children) {
        const childIds = [];
        for (const child of el2.children) {
          flatMap.set(child.id, child);
          stackParent.set(child.id, el2.id);
          childIds.push(child.id);
          if ((child.type === "vstack" || child.type === "hstack") && child.children) {
            walk([child], parentGroupId);
          } else if (child.type === "group" && child.children) {
            const gcIds = child.children.map((c) => c.id);
            groupChildren.set(child.id, gcIds);
            if (child._compound === "panel" && child.children.length >= 2) {
              panelInternals.add(child.children[0].id);
              panelInternals.add(child.children[1].id);
            }
            if (child._compound === "figure" && child.children.length >= 2) {
              panelInternals.add(child.children[0].id);
              panelInternals.add(child.children[1].id);
            }
            walk(child.children, child.id);
          }
        }
        stackChildren.set(el2.id, childIds);
      }
    }
  }
  walk(elements, null);
  const duplicateIds = /* @__PURE__ */ new Map();
  for (const [id, count] of idCounts) {
    if (count > 1) duplicateIds.set(id, count);
  }
  return { flatMap, groupParent, stackParent, stackChildren, groupChildren, panelInternals, duplicateIds };
}
function getRelRef(marker) {
  if (!isRelMarker(marker)) return null;
  if (marker._rel === "centerIn") return null;
  return marker.ref || null;
}
function resolveRelMarker(marker, axis, refBounds, ownW, ownH) {
  const rel = marker._rel;
  const gap = marker.gap ?? 0;
  switch (rel) {
    case "below":
      return refBounds.y + refBounds.h + gap;
    case "above":
      return refBounds.y - ownH - gap;
    case "rightOf":
      return refBounds.x + refBounds.w + gap;
    case "leftOf":
      return refBounds.x - ownW - gap;
    case "centerV":
      return refBounds.y + refBounds.h / 2 - ownH / 2;
    case "centerH":
      return refBounds.x + refBounds.w / 2 - ownW / 2;
    case "alignTop":
      return refBounds.y;
    case "alignBottom":
      return refBounds.y + refBounds.h - ownH;
    case "alignLeft":
      return refBounds.x;
    case "alignRight":
      return refBounds.x + refBounds.w - ownW;
    case "centerIn": {
      const r = marker.rect;
      if (axis === "x") {
        return r.x + r.w / 2 - ownW / 2;
      } else {
        return r.y + r.h / 2 - ownH / 2;
      }
    }
    default:
      throw new Error(`Unknown _rel type: "${rel}"`);
  }
}
function buildProvenance(authoredValue, prop, element, wasMeasured) {
  if (isRelMarker(authoredValue)) {
    const prov = { source: "constraint", type: authoredValue._rel };
    if (authoredValue.ref) prov.ref = authoredValue.ref;
    if (authoredValue.ref2 !== void 0) prov.ref2 = authoredValue.ref2;
    if (authoredValue.gap !== void 0) prov.gap = authoredValue.gap;
    if (authoredValue.bias !== void 0) prov.bias = authoredValue.bias;
    if (authoredValue.rect) prov.rect = authoredValue.rect;
    const anchors = _CONSTRAINT_ANCHORS[authoredValue._rel];
    if (anchors) {
      prov.sourceAnchor = anchors[0];
      prov.targetAnchor = anchors[1];
    }
    return prov;
  }
  if (wasMeasured && (prop === "w" || prop === "h")) {
    return {
      source: "measured",
      measuredAt: {
        w: element.props?.w ?? null,
        className: element.props?.className || ""
      }
    };
  }
  return { source: "authored", value: authoredValue };
}
function computeAABBIntersection(a, b) {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.w, b.x + b.w);
  const y2 = Math.min(a.y + a.h, b.y + b.h);
  const w = x2 - x1;
  const h = y2 - y1;
  if (w > 0 && h > 0) {
    return { x: x1, y: y1, w, h };
  }
  return null;
}
var _CONSTRAINT_ANCHORS;
var init_helpers = __esm({
  "slidekit/src/layout/helpers.ts"() {
    "use strict";
    _CONSTRAINT_ANCHORS = {
      below: ["bc", "tc"],
      above: ["tc", "bc"],
      rightOf: ["cr", "cl"],
      leftOf: ["cl", "cr"],
      centerV: ["cc", "cc"],
      centerH: ["cc", "cc"],
      alignTop: ["tc", "tc"],
      alignBottom: ["bc", "bc"],
      alignLeft: ["cl", "cl"],
      alignRight: ["cr", "cr"],
      centerIn: ["cc", "cc"],
      between: ["bc", "cc"],
      matchWidth: ["cr", "cl"],
      matchHeight: ["bc", "tc"],
      centerHSlide: ["cc", "cc"],
      centerVSlide: ["cc", "cc"],
      matchMaxWidth: ["cr", "cl"],
      matchMaxHeight: ["bc", "tc"]
    };
  }
});
var debug_inspector_edit_exports = {};
__export(debug_inspector_edit_exports, {
  applyEdit: () => applyEdit,
  applyElementAction: () => applyElementAction,
  cancelEdit: () => cancelEdit,
  commitEdit: () => commitEdit,
  getEnumOptions: () => getEnumOptions,
  isAnchorProp: () => isAnchorProp,
  isEditableGap: () => isEditableGap,
  isEditableProp: () => isEditableProp,
  isElementIdProp: () => isElementIdProp,
  isGapProp: () => isGapProp,
  redo: () => redo,
  showLockedTooltip: () => showLockedTooltip,
  startAnchorEdit: () => startAnchorEdit,
  startEdit: () => startEdit,
  startElementIdEdit: () => startElementIdEdit,
  startEnumEdit: () => startEnumEdit,
  startGapTokenEdit: () => startGapTokenEdit,
  undo: () => undo
});
function isEditableProp(key, value) {
  return key in EDITABLE_PROPS && key !== "gap" && typeof value === "number";
}
function isEditableGap(constraintType) {
  return GAP_CONSTRAINT_TYPES.has(constraintType);
}
function getSpacingTokens() {
  const sk = window.sk;
  const scale = sk?._config?.spacing || DEFAULT_SPACING_TOKENS;
  return Object.entries(scale).map(([token, px]) => ({ token, px }));
}
function getEnumOptions(propKey, elementType) {
  switch (propKey) {
    case "align":
      if (elementType === "vstack") return ["left", "center", "right", "stretch"];
      if (elementType === "hstack") return ["top", "middle", "bottom", "stretch"];
      return null;
    case "vAlign":
      return ["top", "center", "bottom"];
    case "hAlign":
      return ["left", "center", "right"];
    case "overflow":
      return ["visible", "warn", "clip", "error"];
    case "layer":
      return ["bg", "content", "overlay"];
    case "connectorType":
      return ["straight", "curved", "elbow", "orthogonal"];
    case "arrow":
      return ["none", "end", "start", "both"];
    default:
      return null;
  }
}
function isGapProp(key) {
  return key === "gap";
}
function findElement(definition, elementId) {
  const { flatMap } = flattenElements(definition.elements);
  return flatMap.get(elementId);
}
function refreshInspectorDetail(elementId, slideIndex) {
  debugController.callbacks.renderElementDetail?.(elementId, slideIndex);
}
function restorePropRowText(propKey, value) {
  const s = debugController.state;
  const input = s.editInputElement;
  if (!input) return;
  const propDiv = input.parentElement;
  if (!propDiv) return;
  if (propKey.endsWith(".gap")) {
    propDiv.textContent = `gap=${value ?? ""}`;
  } else {
    propDiv.textContent = `${propKey}: ${value ?? ""}`;
  }
  propDiv.style.textDecoration = "underline";
  propDiv.style.textDecorationStyle = "dashed";
  propDiv.style.textUnderlineOffset = "2px";
}
async function applyEdit(elementId, propKey, newValue, slideIndex) {
  const sk = window.sk;
  if (!sk?._definitions?.[slideIndex]) return;
  const definition = sk._definitions[slideIndex];
  const element = findElement(definition, elementId);
  if (!element) return;
  if (propKey === "_content") {
    element.content = newValue;
  } else if (propKey.endsWith(".gap")) {
    const axis = propKey.split(".")[0];
    const marker = element.props[axis];
    if (marker && typeof marker === "object" && "_rel" in marker) {
      marker.gap = newValue;
    }
  } else {
    element.props[propKey] = newValue;
  }
  const rerender = sk._rerenderSlide;
  if (!rerender) return;
  const seq = ++_applySeq;
  await rerender(slideIndex, definition);
  if (seq !== _applySeq) return;
  const s = debugController.state;
  if (s.debugOverlay) {
    debugController.callbacks.renderDebugOverlay?.({ slideIndex, showInspector: false });
  }
  if (s.inspectorPanel && s.selectedElementId === elementId && s.editingPropKey === null) {
    refreshInspectorDetail(elementId, slideIndex);
  }
}
function startEdit(elementId, propKey, currentValue, propDiv, slideIndex) {
  const s = debugController.state;
  if (s.editingPropKey === propKey) return;
  if (s.editingPropKey !== null) {
    cancelEdit();
  }
  const config = propKey.endsWith(".gap") ? GAP_EDIT_CONFIG : EDITABLE_PROPS[propKey];
  if (!config) return;
  const sk = window.sk;
  const def = sk?._definitions?.[slideIndex];
  if (def) {
    const foundEl = findElement(def, elementId);
    if (foundEl) {
      let live;
      if (propKey.endsWith(".gap")) {
        const axis = propKey.split(".")[0];
        const marker = foundEl.props[axis];
        if (marker && typeof marker === "object") {
          live = marker.gap;
        }
      } else {
        live = foundEl.props[propKey];
      }
      if (typeof live === "number") {
        currentValue = live;
      } else if (propKey === "gap" && typeof live === "string") {
        const match = getSpacingTokens().find((t) => t.token === live);
        if (match) currentValue = match.px;
      }
    }
  }
  const originalValue = currentValue;
  const input = document.createElement("input");
  input.type = "number";
  input.value = String(currentValue);
  input.step = String(config.step);
  input.min = String(config.min);
  input.max = String(config.max);
  input.style.cssText = `
    width: 80px; padding: 2px 4px; font-size: 12px;
    font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
    border: 1px solid #4a9eff; border-radius: 3px;
    background: #fff; color: #1a1a2e; outline: none;
    box-shadow: 0 0 3px rgba(74, 158, 255, 0.3);
  `;
  propDiv.textContent = "";
  const label = document.createElement("span");
  label.textContent = propKey.endsWith(".gap") ? "gap=" : `${propKey}: `;
  label.style.color = "#999";
  propDiv.appendChild(label);
  propDiv.appendChild(input);
  propDiv.style.textDecoration = "none";
  s.editingPropKey = propKey;
  s.editInputElement = input;
  input.focus();
  input.select();
  const onInput = () => {
    const val = parseFloat(input.value);
    if (!isNaN(val)) {
      applyEdit(elementId, propKey, val, slideIndex);
    }
  };
  input.addEventListener("input", onInput);
  const onKeydown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const val = parseFloat(input.value);
      if (!isNaN(val)) {
        commitEdit(elementId, propKey, originalValue, val, slideIndex);
      } else {
        cancelEditRestore(elementId, propKey, originalValue, slideIndex);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelEditRestore(elementId, propKey, originalValue, slideIndex);
    }
  };
  input.addEventListener("keydown", onKeydown);
  const onBlur = () => {
    if (s.editingPropKey !== propKey) return;
    const val = parseFloat(input.value);
    if (!isNaN(val) && val !== originalValue) {
      commitEdit(elementId, propKey, originalValue, val, slideIndex);
    } else {
      cancelEditRestore(elementId, propKey, originalValue, slideIndex);
    }
  };
  input.addEventListener("blur", onBlur);
}
function commitEdit(elementId, propKey, oldValue, newValue, slideIndex) {
  const s = debugController.state;
  if (oldValue !== newValue) {
    s.undoStack.push({ elementId, propKey, oldValue, newValue, slideIndex });
    s.redoStack.length = 0;
  }
  s.editingPropKey = null;
  restorePropRowText(propKey, newValue);
  s.editInputElement = null;
  updateDiffDirtyIndicator();
  queueMicrotask(() => {
    if (s.editingPropKey === null && s.selectedElementId === elementId && s.inspectorPanel) {
      refreshInspectorDetail(elementId, slideIndex);
    }
  });
}
async function cancelEditRestore(elementId, propKey, originalValue, slideIndex) {
  const s = debugController.state;
  s.editingPropKey = null;
  restorePropRowText(propKey, originalValue);
  s.editInputElement = null;
  await applyEdit(elementId, propKey, originalValue, slideIndex);
}
function cancelEdit() {
  const s = debugController.state;
  const input = s.editInputElement;
  const propKey = s.editingPropKey;
  s.editingPropKey = null;
  if (input && propKey) {
    restorePropRowText(propKey, input.value);
  }
  s.editInputElement = null;
}
function applyElementAction(entry) {
  const sk = window.sk;
  const definition = sk?._definitions?.[entry.slideIndex];
  if (!definition) return;
  let children;
  if (entry.parentId === null) {
    children = definition.elements;
  } else {
    const { flatMap } = flattenElements(definition.elements);
    const parent = flatMap.get(entry.parentId);
    if (!parent || !("children" in parent)) return;
    children = parent.children;
  }
  if (entry.action === "insert") {
    const copy = JSON.parse(JSON.stringify(entry.element));
    children.splice(entry.index, 0, copy);
  } else {
    const idx = children.findIndex((c) => c.id === entry.element.id);
    if (idx !== -1) children.splice(idx, 1);
  }
  ++_applySeq;
}
async function replayEntry(entry, direction) {
  if ("action" in entry) {
    const effective = direction === "undo" ? { ...entry, action: entry.action === "insert" ? "remove" : "insert" } : entry;
    applyElementAction(effective);
  } else {
    const value = direction === "undo" ? entry.oldValue : entry.newValue;
    await applyEdit(entry.elementId, entry.propKey, value, entry.slideIndex);
  }
}
async function undo() {
  const s = debugController.state;
  const entry = s.undoStack.pop();
  if (!entry) return;
  s.redoStack.push(entry);
  updateDiffDirtyIndicator();
  if ("compound" in entry) {
    for (let i = entry.entries.length - 1; i >= 0; i--) {
      await replayEntry(entry.entries[i], "undo");
    }
    await _rerenderCurrentSlide(entry.entries[0]?.slideIndex);
  } else {
    await replayEntry(entry, "undo");
  }
}
async function redo() {
  const s = debugController.state;
  const entry = s.redoStack.pop();
  if (!entry) return;
  s.undoStack.push(entry);
  updateDiffDirtyIndicator();
  if ("compound" in entry) {
    for (const child of entry.entries) {
      await replayEntry(child, "redo");
    }
    await _rerenderCurrentSlide(entry.entries[0]?.slideIndex);
  } else {
    await replayEntry(entry, "redo");
  }
}
async function _rerenderCurrentSlide(slideIndex) {
  if (slideIndex === void 0) return;
  const sk = window.sk;
  const definition = sk?._definitions?.[slideIndex];
  if (!definition) return;
  const rerender = sk._rerenderSlide;
  if (!rerender) return;
  await rerender(slideIndex, definition);
  const s = debugController.state;
  if (s.debugOverlay) {
    debugController.callbacks.renderDebugOverlay?.({ slideIndex, showInspector: false });
  }
  if (s.selectedElementId && s.inspectorPanel) {
    debugController.callbacks.renderElementDetail?.(s.selectedElementId, slideIndex);
  }
}
function startEnumEdit(elementId, propKey, currentValue, options, propDiv, slideIndex) {
  const s = debugController.state;
  if (s.editingPropKey === propKey) return;
  if (s.editingPropKey !== null) cancelEdit();
  const sk = window.sk;
  const def = sk?._definitions?.[slideIndex];
  if (def) {
    const foundEl = findElement(def, elementId);
    if (foundEl) {
      const live = foundEl.props[propKey];
      if (typeof live === "string") currentValue = live;
    }
  }
  const originalValue = currentValue;
  const select = document.createElement("select");
  select.style.cssText = SELECT_STYLE;
  for (const opt of options) {
    const option = document.createElement("option");
    option.value = opt;
    option.textContent = opt;
    if (opt === currentValue) option.selected = true;
    select.appendChild(option);
  }
  propDiv.textContent = "";
  const label = document.createElement("span");
  label.textContent = `${propKey}: `;
  label.style.color = "#999";
  propDiv.appendChild(label);
  propDiv.appendChild(select);
  propDiv.style.textDecoration = "none";
  s.editingPropKey = propKey;
  s.editInputElement = select;
  select.focus();
  select.addEventListener("change", () => {
    const newVal = select.value;
    applyEdit(elementId, propKey, newVal, slideIndex);
    commitEdit(elementId, propKey, originalValue, newVal, slideIndex);
  });
  select.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      cancelEditRestore(elementId, propKey, originalValue, slideIndex);
    }
  });
  select.addEventListener("blur", () => {
    if (s.editingPropKey !== propKey) return;
    cancelEditRestore(elementId, propKey, originalValue, slideIndex);
  });
}
function isAnchorProp(key) {
  return key === "anchor" || key === "fromAnchor" || key === "toAnchor";
}
function startAnchorEdit(elementId, propKey, currentValue, propDiv, slideIndex) {
  const s = debugController.state;
  if (s.editingPropKey === propKey) return;
  if (s.editingPropKey !== null) cancelEdit();
  const sk = window.sk;
  const def = sk?._definitions?.[slideIndex];
  if (def) {
    const foundEl = findElement(def, elementId);
    if (foundEl) {
      const live = foundEl.props[propKey];
      if (typeof live === "string") currentValue = live;
    }
  }
  const originalValue = currentValue;
  const grid2 = document.createElement("div");
  grid2.style.cssText = `
    display: inline-grid; grid-template-columns: repeat(3, 1fr);
    width: 54px; height: 54px; border: 1px solid #ccc; border-radius: 4px;
    background: #fff; box-shadow: 0 0 3px rgba(74, 158, 255, 0.3);
    vertical-align: middle; margin-left: 4px;
  `;
  for (const row of ANCHOR_GRID) {
    for (const anchor of row) {
      const cell = document.createElement("div");
      cell.style.cssText = `
        display: flex; align-items: center; justify-content: center;
        cursor: pointer;
      `;
      cell.setAttribute("data-sk-anchor", anchor);
      const dot = document.createElement("div");
      const isSelected = anchor === currentValue;
      dot.style.cssText = `
        width: ${isSelected ? 10 : 6}px; height: ${isSelected ? 10 : 6}px;
        border-radius: 50%;
        background: ${isSelected ? "#4a9eff" : "#bbb"};
        transition: all 0.1s;
      `;
      cell.appendChild(dot);
      cell.addEventListener("mouseenter", () => {
        if (anchor !== currentValue) {
          dot.style.width = "8px";
          dot.style.height = "8px";
          dot.style.background = "#7ab8ff";
        }
      });
      cell.addEventListener("mouseleave", () => {
        if (anchor !== currentValue) {
          dot.style.width = "6px";
          dot.style.height = "6px";
          dot.style.background = "#bbb";
        }
      });
      cell.addEventListener("click", (e) => {
        e.stopPropagation();
        if (anchor === originalValue) {
          s.editingPropKey = null;
          s.editInputElement = null;
          propDiv.textContent = `${propKey}: ${originalValue}`;
          propDiv.style.textDecoration = "underline";
          propDiv.style.textDecorationStyle = "dashed";
          propDiv.style.textUnderlineOffset = "2px";
        } else {
          applyEdit(elementId, propKey, anchor, slideIndex);
          commitEdit(elementId, propKey, originalValue, anchor, slideIndex);
        }
      });
      grid2.appendChild(cell);
    }
  }
  propDiv.textContent = "";
  const label = document.createElement("span");
  label.textContent = `${propKey}: `;
  label.style.color = "#999";
  propDiv.appendChild(label);
  propDiv.appendChild(grid2);
  propDiv.style.textDecoration = "none";
  s.editingPropKey = propKey;
  s.editInputElement = grid2;
  const onKeydown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      document.removeEventListener("keydown", onKeydown, true);
      s.editingPropKey = null;
      s.editInputElement = null;
      propDiv.textContent = `${propKey}: ${originalValue}`;
      propDiv.style.textDecoration = "underline";
      propDiv.style.textDecorationStyle = "dashed";
      propDiv.style.textUnderlineOffset = "2px";
    }
  };
  document.addEventListener("keydown", onKeydown, true);
  const onDocClick = (e) => {
    if (s.editingPropKey !== propKey) {
      document.removeEventListener("click", onDocClick, true);
      document.removeEventListener("keydown", onKeydown, true);
      return;
    }
    if (!propDiv.contains(e.target)) {
      document.removeEventListener("click", onDocClick, true);
      document.removeEventListener("keydown", onKeydown, true);
      s.editingPropKey = null;
      s.editInputElement = null;
      propDiv.textContent = `${propKey}: ${originalValue}`;
      propDiv.style.textDecoration = "underline";
      propDiv.style.textDecorationStyle = "dashed";
      propDiv.style.textUnderlineOffset = "2px";
    }
  };
  requestAnimationFrame(() => {
    document.addEventListener("click", onDocClick, true);
  });
}
function isElementIdProp(key) {
  return key === "fromId" || key === "toId";
}
function startElementIdEdit(elementId, propKey, currentValue, propDiv, slideIndex) {
  const s = debugController.state;
  if (s.editingPropKey === propKey) return;
  if (s.editingPropKey !== null) cancelEdit();
  const sk = window.sk;
  const def = sk?._definitions?.[slideIndex];
  if (def) {
    const foundEl = findElement(def, elementId);
    if (foundEl) {
      const live = foundEl.props[propKey];
      if (typeof live === "string") currentValue = live;
    }
  }
  const originalValue = currentValue;
  const layoutResult = sk?.layouts?.[slideIndex];
  const options = [];
  if (layoutResult?.elements) {
    for (const [id, el2] of Object.entries(layoutResult.elements)) {
      const sceneEl = el2;
      if (sceneEl.type === "connector") continue;
      if (id === elementId) continue;
      options.push(id);
    }
    options.sort();
  }
  const select = document.createElement("select");
  select.style.cssText = SELECT_STYLE;
  for (const opt of options) {
    const option = document.createElement("option");
    option.value = opt;
    option.textContent = opt;
    if (opt === currentValue) option.selected = true;
    select.appendChild(option);
  }
  propDiv.textContent = "";
  const label = document.createElement("span");
  label.textContent = `${propKey}: `;
  label.style.color = "#999";
  propDiv.appendChild(label);
  propDiv.appendChild(select);
  propDiv.style.textDecoration = "none";
  s.editingPropKey = propKey;
  s.editInputElement = select;
  select.focus();
  select.addEventListener("change", () => {
    const newVal = select.value;
    applyEdit(elementId, propKey, newVal, slideIndex);
    commitEdit(elementId, propKey, originalValue, newVal, slideIndex);
  });
  select.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      cancelEditRestore(elementId, propKey, originalValue, slideIndex);
    }
  });
  select.addEventListener("blur", () => {
    if (s.editingPropKey !== propKey) return;
    cancelEditRestore(elementId, propKey, originalValue, slideIndex);
  });
}
function startGapTokenEdit(elementId, propKey, currentValue, propDiv, slideIndex) {
  const s = debugController.state;
  if (s.editingPropKey === propKey) return;
  if (s.editingPropKey !== null) cancelEdit();
  const isConstraintGap = propKey.endsWith(".gap");
  const tokens = getSpacingTokens();
  const sk = window.sk;
  const def = sk?._definitions?.[slideIndex];
  if (def) {
    const foundEl = findElement(def, elementId);
    if (foundEl) {
      let live;
      if (isConstraintGap) {
        const axis = propKey.split(".")[0];
        const marker = foundEl.props[axis];
        if (marker && typeof marker === "object") {
          live = marker.gap;
        }
      } else {
        live = foundEl.props[propKey];
      }
      if (live !== void 0) currentValue = live;
    }
  }
  const originalValue = currentValue;
  let currentPx;
  let matchingToken = null;
  if (typeof currentValue === "string") {
    const match = tokens.find((t) => t.token === currentValue);
    currentPx = match?.px ?? 0;
    matchingToken = match ? currentValue : null;
  } else {
    currentPx = currentValue;
    const match = tokens.find((t) => t.px === currentValue);
    matchingToken = match?.token ?? null;
  }
  const select = document.createElement("select");
  select.style.cssText = SELECT_STYLE;
  if (!matchingToken) {
    const placeholder = document.createElement("option");
    placeholder.value = "__current__";
    placeholder.textContent = `${currentPx} (custom)`;
    placeholder.selected = true;
    select.appendChild(placeholder);
  }
  for (const { token, px } of tokens) {
    const option = document.createElement("option");
    option.value = token;
    option.textContent = `${token} (${px})`;
    if (matchingToken === token) option.selected = true;
    select.appendChild(option);
  }
  const customOpt = document.createElement("option");
  customOpt.value = "__custom__";
  customOpt.textContent = "Custom\u2026";
  select.appendChild(customOpt);
  propDiv.textContent = "";
  const label = document.createElement("span");
  label.textContent = isConstraintGap ? "gap=" : `${propKey}: `;
  label.style.color = "#999";
  propDiv.appendChild(label);
  propDiv.appendChild(select);
  propDiv.style.textDecoration = "none";
  s.editingPropKey = propKey;
  s.editInputElement = select;
  select.focus();
  select.addEventListener("change", () => {
    const val = select.value;
    if (val === "__custom__") {
      s.editingPropKey = null;
      s.editInputElement = null;
      startEdit(elementId, propKey, currentPx, propDiv, slideIndex);
      return;
    }
    if (val === "__current__") {
      s.editingPropKey = null;
      restorePropRowText(propKey, currentValue);
      s.editInputElement = null;
      return;
    }
    const tokenPx = tokens.find((t) => t.token === val)?.px ?? 0;
    const newVal = isConstraintGap ? tokenPx : val;
    applyEdit(elementId, propKey, newVal, slideIndex);
    commitEdit(elementId, propKey, originalValue, newVal, slideIndex);
  });
  select.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      cancelEditRestore(elementId, propKey, originalValue, slideIndex);
    }
  });
  select.addEventListener("blur", () => {
    if (s.editingPropKey !== propKey) return;
    cancelEditRestore(elementId, propKey, originalValue, slideIndex);
  });
}
function showLockedTooltip(propKey, propDiv, sceneElement) {
  const existing = document.querySelector("[data-sk-locked-tooltip]");
  if (existing) existing.remove();
  const prov = sceneElement.provenance?.[propKey];
  if (!prov) return;
  let explanation = `Controlled by ${prov.source}`;
  if (prov.source === "constraint" && prov.type) {
    explanation += `: ${prov.type}`;
    if (prov.ref) explanation += `(${prov.ref}`;
    if (prov.gap !== void 0) explanation += `, gap=${prov.gap}`;
    if (prov.ref) explanation += `)`;
  } else if (prov.source === "stack" && prov.stackId) {
    explanation += `: stack=${prov.stackId}`;
  } else if (prov.source === "transform") {
    explanation += " (layout transform)";
  }
  const tooltip = document.createElement("div");
  tooltip.setAttribute("data-sk-locked-tooltip", "true");
  tooltip.textContent = explanation;
  tooltip.style.cssText = `
    position: absolute; padding: 6px 10px; font-size: 11px;
    background: #333; color: #eee; border-radius: 4px;
    z-index: 100001; white-space: nowrap; pointer-events: none;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  `;
  const rect = propDiv.getBoundingClientRect();
  tooltip.style.left = `${rect.left}px`;
  tooltip.style.top = `${rect.bottom + 4}px`;
  document.body.appendChild(tooltip);
  setTimeout(() => {
    if (tooltip.parentNode) tooltip.remove();
  }, 2e3);
}
var EDITABLE_PROPS;
var GAP_EDIT_CONFIG;
var GAP_CONSTRAINT_TYPES;
var DEFAULT_SPACING_TOKENS;
var _applySeq;
var SELECT_STYLE;
var ANCHOR_GRID;
var init_debug_inspector_edit = __esm({
  "slidekit/src/debug-inspector-edit.ts"() {
    "use strict";
    init_debug_state();
    init_debug_inspector_diff();
    init_helpers();
    EDITABLE_PROPS = {
      x: { step: 1, min: 0, max: 1920 },
      y: { step: 1, min: 0, max: 1080 },
      w: { step: 1, min: 0, max: 1920 },
      h: { step: 1, min: 0, max: 1080 },
      opacity: { step: 0.05, min: 0, max: 1 },
      rotate: { step: 1, min: -360, max: 360 },
      gap: { step: 1, min: 0, max: 1080 },
      scale: { step: 0.05, min: 0.01, max: 10 },
      thickness: { step: 1, min: 1, max: 20 },
      cornerRadius: { step: 1, min: 0, max: 200 }
    };
    GAP_EDIT_CONFIG = { step: 1, min: 0, max: 500 };
    GAP_CONSTRAINT_TYPES = /* @__PURE__ */ new Set(["below", "above", "rightOf", "leftOf"]);
    DEFAULT_SPACING_TOKENS = {
      xs: 8,
      sm: 16,
      md: 24,
      lg: 32,
      xl: 48,
      section: 80
    };
    _applySeq = 0;
    SELECT_STYLE = `
  padding: 2px 4px; font-size: 12px;
  font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
  border: 1px solid #4a9eff; border-radius: 3px;
  background: #fff; color: #1a1a2e; outline: none;
  box-shadow: 0 0 3px rgba(74, 158, 255, 0.3);
  cursor: pointer;
`;
    ANCHOR_GRID = [
      ["tl", "tc", "tr"],
      ["cl", "cc", "cr"],
      ["bl", "bc", "br"]
    ];
  }
});
function snapToGrid(value, gridSize) {
  return Math.round(value / gridSize) * gridSize;
}
function getCurrentLayer() {
  const layers = document.querySelectorAll(".slidekit-layer");
  return layers[_currentSlideIndex] ?? null;
}
function getSlideCoordMapper() {
  const layer = getCurrentLayer();
  if (!layer) return null;
  const layerRect = layer.getBoundingClientRect();
  if (layerRect.width === 0 || layerRect.height === 0) return null;
  return {
    layerRect,
    scaleX: _slideW / layerRect.width,
    scaleY: _slideH / layerRect.height
  };
}
function getEditableAxes(sceneEl) {
  const p = sceneEl.provenance;
  return {
    x: !LOCKED_SOURCES.has(p.x.source),
    y: !LOCKED_SOURCES.has(p.y.source),
    w: !LOCKED_SOURCES.has(p.w.source),
    h: !LOCKED_SOURCES.has(p.h.source)
  };
}
function getHandleEligibility(axes) {
  return {
    e: axes.w,
    w: axes.w && axes.x,
    n: axes.h && axes.y,
    s: axes.h,
    ne: axes.h && axes.y && axes.w,
    nw: axes.h && axes.y && axes.w && axes.x,
    se: axes.h && axes.w,
    sw: axes.h && axes.w && axes.x
  };
}
function canMove(axes) {
  return axes.x || axes.y;
}
function findElement2(definition, elementId) {
  const { flatMap } = flattenElements(definition.elements);
  return flatMap.get(elementId);
}
function getSceneElement(elementId, slideIndex) {
  const sk = window.sk;
  return sk?.layouts?.[slideIndex]?.elements?.[elementId];
}
function getAllSceneElements(slideIndex) {
  const sk = window.sk;
  return sk?.layouts?.[slideIndex]?.elements ?? {};
}
function createProxyRect(bounds) {
  const proxy = document.createElement("div");
  proxy.setAttribute("data-sk-debug", "drag-proxy");
  proxy.style.position = "absolute";
  proxy.style.left = `${bounds.x}px`;
  proxy.style.top = `${bounds.y}px`;
  proxy.style.width = `${bounds.w}px`;
  proxy.style.height = `${bounds.h}px`;
  proxy.style.border = "2px dashed #4a9eff";
  proxy.style.background = "rgba(74, 158, 255, 0.1)";
  proxy.style.boxSizing = "border-box";
  proxy.style.pointerEvents = "none";
  proxy.style.zIndex = "10001";
  const overlay = debugController.state.debugOverlay;
  if (overlay) overlay.appendChild(proxy);
  return proxy;
}
function updateProxyRect(proxy, rect) {
  proxy.style.left = `${rect.x}px`;
  proxy.style.top = `${rect.y}px`;
  proxy.style.width = `${rect.w}px`;
  proxy.style.height = `${rect.h}px`;
}
function computeNewBounds(original, dxSlide, dySlide, mode, axes, handlePos, enableSnap = true) {
  let { x, y, w, h } = original;
  const grid2 = enableSnap ? DEFAULT_SNAP_GRID : 0;
  if (mode === "move") {
    if (axes.x) {
      x = original.x + dxSlide;
      if (grid2) x = snapToGrid(x, grid2);
    }
    if (axes.y) {
      y = original.y + dySlide;
      if (grid2) y = snapToGrid(y, grid2);
    }
  } else if (mode === "resize" && handlePos) {
    const hasE = handlePos.includes("e");
    const hasW = handlePos.includes("w");
    const hasS = handlePos.includes("s");
    const hasN = handlePos.includes("n");
    if (hasE && axes.w) {
      w = Math.max(MIN_ELEMENT_SIZE, original.w + dxSlide);
      if (grid2) w = snapToGrid(w, grid2);
    }
    if (hasW && axes.w && axes.x) {
      let newW = Math.max(MIN_ELEMENT_SIZE, original.w - dxSlide);
      if (grid2) newW = snapToGrid(newW, grid2);
      x = original.x + (original.w - newW);
      w = newW;
    }
    if (hasS && axes.h) {
      h = Math.max(MIN_ELEMENT_SIZE, original.h + dySlide);
      if (grid2) h = snapToGrid(h, grid2);
    }
    if (hasN && axes.h && axes.y) {
      let newH = Math.max(MIN_ELEMENT_SIZE, original.h - dySlide);
      if (grid2) newH = snapToGrid(newH, grid2);
      y = original.y + (original.h - newH);
      h = newH;
    }
  }
  if (x < 0) {
    if (mode === "resize") w += x;
    x = 0;
  }
  if (y < 0) {
    if (mode === "resize") h += y;
    y = 0;
  }
  if (x + w > _slideW) w = _slideW - x;
  if (y + h > _slideH) h = _slideH - y;
  w = Math.max(MIN_ELEMENT_SIZE, w);
  h = Math.max(MIN_ELEMENT_SIZE, h);
  return { x, y, w, h };
}
function onLayerPointerDown(event) {
  if (event.button !== 0) return;
  if (_dragState) return;
  const s = debugController.state;
  if (!s.debugOverlay) return;
  const target = event.target;
  if (target?.closest('[data-sk-role="debug-inspector"]')) return;
  if (target?.closest('[data-sk-debug="resize-handle"]')) return;
  const skEl = target?.closest("[data-sk-id]");
  if (!skEl) return;
  const elementId = skEl.getAttribute("data-sk-id");
  if (!elementId) return;
  const sceneEl = getSceneElement(elementId, s.currentSlideIndex);
  if (!sceneEl?.resolved) return;
  const axes = getEditableAxes(sceneEl);
  if (!canMove(axes)) {
    skEl.style.cursor = "not-allowed";
    setTimeout(() => {
      skEl.style.cursor = "";
    }, 500);
    return;
  }
  const mapper = getSlideCoordMapper();
  if (!mapper) return;
  const sk = window.sk;
  const definition = sk?._definitions?.[s.currentSlideIndex];
  if (!definition) return;
  const defElement = findElement2(definition, elementId);
  if (!defElement) return;
  const props = defElement.props;
  const originalProps = {};
  if (axes.x && typeof props.x === "number") originalProps.x = props.x;
  if (axes.y && typeof props.y === "number") originalProps.y = props.y;
  _dragState = {
    mode: "move",
    elementId,
    slideIndex: s.currentSlideIndex,
    pointerId: event.pointerId,
    captureTarget: null,
    startClientX: event.clientX,
    startClientY: event.clientY,
    originalBounds: absoluteBounds(sceneEl, getAllSceneElements(s.currentSlideIndex)),
    originalProps,
    editableAxes: axes,
    mapper,
    dragging: false,
    proxyRect: null,
    rafId: null
  };
  document.addEventListener("pointermove", _onPointerMoveBound);
  document.addEventListener("pointerup", _onPointerUpBound);
  document.addEventListener("pointercancel", _onPointerCancelBound);
  document.addEventListener("keydown", _onKeyDownBound, true);
  event.preventDefault();
}
function onHandlePointerDown(event) {
  if (event.button !== 0) return;
  if (_dragState) return;
  const handle = event.target.closest("[data-sk-handle-pos]");
  if (!handle) return;
  const pos = handle.getAttribute("data-sk-handle-pos");
  if (!pos) return;
  const s = debugController.state;
  if (!s.selectedElementId || !s.debugOverlay) return;
  const sceneEl = getSceneElement(s.selectedElementId, s.currentSlideIndex);
  if (!sceneEl?.resolved) return;
  const axes = getEditableAxes(sceneEl);
  const mapper = getSlideCoordMapper();
  if (!mapper) return;
  const sk = window.sk;
  const definition = sk?._definitions?.[s.currentSlideIndex];
  if (!definition) return;
  const defElement = findElement2(definition, s.selectedElementId);
  if (!defElement) return;
  const props = defElement.props;
  const originalProps = {};
  if (typeof props.x === "number") originalProps.x = props.x;
  if (typeof props.y === "number") originalProps.y = props.y;
  if (typeof props.w === "number") originalProps.w = props.w;
  if (typeof props.h === "number") originalProps.h = props.h;
  _dragState = {
    mode: "resize",
    elementId: s.selectedElementId,
    slideIndex: s.currentSlideIndex,
    pointerId: event.pointerId,
    captureTarget: handle,
    startClientX: event.clientX,
    startClientY: event.clientY,
    originalBounds: absoluteBounds(sceneEl, getAllSceneElements(s.currentSlideIndex)),
    originalProps,
    editableAxes: axes,
    handlePosition: pos,
    mapper,
    dragging: false,
    proxyRect: null,
    rafId: null
  };
  _dragState.dragging = true;
  _dragState.proxyRect = createProxyRect(absoluteBounds(sceneEl, getAllSceneElements(s.currentSlideIndex)));
  debugController.state.dragInProgress = true;
  try {
    handle.setPointerCapture(event.pointerId);
  } catch (_) {
  }
  document.addEventListener("pointermove", _onPointerMoveBound);
  document.addEventListener("pointerup", _onPointerUpBound);
  document.addEventListener("pointercancel", _onPointerCancelBound);
  document.addEventListener("keydown", _onKeyDownBound, true);
  event.preventDefault();
  event.stopPropagation();
}
function onPointerMove(event) {
  if (!_dragState) return;
  const dx = event.clientX - _dragState.startClientX;
  const dy = event.clientY - _dragState.startClientY;
  if (!_dragState.dragging) {
    if (Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD) return;
    _dragState.dragging = true;
    debugController.state.dragInProgress = true;
    _dragState.proxyRect = createProxyRect(_dragState.originalBounds);
    const layer = getCurrentLayer();
    if (layer) {
      try {
        layer.setPointerCapture(_dragState.pointerId);
        _dragState.captureTarget = layer;
      } catch (_) {
      }
    }
    const s = debugController.state;
    if (s.selectedElementId !== _dragState.elementId) {
      s.selectedElementId = _dragState.elementId;
      debugController.callbacks.renderElementDetail?.(_dragState.elementId, _dragState.slideIndex);
    }
  }
  if (_dragState.rafId !== null) return;
  const clientX = event.clientX;
  const clientY = event.clientY;
  const shiftKey = event.shiftKey;
  _dragState.rafId = requestAnimationFrame(() => {
    if (!_dragState || !_dragState.proxyRect) return;
    _dragState.rafId = null;
    const dxSlide = (clientX - _dragState.startClientX) * _dragState.mapper.scaleX;
    const dySlide = (clientY - _dragState.startClientY) * _dragState.mapper.scaleY;
    const newBounds = computeNewBounds(
      _dragState.originalBounds,
      dxSlide,
      dySlide,
      _dragState.mode,
      _dragState.editableAxes,
      _dragState.handlePosition,
      !shiftKey
      // snap enabled unless Shift held
    );
    updateProxyRect(_dragState.proxyRect, newBounds);
  });
}
async function onPointerUp(event) {
  if (!_dragState) return;
  removeDocumentListeners();
  if (_dragState.rafId !== null) {
    cancelAnimationFrame(_dragState.rafId);
  }
  if (!_dragState.dragging) {
    _dragState = null;
    return;
  }
  const dx = (event.clientX - _dragState.startClientX) * _dragState.mapper.scaleX;
  const dy = (event.clientY - _dragState.startClientY) * _dragState.mapper.scaleY;
  const finalBounds = computeNewBounds(
    _dragState.originalBounds,
    dx,
    dy,
    _dragState.mode,
    _dragState.editableAxes,
    _dragState.handlePosition,
    !event.shiftKey
    // snap enabled unless Shift held
  );
  if (_dragState.proxyRect?.parentNode) {
    _dragState.proxyRect.parentNode.removeChild(_dragState.proxyRect);
  }
  debugController.state.dragInProgress = true;
  const state2 = _dragState;
  _dragState = null;
  await commitDrag(state2, finalBounds);
  requestAnimationFrame(() => {
    debugController.state.dragInProgress = false;
  });
}
function onPointerCancel(_event) {
  cancelDrag();
}
function onKeyDown(event) {
  if (event.key === "Escape" && _dragState) {
    event.preventDefault();
    event.stopPropagation();
    cancelDrag();
  }
}
async function commitDrag(state2, finalBounds) {
  const { elementId, slideIndex, originalBounds, originalProps, editableAxes } = state2;
  const changes = [];
  if (editableAxes.x && Math.round(finalBounds.x) !== Math.round(originalBounds.x) && originalProps.x !== void 0) {
    const dx = finalBounds.x - originalBounds.x;
    changes.push({ propKey: "x", oldValue: originalProps.x, newValue: Math.round(originalProps.x + dx) });
  }
  if (editableAxes.y && Math.round(finalBounds.y) !== Math.round(originalBounds.y) && originalProps.y !== void 0) {
    const dy = finalBounds.y - originalBounds.y;
    changes.push({ propKey: "y", oldValue: originalProps.y, newValue: Math.round(originalProps.y + dy) });
  }
  if (editableAxes.w && Math.round(finalBounds.w) !== Math.round(originalBounds.w) && originalProps.w !== void 0) {
    changes.push({ propKey: "w", oldValue: originalProps.w, newValue: Math.round(finalBounds.w) });
  }
  if (editableAxes.h && Math.round(finalBounds.h) !== Math.round(originalBounds.h) && originalProps.h !== void 0) {
    changes.push({ propKey: "h", oldValue: originalProps.h, newValue: Math.round(finalBounds.h) });
  }
  if (changes.length === 0) return;
  const sk = window.sk;
  const definition = sk?._definitions?.[slideIndex];
  if (!definition) return;
  const element = findElement2(definition, elementId);
  if (!element) return;
  const props = element.props;
  for (const { propKey, newValue } of changes) {
    props[propKey] = newValue;
  }
  const rerender = sk._rerenderSlide;
  if (rerender) {
    await rerender(slideIndex, definition);
  }
  const s = debugController.state;
  for (const { propKey, oldValue, newValue } of changes) {
    s.undoStack.push({ elementId, propKey, oldValue, newValue, slideIndex });
  }
  s.redoStack.length = 0;
  updateDiffDirtyIndicator();
  debugController.callbacks.refreshOverlayOnly?.(slideIndex);
  if (s.selectedElementId === elementId) {
    debugController.callbacks.renderElementDetail?.(elementId, slideIndex);
  }
}
function cancelDrag() {
  if (!_dragState) return;
  removeDocumentListeners();
  if (_dragState.rafId !== null) {
    cancelAnimationFrame(_dragState.rafId);
  }
  if (_dragState.proxyRect?.parentNode) {
    _dragState.proxyRect.parentNode.removeChild(_dragState.proxyRect);
  }
  _dragState = null;
  debugController.state.dragInProgress = false;
}
function removeDocumentListeners() {
  document.removeEventListener("pointermove", _onPointerMoveBound);
  document.removeEventListener("pointerup", _onPointerUpBound);
  document.removeEventListener("pointercancel", _onPointerCancelBound);
  document.removeEventListener("keydown", _onKeyDownBound, true);
}
function getHandlePositionCoords(r, pos) {
  const half = HANDLE_SIZE / 2;
  switch (pos) {
    case "n":
      return { left: r.x + r.w / 2 - half, top: r.y - half };
    case "s":
      return { left: r.x + r.w / 2 - half, top: r.y + r.h - half };
    case "e":
      return { left: r.x + r.w - half, top: r.y + r.h / 2 - half };
    case "w":
      return { left: r.x - half, top: r.y + r.h / 2 - half };
    case "ne":
      return { left: r.x + r.w - half, top: r.y - half };
    case "nw":
      return { left: r.x - half, top: r.y - half };
    case "se":
      return { left: r.x + r.w - half, top: r.y + r.h - half };
    case "sw":
      return { left: r.x - half, top: r.y + r.h - half };
  }
}
function renderResizeHandles(elementId, slideIndex) {
  removeResizeHandles();
  const s = debugController.state;
  if (!s.debugOverlay) return;
  const sceneEl = getSceneElement(elementId, slideIndex);
  if (!sceneEl?.resolved) return;
  const axes = getEditableAxes(sceneEl);
  const eligibility = getHandleEligibility(axes);
  const r = absoluteBounds(sceneEl, getAllSceneElements(slideIndex));
  for (const pos of HANDLE_POSITIONS) {
    const eligible = eligibility[pos];
    const { left, top } = getHandlePositionCoords(r, pos);
    const handle = document.createElement("div");
    handle.setAttribute("data-sk-debug", "resize-handle");
    handle.setAttribute("data-sk-handle-pos", pos);
    handle.style.position = "absolute";
    handle.style.left = `${left}px`;
    handle.style.top = `${top}px`;
    handle.style.width = `${HANDLE_SIZE}px`;
    handle.style.height = `${HANDLE_SIZE}px`;
    handle.style.boxSizing = "border-box";
    handle.style.zIndex = "10002";
    handle.style.pointerEvents = "auto";
    if (eligible) {
      handle.style.background = "#fff";
      handle.style.border = "1px solid #4a9eff";
      handle.style.cursor = HANDLE_CURSORS[pos];
      handle.addEventListener("pointerdown", onHandlePointerDown);
    } else {
      handle.style.background = "#ccc";
      handle.style.border = "1px solid #999";
      handle.style.cursor = "not-allowed";
      handle.style.opacity = "0.5";
    }
    s.debugOverlay.appendChild(handle);
  }
}
function removeResizeHandles() {
  const s = debugController.state;
  if (!s.debugOverlay) return;
  const handles = s.debugOverlay.querySelectorAll('[data-sk-debug="resize-handle"]');
  handles.forEach((h) => h.remove());
}
function attachDragHandlers() {
  const s = debugController.state;
  _currentSlideIndex = s.currentSlideIndex;
  const sk = window.sk;
  _slideW = sk?._config?.slide?.w ?? 1920;
  _slideH = sk?._config?.slide?.h ?? 1080;
  reattachLayerListener();
}
function reattachLayerListener() {
  detachLayerListener();
  const layer = getCurrentLayer();
  if (!layer) return;
  layer.addEventListener("pointerdown", onLayerPointerDown);
  _layerListenerAttached = true;
}
function detachLayerListener() {
  if (!_layerListenerAttached) return;
  const layers = document.querySelectorAll(".slidekit-layer");
  for (const layer of layers) {
    layer.removeEventListener("pointerdown", onLayerPointerDown);
  }
  _layerListenerAttached = false;
}
function detachDragHandlers() {
  detachLayerListener();
  cancelDrag();
  removeResizeHandles();
}
function refreshDragState(slideIndex) {
  _currentSlideIndex = slideIndex;
  reattachLayerListener();
  const s = debugController.state;
  if (s.selectedElementId) {
    renderResizeHandles(s.selectedElementId, slideIndex);
  }
}
var DRAG_THRESHOLD;
var HANDLE_SIZE;
var MIN_ELEMENT_SIZE;
var LOCKED_SOURCES;
var DEFAULT_SNAP_GRID;
var _dragState;
var _currentSlideIndex;
var _slideW;
var _slideH;
var _layerListenerAttached;
var _onPointerMoveBound;
var _onPointerUpBound;
var _onPointerCancelBound;
var _onKeyDownBound;
var HANDLE_POSITIONS;
var HANDLE_CURSORS;
var init_debug_inspector_drag = __esm({
  "slidekit/src/debug-inspector-drag.ts"() {
    "use strict";
    init_debug_state();
    init_debug_inspector_diff();
    init_helpers();
    init_debug_overlay();
    DRAG_THRESHOLD = 5;
    HANDLE_SIZE = 8;
    MIN_ELEMENT_SIZE = 10;
    LOCKED_SOURCES = /* @__PURE__ */ new Set(["constraint", "stack", "transform"]);
    DEFAULT_SNAP_GRID = 10;
    _dragState = null;
    _currentSlideIndex = 0;
    _slideW = 1920;
    _slideH = 1080;
    _layerListenerAttached = false;
    _onPointerMoveBound = onPointerMove;
    _onPointerUpBound = onPointerUp;
    _onPointerCancelBound = onPointerCancel;
    _onKeyDownBound = onKeyDown;
    HANDLE_POSITIONS = ["n", "s", "e", "w", "ne", "nw", "se", "sw"];
    HANDLE_CURSORS = {
      n: "ns-resize",
      s: "ns-resize",
      e: "ew-resize",
      w: "ew-resize",
      ne: "nesw-resize",
      sw: "nesw-resize",
      nw: "nwse-resize",
      se: "nwse-resize"
    };
  }
});
function typesForAxis(axis) {
  return axis === "y" ? Y_AXIS_TYPES : X_AXIS_TYPES;
}
function axisForType(type) {
  if (Y_AXIS_TYPES.includes(type)) return "y";
  if (X_AXIS_TYPES.includes(type)) return "x";
  return null;
}
function dimensionAxisForType(type) {
  if (W_AXIS_TYPES.includes(type)) return "w";
  if (H_AXIS_TYPES.includes(type)) return "h";
  return null;
}
function findElement3(definition, elementId) {
  const { flatMap } = flattenElements(definition.elements);
  return flatMap.get(elementId);
}
function updateConstraintHighlight(elementId, axis, _slideIndex) {
  const s = debugController.state;
  if (!s.debugOverlay) return;
  const existing = s.debugOverlay.querySelectorAll('[data-sk-debug="rel-highlight"]');
  existing.forEach((el2) => el2.remove());
  const svgEl = s.debugOverlay.querySelector('[data-sk-debug="relationships"]');
  if (!svgEl) return;
  const arrows = svgEl.querySelectorAll('[data-sk-debug="rel-arrow"]');
  let targetLine = null;
  for (const arrow of arrows) {
    if (arrow.getAttribute("data-sk-debug-to") === elementId && arrow.getAttribute("data-sk-debug-axis") === axis) {
      targetLine = arrow;
      break;
    }
  }
  if (!targetLine) return;
  const NS = "http://www.w3.org/2000/svg";
  const glow = document.createElementNS(NS, "line");
  glow.setAttribute("x1", targetLine.getAttribute("x1"));
  glow.setAttribute("y1", targetLine.getAttribute("y1"));
  glow.setAttribute("x2", targetLine.getAttribute("x2"));
  glow.setAttribute("y2", targetLine.getAttribute("y2"));
  glow.setAttribute("stroke", "rgba(74, 158, 255, 0.5)");
  glow.setAttribute("stroke-width", "5");
  glow.setAttribute("pointer-events", "none");
  glow.setAttribute("data-sk-debug", "rel-highlight");
  targetLine.parentNode.insertBefore(glow, targetLine);
}
function removeConstraintHighlight() {
  const s = debugController.state;
  if (!s.debugOverlay) return;
  const existing = s.debugOverlay.querySelectorAll('[data-sk-debug="rel-highlight"]');
  existing.forEach((el2) => el2.remove());
}
function clearConstraintSelection() {
  const s = debugController.state;
  s.selectedConstraint = null;
  removeConstraintHighlight();
}
async function breakConstraint(elementId, axis, slideIndex) {
  const sk = window.sk;
  if (!sk?._definitions?.[slideIndex] || !sk?.layouts?.[slideIndex]) return;
  const layoutResult = sk.layouts[slideIndex];
  const sceneEl = layoutResult.elements[elementId];
  if (!sceneEl?.resolved) return;
  const definition = sk._definitions[slideIndex];
  const element = findElement3(definition, elementId);
  if (!element) return;
  const props = element.props;
  const oldValue = props[axis];
  const resolvedPos = axis === "x" ? sceneEl.resolved.x : sceneEl.resolved.y;
  props[axis] = resolvedPos;
  const rerender = sk._rerenderSlide;
  if (!rerender) return;
  await rerender(slideIndex, definition);
  const s = debugController.state;
  s.undoStack.push({ elementId, propKey: axis, oldValue, newValue: resolvedPos, slideIndex });
  s.redoStack.length = 0;
  updateDiffDirtyIndicator();
  debugController.callbacks.renderDebugOverlay?.({ slideIndex, showInspector: false });
  clearConstraintSelection();
  s.selectedElementId = elementId;
  debugController.callbacks.renderElementDetail?.(elementId, slideIndex);
}
async function changeConstraintType(elementId, currentAxis, newType, slideIndex) {
  const sk = window.sk;
  if (!sk?._definitions?.[slideIndex] || !sk?.layouts?.[slideIndex]) return;
  const layoutResult = sk.layouts[slideIndex];
  const sceneEl = layoutResult.elements[elementId];
  if (!sceneEl?.resolved) return;
  const definition = sk._definitions[slideIndex];
  const element = findElement3(definition, elementId);
  if (!element) return;
  const props = element.props;
  const newAxis = axisForType(newType);
  if (!newAxis) return;
  const s = debugController.state;
  if (newAxis === currentAxis) {
    const marker = props[currentAxis];
    if (!marker || typeof marker !== "object" || !("_rel" in marker)) return;
    const oldValue = JSON.parse(JSON.stringify(marker));
    marker._rel = newType;
    if (DIRECTIONAL_TYPES.has(newType)) {
      if (marker.gap === void 0) marker.gap = 0;
    } else {
      delete marker.gap;
    }
    if (REFLESS_TYPES.has(newType)) {
      delete marker.ref;
    }
    const rerender = sk._rerenderSlide;
    if (!rerender) return;
    await rerender(slideIndex, definition);
    const newValue = JSON.parse(JSON.stringify(marker));
    s.undoStack.push({ elementId, propKey: currentAxis, oldValue, newValue, slideIndex });
    s.redoStack.length = 0;
  } else {
    const oldMarker = props[currentAxis];
    if (!oldMarker || typeof oldMarker !== "object" || !("_rel" in oldMarker)) return;
    const oldAxisOldValue = JSON.parse(JSON.stringify(oldMarker));
    const newAxisOldValue = props[newAxis];
    const resolvedOld = currentAxis === "x" ? sceneEl.resolved.x : sceneEl.resolved.y;
    const newMarker = {
      _rel: newType
    };
    if (!REFLESS_TYPES.has(newType)) {
      newMarker.ref = oldMarker.ref;
    }
    if (DIRECTIONAL_TYPES.has(newType)) {
      newMarker.gap = oldMarker.gap ?? 0;
    }
    props[currentAxis] = resolvedOld;
    props[newAxis] = newMarker;
    const rerender = sk._rerenderSlide;
    if (!rerender) return;
    await rerender(slideIndex, definition);
    const compound = {
      compound: true,
      entries: [
        { elementId, propKey: currentAxis, oldValue: oldAxisOldValue, newValue: resolvedOld, slideIndex },
        { elementId, propKey: newAxis, oldValue: newAxisOldValue, newValue: JSON.parse(JSON.stringify(newMarker)), slideIndex }
      ]
    };
    s.undoStack.push(compound);
    s.redoStack.length = 0;
  }
  updateDiffDirtyIndicator();
  debugController.callbacks.renderDebugOverlay?.({ slideIndex, showInspector: false });
  s.selectedConstraint = { elementId, axis: newAxis };
  renderConstraintDetail(elementId, newAxis, slideIndex);
  updateConstraintHighlight(elementId, newAxis, slideIndex);
}
async function addConstraint(elementId, axis, constraintType, refId, gap, slideIndex) {
  const sk = window.sk;
  if (!sk?._definitions?.[slideIndex]) return;
  const definition = sk._definitions[slideIndex];
  const element = findElement3(definition, elementId);
  if (!element) return;
  const props = element.props;
  const dimAxis = dimensionAxisForType(constraintType);
  const propKey = dimAxis ?? axis;
  const oldValue = props[propKey];
  const newMarker = {
    _rel: constraintType
  };
  if (!REFLESS_TYPES.has(constraintType)) {
    newMarker.ref = refId;
  }
  if (DIRECTIONAL_TYPES.has(constraintType)) {
    newMarker.gap = Math.round(gap);
  }
  props[propKey] = newMarker;
  const rerender = sk._rerenderSlide;
  if (!rerender) return;
  await rerender(slideIndex, definition);
  const s = debugController.state;
  s.undoStack.push({
    elementId,
    propKey,
    oldValue,
    newValue: JSON.parse(JSON.stringify(newMarker)),
    slideIndex
  });
  s.redoStack.length = 0;
  updateDiffDirtyIndicator();
  debugController.callbacks.renderDebugOverlay?.({ slideIndex, showInspector: false });
  if (dimAxis) {
    s.selectedElementId = elementId;
    debugController.callbacks.renderElementDetail?.(elementId, slideIndex);
  } else {
    s.selectedElementId = null;
    s.selectedConstraint = { elementId, axis };
    renderConstraintDetail(elementId, axis, slideIndex);
    updateConstraintHighlight(elementId, axis, slideIndex);
  }
}
async function addGroupConstraint(elementId, axis, constraintType, groupName, slideIndex) {
  const sk = window.sk;
  if (!sk?._definitions?.[slideIndex]) return;
  const definition = sk._definitions[slideIndex];
  const element = findElement3(definition, elementId);
  if (!element) return;
  const props = element.props;
  const oldValue = props[axis];
  const newMarker = {
    _rel: constraintType,
    group: groupName
  };
  props[axis] = newMarker;
  const rerender = sk._rerenderSlide;
  if (!rerender) return;
  await rerender(slideIndex, definition);
  const s = debugController.state;
  s.undoStack.push({
    elementId,
    propKey: axis,
    oldValue,
    newValue: JSON.parse(JSON.stringify(newMarker)),
    slideIndex
  });
  s.redoStack.length = 0;
  updateDiffDirtyIndicator();
  debugController.callbacks.renderDebugOverlay?.({ slideIndex, showInspector: false });
  s.selectedElementId = elementId;
  debugController.callbacks.renderElementDetail?.(elementId, slideIndex);
}
async function addReflessConstraint(elementId, axis, constraintType, slideIndex) {
  const sk = window.sk;
  if (!sk?._definitions?.[slideIndex]) return;
  const definition = sk._definitions[slideIndex];
  const element = findElement3(definition, elementId);
  if (!element) return;
  const props = element.props;
  const oldValue = props[axis];
  const newMarker = {
    _rel: constraintType
  };
  props[axis] = newMarker;
  const rerender = sk._rerenderSlide;
  if (!rerender) return;
  await rerender(slideIndex, definition);
  const s = debugController.state;
  s.undoStack.push({
    elementId,
    propKey: axis,
    oldValue,
    newValue: JSON.parse(JSON.stringify(newMarker)),
    slideIndex
  });
  s.redoStack.length = 0;
  updateDiffDirtyIndicator();
  debugController.callbacks.renderDebugOverlay?.({ slideIndex, showInspector: false });
  s.selectedElementId = elementId;
  debugController.callbacks.renderElementDetail?.(elementId, slideIndex);
}
function renderConstraintDetail(elementId, axis, slideIndex) {
  const s = debugController.state;
  const body = s.inspectorPanel?.querySelector("[data-sk-inspector-body]");
  if (!body) return;
  body.innerHTML = "";
  const sk = typeof window !== "undefined" ? window.sk : null;
  if (!sk?.layouts?.[slideIndex]) return;
  const layoutResult = sk.layouts[slideIndex];
  const sceneEl = layoutResult.elements[elementId];
  if (!sceneEl) return;
  const def = sk._definitions?.[slideIndex];
  const element = def ? findElement3(def, elementId) : void 0;
  const props = element?.props;
  const marker = props?.[axis];
  if (!marker || typeof marker !== "object" || !("_rel" in marker)) {
    body.innerHTML = '<div style="padding:24px 16px;color:#888;text-align:center;font-style:italic;">No constraint found</div>';
    return;
  }
  const relMarker = marker;
  const constraintType = relMarker._rel;
  const refId = relMarker.ref ?? "(none)";
  const identityDiv = document.createElement("div");
  identityDiv.innerHTML = `
    <div style="margin-bottom:6px;"><strong style="color:#1a1a2e;font-size:14px;">Constraint</strong>${badge(constraintType, "#ff8c32")}</div>
    <div style="margin-bottom:2px;">Element: <span style="color:#1a1a2e;">${escapeHtml(elementId)}</span></div>
    <div style="margin-bottom:2px;">Reference: <span style="color:#1a1a2e;">${escapeHtml(refId)}</span></div>
    <div style="margin-bottom:2px;">Axis: <span style="color:#1a1a2e;">${axis}</span></div>
  `;
  body.appendChild(createSection("Identity", identityDiv));
  const propsDiv = document.createElement("div");
  const typeRow = document.createElement("div");
  typeRow.style.padding = "2px 0";
  const typeLabel = document.createElement("span");
  typeLabel.textContent = "type: ";
  typeLabel.style.color = "#999";
  typeRow.appendChild(typeLabel);
  const typeValue = document.createElement("span");
  typeValue.textContent = constraintType;
  typeValue.style.color = "#1a1a2e";
  typeValue.style.textDecoration = "underline";
  typeValue.style.textDecorationStyle = "dashed";
  typeValue.style.textUnderlineOffset = "2px";
  typeValue.style.cursor = "pointer";
  typeValue.addEventListener("mouseenter", () => {
    typeValue.style.background = "#e8f0fe";
  });
  typeValue.addEventListener("mouseleave", () => {
    typeValue.style.background = "";
  });
  typeValue.addEventListener("click", (e) => {
    e.stopPropagation();
    showTypeDropdown(elementId, axis, constraintType, typeRow, slideIndex);
  });
  typeRow.appendChild(typeValue);
  propsDiv.appendChild(typeRow);
  if (DIRECTIONAL_TYPES.has(constraintType) && relMarker.gap !== void 0) {
    const gapRow = document.createElement("div");
    gapRow.style.padding = "2px 0";
    gapRow.textContent = `gap: ${relMarker.gap}`;
    gapRow.style.color = "#1a1a2e";
    gapRow.style.textDecoration = "underline";
    gapRow.style.textDecorationStyle = "dashed";
    gapRow.style.textUnderlineOffset = "2px";
    gapRow.style.cursor = "pointer";
    gapRow.addEventListener("mouseenter", () => {
      gapRow.style.background = "#e8f0fe";
    });
    gapRow.addEventListener("mouseleave", () => {
      gapRow.style.background = "";
    });
    gapRow.addEventListener("click", (e) => {
      e.stopPropagation();
      Promise.resolve().then(() => (init_debug_inspector_edit(), debug_inspector_edit_exports)).then((mod) => {
        mod.startGapTokenEdit(elementId, `${axis}.gap`, relMarker.gap, gapRow, slideIndex);
      });
    });
    propsDiv.appendChild(gapRow);
  }
  body.appendChild(createSection("Properties", propsDiv));
  const actionsDiv = document.createElement("div");
  const breakBtn = document.createElement("button");
  breakBtn.textContent = "Unlock";
  breakBtn.style.cssText = `
    padding: 6px 12px; font-size: 12px; cursor: pointer;
    font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
    background: #fff; color: #ea4335; border: 1px solid #ea4335;
    border-radius: 4px; font-weight: 600;
  `;
  breakBtn.addEventListener("mouseenter", () => {
    breakBtn.style.background = "#ea4335";
    breakBtn.style.color = "#fff";
  });
  breakBtn.addEventListener("mouseleave", () => {
    breakBtn.style.background = "#fff";
    breakBtn.style.color = "#ea4335";
  });
  breakBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    breakConstraint(elementId, axis, slideIndex);
  });
  actionsDiv.appendChild(breakBtn);
  body.appendChild(createSection("Actions", actionsDiv));
}
function showTypeDropdown(elementId, currentAxis, currentType, typeRow, slideIndex) {
  const sameAxisTypes = typesForAxis(currentAxis);
  const otherAxis = currentAxis === "x" ? "y" : "x";
  const crossAxisTypes = typesForAxis(otherAxis);
  const select = document.createElement("select");
  select.style.cssText = `
    padding: 2px 4px; font-size: 12px;
    font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
    border: 1px solid #4a9eff; border-radius: 3px;
    background: #fff; color: #1a1a2e; outline: none;
    box-shadow: 0 0 3px rgba(74, 158, 255, 0.3);
    cursor: pointer;
  `;
  const sameGroup = document.createElement("optgroup");
  sameGroup.label = `${currentAxis}-axis`;
  for (const type of sameAxisTypes) {
    const opt = document.createElement("option");
    opt.value = type;
    opt.textContent = type;
    if (type === currentType) opt.selected = true;
    sameGroup.appendChild(opt);
  }
  select.appendChild(sameGroup);
  const crossGroup = document.createElement("optgroup");
  crossGroup.label = `${otherAxis}-axis`;
  for (const type of crossAxisTypes) {
    const opt = document.createElement("option");
    opt.value = type;
    opt.textContent = type;
    crossGroup.appendChild(opt);
  }
  select.appendChild(crossGroup);
  typeRow.textContent = "";
  const label = document.createElement("span");
  label.textContent = "type: ";
  label.style.color = "#999";
  typeRow.appendChild(label);
  typeRow.appendChild(select);
  select.focus();
  let committed = false;
  select.addEventListener("change", () => {
    committed = true;
    const newType = select.value;
    if (newType !== currentType) {
      changeConstraintType(elementId, currentAxis, newType, slideIndex);
    } else {
      renderConstraintDetail(elementId, currentAxis, slideIndex);
    }
  });
  select.addEventListener("blur", () => {
    if (committed) return;
    renderConstraintDetail(elementId, currentAxis, slideIndex);
    updateConstraintHighlight(elementId, currentAxis, slideIndex);
  });
  select.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      renderConstraintDetail(elementId, currentAxis, slideIndex);
      updateConstraintHighlight(elementId, currentAxis, slideIndex);
    }
  });
}
var Y_AXIS_TYPES;
var X_AXIS_TYPES;
var W_AXIS_TYPES;
var H_AXIS_TYPES;
var DIRECTIONAL_TYPES;
var REFLESS_TYPES;
var init_debug_inspector_constraint = __esm({
  "slidekit/src/debug-inspector-constraint.ts"() {
    "use strict";
    init_debug_state();
    init_debug_inspector();
    init_debug_inspector_styles();
    init_debug_inspector_diff();
    init_helpers();
    Y_AXIS_TYPES = ["below", "above", "centerV", "alignTop", "alignBottom", "centerVSlide"];
    X_AXIS_TYPES = ["rightOf", "leftOf", "centerH", "alignLeft", "alignRight", "centerHSlide"];
    W_AXIS_TYPES = ["matchWidth", "matchMaxWidth"];
    H_AXIS_TYPES = ["matchHeight", "matchMaxHeight"];
    DIRECTIONAL_TYPES = /* @__PURE__ */ new Set(["below", "above", "rightOf", "leftOf"]);
    REFLESS_TYPES = /* @__PURE__ */ new Set(["centerHSlide", "centerVSlide", "matchMaxWidth", "matchMaxHeight"]);
  }
});
var debug_inspector_delete_exports = {};
__export(debug_inspector_delete_exports, {
  deleteElement: () => deleteElement
});
async function deleteElement(elementId, slideIndex) {
  const sk = window.sk;
  if (!sk?._definitions?.[slideIndex] || !sk?.layouts?.[slideIndex]) return;
  const definition = sk._definitions[slideIndex];
  const layoutResult = sk.layouts[slideIndex];
  const sceneElements = layoutResult.elements;
  const {
    flatMap,
    groupParent,
    stackParent,
    groupChildren,
    stackChildren,
    panelInternals
  } = flattenElements(definition.elements);
  if (panelInternals.has(elementId)) return;
  const element = flatMap.get(elementId);
  if (!element) return;
  const parentId = groupParent.get(elementId) ?? stackParent.get(elementId) ?? null;
  const parentChildren = parentId ? flatMap.get(parentId)?.children : definition.elements;
  const elementIndex = parentChildren?.findIndex((c) => c.id === elementId) ?? -1;
  if (elementIndex === -1) return;
  const deletionSet = /* @__PURE__ */ new Set();
  const collectDescendants = (id) => {
    deletionSet.add(id);
    const gKids = groupChildren.get(id);
    if (gKids) for (const kid of gKids) collectDescendants(kid);
    const sKids = stackChildren.get(id);
    if (sKids) for (const kid of sKids) collectDescendants(kid);
  };
  collectDescendants(elementId);
  const constraintBreaks = [];
  for (const [id, sceneEl] of Object.entries(sceneElements)) {
    if (deletionSet.has(id)) continue;
    if (!sceneEl?.resolved) continue;
    for (const axis of ["x", "y"]) {
      const p = sceneEl.provenance?.[axis];
      if (!p || p.source !== "constraint") continue;
      const refHit = p.ref && deletionSet.has(p.ref);
      const ref2Hit = typeof p.ref2 === "string" && deletionSet.has(p.ref2);
      if (refHit || ref2Hit) {
        const defEl = flatMap.get(id);
        if (!defEl) continue;
        const props = defEl.props;
        const oldValue = JSON.parse(JSON.stringify(props[axis]));
        const resolvedPos = sceneEl.resolved[axis];
        if (typeof resolvedPos !== "number") continue;
        props[axis] = resolvedPos;
        constraintBreaks.push({
          elementId: id,
          propKey: axis,
          oldValue,
          newValue: resolvedPos,
          slideIndex
        });
      }
    }
  }
  const connectorRemovals = [];
  for (const [id, el2] of flatMap) {
    if (deletionSet.has(id)) continue;
    if (el2.type !== "connector") continue;
    const props = el2.props;
    if (deletionSet.has(props.fromId) || deletionSet.has(props.toId)) {
      const connParentId = groupParent.get(id) ?? stackParent.get(id) ?? null;
      const connParentChildren = connParentId ? flatMap.get(connParentId)?.children : definition.elements;
      const connIndex = connParentChildren?.findIndex((c) => c.id === id) ?? -1;
      if (connIndex === -1) continue;
      connectorRemovals.push({
        action: "remove",
        element: JSON.parse(JSON.stringify(el2)),
        parentId: connParentId,
        index: connIndex,
        slideIndex
      });
    }
  }
  const s = debugController.state;
  s.selectedElementId = null;
  s.selectedConstraint = null;
  s.editingPropKey = null;
  s.editInputElement = null;
  clearConstraintSelection();
  connectorRemovals.sort((a, b) => {
    if (a.parentId === b.parentId) return b.index - a.index;
    return 0;
  });
  for (const entry of connectorRemovals) {
    applyElementAction(entry);
  }
  const elementRemoval = {
    action: "remove",
    element: JSON.parse(JSON.stringify(element)),
    parentId,
    index: elementIndex,
    slideIndex
  };
  applyElementAction(elementRemoval);
  const compound = {
    compound: true,
    entries: [
      ...constraintBreaks,
      ...connectorRemovals,
      elementRemoval
    ]
  };
  s.undoStack.push(compound);
  s.redoStack.length = 0;
  const rerender = sk._rerenderSlide;
  if (rerender) {
    await rerender(slideIndex, definition);
  }
  if (s.debugOverlay) {
    debugController.callbacks.renderDebugOverlay?.({ slideIndex, showInspector: false });
  }
  const body = s.inspectorPanel?.querySelector("[data-sk-inspector-body]");
  if (body) {
    body.innerHTML = '<div style="padding:24px 16px;color:#888;text-align:center;font-style:italic;">No element selected</div>';
  }
  updateDiffDirtyIndicator();
}
var init_debug_inspector_delete = __esm({
  "slidekit/src/debug-inspector-delete.ts"() {
    "use strict";
    init_debug_state();
    init_debug_inspector_edit();
    init_debug_inspector_diff();
    init_debug_inspector_constraint();
    init_helpers();
  }
});
var debug_inspector_pick_exports = {};
__export(debug_inspector_pick_exports, {
  enterPickMode: () => enterPickMode,
  exitPickMode: () => exitPickMode
});
function wouldCreateCycle(sceneElements, refId, elementId) {
  const visited = /* @__PURE__ */ new Set();
  const queue = [refId];
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === elementId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    const el2 = sceneElements[current];
    if (!el2?.provenance) continue;
    for (const axis of ["x", "y"]) {
      const p = el2.provenance[axis];
      if (p?.source === "constraint" && p.ref) {
        queue.push(p.ref);
      }
    }
  }
  return false;
}
function inferGap(constraintType, subjectBounds, refBounds) {
  let gap = 0;
  switch (constraintType) {
    case "below":
      gap = subjectBounds.y - (refBounds.y + refBounds.h);
      break;
    case "above":
      gap = refBounds.y - (subjectBounds.y + subjectBounds.h);
      break;
    case "rightOf":
      gap = subjectBounds.x - (refBounds.x + refBounds.w);
      break;
    case "leftOf":
      gap = refBounds.x - (subjectBounds.x + subjectBounds.w);
      break;
  }
  return Math.max(0, gap);
}
function updatePreviewArrow(refId, constraintType, subjectBounds, sceneElements) {
  if (previewSvg) {
    const existing = previewSvg.querySelectorAll("[data-sk-pick-preview]");
    existing.forEach((el2) => el2.remove());
  }
  if (!refId || !previewSvg) return;
  const refEl = sceneElements[refId];
  if (!refEl?.resolved) return;
  const anchors = CONSTRAINT_ANCHORS[constraintType];
  if (!anchors) return;
  const fromPt = getAnchorPosition(refEl.resolved, anchors[0]);
  const toPt = getAnchorPosition(subjectBounds, anchors[1]);
  const NS = "http://www.w3.org/2000/svg";
  const line = document.createElementNS(NS, "line");
  line.setAttribute("x1", String(fromPt.x));
  line.setAttribute("y1", String(fromPt.y));
  line.setAttribute("x2", String(toPt.x));
  line.setAttribute("y2", String(toPt.y));
  line.setAttribute("stroke", "rgba(74, 158, 255, 0.8)");
  line.setAttribute("stroke-width", "2");
  line.setAttribute("stroke-dasharray", "6 4");
  line.setAttribute("pointer-events", "none");
  line.setAttribute("data-sk-pick-preview", "true");
  const dx = toPt.x - fromPt.x;
  const dy = toPt.y - fromPt.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len > 10) {
    const ux = dx / len;
    const uy = dy / len;
    const arrowLen = 8;
    const arrowW = 4;
    const tipX = toPt.x;
    const tipY = toPt.y;
    const baseX = tipX - ux * arrowLen;
    const baseY = tipY - uy * arrowLen;
    const leftX = baseX - uy * arrowW;
    const leftY = baseY + ux * arrowW;
    const rightX = baseX + uy * arrowW;
    const rightY = baseY - ux * arrowW;
    const arrow = document.createElementNS(NS, "polygon");
    arrow.setAttribute("points", `${tipX},${tipY} ${leftX},${leftY} ${rightX},${rightY}`);
    arrow.setAttribute("fill", "rgba(74, 158, 255, 0.8)");
    arrow.setAttribute("pointer-events", "none");
    arrow.setAttribute("data-sk-pick-preview", "true");
    previewSvg.appendChild(arrow);
  }
  previewSvg.appendChild(line);
}
function clearHighlights() {
  if (!pickOverlay) return;
  const existing = pickOverlay.querySelectorAll("[data-sk-pick-highlight]");
  existing.forEach((el2) => el2.remove());
}
function highlightElement(refId, sceneElements, isValid) {
  if (!pickOverlay) return;
  const el2 = sceneElements[refId];
  if (!el2?.resolved) return;
  const highlight = document.createElement("div");
  highlight.setAttribute("data-sk-pick-highlight", refId);
  highlight.style.cssText = `
    position: absolute; pointer-events: none; box-sizing: border-box;
    border: 2px solid ${isValid ? "rgba(74, 158, 255, 0.8)" : "rgba(200, 200, 200, 0.5)"};
    background: ${isValid ? "rgba(74, 158, 255, 0.08)" : "rgba(200, 200, 200, 0.05)"};
    border-radius: 3px;
    left: ${el2.resolved.x}px; top: ${el2.resolved.y}px;
    width: ${el2.resolved.w}px; height: ${el2.resolved.h}px;
  `;
  pickOverlay.appendChild(highlight);
}
function createDropdownPanel(elementId, constraintType, slideIndex, sceneElements, validRefs, invalidRefs) {
  const panel2 = document.createElement("div");
  panel2.setAttribute("data-sk-debug", "pick-dropdown");
  panel2.style.cssText = `
    position: fixed; z-index: 100002;
    right: ${debugController.state.panelWidth + 8}px; top: 8px;
    background: #fff; border: 1px solid #d0d0d0; border-radius: 6px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.15); padding: 12px;
    font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace; font-size: 12px;
    min-width: 200px;
  `;
  const title = document.createElement("div");
  title.style.cssText = "font-weight: 600; margin-bottom: 8px; color: #1a1a2e;";
  title.textContent = `Pick reference for ${constraintType}`;
  panel2.appendChild(title);
  const hint = document.createElement("div");
  hint.style.cssText = "color: #888; margin-bottom: 8px; font-size: 11px;";
  hint.textContent = "Click an element on the slide, or select below:";
  panel2.appendChild(hint);
  const select = document.createElement("select");
  select.style.cssText = `
    width: 100%; padding: 4px 6px; font-size: 12px;
    font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
    border: 1px solid #4a9eff; border-radius: 3px;
    background: #fff; color: #1a1a2e; outline: none;
    cursor: pointer;
  `;
  const defaultOpt = document.createElement("option");
  defaultOpt.value = "";
  defaultOpt.textContent = "\u2014 select element \u2014";
  defaultOpt.selected = true;
  select.appendChild(defaultOpt);
  for (const refId of validRefs) {
    const opt = document.createElement("option");
    opt.value = refId;
    opt.textContent = refId;
    if (invalidRefs.has(refId)) {
      opt.disabled = true;
      opt.textContent += " (cycle)";
    }
    select.appendChild(opt);
  }
  select.addEventListener("change", () => {
    const refId = select.value;
    if (refId) {
      confirmPick(refId, elementId, constraintType, slideIndex, sceneElements);
    }
  });
  panel2.appendChild(select);
  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "Cancel";
  cancelBtn.style.cssText = `
    display: block; margin-top: 8px; padding: 4px 12px; font-size: 11px;
    font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
    background: #fff; color: #666; border: 1px solid #ccc;
    border-radius: 4px; cursor: pointer; width: 100%;
  `;
  cancelBtn.addEventListener("click", exitPickMode);
  panel2.appendChild(cancelBtn);
  document.body.appendChild(panel2);
  dropdownPanel = panel2;
}
function confirmPick(refId, elementId, constraintType, slideIndex, sceneElements) {
  const subjectEl = sceneElements[elementId];
  const refEl = sceneElements[refId];
  if (!subjectEl?.resolved || !refEl?.resolved) return;
  let gap = 0;
  if (DIRECTIONAL_TYPES.has(constraintType)) {
    gap = inferGap(constraintType, subjectEl.resolved, refEl.resolved);
  }
  exitPickMode();
  addConstraint(elementId, axisForConstraint(constraintType), constraintType, refId, gap, slideIndex);
}
function axisForConstraint(type) {
  const yTypes = /* @__PURE__ */ new Set(["below", "above", "centerV", "alignTop", "alignBottom"]);
  return yTypes.has(type) ? "y" : "x";
}
function exitPickMode() {
  const s = debugController.state;
  s.pickMode = null;
  hoveredRefId = null;
  if (pickOverlay) {
    pickOverlay.remove();
    pickOverlay = null;
  }
  if (previewSvg) {
    previewSvg.remove();
    previewSvg = null;
  }
  if (dropdownPanel) {
    dropdownPanel.remove();
    dropdownPanel = null;
  }
  document.removeEventListener("pointermove", onPickPointerMove, true);
  document.removeEventListener("pointerdown", onPickPointerDown, true);
  document.removeEventListener("keydown", onPickKeyDown, true);
}
function onPickPointerMove(event) {
  const s = debugController.state;
  if (!s.pickMode) return;
  const { elementId, constraintType, slideIndex } = s.pickMode;
  const sk = window.sk;
  if (!sk?.layouts?.[slideIndex]) return;
  const sceneElements = sk.layouts[slideIndex].elements;
  const subjectEl = sceneElements[elementId];
  if (!subjectEl?.resolved) return;
  if (pickOverlay) pickOverlay.style.pointerEvents = "none";
  const elementsAtPoint = document.elementsFromPoint(event.clientX, event.clientY);
  if (pickOverlay) pickOverlay.style.pointerEvents = "auto";
  let foundRefId = null;
  for (const el2 of elementsAtPoint) {
    const skEl = el2.closest?.("[data-sk-id]");
    if (skEl) {
      const id = skEl.getAttribute("data-sk-id");
      if (id && id !== elementId) {
        const sceneRef = sceneElements[id];
        if (sceneRef && sceneRef.type !== "connector") {
          foundRefId = id;
          break;
        }
      }
    }
  }
  if (foundRefId !== hoveredRefId) {
    hoveredRefId = foundRefId;
    clearHighlights();
    if (foundRefId) {
      const isCycle = wouldCreateCycle(sceneElements, foundRefId, elementId);
      highlightElement(foundRefId, sceneElements, !isCycle);
      if (!isCycle) {
        updatePreviewArrow(foundRefId, constraintType, subjectEl.resolved, sceneElements);
        if (pickOverlay) pickOverlay.style.cursor = "pointer";
      } else {
        updatePreviewArrow(null, constraintType, subjectEl.resolved, sceneElements);
        if (pickOverlay) pickOverlay.style.cursor = "not-allowed";
      }
    } else {
      updatePreviewArrow(null, constraintType, subjectEl.resolved, sceneElements);
      if (pickOverlay) pickOverlay.style.cursor = "crosshair";
    }
  }
}
function onPickPointerDown(event) {
  const s = debugController.state;
  if (!s.pickMode) return;
  if (event.button !== 0) {
    if (event.button === 2) {
      event.preventDefault();
      event.stopPropagation();
      exitPickMode();
    }
    return;
  }
  const target = event.target;
  if (target?.closest('[data-sk-debug="pick-dropdown"]')) return;
  event.preventDefault();
  event.stopPropagation();
  const { elementId, constraintType, slideIndex } = s.pickMode;
  const sk = window.sk;
  if (!sk?.layouts?.[slideIndex]) return;
  const sceneElements = sk.layouts[slideIndex].elements;
  if (hoveredRefId) {
    if (!wouldCreateCycle(sceneElements, hoveredRefId, elementId)) {
      confirmPick(hoveredRefId, elementId, constraintType, slideIndex, sceneElements);
      return;
    }
  }
  if (!hoveredRefId) {
    exitPickMode();
  }
}
function onPickKeyDown(event) {
  if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    exitPickMode();
  }
}
function enterPickMode(elementId, axis, constraintType, slideIndex) {
  const s = debugController.state;
  if (s.pickMode) exitPickMode();
  const sk = window.sk;
  if (!sk?.layouts?.[slideIndex]) return;
  const sceneElements = sk.layouts[slideIndex].elements;
  const subjectEl = sceneElements[elementId];
  if (!subjectEl?.resolved) return;
  s.pickMode = { elementId, axis, constraintType, slideIndex };
  const slideW = sk._config?.slide?.w ?? 1920;
  const slideH = sk._config?.slide?.h ?? 1080;
  const overlay = document.createElement("div");
  overlay.setAttribute("data-sk-debug", "pick-overlay");
  overlay.style.cssText = `
    position: absolute; left: 0; top: 0;
    width: ${slideW}px; height: ${slideH}px;
    pointer-events: auto; cursor: crosshair;
    z-index: 10000;
  `;
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("width", String(slideW));
  svg.setAttribute("height", String(slideH));
  svg.style.cssText = "position: absolute; left: 0; top: 0; pointer-events: none; overflow: visible;";
  overlay.appendChild(svg);
  previewSvg = svg;
  const subjectHighlight = document.createElement("div");
  subjectHighlight.setAttribute("data-sk-pick-subject", "true");
  subjectHighlight.style.cssText = `
    position: absolute; pointer-events: none; box-sizing: border-box;
    border: 2px solid rgba(255, 140, 50, 0.8);
    background: rgba(255, 140, 50, 0.08);
    border-radius: 3px;
    left: ${subjectEl.resolved.x}px; top: ${subjectEl.resolved.y}px;
    width: ${subjectEl.resolved.w}px; height: ${subjectEl.resolved.h}px;
  `;
  overlay.appendChild(subjectHighlight);
  const subjectLabel = document.createElement("div");
  subjectLabel.style.cssText = `
    position: absolute; pointer-events: none;
    left: ${subjectEl.resolved.x}px; top: ${subjectEl.resolved.y - 18}px;
    font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
    font-size: 10px; color: rgba(255, 140, 50, 0.9);
    font-weight: 600; white-space: nowrap;
  `;
  subjectLabel.textContent = `${elementId} (${constraintType})`;
  overlay.appendChild(subjectLabel);
  if (s.debugOverlay) {
    s.debugOverlay.appendChild(overlay);
  }
  pickOverlay = overlay;
  const validRefs = [];
  const invalidRefs = /* @__PURE__ */ new Set();
  for (const [id, el2] of Object.entries(sceneElements)) {
    if (id === elementId) continue;
    if (el2.type === "connector") continue;
    validRefs.push(id);
    if (wouldCreateCycle(sceneElements, id, elementId)) {
      invalidRefs.add(id);
    }
  }
  validRefs.sort();
  createDropdownPanel(elementId, constraintType, slideIndex, sceneElements, validRefs, invalidRefs);
  document.addEventListener("pointermove", onPickPointerMove, true);
  document.addEventListener("pointerdown", onPickPointerDown, true);
  document.addEventListener("keydown", onPickKeyDown, true);
}
var CONSTRAINT_ANCHORS;
var pickOverlay;
var previewSvg;
var dropdownPanel;
var hoveredRefId;
var init_debug_inspector_pick = __esm({
  "slidekit/src/debug-inspector-pick.ts"() {
    "use strict";
    init_debug_state();
    init_debug_inspector_constraint();
    init_debug_overlay();
    CONSTRAINT_ANCHORS = {
      below: ["bc", "tc"],
      above: ["tc", "bc"],
      rightOf: ["cr", "cl"],
      leftOf: ["cl", "cr"],
      centerV: ["cc", "cc"],
      centerH: ["cc", "cc"],
      alignTop: ["tc", "tc"],
      alignBottom: ["bc", "bc"],
      alignLeft: ["cl", "cl"],
      alignRight: ["cr", "cr"]
    };
    pickOverlay = null;
    previewSvg = null;
    dropdownPanel = null;
    hoveredRefId = null;
  }
});
function dismissMenu() {
  if (activeSubmenu) {
    activeSubmenu.remove();
    activeSubmenu = null;
  }
  if (activeMenu) {
    activeMenu.remove();
    activeMenu = null;
  }
  if (dismissListener) {
    document.removeEventListener("mousedown", dismissListener, true);
    document.removeEventListener("keydown", dismissListener, true);
    document.removeEventListener("scroll", dismissListener, true);
    dismissListener = null;
  }
}
function setupDismissListeners() {
  dismissListener = (e) => {
    if (e.type === "keydown" && e.key === "Escape") {
      e.preventDefault();
      dismissMenu();
      return;
    }
    if (e.type === "mousedown") {
      const target = e.target;
      if (activeMenu?.contains(target) || activeSubmenu?.contains(target)) return;
      dismissMenu();
    }
    if (e.type === "scroll") {
      dismissMenu();
    }
  };
  setTimeout(() => {
    if (!dismissListener) return;
    document.addEventListener("mousedown", dismissListener, true);
    document.addEventListener("keydown", dismissListener, true);
    document.addEventListener("scroll", dismissListener, true);
  }, 0);
}
function createMenuItem(label, opts = {}) {
  const item = document.createElement("div");
  item.style.cssText = `
    padding: 6px 12px; cursor: ${opts.disabled ? "default" : "pointer"};
    display: flex; align-items: center; justify-content: space-between;
    color: ${opts.disabled ? "#aaa" : "#1a1a2e"};
    white-space: nowrap;
  `;
  const labelSpan = document.createElement("span");
  if (opts.checked) {
    labelSpan.textContent = `\u2713 ${label}`;
  } else {
    labelSpan.textContent = label;
  }
  item.appendChild(labelSpan);
  if (opts.hasSubmenu) {
    const arrow = document.createElement("span");
    arrow.textContent = "\u25B8";
    arrow.style.marginLeft = "12px";
    arrow.style.color = opts.disabled ? "#ccc" : "#999";
    item.appendChild(arrow);
  }
  if (opts.disabledHint) {
    const hint = document.createElement("span");
    hint.textContent = opts.disabledHint;
    hint.style.cssText = "margin-left: 8px; color: #bbb; font-size: 10px; font-style: italic;";
    item.appendChild(hint);
  }
  if (!opts.disabled) {
    item.addEventListener("mouseenter", () => {
      item.style.background = "#e8f0fe";
    });
    item.addEventListener("mouseleave", () => {
      item.style.background = "";
    });
    if (opts.onClick) {
      item.addEventListener("click", (e) => {
        e.stopPropagation();
        opts.onClick();
      });
    }
  }
  return item;
}
function createSeparator() {
  const sep = document.createElement("div");
  sep.style.cssText = "height: 1px; background: #e0e0e0; margin: 4px 0;";
  return sep;
}
function createSectionHeader(label) {
  const header = document.createElement("div");
  header.style.cssText = `
    padding: 4px 12px 2px; color: #888; font-size: 10px;
    font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;
    cursor: default;
  `;
  header.textContent = label;
  return header;
}
function positionSubmenu(submenu, parentItem, parentMenu) {
  const parentRect = parentMenu.getBoundingClientRect();
  const itemRect = parentItem.getBoundingClientRect();
  let left = parentRect.right + 2;
  let top = itemRect.top - 4;
  submenu.style.visibility = "hidden";
  submenu.style.left = `${left}px`;
  submenu.style.top = `${top}px`;
  document.body.appendChild(submenu);
  const subRect = submenu.getBoundingClientRect();
  submenu.remove();
  submenu.style.visibility = "";
  if (subRect.right > window.innerWidth) {
    left = parentRect.left - subRect.width - 2;
  }
  if (subRect.bottom > window.innerHeight) {
    top = window.innerHeight - subRect.height - 8;
  }
  if (top < 8) top = 8;
  submenu.style.left = `${left}px`;
  submenu.style.top = `${top}px`;
}
function showElementMenu(elementId, clientX, clientY) {
  dismissMenu();
  const s = debugController.state;
  const sk = window.sk;
  if (!sk?.layouts?.[s.currentSlideIndex]) return;
  const sceneEl = sk.layouts[s.currentSlideIndex].elements[elementId];
  if (!sceneEl) return;
  const menu = document.createElement("div");
  menu.style.cssText = MENU_STYLE;
  menu.setAttribute("data-sk-debug", "context-menu");
  const isConnector = sceneEl.type === "connector";
  const isStack = sceneEl.provenance?.x?.source === "stack" || sceneEl.provenance?.y?.source === "stack";
  const xConstrained = sceneEl.provenance?.x?.source === "constraint";
  const yConstrained = sceneEl.provenance?.y?.source === "constraint";
  if (isConnector) {
  } else if (isStack) {
    const addItem = createMenuItem("Add Constraint", {
      disabled: true,
      hasSubmenu: true,
      disabledHint: "(stack)"
    });
    menu.appendChild(addItem);
  } else {
    const availableYTypes = yConstrained ? [] : [...Y_AXIS_TYPES];
    const availableXTypes = xConstrained ? [] : [...X_AXIS_TYPES];
    if (availableYTypes.length === 0 && availableXTypes.length === 0) {
      const addItem = createMenuItem("Add Constraint", {
        disabled: true,
        hasSubmenu: true,
        disabledHint: "(both axes constrained)"
      });
      menu.appendChild(addItem);
    } else {
      const addItem = createMenuItem("Add Constraint", { hasSubmenu: true });
      menu.appendChild(addItem);
      const submenu = document.createElement("div");
      submenu.style.cssText = SUBMENU_STYLE;
      submenu.setAttribute("data-sk-debug", "context-submenu");
      if (availableYTypes.length > 0) {
        submenu.appendChild(createSectionHeader("Y-axis"));
        for (const type of availableYTypes) {
          submenu.appendChild(createMenuItem(type, {
            onClick: () => {
              dismissMenu();
              startPickMode(elementId, "y", type, s.currentSlideIndex);
            }
          }));
        }
      }
      if (availableXTypes.length > 0) {
        if (availableYTypes.length > 0) submenu.appendChild(createSeparator());
        submenu.appendChild(createSectionHeader("X-axis"));
        for (const type of availableXTypes) {
          submenu.appendChild(createMenuItem(type, {
            onClick: () => {
              dismissMenu();
              startPickMode(elementId, "x", type, s.currentSlideIndex);
            }
          }));
        }
      }
      let submenuTimeout = null;
      addItem.addEventListener("mouseenter", () => {
        if (submenuTimeout) {
          clearTimeout(submenuTimeout);
          submenuTimeout = null;
        }
        if (activeSubmenu) {
          activeSubmenu.remove();
          activeSubmenu = null;
        }
        positionSubmenu(submenu, addItem, menu);
        document.body.appendChild(submenu);
        activeSubmenu = submenu;
      });
      addItem.addEventListener("mouseleave", () => {
        submenuTimeout = setTimeout(() => {
          if (activeSubmenu === submenu && !submenu.matches(":hover")) {
            submenu.remove();
            activeSubmenu = null;
          }
        }, 200);
      });
      submenu.addEventListener("mouseenter", () => {
        if (submenuTimeout) {
          clearTimeout(submenuTimeout);
          submenuTimeout = null;
        }
      });
      submenu.addEventListener("mouseleave", () => {
        submenuTimeout = setTimeout(() => {
          submenu.remove();
          if (activeSubmenu === submenu) activeSubmenu = null;
        }, 200);
      });
    }
  }
  menu.appendChild(createSeparator());
  menu.appendChild(createMenuItem("Duplicate", { disabled: true }));
  const isInternal = sceneEl._internal;
  menu.appendChild(createMenuItem("Delete", {
    disabled: isInternal,
    disabledHint: isInternal ? "(internal)" : void 0,
    onClick: isInternal ? void 0 : () => {
      dismissMenu();
      Promise.resolve().then(() => (init_debug_inspector_delete(), debug_inspector_delete_exports)).then((mod) => mod.deleteElement(elementId, s.currentSlideIndex)).catch((err) => console.error("[slidekit] Failed to load delete module", err));
    }
  }));
  positionMenu(menu, clientX, clientY);
  document.body.appendChild(menu);
  activeMenu = menu;
  setupDismissListeners();
}
function showConstraintMenu(elementId, axis, clientX, clientY) {
  dismissMenu();
  const s = debugController.state;
  const sk = window.sk;
  if (!sk?.layouts?.[s.currentSlideIndex]) return;
  const sceneEl = sk.layouts[s.currentSlideIndex].elements[elementId];
  if (!sceneEl) return;
  const prov = sceneEl.provenance?.[axis];
  const currentType = prov?.type || "";
  const menu = document.createElement("div");
  menu.style.cssText = MENU_STYLE;
  menu.setAttribute("data-sk-debug", "context-menu");
  const changeItem = createMenuItem("Change Type", { hasSubmenu: true });
  menu.appendChild(changeItem);
  const submenu = document.createElement("div");
  submenu.style.cssText = SUBMENU_STYLE;
  submenu.setAttribute("data-sk-debug", "context-submenu");
  const sameAxisTypes = typesForAxis(axis);
  const otherAxis = axis === "x" ? "y" : "x";
  const crossAxisTypes = typesForAxis(otherAxis);
  submenu.appendChild(createSectionHeader(`${axis}-axis`));
  for (const type of sameAxisTypes) {
    submenu.appendChild(createMenuItem(type, {
      checked: type === currentType,
      onClick: () => {
        dismissMenu();
        if (type !== currentType) {
          changeConstraintType(elementId, axis, type, s.currentSlideIndex);
        }
      }
    }));
  }
  submenu.appendChild(createSeparator());
  submenu.appendChild(createSectionHeader(`${otherAxis}-axis`));
  for (const type of crossAxisTypes) {
    submenu.appendChild(createMenuItem(type, {
      onClick: () => {
        dismissMenu();
        changeConstraintType(elementId, axis, type, s.currentSlideIndex);
      }
    }));
  }
  let submenuTimeout = null;
  changeItem.addEventListener("mouseenter", () => {
    if (submenuTimeout) {
      clearTimeout(submenuTimeout);
      submenuTimeout = null;
    }
    if (activeSubmenu) {
      activeSubmenu.remove();
      activeSubmenu = null;
    }
    positionSubmenu(submenu, changeItem, menu);
    document.body.appendChild(submenu);
    activeSubmenu = submenu;
  });
  changeItem.addEventListener("mouseleave", () => {
    submenuTimeout = setTimeout(() => {
      if (activeSubmenu === submenu && !submenu.matches(":hover")) {
        submenu.remove();
        activeSubmenu = null;
      }
    }, 200);
  });
  submenu.addEventListener("mouseenter", () => {
    if (submenuTimeout) {
      clearTimeout(submenuTimeout);
      submenuTimeout = null;
    }
  });
  submenu.addEventListener("mouseleave", () => {
    submenuTimeout = setTimeout(() => {
      submenu.remove();
      if (activeSubmenu === submenu) activeSubmenu = null;
    }, 200);
  });
  menu.appendChild(createSeparator());
  menu.appendChild(createMenuItem("Break Constraint", {
    onClick: () => {
      dismissMenu();
      breakConstraint(elementId, axis, s.currentSlideIndex);
    }
  }));
  positionMenu(menu, clientX, clientY);
  document.body.appendChild(menu);
  activeMenu = menu;
  setupDismissListeners();
}
function positionMenu(menu, clientX, clientY) {
  menu.style.left = "-9999px";
  menu.style.top = "-9999px";
  document.body.appendChild(menu);
  const rect = menu.getBoundingClientRect();
  menu.remove();
  let left = clientX;
  let top = clientY;
  if (left + rect.width > window.innerWidth - 8) {
    left = window.innerWidth - rect.width - 8;
  }
  if (top + rect.height > window.innerHeight - 8) {
    top = window.innerHeight - rect.height - 8;
  }
  if (left < 8) left = 8;
  if (top < 8) top = 8;
  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
}
async function startPickMode(elementId, axis, constraintType, slideIndex) {
  const { enterPickMode: enterPickMode2 } = await Promise.resolve().then(() => (init_debug_inspector_pick(), debug_inspector_pick_exports));
  enterPickMode2(elementId, axis, constraintType, slideIndex);
}
function handleContextMenu(event) {
  const s = debugController.state;
  if (!s.debugOverlay) return;
  if (s.pickMode) return;
  const target = event.target;
  if (target?.closest('[data-sk-role="debug-inspector"]')) return;
  const hitTarget = target?.closest('[data-sk-debug="rel-hit"]');
  if (hitTarget) {
    const elementId = hitTarget.getAttribute("data-sk-debug-element");
    const axis = hitTarget.getAttribute("data-sk-debug-axis");
    if (elementId && axis) {
      event.preventDefault();
      event.stopPropagation();
      showConstraintMenu(elementId, axis, event.clientX, event.clientY);
      return;
    }
  }
  const skEl = target?.closest("[data-sk-id]");
  if (skEl) {
    const id = skEl.getAttribute("data-sk-id");
    if (id) {
      event.preventDefault();
      event.stopPropagation();
      showElementMenu(id, event.clientX, event.clientY);
      return;
    }
  }
}
function attachContextMenuHandler() {
  document.addEventListener("contextmenu", handleContextMenu, true);
}
function detachContextMenuHandler() {
  document.removeEventListener("contextmenu", handleContextMenu, true);
  dismissMenu();
}
var MENU_FONT;
var MENU_STYLE;
var SUBMENU_STYLE;
var activeMenu;
var activeSubmenu;
var dismissListener;
var init_debug_context_menu = __esm({
  "slidekit/src/debug-context-menu.ts"() {
    "use strict";
    init_debug_state();
    init_debug_inspector_constraint();
    MENU_FONT = "'SF Mono', 'Fira Code', 'Consolas', monospace";
    MENU_STYLE = `
  position: fixed; z-index: 100000;
  background: #fff; border: 1px solid #d0d0d0;
  border-radius: 6px; box-shadow: 0 4px 16px rgba(0,0,0,0.18);
  padding: 4px 0; min-width: 200px;
  font-family: ${MENU_FONT}; font-size: 12px; color: #1a1a2e;
  user-select: none;
`;
    SUBMENU_STYLE = `
  position: fixed; z-index: 100001;
  background: #fff; border: 1px solid #d0d0d0;
  border-radius: 6px; box-shadow: 0 4px 16px rgba(0,0,0,0.18);
  padding: 4px 0; min-width: 180px;
  font-family: ${MENU_FONT}; font-size: 12px; color: #1a1a2e;
  user-select: none;
`;
    activeMenu = null;
    activeSubmenu = null;
    dismissListener = null;
  }
});
function closeConstraintPopover() {
  if (activeConstraintPopover) {
    activeConstraintPopover.remove();
    activeConstraintPopover = null;
  }
  if (activePopoverCleanup) {
    activePopoverCleanup();
    activePopoverCleanup = null;
  }
}
function collectGroupNames(slideIndex) {
  const sk = typeof window !== "undefined" ? window.sk : null;
  const def = sk?._definitions?.[slideIndex];
  if (!def) return [];
  const { flatMap } = flattenElements(def.elements);
  const names = /* @__PURE__ */ new Set();
  for (const [, el2] of flatMap) {
    const props = el2.props;
    if (!props) continue;
    for (const axis of ["w", "h"]) {
      const val = props[axis];
      if (isRelMarker(val) && val.group) {
        names.add(val.group);
      }
    }
  }
  return Array.from(names).sort();
}
function showConstraintPopover(btnEl, axis, elementId, slideIndex) {
  closeConstraintPopover();
  const options = CONSTRAINT_REGISTRY.filter((c) => c.axis === axis);
  if (options.length === 0) return;
  const popover = document.createElement("div");
  popover.setAttribute("data-sk-debug", "constraint-popover");
  popover.style.cssText = `
    position: fixed; background: #fff; border: 1px solid #ddd;
    border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    padding: 4px 0; z-index: 100001; font-size: 11px;
    font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
    min-width: 180px;
  `;
  const rect = btnEl.getBoundingClientRect();
  popover.style.top = `${rect.bottom + 2}px`;
  popover.style.left = `${rect.left}px`;
  for (const opt of options) {
    const row = document.createElement("div");
    row.style.cssText = `
      padding: 4px 12px; cursor: pointer; color: #1a1a2e;
      white-space: nowrap;
    `;
    row.textContent = opt.label;
    row.addEventListener("mouseenter", () => {
      row.style.background = "#e8f0fe";
    });
    row.addEventListener("mouseleave", () => {
      row.style.background = "";
    });
    row.addEventListener("click", (e) => {
      e.stopPropagation();
      handleConstraintPickerSelection(opt, elementId, slideIndex, popover);
    });
    popover.appendChild(row);
  }
  document.body.appendChild(popover);
  activeConstraintPopover = popover;
  const popRect = popover.getBoundingClientRect();
  if (popRect.right > window.innerWidth) {
    popover.style.left = `${window.innerWidth - popRect.width - 8}px`;
  }
  if (popRect.bottom > window.innerHeight) {
    popover.style.top = `${rect.top - popRect.height - 2}px`;
  }
  const onClickOutside = (e) => {
    if (!popover.contains(e.target) && e.target !== btnEl) {
      closeConstraintPopover();
    }
  };
  const onKeyDown2 = (e) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      closeConstraintPopover();
    }
  };
  const onScroll = () => {
    closeConstraintPopover();
  };
  const inspectorPanel = debugController.state.inspectorPanel;
  document.addEventListener("pointerdown", onClickOutside, true);
  document.addEventListener("keydown", onKeyDown2, true);
  window.addEventListener("resize", onScroll);
  if (inspectorPanel) inspectorPanel.addEventListener("scroll", onScroll);
  activePopoverCleanup = () => {
    document.removeEventListener("pointerdown", onClickOutside, true);
    document.removeEventListener("keydown", onKeyDown2, true);
    window.removeEventListener("resize", onScroll);
    if (inspectorPanel) inspectorPanel.removeEventListener("scroll", onScroll);
  };
}
function handleConstraintPickerSelection(opt, elementId, slideIndex, popover) {
  if (!opt.requiresRef && !opt.requiresGroup) {
    closeConstraintPopover();
    addReflessConstraint(elementId, opt.axis, opt.id, slideIndex);
  } else if (opt.requiresRef) {
    closeConstraintPopover();
    const pickAxis = opt.axis === "w" || opt.axis === "x" ? "x" : "y";
    enterPickMode(elementId, pickAxis, opt.id, slideIndex);
  } else if (opt.requiresGroup) {
    showGroupNameInput(popover, opt, elementId, slideIndex);
  }
}
function showGroupNameInput(popover, opt, elementId, slideIndex) {
  popover.innerHTML = "";
  const title = document.createElement("div");
  title.style.cssText = "padding: 6px 12px 4px; font-weight: 600; color: #1a1a2e; font-size: 11px;";
  title.textContent = opt.label.replace("...", "");
  popover.appendChild(title);
  const inputWrap = document.createElement("div");
  inputWrap.style.cssText = "padding: 0 12px 6px;";
  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Group name";
  input.style.cssText = `
    width: 100%; padding: 4px 6px; font-size: 11px;
    font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
    border: 1px solid #4a9eff; border-radius: 3px;
    background: #fff; color: #1a1a2e; outline: none;
    box-sizing: border-box;
  `;
  inputWrap.appendChild(input);
  popover.appendChild(inputWrap);
  const existingGroups = collectGroupNames(slideIndex);
  let autocompleteDiv = null;
  const showAutocomplete = (filter) => {
    if (autocompleteDiv) {
      autocompleteDiv.remove();
      autocompleteDiv = null;
    }
    const matches = filter ? existingGroups.filter((g) => g.toLowerCase().includes(filter.toLowerCase())) : existingGroups;
    if (matches.length === 0) return;
    autocompleteDiv = document.createElement("div");
    autocompleteDiv.style.cssText = "padding: 0 12px 4px;";
    for (const name of matches) {
      const item = document.createElement("div");
      item.style.cssText = "padding: 3px 6px; cursor: pointer; color: #555; border-radius: 3px;";
      item.textContent = name;
      item.addEventListener("mouseenter", () => {
        item.style.background = "#e8f0fe";
      });
      item.addEventListener("mouseleave", () => {
        item.style.background = "";
      });
      item.addEventListener("click", (e) => {
        e.stopPropagation();
        applyGroupConstraint(opt, elementId, name, slideIndex);
      });
      autocompleteDiv.appendChild(item);
    }
    popover.appendChild(autocompleteDiv);
  };
  input.addEventListener("input", () => {
    showAutocomplete(input.value);
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && input.value.trim()) {
      e.preventDefault();
      applyGroupConstraint(opt, elementId, input.value.trim(), slideIndex);
    }
    if (e.key === "Escape") {
      e.stopPropagation();
      closeConstraintPopover();
    }
  });
  showAutocomplete("");
  requestAnimationFrame(() => input.focus());
}
function applyGroupConstraint(opt, elementId, groupName, slideIndex) {
  closeConstraintPopover();
  addGroupConstraint(elementId, opt.axis, opt.id, groupName, slideIndex);
}
function createInspectorPanel() {
  const s = debugController.state;
  const panel2 = document.createElement("div");
  panel2.setAttribute("data-sk-role", "debug-inspector");
  panel2.style.position = "fixed";
  panel2.style.top = "0";
  panel2.style.right = "0";
  panel2.style.width = `${s.panelWidth}px`;
  panel2.style.height = "100vh";
  panel2.style.background = "#f8f8fa";
  panel2.style.color = "#1a1a2e";
  panel2.style.fontFamily = "'SF Mono', 'Fira Code', 'Consolas', monospace";
  panel2.style.fontSize = "12px";
  panel2.style.zIndex = "99999";
  panel2.style.overflowY = "auto";
  panel2.style.borderLeft = "1px solid #ddd";
  panel2.style.boxSizing = "border-box";
  panel2.appendChild(createResizeHandle());
  const header = document.createElement("div");
  header.style.padding = "12px 16px";
  header.style.borderBottom = "1px solid #ddd";
  header.style.fontSize = "14px";
  header.style.fontWeight = "600";
  header.style.color = "#1a1a2e";
  header.textContent = "Inspector";
  panel2.appendChild(header);
  panel2.appendChild(createDiffActionBar());
  panel2.appendChild(createVisibilitySection());
  const elementListContainer = document.createElement("div");
  elementListContainer.setAttribute("data-sk-role", "element-list");
  panel2.appendChild(elementListContainer);
  const body = document.createElement("div");
  body.setAttribute("data-sk-inspector-body", "true");
  body.style.padding = "8px 0";
  panel2.appendChild(body);
  document.body.appendChild(panel2);
  s.inspectorPanel = panel2;
  renderEmptyState();
  refreshElementList();
  adjustViewport(s.panelWidth);
  return panel2;
}
function removeInspectorPanel() {
  const s = debugController.state;
  resetViewport();
  if (s.inspectorPanel && s.inspectorPanel.parentNode) {
    s.inspectorPanel.parentNode.removeChild(s.inspectorPanel);
  }
  s.inspectorPanel = null;
}
function renderEmptyState() {
  const s = debugController.state;
  const body = s.inspectorPanel?.querySelector("[data-sk-inspector-body]");
  if (!body) return;
  body.innerHTML = "";
  const msg = document.createElement("div");
  msg.style.padding = "24px 16px";
  msg.style.color = "#888";
  msg.style.textAlign = "center";
  msg.style.fontStyle = "italic";
  msg.textContent = "Click an element to inspect";
  body.appendChild(msg);
}
function createVisibilitySection() {
  const s = debugController.state;
  const section = document.createElement("div");
  section.setAttribute("data-sk-role", "visibility-toggles");
  section.style.borderBottom = "1px solid #e8e8e8";
  section.style.padding = "8px 16px";
  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.alignItems = "center";
  header.style.cursor = "pointer";
  header.style.userSelect = "none";
  header.style.marginBottom = "0";
  const chevron = document.createElement("span");
  chevron.textContent = "\u25B6";
  chevron.style.fontSize = "8px";
  chevron.style.marginRight = "6px";
  chevron.style.transition = "transform 0.15s";
  chevron.style.transform = "rotate(90deg)";
  header.appendChild(chevron);
  const title = document.createElement("span");
  title.textContent = "VISIBILITY";
  title.style.fontSize = "11px";
  title.style.fontWeight = "600";
  title.style.letterSpacing = "0.5px";
  title.style.color = "#777";
  header.appendChild(title);
  section.appendChild(header);
  const grid2 = document.createElement("div");
  grid2.style.display = "grid";
  grid2.style.gridTemplateColumns = "1fr 1fr";
  grid2.style.gap = "2px 8px";
  grid2.style.marginTop = "6px";
  for (const opt of VISIBILITY_OPTIONS) {
    const opts = s.lastToggleOptions;
    const currentValue = opts[opt.key] !== void 0 ? Boolean(opts[opt.key]) : opt.default;
    const label = document.createElement("label");
    label.style.display = "flex";
    label.style.alignItems = "center";
    label.style.gap = "4px";
    label.style.cursor = "pointer";
    label.style.fontSize = "11px";
    label.style.color = "#555";
    label.style.padding = "1px 0";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = currentValue;
    checkbox.style.margin = "0";
    checkbox.style.cursor = "pointer";
    checkbox.setAttribute("data-sk-visibility", opt.key);
    checkbox.addEventListener("change", () => {
      const toggleOpts = s.lastToggleOptions;
      toggleOpts[opt.key] = checkbox.checked;
      debugController.callbacks.refreshOverlayOnly?.(s.currentSlideIndex);
    });
    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(opt.label));
    grid2.appendChild(label);
  }
  section.appendChild(grid2);
  header.addEventListener("click", () => {
    const collapsed = grid2.style.display === "none";
    grid2.style.display = collapsed ? "grid" : "none";
    chevron.style.transform = collapsed ? "rotate(90deg)" : "rotate(0deg)";
  });
  return section;
}
function refreshElementList() {
  const s = debugController.state;
  const container = s.inspectorPanel?.querySelector('[data-sk-role="element-list"]');
  if (!container) return;
  container.innerHTML = "";
  const sk = typeof window !== "undefined" ? window.sk : null;
  if (!sk?.layouts?.[s.currentSlideIndex]) return;
  const layoutResult = sk.layouts[s.currentSlideIndex];
  const sceneElements = layoutResult.elements;
  const byLayer = {
    overlay: [],
    content: [],
    bg: []
  };
  for (const [id, sceneEl] of Object.entries(sceneElements)) {
    if (sceneEl._internal) continue;
    const layer = sceneEl.authored?.props?.layer || "content";
    (byLayer[layer] ??= []).push({ id, el: sceneEl });
  }
  const allEdges = extractRelationshipEdges(sceneElements);
  const section = document.createElement("div");
  section.style.borderBottom = "1px solid #e8e8e8";
  section.style.padding = "0";
  const header = document.createElement("div");
  header.style.cssText = "padding: 8px 16px; cursor: pointer; user-select: none; display: flex; align-items: center;";
  const chevron = document.createElement("span");
  chevron.textContent = "\u25B6";
  chevron.style.cssText = "font-size: 8px; margin-right: 6px; transition: transform 0.15s;";
  chevron.style.transform = s.elementListExpanded ? "rotate(90deg)" : "rotate(0deg)";
  header.appendChild(chevron);
  const title = document.createElement("span");
  title.textContent = "ELEMENTS & CONSTRAINTS";
  title.style.cssText = "font-size: 11px; font-weight: 600; letter-spacing: 0.5px; color: #777;";
  header.appendChild(title);
  section.appendChild(header);
  const listBody = document.createElement("div");
  listBody.style.display = s.elementListExpanded ? "block" : "none";
  listBody.style.padding = "0 8px 8px 8px";
  listBody.style.maxHeight = "300px";
  listBody.style.overflowY = "auto";
  for (const layerName of LAYER_ORDER) {
    const items = byLayer[layerName];
    if (!items || items.length === 0) continue;
    const layerRow = document.createElement("div");
    layerRow.style.cssText = "display: flex; align-items: center; gap: 4px; padding: 4px 0 2px 0; font-weight: 600; font-size: 11px; color: #555;";
    const layerCheckbox = document.createElement("input");
    layerCheckbox.type = "checkbox";
    layerCheckbox.checked = !s.hiddenLayers.has(layerName);
    layerCheckbox.style.cssText = "margin: 0; cursor: pointer;";
    layerCheckbox.addEventListener("change", () => {
      if (layerCheckbox.checked) {
        s.hiddenLayers.delete(layerName);
      } else {
        s.hiddenLayers.add(layerName);
      }
      debugController.callbacks.refreshOverlayOnly?.(s.currentSlideIndex);
      refreshElementList();
    });
    layerRow.appendChild(layerCheckbox);
    layerRow.appendChild(document.createTextNode(LAYER_LABELS[layerName] || layerName));
    listBody.appendChild(layerRow);
    for (const item of items) {
      const row = document.createElement("div");
      row.style.cssText = "display: flex; align-items: center; gap: 4px; padding: 1px 0 1px 12px; font-size: 11px; cursor: pointer;";
      row.setAttribute("data-sk-element-list-id", item.id);
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = !s.hiddenElementIds.has(item.id) && !s.hiddenLayers.has(layerName);
      cb.disabled = s.hiddenLayers.has(layerName);
      cb.style.cssText = "margin: 0; cursor: pointer;";
      cb.addEventListener("change", (e) => {
        e.stopPropagation();
        if (cb.checked) {
          s.hiddenElementIds.delete(item.id);
        } else {
          s.hiddenElementIds.add(item.id);
        }
        debugController.callbacks.refreshOverlayOnly?.(s.currentSlideIndex);
      });
      row.appendChild(cb);
      const label = document.createElement("span");
      label.textContent = item.id;
      label.style.color = s.selectedElementId === item.id ? "#4a9eff" : "#333";
      label.style.fontWeight = s.selectedElementId === item.id ? "600" : "normal";
      row.appendChild(label);
      const typeBadge = document.createElement("span");
      typeBadge.textContent = item.el.type;
      typeBadge.style.cssText = "font-size: 9px; color: #999; margin-left: auto;";
      row.appendChild(typeBadge);
      row.addEventListener("mouseenter", () => {
        row.style.background = "#e8f0fe";
        highlightElementOnSlide(item.id, s.currentSlideIndex, true);
      });
      row.addEventListener("mouseleave", () => {
        row.style.background = "";
        highlightElementOnSlide(item.id, s.currentSlideIndex, false);
      });
      row.addEventListener("click", (e) => {
        if (e.target.tagName === "INPUT") return;
        e.stopPropagation();
        s.selectedElementId = item.id;
        s.selectedConstraint = null;
        clearConstraintSelection();
        renderElementDetail(item.id, s.currentSlideIndex);
        updateSelectionHighlight(item.id, s.currentSlideIndex);
        renderResizeHandles(item.id, s.currentSlideIndex);
        refreshElementList();
      });
      listBody.appendChild(row);
    }
  }
  if (allEdges.length > 0) {
    const constraintHeader = document.createElement("div");
    constraintHeader.style.cssText = "padding: 6px 0 2px 0; font-weight: 600; font-size: 11px; color: #555; border-top: 1px solid #e8e8e8; margin-top: 4px;";
    constraintHeader.textContent = "Constraints";
    listBody.appendChild(constraintHeader);
    for (const edge of allEdges) {
      const row = document.createElement("div");
      row.style.cssText = "display: flex; align-items: center; gap: 4px; padding: 1px 0 1px 4px; font-size: 10px; cursor: pointer; color: #555;";
      const arrow = document.createElement("span");
      arrow.textContent = "\u2192";
      arrow.style.color = "#999";
      row.appendChild(arrow);
      const text = document.createElement("span");
      let desc = `${edge.fromId} ${edge.type} ${edge.toId}`;
      if (edge.gap !== void 0) desc += ` (${edge.gap})`;
      text.textContent = desc;
      row.appendChild(text);
      row.addEventListener("mouseenter", () => {
        row.style.background = "#e8f0fe";
        highlightElementOnSlide(edge.fromId, s.currentSlideIndex, true);
        highlightElementOnSlide(edge.toId, s.currentSlideIndex, true);
      });
      row.addEventListener("mouseleave", () => {
        row.style.background = "";
        highlightElementOnSlide(edge.fromId, s.currentSlideIndex, false);
        highlightElementOnSlide(edge.toId, s.currentSlideIndex, false);
      });
      row.addEventListener("click", (e) => {
        e.stopPropagation();
        const constraintAxis = axisForType(edge.type);
        if (constraintAxis) {
          s.selectedElementId = null;
          s.selectedConstraint = { elementId: edge.toId, axis: constraintAxis };
          renderConstraintDetail(edge.toId, constraintAxis, s.currentSlideIndex);
          updateConstraintHighlight(edge.toId, constraintAxis, s.currentSlideIndex);
        }
      });
      listBody.appendChild(row);
    }
  }
  section.appendChild(listBody);
  header.addEventListener("click", () => {
    s.elementListExpanded = !s.elementListExpanded;
    listBody.style.display = s.elementListExpanded ? "block" : "none";
    chevron.style.transform = s.elementListExpanded ? "rotate(90deg)" : "rotate(0deg)";
  });
  container.appendChild(section);
}
function highlightElementOnSlide(elementId, slideIndex, show) {
  const s = debugController.state;
  if (!s.debugOverlay) return;
  const existing = s.debugOverlay.querySelectorAll(`[data-sk-debug="hover-highlight"][data-sk-debug-id="${elementId}"]`);
  existing.forEach((el2) => el2.remove());
  if (!show) return;
  const sk = typeof window !== "undefined" ? window.sk : null;
  const allElements = sk?.layouts?.[slideIndex]?.elements;
  const sceneEl = allElements?.[elementId];
  if (!sceneEl?.resolved) return;
  const r = absoluteBounds(sceneEl, allElements);
  const highlight = document.createElement("div");
  highlight.setAttribute("data-sk-debug", "hover-highlight");
  highlight.setAttribute("data-sk-debug-id", elementId);
  highlight.style.cssText = `
    position: absolute; left: ${r.x}px; top: ${r.y}px;
    width: ${r.w}px; height: ${r.h}px;
    border: 2px solid #4a9eff; background: rgba(74, 158, 255, 0.15);
    box-sizing: border-box; pointer-events: none; z-index: 10000;
  `;
  s.debugOverlay.appendChild(highlight);
}
function buildReflessConstraintRows(elementId, slideIndex, authored) {
  if (!authored?.props) return [];
  const props = authored.props;
  const rows = [];
  for (const axis of ["x", "y", "w", "h"]) {
    const val = props[axis];
    if (!isRelMarker(val)) continue;
    if (!REFLESS_TYPES.has(val._rel)) continue;
    const marker = val;
    const label = REFLESS_LABELS[marker._rel] ?? marker._rel;
    const axisKey = REFLESS_AXIS[marker._rel] ?? axis;
    const badgeColor = AXIS_BADGE_COLORS[axisKey] ?? "#666";
    const row = document.createElement("div");
    row.style.cssText = "padding:3px 0;display:flex;align-items:center;gap:6px;";
    const axisBadge = document.createElement("span");
    axisBadge.textContent = axisKey.toUpperCase();
    axisBadge.style.cssText = `
      display:inline-block;padding:1px 5px;border-radius:3px;
      font-size:10px;font-weight:700;color:#fff;background:${badgeColor};
      line-height:1.4;letter-spacing:0.5px;flex-shrink:0;
    `;
    row.appendChild(axisBadge);
    const labelSpan = document.createElement("span");
    labelSpan.style.cssText = "color:#1a1a2e;flex:1;";
    if (marker._rel === "matchMaxWidth" || marker._rel === "matchMaxHeight") {
      const groupName = marker.group ?? "(unnamed)";
      const memberCount = getGroupMemberIds(marker._rel, groupName, slideIndex).length;
      labelSpan.innerHTML = `${escapeHtml(label)} <span style="color:#4a9eff;font-weight:600;">"${escapeHtml(groupName)}"</span><span style="color:#999;"> \xB7 ${memberCount} member${memberCount !== 1 ? "s" : ""}</span>`;
      row.addEventListener("mouseenter", () => {
        const memberIds = getGroupMemberIds(marker._rel, groupName, slideIndex);
        for (const mid of memberIds) {
          highlightElementOnSlide(mid, slideIndex, true);
        }
      });
      row.addEventListener("mouseleave", () => {
        const memberIds = getGroupMemberIds(marker._rel, groupName, slideIndex);
        for (const mid of memberIds) {
          highlightElementOnSlide(mid, slideIndex, false);
        }
      });
    } else {
      labelSpan.textContent = label;
    }
    row.appendChild(labelSpan);
    const freezeBtn = document.createElement("button");
    freezeBtn.textContent = "Unlock";
    freezeBtn.style.cssText = `
      padding:3px 8px;font-size:10px;cursor:pointer;
      font-family:'SF Mono','Fira Code','Consolas',monospace;
      background:#fff;color:#4a9eff;border:1px solid #4a9eff;
      border-radius:3px;font-weight:600;flex-shrink:0;
    `;
    freezeBtn.addEventListener("mouseenter", () => {
      freezeBtn.style.background = "#4a9eff";
      freezeBtn.style.color = "#fff";
    });
    freezeBtn.addEventListener("mouseleave", () => {
      freezeBtn.style.background = "#fff";
      freezeBtn.style.color = "#4a9eff";
    });
    freezeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      freezeReflessConstraint(elementId, axisKey, slideIndex);
    });
    row.appendChild(freezeBtn);
    rows.push(row);
  }
  return rows;
}
function getGroupMemberIds(relType, groupName, slideIndex) {
  const sk = typeof window !== "undefined" ? window.sk : null;
  const def = sk?._definitions?.[slideIndex];
  if (!def) return [];
  const { flatMap } = flattenElements(def.elements);
  const ids = [];
  for (const [id, el2] of flatMap) {
    const props = el2.props;
    if (!props) continue;
    const axis = relType === "matchMaxWidth" ? "w" : "h";
    const val = props[axis];
    if (isRelMarker(val) && val._rel === relType && val.group === groupName) {
      ids.push(id);
    }
  }
  return ids;
}
async function freezeReflessConstraint(elementId, axis, slideIndex) {
  const sk = window.sk;
  if (!sk?._definitions?.[slideIndex] || !sk?.layouts?.[slideIndex]) return;
  const layoutResult = sk.layouts[slideIndex];
  const sceneEl = layoutResult.elements[elementId];
  if (!sceneEl?.resolved) return;
  const definition = sk._definitions[slideIndex];
  const { flatMap } = flattenElements(definition.elements);
  const element = flatMap.get(elementId);
  if (!element) return;
  const props = element.props;
  const oldValue = props[axis];
  const resolvedValue = sceneEl.resolved[axis];
  props[axis] = resolvedValue;
  const rerender = sk._rerenderSlide;
  if (!rerender) return;
  await rerender(slideIndex, definition);
  const s = debugController.state;
  s.undoStack.push({ elementId, propKey: axis, oldValue, newValue: resolvedValue, slideIndex });
  s.redoStack.length = 0;
  updateDiffDirtyIndicator();
  debugController.callbacks.renderDebugOverlay?.({ slideIndex, showInspector: false });
  s.selectedElementId = elementId;
  debugController.callbacks.renderElementDetail?.(elementId, slideIndex);
}
function showRelTypeDropdown(elementId, currentAxis, currentType, typeSpan, slideIndex) {
  const sameAxisTypes = typesForAxis(currentAxis);
  const otherAxis = currentAxis === "x" ? "y" : "x";
  const crossAxisTypes = typesForAxis(otherAxis);
  const select = document.createElement("select");
  select.style.cssText = `
    padding: 2px 4px; font-size: 11px;
    font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
    border: 1px solid #4a9eff; border-radius: 3px;
    background: #fff; color: #1a1a2e; outline: none;
    box-shadow: 0 0 3px rgba(74, 158, 255, 0.3);
    cursor: pointer;
  `;
  const sameGroup = document.createElement("optgroup");
  sameGroup.label = `${currentAxis}-axis`;
  for (const type of sameAxisTypes) {
    const opt = document.createElement("option");
    opt.value = type;
    opt.textContent = type;
    if (type === currentType) opt.selected = true;
    sameGroup.appendChild(opt);
  }
  select.appendChild(sameGroup);
  const crossGroup = document.createElement("optgroup");
  crossGroup.label = `${otherAxis}-axis`;
  for (const type of crossAxisTypes) {
    const opt = document.createElement("option");
    opt.value = type;
    opt.textContent = type;
    crossGroup.appendChild(opt);
  }
  select.appendChild(crossGroup);
  const parent = typeSpan.parentNode;
  parent.replaceChild(select, typeSpan);
  select.focus();
  const commit = () => {
    const newType = select.value;
    if (newType !== currentType) {
      changeConstraintType(elementId, currentAxis, newType, slideIndex);
    }
    const s = debugController.state;
    s.selectedElementId = elementId;
    debugController.callbacks.renderElementDetail?.(elementId, slideIndex);
  };
  let committed = false;
  select.addEventListener("change", () => {
    committed = true;
    commit();
  });
  select.addEventListener("blur", () => {
    if (committed) return;
    const s = debugController.state;
    s.selectedElementId = elementId;
    debugController.callbacks.renderElementDetail?.(elementId, slideIndex);
  });
  select.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      const s = debugController.state;
      s.selectedElementId = elementId;
      debugController.callbacks.renderElementDetail?.(elementId, slideIndex);
    }
  });
}
function createSection(title, content, collapsed = false) {
  const section = document.createElement("div");
  section.setAttribute("data-sk-inspector-section", title);
  section.style.borderBottom = "1px solid #e8e8e8";
  const hdr = document.createElement("div");
  hdr.style.padding = "8px 16px";
  hdr.style.cursor = "pointer";
  hdr.style.display = "flex";
  hdr.style.alignItems = "center";
  hdr.style.userSelect = "none";
  hdr.style.fontSize = "11px";
  hdr.style.fontWeight = "600";
  hdr.style.textTransform = "uppercase";
  hdr.style.letterSpacing = "0.5px";
  hdr.style.color = "#777";
  const chevron = document.createElement("span");
  chevron.setAttribute("data-sk-inspector-chevron", "true");
  chevron.textContent = collapsed ? "\u25B6" : "\u25BC";
  chevron.style.marginRight = "6px";
  chevron.style.fontSize = "9px";
  hdr.appendChild(chevron);
  const titleSpan = document.createElement("span");
  titleSpan.textContent = title;
  hdr.appendChild(titleSpan);
  section.appendChild(hdr);
  const contentWrap = document.createElement("div");
  contentWrap.setAttribute("data-sk-inspector-content", "true");
  contentWrap.style.padding = "0 16px 8px";
  contentWrap.style.display = collapsed ? "none" : "block";
  contentWrap.appendChild(content);
  section.appendChild(contentWrap);
  hdr.addEventListener("click", () => {
    const isHidden = contentWrap.style.display === "none";
    contentWrap.style.display = isHidden ? "block" : "none";
    chevron.textContent = isHidden ? "\u25BC" : "\u25B6";
  });
  return section;
}
function renderElementDetail(elementId, slideIndex) {
  const s = debugController.state;
  const body = s.inspectorPanel?.querySelector("[data-sk-inspector-body]");
  if (!body) return;
  body.innerHTML = "";
  const sk = typeof window !== "undefined" ? window.sk : null;
  if (!sk?.layouts?.[slideIndex]) return;
  const layoutResult = sk.layouts[slideIndex];
  const sceneEl = layoutResult.elements[elementId];
  if (!sceneEl) {
    renderEmptyState();
    return;
  }
  const identityDiv = document.createElement("div");
  const typeBadgeColor = TYPE_BADGE_COLORS[sceneEl.type] || "#666";
  identityDiv.innerHTML = `
    <div style="margin-bottom:6px;"><strong style="color:#1a1a2e;font-size:14px;">${escapeHtml(sceneEl.id)}</strong>${badge(sceneEl.type, typeBadgeColor)}</div>
    <div style="margin-bottom:2px;">Parent: <span style="color:#666;">${sceneEl.parentId ?? "(root)"}</span></div>
    ${sceneEl._internal ? '<div style="color:#ff8c32;">Internal element</div>' : ""}
  `;
  body.appendChild(createSection("Identity", identityDiv));
  const authored = sceneEl.authored;
  const htmlDiv = document.createElement("div");
  if (authored?.content !== void 0) {
    const textarea = document.createElement("textarea");
    textarea.value = authored.content;
    textarea.style.cssText = `
      width: 100%; min-height: 80px; max-height: 300px; padding: 6px;
      font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
      font-size: 11px; color: #1a1a2e; background: #fff;
      border: 1px solid #ddd; border-radius: 3px; resize: vertical;
      box-sizing: border-box; line-height: 1.4;
    `;
    textarea.setAttribute("data-sk-html-editor", "true");
    textarea.spellcheck = false;
    const statusMsg = document.createElement("div");
    statusMsg.style.cssText = "font-size: 10px; margin-top: 4px; min-height: 14px;";
    let committedContent = authored.content;
    let lastPreviewedContent = authored.content;
    let previewSeq = 0;
    const previewHtml = async (content) => {
      const sk2 = window.sk;
      if (!sk2?._definitions?.[slideIndex]) return;
      const def = sk2._definitions[slideIndex];
      const flat = flattenElements(def.elements);
      const defElement = flat.flatMap.get(elementId);
      if (!defElement || !("content" in defElement)) return;
      defElement.content = content;
      const rerender = sk2._rerenderSlide;
      if (!rerender) return;
      const seq = ++previewSeq;
      await rerender(slideIndex, def);
      if (seq !== previewSeq) return;
      debugController.callbacks.refreshOverlayOnly?.(slideIndex);
      lastPreviewedContent = content;
    };
    const commitHtmlEdit = async () => {
      const newContent = textarea.value;
      if (newContent === committedContent) return;
      if (lastPreviewedContent !== newContent) {
        await previewHtml(newContent);
      }
      const ds = debugController.state;
      ds.undoStack.push({ elementId, propKey: "_content", oldValue: committedContent, newValue: newContent, slideIndex });
      ds.redoStack.length = 0;
      updateDiffDirtyIndicator();
      committedContent = newContent;
      statusMsg.textContent = "Committed";
      statusMsg.style.color = "#4caf50";
      setTimeout(() => {
        if (statusMsg.textContent === "Committed") statusMsg.textContent = "";
      }, 2e3);
    };
    let inputDebounce = null;
    textarea.addEventListener("input", () => {
      if (inputDebounce) clearTimeout(inputDebounce);
      inputDebounce = setTimeout(() => {
        const content = textarea.value;
        const parser = new DOMParser();
        const doc = parser.parseFromString(`<body>${content}</body>`, "text/html");
        const errors = doc.querySelectorAll("parsererror");
        if (errors.length > 0) {
          statusMsg.textContent = "Invalid HTML";
          statusMsg.style.color = "#ea4335";
          textarea.style.borderColor = "#ea4335";
          return;
        }
        textarea.style.borderColor = "#4a9eff";
        statusMsg.textContent = content !== committedContent ? "Preview" : "";
        statusMsg.style.color = "#ff8c32";
        previewHtml(content);
      }, 150);
    });
    textarea.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.key === "Enter") {
        e.preventDefault();
        commitHtmlEdit();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        textarea.value = committedContent;
        textarea.style.borderColor = "#ddd";
        statusMsg.textContent = "";
        if (lastPreviewedContent !== committedContent) {
          previewHtml(committedContent);
        }
      }
    });
    textarea.addEventListener("blur", () => {
      if (inputDebounce) clearTimeout(inputDebounce);
      commitHtmlEdit();
    });
    const hint = document.createElement("div");
    hint.textContent = "Live preview \u2022 Ctrl+Enter to commit, Esc to revert";
    hint.style.cssText = "font-size: 10px; color: #999; margin-top: 2px;";
    htmlDiv.appendChild(textarea);
    htmlDiv.appendChild(statusMsg);
    htmlDiv.appendChild(hint);
  } else {
    htmlDiv.innerHTML = '<span style="color:#aaa;">(none)</span>';
  }
  body.appendChild(createSection("Inner HTML", htmlDiv));
  const boundsDiv = document.createElement("div");
  const r = sceneEl.resolved;
  boundsDiv.innerHTML = `<table style="width:100%;border-collapse:collapse;">
    <tr><td style="color:#999;padding:2px 8px 2px 0;">x</td><td style="color:#1a1a2e;">${r.x.toFixed(1)}</td>
        <td style="color:#999;padding:2px 8px 2px 16px;">y</td><td style="color:#1a1a2e;">${r.y.toFixed(1)}</td></tr>
    <tr><td style="color:#999;padding:2px 8px 2px 0;">w</td><td style="color:#1a1a2e;">${r.w.toFixed(1)}</td>
        <td style="color:#999;padding:2px 8px 2px 16px;">h</td><td style="color:#1a1a2e;">${r.h.toFixed(1)}</td></tr>
  </table>`;
  body.appendChild(createSection("Resolved Bounds", boundsDiv));
  const propsDiv = document.createElement("div");
  if (authored?.props) {
    const prov2 = sceneEl.provenance;
    const lockedSources = /* @__PURE__ */ new Set(["constraint", "stack", "transform"]);
    let hasProps = false;
    const propsEntries = Object.entries(authored.props);
    if (sceneEl.type === "connector") {
      const idx = propsEntries.findIndex(([k]) => k === "cornerRadius");
      if (idx >= 0 && propsEntries[idx][1] == null) {
        propsEntries[idx] = ["cornerRadius", 0];
      } else if (idx < 0) {
        propsEntries.push(["cornerRadius", 0]);
      }
    }
    const priorityOrder = ["x", "y", "w", "h", "anchor"];
    propsEntries.sort((a, b) => {
      const ai = priorityOrder.indexOf(a[0]);
      const bi = priorityOrder.indexOf(b[0]);
      if (ai >= 0 && bi >= 0) return ai - bi;
      if (ai >= 0) return -1;
      if (bi >= 0) return 1;
      return 0;
    });
    for (const [key, val] of propsEntries) {
      if (key.startsWith("_")) continue;
      hasProps = true;
      let displayVal;
      if (val != null && typeof val === "object") {
        displayVal = JSON.stringify(val);
      } else {
        displayVal = String(val ?? "");
      }
      const axisProv = prov2?.[key];
      const isLocked = axisProv && lockedSources.has(axisProv.source || "");
      const enumOpts = !isLocked ? getEnumOptions(key, sceneEl.type) : null;
      const isAnchor = !isLocked && !enumOpts && isAnchorProp(key);
      const isGap = !isLocked && isGapProp(key);
      const isElId = !isLocked && !enumOpts && !isAnchor && !isGap && isElementIdProp(key);
      const editable = !isLocked && !enumOpts && !isAnchor && !isGap && !isElId && isEditableProp(key, val);
      const propRow = document.createElement("div");
      propRow.style.padding = "2px 0";
      propRow.setAttribute("data-sk-prop-key", key);
      const styleEditable = (row, status) => {
        row.style.color = "#1a1a2e";
        row.style.textDecoration = "underline";
        row.style.textDecorationStyle = "dashed";
        row.style.textUnderlineOffset = "2px";
        row.style.cursor = "pointer";
        row.setAttribute("data-sk-prop-status", status);
        row.addEventListener("mouseenter", () => {
          row.style.background = "#e8f0fe";
        });
        row.addEventListener("mouseleave", () => {
          row.style.background = "";
        });
      };
      if (isLocked) {
        propRow.style.color = "#aaa";
        propRow.setAttribute("data-sk-prop-status", "locked");
        propRow.innerHTML = `<span style="margin-right:2px;">&#128274;</span>${escapeHtml(key)}: ${escapeHtml(displayVal)}`;
        propRow.style.cursor = "help";
        propRow.addEventListener("click", (e) => {
          e.stopPropagation();
          showLockedTooltip(key, propRow, sceneEl);
        });
      } else if (enumOpts) {
        styleEditable(propRow, "enum");
        propRow.textContent = `${key}: ${displayVal}`;
        propRow.addEventListener("click", (e) => {
          e.stopPropagation();
          startEnumEdit(elementId, key, String(val ?? ""), enumOpts, propRow, slideIndex);
        });
      } else if (isAnchor) {
        styleEditable(propRow, "anchor");
        propRow.textContent = `${key}: ${displayVal}`;
        propRow.addEventListener("click", (e) => {
          e.stopPropagation();
          startAnchorEdit(elementId, key, String(val ?? "cc"), propRow, slideIndex);
        });
      } else if (isGap) {
        styleEditable(propRow, "gap");
        propRow.textContent = `${key}: ${displayVal}`;
        propRow.addEventListener("click", (e) => {
          e.stopPropagation();
          startGapTokenEdit(elementId, key, val, propRow, slideIndex);
        });
      } else if (isElId) {
        styleEditable(propRow, "element-id");
        propRow.textContent = `${key}: ${displayVal}`;
        propRow.addEventListener("click", (e) => {
          e.stopPropagation();
          startElementIdEdit(elementId, key, String(val ?? ""), propRow, slideIndex);
        });
      } else if (editable) {
        styleEditable(propRow, "editable");
        propRow.textContent = `${key}: ${displayVal}`;
        propRow.addEventListener("click", (e) => {
          e.stopPropagation();
          startEdit(elementId, key, val, propRow, slideIndex);
        });
      } else {
        propRow.style.color = "#1a1a2e";
        propRow.setAttribute("data-sk-prop-status", "readonly");
        propRow.textContent = `${key}: ${displayVal}`;
      }
      const constraintAxes = /* @__PURE__ */ new Set(["x", "y", "w", "h"]);
      if (constraintAxes.has(key) && !isLocked && !isRelMarker(val)) {
        const addBtn = document.createElement("span");
        addBtn.textContent = "+ add";
        addBtn.title = "Add constraint";
        addBtn.style.cssText = `
          font-size: 10px; color: #fff; background: #4a9eff; cursor: pointer;
          margin-left: 6px; font-weight: 600; padding: 1px 6px; border-radius: 3px;
          display: inline-block; line-height: 1.3;
        `;
        addBtn.addEventListener("mouseenter", () => {
          addBtn.style.background = "#1a73e8";
        });
        addBtn.addEventListener("mouseleave", () => {
          addBtn.style.background = "#4a9eff";
        });
        addBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          showConstraintPopover(addBtn, key, elementId, slideIndex);
        });
        propRow.appendChild(addBtn);
      }
      propsDiv.appendChild(propRow);
    }
    if (!hasProps) {
      propsDiv.innerHTML = '<span style="color:#aaa;">(none)</span>';
    }
  } else {
    propsDiv.innerHTML = '<span style="color:#aaa;">(none)</span>';
  }
  body.appendChild(createSection("Authored Props", propsDiv));
  const provDiv = document.createElement("div");
  const prov = sceneEl.provenance;
  let provHtml = "";
  for (const axis of ["x", "y", "w", "h"]) {
    const p = prov[axis];
    if (!p) continue;
    const color = PROVENANCE_COLORS[p.source] || "#999";
    provHtml += `<div style="padding:3px 0;">${axis}: ${badge(p.source, color)}`;
    if (p.source === "constraint") {
      provHtml += ` <span style="color:#666;">${escapeHtml(p.type || "")} ref=${escapeHtml(p.ref || "")}`;
      if (p.gap !== void 0) provHtml += ` gap=${p.gap}`;
      provHtml += `</span>`;
    } else if (p.source === "stack") {
      provHtml += ` <span style="color:#666;">stack=${escapeHtml(p.stackId || "")}</span>`;
    } else if (p.source === "transform" && p.original) {
      provHtml += ` <span style="color:#666;">original: ${escapeHtml(JSON.stringify(p.original))}</span>`;
    } else if (p.source === "authored" && p.value !== void 0) {
      provHtml += ` <span style="color:#666;">${escapeHtml(String(p.value))}</span>`;
    }
    if (p.sourceAnchor) provHtml += ` <span style="color:#999;">src=${p.sourceAnchor}</span>`;
    if (p.targetAnchor) provHtml += ` <span style="color:#999;">tgt=${p.targetAnchor}</span>`;
    provHtml += `</div>`;
  }
  provDiv.innerHTML = provHtml;
  body.appendChild(createSection("Provenance", provDiv));
  const relsDiv = document.createElement("div");
  const allEdges = extractRelationshipEdges(layoutResult.elements);
  const relEdges = allEdges.filter((e) => e.fromId === elementId || e.toId === elementId);
  const constrainedAxes = /* @__PURE__ */ new Set();
  const reflessRows = buildReflessConstraintRows(elementId, slideIndex, authored);
  const hasAnyConstraints = relEdges.length > 0 || reflessRows.length > 0;
  if (hasAnyConstraints) {
    for (const edge of relEdges) {
      const dir = edge.toId === elementId ? "incoming" : "outgoing";
      const arrow = dir === "incoming" ? "\u2190" : "\u2192";
      const otherId = dir === "incoming" ? edge.fromId : edge.toId;
      const edgeAxis = axisForType(edge.type);
      const row = document.createElement("div");
      row.style.cssText = "padding: 2px 0; display: flex; align-items: center;";
      const arrowSpan = document.createElement("span");
      arrowSpan.textContent = arrow + " ";
      row.appendChild(arrowSpan);
      if (dir === "incoming" && edgeAxis) {
        constrainedAxes.add(edgeAxis);
        const refSpan = document.createElement("span");
        refSpan.textContent = otherId;
        refSpan.style.color = "#1a1a2e";
        refSpan.style.textDecoration = "underline";
        refSpan.style.textDecorationStyle = "dashed";
        refSpan.style.textUnderlineOffset = "2px";
        refSpan.style.cursor = "pointer";
        refSpan.title = "Click to change reference element";
        refSpan.addEventListener("mouseenter", () => {
          refSpan.style.background = "#e8f0fe";
        });
        refSpan.addEventListener("mouseleave", () => {
          refSpan.style.background = "";
        });
        refSpan.addEventListener("click", (e) => {
          e.stopPropagation();
          enterPickMode(elementId, edgeAxis, edge.type, slideIndex);
        });
        row.appendChild(refSpan);
        row.appendChild(document.createTextNode(" "));
        const typeSpan = document.createElement("span");
        typeSpan.textContent = edge.type;
        typeSpan.style.color = "#666";
        typeSpan.style.textDecoration = "underline";
        typeSpan.style.textDecorationStyle = "dashed";
        typeSpan.style.textUnderlineOffset = "2px";
        typeSpan.style.cursor = "pointer";
        typeSpan.title = "Click to change constraint type";
        typeSpan.addEventListener("mouseenter", () => {
          typeSpan.style.background = "#e8f0fe";
        });
        typeSpan.addEventListener("mouseleave", () => {
          typeSpan.style.background = "";
        });
        typeSpan.addEventListener("click", (e) => {
          e.stopPropagation();
          showRelTypeDropdown(elementId, edgeAxis, edge.type, typeSpan, slideIndex);
        });
        row.appendChild(typeSpan);
        const anchorSpan = document.createElement("span");
        anchorSpan.textContent = ` [${edge.sourceAnchor}\u2192${edge.targetAnchor}]`;
        anchorSpan.style.color = "#999";
        row.appendChild(anchorSpan);
        if (edge.gap !== void 0 && isEditableGap(edge.type)) {
          const axis = edge.type === "below" || edge.type === "above" ? "y" : "x";
          const gapSpan = document.createElement("span");
          gapSpan.textContent = ` gap=${edge.gap}`;
          gapSpan.style.color = "#1a1a2e";
          gapSpan.style.textDecoration = "underline";
          gapSpan.style.textDecorationStyle = "dashed";
          gapSpan.style.textUnderlineOffset = "2px";
          gapSpan.style.cursor = "pointer";
          gapSpan.setAttribute("data-sk-gap-edit", `${axis}.gap`);
          gapSpan.addEventListener("mouseenter", () => {
            gapSpan.style.background = "#e8f0fe";
          });
          gapSpan.addEventListener("mouseleave", () => {
            gapSpan.style.background = "";
          });
          gapSpan.addEventListener("click", (e) => {
            e.stopPropagation();
            startGapTokenEdit(elementId, `${axis}.gap`, edge.gap, gapSpan, slideIndex);
          });
          row.appendChild(gapSpan);
        } else if (edge.gap !== void 0) {
          const gapSpan = document.createElement("span");
          gapSpan.textContent = ` gap=${edge.gap}`;
          gapSpan.style.color = "#999";
          row.appendChild(gapSpan);
        }
        const unlockBtn = document.createElement("button");
        unlockBtn.textContent = "Unlock";
        unlockBtn.style.cssText = `
          padding: 2px 6px; font-size: 9px; cursor: pointer;
          font-family: monospace; background: #fff; color: #ea4335;
          border: 1px solid #ea4335; border-radius: 3px; font-weight: 600;
          margin-left: auto; flex-shrink: 0;
        `;
        unlockBtn.addEventListener("mouseenter", () => {
          unlockBtn.style.background = "#ea4335";
          unlockBtn.style.color = "#fff";
        });
        unlockBtn.addEventListener("mouseleave", () => {
          unlockBtn.style.background = "#fff";
          unlockBtn.style.color = "#ea4335";
        });
        unlockBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          breakConstraint(elementId, edgeAxis, slideIndex);
        });
        row.appendChild(unlockBtn);
      } else {
        const textPart = document.createElement("span");
        textPart.innerHTML = `<span style="color:#1a1a2e;">${escapeHtml(otherId)}</span> <span style="color:#666;">${escapeHtml(edge.type)} [${edge.sourceAnchor}\u2192${edge.targetAnchor}]</span>`;
        row.appendChild(textPart);
        if (edge.gap !== void 0) {
          const gapSpan = document.createElement("span");
          gapSpan.textContent = ` gap=${edge.gap}`;
          gapSpan.style.color = "#999";
          row.appendChild(gapSpan);
        }
      }
      relsDiv.appendChild(row);
    }
    for (const row of reflessRows) {
      relsDiv.appendChild(row);
    }
  } else {
    relsDiv.innerHTML = '<span style="color:#aaa;">(none)</span>';
  }
  if (authored?.props) {
    const authoredProps = authored.props;
    for (const axis of ["x", "y", "w", "h"]) {
      if (isRelMarker(authoredProps[axis])) {
        constrainedAxes.add(axis);
      }
    }
  }
  const availableAxes = ["x", "y", "w", "h"].filter((a) => !constrainedAxes.has(a));
  if (availableAxes.length > 0) {
    const addRow = document.createElement("div");
    addRow.style.cssText = "margin-top: 6px; display: flex; gap: 4px; flex-wrap: wrap;";
    for (const axis of availableAxes) {
      const btn = document.createElement("button");
      btn.textContent = `+ ${axis.toUpperCase()}`;
      btn.style.cssText = `
        padding: 4px 10px; font-size: 10px; cursor: pointer;
        background: #f0f7ff; color: #4a9eff; border: 1px solid #4a9eff;
        border-radius: 4px; font-weight: 600;
      `;
      btn.addEventListener("mouseenter", () => {
        btn.style.background = "#4a9eff";
        btn.style.color = "#fff";
      });
      btn.addEventListener("mouseleave", () => {
        btn.style.background = "#f0f7ff";
        btn.style.color = "#4a9eff";
      });
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        showConstraintPopover(btn, axis, elementId, slideIndex);
      });
      addRow.appendChild(btn);
    }
    relsDiv.appendChild(addRow);
  }
  body.appendChild(createSection("Constraints", relsDiv));
  const stylesDiv = document.createElement("div");
  const styleObj = authored?.props?.style;
  if (styleObj && Object.keys(styleObj).length > 0) {
    let stylesHtml = "";
    for (const [prop, val] of Object.entries(styleObj)) {
      stylesHtml += `<div style="padding:1px 0;">${escapeHtml(prop)}: <span style="color:#1a1a2e;">${escapeHtml(String(val))}</span></div>`;
    }
    stylesDiv.innerHTML = stylesHtml;
  } else {
    stylesDiv.innerHTML = '<span style="color:#aaa;">(none)</span>';
  }
  body.appendChild(createSection("CSS Styles", stylesDiv, true));
}
function updateSelectionHighlight(elementId, slideIndex) {
  const s = debugController.state;
  if (s.debugOverlay) {
    const existing = s.debugOverlay.querySelectorAll('[data-sk-debug="selection"]');
    existing.forEach((el2) => el2.remove());
  }
  if (!elementId || !s.debugOverlay) return;
  const sk = typeof window !== "undefined" ? window.sk : null;
  if (!sk?.layouts?.[slideIndex]) return;
  const allElements = sk.layouts[slideIndex].elements;
  const sceneEl = allElements[elementId];
  if (!sceneEl?.resolved) return;
  const r = absoluteBounds(sceneEl, allElements);
  const highlight = document.createElement("div");
  highlight.setAttribute("data-sk-debug", "selection");
  highlight.setAttribute("data-sk-debug-id", elementId);
  highlight.style.position = "absolute";
  highlight.style.left = `${r.x}px`;
  highlight.style.top = `${r.y}px`;
  highlight.style.width = `${r.w}px`;
  highlight.style.height = `${r.h}px`;
  highlight.style.border = "2px solid #fff";
  highlight.style.boxShadow = "0 0 8px rgba(255,255,255,0.6)";
  highlight.style.boxSizing = "border-box";
  highlight.style.pointerEvents = "none";
  highlight.style.zIndex = "10000";
  s.debugOverlay.appendChild(highlight);
}
function handleInspectorClick(event) {
  const s = debugController.state;
  if (s.dragInProgress) return;
  if (!s.debugOverlay) return;
  const target = event.target;
  if (target && target.closest('[data-sk-role="debug-inspector"]')) return;
  if (target && target.closest('[data-sk-debug="resize-handle"]')) return;
  const hitTarget = target?.closest('[data-sk-debug="rel-hit"]');
  if (hitTarget) {
    const elementId = hitTarget.getAttribute("data-sk-debug-element");
    const axis = hitTarget.getAttribute("data-sk-debug-axis");
    if (elementId && axis) {
      s.selectedElementId = null;
      updateSelectionHighlight(null, s.currentSlideIndex);
      removeResizeHandles();
      s.selectedConstraint = { elementId, axis };
      renderConstraintDetail(elementId, axis, s.currentSlideIndex);
      updateConstraintHighlight(elementId, axis, s.currentSlideIndex);
      return;
    }
  }
  const skEl = target?.closest("[data-sk-id]");
  if (skEl) {
    const id = skEl.getAttribute("data-sk-id");
    if (id) {
      clearConstraintSelection();
      s.selectedElementId = id;
      renderElementDetail(id, s.currentSlideIndex);
      updateSelectionHighlight(id, s.currentSlideIndex);
      renderResizeHandles(id, s.currentSlideIndex);
      return;
    }
  }
  s.selectedElementId = null;
  clearConstraintSelection();
  renderEmptyState();
  updateSelectionHighlight(null, s.currentSlideIndex);
  removeResizeHandles();
}
function attachClickHandler() {
  const s = debugController.state;
  if (s.clickHandlerAttached) return;
  document.addEventListener("click", handleInspectorClick, true);
  attachContextMenuHandler();
  s.clickHandlerAttached = true;
}
function detachClickHandler() {
  const s = debugController.state;
  if (!s.clickHandlerAttached) return;
  document.removeEventListener("click", handleInspectorClick, true);
  detachContextMenuHandler();
  s.clickHandlerAttached = false;
}
var CONSTRAINT_REGISTRY;
var activeConstraintPopover;
var activePopoverCleanup;
var VISIBILITY_OPTIONS;
var LAYER_ORDER;
var LAYER_LABELS;
var AXIS_BADGE_COLORS;
var REFLESS_LABELS;
var REFLESS_AXIS;
var init_debug_inspector = __esm({
  "slidekit/src/debug-inspector.ts"() {
    "use strict";
    init_debug_state();
    init_debug_inspector_styles();
    init_debug_inspector_viewport();
    init_debug_inspector_diff();
    init_debug_overlay();
    init_helpers();
    init_debug_inspector_edit();
    init_debug_inspector_drag();
    init_debug_inspector_constraint();
    init_debug_context_menu();
    init_debug_inspector_pick();
    CONSTRAINT_REGISTRY = [
      // x axis
      { id: "rightOf", label: "Right of...", axis: "x", targetAxis: "x", requiresRef: true, hasGap: true, requiresGroup: false },
      { id: "leftOf", label: "Left of...", axis: "x", targetAxis: "x", requiresRef: true, hasGap: true, requiresGroup: false },
      { id: "centerH", label: "Center with...", axis: "x", targetAxis: "x", requiresRef: true, hasGap: false, requiresGroup: false },
      { id: "alignLeft", label: "Align left with...", axis: "x", targetAxis: "x", requiresRef: true, hasGap: false, requiresGroup: false },
      { id: "alignRight", label: "Align right with...", axis: "x", targetAxis: "x", requiresRef: true, hasGap: false, requiresGroup: false },
      { id: "centerHSlide", label: "Center on slide", axis: "x", targetAxis: "x", requiresRef: false, hasGap: false, requiresGroup: false },
      // y axis
      { id: "below", label: "Below...", axis: "y", targetAxis: "y", requiresRef: true, hasGap: true, requiresGroup: false },
      { id: "above", label: "Above...", axis: "y", targetAxis: "y", requiresRef: true, hasGap: true, requiresGroup: false },
      { id: "centerV", label: "Center with...", axis: "y", targetAxis: "y", requiresRef: true, hasGap: false, requiresGroup: false },
      { id: "alignTop", label: "Align top with...", axis: "y", targetAxis: "y", requiresRef: true, hasGap: false, requiresGroup: false },
      { id: "alignBottom", label: "Align bottom with...", axis: "y", targetAxis: "y", requiresRef: true, hasGap: false, requiresGroup: false },
      { id: "centerVSlide", label: "Center on slide", axis: "y", targetAxis: "y", requiresRef: false, hasGap: false, requiresGroup: false },
      // w axis
      { id: "matchWidth", label: "Match width of...", axis: "w", targetAxis: "w", requiresRef: true, hasGap: false, requiresGroup: false },
      { id: "matchMaxWidth", label: "Match widest in group...", axis: "w", targetAxis: "w", requiresRef: false, hasGap: false, requiresGroup: true },
      // h axis
      { id: "matchHeight", label: "Match height of...", axis: "h", targetAxis: "h", requiresRef: true, hasGap: false, requiresGroup: false },
      { id: "matchMaxHeight", label: "Match tallest in group...", axis: "h", targetAxis: "h", requiresRef: false, hasGap: false, requiresGroup: true }
    ];
    activeConstraintPopover = null;
    activePopoverCleanup = null;
    VISIBILITY_OPTIONS = [
      { key: "showBoxes", label: "Boxes", default: true },
      { key: "showIds", label: "Labels", default: true },
      { key: "showAnchors", label: "Anchors", default: true },
      { key: "showSafeZone", label: "Safe Zone", default: true },
      { key: "showCollisions", label: "Collisions", default: true },
      { key: "showRelationships", label: "Constraints", default: true }
    ];
    LAYER_ORDER = ["overlay", "content", "bg"];
    LAYER_LABELS = { overlay: "Overlay", content: "Content", bg: "Background" };
    AXIS_BADGE_COLORS = {
      x: "#4a9eff",
      y: "#34a853",
      w: "#ff8c32",
      h: "#ea4335"
    };
    REFLESS_LABELS = {
      centerHSlide: "Centered horizontally on slide",
      centerVSlide: "Centered vertically on slide",
      matchMaxWidth: "Match widest in group",
      matchMaxHeight: "Match tallest in group"
    };
    REFLESS_AXIS = {
      centerHSlide: "x",
      centerVSlide: "y",
      matchMaxWidth: "w",
      matchMaxHeight: "h"
    };
  }
});
var VERSION = true ? "0.3.5" : "dev";
var state = {
  idCounter: 0,
  config: null,
  safeRectCache: null,
  loadedFonts: /* @__PURE__ */ new Set(),
  measureContainer: null,
  measureCache: /* @__PURE__ */ new Map(),
  fontWarnings: [],
  injectedFontLinks: /* @__PURE__ */ new Set(),
  transformIdCounter: 0
};
function resetIdCounter() {
  state.idCounter = 0;
}
function nextId() {
  state.idCounter += 1;
  return `sk-${state.idCounter}`;
}
var DEFAULT_SPACING = {
  xs: 8,
  sm: 16,
  md: 24,
  lg: 32,
  xl: 48,
  section: 80
};
function resolveSpacing(value) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const scale = state.config?.spacing || DEFAULT_SPACING;
    if (Object.prototype.hasOwnProperty.call(scale, value)) return scale[value];
    const available = Object.keys(scale).join(", ");
    throw new Error(`Unknown spacing token "${value}". Available tokens: ${available}`);
  }
  return value;
}
function getSpacing(token) {
  return resolveSpacing(token);
}
var COMMON_DEFAULTS = {
  x: 0,
  y: 0,
  anchor: "tl",
  layer: "content",
  opacity: 1,
  style: null,
  // sentinel — applyDefaults creates fresh {} per element
  className: "",
  vAlign: "top"
};
function applyDefaults(props, extraDefaults = {}) {
  const merged = { ...COMMON_DEFAULTS, ...extraDefaults };
  const result = {};
  for (const key of Object.keys(merged)) {
    if (key === "id") continue;
    if (key === "style") {
      result[key] = props[key] !== void 0 ? props[key] : {};
    } else {
      result[key] = props[key] !== void 0 ? props[key] : merged[key];
    }
  }
  for (const key of Object.keys(props)) {
    if (key === "id") continue;
    if (result[key] === void 0) {
      result[key] = props[key];
    }
  }
  return result;
}
function el(html, props = {}) {
  const { id: customId, ...rest } = props;
  const id = customId || nextId();
  const resolved = applyDefaults(rest, {
    overflow: "visible"
  });
  return { id, type: "el", content: html, props: resolved, _layoutFlags: {} };
}
function group(children, props = {}) {
  const { id: customId, ...rest } = props;
  const id = customId || nextId();
  const resolved = applyDefaults(rest, {
    scale: 1,
    clip: false
  });
  return { id, type: "group", children, props: resolved, _layoutFlags: {} };
}
function vstack(items, props = {}) {
  const { id: customId, ...rest } = props;
  const id = customId || nextId();
  const resolved = applyDefaults(rest, {
    gap: 0,
    align: "left"
  });
  return { id, type: "vstack", children: items, props: resolved, _layoutFlags: {} };
}
function hstack(items, props = {}) {
  const { id: customId, ...rest } = props;
  const id = customId || nextId();
  const resolved = applyDefaults(rest, {
    gap: 0,
    align: "top"
  });
  return { id, type: "hstack", children: items, props: resolved, _layoutFlags: {} };
}
function cardGrid(items, { id, cols = 2, gap = 0, x = 0, y = 0, w, anchor, layer, style } = {}) {
  const safeCols = Math.max(1, Math.floor(cols || 2));
  const resolvedGap = resolveSpacing(typeof gap === "string" || typeof gap === "number" ? gap : 0);
  const rows = [];
  for (let i = 0; i < items.length; i += safeCols) {
    rows.push(items.slice(i, i + safeCols));
  }
  const rowStacks = rows.map(
    (rowItems, idx) => hstack(rowItems, { id: id ? `${id}-row-${idx}` : void 0, gap: resolvedGap, align: "stretch" })
  );
  return vstack(rowStacks, {
    id,
    x,
    y,
    w,
    gap: resolvedGap,
    anchor,
    layer,
    style
  });
}
var VALID_ANCHORS = /* @__PURE__ */ new Set(["tl", "tc", "tr", "cl", "cc", "cr", "bl", "bc", "br"]);
function resolveAnchor(x, y, w, h, anchor) {
  if (typeof anchor !== "string" || !VALID_ANCHORS.has(anchor)) {
    throw new Error(
      `Invalid anchor "${anchor}". Must be one of: ${Array.from(VALID_ANCHORS).join(", ")}`
    );
  }
  let left;
  const col = anchor[1];
  if (col === "l") {
    left = x;
  } else if (col === "c") {
    left = x - w / 2;
  } else if (col === "r") {
    left = x - w;
  } else {
    throw new Error(`Invalid anchor column "${col}" in anchor "${anchor}"`);
  }
  let top;
  const row = anchor[0];
  if (row === "t") {
    top = y;
  } else if (row === "c") {
    top = y - h / 2;
  } else if (row === "b") {
    top = y - h;
  } else {
    throw new Error(`Invalid anchor row "${row}" in anchor "${anchor}"`);
  }
  return { left, top };
}
function toCamelCase(name) {
  if (name.startsWith("--")) return name;
  if (!name.includes("-")) return name;
  let normalized = name;
  if (normalized.startsWith("-ms-")) {
    normalized = "ms-" + normalized.slice(4);
  } else if (normalized.startsWith("-webkit-")) {
    normalized = "Webkit-" + normalized.slice(8);
  } else if (normalized.startsWith("-moz-")) {
    normalized = "Moz-" + normalized.slice(5);
  } else if (normalized.startsWith("-o-")) {
    normalized = "O-" + normalized.slice(3);
  }
  return normalized.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}
function stripVendorPrefix(camelName) {
  const prefixes = ["Webkit", "Moz", "ms", "O"];
  for (const prefix of prefixes) {
    if (camelName.startsWith(prefix) && camelName.length > prefix.length) {
      const rest = camelName.slice(prefix.length);
      if (rest[0] >= "A" && rest[0] <= "Z") {
        return rest[0].toLowerCase() + rest.slice(1);
      }
    }
  }
  return camelName;
}
var CSS_LIKE_PROPS = /* @__PURE__ */ new Set([
  // Text
  "textAlign",
  "textDecoration",
  "textTransform",
  "textIndent",
  "textShadow",
  "letterSpacing",
  "wordSpacing",
  "whiteSpace",
  "wordBreak",
  "wordWrap",
  "textOverflow",
  // Font
  "fontSize",
  "fontFamily",
  "fontWeight",
  "fontStyle",
  "fontVariant",
  "lineHeight",
  // Color / Background
  "backgroundColor",
  "background",
  "backgroundImage",
  "backgroundSize",
  "backgroundPosition",
  "backgroundRepeat",
  // Border
  "border",
  "borderRadius",
  "borderWidth",
  "borderStyle",
  "borderColor",
  "borderTop",
  "borderBottom",
  "borderLeft",
  "borderRight",
  // Spacing (padding only — margin is blocked by filterStyle)
  "padding",
  "paddingTop",
  "paddingBottom",
  "paddingLeft",
  "paddingRight",
  // Other visual
  "boxShadow",
  "cursor",
  "visibility",
  "verticalAlign",
  "listStyle",
  "outline"
]);
var KNOWN_LAYOUT_PROPS = /* @__PURE__ */ new Set([
  // Position / size
  "x",
  "y",
  "w",
  "h",
  "maxW",
  "maxH",
  // Layout
  "anchor",
  "layer",
  "vAlign",
  "overflow",
  // Visual (SlideKit-owned)
  "style",
  "opacity",
  "rotate",
  "flipH",
  "flipV",
  "className",
  "shadow",
  "z",
  // Stack / group
  "gap",
  "align",
  "bounds",
  "scale",
  "clip",
  // Internal
  "_layoutFlags",
  "id",
  // Connector-specific
  "dash",
  "type",
  "arrow",
  "color",
  "thickness",
  "label",
  "labelStyle",
  "fromAnchor",
  "toAnchor",
  "fromId",
  "toId",
  "connectorType",
  // Content-bearing
  "text",
  "src",
  "alt"
]);
function detectMisplacedCssProps(props) {
  const cssProps = {};
  const warnings = [];
  const elementId = props.id || "(anonymous)";
  for (const key of Object.keys(props)) {
    if (KNOWN_LAYOUT_PROPS.has(key)) continue;
    if (!CSS_LIKE_PROPS.has(key)) continue;
    cssProps[key] = props[key];
    warnings.push({
      type: "misplaced_css_prop",
      elementId,
      property: key,
      value: props[key],
      message: `CSS property "${key}" should be inside style: { ${key}: ${JSON.stringify(props[key])} }. It was auto-promoted but please move it to style for clarity.`,
      suggestion: `Move "${key}" into the style object: style: { ${key}: ... }`
    });
  }
  return { cssProps, warnings };
}
var BLOCKED_PROPERTIES = /* @__PURE__ */ new Set([
  // Layout position — library owns absolute positioning
  "position",
  "top",
  "left",
  "right",
  "bottom",
  "inset",
  "insetBlock",
  "insetBlockStart",
  "insetBlockEnd",
  "insetInline",
  "insetInlineStart",
  "insetInlineEnd",
  // Sizing — library owns via w/h props
  "width",
  "height",
  "minWidth",
  "maxWidth",
  "minHeight",
  "maxHeight",
  "blockSize",
  "inlineSize",
  "minBlockSize",
  "maxBlockSize",
  "minInlineSize",
  "maxInlineSize",
  // Display — library needs block
  "display",
  // Overflow — library manages via overflow prop
  "overflow",
  "overflowX",
  "overflowY",
  "overflowBlock",
  "overflowInline",
  // Margin — breaks absolute positioning
  "margin",
  "marginTop",
  "marginRight",
  "marginBottom",
  "marginLeft",
  "marginBlock",
  "marginBlockStart",
  "marginBlockEnd",
  "marginInline",
  "marginInlineStart",
  "marginInlineEnd",
  // Transform — library owns via rotate prop
  "transform",
  "translate",
  "rotate",
  "scale",
  // Containment — can suppress layout/paint
  "contain",
  "contentVisibility"
]);
var BLOCKED_SUGGESTIONS = {
  position: "SlideKit uses absolute positioning; use x/y/anchor props",
  top: "Use the y prop instead",
  left: "Use the x prop instead",
  right: "Use x and w props instead",
  bottom: "Use y and h props instead",
  width: "Use the w prop instead",
  height: "Use the h prop instead",
  display: "The container display mode is managed by SlideKit",
  margin: "Margins break absolute positioning; use x/y for spacing",
  overflow: "Use SlideKit's overflow prop (e.g., overflow: 'clip')",
  transform: "Use the rotate prop for rotation; transform is blocked because the library owns positioning",
  translate: "Use x/y props for positioning",
  rotate: "Use the rotate prop instead (e.g., rotate: 45)",
  scale: "Scaling is not supported; use w/h to control size",
  contain: "contain can suppress layout/paint and conflict with measurement",
  contentVisibility: "contentVisibility can suppress rendering and conflict with measurement"
};
function filterStyle(style = {}, _elementType = "unknown") {
  const warnings = [];
  const filtered = {};
  for (const [rawKey, value] of Object.entries(style)) {
    const camelKey = toCamelCase(rawKey);
    const unprefixedKey = stripVendorPrefix(camelKey);
    const blockedKey = BLOCKED_PROPERTIES.has(camelKey) ? camelKey : BLOCKED_PROPERTIES.has(unprefixedKey) ? unprefixedKey : null;
    if (blockedKey) {
      warnings.push({
        type: "blocked_css_property",
        property: camelKey,
        originalProperty: rawKey,
        value,
        suggestion: BLOCKED_SUGGESTIONS[blockedKey] || "This property conflicts with SlideKit's positioning system"
      });
      continue;
    }
    filtered[camelKey] = value;
  }
  return { filtered, warnings };
}
function _baselineCSS(prefix) {
  const p = prefix.trim();
  if (p.includes(",")) {
    throw new Error(`_baselineCSS prefix must be a single selector, got: ${p}`);
  }
  const P = `${p}${p}${p}`;
  return `
/* ===================================================================
 * SlideKit Baseline CSS Reset
 * Tripled attribute selector -> specificity (0,3,0+), always beats
 * Reveal.js selectors (max ~0,2,4).  User inline styles still win
 * because inline specificity (1,0,0) > any selector.
 * =================================================================== */

/* --- Container boundary: establish a clean context --- */
${P} {
  text-align: left;
  font-size: initial;
  font-style: normal;
  font-weight: 400;
  font-stretch: normal;
  line-height: 1.2;
  letter-spacing: normal;
  text-transform: none;
  text-decoration: none;
  text-shadow: none;
  white-space: normal;
  word-break: normal;
  word-wrap: normal;
  overflow-wrap: normal;
  hyphens: manual;
  box-sizing: border-box;
  color: inherit;
}
${P} *, ${P} *::before, ${P} *::after {
  box-sizing: inherit;
}

/* --- Direct children reset --- */
${P} > * {
  margin: 0;
  padding: 0;
  text-align: inherit;
  line-height: inherit;
}

/* --- Paragraphs ---
 * Counters: .reveal p { margin: 20px 0; line-height: 1.3 } */
${P} p {
  margin: 0;
  padding: 0;
  line-height: inherit;
}

/* --- Headings ---
 * Counters: .reveal h1-h6 { margin: 0 0 20px 0; font-weight: 600;
 *   text-transform: uppercase; text-shadow; color; font-size: 2.5em/etc;
 *   font-family; line-height: 1.2; letter-spacing } */
${P} h1, ${P} h2, ${P} h3,
${P} h4, ${P} h5, ${P} h6 {
  margin: 0;
  padding: 0;
  font: inherit;
  color: inherit;
  text-transform: none;
  text-shadow: none;
  letter-spacing: inherit;
  word-wrap: normal;
}

/* --- Lists ---
 * Counters: .reveal ol/ul/dl { display: inline-block; margin: 0 0 0 1em }
 *           .reveal ul ul   { display: block; margin-left: 40px }
 *           .reveal ul ul ul { list-style-type: circle } */
${P} ul, ${P} ol, ${P} dl {
  margin: 0;
  padding: 0;
  display: block;
  text-align: inherit;
  list-style-position: outside;
}
${P} li {
  margin: 0;
  padding: 0;
}

/* --- Definition lists ---
 * Counters: .reveal dt { font-weight: bold }
 *           .reveal dd { margin-left: 40px } */
${P} dt {
  font-weight: inherit;
}
${P} dd {
  margin: 0;
  padding: 0;
}

/* --- Media: prevent Reveal's responsive constraints ---
 * Counters: .reveal img/video/iframe { max-width: 95%; max-height: 95% }
 *           .reveal img { margin: 20px 0 }
 *           .reveal iframe { z-index: 1 } */
${P} img, ${P} svg, ${P} video,
${P} canvas, ${P} iframe {
  max-width: none;
  max-height: none;
  margin: 0;
}
${P} iframe {
  z-index: auto;
}
${P} img, ${P} svg {
  vertical-align: baseline;
}

/* --- Blockquote ---
 * Counters: .reveal blockquote { width: 70%; margin: 20px auto; padding: 5px;
 *   font-style: italic; background: rgba(...); box-shadow; position: relative }
 *           .reveal blockquote p:first/last-child { display: inline-block } */
${P} blockquote {
  margin: 0;
  padding: 0;
  width: auto;
  position: static;
  font-style: inherit;
  background: none;
  box-shadow: none;
}
${P} q {
  font-style: inherit;
}

/* --- Pre/Code ---
 * Counters: .reveal pre { width: 90%; margin: 20px auto; font-size: 0.55em;
 *   position: relative; box-shadow; line-height: 1.2em }
 *           .reveal code { font-family: monospace; text-transform: none }
 *           .reveal pre code { padding: 5px; max-height: 400px } */
${P} pre {
  margin: 0;
  padding: 0;
  width: auto;
  position: static;
  font-size: 1em;
  line-height: 1.2;
  white-space: pre;
  word-wrap: normal;
  box-shadow: none;
  text-align: inherit;
}
${P} code {
  margin: 0;
  padding: 0;
  font-size: 1em;
  line-height: inherit;
  text-transform: none;
  white-space: normal;
}
${P} pre code {
  display: block;
  padding: 0;
  overflow: visible;
  max-height: none;
  word-wrap: normal;
  white-space: pre;
}

/* --- Tables ---
 * Counters: .reveal table { margin: auto }
 *           .reveal table th/td { padding: 0.2em 0.5em; border-bottom: 1px solid }
 *           .reveal table th { font-weight: bold } */
${P} table {
  margin: 0;
  border-collapse: collapse;
  border-spacing: 0;
}
${P} th, ${P} td {
  padding: 0;
  border: none;
  text-align: inherit;
  font-weight: inherit;
}

/* --- Small ---
 * Counters: .reveal small { display: inline-block; font-size: 0.6em;
 *   line-height: 1.2em; vertical-align: top } */
${P} small {
  display: inline;
  font-size: inherit;
  line-height: inherit;
  vertical-align: baseline;
}

/* --- Links ---
 * Counters: .reveal a { color: var(--r-link-color); text-decoration: none;
 *   transition: color .15s; position: relative }
 *           .reveal a:hover { color: var(--r-link-color-hover) } */
${P} a, ${P} a:hover {
  color: inherit;
  text-decoration: inherit;
  background: none;
  text-shadow: none;
}
`;
}
var SHADOWS = {
  sm: "0 1px 3px rgba(0,0,0,0.2)",
  md: "0 4px 12px rgba(0,0,0,0.3)",
  lg: "0 8px 32px rgba(0,0,0,0.4)",
  xl: "0 16px 48px rgba(0,0,0,0.5)",
  glow: "0 0 40px rgba(124,92,191,0.3)"
};
function resolveShadow(value) {
  if (!value) return "";
  if (value in SHADOWS) return SHADOWS[value];
  return value;
}
function parseSemver(v) {
  const m = /^(\d+)\.(\d+)\.(\d+)/.exec(v);
  if (!m) return null;
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]) };
}
function checkVersionCompatibility(minVersion, currentVersion) {
  const min = parseSemver(minVersion);
  const cur = parseSemver(currentVersion);
  if (!min) {
    return { ok: false, error: `Invalid minVersion format: "${minVersion}" (expected semver like "1.2.3")` };
  }
  if (!cur) {
    return { ok: false, error: `Invalid current version format: "${currentVersion}" (expected semver like "1.2.3")` };
  }
  if (min.major <= 1 && cur.major <= 1) {
    if (min.major === cur.major) {
      if (cur.minor < min.minor) {
        return {
          ok: true,
          warning: `SlideKit ${currentVersion} may be missing features from minVersion ${minVersion}. See docs/MIGRATION.md for details on what changed between versions.`
        };
      }
      return { ok: true };
    }
    if (cur.major > min.major) {
      return { ok: true };
    }
    return {
      ok: true,
      warning: `SlideKit ${currentVersion} may be missing features from minVersion ${minVersion}. See docs/MIGRATION.md for details on what changed between versions.`
    };
  }
  if (cur.major !== min.major) {
    return {
      ok: false,
      error: `SlideKit ${currentVersion} is not compatible with minVersion ${minVersion} (major version mismatch). See docs/MIGRATION.md for upgrade guidance \u2014 an AI agent can use this guide to automatically update your presentation code.`
    };
  }
  if (cur.minor < min.minor) {
    return {
      ok: true,
      warning: `SlideKit ${currentVersion} may be missing features from minVersion ${minVersion}. See docs/MIGRATION.md for details on what changed between versions.`
    };
  }
  return { ok: true };
}
var DEFAULT_CONFIG = {
  slide: { w: 1920, h: 1080 },
  safeZone: { left: 120, right: 120, top: 90, bottom: 90 },
  strict: false,
  minFontSize: 24,
  fonts: [],
  spacing: { ...DEFAULT_SPACING }
};
async function init(config = {}) {
  if (config.minVersion) {
    const compat = checkVersionCompatibility(config.minVersion, VERSION);
    if (compat.error) {
      throw new Error(compat.error);
    }
    if (compat.warning) {
      console.warn(compat.warning);
    }
  }
  const resolved = {
    slide: { ...DEFAULT_CONFIG.slide, ...config.slide || {} },
    safeZone: { ...DEFAULT_CONFIG.safeZone, ...config.safeZone || {} },
    strict: config.strict !== void 0 ? config.strict : DEFAULT_CONFIG.strict,
    minFontSize: config.minFontSize !== void 0 ? config.minFontSize : DEFAULT_CONFIG.minFontSize,
    fonts: config.fonts || DEFAULT_CONFIG.fonts,
    spacing: { ...DEFAULT_SPACING, ...config.spacing || {} },
    ...config.debug ? { debug: { ...config.debug } } : {}
  };
  state.config = resolved;
  const sz = resolved.safeZone;
  const sl = resolved.slide;
  const safeW = sl.w - sz.left - sz.right;
  const safeH = sl.h - sz.top - sz.bottom;
  if (safeW <= 0 || safeH <= 0) {
    throw new Error(
      `Invalid safeZone configuration: computed safe rect is ${safeW}x${safeH}. Check slide dimensions (${sl.w}x${sl.h}) and safeZone margins.`
    );
  }
  state.safeRectCache = {
    x: sz.left,
    y: sz.top,
    w: safeW,
    h: safeH
  };
  state.loadedFonts = /* @__PURE__ */ new Set();
  state.fontWarnings = [];
  state.measureCache = /* @__PURE__ */ new Map();
  if (resolved.fonts.length > 0) {
    await _loadFonts(resolved.fonts);
  }
  return resolved;
}
async function _loadFonts(fonts) {
  const FONT_TIMEOUT_MS = 5e3;
  const testString = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (const fontDef of fonts) {
    if (fontDef.source === "google") {
      _injectGoogleFontLink(fontDef);
    }
  }
  const loadPromises = [];
  for (const fontDef of fonts) {
    const family = fontDef.family;
    const weights = fontDef.weights || [400];
    for (const weight of weights) {
      const fontString = `${weight} 16px "${family}"`;
      const key = `${family}:${weight}`;
      const loadPromise = _loadSingleFont(fontString, key, testString, FONT_TIMEOUT_MS);
      loadPromises.push(loadPromise);
    }
  }
  await Promise.all(loadPromises);
  try {
    await document.fonts.ready;
  } catch (e) {
  }
}
async function _loadSingleFont(fontString, key, testString, timeoutMs) {
  try {
    const loadResult = await Promise.race([
      document.fonts.load(fontString, testString),
      new Promise(
        (_, reject) => setTimeout(() => reject(new Error("timeout")), timeoutMs)
      )
    ]);
    if (Array.isArray(loadResult) && loadResult.length > 0) {
      state.loadedFonts.add(key);
    } else {
      if (document.fonts.check(fontString, testString)) {
        state.loadedFonts.add(key);
      } else {
        state.fontWarnings.push({
          type: "font_load_failed",
          font: key,
          message: `Font "${key}" could not be loaded. Falling back to system font.`
        });
      }
    }
  } catch (err) {
    state.fontWarnings.push({
      type: "font_load_timeout",
      font: key,
      message: `Font "${key}" failed to load within timeout. Falling back to system font.`
    });
  }
}
function _injectGoogleFontLink(fontDef) {
  const family = fontDef.family.replace(/ /g, "+");
  const weights = (fontDef.weights || [400]).join(";");
  const href = `https://fonts.googleapis.com/css2?family=${family}:wght@${weights}&display=swap`;
  const existing = document.querySelector(`link[href="${href}"]`);
  if (existing) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
  state.injectedFontLinks.add(link);
}
function safeRect() {
  if (!state.safeRectCache) {
    throw new Error("SlideKit.init() must be called before safeRect()");
  }
  return { ...state.safeRectCache };
}
function splitRect(rect, { ratio = 0.5, gap = 0 } = {}) {
  const gapPx = resolveSpacing(gap);
  const leftW = Math.round((rect.w - gapPx) * ratio);
  const rightW = rect.w - gapPx - leftW;
  return {
    left: { x: rect.x, y: rect.y, w: leftW, h: rect.h },
    right: { x: rect.x + leftW + gapPx, y: rect.y, w: rightW, h: rect.h }
  };
}
function getConfig() {
  if (!state.config) return null;
  return JSON.parse(JSON.stringify(state.config));
}
function applyStyleToDOM(domEl, styleObj) {
  for (const [key, value] of Object.entries(styleObj)) {
    if (key.startsWith("--")) {
      domEl.style.setProperty(key, value);
    } else {
      domEl.style[key] = value;
    }
  }
}
function _ensureMeasureContainer() {
  if (state.measureContainer && state.measureContainer.parentNode) return;
  if (typeof document === "undefined" || !document.body) {
    throw new Error(
      "SlideKit.measure requires a DOM with document.body available."
    );
  }
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.top = "-9999px";
  container.style.visibility = "hidden";
  container.style.overflow = "hidden";
  container.style.pointerEvents = "none";
  container.setAttribute("data-sk-role", "measure-container");
  const baselineStyle = document.createElement("style");
  baselineStyle.textContent = _baselineCSS("[data-sk-measure]");
  container.appendChild(baselineStyle);
  document.body.appendChild(container);
  state.measureContainer = container;
}
function _elMeasureCacheKey(html, props) {
  const styleKey = props.style ? JSON.stringify(props.style, Object.keys(props.style).sort()) : null;
  return JSON.stringify(["el", html, props.w ?? null, styleKey, props.className || "", props.shrinkWrap || false]);
}
async function measure(html, props = {}) {
  const cacheKey = _elMeasureCacheKey(html, props);
  if (state.measureCache.has(cacheKey)) {
    return state.measureCache.get(cacheKey);
  }
  _ensureMeasureContainer();
  const div = document.createElement("div");
  div.style.boxSizing = "border-box";
  if (props.w != null) {
    div.style.width = `${props.w}px`;
  } else if (props.shrinkWrap) {
    div.style.display = "inline-block";
  }
  if (props.className) div.className = props.className;
  if (props.style) {
    const { filtered } = filterStyle(props.style, "el");
    applyStyleToDOM(div, filtered);
  }
  div.setAttribute("data-sk-measure", "");
  div.innerHTML = html;
  state.measureContainer.appendChild(div);
  const FONT_TIMEOUT_MS = 5e3;
  if (document.fonts?.ready) {
    await Promise.race([
      document.fonts.ready,
      new Promise((resolve) => setTimeout(resolve, FONT_TIMEOUT_MS))
    ]);
  }
  const imgs = div.querySelectorAll("img");
  if (imgs.length > 0) {
    const IMAGE_TIMEOUT_MS = 3e3;
    await Promise.all([...imgs].map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise((resolve) => {
        const timer = setTimeout(resolve, IMAGE_TIMEOUT_MS);
        const done = () => {
          clearTimeout(timer);
          resolve();
        };
        img.addEventListener("load", done, { once: true });
        img.addEventListener("error", done, { once: true });
      });
    }));
  }
  const result = { w: div.offsetWidth, h: div.scrollHeight };
  state.measureContainer.removeChild(div);
  state.measureCache.set(cacheKey, result);
  return result;
}
function normalizeGapArg(arg) {
  if (typeof arg === "string" || typeof arg === "number") {
    return { gap: arg };
  }
  return arg;
}
function below(refId, opts = {}) {
  const o = normalizeGapArg(opts);
  return { _rel: "below", ref: refId, gap: resolveSpacing(o.gap ?? 0) };
}
function above(refId, opts = {}) {
  const o = normalizeGapArg(opts);
  return { _rel: "above", ref: refId, gap: resolveSpacing(o.gap ?? 0) };
}
function rightOf(refId, opts = {}) {
  const o = normalizeGapArg(opts);
  return { _rel: "rightOf", ref: refId, gap: resolveSpacing(o.gap ?? 0) };
}
function leftOf(refId, opts = {}) {
  const o = normalizeGapArg(opts);
  return { _rel: "leftOf", ref: refId, gap: resolveSpacing(o.gap ?? 0) };
}
function centerVWith(refId) {
  return { _rel: "centerV", ref: refId };
}
function centerHWith(refId) {
  return { _rel: "centerH", ref: refId };
}
function alignTopWith(refId) {
  return { _rel: "alignTop", ref: refId };
}
function centerIn(rectParam) {
  const marker = { _rel: "centerIn", rect: rectParam };
  return { x: marker, y: marker };
}
function between(refA, refB, { axis, bias = 0.5 }) {
  const numBias = typeof bias === "number" && Number.isFinite(bias) ? bias : 0.5;
  const clampedBias = Math.max(0, Math.min(1, numBias));
  let ref;
  let ref2;
  if (typeof refA === "number" && typeof refB === "number") {
    throw new Error("between() requires at least one element ID reference");
  } else if (typeof refA === "number") {
    ref = refB;
    ref2 = refA;
    return { _rel: "between", ref, ref2, bias: 1 - clampedBias, axis };
  } else {
    ref = refA;
    ref2 = refB;
  }
  return { _rel: "between", ref, ref2, bias: clampedBias, axis };
}
function mustGet(map, key, msg) {
  const value = map.get(key);
  if (value === void 0) {
    throw new Error(msg ?? `Map missing expected key: ${String(key)}`);
  }
  return value;
}
function nextTransformId() {
  state.transformIdCounter += 1;
  return `transform-${state.transformIdCounter}`;
}
function alignTop(ids, options = {}) {
  return { _transform: "alignTop", _transformId: nextTransformId(), ids, options };
}
function distributeH(ids, options = {}) {
  return { _transform: "distributeH", _transformId: nextTransformId(), ids, options: { mode: "equal-gap", ...options } };
}
function matchWidth(ids) {
  return { _transform: "matchWidth", _transformId: nextTransformId(), ids, options: {} };
}
function matchHeight(ids) {
  return { _transform: "matchHeight", _transformId: nextTransformId(), ids, options: {} };
}
function fitToRect(ids, rectParam) {
  return { _transform: "fitToRect", _transformId: nextTransformId(), ids, options: { rect: rectParam } };
}
function applyTransform(transform, resolvedBounds, _flatMap) {
  const transformWarnings = [];
  const type = transform._transform;
  const ids = transform.ids || [];
  const opts = transform.options || {};
  const validIds = [];
  for (const id of ids) {
    if (!resolvedBounds.has(id)) {
      transformWarnings.push({
        type: "transform_unknown_element",
        transform: type,
        transformId: transform._transformId,
        elementId: id,
        message: `Transform "${type}": element "${id}" not found in resolved layout \u2014 skipping`
      });
    } else {
      validIds.push(id);
    }
  }
  if (validIds.length === 0) return transformWarnings;
  switch (type) {
    case "alignLeft": {
      const target = opts.to !== void 0 ? opts.to : Math.min(...validIds.map((id) => mustGet(resolvedBounds, id, `resolvedBounds missing element: ${id}`).x));
      for (const id of validIds) {
        mustGet(resolvedBounds, id, `resolvedBounds missing element: ${id}`).x = target;
      }
      break;
    }
    case "alignRight": {
      const target = opts.to !== void 0 ? opts.to : Math.max(...validIds.map((id) => {
        const b = mustGet(resolvedBounds, id, `resolvedBounds missing element: ${id}`);
        return b.x + b.w;
      }));
      for (const id of validIds) {
        const b = mustGet(resolvedBounds, id, `resolvedBounds missing element: ${id}`);
        b.x = target - b.w;
      }
      break;
    }
    case "alignTop": {
      const target = opts.to !== void 0 ? opts.to : Math.min(...validIds.map((id) => mustGet(resolvedBounds, id, `resolvedBounds missing element: ${id}`).y));
      for (const id of validIds) {
        mustGet(resolvedBounds, id, `resolvedBounds missing element: ${id}`).y = target;
      }
      break;
    }
    case "alignBottom": {
      const target = opts.to !== void 0 ? opts.to : Math.max(...validIds.map((id) => {
        const b = mustGet(resolvedBounds, id, `resolvedBounds missing element: ${id}`);
        return b.y + b.h;
      }));
      for (const id of validIds) {
        const b = mustGet(resolvedBounds, id, `resolvedBounds missing element: ${id}`);
        b.y = target - b.h;
      }
      break;
    }
    case "alignCenterH": {
      const target = opts.to !== void 0 ? opts.to : validIds.reduce((sum, id) => {
        const b = mustGet(resolvedBounds, id, `resolvedBounds missing element: ${id}`);
        return sum + (b.x + b.w / 2);
      }, 0) / validIds.length;
      for (const id of validIds) {
        const b = mustGet(resolvedBounds, id, `resolvedBounds missing element: ${id}`);
        b.x = target - b.w / 2;
      }
      break;
    }
    case "alignCenterV": {
      const target = opts.to !== void 0 ? opts.to : validIds.reduce((sum, id) => {
        const b = mustGet(resolvedBounds, id, `resolvedBounds missing element: ${id}`);
        return sum + (b.y + b.h / 2);
      }, 0) / validIds.length;
      for (const id of validIds) {
        const b = mustGet(resolvedBounds, id, `resolvedBounds missing element: ${id}`);
        b.y = target - b.h / 2;
      }
      break;
    }
    case "distributeH": {
      if (validIds.length < 2) break;
      const sorted = [...validIds].sort(
        (a, b) => mustGet(resolvedBounds, a, `resolvedBounds missing element: ${a}`).x - mustGet(resolvedBounds, b, `resolvedBounds missing element: ${b}`).x
      );
      const mode = opts.mode || "equal-gap";
      const firstBounds = mustGet(resolvedBounds, sorted[0], `resolvedBounds missing element: ${sorted[0]}`);
      const lastBounds = mustGet(resolvedBounds, sorted[sorted.length - 1], `resolvedBounds missing element: ${sorted[sorted.length - 1]}`);
      if (mode === "equal-gap") {
        const startX = opts.startX !== void 0 ? opts.startX : firstBounds.x;
        const endX = opts.endX !== void 0 ? opts.endX : lastBounds.x + lastBounds.w;
        const totalWidth = sorted.reduce((sum, id) => sum + mustGet(resolvedBounds, id, `resolvedBounds missing element: ${id}`).w, 0);
        const totalGap = endX - startX - totalWidth;
        const gapBetween = totalGap / (sorted.length - 1);
        let curX = startX;
        for (const id of sorted) {
          const b = mustGet(resolvedBounds, id, `resolvedBounds missing element: ${id}`);
          b.x = curX;
          curX += b.w + gapBetween;
        }
      } else if (mode === "equal-center") {
        const startX = opts.startX !== void 0 ? opts.startX : firstBounds.x + firstBounds.w / 2;
        const endX = opts.endX !== void 0 ? opts.endX : lastBounds.x + lastBounds.w / 2;
        const spacing = (endX - startX) / (sorted.length - 1);
        for (let i = 0; i < sorted.length; i++) {
          const b = mustGet(resolvedBounds, sorted[i], `resolvedBounds missing element: ${sorted[i]}`);
          b.x = startX + i * spacing - b.w / 2;
        }
      }
      break;
    }
    case "distributeV": {
      if (validIds.length < 2) break;
      const sorted = [...validIds].sort(
        (a, b) => mustGet(resolvedBounds, a, `resolvedBounds missing element: ${a}`).y - mustGet(resolvedBounds, b, `resolvedBounds missing element: ${b}`).y
      );
      const mode = opts.mode || "equal-gap";
      const firstBounds = mustGet(resolvedBounds, sorted[0], `resolvedBounds missing element: ${sorted[0]}`);
      const lastBounds = mustGet(resolvedBounds, sorted[sorted.length - 1], `resolvedBounds missing element: ${sorted[sorted.length - 1]}`);
      if (mode === "equal-gap") {
        const startY = opts.startY !== void 0 ? opts.startY : firstBounds.y;
        const endY = opts.endY !== void 0 ? opts.endY : lastBounds.y + lastBounds.h;
        const totalHeight = sorted.reduce((sum, id) => sum + mustGet(resolvedBounds, id, `resolvedBounds missing element: ${id}`).h, 0);
        const totalGap = endY - startY - totalHeight;
        const gapBetween = totalGap / (sorted.length - 1);
        let curY = startY;
        for (const id of sorted) {
          const b = mustGet(resolvedBounds, id, `resolvedBounds missing element: ${id}`);
          b.y = curY;
          curY += b.h + gapBetween;
        }
      } else if (mode === "equal-center") {
        const startY = opts.startY !== void 0 ? opts.startY : firstBounds.y + firstBounds.h / 2;
        const endY = opts.endY !== void 0 ? opts.endY : lastBounds.y + lastBounds.h / 2;
        const spacing = (endY - startY) / (sorted.length - 1);
        for (let i = 0; i < sorted.length; i++) {
          const b = mustGet(resolvedBounds, sorted[i], `resolvedBounds missing element: ${sorted[i]}`);
          b.y = startY + i * spacing - b.h / 2;
        }
      }
      break;
    }
    case "matchWidth": {
      const maxW = Math.max(...validIds.map((id) => mustGet(resolvedBounds, id, `resolvedBounds missing element: ${id}`).w));
      for (const id of validIds) {
        mustGet(resolvedBounds, id, `resolvedBounds missing element: ${id}`).w = maxW;
      }
      break;
    }
    case "matchHeight": {
      const maxH = Math.max(...validIds.map((id) => mustGet(resolvedBounds, id, `resolvedBounds missing element: ${id}`).h));
      for (const id of validIds) {
        mustGet(resolvedBounds, id, `resolvedBounds missing element: ${id}`).h = maxH;
      }
      break;
    }
    case "matchSize": {
      const maxW = Math.max(...validIds.map((id) => mustGet(resolvedBounds, id, `resolvedBounds missing element: ${id}`).w));
      const maxH = Math.max(...validIds.map((id) => mustGet(resolvedBounds, id, `resolvedBounds missing element: ${id}`).h));
      for (const id of validIds) {
        const b = mustGet(resolvedBounds, id, `resolvedBounds missing element: ${id}`);
        b.w = maxW;
        b.h = maxH;
      }
      break;
    }
    case "fitToRect": {
      const targetRect = opts.rect;
      if (!targetRect || targetRect.w <= 0 || targetRect.h <= 0) {
        transformWarnings.push({
          type: "transform_invalid_rect",
          transform: type,
          transformId: transform._transformId,
          message: `fitToRect: invalid target rect`
        });
        break;
      }
      let minX = Infinity, minY = Infinity;
      let maxX = -Infinity, maxY = -Infinity;
      for (const id of validIds) {
        const b = mustGet(resolvedBounds, id, `resolvedBounds missing element: ${id}`);
        minX = Math.min(minX, b.x);
        minY = Math.min(minY, b.y);
        maxX = Math.max(maxX, b.x + b.w);
        maxY = Math.max(maxY, b.y + b.h);
      }
      const bbW = maxX - minX;
      const bbH = maxY - minY;
      if (bbW <= 0 || bbH <= 0) break;
      const scaleX = targetRect.w / bbW;
      const scaleY = targetRect.h / bbH;
      const scale = Math.min(scaleX, scaleY);
      const scaledW = bbW * scale;
      const scaledH = bbH * scale;
      const offsetX = targetRect.x + (targetRect.w - scaledW) / 2;
      const offsetY = targetRect.y + (targetRect.h - scaledH) / 2;
      for (const id of validIds) {
        const b = mustGet(resolvedBounds, id, `resolvedBounds missing element: ${id}`);
        b.x = offsetX + (b.x - minX) * scale;
        b.y = offsetY + (b.y - minY) * scale;
        b.w = b.w * scale;
        b.h = b.h * scale;
      }
      break;
    }
    default:
      transformWarnings.push({
        type: "unknown_transform",
        transform: type,
        transformId: transform._transformId,
        message: `Unknown transform type: "${type}"`
      });
      break;
  }
  return transformWarnings;
}
var THRESHOLDS = {
  minFontSize: 18,
  warnFontSize: 24,
  maxFontSize: 120,
  maxLineLength: 80,
  minLineHeightRatio: 1.15,
  minGap: 8,
  alignmentTolerance: 4,
  edgeCrowding: 8,
  contentAreaMin: 0.4,
  maxRootElements: 15,
  imageUpscaleMax: 1.1,
  aspectRatioTolerance: 0.01,
  titlePositionDrift: 20,
  maxFontFamilies: 3,
  marginRatioMax: 0.25
};
var CANVAS = { x: 0, y: 0, w: 1920, h: 1080 };
var SAFE_ZONE = { x: 120, y: 90, w: 1680, h: 900 };
function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
function rectIntersection(a, b) {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.w, b.x + b.w);
  const y2 = Math.min(a.y + a.h, b.y + b.h);
  if (x2 <= x || y2 <= y) return null;
  return { x, y, w: x2 - x, h: y2 - y };
}
function isAncestor(elements, elementId, ancestorId) {
  const visited = /* @__PURE__ */ new Set();
  let current = elements[elementId];
  while (current && current.parentId) {
    if (visited.has(current.id)) return false;
    visited.add(current.id);
    if (current.parentId === ancestorId) return true;
    current = elements[current.parentId];
  }
  return false;
}
function localBoundsOf(el2) {
  const r = el2.localResolved;
  return r ? { x: r.x, y: r.y, w: r.w, h: r.h } : null;
}
function absoluteBoundsOf(el2, elements) {
  const r = el2.resolved;
  if (!r) return null;
  let absX = r.x;
  let absY = r.y;
  const visited = /* @__PURE__ */ new Set();
  let currentId = el2.parentId;
  while (currentId) {
    if (visited.has(currentId)) return null;
    visited.add(currentId);
    const parent = elements[currentId];
    if (!parent?.resolved) return null;
    const skipOffsetTypes = ["hstack", "vstack"];
    if (!skipOffsetTypes.includes(parent.type)) {
      absX += parent.resolved.x;
      absY += parent.resolved.y;
    }
    currentId = parent.parentId;
  }
  return { x: absX, y: absY, w: r.w, h: r.h };
}
function normLayer(el2) {
  const layer = el2?.authored?.props?.layer;
  return layer === "bg" || layer === "overlay" || layer === "content" ? layer : "content";
}
function ruleDuplicateId(slideData) {
  const findings = [];
  const errors = slideData.layout.errors;
  if (!Array.isArray(errors)) return findings;
  for (const err of errors) {
    if (err.type === "duplicate-id") {
      const id = err.id;
      const count = err.count;
      findings.push({
        rule: "duplicate-id",
        severity: "error",
        elementId: id,
        message: `Duplicate id '${id}': ${count} elements share this id. Each element must have a unique id.`,
        detail: { duplicateId: id, count },
        suggestion: `Rename elements so each has a unique id. '${id}' is used by ${count} elements.`
      });
    }
  }
  return findings;
}
function isConnectorEndpointPair(a, b) {
  if (a.type === "connector") {
    const cr = a._connectorResolved;
    const props = a.authored?.props;
    const fromId = cr?.fromId ?? props?.fromId;
    const toId = cr?.toId ?? props?.toId;
    if (b.id === fromId || b.id === toId) return true;
  }
  if (b.type === "connector") {
    const cr = b._connectorResolved;
    const props = b.authored?.props;
    const fromId = cr?.fromId ?? props?.fromId;
    const toId = cr?.toId ?? props?.toId;
    if (a.id === fromId || a.id === toId) return true;
  }
  return false;
}
function ruleChildOverflow(elements) {
  const findings = [];
  for (const el2 of Object.values(elements)) {
    if (!el2.parentId || el2._internal) continue;
    const parent = elements[el2.parentId];
    if (!parent) continue;
    const parentBoundsMode = parent.authored?.props?.bounds;
    if (parentBoundsMode === "hug") continue;
    const cb = localBoundsOf(el2);
    const pr = parent.resolved;
    if (!cb || !pr) continue;
    const pb = { x: 0, y: 0, w: pr.w, h: pr.h };
    const edges = [
      { edge: "left", overshoot: pb.x - cb.x },
      { edge: "top", overshoot: pb.y - cb.y },
      { edge: "right", overshoot: cb.x + cb.w - (pb.x + pb.w) },
      { edge: "bottom", overshoot: cb.y + cb.h - (pb.y + pb.h) }
    ];
    for (const { edge, overshoot } of edges) {
      if (overshoot > 0.5) {
        const dim = edge === "left" || edge === "right" ? "width" : "height";
        const parentDim = dim === "width" ? pb.w : pb.h;
        findings.push({
          rule: "child-overflow",
          severity: "error",
          elementId: el2.id,
          message: `Child "${el2.id}" overflows parent "${el2.parentId}" on ${edge} by ${overshoot}px`,
          detail: { edge, overshoot, parentId: el2.parentId },
          bounds: cb,
          parentBounds: pb,
          suggestion: `Reduce child ${dim} or increase parent ${dim} to ${parentDim + overshoot}`
        });
      }
    }
  }
  return findings;
}
function ruleNonAncestorOverlap(elements) {
  const findings = [];
  const els = Object.values(elements).filter((e) => !e._internal);
  const absCache = /* @__PURE__ */ new Map();
  function cachedAbsBounds(e) {
    if (!absCache.has(e.id)) absCache.set(e.id, absoluteBoundsOf(e, elements));
    return absCache.get(e.id);
  }
  const canvasArea = CANVAS.w * CANVAS.h;
  const withSize = els.filter((e) => {
    const b = cachedAbsBounds(e);
    return b && b.w > 0 && b.h > 0;
  });
  const seen = /* @__PURE__ */ new Set();
  for (let i = 0; i < withSize.length; i++) {
    for (let j = i + 1; j < withSize.length; j++) {
      const a = withSize[i];
      const b = withSize[j];
      if (a.authored?.props?.allowOverlap || b.authored?.props?.allowOverlap) continue;
      const layerA = normLayer(a);
      const layerB = normLayer(b);
      if (layerA !== layerB) continue;
      if (isAncestor(elements, a.id, b.id) || isAncestor(elements, b.id, a.id)) continue;
      if (isConnectorEndpointPair(a, b)) continue;
      const ba = cachedAbsBounds(a);
      const bb = cachedAbsBounds(b);
      if (!rectsOverlap(ba, bb)) continue;
      const areaA = ba.w * ba.h;
      const areaB = bb.w * bb.h;
      if (areaA >= canvasArea * 0.95 && areaB >= canvasArea * 0.95) continue;
      const aContainsB = ba.x <= bb.x && ba.y <= bb.y && ba.x + ba.w >= bb.x + bb.w && ba.y + ba.h >= bb.y + bb.h;
      const bContainsA = bb.x <= ba.x && bb.y <= ba.y && bb.x + bb.w >= ba.x + ba.w && bb.y + bb.h >= ba.y + ba.h;
      if (aContainsB || bContainsA) {
        const container = aContainsB ? a : b;
        const cProps = container.authored?.props;
        const cStyle = cProps?.style || {};
        const hasPanelStyle = cStyle.backdropFilter || cStyle.border || cStyle.boxShadow || typeof cStyle.backgroundColor === "string" && cStyle.backgroundColor !== "transparent";
        if (hasPanelStyle) continue;
      }
      const key = [a.id, b.id].sort().join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      const overlap = rectIntersection(ba, bb);
      const overlapArea = overlap ? overlap.w * overlap.h : 0;
      findings.push({
        rule: "non-ancestor-overlap",
        severity: "error",
        elementId: a.id,
        message: `"${a.id}" overlaps with "${b.id}" by ${overlapArea}px\xB2`,
        detail: { elementA: a.id, elementB: b.id, overlapArea, overlapRect: overlap },
        bounds: ba,
        parentBounds: null,
        suggestion: `Move ${a.id} to avoid ${overlapArea}px overlap with ${b.id}`
      });
    }
  }
  return findings;
}
function ruleCanvasOverflow(elements) {
  const findings = [];
  for (const el2 of Object.values(elements)) {
    if (el2._internal) continue;
    if (normLayer(el2) === "bg") continue;
    const b = absoluteBoundsOf(el2, elements);
    if (!b) continue;
    const edges = [
      { edge: "left", overshoot: CANVAS.x - b.x },
      { edge: "top", overshoot: CANVAS.y - b.y },
      { edge: "right", overshoot: b.x + b.w - (CANVAS.x + CANVAS.w) },
      { edge: "bottom", overshoot: b.y + b.h - (CANVAS.y + CANVAS.h) }
    ];
    for (const { edge, overshoot } of edges) {
      if (overshoot > 0.5) {
        findings.push({
          rule: "canvas-overflow",
          severity: "error",
          elementId: el2.id,
          message: `"${el2.id}" extends beyond canvas on ${edge} by ${overshoot}px`,
          detail: { edge, overshoot },
          bounds: b,
          parentBounds: null,
          suggestion: `Move element inward by ${overshoot}px`
        });
      }
    }
  }
  return findings;
}
function ruleSafeZoneViolation(elements) {
  const findings = [];
  for (const el2 of Object.values(elements)) {
    if (el2._internal) continue;
    if (el2.parentId != null) continue;
    if (normLayer(el2) === "bg" || normLayer(el2) === "overlay") continue;
    const b = absoluteBoundsOf(el2, elements);
    if (!b) continue;
    const edges = [
      { edge: "left", overshoot: SAFE_ZONE.x - b.x },
      { edge: "top", overshoot: SAFE_ZONE.y - b.y },
      { edge: "right", overshoot: b.x + b.w - (SAFE_ZONE.x + SAFE_ZONE.w) },
      { edge: "bottom", overshoot: b.y + b.h - (SAFE_ZONE.y + SAFE_ZONE.h) }
    ];
    for (const { edge, overshoot } of edges) {
      if (overshoot > 0.5) {
        findings.push({
          rule: "safe-zone-violation",
          severity: "warning",
          elementId: el2.id,
          message: `"${el2.id}" extends outside safe zone on ${edge} by ${overshoot}px`,
          detail: { edge, overshoot, safeRect: { ...SAFE_ZONE } },
          bounds: b,
          parentBounds: null,
          suggestion: `Move element ${overshoot}px inward from ${edge}`
        });
      }
    }
  }
  return findings;
}
function ruleZeroSize(elements) {
  const findings = [];
  for (const el2 of Object.values(elements)) {
    if (el2._internal) continue;
    if (el2.type === "connector") continue;
    const b = localBoundsOf(el2);
    if (!b) continue;
    if (b.w <= 0 || b.h <= 0) {
      findings.push({
        rule: "zero-size",
        severity: "error",
        elementId: el2.id,
        message: `"${el2.id}" has zero or negative size (${b.w}\xD7${b.h})`,
        detail: { w: b.w, h: b.h },
        bounds: b,
        parentBounds: null,
        suggestion: "Set explicit width/height for element"
      });
    }
  }
  return findings;
}
function siblingGroups(elements) {
  const groups = /* @__PURE__ */ new Map();
  for (const el2 of Object.values(elements)) {
    if (el2._internal) continue;
    if (normLayer(el2) === "bg") continue;
    const b = localBoundsOf(el2);
    if (!b || b.w <= 0 || b.h <= 0) continue;
    const key = el2.parentId ?? "__root__";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(el2);
  }
  return groups;
}
function rectGap(a, b) {
  const overlapX = a.x < b.x + b.w && a.x + a.w > b.x;
  const overlapY = a.y < b.y + b.h && a.y + a.h > b.y;
  const hGap = Math.max(0, Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w)));
  const vGap = Math.max(0, Math.max(b.y - (a.y + a.h), a.y - (b.y + b.h)));
  if (hGap > 0 && overlapY) return { gap: hGap, axis: "horizontal" };
  if (vGap > 0 && overlapX) return { gap: vGap, axis: "vertical" };
  return { gap: 0, axis: "none" };
}
function ruleGapTooSmall(elements) {
  const findings = [];
  for (const siblings of siblingGroups(elements).values()) {
    for (let i = 0; i < siblings.length; i++) {
      for (let j = i + 1; j < siblings.length; j++) {
        const a = siblings[i], b = siblings[j];
        const ba = localBoundsOf(a), bb = localBoundsOf(b);
        const { gap, axis } = rectGap(ba, bb);
        if (gap > 0 && gap < THRESHOLDS.minGap) {
          findings.push({
            rule: "gap-too-small",
            severity: "warning",
            elementId: a.id,
            message: `Gap between "${a.id}" and "${b.id}" is only ${gap}px`,
            detail: { elementA: a.id, elementB: b.id, gap, axis },
            suggestion: `Increase gap between elements to at least ${THRESHOLDS.minGap}px`
          });
        }
      }
    }
  }
  return findings;
}
function ruleNearMisalignment(elements) {
  const findings = [];
  const EXACT = 0.5;
  for (const siblings of siblingGroups(elements).values()) {
    for (let i = 0; i < siblings.length; i++) {
      for (let j = i + 1; j < siblings.length; j++) {
        const a = siblings[i], b = siblings[j];
        const ba = localBoundsOf(a), bb = localBoundsOf(b);
        const overlapX = ba.x < bb.x + bb.w && ba.x + ba.w > bb.x;
        const overlapY = ba.y < bb.y + bb.h && ba.y + ba.h > bb.y;
        const edges = [];
        if (overlapY) {
          edges.push(
            { type: "left", vA: ba.x, vB: bb.x },
            { type: "right", vA: ba.x + ba.w, vB: bb.x + bb.w },
            { type: "center-x", vA: ba.x + ba.w / 2, vB: bb.x + bb.w / 2 }
          );
        }
        if (overlapX) {
          edges.push(
            { type: "top", vA: ba.y, vB: bb.y },
            { type: "bottom", vA: ba.y + ba.h, vB: bb.y + bb.h },
            { type: "center-y", vA: ba.y + ba.h / 2, vB: bb.y + bb.h / 2 }
          );
        }
        let best = null;
        for (const { type, vA, vB } of edges) {
          const drift = Math.abs(vA - vB);
          if (drift > EXACT && drift <= THRESHOLDS.alignmentTolerance) {
            if (!best || drift < best.drift) {
              best = { edgeType: type, valueA: vA, valueB: vB, drift };
            }
          }
        }
        if (best) {
          findings.push({
            rule: "near-misalignment",
            severity: "info",
            elementId: a.id,
            message: `"${a.id}" and "${b.id}" are nearly aligned on ${best.edgeType} (drift: ${best.drift}px)`,
            detail: { elementA: a.id, elementB: b.id, ...best },
            suggestion: `Align ${best.edgeType} of ${a.id} with ${b.id} (drift: ${best.drift}px)`
          });
        }
      }
    }
  }
  return findings;
}
function ruleEdgeCrowding(elements) {
  const findings = [];
  const sz = SAFE_ZONE;
  for (const el2 of Object.values(elements)) {
    if (el2._internal) continue;
    if (el2.parentId != null) continue;
    if (normLayer(el2) === "bg" || normLayer(el2) === "overlay") continue;
    const b = localBoundsOf(el2);
    if (!b || b.w <= 0 || b.h <= 0) continue;
    const checks = [
      { edge: "left", distance: b.x - sz.x },
      { edge: "top", distance: b.y - sz.y },
      { edge: "right", distance: sz.x + sz.w - (b.x + b.w) },
      { edge: "bottom", distance: sz.y + sz.h - (b.y + b.h) }
    ];
    for (const { edge, distance } of checks) {
      if (distance > 0 && distance < THRESHOLDS.edgeCrowding) {
        findings.push({
          rule: "edge-crowding",
          severity: "info",
          elementId: el2.id,
          message: `"${el2.id}" is only ${distance}px from safe zone ${edge}`,
          detail: { edge, distance, needed: THRESHOLDS.edgeCrowding - distance, threshold: THRESHOLDS.edgeCrowding },
          suggestion: `Move element ${THRESHOLDS.edgeCrowding - distance}px away from safe zone ${edge}`
        });
      }
    }
  }
  return findings;
}
function ruleContentClustering(elements) {
  const findings = [];
  const roots = Object.values(elements).filter(
    (el2) => !el2._internal && el2.parentId == null && normLayer(el2) !== "bg"
  );
  const withBounds = roots.map((el2) => localBoundsOf(el2)).filter((b) => b != null && b.w > 0 && b.h > 0);
  if (withBounds.length === 0) return findings;
  let covered = 0;
  for (const b of withBounds) covered += b.w * b.h;
  const safeZoneArea = SAFE_ZONE.w * SAFE_ZONE.h;
  const usageRatio = covered / safeZoneArea;
  if (usageRatio < THRESHOLDS.contentAreaMin) {
    findings.push({
      rule: "content-clustering",
      severity: "warning",
      elementId: "slide",
      message: `Content uses only ${(usageRatio * 100).toFixed(0)}% of the safe zone`,
      detail: { usageRatio, covered, safeZoneArea },
      suggestion: `Content uses only ${(usageRatio * 100).toFixed(0)}% of the safe zone \u2014 consider using more of the available space`
    });
  }
  return findings;
}
function ruleLopsidedLayout(elements) {
  const findings = [];
  const roots = Object.values(elements).filter(
    (el2) => !el2._internal && el2.parentId == null && normLayer(el2) !== "bg"
  );
  const withBounds = roots.map((el2) => localBoundsOf(el2)).filter((b) => b != null && b.w > 0 && b.h > 0);
  if (withBounds.length === 0) return findings;
  let sumX = 0, sumY = 0, sumWeight = 0;
  for (const b of withBounds) {
    const weight = b.w * b.h;
    sumX += (b.x + b.w / 2) * weight;
    sumY += (b.y + b.h / 2) * weight;
    sumWeight += weight;
  }
  if (sumWeight === 0) return findings;
  const centroid = { x: sumX / sumWeight, y: sumY / sumWeight };
  const slideCenter = { x: 960, y: 540 };
  const drift = { x: centroid.x - slideCenter.x, y: centroid.y - slideCenter.y };
  if (Math.abs(drift.x) > 200 || Math.abs(drift.y) > 200) {
    const dirs = [];
    if (drift.y < -200) dirs.push("upward");
    if (drift.y > 200) dirs.push("downward");
    if (drift.x < -200) dirs.push("left");
    if (drift.x > 200) dirs.push("right");
    findings.push({
      rule: "lopsided-layout",
      severity: "info",
      elementId: "slide",
      message: `Content centroid is shifted ${dirs.join(" and ")} from slide center`,
      detail: { centroid, slideCenter, drift },
      suggestion: `Content is shifted ${dirs.join(" and ")} \u2014 consider recentering`
    });
  }
  return findings;
}
function ruleTooManyElements(elements) {
  const findings = [];
  const count = Object.values(elements).filter(
    (el2) => !el2._internal && el2.parentId == null && normLayer(el2) !== "bg"
  ).length;
  if (count > THRESHOLDS.maxRootElements) {
    findings.push({
      rule: "too-many-elements",
      severity: "info",
      elementId: "slide",
      message: `Slide has ${count} root elements (guideline: ${THRESHOLDS.maxRootElements})`,
      detail: { count, threshold: THRESHOLDS.maxRootElements },
      suggestion: `Consider simplifying slide \u2014 ${count} root elements exceeds guideline of ${THRESHOLDS.maxRootElements}`
    });
  }
  return findings;
}
function ruleContentUnderutilized(elements) {
  const findings = [];
  const roots = Object.values(elements).filter(
    (el2) => !el2._internal && el2.parentId == null && normLayer(el2) !== "bg"
  );
  const withBounds = roots.map((el2) => localBoundsOf(el2)).filter((b) => b != null && b.w > 0 && b.h > 0);
  if (withBounds.length === 0) return findings;
  const contentBounds = {
    x: Math.min(...withBounds.map((b) => b.x)),
    y: Math.min(...withBounds.map((b) => b.y)),
    w: 0,
    h: 0
  };
  contentBounds.w = Math.max(...withBounds.map((b) => b.x + b.w)) - contentBounds.x;
  contentBounds.h = Math.max(...withBounds.map((b) => b.y + b.h)) - contentBounds.y;
  const leftMargin = contentBounds.x - SAFE_ZONE.x;
  const rightMargin = SAFE_ZONE.x + SAFE_ZONE.w - (contentBounds.x + contentBounds.w);
  const topMargin = contentBounds.y - SAFE_ZONE.y;
  const bottomMargin = SAFE_ZONE.y + SAFE_ZONE.h - (contentBounds.y + contentBounds.h);
  const hThreshold = SAFE_ZONE.w * THRESHOLDS.marginRatioMax;
  const vThreshold = SAFE_ZONE.h * THRESHOLDS.marginRatioMax;
  const narrowH = leftMargin > hThreshold && rightMargin > hThreshold;
  const narrowV = topMargin > vThreshold && bottomMargin > vThreshold;
  if (!narrowH && !narrowV) return findings;
  const underutilized = narrowH && narrowV ? "both" : narrowH ? "horizontal" : "vertical";
  const margins = { left: leftMargin, right: rightMargin, top: topMargin, bottom: bottomMargin };
  let message, suggestion;
  if (underutilized === "both") {
    message = "Content is small \u2014 large margins on all sides";
    suggestion = "Enlarge content elements or reduce margins on all sides";
  } else if (underutilized === "horizontal") {
    message = "Content is narrow \u2014 consider using more horizontal space";
    suggestion = "Widen content elements or reduce horizontal margins";
  } else {
    message = "Content is short \u2014 consider using more vertical space";
    suggestion = "Increase content height or reduce vertical margins";
  }
  findings.push({
    rule: "content-underutilized",
    severity: "info",
    elementId: "slide",
    message,
    detail: { contentBounds, margins, underutilized, safeZone: SAFE_ZONE },
    suggestion
  });
  return findings;
}
function findSkTextElements(slideEl) {
  if (!slideEl) return [];
  return Array.from(slideEl.querySelectorAll('[data-sk-type="el"][data-sk-id]'));
}
function ruleTextOverflow(slideEl) {
  const findings = [];
  if (!slideEl) return findings;
  const els = slideEl.querySelectorAll('[data-sk-type="el"]');
  for (const el2 of els) {
    const overflowY = el2.scrollHeight > el2.clientHeight + 2;
    const overflowX = el2.scrollWidth > el2.clientWidth + 2;
    if (overflowY || overflowX) {
      findings.push({
        rule: "text-overflow",
        severity: "error",
        elementId: el2.getAttribute("data-sk-id"),
        message: `Element "${el2.getAttribute("data-sk-id")}" has content overflow`,
        detail: {
          scrollHeight: el2.scrollHeight,
          clientHeight: el2.clientHeight,
          scrollWidth: el2.scrollWidth,
          clientWidth: el2.clientWidth,
          overflowY,
          overflowX
        },
        suggestion: "Reduce content or increase element height/width"
      });
    }
  }
  return findings;
}
function findTextBearingDescendants(container) {
  const results = [];
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
  const seen = /* @__PURE__ */ new Set();
  let node;
  while (node = walker.nextNode()) {
    if (!node.textContent || !node.textContent.trim()) continue;
    const parent = node.parentElement;
    if (parent && !seen.has(parent)) {
      seen.add(parent);
      results.push(parent);
    }
  }
  return results;
}
function ruleFontTooSmall(slideEl) {
  const findings = [];
  if (!slideEl) return findings;
  const seen = /* @__PURE__ */ new Set();
  for (const container of findSkTextElements(slideEl)) {
    const skId = container.getAttribute("data-sk-id");
    if (!skId || seen.has(skId)) continue;
    const textEls = findTextBearingDescendants(container);
    if (textEls.length === 0) continue;
    const minFont = Math.min(...textEls.map((e) => parseFloat(getComputedStyle(e).fontSize)));
    if (minFont < THRESHOLDS.minFontSize) {
      seen.add(skId);
      findings.push({
        rule: "font-too-small",
        severity: "warning",
        elementId: skId,
        message: `Font size ${minFont}px is below minimum ${THRESHOLDS.minFontSize}px`,
        detail: { fontSize: minFont, threshold: THRESHOLDS.minFontSize },
        suggestion: `Increase font size to at least ${THRESHOLDS.minFontSize}px`
      });
    }
  }
  return findings;
}
function ruleFontTooLarge(slideEl) {
  const findings = [];
  if (!slideEl) return findings;
  const seen = /* @__PURE__ */ new Set();
  for (const container of findSkTextElements(slideEl)) {
    const skId = container.getAttribute("data-sk-id");
    if (!skId || seen.has(skId)) continue;
    const textEls = findTextBearingDescendants(container);
    if (textEls.length === 0) continue;
    const maxFont = Math.max(...textEls.map((e) => parseFloat(getComputedStyle(e).fontSize)));
    if (maxFont > THRESHOLDS.maxFontSize) {
      seen.add(skId);
      findings.push({
        rule: "font-too-large",
        severity: "info",
        elementId: skId,
        message: `Font size ${maxFont}px exceeds maximum ${THRESHOLDS.maxFontSize}px`,
        detail: { fontSize: maxFont, threshold: THRESHOLDS.maxFontSize },
        suggestion: `Decrease font size to at most ${THRESHOLDS.maxFontSize}px`
      });
    }
  }
  return findings;
}
function ruleLineTooLong(slideEl) {
  const findings = [];
  if (!slideEl) return findings;
  for (const el2 of findSkTextElements(slideEl)) {
    if (!el2.textContent || !el2.textContent.trim()) continue;
    const fontSize = parseFloat(getComputedStyle(el2).fontSize);
    const elementWidth = el2.clientWidth;
    const estimatedCharsPerLine = elementWidth / (fontSize * 0.6);
    if (estimatedCharsPerLine > THRESHOLDS.maxLineLength) {
      findings.push({
        rule: "line-too-long",
        severity: "info",
        elementId: el2.getAttribute("data-sk-id"),
        message: `Estimated ${Math.round(estimatedCharsPerLine)} chars/line exceeds ${THRESHOLDS.maxLineLength}`,
        detail: { estimatedCharsPerLine: Math.round(estimatedCharsPerLine), threshold: THRESHOLDS.maxLineLength, elementWidth },
        suggestion: "Reduce element width or increase font size"
      });
    }
  }
  return findings;
}
function ruleLineHeightTight(slideEl) {
  const findings = [];
  if (!slideEl) return findings;
  for (const el2 of findSkTextElements(slideEl)) {
    if (!el2.textContent || !el2.textContent.trim()) continue;
    const style = getComputedStyle(el2);
    const lineHeight = style.lineHeight;
    if (lineHeight === "normal") continue;
    const fontSize = parseFloat(style.fontSize);
    const lhNum = parseFloat(lineHeight);
    const isPixels = lineHeight.endsWith("px");
    const lhPx = isPixels ? lhNum : lhNum * fontSize;
    const ratio = lhPx / fontSize;
    if (ratio < THRESHOLDS.minLineHeightRatio) {
      findings.push({
        rule: "line-height-tight",
        severity: "warning",
        elementId: el2.getAttribute("data-sk-id"),
        message: `Line-height ratio ${ratio.toFixed(2)} is below minimum ${THRESHOLDS.minLineHeightRatio}`,
        detail: { lineHeight, fontSize, ratio, threshold: THRESHOLDS.minLineHeightRatio },
        suggestion: `Increase line-height to at least ${(fontSize * THRESHOLDS.minLineHeightRatio).toFixed(0)}px`
      });
    }
  }
  return findings;
}
function ruleImageUpscaled(slideEl) {
  const findings = [];
  if (!slideEl) return findings;
  const imgs = slideEl.querySelectorAll("img");
  for (const img of imgs) {
    if (img.naturalWidth === 0) continue;
    const rw = img.clientWidth;
    const rh = img.clientHeight;
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    const scaleX = rw / nw;
    const scaleY = rh / nh;
    if (rw > nw * THRESHOLDS.imageUpscaleMax || rh > nh * THRESHOLDS.imageUpscaleMax) {
      const maxScale = Math.max(scaleX, scaleY);
      const pct = Math.round((maxScale - 1) * 100);
      const ancestor = img.closest("[data-sk-id]");
      findings.push({
        rule: "image-upscaled",
        severity: "warning",
        elementId: ancestor ? ancestor.getAttribute("data-sk-id") : null,
        message: `Image is upscaled ${pct}% beyond natural size`,
        detail: { renderedWidth: rw, renderedHeight: rh, naturalWidth: nw, naturalHeight: nh, scaleX, scaleY },
        suggestion: `Image is upscaled ${pct}% beyond natural size \u2014 use a higher resolution source`
      });
    }
  }
  return findings;
}
function ruleAspectRatioDistortion(slideEl) {
  const findings = [];
  if (!slideEl) return findings;
  const imgs = slideEl.querySelectorAll("img");
  for (const img of imgs) {
    if (img.naturalWidth === 0 || img.naturalHeight === 0) continue;
    const objectFit = getComputedStyle(img).objectFit;
    if (objectFit === "contain" || objectFit === "cover") continue;
    const naturalRatio = img.naturalWidth / img.naturalHeight;
    const renderedRatio = img.clientWidth / img.clientHeight;
    const distortion = Math.abs(renderedRatio - naturalRatio) / naturalRatio;
    if (distortion > THRESHOLDS.aspectRatioTolerance) {
      const ancestor = img.closest("[data-sk-id]");
      findings.push({
        rule: "aspect-ratio-distortion",
        severity: "warning",
        elementId: ancestor ? ancestor.getAttribute("data-sk-id") : null,
        message: `Image aspect ratio distorted by ${(distortion * 100).toFixed(1)}%`,
        detail: { naturalRatio, renderedRatio, distortion },
        suggestion: "Image aspect ratio distorted \u2014 use object-fit: contain or adjust container"
      });
    }
  }
  return findings;
}
function ruleHeadingSizeInversion(slideEl) {
  const findings = [];
  if (!slideEl) return findings;
  const headings = slideEl.querySelectorAll("h1, h2, h3, h4, h5, h6");
  if (headings.length === 0) return findings;
  const levelSizes = /* @__PURE__ */ new Map();
  for (const h of headings) {
    const level = parseInt(h.tagName[1]);
    const fontSize = parseFloat(getComputedStyle(h).fontSize);
    if (!levelSizes.has(level) || fontSize > levelSizes.get(level)) {
      levelSizes.set(level, fontSize);
    }
  }
  const levels = Array.from(levelSizes.keys()).sort((a, b) => a - b);
  for (let i = 0; i < levels.length - 1; i++) {
    const higher = levels[i];
    const lower = levels[i + 1];
    const higherSize = levelSizes.get(higher);
    const lowerSize = levelSizes.get(lower);
    if (higherSize < lowerSize) {
      findings.push({
        rule: "heading-size-inversion",
        severity: "warning",
        elementId: null,
        message: `h${higher} (${higherSize}px) should be larger than h${lower} (${lowerSize}px)`,
        detail: { largerHeading: `h${higher}`, largerSize: higherSize, smallerHeading: `h${lower}`, smallerSize: lowerSize },
        suggestion: `h${higher} (${higherSize}px) should be larger than h${lower} (${lowerSize}px)`
      });
    }
  }
  return findings;
}
function ruleTitlePositionDrift(slides) {
  const findings = [];
  const positions = [];
  for (const slide of slides) {
    const elements = slide.layout?.elements;
    if (!elements) continue;
    for (const el2 of Object.values(elements)) {
      if (el2._internal) continue;
      if (!el2.id || !el2.id.toLowerCase().includes("title")) continue;
      const abs = absoluteBoundsOf(el2, elements);
      if (!abs) continue;
      positions.push({ slideId: slide.id, x: abs.x, y: abs.y });
    }
  }
  if (positions.length < 2) return findings;
  const xs = positions.map((p) => p.x);
  const ys = positions.map((p) => p.y);
  const driftX = Math.max(...xs) - Math.min(...xs);
  const driftY = Math.max(...ys) - Math.min(...ys);
  const maxDrift = Math.max(driftX, driftY);
  if (maxDrift > THRESHOLDS.titlePositionDrift) {
    findings.push({
      rule: "title-position-drift",
      severity: "info",
      elementId: null,
      message: `Title position varies by ${maxDrift}px across slides \u2014 standardize to consistent position`,
      detail: { positions, driftX, driftY },
      suggestion: `Title position varies by ${maxDrift}px across slides \u2014 standardize to consistent position`
    });
  }
  return findings;
}
function ruleFontCount(sections) {
  const findings = [];
  const families = /* @__PURE__ */ new Set();
  for (const section of sections) {
    if (!section) continue;
    const els = section.querySelectorAll('[data-sk-type="el"]');
    for (const el2 of els) {
      if (!el2.textContent || !el2.textContent.trim()) continue;
      const raw = getComputedStyle(el2).fontFamily;
      if (!raw) continue;
      const first = raw.split(",")[0].trim().toLowerCase().replace(/['"]/g, "");
      if (first) families.add(first);
    }
  }
  if (families.size > THRESHOLDS.maxFontFamilies) {
    findings.push({
      rule: "font-count",
      severity: "info",
      elementId: null,
      message: `Deck uses ${families.size} font families \u2014 consider limiting to ${THRESHOLDS.maxFontFamilies}`,
      detail: { families: Array.from(families), count: families.size, threshold: THRESHOLDS.maxFontFamilies },
      suggestion: `Deck uses ${families.size} font families \u2014 consider limiting to ${THRESHOLDS.maxFontFamilies}`
    });
  }
  return findings;
}
function ruleStyleDrift(sections, slides) {
  const findings = [];
  const bodyFontSizes = [];
  const headingFontSizes = [];
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    if (!section) continue;
    const slideId = slides[i]?.id ?? `slide-${i}`;
    const textEls = section.querySelectorAll('[data-sk-type="el"]');
    const sizeCounts = /* @__PURE__ */ new Map();
    for (const el2 of textEls) {
      if (!el2.textContent || !el2.textContent.trim()) continue;
      const size = Math.round(parseFloat(getComputedStyle(el2).fontSize));
      sizeCounts.set(size, (sizeCounts.get(size) || 0) + 1);
    }
    if (sizeCounts.size > 0) {
      let mostCommon = 0, bestCount = 0;
      for (const [size, count] of sizeCounts) {
        if (count > bestCount) {
          mostCommon = size;
          bestCount = count;
        }
      }
      bodyFontSizes.push({ slideId, size: mostCommon });
    }
    const headings = section.querySelectorAll("h1, h2, h3");
    const hSizeCounts = /* @__PURE__ */ new Map();
    for (const h of headings) {
      const size = Math.round(parseFloat(getComputedStyle(h).fontSize));
      hSizeCounts.set(size, (hSizeCounts.get(size) || 0) + 1);
    }
    if (hSizeCounts.size > 0) {
      let mostCommon = 0, bestCount = 0;
      for (const [size, count] of hSizeCounts) {
        if (count > bestCount) {
          mostCommon = size;
          bestCount = count;
        }
      }
      headingFontSizes.push({ slideId, size: mostCommon });
    }
  }
  if (bodyFontSizes.length >= 2) {
    const sizes = bodyFontSizes.map((e) => e.size);
    const min = Math.min(...sizes);
    const max = Math.max(...sizes);
    if (max - min > 4) {
      findings.push({
        rule: "style-drift",
        severity: "info",
        elementId: null,
        message: `Body text size varies from ${min}px to ${max}px across slides \u2014 standardize`,
        detail: { bodyFontSizes, headingFontSizes },
        suggestion: `Body text size varies from ${min}px to ${max}px across slides \u2014 standardize`
      });
    }
  }
  if (headingFontSizes.length >= 2) {
    const sizes = headingFontSizes.map((e) => e.size);
    const min = Math.min(...sizes);
    const max = Math.max(...sizes);
    if (max - min > 4) {
      findings.push({
        rule: "style-drift",
        severity: "info",
        elementId: null,
        message: `Heading size varies from ${min}px to ${max}px across slides \u2014 standardize`,
        detail: { bodyFontSizes, headingFontSizes },
        suggestion: `Heading size varies from ${min}px to ${max}px across slides \u2014 standardize`
      });
    }
  }
  return findings;
}
function ruleMisplacedCssProp(elements) {
  const findings = [];
  for (const el2 of Object.values(elements)) {
    if (el2._internal) continue;
    const props = el2.authored?.props;
    if (!props) continue;
    const id = el2.id;
    for (const key of Object.keys(props)) {
      if (key === "style") continue;
      if (CSS_LIKE_PROPS.has(key)) {
        findings.push({
          rule: "misplaced-css-prop",
          severity: "warning",
          elementId: id,
          message: `Element "${id}" has CSS property "${key}" at top level. Move it to style: { ${key}: ... }`,
          detail: { property: key },
          suggestion: `Move "${key}" into the style object: style: { ${key}: ... }`
        });
      }
    }
  }
  return findings;
}
function ruleTextAlignDirectionMismatch(elements) {
  const findings = [];
  for (const el2 of Object.values(elements)) {
    if (el2._internal) continue;
    const prov = el2.provenance;
    if (!prov?.x || prov.x.source !== "constraint" || prov.x.type !== "leftOf") continue;
    const props = el2.authored?.props;
    const style = props?.style ?? {};
    const textAlign = style.textAlign ?? "left";
    if (textAlign !== "right") {
      findings.push({
        rule: "textAlign-direction-mismatch",
        severity: "warning",
        elementId: el2.id,
        message: `Element "${el2.id}" uses leftOf() positioning but textAlign is '${textAlign}' (should be 'right' for visual alignment)`,
        detail: { textAlign, provenanceType: "leftOf" },
        suggestion: `Add style: { textAlign: 'right' } to align text near the reference element`
      });
    }
  }
  return findings;
}
function ruleEqualHeightPeers(elements) {
  const findings = [];
  for (const el2 of Object.values(elements)) {
    if (el2.type !== "hstack" || el2._internal) continue;
    const childIds = el2.children;
    if (!childIds || childIds.length < 2) continue;
    const heights = [];
    for (const cid of childIds) {
      const child = elements[cid];
      if (!child?.resolved) continue;
      heights.push({ id: cid, h: child.resolved.h });
    }
    if (heights.length < 2) continue;
    const sorted = heights.map((c) => c.h).sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    if (median === 0) continue;
    for (const child of heights) {
      const pct = Math.round(Math.abs(child.h - median) / median * 100);
      if (pct > 5) {
        findings.push({
          rule: "equal-height-peers",
          severity: "warning",
          elementId: child.id,
          message: `Element "${child.id}" height (${child.h}px) deviates ${pct}% from median (${median}px) in hstack "${el2.id}"`,
          detail: { childId: child.id, height: child.h, median, pct, stackId: el2.id },
          suggestion: `Use hstack({ align: 'stretch' }) to equalize heights, or set explicit heights`
        });
      }
    }
  }
  return findings;
}
function getFontSize(el2) {
  const props = el2.authored?.props;
  const style = props?.style;
  if (style?.fontSize) {
    const raw = style.fontSize;
    if (typeof raw === "number") return raw;
    if (typeof raw === "string") {
      const parsed = parseFloat(raw);
      if (!isNaN(parsed)) return parsed;
    }
  }
  return 24;
}
function isMultiLine(el2) {
  const b = localBoundsOf(el2);
  if (!b) return false;
  const fontSize = getFontSize(el2);
  return b.h > fontSize * 1.8;
}
function ruleMinVerticalGap(elements) {
  const findings = [];
  for (const siblings of siblingGroups(elements).values()) {
    const textEls = siblings.filter((el2) => el2.type === "el");
    if (textEls.length < 2) continue;
    const sorted = [...textEls].sort((a, b) => {
      const ba = localBoundsOf(a);
      const bb = localBoundsOf(b);
      return (ba?.y ?? 0) - (bb?.y ?? 0);
    });
    for (let i = 0; i < sorted.length - 1; i++) {
      const elA = sorted[i];
      const elB = sorted[i + 1];
      const bA = localBoundsOf(elA);
      const bB = localBoundsOf(elB);
      if (!bA || !bB) continue;
      const overlapX = bA.x < bB.x + bB.w && bA.x + bA.w > bB.x;
      if (!overlapX) continue;
      const gap = bB.y - (bA.y + bA.h);
      if (gap <= 0) continue;
      const fontSizeA = getFontSize(elA);
      const fontSizeB = getFontSize(elB);
      const smallerFont = Math.min(fontSizeA, fontSizeB);
      const multiplier = isMultiLine(elA) ? 1 : 0.75;
      const minGap = Math.min(36, Math.round(smallerFont * multiplier));
      if (gap < minGap) {
        const aId = elA.id;
        const bId = elB.id;
        findings.push({
          rule: "min-vertical-gap",
          severity: gap < THRESHOLDS.minGap ? "warning" : "info",
          elementId: elA.id,
          message: `Gap between "${aId}" and "${bId}" is ${gap}px (minimum recommended: ${minGap}px based on font sizes)`,
          detail: { elementA: aId, elementB: bId, gap, minGap, fontSizeA, fontSizeB, multiplier },
          bounds: bA,
          parentBounds: null,
          suggestion: `Increase gap to at least ${minGap}px`
        });
      }
    }
  }
  return findings;
}
function ruleHorizontalCenterConsistency(elements) {
  const findings = [];
  const SLIDE_CENTER = 960;
  const CENTER_TOLERANCE = 20;
  const WARN_DEVIATION = 50;
  const ERROR_DEVIATION = 100;
  const candidates = Object.values(elements).filter(
    (el2) => !el2._internal && el2.parentId == null && normLayer(el2) !== "bg" && normLayer(el2) !== "overlay" && el2.type !== "connector"
  );
  if (candidates.length < 2) return findings;
  const isDecorative = (b) => b.w < 20 || b.h < 12 || b.w * b.h < 2e3;
  const withBounds = candidates.map((el2) => ({
    el: el2,
    bounds: localBoundsOf(el2)
  })).filter(
    (e) => e.bounds != null && e.bounds.w > 0 && !isDecorative(e.bounds)
  );
  if (withBounds.length < 2) return findings;
  const centeredCount = withBounds.filter(({ bounds }) => {
    const centerX = bounds.x + bounds.w / 2;
    return Math.abs(centerX - SLIDE_CENTER) < CENTER_TOLERANCE;
  }).length;
  const centeredRatio = centeredCount / withBounds.length;
  if (centeredRatio <= 0.6) return findings;
  for (const { el: el2, bounds } of withBounds) {
    const centerX = Math.round(bounds.x + bounds.w / 2);
    const offset = Math.abs(centerX - SLIDE_CENTER);
    if (offset > WARN_DEVIATION) {
      const id = el2.id;
      findings.push({
        rule: "horizontal-center-consistency",
        severity: offset > ERROR_DEVIATION ? "error" : "warning",
        elementId: id,
        message: `Element "${id}" center (${centerX}) is ${offset}px from slide center (960) on a centered-layout slide`,
        detail: { elementId: id, centerX, offset, centeredRatio },
        bounds,
        parentBounds: null,
        suggestion: `Use anchor: 'tc' at x: 960, or wrap in a centered group`
      });
    }
  }
  return findings;
}
function ruleUnbalancedTrailingWhitespace(elements) {
  const findings = [];
  const SAFE_TOP = SAFE_ZONE.y;
  const SAFE_BOTTOM = SAFE_ZONE.y + SAFE_ZONE.h;
  const WARN_RATIO = 2.5;
  const ERROR_RATIO = 4;
  const roots = Object.values(elements).filter(
    (el2) => !el2._internal && el2.parentId == null && normLayer(el2) !== "bg" && normLayer(el2) !== "overlay" && el2.type !== "connector"
  );
  const allBounds = roots.map((el2) => localBoundsOf(el2)).filter((b) => b != null && b.w > 0 && b.h > 0);
  if (allBounds.length === 0) return findings;
  const contentTop = Math.min(...allBounds.map((b) => b.y));
  const contentBottom = Math.max(...allBounds.map((b) => b.y + b.h));
  const topGap = Math.max(1, contentTop - SAFE_TOP);
  const bottomGap = Math.max(1, SAFE_BOTTOM - contentBottom);
  const ratio = topGap > bottomGap ? topGap / bottomGap : bottomGap / topGap;
  const direction = topGap > bottomGap ? "top-heavy whitespace" : "bottom-heavy whitespace";
  if (ratio > WARN_RATIO) {
    findings.push({
      rule: "unbalanced-trailing-whitespace",
      severity: ratio > ERROR_RATIO ? "warning" : "info",
      elementId: "slide",
      message: `Content block has ${direction} (${Math.round(topGap)}px top vs ${Math.round(bottomGap)}px bottom, ratio: ${ratio.toFixed(1)}\xD7)`,
      detail: { topGap: Math.round(topGap), bottomGap: Math.round(bottomGap), ratio, direction },
      bounds: { x: SAFE_ZONE.x, y: contentTop, w: SAFE_ZONE.w, h: contentBottom - contentTop },
      parentBounds: SAFE_ZONE,
      suggestion: `Redistribute vertical spacing for better balance`
    });
  }
  return findings;
}
function rulePanelContentSurplus(slideEl) {
  const findings = [];
  if (!slideEl) return findings;
  const SURPLUS_RATIO = 2;
  const panels = slideEl.querySelectorAll('[data-sk-compound="panel"]');
  for (const panel2 of panels) {
    const panelEl = panel2;
    const panelHeight = panelEl.clientHeight;
    if (panelHeight <= 0) continue;
    const contentStack = panelEl.querySelector('[data-sk-type="vstack"], [data-sk-type="hstack"]');
    if (!contentStack) continue;
    const contentHeight = contentStack.scrollHeight;
    if (contentHeight <= 0) continue;
    const ratio = panelHeight / contentHeight;
    if (ratio > SURPLUS_RATIO) {
      const skId = panelEl.getAttribute("data-sk-id");
      const surplus = panelHeight - contentHeight;
      findings.push({
        rule: "panel-content-surplus",
        severity: "info",
        elementId: skId,
        message: `Panel "${skId}" is ${Math.round(ratio)}\xD7 taller than its content (${surplus}px unused)`,
        detail: { panelHeight, contentHeight, ratio, surplus },
        suggestion: `Omit explicit h or reduce panel height \u2014 content only needs ~${contentHeight}px`
      });
    }
  }
  return findings;
}
function lintSlide(slideData, slideElement = null) {
  const elements = slideData.layout.elements;
  if (!elements || typeof elements !== "object") return [];
  const findings = [
    // Duplicate ID check runs first — duplicates cause cascading issues
    ...ruleDuplicateId(slideData),
    ...ruleChildOverflow(elements),
    ...ruleNonAncestorOverlap(elements),
    ...ruleCanvasOverflow(elements),
    ...ruleSafeZoneViolation(elements),
    ...ruleZeroSize(elements),
    // Spacing & alignment
    ...ruleGapTooSmall(elements),
    ...ruleNearMisalignment(elements),
    ...ruleEdgeCrowding(elements),
    // Content distribution
    ...ruleContentClustering(elements),
    ...ruleLopsidedLayout(elements),
    ...ruleTooManyElements(elements),
    ...ruleContentUnderutilized(elements),
    // Authoring quality
    ...ruleMisplacedCssProp(elements),
    ...ruleTextAlignDirectionMismatch(elements),
    ...ruleEqualHeightPeers(elements),
    // Layout quality
    ...ruleMinVerticalGap(elements),
    ...ruleHorizontalCenterConsistency(elements),
    ...ruleUnbalancedTrailingWhitespace(elements)
  ];
  if (slideElement) {
    findings.push(
      ...ruleTextOverflow(slideElement),
      ...ruleFontTooSmall(slideElement),
      ...ruleFontTooLarge(slideElement),
      ...ruleLineTooLong(slideElement),
      ...ruleLineHeightTight(slideElement),
      ...ruleImageUpscaled(slideElement),
      ...ruleAspectRatioDistortion(slideElement),
      ...ruleHeadingSizeInversion(slideElement),
      ...rulePanelContentSurplus(slideElement)
    );
  }
  return findings;
}
function lintDeck(skData, sections = null) {
  const slides = skData?.slides;
  if (!Array.isArray(slides)) return [];
  const findings = [];
  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    const slideEl = sections ? sections[i] || null : null;
    const slideFindings = lintSlide(slide, slideEl);
    for (const f of slideFindings) {
      findings.push({ ...f, slideId: slide.id });
    }
  }
  findings.push(
    ...ruleTitlePositionDrift(slides)
  );
  if (sections) {
    findings.push(
      ...ruleFontCount(sections),
      ...ruleStyleDrift(sections, slides)
    );
  }
  return findings;
}
var DEFAULT_STUB_LENGTH = 30;
var DEFAULT_CLEARANCE = 15;
function routeConnector(options) {
  const {
    from,
    to,
    obstacles = [],
    stubLength = DEFAULT_STUB_LENGTH,
    clearance = DEFAULT_CLEARANCE,
    orthogonal = false
  } = options;
  const fromPt = { x: from.x, y: from.y };
  const toPt = { x: to.x, y: to.y };
  let effectiveStub = stubLength;
  const dot = from.dx * to.dx + from.dy * to.dy;
  if (dot < 0) {
    const gapX = (to.x - from.x) * Math.sign(from.dx);
    const gapY = (to.y - from.y) * Math.sign(from.dy);
    const gap = Math.abs(from.dx) > Math.abs(from.dy) ? gapX : gapY;
    if (gap > 0 && gap < 2 * stubLength) {
      effectiveStub = Math.max(10, gap / 2 - 2);
    }
  }
  const fromStub = computeStubEnd(from, effectiveStub);
  const toStub = computeStubEnd(to, effectiveStub);
  const fromDir = normalizeDirection(from.dx, from.dy);
  const toDir = normalizeDirection(to.dx, to.dy);
  const fromSegments = buildStubSegments(fromPt, fromStub, from.dx, from.dy);
  const toSegments = buildStubSegments(toPt, toStub, to.dx, to.dy);
  const p1 = fromSegments[fromSegments.length - 1];
  const q1 = toSegments[toSegments.length - 1];
  const middle = findBestRoute(p1, fromDir, q1, toDir, obstacles, clearance, orthogonal);
  const toSegmentsReversed = [...toSegments].reverse();
  const waypoints = deduplicatePoints([
    fromPt,
    ...fromSegments,
    ...middle,
    ...toSegmentsReversed,
    toPt
  ]);
  return { waypoints };
}
function computeStubEnd(anchor, stubLength) {
  return {
    x: anchor.x + anchor.dx * stubLength,
    y: anchor.y + anchor.dy * stubLength
  };
}
function normalizeDirection(dx, dy) {
  if (dx !== 0 && dy !== 0) {
    return Math.abs(dx) >= Math.abs(dy) ? { dx: Math.sign(dx), dy: 0 } : { dx: 0, dy: Math.sign(dy) };
  }
  if (dx !== 0) return { dx: Math.sign(dx), dy: 0 };
  if (dy !== 0) return { dx: 0, dy: Math.sign(dy) };
  return { dx: 1, dy: 0 };
}
function buildStubSegments(origin, stubEnd, dx, dy) {
  const isDiagonal = dx !== 0 && dy !== 0;
  if (!isDiagonal) {
    return [stubEnd];
  }
  const midPoint = { x: stubEnd.x, y: origin.y };
  return [midPoint, stubEnd];
}
function segmentIntersectsRect(p1, p2, rect, clearance) {
  const left = rect.x - clearance;
  const right = rect.x + rect.w + clearance;
  const top = rect.y - clearance;
  const bottom = rect.y + rect.h + clearance;
  const minX = Math.min(p1.x, p2.x);
  const maxX = Math.max(p1.x, p2.x);
  const minY = Math.min(p1.y, p2.y);
  const maxY = Math.max(p1.y, p2.y);
  const isHorizontal = Math.abs(p1.y - p2.y) < 0.5;
  const isVertical = Math.abs(p1.x - p2.x) < 0.5;
  if (isHorizontal) {
    return p1.y > top && p1.y < bottom && maxX > left && minX < right;
  }
  if (isVertical) {
    return p1.x > left && p1.x < right && maxY > top && minY < bottom;
  }
  return maxX > left && minX < right && maxY > top && minY < bottom;
}
function polylineIntersectsObstacles(points, obstacles, clearance) {
  for (let i = 0; i < points.length - 1; i++) {
    for (const obs of obstacles) {
      if (segmentIntersectsRect(points[i], points[i + 1], obs, clearance)) {
        return true;
      }
    }
  }
  return false;
}
function findBestRoute(p1, d1, q1, d2, obstacles, clearance, orthogonal = false) {
  const candidates = [];
  const caseType = classifyCase(p1, d1, q1, d2);
  if (caseType === "backward" || caseType === "same-direction") {
    const uCandidates = computeAllChannelRoutes(p1, d1, q1, d2, obstacles, clearance);
    candidates.push(...uCandidates);
  } else {
    if (!orthogonal) {
      candidates.push([]);
    }
    candidates.push([{ x: q1.x, y: p1.y }]);
    candidates.push([{ x: p1.x, y: q1.y }]);
    const midX = (p1.x + q1.x) / 2;
    const midY = (p1.y + q1.y) / 2;
    candidates.push([
      { x: midX, y: p1.y },
      { x: midX, y: q1.y }
    ]);
    candidates.push([
      { x: p1.x, y: midY },
      { x: q1.x, y: midY }
    ]);
  }
  let bestRoute = [];
  let bestDist = Infinity;
  for (const middle of candidates) {
    const full = [p1, ...middle, q1];
    const dist = manhattanLength(full);
    if (dist < bestDist) {
      if (!polylineIntersectsObstacles(full, obstacles, clearance)) {
        bestDist = dist;
        bestRoute = middle;
      }
    }
  }
  if (bestDist === Infinity) {
    const fallbackRoutes = computeAllChannelRoutes(p1, d1, q1, d2, obstacles, clearance);
    for (const route of fallbackRoutes) {
      const full = [p1, ...route, q1];
      const dist = manhattanLength(full);
      if (dist < bestDist && !polylineIntersectsObstacles(full, obstacles, clearance)) {
        bestDist = dist;
        bestRoute = route;
      }
    }
  }
  if (bestDist === Infinity) {
    bestRoute = routeAroundAll(p1, q1, obstacles, clearance);
  }
  return bestRoute;
}
function classifyCase(p1, d1, q1, d2) {
  const dot = d1.dx * d2.dx + d1.dy * d2.dy;
  const toTargetX = Math.sign(q1.x - p1.x);
  const toTargetY = Math.sign(q1.y - p1.y);
  let facingTarget;
  if (toTargetX === 0 && toTargetY === 0) {
    facingTarget = dot < 0;
  } else {
    facingTarget = toTargetX !== 0 && d1.dx === toTargetX || toTargetY !== 0 && d1.dy === toTargetY;
  }
  if (dot < 0 && facingTarget) {
    return "direct";
  }
  if (dot === 0) {
    return "perpendicular";
  }
  if (dot > 0) {
    return "same-direction";
  }
  return "backward";
}
function computeAllChannelRoutes(p1, d1, q1, _d2, obstacles, clearance) {
  let minX = Math.min(p1.x, q1.x);
  let minY = Math.min(p1.y, q1.y);
  let maxX = Math.max(p1.x, q1.x);
  let maxY = Math.max(p1.y, q1.y);
  for (const obs of obstacles) {
    minX = Math.min(minX, obs.x);
    minY = Math.min(minY, obs.y);
    maxX = Math.max(maxX, obs.x + obs.w);
    maxY = Math.max(maxY, obs.y + obs.h);
  }
  const routes = [];
  const spanX = maxX - minX;
  const spanY = maxY - minY;
  const offsetY = Math.max(60, spanY * 0.3, clearance);
  const offsetX = Math.max(60, spanX * 0.3, clearance);
  const topY = minY - offsetY;
  routes.push(buildChannelRoute(p1, q1, d1, "y", topY));
  const bottomY = maxY + offsetY;
  routes.push(buildChannelRoute(p1, q1, d1, "y", bottomY));
  const leftX = minX - offsetX;
  routes.push(buildChannelRoute(p1, q1, d1, "x", leftX));
  const rightX = maxX + offsetX;
  routes.push(buildChannelRoute(p1, q1, d1, "x", rightX));
  return routes;
}
function buildChannelRoute(p1, q1, _d1, channelAxis, channelValue) {
  if (channelAxis === "y") {
    return [
      { x: p1.x, y: channelValue },
      { x: q1.x, y: channelValue }
    ];
  }
  return [
    { x: channelValue, y: p1.y },
    { x: channelValue, y: q1.y }
  ];
}
function routeAroundAll(p1, q1, obstacles, clearance) {
  if (obstacles.length === 0) {
    return [{ x: q1.x, y: p1.y }];
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const obs of obstacles) {
    minX = Math.min(minX, obs.x);
    minY = Math.min(minY, obs.y);
    maxX = Math.max(maxX, obs.x + obs.w);
    maxY = Math.max(maxY, obs.y + obs.h);
  }
  minX -= clearance;
  minY -= clearance;
  maxX += clearance;
  maxY += clearance;
  const candidates = [
    // Top route
    [{ x: p1.x, y: minY }, { x: q1.x, y: minY }],
    // Bottom route
    [{ x: p1.x, y: maxY }, { x: q1.x, y: maxY }],
    // Left route
    [{ x: minX, y: p1.y }, { x: minX, y: q1.y }],
    // Right route
    [{ x: maxX, y: p1.y }, { x: maxX, y: q1.y }]
  ];
  let best = candidates[0];
  let bestDist = Infinity;
  for (const route of candidates) {
    const full = [p1, ...route, q1];
    const dist = manhattanLength(full);
    if (dist < bestDist) {
      bestDist = dist;
      best = route;
    }
  }
  return best;
}
function manhattanLength(points) {
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    total += Math.abs(points[i + 1].x - points[i].x) + Math.abs(points[i + 1].y - points[i].y);
  }
  return total;
}
function deduplicatePoints(points) {
  if (points.length === 0) return [];
  const result = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const prev = result[result.length - 1];
    if (Math.abs(points[i].x - prev.x) > 0.5 || Math.abs(points[i].y - prev.y) > 0.5) {
      result.push(points[i]);
    }
  }
  return result;
}
init_debug_state();
init_debug_overlay();
init_debug_inspector();
init_debug_inspector_viewport();
init_debug_inspector_edit();
init_debug_inspector_drag();
init_debug_inspector_constraint();
init_debug_inspector_pick();
debugController.callbacks.renderElementDetail = (elementId, slideIndex) => {
  renderElementDetail(elementId, slideIndex);
};
debugController.callbacks.renderDebugOverlay = (options) => {
  refreshOverlayOnly(options.slideIndex ?? 0);
};
debugController.callbacks.refreshOverlayOnly = (slideIndex) => {
  refreshOverlayOnly(slideIndex);
};
debugController.callbacks.renderConstraintDetail = (elementId, axis, slideIndex) => {
  renderConstraintDetail(elementId, axis, slideIndex);
};
function _getCurrentSlideIndex() {
  const Reveal = window.Reveal;
  if (Reveal && typeof Reveal.getIndices === "function") {
    return Reveal.getIndices().h ?? 0;
  }
  return 0;
}
function _onSlideChanged() {
  const s = debugController.state;
  if (s.debugMode === 0) return;
  const newIndex = _getCurrentSlideIndex();
  if (newIndex === s.currentSlideIndex) return;
  s.selectedElementId = null;
  s.selectedConstraint = null;
  if (s.pickMode) exitPickMode();
  const modeOpts = _DEBUG_MODE_OPTIONS[s.debugMode];
  renderDebugOverlay({ ...s.lastToggleOptions, ...modeOpts, slideIndex: newIndex });
}
function _attachSlideChangeListener() {
  const Reveal = window.Reveal;
  if (Reveal && typeof Reveal.on === "function") {
    Reveal.on("slidechanged", _onSlideChanged);
  }
}
function _detachSlideChangeListener() {
  const Reveal = window.Reveal;
  if (Reveal && typeof Reveal.off === "function") {
    Reveal.off("slidechanged", _onSlideChanged);
  }
}
var _CONNECTOR_MIN_HIT = 8;
function _enableConnectorPointerEvents(layer) {
  const wrappers = layer.querySelectorAll("[data-sk-id]");
  for (const el2 of wrappers) {
    const htmlEl = el2;
    if (htmlEl.style.pointerEvents === "none" && htmlEl.querySelector("svg")) {
      htmlEl.style.pointerEvents = "auto";
      htmlEl.setAttribute("data-sk-debug-pe-override", "true");
      const w = htmlEl.offsetWidth;
      const h = htmlEl.offsetHeight;
      if (w < _CONNECTOR_MIN_HIT) {
        const expand = _CONNECTOR_MIN_HIT - w;
        htmlEl.setAttribute("data-sk-debug-orig-left", htmlEl.style.left);
        htmlEl.setAttribute("data-sk-debug-orig-width", htmlEl.style.width);
        htmlEl.style.left = `${parseFloat(htmlEl.style.left) - expand / 2}px`;
        htmlEl.style.width = `${_CONNECTOR_MIN_HIT}px`;
      }
      if (h < _CONNECTOR_MIN_HIT) {
        const expand = _CONNECTOR_MIN_HIT - h;
        htmlEl.setAttribute("data-sk-debug-orig-top", htmlEl.style.top);
        htmlEl.setAttribute("data-sk-debug-orig-height", htmlEl.style.height);
        htmlEl.style.top = `${parseFloat(htmlEl.style.top) - expand / 2}px`;
        htmlEl.style.height = `${_CONNECTOR_MIN_HIT}px`;
      }
    }
  }
}
function _restoreConnectorPointerEvents(layer) {
  const overridden = layer.querySelectorAll("[data-sk-debug-pe-override]");
  for (const el2 of overridden) {
    const htmlEl = el2;
    htmlEl.style.pointerEvents = "none";
    const origLeft = el2.getAttribute("data-sk-debug-orig-left");
    const origWidth = el2.getAttribute("data-sk-debug-orig-width");
    const origTop = el2.getAttribute("data-sk-debug-orig-top");
    const origHeight = el2.getAttribute("data-sk-debug-orig-height");
    if (origLeft !== null) {
      htmlEl.style.left = origLeft;
      el2.removeAttribute("data-sk-debug-orig-left");
    }
    if (origWidth !== null) {
      htmlEl.style.width = origWidth;
      el2.removeAttribute("data-sk-debug-orig-width");
    }
    if (origTop !== null) {
      htmlEl.style.top = origTop;
      el2.removeAttribute("data-sk-debug-orig-top");
    }
    if (origHeight !== null) {
      htmlEl.style.height = origHeight;
      el2.removeAttribute("data-sk-debug-orig-height");
    }
    el2.removeAttribute("data-sk-debug-pe-override");
  }
}
var _DEBUG_MODE_OPTIONS = [
  {},
  // placeholder for mode 0 (off)
  { showBoxes: true, showIds: true, showAnchors: true, showSafeZone: true, showCollisions: true, showRelationships: false },
  { showBoxes: true, showIds: true, showAnchors: true, showSafeZone: true, showCollisions: true, showRelationships: true },
  { showBoxes: false, showIds: false, showAnchors: false, showSafeZone: false, showCollisions: false, showRelationships: true }
];
function _handleDebugKeydown(event) {
  const target = event.target;
  const s = debugController.state;
  if (target === s.editInputElement) {
    if (event.ctrlKey && event.shiftKey && (event.key === "z" || event.key === "Z")) {
      event.preventDefault();
      event.stopPropagation();
      redo();
      return;
    }
    if (event.ctrlKey && (event.key === "z" || event.key === "Z")) {
      event.preventDefault();
      event.stopPropagation();
      undo();
      return;
    }
    return;
  }
  if (target) {
    const tagName = target.tagName;
    if (tagName === "INPUT" || tagName === "TEXTAREA" || target.isContentEditable) {
      return;
    }
  }
  if (event.ctrlKey && event.key === ".") {
    event.preventDefault();
    event.stopPropagation();
    toggleDebugOverlay(s.lastToggleOptions);
    return;
  }
  if (s.inspectorPanel) {
    if (event.ctrlKey && event.shiftKey && (event.key === "z" || event.key === "Z")) {
      event.preventDefault();
      event.stopPropagation();
      redo();
    } else if (event.ctrlKey && (event.key === "z" || event.key === "Z")) {
      event.preventDefault();
      event.stopPropagation();
      undo();
    }
  }
}
function enableKeyboardToggle(options = {}) {
  const s = debugController.state;
  s.lastToggleOptions = options;
  if (s.keyboardListenerAttached) return;
  document.addEventListener("keydown", _handleDebugKeydown, true);
  s.keyboardListenerAttached = true;
}
function renderDebugOverlay(options = {}) {
  const slideIndex = options.slideIndex ?? 0;
  removeDebugOverlay();
  const sk = typeof window !== "undefined" ? window.sk : null;
  if (!sk || !sk.layouts || !sk.layouts[slideIndex]) {
    console.warn("SlideKit debug overlay: no scene model found. Call render() first.");
    return null;
  }
  const layoutResult = sk.layouts[slideIndex];
  const sceneElements = layoutResult.elements || {};
  const collisions = layoutResult.collisions || [];
  const s_baseline = debugController.state;
  if (!s_baseline.baselineSceneGraphs[slideIndex]) {
    s_baseline.baselineSceneGraphs[slideIndex] = JSON.parse(JSON.stringify(sceneElements));
  }
  const slidekitLayers = document.querySelectorAll(".slidekit-layer");
  const targetLayer = slidekitLayers[slideIndex];
  if (!targetLayer) {
    console.warn("SlideKit debug overlay: no slidekit-layer found at index", slideIndex);
    return null;
  }
  const slideW = sk._config?.slide?.w ?? 1920;
  const slideH = sk._config?.slide?.h ?? 1080;
  const overlay = document.createElement("div");
  overlay.className = "slidekit-debug-overlay";
  overlay.setAttribute("data-sk-role", "debug-overlay");
  overlay.style.position = "absolute";
  overlay.style.left = "0";
  overlay.style.top = "0";
  overlay.style.width = `${slideW}px`;
  overlay.style.height = `${slideH}px`;
  overlay.style.pointerEvents = "none";
  overlay.style.zIndex = "9999";
  buildOverlayContent(overlay, sceneElements, collisions, sk, slideW, slideH, options);
  targetLayer.appendChild(overlay);
  debugController.state.debugOverlay = overlay;
  _enableConnectorPointerEvents(targetLayer);
  const showInspector = options.showInspector !== false;
  if (showInspector) {
    const s = debugController.state;
    s.currentSlideIndex = slideIndex;
    createInspectorPanel();
    attachClickHandler();
    attachDragHandlers();
    if (s.selectedElementId && sceneElements[s.selectedElementId]) {
      renderElementDetail(s.selectedElementId, slideIndex);
      updateSelectionHighlight(s.selectedElementId, slideIndex);
      renderResizeHandles(s.selectedElementId, slideIndex);
    }
  }
  return overlay;
}
function refreshOverlayOnly(slideIndex) {
  const s = debugController.state;
  if (s.debugOverlay && s.debugOverlay.parentNode) {
    s.debugOverlay.parentNode.removeChild(s.debugOverlay);
  }
  s.debugOverlay = null;
  const sk = typeof window !== "undefined" ? window.sk : null;
  if (!sk?.layouts?.[slideIndex]) return;
  const layoutResult = sk.layouts[slideIndex];
  const sceneElements = layoutResult.elements || {};
  const collisions = layoutResult.collisions || [];
  const slidekitLayers = document.querySelectorAll(".slidekit-layer");
  const targetLayer = slidekitLayers[slideIndex];
  if (!targetLayer) return;
  const slideW = sk._config?.slide?.w ?? 1920;
  const slideH = sk._config?.slide?.h ?? 1080;
  const overlay = document.createElement("div");
  overlay.className = "slidekit-debug-overlay";
  overlay.setAttribute("data-sk-role", "debug-overlay");
  overlay.style.position = "absolute";
  overlay.style.left = "0";
  overlay.style.top = "0";
  overlay.style.width = `${slideW}px`;
  overlay.style.height = `${slideH}px`;
  overlay.style.pointerEvents = "none";
  overlay.style.zIndex = "9999";
  buildOverlayContent(overlay, sceneElements, collisions, sk, slideW, slideH, s.lastToggleOptions);
  targetLayer.appendChild(overlay);
  s.debugOverlay = overlay;
  _enableConnectorPointerEvents(targetLayer);
  if (s.selectedElementId) {
    updateSelectionHighlight(s.selectedElementId, slideIndex);
  }
  if (s.selectedConstraint) {
    updateConstraintHighlight(s.selectedConstraint.elementId, s.selectedConstraint.axis, slideIndex);
  }
  refreshDragState(slideIndex);
}
function removeDebugOverlay() {
  const s = debugController.state;
  _detachSlideChangeListener();
  if (s.pickMode) exitPickMode();
  clearConstraintSelection();
  if (s.debugOverlay && s.debugOverlay.parentNode) {
    _restoreConnectorPointerEvents(s.debugOverlay.parentNode);
    s.debugOverlay.parentNode.removeChild(s.debugOverlay);
  }
  s.debugOverlay = null;
  removeInspectorPanel();
  detachClickHandler();
  detachDragHandlers();
}
function isDebugOverlayVisible() {
  const s = debugController.state;
  return s.debugOverlay !== null && s.debugOverlay.parentNode !== null;
}
function toggleDebugOverlay(options = {}) {
  const s = debugController.state;
  if (isDebugOverlayVisible()) {
    removeDebugOverlay();
    s.debugMode = 0;
    return false;
  } else {
    const slideIndex = options.slideIndex ?? _getCurrentSlideIndex();
    renderDebugOverlay({ ...s.lastToggleOptions, ...options, slideIndex });
    _attachSlideChangeListener();
    s.debugMode = 1;
    return true;
  }
}
var _layoutFn;
function _setLayoutFn(fn) {
  _layoutFn = fn;
}
var LAYER_ORDER2 = { bg: 0, content: 1, overlay: 2 };
function computeZOrder(elements) {
  const indexed = elements.map((el2, i) => ({ el: el2, idx: i }));
  indexed.sort((a, b) => {
    const layerKeyA = a.el.props.layer || "content";
    const layerKeyB = b.el.props.layer || "content";
    const layerA = LAYER_ORDER2[layerKeyA] ?? LAYER_ORDER2.content;
    const layerB = LAYER_ORDER2[layerKeyB] ?? LAYER_ORDER2.content;
    if (layerA !== layerB) return layerA - layerB;
    const zA = a.el.props.z ?? 0;
    const zB = b.el.props.z ?? 0;
    if (zA !== zB) return zA - zB;
    return a.idx - b.idx;
  });
  const zMap = /* @__PURE__ */ new Map();
  indexed.forEach((item, sortedIdx) => {
    zMap.set(item.el.id, sortedIdx + 1);
  });
  return zMap;
}
function applySlideBackground(section, background) {
  if (!background) return;
  const trimmed = background.trim();
  if (trimmed.startsWith("#") || /^(rgb|hsl)a?\(/.test(trimmed)) {
    section.setAttribute("data-background-color", trimmed);
  } else if (trimmed.startsWith("linear-gradient") || trimmed.startsWith("radial-gradient")) {
    section.setAttribute("data-background-gradient", trimmed);
  } else {
    section.setAttribute("data-background-image", trimmed);
  }
}
function buildConnectorSVG(from, to, connProps) {
  const thickness = connProps.thickness ?? 2;
  const markerSize = 8;
  const padding = Math.max(20, markerSize + thickness * 2);
  const connType = connProps.connectorType || "straight";
  let minX = Math.min(from.x, to.x) - padding;
  let minY = Math.min(from.y, to.y) - padding;
  let maxX = Math.max(from.x, to.x) + padding;
  let maxY = Math.max(from.y, to.y) + padding;
  let elbowWaypoints = null;
  if (connType === "elbow" || connType === "orthogonal") {
    if (connProps._cachedWaypoints) {
      elbowWaypoints = connProps._cachedWaypoints;
    } else {
      const cornerRadius = connProps.cornerRadius ?? 0;
      const stubLength = Math.max(40, markerSize * thickness + cornerRadius + 15);
      const route = routeConnector({ from, to, orthogonal: connType === "orthogonal", stubLength });
      elbowWaypoints = route.waypoints;
    }
    for (const wp of elbowWaypoints) {
      if (wp.x < minX) minX = wp.x;
      if (wp.y < minY) minY = wp.y;
      if (wp.x > maxX) maxX = wp.x;
      if (wp.y > maxY) maxY = wp.y;
    }
  }
  let cpOffset = 0;
  if (connType === "curved") {
    const dist = Math.sqrt((to.x - from.x) ** 2 + (to.y - from.y) ** 2);
    cpOffset = Math.min(200, Math.max(40, dist * 0.4));
    const cx1 = from.x + from.dx * cpOffset;
    const cy1 = from.y + from.dy * cpOffset;
    const cx2 = to.x + to.dx * cpOffset;
    const cy2 = to.y + to.dy * cpOffset;
    minX = Math.min(minX, cx1, cx2);
    minY = Math.min(minY, cy1, cy2);
    maxX = Math.max(maxX, cx1, cx2);
    maxY = Math.max(maxY, cy1, cy2);
  }
  const svgW = maxX - minX;
  const svgH = maxY - minY;
  const lx1 = from.x - minX;
  const ly1 = from.y - minY;
  const lx2 = to.x - minX;
  const ly2 = to.y - minY;
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("width", String(svgW));
  svg.setAttribute("height", String(svgH));
  svg.setAttribute("viewBox", `0 0 ${svgW} ${svgH}`);
  svg.style.overflow = "visible";
  const color = connProps.color || "#ffffff";
  const dash = connProps.dash;
  const arrow = connProps.arrow || "end";
  const arrowRefX = 5;
  const arrowTrim = (10 - arrowRefX) / 10 * markerSize * thickness;
  const defs = document.createElementNS(ns, "defs");
  const markerId = `sk-arrow-${connProps._markerId || "default"}`;
  if (arrow !== "none") {
    const marker = document.createElementNS(ns, "marker");
    marker.setAttribute("id", markerId);
    marker.setAttribute("viewBox", "0 0 10 10");
    marker.setAttribute("refX", String(arrowRefX));
    marker.setAttribute("refY", "5");
    marker.setAttribute("markerWidth", String(markerSize));
    marker.setAttribute("markerHeight", String(markerSize));
    marker.setAttribute("orient", "auto-start-reverse");
    const polygon = document.createElementNS(ns, "polygon");
    polygon.setAttribute("points", "0,0 10,5 0,10");
    polygon.setAttribute("fill", color);
    marker.appendChild(polygon);
    defs.appendChild(marker);
  }
  svg.appendChild(defs);
  const trimEnd = (pts, amount) => {
    if (pts.length < 2 || amount <= 0) return pts;
    const result = pts.map((p) => ({ ...p }));
    const last = result[result.length - 1];
    const prev = result[result.length - 2];
    const dx = last.x - prev.x;
    const dy = last.y - prev.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > amount * 2) {
      last.x -= dx / len * amount;
      last.y -= dy / len * amount;
    }
    return result;
  };
  const trimStart = (pts, amount) => {
    if (pts.length < 2 || amount <= 0) return pts;
    const result = pts.map((p) => ({ ...p }));
    const first = result[0];
    const next = result[1];
    const dx = next.x - first.x;
    const dy = next.y - first.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > amount * 2) {
      first.x += dx / len * amount;
      first.y += dy / len * amount;
    }
    return result;
  };
  const hasEndArrow = arrow === "end" || arrow === "both";
  const hasStartArrow = arrow === "start" || arrow === "both";
  let pathEl;
  if (connType === "straight") {
    let pts = [{ x: lx1, y: ly1 }, { x: lx2, y: ly2 }];
    if (hasEndArrow) pts = trimEnd(pts, arrowTrim);
    if (hasStartArrow) pts = trimStart(pts, arrowTrim);
    pathEl = document.createElementNS(ns, "line");
    pathEl.setAttribute("x1", String(pts[0].x));
    pathEl.setAttribute("y1", String(pts[0].y));
    pathEl.setAttribute("x2", String(pts[1].x));
    pathEl.setAttribute("y2", String(pts[1].y));
  } else {
    pathEl = document.createElementNS(ns, "path");
    let d;
    if (connType === "curved") {
      let startPt = { x: lx1, y: ly1 };
      let endPt = { x: lx2, y: ly2 };
      if (hasStartArrow) {
        const trimmed = trimStart([startPt, { x: lx1 + from.dx * cpOffset, y: ly1 + from.dy * cpOffset }], arrowTrim);
        startPt = trimmed[0];
      }
      if (hasEndArrow) {
        const trimmed = trimEnd([{ x: lx2 + to.dx * cpOffset, y: ly2 + to.dy * cpOffset }, endPt], arrowTrim);
        endPt = trimmed[trimmed.length - 1];
      }
      const cx1 = lx1 + from.dx * cpOffset;
      const cy1 = ly1 + from.dy * cpOffset;
      const cx2 = lx2 + to.dx * cpOffset;
      const cy2 = ly2 + to.dy * cpOffset;
      d = `M ${startPt.x} ${startPt.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${endPt.x} ${endPt.y}`;
    } else if (connType === "elbow" || connType === "orthogonal") {
      const waypoints = elbowWaypoints;
      let localWaypoints = waypoints.map((p) => ({
        x: p.x - minX,
        y: p.y - minY
      }));
      if (hasEndArrow) localWaypoints = trimEnd(localWaypoints, arrowTrim);
      if (hasStartArrow) localWaypoints = trimStart(localWaypoints, arrowTrim);
      if (localWaypoints.length >= 2) {
        const cornerRadius = connProps.cornerRadius ?? 0;
        if (cornerRadius > 0 && localWaypoints.length >= 3) {
          d = buildRoundedElbowPath(localWaypoints, cornerRadius);
        } else {
          d = `M ${localWaypoints[0].x} ${localWaypoints[0].y}`;
          for (let i = 1; i < localWaypoints.length; i++) {
            d += ` L ${localWaypoints[i].x} ${localWaypoints[i].y}`;
          }
        }
      } else {
        d = `M ${lx1} ${ly1} L ${lx2} ${ly2}`;
      }
    }
    pathEl.setAttribute("d", d);
    pathEl.setAttribute("fill", "none");
  }
  pathEl.setAttribute("stroke", color);
  pathEl.setAttribute("stroke-width", String(thickness));
  if (dash) {
    pathEl.setAttribute("stroke-dasharray", dash);
  }
  if (arrow === "end" || arrow === "both") {
    pathEl.setAttribute("marker-end", `url(#${markerId})`);
  }
  if (arrow === "start" || arrow === "both") {
    pathEl.setAttribute("marker-start", `url(#${markerId})`);
  }
  svg.appendChild(pathEl);
  if (connProps.label) {
    const labelStyle = connProps.labelStyle || {};
    const labelSize = labelStyle.size ?? labelStyle.fontSize ?? 14;
    const labelColor = labelStyle.color ?? "#999999";
    const labelFont = labelStyle.font || labelStyle.fontFamily || "Inter";
    const labelWeight = labelStyle.weight ?? labelStyle.fontWeight ?? 400;
    const labelPosition = connProps.labelPosition ?? 0.5;
    const labelOffsetX = connProps.labelOffset?.x ?? 0;
    const labelOffsetY = connProps.labelOffset?.y ?? -8;
    let midLX, midLY;
    let segAngle = 0;
    if ((connType === "elbow" || connType === "orthogonal") && elbowWaypoints && elbowWaypoints.length >= 2) {
      const localWaypoints = elbowWaypoints.map((p) => ({ x: p.x - minX, y: p.y - minY }));
      const pt = pointAlongPolyline(localWaypoints, labelPosition);
      midLX = pt.x;
      midLY = pt.y;
      const segInfo = segmentAtFraction(localWaypoints, labelPosition);
      if (segInfo) {
        const dx = segInfo.p2.x - segInfo.p1.x;
        const dy = segInfo.p2.y - segInfo.p1.y;
        if (Math.abs(dx) < 0.5 && Math.abs(dy) > 0.5) {
          segAngle = -90;
        }
      }
    } else {
      midLX = lx1 + (lx2 - lx1) * labelPosition;
      midLY = ly1 + (ly2 - ly1) * labelPosition;
      if (Math.abs(lx2 - lx1) < Math.abs(ly2 - ly1) * 0.3) {
        segAngle = -90;
      }
    }
    const approxCharWidth = (typeof labelSize === "number" ? labelSize : 14) * 0.6;
    const textWidth = connProps.label.length * approxCharWidth + 8;
    const textHeight = (typeof labelSize === "number" ? labelSize : 14) + 6;
    const bgRect = document.createElementNS(ns, "rect");
    const bgX = midLX + labelOffsetX - textWidth / 2;
    const bgY = midLY + labelOffsetY - textHeight + 2;
    bgRect.setAttribute("x", String(bgX));
    bgRect.setAttribute("y", String(bgY));
    bgRect.setAttribute("width", String(textWidth));
    bgRect.setAttribute("height", String(textHeight));
    bgRect.setAttribute("fill", connProps._bgColor || "#0a0a1a");
    bgRect.setAttribute("rx", "3");
    if (segAngle !== 0) {
      bgRect.setAttribute(
        "transform",
        `rotate(${segAngle} ${midLX + labelOffsetX} ${midLY + labelOffsetY})`
      );
    }
    svg.appendChild(bgRect);
    const textNode = document.createElementNS(ns, "text");
    textNode.setAttribute("x", String(midLX + labelOffsetX));
    textNode.setAttribute("y", String(midLY + labelOffsetY));
    textNode.setAttribute("text-anchor", "middle");
    textNode.setAttribute("font-family", `"${labelFont}", sans-serif`);
    textNode.setAttribute("font-size", String(labelSize));
    textNode.setAttribute("font-weight", String(labelWeight));
    textNode.setAttribute("fill", labelColor);
    if (segAngle !== 0) {
      textNode.setAttribute(
        "transform",
        `rotate(${segAngle} ${midLX + labelOffsetX} ${midLY + labelOffsetY})`
      );
    }
    textNode.textContent = connProps.label;
    svg.appendChild(textNode);
  }
  const wrapper = document.createElement("div");
  wrapper.style.position = "absolute";
  wrapper.style.left = `${minX}px`;
  wrapper.style.top = `${minY}px`;
  wrapper.style.width = `${svgW}px`;
  wrapper.style.height = `${svgH}px`;
  wrapper.style.pointerEvents = "none";
  wrapper.appendChild(svg);
  return wrapper;
}
function pointAlongPolyline(points, t) {
  if (points.length < 2) return points[0] || { x: 0, y: 0 };
  const segLengths = [];
  let totalLength = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const dx = points[i + 1].x - points[i].x;
    const dy = points[i + 1].y - points[i].y;
    const len = Math.sqrt(dx * dx + dy * dy);
    segLengths.push(len);
    totalLength += len;
  }
  if (totalLength === 0) return points[0];
  const targetLength = t * totalLength;
  let accumulated = 0;
  for (let i = 0; i < segLengths.length; i++) {
    if (accumulated + segLengths[i] >= targetLength) {
      const segFraction = segLengths[i] > 0 ? (targetLength - accumulated) / segLengths[i] : 0;
      return {
        x: points[i].x + (points[i + 1].x - points[i].x) * segFraction,
        y: points[i].y + (points[i + 1].y - points[i].y) * segFraction
      };
    }
    accumulated += segLengths[i];
  }
  return points[points.length - 1];
}
function segmentAtFraction(points, t) {
  if (points.length < 2) return null;
  const segLengths = [];
  let totalLength = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const dx = points[i + 1].x - points[i].x;
    const dy = points[i + 1].y - points[i].y;
    segLengths.push(Math.sqrt(dx * dx + dy * dy));
    totalLength += segLengths[i];
  }
  if (totalLength === 0) return null;
  const targetLength = t * totalLength;
  let accumulated = 0;
  for (let i = 0; i < segLengths.length; i++) {
    if (accumulated + segLengths[i] >= targetLength) {
      return { p1: points[i], p2: points[i + 1] };
    }
    accumulated += segLengths[i];
  }
  return { p1: points[points.length - 2], p2: points[points.length - 1] };
}
function buildRoundedElbowPath(points, radius) {
  if (points.length < 2) return "";
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];
    const len1 = Math.sqrt((curr.x - prev.x) ** 2 + (curr.y - prev.y) ** 2);
    const len2 = Math.sqrt((next.x - curr.x) ** 2 + (next.y - curr.y) ** 2);
    if (len1 < 0.5 || len2 < 0.5) {
      d += ` L ${curr.x} ${curr.y}`;
      continue;
    }
    const ux1 = (curr.x - prev.x) / len1;
    const uy1 = (curr.y - prev.y) / len1;
    const ux2 = (next.x - curr.x) / len2;
    const uy2 = (next.y - curr.y) / len2;
    const cross = ux1 * uy2 - uy1 * ux2;
    const dot = ux1 * ux2 + uy1 * uy2;
    const absCross = Math.abs(cross);
    if (absCross < 0.01) {
      d += ` L ${curr.x} ${curr.y}`;
      continue;
    }
    const tanHalf = absCross / (1 - dot);
    let trim = radius / tanHalf;
    const maxTrim = Math.min(len1 / 2, len2 / 2);
    if (trim > maxTrim) {
      trim = maxTrim;
    }
    const arcRadius = trim * tanHalf;
    if (trim < 1 || arcRadius < 1) {
      d += ` L ${curr.x} ${curr.y}`;
      continue;
    }
    const enterX = curr.x - ux1 * trim;
    const enterY = curr.y - uy1 * trim;
    const exitX = curr.x + ux2 * trim;
    const exitY = curr.y + uy2 * trim;
    const sweep = cross > 0 ? 1 : 0;
    d += ` L ${enterX} ${enterY}`;
    d += ` A ${arcRadius} ${arcRadius} 0 0 ${sweep} ${exitX} ${exitY}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}
function renderElementFromScene(element, zIndex, sceneElements, offsetX = 0, offsetY = 0) {
  const { type } = element;
  let { props } = element;
  const resolved = sceneElements[element.id]?.resolved;
  let left, top, w, h;
  if (resolved) {
    left = resolved.x - offsetX;
    top = resolved.y - offsetY;
    w = resolved.w;
    h = resolved.h;
  } else {
    w = props.w || 0;
    h = props.h || 0;
    const anchor = props.anchor || "tl";
    const anchorResult = resolveAnchor(props.x ?? 0, props.y ?? 0, w, h, anchor);
    left = anchorResult.left;
    top = anchorResult.top;
  }
  const { cssProps, warnings: cssWarnings } = detectMisplacedCssProps(props);
  if (Object.keys(cssProps).length > 0) {
    const promotedStyle = { ...cssProps, ...props.style || {} };
    props = { ...props, style: promotedStyle };
    for (const warn of cssWarnings) {
      console.warn(`[SlideKit] Element "${element.id}": ${warn.message}`);
    }
  }
  const { filtered: mergedStyle, warnings: styleWarnings } = filterStyle(props.style || {}, type);
  const allWarnings = [...cssWarnings, ...styleWarnings];
  if (allWarnings.length > 0) {
    for (const warn of styleWarnings) {
      console.warn(`[SlideKit] Element "${element.id}": style.${warn.property} is blocked. ${warn.suggestion}`);
    }
    const sceneEntry = sceneElements[element.id];
    if (sceneEntry) {
      sceneEntry.styleWarnings = allWarnings;
    }
  }
  const div = document.createElement("div");
  div.setAttribute("data-sk-id", element.id);
  div.style.position = "absolute";
  div.style.left = `${left}px`;
  div.style.top = `${top}px`;
  div.style.width = `${w}px`;
  div.style.height = `${h}px`;
  div.style.boxSizing = "border-box";
  div.style.zIndex = String(zIndex);
  if (props.opacity !== void 0 && props.opacity !== 1) {
    div.style.opacity = String(props.opacity);
  }
  {
    const transformParts = [];
    if (props.rotate !== void 0 && props.rotate !== 0) {
      transformParts.push(`rotate(${props.rotate}deg)`);
    }
    if (props.flipH) {
      transformParts.push("scaleX(-1)");
    }
    if (props.flipV) {
      transformParts.push("scaleY(-1)");
    }
    if (transformParts.length > 0) {
      div.style.transform = transformParts.join(" ");
    }
  }
  if (props.className) {
    div.className = props.className;
  }
  applyStyleToDOM(div, mergedStyle);
  const layoutFlags = sceneElements[element.id]?._layoutFlags;
  if (layoutFlags?.clip) {
    div.style.overflow = "hidden";
  }
  switch (type) {
    case "el": {
      div.setAttribute("data-sk-type", "el");
      const vAlign = props.vAlign;
      if (vAlign && vAlign !== "top" && props.h != null) {
        div.style.display = "flex";
        div.style.flexDirection = "column";
        div.style.justifyContent = vAlign === "center" ? "center" : vAlign === "bottom" ? "flex-end" : "flex-start";
      }
      div.innerHTML = element.content || "";
      break;
    }
    case "group": {
      const children = element.children || [];
      const childZMap = computeZOrder(children);
      for (const child of children) {
        const childZ = childZMap.get(child.id) || 0;
        const childEl = renderElementFromScene(child, childZ, sceneElements);
        div.appendChild(childEl);
      }
      break;
    }
    case "vstack":
    case "hstack": {
      div.style.overflow = "visible";
      const stackChildElems = element.children || [];
      const childZMap = computeZOrder(stackChildElems);
      for (const child of stackChildElems) {
        const childResolved = sceneElements[child.id]?.resolved;
        if (childResolved) {
          const childZ = childZMap.get(child.id) || 0;
          const childEl = renderElementFromScene(
            child,
            childZ,
            sceneElements,
            left + offsetX,
            top + offsetY
          );
          div.appendChild(childEl);
        }
      }
      break;
    }
    case "connector": {
      const connectorData = sceneElements[element.id]?._connectorResolved;
      if (connectorData) {
        const svgWrapper = buildConnectorSVG(
          connectorData.from,
          connectorData.to,
          {
            ...props,
            _markerId: element.id,
            _cachedWaypoints: connectorData.waypoints
          }
        );
        svgWrapper.setAttribute("data-sk-id", element.id);
        svgWrapper.style.zIndex = String(zIndex);
        if (props.opacity !== void 0 && props.opacity !== 1) {
          svgWrapper.style.opacity = String(props.opacity);
        }
        return svgWrapper;
      }
      break;
    }
    default:
      break;
  }
  return div;
}
async function render(slides, options = {}) {
  resetIdCounter();
  const container = options.container || document.querySelector(".reveal .slides");
  if (!container) {
    throw new Error(
      "render() requires a container element. Provide options.container or ensure a .reveal .slides element exists in the DOM."
    );
  }
  const sections = [];
  const layouts = [];
  if (!container.querySelector("style[data-sk-baseline]")) {
    const baselineStyle = document.createElement("style");
    baselineStyle.setAttribute("data-sk-baseline", "");
    baselineStyle.textContent = _baselineCSS('[data-sk-type="el"]');
    container.appendChild(baselineStyle);
  }
  const cfg = getConfig();
  const slideW = cfg?.slide?.w ?? 1920;
  const slideH = cfg?.slide?.h ?? 1080;
  for (const slide of slides) {
    const layoutResult = await _layoutFn(slide);
    layouts.push(layoutResult);
    const section = document.createElement("section");
    if (slide.id) {
      section.id = slide.id;
    }
    if (slide.background) {
      applySlideBackground(section, slide.background);
    }
    const layer = document.createElement("div");
    layer.className = "slidekit-layer";
    layer.style.position = "relative";
    layer.style.width = `${slideW}px`;
    layer.style.height = `${slideH}px`;
    const elements = slide.elements || [];
    const zMap = computeZOrder(elements);
    for (const element of elements) {
      const zIndex = zMap.get(element.id) || 0;
      const domEl = renderElementFromScene(element, zIndex, layoutResult.elements);
      layer.appendChild(domEl);
    }
    section.appendChild(layer);
    if (slide.notes) {
      const aside = document.createElement("aside");
      aside.className = "notes";
      aside.textContent = slide.notes;
      section.appendChild(aside);
    }
    container.appendChild(section);
    sections.push(section);
  }
  for (let i = 0; i < layouts.length; i++) {
    const layoutResult = layouts[i];
    const sceneElements = layoutResult.elements;
    const section = sections[i];
    for (const [id, entry] of Object.entries(sceneElements)) {
      if (entry.type !== "el") continue;
      const dom = section.querySelector(`[data-sk-id="${id}"]`);
      if (!dom) continue;
      if (dom.scrollHeight > dom.clientHeight + 1) {
        layoutResult.warnings.push({
          type: "dom_overflow_y",
          elementId: id,
          clientHeight: dom.clientHeight,
          scrollHeight: dom.scrollHeight,
          overflow: dom.scrollHeight - dom.clientHeight
        });
      }
      if (dom.scrollWidth > dom.clientWidth + 1) {
        layoutResult.warnings.push({
          type: "dom_overflow_x",
          elementId: id,
          clientWidth: dom.clientWidth,
          scrollWidth: dom.scrollWidth,
          overflow: dom.scrollWidth - dom.clientWidth
        });
      }
    }
  }
  if (typeof window !== "undefined") {
    const skObj = {
      layouts,
      slides: slides.map((s, i) => ({
        id: s.id || `slide-${i}`,
        layout: layouts[i]
      })),
      // M8.1: Expose config for debug overlay to read safe zone info
      _config: state.config ? JSON.parse(JSON.stringify(state.config)) : null,
      // Persist original definitions for inspector editing (live references, not cloned)
      _definitions: slides,
      // Expose rerenderSlide for debug bundle (separate bundle can't access _layoutFn)
      _rerenderSlide: rerenderSlide
    };
    skObj.lint = (slideId) => {
      const slideIdx = skObj.slides.findIndex((s) => s.id === slideId);
      if (slideIdx === -1) throw new Error(`Slide not found: ${slideId}`);
      const slide = skObj.slides[slideIdx];
      const slideEl = document.querySelectorAll(".reveal .slides > section")[slideIdx] || null;
      return lintSlide(slide, slideEl);
    };
    skObj.lintDeck = () => {
      const sectionEls = document.querySelectorAll(".reveal .slides > section");
      return lintDeck(skObj, sectionEls);
    };
    window.sk = skObj;
    enableKeyboardToggle();
  }
  return { sections, layouts };
}
async function rerenderSlide(slideIndex, slideDefinition) {
  if (!_layoutFn) throw new Error("Layout function not injected");
  const layoutResult = await _layoutFn(slideDefinition);
  const allLayers = document.querySelectorAll(".slidekit-layer");
  const oldLayer = allLayers[slideIndex];
  if (!oldLayer?.parentElement) throw new Error(`Slide ${slideIndex} not found`);
  const slideW = state.config?.slide?.w ?? 1920;
  const slideH = state.config?.slide?.h ?? 1080;
  const layer = document.createElement("div");
  layer.className = "slidekit-layer";
  layer.style.position = "relative";
  layer.style.width = `${slideW}px`;
  layer.style.height = `${slideH}px`;
  const zMap = computeZOrder(slideDefinition.elements);
  for (const element of slideDefinition.elements) {
    const zIndex = zMap.get(element.id) || 0;
    layer.appendChild(renderElementFromScene(element, zIndex, layoutResult.elements));
  }
  oldLayer.replaceWith(layer);
  const sk = window.sk;
  if (sk) {
    sk.layouts[slideIndex] = layoutResult;
    if (sk.slides?.[slideIndex]) sk.slides[slideIndex].layout = layoutResult;
  }
  return layoutResult;
}
function connect(fromId, toId, props = {}) {
  const { id: customId, ...rest } = props;
  const id = customId || nextId();
  const resolved = {
    connectorType: rest.type || "straight",
    arrow: rest.arrow ?? "end",
    color: rest.color || "#ffffff",
    thickness: rest.thickness ?? 2,
    dash: rest.dash || null,
    fromAnchor: rest.fromAnchor || "cr",
    toAnchor: rest.toAnchor || "cl",
    fromPortOffset: rest.fromPortOffset,
    toPortOffset: rest.toPortOffset,
    fromPortOrder: rest.fromPortOrder,
    toPortOrder: rest.toPortOrder,
    label: rest.label || null,
    labelStyle: rest.labelStyle || {},
    labelPosition: rest.labelPosition,
    labelOffset: rest.labelOffset,
    cornerRadius: rest.cornerRadius,
    obstacleMargin: rest.obstacleMargin,
    fromId,
    toId,
    // Common props
    x: 0,
    y: 0,
    layer: rest.layer || "content",
    opacity: rest.opacity ?? 1,
    style: rest.style || {},
    className: rest.className || "",
    anchor: "tl"
  };
  return { id, type: "connector", props: resolved, _layoutFlags: {} };
}
function getAnchorPoint(bounds, anchor) {
  const row = anchor[0];
  const col = anchor[1];
  let px, py;
  let dx = 0, dy = 0;
  if (col === "l") {
    px = bounds.x;
    dx = -1;
  } else if (col === "c") {
    px = bounds.x + bounds.w / 2;
  } else {
    px = bounds.x + bounds.w;
    dx = 1;
  }
  if (row === "t") {
    py = bounds.y;
    dy = -1;
  } else if (row === "c") {
    py = bounds.y + bounds.h / 2;
  } else {
    py = bounds.y + bounds.h;
    dy = 1;
  }
  if (dx !== 0 && dy !== 0) {
    const len = Math.sqrt(dx * dx + dy * dy);
    dx /= len;
    dy /= len;
  }
  return { x: px, y: py, dx, dy };
}
function panel(children, props = {}) {
  const { id: customId, ...rest } = props;
  const id = customId || nextId();
  const padding = resolveSpacing(rest.padding ?? 24);
  const gap = resolveSpacing(rest.gap ?? 16);
  const panelW = typeof rest.w === "number" ? rest.w : void 0;
  const panelH = typeof rest.h === "number" ? rest.h : void 0;
  const contentW = panelW != null ? Math.max(0, panelW - 2 * padding) : void 0;
  const resolvedChildren = children.map((child) => {
    if (child.props && child.props.w === "fill" && contentW !== void 0) {
      return { ...child, props: { ...child.props, w: contentW } };
    }
    return child;
  });
  const vstackProps = {
    x: padding,
    y: padding,
    w: contentW,
    gap
  };
  if (rest.align !== void 0) vstackProps.align = rest.align;
  if (rest.vAlign !== void 0) vstackProps.vAlign = rest.vAlign;
  if (panelH != null) vstackProps.h = Math.max(0, panelH - 2 * padding);
  const childStack = vstack(resolvedChildren, vstackProps);
  const bgStyle = { ...rest.style || {} };
  if (rest.fill) bgStyle.background = rest.fill;
  if (rest.radius !== void 0) bgStyle.borderRadius = typeof rest.radius === "number" ? `${rest.radius}px` : rest.radius;
  if (rest.border !== void 0) bgStyle.border = rest.border;
  const bgRect = el("", {
    x: 0,
    y: 0,
    w: panelW || 0,
    style: bgStyle,
    className: rest.className || ""
  });
  const groupProps = {
    id,
    x: rest.x ?? 0,
    y: rest.y ?? 0,
    layer: rest.layer || "content",
    opacity: rest.opacity ?? 1,
    anchor: rest.anchor || "tl"
  };
  if (typeof rest.w === "string") groupProps.w = rest.w;
  else if (panelW != null) groupProps.w = panelW;
  if (panelH != null) groupProps.h = panelH;
  const panelConfig = { padding, gap, panelW, panelH };
  const groupBase = group([bgRect, childStack], groupProps);
  const result = {
    ...groupBase,
    _compound: "panel",
    _panelConfig: panelConfig
  };
  return result;
}
function figure(opts = {}) {
  const {
    id: customId,
    src = "",
    x = 0,
    y = 0,
    w = 0,
    h = 0,
    anchor = "tl",
    layer = "content",
    containerFill = "transparent",
    containerRadius = 0,
    containerPadding = 0,
    caption: caption2,
    captionGap = 0,
    fit = "contain",
    style = {}
  } = opts;
  const padPx = resolveSpacing(containerPadding);
  const gapPx = resolveSpacing(captionGap);
  const figId = customId || nextId();
  const radiusVal = typeof containerRadius === "number" ? `${containerRadius}px` : containerRadius;
  const bgRect = el("", {
    id: `${figId}-bg`,
    x: 0,
    y: 0,
    w,
    h,
    style: { background: containerFill, borderRadius: radiusVal }
  });
  const innerW = Math.max(0, w - 2 * padPx);
  const innerH = Math.max(0, h - 2 * padPx);
  const img = el(`<img src="${src}" style="object-fit: ${fit}; width: 100%; height: 100%; display: block;">`, {
    id: `${figId}-img`,
    x: padPx,
    y: padPx,
    w: innerW,
    h: innerH
  });
  const children = [bgRect, img];
  if (caption2) {
    const cap = el(caption2, {
      id: `${figId}-caption`,
      x: 0,
      y: h + gapPx,
      w
    });
    children.push(cap);
  }
  const figureConfig = {
    src,
    containerFill,
    containerRadius,
    containerPadding: padPx,
    captionGap: gapPx,
    fit
  };
  const groupH = caption2 ? void 0 : h;
  const groupBase = group(children, {
    id: figId,
    x,
    y,
    w,
    h: groupH,
    anchor,
    layer,
    style,
    bounds: caption2 ? "hug" : void 0
  });
  const result = {
    ...groupBase,
    _compound: "figure",
    _figureConfig: figureConfig
  };
  return result;
}
function deepClone2(obj) {
  if (typeof structuredClone === "function") {
    return structuredClone(obj);
  }
  return JSON.parse(JSON.stringify(obj));
}
function grid(config = {}) {
  const cols = config.cols || 12;
  const gutter = config.gutter ?? 30;
  let marginLeft;
  let marginRight;
  if (config.margin) {
    marginLeft = config.margin.left ?? 120;
    marginRight = config.margin.right ?? 120;
  } else if (state.safeRectCache) {
    marginLeft = state.safeRectCache.x;
    marginRight = (state.config?.slide?.w ?? 1920) - (state.safeRectCache.x + state.safeRectCache.w);
  } else {
    marginLeft = 120;
    marginRight = 120;
  }
  const totalWidth = (state.config?.slide?.w ?? 1920) - marginLeft - marginRight;
  const totalGutters = (cols - 1) * gutter;
  const colWidth = (totalWidth - totalGutters) / cols;
  if (colWidth <= 0) {
    throw new Error(
      `grid(): computed column width is ${colWidth.toFixed(1)}px (non-positive). Check cols (${cols}), gutter (${gutter}), and margins (${marginLeft}+${marginRight}).`
    );
  }
  return {
    cols,
    gutter,
    colWidth,
    marginLeft,
    marginRight,
    totalWidth,
    /**
     * Get the x position of column n's left edge (1-indexed).
     *
     * @param n - Column number (1-based)
     * @returns X position in pixels
     */
    col(n) {
      if (n < 1 || n > cols) {
        throw new Error(`grid.col(${n}): column must be between 1 and ${cols}`);
      }
      return marginLeft + (n - 1) * (colWidth + gutter);
    },
    /**
     * Get the width spanning columns from..to (inclusive, 1-indexed).
     * Includes gutters between the columns.
     *
     * @param from - Start column (1-based, inclusive)
     * @param to - End column (1-based, inclusive)
     * @returns Width in pixels
     */
    spanW(from, to) {
      if (from < 1 || to > cols || from > to) {
        throw new Error(`grid.spanW(${from}, ${to}): invalid range for ${cols}-column grid`);
      }
      const numCols = to - from + 1;
      return numCols * colWidth + (numCols - 1) * gutter;
    }
  };
}
function resolvePercentage(value, axis) {
  if (typeof value !== "string") return value;
  const slideW = state.config?.slide?.w ?? 1920;
  const slideH = state.config?.slide?.h ?? 1080;
  const sr = state.safeRectCache || { x: 120, y: 90, w: 1680, h: 900 };
  const safeMatch = value.match(/^safe:\s*([0-9.]+)%$/);
  if (safeMatch) {
    const pct = parseFloat(safeMatch[1]) / 100;
    if (Number.isNaN(pct)) return value;
    if (axis === "x") return sr.x + pct * sr.w;
    if (axis === "y") return sr.y + pct * sr.h;
    if (axis === "w") return pct * sr.w;
    if (axis === "h") return pct * sr.h;
    return value;
  }
  const pctMatch = value.match(/^([0-9.]+)%$/);
  if (pctMatch) {
    const pct = parseFloat(pctMatch[1]) / 100;
    if (Number.isNaN(pct)) return value;
    if (axis === "x" || axis === "w") return pct * slideW;
    if (axis === "y" || axis === "h") return pct * slideH;
    return value;
  }
  return value;
}
function _reIdChildren(el2, suffix) {
  if (!("children" in el2) || !el2.children) return;
  for (const child of el2.children) {
    if (child.id) {
      child.id = `${child.id}${suffix}`;
    }
    _reIdChildren(child, suffix);
  }
}
function repeat(element, config = {}) {
  const count = config.count || 1;
  const cols = config.cols ?? count;
  const gapX = resolveSpacing(config.gapX ?? 0);
  const gapY = resolveSpacing(config.gapY ?? 0);
  const startX = config.startX ?? 0;
  const startY = config.startY ?? 0;
  const baseId = element.id || "repeat";
  const elemW = element.props?.w || 0;
  const elemH = element.props?.h || 0;
  const children = [];
  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = startX + col * (elemW + gapX);
    const y = startY + row * (elemH + gapY);
    const copy = deepClone2(element);
    const suffix = `-${i + 1}`;
    copy.id = `${baseId}${suffix}`;
    _reIdChildren(copy, suffix);
    copy.props.x = x;
    copy.props.y = y;
    children.push(copy);
  }
  const rows = Math.ceil(count / cols);
  const groupW = cols * elemW + (cols - 1) * gapX;
  const groupH = rows * elemH + (rows - 1) * gapY;
  return group(children, {
    x: 0,
    y: 0,
    w: groupW,
    h: groupH
  });
}
function rotatedAABB(w, h, degrees) {
  const rad = degrees * Math.PI / 180;
  const cosA = Math.abs(Math.cos(rad));
  const sinA = Math.abs(Math.sin(rad));
  return {
    w: w * cosA + h * sinA,
    h: w * sinA + h * cosA
  };
}
init_helpers();
async function checkOverflowPolicies(sortedOrder, flatMap, authoredSpecs, resolvedBounds, warnings, errors) {
  for (const id of sortedOrder) {
    const el2 = mustGet(flatMap, id, `flatMap missing element in overflow check: ${id}`);
    if (el2.type !== "el") continue;
    const authoredH = mustGet(authoredSpecs, id, `authoredSpecs missing element in overflow check: ${id}`).props.h;
    if (authoredH === void 0 || authoredH === null) continue;
    const bounds = mustGet(resolvedBounds, id, `resolvedBounds missing element in overflow check: ${id}`);
    const overflow = el2.props.overflow || "visible";
    if (overflow === "visible") continue;
    const html = el2.content || "";
    if (!html) continue;
    const metrics = await measure(html, { ...el2.props, w: bounds.w });
    const overflows = metrics.h > bounds.h;
    if (!overflows) continue;
    switch (overflow) {
      case "warn":
        warnings.push({
          type: "content_overflow",
          elementId: id,
          overflow: "warn",
          contentHeight: metrics.h,
          boxHeight: bounds.h,
          message: `Content in "${id}" overflows its box (content: ${metrics.h}px, box: ${bounds.h}px)`
        });
        break;
      case "clip":
        el2._layoutFlags.clip = true;
        break;
      case "error":
        errors.push({
          type: "content_overflow",
          elementId: id,
          overflow: "error",
          contentHeight: metrics.h,
          boxHeight: bounds.h,
          message: `Content in "${id}" overflows its box (content: ${metrics.h}px, box: ${bounds.h}px)`
        });
        break;
    }
  }
}
init_helpers();
function isPanelElement(el2) {
  return el2.type === "group" && "_compound" in el2 && el2._compound === "panel";
}
async function getEffectiveWidth(element) {
  const { props, type } = element;
  const wRel = isRelMarker(props.w) ? props.w._rel : null;
  const hRel = isRelMarker(props.h) ? props.h._rel : null;
  const wIsDeferred = wRel === "matchWidth";
  const wIsMatchMax = wRel === "matchMaxWidth";
  const hIsDeferred = hRel === "matchHeight";
  const hIsMatchMax = hRel === "matchMaxHeight";
  const needsAutoHeight = (props.h === void 0 || props.h === null || hIsMatchMax) && !hIsDeferred;
  if (wIsDeferred) {
    return { w: 0, wMeasured: false, hMeasured: needsAutoHeight };
  }
  if (wIsMatchMax) {
    if (type === "el") {
      const html = element.content || "";
      if (!html && (!props.style || Object.keys(props.style).length === 0)) {
        return { w: 0, wMeasured: true, hMeasured: needsAutoHeight };
      }
      const metrics = await measure(html, {
        style: props.style,
        className: props.className,
        shrinkWrap: true
      });
      return { w: metrics.w, wMeasured: true, hMeasured: needsAutoHeight };
    }
    return { w: 0, wMeasured: true, hMeasured: needsAutoHeight };
  }
  if (typeof props.w === "number") {
    return { w: props.w, wMeasured: false, hMeasured: needsAutoHeight };
  }
  if (props.w === "fill") {
    return { w: 0, wMeasured: false, hMeasured: needsAutoHeight };
  }
  if (type === "el") {
    const html = element.content || "";
    if (!html && (!props.style || Object.keys(props.style).length === 0)) {
      return { w: 0, wMeasured: true, hMeasured: needsAutoHeight };
    }
    const metrics = await measure(html, {
      style: props.style,
      className: props.className,
      shrinkWrap: true
    });
    return { w: metrics.w, wMeasured: true, hMeasured: needsAutoHeight };
  }
  return { w: props.w || 0, wMeasured: false, hMeasured: needsAutoHeight };
}
async function resolveIntrinsicSizes(flatMap, stackChildren, groupChildren, errors, _warnings) {
  const authoredSpecs = /* @__PURE__ */ new Map();
  for (const [id, el2] of flatMap) {
    const spec = {
      type: el2.type,
      props: deepClone(el2.props)
    };
    if (el2.type === "el") {
      spec.content = el2.content;
    }
    if ("children" in el2 && el2.children) {
      spec.children = el2.children.map((c) => c.id);
    }
    authoredSpecs.set(id, spec);
  }
  for (const [_id, el2] of flatMap) {
    if (typeof el2.props.x === "string" && !isRelMarker(el2.props.x)) {
      el2.props.x = resolvePercentage(el2.props.x, "x");
    }
    if (typeof el2.props.y === "string" && !isRelMarker(el2.props.y)) {
      el2.props.y = resolvePercentage(el2.props.y, "y");
    }
    if (typeof el2.props.w === "string" && el2.props.w !== "fill") {
      el2.props.w = resolvePercentage(el2.props.w, "w");
    }
    if (typeof el2.props.h === "string" && el2.props.h !== "fill") {
      el2.props.h = resolvePercentage(el2.props.h, "h");
    }
  }
  const VALID_W_RELS = /* @__PURE__ */ new Set(["matchWidth", "matchMaxWidth"]);
  const VALID_H_RELS = /* @__PURE__ */ new Set(["matchHeight", "matchMaxHeight"]);
  for (const [id, el2] of flatMap) {
    if (isRelMarker(el2.props.w) && !VALID_W_RELS.has(el2.props.w._rel)) {
      errors.push({
        type: "invalid_rel_on_dimension",
        elementId: id,
        property: "w",
        message: `Element "${id}": _rel marker on "w" is invalid. Only matchWidthOf() or matchMaxWidth() are valid on w.`
      });
    }
    if (isRelMarker(el2.props.h) && !VALID_H_RELS.has(el2.props.h._rel)) {
      errors.push({
        type: "invalid_rel_on_dimension",
        elementId: id,
        property: "h",
        message: `Element "${id}": _rel marker on "h" is invalid. Only matchHeightOf() or matchMaxHeight() are valid on h.`
      });
    }
  }
  const resolvedSizes = /* @__PURE__ */ new Map();
  if (errors.length > 0) {
    return { authoredSpecs, resolvedSizes, hasErrors: true };
  }
  for (const [id, el2] of flatMap) {
    if (el2.type === "vstack" || el2.type === "hstack") continue;
    const widthInfo = await getEffectiveWidth(el2);
    resolvedSizes.set(id, {
      w: widthInfo.w,
      h: 0,
      // placeholder — resolved in Step D
      wMeasured: widthInfo.wMeasured,
      hMeasured: widthInfo.hMeasured
    });
  }
  const pendingStacks = /* @__PURE__ */ new Set();
  for (const [id, el2] of flatMap) {
    if (el2.type === "vstack" || el2.type === "hstack") {
      pendingStacks.add(id);
    }
  }
  for (const stackId of pendingStacks) {
    const stackEl = mustGet(flatMap, stackId, `flatMap missing stack: ${stackId}`);
    if (stackEl.type !== "vstack") continue;
    const stackW = stackEl.props.w ?? 0;
    if (typeof stackW !== "number" || stackW <= 0) continue;
    const childIds = stackChildren.get(stackId) || [];
    for (const cid of childIds) {
      const child = mustGet(flatMap, cid, `flatMap missing vstack child: ${cid}`);
      if (child.props.w === "fill") {
        const childSize = resolvedSizes.get(cid);
        if (childSize) {
          childSize.w = stackW;
          if (isPanelElement(child)) {
            const config = child._panelConfig;
            if (config) {
              const innerContentW = Math.max(0, stackW - 2 * config.padding);
              const panelChildren = child.children || [];
              const bgRect = panelChildren[0];
              const innerStack = panelChildren[1];
              if (bgRect && resolvedSizes.has(bgRect.id)) {
                resolvedSizes.get(bgRect.id).w = stackW;
              }
              if (innerStack) {
                if (resolvedSizes.has(innerStack.id)) {
                  resolvedSizes.get(innerStack.id).w = innerContentW;
                } else {
                  resolvedSizes.set(innerStack.id, { w: innerContentW, h: 0, wMeasured: false, hMeasured: true });
                }
                innerStack.props.w = innerContentW;
                const innerChildIds = stackChildren.get(innerStack.id) || [];
                for (const icid of innerChildIds) {
                  const ic = flatMap.get(icid);
                  if (ic && ic.props.w === "fill") {
                    const ics = resolvedSizes.get(icid);
                    if (ics) ics.w = innerContentW;
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  let progress = true;
  while (pendingStacks.size > 0 && progress) {
    progress = false;
    for (const stackId of pendingStacks) {
      const el2 = mustGet(flatMap, stackId, `flatMap missing stack: ${stackId}`);
      const childIds = stackChildren.get(stackId) || [];
      const stackW = el2.props.w ?? 0;
      let allChildrenSized = true;
      for (const cid of childIds) {
        if (!resolvedSizes.has(cid)) {
          allChildrenSized = false;
          break;
        }
        const childEl = mustGet(flatMap, cid, `flatMap missing stack child: ${cid}`);
        if (isPanelElement(childEl)) {
          const config = childEl._panelConfig;
          if (!config) continue;
          const panelChildren = childEl.children || [];
          const childStack = panelChildren[1];
          if (childStack && !resolvedSizes.has(childStack.id)) {
            allChildrenSized = false;
            break;
          }
          if (childStack && resolvedSizes.has(childStack.id)) {
            const panelSizes = mustGet(resolvedSizes, cid, `resolvedSizes missing panel: ${cid}`);
            if (config.panelW != null) panelSizes.w = config.panelW;
          }
        }
      }
      if (!allChildrenSized) continue;
      if (el2.type === "vstack") {
        for (const cid of childIds) {
          const child = mustGet(flatMap, cid, `flatMap missing vstack child: ${cid}`);
          if ((child.props.w === void 0 || child.props.w === null || child.props.w === "fill") && stackW > 0) {
            const childSize = mustGet(resolvedSizes, cid, `resolvedSizes missing vstack child: ${cid}`);
            childSize.w = stackW;
            if (isPanelElement(child) && child.props.w === "fill") {
              const config = child._panelConfig;
              if (config) {
                const innerContentW = Math.max(0, stackW - 2 * config.padding);
                const panelChildren = child.children || [];
                const bgRect = panelChildren[0];
                const innerStack = panelChildren[1];
                if (bgRect && resolvedSizes.has(bgRect.id)) {
                  resolvedSizes.get(bgRect.id).w = stackW;
                }
                if (innerStack && resolvedSizes.has(innerStack.id)) {
                  resolvedSizes.get(innerStack.id).w = innerContentW;
                  const innerChildIds = stackChildren.get(innerStack.id) || [];
                  for (const icid of innerChildIds) {
                    const ic = flatMap.get(icid);
                    if (ic && (ic.props.w === void 0 || ic.props.w === null || ic.props.w === "fill")) {
                      const ics = resolvedSizes.get(icid);
                      if (ics) ics.w = innerContentW;
                      if (isPanelElement(ic) && ic.props.w === "fill") {
                        const nestedConfig = ic._panelConfig;
                        if (nestedConfig) {
                          const nestedContentW = Math.max(0, innerContentW - 2 * nestedConfig.padding);
                          const nestedChildren = ic.children || [];
                          if (nestedChildren[0] && resolvedSizes.has(nestedChildren[0].id)) {
                            resolvedSizes.get(nestedChildren[0].id).w = innerContentW;
                          }
                          if (nestedChildren[1] && resolvedSizes.has(nestedChildren[1].id)) {
                            resolvedSizes.get(nestedChildren[1].id).w = nestedContentW;
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        let maxW = 0;
        for (const cid of childIds) {
          const cs = mustGet(resolvedSizes, cid, `resolvedSizes missing vstack child: ${cid}`);
          maxW = Math.max(maxW, cs.w);
        }
        const finalW = stackW || maxW;
        resolvedSizes.set(stackId, {
          w: finalW,
          h: 0,
          // placeholder — resolved in Step D
          wMeasured: false,
          hMeasured: el2.props.h === void 0 || el2.props.h === null
        });
      } else {
        const gap = resolveSpacing(el2.props.gap ?? 0);
        let totalW = 0;
        for (let i = 0; i < childIds.length; i++) {
          const cs = mustGet(resolvedSizes, childIds[i], `resolvedSizes missing hstack child: ${childIds[i]}`);
          totalW += cs.w;
          if (i > 0) totalW += gap;
        }
        const finalW = el2.props.w !== void 0 && el2.props.w !== null ? el2.props.w : totalW;
        resolvedSizes.set(stackId, {
          w: finalW,
          h: 0,
          // placeholder — resolved in Step D
          wMeasured: el2.props.w === void 0 || el2.props.w === null,
          hMeasured: el2.props.h === void 0 || el2.props.h === null
        });
      }
      pendingStacks.delete(stackId);
      progress = true;
    }
  }
  if (pendingStacks.size > 0) {
    errors.push({
      type: "unresolvable_stack_sizes",
      elementIds: Array.from(pendingStacks),
      message: `Could not resolve sizes for stacks: ${Array.from(pendingStacks).join(", ")}`
    });
    return { authoredSpecs, resolvedSizes, hasErrors: true };
  }
  const maxWidthGroups = /* @__PURE__ */ new Map();
  for (const [id, el2] of flatMap) {
    if (isRelMarker(el2.props.w) && el2.props.w._rel === "matchMaxWidth") {
      const group2 = el2.props.w.group;
      if (!maxWidthGroups.has(group2)) maxWidthGroups.set(group2, []);
      maxWidthGroups.get(group2).push(id);
    }
  }
  for (const [, ids] of maxWidthGroups) {
    let maxW = 0;
    for (const id of ids) {
      const s = resolvedSizes.get(id);
      if (s && s.w > maxW) maxW = s.w;
    }
    for (const id of ids) {
      const s = resolvedSizes.get(id);
      if (s) s.w = maxW;
    }
  }
  const matchWidthElements = /* @__PURE__ */ new Map();
  for (const [id, el2] of flatMap) {
    if (isRelMarker(el2.props.w) && el2.props.w._rel === "matchWidth") {
      const refId = el2.props.w.ref;
      if (!flatMap.has(refId)) {
        errors.push({
          type: "unknown_ref",
          elementId: id,
          property: "w",
          ref: refId,
          message: `Element "${id}": w references unknown element "${refId}"`
        });
        continue;
      }
      matchWidthElements.set(id, refId);
    }
  }
  if (errors.length > 0) {
    return { authoredSpecs, resolvedSizes, hasErrors: true };
  }
  if (matchWidthElements.size > 0) {
    let visitWidth2 = function(id) {
      if (visited.has(id)) return true;
      if (visiting.has(id)) {
        errors.push({
          type: "circular_dependency",
          elementId: id,
          property: "w",
          message: `Element "${id}": circular matchWidthOf dependency detected`
        });
        return false;
      }
      visiting.add(id);
      for (const dep of widthDeps.get(id) || []) {
        if (!visitWidth2(dep)) return false;
      }
      visiting.delete(id);
      visited.add(id);
      widthOrder.push(id);
      return true;
    };
    var visitWidth = visitWidth2;
    const widthDeps = /* @__PURE__ */ new Map();
    const allWidthIds = /* @__PURE__ */ new Set();
    for (const [id, refId] of matchWidthElements) {
      allWidthIds.add(id);
      allWidthIds.add(refId);
      if (!widthDeps.has(id)) widthDeps.set(id, /* @__PURE__ */ new Set());
      widthDeps.get(id).add(refId);
    }
    for (const id of allWidthIds) {
      if (!widthDeps.has(id)) widthDeps.set(id, /* @__PURE__ */ new Set());
    }
    const widthOrder = [];
    const visited = /* @__PURE__ */ new Set();
    const visiting = /* @__PURE__ */ new Set();
    for (const id of allWidthIds) {
      visitWidth2(id);
    }
    for (const id of widthOrder) {
      const refId = matchWidthElements.get(id);
      if (!refId) continue;
      const refSizes = resolvedSizes.get(refId);
      const sizes = resolvedSizes.get(id);
      if (refSizes && sizes) {
        sizes.w = refSizes.w;
      }
    }
  }
  for (const [id, el2] of flatMap) {
    if (el2.type === "vstack" || el2.type === "hstack") continue;
    const sizes = resolvedSizes.get(id);
    if (!sizes) continue;
    if (sizes.hMeasured && el2.type === "el") {
      const html = el2.content || "";
      if (!html && (!el2.props.style || Object.keys(el2.props.style).length === 0)) {
        sizes.h = 0;
        continue;
      }
      const metrics = await measure(html, {
        w: sizes.w ?? void 0,
        style: el2.props.style,
        className: el2.props.className
      });
      sizes.h = metrics.h;
    } else if (!sizes.hMeasured) {
      const hRel = isRelMarker(el2.props.h) ? el2.props.h._rel : null;
      const hIsDeferred = hRel === "matchHeight";
      const hIsMatchMax = hRel === "matchMaxHeight";
      if (hIsDeferred) {
        sizes.h = 0;
      } else if (hIsMatchMax) {
        sizes.h = 0;
      } else {
        sizes.h = el2.props.h || 0;
      }
    }
  }
  const pendingStacksH = /* @__PURE__ */ new Set();
  for (const [id, el2] of flatMap) {
    if (el2.type === "vstack" || el2.type === "hstack") {
      pendingStacksH.add(id);
    }
  }
  progress = true;
  while (pendingStacksH.size > 0 && progress) {
    progress = false;
    for (const stackId of pendingStacksH) {
      const el2 = mustGet(flatMap, stackId, `flatMap missing stack: ${stackId}`);
      const childIds = stackChildren.get(stackId) || [];
      const gap = resolveSpacing(el2.props.gap ?? 0);
      let allChildrenReady = true;
      for (const cid of childIds) {
        if (!resolvedSizes.has(cid)) {
          allChildrenReady = false;
          break;
        }
        const childEl = mustGet(flatMap, cid, `flatMap missing stack child: ${cid}`);
        if (isPanelElement(childEl)) {
          const config = childEl._panelConfig;
          if (!config) continue;
          const panelChildren = childEl.children || [];
          const childStack = panelChildren[1];
          if (childStack && !resolvedSizes.has(childStack.id)) {
            allChildrenReady = false;
            break;
          }
          if (childStack && (childEl.children[1].type === "vstack" || childEl.children[1].type === "hstack")) {
            if (pendingStacksH.has(childStack.id)) {
              allChildrenReady = false;
              break;
            }
          }
          if (childStack && resolvedSizes.has(childStack.id)) {
            const stackSizes2 = resolvedSizes.get(childStack.id);
            const autoH = config.panelH ?? stackSizes2.h + 2 * config.padding;
            const panelSizes = mustGet(resolvedSizes, cid, `resolvedSizes missing panel: ${cid}`);
            panelSizes.h = autoH;
            if (config.panelW != null) panelSizes.w = config.panelW;
            const bgRect = panelChildren[0];
            if (bgRect && resolvedSizes.has(bgRect.id)) {
              resolvedSizes.get(bgRect.id).h = autoH;
            }
          }
        }
      }
      if (!allChildrenReady) continue;
      const stackSizes = mustGet(resolvedSizes, stackId, `resolvedSizes missing stack: ${stackId}`);
      if (el2.type === "vstack") {
        let totalH = 0;
        let maxW = 0;
        for (let i = 0; i < childIds.length; i++) {
          const cs = mustGet(resolvedSizes, childIds[i], `resolvedSizes missing vstack child: ${childIds[i]}`);
          totalH += cs.h;
          if (i > 0) totalH += gap;
          maxW = Math.max(maxW, cs.w);
        }
        const finalH = el2.props.h !== void 0 && el2.props.h !== null ? el2.props.h : totalH;
        stackSizes.h = finalH;
        const stackW = el2.props.w ?? 0;
        if (!stackW && maxW > stackSizes.w) {
          stackSizes.w = maxW;
        }
      } else {
        const stackH = el2.props.h ?? 0;
        let maxH = 0;
        for (const cid of childIds) {
          const cs = mustGet(resolvedSizes, cid, `resolvedSizes missing hstack child: ${cid}`);
          maxH = Math.max(maxH, cs.h);
        }
        stackSizes.h = stackH || maxH;
      }
      pendingStacksH.delete(stackId);
      progress = true;
    }
  }
  for (const [id, el2] of flatMap) {
    if (!isPanelElement(el2)) continue;
    const config = el2._panelConfig;
    if (!config) continue;
    const panelChildren = el2.children || [];
    const bgRect = panelChildren[0];
    const childStack = panelChildren[1];
    if (!bgRect || !childStack) continue;
    const stackSizes = resolvedSizes.get(childStack.id);
    if (!stackSizes) continue;
    const autoH = config.panelH ?? stackSizes.h + 2 * config.padding;
    if (resolvedSizes.has(bgRect.id)) {
      resolvedSizes.get(bgRect.id).h = autoH;
    }
    if (resolvedSizes.has(id)) {
      const groupSizes = resolvedSizes.get(id);
      groupSizes.h = autoH;
      if (config.panelW) groupSizes.w = config.panelW;
    } else {
      resolvedSizes.set(id, {
        w: config.panelW || 0,
        h: autoH,
        wMeasured: false,
        hMeasured: config.panelH === void 0 || config.panelH === null
      });
    }
  }
  for (const [id, el2] of flatMap) {
    if (el2.type !== "group" || el2.props.bounds !== "hug") continue;
    if (el2._compound) continue;
    const childIds = groupChildren.get(id);
    if (!childIds || childIds.length === 0) continue;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let validChildren = 0;
    for (const cid of childIds) {
      const child = mustGet(flatMap, cid, `flatMap missing group child: ${cid}`);
      const cs = resolvedSizes.get(cid);
      if (!cs) continue;
      const cx = child.props.x ?? 0;
      const cy = child.props.y ?? 0;
      if (!Number.isFinite(cx) || !Number.isFinite(cy)) continue;
      minX = Math.min(minX, cx);
      minY = Math.min(minY, cy);
      maxX = Math.max(maxX, cx + cs.w);
      maxY = Math.max(maxY, cy + cs.h);
      validChildren++;
    }
    if (validChildren === 0) continue;
    const hugW = maxX - minX;
    const hugH = maxY - minY;
    if (resolvedSizes.has(id)) {
      const gs = resolvedSizes.get(id);
      gs.w = hugW;
      gs.h = hugH;
    } else {
      resolvedSizes.set(id, { w: hugW, h: hugH, wMeasured: false, hMeasured: false });
    }
  }
  const maxHeightGroups = /* @__PURE__ */ new Map();
  for (const [id, el2] of flatMap) {
    if (isRelMarker(el2.props.h) && el2.props.h._rel === "matchMaxHeight") {
      const group2 = el2.props.h.group;
      if (!maxHeightGroups.has(group2)) maxHeightGroups.set(group2, []);
      maxHeightGroups.get(group2).push(id);
    }
  }
  for (const [, ids] of maxHeightGroups) {
    let maxH = 0;
    for (const id of ids) {
      const s = resolvedSizes.get(id);
      if (s && s.h > maxH) maxH = s.h;
    }
    for (const id of ids) {
      const s = resolvedSizes.get(id);
      if (s) s.h = maxH;
    }
  }
  const matchHeightElements = /* @__PURE__ */ new Map();
  for (const [id, el2] of flatMap) {
    if (isRelMarker(el2.props.h) && el2.props.h._rel === "matchHeight") {
      const refId = el2.props.h.ref;
      if (!flatMap.has(refId)) {
        errors.push({
          type: "unknown_ref",
          elementId: id,
          property: "h",
          ref: refId,
          message: `Element "${id}": h references unknown element "${refId}"`
        });
        continue;
      }
      matchHeightElements.set(id, refId);
    }
  }
  if (errors.length > 0) {
    return { authoredSpecs, resolvedSizes, hasErrors: true };
  }
  if (matchHeightElements.size > 0) {
    let visitHeight2 = function(id) {
      if (visitedH.has(id)) return true;
      if (visitingH.has(id)) {
        errors.push({
          type: "circular_dependency",
          elementId: id,
          property: "h",
          message: `Element "${id}": circular matchHeightOf dependency detected`
        });
        return false;
      }
      visitingH.add(id);
      for (const dep of heightDeps.get(id) || []) {
        if (!visitHeight2(dep)) return false;
      }
      visitingH.delete(id);
      visitedH.add(id);
      heightOrder.push(id);
      return true;
    };
    var visitHeight = visitHeight2;
    const heightDeps = /* @__PURE__ */ new Map();
    const allHeightIds = /* @__PURE__ */ new Set();
    for (const [id, refId] of matchHeightElements) {
      allHeightIds.add(id);
      allHeightIds.add(refId);
      if (!heightDeps.has(id)) heightDeps.set(id, /* @__PURE__ */ new Set());
      heightDeps.get(id).add(refId);
    }
    for (const id of allHeightIds) {
      if (!heightDeps.has(id)) heightDeps.set(id, /* @__PURE__ */ new Set());
    }
    const heightOrder = [];
    const visitedH = /* @__PURE__ */ new Set();
    const visitingH = /* @__PURE__ */ new Set();
    for (const id of allHeightIds) {
      visitHeight2(id);
    }
    for (const id of heightOrder) {
      const refId = matchHeightElements.get(id);
      if (!refId) continue;
      const refSizes = resolvedSizes.get(refId);
      const sizes = resolvedSizes.get(id);
      if (refSizes && sizes) {
        sizes.h = refSizes.h;
      }
    }
  }
  return { authoredSpecs, resolvedSizes, hasErrors: false };
}
init_helpers();
async function resolvePositions(flatMap, stackParent, stackChildren, resolvedSizes, authoredSpecs, warnings, errors) {
  const initialErrorCount = errors.length;
  const deps = /* @__PURE__ */ new Map();
  for (const [id, el2] of flatMap) {
    const depSet = /* @__PURE__ */ new Set();
    if (stackParent.has(id)) {
      const parentStackId = mustGet(stackParent, id, `stackParent missing child: ${id}`);
      depSet.add(parentStackId);
      if (isRelMarker(el2.props.x) || isRelMarker(el2.props.y)) {
        warnings.push({
          type: "ignored_rel_on_stack_child",
          elementId: id,
          stackId: parentStackId,
          message: `Element "${id}" is a child of stack "${parentStackId}", so its relative positioning markers on x/y are ignored. Use gap/align on the stack instead.`
        });
      }
    } else {
      const xRef = getRelRef(el2.props.x);
      const yRef = getRelRef(el2.props.y);
      if (xRef) {
        if (!flatMap.has(xRef)) {
          errors.push({
            type: "unknown_ref",
            elementId: id,
            property: "x",
            ref: xRef,
            message: `Element "${id}": x references unknown element "${xRef}"`
          });
        } else {
          depSet.add(xRef);
        }
      }
      if (yRef) {
        if (!flatMap.has(yRef)) {
          errors.push({
            type: "unknown_ref",
            elementId: id,
            property: "y",
            ref: yRef,
            message: `Element "${id}": y references unknown element "${yRef}"`
          });
        } else {
          depSet.add(yRef);
        }
      }
      for (const prop of ["x", "y"]) {
        const marker = el2.props[prop];
        if (isRelMarker(marker) && marker.ref2 !== void 0 && typeof marker.ref2 === "string") {
          if (!flatMap.has(marker.ref2)) {
            errors.push({
              type: "unknown_ref",
              elementId: id,
              property: prop,
              ref: marker.ref2,
              message: `Element "${id}": ${prop} references unknown element "${marker.ref2}" (ref2)`
            });
          } else {
            depSet.add(marker.ref2);
          }
        }
      }
      if (el2.type === "connector") {
        const fId = el2.props.fromId;
        const tId = el2.props.toId;
        if (fId) {
          if (!flatMap.has(fId)) {
            errors.push({
              type: "unknown_ref",
              elementId: id,
              property: "fromId",
              ref: fId,
              message: `Connector "${id}": fromId references unknown element "${fId}"`
            });
          } else {
            depSet.add(fId);
          }
        }
        if (tId) {
          if (!flatMap.has(tId)) {
            errors.push({
              type: "unknown_ref",
              elementId: id,
              property: "toId",
              ref: tId,
              message: `Connector "${id}": toId references unknown element "${tId}"`
            });
          } else {
            depSet.add(tId);
          }
        }
      }
    }
    deps.set(id, depSet);
  }
  if (errors.length > initialErrorCount) {
    return null;
  }
  const inDegree = /* @__PURE__ */ new Map();
  for (const [id] of flatMap) {
    inDegree.set(id, 0);
  }
  for (const [id, depSet] of deps) {
    inDegree.set(id, depSet.size);
  }
  const queue = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) {
      queue.push(id);
    }
  }
  const reverseDeps = /* @__PURE__ */ new Map();
  for (const [id] of flatMap) {
    reverseDeps.set(id, []);
  }
  for (const [id, depSet] of deps) {
    for (const ref of depSet) {
      mustGet(reverseDeps, ref, `reverseDeps missing element: ${ref}`).push(id);
    }
  }
  const sortedOrder = [];
  while (queue.length > 0) {
    const nodeId = queue.shift();
    sortedOrder.push(nodeId);
    for (const dependent of mustGet(reverseDeps, nodeId, `reverseDeps missing node: ${nodeId}`)) {
      const newDeg = mustGet(inDegree, dependent, `inDegree missing element: ${dependent}`) - 1;
      inDegree.set(dependent, newDeg);
      if (newDeg === 0) {
        queue.push(dependent);
      }
    }
  }
  if (sortedOrder.length < flatMap.size) {
    const sortedSet = new Set(sortedOrder);
    const inCycle = [];
    for (const [id] of flatMap) {
      if (!sortedSet.has(id)) {
        inCycle.push(id);
      }
    }
    errors.push({
      type: "dependency_cycle",
      elementIds: inCycle,
      message: `Circular dependency detected among elements: ${inCycle.join(", ")}`
    });
    return null;
  }
  const resolvedBounds = /* @__PURE__ */ new Map();
  for (const id of sortedOrder) {
    const el2 = mustGet(flatMap, id, `flatMap missing element: ${id}`);
    const sizes = mustGet(resolvedSizes, id, `resolvedSizes missing element: ${id}`);
    const w = sizes.w;
    const h = sizes.h;
    let finalX, finalY;
    if (stackParent.has(id)) {
      if (resolvedBounds.has(id)) {
        const existingBounds = mustGet(resolvedBounds, id, `resolvedBounds missing stack child: ${id}`);
        finalX = existingBounds.x;
        finalY = existingBounds.y;
      } else {
        finalX = 0;
        finalY = 0;
        resolvedBounds.set(id, { x: 0, y: 0, w, h });
      }
      if (el2.type !== "vstack" && el2.type !== "hstack") {
        continue;
      }
    } else {
      const xIsRel = isRelMarker(el2.props.x);
      let x;
      if (xIsRel) {
        const marker = el2.props.x;
        if (marker._rel === "centerIn") {
          const r = marker.rect;
          x = r.x + r.w / 2 - w / 2;
        } else if (marker._rel === "between") {
          if (marker.axis && marker.axis !== "x") {
            warnings.push({ type: "between_axis_mismatch", elementId: id, axis: "x", declaredAxis: marker.axis, message: `between() declared axis "${marker.axis}" but assigned to x` });
          }
          const leftBounds = mustGet(resolvedBounds, marker.ref, `resolvedBounds missing ref for between-x: ${marker.ref}`);
          const leftEdge = leftBounds.x + leftBounds.w;
          const rightEdge = typeof marker.ref2 === "string" ? mustGet(resolvedBounds, marker.ref2, `resolvedBounds missing ref2 for between-x: ${marker.ref2}`).x : marker.ref2;
          if (typeof rightEdge !== "number" || !Number.isFinite(rightEdge)) {
            warnings.push({ type: "between_invalid_ref", elementId: id, axis: "x", message: `Invalid ref2 value for between constraint` });
            x = leftEdge + resolveSpacing("xs");
            resolvedBounds.set(id, { x, y: el2.props.y ?? 0, w, h });
            continue;
          }
          const availableGapX = rightEdge - leftEdge;
          const availableSlack = availableGapX - w;
          if (availableSlack < 0) {
            const ref2Label = typeof marker.ref2 === "string" ? `"${marker.ref2}"` : marker.ref2;
            warnings.push({
              type: "between_no_fit",
              elementId: id,
              ref1: marker.ref,
              ref2: marker.ref2,
              message: `Element "${id}" (w=${w}) does not fit between "${marker.ref}" and ${ref2Label} (available: ${availableGapX}px). Using minimum gap fallback.`,
              suggestion: `Increase horizontal space between "${marker.ref}" and ${ref2Label} to at least ${w + 2 * resolveSpacing("xs")}px, or reduce element width.`
            });
            x = leftEdge + resolveSpacing("xs");
          } else {
            x = leftEdge + availableSlack * (marker.bias ?? 0.5);
          }
        } else if (marker._rel === "centerHSlide") {
          const slideW = state.config?.slide?.w ?? 1920;
          x = slideW / 2 - w / 2;
        } else {
          const refId = marker.ref;
          const refBounds = mustGet(resolvedBounds, refId, `resolvedBounds missing ref for x: ${refId}`);
          x = resolveRelMarker(marker, "x", refBounds, w, h);
        }
      } else {
        x = el2.props.x ?? 0;
      }
      const yIsRel = isRelMarker(el2.props.y);
      let y;
      if (yIsRel) {
        const marker = el2.props.y;
        if (marker._rel === "centerIn") {
          const r = marker.rect;
          y = r.y + r.h / 2 - h / 2;
        } else if (marker._rel === "centerVSlide") {
          const slideH = state.config?.slide?.h ?? 1080;
          y = slideH / 2 - h / 2;
        } else if (marker._rel === "between") {
          if (marker.axis && marker.axis !== "y") {
            warnings.push({ type: "between_axis_mismatch", elementId: id, axis: "y", declaredAxis: marker.axis, message: `between() declared axis "${marker.axis}" but assigned to y` });
          }
          const topBounds = mustGet(resolvedBounds, marker.ref, `resolvedBounds missing ref for between-y: ${marker.ref}`);
          const topEdge = topBounds.y + topBounds.h;
          const bottomEdge = typeof marker.ref2 === "string" ? mustGet(resolvedBounds, marker.ref2, `resolvedBounds missing ref2 for between-y: ${marker.ref2}`).y : marker.ref2;
          if (typeof bottomEdge !== "number" || !Number.isFinite(bottomEdge)) {
            warnings.push({ type: "between_invalid_ref", elementId: id, axis: "y", message: `Invalid ref2 value for between constraint` });
            y = topEdge + resolveSpacing("xs");
            resolvedBounds.set(id, { x: el2.props.x ?? 0, y, w, h });
            continue;
          }
          const availableGapY = bottomEdge - topEdge;
          const availableSlack = availableGapY - h;
          if (availableSlack < 0) {
            const ref2Label = typeof marker.ref2 === "string" ? `"${marker.ref2}"` : marker.ref2;
            warnings.push({
              type: "between_no_fit",
              elementId: id,
              ref1: marker.ref,
              ref2: marker.ref2,
              message: `Element "${id}" (h=${h}) does not fit between "${marker.ref}" and ${ref2Label} (available: ${availableGapY}px). Using minimum gap fallback.`,
              suggestion: `Increase vertical space between "${marker.ref}" and ${ref2Label} to at least ${h + 2 * resolveSpacing("xs")}px, or reduce element height.`
            });
            y = topEdge + resolveSpacing("xs");
          } else {
            y = topEdge + availableSlack * (marker.bias ?? 0.5);
          }
        } else {
          const refId = marker.ref;
          const refBounds = mustGet(resolvedBounds, refId, `resolvedBounds missing ref for y: ${refId}`);
          y = resolveRelMarker(marker, "y", refBounds, w, h);
        }
      } else {
        y = el2.props.y ?? 0;
      }
      const anchor = el2.props.anchor || "tl";
      const { left: anchoredX, top: anchoredY } = resolveAnchor(x, y, w, h, anchor);
      finalX = xIsRel ? x : anchoredX;
      finalY = yIsRel ? y : anchoredY;
      resolvedBounds.set(id, { x: finalX, y: finalY, w, h });
    }
    if (el2.type === "vstack" || el2.type === "hstack") {
      const childIds = stackChildren.get(id) || [];
      const gap = resolveSpacing(el2.props.gap ?? 0);
      const stackX = finalX;
      const stackY = finalY;
      if (el2.type === "vstack") {
        const align = el2.props.align || "left";
        let curY = stackY;
        if (align === "stretch") {
          const maxW = childIds.length > 0 ? Math.max(...childIds.map((cid) => mustGet(resolvedSizes, cid, `resolvedSizes missing stack child: ${cid}`).w)) : 0;
          const stackAuthW = authoredSpecs.get(id)?.props?.w;
          const stretchW = stackAuthW !== void 0 && stackAuthW !== null ? w : maxW;
          for (let i = 0; i < childIds.length; i++) {
            const cid = childIds[i];
            const cs = mustGet(resolvedSizes, cid, `resolvedSizes missing vstack child: ${cid}`);
            const authoredW = mustGet(authoredSpecs, cid, `authoredSpecs missing vstack child: ${cid}`).props.w;
            if (authoredW !== void 0 && authoredW !== null && authoredW !== stretchW) {
              warnings.push({
                type: "stretch_override",
                elementId: cid,
                property: "w",
                authored: authoredW,
                stretched: stretchW,
                message: `Child '${cid}' has authored w=${authoredW} but stretch requires w=${stretchW}.`
              });
            }
            const childEl = mustGet(flatMap, cid, `flatMap missing vstack child: ${cid}`);
            const childAuth = authoredSpecs.get(cid)?.props || {};
            let childH = cs.h;
            if (childEl?.type === "el" && stretchW !== cs.w && (childAuth.h === void 0 || childAuth.h === null)) {
              const metrics = await measure(childEl.content || "", { ...childEl.props, w: stretchW });
              childH = metrics.h;
              cs.h = childH;
            }
            resolvedBounds.set(cid, { x: stackX, y: curY, w: stretchW, h: childH });
            curY += childH + gap;
          }
        } else {
          for (let i = 0; i < childIds.length; i++) {
            const cid = childIds[i];
            const cs = mustGet(resolvedSizes, cid, `resolvedSizes missing vstack child: ${cid}`);
            let childX;
            if (align === "center") {
              childX = stackX + (w - cs.w) / 2;
            } else if (align === "right") {
              childX = stackX + w - cs.w;
            } else {
              childX = stackX;
            }
            resolvedBounds.set(cid, { x: childX, y: curY, w: cs.w, h: cs.h });
            curY += cs.h + gap;
          }
        }
        const vAlign = el2.props.vAlign;
        if (vAlign && vAlign !== "top" && childIds.length > 0) {
          const totalContentH = curY - stackY - (childIds.length > 0 ? gap : 0);
          const stackAuthH = authoredSpecs.get(id)?.props?.h;
          if (stackAuthH !== void 0 && stackAuthH !== null && h > totalContentH) {
            const slack = h - totalContentH;
            const offsetY = vAlign === "center" ? slack / 2 : slack;
            for (const cid of childIds) {
              const bounds = mustGet(resolvedBounds, cid, `resolvedBounds missing vstack child for vAlign: ${cid}`);
              resolvedBounds.set(cid, { x: bounds.x, y: bounds.y + offsetY, w: bounds.w, h: bounds.h });
            }
          }
        }
      } else {
        const align = el2.props.align || "top";
        let curX = stackX;
        if (align === "stretch") {
          const maxH = childIds.length > 0 ? Math.max(...childIds.map((cid) => mustGet(resolvedSizes, cid, `resolvedSizes missing hstack child: ${cid}`).h)) : 0;
          const stackAuthH = authoredSpecs.get(id)?.props?.h;
          const stretchH = stackAuthH !== void 0 && stackAuthH !== null ? h : maxH;
          for (let i = 0; i < childIds.length; i++) {
            const cid = childIds[i];
            const cs = mustGet(resolvedSizes, cid, `resolvedSizes missing hstack child: ${cid}`);
            const authoredH = mustGet(authoredSpecs, cid, `authoredSpecs missing hstack child: ${cid}`).props.h;
            if (authoredH !== void 0 && authoredH !== null && authoredH !== stretchH) {
              warnings.push({
                type: "stretch_override",
                elementId: cid,
                property: "h",
                authored: authoredH,
                stretched: stretchH,
                message: `Child '${cid}' has authored h=${authoredH} but stretch requires h=${stretchH}.`
              });
            }
            resolvedBounds.set(cid, { x: curX, y: stackY, w: cs.w, h: stretchH });
            const childEl = mustGet(flatMap, cid, `flatMap missing hstack child: ${cid}`);
            if (isPanelElement(childEl) && childEl.children && childEl.children.length >= 2) {
              const config = childEl._panelConfig;
              const panelPadding = config?.padding ?? 0;
              const bgRect = childEl.children[0];
              const bgSizes = resolvedSizes.get(bgRect.id);
              if (bgSizes) {
                bgSizes.h = stretchH;
              }
              const bgBounds = resolvedBounds.get(bgRect.id);
              if (bgBounds) {
                bgBounds.h = stretchH;
              }
              const innerVstack = childEl.children[1];
              const newVstackH = Math.max(0, stretchH - 2 * panelPadding);
              const vstackSizes = resolvedSizes.get(innerVstack.id);
              if (vstackSizes) {
                vstackSizes.h = newVstackH;
              }
              const vstackBounds = resolvedBounds.get(innerVstack.id);
              if (vstackBounds) {
                vstackBounds.h = newVstackH;
              }
            }
            curX += cs.w + gap;
          }
        } else {
          for (let i = 0; i < childIds.length; i++) {
            const cid = childIds[i];
            const cs = mustGet(resolvedSizes, cid, `resolvedSizes missing hstack child: ${cid}`);
            let childY;
            if (align === "middle") {
              childY = stackY + (h - cs.h) / 2;
            } else if (align === "bottom") {
              childY = stackY + h - cs.h;
            } else {
              childY = stackY;
            }
            resolvedBounds.set(cid, { x: curX, y: childY, w: cs.w, h: cs.h });
            curX += cs.w + gap;
          }
        }
        const hAlign = el2.props.hAlign;
        if (hAlign && hAlign !== "left" && childIds.length > 0) {
          const totalContentW = curX - stackX - (childIds.length > 0 ? gap : 0);
          const stackAuthW = authoredSpecs.get(id)?.props?.w;
          if (stackAuthW !== void 0 && stackAuthW !== null && w > totalContentW) {
            const slack = w - totalContentW;
            const offsetX = hAlign === "center" ? slack / 2 : slack;
            for (const cid of childIds) {
              const bounds = mustGet(resolvedBounds, cid, `resolvedBounds missing hstack child for hAlign: ${cid}`);
              resolvedBounds.set(cid, { x: bounds.x + offsetX, y: bounds.y, w: bounds.w, h: bounds.h });
            }
          }
        }
      }
    }
  }
  return { resolvedBounds, sortedOrder };
}
init_helpers();
function finalize({
  sortedOrder,
  flatMap,
  authoredSpecs,
  resolvedBounds,
  resolvedSizes,
  stackParent,
  stackChildren,
  groupParent,
  groupChildren,
  panelInternals,
  preTransformBounds,
  resolvedTransforms,
  warnings,
  errors,
  collisionThreshold
}) {
  const sceneElements = {};
  for (const id of sortedOrder) {
    const el2 = mustGet(flatMap, id, `flatMap missing element: ${id}`);
    const authored = mustGet(authoredSpecs, id, `authoredSpecs missing element: ${id}`);
    const bounds = mustGet(resolvedBounds, id, `resolvedBounds missing element: ${id}`);
    const sizes = mustGet(resolvedSizes, id, `resolvedSizes missing element: ${id}`);
    let provenance;
    if (stackParent.has(id)) {
      const parentStackId = mustGet(stackParent, id, `stackParent missing child: ${id}`);
      provenance = {
        x: { source: "stack", stackId: parentStackId, sourceAnchor: "cc", targetAnchor: "cl" },
        y: { source: "stack", stackId: parentStackId, sourceAnchor: "cc", targetAnchor: "cl" },
        w: buildProvenance(authored.props.w, "w", el2, sizes.wMeasured),
        h: buildProvenance(authored.props.h, "h", el2, sizes.hMeasured)
      };
    } else {
      provenance = {
        x: buildProvenance(authored.props.x, "x", el2, false),
        y: buildProvenance(authored.props.y, "y", el2, false),
        w: buildProvenance(authored.props.w, "w", el2, sizes.wMeasured),
        h: buildProvenance(authored.props.h, "h", el2, sizes.hMeasured)
      };
    }
    const preBounds = preTransformBounds.get(id);
    if (preBounds) {
      if (bounds.x !== preBounds.x) {
        provenance.x = { source: "transform", original: provenance.x };
      }
      if (bounds.y !== preBounds.y) {
        provenance.y = { source: "transform", original: provenance.y };
      }
      if (bounds.w !== preBounds.w) {
        provenance.w = { source: "transform", original: provenance.w };
      }
      if (bounds.h !== preBounds.h) {
        provenance.h = { source: "transform", original: provenance.h };
      }
    }
    const parentId = groupParent.get(id) ?? stackParent.get(id) ?? null;
    let children = [];
    if (el2.type === "group" && groupChildren.has(id)) {
      children = mustGet(groupChildren, id, `groupChildren missing group: ${id}`);
    } else if ((el2.type === "vstack" || el2.type === "hstack") && stackChildren.has(id)) {
      children = mustGet(stackChildren, id, `stackChildren missing stack: ${id}`);
    }
    let localResolved;
    if (!parentId) {
      localResolved = { ...bounds };
    } else if (groupParent.has(id)) {
      localResolved = { ...bounds };
    } else {
      const stackBounds = resolvedBounds.get(parentId);
      if (stackBounds) {
        localResolved = {
          x: bounds.x - stackBounds.x,
          y: bounds.y - stackBounds.y,
          w: bounds.w,
          h: bounds.h
        };
      } else {
        localResolved = { ...bounds };
      }
    }
    sceneElements[id] = {
      id,
      type: el2.type,
      authored,
      resolved: { ...bounds },
      localResolved,
      parentId,
      children,
      _internal: panelInternals.has(id),
      provenance
    };
    if ("_compound" in el2 && el2._compound === "panel" && "children" in el2 && el2.children) {
      sceneElements[id].panelChildren = el2.children.map((child) => {
        const childBounds = resolvedBounds.get(child.id);
        return {
          id: child.id,
          type: child.type,
          ...childBounds || {}
        };
      });
    }
    if (el2._layoutFlags) {
      sceneElements[id]._layoutFlags = { ...el2._layoutFlags };
    }
  }
  const rootIds = [];
  for (const id of sortedOrder) {
    if (sceneElements[id] && sceneElements[id].parentId === null) {
      rootIds.push(id);
    }
  }
  function absoluteBoundsOf2(id) {
    const bounds = resolvedBounds.get(id);
    if (!bounds) return null;
    let offsetX = 0, offsetY = 0;
    let current = id;
    while (true) {
      const gp = groupParent.get(current);
      if (gp) {
        const gpBounds = resolvedBounds.get(gp);
        if (gpBounds) {
          offsetX += gpBounds.x;
          offsetY += gpBounds.y;
        }
        current = gp;
        continue;
      }
      const sp = stackParent.get(current);
      if (sp) {
        current = sp;
        continue;
      }
      break;
    }
    return { x: bounds.x + offsetX, y: bounds.y + offsetY, w: bounds.w, h: bounds.h };
  }
  const obstacleRects = [];
  for (const id of sortedOrder) {
    const el2 = mustGet(flatMap, id, `flatMap missing element: ${id}`);
    if (el2.type === "connector") continue;
    if (el2.type === "vstack" || el2.type === "hstack") continue;
    if (panelInternals.has(id)) continue;
    if (el2.props.layer === "bg") continue;
    const bounds = resolvedBounds.get(id);
    if (!bounds || bounds.w <= 0 || bounds.h <= 0) continue;
    obstacleRects.push({ id, rect: bounds });
  }
  const connectorInfos = [];
  function anchorEdge(anchor) {
    const row = anchor[0];
    const col = anchor[1];
    if (row === "t") return "top";
    if (row === "b") return "bottom";
    if (col === "l") return "left";
    if (col === "r") return "right";
    return "center";
  }
  const portGroups = /* @__PURE__ */ new Map();
  for (const id of sortedOrder) {
    const el2 = mustGet(flatMap, id, `flatMap missing element: ${id}`);
    if (el2.type !== "connector") continue;
    const fromId = el2.props.fromId;
    const toId = el2.props.toId;
    if (fromId === toId) {
      warnings.push({
        type: "connector_self_reference",
        elementId: id,
        message: `Connector "${id}": fromId and toId are the same element ("${fromId}")`
      });
      continue;
    }
    const fromBounds = absoluteBoundsOf2(fromId);
    const toBounds = absoluteBoundsOf2(toId);
    if (!fromBounds || !toBounds) {
      warnings.push({
        type: "connector_missing_endpoint",
        elementId: id,
        message: `Connector "${id}": could not resolve endpoints (from: "${fromId}", to: "${toId}")`
      });
      continue;
    }
    const fromAnchor = el2.props.fromAnchor || "cr";
    const toAnchor = el2.props.toAnchor || "cl";
    const fromPt = getAnchorPoint(fromBounds, fromAnchor);
    const toPt = getAnchorPoint(toBounds, toAnchor);
    if (fromPt.dx === 0 && fromPt.dy === 0) {
      const tdx = toPt.x - fromPt.x;
      const tdy = toPt.y - fromPt.y;
      if (Math.abs(tdx) >= Math.abs(tdy)) {
        fromPt.dx = tdx >= 0 ? 1 : -1;
      } else {
        fromPt.dy = tdy >= 0 ? 1 : -1;
      }
    }
    if (toPt.dx === 0 && toPt.dy === 0) {
      const tdx = fromPt.x - toPt.x;
      const tdy = fromPt.y - toPt.y;
      if (Math.abs(tdx) >= Math.abs(tdy)) {
        toPt.dx = tdx >= 0 ? 1 : -1;
      } else {
        toPt.dy = tdy >= 0 ? 1 : -1;
      }
    }
    const idx = connectorInfos.length;
    connectorInfos.push({ id, el: el2, fromId, toId, fromAnchor, toAnchor, fromPt, toPt, fromBounds, toBounds });
    const fromEdge = anchorEdge(fromAnchor);
    if (fromEdge !== "center") {
      const key = `from:${fromId}:${fromEdge}`;
      if (!portGroups.has(key)) portGroups.set(key, []);
      portGroups.get(key).push({
        idx,
        targetPt: { x: toPt.x, y: toPt.y },
        portOrder: el2.props.fromPortOrder ?? 0
      });
    }
    const toEdge = anchorEdge(toAnchor);
    if (toEdge !== "center") {
      const key = `to:${toId}:${toEdge}`;
      if (!portGroups.has(key)) portGroups.set(key, []);
      portGroups.get(key).push({
        idx,
        targetPt: { x: fromPt.x, y: fromPt.y },
        portOrder: el2.props.toPortOrder ?? 0
      });
    }
  }
  const DEFAULT_PORT_SPACING = 14;
  const DEFAULT_EDGE_MARGIN = 8;
  for (const [key, group2] of portGroups) {
    if (group2.length <= 1) {
      if (group2.length === 1) {
        const parts2 = key.split(":");
        const direction2 = parts2[0];
        const info = connectorInfos[group2[0].idx];
        const explicitOffset = direction2 === "from" ? info.el.props.fromPortOffset : info.el.props.toPortOffset;
        if (explicitOffset !== void 0) {
          const edge2 = parts2[2];
          const isHorizontalEdge2 = edge2 === "top" || edge2 === "bottom";
          if (direction2 === "from") {
            if (isHorizontalEdge2) info.fromPt.x += explicitOffset;
            else info.fromPt.y += explicitOffset;
          } else {
            if (isHorizontalEdge2) info.toPt.x += explicitOffset;
            else info.toPt.y += explicitOffset;
          }
        }
      }
      continue;
    }
    const parts = key.split(":");
    const direction = parts[0];
    const elementId = parts[1];
    const edge = parts[2];
    const bounds = resolvedBounds.get(elementId);
    if (!bounds) continue;
    const targetEl = flatMap.get(elementId);
    const PORT_SPACING = targetEl?.props.portSpacing ?? DEFAULT_PORT_SPACING;
    const EDGE_MARGIN = targetEl?.props.edgeMargin ?? DEFAULT_EDGE_MARGIN;
    const isHorizontalEdge = edge === "top" || edge === "bottom";
    group2.sort((a, b) => {
      if (a.portOrder !== b.portOrder) return a.portOrder - b.portOrder;
      return isHorizontalEdge ? a.targetPt.x - b.targetPt.x : a.targetPt.y - b.targetPt.y;
    });
    const edgeLength = isHorizontalEdge ? bounds.w : bounds.h;
    const usable = edgeLength - 2 * EDGE_MARGIN;
    const totalSpread = (group2.length - 1) * PORT_SPACING;
    const spacing = totalSpread > usable ? usable / (group2.length - 1) : PORT_SPACING;
    const startOffset = -((group2.length - 1) * spacing / 2);
    for (let i = 0; i < group2.length; i++) {
      const entry = group2[i];
      const info = connectorInfos[entry.idx];
      const offset = startOffset + i * spacing;
      const explicitOffset = direction === "from" ? info.el.props.fromPortOffset : info.el.props.toPortOffset;
      const appliedOffset = explicitOffset ?? offset;
      if (direction === "from") {
        if (isHorizontalEdge) {
          info.fromPt.x += appliedOffset;
        } else {
          info.fromPt.y += appliedOffset;
        }
      } else {
        if (isHorizontalEdge) {
          info.toPt.x += appliedOffset;
        } else {
          info.toPt.y += appliedOffset;
        }
      }
    }
  }
  for (const info of connectorInfos) {
    const { id, el: el2, fromId, toId, fromAnchor, toAnchor, fromPt, toPt } = info;
    const margin = el2.props.obstacleMargin ?? 200;
    const pathMinX = Math.min(fromPt.x, toPt.x) - margin;
    const pathMaxX = Math.max(fromPt.x, toPt.x) + margin;
    const pathMinY = Math.min(fromPt.y, toPt.y) - margin;
    const pathMaxY = Math.max(fromPt.y, toPt.y) + margin;
    const obstacles = [];
    for (const obs of obstacleRects) {
      if (obs.id === fromId || obs.id === toId) continue;
      const r = obs.rect;
      if (r.x + r.w < pathMinX || r.x > pathMaxX) continue;
      if (r.y + r.h < pathMinY || r.y > pathMaxY) continue;
      obstacles.push(r);
    }
    const connType = el2.props.connectorType || "straight";
    let waypoints;
    if (connType === "elbow" || connType === "orthogonal") {
      const thickness = el2.props.thickness ?? 2;
      const cornerRadius = el2.props.cornerRadius ?? 0;
      const stubLength = Math.max(40, 8 * thickness + cornerRadius + 15);
      const route = routeConnector({
        from: fromPt,
        to: toPt,
        obstacles,
        orthogonal: connType === "orthogonal",
        stubLength
      });
      waypoints = route.waypoints;
    }
    let connMinX = Math.min(fromPt.x, toPt.x);
    let connMinY = Math.min(fromPt.y, toPt.y);
    let connMaxX = Math.max(fromPt.x, toPt.x);
    let connMaxY = Math.max(fromPt.y, toPt.y);
    if (waypoints) {
      for (const wp of waypoints) {
        if (wp.x < connMinX) connMinX = wp.x;
        if (wp.y < connMinY) connMinY = wp.y;
        if (wp.x > connMaxX) connMaxX = wp.x;
        if (wp.y > connMaxY) connMaxY = wp.y;
      }
    }
    if (connType === "curved") {
      const dist = Math.sqrt((toPt.x - fromPt.x) ** 2 + (toPt.y - fromPt.y) ** 2);
      const cpOff = Math.min(200, Math.max(40, dist * 0.4));
      const cx1 = fromPt.x + fromPt.dx * cpOff;
      const cy1 = fromPt.y + fromPt.dy * cpOff;
      const cx2 = toPt.x + toPt.dx * cpOff;
      const cy2 = toPt.y + toPt.dy * cpOff;
      connMinX = Math.min(connMinX, cx1, cx2);
      connMinY = Math.min(connMinY, cy1, cy2);
      connMaxX = Math.max(connMaxX, cx1, cx2);
      connMaxY = Math.max(connMaxY, cy1, cy2);
    }
    resolvedBounds.set(id, {
      x: connMinX,
      y: connMinY,
      w: connMaxX - connMinX,
      h: connMaxY - connMinY
    });
    if (sceneElements[id]) {
      const connBounds = {
        x: connMinX,
        y: connMinY,
        w: connMaxX - connMinX,
        h: connMaxY - connMinY
      };
      sceneElements[id].resolved = { ...connBounds };
      sceneElements[id].localResolved = { ...connBounds };
      sceneElements[id]._connectorResolved = {
        from: fromPt,
        to: toPt,
        fromId,
        toId,
        fromAnchor,
        toAnchor,
        waypoints
      };
    }
  }
  const collisions = [];
  function absoluteBounds2(id) {
    const bounds = resolvedBounds.get(id);
    if (!bounds) return null;
    let offsetX = 0, offsetY = 0;
    let current = id;
    while (true) {
      const gp = groupParent.get(current);
      if (gp) {
        const gpBounds = resolvedBounds.get(gp);
        if (gpBounds) {
          offsetX += gpBounds.x;
          offsetY += gpBounds.y;
        }
        current = gp;
        continue;
      }
      const sp = stackParent.get(current);
      if (sp) {
        current = sp;
        continue;
      }
      break;
    }
    return { x: bounds.x + offsetX, y: bounds.y + offsetY, w: bounds.w, h: bounds.h };
  }
  function isAncestorOf(ancestorId, id) {
    let current = id;
    while (true) {
      const gp = groupParent.get(current);
      if (gp) {
        if (gp === ancestorId) return true;
        current = gp;
        continue;
      }
      const sp = stackParent.get(current);
      if (sp) {
        if (sp === ancestorId) return true;
        current = sp;
        continue;
      }
      return false;
    }
  }
  const layerElements = { bg: [], content: [], overlay: [] };
  for (const id of sortedOrder) {
    const el2 = mustGet(flatMap, id, `flatMap missing element in collision detection: ${id}`);
    if (groupParent.has(id)) continue;
    if (el2.type === "vstack" || el2.type === "hstack") continue;
    const elBounds = resolvedBounds.get(id);
    if (!elBounds || elBounds.w <= 0 || elBounds.h <= 0) continue;
    const layer = el2.props.layer || "content";
    if (!layerElements[layer]) layerElements[layer] = [];
    layerElements[layer].push(id);
  }
  for (const layer of Object.keys(layerElements)) {
    const ids = layerElements[layer];
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const idA = ids[i];
        const idB = ids[j];
        if (isAncestorOf(idA, idB) || isAncestorOf(idB, idA)) continue;
        let boundsA = absoluteBounds2(idA);
        let boundsB = absoluteBounds2(idB);
        if (!boundsA || !boundsB) continue;
        const elA = flatMap.get(idA);
        const elB = flatMap.get(idB);
        if (elA?.props?.rotate) {
          const aabb = rotatedAABB(boundsA.w, boundsA.h, elA.props.rotate);
          const cx = boundsA.x + boundsA.w / 2;
          const cy = boundsA.y + boundsA.h / 2;
          boundsA = { x: cx - aabb.w / 2, y: cy - aabb.h / 2, w: aabb.w, h: aabb.h };
        }
        if (elB?.props?.rotate) {
          const aabb = rotatedAABB(boundsB.w, boundsB.h, elB.props.rotate);
          const cx = boundsB.x + boundsB.w / 2;
          const cy = boundsB.y + boundsB.h / 2;
          boundsB = { x: cx - aabb.w / 2, y: cy - aabb.h / 2, w: aabb.w, h: aabb.h };
        }
        const overlapRect = computeAABBIntersection(boundsA, boundsB);
        if (overlapRect) {
          const overlapArea = overlapRect.w * overlapRect.h;
          if (overlapArea > collisionThreshold) {
            collisions.push({
              elementA: idA,
              elementB: idB,
              overlapRect,
              overlapArea
            });
          }
        }
      }
    }
  }
  const cfg = state.config;
  const slideW = cfg?.slide?.w ?? 1920;
  const slideH = cfg?.slide?.h ?? 1080;
  const isStrict = cfg?.strict === true;
  const sr = state.safeRectCache;
  if (sr) {
    for (const id of sortedOrder) {
      const el2 = mustGet(flatMap, id, `flatMap missing element in safe-zone check: ${id}`);
      if (el2.props.layer === "bg") continue;
      if (groupParent.has(id)) continue;
      if (stackParent.has(id)) continue;
      if (el2.type === "vstack" || el2.type === "hstack") continue;
      const bounds = mustGet(resolvedBounds, id, `resolvedBounds missing element in safe-zone check: ${id}`);
      const outsideSafe = bounds.x < sr.x || bounds.y < sr.y || bounds.x + bounds.w > sr.x + sr.w || bounds.y + bounds.h > sr.y + sr.h;
      if (outsideSafe) {
        const suggestion = `. If intentional, set layer: 'bg' to silence this check.`;
        if (isStrict) {
          errors.push({
            type: "outside_safe_zone",
            elementId: id,
            resolved: { ...bounds },
            safeRect: { ...sr },
            message: `Element "${id}" extends outside the safe zone` + suggestion
          });
        } else {
          warnings.push({
            type: "outside_safe_zone",
            elementId: id,
            resolved: { ...bounds },
            safeRect: { ...sr },
            message: `Element "${id}" extends outside the safe zone` + suggestion
          });
        }
      }
    }
  }
  for (const id of sortedOrder) {
    const el2 = mustGet(flatMap, id, `flatMap missing element in slide-bounds check: ${id}`);
    if (groupParent.has(id)) continue;
    if (stackParent.has(id)) continue;
    if (el2.type === "vstack" || el2.type === "hstack") continue;
    const bounds = mustGet(resolvedBounds, id, `resolvedBounds missing element in slide-bounds check: ${id}`);
    const outsideSlide = bounds.x < 0 || bounds.y < 0 || bounds.x + bounds.w > slideW || bounds.y + bounds.h > slideH;
    if (outsideSlide) {
      if (isStrict) {
        errors.push({
          type: "outside_slide",
          elementId: id,
          resolved: { ...bounds },
          slideRect: { x: 0, y: 0, w: slideW, h: slideH },
          message: `Element "${id}" extends outside the slide bounds (${slideW}x${slideH})`
        });
      } else {
        warnings.push({
          type: "outside_slide",
          elementId: id,
          resolved: { ...bounds },
          slideRect: { x: 0, y: 0, w: slideW, h: slideH },
          message: `Element "${id}" extends outside the slide bounds (${slideW}x${slideH})`
        });
      }
    }
  }
  if (sr) {
    let contentMinX = Infinity, contentMinY = Infinity;
    let contentMaxX = -Infinity, contentMaxY = -Infinity;
    let hasContentElements = false;
    for (const id of sortedOrder) {
      const el2 = mustGet(flatMap, id, `flatMap missing element in content-area check: ${id}`);
      if (el2.props.layer !== "content") continue;
      if (groupParent.has(id)) continue;
      if (el2.type === "vstack" || el2.type === "hstack") continue;
      const bounds = mustGet(resolvedBounds, id, `resolvedBounds missing element in content-area check: ${id}`);
      hasContentElements = true;
      contentMinX = Math.min(contentMinX, bounds.x);
      contentMinY = Math.min(contentMinY, bounds.y);
      contentMaxX = Math.max(contentMaxX, bounds.x + bounds.w);
      contentMaxY = Math.max(contentMaxY, bounds.y + bounds.h);
    }
    if (hasContentElements) {
      const contentW = contentMaxX - contentMinX;
      const contentH = contentMaxY - contentMinY;
      const contentArea = contentW * contentH;
      const safeArea = sr.w * sr.h;
      const usageRatio = contentArea / safeArea;
      if (usageRatio < 0.4) {
        warnings.push({
          type: "content_clustered",
          usageRatio,
          contentBounds: { x: contentMinX, y: contentMinY, w: contentW, h: contentH },
          message: `Content uses only ${(usageRatio * 100).toFixed(1)}% of the safe zone \u2014 content may be too clustered`
        });
      } else if (usageRatio > 0.95) {
        warnings.push({
          type: "content_no_breathing_room",
          usageRatio,
          contentBounds: { x: contentMinX, y: contentMinY, w: contentW, h: contentH },
          message: `Content uses ${(usageRatio * 100).toFixed(1)}% of the safe zone \u2014 no breathing room`
        });
      }
    }
  }
  for (const [id, el2] of flatMap) {
    if (!isPanelElement(el2)) continue;
    const config = el2._panelConfig;
    if (!config || config.panelH == null) continue;
    const childStack = (el2.children || [])[1];
    if (!childStack) continue;
    const vstackChildIds = stackChildren.get(childStack.id) || [];
    let naturalContentH = 0;
    const vstackGap = resolveSpacing(childStack.props?.gap ?? 0);
    for (let i = 0; i < vstackChildIds.length; i++) {
      const cs = resolvedSizes.get(vstackChildIds[i]);
      if (cs) {
        naturalContentH += cs.h;
        if (i > 0) naturalContentH += vstackGap;
      }
    }
    const contentH = naturalContentH + 2 * config.padding;
    const authoredH = config.panelH;
    if (contentH > authoredH) {
      warnings.push({
        type: "panel_overflow",
        elementId: id,
        contentHeight: contentH,
        authoredHeight: authoredH,
        overflow: contentH - authoredH,
        message: `Panel '${id}' content (${contentH}px) exceeds authored height (${authoredH}px) by ${contentH - authoredH}px. Remove explicit h to let panel size to content.`
      });
    }
  }
  for (const [id, el2] of flatMap) {
    if (el2.type !== "hstack") continue;
    const align = el2.props.align || "top";
    if (align === "stretch") continue;
    const childIds = stackChildren.get(id) || [];
    if (childIds.length < 2) continue;
    const childHeights = [];
    for (const cid of childIds) {
      const bounds = resolvedBounds.get(cid);
      if (bounds) childHeights.push(bounds.h);
    }
    if (childHeights.length < 2) continue;
    const maxH = Math.max(...childHeights);
    const minH = Math.min(...childHeights);
    if (maxH - minH > 5) {
      warnings.push({
        type: "ragged_bottom",
        elementId: id,
        childHeights,
        maxHeight: maxH,
        message: `hstack '${id}' has children with unequal heights (${minH}-${maxH}px). Consider align: 'stretch' for equal-height cards.`
      });
    }
  }
  for (const [id, el2] of flatMap) {
    if (el2.type !== "group") continue;
    if (el2.props.bounds === "hug") continue;
    if (el2._compound) continue;
    const anchor = el2.props.anchor;
    if (!anchor || typeof anchor !== "string" || !anchor.includes("c")) continue;
    if (anchor[1] !== "c") continue;
    const childIds = groupChildren.get(id) || [];
    if (childIds.length === 0) continue;
    const authoredW = el2.props.w;
    if (authoredW === void 0 || authoredW === null) continue;
    let contentMinX = Infinity, contentMaxX = -Infinity;
    let validChildren = 0;
    for (const cid of childIds) {
      const cb = resolvedBounds.get(cid);
      if (!cb) continue;
      contentMinX = Math.min(contentMinX, cb.x);
      contentMaxX = Math.max(contentMaxX, cb.x + cb.w);
      validChildren++;
    }
    if (validChildren === 0) continue;
    const contentW = contentMaxX - contentMinX;
    if (Math.abs(authoredW - contentW) > 20) {
      warnings.push({
        type: "off_center_assembly",
        elementId: id,
        authoredW,
        contentW,
        message: `Group '${id}' has authored w=${authoredW} but content spans ${contentW}px. Consider bounds: 'hug' for accurate centering.`
      });
    }
  }
  return {
    elements: sceneElements,
    rootIds,
    transforms: resolvedTransforms,
    warnings,
    errors,
    collisions
  };
}
async function layout(slideDefinition, options = {}) {
  const errors = [];
  const warnings = [];
  const elements = slideDefinition.elements || [];
  const transforms = slideDefinition.transforms || [];
  const collisionThreshold = options.collisionThreshold ?? 0;
  const { flatMap, groupParent, stackParent, stackChildren, groupChildren, panelInternals, duplicateIds } = flattenElements(elements);
  for (const [id, el2] of flatMap) {
    if (typeof el2.props._rel === "string") {
      console.warn(
        `SlideKit warning: Element "${id}" has "_rel" as a top-level prop \u2014 this usually means a positioning function (below(), rightOf(), alignTopWith(), etc.) was spread (...below()) instead of assigned to x or y. Use y: below(...) or x: rightOf(...) instead.`
      );
    }
  }
  for (const [id, count] of duplicateIds) {
    errors.push({
      type: "duplicate-id",
      id,
      count,
      message: `Duplicate id '${id}': ${count} elements share this id. Each element must have a unique id.`
    });
  }
  const { authoredSpecs, resolvedSizes, hasErrors } = await resolveIntrinsicSizes(flatMap, stackChildren, groupChildren, errors, warnings);
  if (hasErrors) {
    return {
      elements: {},
      transforms: deepClone(transforms),
      warnings,
      errors,
      collisions: []
    };
  }
  const phase2Result = await resolvePositions(flatMap, stackParent, stackChildren, resolvedSizes, authoredSpecs, warnings, errors);
  if (!phase2Result) {
    return {
      elements: {},
      transforms: deepClone(transforms),
      warnings,
      errors,
      collisions: []
    };
  }
  const { resolvedBounds, sortedOrder } = phase2Result;
  await checkOverflowPolicies(sortedOrder, flatMap, authoredSpecs, resolvedBounds, warnings, errors);
  state.transformIdCounter = 0;
  const resolvedTransforms = [];
  for (const t of transforms) {
    if (!t || typeof t !== "object") {
      resolvedTransforms.push(t);
      continue;
    }
    const transformCopy = deepClone(t);
    if (!transformCopy._transformId) {
      transformCopy._transformId = nextTransformId();
    }
    resolvedTransforms.push(transformCopy);
  }
  const preTransformBounds = /* @__PURE__ */ new Map();
  for (const [id, b] of resolvedBounds) {
    preTransformBounds.set(id, { x: b.x, y: b.y, w: b.w, h: b.h });
  }
  for (const t of resolvedTransforms) {
    if (!t || typeof t._transform !== "string") {
      warnings.push({
        type: "invalid_transform_object",
        transform: t,
        message: "Invalid object in transforms array. Each transform must be created by a SlideKit transform function."
      });
      continue;
    }
    const transformWarnings = applyTransform(t, resolvedBounds, flatMap);
    for (const w of transformWarnings) {
      warnings.push(w);
    }
  }
  for (const [id, el2] of flatMap) {
    if (!isPanelElement(el2)) continue;
    const config = el2._panelConfig;
    if (!config) continue;
    const preBounds = preTransformBounds.get(id);
    const postBounds = resolvedBounds.get(id);
    if (!preBounds || !postBounds) continue;
    const hChanged = postBounds.h !== preBounds.h;
    const wChanged = postBounds.w !== preBounds.w;
    if (!hChanged && !wChanged) continue;
    const { padding } = config;
    const children = el2.children || [];
    if (children.length < 2) continue;
    const bgRect = children[0];
    const innerVstack = children[1];
    const bgBounds = resolvedBounds.get(bgRect.id);
    if (bgBounds) {
      bgBounds.x = postBounds.x;
      bgBounds.y = postBounds.y;
      bgBounds.w = postBounds.w;
      bgBounds.h = postBounds.h;
    }
    const bgSizes = resolvedSizes.get(bgRect.id);
    if (bgSizes) {
      bgSizes.w = postBounds.w;
      bgSizes.h = postBounds.h;
    }
    const vstackBounds = resolvedBounds.get(innerVstack.id);
    if (vstackBounds) {
      const newContentW = Math.max(0, postBounds.w - 2 * padding);
      const newContentH = Math.max(0, postBounds.h - 2 * padding);
      vstackBounds.x = postBounds.x + padding;
      vstackBounds.w = newContentW;
      const vAlign = innerVstack.props?.vAlign;
      const vstackChildIds = stackChildren.get(innerVstack.id) || [];
      const vstackGap = innerVstack.props?.gap || 0;
      let intrinsicH = 0;
      for (let ci = 0; ci < vstackChildIds.length; ci++) {
        const cBounds = resolvedBounds.get(vstackChildIds[ci]);
        if (cBounds) {
          intrinsicH += cBounds.h;
          if (ci > 0) intrinsicH += vstackGap;
        }
      }
      if (vAlign && vAlign !== "top" && newContentH > intrinsicH) {
        const oldContentH = Math.max(0, preBounds.h - 2 * padding);
        const oldSlack = Math.max(0, oldContentH - intrinsicH);
        const oldOffsetY = vAlign === "center" ? oldSlack / 2 : oldSlack;
        const newSlack = newContentH - intrinsicH;
        const newOffsetY = vAlign === "center" ? newSlack / 2 : newSlack;
        const deltaY = newOffsetY - oldOffsetY;
        for (const cid of vstackChildIds) {
          const cBounds = resolvedBounds.get(cid);
          if (cBounds) {
            cBounds.y += deltaY;
          }
        }
        vstackBounds.y = postBounds.y + padding;
        vstackBounds.h = newContentH;
      } else {
        vstackBounds.y = postBounds.y + padding;
        vstackBounds.h = newContentH;
      }
    }
    if (wChanged) {
      warnings.push({
        type: "transform_panel_width_changed",
        elementId: id,
        oldWidth: preBounds.w,
        newWidth: postBounds.w,
        message: `Panel "${id}" width changed by transform (${preBounds.w} \u2192 ${postBounds.w}). Text wrapping may be inaccurate \u2014 re-measurement cannot run after transforms.`
      });
    }
  }
  {
    let heightsChanged = false;
    for (const [id, bounds] of resolvedBounds) {
      const preBounds = preTransformBounds.get(id);
      if (!preBounds) continue;
      if (bounds.w === preBounds.w) continue;
      const sizes = resolvedSizes.get(id);
      if (!sizes || !sizes.hMeasured) continue;
      const el2 = flatMap.get(id);
      if (!el2 || el2.type !== "el") continue;
      const html = el2.content || "";
      if (!html && (!el2.props.style || Object.keys(el2.props.style).length === 0)) continue;
      const metrics = await measure(html, {
        w: bounds.w,
        style: el2.props.style,
        className: el2.props.className
      });
      if (metrics.h !== bounds.h) {
        bounds.h = metrics.h;
        sizes.h = metrics.h;
        heightsChanged = true;
      }
    }
    if (heightsChanged) {
      for (const [stackId, childIds] of stackChildren) {
        const stackEl = flatMap.get(stackId);
        if (!stackEl) continue;
        const stackBounds = resolvedBounds.get(stackId);
        const stackSizes = resolvedSizes.get(stackId);
        if (!stackBounds || !stackSizes) continue;
        if (!stackSizes.hMeasured) continue;
        const gap = resolveSpacing(stackEl.props.gap ?? 0);
        if (stackEl.type === "vstack") {
          let totalH = 0;
          for (let i = 0; i < childIds.length; i++) {
            const cs = resolvedBounds.get(childIds[i]);
            if (cs) totalH += cs.h;
            if (i > 0) totalH += gap;
          }
          stackBounds.h = totalH;
          stackSizes.h = totalH;
        } else if (stackEl.type === "hstack") {
          let maxH = 0;
          for (const cid of childIds) {
            const cs = resolvedBounds.get(cid);
            if (cs && cs.h > maxH) maxH = cs.h;
          }
          stackBounds.h = maxH;
          stackSizes.h = maxH;
        }
      }
      for (const [id, el2] of flatMap) {
        if (!isPanelElement(el2)) continue;
        const config = el2._panelConfig;
        if (!config || config.panelH != null) continue;
        const panelChildren = el2.children || [];
        const childStack = panelChildren[1];
        const bgRect = panelChildren[0];
        if (!childStack) continue;
        const stackBounds = resolvedBounds.get(childStack.id);
        if (!stackBounds) continue;
        const autoH = stackBounds.h + 2 * config.padding;
        const panelBounds = resolvedBounds.get(id);
        const panelSizes = resolvedSizes.get(id);
        if (panelBounds) panelBounds.h = autoH;
        if (panelSizes) panelSizes.h = autoH;
        if (bgRect) {
          const bgBounds = resolvedBounds.get(bgRect.id);
          const bgSizes = resolvedSizes.get(bgRect.id);
          if (bgBounds) bgBounds.h = autoH;
          if (bgSizes) bgSizes.h = autoH;
        }
      }
    }
  }
  if (state.fontWarnings && state.fontWarnings.length > 0) {
    warnings.push(...state.fontWarnings);
    state.fontWarnings = [];
  }
  return finalize({
    sortedOrder,
    flatMap,
    authoredSpecs,
    resolvedBounds,
    resolvedSizes,
    stackParent,
    stackChildren,
    groupParent,
    groupChildren,
    panelInternals,
    preTransformBounds,
    resolvedTransforms,
    warnings,
    errors,
    collisionThreshold
  });
}
_setLayoutFn(layout);

// examples/slidekit-about/slides.ts
var C = {
  bg: "#0a0a1a",
  bgAlt: "#0f1029",
  accent1: "#00d4ff",
  // electric cyan
  accent2: "#7c5cbf",
  // violet
  accent3: "#ff6b9d",
  // coral
  accent4: "#00ff88",
  // mint green
  text: "#ffffff",
  textSec: "rgba(255,255,255,0.65)",
  textTer: "rgba(255,255,255,0.4)",
  glass: "rgba(255,255,255,0.04)",
  glassBorder: "rgba(255,255,255,0.08)",
  glassEmph: "rgba(255,255,255,0.07)",
  glassEmphBorder: "rgba(255,255,255,0.12)"
};
var FONT = "Inter";
var MONO = "'JetBrains Mono', monospace";
function mkEyebrow(text, id, color = C.accent1, extra = {}) {
  return el(
    `<p style="font-family:${FONT};font-size:20px;font-weight:600;color:${color};text-transform:uppercase;letter-spacing:3px;">${text}</p>`,
    { id, ...extra }
  );
}
function accentRule(id, extra = {}) {
  return el(
    `<div style="width:100%;height:100%;background:linear-gradient(90deg, ${C.accent1}, ${C.accent2});border-radius:2px;"></div>`,
    { id, w: 80, h: 3, ...extra }
  );
}
function badge2(text, id) {
  return el(
    `<span style="font-family:${FONT};font-size:18px;font-weight:600;color:${C.accent1};border:1px solid rgba(0,212,255,0.3);padding:8px 24px;border-radius:6px;display:inline-block;letter-spacing:0.04em;">${text}</span>`,
    { id, w: 220, h: 50 }
  );
}
function slideTitle(text, id, extra = {}) {
  return el(
    `<h2 style="font-family:${FONT};font-size:56px;font-weight:700;color:${C.text};line-height:1.2;">${text}</h2>`,
    { id, h: 75, ...extra }
  );
}
function bodyText(text, id, extra = {}) {
  return el(
    `<p style="font-family:${FONT};font-size:26px;font-weight:400;color:${C.textSec};line-height:1.6;">${text}</p>`,
    { id, ...extra }
  );
}
function codeText(text, id, extra = {}) {
  return el(
    `<pre style="font-family:${MONO};font-size:22px;color:${C.accent4};line-height:1.5;margin:0;white-space:pre;">${text}</pre>`,
    { id, ...extra }
  );
}
function caption(text, id, extra = {}) {
  return el(
    `<p style="font-family:${FONT};font-size:18px;font-weight:400;color:${C.textTer};line-height:1.4;">${text}</p>`,
    { id, ...extra }
  );
}
async function run() {
  await init({
    slide: { w: 1920, h: 1080 },
    safeZone: { left: 120, right: 120, top: 90, bottom: 90 },
    minFontSize: 12,
    fonts: [
      { family: "Inter", weights: [300, 400, 600, 700, 800], source: "google" },
      { family: "JetBrains Mono", weights: [400, 600], source: "google" }
    ]
  });
  const safe = safeRect();
  const slides = [
    // ================================================================
    // SLIDE 1: TITLE — "What is SlideKit?"
    // ================================================================
    {
      id: "title",
      background: C.bg,
      notes: "SlideKit is a coordinate-based layout engine for presentations, designed so AI agents can author slides deterministically. This deck is itself built with SlideKit.",
      elements: [
        // Background radial glow (bg layer)
        el('<div style="width:100%;height:100%;background:radial-gradient(ellipse at 50% 45%, rgba(0,212,255,0.08) 0%, transparent 55%);"></div>', {
          id: "s1-glow",
          x: 0,
          y: 0,
          w: 1920,
          h: 1080,
          layer: "bg"
        }),
        // Eyebrow: INTRODUCING
        mkEyebrow("Introducing", "s1-eyebrow", C.accent1, {
          x: 960,
          y: 300,
          anchor: "bc",
          w: 400,
          style: { textAlign: "center" }
        }),
        // Hero title: SlideKit (96px)
        el(`<h1 style="font-family:${FONT};font-size:96px;font-weight:800;color:${C.text};line-height:1.0;text-align:center;">SlideKit</h1>`, {
          id: "s1-title",
          x: 960,
          y: below("s1-eyebrow", { gap: "md" }),
          w: 1e3,
          h: 120,
          anchor: "tc"
        }),
        // Accent rule below title
        accentRule("s1-rule", {
          x: 960 - 40,
          y: below("s1-title", { gap: "lg" })
        }),
        // Tagline
        el(`<p style="font-family:${FONT};font-size:30px;font-weight:400;color:${C.textSec};line-height:1.5;text-align:center;">Coordinate-based slide layout for the AI\xA0era</p>`, {
          id: "s1-tagline",
          x: 960,
          y: below("s1-rule", { gap: "md" }),
          w: 900,
          anchor: "tc"
        }),
        // Bottom badges row
        hstack([
          badge2("Deterministic", "s1-badge1"),
          el(`<span style="font-family:${FONT};font-size:24px;color:${C.textTer};">\xB7</span>`, {
            id: "s1-dot1",
            w: 30,
            h: 50
          }),
          badge2("Measurable", "s1-badge2"),
          el(`<span style="font-family:${FONT};font-size:24px;color:${C.textTer};">\xB7</span>`, {
            id: "s1-dot2",
            w: 30,
            h: 50
          }),
          badge2("Validated", "s1-badge3")
        ], {
          id: "s1-badges",
          x: 960,
          y: 880,
          anchor: "bc",
          gap: "md",
          align: "middle"
        }),
        // Decorative rotated rectangle (bottom-right)
        el('<div style="width:100%;height:100%;background:linear-gradient(135deg, rgba(0,212,255,0.15), rgba(124,92,191,0.15));border-radius:4px;"></div>', {
          id: "s1-deco-rect",
          x: 1650,
          y: 850,
          w: 200,
          h: 8,
          rotate: 15,
          opacity: 0.12,
          layer: "bg"
        })
      ]
    },
    // ================================================================
    // SLIDE 2: THE PROBLEM — "CSS Wasn't Built for Slides"
    // ================================================================
    {
      id: "the-problem",
      background: C.bg,
      notes: "CSS layout was designed for reflowing documents. Slides are fixed canvases. When auto-layout decides wrong, you debug cascading interactions instead of designing.",
      elements: (() => {
        const { left, right } = splitRect(safe, { ratio: 0.5, gap: 60 });
        const leftElements = [
          // Left column: text content
          vstack([
            mkEyebrow("The Problem", "s2-eyebrow", C.accent3),
            slideTitle("CSS Wasn\u2019t Built for Slides", "s2-title"),
            accentRule("s2-rule"),
            bodyText(
              "CSS layout was designed for reflowing documents that adapt to variable screen sizes. Slides are the opposite\xA0\u2014 fixed canvases where every element has a deliberate position.",
              "s2-body1"
            ),
            bodyText(
              'When you use auto-layout for slides, the <strong style="color:#ffffff;">browser decides</strong> where things go. When it decides wrong, you debug cascading interactions and emergent reflow.',
              "s2-body2"
            )
          ], {
            id: "s2-left-stack",
            x: left.x,
            y: left.y,
            w: left.w,
            gap: "md",
            align: "left"
          })
        ];
        const chaosPanel = (label, idx) => panel([
          el(`<p style="font-family:${MONO};font-size:20px;color:${C.accent3};line-height:1.4;">${label}</p>`, {
            id: `s2-chaos-label${idx}`,
            w: "fill"
          })
        ], {
          id: `s2-chaos-panel${idx}`,
          w: right.w,
          padding: "sm",
          gap: 6,
          fill: "rgba(255,107,157,0.08)",
          radius: 12,
          border: "1px solid rgba(255,107,157,0.2)"
        });
        const panelGap = 80;
        const rightElements = [
          // Three chaos panels
          (() => {
            const p = chaosPanel("flex-grow: 1 ???", 1);
            p.props.x = right.x;
            p.props.y = right.y + 60;
            return p;
          })(),
          (() => {
            const p = chaosPanel("margin collapse ???", 2);
            p.props.x = right.x;
            p.props.y = right.y + 60 + panelGap + 50;
            return p;
          })(),
          (() => {
            const p = chaosPanel("min-width override ???", 3);
            p.props.x = right.x;
            p.props.y = right.y + 60 + (panelGap + 50) * 2;
            return p;
          })(),
          // Connectors between chaos panels (curved, both arrows — chaos!)
          connect("s2-chaos-panel1", "s2-chaos-panel2", {
            id: "s2-conn1",
            type: "curved",
            arrow: "both",
            color: C.accent3,
            thickness: 2,
            dash: [6, 4]
          }),
          connect("s2-chaos-panel2", "s2-chaos-panel3", {
            id: "s2-conn2",
            type: "curved",
            arrow: "both",
            color: C.accent3,
            thickness: 2,
            dash: [6, 4]
          }),
          connect("s2-chaos-panel1", "s2-chaos-panel3", {
            id: "s2-conn3",
            type: "curved",
            arrow: "both",
            color: "rgba(255,107,157,0.4)",
            thickness: 1,
            fromAnchor: "br",
            toAnchor: "tr"
          })
        ];
        return [...leftElements, ...rightElements];
      })()
    },
    // ================================================================
    // SLIDE 3: THE SOLUTION — "Just Say Where Things Go"
    // ================================================================
    {
      id: "the-solution",
      background: C.bgAlt,
      notes: "SlideKit uses explicit coordinates. You say where an element goes and it goes there. No surprises, no debugging layout engine quirks.",
      elements: (() => {
        const { left, right } = splitRect(safe, { ratio: 0.45, gap: 60 });
        return [
          // Left side: eyebrow + title + code block
          vstack([
            mkEyebrow("The Solution", "s3-eyebrow", C.accent1),
            slideTitle("Just Say Where Things Go", "s3-title"),
            accentRule("s3-rule"),
            // Code block panel
            panel([
              codeText(
                `el(<span style="color:${C.accent3};">'Hello World'</span>, {
  <span style="color:${C.accent1};">x</span>: 200, <span style="color:${C.accent1};">y</span>: 300,
  <span style="color:${C.accent1};">w</span>: 800, <span style="color:${C.accent1};">h</span>: 400
})`,
                "s3-code",
                { w: "fill" }
              )
            ], {
              id: "s3-code-panel",
              w: left.w,
              padding: "md",
              gap: "sm",
              fill: "rgba(0,255,136,0.04)",
              radius: 12,
              border: `1px solid rgba(0,255,136,0.15)`
            })
          ], {
            id: "s3-left-stack",
            x: left.x,
            y: left.y,
            w: left.w,
            gap: "md",
            align: "left"
          }),
          // Right side: visual representation
          group([
            // Canvas outline
            el('<div style="width:100%;height:100%;border:1px solid rgba(255,255,255,0.15);border-radius:4px;"></div>', {
              id: "s3-canvas-outline",
              x: 0,
              y: 0,
              w: 560,
              h: 315
            }),
            // Placed element (proportionally mapped: 200/1920*560≈58, 300/1080*315≈87)
            el('<div style="width:100%;height:100%;background:rgba(0,80,120,0.6);border:1px solid rgba(0,212,255,0.4);border-radius:4px;display:flex;align-items:center;justify-content:center;"><span style="font-family:Inter;font-size:18px;color:#ffffff;">Hello World</span></div>', {
              id: "s3-placed-el",
              x: 58,
              y: 87,
              w: 233,
              h: 116
            }),
            // Coordinate labels
            el(`<span style="font-family:${MONO};font-size:14px;color:${C.accent1};line-height:1.4;">(200, 300)</span>`, {
              id: "s3-coord-tl",
              x: 58,
              y: 68,
              w: 150,
              h: 54
            }),
            el(`<span style="font-family:${MONO};font-size:14px;color:${C.accent1};line-height:1.4;">(1000, 700)</span>`, {
              id: "s3-coord-br",
              x: 233 + 58 - 10,
              y: 87 + 116 + 12,
              w: 150,
              h: 54
            })
          ], {
            id: "s3-canvas-group",
            x: right.x + right.w / 2,
            y: right.y + 80,
            w: 560,
            h: 340,
            bounds: "hug",
            anchor: "tc"
          }),
          // Caption below canvas
          caption(
            "\u201CYou say where. It goes there. No\xA0surprises.\u201D",
            "s3-caption",
            {
              x: centerHWith("s3-canvas-group"),
              y: below("s3-canvas-group", { gap: "lg" }),
              w: 500,
              anchor: "tc",
              style: { textAlign: "center", fontStyle: "italic" }
            }
          )
        ];
      })()
    },
    // ================================================================
    // SLIDE 4: WHY AI AGENTS LOVE IT — "LLMs Think in Coordinates"
    // ================================================================
    {
      id: "for-ai",
      background: C.bg,
      notes: "AI agents can reason about geometry. They cannot simulate browser layout engines. Coordinates are deterministic \u2014 same input always produces same output.",
      elements: (() => {
        const cardW = (safe.w - 80) / 2;
        return [
          // Title stack
          vstack([
            mkEyebrow("Designed for AI", "s4-eyebrow", C.accent1),
            slideTitle("LLMs Think in Coordinates", "s4-title")
          ], {
            id: "s4-title-stack",
            x: safe.x,
            y: safe.y,
            w: safe.w,
            gap: "sm",
            align: "left"
          }),
          // Two comparison cards
          hstack([
            // CSS card (bad)
            panel([
              el(`<p style="font-family:${FONT};font-size:24px;font-weight:700;color:${C.accent3};">\u274C CSS Approach</p>`, {
                id: "s4-css-heading",
                w: "fill"
              }),
              codeText(
                `display: flex;
gap: 1rem;
flex-wrap: wrap;
min-width: 200px;`,
                "s4-css-code",
                { w: "fill" }
              ),
              el(`<p style="font-family:${FONT};font-size:22px;color:${C.textSec};line-height:1.5;">\u2192 Where does it end up? \u{1F937}</p>`, {
                id: "s4-css-result",
                w: "fill"
              })
            ], {
              id: "s4-css-card",
              w: cardW,
              padding: "lg",
              gap: "md",
              fill: "rgba(255,107,157,0.06)",
              radius: 16,
              border: "1px solid rgba(255,107,157,0.2)"
            }),
            // SlideKit card (good)
            panel([
              el(`<p style="font-family:${FONT};font-size:24px;font-weight:700;color:${C.accent4};">\u2705 SlideKit Approach</p>`, {
                id: "s4-sk-heading",
                w: "fill"
              }),
              codeText(
                `x: 200, y: 300,
w: 800, h: 400`,
                "s4-sk-code",
                { w: "fill" }
              ),
              el(`<p style="font-family:${FONT};font-size:22px;color:${C.textSec};line-height:1.5;">\u2192 Exactly at (200,\xA0300). Always.</p>`, {
                id: "s4-sk-result",
                w: "fill"
              })
            ], {
              id: "s4-sk-card",
              w: cardW,
              padding: "lg",
              gap: "md",
              fill: "rgba(0,255,136,0.06)",
              radius: 16,
              border: "1px solid rgba(0,255,136,0.2)"
            })
          ], {
            id: "s4-cards",
            x: safe.x,
            y: below("s4-title-stack", { gap: "xl" }),
            w: safe.w,
            gap: "lg",
            align: "stretch"
          }),
          // Bottom quote
          el(`<p style="font-family:${FONT};font-size:24px;font-weight:400;color:${C.textTer};line-height:1.5;text-align:center;font-style:italic;">\u201CAI agents can reason about geometry. They cannot simulate browser layout engines.\u201D</p>`, {
            id: "s4-quote",
            x: safe.x,
            y: below("s4-cards", { gap: "xl" }),
            w: safe.w,
            anchor: "tl"
          })
        ];
      })()
    },
    // ================================================================
    // SLIDE 5: THE ANCHOR SYSTEM — "Nine Points of Control"
    // ================================================================
    {
      id: "anchor-system",
      background: C.bg,
      notes: "The anchor property controls which point of an element sits at (x, y). Nine anchor points give precise control: tl, tc, tr, cl, cc, cr, bl, bc, br.",
      elements: (() => {
        const anchors = [
          { key: "tl", col: 0, row: 0 },
          { key: "tc", col: 1, row: 0 },
          { key: "tr", col: 2, row: 0 },
          { key: "cl", col: 0, row: 1 },
          { key: "cc", col: 1, row: 1 },
          { key: "cr", col: 2, row: 1 },
          { key: "bl", col: 0, row: 2 },
          { key: "bc", col: 1, row: 2 },
          { key: "br", col: 2, row: 2 }
        ];
        const { left: leftR, right: rightR } = splitRect(safe, { ratio: 0.55, gap: 80 });
        const diagW = 420;
        const diagH = 260;
        const dotR = 10;
        const colSpacing = diagW / 2;
        const rowSpacing = diagH / 2;
        const diagPad = 40;
        const dotElements = [];
        const labelElements = [];
        for (const a of anchors) {
          const dx = a.col * colSpacing + diagPad;
          const dy = a.row * rowSpacing + diagPad;
          const dotId = `s5-dot-${a.key}`;
          const labelId = `s5-label-${a.key}`;
          dotElements.push(
            el(`<div style="width:${dotR * 2}px;height:${dotR * 2}px;border-radius:50%;background:${C.accent1};box-shadow:0 0 8px ${C.accent1};"></div>`, {
              id: dotId,
              x: dx - dotR,
              y: dy - dotR,
              w: dotR * 2,
              h: dotR * 2
            })
          );
          labelElements.push(
            el(`<span style="font-family:${MONO};font-size:16px;color:${C.text};">${a.key}</span>`, {
              id: labelId,
              x: dx + dotR + 10,
              y: dy - 8,
              w: 40,
              h: 20
            })
          );
        }
        const diagBg = el(
          '<div style="width:100%;height:100%;border:1px solid rgba(255,255,255,0.12);border-radius:8px;background:rgba(255,255,255,0.02);"></div>',
          {
            id: "s5-diag-bg",
            x: diagPad - 30,
            y: diagPad - 30,
            w: diagW + 60,
            h: diagH + 60
          }
        );
        const demoAnchors = ["tl", "cc", "br"];
        const demoW = 220;
        const demoH = 150;
        const blueW = 90;
        const blueH = 60;
        const demoGroups = [];
        const dotRelX = demoW / 2;
        const dotRelY = demoH / 2;
        for (let i = 0; i < demoAnchors.length; i++) {
          const ak = demoAnchors[i];
          const groupId = `s3-anchor-demo-${i}`;
          const container = el('<div style="width:100%;height:100%;border:1px solid rgba(255,255,255,0.12);border-radius:4px;background:rgba(255,255,255,0.05);"></div>', {
            id: `${groupId}-bg`,
            x: 0,
            y: 0,
            w: demoW,
            h: demoH
          });
          const dot = el(`<div style="width:12px;height:12px;border-radius:50%;background:${C.accent3};box-shadow:0 0 8px ${C.accent3};position:relative;z-index:2;"></div>`, {
            id: `${groupId}-dot`,
            x: dotRelX - 6,
            y: dotRelY - 6,
            w: 12,
            h: 12
          });
          const blueBox = el('<div style="width:100%;height:100%;background:rgba(0,212,255,0.2);border:1px solid rgba(0,212,255,0.5);border-radius:3px;"></div>', {
            id: `${groupId}-blue`,
            x: dotRelX,
            y: dotRelY,
            w: blueW,
            h: blueH,
            anchor: ak
          });
          const label = el(`<span style="font-family:${MONO};font-size:18px;color:${C.accent1};text-align:center;display:block;">anchor: '${ak}'</span>`, {
            id: `${groupId}-label`,
            x: 0,
            y: demoH + 12,
            w: demoW,
            h: 28
          });
          demoGroups.push(
            group([container, blueBox, dot, label], {
              id: groupId,
              x: 0,
              y: below("s5-demo-heading", { gap: "lg" }),
              w: demoW,
              h: demoH + 12 + 28
            })
          );
        }
        return [
          // Title area
          vstack([
            mkEyebrow("Positioning", "s5-eyebrow", C.accent1),
            slideTitle("The Anchor System", "s5-title"),
            bodyText("Nine points of control for precise element placement", "s5-subtitle")
          ], {
            id: "s5-title-stack",
            x: safe.x,
            y: safe.y,
            w: safe.w,
            gap: "sm",
            align: "left"
          }),
          // Anchor diagram group
          group([diagBg, ...dotElements, ...labelElements], {
            id: "s5-diagram",
            x: leftR.x + leftR.w / 2,
            y: below("s5-title-stack", { gap: "xl" }),
            w: diagW + 60 + diagPad,
            h: diagH + 60 + diagPad,
            bounds: "hug",
            anchor: "tc"
          }),
          // Caption below diagram
          caption(
            "Each anchor determines which point of the element sits at (x, y)",
            "s5-diagram-caption",
            {
              x: centerHWith("s5-diagram"),
              y: below("s5-diagram", { gap: "md" }),
              w: 500,
              anchor: "tc",
              style: { textAlign: "center" }
            }
          ),
          // Right side: three demo examples
          el(`<p style="font-family:${FONT};font-size:28px;font-weight:600;color:${C.text};">Same (x, y), different anchor:</p>`, {
            id: "s5-demo-heading",
            x: rightR.x,
            y: below("s5-title-stack", { gap: "xl" }),
            w: rightR.w,
            h: 40
          }),
          ...demoGroups
        ];
      })(),
      transforms: [
        alignTop(["s3-anchor-demo-0", "s3-anchor-demo-1", "s3-anchor-demo-2"]),
        distributeH(["s3-anchor-demo-0", "s3-anchor-demo-1", "s3-anchor-demo-2"], {
          startX: safe.x + safe.w * 0.55 + 80,
          endX: safe.x + safe.w
        })
      ]
    },
    // ================================================================
    // SLIDE 6: RELATIVE POSITIONING — "Elements That Know About Each Other"
    // ================================================================
    {
      id: "relative-positioning",
      background: C.bgAlt,
      notes: "SlideKit resolves relative positions through a dependency graph with topological sort.",
      elements: (() => {
        const boxW = 140;
        const boxH = 70;
        const mkBox = (label, id, color) => el(`<div style="width:100%;height:100%;background:rgba(${color},0.15);border:2px solid ${color};border-radius:8px;display:flex;align-items:center;justify-content:center;"><span style="font-family:${MONO};font-size:22px;font-weight:700;color:${color};">${label}</span></div>`, { id, w: boxW, h: boxH });
        const codeLabel = (text, id, color, extra = {}) => el(`<span style="font-family:${MONO};font-size:15px;color:${color};">${text}</span>`, { id, w: 340, h: 22, ...extra });
        const ciRect = { x: 1400, y: 740, w: 260, h: 140 };
        const ciPos = centerIn(ciRect);
        return [
          // Title
          vstack([
            mkEyebrow("Relative Positioning", "s6-eyebrow", C.accent1),
            slideTitle("Elements That Know About Each Other", "s6-title")
          ], {
            id: "s6-title-stack",
            x: safe.x,
            y: safe.y,
            w: safe.w,
            gap: "sm",
            align: "left"
          }),
          // Box A — fixed anchor
          (() => {
            const b = mkBox("A", "s6-boxA", C.accent1);
            b.props.x = 700;
            b.props.y = 480;
            return b;
          })(),
          // Box B — below A
          (() => {
            const b = mkBox("B", "s6-boxB", C.accent2);
            b.props.x = 700;
            b.props.y = below("s6-boxA", { gap: 150 });
            return b;
          })(),
          // Box C — right of A, aligned top with A
          (() => {
            const b = mkBox("C", "s6-boxC", C.accent3);
            b.props.x = rightOf("s6-boxA", { gap: 40 });
            b.props.y = alignTopWith("s6-boxA");
            return b;
          })(),
          // Box D — left of A, above A
          (() => {
            const b = mkBox("D", "s6-boxD", C.accent4);
            b.props.x = leftOf("s6-boxA", { gap: 40 });
            b.props.y = above("s6-boxA", { gap: "lg" });
            return b;
          })(),
          // Box E — placed between A and B, offset right
          (() => {
            const b = mkBox("E", "s6-boxE", "rgba(255,255,255,0.6)");
            b.props.x = 700;
            b.props.y = between("s6-boxA", "s6-boxB", { axis: "y" });
            return b;
          })(),
          // Connectors
          connect("s6-boxA", "s6-boxB", {
            id: "s6-connAB",
            type: "elbow",
            fromAnchor: "cl",
            toAnchor: "cl",
            arrow: "end",
            color: C.accent2,
            thickness: 2
          }),
          connect("s6-boxA", "s6-boxC", {
            id: "s6-connAC",
            type: "straight",
            arrow: "end",
            color: C.accent3,
            thickness: 2
          }),
          // Code labels next to each box
          codeLabel("below('A', {gap:150})", "s6-labelB", C.accent2, {
            x: leftOf("s6-boxB", { gap: "md" }),
            y: centerVWith("s6-boxB"),
            style: { textAlign: "right" }
          }),
          codeLabel("rightOf('A') + alignTopWith('A')", "s6-labelC", C.accent3, {
            x: rightOf("s6-boxC", { gap: "md" }),
            y: centerVWith("s6-boxC")
          }),
          codeLabel("leftOf('A') + above('A')", "s6-labelD", C.accent4, {
            x: leftOf("s6-boxD", { gap: "md" }),
            y: centerVWith("s6-boxD"),
            style: { textAlign: "right" }
          }),
          codeLabel("between('A', 'B', {axis:'y'})", "s6-labelE", C.textSec, {
            x: rightOf("s6-boxE", { gap: "md" }),
            y: centerVWith("s6-boxE")
          }),
          // centerIn() demo — outlined rect with centered label
          el('<div style="width:100%;height:100%;border:2px dashed rgba(0,212,255,0.3);border-radius:8px;"></div>', {
            id: "s6-centerRect",
            x: ciRect.x,
            y: ciRect.y,
            w: ciRect.w,
            h: ciRect.h
          }),
          el(`<span style="font-family:${MONO};font-size:16px;color:${C.accent1};text-align:center;display:block;">centerIn(rect)</span>`, {
            id: "s6-centerLabel",
            x: ciPos.x,
            y: ciPos.y,
            w: 160,
            h: 24,
            anchor: "cc"
          }),
          // Caption for centerIn
          caption("Position a label dead-center inside any rect", "s6-centerCaption", {
            x: ciRect.x,
            y: ciRect.y + ciRect.h + 12,
            w: ciRect.w,
            h: 22,
            style: { textAlign: "center" }
          })
        ];
      })()
    },
    // ================================================================
    // SLIDE 7: STACK LAYOUTS — "Vertical & Horizontal Flow"
    // ================================================================
    {
      id: "stack-layouts",
      background: C.bg,
      notes: "Stacks resolve to absolute coordinates \u2014 they're syntactic sugar over the coordinate system, not CSS flexbox.",
      elements: (() => {
        const { left, right } = splitRect(safe, { ratio: 0.48, gap: 60 });
        const bar = (id, color, props) => el(`<div style="width:100%;height:100%;background:${color};border-radius:4px;"></div>`, { id, ...props });
        const sectionLabel = (text, id, color, extra = {}) => el(`<p style="font-family:${FONT};font-size:28px;font-weight:700;color:${color};">${text}</p>`, { id, w: 300, h: 36, ...extra });
        const modeLabel = (text, id) => el(`<span style="font-family:${MONO};font-size:14px;color:${C.textTer};">${text}</span>`, { id, w: 120, h: 20 });
        const vstackAligns = ["left", "center", "right", "stretch"];
        const vstackDemos = [];
        const vstackPanelIds = [];
        for (let i = 0; i < vstackAligns.length; i++) {
          const align = vstackAligns[i];
          const panelId = `s7-vs-panel-${align}`;
          const isStretch = align === "stretch";
          vstackPanelIds.push(panelId);
          const barA = isStretch ? { h: 16 } : { w: 100, h: 16 };
          const barB = isStretch ? { h: 16 } : { w: 60, h: 16 };
          const barC = isStretch ? { h: 16 } : { w: 130, h: 16 };
          vstackDemos.push(
            panel([
              modeLabel(align, `s7-vs-lbl-${align}`),
              vstack([
                bar(`s7-vs-${align}-a`, C.accent1, barA),
                bar(`s7-vs-${align}-b`, C.accent2, barB),
                bar(`s7-vs-${align}-c`, C.accent3, barC)
              ], {
                id: `s7-vs-${align}`,
                w: isStretch ? "fill" : 160,
                gap: "sm",
                align
              })
            ], {
              id: panelId,
              w: left.w,
              padding: "sm",
              gap: "sm",
              fill: C.glass,
              radius: 12,
              border: `1px solid ${C.glassBorder}`
            })
          );
        }
        const hstackAligns = ["top", "middle", "bottom", "stretch"];
        const hstackDemos = [];
        for (let i = 0; i < hstackAligns.length; i++) {
          const align = hstackAligns[i];
          const isStretch = align === "stretch";
          const barA = isStretch ? { w: 30 } : { w: 30, h: 50 };
          const barB = isStretch ? { w: 30 } : { w: 30, h: 30 };
          const barC = isStretch ? { w: 30 } : { w: 30, h: 70 };
          hstackDemos.push(
            panel([
              modeLabel(align, `s7-hs-lbl-${align}`),
              hstack([
                bar(`s7-hs-${align}-a`, C.accent1, barA),
                bar(`s7-hs-${align}-b`, C.accent2, barB),
                bar(`s7-hs-${align}-c`, C.accent3, barC)
              ], {
                id: `s7-hs-${align}`,
                h: 80,
                gap: "sm",
                align
              })
            ], {
              id: `s7-hs-panel-${align}`,
              w: right.w,
              padding: "sm",
              gap: "sm",
              fill: C.glass,
              radius: 12,
              border: `1px solid ${C.glassBorder}`
            })
          );
        }
        return [
          // Title
          vstack([
            mkEyebrow("Stack Layouts", "s7-eyebrow", C.accent1),
            slideTitle("Vertical & Horizontal Flow", "s7-title")
          ], {
            id: "s7-title-stack",
            x: safe.x,
            y: safe.y,
            w: safe.w,
            gap: "sm",
            align: "left"
          }),
          // Left column: vstack demos
          sectionLabel("vstack", "s7-vs-heading", C.accent1, {
            x: left.x,
            y: below("s7-title-stack", { gap: "xl" })
          }),
          vstack(vstackDemos, {
            id: "s7-vs-demos",
            x: left.x,
            y: below("s7-vs-heading", { gap: "md" }),
            w: left.w,
            gap: "sm",
            align: "left"
          }),
          // Right column: hstack demos
          sectionLabel("hstack", "s7-hs-heading", C.accent2, {
            x: right.x,
            y: below("s7-title-stack", { gap: "xl" })
          }),
          vstack(hstackDemos, {
            id: "s7-hs-demos",
            x: right.x,
            y: below("s7-hs-heading", { gap: "md" }),
            w: right.w,
            gap: "sm",
            align: "left"
          })
        ];
      })(),
      transforms: [
        matchWidth(["s7-vs-panel-left", "s7-vs-panel-center", "s7-vs-panel-right", "s7-vs-panel-stretch"])
      ]
    },
    // ================================================================
    // SLIDE 8: TRANSFORMS — "PowerPoint-Style Precision"
    // ================================================================
    {
      id: "transforms",
      background: C.bg,
      notes: "Transforms run in Phase 3 of the layout pipeline, after positions are resolved.",
      elements: (() => {
        const colW = 200;
        const beforeY = 340;
        const afterY = 680;
        const makeRect = (id, color, x, y, w, h) => el(`<div style="width:100%;height:100%;background:${color};border-radius:6px;opacity:0.85;"></div>`, { id, x, y, w, h });
        const fitRect = { x: safe.x + safe.w - 400, y: 380, w: 340, h: 280 };
        return [
          // Title
          vstack([
            mkEyebrow("Transforms", "s8-eyebrow", C.accent1),
            slideTitle("PowerPoint-Style Precision", "s8-title")
          ], {
            id: "s8-title-stack",
            x: safe.x,
            y: safe.y,
            w: safe.w,
            gap: "sm",
            align: "left"
          }),
          // BEFORE label
          el(`<p style="font-family:${FONT};font-size:22px;font-weight:700;color:${C.accent3};text-transform:uppercase;letter-spacing:2px;">Before</p>`, {
            id: "s8-before-label",
            x: safe.x,
            y: beforeY - 40,
            w: 200,
            h: 30
          }),
          // Before: 3 misaligned rectangles
          makeRect("s8-before1", "rgba(0,212,255,0.25)", safe.x, beforeY, 180, 100),
          makeRect("s8-before2", "rgba(124,92,191,0.25)", safe.x + 220, beforeY + 30, 240, 70),
          makeRect("s8-before3", "rgba(255,107,157,0.25)", safe.x + 500, beforeY + 15, 160, 120),
          // AFTER label
          el(`<p style="font-family:${FONT};font-size:22px;font-weight:700;color:${C.accent4};text-transform:uppercase;letter-spacing:2px;">After</p>`, {
            id: "s8-after-label",
            x: safe.x,
            y: afterY - 40,
            w: 200,
            h: 30
          }),
          // After: 3 rectangles (transforms will align & distribute them)
          makeRect("s8-after1", "rgba(0,212,255,0.4)", safe.x, afterY, 180, 100),
          makeRect("s8-after2", "rgba(124,92,191,0.4)", safe.x + 220, afterY + 30, 240, 70),
          makeRect("s8-after3", "rgba(255,107,157,0.4)", safe.x + 500, afterY + 15, 160, 120),
          // Elbow connectors from before to after
          connect("s8-before1", "s8-after1", {
            id: "s8-conn1",
            type: "elbow",
            arrow: "end",
            color: C.textTer,
            thickness: 1,
            dash: [4, 4]
          }),
          connect("s8-before2", "s8-after2", {
            id: "s8-conn2",
            type: "elbow",
            arrow: "end",
            color: C.textTer,
            thickness: 1,
            dash: [4, 4]
          }),
          connect("s8-before3", "s8-after3", {
            id: "s8-conn3",
            type: "elbow",
            arrow: "end",
            color: C.textTer,
            thickness: 1,
            dash: [4, 4]
          }),
          // Transform code annotation
          el(`<pre style="font-family:${MONO};font-size:16px;color:${C.accent4};line-height:1.6;margin:0;">transforms: [
  alignTop([...]),
  distributeH([...]),
  matchHeight([...])
]</pre>`, {
            id: "s8-code-annotation",
            x: safe.x,
            y: afterY + 140,
            w: 340,
            h: 90
          }),
          // fitToRect demo
          el('<div style="width:100%;height:100%;border:2px dashed rgba(0,212,255,0.3);border-radius:8px;"></div>', {
            id: "s8-fit-outline",
            x: fitRect.x,
            y: fitRect.y,
            w: fitRect.w,
            h: fitRect.h
          }),
          el(`<p style="font-family:${FONT};font-size:20px;font-weight:600;color:${C.accent1};text-transform:uppercase;letter-spacing:2px;">fitToRect()</p>`, {
            id: "s8-fit-label",
            x: fitRect.x,
            y: fitRect.y - 36,
            w: 200,
            h: 28
          }),
          makeRect("s8-fit-a", "rgba(0,212,255,0.3)", fitRect.x + 20, fitRect.y + 20, 80, 60),
          makeRect("s8-fit-b", "rgba(124,92,191,0.3)", fitRect.x + 120, fitRect.y + 50, 100, 40),
          makeRect("s8-fit-c", "rgba(255,107,157,0.3)", fitRect.x + 240, fitRect.y + 30, 60, 80)
        ];
      })(),
      transforms: [
        alignTop(["s8-after1", "s8-after2", "s8-after3"]),
        distributeH(["s8-after1", "s8-after2", "s8-after3"], {
          startX: safe.x,
          endX: safe.x + safe.w * 0.55
        }),
        matchHeight(["s8-after1", "s8-after2", "s8-after3"]),
        fitToRect(["s8-fit-a", "s8-fit-b", "s8-fit-c"], {
          x: safe.x + safe.w - 400 + 20,
          y: 400,
          w: 300,
          h: 240
        })
      ]
    },
    // ================================================================
    // SLIDE 9: PANELS & CARD GRIDS — "Structured Content"
    // ================================================================
    {
      id: "panels-card-grids",
      background: C.bgAlt,
      notes: "cardGrid automatically equalizes heights per row for consistent visual rhythm.",
      elements: (() => {
        const spacing = getSpacing("lg");
        const shadow = resolveShadow("md");
        const cards = [
          { title: "Measurement", color: C.accent1, desc: "Every element has a resolved bounding box. Query positions, check overlaps, validate alignment." },
          { title: "Validation", color: C.accent2, desc: "Built-in warnings for overflow, overlap, tiny text, and missing fonts \u2014 before you render." },
          { title: "Layering", color: C.accent3, desc: "Explicit layer ordering: bg \u2192 default \u2192 fg \u2192 overlay. No z-index guessing games." },
          { title: "Speaker Notes", color: C.accent4, desc: "Attach notes to any slide. Rendered in presenter view, excluded from PDF export." },
          { title: "Debug Overlay", color: C.accent1, desc: "Toggle bounding-box outlines, safe-zone markers, and element IDs for rapid debugging." },
          { title: "Theming", color: C.accent2, desc: "Define design tokens once. Reference them everywhere. Change the palette in one place." }
        ];
        const cardElements = cards.map(
          (card, i) => panel([
            // Colored accent bar at top
            el(`<div style="width:100%;height:100%;background:${card.color};border-radius:3px;"></div>`, {
              id: `s9-card${i}-bar`,
              w: "fill",
              h: 4
            }),
            // Card title
            el(`<p style="font-family:${FONT};font-size:22px;font-weight:700;color:${C.text};">${card.title}</p>`, {
              id: `s9-card${i}-title`,
              w: "fill"
            }),
            // Thin divider
            el(`<div style="width:100%;height:1px;background:${C.glassBorder};"></div>`, {
              id: `s9-card${i}-divider`,
              w: "fill",
              h: 1
            }),
            // Description
            el(`<p style="font-family:${FONT};font-size:18px;color:${C.textSec};line-height:1.5;">${card.desc}</p>`, {
              id: `s9-card${i}-desc`,
              w: "fill"
            })
          ], {
            id: `s9-card${i}`,
            w: (safe.w - spacing * 2) / 3,
            padding: "lg",
            gap: "sm",
            fill: C.glassEmph,
            radius: 16,
            border: `1px solid ${C.glassEmphBorder}`,
            shadow
          })
        );
        return [
          // Title
          vstack([
            mkEyebrow("Structured Content", "s9-eyebrow", C.accent1),
            slideTitle("Panels & Card Grids", "s9-title")
          ], {
            id: "s9-title-stack",
            x: safe.x,
            y: safe.y,
            w: safe.w,
            gap: "sm",
            align: "left"
          }),
          // Card grid
          cardGrid(cardElements, {
            id: "s9-grid",
            cols: 3,
            gap: "lg",
            x: safe.x,
            y: below("s9-title-stack", { gap: "xl" }),
            w: safe.w
          })
        ];
      })()
    },
    // ================================================================
    // SLIDE 10: CONNECTORS — "Draw Relationships"
    // ================================================================
    {
      id: "connectors",
      background: C.bg,
      notes: "Connectors render as SVG paths. They resolve their endpoints from the scene graph after layout solve.",
      elements: (() => {
        const pipeBoxW = 220;
        const pipeBoxH = 80;
        const subBoxW = 160;
        const subBoxH = 56;
        const pipeBox = (label, id, color) => el(`<div style="width:100%;height:100%;background:rgba(${color});border:2px solid ${color};border-radius:12px;display:flex;align-items:center;justify-content:center;"><span style="font-family:${FONT};font-size:22px;font-weight:700;color:${C.text};">${label}</span></div>`, { id, w: pipeBoxW, h: pipeBoxH });
        const subBox = (label, id, borderColor) => el(`<div style="width:100%;height:100%;background:${C.glass};border:1px solid ${borderColor};border-radius:8px;display:flex;align-items:center;justify-content:center;"><span style="font-family:${FONT};font-size:18px;font-weight:600;color:${C.textSec};">${label}</span></div>`, { id, w: subBoxW, h: subBoxH });
        return [
          // Title
          vstack([
            mkEyebrow("Connectors", "s10-eyebrow", C.accent1),
            slideTitle("Draw Relationships", "s10-title")
          ], {
            id: "s10-title-stack",
            x: safe.x,
            y: safe.y,
            w: safe.w,
            gap: "sm",
            align: "left"
          }),
          // Pipeline: three main boxes in hstack
          hstack([
            pipeBox("Specify", "s10-specify", C.accent1),
            pipeBox("Layout Solve", "s10-layout", C.accent2),
            pipeBox("Render", "s10-render", C.accent3)
          ], {
            id: "s10-pipeline",
            x: safe.x + safe.w / 2,
            y: below("s10-title-stack", { gap: "xl" }),
            w: safe.w * 0.85,
            anchor: "tc",
            gap: 120,
            align: "middle"
          }),
          // Straight connector: Specify → Layout
          connect("s10-specify", "s10-layout", {
            id: "s10-conn-straight",
            type: "straight",
            arrow: "end",
            color: C.accent1,
            thickness: 2,
            label: "straight",
            labelStyle: { fontFamily: MONO, fontSize: "13px", color: C.textTer }
          }),
          // Curved connector: Layout → Render
          connect("s10-layout", "s10-render", {
            id: "s10-conn-curved",
            type: "curved",
            arrow: "end",
            color: C.accent2,
            thickness: 2,
            label: "curved",
            labelStyle: { fontFamily: MONO, fontSize: "13px", color: C.textTer },
            fromAnchor: "tr",
            toAnchor: "tl"
          }),
          // Sub-boxes below Layout
          (() => {
            const b = subBox("Warnings", "s10-warnings", C.accent4);
            b.props.x = centerHWith("s10-layout");
            b.props.y = below("s10-pipeline", { gap: 100 });
            b.props.anchor = "tc";
            return b;
          })(),
          (() => {
            const b = subBox("Errors", "s10-errors", C.accent3);
            b.props.x = rightOf("s10-warnings", { gap: 40 });
            b.props.y = centerVWith("s10-warnings");
            return b;
          })(),
          // Elbow connector: Layout → Warnings (dashed)
          connect("s10-layout", "s10-warnings", {
            id: "s10-conn-warn",
            type: "elbow",
            arrow: "end",
            color: C.accent4,
            thickness: 2,
            dash: [6, 4],
            fromAnchor: "bc",
            toAnchor: "tc"
          }),
          // Elbow connector: Layout → Errors
          connect("s10-layout", "s10-errors", {
            id: "s10-conn-err",
            type: "elbow",
            arrow: "end",
            color: C.accent3,
            thickness: 2,
            fromAnchor: "bc",
            toAnchor: "tc",
            label: "elbow",
            labelStyle: { fontFamily: MONO, fontSize: "13px", color: C.textTer }
          }),
          // Connector type legend at bottom
          caption(
            "Three connector types: straight \xB7 curved \xB7 elbow  \u2014  with arrow, dash & label options",
            "s10-legend",
            {
              x: safe.x + safe.w / 2,
              y: below("s10-warnings", { gap: "xl" }),
              w: 700,
              h: 28,
              anchor: "tc",
              style: { textAlign: "center" }
            }
          )
        ];
      })()
    },
    // ================================================================
    // SLIDE 11: GRID, SNAP & REPEAT — "Consistent Alignment"
    // ================================================================
    {
      id: "grid-snap-repeat",
      background: C.bgAlt,
      notes: "The grid system provides consistent alignment. Snap rounds to pixel grid. Repeat clones elements.",
      elements: (() => {
        const g = grid({ cols: 12, gutter: 30 });
        return [
          // Title
          vstack([
            mkEyebrow("Utilities", "s11-eyebrow", C.accent1),
            slideTitle("Grid, Snap & Repeat", "s11-title")
          ], {
            id: "s11-title-stack",
            x: safe.x,
            y: safe.y,
            w: safe.w,
            gap: "sm",
            align: "left"
          }),
          // --- Section 1: grid() ---
          el(`<p style="font-family:${FONT};font-size:28px;font-weight:600;color:${C.text};">grid()</p>`, {
            id: "s11-grid-heading",
            x: safe.x,
            y: below("s11-title-stack", { gap: "lg" }),
            w: 200,
            h: 36
          }),
          // Grid demo: colored column bands
          group([
            // Full 12-column bar (background)
            el('<div style="width:100%;height:100%;background:rgba(255,255,255,0.04);border-radius:6px;"></div>', {
              id: "s11-grid-bg",
              x: 0,
              y: 0,
              w: safe.w,
              h: 50
            }),
            // Span 1-4 (cyan) — subtract marginLeft since children are relative to group
            el(`<div style="width:100%;height:100%;background:rgba(0,140,180,0.5);border:1px solid rgba(0,212,255,0.4);border-radius:4px;display:flex;align-items:center;justify-content:center;"><span style="font-family:${MONO};font-size:14px;color:#ffffff;">cols 1\u20134</span></div>`, {
              id: "s11-span1",
              x: g.col(1) - g.marginLeft,
              y: 4,
              w: g.spanW(1, 4),
              h: 42
            }),
            // Span 5-8 (violet)
            el(`<div style="width:100%;height:100%;background:rgba(124,92,191,0.2);border:1px solid rgba(124,92,191,0.4);border-radius:4px;display:flex;align-items:center;justify-content:center;"><span style="font-family:${MONO};font-size:14px;color:#ffffff;">cols 5\u20138</span></div>`, {
              id: "s11-span2",
              x: g.col(5) - g.marginLeft,
              y: 4,
              w: g.spanW(5, 8),
              h: 42
            }),
            // Span 9-12 (coral)
            el(`<div style="width:100%;height:100%;background:rgba(180,60,100,0.5);border:1px solid rgba(255,107,157,0.4);border-radius:4px;display:flex;align-items:center;justify-content:center;"><span style="font-family:${MONO};font-size:14px;color:#ffffff;">cols 9\u201312</span></div>`, {
              id: "s11-span3",
              x: g.col(9) - g.marginLeft,
              y: 4,
              w: g.spanW(9, 12),
              h: 42
            })
          ], {
            id: "s11-grid-demo",
            x: safe.x,
            y: below("s11-grid-heading", { gap: "sm" }),
            w: safe.w,
            h: 50
          }),
          // Code caption for grid
          caption(
            "grid({ cols: 12, gutter: 30 })  \u2192  g.col(1), g.spanW(1, 4)",
            "s11-grid-caption",
            {
              x: safe.x,
              y: below("s11-grid-demo", { gap: "sm" }),
              w: safe.w,
              h: 24
            }
          ),
          // --- Section 2: snap() ---
          el(`<p style="font-family:${FONT};font-size:28px;font-weight:600;color:${C.text};">snap()</p>`, {
            id: "s11-snap-heading",
            x: safe.x,
            y: below("s11-grid-caption", { gap: "lg" }),
            w: 200,
            h: 36
          }),
          hstack([
            // 157 → 160
            panel([
              el(`<p style="font-family:${MONO};font-size:22px;color:${C.textSec};text-align:center;"><span style="color:${C.accent3};">157</span> \u2192 <span style="color:${C.accent4};">160</span></p>`, {
                id: "s11-snap-val1",
                w: "fill"
              })
            ], {
              id: "s11-snap-panel1",
              w: 220,
              padding: "sm",
              fill: C.glass,
              radius: 12,
              border: `1px solid ${C.glassBorder}`
            }),
            // Arrow
            el(`<span style="font-family:${MONO};font-size:24px;color:${C.textTer};">snap(v, 10)</span>`, {
              id: "s11-snap-arrow",
              w: 200,
              h: 40
            }),
            // 243 → 240
            panel([
              el(`<p style="font-family:${MONO};font-size:22px;color:${C.textSec};text-align:center;"><span style="color:${C.accent3};">243</span> \u2192 <span style="color:${C.accent4};">240</span></p>`, {
                id: "s11-snap-val2",
                w: "fill"
              })
            ], {
              id: "s11-snap-panel2",
              w: 220,
              padding: "sm",
              fill: C.glass,
              radius: 12,
              border: `1px solid ${C.glassBorder}`
            })
          ], {
            id: "s11-snap-row",
            x: safe.x,
            y: below("s11-snap-heading", { gap: "sm" }),
            gap: "md",
            align: "middle"
          }),
          caption(
            "snap(157, 10) \u2192 160   |   snap(243, 10) \u2192 240",
            "s11-snap-caption",
            {
              x: safe.x,
              y: below("s11-snap-row", { gap: "sm" }),
              w: safe.w,
              h: 24
            }
          ),
          // --- Section 3: repeat() ---
          el(`<p style="font-family:${FONT};font-size:28px;font-weight:600;color:${C.text};">repeat()</p>`, {
            id: "s11-repeat-heading",
            x: safe.x,
            y: below("s11-snap-caption", { gap: "lg" }),
            w: 200,
            h: 36
          }),
          // 4×3 dot grid via repeat()
          (() => {
            const rg = repeat(
              el(`<div style="width:100%;height:100%;border-radius:50%;background:${C.accent1};opacity:0.6;"></div>`, {
                id: "s11-repeat-dot",
                w: 14,
                h: 14
              }),
              { count: 12, cols: 4, gapX: 28, gapY: 28 }
            );
            rg.id = "s11-dot-grid";
            rg.props.x = safe.x;
            rg.props.y = below("s11-repeat-heading", { gap: "sm" });
            return rg;
          })(),
          caption(
            "repeat(dot, { count: 12, cols: 4, gapX: 28, gapY: 28 })",
            "s11-repeat-caption",
            {
              x: safe.x,
              y: below("s11-dot-grid", { gap: "sm" }),
              w: safe.w,
              h: 24
            }
          )
        ];
      })()
    },
    // ================================================================
    // SLIDE 12: FIGURES — "Structured Visual Containers"
    // ================================================================
    {
      id: "figures",
      background: C.bg,
      notes: "Figures wrap images with structured containers, padding, and optional captions.",
      elements: (() => {
        const placeholderSvg = "data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 400 300%22%3E%3Crect fill=%22%2300d4ff%22 width=%22400%22 height=%22300%22 opacity=%220.3%22/%3E%3C/svg%3E";
        return [
          // Title
          vstack([
            mkEyebrow("Compound Elements", "s12-eyebrow", C.accent1),
            slideTitle("Figures", "s12-title"),
            bodyText("Structured visual containers with padding, radius & captions", "s12-subtitle")
          ], {
            id: "s12-title-stack",
            x: safe.x,
            y: safe.y,
            w: safe.w,
            gap: "sm",
            align: "left"
          }),
          // Three figures in hstack
          hstack([
            // Figure 1: basic with containerFill
            figure({
              id: "s12-fig1",
              src: placeholderSvg,
              w: 320,
              h: 240,
              containerFill: "rgba(0,212,255,0.08)"
            }),
            // Figure 2: with radius and padding
            figure({
              id: "s12-fig2",
              src: placeholderSvg,
              w: 320,
              h: 240,
              containerFill: "rgba(124,92,191,0.08)",
              containerRadius: 16,
              containerPadding: 16
            }),
            // Figure 3: with caption and captionGap
            figure({
              id: "s12-fig3",
              src: placeholderSvg,
              w: 320,
              h: 240,
              containerFill: "rgba(0,255,136,0.08)",
              containerRadius: 12,
              containerPadding: 12,
              caption: `<span style="font-family:${FONT};font-size:16px;color:${C.textSec};">Fig 3 \u2014 with caption</span>`,
              captionGap: 12
            })
          ], {
            id: "s12-figures-row",
            x: safe.x,
            y: below("s12-title-stack", { gap: "xl" }),
            w: safe.w,
            gap: "lg",
            align: "top"
          }),
          // Labels beneath each figure
          caption("containerFill", "s12-label1", {
            x: safe.x + 160,
            y: below("s12-figures-row", { gap: "sm" }),
            w: 320,
            h: 24,
            anchor: "tc",
            style: { textAlign: "center" }
          }),
          caption("containerRadius + Padding", "s12-label2", {
            x: safe.x + 160 + 320 + getSpacing("lg"),
            y: below("s12-figures-row", { gap: "sm" }),
            w: 320,
            h: 24,
            anchor: "tc",
            style: { textAlign: "center" }
          }),
          caption("caption + captionGap", "s12-label3", {
            x: safe.x + 160 + (320 + getSpacing("lg")) * 2,
            y: below("s12-fig3", { gap: "sm" }),
            w: 320,
            h: 24,
            anchor: "tc",
            style: { textAlign: "center" }
          }),
          // Anatomy section: annotation lines
          group([
            // Container outline
            el('<div style="width:100%;height:100%;border:2px dashed rgba(0,212,255,0.3);border-radius:12px;"></div>', {
              id: "s12-anatomy-outline",
              x: 0,
              y: 0,
              w: 400,
              h: 260
            }),
            // Padding area
            el('<div style="width:100%;height:100%;border:1px dashed rgba(124,92,191,0.4);border-radius:8px;background:rgba(124,92,191,0.05);"></div>', {
              id: "s12-anatomy-padding",
              x: 16,
              y: 16,
              w: 368,
              h: 196
            }),
            // Image placeholder
            el(`<div style="width:100%;height:100%;background:rgba(0,120,160,0.5);border-radius:4px;display:flex;align-items:center;justify-content:center;"><span style="font-family:${MONO};font-size:14px;color:#ffffff;">image</span></div>`, {
              id: "s12-anatomy-image",
              x: 28,
              y: 28,
              w: 344,
              h: 172
            }),
            // Caption area
            el(`<div style="width:100%;height:100%;background:rgba(255,255,255,0.04);border-radius:4px;display:flex;align-items:center;justify-content:center;"><span style="font-family:${MONO};font-size:14px;color:${C.textTer};">caption</span></div>`, {
              id: "s12-anatomy-caption",
              x: 16,
              y: 228,
              w: 368,
              h: 24
            }),
            // Labels
            el(`<span style="font-family:${MONO};font-size:13px;color:${C.accent1};">containerFill</span>`, {
              id: "s12-anatomy-lbl1",
              x: 410,
              y: 4,
              w: 120,
              h: 18
            }),
            el(`<span style="font-family:${MONO};font-size:13px;color:${C.accent2};">containerPadding</span>`, {
              id: "s12-anatomy-lbl2",
              x: 410,
              y: 40,
              w: 140,
              h: 18
            }),
            el(`<span style="font-family:${MONO};font-size:13px;color:${C.textTer};">captionGap</span>`, {
              id: "s12-anatomy-lbl3",
              x: 410,
              y: 218,
              w: 100,
              h: 18
            })
          ], {
            id: "s12-anatomy",
            x: safe.x + safe.w - 600,
            y: below("s12-label1", { gap: "lg" }),
            w: 560,
            h: 270,
            bounds: "hug"
          })
        ];
      })()
    },
    // ================================================================
    // SLIDE 13: STYLING — "You Own the Pixels"
    // ================================================================
    {
      id: "styling",
      background: C.bg,
      notes: "SlideKit passes through all CSS except properties that conflict with the coordinate system.",
      elements: (() => {
        const cardW = (safe.w - getSpacing("lg")) / 2;
        return [
          // Title
          vstack([
            mkEyebrow("Visual Design", "s13-eyebrow", C.accent1),
            slideTitle("You Own the Pixels", "s13-title")
          ], {
            id: "s13-title-stack",
            x: safe.x,
            y: safe.y,
            w: safe.w,
            gap: "sm",
            align: "left"
          }),
          // 2×2 card grid
          cardGrid([
            // Card 1: Gradient backgrounds
            panel([
              el(`<p style="font-family:${FONT};font-size:22px;font-weight:600;color:${C.text};margin-bottom:12px;">Gradients</p>`, {
                id: "s13-grad-label",
                w: "fill"
              }),
              el('<div style="width:100%;height:100%;background:linear-gradient(135deg, #00d4ff 0%, #7c5cbf 50%, #ff6b9d 100%);border-radius:8px;"></div>', {
                id: "s13-grad-demo",
                w: "fill",
                h: 80
              }),
              el('<div style="width:100%;height:100%;background:linear-gradient(90deg, #0a0a1a, #00ff88, #0a0a1a);border-radius:8px;"></div>', {
                id: "s13-grad-demo2",
                w: "fill",
                h: 40
              })
            ], {
              id: "s13-card-grad",
              w: cardW,
              padding: "md",
              gap: "sm",
              fill: C.glass,
              radius: 16,
              border: `1px solid ${C.glassBorder}`
            }),
            // Card 2: Shadow presets
            panel([
              el(`<p style="font-family:${FONT};font-size:22px;font-weight:600;color:#333;margin-bottom:12px;">Shadow Presets</p>`, {
                id: "s13-shadow-label",
                w: "fill"
              }),
              hstack([
                el(`<div style="width:100%;height:100%;background:#ffffff;border-radius:6px;box-shadow:${resolveShadow("sm")};display:flex;align-items:center;justify-content:center;"><span style="font-family:${MONO};font-size:12px;color:#444;">sm</span></div>`, {
                  id: "s13-sh-sm",
                  w: 72,
                  h: 72
                }),
                el(`<div style="width:100%;height:100%;background:#ffffff;border-radius:6px;box-shadow:${resolveShadow("md")};display:flex;align-items:center;justify-content:center;"><span style="font-family:${MONO};font-size:12px;color:#444;">md</span></div>`, {
                  id: "s13-sh-md",
                  w: 72,
                  h: 72
                }),
                el(`<div style="width:100%;height:100%;background:#ffffff;border-radius:6px;box-shadow:${resolveShadow("lg")};display:flex;align-items:center;justify-content:center;"><span style="font-family:${MONO};font-size:12px;color:#444;">lg</span></div>`, {
                  id: "s13-sh-lg",
                  w: 72,
                  h: 72
                }),
                el(`<div style="width:100%;height:100%;background:#ffffff;border-radius:6px;box-shadow:${resolveShadow("xl")};display:flex;align-items:center;justify-content:center;"><span style="font-family:${MONO};font-size:12px;color:#444;">xl</span></div>`, {
                  id: "s13-sh-xl",
                  w: 72,
                  h: 72
                }),
                group([
                  el('<div style="width:100%;height:100%;background:#1a1a2e;border-radius:14px;"></div>', {
                    id: "s13-sh-glow-bg",
                    x: -20,
                    y: -40,
                    w: 152,
                    h: 152
                  }),
                  el(`<div style="width:100%;height:100%;background:#ffffff;border-radius:6px;box-shadow:0 0 24px 6px rgba(0,220,180,0.7), 0 0 48px 2px rgba(0,220,180,0.35);display:flex;align-items:center;justify-content:center;"><span style="font-family:${MONO};font-size:12px;color:#444;">glow</span></div>`, {
                    id: "s13-sh-glow",
                    x: 20,
                    y: 0,
                    w: 72,
                    h: 72
                  })
                ], { id: "s13-sh-glow-group", w: 112, h: 72 })
              ], {
                id: "s13-shadow-row",
                w: "fill",
                gap: "lg",
                align: "middle"
              })
            ], {
              id: "s13-card-shadow",
              w: cardW,
              padding: "lg",
              gap: "sm",
              fill: "#d8dae8",
              radius: 16,
              border: `1px solid #c0c2d0`
            }),
            // Card 3: Glass-morphism
            panel([
              el(`<p style="font-family:${FONT};font-size:22px;font-weight:600;color:${C.text};margin-bottom:12px;">Glass-morphism</p>`, {
                id: "s13-glass-label",
                w: "fill"
              }),
              // Layered glass panels
              el('<div style="width:100%;height:100%;background:rgba(0,212,255,0.15);border-radius:12px;border:1px solid rgba(0,212,255,0.2);"></div>', {
                id: "s13-glass-bg",
                w: "fill",
                h: 100
              }),
              // Use el instead of nested panel to avoid w:'fill' resolution bug in nested panels
              el(`<div style="width:100%;height:100%;background:${C.glassEmph};border-radius:10px;border:1px solid ${C.glassEmphBorder};display:flex;align-items:center;padding:0 16px;"><p style="font-family:${FONT};font-size:16px;color:${C.text};margin:0;">Glass panel overlay</p></div>`, {
                id: "s13-glass-overlay",
                w: "fill",
                h: 44
              })
            ], {
              id: "s13-card-glass",
              w: cardW,
              padding: "md",
              gap: "sm",
              fill: C.glass,
              radius: 16,
              border: `1px solid ${C.glassBorder}`
            }),
            // Card 4: Borders & overflow
            panel([
              el(`<p style="font-family:${FONT};font-size:22px;font-weight:600;color:${C.text};margin-bottom:12px;">Borders & Overflow</p>`, {
                id: "s13-border-label",
                w: "fill"
              }),
              el(`<div style="width:100%;height:100%;border:2px solid ${C.accent1};border-radius:8px;display:flex;align-items:center;justify-content:center;"><span style="font-family:${MONO};font-size:14px;color:${C.accent1};">solid border</span></div>`, {
                id: "s13-border-solid",
                w: "fill",
                h: 40
              }),
              el(`<div style="width:100%;height:100%;border:2px dashed ${C.accent2};border-radius:8px;display:flex;align-items:center;justify-content:center;"><span style="font-family:${MONO};font-size:14px;color:${C.accent2};">dashed border</span></div>`, {
                id: "s13-border-dashed",
                w: "fill",
                h: 40
              }),
              el(`<div style="width:100%;height:100%;background:rgba(180,60,100,0.5);border-radius:8px;overflow:hidden;position:relative;display:flex;align-items:center;"><div style="position:absolute;top:-10px;left:-10px;width:120%;height:120%;background:linear-gradient(45deg,rgba(255,107,157,0.3),transparent);"></div><span style="font-family:${MONO};font-size:14px;color:#ffffff;position:relative;padding:0 8px;text-shadow:0 1px 3px rgba(0,0,0,0.5);">overflow: clip</span></div>`, {
                id: "s13-border-clip",
                w: "fill",
                h: 40,
                overflow: "clip",
                className: "sk-overflow-demo"
              })
            ], {
              id: "s13-card-border",
              w: cardW,
              padding: "md",
              gap: "sm",
              fill: C.glass,
              radius: 16,
              border: `1px solid ${C.glassBorder}`
            })
          ], {
            id: "s13-card-grid",
            x: safe.x,
            y: below("s13-title-stack", { gap: "lg" }),
            w: safe.w,
            cols: 2,
            gap: "lg"
          })
        ];
      })()
    },
    // ================================================================
    // SLIDE 14: MEASUREMENT & VALIDATION — "Catch Problems Before You See Them"
    // ================================================================
    {
      id: "measurement-validation",
      background: C.bgAlt,
      notes: "measure() renders HTML off-screen and returns exact dimensions. Validation catches problems without visual inspection.",
      elements: (() => {
        const { left, right } = splitRect(safe, { ratio: 0.45, gap: 60 });
        return [
          // Title
          vstack([
            mkEyebrow("Quality", "s14-eyebrow", C.accent4),
            slideTitle("Catch Problems Early", "s14-title")
          ], {
            id: "s14-title-stack",
            x: safe.x,
            y: safe.y,
            w: safe.w,
            gap: "sm",
            align: "left"
          }),
          // Left: measure() workflow
          panel([
            el(`<p style="font-family:${FONT};font-size:24px;font-weight:600;color:${C.text};margin-bottom:8px;">measure()</p>`, {
              id: "s14-measure-heading",
              w: "fill"
            }),
            // Code showing measure call
            codeText(
              `const size = await measure(
  '&lt;h1&gt;Hello World&lt;/h1&gt;',
  { w: 800, fontSize: 56 }
);
// \u2192 { w: 482, h: 64 }`,
              "s14-measure-code",
              { w: "fill" }
            ),
            // Bounding box visualization
            group([
              el('<div style="width:100%;height:100%;border:2px dashed rgba(0,212,255,0.4);border-radius:4px;"></div>', {
                id: "s14-bbox-outer",
                x: 0,
                y: 0,
                w: 300,
                h: 60
              }),
              el(`<div style="width:100%;height:100%;background:rgba(0,60,80,0.5);border-radius:3px;display:flex;align-items:center;justify-content:center;"><span style="font-family:${FONT};font-size:20px;font-weight:700;color:${C.text};">Hello World</span></div>`, {
                id: "s14-bbox-inner",
                x: 0,
                y: 0,
                w: 200,
                h: 52
              }),
              el(`<span style="font-family:${MONO};font-size:13px;color:${C.accent1};">{ w: 482, h: 64 }</span>`, {
                id: "s14-bbox-label",
                x: 210,
                y: 20,
                w: 140,
                h: 18
              })
            ], {
              id: "s14-bbox-group",
              x: 24,
              y: 0,
              w: 360,
              h: 60,
              bounds: "hug"
            })
          ], {
            id: "s14-measure-panel",
            x: left.x,
            y: below("s14-title-stack", { gap: "xl" }),
            w: left.w,
            padding: "lg",
            gap: "md",
            fill: "rgba(0,212,255,0.04)",
            radius: 16,
            border: `1px solid rgba(0,212,255,0.15)`
          }),
          // Right: validation output
          panel([
            el(`<p style="font-family:${FONT};font-size:24px;font-weight:600;color:${C.text};margin-bottom:8px;">Validation Output</p>`, {
              id: "s14-valid-heading",
              w: "fill"
            }),
            vstack([
              // Warning row
              panel([
                el(`<p style="font-family:${MONO};font-size:18px;color:#ffcc00;line-height:1.4;">\u26A0 Element "card-3" extends beyond safe zone (x: 1820 + w: 300 > 1800)</p>`, {
                  id: "s14-warn1-text",
                  w: "fill"
                })
              ], {
                id: "s14-warn1",
                w: "fill",
                padding: "sm",
                fill: "rgba(255,204,0,0.06)",
                radius: 8,
                border: "1px solid rgba(255,204,0,0.2)"
              }),
              // Error row
              panel([
                el(`<p style="font-family:${MONO};font-size:18px;color:${C.accent3};line-height:1.4;">\u2717 Element "title" missing required "w" property</p>`, {
                  id: "s14-err1-text",
                  w: "fill"
                })
              ], {
                id: "s14-err1",
                w: "fill",
                padding: "sm",
                fill: "rgba(255,107,157,0.06)",
                radius: 8,
                border: "1px solid rgba(255,107,157,0.2)"
              }),
              // Success row
              panel([
                el(`<p style="font-family:${MONO};font-size:18px;color:${C.accent4};line-height:1.4;">\u2713 14 elements validated \u2014 no overlaps detected</p>`, {
                  id: "s14-ok1-text",
                  w: "fill"
                })
              ], {
                id: "s14-ok1",
                w: "fill",
                padding: "sm",
                fill: "rgba(0,255,136,0.06)",
                radius: 8,
                border: "1px solid rgba(0,255,136,0.2)"
              })
            ], {
              id: "s14-valid-stack",
              w: "fill",
              gap: "sm",
              align: "left"
            })
          ], {
            id: "s14-valid-panel",
            x: right.x,
            y: below("s14-title-stack", { gap: "xl" }),
            w: right.w,
            padding: "lg",
            gap: "md",
            fill: C.glass,
            radius: 16,
            border: `1px solid ${C.glassBorder}`
          }),
          // Bottom: mini-slide with safeRect() visualization
          group([
            // Slide outline
            el('<div style="width:100%;height:100%;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.12);border-radius:4px;"></div>', {
              id: "s14-mini-slide",
              x: 0,
              y: 0,
              w: 400,
              h: 225
            }),
            // Safe zone (dashed)
            el('<div style="width:100%;height:100%;border:2px dashed rgba(0,255,136,0.3);border-radius:2px;"></div>', {
              id: "s14-mini-safe",
              x: 25,
              y: 19,
              w: 350,
              h: 187
            }),
            // Label
            el(`<span style="font-family:${MONO};font-size:13px;color:${C.accent4};background:${C.bgAlt};padding:0 4px;">safeRect()</span>`, {
              id: "s14-mini-label",
              x: 30,
              y: 12,
              w: 100,
              h: 16
            })
          ], {
            id: "s14-mini-group",
            x: between("s14-measure-panel", "s14-valid-panel", { axis: "x" }),
            y: below("s14-measure-panel", { gap: "lg" }),
            w: 400,
            h: 225,
            bounds: "hug",
            anchor: "tc"
          })
        ];
      })()
    },
    // ================================================================
    // SLIDE 15: FULL EXAMPLE — "Putting It All Together"
    // ================================================================
    {
      id: "full-example",
      background: C.bg,
      notes: "A complete SlideKit slide is a plain object with elements array. No magic \u2014 just coordinates.",
      elements: (() => {
        const { left, right } = splitRect(safe, { ratio: 0.55, gap: 60 });
        return [
          // Title
          vstack([
            mkEyebrow("Complete Example", "s15-eyebrow", C.accent1),
            slideTitle("Putting It All Together", "s15-title")
          ], {
            id: "s15-title-stack",
            x: safe.x,
            y: safe.y,
            w: safe.w,
            gap: "sm",
            align: "left"
          }),
          // Left: code editor panel
          panel([
            // Line numbers + code
            codeText(
              `<span style="color:${C.textTer}"> 1</span>  {
<span style="color:${C.textTer}"> 2</span>    <span style="color:${C.accent1};">id</span>: <span style="color:${C.accent3};">'my-slide'</span>,
<span style="color:${C.textTer}"> 3</span>    <span style="color:${C.accent1};">background</span>: <span style="color:${C.accent3};">'#0a0a1a'</span>,
<span style="color:${C.textTer}"> 4</span>    <span style="color:${C.accent1};">elements</span>: [
<span style="color:${C.textTer}"> 5</span>      el(<span style="color:${C.accent3};">'&lt;h1&gt;Title&lt;/h1&gt;'</span>, {
<span style="color:${C.textTer}"> 6</span>        <span style="color:${C.accent1};">x</span>: 960, <span style="color:${C.accent1};">y</span>: 200,
<span style="color:${C.textTer}"> 7</span>        <span style="color:${C.accent1};">w</span>: 800, <span style="color:${C.accent1};">anchor</span>: <span style="color:${C.accent3};">'tc'</span>
<span style="color:${C.textTer}"> 8</span>      }),
<span style="color:${C.textTer}"> 9</span>      hstack([card1, card2, card3], {
<span style="color:${C.textTer}">10</span>        <span style="color:${C.accent1};">x</span>: 120, <span style="color:${C.accent1};">y</span>: 400,
<span style="color:${C.textTer}">11</span>        <span style="color:${C.accent1};">gap</span>: <span style="color:${C.accent3};">'lg'</span>
<span style="color:${C.textTer}">12</span>      }),
<span style="color:${C.textTer}">13</span>    ]
<span style="color:${C.textTer}">14</span>  }`,
              "s15-code",
              { w: "fill" }
            )
          ], {
            id: "s15-code-panel",
            x: left.x,
            y: below("s15-title-stack", { gap: "xl" }),
            w: left.w,
            padding: "lg",
            gap: 0,
            fill: "rgba(0,255,136,0.03)",
            radius: 16,
            border: `1px solid rgba(0,255,136,0.12)`
          }),
          // Right: mini rendered slide
          group([
            // Slide frame
            el(`<div style="width:100%;height:100%;background:${C.bg};border:1px solid rgba(255,255,255,0.15);border-radius:6px;"></div>`, {
              id: "s15-mini-bg",
              x: 0,
              y: 0,
              w: 480,
              h: 270
            }),
            // Mini title
            el(`<p style="font-family:${FONT};font-size:22px;font-weight:700;color:${C.text};text-align:center;">Title</p>`, {
              id: "s15-mini-title",
              x: 90,
              y: 40,
              w: 300,
              h: 30
            }),
            // Mini subtitle
            el(`<p style="font-family:${FONT};font-size:14px;color:${C.textSec};text-align:center;">Subtitle text here</p>`, {
              id: "s15-mini-subtitle",
              x: 90,
              y: 78,
              w: 300,
              h: 20
            }),
            // Three mini cards
            el(`<div style="width:100%;height:100%;background:rgba(0,212,255,0.1);border:1px solid rgba(0,212,255,0.3);border-radius:4px;"></div>`, {
              id: "s15-mini-card1",
              x: 30,
              y: 110,
              w: 130,
              h: 100
            }),
            el(`<div style="width:100%;height:100%;background:rgba(124,92,191,0.1);border:1px solid rgba(124,92,191,0.3);border-radius:4px;"></div>`, {
              id: "s15-mini-card2",
              x: 175,
              y: 110,
              w: 130,
              h: 100
            }),
            el(`<div style="width:100%;height:100%;background:rgba(0,255,136,0.1);border:1px solid rgba(0,255,136,0.3);border-radius:4px;"></div>`, {
              id: "s15-mini-card3",
              x: 320,
              y: 110,
              w: 130,
              h: 100
            }),
            // Mini footer
            el(`<p style="font-family:${MONO};font-size:11px;color:${C.textTer};text-align:center;">Footer</p>`, {
              id: "s15-mini-footer",
              x: 140,
              y: 240,
              w: 200,
              h: 16
            })
          ], {
            id: "s15-mini-slide",
            x: right.x + right.w / 2,
            y: below("s15-title-stack", { gap: "xl" }),
            w: 480,
            h: 270,
            bounds: "hug",
            anchor: "tc",
            scale: 0.85
          }),
          // Connect annotation lines from code to rendered elements
          connect("s15-code-panel", "s15-mini-slide", {
            id: "s15-connect1",
            type: "straight",
            arrow: "end",
            color: C.accent1,
            thickness: 1,
            dash: [6, 4],
            fromAnchor: "cr",
            toAnchor: "cl"
          }),
          // Caption
          caption(
            "A complete slide is a plain object \u2014 no magic, just coordinates.",
            "s15-caption",
            {
              x: centerHWith("s15-code-panel"),
              y: below("s15-code-panel", { gap: "md" }),
              w: left.w,
              anchor: "tc",
              style: { textAlign: "center", fontStyle: "italic" }
            }
          )
        ];
      })()
    },
    // ================================================================
    // SLIDE 16: CLOSING — "Start Building"
    // ================================================================
    {
      id: "closing",
      background: C.bg,
      notes: "Thank you for exploring SlideKit. Every slide in this presentation was built with the library it describes.",
      elements: [
        // Radial gradient overlay on bg layer
        el('<div style="width:100%;height:100%;background:radial-gradient(ellipse at 50% 40%, rgba(0,212,255,0.1) 0%, rgba(124,92,191,0.05) 40%, transparent 70%);"></div>', {
          id: "s16-glow",
          x: 0,
          y: 0,
          w: 1920,
          h: 1080,
          layer: "bg"
        }),
        // Large centered title
        el(`<h1 style="font-family:${FONT};font-size:80px;font-weight:800;color:${C.text};text-align:center;line-height:1.1;">Start Building</h1>`, {
          id: "s16-title",
          x: 960,
          y: 300,
          w: 1e3,
          anchor: "tc",
          style: { textAlign: "center" }
        }),
        // Accent rule
        accentRule("s16-rule", {
          x: 960 - 40,
          y: below("s16-title", { gap: "md" })
        }),
        // Subtitle
        el(`<p style="font-family:${FONT};font-size:28px;font-weight:400;color:${C.textSec};text-align:center;line-height:1.5;">Every slide in this presentation was built with the library it describes.</p>`, {
          id: "s16-subtitle",
          x: 960,
          y: below("s16-rule", { gap: "md" }),
          w: 900,
          anchor: "tc"
        }),
        // Three value cards in hstack
        hstack([
          panel([
            el(`<p style="font-family:${FONT};font-size:36px;text-align:center;">\u{1F3AF}</p>`, {
              id: "s16-icon1",
              w: "fill"
            }),
            el(`<p style="font-family:${FONT};font-size:22px;font-weight:600;color:${C.text};text-align:center;">Deterministic</p>`, {
              id: "s16-val1-title",
              w: "fill"
            }),
            el(`<p style="font-family:${FONT};font-size:16px;color:${C.textSec};text-align:center;line-height:1.5;">Same input, same output. Every\xA0time.</p>`, {
              id: "s16-val1-desc",
              w: "fill"
            })
          ], {
            id: "s16-card1",
            w: 280,
            padding: "lg",
            gap: "sm",
            fill: C.glass,
            radius: 16,
            border: `1px solid ${C.glassBorder}`
          }),
          panel([
            el(`<p style="font-family:${FONT};font-size:36px;text-align:center;">\u{1F4D0}</p>`, {
              id: "s16-icon2",
              w: "fill"
            }),
            el(`<p style="font-family:${FONT};font-size:22px;font-weight:600;color:${C.text};text-align:center;">Measurable</p>`, {
              id: "s16-val2-title",
              w: "fill"
            }),
            el(`<p style="font-family:${FONT};font-size:16px;color:${C.textSec};text-align:center;line-height:1.5;">Know exact sizes before rendering.</p>`, {
              id: "s16-val2-desc",
              w: "fill"
            })
          ], {
            id: "s16-card2",
            w: 280,
            padding: "lg",
            gap: "sm",
            fill: C.glass,
            radius: 16,
            border: `1px solid ${C.glassBorder}`
          }),
          panel([
            el(`<p style="font-family:${FONT};font-size:36px;text-align:center;">\u2705</p>`, {
              id: "s16-icon3",
              w: "fill"
            }),
            el(`<p style="font-family:${FONT};font-size:22px;font-weight:600;color:${C.text};text-align:center;">Validated</p>`, {
              id: "s16-val3-title",
              w: "fill"
            }),
            el(`<p style="font-family:${FONT};font-size:16px;color:${C.textSec};text-align:center;line-height:1.5;">Catch errors before you see\xA0them.</p>`, {
              id: "s16-val3-desc",
              w: "fill"
            })
          ], {
            id: "s16-card3",
            w: 280,
            padding: "lg",
            gap: "sm",
            fill: C.glass,
            radius: 16,
            border: `1px solid ${C.glassBorder}`
          })
        ], {
          id: "s16-cards",
          x: 960,
          y: below("s16-subtitle", { gap: "xl" }),
          anchor: "tc",
          gap: "lg",
          align: "stretch"
        }),
        // Footer
        el(`<p style="font-family:${FONT};font-size:18px;color:${C.textTer};text-align:center;">github.com/cabird/slidekit</p>`, {
          id: "s16-footer",
          x: 960,
          y: 960,
          w: 400,
          anchor: "bc"
        }),
        // Corner brackets (overlay layer)
        // Top-left bracket
        group([
          el(`<div style="width:100%;height:100%;background:${C.accent1};"></div>`, {
            id: "s16-br-tl-h",
            x: 0,
            y: 0,
            w: 40,
            h: 2
          }),
          el(`<div style="width:100%;height:100%;background:${C.accent1};"></div>`, {
            id: "s16-br-tl-v",
            x: 0,
            y: 0,
            w: 2,
            h: 40
          })
        ], {
          id: "s16-bracket-tl",
          x: 40,
          y: 40,
          w: 40,
          h: 40,
          bounds: "hug",
          layer: "overlay",
          opacity: 0.3
        }),
        // Top-right bracket
        group([
          el(`<div style="width:100%;height:100%;background:${C.accent1};"></div>`, {
            id: "s16-br-tr-h",
            x: 0,
            y: 0,
            w: 40,
            h: 2
          }),
          el(`<div style="width:100%;height:100%;background:${C.accent1};"></div>`, {
            id: "s16-br-tr-v",
            x: 38,
            y: 0,
            w: 2,
            h: 40
          })
        ], {
          id: "s16-bracket-tr",
          x: 1840,
          y: 40,
          w: 40,
          h: 40,
          bounds: "hug",
          layer: "overlay",
          opacity: 0.3
        }),
        // Bottom-left bracket
        group([
          el(`<div style="width:100%;height:100%;background:${C.accent2};"></div>`, {
            id: "s16-br-bl-h",
            x: 0,
            y: 38,
            w: 40,
            h: 2
          }),
          el(`<div style="width:100%;height:100%;background:${C.accent2};"></div>`, {
            id: "s16-br-bl-v",
            x: 0,
            y: 0,
            w: 2,
            h: 40
          })
        ], {
          id: "s16-bracket-bl",
          x: 40,
          y: 1e3,
          w: 40,
          h: 40,
          bounds: "hug",
          layer: "overlay",
          opacity: 0.3
        }),
        // Bottom-right bracket
        group([
          el(`<div style="width:100%;height:100%;background:${C.accent2};"></div>`, {
            id: "s16-br-br-h",
            x: 0,
            y: 38,
            w: 40,
            h: 2
          }),
          el(`<div style="width:100%;height:100%;background:${C.accent2};"></div>`, {
            id: "s16-br-br-v",
            x: 38,
            y: 0,
            w: 2,
            h: 40
          })
        ], {
          id: "s16-bracket-br",
          x: 1840,
          y: 1e3,
          w: 40,
          h: 40,
          bounds: "hug",
          layer: "overlay",
          opacity: 0.3
        })
      ]
    }
  ];
  const result = await render(slides);
  enableKeyboardToggle();
  return result;
}
export {
  run
};
//# sourceMappingURL=slidekit_about_linted_bundle.js.map

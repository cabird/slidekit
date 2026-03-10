// Debug Overlay — Rendering helpers for bounding boxes, labels, anchors,
// collisions, safe zone, and relationship arrows.

import type { Rect, Collision, SceneElement } from './types.js';
import type { DebugOverlayOptions } from './debug.js';
import { TYPE_COLORS, TYPE_BORDER_COLORS, type DebugElementType } from './debug-inspector-styles.js';

/** Shape of window.sk as read by the debug overlay. */
export interface SkGlobal {
  layouts?: import('./types.js').LayoutResult[];
  _config?: Partial<import('./types.js').SlideKitConfig>;
}

/** A relationship edge between two elements for debug visualization. */
export interface RelEdge {
  fromId: string;
  toId: string;
  type: string;       // constraint type or "stack"
  sourceAnchor: string;
  targetAnchor: string;
  gap?: number;
  isStack: boolean;
}

// =============================================================================
// Geometry helpers
// =============================================================================

/** Compute the pixel position of an anchor point on a resolved bounds rect. */
export function getAnchorPosition(bounds: Rect, anchor: string): { x: number; y: number } {
  const row = (anchor && anchor[0]) || "t";
  const col = (anchor && anchor[1]) || "l";

  let px: number, py: number;

  if (col === "l") px = bounds.x;
  else if (col === "c") px = bounds.x + bounds.w / 2;
  else px = bounds.x + bounds.w; // "r"

  if (row === "t") py = bounds.y;
  else if (row === "c") py = bounds.y + bounds.h / 2;
  else py = bounds.y + bounds.h; // "b"

  return { x: px, y: py };
}

// =============================================================================
// Safe zone
// =============================================================================

/** Create the safe zone boundary overlay element. */
export function createSafeZoneOverlay(sk: SkGlobal): HTMLDivElement | null {
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
    // Use defaults
  }

  const el = document.createElement("div");
  el.setAttribute("data-sk-debug", "safe-zone");
  el.style.position = "absolute";
  el.style.left = `${safeX}px`;
  el.style.top = `${safeY}px`;
  el.style.width = `${safeW}px`;
  el.style.height = `${safeH}px`;
  el.style.border = "2px dashed rgba(255, 255, 0, 0.6)";
  el.style.boxSizing = "border-box";
  el.style.pointerEvents = "none";

  return el;
}

// =============================================================================
// Relationship edges
// =============================================================================

/** Extract relationship edges from scene elements' provenance data. */
export function extractRelationshipEdges(sceneElements: Record<string, SceneElement>): RelEdge[] {
  const edges: RelEdge[] = [];
  const seenKeys = new Set<string>();

  for (const [id, sceneEl] of Object.entries(sceneElements)) {
    const prov = sceneEl.provenance;
    if (!prov) continue;

    for (const axis of ["x", "y"] as const) {
      let p = prov[axis];
      if (!p) continue;

      // Unwrap transform wrapper to get the original constraint provenance
      if (p.source === "transform" && p.original && typeof p.original === "object" && "source" in p.original) {
        p = p.original as import('./types.js').Provenance;
      }

      if (p.source === "constraint" && p.ref && p.sourceAnchor && p.targetAnchor) {
        // Skip centerIn — it references a rect, not an element
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
          });
        }
      } else if (p.source === "stack" && p.stackId && p.sourceAnchor && p.targetAnchor) {
        // Deduplicate stack edges (appear on both x and y for same pair)
        const key = `${p.stackId}->${id}:stack`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          edges.push({
            fromId: p.stackId,
            toId: id,
            type: "stack",
            sourceAnchor: p.sourceAnchor,
            targetAnchor: p.targetAnchor,
            isStack: true,
          });
        }
      }
    }
  }

  return edges;
}

// =============================================================================
// Relationship SVG
// =============================================================================

/** Build an SVG element showing relationship arrows between elements. */
export function buildRelationshipSVG(
  sceneElements: Record<string, SceneElement>,
  slideW: number,
  slideH: number,
): SVGSVGElement | null {
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

  // Defs: arrowhead markers
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

    const fromPt = getAnchorPosition(fromEl.resolved, edge.sourceAnchor);
    const toPt = getAnchorPosition(toEl.resolved, edge.targetAnchor);

    const color = edge.isStack ? "rgba(160, 120, 255, 0.7)" : "rgba(255, 140, 50, 0.85)";
    const markerId = edge.isStack ? "sk-debug-arrow-stack" : "sk-debug-arrow-constraint";

    // Line
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
    if (edge.isStack) {
      line.setAttribute("stroke-dasharray", "6 3");
    }
    svg.appendChild(line);

    // Label at midpoint
    const midX = (fromPt.x + toPt.x) / 2;
    const midY = (fromPt.y + toPt.y) / 2;
    const labelText = edge.gap !== undefined ? `${edge.type} ${edge.gap}px` : edge.type;

    // Background rect for label
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

// =============================================================================
// Overlay content builder
// =============================================================================

/** Build overlay content (boxes, labels, anchors, collisions, relationships). */
export function buildOverlayContent(
  overlay: HTMLDivElement,
  sceneElements: Record<string, SceneElement>,
  collisions: Collision[],
  sk: SkGlobal,
  slideW: number,
  slideH: number,
  options: DebugOverlayOptions,
): void {
  const showBoxes = options.showBoxes !== false;
  const showSafeZone = options.showSafeZone !== false;
  const showIds = options.showIds !== false;
  const showAnchors = options.showAnchors !== false;
  const showCollisions = options.showCollisions !== false;
  const showRelationships = options.showRelationships !== false;

  // Safe zone
  if (showSafeZone) {
    const safeZoneEl = createSafeZoneOverlay(sk);
    if (safeZoneEl) overlay.appendChild(safeZoneEl);
  }

  // Bounding boxes
  if (showBoxes) {
    const MIN_BOX = 8; // minimum visible/clickable size for debug boxes
    for (const [id, sceneEl] of Object.entries(sceneElements)) {
      const resolved: Rect | undefined = sceneEl.resolved;
      if (!resolved) continue;

      // Enforce minimum dimensions so thin connectors are visible & clickable
      let bx = resolved.x, by = resolved.y;
      let bw = resolved.w, bh = resolved.h;
      if (bw < MIN_BOX) { bx -= (MIN_BOX - bw) / 2; bw = MIN_BOX; }
      if (bh < MIN_BOX) { by -= (MIN_BOX - bh) / 2; bh = MIN_BOX; }

      const boxEl = document.createElement("div");
      boxEl.setAttribute("data-sk-debug", "box");
      boxEl.setAttribute("data-sk-debug-id", id);
      boxEl.style.position = "absolute";
      boxEl.style.left = `${bx}px`;
      boxEl.style.top = `${by}px`;
      boxEl.style.width = `${bw}px`;
      boxEl.style.height = `${bh}px`;
      boxEl.style.background = TYPE_COLORS[sceneEl.type as DebugElementType] || "rgba(128, 128, 128, 0.3)";
      boxEl.style.border = `1px solid ${TYPE_BORDER_COLORS[sceneEl.type as DebugElementType] || "rgba(128, 128, 128, 0.8)"}`;
      boxEl.style.boxSizing = "border-box";
      boxEl.style.pointerEvents = "none";
      overlay.appendChild(boxEl);
    }
  }

  // ID labels
  if (showIds) {
    for (const [id, sceneEl] of Object.entries(sceneElements)) {
      const resolved: Rect | undefined = sceneEl.resolved;
      if (!resolved) continue;

      const anchor: string = (sceneEl.authored?.props?.anchor as string) || "tl";
      const anchorPos = getAnchorPosition(resolved, anchor);

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

  // Anchor dots
  if (showAnchors) {
    for (const [id, sceneEl] of Object.entries(sceneElements)) {
      const resolved: Rect | undefined = sceneEl.resolved;
      if (!resolved) continue;

      const anchor: string = (sceneEl.authored?.props?.anchor as string) || "tl";
      const anchorPos = getAnchorPosition(resolved, anchor);

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

  // Collisions
  if (showCollisions && collisions.length > 0) {
    for (const collision of collisions) {
      const rect: Rect | undefined = collision.overlapRect;
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

  // Relationship arrows
  if (showRelationships) {
    const relSvg = buildRelationshipSVG(sceneElements, slideW, slideH);
    if (relSvg) overlay.appendChild(relSvg);
  }
}

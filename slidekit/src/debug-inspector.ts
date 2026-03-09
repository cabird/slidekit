// Debug Inspector — Panel UI, element detail rendering, click selection

import type { SceneElement } from './types.js';
import { debugController } from './debug-state.js';
import { PROVENANCE_COLORS, TYPE_BADGE_COLORS, escapeHtml, badge } from './debug-inspector-styles.js';
import { createResizeHandle, adjustViewport, resetViewport } from './debug-inspector-viewport.js';
import { extractRelationshipEdges } from './debug-overlay.js';
import { isEditableProp, startEdit, showLockedTooltip } from './debug-inspector-edit.js';

// =============================================================================
// Inspector Panel Lifecycle
// =============================================================================

/** Create and append the inspector panel to document.body. */
export function createInspectorPanel(): HTMLDivElement {
  const s = debugController.state;

  const panel = document.createElement("div");
  panel.setAttribute("data-sk-role", "debug-inspector");
  panel.style.position = "fixed";
  panel.style.top = "0";
  panel.style.right = "0";
  panel.style.width = `${s.panelWidth}px`;
  panel.style.height = "100vh";
  panel.style.background = "#f8f8fa";
  panel.style.color = "#1a1a2e";
  panel.style.fontFamily = "'SF Mono', 'Fira Code', 'Consolas', monospace";
  panel.style.fontSize = "12px";
  panel.style.zIndex = "99999";
  panel.style.overflowY = "auto";
  panel.style.borderLeft = "1px solid #ddd";
  panel.style.boxSizing = "border-box";

  // Resize handle
  panel.appendChild(createResizeHandle());

  // Header
  const header = document.createElement("div");
  header.style.padding = "12px 16px";
  header.style.borderBottom = "1px solid #ddd";
  header.style.fontSize = "14px";
  header.style.fontWeight = "600";
  header.style.color = "#1a1a2e";
  header.textContent = "Inspector";
  panel.appendChild(header);

  // Body (content area)
  const body = document.createElement("div");
  body.setAttribute("data-sk-inspector-body", "true");
  body.style.padding = "8px 0";
  panel.appendChild(body);

  document.body.appendChild(panel);
  s.inspectorPanel = panel;

  renderEmptyState();
  adjustViewport(s.panelWidth);

  return panel;
}

/** Remove the inspector panel from DOM. */
export function removeInspectorPanel(): void {
  const s = debugController.state;
  resetViewport();
  if (s.inspectorPanel && s.inspectorPanel.parentNode) {
    s.inspectorPanel.parentNode.removeChild(s.inspectorPanel);
  }
  s.inspectorPanel = null;
}

// =============================================================================
// Empty State
// =============================================================================

/** Show the empty state message in the panel body. */
export function renderEmptyState(): void {
  const s = debugController.state;
  const body = s.inspectorPanel?.querySelector('[data-sk-inspector-body]');
  if (!body) return;
  body.innerHTML = '';
  const msg = document.createElement("div");
  msg.style.padding = "24px 16px";
  msg.style.color = "#888";
  msg.style.textAlign = "center";
  msg.style.fontStyle = "italic";
  msg.textContent = "Click an element to inspect";
  body.appendChild(msg);
}

// =============================================================================
// Collapsible Section
// =============================================================================

/** Create a collapsible section for the inspector. */
export function createSection(title: string, content: HTMLElement, collapsed = false): HTMLElement {
  const section = document.createElement("div");
  section.setAttribute("data-sk-inspector-section", title);
  section.style.borderBottom = "1px solid #e8e8e8";

  // Header
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

  // Content
  const contentWrap = document.createElement("div");
  contentWrap.setAttribute("data-sk-inspector-content", "true");
  contentWrap.style.padding = "0 16px 8px";
  contentWrap.style.display = collapsed ? "none" : "block";
  contentWrap.appendChild(content);
  section.appendChild(contentWrap);

  // Toggle
  hdr.addEventListener("click", () => {
    const isHidden = contentWrap.style.display === "none";
    contentWrap.style.display = isHidden ? "block" : "none";
    chevron.textContent = isHidden ? "\u25BC" : "\u25B6";
  });

  return section;
}

// =============================================================================
// Element Detail
// =============================================================================

/** Render the detail view for a selected element. */
export function renderElementDetail(elementId: string, slideIndex: number): void {
  const s = debugController.state;
  const body = s.inspectorPanel?.querySelector('[data-sk-inspector-body]');
  if (!body) return;
  body.innerHTML = '';

  const sk = typeof window !== "undefined" ? window.sk : null;
  if (!sk?.layouts?.[slideIndex]) return;

  const layoutResult = sk.layouts[slideIndex];
  const sceneEl = layoutResult.elements[elementId];
  if (!sceneEl) {
    renderEmptyState();
    return;
  }

  // Section 1: Identity
  const identityDiv = document.createElement("div");
  const typeBadgeColor = TYPE_BADGE_COLORS[sceneEl.type] || "#666";
  identityDiv.innerHTML = `
    <div style="margin-bottom:6px;"><strong style="color:#1a1a2e;font-size:14px;">${escapeHtml(sceneEl.id)}</strong>${badge(sceneEl.type, typeBadgeColor)}</div>
    <div style="margin-bottom:2px;">Parent: <span style="color:#666;">${sceneEl.parentId ?? "(root)"}</span></div>
    ${sceneEl._internal ? '<div style="color:#ff8c32;">Internal element</div>' : ''}
  `;
  body.appendChild(createSection("Identity", identityDiv));

  // Section 2: Resolved Bounds
  const boundsDiv = document.createElement("div");
  const r = sceneEl.resolved;
  boundsDiv.innerHTML = `<table style="width:100%;border-collapse:collapse;">
    <tr><td style="color:#999;padding:2px 8px 2px 0;">x</td><td style="color:#1a1a2e;">${r.x.toFixed(1)}</td>
        <td style="color:#999;padding:2px 8px 2px 16px;">y</td><td style="color:#1a1a2e;">${r.y.toFixed(1)}</td></tr>
    <tr><td style="color:#999;padding:2px 8px 2px 0;">w</td><td style="color:#1a1a2e;">${r.w.toFixed(1)}</td>
        <td style="color:#999;padding:2px 8px 2px 16px;">h</td><td style="color:#1a1a2e;">${r.h.toFixed(1)}</td></tr>
  </table>`;
  body.appendChild(createSection("Resolved Bounds", boundsDiv));

  // Section 3: Authored Props
  const propsDiv = document.createElement("div");
  const authored = sceneEl.authored;
  if (authored?.props) {
    const prov = sceneEl.provenance;
    const lockedSources = new Set(["constraint", "stack", "transform"]);
    let hasProps = false;
    for (const [key, val] of Object.entries(authored.props)) {
      if (key.startsWith('_')) continue;
      hasProps = true;

      let displayVal: string;
      if (val != null && typeof val === "object") {
        displayVal = JSON.stringify(val);
      } else {
        displayVal = String(val ?? "");
      }

      // Determine if locked (constrained)
      const axisProv = (prov as Record<string, {source?: string}>)?.[key];
      const isLocked = axisProv && lockedSources.has(axisProv.source || "");
      const editable = !isLocked && isEditableProp(key, val);

      const propRow = document.createElement("div");
      propRow.style.padding = "2px 0";
      propRow.setAttribute("data-sk-prop-key", key);

      if (isLocked) {
        propRow.style.color = "#aaa";
        propRow.setAttribute("data-sk-prop-status", "locked");
        propRow.innerHTML = `<span style="margin-right:2px;">&#128274;</span>${escapeHtml(key)}: ${escapeHtml(displayVal)}`;
        propRow.style.cursor = "help";
        propRow.addEventListener("click", (e) => {
          e.stopPropagation();
          showLockedTooltip(key, propRow, sceneEl);
        });
      } else if (editable) {
        propRow.style.color = "#1a1a2e";
        propRow.style.textDecoration = "underline";
        propRow.style.textDecorationStyle = "dashed";
        propRow.style.textUnderlineOffset = "2px";
        propRow.style.cursor = "pointer";
        propRow.setAttribute("data-sk-prop-status", "editable");
        propRow.textContent = `${key}: ${displayVal}`;
        propRow.addEventListener("mouseenter", () => { propRow.style.background = "#e8f0fe"; });
        propRow.addEventListener("mouseleave", () => { propRow.style.background = ""; });
        propRow.addEventListener("click", (e) => {
          e.stopPropagation();
          startEdit(elementId, key, val as number, propRow, slideIndex);
        });
      } else {
        propRow.style.color = "#1a1a2e";
        propRow.setAttribute("data-sk-prop-status", "readonly");
        propRow.textContent = `${key}: ${displayVal}`;
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

  // Section 4: Provenance
  const provDiv = document.createElement("div");
  const prov = sceneEl.provenance;
  let provHtml = '';
  for (const axis of ["x", "y", "w", "h"] as const) {
    const p = prov[axis];
    if (!p) continue;
    const color = PROVENANCE_COLORS[p.source] || "#999";
    provHtml += `<div style="padding:3px 0;">${axis}: ${badge(p.source, color)}`;

    if (p.source === "constraint") {
      provHtml += ` <span style="color:#666;">${escapeHtml(p.type || "")} ref=${escapeHtml(p.ref || "")}`;
      if (p.gap !== undefined) provHtml += ` gap=${p.gap}`;
      provHtml += `</span>`;
    } else if (p.source === "stack") {
      provHtml += ` <span style="color:#666;">stack=${escapeHtml(p.stackId || "")}</span>`;
    } else if (p.source === "transform" && p.original) {
      provHtml += ` <span style="color:#666;">original: ${escapeHtml(JSON.stringify(p.original))}</span>`;
    } else if (p.source === "authored" && p.value !== undefined) {
      provHtml += ` <span style="color:#666;">${escapeHtml(String(p.value))}</span>`;
    }

    if (p.sourceAnchor) provHtml += ` <span style="color:#999;">src=${p.sourceAnchor}</span>`;
    if (p.targetAnchor) provHtml += ` <span style="color:#999;">tgt=${p.targetAnchor}</span>`;
    provHtml += `</div>`;
  }
  provDiv.innerHTML = provHtml;
  body.appendChild(createSection("Provenance", provDiv));

  // Section 5: Relationships
  const relsDiv = document.createElement("div");
  const allEdges = extractRelationshipEdges(layoutResult.elements);
  const relEdges = allEdges.filter(e => e.fromId === elementId || e.toId === elementId);
  if (relEdges.length > 0) {
    let relsHtml = '';
    for (const edge of relEdges) {
      const dir = edge.toId === elementId ? "incoming" : "outgoing";
      const arrow = dir === "incoming" ? "\u2190" : "\u2192";
      const otherId = dir === "incoming" ? edge.fromId : edge.toId;
      relsHtml += `<div style="padding:2px 0;">${arrow} <span style="color:#1a1a2e;">${escapeHtml(otherId)}</span>
        <span style="color:#666;">${escapeHtml(edge.type)} [${edge.sourceAnchor}\u2192${edge.targetAnchor}]</span>
        ${edge.gap !== undefined ? `<span style="color:#999;">gap=${edge.gap}</span>` : ''}
      </div>`;
    }
    relsDiv.innerHTML = relsHtml;
  } else {
    relsDiv.innerHTML = '<span style="color:#aaa;">(none)</span>';
  }
  body.appendChild(createSection("Relationships", relsDiv));

  // Section 6: CSS Pass-through Styles
  const stylesDiv = document.createElement("div");
  const styleObj = authored?.props?.style as Record<string, unknown> | undefined;
  if (styleObj && Object.keys(styleObj).length > 0) {
    let stylesHtml = '';
    for (const [prop, val] of Object.entries(styleObj)) {
      stylesHtml += `<div style="padding:1px 0;">${escapeHtml(prop)}: <span style="color:#1a1a2e;">${escapeHtml(String(val))}</span></div>`;
    }
    stylesDiv.innerHTML = stylesHtml;
  } else {
    stylesDiv.innerHTML = '<span style="color:#aaa;">(none)</span>';
  }
  body.appendChild(createSection("CSS Styles", stylesDiv, true));

  // Section 7: Inner HTML (for el type elements)
  const htmlDiv = document.createElement("div");
  if (authored?.content) {
    let content = authored.content;
    if (content.length > 500) content = content.slice(0, 500) + "...";
    htmlDiv.innerHTML = `<pre style="margin:0;white-space:pre-wrap;word-break:break-all;font-size:11px;color:#444;max-height:200px;overflow:auto;">${escapeHtml(content)}</pre>`;
  } else {
    htmlDiv.innerHTML = '<span style="color:#aaa;">(none)</span>';
  }
  body.appendChild(createSection("Inner HTML", htmlDiv, true));
}

// =============================================================================
// Selection Highlight
// =============================================================================

/** Update the selection highlight on the debug overlay. */
export function updateSelectionHighlight(elementId: string | null, slideIndex: number): void {
  const s = debugController.state;

  // Remove existing selection highlight
  if (s.debugOverlay) {
    const existing = s.debugOverlay.querySelectorAll('[data-sk-debug="selection"]');
    existing.forEach(el => el.remove());
  }

  if (!elementId || !s.debugOverlay) return;

  const sk = typeof window !== "undefined" ? window.sk : null;
  if (!sk?.layouts?.[slideIndex]) return;

  const sceneEl: SceneElement | undefined = sk.layouts[slideIndex].elements[elementId];
  if (!sceneEl?.resolved) return;

  const r = sceneEl.resolved;
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

// =============================================================================
// Click Handler
// =============================================================================

/** Handle click events for element inspection. */
function handleInspectorClick(event: MouseEvent): void {
  const s = debugController.state;

  // Only act when debug overlay is visible
  if (!s.debugOverlay) return;

  // Don't deselect when clicking inside the inspector panel
  const target = event.target as HTMLElement;
  if (target && target.closest('[data-sk-role="debug-inspector"]')) return;

  // Walk up from target to find a data-sk-id element
  const skEl = target?.closest('[data-sk-id]');
  if (skEl) {
    const id = skEl.getAttribute('data-sk-id');
    if (id) {
      s.selectedElementId = id;
      renderElementDetail(id, s.currentSlideIndex);
      updateSelectionHighlight(id, s.currentSlideIndex);
      return;
    }
  }

  // Clicked empty space → deselect
  s.selectedElementId = null;
  renderEmptyState();
  updateSelectionHighlight(null, s.currentSlideIndex);
}

/** Attach the click handler for the inspector. */
export function attachClickHandler(): void {
  const s = debugController.state;
  if (s.clickHandlerAttached) return;
  document.addEventListener("click", handleInspectorClick, true);
  s.clickHandlerAttached = true;
}

/** Detach the click handler for the inspector. */
export function detachClickHandler(): void {
  const s = debugController.state;
  if (!s.clickHandlerAttached) return;
  document.removeEventListener("click", handleInspectorClick, true);
  s.clickHandlerAttached = false;
}

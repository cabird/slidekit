// Debug Inspector Diff — Scene graph serialization, diffing, action bar, and modal
//
// Provides a "Show Slide Diff" button in the inspector that opens a modal
// showing the scene graph diff between the baseline (when debug mode activated)
// and the current state. Formatted for pasting into an LLM with source code.

import type { SceneElement, Provenance, RelMarker } from './types.js';
import { debugController } from './debug-state.js';

// =============================================================================
// Value Formatting
// =============================================================================

/** Format a RelMarker as a readable constraint expression (e.g., `below(title, {gap: 16})`). */
function formatRelMarker(marker: RelMarker): string {
  // between() has ref and ref2 as primary args, plus axis and optional bias
  if (marker._rel === 'between') {
    const args: string[] = [];
    if (marker.ref) args.push(marker.ref);
    if (marker.ref2 !== undefined) args.push(typeof marker.ref2 === 'string' ? marker.ref2 : String(marker.ref2));
    const opts: string[] = [];
    if (marker.axis) opts.push(`axis: ${marker.axis}`);
    if (marker.bias !== undefined && marker.bias !== 0.5) opts.push(`bias: ${marker.bias}`);
    if (opts.length > 0) args.push(`{${opts.join(', ')}}`);
    return `between(${args.join(', ')})`;
  }

  const parts: string[] = [];
  if (marker.ref) parts.push(marker.ref);
  const opts: string[] = [];
  if (marker.gap !== undefined) opts.push(`gap: ${marker.gap}`);
  if (marker.bias !== undefined) opts.push(`bias: ${marker.bias}`);
  if (marker.ref2 !== undefined) opts.push(`ref2: ${JSON.stringify(marker.ref2)}`);
  if (opts.length > 0) parts.push(`{${opts.join(', ')}}`);
  return `${marker._rel}(${parts.join(', ')})`;
}

/** Format a single prop value. Special-cases RelMarker objects. */
export function formatPropValue(val: unknown): string {
  if (val != null && typeof val === 'object' && '_rel' in (val as Record<string, unknown>)) {
    return formatRelMarker(val as RelMarker);
  }
  if (typeof val === 'string') return JSON.stringify(val);
  if (val == null) return String(val);
  return JSON.stringify(val);
}

/** Format provenance: source + constraint details. */
export function formatProvenance(p: Provenance): string {
  let result = p.source;
  if (p.source === 'authored' && p.value !== undefined) {
    result += ` = ${formatPropValue(p.value)}`;
  } else if (p.source === 'constraint' && p.type) {
    if (p.type === 'between') {
      result += ` between(${p.ref || ''}`;
      if (p.ref2 !== undefined) result += `, ${p.ref2}`;
      result += ')';
    } else {
      result += ` ${p.type}(${p.ref || ''}`;
      if (p.gap !== undefined) result += `, gap=${p.gap}`;
      result += ')';
    }
  } else if (p.source === 'stack' && p.stackId) {
    result += ` stack=${p.stackId}`;
  }
  return result;
}

// =============================================================================
// Serialization
// =============================================================================

/** Serialize a scene graph to readable text. */
export function serializeSceneGraph(elements: Record<string, SceneElement>): string {
  const lines: string[] = [];

  for (const [id, el] of Object.entries(elements)) {
    if (el._internal) continue;

    lines.push(`--- ${id} (${el.type}) ---`);
    lines.push(`  parent: ${el.parentId ?? '(root)'}`);
    lines.push(`  children: [${el.children.join(', ')}]`);

    // Authored props
    const props = el.authored?.props;
    if (props) {
      lines.push('  props:');
      for (const [key, val] of Object.entries(props)) {
        if (key.startsWith('_')) continue;
        lines.push(`    ${key}: ${formatPropValue(val)}`);
      }
    }

    // Content
    if (el.authored?.content) {
      let content = el.authored.content;
      if (content.length > 300) content = content.slice(0, 300) + '...';
      lines.push(`  content: ${JSON.stringify(content)}`);
    }

    // Provenance
    lines.push('  provenance:');
    for (const axis of ['x', 'y', 'w', 'h'] as const) {
      const p = el.provenance[axis];
      if (p) {
        lines.push(`    ${axis}: ${formatProvenance(p)}`);
      }
    }

    lines.push('');
  }

  return lines.join('\n');
}

// =============================================================================
// Diffing
// =============================================================================

/** JSON.stringify comparison for plain data. */
function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Compare props between two elements, returning changed keys. */
function diffProps(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): Array<{ key: string; before: unknown; after: unknown }> {
  const changes: Array<{ key: string; before: unknown; after: unknown }> = [];
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

  for (const key of allKeys) {
    if (key.startsWith('_')) continue;
    const bVal = before[key];
    const aVal = after[key];
    if (!deepEqual(bVal, aVal)) {
      changes.push({ key, before: bVal, after: aVal });
    }
  }

  return changes;
}

/** Generate a diff between two scene graphs. Only shows changed elements. */
export function generateSceneGraphDiff(
  before: Record<string, SceneElement>,
  after: Record<string, SceneElement>,
): string {
  const lines: string[] = ['# Scene Graph Changes', ''];
  let hasChanges = false;

  // Check all element IDs from both before and after
  const allIds = new Set([...Object.keys(before), ...Object.keys(after)]);

  for (const id of allIds) {
    const bEl = before[id];
    const aEl = after[id];

    // Skip internal elements
    if (bEl?._internal || aEl?._internal) continue;

    if (!bEl) {
      hasChanges = true;
      lines.push(`## ${id} (${aEl.type}) — ADDED`);
      lines.push('');
      continue;
    }

    if (!aEl) {
      hasChanges = true;
      lines.push(`## ${id} (${bEl.type}) — REMOVED`);
      lines.push('');
      continue;
    }

    // Compare authored props
    const bProps = (bEl.authored?.props ?? {}) as Record<string, unknown>;
    const aProps = (aEl.authored?.props ?? {}) as Record<string, unknown>;
    const changes = diffProps(bProps, aProps);

    if (changes.length > 0) {
      hasChanges = true;
      lines.push(`## ${id} (${aEl.type})`);

      for (const { key, before: bVal, after: aVal } of changes) {
        lines.push(`  ${key}: ${formatPropValue(bVal)} \u2192 ${formatPropValue(aVal)}`);

        // Add provenance annotation for constraint-driven props
        const prov = aEl.provenance[key as 'x' | 'y' | 'w' | 'h'];
        if (prov && prov.source === 'constraint') {
          lines.push(`    (provenance: ${formatProvenance(prov)})`);
        }
      }

      lines.push('');
    }
  }

  if (!hasChanges) {
    lines.push('(no changes)');
    lines.push('');
  }

  return lines.join('\n');
}

// =============================================================================
// Action Bar
// =============================================================================

/** Create the diff action bar with the "Show Slide Diff" button. */
export function createDiffActionBar(): HTMLDivElement {
  const bar = document.createElement('div');
  bar.setAttribute('data-sk-diff-action-bar', 'true');
  bar.style.cssText = `
    padding: 8px 16px;
    border-bottom: 1px solid #ddd;
    display: flex;
    align-items: center;
  `;

  const btn = document.createElement('button');
  btn.setAttribute('data-sk-diff-btn', 'true');
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
  btn.textContent = 'Show Slide Diff';

  btn.addEventListener('mouseenter', () => { btn.style.background = '#f0f0f4'; });
  btn.addEventListener('mouseleave', () => { btn.style.background = '#fff'; });
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    openDiffModal();
  });

  // Dirty badge (hidden by default)
  const badge = document.createElement('span');
  badge.setAttribute('data-sk-diff-dirty', 'true');
  badge.style.cssText = `
    position: absolute;
    top: -3px;
    right: -3px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #ff8c32;
    display: none;
  `;
  btn.appendChild(badge);

  bar.appendChild(btn);
  return bar;
}

/** Show/hide the dirty indicator based on undo stack state. */
export function updateDiffDirtyIndicator(): void {
  const s = debugController.state;
  const badge = s.inspectorPanel?.querySelector('[data-sk-diff-dirty]') as HTMLElement | null;
  if (!badge) return;

  const hasPendingEdits = s.undoStack.some(e => e.slideIndex === s.currentSlideIndex);
  badge.style.display = hasPendingEdits ? 'block' : 'none';
}

// =============================================================================
// Modal
// =============================================================================

type DiffTab = 'diff' | 'before' | 'after';

/** Open the diff modal. */
export function openDiffModal(): void {
  // Remove any existing modal
  closeDiffModal();

  const s = debugController.state;
  const slideIndex = s.currentSlideIndex;

  // Get baseline and current scene graphs
  const baseline = s.baselineSceneGraphs[slideIndex] ?? {};
  const sk = typeof window !== 'undefined' ? (window as any).sk : null;
  const current: Record<string, SceneElement> = sk?.layouts?.[slideIndex]?.elements ?? {};

  // Generate content for each tab
  const diffText = generateSceneGraphDiff(baseline, current);
  const beforeText = serializeSceneGraph(baseline);
  const afterText = serializeSceneGraph(current);

  const tabContent: Record<DiffTab, string> = {
    diff: diffText,
    before: beforeText,
    after: afterText,
  };

  let activeTab: DiffTab = 'diff';

  // Overlay
  const overlay = document.createElement('div');
  overlay.setAttribute('data-sk-diff-modal-overlay', 'true');
  overlay.style.cssText = `
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 200000;
    display: flex;
    align-items: center;
    justify-content: center;
  `;

  // Modal container
  const modal = document.createElement('div');
  modal.setAttribute('data-sk-diff-modal', 'true');
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

  // Header
  const header = document.createElement('div');
  header.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid #ddd;
    flex-shrink: 0;
  `;

  const title = document.createElement('span');
  title.style.cssText = 'font-size: 14px; font-weight: 600;';
  title.textContent = 'Slide Diff';
  header.appendChild(title);

  const closeBtn = document.createElement('button');
  closeBtn.style.cssText = `
    background: none; border: none; font-size: 18px;
    cursor: pointer; color: #888; padding: 0 4px;
    line-height: 1;
  `;
  closeBtn.textContent = '\u00d7';
  closeBtn.addEventListener('click', closeDiffModal);
  header.appendChild(closeBtn);
  modal.appendChild(header);

  // Tab bar
  const tabBar = document.createElement('div');
  tabBar.style.cssText = `
    display: flex;
    border-bottom: 1px solid #ddd;
    flex-shrink: 0;
  `;

  const tabs: DiffTab[] = ['diff', 'before', 'after'];
  const tabLabels: Record<DiffTab, string> = { diff: 'Diff', before: 'Before', after: 'After' };
  const tabButtons: Record<string, HTMLButtonElement> = {};

  for (const tab of tabs) {
    const tabBtn = document.createElement('button');
    tabBtn.setAttribute('data-sk-diff-tab', tab);
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
    tabBtn.addEventListener('click', () => switchTab(tab));
    tabButtons[tab] = tabBtn;
    tabBar.appendChild(tabBtn);
  }

  modal.appendChild(tabBar);

  // Content area
  const contentArea = document.createElement('pre');
  contentArea.setAttribute('data-sk-diff-content', 'true');
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

  // Footer with copy button
  const footer = document.createElement('div');
  footer.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding: 8px 16px;
    border-top: 1px solid #ddd;
    flex-shrink: 0;
  `;

  const copyBtn = document.createElement('button');
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
  copyBtn.textContent = 'Copy';
  copyBtn.addEventListener('mouseenter', () => { copyBtn.style.background = '#3a8eef'; });
  copyBtn.addEventListener('mouseleave', () => { copyBtn.style.background = '#4a9eff'; });
  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(tabContent[activeTab]).then(() => {
      const original = copyBtn.textContent;
      copyBtn.textContent = 'Copied!';
      setTimeout(() => { copyBtn.textContent = original; }, 1500);
    });
  });
  footer.appendChild(copyBtn);
  modal.appendChild(footer);

  overlay.appendChild(modal);

  // Close on overlay click (outside modal)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeDiffModal();
  });

  // Close on Escape
  const onKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      closeDiffModal();
      document.removeEventListener('keydown', onKeydown, true);
    }
  };
  document.addEventListener('keydown', onKeydown, true);

  document.body.appendChild(overlay);

  // Switch tab helper
  function switchTab(tab: DiffTab): void {
    activeTab = tab;
    contentArea.textContent = tabContent[tab];

    for (const [t, btn] of Object.entries(tabButtons)) {
      if (t === tab) {
        btn.style.color = '#1a1a2e';
        btn.style.borderBottomColor = '#4a9eff';
        btn.style.fontWeight = '600';
      } else {
        btn.style.color = '#666';
        btn.style.borderBottomColor = 'transparent';
        btn.style.fontWeight = 'normal';
      }
    }
  }

  // Initialize to Diff tab
  switchTab('diff');
}

/** Remove the diff modal overlay from DOM. */
export function closeDiffModal(): void {
  const existing = document.querySelector('[data-sk-diff-modal-overlay]');
  if (existing) existing.remove();
}

// Debug Context Menu — Right-click menus for elements and constraint arrows
//
// Element menu: Add Constraint (submenu), Duplicate (disabled), Delete (disabled)
// Constraint menu: Change Type (submenu), Break Constraint

import { debugController } from './debug-state.js';
import {
  Y_AXIS_TYPES, X_AXIS_TYPES,
  typesForAxis,
  breakConstraint, changeConstraintType,
} from './debug-inspector-constraint.js';
import type { SceneElement } from './types.js';

// =============================================================================
// Styling
// =============================================================================

const MENU_FONT = "'SF Mono', 'Fira Code', 'Consolas', monospace";

const MENU_STYLE = `
  position: fixed; z-index: 100000;
  background: #fff; border: 1px solid #d0d0d0;
  border-radius: 6px; box-shadow: 0 4px 16px rgba(0,0,0,0.18);
  padding: 4px 0; min-width: 200px;
  font-family: ${MENU_FONT}; font-size: 12px; color: #1a1a2e;
  user-select: none;
`;

const SUBMENU_STYLE = `
  position: fixed; z-index: 100001;
  background: #fff; border: 1px solid #d0d0d0;
  border-radius: 6px; box-shadow: 0 4px 16px rgba(0,0,0,0.18);
  padding: 4px 0; min-width: 180px;
  font-family: ${MENU_FONT}; font-size: 12px; color: #1a1a2e;
  user-select: none;
`;

// =============================================================================
// State
// =============================================================================

let activeMenu: HTMLDivElement | null = null;
let activeSubmenu: HTMLDivElement | null = null;
let dismissListener: ((e: Event) => void) | null = null;

// =============================================================================
// Dismiss
// =============================================================================

function dismissMenu(): void {
  if (activeSubmenu) { activeSubmenu.remove(); activeSubmenu = null; }
  if (activeMenu) { activeMenu.remove(); activeMenu = null; }
  if (dismissListener) {
    document.removeEventListener('mousedown', dismissListener, true);
    document.removeEventListener('keydown', dismissListener as EventListener, true);
    document.removeEventListener('scroll', dismissListener, true);
    dismissListener = null;
  }
}

function setupDismissListeners(): void {
  dismissListener = (e: Event) => {
    if (e.type === 'keydown' && (e as KeyboardEvent).key === 'Escape') {
      e.preventDefault();
      dismissMenu();
      return;
    }
    if (e.type === 'mousedown') {
      const target = e.target as HTMLElement;
      if (activeMenu?.contains(target) || activeSubmenu?.contains(target)) return;
      dismissMenu();
    }
    if (e.type === 'scroll') {
      dismissMenu();
    }
  };
  // Use setTimeout so the contextmenu event itself doesn't trigger dismiss
  setTimeout(() => {
    if (!dismissListener) return;
    document.addEventListener('mousedown', dismissListener, true);
    document.addEventListener('keydown', dismissListener as EventListener, true);
    document.addEventListener('scroll', dismissListener, true);
  }, 0);
}

// =============================================================================
// Menu item builders
// =============================================================================

function createMenuItem(
  label: string,
  opts: {
    disabled?: boolean;
    disabledHint?: string;
    hasSubmenu?: boolean;
    checked?: boolean;
    onClick?: () => void;
  } = {},
): HTMLDivElement {
  const item = document.createElement('div');
  item.style.cssText = `
    padding: 6px 12px; cursor: ${opts.disabled ? 'default' : 'pointer'};
    display: flex; align-items: center; justify-content: space-between;
    color: ${opts.disabled ? '#aaa' : '#1a1a2e'};
    white-space: nowrap;
  `;

  const labelSpan = document.createElement('span');
  if (opts.checked) {
    labelSpan.textContent = `\u2713 ${label}`;
  } else {
    labelSpan.textContent = label;
  }
  item.appendChild(labelSpan);

  if (opts.hasSubmenu) {
    const arrow = document.createElement('span');
    arrow.textContent = '\u25B8';
    arrow.style.marginLeft = '12px';
    arrow.style.color = opts.disabled ? '#ccc' : '#999';
    item.appendChild(arrow);
  }

  if (opts.disabledHint) {
    const hint = document.createElement('span');
    hint.textContent = opts.disabledHint;
    hint.style.cssText = 'margin-left: 8px; color: #bbb; font-size: 10px; font-style: italic;';
    item.appendChild(hint);
  }

  if (!opts.disabled) {
    item.addEventListener('mouseenter', () => { item.style.background = '#e8f0fe'; });
    item.addEventListener('mouseleave', () => { item.style.background = ''; });
    if (opts.onClick) {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        opts.onClick!();
      });
    }
  }

  return item;
}

function createSeparator(): HTMLDivElement {
  const sep = document.createElement('div');
  sep.style.cssText = 'height: 1px; background: #e0e0e0; margin: 4px 0;';
  return sep;
}

function createSectionHeader(label: string): HTMLDivElement {
  const header = document.createElement('div');
  header.style.cssText = `
    padding: 4px 12px 2px; color: #888; font-size: 10px;
    font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;
    cursor: default;
  `;
  header.textContent = label;
  return header;
}

// =============================================================================
// Submenu positioning
// =============================================================================

function positionSubmenu(submenu: HTMLDivElement, parentItem: HTMLDivElement, parentMenu: HTMLDivElement): void {
  const parentRect = parentMenu.getBoundingClientRect();
  const itemRect = parentItem.getBoundingClientRect();

  // Try positioning to the right
  let left = parentRect.right + 2;
  let top = itemRect.top - 4;

  // Check if it would go off-screen right
  submenu.style.visibility = 'hidden';
  submenu.style.left = `${left}px`;
  submenu.style.top = `${top}px`;
  document.body.appendChild(submenu);
  const subRect = submenu.getBoundingClientRect();
  submenu.remove();
  submenu.style.visibility = '';

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

// =============================================================================
// Element context menu
// =============================================================================

function showElementMenu(elementId: string, clientX: number, clientY: number): void {
  dismissMenu();

  const s = debugController.state;
  const sk = (window as any).sk;
  if (!sk?.layouts?.[s.currentSlideIndex]) return;

  const sceneEl: SceneElement = sk.layouts[s.currentSlideIndex].elements[elementId];
  if (!sceneEl) return;

  const menu = document.createElement('div');
  menu.style.cssText = MENU_STYLE;
  menu.setAttribute('data-sk-debug', 'context-menu');

  // Determine what's available for Add Constraint
  const isConnector = sceneEl.type === 'connector';
  const isStack = sceneEl.provenance?.x?.source === 'stack' || sceneEl.provenance?.y?.source === 'stack';
  const xConstrained = sceneEl.provenance?.x?.source === 'constraint';
  const yConstrained = sceneEl.provenance?.y?.source === 'constraint';

  if (isConnector) {
    // No Add Constraint for connectors — skip entirely
  } else if (isStack) {
    const addItem = createMenuItem('Add Constraint', {
      disabled: true, hasSubmenu: true, disabledHint: '(stack)',
    });
    menu.appendChild(addItem);
  } else {
    // Determine available axes
    const availableYTypes = yConstrained ? [] : [...Y_AXIS_TYPES];
    const availableXTypes = xConstrained ? [] : [...X_AXIS_TYPES];

    if (availableYTypes.length === 0 && availableXTypes.length === 0) {
      const addItem = createMenuItem('Add Constraint', {
        disabled: true, hasSubmenu: true, disabledHint: '(both axes constrained)',
      });
      menu.appendChild(addItem);
    } else {
      const addItem = createMenuItem('Add Constraint', { hasSubmenu: true });
      menu.appendChild(addItem);

      // Build submenu
      const submenu = document.createElement('div');
      submenu.style.cssText = SUBMENU_STYLE;
      submenu.setAttribute('data-sk-debug', 'context-submenu');

      if (availableYTypes.length > 0) {
        submenu.appendChild(createSectionHeader('Y-axis'));
        for (const type of availableYTypes) {
          submenu.appendChild(createMenuItem(type, {
            onClick: () => {
              dismissMenu();
              startPickMode(elementId, 'y', type, s.currentSlideIndex);
            },
          }));
        }
      }

      if (availableXTypes.length > 0) {
        if (availableYTypes.length > 0) submenu.appendChild(createSeparator());
        submenu.appendChild(createSectionHeader('X-axis'));
        for (const type of availableXTypes) {
          submenu.appendChild(createMenuItem(type, {
            onClick: () => {
              dismissMenu();
              startPickMode(elementId, 'x', type, s.currentSlideIndex);
            },
          }));
        }
      }

      // Show submenu on hover
      let submenuTimeout: ReturnType<typeof setTimeout> | null = null;
      addItem.addEventListener('mouseenter', () => {
        if (submenuTimeout) { clearTimeout(submenuTimeout); submenuTimeout = null; }
        if (activeSubmenu) { activeSubmenu.remove(); activeSubmenu = null; }
        positionSubmenu(submenu, addItem, menu);
        document.body.appendChild(submenu);
        activeSubmenu = submenu;
      });
      addItem.addEventListener('mouseleave', () => {
        submenuTimeout = setTimeout(() => {
          if (activeSubmenu === submenu && !submenu.matches(':hover')) {
            submenu.remove();
            activeSubmenu = null;
          }
        }, 200);
      });
      submenu.addEventListener('mouseenter', () => {
        if (submenuTimeout) { clearTimeout(submenuTimeout); submenuTimeout = null; }
      });
      submenu.addEventListener('mouseleave', () => {
        submenuTimeout = setTimeout(() => {
          submenu.remove();
          if (activeSubmenu === submenu) activeSubmenu = null;
        }, 200);
      });
    }
  }

  // Separator + action items
  menu.appendChild(createSeparator());
  menu.appendChild(createMenuItem('Duplicate', { disabled: true }));

  // Delete — enabled for non-internal elements
  const isInternal = sceneEl._internal;
  menu.appendChild(createMenuItem('Delete', {
    disabled: isInternal,
    disabledHint: isInternal ? '(internal)' : undefined,
    onClick: isInternal ? undefined : () => {
      dismissMenu();
      import('./debug-inspector-delete.js')
        .then(mod => mod.deleteElement(elementId, s.currentSlideIndex))
        .catch(err => console.error('[slidekit] Failed to load delete module', err));
    },
  }));

  // Position and show
  positionMenu(menu, clientX, clientY);
  document.body.appendChild(menu);
  activeMenu = menu;
  setupDismissListeners();
}

// =============================================================================
// Constraint context menu
// =============================================================================

function showConstraintMenu(elementId: string, axis: 'x' | 'y', clientX: number, clientY: number): void {
  dismissMenu();

  const s = debugController.state;
  const sk = (window as any).sk;
  if (!sk?.layouts?.[s.currentSlideIndex]) return;

  const sceneEl: SceneElement = sk.layouts[s.currentSlideIndex].elements[elementId];
  if (!sceneEl) return;

  // Get current constraint type from provenance
  const prov = sceneEl.provenance?.[axis];
  const currentType = prov?.type || '';

  const menu = document.createElement('div');
  menu.style.cssText = MENU_STYLE;
  menu.setAttribute('data-sk-debug', 'context-menu');

  // Change Type submenu
  const changeItem = createMenuItem('Change Type', { hasSubmenu: true });
  menu.appendChild(changeItem);

  const submenu = document.createElement('div');
  submenu.style.cssText = SUBMENU_STYLE;
  submenu.setAttribute('data-sk-debug', 'context-submenu');

  // Same-axis types
  const sameAxisTypes = typesForAxis(axis);
  const otherAxis: 'x' | 'y' = axis === 'x' ? 'y' : 'x';
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
      },
    }));
  }

  submenu.appendChild(createSeparator());
  submenu.appendChild(createSectionHeader(`${otherAxis}-axis`));
  for (const type of crossAxisTypes) {
    submenu.appendChild(createMenuItem(type, {
      onClick: () => {
        dismissMenu();
        changeConstraintType(elementId, axis, type, s.currentSlideIndex);
      },
    }));
  }

  // Submenu hover logic
  let submenuTimeout: ReturnType<typeof setTimeout> | null = null;
  changeItem.addEventListener('mouseenter', () => {
    if (submenuTimeout) { clearTimeout(submenuTimeout); submenuTimeout = null; }
    if (activeSubmenu) { activeSubmenu.remove(); activeSubmenu = null; }
    positionSubmenu(submenu, changeItem, menu);
    document.body.appendChild(submenu);
    activeSubmenu = submenu;
  });
  changeItem.addEventListener('mouseleave', () => {
    submenuTimeout = setTimeout(() => {
      if (activeSubmenu === submenu && !submenu.matches(':hover')) {
        submenu.remove();
        activeSubmenu = null;
      }
    }, 200);
  });
  submenu.addEventListener('mouseenter', () => {
    if (submenuTimeout) { clearTimeout(submenuTimeout); submenuTimeout = null; }
  });
  submenu.addEventListener('mouseleave', () => {
    submenuTimeout = setTimeout(() => {
      submenu.remove();
      if (activeSubmenu === submenu) activeSubmenu = null;
    }, 200);
  });

  // Break Constraint
  menu.appendChild(createSeparator());
  menu.appendChild(createMenuItem('Break Constraint', {
    onClick: () => {
      dismissMenu();
      breakConstraint(elementId, axis, s.currentSlideIndex);
    },
  }));

  positionMenu(menu, clientX, clientY);
  document.body.appendChild(menu);
  activeMenu = menu;
  setupDismissListeners();
}

// =============================================================================
// Menu positioning
// =============================================================================

function positionMenu(menu: HTMLDivElement, clientX: number, clientY: number): void {
  // Render offscreen to measure
  menu.style.left = '-9999px';
  menu.style.top = '-9999px';
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

// =============================================================================
// Pick mode entry point (delegates to debug-inspector-pick)
// =============================================================================

async function startPickMode(
  elementId: string,
  axis: 'x' | 'y',
  constraintType: string,
  slideIndex: number,
): Promise<void> {
  // Dynamic import to avoid circular dependencies
  const { enterPickMode } = await import('./debug-inspector-pick.js');
  enterPickMode(elementId, axis, constraintType, slideIndex);
}

// =============================================================================
// Context menu event handler
// =============================================================================

function handleContextMenu(event: MouseEvent): void {
  const s = debugController.state;
  if (!s.debugOverlay) return;
  if (s.pickMode) return; // Don't show menu during pick mode

  const target = event.target as HTMLElement;

  // Don't intercept right-clicks inside the inspector panel
  if (target?.closest('[data-sk-role="debug-inspector"]')) return;

  // Check for constraint arrow hit target
  const hitTarget = target?.closest('[data-sk-debug="rel-hit"]');
  if (hitTarget) {
    const elementId = hitTarget.getAttribute('data-sk-debug-element');
    const axis = hitTarget.getAttribute('data-sk-debug-axis') as 'x' | 'y' | null;
    if (elementId && axis) {
      event.preventDefault();
      event.stopPropagation();
      showConstraintMenu(elementId, axis, event.clientX, event.clientY);
      return;
    }
  }

  // Check for element
  const skEl = target?.closest('[data-sk-id]');
  if (skEl) {
    const id = skEl.getAttribute('data-sk-id');
    if (id) {
      event.preventDefault();
      event.stopPropagation();
      showElementMenu(id, event.clientX, event.clientY);
      return;
    }
  }
}

// =============================================================================
// Attach / detach
// =============================================================================

export function attachContextMenuHandler(): void {
  document.addEventListener('contextmenu', handleContextMenu, true);
}

export function detachContextMenuHandler(): void {
  document.removeEventListener('contextmenu', handleContextMenu, true);
  dismissMenu();
}

// Compound Primitives — connect, panel, figure

import { nextId } from './id.js';
import { el, group, vstack } from './elements.js';
import { resolveSpacing } from './spacing.js';

// =============================================================================
// Compound Primitives — connect, panel (M7)
// =============================================================================

/**
 * Create a connector element between two elements.
 *
 * Returns a special element type "connector" that gets resolved during
 * layout Phase 4 after all element positions are finalized.
 * The connector computes endpoints based on anchor points on the source
 * and target elements, then renders as SVG.
 *
 * @param {string} fromId - ID of the source element
 * @param {string} toId - ID of the target element
 * @param {object} [props={}] - Connector properties
 * @param {string} [props.type="straight"] - Line type: "straight", "curved", "elbow"
 * @param {string} [props.arrow="end"] - Arrow heads: "none", "start", "end", "both"
 * @param {string} [props.color="#ffffff"] - Line color
 * @param {number} [props.thickness=2] - Line thickness
 * @param {Array|null} [props.dash=null] - Dash array (e.g., [5, 5]) or null for solid
 * @param {string} [props.fromAnchor="cr"] - Anchor point on source element
 * @param {string} [props.toAnchor="cl"] - Anchor point on target element
 * @param {string} [props.label] - Optional label text
 * @param {object} [props.labelStyle] - Style for the label { size, color, font, weight }
 * @returns {{ id: string, type: string, props: object }}
 */
export function connect(fromId, toId, props = {}) {
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
    label: rest.label || null,
    labelStyle: rest.labelStyle || {},
    fromId,
    toId,
    // Common props
    x: 0,
    y: 0,
    layer: rest.layer || "content",
    opacity: rest.opacity ?? 1,
    style: rest.style || {},
    className: rest.className || "",
    anchor: "tl",
  };

  return { id, type: "connector", props: resolved };
}

/**
 * Compute pixel coordinates for an anchor point on an element's bounding box.
 *
 * @param {{ x: number, y: number, w: number, h: number }} bounds
 * @param {string} anchor - Anchor point (tl, tc, tr, cl, cc, cr, bl, bc, br)
 * @returns {{ x: number, y: number }}
 */
export function getAnchorPoint(bounds, anchor) {
  const row = anchor[0]; // t, c, b
  const col = anchor[1]; // l, c, r

  let px, py;

  if (col === "l") px = bounds.x;
  else if (col === "c") px = bounds.x + bounds.w / 2;
  else px = bounds.x + bounds.w; // "r"

  if (row === "t") py = bounds.y;
  else if (row === "c") py = bounds.y + bounds.h / 2;
  else py = bounds.y + bounds.h; // "b"

  return { x: px, y: py };
}


/**
 * Create a panel element — a visual container with background, padding, and
 * children laid out vertically inside.
 *
 * Under the hood, panel() creates a group containing a rect background +
 * a vstack of children, with padding applied as coordinate offsets.
 * Children with w: "fill" resolve to panel.w - 2 * padding.
 *
 * @param {Array} children - Array of SlideKit elements
 * @param {object} [props={}] - Panel properties
 * @param {number} [props.x=0] - X position
 * @param {number} [props.y=0] - Y position
 * @param {number} [props.w] - Width
 * @param {number} [props.h] - Height (auto-computed from children if not specified)
 * @param {number|string} [props.padding=24] - Internal padding (px number or spacing token)
 * @param {number|string} [props.gap=16] - Gap between children (px number or spacing token)
 * @returns {{ id: string, type: string, children: Array, props: object }}
 */
export function panel(children, props = {}) {
  const { id: customId, ...rest } = props;
  const id = customId || nextId();

  const padding = resolveSpacing(rest.padding ?? 24);
  const gap = resolveSpacing(rest.gap ?? 16);
  const panelW = rest.w;
  const panelH = rest.h;

  // Resolve "fill" width on children: fill = panelW - 2 * padding
  // Clamp to 0 to prevent negative widths when panel is narrower than 2*padding
  // NOTE: "fill" resolution happens at creation time. This works correctly as long
  // as panelW is a concrete number at panel() call time. If panelW is not known
  // until layout, wrap the panel creation after layout resolves the parent's width.
  const contentW = panelW != null ? Math.max(0, panelW - 2 * padding) : undefined;
  const resolvedChildren = children.map(child => {
    if (child.props && child.props.w === "fill" && contentW !== undefined) {
      // Clone the child with resolved width
      return { ...child, props: { ...child.props, w: contentW } };
    }
    return child;
  });

  // Build the vstack for the children
  const childStack = vstack(resolvedChildren, {
    x: padding,
    y: padding,
    w: contentW,
    gap,
  });

  // Build the background element
  const bgStyle = { ...(rest.style || {}) };
  if (rest.fill) bgStyle.background = rest.fill;
  if (rest.radius !== undefined) bgStyle.borderRadius = typeof rest.radius === "number" ? `${rest.radius}px` : rest.radius;
  if (rest.border !== undefined) bgStyle.border = rest.border;

  const bgRect = el("", {
    x: 0,
    y: 0,
    w: panelW || 0,
    style: bgStyle,
    className: rest.className || "",
  });

  // Create the group container
  // Pass w/h to the group so the layout pipeline knows the panel's intrinsic
  // size during Phase 1.  Without this, getEffectiveDimensions returns {w:0,h:0}
  // for the group, causing parent stacks to compute wrong totals.
  const groupProps = {
    id,
    x: rest.x ?? 0,
    y: rest.y ?? 0,
    layer: rest.layer || "content",
    opacity: rest.opacity ?? 1,
    anchor: rest.anchor || "tl",
  };
  if (panelW != null) groupProps.w = panelW;
  if (panelH != null) groupProps.h = panelH;
  const result = group([bgRect, childStack], groupProps);

  // Tag as a panel compound for layout pipeline integration
  result._compound = "panel";
  result._panelConfig = { padding, gap, panelW, panelH };

  return result;
}

// =============================================================================
// Figure Compound (P2.3)
// =============================================================================

/**
 * Create a figure element: background container + image + optional caption.
 *
 * Returns a group containing:
 *   1. Background rect (el with fill/radius)
 *   2. Image element (el with <img>, inset by containerPadding)
 *   3. Caption (optional el, positioned below the container)
 *
 * @param {object} opts - Figure configuration
 * @param {string} [opts.id] - Custom ID for the figure group
 * @param {string} opts.src - Image source URL
 * @param {number} [opts.x=0] - X position
 * @param {number} [opts.y=0] - Y position
 * @param {number} opts.w - Container width (required)
 * @param {number} opts.h - Container height (required for v1)
 * @param {string} [opts.anchor='tl'] - Anchor point
 * @param {string} [opts.layer='content'] - Layer name
 * @param {string} [opts.containerFill='transparent'] - Background fill color
 * @param {number} [opts.containerRadius=0] - Border radius in px
 * @param {number|string} [opts.containerPadding=0] - Padding (px or spacing token)
 * @param {string} [opts.caption] - Optional HTML caption string
 * @param {number|string} [opts.captionGap=0] - Gap between container and caption (px or spacing token)
 * @param {string} [opts.fit='contain'] - CSS object-fit for the image
 * @param {object} [opts.style={}] - Additional style for the group
 * @returns {{ id: string, type: string, children: Array, props: object }}
 */
export function figure(opts = {}) {
  const {
    id: customId, src, x = 0, y = 0, w, h,
    anchor = 'tl', layer = 'content',
    containerFill = 'transparent', containerRadius = 0,
    containerPadding = 0,
    caption, captionGap = 0,
    fit = 'contain',
    style = {},
  } = opts;

  const padPx = resolveSpacing(containerPadding);
  const gapPx = resolveSpacing(captionGap);

  const figId = customId || nextId();

  // Resolve border-radius: number -> "Npx", string -> pass through
  const radiusVal = typeof containerRadius === 'number'
    ? `${containerRadius}px`
    : containerRadius;

  // Background container rect
  const bgRect = el('', {
    id: `${figId}-bg`,
    x: 0, y: 0, w, h,
    style: { background: containerFill, borderRadius: radiusVal },
  });

  // Image element — clamp to 0 to prevent negative sizes when padding exceeds half
  const innerW = Math.max(0, w - 2 * padPx);
  const innerH = Math.max(0, h - 2 * padPx);
  const img = el(`<img src="${src}" style="object-fit: ${fit}; width: 100%; height: 100%; display: block;">`, {
    id: `${figId}-img`,
    x: padPx, y: padPx,
    w: innerW,
    h: innerH,
  });

  const children = [bgRect, img];

  // Optional caption
  if (caption) {
    const cap = el(caption, {
      id: `${figId}-caption`,
      x: 0, y: h + gapPx,
      w,
    });
    children.push(cap);
  }

  // Pass w and h to the group so the layout pipeline knows the figure's
  // intrinsic size during Phase 1 (same pattern as panel).
  const result = group(children, {
    id: figId,
    x, y, w, h,
    anchor,
    layer,
    style,
  });

  // Tag as a figure compound for layout pipeline integration
  result._compound = 'figure';
  result._figureConfig = { src, containerFill, containerRadius, containerPadding: padPx, captionGap: gapPx, fit };

  return result;
}

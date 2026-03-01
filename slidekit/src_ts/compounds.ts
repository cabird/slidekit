// Compound Primitives — connect, panel, figure

import { nextId } from './id.js';
import { el, group, vstack } from './elements.js';
import type { InputProps } from './elements.js';
import { resolveSpacing } from './spacing.js';
import type {
  SlideElement,
  ConnectorElement,
  ConnectorProps,
  ConnectorType,
  ArrowType,
  PanelElement,
  PanelConfig,
  FigureElement,
  FigureConfig,
  Rect,
  Point,
  LayerName,
} from './types.js';

// =============================================================================
// Compound Primitives — connect, panel (M7)
// =============================================================================

/** Input properties for connector creation. */
export interface ConnectorInputProps {
  id?: string;
  /** Connector routing type (overrides "type" to avoid collision). */
  type?: string;
  arrow?: string;
  color?: string;
  thickness?: number;
  dash?: string | null;
  fromAnchor?: string;
  toAnchor?: string;
  label?: string | null;
  labelStyle?: Record<string, unknown>;
  layer?: string;
  opacity?: number;
  style?: Record<string, unknown>;
  className?: string;
}

/**
 * Create a connector element between two elements.
 *
 * Returns a special element type "connector" that gets resolved during
 * layout Phase 4 after all element positions are finalized.
 * The connector computes endpoints based on anchor points on the source
 * and target elements, then renders as SVG.
 *
 * @param fromId - ID of the source element
 * @param toId - ID of the target element
 * @param props - Connector properties
 * @returns A ConnectorElement node
 */
export function connect(fromId: string, toId: string, props: ConnectorInputProps = {}): ConnectorElement {
  const { id: customId, ...rest } = props;
  const id = customId || nextId();

  const resolved: ConnectorProps = {
    connectorType: (rest.type as ConnectorType) || "straight",
    arrow: (rest.arrow as ArrowType) ?? "end",
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
    layer: (rest.layer as ConnectorProps["layer"]) || "content",
    opacity: rest.opacity ?? 1,
    style: rest.style || {},
    className: rest.className || "",
    anchor: "tl",
  };

  return { id, type: "connector", props: resolved, _layoutFlags: {} };
}

/**
 * Compute pixel coordinates for an anchor point on an element's bounding box.
 *
 * @param bounds - The element's bounding rectangle
 * @param anchor - Anchor point (tl, tc, tr, cl, cc, cr, bl, bc, br)
 * @returns The computed point
 */
export function getAnchorPoint(bounds: Rect, anchor: string): Point {
  const row = anchor[0]; // t, c, b
  const col = anchor[1]; // l, c, r

  let px: number, py: number;

  if (col === "l") px = bounds.x;
  else if (col === "c") px = bounds.x + bounds.w / 2;
  else px = bounds.x + bounds.w; // "r"

  if (row === "t") py = bounds.y;
  else if (row === "c") py = bounds.y + bounds.h / 2;
  else py = bounds.y + bounds.h; // "b"

  return { x: px, y: py };
}


/** Input properties for panel creation. */
export interface PanelInputProps extends InputProps {
  /** Panel padding (px or spacing token). */
  padding?: number | string;
  /** Background fill color. */
  fill?: string;
  /** Border radius (number in px or CSS string). */
  radius?: number | string;
  /** Border CSS string. */
  border?: string;
}

/**
 * Create a panel element — a visual container with background, padding, and
 * children laid out vertically inside.
 *
 * Under the hood, panel() creates a group containing a rect background +
 * a vstack of children, with padding applied as coordinate offsets.
 * Children with w: "fill" resolve to panel.w - 2 * padding.
 *
 * @param children - Array of SlideKit elements
 * @param props - Panel properties
 * @returns A PanelElement node
 */
export function panel(children: SlideElement[], props: PanelInputProps = {}): PanelElement {
  const { id: customId, ...rest } = props;
  const id = customId || nextId();

  const padding = resolveSpacing(rest.padding ?? 24);
  const gap = resolveSpacing(rest.gap ?? 16);
  const panelW = rest.w as number | undefined;
  const panelH = rest.h as number | undefined;

  // Resolve "fill" width on children: fill = panelW - 2 * padding
  // Clamp to 0 to prevent negative widths when panel is narrower than 2*padding
  // NOTE: "fill" resolution happens at creation time. This works correctly as long
  // as panelW is a concrete number at panel() call time. If panelW is not known
  // until layout, wrap the panel creation after layout resolves the parent's width.
  const contentW = panelW != null ? Math.max(0, panelW - 2 * padding) : undefined;
  const resolvedChildren = children.map((child: SlideElement) => {
    if (child.props && child.props.w === "fill" && contentW !== undefined) {
      // Clone the child with resolved width
      return { ...child, props: { ...child.props, w: contentW } } as SlideElement;
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
  const bgStyle: Record<string, unknown> = { ...(rest.style || {}) };
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
  const groupProps: InputProps = {
    id,
    x: rest.x ?? 0,
    y: rest.y ?? 0,
    layer: rest.layer || "content",
    opacity: rest.opacity ?? 1,
    anchor: rest.anchor || "tl",
  };
  if (panelW != null) groupProps.w = panelW;
  if (panelH != null) groupProps.h = panelH;

  const panelConfig: PanelConfig = { padding, gap, panelW, panelH };

  // Construct the PanelElement directly — avoids @ts-ignore on group return
  const groupBase = group([bgRect, childStack], groupProps);
  const result: PanelElement = {
    ...groupBase,
    _compound: "panel",
    _panelConfig: panelConfig,
  };

  return result;
}

// =============================================================================
// Figure Compound (P2.3)
// =============================================================================

/** Input properties for figure creation. */
export interface FigureInputProps {
  id?: string;
  /** Image source URL or path. */
  src?: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  anchor?: string;
  layer?: LayerName;
  /** Background fill for the container. */
  containerFill?: string;
  /** Border radius for the container. */
  containerRadius?: number | string;
  /** Padding inside the container. */
  containerPadding?: number | string;
  /** Caption text (HTML string). */
  caption?: string;
  /** Gap between image and caption. */
  captionGap?: number | string;
  /** Object-fit for the image. */
  fit?: string;
  /** CSS style object. */
  style?: Record<string, unknown>;
}

/**
 * Create a figure element: background container + image + optional caption.
 *
 * Returns a group containing:
 *   1. Background rect (el with fill/radius)
 *   2. Image element (el with <img>, inset by containerPadding)
 *   3. Caption (optional el, positioned below the container)
 *
 * @param opts - Figure configuration
 * @returns A FigureElement node
 */
export function figure(opts: FigureInputProps = {}): FigureElement {
  const {
    id: customId, src = '', x = 0, y = 0, w = 0, h = 0,
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

  const children: SlideElement[] = [bgRect, img];

  // Optional caption
  if (caption) {
    const cap = el(caption, {
      id: `${figId}-caption`,
      x: 0, y: h + gapPx,
      w,
    });
    children.push(cap);
  }

  const figureConfig: FigureConfig = {
    src,
    containerFill,
    containerRadius,
    containerPadding: padPx,
    captionGap: gapPx,
    fit,
  };

  // Construct the FigureElement directly — avoids @ts-ignore on group return
  const groupBase = group(children, {
    id: figId,
    x, y, w, h,
    anchor,
    layer,
    style,
  });

  const result: FigureElement = {
    ...groupBase,
    _compound: 'figure',
    _figureConfig: figureConfig,
  };

  return result;
}

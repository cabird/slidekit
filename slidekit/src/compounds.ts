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
  AnchorPointResult,
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
  /** Pixel offset along the edge tangent for port spreading (from end). */
  fromPortOffset?: number;
  /** Pixel offset along the edge tangent for port spreading (to end). */
  toPortOffset?: number;
  /** Sort order hint for auto port spreading (from end). */
  fromPortOrder?: number;
  /** Sort order hint for auto port spreading (to end). */
  toPortOrder?: number;
  label?: string | null;
  labelStyle?: Record<string, unknown>;
  /** Position of the label along the path (0 = start, 1 = end, default 0.5). */
  labelPosition?: number;
  /** Pixel offset of the label from the path point. */
  labelOffset?: { x?: number; y?: number };
  /** Corner radius for elbow connectors (px). 0 = sharp corners (default). */
  cornerRadius?: number;
  /** Obstacle search margin (px) around the connector bounding box. Default 200. */
  obstacleMargin?: number;
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
export function getAnchorPoint(bounds: Rect, anchor: string): AnchorPointResult {
  const row = anchor[0]; // t, c, b
  const col = anchor[1]; // l, c, r

  let px: number, py: number;
  let dx = 0, dy = 0;

  if (col === "l") { px = bounds.x; dx = -1; }
  else if (col === "c") { px = bounds.x + bounds.w / 2; }
  else { px = bounds.x + bounds.w; dx = 1; } // "r"

  if (row === "t") { py = bounds.y; dy = -1; }
  else if (row === "c") { py = bounds.y + bounds.h / 2; }
  else { py = bounds.y + bounds.h; dy = 1; } // "b"

  // Normalize corner directions to unit length
  if (dx !== 0 && dy !== 0) {
    const len = Math.sqrt(dx * dx + dy * dy);
    dx /= len;
    dy /= len;
  }

  // Center anchor: no inherent direction, will be computed based on target
  return { x: px, y: py, dx, dy };
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
  /** Main-axis (vertical) alignment of panel content within the panel's height.
   *  Passed through to the internal vstack. */
  vAlign?: 'top' | 'center' | 'bottom';
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
  const panelW = typeof rest.w === 'number' ? rest.w : undefined;
  const panelH = typeof rest.h === 'number' ? rest.h : undefined;

  // Resolve "fill" width on children: fill = panelW - 2 * padding
  // When panelW is numeric, compute content width now. When panelW is "fill",
  // defer — the layout pipeline will sync internal widths after resolving the panel.
  const contentW = panelW != null ? Math.max(0, panelW - 2 * padding) : undefined;
  const resolvedChildren = children.map((child: SlideElement) => {
    if (child.props && child.props.w === "fill" && contentW !== undefined) {
      // Clone the child with resolved width
      return { ...child, props: { ...child.props, w: contentW } } as SlideElement;
    }
    return child;
  });

  // Build the vstack for the children
  // Pass through align (cross-axis) and vAlign (main-axis) if provided
  const vstackProps: Record<string, unknown> = {
    x: padding,
    y: padding,
    w: contentW,
    gap,
  };
  if (rest.align !== undefined) vstackProps.align = rest.align;
  if (rest.vAlign !== undefined) vstackProps.vAlign = rest.vAlign;
  // When panel has explicit h, pass content height to the vstack so vAlign can work
  if (panelH != null) vstackProps.h = Math.max(0, panelH - 2 * padding);
  const childStack = vstack(resolvedChildren, vstackProps);

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
  // Preserve non-numeric width tokens (e.g. 'fill') for layout to resolve
  if (typeof rest.w === 'string') groupProps.w = rest.w as unknown as number;
  else if (panelW != null) groupProps.w = panelW;
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

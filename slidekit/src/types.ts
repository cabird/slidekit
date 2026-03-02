/**
 * SlideKit Type System -- Null/Undefined Policy
 *
 * - `undefined` = field is absent / not yet computed / not applicable
 * - `null` = intentionally empty (e.g., "no parent", "no reference")
 * - All optional fields use `?` (which means `T | undefined`)
 * - Use `assertDefined()` when accessing values that must exist at a given pipeline phase
 * - Use `mustGet()` for Map lookups where missing keys indicate bugs
 */

// =============================================================================
// SlideKit -- TypeScript Type Definitions
// =============================================================================

/** Axis-aligned bounding rectangle. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A 2D point. */
export interface Point {
  x: number;
  y: number;
}

/** A 2D point with an associated direction vector. */
export interface AnchorPointResult {
  x: number;
  y: number;
  dx: number;
  dy: number;
}

// =============================================================================
// String Literal Union Types — discriminators and constrained values
// =============================================================================

/** All possible _rel marker types. */
export type RelMarkerKind =
  | "below" | "above" | "rightOf" | "leftOf"
  | "centerV" | "centerH"
  | "alignTop" | "alignBottom" | "alignLeft" | "alignRight"
  | "centerIn" | "between";

/** Provenance source values. */
export type ProvenanceSource =
  | "authored" | "measured" | "stack" | "constraint" | "transform" | "default";

/** Connector line types. */
export type ConnectorType = "straight" | "curved" | "elbow";

/** Arrow placement. */
export type ArrowType = "none" | "end" | "start" | "both";

/** Element type discriminator. */
export type ElementType = "el" | "group" | "vstack" | "hstack" | "connector";

/** Compound type discriminator. */
export type CompoundType = "panel" | "figure";

// =============================================================================
// Element Props — all properties that can appear in an element's `props` bag
// =============================================================================

/** Position value: a number in px, a percentage string, or a RelMarker. */
export type PositionValue = number | string | RelMarker;

/** Size value: a number in px, a percentage string, or "fill". */
export type SizeValue = number | string;

/** Anchor point identifier (two-character: row + col). */
export type AnchorPoint = "tl" | "tc" | "tr" | "cl" | "cc" | "cr" | "bl" | "bc" | "br" | string;

/** Layer determines rendering/z-index ordering. */
export type LayerName = "bg" | "content" | "overlay";

/** Vertical alignment for el() content. */
export type VAlign = "top" | "center" | "bottom";

/** Overflow policy for el() elements with explicit height. */
export type OverflowPolicy = "visible" | "warn" | "clip" | "error";

/** Horizontal alignment for vstack children. */
export type HAlign = "left" | "center" | "right" | "stretch";

/** Vertical alignment for hstack children. */
export type HStackAlign = "top" | "middle" | "bottom" | "stretch";

/** Group bounds mode. */
export type BoundsMode = "hug" | undefined;

/**
 * Common element properties shared by all element types.
 *
 * These are the "authored" properties that users pass to factory functions.
 * During layout, some of these may be mutated (e.g. percentage strings
 * resolved to numbers). The layout pipeline reads from this bag extensively.
 */
export interface ElementProps {
  // -- Position --
  /** Horizontal position (px, percentage string, or RelMarker). */
  x?: PositionValue;
  /** Vertical position (px, percentage string, or RelMarker). */
  y?: PositionValue;

  // -- Size --
  /** Width (px, percentage string, or "fill"). */
  w?: SizeValue;
  /** Height (px, percentage string, or "fill"). */
  h?: SizeValue;
  /** Maximum width constraint. */
  maxW?: number;
  /** Maximum height constraint. */
  maxH?: number;

  // -- Layout --
  /** Anchor point for position interpretation. */
  anchor?: AnchorPoint;
  /** Rendering layer. */
  layer?: LayerName;
  /** Vertical alignment for el() content within its box. */
  valign?: VAlign;
  /** Overflow policy for el() elements with explicit height. */
  overflow?: OverflowPolicy;

  // -- Visual --
  /** CSS style object (subset filtered by filterStyle). */
  style?: Record<string, unknown>;
  /** Opacity (0-1). */
  opacity?: number;
  /** Rotation in degrees. */
  rotate?: number;
  /** CSS class name(s). */
  className?: string;
  /** Shadow (CSS box-shadow string or object). */
  shadow?: string;

  // -- Z-order --
  /** Explicit z-order within the same layer. */
  z?: number;

  // -- Stack-specific --
  /** Gap between stack children (px or spacing token). */
  gap?: number | string;
  /** Alignment of children within a stack. */
  align?: HAlign | HStackAlign | string;

  // -- Group-specific --
  /** Group bounds mode ("hug" = shrink-wrap to children). */
  bounds?: BoundsMode;
  /** Scale factor for group contents. */
  scale?: number;
  /** Whether to clip children to group bounds. */
  clip?: boolean;

  // -- Internal / layout pipeline --
  /** Layout flags set by the overflow/layout pipeline. */
  _layoutFlags?: LayoutFlags;

  /** Allow additional user-defined properties to pass through. */
  [key: string]: unknown;
}

/** Layout flags set during layout processing. */
export interface LayoutFlags {
  /** Whether content should be clipped (overflow: "clip"). */
  clip?: boolean;
  /** Allow additional flags. */
  [key: string]: unknown;
}

/**
 * Connector-specific properties stored in `props`.
 * Connectors do not use all common props — they have their own set.
 */
export interface ConnectorProps {
  // -- Connector-specific --
  /** Connector routing type (e.g., "straight", "elbow"). */
  connectorType?: ConnectorType;
  /** Arrow placement: "start", "end", "both", or "none". */
  arrow?: ArrowType;
  /** Line color. */
  color?: string;
  /** Line thickness in px. */
  thickness?: number;
  /** Dash pattern (e.g., "4 2") or null for solid. */
  dash?: string | null;
  /** Anchor point on the source element. */
  fromAnchor?: AnchorPoint;
  /** Anchor point on the target element. */
  toAnchor?: AnchorPoint;
  /** Optional text label on the connector. */
  label?: string | null;
  /** Style for the label text. */
  labelStyle?: Record<string, unknown>;
  /** Source element ID. */
  fromId: string;
  /** Target element ID. */
  toId: string;

  // -- Common positional props (connectors set these to defaults) --
  x?: number;
  y?: number;
  layer?: LayerName;
  opacity?: number;
  style?: Record<string, unknown>;
  className?: string;
  anchor?: AnchorPoint;

  /** Allow additional properties. */
  [key: string]: unknown;
}

// =============================================================================
// Discriminated Union — Element Types
// =============================================================================

/** Base fields shared by every element node in the slide tree. */
interface BaseElement {
  /** Unique element identifier. */
  id: string;
  /** Internal layout flags set during layout processing (always initialized as {}). */
  _layoutFlags: LayoutFlags;
}

/** A positioned HTML element on the canvas. */
export interface ElElement extends BaseElement {
  type: "el";
  /** HTML content rendered via innerHTML. */
  content: string;
  /** Authored properties. */
  props: ElementProps;
}

/** A group element containing child elements (plain, non-compound). */
export interface GroupElement extends BaseElement {
  type: "group";
  /** Child elements. */
  children: SlideElement[];
  /** Authored properties. */
  props: ElementProps;
  /** Plain groups are never compounds. Use _compound narrowing to distinguish. */
  _compound?: never;
  _panelConfig?: never;
  _figureConfig?: never;
}

/** A vertical stack element. Children are laid out top-to-bottom. */
export interface VStackElement extends BaseElement {
  type: "vstack";
  /** Child elements. */
  children: SlideElement[];
  /** Authored properties. */
  props: ElementProps;
}

/** A horizontal stack element. Children are laid out left-to-right. */
export interface HStackElement extends BaseElement {
  type: "hstack";
  /** Child elements. */
  children: SlideElement[];
  /** Authored properties. */
  props: ElementProps;
}

/** A connector element between two elements (rendered as SVG). */
export interface ConnectorElement extends BaseElement {
  type: "connector";
  /** Connector-specific properties. */
  props: ConnectorProps;
}

/**
 * A panel compound element — a visual container with background,
 * padding, and children laid out vertically inside.
 *
 * Under the hood, panels ARE groups with compound metadata attached.
 */
export interface PanelElement extends BaseElement {
  type: "group";
  /** Child elements (typically [bgRect, childVStack]). */
  children: SlideElement[];
  /** Authored properties. */
  props: ElementProps;
  /** Compound type marker. */
  _compound: "panel";
  /** Panel-specific configuration. */
  _panelConfig: PanelConfig;
}

/**
 * A figure compound element — a container with image + optional caption.
 *
 * Under the hood, figures ARE groups with compound metadata attached.
 */
export interface FigureElement extends BaseElement {
  type: "group";
  /** Child elements (typically [bgRect, imgEl, ?captionEl]). */
  children: SlideElement[];
  /** Authored properties. */
  props: ElementProps;
  /** Compound type marker. */
  _compound: "figure";
  /** Figure-specific configuration. */
  _figureConfig: FigureConfig;
}

/**
 * Discriminated union of all element types in the slide tree.
 *
 * Use `element.type` to narrow. For compound elements (Panel, Figure),
 * further narrow with `element._compound`.
 */
export type SlideElement =
  | ElElement
  | GroupElement
  | VStackElement
  | HStackElement
  | ConnectorElement
  | PanelElement
  | FigureElement;

/** Configuration for panel compound elements. */
export interface PanelConfig {
  /** Inner padding of the panel. */
  padding: number;
  /** Gap between panel children. */
  gap: number;
  /** Explicit panel width. */
  panelW?: number;
  /** Explicit panel height. */
  panelH?: number;
}

/** Configuration for figure compound elements. */
export interface FigureConfig {
  /** Image source URL or path. */
  src: string;
  /** Background fill color for the container. */
  containerFill: string;
  /** Border radius for the container (number in px or string like "50%"). */
  containerRadius: number | string;
  /** Padding inside the container. */
  containerPadding: number;
  /** Gap between image and caption. */
  captionGap: number;
  /** Object-fit value for the image (e.g., "contain", "cover"). */
  fit: string;
}

/** Slide canvas dimensions. */
export interface SlideDimensions {
  w: number;
  h: number;
}

/** Safe zone insets from the slide edges. */
export interface SafeZone {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** A font definition for loading/registration. */
export interface FontDef {
  /** Font family name. */
  family: string;
  /** Font weights to load. */
  weights?: number[];
  /** Font source (e.g., "google"). */
  source?: string;
}

/** Named spacing scale values. */
export interface SpacingScale {
  xs?: number;
  sm?: number;
  md?: number;
  lg?: number;
  xl?: number;
  section?: number;
  /** Allow additional custom spacing keys. */
  [key: string]: number | undefined;
}

/** Top-level SlideKit configuration. */
export interface SlideKitConfig {
  /** Slide canvas dimensions. */
  slide: SlideDimensions;
  /** Safe zone insets. */
  safeZone: SafeZone;
  /** Whether to enable strict validation. */
  strict: boolean;
  /** Minimum allowed font size (px). */
  minFontSize: number;
  /** Fonts to load. */
  fonts: FontDef[];
  /** Spacing scale (named sizes plus custom keys). */
  spacing: SpacingScale;
}

/** Internal mutable state for the SlideKit engine. */
export interface SlideKitState {
  /** Auto-incrementing ID counter. */
  idCounter: number;
  /** Active configuration (null before init). */
  config: SlideKitConfig | null;
  /** Cached safe-zone rectangle (null before first computation). */
  safeRectCache: Rect | null;
  /** Set of already-loaded font families. */
  loadedFonts: Set<string>;
  /** Off-screen container used for text measurement (null before init). */
  measureContainer: HTMLDivElement | null;
  /** Cache of measured text dimensions keyed by cache key. */
  measureCache: Map<string, { w: number; h: number }>;
  /** Accumulated font-related warnings. */
  fontWarnings: Array<Record<string, unknown>>;
  /** Font link elements injected into the DOM. */
  injectedFontLinks: Set<HTMLLinkElement>;
  /** Auto-incrementing transform ID counter. */
  transformIdCounter: number;
}

/** A relative positioning marker. */
export interface RelMarker {
  /** Relationship type (e.g., "below", "rightOf", "centerH"). */
  _rel: RelMarkerKind;
  /** Referenced element ID. */
  ref?: string;
  /** Secondary reference (element ID or numeric value). */
  ref2?: string | number;
  /** Gap distance from the reference. */
  gap?: number;
  /** Bias offset for alignment. */
  bias?: number;
  /** Rectangle for centerIn constraints. */
  rect?: Rect;
}

/** A transform marker attached to a slide definition. */
export interface TransformMarker {
  /** Transform type identifier. */
  _transform: string;
  /** Unique ID for this transform instance. */
  _transformId: string;
  /** Element IDs targeted by this transform. */
  ids: string[];
  /** Transform-specific options. */
  options: Record<string, unknown>;
}

/** Result of resolving an element's intrinsic size. */
export interface ResolvedSize {
  /** Resolved width. */
  w: number;
  /** Resolved height. */
  h: number;
  /** Whether width was determined by measurement (vs authored). */
  wMeasured: boolean;
  /** Whether height was determined by measurement (vs authored). */
  hMeasured: boolean;
}

/** Provenance metadata describing how a resolved value was determined. */
export interface Provenance {
  /** How the value was determined ("authored", "constraint", "measured", etc.). */
  source: ProvenanceSource;
  /** The original authored value (for source="authored"). */
  value?: unknown;
  /** Constraint type (for source="constraint", e.g., "below", "centerH"). */
  type?: string;
  /** Referenced element ID. */
  ref?: string;
  /** Secondary reference. */
  ref2?: string | number;
  /** Gap value from the constraint. */
  gap?: number;
  /** Bias value from the constraint. */
  bias?: number;
  /** Rectangle used for centerIn. */
  rect?: Rect;
  /** Stack parent ID (for stack-positioned elements). */
  stackId?: string;
  /** Measurement context when source="measured". */
  measuredAt?: Record<string, unknown>;
  /** Original authored values before resolution. */
  original?: Record<string, unknown> | Provenance;
}

/** A fully resolved element in the scene graph. */
export interface SceneElement {
  /** Unique element identifier. */
  id: string;
  /** Element type. */
  type: ElementType;
  /** Original authored properties (snapshot taken before layout mutation). */
  authored: AuthoredSpec;
  /** Resolved absolute bounds. */
  resolved: Rect;
  /** Resolved bounds relative to parent. */
  localResolved: Rect;
  /** Parent element ID (null for root elements). */
  parentId: string | null;
  /** Child element IDs. */
  children: string[];
  /** Whether this is an internal/synthetic element. */
  _internal: boolean;
  /** How each dimension was resolved. */
  provenance: {
    x: Provenance;
    y: Provenance;
    w: Provenance;
    h: Provenance;
  };
  /** Internal layout flags. */
  _layoutFlags?: Record<string, unknown>;
  /** Resolved connector geometry. */
  _connectorResolved?: {
    from: AnchorPointResult;
    to: AnchorPointResult;
    fromId: string;
    toId: string;
    fromAnchor: string;
    toAnchor: string;
  };
  /** Style-related warnings. */
  styleWarnings?: Array<Record<string, unknown>>;
  /** Panel child positions — present only on panel compound elements. */
  panelChildren?: Array<{ id: string; type: ElementType; x?: number; y?: number; w?: number; h?: number }>;
}

/** Result of the layout pass. */
export interface LayoutResult {
  /** Resolved scene elements keyed by ID. */
  elements: Record<string, SceneElement>;
  /** IDs of root-level elements. */
  rootIds?: string[];
  /** Resolved transforms. */
  transforms?: TransformMarker[];
  /** Warnings generated during layout. */
  warnings: Array<Record<string, unknown>>;
  /** Errors encountered during layout. */
  errors: Array<Record<string, unknown>>;
  /** Detected element collisions. */
  collisions?: Array<Collision>;
}

/** A slide definition (authored input to the layout engine). */
export interface SlideDefinition {
  /** Optional slide identifier. */
  id?: string;
  /** Slide background color or CSS value. */
  background?: string;
  /** Elements on this slide. */
  elements: SlideElement[];
  /** Transforms to apply after layout. */
  transforms?: TransformMarker[];
  /** Speaker notes for this slide. */
  notes?: string;
}

/** A detected collision between two elements. */
export interface Collision {
  /** ID of the first element. */
  elementA: string;
  /** ID of the second element. */
  elementB: string;
  /** The overlapping rectangle. */
  overlapRect: Rect;
  /** Area of the overlap in square pixels. */
  overlapArea: number;
}

/** Result of filtering styles through the allowed-property list. */
export interface StyleFilterResult {
  /** The filtered style properties. */
  filtered: Record<string, unknown>;
  /** Warnings about disallowed properties. */
  warnings: Array<Record<string, unknown>>;
}

// =============================================================================
// Pipeline Phase Types — data flowing between layout phases
// =============================================================================

/**
 * Authored element spec — a deep-cloned snapshot of the element's original
 * properties captured before any mutation by the layout pipeline.
 * Built at the start of Phase 1 (intrinsics).
 */
export interface AuthoredSpec {
  /** Element type discriminator. */
  type: ElementType;
  /** HTML content (for el() elements). */
  content?: string;
  /** Image source (for figure compound elements). */
  src?: string;
  /** Deep-cloned copy of the element's original props. */
  props: ElementProps | ConnectorProps;
  /** Ordered child element IDs (for containers). */
  children?: string[];
}

/**
 * Maps and data that flow between the 4 layout pipeline phases.
 *
 * Phase 1 (intrinsics) populates: flatMap, authoredSpecs, resolvedSizes
 * Phase 2 (positions) populates: resolvedBounds, sortedOrder
 * Phase 2.5 (overflow) reads resolvedBounds, may mutate _layoutFlags
 * Phase 3 (transforms) mutates resolvedBounds
 * Phase 4 (finalize) reads everything, produces the scene graph
 */
export interface PipelineState {
  /** Element ID -> flat element, built during flatten. */
  flatMap: Map<string, SlideElement>;
  /** Element ID -> deep-cloned authored spec, built at start of Phase 1. */
  authoredSpecs: Map<string, AuthoredSpec>;
  /** Element ID -> intrinsic size data, built in Phase 1. */
  resolvedSizes: Map<string, ResolvedSize>;
  /** Element ID -> resolved position/size, built in Phase 2. */
  resolvedBounds: Map<string, Rect>;
  /** Ordered element IDs from topological sort (Phase 2). */
  sortedOrder: string[];
  /** Child ID -> group parent ID. */
  groupParent: Map<string, string>;
  /** Child ID -> stack parent ID. */
  stackParent: Map<string, string>;
  /** Stack ID -> ordered child IDs. */
  stackChildren: Map<string, string[]>;
  /** Group ID -> child IDs. */
  groupChildren: Map<string, string[]>;
  /** IDs of synthetic panel-internal elements. */
  panelInternals: Set<string>;
  /** Element ID -> bounds before transforms (for provenance). */
  preTransformBounds: Map<string, Rect>;
  /** Resolved transform markers (deep-cloned and ID-assigned). */
  resolvedTransforms: TransformMarker[];
  /** Errors accumulated during pipeline. */
  errors: Array<Record<string, unknown>>;
  /** Warnings accumulated during pipeline. */
  warnings: Array<Record<string, unknown>>;
  /** Collision detection threshold (px^2). */
  collisionThreshold: number;
}

/** Result of flattening the slide element tree. */
export interface FlattenResult {
  /** All elements keyed by ID. */
  flatMap: Map<string, SlideElement>;
  /** Child ID to group parent ID mapping. */
  groupParent: Map<string, string>;
  /** Child ID to stack parent ID mapping. */
  stackParent: Map<string, string>;
  /** Stack ID to ordered child IDs. */
  stackChildren: Map<string, string[]>;
  /** Group ID to child IDs. */
  groupChildren: Map<string, string[]>;
  /** IDs of synthetic panel-internal elements. */
  panelInternals: Set<string>;
}

// =============================================================================
// Compound Element Type Guards
// =============================================================================

/** Narrow a SlideElement to a PanelElement. */
export function isPanelElement(el: SlideElement): el is PanelElement {
  return el.type === "group" && '_compound' in el && (el as unknown as PanelElement)._compound === "panel";
}

/** Narrow a SlideElement to a FigureElement. */
export function isFigureElement(el: SlideElement): el is FigureElement {
  return el.type === "group" && '_compound' in el && (el as unknown as FigureElement)._compound === "figure";
}

/** Narrow a SlideElement to any compound element (Panel or Figure). */
export function isCompoundElement(el: SlideElement): el is PanelElement | FigureElement {
  return el.type === "group" && '_compound' in el;
}

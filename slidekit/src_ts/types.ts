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

/** An element in the slide tree (authored representation). */
export interface SlideElement {
  /** Unique element identifier. */
  id: string;
  /** Element type (e.g., "text", "rect", "group", "vstack"). */
  type: string;
  /** Text or HTML content for text-like elements. */
  content?: string;
  /** Authored properties (position, size, styling, etc.). */
  props: Record<string, unknown>;
  /** Child elements for groups and stacks. */
  children?: SlideElement[];
  /** Compound element type (e.g., "panel", "figure"). */
  _compound?: string;
  /** Panel-specific configuration. */
  _panelConfig?: PanelConfig;
  /** Figure-specific configuration. */
  _figureConfig?: FigureConfig;
  /** Internal layout flags set during layout processing. */
  _layoutFlags?: Record<string, unknown>;
}

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
  _rel: string;
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
  /** How the value was determined ("authored", "constraint", "measured"). */
  source: string;
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
  original?: Record<string, unknown>;
}

/** A fully resolved element in the scene graph. */
export interface SceneElement {
  /** Unique element identifier. */
  id: string;
  /** Element type. */
  type: string;
  /** Original authored properties. */
  authored: Record<string, unknown>;
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
  _connectorResolved?: Record<string, unknown>;
  /** Style-related warnings. */
  styleWarnings?: Array<Record<string, unknown>>;
}

/** Result of the layout pass. */
export interface LayoutResult {
  /** Resolved scene elements keyed by ID. */
  elements: Record<string, SceneElement>;
  /** IDs of root-level elements. */
  rootIds?: string[];
  /** Resolved transforms. */
  transforms?: Array<unknown>;
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

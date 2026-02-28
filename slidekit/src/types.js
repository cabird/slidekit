// @ts-check

// =============================================================================
// SlideKit — JSDoc Type Definitions
// =============================================================================

/**
 * @typedef {Object} Rect
 * @property {number} x
 * @property {number} y
 * @property {number} w
 * @property {number} h
 */

/**
 * @typedef {Object} Point
 * @property {number} x
 * @property {number} y
 */

/**
 * @typedef {Object} SlideElement
 * @property {string} id
 * @property {string} type
 * @property {string} [content]
 * @property {Object} props
 * @property {SlideElement[]} [children]
 * @property {string} [_compound]
 * @property {PanelConfig} [_panelConfig]
 * @property {FigureConfig} [_figureConfig]
 * @property {Object} [_layoutFlags]
 */

/**
 * @typedef {Object} PanelConfig
 * @property {number} padding
 * @property {number} gap
 * @property {number} [panelW]
 * @property {number} [panelH]
 */

/**
 * @typedef {Object} FigureConfig
 * @property {string} src
 * @property {string} containerFill
 * @property {number|string} containerRadius
 * @property {number} containerPadding
 * @property {number} captionGap
 * @property {string} fit
 */

/**
 * @typedef {Object} SlideDimensions
 * @property {number} w
 * @property {number} h
 */

/**
 * @typedef {Object} SafeZone
 * @property {number} left
 * @property {number} right
 * @property {number} top
 * @property {number} bottom
 */

/**
 * @typedef {Object} FontDef
 * @property {string} family
 * @property {number[]} [weights]
 * @property {string} [source]
 */

/**
 * @typedef {Object} SpacingScale
 * @property {number} [xs]
 * @property {number} [sm]
 * @property {number} [md]
 * @property {number} [lg]
 * @property {number} [xl]
 * @property {number} [section]
 */

/**
 * @typedef {Object} SlideKitConfig
 * @property {SlideDimensions} slide
 * @property {SafeZone} safeZone
 * @property {boolean} strict
 * @property {number} minFontSize
 * @property {FontDef[]} fonts
 * @property {SpacingScale & Object<string, number>} spacing
 */

/**
 * @typedef {Object} SlideKitState
 * @property {number} idCounter
 * @property {SlideKitConfig|null} config
 * @property {Rect|null} safeRectCache
 * @property {Set<string>} loadedFonts
 * @property {HTMLDivElement|null} measureContainer
 * @property {Map<string, {w: number, h: number}>} measureCache
 * @property {Array<Object>} fontWarnings
 * @property {Set<HTMLLinkElement>} injectedFontLinks
 * @property {number} transformIdCounter
 */

/**
 * @typedef {Object} RelMarker
 * @property {string} _rel
 * @property {string} [ref]
 * @property {string|number} [ref2]
 * @property {number} [gap]
 * @property {number} [bias]
 * @property {Rect} [rect]
 */

/**
 * @typedef {Object} TransformMarker
 * @property {string} _transform
 * @property {string} _transformId
 * @property {string[]} ids
 * @property {Object} options
 */

/**
 * @typedef {Object} ResolvedSize
 * @property {number} w
 * @property {number} h
 * @property {boolean} wMeasured
 * @property {boolean} hMeasured
 */

/**
 * @typedef {Object} Provenance
 * @property {string} source
 * @property {*} [value]
 * @property {string} [type]
 * @property {string} [ref]
 * @property {string|number} [ref2]
 * @property {number} [gap]
 * @property {number} [bias]
 * @property {Rect} [rect]
 * @property {string} [stackId]
 * @property {Object} [measuredAt]
 * @property {Object} [original]
 */

/**
 * @typedef {Object} SceneElement
 * @property {string} id
 * @property {string} type
 * @property {Object} authored
 * @property {Rect} resolved
 * @property {Rect} localResolved
 * @property {string|null} parentId
 * @property {string[]} children
 * @property {boolean} _internal
 * @property {{ x: Provenance, y: Provenance, w: Provenance, h: Provenance }} provenance
 * @property {Object} [_layoutFlags]
 * @property {Object} [_connectorResolved]
 * @property {Array} [styleWarnings]
 */

/**
 * @typedef {Object} LayoutResult
 * @property {Object<string, SceneElement>} elements
 * @property {string[]} [rootIds]
 * @property {Array} [transforms]
 * @property {Array<Object>} warnings
 * @property {Array<Object>} errors
 * @property {Array<Object>} [collisions]
 */

/**
 * @typedef {Object} SlideDefinition
 * @property {string} [id]
 * @property {string} [background]
 * @property {SlideElement[]} elements
 * @property {TransformMarker[]} [transforms]
 * @property {string} [notes]
 */

/**
 * @typedef {Object} Collision
 * @property {string} elementA
 * @property {string} elementB
 * @property {Rect} overlapRect
 * @property {number} overlapArea
 */

/**
 * @typedef {Object} StyleFilterResult
 * @property {Object} filtered
 * @property {Array<Object>} warnings
 */

/**
 * @typedef {Object} FlattenResult
 * @property {Map<string, SlideElement>} flatMap
 * @property {Map<string, string>} groupParent
 * @property {Map<string, string>} stackParent
 * @property {Map<string, string[]>} stackChildren
 * @property {Map<string, string[]>} groupChildren
 * @property {Set<string>} panelInternals
 */

export {};

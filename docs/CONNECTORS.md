# SlideKit Connectors Reference

Connectors are SVG lines/paths drawn between two positioned elements. They resolve endpoints during layout Phase 4, after all element positions are finalized.

## API

```js
connect(fromId: string, toId: string, props?: ConnectorInputProps): ConnectorElement
```

Returns `{ id, type: "connector", props, _layoutFlags }`. Include the returned element in your slide's `elements` array.

## Connector Properties

| Property | Type | Default | Description |
|---|---|---|---|
| `id` | `string` | auto `sk-N` | Unique identifier |
| `type` | `"straight" \| "curved" \| "elbow" \| "orthogonal"` | `"straight"` | Routing algorithm |
| `arrow` | `"none" \| "start" \| "end" \| "both"` | `"end"` | Arrowhead placement |
| `color` | `string` | `"#ffffff"` | Stroke color |
| `thickness` | `number` | `2` | Stroke width (px) |
| `dash` | `string \| null` | `null` | SVG `stroke-dasharray` (e.g. `"5 5"`, `"10 4 2 4"`, `"2 4"`) |
| `fromAnchor` | `AnchorPoint` | `"cr"` | Source anchor on the from-element |
| `toAnchor` | `AnchorPoint` | `"cl"` | Target anchor on the to-element |
| `cornerRadius` | `number` | `0` | Fillet radius for elbow/orthogonal corners (px) |
| `obstacleMargin` | `number` | `200` | Bounding box expansion (px) for obstacle search |
| `label` | `string \| null` | `null` | Text label placed on the path |
| `labelPosition` | `number` | `0.5` | Label position along path: 0=start, 0.5=middle, 1=end |
| `labelOffset` | `{ x?, y? }` | `{ x: 0, y: -8 }` | Pixel offset from the path point |
| `labelStyle` | `object` | `{}` | `{ size, color, font, weight }` for label text |
| `fromPortOffset` | `number` | — | Explicit pixel offset along the from-edge tangent |
| `toPortOffset` | `number` | — | Explicit pixel offset along the to-edge tangent |
| `fromPortOrder` | `number` | `0` | Sort priority for auto port spreading (from end) |
| `toPortOrder` | `number` | `0` | Sort priority for auto port spreading (to end) |
| `layer` | `LayerName` | `"content"` | Render layer (`"bg"`, `"content"`, `"overlay"`) |
| `opacity` | `number` | `1` | Element opacity |

## Connector Types

### `"straight"`
Direct SVG `<line>` between anchors. Fastest, simplest. Use when no obstacles exist between elements.

### `"curved"`
Cubic bezier with control points offset 40% of distance along each anchor's direction vector. Best for diagonal or arc-shaped connections.

Curved connectors with horizontally-aligned boxes and center-edge anchors (`cr`/`cl`) produce degenerate straight-looking curves because control points are collinear. Use corner anchors (`tr`/`tl`, `br`/`bl`) instead for visible curvature.

### `"elbow"`
Right-angle orthogonal path. Routes through `routeConnector()` which handles stub generation, obstacle avoidance, and waypoint caching. Supports `cornerRadius` for rounded turns.

### `"orthogonal"`
Same as `"elbow"` but with the orthogonal routing flag enabled, which enforces strictly grid-aligned waypoints.

## Anchor Points

Two-character codes: `{row}{col}` where row = `t|c|b`, col = `l|c|r`.

```
tl --- tc --- tr
|              |
cl    cc    cr
|              |
bl --- bc --- br
```

Each anchor has an implicit exit direction vector (dx, dy):
- Edge centers: perpendicular outward (`cr` = dx:1 dy:0, `tc` = dx:0 dy:-1)
- Corners: diagonal outward (`tr` = dx:0.707 dy:-0.707)
- Center `cc`: direction computed at layout time toward the other endpoint

The direction vector determines the initial stub direction for elbow/orthogonal routing and the control point direction for curved connectors.

## Port Spreading

When multiple connectors share the same element edge, the layout engine automatically distributes ("spreads") their attachment points along that edge to prevent overlap.

### How it works
1. Connectors attaching to the same (element, edge, direction) are grouped
2. Within each group, sorted by `portOrder` (ascending), then by target projection along the edge tangent (to minimize crossings)
3. Offsets are computed centered on the edge midpoint with configurable spacing

### Controlling spread behavior

**Auto spreading** (default): Just create multiple connectors to/from the same edge. The engine handles distribution.

**Manual ordering**: Set `fromPortOrder` / `toPortOrder` to control left-to-right (or top-to-bottom) slot assignment. Lower values get earlier slots.

```js
connect('hub', 'a', { fromAnchor: 'bc', fromPortOrder: 0 }); // leftmost
connect('hub', 'b', { fromAnchor: 'bc', fromPortOrder: 1 }); // middle
connect('hub', 'c', { fromAnchor: 'bc', fromPortOrder: 2 }); // rightmost
```

**Explicit pixel offset**: Set `fromPortOffset` / `toPortOffset` to bypass auto spreading entirely and place the port at an exact pixel offset from the edge center. Positive = right/down along the edge tangent.

```js
connect('hub', 'x', { fromAnchor: 'cr', fromPortOffset: -20 }); // 20px above edge center
connect('hub', 'y', { fromAnchor: 'cr', fromPortOffset: 20 });  // 20px below edge center
```

### Per-element spacing configuration

The target element (the one being connected to) can control how ports are distributed along its edges:

| Element prop | Type | Default | Description |
|---|---|---|---|
| `portSpacing` | `number` | `14` | Pixels between spread ports on this element |
| `edgeMargin` | `number` | `8` | Pixels of buffer from each edge corner |

```js
el({ id: 'hub', w: 300, h: 200, portSpacing: 20, edgeMargin: 12, ... });
```

When the requested total spread exceeds the available edge length (`edgeLength - 2 * edgeMargin`), spacing compresses proportionally to fit. Ports never extend past the edge margin.

## Obstacle Avoidance

Elbow and orthogonal connectors automatically route around other elements on the slide. The routing algorithm:

1. Builds a bounding box around the direct path between endpoints, expanded by `obstacleMargin` (default 200px)
2. Filters slide elements within that box (excluding the connector's own from/to elements, stacks, and bg-layer elements)
3. Routes around collected obstacles using orthogonal waypoint generation

Set `obstacleMargin` on the connector to control the search radius. Increase for sparse slides where obstacles are far from the direct path; decrease for dense slides to avoid unnecessary detours.

```js
connect('a', 'b', { type: 'elbow', obstacleMargin: 300 }); // wider search
connect('x', 'y', { type: 'elbow', obstacleMargin: 100 }); // tight search
```

## Corner Radius

Elbow/orthogonal connectors support rounded corners via `cornerRadius`. The fillet is computed from the actual turn angle (not just 90 degrees), so it works correctly for any vertex angle in the waypoint path.

```js
connect('a', 'b', { type: 'elbow', cornerRadius: 8 });
```

The radius auto-clamps to half the shortest adjacent segment length so arcs never overlap.

## Labels

Labels render as SVG text with an opaque background rectangle at the specified position along the path.

```js
connect('a', 'b', {
  label: 'HTTP',
  labelPosition: 0.5,          // midpoint (default)
  labelOffset: { x: 0, y: -8 },// above the line (default)
  labelStyle: { size: 14, color: '#ffffff', font: 'monospace', weight: 600 },
});
```

`labelPosition` interpolates along the actual polyline length (not straight-line distance), so it works correctly on multi-segment elbow paths.

**Known limitation:** The label background rectangle is sized using a character-width estimate, not actual text measurement. It may be slightly too wide or narrow for some text.

## Stub Length and Arrowhead Trim

Elbow/orthogonal connectors generate an initial "stub" — a straight segment extending from each endpoint in the anchor's exit direction. The stub must be long enough to clear the arrowhead marker and any corner radius.

Stub length is computed automatically: `max(40, markerSize * thickness + cornerRadius + 15)`.

When opposing anchors face each other (e.g. `cr`→`cl`) with a gap shorter than 2x stub length, the stub auto-clamps to half the gap so stubs don't cross.

Arrowhead trim: path endpoints are moved inward so the stroke terminates at the marker midpoint rather than extending through the arrowhead tip. This is automatic and requires no configuration.

## Routing Details (`routeConnector`)

Low-level routing function used internally by elbow/orthogonal connectors. Exposed for advanced use.

```js
routeConnector(options: RouteOptions): { waypoints: Point[] }
```

| Property | Type | Default | Description |
|---|---|---|---|
| `from` | `AnchorPointResult` | — | `{ x, y, dx, dy }` source point |
| `to` | `AnchorPointResult` | — | `{ x, y, dx, dy }` target point |
| `obstacles` | `Rect[]` | `[]` | Bounding boxes to avoid |
| `stubLength` | `number` | `30` | Stub length from each endpoint |
| `clearance` | `number` | `15` | Minimum distance from obstacles |
| `orthogonal` | `boolean` | `false` | Enforce grid-aligned waypoints |

Returns `{ waypoints }` — an array of `{ x, y }` points forming an orthogonal polyline. Waypoints are cached on the connector element (`_cachedWaypoints`) and reused during rendering.

## Common Patterns

### Hub-and-spoke (one element to many)
```js
const targets = ['a', 'b', 'c', 'd'];
targets.forEach((t, i) =>
  connect('hub', t, { type: 'elbow', fromAnchor: 'bc', fromPortOrder: i, cornerRadius: 6 })
);
```

### Bidirectional
```js
connect('a', 'b', { arrow: 'both', color: '#4caf50' });
```

### Dashed dependency line
```js
connect('impl', 'iface', { dash: '5 5', arrow: 'end', color: '#888' });
```

### Backward routing (target behind source)
```js
// Elbow auto-routes a U-shaped path when 'b' is to the left of 'a'
connect('a', 'b', { type: 'elbow', fromAnchor: 'cl', toAnchor: 'cr' });
```

### Labeled data flow
```js
connect('client', 'server', {
  type: 'elbow',
  label: 'REST API',
  labelStyle: { size: 12, color: '#aaa', font: 'monospace' },
  cornerRadius: 4,
});
```

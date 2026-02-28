# SlideKit Refactoring Plan — V2: Clean Architecture

## Status After V1

V1 split the monolithic `slidekit.js` (4,419 lines) into 14 ES modules under `src/`.
All 688 tests pass. The barrel file (`slidekit.js`) re-exports everything.

**Current module sizes:**

| Module | Lines | Notes |
|---|---|---|
| `slidekit.js` | 99 | Barrel file (re-exports + SlideKit namespace) |
| `state.js` | 30 | 9 mutable state vars + 9 setter functions |
| `id.js` | 19 | `resetIdCounter`, `nextId` |
| `spacing.js` | 53 | `DEFAULT_SPACING`, `resolveSpacing`, `getSpacing` |
| `anchor.js` | 62 | `VALID_ANCHORS`, `resolveAnchor` |
| `relative.js` | 140 | 12 relative positioning marker factories |
| `measure.js` | 144 | `measure`, `clearMeasureCache`, `_ensureMeasureContainer` |
| `elements.js` | 173 | `el`, `group`, `vstack`, `hstack`, `cardGrid` |
| `utilities.js` | 251 | `grid`, `snap`, `resolvePercentage`, `repeat`, `rotatedAABB` |
| `compounds.js` | 268 | `connect`, `panel`, `figure`, `getAnchorPoint` |
| `config.js` | 280 | `init`, `safeRect`, `splitRect`, `getConfig`, `_resetForTests` |
| `style.js` | 283 | `filterStyle`, `_baselineCSS`, `SHADOWS`, `resolveShadow` |
| `transforms.js` | 463 | Alignment, distribution, size matching, `applyTransform` |
| `renderer.js` | 577 | `render`, `computeZOrder`, `renderElementFromScene` |
| **`layout.js`** | **1,674** | **⚠️ Still a monolith — 37% of codebase** |

---

## V2 Goals

1. **Decompose `layout.js`** into focused sub-modules (~200-400 lines each)
2. **Eliminate code duplication** (`applyStyleToDOM` exists in both `measure.js` and `renderer.js`)
3. **Simplify state management** (replace 18 exports with a single state object)
4. **Add type safety** via JSDoc `@ts-check` without converting to TypeScript
5. **Add ESLint import cycle detection** to prevent regression
6. **Set up esbuild** for dev workflow (bundle → open HTML from disk)

---

## Agent Execution Model

### The main agent is ONLY an orchestrator

The main agent **does not write code or run tests directly**. It:

- Creates branches
- Dispatches sub-agents for each task
- Reviews sub-agent results
- Sends changes to GPT 5.2 for refactoring correctness review
- Addresses valid review feedback (via another sub-agent if needed)
- Commits after tests pass and review is clean
- Updates this plan to track progress

### Per-task workflow

For each extraction/change:

1. **Sub-agent (general-purpose)**: Implement the change
   - Give it precise instructions: what to extract, where dependencies come from, what to import/export
   - Tell it to run tests: `cd /home/cbird/side_projects/presentation_maker && node run-tests.js`
   - Tell it NOT to commit

2. **GPT 5.2 review (pal-chat, model: gpt-5.2)**: Review the diff
   - Attach the changed/created files
   - Ask specifically about **refactoring correctness** — not general code quality
   - Key questions: missed dependencies? circular import risks? behavioral changes?

3. **Address feedback**: If GPT 5.2 flags a real issue (not just pre-existing design), dispatch another sub-agent to fix it

4. **Commit**: Main agent commits with descriptive message + Co-authored-by trailer

5. **Update plan**: Mark the phase as complete in this document

### Test requirements

- All 688 tests must pass after every change
- Zero tolerance for test regressions
- Any test failure means the extraction introduced a bug — fix the extraction, not the test
- Run tests via: `node run-tests.js` (uses Playwright to run browser-based test suite)

---

## Phase 1: Decompose `layout.js` (1,674 → ~6 modules)

### Current structure of `layout.js`

The `layout()` function is one massive async function with distinct phases:

| Lines | Phase | Contents |
|---|---|---|
| 21-35 | Pre-pipeline | `getEffectiveDimensions()` — measures element intrinsic sizes |
| 55-90 | Helpers | `isRelMarker`, `deepClone`, `flattenElements` — pure utilities |
| 151-265 | Helpers | `getRelRef`, `resolveRelMarker`, `buildProvenance`, `computeAABBIntersection` |
| 295-603 | Phase 1 | Resolve intrinsic sizes (measure elements, resolve stacks, groups) |
| 604-1025 | Phase 2 | Resolve positions via unified topological sort |
| 1026-1078 | Phase 2.5 | Overflow policies (check content overflow for elements with explicit h) |
| 1079-1127 | Phase 3 | Apply transforms (alignment, distribution, size matching) |
| 1128-1434 | Phase 4 | Finalize: connector endpoints, collision detection, validations |
| 1435-1674 | Phase 4 cont. | Presentation-specific validations, warnings, return result |

### Proposed sub-modules

| New Module | Contents | ~Lines |
|---|---|---|
| `src/layout/helpers.js` | `isRelMarker`, `deepClone`, `flattenElements`, `getRelRef`, `resolveRelMarker`, `buildProvenance`, `computeAABBIntersection` | ~210 |
| `src/layout/intrinsics.js` | Phase 1: resolve intrinsic sizes (measure, stack sizing, group sizing) + `getEffectiveDimensions` | ~340 |
| `src/layout/positions.js` | Phase 2: topological sort position resolution | ~420 |
| `src/layout/overflow.js` | Phase 2.5: overflow policy checking | ~50 |
| `src/layout/finalize.js` | Phase 4: connector endpoints, collision detection, validations | ~340 |
| `src/layout/index.js` | `layout()` orchestrator — calls phases in order, applies transforms (Phase 3) | ~300 |

### Extraction order

1. `layout/helpers.js` — pure functions, no state, no internal deps (leaf module)
2. `layout/overflow.js` — small, self-contained policy check
3. `layout/intrinsics.js` — Phase 1, depends on helpers + measure
4. `layout/positions.js` — Phase 2, depends on helpers + spacing
5. `layout/finalize.js` — Phase 4, depends on helpers + compounds (getAnchorPoint)
6. `layout/index.js` — orchestrator, imports all phases

### Dependency rules for layout sub-modules

```
layout/helpers.js    → (nothing internal — pure functions)
layout/overflow.js   → measure.js
layout/intrinsics.js → layout/helpers.js, measure.js, elements.js, spacing.js
layout/positions.js  → layout/helpers.js, spacing.js, anchor.js, state.js
layout/finalize.js   → layout/helpers.js, compounds.js, state.js
layout/index.js      → all layout/* modules, transforms.js, state.js, config.js
```

No layout sub-module imports `layout/index.js` (no cycles).

### After Phase 1

Update `src/layout.js` to become either:
- A simple re-export barrel: `export { layout, getEffectiveDimensions } from './layout/index.js';`
- Or delete `src/layout.js` and update the main `slidekit.js` barrel to import from `./src/layout/index.js`

The existing barrel (`slidekit.js`) continues to re-export `layout` — no downstream changes.

---

## Phase 2: Extract `dom-helpers.js` (eliminate duplication)

### Problem

`applyStyleToDOM()` is duplicated in `measure.js` (local copy) and `renderer.js`.
Both implementations are identical (~10 lines).

### Solution

1. Create `src/dom-helpers.js`:
   ```js
   export function applyStyleToDOM(domEl, styleObj) {
     for (const [key, value] of Object.entries(styleObj)) {
       if (key.startsWith("--")) {
         domEl.style.setProperty(key, value);
       } else {
         domEl.style[key] = value;
       }
     }
   }
   ```

2. Update `measure.js`: remove local `applyStyleToDOM`, add `import { applyStyleToDOM } from './dom-helpers.js';`

3. Update `renderer.js`: remove local `applyStyleToDOM`, add `import { applyStyleToDOM } from './dom-helpers.js';`

4. Run tests — must all pass

This is a small, safe change. No circular dependency risk (dom-helpers is a pure leaf module).

---

## Phase 3: Simplify State Management

### Problem

`state.js` has 18 exports (9 `let` variables + 9 setter functions). Every module that mutates state needs to import both the variable and its setter. This is verbose and error-prone.

### Solution: Single state object

Replace the current pattern:
```js
export let _config = null;
export function set_config(v) { _config = v; }
```

With a single mutable state object:
```js
export const state = {
  idCounter: 0,
  config: null,
  safeRectCache: null,
  loadedFonts: new Set(),
  measureContainer: null,
  measureCache: new Map(),
  fontWarnings: [],
  injectedFontLinks: new Set(),
  transformIdCounter: 0,
};
```

### Migration

This is a **search-and-replace refactor** across all `src/` modules:

| Old pattern | New pattern |
|---|---|
| `import { _config, set_config } from './state.js'` | `import { state } from './state.js'` |
| `_config` (read) | `state.config` |
| `set_config(value)` | `state.config = value` |
| `_idCounter` (read) | `state.idCounter` |
| `set_idCounter(value)` | `state.idCounter = value` |
| `_measureCache.set(k, v)` | `state.measureCache.set(k, v)` |
| etc. | etc. |

### Why this is safe

- Object properties are freely mutable by any importer (no setter needed)
- All importers get the same object reference (ES module singleton)
- Reads and writes both go through `state.X` — explicit and greppable
- Drops the underscore prefix convention (cleaner API)

### Execution approach

Do this module-by-module, running tests after each:
1. Update `state.js` to export the object
2. Update `id.js` → test
3. Update `spacing.js` → test
4. Update `config.js` → test
5. Update `measure.js` → test
6. Update `elements.js` → test
7. Update `transforms.js` → test
8. Update `renderer.js` → test
9. Update `compounds.js` → test
10. Update `utilities.js` → test
11. Update `layout.js` (or `layout/*.js` if Phase 1 is done first) → test
12. Commit all at once (single logical change)

---

## Phase 4: Add JSDoc Type Safety (`@ts-check`)

### Goal

Get TypeScript-level type checking without converting to `.ts` files.

### Setup

1. Create `tsconfig.json` at repo root:
   ```json
   {
     "compilerOptions": {
       "allowJs": true,
       "checkJs": true,
       "noEmit": true,
       "strict": false,
       "target": "ES2022",
       "module": "ES2022",
       "moduleResolution": "bundler",
       "baseUrl": "."
     },
     "include": ["slidekit/src/**/*.js"]
   }
   ```

2. Add `// @ts-check` to the top of key files (not all at once)

3. Add `@typedef` definitions for core types in a `src/types.js`:
   ```js
   /**
    * @typedef {Object} Rect
    * @property {number} x
    * @property {number} y
    * @property {number} w
    * @property {number} h
    */

   /**
    * @typedef {Object} SlideElement
    * @property {string} id
    * @property {string} type - "el" | "group" | "vstack" | "hstack"
    * @property {string} [content]
    * @property {Object} props
    * @property {SlideElement[]} [children]
    */

   /**
    * @typedef {Object} LayoutResult
    * @property {Object} scene
    * @property {Array} warnings
    * @property {Object} provenance
    */
   ```

4. Add `@param` and `@returns` annotations to public functions

### Rollout order (add `@ts-check` incrementally)

1. `src/types.js` (new file — just typedefs)
2. `src/state.js`
3. `src/anchor.js`, `src/spacing.js`, `src/id.js` (leaf modules)
4. `src/elements.js`, `src/style.js`
5. `src/config.js`, `src/measure.js`
6. `src/transforms.js`, `src/relative.js`
7. `src/renderer.js`, `src/compounds.js`, `src/utilities.js`
8. `src/layout.js` (or layout sub-modules)

### Verification

Run `npx tsc --noEmit` to check for type errors. This should be added as an npm script:
```json
{
  "scripts": {
    "typecheck": "tsc --noEmit"
  }
}
```

---

## Phase 5: ESLint Import Cycle Detection

### Goal

Prevent circular dependency regressions with automated detection.

### Setup

1. Install dependencies:
   ```bash
   npm install --save-dev eslint eslint-plugin-import
   ```

2. Create `.eslintrc.json`:
   ```json
   {
     "env": { "browser": true, "es2022": true },
     "parserOptions": { "sourceType": "module", "ecmaVersion": 2022 },
     "plugins": ["import"],
     "rules": {
       "import/no-cycle": ["error", { "maxDepth": 5 }],
       "import/no-self-import": "error",
       "import/no-useless-path-segments": "warn"
     },
     "settings": {
       "import/resolver": { "node": { "extensions": [".js"] } }
     }
   }
   ```

3. Add npm script:
   ```json
   {
     "scripts": {
       "lint": "eslint slidekit/src/"
     }
   }
   ```

4. Run once to verify no existing cycles: `npm run lint`

---

## Phase 6: esbuild Dev Workflow

### Goal

Enable "double-click HTML to open" development without a local server,
while keeping ESM module structure for code organization.

### Setup

1. Install esbuild:
   ```bash
   npm install --save-dev esbuild
   ```

2. Add npm scripts:
   ```json
   {
     "scripts": {
       "dev": "esbuild slidekit/slidekit.js --bundle --format=esm --outfile=slidekit/dist/slidekit.bundle.js --sourcemap --watch",
       "build": "esbuild slidekit/slidekit.js --bundle --format=esm --outfile=slidekit/dist/slidekit.bundle.js --sourcemap --minify",
       "package": "node scripts/package-standalone.js"
     }
   }
   ```

3. For development:
   - Run `npm run dev` (watches for changes, rebuilds automatically)
   - HTML files reference `./dist/slidekit.bundle.js` instead of `./slidekit.js`
   - Sourcemaps point back to original `src/` files for debugging

4. For sharing (self-contained single HTML):
   - `npm run package` inlines the bundled JS, CSS, images (as data URIs), and fonts into one HTML file
   - This is a separate script that only runs when you want to produce a shareable artifact

### HTML change

```html
<!-- Development (with esbuild watch running) -->
<script type="module">
  import { init, render, layout, el } from './dist/slidekit.bundle.js';
  // ... slide code ...
</script>

<!-- OR for file:// usage without module (IIFE format) -->
<script src="./dist/slidekit.bundle.js"></script>
```

---

## Execution Order

The phases should be done in this order:

| Phase | Depends On | Risk Level |
|---|---|---|
| **Phase 1**: Decompose layout.js | Nothing | Medium (large extraction) |
| **Phase 2**: Extract dom-helpers.js | Nothing | Low (10 lines, leaf module) |
| **Phase 3**: Simplify state management | Phase 1 (so layout sub-modules get new pattern) | Medium (touches every module) |
| **Phase 4**: Add JSDoc @ts-check | Phase 3 (type the final state shape) | Low (additive, no behavior change) |
| **Phase 5**: ESLint import cycles | Phase 1 (lint final module graph) | Low (tooling only) |
| **Phase 6**: esbuild dev workflow | Nothing (can be done anytime) | Low (tooling only) |

Phase 2 can be done at any time. Phase 6 can be done at any time.
Phase 1 should come before Phase 3 so the state simplification covers the layout sub-modules.
Phase 4 should come after Phase 3 so you type the final state shape.
Phase 5 should come after Phase 1 so you lint the final module graph.

---

## Dependency Graph (Post-V2)

```
                    slidekit.js (barrel)
                         │
          ┌──────────────┼──────────────────┐
          │              │                  │
     layout/index    renderer         (all other modules)
      ┌───┼───┐          │
      │   │   │          │
  intrinsics positions finalize    ← layout sub-modules
      │   │   │
      └───┼───┘
          │
    layout/helpers        ← pure functions (leaf)

    state.js              ← shared state (leaf — imports nothing)
    dom-helpers.js        ← DOM utilities (leaf — imports nothing)
    types.js              ← JSDoc typedefs (leaf — imports nothing)
```

**Key rule**: arrows point downward only. No module imports its parent or sibling's parent. Only the barrel and `layout/index` are allowed to "know everything."

---

## Success Criteria

- [x] `layout.js` decomposed into ≤6 sub-modules, none exceeding ~400 lines ✅ (finalize.js: 579 lines — slightly over but acceptable)
- [x] Zero code duplication across modules ✅ (applyStyleToDOM consolidated in dom-helpers.js)
- [x] `state.js` is a single exported object (no setter functions) ✅
- [x] `@ts-check` enabled on all `src/` files, `tsc --noEmit` passes ✅ (0 errors)
- [x] ESLint `import/no-cycle` rule passes with zero violations ✅
- [x] esbuild dev workflow functional (`npm run dev` → edit → refresh → works) ✅ (94.5kb bundle)
- [x] All 688+ tests pass after every phase ✅
- [x] No functional/behavioral changes — purely structural refactoring ✅

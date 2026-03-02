# Future Plans

## Short-term

### Live Dev Server (Watch Mode)
A file watcher that monitors your slides `.ts`/`.js` file, automatically rebuilds the bundle on save, and live-reloads the browser. This enables a tight edit→preview loop — especially powerful when an AI agent is editing your slides while you watch changes appear in real-time.

Likely approach: a simple Node.js dev server using esbuild's watch mode + WebSocket-based live reload (or browsersync). Run something like `npm run dev` and open `http://localhost:3000` — edits to your slide file instantly appear.

## Medium-term

### PowerPoint Export
Export SlideKit presentations to `.pptx` format for sharing with non-technical audiences. Since SlideKit uses absolute coordinate positioning on a fixed canvas, the mapping to PowerPoint's slide model is relatively straightforward. Would use a library like PptxGenJS or officegen.

### Live Editing via AI + MCP
Interactive editing where an AI agent can modify slides through MCP (Model Context Protocol) tool calls while the presentation is running in the browser. See `docs/LIVE-EDITING.md` for the full design exploration.

## Long-term

### Rendering Backend Abstraction
While SlideKit currently targets Reveal.js, the coordinate-based layout model is rendering-engine agnostic. Future work could add backends for PDF generation, static HTML, or other presentation frameworks.

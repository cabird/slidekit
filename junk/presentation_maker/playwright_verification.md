---
title: "Playwright / Browser Verification"
description: "HTTP server pattern, when to use browser verification, no-bundling rule"
prereqs:
  - "Workflow Phases Overview"
---

⚠️ **`file://` URLs are blocked by Playwright MCP.** Always serve over HTTP.

### HTTP Server Pattern

Use port `0` so the OS picks a free port automatically (no conflicts, no retries):

```bash
cd /path/to/working_dir
python3 -c "
import http.server, socketserver
handler = http.server.SimpleHTTPRequestHandler
with socketserver.TCPServer(('127.0.0.1', 0), handler) as httpd:
 print(httpd.server_address[1], flush=True)
 httpd.serve_forever()
" &
```

- Port `0` tells the OS to pick a free port — **never hardcode a port number**
- `127.0.0.1` binds to localhost only (avoids firewall prompts)
- To reload after edits, navigate Playwright again or call `page.reload()` — no bundling needed during development
- Kill the server when done with the PID from the background process

### When to use the server
- Phase 5 (Style Lock): verify exemplar slides
- Phase 6 (Assembly + Verification): integration check, per-slide screenshots and fixes
- Phase 7 (Review & Delivery): live preview for user

### Important: No bundling during development/review
During Phases 5-7, work directly with ES modules served over HTTP. The browser resolves imports natively. Only run `build_bundle.py` once at the very end (Phase 7 delivery) for the final deliverable.

---
title: "Screenshot Pipeline"
description: "Primary Playwright and fallback Chrome headless screenshot methods"
prereqs:
  - "Playwright / Browser Verification"
---

### Primary: Playwright MCP

1. Navigate to slide via Reveal.js API or URL hash (#/N)
2. Wait for fonts, images, and layout to stabilize
3. Take screenshot: `screenshots/slide_NN_pass_PP.png`

### Fallback: Chrome Headless (if Playwright unavailable)

```bash
# Option A: Print to PDF then rasterize (most reliable fallback)
chrome --headless --print-to-pdf=deck.pdf --window-size=1920,1080 "http://localhost:PORT/index.html?print-pdf"
pdftoppm -jpeg -r 150 deck.pdf screenshots/slide

# Option B: Direct screenshot per slide (less deterministic timing)
chrome --headless --screenshot=slide_01.png --window-size=1920,1080 "http://localhost:PORT/index.html#/0"
```

Option A (print-to-pdf) is preferred as fallback — it avoids per-slide navigation timing issues.

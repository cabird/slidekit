---
title: "Known Failure Modes"
description: "Common symptoms, causes, and fixes for SlideKit/Reveal.js issues"
---

| Symptom | Likely Cause | Fix |
|---|---|---|
| `window.sk` is undefined | `render()` didn't run or `slides.js` failed | Check browser console for import/syntax errors |
| Images don't appear | Wrong path in IMAGES manifest | Ensure `'./filename.png'` convention |
| Fonts look wrong | Google Fonts not loading | Check network access; fonts load at render time |
| Elements invisible (0×0) | Missing `w` on text elements | Every `el()` needs explicit `w` |
| Bundle suspiciously small | Images not found during bundling | Check all image files exist with `'./filename.png'` paths |
| Slide module fails to load | Wrong import path or missing export | Ensure slides import from `'./deck_config.js'` and use `export default` |
| Slide IDs collide | Duplicate `id` strings across slides | Use slide-prefixed IDs (e.g., `s1-title`, `s12-card1`) |
| All slides visible at once | `display: flex !important` on sections | Never override display on `<section>` elements (see Reveal.js CSS Compatibility) |
| Slides appear blank | `position: relative` on sections | Never set position on `<section>` elements (see Reveal.js CSS Compatibility) |

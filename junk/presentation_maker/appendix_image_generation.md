---
title: "Image Generation Reference"
description: "GPT-5 + GPT Image for slide deck asset generation — APIs, prompting rules, batch generation, consistency"
---

# GPT-5 + GPT Image for Slide Deck Asset Generation (Python)

This is an **instruction manual for an AI coder** generating slide-ready images (diagrams, figures, icons, simple illustrations) using **GPT-5** (as the "art director") and **GPT Image** (as the renderer) via the official **`openai` Python package**.

Sources: OpenAI Image Generation guide and API reference.

---

### 0) The mental model

There are two common ways to generate images:

1) **Images API (`/v1/images/*`)**
   You directly call `client.images.generate(...)` (or `...edits(...)`) and you get base64-encoded image bytes back. For GPT image models, responses are base64 (not temporary URLs).

2) **Responses API (GPT-5 orchestrates + built-in image tool)**
   You call `client.responses.create(model="gpt-5", ...)` and let GPT-5 decide prompts, then it calls the **built-in image_generation tool**. This enables iterative, multi-turn workflows and editing within context.

**Rule of thumb for slide decks:**
- Use **Images API** for deterministic "generate N assets from a known list".
- Use **Responses API** when you want GPT-5 to transform a slide outline into cohesive, consistent image prompts across the whole deck.

---

### 1) Model choices

#### Recommended renderer (pixels)
Use:
- `model="gpt-image-1.5"`

#### Recommended orchestrator (prompting + planning)
Use:
- `model="gpt-5"`

---

### 2) Slide-ready prompting rules (non-negotiable)

When generating images for slides, explicitly specify:

- **Style**: "clean, minimal, presentation-ready"
- **Background**: "white" or "transparent background" (if you plan to overlay on colored slides)
- **Composition**: large shapes, thick-ish lines, few elements
- **Text**: keep minimal; prefer labels you can add later in PowerPoint
- **Aspect**: for widescreen slides, request a landscape size

Supported sizes differ by model; for GPT image models, the API supports `1024x1024`, `1536x1024` (landscape), `1024x1536` (portrait), or `auto`.

---

### 3) Quickstart: generate one PNG (Images API)

This pattern is straight from the Images API reference (slightly adapted for slide work).

```python
import base64
from openai import OpenAI

client = OpenAI()

img = client.images.generate(
    model="gpt-image-1.5",
    prompt=(
        "Presentation-ready diagram: a simple data pipeline from "
        "Raw Logs  Embeddings  Vector DB  LLM Answer. "
        "Flat minimal style, white background, clean arrows, no shadows, "
        "no decorative elements, minimal text."
    ),
    n=1,
    size="1536x1024",  # widescreen-ish landscape for slides
)

image_bytes = base64.b64decode(img.data[0].b64_json)
with open("slide-asset-01.png", "wb") as f:
    f.write(image_bytes)
```

Notes:

* GPT image models return base64 (`b64_json`) rather than URLs.

---

### 4) Batch-generate assets for a whole deck (Images API)

Use a deterministic naming scheme and treat prompts as "source code" you can version.

```python
import base64
from dataclasses import dataclass
from pathlib import Path
from openai import OpenAI

client = OpenAI()

OUT = Path("deck_assets")
OUT.mkdir(exist_ok=True)

@dataclass(frozen=True)
class SlideAsset:
    slide_id: int
    kind: str      # e.g., "diagram", "icon", "bg"
    filename: str
    prompt: str

ASSETS = [
    SlideAsset(
        slide_id=1,
        kind="diagram",
        filename="slide-01-system-overview.png",
        prompt=(
            "Presentation-ready architecture diagram with 3 boxes: "
            "Client  API  Database. Flat minimal style, white background, "
            "simple arrows, no gradients, no shadows, minimal text."
        ),
    ),
    SlideAsset(
        slide_id=2,
        kind="diagram",
        filename="slide-02-retrieval-flow.png",
        prompt=(
            "Presentation-ready flow diagram: Query  Retrieve  Rerank  "
            "Compose Prompt  LLM  Answer. Flat minimal style, white background, "
            "consistent line weight, simple arrows."
        ),
    ),
]

for a in ASSETS:
    img = client.images.generate(
        model="gpt-image-1.5",
        prompt=a.prompt,
        n=1,
        size="1536x1024",
    )
    (OUT / a.filename).write_bytes(base64.b64decode(img.data[0].b64_json))

print(f"Wrote {len(ASSETS)} assets to {OUT.resolve()}")
```

---

### 5) Transparent background + output format options (for overlays)

For edits (and generally GPT image models), you can control background transparency and output format. The API reference documents:

* `background`: `transparent | opaque | auto`
* `output_format`: `png | jpeg | webp`
* `output_compression` (0-100) for `jpeg/webp`

Example: transparent PNG for overlaying on colored slide backgrounds:

```python
import base64
from openai import OpenAI

client = OpenAI()

img = client.images.generate(
    model="gpt-image-1.5",
    prompt=(
        "A minimal icon-style illustration of a database cylinder with a magnifying glass. "
        "Flat vector style, transparent background, no text."
    ),
    n=1,
    size="1024x1024",
)

with open("icon-db-search.png", "wb") as f:
    f.write(base64.b64decode(img.data[0].b64_json))
```

If you need strict control (format/background/compression) for a given endpoint, verify support in the current Images API params.

---

### 6) Editing an existing image (Images API edits)

Use edits to:

* Keep a consistent visual identity (same shapes/layout) while changing labels
* Add/remove one element without regenerating from scratch
* Create variants (e.g., "with human-in-the-loop" vs "fully automated")

The Images API supports an **image edit** endpoint and describes allowed inputs, mask behavior, and constraints.

High-level pattern:

```python
from openai import OpenAI
client = OpenAI()

with open("slide-02-retrieval-flow.png", "rb") as image_file:
    edited = client.images.edits(
        model="gpt-image-1.5",
        image=image_file,
        prompt=(
            "Edit this diagram to insert a new step between Retrieve and Rerank: "
            "'Filter'. Keep style, spacing, and arrow design identical. Minimal text."
        ),
        n=1,
        size="1536x1024",
    )

# decode edited.data[0].b64_json as usual
```

(Exact method signature may vary by SDK version; follow the Images API reference for `Create image edit`.)

---

### 7) GPT-5 as the "deck art director" (Responses API + image tool)

If you have a **slide outline** and want consistent prompts across the deck, let GPT-5:

* propose a **deck-wide style spec**
* produce per-slide prompts
* call the **image generation tool** to render

The Image Generation guide describes the Responses API approach and that it supports image generation as a built-in tool.

#### Force an image tool call (useful in automation)

You can force the built-in image tool by setting:
`tool_choice = {"type": "image_generation"}`

Example:

```python
from openai import OpenAI

client = OpenAI()

resp = client.responses.create(
    model="gpt-5",
    tool_choice={"type": "image_generation"},  # force image tool
    input=[
        {
            "role": "user",
            "content": (
                "Create a presentation-ready diagram for a slide: "
                "Query  Retrieve  Rerank  Compose Prompt  LLM  Answer. "
                "Flat minimal style, white background, consistent line weight."
            ),
        }
    ],
)

# The Responses API returns structured output; locate the image output(s) and decode base64.
# Implementation detail: the exact path depends on the SDK's response schema.
```

#### Tool options you can set

The tool guide lists configurable options like:

* size (e.g., `1024x1024`, `1024x1536`)
* quality (`low|medium|high`)
* format, compression
* background (`transparent|opaque`)
* action (`auto|generate|edit`)

---

### 8) Consistency: the "style system" trick

For a cohesive deck, do this:

1. Create a **style contract** once (as text), e.g.:

   * "Flat minimal vector look"
   * "Monoline arrows"
   * "No shadows/gradients"
   * "Limited palette"
   * "Use the same box corner radius"
2. Paste that contract into every prompt (or have GPT-5 prepend it).

Example style header:

```text
STYLE: clean minimal slide diagram, flat vector look, white background,
uniform line weight, rounded rectangles, simple arrows, no shadows,
no gradients, minimal text, lots of whitespace.
```

---

### 9) Practical slide deck asset checklist

Generate these common asset types:

* **System diagram** (1 per major section)
* **Process flow** (query / pipeline / lifecycle)
* **Icons** (small transparent PNGs)
* **Conceptual illustrations** (very sparse, big shapes)
* **Section divider backgrounds** (subtle, low detail; often best as opaque)

Stick to landscape (`1536x1024`) for most slide images.

---

### 10) Data handling note (if you care about retention controls)

OpenAI's "Your data" guide notes `/v1/images` is compatible with Zero Data Retention when using `gpt-image-1`, `gpt-image-1.5`, and `gpt-image-1-mini` (not DALL-E).

---

### Appendix A: Minimal "prompt template" for diagrams

Copy/paste and fill in:

```text
Presentation-ready diagram: {WHAT_IT_SHOWS}.
STYLE: clean minimal slide diagram, flat vector look, white background,
uniform line weight, rounded rectangles, simple arrows, no shadows,
no gradients, minimal text, lots of whitespace.
CONSTRAINTS: no decorative elements; keep text minimal; avoid tiny details.
```

---

### Appendix B: Common failure modes + fixes

* **Too busy / too detailed** -- "reduce to 5-7 elements max; increase whitespace"
* **Ugly typography** -- "remove all text; I will label in PowerPoint"
* **Inconsistent look across slides** -- prepend the same STYLE contract; use edits for variants
* **Wrong aspect for slides** -- use `1536x1024` for GPT image models (or `auto` and verify output)

---

# /// script
# dependencies = ["openai", "python-dotenv"]
# requires-python = ">=3.11"
# ///

import base64
import asyncio
from pathlib import Path
from dotenv import load_dotenv
load_dotenv('/home/cbird/.env')

from openai import AsyncOpenAI
client = AsyncOpenAI()

OUT = Path("/home/cbird/side_projects/presentation_maker/examples/layout-cookbook")

STYLE = """
STYLE: Photographic realism with cinematic color grading. Rich, vibrant, well-exposed lighting with full tonal range.
Think high-end commercial photography or National Geographic quality.
RULES: No text, no logos, no watermarks, no recognizable brands or landmarks.
"""

IMAGES = [
    {
        "filename": "hero-bg.png",
        "prompt": f"{STYLE}\n\nAerial photograph of vivid turquoise ocean water over a shallow coral reef. Bright tropical sunlight illuminating the reef structure below the surface — rich teals, aquamarines, and sandy whites visible through crystal-clear water. Sweeping, expansive feel. Should work as a full-screen presentation background with text overlaid on top.",
        "size": "1536x1024",
    },
    {
        "filename": "landscape-banner.png",
        "prompt": f"{STYLE}\n\nDramatic wide-angle photograph of layered mountain ridges at golden hour — warm amber sunlight catching the peaks while cool blue haze fills the valleys between them. Vivid orange and gold sky with soft clouds. Strong horizontal composition with layers of depth receding into the distance. Cinematic widescreen feel.",
        "size": "1536x1024",
    },
    {
        "filename": "portrait-sidebar.png",
        "prompt": f"{STYLE}\n\nVertical photograph looking up through a dense bamboo forest canopy. Bright green bamboo stalks converging toward the sky with sunlight streaming through the leaves, creating rays of warm golden light. Lush, saturated greens with pops of yellow sunlight. Strong vertical lines and natural upward energy.",
        "size": "1024x1536",
    },
    {
        "filename": "small-icon-photo.png",
        "prompt": f"{STYLE}\n\nMacro photograph of a single vibrant blue morpho butterfly wing filling the frame. Iridescent scales shimmering electric blue and violet with fine natural texture detail. Bright, well-lit, with a soft out-of-focus green background. Clean, simple composition that reads well even at small display sizes.",
        "size": "1024x1024",
    },
    {
        "filename": "textured-overlay.png",
        "prompt": f"{STYLE}\n\nClose-up photograph of polished agate stone cross-section showing concentric bands of teal, cream, amber, and soft white. Translucent layers with natural crystalline texture. Even, uniform composition with no strong focal point — the pattern and color banding is the subject. Bright and luminous. Should work as a semi-transparent overlay texture on presentation slides.",
        "size": "1536x1024",
    },
]

SEMAPHORE = asyncio.Semaphore(4)
MAX_RETRIES = 3

async def generate_one(img: dict) -> str:
    path = OUT / img["filename"]
    if path.exists():
        path.unlink()

    for attempt in range(MAX_RETRIES):
        try:
            async with SEMAPHORE:
                result = await client.images.generate(
                    model="gpt-image-1",
                    prompt=img["prompt"],
                    quality="high",
                    n=1,
                    size=img.get("size", "1536x1024"),
                    output_format="png",
                )
            image_bytes = base64.b64decode(result.data[0].b64_json)
            path.write_bytes(image_bytes)
            size_kb = len(image_bytes) / 1024
            print(f"Generated: {path.name} ({size_kb:.0f} KB)")
            return str(path)
        except Exception as e:
            wait = 2 ** attempt
            print(f"Attempt {attempt+1} failed for {img['filename']}: {e}. Retrying in {wait}s...")
            await asyncio.sleep(wait)

    raise RuntimeError(f"Failed to generate {img['filename']} after {MAX_RETRIES} attempts")

async def main():
    tasks = [generate_one(img) for img in IMAGES]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    for i, r in enumerate(results):
        if isinstance(r, Exception):
            print(f"FAILED: {IMAGES[i]['filename']} — {r}")
        else:
            print(f"OK: {r}")

asyncio.run(main())

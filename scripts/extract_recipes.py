#!/usr/bin/env python3
"""
extract_recipes.py — SlideKit Layout Cookbook extractor

Two modes:

  --menu       Print a compact menu of all recipes (ID, name, intent, category).
               Used by the Planner to pick layouts without reading full code.

  ID [ID ...]  Extract full recipe sections (intent, visual, variations,
               implementation code) for the given recipe IDs.
               Used by the Slide Writer to get code patterns for specific layouts.

Usage:
  python extract_recipes.py --file ref/LAYOUT_COOKBOOK.md --menu
  python extract_recipes.py --file ref/LAYOUT_COOKBOOK.md --menu-md
  python extract_recipes.py --file ref/LAYOUT_COOKBOOK.md A1 B4 G2
"""

import argparse
import re
import sys
from pathlib import Path


# Matches recipe headers like "### T1: Title / Cover" or "### A1: Equal Split (50/50)"
RECIPE_HEADER_RE = re.compile(
    r"^###\s+([A-Z]\d+):\s+(.+)$"
)

# Matches category headers like "## A: Split Layouts" or "## Cover Slide"
CATEGORY_HEADER_RE = re.compile(r"^##\s+(.+)$")

# Matches the intent line
INTENT_RE = re.compile(r"^\*\*Intent:\*\*\s*(.+)$")


def parse_cookbook(text: str):
    """Parse the cookbook into a list of recipe dicts.

    Each recipe dict has:
        id:        e.g. "A1"
        name:      e.g. "Equal Split (50/50)"
        category:  e.g. "A: Split Layouts"
        intent:    one-line description
        start:     line index of the ### header (0-based)
        end:       line index of the next ### header or next ## header or EOF
        body:      full text of the recipe section (header through end)
    """
    lines = text.split("\n")
    recipes = []
    current_category = ""

    # First pass: find all recipe header positions and their categories
    for i, line in enumerate(lines):
        cat_m = CATEGORY_HEADER_RE.match(line)
        if cat_m:
            current_category = cat_m.group(1).strip()

        rec_m = RECIPE_HEADER_RE.match(line)
        if rec_m:
            recipes.append({
                "id": rec_m.group(1).upper(),
                "name": rec_m.group(2).strip(),
                "category": current_category,
                "intent": "",
                "start": i,
                "end": None,
                "body": "",
            })

    # Second pass: determine end boundaries and extract body + intent
    for idx, rec in enumerate(recipes):
        # End is the line before the next recipe header, next ## header, or EOF
        search_start = rec["start"] + 1
        end = len(lines)
        for j in range(search_start, len(lines)):
            if RECIPE_HEADER_RE.match(lines[j]):
                end = j
                break
            if CATEGORY_HEADER_RE.match(lines[j]):
                end = j
                break
        rec["end"] = end
        rec["body"] = "\n".join(lines[rec["start"]:rec["end"]]).rstrip()

        # Extract intent from the body
        for line in lines[rec["start"]:rec["end"]]:
            intent_m = INTENT_RE.match(line)
            if intent_m:
                rec["intent"] = intent_m.group(1).strip()
                break

    return recipes


def print_menu(recipes, markdown=False):
    """Print compact menu for the Planner."""
    if markdown:
        print("# Layout Cookbook — Recipe Menu\n")
        print(f"**{len(recipes)} patterns** available.\n")
        print("| ID | Name | Category | Intent |")
        print("|----|------|----------|--------|")
        for r in recipes:
            print(f"| {r['id']} | {r['name']} | {r['category']} | {r['intent']} |")
    else:
        for r in recipes:
            print(f"{r['id']:5s}  {r['name']:40s}  [{r['category']}]")
            if r["intent"]:
                print(f"       {r['intent']}")
            print()


def extract_by_ids(recipes, ids):
    """Extract full sections for specific recipe IDs."""
    id_set = {rid.upper() for rid in ids}
    found = set()
    output_parts = []

    for r in recipes:
        if r["id"] in id_set:
            found.add(r["id"])
            output_parts.append(r["body"])

    missing = id_set - found
    if missing:
        print(f"WARNING: Recipe IDs not found: {', '.join(sorted(missing))}",
              file=sys.stderr)

    return "\n\n---\n\n".join(output_parts)


def main():
    parser = argparse.ArgumentParser(
        description="Extract recipes from the SlideKit Layout Cookbook"
    )
    parser.add_argument(
        "--file", required=True,
        help="Path to LAYOUT_COOKBOOK.md"
    )
    parser.add_argument(
        "--menu", action="store_true",
        help="Print compact menu of all recipes (plain text)"
    )
    parser.add_argument(
        "--menu-md", action="store_true",
        help="Print compact menu of all recipes (Markdown table)"
    )
    parser.add_argument(
        "ids", nargs="*",
        help="Recipe IDs to extract (e.g. A1 B4 G2)"
    )

    args = parser.parse_args()

    cookbook_path = Path(args.file)
    if not cookbook_path.exists():
        print(f"ERROR: File not found: {cookbook_path}", file=sys.stderr)
        sys.exit(1)

    text = cookbook_path.read_text(encoding="utf-8")
    recipes = parse_cookbook(text)

    if not recipes:
        print("ERROR: No recipes found in file.", file=sys.stderr)
        sys.exit(1)

    if args.menu or args.menu_md:
        print_menu(recipes, markdown=args.menu_md)
    elif args.ids:
        result = extract_by_ids(recipes, args.ids)
        if result:
            print(result)
        else:
            print("No matching recipes found.", file=sys.stderr)
            sys.exit(1)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()

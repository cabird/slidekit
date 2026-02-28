#!/usr/bin/env bash
# check-doc-coverage.sh — Verify every exported function from slidekit.js appears in API.md
#
# Usage: ./slidekit/scripts/check-doc-coverage.sh
# Exit code: 0 if all functions covered, 1 if any are missing

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SLIDEKIT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

SOURCE="$SLIDEKIT_DIR/slidekit.js"
API_DOC="$SLIDEKIT_DIR/API.md"

if [ ! -f "$SOURCE" ]; then
  echo "ERROR: Source file not found: $SOURCE"
  exit 1
fi

if [ ! -f "$API_DOC" ]; then
  echo "ERROR: API doc not found: $API_DOC"
  exit 1
fi

# Extract exported function names from the source
EXPORTED=$(grep -E '^export (async )?function ' "$SOURCE" | sed 's/^export \(async \)\{0,1\}function \([a-zA-Z_][a-zA-Z0-9_]*\).*/\2/' | sort)

MISSING=()
FOUND=0
TOTAL=0

for func in $EXPORTED; do
  TOTAL=$((TOTAL + 1))
  if grep -q "$func" "$API_DOC"; then
    FOUND=$((FOUND + 1))
  else
    MISSING+=("$func")
  fi
done

echo "=== SlideKit Documentation Coverage ==="
echo "Source:  $SOURCE"
echo "API doc: $API_DOC"
echo ""
echo "Exported functions: $TOTAL"
echo "Documented:         $FOUND"
echo "Missing:            ${#MISSING[@]}"

if [ ${#MISSING[@]} -gt 0 ]; then
  echo ""
  echo "Missing functions:"
  for func in "${MISSING[@]}"; do
    echo "  - $func"
  done
  echo ""
  echo "FAIL: ${#MISSING[@]} exported function(s) not found in API.md"
  exit 1
else
  echo ""
  echo "PASS: All exported functions are documented."
  exit 0
fi

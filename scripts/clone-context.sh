#!/usr/bin/env bash
set -euo pipefail

# ── Clone .context reference repos ───────────────────────────────────────────
# Shallow-clones Effect, effect-atom, and accountability repos into .context/
# for AI reference. These are gitignored so they must be cloned after setup.
# ─────────────────────────────────────────────────────────────────────────────

TEMPLATE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CONTEXT_DIR="$TEMPLATE_DIR/.context"

mkdir -p "$CONTEXT_DIR"

clone() {
  local repo="$1"
  local dir="$CONTEXT_DIR/$2"

  if [ -d "$dir" ]; then
    echo "⟳ Updating $2..."
    git -C "$dir" pull --depth 1 2>/dev/null || true
  else
    echo "↓ Cloning $2..."
    git clone --depth 1 "$repo" "$dir"
  fi
}

clone "https://github.com/effect-ts/effect.git" "effect"
clone "https://github.com/tim-smart/effect-atom.git" "effect-atom"
clone "https://github.com/mikearnaldi/accountability.git" "accountability"

echo "✓ .context ready ($(du -sh "$CONTEXT_DIR" | cut -f1))"

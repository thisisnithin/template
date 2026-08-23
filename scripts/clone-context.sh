#!/usr/bin/env bash
set -euo pipefail

# ── Clone .context reference repos ───────────────────────────────────────────
# Shallow-clones reference sources into .context/ for AI reference.
# These are gitignored, so they must be cloned after setup.
#
# IMPORTANT: refs are PINNED to the versions in pnpm-workspace.yaml. Effect v4
# reorganised the entire package layout (@effect/platform, @effect/rpc and
# @effect/sql were folded into core as effect/unstable/*), so a clone of `main`
# or of a v3 tag is actively misleading. Keep these in sync with the catalog.
# ─────────────────────────────────────────────────────────────────────────────

TEMPLATE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CONTEXT_DIR="$TEMPLATE_DIR/.context"

# Pinned refs — must match the catalog in pnpm-workspace.yaml
EFFECT_REF="effect@4.0.0-rc.111"
DRIZZLE_REF="169397b7e4aa14bcaf91214b98c51648d874bb05"  # drizzle-orm 1.0.0-rc.5-169397b
ACCOUNTABILITY_REF="main"

mkdir -p "$CONTEXT_DIR"

# clone <repo-url> <dir-name> <ref>
# Fetches exactly <ref> at depth 1. Handles tags, branches and raw commit SHAs.
clone() {
  local repo="$1" name="$2" ref="$3"
  local dir="$CONTEXT_DIR/$name"

  if [ ! -d "$dir/.git" ]; then
    rm -rf "$dir"
    echo "↓ Cloning $name @ $ref..."
    git init -q "$dir"
    git -C "$dir" remote add origin "$repo"
  else
    echo "⟳ Checking $name @ $ref..."
  fi

  # Skip the fetch if we are already sitting on the requested ref.
  local current
  current="$(git -C "$dir" rev-parse --verify -q HEAD 2>/dev/null || true)"
  if [ -n "$current" ] && git -C "$dir" describe --tags --exact-match HEAD 2>/dev/null | grep -qx "$ref"; then
    echo "  ✓ $name already at $ref"
    return
  fi
  if [ -n "$current" ] && [ "${current#"$ref"}" != "$current" ]; then
    echo "  ✓ $name already at $ref"
    return
  fi

  git -C "$dir" fetch --depth 1 --no-tags origin "$ref"
  git -C "$dir" checkout -q --detach FETCH_HEAD
  echo "  ✓ $name at $(git -C "$dir" rev-parse --short HEAD)"
}

# Effect v4 monorepo. Also the home of @effect/atom-* (packages/atom) — the
# standalone tim-smart/effect-atom repo is v3-only and no longer relevant, since
# the atom core now ships in effect/unstable/reactivity.
clone "https://github.com/Effect-TS/effect.git" "effect" "$EFFECT_REF"

# Drizzle v1 — source for the native Effect integration (drizzle-orm/effect-postgres),
# which replaces @effect/sql-drizzle.
clone "https://github.com/drizzle-team/drizzle-orm.git" "drizzle-orm" "$DRIZZLE_REF"

# Canonical example app for architecture + patterns.
clone "https://github.com/mikearnaldi/accountability.git" "accountability" "$ACCOUNTABILITY_REF"

# effect-atom was merged into the Effect monorepo; drop any stale clone.
if [ -d "$CONTEXT_DIR/effect-atom" ]; then
  echo "✗ Removing stale effect-atom clone (merged into effect/packages/atom)"
  rm -rf "$CONTEXT_DIR/effect-atom"
fi

echo "✓ .context ready ($(du -sh "$CONTEXT_DIR" | cut -f1))"

#!/usr/bin/env bash
set -euo pipefail

# ── Local development setup ──────────────────────────────────────────────────
# Provisions a fully local, account-free Convex backend and wires its URLs
# into the Next.js app. No cloud, no Docker, no database to run.
# ─────────────────────────────────────────────────────────────────────────────

copy_env() {
  local src="$1/.env.example" dest="$1/.env"
  if [[ ! -f "$dest" ]]; then
    cp "$src" "$dest"
    echo "Created $dest"
  else
    echo "Skipped $dest (already exists)"
  fi
}

pnpm install
echo "Dependencies installed"

copy_env apps/web

# `CONVEX_AGENT_MODE=anonymous` provisions a local deployment with no Convex
# account. It writes CONVEX_URL / CONVEX_SITE_URL to packages/backend/.env.local.
echo "Provisioning local Convex deployment..."
CONVEX_AGENT_MODE=anonymous pnpm --filter @app/backend exec convex dev --once

backend_env="packages/backend/.env.local"
convex_url=$(grep '^CONVEX_URL=' "$backend_env" | cut -d= -f2-)
convex_site_url=$(grep '^CONVEX_SITE_URL=' "$backend_env" | cut -d= -f2-)

# Mirror them into the Next.js app under their NEXT_PUBLIC_ names.
set_web_env() {
  local key="$1" value="$2" file="apps/web/.env"
  if grep -q "^${key}=" "$file"; then
    sed -i '' "s|^${key}=.*|${key}=${value}|" "$file"
  else
    printf '%s=%s\n' "$key" "$value" >>"$file"
  fi
}

set_web_env NEXT_PUBLIC_CONVEX_URL "$convex_url"
set_web_env NEXT_PUBLIC_CONVEX_SITE_URL "$convex_site_url"
echo "Wired Convex URLs into apps/web/.env"

# Backend secrets live on the deployment, not in a file.
convex_env() {
  CONVEX_AGENT_MODE=anonymous pnpm --filter @app/backend exec convex env set "$1" "$2" >/dev/null
  echo "  set $1"
}

echo "Setting Convex deployment env vars..."
convex_env BETTER_AUTH_SECRET "$(openssl rand -base64 32)"
convex_env SITE_URL "http://localhost:3000"

cat <<'DONE'

Setup complete. Start developing:

  pnpm dev        # Next.js (:3000) + convex dev + confect dev

Seed a dev user:   pnpm setup:seed   (after pnpm dev is up)
Convex dashboard:  pnpm --filter @app/backend exec convex dashboard
Optional secrets:  see packages/backend/.env.example
DONE

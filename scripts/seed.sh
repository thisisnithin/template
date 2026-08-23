#!/usr/bin/env bash
set -euo pipefail

# ── Seed a local development user ────────────────────────────────────────────
# Signs up through Better Auth's real endpoint, so the account has a usable
# password and can be signed into from the UI.
#
#   pnpm setup:seed
#   SEED_EMAIL=me@example.com SEED_PASSWORD=hunter22hunter22 pnpm setup:seed
# ─────────────────────────────────────────────────────────────────────────────

email="${SEED_EMAIL:-dev@example.com}"
password="${SEED_PASSWORD:-password12345}"
name="${SEED_NAME:-Dev User}"

backend_env="packages/backend/.env.local"

if [[ ! -f "$backend_env" ]]; then
  echo "❌ $backend_env not found. Run pnpm setup:local first."
  exit 1
fi

site_url=$(grep '^CONVEX_SITE_URL=' "$backend_env" | cut -d= -f2-)
origin="${SITE_URL:-http://localhost:3000}"

if [[ -z "$site_url" ]]; then
  echo "❌ CONVEX_SITE_URL missing from $backend_env"
  exit 1
fi

if ! curl -sf -o /dev/null "$site_url/api/auth/ok" 2>/dev/null; then
  echo "❌ Better Auth isn't reachable at $site_url. Start it with: pnpm dev"
  exit 1
fi

response=$(curl -s -w '\n%{http_code}' -X POST "$site_url/api/auth/sign-up/email" \
  -H 'Content-Type: application/json' \
  -H "Origin: $origin" \
  -d "{\"email\":\"$email\",\"password\":\"$password\",\"name\":\"$name\"}")

status=$(tail -n1 <<<"$response")
body=$(sed '$d' <<<"$response")

case "$status" in
  200)
    echo "✓ Seeded $email / $password"
    ;;
  422)
    if grep -qi "exist" <<<"$body"; then
      echo "✓ $email already exists"
    else
      echo "❌ Sign-up rejected: $body"
      exit 1
    fi
    ;;
  *)
    echo "❌ Sign-up failed ($status): $body"
    exit 1
    ;;
esac

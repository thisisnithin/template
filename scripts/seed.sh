#!/usr/bin/env bash
set -euo pipefail

email="${SEED_EMAIL:-dev@example.com}"
password="${SEED_PASSWORD:-password12345}"
name="${SEED_NAME:-Dev User}"

web_env="apps/web/.env"
base_url="${BETTER_AUTH_URL:-}"

if [[ -z "$base_url" && -f "$web_env" ]]; then
  base_url=$(grep '^BETTER_AUTH_URL=' "$web_env" | cut -d= -f2- || true)
fi

if [[ -z "$base_url" ]]; then
  echo "❌ BETTER_AUTH_URL not set and not found in $web_env"
  exit 1
fi

if ! curl -sf -o /dev/null "$base_url/api/auth/ok"; then
  echo "❌ Better Auth isn't reachable at $base_url. Start it with: pnpm dev"
  exit 1
fi

response=$(curl -s -w '\n%{http_code}' -X POST "$base_url/api/auth/sign-up/email" \
  -H 'Content-Type: application/json' \
  -H "Origin: $base_url" \
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

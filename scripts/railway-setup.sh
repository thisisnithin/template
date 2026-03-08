#!/usr/bin/env bash
set -euo pipefail

# ── Railway Project Setup ────────────────────────────────────────────────────
# Provisions a complete Railway project: app service, Postgres, env vars.
# Run once to bootstrap, then deploy via `railway up` or Git push.
#
# Usage:
#   ./scripts/railway-setup.sh [project-name]
#
# Prerequisites:
#   - Railway CLI installed (brew install railway)
#   - Authenticated (railway login)
# ─────────────────────────────────────────────────────────────────────────────

PROJECT_NAME="${1:-$(basename "$(git rev-parse --show-toplevel 2>/dev/null || pwd)")}"

# ── Preflight checks ────────────────────────────────────────────────────────

if ! command -v railway &>/dev/null; then
  echo "❌ Railway CLI not found. Install it:"
  echo "   brew install railway"
  echo "   # or: npm i -g @railway/cli"
  exit 1
fi

if ! railway whoami --json &>/dev/null; then
  echo "❌ Not authenticated. Run: railway login"
  exit 1
fi

echo "🚀 Setting up Railway project: $PROJECT_NAME"
echo ""

# ── Create project ───────────────────────────────────────────────────────────

echo "📦 Creating project..."
railway init --name "$PROJECT_NAME"
echo "   ✓ Project created and linked"

# ── Add Postgres ─────────────────────────────────────────────────────────────

echo "🐘 Adding Postgres 17..."
railway add --database postgres
echo "   ✓ Postgres provisioned"

# ── Link back to the app service ─────────────────────────────────────────────
# After adding a database, the CLI context may switch. Re-link to the app service.

echo "🔗 Linking to app service..."
railway service link "$PROJECT_NAME"
echo "   ✓ Linked to app service"

# ── Set environment variables ────────────────────────────────────────────────

echo "🔐 Setting environment variables..."

BETTER_AUTH_SECRET=$(openssl rand -base64 32)

railway variable set \
  DATABASE_URL='${{Postgres.DATABASE_URL}}' \
  BETTER_AUTH_SECRET="$BETTER_AUTH_SECRET" \
  BETTER_AUTH_URL='https://${{RAILWAY_PUBLIC_DOMAIN}}' \
  NEXT_PUBLIC_APP_URL='https://${{RAILWAY_PUBLIC_DOMAIN}}' \
  GOOGLE_CLIENT_ID= \
  GOOGLE_CLIENT_SECRET= \
  DODO_PAYMENTS_API_KEY= \
  DODO_PAYMENTS_WEBHOOK_SECRET= \
  ANTHROPIC_API_KEY= \
  RESEND_API_KEY= \
  RESEND_FROM_EMAIL= \
  NEXT_PUBLIC_POSTHOG_KEY= \
  NEXT_PUBLIC_POSTHOG_HOST=

echo "   ✓ Env vars set"
echo ""

# ── Summary ──────────────────────────────────────────────────────────────────

echo "✅ Railway project '$PROJECT_NAME' is ready!"
echo ""
echo "  Project:  $PROJECT_NAME"
echo "  Database: Postgres (wired via \${{Postgres.DATABASE_URL}})"
echo "  Env vars: DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL, NEXT_PUBLIC_APP_URL"
echo ""
echo "  Deploy: railway up --detach"

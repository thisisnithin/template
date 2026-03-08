#!/usr/bin/env bash
set -euo pipefail

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
copy_env packages/db

# Generate BETTER_AUTH_SECRET if empty
if grep -q '^BETTER_AUTH_SECRET=$' apps/web/.env 2>/dev/null; then
  secret=$(openssl rand -base64 32)
  sed -i '' "s|^BETTER_AUTH_SECRET=$|BETTER_AUTH_SECRET=$secret|" apps/web/.env
  echo "Generated BETTER_AUTH_SECRET"
fi

docker compose up -d
echo "Started Postgres"

for i in $(seq 1 10); do
  if pnpm db:migrate; then
    echo "Migrations applied"
    break
  fi
  if [[ $i -eq 10 ]]; then
    echo "Failed to migrate after 10 attempts"
    exit 1
  fi
  echo "Waiting for Postgres... (attempt $i/10)"
  sleep 2
done

#!/bin/bash
set -euo pipefail

DEFAULT_DATABASE_URL="postgresql://knowledge:knowledge@localhost:5432/concept_vault"

if [[ -z "${DATABASE_URL:-}" ]]; then
  DATABASE_URL="$(
    node -e "const { loadEnvConfig } = require('@next/env'); loadEnvConfig(process.cwd()); process.stdout.write(process.env.DATABASE_URL || '')"
  )"
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  DATABASE_URL="$DEFAULT_DATABASE_URL"
  echo "[db:reset] DATABASE_URL not set; using default: $DATABASE_URL"
fi

DB_NAME="$(
  node -e "const u=new URL(process.argv[1]); process.stdout.write(decodeURIComponent((u.pathname||'').replace(/^\\//,'') || 'postgres'))" "$DATABASE_URL"
)"

ADMIN_URL="$(
  node -e "const u=new URL(process.argv[1]); u.pathname='/postgres'; process.stdout.write(u.toString())" "$DATABASE_URL"
)"

TARGET_HOST="$(
  node -e "const u=new URL(process.argv[1]); process.stdout.write(u.hostname + (u.port ? ':' + u.port : ''))" "$DATABASE_URL"
)"

echo "Dropping and recreating database '$DB_NAME' on $TARGET_HOST..."
psql "$ADMIN_URL" -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS \"$DB_NAME\";"
psql "$ADMIN_URL" -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"$DB_NAME\";"

HAS_VECTOR="$(
  psql "$DATABASE_URL" -tA -c "SELECT 1 FROM pg_available_extensions WHERE name = 'vector' LIMIT 1;" | tr -d '[:space:]'
)"

if [[ "$HAS_VECTOR" == "1" ]]; then
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "CREATE EXTENSION IF NOT EXISTS vector;"
else
  echo "[db:reset] pgvector extension not available on $TARGET_HOST; skipping CREATE EXTENSION vector."
fi

echo "Database reset complete for '$DB_NAME'."

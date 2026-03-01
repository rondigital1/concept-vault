#!/bin/bash
set -e

echo "Dropping and recreating database..."
docker compose exec postgres psql -U knowledge -d postgres -c "DROP DATABASE IF EXISTS concept_vault;"
docker compose exec postgres psql -U knowledge -d postgres -c "CREATE DATABASE concept_vault;"
docker compose exec postgres psql -U knowledge -d concept_vault -c "CREATE EXTENSION IF NOT EXISTS vector;"

echo "Database reset complete!"

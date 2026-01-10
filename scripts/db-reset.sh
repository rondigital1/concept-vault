#!/bin/bash
set -e

echo "Dropping and recreating database..."
docker compose exec postgres psql -U knowledge -d postgres -c "DROP DATABASE IF EXISTS knowledge_distiller;"
docker compose exec postgres psql -U knowledge -d postgres -c "CREATE DATABASE knowledge_distiller;"
docker compose exec postgres psql -U knowledge -d knowledge_distiller -c "CREATE EXTENSION IF NOT EXISTS vector;"

echo "Database reset complete!"

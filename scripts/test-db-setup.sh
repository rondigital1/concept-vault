#!/bin/bash
# Script to set up the test database
# Usage: ./scripts/test-db-setup.sh

echo "Setting up test database..."

# Ensure Docker container is running
if ! docker compose ps 2>/dev/null | grep -q "running"; then
  echo "Starting Docker container..."
  docker compose up -d
  sleep 3
fi

# Wait for Postgres to be ready
echo "Waiting for Postgres to be ready..."
until docker compose exec -T postgres pg_isready -U knowledge > /dev/null 2>&1; do
  sleep 1
done
echo "Postgres is ready."

# Drop test database if exists
echo "Dropping existing test database (if any)..."
docker compose exec -T postgres psql -U knowledge -d postgres -c "DROP DATABASE IF EXISTS knowledge_distiller_test;"

# Create test database
echo "Creating test database..."
docker compose exec -T postgres psql -U knowledge -d postgres -c "CREATE DATABASE knowledge_distiller_test;"

# Verify database was created
echo "Verifying database creation..."
docker compose exec -T postgres psql -U knowledge -d postgres -c "SELECT datname FROM pg_database WHERE datname = 'knowledge_distiller_test';"

# Enable pgvector extension
echo "Enabling vector extension..."
docker compose exec -T postgres psql -U knowledge -d knowledge_distiller_test -c "CREATE EXTENSION IF NOT EXISTS vector;"

# Initialize schema (use dedicated test script to avoid connection caching)
echo "Initializing schema..."
DATABASE_URL="postgresql://knowledge:knowledge@localhost:5432/knowledge_distiller_test" npx tsx scripts/init-test-schema.ts

echo ""
echo "✓ Test database ready!"
echo ""
echo "Run tests with:"
echo "  npm test                  # All tests"
echo "  npm run test:unit         # Unit tests only (no DB needed)"
echo "  npm run test:integration  # Integration tests"
echo "  npm run test:agents       # Agent tests"

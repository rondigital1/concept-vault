# Knowledge Distiller

AI-powered knowledge curation and distillation system with strong observability.

## Stack

- TypeScript
- Next.js (App Router)
- Postgres + pgvector

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and add your OpenAI API key.

### 3. Start Postgres

```bash
docker compose up -d
```

Wait for the database to be healthy (~10 seconds).

### 4. Initialize database

```bash
npm run db:reset
```

### 5. Start dev server

```bash
npm run dev
```

Visit http://localhost:3000

## Usage

### Trigger a distill run

Use the "Start Distill Run" button on the `/agent-control-center` page, or:

```bash
curl -X POST http://localhost:3000/api/runs/distill
```

This returns a `runId`. View the trace at `/agent-control-center?runId=<runId>`.

### Get run trace via API

```bash
curl http://localhost:3000/api/runs/<runId>
```

## Project Structure

```
/app              # Next.js App Router (UI + API routes)
/server           # Server-side logic
  /agents         # Agent implementations
  /flows          # Orchestration flows
  /tools          # Tool implementations
  /llm            # LLM gateway & schemas
  /observability  # Run traces & logging
  /config         # App configuration
/db               # Database schema & migrations
/scripts          # Utility scripts
```

## Next Steps

1. Implement LLM calls in `server/llm/modelGateway.ts`
2. Add embedding generation & vector search in `server/tools/localKb.tool.ts`
3. Implement content parsing in `server/tools/ingest.tool.ts`
4. Build out agent logic in `server/agents/`
5. Add migrations for documents, embeddings, and knowledge graph tables

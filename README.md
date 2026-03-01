# Knowledge Distiller

AI-powered knowledge curation and distillation system with strong observability.

## Stack

- TypeScript
- Next.js (App Router)
- Postgres + pgvector (Supabase for cloud)

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

### Daily WebScout (Trusted Sources -> Library)

`/api/cron/web-scout` runs WebScout in `derive-from-vault` mode with:

- `restrictToWatchlistDomains=true`
- `importToLibrary=true`

It requires an auth token via `Authorization: Bearer <CRON_SECRET or WEB_SCOUT_CRON_SECRET>` in production.
On Vercel, `vercel.json` schedules this route weekly.

### Daily Topic Report

`/api/cron/topic-report` runs the full topic-report workflow and saves report artifacts.

It requires an auth token via `Authorization: Bearer <CRON_SECRET or TOPIC_REPORT_CRON_SECRET>` in production.
On Vercel, `vercel.json` schedules this route daily.

## Production Deploy (Vercel + Supabase + Google OAuth)

1. Create a Supabase project and copy the pooled Postgres connection string into `DATABASE_URL` (include `sslmode=require`).
2. Configure a Google OAuth app and set:
   - `AUTH_GOOGLE_ID`
   - `AUTH_GOOGLE_SECRET`
   - `AUTH_SECRET`
   - `OWNER_EMAIL` (only this email can sign in)
3. Set `CRON_SECRET` in Vercel project environment variables.
4. Keep `vercel.json` cron schedules enabled:
   - Daily `topic-report`: `0 11 * * *`
   - Weekly `web-scout`: `0 13 * * 0`

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

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

## Usage (Hybrid Workflow)

Use this order for normal operations:

### 1. Ingest documents

- UI: `/ingest`
- APIs: `/api/ingest`, `/api/ingest/upload`, `/api/ingest/llm`

On document creation, the app auto-runs a lightweight enrichment pipeline:

- `ResolveTargets -> Curate -> optional Distill`

This auto-run does **not** run WebScout, full report generation, or Notion publishing.

### 2. Create topics

- UI: `/agent-control-center` (Topic form)
- API: `POST /api/topics`

Topic creation auto-runs lightweight topic setup (`runMode=topic_setup`) to:

- normalize/seed focus tags
- link matching documents
- prepare topic metadata for future runs

Topic creation does **not** auto-run full reports.

### 3. Use manual actions intentionally

From `/agent-control-center`:

- `Generate Report (Live)` -> `runMode=full_report`
- `Refresh Concepts` -> `runMode=concept_only`
- `Find New Sources` -> `runMode=scout_only`
- `Refresh Topic Now (Live)` -> `runMode=incremental_update`

What each action does and where results appear:

- `Generate Report (Live)` (`full_report`)
  - Flow: `ResolveTargets -> Curate -> WebScout -> AnalyzeFindings -> Distill -> SynthesizeReport -> PersistAndPublish`
  - Result: creates `research-report` artifact(s) shown on `/reports`, plus concept/flashcard proposals.
  - Note: does **not** import new web URLs into Library documents.
- `Refresh Concepts` (`concept_only`)
  - Flow: `ResolveTargets -> Curate -> Distill -> Persist`
  - Result: creates concept + flashcard proposal artifacts for review.
  - No web scouting or longform report generation.
- `Find New Sources` (`scout_only`)
  - Flow: `ResolveTargets -> Curate -> WebScout -> AnalyzeFindings -> Persist`
  - Result: creates `web-proposal` and `web-analysis` artifacts.
  - No longform report synthesis and no automatic document import into Library.
- `Refresh Topic Now (Live)` (`incremental_update`)
  - Flow: `ResolveTargets -> Curate -> WebScout -> AnalyzeFindings -> Distill -> (optional) SynthesizeReport -> PersistAndPublish`
  - Result: for one selected topic, updates evidence/concepts and generates a report only when sufficient analyzed evidence exists.

Manual action endpoints:

- `POST /api/runs/generate-report`
- `POST /api/runs/refresh-concepts`
- `POST /api/runs/find-sources`
- `POST /api/runs/refresh-topic`

Canonical run API:

- `POST /api/runs/pipeline`

### 4. Watch progress

- Live run screen: `/web-scout`
- Run trace API: `GET /api/runs/<runId>`

The live screen shows active stage, active agent, and stage-colored timeline cards.

### 5. Scheduled tracked-topic runs

Tracked topics (daily/weekly cadence) are processed by cron through:

- `GET/POST /api/cron/pipeline`
- alias: `GET/POST /api/cron/tracked-topics`

Scheduler chooses per-topic run mode:

- `full_report`
- `incremental_update`
- `concept_only`
- `skip`

### 6. Report persistence and Notion publishing

Report flow is local-first:

- persist report in local DB/app storage first
- then publish to Notion (best effort)

If Notion publish fails, local report is still retained.

To enable Notion publishing, set:

- `NOTION_API_TOKEN`
- `NOTION_PARENT_PAGE_ID`

### 7. Important endpoint changes

Legacy run endpoints were hard-cutover and now return `410 Gone` with migration guidance.
Use `/api/runs/pipeline` or the manual run endpoints above.

## Production Deploy (Vercel + Supabase + Google OAuth)

1. Create a Supabase project and copy the pooled Postgres connection string into `DATABASE_URL` (include `sslmode=require`).
2. Configure a Google OAuth app and set:
   - `AUTH_GOOGLE_ID`
   - `AUTH_GOOGLE_SECRET`
   - `AUTH_SECRET`
   - `OWNER_EMAIL` (only this email can sign in)
3. Set `CRON_SECRET` in Vercel project environment variables.
4. Keep `vercel.json` cron schedules enabled:
   - Daily tracked-topic scheduler: call `/api/cron/pipeline` with `Authorization: Bearer <CRON_SECRET>`

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

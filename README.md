# Concept Vault

Topic-based research workflow for collecting source material, reviewing proposals, generating reports, and building a long-term reference library.

## Stack

- Next.js 15 App Router
- React 19
- TypeScript
- PostgreSQL
- LangChain / LangGraph

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Set at least:

- `DATABASE_URL`
- `OPENAI_API_KEY` or your active provider credentials
- `AUTH_SECRET`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `OWNER_EMAIL`

### 3. Start Postgres

```bash
docker compose up -d
```

### 4. Reset and initialize the database

```bash
npm run db:reset
```

### 5. Start the app

```bash
npm run dev
```

Open the URL printed by Next.js and sign in with the Google account that matches `OWNER_EMAIL`.

## Primary Workflow

### 1. Add content

- UI: `/ingest`
- APIs: `/api/ingest`, `/api/ingest/upload`, `/api/ingest/llm`

On document creation, the app runs a lightweight enrichment pipeline:

- `ResolveTargets -> Curate -> optional Distill`

This auto-run does not perform web scouting, full report generation, or Notion publishing.

### 2. Create topics in Research

- UI: `/today`
- API: `POST /api/topics`

Topic creation auto-runs lightweight topic setup (`runMode=topic_setup`) to:

- normalize focus tags
- link matching documents
- prepare topic metadata for future runs

### 3. Run the workflow intentionally

From `Research` (`/today`):

- `Generate Report` -> `runMode=full_report`
- `Refresh Topic` -> `runMode=incremental_update`
- `Find Sources` -> `runMode=scout_only`
- `Extract Concepts` -> `runMode=concept_only`

What each action does:

- `Generate Report`
  - Flow: `ResolveTargets -> Curate -> WebScout -> AnalyzeFindings -> Distill -> SynthesizeReport -> PersistAndPublish`
  - Result: creates `research-report` artifacts shown on `/reports`, plus concept and flashcard proposals for review.
- `Refresh Topic`
  - Flow: `ResolveTargets -> Curate -> WebScout -> AnalyzeFindings -> Distill -> optional report synthesis -> PersistAndPublish`
  - Result: refreshes a topic’s usable evidence and may generate a report when there is enough analyzed material.
- `Find Sources`
  - Flow: `ResolveTargets -> Curate -> WebScout -> AnalyzeFindings -> Persist`
  - Result: creates `web-proposal` and `web-analysis` artifacts for review.
- `Extract Concepts`
  - Flow: `ResolveTargets -> Curate -> Distill -> Persist`
  - Result: creates concept and flashcard proposal artifacts for review.

Manual action endpoints:

- `POST /api/runs/generate-report`
- `POST /api/runs/refresh-topic`
- `POST /api/runs/find-sources`
- `POST /api/runs/refresh-concepts`

Canonical run API:

- `POST /api/runs/pipeline`

### 4. Review queue and run details

- Research queue: `/today#review-inbox`
- Run details screen: `/web-scout`
- Run trace API: `GET /api/runs/<runId>`

The run screen is outcome-first and keeps technical details behind progressive disclosure.

### 5. Read reports and browse the library

- Reports: `/reports`
- Library: `/library`
- Ask Vault: `/chat`

Approved source candidates can be saved into Library and reused in future topic refreshes and reports.

## Scheduled Runs

Tracked topics (daily or weekly cadence) are processed by cron through:

- `GET/POST /api/cron/pipeline`
- alias: `GET/POST /api/cron/tracked-topics`

Scheduler chooses per-topic run mode:

- `full_report`
- `incremental_update`
- `concept_only`
- `skip`

## Notion Publishing

Report persistence is local-first:

- persist the report locally first
- publish to Notion as best effort

If Notion publish fails, the local report is still retained.

To enable Notion publishing, set:

- `NOTION_API_TOKEN`
- `NOTION_PARENT_PAGE_ID`

## Production Notes

1. Create a Supabase project and set `DATABASE_URL`.
2. Configure Google OAuth and set `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_SECRET`, and `OWNER_EMAIL`.
3. Set `CRON_SECRET` in your deployment environment.
4. Keep cron schedules enabled for `/api/cron/pipeline`.

## Project Structure

```text
/app              UI routes and API routes
/server           agents, flows, services, repos, observability
/db               schema and database client
/docs             implementation notes and reference docs
/scripts          utility scripts
```

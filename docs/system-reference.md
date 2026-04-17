# System Reference

Expanded reference for schema, routes, observability, env, and file map.
Operational rules remain in `AGENTS.md` (`CLAUDE.md`).
For diagrams and the full current workflow, see `docs/current-agent-architecture.md`.

## Artifact Lifecycle

Artifacts track both pending-review agent outputs and approved research reports.

State flow:

```text
proposed -> approved
    \-> rejected
approved -> superseded
```

Status meanings:

- `proposed`: waiting for human review
- `approved`: accepted by human or inserted as an already-approved report
- `rejected`: declined by human
- `superseded`: replaced by a newer approved artifact

`artifacts` table highlights:

- `id` UUID primary key
- `run_id` foreign key to `runs`
- `agent` commonly includes `distiller`, `webScout`, and `research`
- `kind` currently includes `concept`, `flashcard`, `web-proposal`, `web-analysis`, `research-report`
- `day` for inbox grouping
- `content` JSONB structured payload
- `source_refs` JSONB linkage
- `status`
- `created_at`, `reviewed_at`

Unique rule: one approved artifact per `(agent, kind, day)`.
In the current implementation, `approved` is the active state.

Approval endpoints exist. Approving a `web-proposal` can ingest the source into `documents` and trigger a `lightweight_enrichment` pipeline run.

## Database Reference

Core tables:

- `documents`: ingested source text + tags + dedupe hash
- `concepts`: extracted concepts tied to documents
- `flashcards`: generated cards with review state
- `artifacts`: proposal, analysis, and report records

Observability tables:

- `runs`: top-level execution records
- `run_steps`: append-only timeline per run
- `llm_calls`: durable audit records for OpenAI request/response usage, status, and cost

Spaced repetition tables:

- `review_schedule`
- `reviews`

Supporting tables:

- `document_tags`
- `related_documents`
- `saved_topics`
- `topic_documents`
- `source_watchlist`
- `chat_sessions`
- `chat_history`

Key enums:

- `runs.status`: `running | ok | error | partial`
- `runs.kind`: `distill | curate | webScout | research | pipeline`
- `artifacts.status`: `proposed | approved | rejected | superseded`
- `flashcards.status`: `proposed | approved | edited | rejected`
- `concepts.type`: `definition | principle | framework | procedure | fact`

Current-state note: `pipeline` is the canonical run kind in practice. Wrapper routes and cron entrypoints all funnel into `pipelineFlow(...)`.

## Observability Reference

Per canonical run:

1. create a `pipeline` run row (`createRun`)
2. append flow steps and nested agent steps (`appendStep`)
3. close the run (`finishRun`)

Flow pattern:

```typescript
const runId = await createRun('pipeline');
await appendStep(runId, { type: 'flow', name: 'pipeline', status: 'running' });
await appendStep(runId, { type: 'flow', name: 'pipeline_resolve_targets', status: 'running' });
// invoke curatorGraph / webScoutGraph / distillerGraph as needed,
// forwarding emitted agent steps into appendStep(...)
await finishRun(runId, status);
```

`RunStep` shape:

```typescript
interface RunStep {
  timestamp: string;
  type: 'agent' | 'tool' | 'llm' | 'flow';
  name: string;
  status: 'running' | 'ok' | 'error' | 'skipped';
  input?: unknown;
  output?: unknown;
  error?: unknown;
  tokenEstimate?: number;
}
```

Inspect a run:

```bash
GET /api/runs/<runId>
```

Fetch resolved results for a run:

```bash
GET /api/runs/<runId>/results
```

Common failure modes:

- run stuck in `running`: crash before `finishRun`
- step `error`: model/tool failure (inspect `run_steps.error`)
- empty `artifactIds`: no eligible docs
- partial run: some docs failed, run continued

Debug loop:

1. capture `runId`
2. fetch run trace
3. inspect failing step name + payload
4. correlate with server logs

## API Route Reference

Canonical pipeline trigger:

- `POST /api/runs/pipeline`

Wrapper triggers:

- `POST /api/runs/generate-report` (`runMode='full_report'`)
- `POST /api/runs/refresh-topic` (defaults to `runMode='incremental_update'`)
- `POST /api/runs/refresh-concepts` (`runMode='concept_only'`)
- `POST /api/runs/find-sources` (`runMode='scout_only'`)

Topic and scheduler integration:

- `POST /api/topics` creates a topic and triggers a `topic_setup` pipeline run
- `GET /api/cron/pipeline`
- `POST /api/cron/pipeline`

Ingestion:

- `POST /api/ingest` (raw text)
- `POST /api/ingest/llm` (LLM-generated content)
- `POST /api/ingest/upload` (PDF/DOCX/TXT/MD/CSV)

Approval side effects:

- `POST /api/artifacts/{id}/approve`
- `POST /api/artifacts/{id}/reject`

Observability:

- `GET /api/runs/<runId>`
- `GET /api/runs/<runId>/results`

Other:

- `POST /api/chat`
- `GET /api/today`

Deprecated compatibility routes:

- Retained compatibility stubs such as `POST /api/distill`, `POST /api/web-scout`, `POST /api/runs/distill`, `POST /api/runs/curate`, `GET|POST /api/cron/topic-report`, and `GET|POST /api/cron/web-scout` return `410`.
- These routes emit `http.deprecated_route.hit` logs with `requestId`, `pathname`, `method`, and `replacement`.
- Historical aliases `/api/research`, `/api/web-scout/start`, `/api/runs/distill-curate`, and `/api/runs/topic-report` are no longer shipped.

## Code Conventions

- Imports: use `@/` aliases (`@/server/`, `@/db/`)
- Types: `*Input`, `*Output`, `*Row`, `*Schema`, `*State`
- File scope: ~250 LOC soft limit, single responsibility
- Step naming: descriptive verbs (`fetchDocuments`, `extractConcepts`)
- Error handling: capture in state, continue where practical, log with context

## Environment

```bash
# Required
DATABASE_URL=postgresql://...
OPENAI_API_KEY=sk-...
TAVILY_API_KEY=tvly-...

# Optional
ANTHROPIC_API_KEY=sk-ant-...
MODEL_PROVIDER=openai
MODEL_NAME=gpt-4o
```

## Scripts

```bash
npm run dev
npm run build
npm run db:reset
npm run db:init
npm run lint
```

## MVP Constraints

- single user (no auth/multi-tenancy)
- runs can be manual, cron-driven, topic-setup driven, or follow-on enrichment after ingest/approval
- inline execution (no queue)
- no vector search yet (`localKb.tool.ts` placeholder)
- no chunking (single text blob per document)
- no fully autonomous source crawling/import; new content still enters via explicit ingest or approval flows
- no fine-tuning

## Known TODO Index

- `server/services/today.service.ts`: log to `llm_calls`
- `server/tools/localKb.tool.ts`: pgvector search

## Launch Ops

- Supported beta launch procedures live in [docs/beta-launch-runbook.md](/Users/ron/AgenticProjects/concept-vault/docs/beta-launch-runbook.md).

## Key Files

- Current architecture walkthrough: `docs/current-agent-architecture.md`
- Agent graphs: `server/agents/*.graph.ts`
- Agent nodes: `server/agents/helpers/*.nodes.ts`
- WebScout tools: `server/ai/tools/webScout.tools.ts`
- Flows: `server/flows/*.flow.ts`
- Run tracing store: `server/observability/runTrace.store.ts`
- Callback adapter: `server/langchain/callbacks/runStepAdapter.ts`
- LLM execution: `server/ai/openai-execution-service.ts`
- Prompt builder: `server/ai/prompt-builder.ts`
- Zod schemas: `server/langchain/schemas/*.ts`
- DB schema: `db/schema.ts`
- Repositories: `server/repos/*.repo.ts`

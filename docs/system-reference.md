# System Reference

Expanded reference for schema, routes, observability, env, and file map.
Operational rules remain in `AGENTS.md` (`CLAUDE.md`).

## Artifact Lifecycle

Artifacts track agent outputs pending review.

State flow:

```text
proposed -> approved -> active
    \-> rejected
approved -> superseded
```

Status meanings:

- `proposed`: waiting for human review
- `approved`: accepted by human
- `rejected`: declined by human
- `superseded`: replaced by a newer approved artifact

`artifacts` table highlights:

- `id` UUID primary key
- `run_id` foreign key to `runs`
- `agent` (`curator` | `distiller` | `webScout`)
- `kind` (`concept` | `flashcard` | `web-proposal`)
- `day` for inbox grouping
- `content` JSONB structured payload
- `source_refs` JSONB linkage
- `status`
- `created_at`, `reviewed_at`

Unique rule: one approved artifact per `(agent, kind, day)`.

Known gap: UI references `/api/artifacts/{id}/approve` and `/api/artifacts/{id}/reject`; approval APIs are incomplete.

## Database Reference

Core tables:

- `documents`: ingested source text + tags + dedupe hash
- `concepts`: extracted concepts tied to documents
- `flashcards`: generated cards with review state
- `artifacts`: proposal records from agents

Observability tables:

- `runs`: top-level execution records
- `run_steps`: append-only timeline per run
- `llm_calls`: exists, not fully populated yet

Spaced repetition tables:

- `review_schedule`
- `reviews`

Supporting tables:

- `document_tags`
- `related_documents`
- `chat_sessions`
- `chat_history`

Key enums:

- `runs.status`: `running | ok | error | partial`
- `runs.kind`: `distill | curate | webScout`
- `flashcards.status`: `proposed | approved | edited | rejected`
- `concepts.type`: `definition | principle | framework | procedure | fact`

## Observability Reference

Per run:

1. create run row (`createRun`)
2. append step events (`appendStep`)
3. close run (`finishRun`)

Flow pattern:

```typescript
const runId = await createRun('distill');
await appendStep(runId, { type: 'flow', name: 'distill', status: 'running' });
await distillerGraph(input, async (step) => await appendStep(runId, step), runId);
await finishRun(runId, 'ok');
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

Agent triggers:

- `POST /api/distill`
- `POST /api/web-scout`
- `POST /api/runs/distill`
- `POST /api/runs/curate`
- `POST /api/runs/web-scout`

Ingestion:

- `POST /api/ingest` (raw text)
- `POST /api/ingest/llm` (LLM-generated content)
- `POST /api/ingest/upload` (PDF/DOCX/TXT/MD/CSV)

Observability:

- `GET /api/runs/<runId>`

Other:

- `POST /api/chat`
- `GET /api/today`

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
- manual runs (no scheduler)
- inline execution (no queue)
- no vector search yet (`localKb.tool.ts` placeholder)
- no chunking (single text blob per document)
- no auto-ingestion
- no fine-tuning

## Known TODO Index

- `server/services/today.service.ts`: log to `llm_calls`
- `server/tools/localKb.tool.ts`: pgvector search
- `server/tools/webSearch.tool.ts`: web search integration
- `server/tools/ingest.tool.ts`: chunking
- `app/api/distill/route.ts`: GET/PUT/DELETE
- `app/today/page.tsx`: approval route integration

## Key Files

- Agent graphs: `server/agents/*.graph.ts`
- Agent nodes: `server/agents/helpers/*.nodes.ts`
- Flows: `server/flows/*.flow.ts`
- Run tracing store: `server/observability/runTrace.store.ts`
- Callback adapter: `server/langchain/callbacks/runStepAdapter.ts`
- LLM factory: `server/langchain/models.ts`
- Zod schemas: `server/langchain/schemas/*.ts`
- DB schema: `db/schema.ts`
- Repositories: `server/repos/*.repo.ts`

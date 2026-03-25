# Concept Vault Agent Guide

Operational guide for agents in this repo. Keep this file short and contract-focused.
Detailed implementation tutorials and reference tables live in:

- `docs/current-agent-architecture.md`
- `docs/agent-patterns.md`
- `docs/system-reference.md`

## Quick Start

- Stack: Next.js 15, React 19, TypeScript, PostgreSQL, LangChain/LangGraph, Tavily API
- Dev server: `npm run dev` (localhost:3000)
- Database reset: `npm run db:reset`
- Lint: `npm run lint`
- Build: `npm run build`

## Non-Negotiables

- Agents are API-triggered workflows, not chat loops.
- Proposal-first lifecycle applies to Curator/Distiller/WebScout review outputs: new artifacts are written as `artifacts.status='proposed'`.
- Human approval is required before proposal artifacts become active; research reports are currently inserted as approved `research-report` artifacts.
- Runs execute inline in the request path (no queue/background worker in MVP).
- ReAct agents must capture reasoning in artifact content.
- Never auto-import external URLs from WebScout itself; URL import happens only on explicit approval.

## Architecture Snapshot

```
app/              -> UI + API routes
server/agents/    -> LangGraph graphs
server/ai/        -> OpenAI execution, prompts, task policy
server/flows/     -> orchestration + run tracing
server/repos/     -> SQL-first data access
server/services/  -> business logic
server/langchain/ -> schemas, callbacks, memory helpers
db/               -> schema + postgres client
```

Execution path:

```
HTTP -> canonical pipeline route/wrapper -> pipeline flow -> graph -> repos -> PostgreSQL
                                             |
                                          run tracing
                                 (createRun -> appendStep -> finishRun)
```

## Agent Contracts

### Curator

- Purpose: extract tags, optional category, related docs.
- File: `server/agents/curator.graph.ts`
- Inputs:
  - `documentId: string` (required)
  - `enableCategorization?: boolean` (default `false`)
- Outputs:
  - `tags: string[]` (max 8, normalized)
  - `category: 'learning' | 'software engineering' | 'ai systems' | 'finance' | 'productivity' | 'other' | 'uncategorized'`
  - `relatedDocs: string[]`
- Writes:
  - `documents.tags` via `setDocumentTags()`
- Must:
  - normalize tags (lowercase, 1-3 words, 3-40 chars)
  - truncate content to 12,000 chars before extraction
  - cap final tags at 8
- Must not:
  - create artifacts
  - mutate document content

### Distiller

- Purpose: extract concepts and generate flashcards for review.
- Files:
  - `server/agents/distiller.graph.ts`
  - `server/agents/helpers/distiller.nodes.ts`
- Inputs:
  - `day: string` (required, `YYYY-MM-DD`)
  - `documentIds?: string[]`
  - `limit?: number` (default `5`)
  - `topicTag?: string`
- Outputs:
  - `artifactIds: string[]`
  - `counts: { docsProcessed, conceptsProposed, flashcardsProposed }`
- Writes:
  - `concepts`
  - `flashcards` with `status='proposed'`
  - `artifacts` kinds: `concept`, `flashcard` with `status='proposed'`
- Must:
  - truncate each doc to 4,000 chars
  - extract 2-5 concepts/doc
  - generate 1-2 flashcards/concept
  - link `source_refs` to document/concept
- Must not:
  - auto-approve flashcards
  - process more than `limit`

### WebScout

- Purpose: iterative web research until quality threshold is met.
- Files:
  - `server/agents/webScout.graph.ts`
  - `server/agents/helpers/webScout.nodes.ts`
  - `server/ai/tools/webScout.tools.ts`
- Inputs:
  - `goal: string` (required)
  - `mode: 'explicit-query' | 'derive-from-vault'` (required)
  - `day: string` (required)
  - `focusTags?: string[]`
  - `minQualityResults?: number` (default `3`)
  - `minRelevanceScore?: number` (default `0.8`)
  - `maxIterations?: number` (default `5`)
  - `maxQueries?: number` (default `10`)
- Outputs:
  - `proposals`
  - `artifactIds`
  - `reasoning`
  - `terminationReason: 'satisfied' | 'max_iterations' | 'max_queries' | 'timeout'`
  - `counts`
- Tools:
  - `searchWeb`
  - `evaluateResult` (hybrid heuristic + LLM for borderline)
  - `checkVaultDuplicate`
  - `refineQuery`
- Must:
  - evaluate every candidate result
  - dedupe against `documents.source`
  - include reasoning trace per proposal
  - stop on threshold or limits
- Must not:
  - auto-import URLs
  - exceed timeout without graceful partial return
- Dependency: `TAVILY_API_KEY`
- Current state:
  - implemented as a ReAct-style loop via the OpenAI Responses API and function tools
  - creates `web-proposal` artifacts only; analysis and report synthesis happen in the pipeline layer

## Pattern Selection

- Use Deterministic pipeline when steps are fixed and completion criteria are clear.
- Use ReAct loop when the agent must iterate, choose tools dynamically, and self-evaluate quality.

For full code templates and examples, see `docs/agent-patterns.md`.

## Artifact Lifecycle Contract

State transitions:

```
proposed -> approved
    \-> rejected
approved -> superseded
```

- `approved` is the active state in the current implementation.
- Artifacts represent pending human-review outputs plus approved research reports.
- Constraint: one approved artifact per `(agent, kind, day)`.
- Approval endpoints exist; approving a `web-proposal` can ingest the source into the library and trigger lightweight enrichment.

## Observability Contract

Every run should produce:

1. `runs` row via `createRun(kind)`
2. append-only `run_steps` entries via `appendStep(...)`
3. terminal status via `finishRun(...)`

`RunStep` shape (summary):

- `timestamp`
- `type: 'agent' | 'tool' | 'llm' | 'flow'`
- `name`
- `status: 'running' | 'ok' | 'error' | 'skipped'`
- optional `input`, `output`, `error`, `tokenEstimate`

Debug flow:

1. get `runId` from trigger response
2. request `GET /api/runs/<runId>`
3. inspect failing step `error` payload + server logs

## API Surface (Core)

Canonical pipeline trigger:

- `POST /api/runs/pipeline`

Wrapper triggers:

- `POST /api/runs/generate-report`
- `POST /api/runs/refresh-topic`
- `POST /api/runs/refresh-concepts`
- `POST /api/runs/find-sources`

Pipeline-adjacent triggers:

- `POST /api/topics` (creates a topic and triggers `topic_setup`)
- `GET /api/cron/pipeline`
- `POST /api/cron/pipeline`

Ingestion:

- `POST /api/ingest`
- `POST /api/ingest/llm`
- `POST /api/ingest/upload`

Observability:

- `GET /api/runs/<runId>`
- `GET /api/runs/<runId>/results`

Deprecated compatibility routes:

- legacy single-agent routes such as `POST /api/distill`, `POST /api/web-scout`, `POST /api/runs/distill`, and `POST /api/runs/curate` now return `410`

Additional app routes and endpoint tables are in `docs/system-reference.md`.

## MVP Constraints

- Single-user MVP (no auth/multi-tenancy)
- Pipeline runs can be manual, cron-driven, topic-setup driven, or follow-on enrichment after ingest/approval
- Inline execution only
- No vector search in local KB yet
- No document chunking yet
- No fully autonomous source crawling/import; new content still enters through explicit ingest or approval flows
- No model fine-tuning

## Conventions

- Imports: prefer `@/` aliases
- Types: `*Input`, `*Output`, `*Row`, `*Schema`, `*State`
- Files: roughly 250 LOC soft limit, single responsibility
- Step names: verb-forward (`fetchDocuments`, `extractConcepts`)
- Error handling: capture in state and continue where safe

## Where Details Live

- Current architecture diagrams and the end-to-end pipeline walkthrough:
  - `docs/current-agent-architecture.md`
- Pattern code examples, ToolNode templates, and "add new agent" checklist:
  - `docs/agent-patterns.md`
- Database table inventory, full API map, env/scripts, TODO index, key files:
  - `docs/system-reference.md`

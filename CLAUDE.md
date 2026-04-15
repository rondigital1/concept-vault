# Concept Vault Agent Guide

Operational reference for agents. Details live in:
- `docs/current-agent-architecture.md`
- `docs/agent-patterns.md`
- `docs/system-reference.md`

## Quick Start

- Stack: Next.js 15, React 19, TypeScript, PostgreSQL, LangChain/LangGraph, Tavily API
- `npm run dev` · `npm run db:reset` · `npm run lint` · `npm run build`

## Non-Negotiables

- Agents are API-triggered workflows, not chat loops
- Curator/Distiller/WebScout review outputs → `artifacts.status='proposed'`
- Human approval required before proposals go active; research reports insert as approved
- Inline execution only (no queue/background worker in MVP)
- ReAct agents must capture reasoning in artifact content
- Never auto-import external URLs from WebScout; URL import on explicit approval only

## Architecture

```
app/              → UI + API routes
server/agents/    → LangGraph graphs
server/ai/        → OpenAI execution, prompts, task policy
server/flows/     → orchestration + run tracing
server/repos/     → SQL-first data access
server/services/  → business logic
server/langchain/ → schemas, callbacks, memory helpers
db/               → schema + postgres client
```

```
HTTP → pipeline route → pipeline flow → graph → repos → PostgreSQL
                                           ↓
                                      run tracing
                              (createRun → appendStep → finishRun)
```

## Agent Contracts

### Curator
`server/agents/curator.graph.ts`

| | |
|---|---|
| **Inputs** | `documentId: string`, `enableCategorization?: boolean` (default `false`) |
| **Outputs** | `tags: string[]` (max 8), `category`, `relatedDocs: string[]` |
| **Writes** | `documents.tags` via `setDocumentTags()` |
| **Must** | normalize tags (lowercase, 1–3 words, 3–40 chars); truncate content to 12k chars |
| **Must not** | create artifacts; mutate document content |

Categories: `learning` · `software engineering` · `ai systems` · `finance` · `productivity` · `other` · `uncategorized`

### Distiller
`server/agents/distiller.graph.ts` · `helpers/distiller.nodes.ts`

| | |
|---|---|
| **Inputs** | `day: string` (YYYY-MM-DD), `documentIds?`, `limit?` (default `5`), `topicTag?` |
| **Outputs** | `artifactIds: string[]`, `counts: { docsProcessed, conceptsProposed, flashcardsProposed }` |
| **Writes** | `concepts`, `flashcards`, `artifacts` (kinds: `concept`, `flashcard`) — all `status='proposed'` |
| **Must** | truncate docs to 4k chars; extract 2–5 concepts/doc; generate 1–2 flashcards/concept; link `source_refs` |
| **Must not** | auto-approve flashcards; exceed `limit` |

### WebScout
`server/agents/webScout.graph.ts` · `helpers/webScout.nodes.ts` · `server/ai/tools/webScout.tools.ts`  
**Requires:** `TAVILY_API_KEY`

| | |
|---|---|
| **Inputs** | `goal: string`, `mode: 'explicit-query' \| 'derive-from-vault'`, `day: string`, `focusTags?`, `minQualityResults?` (3), `minRelevanceScore?` (0.8), `maxIterations?` (5), `maxQueries?` (10) |
| **Outputs** | `proposals`, `artifactIds`, `reasoning`, `terminationReason`, `counts` |
| **Tools** | `searchWeb`, `evaluateResult`, `checkVaultDuplicate`, `refineQuery` |
| **Must** | evaluate every candidate; dedupe against `documents.source`; include reasoning trace per proposal; stop on threshold/limits |
| **Must not** | auto-import URLs; exceed timeout without partial return |

Implemented as ReAct-style loop via OpenAI Responses API. Creates `web-proposal` artifacts only; analysis/synthesis happen in the pipeline layer.

`terminationReason`: `satisfied` · `max_iterations` · `max_queries` · `timeout`

## Pattern Selection

- **Deterministic pipeline** — fixed steps, clear completion criteria
- **ReAct loop** — dynamic tool use, iterative self-evaluation

See `docs/agent-patterns.md` for templates.

## Artifact Lifecycle

```
proposed → approved → superseded
         ↘ rejected
```

- `approved` is the active state
- One approved artifact per `(agent, kind, day)`
- Approving a `web-proposal` can ingest the source and trigger lightweight enrichment

## Observability

Every run produces: `createRun(kind)` → `appendStep(...)` → `finishRun(...)`

`RunStep` fields: `timestamp`, `type` (`agent|tool|llm|flow`), `name`, `status` (`running|ok|error|skipped`), optional `input/output/error/tokenEstimate`

Debug: get `runId` from trigger → `GET /api/runs/<runId>` → inspect failing step `error` + server logs

## API Surface

**Pipeline triggers:**
- `POST /api/runs/pipeline` (canonical)
- `POST /api/runs/generate-report` · `refresh-topic` · `refresh-concepts` · `find-sources`
- `POST /api/topics` · `GET|POST /api/cron/pipeline`

**Ingestion:** `POST /api/ingest` · `/api/ingest/llm` · `/api/ingest/upload`

**Observability:** `GET /api/runs/<runId>` · `GET /api/runs/<runId>/results`

**Deprecated (410):** `/api/distill`, `/api/web-scout`, `/api/runs/distill`, `/api/runs/curate`

Full endpoint tables in `docs/system-reference.md`.

## MVP Constraints

- Single-user, no auth/multi-tenancy
- Inline execution only; no queue
- No vector search, chunking, or autonomous crawling yet
- New content via explicit ingest or approval flows only

## Conventions

- Imports: `@/` aliases
- Types: `*Input` · `*Output` · `*Row` · `*Schema` · `*State`
- Files: ~250 LOC, single responsibility
- Step names: verb-forward (`fetchDocuments`, `extractConcepts`)
- Errors: capture in state, continue where safe

<frontend_aesthetics>
You tend to converge toward generic, "on distribution" outputs.
In frontend design, this creates what users call the "AI slop" aesthetic.
Avoid this: make creative, distinctive frontends that surprise and delight.

- Typography: Use fonts that are beautiful and distinctive. Avoid Inter, Roboto,
  Arial, system fonts. Load from Fontshare or Google Fonts.
- Color & Theme: Commit to a cohesive aesthetic. CSS variables for consistency.
  Dominant accent colors with neutrals outperform timid evenly-distributed palettes.
  Draw from IDE themes and cultural aesthetics for inspiration.
- Motion: CSS-only animations preferred. One well-orchestrated page load with
  staggered reveals creates more delight than scattered micro-interactions.
- Backgrounds: Create atmosphere. Layer CSS gradients, geometric patterns,
  or contextual effects — no solid #fff defaults.

Avoid these AI giveaways:
- Purple/violet gradients on white backgrounds
- Gradient buttons (use solid accent)
- 3-column icon-in-circle feature grids
- Centered text on every section
- Generic "Unlock the power of..." hero copy
- Space Grotesk, Poppins, Montserrat (overused)
- Colored side-borders on cards
</frontend_aesthetics>
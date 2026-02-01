# Concept Vault

AI-powered knowledge curation system for spaced repetition learning.

## Quick Reference

- **Stack**: Next.js 15, React 19, TypeScript, PostgreSQL, LangChain/LangGraph
- **Dev**: `npm run dev` (localhost:3000)
- **DB**: `npm run db:reset` (Docker + schema init)

## Architecture

### Layers
```
app/              → UI (pages, components, API routes)
server/agents/    → LangGraph state machines (distiller, webScout, curator)
server/flows/     → Orchestration + observability wrapper
server/repos/     → Data access (SQL-first, no ORM)
server/services/  → Business logic
server/langchain/ → Model factory, schemas, callbacks, memory
db/               → Schema + postgres.js client
```

### Data Flow
```
API Route → Flow (creates Run) → Agent Graph → Callbacks → DB
                                      ↓
                               Structured Output → Repos → PostgreSQL
```

## Agent Pattern (LangGraph)

Agents are **deterministic state machines**, not ReAct agents:

```typescript
const workflow = new StateGraph(AgentState)
  .addNode('step1', nodeFunction)
  .addNode('step2', nodeFunction)
  .addEdge('__start__', 'step1')
  .addEdge('step1', 'step2')
  .addConditionalEdges('step2', routingFunction);
```

**Why StateGraph instead of `createAgent()`?**
- Fixed pipelines, not dynamic tool selection
- Debuggable with explicit named nodes
- Typed state via `Annotation.Root()`
- Structured output, not tool-calling

### Agent Workflows

**Curator** (`server/agents/curator.graph.ts`):
```
loadDocument → extractTags → categorize → findRelated → persistTags
```

**Distiller** (`server/agents/distiller.graph.ts`):
```
fetchDocuments → [loop: extractConcepts → saveConcepts → generateFlashcards → saveFlashcards]
```

**WebScout** (`server/agents/webScout.graph.ts`):
```
prepareQueries → executeSearches → deduplicateUrls → scoreResults → createProposals
```

## Structured Output

Use Zod schemas with `.withStructuredOutput()`:

```typescript
const model = createExtractionModel().withStructuredOutput(ConceptExtractionSchema);
const result = await model.invoke(messages);
// result is typed and validated - no JSON parsing needed
```

Schemas: `server/langchain/schemas/*.ts`

## Observability

Every agent run creates a trace:
- `runs` table: top-level execution record
- `run_steps` table: individual steps with input/output/error

Retrieve via `GET /api/runs/<runId>`

Callbacks bridge LangChain → RunStep: `server/langchain/callbacks/runStepAdapter.ts`

## Database (SQL-First)

No ORM. Raw SQL via postgres.js:

```typescript
const rows = await sql`SELECT * FROM documents WHERE id = ${id}`;
```

**Key tables**: `documents`, `concepts`, `flashcards`, `artifacts`, `runs`, `run_steps`, `chat_history`

Schema: `db/schema.ts`

## Code Conventions

- **Imports**: Use `@/` aliases (`@/server/`, `@/db/`)
- **Types**: `*Input`, `*Output`, `*Row`, `*Schema`, `*State`
- **Files**: ~250 LOC soft limit, single responsibility
- **Errors**: Captured in run_steps JSONB, logged to console

## Environment

Required in `.env`:
```
DATABASE_URL=postgresql://...
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...  # optional if using OpenAI
TAVILY_API_KEY=tvly-...
MODEL_PROVIDER=openai         # or 'anthropic'
MODEL_NAME=gpt-4o             # optional override
```

## Key Files

| Purpose | File |
|---------|------|
| Agent implementations | `server/agents/*.graph.ts` |
| LLM factory | `server/langchain/models.ts` |
| Zod schemas | `server/langchain/schemas/*.ts` |
| Run tracing | `server/observability/runTrace.store.ts` |
| DB schema | `db/schema.ts` |
| Flow orchestration | `server/flows/*.flow.ts` |

## Scripts

```bash
npm run dev       # Start dev server
npm run build     # Production build
npm run db:reset  # Docker + schema init
npm run db:init   # Schema init only
npm run lint      # ESLint
```

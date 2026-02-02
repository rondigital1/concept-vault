# Concept Vault

AI-powered knowledge curation system for spaced repetition learning.

## Quick Reference

- **Stack**: Next.js 15, React 19, TypeScript, PostgreSQL, LangChain/LangGraph
- **Dev**: `npm run dev` (localhost:3000)
- **DB**: `npm run db:reset` (Docker + schema init)

---

## Agent Philosophy

This system uses **two agent patterns** depending on task complexity:

### Pattern 1: Deterministic Pipeline

For tasks with predictable steps and clear completion criteria.

- Fixed node sequence with conditional edges
- No dynamic tool selection
- Single pass through the graph
- **Used by**: Curator, Distiller

### Pattern 2: ReAct Loop

For research tasks requiring iteration until quality threshold is met.

- Agent decides which tool to call next
- Loops until satisfied or max iterations
- Includes reasoning trace in output
- **Used by**: WebScout, future research agents

### Shared Principles

- **Not chat-driven**: Agents triggered via API, not conversation
- **Proposal-first**: Agents write to `artifacts` with `status='proposed'`
- **Human approval required**: Nothing becomes active without review (once approval APIs are implemented)
- **Reasoning captured**: ReAct agents include chain-of-thought in artifacts

---

## Architecture

### Layers

```
app/              → UI (pages, components, API routes)
server/agents/    → LangGraph state machines
server/flows/     → Orchestration + observability wrapper
server/repos/     → Data access (SQL-first, no ORM)
server/services/  → Business logic
server/langchain/ → Model factory, schemas, callbacks
db/               → Schema + postgres.js client
```

### Execution Model

```
HTTP Request → API Route → Flow → Agent Graph → Repos → PostgreSQL
                  ↓
              createRun()
                  ↓
              appendStep() ←── RunStepCallbackHandler (bridges LangChain)
                  ↓
              finishRun()
```

**Inline execution**: All agent runs block the HTTP request until completion. No background jobs or queue.

**Future**: Background processing would wrap `*Flow()` functions in a job queue (e.g., BullMQ, Inngest).

---

## Agent Definitions

### Curator

**Purpose**: Extract topic tags from a document, optionally categorize, and find related documents.

**File**: `server/agents/curator.graph.ts`

**Inputs**:

- `documentId: string` (required)
- `enableCategorization?: boolean` (default: false)

**Outputs**:

- `tags: string[]` (max 8, normalized)
- `category: string` ('learning' | 'software engineering' | 'ai systems' | 'finance' | 'productivity' | 'other' | 'uncategorized')
- `relatedDocs: string[]` (document IDs)

**Workflow**:

```
loadDocument → [if no error] → extractTags → categorize → findRelated → persistTags → END
      ↓ error
     END
```

**Database writes**:

- `documents.tags` (array update via `setDocumentTags()`)

**MUST do**:

- Normalize tags (lowercase, 1-3 words, 3-40 chars)
- Limit to 8 final tags
- Truncate content to 12,000 chars for extraction

**MUST NOT do**:

- Create artifacts (tags are inline metadata, not proposals)
- Modify document content

---

### Distiller

**Purpose**: Extract concepts from documents and generate flashcards for spaced repetition.

**File**: `server/agents/distiller.graph.ts`  
**Nodes**: `server/agents/helpers/distiller.nodes.ts`

**Inputs**:

- `day: string` (required, YYYY-MM-DD for artifact grouping)
- `documentIds?: string[]` (specific docs, or omit for recent)
- `limit?: number` (default: 5)
- `topicTag?: string` (filter by tag)

**Outputs**:

- `artifactIds: string[]`
- `counts: { docsProcessed, conceptsProposed, flashcardsProposed }`

**Workflow** (loops per document):

```
fetchDocuments → [loop] → extractConcepts → saveConcepts → generateFlashcards → saveFlashcards → [next doc or END]
```

**Database writes**:

- `concepts` table: label, type, summary, evidence (JSONB)
- `flashcards` table: format ('qa'|'cloze'), front, back, `status='proposed'`
- `artifacts` table: kind='concept' and kind='flashcard', `status='proposed'`

**MUST do**:

- Truncate content to 4,000 chars per document
- Extract 2-5 concepts per document
- Generate 1-2 flashcards per concept
- Create artifacts with `source_refs` linking to document/concept

**MUST NOT do**:

- Auto-approve flashcards (all created as 'proposed')
- Process more than `limit` documents per run

---

### WebScout (ReAct Pattern)

**Purpose**: Research the web iteratively until finding high-quality resources that match the user's learning goals.

**Pattern**: ReAct loop with tool calling

**File**: `server/agents/webScout.graph.ts`  
**Tools**: `server/langchain/tools/webScout.tools.ts`

**Inputs**:

- `goal: string` (required) - What the user wants to learn about
- `mode: 'explicit-query' | 'derive-from-vault'` (required)
- `day: string` (required, YYYY-MM-DD)
- `focusTags?: string[]` (filter vault docs for context)
- `minQualityResults?: number` (default: 3)
- `minRelevanceScore?: number` (default: 0.8)
- `maxIterations?: number` (default: 5)
- `maxQueries?: number` (default: 10)

**Outputs**:

- `proposals: WebScoutProposal[]` - With reasoning trace
- `artifactIds: string[]`
- `reasoning: string[]` - Chain of thought explaining selections
- `terminationReason: 'satisfied' | 'max_iterations' | 'max_queries' | 'timeout'`
- `counts: { iterations, queriesExecuted, resultsEvaluated, proposalsCreated }`

**Tools Available to Agent**:

| Tool                  | Purpose                                                        |
| --------------------- | -------------------------------------------------------------- |
| `searchWeb`           | Execute Tavily query, return raw results                       |
| `evaluateResult`      | Score a single result (hybrid: heuristic + LLM for borderline) |
| `checkVaultDuplicate` | Check if URL already exists in documents                       |
| `refineQuery`         | LLM modifies query based on what's missing from results        |

**ReAct Loop**:

```
START → agent (plans) → tools (executes) → agent (evaluates) → [decision]
             ↑                                                      ↓
             └────────────────── needsMore ←────────────────────────┘
                                     ↓
                                satisfied → createProposals → END
```

**Stopping Conditions**:

| Condition             | Default                        | Behavior                              |
| --------------------- | ------------------------------ | ------------------------------------- |
| Quality threshold met | ≥3 results with relevance ≥0.8 | `terminationReason: 'satisfied'`      |
| Max iterations        | 5 loops                        | `terminationReason: 'max_iterations'` |
| Max queries           | 10 searches                    | `terminationReason: 'max_queries'`    |
| Timeout               | 60 seconds                     | `terminationReason: 'timeout'`        |

**Evaluation Strategy** (Hybrid):

1. **Fast heuristic pass**: Domain quality score, title keyword match, snippet relevance
2. **LLM evaluation**: Only for borderline results (heuristic score 0.5-0.8)
3. **Skip LLM**: For clearly good (>0.8) or clearly bad (<0.5) results

**Query Refinement**:

When `needsMore`, the agent calls `refineQuery` with:

- Original goal
- Queries already tried
- What's missing (e.g., "found tutorials but no academic sources")
- LLM suggests modified query targeting the gap

**Database writes**:

- `artifacts` table: kind='web-proposal', `status='proposed'`
- Content includes: url, summary, relevance score, content type, topics, **reasoning**

**Artifact Reasoning Trace**:

Each proposal artifact includes `reasoning` explaining why it was selected:

```json
{
  "content": {
    "url": "https://...",
    "summary": "...",
    "relevanceScore": 0.92,
    "reasoning": [
      "Matches goal: 'distributed systems fundamentals'",
      "High-quality domain: mit.edu",
      "Contains key concepts: consensus, replication, CAP theorem",
      "Complements existing vault content on databases"
    ]
  }
}
```

**MUST do**:

- Iterate until quality threshold OR max iterations
- Include reasoning trace in every proposal
- Deduplicate against existing `documents.source` URLs
- Use hybrid evaluation (heuristic + LLM for borderline)

**MUST NOT do**:

- Auto-import URLs (creates proposals only)
- Skip evaluation (every result must be scored)
- Exceed timeout (fail gracefully with partial results)

**External dependency**: Tavily API (`TAVILY_API_KEY`)

**Current Implementation Note**: v1 is a deterministic pipeline. ReAct loop is the target architecture.

---

## Artifact Lifecycle

Artifacts track agent outputs pending human review.

### States

```
proposed → approved → active
    ↓          ↓
 rejected   superseded
```

| Status       | Meaning                             |
| ------------ | ----------------------------------- |
| `proposed`   | Agent output awaiting review        |
| `approved`   | Human accepted                      |
| `rejected`   | Human declined                      |
| `superseded` | Replaced by newer approved artifact |

### Schema (`artifacts` table)

| Column        | Type        | Purpose                                    |
| ------------- | ----------- | ------------------------------------------ |
| `id`          | UUID        | Primary key                                |
| `run_id`      | UUID FK     | Link to parent run                         |
| `agent`       | TEXT        | 'curator' \| 'distiller' \| 'webScout'     |
| `kind`        | TEXT        | 'concept' \| 'flashcard' \| 'web-proposal' |
| `day`         | TEXT        | YYYY-MM-DD for inbox grouping              |
| `title`       | TEXT        | Display title                              |
| `content`     | JSONB       | Structured artifact data                   |
| `source_refs` | JSONB       | Links to source documents/concepts         |
| `status`      | TEXT        | Lifecycle state                            |
| `created_at`  | TIMESTAMPTZ | Creation time                              |
| `reviewed_at` | TIMESTAMPTZ | Approval/rejection time                    |

### Unique constraint

One approved artifact per `(agent, kind, day)` combination. Approving a new artifact supersedes the previous.

### Known Gap: Approval API

**UI references** `/api/artifacts/{id}/approve` and `/api/artifacts/{id}/reject` but **these routes do not exist yet**. Currently all artifacts remain in `proposed` state.

---

## Database Schema

### Core Tables

| Table        | Purpose                                            |
| ------------ | -------------------------------------------------- |
| `documents`  | Imported content with tags, content_hash for dedup |
| `concepts`   | Extracted concepts linked to documents             |
| `flashcards` | Generated cards with status workflow               |
| `artifacts`  | Agent proposals pending review                     |

### Observability Tables

| Table       | Purpose                                                          |
| ----------- | ---------------------------------------------------------------- |
| `runs`      | Top-level agent execution record                                 |
| `run_steps` | Individual step timeline with JSONB input/output/error           |
| `llm_calls` | LLM call audit trail (schema exists, **not actively populated**) |

### Spaced Repetition Tables

| Table             | Purpose                            |
| ----------------- | ---------------------------------- |
| `review_schedule` | SM-2 algorithm state per flashcard |
| `reviews`         | Individual review events           |

### Supporting Tables

| Table               | Purpose                                       |
| ------------------- | --------------------------------------------- |
| `document_tags`     | Normalized tag storage (alternative to array) |
| `related_documents` | Document similarity graph                     |
| `chat_sessions`     | Chat session metadata                         |
| `chat_history`      | LangChain message persistence                 |

### Key Enums

- `runs.status`: 'running' | 'ok' | 'error' | 'partial'
- `runs.kind`: 'distill' | 'curate' | 'webScout'
- `flashcards.status`: 'proposed' | 'approved' | 'edited' | 'rejected'
- `concepts.type`: 'definition' | 'principle' | 'framework' | 'procedure' | 'fact'

---

## Observability

### Run Tracing

Every agent execution creates:

1. **Run** (`runs` table): Top-level record with kind, status, timestamps
2. **Steps** (`run_steps` table): Append-only timeline of operations

### How It Works

```typescript
// In flow (e.g., distill.flow.ts)
const runId = await createRun('distill');
await appendStep(runId, { type: 'flow', name: 'distill', status: 'running' });

// Agent executes with callback
await distillerGraph(
  input,
  async (step) => {
    await appendStep(runId, step);
  },
  runId,
);

await finishRun(runId, 'ok');
```

### RunStep Structure

```typescript
interface RunStep {
  timestamp: string;
  type: 'agent' | 'tool' | 'llm' | 'flow';
  name: string;
  status: 'running' | 'ok' | 'error' | 'skipped';
  input?: unknown; // JSONB
  output?: unknown; // JSONB
  error?: any; // JSONB
  tokenEstimate?: number;
}
```

### Inspecting a Run

```bash
# API
GET /api/runs/<runId>

# Returns RunTrace with all steps ordered by started_at
```

### Common Failure Modes

| Symptom                | Likely cause                                       |
| ---------------------- | -------------------------------------------------- |
| Run stuck in 'running' | Server crash before finishRun()                    |
| Step with error status | LLM call failed (check `run_steps.error`)          |
| Empty artifactIds      | No documents matched criteria                      |
| Partial results        | Individual doc processing failed but run continued |

### Debugging Workflow

1. Get `runId` from API response
2. `GET /api/runs/<runId>` for full trace
3. Inspect step statuses and error JSONB
4. Check console logs for `[AgentName]` prefixed messages

---

## API Routes

### Agent Triggers

| Endpoint              | Method | Agent     | Notes                                  |
| --------------------- | ------ | --------- | -------------------------------------- |
| `/api/distill`        | POST   | Distiller | Optional: documentIds, limit, topicTag |
| `/api/web-scout`      | POST   | WebScout  | Required: mode, day                    |
| `/api/runs/distill`   | POST   | Distiller | (UI form target)                       |
| `/api/runs/curate`    | POST   | Curator   | (UI form target)                       |
| `/api/runs/web-scout` | POST   | WebScout  | (UI form target)                       |

### Ingestion

| Endpoint             | Method | Purpose                               |
| -------------------- | ------ | ------------------------------------- |
| `/api/ingest`        | POST   | Raw text ingestion                    |
| `/api/ingest/llm`    | POST   | Content from LLM chat                 |
| `/api/ingest/upload` | POST   | File upload (PDF, DOCX, TXT, MD, CSV) |

### Observability

| Endpoint            | Method | Purpose            |
| ------------------- | ------ | ------------------ |
| `/api/runs/<runId>` | GET    | Retrieve run trace |

### Other

| Endpoint     | Method | Purpose              |
| ------------ | ------ | -------------------- |
| `/api/chat`  | POST   | Chat with KB context |
| `/api/today` | GET    | Today dashboard data |

---

## LangGraph Patterns

### Pattern 1: Deterministic Pipeline

For Curator, Distiller, and similar extraction agents.

**State Definition**:

```typescript
const AgentState = Annotation.Root({
  // Inputs
  documentId: Annotation<string>(),

  // Working state
  document: Annotation<DocumentRow | null>({ default: () => null }),

  // Outputs
  tags: Annotation<string[]>({ default: () => [] }),
  error: Annotation<string | null>({ default: () => null }),
});
```

**Node Function Signature**:

```typescript
async function nodeName(state: typeof AgentState.State): Promise<Partial<typeof AgentState.State>> {
  // Return only changed fields
  return { tags: ['extracted', 'tags'] };
}
```

**Conditional Routing**:

```typescript
function shouldContinue(state: typeof AgentState.State): string {
  return state.error ? '__end__' : 'nextNode';
}

graph.addConditionalEdges('currentNode', shouldContinue, {
  nextNode: 'nextNode',
  __end__: '__end__',
});
```

**Structured Output**:

```typescript
const model = createExtractionModel({ temperature: 0.3 }).withStructuredOutput(TagExtractionSchema);

const result = await model.invoke(messages);
// result is typed and validated
```

---

### Pattern 2: ReAct Loop with Tools

For WebScout and future research agents.

**State Definition** (includes iteration tracking):

```typescript
const ReActState = Annotation.Root({
  // Inputs
  goal: Annotation<string>(),
  minQualityResults: Annotation<number>({ default: () => 3 }),
  minRelevanceScore: Annotation<number>({ default: () => 0.8 }),
  maxIterations: Annotation<number>({ default: () => 5 }),

  // Working state
  iteration: Annotation<number>({ default: () => 0 }),
  messages: Annotation<BaseMessage[]>({ default: () => [] }), // Agent memory
  allResults: Annotation<ScoredResult[]>({ default: () => [] }),

  // Outputs
  proposals: Annotation<Proposal[]>({ default: () => [] }),
  reasoning: Annotation<string[]>({ default: () => [] }),
  terminationReason: Annotation<string | null>({ default: () => null }),
});
```

**Tool Definitions**:

```typescript
const searchWebTool = tool(
  async ({ query }: { query: string }) => {
    const results = await executeTavilySearch(query);
    return JSON.stringify(results);
  },
  {
    name: 'searchWeb',
    description: 'Search the web for resources. Returns array of {url, title, snippet}.',
    schema: z.object({ query: z.string().describe('Search query') }),
  },
);

const refineQueryTool = tool(
  async ({ originalQuery, feedback }: { originalQuery: string; feedback: string }) => {
    const model = createExtractionModel();
    const refined = await model.invoke([
      new SystemMessage('Refine the search query based on feedback about what is missing.'),
      new HumanMessage(`Original: ${originalQuery}\nFeedback: ${feedback}`),
    ]);
    return refined.content;
  },
  {
    name: 'refineQuery',
    description: 'Modify a query based on what results are missing.',
    schema: z.object({
      originalQuery: z.string(),
      feedback: z.string().describe('What is missing from current results'),
    }),
  },
);
```

**Graph with ToolNode**:

```typescript
import { ToolNode } from '@langchain/langgraph/prebuilt';

const tools = [searchWebTool, evaluateResultTool, refineQueryTool, checkDuplicateTool];
const toolNode = new ToolNode(tools);

// Bind tools to the model
const modelWithTools = createChatModel().bindTools(tools);

async function agentNode(state: typeof ReActState.State) {
  const response = await modelWithTools.invoke(state.messages);
  return { messages: [...state.messages, response] };
}

function routeAfterAgent(state: typeof ReActState.State): string {
  const lastMessage = state.messages[state.messages.length - 1];

  // If agent called tools, execute them
  if (lastMessage.tool_calls?.length > 0) {
    return 'tools';
  }

  // Check stopping conditions
  const highQuality = state.allResults.filter((r) => r.relevance >= state.minRelevanceScore);
  if (highQuality.length >= state.minQualityResults) {
    return 'finalize'; // Satisfied
  }
  if (state.iteration >= state.maxIterations) {
    return 'finalize'; // Max iterations
  }

  // Continue (agent will decide next action)
  return 'agent';
}

const workflow = new StateGraph(ReActState)
  .addNode('agent', agentNode)
  .addNode('tools', toolNode)
  .addNode('finalize', finalizeNode)
  .addEdge('__start__', 'agent')
  .addConditionalEdges('agent', routeAfterAgent, {
    tools: 'tools',
    agent: 'agent',
    finalize: 'finalize',
  })
  .addEdge('tools', 'agent'); // After tools, back to agent
```

**Observability for ReAct**:

Each iteration is captured as nested steps:

```
run_steps:
  - webScout_iteration_1 (type: 'agent')
    - tool_call: searchWeb
    - tool_call: evaluateResult (x3)
    - agent_decision: needsMore
  - webScout_iteration_2
    - tool_call: refineQuery
    - tool_call: searchWeb
    - ...
  - webScout_finalize
    - terminationReason: 'satisfied'
    - proposals: [...]
```

---

### When to Use Each Pattern

| Use Case                          | Pattern       | Why                                 |
| --------------------------------- | ------------- | ----------------------------------- |
| Extract structured data from text | Deterministic | Predictable steps, single pass      |
| Tag/categorize content            | Deterministic | Clear completion criteria           |
| Generate content from source      | Deterministic | Fixed transformation pipeline       |
| Research until quality threshold  | ReAct         | Needs iteration and self-evaluation |
| Find resources matching criteria  | ReAct         | May need query refinement           |
| Explore unknown space             | ReAct         | Agent decides what to do next       |

---

## Adding a New Agent

### Step 0: Choose Pattern

| Question                                 | If Yes →      | If No →        |
| ---------------------------------------- | ------------- | -------------- |
| Does it need to iterate until satisfied? | ReAct         | Deterministic  |
| Does the agent decide what to do next?   | ReAct         | Deterministic  |
| Is the task a fixed transformation?      | Deterministic | Consider ReAct |

---

### Adding a Deterministic Agent

**1. Define State** (`server/agents/newAgent.graph.ts`)

```typescript
const NewAgentState = Annotation.Root({
  // inputs
  // working state
  // outputs
  error: Annotation<string | null>({ default: () => null }),
});
```

**2. Implement Nodes**

Either inline or in `server/agents/helpers/newAgent.nodes.ts` for complex agents.

**3. Build Graph**

```typescript
const workflow = new StateGraph(NewAgentState)
  .addNode('step1', step1Node)
  .addNode('step2', step2Node)
  .addEdge('__start__', 'step1')
  .addConditionalEdges('step1', routingFn);

export const newAgentGraph = workflow.compile();
```

---

### Adding a ReAct Agent

**1. Define State** (with iteration tracking)

```typescript
const NewReActState = Annotation.Root({
  // Inputs
  goal: Annotation<string>(),
  maxIterations: Annotation<number>({ default: () => 5 }),

  // Working state
  iteration: Annotation<number>({ default: () => 0 }),
  messages: Annotation<BaseMessage[]>({ default: () => [] }),

  // Outputs
  results: Annotation<Result[]>({ default: () => [] }),
  reasoning: Annotation<string[]>({ default: () => [] }),
  terminationReason: Annotation<string | null>({ default: () => null }),
});
```

**2. Define Tools** (`server/langchain/tools/newAgent.tools.ts`)

```typescript
export const myTool = tool(
  async (input) => {
    /* implementation */
  },
  {
    name: 'myTool',
    description: 'What this tool does',
    schema: z.object({
      /* params */
    }),
  },
);
```

**3. Build Graph with ToolNode**

```typescript
const tools = [tool1, tool2, tool3];
const toolNode = new ToolNode(tools);
const modelWithTools = createChatModel().bindTools(tools);

const workflow = new StateGraph(NewReActState)
  .addNode('agent', agentNode)
  .addNode('tools', toolNode)
  .addNode('finalize', finalizeNode)
  .addEdge('__start__', 'agent')
  .addConditionalEdges('agent', routeAfterAgent)
  .addEdge('tools', 'agent');
```

**4. Define Stopping Conditions**

```typescript
function routeAfterAgent(state): string {
  // Check quality threshold
  // Check max iterations
  // Check timeout
  return 'tools' | 'agent' | 'finalize';
}
```

---

### Common Steps (Both Patterns)

**5. Create Flow** (`server/flows/newAgent.flow.ts`)

Wrap with run tracing (see `distill.flow.ts` for pattern).

**6. Add API Route** (`app/api/new-agent/route.ts`)

Call flow, return results.

**7. Add Run Kind**

Update `db/schema.ts` check constraint for `runs.kind`.

---

## Adding a New Artifact Kind

1. **Define content shape** in repo (e.g., `newKind.repo.ts`)
2. **Create insert function** following `insertArtifact()` pattern
3. **Add to agent** output that calls insert
4. **Update Today dashboard** to display new kind in inbox
5. **Document in CLAUDE.md** what the artifact contains

---

## Code Conventions

- **Imports**: Use `@/` aliases (`@/server/`, `@/db/`)
- **Types**: `*Input`, `*Output`, `*Row`, `*Schema`, `*State`
- **Files**: ~250 LOC soft limit, single responsibility
- **Step names**: Descriptive verbs (`fetchDocuments`, `extractConcepts`)
- **Error handling**: Store in state, continue when possible, log to console

---

## Environment

```bash
# Required
DATABASE_URL=postgresql://...
OPENAI_API_KEY=sk-...
TAVILY_API_KEY=tvly-...

# Optional
ANTHROPIC_API_KEY=sk-ant-...  # Alternative provider
MODEL_PROVIDER=openai         # or 'anthropic'
MODEL_NAME=gpt-4o             # Override default model
```

---

## Scripts

```bash
npm run dev       # Start dev server
npm run build     # Production build
npm run db:reset  # Docker + schema init
npm run db:init   # Schema init only
npm run lint      # ESLint
```

---

## MVP Constraints

This is a single-user MVP. The following are explicitly out of scope:

| Constraint          | Implication                                     |
| ------------------- | ----------------------------------------------- |
| Single user         | No auth, no multi-tenancy                       |
| Manual runs         | Agents triggered via UI/API, no auto-scheduling |
| Inline execution    | HTTP request blocks until agent completes       |
| No background queue | Long runs may timeout                           |
| No vector search    | `localKb.tool.ts` is stubbed (TODO: pgvector)   |
| No chunking         | Documents stored as single text blobs           |
| No auto-ingestion   | Manual import only                              |
| No fine-tuning      | Uses base models only                           |

---

## Known TODOs

Documented in code with `// TODO:` comments:

| Location                           | TODO                               |
| ---------------------------------- | ---------------------------------- |
| `server/services/today.service.ts` | Log to `llm_calls` table           |
| `server/tools/localKb.tool.ts`     | Implement vector search (pgvector) |
| `server/tools/webSearch.tool.ts`   | Implement web search integration   |
| `server/tools/ingest.tool.ts`      | Implement document chunking        |
| `app/api/distill/route.ts`         | Implement GET/PUT/DELETE           |
| UI (`app/today/page.tsx`)          | Approval API routes don't exist    |

---

## Key Files

| Purpose            | File                                           |
| ------------------ | ---------------------------------------------- |
| Agent graphs       | `server/agents/*.graph.ts`                     |
| Agent nodes        | `server/agents/helpers/*.nodes.ts`             |
| Flow orchestration | `server/flows/*.flow.ts`                       |
| Run tracing        | `server/observability/runTrace.store.ts`       |
| Callback adapter   | `server/langchain/callbacks/runStepAdapter.ts` |
| LLM factory        | `server/langchain/models.ts`                   |
| Zod schemas        | `server/langchain/schemas/*.ts`                |
| DB schema          | `db/schema.ts`                                 |
| Repos              | `server/repos/*.repo.ts`                       |

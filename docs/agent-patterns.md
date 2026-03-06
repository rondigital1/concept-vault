# Agent Patterns and Scaffolding

This document holds implementation-level patterns and code templates.
The operational contract stays in `AGENTS.md` (`CLAUDE.md`).

## Pattern 1: Deterministic Pipeline

Use when:

- steps are fixed
- completion criteria are known up front
- no dynamic tool choice is needed

Typical users: Curator, Distiller.

### State Definition Template

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

### Node Function Template

```typescript
async function nodeName(state: typeof AgentState.State): Promise<Partial<typeof AgentState.State>> {
  // Return only changed fields
  return { tags: ['extracted', 'tags'] };
}
```

### Conditional Routing Template

```typescript
function shouldContinue(state: typeof AgentState.State): string {
  return state.error ? '__end__' : 'nextNode';
}

graph.addConditionalEdges('currentNode', shouldContinue, {
  nextNode: 'nextNode',
  __end__: '__end__',
});
```

### Structured Output Template

```typescript
const model = createExtractionModel({ temperature: 0.3 }).withStructuredOutput(TagExtractionSchema);
const result = await model.invoke(messages);
```

## Pattern 2: ReAct Loop with Tools

Use when:

- the agent must iterate until quality is good enough
- tool usage is dynamic
- query refinement or exploratory behavior is required

Typical user: WebScout and future research agents.

### State Definition Template

```typescript
const ReActState = Annotation.Root({
  // Inputs
  goal: Annotation<string>(),
  minQualityResults: Annotation<number>({ default: () => 3 }),
  minRelevanceScore: Annotation<number>({ default: () => 0.8 }),
  maxIterations: Annotation<number>({ default: () => 5 }),

  // Working state
  iteration: Annotation<number>({ default: () => 0 }),
  messages: Annotation<BaseMessage[]>({ default: () => [] }),
  allResults: Annotation<ScoredResult[]>({ default: () => [] }),

  // Outputs
  proposals: Annotation<Proposal[]>({ default: () => [] }),
  reasoning: Annotation<string[]>({ default: () => [] }),
  terminationReason: Annotation<string | null>({ default: () => null }),
});
```

### Tool Definition Templates

```typescript
const searchWebTool = tool(
  async ({ query }: { query: string }) => {
    const results = await executeTavilySearch(query);
    return JSON.stringify(results);
  },
  {
    name: 'searchWeb',
    description: 'Search the web for resources. Returns {url, title, snippet}.',
    schema: z.object({ query: z.string() }),
  },
);
```

```typescript
const refineQueryTool = tool(
  async ({ originalQuery, feedback }: { originalQuery: string; feedback: string }) => {
    const model = createExtractionModel();
    const refined = await model.invoke([
      new SystemMessage('Refine the search query based on what is missing.'),
      new HumanMessage(`Original: ${originalQuery}\nFeedback: ${feedback}`),
    ]);
    return refined.content;
  },
  {
    name: 'refineQuery',
    description: 'Modify a query based on result gaps.',
    schema: z.object({
      originalQuery: z.string(),
      feedback: z.string(),
    }),
  },
);
```

### Graph Wiring with ToolNode

```typescript
import { ToolNode } from '@langchain/langgraph/prebuilt';

const tools = [searchWebTool, evaluateResultTool, refineQueryTool, checkDuplicateTool];
const toolNode = new ToolNode(tools);
const modelWithTools = createChatModel().bindTools(tools);

async function agentNode(state: typeof ReActState.State) {
  const response = await modelWithTools.invoke(state.messages);
  return { messages: [...state.messages, response] };
}

function routeAfterAgent(state: typeof ReActState.State): string {
  const lastMessage = state.messages[state.messages.length - 1];
  if (lastMessage.tool_calls?.length > 0) return 'tools';

  const highQuality = state.allResults.filter((r) => r.relevance >= state.minRelevanceScore);
  if (highQuality.length >= state.minQualityResults) return 'finalize';
  if (state.iteration >= state.maxIterations) return 'finalize';

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
  .addEdge('tools', 'agent');
```

### ReAct Observability Pattern

Example trace shape:

```text
run_steps:
  - webScout_iteration_1 (type: agent)
    - tool_call: searchWeb
    - tool_call: evaluateResult (xN)
    - agent_decision: needsMore
  - webScout_iteration_2
    - tool_call: refineQuery
    - tool_call: searchWeb
  - webScout_finalize
    - terminationReason: satisfied|max_iterations|max_queries|timeout
```

## Choosing a Pattern

| Use Case | Pattern | Why |
| --- | --- | --- |
| Extract structured fields | Deterministic | predictable steps |
| Tag/categorize content | Deterministic | single pass |
| Generate outputs from known source | Deterministic | stable transformation |
| Research until threshold is met | ReAct | iterative self-evaluation |
| Discover resources in uncertain space | ReAct | dynamic query/tool decisions |

## Adding a New Agent

### Step 0: Pick the Pattern

| Question | If Yes | If No |
| --- | --- | --- |
| Needs iterative "until good enough"? | ReAct | Deterministic |
| Agent decides next tool/action? | ReAct | Deterministic |
| Fixed transformation pipeline? | Deterministic | Consider ReAct |

### Deterministic Agent Checklist

1. Define state in `server/agents/<name>.graph.ts`.
2. Implement node functions (inline or `server/agents/helpers/<name>.nodes.ts`).
3. Compile graph with explicit edges and conditional routing.
4. Add flow in `server/flows/<name>.flow.ts` with run tracing.
5. Add API route in `app/api/...`.
6. Update `runs.kind` constraint in `db/schema.ts` if needed.

### ReAct Agent Checklist

1. Define state with `iteration`, `messages`, and stopping controls.
2. Implement tools in `server/langchain/tools/<name>.tools.ts`.
3. Bind model to tools and add `ToolNode`.
4. Implement route function with threshold/iteration/query/timeout stops.
5. Add finalize node that writes outputs + reasoning.
6. Add flow + API route + `runs.kind` update.

## Adding a New Artifact Kind

1. Define content shape in the corresponding repo file.
2. Add insert helper (similar to existing artifact inserts).
3. Emit artifact from agent output.
4. Extend Today dashboard inbox rendering for the new kind.
5. Update agent docs to describe the artifact contract.

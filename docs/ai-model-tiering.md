# AI Model Tiering

ConceptVault uses exactly two OpenAI model tiers:

- `DEFAULT`: `gpt-5-mini`
- `PREMIUM`: `gpt-5.4`

This is intentionally small. The project is a personal, document-centric side project, so cost and clarity matter more than orchestration sophistication. Most work is precomputable, so the cheap tier should handle almost everything.

## Default vs premium

Default-tier tasks:

- `classify_document`
- `tag_document`
- `extract_structured_metadata`
- `rewrite_query`
- `summarize_simple`
- `distill_document`
- `compare_documents`
- `generate_report_draft`
- `generate_flashcards`
- `chat_assistant`
- `generate_prompt_suggestions`
- `web_research_agent`

Premium-tier tasks:

- `generate_final_report`
- `refine_final_report`

Premium is rare on purpose. It is reserved for final synthesis or an explicit validation-failure escalation path.

## Escalation rules

- No task upgrades to premium unless the task policy allows it.
- No task upgrades to premium unless the caller explicitly opts into escalation on validation failure.
- Premium tasks do not escalate further.
- Every escalation is logged with the reason.

Today, escalation is conservative. It is enabled in policy only for selected higher-value cheap tasks such as `summarize_simple`, `distill_document`, `compare_documents`, and `generate_report_draft`.

## How it works

All OpenAI execution runs through [`server/ai/openai-execution-service.ts`](/Users/ron/AgenticProjects/concept-vault/server/ai/openai-execution-service.ts).

That service is responsible for:

- model selection
- Responses API request construction
- prompt-cache-friendly prompt assembly
- validation and retry handling
- explicit escalation
- spend estimation and budget guards
- structured usage logging

Task definitions live in [`server/ai/tasks.ts`](/Users/ron/AgenticProjects/concept-vault/server/ai/tasks.ts).
Routing policy lives in [`server/ai/model-policy.ts`](/Users/ron/AgenticProjects/concept-vault/server/ai/model-policy.ts).

## Adding a new AI task

1. Add the task to [`server/ai/tasks.ts`](/Users/ron/AgenticProjects/concept-vault/server/ai/tasks.ts).
2. Add its routing policy in [`server/ai/model-policy.ts`](/Users/ron/AgenticProjects/concept-vault/server/ai/model-policy.ts).
3. Build prompts with [`server/ai/prompt-builder.ts`](/Users/ron/AgenticProjects/concept-vault/server/ai/prompt-builder.ts).
4. Call `openAIExecutionService.executeText(...)`, `executeStructured(...)`, or `executeToolRound(...)`.
5. Add a focused test for routing, validation, and escalation behavior when relevant.

Do not add a third tier. Do not add provider abstractions. Keep the policy readable.

## Cost control

Cost is controlled with simple hooks, not billing infrastructure:

- estimated per-request spend before execution
- max per-request spend guard
- max per-job spend guard
- optional daily budget hook in the execution service
- conservative premium access rules

Pricing assumptions used by the estimator are centralized in [`server/ai/cost-estimator.ts`](/Users/ron/AgenticProjects/concept-vault/server/ai/cost-estimator.ts).

## Why premium is intentionally rare

`gpt-5.4` is materially more expensive than `gpt-5-mini`, so using it broadly would damage the economics of the project without adding much value to routine extraction work. The demo value is highest when premium is used for final polished synthesis, not for every intermediate step.

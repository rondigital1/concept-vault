import { openAIExecutionService } from '@/server/ai/openai-execution-service';
import { AI_BUDGETS } from '@/server/ai/budget-policy';
import { AI_TASKS } from '@/server/ai/tasks';
import { webScoutToolDefinitions } from '@/server/ai/tools/webScout.tools';
import type { WebScoutStateType } from '@/server/agents/helpers/webScout.types';

export async function agent(state: WebScoutStateType): Promise<Partial<WebScoutStateType>> {
  const prompt = {
    instructions: state.instructions,
    promptCacheKey: state.promptCacheKey,
    input: state.initialInput,
    requestPayload: '',
    stablePrefix: state.instructions,
  };
  const input = state.previousResponseId ? state.pendingToolOutputs : state.initialInput;
  const response = await openAIExecutionService.executeToolRound({
    task: AI_TASKS.webResearchAgent,
    prompt,
    input,
    previousResponseId: state.previousResponseId,
    tools: webScoutToolDefinitions,
    budget: AI_BUDGETS.webResearchAgent,
    attribution: {
      runId: state.runId,
    },
  });

  return {
    lastAgentResult: response,
    previousResponseId: response.responseId,
    pendingToolOutputs: [],
    iteration: state.iteration + 1,
  };
}

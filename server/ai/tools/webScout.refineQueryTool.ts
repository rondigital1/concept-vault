import { AI_BUDGETS } from '@/server/ai/budget-policy';
import { openAIExecutionService } from '@/server/ai/openai-execution-service';
import { buildPrompt } from '@/server/ai/prompt-builder';
import { AI_TASKS } from '@/server/ai/tasks';
import { refineQueryArgsSchema } from '@/server/ai/tools/webScout.toolSchemas';

export async function refineQueryTool(args: unknown): Promise<string> {
  const parsed = refineQueryArgsSchema.parse(args);

  try {
    const prompt = buildPrompt({
      task: AI_TASKS.rewriteQuery,
      systemInstructions: [
        {
          heading: 'Role',
          content: 'You improve a search query based on missing-result feedback.',
        },
        {
          heading: 'Rules',
          content: 'Return only one refined query string with no explanation.',
        },
      ],
      requestPayload: [
        {
          heading: 'Original Query',
          content: parsed.originalQuery,
        },
        {
          heading: 'Feedback',
          content: parsed.feedback,
        },
      ],
    });
    const response = await openAIExecutionService.executeText({
      task: AI_TASKS.rewriteQuery,
      prompt,
      budget: AI_BUDGETS.rewriteQuery,
    });
    return response.output || parsed.originalQuery;
  } catch {
    return parsed.originalQuery;
  }
}

import type { WebScoutTool } from '@/server/ai/tools/webScout.toolSchemas';
import {
  checkVaultDuplicateArgsSchema,
  evaluateResultArgsSchema,
  refineQueryArgsSchema,
  searchWebArgsSchema,
} from '@/server/ai/tools/webScout.toolSchemas';
import { checkVaultDuplicateTool } from '@/server/ai/tools/webScout.duplicateTool';
import { evaluateResultTool } from '@/server/ai/tools/webScout.evaluateTool';
import { refineQueryTool } from '@/server/ai/tools/webScout.refineQueryTool';
import { searchWebTool } from '@/server/ai/tools/webScout.searchTool';

export {
  checkVaultDuplicateArgsSchema,
  evaluateResultArgsSchema,
  refineQueryArgsSchema,
  searchWebArgsSchema,
};
export type { WebScoutTool };

export const webScoutTools: WebScoutTool[] = [
  {
    definition: {
      name: 'searchWeb',
      description:
        'Search the web for resources. Returns a JSON array of { url, title, snippet, score, publishedDate? }.',
      schema: searchWebArgsSchema,
    },
    execute: searchWebTool,
  },
  {
    definition: {
      name: 'checkVaultDuplicate',
      description:
        "Check URLs against the vault and past proposals. Returns { newUrls, existingUrls, previouslyProposed }.",
      schema: checkVaultDuplicateArgsSchema,
    },
    execute: checkVaultDuplicateTool,
  },
  {
    definition: {
      name: 'evaluateResult',
      description:
        'Score a web result for relevance to the goal. Returns { relevanceScore, contentType, topics, reasoning }.',
      schema: evaluateResultArgsSchema,
    },
    execute: evaluateResultTool,
  },
  {
    definition: {
      name: 'refineQuery',
      description:
        'Modify a search query based on feedback about what is missing from current results.',
      schema: refineQueryArgsSchema,
    },
    execute: refineQueryTool,
  },
];

const webScoutToolsByName = new Map<string, WebScoutTool>(
  webScoutTools.map((tool) => [tool.definition.name, tool]),
);

export const webScoutToolDefinitions = webScoutTools.map((tool) => tool.definition);

export function getWebScoutTool(name: string): WebScoutTool | undefined {
  return webScoutToolsByName.get(name);
}

import { createHash } from 'node:crypto';
import type { EasyInputMessage } from 'openai/resources/responses/responses';
import type { AITaskType } from '@/server/ai/tasks';

export interface PromptSection {
  content: string;
  heading: string;
}

export interface BuiltPrompt {
  input: string | EasyInputMessage[];
  instructions: string;
  promptCacheKey: string;
  requestPayload: string;
  stablePrefix: string;
}

interface BuildPromptOptions {
  inputMessages?: EasyInputMessage[];
  requestPayload?: PromptSection[];
  sharedContext?: PromptSection[];
  systemInstructions: PromptSection[];
  task: AITaskType;
}

function renderSection(section: PromptSection): string {
  return `${section.heading}\n${section.content.trim()}`;
}

function renderSections(sections: PromptSection[] | undefined): string {
  if (!sections || sections.length === 0) {
    return '';
  }

  return sections
    .map(renderSection)
    .filter((section) => section.trim().length > 0)
    .join('\n\n')
    .trim();
}

function buildPromptCacheKey(task: AITaskType, stablePrefix: string): string {
  const hash = createHash('sha256').update(stablePrefix).digest('hex').slice(0, 16);
  return `ai:${task}:${hash}`;
}

export function buildPrompt(options: BuildPromptOptions): BuiltPrompt {
  const stableSections = [
    ...options.systemInstructions,
    ...(options.sharedContext ?? []),
  ];
  const stablePrefix = renderSections(stableSections);
  const requestPayload = renderSections(options.requestPayload);

  return {
    instructions: stablePrefix,
    input: options.inputMessages ?? requestPayload,
    promptCacheKey: buildPromptCacheKey(options.task, stablePrefix),
    requestPayload,
    stablePrefix,
  };
}

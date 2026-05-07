import { AI_BUDGETS } from '@/server/ai/budget-policy';
import { openAIExecutionService } from '@/server/ai/openai-execution-service';
import { buildPrompt } from '@/server/ai/prompt-builder';
import { AI_TASKS } from '@/server/ai/tasks';
import { CategorizationSchema, TagExtractionSchema } from '@/server/langchain/schemas/tags.schema';

const STOP_TAGS = new Set([
  'introduction',
  'overview',
  'guide',
  'article',
  'notes',
  'note',
  'example',
  'examples',
  'basics',
  'concepts',
  'summary',
  'summaries',
  'tutorial',
  'how to',
]);

function truncateForPrompt(text: string, maxChars: number): string {
  if (text.length <= maxChars) {
    return text;
  }

  return `${text.slice(0, maxChars)}\n\n[TRUNCATED: original_length=${text.length}]`;
}

function normalizeTag(tag: string): string | null {
  const normalized = tag
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) {
    return null;
  }

  if (normalized.length < 3 || normalized.length > 40) {
    return null;
  }

  if (STOP_TAGS.has(normalized)) {
    return null;
  }

  const wordCount = normalized.split(' ').filter(Boolean).length;
  if (wordCount < 1 || wordCount > 3) {
    return null;
  }

  return normalized;
}

function finalizeTags(candidates: string[], maxFinal: number): string[] {
  const tags: string[] = [];
  const seen = new Set<string>();

  for (const candidate of candidates) {
    const normalized = normalizeTag(candidate);
    if (!normalized) {
      continue;
    }
    if (seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    tags.push(normalized);
    if (tags.length >= maxFinal) {
      break;
    }
  }

  return tags;
}

export async function extractTags(content: string): Promise<string[]> {
  const docForPrompt = truncateForPrompt(content, 12_000);
  try {
    const prompt = buildPrompt({
      task: AI_TASKS.tagDocument,
      systemInstructions: [
        {
          heading: 'Role',
          content: 'You extract stable topic tags from a document for a personal knowledge vault.',
        },
        {
          heading: 'Rules',
          content: [
            'Maximum 10 tags.',
            'Each tag must be lowercase, 1-3 words, and a noun or noun phrase.',
            'No punctuation, explanations, or duplicates.',
            'Do not return generic words like introduction, overview, guide, article, notes, example, basics, concepts.',
            'Prefer concrete, commonly used terms.',
          ].join('\n'),
        },
      ],
      sharedContext: [
        {
          heading: 'Examples',
          content: [
            'Good: spaced repetition, retrieval practice, learning science, distributed systems.',
            'Bad: how to learn better, interesting ideas, modern technology.',
          ].join('\n'),
        },
      ],
      requestPayload: [
        {
          heading: 'Document',
          content: docForPrompt,
        },
      ],
    });
    const response = await openAIExecutionService.executeStructured({
      task: AI_TASKS.tagDocument,
      prompt,
      schema: TagExtractionSchema,
      schemaName: 'document_tag_extraction',
      budget: AI_BUDGETS.tagDocument,
    });
    return finalizeTags(response.output.tags, 8);
  } catch {
    return [];
  }
}

export async function categorize(tags: string[]): Promise<string> {
  if (!tags.length) {
    return 'other';
  }

  try {
    const prompt = buildPrompt({
      task: AI_TASKS.classifyDocument,
      systemInstructions: [
        {
          heading: 'Role',
          content: 'Choose exactly one category for the provided document tags.',
        },
        {
          heading: 'Allowed Categories',
          content: 'learning, software engineering, ai systems, finance, productivity, other',
        },
      ],
      requestPayload: [
        {
          heading: 'Tags',
          content: tags.join(', '),
        },
      ],
    });
    const response = await openAIExecutionService.executeStructured({
      task: AI_TASKS.classifyDocument,
      prompt,
      schema: CategorizationSchema,
      schemaName: 'document_category_selection',
      budget: AI_BUDGETS.categorizeDocument,
    });
    return response.output.category;
  } catch {
    return 'other';
  }
}

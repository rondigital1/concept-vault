import { sql } from '@/db';
import type { WorkspaceScope } from '@/server/auth/workspaceContext';
import { openAIExecutionService } from '@/server/ai/openai-execution-service';
import { buildPrompt } from '@/server/ai/prompt-builder';
import { AI_TASKS } from '@/server/ai/tasks';
import { z } from 'zod';

type TodaySourceDocument = {
  id: string;
  title: string;
  content: string;
  tags: string[];
};

export type GeneratedTodayContent = {
  keyIdeas: string[];
  interestingFacts: Array<{ fact: string; source?: string }>;
  randomFact: { fact: string; source?: string } | null;
};

const TodayContentSchema = z.object({
  keyIdeas: z.array(z.string().min(1)).min(1).max(5),
  interestingFacts: z.array(
    z.object({
      fact: z.string().min(1),
      sourceTitle: z.string().min(1),
    }),
  ).max(4),
  randomFact: z.object({
    fact: z.string().min(1),
    sourceTitle: z.string().min(1),
  }).nullable(),
});

export async function getSourceDocsForToday(
  scope: WorkspaceScope,
  topTags: Array<{ tag: string; count: number }>,
): Promise<TodaySourceDocument[]> {
  if (topTags.length === 0) {
    return [];
  }

  const primaryTags = topTags.slice(0, 2).map((tag) => tag.tag);
  const docs = await sql<TodaySourceDocument[]>`
    SELECT id, title, content, tags
    FROM documents
    WHERE workspace_id = ${scope.workspaceId}
      AND tags && ${sql.array(primaryTags)}
    ORDER BY imported_at DESC
    LIMIT 2
  `;

  return docs.map((doc) => ({
    id: doc.id,
    title: doc.title,
    content: doc.content.slice(0, 1200),
    tags: doc.tags,
  }));
}

export async function generateTodayContent(sourceDocs: TodaySourceDocument[]): Promise<GeneratedTodayContent> {
  if (sourceDocs.length === 0) {
    return {
      keyIdeas: [],
      interestingFacts: [],
      randomFact: null,
    };
  }

  const docsText = sourceDocs
    .map((doc, index) => `[Document ${index + 1}: "${doc.title}"]\n${doc.content}`)
    .join('\n\n---\n\n');
  const validTitles = sourceDocs.map((doc) => doc.title);

  try {
    const prompt = buildPrompt({
      task: AI_TASKS.extractStructuredMetadata,
      systemInstructions: [
        {
          heading: 'Role',
          content: "You extract grounded insights from the user's knowledge base.",
        },
        {
          heading: 'Strict Rules',
          content: [
            'Use only the provided documents.',
            'Do not invent facts or sources.',
            'Every fact must be directly supported by the source text.',
            'sourceTitle must exactly match one of the provided titles.',
          ].join('\n'),
        },
      ],
      sharedContext: [
        {
          heading: 'Required Output',
          content: [
            'keyIdeas: 3-5 concise actionable insights.',
            'interestingFacts: up to 4 notable facts with exact source titles.',
            'randomFact: one optional fact with exact source title.',
          ].join('\n'),
        },
      ],
      requestPayload: [
        {
          heading: 'Documents',
          content: docsText,
        },
      ],
    });
    const response = await openAIExecutionService.executeStructured({
      task: AI_TASKS.extractStructuredMetadata,
      prompt,
      schema: TodayContentSchema,
      schemaName: 'today_content',
    });

    const keyIdeas = response.output.keyIdeas.slice(0, 5);
    const interestingFacts = response.output.interestingFacts
      .filter((fact) => validTitles.includes(fact.sourceTitle))
      .slice(0, 4)
      .map((fact) => ({ fact: fact.fact, source: fact.sourceTitle }));
    const randomFact =
      response.output.randomFact && validTitles.includes(response.output.randomFact.sourceTitle)
        ? { fact: response.output.randomFact.fact, source: response.output.randomFact.sourceTitle }
        : null;

    return {
      keyIdeas,
      interestingFacts,
      randomFact,
    };
  } catch (error) {
    console.error('[TodayService] LLM call failed:', error);
    return {
      keyIdeas: [],
      interestingFacts: [],
      randomFact: null,
    };
  }
}

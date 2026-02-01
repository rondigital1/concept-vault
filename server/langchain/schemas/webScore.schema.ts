/**
 * Zod schemas for web result scoring with LangChain structured output.
 */
import { z } from 'zod';

export const ContentTypeSchema = z.enum([
  'article',
  'documentation',
  'paper',
  'tutorial',
  'video',
  'other',
]);

export const ScoredResultSchema = z.object({
  index: z.number().describe('Index of the result being scored'),
  relevanceScore: z
    .number()
    .min(0)
    .max(1)
    .describe('Relevance score from 0.0 (irrelevant) to 1.0 (highly relevant)'),
  relevanceReason: z
    .string()
    .max(300)
    .describe('Brief explanation of why this result is relevant'),
  contentType: ContentTypeSchema.describe('Classification of the content type'),
  topics: z
    .array(z.string())
    .max(5)
    .describe('Topic tags extracted from this result'),
});

export const WebScoreResultsSchema = z.object({
  scores: z
    .array(ScoredResultSchema)
    .describe('Scored and filtered search results'),
});

export const DerivedQuerySchema = z.object({
  query: z
    .string()
    .max(200)
    .describe('Search query string'),
  intent: z
    .string()
    .max(300)
    .describe('Brief explanation of what this query aims to find'),
  priority: z
    .number()
    .min(1)
    .max(5)
    .describe('Priority ranking (1 is highest, 5 is lowest)'),
});

export const DerivedQueriesSchema = z.object({
  queries: z
    .array(DerivedQuerySchema)
    .min(1)
    .max(5)
    .describe('Search queries derived from vault documents'),
});

export type ContentType = z.infer<typeof ContentTypeSchema>;
export type ScoredResult = z.infer<typeof ScoredResultSchema>;
export type WebScoreResults = z.infer<typeof WebScoreResultsSchema>;
export type DerivedQuery = z.infer<typeof DerivedQuerySchema>;
export type DerivedQueries = z.infer<typeof DerivedQueriesSchema>;

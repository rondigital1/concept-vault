/**
 * Zod schemas for tag extraction with LangChain structured output.
 */
import { z } from 'zod';

export const TagExtractionSchema = z.object({
  tags: z
    .array(
      z
        .string()
        .min(3)
        .max(40)
        .describe('Lowercase tag, 1-3 words, no punctuation')
    )
    .max(10)
    .describe('Topic tags extracted from the document'),
});

export const CategorySchema = z.enum([
  'learning',
  'software engineering',
  'ai systems',
  'finance',
  'productivity',
  'other',
]);

export const CategorizationSchema = z.object({
  category: CategorySchema.describe('Single category for the document'),
});

export type TagExtraction = z.infer<typeof TagExtractionSchema>;
export type Category = z.infer<typeof CategorySchema>;
export type Categorization = z.infer<typeof CategorizationSchema>;

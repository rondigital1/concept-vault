/**
 * Zod schemas for flashcard generation with LangChain structured output.
 */
import { z } from 'zod';

export const FlashcardFormatSchema = z.enum(['qa', 'cloze']);

export const GeneratedFlashcardSchema = z.object({
  format: FlashcardFormatSchema.describe(
    'qa for question/answer, cloze for fill-in-the-blank with {{deletions}}'
  ),
  front: z
    .string()
    .max(1000)
    .describe('Question or cloze statement with {{deletions}}'),
  back: z
    .string()
    .max(2000)
    .describe('Answer or complete statement'),
  conceptLabel: z
    .string()
    .optional()
    .describe('Label of the concept this flashcard tests'),
});

export const FlashcardGenerationSchema = z.object({
  flashcards: z
    .array(GeneratedFlashcardSchema)
    .min(1)
    .max(10)
    .describe('Generated flashcards for spaced repetition learning'),
});

export type FlashcardFormat = z.infer<typeof FlashcardFormatSchema>;
export type GeneratedFlashcard = z.infer<typeof GeneratedFlashcardSchema>;
export type FlashcardGeneration = z.infer<typeof FlashcardGenerationSchema>;

import { describe, expect, it } from 'vitest';
import { ConceptExtractionSchema } from '@/server/langchain/schemas/concept.schema';
import { FlashcardGenerationSchema } from '@/server/langchain/schemas/flashcard.schema';

describe('distiller structured-output schemas', () => {
  it('uses required nullable fields for OpenAI structured output compatibility', () => {
    expect(
      ConceptExtractionSchema.safeParse({
        concepts: [
          {
            label: 'Retrieval practice',
            type: 'principle',
            summary: 'Recall strengthens memory more than passive review.',
            evidence: [
              {
                quote: 'Retrieval practice improves learning.',
                location: null,
              },
            ],
          },
        ],
      }).success,
    ).toBe(true);

    expect(
      FlashcardGenerationSchema.safeParse({
        flashcards: [
          {
            format: 'qa',
            front: 'What improves learning?',
            back: 'Retrieval practice.',
            conceptLabel: null,
          },
        ],
      }).success,
    ).toBe(true);
  });

  it('rejects omitted fields that the Responses API expects to be required', () => {
    expect(
      ConceptExtractionSchema.safeParse({
        concepts: [
          {
            label: 'Retrieval practice',
            type: 'principle',
            summary: 'Recall strengthens memory more than passive review.',
            evidence: [{ quote: 'Retrieval practice improves learning.' }],
          },
        ],
      }).success,
    ).toBe(false);

    expect(
      FlashcardGenerationSchema.safeParse({
        flashcards: [
          {
            format: 'qa',
            front: 'What improves learning?',
            back: 'Retrieval practice.',
          },
        ],
      }).success,
    ).toBe(false);
  });
});

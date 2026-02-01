/**
 * Zod schemas for concept extraction with LangChain structured output.
 */
import { z } from 'zod';

export const EvidenceSchema = z.object({
  quote: z.string().describe('Exact quote from the document'),
  location: z
    .object({
      startChar: z.number().optional(),
      endChar: z.number().optional(),
    })
    .optional()
    .describe('Character location in original document'),
});

export const ConceptTypeSchema = z.enum([
  'definition',
  'principle',
  'framework',
  'procedure',
  'fact',
]);

export const ExtractedConceptSchema = z.object({
  label: z
    .string()
    .max(100)
    .describe('Short name for the concept (2-5 words)'),
  type: ConceptTypeSchema.describe('Category of the concept'),
  summary: z
    .string()
    .max(500)
    .describe('1-2 sentence explanation'),
  evidence: z
    .array(EvidenceSchema)
    .max(3)
    .describe('Direct quotes from text supporting this concept'),
});

export const ConceptExtractionSchema = z.object({
  concepts: z
    .array(ExtractedConceptSchema)
    .min(1)
    .max(5)
    .describe('Key concepts extracted from the document'),
});

export type Evidence = z.infer<typeof EvidenceSchema>;
export type ConceptType = z.infer<typeof ConceptTypeSchema>;
export type ExtractedConcept = z.infer<typeof ExtractedConceptSchema>;
export type ConceptExtraction = z.infer<typeof ConceptExtractionSchema>;

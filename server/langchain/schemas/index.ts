/**
 * Schema exports for LangChain structured output.
 */

// Concept extraction schemas
export {
  EvidenceSchema,
  ConceptTypeSchema,
  ExtractedConceptSchema,
  ConceptExtractionSchema,
} from './concept.schema';
export type {
  Evidence,
  ConceptType,
  ExtractedConcept,
  ConceptExtraction,
} from './concept.schema';

// Flashcard generation schemas
export {
  FlashcardFormatSchema,
  GeneratedFlashcardSchema,
  FlashcardGenerationSchema,
} from './flashcard.schema';
export type {
  FlashcardFormat,
  GeneratedFlashcard,
  FlashcardGeneration,
} from './flashcard.schema';

// Tag extraction schemas
export {
  TagExtractionSchema,
  CategorizationSchema,
} from './tags.schema';

// Web scoring schemas
export {
  ContentTypeSchema,
  ScoredResultSchema,
  WebScoreResultsSchema,
  DerivedQuerySchema,
  DerivedQueriesSchema,
} from './webScore.schema';
export type {
  ContentType,
  ScoredResult,
  WebScoreResults,
  DerivedQuery,
  DerivedQueries,
} from './webScore.schema';

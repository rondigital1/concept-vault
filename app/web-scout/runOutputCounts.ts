import type { RunResultsPayload } from './types';

export type RunOutputCounts = {
  sourceCount: number;
  conceptCount: number;
  flashcardCount: number;
  generatedCount: number;
  pendingReviewCount: number;
};

export function getRunOutputCounts(results: RunResultsPayload | null): RunOutputCounts {
  const reportCount = results?.report ? 1 : 0;
  const sourceCount = results?.sources.length ?? 0;
  const conceptCount = results?.concepts.length ?? 0;
  const flashcardCount = results?.flashcards.length ?? 0;

  return {
    sourceCount,
    conceptCount,
    flashcardCount,
    generatedCount: reportCount + sourceCount + conceptCount + flashcardCount,
    pendingReviewCount: sourceCount + conceptCount + flashcardCount,
  };
}

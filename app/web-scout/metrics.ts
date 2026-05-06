import type { RunTracePayload } from '@/lib/runApiClient';
import type { Metric } from './types';

function isWebScoutCounts(value: unknown): value is {
  iterations: number;
  queriesExecuted: number;
  resultsEvaluated: number;
  proposalsCreated: number;
} {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const v = value as Record<string, unknown>;
  return (
    typeof v.iterations === 'number' &&
    typeof v.queriesExecuted === 'number' &&
    typeof v.resultsEvaluated === 'number' &&
    typeof v.proposalsCreated === 'number'
  );
}

function isPipelineCounts(value: unknown): value is {
  docsTargeted: number;
  docsCurated: number;
  webProposals: number;
  analyzedEvidence: number;
  flashcardsProposed: number;
} {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const v = value as Record<string, unknown>;
  return (
    typeof v.docsTargeted === 'number' &&
    typeof v.docsCurated === 'number' &&
    typeof v.webProposals === 'number' &&
    typeof v.flashcardsProposed === 'number'
  );
}

export function extractMetricsFromCounts(counts: Record<string, number> | null): Metric[] {
  if (!counts) {
    return [];
  }

  if (
    typeof counts.iterations === 'number' &&
    typeof counts.queriesExecuted === 'number' &&
    typeof counts.resultsEvaluated === 'number' &&
    typeof counts.proposalsCreated === 'number'
  ) {
    return [
      { label: 'Iterations', value: counts.iterations },
      { label: 'Queries', value: counts.queriesExecuted },
      { label: 'Evaluated', value: counts.resultsEvaluated },
      { label: 'Proposals', value: counts.proposalsCreated },
    ];
  }

  if (
    typeof counts.docsTargeted === 'number' &&
    typeof counts.docsCurated === 'number' &&
    typeof counts.webProposals === 'number' &&
    typeof counts.flashcardsProposed === 'number'
  ) {
    return [
      { label: 'Docs Targeted', value: counts.docsTargeted },
      { label: 'Docs Curated', value: counts.docsCurated },
      { label: 'Web Proposals', value: counts.webProposals },
      { label: 'Evidence', value: counts.analyzedEvidence ?? 0 },
      { label: 'Flashcards', value: counts.flashcardsProposed },
    ];
  }

  return [];
}

export function extractMetricsFromTrace(trace: RunTracePayload | null): Metric[] {
  if (!trace) {
    return [];
  }

  for (let i = trace.steps.length - 1; i >= 0; i -= 1) {
    const output = trace.steps[i]?.output;
    if (!output || typeof output !== 'object') {
      continue;
    }

    const outputRecord = output as Record<string, unknown>;
    const nestedCounts = outputRecord.counts;

    if (isWebScoutCounts(nestedCounts)) {
      return [
        { label: 'Iterations', value: nestedCounts.iterations },
        { label: 'Queries', value: nestedCounts.queriesExecuted },
        { label: 'Evaluated', value: nestedCounts.resultsEvaluated },
        { label: 'Proposals', value: nestedCounts.proposalsCreated },
      ];
    }

    if (isPipelineCounts(nestedCounts)) {
      return [
        { label: 'Docs Targeted', value: nestedCounts.docsTargeted },
        { label: 'Docs Curated', value: nestedCounts.docsCurated },
        { label: 'Web Proposals', value: nestedCounts.webProposals },
        { label: 'Evidence', value: nestedCounts.analyzedEvidence },
        { label: 'Flashcards', value: nestedCounts.flashcardsProposed },
      ];
    }

    if (isWebScoutCounts(outputRecord)) {
      return [
        { label: 'Iterations', value: outputRecord.iterations },
        { label: 'Queries', value: outputRecord.queriesExecuted },
        { label: 'Evaluated', value: outputRecord.resultsEvaluated },
        { label: 'Proposals', value: outputRecord.proposalsCreated },
      ];
    }

    if (isPipelineCounts(outputRecord)) {
      return [
        { label: 'Docs Targeted', value: outputRecord.docsTargeted },
        { label: 'Docs Curated', value: outputRecord.docsCurated },
        { label: 'Web Proposals', value: outputRecord.webProposals },
        { label: 'Evidence', value: outputRecord.analyzedEvidence },
        { label: 'Flashcards', value: outputRecord.flashcardsProposed },
      ];
    }
  }

  return [];
}

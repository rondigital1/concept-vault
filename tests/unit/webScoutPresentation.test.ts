import { describe, expect, it } from 'vitest';
import {
  getBatchRunCounts,
  getBatchSummaryText,
} from '@/app/web-scout/batchPresentation';
import { getRunOutputCounts } from '@/app/web-scout/runOutputCounts';
import type {
  BatchFindSourcesResult,
  BatchTopicOption,
  RunResultsPayload,
} from '@/app/web-scout/types';

const batchTopics: BatchTopicOption[] = [
  {
    id: 'topic-1',
    name: 'Model evals',
    goal: 'Track useful evaluation material',
    focusTags: ['evals'],
    linkedDocumentCount: 1,
  },
  {
    id: 'topic-2',
    name: 'Inference costs',
    goal: 'Watch cost-control tactics',
    focusTags: [],
    linkedDocumentCount: 2,
  },
];

function makeBatchResult(
  overrides: Partial<BatchFindSourcesResult> = {},
): BatchFindSourcesResult {
  return {
    mode: 'batch',
    scope: 'all_topics',
    day: '2026-05-06',
    counts: {
      topicsEligible: 2,
      topicsProcessed: 2,
      topicsSucceeded: 1,
      topicsFailed: 1,
      webProposals: 3,
    },
    runs: [],
    ...overrides,
  };
}

function makeRunResults(overrides: Partial<RunResultsPayload> = {}): RunResultsPayload {
  return {
    runId: 'run-1',
    status: 'ok',
    mode: 'full_report',
    counts: null,
    errors: [],
    report: null,
    concepts: [],
    sources: [],
    flashcards: [],
    ...overrides,
  };
}

describe('WebScout presentation helpers', () => {
  it('counts non-batch outputs without reading rendering state', () => {
    expect(getRunOutputCounts(null)).toEqual({
      sourceCount: 0,
      conceptCount: 0,
      flashcardCount: 0,
      generatedCount: 0,
      pendingReviewCount: 0,
    });

    const counts = getRunOutputCounts(
      makeRunResults({
        report: {
          id: 'report-1',
          title: 'Report',
          day: '2026-05-06',
          sourcesCount: 2,
          topicsCovered: [],
          preview: null,
          link: '/reports/report-1',
          notionPageId: null,
        },
        sources: [
          {
            id: 'source-1',
            title: 'Source',
            url: null,
            summary: null,
            relevanceScore: null,
            contentType: null,
            topics: [],
          },
        ],
        concepts: [
          {
            id: 'concept-1',
            title: 'Concept',
            type: null,
            summary: null,
            documentTitle: null,
          },
        ],
        flashcards: [
          {
            id: 'flashcard-1',
            title: 'Flashcard',
            format: null,
            front: null,
            back: null,
            documentTitle: null,
          },
        ],
      }),
    );

    expect(counts).toEqual({
      sourceCount: 1,
      conceptCount: 1,
      flashcardCount: 1,
      generatedCount: 4,
      pendingReviewCount: 3,
    });
  });

  it('counts batch results from the completed result when available', () => {
    expect(getBatchRunCounts(batchTopics, null)).toEqual({
      topicsEligible: 2,
      topicsProcessed: 0,
      topicsFailed: 0,
      webProposalCount: 0,
    });

    expect(getBatchRunCounts(batchTopics, makeBatchResult())).toEqual({
      topicsEligible: 2,
      topicsProcessed: 2,
      topicsFailed: 1,
      webProposalCount: 3,
    });
  });

  it('keeps batch summary text aligned with the visible run states', () => {
    expect(getBatchSummaryText({
      batchTopicsError: null,
      error: null,
      isStarting: false,
      batchResult: null,
      requestedMaxTopics: 10,
    })).toEqual({
      headline: 'Ready to run all eligible topics',
      description: 'This mode runs Find Sources once per active topic with fewer than the report-ready threshold of linked documents.',
    });

    expect(getBatchSummaryText({
      batchTopicsError: null,
      error: null,
      isStarting: true,
      batchResult: null,
      requestedMaxTopics: 5,
    })).toEqual({
      headline: 'Find Sources batch in progress',
      description: 'Running Find Sources across up to 5 active topics that still need more material.',
    });

    expect(getBatchSummaryText({
      batchTopicsError: null,
      error: null,
      isStarting: false,
      batchResult: makeBatchResult({
        counts: {
          topicsEligible: 2,
          topicsProcessed: 2,
          topicsSucceeded: 1,
          topicsFailed: 1,
          webProposals: 1,
        },
      }),
      requestedMaxTopics: 10,
    })).toEqual({
      headline: 'Batch finished with issues',
      description: 'Processed 2 of 2 eligible topics and proposed 1 source candidate.',
    });
  });

  it('preserves batch topic loading errors as the summary description', () => {
    expect(getBatchSummaryText({
      batchTopicsError: 'Could not load topics',
      error: 'Run failed to start',
      isStarting: false,
      batchResult: null,
      requestedMaxTopics: 10,
    })).toEqual({
      headline: 'Batch could not start',
      description: 'Could not load topics',
    });
  });
});

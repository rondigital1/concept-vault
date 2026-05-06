import type { BatchFindSourcesResult, BatchTopicOption } from './types';

export type BatchRunCounts = {
  topicsEligible: number;
  topicsProcessed: number;
  topicsFailed: number;
  webProposalCount: number;
};

export type BatchSummaryText = {
  headline: string;
  description: string;
};

export function getBatchRunCounts(
  batchTopicOptions: BatchTopicOption[],
  batchResult: BatchFindSourcesResult | null,
): BatchRunCounts {
  return {
    topicsEligible: batchResult?.counts.topicsEligible ?? batchTopicOptions.length,
    topicsProcessed: batchResult?.counts.topicsProcessed ?? 0,
    topicsFailed: batchResult?.counts.topicsFailed ?? 0,
    webProposalCount: batchResult?.counts.webProposals ?? 0,
  };
}

export function getBatchSummaryText({
  batchTopicsError,
  error,
  isStarting,
  batchResult,
  requestedMaxTopics,
}: {
  batchTopicsError: string | null;
  error: string | null;
  isStarting: boolean;
  batchResult: BatchFindSourcesResult | null;
  requestedMaxTopics: number;
}): BatchSummaryText {
  let headline = 'Ready to run all eligible topics';
  let description = 'This mode runs Find Sources once per active topic with fewer than the report-ready threshold of linked documents.';

  if (error) {
    headline = 'Batch could not start';
  } else if (isStarting) {
    headline = 'Find Sources batch in progress';
  } else if (batchResult) {
    if (batchResult.counts.topicsProcessed === 0) {
      headline = 'No eligible topics';
    } else if (batchResult.counts.topicsFailed > 0) {
      headline = 'Batch finished with issues';
    } else {
      headline = 'Batch finished';
    }
  }

  if (batchTopicsError) {
    description = batchTopicsError;
  } else if (error) {
    description = error;
  } else if (isStarting) {
    description = `Running Find Sources across up to ${requestedMaxTopics} active topics that still need more material.`;
  } else if (batchResult) {
    if (batchResult.counts.topicsProcessed === 0) {
      description = 'No active topics currently need more sources before they are report-ready.';
    } else {
      description = `Processed ${batchResult.counts.topicsProcessed} of ${batchResult.counts.topicsEligible} eligible topics and proposed ${batchResult.counts.webProposals} source candidate${batchResult.counts.webProposals === 1 ? '' : 's'}.`;
    }
  }

  return {
    headline,
    description,
  };
}

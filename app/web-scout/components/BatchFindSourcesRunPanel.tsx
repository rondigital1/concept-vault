import { getBatchRunCounts, getBatchSummaryText } from '../batchPresentation';
import { todayISODate } from '../formatting';
import type { BatchFindSourcesResult, BatchTopicOption, QueryParamReader } from '../types';
import { BatchOutcomesPanel } from './BatchOutcomesPanel';
import { BatchScopePanel } from './BatchScopePanel';
import { BatchSummaryPanel } from './BatchSummaryPanel';
import { BatchTechnicalDetails } from './BatchTechnicalDetails';

export function BatchFindSourcesRunPanel({
  batchTopicOptions,
  batchTopicsError,
  batchResult,
  batchVisibleIssueMessages,
  requestedMaxTopics,
  minimumLinkedDocumentsForReport,
  currentStatus,
  runModeLabel,
  isStarting,
  error,
  researchHref,
  reviewQueueHref,
  searchParams,
  onStartRun,
}: {
  batchTopicOptions: BatchTopicOption[];
  batchTopicsError: string | null;
  batchResult: BatchFindSourcesResult | null;
  batchVisibleIssueMessages: string[];
  requestedMaxTopics: number;
  minimumLinkedDocumentsForReport: number;
  currentStatus: string;
  runModeLabel: string;
  isStarting: boolean;
  error: string | null;
  researchHref: string;
  reviewQueueHref: string;
  searchParams: QueryParamReader;
  onStartRun: () => void;
}) {
  const counts = getBatchRunCounts(batchTopicOptions, batchResult);
  const summaryText = getBatchSummaryText({
    batchTopicsError,
    error,
    isStarting,
    batchResult,
    requestedMaxTopics,
  });
  const day = batchResult?.day ?? (searchParams.get('day') ?? todayISODate());

  return (
    <section className="space-y-6">
      <BatchScopePanel
        batchTopicOptions={batchTopicOptions}
        batchTopicsError={batchTopicsError}
        requestedMaxTopics={requestedMaxTopics}
        minimumLinkedDocumentsForReport={minimumLinkedDocumentsForReport}
      />

      <BatchSummaryPanel
        currentStatus={currentStatus}
        runModeLabel={runModeLabel}
        summaryText={summaryText}
        isStarting={isStarting}
        webProposalCount={counts.webProposalCount}
        researchHref={researchHref}
        reviewQueueHref={reviewQueueHref}
        issueMessages={batchVisibleIssueMessages}
        onStartRun={onStartRun}
      />

      <BatchOutcomesPanel
        batchResult={batchResult}
        counts={counts}
        isStarting={isStarting}
      />

      <BatchTechnicalDetails
        currentStatus={currentStatus}
        counts={counts}
        requestedMaxTopics={requestedMaxTopics}
        day={day}
        issueMessages={batchVisibleIssueMessages}
        batchResult={batchResult}
      />
    </section>
  );
}

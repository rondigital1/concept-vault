'use client';

import { useMemo } from 'react';
import { formatElapsedTime } from '@/app/components/workflowFormatting';
import { summarizeStageProgress } from '@/lib/agentRunPresentation';
import {
  formatRunModeLabel,
  parseNumberParam,
} from './formatting';
import {
  extractMetricsFromCounts,
  extractMetricsFromTrace,
} from './metrics';
import { BatchFindSourcesRunPanel } from './components/BatchFindSourcesRunPanel';
import { RunOutputsPanel } from './components/RunOutputsPanel';
import { RunSummaryPanel } from './components/RunSummaryPanel';
import { RunTechnicalDetails } from './components/RunTechnicalDetails';
import { TopicSelectionPanel } from './components/TopicSelectionPanel';
import { VaultWideFindSourcesOption } from './components/VaultWideFindSourcesOption';
import { useWebScoutRun } from './hooks/useWebScoutRun';
import { getRunOutputCounts } from './runOutputCounts';
import type { WebScoutRunClientProps } from './types';

export function WebScoutRunClient({
  isBatchFindSources,
  batchTopicOptions,
  batchTopicsError,
  requiresTopicSelection,
  reportTopicOptions,
  reportTopicsError,
  selectedTopicName,
  minimumLinkedDocumentsForReport,
}: WebScoutRunClientProps) {
  const isAwaitingTopicSelection = requiresTopicSelection;
  const {
    searchParams,
    runId,
    trace,
    results,
    batchResult,
    isStarting,
    error,
    resultsError,
    startRun,
  } = useWebScoutRun({
    isBatchFindSources,
    requiresTopicSelection: isAwaitingTopicSelection,
  });

  const requestedMaxTopics = parseNumberParam(searchParams.get('maxTopics')) ?? 10;
  const selectedTopicId = searchParams.get('topicId');
  const researchHref = selectedTopicId ? `/today?topicId=${selectedTopicId}` : '/today';
  const reviewQueueHref = selectedTopicId
    ? `/today?topicId=${selectedTopicId}&queue=pending`
    : '/today?queue=pending';
  const isVaultWideFindSources =
    !isBatchFindSources &&
    (searchParams.get('runMode') ?? '') === 'scout_only' &&
    !searchParams.get('topicId');
  const isRunning = isBatchFindSources ? isStarting : trace?.status === 'running' || (!!runId && !trace);
  const runModeLabel = formatRunModeLabel(searchParams.get('runMode') ?? results?.mode ?? 'full_report');
  const currentStatus = isBatchFindSources
    ? isStarting
      ? 'running'
      : error
        ? 'error'
        : batchResult
          ? batchResult.counts.topicsFailed > 0
            ? 'partial'
            : 'ok'
          : 'pending'
    : isAwaitingTopicSelection
      ? 'pending'
      : trace?.status ?? (runId ? 'running' : 'pending');

  const stageProgress = useMemo(
    () => summarizeStageProgress(trace?.steps ?? []),
    [trace],
  );

  const metrics = useMemo(() => {
    const fromResults = extractMetricsFromCounts(results?.counts ?? null);
    if (fromResults.length > 0) {
      return fromResults;
    }

    return extractMetricsFromTrace(trace);
  }, [results, trace]);

  const outputCounts = getRunOutputCounts(results);
  const currentStageLabel = stageProgress.find((stage) => stage.status === 'running')?.label ?? null;
  const runDuration = trace?.startedAt
    ? formatElapsedTime(trace.startedAt, trace.completedAt)
    : runId
      ? 'In progress'
      : '—';

  const visibleIssueMessages = [
    ...(error ? [error] : []),
    ...(resultsError ? [resultsError] : []),
    ...(results?.errors ?? []),
  ];

  const batchVisibleIssueMessages = [
    ...(batchTopicsError ? [batchTopicsError] : []),
    ...(error ? [error] : []),
    ...((batchResult?.runs ?? []).flatMap((run) =>
      run.errors.map((entry) => `${run.topicName}: ${entry.message}`),
    )),
  ];

  if (isBatchFindSources) {
    return (
      <BatchFindSourcesRunPanel
        batchTopicOptions={batchTopicOptions}
        batchTopicsError={batchTopicsError}
        batchResult={batchResult}
        batchVisibleIssueMessages={batchVisibleIssueMessages}
        requestedMaxTopics={requestedMaxTopics}
        minimumLinkedDocumentsForReport={minimumLinkedDocumentsForReport}
        currentStatus={currentStatus}
        runModeLabel={runModeLabel}
        isStarting={isStarting}
        error={error}
        researchHref={researchHref}
        reviewQueueHref={reviewQueueHref}
        searchParams={searchParams}
        onStartRun={() => {
          void startRun();
        }}
      />
    );
  }

  return (
    <section className="space-y-6">
      {isAwaitingTopicSelection && (
        <TopicSelectionPanel
          reportTopicOptions={reportTopicOptions}
          reportTopicsError={reportTopicsError}
          minimumLinkedDocumentsForReport={minimumLinkedDocumentsForReport}
        />
      )}

      {isVaultWideFindSources && (
        <VaultWideFindSourcesOption />
      )}

      <RunSummaryPanel
        currentStatus={currentStatus}
        runModeLabel={runModeLabel}
        selectedTopicName={selectedTopicName}
        isAwaitingTopicSelection={isAwaitingTopicSelection}
        isRunning={isRunning}
        isStarting={isStarting}
        error={error}
        resultsError={resultsError}
        results={results}
        outputCounts={outputCounts}
        currentStageLabel={currentStageLabel}
        trace={trace}
        runId={runId}
        runDuration={runDuration}
        researchHref={researchHref}
        reviewQueueHref={reviewQueueHref}
        visibleIssueMessages={visibleIssueMessages}
        onStartRun={() => {
          void startRun();
        }}
      />

      <RunOutputsPanel
        isAwaitingTopicSelection={isAwaitingTopicSelection}
        isRunning={isRunning}
        resultsError={resultsError}
        results={results}
        outputCounts={outputCounts}
      />

      <RunTechnicalDetails
        runId={runId}
        trace={trace}
        runDuration={runDuration}
        stageProgress={stageProgress}
        metrics={metrics}
        visibleIssueMessages={visibleIssueMessages}
      />
    </section>
  );
}

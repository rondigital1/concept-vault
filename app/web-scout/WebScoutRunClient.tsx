'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { StatusBadge } from '@/app/components/StatusBadge';
import { formatClockTime, formatElapsedTime } from '@/app/components/workflowFormatting';
import {
  primaryButtonClass,
  secondaryButtonClass,
  sectionLabelClass,
} from '@/app/today/WorkspaceHeaderPrimitives';
import {
  formatObservedStepLabel,
  summarizeStageProgress,
} from '@/lib/agentRunPresentation';
import {
  formatRunModeLabel,
  formatShortDate,
  parseNumberParam,
  safeStringify,
} from './formatting';
import {
  extractMetricsFromCounts,
  extractMetricsFromTrace,
} from './metrics';
import { useWebScoutRun } from './hooks/useWebScoutRun';
import {
  accentPillClass,
  insetPanelClass,
  issuePanelClass,
  subtlePillClass,
  surfacePanelClass,
} from './styles';
import { BatchFindSourcesRunPanel } from './components/BatchFindSourcesRunPanel';
import { OutcomeCountCard, StageBadge } from './components/RunPrimitives';
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

  const generatedCount =
    (results?.concepts.length ?? 0) +
    (results?.sources.length ?? 0) +
    (results?.flashcards.length ?? 0) +
    (results?.report ? 1 : 0);

  const sourceCount = results?.sources.length ?? 0;
  const conceptCount = results?.concepts.length ?? 0;
  const flashcardCount = results?.flashcards.length ?? 0;
  const pendingReviewCount = sourceCount + conceptCount + flashcardCount;
  const resultsReady = !isAwaitingTopicSelection && !isRunning && !resultsError && Boolean(results);
  const noOutputsCreated = resultsReady && generatedCount === 0;
  const currentStageLabel = stageProgress.find((stage) => stage.status === 'running')?.label ?? null;
  const runDuration = trace?.startedAt
    ? formatElapsedTime(trace.startedAt, trace.completedAt)
    : runId
      ? 'In progress'
      : '—';

  const outcomeHeadline = isAwaitingTopicSelection
    ? 'Choose a topic to begin'
    : error
      ? 'Run could not start'
      : isRunning
        ? `${runModeLabel} in progress`
        : currentStatus === 'error'
          ? 'Run failed'
          : currentStatus === 'partial'
            ? 'Run finished with issues'
            : results?.report
              ? 'Report ready'
              : generatedCount > 0
                ? 'Run finished'
                : 'No new outputs created';

  const outcomeDescription = isAwaitingTopicSelection
    ? 'Pick one topic with enough source material. The run summary and next actions will appear here after it starts.'
    : error
      ? error
      : isRunning
        ? currentStageLabel
          ? `Currently working through ${currentStageLabel.toLowerCase()}. Results and next actions will appear here when the run finishes.`
          : 'The run is still processing. Results and next actions will appear here when it finishes.'
        : resultsError
          ? resultsError
          : results?.report
            ? 'Your report is ready. If the run also generated review items, you can send them through the queue next.'
            : generatedCount > 0
              ? `This run created ${sourceCount} source candidate${sourceCount === 1 ? '' : 's'}, ${conceptCount} concept${conceptCount === 1 ? '' : 's'}, and ${flashcardCount} flashcard${flashcardCount === 1 ? '' : 's'}.`
              : 'The run completed, but it did not create any new sources, concepts, flashcards, or reports.';

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
        <div className={`${surfacePanelClass} p-5`}>
          <div className="flex flex-col gap-3">
            <div>
              <p className={sectionLabelClass}>Choose report topic</p>
              <h2 className="mt-2 text-xl font-semibold text-[color:var(--today-text)]">
                Select an existing topic with enough source material
              </h2>
              <p className="mt-2 text-sm text-[color:var(--today-muted)]">
                Only topics with at least {minimumLinkedDocumentsForReport} linked documents are shown here so the report has enough context to be worth generating.
              </p>
            </div>

            {reportTopicsError && (
              <div className={`${issuePanelClass} text-sm text-[#ffdada]`}>
                {reportTopicsError}
              </div>
            )}

            {!reportTopicsError && reportTopicOptions.length === 0 && (
              <div className={`${insetPanelClass} p-4 text-sm text-[color:var(--today-text-soft)]`}>
                No saved topics are ready to generate yet. Link more documents to a topic from Research, then try again.
              </div>
            )}

            {!reportTopicsError && reportTopicOptions.length > 0 && (
              <form action="/web-scout" method="GET" className="space-y-4">
                <input type="hidden" name="runMode" value="full_report" />
                <div className="space-y-3">
                  {reportTopicOptions.map((topic) => (
                    <label
                      key={topic.id}
                      className={`${insetPanelClass} flex cursor-pointer items-start gap-3 p-4 transition-colors hover:outline-[rgba(255,255,255,0.12)]`}
                    >
                      <input
                        type="radio"
                        name="topicId"
                        value={topic.id}
                        className="mt-1 h-4 w-4 border-[rgba(255,255,255,0.2)] bg-[rgba(0,0,0,0.36)] text-white focus:ring-white/30"
                        defaultChecked={reportTopicOptions[0]?.id === topic.id}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-[color:var(--today-text)]">{topic.name}</p>
                          <span className={accentPillClass}>
                            {topic.linkedDocumentCount} linked docs
                          </span>
                          <span className={subtlePillClass}>
                            Last report: {formatShortDate(topic.lastReportAt)}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-[color:var(--today-text-soft)]">{topic.goal}</p>
                        {topic.focusTags.length > 0 && (
                          <p className="mt-2 text-xs text-[color:var(--today-muted)]">
                            Focus tags: {topic.focusTags.slice(0, 6).join(', ')}
                          </p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>

                <button
                  type="submit"
                  className={primaryButtonClass}
                >
                  Generate Report
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {isVaultWideFindSources && (
        <div className={`${surfacePanelClass} p-5`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className={sectionLabelClass}>Batch option</p>
              <h2 className="mt-2 text-xl font-semibold text-[color:var(--today-text)]">Run Find Sources across all eligible topics</h2>
              <p className="mt-2 text-sm text-[color:var(--today-muted)]">
                Use batch mode when you want one inline scout-only run per active topic that still needs more material before it is report-ready.
              </p>
            </div>
            <Link
              href="/web-scout?runMode=scout_only&scope=all_topics"
              className={secondaryButtonClass}
            >
              All Eligible Topics
            </Link>
          </div>
        </div>
      )}

      <div className={`${surfacePanelClass} p-6`}>
        <p className={sectionLabelClass}>Run summary</p>
        <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={currentStatus} />
              <span className={subtlePillClass}>
                {runModeLabel}
              </span>
              {selectedTopicName && (
                <span className={accentPillClass}>
                  Topic: {selectedTopicName}
                </span>
              )}
            </div>
            <h2 className="mt-4 text-2xl font-semibold text-[color:var(--today-text)]">{outcomeHeadline}</h2>
            <p className="mt-2 text-sm leading-7 text-[color:var(--today-text-soft)]">{outcomeDescription}</p>
            <p className="mt-3 text-xs text-[color:var(--today-muted)]">
              {trace?.startedAt
                ? `Started ${formatClockTime(trace.startedAt, { includeSeconds: true })} · ${runDuration}`
                : isAwaitingTopicSelection
                  ? 'No run has started yet.'
                  : runId
                    ? 'Waiting for run trace...'
                    : 'Ready to start.'}
              {isRunning && currentStageLabel ? ` · Current step: ${currentStageLabel}` : ''}
            </p>
          </div>

          {!isAwaitingTopicSelection && (
            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              {results?.report ? (
                <Link
                  href={results.report.link}
                  className={primaryButtonClass}
                >
                  Open Report
                </Link>
              ) : !isRunning && pendingReviewCount > 0 ? (
                <Link
                  href={reviewQueueHref}
                  className={primaryButtonClass}
                >
                  Review Queue
                </Link>
              ) : null}
              {!isRunning && pendingReviewCount > 0 && results?.report && (
                <Link
                  href={reviewQueueHref}
                  className={secondaryButtonClass}
                >
                  Review Queue
                </Link>
              )}
              <Link
                href={researchHref}
                className={secondaryButtonClass}
              >
                Back to Research
              </Link>
              <button
                type="button"
                onClick={() => {
                  void startRun();
                }}
                disabled={isStarting}
                className={secondaryButtonClass}
              >
                {isStarting ? 'Starting...' : 'Run Again'}
              </button>
            </div>
          )}
        </div>

        {visibleIssueMessages.length > 0 && (
          <div className={`mt-5 ${issuePanelClass}`}>
            <p className={sectionLabelClass}>Run issues</p>
            <p className="mt-2 text-sm text-[#fff1f1]">
              {visibleIssueMessages[0]}
            </p>
            {visibleIssueMessages.length > 1 && (
              <p className="mt-1 text-xs text-[#ffdada]">
                {visibleIssueMessages.length - 1} more issue{visibleIssueMessages.length - 1 === 1 ? '' : 's'} in Technical Details.
              </p>
            )}
          </div>
        )}
      </div>

      <div className={surfacePanelClass}>
        <div className="border-b border-[rgba(255,255,255,0.08)] px-5 py-4">
          <h2 className={sectionLabelClass}>What this run created</h2>
          <p className="mt-1 text-xs text-[color:var(--today-muted)]">
            Results first: report, review items, and direct next places to go.
          </p>
        </div>

        <div className="p-5 space-y-5">
          {isAwaitingTopicSelection && (
            <div className={`${insetPanelClass} p-4 text-sm text-[color:var(--today-text-soft)]`}>
              Select a topic above to start a full report run. The finished report summary and next actions will appear here.
            </div>
          )}

          {isRunning && (
            <div className={`${insetPanelClass} p-4 text-sm text-[color:var(--today-text-soft)]`}>
              The run is still working. This area will update with finished outputs and next actions when processing completes.
            </div>
          )}

          {!isAwaitingTopicSelection && !isRunning && resultsError && (
            <div className={`${issuePanelClass} text-sm text-[#ffdada]`}>
              {resultsError}
            </div>
          )}

          {!isAwaitingTopicSelection && !isRunning && !resultsError && !results && (
            <div className={`${insetPanelClass} p-4 text-sm text-[color:var(--today-muted)]`}>
              Loading finished outputs...
            </div>
          )}

          {resultsReady && results && (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <OutcomeCountCard
                label="Report"
                value={results.report ? 'Ready' : '—'}
                hint={results.report ? 'Open the finished report.' : 'No report created in this run.'}
              />
              <OutcomeCountCard
                label="Source Candidates"
                value={sourceCount}
                hint={sourceCount > 0 ? 'Review these in the queue.' : 'No new sources proposed.'}
              />
              <OutcomeCountCard
                label="Concepts"
                value={conceptCount}
                hint={conceptCount > 0 ? 'New concepts are ready to review.' : 'No concepts extracted.'}
              />
              <OutcomeCountCard
                label="Flashcards"
                value={flashcardCount}
                hint={flashcardCount > 0 ? 'New flashcards are ready to review.' : 'No flashcards generated.'}
              />
            </div>
          )}

          {noOutputsCreated && (
            <div className={`${insetPanelClass} p-4 text-sm text-[color:var(--today-muted)]`}>
              No new sources, concepts, flashcards, or report were created in this run.
            </div>
          )}

          {results?.report && (
            <article className={`${surfacePanelClass} p-4`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className={sectionLabelClass}>Report ready</p>
                  <h3 className="mt-1 text-lg font-semibold text-[color:var(--today-text)]">{results.report.title}</h3>
                  <p className="mt-1 text-xs text-[color:var(--today-muted)]">
                    Day {results.report.day}
                    {typeof results.report.sourcesCount === 'number'
                      ? ` · ${results.report.sourcesCount} source${results.report.sourcesCount === 1 ? '' : 's'}`
                      : ''}
                  </p>
                  {results.report.topicsCovered.length > 0 && (
                    <p className="mt-2 text-xs text-[color:var(--today-text-soft)]">
                      Covers: {results.report.topicsCovered.slice(0, 5).join(', ')}
                    </p>
                  )}
                  {results.report.preview && (
                    <p className="mt-2 text-sm text-[color:var(--today-text-soft)] line-clamp-4">{results.report.preview}</p>
                  )}
                </div>
                <Link
                  href={results.report.link}
                  className={primaryButtonClass}
                >
                  Open Report
                </Link>
              </div>
            </article>
          )}

          {resultsReady && results && sourceCount > 0 && (
            <article className={`${surfacePanelClass} p-4`}>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--today-text)]">Source candidates</h3>
                <span className="text-xs text-[color:var(--today-muted)]">{sourceCount}</span>
              </div>
              <p className="mt-2 text-sm text-[color:var(--today-muted)]">
                These sources were proposed by this run and are waiting in the review queue.
              </p>
              <div className="mt-4 space-y-3 max-h-96 overflow-y-auto pr-1">
                {results.sources.map((source) => (
                  <div key={source.id} className={`${insetPanelClass} p-3`}>
                    {source.url ? (
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="break-words text-sm font-medium text-[color:var(--today-accent-strong)] hover:underline"
                      >
                        {source.title}
                      </a>
                    ) : (
                      <p className="text-sm font-medium text-[color:var(--today-text)]">{source.title}</p>
                    )}
                    <p className="mt-1 text-xs text-[color:var(--today-muted)]">
                      {source.contentType ?? 'resource'}
                      {typeof source.relevanceScore === 'number'
                        ? ` · relevance ${source.relevanceScore.toFixed(2)}`
                        : ''}
                    </p>
                    {source.summary && (
                      <p className="mt-2 text-xs text-[color:var(--today-text-soft)] line-clamp-3">{source.summary}</p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <Link
                        href={`/artifacts/${source.id}`}
                        className="inline-flex text-xs text-[color:var(--today-muted-strong)] transition-colors hover:text-[color:var(--today-text)]"
                      >
                        View technical details
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          )}

          {resultsReady && results && conceptCount > 0 && (
            <article className={`${surfacePanelClass} p-4`}>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--today-text)]">Concepts</h3>
                <span className="text-xs text-[color:var(--today-muted)]">{conceptCount}</span>
              </div>
              <p className="mt-2 text-sm text-[color:var(--today-muted)]">
                These concepts were extracted by this run and are ready for review.
              </p>
              <div className="mt-4 space-y-3 max-h-96 overflow-y-auto pr-1">
                {results.concepts.map((concept) => (
                  <div key={concept.id} className={`${insetPanelClass} p-3`}>
                    <p className="text-sm font-medium text-[color:var(--today-text)]">{concept.title}</p>
                    <p className="mt-1 text-xs text-[color:var(--today-muted)]">
                      {concept.type ?? 'concept'}
                      {concept.documentTitle ? ` · ${concept.documentTitle}` : ''}
                    </p>
                    {concept.summary && (
                      <p className="mt-2 text-xs text-[color:var(--today-text-soft)] line-clamp-3">{concept.summary}</p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <Link
                        href={`/artifacts/${concept.id}`}
                        className="inline-flex text-xs text-[color:var(--today-muted-strong)] transition-colors hover:text-[color:var(--today-text)]"
                      >
                        View technical details
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          )}

          {resultsReady && results && flashcardCount > 0 && (
            <details className={surfacePanelClass}>
              <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-[color:var(--today-text-soft)] hover:text-[color:var(--today-text)]">
                Flashcards ({flashcardCount})
              </summary>
              <div className="border-t border-[rgba(255,255,255,0.08)] px-4 py-3 space-y-3 max-h-80 overflow-y-auto">
                {results.flashcards.map((flashcard) => (
                  <div key={flashcard.id} className={`${insetPanelClass} p-3`}>
                    <p className="text-xs text-[color:var(--today-muted)]">{flashcard.format ?? 'card'}</p>
                    <p className="mt-1 text-sm text-[color:var(--today-text)]">{flashcard.front ?? flashcard.title}</p>
                    {flashcard.back && (
                      <p className="mt-2 text-xs text-[color:var(--today-text-soft)] line-clamp-3">{flashcard.back}</p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <Link
                        href={`/artifacts/${flashcard.id}`}
                        className="inline-flex text-xs text-[color:var(--today-muted-strong)] transition-colors hover:text-[color:var(--today-text)]"
                      >
                        View technical details
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      </div>

      <details className={surfacePanelClass}>
        <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-[color:var(--today-text-soft)] transition-colors hover:text-[color:var(--today-text)]">
          Technical Details
        </summary>

        <div className="border-t border-[rgba(255,255,255,0.08)] p-5 space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <OutcomeCountCard
              label="Run ID"
              value={runId ?? '—'}
              hint="Internal identifier for this run."
            />
            <OutcomeCountCard
              label="Started"
              value={trace?.startedAt ? formatClockTime(trace.startedAt, { includeSeconds: true }) : '—'}
              hint="Local start time."
            />
            <OutcomeCountCard
              label="Duration"
              value={runDuration}
              hint="Total elapsed time."
            />
            <OutcomeCountCard
              label="Trace Status"
              value={trace?.status ?? (runId ? 'running' : 'pending')}
              hint="Execution status from the run trace."
            />
          </div>

          {stageProgress.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--today-text)]">Stage progress</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {stageProgress.map((stage) => (
                  <StageBadge key={stage.id} stage={stage} />
                ))}
              </div>
            </section>
          )}

          {metrics.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--today-text)]">Pipeline metrics</h3>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {metrics.map((metric) => (
                  <div key={metric.label} className={`${insetPanelClass} p-3`}>
                    <p className="text-[11px] uppercase tracking-wide text-[color:var(--today-muted)]">{metric.label}</p>
                    <p className="text-lg font-semibold text-[color:var(--today-text)]">{metric.value}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {visibleIssueMessages.length > 0 && (
            <section className={issuePanelClass}>
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#ffdada]">Issues</h3>
              <ul className="mt-3 space-y-2 text-sm text-[#fff1f1]">
                {visibleIssueMessages.map((entry, index) => (
                  <li key={`${entry}-${index}`}>{entry}</li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--today-text)]">Step timeline</h3>
            {!trace || trace.steps.length === 0 ? (
              <div className={`mt-3 ${insetPanelClass} p-4 text-sm text-[color:var(--today-muted)]`}>
                Waiting for process steps...
              </div>
            ) : (
              <div className={`mt-3 divide-y divide-[rgba(255,255,255,0.08)] ${insetPanelClass}`}>
                {trace.steps.map((step, index) => {
                  const stageLabel = formatObservedStepLabel(step.name);

                  return (
                    <div key={`${step.name}-${index}`} className="p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <StatusBadge status={step.status} />
                          <span className={subtlePillClass}>
                            {stageLabel}
                          </span>
                          <p className="truncate text-sm text-[color:var(--today-text)]">{step.name}</p>
                        </div>
                        <div className="font-mono text-xs text-[color:var(--today-muted)]">
                          {formatClockTime(step.startedAt, { includeSeconds: true })} · {formatElapsedTime(step.startedAt, step.endedAt)}
                        </div>
                      </div>

                      {Boolean(step.error) && (
                        <p className="mt-2 truncate font-mono text-xs text-[#ffdada]">
                          {safeStringify(step.error)}
                        </p>
                      )}

                      {(Boolean(step.input) || Boolean(step.output)) && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs text-[color:var(--today-muted)] transition-colors hover:text-[color:var(--today-text-soft)]">
                            View payload
                          </summary>
                          <div className="mt-2 grid gap-2 lg:grid-cols-2">
                            {Boolean(step.input) && (
                              <pre className="max-h-56 overflow-auto rounded-[18px] bg-[rgba(0,0,0,0.24)] p-3 text-xs text-[color:var(--today-text-soft)]">
                                {safeStringify(step.input)}
                              </pre>
                            )}
                            {Boolean(step.output) && (
                              <pre className="max-h-56 overflow-auto rounded-[18px] bg-[rgba(0,0,0,0.24)] p-3 text-xs text-[color:var(--today-text-soft)]">
                                {safeStringify(step.output)}
                              </pre>
                            )}
                          </div>
                        </details>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </details>
    </section>
  );
}

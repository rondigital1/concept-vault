import Link from 'next/link';
import { StatusBadge } from '@/app/components/StatusBadge';
import { formatClockTime } from '@/app/components/workflowFormatting';
import {
  primaryButtonClass,
  secondaryButtonClass,
  sectionLabelClass,
} from '@/app/today/WorkspaceHeaderPrimitives';
import {
  accentPillClass,
  subtlePillClass,
  surfacePanelClass,
} from '../styles';
import type { RunOutputCounts } from '../runOutputCounts';
import type { RunResultsPayload } from '../types';
import type { RunTracePayload } from '@/lib/runApiClient';
import { RunIssuePreview } from './RunIssueMessages';

export function RunSummaryPanel({
  currentStatus,
  runModeLabel,
  selectedTopicName,
  isAwaitingTopicSelection,
  isRunning,
  isStarting,
  error,
  resultsError,
  results,
  outputCounts,
  currentStageLabel,
  trace,
  runId,
  runDuration,
  researchHref,
  reviewQueueHref,
  visibleIssueMessages,
  onStartRun,
}: {
  currentStatus: string;
  runModeLabel: string;
  selectedTopicName: string | null;
  isAwaitingTopicSelection: boolean;
  isRunning: boolean;
  isStarting: boolean;
  error: string | null;
  resultsError: string | null;
  results: RunResultsPayload | null;
  outputCounts: RunOutputCounts;
  currentStageLabel: string | null;
  trace: RunTracePayload | null;
  runId: string | null;
  runDuration: string;
  researchHref: string;
  reviewQueueHref: string;
  visibleIssueMessages: string[];
  onStartRun: () => void;
}) {
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
              : outputCounts.generatedCount > 0
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
            : outputCounts.generatedCount > 0
              ? `This run created ${outputCounts.sourceCount} source candidate${outputCounts.sourceCount === 1 ? '' : 's'}, ${outputCounts.conceptCount} concept${outputCounts.conceptCount === 1 ? '' : 's'}, and ${outputCounts.flashcardCount} flashcard${outputCounts.flashcardCount === 1 ? '' : 's'}.`
              : 'The run completed, but it did not create any new sources, concepts, flashcards, or reports.';

  return (
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
            ) : !isRunning && outputCounts.pendingReviewCount > 0 ? (
              <Link
                href={reviewQueueHref}
                className={primaryButtonClass}
              >
                Review Queue
              </Link>
            ) : null}
            {!isRunning && outputCounts.pendingReviewCount > 0 && results?.report && (
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
                onStartRun();
              }}
              disabled={isStarting}
              className={secondaryButtonClass}
            >
              {isStarting ? 'Starting...' : 'Run Again'}
            </button>
          </div>
        )}
      </div>

      <RunIssuePreview issueMessages={visibleIssueMessages} />
    </div>
  );
}

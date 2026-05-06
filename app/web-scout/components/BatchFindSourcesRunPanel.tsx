import Link from 'next/link';
import { StatusBadge } from '@/app/components/StatusBadge';
import {
  primaryButtonClass,
  secondaryButtonClass,
  sectionLabelClass,
} from '@/app/today/WorkspaceHeaderPrimitives';
import { safeStringify, todayISODate } from '../formatting';
import {
  accentPillClass,
  insetPanelClass,
  issuePanelClass,
  subtlePillClass,
  surfacePanelClass,
} from '../styles';
import type { BatchFindSourcesResult, BatchTopicOption, QueryParamReader } from '../types';
import { OutcomeCountCard } from './RunPrimitives';

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
  const previewTopics = batchTopicOptions.slice(0, requestedMaxTopics);
  const topicsEligible = batchResult?.counts.topicsEligible ?? batchTopicOptions.length;
  const topicsProcessed = batchResult?.counts.topicsProcessed ?? 0;
  const topicsFailed = batchResult?.counts.topicsFailed ?? 0;
  const webProposalCount = batchResult?.counts.webProposals ?? 0;
  const batchHeadline = error
    ? 'Batch could not start'
    : isStarting
      ? 'Find Sources batch in progress'
      : batchResult
        ? batchResult.counts.topicsProcessed === 0
          ? 'No eligible topics'
          : batchResult.counts.topicsFailed > 0
            ? 'Batch finished with issues'
            : 'Batch finished'
        : 'Ready to run all eligible topics';
  const batchDescription = batchTopicsError
    ? batchTopicsError
    : error
      ? error
      : isStarting
        ? `Running Find Sources across up to ${requestedMaxTopics} active topics that still need more material.`
        : batchResult
          ? batchResult.counts.topicsProcessed === 0
            ? 'No active topics currently need more sources before they are report-ready.'
            : `Processed ${batchResult.counts.topicsProcessed} of ${batchResult.counts.topicsEligible} eligible topics and proposed ${batchResult.counts.webProposals} source candidate${batchResult.counts.webProposals === 1 ? '' : 's'}.`
          : 'This mode runs Find Sources once per active topic with fewer than the report-ready threshold of linked documents.';

  return (
    <section className="space-y-6">
      <div className={`${surfacePanelClass} p-5`}>
        <div className="flex flex-col gap-3">
          <div>
            <p className={sectionLabelClass}>Batch scope</p>
            <h2 className="mt-2 text-xl font-semibold text-[color:var(--today-text)]">
              All active topics that still need more sources
            </h2>
            <p className="mt-2 text-sm text-[color:var(--today-muted)]">
              This batch runs Find Sources inline for topics below the {minimumLinkedDocumentsForReport}-document readiness threshold.
            </p>
          </div>

          {batchTopicsError && (
            <div className={`${issuePanelClass} text-sm text-[#ffdada]`}>
              {batchTopicsError}
            </div>
          )}

          {!batchTopicsError && batchTopicOptions.length === 0 && (
            <div className={`${insetPanelClass} p-4 text-sm text-[color:var(--today-text-soft)]`}>
              No active topics currently need more sources. Topics reappear here when they fall below the readiness threshold.
            </div>
          )}

          {!batchTopicsError && batchTopicOptions.length > 0 && (
            <>
              <p className="text-sm text-[color:var(--today-text-soft)]">
                Previewing {previewTopics.length} of {batchTopicOptions.length} eligible topic{batchTopicOptions.length === 1 ? '' : 's'}.
              </p>
              <div className="space-y-3">
                {previewTopics.map((topic) => (
                  <div
                    key={topic.id}
                    className={`${insetPanelClass} p-4`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-[color:var(--today-text)]">{topic.name}</p>
                      <span className={subtlePillClass}>
                        {topic.linkedDocumentCount} linked doc{topic.linkedDocumentCount === 1 ? '' : 's'}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-[color:var(--today-text-soft)]">{topic.goal}</p>
                    {topic.focusTags.length > 0 && (
                      <p className="mt-2 text-xs text-[color:var(--today-muted)]">
                        Focus tags: {topic.focusTags.slice(0, 6).join(', ')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/web-scout?runMode=scout_only"
              className={secondaryButtonClass}
            >
              Use Vault-Wide Scout Instead
            </Link>
          </div>
        </div>
      </div>

      <div className={`${surfacePanelClass} p-6`}>
        <p className={sectionLabelClass}>Run summary</p>
        <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={currentStatus} />
              <span className={subtlePillClass}>
                {runModeLabel}
              </span>
              <span className={accentPillClass}>
                Scope: All eligible topics
              </span>
            </div>
            <h2 className="mt-4 text-2xl font-semibold text-[color:var(--today-text)]">{batchHeadline}</h2>
            <p className="mt-2 text-sm leading-7 text-[color:var(--today-text-soft)]">{batchDescription}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            {!isStarting && webProposalCount > 0 && (
              <Link
                href={reviewQueueHref}
                className={primaryButtonClass}
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
              {isStarting ? 'Running...' : 'Run Again'}
            </button>
          </div>
        </div>

        {batchVisibleIssueMessages.length > 0 && (
          <div className={`mt-5 ${issuePanelClass}`}>
            <p className={sectionLabelClass}>Run issues</p>
            <p className="mt-2 text-sm text-[#fff1f1]">{batchVisibleIssueMessages[0]}</p>
            {batchVisibleIssueMessages.length > 1 && (
              <p className="mt-1 text-xs text-[#ffdada]">
                {batchVisibleIssueMessages.length - 1} more issue{batchVisibleIssueMessages.length - 1 === 1 ? '' : 's'} in Technical Details.
              </p>
            )}
          </div>
        )}
      </div>

      <div className={surfacePanelClass}>
        <div className="border-b border-[rgba(255,255,255,0.08)] px-5 py-4">
          <h2 className={sectionLabelClass}>Batch outcomes</h2>
          <p className="mt-1 text-xs text-[color:var(--today-muted)]">
            Topic coverage first, then per-topic run results.
          </p>
        </div>

        <div className="space-y-5 p-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <OutcomeCountCard
              label="Eligible Topics"
              value={topicsEligible}
              hint="Active topics below the report-ready threshold."
            />
            <OutcomeCountCard
              label="Processed"
              value={topicsProcessed}
              hint="Topics attempted in this batch."
            />
            <OutcomeCountCard
              label="Source Candidates"
              value={webProposalCount}
              hint={webProposalCount > 0 ? 'New review items created by the batch.' : 'No new source candidates were proposed.'}
            />
            <OutcomeCountCard
              label="Failed Topics"
              value={topicsFailed}
              hint={topicsFailed > 0 ? 'These topics need follow-up.' : 'All processed topics finished cleanly.'}
            />
          </div>

          {!isStarting && batchResult && batchResult.runs.length === 0 && (
            <div className={`${insetPanelClass} p-4 text-sm text-[color:var(--today-text-soft)]`}>
              No eligible topics were processed in this batch.
            </div>
          )}

          {batchResult && batchResult.runs.length > 0 && (
            <article className={`${insetPanelClass} p-4`}>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--today-text)]">Per-topic runs</h3>
                <span className="text-xs text-[color:var(--today-muted)]">{batchResult.runs.length}</span>
              </div>
              <div className="mt-4 space-y-3">
                {batchResult.runs.map((run) => (
                  <div key={run.topicId} className={`${insetPanelClass} p-3`}>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-medium text-[color:var(--today-text)]">{run.topicName}</p>
                        <p className="mt-1 text-xs text-[color:var(--today-muted)]">
                          Run ID: {run.runId ?? '—'} · {run.counts.webProposals ?? 0} proposal{run.counts.webProposals === 1 ? '' : 's'}
                        </p>
                      </div>
                      <StatusBadge status={run.status} />
                    </div>
                    {run.errors.length > 0 && (
                      <p className="mt-3 text-xs text-[#ffdada]">{run.errors[0]?.message}</p>
                    )}
                  </div>
                ))}
              </div>
            </article>
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
              label="Status"
              value={currentStatus}
              hint="Aggregate batch status."
            />
            <OutcomeCountCard
              label="Eligible"
              value={topicsEligible}
              hint="Topics found before maxTopics was applied."
            />
            <OutcomeCountCard
              label="Max Topics"
              value={requestedMaxTopics}
              hint="Maximum topics requested for this batch."
            />
            <OutcomeCountCard
              label="Day"
              value={batchResult?.day ?? (searchParams.get('day') ?? todayISODate())}
              hint="Artifact day used for sub-runs."
            />
          </div>

          {batchVisibleIssueMessages.length > 0 && (
            <section className={issuePanelClass}>
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#ffdada]">Issues</h3>
              <ul className="mt-3 space-y-2 text-sm text-[#fff1f1]">
                {batchVisibleIssueMessages.map((entry, index) => (
                  <li key={`${entry}-${index}`}>{entry}</li>
                ))}
              </ul>
            </section>
          )}

          {batchResult && batchResult.runs.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--today-text)]">Run payloads</h3>
              <div className="mt-3 space-y-3">
                {batchResult.runs.map((run) => (
                  <details
                    key={`${run.topicId}-payload`}
                    className={insetPanelClass}
                  >
                    <summary className="cursor-pointer px-4 py-3 text-sm text-[color:var(--today-text-soft)] hover:text-[color:var(--today-text)]">
                      {run.topicName} · {run.status}
                    </summary>
                    <div className="border-t border-[rgba(255,255,255,0.08)] p-4">
                      <pre className="max-h-64 overflow-auto rounded-[18px] bg-[rgba(0,0,0,0.24)] p-3 text-xs text-[color:var(--today-text-soft)]">
                        {safeStringify(run)}
                      </pre>
                    </div>
                  </details>
                ))}
              </div>
            </section>
          )}
        </div>
      </details>
    </section>
  );
}

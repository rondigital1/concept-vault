import { StatusBadge } from '@/app/components/StatusBadge';
import { sectionLabelClass } from '@/app/today/WorkspaceHeaderPrimitives';
import {
  insetPanelClass,
  surfacePanelClass,
} from '../styles';
import type { BatchRunCounts } from '../batchPresentation';
import type { BatchFindSourcesResult } from '../types';
import { OutcomeCountCard } from './RunPrimitives';

export function BatchOutcomesPanel({
  batchResult,
  counts,
  isStarting,
}: {
  batchResult: BatchFindSourcesResult | null;
  counts: BatchRunCounts;
  isStarting: boolean;
}) {
  return (
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
            value={counts.topicsEligible}
            hint="Active topics below the report-ready threshold."
          />
          <OutcomeCountCard
            label="Processed"
            value={counts.topicsProcessed}
            hint="Topics attempted in this batch."
          />
          <OutcomeCountCard
            label="Source Candidates"
            value={counts.webProposalCount}
            hint={counts.webProposalCount > 0 ? 'New review items created by the batch.' : 'No new source candidates were proposed.'}
          />
          <OutcomeCountCard
            label="Failed Topics"
            value={counts.topicsFailed}
            hint={counts.topicsFailed > 0 ? 'These topics need follow-up.' : 'All processed topics finished cleanly.'}
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
  );
}

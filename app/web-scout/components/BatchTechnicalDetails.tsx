import { safeStringify } from '../formatting';
import {
  insetPanelClass,
  surfacePanelClass,
} from '../styles';
import type { BatchRunCounts } from '../batchPresentation';
import type { BatchFindSourcesResult } from '../types';
import { IssueListSection } from './RunIssueMessages';
import { OutcomeCountCard } from './RunPrimitives';

export function BatchTechnicalDetails({
  currentStatus,
  counts,
  requestedMaxTopics,
  day,
  issueMessages,
  batchResult,
}: {
  currentStatus: string;
  counts: BatchRunCounts;
  requestedMaxTopics: number;
  day: string;
  issueMessages: string[];
  batchResult: BatchFindSourcesResult | null;
}) {
  return (
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
            value={counts.topicsEligible}
            hint="Topics found before maxTopics was applied."
          />
          <OutcomeCountCard
            label="Max Topics"
            value={requestedMaxTopics}
            hint="Maximum topics requested for this batch."
          />
          <OutcomeCountCard
            label="Day"
            value={day}
            hint="Artifact day used for sub-runs."
          />
        </div>

        <IssueListSection issueMessages={issueMessages} />

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
  );
}

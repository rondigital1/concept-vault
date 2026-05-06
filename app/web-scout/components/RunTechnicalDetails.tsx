import { StatusBadge } from '@/app/components/StatusBadge';
import { formatClockTime, formatElapsedTime } from '@/app/components/workflowFormatting';
import {
  formatObservedStepLabel,
} from '@/lib/agentRunPresentation';
import { safeStringify } from '../formatting';
import {
  insetPanelClass,
  subtlePillClass,
  surfacePanelClass,
} from '../styles';
import type { Metric, StageProgress } from '../types';
import type { RunTracePayload } from '@/lib/runApiClient';
import { IssueListSection } from './RunIssueMessages';
import { OutcomeCountCard, StageBadge } from './RunPrimitives';

export function RunTechnicalDetails({
  runId,
  trace,
  runDuration,
  stageProgress,
  metrics,
  visibleIssueMessages,
}: {
  runId: string | null;
  trace: RunTracePayload | null;
  runDuration: string;
  stageProgress: StageProgress[];
  metrics: Metric[];
  visibleIssueMessages: string[];
}) {
  return (
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

        <IssueListSection issueMessages={visibleIssueMessages} />

        <StepTimeline trace={trace} />
      </div>
    </details>
  );
}

function StepTimeline({ trace }: { trace: RunTracePayload | null }) {
  return (
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
  );
}

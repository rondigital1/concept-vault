'use client';

import { EmptyState } from '@/app/components/EmptyState';
import { StatusBadge } from '@/app/components/StatusBadge';
import { formatClockTime, formatElapsedTime } from '@/app/components/workflowFormatting';
import type { SelectedRunDetail } from '@/lib/agentsWorkspaceTypes';
import { formatRunDescriptor } from './presentation';
import { ResultsMetric } from './AgentsInspectorFields';
import {
  workspaceEyebrowClassName,
  workspaceInsetSurfaceClassName,
  workspaceMutedCopyClassName,
  workspacePillClassName,
} from './workspaceTheme';

export function SelectedRunDetailPanel({ selectedRun }: { selectedRun: SelectedRunDetail | null }) {
  return (
    <div className={`${workspaceInsetSurfaceClassName} p-4`}>
      <p className={workspaceEyebrowClassName}>Selected run</p>

      {selectedRun ? (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={selectedRun.status} />
            <span className={workspacePillClassName}>
              {formatRunDescriptor(selectedRun.runMode, selectedRun.kind)}
            </span>
            {selectedRun.topicName ? (
              <span className={workspacePillClassName}>{selectedRun.topicName}</span>
            ) : null}
          </div>

          <div className={`text-sm leading-6 ${workspaceMutedCopyClassName}`}>
            Started {formatClockTime(selectedRun.startedAt, { includeSeconds: true })} ·
            {' '}Duration {formatElapsedTime(selectedRun.startedAt, selectedRun.endedAt ?? undefined)}
          </div>

          <div className="space-y-3">
            {selectedRun.stages.map((stage) => (
              <div key={stage.id} className={`${workspaceInsetSurfaceClassName} px-4 py-4`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-white">{stage.label}</div>
                    <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--surface-text-muted)]">
                      {stage.agentKey ?? 'pipeline'}
                    </div>
                  </div>
                  <StatusBadge status={stage.status} />
                </div>
                <div className="mt-3 text-xs text-[color:var(--surface-text-muted)]">
                  {formatClockTime(stage.startedAt ?? undefined, { includeSeconds: true })} ·{' '}
                  {stage.durationMs !== null
                    ? formatElapsedTime(stage.startedAt ?? undefined, stage.endedAt ?? undefined)
                    : 'Pending'}
                </div>
                {stage.error ? <p className="mt-3 text-sm text-rose-200">{stage.error}</p> : null}
              </div>
            ))}
          </div>

          {selectedRun.results ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <ResultsMetric label="Sources" value={selectedRun.results.sourceCount} />
                <ResultsMetric
                  label="Outputs"
                  value={selectedRun.results.conceptCount + selectedRun.results.flashcardCount}
                />
              </div>
              {selectedRun.results.errors.length > 0 ? (
                <div className={`${workspaceInsetSurfaceClassName} px-4 py-4`}>
                  <div className={workspaceEyebrowClassName}>Result errors</div>
                  <div className="mt-3 space-y-2">
                    {selectedRun.results.errors.map((errorMessage) => (
                      <p key={errorMessage} className="text-sm leading-6 text-rose-200">
                        {errorMessage}
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      ) : (
        <EmptyState
          title="No run selected"
          description="Choose a recent run to inspect stages, results, and any execution errors."
          className="mt-4 border-white/[0.08] bg-[rgba(16,18,20,0.86)] p-8 shadow-none"
        />
      )}
    </div>
  );
}

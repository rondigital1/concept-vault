import { EmptyState } from '@/app/components/EmptyState';
import { StatusBadge } from '@/app/components/StatusBadge';
import { formatClockTime } from '@/app/components/workflowFormatting';
import {
  workspaceEyebrowClassName,
  workspaceMutedCopyClassName,
  workspaceShellPanelClassName,
  workspaceSurfaceClassName,
} from './workspaceTheme';
import type { ExecutionEvent } from '@/lib/agentsWorkspaceTypes';

type Props = {
  executionEvents: ExecutionEvent[];
};

export function ExecutionFeedPanel({ executionEvents }: Props) {
  return (
    <article className={`${workspaceShellPanelClassName} px-5 py-5 sm:px-6`}>
      <div>
        <p className={workspaceEyebrowClassName}>Execution Feed</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">
          Recent orchestration
        </h2>
      </div>

      {executionEvents.length > 0 ? (
        <div className="mt-6 space-y-4">
          {executionEvents.map((event) => (
            <div key={event.id} className={`${workspaceSurfaceClassName} px-4 py-4`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-base font-medium text-white">{event.label}</div>
                  <p className={`mt-1 ${workspaceMutedCopyClassName}`}>{event.detail}</p>
                </div>
                <StatusBadge status={event.status} />
              </div>
              <div className="mt-3 text-xs text-[color:var(--surface-text-muted)]">
                {formatClockTime(event.timestamp, { includeSeconds: true })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Execution feed is quiet"
          description="Recent step-level events will appear here after the next run starts."
          className="mt-6 border-white/[0.08] bg-[rgba(16,18,20,0.86)] p-8 shadow-none"
        />
      )}
    </article>
  );
}

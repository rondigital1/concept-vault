import { EmptyState } from '@/app/components/EmptyState';
import { StatusBadge } from '@/app/components/StatusBadge';
import {
  formatClockTime,
  formatElapsedTime,
} from '@/app/components/workflowFormatting';
import { formatRunDescriptor, resolveStageProgressStatus } from './presentation';
import {
  workspaceEyebrowClassName,
  workspaceShellPanelClassName,
  workspaceSurfaceClassName,
} from './workspaceTheme';
import type { RecentRunSummary } from '@/lib/agentsWorkspaceTypes';

type Props = {
  recentRuns: RecentRunSummary[];
  selectedRunId: string | null;
  onRunSelect: (runId: string) => void;
};

function RecentRunCard({
  run,
  selected,
  onSelect,
}: {
  run: RecentRunSummary;
  selected: boolean;
  onSelect: () => void;
}) {
  const visibleStages = run.stageProgress.filter((stage) => stage.status !== 'pending').slice(0, 4);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        `${workspaceSurfaceClassName} block w-full px-4 py-4 text-left transition-[border-color,background-color,box-shadow]`,
        selected
          ? 'border-[color:var(--surface-accent-strong)] bg-[rgba(132,174,186,0.08)] shadow-[0_16px_32px_rgba(0,0,0,0.18)]'
          : 'hover:border-white/[0.12] hover:bg-white/[0.05]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--surface-accent-strong)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#101214]',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-base font-semibold tracking-[-0.02em] text-white">
            {run.topicName ?? 'Global run'}
          </div>
          <div className="mt-1 text-sm text-[color:var(--surface-text-muted)]">
            {formatRunDescriptor(run.runMode, run.kind)}
          </div>
        </div>
        <StatusBadge status={run.status} />
      </div>

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[color:var(--surface-text-muted)]">
        <span>Started {formatClockTime(run.startedAt, { includeSeconds: true })}</span>
        <span>Duration {formatElapsedTime(run.startedAt, run.endedAt ?? undefined)}</span>
      </div>

      {visibleStages.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {visibleStages.map((stage) => (
            <StatusBadge
              key={stage.id}
              status={resolveStageProgressStatus(stage.status)}
              label={stage.label}
            />
          ))}
        </div>
      ) : null}

      {run.lastError ? <p className="mt-3 text-sm text-rose-200">{run.lastError}</p> : null}
    </button>
  );
}

export function RecentRunsPanel({ recentRuns, selectedRunId, onRunSelect }: Props) {
  return (
    <article className={`${workspaceShellPanelClassName} px-5 py-5 sm:px-6`}>
      <div>
        <p className={workspaceEyebrowClassName}>Recent Runs</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">
          Orchestration history
        </h2>
      </div>

      {recentRuns.length > 0 ? (
        <div className="mt-6 max-h-[33rem] space-y-3 overflow-y-auto pr-1">
          {recentRuns.map((run) => (
            <RecentRunCard
              key={run.id}
              run={run}
              selected={selectedRunId === run.id}
              onSelect={() => onRunSelect(run.id)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No recent runs"
          description="Launch a pipeline run from the inspector to populate live history and stage detail."
          className="mt-6 border-white/[0.08] bg-[rgba(16,18,20,0.86)] p-8 shadow-none"
        />
      )}
    </article>
  );
}

'use client';

import { StatusBadge } from '@/app/components/StatusBadge';
import {
  formatClockTime,
  formatDurationMs,
  formatElapsedTime,
} from '@/app/components/workflowFormatting';
import { formatRunDescriptor, resolveAgentStateStatus, resolveStageProgressStatus } from './presentation';
import {
  workspaceInsetSurfaceClassName,
  workspaceMutedCopyClassName,
  workspacePillClassName,
  workspaceShellPanelClassName,
  workspaceSurfaceClassName,
} from './workspaceTheme';
import type { AgentRegistryEntry, RecentRunSummary } from '@/lib/agentsWorkspaceTypes';

function RegistryIcon({ agentKey }: { agentKey: AgentRegistryEntry['key'] }) {
  if (agentKey === 'pipeline') {
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.7} aria-hidden="true">
        <circle cx="6" cy="12" r="2.2" />
        <circle cx="18" cy="7" r="2.2" />
        <circle cx="18" cy="17" r="2.2" />
        <path d="M8.2 11 15.7 8.1" />
        <path d="m8.2 13 7.5 2.9" />
      </svg>
    );
  }

  if (agentKey === 'curator') {
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.7} aria-hidden="true">
        <path d="M6 6h12" />
        <path d="M6 12h8" />
        <path d="M6 18h10" />
      </svg>
    );
  }

  if (agentKey === 'webScout') {
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.7} aria-hidden="true">
        <circle cx="11" cy="11" r="6.2" />
        <path d="m20 20-4-4" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.7} aria-hidden="true">
      <path d="M7 6h10" />
      <path d="M7 12h10" />
      <path d="M7 18h10" />
      <path d="M5 6h.01" />
      <path d="M5 12h.01" />
      <path d="M5 18h.01" />
    </svg>
  );
}

function SuccessMeter({ successRate }: { successRate: number | null }) {
  if (successRate === null) {
    return (
      <div className="text-right">
        <div className="text-sm font-medium text-white">No recent data</div>
        <div className="mt-1 text-xs text-white/64">
          30-day success window still building
        </div>
      </div>
    );
  }

  const percent = Math.round(successRate * 100);

  return (
    <div className="min-w-[9rem] space-y-2">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="text-white/64">Success rate</span>
        <span className="font-semibold text-white">{percent}%</span>
      </div>
      <div className="h-2 rounded-full bg-white/[0.08]">
        <div
          className="h-full rounded-full bg-[color:var(--surface-accent-strong)]"
          style={{ width: `${Math.max(percent, 8)}%` }}
        />
      </div>
    </div>
  );
}

export function AgentCard({ entry }: { entry: AgentRegistryEntry }) {
  return (
    <article className={`${workspaceShellPanelClassName} px-5 py-5 sm:px-6 sm:py-6`}>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] border border-white/[0.08] bg-white/[0.04] text-[color:var(--surface-accent-strong)]">
              <RegistryIcon agentKey={entry.key} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-[1.5rem] font-semibold tracking-normal text-white">
                  {entry.name}
                </h3>
                <StatusBadge status={resolveAgentStateStatus(entry.state)} label={entry.stateLabel} />
                {entry.liveRunId ? <span className={workspacePillClassName}>Live run</span> : null}
              </div>
              <p className={`mt-2 max-w-2xl ${workspaceMutedCopyClassName}`}>{entry.description}</p>
              {entry.badges.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {entry.badges.map((badge) => (
                    <span key={badge} className={workspacePillClassName}>
                      {badge}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <SuccessMeter successRate={entry.successRate} />
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {entry.outputMetrics.map((metric) => (
          <div key={metric.label} className={`${workspaceInsetSurfaceClassName} px-4 py-4`}>
            <div className="text-2xl font-semibold tracking-normal text-white">{metric.value}</div>
            <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/64">
              {metric.label}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-xs text-white/64">
        <span>Last started {formatClockTime(entry.lastStartedAt ?? undefined, { includeSeconds: true })}</span>
        <span>Last ended {formatClockTime(entry.lastEndedAt ?? undefined, { includeSeconds: true })}</span>
        <span>Average duration {formatDurationMs(entry.averageDurationMs)}</span>
        {entry.auxiliaryLabel ? <span>{entry.auxiliaryLabel}</span> : null}
      </div>
    </article>
  );
}

export function RecentRunCard({
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
        `${workspaceSurfaceClassName} block w-full min-w-0 overflow-hidden px-4 py-4 text-left transition-[border-color,background-color,box-shadow]`,
        selected
          ? 'border-[color:var(--surface-accent-strong)] bg-[rgba(132,174,186,0.08)] shadow-[0_16px_32px_rgba(0,0,0,0.18)]'
          : 'hover:border-white/[0.12] hover:bg-white/[0.05]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--surface-accent-strong)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#101214]',
      ].join(' ')}
    >
      <div className="flex min-w-0 items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-base font-semibold tracking-normal text-white">
            {run.topicName ?? 'Global run'}
          </div>
          <div className="mt-1 text-sm text-white/64">
            {formatRunDescriptor(run.runMode, run.kind)}
          </div>
        </div>
        <StatusBadge status={run.status} />
      </div>

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-white/64">
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

      {run.lastError ? (
        <p className="mt-3 break-words text-sm text-rose-200 [overflow-wrap:anywhere]">
          {run.lastError}
        </p>
      ) : null}
    </button>
  );
}

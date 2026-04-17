'use client';

import { EmptyState } from '@/app/components/EmptyState';
import { StatusBadge } from '@/app/components/StatusBadge';
import {
  formatClockTime,
  formatDurationMs,
  formatElapsedTime,
} from '@/app/components/workflowFormatting';
import { formatRunDescriptor, resolveAgentStateStatus, resolveStageProgressStatus } from './presentation';
import {
  workspaceEyebrowClassName,
  workspaceInsetSurfaceClassName,
  workspaceMutedCopyClassName,
  workspacePillClassName,
  workspaceShellPanelClassName,
  workspaceSurfaceClassName,
} from './workspaceTheme';
import type {
  AgentRegistryEntry,
  ExecutionEvent,
  RecentRunSummary,
} from '@/lib/agentsWorkspaceTypes';

type Props = {
  agentRegistry: AgentRegistryEntry[];
  recentRuns: RecentRunSummary[];
  executionEvents: ExecutionEvent[];
  selectedRunId: string | null;
  selectedTopicName: string | null;
  onRunSelect: (runId: string) => void;
};

function RegistryIcon({ agentKey }: { agentKey: AgentRegistryEntry['key'] }) {
  if (agentKey === 'pipeline') {
    return (
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.7}
        aria-hidden="true"
      >
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
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.7}
        aria-hidden="true"
      >
        <path d="M6 6h12" />
        <path d="M6 12h8" />
        <path d="M6 18h10" />
      </svg>
    );
  }

  if (agentKey === 'webScout') {
    return (
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.7}
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="6.2" />
        <path d="m20 20-4-4" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      aria-hidden="true"
    >
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
        <div className="mt-1 text-xs text-[color:var(--surface-text-muted)]">
          30-day success window still building
        </div>
      </div>
    );
  }

  const percent = Math.round(successRate * 100);

  return (
    <div className="min-w-[9rem] space-y-2">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="text-[color:var(--surface-text-muted)]">Success rate</span>
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

function AgentCard({ entry }: { entry: AgentRegistryEntry }) {
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
                <h3 className="text-[1.5rem] font-semibold tracking-[-0.04em] text-white">
                  {entry.name}
                </h3>
                <StatusBadge
                  status={resolveAgentStateStatus(entry.state)}
                  label={entry.stateLabel}
                />
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
            <div className="text-2xl font-semibold tracking-[-0.04em] text-white">{metric.value}</div>
            <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--surface-text-muted)]">
              {metric.label}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-xs text-[color:var(--surface-text-muted)]">
        <span>Last started {formatClockTime(entry.lastStartedAt ?? undefined, { includeSeconds: true })}</span>
        <span>Last ended {formatClockTime(entry.lastEndedAt ?? undefined, { includeSeconds: true })}</span>
        <span>Average duration {formatDurationMs(entry.averageDurationMs)}</span>
        {entry.auxiliaryLabel ? <span>{entry.auxiliaryLabel}</span> : null}
      </div>
    </article>
  );
}

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

export function AgentRegistry({
  agentRegistry,
  recentRuns,
  executionEvents,
  selectedRunId,
  selectedTopicName,
  onRunSelect,
}: Props) {
  const liveCount = agentRegistry.filter((entry) => entry.state === 'live').length;
  const lastEvent = executionEvents[0] ?? null;
  const latestRun = recentRuns[0] ?? null;

  return (
    <div className="space-y-6">
      <section id="agents-overview" className={`${workspaceShellPanelClassName} px-6 py-6 sm:px-8`}>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.85fr)]">
          <div>
            <p className={workspaceEyebrowClassName}>Agents Workspace</p>
            <h1 className="mt-4 text-[clamp(2.9rem,5vw,4.8rem)] font-semibold tracking-[-0.08em] text-white">
              Configure the operational stack.
            </h1>
            <p className="mt-4 max-w-3xl text-[1rem] leading-8 text-white/80">
              Keep the registry dense, launch pipeline runs with explicit overrides, and inspect orchestration health without leaving the agents surface.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className={workspacePillClassName}>{liveCount} active profiles</span>
              <span className={workspacePillClassName}>{agentRegistry.length} visible agents</span>
              <span className={workspacePillClassName}>
                Scope: {selectedTopicName ?? 'Global defaults'}
              </span>
            </div>
          </div>

          <div className={`${workspaceInsetSurfaceClassName} grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-1`}>
            <div>
              <div className={workspaceEyebrowClassName}>Latest Signal</div>
              <div className="mt-2 text-base font-medium text-white">
                {lastEvent ? lastEvent.label : 'No recent event'}
              </div>
              <p className="mt-1 text-sm text-[color:var(--surface-text-muted)]">
                {lastEvent
                  ? `${formatClockTime(lastEvent.timestamp, { includeSeconds: true })} · ${lastEvent.detail}`
                  : 'The execution feed will appear here after the next run.'}
              </p>
            </div>

            <div>
              <div className={workspaceEyebrowClassName}>Latest Launch</div>
              <div className="mt-2 text-base font-medium text-white">
                {latestRun ? formatRunDescriptor(latestRun.runMode, latestRun.kind) : 'No runs yet'}
              </div>
              <p className="mt-1 text-sm text-[color:var(--surface-text-muted)]">
                {latestRun
                  ? `${latestRun.topicName ?? 'Global scope'} · ${formatElapsedTime(latestRun.startedAt, latestRun.endedAt ?? undefined)}`
                  : 'Run history will populate after the first pipeline launch.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="agents-registry" className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className={workspaceEyebrowClassName}>Registry</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-white">
              Agent profiles and 30-day output signals
            </h2>
          </div>
          <div className="text-sm text-[color:var(--surface-text-muted)]">
            {liveCount} live / {agentRegistry.length} registered
          </div>
        </div>

        <div className="space-y-4">
          {agentRegistry.map((entry) => (
            <AgentCard key={entry.key} entry={entry} />
          ))}
        </div>
      </section>

      <section id="agents-runs" className="grid gap-6 2xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
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
      </section>
    </div>
  );
}

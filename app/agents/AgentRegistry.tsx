'use client';

import { EmptyState } from '@/app/components/EmptyState';
import { StatusBadge } from '@/app/components/StatusBadge';
import { formatClockTime, formatElapsedTime } from '@/app/components/workflowFormatting';
import { AgentCard, RecentRunCard } from './AgentRegistryCards';
import { CapabilityDashboard } from './CapabilityDashboard';
import { buildAgentCapabilityCards } from './capabilityPresentation';
import { formatRunDescriptor } from './presentation';
import {
  workspaceEyebrowClassName,
  workspaceInsetSurfaceClassName,
  workspaceMutedCopyClassName,
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
  topicCount: number;
  onRunSelect: (runId: string) => void;
};

export function AgentRegistry({
  agentRegistry,
  recentRuns,
  executionEvents,
  selectedRunId,
  selectedTopicName,
  topicCount,
  onRunSelect,
}: Props) {
  const liveCount = agentRegistry.filter((entry) => entry.state === 'live').length;
  const lastEvent = executionEvents[0] ?? null;
  const latestRun = recentRuns[0] ?? null;
  const capabilities = buildAgentCapabilityCards(agentRegistry, recentRuns, topicCount);

  return (
    <div className="space-y-6">
      <section id="agents-overview" className={`${workspaceShellPanelClassName} px-6 py-6 sm:px-8`}>
        <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.85fr)]">
          <div>
            <p className={workspaceEyebrowClassName}>Agents Workspace</p>
            <h1 className="mt-4 text-[clamp(2.6rem,5vw,4.8rem)] font-semibold tracking-normal text-white">
              Operate the agent pipeline.
            </h1>
            <p className="mt-4 max-w-3xl text-[1rem] leading-8 text-white/80">
              Launch pipeline runs, tune agent thresholds, inspect traces, and move proposed outputs toward review without leaving the operational surface.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs font-semibold text-white">
                {liveCount} active profiles
              </span>
              <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs font-semibold text-white">
                {agentRegistry.length} visible agents
              </span>
              <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs font-semibold text-white">
                Scope: {selectedTopicName ?? 'Global defaults'}
              </span>
            </div>
          </div>

          <div className={`${workspaceInsetSurfaceClassName} grid gap-4 p-5 md:grid-cols-2 2xl:grid-cols-1`}>
            <div>
              <div className={workspaceEyebrowClassName}>Latest Signal</div>
              <div className="mt-2 text-base font-medium text-white">
                {lastEvent ? lastEvent.label : 'No recent event'}
              </div>
              <p className="mt-1 text-sm text-white/64">
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
              <p className="mt-1 text-sm text-white/64">
                {latestRun
                  ? `${latestRun.topicName ?? 'Global scope'} · ${formatElapsedTime(latestRun.startedAt, latestRun.endedAt ?? undefined)}`
                  : 'Run history will populate after the first pipeline launch.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      <CapabilityDashboard capabilities={capabilities} />

      <section id="agents-registry" className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className={workspaceEyebrowClassName}>Registry</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-normal text-white">
              Agent profiles and 30-day output signals
            </h2>
          </div>
          <div className="text-sm text-white/64">
            {liveCount} live / {agentRegistry.length} registered
          </div>
        </div>

        <div className="space-y-4">
          {agentRegistry.map((entry) => (
            <AgentCard key={entry.key} entry={entry} />
          ))}
        </div>
      </section>

      <section id="agents-runs" className="grid min-w-0 gap-6 2xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <article className={`${workspaceShellPanelClassName} min-w-0 overflow-hidden px-5 py-5 sm:px-6`}>
          <div className="min-w-0">
            <p className={workspaceEyebrowClassName}>Recent Runs</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal text-white">
              Orchestration history
            </h2>
          </div>

          {recentRuns.length > 0 ? (
            <div className="mt-6 max-h-[33rem] min-w-0 space-y-3 overflow-y-auto pr-1">
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

        <article className={`${workspaceShellPanelClassName} min-w-0 overflow-hidden px-5 py-5 sm:px-6`}>
          <div className="min-w-0">
            <p className={workspaceEyebrowClassName}>Execution Feed</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal text-white">
              Recent orchestration
            </h2>
          </div>

          {executionEvents.length > 0 ? (
            <div className="mt-6 min-w-0 space-y-4">
              {executionEvents.map((event) => (
                <div key={event.id} className={`${workspaceSurfaceClassName} min-w-0 px-4 py-4`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-base font-medium text-white">{event.label}</div>
                      <p className={`mt-1 break-words ${workspaceMutedCopyClassName}`}>{event.detail}</p>
                    </div>
                    <StatusBadge status={event.status} />
                  </div>
                  <div className="mt-3 text-xs text-white/64">
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

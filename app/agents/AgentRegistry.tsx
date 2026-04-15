'use client';

import {
  formatClockTime,
  formatDurationMs,
  formatElapsedTime,
} from '@/app/components/workflowFormatting';
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
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={1.7} aria-hidden="true">
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
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={1.7} aria-hidden="true">
        <path d="M6 6h12" />
        <path d="M6 12h8" />
        <path d="M6 18h10" />
      </svg>
    );
  }

  if (agentKey === 'webScout') {
    return (
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={1.7} aria-hidden="true">
        <circle cx="11" cy="11" r="6.2" />
        <path d="m20 20-4-4" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={1.7} aria-hidden="true">
      <path d="M7 6h10" />
      <path d="M7 12h10" />
      <path d="M7 18h10" />
      <path d="M5 6h.01" />
      <path d="M5 12h.01" />
      <path d="M5 18h.01" />
    </svg>
  );
}

function AgentCard({ entry }: { entry: AgentRegistryEntry }) {
  const trackWidth = entry.successRate !== null ? `${Math.max(entry.successRate * 100, 8)}%` : '8%';

  return (
    <article className="agents-panel agents-panel-low rounded-[24px] px-5 py-5 sm:px-6 sm:py-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-[rgba(255,255,255,0.08)] text-[color:var(--agents-accent)] outline outline-1 outline-[color:var(--agents-outline)]">
            <RegistryIcon agentKey={entry.key} />
          </div>
          <div>
            <h3 className="text-[1.65rem] font-black tracking-[-0.05em] text-[color:var(--agents-accent)]">
              {entry.name}
            </h3>
            <p className="mt-1 max-w-xl text-sm leading-6 text-[color:var(--agents-text-soft)]">
              {entry.description}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {entry.badges.map((badge) => (
                <span key={badge} className="agents-chip">
                  {badge}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden w-24 sm:block">
            <div className="h-1.5 rounded-full bg-[rgba(255,255,255,0.08)]">
              <div
                className="h-full rounded-full bg-[color:var(--agents-accent)]"
                style={{ width: trackWidth }}
              />
            </div>
            <div className="mt-2 text-right text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--agents-muted)]">
              Success {entry.successRate !== null ? Math.round(entry.successRate * 100) : 0}%
            </div>
          </div>

          <div
            className={`relative h-7 w-14 rounded-full ${
              entry.state === 'live'
                ? 'bg-[color:var(--agents-accent)]'
                : 'bg-[rgba(255,255,255,0.12)]'
            }`}
            aria-label={`${entry.name} ${entry.stateLabel}`}
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${
                entry.state === 'live' ? 'left-8' : 'left-1'
              }`}
            />
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {entry.outputMetrics.map((metric) => (
          <div key={metric.label} className="agents-panel agents-panel-lowest rounded-[18px] px-4 py-4">
            <div className="text-lg font-semibold text-[color:var(--agents-accent)]">{metric.value}</div>
            <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-[color:var(--agents-muted)]">
              {metric.label}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[color:var(--agents-muted-strong)]">
        <span>Last started {formatClockTime(entry.lastStartedAt ?? undefined, { includeSeconds: true })}</span>
        <span>Last ended {formatClockTime(entry.lastEndedAt ?? undefined, { includeSeconds: true })}</span>
        <span>Avg duration {formatDurationMs(entry.averageDurationMs)}</span>
        {entry.auxiliaryLabel ? <span>{entry.auxiliaryLabel}</span> : null}
      </div>
    </article>
  );
}

function RunStatusPill({ status }: { status: RecentRunSummary['status'] }) {
  const tone =
    status === 'running'
      ? 'bg-[rgba(255,255,255,0.16)] text-white'
      : status === 'ok'
        ? 'bg-[rgba(92,142,112,0.18)] text-[#e5f8ec]'
        : 'bg-[rgba(255,126,126,0.18)] text-[#ffd9d9]';

  return (
    <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${tone}`}>
      {status}
    </span>
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

  return (
    <div className="space-y-8">
      <section id="agents-hero" className="pt-8 lg:pt-12">
        <p className="agents-label">Concept Vault Intelligence</p>
        <h1 className="mt-5 text-[clamp(3.35rem,8vw,5.9rem)] font-black tracking-[-0.09em] text-[color:var(--agents-accent)]">
          AGENT_ENGINE
        </h1>
        <p className="mt-4 max-w-3xl text-[1.05rem] leading-8 text-[color:var(--agents-text-soft)]">
          Configure the real workflow stack behind Concept Vault, inspect agent metrics, and launch pipeline runs with topic-specific overrides and live execution detail.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <span className="agents-chip">{liveCount} active</span>
          <span className="agents-chip">{recentRuns.length} recent runs</span>
          {selectedTopicName ? <span className="agents-chip">Topic: {selectedTopicName}</span> : null}
        </div>
      </section>

      <section id="agents-registry" className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="agents-label">Active registry</p>
            <h2 className="mt-2 text-3xl font-black tracking-[-0.05em] text-[color:var(--agents-accent)]">
              Live agent surfaces
            </h2>
          </div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--agents-muted)]">
            {liveCount} live / {agentRegistry.length} visible
          </div>
        </div>

        <div className="space-y-4">
          {agentRegistry.map((entry) => (
            <AgentCard key={entry.key} entry={entry} />
          ))}
        </div>
      </section>

      <section id="agents-runs" className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
        <article className="agents-panel agents-panel-high rounded-[28px] px-5 py-5 sm:px-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="agents-label">Recent runs</p>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.05em] text-[color:var(--agents-accent)]">
                Orchestration history
              </h2>
            </div>
          </div>

          <div className="agents-scroll mt-6 max-h-[440px] space-y-3 overflow-y-auto pr-1">
            {recentRuns.map((run) => (
              <button
                key={run.id}
                type="button"
                onClick={() => onRunSelect(run.id)}
                className={`agents-panel block w-full rounded-[22px] px-4 py-4 text-left transition-colors ${
                  selectedRunId === run.id
                    ? 'agents-panel-high bg-[rgba(255,255,255,0.08)]'
                    : 'agents-panel-lowest hover:bg-[rgba(255,255,255,0.04)]'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-[color:var(--agents-accent)]">
                      {run.topicName ?? 'Global run'}
                    </div>
                    <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-[color:var(--agents-muted)]">
                      {run.runMode ? run.runMode.replace(/_/g, ' ') : run.kind}
                    </div>
                  </div>
                  <RunStatusPill status={run.status} />
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-xs text-[color:var(--agents-text-soft)]">
                  <span>Started {formatClockTime(run.startedAt, { includeSeconds: true })}</span>
                  <span>Duration {formatElapsedTime(run.startedAt, run.endedAt ?? undefined)}</span>
                  {run.lastError ? <span className="text-[#ffd9d9]">{run.lastError}</span> : null}
                </div>
              </button>
            ))}
          </div>
        </article>

        <article className="agents-panel agents-panel-low rounded-[28px] px-5 py-5 sm:px-6">
          <p className="agents-label">Execution feed</p>
          <h2 className="mt-2 text-2xl font-black tracking-[-0.05em] text-[color:var(--agents-accent)]">
            Recent orchestration
          </h2>

          <div className="mt-6 space-y-4">
            {executionEvents.map((event) => (
              <div key={event.id} className="flex gap-3">
                <div className={`mt-1 h-2.5 w-2.5 rounded-full ${event.status === 'running' ? 'bg-white animate-pulse' : event.status === 'ok' ? 'bg-[#cfcfcf]' : 'bg-[#ff8d8d]'}`} />
                <div>
                  <div className="text-sm font-semibold text-[color:var(--agents-text)]">{event.label}</div>
                  <div className="mt-1 text-sm leading-6 text-[color:var(--agents-muted)]">{event.detail}</div>
                  <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-[color:var(--agents-muted)]">
                    {formatClockTime(event.timestamp, { includeSeconds: true })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="agents-panel agents-panel-lowest flex flex-wrap gap-8 rounded-[28px] px-5 py-5 sm:px-6">
        <div>
          <div className="agents-label">Last event</div>
          <div className="mt-2 text-sm font-medium text-[color:var(--agents-text)]">
            {lastEvent ? `${lastEvent.label} · ${formatClockTime(lastEvent.timestamp, { includeSeconds: true })}` : 'No recent event'}
          </div>
        </div>
        <div>
          <div className="agents-label">Selected topic</div>
          <div className="mt-2 text-sm font-medium text-[color:var(--agents-text)]">
            {selectedTopicName ?? 'Global scope'}
          </div>
        </div>
        <div>
          <div className="agents-label">Registry integrity</div>
          <div className="mt-2 flex items-center gap-2 text-sm font-medium text-[color:var(--agents-text)]">
            <span className="h-2 w-2 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.7)]" />
            Nominal
          </div>
        </div>
      </section>
    </div>
  );
}

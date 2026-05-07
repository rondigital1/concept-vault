import { StatusBadge } from '@/app/components/StatusBadge';
import {
  formatClockTime,
  formatDurationMs,
} from '@/app/components/workflowFormatting';
import { resolveAgentStateStatus } from './presentation';
import {
  workspaceEyebrowClassName,
  workspaceInsetSurfaceClassName,
  workspaceMutedCopyClassName,
  workspacePillClassName,
  workspaceShellPanelClassName,
} from './workspaceTheme';
import type { AgentRegistryEntry } from '@/lib/agentsWorkspaceTypes';

type Props = {
  agentRegistry: AgentRegistryEntry[];
  liveCount: number;
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

function AgentProfileCard({ entry }: { entry: AgentRegistryEntry }) {
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

export function AgentProfilesSection({ agentRegistry, liveCount }: Props) {
  return (
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
          <AgentProfileCard key={entry.key} entry={entry} />
        ))}
      </div>
    </section>
  );
}

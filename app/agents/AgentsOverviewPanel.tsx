import {
  formatClockTime,
  formatElapsedTime,
} from '@/app/components/workflowFormatting';
import { formatRunDescriptor } from './presentation';
import {
  workspaceEyebrowClassName,
  workspaceInsetSurfaceClassName,
  workspacePillClassName,
  workspaceShellPanelClassName,
} from './workspaceTheme';
import type {
  ExecutionEvent,
  RecentRunSummary,
} from '@/lib/agentsWorkspaceTypes';

type Props = {
  agentCount: number;
  liveCount: number;
  selectedTopicName: string | null;
  lastEvent: ExecutionEvent | null;
  latestRun: RecentRunSummary | null;
};

export function AgentsOverviewPanel({
  agentCount,
  liveCount,
  selectedTopicName,
  lastEvent,
  latestRun,
}: Props) {
  return (
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
            <span className={workspacePillClassName}>{agentCount} visible agents</span>
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
  );
}

'use client';

import { AgentProfilesSection } from './AgentProfilesSection';
import { AgentsOverviewPanel } from './AgentsOverviewPanel';
import { ExecutionFeedPanel } from './ExecutionFeedPanel';
import { RecentRunsPanel } from './RecentRunsPanel';
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
      <AgentsOverviewPanel
        agentCount={agentRegistry.length}
        liveCount={liveCount}
        selectedTopicName={selectedTopicName}
        lastEvent={lastEvent}
        latestRun={latestRun}
      />

      <AgentProfilesSection
        agentRegistry={agentRegistry}
        liveCount={liveCount}
      />

      <section
        id="agents-runs"
        className="grid gap-6 2xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]"
      >
        <RecentRunsPanel
          recentRuns={recentRuns}
          selectedRunId={selectedRunId}
          onRunSelect={onRunSelect}
        />
        <ExecutionFeedPanel executionEvents={executionEvents} />
      </section>
    </div>
  );
}

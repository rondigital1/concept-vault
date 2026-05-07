'use client';

import { AgentActivityTopicCard } from './AgentActivityTopicCard';
import { AgentEvidenceQueueCard } from './AgentEvidenceQueueCard';
import { AgentReportBufferCard } from './AgentReportBufferCard';
import { AgentWorkflowStageCard } from './AgentWorkflowStageCard';
import type { ActivityEntry } from './reviewViewModel';
import type {
  Artifact,
  DrawerKey,
  QueueFilter,
  SelectedTopicSummary,
  TopicWorkflowSummary,
} from './types';

export function AgentActivitySection({
  selectedTopic,
  selectedTopicId,
  workflowSummary,
  queueFilter,
  queueItems,
  pendingCount,
  savedCount,
  selectedArtifact,
  runDetailsHref,
  generateReportHref,
  recentRunCount,
  summarizeArtifact,
  activityEntries,
  onQueueFilterChange,
  onArtifactSelect,
  onDrawerOpen,
}: {
  selectedTopic: SelectedTopicSummary | null;
  selectedTopicId: string | null;
  workflowSummary: TopicWorkflowSummary;
  queueFilter: QueueFilter;
  queueItems: Artifact[];
  pendingCount: number;
  savedCount: number;
  selectedArtifact: Artifact | null;
  runDetailsHref: string;
  generateReportHref: string | null;
  recentRunCount: number;
  summarizeArtifact: (item: Artifact) => string;
  activityEntries: ActivityEntry[];
  onQueueFilterChange: (filter: QueueFilter) => void;
  onArtifactSelect: (artifactId: string) => void;
  onDrawerOpen: (drawer: DrawerKey) => void;
}) {
  const activeNodeCount = activityEntries.filter((entry) => entry.status === 'running').length;

  return (
    <section>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-[-0.05em] text-[color:var(--today-accent-strong)]">
            AGENT_ACTIVITY
          </h2>
          <p className="mt-2 text-sm text-[color:var(--today-muted)]">
            Real-time review state, agent traces, and report readiness for the selected topic.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 self-start rounded-full bg-[rgba(255,255,255,0.06)] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--today-text-soft)] outline outline-1 outline-[rgba(255,255,255,0.08)]">
          <span className="h-2 w-2 rounded-full bg-[color:var(--today-accent-strong)] animate-pulse" />
          {activeNodeCount} active node{activeNodeCount === 1 ? '' : 's'}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <AgentActivityTopicCard
          selectedTopic={selectedTopic}
          workflowSummary={workflowSummary}
          savedCount={savedCount}
          activityEntries={activityEntries}
        />

        <AgentWorkflowStageCard
          selectedTopic={selectedTopic}
          workflowSummary={workflowSummary}
          runDetailsHref={runDetailsHref}
          onDrawerOpen={onDrawerOpen}
        />

        <AgentReportBufferCard
          selectedTopic={selectedTopic}
          savedCount={savedCount}
          recentRunCount={recentRunCount}
          generateReportHref={generateReportHref}
        />

        <AgentEvidenceQueueCard
          selectedTopic={selectedTopic}
          selectedTopicId={selectedTopicId}
          workflowSummary={workflowSummary}
          queueFilter={queueFilter}
          queueItems={queueItems}
          pendingCount={pendingCount}
          savedCount={savedCount}
          selectedArtifact={selectedArtifact}
          summarizeArtifact={summarizeArtifact}
          onQueueFilterChange={onQueueFilterChange}
          onArtifactSelect={onArtifactSelect}
        />
      </div>
    </section>
  );
}

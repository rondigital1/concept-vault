'use client';

import { EvidenceDetailStack } from './EvidenceDetailStack';
import { EvidenceQueuePane } from './EvidenceQueuePane';
import type { Artifact, QueueFilter, SelectedTopicSummary, TopicWorkflowSummary } from './types';

type Props = {
  selectedTopic: SelectedTopicSummary | null;
  selectedTopicId: string | null;
  workflowSummary: TopicWorkflowSummary;
  queueFilter: QueueFilter;
  queueItems: Artifact[];
  pendingCount: number;
  savedCount: number;
  selectedArtifact: Artifact | null;
  summarizeArtifact: (item: Artifact) => string;
  onQueueFilterChange: (filter: QueueFilter) => void;
  onArtifactSelect: (artifactId: string) => void;
};

export function AgentEvidenceQueueCard({
  selectedTopic,
  selectedTopicId,
  workflowSummary,
  queueFilter,
  queueItems,
  pendingCount,
  savedCount,
  selectedArtifact,
  summarizeArtifact,
  onQueueFilterChange,
  onArtifactSelect,
}: Props) {
  return (
    <article id="today-queue" className="today-panel today-panel-low col-span-12 md:col-span-8 xl:col-span-8">
      <div className="min-h-[480px] min-[980px]:grid min-[980px]:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <div className="min-[980px]:min-h-0">
          <EvidenceQueuePane
            queueFilter={queueFilter}
            pendingCount={pendingCount}
            savedCount={savedCount}
            queueItems={queueItems}
            selectedArtifactId={selectedArtifact?.id ?? null}
            primaryAction={workflowSummary.primaryAction}
            topicId={selectedTopicId}
            topicName={selectedTopic?.name ?? null}
            lastCheckedAt={selectedTopic?.lastRunAt ?? null}
            onQueueFilterChange={onQueueFilterChange}
            onArtifactSelect={onArtifactSelect}
            summarizeArtifact={summarizeArtifact}
          />
        </div>

        <div className="hidden min-[980px]:flex min-[980px]:min-h-0 min-[980px]:flex-col">
          <EvidenceDetailStack
            queueFilter={queueFilter}
            selectedArtifact={selectedArtifact}
            summarizeArtifact={summarizeArtifact}
          />
        </div>
      </div>
    </article>
  );
}

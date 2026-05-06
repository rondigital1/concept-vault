'use client';

import { useEffect } from 'react';
import { AgentActivitySection } from './AgentActivitySection';
import { EmptyTopicWorkspace } from './EmptyTopicWorkspace';
import { EvidenceWorkspaceChrome } from './EvidenceWorkspaceChrome';
import { EvidenceWorkspaceHero } from './EvidenceWorkspaceHero';
import { MobileEvidenceDetailDrawer } from './MobileEvidenceDetailDrawer';
import { ReportMetadataDrawer } from './ReportMetadataDrawer';
import { TopicMetadataDrawer } from './TopicMetadataDrawer';
import type { ActivityEntry } from './reviewViewModel';
import type { Artifact, DrawerKey, QueueFilter, SelectedTopicSummary, TopicWorkflowSummary } from './types';

type Props = {
  displayDate: string;
  topics: SelectedTopicSummary[];
  selectedTopic: SelectedTopicSummary | null;
  selectedTopicId: string | null;
  workflowSummary: TopicWorkflowSummary;
  queueFilter: QueueFilter;
  queueItems: Artifact[];
  pendingCount: number;
  savedCount: number;
  selectedArtifact: Artifact | null;
  isSwitching: boolean;
  activeDrawer: DrawerKey | null;
  onTopicChange: (topicId: string) => void;
  onQueueFilterChange: (filter: QueueFilter) => void;
  onArtifactSelect: (artifactId: string) => void;
  onDrawerOpen: (drawer: DrawerKey) => void;
  onDrawerClose: () => void;
  runDetailsHref: string;
  refreshTopicHref: string;
  generateReportHref: string | null;
  extractConceptsHref: string;
  recentRunCount: number;
  summarizeArtifact: (item: Artifact) => string;
  activityEntries: ActivityEntry[];
};

export function EvidenceReviewWorkspace({
  displayDate,
  topics,
  selectedTopic,
  selectedTopicId,
  workflowSummary,
  queueFilter,
  queueItems,
  pendingCount,
  savedCount,
  selectedArtifact,
  isSwitching,
  activeDrawer,
  onTopicChange,
  onQueueFilterChange,
  onArtifactSelect,
  onDrawerOpen,
  onDrawerClose,
  runDetailsHref,
  refreshTopicHref,
  generateReportHref,
  extractConceptsHref,
  recentRunCount,
  summarizeArtifact,
  activityEntries,
}: Props) {
  useEffect(() => {
    if (activeDrawer !== 'evidence') {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onDrawerClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [activeDrawer, onDrawerClose]);

  if (topics.length === 0) {
    return (
      <EvidenceWorkspaceChrome
        displayDate={displayDate}
        selectedTopic={selectedTopic}
        onTopicInfoOpen={() => onDrawerOpen('topic')}
        onReportOpen={() => onDrawerOpen('report')}
        runDetailsHref={runDetailsHref}
      >
        <EmptyTopicWorkspace />
      </EvidenceWorkspaceChrome>
    );
  }

  return (
    <>
      <EvidenceWorkspaceChrome
        displayDate={displayDate}
        selectedTopic={selectedTopic}
        onTopicInfoOpen={() => onDrawerOpen('topic')}
        onReportOpen={() => onDrawerOpen('report')}
        runDetailsHref={runDetailsHref}
      >
        <main className="min-h-screen pb-12">
          <div className="mx-auto max-w-[1480px] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
            <EvidenceWorkspaceHero
              topics={topics}
              selectedTopic={selectedTopic}
              selectedTopicId={selectedTopicId}
              workflowSummary={workflowSummary}
              pendingCount={pendingCount}
              savedCount={savedCount}
              isSwitching={isSwitching}
              generateReportHref={generateReportHref}
              runDetailsHref={runDetailsHref}
              onTopicChange={onTopicChange}
            />

            <AgentActivitySection
              selectedTopic={selectedTopic}
              selectedTopicId={selectedTopicId}
              workflowSummary={workflowSummary}
              queueFilter={queueFilter}
              queueItems={queueItems}
              pendingCount={pendingCount}
              savedCount={savedCount}
              selectedArtifact={selectedArtifact}
              runDetailsHref={runDetailsHref}
              generateReportHref={generateReportHref}
              recentRunCount={recentRunCount}
              summarizeArtifact={summarizeArtifact}
              activityEntries={activityEntries}
              onQueueFilterChange={onQueueFilterChange}
              onArtifactSelect={onArtifactSelect}
              onDrawerOpen={onDrawerOpen}
            />
          </div>
        </main>
      </EvidenceWorkspaceChrome>

      <MobileEvidenceDetailDrawer
        isOpen={activeDrawer === 'evidence'}
        selectedArtifact={selectedArtifact}
        queueFilter={queueFilter}
        summarizeArtifact={summarizeArtifact}
        onClose={onDrawerClose}
      />

      <TopicMetadataDrawer
        isOpen={activeDrawer === 'topic'}
        onClose={onDrawerClose}
        selectedTopic={selectedTopic}
        workflowSummary={workflowSummary}
        runDetailsHref={runDetailsHref}
        refreshTopicHref={refreshTopicHref}
        generateReportHref={generateReportHref}
        extractConceptsHref={extractConceptsHref}
      />
      <ReportMetadataDrawer
        isOpen={activeDrawer === 'report'}
        onClose={onDrawerClose}
        latestReport={selectedTopic?.latestReport ?? null}
        topicName={selectedTopic?.name ?? null}
      />
    </>
  );
}

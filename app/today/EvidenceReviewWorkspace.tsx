'use client';

import { EvidenceDecisionBar } from './EvidenceDecisionBar';
import { EvidenceDetailPane } from './EvidenceDetailPane';
import { EvidenceQueuePane } from './EvidenceQueuePane';
import { EvidenceReviewHeader } from './EvidenceReviewHeader';
import { ReportMetadataDrawer } from './ReportMetadataDrawer';
import { TopicMetadataDrawer } from './TopicMetadataDrawer';
import type { Artifact, DrawerKey, SelectedTopicSummary, TopicWorkflowSummary } from './types';
import { inputClass, primaryButtonClass, sectionLabelClass } from './WorkspaceHeaderPrimitives';

type QueueFilter = 'pending' | 'saved';

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
  summarizeArtifact: (item: Artifact) => string;
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
  summarizeArtifact,
}: Props) {
  if (topics.length === 0) {
    return (
      <main className="min-h-screen pb-10">
        <div className="mx-auto max-w-[1120px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <section className="workbench-shell workbench-backdrop workbench-frame animate-workbench-enter overflow-hidden rounded-[36px]">
            <div className="px-6 py-8 sm:px-8">
              <p className={sectionLabelClass}>{displayDate}</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950">Evidence Review</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                Create a topic first. Once new source proposals arrive, this page becomes the place where you decide what evidence to keep.
              </p>
              <form action="/api/topics" method="POST" className="mt-8 grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium text-slate-800">
                    Topic name
                  </label>
                  <input
                    id="name"
                    name="name"
                    required
                    className={inputClass}
                    placeholder="Multi-agent AI research"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="focusTags" className="text-sm font-medium text-slate-800">
                    Focus tags
                  </label>
                  <input
                    id="focusTags"
                    name="focusTags"
                    className={inputClass}
                    placeholder="agents, research systems, evaluation"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label htmlFor="goal" className="text-sm font-medium text-slate-800">
                    Research brief
                  </label>
                  <textarea
                    id="goal"
                    name="goal"
                    required
                    rows={5}
                    className={inputClass}
                    placeholder="Track evidence, trace sources, and synthesize trustworthy findings."
                  />
                </div>
                <div className="md:col-span-2">
                  <button type="submit" className={primaryButtonClass}>
                    Create first topic
                  </button>
                </div>
              </form>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="min-h-screen pb-10">
        <div className="mx-auto max-w-[1560px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <section className="workbench-shell workbench-backdrop workbench-frame animate-workbench-enter overflow-hidden rounded-[36px]">
            <EvidenceReviewHeader
              displayDate={displayDate}
              topics={topics}
              selectedTopic={selectedTopic}
              selectedTopicId={selectedTopicId}
              pendingCount={pendingCount}
              savedCount={savedCount}
              workflowSummary={workflowSummary}
              isSwitching={isSwitching}
              runDetailsHref={runDetailsHref}
              onTopicChange={onTopicChange}
              onTopicInfoOpen={() => onDrawerOpen('topic')}
              onReportOpen={() => onDrawerOpen('report')}
            />

            <div className="grid min-h-[calc(100dvh-18rem)] grid-cols-1 xl:grid-cols-[380px_minmax(0,1fr)]">
              <EvidenceQueuePane
                queueFilter={queueFilter}
                pendingCount={pendingCount}
                savedCount={savedCount}
                queueItems={queueItems}
                selectedArtifactId={selectedArtifact?.id ?? null}
                onQueueFilterChange={onQueueFilterChange}
                onArtifactSelect={onArtifactSelect}
                summarizeArtifact={summarizeArtifact}
              />

              <div className="workbench-panel-surface min-h-0">
                <div className="flex h-full min-h-0 flex-col">
                  <EvidenceDetailPane
                    queueFilter={queueFilter}
                    selectedArtifact={selectedArtifact}
                    summarizeArtifact={summarizeArtifact}
                  />
                  <EvidenceDecisionBar selectedArtifact={selectedArtifact} />
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

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

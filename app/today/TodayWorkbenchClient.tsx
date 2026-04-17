'use client';

import { useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { EvidenceReviewWorkspace } from './EvidenceReviewWorkspace';
import { buildNextHref, getTopicForSelection, readDrawerKey, readQueueFilter } from './routeState';
import { deriveActivityFeed, deriveTopicWorkflowSummary, getTopicDetailRunMode, getTopicIdFromArtifact, summarizeArtifact } from './reviewViewModel';
import type { Artifact, DrawerKey, Run, TopicWorkspaceOption, WorkbenchTopic } from './types';
import type { QueueFilter } from './routeState';

type Props = {
  displayDate: string;
  topics: WorkbenchTopic[];
  runs: Run[];
  inbox: Artifact[];
  active: Artifact[];
  initialTopicId: string | null;
  initialArtifactId: string | null;
  initialQueueFilter: QueueFilter;
  initialDrawer: DrawerKey | null;
};

function sortByNewest<T extends { createdAt?: string; startedAt?: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const left = Date.parse(b.createdAt ?? b.startedAt ?? '');
    const right = Date.parse(a.createdAt ?? a.startedAt ?? '');
    return left - right;
  });
}

function buildRunHref(runMode: string, topicId: string | null): string {
  const params = new URLSearchParams({ runMode });
  if (topicId) {
    params.set('topicId', topicId);
  }
  return `/web-scout?${params.toString()}`;
}

export function TodayWorkbenchClient({
  displayDate,
  topics,
  runs,
  inbox,
  active,
  initialTopicId,
  initialArtifactId,
  initialQueueFilter,
  initialDrawer,
}: Props) {
  const [isSwitching, startViewTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selectedTopicId = getTopicForSelection(topics, searchParams.get('topicId') ?? initialTopicId);
  const queueFilter = readQueueFilter(searchParams.get('queue'), initialQueueFilter);
  const drawer = readDrawerKey(searchParams.get('drawer'), initialDrawer);
  const selectedTopic = topics.find((topic) => topic.id === selectedTopicId) ?? null;

  const pendingSourceProposals = sortByNewest(inbox.filter((item) => item.kind === 'web-proposal'));
  const savedSources = sortByNewest(
    active.filter((item) => item.kind === 'web-proposal' && (item.status === 'active' || item.status === 'approved')),
  );

  const pendingItems = selectedTopicId
    ? pendingSourceProposals.filter((item) => getTopicIdFromArtifact(item) === selectedTopicId)
    : pendingSourceProposals;
  const savedItems = selectedTopicId
    ? savedSources.filter((item) => getTopicIdFromArtifact(item) === selectedTopicId)
    : savedSources;

  const pendingCountByTopic = new Map<string, number>();
  for (const item of pendingSourceProposals) {
    const topicId = getTopicIdFromArtifact(item);
    if (!topicId) continue;
    pendingCountByTopic.set(topicId, (pendingCountByTopic.get(topicId) ?? 0) + 1);
  }

  const savedCountByTopic = new Map<string, number>();
  for (const item of savedSources) {
    const topicId = getTopicIdFromArtifact(item);
    if (!topicId) continue;
    savedCountByTopic.set(topicId, (savedCountByTopic.get(topicId) ?? 0) + 1);
  }

  const topicOptions: TopicWorkspaceOption[] = topics.map((topic) => ({
    ...topic,
    pendingCount: pendingCountByTopic.get(topic.id) ?? 0,
    savedCount: savedCountByTopic.get(topic.id) ?? 0,
  }));

  const queueItems = queueFilter === 'saved' ? savedItems : pendingItems;
  const selectedArtifactId = searchParams.get('artifactId') ?? initialArtifactId;
  const selectedArtifact = queueItems.find((item) => item.id === selectedArtifactId) ?? queueItems[0] ?? null;
  const workflowSummary = deriveTopicWorkflowSummary(selectedTopic, runs, pendingItems.length);
  const detailRunMode = getTopicDetailRunMode(selectedTopic, runs);
  const recentRunCount = runs.filter((r) => r.metadata?.topicId === selectedTopicId).length;
  const topicById = new Map(topics.map((t) => [t.id, t.name]));
  const activityEntries = deriveActivityFeed(runs, topicById);

  function navigate(updates: Parameters<typeof buildNextHref>[2]) {
    startViewTransition(() => {
      router.push(buildNextHref(pathname, searchParams, updates), { scroll: false });
    });
  }

  function handleTopicChange(topicId: string) {
    navigate({
      topicId,
      queue: 'pending',
      artifactId: null,
    });
  }

  function handleArtifactChange(artifactId: string) {
    const openEvidenceDrawer =
      typeof window !== 'undefined' && window.matchMedia('(max-width: 979px)').matches;

    navigate({
      artifactId,
      drawer: openEvidenceDrawer ? 'evidence' : null,
    });
  }

  function handleQueueFilterChange(nextFilter: QueueFilter) {
    navigate({
      queue: nextFilter,
      artifactId: null,
      drawer: null,
    });
  }

  function handleDrawerOpen(nextDrawer: DrawerKey) {
    navigate({ drawer: nextDrawer });
  }

  function handleDrawerClose() {
    navigate({ drawer: null });
  }

  return (
    <EvidenceReviewWorkspace
      displayDate={displayDate}
      topics={topicOptions}
      selectedTopic={selectedTopic ? topicOptions.find((topic) => topic.id === selectedTopic.id) ?? null : null}
      selectedTopicId={selectedTopicId}
      workflowSummary={workflowSummary}
      queueFilter={queueFilter}
      queueItems={queueItems}
      pendingCount={pendingItems.length}
      savedCount={savedItems.length}
      selectedArtifact={selectedArtifact}
      isSwitching={isSwitching}
      activeDrawer={drawer}
      onTopicChange={handleTopicChange}
      onQueueFilterChange={handleQueueFilterChange}
      onArtifactSelect={handleArtifactChange}
      onDrawerOpen={handleDrawerOpen}
      onDrawerClose={handleDrawerClose}
      runDetailsHref={buildRunHref(detailRunMode, selectedTopicId)}
      refreshTopicHref={buildRunHref('incremental_update', selectedTopicId)}
      generateReportHref={selectedTopic?.isReady ? buildRunHref('full_report', selectedTopicId) : null}
      extractConceptsHref={buildRunHref('concept_only', selectedTopicId)}
      recentRunCount={recentRunCount}
      summarizeArtifact={summarizeArtifact}
      activityEntries={activityEntries}
    />
  );
}

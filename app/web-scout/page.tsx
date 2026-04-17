import { Suspense } from 'react';
import Link from 'next/link';
import { requireSessionWorkspace } from '@/server/auth/workspaceContext';
import { WebScoutRunClient } from './WebScoutRunClient';
import { getSavedTopicsByIds } from '@/server/repos/savedTopics.repo';
import {
  listReportReadyTopics,
  listTopicsNeedingSources,
  MIN_LINKED_DOCUMENTS_FOR_REPORT,
} from '@/server/services/topicWorkflow.service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageSearchParams = Record<string, string | string[] | undefined>;

function firstQueryParam(value: string | string[] | undefined): string | undefined {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value) && typeof value[0] === 'string') {
    return value[0];
  }

  return undefined;
}

function getRunModeTitle(runMode: string): string {
  const labels: Record<string, string> = {
    full_report: 'Generate Report',
    incremental_update: 'Refresh Topic',
    scout_only: 'Find Sources',
    concept_only: 'Extract Concepts',
  };

  return labels[runMode] ?? 'Run Details';
}

export default async function WebScoutPage({
  searchParams,
}: {
  searchParams?: Promise<PageSearchParams> | PageSearchParams;
}) {
  const scope = await requireSessionWorkspace();
  const resolvedSearchParams = await Promise.resolve(searchParams ?? {});
  const runMode = firstQueryParam(resolvedSearchParams.runMode) ?? 'full_report';
  const requestedScope = firstQueryParam(resolvedSearchParams.scope);
  const topicId = firstQueryParam(resolvedSearchParams.topicId);
  const isBatchFindSources = runMode === 'scout_only' && requestedScope === 'all_topics';
  const requiresTopicSelection = runMode === 'full_report' && !topicId;
  const pageTitle = requiresTopicSelection ? 'Generate Report' : getRunModeTitle(runMode);
  const pageDescriptionMap: Record<string, string> = {
    full_report: 'Choose a ready topic, run the report, then open the finished result.',
    incremental_update: 'Refresh a topic to gather more usable sources and keep it ready for the next report.',
    scout_only: 'Find new source candidates to review and save into your library.',
    concept_only: 'Extract concepts and flashcards from the latest source material.',
  };
  const pageDescription = isBatchFindSources
    ? 'Run Find Sources across active topics that still need more material before they are ready for a report.'
    : pageDescriptionMap[runMode] ??
      'Live progress plus a clear summary of what this run created.';

  let reportTopicsError: string | null = null;
  let batchTopicsError: string | null = null;
  let selectedTopicName: string | null = null;
  let reportTopicOptions: Array<{
    id: string;
    name: string;
    goal: string;
    focusTags: string[];
    linkedDocumentCount: number;
    lastReportAt: string | null;
  }> = [];
  let batchTopicOptions: Array<{
    id: string;
    name: string;
    goal: string;
    focusTags: string[];
    linkedDocumentCount: number;
  }> = [];

  if (requiresTopicSelection) {
    try {
      const readyTopics = await listReportReadyTopics(scope, MIN_LINKED_DOCUMENTS_FOR_REPORT);
      reportTopicOptions = readyTopics.map((entry) => ({
        id: entry.topic.id,
        name: entry.topic.name,
        goal: entry.topic.goal,
        focusTags: entry.topic.focus_tags ?? [],
        linkedDocumentCount: entry.linkedDocumentCount,
        lastReportAt: entry.lastReportAt,
      }));
    } catch (error) {
      reportTopicsError =
        error instanceof Error ? error.message : 'Failed to load ready-to-generate topics';
    }
  }

  if (isBatchFindSources) {
    try {
      const topicsNeedingSources = await listTopicsNeedingSources(
        scope,
        MIN_LINKED_DOCUMENTS_FOR_REPORT,
      );
      batchTopicOptions = topicsNeedingSources.map((entry) => ({
        id: entry.topic.id,
        name: entry.topic.name,
        goal: entry.topic.goal,
        focusTags: entry.topic.focus_tags ?? [],
        linkedDocumentCount: entry.linkedDocumentCount,
      }));
    } catch (error) {
      batchTopicsError =
        error instanceof Error ? error.message : 'Failed to load topics that need more sources';
    }
  }

  if (topicId) {
    try {
      const topics = await getSavedTopicsByIds(scope, [topicId]);
      selectedTopicName = topics[0]?.name ?? null;
    } catch {
      selectedTopicName = null;
    }
  }

  return (
    <>
      <main className="today-screen relative min-h-screen pb-16 text-[color:var(--today-text)]">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[260px] w-[640px] -translate-x-1/2 rounded-full bg-[rgba(255,255,255,0.06)] blur-[120px]" />
        <div className="relative z-10 mx-auto max-w-[1320px] px-4 py-8 sm:px-6 lg:px-10">
          <header className="today-panel today-panel-low mb-6 overflow-hidden rounded-[32px] p-6 sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <p className="today-label">Research workflow</p>
                <h1 className="mt-4 text-[clamp(2.4rem,5vw,4.8rem)] font-black tracking-[-0.08em] text-[color:var(--today-accent-strong)]">
                  {pageTitle}
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-[color:var(--today-muted)]">
                  {pageDescription}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="inline-flex items-center rounded-full bg-[rgba(255,255,255,0.06)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--today-muted-strong)] outline outline-1 outline-[rgba(255,255,255,0.08)]">
                    Web Scout
                  </span>
                  <span className="inline-flex items-center rounded-full bg-[rgba(255,255,255,0.12)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--today-accent-strong)] outline outline-1 outline-[rgba(255,255,255,0.12)]">
                    {getRunModeTitle(runMode)}
                  </span>
                  {selectedTopicName ? (
                    <span className="inline-flex items-center rounded-full bg-[rgba(255,255,255,0.06)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--today-muted-strong)] outline outline-1 outline-[rgba(255,255,255,0.08)]">
                      Topic: {selectedTopicName}
                    </span>
                  ) : null}
                </div>
              </div>
              <Link
                href={topicId ? `/today?topicId=${topicId}` : '/today'}
                className="today-button-secondary"
              >
                Back to Research
              </Link>
            </div>
          </header>
          <Suspense
            fallback={
              <div className="today-panel today-panel-low rounded-[28px] p-5 text-sm text-[color:var(--today-muted)]">
                Preparing workflow run...
              </div>
            }
          >
            <WebScoutRunClient
              isBatchFindSources={isBatchFindSources}
              batchTopicOptions={batchTopicOptions}
              batchTopicsError={batchTopicsError}
              requiresTopicSelection={requiresTopicSelection}
              reportTopicOptions={reportTopicOptions}
              reportTopicsError={reportTopicsError}
              selectedTopicName={selectedTopicName}
              minimumLinkedDocumentsForReport={MIN_LINKED_DOCUMENTS_FOR_REPORT}
            />
          </Suspense>
        </div>
      </main>
    </>
  );
}

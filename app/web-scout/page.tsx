import { Suspense } from 'react';
import Link from 'next/link';
import { WebScoutRunClient } from './WebScoutRunClient';
import { client, ensureSchema } from '@/db';
import { getSavedTopicsByIds } from '@/server/repos/savedTopics.repo';
import {
  listReportReadyTopics,
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
  const resolvedSearchParams = await Promise.resolve(searchParams ?? {});
  const runMode = firstQueryParam(resolvedSearchParams.runMode) ?? 'full_report';
  const topicId = firstQueryParam(resolvedSearchParams.topicId);
  const requiresTopicSelection = runMode === 'full_report' && !topicId;
  const pageTitle = requiresTopicSelection ? 'Generate Report' : getRunModeTitle(runMode);
  const pageDescriptionMap: Record<string, string> = {
    full_report: 'Choose a ready topic, run the report, then open the finished result.',
    incremental_update: 'Refresh a topic to gather more usable sources and keep it ready for the next report.',
    scout_only: 'Find new source candidates to review and save into your library.',
    concept_only: 'Extract concepts and flashcards from the latest source material.',
  };
  const pageDescription =
    pageDescriptionMap[runMode] ??
    'Live progress plus a clear summary of what this run created.';

  let reportTopicsError: string | null = null;
  let selectedTopicName: string | null = null;
  let reportTopicOptions: Array<{
    id: string;
    name: string;
    goal: string;
    focusTags: string[];
    linkedDocumentCount: number;
    lastReportAt: string | null;
  }> = [];

  const schemaResult = await ensureSchema(client);
  if (!schemaResult.ok) {
    reportTopicsError = schemaResult.error || 'Failed to initialize database';
  } else {
    if (requiresTopicSelection) {
      try {
        const readyTopics = await listReportReadyTopics(MIN_LINKED_DOCUMENTS_FOR_REPORT);
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

    if (topicId) {
      try {
        const topics = await getSavedTopicsByIds([topicId]);
        selectedTopicName = topics[0]?.name ?? null;
      } catch {
        selectedTopicName = null;
      }
    }
  }

  return (
    <>
      <main className="min-h-screen pb-16 relative">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[220px] w-[480px] -translate-x-1/2 rounded-full bg-sky-500/5 blur-[90px]" />
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 relative z-10">
          <header className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">{pageTitle}</h1>
              <p className="text-zinc-400 mt-1">{pageDescription}</p>
            </div>
            <Link
              href="/today"
              className="text-sm text-zinc-300 bg-zinc-800 px-3 py-1.5 rounded-lg hover:bg-zinc-700 transition-colors"
            >
              Back to Research
            </Link>
          </header>
          <Suspense
            fallback={
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 text-sm text-zinc-400">
                Preparing workflow run...
              </div>
            }
          >
            <WebScoutRunClient
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

import { TodayClient } from './TodayClient';
import { TodayWorkbenchClient } from './TodayWorkbenchClient';
import { readDrawerKey } from './routeState';
import type { LatestReportPreview, PageSearchParams, TodayData, WorkbenchTopic } from './types';
import { asObject, firstQueryParam, formatDisplayDate, readNumber, readString } from './utils';
import { listSavedTopics, type SavedTopicRow } from '@/server/repos/savedTopics.repo';
import { requireSessionWorkspace } from '@/server/auth/workspaceContext';
import { getEvidenceReviewView } from '@/server/services/today.service';
import { listReportReadyTopics } from '@/server/services/topicWorkflow.service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function buildFallbackToday(): TodayData {
  return {
    date: new Date().toISOString().slice(0, 10),
    runs: [],
    inbox: [],
    active: [],
  };
}

export default async function TodayPage({
  searchParams,
}: {
  searchParams?: Promise<PageSearchParams> | PageSearchParams;
}) {
  const scope = await requireSessionWorkspace();
  const resolvedSearchParams = await Promise.resolve(searchParams ?? {});
  const requestedTopicId = firstQueryParam(resolvedSearchParams.topicId) ?? null;
  const requestedArtifactId = firstQueryParam(resolvedSearchParams.artifactId) ?? null;
  const requestedQueue = firstQueryParam(resolvedSearchParams.queue);
  const requestedDrawer = firstQueryParam(resolvedSearchParams.drawer);
  const artifactActionError = firstQueryParam(resolvedSearchParams.artifactActionError);
  const artifactActionInfo = firstQueryParam(resolvedSearchParams.artifactActionInfo);

  const [todayResult, topicsResult, reportReadyTopicsResult] = await Promise.allSettled([
    getEvidenceReviewView(scope),
    listSavedTopics(scope, { activeOnly: true }),
    listReportReadyTopics(scope),
  ]);

  const today = todayResult.status === 'fulfilled' ? todayResult.value : buildFallbackToday();
  if (todayResult.status === 'rejected') {
    console.error('Failed to load Research view:', todayResult.reason);
  }

  const savedTopics: SavedTopicRow[] = topicsResult.status === 'fulfilled' ? topicsResult.value : [];
  if (topicsResult.status === 'rejected') {
    console.error('Failed to load saved topics for Research page:', topicsResult.reason);
  }

  const reportReadyTopicById = new Map(
    (reportReadyTopicsResult.status === 'fulfilled' ? reportReadyTopicsResult.value : []).map((entry) => [
      entry.topic.id,
      entry,
    ]),
  );
  if (reportReadyTopicsResult.status === 'rejected') {
    console.error('Failed to load report-ready topics for Research page:', reportReadyTopicsResult.reason);
  }

  const approvedReports = [...(today.active ?? [])]
    .filter((item) => item.kind === 'research-report')
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const latestReportAtByTopic = new Map<string, string>();
  const latestReportByTopic = new Map<string, LatestReportPreview>();
  for (const report of approvedReports) {
    const topicId =
      typeof report.sourceRefs?.topicId === 'string' && report.sourceRefs.topicId.trim().length > 0
        ? report.sourceRefs.topicId
        : null;
    if (!topicId || latestReportAtByTopic.has(topicId)) {
      continue;
    }

    const content = asObject(report.content);
    const topicsCovered = Array.isArray(content?.topicsCovered)
      ? content.topicsCovered.filter((entry): entry is string => typeof entry === 'string')
      : [];
    const sourcesCount = typeof content?.sourcesCount === 'number' ? content.sourcesCount : null;
    const preview =
      readString(content?.executiveSummary) ??
      readString(content?.preview) ??
      readString(report.preview) ??
      null;

    latestReportAtByTopic.set(topicId, report.createdAt);
    latestReportByTopic.set(topicId, {
      id: report.id,
      title: readString(content?.title) ?? report.title,
      preview,
      day: report.day,
      createdAt: report.createdAt,
      topicsCovered,
      sourcesCount,
      link: `/reports/${report.id}`,
    });
  }

  const workbenchTopics: WorkbenchTopic[] = savedTopics
    .map((topic) => {
      const readyTopic = reportReadyTopicById.get(topic.id);
      return {
        id: topic.id,
        name: topic.name,
        goal: topic.goal,
        focusTags: topic.focus_tags ?? [],
        linkedDocumentCount:
          readyTopic?.linkedDocumentCount ??
          readNumber(asObject(topic.metadata)?.linkedDocumentCount) ??
          0,
        lastReportAt: readyTopic?.lastReportAt ?? latestReportAtByTopic.get(topic.id) ?? null,
        lastRunAt: topic.last_run_at,
        lastRunMode: topic.last_run_mode,
        isReady: Boolean(readyTopic),
        latestReport: latestReportByTopic.get(topic.id) ?? null,
      };
    })
    .sort((a, b) => Number(b.isReady) - Number(a.isReady) || Date.parse(b.lastRunAt ?? '') - Date.parse(a.lastRunAt ?? ''));

  const initialTopicId =
    (requestedTopicId && workbenchTopics.some((topic) => topic.id === requestedTopicId) ? requestedTopicId : null) ??
    workbenchTopics[0]?.id ??
    null;

  return (
    <>
      <TodayClient />
      {(artifactActionError || artifactActionInfo) && (
        <div className="relative z-20 mx-auto max-w-[1560px] px-4 pt-4 sm:px-6 lg:px-8">
          {artifactActionError && (
            <div className="rounded-[20px] bg-[rgba(143,58,58,0.18)] px-4 py-3 text-sm text-[#ffdada] outline outline-1 outline-[rgba(255,194,194,0.16)]">
              {artifactActionError}
            </div>
          )}
          {!artifactActionError && artifactActionInfo && (
            <div className="rounded-[20px] bg-[rgba(92,142,112,0.18)] px-4 py-3 text-sm text-[#e5f8ec] outline outline-1 outline-[rgba(152,225,184,0.18)]">
              {artifactActionInfo}
            </div>
          )}
        </div>
      )}
      <TodayWorkbenchClient
        displayDate={formatDisplayDate(today.date)}
        topics={workbenchTopics}
        runs={today.runs ?? []}
        inbox={today.inbox ?? []}
        active={today.active ?? []}
        initialTopicId={initialTopicId}
        initialArtifactId={requestedArtifactId}
        initialQueueFilter={requestedQueue === 'saved' ? 'saved' : 'pending'}
        initialDrawer={readDrawerKey(requestedDrawer ?? null, null)}
      />
    </>
  );
}

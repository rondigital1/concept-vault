import Link from 'next/link';
import { Card } from '@/app/components/Card';
import { EmptyState } from '@/app/components/EmptyState';
import { StatusBadge } from '@/app/components/StatusBadge';
import { formatClockTime, formatElapsedTime } from '@/app/components/workflowFormatting';
import { listSavedTopics, type SavedTopicRow } from '@/server/repos/savedTopics.repo';
import { getResearchView } from '@/server/services/today.service';
import { listReportReadyTopics } from '@/server/services/topicWorkflow.service';
import { TodayClient } from './TodayClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const MAX_REVIEW_ITEMS = 12;
const MAX_RECENT_OUTPUTS = 10;

type Run = {
  id: string;
  kind: string;
  status: 'running' | 'ok' | 'error' | 'partial';
  startedAt: string;
  endedAt?: string;
  steps?: Array<{
    name: string;
    status: 'running' | 'ok' | 'error' | 'skipped';
    startedAt?: string;
    endedAt?: string;
    error?: string;
  }>;
};

type Artifact = {
  id: string;
  runId: string | null;
  day: string;
  agent: string;
  kind: string;
  status: 'proposed' | 'approved' | 'rejected' | 'active';
  title: string;
  preview?: string;
  createdAt: string;
  sourceUrl?: string;
  sourceDocumentId?: string;
  sourceRefs?: Record<string, unknown>;
  content?: Record<string, unknown>;
};

type TodayData = {
  date: string;
  runs?: Run[];
  inbox?: Artifact[];
  active?: Artifact[];
};

type ReportReadyTopic = {
  id: string;
  name: string;
  goal: string;
  focusTags: string[];
  linkedDocumentCount: number;
  lastReportAt: string | null;
};

type PageSearchParams = Record<string, string | string[] | undefined>;

type TopicCard = {
  topic: SavedTopicRow;
  isReady: boolean;
  linkedDocumentCount: number;
  lastReportAt: string | null;
};

type NextAction = {
  title: string;
  description: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
};

function firstQueryParam(value: string | string[] | undefined): string | undefined {
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value) && typeof value[0] === 'string') {
    return value[0];
  }
  return undefined;
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function readString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readNumber(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }
  return value;
}

function formatTitleCase(value: string): string {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function KindBadge({ kind }: { kind: string }) {
  const labels: Record<string, string> = {
    'web-proposal': 'Source candidate',
    concept: 'Concept',
    flashcard: 'Flashcard',
    'research-report': 'Report',
  };

  const themes: Record<string, string> = {
    'web-proposal': 'border-amber-500/25 bg-amber-500/10 text-amber-200',
    concept: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200',
    flashcard: 'border-sky-500/25 bg-sky-500/10 text-sky-200',
    'research-report': 'border-rose-500/25 bg-rose-500/10 text-rose-200',
  };

  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${themes[kind] ?? 'border-zinc-700 bg-zinc-900 text-zinc-200'}`}
    >
      {labels[kind] ?? formatTitleCase(kind)}
    </span>
  );
}

function CountChip({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: number;
  tone?: 'default' | 'attention' | 'success';
}) {
  const tones: Record<string, string> = {
    default: 'border-zinc-700 bg-zinc-900/80 text-zinc-200',
    attention: 'border-amber-500/25 bg-amber-500/10 text-amber-100',
    success: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-100',
  };

  return (
    <div className={`rounded-full border px-3 py-1 text-xs ${tones[tone]}`}>
      <span className="font-semibold text-white">{value}</span> {label}
    </div>
  );
}

function formatShortDate(dateStr?: string | null): string {
  if (!dateStr) {
    return 'No report generated yet';
  }
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) {
    return 'No report generated yet';
  }
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDisplayDate(isoDate: string): string {
  const [yearStr, monthStr, dayStr] = isoDate.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return isoDate;
  }

  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }

  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function SectionHeader({
  title,
  count,
  countId,
}: {
  title: string;
  count?: number;
  countId?: string;
}) {
  return (
    <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-200">
      {title}
      {typeof count === 'number' && (
        <span
          id={countId}
          className="rounded-full border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[10px] font-medium tracking-normal text-zinc-100"
        >
          {count}
        </span>
      )}
    </h2>
  );
}

function artifactDetailHref(item: Artifact): string {
  if (item.kind === 'research-report') {
    return `/reports/${item.id}`;
  }
  return `/artifacts/${item.id}`;
}

function artifactPrimaryHref(item: Artifact): string {
  if (item.kind === 'research-report') {
    return `/reports/${item.id}`;
  }

  if (item.kind === 'web-proposal' && item.sourceDocumentId) {
    return `/library/${item.sourceDocumentId}`;
  }

  return `/artifacts/${item.id}`;
}

function artifactPrimaryLabel(item: Artifact): string {
  if (item.kind === 'research-report') {
    return 'Open report';
  }

  if (item.kind === 'web-proposal' && item.sourceDocumentId) {
    return 'Open in Library';
  }

  return 'View technical details';
}

function readTopicIdFromArtifact(item: Artifact): string | null {
  return readString(item.sourceRefs?.topicId);
}

function readLinkedDocumentCount(topic: SavedTopicRow, reportReadyTopic?: ReportReadyTopic): number {
  if (reportReadyTopic) {
    return reportReadyTopic.linkedDocumentCount;
  }

  const metadata = asObject(topic.metadata);
  return readNumber(metadata?.linkedDocumentCount) ?? 0;
}

function formatRunLabel(kind: string): string {
  const labels: Record<string, string> = {
    full_report: 'Generate report',
    incremental_update: 'Refresh topic',
    scout_only: 'Find sources',
    concept_only: 'Extract concepts',
    pipeline: 'Pipeline run',
  };

  return labels[kind] ?? formatTitleCase(kind);
}

export default async function TodayPage({
  searchParams,
}: {
  searchParams?: Promise<PageSearchParams> | PageSearchParams;
}) {
  const resolvedSearchParams = await Promise.resolve(searchParams ?? {});
  const artifactActionError = firstQueryParam(resolvedSearchParams.artifactActionError);
  const artifactActionInfo = firstQueryParam(resolvedSearchParams.artifactActionInfo);

  const [todayResult, topicsResult, reportReadyTopicsResult] = await Promise.allSettled([
    getResearchView(),
    listSavedTopics({ activeOnly: true }),
    listReportReadyTopics(),
  ]);

  const today: TodayData =
    todayResult.status === 'fulfilled'
      ? (todayResult.value as TodayData)
      : { date: new Date().toISOString().slice(0, 10), runs: [], inbox: [], active: [] };
  if (todayResult.status === 'rejected') {
    console.error('Failed to load Research view:', todayResult.reason);
  }

  const savedTopics: SavedTopicRow[] = topicsResult.status === 'fulfilled' ? topicsResult.value : [];
  if (topicsResult.status === 'rejected') {
    console.error('Failed to load saved topics for Research page:', topicsResult.reason);
  }

  const reportReadyTopics: ReportReadyTopic[] =
    reportReadyTopicsResult.status === 'fulfilled'
      ? reportReadyTopicsResult.value.map((entry) => ({
          id: entry.topic.id,
          name: entry.topic.name,
          goal: entry.topic.goal,
          focusTags: entry.topic.focus_tags ?? [],
          linkedDocumentCount: entry.linkedDocumentCount,
          lastReportAt: entry.lastReportAt,
        }))
      : [];
  if (reportReadyTopicsResult.status === 'rejected') {
    console.error('Failed to load report-ready topics for Research page:', reportReadyTopicsResult.reason);
  }

  const runs = today.runs ?? [];
  const inbox = today.inbox ?? [];
  const active = today.active ?? [];
  const displayedReviewItems = inbox.slice(0, MAX_REVIEW_ITEMS);
  const backlogOldestDay = inbox.length > 0 ? inbox[inbox.length - 1]?.day : undefined;
  const backlogNewestDay = inbox.length > 0 ? inbox[0]?.day : undefined;
  const displayDate = formatDisplayDate(today.date);

  const reportReadyTopicById = new Map(reportReadyTopics.map((topic) => [topic.id, topic]));

  const approvedReports = [...active]
    .filter((item) => item.kind === 'research-report')
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const latestReportAtByTopic = new Map<string, string>();
  for (const report of approvedReports) {
    const topicId = readTopicIdFromArtifact(report);
    if (topicId && !latestReportAtByTopic.has(topicId)) {
      latestReportAtByTopic.set(topicId, report.createdAt);
    }
  }

  const topics: TopicCard[] = [...savedTopics]
    .map((topic) => {
      const readyTopic = reportReadyTopicById.get(topic.id);
      return {
        topic,
        isReady: Boolean(readyTopic),
        linkedDocumentCount: readLinkedDocumentCount(topic, readyTopic),
        lastReportAt: readyTopic?.lastReportAt ?? latestReportAtByTopic.get(topic.id) ?? null,
      };
    })
    .sort((a, b) => Number(b.isReady) - Number(a.isReady));

  const firstReadyTopic = topics.find((topic) => topic.isReady);
  const firstTopicNeedingSources = topics.find((topic) => !topic.isReady);

  let nextAction: NextAction;
  if (inbox.length > 0) {
    nextAction = {
      title: 'Review the pending queue',
      description:
        inbox.length === 1
          ? 'One item is waiting for review. Clear that decision before starting the next run.'
          : `${inbox.length} items are waiting for review. Clear the strongest candidates first so future reports use the right material.`,
      primaryLabel: 'Open Review Queue',
      primaryHref: '#review-inbox',
    };
  } else if (firstReadyTopic) {
    nextAction = {
      title: `Generate the next report for ${firstReadyTopic.topic.name}`,
      description: `${firstReadyTopic.linkedDocumentCount} linked documents are ready for this topic. Turn that material into a finished report next.`,
      primaryLabel: 'Generate Report',
      primaryHref: `/web-scout?runMode=full_report&topicId=${firstReadyTopic.topic.id}`,
      secondaryLabel: 'Review Topics',
      secondaryHref: '#topics',
    };
  } else if (firstTopicNeedingSources) {
    nextAction = {
      title: `Refresh ${firstTopicNeedingSources.topic.name}`,
      description:
        firstTopicNeedingSources.linkedDocumentCount > 0
          ? `This topic has ${firstTopicNeedingSources.linkedDocumentCount} linked document${firstTopicNeedingSources.linkedDocumentCount === 1 ? '' : 's'} so far and needs more material before it is ready for a report.`
          : 'This topic still needs source material before it can generate a strong report. Refresh it next to gather more material.',
      primaryLabel: 'Refresh Topic',
      primaryHref: `/web-scout?runMode=incremental_update&topicId=${firstTopicNeedingSources.topic.id}`,
      secondaryLabel: 'Review Topics',
      secondaryHref: '#topics',
    };
  } else {
    nextAction = {
      title: 'Create your first topic',
      description:
        'Start with a topic so Concept Vault knows what to track, review, and turn into reports. Add content only if you need more source material first.',
      primaryLabel: 'Create Topic',
      primaryHref: '#create-topic',
      secondaryLabel: 'Add Content',
      secondaryHref: '/ingest',
    };
  }

  const recentOutputs = [...active].sort((a, b) => {
    const aIsReport = a.kind === 'research-report' ? 1 : 0;
    const bIsReport = b.kind === 'research-report' ? 1 : 0;
    if (aIsReport !== bIsReport) {
      return bIsReport - aIsReport;
    }
    return Date.parse(b.createdAt) - Date.parse(a.createdAt);
  });
  const latestReport = recentOutputs.find((item) => item.kind === 'research-report') ?? null;
  const displayedRecentOutputs = recentOutputs
    .filter((item) => item.id !== latestReport?.id)
    .slice(0, latestReport ? MAX_RECENT_OUTPUTS - 1 : MAX_RECENT_OUTPUTS);

  return (
    <>
      <TodayClient />
      <main className="relative min-h-screen pb-24">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[220px] w-[480px] -translate-x-1/2 rounded-full bg-sky-500/5 blur-[90px]" />

        <div className="relative z-10 mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <header className="mb-8 flex flex-col gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
                Research
              </h1>
              <p className="mt-2 max-w-3xl text-base text-zinc-300 sm:text-lg">
                Start with the next topic action, clear work that needs review, then open the latest outputs in Concept Vault.
              </p>
              <p className="mt-1 text-lg text-zinc-200 sm:text-xl">{displayDate}</p>
            </div>
          </header>

          {artifactActionError && (
            <section className="mb-6">
              <div className="rounded-xl border border-rose-700 bg-rose-950 px-4 py-3 text-sm text-rose-100">
                {artifactActionError}
              </div>
            </section>
          )}
          {!artifactActionError && artifactActionInfo && (
            <section className="mb-6">
              <div className="rounded-xl border border-emerald-700 bg-emerald-950 px-4 py-3 text-sm text-emerald-100">
                {artifactActionInfo}
              </div>
            </section>
          )}

          <section className="mb-8 scroll-mt-24">
            <Card className="border-white/10 bg-gradient-to-br from-zinc-950 via-zinc-950 to-zinc-900 p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-3xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Start Here</p>
                  <h2 className="mt-3 text-2xl font-semibold text-white">{nextAction.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-zinc-300">{nextAction.description}</p>
                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <Link
                      href={nextAction.primaryHref}
                      className="inline-flex items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-zinc-200"
                    >
                      {nextAction.primaryLabel}
                    </Link>
                    {nextAction.secondaryLabel && nextAction.secondaryHref && (
                      <Link
                        href={nextAction.secondaryHref}
                        className="inline-flex items-center justify-center rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-800"
                      >
                        {nextAction.secondaryLabel}
                      </Link>
                    )}
                  </div>
                </div>

                <div className="flex max-w-xl flex-wrap gap-2 lg:justify-end">
                  <CountChip label="pending review" value={inbox.length} tone={inbox.length > 0 ? 'attention' : 'default'} />
                  <CountChip label="ready topics" value={reportReadyTopics.length} tone={reportReadyTopics.length > 0 ? 'success' : 'default'} />
                  <CountChip label="topics needing sources" value={topics.filter((topic) => !topic.isReady).length} />
                  <CountChip label="recent outputs" value={active.length} />
                </div>
              </div>
            </Card>
          </section>

          <section id="review-inbox" data-review-inbox className="mb-8 scroll-mt-24">
            <Card className="border-zinc-800 bg-zinc-950">
              <div className="border-b border-zinc-800 p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <SectionHeader title="Review Queue" count={inbox.length} countId="review-inbox-count" />
                    <p className="mt-3 text-sm text-zinc-300">
                      Review items stay visible here even when they came from earlier runs. Save the best sources and approve the strongest learning outputs before starting the next report.
                    </p>
                    {inbox.length > 0 ? (
                      <p className="mt-2 text-xs text-zinc-400">
                        Showing the newest {displayedReviewItems.length} of {inbox.length} pending item{inbox.length === 1 ? '' : 's'}
                        {backlogOldestDay && backlogNewestDay
                          ? backlogOldestDay === backlogNewestDay
                            ? ` from ${formatDisplayDate(backlogNewestDay)}.`
                            : ` spanning ${formatDisplayDate(backlogOldestDay)} through ${formatDisplayDate(backlogNewestDay)}.`
                          : '.'}
                      </p>
                    ) : (
                      <p className="mt-2 text-xs text-zinc-400">
                        Nothing is waiting for review right now. New proposals from any day will appear here automatically.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="divide-y divide-zinc-800">
                {displayedReviewItems.length === 0 ? (
                  <EmptyState
                    icon="🗂️"
                    message="No review items are waiting right now."
                    className="!border-0 !bg-transparent !p-8"
                  />
                ) : (
                  displayedReviewItems.map((item) => {
                    const isSourceCandidate = item.kind === 'web-proposal';

                    return (
                      <div
                        key={item.id}
                        className="p-5 transition-colors hover:bg-zinc-900/60"
                        data-inbox-item={item.id}
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <KindBadge kind={item.kind} />
                              <span className="text-xs text-zinc-500">
                                Added {formatShortDate(item.createdAt)}
                              </span>
                            </div>
                            <h3 className="text-sm font-semibold text-zinc-50">{item.title}</h3>
                            {item.preview ? (
                              <p className="mt-2 line-clamp-3 text-sm text-zinc-300">{item.preview}</p>
                            ) : (
                              <p className="mt-2 text-sm italic text-zinc-500">No preview available.</p>
                            )}

                            {isSourceCandidate && item.sourceUrl && (
                              <div className="mt-3">
                                <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Source URL</p>
                                <a
                                  href={item.sourceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-1 inline-flex break-all text-xs text-blue-300 underline decoration-blue-300/50 underline-offset-2 hover:text-blue-200"
                                >
                                  {item.sourceUrl}
                                </a>
                              </div>
                            )}

                            {isSourceCandidate && (
                              <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
                                <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-200">What Approval Does</p>
                                <p className="mt-2 text-xs text-emerald-100">
                                  Saves this source into Library and makes it available for future topic refreshes and report runs.
                                </p>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 lg:max-w-[220px] lg:justify-end">
                            <form action={`/api/artifacts/${item.id}/approve`} method="POST">
                              <button
                                type="submit"
                                className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-300 transition-colors hover:border-green-500/40 hover:bg-green-500/20 focus:outline-none focus:ring-2 focus:ring-green-500/30"
                              >
                                {isSourceCandidate ? 'Save Source' : 'Approve'}
                              </button>
                            </form>
                            <form action={`/api/artifacts/${item.id}/reject`} method="POST">
                              <button
                                type="submit"
                                className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-300 transition-colors hover:border-red-500/40 hover:bg-red-500/20 focus:outline-none focus:ring-2 focus:ring-red-500/30"
                              >
                                {isSourceCandidate ? 'Dismiss' : 'Reject'}
                              </button>
                            </form>
                            <Link
                              href={artifactDetailHref(item)}
                              className="inline-flex text-xs text-blue-300 transition-colors hover:text-blue-200"
                            >
                              View technical details
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {inbox.length > displayedReviewItems.length && (
                <div className="border-t border-zinc-800 px-5 py-3 text-xs text-zinc-400">
                  Showing {displayedReviewItems.length} of {inbox.length} pending review items.
                </div>
              )}
            </Card>
          </section>

          <section id="topics" className="mb-8 scroll-mt-24">
            <Card className="border-zinc-800 bg-zinc-950">
              <div className="border-b border-zinc-800 p-5">
                <SectionHeader title="Topics" count={savedTopics.length} />
                <p className="mt-3 max-w-3xl text-sm text-zinc-300">
                  Use each topic’s primary action to move it forward. Ready topics can generate reports. Topics still building should be refreshed until they have enough source material.
                </p>

                <details id="create-topic" open={savedTopics.length === 0} className="mt-5 rounded-xl border border-zinc-800 bg-zinc-900/60">
                  <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-zinc-200 transition-colors hover:text-white">
                    Create Topic
                  </summary>
                  <div className="border-t border-zinc-800 px-4 py-4">
                    <form action="/api/topics" method="POST" className="space-y-3">
                      <div>
                        <label htmlFor="topic-name" className="mb-1.5 block text-xs text-zinc-300">
                          Topic Name
                        </label>
                        <input
                          id="topic-name"
                          name="name"
                          required
                          maxLength={80}
                          placeholder="e.g. Multi-agent systems"
                          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-400 focus:border-blue-300/40 focus:outline-none focus:ring-2 focus:ring-blue-300/40"
                        />
                      </div>
                      <div>
                        <label htmlFor="topic-goal" className="mb-1.5 block text-xs text-zinc-300">
                          What Do You Want to Learn?
                        </label>
                        <textarea
                          id="topic-goal"
                          name="goal"
                          required
                          maxLength={500}
                          rows={4}
                          placeholder="What should the agent focus on learning and finding?"
                          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-400 focus:border-blue-300/40 focus:outline-none focus:ring-2 focus:ring-blue-300/40"
                        />
                      </div>
                      <div>
                        <label htmlFor="topic-focus-tags" className="mb-1.5 block text-xs text-zinc-300">
                          Focus Tags (optional)
                        </label>
                        <input
                          id="topic-focus-tags"
                          name="focusTags"
                          maxLength={240}
                          placeholder="llms, retrieval, langgraph"
                          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-400 focus:border-blue-300/40 focus:outline-none focus:ring-2 focus:ring-blue-300/40"
                        />
                      </div>

                      <details className="rounded-xl border border-zinc-800 bg-zinc-950/70">
                        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-zinc-300 transition-colors hover:text-white">
                          Advanced Options
                        </summary>
                        <div className="grid grid-cols-1 gap-3 border-t border-zinc-800 px-4 py-4 sm:grid-cols-2">
                          <label className="flex items-center gap-2 text-xs text-zinc-300">
                            <input
                              type="checkbox"
                              name="isTracked"
                              value="true"
                              className="h-4 w-4 rounded border-zinc-600 bg-zinc-900 text-blue-400 focus:ring-blue-400/60"
                            />
                            Run automatically
                          </label>
                          <div>
                            <label htmlFor="topic-cadence" className="mb-1.5 block text-xs text-zinc-300">
                              Run frequency
                            </label>
                            <select
                              id="topic-cadence"
                              name="cadence"
                              defaultValue="weekly"
                              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-blue-300/40 focus:outline-none focus:ring-2 focus:ring-blue-300/40"
                            >
                              <option value="daily">Daily</option>
                              <option value="weekly">Weekly</option>
                            </select>
                          </div>
                        </div>
                      </details>

                      <button
                        type="submit"
                        className="inline-flex items-center justify-center rounded-lg bg-zinc-100 px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-white focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-zinc-900"
                      >
                        Save Topic
                      </button>
                    </form>
                  </div>
                </details>
              </div>

              <div className="divide-y divide-zinc-800">
                {topics.length === 0 ? (
                  <EmptyState
                    icon="🧭"
                    message="No topics yet. Create one to start the research workflow."
                    className="!border-0 !bg-transparent !p-8"
                  />
                ) : (
                  topics.map((entry) => (
                    <div
                      key={entry.topic.id}
                      className="flex flex-col gap-4 p-5 lg:flex-row lg:items-start lg:justify-between"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                              entry.isReady
                                ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200'
                                : 'border-amber-500/25 bg-amber-500/10 text-amber-200'
                            }`}
                          >
                            {entry.isReady ? 'Ready to generate' : 'Needs more sources'}
                          </span>
                          <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[11px] text-zinc-300">
                            {entry.linkedDocumentCount} linked doc{entry.linkedDocumentCount === 1 ? '' : 's'}
                          </span>
                          <span className="text-xs text-zinc-500">
                            Last report: {formatShortDate(entry.lastReportAt)}
                          </span>
                        </div>

                        <h3 className="text-sm font-semibold text-zinc-50">{entry.topic.name}</h3>
                        <p className="mt-2 line-clamp-2 text-sm text-zinc-300">{entry.topic.goal}</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 lg:max-w-[240px] lg:justify-end">
                        <Link
                          href={
                            entry.isReady
                              ? `/web-scout?runMode=full_report&topicId=${entry.topic.id}`
                              : `/web-scout?runMode=incremental_update&topicId=${entry.topic.id}`
                          }
                          className="inline-flex items-center justify-center rounded-lg bg-white px-3 py-2 text-sm font-semibold text-black transition-colors hover:bg-zinc-200"
                        >
                          {entry.isReady ? 'Generate Report' : 'Refresh Topic'}
                        </Link>
                        {entry.isReady && (
                          <Link
                            href={`/web-scout?runMode=incremental_update&topicId=${entry.topic.id}`}
                            className="inline-flex items-center justify-center rounded-lg border border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-800"
                          >
                            Refresh Topic
                          </Link>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </section>

          <section className="mb-8 scroll-mt-24">
            <Card className="border-zinc-800 bg-zinc-950">
              <div className="border-b border-zinc-800 p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <SectionHeader title="Recent Outputs" count={active.length} />
                    <p className="mt-3 text-sm text-zinc-300">
                      Open the latest report first when one exists. Other approved items stay here as recent saved output.
                    </p>
                  </div>
                  <Link
                    href="/reports"
                    className="inline-flex items-center justify-center rounded-lg border border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-800"
                  >
                    Open Reports
                  </Link>
                </div>
              </div>

              <div className="p-5">
                {latestReport ? (
                  <article className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="max-w-3xl">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-300">Latest Report</p>
                        <h3 className="mt-2 text-lg font-semibold text-white">{latestReport.title}</h3>
                        {latestReport.preview && (
                          <p className="mt-2 line-clamp-4 text-sm text-zinc-100">{latestReport.preview}</p>
                        )}
                        <p className="mt-3 text-xs text-emerald-100/80">
                          Generated {formatShortDate(latestReport.createdAt)}
                        </p>
                      </div>
                      <Link
                        href={artifactPrimaryHref(latestReport)}
                        className="inline-flex items-center justify-center rounded-lg bg-white px-3 py-2 text-sm font-semibold text-black transition-colors hover:bg-zinc-200"
                      >
                        Open Report
                      </Link>
                    </div>
                  </article>
                ) : null}

                {latestReport || displayedRecentOutputs.length > 0 ? (
                  <div className={`${latestReport ? 'mt-5' : ''} space-y-3`}>
                    {displayedRecentOutputs.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 sm:flex-row sm:items-start sm:justify-between"
                      >
                        <div className="min-w-0">
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <KindBadge kind={item.kind} />
                            <span className="text-xs text-zinc-500">
                              Saved {formatShortDate(item.createdAt)}
                            </span>
                          </div>
                          <h3 className="text-sm font-semibold text-zinc-50">{item.title}</h3>
                          {item.preview && (
                            <p className="mt-2 line-clamp-2 text-sm text-zinc-300">{item.preview}</p>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                          <Link
                            href={artifactPrimaryHref(item)}
                            className="inline-flex text-xs font-medium text-blue-300 transition-colors hover:text-blue-200"
                          >
                            {artifactPrimaryLabel(item)}
                          </Link>
                          {artifactPrimaryHref(item) !== artifactDetailHref(item) && (
                            <Link
                              href={artifactDetailHref(item)}
                              className="inline-flex text-xs text-zinc-400 transition-colors hover:text-zinc-200"
                            >
                              View technical details
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon="✨"
                    message="No approved outputs yet. Saved sources, concepts, and reports will appear here."
                    className="!border-0 !bg-transparent !p-8"
                  />
                )}
              </div>
            </Card>
          </section>

          <section className="scroll-mt-24">
            <details className="rounded-2xl border border-zinc-800 bg-zinc-950 shadow-[0_16px_50px_rgba(0,0,0,0.32)]">
              <summary className="cursor-pointer px-5 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-zinc-300 transition-colors hover:text-white">
                Recent Activity ({runs.length})
              </summary>
              <div className="border-t border-zinc-800">
                {runs.length === 0 ? (
                  <EmptyState
                    icon="🚀"
                    message="No recent activity yet. Start from a topic to generate activity here."
                    className="!border-0 !bg-transparent !p-8"
                  />
                ) : (
                  <div className="divide-y divide-zinc-800">
                    {runs.map((run) => (
                      <div key={run.id} className="p-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <StatusBadge status={run.status} />
                              <span className="text-sm font-medium text-white">{formatRunLabel(run.kind)}</span>
                            </div>
                            <p className="mt-2 text-xs text-zinc-500">
                              Started {formatClockTime(run.startedAt)} · {formatElapsedTime(run.startedAt, run.endedAt)}
                            </p>
                          </div>
                        </div>

                        {run.steps && run.steps.length > 0 && (
                          <details className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/60">
                            <summary className="cursor-pointer px-4 py-3 text-xs font-medium text-zinc-300 transition-colors hover:text-white">
                              {run.steps.length} step{run.steps.length === 1 ? '' : 's'}
                            </summary>
                            <div className="space-y-3 border-t border-zinc-800 px-4 py-4">
                              {run.steps.map((step, index) => (
                                <div
                                  key={`${step.name}-${index}`}
                                  className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-3"
                                >
                                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <StatusBadge status={step.status} />
                                      <span className="text-xs text-zinc-100">{step.name}</span>
                                    </div>
                                    <span className="text-xs font-mono text-zinc-500">
                                      {formatElapsedTime(step.startedAt, step.endedAt)}
                                    </span>
                                  </div>
                                  {step.error && (
                                    <p className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-200">
                                      {step.error}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </details>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </details>
          </section>
        </div>
      </main>
    </>
  );
}

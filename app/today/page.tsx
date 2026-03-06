import Link from 'next/link';
import { getAgentControlCenterView } from '@/server/services/today.service';
import { listSavedTopics, type SavedTopicRow } from '@/server/repos/savedTopics.repo';
import { listReportReadyTopics } from '@/server/services/topicWorkflow.service';
import { TodayClient } from './TodayClient';
import { TodayBackground } from './TodayBackground';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ---------- Types ----------
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

function firstQueryParam(value: string | string[] | undefined): string | undefined {
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value) && typeof value[0] === 'string') {
    return value[0];
  }
  return undefined;
}

// ---------- Local Components ----------

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    running: 'bg-amber-300/10 text-amber-200 border-amber-300/35',
    ok: 'bg-emerald-300/10 text-emerald-200 border-emerald-300/35',
    error: 'bg-rose-300/10 text-rose-200 border-rose-300/35',
    partial: 'bg-yellow-300/10 text-yellow-200 border-yellow-300/35',
    proposed: 'bg-sky-300/10 text-sky-200 border-sky-300/35',
    approved: 'bg-emerald-300/10 text-emerald-200 border-emerald-300/35',
    rejected: 'bg-zinc-300/10 text-zinc-200 border-zinc-300/25',
    active: 'bg-cyan-300/10 text-cyan-200 border-cyan-300/35',
    skipped: 'bg-zinc-300/10 text-zinc-300 border-zinc-300/20',
  };

  const isRunning = status === 'running';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${colors[status] || colors.proposed}`}
    >
      {isRunning && (
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
      )}
      {status}
    </span>
  );
}

function formatAgentName(agent: string): string {
  const aliases: Record<string, string> = {
    curator: 'Curator',
    distiller: 'Distiller',
    webScout: 'WebScout',
    research: 'Research',
  };

  if (aliases[agent]) {
    return aliases[agent];
  }

  return agent
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function AgentBadge({ agent }: { agent: string }) {
  const themes: Record<string, string> = {
    curator: 'border-sky-300/35 text-sky-100 bg-sky-300/10',
    distiller: 'border-emerald-300/35 text-emerald-100 bg-emerald-300/10',
    webScout: 'border-amber-300/35 text-amber-100 bg-amber-300/10',
    research: 'border-rose-300/35 text-rose-100 bg-rose-300/10',
  };

  const theme = themes[agent] || 'border-zinc-300/25 text-zinc-100 bg-zinc-300/10';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] ${theme}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-75" />
      {formatAgentName(agent)}
    </span>
  );
}

function EmptyState({ icon, message }: { icon: string; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-zinc-500">
      <span className="text-2xl mb-2">{icon}</span>
      <p className="text-sm text-center">{message}</p>
    </div>
  );
}

function formatDuration(startedAt?: string, endedAt?: string): string {
  if (!startedAt) {
    return '—';
  }
  const start = new Date(startedAt).getTime();
  const end = endedAt ? new Date(endedAt).getTime() : Date.now();
  const ms = end - start;

  if (ms < 1000) {
    return `${ms}ms`;
  }
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

function formatTime(dateStr?: string): string {
  if (!dateStr) {
    return '—';
  }
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateTime(dateStr?: string): string {
  if (!dateStr) {
    return '—';
  }
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) {
    return '—';
  }
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatShortDate(dateStr?: string | null): string {
  if (!dateStr) {
    return 'No report yet';
  }
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) {
    return 'No report yet';
  }
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return String(value ?? '');
  }
}

function artifactDetailHref(item: Artifact): string {
  if (item.kind === 'research-report') {
    return `/reports/${item.id}`;
  }
  return `/artifacts/${item.id}`;
}

function formatDisplayDate(isoDate: string): string {
  const [yearStr, monthStr, dayStr] = isoDate.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
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

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-zinc-800 bg-zinc-950 shadow-[0_16px_50px_rgba(0,0,0,0.32)] ${className}`}
    >
      {children}
    </div>
  );
}

// ---------- Page Component ----------

export default async function TodayPage({
  searchParams,
}: {
  searchParams?: Promise<PageSearchParams> | PageSearchParams;
}) {
  const resolvedSearchParams = await Promise.resolve(searchParams ?? {});
  const artifactActionError = firstQueryParam(resolvedSearchParams.artifactActionError);
  const artifactActionInfo = firstQueryParam(resolvedSearchParams.artifactActionInfo);

  const [todayResult, topicsResult, reportReadyTopicsResult] = await Promise.allSettled([
    getAgentControlCenterView(),
    listSavedTopics({ activeOnly: true }),
    listReportReadyTopics(),
  ]);

  const today: TodayData =
    todayResult.status === 'fulfilled'
      ? (todayResult.value as TodayData)
      : { date: new Date().toISOString().slice(0, 10), runs: [], inbox: [], active: [] };
  if (todayResult.status === 'rejected') {
    console.error('Failed to load Agent Control Center view:', todayResult.reason);
  }

  const savedTopics: SavedTopicRow[] =
    topicsResult.status === 'fulfilled' ? topicsResult.value : [];
  if (topicsResult.status === 'rejected') {
    console.error('Failed to load saved topics for Agent Control Center page:', topicsResult.reason);
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
    console.error('Failed to load report-ready topics for Agent Control Center page:', reportReadyTopicsResult.reason);
  }

  const runs = today.runs ?? [];
  const inbox = today.inbox ?? [];
  const active = today.active ?? [];
  const articleInbox = inbox.filter((item) => item.kind === 'web-proposal');
  const otherInbox = inbox.filter((item) => item.kind !== 'web-proposal');
  const reportReadyTopicIds = new Set(reportReadyTopics.map((topic) => topic.id));
  const topicsNeedingMoreSources = savedTopics.filter((topic) => !reportReadyTopicIds.has(topic.id));
  const displayDate = formatDisplayDate(today.date);

  return (
    <>
      <TodayBackground />
      <TodayClient />
      <main className="min-h-screen pb-24 relative">
        {/* Ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-white/3 blur-[100px] rounded-full pointer-events-none" />

        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 relative z-10">
          {/* Header */}
          <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight">
                Agent Control Center
              </h1>
              <p className="mt-2 text-lg text-zinc-200 sm:text-xl">{displayDate}</p>
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

          <section className="mb-8">
            <Card className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <SectionHeader title="Simple Workflow" />
                <p className="text-xs text-zinc-300">
                  Choose a topic, review found articles, then open the finished report.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-sky-300">1. Choose Topic</p>
                  <p className="mt-2 text-sm text-white">Start with a saved topic that already has enough material.</p>
                  <p className="mt-2 text-xs text-zinc-400">
                    Report-ready topics appear first below with a direct Generate Report button.
                  </p>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-amber-300">2. Review Articles</p>
                  <p className="mt-2 text-sm text-white">Approve good sources to save them into Library.</p>
                  <p className="mt-2 text-xs text-zinc-400">
                    Approved articles are used by future topic refreshes and future reports.
                  </p>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-300">3. Read Report</p>
                  <p className="mt-2 text-sm text-white">Open the report card when the run finishes.</p>
                  <p className="mt-2 text-xs text-zinc-400">
                    Reports stay available from the Reports page for later review.
                  </p>
                </div>
              </div>
            </Card>
          </section>

          <section className="mb-8" id="topic-management">
            <Card className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <SectionHeader title="Choose Topic" count={savedTopics.length} />
                <p className="text-xs text-zinc-300">
                  Topics ready for reports are listed first. Other topics can be refreshed until they are ready.
                </p>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-[1.4fr,0.9fr] gap-6">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Ready For Reports</h3>
                    <p className="mt-1 text-xs text-zinc-400">
                      These topics already have enough linked material for a solid report.
                    </p>
                    {reportReadyTopics.length === 0 ? (
                      <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                        <p className="text-sm text-zinc-200">
                          No topics are report-ready yet. Add a topic or refresh an existing one to gather more sources first.
                        </p>
                      </div>
                    ) : (
                      <div className="mt-3 grid gap-3 lg:grid-cols-2">
                        {reportReadyTopics.map((topic) => (
                          <div
                            key={topic.id}
                            className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-4"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-white">{topic.name}</p>
                              <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-200">
                                {topic.linkedDocumentCount} linked docs
                              </span>
                            </div>
                            <p className="mt-2 text-sm text-zinc-300">{topic.goal}</p>
                            <p className="mt-2 text-xs text-zinc-400">
                              Last report: {formatShortDate(topic.lastReportAt)}
                            </p>
                            {topic.focusTags.length > 0 && (
                              <p className="mt-2 text-xs text-zinc-500">
                                Tags: {topic.focusTags.slice(0, 6).join(', ')}
                              </p>
                            )}
                            <div className="mt-4 flex flex-wrap gap-2">
                              <Link
                                href={`/web-scout?runMode=full_report&topicId=${topic.id}`}
                                className="inline-flex items-center justify-center rounded-lg bg-white px-3 py-2 text-sm font-semibold text-black hover:bg-zinc-200 transition-colors"
                              >
                                Generate Report
                              </Link>
                              <Link
                                href={`/web-scout?runMode=incremental_update&topicId=${topic.id}`}
                                className="inline-flex items-center justify-center rounded-lg border border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-800 transition-colors"
                              >
                                Refresh Topic
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-white">Needs More Sources</h3>
                    <p className="mt-1 text-xs text-zinc-400">
                      Refresh these topics first. Once they gather enough linked material, they move into the report-ready list above.
                    </p>
                    {topicsNeedingMoreSources.length === 0 ? (
                      <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                        <p className="text-sm text-zinc-200">
                          Every saved topic is currently report-ready.
                        </p>
                      </div>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {topicsNeedingMoreSources.map((topic) => (
                          <div
                            key={topic.id}
                            className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900/80 p-4 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold text-white">{topic.name}</p>
                                <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-200">
                                  Build topic first
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-zinc-400 line-clamp-2">{topic.goal}</p>
                            </div>
                            <Link
                              href={`/web-scout?runMode=incremental_update&topicId=${topic.id}`}
                              className="inline-flex items-center justify-center rounded-lg border border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-800 transition-colors"
                            >
                              Refresh Topic
                            </Link>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3 pt-1">
                    <Link
                      href="/web-scout?runMode=scout_only"
                      className="inline-flex items-center justify-center rounded-lg bg-amber-300 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-200 transition-colors"
                    >
                      Find New Sources
                    </Link>
                    <Link
                      href="/web-scout?runMode=concept_only"
                      className="inline-flex items-center justify-center rounded-lg bg-sky-400 px-4 py-2 text-sm font-semibold text-black hover:bg-sky-300 transition-colors"
                    >
                      Refresh Concepts
                    </Link>
                    <Link
                      href="/reports"
                      className="inline-flex items-center justify-center rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-800 transition-colors"
                    >
                      Open Reports
                    </Link>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-white mb-3">Add Topic</h3>
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
                        Learning Goal
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label className="flex items-center gap-2 text-xs text-zinc-300">
                        <input
                          type="checkbox"
                          name="isTracked"
                          value="true"
                          className="h-4 w-4 rounded border-zinc-600 bg-zinc-900 text-blue-400 focus:ring-blue-400/60"
                        />
                        Track on schedule
                      </label>
                      <div>
                        <label htmlFor="topic-cadence" className="mb-1.5 block text-xs text-zinc-300">
                          Cadence
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
                    <button
                      type="submit"
                      className="px-4 py-2.5 bg-zinc-100 text-black text-sm font-semibold rounded-lg hover:bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-zinc-900"
                    >
                      Save Topic
                    </button>
                  </form>
                </div>
              </div>
            </Card>
          </section>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              <section data-review-inbox className="space-y-4">
                <Card className="p-4">
                  <SectionHeader title="Review Inbox" count={inbox.length} countId="review-inbox-count" />
                  <p className="mt-3 text-sm text-zinc-300">
                    Found articles are reviewed here first. Approving an article saves it into Library and makes it available for future topic refreshes and report runs.
                  </p>
                </Card>

                <Card className="border-zinc-700 bg-zinc-950">
                  <div className="border-b border-zinc-700 p-4">
                    <SectionHeader title="Found Articles" count={articleInbox.length} />
                  </div>
                  <div className="divide-y divide-zinc-700/80">
                    {articleInbox.length === 0 ? (
                      <EmptyState
                        icon="📰"
                        message="No found articles waiting for review."
                      />
                    ) : (
                      articleInbox.map((item) => (
                        <div
                          key={item.id}
                          className="group p-4 transition-colors hover:bg-zinc-900/70"
                          data-inbox-item={item.id}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="mb-1.5 flex items-center gap-2">
                                <StatusBadge status={item.status} />
                                <AgentBadge agent={item.agent} />
                                <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-200">
                                  Found article
                                </span>
                              </div>
                              <h3 className="text-sm font-semibold text-zinc-50">
                                {item.title}
                              </h3>
                              {item.preview ? (
                                <p className="mt-1 line-clamp-3 text-xs text-zinc-200">
                                  {item.preview}
                                </p>
                              ) : (
                                <p className="mt-1 text-xs italic text-zinc-400">
                                  No preview available
                                </p>
                              )}
                            </div>
                          </div>

                          {item.sourceUrl && (
                            <div className="mt-3">
                              <p className="text-[11px] uppercase tracking-wider text-zinc-400">Source URL</p>
                              <a
                                href={item.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-1 inline-flex text-xs text-blue-300 underline decoration-blue-300/50 underline-offset-2 break-all hover:text-blue-200"
                              >
                                {item.sourceUrl}
                              </a>
                            </div>
                          )}

                          <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-200">What Approval Does</p>
                            <p className="mt-2 text-xs text-emerald-100">
                              Saves this article into Library, avoids duplicate imports if it is already there, and lets future topic refreshes and future reports use it.
                            </p>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <form action={`/api/artifacts/${item.id}/approve`} method="POST">
                              <button
                                type="submit"
                                className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-300 transition-colors hover:bg-green-500/20 hover:border-green-500/40 focus:outline-none focus:ring-2 focus:ring-green-500/30"
                              >
                                Approve and Save to Library
                              </button>
                            </form>
                            <form action={`/api/artifacts/${item.id}/reject`} method="POST">
                              <button
                                type="submit"
                                className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/20 hover:border-red-500/40 focus:outline-none focus:ring-2 focus:ring-red-500/30"
                              >
                                Reject Source
                              </button>
                            </form>
                          </div>

                          <details className="mt-3">
                            <summary className="cursor-pointer text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors">
                              Show raw details
                            </summary>
                            <div className="mt-2 space-y-3 rounded-lg border border-zinc-700 bg-zinc-900 p-3">
                              <dl className="text-xs space-y-1">
                                <div className="flex gap-2">
                                  <dt className="text-zinc-400">Created:</dt>
                                  <dd className="text-zinc-200">{formatDateTime(item.createdAt)}</dd>
                                </div>
                                <div className="flex gap-2">
                                  <dt className="text-zinc-400">Run ID:</dt>
                                  <dd className="font-mono text-zinc-200 break-all">{item.runId ?? '—'}</dd>
                                </div>
                              </dl>
                              {item.content && (
                                <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-zinc-700 bg-zinc-950 p-2 text-[11px] text-zinc-100">
                                  {safeJson(item.content)}
                                </pre>
                              )}
                              <Link
                                href={artifactDetailHref(item)}
                                className="inline-flex text-xs text-blue-300 hover:text-blue-200 transition-colors"
                              >
                                Open full page
                              </Link>
                            </div>
                          </details>
                        </div>
                      ))
                    )}
                  </div>
                </Card>

                <Card>
                  <div className="border-b border-zinc-800 p-4">
                    <SectionHeader title="Other Review Items" count={otherInbox.length} />
                  </div>
                  <div className="divide-y divide-zinc-800">
                    {otherInbox.length === 0 ? (
                      <EmptyState
                        icon="🗂️"
                        message="No other review items waiting."
                      />
                    ) : (
                      otherInbox.map((item) => (
                        <div
                          key={item.id}
                          className="p-4 transition-colors hover:bg-zinc-900/70"
                          data-inbox-item={item.id}
                        >
                          <div className="mb-1.5 flex items-center gap-2">
                            <StatusBadge status={item.status} />
                            <AgentBadge agent={item.agent} />
                          </div>
                          <h3 className="text-sm font-semibold text-zinc-50">
                            {item.title}
                          </h3>
                          {item.preview ? (
                            <p className="mt-1 line-clamp-2 text-xs text-zinc-200">
                              {item.preview}
                            </p>
                          ) : (
                            <p className="mt-1 text-xs italic text-zinc-400">
                              No preview available
                            </p>
                          )}
                          <p className="mt-2 text-[11px] text-zinc-400">
                            Approving marks this item as active.
                          </p>
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <form action={`/api/artifacts/${item.id}/approve`} method="POST">
                              <button
                                type="submit"
                                className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-300 transition-colors hover:bg-green-500/20 hover:border-green-500/40 focus:outline-none focus:ring-2 focus:ring-green-500/30"
                              >
                                Approve
                              </button>
                            </form>
                            <form action={`/api/artifacts/${item.id}/reject`} method="POST">
                              <button
                                type="submit"
                                className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/20 hover:border-red-500/40 focus:outline-none focus:ring-2 focus:ring-red-500/30"
                              >
                                Reject
                              </button>
                            </form>
                            <Link
                              href={artifactDetailHref(item)}
                              className="inline-flex text-xs text-blue-300 hover:text-blue-200 transition-colors"
                            >
                              Open details
                            </Link>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              </section>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Active */}
              <section>
                <Card>
                  <div className="border-b border-zinc-800 p-4">
                    <SectionHeader title="Active" count={active.length} />
                  </div>
                  <div className="divide-y divide-zinc-800">
                    {active.length === 0 ? (
                      <EmptyState
                        icon="✨"
                        message="Nothing active right now. Approve some proposals!"
                      />
                    ) : (
                      active.map((item) => (
                        <Link
                          key={item.id}
                          href={artifactDetailHref(item)}
                          className="block p-4 transition-colors hover:bg-zinc-900"
                        >
                          <div className="mb-1.5 flex items-center gap-2">
                            <StatusBadge status={item.status} />
                            <AgentBadge agent={item.agent} />
                          </div>
                          <h3 className="text-sm font-semibold text-zinc-50">
                            {item.title}
                          </h3>
                          {item.preview && (
                            <p className="mt-1 line-clamp-2 text-xs text-zinc-200">
                              {item.preview}
                            </p>
                          )}
                          <p className="mt-2 text-[11px] text-zinc-300">
                            Open details →
                          </p>
                        </Link>
                      ))
                    )}
                  </div>
                </Card>
              </section>

              {/* Run Timeline */}
              <section>
                <Card>
                  <div className="border-b border-zinc-800 p-4">
                    <SectionHeader title="Run Timeline" count={runs.length} />
                  </div>
                  <div className="divide-y divide-zinc-800">
                    {runs.length === 0 ? (
                      <EmptyState
                        icon="🚀"
                        message="No recent runs. Launch an agent to get started."
                      />
                    ) : (
                      runs.map((run) => (
                        <div key={run.id} className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <StatusBadge status={run.status} />
                              <span className="text-sm font-medium text-white capitalize">
                                {run.kind}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-zinc-500">
                              <span>{formatTime(run.startedAt)}</span>
                              <span className="font-mono">
                                {formatDuration(run.startedAt, run.endedAt)}
                              </span>
                            </div>
                          </div>

                          {/* Steps */}
                          {run.steps && run.steps.length > 0 && (
                            <details className="mt-2">
                              <summary className="cursor-pointer text-xs text-zinc-300 transition-colors hover:text-zinc-100">
                                {run.steps.length} step{run.steps.length !== 1 ? 's' : ''}
                              </summary>
                              <div className="mt-2 space-y-1.5">
                                {run.steps.map((step, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-xs"
                                  >
                                    <div className="flex items-center gap-2">
                                      <StatusBadge status={step.status} />
                                      <span className="text-zinc-100">{step.name}</span>
                                    </div>
                                    <span className="text-zinc-500 font-mono">
                                      {formatDuration(step.startedAt, step.endedAt)}
                                    </span>
                                  </div>
                                ))}
                                {run.steps.some((s) => s.error) && (
                                  <div className="mt-2">
                                    {run.steps
                                      .filter((s) => s.error)
                                      .map((s, idx) => (
                                        <div
                                          key={idx}
                                          className="p-2 bg-red-500/10 border border-red-500/20 rounded-lg"
                                        >
                                          <div className="flex items-center justify-between mb-1">
                                            <span className="text-xs font-medium text-red-400">
                                              Error in {s.name}
                                            </span>
                                            <button
                                              type="button"
                                              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                                              data-copy-error={s.error}
                                              title="Copy error"
                                            >
                                              Copy
                                            </button>
                                          </div>
                                          <p className="text-xs text-red-300/80 font-mono truncate">
                                            {s.error}
                                          </p>
                                        </div>
                                      ))}
                                  </div>
                                )}
                              </div>
                            </details>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              </section>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

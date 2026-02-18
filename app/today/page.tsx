import Link from 'next/link';
import { getTodayView } from '@/server/services/today.service';
import { listSavedTopics, type SavedTopicRow } from '@/server/repos/savedTopics.repo';
import { TodayClient } from './TodayClient';
import { TodayBackground } from './TodayBackground';

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
  agent: string;
  kind: string;
  status: 'proposed' | 'approved' | 'rejected' | 'active';
  title: string;
  preview?: string;
};

type TodayData = {
  date: string;
  runs?: Run[];
  inbox?: Artifact[];
  active?: Artifact[];
};

// ---------- Local Components ----------

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    running: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    ok: 'bg-green-500/20 text-green-400 border-green-500/30',
    error: 'bg-red-500/20 text-red-400 border-red-500/30',
    partial: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    proposed: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    approved: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    rejected: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
    active: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    skipped: 'bg-zinc-500/20 text-zinc-500 border-zinc-500/30',
  };

  const isRunning = status === 'running';

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full border ${colors[status] || colors.proposed}`}
    >
      {isRunning && (
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
      )}
      {status}
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

function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
      {title}
      {typeof count === 'number' && (
        <span className="text-xs font-normal bg-zinc-800 px-2 py-0.5 rounded-full">
          {count}
        </span>
      )}
    </h2>
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-zinc-900/50 border border-zinc-800 rounded-xl backdrop-blur-sm ${className}`}>
      {children}
    </div>
  );
}

// ---------- Page Component ----------

export default async function TodayPage() {
  const today = (await getTodayView()) as TodayData;
  let savedTopics: SavedTopicRow[] = [];

  try {
    savedTopics = await listSavedTopics({ activeOnly: true });
  } catch (error) {
    console.error('Failed to load saved topics for Today page:', error);
  }

  const runs = today.runs ?? [];
  const inbox = today.inbox ?? [];
  const active = today.active ?? [];

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
              <h1 className="text-3xl font-bold text-white tracking-tight">
                Agent Control Center
              </h1>
              <p className="text-zinc-400 mt-1">{today.date}</p>
            </div>
            <nav className="flex items-center gap-3">
              <Link
                href="/library"
                className="text-sm text-zinc-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-zinc-800"
              >
                Library
              </Link>
              <Link
                href="/ingest"
                className="text-sm text-zinc-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-zinc-800"
              >
                Ingest
              </Link>
              <Link
                href="/today"
                className="text-sm text-zinc-300 bg-zinc-800 px-3 py-1.5 rounded-lg hover:bg-zinc-700 transition-colors flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </Link>
            </nav>
          </header>

          {/* Run Controls */}
          <section className="mb-8">
            <Card className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <SectionHeader title="Run Agents" />
                <p className="text-xs text-zinc-500">
                  Proposed → Approved → Active
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <form action="/api/runs/distill" method="POST">
                  <button
                    type="submit"
                    className="group relative px-6 py-3 bg-white text-black font-semibold rounded-xl transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(255,255,255,0.15)] focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-zinc-900"
                  >
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Distill
                    </span>
                    <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      D
                    </span>
                  </button>
                </form>
                <form action="/api/runs/curate" method="POST">
                  <button
                    type="submit"
                    className="group relative px-6 py-3 bg-zinc-800 text-white font-semibold rounded-xl border border-zinc-700 transition-all duration-200 hover:bg-zinc-700 hover:border-zinc-600 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-zinc-500/50 focus:ring-offset-2 focus:ring-offset-zinc-900"
                  >
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      Curate
                    </span>
                    <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      U
                    </span>
                  </button>
                </form>
                <form action="/api/runs/distill-curate" method="POST">
                  <button
                    type="submit"
                    className="group relative px-6 py-3 bg-emerald-400 text-black font-semibold rounded-xl border border-emerald-300 transition-all duration-200 hover:bg-emerald-300 hover:border-emerald-200 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-emerald-200/50 focus:ring-offset-2 focus:ring-offset-zinc-900"
                  >
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M4 12h16M4 17h10" />
                      </svg>
                      Distill + Curate
                    </span>
                    <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      A
                    </span>
                  </button>
                </form>
                <Link
                  href="/web-scout"
                  className="group relative px-6 py-3 bg-zinc-800 text-white font-semibold rounded-xl border border-zinc-700 transition-all duration-200 hover:bg-zinc-700 hover:border-zinc-600 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-zinc-500/50 focus:ring-offset-2 focus:ring-offset-zinc-900"
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Web Scout
                  </span>
                  <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    W
                  </span>
                </Link>
                <form action="/api/research" method="POST">
                  <button
                    type="submit"
                    className="group relative px-6 py-3 bg-zinc-800 text-white font-semibold rounded-xl border border-zinc-700 transition-all duration-200 hover:bg-zinc-700 hover:border-zinc-600 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-zinc-500/50 focus:ring-offset-2 focus:ring-offset-zinc-900"
                  >
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Research
                    </span>
                    <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      G
                    </span>
                  </button>
                </form>
              </div>
            </Card>
          </section>

          {/* Topic Controls */}
          <section className="mb-8" id="topic-management">
            <Card className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <SectionHeader title="Topic Report Setup" count={savedTopics.length} />
                <p className="text-xs text-zinc-500">
                  Save topics once, then select them for report runs.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-semibold text-white mb-3">Select Saved Topics</h3>
                  {savedTopics.length === 0 ? (
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                      <p className="text-sm text-zinc-400">
                        No saved topics yet. Create one using the form on the right.
                      </p>
                    </div>
                  ) : (
                    <form action="/api/runs/topic-report" method="POST" className="space-y-4">
                      <p className="text-xs text-zinc-500">
                        Select one or more topics. Leave all unchecked to run all active topics.
                      </p>
                      <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                        {savedTopics.map((topic) => (
                          <label
                            key={topic.id}
                            className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-2.5 hover:border-zinc-700 transition-colors cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              name="topicIds"
                              value={topic.id}
                              className="mt-1 h-4 w-4 rounded border-zinc-600 bg-zinc-900 text-blue-400 focus:ring-blue-400/60"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-white truncate">{topic.name}</p>
                              <p className="text-xs text-zinc-400 line-clamp-2">{topic.goal}</p>
                              {topic.focus_tags.length > 0 && (
                                <p className="text-[11px] text-zinc-500 mt-1 truncate">
                                  Tags: {topic.focus_tags.join(', ')}
                                </p>
                              )}
                            </div>
                          </label>
                        ))}
                      </div>
                      <button
                        type="submit"
                        className="group relative px-6 py-3 bg-blue-400 text-black font-semibold rounded-xl border border-blue-300 transition-all duration-200 hover:bg-blue-300 hover:border-blue-200 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-200/50 focus:ring-offset-2 focus:ring-offset-zinc-900"
                      >
                        <span className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4V7m4 10V5a2 2 0 00-2-2H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2z" />
                          </svg>
                          Run Topic Report
                        </span>
                      </button>
                    </form>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-white mb-3">Add Topic</h3>
                  <form action="/api/topics" method="POST" className="space-y-3">
                    <div>
                      <label htmlFor="topic-name" className="block text-xs text-zinc-400 mb-1.5">
                        Topic Name
                      </label>
                      <input
                        id="topic-name"
                        name="name"
                        required
                        maxLength={80}
                        placeholder="e.g. Multi-agent systems"
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400/40"
                      />
                    </div>
                    <div>
                      <label htmlFor="topic-goal" className="block text-xs text-zinc-400 mb-1.5">
                        Learning Goal
                      </label>
                      <textarea
                        id="topic-goal"
                        name="goal"
                        required
                        maxLength={500}
                        rows={4}
                        placeholder="What should the agent focus on learning and finding?"
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400/40"
                      />
                    </div>
                    <div>
                      <label htmlFor="topic-focus-tags" className="block text-xs text-zinc-400 mb-1.5">
                        Focus Tags (optional)
                      </label>
                      <input
                        id="topic-focus-tags"
                        name="focusTags"
                        maxLength={240}
                        placeholder="llms, retrieval, langgraph"
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400/40"
                      />
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
              {/* Review Inbox */}
              <section>
                <Card>
                  <div className="p-4 border-b border-zinc-800">
                    <SectionHeader title="Review Inbox" count={inbox.length} />
                  </div>
                  <div className="divide-y divide-zinc-800/50">
                    {inbox.length === 0 ? (
                      <EmptyState
                        icon="📭"
                        message="No items to review. Your agents are taking a break."
                      />
                    ) : (
                      inbox.map((item) => (
                        <div key={item.id} className="p-4 group" data-inbox-item={item.id}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <StatusBadge status={item.status} />
                                <span className="text-xs text-zinc-500">{item.agent}</span>
                              </div>
                              <h3 className="text-sm font-medium text-white truncate">
                                {item.title}
                              </h3>
                              {item.preview ? (
                                <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                                  {item.preview}
                                </p>
                              ) : (
                                <p className="text-xs text-zinc-600 mt-1 italic">
                                  No preview available
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <form action={`/api/artifacts/${item.id}/approve`} method="POST">
                                <button
                                  type="submit"
                                  className="px-3 py-1.5 text-xs font-medium text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg hover:bg-green-500/20 hover:border-green-500/30 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500/30"
                                >
                                  Approve
                                </button>
                              </form>
                              <form action={`/api/artifacts/${item.id}/reject`} method="POST">
                                <button
                                  type="submit"
                                  className="px-3 py-1.5 text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg hover:bg-red-500/20 hover:border-red-500/30 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/30"
                                >
                                  Reject
                                </button>
                              </form>
                            </div>
                          </div>
                          {/* Expandable details - toggled via client JS */}
                          <details className="mt-3">
                            <summary className="text-xs text-zinc-500 cursor-pointer hover:text-zinc-400 transition-colors">
                              View details
                            </summary>
                            <div className="mt-2 p-3 bg-zinc-800/50 rounded-lg">
                              <dl className="text-xs space-y-1">
                                <div className="flex gap-2">
                                  <dt className="text-zinc-500">ID:</dt>
                                  <dd className="text-zinc-300 font-mono">{item.id.slice(0, 8)}...</dd>
                                </div>
                                <div className="flex gap-2">
                                  <dt className="text-zinc-500">Kind:</dt>
                                  <dd className="text-zinc-300">{item.kind}</dd>
                                </div>
                                <div className="flex gap-2">
                                  <dt className="text-zinc-500">Agent:</dt>
                                  <dd className="text-zinc-300">{item.agent}</dd>
                                </div>
                              </dl>
                            </div>
                          </details>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              </section>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Active Today */}
              <section>
                <Card>
                  <div className="p-4 border-b border-zinc-800">
                    <SectionHeader title="Active Today" count={active.length} />
                  </div>
                  <div className="divide-y divide-zinc-800/50">
                    {active.length === 0 ? (
                      <EmptyState
                        icon="✨"
                        message="Nothing active today. Approve some proposals!"
                      />
                    ) : (
                      active.map((item) => (
                        <div key={item.id} className="p-4">
                          <div className="flex items-center gap-2 mb-1">
                            <StatusBadge status={item.status} />
                            <span className="text-xs text-zinc-500">{item.agent}</span>
                          </div>
                          <h3 className="text-sm font-medium text-white">
                            {item.title}
                          </h3>
                          {item.preview && (
                            <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                              {item.preview}
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              </section>

              {/* Run Timeline */}
              <section>
                <Card>
                  <div className="p-4 border-b border-zinc-800">
                    <SectionHeader title="Run Timeline" count={runs.length} />
                  </div>
                  <div className="divide-y divide-zinc-800/50">
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
                              <summary className="text-xs text-zinc-500 cursor-pointer hover:text-zinc-400 transition-colors">
                                {run.steps.length} step{run.steps.length !== 1 ? 's' : ''}
                              </summary>
                              <div className="mt-2 space-y-1.5">
                                {run.steps.map((step, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center justify-between text-xs p-2 bg-zinc-800/30 rounded-lg"
                                  >
                                    <div className="flex items-center gap-2">
                                      <StatusBadge status={step.status} />
                                      <span className="text-zinc-300">{step.name}</span>
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

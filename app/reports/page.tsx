import Link from 'next/link';
import { listReports } from '@/server/repos/report.repo';
import { Badge } from '@/app/components/Badge';
import { Card } from '@/app/components/Card';
import { EmptyState } from '@/app/components/EmptyState';
import { ensureSchema } from '@/db/schema';
import { client } from '@/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type ReportCardSummary = {
  id: string;
  title: string;
  createdAt: string;
  day: string;
  executiveSummary: string | null;
  topicsCovered: string[];
  sourcesCount: number | null;
  isUnread: boolean;
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function readReportSummary(report: Awaited<ReturnType<typeof listReports>>[number]): ReportCardSummary {
  const content = report.content as {
    title?: string;
    executiveSummary?: string;
    topicsCovered?: string[];
    sourcesCount?: number;
  };

  return {
    id: report.id,
    title: content.title || report.title,
    createdAt: report.created_at,
    day: report.day,
    executiveSummary: content.executiveSummary ?? null,
    topicsCovered: content.topicsCovered ?? [],
    sourcesCount: content.sourcesCount ?? null,
    isUnread: !report.read_at,
  };
}

export default async function ReportsPage() {
  let reports: Awaited<ReturnType<typeof listReports>> = [];
  let error: string | null = null;

  try {
    const schemaResult = await ensureSchema(client);
    if (!schemaResult.ok) {
      error = schemaResult.error || 'Failed to initialize database';
    } else {
      reports = await listReports();
    }
  } catch (err) {
    error = err instanceof Error ? err.message : 'An unexpected error occurred';
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black p-6 text-center">
        <div className="max-w-md space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
            <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-white">Database Offline</h1>
            <p className="whitespace-pre-line text-sm text-zinc-400">{error}</p>
          </div>
        </div>
      </main>
    );
  }

  const reportSummaries = reports.map(readReportSummary);
  const latestReport = reportSummaries[0] ?? null;
  const unreadCount = reportSummaries.filter((report) => report.isUnread).length;
  const uniqueTopicCount = new Set(reportSummaries.flatMap((report) => report.topicsCovered)).size;

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black">
      <div className="sticky top-0 z-10 border-b border-white/5 bg-black/50 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white">Reports</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
                Finished research outputs live here after you approve good sources and run the report workflow from Research.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/today"
                className="inline-flex items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-zinc-200"
              >
                Back to Research
              </Link>
              <Link
                href="/ingest"
                className="inline-flex items-center justify-center rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-white/5"
              >
                Add Content
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-10">
        {reportSummaries.length === 0 ? (
          <div className="space-y-4">
            <EmptyState
              title="No reports yet"
              description="Generate your first report from Research after you review and approve enough source material."
            />
            <div className="flex flex-wrap gap-3">
              <Link
                href="/today"
                className="inline-flex items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-zinc-200"
              >
                Open Research
              </Link>
              <Link
                href="/library"
                className="inline-flex items-center justify-center rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-white/5"
              >
                Open Library
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {latestReport && (
              <Card className="border-white/10 bg-gradient-to-br from-zinc-950 via-zinc-950 to-zinc-900 p-6">
                <div className="grid gap-6 lg:grid-cols-[1.8fr,1fr]">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                      Latest Report
                    </p>
                    <h2 className="mt-3 text-2xl font-semibold text-white">{latestReport.title}</h2>
                    <p className="mt-3 text-sm leading-6 text-zinc-300">
                      {latestReport.executiveSummary ??
                        'Open the latest finished report, then return to Research when you are ready to review new proposals or generate the next report.'}
                    </p>
                    {latestReport.topicsCovered.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {latestReport.topicsCovered.map((topic) => (
                          <Badge key={topic} variant="secondary" className="text-xs text-zinc-300">
                            {topic}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="mt-6 flex flex-wrap gap-3">
                      <Link
                        href={`/reports/${latestReport.id}`}
                        className="inline-flex items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-zinc-200"
                      >
                        Open Latest Report
                      </Link>
                      <Link
                        href="/today"
                        className="inline-flex items-center justify-center rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-white/5"
                      >
                        Continue in Research
                      </Link>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                      <div className="text-2xl font-semibold text-white">{reportSummaries.length}</div>
                      <p className="mt-1 text-sm text-zinc-400">finished reports</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                      <div className="text-2xl font-semibold text-white">{unreadCount}</div>
                      <p className="mt-1 text-sm text-zinc-400">unread reports</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                      <div className="text-2xl font-semibold text-white">{uniqueTopicCount}</div>
                      <p className="mt-1 text-sm text-zinc-400">topics covered</p>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            <section className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-white">Recent Reports</h2>
                  <p className="mt-1 text-sm text-zinc-400">
                    Read finished outputs here, then return to Research to keep the topic workflow moving.
                  </p>
                </div>
                <p className="text-sm text-zinc-500">
                  {reportSummaries.length} {reportSummaries.length === 1 ? 'report' : 'reports'}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {reportSummaries.map((report) => (
                  <Link key={report.id} href={`/reports/${report.id}`} className="group">
                    <Card className="flex h-full flex-col border-white/10 bg-zinc-950/90 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/20">
                      <div className="flex flex-1 flex-col gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-zinc-300">
                            {formatDate(report.day)}
                          </span>
                          {report.isUnread && (
                            <span className="rounded-full border border-sky-500/25 bg-sky-500/10 px-2.5 py-1 text-[11px] font-medium text-sky-100">
                              Unread
                            </span>
                          )}
                        </div>

                        <h3 className="line-clamp-2 text-lg font-semibold leading-tight text-white transition-colors group-hover:text-[#d97757]">
                          {report.title}
                        </h3>

                        {report.executiveSummary && (
                          <p className="line-clamp-3 text-sm leading-6 text-zinc-400">
                            {report.executiveSummary}
                          </p>
                        )}

                        {report.topicsCovered.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {report.topicsCovered.slice(0, 4).map((topic) => (
                              <Badge key={topic} variant="secondary" className="text-xs text-zinc-300">
                                {topic}
                              </Badge>
                            ))}
                            {report.topicsCovered.length > 4 && (
                              <Badge variant="secondary" className="text-xs text-zinc-300">
                                +{report.topicsCovered.length - 4}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="mt-6 flex items-center justify-between border-t border-white/5 pt-4 text-xs text-zinc-500">
                        <span>{formatDate(report.createdAt)}</span>
                        {report.sourcesCount != null && (
                          <span>
                            {report.sourcesCount} source{report.sourcesCount === 1 ? '' : 's'}
                          </span>
                        )}
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

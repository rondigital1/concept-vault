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
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-950">
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
      <div className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950">
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
                className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-[#d97757] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#c4684a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d97757]"
              >
                Back to Research
              </Link>
              <Link
                href="/ingest"
                className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-800"
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
                className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-[#d97757] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#c4684a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d97757]"
              >
                Open Research
              </Link>
              <Link
                href="/library"
                className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-800"
              >
                Open Library
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-10">
            {latestReport && (
              <Card className="border-l-2 border-l-[#d97757] border-zinc-800 bg-zinc-950 p-8">
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Latest Report
                </p>
                <h2 className="mt-4 text-2xl font-semibold text-white">{latestReport.title}</h2>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-300">
                  {latestReport.executiveSummary ??
                    'Open the latest finished report, then return to Research when you are ready to review new proposals or generate the next report.'}
                </p>
                {latestReport.topicsCovered.length > 0 && (
                  <div className="mt-5 flex flex-wrap gap-1.5">
                    {latestReport.topicsCovered.map((topic) => (
                      <Badge key={topic} variant="accent" className="text-xs">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    href={`/reports/${latestReport.id}`}
                    className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-[#d97757] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#c4684a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d97757]"
                  >
                    Open Latest Report
                  </Link>
                  <Link
                    href="/today"
                    className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-zinc-700 px-5 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-800"
                  >
                    Continue in Research
                  </Link>
                </div>
              </Card>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex items-center gap-4 rounded-2xl border border-emerald-800 bg-emerald-950 p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-900">
                  <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </div>
                <div>
                  <div className="text-2xl font-semibold text-white">{reportSummaries.length}</div>
                  <p className="text-sm text-zinc-400">finished reports</p>
                </div>
              </div>
              <div className="flex items-center gap-4 rounded-2xl border border-sky-800 bg-sky-950 p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-900">
                  <svg className="h-5 w-5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <div className="text-2xl font-semibold text-white">{unreadCount}</div>
                  <p className="text-sm text-zinc-400">unread reports</p>
                </div>
              </div>
              <div className="flex items-center gap-4 rounded-2xl border border-amber-800 bg-amber-950 p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-900">
                  <svg className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
                  </svg>
                </div>
                <div>
                  <div className="text-2xl font-semibold text-white">{uniqueTopicCount}</div>
                  <p className="text-sm text-zinc-400">topics covered</p>
                </div>
              </div>
            </div>

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
                    <Card className="flex h-full flex-col border-zinc-800 bg-zinc-950 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-zinc-700 hover:shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
                      <div className="flex flex-1 flex-col gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[11px] font-medium text-zinc-300">
                            {formatDate(report.day)}
                          </span>
                          {report.isUnread && (
                            <Badge variant="info" className="text-[11px]">
                              <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-sky-400" />
                              Unread
                            </Badge>
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

                      <div className="mt-auto flex items-center justify-between border-t border-zinc-800 pt-4 text-xs text-zinc-500">
                        <span>{formatDate(report.createdAt)}</span>
                        {report.sourcesCount != null && (
                          <span className="flex items-center gap-1">
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.06a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.757 8.06" />
                            </svg>
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

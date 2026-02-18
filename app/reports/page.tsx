import Link from 'next/link';
import { listReports } from '@/server/repos/report.repo';
import { Badge } from '@/app/components/Badge';
import { Card } from '@/app/components/Card';
import { EmptyState } from '@/app/components/EmptyState';
import { ensureSchema } from '@/db/schema';
import { client } from '@/db';

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
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
      <main className="min-h-screen bg-black flex items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-6">
          <div className="h-16 w-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
            <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-white">Database Offline</h1>
            <p className="text-sm text-zinc-400 whitespace-pre-line">{error}</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black">
      {/* Header */}
      <div className="border-b border-white/5 bg-black/50 backdrop-blur-xl sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Research Reports</h1>
              <p className="text-sm text-zinc-400 mt-1">
                {reports.length} {reports.length === 1 ? 'report' : 'reports'}
              </p>
            </div>
            <Link
              href="/today"
              className="px-4 py-2 text-sm font-medium text-white/70 hover:text-white transition-colors"
            >
              ← Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-6 py-12">
        {reports.length === 0 ? (
          <EmptyState
            title="No reports yet"
            description="Run a research session from the dashboard to generate your first report"
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {reports.map((report) => {
              const content = report.content as {
                title?: string;
                executiveSummary?: string;
                topicsCovered?: string[];
                sourcesCount?: number;
              };
              const isUnread = !report.read_at;

              return (
                <Link key={report.id} href={`/reports/${report.id}`} className="group">
                  <Card className="h-full flex flex-col p-5 hover:border-white/20 transition-all duration-300 hover:scale-[1.02] cursor-pointer">
                    <div className="flex-1 flex flex-col gap-3">
                      <div className="flex items-center gap-2">
                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                        )}
                        <h3 className="text-base font-semibold text-white leading-tight line-clamp-2 group-hover:text-[#d97757] transition-colors">
                          {content.title || report.title}
                        </h3>
                      </div>

                      {content.executiveSummary && (
                        <p className="text-sm text-zinc-400 line-clamp-3">
                          {content.executiveSummary}
                        </p>
                      )}

                      {content.topicsCovered && content.topicsCovered.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {content.topicsCovered.slice(0, 4).map((topic) => (
                            <Badge key={topic} variant="secondary" className="text-xs">
                              {topic}
                            </Badge>
                          ))}
                          {content.topicsCovered.length > 4 && (
                            <Badge variant="secondary" className="text-xs">
                              +{content.topicsCovered.length - 4}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                      <span className="text-xs text-zinc-500">
                        {formatDate(report.created_at)}
                      </span>
                      {content.sourcesCount != null && (
                        <span className="text-xs text-zinc-500">
                          {content.sourcesCount} source{content.sourcesCount !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

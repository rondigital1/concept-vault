import { ResultsContainer, ResultsRouteShell } from './ResultsRouteShell';
import { LatestReportPanel } from './LatestReportPanel';
import { ReportsArchiveSection } from './ReportsArchiveSection';
import { ReportsEmptyStatePanel } from './ReportsEmptyStatePanel';
import { ReportsFooter } from './ReportsFooter';
import { ReportsHero } from './ReportsHero';
import { ReportsMetricGrid } from './ReportsMetricGrid';
import { ReportsSidebar } from './ReportsSidebar';
import type { ReportCardSummary } from './reportsViewModel';

export function ReportsWorkspace({ reports }: { reports: ReportCardSummary[] }) {
  const latestReport = reports[0] ?? null;
  const unreadCount = reports.filter((report) => report.isUnread).length;
  const uniqueTopicCount = new Set(reports.flatMap((report) => report.topicsCovered)).size;
  const totalSources = reports.reduce((sum, report) => sum + (report.sourcesCount ?? 0), 0);

  return (
    <ResultsRouteShell showReadyPulse={Boolean(latestReport)}>
      <ResultsContainer>
        <ReportsHero latestReport={latestReport} />

        <div className="mt-12">
          {!latestReport ? (
            <ReportsEmptyStatePanel />
          ) : (
            <div className="grid gap-8 xl:grid-cols-[minmax(0,1.65fr)_360px]">
              <section className="space-y-8">
                <LatestReportPanel latestReport={latestReport} />
                <ReportsMetricGrid
                  reports={reports}
                  latestReport={latestReport}
                  unreadCount={unreadCount}
                  uniqueTopicCount={uniqueTopicCount}
                  totalSources={totalSources}
                />
                <ReportsArchiveSection reports={reports} />
              </section>

              <ReportsSidebar
                latestReport={latestReport}
                uniqueTopicCount={uniqueTopicCount}
              />
            </div>
          )}
        </div>

        <ReportsFooter />
      </ResultsContainer>
    </ResultsRouteShell>
  );
}

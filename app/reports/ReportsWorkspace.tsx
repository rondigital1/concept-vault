import Link from 'next/link';
import {
  ResultsContainer,
  ResultsRouteShell,
} from './resultsUi';
import { LatestReportPanel } from './LatestReportPanel';
import { ReportsArchiveSection } from './ReportsArchiveSection';
import { ReportsEmptyState } from './ReportsEmptyState';
import { ReportsSideRail } from './ReportsSideRail';
import { formatDisplayStamp, type ReportCardSummary } from './reportsViewModel';

export function ReportsWorkspace({ reports }: { reports: ReportCardSummary[] }) {
  const latestReport = reports[0] ?? null;
  const unreadCount = reports.filter((report) => report.isUnread).length;
  const uniqueTopicCount = new Set(reports.flatMap((report) => report.topicsCovered)).size;
  const totalSources = reports.reduce((sum, report) => sum + (report.sourcesCount ?? 0), 0);
  const latestCitations = latestReport?.citations.slice(0, 3) ?? [];

  return (
    <ResultsRouteShell showReadyPulse={Boolean(latestReport)}>
      <ResultsContainer>
        <header className="max-w-5xl animate-workbench-enter">
          <div className="mb-4 flex flex-wrap items-center gap-3 text-[0.65rem] font-bold uppercase tracking-[0.26em] text-[#8c8787]">
            <span className="rounded-sm bg-[#2a2a2a] px-3 py-1.5 text-[#ddd8d8]">Research reports</span>
            <span>{latestReport ? `Latest: ${formatDisplayStamp(latestReport.createdAt)}` : 'Status: awaiting first dossier'}</span>
          </div>
          <h1 className="max-w-6xl text-[clamp(3rem,8vw,5.7rem)] font-black leading-[0.95] tracking-normal text-white">
            Research Results
          </h1>
          <p className="mt-6 max-w-3xl text-[1.14rem] font-[380] leading-8 text-[#b7b0b0]">
            Approved reports live here as finished dossiers. Scan the latest synthesis, verify source coverage, and jump back into Research when the next cycle is ready.
          </p>
        </header>

        <div className="mt-12">
          {!latestReport ? (
            <ReportsEmptyState />
          ) : (
            <div className="grid gap-8 xl:grid-cols-[minmax(0,1.65fr)_360px]">
              <section className="space-y-8">
                <LatestReportPanel report={latestReport} />
                <ReportsArchiveSection
                  reports={reports}
                  totalSources={totalSources}
                  uniqueTopicCount={uniqueTopicCount}
                  unreadCount={unreadCount}
                />
              </section>

              <ReportsSideRail
                latestCitations={latestCitations}
                latestReport={latestReport}
                uniqueTopicCount={uniqueTopicCount}
              />
            </div>
          )}
        </div>

        <footer className="mt-[4.5rem] border-t border-white/5 py-10">
          <div className="flex flex-col gap-4 text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#777171] sm:flex-row sm:items-center sm:justify-between">
            <p>© Concept Vault research unit. Approved outputs remain human-directed and reviewable.</p>
            <div className="flex flex-wrap gap-6">
              <Link href="/today" className="transition hover:text-white">
                Research
              </Link>
              <Link href="/library" className="transition hover:text-white">
                Library
              </Link>
              <Link href="/ingest" className="transition hover:text-white">
                Ingest
              </Link>
            </div>
          </div>
        </footer>
      </ResultsContainer>
    </ResultsRouteShell>
  );
}

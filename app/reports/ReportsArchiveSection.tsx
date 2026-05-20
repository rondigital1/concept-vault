import Link from 'next/link';
import {
  ResultsIcon,
  ResultsPill,
  ResultsTopicChip,
} from './resultsUi';
import { formatDisplayDate, trimIdentifier, type ReportCardSummary } from './reportsViewModel';

function MetricCard({
  title,
  value,
  description,
  meta,
}: {
  title: string;
  value: string;
  description: string;
  meta: string;
}) {
  return (
    <div className="rounded-[28px] bg-[#2a2a2a] px-6 py-6 shadow-[0_20px_48px_rgba(0,0,0,0.22)]">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#141414] text-[#f1ecec]">
          <ResultsIcon name="stack" className="h-[1rem] w-[1rem]" />
        </div>
        <div>
          <h3 className="text-[0.95rem] font-bold tracking-normal text-white">{title}</h3>
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-[#817b7b]">{meta}</p>
        </div>
      </div>
      <p className="text-[2.8rem] font-black tracking-normal text-white">{value}</p>
      <p className="mt-4 text-[0.98rem] leading-7 text-[#bdb4b4]">{description}</p>
    </div>
  );
}

function ArchiveCard({ report }: { report: ReportCardSummary }) {
  return (
    <Link
      href={`/reports/${report.id}`}
      className="group block rounded-[28px] bg-[#2a2a2a] px-6 py-6 transition duration-300 hover:-translate-y-0.5 hover:bg-[#303030]"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <ResultsPill>{formatDisplayDate(report.day)}</ResultsPill>
          {report.isUnread ? (
            <ResultsPill tone="inverse" className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#171717] animate-pulse" />
              Unread
            </ResultsPill>
          ) : null}
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#111111] text-[#e7e2e2] transition group-hover:bg-[#181818]">
          <ResultsIcon name="arrow-up-right" className="h-4 w-4" />
        </span>
      </div>

      <h3 className="mt-5 text-[1.36rem] font-bold tracking-normal text-white">{report.title}</h3>
      <p className="mt-4 line-clamp-4 text-[0.98rem] leading-7 text-[#beb5b5]">
        {report.summaryPreview ?? 'Open the dossier to review the full executive summary and source-by-source notes.'}
      </p>

      {report.topicsCovered.length > 0 ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {report.topicsCovered.slice(0, 3).map((topic) => (
            <ResultsTopicChip key={topic} topic={topic} />
          ))}
          {report.topicsCovered.length > 3 ? (
            <span className="rounded-full bg-[#111111] px-3 py-1.5 text-[0.68rem] font-semibold text-[#d3cbcb]">
              +{report.topicsCovered.length - 3}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="mt-6 flex items-center justify-between gap-4 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#8f8888]">
        <span>{formatDisplayDate(report.createdAt)}</span>
        <span>{report.sourcesCount ?? 0} sources</span>
      </div>
    </Link>
  );
}

export function ReportsArchiveSection({
  reports,
  totalSources,
  uniqueTopicCount,
  unreadCount,
}: {
  reports: ReportCardSummary[];
  totalSources: number;
  uniqueTopicCount: number;
  unreadCount: number;
}) {
  const latestReport = reports[0];

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2">
        <MetricCard
          title="Archive volume"
          value={`${reports.length}`}
          description={`${reports.length === 1 ? '1 dossier is' : `${reports.length} dossiers are`} approved and immediately available to reopen.`}
          meta={`${unreadCount} unread`}
        />
        <MetricCard
          title="Topic coverage"
          value={`${uniqueTopicCount}`}
          description={`${totalSources} approved sources are represented across the archived reports now visible in this registry.`}
          meta={latestReport?.topicId ? `topic ${trimIdentifier(latestReport.topicId, 8)}` : 'all topics'}
        />
      </div>

      <section className="pb-8">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.28em] text-[#8f8888]">Approved archive</p>
            <h2 className="mt-2 text-[2.1rem] font-black tracking-normal text-white">Recent dossiers</h2>
            <p className="mt-2 max-w-2xl text-[0.98rem] leading-7 text-[#b9b0b0]">
              Every approved report remains here as a finished output. Open one to read the full synthesis, mark it read, or continue the topic from Research.
            </p>
          </div>
          <div className="inline-flex items-center rounded-full bg-[#1d1d1d] px-4 py-2 text-[0.7rem] font-bold uppercase tracking-[0.24em] text-[#d7d0d0]">
            {reports.length} {reports.length === 1 ? 'dossier' : 'dossiers'}
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {reports.map((report) => (
            <ArchiveCard key={report.id} report={report} />
          ))}
        </div>
      </section>
    </>
  );
}

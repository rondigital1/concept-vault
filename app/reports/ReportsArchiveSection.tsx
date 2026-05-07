import Link from 'next/link';
import type { ReportCardSummary } from './reportsViewModel';
import { formatDisplayDate } from './reportsViewModel';
import { ResultsIcon } from './resultsIcons';
import { ResultsPill, ResultsTopicChip } from './resultsUi';

type Props = {
  reports: ReportCardSummary[];
};

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

      <h3 className="mt-5 text-[1.36rem] font-bold tracking-[-0.04em] text-white">{report.title}</h3>
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

export function ReportsArchiveSection({ reports }: Props) {
  return (
    <section className="pb-8">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.28em] text-[#8f8888]">Approved archive</p>
          <h2 className="mt-2 text-[2.1rem] font-black tracking-[-0.06em] text-white">Recent dossiers</h2>
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
  );
}

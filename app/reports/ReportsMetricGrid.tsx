import type { ReportCardSummary } from './reportsViewModel';
import { trimIdentifier } from './reportsViewModel';
import { ResultsIcon } from './resultsIcons';

type Props = {
  reports: ReportCardSummary[];
  latestReport: ReportCardSummary;
  unreadCount: number;
  uniqueTopicCount: number;
  totalSources: number;
};

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
          <h3 className="text-[0.95rem] font-bold tracking-[-0.02em] text-white">{title}</h3>
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-[#817b7b]">{meta}</p>
        </div>
      </div>
      <p className="text-[2.8rem] font-black tracking-[-0.07em] text-white">{value}</p>
      <p className="mt-4 text-[0.98rem] leading-7 text-[#bdb4b4]">{description}</p>
    </div>
  );
}

export function ReportsMetricGrid({
  reports,
  latestReport,
  unreadCount,
  uniqueTopicCount,
  totalSources,
}: Props) {
  return (
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
        meta={latestReport.topicId ? `topic ${trimIdentifier(latestReport.topicId, 8)}` : 'all topics'}
      />
    </div>
  );
}

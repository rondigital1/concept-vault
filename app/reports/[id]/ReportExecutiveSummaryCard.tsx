import { formatDisplayDate } from '../reportsViewModel';
import { ResultsPill } from '../resultsUi';

type Props = {
  day: string;
  sourcesCount: number;
  citationCount: number;
  isRead: boolean;
};

export function ReportExecutiveSummaryCard({
  day,
  sourcesCount,
  citationCount,
  isRead,
}: Props) {
  return (
    <article className="relative overflow-hidden rounded-[30px] bg-[#1d1d1d] px-6 py-7 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:px-10 sm:py-10">
      <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-white/[0.04] blur-3xl" />
      <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-[0.72rem] font-bold uppercase tracking-[0.28em] text-white">
            Executive summary
          </p>
          <p className="mt-2 text-[0.78rem] uppercase tracking-[0.2em] text-[#8b8484]">
            {formatDisplayDate(day)} · {sourcesCount} approved source{sourcesCount === 1 ? '' : 's'}
          </p>
        </div>
        <ResultsPill tone={isRead ? 'success' : 'warning'}>
          {isRead ? 'Read and filed' : 'Needs review'}
        </ResultsPill>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ReportSummaryMetric label="Source coverage" value={sourcesCount} />
        <ReportSummaryMetric label="Citation preview" value={citationCount || '—'} />
      </div>

      <p className="mt-8 max-w-3xl text-[1.02rem] leading-8 text-[#b8b0af]">
        Read the full dossier below for the complete markdown synthesis. The citations rail stays
        visible on desktop so source coverage remains in view while you read.
      </p>
    </article>
  );
}

function ReportSummaryMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-[22px] bg-[#111111] px-6 py-6">
      <span className="text-[0.65rem] font-bold uppercase tracking-[0.24em] text-[#7e7777]">
        {label}
      </span>
      <div className="mt-3 text-[clamp(2.4rem,4vw,3.8rem)] font-black tracking-[-0.06em] text-white">
        {value}
      </div>
    </div>
  );
}

import Link from 'next/link';
import type { ReportCardSummary } from './reportsViewModel';
import { formatDisplayDate } from './reportsViewModel';
import { ResultsIcon } from './resultsIcons';
import { ResultsTopicChip } from './resultsUi';

type Props = {
  latestReport: ReportCardSummary;
};

export function LatestReportPanel({ latestReport }: Props) {
  return (
    <article className="relative overflow-hidden rounded-[30px] bg-[#1d1d1d] px-6 py-7 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:px-10 sm:py-10">
      <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-white/[0.04] blur-3xl" />

      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f2efef] text-[#161616] shadow-[0_10px_30px_rgba(255,255,255,0.08)]">
            <ResultsIcon name="analytics" className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[0.72rem] font-bold uppercase tracking-[0.28em] text-white">Latest dossier</p>
            <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[#8b8484]">
              {formatDisplayDate(latestReport.day)} · {latestReport.isUnread ? 'Unread' : 'Opened'} · {latestReport.sourcesCount ?? 0} sources
            </p>
          </div>
        </div>

        <Link
          href={`/reports/${latestReport.id}`}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/5 text-[#d8d2d2] transition hover:bg-white/10 hover:text-white"
          aria-label="Open latest dossier"
        >
          <ResultsIcon name="arrow-up-right" className="h-5 w-5" />
        </Link>
      </div>

      <h2 className="max-w-4xl text-[clamp(2rem,4vw,3.35rem)] font-black leading-[1.02] tracking-[-0.065em] text-white">
        {latestReport.title}
      </h2>

      <div className="mt-8 space-y-5">
        {(latestReport.summaryLines.length > 0
          ? latestReport.summaryLines.slice(0, 2)
          : ['Open the newest report to review the executive summary and source-by-source notes captured by the research pipeline.']).map((line, index) => (
          <p key={`${line}-${index}`} className="max-w-3xl text-[1.08rem] leading-9 text-[#ece8e5]">
            {line}
          </p>
        ))}
      </div>

      <div className="my-8 grid gap-4 md:grid-cols-2">
        <div className="rounded-[20px] bg-[#111111] px-6 py-6">
          <span className="text-[0.65rem] font-bold uppercase tracking-[0.24em] text-[#7e7777]">Source coverage</span>
          <div className="mt-3 text-[clamp(2.4rem,4vw,3.8rem)] font-black tracking-[-0.06em] text-white">
            {latestReport.sourcesCount ?? '—'}
          </div>
        </div>
        <div className="rounded-[20px] bg-[#111111] px-6 py-6">
          <span className="text-[0.65rem] font-bold uppercase tracking-[0.24em] text-[#7e7777]">Topic span</span>
          <div className="mt-3 text-[clamp(2.4rem,4vw,3.8rem)] font-black tracking-[-0.06em] text-white">
            {latestReport.topicsCovered.length || '—'}
          </div>
        </div>
      </div>

      <p className="max-w-3xl text-[1.02rem] leading-8 text-[#b8b0af]">
        {latestReport.summaryLines[2] ??
          latestReport.summaryPreview ??
          'Open the dossier to review the full synthesis, recommended next steps, and the linked evidence stack.'}
      </p>

      {latestReport.topicsCovered.length > 0 ? (
        <div className="mt-8 flex flex-wrap gap-2">
          {latestReport.topicsCovered.map((topic) => (
            <ResultsTopicChip key={topic} topic={topic} />
          ))}
        </div>
      ) : null}
    </article>
  );
}

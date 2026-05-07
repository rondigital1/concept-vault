import type { ReportCardSummary } from './reportsViewModel';
import { formatDisplayStamp } from './reportsViewModel';

type Props = {
  latestReport: ReportCardSummary | null;
};

export function ReportsHero({ latestReport }: Props) {
  return (
    <header className="max-w-5xl animate-workbench-enter">
      <div className="mb-4 flex flex-wrap items-center gap-3 text-[0.65rem] font-bold uppercase tracking-[0.26em] text-[#8c8787]">
        <span className="rounded-sm bg-[#2a2a2a] px-3 py-1.5 text-[#ddd8d8]">ARCHIVE_SCOPE: RESEARCH_REPORTS</span>
        <span>{latestReport ? `LATEST: ${formatDisplayStamp(latestReport.createdAt)}` : 'STATUS: AWAITING FIRST DOSSIER'}</span>
      </div>
      <h1 className="max-w-6xl text-[clamp(3rem,8vw,5.7rem)] font-black leading-[0.95] tracking-[-0.085em] text-white">
        Research Results
      </h1>
      <p className="mt-6 max-w-3xl text-[1.14rem] font-[380] leading-8 text-[#b7b0b0]">
        Approved reports live here as finished dossiers. Scan the latest synthesis, verify source coverage, and jump back into Research when the next cycle is ready.
      </p>
    </header>
  );
}

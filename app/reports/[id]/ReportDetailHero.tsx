import { formatDisplayDate } from '../reportsViewModel';
import { ResultsTopicChip } from '../resultsUi';

type Props = {
  title: string;
  createdAt: string;
  leadParagraphs: string[];
  topicsCovered: string[];
};

export function ReportDetailHero({
  title,
  createdAt,
  leadParagraphs,
  topicsCovered,
}: Props) {
  return (
    <header className="max-w-5xl">
      <div className="mb-4 flex flex-wrap items-center gap-3 text-[0.65rem] font-bold uppercase tracking-[0.26em] text-[#8c8787]">
        <span className="rounded-sm bg-[#2a2a2a] px-3 py-1.5 text-[#ddd8d8]">
          REPORT_DETAIL: DOSSIER
        </span>
        <span>
          COMPLETED: {formatDisplayDate(createdAt, { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      </div>
      <h1 className="max-w-5xl text-[clamp(2.7rem,7vw,5.2rem)] font-black leading-[0.96] tracking-[-0.085em] text-white">
        {title}
      </h1>
      <div className="mt-6 space-y-4">
        {leadParagraphs.map((line, index) => (
          <p key={`${line}-${index}`} className="max-w-4xl text-[1.08rem] leading-8 text-[#cfc6c6]">
            {line}
          </p>
        ))}
      </div>
      {topicsCovered.length > 0 ? (
        <div className="mt-8 flex flex-wrap gap-2">
          {topicsCovered.map((topic) => (
            <ResultsTopicChip key={topic} topic={topic} />
          ))}
        </div>
      ) : null}
    </header>
  );
}

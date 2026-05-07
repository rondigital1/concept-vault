import type { ArtifactRow } from '@/server/repos/artifacts.repo';
import type { readArtifactOverview } from '@/app/reports/artifactOverview';
import { ResultsPill, ResultsTopicChip } from '@/app/reports/resultsUi';
import { formatArtifactKindLabel } from './artifactFormatting';

type Props = {
  artifact: ArtifactRow;
  overview: ReturnType<typeof readArtifactOverview>;
};

export function ArtifactSummaryCard({ artifact, overview }: Props) {
  return (
    <article className="relative overflow-hidden rounded-[30px] bg-[#1d1d1d] px-6 py-7 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:px-10 sm:py-10">
      <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-white/[0.04] blur-3xl" />
      <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-[0.72rem] font-bold uppercase tracking-[0.28em] text-white">{overview.summaryTitle}</p>
          <p className="mt-2 text-[0.78rem] uppercase tracking-[0.2em] text-[#8b8484]">{formatArtifactKindLabel(artifact.kind)} artifact · {artifact.agent}</p>
        </div>
        {overview.statusNotice ? <ResultsPill tone="success">Saved to library</ResultsPill> : null}
      </div>

      <p className="max-w-3xl text-[1.08rem] leading-9 text-[#ece8e5]">{overview.summaryCopy}</p>

      {overview.stats.length > 0 ? (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {overview.stats.map((stat) => (
            <div key={stat.label} className="rounded-[22px] bg-[#111111] px-6 py-6">
              <span className="text-[0.65rem] font-bold uppercase tracking-[0.24em] text-[#7e7777]">{stat.label}</span>
              <div className="mt-3 text-[clamp(1.8rem,4vw,3.2rem)] font-black tracking-[-0.06em] text-white">{stat.value}</div>
            </div>
          ))}
        </div>
      ) : null}

      {overview.topics.length > 0 ? (
        <div className="mt-8 flex flex-wrap gap-2">
          {overview.topics.map((topic) => (
            <ResultsTopicChip key={topic} topic={topic} />
          ))}
        </div>
      ) : null}

      {overview.reasoning.length > 0 ? (
        <div className="mt-8">
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.28em] text-[#8f8888]">Why it was proposed</p>
          <ul className="mt-4 space-y-3">
            {overview.reasoning.map((entry) => (
              <li key={entry} className="rounded-[22px] bg-[#111111] px-5 py-4 text-[0.98rem] leading-7 text-[#d7d0d0]">
                {entry}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {overview.evidence.length > 0 ? (
        <div className="mt-8">
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.28em] text-[#8f8888]">Supporting evidence</p>
          <ul className="mt-4 space-y-3">
            {overview.evidence.map((entry) => (
              <li key={entry} className="rounded-[22px] bg-[#111111] px-5 py-4 text-[0.98rem] leading-7 text-[#d7d0d0]">
                {entry}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  );
}

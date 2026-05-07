import type { ArtifactRow } from '@/server/repos/artifacts.repo';
import type { readArtifactOverview } from '@/app/reports/artifactOverview';
import { ResultsPill } from '@/app/reports/resultsUi';
import {
  artifactKindTone,
  artifactStatusTone,
  formatArtifactDateTime,
  formatArtifactKindLabel,
  formatArtifactStatusLabel,
} from './artifactFormatting';

type Props = {
  artifact: ArtifactRow;
  overview: ReturnType<typeof readArtifactOverview>;
};

export function ArtifactHeader({ artifact, overview }: Props) {
  return (
    <header className="max-w-5xl">
      <div className="mb-4 flex flex-wrap items-center gap-3 text-[0.65rem] font-bold uppercase tracking-[0.26em] text-[#8c8787]">
        <span className="rounded-sm bg-[#2a2a2a] px-3 py-1.5 text-[#ddd8d8]">ARTIFACT_DETAIL: {artifact.agent.toUpperCase()}</span>
        <span>CREATED: {formatArtifactDateTime(artifact.created_at)}</span>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <ResultsPill tone={artifactStatusTone(artifact.status)}>
          {formatArtifactStatusLabel(artifact.status)}
        </ResultsPill>
        <ResultsPill tone={artifactKindTone(artifact.kind)}>
          {formatArtifactKindLabel(artifact.kind)}
        </ResultsPill>
      </div>

      <h1 className="max-w-5xl break-words text-[clamp(2.7rem,7vw,5.2rem)] font-black leading-[0.96] tracking-[-0.085em] text-white">
        {artifact.title}
      </h1>
      <p className="mt-6 max-w-4xl text-[1.08rem] leading-8 text-[#cfc6c6]">{overview.description}</p>
    </header>
  );
}

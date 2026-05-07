import type { ArtifactRow } from '@/server/repos/artifacts.repo';
import { ResultsMetadataRow } from '@/app/reports/resultsUi';
import { trimIdentifier } from '@/app/reports/reportsViewModel';
import {
  formatArtifactDateTime,
  formatArtifactStatusLabel,
  safeJson,
} from './artifactFormatting';

type Props = {
  artifact: ArtifactRow;
};

export function ArtifactTechnicalDetails({ artifact }: Props) {
  return (
    <details id="technical-details" className="rounded-[28px] bg-[#1d1d1d] shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
      <summary className="cursor-pointer px-6 py-5 text-[0.72rem] font-bold uppercase tracking-[0.26em] text-[#d7d0d0] transition hover:text-white sm:px-8">
        Technical details
      </summary>
      <div className="border-t border-white/8 px-6 py-6 sm:px-8">
        <section>
          <h2 className="text-[0.68rem] font-bold uppercase tracking-[0.28em] text-[#8f8888]">Metadata</h2>
          <div className="mt-4 space-y-1">
            <ResultsMetadataRow label="Artifact id" value={trimIdentifier(artifact.id, 18) ?? artifact.id} />
            <ResultsMetadataRow label="Created" value={formatArtifactDateTime(artifact.created_at)} />
            <ResultsMetadataRow label="Read" value={formatArtifactDateTime(artifact.read_at)} />
            <ResultsMetadataRow label="Status" value={formatArtifactStatusLabel(artifact.status).toUpperCase()} />
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-[0.68rem] font-bold uppercase tracking-[0.28em] text-[#8f8888]">Content payload</h2>
          <pre className="mt-4 max-h-[420px] overflow-auto whitespace-pre-wrap break-words rounded-[22px] bg-[#111111] p-4 text-xs text-[#d7d0d0]">
            {safeJson(artifact.content)}
          </pre>
        </section>

        <section className="mt-8">
          <h2 className="text-[0.68rem] font-bold uppercase tracking-[0.28em] text-[#8f8888]">Source refs</h2>
          <pre className="mt-4 max-h-[320px] overflow-auto whitespace-pre-wrap break-words rounded-[22px] bg-[#111111] p-4 text-xs text-[#d7d0d0]">
            {safeJson(artifact.source_refs)}
          </pre>
        </section>
      </div>
    </details>
  );
}

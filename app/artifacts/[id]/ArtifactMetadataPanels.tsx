import type { ArtifactRow } from '@/server/repos/artifacts.repo';
import { ResultsMetadataRow, ResultsSidePanel } from '@/app/reports/resultsUi';
import { trimIdentifier } from '@/app/reports/reportsViewModel';
import {
  formatArtifactDateTime,
  formatArtifactKindLabel,
  formatArtifactStatusLabel,
} from './artifactFormatting';

type Props = {
  artifact: ArtifactRow;
};

export function ArtifactProcessMetadataPanel({ artifact }: Props) {
  return (
    <section className="rounded-[28px] bg-[#111111] px-6 py-7 shadow-[0_20px_60px_rgba(0,0,0,0.22)] sm:px-8">
      <h2 className="text-[0.7rem] font-bold uppercase tracking-[0.3em] text-[#d7d0d0]">Process metadata</h2>
      <div className="mt-6 space-y-1">
        <ResultsMetadataRow label="Day" value={artifact.day} />
        <ResultsMetadataRow label="Agent" value={artifact.agent.toUpperCase()} />
        <ResultsMetadataRow label="Reviewed" value={formatArtifactDateTime(artifact.reviewed_at)} />
        <ResultsMetadataRow label="Run id" value={trimIdentifier(artifact.run_id) ?? 'NO RUN LINKED'} />
      </div>
    </section>
  );
}

export function ArtifactRecordMetadataPanel({ artifact }: Props) {
  return (
    <ResultsSidePanel title="Record metadata" className="bg-[#111111] shadow-[0_20px_60px_rgba(0,0,0,0.22)]">
      <div className="mt-6 space-y-1">
        <ResultsMetadataRow label="Created" value={formatArtifactDateTime(artifact.created_at)} />
        <ResultsMetadataRow label="Status" value={formatArtifactStatusLabel(artifact.status).toUpperCase()} accent />
        <ResultsMetadataRow label="Kind" value={formatArtifactKindLabel(artifact.kind).toUpperCase()} />
        <ResultsMetadataRow label="Run id" value={trimIdentifier(artifact.run_id) ?? 'NO RUN LINKED'} />
        <ResultsMetadataRow label="Artifact id" value={trimIdentifier(artifact.id) ?? artifact.id} />
      </div>
    </ResultsSidePanel>
  );
}

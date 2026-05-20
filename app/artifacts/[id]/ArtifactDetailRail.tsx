import {
  ResultsActionLink,
  ResultsMetadataRow,
  ResultsSidePanel,
  ResultsTopicChip,
} from '@/app/reports/resultsUi';
import { trimIdentifier } from '@/app/reports/reportsViewModel';
import type { readArtifactOverview } from '@/app/reports/artifactOverview';
import type { ArtifactRow } from '@/server/repos/artifacts.repo';
import { formatDateTime, formatKindLabel, formatStatusLabel } from './artifactDetailFormatting';

type ArtifactOverview = ReturnType<typeof readArtifactOverview>;

function ArtifactContextPanel({
  artifact,
  overview,
}: {
  artifact: ArtifactRow;
  overview: ArtifactOverview;
}) {
  if (artifact.kind === 'research-report') {
    return (
      <ResultsSidePanel title="Verified citations">
        {overview.citations.length > 0 ? (
          <ul className="mt-6 space-y-6">
            {overview.citations.map((citation) => (
              <li key={`${citation.url}-${citation.title}`}>
                <a href={citation.url} target="_blank" rel="noreferrer" className="block transition hover:opacity-80">
                  <div className="text-[0.58rem] font-semibold uppercase tracking-[0.26em] text-[#8d8787]">{citation.source}</div>
                  <div className="mt-2 text-[1rem] leading-7 text-white">{citation.title}</div>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-6 rounded-[22px] border border-white/8 bg-[#171717] px-5 py-5">
            <p className="text-[0.7rem] font-bold uppercase tracking-[0.24em] text-[#d9d1d1]">No parsed citations</p>
            <p className="mt-3 text-[0.96rem] leading-7 text-[#beb5b5]">
              This report artifact does not expose a structured citation preview here. Open the full report or review the raw payload below to inspect the saved source section.
            </p>
          </div>
        )}
      </ResultsSidePanel>
    );
  }

  if (artifact.kind === 'web-proposal') {
    return (
      <ResultsSidePanel title="Source context">
        <div className="mt-6 space-y-5">
          <div>
            <p className="text-[0.64rem] font-semibold uppercase tracking-[0.2em] text-[#7d7878]">Source URL</p>
            {overview.sourceUrl ? (
              <a href={overview.sourceUrl} target="_blank" rel="noreferrer" className="mt-3 block break-all text-[1rem] leading-7 text-white underline decoration-white/20 underline-offset-4 hover:decoration-white/60">
                {overview.sourceUrl}
              </a>
            ) : (
              <p className="mt-3 text-[0.96rem] leading-7 text-[#beb5b5]">No source URL was saved with this proposal.</p>
            )}
          </div>

          {overview.topics.length > 0 ? (
            <div>
              <p className="text-[0.64rem] font-semibold uppercase tracking-[0.2em] text-[#7d7878]">Topics</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {overview.topics.map((topic) => (
                  <ResultsTopicChip key={topic} topic={topic} />
                ))}
              </div>
            </div>
          ) : null}

          {overview.statusNotice ? (
            <div className="rounded-[22px] border border-white/8 bg-[#171717] px-5 py-5">
              <p className="text-[0.96rem] leading-7 text-[#d9ead8]">{overview.statusNotice}</p>
            </div>
          ) : null}
        </div>
      </ResultsSidePanel>
    );
  }

  return (
    <ResultsSidePanel title="Review context">
      {overview.topics.length > 0 ? (
        <div>
          <p className="mt-6 text-[0.64rem] font-semibold uppercase tracking-[0.2em] text-[#7d7878]">Topics</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {overview.topics.map((topic) => (
              <ResultsTopicChip key={topic} topic={topic} />
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-6 text-[0.96rem] leading-7 text-[#beb5b5]">
          This artifact does not expose additional topic or citation context beyond the summary and technical payload.
        </p>
      )}
    </ResultsSidePanel>
  );
}

export function ArtifactDetailRail({
  artifact,
  overview,
}: {
  artifact: ArtifactRow;
  overview: ArtifactOverview;
}) {
  return (
    <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
      <ArtifactContextPanel artifact={artifact} overview={overview} />

      <ResultsSidePanel title="Record metadata" className="bg-[#111111] shadow-[0_20px_60px_rgba(0,0,0,0.22)]">
        <div className="mt-6 space-y-1">
          <ResultsMetadataRow label="Created" value={formatDateTime(artifact.created_at)} />
          <ResultsMetadataRow label="Status" value={formatStatusLabel(artifact.status).toUpperCase()} accent />
          <ResultsMetadataRow label="Kind" value={formatKindLabel(artifact.kind).toUpperCase()} />
          <ResultsMetadataRow label="Run id" value={trimIdentifier(artifact.run_id) ?? 'No run linked'} />
          <ResultsMetadataRow label="Artifact id" value={trimIdentifier(artifact.id) ?? artifact.id} />
        </div>
      </ResultsSidePanel>

      <div className="space-y-3">
        {overview.primaryLink ? (
          <ResultsActionLink
            href={overview.primaryLink.href}
            label={overview.primaryLink.label}
            icon={overview.primaryLink.external ? 'external' : artifact.kind === 'research-report' ? 'report' : 'arrow-up-right'}
            tone="primary"
            fullWidth
            external={overview.primaryLink.external}
          />
        ) : null}
        <ResultsActionLink href="/reports" label="Open archive" icon="report" fullWidth />
        <ResultsActionLink href="/today" label="Back to Research" icon="research" fullWidth />
      </div>
    </aside>
  );
}

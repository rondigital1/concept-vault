import type { ReportCardSummary } from './reportsViewModel';
import { formatDisplayDate, trimIdentifier } from './reportsViewModel';
import { ResultsActionLink } from './resultsActions';
import { ResultsMetadataRow, ResultsSidePanel } from './resultsUi';

type Props = {
  latestReport: ReportCardSummary;
  uniqueTopicCount: number;
};

export function ReportsSidebar({ latestReport, uniqueTopicCount }: Props) {
  const latestCitations = latestReport.citations.slice(0, 3);

  return (
    <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
      <ResultsSidePanel title="Verified citations" icon="stack">
        {latestCitations.length > 0 ? (
          <ul className="mt-6 space-y-6">
            {latestCitations.map((citation) => (
              <li key={citation.url}>
                <a href={citation.url} target="_blank" rel="noreferrer" className="block transition hover:opacity-80">
                  <div className="text-[0.58rem] font-semibold uppercase tracking-[0.26em] text-[#8d8787]">{citation.source}</div>
                  <div className="mt-2 text-[1rem] leading-7 text-white">{citation.title}</div>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-6 rounded-[22px] border border-white/8 bg-[#171717] px-5 py-5">
            <p className="text-[0.7rem] font-bold uppercase tracking-[0.24em] text-[#d9d1d1]">Citation preview unavailable</p>
            <p className="mt-3 text-[0.96rem] leading-7 text-[#beb5b5]">
              The latest dossier does not expose parsed citations in the archive preview yet. Open the full dossier to review the embedded source section.
            </p>
          </div>
        )}

        <div className="mt-6">
          <ResultsActionLink
            href={`/reports/${latestReport.id}`}
            label={latestCitations.length > 0 ? 'Open citations' : 'Open dossier'}
            icon="report"
            fullWidth
          />
        </div>
      </ResultsSidePanel>

      <ResultsSidePanel title="Process metadata" className="bg-[#111111] shadow-[0_20px_60px_rgba(0,0,0,0.22)]">
        <div className="mt-6 space-y-1">
          <ResultsMetadataRow label="Generated" value={formatDisplayDate(latestReport.createdAt)} />
          <ResultsMetadataRow label="Read status" value={latestReport.isUnread ? 'UNREAD' : 'OPENED'} accent />
          <ResultsMetadataRow label="Run id" value={trimIdentifier(latestReport.runId) ?? 'MANUAL'} />
          <ResultsMetadataRow label="Artifact id" value={trimIdentifier(latestReport.id) ?? latestReport.id} />
          <ResultsMetadataRow label="Topics indexed" value={`${uniqueTopicCount}`} />
        </div>
      </ResultsSidePanel>

      <div className="space-y-3">
        <ResultsActionLink href={`/reports/${latestReport.id}`} label="Open full dossier" icon="report" tone="primary" fullWidth />
        <ResultsActionLink href="/today" label="Continue in Research" icon="research" fullWidth />
        <ResultsActionLink href="/ingest" label="Add Content" icon="plus" fullWidth />
      </div>
    </aside>
  );
}

import type { ReportCitation } from '../reportsViewModel';
import { formatDisplayDate, trimIdentifier } from '../reportsViewModel';
import { ResultsActionLink } from '../resultsActions';
import { ResultsMetadataRow, ResultsSidePanel } from '../resultsUi';

type Props = {
  id: string;
  createdAt: string;
  isRead: boolean;
  runId: string | null;
  topicsCovered: string[];
  citations: ReportCitation[];
};

export function ReportDetailSidebar({
  id,
  createdAt,
  isRead,
  runId,
  topicsCovered,
  citations,
}: Props) {
  return (
    <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
      <ResultsSidePanel title="Verified citations" icon="stack">
        <ReportCitationList citations={citations} />
      </ResultsSidePanel>

      <ResultsSidePanel
        title="Process metadata"
        className="bg-[#111111] shadow-[0_20px_60px_rgba(0,0,0,0.22)]"
      >
        <div className="mt-6 space-y-1">
          <ResultsMetadataRow label="Generated" value={formatDisplayDate(createdAt)} />
          <ResultsMetadataRow label="Read status" value={isRead ? 'READ' : 'UNREAD'} accent />
          <ResultsMetadataRow label="Run id" value={trimIdentifier(runId) ?? 'MANUAL'} />
          <ResultsMetadataRow label="Artifact id" value={trimIdentifier(id) ?? id} />
          <ResultsMetadataRow label="Topics indexed" value={`${topicsCovered.length || 0}`} />
        </div>
      </ResultsSidePanel>

      <div className="space-y-3">
        <ResultsActionLink href="/reports" label="Open archive" icon="report" tone="primary" fullWidth />
        <ResultsActionLink href="/today" label="Continue in Research" icon="research" fullWidth />
        {citations.length > 0 ? (
          <ResultsActionLink
            href={citations[0].url}
            label="Open first citation"
            icon="external"
            fullWidth
            external
          />
        ) : null}
      </div>
    </aside>
  );
}

function ReportCitationList({ citations }: { citations: ReportCitation[] }) {
  if (citations.length === 0) {
    return (
      <div className="mt-6 rounded-[22px] border border-white/8 bg-[#171717] px-5 py-5">
        <p className="text-[0.7rem] font-bold uppercase tracking-[0.24em] text-[#d9d1d1]">
          No parsed citations
        </p>
        <p className="mt-3 text-[0.96rem] leading-7 text-[#beb5b5]">
          This report did not expose a structured citation list. Review the full markdown body to
          inspect any inline source section that was preserved.
        </p>
      </div>
    );
  }

  return (
    <ul className="mt-6 space-y-6">
      {citations.map((citation) => (
        <li key={`${citation.url}-${citation.title}`}>
          <a
            href={citation.url}
            target="_blank"
            rel="noreferrer"
            className="block transition hover:opacity-80"
          >
            <div className="text-[0.58rem] font-semibold uppercase tracking-[0.26em] text-[#8d8787]">
              {citation.source}
            </div>
            <div className="mt-2 text-[1rem] leading-7 text-white">{citation.title}</div>
          </a>
        </li>
      ))}
    </ul>
  );
}

'use client';

import type { Artifact } from './types';
import { formatShortDate, readNumber, readString } from './utils';
import { elevatedPanelClass, insetPanelClass, sectionLabelClass } from './WorkspaceHeaderPrimitives';

type Props = {
  queueFilter: 'pending' | 'saved';
  selectedArtifact: Artifact | null;
  summarizeArtifact: (item: Artifact) => string;
};

function artifactTone(status: Artifact['status']) {
  if (status === 'approved' || status === 'active') {
    return 'bg-[rgba(92,142,112,0.18)] text-[#e5f8ec] outline-[rgba(152,225,184,0.18)]';
  }
  if (status === 'rejected') {
    return 'bg-[rgba(173,76,76,0.22)] text-[#ffdada] outline-[rgba(255,194,194,0.16)]';
  }
  return 'bg-[rgba(255,255,255,0.08)] text-[color:var(--today-text-soft)] outline-[rgba(255,255,255,0.08)]';
}

function artifactStatusLabel(status: Artifact['status']): string {
  if (status === 'approved' || status === 'active') {
    return 'Saved';
  }
  if (status === 'rejected') {
    return 'Rejected';
  }
  return 'Pending';
}

function getHostname(url: string | null): string | null {
  if (!url) {
    return null;
  }

  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

export function EvidenceDetailPane({ queueFilter, selectedArtifact, summarizeArtifact }: Props) {
  const selectedArtifactSummary = selectedArtifact ? summarizeArtifact(selectedArtifact) : null;
  const selectedArtifactReasoning = Array.isArray(selectedArtifact?.content?.reasoning)
    ? selectedArtifact.content.reasoning.filter((entry): entry is string => typeof entry === 'string').slice(0, 5)
    : [];
  const selectedArtifactTopics = Array.isArray(selectedArtifact?.content?.topics)
    ? selectedArtifact.content.topics.filter((entry): entry is string => typeof entry === 'string').slice(0, 8)
    : [];
  const selectedArtifactUrl = selectedArtifact?.sourceUrl ?? readString(selectedArtifact?.content?.url);
  const selectedArtifactHost = getHostname(selectedArtifactUrl);
  const selectedArtifactRelevance = readNumber(selectedArtifact?.content?.relevanceScore);
  const selectedArtifactContentType = readString(selectedArtifact?.content?.contentType) ?? 'web source';

  return (
    <section className="min-h-0 bg-transparent">
      <div className="flex h-full min-h-0 flex-col">
        <div className="px-5 py-5 sm:px-6 lg:px-8">
          <p className={sectionLabelClass}>Selected evidence</p>
          {selectedArtifact ? (
            <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-[1.85rem] font-semibold tracking-[-0.03em] text-[color:var(--today-text)]">
                  {selectedArtifact.title}
                </h2>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-[color:var(--today-muted)]">
                  {selectedArtifactHost ? <span>{selectedArtifactHost}</span> : null}
                  <span>{formatShortDate(selectedArtifact.createdAt)}</span>
                  <span className="capitalize">{selectedArtifactContentType}</span>
                </div>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] outline outline-1 ${artifactTone(
                  selectedArtifact.status,
                )}`}
              >
                {artifactStatusLabel(selectedArtifact.status)}
              </span>
            </div>
          ) : (
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[color:var(--today-text)]">Choose evidence to review</h2>
          )}
        </div>

        <div className="today-scroll min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6 lg:px-8">
          {selectedArtifact ? (
            <div className="space-y-8 pb-24">
              <section>
                <p className={sectionLabelClass}>Summary</p>
                <p className="mt-3 max-w-4xl text-[1.02rem] leading-8 text-[color:var(--today-text-soft)]">{selectedArtifactSummary}</p>
              </section>

              <section className="grid gap-3 md:grid-cols-3">
                <div className={`${elevatedPanelClass} rounded-[24px] p-4`}>
                  <p className={sectionLabelClass}>Source</p>
                  <p className="mt-2 text-lg font-semibold text-[color:var(--today-text)]">
                    {selectedArtifactHost ?? 'No external URL'}
                  </p>
                </div>
                <div className={`${elevatedPanelClass} rounded-[24px] p-4`}>
                  <p className={sectionLabelClass}>Relevance</p>
                  <p className="mt-2 text-lg font-semibold text-[color:var(--today-text)]">
                    {typeof selectedArtifactRelevance === 'number'
                      ? selectedArtifactRelevance.toFixed(2)
                      : 'Not scored'}
                  </p>
                </div>
                <div className={`${elevatedPanelClass} rounded-[24px] p-4`}>
                  <p className={sectionLabelClass}>Library status</p>
                  <p className="mt-2 text-lg font-semibold text-[color:var(--today-text)]">
                    {selectedArtifact.sourceDocumentId ? 'Saved in library' : 'Not imported'}
                  </p>
                </div>
              </section>

              {selectedArtifactReasoning.length > 0 ? (
                <section>
                  <p className={sectionLabelClass}>Why it was proposed</p>
                  <ul className="mt-4 space-y-3">
                    {selectedArtifactReasoning.map((entry) => (
                      <li
                        key={entry}
                        className={`${insetPanelClass} rounded-[22px] px-4 py-3 text-sm leading-7 text-[color:var(--today-text-soft)]`}
                      >
                        {entry}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {selectedArtifactTopics.length > 0 ? (
                <section>
                  <p className={sectionLabelClass}>Topic tags</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedArtifactTopics.map((topic) => (
                      <span
                        key={topic}
                        className="rounded-full bg-[rgba(255,255,255,0.06)] px-3 py-1.5 text-xs font-medium text-[color:var(--today-text-soft)] outline outline-1 outline-[rgba(255,255,255,0.08)]"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          ) : (
            <div className="max-w-xl py-8">
              <p className={sectionLabelClass}>Selected evidence</p>
              <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[color:var(--today-text)]">
                {queueFilter === 'pending' ? 'Nothing is waiting in this queue' : 'Nothing has been saved yet'}
              </h3>
              <p className="mt-3 text-sm leading-7 text-[color:var(--today-muted)]">
                {queueFilter === 'pending'
                  ? 'When new evidence arrives for this topic, review it here and decide whether to save or reject it.'
                  : 'Switch back to Pending to review fresh evidence for this topic.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

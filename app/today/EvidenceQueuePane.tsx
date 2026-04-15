'use client';

import Link from 'next/link';
import type { Artifact, WorkflowPrimaryAction } from './types';
import { readString } from './utils';
import { secondaryButtonClass, sectionLabelClass, textLinkClass } from './WorkspaceHeaderPrimitives';
import { FindSourcesButton } from './FindSourcesButton';

// Mirrors MIN_LINKED_DOCUMENTS_FOR_REPORT in server/services/topicWorkflow.service.ts
const MIN_SOURCES_FOR_REPORT = 3;

type QueueFilter = 'pending' | 'saved';

type Props = {
  queueFilter: QueueFilter;
  pendingCount: number;
  savedCount: number;
  queueItems: Artifact[];
  selectedArtifactId: string | null;
  primaryAction: WorkflowPrimaryAction | null;
  topicId: string | null;
  topicName: string | null;
  lastCheckedAt: string | null;
  onQueueFilterChange: (filter: QueueFilter) => void;
  onArtifactSelect: (artifactId: string) => void;
  summarizeArtifact: (item: Artifact) => string;
};

function agentLabel(agent: string): string {
  if (agent === 'web-scout' || agent === 'webScout') return 'via Web Agent';
  if (agent === 'distiller') return 'via Distiller';
  if (agent === 'curator') return 'via Curator';
  return `via ${agent}`;
}

function formatRelativeTime(isoTimestamp: string): string {
  const diffMs = Date.now() - new Date(isoTimestamp).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
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

function QueueFilterButton({
  label,
  count,
  isActive,
  onClick,
}: {
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-default outline outline-1 ${
        isActive
          ? 'bg-[color:var(--today-accent-strong)] text-[color:var(--today-accent-ink)] outline-transparent shadow-[0_12px_24px_rgba(0,0,0,0.22)]'
          : 'bg-[rgba(255,255,255,0.05)] text-[color:var(--today-text-soft)] outline-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.08)] hover:outline-[rgba(255,255,255,0.12)]'
      }`}
    >
      <span>{label}</span>
      <span className="rounded-full bg-[rgba(0,0,0,0.24)] px-2 py-0.5 text-xs text-[color:var(--today-muted-strong)]">
        {count}
      </span>
    </button>
  );
}

function EmptyQueueState({
  queueFilter,
  savedCount,
  primaryAction,
  topicId,
  topicName,
  lastCheckedAt,
  onQueueFilterChange,
}: {
  queueFilter: QueueFilter;
  savedCount: number;
  primaryAction: WorkflowPrimaryAction | null;
  topicId: string | null;
  topicName: string | null;
  lastCheckedAt: string | null;
  onQueueFilterChange: (filter: QueueFilter) => void;
}) {
  if (queueFilter === 'saved') {
    return (
      <div className="px-5 py-8 sm:px-6">
        <h3 className="text-base font-semibold text-[color:var(--today-text)]">No saved evidence yet</h3>
        <p className="mt-2 text-sm leading-7 text-[color:var(--today-muted)]">
          Saved evidence will appear here after you keep strong sources from the pending queue.
        </p>
      </div>
    );
  }

  if (primaryAction === 'find_sources' && topicId && topicName) {
    return (
      <div className="px-5 py-8 sm:px-6">
        <svg className="h-8 w-8 text-[color:var(--today-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v3" />
          <path d="M14 2v4a2 2 0 0 0 2 2h4" />
          <circle cx="5" cy="17" r="3" />
          <path d="m7.5 19.5 1.5 1.5" />
        </svg>
        <h3 className="mt-3 text-base font-semibold text-[color:var(--today-text)]">No evidence in queue</h3>
        <p className="mt-2 text-sm leading-7 text-[color:var(--today-muted)]">
          This topic needs at least {MIN_SOURCES_FOR_REPORT} saved sources before a report can be generated.
          Run a search to find relevant evidence, then save the strongest candidates.
        </p>
        <div className="mt-5 flex flex-col gap-3">
          <FindSourcesButton scope="topic" topicId={topicId} topicName={topicName} emphasis="primary" label="Run Evidence Search" />
          <Link href="/ingest" className={textLinkClass}>
            Add sources manually
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 py-8 sm:px-6">
      <h3 className="text-base font-semibold text-[color:var(--today-text)]">No pending evidence</h3>
      <p className="mt-2 text-sm leading-7 text-[color:var(--today-muted)]">
        Nothing is waiting for review on this topic right now.
        {savedCount > 0 ? ' Switch to Saved to revisit evidence you already kept.' : ''}
      </p>
      {lastCheckedAt ? (
        <p className="mt-3 text-xs text-[color:var(--today-muted)]">Last checked {formatRelativeTime(lastCheckedAt)}</p>
      ) : null}
      {savedCount > 0 ? (
        <button type="button" onClick={() => onQueueFilterChange('saved')} className={`mt-4 ${secondaryButtonClass}`}>
          View saved evidence
        </button>
      ) : null}
    </div>
  );
}

export function EvidenceQueuePane({
  queueFilter,
  pendingCount,
  savedCount,
  queueItems,
  selectedArtifactId,
  primaryAction,
  topicId,
  topicName,
  lastCheckedAt,
  onQueueFilterChange,
  onArtifactSelect,
  summarizeArtifact,
}: Props) {
  const queueHeading = queueFilter === 'pending' ? 'Pending evidence' : 'Saved evidence';
  const queueDescription =
    queueFilter === 'pending'
      ? 'Review sources in order and decide what belongs in this topic.'
      : 'Revisit evidence that has already been kept for this topic.';

  return (
    <aside className="h-full bg-transparent">
      <div className="flex flex-col">
        <div className="px-5 py-5 sm:px-6">
          <p className={sectionLabelClass}>Queue</p>
          <h2 className="mt-2 text-[1.35rem] font-semibold tracking-[-0.03em] text-[color:var(--today-text)]">{queueHeading}</h2>
          <p className="mt-2 text-sm leading-7 text-[color:var(--today-muted)]">{queueDescription}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <QueueFilterButton
              label="Pending"
              count={pendingCount}
              isActive={queueFilter === 'pending'}
              onClick={() => onQueueFilterChange('pending')}
            />
            <QueueFilterButton
              label="Saved"
              count={savedCount}
              isActive={queueFilter === 'saved'}
              onClick={() => onQueueFilterChange('saved')}
            />
          </div>
        </div>

        <div>
          {queueFilter === 'pending' && queueItems.length > 0 ? (
            <p className="px-5 pb-1 pt-3 text-xs uppercase tracking-[0.16em] text-[color:var(--today-muted)] sm:px-6">
              S to save · D to dismiss
            </p>
          ) : null}
          {queueItems.length > 0 ? (
            <div className="today-scroll max-h-[580px] space-y-2 overflow-y-auto px-3 pb-4">
              {queueItems.map((item) => {
                const isActive = item.id === selectedArtifactId;
                const itemUrl = item.sourceUrl ?? readString(item.content?.url);
                const itemHost = getHostname(itemUrl);

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onArtifactSelect(item.id)}
                    className={`today-panel block w-full rounded-[24px] px-4 py-4 text-left transition-default ${
                      isActive
                        ? 'today-panel-high outline-[rgba(255,255,255,0.16)]'
                        : 'today-panel-lowest hover:bg-[rgba(255,255,255,0.04)]'
                    }`}
                  >
                    <div className="flex min-w-0 items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {itemHost ? (
                            <img
                              src={`https://www.google.com/s2/favicons?domain=${itemHost}&sz=16`}
                              alt=""
                              width={16}
                              height={16}
                              className="h-4 w-4 shrink-0 rounded-sm"
                            />
                          ) : null}
                          <span className="truncate text-sm font-semibold text-[color:var(--today-text)]">{item.title}</span>
                        </div>
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-[color:var(--today-muted)]">
                          {summarizeArtifact(item)}
                        </p>
                        <p className="mt-2 text-[10px] uppercase tracking-[0.16em] text-[color:var(--today-muted)]">
                          {agentLabel(item.agent)}
                        </p>
                      </div>
                      {(item.status === 'approved' || item.status === 'active') ? (
                        <svg
                          className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--today-accent-strong)]"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-label="Saved"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <path d="m9 12 2 2 4-4" />
                        </svg>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <EmptyQueueState
              queueFilter={queueFilter}
              savedCount={savedCount}
              primaryAction={primaryAction}
              topicId={topicId}
              topicName={topicName}
              lastCheckedAt={lastCheckedAt}
              onQueueFilterChange={onQueueFilterChange}
            />
          )}
        </div>
      </div>
    </aside>
  );
}

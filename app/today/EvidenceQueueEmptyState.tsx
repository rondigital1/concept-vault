'use client';

import Link from 'next/link';
import { FindSourcesButton } from './FindSourcesButton';
import { secondaryButtonClass, textLinkClass } from './WorkspaceHeaderPrimitives';
import type { QueueFilter, WorkflowPrimaryAction } from './types';

// Mirrors MIN_LINKED_DOCUMENTS_FOR_REPORT in server/services/topicWorkflow.service.ts
const MIN_SOURCES_FOR_REPORT = 3;

function formatRelativeTime(isoTimestamp: string): string {
  const diffMs = Date.now() - new Date(isoTimestamp).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) {
    return 'just now';
  }

  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export function EvidenceQueueEmptyState({
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

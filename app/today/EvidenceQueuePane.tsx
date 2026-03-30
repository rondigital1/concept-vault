'use client';

import type { Artifact } from './types';
import { formatShortDate, readNumber, readString } from './utils';
import { secondaryButtonClass, sectionLabelClass } from './WorkspaceHeaderPrimitives';

type QueueFilter = 'pending' | 'saved';

type Props = {
  queueFilter: QueueFilter;
  pendingCount: number;
  savedCount: number;
  queueItems: Artifact[];
  selectedArtifactId: string | null;
  onQueueFilterChange: (filter: QueueFilter) => void;
  onArtifactSelect: (artifactId: string) => void;
  summarizeArtifact: (item: Artifact) => string;
};

function artifactTone(status: Artifact['status']) {
  if (status === 'approved' || status === 'active') {
    return 'border-emerald-200/90 bg-emerald-50/90 text-emerald-800';
  }
  if (status === 'rejected') {
    return 'border-rose-200/90 bg-rose-50/90 text-rose-800';
  }
  return 'border-sky-200/90 bg-sky-50/90 text-sky-800';
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
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition-default ${
        isActive
          ? 'border-transparent bg-[color:var(--workbench-accent-ink)] text-white shadow-[0_10px_22px_rgba(23,60,73,0.18)]'
          : 'border-[color:var(--workbench-line)] bg-[rgba(255,252,248,0.66)] text-slate-700 hover:border-[color:var(--workbench-accent-strong)]'
      }`}
    >
      <span>{label}</span>
      <span
        className={`rounded-full px-2 py-0.5 text-xs ${
          isActive ? 'bg-white/15 text-white' : 'bg-white/90 text-slate-600'
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function EmptyQueueState({
  queueFilter,
  savedCount,
  onQueueFilterChange,
}: {
  queueFilter: QueueFilter;
  savedCount: number;
  onQueueFilterChange: (filter: QueueFilter) => void;
}) {
  if (queueFilter === 'saved') {
    return (
      <div className="px-5 py-8 sm:px-6">
        <h3 className="text-base font-semibold text-slate-950">No saved evidence yet</h3>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          Saved evidence will appear here after you keep strong sources from the pending queue.
        </p>
      </div>
    );
  }

  return (
    <div className="px-5 py-8 sm:px-6">
      <h3 className="text-base font-semibold text-slate-950">No pending evidence</h3>
      <p className="mt-2 text-sm leading-7 text-slate-600">
        Nothing is waiting for review on this topic right now.
        {savedCount > 0 ? ' Switch to Saved to revisit evidence you already kept.' : ''}
      </p>
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
    <aside className="workbench-rail min-h-0 border-b border-[color:var(--workbench-line)] xl:border-b-0 xl:border-r">
      <div className="flex h-full min-h-0 flex-col">
        <div className="border-b border-[color:var(--workbench-line)] px-5 py-5 sm:px-6">
          <p className={sectionLabelClass}>Queue</p>
          <h2 className="mt-2 text-[1.35rem] font-semibold tracking-[-0.03em] text-slate-950">{queueHeading}</h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">{queueDescription}</p>
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

        <div className="min-h-0 flex-1 overflow-y-auto">
          {queueItems.length > 0 ? (
            <div className="divide-y divide-[color:var(--workbench-line)]">
              {queueItems.map((item) => {
                const isActive = item.id === selectedArtifactId;
                const itemUrl = item.sourceUrl ?? readString(item.content?.url);
                const itemHost = getHostname(itemUrl);
                const itemRelevance = readNumber(item.content?.relevanceScore);

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onArtifactSelect(item.id)}
                    className={`block w-full px-5 py-4 text-left transition-default sm:px-6 ${
                      isActive
                        ? 'bg-[rgba(255,252,248,0.84)] shadow-[inset_3px_0_0_var(--workbench-accent-ink)]'
                        : 'hover:bg-[rgba(255,252,248,0.58)]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-sm font-semibold text-slate-950">{item.title}</span>
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] ${artifactTone(
                              item.status,
                            )}`}
                          >
                            {artifactStatusLabel(item.status)}
                          </span>
                        </div>
                        <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
                          {summarizeArtifact(item)}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                          {itemHost ? <span>{itemHost}</span> : null}
                          <span>{formatShortDate(item.createdAt)}</span>
                          {itemRelevance !== null ? <span>Score {itemRelevance.toFixed(2)}</span> : null}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <EmptyQueueState
              queueFilter={queueFilter}
              savedCount={savedCount}
              onQueueFilterChange={onQueueFilterChange}
            />
          )}
        </div>
      </div>
    </aside>
  );
}

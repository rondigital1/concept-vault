'use client';

import type { Artifact, QueueFilter, WorkflowPrimaryAction } from './types';
import { EvidenceQueueEmptyState } from './EvidenceQueueEmptyState';
import { EvidenceQueueItem } from './EvidenceQueueItem';
import { sectionLabelClass } from './WorkspaceHeaderPrimitives';

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
              {queueItems.map((item) => (
                <EvidenceQueueItem
                  key={item.id}
                  item={item}
                  isActive={item.id === selectedArtifactId}
                  onArtifactSelect={onArtifactSelect}
                  summarizeArtifact={summarizeArtifact}
                />
              ))}
            </div>
          ) : (
            <EvidenceQueueEmptyState
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

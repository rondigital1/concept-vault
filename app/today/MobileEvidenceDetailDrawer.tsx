'use client';

import { EvidenceDetailStack } from './EvidenceDetailStack';
import { secondaryButtonClass } from './WorkspaceHeaderPrimitives';
import type { Artifact, QueueFilter } from './types';

export function MobileEvidenceDetailDrawer({
  isOpen,
  selectedArtifact,
  queueFilter,
  summarizeArtifact,
  onClose,
}: {
  isOpen: boolean;
  selectedArtifact: Artifact | null;
  queueFilter: QueueFilter;
  summarizeArtifact: (item: Artifact) => string;
  onClose: () => void;
}) {
  return isOpen && selectedArtifact ? (
    <div className="fixed inset-0 z-40 min-[980px]:hidden">
      <button
        type="button"
        aria-label="Close evidence detail"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-[6px]"
      />
      <aside className="today-panel today-panel-high today-glass absolute inset-x-0 bottom-0 top-[10vh] z-10 flex flex-col rounded-t-[28px]">
        <div className="absolute right-4 top-4 z-10">
          <button
            type="button"
            onClick={onClose}
            className={`${secondaryButtonClass} h-10 w-10 px-0`}
            aria-label="Close evidence detail"
          >
            ×
          </button>
        </div>
        <div className="flex h-full min-h-0 flex-col">
          <EvidenceDetailStack
            queueFilter={queueFilter}
            selectedArtifact={selectedArtifact}
            summarizeArtifact={summarizeArtifact}
          />
        </div>
      </aside>
    </div>
  ) : null;
}

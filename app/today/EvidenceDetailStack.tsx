'use client';

import { EvidenceDecisionBar } from './EvidenceDecisionBar';
import { EvidenceDetailPane } from './EvidenceDetailPane';
import type { Artifact, QueueFilter } from './types';

export function EvidenceDetailStack({
  queueFilter,
  selectedArtifact,
  summarizeArtifact,
}: {
  queueFilter: QueueFilter;
  selectedArtifact: Artifact | null;
  summarizeArtifact: (item: Artifact) => string;
}) {
  return (
    <>
      <EvidenceDetailPane
        queueFilter={queueFilter}
        selectedArtifact={selectedArtifact}
        summarizeArtifact={summarizeArtifact}
      />
      <EvidenceDecisionBar selectedArtifact={selectedArtifact} />
    </>
  );
}

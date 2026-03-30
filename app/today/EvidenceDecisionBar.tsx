'use client';

import Link from 'next/link';
import type { Artifact } from './types';
import { artifactDetailHref, readString } from './utils';
import { primaryButtonClass, secondaryButtonClass, textLinkClass } from './WorkspaceHeaderPrimitives';

type Props = {
  selectedArtifact: Artifact | null;
};

function artifactStatusLabel(status: Artifact['status']): string {
  if (status === 'approved' || status === 'active') {
    return 'Saved';
  }
  if (status === 'rejected') {
    return 'Rejected';
  }
  return 'Pending';
}

export function EvidenceDecisionBar({ selectedArtifact }: Props) {
  if (!selectedArtifact) {
    return null;
  }

  const selectedArtifactUrl = selectedArtifact.sourceUrl ?? readString(selectedArtifact.content?.url);

  return (
    <div className="sticky bottom-0 border-t border-[color:var(--workbench-line)] bg-[rgba(247,241,233,0.92)] px-5 py-4 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center gap-3">
        {selectedArtifact.status === 'proposed' ? (
          <>
            <form
              action={`/api/artifacts/${selectedArtifact.id}/approve`}
              method="POST"
              data-artifact-action="approve"
              data-artifact-id={selectedArtifact.id}
            >
              <button type="submit" className={primaryButtonClass}>
                Save evidence
              </button>
            </form>
            <form
              action={`/api/artifacts/${selectedArtifact.id}/reject`}
              method="POST"
              data-artifact-action="reject"
              data-artifact-id={selectedArtifact.id}
            >
              <button
                type="submit"
                className={`${secondaryButtonClass} border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-50`}
              >
                Reject
              </button>
            </form>
          </>
        ) : (
          <div className="rounded-full border border-emerald-200/90 bg-emerald-50/90 px-4 py-2 text-sm font-medium text-emerald-800">
            {artifactStatusLabel(selectedArtifact.status)} for this topic
          </div>
        )}

        {selectedArtifactUrl ? (
          <a
            href={selectedArtifactUrl}
            target="_blank"
            rel="noreferrer"
            className={secondaryButtonClass}
          >
            Open source
          </a>
        ) : null}

        <Link href={artifactDetailHref(selectedArtifact)} className={textLinkClass}>
          Open full detail
        </Link>
      </div>
    </div>
  );
}

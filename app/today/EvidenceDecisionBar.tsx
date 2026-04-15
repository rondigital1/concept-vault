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
    <div className="today-glass sticky bottom-0 px-5 py-4 sm:px-6 lg:px-8">
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
                className={`${secondaryButtonClass} !bg-[rgba(143,58,58,0.18)] !text-[#ffdada] !outline-[rgba(255,194,194,0.16)] hover:!bg-[rgba(143,58,58,0.24)]`}
              >
                Reject
              </button>
            </form>
          </>
        ) : (
          <div className="rounded-full bg-[rgba(92,142,112,0.18)] px-4 py-2 text-sm font-medium text-[#e5f8ec] outline outline-1 outline-[rgba(152,225,184,0.18)]">
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

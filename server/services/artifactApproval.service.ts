import { detectWorkspaceAccess, recordAuthorizationDenied } from '@/server/auth/authzAudit';
import type { SessionWorkspaceContext } from '@/server/auth/workspaceContext';
import {
  approveArtifact,
  getArtifactById,
  mergeArtifactReviewMetadata,
} from '@/server/repos/artifacts.repo';
import {
  buildFailedLibraryImportPayload,
  buildLibraryImportPayload,
  hasValidWebProposalUrl,
  importApprovedWebProposal,
  type LibraryImportPayload,
  prepareWebProposalImport,
  type PreparedWebProposalImport,
} from '@/server/services/artifactApprovalWebImport.service';

const ARTIFACT_NOT_REVIEWABLE_MESSAGE = 'Artifact not found or already reviewed';
const INVALID_WEB_PROPOSAL_URL_MESSAGE = 'Approved web proposal is missing a valid URL';

type ArtifactForApproval = NonNullable<Awaited<ReturnType<typeof getArtifactById>>>;

export class ArtifactApprovalError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ArtifactApprovalError';
    this.status = status;
  }
}

export interface ArtifactApprovalResult {
  artifactKind: string;
  id: string;
  libraryImport: LibraryImportPayload | null;
  status: 'approved';
}

export async function approveArtifactForWorkspace(
  scope: SessionWorkspaceContext,
  artifactId: string,
): Promise<ArtifactApprovalResult> {
  const artifact = await getProposedArtifactForApproval(scope, artifactId);
  const preparedWebImport = await prepareArtifactImport(artifact);

  const approved = await approveArtifact(scope, artifactId);
  if (!approved) {
    await recordReviewDeniedIfForbidden(scope, artifactId);
    throw new ArtifactApprovalError(404, ARTIFACT_NOT_REVIEWABLE_MESSAGE);
  }

  const libraryImport = preparedWebImport
    ? await importAndLinkApprovedWebProposal(scope, artifactId, preparedWebImport)
    : null;

  return {
    id: artifactId,
    status: 'approved',
    artifactKind: artifact.kind,
    libraryImport,
  };
}

async function getProposedArtifactForApproval(
  scope: SessionWorkspaceContext,
  artifactId: string,
): Promise<ArtifactForApproval> {
  const artifact = await getArtifactById(scope, artifactId);
  if (!artifact || artifact.status !== 'proposed') {
    await recordReviewDeniedIfForbidden(scope, artifactId);
    throw new ArtifactApprovalError(404, ARTIFACT_NOT_REVIEWABLE_MESSAGE);
  }

  return artifact;
}

async function prepareArtifactImport(
  artifact: ArtifactForApproval,
): Promise<PreparedWebProposalImport | null> {
  if (artifact.kind !== 'web-proposal') {
    return null;
  }

  if (!hasValidWebProposalUrl(artifact.content)) {
    throw new ArtifactApprovalError(422, INVALID_WEB_PROPOSAL_URL_MESSAGE);
  }

  return prepareWebProposalImport({
    id: artifact.id,
    title: artifact.title,
    content: artifact.content,
  });
}

async function importAndLinkApprovedWebProposal(
  scope: SessionWorkspaceContext,
  artifactId: string,
  preparedImport: PreparedWebProposalImport,
): Promise<LibraryImportPayload> {
  try {
    const importResult = await importApprovedWebProposal(scope.workspaceId, preparedImport);
    const linked = await mergeArtifactReviewMetadata(scope, artifactId, {
      documentId: importResult.documentId,
    });
    if (!linked) {
      throw new Error('Approved artifact could not be linked to the imported document');
    }

    return buildLibraryImportPayload(importResult);
  } catch (importError) {
    console.error(
      `[artifact-approve] Approved ${artifactId}, but library import failed:`,
      importError,
    );
    return buildFailedLibraryImportPayload(importError);
  }
}

async function recordReviewDeniedIfForbidden(
  scope: SessionWorkspaceContext,
  artifactId: string,
): Promise<void> {
  const access = await detectWorkspaceAccess({
    table: 'artifacts',
    recordId: artifactId,
    workspaceId: scope.workspaceId,
  });
  if (access === 'forbidden') {
    recordAuthorizationDenied({
      table: 'artifacts',
      action: 'approve',
      recordId: artifactId,
      workspaceId: scope.workspaceId,
      userId: scope.userId,
    });
  }
}

import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { detectWorkspaceAccess, recordAuthorizationDenied } from '@/server/auth/authzAudit';
import { WorkspaceAccessError, requireSessionWorkspace } from '@/server/auth/workspaceContext';
import {
  approveArtifact,
  getArtifactById,
  mergeArtifactReviewMetadata,
} from '@/server/repos/artifacts.repo';
import type { IngestWorkflowResult } from '@/server/services/ingestWorkflow.service';
import {
  buildFailedLibraryImportPayload,
  buildInvalidWebProposalResponse,
  buildLibraryImportPayload,
  buildNotFoundResponse,
  buildRedirectUrl,
  isJsonRequest,
  resolveApproveError,
} from './approveResponses';
import {
  hasValidWebProposalUrl,
  importApprovedWebProposal,
  prepareWebProposalImport,
  type PreparedWebProposalImport,
} from './webProposalImport';

export const runtime = 'nodejs';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const contentType = request.headers.get('content-type') ?? '';
  const expectsJson = isJsonRequest(contentType);

  try {
    const scope = await requireSessionWorkspace();
    const { id } = await params;

    const artifact = await getArtifactById(scope, id);
    if (!artifact || artifact.status !== 'proposed') {
      if ((await detectWorkspaceAccess({ table: 'artifacts', recordId: id, workspaceId: scope.workspaceId })) === 'forbidden') {
        recordAuthorizationDenied({
          table: 'artifacts',
          action: 'approve',
          recordId: id,
          workspaceId: scope.workspaceId,
          userId: scope.userId,
        });
      }
      return buildNotFoundResponse(request, expectsJson);
    }

    let preparedWebImport: PreparedWebProposalImport | null = null;
    if (artifact.kind === 'web-proposal') {
      if (!hasValidWebProposalUrl(artifact.content)) {
        return buildInvalidWebProposalResponse(request, expectsJson);
      }

      preparedWebImport = await prepareWebProposalImport({
        id: artifact.id,
        title: artifact.title,
        content: artifact.content,
      });
    }

    const approved = await approveArtifact(scope, id);

    if (!approved) {
      if ((await detectWorkspaceAccess({ table: 'artifacts', recordId: id, workspaceId: scope.workspaceId })) === 'forbidden') {
        recordAuthorizationDenied({
          table: 'artifacts',
          action: 'approve',
          recordId: id,
          workspaceId: scope.workspaceId,
          userId: scope.userId,
        });
      }
      return buildNotFoundResponse(request, expectsJson);
    }

    let webImportResult: IngestWorkflowResult | null = null;
    let webImportError: unknown = null;
    if (preparedWebImport) {
      try {
        webImportResult = await importApprovedWebProposal(scope.workspaceId, preparedWebImport);
        const linked = await mergeArtifactReviewMetadata(scope, id, {
          documentId: webImportResult.documentId,
        });
        if (!linked) {
          throw new Error('Approved artifact could not be linked to the imported document');
        }
      } catch (importError) {
        webImportError = importError;
        console.error(
          `[artifact-approve] Approved ${id}, but library import failed:`,
          importError,
        );
      }
    }

    revalidatePath('/library');
    revalidatePath('/today');

    if (!expectsJson) {
      const infoMessage = artifact.kind === 'web-proposal'
        ? webImportError
          ? 'Evidence saved, but the Library import failed. Try importing the source manually.'
          : webImportResult?.created
          ? 'Evidence saved. Added to Library and available for future topic reports.'
          : 'Evidence saved. Source was already in Library and remains available for future topic reports.'
        : 'Evidence saved.';
      return NextResponse.redirect(buildRedirectUrl(request, { infoMessage }), { status: 303 });
    }

    return NextResponse.json({
      ok: true,
      id,
      status: 'approved',
      libraryImport: preparedWebImport
        ? webImportResult
          ? buildLibraryImportPayload(webImportResult)
          : buildFailedLibraryImportPayload(webImportError)
        : null,
    });
  } catch (error) {
    if (error instanceof WorkspaceAccessError) {
      if (!expectsJson) {
        return NextResponse.redirect(buildRedirectUrl(request, { errorMessage: error.message }), { status: 303 });
      }
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const resolved = resolveApproveError(error);
    if (!expectsJson) {
      return NextResponse.redirect(
        buildRedirectUrl(request, { errorMessage: resolved.message }),
        { status: 303 },
      );
    }
    return NextResponse.json({ error: resolved.message }, { status: resolved.status });
  }
}

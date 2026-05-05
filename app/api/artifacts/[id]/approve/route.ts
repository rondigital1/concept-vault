import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { detectWorkspaceAccess, recordAuthorizationDenied } from '@/server/auth/authzAudit';
import { WorkspaceAccessError, requireSessionWorkspace } from '@/server/auth/workspaceContext';
import {
  approveArtifact,
  getArtifactById,
  mergeArtifactReviewMetadata,
} from '@/server/repos/artifacts.repo';
import { publicErrorMessage } from '@/server/security/publicError';
import { BlockedSourceError } from '@/server/security/sourceTrust';
import { extractDocumentFromUrl, isHttpUrl } from '@/server/services/urlExtract.service';
import {
  ingestPreparedContent,
  type IngestWorkflowResult,
} from '@/server/services/ingestWorkflow.service';

export const runtime = 'nodejs';

const RESEARCH_FALLBACK_PATH = '/today';

function isJsonRequest(contentType: string): boolean {
  return contentType.includes('application/json');
}

function buildRedirectUrl(request: Request, options?: { errorMessage?: string; infoMessage?: string }): URL {
  const fallback = new URL(RESEARCH_FALLBACK_PATH, request.url);
  const referer = request.headers.get('referer');
  let target = fallback;

  if (referer) {
    try {
      target = new URL(referer);
    } catch {
      target = fallback;
    }
  }

  if (options?.errorMessage) {
    target.searchParams.set('artifactActionError', options.errorMessage);
    target.searchParams.delete('artifactActionInfo');
  } else {
    target.searchParams.delete('artifactActionError');
    if (options?.infoMessage) {
      target.searchParams.set('artifactActionInfo', options.infoMessage);
    } else {
      target.searchParams.delete('artifactActionInfo');
    }
  }

  return target;
}

function parseWebProposalUrl(content: unknown): string {
  if (!content || typeof content !== 'object') return '';
  const record = content as Record<string, unknown>;
  return typeof record.url === 'string' ? record.url.trim() : '';
}

function parseWebProposalSummary(content: unknown): string {
  if (!content || typeof content !== 'object') return '';
  const record = content as Record<string, unknown>;
  return typeof record.summary === 'string' ? record.summary.trim() : '';
}

type PreparedWebProposalImport = {
  url: string;
  title: string;
  content: string;
};

async function prepareWebProposalImport(
  artifact: { id: string; title: string; content: unknown },
): Promise<PreparedWebProposalImport> {
  const url = parseWebProposalUrl(artifact.content);
  if (!isHttpUrl(url)) {
    throw new Error('Approved web proposal is missing a valid URL');
  }

  try {
    const extracted = await extractDocumentFromUrl(url);
    const titleFromExtraction =
      typeof extracted.title === 'string' && extracted.title.trim()
        ? extracted.title.trim()
        : '';
    return {
      url,
      title: titleFromExtraction || artifact.title || url,
      content: extracted.content,
    };
  } catch (importError) {
    if (importError instanceof BlockedSourceError) {
      throw importError;
    }

    const summaryFallback = parseWebProposalSummary(artifact.content);
    if (!summaryFallback) {
      throw importError;
    }

    console.warn(
      `[artifact-approve] URL extraction failed for ${artifact.id}; falling back to stored summary:`,
      publicErrorMessage(importError, 'Import failed'),
    );

    return {
      url,
      title: artifact.title || url,
      content: summaryFallback,
    };
  }
}

async function importApprovedWebProposal(
  workspaceId: string,
  preparedImport: PreparedWebProposalImport,
): Promise<IngestWorkflowResult> {
  return ingestPreparedContent({
    workspaceId,
    title: preparedImport.title,
    source: preparedImport.url,
    content: preparedImport.content,
    autoEnrich: true,
    enableAutoDistill: false,
    titleMaxLength: 300,
    missingContentMessage: 'Approved web proposal content is empty',
  });
}

function buildLibraryImportPayload(result: IngestWorkflowResult) {
  return {
    status: result.created ? ('imported' as const) : ('linked' as const),
    documentId: result.documentId,
    created: result.created,
    enrichmentJobId: result.enrichmentJobId,
    enrichmentQueued: result.enrichmentQueued,
    enrichmentRunId: result.enrichmentRunId,
  };
}

function buildFailedLibraryImportPayload(error: unknown) {
  return {
    status: 'failed' as const,
    error: publicErrorMessage(error, 'Library import failed'),
  };
}

function getPostgresErrorCode(error: unknown): string | null {
  if (typeof error !== 'object' || error === null) return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : null;
}

function isSchemaMissingError(error: unknown): boolean {
  const code = getPostgresErrorCode(error);
  if (code === '42P01' || code === '3F000') return true;
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  return message.includes('relation') && message.includes('does not exist');
}

function isLockTimeoutError(error: unknown): boolean {
  const code = getPostgresErrorCode(error);
  if (code === '55P03' || code === '57014') return true;
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  return message.includes('lock timeout') || message.includes('statement timeout');
}

function resolveApproveError(error: unknown): { status: number; message: string } {
  if (error instanceof BlockedSourceError) {
    return {
      status: error.status,
      message: publicErrorMessage(error, 'Blocked by source trust policy'),
    };
  }
  if (isSchemaMissingError(error)) {
    return {
      status: 503,
      message: 'Database schema is not initialized. Run `npm run db:init`.',
    };
  }
  if (isLockTimeoutError(error)) {
    return {
      status: 409,
      message: 'Artifact is busy. Please retry.',
    };
  }
  return {
    status: 500,
    message: publicErrorMessage(error, 'Failed to approve artifact'),
  };
}

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
      const message = 'Artifact not found or already reviewed';
      if (!expectsJson) {
        return NextResponse.redirect(buildRedirectUrl(request, { errorMessage: message }), { status: 303 });
      }
      return NextResponse.json({ error: message }, { status: 404 });
    }

    let preparedWebImport: PreparedWebProposalImport | null = null;
    if (artifact.kind === 'web-proposal') {
      const url = parseWebProposalUrl(artifact.content);
      if (!isHttpUrl(url)) {
        const message = 'Approved web proposal is missing a valid URL';
        if (!expectsJson) {
          return NextResponse.redirect(buildRedirectUrl(request, { errorMessage: message }), { status: 303 });
        }
        return NextResponse.json({ error: message }, { status: 422 });
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
      const message = 'Artifact not found or already reviewed';
      if (!expectsJson) {
        return NextResponse.redirect(buildRedirectUrl(request, { errorMessage: message }), { status: 303 });
      }
      return NextResponse.json({ error: message }, { status: 404 });
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

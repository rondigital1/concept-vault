import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { approveArtifact, getArtifactById } from '@/server/repos/artifacts.repo';
import { publicErrorMessage } from '@/server/security/publicError';
import { extractDocumentFromUrl, isHttpUrl } from '@/server/services/urlExtract.service';
import { ingestDocument } from '@/server/services/ingest.service';

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

type ApprovedWebProposalImport = {
  documentId: string;
  created: boolean;
};

async function importApprovedWebProposal(
  artifact: { id: string; title: string; content: unknown },
): Promise<ApprovedWebProposalImport> {
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
    const ingestTitle = (titleFromExtraction || artifact.title || url).slice(0, 300);
    return await ingestDocument({
      title: ingestTitle,
      source: url,
      content: extracted.content,
      autoEnrich: true,
      enableAutoDistill: false,
    });
  } catch (importError) {
    const summaryFallback = parseWebProposalSummary(artifact.content);
    if (!summaryFallback) {
      throw importError;
    }

    console.warn(
      `[artifact-approve] URL extraction failed for ${artifact.id}; falling back to stored summary:`,
      publicErrorMessage(importError, 'Import failed'),
    );

    const ingestTitle = (artifact.title || url).slice(0, 300);
    return ingestDocument({
      title: ingestTitle,
      source: url,
      content: summaryFallback,
      autoEnrich: true,
      enableAutoDistill: false,
    });
  }
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
    const { id } = await params;

    const artifact = await getArtifactById(id);
    if (!artifact || artifact.status !== 'proposed') {
      const message = 'Artifact not found or already reviewed';
      if (!expectsJson) {
        return NextResponse.redirect(buildRedirectUrl(request, { errorMessage: message }), { status: 303 });
      }
      return NextResponse.json({ error: message }, { status: 404 });
    }

    let webImportResult: ApprovedWebProposalImport | null = null;
    if (artifact.kind === 'web-proposal') {
      const url = parseWebProposalUrl(artifact.content);
      if (!isHttpUrl(url)) {
        const message = 'Approved web proposal is missing a valid URL';
        if (!expectsJson) {
          return NextResponse.redirect(buildRedirectUrl(request, { errorMessage: message }), { status: 303 });
        }
        return NextResponse.json({ error: message }, { status: 422 });
      }

      webImportResult = await importApprovedWebProposal({
        id: artifact.id,
        title: artifact.title,
        content: artifact.content,
      });
    }

    const approved = await approveArtifact(
      id,
      webImportResult ? { documentId: webImportResult.documentId } : undefined,
    );

    if (!approved) {
      const message = 'Artifact not found or already reviewed';
      if (!expectsJson) {
        return NextResponse.redirect(buildRedirectUrl(request, { errorMessage: message }), { status: 303 });
      }
      return NextResponse.json({ error: message }, { status: 404 });
    }

    revalidatePath('/library');
    revalidatePath('/today');

    if (!expectsJson) {
      const infoMessage = artifact.kind === 'web-proposal'
        ? webImportResult?.created
          ? 'Evidence saved. Added to Library and available for future topic reports.'
          : 'Evidence saved. Source was already in Library and remains available for future topic reports.'
        : 'Evidence saved.';
      return NextResponse.redirect(buildRedirectUrl(request, { infoMessage }), { status: 303 });
    }

    return NextResponse.json({
      ok: true,
      id,
      status: 'approved',
      libraryImport: webImportResult
        ? {
            status: webImportResult.created ? 'imported' : 'linked',
            documentId: webImportResult.documentId,
            created: webImportResult.created,
          }
        : null,
    });
  } catch (error) {
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

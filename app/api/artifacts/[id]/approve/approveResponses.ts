import { publicErrorMessage } from '@/server/security/publicError';
import { BlockedSourceError } from '@/server/security/sourceTrust';
import type { ArtifactApprovalResult } from '@/server/services/artifactApproval.service';

const RESEARCH_FALLBACK_PATH = '/today';

export function isJsonRequest(contentType: string): boolean {
  return contentType.includes('application/json');
}

export function buildRedirectUrl(
  request: Request,
  options?: { errorMessage?: string; infoMessage?: string },
): URL {
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

export function buildApprovalInfoMessage(result: ArtifactApprovalResult): string {
  if (result.artifactKind !== 'web-proposal') {
    return 'Evidence saved.';
  }

  if (result.libraryImport?.status === 'failed') {
    return 'Evidence saved, but the Library import failed. Try importing the source manually.';
  }

  if (result.libraryImport?.status === 'imported') {
    return 'Evidence saved. Added to Library and available for future topic reports.';
  }

  return 'Evidence saved. Source was already in Library and remains available for future topic reports.';
}

export function resolveApproveError(error: unknown): { status: number; message: string } {
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

function getPostgresErrorCode(error: unknown): string | null {
  if (typeof error !== 'object' || error === null) {
    return null;
  }

  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : null;
}

function isSchemaMissingError(error: unknown): boolean {
  const code = getPostgresErrorCode(error);
  if (code === '42P01' || code === '3F000') {
    return true;
  }

  const message = error instanceof Error ? error.message.toLowerCase() : '';
  return message.includes('relation') && message.includes('does not exist');
}

function isLockTimeoutError(error: unknown): boolean {
  const code = getPostgresErrorCode(error);
  if (code === '55P03' || code === '57014') {
    return true;
  }

  const message = error instanceof Error ? error.message.toLowerCase() : '';
  return message.includes('lock timeout') || message.includes('statement timeout');
}

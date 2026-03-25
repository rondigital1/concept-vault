import { NextResponse } from 'next/server';
import { rejectArtifact } from '@/server/repos/artifacts.repo';
import { publicErrorMessage } from '@/server/security/publicError';

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

function resolveRejectError(error: unknown): { status: number; message: string } {
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
    message: publicErrorMessage(error, 'Failed to reject artifact'),
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
    const rejected = await rejectArtifact(id);

    if (!rejected) {
      const message = 'Artifact not found or already reviewed';
      if (!expectsJson) {
        return NextResponse.redirect(buildRedirectUrl(request, { errorMessage: message }), { status: 303 });
      }
      return NextResponse.json({ error: message }, { status: 404 });
    }

    if (!expectsJson) {
      return NextResponse.redirect(buildRedirectUrl(request, { infoMessage: 'Artifact rejected.' }), { status: 303 });
    }

    return NextResponse.json({ ok: true, id, status: 'rejected' });
  } catch (error) {
    const resolved = resolveRejectError(error);
    if (!expectsJson) {
      return NextResponse.redirect(
        buildRedirectUrl(request, { errorMessage: resolved.message }),
        { status: 303 },
      );
    }
    return NextResponse.json({ error: resolved.message }, { status: resolved.status });
  }
}

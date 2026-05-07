import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { WorkspaceAccessError, requireSessionWorkspace } from '@/server/auth/workspaceContext';
import {
  approveArtifactForWorkspace,
  ArtifactApprovalError,
} from '@/server/services/artifactApproval.service';
import {
  buildApprovalInfoMessage,
  buildRedirectUrl,
  isJsonRequest,
  resolveApproveError,
} from './approveResponses';

export const runtime = 'nodejs';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const contentType = request.headers.get('content-type') ?? '';
  const expectsJson = isJsonRequest(contentType);

  try {
    const scope = await requireSessionWorkspace();
    const { id } = await params;

    const result = await approveArtifactForWorkspace(scope, id);

    revalidatePath('/library');
    revalidatePath('/today');

    if (!expectsJson) {
      return NextResponse.redirect(
        buildRedirectUrl(request, { infoMessage: buildApprovalInfoMessage(result) }),
        { status: 303 },
      );
    }

    return NextResponse.json({
      ok: true,
      id: result.id,
      status: result.status,
      libraryImport: result.libraryImport,
    });
  } catch (error) {
    if (error instanceof WorkspaceAccessError) {
      if (!expectsJson) {
        return NextResponse.redirect(
          buildRedirectUrl(request, { errorMessage: error.message }),
          { status: 303 },
        );
      }
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof ArtifactApprovalError) {
      if (!expectsJson) {
        return NextResponse.redirect(
          buildRedirectUrl(request, { errorMessage: error.message }),
          { status: 303 },
        );
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

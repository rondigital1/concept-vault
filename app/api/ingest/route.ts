import { NextResponse } from "next/server";
import { WorkspaceAccessError, requireSessionWorkspace } from '@/server/auth/workspaceContext';
import { ingestRequestSchema } from '@/server/http/requestSchemas';
import {
  parseJsonRequest,
  RequestValidationError,
  validationErrorResponse,
} from '@/server/http/requestValidation';
import {
  buildIngestSuccessPayload,
  IngestWorkflowError,
  ingestTextOrUrl,
} from '@/server/services/ingestWorkflow.service';
import { publicErrorMessage } from '@/server/security/publicError';
import { BlockedSourceError } from '@/server/security/sourceTrust';

export const runtime = "nodejs";

function badRequest(message: string) {
  return NextResponse.json({ ok: false, error: message }, { status: 400 });
}

export async function POST(request: Request) {
  try {
    const scope = await requireSessionWorkspace();
    const body = await parseJsonRequest(request, ingestRequestSchema, {
      route: '/api/ingest',
    });

    const result = await ingestTextOrUrl({
      workspaceId: scope.workspaceId,
      title: body.title,
      source: body.source,
      content: body.content,
      context: '/api/ingest',
    });

    return NextResponse.json(
      buildIngestSuccessPayload(result),
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: unknown) {
    if (error instanceof RequestValidationError) {
      return validationErrorResponse(error);
    }
    if (error instanceof IngestWorkflowError) {
      return badRequest(error.message);
    }
    if (error instanceof BlockedSourceError) {
      return badRequest(publicErrorMessage(error, 'Blocked by source trust policy'));
    }
    if (error instanceof WorkspaceAccessError) {
      return NextResponse.json(
        { ok: false, error: "UNAUTHORIZED", message: error.message },
        { status: error.status }
      );
    }
    const message = publicErrorMessage(error, 'Failed to ingest document');
    return NextResponse.json(
      { ok: false, error: "INGEST_FAILED", message },
      { status: 500 }
    );
  }
}

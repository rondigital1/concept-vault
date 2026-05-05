import { NextResponse } from 'next/server';
import { WorkspaceAccessError, requireSessionWorkspace } from '@/server/auth/workspaceContext';
import { llmIngestRequestSchema } from '@/server/http/requestSchemas';
import {
  parseJsonRequest,
  RequestValidationError,
  validationErrorResponse,
} from '@/server/http/requestValidation';
import {
  buildIngestSuccessPayload,
  IngestWorkflowError,
  ingestPreparedContent,
} from '@/server/services/ingestWorkflow.service';

export async function POST(request: Request) {
  try {
    const scope = await requireSessionWorkspace();
    const { title, content, origin } = await parseJsonRequest(request, llmIngestRequestSchema, {
      route: '/api/ingest/llm',
    });

    const result = await ingestPreparedContent({
      workspaceId: scope.workspaceId,
      title: title?.trim() || "Untitled",
      source: origin.feature,
      content,
      minContentLength: 20,
      shortContentMessage: "Content must be at least 20 characters",
    });

    return NextResponse.json(
      buildIngestSuccessPayload(result),
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return validationErrorResponse(error);
    }
    if (error instanceof IngestWorkflowError) {
      return NextResponse.json(
        { ok: false, error: "INGEST_FAILED", message: error.message },
        { status: error.status },
      );
    }
    if (error instanceof WorkspaceAccessError) {
      return NextResponse.json(
        { ok: false, error: "UNAUTHORIZED", message: error.message },
        { status: error.status }
      );
    }
    console.error("Error processing LLM ingest request:", error);
    return NextResponse.json(
      { ok: false, error: "INGEST_FAILED", message: "Failed to process LLM ingest request" },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { ingestDocument } from "@/server/services/ingest.service";
import { WorkspaceAccessError, requireSessionWorkspace } from '@/server/auth/workspaceContext';
import { llmIngestRequestSchema } from '@/server/http/requestSchemas';
import {
  parseJsonRequest,
  RequestValidationError,
  validationErrorResponse,
} from '@/server/http/requestValidation';
import { schedulePipelineJobDrain } from '@/server/jobs/pipelineJobs';

export async function POST(request: Request) {
  try {
    const scope = await requireSessionWorkspace();
    const { title, content, origin } = await parseJsonRequest(request, llmIngestRequestSchema, {
      route: '/api/ingest/llm',
    });

    if (content.length < 20) {
      return NextResponse.json(
        { ok: false, error: "INGEST_FAILED", message: "Content must be at least 20 characters" },
        { status: 400 }
      );
    }

    const result = await ingestDocument({
      workspaceId: scope.workspaceId,
      title: title ?? "Untitled",
      source: origin.feature,
      content,
    });

    if (result.enrichmentQueued) {
      schedulePipelineJobDrain();
    }

    return NextResponse.json(
      {
        ok: true,
        documentId: result.documentId,
        created: result.created,
        enrichmentJobId: result.enrichmentJobId,
        enrichmentRunId: result.enrichmentRunId,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return validationErrorResponse(error);
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

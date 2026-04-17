import { NextResponse } from "next/server";
import { WorkspaceAccessError, requireSessionWorkspace } from '@/server/auth/workspaceContext';
import { ingestRequestSchema } from '@/server/http/requestSchemas';
import {
  parseJsonRequest,
  RequestValidationError,
  validationErrorResponse,
} from '@/server/http/requestValidation';
import { ingestDocument } from "@/server/services/ingest.service";
import { extractDocumentFromUrl, isHttpUrl } from "@/server/services/urlExtract.service";
import { schedulePipelineJobDrain } from '@/server/jobs/pipelineJobs';
import { publicErrorMessage } from '@/server/security/publicError';
import { assertTrustedSource, BlockedSourceError } from '@/server/security/sourceTrust';

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

    const source =
      typeof body.source === "string" && body.source.trim()
        ? body.source.trim().slice(0, 500)
        : "manual";
    const rawContent = typeof body.content === "string" ? body.content : "";
    let content = rawContent.trim();
    let extractedTitle: string | undefined;

    const shouldExtractFromUrl = isHttpUrl(source) && content.length < 50;

    if (isHttpUrl(source) && !shouldExtractFromUrl) {
      assertTrustedSource({
        context: '/api/ingest',
        url: source,
        title: body.title,
        content,
      });
    }

    if (shouldExtractFromUrl) {
      try {
        const extraction = await extractDocumentFromUrl(source);
        content = extraction.content;
        extractedTitle = extraction.title;
      } catch (error: unknown) {
        if (!content) {
          return badRequest(publicErrorMessage(error, 'Failed to extract content from URL'));
        }
      }
    }

    if (!content) {
      return badRequest("content is required for non-URL sources");
    }
    if (content.length < 50) {
      return badRequest("content is too short (min 50 chars)");
    }

    const title =
      typeof body.title === "string" && body.title.trim()
        ? body.title.trim().slice(0, 200)
        : extractedTitle
          ? extractedTitle.slice(0, 200)
        : deriveTitleFromContent(content);

    const result = await ingestDocument({ workspaceId: scope.workspaceId, title, source, content });

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
  } catch (error: unknown) {
    if (error instanceof RequestValidationError) {
      return validationErrorResponse(error);
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

function deriveTitleFromContent(content: string): string {
  // MVP: first non-empty line, stripped, bounded
  const firstLine =
    content
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l.length > 0) ?? "Untitled";

  // Avoid absurdly long titles
  return firstLine.slice(0, 200);
}

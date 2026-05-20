import { NextResponse } from "next/server";
import { WorkspaceAccessError, requireSessionWorkspace } from '@/server/auth/workspaceContext';
import { publicErrorMessage } from '@/server/security/publicError';
import {
  buildIngestSuccessPayload,
  IngestWorkflowError,
  ingestPreparedContent,
} from '@/server/services/ingestWorkflow.service';
import {
  extractTextFromFile,
  isAllowedUploadFile,
  MAX_FILE_SIZE,
} from './fileExtraction';

export const runtime = "nodejs";

function badRequest(message: string) {
  return NextResponse.json({ ok: false, error: message }, { status: 400 });
}

export async function POST(request: Request) {
  try {
    const scope = await requireSessionWorkspace();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const titleInput = formData.get("title") as string | null;

    if (!file) {
      return badRequest("No file provided");
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return badRequest(
        `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`
      );
    }

    if (!isAllowedUploadFile(file)) {
      return badRequest(
        "Unsupported file type. Allowed: PDF, TXT, DOCX, MD, CSV"
      );
    }

    // Extract text from file
    const { text, error: parseError } = await extractTextFromFile(file);

    if (parseError) {
      return badRequest(parseError);
    }

    const content = text.trim();

    if (!content) {
      return badRequest("Could not extract any text from the file");
    }

    if (content.length < 50) {
      return badRequest(
        "Extracted content is too short (min 50 chars). The file may be empty or contain only images."
      );
    }

    // Derive title from filename if not provided
    const title =
      titleInput?.trim() ||
      file.name.replace(/\.[^/.]+$/, "").slice(0, 200) ||
      "Untitled";

    const source = `file:${file.name}`;

    const result = await ingestPreparedContent({
      workspaceId: scope.workspaceId,
      title,
      source,
      content,
      minContentLength: 50,
      shortContentMessage:
        "Extracted content is too short (min 50 chars). The file may be empty or contain only images.",
    });

    return NextResponse.json(
      buildIngestSuccessPayload(result, { extractedLength: result.contentLength }),
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: unknown) {
    if (error instanceof IngestWorkflowError) {
      return badRequest(error.message);
    }
    if (error instanceof WorkspaceAccessError) {
      return NextResponse.json(
        { ok: false, error: "UNAUTHORIZED", message: error.message },
        { status: error.status }
      );
    }
    console.error("File upload error:", error);
    const message = publicErrorMessage(error, 'File upload failed');
    return NextResponse.json(
      { ok: false, error: "UPLOAD_FAILED", message },
      { status: 500 }
    );
  }
}

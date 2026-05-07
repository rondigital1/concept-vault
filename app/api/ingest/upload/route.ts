import { NextResponse } from 'next/server';
import { WorkspaceAccessError, requireSessionWorkspace } from '@/server/auth/workspaceContext';
import { publicErrorMessage } from '@/server/security/publicError';
import {
  buildIngestSuccessPayload,
  IngestWorkflowError,
  ingestPreparedContent,
} from '@/server/services/ingestWorkflow.service';
import {
  prepareUploadedDocument,
  SHORT_UPLOADED_CONTENT_MESSAGE,
  UploadRequestError,
} from './uploadRequest';

export const runtime = 'nodejs';

function badRequest(message: string): NextResponse {
  return NextResponse.json({ ok: false, error: message }, { status: 400 });
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const scope = await requireSessionWorkspace();
    const preparedDocument = await prepareUploadedDocument(request);

    const result = await ingestPreparedContent({
      workspaceId: scope.workspaceId,
      title: preparedDocument.title,
      source: preparedDocument.source,
      content: preparedDocument.content,
      minContentLength: 50,
      shortContentMessage: SHORT_UPLOADED_CONTENT_MESSAGE,
    });

    return NextResponse.json(
      buildIngestSuccessPayload(result, { extractedLength: result.contentLength }),
      { status: 200, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error: unknown) {
    if (error instanceof UploadRequestError || error instanceof IngestWorkflowError) {
      return badRequest(error.message);
    }
    if (error instanceof WorkspaceAccessError) {
      return NextResponse.json(
        { ok: false, error: 'UNAUTHORIZED', message: error.message },
        { status: error.status },
      );
    }
    console.error('File upload error:', error);
    const message = publicErrorMessage(error, 'File upload failed');
    return NextResponse.json(
      { ok: false, error: 'UPLOAD_FAILED', message },
      { status: 500 },
    );
  }
}

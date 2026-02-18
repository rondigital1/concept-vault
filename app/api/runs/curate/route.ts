import { NextResponse } from 'next/server';
import { curateFlow } from '@/server/flows/curate.flow';
import { getDocumentIdForCuration } from '@/server/services/document.service';

export const runtime = 'nodejs';

type CurateRequestBody = {
  documentId?: string;
  enableCategorization?: boolean;
};

function isJsonRequest(contentType: string): boolean {
  return contentType.includes('application/json');
}

function isFormRequest(contentType: string): boolean {
  return (
    contentType.includes('application/x-www-form-urlencoded') ||
    contentType.includes('multipart/form-data')
  );
}

function parseBooleanFlag(value: FormDataEntryValue | null): boolean {
  if (typeof value !== 'string') {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'on';
}

export async function POST(request: Request) {
  const contentType = request.headers.get('content-type') ?? '';
  const expectsJson = isJsonRequest(contentType);

  try {
    let documentId: string | null | undefined;
    let enableCategorization = false;

    if (expectsJson) {
      const body = (await request.json()) as CurateRequestBody;
      if (typeof body.documentId === 'string' && body.documentId.trim()) {
        documentId = body.documentId.trim();
      }
      if (typeof body.enableCategorization === 'boolean') {
        enableCategorization = body.enableCategorization;
      }
    } else if (isFormRequest(contentType)) {
      const formData = await request.formData();
      const rawDocumentId = formData.get('documentId');
      if (typeof rawDocumentId === 'string' && rawDocumentId.trim()) {
        documentId = rawDocumentId.trim();
      }
      enableCategorization = parseBooleanFlag(formData.get('enableCategorization'));
    }

    if (!documentId) {
      documentId = await getDocumentIdForCuration();
    }

    if (!documentId) {
      return NextResponse.json(
        { error: 'No documents available to curate' },
        { status: 400 }
      );
    }

    const runId = await curateFlow({ documentId, enableCategorization });

    if (!expectsJson) {
      return NextResponse.redirect(new URL('/today', request.url), { status: 303 });
    }

    return NextResponse.json({ runId, documentId });
  } catch (error) {
    console.error('Error creating curate run:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create run' },
      { status: 500 }
    );
  }
}

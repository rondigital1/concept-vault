import { NextResponse } from 'next/server';
import { DistillCurateInput, distillCurateFlow } from '@/server/flows/distillCurate.flow';

export const runtime = 'nodejs';

type DistillCurateRequestBody = {
  documentIds?: string[];
  limit?: number;
  topicTag?: string;
  enableCategorization?: boolean;
};

function isJsonRequest(contentType: string): boolean {
  return contentType.includes('application/json');
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
    const input: DistillCurateInput = {};

    if (expectsJson) {
      const body = (await request.json()) as DistillCurateRequestBody;

      if (Array.isArray(body.documentIds)) {
        input.documentIds = body.documentIds.filter((id): id is string => typeof id === 'string');
      }

      if (typeof body.limit === 'number' && Number.isFinite(body.limit)) {
        input.limit = body.limit;
      }

      if (typeof body.topicTag === 'string' && body.topicTag.trim()) {
        input.topicTag = body.topicTag.trim();
      }

      if (typeof body.enableCategorization === 'boolean') {
        input.enableCategorization = body.enableCategorization;
      }
    } else if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const rawTopicTag = formData.get('topicTag');
      const rawLimit = formData.get('limit');

      if (typeof rawTopicTag === 'string' && rawTopicTag.trim()) {
        input.topicTag = rawTopicTag.trim();
      }

      if (typeof rawLimit === 'string' && rawLimit.trim()) {
        const parsedLimit = Number.parseInt(rawLimit, 10);
        if (Number.isFinite(parsedLimit)) {
          input.limit = parsedLimit;
        }
      }

      input.enableCategorization = parseBooleanFlag(formData.get('enableCategorization'));
    }

    const result = await distillCurateFlow(input);

    if (!expectsJson) {
      return NextResponse.redirect(new URL('/today', request.url), { status: 303 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error running distill-curate automation:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to run distill-curate automation' },
      { status: 500 },
    );
  }
}

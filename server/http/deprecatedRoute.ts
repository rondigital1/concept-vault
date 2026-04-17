import { NextResponse } from 'next/server';
import { getOrCreateRequestId, setResponseRequestId } from '@/server/observability/context';
import { logger } from '@/server/observability/logger';

type DeprecatedRouteOptions = {
  replacement: string;
  route: string;
};

function buildMessage(replacement: string): string {
  if (replacement.startsWith('/api/cron/')) {
    return `This cron endpoint has been removed. Use ${replacement} for the canonical workflow.`;
  }

  return `This endpoint has been removed. Use ${replacement} for the canonical workflow.`;
}

export async function deprecatedRouteResponse(
  request: Request,
  options: DeprecatedRouteOptions,
): Promise<Response> {
  const requestId = getOrCreateRequestId(request);
  const pathname = new URL(request.url).pathname;
  const message = buildMessage(options.replacement);

  return logger.withContext({ requestId, route: options.route }, async () => {
    logger.warn('http.deprecated_route.hit', {
      method: request.method,
      pathname,
      replacement: options.replacement,
      referer: request.headers.get('referer') ?? null,
      userAgent: request.headers.get('user-agent') ?? null,
    });

    return setResponseRequestId(
      NextResponse.json(
        {
          error: message,
          replacement: options.replacement,
        },
        { status: 410 },
      ),
      requestId,
    );
  });
}

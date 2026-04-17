import { NextResponse } from 'next/server';
import { clientRouteErrorSchema } from '@/server/http/requestSchemas';
import {
  parseJsonRequest,
  RequestValidationError,
  validationErrorResponse,
} from '@/server/http/requestValidation';
import { getOrCreateRequestId, setResponseRequestId } from '@/server/observability/context';
import { logger } from '@/server/observability/logger';
import { reportTelemetryError } from '@/server/observability/telemetry';

export async function POST(request: Request) {
  const requestId = getOrCreateRequestId(request);

  return logger.withContext({ requestId, route: '/api/client-errors' }, async () => {
    try {
      const payload = await parseJsonRequest(request, clientRouteErrorSchema, {
        route: '/api/client-errors',
      });

      logger.error('client.route_error', payload);
      await reportTelemetryError({
        ...payload,
        receivedAt: new Date().toISOString(),
        source: 'client-route-error',
        requestId,
      });

      return setResponseRequestId(NextResponse.json({ ok: true }, { status: 202 }), requestId);
    } catch (error) {
      if (error instanceof RequestValidationError) {
        return setResponseRequestId(validationErrorResponse(error), requestId);
      }

      throw error;
    }
  });
}

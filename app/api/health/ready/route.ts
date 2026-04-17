import { NextResponse } from 'next/server';
import { sql, getSchemaStatus } from '@/db';
import { getOrCreateRequestId, setResponseRequestId } from '@/server/observability/context';
import { getTelemetryExportStatus } from '@/server/observability/telemetry';
import { logger } from '@/server/observability/logger';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const requestId = getOrCreateRequestId(request);

  return logger.withContext({ requestId, route: '/api/health/ready' }, async () => {
    try {
      await sql`SELECT 1`;
      const schema = await getSchemaStatus(sql);
      const ready = schema.ok;
      const response = NextResponse.json(
        {
          ok: ready,
          database: 'ok',
          schema,
          telemetry: getTelemetryExportStatus(),
          timestamp: new Date().toISOString(),
        },
        { status: ready ? 200 : 503 },
      );

      return setResponseRequestId(response, requestId);
    } catch (error) {
      logger.error('health.readiness.failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return setResponseRequestId(
        NextResponse.json(
          {
            ok: false,
            database: 'error',
            error: error instanceof Error ? error.message : String(error),
            telemetry: getTelemetryExportStatus(),
            timestamp: new Date().toISOString(),
          },
          { status: 503 },
        ),
        requestId,
      );
    }
  });
}

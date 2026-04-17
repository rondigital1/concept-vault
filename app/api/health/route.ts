import { NextResponse } from 'next/server';
import { getOrCreateRequestId, setResponseRequestId } from '@/server/observability/context';
import { getTelemetryExportStatus } from '@/server/observability/telemetry';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const requestId = getOrCreateRequestId(request);

  return setResponseRequestId(
    NextResponse.json({
      ok: true,
      service: 'concept-vault',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      telemetry: getTelemetryExportStatus(),
    }),
    requestId,
  );
}

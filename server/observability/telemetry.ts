type TelemetryEventType = 'error' | 'log';

export type TelemetryExportStatus = {
  errorReportingEnabled: boolean;
  telemetryExporterEnabled: boolean;
};

type TelemetryEvent = {
  payload: Record<string, unknown>;
  type: TelemetryEventType;
};

function getTelemetryUrl(type: TelemetryEventType): string | null {
  if (type === 'error') {
    return process.env.ERROR_REPORTING_URL?.trim() || null;
  }

  return process.env.TELEMETRY_EXPORTER_URL?.trim() || null;
}

async function postTelemetryEvent(event: TelemetryEvent): Promise<boolean> {
  const url = getTelemetryUrl(event.type);
  if (!url) {
    return false;
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(event.payload),
    });

    if (!response.ok) {
      console.warn(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'warn',
          message: 'telemetry.export.failed',
          exporterType: event.type,
          status: response.status,
        }),
      );
      return false;
    }

    return true;
  } catch (error) {
    console.warn(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'warn',
        message: 'telemetry.export.failed',
        exporterType: event.type,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    return false;
  }
}

export function getTelemetryExportStatus(): TelemetryExportStatus {
  return {
    telemetryExporterEnabled: Boolean(getTelemetryUrl('log')),
    errorReportingEnabled: Boolean(getTelemetryUrl('error')),
  };
}

export async function exportTelemetryLog(payload: Record<string, unknown>): Promise<boolean> {
  return postTelemetryEvent({
    type: 'log',
    payload,
  });
}

export async function reportTelemetryError(payload: Record<string, unknown>): Promise<boolean> {
  return postTelemetryEvent({
    type: 'error',
    payload,
  });
}

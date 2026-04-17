import type { ObservabilityContext } from '@/server/observability/context';
import { getObservabilityContext, withObservabilityContext } from '@/server/observability/context';
import { exportTelemetryLog } from '@/server/observability/telemetry';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
    const timestamp = new Date().toISOString();
    const payload = {
      timestamp,
      level,
      message,
      ...getObservabilityContext(),
      ...meta,
    };

    console.log(JSON.stringify(payload));
    void exportTelemetryLog(payload);
  }

  withContext<T>(context: ObservabilityContext, callback: () => T): T {
    return withObservabilityContext(context, callback);
  }

  debug(message: string, meta?: Record<string, unknown>) {
    this.log('debug', message, meta);
  }

  info(message: string, meta?: Record<string, unknown>) {
    this.log('info', message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>) {
    this.log('warn', message, meta);
  }

  error(message: string, meta?: Record<string, unknown>) {
    this.log('error', message, meta);
  }
}

export const logger = new Logger();

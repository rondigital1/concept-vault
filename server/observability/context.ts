import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

export type ObservabilityContext = {
  jobId?: string;
  requestId?: string;
  route?: string;
  runId?: string;
  stepId?: string;
  userId?: string;
  workerId?: string;
  workspaceId?: string;
};

const storage = new AsyncLocalStorage<ObservabilityContext>();

function sanitizeContext(
  context: ObservabilityContext | undefined,
): ObservabilityContext {
  if (!context) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(context).filter(([, value]) => typeof value === 'string' && value.trim().length > 0),
  ) as ObservabilityContext;
}

export function getObservabilityContext(): ObservabilityContext {
  return storage.getStore() ?? {};
}

export function withObservabilityContext<T>(
  context: ObservabilityContext,
  callback: () => T,
): T {
  const parent = getObservabilityContext();
  return storage.run(
    {
      ...parent,
      ...sanitizeContext(context),
    },
    callback,
  );
}

export function getOrCreateRequestId(request: Request): string {
  const headerValue = request.headers.get('x-request-id')?.trim();
  return headerValue && headerValue.length > 0 ? headerValue : randomUUID();
}

export function setResponseRequestId(response: Response, requestId: string): Response {
  response.headers.set('x-request-id', requestId);
  return response;
}

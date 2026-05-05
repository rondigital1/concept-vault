export type RunStatus = 'running' | 'ok' | 'error' | 'partial';

export type RunStepPayload = {
  name: string;
  status: 'running' | 'ok' | 'error' | 'skipped';
  startedAt?: string;
  endedAt?: string;
  input?: unknown;
  output?: unknown;
  error?: unknown;
};

export type RunTracePayload = {
  id: string;
  kind: string;
  status: RunStatus;
  startedAt: string;
  completedAt?: string;
  steps: RunStepPayload[];
};

function readErrorMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return fallback;
  }

  const error = (body as { error?: unknown }).error;
  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  const message = (body as { message?: unknown }).message;
  return typeof message === 'string' && message.trim() ? message : fallback;
}

export async function fetchRunTrace(
  runId: string,
  init?: RequestInit,
): Promise<RunTracePayload> {
  const response = await fetch(`/api/runs/${encodeURIComponent(runId)}`, init);

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(readErrorMessage(body, 'Failed to fetch run trace'));
  }

  return response.json();
}

export async function fetchRunTraceOrNull(
  runId: string,
  init?: RequestInit,
): Promise<RunTracePayload | null> {
  try {
    return await fetchRunTrace(runId, init);
  } catch {
    return null;
  }
}

export async function fetchRunResults<T>(
  runId: string,
  init?: RequestInit,
  fallbackMessage = 'Failed to fetch run results',
): Promise<T> {
  const response = await fetch(`/api/runs/${encodeURIComponent(runId)}/results`, init);

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(readErrorMessage(body, fallbackMessage));
  }

  return response.json();
}

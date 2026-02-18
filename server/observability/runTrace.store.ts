import { sql } from '@/db';
import { RunTrace, RunStep, RunKind, RunStatus } from './runTrace.types';

type JsonParam = Parameters<typeof sql.json>[0];

function sanitizeText(value: string): string {
  return value.includes('\u0000') ? value.replace(/\u0000/g, '') : value;
}

function sanitizeJsonValue(value: unknown, seen: WeakSet<object> = new WeakSet()): unknown {
  if (value === null || value === undefined) return value;

  if (typeof value === 'string') return sanitizeText(value);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'function' || typeof value === 'symbol') return undefined;

  if (value instanceof Date) {
    return sanitizeText(value.toISOString());
  }

  if (value instanceof Error) {
    const serialized: Record<string, unknown> = {
      name: sanitizeText(value.name),
      message: sanitizeText(value.message),
    };
    if (value.stack) serialized.stack = sanitizeText(value.stack);

    for (const [key, entry] of Object.entries(value)) {
      const cleaned = sanitizeJsonValue(entry, seen);
      if (cleaned !== undefined) {
        serialized[sanitizeText(key)] = cleaned;
      }
    }

    return serialized;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => {
      const cleaned = sanitizeJsonValue(entry, seen);
      return cleaned === undefined ? null : cleaned;
    });
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (seen.has(obj)) return '[Circular]';
    seen.add(obj);

    if (value instanceof Map) {
      const serialized: Record<string, unknown> = {};
      for (const [key, entry] of value.entries()) {
        const cleaned = sanitizeJsonValue(entry, seen);
        if (cleaned !== undefined) {
          serialized[sanitizeText(String(key))] = cleaned;
        }
      }
      return serialized;
    }

    if (value instanceof Set) {
      return Array.from(value.values()).map((entry) => {
        const cleaned = sanitizeJsonValue(entry, seen);
        return cleaned === undefined ? null : cleaned;
      });
    }

    const serialized: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(obj)) {
      const cleaned = sanitizeJsonValue(entry, seen);
      if (cleaned !== undefined) {
        serialized[sanitizeText(key)] = cleaned;
      }
    }
    return serialized;
  }

  return value;
}

function sanitizeJsonForDb(value: unknown): unknown {
  const cleaned = sanitizeJsonValue(value);
  return cleaned === undefined ? null : cleaned;
}

// Best-effort mapping because your RunStep shape may evolve.
function toDbStep(step: RunStep) {
  const s: any = step;
  return {
    stepName: s.name ?? s.stepName ?? s.step_id ?? s.stepId ?? 'step',
    toolName: s.tool ?? s.toolName ?? undefined,
    status: s.status ?? 'ok',
    startedAt: s.startedAt ?? s.started_at ?? new Date().toISOString(),
    endedAt: s.endedAt ?? s.ended_at ?? null,
    input: s.input ?? s.inputSummary ?? null,
    output: s.output ?? s.outputSummary ?? null,
    error: s.error ?? null,
    tokenEstimate: s.tokenEstimate ?? s.token_estimate ?? null,
    retryCount: s.retryCount ?? s.retry_count ?? 0,
  };
}

export async function createRun(kind: RunKind): Promise<string> {
  const rows = await sql<
    Array<{ id: string; started_at: string }>
  >`
    INSERT INTO runs (kind, status, started_at)
    VALUES (${kind}, 'running', now())
    RETURNING id, started_at
  `;

  return rows[0]!.id;
}

export async function appendStep(runId: string, step: RunStep): Promise<void> {
  const dbStep = toDbStep(step);
  const input = dbStep.input !== null ? sanitizeJsonForDb(dbStep.input) : null;
  const output = dbStep.output !== null ? sanitizeJsonForDb(dbStep.output) : null;
  const error = dbStep.error !== null ? sanitizeJsonForDb(dbStep.error) : null;
  const stepName = sanitizeText(String(dbStep.stepName));
  const toolName = dbStep.toolName ? sanitizeText(String(dbStep.toolName)) : null;
  const status = sanitizeText(String(dbStep.status));
  const startedAt = sanitizeText(String(dbStep.startedAt));
  const endedAt = dbStep.endedAt ? sanitizeText(String(dbStep.endedAt)) : null;

  // Ensure the run exists (cheap guard).
  const run = await sql<Array<{ id: string }>>`
    SELECT id FROM runs WHERE id = ${runId}
  `;
  if (!run[0]) throw new Error(`Run ${runId} not found`);

  await sql`
    INSERT INTO run_steps (
      run_id,
      step_name,
      tool_name,
      status,
      started_at,
      ended_at,
      input,
      output,
      error,
      token_estimate,
      retry_count
    ) VALUES (
      ${runId},
      ${stepName},
      ${toolName},
      ${status},
      ${startedAt},
      ${endedAt},
      ${input !== null ? sql.json(input as JsonParam) : null},
      ${output !== null ? sql.json(output as JsonParam) : null},
      ${error !== null ? sql.json(error as JsonParam) : null},
      ${dbStep.tokenEstimate},
      ${dbStep.retryCount}
    )
  `;
}

export async function finishRun(runId: string, status: RunStatus): Promise<void> {
  const updated = await sql<Array<{ id: string }>>`
    UPDATE runs
    SET status = ${status}, ended_at = now()
    WHERE id = ${runId}
    RETURNING id
  `;

  if (!updated[0]) throw new Error(`Run ${runId} not found`);
}

export async function getRunTrace(runId: string): Promise<RunTrace | null> {
  const runRows = await sql<
    Array<{ id: string; kind: RunKind; status: RunStatus; started_at: string; ended_at: string | null; metadata: any }>
  >`
    SELECT id, kind, status, started_at, ended_at, metadata
    FROM runs
    WHERE id = ${runId}
  `;

  const run = runRows[0];
  if (!run) return null;

  const stepRows = await sql<
    Array<{
      id: string;
      step_name: string;
      tool_name: string | null;
      status: string;
      started_at: string;
      ended_at: string | null;
      input: any;
      output: any;
      error: any;
      token_estimate: number | null;
      retry_count: number;
    }>
  >`
    SELECT id, step_name, tool_name, status, started_at, ended_at, input, output, error, token_estimate, retry_count
    FROM run_steps
    WHERE run_id = ${runId}
    ORDER BY started_at ASC
  `;

  // Convert DB rows back into your RunTrace / RunStep shapes.
  // Keep it permissive; the UI just needs a timeline.
  const steps = stepRows.map((r) => {
    const step: any = {
      id: r.id,
      name: r.step_name,
      tool: r.tool_name ?? undefined,
      status: r.status,
      startedAt: new Date(r.started_at).toISOString(),
      endedAt: r.ended_at ? new Date(r.ended_at).toISOString() : undefined,
      input: r.input ?? undefined,
      output: r.output ?? undefined,
      error: r.error ?? undefined,
      tokenEstimate: r.token_estimate ?? undefined,
      retryCount: r.retry_count,
    };
    return step as RunStep;
  });

  const trace: RunTrace = {
    id: run.id,
    kind: run.kind,
    status: run.status,
    startedAt: new Date(run.started_at).toISOString(),
    completedAt: run.ended_at ? new Date(run.ended_at).toISOString() : undefined,
    steps,
  };

  return trace;
}

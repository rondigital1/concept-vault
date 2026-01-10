import { sql } from '@/db';
import { RunTrace, RunStep, RunKind, RunStatus } from './runTrace.types';

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
      ${dbStep.stepName},
      ${dbStep.toolName ?? null},
      ${dbStep.status},
      ${dbStep.startedAt},
      ${dbStep.endedAt},
      ${dbStep.input !== null ? sql.json(dbStep.input) : null},
      ${dbStep.output !== null ? sql.json(dbStep.output) : null},
      ${dbStep.error !== null ? sql.json(dbStep.error) : null},
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

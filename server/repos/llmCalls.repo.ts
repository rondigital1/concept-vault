import { sql } from '@/db';

type JsonParam = Parameters<typeof sql.json>[0];

type CreateLlmCallInput = {
  costUsd?: number | null;
  error?: unknown;
  inputHash: string;
  inputTokens?: number | null;
  outputHash?: string | null;
  outputTokens?: number | null;
  privacyMode?: 'standard' | 'redact_basic';
  provider: string;
  purpose: string;
  runId?: string | null;
  schemaName: string;
  status: 'ok' | 'error';
  stepId?: string | null;
};

function sanitizeJsonValue(value: unknown, seen: WeakSet<object> = new WeakSet()): unknown {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack ?? null,
    };
  }

  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeJsonValue(entry, seen));
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (seen.has(record)) {
      return '[Circular]';
    }

    seen.add(record);

    const serialized: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(record)) {
      serialized[key] = sanitizeJsonValue(entry, seen);
    }
    return serialized;
  }

  return String(value);
}

export async function createLlmCall(input: CreateLlmCallInput): Promise<string> {
  const rows = await sql<Array<{ id: string }>>`
    INSERT INTO llm_calls (
      run_id,
      step_id,
      provider,
      purpose,
      schema_name,
      privacy_mode,
      input_hash,
      output_hash,
      input_tokens,
      output_tokens,
      cost_usd,
      status,
      error
    )
    VALUES (
      ${input.runId ?? null},
      ${input.stepId ?? null},
      ${input.provider},
      ${input.purpose},
      ${input.schemaName},
      ${input.privacyMode ?? 'redact_basic'},
      ${input.inputHash},
      ${input.outputHash ?? null},
      ${input.inputTokens ?? null},
      ${input.outputTokens ?? null},
      ${input.costUsd ?? null},
      ${input.status},
      ${sql.json(sanitizeJsonValue(input.error) as JsonParam)}
    )
    RETURNING id
  `;

  return rows[0].id;
}

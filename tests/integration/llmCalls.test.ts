import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Response } from 'openai/resources/responses/responses';
import { sql } from '@/db';
import { buildPrompt } from '@/server/ai/prompt-builder';
import { OpenAIExecutionService } from '@/server/ai/openai-execution-service';
import { AI_TASKS } from '@/server/ai/tasks';
import {
  cleanAllTables,
  closeTestDb,
  getTestWorkspaceScope,
  initTestSchema,
  insertTestRun,
} from '../helpers/testDb';

type LlmCallRow = {
  cost_usd: number | null;
  error: Record<string, unknown> | null;
  input_hash: string;
  input_tokens: number | null;
  output_hash: string | null;
  output_tokens: number | null;
  privacy_mode: string;
  provider: string;
  purpose: string;
  run_id: string | null;
  schema_name: string;
  status: 'ok' | 'error';
};

function createResponse(outputText: string): Response {
  return {
    id: 'resp-1',
    output_text: outputText,
    model: 'gpt-5-mini',
    usage: {
      input_tokens: 128,
      input_tokens_details: {
        cached_tokens: 0,
      },
      output_tokens: 32,
      output_tokens_details: {
        reasoning_tokens: 4,
      },
      total_tokens: 160,
    },
  } as Response;
}

function createPrompt(): ReturnType<typeof buildPrompt> {
  return buildPrompt({
    task: AI_TASKS.summarizeSimple,
    systemInstructions: [
      {
        heading: 'Role',
        content: 'Summarize the document.',
      },
    ],
    requestPayload: [
      {
        heading: 'Document',
        content: 'This is a short document about observability and audit trails.',
      },
    ],
  });
}

async function readLlmCalls(runId: string): Promise<LlmCallRow[]> {
  return sql<LlmCallRow[]>`
    SELECT
      run_id,
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
    FROM llm_calls
    WHERE run_id = ${runId}
    ORDER BY created_at ASC
  `;
}

describe('llm call audit records', () => {
  beforeAll(async () => {
    await initTestSchema();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    vi.restoreAllMocks();
    await cleanAllTables();
  });

  it('persists successful OpenAI calls into llm_calls', async () => {
    const scope = await getTestWorkspaceScope();
    const runId = await insertTestRun(scope, 'pipeline');
    const service = new OpenAIExecutionService({
      client: {
        responses: {
          create: vi.fn().mockResolvedValue(
            createResponse(
              'Useful summary output with enough detail to satisfy the text quality gate. It explains the main argument, highlights the operational value of durable audit trails, and closes with a concrete takeaway.',
            ),
          ),
          parse: vi.fn(),
        },
      },
    });

    const result = await service.executeText({
      task: AI_TASKS.summarizeSimple,
      prompt: createPrompt(),
      attribution: {
        runId,
        workspaceId: scope.workspaceId,
      },
    });

    expect(result.output).toContain('durable audit trails');

    const rows = await readLlmCalls(runId);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      run_id: runId,
      provider: 'openai',
      purpose: AI_TASKS.summarizeSimple,
      schema_name: 'text',
      privacy_mode: 'redact_basic',
      input_tokens: 128,
      output_tokens: 32,
      status: 'ok',
    });
    expect(rows[0].input_hash).toHaveLength(64);
    expect(rows[0].output_hash).toHaveLength(64);
    expect(rows[0].cost_usd).not.toBeNull();
    expect(rows[0].error).toBeNull();
  });

  it('persists failed OpenAI calls into llm_calls', async () => {
    const scope = await getTestWorkspaceScope();
    const runId = await insertTestRun(scope, 'pipeline');
    const service = new OpenAIExecutionService({
      client: {
        responses: {
          create: vi.fn().mockRejectedValue(new Error('OpenAI upstream failed')),
          parse: vi.fn(),
        },
      },
    });

    await expect(
      service.executeText({
        task: AI_TASKS.summarizeSimple,
        prompt: createPrompt(),
        attribution: {
          runId,
          workspaceId: scope.workspaceId,
        },
      }),
    ).rejects.toThrow('OpenAI upstream failed');

    const rows = await readLlmCalls(runId);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      run_id: runId,
      provider: 'openai',
      purpose: AI_TASKS.summarizeSimple,
      schema_name: 'text',
      privacy_mode: 'redact_basic',
      status: 'error',
      output_hash: null,
      input_tokens: null,
      output_tokens: null,
    });
    expect(rows[0].input_hash).toHaveLength(64);
    expect(rows[0].error).toMatchObject({
      message: 'OpenAI upstream failed',
      name: 'Error',
      retryCount: 0,
    });
  });
});

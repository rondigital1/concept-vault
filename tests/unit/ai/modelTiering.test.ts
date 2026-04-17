import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import type { ParsedResponse, Response } from 'openai/resources/responses/responses';
import { getTaskPolicy, canEscalateTask } from '@/server/ai/model-policy';
import { buildPrompt } from '@/server/ai/prompt-builder';
import {
  AIBudgetExceededError,
  AIValidationError,
  OpenAIExecutionService,
  type OpenAIClientLike,
} from '@/server/ai/openai-execution-service';
import { logger } from '@/server/observability/logger';
import { AI_TASKS } from '@/server/ai/tasks';

const StructuredSchema = z.object({
  tags: z.array(z.string().min(1)).min(1),
});

function createResponse(outputText: string, model: 'gpt-5-mini' | 'gpt-5.4'): Response {
  return {
    id: 'resp-test',
    usage: {
      input_tokens: 100,
      input_tokens_details: {
        cached_tokens: 0,
      },
      output_tokens: 20,
      output_tokens_details: {
        reasoning_tokens: 0,
      },
      total_tokens: 120,
    },
    output_text: outputText,
    model,
  } as unknown as Response;
}

function createParsedResponse<TParsed>(
  parsed: TParsed | null,
  model: 'gpt-5-mini' | 'gpt-5.4',
): ParsedResponse<TParsed> {
  return {
    id: 'resp-test',
    usage: {
      input_tokens: 100,
      input_tokens_details: {
        cached_tokens: 0,
      },
      output_tokens: 20,
      output_tokens_details: {
        reasoning_tokens: 0,
      },
      total_tokens: 120,
    },
    output_text: JSON.stringify(parsed),
    output_parsed: parsed,
    output: [],
    model,
  } as unknown as ParsedResponse<TParsed>;
}

function createService(client: OpenAIClientLike): OpenAIExecutionService {
  return new OpenAIExecutionService({ client });
}

function createPrompt(requestText = 'Document text'): ReturnType<typeof buildPrompt> {
  return buildPrompt({
    task: AI_TASKS.tagDocument,
    systemInstructions: [
      {
        heading: 'Role',
        content: 'You extract tags.',
      },
    ],
    sharedContext: [
      {
        heading: 'Schema',
        content: 'Return tags.',
      },
    ],
    requestPayload: [
      {
        heading: 'Document',
        content: requestText,
      },
    ],
  });
}

describe('AI model tiering', () => {
  it('selects the correct default model by task', () => {
    expect(getTaskPolicy(AI_TASKS.tagDocument).defaultModel).toBe('gpt-5-mini');
    expect(getTaskPolicy(AI_TASKS.generateFinalReport).defaultModel).toBe('gpt-5.4');
  });

  it('does not allow silent premium upgrades for tasks without escalation', async () => {
    const parse = vi.fn().mockResolvedValue(createParsedResponse({ tags: [] }, 'gpt-5-mini'));
    const service = createService({
      responses: {
        create: vi.fn(),
        parse,
      },
    });

    await expect(
      service.executeStructured({
        task: AI_TASKS.tagDocument,
        prompt: createPrompt(),
        schema: StructuredSchema,
        schemaName: 'tags',
      }),
    ).rejects.toBeInstanceOf(AIValidationError);

    expect(parse).toHaveBeenCalledTimes(1);
    expect(parse.mock.calls[0]?.[0].model).toBe('gpt-5-mini');
  });

  it('only escalates when the task policy allows it', async () => {
    const parse = vi
      .fn()
      .mockResolvedValueOnce(createParsedResponse({ tags: [] }, 'gpt-5-mini'))
      .mockResolvedValueOnce(createParsedResponse({ tags: ['memory'] }, 'gpt-5.4'));
    const service = createService({
      responses: {
        create: vi.fn(),
        parse,
      },
    });

    const result = await service.executeStructured({
      task: AI_TASKS.distillDocument,
      prompt: buildPrompt({
        task: AI_TASKS.distillDocument,
        systemInstructions: [
          {
            heading: 'Role',
            content: 'Return concepts.',
          },
        ],
        requestPayload: [
          {
            heading: 'Document',
            content: 'A document about memory systems.',
          },
        ],
      }),
      schema: StructuredSchema,
      schemaName: 'distilled_tags',
      allowEscalationOnValidationFailure: true,
    });

    expect(parse).toHaveBeenCalledTimes(2);
    expect(parse.mock.calls[0]?.[0].model).toBe('gpt-5-mini');
    expect(parse.mock.calls[1]?.[0].model).toBe('gpt-5.4');
    expect(result.wasEscalated).toBe(true);
    expect(result.model).toBe('gpt-5.4');
  });

  it('blocks execution when the projected budget exceeds the request cap', async () => {
    const create = vi.fn().mockResolvedValue(createResponse('summary', 'gpt-5.4'));
    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    const service = createService({
      responses: {
        create,
        parse: vi.fn(),
      },
    });

    await expect(
      service.executeText({
        task: AI_TASKS.generateFinalReport,
        prompt: buildPrompt({
          task: AI_TASKS.generateFinalReport,
          systemInstructions: [
            {
              heading: 'Role',
              content: 'Write a report.',
            },
          ],
          requestPayload: [
            {
              heading: 'Findings',
              content: 'x'.repeat(12_000),
            },
          ],
        }),
        budget: {
          maxRequestUsd: 0.01,
        },
      }),
    ).rejects.toBeInstanceOf(AIBudgetExceededError);

    expect(create).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      'ai.budget.exceeded',
      expect.objectContaining({
        task: AI_TASKS.generateFinalReport,
        budgetScope: 'request',
      }),
    );
    warnSpy.mockRestore();
  });

  it('validates structured outputs with schema checks', async () => {
    const parse = vi.fn().mockResolvedValue(createParsedResponse({ tags: [] }, 'gpt-5-mini'));
    const service = createService({
      responses: {
        create: vi.fn(),
        parse,
      },
    });

    await expect(
      service.executeStructured({
        task: AI_TASKS.tagDocument,
        prompt: createPrompt(),
        schema: StructuredSchema,
        schemaName: 'tags',
      }),
    ).rejects.toBeInstanceOf(AIValidationError);
  });

  it('keeps stable prompt prefix separate from request payload', () => {
    const first = buildPrompt({
      task: AI_TASKS.summarizeSimple,
      systemInstructions: [
        {
          heading: 'Role',
          content: 'Summarize the document.',
        },
      ],
      sharedContext: [
        {
          heading: 'Style',
          content: 'Be concise.',
        },
      ],
      requestPayload: [
        {
          heading: 'Document',
          content: 'First payload.',
        },
      ],
    });
    const second = buildPrompt({
      task: AI_TASKS.summarizeSimple,
      systemInstructions: [
        {
          heading: 'Role',
          content: 'Summarize the document.',
        },
      ],
      sharedContext: [
        {
          heading: 'Style',
          content: 'Be concise.',
        },
      ],
      requestPayload: [
        {
          heading: 'Document',
          content: 'Second payload.',
        },
      ],
    });

    expect(first.instructions).toContain('Role');
    expect(first.instructions).toContain('Style');
    expect(first.instructions).not.toContain('First payload.');
    expect(first.input).toContain('First payload.');
    expect(first.promptCacheKey).toBe(second.promptCacheKey);
  });

  it('exposes escalation policy through a small pure helper', () => {
    expect(canEscalateTask(AI_TASKS.tagDocument, true)).toBe(false);
    expect(canEscalateTask(AI_TASKS.distillDocument, false)).toBe(false);
    expect(canEscalateTask(AI_TASKS.distillDocument, true)).toBe(true);
  });
});

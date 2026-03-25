import { describe, expect, it } from 'vitest';
import { zodResponsesFunction } from 'openai/helpers/zod';
import {
  checkVaultDuplicateArgsSchema,
  evaluateResultArgsSchema,
} from '@/server/ai/tools/webScout.tools';

describe('webScout tool schemas', () => {
  it('avoids uri schema formats that the Responses API rejects', () => {
    const checkVaultDuplicateTool = zodResponsesFunction({
      name: 'checkVaultDuplicate',
      parameters: checkVaultDuplicateArgsSchema,
    });
    const evaluateResultTool = zodResponsesFunction({
      name: 'evaluateResult',
      parameters: evaluateResultArgsSchema,
    });

    expect(checkVaultDuplicateTool.parameters).not.toMatchObject({
      properties: {
        urls: {
          items: {
            format: 'uri',
          },
        },
      },
    });
    expect(evaluateResultTool.parameters).not.toMatchObject({
      properties: {
        url: {
          format: 'uri',
        },
      },
    });
  });

  it('still validates http(s) URLs at runtime', () => {
    expect(() =>
      evaluateResultArgsSchema.parse({
        url: 'mailto:test@example.com',
        title: 'Example',
        snippet: 'Snippet',
        goal: 'Find sources',
      }),
    ).toThrow();

    expect(() =>
      checkVaultDuplicateArgsSchema.parse({
        urls: ['https://example.com', 'http://example.org/path'],
      }),
    ).not.toThrow();
  });
});

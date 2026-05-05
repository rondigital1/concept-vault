import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockBuildPrompt = vi.hoisted(() => vi.fn());
const mockExecuteText = vi.hoisted(() => vi.fn());
const mockLocalKbTool = vi.hoisted(() => vi.fn());

vi.mock('@/server/ai/prompt-builder', () => ({
  buildPrompt: mockBuildPrompt,
}));

vi.mock('@/server/ai/openai-execution-service', () => ({
  openAIExecutionService: {
    executeText: mockExecuteText,
  },
}));

vi.mock('@/server/tools/localKb.tool', () => ({
  localKbTool: mockLocalKbTool,
}));

describe('chat route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBuildPrompt.mockReturnValue('compiled prompt');
    mockLocalKbTool.mockResolvedValue([]);
    mockExecuteText.mockResolvedValue({
      output: 'Vault answer',
      usage: { inputTokens: 12, outputTokens: 4 },
    });
  });

  it('validates malformed chat payloads with the shared request contract', async () => {
    const { POST } = await import('@/app/api/chat/route');

    const response = await POST(
      new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          message: '   ',
          history: 'not an array',
        }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: 'Invalid request payload',
      details: expect.arrayContaining([
        expect.objectContaining({
          path: 'message',
          message: 'Message is required',
        }),
        expect.objectContaining({
          path: 'history',
          message: 'history must be an array',
        }),
      ]),
    });
    expect(mockLocalKbTool).not.toHaveBeenCalled();
    expect(mockExecuteText).not.toHaveBeenCalled();
  });

  it('defaults omitted history and trims the user message before execution', async () => {
    const { POST } = await import('@/app/api/chat/route');

    const response = await POST(
      new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          message: '  What did I save about testing?  ',
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(mockLocalKbTool).toHaveBeenCalledWith({
      query: 'What did I save about testing?',
      limit: 3,
    });
    expect(mockBuildPrompt).toHaveBeenCalledWith(
      expect.objectContaining({
        inputMessages: [
          {
            role: 'user',
            content: 'What did I save about testing?',
          },
        ],
      }),
    );
    expect(mockExecuteText).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: 'compiled prompt',
      }),
    );
    await expect(response.json()).resolves.toEqual({
      message: 'Vault answer',
      usage: { inputTokens: 12, outputTokens: 4 },
    });
  });
});

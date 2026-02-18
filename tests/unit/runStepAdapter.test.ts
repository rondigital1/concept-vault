import { describe, it, expect, vi } from 'vitest';
import { RunStepCallbackHandler } from '@/server/langchain/callbacks/runStepAdapter';

describe('RunStepCallbackHandler', () => {
  it('should swallow onStep callback errors and not reject', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const handler = new RunStepCallbackHandler({
      onStep: async () => {
        throw new Error('append failed');
      },
    });

    await expect(
      handler.handleLLMStart({ id: ['mock_llm'] } as any, ['prompt'], 'run-1'),
    ).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

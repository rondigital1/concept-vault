import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockAssertSchemaReady = vi.hoisted(() => vi.fn());

vi.mock('@/db', () => ({
  client: {},
  assertSchemaReady: mockAssertSchemaReady,
}));

describe('instrumentation register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.NEXT_RUNTIME = 'nodejs';
    process.env.DATABASE_URL = 'postgresql://knowledge:knowledge@localhost:5432/concept_vault';
  });

  it('throws when schema verification fails at startup', async () => {
    mockAssertSchemaReady.mockRejectedValue(new Error('Database schema drift detected.'));

    const { register } = await import('@/instrumentation');

    await expect(register()).rejects.toThrow(/schema drift/i);
  });
});

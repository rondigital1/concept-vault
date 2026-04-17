import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockAuth = vi.hoisted(() => vi.fn());
const mockIngestDocument = vi.hoisted(() => vi.fn());
const mockExtractDocumentFromUrl = vi.hoisted(() => vi.fn());

vi.mock('@/auth', () => ({
  auth: mockAuth,
}));

vi.mock('@/server/services/ingest.service', () => ({
  ingestDocument: mockIngestDocument,
}));

vi.mock('@/server/services/urlExtract.service', () => ({
  extractDocumentFromUrl: mockExtractDocumentFromUrl,
  isHttpUrl: (value: string | undefined | null) => typeof value === 'string' && /^https?:\/\//.test(value),
}));

describe('ingest routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      user: {
        id: 'test-user',
        email: 'test@example.com',
        membershipRole: 'owner',
      },
      workspace: {
        id: 'workspace-1',
        name: 'Test Workspace',
        slug: 'test-workspace',
      },
    });
    mockIngestDocument.mockResolvedValue({
      documentId: 'doc-1',
      created: true,
      enrichmentJobId: null,
      enrichmentQueued: false,
      enrichmentRunId: null,
    });
    mockExtractDocumentFromUrl.mockResolvedValue({
      title: 'Extracted title',
      content: 'A'.repeat(120),
      method: 'fetch',
    });
  });

  it('ingests valid manual requests', async () => {
    const { POST } = await import('@/app/api/ingest/route');
    const response = await POST(
      new Request('http://localhost/api/ingest', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: 'Manual note',
          source: 'manual',
          content: 'B'.repeat(120),
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(mockIngestDocument).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      title: 'Manual note',
      source: 'manual',
      content: 'B'.repeat(120),
    });
  });

  it('rejects malformed LLM ingest payloads consistently', async () => {
    const { POST } = await import('@/app/api/ingest/llm/route');
    const response = await POST(
      new Request('http://localhost/api/ingest/llm', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          content: 42,
          origin: {
            feature: 'llm:email',
          },
        }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: 'Invalid request payload',
      details: expect.arrayContaining([
        expect.objectContaining({
          path: 'content',
          message: 'content must be a string',
        }),
        expect.objectContaining({
          path: 'origin.feature',
          message: 'origin.feature must be llm:chat',
        }),
      ]),
    });
    const validation = await import('@/server/http/requestValidation');
    expect(validation.getValidationFailureCount('/api/ingest/llm')).toBe(1);
  });

  it('blocks risky URL sources even when content is supplied inline', async () => {
    const { POST } = await import('@/app/api/ingest/route');
    const response = await POST(
      new Request('http://localhost/api/ingest', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: 'Short link',
          source: 'https://bit.ly/example',
          content: 'B'.repeat(120),
        }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining('Blocked'),
    });
    expect(mockIngestDocument).not.toHaveBeenCalled();
  });
});

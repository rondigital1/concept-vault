import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockIngestDocument = vi.hoisted(() => vi.fn());
const mockExtractDocumentFromUrl = vi.hoisted(() => vi.fn());

vi.mock('@/server/services/ingest.service', () => ({
  ingestDocument: mockIngestDocument,
}));

vi.mock('@/server/services/urlExtract.service', () => ({
  extractDocumentFromUrl: mockExtractDocumentFromUrl,
  isHttpUrl: (value: string | undefined | null) => typeof value === 'string' && /^https?:\/\//i.test(value),
}));

describe('ingest workflow service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIngestDocument.mockResolvedValue({
      documentId: 'doc-1',
      created: true,
      enrichmentJobId: null,
      enrichmentQueued: false,
      enrichmentRunId: null,
    });
    mockExtractDocumentFromUrl.mockResolvedValue({
      title: 'Extracted title',
      content: 'Extracted content '.repeat(8),
      method: 'fetch',
    });
  });

  it('normalizes prepared content before delegating to ingestDocument', async () => {
    const { ingestPreparedContent } = await import('@/server/services/ingestWorkflow.service');

    const result = await ingestPreparedContent({
      workspaceId: 'workspace-1',
      title: '  Stored title  ',
      source: '  manual  ',
      content: '  Durable note content  ',
      autoEnrich: true,
      enableAutoDistill: false,
    });

    expect(mockIngestDocument).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      title: 'Stored title',
      source: 'manual',
      content: 'Durable note content',
      autoEnrich: true,
      enableAutoDistill: false,
    });
    expect(result).toMatchObject({
      documentId: 'doc-1',
      title: 'Stored title',
      source: 'manual',
      contentLength: 'Durable note content'.length,
      enrichmentQueued: false,
    });
  });

  it('extracts URL content when the supplied body is below the minimum length', async () => {
    const { ingestTextOrUrl } = await import('@/server/services/ingestWorkflow.service');

    const result = await ingestTextOrUrl({
      workspaceId: 'workspace-1',
      source: ' https://example.com/research ',
      content: '',
      context: 'test_ingest',
      minContentLength: 50,
    });

    expect(mockExtractDocumentFromUrl).toHaveBeenCalledWith('https://example.com/research');
    expect(mockIngestDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Extracted title',
        source: 'https://example.com/research',
        content: 'Extracted content '.repeat(8).trim(),
      }),
    );
    expect(result).toMatchObject({
      title: 'Extracted title',
      source: 'https://example.com/research',
      contentLength: 'Extracted content '.repeat(8).trim().length,
    });
  });

  it('rejects empty non-URL ingests before document writes', async () => {
    const { ingestTextOrUrl, IngestWorkflowError } = await import('@/server/services/ingestWorkflow.service');

    await expect(
      ingestTextOrUrl({
        workspaceId: 'workspace-1',
        source: 'manual',
        content: '   ',
        context: 'test_ingest',
      }),
    ).rejects.toBeInstanceOf(IngestWorkflowError);

    expect(mockExtractDocumentFromUrl).not.toHaveBeenCalled();
    expect(mockIngestDocument).not.toHaveBeenCalled();
  });
});

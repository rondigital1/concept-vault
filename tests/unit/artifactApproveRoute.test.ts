import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockApproveArtifact = vi.hoisted(() => vi.fn());
const mockGetArtifactById = vi.hoisted(() => vi.fn());
const mockExtractDocumentFromUrl = vi.hoisted(() => vi.fn());
const mockIngestDocument = vi.hoisted(() => vi.fn());
const mockRevalidatePath = vi.hoisted(() => vi.fn());

vi.mock('@/server/repos/artifacts.repo', () => ({
  approveArtifact: mockApproveArtifact,
  getArtifactById: mockGetArtifactById,
}));

vi.mock('@/server/services/urlExtract.service', () => ({
  extractDocumentFromUrl: mockExtractDocumentFromUrl,
  isHttpUrl: (value: string | undefined | null) => typeof value === 'string' && /^https?:\/\//.test(value),
}));

vi.mock('@/server/services/ingest.service', () => ({
  ingestDocument: mockIngestDocument,
}));

vi.mock('next/cache', () => ({
  revalidatePath: mockRevalidatePath,
}));

describe('artifact approve route', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGetArtifactById.mockResolvedValue({
      id: 'artifact-1',
      status: 'proposed',
      kind: 'web-proposal',
      title: 'Test Resource',
      content: {
        url: 'https://example.com/resource',
        summary: 'A concise summary.',
      },
    });
    mockExtractDocumentFromUrl.mockResolvedValue({
      title: 'Extracted Resource',
      content: 'Full extracted content from the source page.',
      method: 'fetch',
    });
    mockIngestDocument.mockResolvedValue({
      documentId: 'doc-1',
      created: true,
      enrichmentRunId: null,
    });
    mockApproveArtifact.mockResolvedValue(true);
  });

  it('imports the approved web proposal inline and links the library document on approval', async () => {
    const { POST } = await import('@/app/api/artifacts/[id]/approve/route');

    const request = new Request('http://localhost/api/artifacts/artifact-1/approve', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    });

    const response = await POST(request, {
      params: Promise.resolve({ id: 'artifact-1' }),
    });

    expect(mockExtractDocumentFromUrl).toHaveBeenCalledWith('https://example.com/resource');
    expect(mockIngestDocument).toHaveBeenCalledWith({
      title: 'Extracted Resource',
      source: 'https://example.com/resource',
      content: 'Full extracted content from the source page.',
      autoEnrich: true,
      enableAutoDistill: false,
    });
    expect(mockApproveArtifact).toHaveBeenCalledWith('artifact-1', { documentId: 'doc-1' });
    expect(mockExtractDocumentFromUrl.mock.invocationCallOrder[0]).toBeLessThan(
      mockApproveArtifact.mock.invocationCallOrder[0],
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith('/library');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/today');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      id: 'artifact-1',
      status: 'approved',
      libraryImport: {
        status: 'imported',
        documentId: 'doc-1',
        created: true,
      },
    });
  });

  it('does not approve the artifact when import fails before completion', async () => {
    mockGetArtifactById.mockResolvedValue({
      id: 'artifact-1',
      status: 'proposed',
      kind: 'web-proposal',
      title: 'Broken Resource',
      content: {
        url: 'https://example.com/broken',
      },
    });
    mockExtractDocumentFromUrl.mockRejectedValue(new Error('Extraction failed'));

    const { POST } = await import('@/app/api/artifacts/[id]/approve/route');

    const request = new Request('http://localhost/api/artifacts/artifact-1/approve', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    });

    const response = await POST(request, {
      params: Promise.resolve({ id: 'artifact-1' }),
    });

    expect(mockApproveArtifact).not.toHaveBeenCalled();
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: 'Extraction failed',
    });
  });
});

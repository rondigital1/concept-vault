import { describe, expect, it } from 'vitest';
import { buildLibraryHomeViewModel } from '@/app/library/libraryHomeViewModel';
import type { LibraryDocumentRow } from '@/server/services/document.service';

function documentRow(overrides: Partial<LibraryDocumentRow>): LibraryDocumentRow {
  return {
    id: 'doc-1',
    title: 'Research memo',
    content: 'Useful source material',
    source: 'Imported manually',
    tags: [],
    content_hash: 'hash-doc-1',
    imported_at: '2026-05-19T12:00:00.000Z',
    is_favorite: false,
    is_webscout_discovered: false,
    ...overrides,
  };
}

describe('buildLibraryHomeViewModel', () => {
  it('prioritizes favorites, research imports, and repository documents for the home page', () => {
    const favorite = documentRow({
      id: 'favorite',
      title: 'Favorite note',
      is_favorite: true,
      source: 'https://example.com/memo',
    });
    const research = documentRow({
      id: 'research',
      title: 'Research import',
      is_webscout_discovered: true,
      source: 'https://example.com/source.pdf',
      tags: ['agents'],
    });
    const cleanup = documentRow({
      id: 'cleanup',
      title: '<meta name="description" content="bad title">',
      tags: ['agents'],
    });

    const viewModel = buildLibraryHomeViewModel([favorite, research, cleanup]);

    expect(viewModel.featuredDocument?.id).toBe('favorite');
    expect(viewModel.repositoryDocuments.map((document) => document.id)).toEqual([
      'research',
      'cleanup',
    ]);
    expect(viewModel.favorites).toEqual([favorite]);
    expect(viewModel.researchDocuments).toEqual([research]);
    expect(viewModel.documentsNeedingCleanup).toEqual([cleanup]);
    expect(viewModel.formatCounts).toEqual({ pdf: 1, text: 1, web: 1 });
    expect(viewModel.topClusters[0]).toEqual({ label: 'agents', count: 2 });
  });

  it('falls back to operational clusters when documents have no tags', () => {
    const viewModel = buildLibraryHomeViewModel([
      documentRow({ id: 'direct' }),
      documentRow({ id: 'scout', is_webscout_discovered: true }),
    ]);

    expect(viewModel.topClusters).toEqual([
      { label: 'research imports', count: 1 },
      { label: 'new records', count: 2 },
    ]);
  });
});

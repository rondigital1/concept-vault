import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SessionWorkspaceContext } from '@/server/auth/workspaceContext';
import IngestPage from '@/app/ingest/page';
import { auth } from '@/auth';
import { requireSessionWorkspace } from '@/server/auth/workspaceContext';
import { getAllDocumentsForLibrary } from '@/server/services/document.service';

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/server/auth/workspaceContext', () => ({
  requireSessionWorkspace: vi.fn(),
}));

vi.mock('@/server/services/document.service', () => ({
  getAllDocumentsForLibrary: vi.fn(),
}));

vi.mock('next/font/google', () => ({
  Inter: () => ({
    className: 'mock-inter',
    variable: 'mock-inter',
    style: {},
  }),
}));

const scope: SessionWorkspaceContext = {
  userId: 'user-1',
  email: 'owner@example.com',
  workspaceId: 'workspace-1',
  workspaceName: 'Primary Workspace',
  workspaceSlug: 'primary-workspace',
  membershipRole: 'owner',
};

const documents = [
  {
    id: 'doc-1',
    title: 'Concise report',
    source: 'https://example.com/report',
    imported_at: '2026-04-16T12:00:00.000Z',
    is_webscout_discovered: false,
    is_favorite: true,
  },
  {
    id: 'doc-2',
    title: '',
    source: 'notes.md',
    imported_at: '2026-04-15T12:00:00.000Z',
    is_webscout_discovered: false,
    is_favorite: false,
  },
  {
    id: 'doc-3',
    title: 'Derived from research',
    source: 'https://example.com/derived',
    imported_at: '2026-04-14T12:00:00.000Z',
    is_webscout_discovered: true,
    is_favorite: true,
  },
  {
    id: 'doc-4',
    title: 'Fourth document',
    source: 'upload.pdf',
    imported_at: '2026-04-13T12:00:00.000Z',
    is_webscout_discovered: false,
    is_favorite: false,
  },
  {
    id: 'doc-5',
    title: 'Fifth document',
    source: 'https://example.com/fifth',
    imported_at: '2026-04-12T12:00:00.000Z',
    is_webscout_discovered: true,
    is_favorite: false,
  },
] as const;

describe('IngestPage', () => {
  const originalOwnerEmail = process.env.OWNER_EMAIL;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OWNER_EMAIL = originalOwnerEmail;
    vi.mocked(requireSessionWorkspace).mockResolvedValue(scope);
    vi.mocked(getAllDocumentsForLibrary).mockResolvedValue([...documents] as never);
  });

  afterEach(() => {
    process.env.OWNER_EMAIL = originalOwnerEmail;
  });

  it('builds ingest workspace props from the session workspace and document list', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: {
        name: 'Ada Lovelace',
      },
    } as never);

    const element = await IngestPage();

    expect(vi.mocked(requireSessionWorkspace)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(getAllDocumentsForLibrary)).toHaveBeenCalledWith(scope);
    expect(element.props.userName).toBe('Ada Lovelace');
    expect(element.props.stats).toEqual({
      totalRecords: 5,
      directImports: 3,
      researchImports: 2,
      favorites: 2,
      cleanupCandidates: 1,
    });
    expect(element.props.recentDocuments).toEqual([
      {
        id: 'doc-1',
        title: 'Concise report',
        source: 'https://example.com/report',
        imported_at: '2026-04-16T12:00:00.000Z',
        is_webscout_discovered: false,
      },
      {
        id: 'doc-2',
        title: '',
        source: 'notes.md',
        imported_at: '2026-04-15T12:00:00.000Z',
        is_webscout_discovered: false,
      },
      {
        id: 'doc-3',
        title: 'Derived from research',
        source: 'https://example.com/derived',
        imported_at: '2026-04-14T12:00:00.000Z',
        is_webscout_discovered: true,
      },
      {
        id: 'doc-4',
        title: 'Fourth document',
        source: 'upload.pdf',
        imported_at: '2026-04-13T12:00:00.000Z',
        is_webscout_discovered: false,
      },
    ]);
  });

  it('falls back to the owner email when the session has no display name', async () => {
    process.env.OWNER_EMAIL = 'operator@example.com';
    vi.mocked(auth).mockResolvedValue({
      user: {
        name: '   ',
      },
    } as never);

    const element = await IngestPage();

    expect(element.props.userName).toBe('operator');
  });
});

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanAllTables,
  closeTestDb,
  createAdditionalTestWorkspace,
  getTestWorkspaceScope,
  initTestSchema,
  insertTestDocument,
} from '../helpers/testDb';
import { listDocuments } from '@/server/repos/documents.repo';
import { insertArtifact, getArtifactById } from '@/server/repos/artifacts.repo';
import { createRun, getRunTrace } from '@/server/observability/runTrace.store';
import { detectWorkspaceAccess, recordAuthorizationDenied } from '@/server/auth/authzAudit';

describe('workspace scoping', () => {
  beforeAll(async () => {
    await initTestSchema();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await cleanAllTables();
  });

  it('keeps documents, artifacts, and runs isolated by workspace', async () => {
    const scopeA = await getTestWorkspaceScope();
    const scopeB = await createAdditionalTestWorkspace('second');

    const documentA = await insertTestDocument({
      workspaceId: scopeA.workspaceId,
      title: 'Workspace A document',
    });
    await insertTestDocument({
      workspaceId: scopeB.workspaceId,
      title: 'Workspace B document',
    });

    const documentsInA = await listDocuments(scopeA);
    expect(documentsInA).toHaveLength(1);
    expect(documentsInA[0].id).toBe(documentA);

    const artifactA = await insertArtifact({
      workspaceId: scopeA.workspaceId,
      runId: null,
      agent: 'webScout',
      kind: 'web-proposal',
      day: '2025-01-15',
      title: 'Workspace A artifact',
      content: { url: 'https://example.com/a' },
      sourceRefs: {},
    });

    expect(await getArtifactById(scopeA, artifactA)).not.toBeNull();
    expect(await getArtifactById(scopeB, artifactA)).toBeNull();

    const runA = await createRun(scopeA, 'distill');

    expect(await getRunTrace(scopeA, runA)).not.toBeNull();
    expect(await getRunTrace(scopeB, runA)).toBeNull();
  });

  it('detects cross-workspace access and records authz-denied counters', async () => {
    const scopeA = await getTestWorkspaceScope();
    const scopeB = await createAdditionalTestWorkspace('audit');
    const documentA = await insertTestDocument({
      workspaceId: scopeA.workspaceId,
      title: 'Denied access document',
    });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const action = `read-${Date.now()}`;

    expect(
      await detectWorkspaceAccess({
        table: 'documents',
        recordId: documentA,
        workspaceId: scopeA.workspaceId,
      }),
    ).toBe('granted');

    expect(
      await detectWorkspaceAccess({
        table: 'documents',
        recordId: documentA,
        workspaceId: scopeB.workspaceId,
      }),
    ).toBe('forbidden');

    expect(
      await detectWorkspaceAccess({
        table: 'documents',
        recordId: '00000000-0000-0000-0000-000000000000',
        workspaceId: scopeA.workspaceId,
      }),
    ).toBe('not_found');

    recordAuthorizationDenied({
      table: 'documents',
      action,
      recordId: documentA,
      workspaceId: scopeB.workspaceId,
      userId: 'test-user',
    });
    recordAuthorizationDenied({
      table: 'documents',
      action,
      recordId: documentA,
      workspaceId: scopeB.workspaceId,
      userId: 'test-user',
    });

    expect(warnSpy).toHaveBeenCalledTimes(2);
    expect(String(warnSpy.mock.calls[0][0])).toContain('deniedCount=1');
    expect(String(warnSpy.mock.calls[1][0])).toContain('deniedCount=2');

    warnSpy.mockRestore();
  });
});

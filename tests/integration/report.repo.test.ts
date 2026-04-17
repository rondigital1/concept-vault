import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { TEST_DAY } from '../helpers/fixtures';
import {
  cleanAllTables,
  closeTestDb,
  getTestWorkspaceScope,
  initTestSchema,
  insertTestRun,
} from '../helpers/testDb';
import { getArtifactById } from '@/server/repos/artifacts.repo';
import { insertReport, listReports } from '@/server/repos/report.repo';

describe('Report Repository', () => {
  let scope: { workspaceId: string };

  beforeAll(async () => {
    await initTestSchema();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await cleanAllTables();
    scope = await getTestWorkspaceScope();
  });

  it('inserts and supersedes global reports when topicId is absent', async () => {
    const runId1 = await insertTestRun(scope, 'pipeline');
    const firstId = await insertReport({
      workspaceId: scope.workspaceId,
      runId: runId1,
      day: TEST_DAY,
      title: 'First report',
      content: {
        markdown: '# First report',
        title: 'First report',
      },
      sourceRefs: {
        goal: 'test goal',
      },
    });

    const firstArtifact = await getArtifactById(scope, firstId);
    expect(firstArtifact).not.toBeNull();
    expect(firstArtifact?.status).toBe('approved');

    const runId2 = await insertTestRun(scope, 'pipeline');
    const secondId = await insertReport({
      workspaceId: scope.workspaceId,
      runId: runId2,
      day: TEST_DAY,
      title: 'Second report',
      content: {
        markdown: '# Second report',
        title: 'Second report',
      },
      sourceRefs: {
        goal: 'test goal',
      },
    });

    const supersededFirst = await getArtifactById(scope, firstId);
    const approvedSecond = await getArtifactById(scope, secondId);

    expect(supersededFirst?.status).toBe('superseded');
    expect(approvedSecond?.status).toBe('approved');

    const reports = await listReports(scope);
    expect(reports).toHaveLength(1);
    expect(reports[0].id).toBe(secondId);
  });
});

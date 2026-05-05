/**
 * Integration tests for artifact lifecycle.
 * 
 * Tests:
 * - Insert proposed artifact
 * - Approve artifact (status transition)
 * - Approving new artifact supersedes older approved
 * - Reject artifact (status transition)
 * - List inbox vs list active
 * - Unique constraint: one approved per (agent, kind, day)
 * 
 * Requires: Docker Postgres running
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  initTestSchema,
  cleanAllTables,
  closeTestDb,
  insertTestRun,
  getTestWorkspaceScope,
} from '../helpers/testDb';
import { TEST_DAY } from '../helpers/fixtures';
import {
  insertArtifact,
  approveArtifact,
  mergeArtifactReviewMetadata,
  rejectArtifact,
  getArtifactById,
  listInboxArtifacts,
  listActiveArtifacts,
  countArtifactsByStatus,
} from '@/server/repos/artifacts.repo';

describe('Artifact Lifecycle', () => {
  let scope: { workspaceId: string };
  const createArtifact = (input: Omit<Parameters<typeof insertArtifact>[0], 'workspaceId'>) =>
    insertArtifact({ workspaceId: scope.workspaceId, ...input });

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

  describe('insertArtifact', () => {
    it('should insert artifact with proposed status', async () => {
      const artifactId = await createArtifact({
        runId: null,
        agent: 'webScout',
        kind: 'web-proposal',
        day: TEST_DAY,
        title: 'Test Proposal',
        content: { url: 'https://example.com' },
        sourceRefs: { query: 'test query' },
      });

      expect(artifactId).toBeDefined();
      expect(artifactId).toMatch(/^[0-9a-f-]{36}$/);

      const artifact = await getArtifactById(scope, artifactId);
      expect(artifact).not.toBeNull();
      expect(artifact!.status).toBe('proposed');
      expect(artifact!.agent).toBe('webScout');
      expect(artifact!.kind).toBe('web-proposal');
      expect(artifact!.day).toBe(TEST_DAY);
      expect(artifact!.content).toEqual({ url: 'https://example.com' });
      expect(artifact!.reviewed_at).toBeNull();
    });

    it('should associate artifact with a run', async () => {
      const runId = await insertTestRun(scope, 'webScout');

      const artifactId = await createArtifact({
        runId,
        agent: 'webScout',
        kind: 'web-proposal',
        day: TEST_DAY,
        title: 'Test Proposal',
        content: {},
        sourceRefs: {},
      });

      const artifact = await getArtifactById(scope, artifactId);
      expect(artifact!.run_id).toBe(runId);
    });

    it('should allow multiple proposed artifacts for same (agent, kind, day)', async () => {
      const id1 = await createArtifact({
        runId: null,
        agent: 'distiller',
        kind: 'flashcard',
        day: TEST_DAY,
        title: 'Flashcard 1',
        content: { front: 'Q1' },
        sourceRefs: {},
      });

      const id2 = await createArtifact({
        runId: null,
        agent: 'distiller',
        kind: 'flashcard',
        day: TEST_DAY,
        title: 'Flashcard 2',
        content: { front: 'Q2' },
        sourceRefs: {},
      });

      expect(id1).not.toBe(id2);

      const inbox = await listInboxArtifacts(scope, TEST_DAY);
      expect(inbox).toHaveLength(2);
    });
  });

  describe('approveArtifact', () => {
    it('should transition status from proposed to approved', async () => {
      const artifactId = await createArtifact({
        runId: null,
        agent: 'webScout',
        kind: 'web-proposal',
        day: TEST_DAY,
        title: 'Test Proposal',
        content: {},
        sourceRefs: {},
      });

      const result = await approveArtifact(scope, artifactId);
      expect(result).toBe(true);

      const artifact = await getArtifactById(scope, artifactId);
      expect(artifact!.status).toBe('approved');
      expect(artifact!.reviewed_at).not.toBeNull();
    });

    it('should return false for non-existent artifact', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const result = await approveArtifact(scope, fakeId);
      expect(result).toBe(false);
    });

    it('should return false for already approved artifact', async () => {
      const artifactId = await createArtifact({
        runId: null,
        agent: 'webScout',
        kind: 'web-proposal',
        day: TEST_DAY,
        title: 'Test Proposal',
        content: {},
        sourceRefs: {},
      });

      await approveArtifact(scope, artifactId);

      // Try to approve again
      const result = await approveArtifact(scope, artifactId);
      expect(result).toBe(false);
    });

    it('should return false for rejected artifact', async () => {
      const artifactId = await createArtifact({
        runId: null,
        agent: 'webScout',
        kind: 'web-proposal',
        day: TEST_DAY,
        title: 'Test Proposal',
        content: {},
        sourceRefs: {},
      });

      await rejectArtifact(scope, artifactId);

      const result = await approveArtifact(scope, artifactId);
      expect(result).toBe(false);
    });

    it('merges review metadata into source_refs when approving', async () => {
      const artifactId = await createArtifact({
        runId: null,
        agent: 'webScout',
        kind: 'web-proposal',
        day: TEST_DAY,
        title: 'Test Proposal',
        content: {},
        sourceRefs: { goal: 'learn retrieval practice' },
      });

      const result = await approveArtifact(scope, artifactId, {
        documentId: '123e4567-e89b-12d3-a456-426614174000',
      });

      expect(result).toBe(true);

      const artifact = await getArtifactById(scope, artifactId);
      expect(artifact?.status).toBe('approved');
      expect(artifact?.source_refs).toEqual({
        goal: 'learn retrieval practice',
        documentId: '123e4567-e89b-12d3-a456-426614174000',
      });
    });

    it('merges review metadata after approval', async () => {
      const artifactId = await createArtifact({
        runId: null,
        agent: 'webScout',
        kind: 'web-proposal',
        day: TEST_DAY,
        title: 'Test Proposal',
        content: {},
        sourceRefs: { goal: 'learn retrieval practice' },
      });

      await approveArtifact(scope, artifactId);

      const result = await mergeArtifactReviewMetadata(scope, artifactId, {
        documentId: '223e4567-e89b-12d3-a456-426614174000',
      });

      expect(result).toBe(true);

      const artifact = await getArtifactById(scope, artifactId);
      expect(artifact?.source_refs).toEqual({
        goal: 'learn retrieval practice',
        documentId: '223e4567-e89b-12d3-a456-426614174000',
      });
    });
  });

  describe('rejectArtifact', () => {
    it('should transition status from proposed to rejected', async () => {
      const artifactId = await createArtifact({
        runId: null,
        agent: 'distiller',
        kind: 'concept',
        day: TEST_DAY,
        title: 'Test Concept',
        content: {},
        sourceRefs: {},
      });

      const result = await rejectArtifact(scope, artifactId);
      expect(result).toBe(true);

      const artifact = await getArtifactById(scope, artifactId);
      expect(artifact!.status).toBe('rejected');
      expect(artifact!.reviewed_at).not.toBeNull();
    });

    it('should return false for non-existent artifact', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const result = await rejectArtifact(scope, fakeId);
      expect(result).toBe(false);
    });

    it('should return false for already rejected artifact', async () => {
      const artifactId = await createArtifact({
        runId: null,
        agent: 'distiller',
        kind: 'concept',
        day: TEST_DAY,
        title: 'Test Concept',
        content: {},
        sourceRefs: {},
      });

      await rejectArtifact(scope, artifactId);

      // Try to reject again
      const result = await rejectArtifact(scope, artifactId);
      expect(result).toBe(false);
    });
  });

  describe('supersede on approve', () => {
    it('should supersede previous approved artifact when approving new one', async () => {
      // First artifact
      const artifact1Id = await createArtifact({
        runId: null,
        agent: 'webScout',
        kind: 'web-proposal',
        day: TEST_DAY,
        title: 'First Proposal',
        content: { url: 'https://example.com/first' },
        sourceRefs: {},
      });

      // Approve first artifact
      await approveArtifact(scope, artifact1Id);

      const artifact1Before = await getArtifactById(scope, artifact1Id);
      expect(artifact1Before!.status).toBe('approved');

      // Second artifact (same agent, kind, day)
      const artifact2Id = await createArtifact({
        runId: null,
        agent: 'webScout',
        kind: 'web-proposal',
        day: TEST_DAY,
        title: 'Second Proposal',
        content: { url: 'https://example.com/second' },
        sourceRefs: {},
      });

      // Approve second artifact
      await approveArtifact(scope, artifact2Id);

      // First artifact should now be superseded
      const artifact1After = await getArtifactById(scope, artifact1Id);
      expect(artifact1After!.status).toBe('superseded');
      expect(artifact1After!.reviewed_at).not.toBeNull();

      // Second artifact should be approved
      const artifact2After = await getArtifactById(scope, artifact2Id);
      expect(artifact2After!.status).toBe('approved');
    });

    it('should not supersede artifacts with different agent', async () => {
      const artifact1Id = await createArtifact({
        runId: null,
        agent: 'webScout',
        kind: 'web-proposal',
        day: TEST_DAY,
        title: 'WebScout Proposal',
        content: {},
        sourceRefs: {},
      });

      await approveArtifact(scope, artifact1Id);

      const artifact2Id = await createArtifact({
        runId: null,
        agent: 'distiller', // Different agent
        kind: 'web-proposal',
        day: TEST_DAY,
        title: 'Distiller Proposal',
        content: {},
        sourceRefs: {},
      });

      await approveArtifact(scope, artifact2Id);

      // Both should be approved (different agents)
      const artifact1 = await getArtifactById(scope, artifact1Id);
      const artifact2 = await getArtifactById(scope, artifact2Id);

      expect(artifact1!.status).toBe('approved');
      expect(artifact2!.status).toBe('approved');
    });

    it('should not supersede artifacts with different kind', async () => {
      const artifact1Id = await createArtifact({
        runId: null,
        agent: 'distiller',
        kind: 'concept',
        day: TEST_DAY,
        title: 'Concept',
        content: {},
        sourceRefs: {},
      });

      await approveArtifact(scope, artifact1Id);

      const artifact2Id = await createArtifact({
        runId: null,
        agent: 'distiller',
        kind: 'flashcard', // Different kind
        day: TEST_DAY,
        title: 'Flashcard',
        content: {},
        sourceRefs: {},
      });

      await approveArtifact(scope, artifact2Id);

      // Both should be approved (different kinds)
      const artifact1 = await getArtifactById(scope, artifact1Id);
      const artifact2 = await getArtifactById(scope, artifact2Id);

      expect(artifact1!.status).toBe('approved');
      expect(artifact2!.status).toBe('approved');
    });

    it('should not supersede artifacts with different day', async () => {
      const artifact1Id = await createArtifact({
        runId: null,
        agent: 'webScout',
        kind: 'web-proposal',
        day: '2025-01-15',
        title: 'Day 15 Proposal',
        content: {},
        sourceRefs: {},
      });

      await approveArtifact(scope, artifact1Id);

      const artifact2Id = await createArtifact({
        runId: null,
        agent: 'webScout',
        kind: 'web-proposal',
        day: '2025-01-16', // Different day
        title: 'Day 16 Proposal',
        content: {},
        sourceRefs: {},
      });

      await approveArtifact(scope, artifact2Id);

      // Both should be approved (different days)
      const artifact1 = await getArtifactById(scope, artifact1Id);
      const artifact2 = await getArtifactById(scope, artifact2Id);

      expect(artifact1!.status).toBe('approved');
      expect(artifact2!.status).toBe('approved');
    });
  });

  describe('list operations', () => {
    it('should list only proposed artifacts in inbox', async () => {
      // Create artifacts with different statuses
      const proposedId = await createArtifact({
        runId: null,
        agent: 'webScout',
        kind: 'web-proposal',
        day: TEST_DAY,
        title: 'Proposed',
        content: {},
        sourceRefs: {},
      });

      const toApproveId = await createArtifact({
        runId: null,
        agent: 'distiller',
        kind: 'concept',
        day: TEST_DAY,
        title: 'To Approve',
        content: {},
        sourceRefs: {},
      });
      await approveArtifact(scope, toApproveId);

      const toRejectId = await createArtifact({
        runId: null,
        agent: 'distiller',
        kind: 'flashcard',
        day: TEST_DAY,
        title: 'To Reject',
        content: {},
        sourceRefs: {},
      });
      await rejectArtifact(scope, toRejectId);

      const inbox = await listInboxArtifacts(scope, TEST_DAY);

      expect(inbox).toHaveLength(1);
      expect(inbox[0].id).toBe(proposedId);
      expect(inbox[0].status).toBe('proposed');
    });

    it('should list only approved artifacts in active', async () => {
      await createArtifact({
        runId: null,
        agent: 'webScout',
        kind: 'web-proposal',
        day: TEST_DAY,
        title: 'Proposed',
        content: {},
        sourceRefs: {},
      });

      const approvedId = await createArtifact({
        runId: null,
        agent: 'distiller',
        kind: 'concept',
        day: TEST_DAY,
        title: 'Approved',
        content: {},
        sourceRefs: {},
      });
      await approveArtifact(scope, approvedId);

      const active = await listActiveArtifacts(scope, TEST_DAY);

      expect(active).toHaveLength(1);
      expect(active[0].id).toBe(approvedId);
      expect(active[0].status).toBe('approved');
    });

    it('should return empty list for day with no artifacts', async () => {
      const inbox = await listInboxArtifacts(scope, '2099-12-31');
      const active = await listActiveArtifacts(scope, '2099-12-31');

      expect(inbox).toEqual([]);
      expect(active).toEqual([]);
    });
  });

  describe('countArtifactsByStatus', () => {
    it('should count artifacts by status for a day', async () => {
      // Create various artifacts
      await createArtifact({
        runId: null,
        agent: 'webScout',
        kind: 'web-proposal',
        day: TEST_DAY,
        title: 'Proposed 1',
        content: {},
        sourceRefs: {},
      });

      await createArtifact({
        runId: null,
        agent: 'webScout',
        kind: 'web-proposal',
        day: TEST_DAY,
        title: 'Proposed 2',
        content: {},
        sourceRefs: {},
      });

      const toApproveId = await createArtifact({
        runId: null,
        agent: 'distiller',
        kind: 'concept',
        day: TEST_DAY,
        title: 'To Approve',
        content: {},
        sourceRefs: {},
      });
      await approveArtifact(scope, toApproveId);

      const toRejectId = await createArtifact({
        runId: null,
        agent: 'distiller',
        kind: 'flashcard',
        day: TEST_DAY,
        title: 'To Reject',
        content: {},
        sourceRefs: {},
      });
      await rejectArtifact(scope, toRejectId);

      const counts = await countArtifactsByStatus(scope, TEST_DAY);

      expect(counts.proposed).toBe(2);
      expect(counts.approved).toBe(1);
      expect(counts.rejected).toBe(1);
      expect(counts.superseded).toBe(0);
    });

    it('should return zeros for day with no artifacts', async () => {
      const counts = await countArtifactsByStatus(scope, '2099-12-31');

      expect(counts.proposed).toBe(0);
      expect(counts.approved).toBe(0);
      expect(counts.rejected).toBe(0);
      expect(counts.superseded).toBe(0);
    });
  });

  describe('artifact content integrity', () => {
    it('should preserve complex JSONB content', async () => {
      const complexContent = {
        url: 'https://example.com',
        summary: 'A detailed summary with special characters: <>&"\'',
        relevanceScore: 0.95,
        topics: ['topic1', 'topic2', 'topic3'],
        metadata: {
          nested: {
            value: 42,
            array: [1, 2, 3],
          },
        },
      };

      const artifactId = await createArtifact({
        runId: null,
        agent: 'webScout',
        kind: 'web-proposal',
        day: TEST_DAY,
        title: 'Complex Content',
        content: complexContent,
        sourceRefs: { query: 'test' },
      });

      const artifact = await getArtifactById(scope, artifactId);
      expect(artifact!.content).toEqual(complexContent);
    });

    it('should preserve source_refs JSONB', async () => {
      const sourceRefs = {
        documentId: '123e4567-e89b-12d3-a456-426614174000',
        conceptId: '987fcdeb-51a2-34b5-c678-9d0e1f234567',
        citations: [{ page: 1, line: 10 }],
      };

      const artifactId = await createArtifact({
        runId: null,
        agent: 'distiller',
        kind: 'flashcard',
        day: TEST_DAY,
        title: 'With Source Refs',
        content: {},
        sourceRefs,
      });

      const artifact = await getArtifactById(scope, artifactId);
      expect(artifact!.source_refs).toEqual(sourceRefs);
    });
  });
});

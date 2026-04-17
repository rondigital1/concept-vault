import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { sql } from '@/db';
import {
  createSavedTopic,
  getSavedTopicsByIds,
  linkDocumentToMatchingTopics,
  linkTopicToMatchingDocuments,
  listTopicDocumentLinks,
} from '@/server/repos/savedTopics.repo';
import {
  cleanAllTables,
  closeTestDb,
  getTestWorkspaceScope,
  initTestSchema,
  insertTestDocument,
} from '../helpers/testDb';

describe('savedTopics repo linking', () => {
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

  it('links a topic to matching documents and updates the topic signal', async () => {
    const topic = await createSavedTopic({
      workspaceId: scope.workspaceId,
      name: 'Agent memory',
      goal: 'Track agent memory systems',
      focusTags: ['agents', 'memory'],
    });

    const olderDocumentId = await insertTestDocument({
      title: 'Older note',
      tags: ['memory', 'agents', 'ops'],
      source: 'https://example.com/older-note',
    });
    const newerDocumentId = await insertTestDocument({
      title: 'Newer note',
      tags: ['rag', 'memory'],
      source: 'https://example.com/newer-note',
    });
    await insertTestDocument({
      title: 'Ignored note',
      tags: ['finance'],
      source: 'https://example.com/ignored-note',
    });

    const result = await linkTopicToMatchingDocuments(scope, topic.id, ['agents', 'memory', 'rag'], 10);

    expect(result).toEqual({
      linkedCount: 2,
      documentIds: [newerDocumentId, olderDocumentId],
    });

    const links = await listTopicDocumentLinks(scope, topic.id, 10);
    expect(links).toEqual([
      expect.objectContaining({
        topic_id: topic.id,
        document_id: newerDocumentId,
        matched_tags: ['rag', 'memory'],
      }),
      expect.objectContaining({
        topic_id: topic.id,
        document_id: olderDocumentId,
        matched_tags: ['memory', 'agents'],
      }),
    ]);

    const savedTopic = (await getSavedTopicsByIds(scope, [topic.id]))[0];
    expect(savedTopic?.last_signal_at).not.toBeNull();
  });

  it('updates existing topic-document links instead of duplicating them', async () => {
    const topic = await createSavedTopic({
      workspaceId: scope.workspaceId,
      name: 'Agent evals',
      goal: 'Track agent evaluations',
      focusTags: ['agents', 'evals'],
    });
    const documentId = await insertTestDocument({
      title: 'Agent eval note',
      tags: ['agents', 'evals', 'benchmarks'],
      source: 'https://example.com/agent-evals',
    });

    await linkTopicToMatchingDocuments(scope, topic.id, ['agents', 'evals'], 10);
    await linkTopicToMatchingDocuments(scope, topic.id, ['evals'], 10);

    const linkRows = await sql<Array<{ matched_tags: string[] }>>`
      SELECT matched_tags
      FROM topic_documents
      WHERE topic_id = ${topic.id}
        AND document_id = ${documentId}
    `;
    const countRows = await sql<Array<{ count: number }>>`
      SELECT COUNT(*)::integer AS count
      FROM topic_documents
      WHERE topic_id = ${topic.id}
        AND document_id = ${documentId}
    `;

    expect(countRows[0]?.count).toBe(1);
    expect(linkRows[0]?.matched_tags).toEqual(['evals']);
  });

  it('links a document to all matching active topics and signals each topic once', async () => {
    const activeTopic = await createSavedTopic({
      workspaceId: scope.workspaceId,
      name: 'Memory systems',
      goal: 'Track memory systems',
      focusTags: ['memory', 'agents'],
    });
    const secondActiveTopic = await createSavedTopic({
      workspaceId: scope.workspaceId,
      name: 'Retrieval systems',
      goal: 'Track retrieval systems',
      focusTags: ['rag', 'agents'],
    });
    const inactiveTopic = await createSavedTopic({
      workspaceId: scope.workspaceId,
      name: 'Inactive topic',
      goal: 'Do not link',
      focusTags: ['agents'],
      isActive: false,
    });
    const documentId = await insertTestDocument({
      title: 'Agent memory note',
      tags: ['agents', 'memory', 'rag'],
      source: 'https://example.com/agent-memory-note',
    });

    const result = await linkDocumentToMatchingTopics(scope, documentId, ['agents', 'memory', 'rag']);

    expect(new Set(result.topicIds)).toEqual(new Set([activeTopic.id, secondActiveTopic.id]));

    const linkRows = await sql<Array<{ topic_id: string; matched_tags: string[] }>>`
      SELECT td.topic_id, td.matched_tags
      FROM topic_documents td
      INNER JOIN saved_topics st ON st.id = td.topic_id
      WHERE st.workspace_id = ${scope.workspaceId}
        AND td.document_id = ${documentId}
      ORDER BY td.topic_id
    `;

    expect(new Map(linkRows.map((row) => [row.topic_id, row.matched_tags]))).toEqual(
      new Map([
        [activeTopic.id, ['agents', 'memory']],
        [secondActiveTopic.id, ['agents', 'rag']],
      ]),
    );

    const topics = await getSavedTopicsByIds(scope, [activeTopic.id, secondActiveTopic.id, inactiveTopic.id]);
    const byId = new Map(topics.map((topic) => [topic.id, topic]));

    expect(byId.get(activeTopic.id)?.last_signal_at).not.toBeNull();
    expect(byId.get(secondActiveTopic.id)?.last_signal_at).not.toBeNull();
    expect(byId.get(inactiveTopic.id)?.last_signal_at).toBeNull();
  });
});

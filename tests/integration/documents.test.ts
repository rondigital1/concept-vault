/**
 * Integration tests for document repository operations.
 * 
 * Tests:
 * - content_hash uniqueness (deduplication)
 * - Recent document listing
 * - URL deduplication (filterExistingUrls)
 * - Tag-based queries
 * 
 * Requires: Docker Postgres running
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  initTestSchema,
  cleanAllTables,
  closeTestDb,
  insertTestDocument,
} from '../helpers/testDb';
import { SAMPLE_DOCUMENTS } from '../helpers/fixtures';
import { ingestDocument } from '@/server/services/ingest.service';
import {
  getRecentDocumentsForQuery,
  getDocumentsByTags,
  filterExistingUrls,
  checkUrlExists,
} from '@/server/repos/webScout.repo';
import {
  getDocumentsByIds,
  getDocumentsByTag,
  getRecentDocuments,
} from '@/server/repos/distiller.repo';

describe('Document Repository', () => {
  beforeAll(async () => {
    await initTestSchema();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await cleanAllTables();
  });

  describe('ingestDocument', () => {
    it('should create a new document and return created=true', async () => {
      const result = await ingestDocument({
        title: 'Test Document',
        source: 'https://example.com/test',
        content: 'This is test content.',
      });

      expect(result.documentId).toBeDefined();
      expect(result.created).toBe(true);
    });

    it('should deduplicate by content_hash and return created=false', async () => {
      const content = 'Unique test content for deduplication test.';

      // First insert
      const result1 = await ingestDocument({
        title: 'Document 1',
        source: 'https://example.com/doc1',
        content,
      });

      expect(result1.created).toBe(true);

      // Second insert with same content
      const result2 = await ingestDocument({
        title: 'Document 2', // Different title
        source: 'https://example.com/doc2', // Different source
        content, // Same content
      });

      expect(result2.created).toBe(false);
      expect(result2.documentId).toBe(result1.documentId);
    });

    it('should normalize content before hashing', async () => {
      // These should be treated as the same content after normalization
      const content1 = 'Test content\r\nwith Windows newlines';
      const content2 = 'Test content\nwith Windows newlines';

      const result1 = await ingestDocument({
        title: 'Document 1',
        source: 'https://example.com/doc1',
        content: content1,
      });

      const result2 = await ingestDocument({
        title: 'Document 2',
        source: 'https://example.com/doc2',
        content: content2,
      });

      // Should be deduplicated (same content after normalization)
      expect(result2.documentId).toBe(result1.documentId);
      expect(result2.created).toBe(false);
    });

    it('should treat whitespace-trimmed content as same', async () => {
      const result1 = await ingestDocument({
        title: 'Document 1',
        source: 'https://example.com/doc1',
        content: '  Test content with whitespace  ',
      });

      const result2 = await ingestDocument({
        title: 'Document 2',
        source: 'https://example.com/doc2',
        content: 'Test content with whitespace',
      });

      // Should be deduplicated after trimming
      expect(result2.documentId).toBe(result1.documentId);
    });

    it('should handle multiple blank lines normalization', async () => {
      const content1 = 'Line 1\n\n\n\n\nLine 2';
      const content2 = 'Line 1\n\nLine 2';

      const result1 = await ingestDocument({
        title: 'Document 1',
        source: 'https://example.com/doc1',
        content: content1,
      });

      const result2 = await ingestDocument({
        title: 'Document 2',
        source: 'https://example.com/doc2',
        content: content2,
      });

      // Should be deduplicated (blank lines collapsed)
      expect(result2.documentId).toBe(result1.documentId);
    });
  });

  describe('getRecentDocuments', () => {
    it('should return documents ordered by imported_at DESC', async () => {
      // Insert documents in order
      const doc1Id = await insertTestDocument({ title: 'First Document' });
      const doc2Id = await insertTestDocument({ title: 'Second Document' });
      const doc3Id = await insertTestDocument({ title: 'Third Document' });

      const recent = await getRecentDocuments(10);

      expect(recent).toHaveLength(3);
      // Most recent first (reverse order of insertion)
      expect(recent[0].id).toBe(doc3Id);
      expect(recent[1].id).toBe(doc2Id);
      expect(recent[2].id).toBe(doc1Id);
    });

    it('should respect limit parameter', async () => {
      await insertTestDocument({ title: 'Doc 1' });
      await insertTestDocument({ title: 'Doc 2' });
      await insertTestDocument({ title: 'Doc 3' });
      await insertTestDocument({ title: 'Doc 4' });
      await insertTestDocument({ title: 'Doc 5' });

      const recent = await getRecentDocuments(3);
      expect(recent).toHaveLength(3);
    });

    it('should return empty array when no documents exist', async () => {
      const recent = await getRecentDocuments(10);
      expect(recent).toEqual([]);
    });
  });

  describe('getDocumentsByIds', () => {
    it('should return documents matching the provided IDs', async () => {
      const doc1Id = await insertTestDocument({ title: 'Document 1' });
      const doc2Id = await insertTestDocument({ title: 'Document 2' });
      const doc3Id = await insertTestDocument({ title: 'Document 3' });

      const docs = await getDocumentsByIds([doc1Id, doc3Id], 10);

      expect(docs).toHaveLength(2);
      expect(docs.map(d => d.id).sort()).toEqual([doc1Id, doc3Id].sort());
    });

    it('should respect limit parameter', async () => {
      const doc1Id = await insertTestDocument({ title: 'Document 1' });
      const doc2Id = await insertTestDocument({ title: 'Document 2' });
      const doc3Id = await insertTestDocument({ title: 'Document 3' });

      const docs = await getDocumentsByIds([doc1Id, doc2Id, doc3Id], 2);

      expect(docs).toHaveLength(2);
    });

    it('should return empty array for non-existent IDs', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const docs = await getDocumentsByIds([fakeId], 10);
      expect(docs).toEqual([]);
    });
  });

  describe('getDocumentsByTag', () => {
    it('should return documents with matching tag', async () => {
      await insertTestDocument({
        title: 'Learning Doc 1',
        tags: ['learning', 'science']
      });
      await insertTestDocument({
        title: 'Learning Doc 2',
        tags: ['learning', 'memory']
      });
      await insertTestDocument({
        title: 'Other Doc',
        tags: ['finance', 'investing']
      });

      const docs = await getDocumentsByTag('learning', 10);

      expect(docs).toHaveLength(2);
      expect(docs.every(d => d.tags.includes('learning'))).toBe(true);
    });

    it('should return empty array for non-existent tag', async () => {
      await insertTestDocument({ title: 'Doc', tags: ['learning'] });

      const docs = await getDocumentsByTag('nonexistent', 10);
      expect(docs).toEqual([]);
    });
  });

  describe('getDocumentsByTags (array overlap)', () => {
    it('should return documents with any matching tag', async () => {
      await insertTestDocument({
        title: 'Doc 1',
        tags: ['learning', 'science']
      });
      await insertTestDocument({
        title: 'Doc 2',
        tags: ['memory', 'psychology']
      });
      await insertTestDocument({
        title: 'Doc 3',
        tags: ['finance', 'investing']
      });

      // Query for documents with learning OR memory tags
      const docs = await getDocumentsByTags(['learning', 'memory'], 10);

      expect(docs).toHaveLength(2);
    });

    it('should return ordered by imported_at DESC', async () => {
      const doc1Id = await insertTestDocument({
        title: 'First',
        tags: ['learning']
      });
      const doc2Id = await insertTestDocument({
        title: 'Second',
        tags: ['learning']
      });

      const docs = await getDocumentsByTags(['learning'], 10);

      expect(docs[0].id).toBe(doc2Id); // Most recent first
      expect(docs[1].id).toBe(doc1Id);
    });
  });

  describe('URL deduplication', () => {
    describe('checkUrlExists', () => {
      it('should return true for existing URL', async () => {
        const url = 'https://example.com/existing-article';
        await insertTestDocument({ source: url });

        const exists = await checkUrlExists(url);
        expect(exists).toBe(true);
      });

      it('should return false for non-existent URL', async () => {
        const exists = await checkUrlExists('https://example.com/nonexistent');
        expect(exists).toBe(false);
      });

      it('should be case-sensitive', async () => {
        await insertTestDocument({ source: 'https://Example.com/Article' });

        const existsExact = await checkUrlExists('https://Example.com/Article');
        const existsLower = await checkUrlExists('https://example.com/article');

        expect(existsExact).toBe(true);
        expect(existsLower).toBe(false);
      });
    });

    describe('filterExistingUrls', () => {
      it('should filter out URLs that already exist in documents', async () => {
        await insertTestDocument({ source: 'https://example.com/existing1' });
        await insertTestDocument({ source: 'https://example.com/existing2' });

        const urls = [
          'https://example.com/existing1',
          'https://example.com/new1',
          'https://example.com/existing2',
          'https://example.com/new2',
        ];

        const newUrls = await filterExistingUrls(urls);

        expect(newUrls).toHaveLength(2);
        expect(newUrls).toContain('https://example.com/new1');
        expect(newUrls).toContain('https://example.com/new2');
        expect(newUrls).not.toContain('https://example.com/existing1');
        expect(newUrls).not.toContain('https://example.com/existing2');
      });

      it('should return all URLs when none exist', async () => {
        const urls = [
          'https://example.com/new1',
          'https://example.com/new2',
        ];

        const newUrls = await filterExistingUrls(urls);

        expect(newUrls).toEqual(urls);
      });

      it('should return empty array when all URLs exist', async () => {
        await insertTestDocument({ source: 'https://example.com/existing1' });
        await insertTestDocument({ source: 'https://example.com/existing2' });

        const urls = [
          'https://example.com/existing1',
          'https://example.com/existing2',
        ];

        const newUrls = await filterExistingUrls(urls);

        expect(newUrls).toEqual([]);
      });

      it('should handle empty input array', async () => {
        const newUrls = await filterExistingUrls([]);
        expect(newUrls).toEqual([]);
      });
    });
  });

  describe('document content integrity', () => {
    it('should preserve full content', async () => {
      const content = SAMPLE_DOCUMENTS.spacedRepetition.content;

      const result = await ingestDocument({
        title: SAMPLE_DOCUMENTS.spacedRepetition.title,
        source: SAMPLE_DOCUMENTS.spacedRepetition.source,
        content,
      });

      const docs = await getDocumentsByIds([result.documentId], 1);

      // Content should be preserved (after normalization)
      expect(docs[0].content).toContain('Spaced repetition is a learning technique');
      expect(docs[0].content).toContain('SM-2 algorithm');
    });

    it('should store and retrieve tags correctly', async () => {
      const docId = await insertTestDocument({
        tags: ['spaced repetition', 'learning', 'memory science'],
      });

      const docs = await getDocumentsByIds([docId], 1);

      expect(docs[0].tags).toEqual(['spaced repetition', 'learning', 'memory science']);
    });
  });
});

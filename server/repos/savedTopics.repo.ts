import { sql } from '@/db';

export type TopicCadence = 'daily' | 'weekly';
type JsonParam = Parameters<typeof sql.json>[0];

export interface SavedTopicRow {
  id: string;
  name: string;
  goal: string;
  focus_tags: string[];
  max_docs_per_run: number;
  min_quality_results: number;
  min_relevance_score: number;
  max_iterations: number;
  max_queries: number;
  is_active: boolean;
  is_tracked: boolean;
  cadence: TopicCadence;
  last_run_at: string | null;
  last_run_mode: string | null;
  last_signal_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface TopicDocumentRow {
  id: string;
  title: string;
  tags: string[];
}

export interface LinkedTopicDocumentRow {
  topic_id: string;
  document_id: string;
  matched_tags: string[];
  linked_at: string;
  updated_at: string;
}

export interface CreateSavedTopicInput {
  name: string;
  goal: string;
  focusTags?: string[];
  maxDocsPerRun?: number;
  minQualityResults?: number;
  minRelevanceScore?: number;
  maxIterations?: number;
  maxQueries?: number;
  isActive?: boolean;
  isTracked?: boolean;
  cadence?: TopicCadence;
  metadata?: Record<string, unknown>;
}

export interface UpsertTopicSetupInput {
  topicId: string;
  focusTags: string[];
  metadata?: Record<string, unknown>;
}

function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const tag of tags) {
    const clean = tag.toLowerCase().trim().replace(/\s+/g, ' ');
    if (!clean || clean.length < 2 || clean.length > 40 || seen.has(clean)) {
      continue;
    }
    seen.add(clean);
    normalized.push(clean);
  }

  return normalized.slice(0, 20);
}

function rowSelection() {
  return sql`
    id,
    name,
    goal,
    focus_tags,
    max_docs_per_run,
    min_quality_results,
    min_relevance_score,
    max_iterations,
    max_queries,
    is_active,
    is_tracked,
    cadence,
    last_run_at,
    last_run_mode,
    last_signal_at,
    metadata,
    created_at,
    updated_at
  `;
}

export async function listSavedTopics(options?: {
  activeOnly?: boolean;
  trackedOnly?: boolean;
}): Promise<SavedTopicRow[]> {
  const activeOnly = options?.activeOnly === true;
  const trackedOnly = options?.trackedOnly === true;

  if (activeOnly && trackedOnly) {
    return sql<SavedTopicRow[]>`
      SELECT ${rowSelection()}
      FROM saved_topics
      WHERE is_active = true AND is_tracked = true
      ORDER BY updated_at DESC, created_at DESC
    `;
  }

  if (activeOnly) {
    return sql<SavedTopicRow[]>`
      SELECT ${rowSelection()}
      FROM saved_topics
      WHERE is_active = true
      ORDER BY updated_at DESC, created_at DESC
    `;
  }

  if (trackedOnly) {
    return sql<SavedTopicRow[]>`
      SELECT ${rowSelection()}
      FROM saved_topics
      WHERE is_tracked = true
      ORDER BY updated_at DESC, created_at DESC
    `;
  }

  return sql<SavedTopicRow[]>`
    SELECT ${rowSelection()}
    FROM saved_topics
    ORDER BY updated_at DESC, created_at DESC
  `;
}

export async function getSavedTopicsByIds(topicIds: string[]): Promise<SavedTopicRow[]> {
  if (topicIds.length === 0) {
    return [];
  }

  return sql<SavedTopicRow[]>`
    SELECT ${rowSelection()}
    FROM saved_topics
    WHERE id = ANY(${topicIds})
    ORDER BY updated_at DESC, created_at DESC
  `;
}

export async function createSavedTopic(input: CreateSavedTopicInput): Promise<SavedTopicRow> {
  const focusTags = normalizeTags(input.focusTags ?? []);
  const cadence = input.cadence ?? 'weekly';

  const rows = await sql<SavedTopicRow[]>`
    INSERT INTO saved_topics (
      name,
      goal,
      focus_tags,
      max_docs_per_run,
      min_quality_results,
      min_relevance_score,
      max_iterations,
      max_queries,
      is_active,
      is_tracked,
      cadence,
      metadata
    )
    VALUES (
      ${input.name},
      ${input.goal},
      ${sql.array(focusTags)},
      ${input.maxDocsPerRun ?? 5},
      ${input.minQualityResults ?? 3},
      ${input.minRelevanceScore ?? 0.8},
      ${input.maxIterations ?? 5},
      ${input.maxQueries ?? 10},
      ${input.isActive ?? true},
      ${input.isTracked ?? false},
      ${cadence},
      ${sql.json((input.metadata ?? {}) as JsonParam)}
    )
    RETURNING ${rowSelection()}
  `;

  return rows[0];
}

export async function upsertTopicSetup(input: UpsertTopicSetupInput): Promise<SavedTopicRow | null> {
  const focusTags = normalizeTags(input.focusTags);

  const rows = await sql<SavedTopicRow[]>`
    UPDATE saved_topics
    SET
      focus_tags = ${sql.array(focusTags)},
      metadata = COALESCE(metadata, '{}'::jsonb) || ${sql.json((input.metadata ?? {}) as JsonParam)},
      updated_at = now()
    WHERE id = ${input.topicId}
    RETURNING ${rowSelection()}
  `;

  return rows[0] ?? null;
}

export async function setTopicSignal(topicId: string): Promise<void> {
  await sql`
    UPDATE saved_topics
    SET last_signal_at = now(), updated_at = now()
    WHERE id = ${topicId}
  `;
}

export async function markTopicsUpdatedByTags(tags: string[]): Promise<number> {
  const normalized = normalizeTags(tags);
  if (normalized.length === 0) {
    return 0;
  }

  const rows = await sql<Array<{ id: string }>>`
    UPDATE saved_topics
    SET last_signal_at = now(), updated_at = now()
    WHERE is_active = true
      AND cardinality(focus_tags) > 0
      AND focus_tags && ${sql.array(normalized)}
    RETURNING id
  `;

  return rows.length;
}

export async function markTopicRunCompleted(topicId: string, mode: string): Promise<void> {
  await sql`
    UPDATE saved_topics
    SET
      last_run_at = now(),
      last_run_mode = ${mode},
      updated_at = now()
    WHERE id = ${topicId}
  `;
}

export async function listDueTrackedTopics(referenceTime = new Date()): Promise<SavedTopicRow[]> {
  const iso = referenceTime.toISOString();

  return sql<SavedTopicRow[]>`
    SELECT ${rowSelection()}
    FROM saved_topics
    WHERE is_active = true
      AND is_tracked = true
      AND (
        (cadence = 'daily' AND (last_run_at IS NULL OR last_run_at < (${iso}::timestamptz - interval '24 hours')))
        OR
        (cadence = 'weekly' AND (last_run_at IS NULL OR last_run_at < (${iso}::timestamptz - interval '7 days')))
      )
    ORDER BY COALESCE(last_run_at, to_timestamp(0)) ASC, updated_at DESC
  `;
}

export async function getTopicDocuments(focusTags: string[], limit: number): Promise<TopicDocumentRow[]> {
  const normalized = normalizeTags(focusTags);

  if (normalized.length > 0) {
    return sql<TopicDocumentRow[]>`
      SELECT id, title, tags
      FROM documents
      WHERE tags && ${sql.array(normalized)}
      ORDER BY imported_at DESC
      LIMIT ${limit}
    `;
  }

  return sql<TopicDocumentRow[]>`
    SELECT id, title, tags
    FROM documents
    ORDER BY imported_at DESC
    LIMIT ${limit}
  `;
}

export async function getTopicLinkedDocuments(topicId: string, limit: number): Promise<TopicDocumentRow[]> {
  return sql<TopicDocumentRow[]>`
    SELECT d.id, d.title, d.tags
    FROM topic_documents td
    JOIN documents d ON d.id = td.document_id
    WHERE td.topic_id = ${topicId}
    ORDER BY td.updated_at DESC
    LIMIT ${limit}
  `;
}

export async function countTopicLinkedDocuments(topicId: string): Promise<number> {
  const rows = await sql<Array<{ count: number }>>`
    SELECT COUNT(*)::integer AS count
    FROM topic_documents
    WHERE topic_id = ${topicId}
  `;

  return rows[0]?.count ?? 0;
}

function overlap(tags: string[], focusTags: string[]): string[] {
  const focus = new Set(focusTags);
  return tags.filter((tag) => focus.has(tag));
}

export async function linkTopicToMatchingDocuments(
  topicId: string,
  focusTags: string[],
  limit = 200,
): Promise<{ linkedCount: number; documentIds: string[] }> {
  const normalizedFocus = normalizeTags(focusTags);
  if (normalizedFocus.length === 0) {
    return { linkedCount: 0, documentIds: [] };
  }

  const docs = await sql<Array<{ id: string; tags: string[] }>>`
    SELECT id, tags
    FROM documents
    WHERE tags && ${sql.array(normalizedFocus)}
    ORDER BY imported_at DESC
    LIMIT ${limit}
  `;

  if (docs.length === 0) {
    return { linkedCount: 0, documentIds: [] };
  }

  let linkedCount = 0;
  const documentIds: string[] = [];

  for (const doc of docs) {
    const matchedTags = overlap(doc.tags ?? [], normalizedFocus);
    if (matchedTags.length === 0) {
      continue;
    }

    const rows = await sql<Array<{ topic_id: string }>>`
      INSERT INTO topic_documents (topic_id, document_id, matched_tags, linked_at, updated_at)
      VALUES (${topicId}, ${doc.id}, ${sql.array(matchedTags)}, now(), now())
      ON CONFLICT (topic_id, document_id)
      DO UPDATE
        SET matched_tags = EXCLUDED.matched_tags,
            updated_at = now()
      RETURNING topic_id
    `;

    if (rows.length > 0) {
      linkedCount += 1;
      documentIds.push(doc.id);
    }
  }

  if (linkedCount > 0) {
    await setTopicSignal(topicId);
  }

  return { linkedCount, documentIds };
}

export async function linkDocumentToMatchingTopics(
  documentId: string,
  documentTags: string[],
): Promise<{ topicIds: string[] }> {
  const normalized = normalizeTags(documentTags);
  if (normalized.length === 0) {
    return { topicIds: [] };
  }

  const topics = await sql<Array<{ id: string; focus_tags: string[] }>>`
    SELECT id, focus_tags
    FROM saved_topics
    WHERE is_active = true
      AND cardinality(focus_tags) > 0
      AND focus_tags && ${sql.array(normalized)}
  `;

  if (topics.length === 0) {
    return { topicIds: [] };
  }

  const topicIds: string[] = [];

  for (const topic of topics) {
    const matchedTags = overlap(normalized, topic.focus_tags ?? []);
    if (matchedTags.length === 0) {
      continue;
    }

    await sql`
      INSERT INTO topic_documents (topic_id, document_id, matched_tags, linked_at, updated_at)
      VALUES (${topic.id}, ${documentId}, ${sql.array(matchedTags)}, now(), now())
      ON CONFLICT (topic_id, document_id)
      DO UPDATE
        SET matched_tags = EXCLUDED.matched_tags,
            updated_at = now()
    `;

    await setTopicSignal(topic.id);
    topicIds.push(topic.id);
  }

  return { topicIds };
}

export async function countTopicSignalsSince(topicId: string, since: string | null): Promise<number> {
  if (!since) {
    const rows = await sql<Array<{ count: number }>>`
      SELECT COUNT(*)::integer AS count
      FROM topic_documents
      WHERE topic_id = ${topicId}
    `;
    return rows[0]?.count ?? 0;
  }

  const rows = await sql<Array<{ count: number }>>`
    SELECT COUNT(*)::integer AS count
    FROM topic_documents
    WHERE topic_id = ${topicId}
      AND updated_at > ${since}
  `;

  return rows[0]?.count ?? 0;
}

export async function listTopicDocumentLinks(topicId: string, limit: number): Promise<LinkedTopicDocumentRow[]> {
  return sql<LinkedTopicDocumentRow[]>`
    SELECT topic_id, document_id, matched_tags, linked_at, updated_at
    FROM topic_documents
    WHERE topic_id = ${topicId}
    ORDER BY updated_at DESC
    LIMIT ${limit}
  `;
}

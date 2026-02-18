import { sql } from '@/db';

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
  created_at: string;
  updated_at: string;
}

export interface TopicDocumentRow {
  id: string;
  title: string;
  tags: string[];
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
}

export async function listSavedTopics(options?: { activeOnly?: boolean }): Promise<SavedTopicRow[]> {
  if (options?.activeOnly) {
    return sql<SavedTopicRow[]>`
      SELECT id, name, goal, focus_tags, max_docs_per_run, min_quality_results, min_relevance_score,
             max_iterations, max_queries, is_active, created_at, updated_at
      FROM saved_topics
      WHERE is_active = true
      ORDER BY updated_at DESC, created_at DESC
    `;
  }

  return sql<SavedTopicRow[]>`
    SELECT id, name, goal, focus_tags, max_docs_per_run, min_quality_results, min_relevance_score,
           max_iterations, max_queries, is_active, created_at, updated_at
    FROM saved_topics
    ORDER BY updated_at DESC, created_at DESC
  `;
}

export async function getSavedTopicsByIds(topicIds: string[]): Promise<SavedTopicRow[]> {
  if (topicIds.length === 0) {
    return [];
  }

  return sql<SavedTopicRow[]>`
    SELECT id, name, goal, focus_tags, max_docs_per_run, min_quality_results, min_relevance_score,
           max_iterations, max_queries, is_active, created_at, updated_at
    FROM saved_topics
    WHERE id = ANY(${topicIds})
    ORDER BY updated_at DESC, created_at DESC
  `;
}

export async function createSavedTopic(input: CreateSavedTopicInput): Promise<SavedTopicRow> {
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
      is_active
    )
    VALUES (
      ${input.name},
      ${input.goal},
      ${sql.array(input.focusTags ?? [])},
      ${input.maxDocsPerRun ?? 5},
      ${input.minQualityResults ?? 3},
      ${input.minRelevanceScore ?? 0.8},
      ${input.maxIterations ?? 5},
      ${input.maxQueries ?? 10},
      ${input.isActive ?? true}
    )
    RETURNING id, name, goal, focus_tags, max_docs_per_run, min_quality_results, min_relevance_score,
              max_iterations, max_queries, is_active, created_at, updated_at
  `;

  return rows[0];
}

export async function getTopicDocuments(focusTags: string[], limit: number): Promise<TopicDocumentRow[]> {
  if (focusTags.length > 0) {
    return sql<TopicDocumentRow[]>`
      SELECT id, title, tags
      FROM documents
      WHERE tags && ${sql.array(focusTags)}
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

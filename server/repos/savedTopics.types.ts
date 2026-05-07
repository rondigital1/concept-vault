export type TopicCadence = 'daily' | 'weekly';

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
  workspaceId: string;
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

export interface UpdateSavedTopicInput {
  name?: string;
  goal?: string;
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

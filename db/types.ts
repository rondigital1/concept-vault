/**
 * TypeScript types matching SQL schema
 * These types correspond to the database tables defined in migrations
 */

import type { RunKind, RunStatus, RunTrace } from '@/server/observability/runTrace.types';

/**
 * Run record from database
 */
export interface Run {
  id: string;
  kind: RunKind;
  status: RunStatus;

  // Legacy (some codepaths may still rely on this)
  trace?: RunTrace;

  // SQL-first runs schema (preferred)
  started_at?: Date;
  ended_at?: Date | null;
  metadata?: Record<string, unknown>;

  // Legacy timestamps (keep optional to avoid breaking existing code)
  created_at?: Date;
  updated_at?: Date;
}

/**
 * Document record from database
 */
export interface Document {
  id: string;
  source: string;
  title: string;
  content: string;
  tags: string[];
  content_hash: string;
  imported_at: Date;
}

/**
 * Schema migration record
 */
export interface SchemaMigration {
  version: string;
  applied_at: Date;
}

/**
 * Run step record from database (append-only timeline)
 */
export type RunStepStatus = 'running' | 'ok' | 'error' | 'skipped';

export interface RunStep {
  id: string;
  run_id: string;
  step_name: string;
  status: RunStepStatus;

  tool_name: string | null;
  started_at: Date;
  ended_at: Date | null;

  input: unknown; // JSONB
  output: unknown; // JSONB
  error: unknown; // JSONB

  token_estimate: number | null;
  retry_count: number;
}

/**
 * Concept record from database
 */
export type ConceptType = 'definition' | 'principle' | 'framework' | 'procedure' | 'fact';

export interface Concept {
  id: string;
  document_id: string;
  label: string;
  type: ConceptType;
  summary: string;
  evidence: unknown; // JSONB: [{quote, location:{startChar,endChar}}]
  tags: string[];
  created_at: Date;
}

/**
 * Flashcard record from database
 */
export type FlashcardFormat = 'qa' | 'cloze';
export type FlashcardStatus = 'proposed' | 'approved' | 'edited' | 'rejected';

export interface Flashcard {
  id: string;
  document_id: string;
  concept_id: string | null;
  format: FlashcardFormat;
  front: string;
  back: string;
  citations: unknown; // JSONB
  status: FlashcardStatus;
  created_at: Date;
}

/**
 * Review schedule record from database (SM-2 style)
 */
export interface ReviewSchedule {
  flashcard_id: string;
  algorithm: string; // e.g. 'sm2'
  due_at: Date;
  interval_days: number;
  ease_factor: number;
  repetitions: number;
  lapses: number;
  last_reviewed_at: Date | null;
}

/**
 * Individual review event record from database
 */
export interface Review {
  id: string;
  flashcard_id: string;
  reviewed_at: Date;
  grade: number; // 0..5
  ms_spent: number | null;
  notes: string | null;
}

/**
 * LLM call audit record from database
 */
export type LlmCallStatus = 'ok' | 'error';
export type LlmPrivacyMode = 'standard' | 'redact_basic';

export interface LlmCall {
  id: string;
  run_id: string | null;
  step_id: string | null;
  provider: string;
  purpose: string;
  schema_name: string;
  privacy_mode: LlmPrivacyMode;

  input_hash: string;
  output_hash: string | null;

  input_tokens: number | null;
  output_tokens: number | null;
  cost_usd: number | null;

  status: LlmCallStatus;
  error: unknown; // JSONB
  created_at: Date;
}

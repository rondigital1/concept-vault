/**
 * Distiller Repository
 *
 * Database operations for the distiller agent.
 * Handles documents, concepts, flashcards, and artifacts.
 */

import { sql } from '@/db';
import type { WorkspaceScope } from '@/server/auth/workspaceContext';

// Type accepted by sql.json(); used to assert Record<string, unknown> / array shapes for JSONB.
type JsonParam = Parameters<typeof sql.json>[0];

// ---------- Types ----------

export interface DocumentRow {
  id: string;
  title: string;
  content: string;
  tags: string[];
}

export interface ConceptInput {
  label: string;
  type: 'definition' | 'principle' | 'framework' | 'procedure' | 'fact';
  summary: string;
  evidence: Array<{ quote: string; location?: { startChar: number; endChar: number } }>;
}

export interface FlashcardInput {
  format: 'qa' | 'cloze';
  front: string;
  back: string;
}

export interface ArtifactInput {
  workspaceId: string;
  runId: string | null;
  agent: string;
  kind: string;
  day: string;
  title: string;
  content: Record<string, unknown>;
  sourceRefs: Record<string, unknown>;
}

// ---------- Document Queries ----------

/**
 * Fetch documents by IDs
 */
export async function getDocumentsByIds(
  scope: WorkspaceScope,
  documentIds: string[],
  limit: number
): Promise<DocumentRow[]> {
  const rows = await sql<DocumentRow[]>`
    SELECT id, title, content, tags
    FROM documents
    WHERE workspace_id = ${scope.workspaceId}
      AND id = ANY(${documentIds})
    LIMIT ${limit}
  `;
  return rows;
}

/**
 * Fetch documents by topic tag
 */
export async function getDocumentsByTag(
  scope: WorkspaceScope,
  tag: string,
  limit: number
): Promise<DocumentRow[]> {
  const rows = await sql<DocumentRow[]>`
    SELECT id, title, content, tags
    FROM documents
    WHERE workspace_id = ${scope.workspaceId}
      AND ${tag} = ANY(tags)
    ORDER BY imported_at DESC
    LIMIT ${limit}
  `;
  return rows;
}

/**
 * Fetch most recent documents
 */
export async function getRecentDocuments(
  scope: WorkspaceScope,
  limit: number,
): Promise<DocumentRow[]> {
  const rows = await sql<DocumentRow[]>`
    SELECT id, title, content, tags
    FROM documents
    WHERE workspace_id = ${scope.workspaceId}
    ORDER BY imported_at DESC
    LIMIT ${limit}
  `;
  return rows;
}

// ---------- Concept Operations ----------

/**
 * Save a concept to the database
 */
export async function insertConcept(
  scope: WorkspaceScope,
  documentId: string,
  concept: ConceptInput
): Promise<string> {
  const rows = await sql<Array<{ id: string }>>`
    INSERT INTO concepts (document_id, label, type, summary, evidence, tags)
    SELECT
      d.id,
      ${concept.label},
      ${concept.type},
      ${concept.summary},
      ${sql.json(concept.evidence)},
      '{}'
    FROM documents d
    WHERE d.workspace_id = ${scope.workspaceId}
      AND d.id = ${documentId}
    RETURNING id
  `;
  if (!rows[0]?.id) {
    throw new Error(`Document ${documentId} not found in workspace`);
  }
  return rows[0].id;
}

// ---------- Flashcard Operations ----------

/**
 * Save a flashcard to the database
 */
export async function insertFlashcard(
  scope: WorkspaceScope,
  documentId: string,
  conceptId: string | null,
  flashcard: FlashcardInput
): Promise<string> {
  const rows = await sql<Array<{ id: string }>>`
    INSERT INTO flashcards (document_id, concept_id, format, front, back, citations, status)
    SELECT
      d.id,
      ${conceptId},
      ${flashcard.format},
      ${flashcard.front},
      ${flashcard.back},
      '[]'::jsonb,
      'proposed'
    FROM documents d
    WHERE d.workspace_id = ${scope.workspaceId}
      AND d.id = ${documentId}
    RETURNING id
  `;
  if (!rows[0]?.id) {
    throw new Error(`Document ${documentId} not found in workspace`);
  }
  return rows[0].id;
}

// ---------- Artifact Operations ----------

/**
 * Save an artifact to the database
 */
export async function insertArtifact(input: ArtifactInput): Promise<string> {
  const rows = await sql<Array<{ id: string }>>`
    INSERT INTO artifacts (workspace_id, run_id, agent, kind, day, title, content, source_refs, status)
    VALUES (
      ${input.workspaceId},
      ${input.runId},
      ${input.agent},
      ${input.kind},
      ${input.day},
      ${input.title},
      ${sql.json(input.content as JsonParam)},
      ${sql.json(input.sourceRefs as JsonParam)},
      'proposed'
    )
    RETURNING id
  `;
  return rows[0].id;
}

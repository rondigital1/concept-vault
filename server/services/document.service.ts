import { sql } from '@/db';
import { AI_BUDGETS } from '@/server/ai/budget-policy';
import type { WorkspaceScope } from '@/server/auth/workspaceContext';
import { openAIExecutionService } from '@/server/ai/openai-execution-service';
import { buildPrompt } from '@/server/ai/prompt-builder';
import { AI_TASKS } from '@/server/ai/tasks';
import { CategorizationSchema, TagExtractionSchema } from '@/server/langchain/schemas/tags.schema';

/**
 * Minimal DB shape for the SQL-first `documents` table.
 * Keep this local to avoid coupling to any ORM-generated types.
 */
export type DocumentRow = {
  id: string;
  workspace_id?: string;
  source: string;
  title: string;
  content: string;
  tags: string[];
  content_hash: string;
  is_favorite: boolean;
  imported_at: string;
};

export type LibraryDocumentRow = DocumentRow & {
  is_webscout_discovered: boolean;
};

const STOP_TAGS = new Set([
  'introduction',
  'overview',
  'guide',
  'article',
  'notes',
  'note',
  'example',
  'examples',
  'basics',
  'concepts',
  'summary',
  'summaries',
  'tutorial',
  'how to',
]);

function truncateForPrompt(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n\n[TRUNCATED: original_length=${text.length}]`;
}

function normalizeTag(tag: string): string | null {
  const t = tag
    .toLowerCase()
    .trim()
    // Replace punctuation with spaces (defensive)
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!t) return null;

  // Drop very short/very long tags (heuristic guardrail)
  if (t.length < 3 || t.length > 40) return null;

  // Drop obvious stop-tags and generic junk
  if (STOP_TAGS.has(t)) return null;

  // Heuristic: discourage sentence-y tags
  const wordCount = t.split(' ').filter(Boolean).length;
  if (wordCount < 1 || wordCount > 3) return null;

  return t;
}

function finalizeTags(candidates: string[], maxFinal: number): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  for (const c of candidates) {
    const n = normalizeTag(c);
    if (!n) continue;
    if (seen.has(n)) continue;
    seen.add(n);
    out.push(n);
    if (out.length >= maxFinal) break;
  }

  return out;
}

export async function getDocument(
  scope: WorkspaceScope,
  documentId: string,
): Promise<DocumentRow | null> {
  const rows = await sql<Array<DocumentRow>>`
    SELECT id, source, title, content, tags, content_hash, is_favorite, imported_at
    FROM documents
    WHERE workspace_id = ${scope.workspaceId}
      AND id = ${documentId}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

/**
 * Get all documents, ordered by most recently imported first
 */
export async function getAllDocuments(scope: WorkspaceScope): Promise<DocumentRow[]> {
  const rows = await sql<Array<DocumentRow>>`
    SELECT id, source, title, content, tags, content_hash, is_favorite, imported_at
    FROM documents
    WHERE workspace_id = ${scope.workspaceId}
    ORDER BY imported_at DESC
  `;

  return rows;
}

/**
 * Get all documents with source classification for library sections.
 * A document is WebScout-discovered when an approved WebScout proposal
 * matches its source URL or explicitly links back to the document ID.
 */
export async function getAllDocumentsForLibrary(
  scope: WorkspaceScope,
): Promise<LibraryDocumentRow[]> {
  const rows = await sql<Array<LibraryDocumentRow>>`
    SELECT
      d.id,
      d.source,
      d.title,
      d.content,
      d.tags,
      d.content_hash,
      d.is_favorite,
      d.imported_at,
      EXISTS (
        SELECT 1
        FROM artifacts a
        WHERE a.kind = 'web-proposal'
          AND a.workspace_id = ${scope.workspaceId}
          AND a.status = 'approved'
          AND (
            COALESCE(a.content->>'url', '') = d.source
            OR COALESCE(a.source_refs->>'documentId', a.source_refs->>'document_id', '') = d.id::text
          )
      ) AS is_webscout_discovered
    FROM documents d
    WHERE d.workspace_id = ${scope.workspaceId}
    ORDER BY d.imported_at DESC
  `;

  return rows;
}

/**
 * Picks a document for curation from most recent imports.
 * Prioritizes untagged documents, then falls back to the latest document.
 */
export async function getDocumentIdForCuration(scope: WorkspaceScope): Promise<string | null> {
  const untagged = await sql<Array<{ id: string }>>`
    SELECT id
    FROM documents
    WHERE workspace_id = ${scope.workspaceId}
      AND cardinality(tags) = 0
    ORDER BY imported_at DESC
    LIMIT 1
  `;

  if (untagged[0]?.id) {
    return untagged[0].id;
  }

  const latest = await sql<Array<{ id: string }>>`
    SELECT id
    FROM documents
    WHERE workspace_id = ${scope.workspaceId}
    ORDER BY imported_at DESC
    LIMIT 1
  `;

  return latest[0]?.id ?? null;
}

/**
 * MVP v1: Extract stable topic tags.
 *
 * IMPORTANT:
 * - The LLM provides *candidates*.
 * - We enforce stability via deterministic normalization + dedupe + capping.
 */
export async function extractTags(content: string): Promise<string[]> {
  const docForPrompt = truncateForPrompt(content, 12_000);
  try {
    const prompt = buildPrompt({
      task: AI_TASKS.tagDocument,
      systemInstructions: [
        {
          heading: 'Role',
          content: 'You extract stable topic tags from a document for a personal knowledge vault.',
        },
        {
          heading: 'Rules',
          content: [
            'Maximum 10 tags.',
            'Each tag must be lowercase, 1-3 words, and a noun or noun phrase.',
            'No punctuation, explanations, or duplicates.',
            'Do not return generic words like introduction, overview, guide, article, notes, example, basics, concepts.',
            'Prefer concrete, commonly used terms.',
          ].join('\n'),
        },
      ],
      sharedContext: [
        {
          heading: 'Examples',
          content: [
            'Good: spaced repetition, retrieval practice, learning science, distributed systems.',
            'Bad: how to learn better, interesting ideas, modern technology.',
          ].join('\n'),
        },
      ],
      requestPayload: [
        {
          heading: 'Document',
          content: docForPrompt,
        },
      ],
    });
    const response = await openAIExecutionService.executeStructured({
      task: AI_TASKS.tagDocument,
      prompt,
      schema: TagExtractionSchema,
      schemaName: 'document_tag_extraction',
      budget: AI_BUDGETS.tagDocument,
    });
    return finalizeTags(response.output.tags, 8);
  } catch {
    return [];
  }
}

export async function categorize(tags: string[]): Promise<string> {
  if (!tags.length) {
    return 'other';
  }

  try {
    const prompt = buildPrompt({
      task: AI_TASKS.classifyDocument,
      systemInstructions: [
        {
          heading: 'Role',
          content: 'Choose exactly one category for the provided document tags.',
        },
        {
          heading: 'Allowed Categories',
          content: 'learning, software engineering, ai systems, finance, productivity, other',
        },
      ],
      requestPayload: [
        {
          heading: 'Tags',
          content: tags.join(', '),
        },
      ],
    });
    const response = await openAIExecutionService.executeStructured({
      task: AI_TASKS.classifyDocument,
      prompt,
      schema: CategorizationSchema,
      schemaName: 'document_category_selection',
      budget: AI_BUDGETS.categorizeDocument,
    });
    return response.output.category;
  } catch {
    return 'other';
  }
}

/**
 * Deterministic related-doc lookup (no LLM):
 * - Find docs whose `tags` overlap with this document.
 */
export async function findRelatedDocs(
  scope: WorkspaceScope,
  documentId: string,
): Promise<string[]> {
  const base = await sql<Array<{ tags: string[] }>>`
    SELECT tags
    FROM documents
    WHERE workspace_id = ${scope.workspaceId}
      AND id = ${documentId}
    LIMIT 1
  `;
  const tags = base[0]?.tags ?? [];
  if (!tags.length) return [];

  const rows = await sql<Array<{ id: string }>>`
    SELECT id
    FROM documents
    WHERE workspace_id = ${scope.workspaceId}
      AND id <> ${documentId}
      AND tags && ${sql.array(tags)}
    ORDER BY imported_at DESC
    LIMIT 10
  `;

  return rows.map((row) => row.id);
}

export async function setDocumentTags(
  scope: WorkspaceScope,
  documentId: string,
  tags: string[]
): Promise<void> {
  await sql`
    UPDATE documents
    SET tags = ${sql.array(tags)}
    WHERE workspace_id = ${scope.workspaceId}
      AND id = ${documentId}
  `;
}

export async function updateDocumentTitle(
  scope: WorkspaceScope,
  documentId: string,
  title: string
): Promise<void> {
  await sql`
    UPDATE documents
    SET title = ${title}
    WHERE workspace_id = ${scope.workspaceId}
      AND id = ${documentId}
  `;
}

export async function deleteDocument(scope: WorkspaceScope, documentId: string): Promise<void> {
  await sql`
    DELETE FROM documents
    WHERE workspace_id = ${scope.workspaceId}
      AND id = ${documentId}
  `;
}

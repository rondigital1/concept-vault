import { sql } from '@/db';
import type { WorkspaceScope } from '@/server/auth/workspaceContext';
import type { DocumentRow, LibraryDocumentRow } from '@/server/repos/documentContent.types';

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

export async function getAllDocuments(scope: WorkspaceScope): Promise<DocumentRow[]> {
  const rows = await sql<Array<DocumentRow>>`
    SELECT id, source, title, content, tags, content_hash, is_favorite, imported_at
    FROM documents
    WHERE workspace_id = ${scope.workspaceId}
    ORDER BY imported_at DESC
  `;

  return rows;
}

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
  if (!tags.length) {
    return [];
  }

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
  tags: string[],
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
  title: string,
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

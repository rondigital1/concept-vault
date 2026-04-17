import { sql } from '@/db';
import type { WorkspaceScope } from '@/server/auth/workspaceContext';

export interface CollectionRow {
  id: string;
  name: string;
  description: string | null;
  document_count: number;
  created_at: string;
  updated_at: string;
}

export interface CollectionWithDocuments extends CollectionRow {
  document_ids: string[];
}

/** All collections with document counts */
export async function listCollections(scope: WorkspaceScope): Promise<CollectionRow[]> {
  return sql<CollectionRow[]>`
    SELECT c.id, c.name, c.description, c.created_at, c.updated_at,
           COUNT(cd.document_id)::int AS document_count
    FROM collections c
    LEFT JOIN collection_documents cd ON cd.collection_id = c.id
    WHERE c.workspace_id = ${scope.workspaceId}
    GROUP BY c.id
    ORDER BY c.updated_at DESC
  `;
}

/** Single collection with its document IDs */
export async function getCollection(
  scope: WorkspaceScope,
  id: string,
): Promise<CollectionWithDocuments | null> {
  const rows = await sql<CollectionRow[]>`
    SELECT c.id, c.name, c.description, c.created_at, c.updated_at,
           COUNT(cd.document_id)::int AS document_count
    FROM collections c
    LEFT JOIN collection_documents cd ON cd.collection_id = c.id
    WHERE c.workspace_id = ${scope.workspaceId}
      AND c.id = ${id}
    GROUP BY c.id
  `;
  if (!rows[0]) return null;

  const docRows = await sql<Array<{ document_id: string }>>`
    SELECT cd.document_id
    FROM collection_documents cd
    INNER JOIN documents d ON d.id = cd.document_id
    WHERE cd.collection_id = ${id}
      AND d.workspace_id = ${scope.workspaceId}
    ORDER BY added_at DESC
  `;
  return { ...rows[0], document_ids: docRows.map((r) => r.document_id) };
}

export async function createCollection(
  scope: WorkspaceScope,
  name: string,
  description?: string,
): Promise<string> {
  const rows = await sql<Array<{ id: string }>>`
    INSERT INTO collections (workspace_id, name, description)
    VALUES (${scope.workspaceId}, ${name}, ${description ?? null})
    RETURNING id
  `;
  return rows[0].id;
}

export async function updateCollection(
  scope: WorkspaceScope,
  id: string,
  updates: { name?: string; description?: string | null },
): Promise<void> {
  const fields = [];
  if (updates.name !== undefined) fields.push(sql`name = ${updates.name}`);
  if (updates.description !== undefined) fields.push(sql`description = ${updates.description}`);
  if (fields.length === 0) return;

  const setClauses = fields.reduce((acc, f, i) => (i === 0 ? f : sql`${acc}, ${f}`));
  await sql`
    UPDATE collections
    SET ${setClauses}, updated_at = now()
    WHERE workspace_id = ${scope.workspaceId}
      AND id = ${id}
  `;
}

export async function deleteCollection(scope: WorkspaceScope, id: string): Promise<void> {
  await sql`
    DELETE FROM collections
    WHERE workspace_id = ${scope.workspaceId}
      AND id = ${id}
  `;
}

export async function addDocumentToCollection(
  scope: WorkspaceScope,
  collectionId: string,
  documentId: string,
): Promise<void> {
  await sql`
    INSERT INTO collection_documents (collection_id, document_id)
    SELECT c.id, d.id
    FROM collections c
    INNER JOIN documents d ON d.id = ${documentId}
    WHERE c.workspace_id = ${scope.workspaceId}
      AND d.workspace_id = ${scope.workspaceId}
      AND c.id = ${collectionId}
    ON CONFLICT DO NOTHING
  `;
}

export async function removeDocumentFromCollection(
  scope: WorkspaceScope,
  collectionId: string,
  documentId: string,
): Promise<void> {
  await sql`
    DELETE FROM collection_documents cd
    USING collections c
    WHERE c.workspace_id = ${scope.workspaceId}
      AND c.id = ${collectionId}
      AND cd.collection_id = c.id
      AND cd.document_id = ${documentId}
  `;
}

/** Which collections a document belongs to */
export async function getCollectionIdsForDocument(
  scope: WorkspaceScope,
  documentId: string,
): Promise<string[]> {
  const rows = await sql<Array<{ collection_id: string }>>`
    SELECT cd.collection_id
    FROM collection_documents cd
    INNER JOIN collections c ON c.id = cd.collection_id
    WHERE c.workspace_id = ${scope.workspaceId}
      AND cd.document_id = ${documentId}
  `;
  return rows.map((r) => r.collection_id);
}

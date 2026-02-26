import { sql } from '@/db';

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
export async function listCollections(): Promise<CollectionRow[]> {
  return sql<CollectionRow[]>`
    SELECT c.id, c.name, c.description, c.created_at, c.updated_at,
           COUNT(cd.document_id)::int AS document_count
    FROM collections c
    LEFT JOIN collection_documents cd ON cd.collection_id = c.id
    GROUP BY c.id
    ORDER BY c.updated_at DESC
  `;
}

/** Single collection with its document IDs */
export async function getCollection(
  id: string,
): Promise<CollectionWithDocuments | null> {
  const rows = await sql<CollectionRow[]>`
    SELECT c.id, c.name, c.description, c.created_at, c.updated_at,
           COUNT(cd.document_id)::int AS document_count
    FROM collections c
    LEFT JOIN collection_documents cd ON cd.collection_id = c.id
    WHERE c.id = ${id}
    GROUP BY c.id
  `;
  if (!rows[0]) return null;

  const docRows = await sql<Array<{ document_id: string }>>`
    SELECT document_id FROM collection_documents
    WHERE collection_id = ${id}
    ORDER BY added_at DESC
  `;
  return { ...rows[0], document_ids: docRows.map((r) => r.document_id) };
}

export async function createCollection(
  name: string,
  description?: string,
): Promise<string> {
  const rows = await sql<Array<{ id: string }>>`
    INSERT INTO collections (name, description)
    VALUES (${name}, ${description ?? null})
    RETURNING id
  `;
  return rows[0].id;
}

export async function updateCollection(
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
    WHERE id = ${id}
  `;
}

export async function deleteCollection(id: string): Promise<void> {
  await sql`DELETE FROM collections WHERE id = ${id}`;
}

export async function addDocumentToCollection(
  collectionId: string,
  documentId: string,
): Promise<void> {
  await sql`
    INSERT INTO collection_documents (collection_id, document_id)
    VALUES (${collectionId}, ${documentId})
    ON CONFLICT DO NOTHING
  `;
}

export async function removeDocumentFromCollection(
  collectionId: string,
  documentId: string,
): Promise<void> {
  await sql`
    DELETE FROM collection_documents
    WHERE collection_id = ${collectionId} AND document_id = ${documentId}
  `;
}

/** Which collections a document belongs to */
export async function getCollectionIdsForDocument(
  documentId: string,
): Promise<string[]> {
  const rows = await sql<Array<{ collection_id: string }>>`
    SELECT collection_id FROM collection_documents
    WHERE document_id = ${documentId}
  `;
  return rows.map((r) => r.collection_id);
}

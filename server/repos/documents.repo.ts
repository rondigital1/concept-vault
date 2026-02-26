import { sql } from '@/db';

export interface DocumentListItem {
  id: string;
  title: string;
  source: string;
  tags: string[];
  is_favorite: boolean;
  is_read: boolean;
  imported_at: string;
}

/** All documents for sidebar listing (excludes content for performance) */
export async function listDocuments(): Promise<DocumentListItem[]> {
  return sql<DocumentListItem[]>`
    SELECT id, title, source, tags, is_favorite, is_read, imported_at
    FROM documents
    ORDER BY imported_at DESC
  `;
}

/** Search documents by title or content using case-insensitive ILIKE */
export async function searchDocuments(query: string): Promise<DocumentListItem[]> {
  const escaped = query.replace(/[%_\\]/g, '\\$&');
  const pattern = `%${escaped}%`;
  return sql<DocumentListItem[]>`
    SELECT id, title, source, tags, is_favorite, is_read, imported_at
    FROM documents
    WHERE title ILIKE ${pattern} OR content ILIKE ${pattern}
    ORDER BY imported_at DESC
  `;
}

/** Toggle the is_favorite flag, return new value */
export async function toggleFavorite(documentId: string): Promise<boolean> {
  const rows = await sql<Array<{ is_favorite: boolean }>>`
    UPDATE documents
    SET is_favorite = NOT is_favorite
    WHERE id = ${documentId}
    RETURNING is_favorite
  `;
  return rows[0]?.is_favorite ?? false;
}

/** Toggle the is_read flag, return new value */
export async function toggleRead(documentId: string): Promise<boolean> {
  const rows = await sql<Array<{ is_read: boolean }>>`
    UPDATE documents
    SET is_read = NOT is_read
    WHERE id = ${documentId}
    RETURNING is_read
  `;
  return rows[0]?.is_read ?? false;
}

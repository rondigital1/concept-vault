import * as crypto from 'crypto';
import postgres from 'postgres';
import type { Bookmark } from './schemas';

function getSqlClient(): postgres.Sql {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  return postgres(databaseUrl);
}

function computeContentHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function formatBookmarkContent(bookmark: Bookmark): string {
  return `${bookmark.text}

---
Author: @${bookmark.authorUsername} (${bookmark.authorName})
Posted: ${bookmark.createdAt}
Source: ${bookmark.url}`;
}

export interface ImportResult {
  savedCount: number;
  skippedCount: number;
}

export async function importBookmarksToVault(
  bookmarks: Bookmark[]
): Promise<ImportResult> {
  const sql = getSqlClient();
  let savedCount = 0;
  let skippedCount = 0;

  try {
    for (const bookmark of bookmarks) {
      const content = formatBookmarkContent(bookmark);
      const contentHash = computeContentHash(content);
      const title = `X: @${bookmark.authorUsername} - ${bookmark.text.slice(0, 50)}${bookmark.text.length > 50 ? '...' : ''}`;

      // Try to insert, skip if content hash already exists
      const result = await sql`
        INSERT INTO documents (source, title, content, tags, content_hash)
        VALUES (
          ${bookmark.url},
          ${title},
          ${content},
          ${['source:x-bookmarks']},
          ${contentHash}
        )
        ON CONFLICT (content_hash) DO NOTHING
        RETURNING id
      `;

      if (result.length > 0) {
        savedCount++;
      } else {
        skippedCount++;
      }
    }
  } finally {
    await sql.end();
  }

  return { savedCount, skippedCount };
}

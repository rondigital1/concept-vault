import { sql } from '@/db';
import type { WorkspaceScope } from '@/server/auth/workspaceContext';

export async function getTopTags(
  scope: WorkspaceScope,
  limit = 10,
): Promise<Array<{ tag: string; count: number }>> {
  try {
    const safeLimit = Math.max(1, Math.min(100, Number(limit) || 10));

    if (!process.env.DATABASE_URL) {
      console.error('[getTopTags] DATABASE_URL is not set');
      return [];
    }

    const rows = await sql<Array<{ tag: string; count: number | string | bigint }>>`
      SELECT t.tag AS tag, COUNT(*)::integer AS count
      FROM (
        SELECT unnest(tags) AS tag
        FROM documents
        WHERE workspace_id = ${scope.workspaceId}
          AND tags IS NOT NULL
          AND array_length(tags, 1) > 0
      ) t
      WHERE t.tag IS NOT NULL AND btrim(t.tag) <> ''
      GROUP BY t.tag
      ORDER BY count DESC
      LIMIT ${safeLimit}
    `;

    return (rows ?? []).map((row) => ({
      tag: row.tag,
      count: typeof row.count === 'number' ? row.count : Number(row.count),
    }));
  } catch (error) {
    if (error instanceof AggregateError) {
      const messages = error.errors
        .map((entry: unknown) => (entry instanceof Error ? entry.message : String(entry)))
        .join('; ');
      console.error('[getTopTags] AggregateError:', {
        message: messages,
        errors: error.errors,
        limit,
        hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
      });
    } else {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      const errorName = error instanceof Error ? error.name : 'UnknownError';

      console.error('[getTopTags] Error details:', {
        name: errorName,
        message: errorMessage,
        stack: errorStack,
        limit,
        hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
      });
    }

    return [];
  }
}

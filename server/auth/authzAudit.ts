import { sql } from '@/db';

export type WorkspaceOwnedTable =
  | 'artifacts'
  | 'chat_sessions'
  | 'collections'
  | 'documents'
  | 'runs'
  | 'saved_topics'
  | 'source_watchlist';

type AccessResult = 'granted' | 'forbidden' | 'not_found';

const deniedCounters = new Map<string, number>();

async function readWorkspaceId(table: WorkspaceOwnedTable, recordId: string): Promise<string | null> {
  switch (table) {
    case 'artifacts': {
      const rows = await sql<Array<{ workspace_id: string }>>`
        SELECT workspace_id
        FROM artifacts
        WHERE id = ${recordId}
        LIMIT 1
      `;
      return rows[0]?.workspace_id ?? null;
    }
    case 'chat_sessions': {
      const rows = await sql<Array<{ workspace_id: string }>>`
        SELECT workspace_id
        FROM chat_sessions
        WHERE id = ${recordId}::uuid
        LIMIT 1
      `;
      return rows[0]?.workspace_id ?? null;
    }
    case 'collections': {
      const rows = await sql<Array<{ workspace_id: string }>>`
        SELECT workspace_id
        FROM collections
        WHERE id = ${recordId}
        LIMIT 1
      `;
      return rows[0]?.workspace_id ?? null;
    }
    case 'documents': {
      const rows = await sql<Array<{ workspace_id: string }>>`
        SELECT workspace_id
        FROM documents
        WHERE id = ${recordId}
        LIMIT 1
      `;
      return rows[0]?.workspace_id ?? null;
    }
    case 'runs': {
      const rows = await sql<Array<{ workspace_id: string }>>`
        SELECT workspace_id
        FROM runs
        WHERE id = ${recordId}
        LIMIT 1
      `;
      return rows[0]?.workspace_id ?? null;
    }
    case 'saved_topics': {
      const rows = await sql<Array<{ workspace_id: string }>>`
        SELECT workspace_id
        FROM saved_topics
        WHERE id = ${recordId}
        LIMIT 1
      `;
      return rows[0]?.workspace_id ?? null;
    }
    case 'source_watchlist': {
      const rows = await sql<Array<{ workspace_id: string }>>`
        SELECT workspace_id
        FROM source_watchlist
        WHERE id = ${recordId}
        LIMIT 1
      `;
      return rows[0]?.workspace_id ?? null;
    }
  }
}

export async function detectWorkspaceAccess(params: {
  table: WorkspaceOwnedTable;
  recordId: string;
  workspaceId: string;
}): Promise<AccessResult> {
  const recordWorkspaceId = await readWorkspaceId(params.table, params.recordId);
  if (!recordWorkspaceId) {
    return 'not_found';
  }

  return recordWorkspaceId === params.workspaceId ? 'granted' : 'forbidden';
}

export function recordAuthorizationDenied(params: {
  table: WorkspaceOwnedTable;
  action: string;
  recordId: string;
  workspaceId: string;
  userId?: string | null;
}): void {
  const counterKey = `${params.table}:${params.action}`;
  const nextCount = (deniedCounters.get(counterKey) ?? 0) + 1;
  deniedCounters.set(counterKey, nextCount);

  console.warn(
    `[authz] denied table=${params.table} action=${params.action} recordId=${params.recordId} workspaceId=${params.workspaceId} userId=${params.userId ?? 'unknown'} deniedCount=${nextCount}`,
  );
}

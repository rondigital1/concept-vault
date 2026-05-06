import { sql } from '@/db';

export async function splitDistillerArtifactIds(
  workspaceId: string,
  artifactIds: string[],
): Promise<{
  conceptIds: string[];
  flashcardIds: string[];
}> {
  if (artifactIds.length === 0) {
    return { conceptIds: [], flashcardIds: [] };
  }

  const rows = await sql<Array<{ id: string; kind: string }>>`
    SELECT id, kind
    FROM artifacts
    WHERE workspace_id = ${workspaceId}
      AND id = ANY(${artifactIds})
  `;

  return {
    conceptIds: rows.filter((row) => row.kind === 'concept').map((row) => row.id),
    flashcardIds: rows.filter((row) => row.kind === 'flashcard').map((row) => row.id),
  };
}

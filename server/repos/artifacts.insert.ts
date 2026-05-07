import { sql } from '@/db';
import type { ArtifactInput, JsonParam } from '@/server/repos/artifacts.types';

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

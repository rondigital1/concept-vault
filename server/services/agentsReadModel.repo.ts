import { sql } from '@/db';
import type { WorkspaceScope } from '@/server/auth/workspaceContext';
import type { AgentRunRow, AgentStepRow } from '@/server/services/agentsReadModel.types';

export async function listStageRows(scope: WorkspaceScope, stepName: string): Promise<AgentStepRow[]> {
  return sql<AgentStepRow[]>`
    SELECT rs.id, rs.run_id, rs.step_name, rs.status, rs.started_at, rs.ended_at, rs.output, rs.error
    FROM run_steps rs
    INNER JOIN runs r ON r.id = rs.run_id
    WHERE r.workspace_id = ${scope.workspaceId}
      AND rs.step_name = ${stepName}
    ORDER BY rs.started_at DESC
    LIMIT 180
  `;
}

export async function listRecentRuns(scope: WorkspaceScope, limit: number): Promise<AgentRunRow[]> {
  return sql<AgentRunRow[]>`
    SELECT id, kind, status, started_at, ended_at, metadata
    FROM runs
    WHERE workspace_id = ${scope.workspaceId}
    ORDER BY started_at DESC
    LIMIT ${limit}
  `;
}

export async function listPipelineRuns(scope: WorkspaceScope, limit: number): Promise<AgentRunRow[]> {
  return sql<AgentRunRow[]>`
    SELECT id, kind, status, started_at, ended_at, metadata
    FROM runs
    WHERE workspace_id = ${scope.workspaceId}
      AND kind = 'pipeline'
    ORDER BY started_at DESC
    LIMIT ${limit}
  `;
}

export async function listStepsForRuns(scope: WorkspaceScope, runIds: string[]): Promise<AgentStepRow[]> {
  if (runIds.length === 0) {
    return [];
  }

  return sql<AgentStepRow[]>`
    SELECT rs.id, rs.run_id, rs.step_name, rs.status, rs.started_at, rs.ended_at, rs.output, rs.error
    FROM run_steps rs
    INNER JOIN runs r ON r.id = rs.run_id
    WHERE r.workspace_id = ${scope.workspaceId}
      AND rs.run_id = ANY(${runIds})
    ORDER BY rs.started_at ASC
  `;
}

export async function listTopicLinkedCounts(scope: WorkspaceScope): Promise<Map<string, number>> {
  const rows = await sql<Array<{ topic_id: string; count: number }>>`
    SELECT td.topic_id, COUNT(*)::integer AS count
    FROM topic_documents td
    INNER JOIN saved_topics st ON st.id = td.topic_id
    WHERE st.workspace_id = ${scope.workspaceId}
    GROUP BY td.topic_id
  `;

  return new Map(rows.map((row) => [row.topic_id, row.count]));
}

export async function countRecentResearchReports(scope: WorkspaceScope): Promise<number> {
  const rows = await sql<Array<{ count: number }>>`
    SELECT COUNT(*)::integer AS count
    FROM artifacts
    WHERE workspace_id = ${scope.workspaceId}
      AND kind = 'research-report'
      AND created_at >= now() - interval '30 days'
  `;

  return rows[0]?.count ?? 0;
}

export function groupStepsByRun(stepRows: AgentStepRow[]): Map<string, AgentStepRow[]> {
  const stepsByRun = new Map<string, AgentStepRow[]>();

  for (const row of stepRows) {
    const existing = stepsByRun.get(row.run_id) ?? [];
    existing.push(row);
    stepsByRun.set(row.run_id, existing);
  }

  return stepsByRun;
}

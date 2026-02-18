/**
 * Report Repository
 *
 * Database operations for research report artifacts.
 * Reports are artifacts with agent='research', kind='research-report'.
 */

import { sql } from '@/db';
import { ArtifactRow } from './artifacts.repo';

type JsonParam = Parameters<typeof sql.json>[0];

export interface ReportInput {
  runId: string;
  day: string;
  title: string;
  content: Record<string, unknown>;
  sourceRefs?: Record<string, unknown>;
}

/**
 * Insert a research report artifact as 'approved'.
 * Supersedes any existing approved report for the same day.
 */
export async function insertReport(input: ReportInput): Promise<string> {
  const { runId, day, title, content, sourceRefs = {} } = input;

  const id = await sql.begin(async (tx) => {
    // Supersede any existing approved report for this day
    await tx`
      UPDATE artifacts
      SET status = 'superseded', reviewed_at = now()
      WHERE agent = 'research'
        AND kind = 'research-report'
        AND day = ${day}
        AND status = 'approved'
    `;

    const rows = await tx<Array<{ id: string }>>`
      INSERT INTO artifacts (run_id, agent, kind, day, title, content, source_refs, status, reviewed_at)
      VALUES (
        ${runId},
        'research',
        'research-report',
        ${day},
        ${title},
        ${sql.json(content as JsonParam)},
        ${sql.json(sourceRefs as JsonParam)},
        'approved',
        now()
      )
      RETURNING id
    `;

    return rows[0].id;
  });

  return id;
}

/**
 * List all research reports, newest first.
 */
export async function listReports(): Promise<ArtifactRow[]> {
  return sql<ArtifactRow[]>`
    SELECT id, run_id, agent, kind, day, title, content, source_refs, status, created_at, reviewed_at, read_at
    FROM artifacts
    WHERE agent = 'research' AND kind = 'research-report' AND status = 'approved'
    ORDER BY created_at DESC
  `;
}

/**
 * Get a single report by ID.
 */
export async function getReportById(id: string): Promise<ArtifactRow | null> {
  const rows = await sql<ArtifactRow[]>`
    SELECT id, run_id, agent, kind, day, title, content, source_refs, status, created_at, reviewed_at, read_at
    FROM artifacts
    WHERE id = ${id} AND agent = 'research' AND kind = 'research-report'
  `;
  return rows[0] ?? null;
}

/**
 * Mark a report as read.
 */
export async function markReportRead(id: string): Promise<boolean> {
  const rows = await sql<Array<{ id: string }>>`
    UPDATE artifacts
    SET read_at = now()
    WHERE id = ${id} AND kind = 'research-report' AND read_at IS NULL
    RETURNING id
  `;
  return rows.length > 0;
}

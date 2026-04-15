import { createHash } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { sql } from '@/db';
import { cleanAllTables, closeTestDb, initTestSchema } from '../helpers/testDb';

async function dropAgentBootstrapTables(): Promise<void> {
  await sql.unsafe('DROP TABLE IF EXISTS agent_profiles CASCADE');
  await sql.unsafe('DROP TABLE IF EXISTS schema_meta CASCADE');
}

describe('Schema Bootstrap', () => {
  beforeAll(async () => {
    await initTestSchema();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await cleanAllTables();
    await dropAgentBootstrapTables();
    vi.resetModules();
  });

  it('recreates agent bootstrap tables and fingerprints the schema for legacy databases', async () => {
    const { SCHEMA_SQL, ensureSchema } = await import('@/db/schema');
    const fingerprint = createHash('sha256').update(SCHEMA_SQL).digest('hex');

    const result = await ensureSchema(sql);
    expect(result.ok).toBe(true);

    const tables = await sql<Array<{
      schema_meta: string | null;
      agent_profiles: string | null;
    }>>`
      SELECT
        to_regclass('public.schema_meta')::text AS schema_meta,
        to_regclass('public.agent_profiles')::text AS agent_profiles
    `;

    expect(tables[0]).toEqual({
      schema_meta: 'schema_meta',
      agent_profiles: 'agent_profiles',
    });

    const fingerprintRows = await sql<Array<{ value: string }>>`
      SELECT value
      FROM schema_meta
      WHERE key = 'schema_fingerprint'
      LIMIT 1
    `;

    expect(fingerprintRows[0]?.value).toBe(fingerprint);
  });

  it('self-heals agent profile reads when agent_profiles is absent', async () => {
    const { getAgentProfileSettingsMap } = await import('@/server/repos/agentProfiles.repo');
    const profiles = await getAgentProfileSettingsMap();

    expect(profiles).toEqual({
      pipeline: {
        defaultRunMode: 'full_report',
        enableAutoDistillOnIngest: false,
        skipPublishByDefault: false,
      },
      curator: {
        enableCategorizationByDefault: false,
      },
      webScout: {
        minQualityResults: 3,
        minRelevanceScore: 0.8,
        maxIterations: 5,
        maxQueries: 10,
      },
      distiller: {
        maxDocsPerRun: 5,
      },
    });

    const profileCount = await sql<Array<{ count: number }>>`
      SELECT COUNT(*)::integer AS count
      FROM agent_profiles
    `;
    expect(profileCount[0]?.count).toBe(4);
  });

  it('allows the agents workspace read model to boot from a legacy schema state', async () => {
    const { getAgentsView } = await import('@/server/services/agents.service');
    const view = await getAgentsView();

    expect(view.globalProfiles.pipeline.defaultRunMode).toBe('full_report');
    expect(view.agentRegistry).toHaveLength(4);
    expect(view.topicOptions).toEqual([]);
    expect(view.recentRuns).toEqual([]);
    expect(view.executionEvents).toEqual([]);
  });
});

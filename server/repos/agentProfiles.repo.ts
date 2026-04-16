import { sql } from '@/db';
import {
  AGENT_KEYS,
  type AgentKey,
  type AgentProfileRecord,
  type AgentProfileSettingsMap,
  DEFAULT_AGENT_PROFILE_SETTINGS,
  hydrateAgentProfileMap,
  normalizeAgentProfileSettings,
} from '@/server/agents/configuration';

type JsonParam = Parameters<typeof sql.json>[0];

type AgentProfileRow = {
  agent_key: AgentKey;
  settings: Record<string, unknown>;
  updated_at: string | null;
};

async function ensureAgentProfilesSeeded(): Promise<void> {
  for (const agentKey of AGENT_KEYS) {
    await sql`
      INSERT INTO agent_profiles (agent_key, settings)
      VALUES (${agentKey}, ${sql.json(DEFAULT_AGENT_PROFILE_SETTINGS[agentKey] as JsonParam)})
      ON CONFLICT (agent_key) DO NOTHING
    `;
  }
}

function toProfileRecord<K extends AgentKey>(row: AgentProfileRow, agentKey: K): AgentProfileRecord<K> {
  return {
    agentKey,
    settings: normalizeAgentProfileSettings(agentKey, row.settings),
    updatedAt: row.updated_at ?? null,
  };
}

export async function listAgentProfiles(): Promise<{
  [K in AgentKey]: AgentProfileRecord<K>;
}> {
  await ensureAgentProfilesSeeded();

  const rows = await sql<AgentProfileRow[]>`
    SELECT agent_key, settings, updated_at
    FROM agent_profiles
    ORDER BY agent_key ASC
  `;

  const rowMap = new Map(rows.map((row) => [row.agent_key, row]));

  return {
    pipeline: toProfileRecord(
      rowMap.get('pipeline') ?? {
        agent_key: 'pipeline',
        settings: DEFAULT_AGENT_PROFILE_SETTINGS.pipeline,
        updated_at: null,
      },
      'pipeline',
    ),
    curator: toProfileRecord(
      rowMap.get('curator') ?? {
        agent_key: 'curator',
        settings: DEFAULT_AGENT_PROFILE_SETTINGS.curator,
        updated_at: null,
      },
      'curator',
    ),
    webScout: toProfileRecord(
      rowMap.get('webScout') ?? {
        agent_key: 'webScout',
        settings: DEFAULT_AGENT_PROFILE_SETTINGS.webScout,
        updated_at: null,
      },
      'webScout',
    ),
    distiller: toProfileRecord(
      rowMap.get('distiller') ?? {
        agent_key: 'distiller',
        settings: DEFAULT_AGENT_PROFILE_SETTINGS.distiller,
        updated_at: null,
      },
      'distiller',
    ),
  };
}

export async function getAgentProfileSettingsMap(): Promise<AgentProfileSettingsMap> {
  const profiles = await listAgentProfiles();
  return hydrateAgentProfileMap({
    pipeline: profiles.pipeline.settings,
    curator: profiles.curator.settings,
    webScout: profiles.webScout.settings,
    distiller: profiles.distiller.settings,
  });
}

export async function updateAgentProfile<K extends AgentKey>(
  agentKey: K,
  patch: Partial<AgentProfileSettingsMap[K]>,
): Promise<AgentProfileRecord<K>> {
  await ensureAgentProfilesSeeded();

  const currentRows = await sql<AgentProfileRow[]>`
    SELECT agent_key, settings, updated_at
    FROM agent_profiles
    WHERE agent_key = ${agentKey}
    LIMIT 1
  `;

  const currentRow = currentRows[0] ?? {
    agent_key: agentKey,
    settings: DEFAULT_AGENT_PROFILE_SETTINGS[agentKey],
    updated_at: null,
  };

  const nextSettings = normalizeAgentProfileSettings(agentKey, {
    ...currentRow.settings,
    ...patch,
  });

  const rows = await sql<AgentProfileRow[]>`
    INSERT INTO agent_profiles (agent_key, settings, updated_at)
    VALUES (${agentKey}, ${sql.json(nextSettings as JsonParam)}, now())
    ON CONFLICT (agent_key)
    DO UPDATE
      SET settings = EXCLUDED.settings,
          updated_at = now()
    RETURNING agent_key, settings, updated_at
  `;

  return toProfileRecord(rows[0], agentKey);
}

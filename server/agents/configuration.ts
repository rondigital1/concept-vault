export const AGENT_KEYS = ['pipeline', 'curator', 'webScout', 'distiller'] as const;

export type AgentKey = (typeof AGENT_KEYS)[number];

export type AgentDefaultRunMode =
  | 'full_report'
  | 'incremental_update'
  | 'concept_only'
  | 'scout_only';

export type PipelineProfileSettings = {
  defaultRunMode: AgentDefaultRunMode;
  enableAutoDistillOnIngest: boolean;
  skipPublishByDefault: boolean;
};

export type CuratorProfileSettings = {
  enableCategorizationByDefault: boolean;
};

export type WebScoutProfileSettings = {
  minQualityResults: number;
  minRelevanceScore: number;
  maxIterations: number;
  maxQueries: number;
};

export type DistillerProfileSettings = {
  maxDocsPerRun: number;
};

export type AgentProfileSettingsMap = {
  pipeline: PipelineProfileSettings;
  curator: CuratorProfileSettings;
  webScout: WebScoutProfileSettings;
  distiller: DistillerProfileSettings;
};

export type AgentProfileRecord<K extends AgentKey = AgentKey> = {
  agentKey: K;
  settings: AgentProfileSettingsMap[K];
  updatedAt: string | null;
};

export type TopicWorkflowSettings = {
  defaultRunMode: AgentDefaultRunMode;
  enableCategorizationByDefault: boolean;
  skipPublishByDefault: boolean;
  maxDocsPerRun: number;
  minQualityResults: number;
  minRelevanceScore: number;
  maxIterations: number;
  maxQueries: number;
};

export type TopicWorkflowMetadata = {
  workflowSettings?: Partial<
    Pick<
      TopicWorkflowSettings,
      'defaultRunMode' | 'enableCategorizationByDefault' | 'skipPublishByDefault'
    >
  >;
};

export const DEFAULT_AGENT_PROFILE_SETTINGS: AgentProfileSettingsMap = {
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
};

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(min, Math.min(Math.floor(value), max));
}

function clampScore(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(0, Math.min(value, 1));
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function readObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

export function isAgentDefaultRunMode(value: unknown): value is AgentDefaultRunMode {
  return (
    value === 'full_report' ||
    value === 'incremental_update' ||
    value === 'concept_only' ||
    value === 'scout_only'
  );
}

export function normalizeAgentProfileSettings<K extends AgentKey>(
  agentKey: K,
  settings: unknown,
): AgentProfileSettingsMap[K] {
  const record = readObject(settings) ?? {};

  if (agentKey === 'pipeline') {
    const defaults = DEFAULT_AGENT_PROFILE_SETTINGS.pipeline;
    return {
      defaultRunMode: isAgentDefaultRunMode(record.defaultRunMode)
        ? record.defaultRunMode
        : defaults.defaultRunMode,
      enableAutoDistillOnIngest: readBoolean(
        record.enableAutoDistillOnIngest,
        defaults.enableAutoDistillOnIngest,
      ),
      skipPublishByDefault: readBoolean(
        record.skipPublishByDefault,
        defaults.skipPublishByDefault,
      ),
    } as AgentProfileSettingsMap[K];
  }

  if (agentKey === 'curator') {
    const defaults = DEFAULT_AGENT_PROFILE_SETTINGS.curator;
    return {
      enableCategorizationByDefault: readBoolean(
        record.enableCategorizationByDefault,
        defaults.enableCategorizationByDefault,
      ),
    } as AgentProfileSettingsMap[K];
  }

  if (agentKey === 'webScout') {
    const defaults = DEFAULT_AGENT_PROFILE_SETTINGS.webScout;
    return {
      minQualityResults: clampInt(record.minQualityResults, defaults.minQualityResults, 1, 20),
      minRelevanceScore: clampScore(record.minRelevanceScore, defaults.minRelevanceScore),
      maxIterations: clampInt(record.maxIterations, defaults.maxIterations, 1, 20),
      maxQueries: clampInt(record.maxQueries, defaults.maxQueries, 1, 50),
    } as AgentProfileSettingsMap[K];
  }

  const defaults = DEFAULT_AGENT_PROFILE_SETTINGS.distiller;
  return {
    maxDocsPerRun: clampInt(record.maxDocsPerRun, defaults.maxDocsPerRun, 1, 20),
  } as AgentProfileSettingsMap[K];
}

export function hydrateAgentProfileMap(
  entries: Partial<{ [K in AgentKey]: unknown }>,
): AgentProfileSettingsMap {
  return {
    pipeline: normalizeAgentProfileSettings('pipeline', entries.pipeline),
    curator: normalizeAgentProfileSettings('curator', entries.curator),
    webScout: normalizeAgentProfileSettings('webScout', entries.webScout),
    distiller: normalizeAgentProfileSettings('distiller', entries.distiller),
  };
}

export function readTopicWorkflowMetadata(metadata: unknown): TopicWorkflowMetadata {
  const record = readObject(metadata) ?? {};
  const workflowSettings = readObject(record.workflowSettings) ?? null;

  return {
    workflowSettings: workflowSettings
      ? {
          defaultRunMode: isAgentDefaultRunMode(workflowSettings.defaultRunMode)
            ? workflowSettings.defaultRunMode
            : undefined,
          enableCategorizationByDefault:
            typeof workflowSettings.enableCategorizationByDefault === 'boolean'
              ? workflowSettings.enableCategorizationByDefault
              : undefined,
          skipPublishByDefault:
            typeof workflowSettings.skipPublishByDefault === 'boolean'
              ? workflowSettings.skipPublishByDefault
              : undefined,
        }
      : undefined,
  };
}

export function mergeTopicWorkflowMetadata(
  existingMetadata: Record<string, unknown> | null | undefined,
  patch: Partial<TopicWorkflowMetadata>,
): Record<string, unknown> {
  const metadata = { ...(existingMetadata ?? {}) };
  const existingWorkflow = readTopicWorkflowMetadata(existingMetadata).workflowSettings ?? {};
  const nextWorkflow = {
    ...existingWorkflow,
    ...(patch.workflowSettings ?? {}),
  };

  return {
    ...metadata,
    workflowSettings: nextWorkflow,
  };
}

export function resolveTopicWorkflowSettings(input: {
  maxDocsPerRun: number;
  minQualityResults: number;
  minRelevanceScore: number;
  maxIterations: number;
  maxQueries: number;
  metadata?: Record<string, unknown> | null;
  profiles: AgentProfileSettingsMap;
}): TopicWorkflowSettings {
  const topicMetadata = readTopicWorkflowMetadata(input.metadata);
  const workflowSettings = topicMetadata.workflowSettings ?? {};

  return {
    defaultRunMode:
      workflowSettings.defaultRunMode ?? input.profiles.pipeline.defaultRunMode,
    enableCategorizationByDefault:
      workflowSettings.enableCategorizationByDefault ??
      input.profiles.curator.enableCategorizationByDefault,
    skipPublishByDefault:
      workflowSettings.skipPublishByDefault ??
      input.profiles.pipeline.skipPublishByDefault,
    maxDocsPerRun: clampInt(
      input.maxDocsPerRun,
      input.profiles.distiller.maxDocsPerRun,
      1,
      20,
    ),
    minQualityResults: clampInt(
      input.minQualityResults,
      input.profiles.webScout.minQualityResults,
      1,
      20,
    ),
    minRelevanceScore: clampScore(
      input.minRelevanceScore,
      input.profiles.webScout.minRelevanceScore,
    ),
    maxIterations: clampInt(
      input.maxIterations,
      input.profiles.webScout.maxIterations,
      1,
      20,
    ),
    maxQueries: clampInt(
      input.maxQueries,
      input.profiles.webScout.maxQueries,
      1,
      50,
    ),
  };
}

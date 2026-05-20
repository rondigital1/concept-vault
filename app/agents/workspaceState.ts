import type { AgentProfileSettingsMap } from '@/server/agents/configuration';
import {
  formatObservedStepLabel,
  parsePipelineStageId,
  parseObservedAgentKey,
  PIPELINE_STAGE_ORDER,
  readDurationMs,
  summarizeStageProgress,
} from '@/lib/agentRunPresentation';
import type {
  AgentsView,
  RecentRunSummary,
  RunComposerState,
  RunStageDetail,
  SelectedRunDetail,
} from '@/lib/agentsWorkspaceTypes';
import type { RunStepPayload, RunTracePayload } from '@/lib/runApiClient';

export type WorkspaceNotice = {
  status: 'info' | 'ok' | 'error' | 'running';
  message: string;
};

export type RunResultsPayload = {
  runId: string;
  status: 'running' | 'ok' | 'error' | 'partial';
  mode: string | null;
  errors: string[];
  report: { id: string } | null;
  concepts: Array<{ id: string }>;
  sources: Array<{ id: string }>;
  flashcards: Array<{ id: string }>;
};

function readObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function readString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function buildComposerState(
  selectedTopic: AgentsView['selectedTopic'],
  globalProfiles: AgentProfileSettingsMap,
): RunComposerState {
  return {
    runMode: selectedTopic?.workflowSettings.defaultRunMode ?? globalProfiles.pipeline.defaultRunMode,
    goal: selectedTopic?.goal ?? '',
    enableCategorization:
      selectedTopic?.workflowSettings.enableCategorizationByDefault ??
      globalProfiles.curator.enableCategorizationByDefault,
    skipPublish:
      selectedTopic?.workflowSettings.skipPublishByDefault ??
      globalProfiles.pipeline.skipPublishByDefault,
    minQualityResults:
      selectedTopic?.workflowSettings.minQualityResults ?? globalProfiles.webScout.minQualityResults,
    minRelevanceScore:
      selectedTopic?.workflowSettings.minRelevanceScore ?? globalProfiles.webScout.minRelevanceScore,
    maxIterations:
      selectedTopic?.workflowSettings.maxIterations ?? globalProfiles.webScout.maxIterations,
    maxQueries: selectedTopic?.workflowSettings.maxQueries ?? globalProfiles.webScout.maxQueries,
    maxDocsPerRun:
      selectedTopic?.workflowSettings.maxDocsPerRun ?? globalProfiles.distiller.maxDocsPerRun,
  };
}

export function buildTopicDraft(selectedTopic: AgentsView['selectedTopic']) {
  if (!selectedTopic) {
    return null;
  }

  return {
    defaultRunMode: selectedTopic.workflowSettings.defaultRunMode,
    enableCategorizationByDefault: selectedTopic.workflowSettings.enableCategorizationByDefault,
    skipPublishByDefault: selectedTopic.workflowSettings.skipPublishByDefault,
    maxDocsPerRun: selectedTopic.workflowSettings.maxDocsPerRun,
    minQualityResults: selectedTopic.workflowSettings.minQualityResults,
    minRelevanceScore: selectedTopic.workflowSettings.minRelevanceScore,
    maxIterations: selectedTopic.workflowSettings.maxIterations,
    maxQueries: selectedTopic.workflowSettings.maxQueries,
    isTracked: selectedTopic.isTracked,
    isActive: selectedTopic.isActive,
    cadence: selectedTopic.cadence,
  };
}

export type TopicDraft = NonNullable<ReturnType<typeof buildTopicDraft>>;

export function updateNestedProfile(
  current: AgentProfileSettingsMap,
  field: string,
  value: string | number | boolean,
): AgentProfileSettingsMap {
  const [agentKey, property] = field.split('.');
  if (!agentKey || !property) {
    return current;
  }

  return {
    ...current,
    [agentKey]: {
      ...(current as Record<string, Record<string, unknown>>)[agentKey],
      [property]: value,
    },
  } as AgentProfileSettingsMap;
}

export function updateTopicDraftField(
  current: ReturnType<typeof buildTopicDraft>,
  field: string,
  value: string | number | boolean,
) {
  if (!current) {
    return current;
  }

  return {
    ...current,
    [field]: value,
  };
}

export function updateComposerField(
  current: RunComposerState,
  field: string,
  value: string | number | boolean,
): RunComposerState {
  return {
    ...current,
    [field]: value,
  } as RunComposerState;
}

function readStepError(step: RunStepPayload): string | null {
  return readString(readObject(step.error)?.message);
}

function getStepGroupKey(step: RunStepPayload): string {
  const stageId = parsePipelineStageId(step.name);
  return stageId === 'unknown' ? `step:${step.name}` : `stage:${stageId}`;
}

function getStepSortIndex(groupKey: string, firstSeenIndex: number): number {
  const stageId = groupKey.startsWith('stage:')
    ? groupKey.slice('stage:'.length)
    : null;
  const stageIndex = stageId
    ? PIPELINE_STAGE_ORDER.findIndex((stage) => stage.id === stageId)
    : -1;

  if (stageIndex >= 0) {
    return stageIndex + 1;
  }

  return firstSeenIndex === 0 ? 0 : PIPELINE_STAGE_ORDER.length + firstSeenIndex;
}

function resolveStepEndedAt(
  step: RunStepPayload,
  runCompletedAt: string | undefined,
): string | undefined {
  if (step.endedAt) {
    return step.endedAt;
  }

  if (step.status === 'running') {
    return undefined;
  }

  return runCompletedAt ?? step.startedAt;
}

function buildLatestStageDetails(trace: RunTracePayload): RunStageDetail[] {
  const grouped = new Map<
    string,
    {
      step: RunStepPayload;
      firstSeenIndex: number;
      startedAt: string | null;
      error: string | null;
    }
  >();

  trace.steps.forEach((step, index) => {
    const groupKey = getStepGroupKey(step);
    const current = grouped.get(groupKey);
    const nextError = readStepError(step) ?? current?.error ?? null;
    const nextStartedAt = current?.startedAt ?? step.startedAt ?? null;

    grouped.set(groupKey, {
      step,
      firstSeenIndex: current?.firstSeenIndex ?? index,
      startedAt: nextStartedAt,
      error: nextError,
    });
  });

  return Array.from(grouped.entries())
    .sort((a, b) => {
      const aIndex = getStepSortIndex(a[0], a[1].firstSeenIndex);
      const bIndex = getStepSortIndex(b[0], b[1].firstSeenIndex);
      return aIndex - bIndex;
    })
    .map(([, entry]) => {
      const { step } = entry;
      const endedAt = resolveStepEndedAt(step, trace.completedAt);
      return {
        id: getStepGroupKey(step),
        label: formatObservedStepLabel(step.name),
        agentKey: parseObservedAgentKey(step.name, trace.kind),
        status: step.status,
        startedAt: entry.startedAt,
        endedAt: endedAt ?? null,
        durationMs: readDurationMs(entry.startedAt ?? undefined, endedAt),
        error: entry.error,
      };
    });
}

export function toSelectedRunDetail(
  trace: RunTracePayload,
  results: RunResultsPayload | null,
  fallbackRun: RecentRunSummary | null,
): SelectedRunDetail {
  return {
    id: trace.id,
    kind: trace.kind,
    status: trace.status,
    startedAt: trace.startedAt,
    endedAt: trace.completedAt ?? null,
    durationMs: readDurationMs(trace.startedAt, trace.completedAt),
    topicId: fallbackRun?.topicId ?? null,
    topicName: fallbackRun?.topicName ?? null,
    runMode: results?.mode ?? fallbackRun?.runMode ?? null,
    stageProgress: summarizeStageProgress(
      trace.steps.map((step) => ({
        name: step.name,
        status: step.status,
        startedAt: step.startedAt,
        endedAt: step.endedAt,
      })),
    ),
    lastError:
      trace.steps
        .map((step) => readStepError(step))
        .find((message): message is string => Boolean(message)) ?? fallbackRun?.lastError ?? null,
    results: results
      ? {
          reportId: results.report?.id ?? null,
          conceptCount: results.concepts.length,
          flashcardCount: results.flashcards.length,
          sourceCount: results.sources.length,
          errors: results.errors,
        }
      : null,
    stages: buildLatestStageDetails(trace),
  };
}

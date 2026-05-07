import type { WorkspaceScope } from '@/server/auth/workspaceContext';
import type { AgentKey } from '@/server/agents/configuration';
import { getRunTrace } from '@/server/observability/runTrace.store';
import { listArtifactsByRunId } from '@/server/repos/artifacts.repo';
import {
  formatObservedAgentLabel,
  formatObservedStepLabel,
  parseObservedAgentKey,
  readDurationMs,
  summarizeStageProgress,
} from '@/lib/agentRunPresentation';
import type {
  AgentTopicOption,
  ExecutionEvent,
  RecentRunSummary,
  RunStageDetail,
  SelectedRunDetail,
} from '@/lib/agentsWorkspaceTypes';
import type { AgentRunRow, AgentStepRow } from '@/server/services/agentsReadModel.types';
import { readObject, readString } from '@/server/services/agentsValueReaders';

function readTopicId(metadata: Record<string, unknown>): string | null {
  return readString(metadata.topicId);
}

function readRunMode(metadata: Record<string, unknown>): string | null {
  return readString(metadata.runMode);
}

function extractLastError(rows: AgentStepRow[]): string | null {
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    const message = readString(rows[index]?.error?.message);
    if (message) {
      return message;
    }
  }

  return null;
}

function buildSelectedRunStages(
  runKind: string,
  steps: NonNullable<Awaited<ReturnType<typeof getRunTrace>>>['steps'],
): RunStageDetail[] {
  return steps.map((step) => ({
    id: step.name,
    label: formatObservedStepLabel(step.name),
    agentKey: parseObservedAgentKey(step.name, runKind),
    status: step.status,
    startedAt: step.startedAt ?? null,
    endedAt: step.endedAt ?? null,
    durationMs: readDurationMs(step.startedAt, step.endedAt),
    error: readString(readObject(step.error)?.message),
  }));
}

export function buildRunSummary(
  run: AgentRunRow,
  stepRows: AgentStepRow[],
  topicById: Map<string, AgentTopicOption>,
): RecentRunSummary {
  const metadata = run.metadata ?? {};
  const topicId = readTopicId(metadata);
  const topic = topicId ? topicById.get(topicId) ?? null : null;

  return {
    id: run.id,
    kind: run.kind,
    status: run.status,
    startedAt: run.started_at,
    endedAt: run.ended_at,
    durationMs: readDurationMs(run.started_at, run.ended_at ?? undefined),
    topicId,
    topicName: topic?.name ?? null,
    runMode: readRunMode(metadata),
    stageProgress: summarizeStageProgress(
      stepRows.map((step) => ({
        name: step.step_name,
        status: step.status,
        startedAt: step.started_at,
        endedAt: step.ended_at ?? undefined,
      })),
    ),
    lastError: extractLastError(stepRows),
  };
}

export function buildExecutionEvents(runs: RecentRunSummary[]): ExecutionEvent[] {
  return runs.slice(0, 8).map((run) => ({
    id: run.id,
    agentKey: resolveExecutionEventAgentKey(run.kind),
    label: formatObservedAgentLabel(run.kind),
    detail: run.topicName
      ? `${run.runMode ? formatObservedStepLabel(run.runMode) : 'Run'} for ${run.topicName}`
      : run.runMode
        ? formatObservedStepLabel(run.runMode)
        : 'Manual run',
    timestamp: run.startedAt,
    status: run.status,
  }));
}

function resolveExecutionEventAgentKey(runKind: string): AgentKey {
  if (runKind === 'webScout') {
    return 'webScout';
  }
  if (runKind === 'curate') {
    return 'curator';
  }
  if (runKind === 'distill') {
    return 'distiller';
  }

  return 'pipeline';
}

export async function buildSelectedRun(
  scope: WorkspaceScope,
  runId: string,
  recentRuns: RecentRunSummary[],
): Promise<SelectedRunDetail | null> {
  const trace = await getRunTrace(scope, runId);
  if (!trace) {
    return null;
  }

  const runSummary = recentRuns.find((run) => run.id === runId) ?? {
    id: trace.id,
    kind: trace.kind,
    status: trace.status,
    startedAt: trace.startedAt,
    endedAt: trace.completedAt ?? null,
    durationMs: readDurationMs(trace.startedAt, trace.completedAt),
    topicId: null,
    topicName: null,
    runMode: null,
    stageProgress: summarizeStageProgress(
      trace.steps.map((step) => ({
        name: step.name,
        status: step.status,
        startedAt: step.startedAt,
        endedAt: step.endedAt,
      })),
    ),
    lastError: null,
  };
  const artifacts = await listArtifactsByRunId(scope, runId);
  const report = artifacts.find((artifact) => artifact.kind === 'research-report') ?? null;

  return {
    ...runSummary,
    results: {
      reportId: report?.id ?? null,
      conceptCount: artifacts.filter((artifact) => artifact.kind === 'concept').length,
      flashcardCount: artifacts.filter((artifact) => artifact.kind === 'flashcard').length,
      sourceCount: artifacts.filter((artifact) => artifact.kind === 'web-proposal').length,
      errors: trace.steps
        .map((step) => readString(readObject(step.error)?.message))
        .filter((message): message is string => Boolean(message)),
    },
    stages: buildSelectedRunStages(trace.kind, trace.steps),
  };
}

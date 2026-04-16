import { sql } from '@/db';
import {
  type AgentKey,
  type AgentProfileSettingsMap,
  resolveTopicWorkflowSettings,
} from '@/server/agents/configuration';
import { getAgentProfileSettingsMap } from '@/server/repos/agentProfiles.repo';
import { listSavedTopics } from '@/server/repos/savedTopics.repo';
import { getRunTrace } from '@/server/observability/runTrace.store';
import { listArtifactsByRunId } from '@/server/repos/artifacts.repo';
import {
  formatObservedStepLabel,
  formatObservedAgentLabel,
  parseObservedAgentKey,
  readDurationMs,
  summarizeStageProgress,
} from '@/lib/agentRunPresentation';
import type {
  AgentRegistryEntry,
  AgentTopicOption,
  AgentsView,
  ExecutionEvent,
  RecentRunSummary,
  RunStageDetail,
  SelectedRunDetail,
} from '@/lib/agentsWorkspaceTypes';

type RunRow = {
  id: string;
  kind: string;
  status: 'running' | 'ok' | 'error' | 'partial';
  started_at: string;
  ended_at: string | null;
  metadata: Record<string, unknown>;
};

type StepRow = {
  id: string;
  run_id: string;
  step_name: string;
  status: 'running' | 'ok' | 'error' | 'skipped';
  started_at: string;
  ended_at: string | null;
  output: Record<string, unknown> | null;
  error: Record<string, unknown> | null;
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

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function formatPercent(value: number | null): string {
  if (value === null) {
    return '—';
  }

  return `${Math.round(value * 100)}%`;
}

function formatCompactNumber(value: number | null): string {
  if (value === null) {
    return '—';
  }

  return new Intl.NumberFormat('en-US', {
    notation: value >= 1000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(value);
}

function averageDurationMs(values: Array<number | null>): number | null {
  const durations = values.filter((value): value is number => typeof value === 'number');
  if (durations.length === 0) {
    return null;
  }

  return Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length);
}

function computeSuccessRate(statuses: string[]): number | null {
  const filtered = statuses.filter((status) => status === 'ok' || status === 'error' || status === 'partial');
  if (filtered.length === 0) {
    return null;
  }

  const successful = filtered.filter((status) => status === 'ok').length;
  return successful / filtered.length;
}

function readTopicId(metadata: Record<string, unknown>): string | null {
  return readString(metadata.topicId);
}

function readRunMode(metadata: Record<string, unknown>): string | null {
  return readString(metadata.runMode);
}

function extractLastError(rows: StepRow[]): string | null {
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

function buildRunSummary(
  run: RunRow,
  stepRows: StepRow[],
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

function buildExecutionEvents(runs: RecentRunSummary[]): ExecutionEvent[] {
  return runs.slice(0, 8).map((run) => ({
    id: run.id,
    agentKey: (run.kind === 'webScout'
      ? 'webScout'
      : run.kind === 'curate'
        ? 'curator'
        : run.kind === 'distill'
          ? 'distiller'
          : 'pipeline') as AgentKey,
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

async function listStageRows(stepName: string): Promise<StepRow[]> {
  return sql<StepRow[]>`
    SELECT id, run_id, step_name, status, started_at, ended_at, output, error
    FROM run_steps
    WHERE step_name = ${stepName}
    ORDER BY started_at DESC
    LIMIT 180
  `;
}

async function listRecentRuns(limit: number): Promise<RunRow[]> {
  return sql<RunRow[]>`
    SELECT id, kind, status, started_at, ended_at, metadata
    FROM runs
    ORDER BY started_at DESC
    LIMIT ${limit}
  `;
}

async function listPipelineRuns(limit: number): Promise<RunRow[]> {
  return sql<RunRow[]>`
    SELECT id, kind, status, started_at, ended_at, metadata
    FROM runs
    WHERE kind = 'pipeline'
    ORDER BY started_at DESC
    LIMIT ${limit}
  `;
}

async function listStepsForRuns(runIds: string[]): Promise<StepRow[]> {
  if (runIds.length === 0) {
    return [];
  }

  return sql<StepRow[]>`
    SELECT id, run_id, step_name, status, started_at, ended_at, output, error
    FROM run_steps
    WHERE run_id = ANY(${runIds})
    ORDER BY started_at ASC
  `;
}

async function listTopicLinkedCounts(): Promise<Map<string, number>> {
  const rows = await sql<Array<{ topic_id: string; count: number }>>`
    SELECT topic_id, COUNT(*)::integer AS count
    FROM topic_documents
    GROUP BY topic_id
  `;

  return new Map(rows.map((row) => [row.topic_id, row.count]));
}

function buildTopicOptions(
  topics: Awaited<ReturnType<typeof listSavedTopics>>,
  profiles: AgentProfileSettingsMap,
  linkedCounts: Map<string, number>,
): AgentTopicOption[] {
  return topics.map((topic) => ({
    id: topic.id,
    name: topic.name,
    goal: topic.goal,
    focusTags: topic.focus_tags ?? [],
    linkedDocumentCount: linkedCounts.get(topic.id) ?? 0,
    lastRunAt: topic.last_run_at,
    lastRunMode: topic.last_run_mode,
    isTracked: topic.is_tracked,
    isActive: topic.is_active,
    cadence: topic.cadence,
    workflowSettings: resolveTopicWorkflowSettings({
      maxDocsPerRun: topic.max_docs_per_run,
      minQualityResults: topic.min_quality_results,
      minRelevanceScore: topic.min_relevance_score,
      maxIterations: topic.max_iterations,
      maxQueries: topic.max_queries,
      metadata: topic.metadata,
      profiles,
    }),
  }));
}

function buildPipelineRegistryEntry(
  recentRuns: RunRow[],
  reportCount30d: number,
): AgentRegistryEntry {
  const completedRuns = recentRuns
    .filter((run) => run.ended_at)
    .slice(0, 30);
  const recent30Days = recentRuns.filter(
    (run) => Date.now() - Date.parse(run.started_at) <= 30 * 24 * 60 * 60 * 1000,
  );
  const latestRun = recentRuns[0] ?? null;
  const latestEndedRun = recentRuns.find((run) => Boolean(run.ended_at)) ?? null;
  const liveRun = recentRuns.find((run) => run.status === 'running') ?? null;
  const errorRuns30d = recent30Days.filter((run) => run.status === 'error' || run.status === 'partial').length;

  return {
    key: 'pipeline',
    name: 'Pipeline',
    description: 'Canonical orchestration across curation, scouting, distillation, and report synthesis.',
    badges: ['Canonical', 'Inline Execution'],
    state: liveRun ? 'live' : latestRun?.status === 'error' ? 'error' : 'idle',
    stateLabel: liveRun ? 'Running' : latestRun?.status === 'error' ? 'Attention' : 'Idle',
    liveRunId: liveRun?.id ?? null,
    lastStartedAt: latestRun?.started_at ?? null,
    lastEndedAt: latestEndedRun?.ended_at ?? null,
    averageDurationMs: averageDurationMs(
      completedRuns.map((run) => readDurationMs(run.started_at, run.ended_at ?? undefined)),
    ),
    successRate: computeSuccessRate(completedRuns.map((run) => run.status)),
    outputMetrics: [
      { label: 'Runs · 30d', value: formatCompactNumber(recent30Days.length) },
      { label: 'Reports · 30d', value: formatCompactNumber(reportCount30d) },
      { label: 'Errors · 30d', value: formatCompactNumber(errorRuns30d) },
    ],
    auxiliaryLabel: latestRun?.metadata ? readString(latestRun.metadata.runMode) : null,
  };
}

function buildStageRegistryEntry(
  agentKey: Exclude<AgentKey, 'pipeline'>,
  rows: StepRow[],
): AgentRegistryEntry {
  const latestRow = rows[0] ?? null;
  const latestEndedRow = rows.find((row) => Boolean(row.ended_at)) ?? null;
  const liveRow = rows.find((row) => row.status === 'running') ?? null;
  const completedRows = rows.filter((row) => row.status === 'ok' || row.status === 'error').slice(0, 30);
  const rows30d = rows.filter(
    (row) => Date.now() - Date.parse(row.started_at) <= 30 * 24 * 60 * 60 * 1000,
  );

  const base = {
    lastStartedAt: latestRow?.started_at ?? null,
    lastEndedAt: latestEndedRow?.ended_at ?? null,
    averageDurationMs: averageDurationMs(
      completedRows.map((row) => readDurationMs(row.started_at, row.ended_at ?? undefined)),
    ),
    successRate: computeSuccessRate(completedRows.map((row) => row.status)),
    liveRunId: liveRow?.run_id ?? null,
    state: liveRow ? 'live' : latestRow?.status === 'error' ? 'error' : 'idle',
    stateLabel: liveRow ? 'Running' : latestRow?.status === 'error' ? 'Attention' : 'Idle',
  } as const;

  if (agentKey === 'curator') {
    const docsCurated = rows30d.reduce(
      (sum, row) => sum + (readNumber(readObject(row.output)?.docsCurated) ?? 0),
      0,
    );
    const topicLinksCreated = rows30d.reduce(
      (sum, row) => sum + (readNumber(readObject(row.output)?.topicLinksCreated) ?? 0),
      0,
    );
    return {
      key: 'curator',
      name: 'Curator',
      description: 'Normalizes tags, enriches document context, and links documents back into topics.',
      badges: ['Tagging', 'Topic Linking'],
      ...base,
      outputMetrics: [
        { label: 'Docs curated · 30d', value: formatCompactNumber(docsCurated) },
        { label: 'Topic links · 30d', value: formatCompactNumber(topicLinksCreated) },
        { label: 'Success', value: formatPercent(base.successRate) },
      ],
      auxiliaryLabel: null,
    };
  }

  if (agentKey === 'webScout') {
    const proposals = rows30d.reduce((sum, row) => {
      const counts = readObject(readObject(row.output)?.counts);
      return sum + (readNumber(counts?.proposalsCreated) ?? 0);
    }, 0);
    const evaluated = rows30d.reduce((sum, row) => {
      const counts = readObject(readObject(row.output)?.counts);
      return sum + (readNumber(counts?.resultsEvaluated) ?? 0);
    }, 0);
    const latestTerminationReason = readString(readObject(latestEndedRow?.output)?.terminationReason);

    return {
      key: 'webScout',
      name: 'WebScout',
      description: 'Evaluates external sources, reasons about relevance, and proposes import-ready evidence.',
      badges: ['ReAct', 'Proposal Only'],
      ...base,
      outputMetrics: [
        { label: 'Proposals · 30d', value: formatCompactNumber(proposals) },
        { label: 'Evaluated · 30d', value: formatCompactNumber(evaluated) },
        { label: 'Success', value: formatPercent(base.successRate) },
      ],
      auxiliaryLabel: latestTerminationReason ? `Termination: ${latestTerminationReason}` : null,
    };
  }

  const docsProcessed = rows30d.reduce(
    (sum, row) => sum + (readNumber(readObject(row.output)?.docsProcessed) ?? 0),
    0,
  );
  const concepts = rows30d.reduce(
    (sum, row) => sum + (readNumber(readObject(row.output)?.conceptsProposed) ?? 0),
    0,
  );
  const flashcards = rows30d.reduce(
    (sum, row) => sum + (readNumber(readObject(row.output)?.flashcardsProposed) ?? 0),
    0,
  );

  return {
    key: 'distiller',
    name: 'Distiller',
    description: 'Turns source material into proposed concepts and flashcards with traceable evidence.',
    badges: ['Concepts', 'Flashcards'],
    ...base,
    outputMetrics: [
      { label: 'Docs processed · 30d', value: formatCompactNumber(docsProcessed) },
      { label: 'Concepts · 30d', value: formatCompactNumber(concepts) },
      { label: 'Flashcards · 30d', value: formatCompactNumber(flashcards) },
    ],
    auxiliaryLabel: null,
  };
}

async function buildSelectedRun(
  runId: string,
  recentRuns: RecentRunSummary[],
): Promise<SelectedRunDetail | null> {
  const trace = await getRunTrace(runId);
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

  const artifacts = await listArtifactsByRunId(runId);
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

export async function getAgentsView(options?: {
  selectedTopicId?: string | null;
  selectedRunId?: string | null;
}): Promise<AgentsView> {
  const [
    profiles,
    topics,
    linkedCounts,
    recentRunRows,
    pipelineHistoryRows,
    curateRows,
    webScoutRows,
    distillRows,
    reportRows,
  ] =
    await Promise.all([
      getAgentProfileSettingsMap(),
      listSavedTopics(),
      listTopicLinkedCounts(),
      listRecentRuns(12),
      listPipelineRuns(60),
      listStageRows('pipeline_curate'),
      listStageRows('pipeline_webscout'),
      listStageRows('pipeline_distill'),
      sql<Array<{ count: number }>>`
        SELECT COUNT(*)::integer AS count
        FROM artifacts
        WHERE kind = 'research-report'
          AND created_at >= now() - interval '30 days'
      `,
    ]);

  const topicOptions = buildTopicOptions(topics, profiles, linkedCounts);
  const topicById = new Map(topicOptions.map((topic) => [topic.id, topic]));

  const recentRunIds = recentRunRows.map((run) => run.id);
  const recentStepRows = await listStepsForRuns(recentRunIds);
  const stepsByRun = new Map<string, StepRow[]>();
  for (const row of recentStepRows) {
    const existing = stepsByRun.get(row.run_id) ?? [];
    existing.push(row);
    stepsByRun.set(row.run_id, existing);
  }

  const recentRuns = recentRunRows.map((run) =>
    buildRunSummary(run, stepsByRun.get(run.id) ?? [], topicById),
  );
  const selectedTopic =
    (options?.selectedTopicId ? topicById.get(options.selectedTopicId) ?? null : null) ??
    topicOptions[0] ??
    null;
  const selectedRunId =
    options?.selectedRunId ??
    recentRuns.find((run) => run.status === 'running')?.id ??
    recentRuns[0]?.id ??
    null;

  const selectedRun = selectedRunId ? await buildSelectedRun(selectedRunId, recentRuns) : null;

  return {
    globalProfiles: profiles,
    topicOptions,
    selectedTopic,
    agentRegistry: [
      buildPipelineRegistryEntry(pipelineHistoryRows, reportRows[0]?.count ?? 0),
      buildStageRegistryEntry('curator', curateRows),
      buildStageRegistryEntry('webScout', webScoutRows),
      buildStageRegistryEntry('distiller', distillRows),
    ],
    recentRuns,
    selectedRun,
    executionEvents: buildExecutionEvents(recentRuns),
  };
}

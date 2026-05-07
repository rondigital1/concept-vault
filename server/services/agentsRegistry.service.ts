import type { AgentKey } from '@/server/agents/configuration';
import type { AgentRegistryEntry } from '@/lib/agentsWorkspaceTypes';
import { readDurationMs } from '@/lib/agentRunPresentation';
import type { AgentRunRow, AgentStepRow } from '@/server/services/agentsReadModel.types';
import {
  averageDurationMs,
  computeSuccessRate,
  formatCompactNumber,
  formatPercent,
  readNumber,
  readObject,
  readString,
} from '@/server/services/agentsValueReaders';

export function buildPipelineRegistryEntry(
  recentRuns: AgentRunRow[],
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

export function buildStageRegistryEntry(
  agentKey: Exclude<AgentKey, 'pipeline'>,
  rows: AgentStepRow[],
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

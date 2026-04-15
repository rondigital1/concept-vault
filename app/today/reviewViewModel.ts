'use client';

import type { Artifact, Run, RunMode, TopicWorkflowSummary, WorkbenchTopic } from './types';
import { formatObservedAgentLabel } from '@/lib/agentRunPresentation';
import { formatRunLabel, formatTitleCase, readString } from './utils';

export type ActivityEntry = {
  id: string;
  agentName: string;
  summary: string;
  timestamp: string;
  status: 'running' | 'ok' | 'error' | 'partial';
};

function sortByNewest<T extends { createdAt?: string; startedAt?: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const left = Date.parse(b.createdAt ?? b.startedAt ?? '');
    const right = Date.parse(a.createdAt ?? a.startedAt ?? '');
    return left - right;
  });
}

export function summarizeArtifact(item: Artifact): string {
  const summary = readString(item.content?.summary);
  if (summary) {
    return summary;
  }

  const preview = readString(item.preview);
  if (preview) {
    return preview;
  }

  const reasoning = Array.isArray(item.content?.reasoning)
    ? item.content.reasoning.find(
        (entry): entry is string => typeof entry === 'string' && entry.trim().length > 0,
      )
    : null;

  return reasoning ?? 'No summary available yet.';
}

export function getTopicIdFromArtifact(item: Artifact): string | null {
  return readString(item.sourceRefs?.topicId) ?? readString(item.content?.topicId);
}

export function deriveTopicWorkflowSummary(
  selectedTopic: WorkbenchTopic | null,
  runs: Run[],
  pendingCount: number,
): TopicWorkflowSummary {
  if (!selectedTopic) {
    return {
      stageLabel: 'Choose a topic',
      stageTone: 'default',
      stageDescription: 'Select a topic to see its review queue and next workflow action.',
      modeLabel: 'Topic workspace',
      modeDescription: 'The available actions follow the topic you have selected.',
      primaryAction: null,
      liveRunId: null,
      liveRunLabel: null,
    };
  }

  const matchingRuns = sortByNewest(runs.filter((run) => run.metadata?.topicId === selectedTopic.id));
  const liveRun = matchingRuns.find((run) => run.status === 'running') ?? null;
  const liveRunMode = liveRun?.metadata?.runMode ? formatRunLabel(liveRun.metadata.runMode) : 'Pipeline run';

  if (liveRun) {
    return {
      stageLabel: 'Live run',
      stageTone: 'live',
      stageDescription: `${liveRunMode} is running for this topic right now.`,
      modeLabel: liveRunMode,
      modeDescription: 'Current workflow mode',
      primaryAction: 'run_details',
      liveRunId: liveRun.id,
      liveRunLabel: liveRunMode,
    };
  }

  if (selectedTopic.isReady) {
    return {
      stageLabel: 'Ready for report',
      stageTone: 'ready',
      stageDescription: 'This topic has enough linked evidence to generate the next report.',
      modeLabel: 'Generate report',
      modeDescription: selectedTopic.lastRunMode
        ? `Last completed run: ${formatRunLabel(selectedTopic.lastRunMode)}`
        : 'Recommended workflow mode',
      primaryAction: 'generate_report',
      liveRunId: null,
      liveRunLabel: null,
    };
  }

  return {
    stageLabel: 'Needs more evidence',
    stageTone: 'pending',
    stageDescription:
      pendingCount > 0
        ? 'Review what is already queued here, then add more strong sources if needed.'
        : 'Find and save more strong evidence before generating a report.',
    modeLabel: 'Find sources',
    modeDescription: selectedTopic.lastRunMode
      ? `Last completed run: ${formatRunLabel(selectedTopic.lastRunMode)}`
      : 'Recommended workflow mode',
    primaryAction: 'find_sources',
    liveRunId: null,
    liveRunLabel: null,
  };
}

export function getTopicDetailRunMode(selectedTopic: WorkbenchTopic | null, runs: Run[]): RunMode {
  if (!selectedTopic) {
    return 'scout_only';
  }

  const matchingRuns = sortByNewest(runs.filter((run) => run.metadata?.topicId === selectedTopic.id));
  const candidate = matchingRuns.find((run) => run.status === 'running') ?? matchingRuns[0] ?? null;
  const runMode = candidate?.metadata?.runMode ?? selectedTopic.lastRunMode;

  if (
    runMode === 'full_report' ||
    runMode === 'incremental_update' ||
    runMode === 'scout_only' ||
    runMode === 'concept_only'
  ) {
    return runMode;
  }

  return 'scout_only';
}

const MODE_SUMMARIES: Record<string, string> = {
  scout_only: 'Searched for sources',
  full_report: 'Generated full report',
  incremental_update: 'Refreshed topic evidence',
  concept_only: 'Extracted concepts',
};

function buildSummary(kind: string, runMode: string | null | undefined, topicSuffix: string): string {
  if (kind === 'webScout') return `Searched for sources${topicSuffix}`;
  if (kind === 'curate') return `Curated evidence${topicSuffix}`;
  if (kind === 'distill') return `Distilled findings${topicSuffix}`;
  if (kind === 'research') return `Researched topic${topicSuffix}`;
  return `${MODE_SUMMARIES[runMode ?? ''] ?? 'Ran pipeline'}${topicSuffix}`;
}

export function deriveActivityFeed(runs: Run[], topicById: Map<string, string>): ActivityEntry[] {
  const entries: ActivityEntry[] = runs.map((run) => {
    const topicName = run.metadata?.topicId ? topicById.get(run.metadata.topicId) : undefined;
    const topicSuffix = topicName ? ` for '${topicName}'` : '';
    return {
      id: run.id,
      agentName: formatObservedAgentLabel(run.kind) ?? formatTitleCase(run.kind),
      summary: buildSummary(run.kind, run.metadata?.runMode, topicSuffix),
      timestamp: run.startedAt,
      status: run.status,
    };
  });

  const running = entries.filter((e) => e.status === 'running');
  const rest = entries
    .filter((e) => e.status !== 'running')
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));

  return [...running, ...rest].slice(0, 20);
}

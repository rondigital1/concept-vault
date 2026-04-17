import type {
  PipelineCounts,
  PipelineError,
  PipelineInput,
  PipelineResult,
} from '@/server/flows/pipeline.flow';
import { pipelineFlow } from '@/server/flows/pipeline.flow';
import {
  listTopicsNeedingSources,
  MIN_LINKED_DOCUMENTS_FOR_REPORT,
  setupTopicContext,
} from '@/server/services/topicWorkflow.service';

export type FindSourcesScope = 'topic' | 'all_topics';

export interface FindSourcesInput {
  workspaceId: string;
  day?: string;
  topicId?: string;
  goal?: string;
  minQualityResults?: number;
  minRelevanceScore?: number;
  maxIterations?: number;
  maxQueries?: number;
  scope?: FindSourcesScope;
  maxTopics?: number;
}

export interface FindSourcesBatchCounts {
  topicsEligible: number;
  topicsProcessed: number;
  topicsSucceeded: number;
  topicsFailed: number;
  webProposals: number;
}

export interface FindSourcesBatchRunResult {
  topicId: string;
  topicName: string;
  runId: string | null;
  status: PipelineResult['status'];
  counts: PipelineCounts;
  errors: PipelineError[];
}

export interface FindSourcesBatchResult {
  mode: 'batch';
  scope: 'all_topics';
  day: string;
  counts: FindSourcesBatchCounts;
  runs: FindSourcesBatchRunResult[];
}

export type FindSourcesResult = PipelineResult | FindSourcesBatchResult;

function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

function clampMaxTopics(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 10;
  }

  return Math.max(1, Math.min(20, Math.floor(value)));
}

function buildPipelineInput(
  input: FindSourcesInput,
  overrides?: Partial<PipelineInput>,
): PipelineInput {
  const pipelineInput: PipelineInput = {
    workspaceId: input.workspaceId,
    trigger: 'manual',
    runMode: 'scout_only',
    enableCategorization: true,
    ...overrides,
  };

  if (typeof input.day === 'string' && input.day.trim()) {
    pipelineInput.day = input.day.trim();
  }
  if (typeof input.topicId === 'string' && input.topicId.trim()) {
    pipelineInput.topicId = input.topicId.trim();
  }
  if (typeof input.goal === 'string' && input.goal.trim()) {
    pipelineInput.goal = input.goal.trim();
  }
  if (typeof input.minQualityResults === 'number') {
    pipelineInput.minQualityResults = input.minQualityResults;
  }
  if (typeof input.minRelevanceScore === 'number') {
    pipelineInput.minRelevanceScore = input.minRelevanceScore;
  }
  if (typeof input.maxIterations === 'number') {
    pipelineInput.maxIterations = input.maxIterations;
  }
  if (typeof input.maxQueries === 'number') {
    pipelineInput.maxQueries = input.maxQueries;
  }

  return pipelineInput;
}

function defaultPipelineCounts(): PipelineCounts {
  return {
    docsTargeted: 0,
    docsCurated: 0,
    docsCurateFailed: 0,
    webProposals: 0,
    analyzedEvidence: 0,
    docsProcessed: 0,
    conceptsProposed: 0,
    flashcardsProposed: 0,
    topicLinksCreated: 0,
  };
}

export async function findSources(input: FindSourcesInput): Promise<FindSourcesResult> {
  const scope = { workspaceId: input.workspaceId };

  if (typeof input.topicId === 'string' && input.topicId.trim()) {
    await setupTopicContext(scope, input.topicId.trim());
    return pipelineFlow(buildPipelineInput(input));
  }

  if (input.scope !== 'all_topics') {
    return pipelineFlow(buildPipelineInput(input));
  }

  const day =
    typeof input.day === 'string' && input.day.trim() ? input.day.trim() : todayISODate();
  const maxTopics = clampMaxTopics(input.maxTopics);
  const eligibleTopics = await listTopicsNeedingSources(scope, MIN_LINKED_DOCUMENTS_FOR_REPORT);
  const selectedTopics = eligibleTopics.slice(0, maxTopics);

  const runs: FindSourcesBatchRunResult[] = [];
  let topicsSucceeded = 0;
  let topicsFailed = 0;
  let webProposals = 0;

  for (const entry of selectedTopics) {
    let setupError: PipelineError | null = null;

    try {
      await setupTopicContext(scope, entry.topic.id);
    } catch (error) {
      setupError = {
        stage: 'topic_setup',
        message: error instanceof Error ? error.message : String(error),
      };
    }

    try {
      const result = await pipelineFlow(
        buildPipelineInput(
          {
            ...input,
            day,
            topicId: entry.topic.id,
            goal: undefined,
          },
          {
            day,
            topicId: entry.topic.id,
          },
        ),
      );

      const errors = setupError ? [setupError, ...result.errors] : result.errors;
      const status = setupError && result.status === 'ok' ? 'partial' : result.status;

      runs.push({
        topicId: entry.topic.id,
        topicName: entry.topic.name,
        runId: result.runId,
        status,
        counts: result.counts,
        errors,
      });

      webProposals += result.counts.webProposals;
      if (status === 'ok') {
        topicsSucceeded += 1;
      } else {
        topicsFailed += 1;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      runs.push({
        topicId: entry.topic.id,
        topicName: entry.topic.name,
        runId: null,
        status: 'error',
        counts: defaultPipelineCounts(),
        errors: [
          ...(setupError ? [setupError] : []),
          { stage: 'webscout', message },
        ],
      });
      topicsFailed += 1;
    }
  }

  return {
    mode: 'batch',
    scope: 'all_topics',
    day,
    counts: {
      topicsEligible: eligibleTopics.length,
      topicsProcessed: selectedTopics.length,
      topicsSucceeded,
      topicsFailed,
      webProposals,
    },
    runs,
  };
}

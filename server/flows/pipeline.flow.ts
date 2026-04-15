import { sql } from '@/db';
import { curatorGraph } from '@/server/agents/curator.graph';
import { distillerGraph } from '@/server/agents/distiller.graph';
import { webScoutGraph } from '@/server/agents/webScout.graph';
import { getTopTags } from '@/server/services/today.service';
import { analyzeFindings, AnalyzeFindingsOutput } from '@/server/services/analyzeFindings.service';
import { synthesizeReport } from '@/server/services/report.service';
import { publishReportToNotion } from '@/server/services/notionPublish.service';
import { insertReport } from '@/server/repos/report.repo';
import { insertArtifact } from '@/server/repos/artifacts.repo';
import {
  getSavedTopicsByIds,
  getTopicDocuments,
  getTopicLinkedDocuments,
  linkDocumentToMatchingTopics,
  markTopicRunCompleted,
  SavedTopicRow,
} from '@/server/repos/savedTopics.repo';
import { setupTopicContext } from '@/server/services/topicWorkflow.service';
import { getDocumentsByIds, getRecentDocuments } from '@/server/repos/distiller.repo';
import { appendStep, createRun, finishRun } from '@/server/observability/runTrace.store';
import { RunStatus, RunStep } from '@/server/observability/runTrace.types';
import { getAgentProfileSettingsMap } from '@/server/repos/agentProfiles.repo';
import {
  resolveTopicWorkflowSettings,
  type AgentProfileSettingsMap,
  type TopicWorkflowSettings,
} from '@/server/agents/configuration';

export type PipelineStage =
  | 'resolve_targets'
  | 'topic_setup'
  | 'curate'
  | 'webscout'
  | 'analyze_findings'
  | 'distill'
  | 'synthesize'
  | 'persist_publish';

export type PipelineRunMode =
  | 'full_report'
  | 'incremental_update'
  | 'concept_only'
  | 'scout_only'
  | 'lightweight_enrichment'
  | 'topic_setup'
  | 'skip';

export type PipelineTrigger = 'manual' | 'auto_document' | 'auto_topic' | 'scheduler' | 'cron';

export interface PipelineInput {
  day?: string;
  topicId?: string;
  documentIds?: string[];
  limit?: number;
  goal?: string;
  enableCategorization?: boolean;
  minQualityResults?: number;
  minRelevanceScore?: number;
  maxIterations?: number;
  maxQueries?: number;
  runMode?: PipelineRunMode;
  trigger?: PipelineTrigger;
  idempotencyKey?: string;
  enableAutoDistill?: boolean;
  skipPublish?: boolean;
}

export interface PipelineCounts {
  docsTargeted: number;
  docsCurated: number;
  docsCurateFailed: number;
  webProposals: number;
  analyzedEvidence: number;
  docsProcessed: number;
  conceptsProposed: number;
  flashcardsProposed: number;
  topicLinksCreated: number;
}

export interface PipelineError {
  stage: PipelineStage;
  message: string;
  documentId?: string;
}

export interface PipelineResult {
  runId: string;
  status: RunStatus;
  mode: PipelineRunMode;
  trigger: PipelineTrigger;
  counts: PipelineCounts;
  artifacts: {
    webProposalIds: string[];
    analysisArtifactIds: string[];
    conceptIds: string[];
    flashcardIds: string[];
  };
  reportId: string | null;
  notionPageId: string | null;
  errors: PipelineError[];
}

interface ResolvedTargets {
  day: string;
  documentIds: string[];
  focusTags: string[];
  goal: string;
  goalSource:
    | 'input'
    | 'topic'
    | 'document_tags'
    | 'vault_top_tags'
    | 'document_titles'
    | 'default';
  topic: SavedTopicRow | null;
  mode: 'explicit-query' | 'derive-from-vault';
  minQualityResults: number;
  minRelevanceScore: number;
  maxIterations: number;
  maxQueries: number;
  limit: number;
  workflowSettings: TopicWorkflowSettings;
}

interface ExistingRunRow {
  id: string;
  status: RunStatus;
  metadata: Record<string, unknown>;
}

function todayISODate(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

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

function normalizeTag(tag: string): string | null {
  const clean = tag.toLowerCase().trim().replace(/\s+/g, ' ');
  if (!clean) return null;
  if (clean.length < 2 || clean.length > 40) return null;
  return clean;
}

function uniqueTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const tag of tags) {
    const clean = normalizeTag(tag);
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    normalized.push(clean);
  }
  return normalized;
}

function defaultCounts(): PipelineCounts {
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

function defaultArtifacts() {
  return {
    webProposalIds: [] as string[],
    analysisArtifactIds: [] as string[],
    conceptIds: [] as string[],
    flashcardIds: [] as string[],
  };
}

function shouldRunCurate(mode: PipelineRunMode): boolean {
  return mode !== 'topic_setup' && mode !== 'skip';
}

function shouldRunWebScout(mode: PipelineRunMode): boolean {
  return mode === 'full_report' || mode === 'incremental_update' || mode === 'scout_only';
}

function shouldRunDistill(mode: PipelineRunMode, enableAutoDistill: boolean): boolean {
  if (mode === 'full_report' || mode === 'incremental_update' || mode === 'concept_only') {
    return true;
  }
  if (mode === 'lightweight_enrichment') {
    return enableAutoDistill;
  }
  return false;
}

function shouldSynthesize(mode: PipelineRunMode): boolean {
  return mode === 'full_report' || mode === 'incremental_update';
}

function resolveRequestedMode(
  input: PipelineInput,
  profiles: AgentProfileSettingsMap,
  topicWorkflowSettings?: TopicWorkflowSettings | null,
): PipelineRunMode {
  if (input.runMode) {
    return input.runMode;
  }

  if (input.trigger === 'auto_document') {
    return 'lightweight_enrichment';
  }
  if (input.trigger === 'auto_topic') {
    return 'topic_setup';
  }

  return topicWorkflowSettings?.defaultRunMode ?? profiles.pipeline.defaultRunMode;
}

async function appendFlowStep(runId: string, step: Omit<RunStep, 'timestamp' | 'type'>) {
  await appendStep(runId, {
    timestamp: new Date().toISOString(),
    type: 'flow',
    ...step,
  });
}

async function resolveTargets(
  input: PipelineInput,
  profiles: AgentProfileSettingsMap,
  providedTopic: SavedTopicRow | null = null,
): Promise<ResolvedTargets> {
  const day = typeof input.day === 'string' && input.day.trim() ? input.day.trim() : todayISODate();
  const explicitDocumentIds = Array.isArray(input.documentIds)
    ? input.documentIds.filter((id): id is string => typeof id === 'string').slice(0, 100)
    : [];

  let topic: SavedTopicRow | null = providedTopic;
  if (!topic && typeof input.topicId === 'string' && input.topicId.trim()) {
    const topics = await getSavedTopicsByIds([input.topicId.trim()]);
    topic = topics[0] ?? null;
    if (!topic) {
      throw new Error(`Topic ${input.topicId.trim()} not found`);
    }
  }

  const workflowSettings = resolveTopicWorkflowSettings({
    maxDocsPerRun: topic?.max_docs_per_run ?? profiles.distiller.maxDocsPerRun,
    minQualityResults: topic?.min_quality_results ?? profiles.webScout.minQualityResults,
    minRelevanceScore: topic?.min_relevance_score ?? profiles.webScout.minRelevanceScore,
    maxIterations: topic?.max_iterations ?? profiles.webScout.maxIterations,
    maxQueries: topic?.max_queries ?? profiles.webScout.maxQueries,
    metadata: topic?.metadata ?? null,
    profiles,
  });
  const limit = clampInt(input.limit ?? workflowSettings.maxDocsPerRun, workflowSettings.maxDocsPerRun, 1, 20);

  let targetDocumentIds: string[] = [];
  let seedTags: string[] = topic?.focus_tags ?? [];
  let seedTitles: string[] = [];

  if (explicitDocumentIds.length > 0) {
    const docs = await getDocumentsByIds(explicitDocumentIds, limit);
    targetDocumentIds = docs.map((doc) => doc.id);
    seedTags = [...seedTags, ...docs.flatMap((doc) => doc.tags ?? [])];
    seedTitles = docs.map((doc) => doc.title);
  } else if (topic) {
    const linkedDocs = await getTopicLinkedDocuments(topic.id, limit);
    if (linkedDocs.length > 0) {
      targetDocumentIds = linkedDocs.map((doc) => doc.id);
      seedTags = [...seedTags, ...linkedDocs.flatMap((doc) => doc.tags ?? [])];
      seedTitles = linkedDocs.map((doc) => doc.title);
    } else {
      const docs = await getTopicDocuments(topic.focus_tags ?? [], limit);
      targetDocumentIds = docs.map((doc) => doc.id);
      seedTags = [...seedTags, ...docs.flatMap((doc) => doc.tags ?? [])];
      seedTitles = docs.map((doc) => doc.title);
    }
  } else {
    const docs = await getRecentDocuments(limit);
    targetDocumentIds = docs.map((doc) => doc.id);
    seedTags = [...seedTags, ...docs.flatMap((doc) => doc.tags ?? [])];
    seedTitles = docs.map((doc) => doc.title);
  }

  let goal = typeof input.goal === 'string' ? input.goal.trim().slice(0, 500) : '';
  let goalSource: ResolvedTargets['goalSource'] = 'default';
  if (goal) {
    goalSource = 'input';
  }

  if (!goal && topic?.goal) {
    goal = topic.goal.trim().slice(0, 500);
    goalSource = goal ? 'topic' : goalSource;
  }

  const focusTags = uniqueTags(seedTags).slice(0, 20);
  if (!goal && focusTags.length > 0) {
    goal = `Find high-quality learning resources about: ${focusTags.slice(0, 5).join(', ')}`;
    goalSource = 'document_tags';
  }

  if (!goal) {
    const topTags = await getTopTags(5);
    if (topTags.length > 0) {
      const derived = topTags.map((item) => item.tag);
      goal = `Find high-quality learning resources about: ${derived.join(', ')}`;
      seedTags = [...seedTags, ...derived];
      goalSource = 'vault_top_tags';
    }
  }

  if (!goal && seedTitles.length > 0) {
    const titleSubjects = seedTitles
      .map((title) => title.trim())
      .filter(Boolean)
      .slice(0, 3);
    if (titleSubjects.length > 0) {
      goal = `Find high-quality learning resources related to these documents: ${titleSubjects.join('; ')}`;
      goalSource = 'document_titles';
    }
  }

  if (!goal) {
    goal = 'Find high-quality learning resources that complement my vault and support practical learning.';
    goalSource = 'default';
  }

  const minQualityResults = clampInt(
    input.minQualityResults ?? workflowSettings.minQualityResults,
    workflowSettings.minQualityResults,
    1,
    10,
  );
  const minRelevanceScore = clampScore(
    input.minRelevanceScore ?? workflowSettings.minRelevanceScore,
    workflowSettings.minRelevanceScore,
  );
  const maxIterations = clampInt(
    input.maxIterations ?? workflowSettings.maxIterations,
    workflowSettings.maxIterations,
    1,
    10,
  );
  const maxQueries = clampInt(
    input.maxQueries ?? workflowSettings.maxQueries,
    workflowSettings.maxQueries,
    1,
    25,
  );

  return {
    day,
    documentIds: targetDocumentIds,
    focusTags: uniqueTags(seedTags).slice(0, 20),
    goal,
    goalSource,
    topic,
    mode: input.goal ? 'explicit-query' : 'derive-from-vault',
    minQualityResults,
    minRelevanceScore,
    maxIterations,
    maxQueries,
    limit,
    workflowSettings,
  };
}

async function splitDistillerArtifactIds(artifactIds: string[]): Promise<{
  conceptIds: string[];
  flashcardIds: string[];
}> {
  if (artifactIds.length === 0) {
    return { conceptIds: [], flashcardIds: [] };
  }

  const rows = await sql<Array<{ id: string; kind: string }>>`
    SELECT id, kind
    FROM artifacts
    WHERE id = ANY(${artifactIds})
  `;

  return {
    conceptIds: rows.filter((row) => row.kind === 'concept').map((row) => row.id),
    flashcardIds: rows.filter((row) => row.kind === 'flashcard').map((row) => row.id),
  };
}

async function findExistingRunByIdempotencyKey(idempotencyKey: string): Promise<ExistingRunRow | null> {
  const rows = await sql<Array<ExistingRunRow>>`
    SELECT id, status, metadata
    FROM runs
    WHERE kind = 'pipeline'
      AND metadata->>'idempotencyKey' = ${idempotencyKey}
    ORDER BY started_at DESC
    LIMIT 1
  `;

  return rows[0] ?? null;
}

async function hydratePipelineResultFromRun(runId: string): Promise<PipelineResult | null> {
  const rows = await sql<Array<{ output: Record<string, unknown> | null }>>`
    SELECT output
    FROM run_steps
    WHERE run_id = ${runId}
      AND step_name = 'pipeline'
      AND status = 'ok'
      AND output IS NOT NULL
    ORDER BY started_at DESC
    LIMIT 1
  `;

  const output = rows[0]?.output;
  if (!output || typeof output !== 'object') {
    return null;
  }

  const mode =
    typeof output.mode === 'string'
      ? (output.mode as PipelineRunMode)
      : ('full_report' as PipelineRunMode);
  const trigger =
    typeof output.trigger === 'string'
      ? (output.trigger as PipelineTrigger)
      : ('manual' as PipelineTrigger);

  return {
    runId,
    status: (output.status as RunStatus) ?? 'partial',
    mode,
    trigger,
    counts: (output.counts as PipelineCounts) ?? defaultCounts(),
    artifacts: (output.artifacts as PipelineResult['artifacts']) ?? defaultArtifacts(),
    reportId: typeof output.reportId === 'string' ? output.reportId : null,
    notionPageId: typeof output.notionPageId === 'string' ? output.notionPageId : null,
    errors: Array.isArray(output.errors) ? (output.errors as PipelineError[]) : [],
  };
}

function finalizeStatus(
  mode: PipelineRunMode,
  errors: PipelineError[],
  analyzed: AnalyzeFindingsOutput | null,
  reportId: string | null,
): RunStatus {
  if (errors.length > 0) {
    return 'partial';
  }

  if (mode === 'skip' || mode === 'topic_setup' || mode === 'concept_only' || mode === 'lightweight_enrichment') {
    return 'ok';
  }

  if ((mode === 'full_report' || mode === 'incremental_update') && !reportId) {
    return 'partial';
  }

  if ((mode === 'full_report' || mode === 'incremental_update' || mode === 'scout_only') && !analyzed) {
    return 'partial';
  }

  return 'ok';
}

export async function pipelineFlow(input: PipelineInput = {}): Promise<PipelineResult> {
  const trigger = input.trigger ?? 'manual';
  const profiles = await getAgentProfileSettingsMap();
  const preselectedTopic =
    typeof input.topicId === 'string' && input.topicId.trim()
      ? (await getSavedTopicsByIds([input.topicId.trim()]))[0] ?? null
      : null;
  const preselectedTopicWorkflowSettings = preselectedTopic
    ? resolveTopicWorkflowSettings({
        maxDocsPerRun: preselectedTopic.max_docs_per_run,
        minQualityResults: preselectedTopic.min_quality_results,
        minRelevanceScore: preselectedTopic.min_relevance_score,
        maxIterations: preselectedTopic.max_iterations,
        maxQueries: preselectedTopic.max_queries,
        metadata: preselectedTopic.metadata,
        profiles,
      })
    : null;
  const mode = resolveRequestedMode(input, profiles, preselectedTopicWorkflowSettings);
  const idempotencyKey =
    typeof input.idempotencyKey === 'string' && input.idempotencyKey.trim()
      ? input.idempotencyKey.trim()
      : null;

  if (idempotencyKey) {
    const existing = await findExistingRunByIdempotencyKey(idempotencyKey);
    if (existing && existing.status !== 'error') {
      const hydrated = await hydratePipelineResultFromRun(existing.id);
      if (hydrated) {
        return hydrated;
      }

      if (existing.status === 'running') {
        return {
          runId: existing.id,
          status: 'running',
          mode,
          trigger,
          counts: defaultCounts(),
          artifacts: defaultArtifacts(),
          reportId: null,
          notionPageId: null,
          errors: [],
        };
      }
    }
  }

  const runId = await createRun('pipeline', {
    runMode: mode,
    trigger,
    topicId: input.topicId ?? null,
    idempotencyKey,
  });

  const errors: PipelineError[] = [];
  const counts = defaultCounts();
  const artifacts = defaultArtifacts();

  let reportId: string | null = null;
  let notionPageId: string | null = null;

  try {
    await appendFlowStep(runId, {
      name: 'pipeline',
      status: 'running',
      input: {
        ...input,
        runMode: mode,
        trigger,
      },
    });

    await appendFlowStep(runId, {
      name: 'pipeline_resolve_targets',
      status: 'running',
      input: {
        day: input.day,
        topicId: input.topicId,
        documentIds: input.documentIds,
        goal: input.goal,
        runMode: mode,
      },
    });

    const resolved = await resolveTargets(input, profiles, preselectedTopic);
    counts.docsTargeted = resolved.documentIds.length;
    const enableCategorization =
      input.enableCategorization ?? resolved.workflowSettings.enableCategorizationByDefault;
    const skipPublish = input.skipPublish ?? resolved.workflowSettings.skipPublishByDefault;

    await appendFlowStep(runId, {
      name: 'pipeline_resolve_targets',
      status: 'ok',
      output: {
        day: resolved.day,
        topicId: resolved.topic?.id ?? null,
        goal: resolved.goal,
        goalSource: resolved.goalSource,
        focusTags: resolved.focusTags,
        documentIds: resolved.documentIds,
        limit: resolved.limit,
        workflowSettings: resolved.workflowSettings,
      },
    });

    if (mode === 'skip') {
      if (resolved.topic) {
        await markTopicRunCompleted(resolved.topic.id, mode);
      }

      const result: PipelineResult = {
        runId,
        status: 'ok',
        mode,
        trigger,
        counts,
        artifacts,
        reportId,
        notionPageId,
        errors,
      };

      await appendFlowStep(runId, {
        name: 'pipeline',
        status: 'ok',
        output: result,
      });
      await finishRun(runId, 'ok');
      return result;
    }

    if (mode === 'topic_setup') {
      await appendFlowStep(runId, {
        name: 'pipeline_topic_setup',
        status: 'running',
        input: { topicId: resolved.topic?.id ?? null },
      });

      if (!resolved.topic) {
        errors.push({
          stage: 'topic_setup',
          message: 'topicId is required for topic_setup mode',
        });
      } else {
        try {
          const setupResult = await setupTopicContext(resolved.topic.id);
          counts.topicLinksCreated = setupResult.linkedCount;
          await appendFlowStep(runId, {
            name: 'pipeline_topic_setup',
            status: 'ok',
            output: setupResult,
          });
        } catch (error) {
          errors.push({
            stage: 'topic_setup',
            message: error instanceof Error ? error.message : String(error),
          });
          await appendFlowStep(runId, {
            name: 'pipeline_topic_setup',
            status: 'error',
            error: {
              message: error instanceof Error ? error.message : String(error),
            },
          });
        }
      }

      const status: RunStatus = errors.length > 0 ? 'partial' : 'ok';
      const result: PipelineResult = {
        runId,
        status,
        mode,
        trigger,
        counts,
        artifacts,
        reportId,
        notionPageId,
        errors,
      };

      await appendFlowStep(runId, {
        name: 'pipeline',
        status: 'ok',
        output: result,
      });
      await finishRun(runId, status);
      return result;
    }

    const curateTags: string[] = [...resolved.focusTags];
    if (shouldRunCurate(mode) && resolved.documentIds.length > 0) {
      await appendFlowStep(runId, {
        name: 'pipeline_curate',
        status: 'running',
        input: {
          documentIds: resolved.documentIds,
          enableCategorization,
        },
      });

      const topicLinkSet = new Set<string>();

      for (const documentId of resolved.documentIds) {
        try {
          const curateResult = await curatorGraph(
            {
              documentId,
              enableCategorization,
            },
            async (agentStep) => {
              await appendStep(runId, agentStep);
            },
          );

          counts.docsCurated += 1;
          curateTags.push(...curateResult.tags);

          const linkedTopics = await linkDocumentToMatchingTopics(documentId, curateResult.tags);
          for (const topicId of linkedTopics.topicIds) {
            topicLinkSet.add(topicId);
          }
        } catch (error) {
          counts.docsCurateFailed += 1;
          errors.push({
            stage: 'curate',
            documentId,
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }

      counts.topicLinksCreated += topicLinkSet.size;

      await appendFlowStep(runId, {
        name: 'pipeline_curate',
        status: counts.docsCurateFailed > 0 ? 'error' : 'ok',
        output: {
          docsCurated: counts.docsCurated,
          docsCurateFailed: counts.docsCurateFailed,
          topicLinksCreated: counts.topicLinksCreated,
        },
      });
    } else {
      await appendFlowStep(runId, {
        name: 'pipeline_curate',
        status: 'skipped',
        output: { reason: resolved.documentIds.length === 0 ? 'No target documents resolved' : 'Mode does not include curate' },
      });
    }

    const webScoutFocusTags = uniqueTags(curateTags).slice(0, 20);

    let webScoutResult: Awaited<ReturnType<typeof webScoutGraph>> | null = null;
    let analyzedFindings: AnalyzeFindingsOutput | null = null;

    if (shouldRunWebScout(mode)) {
      await appendFlowStep(runId, {
        name: 'pipeline_webscout',
        status: 'running',
        input: {
          goal: resolved.goal,
          focusTags: webScoutFocusTags,
          mode: resolved.mode,
        },
      });

      try {
        webScoutResult = await webScoutGraph(
          {
            goal: resolved.goal,
            mode: resolved.mode,
            day: resolved.day,
            focusTags: webScoutFocusTags.length > 0 ? webScoutFocusTags : undefined,
            minQualityResults: resolved.minQualityResults,
            minRelevanceScore: resolved.minRelevanceScore,
            maxIterations: resolved.maxIterations,
            maxQueries: resolved.maxQueries,
            restrictToWatchlistDomains: false,
          },
          async (agentStep) => {
            await appendStep(runId, agentStep);
          },
          runId,
        );

        counts.webProposals = webScoutResult.counts.proposalsCreated;
        artifacts.webProposalIds = webScoutResult.artifactIds;

        await appendFlowStep(runId, {
          name: 'pipeline_webscout',
          status: 'ok',
          output: {
            counts: webScoutResult.counts,
            terminationReason: webScoutResult.terminationReason,
          },
        });
      } catch (error) {
        errors.push({
          stage: 'webscout',
          message: error instanceof Error ? error.message : String(error),
        });
        await appendFlowStep(runId, {
          name: 'pipeline_webscout',
          status: 'error',
          error: {
            message: error instanceof Error ? error.message : String(error),
          },
        });
      }

      if (webScoutResult && webScoutResult.proposals.length > 0) {
        await appendFlowStep(runId, {
          name: 'pipeline_analyze_findings',
          status: 'running',
          input: {
            proposals: webScoutResult.proposals.length,
          },
        });

        analyzedFindings = analyzeFindings(webScoutResult.proposals);
        counts.analyzedEvidence = analyzedFindings.summary.uniqueEvidence;

        await appendFlowStep(runId, {
          name: 'pipeline_analyze_findings',
          status: 'ok',
          output: analyzedFindings.summary,
        });

        try {
          const analysisArtifactId = await insertArtifact({
            runId,
            agent: 'research',
            kind: 'web-analysis',
            day: resolved.day,
            title: `Analyzed findings: ${resolved.goal.slice(0, 120)}`,
            content: {
              summary: analyzedFindings.summary,
              clusters: analyzedFindings.clusters,
              evidence: analyzedFindings.evidence.slice(0, 20),
            },
            sourceRefs: {
              topicId: resolved.topic?.id ?? null,
              goal: resolved.goal,
              runMode: mode,
              webProposalArtifactIds: artifacts.webProposalIds,
            },
          });
          artifacts.analysisArtifactIds.push(analysisArtifactId);
        } catch (analysisError) {
          errors.push({
            stage: 'analyze_findings',
            message:
              analysisError instanceof Error ? analysisError.message : String(analysisError),
          });
        }
      } else {
        const noProposalReason = webScoutResult
          ? `WebScout produced no proposals meeting relevance >= ${resolved.minRelevanceScore} (termination: ${webScoutResult.terminationReason ?? 'unknown'})`
          : 'No WebScout proposals available for analysis';
        if (webScoutResult) {
          errors.push({
            stage: 'webscout',
            message: noProposalReason,
          });
        }
        await appendFlowStep(runId, {
          name: 'pipeline_analyze_findings',
          status: 'skipped',
          output: { reason: noProposalReason },
        });
      }
    } else {
      await appendFlowStep(runId, {
        name: 'pipeline_webscout',
        status: 'skipped',
        output: { reason: 'Mode does not include web scouting' },
      });

      await appendFlowStep(runId, {
        name: 'pipeline_analyze_findings',
        status: 'skipped',
        output: { reason: 'Mode does not include web scouting' },
      });
    }

    if (shouldRunDistill(mode, input.enableAutoDistill === true) && resolved.documentIds.length > 0) {
      await appendFlowStep(runId, {
        name: 'pipeline_distill',
        status: 'running',
        input: {
          day: resolved.day,
          documentIds: resolved.documentIds,
          limit: resolved.limit,
        },
      });

      try {
        const distillResult = await distillerGraph(
          {
            day: resolved.day,
            documentIds: resolved.documentIds,
            limit: resolved.limit,
          },
          async (agentStep) => {
            await appendStep(runId, agentStep);
          },
          runId,
        );

        counts.docsProcessed = distillResult.counts.docsProcessed;
        counts.conceptsProposed = distillResult.counts.conceptsProposed;
        counts.flashcardsProposed = distillResult.counts.flashcardsProposed;

        const splitArtifacts = await splitDistillerArtifactIds(distillResult.artifactIds);
        artifacts.conceptIds = splitArtifacts.conceptIds;
        artifacts.flashcardIds = splitArtifacts.flashcardIds;

        await appendFlowStep(runId, {
          name: 'pipeline_distill',
          status: 'ok',
          output: distillResult.counts,
        });
      } catch (error) {
        errors.push({
          stage: 'distill',
          message: error instanceof Error ? error.message : String(error),
        });
        await appendFlowStep(runId, {
          name: 'pipeline_distill',
          status: 'error',
          error: {
            message: error instanceof Error ? error.message : String(error),
          },
        });
      }
    } else {
      const reason =
        resolved.documentIds.length === 0
          ? 'No target documents resolved'
          : 'Mode does not include distillation';
      await appendFlowStep(runId, {
        name: 'pipeline_distill',
        status: 'skipped',
        output: { reason },
      });
    }

    let reportContent: Awaited<ReturnType<typeof synthesizeReport>> | null = null;
    if (shouldSynthesize(mode) && analyzedFindings && analyzedFindings.evidence.length > 0) {
      await appendFlowStep(runId, {
        name: 'pipeline_synthesize',
        status: 'running',
      });

      try {
        reportContent = await synthesizeReport(
          resolved.goal,
          analyzedFindings,
          webScoutFocusTags,
          runId,
        );
        await appendFlowStep(runId, {
          name: 'pipeline_synthesize',
          status: 'ok',
          output: {
            title: reportContent.title,
            sourcesCount: reportContent.sourcesCount,
          },
        });
      } catch (error) {
        errors.push({
          stage: 'synthesize',
          message: error instanceof Error ? error.message : String(error),
        });
        await appendFlowStep(runId, {
          name: 'pipeline_synthesize',
          status: 'error',
          error: {
            message: error instanceof Error ? error.message : String(error),
          },
        });
      }
    } else {
      if (shouldSynthesize(mode)) {
        const hasUpstreamFindingError = errors.some((error) => {
          return error.stage === 'webscout' || error.stage === 'analyze_findings';
        });

        if (!hasUpstreamFindingError) {
          errors.push({
            stage: 'synthesize',
            message: 'No analyzed findings available to synthesize into a report',
          });
        }
      }
      await appendFlowStep(runId, {
        name: 'pipeline_synthesize',
        status: 'skipped',
        output: {
          reason: shouldSynthesize(mode)
            ? 'Skipped because no analyzed findings were available'
            : 'Mode does not include report synthesis',
        },
      });
    }

    await appendFlowStep(runId, {
      name: 'pipeline_persist_publish',
      status: 'running',
      input: {
        runMode: mode,
      },
    });

    if (reportContent) {
      try {
        reportId = await insertReport({
          runId,
          day: resolved.day,
          title: reportContent.title,
          content: {
            ...reportContent,
            analysis: analyzedFindings?.summary ?? null,
            counts,
          },
          sourceRefs: {
            goal: resolved.goal,
            topicId: resolved.topic?.id ?? null,
            topicName: resolved.topic?.name ?? null,
            focusTags: webScoutFocusTags,
            documentIds: resolved.documentIds,
            webProposalArtifactIds: artifacts.webProposalIds,
            analysisArtifactIds: artifacts.analysisArtifactIds,
            runMode: mode,
          },
        });
      } catch (persistError) {
        errors.push({
          stage: 'persist_publish',
          message: persistError instanceof Error ? persistError.message : String(persistError),
        });
      }

      if (reportId && !skipPublish) {
        const publishResult = await publishReportToNotion({
          title: reportContent.title,
          markdown: reportContent.markdown,
          day: resolved.day,
          topicName: resolved.topic?.name ?? null,
          reportId,
          runId,
        });

        notionPageId = publishResult.pageId;

        if (!publishResult.published && !publishResult.skipped) {
          errors.push({
            stage: 'persist_publish',
            message: publishResult.error ?? 'Notion publication failed',
          });
        }
      }
    }

    await appendFlowStep(runId, {
      name: 'pipeline_persist_publish',
      status: 'ok',
      output: {
        reportId,
        notionPageId,
        analysisArtifactIds: artifacts.analysisArtifactIds,
      },
    });

    if (resolved.topic) {
      await markTopicRunCompleted(resolved.topic.id, mode);
    }

    const status = finalizeStatus(mode, errors, analyzedFindings, reportId);
    const result: PipelineResult = {
      runId,
      status,
      mode,
      trigger,
      counts,
      artifacts,
      reportId,
      notionPageId,
      errors,
    };

    await appendFlowStep(runId, {
      name: 'pipeline',
      status: 'ok',
      output: result,
    });

    await finishRun(runId, status);

    return result;
  } catch (error) {
    await appendFlowStep(runId, {
      name: 'pipeline_error',
      status: 'error',
      error: {
        message: error instanceof Error ? error.message : String(error),
      },
    });
    await finishRun(runId, 'error');
    throw error;
  }
}

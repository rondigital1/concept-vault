import { curatorGraph } from '@/server/agents/curator.graph';
import { distillerGraph } from '@/server/agents/distiller.graph';
import { webScoutGraph } from '@/server/agents/webScout.graph';
import { analyzeFindings, type AnalyzeFindingsOutput } from '@/server/services/analyzeFindings.service';
import { synthesizeReport } from '@/server/services/report.service';
import { publishReportToNotion } from '@/server/services/notionPublish.service';
import { insertReport } from '@/server/repos/report.repo';
import { insertArtifact } from '@/server/repos/artifacts.repo';
import {
  getSavedTopicsByIds,
  linkDocumentToMatchingTopics,
  markTopicRunCompleted,
} from '@/server/repos/savedTopics.repo';
import { setupTopicContext } from '@/server/services/topicWorkflow.service';
import { appendStep, createRun } from '@/server/observability/runTrace.store';
import type { RunStatus } from '@/server/observability/runTrace.types';
import { getAgentProfileSettingsMap } from '@/server/repos/agentProfiles.repo';
import { resolveTopicWorkflowSettings } from '@/server/agents/configuration';
import { splitDistillerArtifactIds } from '@/server/flows/pipeline.artifacts';
import {
  finalizePipelineStatus,
  resolveRequestedPipelineMode,
  shouldRunCurate,
  shouldRunDistill,
  shouldRunWebScout,
  shouldSynthesize,
} from '@/server/flows/pipeline.policy';
import {
  buildPipelineResult,
  createDefaultPipelineArtifacts,
  createDefaultPipelineCounts,
} from '@/server/flows/pipeline.result';
import {
  findExistingPipelineRunByIdempotencyKey,
  hydratePipelineResultFromRun,
} from '@/server/flows/pipeline.runLookup';
import {
  normalizePipelineTags,
  resolvePipelineTargets,
  resolvePipelineWorkspaceId,
} from '@/server/flows/pipeline.targets';
import {
  appendPipelineFlowStep,
  completePipelineRun,
  finishPipelineRunAsError,
} from '@/server/flows/pipeline.trace';
import type {
  PipelineError,
  PipelineExecutionOptions,
  PipelineInput,
  PipelineResult,
} from '@/server/flows/pipeline.types';

export type {
  PipelineCounts,
  PipelineError,
  PipelineExecutionOptions,
  PipelineInput,
  PipelineResult,
  PipelineRunMode,
  PipelineStage,
  PipelineTrigger,
} from '@/server/flows/pipeline.types';

export async function pipelineFlow(
  input: PipelineInput = {},
  options: PipelineExecutionOptions = {},
): Promise<PipelineResult> {
  const workspaceId = await resolvePipelineWorkspaceId(input);
  const trigger = input.trigger ?? 'manual';
  const profiles = await getAgentProfileSettingsMap();
  const preselectedTopic =
    typeof input.topicId === 'string' && input.topicId.trim()
      ? (await getSavedTopicsByIds({ workspaceId }, [input.topicId.trim()]))[0] ?? null
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
  const mode = resolveRequestedPipelineMode(input, profiles, preselectedTopicWorkflowSettings);
  const idempotencyKey =
    typeof input.idempotencyKey === 'string' && input.idempotencyKey.trim()
      ? input.idempotencyKey.trim()
      : null;

  if (!options.skipIdempotencyLookup && idempotencyKey) {
    const existing = await findExistingPipelineRunByIdempotencyKey(workspaceId, idempotencyKey);

    if (existing && existing.status !== 'error') {
      const hydrated = await hydratePipelineResultFromRun(workspaceId, existing.id);

      if (hydrated) {
        return hydrated;
      }

      if (existing.status === 'running') {
        return {
          runId: existing.id,
          status: 'running',
          mode,
          trigger,
          counts: createDefaultPipelineCounts(),
          artifacts: createDefaultPipelineArtifacts(),
          reportId: null,
          notionPageId: null,
          errors: [],
        };
      }
    }
  }

  const runId =
    options.runId ??
    (await createRun({ workspaceId }, 'pipeline', {
      runMode: mode,
      trigger,
      workspaceId,
      topicId: input.topicId ?? null,
      idempotencyKey,
    }));

  const errors: PipelineError[] = [];
  const counts = createDefaultPipelineCounts();
  const artifacts = createDefaultPipelineArtifacts();

  let reportId: string | null = null;
  let notionPageId: string | null = null;

  try {
    await appendPipelineFlowStep(runId, {
      name: 'pipeline',
      status: 'running',
      input: {
        ...input,
        runMode: mode,
        trigger,
      },
    });

    await appendPipelineFlowStep(runId, {
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

    const resolved = await resolvePipelineTargets(input, workspaceId, profiles, preselectedTopic);
    counts.docsTargeted = resolved.documentIds.length;
    const enableCategorization =
      input.enableCategorization ?? resolved.workflowSettings.enableCategorizationByDefault;
    const skipPublish = input.skipPublish ?? resolved.workflowSettings.skipPublishByDefault;

    await appendPipelineFlowStep(runId, {
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
        await markTopicRunCompleted({ workspaceId }, resolved.topic.id, mode);
      }

      const result = buildPipelineResult({
        runId,
        status: 'ok',
        mode,
        trigger,
        counts,
        artifacts,
        reportId,
        notionPageId,
        errors,
      });

      return completePipelineRun(result);
    }

    if (mode === 'topic_setup') {
      await appendPipelineFlowStep(runId, {
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
          const setupResult = await setupTopicContext({ workspaceId }, resolved.topic.id);
          counts.topicLinksCreated = setupResult.linkedCount;
          await appendPipelineFlowStep(runId, {
            name: 'pipeline_topic_setup',
            status: 'ok',
            output: setupResult,
          });
        } catch (error) {
          errors.push({
            stage: 'topic_setup',
            message: error instanceof Error ? error.message : String(error),
          });
          await appendPipelineFlowStep(runId, {
            name: 'pipeline_topic_setup',
            status: 'error',
            error: {
              message: error instanceof Error ? error.message : String(error),
            },
          });
        }
      }

      const status: RunStatus = errors.length > 0 ? 'partial' : 'ok';
      const result = buildPipelineResult({
        runId,
        status,
        mode,
        trigger,
        counts,
        artifacts,
        reportId,
        notionPageId,
        errors,
      });

      return completePipelineRun(result);
    }

    const curateTags: string[] = [...resolved.focusTags];

    if (shouldRunCurate(mode) && resolved.documentIds.length > 0) {
      await appendPipelineFlowStep(runId, {
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
              workspaceId,
              documentId,
              enableCategorization,
            },
            async (agentStep) => {
              await appendStep(runId, agentStep);
            },
          );

          counts.docsCurated += 1;
          curateTags.push(...curateResult.tags);

          const linkedTopics = await linkDocumentToMatchingTopics(
            { workspaceId },
            documentId,
            curateResult.tags,
          );

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

      await appendPipelineFlowStep(runId, {
        name: 'pipeline_curate',
        status: counts.docsCurateFailed > 0 ? 'error' : 'ok',
        output: {
          docsCurated: counts.docsCurated,
          docsCurateFailed: counts.docsCurateFailed,
          topicLinksCreated: counts.topicLinksCreated,
        },
      });
    } else {
      await appendPipelineFlowStep(runId, {
        name: 'pipeline_curate',
        status: 'skipped',
        output: {
          reason: resolved.documentIds.length === 0 ? 'No target documents resolved' : 'Mode does not include curate',
        },
      });
    }

    const webScoutFocusTags = normalizePipelineTags(curateTags).slice(0, 20);

    let webScoutResult: Awaited<ReturnType<typeof webScoutGraph>> | null = null;
    let analyzedFindings: AnalyzeFindingsOutput | null = null;

    if (shouldRunWebScout(mode)) {
      await appendPipelineFlowStep(runId, {
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
            workspaceId,
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

        await appendPipelineFlowStep(runId, {
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
        await appendPipelineFlowStep(runId, {
          name: 'pipeline_webscout',
          status: 'error',
          error: {
            message: error instanceof Error ? error.message : String(error),
          },
        });
      }

      if (webScoutResult && webScoutResult.proposals.length > 0) {
        await appendPipelineFlowStep(runId, {
          name: 'pipeline_analyze_findings',
          status: 'running',
          input: {
            proposals: webScoutResult.proposals.length,
          },
        });

        analyzedFindings = analyzeFindings(webScoutResult.proposals);
        counts.analyzedEvidence = analyzedFindings.summary.uniqueEvidence;

        await appendPipelineFlowStep(runId, {
          name: 'pipeline_analyze_findings',
          status: 'ok',
          output: analyzedFindings.summary,
        });

        try {
          const analysisArtifactId = await insertArtifact({
            workspaceId,
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
            message: analysisError instanceof Error ? analysisError.message : String(analysisError),
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

        await appendPipelineFlowStep(runId, {
          name: 'pipeline_analyze_findings',
          status: 'skipped',
          output: { reason: noProposalReason },
        });
      }
    } else {
      await appendPipelineFlowStep(runId, {
        name: 'pipeline_webscout',
        status: 'skipped',
        output: { reason: 'Mode does not include web scouting' },
      });

      await appendPipelineFlowStep(runId, {
        name: 'pipeline_analyze_findings',
        status: 'skipped',
        output: { reason: 'Mode does not include web scouting' },
      });
    }

    if (shouldRunDistill(mode, input.enableAutoDistill === true) && resolved.documentIds.length > 0) {
      await appendPipelineFlowStep(runId, {
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
            workspaceId,
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

        const splitArtifacts = await splitDistillerArtifactIds(workspaceId, distillResult.artifactIds);
        artifacts.conceptIds = splitArtifacts.conceptIds;
        artifacts.flashcardIds = splitArtifacts.flashcardIds;

        await appendPipelineFlowStep(runId, {
          name: 'pipeline_distill',
          status: 'ok',
          output: distillResult.counts,
        });
      } catch (error) {
        errors.push({
          stage: 'distill',
          message: error instanceof Error ? error.message : String(error),
        });
        await appendPipelineFlowStep(runId, {
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
      await appendPipelineFlowStep(runId, {
        name: 'pipeline_distill',
        status: 'skipped',
        output: { reason },
      });
    }

    let reportContent: Awaited<ReturnType<typeof synthesizeReport>> | null = null;

    if (shouldSynthesize(mode) && analyzedFindings && analyzedFindings.evidence.length > 0) {
      await appendPipelineFlowStep(runId, {
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
        await appendPipelineFlowStep(runId, {
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
        await appendPipelineFlowStep(runId, {
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

      await appendPipelineFlowStep(runId, {
        name: 'pipeline_synthesize',
        status: 'skipped',
        output: {
          reason: shouldSynthesize(mode)
            ? 'Skipped because no analyzed findings were available'
            : 'Mode does not include report synthesis',
        },
      });
    }

    await appendPipelineFlowStep(runId, {
      name: 'pipeline_persist_publish',
      status: 'running',
      input: {
        runMode: mode,
      },
    });

    if (reportContent) {
      try {
        reportId = await insertReport({
          workspaceId,
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

    await appendPipelineFlowStep(runId, {
      name: 'pipeline_persist_publish',
      status: 'ok',
      output: {
        reportId,
        notionPageId,
        analysisArtifactIds: artifacts.analysisArtifactIds,
      },
    });

    if (resolved.topic) {
      await markTopicRunCompleted({ workspaceId }, resolved.topic.id, mode);
    }

    const status = finalizePipelineStatus(mode, errors, analyzedFindings, reportId);
    const result = buildPipelineResult({
      runId,
      status,
      mode,
      trigger,
      counts,
      artifacts,
      reportId,
      notionPageId,
      errors,
    });

    return completePipelineRun(result);
  } catch (error) {
    await appendPipelineFlowStep(runId, {
      name: 'pipeline_error',
      status: 'error',
      error: {
        message: error instanceof Error ? error.message : String(error),
      },
    });
    await finishPipelineRunAsError(runId);
    throw error;
  }
}

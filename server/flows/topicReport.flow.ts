import { WebScoutProposal } from '@/server/agents/webScout.graph';
import { appendStep, createRun, finishRun } from '@/server/observability/runTrace.store';
import { RunStatus, RunStep } from '@/server/observability/runTrace.types';
import { insertReport } from '@/server/repos/report.repo';
import {
  getSavedTopicsByIds,
  getTopicDocuments,
  listSavedTopics,
  SavedTopicRow,
} from '@/server/repos/savedTopics.repo';
import { curateFlow } from './curate.flow';
import { distillFlow } from './distill.flow';
import { webScoutFlow } from './webScout.flow';

type TopicStage = 'topic_setup' | 'curate' | 'webScout' | 'distill';

export interface TopicReportFlowInput {
  day?: string;
  topicIds?: string[];
  includeInactive?: boolean;
  maxDocsPerTopic?: number;
  minQualityResults?: number;
  minRelevanceScore?: number;
  maxIterations?: number;
  maxQueries?: number;
  enableCategorization?: boolean;
  saveReport?: boolean;
}

export interface TopicReportTopicResult {
  topicId: string;
  topicName: string;
  goal: string;
  focusTags: string[];
  documentIds: string[];
  runIds: {
    curate: string[];
    webScout: string | null;
    distill: string | null;
  };
  counts: {
    docsMatched: number;
    docsCurated: number;
    docsCurateFailed: number;
    webProposals: number;
    docsProcessed: number;
    conceptsProposed: number;
    flashcardsProposed: number;
  };
  proposals: WebScoutProposal[];
  errors: Array<{
    stage: TopicStage;
    message: string;
    documentId?: string;
  }>;
}

export interface TopicReportFlowResult {
  runId: string;
  day: string;
  reportId: string | null;
  topicsProcessed: number;
  topics: TopicReportTopicResult[];
  counts: {
    topicsTargeted: number;
    docsMatched: number;
    docsCurated: number;
    docsCurateFailed: number;
    webProposals: number;
    docsProcessed: number;
    conceptsProposed: number;
    flashcardsProposed: number;
  };
}

function todayISODate(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function clampInt(value: number | undefined, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(min, Math.min(Math.floor(value), max));
}

function clampScore(value: number | undefined, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(0, Math.min(value, 1));
}

function slug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40) || 'topic';
}

function uniqueUrls(topics: TopicReportTopicResult[]): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];

  for (const topic of topics) {
    for (const proposal of topic.proposals) {
      if (!seen.has(proposal.url)) {
        seen.add(proposal.url);
        urls.push(proposal.url);
      }
    }
  }

  return urls;
}

function buildExecutiveSummary(result: Omit<TopicReportFlowResult, 'runId' | 'reportId'>): string {
  const { counts, topicsProcessed } = result;
  return [
    `Processed ${topicsProcessed} topic(s).`,
    `Curated ${counts.docsCurated}/${counts.docsMatched} matched document(s).`,
    `Created ${counts.webProposals} web proposal(s), ${counts.conceptsProposed} concept proposal(s), and ${counts.flashcardsProposed} flashcard proposal(s).`,
  ].join(' ');
}

function buildTopicReportMarkdown(result: Omit<TopicReportFlowResult, 'runId' | 'reportId'>): string {
  const lines: string[] = [];
  const { day, topics, counts } = result;
  const anyErrors = topics.some((topic) => topic.errors.length > 0);

  lines.push(`# Topic Workflow Report - ${day}`);
  lines.push('');
  lines.push('## Executive Summary');
  lines.push('');
  lines.push(buildExecutiveSummary(result));
  lines.push('');
  lines.push('## Aggregate Counts');
  lines.push('');
  lines.push(`- Topics targeted: ${counts.topicsTargeted}`);
  lines.push(`- Documents matched: ${counts.docsMatched}`);
  lines.push(`- Documents curated: ${counts.docsCurated}`);
  lines.push(`- Curate failures: ${counts.docsCurateFailed}`);
  lines.push(`- Web proposals: ${counts.webProposals}`);
  lines.push(`- Distill docs processed: ${counts.docsProcessed}`);
  lines.push(`- Concepts proposed: ${counts.conceptsProposed}`);
  lines.push(`- Flashcards proposed: ${counts.flashcardsProposed}`);
  lines.push('');

  if (anyErrors) {
    lines.push('## Pipeline Alerts');
    lines.push('');
    for (const topic of topics) {
      for (const error of topic.errors) {
        const docSuffix = error.documentId ? ` (document: ${error.documentId})` : '';
        lines.push(`- ${topic.topicName} [${error.stage}]: ${error.message}${docSuffix}`);
      }
    }
    lines.push('');
  }

  lines.push('## Topic Breakdown');
  lines.push('');

  for (const topic of topics) {
    lines.push(`### ${topic.topicName}`);
    lines.push('');
    lines.push(`- Goal: ${topic.goal}`);
    lines.push(`- Focus tags: ${topic.focusTags.join(', ') || 'none'}`);
    lines.push(`- Matched document IDs: ${topic.documentIds.join(', ') || 'none'}`);
    lines.push(`- Curate runs: ${topic.runIds.curate.join(', ') || 'none'}`);
    lines.push(`- WebScout run: ${topic.runIds.webScout ?? 'failed/not-run'}`);
    lines.push(`- Distill run: ${topic.runIds.distill ?? 'failed/not-run'}`);
    lines.push(
      `- Output counts: docs=${topic.counts.docsProcessed}, concepts=${topic.counts.conceptsProposed}, flashcards=${topic.counts.flashcardsProposed}, proposals=${topic.counts.webProposals}`,
    );
    lines.push('');

    if (topic.proposals.length > 0) {
      lines.push('Top proposed resources:');
      for (const proposal of topic.proposals.slice(0, 5)) {
        lines.push(
          `- [${proposal.title}](${proposal.url}) (score: ${proposal.relevanceScore.toFixed(2)}, type: ${proposal.contentType})`,
        );
      }
      lines.push('');
    } else {
      lines.push('Top proposed resources: none');
      lines.push('');
    }
  }

  return lines.join('\n');
}

async function resolveTopics(input: TopicReportFlowInput): Promise<SavedTopicRow[]> {
  const ids = Array.isArray(input.topicIds) ? input.topicIds.filter(Boolean) : [];
  const includeInactive = input.includeInactive === true;

  if (ids.length > 0) {
    const selected = await getSavedTopicsByIds(ids);
    return includeInactive ? selected : selected.filter((topic) => topic.is_active);
  }

  return listSavedTopics({ activeOnly: !includeInactive });
}

function createTopicResult(topic: SavedTopicRow): TopicReportTopicResult {
  return {
    topicId: topic.id,
    topicName: topic.name,
    goal: topic.goal,
    focusTags: topic.focus_tags ?? [],
    documentIds: [],
    runIds: { curate: [], webScout: null, distill: null },
    counts: {
      docsMatched: 0,
      docsCurated: 0,
      docsCurateFailed: 0,
      webProposals: 0,
      docsProcessed: 0,
      conceptsProposed: 0,
      flashcardsProposed: 0,
    },
    proposals: [],
    errors: [],
  };
}

function countSummary(topics: TopicReportTopicResult[]) {
  return topics.reduce(
    (acc, topic) => {
      acc.docsMatched += topic.counts.docsMatched;
      acc.docsCurated += topic.counts.docsCurated;
      acc.docsCurateFailed += topic.counts.docsCurateFailed;
      acc.webProposals += topic.counts.webProposals;
      acc.docsProcessed += topic.counts.docsProcessed;
      acc.conceptsProposed += topic.counts.conceptsProposed;
      acc.flashcardsProposed += topic.counts.flashcardsProposed;
      return acc;
    },
    {
      topicsTargeted: topics.length,
      docsMatched: 0,
      docsCurated: 0,
      docsCurateFailed: 0,
      webProposals: 0,
      docsProcessed: 0,
      conceptsProposed: 0,
      flashcardsProposed: 0,
    },
  );
}

async function runTopicPipeline(
  runId: string,
  day: string,
  topic: SavedTopicRow,
  input: TopicReportFlowInput,
): Promise<TopicReportTopicResult> {
  const stepPrefix = slug(topic.name);
  const result = createTopicResult(topic);
  const docsLimit = clampInt(input.maxDocsPerTopic, topic.max_docs_per_run, 1, 20);
  const minQualityResults = clampInt(input.minQualityResults, topic.min_quality_results, 1, 20);
  const minRelevanceScore = clampScore(input.minRelevanceScore, topic.min_relevance_score);
  const maxIterations = clampInt(input.maxIterations, topic.max_iterations, 1, 20);
  const maxQueries = clampInt(input.maxQueries, topic.max_queries, 1, 50);

  await appendStep(runId, {
    timestamp: new Date().toISOString(),
    type: 'flow',
    name: `topic_${stepPrefix}_start`,
    status: 'running',
    input: {
      topicId: topic.id,
      topicName: topic.name,
      focusTags: topic.focus_tags,
      goal: topic.goal,
    },
  });

  try {
    const docs = await getTopicDocuments(topic.focus_tags ?? [], docsLimit);
    result.documentIds = docs.map((doc) => doc.id);
    result.counts.docsMatched = result.documentIds.length;
  } catch (error) {
    result.errors.push({
      stage: 'topic_setup',
      message: error instanceof Error ? error.message : String(error),
    });
  }

  for (const documentId of result.documentIds) {
    try {
      const curateRunId = await curateFlow({
        documentId,
        enableCategorization: input.enableCategorization ?? false,
      });
      result.runIds.curate.push(curateRunId);
      result.counts.docsCurated += 1;
    } catch (error) {
      result.counts.docsCurateFailed += 1;
      result.errors.push({
        stage: 'curate',
        documentId,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  try {
    const webScout = await webScoutFlow({
      goal: topic.goal,
      mode: 'derive-from-vault',
      day,
      focusTags: topic.focus_tags.length > 0 ? topic.focus_tags : undefined,
      minQualityResults,
      minRelevanceScore,
      maxIterations,
      maxQueries,
    });
    result.runIds.webScout = webScout.runId;
    result.proposals = webScout.output.proposals;
    result.counts.webProposals = webScout.output.counts.proposalsCreated;
  } catch (error) {
    result.errors.push({
      stage: 'webScout',
      message: error instanceof Error ? error.message : String(error),
    });
  }

  try {
    const topicTag = topic.focus_tags[0];
    const distill = await distillFlow({
      day,
      documentIds: result.documentIds.length > 0 ? result.documentIds : undefined,
      limit: docsLimit,
      topicTag: topicTag || undefined,
    });
    result.runIds.distill = distill.runId;
    result.counts.docsProcessed = distill.output.counts.docsProcessed;
    result.counts.conceptsProposed = distill.output.counts.conceptsProposed;
    result.counts.flashcardsProposed = distill.output.counts.flashcardsProposed;
  } catch (error) {
    result.errors.push({
      stage: 'distill',
      message: error instanceof Error ? error.message : String(error),
    });
  }

  await appendStep(runId, {
    timestamp: new Date().toISOString(),
    type: 'flow',
    name: `topic_${stepPrefix}_complete`,
    status: result.errors.length > 0 ? 'error' : 'ok',
    output: {
      topicId: result.topicId,
      runIds: result.runIds,
      counts: result.counts,
      errors: result.errors,
    },
  });

  return result;
}

export async function topicReportFlow(input: TopicReportFlowInput = {}): Promise<TopicReportFlowResult> {
  const runId = await createRun('research');
  const day = input.day ?? todayISODate();
  const saveReport = input.saveReport !== false;
  let runStatus: RunStatus = 'running';

  try {
    const startStep: RunStep = {
      timestamp: new Date().toISOString(),
      type: 'flow',
      name: 'topic_report',
      status: 'running',
      input: {
        day,
        topicIds: input.topicIds,
        includeInactive: input.includeInactive === true,
        saveReport,
      },
    };
    await appendStep(runId, startStep);

    const topics = await resolveTopics(input);

    await appendStep(runId, {
      timestamp: new Date().toISOString(),
      type: 'flow',
      name: 'topic_report_load_topics',
      status: 'ok',
      output: {
        selectedTopicIds: topics.map((topic) => topic.id),
        selectedTopicNames: topics.map((topic) => topic.name),
      },
    });

    if (topics.length === 0) {
      throw new Error('No saved topics available. Create one via POST /api/topics first.');
    }

    const topicResults: TopicReportTopicResult[] = [];
    for (const topic of topics) {
      const topicResult = await runTopicPipeline(runId, day, topic, input);
      topicResults.push(topicResult);
    }

    const counts = countSummary(topicResults);
    const resultWithoutRunIds: Omit<TopicReportFlowResult, 'runId' | 'reportId'> = {
      day,
      topicsProcessed: topicResults.length,
      topics: topicResults,
      counts,
    };
    const topicNames = topicResults.map((topic) => topic.topicName);
    const reportTitle = `Topic Workflow Report - ${day}`;
    const markdown = buildTopicReportMarkdown(resultWithoutRunIds);
    const executiveSummary = buildExecutiveSummary(resultWithoutRunIds);
    const sources = uniqueUrls(topicResults);
    let reportId: string | null = null;

    if (saveReport) {
      reportId = await insertReport({
        runId,
        day,
        title: reportTitle,
        content: {
          title: reportTitle,
          markdown,
          executiveSummary,
          sourcesCount: sources.length,
          topicsCovered: topicNames,
          counts,
          topicResults,
        },
        sourceRefs: {
          topicIds: topicResults.map((topic) => topic.topicId),
          runIds: topicResults.map((topic) => topic.runIds),
          proposalUrls: sources,
        },
      });

      await appendStep(runId, {
        timestamp: new Date().toISOString(),
        type: 'flow',
        name: 'topic_report_save_report',
        status: 'ok',
        output: { reportId, title: reportTitle, sourcesCount: sources.length },
      });
    } else {
      await appendStep(runId, {
        timestamp: new Date().toISOString(),
        type: 'flow',
        name: 'topic_report_save_report',
        status: 'skipped',
        output: { reason: 'saveReport=false' },
      });
    }

    const hasAnyErrors = topicResults.some((topic) => topic.errors.length > 0);
    runStatus = hasAnyErrors ? 'partial' : 'ok';

    await appendStep(runId, {
      timestamp: new Date().toISOString(),
      type: 'flow',
      name: 'topic_report',
      status: runStatus === 'ok' ? 'ok' : 'error',
      output: {
        reportId,
        topicsProcessed: topicResults.length,
        counts,
      },
    });

    await finishRun(runId, runStatus);

    return {
      runId,
      day,
      reportId,
      topicsProcessed: topicResults.length,
      topics: topicResults,
      counts,
    };
  } catch (error) {
    await appendStep(runId, {
      timestamp: new Date().toISOString(),
      type: 'flow',
      name: 'topic_report_error',
      status: 'error',
      error: { message: error instanceof Error ? error.message : String(error) },
    });

    runStatus = 'error';
    await finishRun(runId, runStatus);
    throw error;
  }
}

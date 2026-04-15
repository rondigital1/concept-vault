import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TEST_DAY } from '../helpers/fixtures';

const mockCuratorGraph = vi.hoisted(() => vi.fn());
const mockWebScoutGraph = vi.hoisted(() => vi.fn());
const mockDistillerGraph = vi.hoisted(() => vi.fn());
const mockSynthesizeReport = vi.hoisted(() => vi.fn());
const mockInsertReport = vi.hoisted(() => vi.fn());
const mockInsertArtifact = vi.hoisted(() => vi.fn());
const mockPublishReportToNotion = vi.hoisted(() => vi.fn());
const mockCreateRun = vi.hoisted(() => vi.fn());
const mockAppendStep = vi.hoisted(() => vi.fn());
const mockFinishRun = vi.hoisted(() => vi.fn());
const mockGetDocumentsByIds = vi.hoisted(() => vi.fn());
const mockGetRecentDocuments = vi.hoisted(() => vi.fn());
const mockGetSavedTopicsByIds = vi.hoisted(() => vi.fn());
const mockGetTopicDocuments = vi.hoisted(() => vi.fn());
const mockGetTopicLinkedDocuments = vi.hoisted(() => vi.fn());
const mockLinkDocumentToMatchingTopics = vi.hoisted(() => vi.fn());
const mockMarkTopicRunCompleted = vi.hoisted(() => vi.fn());
const mockSetupTopicContext = vi.hoisted(() => vi.fn());
const mockGetAgentProfileSettingsMap = vi.hoisted(() => vi.fn());

vi.mock('@/server/agents/curator.graph', () => ({
  curatorGraph: mockCuratorGraph,
}));

vi.mock('@/server/agents/webScout.graph', () => ({
  webScoutGraph: mockWebScoutGraph,
}));

vi.mock('@/server/agents/distiller.graph', () => ({
  distillerGraph: mockDistillerGraph,
}));

vi.mock('@/server/services/report.service', () => ({
  synthesizeReport: mockSynthesizeReport,
}));

vi.mock('@/server/repos/report.repo', () => ({
  insertReport: mockInsertReport,
}));

vi.mock('@/server/repos/artifacts.repo', () => ({
  insertArtifact: mockInsertArtifact,
}));

vi.mock('@/server/services/notionPublish.service', () => ({
  publishReportToNotion: mockPublishReportToNotion,
}));

vi.mock('@/server/observability/runTrace.store', () => ({
  createRun: mockCreateRun,
  appendStep: mockAppendStep,
  finishRun: mockFinishRun,
}));

vi.mock('@/server/repos/distiller.repo', () => ({
  getDocumentsByIds: mockGetDocumentsByIds,
  getRecentDocuments: mockGetRecentDocuments,
}));

vi.mock('@/server/repos/savedTopics.repo', () => ({
  getSavedTopicsByIds: mockGetSavedTopicsByIds,
  getTopicDocuments: mockGetTopicDocuments,
  getTopicLinkedDocuments: mockGetTopicLinkedDocuments,
  linkDocumentToMatchingTopics: mockLinkDocumentToMatchingTopics,
  markTopicRunCompleted: mockMarkTopicRunCompleted,
}));

vi.mock('@/server/services/topicWorkflow.service', () => ({
  setupTopicContext: mockSetupTopicContext,
}));

vi.mock('@/server/repos/agentProfiles.repo', () => ({
  getAgentProfileSettingsMap: mockGetAgentProfileSettingsMap,
}));

describe('Pipeline Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockCreateRun.mockResolvedValue('run-pipeline-1');
    mockAppendStep.mockResolvedValue(undefined);
    mockFinishRun.mockResolvedValue(undefined);
    mockGetDocumentsByIds.mockImplementation(async (ids: string[]) =>
      ids.map((id) => ({
        id,
        title: `Doc ${id}`,
        content: 'Document content',
        tags: ['learning'],
      })),
    );
    mockGetRecentDocuments.mockResolvedValue([
      {
        id: 'doc-recent-1',
        title: 'Recent doc',
        content: 'Recent document content',
        tags: ['learning'],
      },
    ]);

    mockCuratorGraph.mockResolvedValue({
      tags: ['memory'],
      category: 'learning',
      relatedDocs: [],
    });

    mockWebScoutGraph.mockResolvedValue({
      proposals: [
        {
          url: 'https://example.com/resource-1',
          title: 'Resource 1',
          summary: 'summary',
          relevanceScore: 0.9,
          contentType: 'article',
          topics: ['memory'],
          reasoning: ['matches goal'],
        },
      ],
      artifactIds: ['artifact-web-1'],
      reasoning: ['matches goal'],
      terminationReason: 'satisfied',
      counts: {
        iterations: 2,
        queriesExecuted: 2,
        resultsEvaluated: 3,
        proposalsCreated: 1,
      },
    });

    mockDistillerGraph.mockResolvedValue({
      artifactIds: [],
      counts: {
        docsProcessed: 1,
        conceptsProposed: 2,
        flashcardsProposed: 3,
      },
    });

    mockSynthesizeReport.mockResolvedValue({
      markdown: '# Report',
      title: 'Report',
      executiveSummary: 'summary',
      sourcesCount: 1,
      topicsCovered: ['memory'],
    });

    mockInsertReport.mockResolvedValue('report-1');
    mockInsertArtifact.mockResolvedValue('analysis-1');
    mockPublishReportToNotion.mockResolvedValue({
      published: false,
      skipped: true,
      pageId: null,
      url: null,
      error: 'NOTION_NOT_CONFIGURED',
    });
    mockGetSavedTopicsByIds.mockResolvedValue([]);
    mockGetTopicDocuments.mockResolvedValue([]);
    mockGetTopicLinkedDocuments.mockResolvedValue([]);
    mockLinkDocumentToMatchingTopics.mockResolvedValue({ topicIds: [] });
    mockMarkTopicRunCompleted.mockResolvedValue(undefined);
    mockGetAgentProfileSettingsMap.mockResolvedValue({
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
    });
    mockSetupTopicContext.mockResolvedValue({
      topicId: 'topic-1',
      focusTags: ['learning'],
      linkedDocumentIds: ['doc-1'],
      linkedCount: 1,
      previewGoal: 'Track updates',
    });
  });

  it('runs Curate → WebScout → Distill and returns ok on success', async () => {
    const documentId = 'doc-1';

    const { pipelineFlow } = await import('@/server/flows/pipeline.flow');

    const result = await pipelineFlow({
      day: TEST_DAY,
      documentIds: [documentId],
      goal: 'memory techniques',
    });

    expect(result.status).toBe('ok');
    expect(result.counts.docsTargeted).toBe(1);
    expect(result.counts.docsCurated).toBe(1);
    expect(result.counts.docsCurateFailed).toBe(0);
    expect(result.counts.webProposals).toBe(1);
    expect(result.counts.docsProcessed).toBe(1);
    expect(result.counts.conceptsProposed).toBe(2);
    expect(result.counts.flashcardsProposed).toBe(3);
    expect(result.reportId).toBe('report-1');
    expect(result.errors).toHaveLength(0);

    expect(mockCuratorGraph).toHaveBeenCalledTimes(1);
    expect(mockWebScoutGraph).toHaveBeenCalledTimes(1);
    expect(mockInsertArtifact).toHaveBeenCalledTimes(1);
    expect(mockDistillerGraph).toHaveBeenCalledTimes(1);
    expect(mockSynthesizeReport).toHaveBeenCalledTimes(1);
    expect(mockInsertReport).toHaveBeenCalledTimes(1);
  });

  it('returns partial when curation fails but later stages continue', async () => {
    const documentId = 'doc-fail';

    mockCuratorGraph.mockRejectedValueOnce(new Error('Curate failed'));

    const { pipelineFlow } = await import('@/server/flows/pipeline.flow');

    const result = await pipelineFlow({
      day: TEST_DAY,
      documentIds: [documentId],
      goal: 'learning systems',
    });

    expect(result.status).toBe('partial');
    expect(result.counts.docsCurated).toBe(0);
    expect(result.counts.docsCurateFailed).toBe(1);
    expect(result.counts.webProposals).toBe(1);
    expect(result.counts.docsProcessed).toBe(1);
    expect(result.reportId).toBe('report-1');
    expect(result.errors.some((error) => error.stage === 'curate')).toBe(true);

    expect(mockWebScoutGraph).toHaveBeenCalledTimes(1);
    expect(mockDistillerGraph).toHaveBeenCalledTimes(1);
    expect(mockInsertReport).toHaveBeenCalledTimes(1);
  });

  it('returns partial and skips synthesis when WebScout returns no proposals', async () => {
    const documentId = 'doc-no-proposal';

    mockWebScoutGraph.mockResolvedValueOnce({
      proposals: [],
      artifactIds: [],
      reasoning: [],
      terminationReason: 'max_iterations',
      counts: {
        iterations: 5,
        queriesExecuted: 5,
        resultsEvaluated: 5,
        proposalsCreated: 0,
      },
    });

    const { pipelineFlow } = await import('@/server/flows/pipeline.flow');

    const result = await pipelineFlow({
      day: TEST_DAY,
      documentIds: [documentId],
      goal: 'niche topic',
    });

    expect(result.status).toBe('partial');
    expect(result.counts.webProposals).toBe(0);
    expect(result.reportId).toBeNull();
    expect(result.errors.some((error) => error.stage === 'webscout')).toBe(true);
    expect(result.errors.some((error) => error.stage === 'synthesize')).toBe(false);
    expect(mockSynthesizeReport).not.toHaveBeenCalled();
    expect(mockInsertReport).not.toHaveBeenCalled();
  });

  it('runs lightweight enrichment without WebScout/report by default', async () => {
    const { pipelineFlow } = await import('@/server/flows/pipeline.flow');

    const result = await pipelineFlow({
      day: TEST_DAY,
      documentIds: ['doc-1'],
      runMode: 'lightweight_enrichment',
      trigger: 'auto_document',
    });

    expect(result.status).toBe('ok');
    expect(result.mode).toBe('lightweight_enrichment');
    expect(mockCuratorGraph).toHaveBeenCalledTimes(1);
    expect(mockWebScoutGraph).not.toHaveBeenCalled();
    expect(mockDistillerGraph).not.toHaveBeenCalled();
    expect(mockInsertReport).not.toHaveBeenCalled();
  });

  it('uses global defaults for manual runs when no topic overrides are present', async () => {
    mockGetAgentProfileSettingsMap.mockResolvedValue({
      pipeline: {
        defaultRunMode: 'full_report',
        enableAutoDistillOnIngest: false,
        skipPublishByDefault: true,
      },
      curator: {
        enableCategorizationByDefault: true,
      },
      webScout: {
        minQualityResults: 6,
        minRelevanceScore: 0.93,
        maxIterations: 7,
        maxQueries: 12,
      },
      distiller: {
        maxDocsPerRun: 2,
      },
    });

    const { pipelineFlow } = await import('@/server/flows/pipeline.flow');

    const result = await pipelineFlow({
      day: TEST_DAY,
      documentIds: ['doc-1'],
      goal: 'agent execution telemetry',
    });

    expect(result.mode).toBe('full_report');
    expect(mockCuratorGraph).toHaveBeenCalledWith(
      expect.objectContaining({
        enableCategorization: true,
      }),
      expect.any(Function),
    );
    expect(mockWebScoutGraph).toHaveBeenCalledWith(
      expect.objectContaining({
        minQualityResults: 6,
        minRelevanceScore: 0.93,
        maxIterations: 7,
        maxQueries: 12,
      }),
      expect.any(Function),
      expect.any(String),
    );
    expect(mockDistillerGraph).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 2,
      }),
      expect.any(Function),
      expect.any(String),
    );
    expect(mockPublishReportToNotion).not.toHaveBeenCalled();
  });

  it('topic_setup mode only runs setup work and skips expensive stages', async () => {
    mockGetSavedTopicsByIds.mockResolvedValueOnce([
      {
        id: 'topic-1',
        name: 'AI',
        goal: 'Learn AI systems',
        focus_tags: ['ai systems'],
        max_docs_per_run: 5,
        min_quality_results: 3,
        min_relevance_score: 0.8,
        max_iterations: 5,
        max_queries: 10,
        is_active: true,
        is_tracked: true,
        cadence: 'daily',
        last_run_at: null,
        last_run_mode: null,
        last_signal_at: null,
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);

    const { pipelineFlow } = await import('@/server/flows/pipeline.flow');
    const result = await pipelineFlow({
      day: TEST_DAY,
      topicId: 'topic-1',
      runMode: 'topic_setup',
      trigger: 'auto_topic',
    });

    expect(result.mode).toBe('topic_setup');
    expect(result.status).toBe('ok');
    expect(mockSetupTopicContext).toHaveBeenCalledTimes(1);
    expect(mockWebScoutGraph).not.toHaveBeenCalled();
    expect(mockDistillerGraph).not.toHaveBeenCalled();
    expect(mockInsertReport).not.toHaveBeenCalled();
  });

  it('synthesizes using analyzed findings, not raw scout proposals', async () => {
    const { pipelineFlow } = await import('@/server/flows/pipeline.flow');

    await pipelineFlow({
      day: TEST_DAY,
      documentIds: ['doc-1'],
      goal: 'memory techniques',
      runMode: 'full_report',
    });

    const synthCallArgs = mockSynthesizeReport.mock.calls[0];
    expect(synthCallArgs).toBeDefined();
    expect(synthCallArgs[1]).toHaveProperty('summary');
    expect(synthCallArgs[1]).toHaveProperty('evidence');
    expect(synthCallArgs[1].summary.uniqueEvidence).toBe(1);
  });

  it('keeps local report when notion publish fails', async () => {
    mockPublishReportToNotion.mockResolvedValueOnce({
      published: false,
      skipped: false,
      pageId: null,
      url: null,
      error: 'notion error',
    });

    const { pipelineFlow } = await import('@/server/flows/pipeline.flow');
    const result = await pipelineFlow({
      day: TEST_DAY,
      documentIds: ['doc-1'],
      goal: 'memory techniques',
      runMode: 'full_report',
    });

    expect(result.reportId).toBe('report-1');
    expect(result.status).toBe('partial');
    expect(result.errors.some((error) => error.stage === 'persist_publish')).toBe(true);
  });
});

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { updateAgentProfile } from '@/server/repos/agentProfiles.repo';
import { listSavedTopics } from '@/server/repos/savedTopics.repo';
import { cleanAllTables, closeTestDb, initTestSchema } from '../helpers/testDb';

const mockPipelineFlow = vi.hoisted(() => vi.fn());

vi.mock('@/server/flows/pipeline.flow', () => ({
  pipelineFlow: mockPipelineFlow,
}));

describe('topics route', () => {
  beforeAll(async () => {
    await initTestSchema();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await cleanAllTables();
    vi.clearAllMocks();
    vi.resetModules();

    mockPipelineFlow.mockResolvedValue({
      runId: 'run-topic-setup-1',
      status: 'ok',
      mode: 'topic_setup',
      trigger: 'auto_topic',
      counts: {
        docsTargeted: 0,
        docsCurated: 0,
        docsCurateFailed: 0,
        webProposals: 0,
        analyzedEvidence: 0,
        docsProcessed: 0,
        conceptsProposed: 0,
        flashcardsProposed: 0,
        topicLinksCreated: 0,
      },
      artifacts: {
        webProposalIds: [],
        analysisArtifactIds: [],
        conceptIds: [],
        flashcardIds: [],
      },
      reportId: null,
      notionPageId: null,
      errors: [],
    });
  });

  it('fills omitted topic workflow fields from global agent defaults', async () => {
    await updateAgentProfile('pipeline', {
      defaultRunMode: 'incremental_update',
      skipPublishByDefault: true,
    });
    await updateAgentProfile('curator', {
      enableCategorizationByDefault: true,
    });
    await updateAgentProfile('webScout', {
      minQualityResults: 8,
      minRelevanceScore: 0.91,
      maxIterations: 6,
      maxQueries: 14,
    });
    await updateAgentProfile('distiller', {
      maxDocsPerRun: 7,
    });

    const { POST } = await import('@/app/api/topics/route');

    const response = await POST(
      new Request('http://localhost/api/topics', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: 'Agent Metrics',
          goal: 'Track agent runs and evidence quality',
        }),
      }),
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.setupRunId).toBe('run-topic-setup-1');

    const topic = (await listSavedTopics())[0];
    expect(topic).toBeDefined();
    expect(topic?.max_docs_per_run).toBe(7);
    expect(topic?.min_quality_results).toBe(8);
    expect(topic?.min_relevance_score).toBe(0.91);
    expect(topic?.max_iterations).toBe(6);
    expect(topic?.max_queries).toBe(14);
    expect(topic?.metadata).toMatchObject({
      workflowSettings: {
        defaultRunMode: 'incremental_update',
        enableCategorizationByDefault: true,
        skipPublishByDefault: true,
      },
    });

    expect(mockPipelineFlow).toHaveBeenCalledWith(
      expect.objectContaining({
        topicId: topic?.id,
        runMode: 'topic_setup',
        trigger: 'auto_topic',
      }),
    );
  });
});

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { updateAgentProfile } from '@/server/repos/agentProfiles.repo';
import { listSavedTopics } from '@/server/repos/savedTopics.repo';
import {
  cleanAllTables,
  createAdditionalTestWorkspace,
  closeTestDb,
  initTestSchema,
} from '../helpers/testDb';

const mockAuth = vi.hoisted(() => vi.fn());
const mockPipelineFlow = vi.hoisted(() => vi.fn());

vi.mock('@/server/flows/pipeline.flow', () => ({
  pipelineFlow: mockPipelineFlow,
}));

vi.mock('@/auth', () => ({
  auth: mockAuth,
}));

describe('topics route', () => {
  let scope: { workspaceId: string };

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
    const validation = await import('@/server/http/requestValidation');
    validation.resetValidationFailureCounts();

    const workspace = await createAdditionalTestWorkspace('topics');
    scope = { workspaceId: workspace.workspaceId };
    mockAuth.mockResolvedValue({
      user: {
        id: workspace.userId,
        email: workspace.email,
        membershipRole: 'owner',
      },
      workspace: {
        id: scope.workspaceId,
        name: 'Test Workspace',
        slug: 'test-workspace',
      },
    });

    mockPipelineFlow.mockResolvedValue({
      runId: 'run-topic-setup-1',
      status: 'ok',
      mode: 'topic_setup',
      trigger: 'auto_topic',
      counts: {},
      artifacts: {},
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
    expect(body.setupJobId).toBeNull();

    const topic = (await listSavedTopics(scope))[0];
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

    expect(mockPipelineFlow).toHaveBeenCalledWith({
      workspaceId: scope.workspaceId,
      topicId: topic?.id,
      runMode: 'topic_setup',
      trigger: 'auto_topic',
      enableCategorization: false,
      idempotencyKey: expect.stringMatching(/^topic_setup:/),
    });
  });

  it('rejects malformed topic payloads consistently', async () => {
    const { POST } = await import('@/app/api/topics/route');

    const response = await POST(
      new Request('http://localhost/api/topics', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          goal: 'Track agent runs and evidence quality',
          maxQueries: 'bad',
        }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: 'Invalid request payload',
      details: expect.arrayContaining([
        expect.objectContaining({
          path: 'name',
          message: 'Required',
        }),
        expect.objectContaining({
          path: 'maxQueries',
          message: 'maxQueries must be a number',
        }),
      ]),
    });
    expect(mockPipelineFlow).not.toHaveBeenCalled();
    const validation = await import('@/server/http/requestValidation');
    expect(validation.getValidationFailureCount('/api/topics')).toBe(1);
  });
});

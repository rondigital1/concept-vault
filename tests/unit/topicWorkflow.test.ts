import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockCountTopicSignalsSince = vi.hoisted(() => vi.fn());
const mockCountTopicLinkedDocuments = vi.hoisted(() => vi.fn());
const mockGetTopicLinkedDocuments = vi.hoisted(() => vi.fn());
const mockListSavedTopics = vi.hoisted(() => vi.fn());
const mockGetLatestReportForTopic = vi.hoisted(() => vi.fn());

vi.mock('@/server/repos/savedTopics.repo', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/server/repos/savedTopics.repo')>();
  return {
    ...actual,
    countTopicLinkedDocuments: mockCountTopicLinkedDocuments,
    countTopicSignalsSince: mockCountTopicSignalsSince,
    getTopicLinkedDocuments: mockGetTopicLinkedDocuments,
    listSavedTopics: mockListSavedTopics,
  };
});

vi.mock('@/server/repos/report.repo', () => ({
  getLatestReportForTopic: mockGetLatestReportForTopic,
}));

describe('topicWorkflow run mode decisions', () => {
  const scope = { workspaceId: 'workspace-1' };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCountTopicLinkedDocuments.mockResolvedValue(0);
    mockGetTopicLinkedDocuments.mockResolvedValue([{ id: 'doc-1' }]);
    mockGetLatestReportForTopic.mockResolvedValue(null);
    mockListSavedTopics.mockResolvedValue([]);
  });

  it('chooses full_report for strong novelty signal', async () => {
    mockCountTopicSignalsSince.mockResolvedValue(4);

    const { decideScheduledRunMode } = await import('@/server/services/topicWorkflow.service');

    const decision = await decideScheduledRunMode(scope, {
      id: 'topic-1',
      name: 'AI',
      goal: 'Learn AI',
      focus_tags: ['ai'],
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
    });

    expect(decision.mode).toBe('full_report');
  });

  it('chooses incremental_update for moderate signal', async () => {
    mockCountTopicSignalsSince.mockResolvedValue(1);

    const { decideScheduledRunMode } = await import('@/server/services/topicWorkflow.service');

    const decision = await decideScheduledRunMode(scope, {
      id: 'topic-1',
      name: 'AI',
      goal: 'Learn AI',
      focus_tags: ['ai'],
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
    });

    expect(decision.mode).toBe('incremental_update');
  });

  it('chooses concept_only when no report exists but linked docs exist', async () => {
    mockCountTopicSignalsSince.mockResolvedValue(0);
    mockGetLatestReportForTopic.mockResolvedValue(null);
    mockGetTopicLinkedDocuments.mockResolvedValue([{ id: 'doc-1' }, { id: 'doc-2' }]);

    const { decideScheduledRunMode } = await import('@/server/services/topicWorkflow.service');

    const decision = await decideScheduledRunMode(scope, {
      id: 'topic-1',
      name: 'AI',
      goal: 'Learn AI',
      focus_tags: ['ai'],
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
    });

    expect(decision.mode).toBe('concept_only');
  });

  it('chooses skip when no signal and report is recent', async () => {
    mockCountTopicSignalsSince.mockResolvedValue(0);
    mockGetLatestReportForTopic.mockResolvedValue({
      created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    });

    const { decideScheduledRunMode } = await import('@/server/services/topicWorkflow.service');

    const decision = await decideScheduledRunMode(scope, {
      id: 'topic-1',
      name: 'AI',
      goal: 'Learn AI',
      focus_tags: ['ai'],
      max_docs_per_run: 5,
      min_quality_results: 3,
      min_relevance_score: 0.8,
      max_iterations: 5,
      max_queries: 10,
      is_active: true,
      is_tracked: true,
      cadence: 'daily',
      last_run_at: new Date().toISOString(),
      last_run_mode: 'full_report',
      last_signal_at: null,
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    expect(decision.mode).toBe('skip');
  });
});

describe('topicWorkflow report readiness', () => {
  const scope = { workspaceId: 'workspace-1' };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetLatestReportForTopic.mockResolvedValue(null);
  });

  it('returns only topics that meet the minimum linked-document threshold', async () => {
    mockListSavedTopics.mockResolvedValue([
      {
        id: 'topic-a',
        name: 'Agents',
        goal: 'Track agent systems',
        focus_tags: ['agents'],
        max_docs_per_run: 5,
        min_quality_results: 3,
        min_relevance_score: 0.8,
        max_iterations: 5,
        max_queries: 10,
        is_active: true,
        is_tracked: false,
        cadence: 'weekly',
        last_run_at: null,
        last_run_mode: null,
        last_signal_at: null,
        metadata: {},
        created_at: '2026-03-01T00:00:00.000Z',
        updated_at: '2026-03-04T00:00:00.000Z',
      },
      {
        id: 'topic-b',
        name: 'Inference',
        goal: 'Track inference systems',
        focus_tags: ['inference'],
        max_docs_per_run: 5,
        min_quality_results: 3,
        min_relevance_score: 0.8,
        max_iterations: 5,
        max_queries: 10,
        is_active: true,
        is_tracked: false,
        cadence: 'weekly',
        last_run_at: null,
        last_run_mode: null,
        last_signal_at: null,
        metadata: {},
        created_at: '2026-03-01T00:00:00.000Z',
        updated_at: '2026-03-05T00:00:00.000Z',
      },
      {
        id: 'topic-c',
        name: 'Evaluation',
        goal: 'Track eval systems',
        focus_tags: ['evals'],
        max_docs_per_run: 5,
        min_quality_results: 3,
        min_relevance_score: 0.8,
        max_iterations: 5,
        max_queries: 10,
        is_active: true,
        is_tracked: false,
        cadence: 'weekly',
        last_run_at: null,
        last_run_mode: null,
        last_signal_at: null,
        metadata: {},
        created_at: '2026-03-01T00:00:00.000Z',
        updated_at: '2026-03-03T00:00:00.000Z',
      },
    ]);

    mockCountTopicLinkedDocuments.mockImplementation(
      async (_scope: { workspaceId: string }, topicId: string) => {
      if (topicId === 'topic-a') return 3;
      if (topicId === 'topic-b') return 6;
      return 2;
      },
    );

    mockGetLatestReportForTopic.mockImplementation(
      async (_scope: { workspaceId: string }, topicId: string) => {
      if (topicId === 'topic-b') {
        return { created_at: '2026-03-02T10:00:00.000Z' };
      }
      return null;
      },
    );

    const { listReportReadyTopics } = await import('@/server/services/topicWorkflow.service');

    const readyTopics = await listReportReadyTopics(scope, 3);

    expect(readyTopics).toEqual([
      expect.objectContaining({
        topic: expect.objectContaining({ id: 'topic-b', name: 'Inference' }),
        linkedDocumentCount: 6,
        lastReportAt: '2026-03-02T10:00:00.000Z',
      }),
      expect.objectContaining({
        topic: expect.objectContaining({ id: 'topic-a', name: 'Agents' }),
        linkedDocumentCount: 3,
        lastReportAt: null,
      }),
    ]);
  });

  it('clamps the minimum linked-document threshold to one', async () => {
    mockListSavedTopics.mockResolvedValue([
      {
        id: 'topic-a',
        name: 'Agents',
        goal: 'Track agent systems',
        focus_tags: ['agents'],
        max_docs_per_run: 5,
        min_quality_results: 3,
        min_relevance_score: 0.8,
        max_iterations: 5,
        max_queries: 10,
        is_active: true,
        is_tracked: false,
        cadence: 'weekly',
        last_run_at: null,
        last_run_mode: null,
        last_signal_at: null,
        metadata: {},
        created_at: '2026-03-01T00:00:00.000Z',
        updated_at: '2026-03-04T00:00:00.000Z',
      },
    ]);
    mockCountTopicLinkedDocuments.mockResolvedValue(1);

    const { listReportReadyTopics } = await import('@/server/services/topicWorkflow.service');

    const readyTopics = await listReportReadyTopics(scope, 0);

    expect(readyTopics).toHaveLength(1);
    expect(mockCountTopicLinkedDocuments).toHaveBeenCalledWith(scope, 'topic-a');
  });
});

describe('topicWorkflow topics needing sources', () => {
  const scope = { workspaceId: 'workspace-1' };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetLatestReportForTopic.mockResolvedValue(null);
  });

  it('returns only active topics below the linked-document threshold', async () => {
    mockListSavedTopics.mockResolvedValue([
      {
        id: 'topic-a',
        name: 'Agents',
        goal: 'Track agent systems',
        focus_tags: ['agents'],
        max_docs_per_run: 5,
        min_quality_results: 3,
        min_relevance_score: 0.8,
        max_iterations: 5,
        max_queries: 10,
        is_active: true,
        is_tracked: false,
        cadence: 'weekly',
        last_run_at: null,
        last_run_mode: null,
        last_signal_at: null,
        metadata: {},
        created_at: '2026-03-01T00:00:00.000Z',
        updated_at: '2026-03-04T00:00:00.000Z',
      },
      {
        id: 'topic-b',
        name: 'Inference',
        goal: 'Track inference systems',
        focus_tags: ['inference'],
        max_docs_per_run: 5,
        min_quality_results: 3,
        min_relevance_score: 0.8,
        max_iterations: 5,
        max_queries: 10,
        is_active: true,
        is_tracked: false,
        cadence: 'weekly',
        last_run_at: null,
        last_run_mode: null,
        last_signal_at: null,
        metadata: {},
        created_at: '2026-03-01T00:00:00.000Z',
        updated_at: '2026-03-05T00:00:00.000Z',
      },
      {
        id: 'topic-c',
        name: 'Evaluation',
        goal: 'Track eval systems',
        focus_tags: ['evals'],
        max_docs_per_run: 5,
        min_quality_results: 3,
        min_relevance_score: 0.8,
        max_iterations: 5,
        max_queries: 10,
        is_active: true,
        is_tracked: false,
        cadence: 'weekly',
        last_run_at: null,
        last_run_mode: null,
        last_signal_at: null,
        metadata: {},
        created_at: '2026-03-01T00:00:00.000Z',
        updated_at: '2026-03-03T00:00:00.000Z',
      },
    ]);

    mockCountTopicLinkedDocuments.mockImplementation(
      async (_scope: { workspaceId: string }, topicId: string) => {
      if (topicId === 'topic-a') return 1;
      if (topicId === 'topic-b') return 3;
      return 0;
      },
    );

    mockGetLatestReportForTopic.mockImplementation(
      async (_scope: { workspaceId: string }, topicId: string) => {
      if (topicId === 'topic-a') {
        return { created_at: '2026-03-02T10:00:00.000Z' };
      }
      return null;
      },
    );

    const { listTopicsNeedingSources } = await import('@/server/services/topicWorkflow.service');

    const topics = await listTopicsNeedingSources(scope, 3);

    expect(mockListSavedTopics).toHaveBeenCalledWith(scope, { activeOnly: true });
    expect(topics).toEqual([
      expect.objectContaining({
        topic: expect.objectContaining({ id: 'topic-a', name: 'Agents' }),
        linkedDocumentCount: 1,
        lastReportAt: '2026-03-02T10:00:00.000Z',
      }),
      expect.objectContaining({
        topic: expect.objectContaining({ id: 'topic-c', name: 'Evaluation' }),
        linkedDocumentCount: 0,
        lastReportAt: null,
      }),
    ]);
  });

  it('returns an empty list when all active topics are report-ready', async () => {
    mockListSavedTopics.mockResolvedValue([
      {
        id: 'topic-a',
        name: 'Agents',
        goal: 'Track agent systems',
        focus_tags: ['agents'],
        max_docs_per_run: 5,
        min_quality_results: 3,
        min_relevance_score: 0.8,
        max_iterations: 5,
        max_queries: 10,
        is_active: true,
        is_tracked: false,
        cadence: 'weekly',
        last_run_at: null,
        last_run_mode: null,
        last_signal_at: null,
        metadata: {},
        created_at: '2026-03-01T00:00:00.000Z',
        updated_at: '2026-03-04T00:00:00.000Z',
      },
    ]);
    mockCountTopicLinkedDocuments.mockResolvedValue(3);

    const { listTopicsNeedingSources } = await import('@/server/services/topicWorkflow.service');

    await expect(listTopicsNeedingSources(scope, 3)).resolves.toEqual([]);
  });
});

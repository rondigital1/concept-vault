import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TEST_DAY } from '../helpers/fixtures';

const mockPipelineFlow = vi.hoisted(() => vi.fn());
const mockListTopicsNeedingSources = vi.hoisted(() => vi.fn());
const mockSetupTopicContext = vi.hoisted(() => vi.fn());

vi.mock('@/server/flows/pipeline.flow', () => ({
  pipelineFlow: mockPipelineFlow,
}));

vi.mock('@/server/services/topicWorkflow.service', () => ({
  listTopicsNeedingSources: mockListTopicsNeedingSources,
  setupTopicContext: mockSetupTopicContext,
  MIN_LINKED_DOCUMENTS_FOR_REPORT: 3,
}));

function pipelineResult(overrides: Record<string, unknown> = {}) {
  return {
    runId: 'run-1',
    status: 'ok',
    mode: 'scout_only',
    trigger: 'manual',
    counts: {
      docsTargeted: 0,
      docsCurated: 0,
      docsCurateFailed: 0,
      webProposals: 2,
      analyzedEvidence: 2,
      docsProcessed: 0,
      conceptsProposed: 0,
      flashcardsProposed: 0,
      topicLinksCreated: 0,
    },
    artifacts: {
      webProposalIds: ['artifact-1'],
      analysisArtifactIds: [],
      conceptIds: [],
      flashcardIds: [],
    },
    reportId: null,
    notionPageId: null,
    errors: [],
    ...overrides,
  };
}

describe('findSources service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSetupTopicContext.mockResolvedValue(undefined);
    mockListTopicsNeedingSources.mockResolvedValue([]);
    mockPipelineFlow.mockResolvedValue(pipelineResult());
  });

  it('refreshes topic context and delegates to pipelineFlow for a single topic', async () => {
    const { findSources } = await import('@/server/services/findSources.service');

    const result = await findSources({
      day: TEST_DAY,
      topicId: 'topic-1',
      minQualityResults: 4,
    });

    expect(mockSetupTopicContext).toHaveBeenCalledWith('topic-1');
    expect(mockPipelineFlow).toHaveBeenCalledWith(
      expect.objectContaining({
        day: TEST_DAY,
        topicId: 'topic-1',
        runMode: 'scout_only',
        trigger: 'manual',
        enableCategorization: true,
        minQualityResults: 4,
      }),
    );
    expect(result).toEqual(pipelineResult());
  });

  it('runs scout_only sequentially for each eligible topic and aggregates counts', async () => {
    mockListTopicsNeedingSources.mockResolvedValue([
      {
        topic: { id: 'topic-1', name: 'Agents' },
        linkedDocumentCount: 1,
        lastReportAt: null,
      },
      {
        topic: { id: 'topic-2', name: 'Inference' },
        linkedDocumentCount: 2,
        lastReportAt: null,
      },
    ]);
    mockPipelineFlow
      .mockResolvedValueOnce(
        pipelineResult({
          runId: 'run-topic-1',
          counts: {
            ...pipelineResult().counts,
            webProposals: 2,
          },
        }),
      )
      .mockResolvedValueOnce(
        pipelineResult({
          runId: 'run-topic-2',
          counts: {
            ...pipelineResult().counts,
            webProposals: 3,
          },
        }),
      );

    const { findSources } = await import('@/server/services/findSources.service');

    const result = await findSources({
      day: TEST_DAY,
      scope: 'all_topics',
      goal: 'ignore this for batch runs',
    });

    expect(mockListTopicsNeedingSources).toHaveBeenCalledWith(3);
    expect(mockSetupTopicContext).toHaveBeenNthCalledWith(1, 'topic-1');
    expect(mockSetupTopicContext).toHaveBeenNthCalledWith(2, 'topic-2');
    expect(mockPipelineFlow).toHaveBeenCalledTimes(2);
    expect(mockPipelineFlow.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        day: TEST_DAY,
        topicId: 'topic-1',
        runMode: 'scout_only',
      }),
    );
    expect(mockPipelineFlow.mock.calls[0]?.[0]?.goal).toBeUndefined();
    expect(result).toEqual({
      mode: 'batch',
      scope: 'all_topics',
      day: TEST_DAY,
      counts: {
        topicsEligible: 2,
        topicsProcessed: 2,
        topicsSucceeded: 2,
        topicsFailed: 0,
        webProposals: 5,
      },
      runs: [
        expect.objectContaining({
          topicId: 'topic-1',
          topicName: 'Agents',
          runId: 'run-topic-1',
          status: 'ok',
        }),
        expect.objectContaining({
          topicId: 'topic-2',
          topicName: 'Inference',
          runId: 'run-topic-2',
          status: 'ok',
        }),
      ],
    });
  });

  it('respects maxTopics when batching all eligible topics', async () => {
    mockListTopicsNeedingSources.mockResolvedValue([
      {
        topic: { id: 'topic-1', name: 'Agents' },
        linkedDocumentCount: 1,
        lastReportAt: null,
      },
      {
        topic: { id: 'topic-2', name: 'Inference' },
        linkedDocumentCount: 0,
        lastReportAt: null,
      },
    ]);

    const { findSources } = await import('@/server/services/findSources.service');

    const result = await findSources({
      day: TEST_DAY,
      scope: 'all_topics',
      maxTopics: 1,
    });

    expect(mockPipelineFlow).toHaveBeenCalledTimes(1);
    expect(result).toEqual(
      expect.objectContaining({
        counts: expect.objectContaining({
          topicsEligible: 2,
          topicsProcessed: 1,
        }),
      }),
    );
  });

  it('continues after per-topic failures and reports them in the batch summary', async () => {
    mockListTopicsNeedingSources.mockResolvedValue([
      {
        topic: { id: 'topic-1', name: 'Agents' },
        linkedDocumentCount: 1,
        lastReportAt: null,
      },
      {
        topic: { id: 'topic-2', name: 'Inference' },
        linkedDocumentCount: 0,
        lastReportAt: null,
      },
    ]);
    mockPipelineFlow
      .mockResolvedValueOnce(
        pipelineResult({
          runId: 'run-topic-1',
          counts: {
            ...pipelineResult().counts,
            webProposals: 1,
          },
        }),
      )
      .mockRejectedValueOnce(new Error('WebScout failed'));

    const { findSources } = await import('@/server/services/findSources.service');

    const result = await findSources({
      day: TEST_DAY,
      scope: 'all_topics',
    });

    expect(mockPipelineFlow).toHaveBeenCalledTimes(2);
    expect(result).toEqual(
      expect.objectContaining({
        counts: expect.objectContaining({
          topicsSucceeded: 1,
          topicsFailed: 1,
          webProposals: 1,
        }),
        runs: [
          expect.objectContaining({
            topicId: 'topic-1',
            status: 'ok',
          }),
          expect.objectContaining({
            topicId: 'topic-2',
            status: 'error',
            runId: null,
            errors: [expect.objectContaining({ message: 'WebScout failed' })],
          }),
        ],
      }),
    );
  });

  it('preserves the legacy global scout path when no topic or batch scope is provided', async () => {
    const { findSources } = await import('@/server/services/findSources.service');

    const result = await findSources({
      day: TEST_DAY,
      goal: 'memory techniques',
    });

    expect(mockListTopicsNeedingSources).not.toHaveBeenCalled();
    expect(mockSetupTopicContext).not.toHaveBeenCalled();
    expect(mockPipelineFlow).toHaveBeenCalledWith(
      expect.objectContaining({
        day: TEST_DAY,
        goal: 'memory techniques',
        runMode: 'scout_only',
      }),
    );
    expect(result).toEqual(pipelineResult());
  });
});

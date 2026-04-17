import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { sql } from '@/db';
import { cleanAllTables, closeTestDb, getTestWorkspaceScope, initTestSchema } from '../helpers/testDb';

const mockPipelineFlow = vi.hoisted(() => vi.fn());

vi.mock('@/server/flows/pipeline.flow', async () => {
  const actual = await vi.importActual<typeof import('@/server/flows/pipeline.flow')>(
    '@/server/flows/pipeline.flow',
  );

  return {
    ...actual,
    pipelineFlow: mockPipelineFlow,
  };
});

type JobRow = {
  id: string;
  run_id: string;
  status: 'queued' | 'running' | 'retrying' | 'succeeded' | 'failed';
  attempts: number;
  max_attempts: number;
  lease_expires_at: string | null;
  available_at: string;
};

describe('pipeline jobs', () => {
  beforeAll(async () => {
    await initTestSchema();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    await cleanAllTables();
    mockPipelineFlow.mockResolvedValue({
      runId: 'run-1',
      status: 'ok',
      mode: 'scout_only',
      trigger: 'manual',
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

  async function readJobs(): Promise<JobRow[]> {
    return sql<JobRow[]>`
      SELECT id, run_id, status, attempts, max_attempts, lease_expires_at, available_at
      FROM pipeline_jobs
      ORDER BY created_at ASC
    `;
  }

  it('reuses an existing queued job for the same idempotency key', async () => {
    const scope = await getTestWorkspaceScope();
    const { enqueuePipelineJob } = await import('@/server/jobs/pipelineJobs');

    const first = await enqueuePipelineJob({
      scope,
      route: '/api/runs/pipeline',
      input: {
        workspaceId: scope.workspaceId,
        topicId: 'topic-1',
        runMode: 'scout_only',
        idempotencyKey: 'same-key',
      },
    });

    const second = await enqueuePipelineJob({
      scope,
      route: '/api/runs/pipeline',
      input: {
        workspaceId: scope.workspaceId,
        topicId: 'topic-1',
        runMode: 'scout_only',
        idempotencyKey: 'same-key',
      },
    });

    expect(second).toMatchObject({
      jobId: first.jobId,
      runId: first.runId,
      reused: true,
    });

    const jobs = await readJobs();
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({
      id: first.jobId,
      run_id: first.runId,
      status: 'queued',
      attempts: 0,
    });
  });

  it('retries failed jobs and succeeds on a later worker pass', async () => {
    const scope = await getTestWorkspaceScope();
    const { drainPipelineJobQueue, enqueuePipelineJob } = await import('@/server/jobs/pipelineJobs');

    await enqueuePipelineJob({
      scope,
      route: '/api/runs/pipeline',
      input: {
        workspaceId: scope.workspaceId,
        topicId: 'topic-1',
        runMode: 'scout_only',
      },
    });

    mockPipelineFlow.mockRejectedValueOnce(new Error('worker failed once'));

    const firstDrain = await drainPipelineJobQueue({ maxJobs: 1, workerId: 'worker-a' });
    expect(firstDrain).toMatchObject({
      processed: 1,
      completed: 0,
      retried: 1,
      failed: 0,
    });

    let jobs = await readJobs();
    expect(jobs[0]).toMatchObject({
      status: 'retrying',
      attempts: 1,
      max_attempts: 3,
    });

    await sql`
      UPDATE pipeline_jobs
      SET available_at = now() - interval '1 second'
      WHERE id = ${jobs[0].id}
    `;

    const secondDrain = await drainPipelineJobQueue({ maxJobs: 1, workerId: 'worker-b' });
    expect(secondDrain).toMatchObject({
      processed: 1,
      completed: 1,
      retried: 0,
      failed: 0,
    });

    jobs = await readJobs();
    expect(jobs[0]).toMatchObject({
      status: 'succeeded',
      attempts: 2,
    });
    expect(mockPipelineFlow).toHaveBeenCalledTimes(2);
  });

  it('does not allow duplicate acquisition while a lease is active', async () => {
    const scope = await getTestWorkspaceScope();
    const { drainPipelineJobQueue, enqueuePipelineJob } = await import('@/server/jobs/pipelineJobs');

    await enqueuePipelineJob({
      scope,
      route: '/api/runs/pipeline',
      input: {
        workspaceId: scope.workspaceId,
        topicId: 'topic-1',
        runMode: 'scout_only',
      },
    });

    let releaseAttempt: (() => void) | null = null;
    mockPipelineFlow.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          releaseAttempt = () =>
            resolve({
              runId: 'run-1',
              status: 'ok',
              mode: 'scout_only',
              trigger: 'manual',
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
        }),
    );

    const firstDrainPromise = drainPipelineJobQueue({ maxJobs: 1, workerId: 'worker-a' });
    await new Promise((resolve) => setTimeout(resolve, 25));
    const secondDrain = await drainPipelineJobQueue({ maxJobs: 1, workerId: 'worker-b' });

    expect(secondDrain).toMatchObject({
      processed: 0,
      completed: 0,
      retried: 0,
      failed: 0,
    });

    releaseAttempt?.();
    const firstDrain = await firstDrainPromise;
    expect(firstDrain.processed).toBe(1);
    expect(mockPipelineFlow).toHaveBeenCalledTimes(1);
  });

  it('re-acquires stalled running jobs after the lease expires', async () => {
    const scope = await getTestWorkspaceScope();
    const { drainPipelineJobQueue, enqueuePipelineJob } = await import('@/server/jobs/pipelineJobs');

    const queued = await enqueuePipelineJob({
      scope,
      route: '/api/runs/pipeline',
      input: {
        workspaceId: scope.workspaceId,
        topicId: 'topic-1',
        runMode: 'scout_only',
      },
    });

    await sql`
      UPDATE pipeline_jobs
      SET
        status = 'running',
        attempts = 1,
        leased_at = now() - interval '10 minutes',
        lease_expires_at = now() - interval '1 minute',
        worker_id = 'stalled-worker'
      WHERE id = ${queued.jobId}
    `;

    const drain = await drainPipelineJobQueue({ maxJobs: 1, workerId: 'recovery-worker' });
    expect(drain).toMatchObject({
      processed: 1,
      completed: 1,
      retried: 0,
      failed: 0,
    });

    const jobs = await readJobs();
    expect(jobs[0]).toMatchObject({
      id: queued.jobId,
      status: 'succeeded',
      attempts: 2,
    });
    expect(mockPipelineFlow).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: scope.workspaceId,
        topicId: 'topic-1',
        runMode: 'scout_only',
      }),
      expect.objectContaining({
        runId: queued.runId,
        skipIdempotencyLookup: true,
      }),
    );
  });
});

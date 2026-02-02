/**
 * Integration tests for run tracing (observability).
 * 
 * Tests:
 * - createRun() / finishRun() lifecycle
 * - appendStep() ordering and status handling
 * - getRunTrace() retrieval
 * - partial vs error vs ok conditions
 * 
 * Requires: Docker Postgres running
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  initTestSchema,
  cleanAllTables,
  closeTestDb,
} from '../helpers/testDb';
import {
  createRun,
  appendStep,
  finishRun,
  getRunTrace,
} from '@/server/observability/runTrace.store';

describe('Run Tracing (Observability)', () => {
  beforeAll(async () => {
    await initTestSchema();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await cleanAllTables();
  });

  describe('createRun', () => {
    it('should create a run with running status', async () => {
      const runId = await createRun('distill');

      expect(runId).toBeDefined();
      expect(typeof runId).toBe('string');
      expect(runId).toMatch(/^[0-9a-f-]{36}$/); // UUID format

      const trace = await getRunTrace(runId);
      expect(trace).not.toBeNull();
      expect(trace!.status).toBe('running');
      expect(trace!.kind).toBe('distill');
    });

    it('should create runs of different kinds', async () => {
      const distillId = await createRun('distill');
      const curateId = await createRun('curate');
      const webScoutId = await createRun('webScout');

      const distillTrace = await getRunTrace(distillId);
      const curateTrace = await getRunTrace(curateId);
      const webScoutTrace = await getRunTrace(webScoutId);

      expect(distillTrace!.kind).toBe('distill');
      expect(curateTrace!.kind).toBe('curate');
      expect(webScoutTrace!.kind).toBe('webScout');
    });

    it('should set startedAt timestamp', async () => {
      const runId = await createRun('distill');
      const trace = await getRunTrace(runId);

      expect(trace!.startedAt).toBeDefined();
      // Should be a valid ISO date string
      expect(new Date(trace!.startedAt).toISOString()).toBe(trace!.startedAt);
    });
  });

  describe('appendStep', () => {
    it('should append a step to a run', async () => {
      const runId = await createRun('distill');

      await appendStep(runId, {
        timestamp: new Date().toISOString(),
        type: 'flow',
        name: 'distill',
        status: 'running',
        input: { day: '2025-01-15' },
      });

      const trace = await getRunTrace(runId);
      expect(trace!.steps).toHaveLength(1);
      expect(trace!.steps[0].name).toBe('distill');
      expect(trace!.steps[0].status).toBe('running');
    });

    it('should append multiple steps in order', async () => {
      const runId = await createRun('distill');

      await appendStep(runId, {
        timestamp: new Date().toISOString(),
        type: 'flow',
        name: 'step1',
        status: 'running',
      });

      await appendStep(runId, {
        timestamp: new Date().toISOString(),
        type: 'agent',
        name: 'step2',
        status: 'ok',
      });

      await appendStep(runId, {
        timestamp: new Date().toISOString(),
        type: 'llm',
        name: 'step3',
        status: 'ok',
      });

      const trace = await getRunTrace(runId);
      expect(trace!.steps).toHaveLength(3);
      expect(trace!.steps.map(s => s.name)).toEqual(['step1', 'step2', 'step3']);
    });

    it('should store input and output as JSONB', async () => {
      const runId = await createRun('distill');

      const inputData = { day: '2025-01-15', documentIds: ['doc1', 'doc2'] };
      const outputData = { count: 5, items: [{ id: 'item1' }] };

      await appendStep(runId, {
        timestamp: new Date().toISOString(),
        type: 'flow',
        name: 'test_step',
        status: 'ok',
        input: inputData,
        output: outputData,
      });

      const trace = await getRunTrace(runId);
      expect(trace!.steps[0].input).toEqual(inputData);
      expect(trace!.steps[0].output).toEqual(outputData);
    });

    it('should store error information', async () => {
      const runId = await createRun('distill');

      await appendStep(runId, {
        timestamp: new Date().toISOString(),
        type: 'flow',
        name: 'failing_step',
        status: 'error',
        error: { message: 'Something went wrong', code: 'ERR_FAILED' },
      });

      const trace = await getRunTrace(runId);
      expect(trace!.steps[0].status).toBe('error');
      expect(trace!.steps[0].error).toEqual({ message: 'Something went wrong', code: 'ERR_FAILED' });
    });

    it('should throw when run does not exist', async () => {
      const fakeRunId = '00000000-0000-0000-0000-000000000000';

      await expect(appendStep(fakeRunId, {
        timestamp: new Date().toISOString(),
        type: 'flow',
        name: 'step',
        status: 'running',
      })).rejects.toThrow(`Run ${fakeRunId} not found`);
    });

    it('should store token estimates', async () => {
      const runId = await createRun('distill');

      await appendStep(runId, {
        timestamp: new Date().toISOString(),
        type: 'llm',
        name: 'llm_call',
        status: 'ok',
        tokenEstimate: 1500,
      });

      const trace = await getRunTrace(runId);
      expect(trace!.steps[0].tokenEstimate).toBe(1500);
    });
  });

  describe('finishRun', () => {
    it('should transition status to ok', async () => {
      const runId = await createRun('distill');

      await finishRun(runId, 'ok');

      const trace = await getRunTrace(runId);
      expect(trace!.status).toBe('ok');
      expect(trace!.completedAt).toBeDefined();
    });

    it('should transition status to error', async () => {
      const runId = await createRun('distill');

      await finishRun(runId, 'error');

      const trace = await getRunTrace(runId);
      expect(trace!.status).toBe('error');
    });

    it('should transition status to partial', async () => {
      const runId = await createRun('distill');

      await finishRun(runId, 'partial');

      const trace = await getRunTrace(runId);
      expect(trace!.status).toBe('partial');
    });

    it('should throw when run does not exist', async () => {
      const fakeRunId = '00000000-0000-0000-0000-000000000000';

      await expect(finishRun(fakeRunId, 'ok')).rejects.toThrow(`Run ${fakeRunId} not found`);
    });

    it('should set ended_at timestamp', async () => {
      const runId = await createRun('distill');

      const beforeFinish = await getRunTrace(runId);
      expect(beforeFinish!.completedAt).toBeUndefined();

      await finishRun(runId, 'ok');

      const afterFinish = await getRunTrace(runId);
      expect(afterFinish!.completedAt).toBeDefined();
    });
  });

  describe('getRunTrace', () => {
    it('should return null for non-existent run', async () => {
      const fakeRunId = '00000000-0000-0000-0000-000000000000';
      const trace = await getRunTrace(fakeRunId);

      expect(trace).toBeNull();
    });

    it('should return complete trace with all steps', async () => {
      const runId = await createRun('webScout');

      await appendStep(runId, {
        timestamp: new Date().toISOString(),
        type: 'flow',
        name: 'webScout',
        status: 'running',
        input: { mode: 'explicit-query', query: 'test' },
      });

      await appendStep(runId, {
        timestamp: new Date().toISOString(),
        type: 'agent',
        name: 'prepareQueries',
        status: 'ok',
        output: { queries: ['test query'] },
      });

      await appendStep(runId, {
        timestamp: new Date().toISOString(),
        type: 'tool',
        name: 'tavily_search',
        status: 'ok',
        output: { results: [] },
      });

      await finishRun(runId, 'ok');

      const trace = await getRunTrace(runId);

      expect(trace).not.toBeNull();
      expect(trace!.id).toBe(runId);
      expect(trace!.kind).toBe('webScout');
      expect(trace!.status).toBe('ok');
      expect(trace!.steps).toHaveLength(3);
      expect(trace!.startedAt).toBeDefined();
      expect(trace!.completedAt).toBeDefined();
    });

    it('should order steps by started_at', async () => {
      const runId = await createRun('distill');

      // Add steps with slight time differences (using fake timers, they'll have same time)
      await appendStep(runId, { timestamp: new Date().toISOString(), type: 'flow', name: 'first', status: 'running' });
      await appendStep(runId, { timestamp: new Date().toISOString(), type: 'flow', name: 'second', status: 'ok' });
      await appendStep(runId, { timestamp: new Date().toISOString(), type: 'flow', name: 'third', status: 'ok' });

      const trace = await getRunTrace(runId);

      // Steps should be ordered by started_at ASC
      expect(trace!.steps[0].name).toBe('first');
      expect(trace!.steps[1].name).toBe('second');
      expect(trace!.steps[2].name).toBe('third');
    });
  });

  describe('complete flow simulation', () => {
    it('should track a successful distill flow', async () => {
      const runId = await createRun('distill');

      // Flow start
      await appendStep(runId, {
        timestamp: new Date().toISOString(),
        type: 'flow',
        name: 'distill',
        status: 'running',
        input: { day: '2025-01-15', limit: 5 },
      });

      // Agent steps
      await appendStep(runId, {
        timestamp: new Date().toISOString(),
        type: 'agent',
        name: 'fetchDocuments',
        status: 'ok',
        output: { documentsFound: 3 },
      });

      await appendStep(runId, {
        timestamp: new Date().toISOString(),
        type: 'llm',
        name: 'extractConcepts',
        status: 'ok',
        tokenEstimate: 500,
        output: { conceptsExtracted: 5 },
      });

      await appendStep(runId, {
        timestamp: new Date().toISOString(),
        type: 'llm',
        name: 'generateFlashcards',
        status: 'ok',
        tokenEstimate: 800,
        output: { flashcardsGenerated: 10 },
      });

      // Flow complete
      await appendStep(runId, {
        timestamp: new Date().toISOString(),
        type: 'flow',
        name: 'distill',
        status: 'ok',
        output: { docsProcessed: 3, conceptsProposed: 5, flashcardsProposed: 10 },
      });

      await finishRun(runId, 'ok');

      const trace = await getRunTrace(runId);

      expect(trace!.status).toBe('ok');
      expect(trace!.steps).toHaveLength(5);

      // Verify token estimates
      const tokenSteps = trace!.steps.filter(s => s.tokenEstimate);
      expect(tokenSteps).toHaveLength(2);
    });

    it('should track a failed flow with error step', async () => {
      const runId = await createRun('webScout');

      await appendStep(runId, {
        timestamp: new Date().toISOString(),
        type: 'flow',
        name: 'webScout',
        status: 'running',
      });

      await appendStep(runId, {
        timestamp: new Date().toISOString(),
        type: 'tool',
        name: 'tavily_search',
        status: 'error',
        error: { message: 'Rate limit exceeded', code: 'RATE_LIMITED' },
      });

      await appendStep(runId, {
        timestamp: new Date().toISOString(),
        type: 'flow',
        name: 'webScout',
        status: 'error',
        error: { message: 'Search failed' },
      });

      await finishRun(runId, 'error');

      const trace = await getRunTrace(runId);

      expect(trace!.status).toBe('error');
      expect(trace!.steps.filter(s => s.status === 'error')).toHaveLength(2);
    });

    it('should track a partial success flow', async () => {
      const runId = await createRun('distill');

      await appendStep(runId, {
        timestamp: new Date().toISOString(),
        type: 'flow',
        name: 'distill',
        status: 'running',
      });

      // First document succeeds
      await appendStep(runId, {
        timestamp: new Date().toISOString(),
        type: 'agent',
        name: 'processDoc1',
        status: 'ok',
      });

      // Second document fails
      await appendStep(runId, {
        timestamp: new Date().toISOString(),
        type: 'agent',
        name: 'processDoc2',
        status: 'error',
        error: { message: 'LLM timeout' },
      });

      // Third document succeeds
      await appendStep(runId, {
        timestamp: new Date().toISOString(),
        type: 'agent',
        name: 'processDoc3',
        status: 'ok',
      });

      await finishRun(runId, 'partial');

      const trace = await getRunTrace(runId);

      expect(trace!.status).toBe('partial');
      expect(trace!.steps.filter(s => s.status === 'ok')).toHaveLength(2);
      expect(trace!.steps.filter(s => s.status === 'error')).toHaveLength(1);
    });
  });
});

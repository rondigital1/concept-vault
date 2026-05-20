import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { sql } from '@/db';
import { appendStep, createRun, finishRun } from '@/server/observability/runTrace.store';
import { getAgentsView } from '@/server/services/agents.service';
import {
  cleanAllTables,
  closeTestDb,
  getTestWorkspaceScope,
  initTestSchema,
  insertTestArtifact,
} from '../helpers/testDb';

describe('agents service', () => {
  let scope: { workspaceId: string };

  beforeAll(async () => {
    await initTestSchema();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await cleanAllTables();
    scope = await getTestWorkspaceScope();
  });

  it('aggregates live registry metrics and selected run detail from run traces', async () => {
    const run1 = await createRun(scope, 'pipeline', { runMode: 'full_report' });
    const run1Start = new Date(Date.now() - 5 * 60 * 1000);
    const run1End = new Date(run1Start.getTime() + 2 * 60 * 1000);
    await sql`UPDATE runs SET started_at = ${run1Start.toISOString()} WHERE id = ${run1}`;
    await appendStep(run1, {
      timestamp: run1Start.toISOString(),
      type: 'flow',
      name: 'pipeline_curate',
      status: 'running',
      startedAt: run1Start.toISOString(),
    });
    await appendStep(run1, {
      timestamp: run1Start.toISOString(),
      type: 'flow',
      name: 'pipeline_curate',
      status: 'ok',
      startedAt: run1Start.toISOString(),
      endedAt: new Date(run1Start.getTime() + 15_000).toISOString(),
      output: {
        docsCurated: 2,
        topicLinksCreated: 1,
      },
    });
    await appendStep(run1, {
      timestamp: new Date(run1Start.getTime() + 20_000).toISOString(),
      type: 'flow',
      name: 'pipeline_webscout',
      status: 'ok',
      startedAt: new Date(run1Start.getTime() + 20_000).toISOString(),
      endedAt: new Date(run1Start.getTime() + 50_000).toISOString(),
      output: {
        counts: {
          proposalsCreated: 1,
          resultsEvaluated: 4,
        },
        terminationReason: 'satisfied',
      },
    });
    await appendStep(run1, {
      timestamp: new Date(run1Start.getTime() + 60_000).toISOString(),
      type: 'flow',
      name: 'pipeline_distill',
      status: 'ok',
      startedAt: new Date(run1Start.getTime() + 60_000).toISOString(),
      endedAt: new Date(run1Start.getTime() + 90_000).toISOString(),
      output: {
        docsProcessed: 1,
        conceptsProposed: 2,
        flashcardsProposed: 3,
      },
    });
    await appendStep(run1, {
      timestamp: new Date(run1Start.getTime() + 100_000).toISOString(),
      type: 'flow',
      name: 'pipeline_synthesize',
      status: 'skipped',
      startedAt: new Date(run1Start.getTime() + 100_000).toISOString(),
    });
    await finishRun(run1, 'ok');
    await sql`UPDATE runs SET ended_at = ${run1End.toISOString()} WHERE id = ${run1}`;
    await insertTestArtifact({
      workspaceId: scope.workspaceId,
      runId: run1,
      agent: 'research',
      kind: 'research-report',
      title: 'Report',
      status: 'approved',
    });

    const run2 = await createRun(scope, 'pipeline', { runMode: 'scout_only' });
    const run2Start = new Date(Date.now() - 15 * 60 * 1000);
    const run2End = new Date(run2Start.getTime() + 60_000);
    await sql`UPDATE runs SET started_at = ${run2Start.toISOString()} WHERE id = ${run2}`;
    await appendStep(run2, {
      timestamp: run2Start.toISOString(),
      type: 'flow',
      name: 'pipeline_webscout',
      status: 'error',
      startedAt: run2Start.toISOString(),
      endedAt: run2End.toISOString(),
      error: {
        message: 'Scout failed',
      },
    });
    await finishRun(run2, 'error');
    await sql`UPDATE runs SET ended_at = ${run2End.toISOString()} WHERE id = ${run2}`;

    const run3 = await createRun(scope, 'pipeline', { runMode: 'concept_only' });
    const run3Start = new Date(Date.now() - 2 * 60 * 1000);
    const run3End = new Date(run3Start.getTime() + 1_000);
    await sql`UPDATE runs SET started_at = ${run3Start.toISOString()} WHERE id = ${run3}`;
    await appendStep(run3, {
      timestamp: run3Start.toISOString(),
      type: 'flow',
      name: 'pipeline_webscout',
      status: 'skipped',
      startedAt: run3Start.toISOString(),
    });
    await finishRun(run3, 'ok');
    await sql`UPDATE runs SET ended_at = ${run3End.toISOString()} WHERE id = ${run3}`;

    const view = await getAgentsView(scope, { selectedRunId: run1 });

    const pipelineEntry = view.agentRegistry.find((entry) => entry.key === 'pipeline');
    const curatorEntry = view.agentRegistry.find((entry) => entry.key === 'curator');
    const webScoutEntry = view.agentRegistry.find((entry) => entry.key === 'webScout');
    const distillerEntry = view.agentRegistry.find((entry) => entry.key === 'distiller');

    expect(pipelineEntry?.successRate).toBeCloseTo(2 / 3);
    expect(pipelineEntry?.outputMetrics).toEqual([
      { label: 'Runs · 30d', value: '3' },
      { label: 'Reports · 30d', value: '1' },
      { label: 'Errors · 30d', value: '1' },
    ]);
    expect(curatorEntry?.outputMetrics[0]).toEqual({
      label: 'Docs curated · 30d',
      value: '2',
    });
    expect(webScoutEntry?.auxiliaryLabel).toBe('Termination: satisfied');
    expect(new Date(webScoutEntry?.lastStartedAt ?? '').toISOString()).toBe(
      new Date(run1Start.getTime() + 20_000).toISOString(),
    );
    expect(distillerEntry?.outputMetrics[2]).toEqual({
      label: 'Flashcards · 30d',
      value: '3',
    });
    expect(view.selectedRun?.stages.map((stage) => stage.label)).toEqual([
      'Curate',
      'WebScout',
      'Distill',
      'Synthesize',
    ]);
    expect(view.selectedRun?.stages.map((stage) => stage.status)).toEqual([
      'ok',
      'ok',
      'ok',
      'skipped',
    ]);
    expect(view.selectedRun?.stages.at(-1)?.durationMs).toBe(20_000);
    expect(view.executionEvents).toHaveLength(3);
  });
});

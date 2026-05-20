import { describe, expect, it } from 'vitest';
import { DEFAULT_AGENT_PROFILE_SETTINGS } from '@/server/agents/configuration';
import {
  buildComposerState,
  toSelectedRunDetail,
  updateComposerField,
  updateNestedProfile,
} from '@/app/agents/workspaceState';
import type { AgentTopicOption, RecentRunSummary } from '@/lib/agentsWorkspaceTypes';
import type { RunTracePayload } from '@/lib/runApiClient';

const topic: AgentTopicOption = {
  id: 'topic-1',
  name: 'AI systems',
  goal: 'Track agent workflow research',
  focusTags: ['agents'],
  linkedDocumentCount: 2,
  lastRunAt: null,
  lastRunMode: null,
  isTracked: true,
  isActive: true,
  cadence: 'daily',
  workflowSettings: {
    defaultRunMode: 'scout_only',
    enableCategorizationByDefault: true,
    skipPublishByDefault: true,
    maxDocsPerRun: 3,
    minQualityResults: 5,
    minRelevanceScore: 0.9,
    maxIterations: 7,
    maxQueries: 12,
  },
};

describe('agents workspace state helpers', () => {
  it('builds launch composer state from topic overrides before global defaults', () => {
    expect(buildComposerState(topic, DEFAULT_AGENT_PROFILE_SETTINGS)).toMatchObject({
      runMode: 'scout_only',
      goal: 'Track agent workflow research',
      enableCategorization: true,
      skipPublish: true,
      maxDocsPerRun: 3,
      minQualityResults: 5,
      minRelevanceScore: 0.9,
      maxIterations: 7,
      maxQueries: 12,
    });
  });

  it('updates nested profile and composer fields without dropping sibling state', () => {
    const nextProfiles = updateNestedProfile(
      DEFAULT_AGENT_PROFILE_SETTINGS,
      'webScout.maxQueries',
      18,
    );
    const composer = updateComposerField(
      buildComposerState(null, DEFAULT_AGENT_PROFILE_SETTINGS),
      'skipPublish',
      true,
    );

    expect(nextProfiles.webScout.maxQueries).toBe(18);
    expect(nextProfiles.webScout.maxIterations).toBe(
      DEFAULT_AGENT_PROFILE_SETTINGS.webScout.maxIterations,
    );
    expect(composer.skipPublish).toBe(true);
    expect(composer.runMode).toBe(DEFAULT_AGENT_PROFILE_SETTINGS.pipeline.defaultRunMode);
    expect(updateComposerField(composer, 'runMode', 'skip').runMode).toBe('skip');
  });

  it('maps trace and results into selected run detail for the inspector', () => {
    const trace: RunTracePayload = {
      id: 'run-1',
      kind: 'pipeline',
      status: 'partial',
      startedAt: '2026-05-19T12:00:00.000Z',
      completedAt: '2026-05-19T12:03:00.000Z',
      steps: [
        {
          name: 'pipeline_webscout',
          status: 'error',
          startedAt: '2026-05-19T12:01:00.000Z',
          endedAt: '2026-05-19T12:02:00.000Z',
          input: null,
          output: null,
          error: { message: 'Scout failed' },
        },
      ],
    };
    const fallbackRun: RecentRunSummary = {
      id: 'run-1',
      kind: 'pipeline',
      status: 'running',
      startedAt: trace.startedAt,
      endedAt: null,
      durationMs: null,
      topicId: 'topic-1',
      topicName: 'AI systems',
      runMode: 'full_report',
      stageProgress: [],
      lastError: null,
    };

    const selectedRun = toSelectedRunDetail(
      trace,
      {
        runId: 'run-1',
        status: 'partial',
        mode: 'scout_only',
        errors: ['Result warning'],
        report: { id: 'report-1' },
        concepts: [{ id: 'concept-1' }],
        sources: [{ id: 'source-1' }, { id: 'source-2' }],
        flashcards: [{ id: 'flashcard-1' }],
      },
      fallbackRun,
    );

    expect(selectedRun.topicName).toBe('AI systems');
    expect(selectedRun.runMode).toBe('scout_only');
    expect(selectedRun.lastError).toBe('Scout failed');
    expect(selectedRun.results).toMatchObject({
      reportId: 'report-1',
      conceptCount: 1,
      flashcardCount: 1,
      sourceCount: 2,
      errors: ['Result warning'],
    });
    expect(selectedRun.stages[0]).toMatchObject({
      label: 'WebScout',
      agentKey: 'pipeline',
      status: 'error',
    });
  });

  it('collapses append-only running and final step events in selected run detail', () => {
    const trace: RunTracePayload = {
      id: 'run-2',
      kind: 'pipeline',
      status: 'ok',
      startedAt: '2026-05-19T12:00:00.000Z',
      completedAt: '2026-05-19T12:00:01.000Z',
      steps: [
        {
          name: 'pipeline',
          status: 'running',
          startedAt: '2026-05-19T12:00:00.000Z',
        },
        {
          name: 'pipeline_resolve_targets',
          status: 'running',
          startedAt: '2026-05-19T12:00:00.010Z',
        },
        {
          name: 'pipeline_resolve_targets',
          status: 'ok',
          startedAt: '2026-05-19T12:00:00.010Z',
          endedAt: '2026-05-19T12:00:00.200Z',
        },
        {
          name: 'pipeline_distill',
          status: 'running',
          startedAt: '2026-05-19T12:00:00.300Z',
        },
        {
          name: 'pipeline_distill',
          status: 'skipped',
          startedAt: '2026-05-19T12:00:00.300Z',
        },
        {
          name: 'pipeline',
          status: 'ok',
          startedAt: '2026-05-19T12:00:00.000Z',
          endedAt: '2026-05-19T12:00:01.000Z',
        },
      ],
    };

    const selectedRun = toSelectedRunDetail(
      trace,
      {
        runId: 'run-2',
        status: 'ok',
        mode: 'concept_only',
        errors: [],
        report: null,
        concepts: [],
        sources: [],
        flashcards: [],
      },
      null,
    );

    expect(selectedRun.stages).toHaveLength(3);
    expect(selectedRun.stages.map((stage) => stage.status)).toEqual(['ok', 'ok', 'skipped']);
    expect(selectedRun.stages[2]).toMatchObject({
      endedAt: '2026-05-19T12:00:01.000Z',
      durationMs: 700,
    });
    expect(selectedRun.stageProgress.find((stage) => stage.id === 'resolve_targets')?.status).toBe('done');
    expect(selectedRun.stageProgress.find((stage) => stage.id === 'distill')?.status).toBe('skipped');
  });
});

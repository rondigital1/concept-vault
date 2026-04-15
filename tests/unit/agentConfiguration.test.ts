import { describe, expect, it } from 'vitest';
import {
  DEFAULT_AGENT_PROFILE_SETTINGS,
  hydrateAgentProfileMap,
  resolveTopicWorkflowSettings,
} from '@/server/agents/configuration';

describe('agent configuration defaults', () => {
  it('hydrates invalid profile values back to safe defaults', () => {
    const settings = hydrateAgentProfileMap({
      pipeline: {
        defaultRunMode: 'unsupported',
        enableAutoDistillOnIngest: 'yes',
        skipPublishByDefault: true,
      },
      curator: {
        enableCategorizationByDefault: true,
      },
      webScout: {
        minQualityResults: 99,
        minRelevanceScore: -0.4,
        maxIterations: 0,
        maxQueries: 500,
      },
      distiller: {
        maxDocsPerRun: 0,
      },
    });

    expect(settings.pipeline.defaultRunMode).toBe(DEFAULT_AGENT_PROFILE_SETTINGS.pipeline.defaultRunMode);
    expect(settings.pipeline.enableAutoDistillOnIngest).toBe(
      DEFAULT_AGENT_PROFILE_SETTINGS.pipeline.enableAutoDistillOnIngest,
    );
    expect(settings.pipeline.skipPublishByDefault).toBe(true);
    expect(settings.curator.enableCategorizationByDefault).toBe(true);
    expect(settings.webScout.minQualityResults).toBe(20);
    expect(settings.webScout.minRelevanceScore).toBe(0);
    expect(settings.webScout.maxIterations).toBe(1);
    expect(settings.webScout.maxQueries).toBe(50);
    expect(settings.distiller.maxDocsPerRun).toBe(1);
  });

  it('merges topic workflow metadata with global defaults when topic values are absent', () => {
    const profiles = hydrateAgentProfileMap({
      pipeline: {
        defaultRunMode: 'incremental_update',
        enableAutoDistillOnIngest: false,
        skipPublishByDefault: true,
      },
      curator: {
        enableCategorizationByDefault: false,
      },
      webScout: {
        minQualityResults: 6,
        minRelevanceScore: 0.92,
        maxIterations: 7,
        maxQueries: 12,
      },
      distiller: {
        maxDocsPerRun: 9,
      },
    });

    const workflow = resolveTopicWorkflowSettings({
      maxDocsPerRun: Number.NaN,
      minQualityResults: Number.NaN,
      minRelevanceScore: Number.NaN,
      maxIterations: Number.NaN,
      maxQueries: Number.NaN,
      metadata: {
        workflowSettings: {
          enableCategorizationByDefault: true,
        },
      },
      profiles,
    });

    expect(workflow.defaultRunMode).toBe('incremental_update');
    expect(workflow.enableCategorizationByDefault).toBe(true);
    expect(workflow.skipPublishByDefault).toBe(true);
    expect(workflow.maxDocsPerRun).toBe(9);
    expect(workflow.minQualityResults).toBe(6);
    expect(workflow.minRelevanceScore).toBe(0.92);
    expect(workflow.maxIterations).toBe(7);
    expect(workflow.maxQueries).toBe(12);
  });
});

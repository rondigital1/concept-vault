import { describe, expect, it } from 'vitest';
import {
  formatObservedStepLabel,
  parseObservedAgentKey,
  summarizeStageProgress,
} from '@/lib/agentRunPresentation';

describe('agent run presentation helpers', () => {
  it('maps observed steps to stable labels and agent keys', () => {
    expect(formatObservedStepLabel('pipeline_persist_publish')).toBe('Persist & Publish');
    expect(formatObservedStepLabel('pipeline_webscout')).toBe('WebScout');
    expect(parseObservedAgentKey('webscout_refine_query', 'webScout')).toBe('webScout');
    expect(parseObservedAgentKey('distiller_extract_concepts', 'distill')).toBe('distiller');
  });

  it('summarizes pipeline stage progress using shared stage ordering', () => {
    const stages = summarizeStageProgress([
      { name: 'pipeline_resolve_targets', status: 'ok' },
      { name: 'pipeline_curate', status: 'ok' },
      { name: 'pipeline_webscout', status: 'running' },
      { name: 'pipeline_distill', status: 'error' },
    ]);

    expect(stages.find((stage) => stage.id === 'resolve_targets')?.status).toBe('done');
    expect(stages.find((stage) => stage.id === 'curate')?.status).toBe('done');
    expect(stages.find((stage) => stage.id === 'webscout')?.status).toBe('running');
    expect(stages.find((stage) => stage.id === 'distill')?.status).toBe('error');
    expect(stages.find((stage) => stage.id === 'synthesize')?.status).toBe('pending');
  });
});

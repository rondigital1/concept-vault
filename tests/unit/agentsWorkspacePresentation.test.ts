import { describe, expect, it } from 'vitest';
import {
  formatCadenceLabel,
  formatRunDescriptor,
  formatTopicScopeLabel,
  resolveAgentStateStatus,
  resolveStageProgressStatus,
} from '@/app/agents/presentation';

describe('agents workspace presentation helpers', () => {
  it('formats run descriptors from run modes and fallback kinds', () => {
    expect(formatRunDescriptor('full_report', 'pipeline')).toBe('Full Report');
    expect(formatRunDescriptor(null, 'webScout')).toBe('WebScout');
  });

  it('maps registry and stage states onto shared badge statuses', () => {
    expect(resolveAgentStateStatus('live')).toBe('running');
    expect(resolveAgentStateStatus('idle')).toBe('pending');
    expect(resolveStageProgressStatus('done')).toBe('ok');
    expect(resolveStageProgressStatus('error')).toBe('error');
  });

  it('formats topic scope and cadence copy for the local shell', () => {
    expect(formatTopicScopeLabel(null)).toBe('Global scope');
    expect(formatTopicScopeLabel('AI systems')).toBe('AI systems');
    expect(formatCadenceLabel('daily')).toBe('Daily cadence');
    expect(formatCadenceLabel('weekly')).toBe('Weekly cadence');
  });
});

import { describe, expect, it } from 'vitest';
import { buildAgentCapabilityCards } from '@/app/agents/capabilityPresentation';
import type { AgentRegistryEntry, RecentRunSummary } from '@/lib/agentsWorkspaceTypes';

function agentEntry(overrides: Partial<AgentRegistryEntry>): AgentRegistryEntry {
  return {
    key: 'pipeline',
    name: 'Pipeline',
    description: 'Pipeline orchestration',
    badges: [],
    state: 'idle',
    stateLabel: 'Idle',
    liveRunId: null,
    lastStartedAt: null,
    lastEndedAt: null,
    averageDurationMs: null,
    successRate: null,
    outputMetrics: [{ label: 'Runs · 30d', value: '3' }],
    auxiliaryLabel: null,
    ...overrides,
  };
}

function recentRun(overrides: Partial<RecentRunSummary>): RecentRunSummary {
  return {
    id: 'run-1',
    kind: 'pipeline',
    status: 'ok',
    startedAt: '2026-05-19T12:00:00.000Z',
    endedAt: '2026-05-19T12:02:00.000Z',
    durationMs: 120000,
    topicId: null,
    topicName: null,
    runMode: 'full_report',
    stageProgress: [],
    lastError: null,
    ...overrides,
  };
}

describe('buildAgentCapabilityCards', () => {
  it('exposes explicit intake, every registered agent, review, and observability lanes', () => {
    const cards = buildAgentCapabilityCards(
      [
        agentEntry({ key: 'pipeline', name: 'Pipeline' }),
        agentEntry({ key: 'curator', name: 'Curator' }),
        agentEntry({ key: 'webScout', name: 'WebScout' }),
        agentEntry({ key: 'distiller', name: 'Distiller' }),
      ],
      [recentRun({})],
      4,
    );

    expect(cards.map((card) => card.id)).toEqual([
      'ingest',
      'pipeline',
      'curator',
      'webScout',
      'distiller',
      'review',
      'observability',
    ]);
    expect(cards.find((card) => card.id === 'webScout')?.detail).toContain(
      'ingestion requires explicit approval',
    );
    expect(cards.find((card) => card.id === 'webScout')).toMatchObject({
      routeHref: '/web-scout?runMode=scout_only&scope=all_topics',
      routeLabel: 'Find sources',
    });
    expect(cards.find((card) => card.id === 'review')).toMatchObject({
      routeHref: '/today',
      routeLabel: 'Open review queue',
    });
  });

  it('marks live and attention states from real run and registry status', () => {
    const cards = buildAgentCapabilityCards(
      [agentEntry({ state: 'live', stateLabel: 'Running' })],
      [recentRun({ status: 'partial' })],
      1,
    );

    expect(cards.find((card) => card.id === 'pipeline')?.status).toBe('live');
    expect(cards.find((card) => card.id === 'review')?.status).toBe('attention');
    expect(cards.find((card) => card.id === 'observability')?.statusLabel).toBe('Trace ready');
  });

  it('marks observability live while a run is running', () => {
    const cards = buildAgentCapabilityCards(
      [agentEntry({})],
      [recentRun({ status: 'running', endedAt: null })],
      1,
    );

    expect(cards.find((card) => card.id === 'observability')?.status).toBe('live');
    expect(cards.find((card) => card.id === 'observability')?.statusLabel).toBe('Live trace');
  });
});

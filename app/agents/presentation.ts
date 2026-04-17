import { formatObservedAgentLabel } from '@/lib/agentRunPresentation';
import type { AgentRegistryEntry, RecentRunSummary } from '@/lib/agentsWorkspaceTypes';

function titleCaseToken(value: string) {
  return value
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function formatRunDescriptor(runMode: string | null, kind: string) {
  return runMode ? titleCaseToken(runMode) : formatObservedAgentLabel(kind);
}

export function resolveAgentStateStatus(
  state: AgentRegistryEntry['state'],
): 'running' | 'error' | 'pending' {
  if (state === 'live') {
    return 'running';
  }

  if (state === 'error') {
    return 'error';
  }

  return 'pending';
}

export function resolveStageProgressStatus(
  status: RecentRunSummary['stageProgress'][number]['status'],
): 'running' | 'error' | 'pending' | 'ok' {
  if (status === 'done') {
    return 'ok';
  }

  return status;
}

export function formatCadenceLabel(cadence: 'daily' | 'weekly') {
  return cadence === 'daily' ? 'Daily cadence' : 'Weekly cadence';
}

export function formatTopicScopeLabel(selectedTopicName: string | null) {
  return selectedTopicName ?? 'Global scope';
}

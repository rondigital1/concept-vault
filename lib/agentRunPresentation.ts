import type { AgentKey } from '@/server/agents/configuration';

export type PresentationRunKind = AgentKey | 'research' | 'curate' | 'distill' | 'unknown';

export type PipelineStageId =
  | 'topic_setup'
  | 'resolve_targets'
  | 'curate'
  | 'webscout'
  | 'analyze_findings'
  | 'distill'
  | 'synthesize'
  | 'persist_publish'
  | 'unknown';

export type StageProgress = {
  id: PipelineStageId;
  label: string;
  status: 'pending' | 'running' | 'done' | 'partial' | 'error' | 'skipped';
};

export type PresentableRunStep = {
  name: string;
  status: 'running' | 'ok' | 'error' | 'partial' | 'skipped';
  startedAt?: string;
  endedAt?: string;
};

export const PIPELINE_STAGE_ORDER: Array<{ id: PipelineStageId; label: string }> = [
  { id: 'topic_setup', label: 'Topic Setup' },
  { id: 'resolve_targets', label: 'Resolve Targets' },
  { id: 'curate', label: 'Curate' },
  { id: 'webscout', label: 'WebScout' },
  { id: 'analyze_findings', label: 'Analyze Findings' },
  { id: 'distill', label: 'Distill' },
  { id: 'synthesize', label: 'Synthesize' },
  { id: 'persist_publish', label: 'Persist & Publish' },
];

function toTitleCase(value: string): string {
  return value
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

const RUN_KIND_LABELS: Record<PresentationRunKind, string> = {
  pipeline: 'Pipeline',
  curator: 'Curator',
  webScout: 'WebScout',
  distiller: 'Distiller',
  research: 'Research',
  curate: 'Curator',
  distill: 'Distiller',
  unknown: 'Unknown',
};

export function formatObservedAgentLabel(kind: string): string {
  return RUN_KIND_LABELS[(kind as PresentationRunKind) ?? 'unknown'] ?? kind;
}

export function parsePipelineStageId(stepName: string): PipelineStageId {
  if (stepName.startsWith('pipeline_topic_setup')) return 'topic_setup';
  if (stepName.startsWith('pipeline_resolve_targets')) return 'resolve_targets';
  if (stepName.startsWith('pipeline_curate') || stepName.startsWith('curator_')) return 'curate';
  if (stepName.startsWith('pipeline_webscout') || stepName.startsWith('webscout_')) return 'webscout';
  if (stepName.startsWith('pipeline_analyze_findings')) return 'analyze_findings';
  if (stepName.startsWith('pipeline_distill') || stepName.startsWith('distiller_')) return 'distill';
  if (stepName.startsWith('pipeline_synthesize')) return 'synthesize';
  if (stepName.startsWith('pipeline_persist_publish') || stepName.startsWith('pipeline_persist')) {
    return 'persist_publish';
  }
  return 'unknown';
}

export function parseObservedAgentKey(stepName: string, runKind?: string): AgentKey | null {
  if (stepName === 'pipeline' || stepName.startsWith('pipeline_')) {
    return 'pipeline';
  }
  if (stepName.startsWith('curator_')) {
    return 'curator';
  }
  if (stepName.startsWith('webscout_')) {
    return 'webScout';
  }
  if (stepName.startsWith('distiller_')) {
    return 'distiller';
  }

  if (runKind === 'pipeline') {
    return 'pipeline';
  }
  if (runKind === 'curate' || runKind === 'curator') {
    return 'curator';
  }
  if (runKind === 'webScout') {
    return 'webScout';
  }
  if (runKind === 'distill' || runKind === 'distiller') {
    return 'distiller';
  }

  return null;
}

export function summarizeStageProgress(steps: PresentableRunStep[]): StageProgress[] {
  const latestByStage = new Map<PipelineStageId, PresentableRunStep>();

  for (const step of steps) {
    const stageId = parsePipelineStageId(step.name);

    if (stageId === 'unknown') {
      continue;
    }

    latestByStage.set(stageId, step);
  }

  return PIPELINE_STAGE_ORDER.map((stage) => {
    const latestStep = latestByStage.get(stage.id);

    if (!latestStep) {
      return { id: stage.id, label: stage.label, status: 'pending' };
    }

    if (latestStep.status === 'running') {
      return { id: stage.id, label: stage.label, status: 'running' };
    }

    if (latestStep.status === 'error') {
      return { id: stage.id, label: stage.label, status: 'error' };
    }

    if (latestStep.status === 'partial') {
      return { id: stage.id, label: stage.label, status: 'partial' };
    }

    if (latestStep.status === 'skipped') {
      return { id: stage.id, label: stage.label, status: 'skipped' };
    }

    if (latestStep.status === 'ok') {
      return { id: stage.id, label: stage.label, status: 'done' };
    }

    return { id: stage.id, label: stage.label, status: 'pending' };
  });
}

export function formatObservedStepLabel(stepName: string): string {
  const stageId = parsePipelineStageId(stepName);
  if (stageId !== 'unknown') {
    return PIPELINE_STAGE_ORDER.find((stage) => stage.id === stageId)?.label ?? toTitleCase(stepName);
  }

  return toTitleCase(stepName);
}

export function readDurationMs(startedAt?: string, endedAt?: string): number | null {
  if (!startedAt || !endedAt) {
    return null;
  }

  const start = Date.parse(startedAt);
  const end = Date.parse(endedAt);
  if (Number.isNaN(start) || Number.isNaN(end)) {
    return null;
  }

  return Math.max(end - start, 0);
}

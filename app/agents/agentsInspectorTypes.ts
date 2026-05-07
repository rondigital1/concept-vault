import type { RunComposerState } from '@/lib/agentsWorkspaceTypes';

export type WorkspaceNotice = {
  status: 'info' | 'ok' | 'error' | 'running';
  message: string;
};

export type TopicWorkflowDraft = {
  defaultRunMode: RunComposerState['runMode'];
  enableCategorizationByDefault: boolean;
  skipPublishByDefault: boolean;
  maxDocsPerRun: number;
  minQualityResults: number;
  minRelevanceScore: number;
  maxIterations: number;
  maxQueries: number;
  isTracked: boolean;
  isActive: boolean;
  cadence: 'daily' | 'weekly';
};

export type InspectorFieldChange = (
  field: string,
  value: string | number | boolean,
) => void;

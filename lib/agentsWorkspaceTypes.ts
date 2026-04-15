import type {
  AgentDefaultRunMode,
  AgentKey,
  AgentProfileSettingsMap,
  TopicWorkflowSettings,
} from '@/server/agents/configuration';
import type { StageProgress } from '@/lib/agentRunPresentation';

export type AgentRegistryMetric = {
  label: string;
  value: string;
};

export type AgentRegistryEntry = {
  key: AgentKey;
  name: string;
  description: string;
  badges: string[];
  state: 'live' | 'idle' | 'error';
  stateLabel: string;
  liveRunId: string | null;
  lastStartedAt: string | null;
  lastEndedAt: string | null;
  averageDurationMs: number | null;
  successRate: number | null;
  outputMetrics: AgentRegistryMetric[];
  auxiliaryLabel: string | null;
};

export type AgentTopicOption = {
  id: string;
  name: string;
  goal: string;
  focusTags: string[];
  linkedDocumentCount: number;
  lastRunAt: string | null;
  lastRunMode: string | null;
  isTracked: boolean;
  isActive: boolean;
  cadence: 'daily' | 'weekly';
  workflowSettings: TopicWorkflowSettings;
};

export type RecentRunSummary = {
  id: string;
  kind: string;
  status: 'running' | 'ok' | 'error' | 'partial';
  startedAt: string;
  endedAt: string | null;
  durationMs: number | null;
  topicId: string | null;
  topicName: string | null;
  runMode: string | null;
  stageProgress: StageProgress[];
  lastError: string | null;
};

export type RunStageDetail = {
  id: string;
  label: string;
  agentKey: AgentKey | null;
  status: 'running' | 'ok' | 'error' | 'skipped';
  startedAt: string | null;
  endedAt: string | null;
  durationMs: number | null;
  error: string | null;
};

export type SelectedRunDetail = RecentRunSummary & {
  results: {
    reportId: string | null;
    conceptCount: number;
    flashcardCount: number;
    sourceCount: number;
    errors: string[];
  } | null;
  stages: RunStageDetail[];
};

export type ExecutionEvent = {
  id: string;
  agentKey: AgentKey;
  label: string;
  detail: string;
  timestamp: string;
  status: 'running' | 'ok' | 'error' | 'partial';
};

export type AgentsView = {
  globalProfiles: AgentProfileSettingsMap;
  topicOptions: AgentTopicOption[];
  selectedTopic: AgentTopicOption | null;
  agentRegistry: AgentRegistryEntry[];
  recentRuns: RecentRunSummary[];
  selectedRun: SelectedRunDetail | null;
  executionEvents: ExecutionEvent[];
};

export type RunComposerState = {
  runMode: AgentDefaultRunMode;
  goal: string;
  enableCategorization: boolean;
  skipPublish: boolean;
  minQualityResults: number;
  minRelevanceScore: number;
  maxIterations: number;
  maxQueries: number;
  maxDocsPerRun: number;
};

export type Run = {
  id: string;
  kind: string;
  status: 'running' | 'ok' | 'error' | 'partial';
  startedAt: string;
  endedAt?: string;
  metadata?: {
    topicId?: string | null;
    runMode?: string | null;
  };
  steps?: Array<{
    name: string;
    status: 'running' | 'ok' | 'error' | 'partial' | 'skipped';
    startedAt?: string;
    endedAt?: string;
    error?: string;
  }>;
};

export type Artifact = {
  id: string;
  runId: string | null;
  day: string;
  agent: string;
  kind: string;
  status: 'proposed' | 'approved' | 'rejected' | 'active';
  title: string;
  preview?: string;
  createdAt: string;
  sourceUrl?: string;
  sourceDocumentId?: string;
  sourceRefs?: Record<string, unknown>;
  content?: Record<string, unknown>;
};

export type TodayData = {
  date: string;
  runs?: Run[];
  inbox?: Artifact[];
  active?: Artifact[];
};

export type PageSearchParams = Record<string, string | string[] | undefined>;

export type WorkbenchTopic = {
  id: string;
  name: string;
  goal: string;
  focusTags: string[];
  linkedDocumentCount: number;
  lastReportAt: string | null;
  lastRunAt: string | null;
  lastRunMode: string | null;
  isReady: boolean;
  latestReport: LatestReportPreview | null;
};

export type TopicWorkspaceOption = WorkbenchTopic & {
  pendingCount: number;
  savedCount: number;
};

export type LatestReportPreview = {
  id: string;
  title: string;
  preview: string | null;
  day: string;
  createdAt: string;
  topicsCovered: string[];
  sourcesCount: number | null;
  link: string;
};

export type SelectedTopicSummary = TopicWorkspaceOption;

export type DrawerKey = 'topic' | 'report' | 'evidence';

export type QueueFilter = 'pending' | 'saved';

export type SurfaceTone = 'default' | 'ready' | 'pending' | 'live';

export type WorkflowPrimaryAction = 'find_sources' | 'generate_report' | 'run_details' | null;

export type TopicWorkflowSummary = {
  stageLabel: string;
  stageTone: SurfaceTone;
  stageDescription: string;
  modeLabel: string;
  modeDescription: string;
  primaryAction: WorkflowPrimaryAction;
  liveRunId: string | null;
  liveRunLabel: string | null;
};

export type RunMode = 'full_report' | 'incremental_update' | 'scout_only' | 'concept_only';

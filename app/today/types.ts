import type { SavedTopicRow } from '@/server/repos/savedTopics.repo';

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
    status: 'running' | 'ok' | 'error' | 'skipped';
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

export type ReportReadyTopic = {
  id: string;
  name: string;
  goal: string;
  focusTags: string[];
  linkedDocumentCount: number;
  lastReportAt: string | null;
};

export type PageSearchParams = Record<string, string | string[] | undefined>;

export type TopicCard = {
  topic: SavedTopicRow;
  isReady: boolean;
  linkedDocumentCount: number;
  lastReportAt: string | null;
};

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

export type DrawerState = {
  key: DrawerKey | null;
};

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

export type NextAction = {
  title: string;
  description: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
};

export type TabKey = 'review' | 'topics' | 'outputs' | null;

export type RunMode = 'full_report' | 'incremental_update' | 'scout_only' | 'concept_only';

export type StageId =
  | 'topic_setup'
  | 'resolve_targets'
  | 'curate'
  | 'webscout'
  | 'analyze_findings'
  | 'distill'
  | 'synthesize'
  | 'persist_publish';

export type StageProgress = {
  id: StageId;
  label: string;
  status: 'pending' | 'running' | 'done' | 'error';
};

export type RunTracePayload = {
  id: string;
  kind: string;
  status: 'running' | 'ok' | 'error' | 'partial';
  startedAt: string;
  completedAt?: string;
  steps: Array<{
    name: string;
    status: 'running' | 'ok' | 'error' | 'skipped';
    startedAt?: string;
    endedAt?: string;
    error?: unknown;
  }>;
};

export type RunResultsPayload = {
  runId: string;
  status: 'running' | 'ok' | 'error' | 'partial';
  mode: string | null;
  counts: Record<string, number> | null;
  errors: string[];
  report: {
    id: string;
    title: string;
    day: string;
    sourcesCount: number | null;
    topicsCovered: string[];
    preview: string | null;
    link: string;
    notionPageId: string | null;
  } | null;
  concepts: Array<{
    id: string;
    title: string;
    type: string | null;
    summary: string | null;
    documentTitle: string | null;
  }>;
  sources: Array<{
    id: string;
    title: string;
    url: string | null;
    summary: string | null;
    relevanceScore: number | null;
    contentType: string | null;
    topics: string[];
  }>;
  flashcards: Array<{
    id: string;
    title: string;
    format: string | null;
    front: string | null;
    back: string | null;
    documentTitle: string | null;
  }>;
};

export type CitationItem = {
  id: string;
  title: string;
  url: string | null;
  topics: string[];
  label: string;
};

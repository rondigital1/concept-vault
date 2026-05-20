import type { StageProgress as SharedStageProgress } from '@/lib/agentRunPresentation';
import type { RunStatus } from '@/lib/runApiClient';

export type StageProgress = SharedStageProgress;

export type Metric = {
  label: string;
  value: number;
};

export type GeneratedReport = {
  id: string;
  title: string;
  day: string;
  sourcesCount: number | null;
  topicsCovered: string[];
  preview: string | null;
  link: string;
  notionPageId: string | null;
};

export type GeneratedConcept = {
  id: string;
  title: string;
  type: string | null;
  summary: string | null;
  documentTitle: string | null;
};

export type GeneratedSource = {
  id: string;
  title: string;
  url: string | null;
  summary: string | null;
  relevanceScore: number | null;
  contentType: string | null;
  topics: string[];
};

export type GeneratedFlashcard = {
  id: string;
  title: string;
  format: string | null;
  front: string | null;
  back: string | null;
  documentTitle: string | null;
};

export type RunResultsPayload = {
  runId: string;
  status: RunStatus;
  mode: string | null;
  counts: Record<string, number> | null;
  errors: string[];
  report: GeneratedReport | null;
  concepts: GeneratedConcept[];
  sources: GeneratedSource[];
  flashcards: GeneratedFlashcard[];
};

export type ReportTopicOption = {
  id: string;
  name: string;
  goal: string;
  focusTags: string[];
  linkedDocumentCount: number;
  lastReportAt: string | null;
};

export type BatchTopicOption = {
  id: string;
  name: string;
  goal: string;
  focusTags: string[];
  linkedDocumentCount: number;
};

type BatchRunResult = {
  topicId: string;
  topicName: string;
  runId: string | null;
  status: RunStatus;
  counts: Record<string, number>;
  errors: Array<{ stage: string; message: string; documentId?: string }>;
};

export type BatchFindSourcesResult = {
  mode: 'batch';
  scope: 'all_topics';
  day: string;
  counts: {
    topicsEligible: number;
    topicsProcessed: number;
    topicsSucceeded: number;
    topicsFailed: number;
    webProposals: number;
  };
  runs: BatchRunResult[];
};

export type WebScoutRunClientProps = {
  isBatchFindSources: boolean;
  batchTopicOptions: BatchTopicOption[];
  batchTopicsError: string | null;
  requiresTopicSelection: boolean;
  reportTopicOptions: ReportTopicOption[];
  reportTopicsError: string | null;
  selectedTopicName: string | null;
  minimumLinkedDocumentsForReport: number;
};

export type QueryParamReader = {
  get(name: string): string | null;
  toString(): string;
};

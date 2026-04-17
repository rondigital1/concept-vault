'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { StatusBadge } from '@/app/components/StatusBadge';
import { formatClockTime, formatElapsedTime } from '@/app/components/workflowFormatting';
import {
  primaryButtonClass,
  secondaryButtonClass,
  sectionLabelClass,
} from '@/app/today/WorkspaceHeaderPrimitives';
import {
  formatObservedStepLabel,
  summarizeStageProgress,
  type StageProgress as SharedStageProgress,
} from '@/lib/agentRunPresentation';

type RunStatus = 'running' | 'ok' | 'error' | 'partial';

type RunStep = {
  name: string;
  status: 'running' | 'ok' | 'error' | 'skipped';
  startedAt?: string;
  endedAt?: string;
  input?: unknown;
  output?: unknown;
  error?: unknown;
};

type RunTrace = {
  id: string;
  kind: 'distill' | 'curate' | 'webScout' | 'research' | 'pipeline';
  status: RunStatus;
  startedAt: string;
  completedAt?: string;
  steps: RunStep[];
};

type StageProgress = SharedStageProgress;

type Metric = {
  label: string;
  value: number;
};

const surfacePanelClass = 'today-panel today-panel-low rounded-[28px]';
const insetPanelClass = 'today-panel today-panel-lowest rounded-[24px]';
const issuePanelClass =
  'rounded-[24px] bg-[rgba(143,58,58,0.18)] p-4 outline outline-1 outline-[rgba(255,194,194,0.16)]';
const subtlePillClass =
  'inline-flex items-center rounded-full bg-[rgba(255,255,255,0.06)] px-3 py-1.5 text-xs font-medium text-[color:var(--today-text-soft)] outline outline-1 outline-[rgba(255,255,255,0.08)]';
const accentPillClass =
  'inline-flex items-center rounded-full bg-[rgba(255,255,255,0.12)] px-3 py-1.5 text-xs font-medium text-[color:var(--today-accent-strong)] outline outline-1 outline-[rgba(255,255,255,0.12)]';

type GeneratedReport = {
  id: string;
  title: string;
  day: string;
  sourcesCount: number | null;
  topicsCovered: string[];
  preview: string | null;
  link: string;
  notionPageId: string | null;
};

type GeneratedConcept = {
  id: string;
  title: string;
  type: string | null;
  summary: string | null;
  documentTitle: string | null;
};

type GeneratedSource = {
  id: string;
  title: string;
  url: string | null;
  summary: string | null;
  relevanceScore: number | null;
  contentType: string | null;
  topics: string[];
};

type GeneratedFlashcard = {
  id: string;
  title: string;
  format: string | null;
  front: string | null;
  back: string | null;
  documentTitle: string | null;
};

type RunResultsPayload = {
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

type ReportTopicOption = {
  id: string;
  name: string;
  goal: string;
  focusTags: string[];
  linkedDocumentCount: number;
  lastReportAt: string | null;
};

type BatchTopicOption = {
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

type BatchFindSourcesResult = {
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

function todayISODate(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function parseNumberParam(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function formatRunModeLabel(mode: string): string {
  const labels: Record<string, string> = {
    full_report: 'Generate Report',
    incremental_update: 'Refresh Topic',
    scout_only: 'Find Sources',
    concept_only: 'Extract Concepts',
  };

  return labels[mode] ?? mode.replace(/[_-]+/g, ' ');
}

function isWebScoutCounts(value: unknown): value is {
  iterations: number;
  queriesExecuted: number;
  resultsEvaluated: number;
  proposalsCreated: number;
} {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const v = value as Record<string, unknown>;
  return (
    typeof v.iterations === 'number' &&
    typeof v.queriesExecuted === 'number' &&
    typeof v.resultsEvaluated === 'number' &&
    typeof v.proposalsCreated === 'number'
  );
}

function isPipelineCounts(value: unknown): value is {
  docsTargeted: number;
  docsCurated: number;
  webProposals: number;
  analyzedEvidence: number;
  flashcardsProposed: number;
} {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const v = value as Record<string, unknown>;
  return (
    typeof v.docsTargeted === 'number' &&
    typeof v.docsCurated === 'number' &&
    typeof v.webProposals === 'number' &&
    typeof v.flashcardsProposed === 'number'
  );
}

function extractMetricsFromCounts(counts: Record<string, number> | null): Metric[] {
  if (!counts) {
    return [];
  }

  if (
    typeof counts.iterations === 'number' &&
    typeof counts.queriesExecuted === 'number' &&
    typeof counts.resultsEvaluated === 'number' &&
    typeof counts.proposalsCreated === 'number'
  ) {
    return [
      { label: 'Iterations', value: counts.iterations },
      { label: 'Queries', value: counts.queriesExecuted },
      { label: 'Evaluated', value: counts.resultsEvaluated },
      { label: 'Proposals', value: counts.proposalsCreated },
    ];
  }

  if (
    typeof counts.docsTargeted === 'number' &&
    typeof counts.docsCurated === 'number' &&
    typeof counts.webProposals === 'number' &&
    typeof counts.flashcardsProposed === 'number'
  ) {
    return [
      { label: 'Docs Targeted', value: counts.docsTargeted },
      { label: 'Docs Curated', value: counts.docsCurated },
      { label: 'Web Proposals', value: counts.webProposals },
      { label: 'Evidence', value: counts.analyzedEvidence ?? 0 },
      { label: 'Flashcards', value: counts.flashcardsProposed },
    ];
  }

  return [];
}

function extractMetricsFromTrace(trace: RunTrace | null): Metric[] {
  if (!trace) {
    return [];
  }

  for (let i = trace.steps.length - 1; i >= 0; i -= 1) {
    const output = trace.steps[i]?.output;
    if (!output || typeof output !== 'object') {
      continue;
    }

    const outputRecord = output as Record<string, unknown>;
    const nestedCounts = outputRecord.counts;

    if (isWebScoutCounts(nestedCounts)) {
      return [
        { label: 'Iterations', value: nestedCounts.iterations },
        { label: 'Queries', value: nestedCounts.queriesExecuted },
        { label: 'Evaluated', value: nestedCounts.resultsEvaluated },
        { label: 'Proposals', value: nestedCounts.proposalsCreated },
      ];
    }

    if (isPipelineCounts(nestedCounts)) {
      return [
        { label: 'Docs Targeted', value: nestedCounts.docsTargeted },
        { label: 'Docs Curated', value: nestedCounts.docsCurated },
        { label: 'Web Proposals', value: nestedCounts.webProposals },
        { label: 'Evidence', value: nestedCounts.analyzedEvidence },
        { label: 'Flashcards', value: nestedCounts.flashcardsProposed },
      ];
    }

    if (isWebScoutCounts(outputRecord)) {
      return [
        { label: 'Iterations', value: outputRecord.iterations },
        { label: 'Queries', value: outputRecord.queriesExecuted },
        { label: 'Evaluated', value: outputRecord.resultsEvaluated },
        { label: 'Proposals', value: outputRecord.proposalsCreated },
      ];
    }

    if (isPipelineCounts(outputRecord)) {
      return [
        { label: 'Docs Targeted', value: outputRecord.docsTargeted },
        { label: 'Docs Curated', value: outputRecord.docsCurated },
        { label: 'Web Proposals', value: outputRecord.webProposals },
        { label: 'Evidence', value: outputRecord.analyzedEvidence },
        { label: 'Flashcards', value: outputRecord.flashcardsProposed },
      ];
    }
  }

  return [];
}

function StageBadge({ stage }: { stage: StageProgress }) {
  return (
    <StatusBadge
      status={stage.status}
      label={stage.label}
      className="!px-3 !py-1 !text-xs !font-medium"
    />
  );
}

function OutcomeCountCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint: string;
}) {
  return (
    <div className={`${insetPanelClass} p-4`}>
      <p className={sectionLabelClass}>{label}</p>
      <p className="mt-2 break-all text-2xl font-semibold text-[color:var(--today-text)]">{value}</p>
      <p className="mt-1 text-xs text-[color:var(--today-muted)]">{hint}</p>
    </div>
  );
}

type WebScoutRunClientProps = {
  isBatchFindSources: boolean;
  batchTopicOptions: BatchTopicOption[];
  batchTopicsError: string | null;
  requiresTopicSelection: boolean;
  reportTopicOptions: ReportTopicOption[];
  reportTopicsError: string | null;
  selectedTopicName: string | null;
  minimumLinkedDocumentsForReport: number;
};

function formatShortDate(value: string | null): string {
  if (!value) {
    return 'No prior report';
  }

  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function WebScoutRunClient({
  isBatchFindSources,
  batchTopicOptions,
  batchTopicsError,
  requiresTopicSelection,
  reportTopicOptions,
  reportTopicsError,
  selectedTopicName,
  minimumLinkedDocumentsForReport,
}: WebScoutRunClientProps) {
  const searchParams = useSearchParams();
  const [runId, setRunId] = useState<string | null>(null);
  const [trace, setTrace] = useState<RunTrace | null>(null);
  const [results, setResults] = useState<RunResultsPayload | null>(null);
  const [batchResult, setBatchResult] = useState<BatchFindSourcesResult | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultsError, setResultsError] = useState<string | null>(null);

  const autoStartedRef = useRef<string | null>(null);
  const loadedResultsForRunRef = useRef<string | null>(null);
  const isAwaitingTopicSelection = requiresTopicSelection;
  const autoStartKey = searchParams.toString();

  const startRun = useCallback(async () => {
    if (isAwaitingTopicSelection) {
      return;
    }

    setIsStarting(true);
    setError(null);
    setResultsError(null);
    setTrace(null);
    setResults(null);
    setBatchResult(null);
    setRunId(null);
    loadedResultsForRunRef.current = null;

    try {
      const payload: Record<string, unknown> = {
        day: searchParams.get('day') ?? todayISODate(),
        trigger: 'manual',
      };

      const topicId = searchParams.get('topicId');
      if (topicId) {
        payload.topicId = topicId;
      }

      const goal = searchParams.get('goal');
      if (goal) {
        payload.goal = goal;
      }

      const limit = parseNumberParam(searchParams.get('limit'));
      if (limit !== null) {
        payload.limit = limit;
      }

      const minQualityResults = parseNumberParam(searchParams.get('minQualityResults'));
      if (minQualityResults !== null) {
        payload.minQualityResults = minQualityResults;
      }

      const minRelevanceScore = parseNumberParam(searchParams.get('minRelevanceScore'));
      if (minRelevanceScore !== null) {
        payload.minRelevanceScore = minRelevanceScore;
      }

      const maxIterations = parseNumberParam(searchParams.get('maxIterations'));
      if (maxIterations !== null) {
        payload.maxIterations = maxIterations;
      }

      const maxQueries = parseNumberParam(searchParams.get('maxQueries'));
      if (maxQueries !== null) {
        payload.maxQueries = maxQueries;
      }

      const runMode = searchParams.get('runMode');
      if (runMode) {
        payload.runMode = runMode;
      }

      if (isBatchFindSources) {
        payload.scope = 'all_topics';

        const maxTopics = parseNumberParam(searchParams.get('maxTopics'));
        if (maxTopics !== null) {
          payload.maxTopics = maxTopics;
        }

        const response = await fetch('/api/runs/find-sources', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const body = await response.json().catch(() => null);
          throw new Error(body?.error || 'Failed to run Find Sources batch');
        }

        const body = (await response.json()) as BatchFindSourcesResult;
        setBatchResult(body);
        return;
      }

      const response = await fetch('/api/runs/pipeline', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || 'Failed to start pipeline run');
      }

      const body = (await response.json()) as { runId: string };
      setRunId(body.runId);
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : 'Failed to start run');
    } finally {
      setIsStarting(false);
    }
  }, [isAwaitingTopicSelection, isBatchFindSources, searchParams]);

  const fetchTrace = useCallback(async (id: string): Promise<RunTrace | null> => {
    const response = await fetch(`/api/runs/${id}`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as RunTrace;
  }, []);

  const fetchResults = useCallback(async (id: string): Promise<RunResultsPayload> => {
    const response = await fetch(`/api/runs/${id}/results`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.error || 'Failed to load generated results');
    }

    return (await response.json()) as RunResultsPayload;
  }, []);

  useEffect(() => {
    if (autoStartedRef.current === autoStartKey) {
      return;
    }
    if (isAwaitingTopicSelection) {
      return;
    }
    autoStartedRef.current = autoStartKey;
    void startRun();
  }, [autoStartKey, isAwaitingTopicSelection, startRun]);

  useEffect(() => {
    if (isBatchFindSources) {
      return;
    }
    if (!runId) {
      return;
    }

    let cancelled = false;
    let timer: number | null = null;

    const poll = async () => {
      try {
        const nextTrace = await fetchTrace(runId);
        if (cancelled || !nextTrace) {
          return;
        }

        setTrace(nextTrace);

        if (nextTrace.status === 'running') {
          timer = window.setTimeout(() => {
            void poll();
          }, 1000);
        }
      } catch {
        if (!cancelled) {
          timer = window.setTimeout(() => {
            void poll();
          }, 1000);
        }
      }
    };

    void poll();

    return () => {
      cancelled = true;
      if (timer !== null) {
        window.clearTimeout(timer);
      }
    };
  }, [fetchTrace, isBatchFindSources, runId]);

  useEffect(() => {
    if (isBatchFindSources) {
      return;
    }
    if (!runId || !trace || trace.status === 'running') {
      return;
    }

    if (loadedResultsForRunRef.current === runId) {
      return;
    }

    loadedResultsForRunRef.current = runId;
    let cancelled = false;

    const loadResults = async () => {
      try {
        const nextResults = await fetchResults(runId);
        if (!cancelled) {
          setResults(nextResults);
          setResultsError(null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setResultsError(
            loadError instanceof Error ? loadError.message : 'Failed to load generated results',
          );
        }
      }
    };

    void loadResults();

    return () => {
      cancelled = true;
    };
  }, [fetchResults, isBatchFindSources, runId, trace]);

  const requestedMaxTopics = parseNumberParam(searchParams.get('maxTopics')) ?? 10;
  const selectedTopicId = searchParams.get('topicId');
  const researchHref = selectedTopicId ? `/today?topicId=${selectedTopicId}` : '/today';
  const reviewQueueHref = selectedTopicId
    ? `/today?topicId=${selectedTopicId}&queue=pending`
    : '/today?queue=pending';
  const isVaultWideFindSources =
    !isBatchFindSources &&
    (searchParams.get('runMode') ?? '') === 'scout_only' &&
    !searchParams.get('topicId');
  const isRunning = isBatchFindSources ? isStarting : trace?.status === 'running' || (!!runId && !trace);
  const runModeLabel = formatRunModeLabel(searchParams.get('runMode') ?? results?.mode ?? 'full_report');
  const currentStatus = isBatchFindSources
    ? isStarting
      ? 'running'
      : error
        ? 'error'
        : batchResult
          ? batchResult.counts.topicsFailed > 0
            ? 'partial'
            : 'ok'
          : 'pending'
    : isAwaitingTopicSelection
      ? 'pending'
      : trace?.status ?? (runId ? 'running' : 'pending');

  const stageProgress = useMemo(
    () => summarizeStageProgress(trace?.steps ?? []),
    [trace],
  );

  const metrics = useMemo(() => {
    const fromResults = extractMetricsFromCounts(results?.counts ?? null);
    if (fromResults.length > 0) {
      return fromResults;
    }
    return extractMetricsFromTrace(trace);
  }, [results, trace]);

  const generatedCount =
    (results?.concepts.length ?? 0) +
    (results?.sources.length ?? 0) +
    (results?.flashcards.length ?? 0) +
    (results?.report ? 1 : 0);

  const sourceCount = results?.sources.length ?? 0;
  const conceptCount = results?.concepts.length ?? 0;
  const flashcardCount = results?.flashcards.length ?? 0;
  const pendingReviewCount = sourceCount + conceptCount + flashcardCount;
  const resultsReady = !isAwaitingTopicSelection && !isRunning && !resultsError && Boolean(results);
  const noOutputsCreated = resultsReady && generatedCount === 0;
  const currentStageLabel = stageProgress.find((stage) => stage.status === 'running')?.label ?? null;
  const runDuration = trace?.startedAt
    ? formatElapsedTime(trace.startedAt, trace.completedAt)
    : runId
      ? 'In progress'
      : '—';

  const outcomeHeadline = isAwaitingTopicSelection
    ? 'Choose a topic to begin'
    : error
      ? 'Run could not start'
      : isRunning
        ? `${runModeLabel} in progress`
        : currentStatus === 'error'
          ? 'Run failed'
          : currentStatus === 'partial'
            ? 'Run finished with issues'
            : results?.report
              ? 'Report ready'
              : generatedCount > 0
                ? 'Run finished'
                : 'No new outputs created';

  const outcomeDescription = isAwaitingTopicSelection
    ? 'Pick one topic with enough source material. The run summary and next actions will appear here after it starts.'
    : error
      ? error
      : isRunning
        ? currentStageLabel
          ? `Currently working through ${currentStageLabel.toLowerCase()}. Results and next actions will appear here when the run finishes.`
          : 'The run is still processing. Results and next actions will appear here when it finishes.'
        : resultsError
          ? resultsError
          : results?.report
            ? 'Your report is ready. If the run also generated review items, you can send them through the queue next.'
            : generatedCount > 0
              ? `This run created ${sourceCount} source candidate${sourceCount === 1 ? '' : 's'}, ${conceptCount} concept${conceptCount === 1 ? '' : 's'}, and ${flashcardCount} flashcard${flashcardCount === 1 ? '' : 's'}.`
              : 'The run completed, but it did not create any new sources, concepts, flashcards, or reports.';

  const visibleIssueMessages = [
    ...(error ? [error] : []),
    ...(resultsError ? [resultsError] : []),
    ...(results?.errors ?? []),
  ];

  const batchVisibleIssueMessages = [
    ...(batchTopicsError ? [batchTopicsError] : []),
    ...(error ? [error] : []),
    ...((batchResult?.runs ?? []).flatMap((run) =>
      run.errors.map((entry) => `${run.topicName}: ${entry.message}`),
    )),
  ];

  if (isBatchFindSources) {
    const previewTopics = batchTopicOptions.slice(0, requestedMaxTopics);
    const topicsEligible = batchResult?.counts.topicsEligible ?? batchTopicOptions.length;
    const topicsProcessed = batchResult?.counts.topicsProcessed ?? 0;
    const topicsFailed = batchResult?.counts.topicsFailed ?? 0;
    const webProposalCount = batchResult?.counts.webProposals ?? 0;
    const batchHeadline = error
      ? 'Batch could not start'
      : isStarting
        ? 'Find Sources batch in progress'
        : batchResult
          ? batchResult.counts.topicsProcessed === 0
            ? 'No eligible topics'
            : batchResult.counts.topicsFailed > 0
              ? 'Batch finished with issues'
              : 'Batch finished'
          : 'Ready to run all eligible topics';
    const batchDescription = batchTopicsError
      ? batchTopicsError
      : error
        ? error
        : isStarting
          ? `Running Find Sources across up to ${requestedMaxTopics} active topics that still need more material.`
          : batchResult
            ? batchResult.counts.topicsProcessed === 0
              ? 'No active topics currently need more sources before they are report-ready.'
              : `Processed ${batchResult.counts.topicsProcessed} of ${batchResult.counts.topicsEligible} eligible topics and proposed ${batchResult.counts.webProposals} source candidate${batchResult.counts.webProposals === 1 ? '' : 's'}.`
            : 'This mode runs Find Sources once per active topic with fewer than the report-ready threshold of linked documents.';

    return (
      <section className="space-y-6">
        <div className={`${surfacePanelClass} p-5`}>
          <div className="flex flex-col gap-3">
            <div>
              <p className={sectionLabelClass}>Batch scope</p>
              <h2 className="mt-2 text-xl font-semibold text-[color:var(--today-text)]">
                All active topics that still need more sources
              </h2>
              <p className="mt-2 text-sm text-[color:var(--today-muted)]">
                This batch runs Find Sources inline for topics below the {minimumLinkedDocumentsForReport}-document readiness threshold.
              </p>
            </div>

            {batchTopicsError && (
              <div className={`${issuePanelClass} text-sm text-[#ffdada]`}>
                {batchTopicsError}
              </div>
            )}

            {!batchTopicsError && batchTopicOptions.length === 0 && (
              <div className={`${insetPanelClass} p-4 text-sm text-[color:var(--today-text-soft)]`}>
                No active topics currently need more sources. Topics reappear here when they fall below the readiness threshold.
              </div>
            )}

            {!batchTopicsError && batchTopicOptions.length > 0 && (
              <>
                <p className="text-sm text-[color:var(--today-text-soft)]">
                  Previewing {previewTopics.length} of {batchTopicOptions.length} eligible topic{batchTopicOptions.length === 1 ? '' : 's'}.
                </p>
                <div className="space-y-3">
                  {previewTopics.map((topic) => (
                    <div
                      key={topic.id}
                      className={`${insetPanelClass} p-4`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-[color:var(--today-text)]">{topic.name}</p>
                        <span className={subtlePillClass}>
                          {topic.linkedDocumentCount} linked doc{topic.linkedDocumentCount === 1 ? '' : 's'}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-[color:var(--today-text-soft)]">{topic.goal}</p>
                      {topic.focusTags.length > 0 && (
                        <p className="mt-2 text-xs text-[color:var(--today-muted)]">
                          Focus tags: {topic.focusTags.slice(0, 6).join(', ')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/web-scout?runMode=scout_only"
                className={secondaryButtonClass}
              >
                Use Vault-Wide Scout Instead
              </Link>
            </div>
          </div>
        </div>

        <div className={`${surfacePanelClass} p-6`}>
          <p className={sectionLabelClass}>Run summary</p>
          <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={currentStatus} />
                <span className={subtlePillClass}>
                  {runModeLabel}
                </span>
                <span className={accentPillClass}>
                  Scope: All eligible topics
                </span>
              </div>
              <h2 className="mt-4 text-2xl font-semibold text-[color:var(--today-text)]">{batchHeadline}</h2>
              <p className="mt-2 text-sm leading-7 text-[color:var(--today-text-soft)]">{batchDescription}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              {!isStarting && webProposalCount > 0 && (
                <Link
                  href={reviewQueueHref}
                  className={primaryButtonClass}
                >
                  Review Queue
                </Link>
              )}
              <Link
                href={researchHref}
                className={secondaryButtonClass}
              >
                Back to Research
              </Link>
              <button
                type="button"
                onClick={() => {
                  void startRun();
                }}
                disabled={isStarting}
                className={secondaryButtonClass}
              >
                {isStarting ? 'Running...' : 'Run Again'}
              </button>
            </div>
          </div>

          {batchVisibleIssueMessages.length > 0 && (
            <div className={`mt-5 ${issuePanelClass}`}>
              <p className={sectionLabelClass}>Run issues</p>
              <p className="mt-2 text-sm text-[#fff1f1]">{batchVisibleIssueMessages[0]}</p>
              {batchVisibleIssueMessages.length > 1 && (
                <p className="mt-1 text-xs text-[#ffdada]">
                  {batchVisibleIssueMessages.length - 1} more issue{batchVisibleIssueMessages.length - 1 === 1 ? '' : 's'} in Technical Details.
                </p>
              )}
            </div>
          )}
        </div>

        <div className={surfacePanelClass}>
          <div className="border-b border-[rgba(255,255,255,0.08)] px-5 py-4">
            <h2 className={sectionLabelClass}>Batch outcomes</h2>
            <p className="mt-1 text-xs text-[color:var(--today-muted)]">
              Topic coverage first, then per-topic run results.
            </p>
          </div>

          <div className="space-y-5 p-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <OutcomeCountCard
                label="Eligible Topics"
                value={topicsEligible}
                hint="Active topics below the report-ready threshold."
              />
              <OutcomeCountCard
                label="Processed"
                value={topicsProcessed}
                hint="Topics attempted in this batch."
              />
              <OutcomeCountCard
                label="Source Candidates"
                value={webProposalCount}
                hint={webProposalCount > 0 ? 'New review items created by the batch.' : 'No new source candidates were proposed.'}
              />
              <OutcomeCountCard
                label="Failed Topics"
                value={topicsFailed}
                hint={topicsFailed > 0 ? 'These topics need follow-up.' : 'All processed topics finished cleanly.'}
              />
            </div>

            {!isStarting && batchResult && batchResult.runs.length === 0 && (
              <div className={`${insetPanelClass} p-4 text-sm text-[color:var(--today-text-soft)]`}>
                No eligible topics were processed in this batch.
              </div>
            )}

            {batchResult && batchResult.runs.length > 0 && (
              <article className={`${insetPanelClass} p-4`}>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--today-text)]">Per-topic runs</h3>
                  <span className="text-xs text-[color:var(--today-muted)]">{batchResult.runs.length}</span>
                </div>
                <div className="mt-4 space-y-3">
                  {batchResult.runs.map((run) => (
                    <div key={run.topicId} className={`${insetPanelClass} p-3`}>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-medium text-[color:var(--today-text)]">{run.topicName}</p>
                          <p className="mt-1 text-xs text-[color:var(--today-muted)]">
                            Run ID: {run.runId ?? '—'} · {run.counts.webProposals ?? 0} proposal{run.counts.webProposals === 1 ? '' : 's'}
                          </p>
                        </div>
                        <StatusBadge status={run.status} />
                      </div>
                      {run.errors.length > 0 && (
                        <p className="mt-3 text-xs text-[#ffdada]">{run.errors[0]?.message}</p>
                      )}
                    </div>
                  ))}
                </div>
              </article>
            )}
          </div>
        </div>

        <details className={surfacePanelClass}>
          <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-[color:var(--today-text-soft)] transition-colors hover:text-[color:var(--today-text)]">
            Technical Details
          </summary>

          <div className="border-t border-[rgba(255,255,255,0.08)] p-5 space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <OutcomeCountCard
                label="Status"
                value={currentStatus}
                hint="Aggregate batch status."
              />
              <OutcomeCountCard
                label="Eligible"
                value={topicsEligible}
                hint="Topics found before maxTopics was applied."
              />
              <OutcomeCountCard
                label="Max Topics"
                value={requestedMaxTopics}
                hint="Maximum topics requested for this batch."
              />
              <OutcomeCountCard
                label="Day"
                value={batchResult?.day ?? (searchParams.get('day') ?? todayISODate())}
                hint="Artifact day used for sub-runs."
              />
            </div>

            {batchVisibleIssueMessages.length > 0 && (
              <section className={issuePanelClass}>
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#ffdada]">Issues</h3>
                <ul className="mt-3 space-y-2 text-sm text-[#fff1f1]">
                  {batchVisibleIssueMessages.map((entry, index) => (
                    <li key={`${entry}-${index}`}>{entry}</li>
                  ))}
                </ul>
              </section>
            )}

            {batchResult && batchResult.runs.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--today-text)]">Run payloads</h3>
                <div className="mt-3 space-y-3">
                  {batchResult.runs.map((run) => (
                    <details
                      key={`${run.topicId}-payload`}
                      className={insetPanelClass}
                    >
                      <summary className="cursor-pointer px-4 py-3 text-sm text-[color:var(--today-text-soft)] hover:text-[color:var(--today-text)]">
                        {run.topicName} · {run.status}
                      </summary>
                      <div className="border-t border-[rgba(255,255,255,0.08)] p-4">
                        <pre className="max-h-64 overflow-auto rounded-[18px] bg-[rgba(0,0,0,0.24)] p-3 text-xs text-[color:var(--today-text-soft)]">
                          {safeStringify(run)}
                        </pre>
                      </div>
                    </details>
                  ))}
                </div>
              </section>
            )}
          </div>
        </details>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      {isAwaitingTopicSelection && (
        <div className={`${surfacePanelClass} p-5`}>
          <div className="flex flex-col gap-3">
            <div>
              <p className={sectionLabelClass}>Choose report topic</p>
              <h2 className="mt-2 text-xl font-semibold text-[color:var(--today-text)]">
                Select an existing topic with enough source material
              </h2>
              <p className="mt-2 text-sm text-[color:var(--today-muted)]">
                Only topics with at least {minimumLinkedDocumentsForReport} linked documents are shown here so the report has enough context to be worth generating.
              </p>
            </div>

            {reportTopicsError && (
              <div className={`${issuePanelClass} text-sm text-[#ffdada]`}>
                {reportTopicsError}
              </div>
            )}

            {!reportTopicsError && reportTopicOptions.length === 0 && (
              <div className={`${insetPanelClass} p-4 text-sm text-[color:var(--today-text-soft)]`}>
                No saved topics are ready to generate yet. Link more documents to a topic from Research, then try again.
              </div>
            )}

            {!reportTopicsError && reportTopicOptions.length > 0 && (
              <form action="/web-scout" method="GET" className="space-y-4">
                <input type="hidden" name="runMode" value="full_report" />
                <div className="space-y-3">
                  {reportTopicOptions.map((topic) => (
                    <label
                      key={topic.id}
                      className={`${insetPanelClass} flex cursor-pointer items-start gap-3 p-4 transition-colors hover:outline-[rgba(255,255,255,0.12)]`}
                    >
                      <input
                        type="radio"
                        name="topicId"
                        value={topic.id}
                        className="mt-1 h-4 w-4 border-[rgba(255,255,255,0.2)] bg-[rgba(0,0,0,0.36)] text-white focus:ring-white/30"
                        defaultChecked={reportTopicOptions[0]?.id === topic.id}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-[color:var(--today-text)]">{topic.name}</p>
                          <span className={accentPillClass}>
                            {topic.linkedDocumentCount} linked docs
                          </span>
                          <span className={subtlePillClass}>
                            Last report: {formatShortDate(topic.lastReportAt)}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-[color:var(--today-text-soft)]">{topic.goal}</p>
                        {topic.focusTags.length > 0 && (
                          <p className="mt-2 text-xs text-[color:var(--today-muted)]">
                            Focus tags: {topic.focusTags.slice(0, 6).join(', ')}
                          </p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>

                <button
                  type="submit"
                  className={primaryButtonClass}
                >
                  Generate Report
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {isVaultWideFindSources && (
        <div className={`${surfacePanelClass} p-5`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className={sectionLabelClass}>Batch option</p>
              <h2 className="mt-2 text-xl font-semibold text-[color:var(--today-text)]">Run Find Sources across all eligible topics</h2>
              <p className="mt-2 text-sm text-[color:var(--today-muted)]">
                Use batch mode when you want one inline scout-only run per active topic that still needs more material before it is report-ready.
              </p>
            </div>
            <Link
              href="/web-scout?runMode=scout_only&scope=all_topics"
              className={secondaryButtonClass}
            >
              All Eligible Topics
            </Link>
          </div>
        </div>
      )}

      <div className={`${surfacePanelClass} p-6`}>
        <p className={sectionLabelClass}>Run summary</p>
        <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={currentStatus} />
              <span className={subtlePillClass}>
                {runModeLabel}
              </span>
              {selectedTopicName && (
                <span className={accentPillClass}>
                  Topic: {selectedTopicName}
                </span>
              )}
            </div>
            <h2 className="mt-4 text-2xl font-semibold text-[color:var(--today-text)]">{outcomeHeadline}</h2>
            <p className="mt-2 text-sm leading-7 text-[color:var(--today-text-soft)]">{outcomeDescription}</p>
            <p className="mt-3 text-xs text-[color:var(--today-muted)]">
              {trace?.startedAt
                ? `Started ${formatClockTime(trace.startedAt, { includeSeconds: true })} · ${runDuration}`
                : isAwaitingTopicSelection
                  ? 'No run has started yet.'
                  : runId
                    ? 'Waiting for run trace...'
                    : 'Ready to start.'}
              {isRunning && currentStageLabel ? ` · Current step: ${currentStageLabel}` : ''}
            </p>
          </div>

          {!isAwaitingTopicSelection && (
            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              {results?.report ? (
                <Link
                  href={results.report.link}
                  className={primaryButtonClass}
                >
                  Open Report
                </Link>
              ) : !isRunning && pendingReviewCount > 0 ? (
                <Link
                  href={reviewQueueHref}
                  className={primaryButtonClass}
                >
                  Review Queue
                </Link>
              ) : null}
              {!isRunning && pendingReviewCount > 0 && results?.report && (
                <Link
                  href={reviewQueueHref}
                  className={secondaryButtonClass}
                >
                  Review Queue
                </Link>
              )}
              <Link
                href={researchHref}
                className={secondaryButtonClass}
              >
                Back to Research
              </Link>
              <button
                type="button"
                onClick={() => {
                  void startRun();
                }}
                disabled={isStarting}
                className={secondaryButtonClass}
              >
                {isStarting ? 'Starting...' : 'Run Again'}
              </button>
            </div>
          )}
        </div>

        {visibleIssueMessages.length > 0 && (
          <div className={`mt-5 ${issuePanelClass}`}>
            <p className={sectionLabelClass}>Run issues</p>
            <p className="mt-2 text-sm text-[#fff1f1]">
              {visibleIssueMessages[0]}
            </p>
            {visibleIssueMessages.length > 1 && (
              <p className="mt-1 text-xs text-[#ffdada]">
                {visibleIssueMessages.length - 1} more issue{visibleIssueMessages.length - 1 === 1 ? '' : 's'} in Technical Details.
              </p>
            )}
          </div>
        )}
      </div>

      <div className={surfacePanelClass}>
        <div className="border-b border-[rgba(255,255,255,0.08)] px-5 py-4">
          <h2 className={sectionLabelClass}>What this run created</h2>
          <p className="mt-1 text-xs text-[color:var(--today-muted)]">
            Results first: report, review items, and direct next places to go.
          </p>
        </div>

        <div className="p-5 space-y-5">
          {isAwaitingTopicSelection && (
            <div className={`${insetPanelClass} p-4 text-sm text-[color:var(--today-text-soft)]`}>
              Select a topic above to start a full report run. The finished report summary and next actions will appear here.
            </div>
          )}

          {isRunning && (
            <div className={`${insetPanelClass} p-4 text-sm text-[color:var(--today-text-soft)]`}>
              The run is still working. This area will update with finished outputs and next actions when processing completes.
            </div>
          )}

          {!isAwaitingTopicSelection && !isRunning && resultsError && (
            <div className={`${issuePanelClass} text-sm text-[#ffdada]`}>
              {resultsError}
            </div>
          )}

          {!isAwaitingTopicSelection && !isRunning && !resultsError && !results && (
            <div className={`${insetPanelClass} p-4 text-sm text-[color:var(--today-muted)]`}>
              Loading finished outputs...
            </div>
          )}

          {resultsReady && results && (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <OutcomeCountCard
                label="Report"
                value={results.report ? 'Ready' : '—'}
                hint={results.report ? 'Open the finished report.' : 'No report created in this run.'}
              />
              <OutcomeCountCard
                label="Source Candidates"
                value={sourceCount}
                hint={sourceCount > 0 ? 'Review these in the queue.' : 'No new sources proposed.'}
              />
              <OutcomeCountCard
                label="Concepts"
                value={conceptCount}
                hint={conceptCount > 0 ? 'New concepts are ready to review.' : 'No concepts extracted.'}
              />
              <OutcomeCountCard
                label="Flashcards"
                value={flashcardCount}
                hint={flashcardCount > 0 ? 'New flashcards are ready to review.' : 'No flashcards generated.'}
              />
            </div>
          )}

          {noOutputsCreated && (
            <div className={`${insetPanelClass} p-4 text-sm text-[color:var(--today-muted)]`}>
              No new sources, concepts, flashcards, or report were created in this run.
            </div>
          )}

          {results?.report && (
            <article className={`${surfacePanelClass} p-4`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className={sectionLabelClass}>Report ready</p>
                  <h3 className="mt-1 text-lg font-semibold text-[color:var(--today-text)]">{results.report.title}</h3>
                  <p className="mt-1 text-xs text-[color:var(--today-muted)]">
                    Day {results.report.day}
                    {typeof results.report.sourcesCount === 'number'
                      ? ` · ${results.report.sourcesCount} source${results.report.sourcesCount === 1 ? '' : 's'}`
                      : ''}
                  </p>
                  {results.report.topicsCovered.length > 0 && (
                    <p className="mt-2 text-xs text-[color:var(--today-text-soft)]">
                      Covers: {results.report.topicsCovered.slice(0, 5).join(', ')}
                    </p>
                  )}
                  {results.report.preview && (
                    <p className="mt-2 text-sm text-[color:var(--today-text-soft)] line-clamp-4">{results.report.preview}</p>
                  )}
                </div>
                <Link
                  href={results.report.link}
                  className={primaryButtonClass}
                >
                  Open Report
                </Link>
              </div>
            </article>
          )}

          {resultsReady && results && sourceCount > 0 && (
            <article className={`${surfacePanelClass} p-4`}>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--today-text)]">Source candidates</h3>
                <span className="text-xs text-[color:var(--today-muted)]">{sourceCount}</span>
              </div>
              <p className="mt-2 text-sm text-[color:var(--today-muted)]">
                These sources were proposed by this run and are waiting in the review queue.
              </p>
              <div className="mt-4 space-y-3 max-h-96 overflow-y-auto pr-1">
                {results.sources.map((source) => (
                  <div key={source.id} className={`${insetPanelClass} p-3`}>
                    {source.url ? (
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="break-words text-sm font-medium text-[color:var(--today-accent-strong)] hover:underline"
                      >
                        {source.title}
                      </a>
                    ) : (
                      <p className="text-sm font-medium text-[color:var(--today-text)]">{source.title}</p>
                    )}
                    <p className="mt-1 text-xs text-[color:var(--today-muted)]">
                      {source.contentType ?? 'resource'}
                      {typeof source.relevanceScore === 'number'
                        ? ` · relevance ${source.relevanceScore.toFixed(2)}`
                        : ''}
                    </p>
                    {source.summary && (
                      <p className="mt-2 text-xs text-[color:var(--today-text-soft)] line-clamp-3">{source.summary}</p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <Link
                        href={`/artifacts/${source.id}`}
                        className="inline-flex text-xs text-[color:var(--today-muted-strong)] transition-colors hover:text-[color:var(--today-text)]"
                      >
                        View technical details
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          )}

          {resultsReady && results && conceptCount > 0 && (
            <article className={`${surfacePanelClass} p-4`}>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--today-text)]">Concepts</h3>
                <span className="text-xs text-[color:var(--today-muted)]">{conceptCount}</span>
              </div>
              <p className="mt-2 text-sm text-[color:var(--today-muted)]">
                These concepts were extracted by this run and are ready for review.
              </p>
              <div className="mt-4 space-y-3 max-h-96 overflow-y-auto pr-1">
                {results.concepts.map((concept) => (
                  <div key={concept.id} className={`${insetPanelClass} p-3`}>
                    <p className="text-sm font-medium text-[color:var(--today-text)]">{concept.title}</p>
                    <p className="mt-1 text-xs text-[color:var(--today-muted)]">
                      {concept.type ?? 'concept'}
                      {concept.documentTitle ? ` · ${concept.documentTitle}` : ''}
                    </p>
                    {concept.summary && (
                      <p className="mt-2 text-xs text-[color:var(--today-text-soft)] line-clamp-3">{concept.summary}</p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <Link
                        href={`/artifacts/${concept.id}`}
                        className="inline-flex text-xs text-[color:var(--today-muted-strong)] transition-colors hover:text-[color:var(--today-text)]"
                      >
                        View technical details
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          )}

          {resultsReady && results && flashcardCount > 0 && (
            <details className={surfacePanelClass}>
              <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-[color:var(--today-text-soft)] hover:text-[color:var(--today-text)]">
                Flashcards ({flashcardCount})
              </summary>
              <div className="border-t border-[rgba(255,255,255,0.08)] px-4 py-3 space-y-3 max-h-80 overflow-y-auto">
                {results.flashcards.map((flashcard) => (
                  <div key={flashcard.id} className={`${insetPanelClass} p-3`}>
                    <p className="text-xs text-[color:var(--today-muted)]">{flashcard.format ?? 'card'}</p>
                    <p className="mt-1 text-sm text-[color:var(--today-text)]">{flashcard.front ?? flashcard.title}</p>
                    {flashcard.back && (
                      <p className="mt-2 text-xs text-[color:var(--today-text-soft)] line-clamp-3">{flashcard.back}</p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <Link
                        href={`/artifacts/${flashcard.id}`}
                        className="inline-flex text-xs text-[color:var(--today-muted-strong)] transition-colors hover:text-[color:var(--today-text)]"
                      >
                        View technical details
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      </div>

      <details className={surfacePanelClass}>
        <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-[color:var(--today-text-soft)] transition-colors hover:text-[color:var(--today-text)]">
          Technical Details
        </summary>

        <div className="border-t border-[rgba(255,255,255,0.08)] p-5 space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <OutcomeCountCard
              label="Run ID"
              value={runId ?? '—'}
              hint="Internal identifier for this run."
            />
            <OutcomeCountCard
              label="Started"
              value={trace?.startedAt ? formatClockTime(trace.startedAt, { includeSeconds: true }) : '—'}
              hint="Local start time."
            />
            <OutcomeCountCard
              label="Duration"
              value={runDuration}
              hint="Total elapsed time."
            />
            <OutcomeCountCard
              label="Trace Status"
              value={trace?.status ?? (runId ? 'running' : 'pending')}
              hint="Execution status from the run trace."
            />
          </div>

          {stageProgress.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--today-text)]">Stage progress</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {stageProgress.map((stage) => (
                  <StageBadge key={stage.id} stage={stage} />
                ))}
              </div>
            </section>
          )}

          {metrics.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--today-text)]">Pipeline metrics</h3>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {metrics.map((metric) => (
                  <div key={metric.label} className={`${insetPanelClass} p-3`}>
                    <p className="text-[11px] uppercase tracking-wide text-[color:var(--today-muted)]">{metric.label}</p>
                    <p className="text-lg font-semibold text-[color:var(--today-text)]">{metric.value}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {visibleIssueMessages.length > 0 && (
            <section className={issuePanelClass}>
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#ffdada]">Issues</h3>
              <ul className="mt-3 space-y-2 text-sm text-[#fff1f1]">
                {visibleIssueMessages.map((entry, index) => (
                  <li key={`${entry}-${index}`}>{entry}</li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--today-text)]">Step timeline</h3>
            {!trace || trace.steps.length === 0 ? (
              <div className={`mt-3 ${insetPanelClass} p-4 text-sm text-[color:var(--today-muted)]`}>
                Waiting for process steps...
              </div>
            ) : (
              <div className={`mt-3 divide-y divide-[rgba(255,255,255,0.08)] ${insetPanelClass}`}>
                {trace.steps.map((step, index) => {
                  const stageLabel = formatObservedStepLabel(step.name);

                  return (
                    <div key={`${step.name}-${index}`} className="p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <StatusBadge status={step.status} />
                          <span className={subtlePillClass}>
                            {stageLabel}
                          </span>
                          <p className="truncate text-sm text-[color:var(--today-text)]">{step.name}</p>
                        </div>
                        <div className="font-mono text-xs text-[color:var(--today-muted)]">
                          {formatClockTime(step.startedAt, { includeSeconds: true })} · {formatElapsedTime(step.startedAt, step.endedAt)}
                        </div>
                      </div>

                      {Boolean(step.error) && (
                        <p className="mt-2 truncate font-mono text-xs text-[#ffdada]">
                          {safeStringify(step.error)}
                        </p>
                      )}

                      {(Boolean(step.input) || Boolean(step.output)) && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs text-[color:var(--today-muted)] transition-colors hover:text-[color:var(--today-text-soft)]">
                            View payload
                          </summary>
                          <div className="mt-2 grid gap-2 lg:grid-cols-2">
                            {Boolean(step.input) && (
                              <pre className="max-h-56 overflow-auto rounded-[18px] bg-[rgba(0,0,0,0.24)] p-3 text-xs text-[color:var(--today-text-soft)]">
                                {safeStringify(step.input)}
                              </pre>
                            )}
                            {Boolean(step.output) && (
                              <pre className="max-h-56 overflow-auto rounded-[18px] bg-[rgba(0,0,0,0.24)] p-3 text-xs text-[color:var(--today-text-soft)]">
                                {safeStringify(step.output)}
                              </pre>
                            )}
                          </div>
                        </details>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </details>
    </section>
  );
}

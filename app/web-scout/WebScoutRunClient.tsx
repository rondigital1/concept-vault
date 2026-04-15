'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { StatusBadge } from '@/app/components/StatusBadge';
import { formatClockTime, formatElapsedTime } from '@/app/components/workflowFormatting';
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
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className="mt-2 break-all text-2xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs text-zinc-400">{hint}</p>
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
        <div className="rounded-xl border border-sky-800 bg-sky-950 p-5">
          <div className="flex flex-col gap-3">
            <div>
              <p className="mb-2 text-xs uppercase tracking-wider text-sky-300">Batch Scope</p>
              <h2 className="text-xl font-semibold text-white">All active topics that still need more sources</h2>
              <p className="mt-2 text-sm text-sky-200">
                This batch runs Find Sources inline for topics below the {minimumLinkedDocumentsForReport}-document readiness threshold.
              </p>
            </div>

            {batchTopicsError && (
              <div className="rounded-lg border border-red-800 bg-red-950 p-4 text-sm text-red-300">
                {batchTopicsError}
              </div>
            )}

            {!batchTopicsError && batchTopicOptions.length === 0 && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-300">
                No active topics currently need more sources. Topics reappear here when they fall below the readiness threshold.
              </div>
            )}

            {!batchTopicsError && batchTopicOptions.length > 0 && (
              <>
                <p className="text-sm text-zinc-200">
                  Previewing {previewTopics.length} of {batchTopicOptions.length} eligible topic{batchTopicOptions.length === 1 ? '' : 's'}.
                </p>
                <div className="space-y-3">
                  {previewTopics.map((topic) => (
                    <div
                      key={topic.id}
                      className="rounded-xl border border-zinc-800 bg-zinc-950 p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-white">{topic.name}</p>
                        <span className="inline-flex items-center rounded-full border border-zinc-700 px-2 py-0.5 text-[11px] text-zinc-300">
                          {topic.linkedDocumentCount} linked doc{topic.linkedDocumentCount === 1 ? '' : 's'}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-zinc-300">{topic.goal}</p>
                      {topic.focusTags.length > 0 && (
                        <p className="mt-2 text-xs text-zinc-400">
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
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800 transition-colors"
              >
                Use Vault-Wide Scout Instead
              </Link>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Run Summary</p>
          <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={currentStatus} />
                <span className="inline-flex items-center rounded-full border border-zinc-700 px-2 py-0.5 text-xs text-zinc-300 bg-zinc-800">
                  {runModeLabel}
                </span>
                <span className="inline-flex items-center rounded-full border border-sky-800 px-2 py-0.5 text-xs text-sky-200 bg-sky-950">
                  Scope: All eligible topics
                </span>
              </div>
              <h2 className="mt-4 text-2xl font-semibold text-white">{batchHeadline}</h2>
              <p className="mt-2 text-sm leading-7 text-zinc-300">{batchDescription}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              {!isStarting && webProposalCount > 0 && (
                <Link
                  href="/today#review-inbox"
                  className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200 transition-colors"
                >
                  Review Queue
                </Link>
              )}
              <Link
                href="/today"
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800 transition-colors"
              >
                Back to Research
              </Link>
              <button
                type="button"
                onClick={() => {
                  void startRun();
                }}
                disabled={isStarting}
                className="rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isStarting ? 'Running...' : 'Run Again'}
              </button>
            </div>
          </div>

          {batchVisibleIssueMessages.length > 0 && (
            <div className="mt-5 rounded-xl border border-red-800 bg-red-950 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-red-300">Run Issues</p>
              <p className="mt-2 text-sm text-red-100">{batchVisibleIssueMessages[0]}</p>
              {batchVisibleIssueMessages.length > 1 && (
                <p className="mt-1 text-xs text-red-200">
                  {batchVisibleIssueMessages.length - 1} more issue{batchVisibleIssueMessages.length - 1 === 1 ? '' : 's'} in Technical Details.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900">
          <div className="border-b border-zinc-800 px-5 py-4">
            <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-[0.18em]">Batch Outcomes</h2>
            <p className="mt-1 text-xs text-zinc-500">
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
              <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-300">
                No eligible topics were processed in this batch.
              </div>
            )}

            {batchResult && batchResult.runs.length > 0 && (
              <article className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white uppercase tracking-[0.18em]">Per-Topic Runs</h3>
                  <span className="text-xs text-zinc-400">{batchResult.runs.length}</span>
                </div>
                <div className="mt-4 space-y-3">
                  {batchResult.runs.map((run) => (
                    <div key={run.topicId} className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-medium text-white">{run.topicName}</p>
                          <p className="mt-1 text-xs text-zinc-500">
                            Run ID: {run.runId ?? '—'} · {run.counts.webProposals ?? 0} proposal{run.counts.webProposals === 1 ? '' : 's'}
                          </p>
                        </div>
                        <StatusBadge status={run.status} />
                      </div>
                      {run.errors.length > 0 && (
                        <p className="mt-3 text-xs text-red-300">{run.errors[0]?.message}</p>
                      )}
                    </div>
                  ))}
                </div>
              </article>
            )}
          </div>
        </div>

        <details className="rounded-xl border border-zinc-800 bg-zinc-900">
          <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-zinc-300 hover:text-white transition-colors">
            Technical Details
          </summary>

          <div className="border-t border-zinc-800 p-5 space-y-5">
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
              <section className="rounded-xl border border-red-800 bg-red-950 p-4">
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-red-300">Issues</h3>
                <ul className="mt-3 space-y-2 text-sm text-red-100">
                  {batchVisibleIssueMessages.map((entry, index) => (
                    <li key={`${entry}-${index}`}>{entry}</li>
                  ))}
                </ul>
              </section>
            )}

            {batchResult && batchResult.runs.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-200">Run Payloads</h3>
                <div className="mt-3 space-y-3">
                  {batchResult.runs.map((run) => (
                    <details
                      key={`${run.topicId}-payload`}
                      className="rounded-lg border border-zinc-800 bg-zinc-950"
                    >
                      <summary className="cursor-pointer px-4 py-3 text-sm text-zinc-300 hover:text-white">
                        {run.topicName} · {run.status}
                      </summary>
                      <div className="border-t border-zinc-800 p-4">
                        <pre className="max-h-64 overflow-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-300">
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
        <div className="rounded-xl border border-sky-800 bg-sky-950 p-5">
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-sky-300 mb-2">Choose Report Topic</p>
              <h2 className="text-xl font-semibold text-white">Select an existing topic with enough source material</h2>
              <p className="mt-2 text-sm text-sky-200">
                Only topics with at least {minimumLinkedDocumentsForReport} linked documents are shown here so the report has enough context to be worth generating.
              </p>
            </div>

            {reportTopicsError && (
              <div className="rounded-lg border border-red-800 bg-red-950 p-4 text-sm text-red-300">
                {reportTopicsError}
              </div>
            )}

            {!reportTopicsError && reportTopicOptions.length === 0 && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-300">
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
                      className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-950 p-4 transition-colors hover:border-zinc-700"
                    >
                      <input
                        type="radio"
                        name="topicId"
                        value={topic.id}
                        className="mt-1 h-4 w-4 border-zinc-600 bg-zinc-900 text-sky-400 focus:ring-sky-800"
                        defaultChecked={reportTopicOptions[0]?.id === topic.id}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-white">{topic.name}</p>
                          <span className="inline-flex items-center rounded-full border border-emerald-800 bg-emerald-950 px-2 py-0.5 text-[11px] text-emerald-200">
                            {topic.linkedDocumentCount} linked docs
                          </span>
                          <span className="inline-flex items-center rounded-full border border-zinc-700 px-2 py-0.5 text-[11px] text-zinc-300">
                            Last report: {formatShortDate(topic.lastReportAt)}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-zinc-300">{topic.goal}</p>
                        {topic.focusTags.length > 0 && (
                          <p className="mt-2 text-xs text-zinc-400">
                            Focus tags: {topic.focusTags.slice(0, 6).join(', ')}
                          </p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>

                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200 transition-colors"
                >
                  Generate Report
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {isVaultWideFindSources && (
        <div className="rounded-xl border border-sky-800 bg-sky-950 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="mb-2 text-xs uppercase tracking-wider text-sky-300">Batch Option</p>
              <h2 className="text-xl font-semibold text-white">Run Find Sources across all eligible topics</h2>
              <p className="mt-2 text-sm text-sky-200">
                Use batch mode when you want one inline scout-only run per active topic that still needs more material before it is report-ready.
              </p>
            </div>
            <Link
              href="/web-scout?runMode=scout_only&scope=all_topics"
              className="inline-flex items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-zinc-200"
            >
              All Eligible Topics
            </Link>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Run Summary</p>
        <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={currentStatus} />
              <span className="inline-flex items-center rounded-full border border-zinc-700 px-2 py-0.5 text-xs text-zinc-300 bg-zinc-800">
                {runModeLabel}
              </span>
              {selectedTopicName && (
                <span className="inline-flex items-center rounded-full border border-sky-800 px-2 py-0.5 text-xs text-sky-200 bg-sky-950">
                  Topic: {selectedTopicName}
                </span>
              )}
            </div>
            <h2 className="mt-4 text-2xl font-semibold text-white">{outcomeHeadline}</h2>
            <p className="mt-2 text-sm leading-7 text-zinc-300">{outcomeDescription}</p>
            <p className="mt-3 text-xs text-zinc-500">
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
                  className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200 transition-colors"
                >
                  Open Report
                </Link>
              ) : !isRunning && pendingReviewCount > 0 ? (
                <Link
                  href="/today#review-inbox"
                  className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200 transition-colors"
                >
                  Review Queue
                </Link>
              ) : null}
              {!isRunning && pendingReviewCount > 0 && results?.report && (
                <Link
                  href="/today#review-inbox"
                  className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800 transition-colors"
                >
                  Review Queue
                </Link>
              )}
              <Link
                href="/today"
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800 transition-colors"
              >
                Back to Research
              </Link>
              <button
                type="button"
                onClick={() => {
                  void startRun();
                }}
                disabled={isStarting}
                className="rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isStarting ? 'Starting...' : 'Run Again'}
              </button>
            </div>
          )}
        </div>

        {visibleIssueMessages.length > 0 && (
          <div className="mt-5 rounded-xl border border-red-800 bg-red-950 p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-red-300">Run Issues</p>
            <p className="mt-2 text-sm text-red-100">
              {visibleIssueMessages[0]}
            </p>
            {visibleIssueMessages.length > 1 && (
              <p className="mt-1 text-xs text-red-200">
                {visibleIssueMessages.length - 1} more issue{visibleIssueMessages.length - 1 === 1 ? '' : 's'} in Technical Details.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900">
        <div className="border-b border-zinc-800 px-5 py-4">
          <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-[0.18em]">What This Run Created</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Results first: report, review items, and direct next places to go.
          </p>
        </div>

        <div className="p-5 space-y-5">
          {isAwaitingTopicSelection && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-300">
              Select a topic above to start a full report run. The finished report summary and next actions will appear here.
            </div>
          )}

          {isRunning && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-300">
              The run is still working. This area will update with finished outputs and next actions when processing completes.
            </div>
          )}

          {!isAwaitingTopicSelection && !isRunning && resultsError && (
            <div className="rounded-lg border border-red-800 bg-red-950 p-4 text-sm text-red-300">
              {resultsError}
            </div>
          )}

          {!isAwaitingTopicSelection && !isRunning && !resultsError && !results && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-400">
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
            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-400">
              No new sources, concepts, flashcards, or report were created in this run.
            </div>
          )}

          {results?.report && (
            <article className="rounded-xl border border-emerald-800 bg-emerald-950 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-300">Report Ready</p>
                  <h3 className="mt-1 text-lg font-semibold text-white">{results.report.title}</h3>
                  <p className="mt-1 text-xs text-emerald-200">
                    Day {results.report.day}
                    {typeof results.report.sourcesCount === 'number'
                      ? ` · ${results.report.sourcesCount} source${results.report.sourcesCount === 1 ? '' : 's'}`
                      : ''}
                  </p>
                  {results.report.topicsCovered.length > 0 && (
                    <p className="mt-2 text-xs text-emerald-100">
                      Covers: {results.report.topicsCovered.slice(0, 5).join(', ')}
                    </p>
                  )}
                  {results.report.preview && (
                    <p className="mt-2 text-sm text-zinc-100 line-clamp-4">{results.report.preview}</p>
                  )}
                </div>
                <Link
                  href={results.report.link}
                  className="inline-flex items-center justify-center rounded-lg bg-white px-3 py-2 text-sm font-semibold text-black hover:bg-zinc-200 transition-colors"
                >
                  Open Report
                </Link>
              </div>
            </article>
          )}

          {resultsReady && results && sourceCount > 0 && (
            <article className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white uppercase tracking-[0.18em]">Source Candidates</h3>
                <span className="text-xs text-zinc-400">{sourceCount}</span>
              </div>
              <p className="mt-2 text-sm text-zinc-400">
                These sources were proposed by this run and are waiting in the review queue.
              </p>
              <div className="mt-4 space-y-3 max-h-96 overflow-y-auto pr-1">
                {results.sources.map((source) => (
                  <div key={source.id} className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
                    {source.url ? (
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-medium text-blue-300 hover:text-blue-200 hover:underline break-words"
                      >
                        {source.title}
                      </a>
                    ) : (
                      <p className="text-sm font-medium text-white">{source.title}</p>
                    )}
                    <p className="mt-1 text-xs text-zinc-500">
                      {source.contentType ?? 'resource'}
                      {typeof source.relevanceScore === 'number'
                        ? ` · relevance ${source.relevanceScore.toFixed(2)}`
                        : ''}
                    </p>
                    {source.summary && (
                      <p className="mt-2 text-xs text-zinc-300 line-clamp-3">{source.summary}</p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <Link
                        href={`/artifacts/${source.id}`}
                        className="inline-flex text-xs text-zinc-200 hover:text-white transition-colors"
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
            <article className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white uppercase tracking-[0.18em]">Concepts</h3>
                <span className="text-xs text-zinc-400">{conceptCount}</span>
              </div>
              <p className="mt-2 text-sm text-zinc-400">
                These concepts were extracted by this run and are ready for review.
              </p>
              <div className="mt-4 space-y-3 max-h-96 overflow-y-auto pr-1">
                {results.concepts.map((concept) => (
                  <div key={concept.id} className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
                    <p className="text-sm font-medium text-white">{concept.title}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {concept.type ?? 'concept'}
                      {concept.documentTitle ? ` · ${concept.documentTitle}` : ''}
                    </p>
                    {concept.summary && (
                      <p className="mt-2 text-xs text-zinc-300 line-clamp-3">{concept.summary}</p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <Link
                        href={`/artifacts/${concept.id}`}
                        className="inline-flex text-xs text-zinc-200 hover:text-white transition-colors"
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
            <details className="rounded-xl border border-zinc-800 bg-zinc-900">
              <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-zinc-300 hover:text-white">
                Flashcards ({flashcardCount})
              </summary>
              <div className="border-t border-zinc-800 px-4 py-3 space-y-3 max-h-80 overflow-y-auto">
                {results.flashcards.map((flashcard) => (
                  <div key={flashcard.id} className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
                    <p className="text-xs text-zinc-500">{flashcard.format ?? 'card'}</p>
                    <p className="mt-1 text-sm text-white">{flashcard.front ?? flashcard.title}</p>
                    {flashcard.back && (
                      <p className="mt-2 text-xs text-zinc-300 line-clamp-3">{flashcard.back}</p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <Link
                        href={`/artifacts/${flashcard.id}`}
                        className="inline-flex text-xs text-zinc-200 hover:text-white transition-colors"
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

      <details className="rounded-xl border border-zinc-800 bg-zinc-900">
        <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-zinc-300 hover:text-white transition-colors">
          Technical Details
        </summary>

        <div className="border-t border-zinc-800 p-5 space-y-5">
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
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-200">Stage Progress</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {stageProgress.map((stage) => (
                  <StageBadge key={stage.id} stage={stage} />
                ))}
              </div>
            </section>
          )}

          {metrics.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-200">Pipeline Metrics</h3>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {metrics.map((metric) => (
                  <div key={metric.label} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                    <p className="text-[11px] text-zinc-500 uppercase tracking-wide">{metric.label}</p>
                    <p className="text-lg font-semibold text-white">{metric.value}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {visibleIssueMessages.length > 0 && (
            <section className="rounded-xl border border-red-800 bg-red-950 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-red-300">Issues</h3>
              <ul className="mt-3 space-y-2 text-sm text-red-100">
                {visibleIssueMessages.map((entry, index) => (
                  <li key={`${entry}-${index}`}>{entry}</li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-200">Step Timeline</h3>
            {!trace || trace.steps.length === 0 ? (
              <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-500">
                Waiting for process steps...
              </div>
            ) : (
              <div className="mt-3 divide-y divide-zinc-800 rounded-xl border border-zinc-800 bg-zinc-950">
                {trace.steps.map((step, index) => {
                  const stageLabel = formatObservedStepLabel(step.name);

                  return (
                    <div key={`${step.name}-${index}`} className="p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <StatusBadge status={step.status} />
                          <span className="inline-flex items-center rounded-full border border-zinc-700 px-2 py-0.5 text-[11px] text-zinc-300 bg-zinc-800">
                            {stageLabel}
                          </span>
                          <p className="text-sm text-white truncate">{step.name}</p>
                        </div>
                        <div className="text-xs text-zinc-500 font-mono">
                          {formatClockTime(step.startedAt, { includeSeconds: true })} · {formatElapsedTime(step.startedAt, step.endedAt)}
                        </div>
                      </div>

                      {Boolean(step.error) && (
                        <p className="mt-2 text-xs text-red-300 font-mono truncate">
                          {safeStringify(step.error)}
                        </p>
                      )}

                      {(Boolean(step.input) || Boolean(step.output)) && (
                        <details className="mt-2">
                          <summary className="text-xs text-zinc-500 cursor-pointer hover:text-zinc-300 transition-colors">
                            View payload
                          </summary>
                          <div className="mt-2 grid gap-2 lg:grid-cols-2">
                            {Boolean(step.input) && (
                              <pre className="text-xs text-zinc-300 bg-zinc-950 border border-zinc-800 rounded-lg p-3 overflow-auto max-h-56">
                                {safeStringify(step.input)}
                              </pre>
                            )}
                            {Boolean(step.output) && (
                              <pre className="text-xs text-zinc-300 bg-zinc-950 border border-zinc-800 rounded-lg p-3 overflow-auto max-h-56">
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

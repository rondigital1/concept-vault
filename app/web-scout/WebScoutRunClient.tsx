'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { StatusBadge } from '@/app/components/StatusBadge';
import { formatClockTime, formatElapsedTime } from '@/app/components/workflowFormatting';

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

type StageId =
  | 'topic_setup'
  | 'resolve_targets'
  | 'curate'
  | 'webscout'
  | 'analyze_findings'
  | 'distill'
  | 'synthesize'
  | 'persist_publish'
  | 'unknown';

type StageProgress = {
  id: StageId;
  label: string;
  status: 'pending' | 'running' | 'done' | 'error';
};

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

const STAGE_ORDER: Array<{ id: StageId; label: string }> = [
  { id: 'topic_setup', label: 'Topic Setup' },
  { id: 'resolve_targets', label: 'Resolve Targets' },
  { id: 'curate', label: 'Curate' },
  { id: 'webscout', label: 'WebScout' },
  { id: 'analyze_findings', label: 'Analyze Findings' },
  { id: 'distill', label: 'Distill' },
  { id: 'synthesize', label: 'Synthesize' },
  { id: 'persist_publish', label: 'Persist & Publish' },
];

function todayISODate(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
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

function parseStageFromStepName(name: string): StageId {
  if (name.startsWith('pipeline_topic_setup')) return 'topic_setup';
  if (name.startsWith('pipeline_resolve_targets')) return 'resolve_targets';
  if (name.startsWith('pipeline_curate') || name.startsWith('curator_')) return 'curate';
  if (name.startsWith('pipeline_webscout') || name.startsWith('webscout_')) return 'webscout';
  if (name.startsWith('pipeline_analyze_findings')) return 'analyze_findings';
  if (name.startsWith('pipeline_distill') || name.startsWith('distiller_')) return 'distill';
  if (name.startsWith('pipeline_synthesize')) return 'synthesize';
  if (name.startsWith('pipeline_persist_publish') || name.startsWith('pipeline_persist')) return 'persist_publish';
  return 'unknown';
}

function summarizeStageProgress(steps: RunStep[]): StageProgress[] {
  return STAGE_ORDER.map((stage) => {
    const stageSteps = steps.filter((step) => parseStageFromStepName(step.name) === stage.id);
    if (stageSteps.some((step) => step.status === 'running')) {
      return { id: stage.id, label: stage.label, status: 'running' };
    }
    if (stageSteps.some((step) => step.status === 'error')) {
      return { id: stage.id, label: stage.label, status: 'error' };
    }
    if (stageSteps.some((step) => step.status === 'ok' || step.status === 'skipped')) {
      return { id: stage.id, label: stage.label, status: 'done' };
    }
    return { id: stage.id, label: stage.label, status: 'pending' };
  });
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
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
      <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className="mt-2 break-all text-2xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs text-zinc-400">{hint}</p>
    </div>
  );
}

type WebScoutRunClientProps = {
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
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultsError, setResultsError] = useState<string | null>(null);

  const autoStartedRef = useRef(false);
  const loadedResultsForRunRef = useRef<string | null>(null);
  const isAwaitingTopicSelection = requiresTopicSelection;

  const startRun = useCallback(async () => {
    if (isAwaitingTopicSelection) {
      return;
    }

    setIsStarting(true);
    setError(null);
    setResultsError(null);
    setTrace(null);
    setResults(null);
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

      const limit = searchParams.get('limit');
      if (limit) {
        const parsed = Number(limit);
        if (Number.isFinite(parsed)) {
          payload.limit = parsed;
        }
      }

      const runMode = searchParams.get('runMode');
      if (runMode) {
        payload.runMode = runMode;
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
  }, [isAwaitingTopicSelection, searchParams]);

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
    if (autoStartedRef.current) {
      return;
    }
    if (isAwaitingTopicSelection) {
      return;
    }
    autoStartedRef.current = true;
    void startRun();
  }, [isAwaitingTopicSelection, startRun]);

  useEffect(() => {
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
  }, [fetchTrace, runId]);

  useEffect(() => {
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
  }, [fetchResults, runId, trace]);

  const isRunning = trace?.status === 'running' || (!!runId && !trace);
  const runModeLabel = formatRunModeLabel(searchParams.get('runMode') ?? results?.mode ?? 'full_report');
  const currentStatus =
    isAwaitingTopicSelection ? 'pending' : trace?.status ?? (runId ? 'running' : 'pending');

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

  return (
    <section className="space-y-6">
      {isAwaitingTopicSelection && (
        <div className="rounded-xl border border-sky-500/25 bg-sky-500/10 p-5 backdrop-blur-sm">
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-sky-300 mb-2">Choose Report Topic</p>
              <h2 className="text-xl font-semibold text-white">Select an existing topic with enough source material</h2>
              <p className="mt-2 text-sm text-sky-100/80">
                Only topics with at least {minimumLinkedDocumentsForReport} linked documents are shown here so the report has enough context to be worth generating.
              </p>
            </div>

            {reportTopicsError && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                {reportTopicsError}
              </div>
            )}

            {!reportTopicsError && reportTopicOptions.length === 0 && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 text-sm text-zinc-300">
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
                      className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-950/80 p-4 transition-colors hover:border-zinc-700"
                    >
                      <input
                        type="radio"
                        name="topicId"
                        value={topic.id}
                        className="mt-1 h-4 w-4 border-zinc-600 bg-zinc-900 text-sky-400 focus:ring-sky-400/60"
                        defaultChecked={reportTopicOptions[0]?.id === topic.id}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-white">{topic.name}</p>
                          <span className="inline-flex items-center rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-200">
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

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-sm">
        <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Run Summary</p>
        <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={currentStatus} />
              <span className="inline-flex items-center rounded-full border border-zinc-700 px-2 py-0.5 text-xs text-zinc-300 bg-zinc-800/80">
                {runModeLabel}
              </span>
              {selectedTopicName && (
                <span className="inline-flex items-center rounded-full border border-sky-500/30 px-2 py-0.5 text-xs text-sky-200 bg-sky-500/10">
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
          <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-red-300">Run Issues</p>
            <p className="mt-2 text-sm text-red-100">
              {visibleIssueMessages[0]}
            </p>
            {visibleIssueMessages.length > 1 && (
              <p className="mt-1 text-xs text-red-200/80">
                {visibleIssueMessages.length - 1} more issue{visibleIssueMessages.length - 1 === 1 ? '' : 's'} in Technical Details.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
        <div className="border-b border-zinc-800 px-5 py-4">
          <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-[0.18em]">What This Run Created</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Results first: report, review items, and direct next places to go.
          </p>
        </div>

        <div className="p-5 space-y-5">
          {isAwaitingTopicSelection && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 text-sm text-zinc-300">
              Select a topic above to start a full report run. The finished report summary and next actions will appear here.
            </div>
          )}

          {isRunning && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 text-sm text-zinc-300">
              The run is still working. This area will update with finished outputs and next actions when processing completes.
            </div>
          )}

          {!isAwaitingTopicSelection && !isRunning && resultsError && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
              {resultsError}
            </div>
          )}

          {!isAwaitingTopicSelection && !isRunning && !resultsError && !results && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 text-sm text-zinc-400">
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
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 text-sm text-zinc-400">
              No new sources, concepts, flashcards, or report were created in this run.
            </div>
          )}

          {results?.report && (
            <article className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-300">Report Ready</p>
                  <h3 className="mt-1 text-lg font-semibold text-white">{results.report.title}</h3>
                  <p className="mt-1 text-xs text-emerald-200/80">
                    Day {results.report.day}
                    {typeof results.report.sourcesCount === 'number'
                      ? ` · ${results.report.sourcesCount} source${results.report.sourcesCount === 1 ? '' : 's'}`
                      : ''}
                  </p>
                  {results.report.topicsCovered.length > 0 && (
                    <p className="mt-2 text-xs text-emerald-100/80">
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
            <article className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white uppercase tracking-[0.18em]">Source Candidates</h3>
                <span className="text-xs text-zinc-400">{sourceCount}</span>
              </div>
              <p className="mt-2 text-sm text-zinc-400">
                These sources were proposed by this run and are waiting in the review queue.
              </p>
              <div className="mt-4 space-y-3 max-h-96 overflow-y-auto pr-1">
                {results.sources.map((source) => (
                  <div key={source.id} className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
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
            <article className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white uppercase tracking-[0.18em]">Concepts</h3>
                <span className="text-xs text-zinc-400">{conceptCount}</span>
              </div>
              <p className="mt-2 text-sm text-zinc-400">
                These concepts were extracted by this run and are ready for review.
              </p>
              <div className="mt-4 space-y-3 max-h-96 overflow-y-auto pr-1">
                {results.concepts.map((concept) => (
                  <div key={concept.id} className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
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
            <details className="rounded-xl border border-zinc-800 bg-zinc-900/40">
              <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-zinc-300 hover:text-white">
                Flashcards ({flashcardCount})
              </summary>
              <div className="border-t border-zinc-800 px-4 py-3 space-y-3 max-h-80 overflow-y-auto">
                {results.flashcards.map((flashcard) => (
                  <div key={flashcard.id} className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
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

      <details className="rounded-xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
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
                  <div key={metric.label} className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
                    <p className="text-[11px] text-zinc-500 uppercase tracking-wide">{metric.label}</p>
                    <p className="text-lg font-semibold text-white">{metric.value}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {visibleIssueMessages.length > 0 && (
            <section className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
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
              <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950/70 p-4 text-sm text-zinc-500">
                Waiting for process steps...
              </div>
            ) : (
              <div className="mt-3 divide-y divide-zinc-800/60 rounded-xl border border-zinc-800 bg-zinc-950/40">
                {trace.steps.map((step, index) => {
                  const stageId = parseStageFromStepName(step.name);
                  const stageLabel = STAGE_ORDER.find((stage) => stage.id === stageId)?.label ?? 'Pipeline';

                  return (
                    <div key={`${step.name}-${index}`} className="p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <StatusBadge status={step.status} />
                          <span className="inline-flex items-center rounded-full border border-zinc-700 px-2 py-0.5 text-[11px] text-zinc-300 bg-zinc-800/80">
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

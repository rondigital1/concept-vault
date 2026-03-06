'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';

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

function formatTime(value?: string): string {
  if (!value) {
    return '—';
  }

  return new Date(value).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatDuration(startedAt?: string, endedAt?: string): string {
  if (!startedAt) {
    return '—';
  }

  const start = new Date(startedAt).getTime();
  const end = endedAt ? new Date(endedAt).getTime() : Date.now();
  const ms = Math.max(end - start, 0);

  if (ms < 1000) {
    return `${ms}ms`;
  }
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }

  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
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

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    running: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    ok: 'bg-green-500/20 text-green-400 border-green-500/30',
    error: 'bg-red-500/20 text-red-400 border-red-500/30',
    partial: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    skipped: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
    pending: 'bg-zinc-800 text-zinc-400 border-zinc-700',
    done: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/35',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full border ${colors[status] || colors.pending}`}
    >
      {status === 'running' && (
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
      )}
      {status}
    </span>
  );
}

function StageBadge({ stage }: { stage: StageProgress }) {
  const stageClass =
    stage.status === 'running'
      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
      : stage.status === 'done'
        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/35'
        : stage.status === 'error'
          ? 'bg-red-500/20 text-red-300 border-red-500/35'
          : 'bg-zinc-800 text-zinc-400 border-zinc-700';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${stageClass}`}>
      {stage.status === 'running' && <span className="h-1.5 w-1.5 rounded-full bg-amber-300 animate-pulse" />}
      {stage.label}
    </span>
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
  const runModeLabel = searchParams.get('runMode') ?? results?.mode ?? 'full_report';
  const currentStatus =
    isAwaitingTopicSelection ? 'pending' : trace?.status ?? (runId ? 'running' : 'pending');
  const currentStatusText = isAwaitingTopicSelection
    ? 'Choose one prepared topic to start a full report run.'
    : isRunning
      ? 'Processing...'
      : runId
        ? 'Run finished.'
        : 'Ready to start.';

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
                No saved topics are report-ready yet. Link more documents to a topic from the Agent Control Center, then try again.
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

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 backdrop-blur-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Current Run</p>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={currentStatus} />
              <span className="inline-flex items-center rounded-full border border-zinc-700 px-2 py-0.5 text-xs text-zinc-300 bg-zinc-800/80">
                mode: {runModeLabel}
              </span>
              {selectedTopicName && (
                <span className="inline-flex items-center rounded-full border border-sky-500/30 px-2 py-0.5 text-xs text-sky-200 bg-sky-500/10">
                  topic: {selectedTopicName}
                </span>
              )}
              <span className={`text-sm ${isRunning ? 'text-amber-300' : 'text-zinc-300'}`}>{currentStatusText}</span>
            </div>
            <p className="text-xs text-zinc-500 mt-2 font-mono">
              {runId ? `runId: ${runId}` : isAwaitingTopicSelection ? 'No run started yet.' : 'Waiting for run id...'}
            </p>
          </div>

          {!isAwaitingTopicSelection && (
            <button
              type="button"
              onClick={() => {
                void startRun();
              }}
              disabled={isStarting}
              className="px-4 py-2 bg-white text-black font-semibold rounded-lg hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isStarting ? 'Starting...' : 'Run Again'}
            </button>
          )}
        </div>

        {stageProgress.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {stageProgress.map((stage) => (
              <StageBadge key={stage.id} stage={stage} />
            ))}
          </div>
        )}

        {metrics.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            {metrics.map((metric) => (
              <div key={metric.label} className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
                <p className="text-[11px] text-zinc-500 uppercase tracking-wide">{metric.label}</p>
                <p className="text-lg font-semibold text-white">{metric.value}</p>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
        <div className="border-b border-zinc-800 px-5 py-4">
          <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider">Generated Results</h2>
          <p className="text-xs text-zinc-500 mt-1">
            Exact output from this run: new concepts, new sources, flashcards, and report links.
          </p>
        </div>

        <div className="p-5 space-y-5">
          {isAwaitingTopicSelection && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 text-sm text-zinc-300">
              Select a topic above to generate a full report. When the run completes, the report summary and its link will appear here.
            </div>
          )}

          {isRunning && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 text-sm text-zinc-400">
              Generated results will appear here when the run completes.
            </div>
          )}

          {!isAwaitingTopicSelection && !isRunning && resultsError && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
              {resultsError}
            </div>
          )}

          {!isAwaitingTopicSelection && !isRunning && !resultsError && !results && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 text-sm text-zinc-400">
              Loading generated results...
            </div>
          )}

          {!isAwaitingTopicSelection && !isRunning && !resultsError && results && generatedCount === 0 && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 text-sm text-zinc-400">
              No new concepts, sources, flashcards, or report were generated in this run.
            </div>
          )}

          {!isAwaitingTopicSelection && !isRunning && !resultsError && results?.report && (
            <article className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-emerald-300">Report Ready</p>
                  <h3 className="text-lg font-semibold text-white mt-1">{results.report.title}</h3>
                  <p className="text-xs text-emerald-200/80 mt-1">
                    Day {results.report.day}
                    {typeof results.report.sourcesCount === 'number'
                      ? ` · ${results.report.sourcesCount} source${results.report.sourcesCount === 1 ? '' : 's'}`
                      : ''}
                  </p>
                  {results.report.topicsCovered.length > 0 && (
                    <p className="text-xs text-emerald-100/80 mt-2">
                      Covers: {results.report.topicsCovered.slice(0, 5).join(', ')}
                    </p>
                  )}
                  {results.report.preview && (
                    <p className="text-sm text-zinc-200 mt-2 line-clamp-3">{results.report.preview}</p>
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

          {!isAwaitingTopicSelection && !isRunning && !resultsError && results && (
            <div className="grid gap-5 lg:grid-cols-2">
              <article className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white uppercase tracking-wide">New Concepts</h3>
                  <span className="text-xs text-zinc-400">{results.concepts.length}</span>
                </div>

                {results.concepts.length === 0 ? (
                  <p className="text-sm text-zinc-500 mt-3">No new concepts generated.</p>
                ) : (
                  <div className="mt-3 space-y-3 max-h-96 overflow-y-auto pr-1">
                    {results.concepts.map((concept) => (
                      <div key={concept.id} className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
                        <p className="text-sm font-medium text-white">{concept.title}</p>
                        <p className="text-xs text-zinc-500 mt-1">
                          {concept.type ?? 'concept'}
                          {concept.documentTitle ? ` · ${concept.documentTitle}` : ''}
                        </p>
                        {concept.summary && (
                          <p className="text-xs text-zinc-300 mt-2 line-clamp-3">{concept.summary}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </article>

              <article className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white uppercase tracking-wide">New Sources</h3>
                  <span className="text-xs text-zinc-400">{results.sources.length}</span>
                </div>

                {results.sources.length === 0 ? (
                  <p className="text-sm text-zinc-500 mt-3">No new sources generated.</p>
                ) : (
                  <div className="mt-3 space-y-3 max-h-96 overflow-y-auto pr-1">
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
                        <p className="text-xs text-zinc-500 mt-1">
                          {source.contentType ?? 'resource'}
                          {typeof source.relevanceScore === 'number'
                            ? ` · relevance ${source.relevanceScore.toFixed(2)}`
                            : ''}
                        </p>
                        {source.summary && (
                          <p className="text-xs text-zinc-300 mt-2 line-clamp-3">{source.summary}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </article>
            </div>
          )}

          {!isAwaitingTopicSelection && !isRunning && !resultsError && results && results.flashcards.length > 0 && (
            <details className="rounded-xl border border-zinc-800 bg-zinc-900/40">
              <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-zinc-300 hover:text-white">
                Flashcards generated ({results.flashcards.length})
              </summary>
              <div className="border-t border-zinc-800 px-4 py-3 space-y-3 max-h-80 overflow-y-auto">
                {results.flashcards.map((flashcard) => (
                  <div key={flashcard.id} className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
                    <p className="text-xs text-zinc-500">{flashcard.format ?? 'card'}</p>
                    <p className="text-sm text-white mt-1">{flashcard.front ?? flashcard.title}</p>
                    {flashcard.back && (
                      <p className="text-xs text-zinc-300 mt-2 line-clamp-3">{flashcard.back}</p>
                    )}
                  </div>
                ))}
              </div>
            </details>
          )}

          {!isAwaitingTopicSelection && !isRunning && !resultsError && results && results.errors.length > 0 && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
              <p className="text-xs uppercase tracking-wide text-red-300">Run Issues</p>
              <ul className="mt-2 space-y-1 text-sm text-red-200">
                {results.errors.map((entry, index) => (
                  <li key={`${entry}-${index}`}>{entry}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <details className="rounded-xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
        <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-zinc-300 hover:text-white transition-colors">
          Technical Timeline
        </summary>

        <div className="border-t border-zinc-800">
          {!trace || trace.steps.length === 0 ? (
            <div className="p-5 text-sm text-zinc-500">Waiting for process steps...</div>
          ) : (
            <div className="divide-y divide-zinc-800/60">
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
                        {formatTime(step.startedAt)} · {formatDuration(step.startedAt, step.endedAt)}
                      </div>
                    </div>

                    {Boolean(step.error) && (
                      <p className="text-xs text-red-300 mt-2 font-mono truncate">
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
        </div>
      </details>
    </section>
  );
}

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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
  kind: 'distill' | 'curate' | 'webScout';
  status: RunStatus;
  startedAt: string;
  completedAt?: string;
  steps: RunStep[];
};

type WebScoutCounts = {
  iterations: number;
  queriesExecuted: number;
  resultsEvaluated: number;
  proposalsCreated: number;
};

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

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    running: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    ok: 'bg-green-500/20 text-green-400 border-green-500/30',
    error: 'bg-red-500/20 text-red-400 border-red-500/30',
    partial: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    skipped: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full border ${colors[status] || colors.skipped}`}
    >
      {status === 'running' && (
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
      )}
      {status}
    </span>
  );
}

function isWebScoutCounts(value: unknown): value is WebScoutCounts {
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

function extractCounts(trace: RunTrace | null): WebScoutCounts | null {
  if (!trace) {
    return null;
  }

  for (let i = trace.steps.length - 1; i >= 0; i -= 1) {
    const output = trace.steps[i]?.output;
    if (!output || typeof output !== 'object') {
      continue;
    }

    const outputRecord = output as Record<string, unknown>;
    const nestedCounts = outputRecord.counts;
    if (isWebScoutCounts(nestedCounts)) {
      return nestedCounts;
    }
    if (isWebScoutCounts(outputRecord)) {
      return outputRecord;
    }
  }

  return null;
}

export function WebScoutRunClient() {
  const [runId, setRunId] = useState<string | null>(null);
  const [trace, setTrace] = useState<RunTrace | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoStartedRef = useRef(false);

  const startRun = useCallback(async () => {
    setIsStarting(true);
    setError(null);
    setTrace(null);

    try {
      const response = await fetch('/api/web-scout/start', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          goal: 'Find resources that complement my recent vault documents',
          mode: 'derive-from-vault',
          day: todayISODate(),
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || 'Failed to start Web Scout run');
      }

      const body = (await response.json()) as { runId: string };
      setRunId(body.runId);
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : 'Failed to start run');
    } finally {
      setIsStarting(false);
    }
  }, []);

  useEffect(() => {
    if (autoStartedRef.current) {
      return;
    }
    autoStartedRef.current = true;
    void startRun();
  }, [startRun]);

  const fetchTrace = useCallback(async (id: string): Promise<RunTrace | null> => {
    const response = await fetch(`/api/runs/${id}`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as RunTrace;
  }, []);

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

  const counts = useMemo(() => extractCounts(trace), [trace]);
  const isRunning = trace?.status === 'running' || (!!runId && !trace);

  return (
    <section className="space-y-5">
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 backdrop-blur-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Current Run</p>
            <div className="flex items-center gap-2">
              {trace ? <StatusBadge status={trace.status} /> : <StatusBadge status="running" />}
              {isRunning ? (
                <span className="text-sm text-amber-300">Processing and streaming steps...</span>
              ) : (
                <span className="text-sm text-zinc-300">Run finished.</span>
              )}
            </div>
            <p className="text-xs text-zinc-500 mt-2 font-mono">
              {runId ? `runId: ${runId}` : 'Waiting for run id...'}
            </p>
          </div>
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
        </div>

        {counts && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
              <p className="text-[11px] text-zinc-500 uppercase tracking-wide">Iterations</p>
              <p className="text-lg font-semibold text-white">{counts.iterations}</p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
              <p className="text-[11px] text-zinc-500 uppercase tracking-wide">Queries</p>
              <p className="text-lg font-semibold text-white">{counts.queriesExecuted}</p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
              <p className="text-[11px] text-zinc-500 uppercase tracking-wide">Evaluated</p>
              <p className="text-lg font-semibold text-white">{counts.resultsEvaluated}</p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
              <p className="text-[11px] text-zinc-500 uppercase tracking-wide">Proposals</p>
              <p className="text-lg font-semibold text-white">{counts.proposalsCreated}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl backdrop-blur-sm">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
            Process Timeline
          </h2>
          <p className="text-xs text-zinc-500">Auto-refresh: 1s</p>
        </div>

        {!trace || trace.steps.length === 0 ? (
          <div className="p-6 text-sm text-zinc-500">Waiting for process steps...</div>
        ) : (
          <div className="divide-y divide-zinc-800/60">
            {trace.steps.map((step, index) => (
              <div key={`${step.name}-${index}`} className="p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <StatusBadge status={step.status} />
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
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

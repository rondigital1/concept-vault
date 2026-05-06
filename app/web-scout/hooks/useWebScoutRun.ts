import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchRunResults,
  fetchRunTraceOrNull,
  type RunTracePayload,
} from '@/lib/runApiClient';
import {
  startBatchFindSourcesRun,
  startPipelineRun,
} from '../runRequests';
import type { BatchFindSourcesResult, RunResultsPayload } from '../types';

export function useWebScoutRun({
  isBatchFindSources,
  requiresTopicSelection,
}: {
  isBatchFindSources: boolean;
  requiresTopicSelection: boolean;
}) {
  const searchParams = useSearchParams();
  const [runId, setRunId] = useState<string | null>(null);
  const [trace, setTrace] = useState<RunTracePayload | null>(null);
  const [results, setResults] = useState<RunResultsPayload | null>(null);
  const [batchResult, setBatchResult] = useState<BatchFindSourcesResult | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultsError, setResultsError] = useState<string | null>(null);

  const autoStartedRef = useRef<string | null>(null);
  const loadedResultsForRunRef = useRef<string | null>(null);
  const autoStartKey = searchParams.toString();

  const startRun = useCallback(async () => {
    if (requiresTopicSelection) {
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
      if (isBatchFindSources) {
        const nextBatchResult = await startBatchFindSourcesRun(searchParams);
        setBatchResult(nextBatchResult);
        return;
      }

      const nextRunId = await startPipelineRun(searchParams);
      setRunId(nextRunId);
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : 'Failed to start run');
    } finally {
      setIsStarting(false);
    }
  }, [isBatchFindSources, requiresTopicSelection, searchParams]);

  useEffect(() => {
    if (autoStartedRef.current === autoStartKey) {
      return;
    }

    if (requiresTopicSelection) {
      return;
    }

    autoStartedRef.current = autoStartKey;
    void startRun();
  }, [autoStartKey, requiresTopicSelection, startRun]);

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
        const nextTrace = await fetchRunTraceOrNull(runId, {
          cache: 'no-store',
        });

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
  }, [isBatchFindSources, runId]);

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
        const nextResults = await fetchRunResults<RunResultsPayload>(
          runId,
          { cache: 'no-store' },
          'Failed to load generated results',
        );

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
  }, [isBatchFindSources, runId, trace]);

  return {
    searchParams,
    runId,
    trace,
    results,
    batchResult,
    isStarting,
    error,
    resultsError,
    startRun,
  };
}

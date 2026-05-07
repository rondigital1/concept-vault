'use client';

import { startTransition, useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useRouter } from 'next/navigation';
import { readDurationMs } from '@/lib/agentRunPresentation';
import type {
  RecentRunSummary,
  SelectedRunDetail,
} from '@/lib/agentsWorkspaceTypes';
import { fetchRunResults, fetchRunTrace } from '@/lib/runApiClient';
import type { WorkspaceNotice } from './agentsInspectorTypes';
import {
  toSelectedRunDetail,
  type RunResultsPayload,
} from './agentsWorkspaceState';

type SetState<T> = Dispatch<SetStateAction<T>>;
type LaunchState = 'idle' | 'launching';

type SelectedRunDetailOptions = {
  selectedRunId: string | null;
  selectedRun: SelectedRunDetail | null;
  recentRuns: RecentRunSummary[];
  setSelectedRun: SetState<SelectedRunDetail | null>;
  setStatusNotice: SetState<WorkspaceNotice | null>;
};

type ActiveRunPollingOptions = {
  activeRunId: string | null;
  recentRuns: RecentRunSummary[];
  setActiveRunId: SetState<string | null>;
  setLaunchState: SetState<LaunchState>;
  setRecentRuns: SetState<RecentRunSummary[]>;
  setSelectedRun: SetState<SelectedRunDetail | null>;
  setStatusNotice: SetState<WorkspaceNotice | null>;
};

export function useSelectedRunDetail({
  selectedRunId,
  selectedRun,
  recentRuns,
  setSelectedRun,
  setStatusNotice,
}: SelectedRunDetailOptions) {
  useEffect(() => {
    if (!selectedRunId || selectedRun?.id === selectedRunId) {
      return;
    }

    let cancelled = false;
    const fallbackRun = recentRuns.find((run) => run.id === selectedRunId) ?? null;

    void Promise.all([
      fetchRunTrace(selectedRunId),
      fetchRunResults<RunResultsPayload>(selectedRunId),
    ])
      .then(([trace, results]) => {
        if (!cancelled) {
          setSelectedRun(toSelectedRunDetail(trace, results, fallbackRun));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatusNotice({
            status: 'error',
            message: 'Unable to load run detail.',
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedRunId, selectedRun, recentRuns, setSelectedRun, setStatusNotice]);
}

export function useActiveRunPolling({
  activeRunId,
  recentRuns,
  setActiveRunId,
  setLaunchState,
  setRecentRuns,
  setSelectedRun,
  setStatusNotice,
}: ActiveRunPollingOptions) {
  const router = useRouter();

  useEffect(() => {
    if (!activeRunId) {
      return;
    }

    let cancelled = false;

    const poll = async () => {
      try {
        const [trace, results] = await Promise.all([
          fetchRunTrace(activeRunId),
          fetchRunResults<RunResultsPayload>(activeRunId),
        ]);

        if (cancelled) {
          return;
        }

        const fallbackRun = recentRuns.find((run) => run.id === activeRunId) ?? null;
        const nextSelectedRun = toSelectedRunDetail(trace, results, fallbackRun);
        setSelectedRun(nextSelectedRun);
        setRecentRuns((current) =>
          current.map((run) =>
            run.id === activeRunId
              ? {
                  ...run,
                  status: trace.status,
                  endedAt: trace.completedAt ?? null,
                  durationMs: readDurationMs(trace.startedAt, trace.completedAt),
                  lastError: nextSelectedRun.lastError,
                  stageProgress: nextSelectedRun.stageProgress,
                }
              : run,
          ),
        );

        if (trace.status !== 'running') {
          setActiveRunId(null);
          setLaunchState('idle');
          setStatusNotice({
            status: trace.status === 'error' ? 'error' : 'ok',
            message: `Run ${trace.status}. Refreshing workspace metrics.`,
          });
          startTransition(() => {
            router.refresh();
          });
        }
      } catch {
        if (!cancelled) {
          setActiveRunId(null);
          setLaunchState('idle');
          setStatusNotice({
            status: 'error',
            message: 'Run polling failed.',
          });
        }
      }
    };

    void poll();
    const interval = window.setInterval(() => {
      void poll();
    }, 1800);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [
    activeRunId,
    recentRuns,
    router,
    setActiveRunId,
    setLaunchState,
    setRecentRuns,
    setSelectedRun,
    setStatusNotice,
  ]);
}

'use client';

import { startTransition, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AgentsView, RecentRunSummary } from '@/lib/agentsWorkspaceTypes';
import { fetchRunResults, fetchRunTrace } from '@/lib/runApiClient';
import {
  buildComposerState,
  buildTopicDraft,
  toSelectedRunDetail,
  updateComposerField,
  updateNestedProfile,
  updateTopicDraftField,
  type RunResultsPayload,
  type WorkspaceNotice,
} from './workspaceState';
import { readDurationMs } from '@/lib/agentRunPresentation';

export function useAgentsWorkspace(initialView: AgentsView) {
  const router = useRouter();
  const [topicOptions, setTopicOptions] = useState(initialView.topicOptions);
  const [globalDraft, setGlobalDraft] = useState(initialView.globalProfiles);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(
    initialView.selectedTopic?.id ?? initialView.topicOptions[0]?.id ?? null,
  );
  const [selectedRunId, setSelectedRunId] = useState<string | null>(
    initialView.selectedRun?.id ?? initialView.recentRuns[0]?.id ?? null,
  );
  const [selectedRun, setSelectedRun] = useState(initialView.selectedRun);
  const [recentRuns, setRecentRuns] = useState(initialView.recentRuns);
  const [composer, setComposer] = useState(
    buildComposerState(initialView.selectedTopic, initialView.globalProfiles),
  );
  const [topicDraft, setTopicDraft] = useState(buildTopicDraft(initialView.selectedTopic));
  const [globalSaveState, setGlobalSaveState] = useState<'idle' | 'saving'>('idle');
  const [topicSaveState, setTopicSaveState] = useState<'idle' | 'saving'>('idle');
  const [launchState, setLaunchState] = useState<'idle' | 'launching'>('idle');
  const [statusNotice, setStatusNotice] = useState<WorkspaceNotice | null>(null);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const selectedTopic = topicOptions.find((topic) => topic.id === selectedTopicId) ?? null;

  useEffect(() => {
    setTopicDraft(buildTopicDraft(selectedTopic));
    setComposer(buildComposerState(selectedTopic, globalDraft));
  }, [selectedTopicId, selectedTopic, globalDraft]);

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
          setStatusNotice({ status: 'error', message: 'Unable to load run detail.' });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedRunId, selectedRun, recentRuns]);

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
          startTransition(() => router.refresh());
        }
      } catch {
        if (!cancelled) {
          setActiveRunId(null);
          setLaunchState('idle');
          setStatusNotice({ status: 'error', message: 'Run polling failed.' });
        }
      }
    };

    void poll();
    const interval = window.setInterval(() => void poll(), 1800);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [activeRunId, recentRuns, router]);

  async function handleSaveGlobal() {
    setGlobalSaveState('saving');
    setStatusNotice(null);
    try {
      const entries = [
        ['pipeline', globalDraft.pipeline],
        ['curator', globalDraft.curator],
        ['webScout', globalDraft.webScout],
        ['distiller', globalDraft.distiller],
      ] as const;
      const responses = await Promise.all(
        entries.map(async ([agentKey, payload]) => {
          const response = await fetch(`/api/agents/profiles/${agentKey}`, {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (!response.ok) {
            throw new Error(`Failed to save ${agentKey}`);
          }
          return response.json();
        }),
      );
      setGlobalDraft({
        pipeline: responses[0].profile.settings,
        curator: responses[1].profile.settings,
        webScout: responses[2].profile.settings,
        distiller: responses[3].profile.settings,
      });
      setStatusNotice({ status: 'ok', message: 'Global defaults saved.' });
    } catch {
      setStatusNotice({ status: 'error', message: 'Failed to save global defaults.' });
    } finally {
      setGlobalSaveState('idle');
    }
  }

  async function handleSaveTopic() {
    if (!selectedTopicId || !topicDraft) {
      return;
    }

    setTopicSaveState('saving');
    setStatusNotice(null);
    try {
      const response = await fetch(`/api/topics/${selectedTopicId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(topicDraft),
      });
      if (!response.ok) {
        throw new Error('Failed to save topic');
      }
      const body = await response.json();
      setTopicOptions((current) =>
        current.map((topic) => (topic.id === selectedTopicId ? body.topicOption : topic)),
      );
      setStatusNotice({ status: 'ok', message: 'Topic overrides saved.' });
    } catch {
      setStatusNotice({ status: 'error', message: 'Failed to save topic overrides.' });
    } finally {
      setTopicSaveState('idle');
    }
  }

  async function handleLaunchRun() {
    setLaunchState('launching');
    setStatusNotice(null);
    try {
      const response = await fetch('/api/runs/pipeline', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          topicId: selectedTopicId ?? undefined,
          runMode: composer.runMode,
          goal: composer.goal.trim() || undefined,
          enableCategorization: composer.enableCategorization,
          skipPublish: composer.skipPublish,
          minQualityResults: composer.minQualityResults,
          minRelevanceScore: composer.minRelevanceScore,
          maxIterations: composer.maxIterations,
          maxQueries: composer.maxQueries,
          limit: composer.maxDocsPerRun,
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to start run');
      }

      const body = await response.json();
      const placeholderRun: RecentRunSummary = {
        id: body.runId,
        kind: 'pipeline',
        status: 'running',
        startedAt: new Date().toISOString(),
        endedAt: null,
        durationMs: null,
        topicId: selectedTopicId,
        topicName: selectedTopic?.name ?? null,
        runMode: composer.runMode,
        stageProgress: [],
        lastError: null,
      };
      setRecentRuns((current) =>
        [placeholderRun, ...current.filter((run) => run.id !== body.runId)].slice(0, 12),
      );
      setSelectedRunId(body.runId);
      setSelectedRun({ ...placeholderRun, results: null, stages: [] });
      setActiveRunId(body.runId);
      setStatusNotice({ status: 'running', message: 'Run started. Live execution detail is updating now.' });
    } catch {
      setLaunchState('idle');
      setStatusNotice({ status: 'error', message: 'Failed to start run.' });
    }
  }

  return {
    topicOptions,
    selectedTopicId,
    selectedTopic,
    globalDraft,
    topicDraft,
    composer,
    selectedRunId,
    selectedRun,
    recentRuns,
    globalSaveState,
    topicSaveState,
    launchState,
    statusNotice,
    setSelectedRunId,
    setSelectedTopicId,
    handleSaveGlobal,
    handleSaveTopic,
    handleLaunchRun,
    onGlobalChange: (field: string, value: string | number | boolean) =>
      setGlobalDraft((current) => updateNestedProfile(current, field, value)),
    onTopicChange: (field: string, value: string | number | boolean) =>
      setTopicDraft((current) => updateTopicDraftField(current, field, value)),
    onComposerChange: (field: string, value: string | number | boolean) =>
      setComposer((current) => updateComposerField(current, field, value)),
  };
}

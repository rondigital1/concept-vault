'use client';

import { startTransition, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AgentsChrome } from './AgentsChrome';
import { AgentRegistry } from './AgentRegistry';
import { AgentsInspector } from './AgentsInspector';
import type { AgentProfileSettingsMap } from '@/server/agents/configuration';
import {
  formatObservedStepLabel,
  parseObservedAgentKey,
  readDurationMs,
  summarizeStageProgress,
} from '@/lib/agentRunPresentation';
import type {
  AgentsView,
  RecentRunSummary,
  RunComposerState,
  SelectedRunDetail,
} from '@/lib/agentsWorkspaceTypes';
import { fetchRunResults, fetchRunTrace, type RunTracePayload } from '@/lib/runApiClient';

type Props = {
  initialView: AgentsView;
};

type WorkspaceNotice = {
  status: 'info' | 'ok' | 'error' | 'running';
  message: string;
};

type RunResultsPayload = {
  runId: string;
  status: 'running' | 'ok' | 'error' | 'partial';
  mode: string | null;
  errors: string[];
  report: { id: string } | null;
  concepts: Array<{ id: string }>;
  sources: Array<{ id: string }>;
  flashcards: Array<{ id: string }>;
};

function readObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function readString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function buildComposerState(
  selectedTopic: AgentsView['selectedTopic'],
  globalProfiles: AgentProfileSettingsMap,
): RunComposerState {
  return {
    runMode:
      selectedTopic?.workflowSettings.defaultRunMode ?? globalProfiles.pipeline.defaultRunMode,
    goal: selectedTopic?.goal ?? '',
    enableCategorization:
      selectedTopic?.workflowSettings.enableCategorizationByDefault ??
      globalProfiles.curator.enableCategorizationByDefault,
    skipPublish:
      selectedTopic?.workflowSettings.skipPublishByDefault ??
      globalProfiles.pipeline.skipPublishByDefault,
    minQualityResults:
      selectedTopic?.workflowSettings.minQualityResults ?? globalProfiles.webScout.minQualityResults,
    minRelevanceScore:
      selectedTopic?.workflowSettings.minRelevanceScore ??
      globalProfiles.webScout.minRelevanceScore,
    maxIterations:
      selectedTopic?.workflowSettings.maxIterations ?? globalProfiles.webScout.maxIterations,
    maxQueries: selectedTopic?.workflowSettings.maxQueries ?? globalProfiles.webScout.maxQueries,
    maxDocsPerRun:
      selectedTopic?.workflowSettings.maxDocsPerRun ?? globalProfiles.distiller.maxDocsPerRun,
  };
}

function buildTopicDraft(selectedTopic: AgentsView['selectedTopic']) {
  if (!selectedTopic) {
    return null;
  }

  return {
    defaultRunMode: selectedTopic.workflowSettings.defaultRunMode,
    enableCategorizationByDefault: selectedTopic.workflowSettings.enableCategorizationByDefault,
    skipPublishByDefault: selectedTopic.workflowSettings.skipPublishByDefault,
    maxDocsPerRun: selectedTopic.workflowSettings.maxDocsPerRun,
    minQualityResults: selectedTopic.workflowSettings.minQualityResults,
    minRelevanceScore: selectedTopic.workflowSettings.minRelevanceScore,
    maxIterations: selectedTopic.workflowSettings.maxIterations,
    maxQueries: selectedTopic.workflowSettings.maxQueries,
    isTracked: selectedTopic.isTracked,
    isActive: selectedTopic.isActive,
    cadence: selectedTopic.cadence,
  };
}

function updateNestedProfile(
  current: AgentProfileSettingsMap,
  field: string,
  value: string | number | boolean,
): AgentProfileSettingsMap {
  const [agentKey, property] = field.split('.');
  if (!agentKey || !property) {
    return current;
  }

  return {
    ...current,
    [agentKey]: {
      ...(current as Record<string, Record<string, unknown>>)[agentKey],
      [property]: value,
    },
  } as AgentProfileSettingsMap;
}

function updateTopicDraftField(
  current: ReturnType<typeof buildTopicDraft>,
  field: string,
  value: string | number | boolean,
) {
  if (!current) {
    return current;
  }

  return {
    ...current,
    [field]: value,
  };
}

function updateComposerField(
  current: RunComposerState,
  field: string,
  value: string | number | boolean,
): RunComposerState {
  return {
    ...current,
    [field]: value,
  } as RunComposerState;
}

function toSelectedRunDetail(
  trace: RunTracePayload,
  results: RunResultsPayload | null,
  fallbackRun: RecentRunSummary | null,
): SelectedRunDetail {
  return {
    id: trace.id,
    kind: trace.kind,
    status: trace.status,
    startedAt: trace.startedAt,
    endedAt: trace.completedAt ?? null,
    durationMs: readDurationMs(trace.startedAt, trace.completedAt),
    topicId: fallbackRun?.topicId ?? null,
    topicName: fallbackRun?.topicName ?? null,
    runMode: results?.mode ?? fallbackRun?.runMode ?? null,
    stageProgress: summarizeStageProgress(
      trace.steps.map((step) => ({
        name: step.name,
        status: step.status,
        startedAt: step.startedAt,
        endedAt: step.endedAt,
      })),
    ),
    lastError:
      trace.steps
        .map((step) => readString(readObject(step.error)?.message))
        .find((message): message is string => Boolean(message)) ?? fallbackRun?.lastError ?? null,
    results: results
      ? {
          reportId: results.report?.id ?? null,
          conceptCount: results.concepts.length,
          flashcardCount: results.flashcards.length,
          sourceCount: results.sources.length,
          errors: results.errors,
        }
      : null,
    stages: trace.steps.map((step) => ({
      id: step.name,
      label: formatObservedStepLabel(step.name),
      agentKey: parseObservedAgentKey(step.name, trace.kind),
      status: step.status,
      startedAt: step.startedAt ?? null,
      endedAt: step.endedAt ?? null,
      durationMs: readDurationMs(step.startedAt, step.endedAt),
      error: readString(readObject(step.error)?.message),
    })),
  };
}

export function AgentsWorkspaceClient({ initialView }: Props) {
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
  const agentRegistry = initialView.agentRegistry;
  const executionEvents = initialView.executionEvents;
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
          setStatusNotice({
            status: 'error',
            message: 'Unable to load run detail.',
          });
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
      setStatusNotice({
        status: 'ok',
        message: 'Global defaults saved.',
      });
    } catch {
      setStatusNotice({
        status: 'error',
        message: 'Failed to save global defaults.',
      });
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
      setStatusNotice({
        status: 'ok',
        message: 'Topic overrides saved.',
      });
    } catch {
      setStatusNotice({
        status: 'error',
        message: 'Failed to save topic overrides.',
      });
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
      setSelectedRun({
        ...placeholderRun,
        results: null,
        stages: [],
      });
      setActiveRunId(body.runId);
      setStatusNotice({
        status: 'running',
        message: 'Run started. Live execution detail is updating now.',
      });
    } catch {
      setLaunchState('idle');
      setStatusNotice({
        status: 'error',
        message: 'Failed to start run.',
      });
    }
  }

  return (
    <AgentsChrome
      activeAgentCount={agentRegistry.filter((entry) => entry.state === 'live').length}
      selectedTopicName={selectedTopic?.name ?? null}
      topicCount={topicOptions.length}
      recentRunCount={recentRuns.length}
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.92fr)] 2xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="min-w-0">
          <AgentRegistry
            agentRegistry={agentRegistry}
            recentRuns={recentRuns}
            executionEvents={executionEvents}
            selectedRunId={selectedRunId}
            selectedTopicName={selectedTopic?.name ?? null}
            onRunSelect={setSelectedRunId}
          />
        </section>

        <aside className="min-w-0">
          <AgentsInspector
            topicOptions={topicOptions}
            selectedTopicId={selectedTopicId}
            selectedTopic={selectedTopic}
            globalDraft={globalDraft}
            topicDraft={topicDraft}
            composer={composer}
            selectedRun={selectedRun}
            globalSaveState={globalSaveState}
            topicSaveState={topicSaveState}
            launchState={launchState}
            statusNotice={statusNotice}
            onSelectTopic={(topicId) => setSelectedTopicId(topicId)}
            onGlobalChange={(field, value) =>
              setGlobalDraft((current) => updateNestedProfile(current, field, value))
            }
            onSaveGlobal={handleSaveGlobal}
            onTopicChange={(field, value) =>
              setTopicDraft((current) => updateTopicDraftField(current, field, value))
            }
            onSaveTopic={handleSaveTopic}
            onComposerChange={(field, value) =>
              setComposer((current) => updateComposerField(current, field, value))
            }
            onLaunchRun={handleLaunchRun}
          />
        </aside>
      </div>
    </AgentsChrome>
  );
}

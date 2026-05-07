'use client';

import { useEffect, useState } from 'react';
import { AgentsChrome } from './AgentsChrome';
import { AgentRegistry } from './AgentRegistry';
import { AgentsInspector } from './AgentsInspector';
import type { AgentsView } from '@/lib/agentsWorkspaceTypes';
import type { WorkspaceNotice } from './agentsInspectorTypes';
import {
  buildComposerState,
  buildTopicDraft,
  updateComposerField,
  updateNestedProfile,
  updateTopicDraftField,
} from './agentsWorkspaceState';
import {
  buildRunningPipelineRunSummary,
  saveGlobalAgentProfiles,
  saveTopicWorkflowDraft,
  startPipelineRun,
} from './agentsWorkspaceRequests';
import {
  useActiveRunPolling,
  useSelectedRunDetail,
} from './useAgentsRunDetail';

type Props = {
  initialView: AgentsView;
};

export function AgentsWorkspaceClient({ initialView }: Props) {
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

  useSelectedRunDetail({
    selectedRunId,
    selectedRun,
    recentRuns,
    setSelectedRun,
    setStatusNotice,
  });

  useActiveRunPolling({
    activeRunId,
    recentRuns,
    setActiveRunId,
    setLaunchState,
    setRecentRuns,
    setSelectedRun,
    setStatusNotice,
  });

  async function handleSaveGlobal() {
    setGlobalSaveState('saving');
    setStatusNotice(null);

    try {
      setGlobalDraft(await saveGlobalAgentProfiles(globalDraft));
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
      const topicOption = await saveTopicWorkflowDraft(selectedTopicId, topicDraft);
      setTopicOptions((current) =>
        current.map((topic) => (topic.id === selectedTopicId ? topicOption : topic)),
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
      const runId = await startPipelineRun({
        selectedTopicId,
        composer,
      });
      const placeholderRun = buildRunningPipelineRunSummary({
        runId,
        selectedTopicId,
        selectedTopicName: selectedTopic?.name ?? null,
        runMode: composer.runMode,
      });

      setRecentRuns((current) =>
        [placeholderRun, ...current.filter((run) => run.id !== runId)].slice(0, 12),
      );
      setSelectedRunId(runId);
      setSelectedRun({
        ...placeholderRun,
        results: null,
        stages: [],
      });
      setActiveRunId(runId);
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

'use client';

import { AgentsChrome } from './AgentsChrome';
import { AgentRegistry } from './AgentRegistry';
import { AgentsInspector } from './AgentsInspector';
import { useAgentsWorkspace } from './useAgentsWorkspace';
import type { AgentsView } from '@/lib/agentsWorkspaceTypes';

type Props = {
  initialView: AgentsView;
};

export function AgentsWorkspaceClient({ initialView }: Props) {
  const workspace = useAgentsWorkspace(initialView);
  const agentRegistry = initialView.agentRegistry;
  const executionEvents = initialView.executionEvents;

  return (
    <AgentsChrome
      activeAgentCount={agentRegistry.filter((entry) => entry.state === 'live').length}
      selectedTopicName={workspace.selectedTopic?.name ?? null}
      topicCount={workspace.topicOptions.length}
      recentRunCount={workspace.recentRuns.length}
    >
      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="min-w-0">
          <AgentRegistry
            agentRegistry={agentRegistry}
            recentRuns={workspace.recentRuns}
            executionEvents={executionEvents}
            selectedRunId={workspace.selectedRunId}
            selectedTopicName={workspace.selectedTopic?.name ?? null}
            topicCount={workspace.topicOptions.length}
            onRunSelect={workspace.setSelectedRunId}
          />
        </section>

        <aside className="min-w-0">
          <AgentsInspector
            topicOptions={workspace.topicOptions}
            selectedTopicId={workspace.selectedTopicId}
            selectedTopic={workspace.selectedTopic}
            globalDraft={workspace.globalDraft}
            topicDraft={workspace.topicDraft}
            composer={workspace.composer}
            selectedRun={workspace.selectedRun}
            globalSaveState={workspace.globalSaveState}
            topicSaveState={workspace.topicSaveState}
            launchState={workspace.launchState}
            statusNotice={workspace.statusNotice}
            onSelectTopic={workspace.setSelectedTopicId}
            onGlobalChange={workspace.onGlobalChange}
            onSaveGlobal={workspace.handleSaveGlobal}
            onTopicChange={workspace.onTopicChange}
            onSaveTopic={workspace.handleSaveTopic}
            onComposerChange={workspace.onComposerChange}
            onLaunchRun={workspace.handleLaunchRun}
          />
        </aside>
      </div>
    </AgentsChrome>
  );
}

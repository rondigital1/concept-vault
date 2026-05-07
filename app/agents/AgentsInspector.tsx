'use client';

import type { AgentProfileSettingsMap } from '@/server/agents/configuration';
import type {
  AgentTopicOption,
  RunComposerState,
  SelectedRunDetail,
} from '@/lib/agentsWorkspaceTypes';
import type {
  InspectorFieldChange,
  TopicWorkflowDraft,
  WorkspaceNotice,
} from './agentsInspectorTypes';
import { GlobalDefaultsPanel } from './GlobalDefaultsPanel';
import { RunLaunchPanel } from './RunLaunchPanel';
import { TopicOverridesPanel } from './TopicOverridesPanel';

type Props = {
  topicOptions: AgentTopicOption[];
  selectedTopicId: string | null;
  selectedTopic: AgentTopicOption | null;
  globalDraft: AgentProfileSettingsMap;
  topicDraft: TopicWorkflowDraft | null;
  composer: RunComposerState;
  selectedRun: SelectedRunDetail | null;
  globalSaveState: 'idle' | 'saving';
  topicSaveState: 'idle' | 'saving';
  launchState: 'idle' | 'launching';
  statusNotice: WorkspaceNotice | null;
  onSelectTopic: (topicId: string | null) => void;
  onGlobalChange: InspectorFieldChange;
  onSaveGlobal: () => void;
  onTopicChange: InspectorFieldChange;
  onSaveTopic: () => void;
  onComposerChange: InspectorFieldChange;
  onLaunchRun: () => void;
};

export function AgentsInspector({
  topicOptions,
  selectedTopicId,
  selectedTopic,
  globalDraft,
  topicDraft,
  composer,
  selectedRun,
  globalSaveState,
  topicSaveState,
  launchState,
  statusNotice,
  onSelectTopic,
  onGlobalChange,
  onSaveGlobal,
  onTopicChange,
  onSaveTopic,
  onComposerChange,
  onLaunchRun,
}: Props) {
  return (
    <div id="agents-controls" className="space-y-5 xl:sticky xl:top-[6.5rem]">
      <GlobalDefaultsPanel
        globalDraft={globalDraft}
        globalSaveState={globalSaveState}
        onGlobalChange={onGlobalChange}
        onSaveGlobal={onSaveGlobal}
      />

      <TopicOverridesPanel
        topicOptions={topicOptions}
        selectedTopicId={selectedTopicId}
        selectedTopic={selectedTopic}
        topicDraft={topicDraft}
        topicSaveState={topicSaveState}
        onSelectTopic={onSelectTopic}
        onTopicChange={onTopicChange}
        onSaveTopic={onSaveTopic}
      />

      <RunLaunchPanel
        composer={composer}
        selectedRun={selectedRun}
        launchState={launchState}
        statusNotice={statusNotice}
        onComposerChange={onComposerChange}
        onLaunchRun={onLaunchRun}
      />
    </div>
  );
}

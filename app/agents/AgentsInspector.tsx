'use client';

import { ExecutionDetailSection } from './ExecutionDetailSection';
import { GlobalDefaultsSection } from './GlobalDefaultsSection';
import { TopicOverridesSection } from './TopicOverridesSection';
import type { AgentProfileSettingsMap } from '@/server/agents/configuration';
import type {
  AgentTopicOption,
  RunComposerState,
  SelectedRunDetail,
} from '@/lib/agentsWorkspaceTypes';
import type { TopicDraft, WorkspaceNotice } from './workspaceState';

type Props = {
  topicOptions: AgentTopicOption[];
  selectedTopicId: string | null;
  selectedTopic: AgentTopicOption | null;
  globalDraft: AgentProfileSettingsMap;
  topicDraft: TopicDraft | null;
  composer: RunComposerState;
  selectedRun: SelectedRunDetail | null;
  globalSaveState: 'idle' | 'saving';
  topicSaveState: 'idle' | 'saving';
  launchState: 'idle' | 'launching';
  statusNotice: WorkspaceNotice | null;
  onSelectTopic: (topicId: string | null) => void;
  onGlobalChange: (field: string, value: string | number | boolean) => void;
  onSaveGlobal: () => void;
  onTopicChange: (field: string, value: string | number | boolean) => void;
  onSaveTopic: () => void;
  onComposerChange: (field: string, value: string | number | boolean) => void;
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
      <GlobalDefaultsSection
        globalDraft={globalDraft}
        globalSaveState={globalSaveState}
        onGlobalChange={onGlobalChange}
        onSaveGlobal={onSaveGlobal}
      />
      <TopicOverridesSection
        topicOptions={topicOptions}
        selectedTopicId={selectedTopicId}
        selectedTopic={selectedTopic}
        topicDraft={topicDraft}
        topicSaveState={topicSaveState}
        onSelectTopic={onSelectTopic}
        onTopicChange={onTopicChange}
        onSaveTopic={onSaveTopic}
      />
      <ExecutionDetailSection
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

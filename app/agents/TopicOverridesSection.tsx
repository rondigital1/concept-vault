'use client';

import { EmptyState } from '@/app/components/EmptyState';
import { ActionRow, NumberField, ToggleField } from './InspectorControls';
import { formatCadenceLabel } from './presentation';
import {
  workspaceInputClassName,
  workspaceInsetSurfaceClassName,
  workspaceLabelClassName,
  workspaceMutedCopyClassName,
  workspacePillClassName,
  workspaceSecondaryButtonClassName,
  workspaceShellPanelClassName,
} from './workspaceTheme';
import type { AgentTopicOption } from '@/lib/agentsWorkspaceTypes';
import type { TopicDraft } from './workspaceState';

type Props = {
  topicOptions: AgentTopicOption[];
  selectedTopicId: string | null;
  selectedTopic: AgentTopicOption | null;
  topicDraft: TopicDraft | null;
  topicSaveState: 'idle' | 'saving';
  onSelectTopic: (topicId: string | null) => void;
  onTopicChange: (field: string, value: string | number | boolean) => void;
  onSaveTopic: () => void;
};

export function TopicOverridesSection({
  topicOptions,
  selectedTopicId,
  selectedTopic,
  topicDraft,
  topicSaveState,
  onSelectTopic,
  onTopicChange,
  onSaveTopic,
}: Props) {
  const hasTopics = topicOptions.length > 0;

  return (
    <section className={`${workspaceShellPanelClassName} px-5 py-5 sm:px-6`}>
      <ActionRow
        eyebrow="Topic Overrides"
        title="Selected topic workflow"
        actionLabel={topicSaveState === 'saving' ? 'Saving topic' : 'Save topic'}
        actionClassName={workspaceSecondaryButtonClassName}
        disabled={!topicDraft || topicSaveState === 'saving'}
        onAction={onSaveTopic}
      />

      <div className="mt-6 space-y-4">
        {hasTopics ? (
          <label className="space-y-2">
            <span className={workspaceLabelClassName}>Topic</span>
            <select
              className={workspaceInputClassName}
              value={selectedTopicId ?? ''}
              onChange={(event) => onSelectTopic(event.target.value || null)}
            >
              {topicOptions.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {topicDraft && selectedTopic ? (
          <div className="space-y-4">
            <div className={`${workspaceInsetSurfaceClassName} p-4`}>
              <div className="flex flex-wrap gap-2">
                <span className={workspacePillClassName}>{formatCadenceLabel(topicDraft.cadence)}</span>
                {topicDraft.isTracked ? <span className={workspacePillClassName}>Tracked</span> : null}
                {topicDraft.isActive ? <span className={workspacePillClassName}>Active</span> : null}
              </div>
              <p className={`mt-4 ${workspaceMutedCopyClassName}`}>{selectedTopic.goal}</p>
            </div>

            <div className={`${workspaceInsetSurfaceClassName} p-4`}>
              <fieldset className="space-y-4">
                <legend className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/64">
                  Workflow settings
                </legend>

                <label className="space-y-2">
                  <span className={workspaceLabelClassName}>Default run mode</span>
                  <select
                    className={workspaceInputClassName}
                    value={topicDraft.defaultRunMode}
                    onChange={(event) => onTopicChange('defaultRunMode', event.target.value)}
                  >
                    <option value="full_report">Full report</option>
                    <option value="incremental_update">Incremental update</option>
                    <option value="scout_only">Scout only</option>
                    <option value="concept_only">Concept only</option>
                  </select>
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <NumberField
                    label="Max docs per run"
                    value={topicDraft.maxDocsPerRun}
                    min={1}
                    max={20}
                    onChange={(value) => onTopicChange('maxDocsPerRun', value)}
                  />
                  <NumberField
                    label="Min quality results"
                    value={topicDraft.minQualityResults}
                    min={1}
                    max={20}
                    onChange={(value) => onTopicChange('minQualityResults', value)}
                  />
                  <NumberField
                    label="Min relevance score"
                    value={topicDraft.minRelevanceScore}
                    min={0}
                    max={1}
                    step={0.05}
                    onChange={(value) => onTopicChange('minRelevanceScore', value)}
                  />
                  <NumberField
                    label="Max iterations"
                    value={topicDraft.maxIterations}
                    min={1}
                    max={20}
                    onChange={(value) => onTopicChange('maxIterations', value)}
                  />
                </div>

                <NumberField
                  label="Max queries"
                  value={topicDraft.maxQueries}
                  min={1}
                  max={50}
                  onChange={(value) => onTopicChange('maxQueries', value)}
                />
              </fieldset>
            </div>

            <div className="space-y-3">
              <ToggleField
                label="Categorize during curation"
                description="Apply Curator category tagging whenever this topic runs."
                checked={topicDraft.enableCategorizationByDefault}
                onChange={(value) => onTopicChange('enableCategorizationByDefault', value)}
              />
              <ToggleField
                label="Skip publish for this topic"
                description="Hold generated artifacts in review unless a launch overrides the topic default."
                checked={topicDraft.skipPublishByDefault}
                onChange={(value) => onTopicChange('skipPublishByDefault', value)}
              />
              <ToggleField
                label="Tracked topic"
                description="Keep this topic available in active operating views."
                checked={topicDraft.isTracked}
                onChange={(value) => onTopicChange('isTracked', value)}
              />
              <ToggleField
                label="Active topic"
                description="Allow the topic to participate in launches and monitoring."
                checked={topicDraft.isActive}
                onChange={(value) => onTopicChange('isActive', value)}
              />
            </div>

            <label className="space-y-2">
              <span className={workspaceLabelClassName}>Cadence</span>
              <select
                className={workspaceInputClassName}
                value={topicDraft.cadence}
                onChange={(event) => onTopicChange('cadence', event.target.value)}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </label>
          </div>
        ) : (
          <EmptyState
            title={hasTopics ? 'No topic selected' : 'No saved topics yet'}
            description={
              hasTopics
                ? 'Choose a topic to review workflow overrides and launch topic-scoped runs.'
                : 'Create or ingest source material first, then saved topics will become configurable here.'
            }
            className="border-white/[0.08] bg-[rgba(16,18,20,0.86)] p-8 shadow-none"
          />
        )}
      </div>
    </section>
  );
}

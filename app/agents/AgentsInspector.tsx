'use client';

import { useId } from 'react';
import { EmptyState } from '@/app/components/EmptyState';
import { StatusBadge } from '@/app/components/StatusBadge';
import { formatClockTime, formatElapsedTime } from '@/app/components/workflowFormatting';
import { formatCadenceLabel, formatRunDescriptor } from './presentation';
import {
  workspaceEyebrowClassName,
  workspaceInputClassName,
  workspaceInsetSurfaceClassName,
  workspaceLabelClassName,
  workspaceMutedCopyClassName,
  workspacePillClassName,
  workspacePrimaryButtonClassName,
  workspaceSecondaryButtonClassName,
  workspaceShellPanelClassName,
  workspaceTextareaClassName,
} from './workspaceTheme';
import type { AgentProfileSettingsMap } from '@/server/agents/configuration';
import type {
  AgentTopicOption,
  RunComposerState,
  SelectedRunDetail,
} from '@/lib/agentsWorkspaceTypes';

type WorkspaceNotice = {
  status: 'info' | 'ok' | 'error' | 'running';
  message: string;
};

type Props = {
  topicOptions: AgentTopicOption[];
  selectedTopicId: string | null;
  selectedTopic: AgentTopicOption | null;
  globalDraft: AgentProfileSettingsMap;
  topicDraft: {
    defaultRunMode: RunComposerState['runMode'];
    enableCategorizationByDefault: boolean;
    skipPublishByDefault: boolean;
    maxDocsPerRun: number;
    minQualityResults: number;
    minRelevanceScore: number;
    maxIterations: number;
    maxQueries: number;
    isTracked: boolean;
    isActive: boolean;
    cadence: 'daily' | 'weekly';
  } | null;
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

function ToggleField({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const labelId = useId();
  const descriptionId = useId();

  return (
    <div className={`${workspaceInsetSurfaceClassName} flex items-start justify-between gap-4 px-4 py-4`}>
      <div className="min-w-0">
        <div id={labelId} className="text-sm font-medium text-white">
          {label}
        </div>
        {description ? (
          <p id={descriptionId} className={`mt-1 ${workspaceMutedCopyClassName}`}>
            {description}
          </p>
        ) : null}
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        aria-describedby={description ? descriptionId : undefined}
        onClick={() => onChange(!checked)}
        className={[
          'relative h-7 w-14 shrink-0 rounded-full transition-[background-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--surface-accent-strong)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#101214]',
          checked ? 'bg-[color:var(--surface-accent-ink)]' : 'bg-white/[0.12]',
        ].join(' ')}
      >
        <span
          aria-hidden="true"
          className={[
            'absolute top-1 h-5 w-5 rounded-full bg-white transition-transform',
            checked ? 'translate-x-8' : 'translate-x-1',
          ].join(' ')}
        />
      </button>
    </div>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="space-y-2">
      <span className={workspaceLabelClassName}>{label}</span>
      <input
        type="number"
        inputMode={step && step < 1 ? 'decimal' : 'numeric'}
        className={workspaceInputClassName}
        value={value}
        min={min}
        max={max}
        step={step ?? 1}
        onChange={(event) => {
          const nextValue = Number(event.target.value);
          if (!Number.isNaN(nextValue)) {
            onChange(nextValue);
          }
        }}
      />
    </label>
  );
}

function ActionRow({
  eyebrow,
  title,
  actionLabel,
  actionClassName,
  disabled,
  onAction,
}: {
  eyebrow: string;
  title: string;
  actionLabel: string;
  actionClassName: string;
  disabled: boolean;
  onAction: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className={workspaceEyebrowClassName}>{eyebrow}</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">{title}</h2>
      </div>
      <button type="button" className={actionClassName} onClick={onAction} disabled={disabled}>
        {actionLabel}
      </button>
    </div>
  );
}

function ResultsMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className={`${workspaceInsetSurfaceClassName} px-4 py-4`}>
      <div className="text-2xl font-semibold tracking-[-0.04em] text-white">{value}</div>
      <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--surface-text-muted)]">
        {label}
      </div>
    </div>
  );
}

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
  const hasTopics = topicOptions.length > 0;

  return (
    <div id="agents-controls" className="space-y-5 xl:sticky xl:top-[6.5rem]">
      <section className={`${workspaceShellPanelClassName} px-5 py-5 sm:px-6`}>
        <ActionRow
          eyebrow="Global Defaults"
          title="Cross-workspace execution defaults"
          actionLabel={globalSaveState === 'saving' ? 'Saving defaults' : 'Save defaults'}
          actionClassName={workspacePrimaryButtonClassName}
          disabled={globalSaveState === 'saving'}
          onAction={onSaveGlobal}
        />

        <div className="mt-6 space-y-5">
          <div className={`${workspaceInsetSurfaceClassName} p-4`}>
            <fieldset className="space-y-4">
              <legend className={workspaceEyebrowClassName}>Pipeline</legend>

              <label className="space-y-2">
                <span className={workspaceLabelClassName}>Default run mode</span>
                <select
                  className={workspaceInputClassName}
                  value={globalDraft.pipeline.defaultRunMode}
                  onChange={(event) =>
                    onGlobalChange('pipeline.defaultRunMode', event.target.value)
                  }
                >
                  <option value="full_report">Full report</option>
                  <option value="incremental_update">Incremental update</option>
                  <option value="scout_only">Scout only</option>
                  <option value="concept_only">Concept only</option>
                </select>
              </label>

              <ToggleField
                label="Auto-distill on ingest"
                description="Apply the pipeline defaults immediately after new source ingestion."
                checked={globalDraft.pipeline.enableAutoDistillOnIngest}
                onChange={(value) =>
                  onGlobalChange('pipeline.enableAutoDistillOnIngest', value)
                }
              />
              <ToggleField
                label="Skip publish by default"
                description="Keep generated artifacts in review states unless a run explicitly overrides it."
                checked={globalDraft.pipeline.skipPublishByDefault}
                onChange={(value) => onGlobalChange('pipeline.skipPublishByDefault', value)}
              />
            </fieldset>
          </div>

          <div className={`${workspaceInsetSurfaceClassName} p-4`}>
            <fieldset className="space-y-4">
              <legend className={workspaceEyebrowClassName}>Agent thresholds</legend>

              <ToggleField
                label="Curator categorization"
                description="Apply category tagging during curation by default."
                checked={globalDraft.curator.enableCategorizationByDefault}
                onChange={(value) =>
                  onGlobalChange('curator.enableCategorizationByDefault', value)
                }
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <NumberField
                  label="Min quality results"
                  value={globalDraft.webScout.minQualityResults}
                  min={1}
                  max={20}
                  onChange={(value) => onGlobalChange('webScout.minQualityResults', value)}
                />
                <NumberField
                  label="Min relevance score"
                  value={globalDraft.webScout.minRelevanceScore}
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={(value) => onGlobalChange('webScout.minRelevanceScore', value)}
                />
                <NumberField
                  label="Max iterations"
                  value={globalDraft.webScout.maxIterations}
                  min={1}
                  max={20}
                  onChange={(value) => onGlobalChange('webScout.maxIterations', value)}
                />
                <NumberField
                  label="Max queries"
                  value={globalDraft.webScout.maxQueries}
                  min={1}
                  max={50}
                  onChange={(value) => onGlobalChange('webScout.maxQueries', value)}
                />
              </div>
              <NumberField
                label="Max docs per run"
                value={globalDraft.distiller.maxDocsPerRun}
                min={1}
                max={20}
                onChange={(value) => onGlobalChange('distiller.maxDocsPerRun', value)}
              />
            </fieldset>
          </div>
        </div>
      </section>

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
                  <legend className={workspaceEyebrowClassName}>Workflow settings</legend>

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
                  onChange={(value) =>
                    onTopicChange('enableCategorizationByDefault', value)
                  }
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

      <section className={`${workspaceShellPanelClassName} px-5 py-5 sm:px-6`}>
        <ActionRow
          eyebrow="Execution Detail"
          title="Launch and inspect"
          actionLabel={launchState === 'launching' ? 'Launching run' : 'Launch run'}
          actionClassName={workspacePrimaryButtonClassName}
          disabled={launchState === 'launching'}
          onAction={onLaunchRun}
        />

        <div className="mt-6 space-y-4">
          <div className={`${workspaceInsetSurfaceClassName} p-4`}>
            <fieldset className="space-y-4">
              <legend className={workspaceEyebrowClassName}>Launch configuration</legend>

              <label className="space-y-2">
                <span className={workspaceLabelClassName}>Run mode</span>
                <select
                  className={workspaceInputClassName}
                  value={composer.runMode}
                  onChange={(event) => onComposerChange('runMode', event.target.value)}
                >
                  <option value="full_report">Full report</option>
                  <option value="incremental_update">Incremental update</option>
                  <option value="scout_only">Scout only</option>
                  <option value="concept_only">Concept only</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className={workspaceLabelClassName}>Goal override</span>
                <textarea
                  className={workspaceTextareaClassName}
                  rows={4}
                  value={composer.goal}
                  onChange={(event) => onComposerChange('goal', event.target.value)}
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <NumberField
                  label="Max docs per run"
                  value={composer.maxDocsPerRun}
                  min={1}
                  max={20}
                  onChange={(value) => onComposerChange('maxDocsPerRun', value)}
                />
                <NumberField
                  label="Min quality results"
                  value={composer.minQualityResults}
                  min={1}
                  max={20}
                  onChange={(value) => onComposerChange('minQualityResults', value)}
                />
                <NumberField
                  label="Min relevance score"
                  value={composer.minRelevanceScore}
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={(value) => onComposerChange('minRelevanceScore', value)}
                />
                <NumberField
                  label="Max iterations"
                  value={composer.maxIterations}
                  min={1}
                  max={20}
                  onChange={(value) => onComposerChange('maxIterations', value)}
                />
              </div>

              <NumberField
                label="Max queries"
                value={composer.maxQueries}
                min={1}
                max={50}
                onChange={(value) => onComposerChange('maxQueries', value)}
              />
            </fieldset>
          </div>

          <div className="space-y-3">
            <ToggleField
              label="Categorize during run"
              description="Use the Curator categorization setting for this launch."
              checked={composer.enableCategorization}
              onChange={(value) => onComposerChange('enableCategorization', value)}
            />
            <ToggleField
              label="Skip publish"
              description="Keep artifacts in review states for this run only."
              checked={composer.skipPublish}
              onChange={(value) => onComposerChange('skipPublish', value)}
            />
          </div>

          {statusNotice ? (
            <div
              aria-live="polite"
              className={`${workspaceInsetSurfaceClassName} flex items-start gap-3 px-4 py-4`}
            >
              <StatusBadge status={statusNotice.status} />
              <p className="text-sm leading-6 text-white">{statusNotice.message}</p>
            </div>
          ) : null}

          <div className={`${workspaceInsetSurfaceClassName} p-4`}>
            <p className={workspaceEyebrowClassName}>Selected run</p>

            {selectedRun ? (
              <div className="mt-4 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={selectedRun.status} />
                  <span className={workspacePillClassName}>
                    {formatRunDescriptor(selectedRun.runMode, selectedRun.kind)}
                  </span>
                  {selectedRun.topicName ? (
                    <span className={workspacePillClassName}>{selectedRun.topicName}</span>
                  ) : null}
                </div>

                <div className={`text-sm leading-6 ${workspaceMutedCopyClassName}`}>
                  Started {formatClockTime(selectedRun.startedAt, { includeSeconds: true })} ·
                  {' '}Duration {formatElapsedTime(selectedRun.startedAt, selectedRun.endedAt ?? undefined)}
                </div>

                <div className="space-y-3">
                  {selectedRun.stages.map((stage) => (
                    <div key={stage.id} className={`${workspaceInsetSurfaceClassName} px-4 py-4`}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-medium text-white">{stage.label}</div>
                          <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--surface-text-muted)]">
                            {stage.agentKey ?? 'pipeline'}
                          </div>
                        </div>
                        <StatusBadge status={stage.status} />
                      </div>
                      <div className="mt-3 text-xs text-[color:var(--surface-text-muted)]">
                        {formatClockTime(stage.startedAt ?? undefined, { includeSeconds: true })} ·{' '}
                        {stage.durationMs !== null
                          ? formatElapsedTime(stage.startedAt ?? undefined, stage.endedAt ?? undefined)
                          : 'Pending'}
                      </div>
                      {stage.error ? <p className="mt-3 text-sm text-rose-200">{stage.error}</p> : null}
                    </div>
                  ))}
                </div>

                {selectedRun.results ? (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <ResultsMetric label="Sources" value={selectedRun.results.sourceCount} />
                      <ResultsMetric
                        label="Outputs"
                        value={
                          selectedRun.results.conceptCount +
                          selectedRun.results.flashcardCount
                        }
                      />
                    </div>
                    {selectedRun.results.errors.length > 0 ? (
                      <div className={`${workspaceInsetSurfaceClassName} px-4 py-4`}>
                        <div className={workspaceEyebrowClassName}>Result errors</div>
                        <div className="mt-3 space-y-2">
                          {selectedRun.results.errors.map((errorMessage) => (
                            <p key={errorMessage} className="text-sm leading-6 text-rose-200">
                              {errorMessage}
                            </p>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : null}
              </div>
            ) : (
              <EmptyState
                title="No run selected"
                description="Choose a recent run to inspect stages, results, and any execution errors."
                className="mt-4 border-white/[0.08] bg-[rgba(16,18,20,0.86)] p-8 shadow-none"
              />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

'use client';

import { formatClockTime, formatElapsedTime } from '@/app/components/workflowFormatting';
import type { AgentProfileSettingsMap } from '@/server/agents/configuration';
import type {
  AgentTopicOption,
  RunComposerState,
  SelectedRunDetail,
} from '@/lib/agentsWorkspaceTypes';

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
  statusMessage: string | null;
  onSelectTopic: (topicId: string) => void;
  onGlobalChange: (field: string, value: string | number | boolean) => void;
  onSaveGlobal: () => void;
  onTopicChange: (field: string, value: string | number | boolean) => void;
  onSaveTopic: () => void;
  onComposerChange: (field: string, value: string | number | boolean) => void;
  onLaunchRun: () => void;
};

function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4 text-sm text-[color:var(--agents-text-soft)]">
      <span>{label}</span>
      <span className={`relative h-7 w-14 rounded-full ${checked ? 'bg-[color:var(--agents-accent)]' : 'bg-[rgba(255,255,255,0.12)]'}`}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="sr-only"
        />
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${
            checked ? 'left-8' : 'left-1'
          }`}
        />
      </span>
    </label>
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
      <span className="agents-label">{label}</span>
      <input
        type="number"
        className="agents-input"
        value={value}
        min={min}
        max={max}
        step={step ?? 1}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
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
  statusMessage,
  onSelectTopic,
  onGlobalChange,
  onSaveGlobal,
  onTopicChange,
  onSaveTopic,
  onComposerChange,
  onLaunchRun,
}: Props) {
  return (
    <div id="agents-inspector" className="space-y-5 lg:sticky lg:top-24">
      <section className="agents-panel agents-panel-high rounded-[28px] px-5 py-5 sm:px-6">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="agents-label">Global defaults</p>
            <h2 className="mt-2 text-2xl font-black tracking-[-0.05em] text-[color:var(--agents-accent)]">
              Cross-app execution defaults
            </h2>
          </div>
          <button type="button" className="agents-button-primary" onClick={onSaveGlobal} disabled={globalSaveState === 'saving'}>
            {globalSaveState === 'saving' ? 'Saving' : 'Save defaults'}
          </button>
        </div>

        <div className="mt-6 space-y-5">
          <div className="agents-panel agents-panel-lowest rounded-[22px] p-4">
            <p className="agents-label">Pipeline</p>
            <div className="mt-4 space-y-3">
              <label className="space-y-2">
                <span className="agents-label">Default run mode</span>
                <select
                  className="agents-select"
                  value={globalDraft.pipeline.defaultRunMode}
                  onChange={(event) => onGlobalChange('pipeline.defaultRunMode', event.target.value)}
                >
                  <option value="full_report">Full report</option>
                  <option value="incremental_update">Incremental update</option>
                  <option value="scout_only">Scout only</option>
                  <option value="concept_only">Concept only</option>
                </select>
              </label>
              <ToggleField
                label="Auto-distill on ingest"
                checked={globalDraft.pipeline.enableAutoDistillOnIngest}
                onChange={(value) => onGlobalChange('pipeline.enableAutoDistillOnIngest', value)}
              />
              <ToggleField
                label="Skip publish by default"
                checked={globalDraft.pipeline.skipPublishByDefault}
                onChange={(value) => onGlobalChange('pipeline.skipPublishByDefault', value)}
              />
            </div>
          </div>

          <div className="agents-panel agents-panel-lowest rounded-[22px] p-4">
            <p className="agents-label">Curator / WebScout / Distiller</p>
            <div className="mt-4 space-y-4">
              <ToggleField
                label="Curator categorization"
                checked={globalDraft.curator.enableCategorizationByDefault}
                onChange={(value) => onGlobalChange('curator.enableCategorizationByDefault', value)}
              />
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
              <div className="grid gap-4 sm:grid-cols-2">
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
            </div>
          </div>
        </div>
      </section>

      <section className="agents-panel agents-panel-low rounded-[28px] px-5 py-5 sm:px-6">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="agents-label">Topic overrides</p>
            <h2 className="mt-2 text-2xl font-black tracking-[-0.05em] text-[color:var(--agents-accent)]">
              Selected topic workflow
            </h2>
          </div>
          <button
            type="button"
            className="agents-button-secondary"
            onClick={onSaveTopic}
            disabled={!topicDraft || topicSaveState === 'saving'}
          >
            {topicSaveState === 'saving' ? 'Saving' : 'Save topic'}
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <label className="space-y-2">
            <span className="agents-label">Topic</span>
            <select
              className="agents-select"
              value={selectedTopicId ?? ''}
              onChange={(event) => onSelectTopic(event.target.value)}
            >
              {topicOptions.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.name}
                </option>
              ))}
            </select>
          </label>

          {topicDraft ? (
            <div className="space-y-4">
              <label className="space-y-2">
                <span className="agents-label">Default run mode</span>
                <select
                  className="agents-select"
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

              <div className="space-y-3">
                <ToggleField
                  label="Categorize during curation"
                  checked={topicDraft.enableCategorizationByDefault}
                  onChange={(value) => onTopicChange('enableCategorizationByDefault', value)}
                />
                <ToggleField
                  label="Skip publish for this topic"
                  checked={topicDraft.skipPublishByDefault}
                  onChange={(value) => onTopicChange('skipPublishByDefault', value)}
                />
                <ToggleField
                  label="Tracked topic"
                  checked={topicDraft.isTracked}
                  onChange={(value) => onTopicChange('isTracked', value)}
                />
                <ToggleField
                  label="Active topic"
                  checked={topicDraft.isActive}
                  onChange={(value) => onTopicChange('isActive', value)}
                />
              </div>

              <label className="space-y-2">
                <span className="agents-label">Cadence</span>
                <select
                  className="agents-select"
                  value={topicDraft.cadence}
                  onChange={(event) => onTopicChange('cadence', event.target.value)}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </label>

              {selectedTopic ? (
                <p className="text-sm leading-6 text-[color:var(--agents-muted)]">
                  {selectedTopic.goal}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-[color:var(--agents-muted)]">No topic selected.</p>
          )}
        </div>
      </section>

      <section className="agents-panel agents-panel-high rounded-[28px] px-5 py-5 sm:px-6">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="agents-label">Execution detail</p>
            <h2 className="mt-2 text-2xl font-black tracking-[-0.05em] text-[color:var(--agents-accent)]">
              Launch and inspect
            </h2>
          </div>
          <button type="button" className="agents-button-primary" onClick={onLaunchRun} disabled={launchState === 'launching'}>
            {launchState === 'launching' ? 'Launching' : 'Launch run'}
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <label className="space-y-2">
            <span className="agents-label">Run mode</span>
            <select
              className="agents-select"
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
            <span className="agents-label">Goal override</span>
            <textarea
              className="agents-textarea"
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

          <div className="space-y-3">
            <ToggleField
              label="Categorize during run"
              checked={composer.enableCategorization}
              onChange={(value) => onComposerChange('enableCategorization', value)}
            />
            <ToggleField
              label="Skip publish"
              checked={composer.skipPublish}
              onChange={(value) => onComposerChange('skipPublish', value)}
            />
          </div>

          {statusMessage ? (
            <div className="rounded-[18px] bg-[rgba(255,255,255,0.06)] px-4 py-3 text-sm text-[color:var(--agents-text-soft)]">
              {statusMessage}
            </div>
          ) : null}

          <div className="agents-panel agents-panel-lowest rounded-[22px] p-4">
            <p className="agents-label">Selected run</p>
            {selectedRun ? (
              <div className="mt-4 space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="agents-chip">{selectedRun.status}</span>
                  <span className="agents-chip">{selectedRun.runMode ?? selectedRun.kind}</span>
                  {selectedRun.topicName ? <span className="agents-chip">{selectedRun.topicName}</span> : null}
                </div>

                <div className="text-sm leading-6 text-[color:var(--agents-text-soft)]">
                  Started {formatClockTime(selectedRun.startedAt, { includeSeconds: true })} · Duration{' '}
                  {formatElapsedTime(selectedRun.startedAt, selectedRun.endedAt ?? undefined)}
                </div>

                <div className="space-y-3">
                  {selectedRun.stages.map((stage) => (
                    <div key={stage.id} className="rounded-[18px] bg-[rgba(255,255,255,0.04)] px-4 py-3">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="text-sm font-semibold text-[color:var(--agents-text)]">{stage.label}</div>
                          <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[color:var(--agents-muted)]">
                            {stage.agentKey ?? 'pipeline'}
                          </div>
                        </div>
                        <span className="agents-chip">{stage.status}</span>
                      </div>
                      <div className="mt-2 text-xs text-[color:var(--agents-muted-strong)]">
                        {formatClockTime(stage.startedAt ?? undefined, { includeSeconds: true })} ·{' '}
                        {stage.durationMs !== null
                          ? formatElapsedTime(stage.startedAt ?? undefined, stage.endedAt ?? undefined)
                          : 'Pending'}
                      </div>
                      {stage.error ? (
                        <div className="mt-2 text-xs text-[#ffd9d9]">{stage.error}</div>
                      ) : null}
                    </div>
                  ))}
                </div>

                {selectedRun.results ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[18px] bg-[rgba(255,255,255,0.04)] px-4 py-4">
                      <div className="text-lg font-semibold text-[color:var(--agents-accent)]">{selectedRun.results.sourceCount}</div>
                      <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-[color:var(--agents-muted)]">Sources</div>
                    </div>
                    <div className="rounded-[18px] bg-[rgba(255,255,255,0.04)] px-4 py-4">
                      <div className="text-lg font-semibold text-[color:var(--agents-accent)]">
                        {selectedRun.results.conceptCount + selectedRun.results.flashcardCount}
                      </div>
                      <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-[color:var(--agents-muted)]">Outputs</div>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="mt-4 text-sm text-[color:var(--agents-muted)]">No run selected.</div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

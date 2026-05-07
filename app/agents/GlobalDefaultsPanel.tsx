'use client';

import type { AgentProfileSettingsMap } from '@/server/agents/configuration';
import type { InspectorFieldChange } from './agentsInspectorTypes';
import { ActionRow, NumberField, RunModeSelect, ToggleField } from './AgentsInspectorFields';
import {
  workspaceEyebrowClassName,
  workspaceInsetSurfaceClassName,
  workspacePrimaryButtonClassName,
  workspaceShellPanelClassName,
} from './workspaceTheme';

export function GlobalDefaultsPanel({
  globalDraft,
  globalSaveState,
  onGlobalChange,
  onSaveGlobal,
}: {
  globalDraft: AgentProfileSettingsMap;
  globalSaveState: 'idle' | 'saving';
  onGlobalChange: InspectorFieldChange;
  onSaveGlobal: () => void;
}) {
  return (
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

            <RunModeSelect
              label="Default run mode"
              value={globalDraft.pipeline.defaultRunMode}
              onChange={(value) => onGlobalChange('pipeline.defaultRunMode', value)}
            />

            <ToggleField
              label="Auto-distill on ingest"
              description="Apply the pipeline defaults immediately after new source ingestion."
              checked={globalDraft.pipeline.enableAutoDistillOnIngest}
              onChange={(value) => onGlobalChange('pipeline.enableAutoDistillOnIngest', value)}
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
              onChange={(value) => onGlobalChange('curator.enableCategorizationByDefault', value)}
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
  );
}

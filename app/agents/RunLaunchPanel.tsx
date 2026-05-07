'use client';

import { StatusBadge } from '@/app/components/StatusBadge';
import type { RunComposerState, SelectedRunDetail } from '@/lib/agentsWorkspaceTypes';
import type { InspectorFieldChange, WorkspaceNotice } from './agentsInspectorTypes';
import { ActionRow, NumberField, RunModeSelect, ToggleField } from './AgentsInspectorFields';
import { SelectedRunDetailPanel } from './SelectedRunDetailPanel';
import {
  workspaceEyebrowClassName,
  workspaceInsetSurfaceClassName,
  workspaceLabelClassName,
  workspacePrimaryButtonClassName,
  workspaceShellPanelClassName,
  workspaceTextareaClassName,
} from './workspaceTheme';

export function RunLaunchPanel({
  composer,
  selectedRun,
  launchState,
  statusNotice,
  onComposerChange,
  onLaunchRun,
}: {
  composer: RunComposerState;
  selectedRun: SelectedRunDetail | null;
  launchState: 'idle' | 'launching';
  statusNotice: WorkspaceNotice | null;
  onComposerChange: InspectorFieldChange;
  onLaunchRun: () => void;
}) {
  return (
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

            <RunModeSelect
              label="Run mode"
              value={composer.runMode}
              onChange={(value) => onComposerChange('runMode', value)}
            />

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

        <SelectedRunDetailPanel selectedRun={selectedRun} />
      </div>
    </section>
  );
}

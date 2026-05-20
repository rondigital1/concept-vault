'use client';

import { EmptyState } from '@/app/components/EmptyState';
import { StatusBadge } from '@/app/components/StatusBadge';
import { formatClockTime, formatElapsedTime } from '@/app/components/workflowFormatting';
import { ActionRow, NumberField, ResultsMetric, ToggleField } from './InspectorControls';
import { formatRunDescriptor } from './presentation';
import {
  workspaceEyebrowClassName,
  workspaceInputClassName,
  workspaceInsetSurfaceClassName,
  workspaceLabelClassName,
  workspaceMutedCopyClassName,
  workspacePillClassName,
  workspacePrimaryButtonClassName,
  workspaceShellPanelClassName,
  workspaceTextareaClassName,
} from './workspaceTheme';
import type { RunComposerState, SelectedRunDetail } from '@/lib/agentsWorkspaceTypes';
import type { WorkspaceNotice } from './workspaceState';

type Props = {
  composer: RunComposerState;
  selectedRun: SelectedRunDetail | null;
  launchState: 'idle' | 'launching';
  statusNotice: WorkspaceNotice | null;
  onComposerChange: (field: string, value: string | number | boolean) => void;
  onLaunchRun: () => void;
};

function SelectedRunStages({ selectedRun }: { selectedRun: SelectedRunDetail }) {
  return (
    <div className="space-y-3">
      {selectedRun.stages.map((stage) => (
        <div key={stage.id} className={`${workspaceInsetSurfaceClassName} px-4 py-4`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-white">{stage.label}</div>
              <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/64">
                {stage.agentKey ?? 'pipeline'}
              </div>
            </div>
            <StatusBadge status={stage.status} />
          </div>
          <div className="mt-3 text-xs text-white/64">
            {formatClockTime(stage.startedAt ?? undefined, { includeSeconds: true })} ·{' '}
            {stage.durationMs !== null
              ? formatElapsedTime(stage.startedAt ?? undefined, stage.endedAt ?? undefined)
              : 'Pending'}
          </div>
          {stage.error ? <p className="mt-3 text-sm text-rose-200">{stage.error}</p> : null}
        </div>
      ))}
    </div>
  );
}

function SelectedRunResults({ selectedRun }: { selectedRun: SelectedRunDetail }) {
  if (!selectedRun.results) {
    return null;
  }

  const outputCount = selectedRun.results.conceptCount + selectedRun.results.flashcardCount;

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <ResultsMetric label="Sources" value={selectedRun.results.sourceCount} />
        <ResultsMetric label="Outputs" value={outputCount} />
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
  );
}

export function ExecutionDetailSection({
  composer,
  selectedRun,
  launchState,
  statusNotice,
  onComposerChange,
  onLaunchRun,
}: Props) {
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
                <option value="skip">Resolve targets only</option>
              </select>
            </label>

            {composer.runMode === 'skip' ? (
              <p className={`text-sm leading-6 ${workspaceMutedCopyClassName}`}>
                Resolves the target day, topic, goal, and documents, then records the run without
                calling Curator, Distiller, WebScout, report synthesis, or publishing.
              </p>
            ) : null}

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
                Started {formatClockTime(selectedRun.startedAt, { includeSeconds: true })} · Duration{' '}
                {formatElapsedTime(selectedRun.startedAt, selectedRun.endedAt ?? undefined)}
              </div>

              <SelectedRunStages selectedRun={selectedRun} />
              <SelectedRunResults selectedRun={selectedRun} />
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
  );
}

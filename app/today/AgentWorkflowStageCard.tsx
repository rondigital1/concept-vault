'use client';

import Link from 'next/link';
import { WorkspaceIcon } from './EvidenceWorkspaceIcon';
import { secondaryButtonClass } from './WorkspaceHeaderPrimitives';
import type { DrawerKey, SelectedTopicSummary, TopicWorkflowSummary } from './types';

type Props = {
  selectedTopic: SelectedTopicSummary | null;
  workflowSummary: TopicWorkflowSummary;
  runDetailsHref: string;
  onDrawerOpen: (drawer: DrawerKey) => void;
};

export function AgentWorkflowStageCard({
  selectedTopic,
  workflowSummary,
  runDetailsHref,
  onDrawerOpen,
}: Props) {
  return (
    <article className="today-panel today-panel-glow col-span-12 md:col-span-4 xl:col-span-4 px-6 py-8 text-center">
      <div className="relative mx-auto flex h-32 w-32 items-center justify-center rounded-full bg-[color:var(--today-accent-strong)] text-[color:var(--today-accent-ink)] shadow-[0_0_32px_rgba(255,255,255,0.12)]">
        <div className="absolute inset-0 rounded-full border-[10px] border-white/18 animate-ping" />
        <WorkspaceIcon name="sparkles" className="h-8 w-8" />
      </div>
      <h3 className="mt-8 text-[1.65rem] font-semibold tracking-[-0.04em] text-[color:var(--today-accent-strong)]">
        {workflowSummary.stageLabel.replace(/\s+/g, '_').toUpperCase()}
      </h3>
      <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-[color:var(--today-muted)]">
        {workflowSummary.stageDescription}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <button type="button" onClick={() => onDrawerOpen('topic')} className={secondaryButtonClass}>
          Topic
        </button>
        {selectedTopic?.latestReport ? (
          <button
            type="button"
            onClick={() => onDrawerOpen('report')}
            className={secondaryButtonClass}
          >
            Report
          </button>
        ) : null}
        <Link href={runDetailsHref} className={secondaryButtonClass}>
          Runs
        </Link>
      </div>
    </article>
  );
}

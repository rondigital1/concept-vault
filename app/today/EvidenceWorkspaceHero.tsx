'use client';

import Link from 'next/link';
import { FindSourcesButton } from './FindSourcesButton';
import { TopicWorkspaceSwitcher } from './TopicWorkspaceSwitcher';
import { primaryButtonClass, StatusChip } from './WorkspaceHeaderPrimitives';
import { formatRelativeTime } from './utils';
import type { SelectedTopicSummary, TopicWorkflowSummary } from './types';

function renderHeroPrimaryAction({
  selectedTopic,
  workflowSummary,
  generateReportHref,
  runDetailsHref,
}: {
  selectedTopic: SelectedTopicSummary | null;
  workflowSummary: TopicWorkflowSummary;
  generateReportHref: string | null;
  runDetailsHref: string;
}) {
  if (selectedTopic && workflowSummary.primaryAction === 'find_sources') {
    return (
      <FindSourcesButton
        scope="topic"
        topicId={selectedTopic.id}
        topicName={selectedTopic.name}
        label="Run Search"
      />
    );
  }

  if (selectedTopic && generateReportHref) {
    return (
      <Link href={generateReportHref} className={primaryButtonClass}>
        Generate Report
      </Link>
    );
  }

  return (
    <Link href={runDetailsHref} className={primaryButtonClass}>
      Open Runs
    </Link>
  );
}

export function EvidenceWorkspaceHero({
  topics,
  selectedTopic,
  selectedTopicId,
  workflowSummary,
  pendingCount,
  savedCount,
  isSwitching,
  generateReportHref,
  runDetailsHref,
  onTopicChange,
}: {
  topics: SelectedTopicSummary[];
  selectedTopic: SelectedTopicSummary | null;
  selectedTopicId: string | null;
  workflowSummary: TopicWorkflowSummary;
  pendingCount: number;
  savedCount: number;
  isSwitching: boolean;
  generateReportHref: string | null;
  runDetailsHref: string;
  onTopicChange: (topicId: string) => void;
}) {
  const selectedTopicLastUpdate = formatRelativeTime(selectedTopic?.lastRunAt);

  return (
    <section id="today-hero" className="mb-14 flex flex-col items-center pt-8 text-center lg:pt-12">
      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[color:var(--today-muted-strong)]">
        CONCEPT VAULT RESEARCH CORE
      </p>
      <h1 className="mt-6 text-[clamp(2.9rem,6vw,6rem)] font-black tracking-[-0.08em] text-[color:var(--today-accent-strong)]">
        EVIDENCE_REVIEW
      </h1>

      <div className="today-panel today-panel-lowest mt-10 w-full max-w-[980px] rounded-[36px] p-2 sm:p-3">
        <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <TopicWorkspaceSwitcher
            topics={topics}
            selectedTopic={selectedTopic}
            selectedTopicId={selectedTopicId}
            isSwitching={isSwitching}
            hasLiveRun={Boolean(workflowSummary.liveRunLabel)}
            onTopicChange={onTopicChange}
          />
          <div className="flex items-center justify-center px-2 pb-2 lg:justify-end lg:pb-0">
            {renderHeroPrimaryAction({
              selectedTopic,
              workflowSummary,
              generateReportHref,
              runDetailsHref,
            })}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <StatusChip label={`${pendingCount} pending`} tone="pending" />
        <StatusChip label={`${savedCount} saved`} />
        <StatusChip label={workflowSummary.stageLabel} tone={workflowSummary.stageTone} />
        {selectedTopicLastUpdate ? <StatusChip label={`Updated ${selectedTopicLastUpdate}`} /> : null}
      </div>
    </section>
  );
}

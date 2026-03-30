'use client';

import Link from 'next/link';
import { TopicWorkspaceSwitcher } from './TopicWorkspaceSwitcher';
import type { SelectedTopicSummary, TopicWorkflowSummary } from './types';
import {
  elevatedPanelClass,
  primaryButtonClass,
  sectionLabelClass,
  secondaryButtonClass,
  StatusChip,
} from './WorkspaceHeaderPrimitives';

type Props = {
  displayDate: string;
  topics: SelectedTopicSummary[];
  selectedTopic: SelectedTopicSummary | null;
  selectedTopicId: string | null;
  pendingCount: number;
  savedCount: number;
  workflowSummary: TopicWorkflowSummary;
  isSwitching: boolean;
  runDetailsHref: string;
  onTopicChange: (topicId: string) => void;
  onTopicInfoOpen: () => void;
  onReportOpen: () => void;
};

export function EvidenceReviewHeader({
  displayDate,
  topics,
  selectedTopic,
  selectedTopicId,
  pendingCount,
  savedCount,
  workflowSummary,
  isSwitching,
  runDetailsHref,
  onTopicChange,
  onTopicInfoOpen,
  onReportOpen,
}: Props) {
  return (
    <header className="border-b border-[color:var(--workbench-line)] px-5 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-7">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-2xl">
            <p className={sectionLabelClass}>{displayDate}</p>
            <h1 className="mt-3 text-[clamp(2rem,3vw,3.1rem)] font-semibold tracking-[-0.045em] text-slate-950">
              Evidence Review
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600">
              Stay in one topic, review evidence quickly, and open deeper operational context only when needed.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={onTopicInfoOpen} className={secondaryButtonClass}>
              Topic info
            </button>
            <button
              type="button"
              onClick={onReportOpen}
              disabled={!selectedTopic?.latestReport}
              className={secondaryButtonClass}
            >
              Latest report
            </button>
            <Link href={runDetailsHref} className={primaryButtonClass}>
              Run details
            </Link>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.18fr)_minmax(320px,0.82fr)] xl:items-start">
          <TopicWorkspaceSwitcher
            topics={topics}
            selectedTopic={selectedTopic}
            selectedTopicId={selectedTopicId}
            isSwitching={isSwitching}
            onTopicChange={onTopicChange}
          />

          <div className={`${elevatedPanelClass} rounded-[28px] px-5 py-5`}>
            <p className={sectionLabelClass}>Review state</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusChip label={`${pendingCount} pending`} tone="pending" />
              <StatusChip label={`${savedCount} saved`} />
              {selectedTopic ? (
                <StatusChip
                  label={selectedTopic.isReady ? 'Ready for report' : 'Needs more evidence'}
                  tone={selectedTopic.isReady ? 'ready' : 'pending'}
                />
              ) : null}
              {workflowSummary.liveRunLabel ? <StatusChip label={workflowSummary.liveRunLabel} tone="live" /> : null}
            </div>
            <div className="mt-5 border-t border-[color:var(--workbench-line)] pt-4">
              <p className="text-lg font-semibold text-slate-950">{workflowSummary.stageLabel}</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">{workflowSummary.stageDescription}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

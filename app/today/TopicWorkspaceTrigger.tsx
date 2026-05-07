'use client';

import type { SelectedTopicSummary } from './types';
import { formatRelativeTime } from './utils';
import { sectionLabelClass, StatusChip } from './WorkspaceHeaderPrimitives';

type Props = {
  selectedTopic: SelectedTopicSummary | null;
  isSwitching: boolean;
  hasLiveRun: boolean;
  onOpen: () => void;
};

export function TopicWorkspaceTrigger({
  selectedTopic,
  isSwitching,
  hasLiveRun,
  onOpen,
}: Props) {
  const topicStatusTone = selectedTopic ? (selectedTopic.isReady ? 'ready' : 'pending') : 'default';
  const topicStatusLabel = selectedTopic
    ? selectedTopic.isReady
      ? 'Ready for report'
      : 'Reviewing evidence'
    : 'Choose a topic';
  const relativeTime = formatRelativeTime(selectedTopic?.lastRunAt);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex min-h-[88px] w-full items-center gap-4 rounded-full px-4 py-4 text-left transition-default hover:bg-[rgba(255,255,255,0.02)]"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[rgba(255,255,255,0.05)] outline outline-1 outline-[rgba(255,255,255,0.08)] transition-default group-hover:bg-[rgba(255,255,255,0.08)]">
        <svg
          className="h-5 w-5 text-[color:var(--today-muted-strong)]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.7}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      </div>

      <div className="min-w-0 flex-1">
        <p className={sectionLabelClass}>Current workspace</p>
        <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2">
          <h2 className="truncate text-base font-semibold tracking-[-0.03em] text-[color:var(--today-text)] sm:text-lg">
            {selectedTopic?.name ?? 'Choose a topic'}
          </h2>
          {!selectedTopic ? <StatusChip label="Topic required" /> : null}
        </div>
        <p className="mt-1 line-clamp-1 max-w-3xl text-sm text-[color:var(--today-muted)]">
          {selectedTopic?.goal ??
            'Select a topic to review evidence, track source proposals, and trigger the next run.'}
        </p>
      </div>

      <div className="hidden shrink-0 flex-col items-end gap-2 sm:flex">
        <div className="flex items-center gap-2">
          <StatusChip
            label={topicStatusLabel}
            tone={topicStatusTone}
            pulse={hasLiveRun && !selectedTopic?.isReady}
          />
          {hasLiveRun ? <StatusChip label="Live" tone="live" pulse /> : null}
        </div>
        <span className="text-xs font-medium uppercase tracking-[0.18em] text-[color:var(--today-muted)]">
          {isSwitching
            ? 'Switching'
            : relativeTime
              ? `Updated ${relativeTime}`
              : 'Open topic index'}
        </span>
      </div>

      <div className="sm:hidden">
        <svg
          className="h-5 w-5 text-[color:var(--today-muted)]"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M7.22 4.22a.75.75 0 0 1 1.06 0L13.31 9.25a.75.75 0 0 1 0 1.06l-5.03 5.03a.75.75 0 1 1-1.06-1.06L11.72 9.78 7.22 5.28a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    </button>
  );
}

'use client';

import type { TopicWorkspaceOption } from './types';
import { StatusChip } from './WorkspaceHeaderPrimitives';

type Props = {
  topics: TopicWorkspaceOption[];
  selectedTopicId: string | null;
  onTopicChange: (topicId: string) => void;
};

export function TopicOptionList({ topics, selectedTopicId, onTopicChange }: Props) {
  if (topics.length === 0) {
    return <TopicOptionEmptyState />;
  }

  return (
    <>
      {topics.map((topic) => (
        <TopicOptionButton
          key={topic.id}
          topic={topic}
          isCurrent={topic.id === selectedTopicId}
          onTopicChange={onTopicChange}
        />
      ))}
    </>
  );
}

function TopicOptionButton({
  topic,
  isCurrent,
  onTopicChange,
}: {
  topic: TopicWorkspaceOption;
  isCurrent: boolean;
  onTopicChange: (topicId: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onTopicChange(topic.id)}
      className={`today-panel block w-full rounded-[24px] px-4 py-4 text-left transition-default ${
        isCurrent
          ? 'today-panel-high mb-2 outline-[rgba(255,255,255,0.16)]'
          : 'today-panel-low mb-2 hover:bg-[rgba(255,255,255,0.04)]'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-semibold text-[color:var(--today-text)]">
              {topic.name}
            </span>
            {isCurrent ? <StatusChip label="Current" /> : null}
          </div>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-[color:var(--today-muted)]">
            {topic.goal}
          </p>
        </div>
        <StatusChip
          label={topic.isReady ? 'Ready' : `${topic.pendingCount} pending`}
          tone={topic.isReady ? 'ready' : 'pending'}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <StatusChip label={`${topic.savedCount} saved`} />
        {topic.focusTags.slice(0, 2).map((tag) => (
          <StatusChip key={`${topic.id}-${tag}`} label={tag} />
        ))}
      </div>
    </button>
  );
}

function TopicOptionEmptyState() {
  return (
    <div className="px-3 py-6 text-sm text-[color:var(--today-muted)]">
      No topics match that search. Use{' '}
      <span className="font-medium text-[color:var(--today-text)]">New topic</span> to add a fresh
      workspace.
    </div>
  );
}

'use client';

import { secondaryButtonClass, sectionLabelClass } from './WorkspaceHeaderPrimitives';

type Props = {
  showCreateForm: boolean;
  onShowCreateForm: () => void;
  onShowTopicList: () => void;
};

export function TopicWorkspaceDialogHeader({
  showCreateForm,
  onShowCreateForm,
  onShowTopicList,
}: Props) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className={sectionLabelClass}>
          {showCreateForm ? 'Create workspace' : 'Switch workspace'}
        </p>
        <h3 className="mt-2 text-[1.65rem] font-semibold tracking-[-0.04em] text-[color:var(--today-text)]">
          {showCreateForm ? 'Create topic' : 'Topic index'}
        </h3>
        <p className="mt-2 max-w-md text-sm leading-6 text-[color:var(--today-muted)]">
          {showCreateForm
            ? 'Define a focused brief so Research can collect, review, and synthesize evidence around one topic.'
            : 'Choose the topic you want to review right now, or open a new one when the current list no longer fits.'}
        </p>
      </div>
      {showCreateForm ? (
        <button type="button" onClick={onShowTopicList} className={secondaryButtonClass}>
          Back to topics
        </button>
      ) : (
        <button type="button" onClick={onShowCreateForm} className={secondaryButtonClass}>
          New topic
        </button>
      )}
    </div>
  );
}

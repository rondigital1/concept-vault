'use client';

import type { RefObject } from 'react';
import { TopicCreateForm } from './TopicCreateForm';
import { TopicOptionList } from './TopicOptionList';
import { TopicWorkspaceDialogHeader } from './TopicWorkspaceDialogHeader';
import type { TopicWorkspaceOption } from './types';
import { inputClass } from './WorkspaceHeaderPrimitives';

type Props = {
  query: string;
  searchRef: RefObject<HTMLInputElement | null>;
  showCreateForm: boolean;
  visibleTopics: TopicWorkspaceOption[];
  selectedTopicId: string | null;
  onClose: () => void;
  onQueryChange: (query: string) => void;
  onShowCreateForm: () => void;
  onShowTopicList: () => void;
  onTopicChange: (topicId: string) => void;
};

export function TopicWorkspaceDialog({
  query,
  searchRef,
  showCreateForm,
  visibleTopics,
  selectedTopicId,
  onClose,
  onQueryChange,
  onShowCreateForm,
  onShowTopicList,
  onTopicChange,
}: Props) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Switch workspace"
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/62 backdrop-blur-[6px]"
      />

      <div className="today-panel today-panel-high today-glass relative w-full overflow-hidden rounded-t-[30px] sm:max-w-[560px] sm:rounded-[30px]">
        <div className="px-5 py-5 sm:px-6">
          <TopicWorkspaceDialogHeader
            showCreateForm={showCreateForm}
            onShowCreateForm={onShowCreateForm}
            onShowTopicList={onShowTopicList}
          />

          {!showCreateForm ? (
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Search topics"
              className={`mt-4 ${inputClass}`}
            />
          ) : null}
        </div>

        <div className="today-scroll max-h-[72vh] overflow-y-auto px-3 pb-5 sm:max-h-[360px]">
          {showCreateForm ? (
            <TopicCreateForm onCancel={onShowTopicList} />
          ) : (
            <TopicOptionList
              topics={visibleTopics}
              selectedTopicId={selectedTopicId}
              onTopicChange={onTopicChange}
            />
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { TopicWorkspaceDialog } from './TopicWorkspaceDialog';
import { TopicWorkspaceTrigger } from './TopicWorkspaceTrigger';
import type { SelectedTopicSummary, TopicWorkspaceOption } from './types';

type Props = {
  topics: TopicWorkspaceOption[];
  selectedTopic: SelectedTopicSummary | null;
  selectedTopicId: string | null;
  isSwitching: boolean;
  hasLiveRun: boolean;
  onTopicChange: (topicId: string) => void;
};

export function TopicWorkspaceSwitcher({
  topics,
  selectedTopic,
  selectedTopicId,
  isSwitching,
  hasLiveRun,
  onTopicChange,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const deferredQuery = useDeferredValue(query);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setShowCreateForm(false);
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    const timer = window.setTimeout(() => {
      if (!showCreateForm) {
        searchRef.current?.focus();
      }
    }, 50);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleEscape);
      clearTimeout(timer);
    };
  }, [isOpen, showCreateForm]);

  useEffect(() => {
    setIsOpen(false);
  }, [selectedTopicId]);

  const normalizedQuery = deferredQuery.trim().toLowerCase();
  const visibleTopics = useMemo(
    () =>
      topics.filter((topic) => {
        if (!normalizedQuery) {
          return true;
        }

        const haystack = [topic.name, topic.goal, ...topic.focusTags].join(' ').toLowerCase();
        return haystack.includes(normalizedQuery);
      }),
    [normalizedQuery, topics],
  );

  return (
    <>
      <TopicWorkspaceTrigger
        selectedTopic={selectedTopic}
        isSwitching={isSwitching}
        hasLiveRun={hasLiveRun}
        onOpen={() => setIsOpen(true)}
      />

      {isOpen ? (
        <TopicWorkspaceDialog
          query={query}
          searchRef={searchRef}
          showCreateForm={showCreateForm}
          visibleTopics={visibleTopics}
          selectedTopicId={selectedTopicId}
          onClose={() => setIsOpen(false)}
          onQueryChange={setQuery}
          onShowCreateForm={() => setShowCreateForm(true)}
          onShowTopicList={() => setShowCreateForm(false)}
          onTopicChange={onTopicChange}
        />
      ) : null}
    </>
  );
}

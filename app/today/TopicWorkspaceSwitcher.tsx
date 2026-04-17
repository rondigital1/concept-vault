'use client';

import { useDeferredValue, useEffect, useRef, useState } from 'react';
import type { SelectedTopicSummary, TopicWorkspaceOption } from './types';
import { formatRelativeTime } from './utils';
import {
  inputClass,
  primaryButtonClass,
  sectionLabelClass,
  secondaryButtonClass,
  StatusChip,
} from './WorkspaceHeaderPrimitives';

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
    // Focus search input after the browse view opens.
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
  const visibleTopics = topics.filter((topic) => {
    if (!normalizedQuery) return true;
    const haystack = [topic.name, topic.goal, ...topic.focusTags].join(' ').toLowerCase();
    return haystack.includes(normalizedQuery);
  });

  const topicStatusTone = selectedTopic ? (selectedTopic.isReady ? 'ready' : 'pending') : 'default';
  const topicStatusLabel = selectedTopic
    ? selectedTopic.isReady
      ? 'Ready for report'
      : 'Reviewing evidence'
    : 'Choose a topic';

  const relativeTime = formatRelativeTime(selectedTopic?.lastRunAt);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="group flex min-h-[88px] w-full items-center gap-4 rounded-full px-4 py-4 text-left transition-default hover:bg-[rgba(255,255,255,0.02)]"
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[rgba(255,255,255,0.05)] outline outline-1 outline-[rgba(255,255,255,0.08)] transition-default group-hover:bg-[rgba(255,255,255,0.08)]">
          <svg className="h-5 w-5 text-[color:var(--today-muted-strong)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
            {selectedTopic?.goal ?? 'Select a topic to review evidence, track source proposals, and trigger the next run.'}
          </p>
        </div>

        <div className="hidden shrink-0 flex-col items-end gap-2 sm:flex">
          <div className="flex items-center gap-2">
            <StatusChip label={topicStatusLabel} tone={topicStatusTone} pulse={hasLiveRun && !selectedTopic?.isReady} />
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
          <svg className="h-5 w-5 text-[color:var(--today-muted)]" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M7.22 4.22a.75.75 0 0 1 1.06 0L13.31 9.25a.75.75 0 0 1 0 1.06l-5.03 5.03a.75.75 0 1 1-1.06-1.06L11.72 9.78 7.22 5.28a.75.75 0 0 1 0-1.06Z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </button>

      {isOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Switch workspace"
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
        >
          <button
            type="button"
            aria-label="Close"
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 bg-black/62 backdrop-blur-[6px]"
          />

          <div className="today-panel today-panel-high today-glass relative w-full overflow-hidden rounded-t-[30px] sm:max-w-[560px] sm:rounded-[30px]">
            <div className="px-5 py-5 sm:px-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className={sectionLabelClass}>{showCreateForm ? 'Create workspace' : 'Switch workspace'}</p>
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
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className={secondaryButtonClass}
                  >
                    Back to topics
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(true)}
                    className={secondaryButtonClass}
                  >
                    New topic
                  </button>
                )}
              </div>

              {!showCreateForm ? (
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search topics"
                  className={`mt-4 ${inputClass}`}
                />
              ) : null}
            </div>

            <div className="today-scroll max-h-[72vh] overflow-y-auto px-3 pb-5 sm:max-h-[360px]">
              {showCreateForm ? (
                <form action="/api/topics" method="POST" className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input name="name" required placeholder="Topic name" className={inputClass} />
                    <input name="focusTags" placeholder="Focus tags" className={inputClass} />
                  </div>
                  <textarea
                    name="goal"
                    required
                    rows={3}
                    placeholder="What should this topic track?"
                    className={`${inputClass} !rounded-[24px] !py-4`}
                  />
                  <div className="flex flex-wrap gap-3">
                    <button type="submit" className={primaryButtonClass}>
                      Create topic
                    </button>
                    <button type="button" onClick={() => setShowCreateForm(false)} className={secondaryButtonClass}>
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  {visibleTopics.length > 0 ? (
                    visibleTopics.map((topic) => {
                      const isCurrent = topic.id === selectedTopicId;
                      return (
                        <button
                          key={topic.id}
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
                                <span className="truncate text-sm font-semibold text-[color:var(--today-text)]">{topic.name}</span>
                                {isCurrent ? <StatusChip label="Current" /> : null}
                              </div>
                              <p className="mt-2 line-clamp-2 text-sm leading-6 text-[color:var(--today-muted)]">{topic.goal}</p>
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
                    })
                  ) : (
                    <div className="px-3 py-6 text-sm text-[color:var(--today-muted)]">
                      No topics match that search. Use <span className="font-medium text-[color:var(--today-text)]">New topic</span> to add a fresh workspace.
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

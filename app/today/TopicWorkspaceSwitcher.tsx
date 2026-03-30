'use client';

import { useDeferredValue, useEffect, useRef, useState } from 'react';
import type { SelectedTopicSummary, TopicWorkspaceOption } from './types';
import {
  elevatedPanelClass,
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
  onTopicChange: (topicId: string) => void;
};

export function TopicWorkspaceSwitcher({
  topics,
  selectedTopic,
  selectedTopicId,
  isSwitching,
  onTopicChange,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const deferredQuery = useDeferredValue(query);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  useEffect(() => {
    setIsOpen(false);
  }, [selectedTopicId]);

  const normalizedQuery = deferredQuery.trim().toLowerCase();
  const visibleTopics = topics.filter((topic) => {
    if (!normalizedQuery) {
      return true;
    }

    const haystack = [topic.name, topic.goal, ...topic.focusTags].join(' ').toLowerCase();
    return haystack.includes(normalizedQuery);
  });

  const topicStatusTone = selectedTopic ? (selectedTopic.isReady ? 'ready' : 'pending') : 'default';
  const topicStatusLabel = selectedTopic
    ? selectedTopic.isReady
      ? 'Ready for report'
      : 'Reviewing evidence'
    : 'Choose a topic';

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className={`${elevatedPanelClass} w-full rounded-[30px] px-5 py-5 text-left transition-default hover:border-[color:var(--workbench-accent-strong)]`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className={sectionLabelClass}>Current workspace</p>
            <h2 className="mt-2 truncate text-[1.35rem] font-semibold tracking-[-0.03em] text-slate-950">
              {selectedTopic?.name ?? 'Choose a topic'}
            </h2>
            <p className="mt-2 line-clamp-2 max-w-2xl text-sm leading-7 text-slate-600">
              {selectedTopic?.goal ?? 'Select a topic to review evidence in context.'}
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-2">
            <StatusChip label={topicStatusLabel} tone={topicStatusTone} />
            <span className="text-sm font-medium text-slate-600">
              {isSwitching ? 'Switching...' : isOpen ? 'Close' : 'Switch topic'}
            </span>
          </div>
        </div>
      </button>

      {isOpen ? (
        <div className="absolute left-0 right-0 top-full z-20 mt-3 overflow-hidden rounded-[30px] border border-[color:var(--workbench-line)] bg-[color:var(--workbench-panel)] shadow-[0_24px_80px_rgba(43,30,20,0.16)] lg:max-w-[520px]">
          <div className="border-b border-[color:var(--workbench-line)] px-5 py-4">
            <p className={sectionLabelClass}>Switch workspace</p>
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search topics"
              className={`mt-3 ${inputClass}`}
            />
          </div>

          <div className="max-h-[320px] overflow-y-auto px-3 py-2">
            {visibleTopics.length > 0 ? (
              visibleTopics.map((topic) => {
                const isCurrent = topic.id === selectedTopicId;
                return (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => onTopicChange(topic.id)}
                    className={`block w-full rounded-[24px] border px-3 py-3 text-left transition-default ${
                      isCurrent
                        ? 'border-[color:var(--workbench-line-strong)] bg-[rgba(255,252,248,0.84)] shadow-[0_12px_28px_rgba(43,30,20,0.08)]'
                        : 'border-transparent hover:border-[color:var(--workbench-line)] hover:bg-[rgba(255,252,248,0.62)]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-sm font-semibold text-slate-950">{topic.name}</span>
                          {isCurrent ? <StatusChip label="Current" /> : null}
                        </div>
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{topic.goal}</p>
                      </div>
                      <StatusChip
                        label={topic.isReady ? 'Ready' : `${topic.pendingCount} pending`}
                        tone={topic.isReady ? 'ready' : 'pending'}
                      />
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <StatusChip label={`${topic.savedCount} saved`} />
                      {topic.focusTags.slice(0, 2).map((tag) => (
                        <StatusChip key={`${topic.id}-${tag}`} label={tag} />
                      ))}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="px-2 py-6 text-sm text-slate-600">No topics match that search.</div>
            )}
          </div>

          <div className="border-t border-[color:var(--workbench-line)] px-5 py-4">
            {showCreateForm ? (
              <form action="/api/topics" method="POST" className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    name="name"
                    required
                    placeholder="Topic name"
                    className={inputClass}
                  />
                  <input
                    name="focusTags"
                    placeholder="Focus tags"
                    className={inputClass}
                  />
                </div>
                <textarea
                  name="goal"
                  required
                  rows={3}
                  placeholder="What should this topic track?"
                  className={inputClass}
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
              <button type="button" onClick={() => setShowCreateForm(true)} className={secondaryButtonClass}>
                Create topic
              </button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

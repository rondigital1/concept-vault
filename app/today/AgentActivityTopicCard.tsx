'use client';

import { WorkspaceIcon } from './EvidenceWorkspaceIcon';
import { LiveInsightStream } from './LiveInsightStream';
import { formatTopicTags, REPORT_THRESHOLD } from './agentActivityPresentation';
import { StatusChip } from './WorkspaceHeaderPrimitives';
import type { ActivityEntry } from './reviewViewModel';
import type { SelectedTopicSummary, TopicWorkflowSummary } from './types';

type Props = {
  selectedTopic: SelectedTopicSummary | null;
  workflowSummary: TopicWorkflowSummary;
  savedCount: number;
  activityEntries: ActivityEntry[];
};

export function AgentActivityTopicCard({
  selectedTopic,
  workflowSummary,
  savedCount,
  activityEntries,
}: Props) {
  const savedProgress = Math.min(savedCount, REPORT_THRESHOLD);
  const progressPercent = Math.min((savedCount / REPORT_THRESHOLD) * 100, 100);

  return (
    <article className="today-panel today-panel-low col-span-12 xl:col-span-8 p-6 sm:p-8">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="today-glass flex h-12 w-12 items-center justify-center rounded-full outline outline-1 outline-[rgba(255,255,255,0.08)]">
              <WorkspaceIcon
                name="search"
                className="h-5 w-5 text-[color:var(--today-accent-strong)]"
              />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[color:var(--today-accent-strong)]">
                {selectedTopic?.name ?? 'No topic selected'}
              </h3>
              <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-[color:var(--today-muted)]">
                {formatTopicTags(selectedTopic)}
              </p>
            </div>
          </div>

          <StatusChip
            label={selectedTopic?.isReady ? 'Ready for report' : 'Reviewing evidence'}
            tone={selectedTopic?.isReady ? 'ready' : workflowSummary.stageTone}
          />
        </div>

        <div className="mt-2">
          <div className="flex items-center justify-between gap-3 text-xs text-[color:var(--today-muted-strong)]">
            <span>{selectedTopic?.goal ?? 'Select a topic to see its brief.'}</span>
            <span>
              {savedProgress}/{REPORT_THRESHOLD}
            </span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[rgba(255,255,255,0.08)]">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                selectedTopic?.isReady
                  ? 'bg-[color:var(--today-accent-strong)]'
                  : 'bg-[rgba(255,255,255,0.78)]'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <LiveInsightStream entries={activityEntries} />
      </div>
    </article>
  );
}

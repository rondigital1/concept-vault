'use client';

import Link from 'next/link';
import { EvidenceDetailStack } from './EvidenceDetailStack';
import { EvidenceQueuePane } from './EvidenceQueuePane';
import { WorkspaceIcon } from './EvidenceWorkspaceIcon';
import { LiveInsightStream } from './LiveInsightStream';
import { secondaryButtonClass, StatusChip, textLinkClass } from './WorkspaceHeaderPrimitives';
import type { ActivityEntry } from './reviewViewModel';
import type { Artifact, DrawerKey, QueueFilter, SelectedTopicSummary, TopicWorkflowSummary } from './types';
import { formatShortDate } from './utils';

const REPORT_THRESHOLD = 3;

function formatTopicTags(selectedTopic: SelectedTopicSummary | null): string {
  if (!selectedTopic || selectedTopic.focusTags.length === 0) {
    return 'TOPIC WORKSPACE';
  }

  return selectedTopic.focusTags.slice(0, 3).join(' · ').toUpperCase();
}

function MetricPair({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-xl font-bold text-[color:var(--today-text)]">{value}</div>
      <div className="mt-1 text-[9px] uppercase tracking-[0.18em] text-[color:var(--today-muted)]">{label}</div>
    </div>
  );
}

export function AgentActivitySection({
  selectedTopic,
  selectedTopicId,
  workflowSummary,
  queueFilter,
  queueItems,
  pendingCount,
  savedCount,
  selectedArtifact,
  runDetailsHref,
  generateReportHref,
  recentRunCount,
  summarizeArtifact,
  activityEntries,
  onQueueFilterChange,
  onArtifactSelect,
  onDrawerOpen,
}: {
  selectedTopic: SelectedTopicSummary | null;
  selectedTopicId: string | null;
  workflowSummary: TopicWorkflowSummary;
  queueFilter: QueueFilter;
  queueItems: Artifact[];
  pendingCount: number;
  savedCount: number;
  selectedArtifact: Artifact | null;
  runDetailsHref: string;
  generateReportHref: string | null;
  recentRunCount: number;
  summarizeArtifact: (item: Artifact) => string;
  activityEntries: ActivityEntry[];
  onQueueFilterChange: (filter: QueueFilter) => void;
  onArtifactSelect: (artifactId: string) => void;
  onDrawerOpen: (drawer: DrawerKey) => void;
}) {
  const savedProgress = Math.min(savedCount, REPORT_THRESHOLD);
  const progressPercent = Math.min((savedCount / REPORT_THRESHOLD) * 100, 100);
  const activeNodeCount = activityEntries.filter((entry) => entry.status === 'running').length;

  return (
    <section>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-[-0.05em] text-[color:var(--today-accent-strong)]">
            AGENT_ACTIVITY
          </h2>
          <p className="mt-2 text-sm text-[color:var(--today-muted)]">
            Real-time review state, agent traces, and report readiness for the selected topic.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 self-start rounded-full bg-[rgba(255,255,255,0.06)] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--today-text-soft)] outline outline-1 outline-[rgba(255,255,255,0.08)]">
          <span className="h-2 w-2 rounded-full bg-[color:var(--today-accent-strong)] animate-pulse" />
          {activeNodeCount} active node{activeNodeCount === 1 ? '' : 's'}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <article className="today-panel today-panel-low col-span-12 xl:col-span-8 p-6 sm:p-8">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="today-glass flex h-12 w-12 items-center justify-center rounded-full outline outline-1 outline-[rgba(255,255,255,0.08)]">
                  <WorkspaceIcon name="search" className="h-5 w-5 text-[color:var(--today-accent-strong)]" />
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
                    selectedTopic?.isReady ? 'bg-[color:var(--today-accent-strong)]' : 'bg-[rgba(255,255,255,0.78)]'
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <LiveInsightStream entries={activityEntries} />
          </div>
        </article>

        <article className="today-panel today-panel-glow col-span-12 md:col-span-4 xl:col-span-4 px-6 py-8 text-center">
          <div className="relative mx-auto flex h-32 w-32 items-center justify-center rounded-full bg-[color:var(--today-accent-strong)] text-[color:var(--today-accent-ink)] shadow-[0_0_32px_rgba(255,255,255,0.12)]">
            <div className="absolute inset-0 rounded-full border-[10px] border-white/18 animate-ping" />
            <WorkspaceIcon name="sparkles" className="h-8 w-8" />
          </div>
          <h3 className="mt-8 text-[1.65rem] font-semibold tracking-[-0.04em] text-[color:var(--today-accent-strong)]">
            {workflowSummary.stageLabel.replace(/\s+/g, '_').toUpperCase()}
          </h3>
          <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-[color:var(--today-muted)]">
            {workflowSummary.stageDescription}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <button type="button" onClick={() => onDrawerOpen('topic')} className={secondaryButtonClass}>
              Topic
            </button>
            {selectedTopic?.latestReport ? (
              <button type="button" onClick={() => onDrawerOpen('report')} className={secondaryButtonClass}>
                Report
              </button>
            ) : null}
            <Link href={runDetailsHref} className={secondaryButtonClass}>
              Runs
            </Link>
          </div>
        </article>

        <article className="today-panel today-panel-high col-span-12 md:col-span-4 xl:col-span-4 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="today-glass flex h-10 w-10 items-center justify-center rounded-full outline outline-1 outline-[rgba(255,255,255,0.08)]">
              <WorkspaceIcon name="report" className="h-[18px] w-[18px] text-[color:var(--today-accent-strong)]" />
            </div>
            <StatusChip label={selectedTopic?.latestReport ? formatShortDate(selectedTopic.latestReport.createdAt) : 'No report'} />
          </div>

          <div className="mt-8">
            <h3 className="text-2xl font-semibold tracking-[-0.04em] text-[color:var(--today-accent-strong)]">
              {selectedTopic?.latestReport?.title ?? 'Report buffer'}
            </h3>
            <p className="mt-3 text-sm leading-6 text-[color:var(--today-muted)]">
              {selectedTopic?.latestReport?.preview ??
                (selectedTopic?.isReady
                  ? 'Enough evidence is saved. Generate the next report to synthesize the current queue.'
                  : 'Keep reviewing evidence until this topic crosses the report threshold.')}
            </p>
          </div>

          <div className="mt-8 flex items-end gap-6">
            <MetricPair value={String(savedCount)} label="saved sources" />
            <MetricPair value={String(selectedTopic?.linkedDocumentCount ?? 0)} label="linked docs" />
            <MetricPair value={String(recentRunCount)} label="recent runs" />
          </div>

          <div className="mt-8">
            {selectedTopic?.latestReport ? (
              <Link href={selectedTopic.latestReport.link} className={textLinkClass}>
                Open current report
              </Link>
            ) : generateReportHref ? (
              <Link href={generateReportHref} className={textLinkClass}>
                Generate report
              </Link>
            ) : (
              <span className="text-sm text-[color:var(--today-muted)]">Report output unlocks after more evidence is approved.</span>
            )}
          </div>
        </article>

        <article id="today-queue" className="today-panel today-panel-low col-span-12 md:col-span-8 xl:col-span-8">
          <div className="min-h-[480px] min-[980px]:grid min-[980px]:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
            <div className="min-[980px]:min-h-0">
              <EvidenceQueuePane
                queueFilter={queueFilter}
                pendingCount={pendingCount}
                savedCount={savedCount}
                queueItems={queueItems}
                selectedArtifactId={selectedArtifact?.id ?? null}
                primaryAction={workflowSummary.primaryAction}
                topicId={selectedTopicId}
                topicName={selectedTopic?.name ?? null}
                lastCheckedAt={selectedTopic?.lastRunAt ?? null}
                onQueueFilterChange={onQueueFilterChange}
                onArtifactSelect={onArtifactSelect}
                summarizeArtifact={summarizeArtifact}
              />
            </div>

            <div className="hidden min-[980px]:flex min-[980px]:min-h-0 min-[980px]:flex-col">
              <EvidenceDetailStack
                queueFilter={queueFilter}
                selectedArtifact={selectedArtifact}
                summarizeArtifact={summarizeArtifact}
              />
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

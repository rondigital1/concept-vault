'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { PRIMARY_TOP_NAV_KEYS, getTopNavItemsWithState } from '@/app/components/topNav';
import { EvidenceDecisionBar } from './EvidenceDecisionBar';
import { EvidenceDetailPane } from './EvidenceDetailPane';
import { EvidenceQueuePane } from './EvidenceQueuePane';
import { ReportMetadataDrawer } from './ReportMetadataDrawer';
import { TopicMetadataDrawer } from './TopicMetadataDrawer';
import { TopicWorkspaceSwitcher } from './TopicWorkspaceSwitcher';
import type { ActivityEntry } from './reviewViewModel';
import type { Artifact, DrawerKey, SelectedTopicSummary, TopicWorkflowSummary } from './types';
import { FindSourcesButton } from './FindSourcesButton';
import { formatRelativeTime, formatShortDate } from './utils';
import {
  elevatedPanelClass,
  inputClass,
  primaryButtonClass,
  sectionLabelClass,
  secondaryButtonClass,
  StatusChip,
  textLinkClass,
} from './WorkspaceHeaderPrimitives';

const REPORT_THRESHOLD = 3;

type QueueFilter = 'pending' | 'saved';

type Props = {
  displayDate: string;
  topics: SelectedTopicSummary[];
  selectedTopic: SelectedTopicSummary | null;
  selectedTopicId: string | null;
  workflowSummary: TopicWorkflowSummary;
  queueFilter: QueueFilter;
  queueItems: Artifact[];
  pendingCount: number;
  savedCount: number;
  selectedArtifact: Artifact | null;
  isSwitching: boolean;
  activeDrawer: DrawerKey | null;
  onTopicChange: (topicId: string) => void;
  onQueueFilterChange: (filter: QueueFilter) => void;
  onArtifactSelect: (artifactId: string) => void;
  onDrawerOpen: (drawer: DrawerKey) => void;
  onDrawerClose: () => void;
  runDetailsHref: string;
  refreshTopicHref: string;
  generateReportHref: string | null;
  extractConceptsHref: string;
  recentRunCount: number;
  summarizeArtifact: (item: Artifact) => string;
  activityEntries: ActivityEntry[];
};

type IconName = 'sparkles' | 'search' | 'report' | 'runs' | 'settings' | 'bell' | 'plus' | 'library';

function Icon({ name, className = 'h-5 w-5' }: { name: IconName; className?: string }) {
  if (name === 'sparkles') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
        <path d="M12.8 3.5a.75.75 0 0 1 .73.58l.74 3.3a2.5 2.5 0 0 0 1.88 1.88l3.3.74a.75.75 0 0 1 0 1.46l-3.3.74a2.5 2.5 0 0 0-1.88 1.88l-.74 3.3a.75.75 0 0 1-1.46 0l-.74-3.3a2.5 2.5 0 0 0-1.88-1.88l-3.3-.74a.75.75 0 0 1 0-1.46l3.3-.74a2.5 2.5 0 0 0 1.88-1.88l.74-3.3a.75.75 0 0 1 .73-.58Z" />
      </svg>
    );
  }

  if (name === 'search') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
    );
  }

  if (name === 'report') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M7 3.75h7l4 4V20.25a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.75a1 1 0 0 1 1-1Z" />
        <path d="M14 3.75v4h4" />
        <path d="M9 12h6" />
        <path d="M9 16h4" />
      </svg>
    );
  }

  if (name === 'runs') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 12h5" />
        <path d="M14 6h5" />
        <path d="M14 18h5" />
        <path d="m8 9 3 3-3 3" />
      </svg>
    );
  }

  if (name === 'settings') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="3.2" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V22a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.04-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.04H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.65 8.9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9.01 4a1.7 1.7 0 0 0 1.04-1.56V2.35a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15.09 4a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 8.9a1.7 1.7 0 0 0 1.56 1.04H21a2 2 0 1 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15Z" />
      </svg>
    );
  }

  if (name === 'bell') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M15 18H6.5a1.5 1.5 0 0 1-1.32-2.22L6 14.25V10a6 6 0 1 1 12 0v4.25l.82 1.53A1.5 1.5 0 0 1 17.5 18H15Z" />
        <path d="M9.75 20a2.25 2.25 0 0 0 4.5 0" />
      </svg>
    );
  }

  if (name === 'plus') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 4h14v16H5z" />
      <path d="M9 8h6" />
      <path d="M9 12h6" />
      <path d="M9 16h4" />
    </svg>
  );
}

function ChromeIconLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: IconName;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(255,255,255,0.04)] text-[color:var(--today-text)] outline outline-1 outline-[rgba(255,255,255,0.08)] transition-default hover:bg-[rgba(255,255,255,0.09)]"
    >
      <Icon name={icon} className="h-[18px] w-[18px]" />
    </Link>
  );
}

function SurfaceNavButton({
  label,
  active = false,
  href,
  onClick,
}: {
  label: string;
  active?: boolean;
  href?: string;
  onClick?: () => void;
}) {
  const className = `flex items-center gap-3 rounded-full px-4 py-3 text-[10px] font-bold uppercase tracking-[0.16em] transition-default ${
    active
      ? 'bg-[color:var(--today-accent)] text-[color:var(--today-accent-ink)]'
      : 'text-[color:var(--today-muted)] hover:bg-[rgba(255,255,255,0.07)] hover:text-[color:var(--today-text)]'
  }`;

  if (href) {
    return (
      <Link href={href} className={className}>
        {label}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {label}
    </button>
  );
}

function formatTopicTags(selectedTopic: SelectedTopicSummary | null): string {
  if (!selectedTopic || selectedTopic.focusTags.length === 0) {
    return 'TOPIC WORKSPACE';
  }

  return selectedTopic.focusTags.slice(0, 3).join(' · ').toUpperCase();
}

function renderHeroPrimaryAction({
  selectedTopic,
  workflowSummary,
  generateReportHref,
  runDetailsHref,
}: {
  selectedTopic: SelectedTopicSummary | null;
  workflowSummary: TopicWorkflowSummary;
  generateReportHref: string | null;
  runDetailsHref: string;
}) {
  if (selectedTopic && workflowSummary.primaryAction === 'find_sources') {
    return (
      <FindSourcesButton
        scope="topic"
        topicId={selectedTopic.id}
        topicName={selectedTopic.name}
        label="Run Search"
      />
    );
  }

  if (selectedTopic && generateReportHref) {
    return (
      <Link href={generateReportHref} className={primaryButtonClass}>
        Generate Report
      </Link>
    );
  }

  return (
    <Link href={runDetailsHref} className={primaryButtonClass}>
      Open Runs
    </Link>
  );
}

function LiveInsightStream({ entries }: { entries: ActivityEntry[] }) {
  const previewEntries = entries.slice(0, 3);

  return (
    <div className="today-panel today-panel-lowest rounded-[24px] p-4">
      <div className="text-[9px] uppercase tracking-[0.18em] text-[color:var(--today-muted)]">
        Live insight stream
      </div>
      <div className="mt-3 space-y-2 font-mono text-[11px] leading-6 text-[color:var(--today-muted-strong)]">
        {previewEntries.length > 0 ? (
          previewEntries.map((entry) => (
            <p key={entry.id} className="truncate">
              {entry.status === 'running' ? '>' : '·'} {entry.summary}
            </p>
          ))
        ) : (
          <>
            <p>&gt; waiting for the next agent run...</p>
            <p>&gt; source evaluation logs will appear here...</p>
            <p>&gt; review decisions stay human-gated...</p>
          </>
        )}
      </div>
    </div>
  );
}

function MetricPair({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-xl font-bold text-[color:var(--today-text)]">{value}</div>
      <div className="mt-1 text-[9px] uppercase tracking-[0.18em] text-[color:var(--today-muted)]">{label}</div>
    </div>
  );
}

function WorkspaceChrome({
  displayDate,
  selectedTopic,
  onTopicInfoOpen,
  onReportOpen,
  runDetailsHref,
  children,
}: {
  displayDate: string;
  selectedTopic: SelectedTopicSummary | null;
  onTopicInfoOpen: () => void;
  onReportOpen: () => void;
  runDetailsHref: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const navItems = getTopNavItemsWithState(pathname, PRIMARY_TOP_NAV_KEYS);

  return (
    <div className="today-screen min-h-screen text-[color:var(--today-text)]">
      <header className="today-glass fixed inset-x-0 top-0 z-40">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="text-xl font-black tracking-[-0.06em] text-[color:var(--today-accent-strong)]">
            CONCEPT_VAULT
          </div>

          <nav className="hidden items-center gap-8 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`pb-1 text-sm font-semibold tracking-[-0.02em] transition-default ${
                  item.active
                    ? 'border-b-2 border-[color:var(--today-accent-strong)] text-[color:var(--today-accent-strong)]'
                    : 'text-[color:var(--today-muted)] hover:text-[color:var(--today-accent-strong)]'
                }`}
                aria-current={item.active ? 'page' : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <ChromeIconLink href="/reports" label="Reports" icon="report" />
            <ChromeIconLink href="/chat" label="Ask Vault" icon="bell" />
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(255,255,255,0.06)] text-sm font-semibold text-[color:var(--today-text)] outline outline-1 outline-[rgba(255,255,255,0.08)]">
              CV
            </div>
          </div>
        </div>
      </header>

      <aside className="today-glass fixed left-0 top-16 hidden h-[calc(100vh-4rem)] w-64 flex-col px-4 py-6 lg:flex">
        <div className="mb-10">
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-[color:var(--today-accent-strong)] animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--today-text-soft)]">
              RESEARCH_CORE
            </span>
          </div>
          <div className="pl-5 text-[10px] uppercase tracking-[0.16em] text-[color:var(--today-muted)]">
            {displayDate}
          </div>
        </div>

        <nav className="space-y-1">
          <SurfaceNavButton href="#today-hero" label="Overview" active />
          <SurfaceNavButton onClick={onTopicInfoOpen} label="Topic Context" />
          <SurfaceNavButton href="#today-queue" label="Review Queue" />
          <SurfaceNavButton href={runDetailsHref} label="Agent Runs" />
          <SurfaceNavButton onClick={onReportOpen} label="Latest Report" />
        </nav>

        <div className="mt-auto space-y-4 pt-6">
          <Link href="/ingest" className={`${primaryButtonClass} w-full`}>
            Add Content
          </Link>
          <div className="space-y-1">
            <SurfaceNavButton href="/reports" label="Reports Archive" />
            <SurfaceNavButton href="/library" label="Vault Library" />
          </div>
          <div className="today-panel today-panel-lowest rounded-[24px] p-4">
            <p className={sectionLabelClass}>Current topic</p>
            <p className="mt-3 text-sm font-semibold text-[color:var(--today-text)]">
              {selectedTopic?.name ?? 'No topic selected'}
            </p>
            <p className="mt-2 text-sm leading-6 text-[color:var(--today-muted)]">
              {selectedTopic?.isReady ? 'Enough evidence saved for the next report.' : 'Human review remains the gate before any report is generated.'}
            </p>
          </div>
        </div>
      </aside>

      <div className="relative z-10 pt-16 lg:pl-64">{children}</div>

      <Link
        href="/ingest"
        aria-label="Add content"
        className="today-button-primary fixed bottom-8 right-8 z-40 h-14 w-14 p-0"
      >
        <Icon name="plus" className="h-6 w-6" />
      </Link>
    </div>
  );
}

export function EvidenceReviewWorkspace({
  displayDate,
  topics,
  selectedTopic,
  selectedTopicId,
  workflowSummary,
  queueFilter,
  queueItems,
  pendingCount,
  savedCount,
  selectedArtifact,
  isSwitching,
  activeDrawer,
  onTopicChange,
  onQueueFilterChange,
  onArtifactSelect,
  onDrawerOpen,
  onDrawerClose,
  runDetailsHref,
  refreshTopicHref,
  generateReportHref,
  extractConceptsHref,
  recentRunCount,
  summarizeArtifact,
  activityEntries,
}: Props) {
  const savedProgress = Math.min(savedCount, REPORT_THRESHOLD);
  const progressPercent = Math.min((savedCount / REPORT_THRESHOLD) * 100, 100);
  const activeNodeCount = activityEntries.filter((entry) => entry.status === 'running').length;
  const selectedTopicLastUpdate = formatRelativeTime(selectedTopic?.lastRunAt);

  useEffect(() => {
    if (activeDrawer !== 'evidence') {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onDrawerClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [activeDrawer, onDrawerClose]);

  if (topics.length === 0) {
    return (
      <WorkspaceChrome
        displayDate={displayDate}
        selectedTopic={selectedTopic}
        onTopicInfoOpen={() => onDrawerOpen('topic')}
        onReportOpen={() => onDrawerOpen('report')}
        runDetailsHref={runDetailsHref}
      >
        <main className="min-h-screen pb-12">
          <div className="mx-auto max-w-[1480px] px-4 py-10 sm:px-6 lg:px-10">
            <section id="today-hero" className="flex flex-col items-center pt-8 text-center lg:pt-14">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[color:var(--today-muted-strong)]">
                CONCEPT VAULT RESEARCH CORE
              </p>
              <h1 className="mt-6 text-[clamp(2.75rem,6vw,5.75rem)] font-black tracking-[-0.08em] text-[color:var(--today-accent-strong)]">
                EVIDENCE_REVIEW
              </h1>
              <div className={`${elevatedPanelClass} mt-10 w-full max-w-[860px] rounded-[32px] px-6 py-7 sm:px-8`}>
                <p className={sectionLabelClass}>Initialize workspace</p>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-[color:var(--today-muted)]">
                  Create the first topic to start collecting proposals, reviewing evidence, and generating reports inside this surface.
                </p>
                <form action="/api/topics" method="POST" className="mt-8 grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="name" className="text-sm font-medium text-[color:var(--today-text)]">
                      Topic name
                    </label>
                    <input id="name" name="name" required className={inputClass} placeholder="Multi-agent AI research" />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="focusTags" className="text-sm font-medium text-[color:var(--today-text)]">
                      Focus tags
                    </label>
                    <input id="focusTags" name="focusTags" className={inputClass} placeholder="agents, evaluation, orchestration" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label htmlFor="goal" className="text-sm font-medium text-[color:var(--today-text)]">
                      Research brief
                    </label>
                    <textarea
                      id="goal"
                      name="goal"
                      required
                      rows={5}
                      className={`${inputClass} !rounded-[28px] !py-4`}
                      placeholder="Track evidence, trace sources, and synthesize trustworthy findings."
                    />
                  </div>
                  <div className="md:col-span-2">
                    <button type="submit" className={primaryButtonClass}>
                      Create first topic
                    </button>
                  </div>
                </form>
              </div>
            </section>
          </div>
        </main>
      </WorkspaceChrome>
    );
  }

  return (
    <>
      <WorkspaceChrome
        displayDate={displayDate}
        selectedTopic={selectedTopic}
        onTopicInfoOpen={() => onDrawerOpen('topic')}
        onReportOpen={() => onDrawerOpen('report')}
        runDetailsHref={runDetailsHref}
      >
        <main className="min-h-screen pb-12">
          <div className="mx-auto max-w-[1480px] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
            <section id="today-hero" className="mb-14 flex flex-col items-center pt-8 text-center lg:pt-12">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[color:var(--today-muted-strong)]">
                CONCEPT VAULT RESEARCH CORE
              </p>
              <h1 className="mt-6 text-[clamp(2.9rem,6vw,6rem)] font-black tracking-[-0.08em] text-[color:var(--today-accent-strong)]">
                EVIDENCE_REVIEW
              </h1>

              <div className="today-panel today-panel-lowest mt-10 w-full max-w-[980px] rounded-[36px] p-2 sm:p-3">
                <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                  <TopicWorkspaceSwitcher
                    topics={topics}
                    selectedTopic={selectedTopic}
                    selectedTopicId={selectedTopicId}
                    isSwitching={isSwitching}
                    hasLiveRun={Boolean(workflowSummary.liveRunLabel)}
                    onTopicChange={onTopicChange}
                  />
                  <div className="flex items-center justify-center px-2 pb-2 lg:justify-end lg:pb-0">
                    {renderHeroPrimaryAction({
                      selectedTopic,
                      workflowSummary,
                      generateReportHref,
                      runDetailsHref,
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <StatusChip label={`${pendingCount} pending`} tone="pending" />
                <StatusChip label={`${savedCount} saved`} />
                <StatusChip label={workflowSummary.stageLabel} tone={workflowSummary.stageTone} />
                {selectedTopicLastUpdate ? <StatusChip label={`Updated ${selectedTopicLastUpdate}`} /> : null}
              </div>
            </section>

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
                          <Icon name="search" className="h-5 w-5 text-[color:var(--today-accent-strong)]" />
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
                    <Icon name="sparkles" className="h-8 w-8" />
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
                      <Icon name="report" className="h-[18px] w-[18px] text-[color:var(--today-accent-strong)]" />
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
                      <EvidenceDetailPane
                        queueFilter={queueFilter}
                        selectedArtifact={selectedArtifact}
                        summarizeArtifact={summarizeArtifact}
                      />
                      <EvidenceDecisionBar selectedArtifact={selectedArtifact} />
                    </div>

                    <div className="min-[980px]:hidden">
                      <EvidenceDetailPane
                        queueFilter={queueFilter}
                        selectedArtifact={selectedArtifact}
                        summarizeArtifact={summarizeArtifact}
                      />
                      <EvidenceDecisionBar selectedArtifact={selectedArtifact} />
                    </div>
                  </div>
                </article>
              </div>
            </section>
          </div>
        </main>
      </WorkspaceChrome>

      {activeDrawer === 'evidence' && selectedArtifact ? (
        <div className="fixed inset-0 z-40 min-[980px]:hidden">
          <button
            type="button"
            aria-label="Close evidence detail"
            onClick={onDrawerClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-[6px]"
          />
          <aside className="today-panel today-panel-high today-glass absolute inset-x-0 bottom-0 top-[10vh] z-10 flex flex-col rounded-t-[28px]">
            <div className="absolute right-4 top-4 z-10">
              <button
                type="button"
                onClick={onDrawerClose}
                className={`${secondaryButtonClass} h-10 w-10 px-0`}
                aria-label="Close evidence detail"
              >
                ×
              </button>
            </div>
            <div className="flex h-full min-h-0 flex-col">
              <EvidenceDetailPane
                queueFilter={queueFilter}
                selectedArtifact={selectedArtifact}
                summarizeArtifact={summarizeArtifact}
              />
              <EvidenceDecisionBar selectedArtifact={selectedArtifact} />
            </div>
          </aside>
        </div>
      ) : null}

      <TopicMetadataDrawer
        isOpen={activeDrawer === 'topic'}
        onClose={onDrawerClose}
        selectedTopic={selectedTopic}
        workflowSummary={workflowSummary}
        runDetailsHref={runDetailsHref}
        refreshTopicHref={refreshTopicHref}
        generateReportHref={generateReportHref}
        extractConceptsHref={extractConceptsHref}
      />
      <ReportMetadataDrawer
        isOpen={activeDrawer === 'report'}
        onClose={onDrawerClose}
        latestReport={selectedTopic?.latestReport ?? null}
        topicName={selectedTopic?.name ?? null}
      />
    </>
  );
}

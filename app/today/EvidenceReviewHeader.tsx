'use client';

import Link from 'next/link';
import type { DrawerKey, SelectedTopicSummary } from './types';

type Props = {
  selectedTopic: SelectedTopicSummary | null;
  activeDrawer: DrawerKey | null;
  runDetailsHref: string;
  recentRunCount: number;
  onTopicInfoOpen: () => void;
  onReportOpen: () => void;
};

function formatReportDay(day: string): string {
  const [, m, d] = day.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[Number(m) - 1]} ${Number(d)}`;
}

function TabBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs font-medium ${
        active
          ? 'bg-[rgba(255,255,255,0.14)] text-[color:var(--today-accent-strong)]'
          : 'bg-[rgba(255,255,255,0.08)] text-[color:var(--today-muted-strong)]'
      }`}
    >
      {label}
    </span>
  );
}

export function EvidenceReviewHeader({
  selectedTopic,
  activeDrawer,
  runDetailsHref,
  recentRunCount,
  onTopicInfoOpen,
  onReportOpen,
}: Props) {
  const activeTabClass =
    'inline-flex items-center rounded-[18px] bg-[color:var(--today-accent-strong)] px-4 py-2.5 text-sm font-semibold text-[color:var(--today-accent-ink)] transition-colors shadow-[0_12px_24px_rgba(0,0,0,0.22)]';
  const inactiveTabClass =
    'inline-flex items-center rounded-[18px] px-4 py-2.5 text-sm font-semibold text-[color:var(--today-muted-strong)] transition-colors hover:bg-[rgba(255,255,255,0.08)] hover:text-[color:var(--today-text)]';

  const reportBadge = selectedTopic?.latestReport
    ? formatReportDay(selectedTopic.latestReport.day)
    : 'None';

  return (
    <header className="border-b border-[rgba(255,255,255,0.08)] px-5 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 min-[900px]:flex-row min-[900px]:items-start min-[900px]:justify-between">
        <div className="max-w-2xl">
          <h1 className="text-[clamp(2rem,3vw,3.1rem)] font-semibold tracking-[-0.045em] text-[color:var(--today-text)]">
            Evidence Review
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-7 text-[color:var(--today-muted)]">
            Stay in one topic, review evidence quickly, and open deeper context only when needed.
          </p>
        </div>

        <div className="flex items-center gap-0.5 self-start rounded-[22px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] p-1">
          <button
            type="button"
            onClick={onTopicInfoOpen}
            title="Workspace topic, description, and settings"
            className={activeDrawer === 'topic' ? activeTabClass : inactiveTabClass}
          >
            Topic
          </button>

          <button
            type="button"
            onClick={onReportOpen}
            disabled={!selectedTopic?.latestReport}
            className={activeDrawer === 'report' ? activeTabClass : inactiveTabClass}
          >
            Report
            <TabBadge label={reportBadge} active={activeDrawer === 'report'} />
          </button>

          <Link href={runDetailsHref} className={inactiveTabClass}>
            Agent Runs
            <TabBadge label={String(recentRunCount)} active={false} />
          </Link>
        </div>
      </div>
    </header>
  );
}

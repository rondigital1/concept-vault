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
        active ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-600'
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
    'inline-flex items-center rounded-[18px] bg-[color:var(--workbench-accent-ink)] px-4 py-2.5 text-sm font-semibold text-white transition-colors [box-shadow:0_1px_4px_rgba(23,60,73,0.22),inset_0_-2px_0_rgba(0,0,0,0.12)]';
  const inactiveTabClass =
    'inline-flex items-center rounded-[18px] px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-white/60 hover:text-slate-900';

  const reportBadge = selectedTopic?.latestReport
    ? formatReportDay(selectedTopic.latestReport.day)
    : 'None';

  return (
    <header className="border-b border-[color:var(--workbench-line)] px-5 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 min-[900px]:flex-row min-[900px]:items-start min-[900px]:justify-between">
        <div className="max-w-2xl">
          <h1 className="text-[clamp(2rem,3vw,3.1rem)] font-semibold tracking-[-0.045em] text-slate-950">
            Evidence Review
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600">
            Stay in one topic, review evidence quickly, and open deeper context only when needed.
          </p>
        </div>

        <div className="flex items-center gap-0.5 self-start rounded-[22px] border border-[color:var(--workbench-line)] bg-[rgba(248,246,243,0.6)] p-1">
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

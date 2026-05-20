'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PRIMARY_TOP_NAV_KEYS, getTopNavItemsWithState } from '@/app/components/topNav';
import { primaryButtonClass, sectionLabelClass } from './WorkspaceHeaderPrimitives';
import { WorkspaceIcon, type WorkspaceIconName } from './EvidenceWorkspaceIcon';
import type { SelectedTopicSummary } from './types';

function ChromeIconLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: WorkspaceIconName;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(255,255,255,0.04)] text-[color:var(--today-text)] outline outline-1 outline-[rgba(255,255,255,0.08)] transition-default hover:bg-[rgba(255,255,255,0.09)]"
    >
      <WorkspaceIcon name={icon} className="h-[18px] w-[18px]" />
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

export function EvidenceWorkspaceChrome({
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
  children: ReactNode;
}) {
  const pathname = usePathname();
  const navItems = getTopNavItemsWithState(pathname, PRIMARY_TOP_NAV_KEYS);

  return (
    <div className="today-screen min-h-screen text-[color:var(--today-text)]">
      <header className="today-glass fixed inset-x-0 top-0 z-40">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="text-xl font-black tracking-normal text-[color:var(--today-accent-strong)]">
            Concept Vault
          </div>

          <nav className="hidden items-center gap-8 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`pb-1 text-sm font-semibold tracking-normal transition-default ${
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

      <nav
        aria-label="Mobile workspace navigation"
        className="today-glass fixed inset-x-0 top-16 z-30 px-3 py-3 lg:hidden"
      >
        <div className="flex flex-wrap gap-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`inline-flex min-h-8 items-center rounded-full px-3 py-2 text-[9px] font-bold uppercase tracking-[0.12em] transition-default sm:text-[10px] sm:tracking-[0.16em] ${
                item.active
                  ? 'bg-[color:var(--today-accent)] text-[color:var(--today-accent-ink)]'
                  : 'bg-[rgba(255,255,255,0.05)] text-[color:var(--today-muted)]'
              }`}
              aria-current={item.active ? 'page' : undefined}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      <aside className="today-glass fixed left-0 top-16 hidden h-[calc(100vh-4rem)] w-64 flex-col px-4 py-6 lg:flex">
        <div className="mb-10">
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-[color:var(--today-accent-strong)] animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--today-text-soft)]">
              Research core
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

      <div className="relative z-10 pt-32 lg:pl-64 lg:pt-16">{children}</div>

      <Link
        href="/ingest"
        aria-label="Add content"
        className="today-button-primary fixed bottom-8 right-8 z-40 h-14 w-14 p-0"
      >
        <WorkspaceIcon name="plus" className="h-6 w-6" />
      </Link>
    </div>
  );
}

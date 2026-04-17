'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { StatusBadge } from '@/app/components/StatusBadge';
import { APP_BRAND, getTopNavGroupsWithState } from '@/app/components/topNav';
import { formatTopicScopeLabel } from './presentation';
import {
  workspaceEyebrowClassName,
  workspaceLabelClassName,
  workspaceMutedCopyClassName,
  workspacePillClassName,
  workspacePrimaryButtonClassName,
  workspacePrimaryNavClassName,
  workspaceSectionLinkClassName,
  workspaceShellPanelClassName,
  workspaceUtilityNavClassName,
} from './workspaceTheme';

type Props = {
  activeAgentCount: number;
  selectedTopicName: string | null;
  topicCount: number;
  recentRunCount: number;
  children: ReactNode;
};

const WORKSPACE_SECTIONS = [
  { href: '#agents-overview', label: 'Overview', icon: 'overview' },
  { href: '#agents-registry', label: 'Registry', icon: 'registry' },
  { href: '#agents-controls', label: 'Run Controls', icon: 'controls' },
  { href: '#agents-runs', label: 'Recent Runs', icon: 'runs' },
] as const;

function Icon({
  name,
  className = 'h-4 w-4',
}: {
  name: 'overview' | 'registry' | 'controls' | 'runs';
  className?: string;
}) {
  if (name === 'overview') {
    return (
      <svg
        viewBox="0 0 24 24"
        className={className}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.7}
        aria-hidden="true"
      >
        <path d="M4 6.5A1.5 1.5 0 0 1 5.5 5H18.5A1.5 1.5 0 0 1 20 6.5v11A1.5 1.5 0 0 1 18.5 19H5.5A1.5 1.5 0 0 1 4 17.5z" />
        <path d="M8 10.5h8" />
        <path d="M8 14.5h5" />
      </svg>
    );
  }

  if (name === 'registry') {
    return (
      <svg
        viewBox="0 0 24 24"
        className={className}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.7}
        aria-hidden="true"
      >
        <path d="M6 6h12" />
        <path d="M6 12h12" />
        <path d="M6 18h12" />
        <path d="M4 6h.01" />
        <path d="M4 12h.01" />
        <path d="M4 18h.01" />
      </svg>
    );
  }

  if (name === 'controls') {
    return (
      <svg
        viewBox="0 0 24 24"
        className={className}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.7}
        aria-hidden="true"
      >
        <path d="M6 7h12" />
        <path d="M6 12h12" />
        <path d="M6 17h12" />
        <circle cx="9" cy="7" r="2" fill="currentColor" stroke="none" />
        <circle cx="15" cy="12" r="2" fill="currentColor" stroke="none" />
        <circle cx="11" cy="17" r="2" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      aria-hidden="true"
    >
      <path d="M7 6h10" />
      <path d="M7 12h10" />
      <path d="M7 18h10" />
      <path d="M5 6h.01" />
      <path d="M5 12h.01" />
      <path d="M5 18h.01" />
    </svg>
  );
}

export function AgentsChrome({
  activeAgentCount,
  selectedTopicName,
  topicCount,
  recentRunCount,
  children,
}: Props) {
  const pathname = usePathname();
  const { primary, utility } = getTopNavGroupsWithState(pathname);
  const selectedTopicLabel = formatTopicScopeLabel(selectedTopicName);

  return (
    <div className="relative min-h-screen text-[color:var(--shell-immersive-text)]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-px bg-white/[0.08]" />
        <div className="absolute left-[8%] top-0 h-64 w-64 rounded-full bg-[rgba(132,174,186,0.08)] blur-[120px]" />
        <div className="absolute right-[6%] top-[14rem] h-72 w-72 rounded-full bg-white/[0.04] blur-[140px]" />
      </div>

      <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[rgba(11,13,15,0.84)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8 xl:flex-row xl:items-center xl:justify-between">
          <Link href="/today" className="flex items-center gap-4 transition-opacity hover:opacity-85">
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.05] text-sm font-semibold text-[color:var(--shell-immersive-text)] shadow-[0_14px_32px_rgba(0,0,0,0.24)]">
              {APP_BRAND.monogram}
            </div>
            <div className="leading-tight">
              <span className="font-editorial block text-xl tracking-[-0.04em] text-white">
                {APP_BRAND.name}
              </span>
              <span className="block text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--surface-text-muted)]">
                Agents Workspace
              </span>
            </div>
          </Link>

          <div className="flex flex-col gap-3 xl:items-end">
            <div
              aria-label="Primary destinations"
              role="group"
              className="flex flex-wrap items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
            >
              {primary.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={item.active ? 'page' : undefined}
                  className={workspacePrimaryNavClassName(item.active)}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {utility.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={item.active ? 'page' : undefined}
                  className={workspaceUtilityNavClassName(item.active)}
                >
                  {item.label}
                </Link>
              ))}
              <StatusBadge
                status={activeAgentCount > 0 ? 'running' : 'pending'}
                label={`${activeAgentCount} active agent${activeAgentCount === 1 ? '' : 's'}`}
              />
              <span className={workspacePillClassName}>{selectedTopicLabel}</span>
            </div>
          </div>
        </div>
      </header>

      <aside
        className="fixed top-[6.5rem] hidden h-[calc(100vh-7.75rem)] w-60 flex-col gap-5 xl:flex"
        style={{ left: 'max(1rem, calc((100vw - 1600px) / 2 + 1rem))' }}
      >
        <section className={`${workspaceShellPanelClassName} px-5 py-5`}>
          <p className={workspaceEyebrowClassName}>Workspace Status</p>
          <div className="mt-4 space-y-3">
            <div>
              <div className="text-2xl font-semibold tracking-[-0.04em] text-white">
                {activeAgentCount}
              </div>
              <p className="text-sm text-[color:var(--surface-text-muted)]">Live profiles now</p>
            </div>
            <div className="grid gap-3 text-sm text-[color:var(--surface-text-muted)] sm:grid-cols-2 xl:grid-cols-1">
              <div>
                <div className={workspaceLabelClassName}>Topics</div>
                <div className="mt-1 text-base font-medium text-white">{topicCount}</div>
              </div>
              <div>
                <div className={workspaceLabelClassName}>Recent Runs</div>
                <div className="mt-1 text-base font-medium text-white">{recentRunCount}</div>
              </div>
            </div>
          </div>
        </section>

        <nav
          aria-label="Agents workspace sections"
          className={`${workspaceShellPanelClassName} flex-1 px-3 py-3`}
        >
          <div className={workspaceEyebrowClassName}>Jump To</div>
          <div className="mt-4 space-y-1">
            {WORKSPACE_SECTIONS.map((section) => (
              <a key={section.href} href={section.href} className={workspaceSectionLinkClassName()}>
                <Icon name={section.icon} />
                <span>{section.label}</span>
              </a>
            ))}
          </div>
        </nav>

        <div className="space-y-3">
          <Link href="/ingest" className={`${workspacePrimaryButtonClassName} w-full`}>
            Add Content
          </Link>
          <section className={`${workspaceShellPanelClassName} px-5 py-5`}>
            <p className={workspaceEyebrowClassName}>Selected Scope</p>
            <p className="mt-3 text-base font-medium text-white">{selectedTopicLabel}</p>
            <p className={`mt-2 ${workspaceMutedCopyClassName}`}>
              Global defaults remain separate from topic overrides, so launches stay explicit.
            </p>
          </section>
        </div>
      </aside>

      <main className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8 xl:pl-[17.5rem]">
        <div className="mb-6 space-y-4 xl:hidden">
          <section className={`${workspaceShellPanelClassName} px-5 py-5`}>
            <p className={workspaceEyebrowClassName}>Workspace Status</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <div className={workspaceLabelClassName}>Live Profiles</div>
                <div className="mt-1 text-lg font-semibold text-white">{activeAgentCount}</div>
              </div>
              <div>
                <div className={workspaceLabelClassName}>Selected Scope</div>
                <div className="mt-1 text-lg font-semibold text-white">{selectedTopicLabel}</div>
              </div>
              <div>
                <div className={workspaceLabelClassName}>Recent Runs</div>
                <div className="mt-1 text-lg font-semibold text-white">{recentRunCount}</div>
              </div>
            </div>
          </section>

          <nav aria-label="Agents workspace sections" className="overflow-x-auto pb-1">
            <div className="flex min-w-max gap-2">
              {WORKSPACE_SECTIONS.map((section) => (
                <a
                  key={section.href}
                  href={section.href}
                  className={workspaceSectionLinkClassName(true)}
                >
                  <Icon name={section.icon} />
                  <span>{section.label}</span>
                </a>
              ))}
            </div>
          </nav>
        </div>

        {children}
      </main>
    </div>
  );
}

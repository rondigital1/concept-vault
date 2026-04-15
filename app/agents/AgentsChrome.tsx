'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

type Props = {
  activeAgentCount: number;
  selectedTopicName: string | null;
  children: ReactNode;
};

const TOP_NAV_ITEMS = [
  { href: '/today', label: 'Research' },
  { href: '/agents', label: 'Agents', active: true },
  { href: '/library', label: 'Library' },
  { href: '/reports', label: 'Reports' },
];

function Icon({
  name,
  className = 'h-5 w-5',
}: {
  name: 'settings' | 'bell' | 'panel' | 'registry' | 'topic' | 'runs';
  className?: string;
}) {
  if (name === 'settings') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.7} aria-hidden="true">
        <circle cx="12" cy="12" r="3.2" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V22a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.04-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.04H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.65 8.9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9.01 4a1.7 1.7 0 0 0 1.04-1.56V2.35a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15.09 4a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 8.9a1.7 1.7 0 0 0 1.56 1.04H21a2 2 0 1 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15Z" />
      </svg>
    );
  }

  if (name === 'bell') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.7} aria-hidden="true">
        <path d="M15 18H6.5a1.5 1.5 0 0 1-1.32-2.22L6 14.25V10a6 6 0 1 1 12 0v4.25l.82 1.53A1.5 1.5 0 0 1 17.5 18H15Z" />
        <path d="M9.75 20a2.25 2.25 0 0 0 4.5 0" />
      </svg>
    );
  }

  if (name === 'panel') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.7} aria-hidden="true">
        <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H10v16H5.5A1.5 1.5 0 0 1 4 18.5z" />
        <path d="M10 4h8.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H10" />
      </svg>
    );
  }

  if (name === 'registry') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.7} aria-hidden="true">
        <path d="M6 6h12" />
        <path d="M6 12h12" />
        <path d="M6 18h12" />
        <path d="M4 6h.01" />
        <path d="M4 12h.01" />
        <path d="M4 18h.01" />
      </svg>
    );
  }

  if (name === 'topic') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.7} aria-hidden="true">
        <path d="M12 20a8 8 0 1 0-8-8c0 4.42 3.58 8 8 8Z" />
        <path d="M12 12 8.5 8.5" />
        <path d="M12 4v8h8" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.7} aria-hidden="true">
      <path d="M8 6h12" />
      <path d="M8 12h12" />
      <path d="M8 18h12" />
      <path d="M4 6h.01" />
      <path d="M4 12h.01" />
      <path d="M4 18h.01" />
    </svg>
  );
}

function NavLink({
  href,
  label,
  active = false,
}: {
  href: string;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`pb-1 text-sm font-semibold tracking-[-0.02em] transition-colors ${
        active
          ? 'border-b-2 border-[color:var(--agents-accent)] text-[color:var(--agents-accent)]'
          : 'text-[color:var(--agents-muted)] hover:text-[color:var(--agents-accent)]'
      }`}
    >
      {label}
    </Link>
  );
}

function RailLink({
  href,
  label,
  icon,
  active = false,
}: {
  href: string;
  label: string;
  icon: 'panel' | 'registry' | 'topic' | 'runs';
  active?: boolean;
}) {
  return (
    <a
      href={href}
      className={`flex items-center gap-3 rounded-full px-4 py-3 text-[10px] font-bold uppercase tracking-[0.16em] transition-colors ${
        active
          ? 'bg-[color:var(--agents-accent)] text-[color:var(--agents-accent-ink)]'
          : 'text-[color:var(--agents-muted)] hover:bg-[rgba(255,255,255,0.06)] hover:text-[color:var(--agents-text)]'
      }`}
    >
      <Icon name={icon} className="h-[18px] w-[18px]" />
      <span>{label}</span>
    </a>
  );
}

export function AgentsChrome({ activeAgentCount, selectedTopicName, children }: Props) {
  return (
    <div className="agents-screen">
      <header className="agents-glass fixed inset-x-0 top-0 z-40">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="text-[1.75rem] font-black tracking-[-0.08em] text-[color:var(--agents-accent)]">
            CONCEPT_VAULT
          </div>

          <nav className="hidden items-center gap-8 md:flex">
            {TOP_NAV_ITEMS.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                active={Boolean(item.active)}
              />
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/reports"
              aria-label="Reports"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(255,255,255,0.05)] text-[color:var(--agents-text)] outline outline-1 outline-[color:var(--agents-outline)]"
            >
              <Icon name="settings" className="h-[18px] w-[18px]" />
            </Link>
            <Link
              href="/chat"
              aria-label="Ask Vault"
              className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(255,255,255,0.05)] text-[color:var(--agents-text)] outline outline-1 outline-[color:var(--agents-outline)]"
            >
              <Icon name="bell" className="h-[18px] w-[18px]" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-white" />
            </Link>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(255,255,255,0.08)] text-sm font-semibold text-[color:var(--agents-text)]">
              CV
            </div>
          </div>
        </div>
      </header>

      <aside className="agents-glass fixed left-0 top-16 hidden h-[calc(100vh-4rem)] w-64 flex-col px-4 py-6 lg:flex">
        <div className="mb-10">
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-[color:var(--agents-accent)] animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--agents-text-soft)]">
              Neural Core
            </span>
          </div>
          <div className="pl-5 text-[10px] uppercase tracking-[0.16em] text-[color:var(--agents-muted)]">
            {activeAgentCount} live agent{activeAgentCount === 1 ? '' : 's'}
          </div>
        </div>

        <nav className="space-y-1">
          <RailLink href="#agents-hero" label="Overview" icon="panel" active />
          <RailLink href="#agents-registry" label="Registry" icon="registry" />
          <RailLink href="#agents-inspector" label="Inspector" icon="topic" />
          <RailLink href="#agents-runs" label="Runs" icon="runs" />
        </nav>

        <div className="mt-auto space-y-4 pt-6">
          <Link href="/ingest" className="agents-button-primary w-full">
            Add Content
          </Link>
          <div className="agents-panel agents-panel-lowest rounded-[24px] p-4">
            <p className="agents-label">Selected topic</p>
            <p className="mt-3 text-sm font-semibold text-[color:var(--agents-text)]">
              {selectedTopicName ?? 'Global scope'}
            </p>
            <p className="mt-2 text-sm leading-6 text-[color:var(--agents-muted)]">
              Topic overrides remain explicit. Global defaults stay separate from topic workflow state.
            </p>
          </div>
        </div>
      </aside>

      <div className="relative z-10 pt-16 lg:pl-64">{children}</div>
    </div>
  );
}

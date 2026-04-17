import type { ButtonHTMLAttributes, ReactNode } from 'react';
import Link from 'next/link';
import { PRIMARY_TOP_NAV_KEYS, getTopNavItems } from '@/app/components/topNav';

export type ResultsIconName =
  | 'analytics'
  | 'archive'
  | 'arrow-left'
  | 'arrow-up-right'
  | 'bell'
  | 'chat'
  | 'check'
  | 'close'
  | 'external'
  | 'library'
  | 'plus'
  | 'report'
  | 'research'
  | 'settings'
  | 'stack';

type ResultsNavKey = 'reports' | 'research' | 'library' | 'chat';
type ResultsPillTone = 'muted' | 'inverse' | 'success' | 'warning' | 'danger' | 'info';
type ResultsActionTone = 'primary' | 'secondary' | 'success' | 'danger';

type NavItem = {
  key: ResultsNavKey;
  label: string;
  href: string;
  icon: ResultsIconName;
};

const TOP_NAV_ITEMS = getTopNavItems(PRIMARY_TOP_NAV_KEYS).map((item) => ({
  href: item.href,
  label: item.label,
  active: item.key === 'reports',
}));

const SIDE_NAV_ITEMS: NavItem[] = [
  { key: 'research', label: 'Research', href: '/today', icon: 'research' },
  { key: 'reports', label: 'Reports', href: '/reports', icon: 'report' },
  { key: 'library', label: 'Library', href: '/library', icon: 'library' },
  { key: 'chat', label: 'Ask Vault', href: '/chat', icon: 'chat' },
];

function joinClassNames(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

export function ResultsIcon({
  name,
  className = 'h-[1.15rem] w-[1.15rem]',
}: {
  name: ResultsIconName;
  className?: string;
}) {
  switch (name) {
    case 'analytics':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 18.75h13.5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 16.5V9.75M12 16.5V6.75M16.5 16.5v-3.75" />
        </svg>
      );
    case 'archive':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 7.5h15v10.5A1.5 1.5 0 0 1 18 19.5H6A1.5 1.5 0 0 1 4.5 18V7.5Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.5h16.5v3H3.75zM9.75 12h4.5" />
        </svg>
      );
    case 'arrow-left':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6.75 9.75 12l6 5.25" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 12h10.5" />
        </svg>
      );
    case 'arrow-up-right':
    case 'external':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15.75 15.75 8.25" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25h6.75V15" />
        </svg>
      );
    case 'bell':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 18.75a3 3 0 0 1-6 0" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 16.5H6.75c.6-.65 1.05-1.86 1.05-3.5V10.5a4.2 4.2 0 1 1 8.4 0V13c0 1.64.45 2.85 1.05 3.5Z" />
        </svg>
      );
    case 'chat':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 17.25H4.88A1.88 1.88 0 0 1 3 15.38V6.88C3 5.84 3.84 5 4.88 5h14.24C20.16 5 21 5.84 21 6.88v8.5c0 1.04-.84 1.87-1.88 1.87H11.5L7.5 21v-3.75Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 10.25h8M8 13.5h5.5" />
        </svg>
      );
    case 'check':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="m5.25 12.75 4.5 4.5L18.75 6.75" />
        </svg>
      );
    case 'close':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="m6.75 6.75 10.5 10.5M17.25 6.75 6.75 17.25" />
        </svg>
      );
    case 'library':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 6.75A2.25 2.25 0 0 1 6.75 4.5h10.5A2.25 2.25 0 0 1 19.5 6.75v10.5A2.25 2.25 0 0 1 17.25 19.5H6.75A2.25 2.25 0 0 1 4.5 17.25V6.75Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 8.25h3.75v7.5H8.25zM15.75 8.25v7.5" />
        </svg>
      );
    case 'plus':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 5.25v13.5M5.25 12h13.5" />
        </svg>
      );
    case 'report':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3.75h7.13l3.62 3.62v12.88H7.5a1.5 1.5 0 0 1-1.5-1.5V5.25a1.5 1.5 0 0 1 1.5-1.5Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 3.75v4.5h4.5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 12h6M9.75 15.75h6" />
        </svg>
      );
    case 'research':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
          <circle cx="10.25" cy="10.25" r="5.5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="m14.5 14.5 4.75 4.75" />
        </svg>
      );
    case 'settings':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.33 4.69a1.75 1.75 0 0 1 3.34 0l.2.76a1.75 1.75 0 0 0 2.52 1.07l.68-.39a1.75 1.75 0 0 1 2.37.64l.82 1.42a1.75 1.75 0 0 1-.63 2.37l-.67.39a1.75 1.75 0 0 0 0 3.04l.67.39a1.75 1.75 0 0 1 .63 2.37l-.82 1.42a1.75 1.75 0 0 1-2.37.64l-.68-.39a1.75 1.75 0 0 0-2.52 1.07l-.2.76a1.75 1.75 0 0 1-3.34 0l-.2-.76a1.75 1.75 0 0 0-2.52-1.07l-.68.39a1.75 1.75 0 0 1-2.37-.64l-.82-1.42a1.75 1.75 0 0 1 .63-2.37l.67-.39a1.75 1.75 0 0 0 0-3.04l-.67-.39a1.75 1.75 0 0 1-.63-2.37l.82-1.42a1.75 1.75 0 0 1 2.37-.64l.68.39a1.75 1.75 0 0 0 2.52-1.07l.2-.76Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case 'stack':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="m12 5.25 8.25 4.5L12 14.25 3.75 9.75 12 5.25Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 12.75 8.25 4.5 8.25-4.5" />
        </svg>
      );
  }
}

function TopNav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 h-16 bg-[rgba(19,19,19,0.58)] backdrop-blur-2xl">
      <div className="mx-auto flex h-full max-w-[1560px] items-center justify-between px-6 lg:px-10">
        <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-85">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f3f0f0] text-[0.72rem] font-black uppercase tracking-[0.18em] text-[#131313]">
            CV
          </div>
          <div className="leading-none">
            <div className="text-[1.2rem] font-black tracking-[-0.06em] text-white">Concept Vault</div>
            <div className="mt-1 text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-[#8f8a8a]">Research Intelligence</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-10 md:flex">
          {TOP_NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={joinClassNames(
                'relative text-[1.1rem] font-medium tracking-[-0.035em] transition-colors',
                item.active ? 'text-white' : 'text-[#8f8a8a] hover:text-white',
              )}
              aria-current={item.active ? 'page' : undefined}
            >
              {item.label}
              {item.active ? <span className="absolute inset-x-0 -bottom-2 h-0.5 rounded-full bg-white" /> : null}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <button type="button" className="rounded-full p-2 text-white/90 transition hover:bg-white/5" aria-label="Settings">
            <ResultsIcon name="settings" />
          </button>
          <button type="button" className="relative rounded-full p-2 text-white/90 transition hover:bg-white/5" aria-label="Notifications">
            <ResultsIcon name="bell" />
            <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[#f0ecec]" />
          </button>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ececec] text-[0.72rem] font-black tracking-[0.18em] text-[#1a1a1a]">
            CV
          </div>
        </div>
      </div>
    </header>
  );
}

function SideNav({ activeNav }: { activeNav: ResultsNavKey }) {
  return (
    <>
      <aside className="fixed left-0 top-16 hidden h-[calc(100vh-4rem)] w-64 bg-[#151515] px-5 py-6 lg:flex lg:flex-col">
        <Link href="/reports" className="px-4 transition-opacity hover:opacity-85">
          <p className="text-[0.76rem] font-bold uppercase tracking-[0.08em] text-white">RESULT_ARCHIVE</p>
          <p className="mt-1 text-[0.76rem] uppercase tracking-[0.08em] text-[#747070]">APPROVED_DOSSIERS</p>
        </Link>

        <div className="mt-10 px-4">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#6f6a6a]">Workspace</p>
        </div>

        <nav className="mt-3 space-y-2">
          {SIDE_NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={joinClassNames(
                'flex items-center gap-4 rounded-full px-5 py-3 text-[0.78rem] uppercase tracking-[0.16em] transition',
                item.key === activeNav ? 'bg-[#f3f0f0] text-[#171717]' : 'text-[#787373] hover:bg-white/6 hover:text-white',
              )}
              aria-current={item.key === activeNav ? 'page' : undefined}
            >
              <ResultsIcon name={item.icon} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="mt-auto space-y-3 pt-6">
          <div className="px-4">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#6f6a6a]">Quick Links</p>
          </div>
          <Link
            href="/today"
            className="flex w-full items-center justify-center rounded-full bg-[#f3f0f0] px-5 py-3 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[#171717] transition hover:bg-white"
          >
            OPEN RESEARCH
          </Link>
          <Link href="/ingest" className="flex items-center gap-4 px-5 py-3 text-[0.78rem] uppercase tracking-[0.16em] text-[#787373] transition hover:text-white">
            <ResultsIcon name="plus" />
            <span>Add Content</span>
          </Link>
        </div>
      </aside>

      <div className="mb-10 flex gap-3 overflow-x-auto pb-2 lg:hidden">
        {SIDE_NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={joinClassNames(
              'inline-flex items-center gap-2 rounded-full px-4 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.22em]',
              item.key === activeNav ? 'bg-[#f3f0f0] text-[#141414]' : 'bg-[#1f1f1f] text-[#b3adad]',
            )}
            aria-current={item.key === activeNav ? 'page' : undefined}
          >
            <ResultsIcon name={item.icon} className="h-4 w-4" />
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
    </>
  );
}

export function ResultsRouteShell({
  children,
  activeNav = 'reports',
  showReadyPulse = false,
}: {
  children: ReactNode;
  activeNav?: ResultsNavKey;
  showReadyPulse?: boolean;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#131313] text-[#ece9e8]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-8%] top-[-5%] h-[28rem] w-[28rem] rounded-full bg-white/[0.03] blur-[120px]" />
        <div className="absolute right-[-12%] top-[12%] h-[24rem] w-[24rem] rounded-full bg-white/[0.025] blur-[120px]" />
        <div className="absolute inset-x-0 top-0 h-px bg-white/[0.04]" />
      </div>

      <TopNav />
      <SideNav activeNav={activeNav} />

      <main className="relative px-4 pb-16 pt-24 sm:px-6 lg:ml-64 lg:px-10">
        {children}

        {showReadyPulse ? (
          <div className="pointer-events-none fixed bottom-8 right-8 hidden flex-col items-center gap-4 xl:flex">
            <div className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full bg-[rgba(53,53,53,0.36)] shadow-[0_20px_44px_rgba(0,0,0,0.36)] backdrop-blur-2xl">
              <div className="h-8 w-8 rounded-full bg-[linear-gradient(135deg,#ffffff,#9a9a9a)] animate-[pulse_3.2s_ease-in-out_infinite]" />
            </div>
            <div className="text-[0.58rem] font-bold uppercase tracking-[0.34em] text-[#857e7e]">ARCHIVE_READY</div>
          </div>
        ) : null}
      </main>
    </div>
  );
}

export function ResultsContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={joinClassNames('mx-auto max-w-[1180px]', className)}>{children}</div>;
}

export function ResultsPill({
  children,
  tone = 'muted',
  className,
}: {
  children: ReactNode;
  tone?: ResultsPillTone;
  className?: string;
}) {
  const toneClassName = {
    muted: 'bg-[#1f1f1f] text-[#d7d0d0]',
    inverse: 'bg-[#f3f0f0] text-[#171717]',
    success: 'bg-[#152318] text-[#d2ead5]',
    warning: 'bg-[#2b2315] text-[#ecd9ae]',
    danger: 'bg-[#301b1b] text-[#f3cece]',
    info: 'bg-[#162029] text-[#d4e3f5]',
  } satisfies Record<ResultsPillTone, string>;

  return (
    <span className={joinClassNames('rounded-full px-3 py-1.5 text-[0.66rem] font-semibold uppercase tracking-[0.18em]', toneClassName[tone], className)}>
      {children}
    </span>
  );
}

export function ResultsTopicChip({ topic }: { topic: string }) {
  return (
    <span className="rounded-full bg-[#101010] px-3 py-1.5 text-[0.68rem] font-semibold tracking-[0.02em] text-[#d3cbcb]">
      {topic}
    </span>
  );
}

export function resultsActionClassName(tone: ResultsActionTone = 'secondary', fullWidth = false) {
  const toneClassName = {
    primary: 'bg-[#f2eeee] text-[#171717] hover:bg-white',
    secondary: 'bg-transparent text-white ring-1 ring-white/12 hover:bg-white/5',
    success: 'bg-[#f2eeee] text-[#171717] hover:bg-white',
    danger: 'bg-transparent text-[#f3cece] ring-1 ring-[#5a2e2e] hover:bg-[#2a1818]',
  } satisfies Record<ResultsActionTone, string>;

  return joinClassNames(
    'flex items-center justify-center gap-2 rounded-full px-5 py-4 text-[0.72rem] font-bold uppercase tracking-[0.28em] transition disabled:cursor-not-allowed disabled:opacity-60',
    toneClassName[tone],
    fullWidth && 'w-full',
  );
}

export function ResultsActionLink({
  href,
  label,
  icon,
  tone = 'secondary',
  fullWidth = false,
  external = false,
}: {
  href: string;
  label: string;
  icon: ResultsIconName;
  tone?: ResultsActionTone;
  fullWidth?: boolean;
  external?: boolean;
}) {
  const className = resultsActionClassName(tone, fullWidth);

  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className}>
        <ResultsIcon name={icon} className="h-4 w-4" />
        <span>{label}</span>
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      <ResultsIcon name={icon} className="h-4 w-4" />
      <span>{label}</span>
    </Link>
  );
}

export function ResultsActionButton({
  label,
  icon,
  tone = 'secondary',
  fullWidth = false,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  icon: ResultsIconName;
  tone?: ResultsActionTone;
  fullWidth?: boolean;
}) {
  return (
    <button className={joinClassNames(resultsActionClassName(tone, fullWidth), className)} {...props}>
      <ResultsIcon name={icon} className="h-4 w-4" />
      <span>{label}</span>
    </button>
  );
}

export function ResultsMetadataRow({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-[0.64rem] font-semibold uppercase tracking-[0.2em] text-[#7d7878]">{label}</span>
      <span className={joinClassNames('text-right text-[0.76rem] font-mono', accent ? 'text-[#efeded]' : 'text-white')}>{value}</span>
    </div>
  );
}

export function ResultsSidePanel({
  title,
  icon,
  children,
  className,
}: {
  title: string;
  icon?: ResultsIconName;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={joinClassNames('rounded-[28px] bg-[#232323] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.26)]', className)}>
      <h3 className="flex items-center gap-2 text-[0.7rem] font-bold uppercase tracking-[0.3em] text-white">
        {icon ? <ResultsIcon name={icon} className="h-4 w-4" /> : null}
        {title}
      </h3>
      {children}
    </section>
  );
}

export function ResultsStickyToolbar({ children }: { children: ReactNode }) {
  return (
    <div className="sticky top-20 z-30 mb-8 rounded-[24px] border border-white/8 bg-[rgba(18,18,18,0.84)] px-4 py-4 shadow-[0_16px_48px_rgba(0,0,0,0.26)] backdrop-blur-2xl sm:px-5">
      {children}
    </div>
  );
}

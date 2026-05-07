import type { ReactNode } from 'react';
import Link from 'next/link';
import { PRIMARY_TOP_NAV_KEYS, getTopNavItems } from '@/app/components/topNav';
import { joinClassNames } from './resultsClassNames';
import { ResultsIcon, type ResultsIconName } from './resultsIcons';

type ResultsNavKey = 'reports' | 'research' | 'library' | 'chat';

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

export function ResultsStickyToolbar({ children }: { children: ReactNode }) {
  return (
    <div className="sticky top-20 z-30 mb-8 rounded-[24px] border border-white/8 bg-[rgba(18,18,18,0.84)] px-4 py-4 shadow-[0_16px_48px_rgba(0,0,0,0.26)] backdrop-blur-2xl sm:px-5">
      {children}
    </div>
  );
}

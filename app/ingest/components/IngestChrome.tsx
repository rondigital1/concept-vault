import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  PRIMARY_TOP_NAV_KEYS,
  getTopNavItemsWithState,
  isTopNavItemActive,
} from '@/app/components/topNav';
import { SIDE_NAV_ITEMS } from '../constants';
import { getUserInitials } from '../ingestPresentation';
import { IngestIcon } from './IngestIcon';

export function IngestChrome({
  userName,
  pathname,
  children,
}: {
  userName: string;
  pathname: string;
  children: ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#131313] text-[#e2e2e2]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_8%,rgba(255,255,255,0.05),transparent_22%),radial-gradient(circle_at_84%_14%,rgba(255,255,255,0.035),transparent_18%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_28%)]" />

      <TopNav userName={userName} pathname={pathname} />
      <SideNav pathname={pathname} />

      {children}
    </div>
  );
}

function TopNav({ userName, pathname }: { userName: string; pathname: string }) {
  const userInitials = getUserInitials(userName);
  const navItems = getTopNavItemsWithState(pathname, PRIMARY_TOP_NAV_KEYS);

  return (
    <header className="fixed inset-x-0 top-0 z-50 h-16 bg-[rgba(19,19,19,0.58)] backdrop-blur-2xl">
      <div className="mx-auto flex h-full max-w-[1560px] items-center justify-between px-4 sm:px-6 lg:px-10">
        <div className="flex items-center gap-4">
          <Link href="/ingest" className="leading-none transition-opacity hover:opacity-85">
            <div className="text-[1.18rem] font-black tracking-normal text-white sm:text-[1.3rem]">
              Concept Vault
            </div>
            <div className="mt-1 hidden text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-[#8f8a8a] sm:block">
              Add Content
            </div>
          </Link>
          <span className="hidden rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#d9d2d2] lg:inline-flex">
            Library intake
          </span>
        </div>

        <nav className="hidden items-center gap-8 md:flex lg:gap-10">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`relative text-[1rem] font-medium tracking-normal transition-colors lg:text-[1.08rem] ${
                item.active ? 'text-white' : 'text-[#8f8a8a] hover:text-white'
              }`}
              aria-current={item.active ? 'page' : undefined}
            >
              {item.label}
              {item.active ? <span className="absolute inset-x-0 -bottom-2 h-0.5 rounded-full bg-white" /> : null}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/library"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-[#d8d2d2] transition hover:bg-white/10 hover:text-white"
            aria-label="Open library"
          >
            <IngestIcon name="database" />
          </Link>
          <Link
            href="/chat"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-[#d8d2d2] transition hover:bg-white/10 hover:text-white"
            aria-label="Open Ask Vault"
          >
            <IngestIcon name="article" />
          </Link>
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[#ececec] text-[0.72rem] font-black tracking-[0.18em] text-[#1a1a1a]"
            aria-label={userName}
            title={userName}
          >
            {userInitials}
          </div>
        </div>
      </div>
    </header>
  );
}

function SideNav({ pathname }: { pathname: string }) {
  return (
    <>
      <aside className="fixed left-0 top-16 hidden h-[calc(100vh-4rem)] w-64 bg-[#151515] px-5 py-6 lg:flex lg:flex-col">
        <div className="px-4">
          <p className="text-[0.76rem] font-bold uppercase tracking-[0.08em] text-white">Add Content</p>
          <p className="mt-2 text-sm leading-6 text-[#8f8a8a]">
            Bring files, public pages, and pasted notes into the library.
          </p>
        </div>

        <div className="mt-10 px-4">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#6f6a6a]">Workspace</p>
        </div>

        <nav className="mt-3 space-y-2">
          {SIDE_NAV_ITEMS.map((item) => {
            const active = isTopNavItemActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-4 rounded-full px-5 py-3 text-[0.78rem] uppercase tracking-[0.16em] transition ${
                  active ? 'bg-[#f3f0f0] text-[#171717]' : 'text-[#787373] hover:bg-white/6 hover:text-white'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                <IngestIcon name={item.icon} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-3 pt-6">
          <div className="px-4">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#6f6a6a]">Next steps</p>
          </div>
          <Link
            href="/today"
            className="flex w-full items-center justify-center rounded-full bg-[#f3f0f0] px-5 py-3 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[#171717] transition hover:bg-white"
          >
            Continue Research
          </Link>
          <Link href="/library" className="flex items-center gap-4 px-5 py-3 text-[0.78rem] uppercase tracking-[0.16em] text-[#787373] transition hover:text-white">
            <IngestIcon name="database" />
            <span>Open Library</span>
          </Link>
          <Link href="/chat" className="flex items-center gap-4 px-5 py-3 text-[0.78rem] uppercase tracking-[0.16em] text-[#787373] transition hover:text-white">
            <IngestIcon name="article" />
            <span>Ask Vault</span>
          </Link>
        </div>
      </aside>

      <div className="fixed inset-x-0 top-16 z-40 border-y border-white/[0.06] bg-[#141414]/92 px-4 py-3 backdrop-blur-2xl lg:hidden">
        <div className="flex flex-wrap gap-2">
        {SIDE_NAV_ITEMS.map((item) => {
          const active = isTopNavItemActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`inline-flex min-h-10 items-center gap-2 whitespace-nowrap rounded-full px-3.5 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] ${
                active ? 'bg-[#f3f0f0] text-[#141414]' : 'bg-[#1f1f1f] text-[#b3adad]'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              <IngestIcon name={item.icon} />
              <span>{item.label}</span>
            </Link>
          );
        })}
        </div>
      </div>
    </>
  );
}

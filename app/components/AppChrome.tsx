'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from './ThemeToggle';
import { TopNavLinks } from './TopNavLinks';
import { APP_BRAND, getAppShellMode } from './topNav';

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const shellMode = getAppShellMode(pathname);
  const immersive = shellMode === 'immersive';

  useEffect(() => {
    document.body.dataset.appShell = shellMode;
    document.body.dataset.themeScope = immersive ? 'immersive-static' : 'shared-shell';

    return () => {
      document.body.dataset.appShell = 'default';
      document.body.dataset.themeScope = 'shared-shell';
    };
  }, [immersive, shellMode]);

  if (immersive) {
    return <main className="flex-1">{children}</main>;
  }

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-[color:var(--shell-default-outline)] bg-[color:var(--shell-default-chrome)] backdrop-blur-xl shadow-[var(--shell-default-shadow-soft)]">
        <div className="mx-auto flex max-w-[1560px] flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <Link href="/today" className="flex items-center gap-3 transition-opacity hover:opacity-80">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--shell-default-outline-strong)] bg-[color:var(--surface-panel)] text-sm font-semibold text-[color:var(--surface-accent-ink)] shadow-[0_8px_20px_rgba(16,35,44,0.12)]">
              {APP_BRAND.monogram}
            </div>
            <div className="leading-tight">
              <span className="font-editorial block text-xl tracking-[-0.04em] text-[color:var(--surface-text)]">
                {APP_BRAND.name}
              </span>
              <span className="block text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--surface-text-muted)]">
                {APP_BRAND.shellLabel}
              </span>
            </div>
          </Link>
          <TopNavLinks />
        </div>
      </nav>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-[color:var(--shell-default-outline)] bg-[color:var(--shell-default-chrome)]">
        <div className="mx-auto flex max-w-[1560px] flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <p className="max-w-3xl text-sm text-[color:var(--surface-text-muted)]">
            {APP_BRAND.shellDescription}
          </p>
          <ThemeToggle />
        </div>
      </footer>
    </>
  );
}

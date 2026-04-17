'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from './ThemeToggle';
import { TopNavLinks } from './TopNavLinks';
import { isImmersiveAppRoute } from './topNav';

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const immersive = isImmersiveAppRoute(pathname);

  useEffect(() => {
    document.body.dataset.appChrome = immersive ? 'immersive' : 'default';

    return () => {
      document.body.dataset.appChrome = 'default';
    };
  }, [immersive]);

  if (immersive) {
    return <main className="flex-1">{children}</main>;
  }

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-[color:var(--workbench-line)] bg-[color:var(--workbench-shell)] backdrop-blur-xl shadow-[0_10px_28px_rgba(43,30,20,0.08)]">
        <div className="mx-auto flex max-w-[1560px] items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--workbench-line)] bg-[color:var(--workbench-panel)] text-sm font-semibold text-[color:var(--workbench-accent-ink)] shadow-[0_8px_20px_rgba(23,60,73,0.08)]">
              CV
            </div>
            <div className="leading-tight">
              <span className="font-editorial block text-xl tracking-[-0.04em] text-[#10242c]">Concept Vault</span>
              <span className="block text-[11px] font-semibold uppercase tracking-[0.22em] text-[#6d7d86]">
                Research Workbench
              </span>
            </div>
          </Link>
          <TopNavLinks />
        </div>
      </nav>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-[color:var(--workbench-line)] bg-[color:var(--workbench-shell)]">
        <div className="mx-auto flex max-w-[1560px] items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <p className="text-sm text-[#5b6e77]">
            Operational research surfaces for evidence review, synthesis, and human intervention.
          </p>
          <ThemeToggle />
        </div>
      </footer>
    </>
  );
}

'use client';

import Link from 'next/link';
import { LibraryIcon } from './LibraryIcon';

type Props = {
  onNavigate?: () => void;
};

export function LibrarySidebarFooter({ onNavigate }: Props) {
  return (
    <div className="mt-6 rounded-[24px] bg-[#1d1d1d] p-4">
      <Link
        href="/ingest"
        onClick={onNavigate}
        className="flex w-full items-center justify-center rounded-full bg-[#f1eeee] px-4 py-3 text-[0.68rem] font-bold uppercase tracking-[0.28em] text-[#171717] transition hover:bg-white"
      >
        Add_Content
      </Link>

      <div className="mt-4 space-y-1">
        <LibrarySidebarFooterLink href="/today" icon="spark" onNavigate={onNavigate}>
          Open research
        </LibrarySidebarFooterLink>
        <LibrarySidebarFooterLink href="/reports" icon="report" onNavigate={onNavigate}>
          Review results
        </LibrarySidebarFooterLink>
      </div>
    </div>
  );
}

function LibrarySidebarFooterLink({
  href,
  icon,
  onNavigate,
  children,
}: {
  href: string;
  icon: 'spark' | 'report';
  onNavigate?: () => void;
  children: string;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="flex items-center gap-3 rounded-full px-3 py-2.5 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#898383] transition hover:bg-white/5 hover:text-white"
    >
      <LibraryIcon name={icon} className="h-4 w-4" />
      <span>{children}</span>
    </Link>
  );
}

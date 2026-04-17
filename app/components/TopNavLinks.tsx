'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TOP_NAV_GROUP_LABELS, getTopNavGroupsWithState } from './topNav';

export function TopNavLinks() {
  const pathname = usePathname();
  const { primary, utility } = getTopNavGroupsWithState(pathname);

  return (
    <div className="flex w-full flex-col items-stretch gap-3 lg:w-auto lg:flex-row lg:items-center lg:justify-end">
      <div
        aria-label={TOP_NAV_GROUP_LABELS.primary}
        role="group"
        className="flex flex-wrap items-center justify-start gap-2 rounded-full border border-[color:var(--shell-default-outline)] bg-[color:var(--shell-default-nav-rail)] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]"
      >
        {primary.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={item.active ? 'page' : undefined}
            className={[
              'flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition-[background-color,color,box-shadow]',
              item.active
                ? 'bg-[color:var(--surface-accent-ink)] text-white shadow-[0_12px_28px_rgba(16,35,44,0.22)]'
                : 'text-[color:var(--surface-text-muted)] hover:bg-[color:var(--shell-default-panel-strong)] hover:text-[color:var(--surface-text)]',
            ].join(' ')}
          >
            {item.label}
          </Link>
        ))}
      </div>
      <div
        aria-label={TOP_NAV_GROUP_LABELS.utility}
        role="group"
        className="flex flex-wrap items-center justify-end gap-2"
      >
        {utility.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={item.active ? 'page' : undefined}
            className={[
              'inline-flex h-10 items-center justify-center rounded-full border px-4 text-sm font-medium transition-[background-color,border-color,color,box-shadow]',
              item.active
                ? 'border-[color:var(--surface-accent-strong)] bg-[color:var(--surface-accent-soft)] text-[color:var(--surface-text)] shadow-[0_8px_20px_rgba(16,35,44,0.12)]'
                : 'border-[color:var(--shell-default-outline)] bg-[color:var(--surface-panel-elevated)] text-[color:var(--surface-text-muted)] hover:border-[color:var(--surface-accent)] hover:text-[color:var(--surface-text)]',
            ].join(' ')}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

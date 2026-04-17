'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getTopNavItemsWithState } from './topNav';

export function TopNavLinks() {
  const pathname = usePathname();
  const navItems = getTopNavItemsWithState(pathname);

  return (
    <div className="flex flex-wrap justify-end gap-2 rounded-full border border-[color:var(--workbench-line)] bg-[rgba(255,252,248,0.45)] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.42)]">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.active ? 'page' : undefined}
          className={`flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition-all ${
            item.active
              ? 'bg-[color:var(--workbench-accent-ink)] text-white shadow-[0_10px_24px_rgba(23,60,73,0.2)]'
              : 'text-[#5d6d76] hover:bg-[rgba(255,255,255,0.72)] hover:text-[#10242c]'
          }`}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}

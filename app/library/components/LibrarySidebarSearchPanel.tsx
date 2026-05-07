'use client';

import Link from 'next/link';
import type { DocumentListItem as DocItem } from '@/server/repos/documents.repo';
import { LibraryIcon } from './LibraryIcon';
import { LibrarySidebarHeader } from './LibrarySidebarHeader';

type Props = {
  documents: DocItem[];
  searchQuery: string;
  cleanupCount: number;
  onSearchChange: (query: string) => void;
  onCollapse?: () => void;
  onNavigate?: () => void;
};

export function LibrarySidebarSearchPanel({
  documents,
  searchQuery,
  cleanupCount,
  onSearchChange,
  onCollapse,
  onNavigate,
}: Props) {
  const hasSearch = searchQuery.trim().length > 0;

  return (
    <div className="rounded-[24px] bg-[#1f1f1f] p-4">
      <LibrarySidebarHeader onCollapse={onCollapse} />

      {cleanupCount > 0 ? (
        <Link
          href="/library#needs-cleanup"
          onClick={onNavigate}
          className="mt-5 flex items-center justify-between rounded-[18px] bg-[#2a1d18] px-4 py-3 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#f1d0c6] transition hover:bg-[#33231d]"
        >
          <span>
            {cleanupCount} title{cleanupCount === 1 ? '' : 's'} need cleanup
          </span>
          <LibraryIcon name="warning" className="h-3.5 w-3.5" />
        </Link>
      ) : null}

      <label className="relative mt-4 block">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#7d7676]">
          <LibraryIcon name="search" className="h-4 w-4" />
        </span>
        <input
          type="search"
          placeholder="Search titles, tags, or sources"
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          className="h-12 w-full rounded-full bg-[#111111] pl-10 pr-12 text-sm text-white placeholder:text-[#676161] outline-none transition focus:bg-[#2a2a2a] focus:shadow-[0_0_0_1px_rgba(198,198,198,0.14)]"
        />
        {hasSearch ? (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[#7d7676] transition hover:bg-white/5 hover:text-white"
            aria-label="Clear library search"
          >
            <LibraryIcon name="close" className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </label>

      <div className="mt-3 flex items-center justify-between gap-3 px-1 text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-[#726b6b]">
        <span>
          {documents.length} result{documents.length === 1 ? '' : 's'}
        </span>
        {hasSearch ? <span>Search active</span> : <span>Latest first</span>}
      </div>
    </div>
  );
}

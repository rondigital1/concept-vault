'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { CollectionRow } from '@/server/repos/collections.repo';
import type { DocumentListItem as DocItem } from '@/server/repos/documents.repo';
import { CollectionSection } from './CollectionSection';
import { DocumentListItem } from './DocumentListItem';
import { LibraryIcon } from './LibraryIcon';

type Props = {
  mode: 'desktop' | 'mobile';
  documents: DocItem[];
  favorites: DocItem[];
  collections: CollectionRow[];
  selectedId: string | null;
  searchQuery: string;
  cleanupCount: number;
  onSearchChange: (query: string) => void;
  onCollapse?: () => void;
  onNavigate?: () => void;
};

export function LibrarySidebar({
  mode,
  documents,
  favorites,
  collections,
  selectedId,
  searchQuery,
  cleanupCount,
  onSearchChange,
  onCollapse,
  onNavigate,
}: Props) {
  const [favoritesExpanded, setFavoritesExpanded] = useState(true);
  const [collectionsExpanded, setCollectionsExpanded] = useState(true);
  const [allDocsExpanded, setAllDocsExpanded] = useState(true);
  const hasSearch = searchQuery.trim().length > 0;
  const sectionHeadingClassName =
    'flex w-full items-center gap-2 px-2 py-1 text-[0.64rem] font-bold uppercase tracking-[0.24em] text-[#8b8484] transition hover:text-white';

  return (
    <div
      className={`flex h-full min-h-0 w-full flex-col bg-[#151515] px-4 py-5 ${
        mode === 'desktop' ? 'shadow-[0_30px_90px_rgba(0,0,0,0.4)]' : ''
      }`}
    >
      <div className="rounded-[24px] bg-[#1f1f1f] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[0.6rem] font-semibold uppercase tracking-[0.24em] text-[#7f7979]">
              Research_Unit_01
            </p>
            <h2 className="mt-3 text-[1.08rem] font-bold tracking-[-0.045em] text-white">
              Repository index
            </h2>
            <p className="mt-2 text-[0.76rem] leading-6 text-[#8e8787]">
              Search, organize, and reopen source material held inside the vault.
            </p>
          </div>
          {onCollapse ? (
            <button
              type="button"
              onClick={onCollapse}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-[#b6afaf] transition hover:bg-white/10 hover:text-white"
              aria-label="Collapse library navigation"
            >
              <LibraryIcon name="panel-close" className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        {cleanupCount > 0 ? (
          <Link
            href="/library#needs-cleanup"
            onClick={onNavigate}
            className="mt-5 flex items-center justify-between rounded-[18px] bg-[#2a1d18] px-4 py-3 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#f1d0c6] transition hover:bg-[#33231d]"
          >
            <span>{cleanupCount} title{cleanupCount === 1 ? '' : 's'} need cleanup</span>
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
          <span>{documents.length} result{documents.length === 1 ? '' : 's'}</span>
          {hasSearch ? <span>Search active</span> : <span>Latest first</span>}
        </div>
      </div>

      <div className="mt-6 flex-1 overflow-y-auto overscroll-contain pr-1">
        <div className="space-y-4">
          {favorites.length > 0 ? (
            <section>
              <button
                type="button"
                onClick={() => setFavoritesExpanded((current) => !current)}
                className={sectionHeadingClassName}
              >
                <LibraryIcon
                  name="chevron-right"
                  className={`h-3.5 w-3.5 transition-transform ${favoritesExpanded ? 'rotate-90' : ''}`}
                />
                <span>Favorites</span>
                <span className="ml-auto rounded-full bg-[#232323] px-2.5 py-1 text-[0.58rem] text-[#d6d0d0]">
                  {favorites.length}
                </span>
              </button>
              {favoritesExpanded ? (
                <div className="mt-2 space-y-1">
                  {favorites.map((document) => (
                    <DocumentListItem
                      key={`favorite-${document.id}`}
                      document={document}
                      isSelected={document.id === selectedId}
                      onNavigate={onNavigate}
                    />
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}

          <CollectionSection
            collections={collections}
            expanded={collectionsExpanded}
            onToggle={() => setCollectionsExpanded((current) => !current)}
            onNavigate={onNavigate}
          />

          <section>
            <button
              type="button"
              onClick={() => setAllDocsExpanded((current) => !current)}
              className={sectionHeadingClassName}
            >
              <LibraryIcon
                name="chevron-right"
                className={`h-3.5 w-3.5 transition-transform ${allDocsExpanded ? 'rotate-90' : ''}`}
              />
              <span>All documents</span>
              <span className="ml-auto rounded-full bg-[#232323] px-2.5 py-1 text-[0.58rem] text-[#d6d0d0]">
                {documents.length}
              </span>
            </button>
            {allDocsExpanded ? (
              <div className="mt-2 space-y-1">
                {documents.length > 0 ? (
                  documents.map((document) => (
                    <DocumentListItem
                      key={document.id}
                      document={document}
                      isSelected={document.id === selectedId}
                      onNavigate={onNavigate}
                    />
                  ))
                ) : (
                  <div className="rounded-[20px] bg-[#1b1b1b] px-4 py-4 text-[0.76rem] leading-6 text-[#7a7474]">
                    <p>No matching documents in the current index.</p>
                    {hasSearch ? (
                      <button
                        type="button"
                        onClick={() => onSearchChange('')}
                        className="mt-3 text-[0.64rem] font-semibold uppercase tracking-[0.2em] text-[#d5cece] transition hover:text-white"
                      >
                        Reset search
                      </button>
                    ) : null}
                  </div>
                )}
              </div>
            ) : null}
          </section>
        </div>
      </div>

      <div className="mt-6 rounded-[24px] bg-[#1d1d1d] p-4">
        <Link
          href="/ingest"
          onClick={onNavigate}
          className="flex w-full items-center justify-center rounded-full bg-[#f1eeee] px-4 py-3 text-[0.68rem] font-bold uppercase tracking-[0.28em] text-[#171717] transition hover:bg-white"
        >
          Add_Content
        </Link>

        <div className="mt-4 space-y-1">
          <Link
            href="/today"
            onClick={onNavigate}
            className="flex items-center gap-3 rounded-full px-3 py-2.5 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#898383] transition hover:bg-white/5 hover:text-white"
          >
            <LibraryIcon name="spark" className="h-4 w-4" />
            <span>Open research</span>
          </Link>
          <Link
            href="/reports"
            onClick={onNavigate}
            className="flex items-center gap-3 rounded-full px-3 py-2.5 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#898383] transition hover:bg-white/5 hover:text-white"
          >
            <LibraryIcon name="report" className="h-4 w-4" />
            <span>Review results</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

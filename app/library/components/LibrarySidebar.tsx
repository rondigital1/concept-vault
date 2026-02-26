'use client';

import { useState } from 'react';
import { DocumentListItem } from './DocumentListItem';
import { CollectionSection } from './CollectionSection';
import type { DocumentListItem as DocItem } from '@/server/repos/documents.repo';
import type { CollectionRow } from '@/server/repos/collections.repo';

type Props = {
  documents: DocItem[];
  favorites: DocItem[];
  collections: CollectionRow[];
  selectedId: string | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onToggleSidebar: () => void;
};

export function LibrarySidebar({
  documents,
  favorites,
  collections,
  selectedId,
  searchQuery,
  onSearchChange,
  onToggleSidebar,
}: Props) {
  const [favoritesExpanded, setFavoritesExpanded] = useState(true);
  const [collectionsExpanded, setCollectionsExpanded] = useState(true);
  const [allDocsExpanded, setAllDocsExpanded] = useState(true);

  return (
    <aside className="w-72 border-r border-white/5 bg-zinc-950 flex flex-col overflow-hidden shrink-0">
      {/* Header */}
      <div className="p-3 border-b border-white/5 flex items-center justify-between">
        <span className="text-sm font-semibold text-zinc-300">Library</span>
        <button
          onClick={onToggleSidebar}
          className="p-1 text-zinc-500 hover:text-white rounded transition-colors"
          aria-label="Collapse sidebar"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Search */}
      <div className="p-3">
        <div className="relative">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-white/20 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-3">
        {/* Favorites */}
        {favorites.length > 0 && (
          <section>
            <button
              onClick={() => setFavoritesExpanded(!favoritesExpanded)}
              className="flex items-center gap-1 w-full px-2 py-1 text-xs font-semibold text-zinc-400 uppercase tracking-wider hover:text-zinc-300"
            >
              <svg
                className={`w-3 h-3 transition-transform ${favoritesExpanded ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <svg className="w-3 h-3 text-yellow-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              Favorites ({favorites.length})
            </button>
            {favoritesExpanded &&
              favorites.map((doc) => (
                <DocumentListItem
                  key={`fav-${doc.id}`}
                  document={doc}
                  isSelected={doc.id === selectedId}
                />
              ))}
          </section>
        )}

        {/* Collections */}
        <CollectionSection
          collections={collections}
          expanded={collectionsExpanded}
          onToggle={() => setCollectionsExpanded(!collectionsExpanded)}
        />

        {/* All Documents */}
        <section>
          <button
            onClick={() => setAllDocsExpanded(!allDocsExpanded)}
            className="flex items-center gap-1 w-full px-2 py-1 text-xs font-semibold text-zinc-400 uppercase tracking-wider hover:text-zinc-300"
          >
            <svg
              className={`w-3 h-3 transition-transform ${allDocsExpanded ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            All Documents ({documents.length})
          </button>
          {allDocsExpanded &&
            documents.map((doc) => (
              <DocumentListItem
                key={doc.id}
                document={doc}
                isSelected={doc.id === selectedId}
              />
            ))}
        </section>
      </div>
    </aside>
  );
}

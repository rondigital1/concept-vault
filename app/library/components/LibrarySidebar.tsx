'use client';

import { useState } from 'react';
import type { CollectionRow } from '@/server/repos/collections.repo';
import type { DocumentListItem as DocItem } from '@/server/repos/documents.repo';
import { CollectionSection } from './CollectionSection';
import { LibraryDocumentSection } from './LibraryDocumentSection';
import { LibrarySidebarFooter } from './LibrarySidebarFooter';
import { LibrarySidebarSearchPanel } from './LibrarySidebarSearchPanel';

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

  return (
    <div
      className={`flex h-full min-h-0 w-full flex-col bg-[#151515] px-4 py-5 ${
        mode === 'desktop' ? 'shadow-[0_30px_90px_rgba(0,0,0,0.4)]' : ''
      }`}
    >
      <LibrarySidebarSearchPanel
        documents={documents}
        searchQuery={searchQuery}
        cleanupCount={cleanupCount}
        onSearchChange={onSearchChange}
        onCollapse={onCollapse}
        onNavigate={onNavigate}
      />

      <div className="mt-6 flex-1 overflow-y-auto overscroll-contain pr-1">
        <div className="space-y-4">
          {favorites.length > 0 ? (
            <LibraryDocumentSection
              title="Favorites"
              documents={favorites}
              expanded={favoritesExpanded}
              selectedId={selectedId}
              keyPrefix="favorite"
              onToggle={() => setFavoritesExpanded((current) => !current)}
              onNavigate={onNavigate}
            />
          ) : null}

          <CollectionSection
            collections={collections}
            expanded={collectionsExpanded}
            onToggle={() => setCollectionsExpanded((current) => !current)}
            onNavigate={onNavigate}
          />

          <LibraryDocumentSection
            title="All documents"
            documents={documents}
            expanded={allDocsExpanded}
            selectedId={selectedId}
            hasSearch={hasSearch}
            keyPrefix="document"
            onToggle={() => setAllDocsExpanded((current) => !current)}
            onNavigate={onNavigate}
            onResetSearch={() => onSearchChange('')}
          />
        </div>
      </div>

      <LibrarySidebarFooter onNavigate={onNavigate} />
    </div>
  );
}

'use client';

import { useState, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { LibrarySidebar } from './LibrarySidebar';
import type { DocumentListItem } from '@/server/repos/documents.repo';
import type { CollectionRow } from '@/server/repos/collections.repo';

type Props = {
  documents: DocumentListItem[];
  collections: CollectionRow[];
  children: React.ReactNode;
};

export function LibraryShell({ documents, collections, children }: Props) {
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Extract selected document ID from /library/[id]
  const selectedId = pathname.match(/^\/library\/([0-9a-f-]+)$/)?.[1] ?? null;

  // Client-side search filtering
  const filteredDocs = useMemo(() => {
    if (!searchQuery.trim()) return documents;
    const q = searchQuery.toLowerCase();
    return documents.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }, [documents, searchQuery]);

  const favorites = useMemo(
    () => filteredDocs.filter((d) => d.is_favorite),
    [filteredDocs],
  );

  return (
    <div className="flex h-[calc(100vh-57px)]">
      {sidebarOpen && (
        <LibrarySidebar
          documents={filteredDocs}
          favorites={favorites}
          collections={collections}
          selectedId={selectedId}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onToggleSidebar={() => setSidebarOpen(false)}
        />
      )}
      <div className="flex-1 overflow-y-auto relative">
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="fixed left-2 top-[72px] z-20 p-2 bg-zinc-900 border border-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors"
            aria-label="Open sidebar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </button>
        )}
        {children}
      </div>
    </div>
  );
}

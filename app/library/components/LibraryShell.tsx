'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import type { CollectionRow } from '@/server/repos/collections.repo';
import type { DocumentListItem } from '@/server/repos/documents.repo';
import { getDocumentTitleIssue } from '../documentPresentation';
import { LibraryIcon } from './LibraryIcon';
import { LibrarySidebar } from './LibrarySidebar';

type Props = {
  documents: DocumentListItem[];
  collections: CollectionRow[];
  children: React.ReactNode;
};

const TOP_NAV_ITEMS = [
  { href: '/today', label: 'Research' },
  { href: '/agents', label: 'Agents' },
  { href: '/library', label: 'Documents' },
  { href: '/reports', label: 'Results' },
];

export function LibraryShell({ documents, collections, children }: Props) {
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const selectedId = pathname.match(/^\/library\/([0-9a-f-]+)$/)?.[1] ?? null;
  const filteredDocs = useMemo(() => {
    if (!searchQuery.trim()) {
      return documents;
    }

    const query = searchQuery.toLowerCase();
    return documents.filter(
      (document) =>
        document.title.toLowerCase().includes(query) ||
        document.tags.some((tag) => tag.toLowerCase().includes(query)),
    );
  }, [documents, searchQuery]);

  const favorites = useMemo(
    () => filteredDocs.filter((document) => document.is_favorite),
    [filteredDocs],
  );
  const cleanupCount = useMemo(
    () => documents.filter((document) => getDocumentTitleIssue(document.title)).length,
    [documents],
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#131313] text-[#ece9e8]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-12%] top-[-8%] h-[28rem] w-[28rem] rounded-full bg-white/[0.04] blur-[120px]" />
        <div className="absolute right-[-10%] top-[12%] h-[24rem] w-[24rem] rounded-full bg-white/[0.025] blur-[120px]" />
        <div className="absolute inset-x-0 top-0 h-px bg-white/[0.05]" />
      </div>

      <header className="fixed inset-x-0 top-0 z-50 h-16 bg-[rgba(19,19,19,0.58)] backdrop-blur-2xl">
        <div className="mx-auto flex h-full max-w-[1560px] items-center justify-between px-4 sm:px-6 lg:px-10">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setSidebarOpen((current) => !current)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-[#d8d2d2] transition hover:bg-white/10 hover:text-white lg:hidden"
              aria-label={sidebarOpen ? 'Close library navigation' : 'Open library navigation'}
            >
              <LibraryIcon name={sidebarOpen ? 'panel-close' : 'panel-open'} className="h-4 w-4" />
            </button>

            <Link href="/library" className="leading-none transition-opacity hover:opacity-85">
              <div className="text-[1.18rem] font-black tracking-[-0.07em] text-white sm:text-[1.3rem]">
                CONCEPT_VAULT
              </div>
              <div className="mt-1 hidden text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-[#8f8a8a] sm:block">
                Research Intelligence
              </div>
            </Link>
          </div>

          <nav className="hidden items-center gap-8 md:flex lg:gap-10">
            {TOP_NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`relative text-[1rem] font-medium tracking-[-0.035em] transition-colors lg:text-[1.08rem] ${
                    isActive ? 'text-white' : 'text-[#8f8a8a] hover:text-white'
                  }`}
                >
                  {item.label}
                  {isActive ? <span className="absolute inset-x-0 -bottom-2 h-0.5 rounded-full bg-white" /> : null}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/ingest"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-[#d8d2d2] transition hover:bg-white/10 hover:text-white"
              aria-label="Add content"
            >
              <LibraryIcon name="ingest" className="h-4 w-4" />
            </Link>
            <Link
              href="/chat"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-[#d8d2d2] transition hover:bg-white/10 hover:text-white"
              aria-label="Ask vault"
            >
              <LibraryIcon name="chat" className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {sidebarOpen ? (
        <>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 top-16 z-30 bg-black/45 backdrop-blur-[2px] lg:hidden"
            aria-label="Close library navigation"
          />
          <LibrarySidebar
            documents={filteredDocs}
            favorites={favorites}
            collections={collections}
            selectedId={selectedId}
            searchQuery={searchQuery}
            cleanupCount={cleanupCount}
            onSearchChange={setSearchQuery}
            onToggleSidebar={() => setSidebarOpen(false)}
          />
        </>
      ) : null}

      {!sidebarOpen ? (
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="fixed left-4 top-20 z-40 hidden h-11 w-11 items-center justify-center rounded-full bg-[rgba(35,35,35,0.92)] text-[#d8d2d2] shadow-[0_20px_44px_rgba(0,0,0,0.34)] transition hover:bg-[rgba(47,47,47,0.96)] hover:text-white lg:flex"
          aria-label="Open library navigation"
        >
          <LibraryIcon name="panel-open" className="h-4 w-4" />
        </button>
      ) : null}

      <div className={`relative pt-16 transition-[padding] duration-300 ${sidebarOpen ? 'lg:pl-[18rem]' : ''}`}>
        <div className="h-[calc(100vh-4rem)] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

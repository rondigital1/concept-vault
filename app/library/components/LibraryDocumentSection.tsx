'use client';

import type { DocumentListItem as DocItem } from '@/server/repos/documents.repo';
import { DocumentListItem } from './DocumentListItem';
import { LibraryIcon } from './LibraryIcon';

const SECTION_HEADING_CLASS_NAME =
  'flex w-full items-center gap-2 px-2 py-1 text-[0.64rem] font-bold uppercase tracking-[0.24em] text-[#8b8484] transition hover:text-white';

type Props = {
  title: string;
  documents: DocItem[];
  expanded: boolean;
  selectedId: string | null;
  emptyMessage?: string;
  hasSearch?: boolean;
  keyPrefix?: string;
  onToggle: () => void;
  onNavigate?: () => void;
  onResetSearch?: () => void;
};

export function LibraryDocumentSection({
  title,
  documents,
  expanded,
  selectedId,
  emptyMessage = 'No matching documents in the current index.',
  hasSearch = false,
  keyPrefix = title.toLowerCase().replace(/\s+/g, '-'),
  onToggle,
  onNavigate,
  onResetSearch,
}: Props) {
  return (
    <section>
      <button type="button" onClick={onToggle} className={SECTION_HEADING_CLASS_NAME}>
        <LibraryIcon
          name="chevron-right"
          className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-90' : ''}`}
        />
        <span>{title}</span>
        <span className="ml-auto rounded-full bg-[#232323] px-2.5 py-1 text-[0.58rem] text-[#d6d0d0]">
          {documents.length}
        </span>
      </button>
      {expanded ? (
        <div className="mt-2 space-y-1">
          {documents.length > 0 ? (
            documents.map((document) => (
              <DocumentListItem
                key={`${keyPrefix}-${document.id}`}
                document={document}
                isSelected={document.id === selectedId}
                onNavigate={onNavigate}
              />
            ))
          ) : (
            <LibraryDocumentEmptyState
              message={emptyMessage}
              hasSearch={hasSearch}
              onResetSearch={onResetSearch}
            />
          )}
        </div>
      ) : null}
    </section>
  );
}

function LibraryDocumentEmptyState({
  message,
  hasSearch,
  onResetSearch,
}: {
  message: string;
  hasSearch: boolean;
  onResetSearch?: () => void;
}) {
  return (
    <div className="rounded-[20px] bg-[#1b1b1b] px-4 py-4 text-[0.76rem] leading-6 text-[#7a7474]">
      <p>{message}</p>
      {hasSearch ? (
        <button
          type="button"
          onClick={onResetSearch}
          className="mt-3 text-[0.64rem] font-semibold uppercase tracking-[0.2em] text-[#d5cece] transition hover:text-white"
        >
          Reset search
        </button>
      ) : null}
    </div>
  );
}

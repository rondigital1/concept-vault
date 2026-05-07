'use client';

import Link from 'next/link';
import type { CollectionRow } from '@/server/repos/collections.repo';
import { LibraryIcon } from './LibraryIcon';

type Props = {
  collections: CollectionRow[];
  activeCollectionPath: string;
  onNavigate?: () => void;
  onDelete: (collection: CollectionRow) => void;
};

export function CollectionList({
  collections,
  activeCollectionPath,
  onNavigate,
  onDelete,
}: Props) {
  return (
    <div className="mt-2 space-y-1">
      {collections.map((collection) => (
        <CollectionListItem
          key={collection.id}
          collection={collection}
          isActive={activeCollectionPath === `/library/collections/${collection.id}`}
          onNavigate={onNavigate}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

function CollectionListItem({
  collection,
  isActive,
  onNavigate,
  onDelete,
}: {
  collection: CollectionRow;
  isActive: boolean;
  onNavigate?: () => void;
  onDelete: (collection: CollectionRow) => void;
}) {
  return (
    <div className="group flex items-center gap-1">
      <Link
        href={`/library/collections/${collection.id}`}
        onClick={onNavigate}
        className={`flex min-w-0 flex-1 items-center gap-3 rounded-[18px] px-3 py-3 text-[0.82rem] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 ${
          isActive
            ? 'bg-[#f0eded] text-[#171717]'
            : 'text-[#b1abab] hover:bg-[#1f1f1f] hover:text-white'
        }`}
      >
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px] ${
            isActive ? 'bg-black/6 text-[#171717]' : 'bg-[#232323] text-[#8d8787]'
          }`}
        >
          <LibraryIcon name="folder" className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium tracking-[-0.02em]">{collection.name}</div>
          <div
            className={`${isActive ? 'text-[#4d4949]' : 'text-[#726b6b]'} mt-1 text-[0.58rem] font-semibold uppercase tracking-[0.22em]`}
          >
            {collection.document_count} {collection.document_count === 1 ? 'document' : 'documents'}
          </div>
        </div>
      </Link>

      <button
        type="button"
        onClick={() => onDelete(collection)}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#726b6b] opacity-0 transition hover:bg-[rgba(255,180,171,0.08)] hover:text-[#ffb4ab] group-hover:opacity-100 group-focus-within:opacity-100"
        aria-label={`Delete ${collection.name}`}
      >
        <LibraryIcon name="close" className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

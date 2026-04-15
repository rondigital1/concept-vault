'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { usePathname } from 'next/navigation';
import type { CollectionRow } from '@/server/repos/collections.repo';
import {
  createCollectionAction,
  deleteCollectionAction,
} from '@/app/actions/collectionActions';
import { LibraryIcon } from './LibraryIcon';

type Props = {
  collections: CollectionRow[];
  expanded: boolean;
  onToggle: () => void;
};

export function CollectionSection({ collections, expanded, onToggle }: Props) {
  const pathname = usePathname();
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) {
      return;
    }

    startTransition(async () => {
      await createCollectionAction(name);
      setNewName('');
      setIsCreating(false);
    });
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleCreate();
    } else if (event.key === 'Escape') {
      setIsCreating(false);
      setNewName('');
    }
  };

  const handleDelete = (event: React.MouseEvent, id: string) => {
    event.preventDefault();
    event.stopPropagation();
    startTransition(() => {
      deleteCollectionAction(id);
    });
  };

  return (
    <section>
      <div className="flex items-center justify-between px-2 py-1">
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center gap-2 text-[0.64rem] font-bold uppercase tracking-[0.24em] text-[#8b8484] transition hover:text-white"
        >
          <LibraryIcon
            name="chevron-right"
            className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-90' : ''}`}
          />
          <span>Collections</span>
          <span className="rounded-full bg-[#232323] px-2.5 py-1 text-[0.58rem] text-[#d6d0d0]">
            {collections.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setIsCreating(true)}
          className="flex h-8 w-8 items-center justify-center rounded-full text-[#8b8484] transition hover:bg-white/5 hover:text-white"
          aria-label="Create collection"
        >
          <LibraryIcon name="plus" className="h-4 w-4" />
        </button>
      </div>

      {isCreating ? (
        <div className="mt-2 px-2">
          <input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              if (!newName.trim()) {
                setIsCreating(false);
              }
            }}
            placeholder="Collection name"
            className="h-11 w-full rounded-full bg-[#111111] px-4 text-sm text-white placeholder:text-[#676161] outline-none transition focus:bg-[#2a2a2a] focus:shadow-[0_0_0_1px_rgba(198,198,198,0.14)]"
            autoFocus
            disabled={isPending}
          />
        </div>
      ) : null}

      {expanded ? (
        <div className="mt-2 space-y-1">
          {collections.map((collection) => {
            const isActive = pathname === `/library/collections/${collection.id}`;

            return (
              <div key={collection.id} className="group flex items-center gap-1">
                <Link
                  href={`/library/collections/${collection.id}`}
                  className={`flex min-w-0 flex-1 items-center gap-3 rounded-[18px] px-3 py-3 text-[0.82rem] transition ${
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
                    <div className={`${isActive ? 'text-[#4d4949]' : 'text-[#726b6b]'} mt-1 text-[0.58rem] font-semibold uppercase tracking-[0.22em]`}>
                      {collection.document_count} {collection.document_count === 1 ? 'document' : 'documents'}
                    </div>
                  </div>
                </Link>

                <button
                  type="button"
                  onClick={(event) => handleDelete(event, collection.id)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#726b6b] opacity-0 transition hover:bg-[rgba(255,180,171,0.08)] hover:text-[#ffb4ab] group-hover:opacity-100"
                  aria-label={`Delete ${collection.name}`}
                >
                  <LibraryIcon name="close" className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

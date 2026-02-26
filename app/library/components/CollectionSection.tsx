'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  createCollectionAction,
  deleteCollectionAction,
} from '@/app/actions/collectionActions';
import type { CollectionRow } from '@/server/repos/collections.repo';

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
    if (!name) return;
    startTransition(async () => {
      await createCollectionAction(name);
      setNewName('');
      setIsCreating(false);
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCreate();
    } else if (e.key === 'Escape') {
      setIsCreating(false);
      setNewName('');
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    startTransition(() => {
      deleteCollectionAction(id);
    });
  };

  return (
    <section>
      <div className="flex items-center justify-between px-2 py-1">
        <button
          onClick={onToggle}
          className="flex items-center gap-1 text-xs font-semibold text-zinc-400 uppercase tracking-wider hover:text-zinc-300"
        >
          <svg
            className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          Collections ({collections.length})
        </button>
        <button
          onClick={() => setIsCreating(true)}
          className="text-zinc-500 hover:text-white p-0.5 rounded transition-colors"
          aria-label="New collection"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {isCreating && (
        <div className="px-2 py-1">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              if (!newName.trim()) setIsCreating(false);
            }}
            placeholder="Collection name..."
            className="w-full px-2 py-1 text-sm bg-white/5 border border-white/10 rounded text-white placeholder-zinc-500 focus:outline-none focus:border-white/20"
            autoFocus
            disabled={isPending}
          />
        </div>
      )}

      {expanded &&
        collections.map((c) => {
          const isActive = pathname === `/library/collections/${c.id}`;
          return (
            <div key={c.id} className="group flex items-center">
              <Link
                href={`/library/collections/${c.id}`}
                className={`flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                }`}
              >
                <svg className="w-4 h-4 shrink-0 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <span className="truncate flex-1 min-w-0">{c.name}</span>
                <span className="text-xs text-zinc-600 shrink-0">{c.document_count}</span>
              </Link>
              <button
                onClick={(e) => handleDelete(e, c.id)}
                className="shrink-0 p-1 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                aria-label="Delete collection"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          );
        })}
    </section>
  );
}

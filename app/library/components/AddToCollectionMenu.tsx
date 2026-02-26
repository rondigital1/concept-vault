'use client';

import { useState, useRef, useEffect, useTransition } from 'react';
import {
  addToCollectionAction,
  removeFromCollectionAction,
} from '@/app/actions/collectionActions';
import type { CollectionRow } from '@/server/repos/collections.repo';

type Props = {
  documentId: string;
  collections: CollectionRow[];
  memberCollectionIds: string[];
};

export function AddToCollectionMenu({
  documentId,
  collections,
  memberCollectionIds,
}: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const toggleMembership = (collectionId: string, isMember: boolean) => {
    startTransition(async () => {
      if (isMember) {
        await removeFromCollectionAction(collectionId, documentId);
      } else {
        await addToCollectionAction(collectionId, documentId);
      }
    });
  };

  if (collections.length === 0) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
        Collections
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-zinc-900 border border-white/10 rounded-lg shadow-xl z-50 py-1">
          <div className="px-3 py-1.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Add to collection
          </div>
          {collections.map((c) => {
            const isMember = memberCollectionIds.includes(c.id);
            return (
              <button
                key={c.id}
                onClick={() => toggleMembership(c.id, isMember)}
                disabled={isPending}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-300 hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                    isMember
                      ? 'bg-[#d97757] border-[#d97757]'
                      : 'border-zinc-600'
                  }`}
                >
                  {isMember && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="truncate">{c.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

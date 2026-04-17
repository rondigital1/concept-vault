'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { Dialog, getOverlayActionClassName } from '@/app/components/OverlaySurface';
import {
  addToCollectionAction,
  removeFromCollectionAction,
} from '@/app/actions/collectionActions';
import type { CollectionRow } from '@/server/repos/collections.repo';
import { getLibraryActionClassName } from './LibraryPrimitives';

type Props = {
  documentId: string;
  collections: CollectionRow[];
  memberCollectionIds: string[];
  buttonClassName?: string;
};

export function AddToCollectionMenu({
  documentId,
  collections,
  memberCollectionIds,
  buttonClassName,
}: Props) {
  const [open, setOpen] = useState(false);
  const [selectedCollectionIds, setSelectedCollectionIds] = useState(memberCollectionIds);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const memberKey = useMemo(
    () => [...memberCollectionIds].sort().join(':'),
    [memberCollectionIds],
  );

  useEffect(() => {
    setSelectedCollectionIds(memberCollectionIds);
  }, [memberCollectionIds, memberKey]);

  const toggleMembership = (collectionId: string, isMember: boolean) => {
    const nextSelectedIds = isMember
      ? selectedCollectionIds.filter((id) => id !== collectionId)
      : [...selectedCollectionIds, collectionId];

    setSelectedCollectionIds(nextSelectedIds);
    setError(null);

    startTransition(async () => {
      const result = isMember
        ? await removeFromCollectionAction(collectionId, documentId)
        : await addToCollectionAction(collectionId, documentId);

      if (!result.success) {
        setSelectedCollectionIds((current) =>
          isMember
            ? [...current, collectionId]
            : current.filter((id) => id !== collectionId),
        );
        setError(result.error ?? 'Failed to update collection membership.');
      }
    });
  };

  if (collections.length === 0) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={buttonClassName ?? getLibraryActionClassName('secondary')}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        Manage collections
      </button>

      <Dialog
        open={open}
        onClose={() => {
          if (!isPending) {
            setOpen(false);
            setError(null);
          }
        }}
        title="Document collections"
        description="Add or remove this document from the collections you use to group related material."
        footer={
          <button
            type="button"
            onClick={() => setOpen(false)}
            className={getOverlayActionClassName('secondary')}
            disabled={isPending}
          >
            Close
          </button>
        }
      >
        <div className="space-y-3">
          <div className="space-y-2">
            {collections.map((collection) => {
              const isMember = selectedCollectionIds.includes(collection.id);

              return (
                <button
                  key={collection.id}
                  type="button"
                  onClick={() => toggleMembership(collection.id, isMember)}
                  disabled={isPending}
                  aria-pressed={isMember}
                  className={`flex w-full items-center gap-3 rounded-[22px] px-4 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    isMember
                      ? 'bg-[#efeded] text-[#171717]'
                      : 'bg-[#111111] text-[#d7d1d1] hover:bg-[#1b1b1b] hover:text-white'
                  }`}
                >
                  <span
                    className={`inline-flex min-w-[4.75rem] justify-center rounded-full px-3 py-1 text-[0.58rem] font-bold uppercase tracking-[0.18em] ${
                      isMember
                        ? 'bg-black/6 text-[#171717]'
                        : 'bg-white/[0.05] text-[#b8b1b1]'
                    }`}
                  >
                    {isMember ? 'Included' : 'Available'}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold tracking-[-0.02em]">
                    {collection.name}
                  </span>
                  <span
                    className={`text-[0.58rem] font-semibold uppercase tracking-[0.18em] ${
                      isMember ? 'text-[#4d4949]' : 'text-[#726b6b]'
                    }`}
                  >
                    {collection.document_count} doc{collection.document_count === 1 ? '' : 's'}
                  </span>
                </button>
              );
            })}
          </div>

          {error ? <p role="alert" className="text-sm text-[#f2c7bc]">{error}</p> : null}
        </div>
      </Dialog>
    </>
  );
}

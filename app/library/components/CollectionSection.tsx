'use client';

import Link from 'next/link';
import { useId, useRef, useState, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ConfirmDialog, Dialog, getOverlayActionClassName } from '@/app/components/OverlaySurface';
import {
  createCollectionAction,
  deleteCollectionAction,
} from '@/app/actions/collectionActions';
import type { CollectionRow } from '@/server/repos/collections.repo';
import { LibraryIcon } from './LibraryIcon';

type Props = {
  collections: CollectionRow[];
  expanded: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
};

export function CollectionSection({
  collections,
  expanded,
  onToggle,
  onNavigate,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CollectionRow | null>(null);
  const [newName, setNewName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) {
      setCreateError('Enter a name before creating the collection.');
      return;
    }

    startTransition(async () => {
      const result = await createCollectionAction(name);
      if (!result.success) {
        setCreateError(result.error ?? 'Failed to create collection.');
        return;
      }

      setNewName('');
      setCreateError(null);
      setIsCreateOpen(false);
    });
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) {
      return;
    }

    startTransition(async () => {
      const target = deleteTarget;
      const result = await deleteCollectionAction(target.id);

      if (!result.success) {
        setDeleteError(result.error ?? 'Failed to delete collection.');
        return;
      }

      setDeleteError(null);
      setDeleteTarget(null);

      if (pathname === `/library/collections/${target.id}`) {
        router.push('/library');
      }
    });
  };

  return (
    <>
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
            onClick={() => {
              setCreateError(null);
              setIsCreateOpen(true);
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#8b8484] transition hover:bg-white/5 hover:text-white"
            aria-label="Create collection"
          >
            <LibraryIcon name="plus" className="h-4 w-4" />
          </button>
        </div>

        {expanded ? (
          <div className="mt-2 space-y-1">
            {collections.map((collection) => {
              const isActive = pathname === `/library/collections/${collection.id}`;

              return (
                <div key={collection.id} className="group flex items-center gap-1">
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
                      <div className={`${isActive ? 'text-[#4d4949]' : 'text-[#726b6b]'} mt-1 text-[0.58rem] font-semibold uppercase tracking-[0.22em]`}>
                        {collection.document_count} {collection.document_count === 1 ? 'document' : 'documents'}
                      </div>
                    </div>
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      setDeleteError(null);
                      setDeleteTarget(collection);
                    }}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#726b6b] opacity-0 transition hover:bg-[rgba(255,180,171,0.08)] hover:text-[#ffb4ab] group-hover:opacity-100 group-focus-within:opacity-100"
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

      <Dialog
        open={isCreateOpen}
        onClose={() => {
          if (!isPending) {
            setIsCreateOpen(false);
            setNewName('');
            setCreateError(null);
          }
        }}
        title="Create collection"
        description="Group related library documents without changing the underlying records."
        initialFocusRef={inputRef}
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                setIsCreateOpen(false);
                setNewName('');
                setCreateError(null);
              }}
              className={getOverlayActionClassName('secondary')}
              disabled={isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              form={formId}
              className={getOverlayActionClassName('primary')}
              disabled={isPending}
            >
              {isPending ? 'Working...' : 'Create collection'}
            </button>
          </>
        }
      >
        <form
          id={formId}
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            handleCreate();
          }}
        >
          <div>
            <label htmlFor="collection-name" className="mb-2 block text-sm font-medium text-zinc-200">
              Name
            </label>
            <input
              ref={inputRef}
              id="collection-name"
              value={newName}
              onChange={(event) => {
                setNewName(event.target.value);
                if (createError) {
                  setCreateError(null);
                }
              }}
              placeholder="Weekly research queue"
              className="w-full rounded-2xl border border-white/[0.08] bg-[#111111] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[#676161] focus:border-white/[0.12] focus:bg-[#1a1a1a]"
              disabled={isPending}
            />
          </div>
          {createError ? <p role="alert" className="text-sm text-[#f2c7bc]">{createError}</p> : null}
        </form>
      </Dialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => {
          if (!isPending) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
        onConfirm={handleDeleteConfirm}
        title={deleteTarget ? `Delete ${deleteTarget.name}` : 'Delete collection'}
        description="This removes the collection container only. The documents stay in the library."
        confirmLabel="Delete collection"
        confirmTone="danger"
        busy={isPending}
      >
        {deleteError ? <p role="alert" className="text-[#f2c7bc]">{deleteError}</p> : null}
      </ConfirmDialog>
    </>
  );
}

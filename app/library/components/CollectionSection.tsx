'use client';

import { usePathname } from 'next/navigation';
import type { CollectionRow } from '@/server/repos/collections.repo';
import { CollectionList } from './CollectionList';
import { CreateCollectionDialog } from './CreateCollectionDialog';
import { DeleteCollectionDialog } from './DeleteCollectionDialog';
import { LibraryIcon } from './LibraryIcon';
import { useCollectionActions } from './useCollectionActions';

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
  const collectionActions = useCollectionActions();

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
            onClick={collectionActions.openCreateDialog}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#8b8484] transition hover:bg-white/5 hover:text-white"
            aria-label="Create collection"
          >
            <LibraryIcon name="plus" className="h-4 w-4" />
          </button>
        </div>

        {expanded ? (
          <CollectionList
            collections={collections}
            activeCollectionPath={pathname}
            onNavigate={onNavigate}
            onDelete={collectionActions.openDeleteDialog}
          />
        ) : null}
      </section>

      <CreateCollectionDialog
        open={collectionActions.isCreateOpen}
        formId={collectionActions.formId}
        inputRef={collectionActions.inputRef}
        name={collectionActions.newName}
        error={collectionActions.createError}
        isPending={collectionActions.isPending}
        onClose={collectionActions.closeCreateDialog}
        onNameChange={collectionActions.handleNameChange}
        onCreate={collectionActions.handleCreate}
      />

      <DeleteCollectionDialog
        target={collectionActions.deleteTarget}
        error={collectionActions.deleteError}
        isPending={collectionActions.isPending}
        onClose={collectionActions.closeDeleteDialog}
        onConfirm={collectionActions.handleDeleteConfirm}
      />
    </>
  );
}

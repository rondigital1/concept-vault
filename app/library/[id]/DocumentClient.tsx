'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ConfirmDialog } from '@/app/components/OverlaySurface';
import {
  deleteDocumentAction,
  toggleFavoriteAction,
  updateDocumentTitleAction,
} from '@/app/actions/libraryActions';
import type { CollectionRow } from '@/server/repos/collections.repo';
import { DocumentActionRail } from './DocumentActionRail';
import { DocumentBodyPanel } from './DocumentBodyPanel';
import { DocumentDetailHero } from './DocumentDetailHero';
import type { LibraryDetailDocument } from './types';

type DocumentClientProps = {
  document: LibraryDetailDocument;
  collections: CollectionRow[];
  memberCollectionIds: string[];
};

export function DocumentClient({
  document: initialDocument,
  collections,
  memberCollectionIds,
}: DocumentClientProps) {
  const router = useRouter();
  const [document, setDocument] = useState(initialDocument);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(initialDocument.title);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSavingTitle, startTitleTransition] = useTransition();
  const [isFavPending, startFavTransition] = useTransition();
  const [isDeletePending, startDeleteTransition] = useTransition();

  const cancelTitleEdit = () => {
    setEditTitle(document.title);
    setIsEditingTitle(false);
    setErrorMessage(null);
  };

  const startTitleEdit = () => {
    setEditTitle(document.title);
    setIsEditingTitle(true);
    setErrorMessage(null);
  };

  const handleTitleSave = () => {
    const nextTitle = editTitle.trim();
    if (!nextTitle || nextTitle === document.title) {
      cancelTitleEdit();
      return;
    }

    setErrorMessage(null);
    startTitleTransition(async () => {
      const result = await updateDocumentTitleAction(document.id, nextTitle);
      if (!result.success) {
        setErrorMessage(result.error ?? 'Failed to update the title.');
        return;
      }

      setDocument((prev) => ({ ...prev, title: nextTitle }));
      setEditTitle(nextTitle);
      setIsEditingTitle(false);
    });
  };

  const handleDelete = () => {
    setErrorMessage(null);
    startDeleteTransition(async () => {
      const result = await deleteDocumentAction(document.id);
      if (!result.success) {
        setShowDeleteConfirm(false);
        setErrorMessage(result.error ?? 'Failed to delete the document.');
        return;
      }

      router.push('/library');
    });
  };

  const handleFavoriteToggle = () => {
    setErrorMessage(null);
    startFavTransition(async () => {
      const result = await toggleFavoriteAction(document.id);
      if (!result.success || result.isFavorite === undefined) {
        setErrorMessage(result.error ?? 'Failed to update the favorite state.');
        return;
      }

      setDocument((prev) => ({ ...prev, is_favorite: result.isFavorite ?? prev.is_favorite }));
    });
  };

  return (
    <>
      <main className="relative px-4 pb-16 pt-10 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-[1220px]">
          <Link
            href="/library"
            className="inline-flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.22em] text-[#8f8888] transition hover:text-white"
          >
            <span aria-hidden="true">←</span>
            Back to library
          </Link>

          <div className="mt-6 grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.2fr)_20rem]">
            <div className="min-w-0 space-y-6">
              <DocumentDetailHero
                document={document}
                editTitle={editTitle}
                errorMessage={errorMessage}
                isEditingTitle={isEditingTitle}
                isSavingTitle={isSavingTitle}
                onCancelTitleEdit={cancelTitleEdit}
                onEditTitleChange={setEditTitle}
                onSaveTitle={handleTitleSave}
                onStartTitleEdit={startTitleEdit}
              />
              <DocumentBodyPanel content={document.content} />
            </div>

            <DocumentActionRail
              collections={collections}
              document={document}
              isFavoritePending={isFavPending}
              memberCollectionIds={memberCollectionIds}
              onDeleteRequest={() => {
                setErrorMessage(null);
                setShowDeleteConfirm(true);
              }}
              onFavoriteToggle={handleFavoriteToggle}
              onStartTitleEdit={startTitleEdit}
            />
          </div>
        </div>
      </main>

      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={() => {
          if (!isDeletePending) {
            setShowDeleteConfirm(false);
          }
        }}
        onConfirm={handleDelete}
        title="Delete document"
        description="This permanently removes the document from the vault and any collection views."
        confirmLabel="Delete document"
        confirmTone="danger"
        busy={isDeletePending}
      />
    </>
  );
}

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
import {
  getDocumentTitleIssue,
  getSourceDisplay,
  inferDocumentFormatBucket,
} from '../documentPresentation';
import { DocumentBodyPanel } from './DocumentBodyPanel';
import { DocumentSidebar } from './DocumentSidebar';
import { DocumentTitlePanel } from './DocumentTitlePanel';
import type { DocumentClientProps } from './documentClientTypes';

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
  const titleIssue = getDocumentTitleIssue(document.title);
  const format = inferDocumentFormatBucket(document);
  const sourceDisplay = getSourceDisplay(document.source);

  function startTitleEdit() {
    setEditTitle(document.title);
    setIsEditingTitle(true);
    setErrorMessage(null);
  }

  function cancelTitleEdit() {
    setEditTitle(document.title);
    setIsEditingTitle(false);
    setErrorMessage(null);
  }

  function handleTitleSave() {
    const nextTitle = editTitle.trim();
    if (!nextTitle || nextTitle === document.title) {
      setEditTitle(document.title);
      setIsEditingTitle(false);
      setErrorMessage(null);
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
  }

  function handleDelete() {
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
  }

  function handleFavoriteToggle() {
    setErrorMessage(null);
    startFavTransition(async () => {
      const result = await toggleFavoriteAction(document.id);
      if (!result.success || result.isFavorite === undefined) {
        setErrorMessage(result.error ?? 'Failed to update the favorite state.');
        return;
      }

      setDocument((prev) => ({ ...prev, is_favorite: result.isFavorite ?? prev.is_favorite }));
    });
  }

  function requestDelete() {
    setErrorMessage(null);
    setShowDeleteConfirm(true);
  }

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

          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_20rem]">
            <div className="space-y-6">
              <DocumentTitlePanel
                document={document}
                format={format}
                sourceDisplay={sourceDisplay}
                titleIssue={titleIssue}
                isEditingTitle={isEditingTitle}
                editTitle={editTitle}
                errorMessage={errorMessage}
                isSavingTitle={isSavingTitle}
                onEditTitleChange={setEditTitle}
                onTitleSave={handleTitleSave}
                onTitleEditStart={startTitleEdit}
                onTitleEditCancel={cancelTitleEdit}
              />
              <DocumentBodyPanel content={document.content} />
            </div>

            <DocumentSidebar
              document={document}
              collections={collections}
              memberCollectionIds={memberCollectionIds}
              format={format}
              isFavPending={isFavPending}
              onFavoriteToggle={handleFavoriteToggle}
              onTitleEditStart={startTitleEdit}
              onDeleteRequest={requestDelete}
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

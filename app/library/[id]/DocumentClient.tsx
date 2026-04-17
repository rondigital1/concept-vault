'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ConfirmDialog } from '@/app/components/OverlaySurface';
import {
  deleteDocumentAction,
  toggleFavoriteAction,
  updateDocumentTitleAction,
} from '@/app/actions/libraryActions';
import { AddToCollectionMenu } from '@/app/library/components/AddToCollectionMenu';
import {
  getLibraryActionClassName,
  LibraryPanel,
  LibraryPill,
  LibraryTag,
} from '@/app/library/components/LibraryPrimitives';
import type { CollectionRow } from '@/server/repos/collections.repo';
import {
  DOCUMENT_FORMAT_LABELS,
  formatLibraryFullDate,
  getDocumentTitleIssue,
  getSourceDisplay,
  inferDocumentFormatBucket,
} from '../documentPresentation';

type Document = {
  id: string;
  title: string;
  source: string;
  content: string;
  tags: string[];
  is_favorite: boolean;
  imported_at: string;
};

type DocumentClientProps = {
  document: Document;
  collections: CollectionRow[];
  memberCollectionIds: string[];
};

const DocumentMarkdown = dynamic(() => import('./DocumentMarkdown'), {
  loading: () => <div className="h-4 animate-pulse rounded bg-[#232323]" />,
});

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

  const handleTitleSave = () => {
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

          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_20rem]">
            <div className="space-y-6">
              <LibraryPanel className="px-6 py-6 sm:px-8 sm:py-8">
                <div className="flex flex-wrap gap-2">
                  <LibraryPill>Document detail</LibraryPill>
                  <LibraryPill tone="muted">{DOCUMENT_FORMAT_LABELS[format]}</LibraryPill>
                  {document.is_favorite ? <LibraryPill tone="muted">Favorite</LibraryPill> : null}
                  {titleIssue ? <LibraryPill tone="danger">Needs cleanup</LibraryPill> : null}
                </div>

                <div className="mt-6 space-y-4">
                  {isEditingTitle ? (
                    <div className="space-y-4">
                      <label htmlFor="document-title" className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-[#8f8888]">
                        Rename title
                      </label>
                      <textarea
                        id="document-title"
                        value={editTitle}
                        onChange={(event) => setEditTitle(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                            event.preventDefault();
                            handleTitleSave();
                          } else if (event.key === 'Escape') {
                            setEditTitle(document.title);
                            setIsEditingTitle(false);
                            setErrorMessage(null);
                          }
                        }}
                        className="min-h-[8.5rem] w-full rounded-[24px] bg-[#101010] px-5 py-4 text-[clamp(2rem,4vw,3.4rem)] font-black leading-[0.98] tracking-[-0.07em] text-white outline-none transition focus:bg-[#151515] focus:shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
                        disabled={isSavingTitle}
                        autoFocus
                      />
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={handleTitleSave}
                          className={getLibraryActionClassName('primary')}
                          disabled={isSavingTitle}
                        >
                          {isSavingTitle ? 'Saving...' : 'Save title'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditTitle(document.title);
                            setIsEditingTitle(false);
                            setErrorMessage(null);
                          }}
                          className={getLibraryActionClassName('secondary')}
                          disabled={isSavingTitle}
                        >
                          Cancel
                        </button>
                      </div>
                      <p className="text-[0.72rem] leading-6 text-[#7d7777]">
                        Press <span className="font-semibold text-[#cfc7c7]">Cmd/Ctrl + Enter</span> to save or <span className="font-semibold text-[#cfc7c7]">Escape</span> to cancel.
                      </p>
                    </div>
                  ) : (
                    <>
                      <h1 className="text-[clamp(2.5rem,5vw,4.4rem)] font-black leading-[0.96] tracking-[-0.08em] text-white">
                        {document.title}
                      </h1>
                      <p className="max-w-3xl text-[1rem] leading-8 text-[#b7b0b0]">
                        Review the source record, rename noisy imports, and reopen the saved material without leaving the document workspace.
                      </p>
                    </>
                  )}
                </div>

                {titleIssue && !isEditingTitle ? (
                  <div className="mt-6 rounded-[24px] bg-[rgba(56,31,28,0.84)] px-5 py-5">
                    <p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-[#f2c7bc]">
                      {titleIssue.label}
                    </p>
                    <p className="mt-2 text-sm leading-7 text-[#e6cbc4]">{titleIssue.reason}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setEditTitle(document.title);
                        setIsEditingTitle(true);
                        setErrorMessage(null);
                      }}
                      className="mt-4 text-[0.7rem] font-bold uppercase tracking-[0.22em] text-white transition hover:text-[#f2c7bc]"
                    >
                      Rename now
                    </button>
                  </div>
                ) : null}

                {errorMessage ? (
                  <p role="alert" className="mt-6 rounded-[20px] bg-[rgba(56,31,28,0.72)] px-4 py-3 text-sm text-[#f2c7bc]">
                    {errorMessage}
                  </p>
                ) : null}

                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[22px] bg-[#101010] px-4 py-4">
                    <p className="text-[0.6rem] font-bold uppercase tracking-[0.22em] text-[#8b8484]">
                      Source
                    </p>
                    {document.source.startsWith('http://') || document.source.startsWith('https://') ? (
                      <a
                        href={document.source}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 block truncate text-[0.98rem] font-semibold tracking-[-0.02em] text-white underline-offset-4 transition hover:text-[#d7d1d1] hover:underline"
                      >
                        {sourceDisplay}
                      </a>
                    ) : (
                      <p className="mt-3 truncate text-[0.98rem] font-semibold tracking-[-0.02em] text-white">
                        {sourceDisplay}
                      </p>
                    )}
                  </div>
                  <div className="rounded-[22px] bg-[#101010] px-4 py-4">
                    <p className="text-[0.6rem] font-bold uppercase tracking-[0.22em] text-[#8b8484]">
                      Imported
                    </p>
                    <p className="mt-3 text-[0.98rem] font-semibold tracking-[-0.02em] text-white">
                      {formatLibraryFullDate(document.imported_at)}
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-2">
                  {(document.tags.length > 0 ? document.tags : ['untagged record']).map((tag) => (
                    <LibraryTag key={tag}>{tag}</LibraryTag>
                  ))}
                </div>
              </LibraryPanel>

              <LibraryPanel className="overflow-hidden">
                <div className="border-b border-white/[0.06] px-6 py-4 sm:px-8">
                  <p className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-[#8f8888]">
                    Document body
                  </p>
                </div>
                <div className="px-6 py-6 sm:px-8 sm:py-8">
                  <div className="max-w-none">
                    <DocumentMarkdown content={document.content} />
                  </div>
                </div>
              </LibraryPanel>
            </div>

            <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
              <LibraryPanel className="px-5 py-5">
                <p className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-[#8f8888]">
                  Actions
                </p>
                <div className="mt-4 flex flex-col gap-3">
                  <AddToCollectionMenu
                    documentId={document.id}
                    collections={collections}
                    memberCollectionIds={memberCollectionIds}
                    buttonClassName={`${getLibraryActionClassName('secondary')} w-full`}
                  />
                  <button
                    type="button"
                    onClick={handleFavoriteToggle}
                    disabled={isFavPending}
                    className={`${getLibraryActionClassName(document.is_favorite ? 'primary' : 'secondary')} w-full`}
                    aria-pressed={document.is_favorite}
                  >
                    {isFavPending ? 'Working...' : document.is_favorite ? 'Favorited' : 'Add favorite'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditTitle(document.title);
                      setIsEditingTitle(true);
                      setErrorMessage(null);
                    }}
                    className={`${getLibraryActionClassName('secondary')} w-full`}
                  >
                    Rename title
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMessage(null);
                      setShowDeleteConfirm(true);
                    }}
                    className={`${getLibraryActionClassName('danger')} w-full`}
                  >
                    Delete document
                  </button>
                </div>
              </LibraryPanel>

              <LibraryPanel className="px-5 py-5">
                <p className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-[#8f8888]">
                  Record status
                </p>
                <div className="mt-4 space-y-4 text-sm text-[#c3bbbb]">
                  <div className="rounded-[22px] bg-[#101010] px-4 py-4">
                    <p className="text-[0.58rem] font-bold uppercase tracking-[0.2em] text-[#7d7777]">
                      Format
                    </p>
                    <p className="mt-2 text-[0.95rem] font-semibold text-white">
                      {DOCUMENT_FORMAT_LABELS[format]}
                    </p>
                  </div>
                  <div className="rounded-[22px] bg-[#101010] px-4 py-4">
                    <p className="text-[0.58rem] font-bold uppercase tracking-[0.2em] text-[#7d7777]">
                      Collections
                    </p>
                    <p className="mt-2 text-[0.95rem] font-semibold text-white">
                      {memberCollectionIds.length} membership{memberCollectionIds.length === 1 ? '' : 's'}
                    </p>
                  </div>
                  <div className="rounded-[22px] bg-[#101010] px-4 py-4">
                    <p className="text-[0.58rem] font-bold uppercase tracking-[0.2em] text-[#7d7777]">
                      State
                    </p>
                    <p className="mt-2 text-[0.95rem] font-semibold text-white">
                      {document.is_favorite ? 'Pinned for quick access' : 'Available in the core library'}
                    </p>
                  </div>
                </div>
              </LibraryPanel>
            </aside>
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

'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Badge } from '@/app/components/Badge';
import { AddToCollectionMenu } from '@/app/library/components/AddToCollectionMenu';
import {
  deleteDocumentAction,
  updateDocumentTitleAction,
  toggleFavoriteAction,
} from '@/app/actions/libraryActions';
import type { CollectionRow } from '@/server/repos/collections.repo';
import {
  formatLibraryFullDate,
  getDocumentTitleIssue,
  getSourceDisplay,
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
  loading: () => <div className="h-4 animate-pulse rounded bg-zinc-800" />,
});

export function DocumentClient({
  document: initialDocument,
  collections,
  memberCollectionIds,
}: DocumentClientProps) {
  const router = useRouter();
  const [document, setDocument] = useState(initialDocument);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(document.title);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFavPending, startFavTransition] = useTransition();
  const titleIssue = getDocumentTitleIssue(document.title);

  const handleTitleSave = async () => {
    if (!editTitle.trim() || editTitle === document.title) {
      setIsEditingTitle(false);
      setEditTitle(document.title);
      return;
    }

    setIsLoading(true);
    const result = await updateDocumentTitleAction(document.id, editTitle.trim());
    setIsLoading(false);

    if (result.success) {
      setDocument((prev) => ({ ...prev, title: editTitle.trim() }));
      setIsEditingTitle(false);
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTitleSave();
    } else if (e.key === 'Escape') {
      setIsEditingTitle(false);
      setEditTitle(document.title);
    }
  };

  const handleDelete = async () => {
    setIsLoading(true);
    const result = await deleteDocumentAction(document.id);
    setIsLoading(false);

    if (result.success) {
      router.push('/library');
    }
  };

  const handleFavoriteToggle = () => {
    startFavTransition(async () => {
      const result = await toggleFavoriteAction(document.id);
      if (result.success && result.isFavorite !== undefined) {
        setDocument((prev) => ({ ...prev, is_favorite: result.isFavorite! }));
      }
    });
  };

  return (
    <div className="h-full">
              {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-950 sticky top-0 z-10">
        <div className="mx-auto max-w-4xl px-6 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href="/library"
              className="inline-flex items-center text-sm text-zinc-400 transition-colors hover:text-white"
            >
              ← Back to Library
            </Link>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <AddToCollectionMenu
                documentId={document.id}
                collections={collections}
                memberCollectionIds={memberCollectionIds}
              />
              <button
                onClick={handleFavoriteToggle}
                disabled={isFavPending}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  document.is_favorite
                    ? 'text-yellow-400 hover:bg-yellow-950'
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                }`}
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill={document.is_favorite ? 'currentColor' : 'none'}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                  />
                </svg>
                {document.is_favorite ? 'Favorited' : 'Favorite'}
              </button>
              <button
                onClick={() => setIsEditingTitle(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-800"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Rename title
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-950 hover:text-red-300"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-6 py-8">
        <article className="space-y-8">
          {/* Title */}
          <div className="space-y-4">
            {isEditingTitle ? (
              <div className="space-y-3">
                <textarea
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={handleTitleKeyDown}
                  onBlur={handleTitleSave}
                  className="w-full text-4xl font-bold text-white leading-tight bg-zinc-900 border border-zinc-800 rounded-lg p-3 resize-none focus:outline-none focus:border-zinc-700"
                  rows={2}
                  autoFocus
                />
                <p className="text-xs text-zinc-500">Press Enter to save, Escape to cancel</p>
              </div>
            ) : (
              <div className="space-y-4">
                <h1 className="text-4xl font-bold leading-tight text-white">{document.title}</h1>
                {titleIssue && (
                  <div className="rounded-2xl border border-amber-800 bg-amber-950 p-4">
                    <p className="text-sm font-semibold text-amber-100">{titleIssue.label}</p>
                    <p className="mt-1 text-sm leading-6 text-amber-100">{titleIssue.reason}</p>
                    <button
                      onClick={() => setIsEditingTitle(true)}
                      className="mt-3 inline-flex items-center rounded-lg border border-amber-700 px-3 py-1.5 text-sm font-medium text-amber-50 transition-colors hover:bg-amber-900"
                    >
                      Rename now
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-400">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                {document.source.startsWith('http://') || document.source.startsWith('https://') ? (
                  <a
                    href={document.source}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-[#d97757] transition-colors underline"
                  >
                    {getSourceDisplay(document.source)}
                  </a>
                ) : (
                  <span>{getSourceDisplay(document.source)}</span>
                )}
              </div>
              <span className="text-zinc-700">·</span>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Imported {formatLibraryFullDate(document.imported_at)}</span>
              </div>
            </div>

            {/* Tags */}
            {document.tags && document.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {document.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-zinc-800" />

          {/* Content */}
          <div className="max-w-3xl">
            <DocumentMarkdown content={document.content} />
          </div>
        </article>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-zinc-950 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-sm w-full space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-red-950 rounded-full flex items-center justify-center">
                <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Delete Document</h3>
                <p className="text-sm text-zinc-400">This action cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 bg-zinc-800 text-white font-medium rounded-lg hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

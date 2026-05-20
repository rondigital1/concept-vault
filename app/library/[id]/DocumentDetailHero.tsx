'use client';

import {
  getLibraryActionClassName,
  LibraryPanel,
  LibraryPill,
  LibraryTag,
} from '@/app/library/components/LibraryPrimitives';
import {
  DOCUMENT_FORMAT_LABELS,
  formatLibraryFullDate,
  getDocumentTitleIssue,
  getSourceDisplay,
  inferDocumentFormatBucket,
} from '../documentPresentation';
import type { LibraryDetailDocument } from './types';

type DocumentDetailHeroProps = {
  document: LibraryDetailDocument;
  editTitle: string;
  errorMessage: string | null;
  isEditingTitle: boolean;
  isSavingTitle: boolean;
  onCancelTitleEdit: () => void;
  onEditTitleChange: (title: string) => void;
  onSaveTitle: () => void;
  onStartTitleEdit: () => void;
};

export function DocumentDetailHero({
  document,
  editTitle,
  errorMessage,
  isEditingTitle,
  isSavingTitle,
  onCancelTitleEdit,
  onEditTitleChange,
  onSaveTitle,
  onStartTitleEdit,
}: DocumentDetailHeroProps) {
  const titleIssue = getDocumentTitleIssue(document.title);
  const format = inferDocumentFormatBucket(document);
  const sourceDisplay = getSourceDisplay(document.source);
  const isWebSource = document.source.startsWith('http://') || document.source.startsWith('https://');

  return (
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
              onChange={(event) => onEditTitleChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                  event.preventDefault();
                  onSaveTitle();
                } else if (event.key === 'Escape') {
                  onCancelTitleEdit();
                }
              }}
              className="min-h-[8.5rem] w-full rounded-[24px] bg-[#101010] px-5 py-4 text-[clamp(2rem,4vw,3.4rem)] font-black leading-[0.98] tracking-normal text-white outline-none transition focus:bg-[#151515] focus:shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
              disabled={isSavingTitle}
              autoFocus
            />
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onSaveTitle}
                className={getLibraryActionClassName('primary')}
                disabled={isSavingTitle}
              >
                {isSavingTitle ? 'Saving...' : 'Save title'}
              </button>
              <button
                type="button"
                onClick={onCancelTitleEdit}
                className={getLibraryActionClassName('secondary')}
                disabled={isSavingTitle}
              >
                Cancel
              </button>
            </div>
            <p className="text-[0.72rem] leading-6 text-[#7d7777]">
              Press <span className="font-semibold text-[#cfc7c7]">Cmd/Ctrl + Enter</span> to save or{' '}
              <span className="font-semibold text-[#cfc7c7]">Escape</span> to cancel.
            </p>
          </div>
        ) : (
          <>
            <h1 className="text-[clamp(2.5rem,5vw,4.4rem)] font-black leading-[0.96] tracking-normal text-white">
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
            onClick={onStartTitleEdit}
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
          {isWebSource ? (
            <a
              href={document.source}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 block truncate text-[0.98rem] font-semibold tracking-normal text-white underline-offset-4 transition hover:text-[#d7d1d1] hover:underline"
            >
              {sourceDisplay}
            </a>
          ) : (
            <p className="mt-3 truncate text-[0.98rem] font-semibold tracking-normal text-white">
              {sourceDisplay}
            </p>
          )}
        </div>
        <div className="rounded-[22px] bg-[#101010] px-4 py-4">
          <p className="text-[0.6rem] font-bold uppercase tracking-[0.22em] text-[#8b8484]">
            Imported
          </p>
          <p className="mt-3 text-[0.98rem] font-semibold tracking-normal text-white">
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
  );
}

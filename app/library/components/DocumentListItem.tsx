'use client';

import Link from 'next/link';
import { useTransition } from 'react';
import type { DocumentListItem as DocItem } from '@/server/repos/documents.repo';
import { toggleFavoriteAction } from '@/app/actions/libraryActions';
import { getDocumentTitleIssue } from '../documentPresentation';
import { LibraryIcon } from './LibraryIcon';

type Props = {
  document: DocItem;
  isSelected: boolean;
  onNavigate?: () => void;
};

export function DocumentListItem({ document, isSelected, onNavigate }: Props) {
  const [isPending, startTransition] = useTransition();
  const titleIssue = getDocumentTitleIssue(document.title);

  const handleFavoriteClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    startTransition(() => {
      toggleFavoriteAction(document.id);
    });
  };

  return (
    <div className="group flex items-center gap-1">
      <Link
        href={`/library/${document.id}`}
        onClick={onNavigate}
        className={`flex min-w-0 flex-1 items-center gap-3 rounded-[18px] px-3 py-3 text-[0.82rem] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 ${
          isSelected
            ? 'bg-[#f0eded] text-[#171717]'
            : 'text-[#b1abab] hover:bg-[#1f1f1f] hover:text-white'
        }`}
      >
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px] ${
            isSelected ? 'bg-black/6 text-[#171717]' : 'bg-[#232323] text-[#8d8787]'
          }`}
        >
          <LibraryIcon name="file" className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            {titleIssue ? (
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${isSelected ? 'bg-[#171717]' : 'bg-[#d99f90]'}`}
                title={titleIssue.label}
              />
            ) : null}
            <span className="truncate font-medium tracking-[-0.02em]">{document.title}</span>
          </div>
          <div className={`${isSelected ? 'text-[#4d4949]' : 'text-[#726b6b]'} mt-1 text-[0.58rem] font-semibold uppercase tracking-[0.22em]`}>
            {document.tags.length > 0 ? document.tags.slice(0, 2).join(' · ') : 'Vault record'}
          </div>
        </div>
      </Link>

      <button
        type="button"
        onClick={handleFavoriteClick}
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition ${
          document.is_favorite
            ? isSelected
              ? 'text-[#171717]'
              : 'text-[#e7d87a]'
            : isSelected
              ? 'text-[#4d4949] hover:bg-black/6'
              : 'text-[#726b6b] opacity-0 hover:bg-white/5 hover:text-white group-hover:opacity-100 group-focus-within:opacity-100'
        } ${isPending ? 'opacity-60' : ''}`}
        disabled={isPending}
        aria-label={document.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
        aria-pressed={document.is_favorite}
      >
        <LibraryIcon
          name="star"
          className="h-4 w-4"
          filled={document.is_favorite}
        />
      </button>
    </div>
  );
}

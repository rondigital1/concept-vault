'use client';

import Link from 'next/link';
import { useTransition } from 'react';
import { toggleFavoriteAction } from '@/app/actions/libraryActions';
import type { DocumentListItem as DocItem } from '@/server/repos/documents.repo';

type Props = {
  document: DocItem;
  isSelected: boolean;
};

export function DocumentListItem({ document, isSelected }: Props) {
  const [isPending, startTransition] = useTransition();

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    startTransition(() => {
      toggleFavoriteAction(document.id);
    });
  };

  return (
    <Link
      href={`/library/${document.id}`}
      className={`group flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
        isSelected
          ? 'bg-white/10 text-white'
          : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
      }`}
    >
      {/* Unread dot indicator */}
      <div className="w-1.5 shrink-0">
        {!document.is_read && (
          <div className="w-1.5 h-1.5 rounded-full bg-[#d97757]" />
        )}
      </div>
      <svg
        className="w-4 h-4 shrink-0 text-zinc-600"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      <span className={`truncate flex-1 min-w-0 ${!document.is_read ? 'font-medium text-zinc-200' : ''}`}>
        {document.title}
      </span>
      <button
        onClick={handleFavoriteClick}
        className={`shrink-0 p-0.5 transition-all ${
          document.is_favorite
            ? 'text-yellow-400'
            : 'text-zinc-600 opacity-0 group-hover:opacity-100'
        } ${isPending ? 'opacity-50' : ''}`}
        disabled={isPending}
        aria-label={document.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill={document.is_favorite ? 'currentColor' : 'none'} stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
          />
        </svg>
      </button>
    </Link>
  );
}

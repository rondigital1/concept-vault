import Link from 'next/link';
import type { LibraryDocumentRow } from '@/server/services/document.service';
import {
  formatLibraryRelativeDate,
  getSourceDisplay,
  inferDocumentFormatBucket,
} from '../documentPresentation';
import { getLibraryFormatIconName } from './libraryFormatIcon';
import { LibraryIcon } from './LibraryIcon';

type Props = {
  documentsNeedingCleanup: LibraryDocumentRow[];
  favorites: LibraryDocumentRow[];
};

function SignalLane({
  id,
  title,
  description,
  documents,
  emptyMessage,
}: {
  id: string;
  title: string;
  description: string;
  documents: LibraryDocumentRow[];
  emptyMessage: string;
}) {
  return (
    <section id={id} className="rounded-[28px] bg-[#1b1b1b] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.24)] sm:p-8">
      <p className="text-[0.66rem] font-bold uppercase tracking-[0.26em] text-[#8d8787]">{title}</p>
      <p className="mt-3 max-w-2xl text-[0.96rem] leading-7 text-[#c0b8b8]">{description}</p>

      {documents.length > 0 ? (
        <div className="mt-6 space-y-3">
          {documents.map((document) => {
            const format = inferDocumentFormatBucket(document);

            return (
              <Link
                key={document.id}
                href={`/library/${document.id}`}
                className="flex items-center gap-4 rounded-[22px] bg-[#101010] px-4 py-4 transition hover:bg-[#151515]"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#232323] text-[#d0cccc]">
                  <LibraryIcon name={getLibraryFormatIconName(format)} className="h-[1.125rem] w-[1.125rem]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[1rem] font-semibold tracking-[-0.03em] text-white">
                    {document.title}
                  </div>
                  <div className="mt-1 text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-[#7d7777]">
                    {getSourceDisplay(document.source)} · {formatLibraryRelativeDate(document.imported_at)}
                  </div>
                </div>
                <LibraryIcon name="arrow-up-right" className="h-4 w-4 shrink-0 text-[#7d7777]" />
              </Link>
            );
          })}
        </div>
      ) : (
        <p className="mt-6 text-[0.95rem] leading-7 text-[#8f8888]">{emptyMessage}</p>
      )}
    </section>
  );
}

export function LibrarySignalLanes({ documentsNeedingCleanup, favorites }: Props) {
  if (documentsNeedingCleanup.length === 0 && favorites.length === 0) {
    return null;
  }

  return (
    <section className="mt-12 grid gap-6 xl:grid-cols-2">
      <SignalLane
        id="needs-cleanup"
        title="Cleanup queue"
        description="Imported titles that leaked metadata, pasted URLs, or otherwise need manual naming before they are easy to scan."
        documents={documentsNeedingCleanup.slice(0, 4)}
        emptyMessage="No cleanup queue is active. New imports are landing with readable titles."
      />
      <SignalLane
        id="favorites"
        title="Favorite nodes"
        description="The documents you return to frequently stay surfaced here for quick access back into the archive."
        documents={favorites.slice(0, 4)}
        emptyMessage="Favorite a document from the detail view to pin it here."
      />
    </section>
  );
}

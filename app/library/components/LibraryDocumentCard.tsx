import Link from 'next/link';
import {
  buildDocumentPreview,
  DOCUMENT_FORMAT_LABELS,
  formatLibraryRelativeDate,
  getDocumentTitleIssue,
  getSourceDisplay,
  inferDocumentFormatBucket,
} from '../documentPresentation';
import { LibraryIcon } from './LibraryIcon';
import { LibraryTag } from './LibraryPrimitives';

type LibraryDocumentCardDocument = {
  id: string;
  title: string;
  source: string;
  content: string;
  tags: string[];
  is_favorite: boolean;
  imported_at: string;
};

function getFormatIconName(document: LibraryDocumentCardDocument) {
  const format = inferDocumentFormatBucket(document);

  switch (format) {
    case 'pdf':
      return 'pdf';
    case 'web':
      return 'link';
    default:
      return 'file';
  }
}

export function LibraryDocumentCard({
  document,
}: {
  document: LibraryDocumentCardDocument;
}) {
  const format = inferDocumentFormatBucket(document);
  const titleIssue = getDocumentTitleIssue(document.title);
  const preview = buildDocumentPreview(document.content);

  return (
    <Link
      href={`/library/${document.id}`}
      className="group flex h-full min-h-[18rem] flex-col rounded-[24px] bg-[#101010] p-5 transition duration-300 hover:bg-[#171717] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-[16px] bg-[#242424] text-[#d0cccc]">
          <LibraryIcon name={getFormatIconName(document)} className="h-5 w-5" />
        </div>
        <div className="text-[#d7d1d1]">
          {document.is_favorite ? (
            <LibraryIcon name="star" className="h-4 w-4" filled />
          ) : (
            <LibraryIcon name="star" className="h-4 w-4 text-[#5f5959] transition group-hover:text-[#bcb4b4]" />
          )}
        </div>
      </div>

      <div className="mt-6 flex-1">
        {titleIssue ? (
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[rgba(255,180,171,0.08)] px-3 py-1 text-[0.58rem] font-bold uppercase tracking-[0.2em] text-[#f0c0b5]">
            <LibraryIcon name="warning" className="h-3.5 w-3.5" />
            Cleanup
          </div>
        ) : null}

        <h2 className="line-clamp-3 text-[1.18rem] font-bold tracking-[-0.05em] text-white">
          {document.title}
        </h2>

        <p className="mt-4 line-clamp-4 text-[0.92rem] leading-7 text-[#beb7b7]">
          {preview}
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {(document.tags.length > 0 ? document.tags.slice(0, 3) : ['source archive']).map((tag) => (
          <LibraryTag key={tag}>{tag}</LibraryTag>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between gap-3 text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-[#797373]">
        <div className="min-w-0">
          <div className="truncate">{getSourceDisplay(document.source)}</div>
          <div className="mt-1">{formatLibraryRelativeDate(document.imported_at)}</div>
        </div>
        <div className="text-right">
          <div>{DOCUMENT_FORMAT_LABELS[format]}</div>
          <LibraryIcon name="arrow-up-right" className="ml-auto mt-1 h-4 w-4 opacity-0 transition group-hover:opacity-100" />
        </div>
      </div>
    </Link>
  );
}

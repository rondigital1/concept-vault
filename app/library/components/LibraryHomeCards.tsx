import Link from 'next/link';
import type { ReactNode } from 'react';
import type { LibraryDocumentRow } from '@/server/services/document.service';
import {
  buildDocumentPreview,
  DOCUMENT_FORMAT_LABELS,
  formatLibraryFullDate,
  formatLibraryRelativeDate,
  getDocumentOriginLabel,
  getDocumentTitleIssue,
  getSourceDisplay,
  inferDocumentFormatBucket,
  type DocumentFormatBucket,
} from '../documentPresentation';
import { LibraryIcon } from './LibraryIcon';

function getFormatIcon(format: DocumentFormatBucket) {
  switch (format) {
    case 'pdf':
      return 'pdf';
    case 'web':
      return 'link';
    default:
      return 'file';
  }
}

export function StatCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-[28px] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.24)] sm:p-8 ${className ?? 'bg-[#1f1f1f]'}`}
    >
      {children}
    </div>
  );
}

export function DocumentTile({ document }: { document: LibraryDocumentRow }) {
  const format = inferDocumentFormatBucket(document);
  const titleIssue = getDocumentTitleIssue(document.title);

  return (
    <Link
      href={`/library/${document.id}`}
      className="group flex min-h-[18.5rem] flex-col rounded-[24px] bg-[#0f0f0f] p-5 transition duration-500 hover:bg-[#171717]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-[16px] bg-[#242424] text-[#d0cccc]">
          <LibraryIcon name={getFormatIcon(format)} className="h-5 w-5" />
        </div>
        <div className="text-[#d7d1d1]">
          {document.is_favorite ? (
            <LibraryIcon name="star" className="h-4 w-4" filled />
          ) : (
            <LibraryIcon name="star" className="h-4 w-4 text-[#5f5959] transition group-hover:text-[#bcb4b4]" />
          )}
        </div>
      </div>

      <div className="mt-8 flex-1">
        {titleIssue ? (
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[rgba(255,180,171,0.08)] px-3 py-1 text-[0.58rem] font-bold uppercase tracking-[0.2em] text-[#f0c0b5]">
            <LibraryIcon name="warning" className="h-3.5 w-3.5" />
            Cleanup
          </div>
        ) : null}
        <h2 className="line-clamp-3 text-[1.32rem] font-bold tracking-normal text-white">
          {document.title}
        </h2>
        <p className="mt-3 text-[0.66rem] font-semibold uppercase tracking-[0.22em] text-[#797373]">
          Uploaded {formatLibraryRelativeDate(document.imported_at)}
        </p>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3 text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-[#797373]">
        <span>{DOCUMENT_FORMAT_LABELS[format]}</span>
        <LibraryIcon name="arrow-up-right" className="h-4 w-4 opacity-0 transition group-hover:opacity-100" />
      </div>
    </Link>
  );
}

export function FeaturedDocumentTile({ document }: { document: LibraryDocumentRow }) {
  const format = inferDocumentFormatBucket(document);
  const titleIssue = getDocumentTitleIssue(document.title);
  const preview = buildDocumentPreview(document.content);

  return (
    <article className="relative overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,rgba(60,60,60,0.95),rgba(38,38,38,0.95)_56%,rgba(23,23,23,0.98))] px-6 py-6 shadow-[0_24px_80px_rgba(0,0,0,0.34)] sm:px-8 sm:py-7 md:col-span-2 xl:col-span-2">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -right-8 -top-10 h-48 w-48 rounded-full bg-white/[0.06] blur-3xl" />
        <div className="absolute inset-y-0 right-0 w-1/2 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),transparent)]" />
      </div>

      <div className="relative">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[#111111]/80 px-3 py-1.5 text-[0.58rem] font-bold uppercase tracking-[0.22em] text-white">
            Primary Asset
          </span>
          <span className="rounded-full bg-[#111111]/60 px-3 py-1.5 text-[0.58rem] font-bold uppercase tracking-[0.22em] text-[#bcb4b4]">
            {DOCUMENT_FORMAT_LABELS[format]}
          </span>
          {titleIssue ? (
            <span className="rounded-full bg-[rgba(255,180,171,0.1)] px-3 py-1.5 text-[0.58rem] font-bold uppercase tracking-[0.22em] text-[#f0c0b5]">
              Cleanup Queue
            </span>
          ) : null}
        </div>

        <h2 className="mt-6 max-w-4xl text-[clamp(2rem,3.6vw,3.2rem)] font-black leading-[1.02] tracking-normal text-white">
          {document.title}
        </h2>

        <p className="mt-5 max-w-2xl text-[1rem] leading-8 text-[#ddd7d5]">{preview}</p>

        <div className="mt-6 flex flex-wrap gap-2">
          {document.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="rounded-full bg-[#151515] px-3 py-1.5 text-[0.68rem] font-semibold text-[#d2cbcb]">
              {tag}
            </span>
          ))}
          {document.tags.length === 0 ? (
            <span className="rounded-full bg-[#151515] px-3 py-1.5 text-[0.68rem] font-semibold text-[#d2cbcb]">
              source archive
            </span>
          ) : null}
        </div>

        <div className="mt-8 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-4 text-[0.64rem] font-semibold uppercase tracking-[0.2em] text-[#a7a0a0]">
            <span>{formatLibraryFullDate(document.imported_at)}</span>
            <span>{getDocumentOriginLabel(document.is_webscout_discovered)}</span>
            <span>{getSourceDisplay(document.source)}</span>
          </div>

          <Link
            href={`/library/${document.id}`}
            className="inline-flex items-center justify-center rounded-full bg-[#efeded] px-5 py-3 text-[0.68rem] font-bold uppercase tracking-[0.26em] text-[#171717] transition hover:bg-white"
          >
            Open document
          </Link>
        </div>
      </div>
    </article>
  );
}

import Link from 'next/link';
import { getDocumentTitleIssue } from '@/app/library/documentPresentation';
import { monoLabelClass } from '../constants';
import {
  formatDocumentMeta,
  getDocumentIconName,
  getSourceDisplay,
} from '../ingestPresentation';
import type { IngestWorkspaceDocument } from '../types';
import { IngestIcon } from './IngestIcon';

export function RecentImportsSection({
  recentDocuments,
}: {
  recentDocuments: IngestWorkspaceDocument[];
}) {
  return (
    <section className="mt-16">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-[2.2rem] font-black tracking-[-0.06em] text-white sm:text-[2.8rem]">
            Recent imports
          </h2>
          <p className="mt-2 text-sm leading-7 text-[#a79f9f]">
            The latest documents already available in the library.
          </p>
        </div>
        <Link
          href="/library"
          className="inline-flex items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.03] px-4 py-2 text-[0.72rem] font-bold uppercase tracking-[0.24em] text-[#ddd7d7] transition hover:bg-white/[0.08] hover:text-white"
        >
          Open Library
        </Link>
      </div>

      {recentDocuments.length > 0 ? (
        <div className="space-y-3">
          {recentDocuments.map((document) => (
            <RecentDocumentRow key={document.id} document={document} />
          ))}
        </div>
      ) : (
        <div className="rounded-[1.5rem] bg-[#101010] px-6 py-10 text-center">
          <p className={monoLabelClass}>Recent imports</p>
          <h3 className="mt-4 text-2xl font-bold tracking-[-0.04em] text-white">No content has been added yet.</h3>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[#a79f9f]">
            Use one of the intake modes above to add your first source. Imported content will appear here as soon as extraction completes.
          </p>
        </div>
      )}

      <div className="mt-12 flex justify-center">
        <Link
          href="/library"
          className="inline-flex items-center gap-2 text-[0.78rem] font-bold uppercase tracking-[0.24em] text-[#b9b0b0] transition hover:text-white"
        >
          View all library documents
          <span aria-hidden="true">⌄</span>
        </Link>
      </div>
    </section>
  );
}

function RecentDocumentRow({
  document,
}: {
  document: IngestWorkspaceDocument;
}) {
  const titleIssue = getDocumentTitleIssue(document.title);
  const status = titleIssue
    ? {
        icon: 'warning' as const,
        label: 'Needs cleanup',
        className: 'text-[#ffb4ab]',
      }
    : {
        icon: 'check' as const,
        label: document.is_webscout_discovered ? 'Research import' : 'Indexed',
        className: 'text-[#d9d9d9]',
      };

  return (
    <Link
      href={`/library/${document.id}`}
      className="group flex items-center justify-between gap-4 rounded-[1.15rem] bg-[#101010] px-5 py-5 transition duration-300 hover:bg-[#171717]"
    >
      <div className="flex min-w-0 items-center gap-5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[0.6rem] bg-[#2a2a2a] text-[#bdb7b7]">
          <IngestIcon name={getDocumentIconName(document.source)} />
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-[1.05rem] font-bold tracking-[-0.03em] text-white transition-colors group-hover:text-[#d4d0d0]">
            {document.title}
          </h3>
          <p className="mt-1 truncate text-[0.72rem] uppercase tracking-[0.22em] text-[#8f8787]">
            {formatDocumentMeta(document)}
          </p>
          <p className="mt-1 truncate text-sm text-[#777070]">{getSourceDisplay(document.source)}</p>
        </div>
      </div>
      <div className={`hidden shrink-0 items-center gap-2 text-[0.74rem] font-bold uppercase tracking-[0.22em] ${status.className} md:flex`}>
        <IngestIcon name={status.icon} />
        <span>{status.label}</span>
      </div>
    </Link>
  );
}

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireSessionWorkspace } from '@/server/auth/workspaceContext';
import { getCollection } from '@/server/repos/collections.repo';
import { getDocument } from '@/server/services/document.service';
import { LibraryDocumentCard } from '../../components/LibraryDocumentCard';
import {
  getLibraryActionClassName,
  LibraryEmptyState,
  LibraryPanel,
  LibraryPill,
} from '../../components/LibraryPrimitives';
import {
  formatLibraryFullDate,
  getDocumentTitleIssue,
} from '../../documentPresentation';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function CollectionPage(props: PageProps) {
  const scope = await requireSessionWorkspace();
  const params = await props.params;
  const collection = await getCollection(scope, params.id);

  if (!collection) {
    notFound();
  }

  const documents = await Promise.all(
    collection.document_ids.map((docId) => getDocument(scope, docId)),
  );
  const validDocs = documents.filter((doc): doc is NonNullable<typeof doc> => Boolean(doc));
  const favoriteCount = validDocs.filter((doc) => doc.is_favorite).length;
  const cleanupCount = validDocs.filter((doc) => getDocumentTitleIssue(doc.title)).length;
  const latestImport = validDocs[0]?.imported_at ?? null;

  return (
    <main className="relative px-4 pb-16 pt-10 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-[1220px]">
        <Link
          href="/library"
          className="inline-flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.22em] text-[#8f8888] transition hover:text-white"
        >
          <span aria-hidden="true">←</span>
          Back to library
        </Link>

        <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_0.85fr]">
          <LibraryPanel className="px-6 py-6 sm:px-8 sm:py-8">
            <div className="flex flex-wrap gap-2">
              <LibraryPill>Collection detail</LibraryPill>
              <LibraryPill tone="muted">
                {validDocs.length} document{validDocs.length === 1 ? '' : 's'}
              </LibraryPill>
              {cleanupCount > 0 ? <LibraryPill tone="danger">{cleanupCount} need cleanup</LibraryPill> : null}
            </div>

            <h1 className="mt-6 text-[clamp(2.5rem,5vw,4.2rem)] font-black leading-[0.96] tracking-[-0.08em] text-white">
              {collection.name}
            </h1>

            <p className="mt-4 max-w-3xl text-[1rem] leading-8 text-[#b7b0b0]">
              {collection.description?.trim() || 'A curated grouping of library documents that should stay easy to reopen, review, and clean up together.'}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/library" className={getLibraryActionClassName('secondary')}>
                Browse library
              </Link>
              <Link href="/ingest" className={getLibraryActionClassName('primary')}>
                Add content
              </Link>
            </div>
          </LibraryPanel>

          <LibraryPanel className="px-6 py-6">
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-[#8f8888]">
              Collection status
            </p>
            <div className="mt-5 grid gap-4">
              <div className="rounded-[22px] bg-[#101010] px-4 py-4">
                <p className="text-[0.58rem] font-bold uppercase tracking-[0.2em] text-[#7d7777]">
                  Saved records
                </p>
                <p className="mt-2 text-[1.9rem] font-black tracking-[-0.05em] text-white">
                  {validDocs.length}
                </p>
              </div>
              <div className="rounded-[22px] bg-[#101010] px-4 py-4">
                <p className="text-[0.58rem] font-bold uppercase tracking-[0.2em] text-[#7d7777]">
                  Favorites
                </p>
                <p className="mt-2 text-[1.9rem] font-black tracking-[-0.05em] text-white">
                  {favoriteCount}
                </p>
              </div>
              <div className="rounded-[22px] bg-[#101010] px-4 py-4">
                <p className="text-[0.58rem] font-bold uppercase tracking-[0.2em] text-[#7d7777]">
                  Latest import
                </p>
                <p className="mt-2 text-[0.95rem] font-semibold leading-7 text-white">
                  {latestImport ? formatLibraryFullDate(latestImport) : 'No documents yet'}
                </p>
              </div>
            </div>
          </LibraryPanel>
        </section>

        <div className="mt-10">
          {validDocs.length === 0 ? (
            <LibraryEmptyState
              title="This collection is still empty."
              description="Add documents from any library detail page and they will appear here without changing the underlying source record."
              actions={
                <Link href="/library" className={getLibraryActionClassName('secondary')}>
                  Browse library
                </Link>
              }
            />
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {validDocs.map((doc) => (
                <LibraryDocumentCard key={doc.id} document={doc} />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

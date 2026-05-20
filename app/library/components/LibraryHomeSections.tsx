import Link from 'next/link';
import type { LibraryDocumentRow } from '@/server/services/document.service';
import {
  DOCUMENT_FORMAT_LABELS,
  formatLibraryRelativeDate,
  getSourceDisplay,
  inferDocumentFormatBucket,
  type DocumentFormatBucket,
} from '../documentPresentation';
import type { LibraryHomeViewModel } from '../libraryHomeViewModel';
import { DocumentTile, FeaturedDocumentTile, StatCard } from './LibraryHomeCards';
import { LibraryIcon } from './LibraryIcon';

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
    <section id={id} className="min-w-0 max-w-full overflow-hidden rounded-[28px] bg-[#1b1b1b] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.24)] sm:p-8">
      <p className="text-[0.66rem] font-bold uppercase tracking-[0.26em] text-[#8d8787]">{title}</p>
      <p className="mt-3 max-w-2xl text-[0.96rem] leading-7 text-[#c0b8b8]">{description}</p>

      {documents.length > 0 ? (
        <div className="mt-6 space-y-3">
          {documents.map((document) => {
            const format = inferDocumentFormatBucket(document);
            const iconName = format === 'pdf' ? 'pdf' : format === 'web' ? 'link' : 'file';

            return (
              <Link
                key={document.id}
                href={`/library/${document.id}`}
                className="flex min-w-0 max-w-full items-center gap-4 overflow-hidden rounded-[22px] bg-[#101010] px-4 py-4 transition hover:bg-[#151515]"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#232323] text-[#d0cccc]">
                  <LibraryIcon name={iconName} className="h-[1.125rem] w-[1.125rem]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[1rem] font-semibold tracking-normal text-white">
                    {document.title}
                  </div>
                  <div className="mt-1 truncate text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-[#7d7777] sm:tracking-[0.2em]">
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

export function EmptyLibraryState() {
  return (
    <section className="rounded-[32px] bg-[#191919] px-6 py-10 shadow-[0_24px_80px_rgba(0,0,0,0.32)] sm:px-10 sm:py-12">
      <div className="mb-4 flex items-center gap-3 text-[0.68rem] font-bold uppercase tracking-[0.26em] text-[#8f8888]">
        <span className="rounded-full bg-[#232323] px-3 py-1.5 text-[#ddd8d8]">Library setup</span>
        <span>Awaiting first source</span>
      </div>
      <h1 className="max-w-4xl text-[clamp(2.4rem,5vw,4.6rem)] font-black leading-[0.96] tracking-normal text-white">
        The library is still empty.
      </h1>
      <p className="mt-6 max-w-2xl text-[1.08rem] leading-8 text-[#b7b0b0]">
        Add content from the ingest flow or save approved research imports to populate the document repository.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/ingest" className="inline-flex items-center justify-center rounded-full bg-[#efeded] px-5 py-3 text-[0.7rem] font-bold uppercase tracking-[0.28em] text-[#171717] transition hover:bg-white">
          Add content
        </Link>
        <Link href="/today" className="inline-flex items-center justify-center rounded-full bg-[#232323] px-5 py-3 text-[0.7rem] font-bold uppercase tracking-[0.28em] text-[#ddd7d7] transition hover:bg-[#2c2c2c] hover:text-white">
          Open Research
        </Link>
      </div>
    </section>
  );
}

function FormatDistributionCard({ viewModel }: { viewModel: LibraryHomeViewModel }) {
  return (
    <StatCard className="bg-[#1b1b1b]">
      <p className="text-[0.64rem] font-bold uppercase tracking-[0.28em] text-[#a39d9d]">
        Format distribution
      </p>
      <div className="mt-6 space-y-5">
        {(Object.entries(DOCUMENT_FORMAT_LABELS) as Array<[DocumentFormatBucket, string]>).map(([bucket, label]) => {
          const count = viewModel.formatCounts[bucket];
          const percent =
            viewModel.documents.length > 0
              ? Math.max((count / viewModel.documents.length) * 100, count > 0 ? 8 : 0)
              : 0;

          return (
            <div key={bucket}>
              <div className="flex items-center justify-between text-[0.76rem]">
                <span className="text-[#cfc7c7]">{label}</span>
                <span className="font-bold text-white">{count}</span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-[#353535]">
                <div
                  className={`h-full rounded-full ${bucket === 'pdf' ? 'bg-[#d7d1d1]' : bucket === 'web' ? 'bg-[#848080]' : 'bg-[#5d5858]'}`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </StatCard>
  );
}

export function LibraryHomeDashboard({ viewModel }: { viewModel: LibraryHomeViewModel }) {
  const { documents, documentsNeedingCleanup, favorites, researchDocuments } = viewModel;

  return (
    <>
      <section className="grid gap-6 xl:grid-cols-[1.15fr_1fr_0.9fr]">
        <StatCard className="bg-[#2a2a2a]">
          <div className="relative z-10">
            <p className="text-[0.64rem] font-bold uppercase tracking-[0.28em] text-[#a39d9d]">
              Total intelligence assets
            </p>
            <h1 className="mt-4 text-[clamp(3.4rem,7vw,5.1rem)] font-black leading-none tracking-normal text-white">
              {documents.length}
            </h1>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                ['Favorites', favorites.length],
                ['Cleanup', documentsNeedingCleanup.length],
                ['Research', researchDocuments.length],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[18px] bg-black/20 px-4 py-4">
                  <div className="text-[0.6rem] font-bold uppercase tracking-[0.22em] text-[#bcb5b5]">{label}</div>
                  <div className="mt-2 text-[1.4rem] font-bold tracking-normal text-white">{value}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="pointer-events-none absolute -bottom-6 right-0 text-white/[0.06]">
            <LibraryIcon name="grid" className="h-36 w-36" />
          </div>
        </StatCard>

        <FormatDistributionCard viewModel={viewModel} />

        <StatCard className="bg-[#1b1b1b]">
          <p className="text-[0.64rem] font-bold uppercase tracking-[0.28em] text-[#a39d9d]">
            Node clusters
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {viewModel.topClusters.map((cluster) => (
              <span key={cluster.label} className="rounded-[8px] bg-[#2a2a2a] px-3 py-2 text-[0.6rem] font-bold uppercase tracking-[0.16em] text-white">
                {cluster.label} ({cluster.count})
              </span>
            ))}
          </div>
          <div className="mt-10 flex items-center gap-3 text-[0.64rem] font-semibold uppercase tracking-[0.22em] text-[#7b7575]">
            <span className="flex h-2.5 w-2.5 rounded-full bg-[#d5cfcf] animate-status-pulse" />
            <span>Core synchronized</span>
          </div>
        </StatCard>
      </section>

      <section className="mt-12">
        <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.26em] text-[#8f8888]">
              Vault workspace
            </p>
            <h2 className="mt-3 text-[clamp(2.4rem,4vw,3.45rem)] font-black leading-[0.96] tracking-normal text-white">
              Repository vault
            </h2>
            <p className="mt-4 max-w-3xl text-[1rem] leading-8 text-[#b7b0b0]">
              Search saved material, clean up noisy imports, and reopen the documents that matter most inside the working memory layer.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {documentsNeedingCleanup.length > 0 ? (
              <Link href="#needs-cleanup" className="inline-flex items-center gap-2 rounded-[16px] bg-[#2a2a2a] px-4 py-3 text-[0.64rem] font-bold uppercase tracking-[0.22em] text-[#dfd8d8] transition hover:bg-[#343434]">
                <LibraryIcon name="warning" className="h-3.5 w-3.5" />
                Cleanup
              </Link>
            ) : null}
            {favorites.length > 0 ? (
              <Link href="#favorites" className="inline-flex items-center gap-2 rounded-[16px] bg-[#2a2a2a] px-4 py-3 text-[0.64rem] font-bold uppercase tracking-[0.22em] text-[#dfd8d8] transition hover:bg-[#343434]">
                <LibraryIcon name="star" className="h-3.5 w-3.5" filled />
                Favorites
              </Link>
            ) : null}
            <Link href="/ingest" className="inline-flex items-center gap-2 rounded-[16px] bg-[#efeded] px-4 py-3 text-[0.64rem] font-bold uppercase tracking-[0.22em] text-[#171717] transition hover:bg-white">
              <LibraryIcon name="plus" className="h-3.5 w-3.5" />
              Add content
            </Link>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {viewModel.repositoryDocuments.map((document) => (
            <DocumentTile key={document.id} document={document} />
          ))}
          {viewModel.featuredDocument ? <FeaturedDocumentTile document={viewModel.featuredDocument} /> : null}
        </div>
      </section>

      {documentsNeedingCleanup.length > 0 || favorites.length > 0 ? (
        <section className="mt-12 grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-2">
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
      ) : null}

      <footer className="mt-12 rounded-[24px] bg-[#171717] px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 text-[0.64rem] font-semibold uppercase tracking-[0.22em] text-[#7d7676] lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-5">
            <span>Memory status: Optimal</span>
            <span>Favorites: {favorites.length}</span>
            <span>Cleanup queue: {documentsNeedingCleanup.length}</span>
            <span>Research imports: {researchDocuments.length}</span>
          </div>
          <div className="flex flex-wrap gap-5">
            <Link href="/today" className="transition hover:text-white">Research</Link>
            <Link href="/reports" className="transition hover:text-white">Reports</Link>
            <Link href="/ingest" className="transition hover:text-white">Add Content</Link>
          </div>
        </div>
      </footer>
    </>
  );
}

import Link from 'next/link';
import { requireSessionWorkspace } from '@/server/auth/workspaceContext';
import { getAllDocumentsForLibrary, type LibraryDocumentRow } from '@/server/services/document.service';
import { LibraryIcon } from './components/LibraryIcon';
import {
  formatLibraryFullDate,
  formatLibraryRelativeDate,
  getDocumentOriginLabel,
  getDocumentTitleIssue,
  getSourceDisplay,
} from './documentPresentation';

type FormatBucket = 'pdf' | 'text' | 'web';

const FORMAT_LABELS: Record<FormatBucket, string> = {
  pdf: 'PDF Document',
  text: 'Text Note',
  web: 'Web Archive',
};

function inferFormatBucket(document: LibraryDocumentRow): FormatBucket {
  const source = document.source.toLowerCase();
  const title = document.title.toLowerCase();

  if (source.endsWith('.pdf') || title.endsWith('.pdf')) {
    return 'pdf';
  }

  if (source.startsWith('http://') || source.startsWith('https://')) {
    return 'web';
  }

  return 'text';
}

function buildPreview(content: string): string {
  const normalized = content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/[#>*_~|-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) {
    return 'Open this record to inspect the full source, review its tags, and continue working from the saved material.';
  }

  return normalized.length > 180 ? `${normalized.slice(0, 177)}...` : normalized;
}

function getTopClusters(documents: LibraryDocumentRow[]) {
  const counts = new Map<string, number>();

  for (const document of documents) {
    for (const tag of document.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  const ranked = Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([label, count]) => ({
      label,
      count,
    }));

  if (ranked.length > 0) {
    return ranked;
  }

  return [
    { label: 'research imports', count: documents.filter((document) => document.is_webscout_discovered).length },
    { label: 'favorites', count: documents.filter((document) => document.is_favorite).length },
    { label: 'new records', count: documents.length },
  ].filter((cluster) => cluster.count > 0);
}

function getFormatIcon(format: FormatBucket) {
  switch (format) {
    case 'pdf':
      return 'pdf';
    case 'web':
      return 'link';
    default:
      return 'file';
  }
}

function StatCard({
  children,
  className,
}: {
  children: React.ReactNode;
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

function DocumentTile({ document }: { document: LibraryDocumentRow }) {
  const format = inferFormatBucket(document);
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
        <h2 className="line-clamp-3 text-[1.32rem] font-bold tracking-[-0.05em] text-white">
          {document.title}
        </h2>
        <p className="mt-3 text-[0.66rem] font-semibold uppercase tracking-[0.22em] text-[#797373]">
          Uploaded {formatLibraryRelativeDate(document.imported_at)}
        </p>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3 text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-[#797373]">
        <span>{FORMAT_LABELS[format]}</span>
        <LibraryIcon name="arrow-up-right" className="h-4 w-4 opacity-0 transition group-hover:opacity-100" />
      </div>
    </Link>
  );
}

function FeaturedDocumentTile({ document }: { document: LibraryDocumentRow }) {
  const format = inferFormatBucket(document);
  const titleIssue = getDocumentTitleIssue(document.title);
  const preview = buildPreview(document.content);

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
            {FORMAT_LABELS[format]}
          </span>
          {titleIssue ? (
            <span className="rounded-full bg-[rgba(255,180,171,0.1)] px-3 py-1.5 text-[0.58rem] font-bold uppercase tracking-[0.22em] text-[#f0c0b5]">
              Cleanup Queue
            </span>
          ) : null}
        </div>

        <h2 className="mt-6 max-w-4xl text-[clamp(2rem,3.6vw,3.2rem)] font-black tracking-[-0.07em] text-white leading-[1.02]">
          {document.title}
        </h2>

        <p className="mt-5 max-w-2xl text-[1rem] leading-8 text-[#ddd7d5]">
          {preview}
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {document.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-[#151515] px-3 py-1.5 text-[0.68rem] font-semibold text-[#d2cbcb]"
            >
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
            Access_Node
          </Link>
        </div>
      </div>
    </article>
  );
}

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
            const format = inferFormatBucket(document);

            return (
              <Link
                key={document.id}
                href={`/library/${document.id}`}
                className="flex items-center gap-4 rounded-[22px] bg-[#101010] px-4 py-4 transition hover:bg-[#151515]"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#232323] text-[#d0cccc]">
                  <LibraryIcon name={getFormatIcon(format)} className="h-[1.125rem] w-[1.125rem]" />
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

function EmptyLibraryState() {
  return (
    <section className="rounded-[32px] bg-[#191919] px-6 py-10 shadow-[0_24px_80px_rgba(0,0,0,0.32)] sm:px-10 sm:py-12">
      <div className="mb-4 flex items-center gap-3 text-[0.68rem] font-bold uppercase tracking-[0.26em] text-[#8f8888]">
        <span className="rounded-full bg-[#232323] px-3 py-1.5 text-[#ddd8d8]">Repository cold start</span>
        <span>Status: awaiting first source</span>
      </div>
      <h1 className="max-w-4xl text-[clamp(2.4rem,5vw,4.6rem)] font-black tracking-[-0.08em] text-white leading-[0.96]">
        The library is still empty.
      </h1>
      <p className="mt-6 max-w-2xl text-[1.08rem] leading-8 text-[#b7b0b0]">
        Add content from the ingest flow or save approved research imports to populate the document repository.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/ingest"
          className="inline-flex items-center justify-center rounded-full bg-[#efeded] px-5 py-3 text-[0.7rem] font-bold uppercase tracking-[0.28em] text-[#171717] transition hover:bg-white"
        >
          Add_Content
        </Link>
        <Link
          href="/today"
          className="inline-flex items-center justify-center rounded-full bg-[#232323] px-5 py-3 text-[0.7rem] font-bold uppercase tracking-[0.28em] text-[#ddd7d7] transition hover:bg-[#2c2c2c] hover:text-white"
        >
          Open_Research
        </Link>
      </div>
    </section>
  );
}

export default async function LibraryPage() {
  const scope = await requireSessionWorkspace();
  const documents = await getAllDocumentsForLibrary(scope);

  const favorites = documents.filter((document) => document.is_favorite);
  const documentsNeedingCleanup = documents.filter((document) => getDocumentTitleIssue(document.title));
  const researchDocuments = documents.filter((document) => document.is_webscout_discovered);
  const featuredDocument = favorites[0] ?? researchDocuments[0] ?? documents[0] ?? null;
  const repositoryDocuments = documents
    .filter((document) => document.id !== featuredDocument?.id)
    .slice(0, 6);
  const formatCounts = documents.reduce<Record<FormatBucket, number>>(
    (accumulator, document) => {
      accumulator[inferFormatBucket(document)] += 1;
      return accumulator;
    },
    { pdf: 0, text: 0, web: 0 },
  );
  const topClusters = getTopClusters(documents);

  return (
    <main className="relative px-4 pb-16 pt-10 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-[1220px]">
        {documents.length === 0 ? (
          <EmptyLibraryState />
        ) : (
          <>
            <section className="grid gap-6 xl:grid-cols-[1.15fr_1fr_0.9fr]">
              <StatCard className="bg-[#2a2a2a]">
                <div className="relative z-10">
                  <p className="text-[0.64rem] font-bold uppercase tracking-[0.28em] text-[#a39d9d]">
                    Total intelligence assets
                  </p>
                  <h1 className="mt-4 text-[clamp(3.4rem,7vw,5.1rem)] font-black tracking-[-0.08em] text-white leading-none">
                    {documents.length}
                  </h1>
                  <div className="mt-8 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-[18px] bg-black/20 px-4 py-4">
                      <div className="text-[0.6rem] font-bold uppercase tracking-[0.22em] text-[#bcb5b5]">Favorites</div>
                      <div className="mt-2 text-[1.4rem] font-bold tracking-[-0.05em] text-white">{favorites.length}</div>
                    </div>
                    <div className="rounded-[18px] bg-black/20 px-4 py-4">
                      <div className="text-[0.6rem] font-bold uppercase tracking-[0.22em] text-[#bcb5b5]">Cleanup</div>
                      <div className="mt-2 text-[1.4rem] font-bold tracking-[-0.05em] text-white">{documentsNeedingCleanup.length}</div>
                    </div>
                    <div className="rounded-[18px] bg-black/20 px-4 py-4">
                      <div className="text-[0.6rem] font-bold uppercase tracking-[0.22em] text-[#bcb5b5]">Research</div>
                      <div className="mt-2 text-[1.4rem] font-bold tracking-[-0.05em] text-white">{researchDocuments.length}</div>
                    </div>
                  </div>
                </div>
                <div className="pointer-events-none absolute -bottom-6 right-0 text-white/[0.06]">
                  <LibraryIcon name="grid" className="h-36 w-36" />
                </div>
              </StatCard>

              <StatCard className="bg-[#1b1b1b]">
                <p className="text-[0.64rem] font-bold uppercase tracking-[0.28em] text-[#a39d9d]">
                  Format distribution
                </p>
                <div className="mt-6 space-y-5">
                  {(Object.entries(FORMAT_LABELS) as Array<[FormatBucket, string]>).map(([bucket, label]) => {
                    const count = formatCounts[bucket];
                    const percent = documents.length > 0 ? Math.max((count / documents.length) * 100, count > 0 ? 8 : 0) : 0;

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

              <StatCard className="bg-[#1b1b1b]">
                <p className="text-[0.64rem] font-bold uppercase tracking-[0.28em] text-[#a39d9d]">
                  Node clusters
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {topClusters.map((cluster) => (
                    <span
                      key={cluster.label}
                      className="rounded-[8px] bg-[#2a2a2a] px-3 py-2 text-[0.6rem] font-bold uppercase tracking-[0.16em] text-white"
                    >
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
                  <h2 className="mt-3 text-[clamp(2.4rem,4vw,3.45rem)] font-black tracking-[-0.07em] text-white leading-[0.96]">
                    Repository_Vault
                  </h2>
                  <p className="mt-4 max-w-3xl text-[1rem] leading-8 text-[#b7b0b0]">
                    Search saved material, clean up noisy imports, and reopen the documents that matter most inside the working memory layer.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  {documentsNeedingCleanup.length > 0 ? (
                    <Link
                      href="#needs-cleanup"
                      className="inline-flex items-center gap-2 rounded-[16px] bg-[#2a2a2a] px-4 py-3 text-[0.64rem] font-bold uppercase tracking-[0.22em] text-[#dfd8d8] transition hover:bg-[#343434]"
                    >
                      <LibraryIcon name="warning" className="h-3.5 w-3.5" />
                      Cleanup
                    </Link>
                  ) : null}
                  {favorites.length > 0 ? (
                    <Link
                      href="#favorites"
                      className="inline-flex items-center gap-2 rounded-[16px] bg-[#2a2a2a] px-4 py-3 text-[0.64rem] font-bold uppercase tracking-[0.22em] text-[#dfd8d8] transition hover:bg-[#343434]"
                    >
                      <LibraryIcon name="star" className="h-3.5 w-3.5" filled />
                      Favorites
                    </Link>
                  ) : null}
                  <Link
                    href="/ingest"
                    className="inline-flex items-center gap-2 rounded-[16px] bg-[#efeded] px-4 py-3 text-[0.64rem] font-bold uppercase tracking-[0.22em] text-[#171717] transition hover:bg-white"
                  >
                    <LibraryIcon name="plus" className="h-3.5 w-3.5" />
                    Add content
                  </Link>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                {repositoryDocuments.map((document) => (
                  <DocumentTile key={document.id} document={document} />
                ))}
                {featuredDocument ? <FeaturedDocumentTile document={featuredDocument} /> : null}
              </div>
            </section>

            {documentsNeedingCleanup.length > 0 || favorites.length > 0 ? (
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
            ) : null}

            <footer className="mt-12 rounded-[24px] bg-[#171717] px-5 py-5 sm:px-6">
              <div className="flex flex-col gap-4 text-[0.64rem] font-semibold uppercase tracking-[0.22em] text-[#7d7676] lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap gap-5">
                  <span>Memory_Status: Optimal</span>
                  <span>Favorites: {favorites.length}</span>
                  <span>Cleanup_Queue: {documentsNeedingCleanup.length}</span>
                  <span>Research_Imports: {researchDocuments.length}</span>
                </div>
                <div className="flex flex-wrap gap-5">
                  <Link href="/today" className="transition hover:text-white">
                    Research
                  </Link>
                  <Link href="/reports" className="transition hover:text-white">
                    Results
                  </Link>
                  <Link href="/ingest" className="transition hover:text-white">
                    Add Content
                  </Link>
                </div>
              </div>
            </footer>
          </>
        )}
      </div>
    </main>
  );
}

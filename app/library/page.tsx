import Link from 'next/link';
import { getAllDocumentsForLibrary, type LibraryDocumentRow } from '@/server/services/document.service';
import { Badge } from '@/app/components/Badge';
import { Card } from '@/app/components/Card';
import { EmptyState } from '@/app/components/EmptyState';
import {
  formatLibraryRelativeDate,
  getDocumentOriginLabel,
  getDocumentTitleIssue,
  getSourceDisplay,
} from './documentPresentation';

function LibraryStat({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: number;
  tone?: 'default' | 'attention';
}) {
  const tones = {
    default: 'border-white/10 bg-black/30 text-zinc-300',
    attention: 'border-amber-500/30 bg-amber-500/10 text-amber-100',
  };

  return (
    <div className={`rounded-2xl border p-4 ${tones[tone]}`}>
      <div className="text-2xl font-semibold text-white">{value}</div>
      <p className="mt-1 text-sm">{label}</p>
    </div>
  );
}

function DocumentGrid({ documents }: { documents: LibraryDocumentRow[] }) {
  if (documents.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {documents.map((doc) => {
        const titleIssue = getDocumentTitleIssue(doc.title);
        const originLabel = getDocumentOriginLabel(doc.is_webscout_discovered);

        return (
          <Link key={doc.id} href={`/library/${doc.id}`} className="group block h-full min-w-0">
            <Card className="flex h-full flex-col overflow-hidden border-white/10 bg-zinc-950/90 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/20">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-zinc-300">
                  {originLabel}
                </span>
                {titleIssue && (
                  <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-100">
                    Needs cleanup
                  </span>
                )}
                {doc.is_favorite && (
                  <span className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2.5 py-1 text-[11px] font-medium text-yellow-100">
                    Favorite
                  </span>
                )}
              </div>

              <div className="mt-4 flex-1 space-y-3">
                <h2 className="line-clamp-3 text-lg font-semibold leading-tight text-white transition-colors group-hover:text-[#d97757]">
                  {doc.title}
                </h2>

                {titleIssue ? (
                  <p className="text-sm leading-6 text-amber-100/90">{titleIssue.reason}</p>
                ) : (
                  <p className="text-sm leading-6 text-zinc-400">
                    Open this document to review the full source, tags, and saved content.
                  </p>
                )}

                {doc.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {doc.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs text-zinc-300">
                        {tag}
                      </Badge>
                    ))}
                    {doc.tags.length > 3 && (
                      <Badge variant="secondary" className="text-xs text-zinc-300">
                        +{doc.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-6 flex items-center justify-between gap-3 border-t border-white/5 pt-4 text-xs text-zinc-500">
                <div className="min-w-0">
                  <p className="truncate">{getSourceDisplay(doc.source)}</p>
                  <p className="mt-1">{formatLibraryRelativeDate(doc.imported_at)}</p>
                </div>
                <span className="rounded-full border border-white/10 px-2.5 py-1 text-zinc-300">
                  {titleIssue ? 'Open to rename' : 'Open document'}
                </span>
              </div>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

function DocumentSection({
  id,
  title,
  description,
  documents,
}: {
  id?: string;
  title: string;
  description: string;
  documents: LibraryDocumentRow[];
}) {
  return (
    <section id={id} className="space-y-4 scroll-mt-24">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-white">{title}</h2>
          <p className="mt-1 text-sm text-zinc-400">{description}</p>
        </div>
        <p className="text-sm text-zinc-500">
          {documents.length} {documents.length === 1 ? 'document' : 'documents'}
        </p>
      </div>
      <DocumentGrid documents={documents} />
    </section>
  );
}

export default async function LibraryPage() {
  let documents: LibraryDocumentRow[] = [];
  let error: string | null = null;

  try {
    documents = await getAllDocumentsForLibrary();
  } catch (err) {
    error = err instanceof Error ? err.message : 'An unexpected error occurred';
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
            <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-white">Database Offline</h1>
            <p className="whitespace-pre-line text-sm text-zinc-400">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const favorites = documents.filter((doc) => doc.is_favorite);
  const documentsNeedingCleanup = documents.filter((doc) => getDocumentTitleIssue(doc.title));
  const researchDocuments = documents.filter((doc) => doc.is_webscout_discovered);

  return (
    <div className="p-6">
      <div className="space-y-8">
        <header className="space-y-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Library</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
              Search saved material, clean up messy imports, and reopen documents you want to keep close at hand.
            </p>
          </div>

          <Card className="border-white/10 bg-gradient-to-br from-zinc-950 via-zinc-950 to-zinc-900 p-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <LibraryStat label="saved documents" value={documents.length} />
              <LibraryStat label="favorites" value={favorites.length} />
              <LibraryStat
                label="titles needing cleanup"
                value={documentsNeedingCleanup.length}
                tone={documentsNeedingCleanup.length > 0 ? 'attention' : 'default'}
              />
              <LibraryStat label="saved from research" value={researchDocuments.length} />
            </div>
          </Card>
        </header>

        {documents.length === 0 ? (
          <div className="space-y-4">
            <EmptyState
              title="No documents yet"
              description="Add content from the Research flow or import something directly to start building your library."
            />
            <div className="flex flex-wrap gap-3">
              <Link
                href="/ingest"
                className="inline-flex items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-zinc-200"
              >
                Add Content
              </Link>
              <Link
                href="/today"
                className="inline-flex items-center justify-center rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-white/5"
              >
                Back to Research
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-10">
            {documentsNeedingCleanup.length > 0 && (
              <DocumentSection
                id="needs-cleanup"
                title="Needs Cleanup"
                description="Fix imported titles that are too long, too noisy, or pulled in raw page metadata."
                documents={documentsNeedingCleanup.slice(0, 6)}
              />
            )}

            {favorites.length > 0 && (
              <DocumentSection
                title="Favorites"
                description="Quick access to the documents you return to most often."
                documents={favorites}
              />
            )}

            <DocumentSection
              title="Recently Added"
              description="Everything in your library, ordered by the newest imports first."
              documents={documents}
            />
          </div>
        )}
      </div>
    </div>
  );
}

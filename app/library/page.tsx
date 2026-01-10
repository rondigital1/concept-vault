import Link from 'next/link';
import { getAllDocuments } from '@/server/services/document.service';
import { Badge } from '@/app/components/Badge';
import { Card } from '@/app/components/Card';
import { EmptyState } from '@/app/components/EmptyState';
import { ensureSchema } from '@/db/schema';
import { client } from '@/db';

function getSourceDisplay(source: string): string {
  // If it's a URL, show the domain
  try {
    const url = new URL(source);
    return url.hostname.replace('www.', '');
  } catch {
    // If not a URL, show as-is (e.g., filename)
    return source;
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default async function LibraryPage() {
  await ensureSchema(client);
  const documents = await getAllDocuments();

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black">
      {/* Header */}
      <div className="border-b border-white/5 bg-black/50 backdrop-blur-xl sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Library</h1>
              <p className="text-sm text-zinc-400 mt-1">
                {documents.length} {documents.length === 1 ? 'document' : 'documents'}
              </p>
            </div>
            <Link
              href="/"
              className="px-4 py-2 text-sm font-medium text-white/70 hover:text-white transition-colors"
            >
              ← Back
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-6 py-12">
        {documents.length === 0 ? (
          <EmptyState
            title="No documents yet"
            description="Import your first document to get started"
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {documents.map((doc) => (
              <Link
                key={doc.id}
                href={`/library/${doc.id}`}
                className="group"
              >
                <Card className="h-full aspect-square flex flex-col p-5 hover:border-white/20 transition-all duration-300 hover:scale-[1.02] cursor-pointer">
                  {/* Header */}
                  <div className="flex-1 flex flex-col gap-3">
                    {/* Title */}
                    <h3 className="text-base font-semibold text-white leading-tight line-clamp-3 group-hover:text-[#d97757] transition-colors">
                      {doc.title}
                    </h3>

                    {/* Tags */}
                    {doc.tags && doc.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {doc.tags.slice(0, 3).map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="text-xs"
                          >
                            {tag}
                          </Badge>
                        ))}
                        {doc.tags.length > 3 && (
                          <Badge
                            variant="secondary"
                            className="text-xs"
                          >
                            +{doc.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="mt-auto pt-4 border-t border-white/5 space-y-2">
                    {/* Source */}
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <svg
                        className="w-3.5 h-3.5 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                        />
                      </svg>
                      <span className="truncate">{getSourceDisplay(doc.source)}</span>
                    </div>

                    {/* Import date */}
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <svg
                        className="w-3.5 h-3.5 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span>{formatDate(doc.imported_at)}</span>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

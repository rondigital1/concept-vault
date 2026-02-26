import Link from 'next/link';
import { getAllDocuments } from '@/server/services/document.service';
import { Badge } from '@/app/components/Badge';
import { Card } from '@/app/components/Card';
import { EmptyState } from '@/app/components/EmptyState';

function getSourceDisplay(source: string): string {
  try {
    const url = new URL(source);
    return url.hostname.replace('www.', '');
  } catch {
    return source;
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'Unknown';

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfImportedDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round(
    (startOfToday.getTime() - startOfImportedDay.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays > 1 && diffDays < 7) return `${diffDays} days ago`;
  if (diffDays >= 7 && diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays >= 30 && diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  if (diffDays < 0 && diffDays >= -1) return 'Today';

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default async function LibraryPage() {
  let documents: any[] = [];
  let error: string | null = null;

  try {
    documents = await getAllDocuments();
  } catch (err) {
    error = err instanceof Error ? err.message : 'An unexpected error occurred';
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-6 text-center h-full">
        <div className="max-w-md space-y-6">
          <div className="h-16 w-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
            <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-white">Database Offline</h1>
            <p className="text-sm text-zinc-400 whitespace-pre-line">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">All Documents</h1>
        <p className="text-sm text-zinc-400 mt-1">
          {documents.length} {documents.length === 1 ? 'document' : 'documents'}
        </p>
      </div>

      {documents.length === 0 ? (
        <EmptyState
          title="No documents yet"
          description="Import your first document to get started"
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
          {documents.map((doc) => (
            <Link key={doc.id} href={`/library/${doc.id}`} className="group block h-full min-w-0">
              <Card className="h-full overflow-hidden flex flex-col p-5 hover:border-white/20 transition-all duration-300 hover:scale-[1.02] cursor-pointer">
                <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-hidden">
                  <div className="flex items-start gap-2">
                    <h3 className="text-base font-semibold text-white leading-tight line-clamp-3 break-words group-hover:text-[#d97757] transition-colors flex-1">
                      {doc.title}
                    </h3>
                    {doc.is_favorite && (
                      <svg className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    )}
                  </div>

                  {doc.tags && doc.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 max-h-16 overflow-hidden">
                      {doc.tags.slice(0, 3).map((tag: string) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {doc.tags.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{doc.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-auto pt-4 border-t border-white/5 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    <span className="truncate">{getSourceDisplay(doc.source)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
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
  );
}

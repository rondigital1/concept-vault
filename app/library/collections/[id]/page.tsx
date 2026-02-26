import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getCollection } from '@/server/repos/collections.repo';
import { getDocument } from '@/server/services/document.service';
import { Badge } from '@/app/components/Badge';
import { Card } from '@/app/components/Card';
import { EmptyState } from '@/app/components/EmptyState';

type PageProps = {
  params: Promise<{ id: string }>;
};

function getSourceDisplay(source: string): string {
  try {
    const url = new URL(source);
    return url.hostname.replace('www.', '');
  } catch {
    return source;
  }
}

export default async function CollectionPage(props: PageProps) {
  const params = await props.params;
  const collection = await getCollection(params.id);

  if (!collection) {
    notFound();
  }

  const documents = await Promise.all(
    collection.document_ids.map((docId) => getDocument(docId)),
  );
  const validDocs = documents.filter(Boolean);

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <svg className="w-6 h-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <h1 className="text-2xl font-bold text-white tracking-tight">{collection.name}</h1>
        </div>
        {collection.description && (
          <p className="text-sm text-zinc-400 mt-2">{collection.description}</p>
        )}
        <p className="text-sm text-zinc-500 mt-1">
          {validDocs.length} {validDocs.length === 1 ? 'document' : 'documents'}
        </p>
      </div>

      {validDocs.length === 0 ? (
        <EmptyState
          title="No documents in this collection"
          description="Add documents from their detail page"
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
          {validDocs.map((doc) => (
            <Link key={doc!.id} href={`/library/${doc!.id}`} className="group block h-full min-w-0">
              <Card className="h-full overflow-hidden flex flex-col p-5 hover:border-white/20 transition-all duration-300 hover:scale-[1.02] cursor-pointer">
                <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-hidden">
                  <h3 className="text-base font-semibold text-white leading-tight line-clamp-3 break-words group-hover:text-[#d97757] transition-colors">
                    {doc!.title}
                  </h3>
                  {doc!.tags && doc!.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 max-h-16 overflow-hidden">
                      {doc!.tags.slice(0, 3).map((tag: string) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="mt-auto pt-4 border-t border-white/5">
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    <span className="truncate">{getSourceDisplay(doc!.source)}</span>
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

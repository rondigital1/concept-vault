import Link from 'next/link';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { getDocument } from '@/server/services/document.service';
import { Badge } from '@/app/components/Badge';
import { ensureSchema } from '@/db/schema';
import { client } from '@/db';

type PageProps = {
  params: Promise<{ id: string }>;
};

function getSourceDisplay(source: string): { display: string; url: string | null } {
  // If it's a URL, return both display and URL
  try {
    const url = new URL(source);
    return {
      display: url.hostname.replace('www.', ''),
      url: source,
    };
  } catch {
    // If not a URL, just return display
    return {
      display: source,
      url: null,
    };
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default async function DocumentPage(props: PageProps) {
  await ensureSchema(client);
  const params = await props.params;
  const document = await getDocument(params.id);

  if (!document) {
    notFound();
  }

  const source = getSourceDisplay(document.source);

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black">
      {/* Header */}
      <div className="border-b border-white/5 bg-black/50 backdrop-blur-xl sticky top-0 z-10">
        <div className="mx-auto max-w-4xl px-6 py-6">
          <Link
            href="/library"
            className="inline-flex items-center gap-2 text-sm font-medium text-white/70 hover:text-white transition-colors mb-4"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Library
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-6 py-12">
        <article className="space-y-8">
          {/* Title */}
          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-white leading-tight">
              {document.title}
            </h1>

            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-400">
              {/* Source */}
              <div className="flex items-center gap-2">
                <svg
                  className="w-4 h-4"
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
                {source.url ? (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-[#d97757] transition-colors underline"
                  >
                    {source.display}
                  </a>
                ) : (
                  <span>{source.display}</span>
                )}
              </div>

              <span className="text-zinc-700">•</span>

              {/* Import date */}
              <div className="flex items-center gap-2">
                <svg
                  className="w-4 h-4"
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
                <span>Imported {formatDate(document.imported_at)}</span>
              </div>
            </div>

            {/* Tags */}
            {document.tags && document.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {document.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-white/5" />

          {/* Content */}
          <div className="prose prose-invert prose-zinc prose-lg max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeSanitize]}
              components={{
                // Customize heading styles
                h1: ({ node, ...props }) => (
                  <h1 className="text-4xl font-bold text-white mb-6 mt-8" {...props} />
                ),
                h2: ({ node, ...props }) => (
                  <h2 className="text-3xl font-bold text-white mb-4 mt-6" {...props} />
                ),
                h3: ({ node, ...props }) => (
                  <h3 className="text-2xl font-semibold text-white mb-3 mt-5" {...props} />
                ),
                // Customize paragraph spacing
                p: ({ node, ...props }) => (
                  <p className="text-zinc-300 leading-relaxed mb-4" {...props} />
                ),
                // Customize lists
                ul: ({ node, ...props }) => (
                  <ul className="list-disc list-inside text-zinc-300 mb-4 space-y-2" {...props} />
                ),
                ol: ({ node, ...props }) => (
                  <ol className="list-decimal list-inside text-zinc-300 mb-4 space-y-2" {...props} />
                ),
                li: ({ node, ...props }) => (
                  <li className="text-zinc-300" {...props} />
                ),
                // Customize links
                a: ({ node, ...props }) => (
                  <a
                    className="text-[#d97757] hover:text-[#c66849] underline transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                    {...props}
                  />
                ),
                // Customize code blocks
                code: ({ node, inline, ...props }: any) =>
                  inline ? (
                    <code className="px-1.5 py-0.5 bg-white/10 text-zinc-200 rounded text-sm font-mono" {...props} />
                  ) : (
                    <code className="block px-4 py-3 bg-white/5 text-zinc-200 rounded-lg text-sm font-mono overflow-x-auto" {...props} />
                  ),
                // Customize blockquotes
                blockquote: ({ node, ...props }) => (
                  <blockquote className="border-l-4 border-[#d97757] pl-4 italic text-zinc-400 my-4" {...props} />
                ),
                // Customize horizontal rules
                hr: ({ node, ...props }) => (
                  <hr className="border-white/10 my-8" {...props} />
                ),
              }}
            >
              {document.content}
            </ReactMarkdown>
          </div>
        </article>
      </div>
    </main>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast, ToastContainer } from '@/app/components/Toast';
import { ingestContent } from './actions';

type IngestMode = 'text' | 'url';

export default function IngestPage() {
  const router = useRouter();
  const [mode, setMode] = useState<IngestMode>('text');
  const [title, setTitle] = useState('');
  const [source, setSource] = useState('');
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      toast.error('Content is required');
      return;
    }

    if (content.trim().length < 50) {
      toast.error('Content must be at least 50 characters');
      return;
    }

    setIsLoading(true);

    try {
      // Call Server Action directly
      const result = await ingestContent({
        title: title.trim() || undefined,
        source: source.trim() || undefined,
        content: content.trim(),
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success('Content ingested successfully!');

      // Clear form
      setTitle('');
      setSource('');
      setContent('');

      // Redirect to library after a short delay
      setTimeout(() => {
        router.push('/library');
      }, 1500);
    } catch (error) {
      console.error('Ingest error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <ToastContainer />
      <main className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black">
        {/* Header */}
        <div className="border-b border-white/5 bg-black/50 backdrop-blur-xl sticky top-0 z-10">
          <div className="mx-auto max-w-4xl px-6 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">Ingest Content</h1>
                <p className="text-sm text-zinc-400 mt-1">Add new documents to your vault</p>
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
        <div className="mx-auto max-w-4xl px-6 py-12">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Mode Selector */}
            <div className="flex gap-2 p-1 bg-white/5 rounded-lg border border-white/10 w-fit">
              <button
                type="button"
                onClick={() => setMode('text')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  mode === 'text'
                    ? 'bg-white/10 text-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Text
              </button>
              <button
                type="button"
                onClick={() => setMode('url')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  mode === 'url'
                    ? 'bg-white/10 text-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                URL
              </button>
            </div>

            {/* Title Input */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-white mb-2">
                Title <span className="text-zinc-500">(optional)</span>
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Document title (auto-generated if left empty)"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#d97757] focus:border-transparent"
              />
            </div>

            {/* Source Input */}
            {mode === 'url' ? (
              <div>
                <label htmlFor="source" className="block text-sm font-medium text-white mb-2">
                  URL <span className="text-red-400">*</span>
                </label>
                <input
                  id="source"
                  type="url"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="https://example.com/article"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#d97757] focus:border-transparent"
                  required={mode === 'url'}
                />
              </div>
            ) : (
              <div>
                <label htmlFor="source" className="block text-sm font-medium text-white mb-2">
                  Source <span className="text-zinc-500">(optional)</span>
                </label>
                <input
                  id="source"
                  type="text"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="e.g., Book: Deep Work, Lecture Notes, etc."
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#d97757] focus:border-transparent"
                />
              </div>
            )}

            {/* Content Input */}
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-white mb-2">
                Content <span className="text-red-400">*</span>
              </label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={
                  mode === 'url'
                    ? 'Paste URL above or add additional notes here...'
                    : 'Paste your content here...\n\nMinimum 50 characters required.\n\nSupports Markdown formatting:\n# Headings\n**bold**, *italic*\n- Lists\n[links](url)\n`code`'
                }
                rows={16}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#d97757] focus:border-transparent font-mono text-sm resize-y"
                required
              />
              <p className="mt-2 text-xs text-zinc-500 flex items-center justify-between">
                <span>
                  {content.length} characters {content.length < 50 && `(${50 - content.length} more needed)`}
                </span>
                <span className="text-zinc-600">
                  Markdown supported: headings, bold, italic, lists, links, code
                </span>
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-between pt-4 border-t border-white/5">
              <div className="text-sm text-zinc-500">
                Tags will be automatically extracted
              </div>
              <button
                type="submit"
                disabled={isLoading || !content.trim() || content.trim().length < 50}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  isLoading || !content.trim() || content.trim().length < 50
                    ? 'bg-white/5 text-zinc-500 cursor-not-allowed'
                    : 'bg-[#d97757] text-white hover:bg-[#c66849] shadow-lg hover:shadow-xl hover:scale-[1.02]'
                }`}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Ingesting...
                  </span>
                ) : (
                  'Ingest Content'
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </>
  );
}

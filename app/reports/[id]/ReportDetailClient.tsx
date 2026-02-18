'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Badge } from '@/app/components/Badge';

const DocumentMarkdown = dynamic(
  () => import('@/app/library/[id]/DocumentMarkdown'),
  { loading: () => <div className="animate-pulse h-96 bg-white/5 rounded-lg" /> },
);

interface ReportDetailClientProps {
  id: string;
  title: string;
  day: string;
  markdown: string;
  sourcesCount: number;
  topicsCovered: string[];
  isRead: boolean;
}

export default function ReportDetailClient({
  id,
  title,
  day,
  markdown,
  sourcesCount,
  topicsCovered,
  isRead: initialIsRead,
}: ReportDetailClientProps) {
  const [isRead, setIsRead] = useState(initialIsRead);
  const [marking, setMarking] = useState(false);

  async function handleMarkRead() {
    setMarking(true);
    try {
      const res = await fetch(`/api/reports/${id}/read`, { method: 'POST' });
      if (res.ok) {
        setIsRead(true);
      }
    } catch {
      // Silently fail — not critical
    } finally {
      setMarking(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black">
      {/* Header */}
      <div className="border-b border-white/5 bg-black/50 backdrop-blur-xl sticky top-0 z-10">
        <div className="mx-auto max-w-4xl px-6 py-6">
          <Link
            href="/reports"
            className="text-sm text-zinc-400 hover:text-white transition-colors mb-4 inline-block"
          >
            ← All Reports
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">{title}</h1>
              <div className="flex items-center gap-3 mt-2 text-sm text-zinc-400">
                <span>{day}</span>
                <span className="text-zinc-600">|</span>
                <span>{sourcesCount} source{sourcesCount !== 1 ? 's' : ''}</span>
              </div>
            </div>
            {!isRead && (
              <button
                onClick={handleMarkRead}
                disabled={marking}
                className="shrink-0 px-4 py-2 text-sm font-medium text-white bg-zinc-800 border border-zinc-700 rounded-lg hover:bg-zinc-700 transition-colors disabled:opacity-50"
              >
                {marking ? 'Marking...' : 'Mark as read'}
              </button>
            )}
            {isRead && (
              <span className="shrink-0 px-4 py-2 text-sm text-zinc-500">Read</span>
            )}
          </div>
          {topicsCovered.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {topicsCovered.map((topic) => (
                <Badge key={topic} variant="secondary" className="text-xs">
                  {topic}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="prose prose-invert max-w-none">
          <DocumentMarkdown content={markdown} />
        </div>
      </div>
    </main>
  );
}

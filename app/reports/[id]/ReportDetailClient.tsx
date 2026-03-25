'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Badge } from '@/app/components/Badge';

const DocumentMarkdown = dynamic(
  () => import('@/app/library/[id]/DocumentMarkdown'),
  { loading: () => <div className="animate-pulse h-96 rounded-lg bg-white/5" /> },
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

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
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
      // Silently fail. The report remains readable either way.
    } finally {
      setMarking(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black">
      <div className="sticky top-0 z-10 border-b border-white/5 bg-black/50 backdrop-blur-xl">
        <div className="mx-auto max-w-5xl px-6 py-6">
          <div className="flex flex-wrap gap-3 text-sm">
            <Link href="/reports" className="text-zinc-400 transition-colors hover:text-white">
              ← All Reports
            </Link>
            <Link href="/today" className="text-zinc-400 transition-colors hover:text-white">
              Back to Research
            </Link>
          </div>

          <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Research Report
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-white">{title}</h1>
              <p className="mt-3 text-sm leading-6 text-zinc-300">
                Generated on {formatDate(day)} from {sourcesCount} approved source{sourcesCount === 1 ? '' : 's'}.
                Use this as the finished output for your topic, then return to Research when you are ready to review new proposals or generate the next report.
              </p>
              {topicsCovered.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {topicsCovered.map((topic) => (
                    <Badge key={topic} variant="secondary" className="text-xs text-zinc-300">
                      {topic}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {!isRead ? (
                <button
                  onClick={handleMarkRead}
                  disabled={marking}
                  className="inline-flex items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {marking ? 'Marking...' : 'Mark as read'}
                </button>
              ) : (
                <span className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-100">
                  Read
                </span>
              )}
              <Link
                href="/today"
                className="inline-flex items-center justify-center rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-white/5"
              >
                Continue in Research
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="rounded-2xl border border-white/5 bg-zinc-950/50 p-6">
          <div className="max-w-3xl">
            <DocumentMarkdown content={markdown} />
          </div>
        </div>
      </div>
    </main>
  );
}

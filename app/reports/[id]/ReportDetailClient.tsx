'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import type { ReportCitation } from '../reportsViewModel';
import { formatDisplayDate, trimIdentifier } from '../reportsViewModel';
import {
  ResultsActionButton,
  ResultsActionLink,
  ResultsContainer,
  ResultsMetadataRow,
  ResultsPill,
  ResultsRouteShell,
  ResultsSidePanel,
  ResultsStickyToolbar,
  ResultsTopicChip,
} from '../resultsUi';

const DocumentMarkdown = dynamic(() => import('@/app/library/[id]/DocumentMarkdown'), {
  loading: () => <div className="h-96 animate-pulse rounded-[24px] bg-[#111111]" />,
});

interface ReportDetailClientProps {
  id: string;
  title: string;
  createdAt: string;
  day: string;
  markdown: string;
  summaryLines: string[];
  summaryPreview: string | null;
  citations: ReportCitation[];
  sourcesCount: number;
  topicsCovered: string[];
  isRead: boolean;
  runId: string | null;
}

export async function requestMarkReportRead(
  id: string,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  try {
    const res = await fetchImpl(`/api/reports/${id}/read`, { method: 'POST' });
    return res.ok;
  } catch {
    return false;
  }
}

export default function ReportDetailClient({
  id,
  title,
  createdAt,
  day,
  markdown,
  summaryLines,
  summaryPreview,
  citations,
  sourcesCount,
  topicsCovered,
  isRead: initialIsRead,
  runId,
}: ReportDetailClientProps) {
  const [isRead, setIsRead] = useState(initialIsRead);
  const [marking, setMarking] = useState(false);

  const leadParagraphs =
    summaryLines.length > 0
      ? summaryLines.slice(0, 2)
      : [
          summaryPreview ??
            'This dossier captures the approved report in its final reading form, with the full markdown synthesis preserved below.',
        ];

  async function handleMarkRead() {
    setMarking(true);
    const wasMarked = await requestMarkReportRead(id);
    if (wasMarked) {
      setIsRead(true);
    }
    setMarking(false);
  }

  return (
    <ResultsRouteShell>
      <ResultsContainer>
        <ResultsStickyToolbar>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3 text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#8f8888]">
              <Link href="/reports" className="text-white transition hover:opacity-75">
                Reports archive
              </Link>
              <span>/</span>
              <span>{formatDisplayDate(day)}</span>
              <ResultsPill tone={isRead ? 'success' : 'warning'}>{isRead ? 'Read' : 'Unread'}</ResultsPill>
            </div>

            <div className="flex flex-wrap gap-3">
              {!isRead ? (
                <ResultsActionButton
                  type="button"
                  label={marking ? 'Marking' : 'Mark as read'}
                  icon="check"
                  tone="primary"
                  onClick={handleMarkRead}
                  disabled={marking}
                />
              ) : null}
              <ResultsActionLink href="/reports" label="Back to archive" icon="arrow-left" />
              <ResultsActionLink href="/today" label="Continue in Research" icon="research" />
            </div>
          </div>
        </ResultsStickyToolbar>

        <header className="max-w-5xl">
          <div className="mb-4 flex flex-wrap items-center gap-3 text-[0.65rem] font-bold uppercase tracking-[0.26em] text-[#8c8787]">
            <span className="rounded-sm bg-[#2a2a2a] px-3 py-1.5 text-[#ddd8d8]">REPORT_DETAIL: DOSSIER</span>
            <span>COMPLETED: {formatDisplayDate(createdAt, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
          <h1 className="max-w-5xl text-[clamp(2.7rem,7vw,5.2rem)] font-black leading-[0.96] tracking-[-0.085em] text-white">
            {title}
          </h1>
          <div className="mt-6 space-y-4">
            {leadParagraphs.map((line, index) => (
              <p key={`${line}-${index}`} className="max-w-4xl text-[1.08rem] leading-8 text-[#cfc6c6]">
                {line}
              </p>
            ))}
          </div>
          {topicsCovered.length > 0 ? (
            <div className="mt-8 flex flex-wrap gap-2">
              {topicsCovered.map((topic) => (
                <ResultsTopicChip key={topic} topic={topic} />
              ))}
            </div>
          ) : null}
        </header>

        <div className="mt-12 grid gap-8 xl:grid-cols-[minmax(0,1.65fr)_360px]">
          <section className="space-y-8">
            <article className="relative overflow-hidden rounded-[30px] bg-[#1d1d1d] px-6 py-7 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:px-10 sm:py-10">
              <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-white/[0.04] blur-3xl" />
              <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-[0.72rem] font-bold uppercase tracking-[0.28em] text-white">Executive summary</p>
                  <p className="mt-2 text-[0.78rem] uppercase tracking-[0.2em] text-[#8b8484]">
                    {formatDisplayDate(day)} · {sourcesCount} approved source{sourcesCount === 1 ? '' : 's'}
                  </p>
                </div>
                <ResultsPill tone={isRead ? 'success' : 'warning'}>{isRead ? 'Read and filed' : 'Needs review'}</ResultsPill>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[22px] bg-[#111111] px-6 py-6">
                  <span className="text-[0.65rem] font-bold uppercase tracking-[0.24em] text-[#7e7777]">Source coverage</span>
                  <div className="mt-3 text-[clamp(2.4rem,4vw,3.8rem)] font-black tracking-[-0.06em] text-white">{sourcesCount}</div>
                </div>
                <div className="rounded-[22px] bg-[#111111] px-6 py-6">
                  <span className="text-[0.65rem] font-bold uppercase tracking-[0.24em] text-[#7e7777]">Citation preview</span>
                  <div className="mt-3 text-[clamp(2.4rem,4vw,3.8rem)] font-black tracking-[-0.06em] text-white">{citations.length || '—'}</div>
                </div>
              </div>

              <p className="mt-8 max-w-3xl text-[1.02rem] leading-8 text-[#b8b0af]">
                Read the full dossier below for the complete markdown synthesis. The citations rail stays visible on desktop so source coverage remains in view while you read.
              </p>
            </article>

            <section className="rounded-[30px] bg-[#1d1d1d] px-6 py-7 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:px-10 sm:py-10">
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[0.68rem] font-bold uppercase tracking-[0.28em] text-[#8f8888]">Full dossier</p>
                  <h2 className="mt-2 text-[2rem] font-black tracking-[-0.06em] text-white">Report body</h2>
                </div>
                <div className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#8f8888]">Markdown preserved for long-form review</div>
              </div>

              <div className="max-w-3xl">
                {markdown.trim().length > 0 ? (
                  <DocumentMarkdown content={markdown} />
                ) : (
                  <div className="rounded-[22px] bg-[#111111] px-5 py-5">
                    <p className="text-[0.7rem] font-bold uppercase tracking-[0.24em] text-[#d9d1d1]">Markdown unavailable</p>
                    <p className="mt-3 text-[0.96rem] leading-7 text-[#beb5b5]">
                      The full markdown body was not saved with this report. The summary and metadata remain available on this page, and the artifact record still preserves the raw payload trail.
                    </p>
                  </div>
                )}
              </div>
            </section>
          </section>

          <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
            <ResultsSidePanel title="Verified citations" icon="stack">
              {citations.length > 0 ? (
                <ul className="mt-6 space-y-6">
                  {citations.map((citation) => (
                    <li key={`${citation.url}-${citation.title}`}>
                      <a href={citation.url} target="_blank" rel="noreferrer" className="block transition hover:opacity-80">
                        <div className="text-[0.58rem] font-semibold uppercase tracking-[0.26em] text-[#8d8787]">{citation.source}</div>
                        <div className="mt-2 text-[1rem] leading-7 text-white">{citation.title}</div>
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="mt-6 rounded-[22px] border border-white/8 bg-[#171717] px-5 py-5">
                  <p className="text-[0.7rem] font-bold uppercase tracking-[0.24em] text-[#d9d1d1]">No parsed citations</p>
                  <p className="mt-3 text-[0.96rem] leading-7 text-[#beb5b5]">
                    This report did not expose a structured citation list. Review the full markdown body to inspect any inline source section that was preserved.
                  </p>
                </div>
              )}
            </ResultsSidePanel>

            <ResultsSidePanel title="Process metadata" className="bg-[#111111] shadow-[0_20px_60px_rgba(0,0,0,0.22)]">
              <div className="mt-6 space-y-1">
                <ResultsMetadataRow label="Generated" value={formatDisplayDate(createdAt)} />
                <ResultsMetadataRow label="Read status" value={isRead ? 'READ' : 'UNREAD'} accent />
                <ResultsMetadataRow label="Run id" value={trimIdentifier(runId) ?? 'MANUAL'} />
                <ResultsMetadataRow label="Artifact id" value={trimIdentifier(id) ?? id} />
                <ResultsMetadataRow label="Topics indexed" value={`${topicsCovered.length || 0}`} />
              </div>
            </ResultsSidePanel>

            <div className="space-y-3">
              <ResultsActionLink href="/reports" label="Open archive" icon="report" tone="primary" fullWidth />
              <ResultsActionLink href="/today" label="Continue in Research" icon="research" fullWidth />
              {citations.length > 0 ? (
                <ResultsActionLink href={citations[0].url} label="Open first citation" icon="external" fullWidth external />
              ) : null}
            </div>
          </aside>
        </div>
      </ResultsContainer>
    </ResultsRouteShell>
  );
}

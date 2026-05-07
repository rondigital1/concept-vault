'use client';

import { useState } from 'react';
import { ResultsContainer, ResultsRouteShell } from '../ResultsRouteShell';
import { ReportBodySection } from './ReportBodySection';
import { ReportDetailHero } from './ReportDetailHero';
import { ReportDetailSidebar } from './ReportDetailSidebar';
import { ReportDetailToolbar } from './ReportDetailToolbar';
import { ReportExecutiveSummaryCard } from './ReportExecutiveSummaryCard';
import { requestMarkReportRead } from './reportDetailRead';
import type { ReportDetailClientProps } from './reportDetailTypes';

export { requestMarkReportRead } from './reportDetailRead';

function getReportLeadParagraphs({
  summaryLines,
  summaryPreview,
}: {
  summaryLines: string[];
  summaryPreview: string | null;
}) {
  if (summaryLines.length > 0) {
    return summaryLines.slice(0, 2);
  }

  return [
    summaryPreview ??
      'This dossier captures the approved report in its final reading form, with the full markdown synthesis preserved below.',
  ];
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
  const leadParagraphs = getReportLeadParagraphs({ summaryLines, summaryPreview });

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
        <ReportDetailToolbar
          day={day}
          isRead={isRead}
          marking={marking}
          onMarkRead={handleMarkRead}
        />

        <ReportDetailHero
          title={title}
          createdAt={createdAt}
          leadParagraphs={leadParagraphs}
          topicsCovered={topicsCovered}
        />

        <div className="mt-12 grid gap-8 xl:grid-cols-[minmax(0,1.65fr)_360px]">
          <section className="space-y-8">
            <ReportExecutiveSummaryCard
              day={day}
              sourcesCount={sourcesCount}
              citationCount={citations.length}
              isRead={isRead}
            />
            <ReportBodySection markdown={markdown} />
          </section>

          <ReportDetailSidebar
            id={id}
            createdAt={createdAt}
            isRead={isRead}
            runId={runId}
            topicsCovered={topicsCovered}
            citations={citations}
          />
        </div>
      </ResultsContainer>
    </ResultsRouteShell>
  );
}

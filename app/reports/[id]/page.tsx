import { notFound } from 'next/navigation';
import { requireSessionWorkspace } from '@/server/auth/workspaceContext';
import { getReportById } from '@/server/repos/report.repo';
import ReportDetailClient from './ReportDetailClient';

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const scope = await requireSessionWorkspace();

  const report = await getReportById(scope, id);
  if (!report) {
    notFound();
  }

  const content = report.content as {
    markdown?: string;
    title?: string;
    executiveSummary?: string;
    sourcesCount?: number;
    topicsCovered?: string[];
  };

  return (
    <ReportDetailClient
      id={report.id}
      title={content.title || report.title}
      day={report.day}
      markdown={content.markdown || ''}
      sourcesCount={content.sourcesCount ?? 0}
      topicsCovered={content.topicsCovered ?? []}
      isRead={!!report.read_at}
    />
  );
}

import { notFound } from 'next/navigation';
import { requireSessionWorkspace } from '@/server/auth/workspaceContext';
import { getReportById } from '@/server/repos/report.repo';
import { readReportDetail } from '../reportsViewModel';
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

  const detail = readReportDetail(report);

  return (
    <ReportDetailClient
      id={detail.id}
      title={detail.title}
      createdAt={detail.createdAt}
      day={detail.day}
      markdown={detail.markdown}
      summaryLines={detail.summaryLines}
      summaryPreview={detail.summaryPreview}
      citations={detail.citations}
      sourcesCount={detail.sourcesCount ?? 0}
      topicsCovered={detail.topicsCovered}
      isRead={!detail.isUnread}
      runId={detail.runId}
    />
  );
}

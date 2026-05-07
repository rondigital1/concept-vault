import type { ReportCitation } from '../reportsViewModel';

export type ReportDetailClientProps = {
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
};

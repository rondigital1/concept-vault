import { listReports } from '@/server/repos/report.repo';
import { requireSessionWorkspace } from '@/server/auth/workspaceContext';
import { ReportsWorkspace } from './ReportsWorkspace';
import { readReportSummary } from './reportsViewModel';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ReportsPage() {
  const scope = await requireSessionWorkspace();
  const reports = await listReports(scope);
  return <ReportsWorkspace reports={reports.map(readReportSummary)} />;
}

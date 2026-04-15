import { client } from '@/db';
import { ensureSchema } from '@/db/schema';
import { listReports } from '@/server/repos/report.repo';
import { ReportsWorkspace } from './ReportsWorkspace';
import { readReportSummary } from './reportsViewModel';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ReportsPage() {
  try {
    const schemaResult = await ensureSchema(client);
    if (!schemaResult.ok) {
      throw new Error(schemaResult.error || 'Failed to initialize database');
    }

    const reports = await listReports();
    return <ReportsWorkspace reports={reports.map(readReportSummary)} />;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';

    return (
      <main className="flex min-h-screen items-center justify-center bg-[#131313] px-6 py-16 text-[#ece9e8]">
        <div className="max-w-lg rounded-[30px] bg-[#1d1d1d] px-8 py-10 text-center shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#2a2a2a] text-[#f1eded]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-8 w-8" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75M12 17.25h.01" />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m10.37 3.68-7.2 12.48a1.5 1.5 0 0 0 1.3 2.25h14.4a1.5 1.5 0 0 0 1.3-2.25l-7.2-12.48a1.5 1.5 0 0 0-2.6 0Z"
              />
            </svg>
          </div>
          <p className="mt-8 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[#8f8888]">Archive unavailable</p>
          <h1 className="mt-4 text-[2.25rem] font-black tracking-[-0.06em] text-white">Database offline</h1>
          <p className="mt-5 whitespace-pre-line text-[1rem] leading-7 text-[#beb5b5]">{message}</p>
        </div>
      </main>
    );
  }
}

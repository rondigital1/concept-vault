import Link from 'next/link';
import { getTodayView } from '@/server/services/today.service';
import { TodayClient } from './TodayClient';
import { TodayBackground } from './TodayBackground';

type PageProps = {
  searchParams?: Promise<{ runId?: string }>;
};

export default async function TodayPage(props: PageProps) {
  const searchParams = await props.searchParams;

  const today = await getTodayView();

  return (
    <>
      <TodayBackground />
      <TodayClient />
      <main className="min-h-screen pb-64 relative overflow-hidden">
        {/* Ambient Background Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-white/[0.02] blur-[120px] rounded-full pointer-events-none" />

        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 flex flex-col items-center justify-center min-h-[70vh] gap-20 relative z-10">
          {/* Header */}
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="space-y-2">
              <h1 className="text-9xl font-black text-white tracking-tighter drop-shadow-2xl">Today</h1>
              <p className="text-3xl font-light text-zinc-400 tracking-wide uppercase">{today.date}</p>
            </div>
          </div>

          <div className="flex items-center gap-12">
            <form action="/api/runs/distill" method="POST">
              <button
                type="submit"
                className="group relative overflow-hidden rounded-3xl bg-white px-12 py-10 transition-all duration-500 hover:scale-[1.02] hover:shadow-[0_0_50px_rgba(255,255,255,0.2)]"
              >
                <div className="absolute inset-0 bg-zinc-100 opacity-0 transition-opacity group-hover:opacity-100" />
                <span className="relative z-10 text-6xl font-black text-black tracking-tight">
                  Distill
                </span>
              </button>
            </form>
            <Link
              href="/today"
              className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 px-12 py-10 backdrop-blur-md transition-all duration-500 hover:scale-[1.02] hover:bg-white/10 hover:border-white/20 hover:shadow-[0_0_50px_rgba(255,255,255,0.1)]"
            >
              <span className="relative z-10 text-6xl font-black text-white tracking-tight">
                Run
              </span>
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}

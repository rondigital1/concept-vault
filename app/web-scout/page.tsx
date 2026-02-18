import Link from 'next/link';
import { TodayBackground } from '@/app/today/TodayBackground';
import { WebScoutRunClient } from './WebScoutRunClient';
import { SourceWatchlistPanel } from './SourceWatchlistPanel';

export default function WebScoutPage() {
  return (
    <>
      <TodayBackground />
      <main className="min-h-screen pb-16 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-white/3 blur-[100px] rounded-full pointer-events-none" />
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 relative z-10">
          <header className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Web Scout Run</h1>
              <p className="text-zinc-400 mt-1">
                Live timeline of each step while Web Scout is processing.
              </p>
            </div>
            <Link
              href="/today"
              className="text-sm text-zinc-300 bg-zinc-800 px-3 py-1.5 rounded-lg hover:bg-zinc-700 transition-colors"
            >
              Back to Today
            </Link>
          </header>
          <SourceWatchlistPanel />
          <div className="h-5" />
          <WebScoutRunClient />
        </div>
      </main>
    </>
  );
}

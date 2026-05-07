import Link from 'next/link';

type Props = {
  favoriteCount: number;
  cleanupCount: number;
  researchCount: number;
};

export function LibraryDashboardFooter({
  favoriteCount,
  cleanupCount,
  researchCount,
}: Props) {
  return (
    <footer className="mt-12 rounded-[24px] bg-[#171717] px-5 py-5 sm:px-6">
      <div className="flex flex-col gap-4 text-[0.64rem] font-semibold uppercase tracking-[0.22em] text-[#7d7676] lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-5">
          <span>Memory_Status: Optimal</span>
          <span>Favorites: {favoriteCount}</span>
          <span>Cleanup_Queue: {cleanupCount}</span>
          <span>Research_Imports: {researchCount}</span>
        </div>
        <div className="flex flex-wrap gap-5">
          <Link href="/today" className="transition hover:text-white">
            Research
          </Link>
          <Link href="/reports" className="transition hover:text-white">
            Results
          </Link>
          <Link href="/ingest" className="transition hover:text-white">
            Add Content
          </Link>
        </div>
      </div>
    </footer>
  );
}

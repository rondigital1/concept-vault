import Link from 'next/link';

export function ReportsFooter() {
  return (
    <footer className="mt-[4.5rem] border-t border-white/5 py-10">
      <div className="flex flex-col gap-4 text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#777171] sm:flex-row sm:items-center sm:justify-between">
        <p>© Concept Vault research unit. Approved outputs remain human-directed and reviewable.</p>
        <div className="flex flex-wrap gap-6">
          <Link href="/today" className="transition hover:text-white">
            Research
          </Link>
          <Link href="/library" className="transition hover:text-white">
            Library
          </Link>
          <Link href="/ingest" className="transition hover:text-white">
            Ingest
          </Link>
        </div>
      </div>
    </footer>
  );
}

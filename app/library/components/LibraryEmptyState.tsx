import Link from 'next/link';

export function LibraryEmptyState() {
  return (
    <section className="rounded-[32px] bg-[#191919] px-6 py-10 shadow-[0_24px_80px_rgba(0,0,0,0.32)] sm:px-10 sm:py-12">
      <div className="mb-4 flex items-center gap-3 text-[0.68rem] font-bold uppercase tracking-[0.26em] text-[#8f8888]">
        <span className="rounded-full bg-[#232323] px-3 py-1.5 text-[#ddd8d8]">Repository cold start</span>
        <span>Status: awaiting first source</span>
      </div>
      <h1 className="max-w-4xl text-[clamp(2.4rem,5vw,4.6rem)] font-black tracking-[-0.08em] text-white leading-[0.96]">
        The library is still empty.
      </h1>
      <p className="mt-6 max-w-2xl text-[1.08rem] leading-8 text-[#b7b0b0]">
        Add content from the ingest flow or save approved research imports to populate the document repository.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/ingest"
          className="inline-flex items-center justify-center rounded-full bg-[#efeded] px-5 py-3 text-[0.7rem] font-bold uppercase tracking-[0.28em] text-[#171717] transition hover:bg-white"
        >
          Add_Content
        </Link>
        <Link
          href="/today"
          className="inline-flex items-center justify-center rounded-full bg-[#232323] px-5 py-3 text-[0.7rem] font-bold uppercase tracking-[0.28em] text-[#ddd7d7] transition hover:bg-[#2c2c2c] hover:text-white"
        >
          Open_Research
        </Link>
      </div>
    </section>
  );
}

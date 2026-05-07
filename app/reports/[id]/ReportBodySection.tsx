import dynamic from 'next/dynamic';

const DocumentMarkdown = dynamic(() => import('@/app/library/[id]/DocumentMarkdown'), {
  loading: () => <div className="h-96 animate-pulse rounded-[24px] bg-[#111111]" />,
});

type Props = {
  markdown: string;
};

export function ReportBodySection({ markdown }: Props) {
  return (
    <section className="rounded-[30px] bg-[#1d1d1d] px-6 py-7 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:px-10 sm:py-10">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.28em] text-[#8f8888]">
            Full dossier
          </p>
          <h2 className="mt-2 text-[2rem] font-black tracking-[-0.06em] text-white">
            Report body
          </h2>
        </div>
        <div className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#8f8888]">
          Markdown preserved for long-form review
        </div>
      </div>

      <div className="max-w-3xl">
        {markdown.trim().length > 0 ? (
          <DocumentMarkdown content={markdown} />
        ) : (
          <div className="rounded-[22px] bg-[#111111] px-5 py-5">
            <p className="text-[0.7rem] font-bold uppercase tracking-[0.24em] text-[#d9d1d1]">
              Markdown unavailable
            </p>
            <p className="mt-3 text-[0.96rem] leading-7 text-[#beb5b5]">
              The full markdown body was not saved with this report. The summary and metadata
              remain available on this page, and the artifact record still preserves the raw payload
              trail.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

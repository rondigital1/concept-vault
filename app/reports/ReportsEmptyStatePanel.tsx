import { ResultsActionLink } from './resultsActions';
import { ResultsIcon } from './resultsIcons';
import { ResultsSidePanel } from './resultsUi';

export function ReportsEmptyStatePanel() {
  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1.65fr)_360px]">
      <section className="rounded-[30px] bg-[#1d1d1d] px-6 py-7 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:px-10 sm:py-10">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f1eded] text-[#161616]">
          <ResultsIcon name="archive" className="h-6 w-6" />
        </div>
        <p className="mt-8 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[#918b8b]">No approved dossiers</p>
        <h2 className="mt-4 max-w-2xl text-[clamp(2rem,5vw,3.5rem)] font-black tracking-[-0.07em] text-white">The reports archive is still empty.</h2>
        <p className="mt-6 max-w-3xl text-[1.05rem] leading-8 text-[#b7b0b0]">
          Generate a report from Research after enough vetted evidence has been approved. The finished synthesis will land here as a persistent dossier with topic coverage, sources, and a direct path back into the workflow.
        </p>
      </section>

      <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
        <ResultsSidePanel title="Archive actions">
          <p className="mt-4 text-[0.98rem] leading-7 text-[#beb5b5]">
            Open Research to run the next synthesis cycle, or add more material into the vault before generating the first report.
          </p>
        </ResultsSidePanel>

        <div className="space-y-3">
          <ResultsActionLink href="/today" label="Open Research" icon="research" tone="primary" fullWidth />
          <ResultsActionLink href="/ingest" label="Add Content" icon="plus" fullWidth />
          <ResultsActionLink href="/library" label="Open Library" icon="library" fullWidth />
        </div>
      </aside>
    </div>
  );
}

import type { ArtifactRow } from '@/server/repos/artifacts.repo';
import { resultsActionClassName } from '@/app/reports/resultsActions';
import { ResultsPill } from '@/app/reports/resultsUi';

type Props = {
  artifact: ArtifactRow;
};

export function ArtifactReviewPanel({ artifact }: Props) {
  if (artifact.status !== 'proposed') {
    return null;
  }

  return (
    <section className="rounded-[28px] bg-[#1d1d1d] px-6 py-7 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:px-10 sm:py-10">
      <div className="mb-4 flex items-center gap-3">
        <ResultsPill tone="warning">Review required</ResultsPill>
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#8f8888]">Queue action available</p>
      </div>
      <p className="max-w-3xl text-[1rem] leading-8 text-[#beb5b5]">
        Review this item here, or return to Research to continue triaging the broader queue. Approve and reject actions preserve the existing workflow behavior.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <form action={`/api/artifacts/${artifact.id}/approve`} method="POST" className="sm:flex-1">
          <button type="submit" className={resultsActionClassName('success', true)}>
            {artifact.kind === 'web-proposal' ? 'Save source' : 'Approve'}
          </button>
        </form>
        <form action={`/api/artifacts/${artifact.id}/reject`} method="POST" className="sm:flex-1">
          <button type="submit" className={resultsActionClassName('danger', true)}>
            {artifact.kind === 'web-proposal' ? 'Dismiss' : 'Reject'}
          </button>
        </form>
      </div>
    </section>
  );
}

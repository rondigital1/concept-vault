import {
  ResultsMetadataRow,
  ResultsPill,
  ResultsTopicChip,
  resultsActionClassName,
} from '@/app/reports/resultsUi';
import { trimIdentifier } from '@/app/reports/reportsViewModel';
import type { readArtifactOverview } from '@/app/reports/artifactOverview';
import type { ArtifactRow } from '@/server/repos/artifacts.repo';
import {
  formatDateTime,
  formatKindLabel,
  formatStatusLabel,
  safeJson,
} from './artifactDetailFormatting';

type ArtifactOverview = ReturnType<typeof readArtifactOverview>;

function ReviewActionPanel({ artifact }: { artifact: ArtifactRow }) {
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

function ArtifactSummaryCard({
  artifact,
  overview,
}: {
  artifact: ArtifactRow;
  overview: ArtifactOverview;
}) {
  return (
    <article className="relative overflow-hidden rounded-[30px] bg-[#1d1d1d] px-6 py-7 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:px-10 sm:py-10">
      <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-white/[0.04] blur-3xl" />
      <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-[0.72rem] font-bold uppercase tracking-[0.28em] text-white">{overview.summaryTitle}</p>
          <p className="mt-2 text-[0.78rem] uppercase tracking-[0.2em] text-[#8b8484]">{formatKindLabel(artifact.kind)} artifact · {artifact.agent}</p>
        </div>
        {overview.statusNotice ? <ResultsPill tone="success">Saved to library</ResultsPill> : null}
      </div>

      <p className="max-w-3xl text-[1.08rem] leading-9 text-[#ece8e5]">{overview.summaryCopy}</p>

      {overview.stats.length > 0 ? (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {overview.stats.map((stat) => (
            <div key={stat.label} className="rounded-[22px] bg-[#111111] px-6 py-6">
              <span className="text-[0.65rem] font-bold uppercase tracking-[0.24em] text-[#7e7777]">{stat.label}</span>
              <div className="mt-3 text-[clamp(1.8rem,4vw,3.2rem)] font-black tracking-normal text-white">{stat.value}</div>
            </div>
          ))}
        </div>
      ) : null}

      {overview.topics.length > 0 ? (
        <div className="mt-8 flex flex-wrap gap-2">
          {overview.topics.map((topic) => (
            <ResultsTopicChip key={topic} topic={topic} />
          ))}
        </div>
      ) : null}

      {overview.reasoning.length > 0 ? (
        <div className="mt-8">
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.28em] text-[#8f8888]">Why it was proposed</p>
          <ul className="mt-4 space-y-3">
            {overview.reasoning.map((entry) => (
              <li key={entry} className="rounded-[22px] bg-[#111111] px-5 py-4 text-[0.98rem] leading-7 text-[#d7d0d0]">
                {entry}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {overview.evidence.length > 0 ? (
        <div className="mt-8">
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.28em] text-[#8f8888]">Supporting evidence</p>
          <ul className="mt-4 space-y-3">
            {overview.evidence.map((entry) => (
              <li key={entry} className="rounded-[22px] bg-[#111111] px-5 py-4 text-[0.98rem] leading-7 text-[#d7d0d0]">
                {entry}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  );
}

export function ArtifactDetailMain({
  artifact,
  overview,
}: {
  artifact: ArtifactRow;
  overview: ArtifactOverview;
}) {
  return (
    <section className="space-y-8">
      <ReviewActionPanel artifact={artifact} />
      <ArtifactSummaryCard artifact={artifact} overview={overview} />

      <section className="rounded-[28px] bg-[#111111] px-6 py-7 shadow-[0_20px_60px_rgba(0,0,0,0.22)] sm:px-8">
        <h2 className="text-[0.7rem] font-bold uppercase tracking-[0.3em] text-[#d7d0d0]">Process metadata</h2>
        <div className="mt-6 space-y-1">
          <ResultsMetadataRow label="Day" value={artifact.day} />
          <ResultsMetadataRow label="Agent" value={artifact.agent.toUpperCase()} />
          <ResultsMetadataRow label="Reviewed" value={formatDateTime(artifact.reviewed_at)} />
          <ResultsMetadataRow label="Run id" value={trimIdentifier(artifact.run_id) ?? 'No run linked'} />
        </div>
      </section>

      <details id="technical-details" className="rounded-[28px] bg-[#1d1d1d] shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
        <summary className="cursor-pointer px-6 py-5 text-[0.72rem] font-bold uppercase tracking-[0.26em] text-[#d7d0d0] transition hover:text-white sm:px-8">
          Technical details
        </summary>
        <div className="border-t border-white/8 px-6 py-6 sm:px-8">
          <section>
            <h2 className="text-[0.68rem] font-bold uppercase tracking-[0.28em] text-[#8f8888]">Metadata</h2>
            <div className="mt-4 space-y-1">
              <ResultsMetadataRow label="Artifact id" value={trimIdentifier(artifact.id, 18) ?? artifact.id} />
              <ResultsMetadataRow label="Created" value={formatDateTime(artifact.created_at)} />
              <ResultsMetadataRow label="Read" value={formatDateTime(artifact.read_at)} />
              <ResultsMetadataRow label="Status" value={formatStatusLabel(artifact.status).toUpperCase()} />
            </div>
          </section>

          <section className="mt-8">
            <h2 className="text-[0.68rem] font-bold uppercase tracking-[0.28em] text-[#8f8888]">Content payload</h2>
            <pre className="mt-4 max-h-[420px] overflow-auto whitespace-pre-wrap break-words rounded-[22px] bg-[#111111] p-4 text-xs text-[#d7d0d0]">
              {safeJson(artifact.content)}
            </pre>
          </section>

          <section className="mt-8">
            <h2 className="text-[0.68rem] font-bold uppercase tracking-[0.28em] text-[#8f8888]">Source refs</h2>
            <pre className="mt-4 max-h-[320px] overflow-auto whitespace-pre-wrap break-words rounded-[22px] bg-[#111111] p-4 text-xs text-[#d7d0d0]">
              {safeJson(artifact.source_refs)}
            </pre>
          </section>
        </div>
      </details>
    </section>
  );
}

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { readArtifactOverview } from '@/app/reports/artifactOverview';
import {
  ResultsActionLink,
  ResultsContainer,
  ResultsMetadataRow,
  ResultsPill,
  ResultsRouteShell,
  ResultsSidePanel,
  ResultsStickyToolbar,
  ResultsTopicChip,
  resultsActionClassName,
} from '@/app/reports/resultsUi';
import { trimIdentifier } from '@/app/reports/reportsViewModel';
import { requireSessionWorkspace } from '@/server/auth/workspaceContext';
import { getArtifactById, type ArtifactRow } from '@/server/repos/artifacts.repo';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageSearchParams = Record<string, string | string[] | undefined>;

function firstQueryParam(value: string | string[] | undefined): string | undefined {
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value) && typeof value[0] === 'string') {
    return value[0];
  }
  return undefined;
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return String(value ?? '');
  }
}

function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) {
    return '—';
  }

  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) {
    return '—';
  }

  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatStatusLabel(status: ArtifactRow['status']): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatKindLabel(kind: string): string {
  const labels: Record<string, string> = {
    'web-proposal': 'Source Candidate',
    concept: 'Concept',
    flashcard: 'Flashcard',
    'research-report': 'Report',
  };

  return labels[kind] ?? kind.replace(/[_-]+/g, ' ');
}

function statusTone(status: ArtifactRow['status']): 'success' | 'warning' | 'muted' {
  if (status === 'approved') {
    return 'success';
  }
  if (status === 'proposed') {
    return 'warning';
  }
  return 'muted';
}

function kindTone(kind: string): 'info' | 'success' | 'warning' | 'muted' {
  if (kind === 'research-report') {
    return 'info';
  }
  if (kind === 'web-proposal') {
    return 'warning';
  }
  if (kind === 'concept') {
    return 'success';
  }
  return 'muted';
}

function renderArtifactRail(args: {
  artifact: ArtifactRow;
  overview: ReturnType<typeof readArtifactOverview>;
}) {
  const { artifact, overview } = args;

  if (artifact.kind === 'research-report') {
    return (
      <ResultsSidePanel title="Verified citations">
        {overview.citations.length > 0 ? (
          <ul className="mt-6 space-y-6">
            {overview.citations.map((citation) => (
              <li key={`${citation.url}-${citation.title}`}>
                <a href={citation.url} target="_blank" rel="noreferrer" className="block transition hover:opacity-80">
                  <div className="text-[0.58rem] font-semibold uppercase tracking-[0.26em] text-[#8d8787]">{citation.source}</div>
                  <div className="mt-2 text-[1rem] leading-7 text-white">{citation.title}</div>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-6 rounded-[22px] border border-white/8 bg-[#171717] px-5 py-5">
            <p className="text-[0.7rem] font-bold uppercase tracking-[0.24em] text-[#d9d1d1]">No parsed citations</p>
            <p className="mt-3 text-[0.96rem] leading-7 text-[#beb5b5]">
              This report artifact does not expose a structured citation preview here. Open the full report or review the raw payload below to inspect the saved source section.
            </p>
          </div>
        )}
      </ResultsSidePanel>
    );
  }

  if (artifact.kind === 'web-proposal') {
    return (
      <ResultsSidePanel title="Source context">
        <div className="mt-6 space-y-5">
          <div>
            <p className="text-[0.64rem] font-semibold uppercase tracking-[0.2em] text-[#7d7878]">Source URL</p>
            {overview.sourceUrl ? (
              <a href={overview.sourceUrl} target="_blank" rel="noreferrer" className="mt-3 block break-all text-[1rem] leading-7 text-white underline decoration-white/20 underline-offset-4 hover:decoration-white/60">
                {overview.sourceUrl}
              </a>
            ) : (
              <p className="mt-3 text-[0.96rem] leading-7 text-[#beb5b5]">No source URL was saved with this proposal.</p>
            )}
          </div>

          {overview.topics.length > 0 ? (
            <div>
              <p className="text-[0.64rem] font-semibold uppercase tracking-[0.2em] text-[#7d7878]">Topics</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {overview.topics.map((topic) => (
                  <ResultsTopicChip key={topic} topic={topic} />
                ))}
              </div>
            </div>
          ) : null}

          {overview.statusNotice ? (
            <div className="rounded-[22px] border border-white/8 bg-[#171717] px-5 py-5">
              <p className="text-[0.96rem] leading-7 text-[#d9ead8]">{overview.statusNotice}</p>
            </div>
          ) : null}
        </div>
      </ResultsSidePanel>
    );
  }

  return (
    <ResultsSidePanel title="Review context">
      {overview.topics.length > 0 ? (
        <div>
          <p className="mt-6 text-[0.64rem] font-semibold uppercase tracking-[0.2em] text-[#7d7878]">Topics</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {overview.topics.map((topic) => (
              <ResultsTopicChip key={topic} topic={topic} />
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-6 text-[0.96rem] leading-7 text-[#beb5b5]">
          This artifact does not expose additional topic or citation context beyond the summary and technical payload.
        </p>
      )}
    </ResultsSidePanel>
  );
}

export default async function ArtifactDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<PageSearchParams> | PageSearchParams;
}) {
  const resolvedSearchParams = await Promise.resolve(searchParams ?? {});
  const artifactActionError = firstQueryParam(resolvedSearchParams.artifactActionError);
  const artifactActionInfo = firstQueryParam(resolvedSearchParams.artifactActionInfo);
  const { id } = await params;
  const scope = await requireSessionWorkspace();

  const artifact = await getArtifactById(scope, id);
  if (!artifact) {
    notFound();
  }

  const overview = readArtifactOverview(artifact);

  return (
    <ResultsRouteShell>
      <ResultsContainer>
        <ResultsStickyToolbar>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3 text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#8f8888]">
              <Link href="/reports" className="text-white transition hover:opacity-75">
                Results system
              </Link>
              <span>/</span>
              <span>{formatKindLabel(artifact.kind)}</span>
              <ResultsPill tone={statusTone(artifact.status)}>{formatStatusLabel(artifact.status)}</ResultsPill>
            </div>

            <div className="flex flex-wrap gap-3">
              {overview.primaryLink ? (
                <ResultsActionLink
                  href={overview.primaryLink.href}
                  label={overview.primaryLink.label}
                  icon={overview.primaryLink.external ? 'external' : artifact.kind === 'research-report' ? 'report' : 'arrow-up-right'}
                  tone="primary"
                  external={overview.primaryLink.external}
                />
              ) : null}
              {overview.secondaryLink ? (
                <ResultsActionLink
                  href={overview.secondaryLink.href}
                  label={overview.secondaryLink.label}
                  icon={overview.secondaryLink.href === '/reports' ? 'report' : 'research'}
                />
              ) : null}
            </div>
          </div>
        </ResultsStickyToolbar>

        <header className="max-w-5xl">
          <div className="mb-4 flex flex-wrap items-center gap-3 text-[0.65rem] font-bold uppercase tracking-[0.26em] text-[#8c8787]">
            <span className="rounded-sm bg-[#2a2a2a] px-3 py-1.5 text-[#ddd8d8]">ARTIFACT_DETAIL: {artifact.agent.toUpperCase()}</span>
            <span>CREATED: {formatDateTime(artifact.created_at)}</span>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <ResultsPill tone={statusTone(artifact.status)}>{formatStatusLabel(artifact.status)}</ResultsPill>
            <ResultsPill tone={kindTone(artifact.kind)}>{formatKindLabel(artifact.kind)}</ResultsPill>
          </div>

          <h1 className="max-w-5xl break-words text-[clamp(2.7rem,7vw,5.2rem)] font-black leading-[0.96] tracking-[-0.085em] text-white">
            {artifact.title}
          </h1>
          <p className="mt-6 max-w-4xl text-[1.08rem] leading-8 text-[#cfc6c6]">{overview.description}</p>
        </header>

        {artifactActionError ? (
          <div className="mt-8 rounded-[24px] border border-[#5a2e2e] bg-[#2a1818] px-5 py-4 text-[0.98rem] text-[#f3cece]">
            {artifactActionError}
          </div>
        ) : null}
        {!artifactActionError && artifactActionInfo ? (
          <div className="mt-8 rounded-[24px] border border-white/8 bg-[#171717] px-5 py-4 text-[0.98rem] text-[#d9ead8]">
            {artifactActionInfo}
          </div>
        ) : null}

        <div className="mt-12 grid gap-8 xl:grid-cols-[minmax(0,1.65fr)_360px]">
          <section className="space-y-8">
            {artifact.status === 'proposed' ? (
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
            ) : null}

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
                      <div className="mt-3 text-[clamp(1.8rem,4vw,3.2rem)] font-black tracking-[-0.06em] text-white">{stat.value}</div>
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

            <section className="rounded-[28px] bg-[#111111] px-6 py-7 shadow-[0_20px_60px_rgba(0,0,0,0.22)] sm:px-8">
              <h2 className="text-[0.7rem] font-bold uppercase tracking-[0.3em] text-[#d7d0d0]">Process metadata</h2>
              <div className="mt-6 space-y-1">
                <ResultsMetadataRow label="Day" value={artifact.day} />
                <ResultsMetadataRow label="Agent" value={artifact.agent.toUpperCase()} />
                <ResultsMetadataRow label="Reviewed" value={formatDateTime(artifact.reviewed_at)} />
                <ResultsMetadataRow label="Run id" value={trimIdentifier(artifact.run_id) ?? 'NO RUN LINKED'} />
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

          <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
            {renderArtifactRail({ artifact, overview })}

            <ResultsSidePanel title="Record metadata" className="bg-[#111111] shadow-[0_20px_60px_rgba(0,0,0,0.22)]">
              <div className="mt-6 space-y-1">
                <ResultsMetadataRow label="Created" value={formatDateTime(artifact.created_at)} />
                <ResultsMetadataRow label="Status" value={formatStatusLabel(artifact.status).toUpperCase()} accent />
                <ResultsMetadataRow label="Kind" value={formatKindLabel(artifact.kind).toUpperCase()} />
                <ResultsMetadataRow label="Run id" value={trimIdentifier(artifact.run_id) ?? 'NO RUN LINKED'} />
                <ResultsMetadataRow label="Artifact id" value={trimIdentifier(artifact.id) ?? artifact.id} />
              </div>
            </ResultsSidePanel>

            <div className="space-y-3">
              {overview.primaryLink ? (
                <ResultsActionLink
                  href={overview.primaryLink.href}
                  label={overview.primaryLink.label}
                  icon={overview.primaryLink.external ? 'external' : artifact.kind === 'research-report' ? 'report' : 'arrow-up-right'}
                  tone="primary"
                  fullWidth
                  external={overview.primaryLink.external}
                />
              ) : null}
              <ResultsActionLink href="/reports" label="Open archive" icon="report" fullWidth />
              <ResultsActionLink href="/today" label="Back to Research" icon="research" fullWidth />
            </div>
          </aside>
        </div>
      </ResultsContainer>
    </ResultsRouteShell>
  );
}

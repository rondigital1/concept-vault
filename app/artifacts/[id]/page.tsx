import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArtifactDetailMain } from './ArtifactDetailMain';
import { ArtifactDetailRail } from './ArtifactDetailRail';
import {
  firstQueryParam,
  formatDateTime,
  formatKindLabel,
  formatStatusLabel,
  kindTone,
  statusTone,
  type PageSearchParams,
} from './artifactDetailFormatting';
import { readArtifactOverview } from '@/app/reports/artifactOverview';
import {
  ResultsActionLink,
  ResultsContainer,
  ResultsPill,
  ResultsRouteShell,
  ResultsStickyToolbar,
} from '@/app/reports/resultsUi';
import { requireSessionWorkspace } from '@/server/auth/workspaceContext';
import { getArtifactById } from '@/server/repos/artifacts.repo';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
            <span className="rounded-sm bg-[#2a2a2a] px-3 py-1.5 text-[#ddd8d8]">
              Artifact detail: {artifact.agent}
            </span>
            <span>Created: {formatDateTime(artifact.created_at)}</span>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <ResultsPill tone={statusTone(artifact.status)}>{formatStatusLabel(artifact.status)}</ResultsPill>
            <ResultsPill tone={kindTone(artifact.kind)}>{formatKindLabel(artifact.kind)}</ResultsPill>
          </div>

          <h1 className="max-w-5xl break-words text-[clamp(2.7rem,7vw,5.2rem)] font-black leading-[0.96] tracking-normal text-white">
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
          <ArtifactDetailMain artifact={artifact} overview={overview} />
          <ArtifactDetailRail artifact={artifact} overview={overview} />
        </div>
      </ResultsContainer>
    </ResultsRouteShell>
  );
}

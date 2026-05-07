import { notFound } from 'next/navigation';
import { readArtifactOverview } from '@/app/reports/artifactOverview';
import { ResultsContainer, ResultsRouteShell } from '@/app/reports/ResultsRouteShell';
import { requireSessionWorkspace } from '@/server/auth/workspaceContext';
import { getArtifactById } from '@/server/repos/artifacts.repo';
import { ArtifactActionNotice } from './ArtifactActionNotice';
import { ArtifactHeader } from './ArtifactHeader';
import { ArtifactProcessMetadataPanel } from './ArtifactMetadataPanels';
import { ArtifactReviewPanel } from './ArtifactReviewPanel';
import { ArtifactSidebar } from './ArtifactSidebar';
import { ArtifactSummaryCard } from './ArtifactSummaryCard';
import { ArtifactTechnicalDetails } from './ArtifactTechnicalDetails';
import { ArtifactToolbar } from './ArtifactToolbar';
import { firstQueryParam, type PageSearchParams } from './artifactFormatting';

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
        <ArtifactToolbar artifact={artifact} overview={overview} />
        <ArtifactHeader artifact={artifact} overview={overview} />
        <ArtifactActionNotice error={artifactActionError} info={artifactActionInfo} />

        <div className="mt-12 grid gap-8 xl:grid-cols-[minmax(0,1.65fr)_360px]">
          <section className="space-y-8">
            <ArtifactReviewPanel artifact={artifact} />
            <ArtifactSummaryCard artifact={artifact} overview={overview} />
            <ArtifactProcessMetadataPanel artifact={artifact} />
            <ArtifactTechnicalDetails artifact={artifact} />
          </section>

          <ArtifactSidebar artifact={artifact} overview={overview} />
        </div>
      </ResultsContainer>
    </ResultsRouteShell>
  );
}

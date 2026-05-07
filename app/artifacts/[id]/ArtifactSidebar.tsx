import type { ArtifactRow } from '@/server/repos/artifacts.repo';
import type { readArtifactOverview } from '@/app/reports/artifactOverview';
import { ResultsActionLink } from '@/app/reports/resultsActions';
import { ArtifactContextRail } from './ArtifactContextRail';
import { ArtifactRecordMetadataPanel } from './ArtifactMetadataPanels';

type Props = {
  artifact: ArtifactRow;
  overview: ReturnType<typeof readArtifactOverview>;
};

export function ArtifactSidebar({ artifact, overview }: Props) {
  return (
    <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
      <ArtifactContextRail artifact={artifact} overview={overview} />

      <ArtifactRecordMetadataPanel artifact={artifact} />

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
  );
}

import Link from 'next/link';
import type { ArtifactRow } from '@/server/repos/artifacts.repo';
import type { readArtifactOverview } from '@/app/reports/artifactOverview';
import { ResultsStickyToolbar } from '@/app/reports/ResultsRouteShell';
import { ResultsActionLink } from '@/app/reports/resultsActions';
import { ResultsPill } from '@/app/reports/resultsUi';
import {
  artifactStatusTone,
  formatArtifactKindLabel,
  formatArtifactStatusLabel,
} from './artifactFormatting';

type Props = {
  artifact: ArtifactRow;
  overview: ReturnType<typeof readArtifactOverview>;
};

export function ArtifactToolbar({ artifact, overview }: Props) {
  return (
    <ResultsStickyToolbar>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3 text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#8f8888]">
          <Link href="/reports" className="text-white transition hover:opacity-75">
            Results system
          </Link>
          <span>/</span>
          <span>{formatArtifactKindLabel(artifact.kind)}</span>
          <ResultsPill tone={artifactStatusTone(artifact.status)}>
            {formatArtifactStatusLabel(artifact.status)}
          </ResultsPill>
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
  );
}

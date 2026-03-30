'use client';

import Link from 'next/link';
import { MetadataDrawer } from './MetadataDrawer';
import type { LatestReportPreview } from './types';
import { formatShortDate } from './utils';
import {
  primaryButtonClass,
  sectionLabelClass,
  secondaryButtonClass,
  StatusChip,
} from './WorkspaceHeaderPrimitives';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  latestReport: LatestReportPreview | null;
  topicName: string | null;
};

export function ReportMetadataDrawer({ isOpen, onClose, latestReport, topicName }: Props) {
  const description = latestReport
    ? `Quick report context for ${topicName ?? 'this topic'}. Open the full report when you need the full output.`
    : 'This topic does not have a saved report yet.';

  return (
    <MetadataDrawer
      title={latestReport?.title ?? 'Latest report'}
      description={description}
      isOpen={isOpen}
      onClose={onClose}
    >
      {latestReport ? (
        <div className="space-y-8 pb-10">
          <section>
            <p className={sectionLabelClass}>Report summary</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusChip label={formatShortDate(latestReport.createdAt)} />
              {typeof latestReport.sourcesCount === 'number' ? (
                <StatusChip
                  label={`${latestReport.sourcesCount} approved source${latestReport.sourcesCount === 1 ? '' : 's'}`}
                />
              ) : null}
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-700">
              {latestReport.preview ?? 'Open the full report to read the finished synthesis for this topic.'}
            </p>
          </section>

          {latestReport.topicsCovered.length > 0 ? (
            <section>
              <p className={sectionLabelClass}>Topics covered</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {latestReport.topicsCovered.map((topic) => (
                  <StatusChip key={topic} label={topic} />
                ))}
              </div>
            </section>
          ) : null}

          <section>
            <p className={sectionLabelClass}>Open full output</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href={latestReport.link} className={primaryButtonClass}>
                Open report
              </Link>
              <Link href="/reports" className={secondaryButtonClass}>
                All reports
              </Link>
            </div>
          </section>
        </div>
      ) : (
        <div className="py-10 text-sm text-slate-600">
          Save more evidence and run report generation to populate this surface.
        </div>
      )}
    </MetadataDrawer>
  );
}

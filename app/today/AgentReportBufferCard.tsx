'use client';

import Link from 'next/link';
import { WorkspaceIcon } from './EvidenceWorkspaceIcon';
import { StatusChip, textLinkClass } from './WorkspaceHeaderPrimitives';
import type { SelectedTopicSummary } from './types';
import { formatShortDate } from './utils';

type Props = {
  selectedTopic: SelectedTopicSummary | null;
  savedCount: number;
  recentRunCount: number;
  generateReportHref: string | null;
};

export function AgentReportBufferCard({
  selectedTopic,
  savedCount,
  recentRunCount,
  generateReportHref,
}: Props) {
  return (
    <article className="today-panel today-panel-high col-span-12 md:col-span-4 xl:col-span-4 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="today-glass flex h-10 w-10 items-center justify-center rounded-full outline outline-1 outline-[rgba(255,255,255,0.08)]">
          <WorkspaceIcon
            name="report"
            className="h-[18px] w-[18px] text-[color:var(--today-accent-strong)]"
          />
        </div>
        <StatusChip
          label={
            selectedTopic?.latestReport
              ? formatShortDate(selectedTopic.latestReport.createdAt)
              : 'No report'
          }
        />
      </div>

      <div className="mt-8">
        <h3 className="text-2xl font-semibold tracking-[-0.04em] text-[color:var(--today-accent-strong)]">
          {selectedTopic?.latestReport?.title ?? 'Report buffer'}
        </h3>
        <p className="mt-3 text-sm leading-6 text-[color:var(--today-muted)]">
          {selectedTopic?.latestReport?.preview ??
            (selectedTopic?.isReady
              ? 'Enough evidence is saved. Generate the next report to synthesize the current queue.'
              : 'Keep reviewing evidence until this topic crosses the report threshold.')}
        </p>
      </div>

      <div className="mt-8 flex items-end gap-6">
        <MetricPair value={String(savedCount)} label="saved sources" />
        <MetricPair value={String(selectedTopic?.linkedDocumentCount ?? 0)} label="linked docs" />
        <MetricPair value={String(recentRunCount)} label="recent runs" />
      </div>

      <div className="mt-8">
        {selectedTopic?.latestReport ? (
          <Link href={selectedTopic.latestReport.link} className={textLinkClass}>
            Open current report
          </Link>
        ) : generateReportHref ? (
          <Link href={generateReportHref} className={textLinkClass}>
            Generate report
          </Link>
        ) : (
          <span className="text-sm text-[color:var(--today-muted)]">
            Report output unlocks after more evidence is approved.
          </span>
        )}
      </div>
    </article>
  );
}

function MetricPair({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-xl font-bold text-[color:var(--today-text)]">{value}</div>
      <div className="mt-1 text-[9px] uppercase tracking-[0.18em] text-[color:var(--today-muted)]">
        {label}
      </div>
    </div>
  );
}

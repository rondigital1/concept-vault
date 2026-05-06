import Link from 'next/link';
import { StatusBadge } from '@/app/components/StatusBadge';
import {
  primaryButtonClass,
  secondaryButtonClass,
  sectionLabelClass,
} from '@/app/today/WorkspaceHeaderPrimitives';
import {
  accentPillClass,
  subtlePillClass,
  surfacePanelClass,
} from '../styles';
import type { BatchSummaryText } from '../batchPresentation';
import { RunIssuePreview } from './RunIssueMessages';

export function BatchSummaryPanel({
  currentStatus,
  runModeLabel,
  summaryText,
  isStarting,
  webProposalCount,
  researchHref,
  reviewQueueHref,
  issueMessages,
  onStartRun,
}: {
  currentStatus: string;
  runModeLabel: string;
  summaryText: BatchSummaryText;
  isStarting: boolean;
  webProposalCount: number;
  researchHref: string;
  reviewQueueHref: string;
  issueMessages: string[];
  onStartRun: () => void;
}) {
  return (
    <div className={`${surfacePanelClass} p-6`}>
      <p className={sectionLabelClass}>Run summary</p>
      <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={currentStatus} />
            <span className={subtlePillClass}>
              {runModeLabel}
            </span>
            <span className={accentPillClass}>
              Scope: All eligible topics
            </span>
          </div>
          <h2 className="mt-4 text-2xl font-semibold text-[color:var(--today-text)]">{summaryText.headline}</h2>
          <p className="mt-2 text-sm leading-7 text-[color:var(--today-text-soft)]">{summaryText.description}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          {!isStarting && webProposalCount > 0 && (
            <Link
              href={reviewQueueHref}
              className={primaryButtonClass}
            >
              Review Queue
            </Link>
          )}
          <Link
            href={researchHref}
            className={secondaryButtonClass}
          >
            Back to Research
          </Link>
          <button
            type="button"
            onClick={() => {
              onStartRun();
            }}
            disabled={isStarting}
            className={secondaryButtonClass}
          >
            {isStarting ? 'Running...' : 'Run Again'}
          </button>
        </div>
      </div>

      <RunIssuePreview issueMessages={issueMessages} />
    </div>
  );
}

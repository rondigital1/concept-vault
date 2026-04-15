'use client';

import Link from 'next/link';
import { FindSourcesButton } from './FindSourcesButton';
import { MetadataDrawer } from './MetadataDrawer';
import type { SelectedTopicSummary, TopicWorkflowSummary } from './types';
import { formatRunLabel, formatShortDate } from './utils';
import {
  DisabledHeaderAction,
  elevatedPanelClass,
  HeaderActionLink,
  sectionLabelClass,
  StatusChip,
  textLinkClass,
} from './WorkspaceHeaderPrimitives';

function formatDate(value: string | null, emptyLabel: string): string {
  if (!value) {
    return emptyLabel;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return emptyLabel;
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

type Props = {
  isOpen: boolean;
  onClose: () => void;
  selectedTopic: SelectedTopicSummary | null;
  workflowSummary: TopicWorkflowSummary;
  runDetailsHref: string;
  refreshTopicHref: string;
  generateReportHref: string | null;
  extractConceptsHref: string;
};

export function TopicMetadataDrawer({
  isOpen,
  onClose,
  selectedTopic,
  workflowSummary,
  runDetailsHref,
  refreshTopicHref,
  generateReportHref,
  extractConceptsHref,
}: Props) {
  const description = selectedTopic
    ? 'Research brief, workflow stage, and topic-level actions live here so the review surface stays focused.'
    : 'Select a topic to inspect metadata and workflow controls.';

  return (
    <MetadataDrawer
      title={selectedTopic?.name ?? 'Topic info'}
      description={description}
      isOpen={isOpen}
      onClose={onClose}
    >
      {selectedTopic ? (
        <div className="space-y-8 pb-10">
          <section>
            <p className={sectionLabelClass}>Research brief</p>
            <p className="mt-3 text-sm leading-7 text-[color:var(--today-text-soft)]">{selectedTopic.goal}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <StatusChip label={`${selectedTopic.linkedDocumentCount} linked docs`} />
              <StatusChip label={`${selectedTopic.pendingCount} pending`} tone="pending" />
              <StatusChip label={`${selectedTopic.savedCount} saved`} />
              <StatusChip
                label={selectedTopic.isReady ? 'Ready for report' : 'Needs more evidence'}
                tone={selectedTopic.isReady ? 'ready' : 'pending'}
              />
            </div>
          </section>

          {selectedTopic.focusTags.length > 0 ? (
            <section>
              <p className={sectionLabelClass}>Focus tags</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedTopic.focusTags.map((tag) => (
                  <StatusChip key={tag} label={tag} />
                ))}
              </div>
            </section>
          ) : null}

          <section className={`${elevatedPanelClass} rounded-[24px] p-5`}>
            <p className={sectionLabelClass}>Workflow stage</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StatusChip label={workflowSummary.stageLabel} tone={workflowSummary.stageTone} />
              <StatusChip label={`Mode: ${workflowSummary.modeLabel}`} />
            </div>
            <p className="mt-4 text-base font-semibold text-[color:var(--today-text)]">{workflowSummary.stageLabel}</p>
            <p className="mt-2 text-sm leading-6 text-[color:var(--today-muted)]">{workflowSummary.stageDescription}</p>
            <p className="mt-3 text-sm font-medium text-[color:var(--today-text-soft)]">{workflowSummary.modeDescription}</p>
          </section>

          <section>
            <p className={sectionLabelClass}>Context</p>
            <dl className="mt-3 space-y-3 text-sm text-[color:var(--today-muted)]">
              <div className="flex items-start justify-between gap-4">
                <dt>Last report</dt>
                <dd className="text-right font-medium text-[color:var(--today-text)]">
                  {selectedTopic.lastReportAt ? formatShortDate(selectedTopic.lastReportAt) : 'No report yet'}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt>Last run</dt>
                <dd className="text-right font-medium text-[color:var(--today-text)]">
                  {selectedTopic.lastRunMode
                    ? `${formatRunLabel(selectedTopic.lastRunMode)} · ${formatDate(selectedTopic.lastRunAt, 'No recent run')}`
                    : 'No recent run'}
                </dd>
              </div>
            </dl>
          </section>

          <section>
            <p className={sectionLabelClass}>Actions</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <FindSourcesButton scope="topic" topicId={selectedTopic.id} topicName={selectedTopic.name} emphasis="primary" />
              {generateReportHref ? (
                <HeaderActionLink href={generateReportHref} label="Generate report" tone="secondary" />
              ) : (
                <DisabledHeaderAction
                  label="Generate report"
                  hint="Save more evidence before generating a report."
                />
              )}
              <HeaderActionLink href={refreshTopicHref} label="Refresh topic" tone="secondary" />
              <HeaderActionLink href={extractConceptsHref} label="Extract concepts" tone="tertiary" />
              <Link href={runDetailsHref} className={textLinkClass}>
                Open run details
              </Link>
            </div>
          </section>
        </div>
      ) : (
        <div className="py-10 text-sm text-[color:var(--today-muted)]">No topic selected.</div>
      )}
    </MetadataDrawer>
  );
}

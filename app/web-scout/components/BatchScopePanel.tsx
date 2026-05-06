import Link from 'next/link';
import {
  secondaryButtonClass,
  sectionLabelClass,
} from '@/app/today/WorkspaceHeaderPrimitives';
import {
  insetPanelClass,
  issuePanelClass,
  subtlePillClass,
  surfacePanelClass,
} from '../styles';
import type { BatchTopicOption } from '../types';

export function BatchScopePanel({
  batchTopicOptions,
  batchTopicsError,
  requestedMaxTopics,
  minimumLinkedDocumentsForReport,
}: {
  batchTopicOptions: BatchTopicOption[];
  batchTopicsError: string | null;
  requestedMaxTopics: number;
  minimumLinkedDocumentsForReport: number;
}) {
  const previewTopics = batchTopicOptions.slice(0, requestedMaxTopics);

  return (
    <div className={`${surfacePanelClass} p-5`}>
      <div className="flex flex-col gap-3">
        <div>
          <p className={sectionLabelClass}>Batch scope</p>
          <h2 className="mt-2 text-xl font-semibold text-[color:var(--today-text)]">
            All active topics that still need more sources
          </h2>
          <p className="mt-2 text-sm text-[color:var(--today-muted)]">
            This batch runs Find Sources inline for topics below the {minimumLinkedDocumentsForReport}-document readiness threshold.
          </p>
        </div>

        {batchTopicsError && (
          <div className={`${issuePanelClass} text-sm text-[#ffdada]`}>
            {batchTopicsError}
          </div>
        )}

        {!batchTopicsError && batchTopicOptions.length === 0 && (
          <div className={`${insetPanelClass} p-4 text-sm text-[color:var(--today-text-soft)]`}>
            No active topics currently need more sources. Topics reappear here when they fall below the readiness threshold.
          </div>
        )}

        {!batchTopicsError && batchTopicOptions.length > 0 && (
          <>
            <p className="text-sm text-[color:var(--today-text-soft)]">
              Previewing {previewTopics.length} of {batchTopicOptions.length} eligible topic{batchTopicOptions.length === 1 ? '' : 's'}.
            </p>
            <div className="space-y-3">
              {previewTopics.map((topic) => (
                <div
                  key={topic.id}
                  className={`${insetPanelClass} p-4`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-[color:var(--today-text)]">{topic.name}</p>
                    <span className={subtlePillClass}>
                      {topic.linkedDocumentCount} linked doc{topic.linkedDocumentCount === 1 ? '' : 's'}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-[color:var(--today-text-soft)]">{topic.goal}</p>
                  {topic.focusTags.length > 0 && (
                    <p className="mt-2 text-xs text-[color:var(--today-muted)]">
                      Focus tags: {topic.focusTags.slice(0, 6).join(', ')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/web-scout?runMode=scout_only"
            className={secondaryButtonClass}
          >
            Use Vault-Wide Scout Instead
          </Link>
        </div>
      </div>
    </div>
  );
}

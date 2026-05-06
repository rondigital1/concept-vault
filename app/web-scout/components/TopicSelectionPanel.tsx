import {
  primaryButtonClass,
  sectionLabelClass,
} from '@/app/today/WorkspaceHeaderPrimitives';
import { formatShortDate } from '../formatting';
import {
  accentPillClass,
  insetPanelClass,
  issuePanelClass,
  subtlePillClass,
  surfacePanelClass,
} from '../styles';
import type { ReportTopicOption } from '../types';

export function TopicSelectionPanel({
  reportTopicOptions,
  reportTopicsError,
  minimumLinkedDocumentsForReport,
}: {
  reportTopicOptions: ReportTopicOption[];
  reportTopicsError: string | null;
  minimumLinkedDocumentsForReport: number;
}) {
  return (
    <div className={`${surfacePanelClass} p-5`}>
      <div className="flex flex-col gap-3">
        <div>
          <p className={sectionLabelClass}>Choose report topic</p>
          <h2 className="mt-2 text-xl font-semibold text-[color:var(--today-text)]">
            Select an existing topic with enough source material
          </h2>
          <p className="mt-2 text-sm text-[color:var(--today-muted)]">
            Only topics with at least {minimumLinkedDocumentsForReport} linked documents are shown here so the report has enough context to be worth generating.
          </p>
        </div>

        {reportTopicsError && (
          <div className={`${issuePanelClass} text-sm text-[#ffdada]`}>
            {reportTopicsError}
          </div>
        )}

        {!reportTopicsError && reportTopicOptions.length === 0 && (
          <div className={`${insetPanelClass} p-4 text-sm text-[color:var(--today-text-soft)]`}>
            No saved topics are ready to generate yet. Link more documents to a topic from Research, then try again.
          </div>
        )}

        {!reportTopicsError && reportTopicOptions.length > 0 && (
          <form action="/web-scout" method="GET" className="space-y-4">
            <input type="hidden" name="runMode" value="full_report" />
            <div className="space-y-3">
              {reportTopicOptions.map((topic) => (
                <label
                  key={topic.id}
                  className={`${insetPanelClass} flex cursor-pointer items-start gap-3 p-4 transition-colors hover:outline-[rgba(255,255,255,0.12)]`}
                >
                  <input
                    type="radio"
                    name="topicId"
                    value={topic.id}
                    className="mt-1 h-4 w-4 border-[rgba(255,255,255,0.2)] bg-[rgba(0,0,0,0.36)] text-white focus:ring-white/30"
                    defaultChecked={reportTopicOptions[0]?.id === topic.id}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-[color:var(--today-text)]">{topic.name}</p>
                      <span className={accentPillClass}>
                        {topic.linkedDocumentCount} linked docs
                      </span>
                      <span className={subtlePillClass}>
                        Last report: {formatShortDate(topic.lastReportAt)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-[color:var(--today-text-soft)]">{topic.goal}</p>
                    {topic.focusTags.length > 0 && (
                      <p className="mt-2 text-xs text-[color:var(--today-muted)]">
                        Focus tags: {topic.focusTags.slice(0, 6).join(', ')}
                      </p>
                    )}
                  </div>
                </label>
              ))}
            </div>

            <button
              type="submit"
              className={primaryButtonClass}
            >
              Generate Report
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

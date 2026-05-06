import { sectionLabelClass } from '@/app/today/WorkspaceHeaderPrimitives';
import { issuePanelClass } from '../styles';

export function RunIssuePreview({
  issueMessages,
}: {
  issueMessages: string[];
}) {
  return issueMessages.length > 0 ? (
    <div className={`mt-5 ${issuePanelClass}`}>
      <p className={sectionLabelClass}>Run issues</p>
      <p className="mt-2 text-sm text-[#fff1f1]">
        {issueMessages[0]}
      </p>
      {issueMessages.length > 1 && (
        <p className="mt-1 text-xs text-[#ffdada]">
          {issueMessages.length - 1} more issue{issueMessages.length - 1 === 1 ? '' : 's'} in Technical Details.
        </p>
      )}
    </div>
  ) : null;
}

export function IssueListSection({
  issueMessages,
}: {
  issueMessages: string[];
}) {
  return issueMessages.length > 0 ? (
    <section className={issuePanelClass}>
      <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#ffdada]">Issues</h3>
      <ul className="mt-3 space-y-2 text-sm text-[#fff1f1]">
        {issueMessages.map((entry, index) => (
          <li key={`${entry}-${index}`}>{entry}</li>
        ))}
      </ul>
    </section>
  ) : null;
}

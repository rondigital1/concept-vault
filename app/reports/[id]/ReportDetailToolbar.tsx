import Link from 'next/link';
import { formatDisplayDate } from '../reportsViewModel';
import { ResultsActionButton, ResultsActionLink } from '../resultsActions';
import { ResultsStickyToolbar } from '../ResultsRouteShell';
import { ResultsPill } from '../resultsUi';

type Props = {
  day: string;
  isRead: boolean;
  marking: boolean;
  onMarkRead: () => void;
};

export function ReportDetailToolbar({ day, isRead, marking, onMarkRead }: Props) {
  return (
    <ResultsStickyToolbar>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3 text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#8f8888]">
          <Link href="/reports" className="text-white transition hover:opacity-75">
            Reports archive
          </Link>
          <span>/</span>
          <span>{formatDisplayDate(day)}</span>
          <ResultsPill tone={isRead ? 'success' : 'warning'}>
            {isRead ? 'Read' : 'Unread'}
          </ResultsPill>
        </div>

        <div className="flex flex-wrap gap-3">
          {!isRead ? (
            <ResultsActionButton
              type="button"
              label={marking ? 'Marking' : 'Mark as read'}
              icon="check"
              tone="primary"
              onClick={onMarkRead}
              disabled={marking}
            />
          ) : null}
          <ResultsActionLink href="/reports" label="Back to archive" icon="arrow-left" />
          <ResultsActionLink href="/today" label="Continue in Research" icon="research" />
        </div>
      </div>
    </ResultsStickyToolbar>
  );
}

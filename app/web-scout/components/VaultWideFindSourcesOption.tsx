import Link from 'next/link';
import {
  secondaryButtonClass,
  sectionLabelClass,
} from '@/app/today/WorkspaceHeaderPrimitives';
import { surfacePanelClass } from '../styles';

export function VaultWideFindSourcesOption() {
  return (
    <div className={`${surfacePanelClass} p-5`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className={sectionLabelClass}>Batch option</p>
          <h2 className="mt-2 text-xl font-semibold text-[color:var(--today-text)]">
            Run Find Sources across all eligible topics
          </h2>
          <p className="mt-2 text-sm text-[color:var(--today-muted)]">
            Use batch mode when you want one inline scout-only run per active topic that still needs more material before it is report-ready.
          </p>
        </div>
        <Link
          href="/web-scout?runMode=scout_only&scope=all_topics"
          className={secondaryButtonClass}
        >
          All Eligible Topics
        </Link>
      </div>
    </div>
  );
}

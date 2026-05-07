import Link from 'next/link';
import { AgentsChromeSectionLinks } from './AgentsChromeSectionLinks';
import {
  workspaceEyebrowClassName,
  workspaceLabelClassName,
  workspaceMutedCopyClassName,
  workspacePrimaryButtonClassName,
  workspaceShellPanelClassName,
} from './workspaceTheme';

type Props = {
  activeAgentCount: number;
  selectedTopicLabel: string;
  topicCount: number;
  recentRunCount: number;
};

export function AgentsChromeRail({
  activeAgentCount,
  selectedTopicLabel,
  topicCount,
  recentRunCount,
}: Props) {
  return (
    <aside
      className="fixed top-[6.5rem] hidden h-[calc(100vh-7.75rem)] w-60 flex-col gap-5 xl:flex"
      style={{ left: 'max(1rem, calc((100vw - 1600px) / 2 + 1rem))' }}
    >
      <section className={`${workspaceShellPanelClassName} px-5 py-5`}>
        <p className={workspaceEyebrowClassName}>Workspace Status</p>
        <div className="mt-4 space-y-3">
          <div>
            <div className="text-2xl font-semibold tracking-[-0.04em] text-white">
              {activeAgentCount}
            </div>
            <p className="text-sm text-[color:var(--surface-text-muted)]">Live profiles now</p>
          </div>
          <div className="grid gap-3 text-sm text-[color:var(--surface-text-muted)] sm:grid-cols-2 xl:grid-cols-1">
            <div>
              <div className={workspaceLabelClassName}>Topics</div>
              <div className="mt-1 text-base font-medium text-white">{topicCount}</div>
            </div>
            <div>
              <div className={workspaceLabelClassName}>Recent Runs</div>
              <div className="mt-1 text-base font-medium text-white">{recentRunCount}</div>
            </div>
          </div>
        </div>
      </section>

      <nav
        aria-label="Agents workspace sections"
        className={`${workspaceShellPanelClassName} flex-1 px-3 py-3`}
      >
        <AgentsChromeSectionLinks />
      </nav>

      <div className="space-y-3">
        <Link href="/ingest" className={`${workspacePrimaryButtonClassName} w-full`}>
          Add Content
        </Link>
        <section className={`${workspaceShellPanelClassName} px-5 py-5`}>
          <p className={workspaceEyebrowClassName}>Selected Scope</p>
          <p className="mt-3 text-base font-medium text-white">{selectedTopicLabel}</p>
          <p className={`mt-2 ${workspaceMutedCopyClassName}`}>
            Global defaults remain separate from topic overrides, so launches stay explicit.
          </p>
        </section>
      </div>
    </aside>
  );
}

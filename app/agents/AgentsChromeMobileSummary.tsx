import { AgentsChromeSectionLinks } from './AgentsChromeSectionLinks';
import {
  workspaceEyebrowClassName,
  workspaceLabelClassName,
  workspaceShellPanelClassName,
} from './workspaceTheme';

type Props = {
  activeAgentCount: number;
  selectedTopicLabel: string;
  recentRunCount: number;
};

export function AgentsChromeMobileSummary({
  activeAgentCount,
  selectedTopicLabel,
  recentRunCount,
}: Props) {
  return (
    <div className="mb-6 space-y-4 xl:hidden">
      <section className={`${workspaceShellPanelClassName} px-5 py-5`}>
        <p className={workspaceEyebrowClassName}>Workspace Status</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <div className={workspaceLabelClassName}>Live Profiles</div>
            <div className="mt-1 text-lg font-semibold text-white">{activeAgentCount}</div>
          </div>
          <div>
            <div className={workspaceLabelClassName}>Selected Scope</div>
            <div className="mt-1 text-lg font-semibold text-white">{selectedTopicLabel}</div>
          </div>
          <div>
            <div className={workspaceLabelClassName}>Recent Runs</div>
            <div className="mt-1 text-lg font-semibold text-white">{recentRunCount}</div>
          </div>
        </div>
      </section>

      <nav aria-label="Agents workspace sections" className="overflow-x-auto pb-1">
        <AgentsChromeSectionLinks compact />
      </nav>
    </div>
  );
}

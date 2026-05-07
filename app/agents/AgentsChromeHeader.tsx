import Link from 'next/link';
import { StatusBadge } from '@/app/components/StatusBadge';
import { APP_BRAND, type TopNavItem } from '@/app/components/topNav';
import {
  workspacePillClassName,
  workspacePrimaryNavClassName,
  workspaceUtilityNavClassName,
} from './workspaceTheme';

type TopNavItemWithState = TopNavItem & {
  active: boolean;
};

type Props = {
  primary: TopNavItemWithState[];
  utility: TopNavItemWithState[];
  activeAgentCount: number;
  selectedTopicLabel: string;
};

export function AgentsChromeHeader({
  primary,
  utility,
  activeAgentCount,
  selectedTopicLabel,
}: Props) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[rgba(11,13,15,0.84)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8 xl:flex-row xl:items-center xl:justify-between">
        <Link href="/today" className="flex items-center gap-4 transition-opacity hover:opacity-85">
          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.05] text-sm font-semibold text-[color:var(--shell-immersive-text)] shadow-[0_14px_32px_rgba(0,0,0,0.24)]">
            {APP_BRAND.monogram}
          </div>
          <div className="leading-tight">
            <span className="font-editorial block text-xl tracking-[-0.04em] text-white">
              {APP_BRAND.name}
            </span>
            <span className="block text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--surface-text-muted)]">
              Agents Workspace
            </span>
          </div>
        </Link>

        <div className="flex flex-col gap-3 xl:items-end">
          <div
            aria-label="Primary destinations"
            role="group"
            className="flex flex-wrap items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
          >
            {primary.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={item.active ? 'page' : undefined}
                className={workspacePrimaryNavClassName(item.active)}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {utility.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={item.active ? 'page' : undefined}
                className={workspaceUtilityNavClassName(item.active)}
              >
                {item.label}
              </Link>
            ))}
            <StatusBadge
              status={activeAgentCount > 0 ? 'running' : 'pending'}
              label={`${activeAgentCount} active agent${activeAgentCount === 1 ? '' : 's'}`}
            />
            <span className={workspacePillClassName}>{selectedTopicLabel}</span>
          </div>
        </div>
      </div>
    </header>
  );
}

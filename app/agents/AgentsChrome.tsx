'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { getTopNavGroupsWithState } from '@/app/components/topNav';
import { AgentsChromeHeader } from './AgentsChromeHeader';
import { AgentsChromeMobileSummary } from './AgentsChromeMobileSummary';
import { AgentsChromeRail } from './AgentsChromeRail';
import { formatTopicScopeLabel } from './presentation';

type Props = {
  activeAgentCount: number;
  selectedTopicName: string | null;
  topicCount: number;
  recentRunCount: number;
  children: ReactNode;
};

export function AgentsChrome({
  activeAgentCount,
  selectedTopicName,
  topicCount,
  recentRunCount,
  children,
}: Props) {
  const pathname = usePathname();
  const { primary, utility } = getTopNavGroupsWithState(pathname);
  const selectedTopicLabel = formatTopicScopeLabel(selectedTopicName);

  return (
    <div className="relative min-h-screen text-[color:var(--shell-immersive-text)]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-px bg-white/[0.08]" />
        <div className="absolute left-[8%] top-0 h-64 w-64 rounded-full bg-[rgba(132,174,186,0.08)] blur-[120px]" />
        <div className="absolute right-[6%] top-[14rem] h-72 w-72 rounded-full bg-white/[0.04] blur-[140px]" />
      </div>

      <AgentsChromeHeader
        primary={primary}
        utility={utility}
        activeAgentCount={activeAgentCount}
        selectedTopicLabel={selectedTopicLabel}
      />

      <AgentsChromeRail
        activeAgentCount={activeAgentCount}
        selectedTopicLabel={selectedTopicLabel}
        topicCount={topicCount}
        recentRunCount={recentRunCount}
      />

      <main className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8 xl:pl-[17.5rem]">
        <AgentsChromeMobileSummary
          activeAgentCount={activeAgentCount}
          selectedTopicLabel={selectedTopicLabel}
          recentRunCount={recentRunCount}
        />
        {children}
      </main>
    </div>
  );
}

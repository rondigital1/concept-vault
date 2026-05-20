'use client';

import Link from 'next/link';
import { StatusBadge } from '@/app/components/StatusBadge';
import { workspaceEyebrowClassName, workspaceMutedCopyClassName, workspaceShellPanelClassName } from './workspaceTheme';
import type { AgentCapabilityCard } from './capabilityPresentation';

type Props = {
  capabilities: AgentCapabilityCard[];
};

function statusToBadge(status: AgentCapabilityCard['status']) {
  if (status === 'live') {
    return 'running';
  }

  if (status === 'attention') {
    return 'error';
  }

  return 'ok';
}

export function CapabilityDashboard({ capabilities }: Props) {
  const primaryCapabilities = capabilities.slice(0, 5);
  const supportingCapabilities = capabilities.slice(5);

  return (
    <section id="agents-capabilities" className={`${workspaceShellPanelClassName} overflow-hidden`}>
      <div className="grid gap-0 2xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.4fr)]">
        <div className="flex flex-col justify-between gap-8 border-b border-white/[0.08] px-6 py-6 sm:px-8 2xl:border-b-0 2xl:border-r">
          <div>
            <p className={workspaceEyebrowClassName}>Capability Map</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-normal text-white sm:text-4xl">
              One operating surface for the agentic system.
            </h2>
            <p className={`mt-4 max-w-xl ${workspaceMutedCopyClassName}`}>
              Each lane is backed by an implemented route, API trigger, or run trace contract. Nothing here imports external sources or approves generated artifacts automatically.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 2xl:grid-cols-1">
            {supportingCapabilities.map((capability) => (
              <Link
                key={capability.id}
                href={capability.routeHref}
                className="group rounded-[24px] border border-white/[0.08] bg-white/[0.035] px-4 py-4 transition-[background-color,border-color] hover:border-white/[0.16] hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--surface-accent-strong)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#101214]"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-white">{capability.title}</span>
                  <StatusBadge status={statusToBadge(capability.status)} label={capability.statusLabel} />
                </div>
                <div className="mt-3 text-2xl font-semibold tracking-normal text-white">
                  {capability.metricValue}
                </div>
                <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/64">
                  {capability.metricLabel}
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="divide-y divide-white/[0.08]">
          {primaryCapabilities.map((capability) => (
            <article
              key={capability.id}
              className="grid gap-5 px-6 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-8"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xl font-semibold tracking-normal text-white">
                    {capability.title}
                  </h3>
                  <StatusBadge status={statusToBadge(capability.status)} label={capability.statusLabel} />
                </div>
                <p className="mt-2 text-sm leading-6 text-white/80">{capability.contract}</p>
                <p className={`mt-2 ${workspaceMutedCopyClassName}`}>{capability.detail}</p>
              </div>

              <div className="flex items-center justify-between gap-4 sm:min-w-[11rem] sm:flex-col sm:items-end">
                <div className="text-left sm:text-right">
                  <div className="text-2xl font-semibold tracking-normal text-white">
                    {capability.metricValue}
                  </div>
                  <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/64">
                    {capability.metricLabel}
                  </div>
                </div>
                <Link
                  href={capability.routeHref}
                  className="rounded-full bg-[color:var(--surface-accent-ink)] px-4 py-2 text-sm font-semibold text-[#101214] transition-[background-color] hover:bg-[color:var(--surface-accent-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--surface-accent-strong)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#101214]"
                >
                  {capability.routeLabel}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

'use client';

import { useState } from 'react';
import { formatClockTime } from '@/app/components/workflowFormatting';
import type { ActivityEntry } from './reviewViewModel';

type Props = {
  entries: ActivityEntry[];
  inline?: boolean;
};

function textClassForIndex(index: number): string {
  if (index === 0) return 'text-slate-950 font-medium';
  if (index <= 3) return 'text-slate-700';
  if (index <= 7) return 'text-slate-500';
  return 'text-[color:var(--workbench-muted)]';
}

function PanelHeader({ hasLive }: { hasLive: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {hasLive && <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />}
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--workbench-muted)]">
        Agent Activity
      </span>
    </div>
  );
}

function EntryList({ entries }: { entries: ActivityEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="px-4 py-6">
        <p className="text-sm text-[color:var(--workbench-muted)]">No agent activity yet.</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-[color:var(--workbench-line)]">
      {entries.map((entry, index) => (
        <li key={entry.id} className={`px-4 py-3 ${textClassForIndex(index)}`}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold">{entry.agentName}</span>
            <span className="shrink-0 text-[11px] text-[color:var(--workbench-muted)]">
              {formatClockTime(entry.timestamp)}
            </span>
          </div>
          <div className="mt-0.5 flex items-start gap-1.5">
            {entry.status === 'running' && (
              <span className="mt-[3px] h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400 animate-pulse" />
            )}
            <p className="text-[13px] leading-snug">{entry.summary}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function AgentActivityPanel({ entries, inline }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasLive = entries.some((e) => e.status === 'running');

  if (inline) {
    return (
      <div className="overflow-hidden rounded-[24px] border border-[color:var(--workbench-line)]">
        <div className="border-b border-[color:var(--workbench-line)] px-4 py-3">
          <PanelHeader hasLive={hasLive} />
        </div>
        <div className="max-h-72 overflow-y-auto">
          <EntryList entries={entries} />
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-[color:var(--workbench-line)]">
      <button
        type="button"
        onClick={() => setIsExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4"
      >
        <PanelHeader hasLive={hasLive} />
        <svg
          className={`h-4 w-4 text-[color:var(--workbench-muted)] transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {isExpanded && (
        <div className="max-h-64 overflow-y-auto border-t border-[color:var(--workbench-line)]">
          <EntryList entries={entries} />
        </div>
      )}
    </div>
  );
}

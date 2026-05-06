'use client';

import type { ActivityEntry } from './reviewViewModel';

export function LiveInsightStream({ entries }: { entries: ActivityEntry[] }) {
  const previewEntries = entries.slice(0, 3);

  return (
    <div className="today-panel today-panel-lowest rounded-[24px] p-4">
      <div className="text-[9px] uppercase tracking-[0.18em] text-[color:var(--today-muted)]">
        Live insight stream
      </div>
      <div className="mt-3 space-y-2 font-mono text-[11px] leading-6 text-[color:var(--today-muted-strong)]">
        {previewEntries.length > 0 ? (
          previewEntries.map((entry) => (
            <p key={entry.id} className="truncate">
              {entry.status === 'running' ? '>' : '·'} {entry.summary}
            </p>
          ))
        ) : (
          <>
            <p>&gt; waiting for the next agent run...</p>
            <p>&gt; source evaluation logs will appear here...</p>
            <p>&gt; review decisions stay human-gated...</p>
          </>
        )}
      </div>
    </div>
  );
}

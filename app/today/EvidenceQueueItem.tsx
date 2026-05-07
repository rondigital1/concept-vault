'use client';

import type { Artifact } from './types';
import { readString } from './utils';

function agentLabel(agent: string): string {
  if (agent === 'web-scout' || agent === 'webScout') {
    return 'via Web Agent';
  }

  if (agent === 'distiller') {
    return 'via Distiller';
  }

  if (agent === 'curator') {
    return 'via Curator';
  }

  return `via ${agent}`;
}

function getHostname(url: string | null): string | null {
  if (!url) {
    return null;
  }

  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

export function EvidenceQueueItem({
  item,
  isActive,
  onArtifactSelect,
  summarizeArtifact,
}: {
  item: Artifact;
  isActive: boolean;
  onArtifactSelect: (artifactId: string) => void;
  summarizeArtifact: (item: Artifact) => string;
}) {
  const itemUrl = item.sourceUrl ?? readString(item.content?.url);
  const itemHost = getHostname(itemUrl);
  const faviconUrl = itemHost
    ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(itemHost)}&sz=16`
    : null;

  return (
    <button
      type="button"
      onClick={() => onArtifactSelect(item.id)}
      className={`today-panel block w-full rounded-[24px] px-4 py-4 text-left transition-default ${
        isActive
          ? 'today-panel-high outline-[rgba(255,255,255,0.16)]'
          : 'today-panel-lowest hover:bg-[rgba(255,255,255,0.04)]'
      }`}
    >
      <div className="flex min-w-0 items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {faviconUrl ? (
              <span
                aria-hidden="true"
                className="h-4 w-4 shrink-0 rounded-sm bg-contain bg-center bg-no-repeat"
                style={{ backgroundImage: `url("${faviconUrl}")` }}
              />
            ) : null}
            <span className="truncate text-sm font-semibold text-[color:var(--today-text)]">{item.title}</span>
          </div>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-[color:var(--today-muted)]">
            {summarizeArtifact(item)}
          </p>
          <p className="mt-2 text-[10px] uppercase tracking-[0.16em] text-[color:var(--today-muted)]">
            {agentLabel(item.agent)}
          </p>
        </div>
        {(item.status === 'approved' || item.status === 'active') ? (
          <svg
            className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--today-accent-strong)]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-label="Saved"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        ) : null}
      </div>
    </button>
  );
}

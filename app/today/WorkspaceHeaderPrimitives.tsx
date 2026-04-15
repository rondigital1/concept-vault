'use client';

import Link from 'next/link';
import type { SurfaceTone } from './types';

export const sectionLabelClass = 'today-label';
export const primaryButtonClass = 'today-button-primary';
export const secondaryButtonClass = 'today-button-secondary';
export const textLinkClass = 'today-button-link';
export const inputClass = 'today-input';
export const elevatedPanelClass = 'today-panel today-panel-low';
export const insetPanelClass = 'today-panel today-panel-lowest';

export function StatusChip({
  label,
  tone = 'default',
  title,
  pulse = false,
}: {
  label: string;
  tone?: SurfaceTone;
  title?: string;
  pulse?: boolean;
}) {
  const classes =
    tone === 'ready'
      ? 'bg-[rgba(92,142,112,0.18)] text-[#e5f8ec] outline-[rgba(152,225,184,0.18)]'
      : tone === 'pending'
        ? 'bg-[rgba(255,255,255,0.07)] text-[color:var(--today-text-soft)] outline-[rgba(255,255,255,0.08)]'
        : tone === 'live'
          ? 'bg-[rgba(255,255,255,0.14)] text-[color:var(--today-accent-strong)] outline-[rgba(255,255,255,0.14)]'
          : 'bg-[rgba(255,255,255,0.06)] text-[color:var(--today-muted-strong)] outline-[rgba(255,255,255,0.08)]';

  return (
    <span
      title={title}
      className={`inline-flex items-center rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] outline outline-1 ${classes} ${pulse ? 'animate-pulse' : ''}`}
    >
      {label}
    </span>
  );
}

export function HeaderActionLink({
  href,
  label,
  tone,
}: {
  href: string;
  label: string;
  tone: 'primary' | 'secondary' | 'tertiary';
}) {
  if (tone === 'tertiary') {
    return (
      <Link href={href} className={textLinkClass}>
        {label}
      </Link>
    );
  }

  return (
    <Link href={href} className={tone === 'primary' ? primaryButtonClass : secondaryButtonClass}>
      {label}
    </Link>
  );
}

export function DisabledHeaderAction({ label, hint }: { label: string; hint: string }) {
  return (
    <span
      title={hint}
      className="inline-flex items-center justify-center rounded-full bg-[rgba(255,255,255,0.05)] px-5 py-3 text-sm font-semibold text-[color:var(--today-muted)] outline outline-1 outline-[rgba(255,255,255,0.08)]"
    >
      {label}
    </span>
  );
}

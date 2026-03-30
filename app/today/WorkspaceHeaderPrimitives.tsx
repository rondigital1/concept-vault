'use client';

import Link from 'next/link';
import type { SurfaceTone } from './types';

export const sectionLabelClass = 'workbench-label';
export const primaryButtonClass = 'workbench-button-primary';
export const secondaryButtonClass = 'workbench-button-secondary';
export const textLinkClass = 'workbench-button-link';
export const inputClass = 'workbench-input';
export const elevatedPanelClass = 'workbench-elevated';
export const insetPanelClass = 'workbench-inset';

export function StatusChip({
  label,
  tone = 'default',
}: {
  label: string;
  tone?: SurfaceTone;
}) {
  const classes =
    tone === 'ready'
      ? 'border-emerald-200/90 bg-emerald-50/90 text-emerald-800'
      : tone === 'pending'
        ? 'border-sky-200/90 bg-sky-50/90 text-sky-800'
        : tone === 'live'
          ? 'border-amber-200/90 bg-amber-50/90 text-amber-800'
          : 'border-[color:var(--workbench-line)] bg-[rgba(255,252,248,0.78)] text-slate-700';

  return (
    <span className={`rounded-full border px-3 py-1.5 text-xs font-medium tracking-[0.01em] ${classes}`}>
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
      className="inline-flex items-center justify-center rounded-full border border-[color:var(--workbench-line)] bg-[color:var(--workbench-inset)] px-5 py-3 text-sm font-semibold text-slate-400"
    >
      {label}
    </span>
  );
}

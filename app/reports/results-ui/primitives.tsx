import type { ReactNode } from 'react';
import { ResultsIcon } from './ResultsIcon';
import { joinClassNames } from './classNames';
import type { ResultsIconName, ResultsPillTone } from './types';

export function ResultsContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={joinClassNames('mx-auto max-w-[1180px]', className)}>{children}</div>;
}

export function ResultsPill({
  children,
  tone = 'muted',
  className,
}: {
  children: ReactNode;
  tone?: ResultsPillTone;
  className?: string;
}) {
  const toneClassName = {
    muted: 'bg-[#1f1f1f] text-[#d7d0d0]',
    inverse: 'bg-[#f3f0f0] text-[#171717]',
    success: 'bg-[#152318] text-[#d2ead5]',
    warning: 'bg-[#2b2315] text-[#ecd9ae]',
    danger: 'bg-[#301b1b] text-[#f3cece]',
    info: 'bg-[#162029] text-[#d4e3f5]',
  } satisfies Record<ResultsPillTone, string>;

  return (
    <span className={joinClassNames('rounded-full px-3 py-1.5 text-[0.66rem] font-semibold uppercase tracking-[0.18em]', toneClassName[tone], className)}>
      {children}
    </span>
  );
}

export function ResultsTopicChip({ topic }: { topic: string }) {
  return (
    <span className="rounded-full bg-[#101010] px-3 py-1.5 text-[0.68rem] font-semibold tracking-[0.02em] text-[#d3cbcb]">
      {topic}
    </span>
  );
}

export function ResultsMetadataRow({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-[0.64rem] font-semibold uppercase tracking-[0.2em] text-[#7d7878]">{label}</span>
      <span className={joinClassNames('text-right text-[0.76rem] font-mono', accent ? 'text-[#efeded]' : 'text-white')}>{value}</span>
    </div>
  );
}

export function ResultsSidePanel({
  title,
  icon,
  children,
  className,
}: {
  title: string;
  icon?: ResultsIconName;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={joinClassNames('rounded-[28px] bg-[#232323] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.26)]', className)}>
      <h3 className="flex items-center gap-2 text-[0.7rem] font-bold uppercase tracking-[0.3em] text-white">
        {icon ? <ResultsIcon name={icon} className="h-4 w-4" /> : null}
        {title}
      </h3>
      {children}
    </section>
  );
}

export function ResultsStickyToolbar({ children }: { children: ReactNode }) {
  return (
    <div className="sticky top-20 z-30 mb-8 rounded-[24px] border border-white/8 bg-[rgba(18,18,18,0.84)] px-4 py-4 shadow-[0_16px_48px_rgba(0,0,0,0.26)] backdrop-blur-2xl sm:px-5">
      {children}
    </div>
  );
}

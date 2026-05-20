import type { ButtonHTMLAttributes } from 'react';
import Link from 'next/link';
import { ResultsIcon } from './ResultsIcon';
import { joinClassNames } from './classNames';
import type { ResultsActionTone, ResultsIconName } from './types';

export function resultsActionClassName(tone: ResultsActionTone = 'secondary', fullWidth = false) {
  const toneClassName = {
    primary: 'bg-[#f2eeee] text-[#171717] hover:bg-white',
    secondary: 'bg-transparent text-white ring-1 ring-white/12 hover:bg-white/5',
    success: 'bg-[#f2eeee] text-[#171717] hover:bg-white',
    danger: 'bg-transparent text-[#f3cece] ring-1 ring-[#5a2e2e] hover:bg-[#2a1818]',
  } satisfies Record<ResultsActionTone, string>;

  return joinClassNames(
    'flex items-center justify-center gap-2 rounded-full px-5 py-4 text-[0.72rem] font-bold uppercase tracking-[0.28em] transition disabled:cursor-not-allowed disabled:opacity-60',
    toneClassName[tone],
    fullWidth && 'w-full',
  );
}

export function ResultsActionLink({
  href,
  label,
  icon,
  tone = 'secondary',
  fullWidth = false,
  external = false,
}: {
  href: string;
  label: string;
  icon: ResultsIconName;
  tone?: ResultsActionTone;
  fullWidth?: boolean;
  external?: boolean;
}) {
  const className = resultsActionClassName(tone, fullWidth);

  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className}>
        <ResultsIcon name={icon} className="h-4 w-4" />
        <span>{label}</span>
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      <ResultsIcon name={icon} className="h-4 w-4" />
      <span>{label}</span>
    </Link>
  );
}

export function ResultsActionButton({
  label,
  icon,
  tone = 'secondary',
  fullWidth = false,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  icon: ResultsIconName;
  tone?: ResultsActionTone;
  fullWidth?: boolean;
}) {
  return (
    <button className={joinClassNames(resultsActionClassName(tone, fullWidth), className)} {...props}>
      <ResultsIcon name={icon} className="h-4 w-4" />
      <span>{label}</span>
    </button>
  );
}

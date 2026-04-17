import type { ReactNode } from 'react';

type LibraryActionTone = 'primary' | 'secondary' | 'danger';
type LibraryPillTone = 'default' | 'muted' | 'danger';

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

export function getLibraryActionClassName(tone: LibraryActionTone = 'secondary') {
  if (tone === 'danger') {
    return 'inline-flex items-center justify-center rounded-full bg-[#3a2221] px-4 py-2.5 text-[0.66rem] font-bold uppercase tracking-[0.22em] text-[#f2c7bc] transition hover:bg-[#4a2928] hover:text-white disabled:cursor-not-allowed disabled:bg-[#262626] disabled:text-[#6f6a6a]';
  }

  if (tone === 'primary') {
    return 'inline-flex items-center justify-center rounded-full bg-[#efeded] px-4 py-2.5 text-[0.66rem] font-bold uppercase tracking-[0.22em] text-[#171717] transition hover:bg-white disabled:cursor-not-allowed disabled:bg-[#2b2b2b] disabled:text-[#7a7474]';
  }

  return 'inline-flex items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-[0.66rem] font-bold uppercase tracking-[0.22em] text-[#ddd7d7] transition hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:border-white/[0.05] disabled:bg-white/[0.02] disabled:text-[#6f6a6a]';
}

export function LibraryPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cx(
        'rounded-[28px] bg-[#171717] shadow-[0_24px_80px_rgba(0,0,0,0.32)]',
        className,
      )}
    >
      {children}
    </section>
  );
}

export function LibraryPill({
  children,
  tone = 'default',
  className,
}: {
  children: ReactNode;
  tone?: LibraryPillTone;
  className?: string;
}) {
  const toneClassName =
    tone === 'danger'
      ? 'bg-[rgba(255,180,171,0.1)] text-[#f2c7bc]'
      : tone === 'muted'
        ? 'bg-[#232323] text-[#c8c1c1]'
        : 'bg-[#111111]/75 text-white';

  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full px-3 py-1.5 text-[0.58rem] font-bold uppercase tracking-[0.22em]',
        toneClassName,
        className,
      )}
    >
      {children}
    </span>
  );
}

export function LibraryTag({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full bg-[#202020] px-3 py-1.5 text-[0.68rem] font-semibold text-[#d0c9c9]',
        className,
      )}
    >
      {children}
    </span>
  );
}

export function LibraryEmptyState({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <LibraryPanel className={cx('px-6 py-10 text-center sm:px-10 sm:py-12', className)}>
      <div className="mx-auto max-w-2xl">
        <p className="text-[0.64rem] font-bold uppercase tracking-[0.26em] text-[#8f8888]">
          Repository standby
        </p>
        <h2 className="mt-4 text-[clamp(2rem,4vw,3rem)] font-black leading-[0.98] tracking-[-0.07em] text-white">
          {title}
        </h2>
        <p className="mt-4 text-[0.98rem] leading-8 text-[#b7b0b0]">{description}</p>
        {actions ? <div className="mt-8 flex flex-wrap justify-center gap-3">{actions}</div> : null}
      </div>
    </LibraryPanel>
  );
}

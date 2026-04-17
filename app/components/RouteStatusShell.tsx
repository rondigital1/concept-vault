'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';

type Tone = 'default' | 'danger' | 'warning';

type ActionLink = {
  href: string;
  label: string;
  variant?: 'primary' | 'secondary';
};

type Props = {
  eyebrow: string;
  title: string;
  description: string;
  tone?: Tone;
  actions?: ReactNode;
  links?: ActionLink[];
};

const TONE_STYLES: Record<Tone, { orb: string; badge: string }> = {
  default: {
    orb: 'bg-[rgba(185,220,226,0.12)]',
    badge: 'text-[#c6dde2]',
  },
  danger: {
    orb: 'bg-[rgba(208,128,113,0.14)]',
    badge: 'text-[#f2c7bc]',
  },
  warning: {
    orb: 'bg-[rgba(214,183,120,0.14)]',
    badge: 'text-[#f0d7a7]',
  },
};

export function RouteStatusShell({
  eyebrow,
  title,
  description,
  tone = 'default',
  actions,
  links = [],
}: Props) {
  const toneStyles = TONE_STYLES[tone];

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#131313] px-6 py-16 text-[#ece9e8]">
      <div className="pointer-events-none absolute inset-0">
        <div className={`absolute left-[14%] top-[10%] h-72 w-72 rounded-full blur-[120px] ${toneStyles.orb}`} />
        <div className="absolute right-[10%] top-[18%] h-64 w-64 rounded-full bg-white/[0.05] blur-[130px]" />
        <div className="absolute inset-x-0 top-0 h-px bg-white/[0.06]" />
      </div>

      <section className="relative w-full max-w-2xl rounded-[32px] border border-white/[0.08] bg-[rgba(24,24,24,0.92)] px-8 py-10 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:px-10 sm:py-12">
        <p className={`text-[0.72rem] font-bold uppercase tracking-[0.28em] ${toneStyles.badge}`}>{eyebrow}</p>
        <h1 className="mt-4 text-[clamp(2.3rem,5vw,4rem)] font-black tracking-[-0.07em] text-white">{title}</h1>
        <p className="mt-5 whitespace-pre-line text-[1rem] leading-8 text-[#beb5b5]">{description}</p>

        {actions ? <div className="mt-8 flex flex-wrap gap-3">{actions}</div> : null}

        {links.length > 0 ? (
          <div className="mt-8 flex flex-wrap gap-3">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={
                  link.variant === 'secondary'
                    ? 'inline-flex items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.03] px-5 py-3 text-[0.72rem] font-bold uppercase tracking-[0.24em] text-[#ddd7d7] transition hover:bg-white/[0.08] hover:text-white'
                    : 'inline-flex items-center justify-center rounded-full bg-[#efeded] px-5 py-3 text-[0.72rem] font-bold uppercase tracking-[0.24em] text-[#171717] transition hover:bg-white'
                }
              >
                {link.label}
              </Link>
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}

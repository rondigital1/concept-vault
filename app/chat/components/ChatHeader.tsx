'use client';

import Link from 'next/link';
import { AskVaultIcon } from './AskVaultIcon';

export function ChatHeader({
  onOpenHistory,
  onOpenTimeline,
}: {
  onOpenHistory: () => void;
  onOpenTimeline: () => void;
}) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 h-16 bg-[#151515]/66 backdrop-blur-2xl">
      <div className="mx-auto flex h-full max-w-[1800px] items-center justify-between px-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onOpenHistory}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.04] text-[#b9b3b3] transition hover:bg-white/[0.08] hover:text-white lg:hidden"
            aria-label="Open Ask Vault navigation"
          >
            <AskVaultIcon name="menu" className="h-4 w-4" />
          </button>

          <Link href="/chat" className="transition-opacity hover:opacity-80">
            <div className="whitespace-nowrap text-[1.05rem] font-black tracking-normal text-[#c7c2c2] min-[360px]:text-[1.35rem] sm:text-[1.85rem]">
              Ask Vault
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onOpenTimeline}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.04] text-[#b9b3b3] transition hover:bg-white/[0.08] hover:text-white xl:hidden"
            aria-label="Open prompt timeline"
          >
            <AskVaultIcon name="timeline" className="h-4 w-4" />
          </button>
          <Link
            href="/today"
            className="hidden h-10 w-10 items-center justify-center rounded-full bg-white/[0.04] text-[#b9b3b3] transition hover:bg-white/[0.08] hover:text-white min-[360px]:flex"
            aria-label="Open Research"
          >
            <AskVaultIcon name="research" className="h-4 w-4" />
          </Link>
          <Link
            href="/ingest"
            className="hidden h-10 w-10 items-center justify-center rounded-full bg-white/[0.04] text-[#b9b3b3] transition hover:bg-white/[0.08] hover:text-white sm:flex"
            aria-label="Add content"
          >
            <AskVaultIcon name="ingest" className="h-4 w-4" />
          </Link>
          <Link
            href="/agents"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#202020] text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-[#ddd7d7] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:bg-[#2a2a2a]"
            aria-label="Open agents"
          >
            CV
          </Link>
        </div>
      </div>
    </header>
  );
}

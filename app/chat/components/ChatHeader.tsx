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
      <div className="mx-auto flex h-full max-w-[1800px] items-center justify-between px-5 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenHistory}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.04] text-[#b9b3b3] transition hover:bg-white/[0.08] hover:text-white lg:hidden"
            aria-label="Open Ask Vault navigation"
          >
            <AskVaultIcon name="menu" className="h-4 w-4" />
          </button>

          <Link href="/chat" className="transition-opacity hover:opacity-80">
            <div className="text-[1.85rem] font-black tracking-[-0.075em] text-[#c7c2c2]">
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
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.04] text-[#b9b3b3] transition hover:bg-white/[0.08] hover:text-white"
            aria-label="Open Research"
          >
            <AskVaultIcon name="research" className="h-4 w-4" />
          </Link>
          <Link
            href="/ingest"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.04] text-[#b9b3b3] transition hover:bg-white/[0.08] hover:text-white"
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

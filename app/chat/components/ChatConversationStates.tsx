'use client';

import { LoadingSpinner } from '@/app/components/LoadingSpinner';
import { AgentOrb } from './AgentOrb';

export function LoadingConversationState() {
  return (
    <div className="flex min-h-[calc(100vh-16rem)] flex-1 items-center justify-center py-10">
      <div className="w-full rounded-[2rem] bg-[#171717]/94 px-8 py-10 shadow-[0_24px_80px_rgba(0,0,0,0.42)] ring-1 ring-white/[0.04]">
        <div className="flex items-center gap-4 text-[#d7d2d2]">
          <LoadingSpinner className="h-5 w-5 border-white/[0.14] border-t-[#d0d0d0]" />
          <div>
            <p className="text-sm font-semibold text-white">Loading conversation</p>
            <p className="mt-1 text-sm text-[#8e8a8a]">
              Restoring the selected Ask Vault session.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function IntroConversationState() {
  return (
    <div className="flex min-h-[calc(100vh-15rem)] flex-1 items-center justify-center py-10">
      <section className="relative flex min-h-[34rem] w-full flex-col items-center justify-center overflow-hidden rounded-[2.2rem] bg-[#151515] px-8 py-16 text-center shadow-[0_24px_90px_rgba(0,0,0,0.44)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.045),transparent_38%)]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(to_top,rgba(255,255,255,0.02),transparent)]" />
        <div className="relative z-10">
          <div className="mx-auto mb-9">
            <AgentOrb />
          </div>
          <h1 className="mx-auto max-w-[14ch] text-[clamp(3rem,6vw,4.75rem)] font-black tracking-[-0.085em] text-[#d0cbcb]">
            How can I assist your research?
          </h1>
          <p className="mx-auto mt-6 max-w-[32rem] text-[clamp(1.1rem,2vw,1.3rem)] leading-9 text-[#b1abab]">
            Access your saved materials, query the knowledge base, or synthesize new insights.
          </p>
        </div>
      </section>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex justify-start gap-4">
      <div className="pt-1">
        <AgentOrb compact />
      </div>
      <div className="flex items-center gap-2 rounded-full bg-[#1a1a1a] px-4 py-3">
        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#a7a1a1] [animation-delay:-0.3s]" />
        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#a7a1a1] [animation-delay:-0.15s]" />
        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#a7a1a1]" />
      </div>
    </div>
  );
}

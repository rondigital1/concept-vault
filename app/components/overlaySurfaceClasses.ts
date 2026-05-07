import type { OverlayActionTone } from './overlaySurfaceTypes';

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

export function getOverlayActionClassName(tone: OverlayActionTone) {
  if (tone === 'danger') {
    return 'inline-flex items-center justify-center rounded-full bg-[#8b3f3f] px-5 py-3 text-[0.72rem] font-bold uppercase tracking-[0.24em] text-white transition-colors motion-reduce:transition-none hover:bg-[#a64d4d] disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500';
  }

  if (tone === 'secondary') {
    return 'inline-flex items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.03] px-5 py-3 text-[0.72rem] font-bold uppercase tracking-[0.24em] text-[#ddd7d7] transition-colors motion-reduce:transition-none hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:border-white/[0.08] disabled:bg-white/[0.02] disabled:text-zinc-500';
  }

  return 'inline-flex items-center justify-center rounded-full bg-[#d97757] px-5 py-3 text-[0.72rem] font-bold uppercase tracking-[0.24em] text-white transition-colors motion-reduce:transition-none hover:bg-[#c66849] disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500';
}

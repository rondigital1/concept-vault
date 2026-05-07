import type { Toast, ToastSkin, ToastType } from './toastTypes';

export const TOAST_LABELS: Record<ToastType, string> = {
  success: 'Success',
  error: 'Error',
  info: 'Info',
  warning: 'Warning',
};

export const TOAST_ICONS: Record<ToastType, string> = {
  success: '✓',
  error: '!',
  info: 'i',
  warning: '!',
};

const TOAST_THEMES: Record<
  ToastSkin,
  Record<ToastType, { panel: string; iconWrap: string; dismiss: string }>
> = {
  default: {
    success: {
      panel: 'border-emerald-800/80 bg-[rgba(17,47,34,0.96)]',
      iconWrap: 'border-emerald-700/80 bg-emerald-500/15 text-emerald-200',
      dismiss: 'text-emerald-100/70 hover:bg-emerald-500/10 hover:text-white',
    },
    error: {
      panel: 'border-rose-900/80 bg-[rgba(61,18,25,0.96)]',
      iconWrap: 'border-rose-800/80 bg-rose-500/15 text-rose-100',
      dismiss: 'text-rose-100/70 hover:bg-rose-500/10 hover:text-white',
    },
    info: {
      panel: 'border-sky-900/80 bg-[rgba(15,36,53,0.96)]',
      iconWrap: 'border-sky-800/80 bg-sky-500/15 text-sky-100',
      dismiss: 'text-sky-100/70 hover:bg-sky-500/10 hover:text-white',
    },
    warning: {
      panel: 'border-amber-900/80 bg-[rgba(58,40,11,0.96)]',
      iconWrap: 'border-amber-800/80 bg-amber-500/15 text-amber-100',
      dismiss: 'text-amber-100/70 hover:bg-amber-500/10 hover:text-white',
    },
  },
  muted: {
    success: {
      panel: 'border-white/[0.08] bg-[rgba(28,28,28,0.96)]',
      iconWrap: 'border-white/[0.08] bg-emerald-500/10 text-emerald-200',
      dismiss: 'text-zinc-400 hover:bg-white/[0.05] hover:text-white',
    },
    error: {
      panel: 'border-white/[0.08] bg-[rgba(28,28,28,0.96)]',
      iconWrap: 'border-white/[0.08] bg-rose-500/10 text-rose-100',
      dismiss: 'text-zinc-400 hover:bg-white/[0.05] hover:text-white',
    },
    info: {
      panel: 'border-white/[0.08] bg-[rgba(28,28,28,0.96)]',
      iconWrap: 'border-white/[0.08] bg-sky-500/10 text-sky-100',
      dismiss: 'text-zinc-400 hover:bg-white/[0.05] hover:text-white',
    },
    warning: {
      panel: 'border-white/[0.08] bg-[rgba(28,28,28,0.96)]',
      iconWrap: 'border-white/[0.08] bg-amber-500/10 text-amber-100',
      dismiss: 'text-zinc-400 hover:bg-white/[0.05] hover:text-white',
    },
  },
};

export function getToastAnnouncementText(toastRecord: Pick<Toast, 'message' | 'type'>) {
  return `${TOAST_LABELS[toastRecord.type]}: ${toastRecord.message}`;
}

export function getToastVisualTheme(type: ToastType, skin: ToastSkin = 'default') {
  return TOAST_THEMES[skin][type];
}
